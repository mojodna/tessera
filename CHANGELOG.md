# Changes

## v0.12.0 - 9/14/17

* Multi-process mode (@JesseCrocker)

## v0.11.2 - 6/14/17

* Update `tilelive-modules` for compatibility with `@mapbox`-scoped modules.

## v0.11.1 - 6/14/17

* Fix dependency `require`s.

## v0.11.0 - 6/13/17

* Upgrade dependencies.

## v0.10.1 - 4/20/17

* Support for string URIs as values in config files.

## v0.10.0 - 3/15/17

* Adding `sourceMaxZoom` to the config makes `tile.sourceZoom`, `tile.sourceX`,
  and `tile.sourceY` available to header templates (useful for rasters rendered
  from vector tiles)
* Add unix socket support (@stepankuzmin)
* Respect `X-Forwarded-Proto` when generating TileJSON (@bwhtmn)
* Allow PBFs to be served (and previewed) when using config files (@ianhuynh)
* Always return 404s for absent data, even for PBFs

## v0.9.0 - 4/5/16

* Use active protocol when generating `tiles` elements in TileJSON (@ramunasd)
* Return 200 responses for empty vector tiles (@ramunasd)

## v0.8.1 - 3/11/16

* Correctly handle "Tile does not exist" errors (@JesseCrocker)
* Use `Infinity` as the default max zoom
* Add `?retina=false` to the URL to disable retina tiles

## v0.8.0 - 2/16/16

* Use shared loader from `tilelive-modules`
* Upgrade to `tilelive-cache@0.6.1` w/ improved source closing
* Upgrade to `handlebars@^4.0.5`

## v0.7.1 - 2/5/16

* Add missing `LICENSE`
* Re-publish (`server.js` was missing in v0.7.0)

## v0.7.0 - 2/3/16

* `conf.d` style configuration when `--config` points to a directory

## v0.6.1 - 2/3/16

* Don't return upstream headers with 404s

## v0.6.0 - 12/9/15

* Support for @3x tiles
* Don't treat `getInfo` errors as fatal on startup
* Upgrade dependencies
* Disable `tilelive-mapnik`'s internal cache
* Static map endpoint

## v0.5.3 - 5/4/15

* Resolved missing `debug` dependency

## v0.5.2 - 5/4/15

* PBF sources that don't provide headers default to reporting `gzip` encoding
  to match current `tilelive-bridge`, etc. behavior
* Relax expectations for empty tiles
* Improve error logging when loading tilelive modules
* Use `debug` for warning messages about invalid requests

## v0.5.1 - 11/23/14

* Update dependencies
* Drop `bower` as a runtime dependency
* Use `cachecache` to avoid requiring unnecessary rendering / fetching
* Update `tilelive-cache` with support for cache-skipping and fixes to
  `tilelive-mapnik` drain errors
* `options` is now optional in `modules.js`
* Remove verification of `Content-MD5` headers--that responsibility falls to
  individual providers.

## v0.5.0 - unpublished

## v0.4.4 - 7/16/14

* Run bower non-interactively

## v0.4.3 - 7/11/14

* Don't coerce non-string tilelive URIs to strings, as `url.format` is lossy

## v0.4.2 - 7/11/14

* Don't assume that tilelive URIs will always be strings
* Add `--source-cache-size` option

## v0.4.1 - 7/10/14

* Fix relative links for nested files
* Use `?retina=true` in the preview to force retina tiles

## v0.4.0 - 7/7/14

* Use Nominatim for geocoding
* Use bower for client deps vs. bundling them
* Verify and return `Content-MD5` headers
* Pass `tileSize` query option for sources like `tilelive-mapnik`
* Optional dependencies dropped in favor of detecting / explicitly requiring
  installed modules. To add auto-detected modules, check out
  [tilelive-modules](https://github.com/mojodna/tilelive-modules).
* Added support for the `TESSERA_OPTS` environment variable
* Added (repeatable) `--require` option

## v0.3.0 - 5/27/14

* Use the xray view by default for PBF sources specified on the command line
* Updated `tilelive-tmstyle` to 0.1.2 with scale-dependent output
* Misc. dependency updates
* Updated `tilelive-cache` to 0.1.1

## v0.2.1 - 5/15/14

* Updated dependencies to help with installation problems

## v0.2.0 - 4/28/14

* Added support for configuration files
* Added command-line options
* Default headers are provided for PBFs (@hallahan)
* Simplify format handling: `<tile>.vector.pbf` is now `<tile>.pbf`
* Upgraded Express to 4.0
* Export `lib/app.js` as `require("tessera")`
* Support Carto (TileMill 1) styles via
  [tilelive-carto](https://github.com/mojodna/tilelive-carto)

## v0.1.2 - 4/1/14

* Add minimal-ui for Mobile Safari

## v0.1.1 - 4/1/14

* Retina tile content matches non-retina tiles
* Match tilelive expectations for missing tiles (real errors will now be treated as
  500s, not 404s)

## v0.1.0 - 3/13/14

* Initial public version
