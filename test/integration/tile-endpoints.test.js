import request from "supertest";
import { describe, expect, it } from "vitest";

const { createApp } = require("../helpers/app-factory");

describe("Tile endpoints", () => {
  describe("PNG tiles", () => {
    const app = createApp("mock-png://test");

    async function expectValidPngTile(path) {
      const res = await request(app).get(path);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/image\/png/);
      return res;
    }

    it("serves PNG tiles at /{z}/{x}/{y}.png", async () => {
      const res = await expectValidPngTile("/0/0/0.png");
      expect(Buffer.isBuffer(res.body)).toBe(true);
    });

    it("serves retina PNG tiles at /{z}/{x}/{y}@2x.png", async () => {
      await expectValidPngTile("/0/0/0@2x.png");
    });

    it("serves @3x scale tiles", async () => {
      await expectValidPngTile("/5/10/15@3x.png");
    });
  });

  describe("PBF tiles", () => {
    const app = createApp("mock-pbf://test");

    async function expectValidPbfTile(path) {
      const res = await request(app).get(path);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/application\/x-protobuf/);
      return res;
    }

    it("serves PBF tiles with correct headers", async () => {
      const res = await expectValidPbfTile("/0/0/0.pbf");
      expect(res.headers["content-encoding"]).toBe("gzip");
    });

    it("serves retina PBF tiles", async () => {
      await expectValidPbfTile("/5/10/12@2x.pbf");
    });
  });

  describe("Invalid requests", () => {
    const apps = {
      png: createApp("mock-png://test"),
      bounded: createApp("mock-png://test?bounds=-10,-10,10,10"),
      minZoom: createApp("mock-png://test?minzoom=5"),
      maxZoom: createApp("mock-png://test?maxzoom=10"),
    };

    it("returns 404 when requesting wrong format", async () => {
      const res = await request(apps.png).get("/0/0/0.pbf");
      expect(res.status).toBe(404);
    });

    it("returns 404 for coordinates outside bounds", async () => {
      const res = await request(apps.bounded).get("/5/50/50.png");
      expect(res.status).toBe(404);
    });

    it("returns 404 for zoom below minzoom", async () => {
      const res = await request(apps.minZoom).get("/2/1/1.png");
      expect(res.status).toBe(404);
    });

    it("returns 404 for zoom above maxzoom", async () => {
      const res = await request(apps.maxZoom).get("/15/100/100.png");
      expect(res.status).toBe(404);
    });
  });

  describe("Custom tile paths", () => {
    it("serves tiles at custom path pattern", async () => {
      const app = createApp("mock-png://test", {
        tilePath: "/tiles/{z}/{x}/{y}.{format}",
      });
      const res = await request(app).get("/tiles/0/0/0.png");

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/image\/png/);
    });

    it("custom tilePath appears in TileJSON", async () => {
      const app = createApp("mock-png://test", {
        tilePath: "/custom/{z}/{x}/{y}.{format}",
      });
      const res = await request(app).get("/index.json");

      expect(res.status).toBe(200);
      expect(res.body.tiles[0]).toMatch(/\/custom\/\{z\}\/\{x\}\/\{y\}\.png/);
    });
  });

  describe("Infrastructure errors", () => {
    it("returns 500 when source fails to load for tile request", async () => {
      const app = createApp("invalid://nonexistent");
      const res = await request(app).get("/0/0/0.png");

      expect(res.status).toBe(500);
    });

    it("returns 500 when source.getInfo fails during tile request", async () => {
      const app = createApp(
        "mock-erroring://test?errorOn=getInfo&message=Metadata%20unavailable",
      );
      const res = await request(app).get("/0/0/0.png");

      expect(res.status).toBe(500);
    });
  });
});
