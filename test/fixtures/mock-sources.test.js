import { describe, it, expect } from "vitest";
const url = require("url");
const { MockPNGSource, MockPBFSource, MockErrorSource, MockNullSource, MockErroringSource } = require("./mock-sources");

describe("MockPNGSource", () => {
  it("returns PNG tile data", () => {
    return new Promise((resolve) => {
      const uri = url.parse("mock-png://test", true);
      new MockPNGSource(uri, (err, source) => {
        expect(err).toBeNull();
        source.getTile(0, 0, 0, (err, data, headers) => {
          expect(err).toBeNull();
          expect(Buffer.isBuffer(data)).toBe(true);
          expect(headers["Content-Type"]).toBe("image/png");
          resolve();
        });
      });
    });
  });
});

describe("MockPBFSource", () => {
  it("returns PBF tile data", () => {
    return new Promise((resolve) => {
      const uri = url.parse("mock-pbf://test", true);
      new MockPBFSource(uri, (err, source) => {
        expect(err).toBeNull();
        source.getTile(0, 0, 0, (err, data, headers) => {
          expect(err).toBeNull();
          expect(Buffer.isBuffer(data)).toBe(true);
          expect(headers["Content-Type"]).toBe("application/x-protobuf");
          expect(headers["Content-Encoding"]).toBe("gzip");
          resolve();
        });
      });
    });
  });

  it("includes vector_layers in getInfo", () => {
    return new Promise((resolve) => {
      const uri = url.parse("mock-pbf://test", true);
      new MockPBFSource(uri, (err, source) => {
        expect(err).toBeNull();
        source.getInfo((err, info) => {
          expect(err).toBeNull();
          expect(info.format).toBe("pbf");
          expect(info.vector_layers).toBeDefined();
          expect(Array.isArray(info.vector_layers)).toBe(true);
          resolve();
        });
      });
    });
  });
});

describe("MockErrorSource", () => {
  it("throws error on getTile", () => {
    return new Promise((resolve) => {
      const uri = url.parse("mock-error://test", true);
      new MockErrorSource(uri, (err, source) => {
        expect(err).toBeNull();
        source.getTile(0, 0, 0, (err, data, headers) => {
          expect(err).toBeDefined();
          expect(err.message).toBe("Tile does not exist");
          resolve();
        });
      });
    });
  });

  it("supports custom error messages", () => {
    return new Promise((resolve) => {
      const uri = url.parse("mock-error://test?message=Custom%20error", true);
      new MockErrorSource(uri, (err, source) => {
        expect(err).toBeNull();
        source.getTile(0, 0, 0, (err, data, headers) => {
          expect(err).toBeDefined();
          expect(err.message).toBe("Custom error");
          resolve();
        });
      });
    });
  });
});

describe("MockNullSource", () => {
  it("returns null tile data", () => {
    return new Promise((resolve) => {
      const uri = url.parse("mock-null://test", true);
      new MockNullSource(uri, (err, source) => {
        expect(err).toBeNull();
        source.getTile(0, 0, 0, (err, data) => {
          expect(err).toBeNull();
          expect(data).toBeNull();
          resolve();
        });
      });
    });
  });
});

describe("MockErroringSource", () => {
  it("throws error on getInfo when errorOn=getInfo", () => {
    return new Promise((resolve) => {
      const uri = url.parse("mock-erroring://test?errorOn=getInfo", true);
      new MockErroringSource(uri, (err, source) => {
        expect(err).toBeNull();
        source.getInfo((err, info) => {
          expect(err).toBeDefined();
          expect(err.message).toBe("Mock error");
          resolve();
        });
      });
    });
  });

  it("throws error on getTile when errorOn=getTile", () => {
    return new Promise((resolve) => {
      const uri = url.parse("mock-erroring://test?errorOn=getTile", true);
      new MockErroringSource(uri, (err, source) => {
        expect(err).toBeNull();
        source.getTile(0, 0, 0, (err, data) => {
          expect(err).toBeDefined();
          expect(err.message).toBe("Mock error");
          resolve();
        });
      });
    });
  });

  it("supports custom error messages", () => {
    return new Promise((resolve) => {
      const uri = url.parse("mock-erroring://test?errorOn=getInfo&message=Custom%20getInfo%20error", true);
      new MockErroringSource(uri, (err, source) => {
        expect(err).toBeNull();
        source.getInfo((err, info) => {
          expect(err).toBeDefined();
          expect(err.message).toBe("Custom getInfo error");
          resolve();
        });
      });
    });
  });

  it("succeeds on getTile when errorOn=getInfo", () => {
    return new Promise((resolve) => {
      const uri = url.parse("mock-erroring://test?errorOn=getInfo", true);
      new MockErroringSource(uri, (err, source) => {
        expect(err).toBeNull();
        source.getTile(0, 0, 0, (err, data, headers) => {
          expect(err).toBeNull();
          expect(Buffer.isBuffer(data)).toBe(true);
          expect(headers["Content-Type"]).toBe("image/png");
          resolve();
        });
      });
    });
  });

  it("succeeds on getInfo when errorOn=getTile", () => {
    return new Promise((resolve) => {
      const uri = url.parse("mock-erroring://test?errorOn=getTile", true);
      new MockErroringSource(uri, (err, source) => {
        expect(err).toBeNull();
        source.getInfo((err, info) => {
          expect(err).toBeNull();
          expect(info).toBeDefined();
          expect(info.format).toBe("png");
          resolve();
        });
      });
    });
  });
});
