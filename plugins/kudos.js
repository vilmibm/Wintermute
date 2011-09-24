var Plugin = require('/home/nksmith/wintermute/lib/wintermute').Plugin;
var plugin = new Plugin();

plugin.help = 'kudos and stuff';
plugin.author = 'nate';

plugin.on('chat', function(bot, msg) {
  console.log('HI');
  if (msg.text.match(/^.kudos/)) {
    // connect to datastore
    bot.say(msg.channel, 'TODO kudos leaderboard');
  }
});

exports.plugin = plugin;

// join
// part
// etc
