"use strict";

var fs = require("fs");
var util = require('util');
var spawn = require('child_process');
var spawnExpect = require('./modules/spawn-expect.js');
var format = require('./modules/format-output.js');

var ALLOWED = process.env.HOME + '/.qz/allowed.dat';
var TMP_KEY = '/tmp/private-key.pem';
var TMP_CERT = '/tmp/digital-certificate.txt';


////// Static Functions //////

// Isolate fingerprinnt, lowercase, strip delims
function stripFingerprint(stdout) {
  return stdout.split('=')[1].replace(/:/g, '').trim().toLowerCase();
}

// Convert fingerprint to allowed.dat format
function allowedList(fingerprint) {
  var from = '2000-01-01 00:00:00';
  var to = '2099-01-01 00:00:00';
  return util.format("%s\tvoid\tvoid\t%s\t%s\ttrue\n", fingerprint, from, to);
}


////// Parameters //////

var certParams = {
  cmd: 'openssl',
  opts: ['req', '-x509', '-newkey', 'rsa:2048', '-keyout', TMP_KEY, '-out', TMP_CERT, '-days', '1', '-nodes', '-subj', '/C=vo/ST=void/L=void/O=void/OU=void/CN=void'],
  desc: "Generate certificate, private key"
};

var fingerParams = {
  cmd: "openssl",
  opts: ['x509','-fingerprint', '-in', TMP_CERT, '-noout'],
  desc: "Write fingerprint to allowed.dat"
};

var trayParams = {
  cmd: 'java',
  opts: [util.format('-DtrustedRootCert=%s', TMP_CERT), '-jar', '../out/dist/qz-tray.jar'],
  desc: "Start Tray",
  expect: ' started on port'
};


////// Test Logic //////

var Obj = function() {
  var _obj = {

    certPromise: function() {
      return new Promise(function(resolve, reject) {
        var out = spawn.spawnSync(certParams.cmd, certParams.opts);
        if (!out.status) {
          format.pass(certParams.desc);
          return resolve();
        }
        format.fail(certParams.desc);
        reject(out.stderr ? out.stderr.toString() : "Unknown error generating cert");
      });
    },

    
    fingerPromise: function() {
      return new Promise(function(resolve, reject) {
        var out = spawn.spawnSync(fingerParams.cmd, fingerParams.opts);
        if (!out.status) {
          var fingerprint = stripFingerprint(out.stdout.toString());
          fs.appendFileSync(ALLOWED, allowedList(fingerprint));
          format.pass(fingerParams.desc);
          return resolve();
        }
        format.fail(fingerParams.desc);
        reject(out.stderr ? out.stderr.toString() : "Unknown error generating fingerprint");
      });
    },
    
    trayPromise: function() {
        return spawnExpect.spawnExpect(trayParams.cmd, trayParams.opts, trayParams.expect);
    },

    kill: function() { spawnExpect.kill(); }
  };
  return _obj;
};

module.exports = new Obj();
