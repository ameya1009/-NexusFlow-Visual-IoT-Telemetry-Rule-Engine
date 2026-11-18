const { test, describe, before, after } = require("node:test");
const assert = require("node:assert");
const http = require("http");
const Graph = require("../src/models/graph.model");
const Telemetry = require("../src/ingestion/models/telemetry.model");
const { app } = require("../src/server");

describe("Week 1 Day 5 — Full Milestone Integration Tests (Lead + Compiler)", () => {
  let serverInstance;
  let baseUrl;
  let originalCreate;
  let originalFindOne;
  let originalTelemetryFind;
  let savedGraphs = new Map();

  before(async () => {
    savedGraphs.clear();

    // Stub Graph and Telemetry model operations for standalone integration testing
    originalCreate = Graph.create;
    originalFindOne = Graph.findOne;
    originalTelemetryFind = Telemetry.find;

    Telemetry.find = () => ({
      sort: () => ({
        limit: () => ({
          lean: async () => [
            {
              timestamp: new Date().toISOString(),
              metadata: { sensorId: "turbine-7", site: "plant-A" },
              temperature: 82.4,
              vibration: 0.31,
            },
          ],
        }),
      }),
    });

    Graph.create = async (doc) => {
      if (savedGraphs.has(doc.graphId)) {
        const err = new Error("Duplicate key");
        err.code = 11000;
        throw err;
      }
      savedGraphs.set(doc.graphId, doc);
      return { ...doc, _id: "mock_graph_id" };
    };

    Graph.findOne = async ({ graphId }) => {
      return savedGraphs.get(graphId) || null;
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
    Graph.create = originalCreate;
    Graph.findOne = originalFindOne;
    Telemetry.find = originalTelemetryFind;
    return new Promise((resolve) => {
      serverInstance.close(resolve);
    });
  });

  describe("1. Graph JSON Saving & Contract 4.1 Conformance", () => {
    test("POST /api/graphs successfully validates and saves the Turbine Overheat graph from PDF", async () => {
      // Turbine Overheat graph straight from PDF Section 4.1
      const turbineGraph = {
        graphId: "g_101",
        name: "Turbine overheat",
        nodes: [
          {
            id: "n1",
            type: "source.sensor",
            data: { sensorId: "turbine-7", metric: "temperature" },
          },
          {
            id: "n2",
            type: "filter.movingAverage",
            data: { windowSize: 5 },
          },
          {
            id: "n3",
            type: "action.sms",
            data: { to: "+91XXXXXXXXXX", threshold: 80 },
          },
        ],
        edges: [
          { source: "n1", target: "n2" },
          { source: "n2", target: "n3" },
        ],
      };

      const res = await fetch(`${baseUrl}/api/graphs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(turbineGraph),
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.graphId, "g_101");
      assert.strictEqual(json.data.nodes.length, 3);
    });

    test("GET /api/graphs/:id loads saved graph", async () => {
      const res = await fetch(`${baseUrl}/api/graphs/g_101`);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.name, "Turbine overheat");
      assert.strictEqual(json.data.nodes[0].data.sensorId, "turbine-7");
    });

    test("POST /api/graphs rejects graph with unknown node types or missing edges", async () => {
      const invalidGraph = {
        graphId: "g_invalid",
        name: "Invalid graph",
        nodes: [
          {
            id: "n1",
            type: "unknown.alienType",
            data: {},
          },
        ],
        edges: [],
      };

      const res = await fetch(`${baseUrl}/api/graphs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidGraph),
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.message, "Invalid graph data");
    });
  });

  describe("2. Full Backend Coexistence (Telemetry + Graphs)", () => {
    test("Both /api/telemetry and /api/graphs endpoints respond correctly on same server instance", async () => {
      const resHealth = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(resHealth.status, 200);

      const resTele = await fetch(`${baseUrl}/api/telemetry/latest`);
      assert.strictEqual(resTele.status, 200);

      const resGraph = await fetch(`${baseUrl}/api/graphs/g_101`);
      assert.strictEqual(resGraph.status, 200);
    });
  });
});
