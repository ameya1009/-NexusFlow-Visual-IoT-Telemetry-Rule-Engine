const { test, describe, before, after } = require("node:test");
const assert = require("node:assert");
const http = require("http");
const Telemetry = require("../src/ingestion/models/telemetry.model");
const { validateTelemetryItem, validateTelemetryPayload } = require("../src/ingestion/telemetry.validator");
const { app } = require("../src/server");

describe("Week 1 Day 2 — Telemetry Ingestion & Time-Series Tests", () => {
  let serverInstance;
  let baseUrl;
  let originalInsertMany;

  before(async () => {
    // Stub Telemetry.insertMany to decouple from external MongoDB instance during unit/integration tests
    originalInsertMany = Telemetry.insertMany;
    Telemetry.insertMany = async (docs, options) => {
      return docs.map((doc, idx) => ({ ...doc, _id: `mock_id_${idx}` }));
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

  describe("1. MongoDB Time-Series Schema Conformance (Contract 4.2)", () => {
    test("Schema should define time-series collection options correctly", () => {
      const schemaOptions = Telemetry.schema.options;
      assert.ok(schemaOptions.timeseries, "Schema must include timeseries options");
      assert.strictEqual(schemaOptions.timeseries.timeField, "timestamp");
      assert.strictEqual(schemaOptions.timeseries.metaField, "metadata");
      assert.strictEqual(schemaOptions.timeseries.granularity, "seconds");
      assert.strictEqual(schemaOptions.collection, "telemetry");
    });
  });

  describe("2. Telemetry Payload Validation Unit Tests", () => {
    test("Valid single reading from PDF specification should pass validation", () => {
      const sample = {
        timestamp: "2026-11-15T10:00:00.000Z",
        metadata: { sensorId: "turbine-7", site: "plant-A" },
        temperature: 82.4,
        vibration: 0.31,
      };

      const result = validateTelemetryPayload(sample);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.data.length, 1);
      assert.strictEqual(result.data[0].metadata.sensorId, "turbine-7");
      assert.strictEqual(result.data[0].temperature, 82.4);
      assert.strictEqual(result.data[0].vibration, 0.31);
    });

    test("Should reject reading missing metadata or sensorId", () => {
      const invalid1 = { temperature: 75.0 };
      const res1 = validateTelemetryPayload(invalid1);
      assert.strictEqual(res1.valid, false);
      assert.match(res1.error, /metadata/i);

      const invalid2 = { metadata: { site: "plant-A" }, temperature: 75.0 };
      const res2 = validateTelemetryPayload(invalid2);
      assert.strictEqual(res2.valid, false);
      assert.match(res2.error, /sensorId/i);
    });

    test("Should reject reading without any numeric metrics", () => {
      const invalid = {
        metadata: { sensorId: "turbine-7" },
      };
      const res = validateTelemetryPayload(invalid);
      assert.strictEqual(res.valid, false);
      assert.match(res.error, /at least one metric/i);
    });

    test("Should reject reading with non-numeric metric values", () => {
      const invalid = {
        metadata: { sensorId: "turbine-7" },
        temperature: "eighty-two",
      };
      const res = validateTelemetryPayload(invalid);
      assert.strictEqual(res.valid, false);
      assert.match(res.error, /must be a valid number/i);
    });

    test("Batch validation should accept multiple valid readings", () => {
      const batch = [
        {
          timestamp: new Date().toISOString(),
          metadata: { sensorId: "turbine-7", site: "plant-A" },
          temperature: 81.2,
          vibration: 0.28,
        },
        {
          timestamp: new Date().toISOString(),
          metadata: { sensorId: "turbine-8", site: "plant-A" },
          temperature: 77.5,
          vibration: 0.15,
        },
      ];

      const res = validateTelemetryPayload(batch);
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.data.length, 2);
      assert.strictEqual(res.isBatch, true);
    });
  });

  describe("3. Ingestion API Endpoint Tests (POST /api/telemetry)", () => {
    test("POST /api/telemetry (single reading) returns 201 with success status", async () => {
      const payload = {
        metadata: { sensorId: "turbine-7", site: "plant-A" },
        temperature: 82.4,
        vibration: 0.31,
      };

      const res = await fetch(`${baseUrl}/api/telemetry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.count, 1);
      assert.strictEqual(json.sample.metadata.sensorId, "turbine-7");
    });

    test("POST /api/telemetry (batch insert) returns 201 with ingested count", async () => {
      const batchPayload = [
        {
          metadata: { sensorId: "turbine-7", site: "plant-A" },
          temperature: 82.4,
          vibration: 0.31,
        },
        {
          metadata: { sensorId: "turbine-7", site: "plant-A" },
          temperature: 83.1,
          vibration: 0.35,
        },
        {
          metadata: { sensorId: "turbine-9", site: "plant-B" },
          temperature: 71.0,
          vibration: 0.12,
        },
      ];

      const res = await fetch(`${baseUrl}/api/telemetry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batchPayload),
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.count, 3);
      assert.match(json.message, /batch of 3/i);
    });

    test("POST /api/telemetry with invalid payload returns 400 Bad Request", async () => {
      const res = await fetch(`${baseUrl}/api/telemetry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invalidField: "bad data" }),
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error, "Validation failed");
    });
  });
});
