#!/usr/bin/env node
"use strict";

// increase the libuv threadpool size to 1.5x the number of logical CPUs.
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || Math.ceil(Math.max(4, require('os').cpus().length * 1.5));

var path = require("path");

var cors = require("cors"),
    express = require("express"),
    morgan = require("morgan"),
    responseTime = require("response-time");

var serve = require("./lib/app");

module.exports = function(opts, callback) {
  var callback = callback || function() {},
      app = express().disable("x-powered-by"),
      tilelive = require("tilelive-cache")(require("tilelive"), {
        size: process.env.CACHE_SIZE || opts.cacheSize
      });

  // load and register tilelive modules
  require("./modules")(tilelive, opts);

  if (process.env.NODE_ENV !== "production") {
    // TODO configurable logging per-style
    app.use(morgan('dev'));
  }

  if (opts.uri) {
    app.use(responseTime());
    app.use(cors());
    app.use(express.static(__dirname + "/public"));
    app.use(serve(tilelive, opts.uri));
  }

  if (opts.config) {
    var config = require(path.resolve(opts.config));

    Object.keys(config).forEach(function(prefix) {
      if (config[prefix].timing !== false) {
        app.use(prefix, responseTime());
      }

      if (config[prefix].cors !== false) {
        app.use(prefix, cors());
      }

      app.use(prefix, express.static(__dirname + "/public"));
      app.use(prefix, serve(tilelive, config[prefix]));
    });
  }

  app.listen(process.env.PORT || opts.port, function() {
    console.log("Listening at http://%s:%d/", this.address().address, this.address().port);

    return callback();
  });
};
