import { describe, it, expect } from "vitest";
const url = require("url");
const tessera = require("../../lib/index");
const { MockPNGSource, MockErroringSource } = require("../fixtures/mock-sources");

describe("tessera.getInfo", () => {
  it("returns error when source.getInfo fails", () => {
    return new Promise((resolve) => {
      const uri = url.parse("mock-erroring://test?errorOn=getInfo&message=Source%20failed", true);
      new MockErroringSource(uri, (err, source) => {
        expect(err).toBeNull();
        tessera.getInfo(source, (err, info) => {
          expect(err).toBeDefined();
          expect(err.message).toBe("Source failed");
          expect(info).toBeUndefined();
          resolve();
        });
      });
    });
  });

  it("handles missing info fields with defaults", () => {
    return new Promise((resolve) => {
      // Create a minimal mock source
      const minimalSource = {
        getInfo: (callback) => {
          setImmediate(() => callback(null, {}));
        }
      };

      tessera.getInfo(minimalSource, (err, info) => {
        expect(err).toBeNull();
        expect(info.name).toBe("Untitled");
        expect(info.center).toEqual([-122.4440, 37.7908, 12]);
        expect(info.bounds).toEqual([-180, -85.0511, 180, 85.0511]);
        expect(info.format).toBe("png");
        expect(info.minzoom).toBe(0);
        expect(info.maxzoom).toBe(Infinity);
        resolve();
      });
    });
  });

  it("sets format to pbf when vector_layers present", () => {
    return new Promise((resolve) => {
      // Create a source with vector_layers but format: "png"
      const vectorSource = {
        getInfo: (callback) => {
          setImmediate(() => callback(null, {
            format: "png",
            vector_layers: [{ id: "test" }]
          }));
        }
      };

      tessera.getInfo(vectorSource, (err, info) => {
        expect(err).toBeNull();
        expect(info.format).toBe("pbf");
        expect(info.vector_layers).toBeDefined();
        resolve();
      });
    });
  });

  it("preserves existing info properties", () => {
    return new Promise((resolve) => {
      const uri = url.parse("mock-png://test?name=Test%20Source", true);
      new MockPNGSource(uri, (err, source) => {
        expect(err).toBeNull();
        tessera.getInfo(source, (err, info) => {
          expect(err).toBeNull();
          expect(info.name).toBe("Test Source");
          expect(info.format).toBe("png");
          expect(info.minzoom).toBe(0);
          expect(info.maxzoom).toBe(20);
          resolve();
        });
      });
    });
  });

  it("ensures minzoom is at least 0", () => {
    return new Promise((resolve) => {
      const negativeZoomSource = {
        getInfo: (callback) => {
          setImmediate(() => callback(null, { minzoom: -5 }));
        }
      };

      tessera.getInfo(negativeZoomSource, (err, info) => {
        expect(err).toBeNull();
        expect(info.minzoom).toBe(0);
        resolve();
      });
    });
  });
});
