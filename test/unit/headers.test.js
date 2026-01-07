import { describe, it } from "vitest";
import { testHeaderTemplate, testSourceMaxZoom } from "../helpers/test-utils";

describe("Header templates", () => {
  it("substitutes {{zoom}} variable", async () => {
    await testHeaderTemplate(
      "X-Tile-Zoom",
      "{{tile.zoom}}",
      "/5/10/12.png",
      "5",
    );
  });

  it("substitutes {{x}} and {{y}} variables", async () => {
    await testHeaderTemplate(
      "X-Tile-Coords",
      "{{tile.x}},{{tile.y}}",
      "/5/10/12.png",
      "10,12",
    );
  });

  it("substitutes {{format}} variable", async () => {
    await testHeaderTemplate(
      "X-Tile-Format",
      "{{tile.format}}",
      "/5/10/12.png",
      "png",
    );
  });

  it("substitutes {{retina}} variable for @2x tiles", async () => {
    await testHeaderTemplate(
      "X-Tile-Retina",
      "{{tile.retina}}",
      "/5/10/12@2x.png",
      "true",
    );
  });

  it("substitutes {{scale}} variable", async () => {
    await testHeaderTemplate(
      "X-Tile-Scale",
      "{{tile.scale}}",
      "/5/10/12@3x.png",
      "3",
    );
  });
});

describe("Header template conditionals", () => {
  it("includes {{#tile}} section for tile requests", async () => {
    await testHeaderTemplate(
      "X-Request-Type",
      "{{#tile}}TILE{{/tile}}{{#tileJSON}}TILEJSON{{/tileJSON}}",
      "/5/10/12.png",
      "TILE",
    );
  });

  it("includes {{#tileJSON}} section for TileJSON requests", async () => {
    await testHeaderTemplate(
      "X-Request-Type",
      "{{#tile}}TILE{{/tile}}{{#tileJSON}}TILEJSON{{/tileJSON}}",
      "/index.json",
      "TILEJSON",
    );
  });

  it("includes {{#200}} section for successful requests", async () => {
    await testHeaderTemplate(
      "X-Status",
      "{{#200}}OK{{/200}}{{#404}}NOT_FOUND{{/404}}",
      "/5/10/12.png",
      "OK",
    );
  });

  it("includes {{#404}} section for not found requests", async () => {
    await testHeaderTemplate(
      "X-Status",
      "{{#200}}OK{{/200}}{{#404}}NOT_FOUND{{/404}}",
      "/5/10/12.pbf",
      "NOT_FOUND",
      404,
    );
  });

  it("includes {{#invalidFormat}} section for format errors", async () => {
    await testHeaderTemplate(
      "X-Error-Type",
      "{{#invalidFormat}}FORMAT{{/invalidFormat}}{{#invalidZoom}}ZOOM{{/invalidZoom}}",
      "/5/10/12.pbf",
      "FORMAT",
      404,
    );
  });
});

describe("sourceMaxZoom template variables", () => {
  it("provides sourceZoom variables when sourceMaxZoom configured", async () => {
    // Coordinate scaling: coord >> (zoom - sourceMaxZoom) = 2048 >> 2 = 512
    await testSourceMaxZoom("/12/2048/2048.pbf", {
      "x-source-zoom": "10",
      "x-source-coords": "512,512",
    });
  });

  it("sourceZoom equals zoom when below sourceMaxZoom", async () => {
    await testSourceMaxZoom("/8/100/100.pbf", {
      "x-source-zoom": "8",
    });
  });
});

describe("Header template edge cases", () => {
  it("substitutes {{retina}} as false for non-retina tiles", async () => {
    await testHeaderTemplate(
      "X-Tile-Retina",
      "{{tile.retina}}",
      "/5/10/12.png",
      "false",
    );
  });

  it("substitutes {{scale}} as 1 for normal tiles", async () => {
    await testHeaderTemplate(
      "X-Tile-Scale",
      "{{tile.scale}}",
      "/5/10/12.png",
      "1",
    );
  });

  it("substitutes multiple variables in single header value", async () => {
    await testHeaderTemplate(
      "X-Tile-Info",
      "z{{tile.zoom}}-x{{tile.x}}-y{{tile.y}}",
      "/5/10/12.png",
      "z5-x10-y12",
    );
  });
});
