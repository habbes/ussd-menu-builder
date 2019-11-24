'use strict';
const async = require('async');
const EventEmitter = require('events');


class UssdMenu extends EventEmitter {

    constructor (opts = {}) {
        super();
        const validProviders = ['hubtel', 'africasTalking'];
        this.provider = opts.provider || 'africasTalking';
        if (!validProviders.includes(this.provider)) {
            throw Error('error', new Error(`Invalid Provider Option: ${this.provider}`));
        }
        this.session = null;
        this.args = null;
        this.states = {};
        this.result = '';
        this.onResult = null;
        this.val = '';
        this.resolve = null;
    }

    callOnResult () {
        if(this.onResult){
            this.onResult(this.result);
        }
        if(this.resolve){
            this.resolve(this.result);
        }
    }

    con (text) {
        if (this.provider === 'hubtel') {
            this.result = {
                Message: text,
                Type: 'Response',
            };
        } else {
            this.result = 'CON ' + text;
        }
        this.callOnResult();
    }

    end (text) {
        if (this.provider === 'hubtel') {
            this.result = {
                Message: text,
                Type: 'Release',
            };
        } else {
            this.result = 'END ' + text;
        }
        this.callOnResult();
        if(this.session){
            this.session.end();
        }
    }

    testLinkRule (rule, val) {
         //if rule starts with *, treat as regex
        if (typeof rule === 'string' && rule[0] === '*') {
            var re = new RegExp(rule.substr(1));
            return re.test(val);
        }
        return rule == val;
    }

    /**
     * find state based on route
     * @param string route a ussd text in form 1*2*7
     * @return UssdState
     */
    resolveRoute (route, callback) {
        // separate route parts
        var parts = route === ''? [] : route.split('*');
        // follow the links from start state
        var state = this.states[UssdMenu.START_STATE];
        
        if(!state.next || Object.keys(state.next).length === 0){
            // if first state has no next link defined
            return callback(null, this.states[state.defaultNext]);
        }

        // if the first state has route rule for empty string,
        // prepend it to route parts
        if ('' in state.next) {
            parts.unshift('');
        }
        
        async.whilst(
            () => parts.length > 0 ,
            (whileCb) => {
                
                // get next link from route
                var part = parts.shift();
                var nextFound = false;
                this.val = part;
                //check if link matches any declared on current next
                async.forEachOfSeries(
                    state.next,
                    (next, link, itCb) => {
                        
                        /* called when next path has been retrieved
                        * either synchronously or with async callback or promise
                        */
                        let nextPathCallback = (nextPath) => {
                            state = this.states[nextPath];
                            if (!state) {
                                return itCb(
                                    new Error(`declared state does not exist: ${nextPath}`));
                            }

                            state.val = part;
                            nextFound = true;
                            return itCb({ intended: true });
                        };
                        
                        if (this.testLinkRule(link, part)) {
                            var nextPath;
                            // get next state based
                            // the type of value linked
                            switch (typeof next) {
                            case 'string':
                                    // get the state based on name
                                nextPath = next;
                                break;
                            case 'function':
                                    // custom function declared
                                nextPath = next(nextPathCallback);
                                break;
                            }
                            if (typeof nextPath === 'string') {
                                // nextPath determined synchronously,
                                // manually call callback
                                return nextPathCallback(nextPath);
                            }
                            else if (nextPath && nextPath.then) {
                                // promise used to retrieve nextPath
                                return nextPath.then(nextPathCallback);
                            }

                        }
                        else {
                            return itCb();
                        }
                    },
                    (err) => {
                        if (err && !err.intended) {
                    
                            return whileCb(err);
                        }
                        if (!nextFound && state.defaultNext) {
                            // if link not found, resort to default if specified
                            state = this.states[state.defaultNext];
                            state.val = part;
                        }

                        whileCb();
                    }
                    );            
                
                // end iterator
            },
            (err) => {
                if(err){
                    return callback(err);
                }
                
                return callback(null, state);
            }
        );
    }

    runState (state) {
        if (!state.run) {
            return this.emit('error', new Error(`run function not defined for state: ${state.name}`));
        }
        state.run(state);
    }

    go (stateName) {
        var state = this.states[stateName];
        state.val = this.val;
        this.runState(state);
    }

    goStart () {
        this.go(UssdMenu.START_STATE);
    }

    /**
     * configure custom session handler
     * @param {Object} config object with implementation
     * for get, set, start and end methods
     */
    sessionConfig (config) {
        /*
        the following 2 functions are used to make session
        method cross-compatible between callbacks and promises
        */

        /**
         * creates a callback function that calls
         * the promise resolve and reject functions as well as
         * the provided callback
         * 
         */
        let makeCb = (resolve, reject, cb) => {
            return (err, res) => {
                if(err){
                    if(cb) cb(err);    
                    reject(err);
                    this.emit('error', err);
                }
                else {
                    if(cb) cb(null, res);
                    resolve(res);                    
                }
            };
        };

        /**
         * if p is a promise, handle its resolve and reject
         * chains and invoke the provided callback
         */
        let resolveIfPromise = (p, resolve, reject, cb) => {
            if(p && p.then){
                p.then( res => {
                    if(cb) cb(null, res);
                    resolve(res);                    
                }).catch(err => {
                    if(cb) cb(err);
                    reject(err);                    
                    this.emit('error', err);
                });
            }
        };

        // implement session methods based on user-defined handlers
        this.session = {
            start: (cb) => {
                return new Promise((resolve, reject) => {
                    let res = config.start(this.args.sessionId, makeCb(resolve, reject, cb));
                    resolveIfPromise(res, resolve, reject, cb);
                });
            },
            get: (key, cb) => {
                return new Promise((resolve, reject) => {
                    let res = config.get(this.args.sessionId, key, makeCb(resolve, reject, cb));
                    resolveIfPromise(res, resolve, reject, cb);
                });            
            },
            set: (key, val, cb) => {
                return new Promise((resolve, reject) => {
                    let res = config.set(this.args.sessionId, key, val, makeCb(resolve, reject, cb));
                    resolveIfPromise(res, resolve, reject, cb);
                }); 
            },
            end: (cb) => {
                return new Promise((resolve, reject) => {
                    let res = config.end(this.args.sessionId, makeCb(resolve, reject, cb));
                    resolveIfPromise(res, resolve, reject, cb);
                });
            }
        };
    }

    /**
     * create a state on the ussd chain
     * @param string name name of the state
     * @param object options
     * @param object options.next object mapping of route 
     *  val to state names
     * @param string options.defaultNext name of state to run
     *  when the given route from this state can't be resolved
     * @param function options.run the method to run when this
     *  state is resolved
     * @return Ussd the same instance of Ussd
     */
    state (name, options) {
        var state = new UssdState(this);
        this.states[name] = state;
        
        state.name = name;
        state.next = options.next;
        state.run = options.run;
        // default defaultNext to same state
        state.defaultNext = options.defaultNext || name;
        
        
        return this;
    }

    /**
     * create the start state of the ussd chain
     */
    startState (options) {
        return this.state(UssdMenu.START_STATE, options); 
    }

    /*
     * maps incoming API arguments to the format used by Africa's Talking
     */
    mapArgs (args) {
        if (this.provider === 'hubtel') {
            this.args = {
                sessionId: args.SessionId,
                phoneNumber: `+${args.Mobile}`,
                serviceCode: args.ServiceCode,
                text: args.Type === 'Initiation' ? '' : args.Message,
            };
        } else {
            this.args = args;
        }
    }

    /*
     * Returns the full route string joined by asterisks, ex: 1*2*41
     * Africa's Talking Provides full route string, but hubtel only has the
     * message text sent and must be concatinated.
     */
    getRoute(args) {
        if (this.provider === 'hubtel') {
            if (this.session === null) {
                return this.emit('error', new Error('Session config required for Hubtel provider'));
            } else if (args.Type === 'Initiation') {
                // Ignore initial message
                return this.session.set('route', '').then(() => '');
            } else {
                return this.session.get('route').then(pastRoute => {
                    const route = pastRoute ? `${pastRoute}*${this.args.text}` : this.args.text;
                    return this.session.set('route', route).then(() => {
                        return route;
                    });
                });
            }
        } else {
            return Promise.resolve(this.args.text);
        }
    }

    /**
     * run the ussd menu
     * @param object args request args from the gateway api
     * @param string args.text
     * @param string args.phoneNumber
     * @param string args.sessionId
     * @param string args.serviceCode
     */
    run (args, onResult) {
        this.mapArgs(args);
        this.onResult = onResult;

        let run = () => {
            this.getRoute(args).then(route => {
                this.resolveRoute(route, (err, state) => {
                    if (err) {
                        return this.emit('error', new Error(err));
                    }
                    this.runState(state);
                });
            }).catch(err => {
                console.error('Failed to get route:', err);
                return this.emit('error', new Error(err));
            })
        };

        if(this.session){
            this.session.start().then(run);
        }
        else {
            run();
        }

        return new Promise((resolve,reject)=>{
            this.resolve = resolve;
        });

    }

}

UssdMenu.START_STATE = '__start__';


class UssdState {
    
    constructor (menu) {
        this.menu = menu;
        this.name = null;
        this.run = null;
        this.defaultNext = null;
        this.val = null;
    }   
    
}

module.exports = UssdMenu;