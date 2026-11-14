
const { compileGraph } = require("./src/services/streamCompiler");

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

pipeline.output$.subscribe({
  next: result => {
    console.log("Processed telemetry:");
    console.log(JSON.stringify(result, null, 2));
  },
  error: error => console.error("Pipeline error:", error.message)
});

[75, 85, 90].forEach(temperature => {
  pipeline.telemetryInput$.next({
    deviceId: "TURBINE-001",
    temperature,
    voltage: 230,
    current: 12
  });
});

pipeline.close();
