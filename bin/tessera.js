#!/usr/bin/env node

"use strict";

const { program } = require("commander");

program
  .option("-C, --cache-size <SIZE>", "Set the cache size (in MB)", parseInt, 10)
  .option("-c, --config <CONFIG>", "Provide a configuration file or directory")
  .option("-p, --port <PORT>", "Set the HTTP port", parseInt, 8080)
  .option("-b, --bind <HOST>", "Set the interface to listen on", "0.0.0.0")
  .option("-m, --multiprocess", "Start multiple processes", false)
  .option(
    "-P, --processes <PROCESSES>",
    "Number of processes to start",
    parseInt,
    require("os").cpus().length
  )
  .option(
    "-r, --require <MODULE>",
    "Require a specific tilelive module",
    (value, previous) => previous.concat([value]),
    []
  )
  .option(
    "-S, --source-cache-size <SIZE>",
    "Set the source cache size (in # of sources)",
    parseInt,
    10
  )
  .option("-s, --socket <SOCKET>", "Listen on a Unix socket")
  .version(`tessera v${require("../package.json").version}`)
  .argument("[uri]", "tilelive URI to serve")
  .addHelpText("after", "\nA tilelive URI or configuration file is required.");

const argv = (process.env.TESSERA_OPTS || "")
  .split(" ")
  .concat(process.argv.slice(2))
  .filter((x) => !!x);

const opts = program.parse(argv, { from: "user" }).opts();

if (!opts.config && program.args.length === 1) {
  // compatibility with nomnom's argument handling
  opts.uri = program.args[0];
  opts._ = program.args;
} else if (!opts.config) {
  program.help();
}

if (opts.multiprocess) {
  const cluster = require("cluster");

  if (cluster.isMaster) {
    console.log("Launching in multiprocess mode with " + opts.processes + " workers.");

    for (let i = 0; i < opts.processes; i++) {
      cluster.fork();
    }
  } else {
    return require("../server")(opts);
  }
} else {
  return require("../server")(opts);
}
