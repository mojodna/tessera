"use strict";

const tileliveCache = require("tilelive-cache");
const tilelive = require("@mapbox/tilelive");
const { MockPNGSource, MockPBFSource, MockErrorSource, MockNullSource, MockErroringSource } = require("../fixtures/mock-sources");
const serve = require("../../lib/app");

const CACHE_SIZE = 10;
const CACHE_SOURCES = 6;

const mockSources = [MockPNGSource, MockPBFSource, MockErrorSource, MockNullSource, MockErroringSource];

function registerMockProtocols() {
  mockSources.forEach(source => source.registerProtocols(tilelive));
}

registerMockProtocols();

const cachedTilelive = tileliveCache(tilelive, {
  size: CACHE_SIZE,
  sources: CACHE_SOURCES
});

function createApp(uri, options) {
  let appOptions = uri;

  // Handle options object
  if (typeof options !== "undefined") {
    appOptions = options;
    appOptions.source = uri;
  }

  return serve(cachedTilelive, appOptions);
}

module.exports = { createApp };
