'use strict';

require('colors');

var status = function(type, msg) {
  switch(type) {
    case "fail" : type = type.red.bold; break;
    case "warn" : type = type.yellow.bold; break;
    default: type = type.green.bold;
  }
  console.log("  [%s] %s", type, msg);
};

module.exports = {
  info: function(msg) { console.log(msg.white.bold); },
  pass: function(msg) { return status("pass", msg); },
  warn: function(msg) { return status("warn", msg); },
  fail: function(err) {
    if (typeof err == 'object') {
      status("fail", err.message);
      console.error(err);
    } else {
      status("fail", err);
    }
    return 1;
  },
  status: status,
  pad: function(s, len) {
    while (s.length < len) { s += " "; }
    return s;
  },
  divider: function(msg) {
    console.log("\n================================================\n".cyan.bold);
    if (msg) console.log(msg.white.bold);
  }
}
