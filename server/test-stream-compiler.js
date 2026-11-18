const assert = require("assert");
const { compileGraph } = require('./src/compiler/services/streamCompiler');
const graph = {
  nodes: [
    {
      id: "sensor-1",
      type: "sensor",
      data: { deviceId: "TURBINE-001" }
    },
    {
      id: "average-1",
      type: "movingAverage",
      data: { windowSize: 3, field: "temperature" }
    },
    {
      id: "rule-1",
      type: "rule",
      data: {
        field: "temperature",
        operator: ">",
        value: 80
      }
    },
    {
      id: "alert-1",
      type: "alert",
      data: { message: "High temperature detected!" }
    }
  ],
  edges: [
    { source: "sensor-1", target: "average-1" },
    { source: "average-1", target: "rule-1" },
    { source: "rule-1", target: "alert-1" }
  ]
};

const pipeline = compileGraph(graph);

const results = [];

pipeline.output$.subscribe({
  next: result => {
    results.push(result);

    console.log("Processed telemetry:");
    console.log(JSON.stringify(result, null, 2));
  },
  error: error => console.error("Pipeline error:", error.message)
});

[75, 85, 90, 100].forEach(temperature => {
  pipeline.telemetryInput$.next({
    deviceId: "TURBINE-001",
    temperature,
    voltage: 230,
    current: 12
  });
});

pipeline.close();

// Automated test assertions
assert.strictEqual(results.length, 4, "Should process 4 telemetry readings");
assert.strictEqual(
  results[0].results["average-1"].temperature,
  75,
  "First moving average should be 75"
);

assert.strictEqual(
  results[1].results["average-1"].temperature,
  80,
  "Second moving average should be 80"
);

assert.ok(
  Math.abs(results[2].results["average-1"].temperature - 83.33333333333333) < 0.001,
  "Third moving average should be approximately 83.33"
);
assert.ok(
  Math.abs(results[3].results["average-1"].temperature - 91.66666666666667) < 0.001,
  "Fourth moving average should be approximately 91.67"
);
assert.strictEqual(results[0].alerts.length, 0, "First reading should not trigger alert");
assert.strictEqual(results[1].alerts.length, 0, "Second reading should not trigger alert");
assert.strictEqual(results[2].alerts.length, 1, "Third reading should trigger alert");

console.log("\n✅ All Stream Compiler tests passed!");