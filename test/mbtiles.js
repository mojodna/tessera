"use strict";

var assert = require("assert"),
  express = require("express"),
  request = require("supertest"),
  tilelive = require("tilelive-cache")(require("tilelive"), {}),
  serve = require("../lib/app"),
  tessera = require("../lib/index");

// load and register tilelive modules
require("tilelive-modules/loader")(tilelive, {});

describe("MBTiles", function () {
  var app;
  before(function (done) {
    var uri = "mbtiles://./test/fixtures/empty.mbtiles";
    app = express();
    app.use(serve(tilelive, uri));

    return done();
  });

  it("should return TileJSON", function (done) {
    request(app)
      .get("/index.json")
      .expect(200)
      .end(function (err, res) {
        assert.equal(err, null);
        assert(typeof res.body == "object");

        assert.equal(res.body.format, "pbf");
        assert.equal(res.body.minzoom, 0);
        assert.equal(res.body.maxzoom, 14);

        done();
      });
  });

  it("should return empty vector tile on valid request", function (done) {
    request(app)
      .get("/5/1/1.pbf")
      .expect(200)
      .end(function (err, res) {
        console.error(err);
        assert.equal(err, null);
        assert.equal(typeof res.text, "undefined");
        assert.deepEqual(res.body, {});

        done();
      });
  });

  it("should return 404 on overzoom request", function (done) {
    request(app)
      .get("/15/1/1.pbf")
      .expect(404)
      .end(function (err, res) {
        assert.equal(err, null);
        assert.equal(res.text, "Not Found");

        done();
      });
  });
});
