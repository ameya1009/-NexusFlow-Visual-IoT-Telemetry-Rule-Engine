const { test, describe, before, after } = require("node:test");
const assert = require("node:assert");
const http = require("http");
const fs = require("fs");
const path = require("path");
const Telemetry = require("../src/ingestion/models/telemetry.model");
const { app } = require("../src/server");
const { runIngestionDemo, checkHealth } = require("../src/ingestion/scripts/verifyIngestionDemo");

describe("Week 1 Day 4 — Ingestion Audit & Deliverable Verification Tests", () => {
  let serverInstance;
  let baseUrl;
  let healthUrl;
  let originalInsertMany;
  let insertedStore = [];

  before(async () => {
    insertedStore = [];
    originalInsertMany = Telemetry.insertMany;
    Telemetry.insertMany = async (docs, options) => {
      insertedStore.push(...docs);
      return docs.map((d, i) => ({ ...d, _id: `demo_${Date.now()}_${i}` }));
    };

    return new Promise((resolve) => {
      serverInstance = http.createServer(app);
      serverInstance.listen(0, "127.0.0.1", () => {
        const port = serverInstance.address().port;
        baseUrl = `http://127.0.0.1:${port}/api/telemetry`;
        healthUrl = `http://127.0.0.1:${port}/api/health`;
        resolve();
      });
    });
  });

  after(async () => {
    Telemetry.insertMany = originalInsertMany;
    return new Promise((resolve) => {
      serverInstance.close(resolve);
    });
  });

  describe("1. Pre-flight Health Check Verification", () => {
    test("checkHealth should report HTTP 200 and healthy status", async () => {
      const res = await checkHealth(healthUrl);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, "healthy");
      assert.strictEqual(res.data.services.server, "running");
    });
  });

  describe("2. End-to-End Ingestion Audit Demo Execution", () => {
    test("runIngestionDemo executes ingestion and passes deliverable criteria", async () => {
      insertedStore = [];

      const demoResult = await runIngestionDemo({
        apiUrl: baseUrl,
        healthUrl,
        targetCount: 100, // verified sample for fast test execution
        batchSize: 20,
        rate: 500,
        sensors: ["turbine-1", "turbine-7"],
        site: "plant-A",
      });

      assert.strictEqual(demoResult.success, true);
      assert.strictEqual(demoResult.sent, 100);
      assert.strictEqual(demoResult.failed, 0);
      assert.strictEqual(insertedStore.length, 100);
      assert.ok(demoResult.throughput > 0);
    });
  });

  describe("3. Postman Collection Conformance", () => {
    test("Postman collection file exists and has valid schema format", () => {
      const collectionPath = path.join(
        __dirname,
        "../src/ingestion/scripts/NexusFlow_Week1_Ingestion.postman_collection.json"
      );
      assert.ok(fs.existsSync(collectionPath), "Postman collection must exist on disk");

      const content = JSON.parse(fs.readFileSync(collectionPath, "utf-8"));
      assert.ok(content.info.name.includes("NexusFlow"));
      assert.ok(Array.isArray(content.item));
      assert.strictEqual(content.item.length >= 5, true);

      // Verify essential endpoints are covered
      const itemNames = content.item.map((i) => i.name);
      assert.ok(itemNames.some((n) => n.includes("Health Check")));
      assert.ok(itemNames.some((n) => n.includes("Single Telemetry")));
      assert.ok(itemNames.some((n) => n.includes("Batch Telemetry")));
      assert.ok(itemNames.some((n) => n.includes("Query Latest")));
    });
  });
});
