"use strict";

var path = require("path"),
    util = require("util");

var express = require("express"),
    mercator = new (require("sphericalmercator"))();

module.exports = function(tilelive, uri) {
  var app = express();

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

      info.name = info.name || "Untitled";
      info.center = info.center || [-122.4440, 37.7908, 12];
      info.bounds = info.bounds || [-180, -85.0511, 180, 85.0511];
      info.format = info.format || (info.vector_layers ? "pbf" : null);
      info.minzoom = Math.max(0, info.minzoom | 0);
      info.maxzoom = info.maxzoom || Infinity;

      return callback(null, info);
    });
  };

  // TODO a more complete implementation of this exists...somewhere
  var getExtension = function(format) {
    // trim PNG variant info
    switch ((format || "").replace(/^(png).*/, "$1")) {
    case "png":
      return "png";

    case "pbf":
      return "vector.pbf";

    default:
      return format;
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

        console.log(info.scheme);
        // y = (1 << z) - 1 - y;

        // validate format / extension
        var ext = getExtension(info.format);

        if (ext !== req.params.format) {
          console.warn("Invalid format '%s', expected '%s'", req.params.format, ext);
          return res.send(404);
        }

        // validate zoom
        if (z < info.minzoom || z > info.maxzoom) {
          console.warn("Invalid zoom:", z);
          return res.send(404);
        }

        // validate coords against bounds
        var xyz = mercator.xyz(info.bounds, z);

        if (x < xyz.minX ||
            x > xyz.maxX ||
            y < xyz.minY ||
            y > xyz.maxY) {
          console.warn("Invalid coordinates: %d,%d relative to bounds:", x, y, xyz);
          return res.send(404);
        }

        return source.getTile(z, x, y, function(err, data, headers) {
          if (err) {
            console.warn(err.stack);
            return res.send(404);
            // return next(err);
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

        var uri = util.format("http://%s%s{z}/{x}/{y}.%s",
                               req.headers.host,
                               path.normalize(path.dirname(req.originalUrl) + "/"),
                               getExtension(info.format));

        info.tiles = [uri];
        info.tilejson = "2.0.0";

        return res.send(info);
      });
    });
  });

  return app;
};
