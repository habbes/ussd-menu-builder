const UssdMenu = require("ussd-menu-builder");
let menu = new UssdMenu();

// Define menu states
menu.startState({
  run: () => {
    // use menu.con() to send response without terminating session
    menu.con(
      "Welcome. Choose option:" + "\n1. Show Balance" + "\n2. Buy Airtime"
    );
  },
  // next object links to next state based on user input
  next: {
    "1": "showBalance",
    "2": "buyAirtime"
  }
});

menu.state("showBalance", {
  run: () => {
    // fetch balance
    fetchBalance(menu.args.phoneNumber).then(function(bal) {
      // use menu.end() to send response and terminate session
      menu.end("Your balance is KES " + bal);
    });
  }
});

menu.state("buyAirtime", {
  run: () => {
    menu.con("Enter amount:");
  },
  next: {
    // using regex to match user input to next state
    "*\\d+": "buyAirtime.amount"
  }
});

// nesting states
menu.state("buyAirtime.amount", {
  run: () => {
    // use menu.val to access user input value
    var amount = Number(menu.val);
    buyAirtime(menu.args.phoneNumber, amount).then(function(res) {
      menu.end("Airtime bought successfully.");
    });
  }
});

// Registering USSD handler with Express

app.post("/ussd", function(req, res) {
  menu.run(req.body, ussdResult => {
    res.send(ussdResult);
  });
});
