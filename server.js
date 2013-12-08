#!/usr/bin/env node
"use strict";

// increase the libuv threadpool size to 1.5x the number of logical CPUs.
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || Math.ceil(Math.max(4, require('os').cpus().length * 1.5));

var fs = require("fs"),
    path = require("path"),
    url = require("url");

var _ = require("underscore"),
    async = require("async"),
    carto = require("carto"),
    express = require("express"),
    mbtiles = require("mbtiles"),
    tilelive = require("tilelive-cache")(require("tilelive"), {
      size: process.env.CACHE_SIZE || 10
    }),
    Vector = require("tilelive-vector")(tilelive),
    yaml = require("js-yaml");

require("tilelive-mapbox")(tilelive);
mbtiles.registerProtocols(tilelive);

var app = express();

// TODO CORS
app.use(express.static(__dirname + "/public"));

app.configure("development", function() {
  app.use(express.logger());
});

var defaults = {
  name:'',
  description:'',
  attribution:'',
  source:'',
  styles:{},
  mtime: Date.now(),
  center:[0,0,3],
  bounds:[-180,-85.0511,180,85.0511],
  minzoom:0,
  maxzoom:22,
  scale:1,
  format:'png8:m=h',
  template:'',
  interactivity_layer:'',
  _properties: {},
  _prefs: {
    saveCenter: true
  }
};

var tm = {};

// Named projections.
tm.srs = {
  'WGS84': '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs',
  '900913': '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0.0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs +over'
};

// Return an object with sorted keys, ignoring case.
tm.sortkeys = function(obj) {
  try {
    return obj.map(tm.sortkeys);
  } catch(e) {};
  try {
    return Object.keys(obj).sort(function(a, b) {
      a = a.toLowerCase();
      b = b.toLowerCase();
      if (a === 'id') return -1;
      if (b === 'id') return 1;
      if (a > b) return 1;
      if (a < b) return -1;
      return 0;
    }).reduce(function(memo, key) {
      memo[key] = tm.sortkeys(obj[key]);
      return memo;
    }, {});
  } catch(e) { return obj };
};

var style = function(uri, callback) {
  uri = url.parse(uri || "");

  return style.info(function(err, data) {
    if (err) {
      return callback(err);
    }

    return style.toXML(data, function(err, xml) {
      if (err) {
        return callback(err);
      }

      var opts = {
        xml: xml,
        base: process.cwd()
      };

      return new Vector(opts, callback);
    });
  });
};


style.info = function(callback) {
  return fs.readFile(path.join(process.cwd(), "project.yml"), "utf8", function(err, data) {
    if (err) {
      return callback(err);
    }

    try {
      data = yaml.load(data);
    } catch (e) {
      return callback(e);
    }

    return async.map(data.styles, function(filename, next) {
      return fs.readFile(path.join(process.cwd(), filename), "utf8", function(err, mss) {
        return next(null, [filename, mss]);
      });
    }, function(err, styles) {
      if (err) {
        return callback(err);
      }

      data.styles = {};

      styles.forEach(function(x) {
        data.styles[x[0]] = x[1];
      });

      Object.keys(defaults).forEach(function(k) {
        data[k] = data[k] || defaults[k];
      });

      return callback(null, data);
    });
  });
};

// Render data to XML.
style.toXML = function(data, callback) {
  return tilelive.load(data.source, function(err, backend) {
    if (err) return callback(err);

    return backend.getInfo(function(err, info) {
      if (err) return callback(err);

      backend.data = info;

      // Include params to be written to XML.
      var opts = [
        'name',
        'description',
        'attribution',
        'bounds',
        'center',
        'format',
        'minzoom',
        'maxzoom',
        'scale',
        'source',
        'template',
        'interactivity_layer',
        'legend'
      ].reduce(function(memo, key) {
        if (key in data) {
          switch(key) {
          // @TODO this is backwards because carto currently only allows the
          // TM1 abstrated representation of these params. Add support in
          // carto for "literal" definition of these fields.
          case 'interactivity_layer':
            if (!backend.data) break;
            if (!backend.data.vector_layers) break;
            var fields = data.template.match(/{{([a-z0-9\-_]+)}}/ig);
            if (!fields) break;
            memo['interactivity'] = {
                layer: data[key],
                fields: fields.map(function(t) { return t.replace(/[{}]+/g,''); })
            };
            break;
          default:
            memo[key] = data[key];
            break;
          }
        }
        return memo;
      }, {});

      // Set projection for Mapnik.
      opts.srs = tm.srs['900913'];

      // Convert datatiles sources to mml layers.
      opts.Layer = _(backend.data.vector_layers).map(function(layer) {
        return {
          id: layer.id,
          name: layer.id,
          // Styles can provide a hidden _properties key with
          // layer-specific property overrides. Current workaround to layer
          // properties that could (?) eventually be controlled via carto.
          properties: (data._properties && data._properties[layer.id]) || {},
          srs: tm.srs['900913']
        };
      });

      opts.Stylesheet = _(data.styles).map(function(style,basename) {
        return {
          id: basename,
          data: style
        };
      });

      new carto.Renderer().render(tm.sortkeys(opts), callback);
    });
  });
};

style.registerProtocols = function(tilelive) {
  tilelive.protocols["tm2:"] = this;
};

style.registerProtocols(tilelive);

// warm the cache
tilelive.load("tm2://./project.yml");

app.get("/:z(\\d+)/:x(\\d+)/:y(\\d+).:format([\\w\\.]+)", function(req, res, next) {
  var z = +req.params.z,
      x = +req.params.x,
      y = +req.params.y;

  return tilelive.load("tm2://./project.yml", function(err, source) {
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
