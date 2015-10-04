"use strict";

var crypto = require("crypto"),
    path = require("path"),
    url = require("url");

var cachecache = require("cachecache"),
    clone = require("clone"),
    debug = require("debug"),
    express = require("express"),
    handlebars = require("handlebars"),
    mercator = new (require("sphericalmercator"))();

var tessera = require("./index");

debug = debug("tessera");

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
    .replace(/\.(?!.*\.)/, ":scale(@[23]x)?.")
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

  app.get(tilePattern, function(req, res, next) {
    var z = req.params.z | 0,
        x = req.params.x | 0,
        y = req.params.y | 0,
        scale = (req.params.scale || "@1x").slice(1, 2),
        sourceURI = sourceURIs[scale],
        params = {
          tile: {
            zoom: z,
            x: x,
            y: y,
            format: req.params.format,
            retina: scale > 1,
            scale: scale
          }
        };


    return tilelive.load(sourceURI, function(err, source) {
      if (err) {
        return next(err);
      }

      return tessera.getInfo(source, function(err, info) {
        if (err) {
          return next(err);
        }

        // validate format / extension
        var ext = getExtension(info.format);

        if (ext !== req.params.format && ("grid.json" == req.params.format && !source["getGrid"]) ) {
          debug("Invalid format '%s', expected '%s'", req.params.format, ext);
          res.set(populateHeaders({}, params, { 404: true, invalidFormat: true }));
          return res.status(404).end();
        }

        // validate zoom
        if (z < info.minzoom || z > info.maxzoom) {
          debug("Invalid zoom:", z);
          res.set(populateHeaders({}, params, { 404: true, invalidZoom: true }));
          return res.status(404).end();
        }

        // validate coords against bounds
        var xyz = mercator.xyz(info.bounds, z);

        if (x < xyz.minX ||
            x > xyz.maxX ||
            y < xyz.minY ||
            y > xyz.maxY) {
          debug("Invalid coordinates: %d,%d relative to bounds:", x, y, xyz);
          res.set(populateHeaders({}, params, { 404: true, invalidCoordinates: true }));
          return res.status(404).end();
        }

        var getfn = source.getTile;
        if ("grid.json" == req.params.format) {
          getfn = source.getGrid;
        }

        return getfn(z, x, y, function(err, data, headers) {
          headers = normalizeHeaders(headers || {});

          if (err) {
            if (err.message.match(/Tile|Grid does not exist/)) {
              res.set(populateHeaders(headers, params, { 404: true }));
              return res.status(404).end();
            }

            return next(err);
          }

          if (data === null || data === undefined) {
            res.set(populateHeaders(headers, params, { 404: true }));
            return res.status(404).end();
          }

          // This happens if we called getTile and got an object back.
          // We need to serialize it to JSON before returning the response
          if (headers["content-type"] && headers["content-type"] == "application/json") {
            data = JSON.stringify(data);
          }

          if (!headers["content-md5"]) {
            headers["content-md5"] = md5sum(data).toString("base64");
          }

          // work-around for PBF MBTiles that don't contain appropriate headers
          if (ext === "pbf") {
            headers["content-type"] = headers["content-type"] || "application/x-protobuf";
            headers["content-encoding"] = headers["content-encoding"] || "gzip";
          }

          res.set(populateHeaders(headers, params, { 200: true }));
          return res.send(data);
        });
      });
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
          path.normalize(path.dirname(req.originalUrl) +
                         tilePath.replace("{format}",
                                          getExtension(info.format)));

        info.tiles = [uri];
        info.tilejson = "2.0.0";
        if (source["getGrid"]) {
            var griduri = "http://" + req.headers.host +
              path.normalize(path.dirname(req.originalUrl) +
                             tilePath.replace("{format}",
                                              "grid.json"));
            info.grids = [griduri];
        }

        res.set(populateHeaders({}, params, { 200: true }));
        return res.send(info);
      });
    });
  });

  return app;
};
