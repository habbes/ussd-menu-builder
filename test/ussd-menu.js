'use strict';
const expect = require('chai').expect;
const UssdMenu = require('../lib/ussd-menu');

describe('UssdMenu', function () {
    let menu,
        args = {
            phoneNumber: '+2547123456789',
            serviceCode: '111',
            sessionId: 'sfdsfdsafdsf',
            text: ''
        };
    beforeEach(function () {
        menu = new UssdMenu();
    });

    describe('States', function () {

        it('should create start state', function () {
            menu.startState({
                run: function () {
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

        it('should create states', function () {
            menu.state('state1', {
                run: function () {
                    menu.con('1. State 2');
                },
                next: {
                    '1': 'state2'
                }
            });

            menu.state('state2', {
                run: function () {
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

    describe('State Resolution', function () {

        it('should run the start state if no empty rule exists', function (done) {
            args.text = '';
            menu.startState({
                run: function () {
                    done();
                },
                next: {
                    '1': 'state2'
                }
            });

            menu.run(args);
        });

        it('should follow the empty rule on the start state if declared', function (done) {

            args.text = '';
            menu.startState({
                run: function () {
                    done('Error: start state called');
                },
                next: {
                    '': 'state1'
                }
            });

            menu.state('state1', {
                run: function () {
                    done();
                }
            });

            menu.run(args);
        });

        it('should pass the state to the run function', function (done) {

            args.text = '1';
            menu.startState({
                next: {
                    '1': 'state1'
                }
            });
            menu.state('state1', {
                run: function (state) {
                    expect(state.val).to.equal('1');
                    expect(menu.val).to.equal('1');
                    expect(state.menu).to.equal(menu);
                    expect(state.menu.args).to.deep.equal(args);
                    done();
                }
            });

            menu.run(args);
        });

        it('should resolve simple string rules', function (done) {

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
                run: function (state) {
                    expect(state.val).to.equal('4');
                    done();
                }
            });

            menu.run(args);
        });

        it('should resolve regex rules when starting with *', function (done) {

            args.text = '1*James';
            menu.startState({
                next: {
                    '1': 'state1'
                }
            });

            menu.state('state1', {
                next: {
                    '*\\w+': 'state1.name'
                }
            });

            menu.state('state1.name', {
                run: function (state) {
                    expect(state.val).to.equal('James');
                    done();
                }
            });

            menu.run(args);
        });

        it('should resolve regex first if declared before conflicting rule', function (done) {

            args.text = 'input';
            menu.startState({
                next: {
                    '*\\w+': 'state1',
                    'input': 'state2' // conflicts with \w+ regex
                }
            });

            menu.state('state1', {
                run: function (state) {
                    expect(state.val).to.equal('input');
                    done();
                }
            });

            menu.state('state2', {
                run: function (state) {
                    done('state2 not supposed to be called');
                }
            });

            menu.run(args);
        });

        it('should not resolve regex first if declared after conflicting rule', function (done) {

            args.text = 'rule';
            menu.startState({
                next: {
                    'rule': 'state1',
                    '*\\w+': 'state2'
                }
            });

            menu.state('state1', {
                run: function (state) {
                    expect(state.val).to.equal('rule');
                    done();
                }
            });

            menu.state('state2', {
                run: function (state) {
                    done('state2 not supposed to be called');
                }
            });

            menu.run(args);
        });

        it('should successfully resolve state based on sync function', function (done) {

            args.text = '1';
            menu.startState({
                next: {
                    '1': function () {
                        return 'state1';
                    }
                }
            });

            menu.state('state1', {
                run: function (state) {
                    expect(state.val).to.equal('1');
                    done();
                }
            });

            menu.run(args);
        });

        it('should successfully resolve state based on async function using callback', function (done) {

            args.text = '1';
            menu.startState({
                next: {
                    '1': function (callback) {
                        return callback('state1');
                    }
                }
            });

            menu.state('state1', {
                run: function (state) {
                    expect(state.val).to.equal('1');
                    done();
                }
            });

            menu.run(args);
        });

        it('should successfully resolve state based on async function using promise', function (done) {

            args.text = '1';
            menu.startState({
                next: {
                    '1': function () {
                        return new Promise((resolve, reject) => {
                            return resolve('state1');
                        });
                    }
                }
            });

            menu.state('state1', {
                run: function (state) {
                    expect(state.val).to.equal('1');
                    done();
                }
            });

            menu.run(args);
        });

        it('should fall back to declared default if link not found', function (done) {
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
                run: function (state) {
                    expect(state.val).to.equal('invalid');
                    done();
                }
            });

            menu.run(args);
        });

        if ('should use same state as default if no default is declared', function (done) {
            args.text = '1*invalid';
            menu.startState({
                next: {
                    '1': 'state1'
                }
            });

            menu.state('state1', {
                run: function (state) {
                    expect(state.val).to.equal('invalid');
                    done();
                },
                next: {
                    '1': 'state1.1',
                    '2': 'state1.2',
                }
            });
        });

        it('should redirect to a different state using the go method', function (done) {
            args.text = '1';
            menu.startState({
                next: {
                    '1': 'state1',
                    '2': 'state2'
                }
            });
            menu.state('state1', {
                run: function (state) {
                    menu.go('state2');
                }
            });
            menu.state('state2', {
                run: function (state) {
                    expect(state.val).to.equal('1'); //retains the val of the referring state
                    expect(menu.val).to.equal('1');
                    done();
                }
            });
            menu.run(args);

        });

        it('should redirect to the start state using goStart method', function (done) {
            args.text = '1';
            menu.startState({
                run: function (state) {
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
                run: function (state) {
                    menu.goStart();
                }
            });

            menu.run(args);
        });

    });



    describe('Response', function () {
        let args = {
            phoneNumber: '+254123456789',
            serviceCode: '111',
            sessionId: 'dsfsfsdfsd',
            text: ''
        };
        it('should successfully return a CON response', function (done) {

            let message = 'Choose option';
            menu.startState({
                run: function () {
                    menu.con(message);
                }
            });

            menu.run(args, function (res) {
                expect(res).to.equal('CON ' + message);
                done();
            });
        });

        it('should successfully return an END response', function (done) {

            let message = 'Thank you';
            menu.startState({
                run: function () {
                    menu.end(message);
                }
            });
            menu.run(args, function (res) {
                expect(res).to.equal('END ' + message);
                done();
            });
        });

    });


    describe('Sessions', function () {

        describe('Callback-based config', function () {
            let menu;
            let session;
            let args = {
                serviceCode: '*111#',
                phoneNumber: '123456',
                sessionId: '324errw44we'
            };
            let config = {
                start: (id, cb) => {
                    if (!(id in session)) session[id] = {};
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


            it('should manage session using promises', function (done) {
                session = {};
                menu = new UssdMenu();
                menu.sessionConfig(config);
                menu.startState({
                    run: () => {
                        menu.session.set('name', 'Habbes').then(() => {
                            expect(session[args.sessionId].name).to.equal('Habbes');
                            menu.con('Next');
                        })
                            .catch(err => {
                                done(err);
                            });
                    },
                    next: {
                        '1': 'state1'
                    }
                });

                menu.state('state1', {
                    run: () => {
                        menu.session.get('name').then(val => {
                            expect(val).to.equal('Habbes');
                            menu.end();
                        })
                            .catch(err => {
                                console.log('STATE1 error', err);
                                done(err);
                            });
                    }
                });

                args.text = '';
                menu.run(args, () => {
                    expect(session[args.sessionId]).to.deep.equal({ name: 'Habbes' });
                    args.text = '1';
                    menu.run(args, () => {
                        process.nextTick(() => {
                            // expect session to be deleted
                            expect(session[args.sessionId]).to.not.be.ok;
                            done();
                        });

                    });
                });



            });


            it('should manage session using callbacks', function (done) {
                session = {};
                menu = new UssdMenu();
                menu.sessionConfig(config);
                menu.startState({
                    run: () => {
                        menu.session.set('name', 'Habbes', err => {
                            if (err) return done(err);
                            expect(session[args.sessionId].name).to.equal('Habbes');
                            menu.con('Next');
                        });
                    },
                    next: {
                        '1': 'state1'
                    }
                });

                menu.state('state1', {
                    run: () => {
                        menu.session.get('name', (err, val) => {
                            if (err) return done(err);
                            expect(val).to.equal('Habbes');
                            menu.end();
                        });
                    }
                });

                args.text = '';
                menu.run(args, () => {
                    expect(session[args.sessionId]).to.deep.equal({ name: 'Habbes' });
                    args.text = '1';
                    menu.run(args, _ => {
                        process.nextTick(() => {
                            // expect session to be deleted
                            expect(session[args.sessionId]).to.not.be.ok;
                            done();
                        });

                    });
                });



            });


        });


        describe('Promise-based config', function () {
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
                        if (!(id in session)) session[id] = {};
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


            it('should manage session using promises', function (done) {
                session = {};
                menu = new UssdMenu();
                menu.sessionConfig(config);
                menu.startState({
                    run: () => {
                        menu.session.set('name', 'Habbes').then(() => {
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
                    run: () => {
                        menu.session.get('name').then(val => {
                            expect(val).to.equal('Habbes');
                            menu.end();
                        })
                            .catch(done);
                    }
                });

                args.text = '';
                menu.run(args, () => {
                    expect(session[args.sessionId]).to.deep.equal({ name: 'Habbes' });
                    args.text = '1';
                    menu.run(args, _ => {
                        process.nextTick(() => {
                            // expect session to be deleted
                            expect(session[args.sessionId]).to.not.be.ok;
                            done();
                        });

                    });
                });



            });


            it('should manage session using callbacks', function (done) {
                session = {};
                menu = new UssdMenu();
                menu.sessionConfig(config);
                menu.startState({
                    run: () => {
                        menu.session.set('name', 'Habbes', err => {
                            if (err) return done(err);
                            expect(session[args.sessionId].name).to.equal('Habbes');
                            menu.con('Next');
                        });
                    },
                    next: {
                        '1': 'state1'
                    }
                });

                menu.state('state1', {
                    run: () => {
                        menu.session.get('name', (err, val) => {
                            if (err) return done(err);
                            expect(val).to.equal('Habbes');
                            menu.end();
                        });
                    }
                });

                args.text = '';
                menu.run(args, () => {
                    expect(session[args.sessionId]).to.deep.equal({ name: 'Habbes' });
                    args.text = '1';
                    menu.run(args, _ => {
                        process.nextTick(() => {
                            // expect session to be deleted
                            expect(session[args.sessionId]).to.not.be.ok;
                            done();
                        });

                    });
                });



            });


        });

    });

    describe('Error handling', function () {

        it('should emit error when route cannot be reached', function (done) {
            menu = new UssdMenu();
            menu.startState({
                run: () => {
                    menu.con('Next');
                },
                next: {
                    '1': 'unknown'
                }
            });
            args.text = '1';
            menu.on('error', err => {
                expect(err).to.be.an('error');
                done();
            });
            menu.run(args);
        });

        it('should emit error when run function not defined on matched route', function (done) {
            menu = new UssdMenu();
            menu.startState({
                run: () => {
                    menu.con('Next');
                },
                next: {
                    '1': 'state1'
                }
            });
            menu.state('state1', {});
            args.text = '1';
            menu.on('error', err => {
                expect(err).to.be.an('error');
                done();
            });
            menu.run(args);

        });

        describe('Session Handler errors', function () {

            it('should emit error when session start handler returns error in callback', function (done) {
                let config = {
                    start: (sessionId, cb) => {
                        cb(new Error('start error'));
                    },
                };

                menu.on('error', err => {
                    expect(err).to.be.an('error');
                    expect(err.message).to.equal('start error');
                    done();
                });
                menu.sessionConfig(config);
                menu.run(args);

            });

            it('should emit error when session start handler returns error in promise', function (done) {
                let config = {
                    start: () => {
                        return new Promise((resolve, reject) => {
                            return reject(new Error('start error'))
                        });
                    },
                };

                menu.on('error', err => {
                    expect(err).to.be.an('error');
                    expect(err.message).to.equal('start error');
                    done();
                });
                menu.sessionConfig(config);
                menu.run(args);

            });

            it('should emit error when session start handler throws error in promise', function (done) {
                let config = {
                    start: () => {
                        return new Promise(() => {
                            throw new Error('start error');
                        });
                    },
                };

                menu.on('error', err => {
                    expect(err).to.be.an('error');
                    expect(err.message).to.equal('start error');
                    done();
                });
                menu.sessionConfig(config);
                menu.run(args);

            });

            it('should emit error when set handler returns error in callback', function (done) {
                let config = {
                    start: (id, cb) => {
                        cb();
                    },
                    set: (sessionId, key, val, cb) => {
                        cb(new Error('set error'));
                    },
                };
                menu.sessionConfig(config);
                menu.on('error', err => {
                    expect(err).to.be.an('error');
                    expect(err.message).to.equal('set error');
                    done();
                });

                menu.startState({
                    run: () => {
                        menu.session.set('key', 'value');
                    }
                });
                menu.run(args);

            });

            it('should emit error when set handler returns error in promise', function (done) {
                let config = {
                    start: (id, cb) => {
                        cb();
                    },
                    set: () => {
                        return new Promise((resolve, reject) => {
                            reject(new Error('set error'));
                        });
                    },
                };
                menu.sessionConfig(config);
                menu.on('error', err => {
                    expect(err).to.be.an('error');
                    expect(err.message).to.equal('set error');
                    done();
                });

                menu.startState({
                    run: () => {
                        menu.session.set('key', 'value');
                    }
                });
                menu.run(args);

            });

            it('should emit error when set handler throws error in promise', function (done) {
                let config = {
                    start: (id, cb) => {
                        cb();
                    },
                    set: () => {
                        return new Promise(() => {
                            throw new Error('set error');
                        });
                    },
                };
                menu.sessionConfig(config);
                menu.on('error', err => {
                    expect(err).to.be.an('error');
                    expect(err.message).to.equal('set error');
                    done();
                });

                menu.startState({
                    run: () => {
                        menu.session.set('key', 'value');
                    }
                });
                menu.run(args);

            });


            it('should pass error in callback to session.set when set handler passes error to callback', function (done) {
                let config = {
                    start: (id, cb) => {
                        cb();
                    },
                    set: (id, key, val, cb) => {
                        cb(new Error('set error'));
                    },
                };
                menu.sessionConfig(config);

                menu.startState({
                    run: () => {
                        menu.session.set('key', 'value', err => {
                            expect(err).to.be.an('error');
                            expect(err.message).to.equal('set error');
                            done();
                        });
                    }
                });
                menu.run(args);
            });


            it('should catch error in promise in session.set when set handler passes error to callback', function (done) {
                let config = {
                    start: (id, cb) => {
                        cb();
                    },
                    set: (id, key, val, cb) => {
                        cb(new Error('set error'));
                    },
                };
                menu.sessionConfig(config);

                menu.startState({
                    run: () => {
                        menu.session.set('key', 'value')
                            .catch(err => {
                                expect(err).to.be.an('error');
                                expect(err.message).to.equal('set error');
                                done();
                            });
                    }
                });
                menu.run(args);
            });


            it('should pass error in callback to session.set when set handler rejects error in promise', function (done) {
                let config = {
                    start: (id, cb) => {
                        cb();
                    },
                    set: () => {
                        return new Promise((resolve, reject) => {
                            reject(new Error('set error'));
                        });
                    },
                };
                menu.sessionConfig(config);

                menu.startState({
                    run: () => {
                        menu.session.set('key', 'value', err => {
                            expect(err).to.be.an('error');
                            expect(err.message).to.equal('set error');
                            done();
                        });
                    }
                });
                menu.run(args);
            });


            it('should catch error in promise in session.set when set handler rejects error in promise', function (done) {
                let config = {
                    start: (id, cb) => {
                        cb();
                    },
                    set: () => {
                        return new Promise((resolve, reject) => {
                            reject(new Error('set error'));
                        });
                    },
                };
                menu.sessionConfig(config);

                menu.startState({
                    run: () => {
                        menu.session.set('key', 'value')
                            .catch(err => {
                                expect(err).to.be.an('error');
                                expect(err.message).to.equal('set error');
                                done();
                            });
                    }
                });
                menu.run(args);
            });



            it('should emit error when get handler returns error in callback', function (done) {
                let config = {
                    start: (id, cb) => {
                        cb();
                    },
                    get: (sessionId, key, cb) => {
                        cb(new Error('set error'));
                    },
                };
                menu.sessionConfig(config);
                menu.on('error', err => {
                    expect(err).to.be.an('error');
                    expect(err.message).to.equal('set error');
                    done();
                });

                menu.startState({
                    run: () => {
                        menu.session.get('key');
                    }
                });
                menu.run(args);

            });


            it('should emit error when get handler returns error in promise', function (done) {
                let config = {
                    start: (id, cb) => {
                        cb();
                    },
                    get: () => {
                        return new Promise((resolve, reject) => {
                            return reject(new Error('set error'));
                        });
                    },
                };
                menu.sessionConfig(config);
                menu.on('error', err => {
                    expect(err).to.be.an('error');
                    expect(err.message).to.equal('set error');
                    done();
                });

                menu.startState({
                    run: () => {
                        menu.session.get('key');
                    }
                });
                menu.run(args);

            });


            it('should emit error when get handler throws error in promise', function (done) {
                let config = {
                    start: (id, cb) => {
                        cb();
                    },
                    get: () => {
                        return new Promise(() => {
                            throw new Error('set error');
                        });
                    },
                };
                menu.sessionConfig(config);
                menu.on('error', err => {
                    expect(err).to.be.an('error');
                    expect(err.message).to.equal('set error');
                    done();
                });

                menu.startState({
                    run: () => {
                        menu.session.get('key');
                    }
                });
                menu.run(args);

            });

            it('should pass error in callback to session.get when get handler passes error to callback', function (done) {
                let config = {
                    start: (id, cb) => {
                        cb();
                    },
                    get: (id, key, cb) => {
                        cb(new Error('get error'));
                    },
                };
                menu.sessionConfig(config);

                menu.startState({
                    run: () => {
                        menu.session.get('key', err => {
                            expect(err).to.be.an('error');
                            expect(err.message).to.equal('get error');
                            done();
                        });
                    }
                });
                menu.run(args);
            });


            it('should catch error in promise in session.get when get handler passes error to callback', function (done) {
                let config = {
                    start: (id, cb) => {
                        cb();
                    },
                    get: (id, key, cb) => {
                        cb(new Error('get error'));
                    },
                };
                menu.sessionConfig(config);

                menu.startState({
                    run: () => {
                        menu.session.get('key')
                            .catch(err => {
                                expect(err).to.be.an('error');
                                expect(err.message).to.equal('get error');
                                done();
                            });
                    }
                });
                menu.run(args);
            });


            it('should pass error in callback to session.get when get handler rejects error in promise', function (done) {
                let config = {
                    start: (id, cb) => {
                        cb();
                    },
                    get: () => {
                        return new Promise((resolve, reject) => {
                            reject(new Error('get error'));
                        });
                    },
                };
                menu.sessionConfig(config);

                menu.startState({
                    run: () => {
                        menu.session.get('key', err => {
                            expect(err).to.be.an('error');
                            expect(err.message).to.equal('get error');
                            done();
                        });
                    }
                });
                menu.run(args);
            });


            it('should catch error in promise in session.get when get handler passes error to callback', function (done) {
                let config = {
                    start: (id, cb) => {
                        cb();
                    },
                    get: () => {
                        return new Promise((resolve, reject) => {
                            reject(new Error('get error'));
                        });
                    },
                };
                menu.sessionConfig(config);

                menu.startState({
                    run: () => {
                        menu.session.get('key')
                            .catch(err => {
                                expect(err).to.be.an('error');
                                expect(err.message).to.equal('get error');
                                done();
                            });
                    }
                });
                menu.run(args);
            });

            // SESSION END HANDLER


            it('should emit error when session end handler returns error in callback', function (done) {
                let config = {
                    start: (id, cb) => {
                        cb();
                    },
                    end: (id, cb) => {
                        cb(new Error('end error'));
                    }
                };

                menu.on('error', err => {
                    expect(err).to.be.an('error');
                    expect(err.message).to.equal('end error');
                    done();
                });
                menu.sessionConfig(config);
                menu.startState({
                    run: () => {
                        menu.end();
                    }
                });
                menu.run(args);

            });

            it('should emit error when session end handler returns error in promise', function (done) {
                let config = {
                    start: (id, cb) => {
                        cb();
                    },
                    end: () => {
                        return new Promise((resolve, reject) => {
                            return reject(new Error('end error'));
                        });
                    }
                };

                menu.on('error', err => {
                    expect(err).to.be.an('error');
                    expect(err.message).to.equal('end error');
                    done();
                });
                menu.sessionConfig(config);
                menu.startState({
                    run: () => {
                        menu.end();
                    }
                });
                menu.run(args);

            });


            it('should emit error when session end handler throws error in promise', function (done) {
                let config = {
                    start: (id, cb) => {
                        cb();
                    },
                    end: () => {
                        return new Promise(() => {
                            throw new Error('end error');
                        });
                    }
                };

                menu.on('error', err => {
                    expect(err).to.be.an('error');
                    expect(err.message).to.equal('end error');
                    done();
                });
                menu.sessionConfig(config);
                menu.startState({
                    run: () => {
                        menu.end();
                    }
                });
                menu.run(args);

            });


        });

    });

    describe('Hubtel Support', function () {
        let menu;
        let session = {};
        let args;

        let config = {
            start: (id) => {
                return new Promise((resolve, reject) => {
                    if (!(id in session)) session[id] = {};
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

        beforeEach(function () {
            menu = new UssdMenu({ provider: 'hubtel' });
            session = {};
            args = {
                Mobile: '233208183783',
                SessionId: 'bd7bc392496b4b28af2033ba83f5e400',
                ServiceCode: '713*4',
                Type: 'Response',
                Message: '',
                Operator: 'MTN',
                Sequence: 2
            };
        });

        it('should emit error when invalid provider in menu config', function (done) {
            try {
                menu = new UssdMenu({ provider: 'otherTelco' });
            } catch (err) {
                expect(err).to.be.an('error');
                done();
            }
        });

        it('should emit error when session config not set up', function (done) {
            menu = new UssdMenu({ provider: 'hubtel' });
            menu.startState({
                run: () => {
                    menu.con('Next');
                }
            });
            menu.on('error', err => {
                expect(err).to.be.an('error');
                expect(err.message).to.equal('Session config required for Hubtel provider');
                done();
            });
            menu.run(args);
        });

        it('should emit error if unable to map route', function (done) {
            menu = new UssdMenu({ provider: 'hubtel' });
            args.Message = '1';
            args.Type = 'Initiation';

            let config = {
                start: (id, cb) => {
                    cb();
                },
                get: (id, key) => {
                    return new Promise((resolve, reject) => {
                        let val = session[id][key];
                        return resolve(val);
                    });
                },
                set: (id, key, val) => {
                    return new Promise((resolve, reject) => {
                        if (key === 'route') {
                            return reject('Cannot set route key');
                        } else {
                            session[id][key] = val;
                            return resolve();
                        }
                    });
                },
                end: () => {
                    return new Promise((resolve, reject) => {
                        return reject(new Error('end error'));
                    });
                }
            };

            menu.sessionConfig(config);
            menu.startState({
                run: () => {
                    menu.con('Next');
                },
                next: {
                    '1': 'state1'
                }
            });
            menu.on('error', err => {
                expect(err).to.be.an('error');
                expect(err.message).to.equal('Cannot set route key');
                done();
            });

            menu.run(args);

        });

        it('should map incoming hubtel request to menu.args', function (done) {
            menu.sessionConfig(config);

            args.Message = '1';
            menu.startState({
                next: {
                    '1': 'state1'
                }
            });
            menu.state('state1', {
                run: function (state) {
                    expect(state.menu.args.phoneNumber).to.equal(`+${args.Mobile}`);
                    expect(state.menu.args.sessionId).to.equal(args.SessionId);
                    expect(state.menu.args.serviceCode).to.equal(args.ServiceCode);
                    expect(state.menu.args.text).to.equal(args.Message);
                    expect(state.val).to.equal(args.Message);
                    expect(menu.val).to.equal(args.Message);
                    done();
                }
            });

            menu.run(args);
        });
        it('should override message from Initiation call with empty string', function (done) {
            menu.sessionConfig(config);
            const initArgs = Object.assign(args, {
                Sequence: 1,
                Message: '*713*4#',
                Type: 'Initiation',
            });

            menu.startState({
                run: function (state) {
                    expect(menu.val).to.equal('');
                    expect(state.menu.args.text).to.equal('');
                    done();
                }
            });

            menu.run(initArgs);
        });

        it('should return Response object from menu.con', function (done) {
            menu.sessionConfig(config);
            menu.startState({
                run: () => {
                    menu.con('Next');
                },
            });

            menu.run(args, res => {
                expect(res).to.be.an('object');
                expect(res.Message).to.equal('Next');
                expect(res.Type).to.equal('Response');
                done();
            });
        });

        it('should return Release object from menu.end', function (done) {
            menu.sessionConfig(config);
            menu.startState({
                run: () => {
                    menu.end('End');
                },
            });

            menu.run(args, res => {
                expect(res).to.be.an('object');
                expect(res.Message).to.equal('End');
                expect(res.Type).to.equal('Release');
                done();
            });
        });

        it('should be able to map first text to route', function (done) {
            menu.sessionConfig(config);

            const testResponse = 'state1 response';

            menu.startState({
                run: () => {
                    menu.con('Next');
                },
                next: {
                    '1': 'state1'
                }
            });
            menu.state('state1', {
                run: () => {
                    menu.con(testResponse);
                }
            });

            menu.run(args, () => {
                expect(session[args.SessionId].route).to.equal('');
                args.Message = '1';
                menu.run(args, res => {
                    process.nextTick(() => {
                        // expect session to be deleted
                        expect(res.Message).to.equal(testResponse);
                        expect(session[args.SessionId].route).to.equal(args.Message);
                        done();
                    });
                });
            });
        });
        it('should be able to map text after first sequence to route', function (done) {
            menu.sessionConfig(config);

            const initArgs = Object.assign({}, args, {
                Sequence: 1,
                Message: '*713*4#',
                Type: 'Initiation',
            });
            const firstResponseArgs = Object.assign({}, args, {
                Sequence: 2,
                Message: '1',
            });
            const secondResponseArgs = Object.assign({}, args, {
                Sequence: 3,
                Message: '3',
            });

            const testResponse = 'state1 response';
            const test2Response = 'state2 response';

            menu.startState({
                run: () => {
                    menu.con('Next');
                },
                next: {
                    '1': 'state1'
                }
            });
            menu.state('state1', {
                run: () => {
                    menu.con(testResponse);
                },
                next: {
                    '3': 'state2'
                }
            });

            menu.state('state2', {
                run: () => {
                    menu.end(test2Response);
                }
            });

            menu.run(initArgs, initResponse => {
                expect(session[args.SessionId].route).to.equal('');
                expect(initResponse.Message).to.equal('Next');
                expect(initResponse.Type).to.equal('Response');
                menu.run(firstResponseArgs, res => {
                    // expect session to be deleted
                    expect(res.Message).to.equal(testResponse);
                    expect(res.Type).to.equal('Response');
                    menu.run(secondResponseArgs, res2 => {
                        expect(res2.Message).to.equal(test2Response);
                        expect(res2.Type).to.equal('Release');
                        expect(session[args.SessionId].route).to.equal('1*3');
                        done();
                    });
                });
            });
        });

    });
    describe("Menu Run Returns Promise", function () {
        it('menu.run should return a resolvable promise', function (done) {
            let message = 'It works!';
            menu.startState({
                run: function () {
                    menu.end(message);
                }
            });
            menu.run(args).then(function (res) {
                expect(res).to.equal('END ' + message);
                done();
            });
        });

    });

});