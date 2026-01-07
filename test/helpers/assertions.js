import request from "supertest";
import { expect } from "vitest";

const { createApp } = require("./app-factory");

async function expectNotFound(uri, path) {
  const app = createApp(uri);
  const res = await request(app).get(path);
  expect(res.status).toBe(404);
}

export { expectNotFound };
