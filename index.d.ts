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
    constructor(opts?: UssdMenu.UssdMenuOptions);

    session: any;
    provider: UssdMenu.UssdMenuProvider;
    args: UssdMenu.UssdGatewayArgs;
    states: Array<UssdState>;
    result: string;
    val: string;

    callOnResult(): void;

    con(text: string): void;

    end(text: string): void;

    getRoute(args: UssdMenu.UssdGatewayArgs | UssdMenu.HubtelArgs): Promise<string>;

    go(state: string): void;

    goStart(): void;

    mapArgs(args: UssdMenu.UssdGatewayArgs | UssdMenu.HubtelArgs): UssdMenu.UssdGatewayArgs;

    onResult?(result: string | UssdMenu.HubtelResponse): void;

    resolveRoute(route: string, callback: Function): void;

    run(args: UssdMenu.UssdGatewayArgs, onResult?: Function): Promise<string>;

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

    interface HubtelResponse {
        Type: 'Response' | 'Release';
        Message: string;
    }

    interface HubtelArgs {
        Mobile: string;
        SessionId: string;
        ServiceCode: string;
        Type: 'Initiation' | 'Response' | 'Release' | 'Timeout';
        Message: string;
        Operator: 'Tigo' | 'Airtel' | 'MTN' | 'Vodafone' | 'Safaricom';
        Sequence: number;
        ClientState?: any;
    }

    type UssdMenuProvider = 'africasTalking' | 'hubtel';
    interface UssdMenuOptions {
        provider?: UssdMenuProvider;
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


