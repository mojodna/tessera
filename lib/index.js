"use strict";

module.exports.getInfo = (source, callback) => {
  return source.getInfo((err, _info) => {
    if (err) {
      return callback(err);
    }

    const info = {};

    Object.keys(_info).forEach((key) => {
      info[key] = _info[key];
    });

    info.name = info.name || "Untitled";
    info.center = info.center || [-122.444, 37.7908, 12];
    info.bounds = info.bounds || [-180, -85.0511, 180, 85.0511];
    info.format = info.format || "png";
    info.minzoom = Math.max(0, info.minzoom | 0);
    info.maxzoom = info.maxzoom || Infinity;

    if (info.vector_layers) {
      info.format = "pbf";
    }

    return callback(null, info);
  });
};
