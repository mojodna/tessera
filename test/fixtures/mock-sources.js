"use strict";

const zlib = require("zlib");

// 1x1 transparent PNG
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

// Minimal valid MVT (empty vector tile)
const EMPTY_MVT = zlib.gzipSync(Buffer.from([0x1a, 0x00]));

// Web Mercator bounds
const WEB_MERCATOR_BOUNDS = [-180, -85.0511, 180, 85.0511];
const DEFAULT_CENTER = [-122.4440, 37.7908, 12];

function parseCommonOptions(options, defaults) {
  return {
    minzoom: options.minzoom ? parseInt(options.minzoom) : defaults.minzoom,
    maxzoom: options.maxzoom ? parseInt(options.maxzoom) : defaults.maxzoom,
    bounds: options.bounds
      ? options.bounds.split(",").map(parseFloat)
      : WEB_MERCATOR_BOUNDS
  };
}

class MockPNGSource {
  constructor(uri, callback) {
    this.uri = uri;
    this.options = uri.query || {};
    setImmediate(() => callback(null, this));
  }

  getInfo(callback) {
    const commonOpts = parseCommonOptions(this.options, { minzoom: 0, maxzoom: 20 });
    const info = {
      format: "png",
      ...commonOpts,
      name: this.options.name || "Mock PNG Source",
      center: DEFAULT_CENTER
    };
    setImmediate(() => callback(null, info));
  }

  getTile(z, x, y, callback) {
    setImmediate(() =>
      callback(null, TINY_PNG, {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600"
      })
    );
  }
}

MockPNGSource.registerProtocols = (tilelive) => {
  tilelive.protocols["mock-png:"] = MockPNGSource;
};

class MockPBFSource {
  constructor(uri, callback) {
    this.uri = uri;
    this.options = uri.query || {};
    setImmediate(() => callback(null, this));
  }

  getInfo(callback) {
    const commonOpts = parseCommonOptions(this.options, { minzoom: 0, maxzoom: 14 });
    const info = {
      format: "pbf",
      ...commonOpts,
      name: this.options.name || "Mock PBF Source",
      center: DEFAULT_CENTER,
      vector_layers: [
        {
          id: "test_layer",
          description: "Test layer",
          fields: {}
        }
      ]
    };
    setImmediate(() => callback(null, info));
  }

  getTile(z, x, y, callback) {
    setImmediate(() =>
      callback(null, EMPTY_MVT, {
        "Content-Type": "application/x-protobuf",
        "Content-Encoding": "gzip"
      })
    );
  }
}

MockPBFSource.registerProtocols = (tilelive) => {
  tilelive.protocols["mock-pbf:"] = MockPBFSource;
};

class MockErrorSource {
  constructor(uri, callback) {
    this.uri = uri;
    this.options = uri.query || {};
    this.errorMessage = this.options.message || "Tile does not exist";
    setImmediate(() => callback(null, this));
  }

  getInfo(callback) {
    const commonOpts = parseCommonOptions(this.options, { minzoom: 0, maxzoom: 20 });
    const info = {
      format: "png",
      ...commonOpts,
      name: "Mock Error Source",
      center: DEFAULT_CENTER
    };
    setImmediate(() => callback(null, info));
  }

  getTile(z, x, y, callback) {
    setImmediate(() => callback(new Error(this.errorMessage)));
  }
}

MockErrorSource.registerProtocols = (tilelive) => {
  tilelive.protocols["mock-error:"] = MockErrorSource;
};

class MockNullSource {
  constructor(uri, callback) {
    this.uri = uri;
    this.options = uri.query || {};
    setImmediate(() => callback(null, this));
  }

  getInfo(callback) {
    const commonOpts = parseCommonOptions(this.options, { minzoom: 0, maxzoom: 20 });
    const info = {
      format: "png",
      ...commonOpts,
      name: "Mock Null Source",
      center: DEFAULT_CENTER
    };
    setImmediate(() => callback(null, info));
  }

  getTile(z, x, y, callback) {
    setImmediate(() => callback(null, null));
  }
}

MockNullSource.registerProtocols = (tilelive) => {
  tilelive.protocols["mock-null:"] = MockNullSource;
};

class MockErroringSource {
  constructor(uri, callback) {
    this.uri = uri;
    this.options = uri.query || {};
    this.errorOn = this.options.errorOn || "getTile";
    this.errorMessage = this.options.message || "Mock error";
    setImmediate(() => callback(null, this));
  }

  getInfo(callback) {
    if (this.errorOn === "getInfo") {
      setImmediate(() => callback(new Error(this.errorMessage)));
      return;
    }

    const commonOpts = parseCommonOptions(this.options, { minzoom: 0, maxzoom: 20 });
    const info = {
      format: "png",
      ...commonOpts,
      name: "Mock Erroring Source",
      center: DEFAULT_CENTER
    };
    setImmediate(() => callback(null, info));
  }

  getTile(z, x, y, callback) {
    if (this.errorOn === "getTile") {
      setImmediate(() => callback(new Error(this.errorMessage)));
      return;
    }

    setImmediate(() =>
      callback(null, TINY_PNG, {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600"
      })
    );
  }
}

MockErroringSource.registerProtocols = (tilelive) => {
  tilelive.protocols["mock-erroring:"] = MockErroringSource;
};

module.exports = { MockPNGSource, MockPBFSource, MockErrorSource, MockNullSource, MockErroringSource };
