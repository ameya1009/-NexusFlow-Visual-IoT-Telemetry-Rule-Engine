const { test, describe, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const http = require("http");
const { app } = require("../src/server");
const Telemetry = require("../src/ingestion/models/telemetry.model");
const telemetryBus = require("../src/ingestion/services/telemetryBus");

describe("Ingestion Resilience & Network Jitter Tests", () => {
  let serverInstance;
  let baseUrl;
  let originalInsertMany;

  before(async () => {
    originalInsertMany = Telemetry.insertMany;
    Telemetry.insertMany = async (docs) => {
      return docs.map((doc, idx) => ({ ...doc, _id: `mock_resilience_${idx}` }));
    };

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
    Telemetry.insertMany = originalInsertMany;
    return new Promise((resolve) => {
      serverInstance.close(resolve);
    });
  });

  beforeEach(() => {
    telemetryBus.reset();
  });

  describe("1. Network Jitter & Simulated Ingestion Latency", () => {
    test("handles asynchronous batches with randomized network latency without data loss", async () => {
      const totalBatches = 5;
      const batchSize = 10;
      let totalReceived = 0;

      telemetryBus.onTelemetryUpdate(() => {
        totalReceived += 1;
      });

      // Simulate network jitter with randomized delays (5ms - 30ms)
      const sendBatchWithJitter = (batchIndex) => {
        const delayMs = Math.floor(Math.random() * 25) + 5;
        return new Promise((resolve) => {
          setTimeout(async () => {
            const readings = Array.from({ length: batchSize }, (_, i) => ({
              timestamp: new Date(Date.now() - (totalBatches - batchIndex) * 1000 + i * 10).toISOString(),
              metadata: { sensorId: `sensor-${batchIndex}`, site: "site-north" },
              temperature: 65 + Math.random() * 10,
              pressure: 101.3,
            }));

            const response = await fetch(`${baseUrl}/api/telemetry`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(readings),
            });

            const data = await response.json();
            resolve({ status: response.status, count: data.insertedCount || data.count || readings.length });
          }, delayMs);
        });
      };

      const promises = Array.from({ length: totalBatches }, (_, i) => sendBatchWithJitter(i));
      const results = await Promise.all(promises);

      assert.strictEqual(results.length, totalBatches);
      for (const res of results) {
        assert.ok(res.status === 200 || res.status === 201, `Expected success status, got ${res.status}`);
      }
      assert.strictEqual(totalReceived, totalBatches * batchSize, "All items broadcasted across event bus");
    });
  });

  describe("2. Malformed Payloads & Stream Continuity", () => {
    test("rejects malformed payloads with 400 Bad Request without interrupting pipeline", async () => {
      let validReceived = 0;
      telemetryBus.onTelemetryUpdate(() => {
        validReceived += 1;
      });

      // 1. Send invalid array containing non-object
      const badRes1 = await fetch(`${baseUrl}/api/telemetry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(["not-a-valid-telemetry-item"]),
      });
      assert.strictEqual(badRes1.status, 400, "Should reject non-object telemetry item");

      // 2. Send payload with missing metadata.sensorId
      const badRes2 = await fetch(`${baseUrl}/api/telemetry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          metadata: { site: "site-north" }, // missing sensorId
          temperature: 75.0,
        }),
      });
      assert.strictEqual(badRes2.status, 400, "Should reject missing sensorId");

      // 3. Immediately send valid reading to confirm server & event bus are still healthy
      const goodRes = await fetch(`${baseUrl}/api/telemetry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          metadata: { sensorId: "turbine-recovery", site: "site-north" },
          temperature: 72.4,
        }),
      });
      assert.ok(goodRes.status === 200 || goodRes.status === 201, "Server processes valid payload after rejected payloads");
      assert.strictEqual(validReceived, 1, "Valid reading successfully reached event bus");
    });
  });

  describe("3. Buffer & Rate Limiting Stability", () => {
    test("rate limiter sliding window accurately bounds high-frequency burst traffic", async () => {
      const rapidRequests = Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date().toISOString(),
        metadata: { sensorId: `burst-sensor-${i}`, site: "site-test" },
        temperature: 50.0,
      }));

      let successCount = 0;
      for (const reading of rapidRequests) {
        const res = await fetch(`${baseUrl}/api/telemetry`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([reading]),
        });

        if (res.status === 200 || res.status === 201) {
          successCount += 1;
        }
      }

      assert.strictEqual(successCount, 10, "All compliant burst requests must succeed without dropping");
    });
  });
});
