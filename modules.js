"use strict";

module.exports = function(tilelive, options) {
  (options.require || []).forEach(function(name) {
    try {
      var mod = require(name);

      if (typeof(mod.registerProtocols) === "function") {
        mod.registerProtocols(tilelive);
      } else {
        mod(tilelive);
      }
    } catch (e) {}
  });

  return tilelive;
};
