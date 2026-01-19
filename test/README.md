# Tessera Test Suite

Integration-heavy testing via HTTP with mock tilelive sources.

## Structure

```text
test/
  fixtures/         # Mock tilelive sources
  helpers/          # Test utilities (app factory)
  integration/      # HTTP endpoint tests
  unit/             # Logic and template tests
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test tile-endpoints.test.js

# Run with coverage
npm run test:coverage

# Watch mode
npm test -- --watch
```

## Mock Sources

- `mock-png://` - Returns 1x1 transparent PNG
- `mock-pbf://` - Returns minimal MVT (empty vector tile)
- `mock-error://` - Throws "Tile does not exist" on getTile (customizable message)
- `mock-null://` - Returns null from getTile
- `mock-erroring://` - Throws errors on getInfo or getTile based on configuration

Query parameters:

- `minzoom=N` - Set minimum zoom
- `maxzoom=N` - Set maximum zoom
- `bounds=W,S,E,N` - Set bounds
- `message=TEXT` - Custom error message (error sources)
- `errorOn=METHOD` - Method to fail (mock-erroring only: "getInfo" or "getTile")

## Test Patterns

### Integration Tests

Test through HTTP using supertest:

```javascript
const app = createApp("mock-png://test");
const res = await request(app).get("/0/0/0.png");
expect(res.status).toBe(200);
```

### Header Template Tests

Verify Handlebars template rendering:

```javascript
const app = createApp("mock-png://test", {
  headers: {
    "X-Tile-Zoom": "{{tile.zoom}}"
  }
});
const res = await request(app).get("/5/10/12.png");
expect(res.headers["x-tile-zoom"]).toBe("5");
```

### Error Testing

Use `mock-erroring://` to test infrastructure error paths:

```javascript
// Test getInfo failures
const app = createApp("mock-erroring://test?errorOn=getInfo&message=Metadata%20unavailable");
const res = await request(app).get("/index.json");
expect(res.status).toBe(500);

// Test non-standard getTile errors (returns 500, not 404)
const app = createApp("mock-erroring://test?errorOn=getTile&message=Database%20error");
const res = await request(app).get("/0/0/0.png");
expect(res.status).toBe(500);
```

Use `mock-error://` for expected tile-not-found scenarios (returns 404):

```javascript
const app = createApp("mock-error://test?message=Tile%20does%20not%20exist");
const res = await request(app).get("/0/0/0.png");
expect(res.status).toBe(404);
```

## Coverage Goals

Target 80%+ coverage for:

- lib/app.js (tile serving logic)
- lib/index.js (getInfo wrapper)
