const assert = require("assert");

const {
  compileGraph,
  validateGraph,
  evaluateRule
} = require("./src/compiler/services/streamCompiler");
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
// Test 1: Unsupported node type
const invalidNodeTypeGraph = JSON.parse(JSON.stringify(graph));

invalidNodeTypeGraph.nodes[0].type = "unknown";

assert.throws(
  () => validateGraph(invalidNodeTypeGraph),
  /Unsupported node type: unknown/,
  "Should reject unsupported node types"
);

console.log("✅ Unsupported node type test passed");

// Test 2: Invalid moving average window
const invalidWindowGraph = JSON.parse(JSON.stringify(graph));

invalidWindowGraph.nodes[1].data.windowSize = 0;

assert.throws(
  () => validateGraph(invalidWindowGraph),
  /Moving average average-1 requires windowSize between 1 and 1000/,
  "Should reject an invalid moving average window"
);

console.log("✅ Invalid moving average window test passed");
// Test 3: Invalid rule configuration
const invalidRuleGraph = JSON.parse(JSON.stringify(graph));

invalidRuleGraph.nodes[2].data.operator = "INVALID";

assert.throws(
  () => validateGraph(invalidRuleGraph),
  /Rule rule-1 has invalid configuration/,
  "Should reject an invalid rule operator"
);

console.log("✅ Invalid rule configuration test passed");
// Test 4: Missing sensor device ID
const missingDeviceIdGraph = JSON.parse(JSON.stringify(graph));

delete missingDeviceIdGraph.nodes[0].data.deviceId;

assert.throws(
  () => validateGraph(missingDeviceIdGraph),
  /Sensor sensor-1 requires a deviceId/,
  "Should reject a sensor without deviceId"
);

console.log("✅ Missing sensor device ID test passed");
// Test 5: Invalid edge references
const invalidEdgeGraph = JSON.parse(JSON.stringify(graph));

invalidEdgeGraph.edges[0].target = "unknown-node";

assert.throws(
  () => validateGraph(invalidEdgeGraph),
  /Edge references a node that does not exist/,
  "Should reject edges referencing unknown nodes"
);

console.log("✅ Invalid edge reference test passed");
// Test 6: Circular graph connection
const circularGraph = JSON.parse(JSON.stringify(graph));

circularGraph.edges.push({
  source: "alert-1",
  target: "sensor-1"
});

assert.throws(
  () => compileGraph(circularGraph),
  /Graph contains a cycle/,
  "Should reject circular graph connections"
);

console.log("✅ Circular connection test passed");
// Test 7: Duplicate edges
const duplicateEdgeGraph = JSON.parse(JSON.stringify(graph));

duplicateEdgeGraph.edges.push({
  source: "sensor-1",
  target: "average-1"
});

assert.throws(
  () => validateGraph(duplicateEdgeGraph),
  /Duplicate edge: sensor-1->average-1/,
  "Should reject duplicate edges"
);

console.log("✅ Duplicate edge test passed");
// Test 8: Self-connection
const selfConnectionGraph = JSON.parse(JSON.stringify(graph));

selfConnectionGraph.edges.push({
  source: "average-1",
  target: "average-1"
});

assert.throws(
  () => validateGraph(selfConnectionGraph),
  /Self-connections are not allowed/,
  "Should reject self-connections"
);

console.log("✅ Self-connection test passed");
// Test 9: Disconnected node
const disconnectedGraph = JSON.parse(JSON.stringify(graph));

disconnectedGraph.nodes.push({
  id: "moving-average-2",
  type: "movingAverage",
  data: {
    windowSize: 3,
    field: "temperature"
  }
});

assert.throws(
  () => compileGraph(disconnectedGraph),
  /Node moving-average-2 is not connected to the sensor/,
  "Should reject disconnected nodes"
);

console.log("✅ Disconnected node test passed");
// ==========================================
// WEEK 2 DAY 3: RULE OPERATOR TESTS
// ==========================================

// Test all six supported rule operators
const ruleOperatorTests = [
  { operator: ">", actual: 90, expected: 80, result: true },
  { operator: ">", actual: 70, expected: 80, result: false },

  { operator: ">=", actual: 80, expected: 80, result: true },
  { operator: ">=", actual: 70, expected: 80, result: false },

  { operator: "<", actual: 70, expected: 80, result: true },
  { operator: "<", actual: 90, expected: 80, result: false },

  { operator: "<=", actual: 80, expected: 80, result: true },
  { operator: "<=", actual: 90, expected: 80, result: false },

  { operator: "==", actual: 80, expected: 80, result: true },
  { operator: "==", actual: 90, expected: 80, result: false },

  { operator: "!=", actual: 90, expected: 80, result: true },
  { operator: "!=", actual: 80, expected: 80, result: false }
];

ruleOperatorTests.forEach((test, index) => {
  const result = evaluateRule(
    { temperature: test.actual },
    {
      field: "temperature",
      operator: test.operator,
      value: test.expected
    }
  );

  assert.strictEqual(
    result,
    test.result,
    `Rule operator test ${index + 1} failed: ${test.operator}`
  );
});

console.log("✅ All 12 rule operator tests passed");

// Test invalid telemetry values
assert.strictEqual(
  evaluateRule(
    { temperature: "hot" },
    { field: "temperature", operator: ">", value: 80 }
  ),
  false,
  "Should reject non-numeric telemetry values"
);

assert.strictEqual(
  evaluateRule(
    { temperature: Infinity },
    { field: "temperature", operator: ">", value: 80 }
  ),
  false,
  "Should reject infinite telemetry values"
);

console.log("✅ Invalid telemetry value tests passed");
// ==========================================
// WEEK 2 DAY 3: ADDITIONAL GRAPH VALIDATION
// ==========================================

// Test duplicate node IDs
const duplicateNodeGraph = {
  nodes: [
    {
      id: "sensor-1",
      type: "sensor",
      data: { deviceId: "TURBINE-001" }
    },
    {
      id: "sensor-1",
      type: "sensor",
      data: { deviceId: "TURBINE-002" }
    }
  ],
  edges: []
};

assert.throws(
  () => validateGraph(duplicateNodeGraph),
  /duplicate/i,
  "Should reject duplicate node IDs"
);

console.log("✅ Duplicate node ID test passed");

// Test missing node ID
const missingNodeIdGraph = {
  nodes: [
    { type: "sensor", deviceId: "TURBINE-001" }
  ],
  edges: []
};

assert.throws(
  () => validateGraph(missingNodeIdGraph),
  /id/i,
  "Should reject nodes without an ID"
);

console.log("✅ Missing node ID test passed");

// Test missing node type
const missingNodeTypeGraph = {
  nodes: [
    { id: "sensor-1", deviceId: "TURBINE-001" }
  ],
  edges: []
};

assert.throws(
  () => validateGraph(missingNodeTypeGraph),
  /type/i,
  "Should reject nodes without a type"
);

console.log("✅ Missing node type test passed");
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