#!/usr/bin/env node
"use strict";

// increase the libuv threadpool size to 1.5x the number of logical CPUs.
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || Math.ceil(Math.max(4, require('os').cpus().length * 1.5));

var cors = require("cors"),
    express = require("express"),
    tilelive = require("tilelive-cache")(require("tilelive"), {
      size: process.env.CACHE_SIZE || 10
    });

try { require("tilejson").registerProtocols(tilelive); } catch (e) {}
try { require("tilelive-bridge").registerProtocols(tilelive); } catch (e) {}
try { require("tilelive-http").registerProtocols(tilelive); } catch (e) {}
try { require("tilelive-mapbox")(tilelive); } catch (e) {}
try { require("tilelive-mapnik").registerProtocols(tilelive); } catch (e) {}
try { require("tilelive-tmsource")(tilelive); } catch (e) {}
try { require("tilelive-tmstyle")(tilelive); } catch (e) {}
try { require("mbtiles").registerProtocols(tilelive); } catch (e) {}

var app = express();

app.disable("x-powered-by");

app.use(express.responseTime());
app.use(cors());
app.use(express.static(__dirname + "/public"));

app.configure("development", function() {
  app.use(express.logger());
});

// warm the cache
tilelive.load("tmstyle://./project.yml");

app.get("/:z(\\d+)/:x(\\d+)/:y(\\d+).:format([\\w\\.]+)", function(req, res, next) {
  var z = req.params.z | 0,
      x = req.params.x | 0,
      y = req.params.y | 0;

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
