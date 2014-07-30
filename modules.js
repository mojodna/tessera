"use strict";

var modules = require("tilelive-modules");

module.exports = function(tilelive, options) {
  options = options || {};

  modules.concat((options.require || [])).forEach(function(name) {
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
