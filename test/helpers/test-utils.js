import request from "supertest";
import { expect } from "vitest";

const { createApp } = require("./app-factory");

export async function testHeaderTemplate(
  headerName,
  templateValue,
  tilePath,
  expectedValue,
  expectedStatus = 200,
) {
  const app = createApp("mock-png://test", {
    headers: {
      [headerName]: templateValue,
    },
  });
  const res = await request(app).get(tilePath);

  expect(res.status).toBe(expectedStatus);
  expect(res.headers[headerName.toLowerCase()]).toBe(expectedValue);
}

export async function testSourceMaxZoom(tilePath, expectedHeaders) {
  const app = createApp("mock-pbf://test", {
    sourceMaxZoom: 10,
    headers: {
      "X-Source-Zoom": "{{tile.sourceZoom}}",
      "X-Source-Coords": "{{tile.sourceX}},{{tile.sourceY}}",
    },
  });
  const res = await request(app).get(tilePath);

  expect(res.status).toBe(200);
  Object.entries(expectedHeaders).forEach(([headerName, expectedValue]) => {
    expect(res.headers[headerName]).toBe(expectedValue);
  });
}

export async function testTileParsing(
  sourceUri,
  headerName,
  templateValue,
  tilePath,
  expectedValue,
  expectedStatus = 200,
) {
  const app = createApp(sourceUri, {
    headers: {
      [headerName]: templateValue,
    },
  });
  const res = await request(app).get(tilePath);

  expect(res.status).toBe(expectedStatus);
  expect(res.headers[headerName.toLowerCase()]).toBe(expectedValue);
}
