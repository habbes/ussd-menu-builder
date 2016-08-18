'use strict';
const expect = require('chai').expect;
const UssdMenu = require('../lib/ussd-menu');

describe('UssdMenu', function(){
    let menu,
        args = {
            phoneNumber: '+2547123456789',
            serviceCode: '111',
            sessionId: 'sfdsfdsafdsf',
            text: ''
        };
    beforeEach(function(){
        menu = new UssdMenu();
    });

    describe('States', function(){
    
        it('should create start state', function(){
            menu.startState({
                run: function(){
                    menu.con('1. Next');
                },
                next: {
                    '1': 'next'
                }
            });

            let state = menu.states[UssdMenu.START_STATE];
            expect(state).to.be.an('object');
            expect(state.next).to.be.an('object');
            expect(state.next['1']).to.equal('next');
            expect(state.run).to.be.a('function');
        });

        it('should create states', function(){
            menu.state('state1', {
                run: function(){
                    menu.con('1. State 2');
                },
                next: {
                    '1': 'state2'
                }
            });

            menu.state('state2', {
                run: function(){
                    menu.end('End.');
                }
            });

            let state = menu.states['state1'];
            expect(state).to.be.an('object');
            expect(state.next).to.be.an('object');
            expect(state.next['1']).to.equal('state2');
            expect(state.run).to.be.a('function');

            state = menu.states['state2'];
            expect(state).to.be.an('object');
            expect(state.run).to.be.a('function');
        });
    });

    describe('State Resolution', function(){
        
        it('should run the start state if no empty rule exists', function(done){
            args.text = '';
            menu.startState({
                run: function(){
                    done();
                },
                next: {
                    '1': 'state2'
                }
            });

            menu.run(args);
        });

        it('should follow the empty rule on the start state if declared', function(done){
            
            args.text = '';
            menu.startState({
                run: function(){
                    done('Error: start state called');
                },
                next: {
                    '': 'state1'
                }
            });

            menu.state('state1', {
                run: function(){
                    done();
                }
            });

            menu.run(args);
        });

        it('should pass the state to the run function', function(done){
            
            args.text = '1';
            menu.startState({
                next: {
                    '1': 'state1'
                }
            });
            menu.state('state1', {
                run: function(state){
                    expect(state.val).to.equal('1');
                    expect(menu.val).to.equal('1');
                    expect(state.menu).to.equal(menu);
                    expect(state.menu.args).to.deep.equal(args);                    
                    done();
                }
            });

            menu.run(args);
        });

        it('should resolve simple string rules', function(done){
            
            args.text = '1*4';
            menu.startState({
                next: {
                    '1': 'state1'
                }
            });

            menu.state('state1', {
                next: {
                    '4': 'state1.4'
                }
            });

            menu.state('state1.4', {
                run: function(state){
                    expect(state.val).to.equal('4');
                    done();
                }
            });

            menu.run(args);
        });

        it('should resolve regex rules when starting with *', function(done){
            
            args.text = '1*James';
            menu.startState({
                next: {
                    '1': 'state1'
                }
            });

            menu.state('state1', {
                next: {
                    '*\\w+' : 'state1.name'
                }
            });

            menu.state('state1.name', {
                run: function(state){
                    expect(state.val).to.equal('James');
                    done();
                }
            });

            menu.run(args);
        });

        it('should resolve regex first if declared before conflicting rule', function(done){
            
            args.text = 'input';
            menu.startState({
                next: {
                    '*\\w+': 'state1',
                    'input': 'state2' // conflicts with \w+ regex
                }
            });

            menu.state('state1', {
                run: function(state){
                    expect(state.val).to.equal('input');
                    done();
                }
            });

            menu.state('state2', {
                run: function(state){
                    done('state2 not supposed to be called');
                }
            });

            menu.run(args);
        });

        it('should not resolve regex first if declared after conflicting rule', function(done){
            
            args.text = 'rule';
            menu.startState({
                next: {
                    'rule': 'state1',
                    '*\\w+': 'state2'
                }
            });

            menu.state('state1', {
                run: function(state){
                    expect(state.val).to.equal('rule');
                    done();
                }
            });

            menu.state('state2', {
                run: function(state){
                    done('state2 not supposed to be called');
                }
            });

            menu.run(args);
        });

        it('should successfully resolve state based on sync function', function(done){
            
            args.text = '1';
            menu.startState({
                next: {
                    '1': function(){
                        return 'state1';
                    }
                }
            });

            menu.state('state1', {
                run: function(state){
                    expect(state.val).to.equal('1');
                    done();
                }
            });

            menu.run(args);
        });

        it('should successfully resolve state based on async function using callback', function(done){
            
            args.text = '1';
            menu.startState({
                next: {
                    '1': function(callback){
                        return callback('state1');
                    }
                }
            });

            menu.state('state1', {
                run: function(state){
                    expect(state.val).to.equal('1');
                    done();
                }
            });

            menu.run(args);
        });

        it('should successfully resolve state based on async function using promise', function(done){
            
            args.text = '1';
            menu.startState({
                next: {
                    '1': function(){
                       return new Promise((resolve, reject) => {
                           return resolve('state1');
                       });
                    }
                }
            });

            menu.state('state1', {
                run: function(state){
                    expect(state.val).to.equal('1');
                    done();
                }
            });

            menu.run(args);
        });

        it('should fall back to declared default if link not found', function(done){
            args.text = '1*invalid';
            menu.startState({
                next: {
                    '1': 'state1'
                }
            });

            menu.state('state1', {
                next: {
                    '1': 'state1.1',
                    '2': 'state1.2',
                },
                
                defaultNext: 'state1.default'
            });

            menu.state('state1.default', {
                run: function(state){
                    expect(state.val).to.equal('invalid');
                    done();
                }
            });

            menu.run(args);
        });

        if('should use same state as default if no default is declared', function(done){
            args.text = '1*invalid';
            menu.startState({
                next: {
                    '1': 'state1'
                }
            });

            menu.state('state1', {
                run: function(state){
                    expect(state.val).to.equal('invalid');
                    done();
                },
                next: {
                    '1': 'state1.1',
                    '2': 'state1.2',
                }
            });
        });

        it('should redirect to a different state using the go method', function(done){
            args.text = '1';
            menu.startState({
                next: {
                    '1': 'state1',
                    '2': 'state2'
                }
            });
            menu.state('state1', {
                run: function(state){
                    menu.go('state2');
                }
            });
            menu.state('state2', {
                run: function(state){
                    expect(state.val).to.equal('1'); //retains the val of the referring state
                    expect(menu.val).to.equal('1');
                    done();
                }
            });
            menu.run(args);

        });

        it('should redirect to the start state using goStart method', function(done){
             args.text = '1';
            menu.startState({
                run: function(state){
                    expect(state.val).to.equal('1');
                    expect(menu.val).to.equal('1');
                    done();
                },
                next: {
                    '1': 'state1',
                    '2': 'state2'
                }
            });
            menu.state('state1', {
                run: function(state){
                    menu.goStart();
                }
            });

            menu.run(args);
        });

    });

    

    describe('Response', function(){
        let args = {
            phoneNumber: '+254123456789',
            serviceCode: '111',
            sessionId: 'dsfsfsdfsd',
            text: ''
        };
        it('should successfully return a CON response', function(done){
            
            let message = 'Choose option';
            menu.startState({
                run: function(){
                    menu.con(message);
                }
            });

            menu.run(args, function(res){
                expect(res).to.equal('CON ' + message);
                done();
            });            
        });

        it('should successfully return an END response', function(done){
            
            let message = 'Thank you';
            menu.startState({
                run: function(){
                    menu.end(message);
                }
            });
            menu.run(args, function(res){
                expect(res).to.equal('END ' + message);
                done();
            });
        });

    });


    describe('Sessions', function(){       
        
        describe('Callback-based config', function(){
            let menu;
            let session;
            let args = {
                serviceCode: '*111#',
                phoneNumber: '123456',
                sessionId: '324errw44we'
            };
            let config = {
                start: (id, cb) => {
                    if(!(id in session)) session[id] = {};
                    cb();
                },
                end: (id, cb) => {
                    delete session[id];
                    cb();
                },
                get: (id, key, cb) => {
                    let val = session[id][key];
                    cb(null, val);
                },
                set: (id, key, val, cb) => {
                    session[id][key] = val;
                    cb();
                }
            };


            it('should manage session using promises', function(done){
                session = {};
                menu = new UssdMenu();
                menu.sessionConfig(config);
                menu.startState({
                    run: () => {
                        menu.session.set('name', 'Habbes').then( _ => {
                            expect(session[args.sessionId].name).to.equal('Habbes');
                            menu.con('Next');
                        })
                        .catch(done);
                    },
                    next: {
                        '1': 'state1'
                    }
                });

                menu.state('state1', {
                    run: _ => {
                        menu.session.get('name').then( val => {
                            expect(val).to.equal('Habbes');
                            menu.end();
                        })
                        .catch(done);
                    }
                });

                args.text = '';
                menu.run(args, _ => {
                    expect(session[args.sessionId]).to.deep.equal({name: 'Habbes'});
                    args.text = '1';
                    menu.run(args, _=> {
                        process.nextTick(_ => {
                            // expect session to be deleted
                            expect(session[args.sessionId]).to.not.be.ok;
                            done();
                        });
                        
                    });
                });


                
            });


            it('should manage session using callbacks', function(done){
                session = {};
                menu = new UssdMenu();
                menu.sessionConfig(config);
                menu.startState({
                    run: () => {
                        menu.session.set('name', 'Habbes', err => {
                            if(err) return done(err);
                            expect(session[args.sessionId].name).to.equal('Habbes');
                            menu.con('Next');
                        });
                    },
                    next: {
                        '1': 'state1'
                    }
                });

                menu.state('state1', {
                    run: _ => {
                        menu.session.get('name', (err, val) => {
                            if(err) return done(err);
                            expect(val).to.equal('Habbes');
                            menu.end();
                        });
                    }
                });

                args.text = '';
                menu.run(args, _ => {
                    expect(session[args.sessionId]).to.deep.equal({name: 'Habbes'});
                    args.text = '1';
                    menu.run(args, _=> {
                        process.nextTick(_ => {
                            // expect session to be deleted
                            expect(session[args.sessionId]).to.not.be.ok;
                            done();
                        });
                        
                    });
                });


                
            });


        });


        describe('Promise-based config', function(){
            let menu;
            let session;
            let args = {
                serviceCode: '*111#',
                phoneNumber: '123456',
                sessionId: '324errw44we'
            };
            let config = {
                start: (id) => {
                    return new Promise((resolve, reject) => {
                        if(!(id in session)) session[id] = {};
                        return resolve();
                    });
                },
                end: (id) => {
                    return new Promise((resolve, reject) => {
                        delete session[id];
                        return resolve();
                    });
                },
                get: (id, key) => {
                    return new Promise((resolve, reject) => {
                        let val = session[id][key];
                        return resolve(val);
                    });
                },
                set: (id, key, val) => {
                    return new Promise((resolve, reject) => {
                        session[id][key] = val;
                        return resolve();
                    });
                }
            };


            it('should manage session using promises', function(done){
                session = {};
                menu = new UssdMenu();
                menu.sessionConfig(config);
                menu.startState({
                    run: () => {
                        menu.session.set('name', 'Habbes').then( _ => {
                            expect(session[args.sessionId].name).to.equal('Habbes');
                            menu.con('Next');
                        })
                        .catch(done);
                    },
                    next: {
                        '1': 'state1'
                    }
                });

                menu.state('state1', {
                    run: _ => {
                        menu.session.get('name').then( val => {
                            expect(val).to.equal('Habbes');
                            menu.end();
                        })
                        .catch(done);
                    }
                });

                args.text = '';
                menu.run(args, _ => {
                    expect(session[args.sessionId]).to.deep.equal({name: 'Habbes'});
                    args.text = '1';
                    menu.run(args, _=> {
                        process.nextTick(_ => {
                            // expect session to be deleted
                            expect(session[args.sessionId]).to.not.be.ok;
                            done();
                        });
                        
                    });
                });


                
            });


            it('should manage session using callbacks', function(done){
                session = {};
                menu = new UssdMenu();
                menu.sessionConfig(config);
                menu.startState({
                    run: () => {
                        menu.session.set('name', 'Habbes', err => {
                            if(err) return done(err);
                            expect(session[args.sessionId].name).to.equal('Habbes');
                            menu.con('Next');
                        });
                    },
                    next: {
                        '1': 'state1'
                    }
                });

                menu.state('state1', {
                    run: _ => {
                        menu.session.get('name', (err, val) => {
                            if(err) return done(err);
                            expect(val).to.equal('Habbes');
                            menu.end();
                        });
                    }
                });
                
                args.text = '';
                menu.run(args, _ => {
                    expect(session[args.sessionId]).to.deep.equal({name: 'Habbes'});
                    args.text = '1';
                    menu.run(args, _=> {
                        process.nextTick(_ => {
                            // expect session to be deleted
                            expect(session[args.sessionId]).to.not.be.ok;
                            done();
                        });
                        
                    });
                });


                
            });


        });

    }); 
    

});