const { test, describe } = require("node:test");
const assert = require("node:assert");
const { runMidProjectDemo, DEMO_GRAPH } = require("../src/ingestion/scripts/midProjectDemo");
const { validateGraph } = require("../src/compiler/services/streamCompiler");

describe("Week 2 Milestone — Integration #1 & Mid-Project Review Comprehensive Tests", () => {
  describe("1. Graph JSON Conformance & Validation (Contract 4.1)", () => {
    test("DEMO_GRAPH conforms to Contract 4.1 structure and passes compiler validation", () => {
      assert.doesNotThrow(() => {
        validateGraph(DEMO_GRAPH);
      });
      assert.strictEqual(DEMO_GRAPH.graphId, "g_turbine_demo");
      assert.strictEqual(DEMO_GRAPH.nodes.length, 3);
      assert.strictEqual(DEMO_GRAPH.edges.length, 2);
    });
  });

  describe("2. End-to-End Reactive Streaming & WebSocket Broadcast Execution", () => {
    test("runMidProjectDemo executes full loop: Graph -> RxJS -> Ingest -> WebSockets -> Audit", async () => {
      const demoResult = await runMidProjectDemo({ verbose: false });

      assert.strictEqual(demoResult.success, true);

      // Verify WebSocket client connectivity
      assert.strictEqual(demoResult.wsEventsReceived.connected, true);
      assert.ok(demoResult.wsEventsReceived.telemetryUpdates >= 1);

      // Verify rule detection and alert broadcasting
      assert.strictEqual(demoResult.streamOutputsCount, 2);
      assert.strictEqual(demoResult.alertsTriggeredCount, 1);
      assert.strictEqual(
        demoResult.wsEventsReceived.alertsFired[0].alertType,
        "OVERHEAT_THRESHOLD"
      );

      // Verify 5,000 writes/sec load benchmark deliverable
      assert.strictEqual(demoResult.loadBenchmark.targetMet, true);
      assert.ok(demoResult.loadBenchmark.throughput >= 5000);

      // Verify storage audit deliverable
      assert.ok(demoResult.storageStats.savings.storageSavingsPct >= 70);
      assert.ok(demoResult.storageStats.savings.compressionRatio >= 4.0);
    });
  });
});
