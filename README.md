# tessera

tessera is a [tilelive](https://github.com/mapbox/tilelive.js)-based tile
server.

Using the power of the tilelive ecosystem, it is capable of serving and
rendering tiles from many sources.

## Installation

```bash
npm install -g tessera
npm install -g <tilelive modules...>
```

## How to Use

tessera does not install tilelive providers itself; it is up to you to
(globally) install any modules that you wish to use (along with dependencies
present in your configuration; e.g. a TM2 style that loads data tiles from an
HTTP source).

Modules listed in
[tilelive-modules](https://github.com/mojodna/tilelive-modules) will be
auto-detected and loaded if they have been installed. For other modules, you
will need to `--require` them explicitly.

To serve up an [MBTiles](https://www.mapbox.com/developers/mbtiles/) archive
using [node-mbtiles](https://github.com/mapbox/node-mbtiles):

```bash
npm install -g mbtiles
tessera mbtiles://./whatever.mbtiles
```

_Note_: If you want to be able to preview vector tiles (MVT/PBF), you need these 2 modules:

```bash
npm install -g tilelive-vector tilelive-xray
```

To serve up a [TileMill](https://www.mapbox.com/tilemill/) (or
[Carto](https://github.com/mapbox/carto)) project using
[tilelive-carto](https://github.com/mojodna/tilelive-carto):

```bash
tessera carto+file://./project.mml
```

To serve up a [TM2](https://github.com/mapbox/tm2) style using
[tilelive-tmstyle](https://github.com/mojodna/tilelive-tmstyle):

```bash
tessera tmstyle://./
```

**Note**: non-`mapbox:` sources may need to have their protocols changed;
tessera requires that styles using HTTP-accessible data have `tilejson+http:`
as their protocol where TM2 expects `http:`.  See
[mojodna/tilelive-http#2](https://github.com/mojodna/tilelive-http/issues/2)
for more information.

To serve up a [TM2](https://github.com/mapbox/tm2) data source (it will use
`data.yml` as the source of truth) using
[tilelive-tmsource](https://github.com/mojodna/tilelive-tmsource):

```bash
tessera tmsource://./
```

To serve up a bare [Mapnik](https://github.com/mapnik/mapnik) stylesheet using
[tilelive-mapnik](https://github.com/mapbox/tilelive-mapnik):

```bash
tessera mapnik://./stylesheet.xml
```

To serve up files from a filesystem using
[tilelive-file](https://github.com/mapbox/tilelive-file):

```bash
tessera file://./tiles
```

To proxy HTTP-accessible tiles using
[tilelive-http](https://github.com/mojodna/tilelive-http):

```bash
tessera http://tile.stamen.com/toner/{z}/{x}/{y}.png
```

To proxy Mapbox-hosted tiles using
[tilelive-mapbox](https://github.com/mojodna/tilelive-mapbox):

```bash
tessera mapbox:///mapbox.mapbox-streets-v4
```

To proxy tiles with available
[TileJSON](https://www.mapbox.com/developers/tilejson/) using
[node-tilejson](https://github.com/mapbox/node-tilejson):

```bash
tessera tilejson+http://a.tiles.mapbox.com/v3/mapbox.mapbox-streets-v4.json
```

A TileJSON endpoint is available at
[localhost:8080/index.json](http://localhost:8080/index.json) with various bits
of metadata about the tiles being served.

## Configuration

Tessera has command-line options:

```bash
Usage: node tessera.js [uri] [options]

uri     tilelive URI to serve

Options:
   -C SIZE, --cache-size SIZE          Set the cache size (in MB)  [10]
   -c CONFIG, --config CONFIG          Provide a configuration file or directory
   -p PORT, --port PORT                Set the HTTP Port  [8080]
   -b HOST, --bind HOST                Set interface to listen on [0.0.0.0]
   -m, --multiprocess                  Start multiple processes  [false]
   -P, --processes                     Number of processes to start  [8]
   -r MODULE, --require MODULE         Require a specific tilelive module
   -S SIZE, --source-cache-size SIZE   Set the source cache size (in # of sources)  [10]
   -s SOCKET, --socket SOCKET          Listen on unix socket
   -v, --version                       Show version info

A tilelive URI or configuration file is required.
```

Commonly used options can be set using the `TESSERA_OPTS` environment variable.

This is what a configuration file looks like:

```javascript
{
  "/": {
    "source": "mbtiles:///Users/seth/archive.mbtiles",
    "cors": false,
    "timing": false
  },
  "/a": {
    "source": "mbtiles:///Users/seth/archive.mbtiles",
    "headers": {
      "Cache-Control": "public,max-age={{#tileJSON}}86400{{/tileJSON}}{{#tile}}3600{{/tile}}",
      "Surrogate-Control": "max-age=86400",
      "Surrogate-Keys": "{{#tile}}z{{zoom}} x{{x}} y{{y}}{{/tile}}"
    }
  },
  "/b": "mbtiles:///Users/seth/archive.mbtiles"
}
```

Header values are treated as
[Mustache](http://mustache.github.io/mustache.5.html) (technically
[Handlebars](http://handlebarsjs.com/)) templates, which allow them to vary by
request. The following variables are available to header templates:

* `tile.retina` - for retina (`@2x`) requests
* `tile.zoom` - zoom (for tile requests)
* `tile.x` - row (for tile requests)
* `tile.y` - column (for tile requests)
* `tile.format` - requested format
* `tileJSON` - for TileJSON requests
* `200` - HTTP 200
* `404` - HTTP 404
* `invalidFormat` - the requested format did not match what the tilelive source
  provides
* `invalidZoom` - the requested zoom is outside the available range
* `invalidCoordinates` - the requested coordinates are outside the available bounds

CORS and `X-Response-Time` can be disabled per-style:

```javascript
{
  "cors": false,
  "timing": false
}
```

(Note that enabling for `/` will propagate to all subdirectories, as they act
as middleware.)

Custom tile paths may be set per-style:

```javascript
{
  "tilePath": "/{z}/{x}/{y}-debug.{format}"
}
```

The default tile path is:

```javascript
{
  "tilePath": "/{z}/{x}/{y}.{format}"
}
```

(_Note_: the final `.` will be expanded to transparently support retina
requests (effectively `/{z}/{x}/{y}@2x.{format}`).)

If `--config` is set to a directory, all JSON files in it will be concatenated
together to form a single configuration. In the case of repeated options or
paths, the last one will win (where files are loaded in alphabetical order).

For sources that render rasters from vector tiles at and have a max zoom level
that is higher than the max zoom level of the vector tiles it can be helpful to
have additional variables available for headers that represent the vector tile
that a raster was rendered from. This can be enabled with an additional source
option in the configuration file:

```javascript
{
  "sourceMaxZoom": 14
}
```

This will make three additional values available for header templates:
* `tile.sourceZoom`
* `tile.sourceX`
* `tile.sourceY`

For example: if `sourceMaxZoom` is set to 14, a request for tile 16/100/100
will set the following variables:

* `tile.sourceZoom = 14`
* `tile.sourceX = 25`
* `tile.sourceY = 25`

## Multiprocess mode

By default, tessera runs in a single process (modules, e.g. Mapnik, may use
multiple threads). For sources that are CPU intensive  to render, or when
running on servers with large numbers of CPU cores there can be significant
performance improvements from running in multiprocess mode. When multiprocess
mode is enabled with the `--multiprocess` option multiple processes will be
started, with each process running a single thread, enabling many requests to be
served at once. The number of processes to be started defaults to the number of
CPU cores on the host, but can be configured with the `--processes` option.

## Environment Variables

* `PORT` - Port to bind to. Defaults to `8080`.
* `HOST` - Interface to listen on. Defaults to `0.0.0.0` (all).
* `CACHE_SIZE` - Cache size (in MB) for
  [tilelive-cache](https://github.com/mojodna/tilelive-cache). Defaults to
  10MB.
* `SOCKET` - Unix socket to bind to. Optional.
* `SOURCE_CACHE_SIZE` - Number of sources to cache (for
  [tilelive-cache](https://github.com/mojodna/tilelive-cache)). Defaults to 6.
  *NOTE*: implicit retina versions count as an extra source.
* `TESSERA_OPTS` - Additional command-line arguments.
