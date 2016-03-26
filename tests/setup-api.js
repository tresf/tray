"use strict";

module.exports = function() {
  var _qz = require('../js/qz-tray.js');
  var _crypto = require('crypto');
  var _ws  = require('ws');
  var _q = require('q');

  _qz.api.showDebug(false);
  _qz.api.setWebSocketType(_ws);
  _qz.api.setPromiseType(_q.Promise);
  _qz.api.setSha256Type(function(data) {
    return _crypto.createHash('sha256').update(data).digest("hex");
  });
  _qz.security.setCertificatePromise(function(resolve, reject) {
    resolve(fs.readFileSync(cert).toString());
  });
  _qz.security.setSignaturePromise(function(toSign) {
    return function(resolve, reject) {
      fs.readFile(key, 'utf-8', function(err, obj) {
        var sign = _crypto.createSign('SHA1');
        sign.update(toSign);
        resolve(sign.sign({key: obj}, 'base64'));
      });
    };
  });

  return _qz;
}();
