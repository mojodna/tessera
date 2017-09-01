#!/usr/bin/env node

"use strict";

var nomnom = require("nomnom")
  .options({
    uri: {
      position: 0,
      help: "tilelive URI to serve"
    },
    cacheSize: {
      full: "cache-size",
      abbr: "C",
      metavar: "SIZE",
      help: "Set the cache size (in MB)",
      default: 10
    },
    config: {
      abbr: "c",
      metavar: "CONFIG",
      help: "Provide a configuration file or directory"
    },
    port: {
      abbr: "p",
      metavar: "PORT",
      help: "Set the HTTP Port",
      default: 8080
    },
    bind: {
      abbr: "b",
      metavar: "HOST",
      help: "Set interface to listen on",
      default: "0.0.0.0"
    },
    cluster: {
      full: "cluster",
      flag: true,
      metavar: "CLUSTER",
      default: false,
      help: "Start 1 thread per CPU"
    },
    require: {
      abbr: "r",
      metavar: "MODULE",
      help: "Require a specific tilelive module",
      list: true
    },
    sourceCacheSize: {
      full: "source-cache-size",
      abbr: "S",
      metavar: "SIZE",
      help: "Set the source cache size (in # of sources)",
      default: 10
    },
    socket: {
      full: "socket",
      abbr: "s",
      metavar: "SOCKET",
      help: "Listen on unix socket"
    },
    version: {
      abbr: "v",
      flag: true,
      help: "Show version info",
      callback: function() {
        return "tessera v" + require("../package.json").version;
      }
    }
  })
  .help("A tilelive URI or configuration file is required.");

var argv = (process.env.TESSERA_OPTS || "")
  .split(" ")
  .concat(process.argv.slice(2))
  .filter(function(x) {
    return !!x;
  });

var opts = nomnom.parse(argv);

if(opts.version) {
  return process.exit();
} else if(!opts.uri && !opts.config) {
  return nomnom.print(nomnom.getUsage());
} else if(opts.cluster) {
  console.log("Launching in cluster mode");
  var cluster = require('cluster');
  if (cluster.isMaster) {
    var cpuCount = require('os').cpus().length;
    for (var i = 0; i < cpuCount; i += 1) {
        cluster.fork();
    }
  } else {
    return require("../server")(opts);
  }
} else {
  return require("../server")(opts);
}
