// reply to server PING. This is pretty much a required plugin if you want to
// stay online.
exports.plugin = function() {
	this.onBot('PING', function(message) {
		this.send('PONG', 'localhost');
	});
};
