#!/usr/bin/env node
"use strict";

// increase the libuv threadpool size to 1.5x the number of logical CPUs.
process.env.UV_THREADPOOL_SIZE =
  process.env.UV_THREADPOOL_SIZE ||
  Math.ceil(Math.max(4, require("node:os").cpus().length * 1.5));

const fs = require("node:fs");
const path = require("node:path");

const cors = require("cors");
const express = require("express");
const morgan = require("morgan");
const responseTime = require("response-time");

const serve = require("./lib/app");
const tessera = require("./lib/index");

const debug = require("debug")("tessera");

module.exports = (opts, callback) => {
  const app = express().disable("x-powered-by");
  const tilelive = require("tilelive-cache")(require("@mapbox/tilelive"), {
    size: process.env.CACHE_SIZE || opts.cacheSize,
    sources: process.env.SOURCE_CACHE_SIZE || opts.sourceCacheSize,
  });

  callback = callback || (() => {});

  // load and register tilelive modules
  require("tilelive-modules/loader")(tilelive, opts);

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

    tilelive.load(opts.uri, (err, src) => {
      if (err) {
        throw err;
      }

      return tessera.getInfo(src, (err, info) => {
        if (err) {
          debug(err.stack);
          return;
        }

        if (info.format === "pbf") {
          app.use("/_", serve(tilelive, `xray+${opts.uri}`));
          app.use("/_", express.static(path.join(__dirname, "public")));
          app.use(
            "/_",
            express.static(path.join(__dirname, "bower_components")),
          );
        }
      });
    });
  }

  if (opts.config) {
    const configPath = path.resolve(opts.config);
    const stats = fs.statSync(configPath);
    let config = {};

    if (stats.isFile()) {
      config = require(configPath);
    } else if (stats.isDirectory()) {
      config = fs
        .readdirSync(configPath)
        .filter((filename) => path.extname(filename) === ".json")
        .reduce((config, filename) => {
          const localConfig = require(path.join(configPath, filename));

          return Object.keys(localConfig).reduce((config, k) => {
            config[k] = localConfig[k];

            return config;
          }, config);
        }, config);
    }

    Object.keys(config).forEach((prefix) => {
      if (config[prefix].timing !== false) {
        app.use(prefix, responseTime());
      }

      if (config[prefix].cors !== false) {
        app.use(prefix, cors());
      }

      app.use(prefix, express.static(path.join(__dirname, "public")));
      app.use(prefix, express.static(path.join(__dirname, "bower_components")));
      app.use(prefix, serve(tilelive, config[prefix]));

      // config[prefix] is a string
      let source = config[prefix];

      if (source.source != null) {
        // actually, it's an object
        source = source.source;
      }

      tilelive.load(source, (err, src) => {
        if (err) {
          throw err;
        }

        return tessera.getInfo(src, (err, info) => {
          if (err) {
            debug(err.stack);
            return;
          }

          if (info.format === "pbf") {
            app.use(
              `${prefix}/_`,
              serve(tilelive, `xray+${config[prefix].source}`),
            );
            app.use(
              `${prefix}/_`,
              express.static(path.join(__dirname, "public")),
            );
            app.use(
              `${prefix}/_`,
              express.static(path.join(__dirname, "bower_components")),
            );
          }
        });
      });
    });
  }

  const handler =
    process.env.SOCKET || opts.socket || process.env.PORT || opts.port;
  const server = app.listen(handler, process.env.HOST || opts.bind, () => {
    let endpoint;
    if (opts.socket) {
      endpoint = opts.socket;

      // allow the socket to be accessed by other users/groups
      fs.chmodSync(opts.socket, "1766");
    } else if (process.env.SOCKET) {
      endpoint = process.env.SOCKET;

      // allow the socket to be accessed by other users/groups
      fs.chmodSync(opts.socket, "1766");
    } else {
      const addr = server.address();
      endpoint = `http://${addr.address}:${addr.port}`;
    }
    console.log("Listening at %s", endpoint);

    return callback();
  });

  process.on("SIGINT", () => {
    console.warn("Caught SIGINT, terminating");
    server.close();
    process.exit();
  });
};
