#!/usr/bin/env node
"use strict";

// increase the libuv threadpool size to 1.5x the number of logical CPUs.
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || Math.ceil(Math.max(4, require('os').cpus().length * 1.5));

var path = require("path"),
    stream = require("stream"),
    util = require("util");

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

  var mime = require("mime");
  mime.define({
    "application/x-protobuf": ["pbf"]
  });
  var normalizeHeaders = function(headers) {
    var _headers = {};

    Object.keys(headers).forEach(function(x) {
      _headers[x.toLowerCase()] = headers[x];
    });

    return _headers;
  };

  var TileCollector = function() {
    stream.Transform.call(this);

    var chunks = [],
        headers = {},
        tile;

    this.on("pipe", function(src) {
      tile = src;
    });

    this.setHeader = function(header, value) {
      headers[header] = value;
    };

    this._transform = function(chunk, encoding, callback) {
      chunks.push(chunk);

      return callback();
    };

    this._flush = function(callback) {
      var buf = Buffer.concat(chunks);

      // console.log("source URI:", source.sourceURI);
      // console.log("tile %d/%d/%d", tile.z, tile.x, tile.y);
      // console.log("headers:", headers);
      // console.log("length:", buf.length);

      headers = normalizeHeaders(headers);

      var path = util.format("%d/%d/%d", tile.z, tile.x, tile.y);

      if (tile.sourceURI.query.scale > 1) {
        path += util.format("@%dx", tile.sourceURI.query.scale);
      }

      path += util.format(".%s", mime.extension(headers["content-type"]));

      console.log("path:", path);

      // console.log("extension:", mime.extension(headers["content-type"]));

      return callback();
    };
  };

  util.inherits(TileCollector, stream.Transform);

  var Writable = function(source) {
    stream.Writable.call(this, {
      objectMode: true,
      highWaterMark: 16 // arbitrary backlog sizing
    });

    this._write = function(tile, _, callback) {
      // TODO tilelive-streaming should do this
      tile.sourceURI = source.sourceURI;

      tile.pipe(new TileCollector().on("finish", callback));
    };
  };

  util.inherits(Writable, stream.Writable);

  var sourceTarget = new stream.Writable({
    objectMode: true
  });

  sourceTarget._write = function(source, _, callback) {
    // source.getInfo(function(err, info) {
    //   // i need the URI
    //   console.log("source URI:", source.sourceURI);
    //   console.log(arguments);
    // });

    source.pipe(new Writable(source));

    return callback();
  };

  tilelive.pipe(sourceTarget);


  app.listen(process.env.PORT || opts.port, function() {
    console.log("Listening at http://%s:%d/", this.address().address, this.address().port);

    return callback();
  });
};
