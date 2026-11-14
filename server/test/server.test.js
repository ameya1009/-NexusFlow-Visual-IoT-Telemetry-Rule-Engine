const { test, describe, before, after } = require("node:test");
const assert = require("node:assert");
const http = require("http");
const { app } = require("../src/server");

describe("NexusFlow Server & Day 1 Foundation Tests", () => {
  let serverInstance;
  let baseUrl;

  before(async () => {
    return new Promise((resolve) => {
      serverInstance = http.createServer(app);
      serverInstance.listen(0, "127.0.0.1", () => {
        const port = serverInstance.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    return new Promise((resolve) => {
      serverInstance.close(resolve);
    });
  });

  test("GET / should return 200 with API metadata", async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.name, "NexusFlow Visual IoT Telemetry & Rule Engine API");
    assert.strictEqual(body.status, "online");
    assert.strictEqual(body.version, "1.0.0");
    assert.strictEqual(body.docs, "/docs/contracts.md");
  });

  test("GET /api/health should report health status and service states", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.status, "healthy");
    assert.strictEqual(typeof body.uptime, "number");
    assert.strictEqual(body.services.server, "running");
    assert.ok(typeof body.services.database === "string");
  });

  test("GET /api/nonexistent should return 404 with standard error contract", async () => {
    const res = await fetch(`${baseUrl}/api/nonexistent`);
    assert.strictEqual(res.status, 404);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error, "Endpoint not found");
  });

  test("CORS headers should allow configured origins", async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
      },
    });
    assert.strictEqual(res.headers.get("access-control-allow-origin"), "http://localhost:5173");
  });
});
