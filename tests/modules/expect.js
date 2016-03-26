var util = require('util');
var spawn = require('child_process');

var err = function(cmd, out) {
  return util.format("Failure running %s\n\n%s\n^^^^^^^^\n", cmd, out);
}

var Obj = function() {
  var _obj = {
    stderr: '',
    process: null,
    kill: function() { _obj.process.kill('SIGTERM'); },
    spawnExpect: function(cmd, args, waitFor, timeout) {
      return new Promise(function(resolve, reject) {
        setTimeout(reject, timeout ? timeout : 60000);
        _obj.process = spawn.spawn(cmd, args);
        _obj.process.stdout.on('data', (data) => { if (data.indexOf(waitFor) !== -1) resolve(); });
        _obj.process.stderr.on('data', (data) => { _obj.stderr += data; });
        _obj.process.on('close', (code) => { return code ? reject(err(cmd, _obj.stderr)) : resolve(); });
      });
    }
  };
  return _obj;
};

module.exports = new Obj();


