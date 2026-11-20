const { test, describe, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const http = require("http");
const { app } = require("../src/server");
const Telemetry = require("../src/ingestion/models/telemetry.model");
const telemetryBus = require("../src/ingestion/services/telemetryBus");

describe("Week 2 Day 7 — Telemetry Time-Range Query & In-Process Event Bus Tests", () => {
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

  beforeEach(() => {
    telemetryBus.reset();
  });

  describe("1. In-Process TelemetryEventBus Unit Tests", () => {
    test("publish single reading emits both telemetry:ingested and telemetry:update", () => {
      let ingestedCount = 0;
      let updateReceived = null;

      telemetryBus.onTelemetryIngested((batch) => {
        ingestedCount = batch.length;
      });

      telemetryBus.onTelemetryUpdate((reading) => {
        updateReceived = reading;
      });

      const sampleReading = {
        timestamp: "2026-11-20T10:00:00.000Z",
        metadata: { sensorId: "turbine-7", site: "plant-A" },
        temperature: 84.5,
      };

      telemetryBus.publish(sampleReading);

      assert.strictEqual(ingestedCount, 1);
      assert.ok(updateReceived);
      assert.strictEqual(updateReceived.metadata.sensorId, "turbine-7");
      assert.strictEqual(updateReceived.deviceId, "turbine-7"); // Alias for compiler compatibility
      assert.strictEqual(updateReceived.temperature, 84.5);

      const metrics = telemetryBus.getMetrics();
      assert.strictEqual(metrics.totalIngestedEvents, 1);
      assert.strictEqual(metrics.totalUpdatesEmitted, 1);
    });

    test("publish batch emits telemetry:ingested once and telemetry:update per item", () => {
      let batchEventFired = 0;
      const updates = [];

      telemetryBus.onTelemetryIngested((batch) => {
        batchEventFired++;
        assert.strictEqual(batch.length, 3);
      });

      telemetryBus.onTelemetryUpdate((reading) => {
        updates.push(reading);
      });

      const batch = [
        { timestamp: new Date(), metadata: { sensorId: "s1" }, temperature: 70 },
        { timestamp: new Date(), metadata: { sensorId: "s2" }, temperature: 75 },
        { timestamp: new Date(), metadata: { sensorId: "s3" }, temperature: 80 },
      ];

      telemetryBus.publish(batch);

      assert.strictEqual(batchEventFired, 1);
      assert.strictEqual(updates.length, 3);
      assert.strictEqual(updates[0].deviceId, "s1");
      assert.strictEqual(updates[2].deviceId, "s3");
    });

    test("publishAlert and publishNodeActive emit appropriate rule engine events", () => {
      let alertReceived = null;
      let nodeActiveReceived = null;

      telemetryBus.on(telemetryBus.EVENTS.ALERT_FIRED, (alert) => {
        alertReceived = alert;
      });

      telemetryBus.on(telemetryBus.EVENTS.NODE_ACTIVE, (node) => {
        nodeActiveReceived = node;
      });

      telemetryBus.publishAlert({
        graphId: "graph-1",
        nodeId: "n3",
        value: 92.5,
        time: new Date().toISOString(),
        alertType: "threshold_exceeded",
      });

      telemetryBus.publishNodeActive({
        graphId: "graph-1",
        nodeId: "n2",
        value: 85.0,
      });

      assert.ok(alertReceived);
      assert.strictEqual(alertReceived.nodeId, "n3");
      assert.strictEqual(alertReceived.alertType, "threshold_exceeded");

      assert.ok(nodeActiveReceived);
      assert.strictEqual(nodeActiveReceived.nodeId, "n2");
    });
  });

  describe("2. GET /api/telemetry/query Time-Range & Filter Tests", () => {
    // Mock Telemetry.find to verify query building without requiring active live MongoDB
    const originalFind = Telemetry.find;

    after(() => {
      Telemetry.find = originalFind;
    });

    test("GET /api/telemetry/query executes with sensorId, time-range and metric filters", async () => {
      let capturedQuery = null;
      let capturedSort = null;
      let capturedLimit = null;
      let capturedSkip = null;

      Telemetry.find = (query) => {
        capturedQuery = query;
        return {
          sort(s) {
            capturedSort = s;
            return this;
          },
          skip(sk) {
            capturedSkip = sk;
            return this;
          },
          limit(l) {
            capturedLimit = l;
            return this;
          },
          async lean() {
            return [
              {
                _id: "mock-1",
                timestamp: new Date("2026-11-20T10:30:00.000Z"),
                metadata: { sensorId: "turbine-7", site: "plant-A" },
                temperature: 88.5,
              },
            ];
          },
        };
      };

      const startTime = "2026-11-20T10:00:00.000Z";
      const endTime = "2026-11-20T11:00:00.000Z";

      const res = await fetch(
        `${baseUrl}/api/telemetry/query?sensorId=turbine-7&site=plant-A&startTime=${encodeURIComponent(
          startTime
        )}&endTime=${encodeURIComponent(endTime)}&metric=temperature&minVal=80&limit=50&page=2&sort=asc`
      );

      assert.strictEqual(res.status, 200);
      const json = await res.json();

      assert.strictEqual(json.success, true);
      assert.strictEqual(json.count, 1);
      assert.strictEqual(json.page, 2);
      assert.strictEqual(json.limit, 50);
      assert.strictEqual(json.sort, "asc");

      // Verify query construction
      assert.strictEqual(capturedQuery["metadata.sensorId"], "turbine-7");
      assert.strictEqual(capturedQuery["metadata.site"], "plant-A");
      assert.deepStrictEqual(capturedQuery.timestamp.$gte, new Date(startTime));
      assert.deepStrictEqual(capturedQuery.timestamp.$lte, new Date(endTime));
      assert.strictEqual(capturedQuery.temperature.$gte, 80);
      assert.strictEqual(capturedSort.timestamp, 1);
      assert.strictEqual(capturedSkip, 50); // (page 2 - 1) * 50
      assert.strictEqual(capturedLimit, 50);
    });

    test("GET /api/telemetry/query rejects invalid startTime format", async () => {
      const res = await fetch(`${baseUrl}/api/telemetry/query?startTime=not-a-date`);
      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.match(json.error, /Invalid startTime format/);
    });

    test("GET /api/telemetry/query rejects startTime greater than endTime", async () => {
      const start = "2026-11-20T12:00:00.000Z";
      const end = "2026-11-20T10:00:00.000Z";
      const res = await fetch(
        `${baseUrl}/api/telemetry/query?startTime=${encodeURIComponent(start)}&endTime=${encodeURIComponent(end)}`
      );
      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.match(json.error, /startTime cannot be greater than endTime/);
    });

    test("POST /api/telemetry triggers in-process telemetryBus dispatch", async () => {
      const originalInsertMany = Telemetry.insertMany;

      Telemetry.insertMany = async (docs) => {
        return docs.map((d, i) => ({ ...d, _id: `id-${i}` }));
      };

      let busReceived = null;
      telemetryBus.onTelemetryUpdate((reading) => {
        busReceived = reading;
      });

      const testPayload = {
        timestamp: new Date().toISOString(),
        metadata: { sensorId: "turbine-bus-test", site: "plant-A" },
        temperature: 91.2,
      };

      const res = await fetch(`${baseUrl}/api/telemetry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testPayload),
      });

      assert.strictEqual(res.status, 201);
      assert.ok(busReceived, "telemetryBus should have received update");
      assert.strictEqual(busReceived.metadata.sensorId, "turbine-bus-test");
      assert.strictEqual(busReceived.temperature, 91.2);

      Telemetry.insertMany = originalInsertMany;
    });
  });
});
