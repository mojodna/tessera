import { describe, it } from "vitest";
import { testTileParsing } from "../helpers/test-utils";

describe("Tile coordinate parsing", () => {
  it("parses basic tile coordinates", async () => {
    await testTileParsing(
      "mock-png://test",
      "X-Parsed",
      "{{tile.zoom}}/{{tile.x}}/{{tile.y}}",
      "/10/512/384.png",
      "10/512/384",
    );
  });

  it("parses retina scale from URL", async () => {
    await testTileParsing(
      "mock-png://test",
      "X-Scale",
      "{{tile.scale}}",
      "/10/512/384@2x.png",
      "2",
    );
  });

  it("defaults to scale 1 when no scale specified", async () => {
    await testTileParsing(
      "mock-png://test",
      "X-Scale",
      "{{tile.scale}}",
      "/10/512/384.png",
      "1",
    );
  });

  it("extracts format from extension", async () => {
    await testTileParsing(
      "mock-pbf://test",
      "X-Format",
      "{{tile.format}}",
      "/10/512/384.pbf",
      "pbf",
    );
  });
});

describe("Tile parsing edge cases", () => {
  it("parses coordinates at zoom 0", async () => {
    await testTileParsing(
      "mock-png://test",
      "X-Coords",
      "{{tile.zoom}}/{{tile.x}}/{{tile.y}}",
      "/0/0/0.png",
      "0/0/0",
    );
  });

  it("parses coordinates at tile extent boundaries", async () => {
    await testTileParsing(
      "mock-png://test",
      "X-Coords",
      "{{tile.x}}/{{tile.y}}",
      "/10/1023/1023.png",
      "1023/1023",
    );
  });

  it("parses maxzoom tiles (z20)", async () => {
    await testTileParsing(
      "mock-png://test",
      "X-Zoom",
      "{{tile.zoom}}",
      "/20/524288/524288.png",
      "20",
    );
  });

  it("parses @3x retina tiles", async () => {
    await testTileParsing(
      "mock-png://test",
      "X-Scale",
      "{{tile.scale}}",
      "/10/512/384@3x.png",
      "3",
    );
  });

  it("parses large coordinate values", async () => {
    await testTileParsing(
      "mock-png://test",
      "X-Coords",
      "{{tile.x}}/{{tile.y}}",
      "/20/1048575/1048575.png",
      "1048575/1048575",
    );
  });
});
