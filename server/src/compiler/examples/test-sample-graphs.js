const fs = require("fs");
const path = require("path");
const assert = require("assert");

const { compileGraph } = require("../services/streamCompiler");

const graphPath = path.join(__dirname, "high-voltage-graph.json");
const graph = JSON.parse(fs.readFileSync(graphPath, "utf8"));

const pipeline = compileGraph(graph);
const results = [];

pipeline.output$.subscribe({
  next: result => results.push(result),
  error: error => console.error(error)
});

pipeline.telemetryInput$.next({
  deviceId: "SUBSTATION-001",
  voltage: 250
});

pipeline.telemetryInput$.next({
  deviceId: "SUBSTATION-001",
  voltage: 220
});

pipeline.close();

assert.strictEqual(results.length, 2);
assert.strictEqual(results[0].alerts.length, 1);
assert.strictEqual(results[1].alerts.length, 0);

console.log("High voltage graph execution test passed!");
// High-current graph execution test
const currentGraphPath = path.join(__dirname, "high-current-graph.json");
const currentGraph = JSON.parse(
  fs.readFileSync(currentGraphPath, "utf8")
);

const currentPipeline = compileGraph(currentGraph);
const currentResults = [];

currentPipeline.output$.subscribe({
  next: result => currentResults.push(result),
  error: error => console.error(error)
});

[10, 16, 20, 22].forEach(current => {
  currentPipeline.telemetryInput$.next({
    deviceId: "MOTOR-001",
    current
  });
});

currentPipeline.close();

assert.strictEqual(currentResults.length, 4);
assert.strictEqual(currentResults[0].alerts.length, 0);
assert.strictEqual(currentResults[1].alerts.length, 0);
assert.strictEqual(currentResults[2].alerts.length, 1);
assert.strictEqual(currentResults[3].alerts.length, 1);

console.log("High current graph execution test passed!");