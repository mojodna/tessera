#!/usr/bin/env node
"use strict";

// increase the libuv threadpool size to 1.5x the number of logical CPUs.
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || Math.ceil(Math.max(4, require('os').cpus().length * 1.5));

var util = require("util");

var cors = require("cors"),
    express = require("express"),
    mercator = new (require("sphericalmercator"))(),
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

var uri = process.argv.slice(2).pop() || "tmstyle://./project.yml";

console.log("URI:", uri);

// warm the cache
tilelive.load(uri);

var getInfo = function(source, callback) {
  return source.getInfo(function(err, _info) {
    if (err) {
      return callback(err);
    }

    var info = {};

    Object.keys(_info).forEach(function(key) {
      info[key] = _info[key];
    });

    if (info.vector_layers) {
      info.format = "pbf";
    }

    info.bounds = info.bounds || [-180, -85.0511, 180, 85.0511];
    info.format = info.format || (info.vector_layers ? "pbf" : null);
    info.minzoom = Math.max(0, info.minzoom | 0);
    info.maxzoom = Math.min(Infinity, info.maxzoom | 0);

    return callback(null, info);
  });
};

// TODO a more complete implementation of this exists...somewhere
var getExtension = function(format) {
  switch (format) {
  case /^png/:
    return "png";

  case "pbf":
    return "vector.pbf";

  default:
    throw new Error("Unrecognized format: " + format);
  }
};

// TODO grids
// TODO use TileJSON endpoint to initialize boilerplate viewer

app.get("/:z(\\d+)/:x(\\d+)/:y(\\d+).:format([\\w\\.]+)", function(req, res, next) {
  var z = req.params.z | 0,
      x = req.params.x | 0,
      y = req.params.y | 0;

  // yeah, this is unnecessary now (since uri doesn't change), but if this is
  // used to render multiple layers it becomes necessary
  return tilelive.load(uri, function(err, source) {
    if (err) {
      return next(err);
    }

    return getInfo(source, function(err, info) {
      if (err) {
        return next(err);
      }

      // validate format / extension
      if (getExtension(info.format) !== req.params.format) {
        return res.send(404);
      }

      // validate zoom
      if (z < info.minzoom || z > info.maxzoom) {
        return res.send(404);
      }

      // validate coords against bounds
      var xyz = mercator.xyz(info.bounds, z);

      if (x < xyz.minX ||
          x > xyz.maxX ||
          y < xyz.minY ||
          y > xyz.maxY) {
        return res.send(404);
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
});

app.get("/index.json", function(req, res, next) {
  return tilelive.load(uri, function(err, source) {
    if (err) {
      return next(err);
    }

    return getInfo(source, function(err, info) {
      if (err) {
        return next(err);
      }

      info.tiles = [util.format("http://%s/{z}/{x}/{y}.%s",
                                req.headers.host,
                                getExtension(info.format))];
      info.tilejson = "2.0.0";

      return res.send(info);
    });
  });
});

app.listen(process.env.PORT || 8080, function() {
  console.log("Listening at http://%s:%d/", this.address().address, this.address().port);
});
