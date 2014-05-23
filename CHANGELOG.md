# Changes

## vNext

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
