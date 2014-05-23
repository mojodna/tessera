"use strict";

module.exports.getInfo = function(source, callback) {
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
    info.format = info.format || "png";
    info.minzoom = Math.max(0, info.minzoom | 0);
    info.maxzoom = info.maxzoom || Infinity;

    return callback(null, info);
  });
};
