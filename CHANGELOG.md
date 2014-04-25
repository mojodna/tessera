# Changes

## vNext

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
