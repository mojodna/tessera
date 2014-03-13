# tessera

tessera is a [tilelive](https://github.com/mapbox/tilelive.js)-based tile
server.

Using the power of the tilelive ecosystem, it is capable of serving and
rendering tiles from many source.

## Installation

```bash
npm install -g tessera
```

## How to Use

To serve up an [MBTiles](https://www.mapbox.com/developers/mbtiles/) archive
using [node-mbtiles](https://github.com/mapbox/node-mbtiles):

```bash
tessera mbtiles://./whatever.mbtiles
```

To serve up a [TM2](https://github.com/mapbox/tm2) style (it will use
`project.yml` as the source of truth) using
[tilelive-tmstyle](https://github.com/mojodna/tilelive-tmstyle):

```bash
tessera tmstyle://./
```

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

## Environment Variables

* `PORT` - Port to bind to. Defaults to `8080`.
* `CACHE_SIZE` - Cache size (in MB) for
  [tilelive-cache](https://github.com/mojodna/tilelive-cache)
