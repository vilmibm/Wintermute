function Plugin() {
  this.hooks = {};
}

Plugin.prototype.on = function(evnt, cb) {
  if (!this.hooks[evnt]) {
    this.hooks[evnt] = [cb];
  }
  else {
    this.hooks[evnt].push(cb);
  }
};

exports.Plugin = Plugin;
