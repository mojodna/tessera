#!/usr/bin/env node

"use strict";

process.on("uncaughtException", function(err) {
  console.error(err.stack);
  process.exit(1);
});

var nomnom = require("nomnom")
  .options({
    "uri": {
      position: 0,
      help: "tilelive URI to serve"
    },
    "cacheSize": {
      full: "cache-size",
      abbr: "C",
      metavar: "SIZE",
      help: "Set the cache size (in MB)",
      default: 10
    },
    "config": {
      abbr: "c",
      metavar: "CONFIG",
      help: "Provide a configuration file"
    },
    "port": {
      abbr: "p",
      metavar: "PORT",
      help: "Set the HTTP Port",
      default: 8080
    },
    "version": {
      abbr: "v",
      flag: true,
      help: "Show version info",
      callback: function() {
        return "tessera v" + require("../package.json").version;
      }
    }
  })
  .help("A tilelive URI or configuration file is required.");

var opts = nomnom.parse();

switch (true) {
case opts.version:
  return process.exit();

case !opts.uri && !opts.config:
  return nomnom.print(nomnom.getUsage());

default:
  return require("../server")(opts);
}
