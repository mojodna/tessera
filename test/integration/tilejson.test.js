import request from "supertest";
import { describe, expect, it } from "vitest";

const { createApp } = require("../helpers/app-factory");

async function getTileJSON(uri, options) {
  const app = createApp(uri, options);
  const res = await request(app).get("/index.json");
  expect(res.status).toBe(200);

  // Validate common TileJSON fields
  expect(res.body.tilejson).toBe("2.0.0");
  expect(res.body.scheme).toBe("xyz");

  return res.body;
}

describe("TileJSON endpoint", () => {
  describe("Structure validation", () => {
    it("returns valid TileJSON at /index.json", async () => {
      const body = await getTileJSON("mock-png://test");

      expect(Array.isArray(body.tiles)).toBe(true);
      expect(body.tiles.length).toBeGreaterThan(0);
    });
  });

  describe("Source metadata", () => {
    it("includes bounds from source", async () => {
      const body = await getTileJSON("mock-png://test?bounds=-10,-10,10,10");

      expect(body.bounds).toEqual([-10, -10, 10, 10]);
    });

    it("includes minzoom and maxzoom from source", async () => {
      const body = await getTileJSON("mock-png://test?minzoom=2&maxzoom=12");

      expect(body.minzoom).toBe(2);
      expect(body.maxzoom).toBe(12);
    });
  });

  describe("Format-specific fields", () => {
    it("tile URLs use correct format extension", async () => {
      const body = await getTileJSON("mock-png://test");

      expect(body.tiles[0]).toMatch(/\.png$/);
    });

    it("includes vector_layers for PBF sources", async () => {
      const body = await getTileJSON("mock-pbf://test");

      expect(body.format).toBe("pbf");
      expect(Array.isArray(body.vector_layers)).toBe(true);
    });
  });

  describe("Infrastructure errors", () => {
    it("returns 500 when source fails to load", async () => {
      const app = createApp("invalid://nonexistent");
      const res = await request(app).get("/index.json");

      expect(res.status).toBe(500);
    });

    it("returns 500 when source.getInfo fails during TileJSON request", async () => {
      const app = createApp(
        "mock-erroring://test?errorOn=getInfo&message=Metadata%20unavailable",
      );
      const res = await request(app).get("/index.json");

      expect(res.status).toBe(500);
    });
  });
});
