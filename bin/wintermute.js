var events = require('events');
var fs = require('fs');
var net = require('net');
var path = require('path');
var sys = require('sys');

// "main" portion at bottom
// TODO abstract bot,irc stuff into lib/
// TODO move this file to bin/

function Bot(config) {
  events.EventEmitter.call(this);

  this.config = config || {};
  this.config.host = this.config.host || '127.0.0.1';
  this.config.port = this.config.port || 6667;
  this.config.nick = this.config.nick || 'wintermute';
  this.config.user = this.config.user || 'wintermute';
  this.config.password = config.password;
  this.config.plugins_dir = this.config.plugins_dir || './plugins';
  this.config.default_plugins = this.config.default_plugins || [];

  this.plugins.active = [];
  this.plugins.inactive = [];

  this.buffer = '';

  this.on('connect', this.on_connect);
  this.on('disconnect', this.on_disconnect);
  this.on('data', this.on_data);

  this.config.default_plugins.forEach(function(plugin_path) {
    var full_plugin_path = path.join(this.config.plugins_dir, plugin_path;
    try {
      var plugin = require(full_plugin_path);
      for (evnt in plugin.hooks) {
        if (!plugin.hooks.hasOwnProperty(evnt)) { return; }
        plugin.hooks[evnt].forEach(function(cb) {
          this.on(evnt, cb);
        });
      }
      this.plugins.active.push(full_plugin_path);
    }
    catch (exc) {
      console.error('Error loading plugin "'+full_plugin_path+'": '+exc);
      this.plugins.inactive.push(full_plugin_path);
    };
  });

  fs.readdir(this.config.plugins_dir, function(err, files) {
    this.emit(
  });

  this.emit('plugin_state_change', 'initial');
}
sys.inherits(Bot, events.EventEmitter);

// core Bot functionality
Bot.prototype.connect = function() {
  var that = this;
  this.connection = net.createConnection(this.config.port, this.config.host);
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

// Events
Bot.prototype.on_connect = function() {
  console.log('connected');
  if (this.config.password) {
    this.raw('PASS ' + this.config.password);
  }
  this.raw('NICK '+this.config.nick);
  this.raw('USER ' + this.config.user + ' 0 * : tessier ashpool');
};

Bot.prototype.on_disconnect = function() {
  console.log('disconnected');
};

Bot.prototype.on_data = function(chunk) {
  this.buffer += chunk;
  while (this.buffer) {
    var offset = this.buffer.indexOf("\r\n");
    if (offset < 0) {
      return;
    }
    var data = this.buffer.slice(0, offset);
    this.buffer = this.buffer.slice(offset+2);

    // TODO this is pretty ugly but eh i hate switch statements
    if (data.match(/PING/)) {
      this.raw(data.replace(/PING/, 'PONG'));
    }

    if (data.match(/PRIVMSG/)) {
      var msg = {};
      msg.sender = data.match(/:(.+)\!/)[1];
      msg.channel = data.match(/PRIVMSG (.+) :/)[1];
      msg.text = data.match(/PRIVMSG.*:(.+)$/)[1];
      this.emit('message', msg);
    }
  }
};

// Actions
Bot.prototype.send = function(channel, text) {
  this.raw('PRIVMSG ' + channel + ' :' + text);
};

Bot.prototype.join = function(channel) {
  this.raw('JOIN ' + channel);
};

// plugins
// TODO

// personality
// TODO

/* CLI processing */
// defaults to ~/.wintermuterc
// or specify

var rc = path.join(process.env.HOME, '.wintermuterc') || process.argv[2];

var config = {};
try {
  config = JSON.parse(fs.readFileSync(rc, 'utf8'));
} catch(e) {
  console.error('Caught error reading '+rc+': '+e);
  process.exit();
}

var bot = new Bot(config);
bot.connect();

exports = bot;

var repl = require('repl');
repl.start('irc>').context.bot = bot;
