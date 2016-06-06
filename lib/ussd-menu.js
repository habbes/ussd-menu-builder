'use strict';
const async = require('async');

function UssdMenu() {
    
    this.args = null;
    this.states = {};
    this.result = '';
    this.onResult = null;
    this.val = '';
}

UssdMenu.START_STATE = '__start__';

UssdMenu.prototype.callOnResult = function () {
    if (this.onResult) {
        this.onResult(this.result);
    }
};

UssdMenu.prototype.con = function (text) {
    this.result = 'CON ' + text;
    this.callOnResult();
};

UssdMenu.prototype.end = function (text) {
    this.result = 'END ' + text;
    this.callOnResult();
};

UssdMenu.prototype.testLinkRule = function (rule, val) {
    //if rule starts with *, treat as regex
    if (typeof rule === 'string' && rule[0] === '*') {
        var re = new RegExp(rule.substr(1));
        return re.test(val);
    }
    return rule == val;
};

/**
 * find state based on route
 * @param string route a ussd text in form 1*2*7
 * @return UssdState
 */
UssdMenu.prototype.resolveRoute = function (route, callback) {
    // separate route parts
    var parts = route === ''? [] : route.split('*');
    // follow the links from start state
    var state = this.states[UssdMenu.START_STATE];
    
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
                                new Error(`Declared state does exist: ${nextPath}`));
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
                                nextPath = next(this, nextPathCallback);
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
                    if (!nextFound && state.nextDefault) {
                        // if link not found, resort to default if specified
                        state = this.states[state.nextDefault];
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
            
            if(!state){
                return callback(new Error('State resolution failed.'));
            }
            
            return callback(null, state);
        }
        );
};

UssdMenu.prototype.runState = function (state) {
    if (!state.run) {
        //TODO throw error
        return console.error('State run function not defined');
    }
    state.run(state);
};

UssdMenu.prototype.go = function (stateName) {
    var state = this.states[stateName];
    this.runState(state);
};

UssdMenu.prototype.goStart = function () {
    this.go(UssdMenu.START_STATE);
};

/**
 * create a state on the ussd chain
 * @param string name name of the state
 * @param object options
 * @param object options.next object mapping of route 
 *  val to state names
 * @param string options.nextDefault name of state to run
 *  when the given route from this state can't be resolved
 * @param function options.run the method to run when this
 *  state is resolved
 * @return Ussd the same instance of Ussd
 */
UssdMenu.prototype.state = function (name, options) {
    
    var state = new UssdState(this);
    this.states[name] = state;
    
    state.name = name;
    state.next = options.next;
    state.run = options.run;
    state.nextDefault = options.nextDefault;
    
    
    return this;
};

/**
 * create the start state of the ussd chain
 */
UssdMenu.prototype.startState = function (options) {
    return this.state(UssdMenu.START_STATE, options);
};

/**
 * run the ussd menu
 * @param object args request args from the gateway api
 * @param string args.text
 * @param string args.phoneNumber
 * @param string args.sessionId
 * @param string args.serviceCode
 */
UssdMenu.prototype.run = function (args, onResult) {
    
    if(args){
        this.args = args;
    }
    
    if (onResult) {
        this.onResult = onResult;
    }
    
    var route = this.args.text;
    this.resolveRoute(route, (err, state) => {
        if (err) {
            return console.error(err);
        }
        
        this.runState(state);
    });    
};

function UssdState(ussd) {
    
    this.ussd = ussd;
    this.name = null;
    this.run = null;
    
    this.val = null;
    
}

module.exports = UssdMenu;