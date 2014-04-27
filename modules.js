"use strict";

module.exports = function(tilelive) {
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

  return tilelive;
};
