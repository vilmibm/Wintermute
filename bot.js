var events = require('events');
var net = require('net');
var sys = require('sys');


function Bot(config) {
  events.EventEmitter.call(this);
  config = config || {};
  this.host = config.host || '127.0.0.1';
  this.port = config.port || 6667;
  this.nick = config.nick || 'wintermute';
  this.user = config.user || 'wintermute';
  this.password = config.password;

  this.buffer = '';

  this.on('connect', this.on_connect);
  this.on('disconnect', this.on_disconnect);
  this.on('data', this.on_data);
}
sys.inherits(Bot, events.EventEmitter);

// core Bot functionality
Bot.prototype.connect = function() {
  var that = this;
  this.connection = net.createConnection(this.port, this.host);
  this.connection.setEncoding('utf8');
  this.connection.setTimeout(60*60*10);

  this.connection.on('connect', function() {that.emit('connect')});
  this.connection.on('data', function(chunk) {that.emit('data', chunk)});
  this.connection.on('disconnect', function() {that.emit('disconnect')});
};

Bot.prototype.disconnect = function() {
  if (this.connection.readyState !== 'closed') {
    this.connection.close();
  }
};

Bot.prototype.raw = function(txt) {
  if (this.connection.readyState !== 'open') {
    console.log('not connected');
    return;
  }

  txt = txt + "\r\n";
  this.connection.write(txt, 'utf8');
};

Bot.prototype.join = function(channel) {
  this.raw('JOIN ' + channel);
};

// Events
Bot.prototype.on_connect = function() {
  console.log('connected');
  if (this.password) {
    this.raw('PASS ' + this.password);
  }
  this.raw('NICK '+this.nick);
  this.raw('USER ' + this.user + ' 0 * : tessier ashpool');
};

Bot.prototype.on_disconnect = function() {
  console.log('disconnected');
};

Bot.prototype.on_data = function(chunk) {
  console.log('got chunk: ' + chunk);
  this.buffer += chunk;
  var offset = this.buffer.indexOf("\r\n");
  if (offset < 0) {
    return;
  }
  var data = this.buffer.slice(0, offset);
  this.buffer = this.buffer.slice(offset+2);

  console.log(data);
};


// TODO

// plugins
// TODO

// personality
// TODO

exports.Bot = Bot;
