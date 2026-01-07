"use strict";

const crypto = require("node:crypto");
const path = require("node:path");
const url = require("node:url");

const cachecache = require("cachecache");
const clone = require("clone");
const express = require("express");
const handlebars = require("handlebars");
const { SphericalMercator } = require("@mapbox/sphericalmercator");

const mercator = new SphericalMercator();

const tessera = require("./index");

const debug = require("debug")("tessera");

// TODO a more complete implementation of this exists...somewhere
const getExtension = (format) => {
  // trim PNG variant info
  switch ((format || "").replace(/^(png).*/, "$1")) {
    case "png":
      return "png";

    default:
      return format;
  }
};

const normalizeHeaders = (headers) => {
  const _headers = {};

  Object.keys(headers).forEach((x) => {
    _headers[x.toLowerCase()] = headers[x];
  });

  return _headers;
};

const md5sum = (data) => {
  const hash = crypto.createHash("md5");
  hash.update(data);
  return hash.digest();
};

module.exports = (tilelive, options) => {
  const app = express().disable("x-powered-by").enable("trust proxy");
  const templates = {};
  let uri = options;
  let tilePath = "/{z}/{x}/{y}.{format}";
  let sourceMaxZoom = null;

  app.use(cachecache());

  if (typeof options === "object") {
    uri = options.source;
    tilePath = options.tilePath || tilePath;

    if (options.sourceMaxZoom) {
      sourceMaxZoom = parseInt(options.sourceMaxZoom, 10);
    }

    Object.keys(options.headers || {}).forEach((name) => {
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

  // Express 5 dropped inline regex support in routes; use simple params
  // Scale (@2x, @3x) is captured as part of y and parsed in the handler
  const tilePattern = tilePath
    .replace("{z}", ":z")
    .replace("{x}", ":x")
    .replace("{y}", ":y")
    .replace("{format}", ":format");

  const populateHeaders = (headers, params, extras) => {
    Object.keys(extras || {}).forEach((k) => {
      params[k] = extras[k];
    });

    Object.keys(templates).forEach((name) => {
      const val = templates[name](params);

      if (val) {
        headers[name.toLowerCase()] = val;
      }
    });

    return headers;
  };

  // warm the cache
  tilelive.load(uri);

  const sourceURIs = {
    1: uri,
  };

  [2, 3].forEach((scale) => {
    const retinaURI = clone(uri);

    retinaURI.query.scale = scale;
    // explicitly tell tilelive-mapnik to use larger tiles
    retinaURI.query.tileSize = scale * 256;

    sourceURIs[scale] = retinaURI;
  });

  const getTile = (z, x, y, scale, format, callback) => {
    const sourceURI = sourceURIs[scale];
    const params = {
      tile: {
        zoom: z,
        x: x,
        y: y,
        format: format,
        retina: scale > 1,
        scale: scale,
      },
    };

    // Additional params for vector tile based sources
    if (sourceMaxZoom != null) {
      params.tile.sourceZoom = z;
      params.tile.sourceX = x;
      params.tile.sourceY = y;

      while (params.tile.sourceZoom > sourceMaxZoom) {
        params.tile.sourceZoom--;
        params.tile.sourceX = Math.floor(params.tile.sourceX / 2);
        params.tile.sourceY = Math.floor(params.tile.sourceY / 2);
      }
    }

    return tilelive.load(sourceURI, (err, source) => {
      if (err) {
        return callback(err);
      }

      return tessera.getInfo(source, (err, info) => {
        if (err) {
          return callback(err);
        }

        // validate format / extension
        const ext = getExtension(info.format);

        if (ext !== format) {
          debug("Invalid format '%s', expected '%s'", format, ext);
          return callback(
            null,
            null,
            populateHeaders({}, params, { 404: true, invalidFormat: true }),
          );
        }

        // validate zoom
        if (z < info.minzoom || z > info.maxzoom) {
          debug("Invalid zoom:", z);
          return callback(
            null,
            null,
            populateHeaders({}, params, { 404: true, invalidZoom: true }),
          );
        }

        // validate coords against bounds
        const xyz = mercator.xyz(info.bounds, z);

        if (x < xyz.minX || x > xyz.maxX || y < xyz.minY || y > xyz.maxY) {
          debug("Invalid coordinates: %d,%d relative to bounds:", x, y, xyz);
          return callback(
            null,
            null,
            populateHeaders({}, params, {
              404: true,
              invalidCoordinates: true,
            }),
          );
        }

        return source.getTile(z, x, y, (err, data, headers) => {
          headers = normalizeHeaders(headers || {});

          if (err) {
            if (err.message.match(/(Tile|Grid) does not exist/)) {
              return callback(
                null,
                null,
                populateHeaders(headers, params, { 404: true }),
              );
            }

            return callback(err);
          }

          if (data === null || data === undefined) {
            return callback(
              null,
              null,
              populateHeaders(headers, params, { 404: true }),
            );
          }

          if (!headers["content-md5"]) {
            headers["content-md5"] = md5sum(data).toString("base64");
          }

          // work-around for PBF MBTiles that don't contain appropriate headers
          if (ext === "pbf") {
            headers["content-type"] =
              headers["content-type"] || "application/x-protobuf";
            headers["content-encoding"] = headers["content-encoding"] || "gzip";
          }

          return callback(
            null,
            data,
            populateHeaders(headers, params, { 200: true }),
          );
        });
      });
    });
  };

  app.get(tilePattern, (req, res, next) => {
    const z = req.params.z | 0;
    const x = req.params.x | 0;
    const yParam = req.params.y;
    const scaleMatch = yParam.match(/@([23])x$/);
    const y = parseInt(yParam, 10);
    const scale = scaleMatch ? parseInt(scaleMatch[1], 10) : 1;
    const format = req.params.format;
    return getTile(
      z,
      x,
      y,
      scale,
      format,
      (err, data, headers) => {
        if (err) {
          return next(err);
        }
        if (data == null) {
          res.set(headers);
          return res.status(404).send("Not found");
        } else {
          res.set(headers);
          return res.status(200).send(data);
        }
      },
      res,
      next,
    );
  });

  app.get("/index.json", (req, res, next) => {
    const params = {
      tileJSON: true,
    };

    return tilelive.load(uri, (err, source) => {
      if (err) {
        return next(err);
      }

      return tessera.getInfo(source, (err, info) => {
        if (err) {
          return next(err);
        }

        const protocol = (req.headers["x-forwarded-proto"] || "").match(
          /^[a-z]+$/,
        )
          ? req.headers["x-forwarded-proto"]
          : req.protocol;
        const host = req.headers["x-forwarded-host"] || req.headers.host;
        const tileUri = `${protocol}://${host}${(path.dirname(req.originalUrl) + tilePath.replace("{format}", getExtension(info.format))).replace(/\/+/g, "/")}`;

        info.tiles = [tileUri];
        info.tilejson = "2.0.0";
        info.scheme = "xyz";

        res.set(populateHeaders({}, params, { 200: true }));
        return res.send(info);
      });
    });
  });

  return app;
};
