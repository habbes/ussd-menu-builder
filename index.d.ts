/// <reference types="node" />

// Type definitions for ussd-menu-builder 1.0.0
// Project: ussd-menu-builder
// Definitions by: Jason Schapiro <yono38@gmail.com>

import { EventEmitter } from "events";

export = UssdMenu;

declare class UssdState {
    constructor(menu: UssdMenu);

    defaultNext?: string;

    menu: UssdMenu;

    name: string;

    run(): void;

    val: string;
}

declare class UssdMenu extends EventEmitter {
    constructor();

    session: any;
    args: UssdMenu.UssdGatewayArgs;
    states: Array<UssdState>;
    result: string;
    val: string;

    callOnResult(): void;

    con(text: string): void;

    end(text: string): void;

    go(state: string): void;

    goStart(): void;

    onResult?(result: string): void;

    resolveRoute(route: string, callback: Function): void;

    run(args: UssdMenu.UssdGatewayArgs, onResult?: Function): void;

    runState(state: UssdState): void;

    sessionConfig(config: UssdMenu.UssdSessionConfig): void;

    startState(options: UssdMenu.UssdStateOptions): void;

    state(name: string, options: UssdMenu.UssdStateOptions): UssdMenu;

    testLinkRule(rule: string, val: string): boolean;

    static START_STATE: string;
}

/*~ If you want to expose types from your module as well, you can
 *~ place them in this block.
 */
declare namespace UssdMenu {
    interface NextState {
        [state: string]: Function | string;
    }

    interface UssdGatewayArgs {
        text: string;
        phoneNumber: string;
        sessionId: string;
        serviceCode: string;
    }
    
    interface UssdStateOptions {
        run(): void;
        next?: NextState;
        defaultNext?: string;
    }
    
    interface UssdSessionConfig {
        start(sessionId: string, callback?: Function): (Promise<any> | void);
    
        end(sessionId: string, callback?: Function): (Promise<any> | void);
    
        get(sessionId: string, key: string, callback?: Function): (Promise<any> | void);
    
        set(sessionId: string, key: string, value: any, callback?: Function): (Promise<any> | void);
    }
}


