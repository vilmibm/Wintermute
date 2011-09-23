var Plugin = require('/home/nksmith/wintermute/lib/wintermute').Plugin;
var plugin = new Plugin();

// TODO don't make this configurable: name should always be filename minus extension
plugin.name = 'kudos';
plugin.help = 'kudos and stuff';
plugin.author = 'nate';

plugin.on('message', function(bot, msg) {
  console.log('HI');
  if (msg.text.match(/^.kudos/)) {
    // connect to datastore
    bot.send(msg.channel, 'TODO kudos leaderboard');
  }
});

exports.plugin = plugin;

// join
// part
// etc
