const { test, describe, before, after } = require("node:test");
const assert = require("node:assert");
const http = require("http");
const Telemetry = require("../src/ingestion/models/telemetry.model");
const { app } = require("../src/server");
const {
  generateReading,
  generateBatch,
  runSimulator,
} = require("../src/ingestion/scripts/mockSensor");

describe("Week 1 Day 3 — IoT Mock Sensor Simulator Tests", () => {
  let serverInstance;
  let baseUrl;
  let originalInsertMany;
  let insertedStore = [];

  before(async () => {
    insertedStore = [];
    originalInsertMany = Telemetry.insertMany;
    Telemetry.insertMany = async (docs, options) => {
      insertedStore.push(...docs);
      return docs.map((d, i) => ({ ...d, _id: `mock_${Date.now()}_${i}` }));
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

  describe("1. Mock Telemetry Data Generator", () => {
    test("generateReading produces contract 4.2 compliant reading", () => {
      const reading = generateReading("turbine-7", "plant-A");

      assert.ok(reading.timestamp);
      assert.strictEqual(typeof reading.timestamp, "string");
      assert.ok(!isNaN(new Date(reading.timestamp).getTime()));

      assert.ok(reading.metadata);
      assert.strictEqual(reading.metadata.sensorId, "turbine-7");
      assert.strictEqual(reading.metadata.site, "plant-A");

      assert.strictEqual(typeof reading.temperature, "number");
      assert.strictEqual(typeof reading.vibration, "number");
      assert.ok(reading.temperature > 0);
      assert.ok(reading.vibration > 0);
    });

    test("generateBatch produces correct number of readings with randomized sensors", () => {
      const sensors = ["turbine-1", "turbine-2", "turbine-7"];
      const batch = generateBatch(25, sensors, "plant-A");

      assert.strictEqual(batch.length, 25);
      batch.forEach((r) => {
        assert.ok(sensors.includes(r.metadata.sensorId));
        assert.strictEqual(r.metadata.site, "plant-A");
      });
    });

    test("Spike generation produces temperature > 80°C when spikeProbability is 1.0", () => {
      const spike = generateReading("turbine-7", "plant-A", { spikeProbability: 1.0 });
      assert.ok(spike.temperature > 80.0, `Spike temperature ${spike.temperature} should exceed 80°C`);
    });
  });

  describe("2. End-to-End Simulation & Ingestion Execution", () => {
    test("runSimulator sends readings and tracks stats through ingestion API", async () => {
      insertedStore = [];

      const stats = await runSimulator({
        url: baseUrl,
        count: 50,
        rate: 500, // fast for testing
        batchSize: 10,
        sensorIds: ["turbine-7"],
        site: "plant-A",
        verbose: false,
      });

      assert.strictEqual(stats.sent, 50);
      assert.strictEqual(stats.failed, 0);
      assert.ok(stats.throughput > 0);
      assert.strictEqual(insertedStore.length, 50);

      // Verify stored data shape matches shared contract 4.2
      const first = insertedStore[0];
      assert.strictEqual(first.metadata.sensorId, "turbine-7");
      assert.strictEqual(first.metadata.site, "plant-A");
      assert.ok(typeof first.temperature === "number");
      assert.ok(typeof first.vibration === "number");
    });
  });
});
