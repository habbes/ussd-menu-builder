# ussd-menu-builder

[![Coverage Status](https://coveralls.io/repos/github/habbes/ussd-menu-builder/badge.svg?branch=master)](https://coveralls.io/github/habbes/ussd-menu-builder?branch=master)


Easily compose USSD menus in Node.Js, compatible with 
[Africastalking API](https://africastalking.com).

# Example

```javascript
UssdMenu = require('./ussd-menu');
var menu = new UssdMenu();

menu.startState({
    run: function(state){
        
        menu.con('Welcome. Choose option:' +
            '\n1. Show Balance' +
            '\n2. Buy Airtime');
    },
    next: {
        '1': 'showBalance',
        '2': 'buyAirtime'
    }
});

menu.state('showBalance', {
    run: function(state){
        // fetch balance
        fetchBalance(menu.args.phoneNumber).then(function(bal){
            menu.end('Your balance is KES ' + bal);
        });
    }
});

menu.state('buyAirtime', {
    run: function(state){
        menu.con('Enter amount:');
    },
    next: {
        '*\\d+': 'buyAirtime.amount'
    }
});

menu.state('buyAirtime.amount', {
    run: function(state){
        var amount = Number(state.val);
        buyAirtime(menu.args.phoneNumber, amount).then(function(res){
            menu.end('Airtime bought successfully.');
        });
    }
});

// Registering USSD handler with Express

app.post('/ussd', function(req, res){
    menu.run(req.body, function(ussdResult){
        res.send(ussdResult);
    });
});

```

# Features
- Use intuitive states to compose USSD menus
- Makes it easier to build complex nested menus
- Use simple input matching, regular expressions or custom asynchronous
functions to resolve routes from one state to another
- The state-based approach allows you to easily modularize complex menus
in different files

# TODO
- Documentation
