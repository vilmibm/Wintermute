var wintermute = require('./wintermute');

wintermute.on('message', function(msg) {
  if (msg.text.match(/^.kudos/)) {
    // connect to datastore
    this.send(msg.channel, 'TODO kudos leaderboard');
  }
});

// join
// part
// etc
