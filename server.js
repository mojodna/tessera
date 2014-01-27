#!/usr/bin/env node
"use strict";

// increase the libuv threadpool size to 1.5x the number of logical CPUs.
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || Math.ceil(Math.max(4, require('os').cpus().length * 1.5));

var cors = require("cors"),
    express = require("express"),
    npm = require("npm"),
    tilelive = require("tilelive-cache")(require("tilelive"), {
      size: process.env.CACHE_SIZE || 10
    });

npm.load(function() {
  // TODO tilelive-* should have tilelive as a peer dependency
  // TODO mbtiles won't be detected
  // TODO need a way to distinguish between calling to register and using
  // registerProtocols
  var extensions = {};

  npm.commands.ls(null, true, function(err, packages) {
    var names = Object.keys(packages.dependencies)
      .filter(function(name) {
        // TODO check for a tilelive key
        return name.match(/^tilelive-/);
      })
      .map(function(name) {
        extensions[name] = true;
        return name;
      });

    console.log();
    console.log("local dependencies:");
    console.log(names.join("\n"));

    npm.config.set("global", true);
    npm.commands.ls(null, true, function(err, packages) {
      npm.config.set("global", false);

      var names = Object.keys(packages.dependencies)
        .filter(function(name) {
          return name.match(/^tilelive-/);
        })
        .map(function(name) {
          extensions[name] = true;
          return name;
        });

      // TODO don't re-require modules that have already been found

      console.log();
      console.log("global dependencies:");
      console.log(names.join("\n"));

      console.log();
      console.log("to load:");
      console.log(Object.keys(extensions).join("\n"));
    });
  });
});

try { require("tilejson").registerProtocols(tilelive); } catch (e) {}
try { require("tilelive-bridge").registerProtocols(tilelive); } catch (e) {}
try { require("tilelive-http").registerProtocols(tilelive); } catch (e) {}
try { require("tilelive-mapbox")(tilelive); } catch (e) {}
try { require("tilelive-mapnik").registerProtocols(tilelive); } catch (e) {}
try { require("tilelive-tmsource")(tilelive); } catch (e) {}
try { require("tilelive-tmstyle")(tilelive); } catch (e) {}
try { require("mbtiles").registerProtocols(tilelive); } catch (e) {}

var serve = require("./lib/app");

var app = express();

app.disable("x-powered-by");

app.use(express.responseTime());
app.use(cors());

app.configure("development", function() {
  app.use(express.logger());
});

var uri = process.argv.slice(2).pop() || "tmstyle://./project.yml";

app.use(express.static(__dirname + "/public"));
app.use(serve(tilelive, uri));

app.listen(process.env.PORT || 8080, function() {
  console.log("Listening at http://%s:%d/", this.address().address, this.address().port);
});
