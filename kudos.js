var Plugin = require('./lib/wintermute').Plugin;
var plugin = new Plugin();

plugin.on('event', function(bot, msg) {
  if (msg.text.match(/^.kudos/)) {
    // connect to datastore
    bot.send(msg.channel, 'TODO kudos leaderboard');
  }
});

exports.plugin = plugin;

// join
// part
// etc
