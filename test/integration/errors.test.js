import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../helpers/app-factory";
import { expectNotFound } from "../helpers/assertions";

describe("Error handling", () => {
  it("returns 404 when source.getTile returns 'Tile does not exist' error", async () => {
    await expectNotFound("mock-error://test", "/5/10/12.png");
  });

  it("returns 404 when source.getTile returns 'Grid does not exist' error", async () => {
    await expectNotFound(
      "mock-error://test?message=Grid%20does%20not%20exist",
      "/5/10/12.png",
    );
  });

  it("returns 404 for coordinates outside bounds", async () => {
    await expectNotFound("mock-png://test?bounds=0,0,1,1", "/0/1/1.png");
  });

  it("returns 404 when getTile returns null", async () => {
    await expectNotFound("mock-null://test", "/5/10/12.png");
  });

  it("returns 500 for non-standard getTile errors", async () => {
    const app = createApp(
      "mock-erroring://test?errorOn=getTile&message=Database%20connection%20failed",
    );
    const res = await request(app).get("/0/0/0.png");

    expect(res.status).toBe(500);
  });
});
