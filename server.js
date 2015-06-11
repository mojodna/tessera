#!/usr/bin/env node
"use strict";

// increase the libuv threadpool size to 1.5x the number of logical CPUs.
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || Math.ceil(Math.max(4, require('os').cpus().length * 1.5));

var path = require("path");

var cors = require("cors"),
    debug = require("debug"),
    express = require("express"),
    morgan = require("morgan"),
    responseTime = require("response-time");

var serve = require("./lib/app"),
    tessera = require("./lib/index");

debug = debug("tessera");

module.exports = function(opts, callback) {
  var app = express().disable("x-powered-by"),
      tilelive = require("tilelive-cache")(require("tilelive"), {
        size: process.env.CACHE_SIZE || opts.cacheSize,
        sources: process.env.SOURCE_CACHE_SIZE || opts.sourceCacheSize
      });

  callback = callback || function() {};

  // load and register tilelive modules
  require("./lib/modules")(tilelive, opts);

  if (process.env.NODE_ENV !== "production") {
    // TODO configurable logging per-style
    app.use(morgan("dev"));
  }

  if (opts.uri) {
    app.use(responseTime());
    app.use(cors());
    app.use(express.static(path.join(__dirname, "public")));
    app.use(express.static(path.join(__dirname, "bower_components")));
    app.use(serve(tilelive, opts.uri));

    tilelive.load(opts.uri, function(err, src) {
      if (err) {
        throw err;
      }

      return tessera.getInfo(src, function(err, info) {
        if (err) {
          debug(err.stack);
          return;
        }

        if (info.format === "pbf") {
          app.use("/_", serve(tilelive, "xray+" + opts.uri));
          app.use("/_", express.static(path.join(__dirname, "public")));
          app.use("/_", express.static(path.join(__dirname, "bower_components")));
        }
      });
    });
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

      app.use(prefix, express.static(path.join(__dirname, "public")));
      app.use(prefix, express.static(path.join(__dirname, "bower_components")));
      app.use(prefix, serve(tilelive, config[prefix]));
    });
  }

  app.listen(process.env.PORT || opts.port, function() {
    console.log("Listening at http://%s:%d/", this.address().address, this.address().port);

    return callback();
  });
};
