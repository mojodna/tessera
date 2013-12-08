#!/usr/bin/env node
"use strict";

// increase the libuv threadpool size to 1.5x the number of logical CPUs.
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || Math.ceil(Math.max(4, require('os').cpus().length * 1.5));

var express = require("express"),
    tilelive = require("tilelive-cache")(require("tilelive"), {
      size: process.env.CACHE_SIZE || 10
    });

require("tilejson").registerProtocols(tilelive);
require("tilelive-bridge").registerProtocols(tilelive);
require("tilelive-mapbox")(tilelive);
require("tilelive-tmsource")(tilelive);
require("tilelive-tmstyle")(tilelive);
require("mbtiles").registerProtocols(tilelive);

var app = express();

// TODO CORS
app.use(express.static(__dirname + "/public"));

app.configure("development", function() {
  app.use(express.logger());
});

// warm the cache
tilelive.load("tmstyle://./project.yml");

app.get("/:z(\\d+)/:x(\\d+)/:y(\\d+).:format([\\w\\.]+)", function(req, res, next) {
  var z = +req.params.z,
      x = +req.params.x,
      y = +req.params.y;

  return tilelive.load("tmstyle://./project.yml", function(err, source) {
    if (err) {
      return next(err);
    }

    return source.getTile(z, x, y, function(err, data, headers) {
      if (err) {
        return next(err);
      }

      res.set(headers);
      return res.send(data);
    });
  });
});

app.listen(process.env.PORT || 8080, function() {
  console.log("Listening at http://%s:%d/", this.address().address, this.address().port);
});
