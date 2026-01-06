import { describe, it, expect } from "vitest";
import request from "supertest";
const { createApp } = require("./app-factory");

describe("App factory", () => {
  it("creates app from URI string", async () => {
    const app = createApp("mock-png://test");
    const res = await request(app).get("/index.json");
    expect(res.status).toBe(200);
  });

  it("creates app from options object", async () => {
    const app = createApp("mock-png://test", {
      headers: {
        "X-Custom": "test-value"
      }
    });
    const res = await request(app).get("/index.json");
    expect(res.status).toBe(200);
  });
});
