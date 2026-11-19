const { test, describe, before, after } = require("node:test");
const assert = require("node:assert");
const http = require("http");
const Telemetry = require("../src/ingestion/models/telemetry.model");
const { app } = require("../src/server");
const { benchmarkBatch, runIngestionAudit } = require("../src/ingestion/scripts/ingestionAudit");

describe("Week 1 Day 6 — Ingestion Audit & Storage Benchmark Tests", () => {
  let serverInstance;
  let baseUrl;
  let originalInsertMany;

  before(async () => {
    originalInsertMany = Telemetry.insertMany;
    Telemetry.insertMany = async (docs) => {
      return docs.map((d, i) => ({ ...d, _id: `audit_${Date.now()}_${i}` }));
    };

    return new Promise((resolve) => {
      serverInstance = http.createServer(app);
      serverInstance.listen(0, "127.0.0.1", () => {
        const port = serverInstance.address().port;
        baseUrl = `http://127.0.0.1:${port}/api/telemetry`;
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

  test("benchmarkBatch calculates throughput, latency, and memory metrics", async () => {
    const res = await benchmarkBatch(baseUrl, 30, 10);

    assert.strictEqual(res.totalRecords, 30);
    assert.strictEqual(res.batchSize, 10);
    assert.strictEqual(res.sent, 30);
    assert.strictEqual(res.failed, 0);
    assert.ok(res.throughput > 0);
    assert.strictEqual(typeof res.avgLatency, "number");
    assert.strictEqual(typeof res.memDeltaMb, "number");
  });

  test("runIngestionAudit executes across test matrix and produces results", async () => {
    const results = await runIngestionAudit({
      url: baseUrl,
      testSizes: [20],
      batchSizes: [10],
      verbose: false,
    });

    assert.strictEqual(Array.isArray(results), true);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].sent, 20);
    assert.strictEqual(results[0].failed, 0);
  });
});
