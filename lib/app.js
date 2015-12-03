"use strict";

var crypto = require("crypto"),
    path = require("path"),
    url = require("url");

var abaculus = require("abaculus"),
    cachecache = require("cachecache"),
    clone = require("clone"),
    debug = require("debug"),
    express = require("express"),
    handlebars = require("handlebars"),
    mercator = new (require("sphericalmercator"))();

var tessera = require("./index");

debug = debug("tessera");

var FLOAT_PATTERN = "[+-]?(?:\\d+|\\d+\.?\\d+)";
var SCALE_PATTERN = "@[123]x";

// TODO a more complete implementation of this exists...somewhere
var getExtension = function(format) {
  // trim PNG variant info
  switch ((format || "").replace(/^(png).*/, "$1")) {
  case "png":
    return "png";

  default:
    return format;
  }
};

var getScale = function(scale) {
  return (scale || "@1x").slice(1, 2) | 0;
};

var normalizeHeaders = function(headers) {
  var _headers = {};

  Object.keys(headers).forEach(function(x) {
    _headers[x.toLowerCase()] = headers[x];
  });

  return _headers;
};

var md5sum = function(data) {
  var hash = crypto.createHash("md5");
  hash.update(data);
  return hash.digest();
};

module.exports = function(tilelive, options) {
  var app = express().disable("x-powered-by"),
      templates = {},
      uri = options,
      tilePath = "/{z}/{x}/{y}.{format}",
      tilePattern;

  app.use(cachecache());

  if (typeof options === "object") {
    uri = options.source;
    tilePath = options.tilePath || tilePath;

    Object.keys(options.headers || {}).forEach(function(name) {
      templates[name] = handlebars.compile(options.headers[name]);

      // attempt to parse so we can fail fast
      try {
        templates[name]();
      } catch (e) {
        console.error("'%s' header is invalid:", name);
        console.error(e.message);
        process.exit(1);
      }
    });
  }

  if (typeof uri === "string") {
    uri = url.parse(uri, true);
  } else {
    uri = clone(uri);
  }

  if (uri.protocol === "mapnik:") {
    // disable mapnik's internal cache
    uri.query.internal_cache = false;
  }

  tilePattern = tilePath
    .replace(/\.(?!.*\.)/, ":scale(" + SCALE_PATTERN + ")?.")
    .replace(/\./g, "\.")
    .replace("{z}", ":z(\\d+)")
    .replace("{x}", ":x(\\d+)")
    .replace("{y}", ":y(\\d+)")
    .replace("{format}", ":format([\\w\\.]+)");

  var populateHeaders = function(headers, params, extras) {
    Object.keys(extras || {}).forEach(function(k) {
      params[k] = extras[k];
    });

    Object.keys(templates).forEach(function(name) {
      var val = templates[name](params);

      if (val) {
        headers[name.toLowerCase()] = val;
      }
    });

    return headers;
  };

  // warm the cache
  tilelive.load(uri);

  var sourceURIs = {
    1: uri
  };

  [2, 3].forEach(function(scale) {
    var retinaURI = clone(uri);

    retinaURI.query.scale = scale;
    // explicitly tell tilelive-mapnik to use larger tiles
    retinaURI.query.tileSize = scale * 256;

    sourceURIs[scale] = retinaURI;
  });

  var getTile = function(z, x, y, scale, format, callback) {
    var sourceURI = sourceURIs[scale],
        params = {
          tile: {
            zoom: z,
            x: x,
            y: y,
            format: format,
            retina: scale > 1,
            scale: scale
          }
        };

    return tilelive.load(sourceURI, function(err, source) {
      if (err) {
        return callback(err);
      }

      return tessera.getInfo(source, function(err, info) {
        if (err) {
          return callback(err);
        }

        // validate format / extension
        var ext = getExtension(info.format);

        if (ext !== format) {
          debug("Invalid format '%s', expected '%s'", format, ext);
          return callback(null, null, populateHeaders({}, params, { 404: true, invalidFormat: true }));
        }

        // validate zoom
        if (z < info.minzoom || z > info.maxzoom) {
          debug("Invalid zoom:", z);
          return callback(null, null, populateHeaders({}, params, { 404: true, invalidZoom: true }));
        }

        // validate coords against bounds
        var xyz = mercator.xyz(info.bounds, z);

        if (x < xyz.minX ||
            x > xyz.maxX ||
            y < xyz.minY ||
            y > xyz.maxY) {
          debug("Invalid coordinates: %d,%d relative to bounds:", x, y, xyz);
          return callback(null, null, populateHeaders({}, params, { 404: true, invalidCoordinates: true }));
        }

        return source.getTile(z, x, y, function(err, data, headers) {
          headers = normalizeHeaders(headers || {});

          if (err) {
            if (err.message.match(/Tile|Grid does not exist/)) {
              return callback(null, null, populateHeaders(headers, params, { 404: true }));
            }

            return callback(err);
          }

          if (data === null || data === undefined) {
            return callback(null, null, populateHeaders(headers, params, { 404: true }));
          }

          if (!headers["content-md5"]) {
            headers["content-md5"] = md5sum(data).toString("base64");
          }

          // work-around for PBF MBTiles that don't contain appropriate headers
          if (ext === "pbf") {
            headers["content-type"] = headers["content-type"] || "application/x-protobuf";
            headers["content-encoding"] = headers["content-encoding"] || "gzip";
          }

          return callback(null, data, populateHeaders(headers, params, { 200: true }));
        });
      });
    });
  };

  app.get(tilePattern, function(req, res, next) {
    var z = req.params.z | 0,
        x = req.params.x | 0,
        y = req.params.y | 0,
        scale = getScale(req.params.scale),
        format = req.params.format;
    return getTile(z, x, y, scale, format, function(err, data, headers) {
        if (err && !err.status) {
          return next(err);
        }
        res.set(headers);
        res.status((err && err.status) || 200);
        return res.send((err && err.message) || data);
    }, res, next);
  });

  var staticPattern =
    "/static/:lon(" + FLOAT_PATTERN + "),:lat(" + FLOAT_PATTERN + "),:z(\\d+)/" +
    ":width(\\d+)x:height(\\d+):scale(" + SCALE_PATTERN + ")?\.:format([\\w\\.]+)";

  app.get(staticPattern, function(req, res, next) {
    var scale = getScale(req.params.scale),
        format = req.params.format,
        params = {
          zoom: req.params.z | 0,
          scale: scale,
          center: {
            x: +req.params.lon,
            y: +req.params.lat,
            w: req.params.width | 0,
            h: req.params.height | 0
          },
          format: format,
          getTile: function(z, x, y, callback) {
            return getTile(z, x, y, scale, format, function(err, data, headers) {
              if (!err && data == null) {
                err = new Error('Not found');
                err.status = 404;
              }
              callback(err, data, headers);
            });
          }
        };
    return abaculus(params, function(err, data, headers) {
      if (err && !err.status) {
        return next(err);
      }
      res.set(headers);
      res.status((err && err.status) || 200);
      return res.send((err && err.message) || data);
    });
  });

  app.get("/index.json", function(req, res, next) {
    var params = {
      tileJSON: true
    };

    return tilelive.load(uri, function(err, source) {
      if (err) {
        return next(err);
      }

      return tessera.getInfo(source, function(err, info) {
        if (err) {
          return next(err);
        }

        var uri = "http://" + req.headers.host +
          (path.dirname(req.originalUrl) +
                         tilePath.replace("{format}",
                                          getExtension(info.format))).replace(/\/+/g, "/");

        info.tiles = [uri];
        info.tilejson = "2.0.0";

        res.set(populateHeaders({}, params, { 200: true }));
        return res.send(info);
      });
    });
  });

  return app;
};
