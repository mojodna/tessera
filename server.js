#!/usr/bin/env node
"use strict";

// increase the libuv threadpool size to 1.5x the number of logical CPUs.
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || Math.ceil(Math.max(4, require('os').cpus().length * 1.5));

var cors = require("cors"),
    express = require("express"),
    morgan = require("morgan"),
    responseTime = require("response-time"),
    tilelive = require("tilelive-cache")(require("tilelive"), {
      size: process.env.CACHE_SIZE || 10
    });

try { require("tilejson").registerProtocols(tilelive); } catch (e) {}
try { require("tilelive-bridge").registerProtocols(tilelive); } catch (e) {}
try { require("tilelive-carto")(tilelive); } catch (e) {}
try { require("tilelive-file").registerProtocols(tilelive); } catch (e) {}
try { require("tilelive-http").registerProtocols(tilelive); } catch (e) {}
try { require("tilelive-mapbox")(tilelive); } catch (e) {}
try { require("tilelive-mapnik").registerProtocols(tilelive); } catch (e) {}
try { require("tilelive-tmsource")(tilelive); } catch (e) {}
try { require("tilelive-tmstyle")(tilelive); } catch (e) {}
try { require("mbtiles").registerProtocols(tilelive); } catch (e) {}

var serve = require("./lib/app");

var app = express();

app.disable("x-powered-by");

app.use(responseTime());
app.use(cors());

if (process.env.NODE_ENV !== "production") {
  app.use(morgan('dev'));
}

var uri = process.argv.slice(2).pop() || "tmstyle://./project.yml";

app.use(express.static(__dirname + "/public"));
app.use(serve(tilelive, uri));

app.listen(process.env.PORT || 8080, function() {
  console.log("Listening at http://%s:%d/", this.address().address, this.address().port);
});
