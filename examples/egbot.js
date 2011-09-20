var Bot = require('./bot').Bot;

var bot = new Bot({
  host: 'irc.freenode.org',
  user: 'wintermutebot',
  nick: 'my_bot'
});

bot.connect();
bot.on('connect', function() {
  this.join('#node.js');
});
