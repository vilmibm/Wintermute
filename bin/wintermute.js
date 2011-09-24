var events = require('events');
var fs = require('fs');
var path = require('path');
var sys = require('sys');


// "main" portion at bottom

// TODO abstract bot,irc stuff into lib/{bot,irc}.js

// TODO we need a lib/util.js
// these should all be called as:
  // fun.call(some_obj, [args, ])
// why? because they *should* be Object.prototype funcs, but this breaks stuff
// occasionally.
function clone() {
  // perform deep copy of this
  var new_obj = (this instanceof Array) ? [] : {};
  for (var i in this) {
    if (!this.hasOwnProperty(i)) { continue; }
    if (this[i] && typeof this[i] == "object") {
      new_obj[i] = clone.call(this[i]);
    }
    else {
      new_obj[i] = this[i]
    }
  }
  return new_obj;
}

function items(fn) {
  // iterate over k,v pairs of object
  for (var key in this) {
    if (this.hasOwnProperty(key)) {
      fn(key, this[key]);
    }
  }
};

function update(obj) {
  // extend this by obj and return extended object. Totally non-destructive.
  var copy = clone.call(this);
  var obj_copy = clone.call(obj);
  items.call(obj_copy, function(k,v) { copy[k] = v; });
  return copy;
}

function Bot(config) {
  events.EventEmitter.call(this);
  this.config = {
    host:             '127.0.0.1',
    port:             6667,
    nick:             'wintermute',
    user:             'wintermute',
    realname:         'tessier ashpool',
    // openssl genrsa -out ryans-key.pem 1024
    ssl_cert_file:    undefined,
    plugins_dir:      './plugins',
    default_plugins:  []
  };
  this.config = update.call(this.config, config);

  this.plugins = {};

  this.buffer = '';

  // Handlers that respond to low-level events
  this.on('connect', this.on_connect);
  this.on('disconnect', this.on_disconnect);
  this.on('data', this.on_data);

  // Prepare basic message events for higher-level event handlers
  this.on('message', function(message){
    // TODO: what if message has no .command?
    if (! /PING|PRIVMSG|NOTICE|MODE|\d{1,4}/.test(message.command)) {
      console.log('<', message);
    }
    this.emit(message.command, message);
    this.emit_to_plugins(message.command, message);
  });

  // Handlers that process specific IRC commands
  this.on('PING', function(message){
    this.send({command:'PONG', params:'localhost'});
  });
  this.on('PRIVMSG', function(message){
    message.text = message.params[1];
    if (message.params[0] == this.config.nick) {
      this.emit('whisper', message);
      this.emit_to_plugins('whisper', message);
    } else {
      message.channel = message.params[0];
      this.emit('chat', message);
      this.emit_to_plugins('chat', message);
    }
  });
  this.on('NOTICE', function(message){
    message.sender = message.params[0];
    message.text = message.params[1];
    console.log('!', message.sender, ':', message.text);
  });

  // Higher-level event handlers, usually triggered by IRC event handlers
  this.on('whisper', function(message){
    console.log(
      '<', message.nick, 'whispers,', message.text);
  });
  this.on('chat', function(message){
    console.log(
      '< in', message.channel, '<' + message.nick + '>', message.text);
  });

  // plugins
  // TODO needs generalization/cleanup
  var that = this;
  this.config.default_plugins.forEach(function(plugin_path) {
    var full_plugin_path = path.join(that.config.plugins_dir, plugin_path);
    try {
      var plugin = require(full_plugin_path).plugin;
      plugin.name = plugin_path;
      that.plugins[full_plugin_path] = plugin;
    }
    catch (exc) {
      console.error('Error loading plugin "'+full_plugin_path+'": '+exc);
    };
  });
  // reload a plugin
  this.on('PRIVMSG', function(message) {
    var match = message.text.match(/^\.reload ([^ ]+)/); 
    if (match === null) { return; }
    var plugin_path = match[1];
    var full_plugin_path = path.join(this.config.plugins_dir, plugin_path);
    delete require.cache[full_plugin_path];
    delete this.plugins[full_plugin_path];
    var plugin = require(full_plugin_path).plugin;
    plugin.name = plugin_path;
    this.plugins[full_plugin_path] = plugin;
  });
}
sys.inherits(Bot, events.EventEmitter);

// core Bot functionality
Bot.prototype.connect = function() {
  var that = this;
  var onconnect = function() {
    that.emit('connect');
  };

  if (this.config.ssl_key_file) {
    // FIXME it's bizarre that .on('connect', onconnect) does not work with
    // this the way it does for net.createConnection, and everything else does.
    // What the heck is going on??
    this.connection = require('tls').connect(
        this.config.port,
        this.config.host,
        {key: fs.readFileSync(this.config.ssl_key_file)},
        onconnect);
  } else {
    this.connection = require('net').createConnection(
        this.config.port,
        this.config.host
        ).on('connect', onconnect);
  }
  this.connection.setEncoding('utf8');
  this.connection.setTimeout(60*60*10);
  this.connection.on('data', function(chunk) {that.emit('data', chunk)});
  this.connection.on('disconnect', function() {that.emit('disconnect')});
};

Bot.prototype.disconnect = function() {
  if (this.connection.readyState !== 'closed') {
    this.connection.close();
  }
};

Bot.prototype.send = function(message) {
  // message is an object with attributes:
  // prefix: string
  // command: string
  // params: string or Array of strings. If Array, only the last may contain
  // spaces.
  return this.raw(''
      + (message.prefix
        ? ':' + message.prefix + ' '
        : '')
      + message.command
      + (message.params
        ? ' ' + (typeof(message.params) == 'string'
          ? ':' + message.params
          : message.params.slice(0, -1).concat(':' + message.params.slice(-1)).join(' '))
        : ''));
}

Bot.prototype.raw = function(message) {
  if (this.connection.readyState !== 'open') {
    console.error('raw: not connected');
    return;
  }

  // TODO instead of this, break into multiple messages, if possible.
  if (message.length > 510) {
    console.error('Message too long: ' + message);
    return;
  }
  if (/PASS /.test(message)) {
    console.log('> PASS (not displaying password)');
  } else {
    console.log('>', message);
  }
  this.connection.write(message + "\r\n", 'utf8');
};

// Event handlers
Bot.prototype.on_connect = function() {
  console.log('connected');
  if (this.config.password) {
    this.send({command: 'PASS', params: this.config.password});
  }
  this.send({command: 'NICK', params: this.config.nick});
  this.send({command: 'USER', params: [
    this.config.user, 0, '*', this.config.realname]});
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
    var line = this.buffer.slice(0, offset);
    this.buffer = this.buffer.slice(offset+2);

    // build a message object containing all the parts
    // FIXME break up for documentation
    var irc_lineparse_re = /^(?::(([^@! ]*)(?:(?:!([^@]*))?@([^ ]*))?) )?([^ ]+)((?: [^: ][^ ]*){0,14})(?: :?(.*))?$/
    var res = irc_lineparse_re.exec(line);

    if (! res) {
      console.error('RegExp fail!', line);
    }

    var message = {
      raw: line, // Whole line
      prefix: res[1], // complete prefix
      nick: res[2], // or servername
      username: res[3],
      hostname: res[4],
      command: res[5],
      params: res[7]
        ? res[6].split(' ').slice(1).concat(res[7])
        : res[6].split(' ').slice(1)
    };
    this.emit('message', message);
  }
};

// Actions
Bot.prototype.say = function(channel, text) {
  this.send({command: 'PRIVMSG', params: [channel, text]});
};

Bot.prototype.join = function(channel) {
  this.send({command: 'JOIN', params: [channel]});
};

// Plugins
Bot.prototype.emit_to_plugins = function() {
  var evnt = arguments[0];
  var bot = this;
  var rest = Array.prototype.slice.call(arguments, 1);
  var args_for_emit = [evnt, bot].concat(rest);
  items.call(this.plugins, function(full_plugin_path, plugin) {
    plugin.emit.apply(plugin, args_for_emit);
  });
};

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
// vim: ts=2 sw=2 et :
