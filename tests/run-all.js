'use strict';
/*

sudo npm cache clean -f
sudo npm install -g n
sudo n stable
npm config set registry http://registry.npmjs.org/
npm install -g ws q colors

*/

var format = require('./modules/format-output.js');
var qz = require('./setup-api.js');
var startTray = require('./start-tray.js');

format.divider("Starting tray...");

startTray.certPromise()
  .then(startTray.fingerPromise)
  .then(startTray.trayPromise)
  .then(function() {

    format.info("Connecting to tray...");
    return qz.websocket.connect();
  })
  .then(function() {
    format.pass("Connected");

    format.info("Checking version...");
    return qz.api.getVersion();
  })
  .then(function(ver) {
    format.pass("Found version: " + ver);
    format.info("Searching for Pixel printer...");
    return qz.printers.find("PDF");
  })
  .then(function(printer) {
    format.pass("Found printer: " + printer);

    var data = [{ type: 'html', format: 'file', data: '../assets/html_sample.html' }];
    format.info("Disconnecting from socket...");
    return qz.websocket.disconnect();
  })
  .catch(function(err) {
    return(format.fail(err));
  })
  .then(function(exit) {
    format.pass("Disconnected");
    format.info("Shutting down tray...");
    startTray.kill();
    format.pass("Tray terminated");
    format.divider("Exit status");
    format.status(exit ? "fail" : "pass", exit ? "Something went wrong" : "All tests pass");
    process.exit(exit ? exit : 0);
  });
