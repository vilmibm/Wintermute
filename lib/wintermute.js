var events = require('events');
var sys = require('sys');

function Plugin() { events.EventEmitter.call(this); }
sys.inherits(Plugin, events.EventEmitter);

exports.Plugin = Plugin;
