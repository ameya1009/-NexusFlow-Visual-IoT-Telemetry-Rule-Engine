const { validateGraph } = require("../validators/graph.validator");
const Ajv = require("ajv");
const schema = require("../schemas/graph.schema");

const ajv = new Ajv({
  allErrors: true,
  strict: false
});

const validate = ajv.compile(schema);

const graph = {
  graphId: "g_101",
  name: "Turbine overheat",
  nodes: [
    {
      id: "n1",
      type: "source.sensor",
      data: {
        sensorId: "turbine-7",
        metric: "temperature"
      }
    },
    {
      id: "n2",
      type: "filter.movingAverage",
      data: {
        windowSize: 5
      }
    },
    {
      id: "n3",
      type: "action.sms",
      data: {
        to: "+91XXXXXXXXXX",
        threshold: 80
      }
    }
  ],
  edges: [
    { source: "n1", target: "n2" },
    { source: "n2", target: "n3" }
  ]
};

const valid = validate(graph);

console.log("Graph valid:", valid);
console.log("Validation errors:", validate.errors || "No errors");

// Test 2: Invalid graph
const invalidGraph = {
  graphId: "g_102",
  name: "Invalid graph",
  nodes: [
    {
      id: "n1",
      type: "unknown.sensor",
      data: {}
    }
  ],
  edges: []
};

const invalidResult = validate(invalidGraph);

console.log("\n--- Invalid Graph Test ---");
console.log("Graph valid:", invalidResult);
console.log("Errors:", validate.errors || "No errors");

const duplicateGraph = {
  graphId: "g_103",
  name: "Duplicate node test",
  nodes: [
    {
      id: "n1",
      type: "source.sensor",
      data: {
        sensorId: "turbine-7",
        metric: "temperature"
      }
    },
    {
      id: "n1",
      type: "filter.movingAverage",
      data: {
        windowSize: 5
      }
    }
  ],
  edges: []
};

const duplicateResult = validateGraph(duplicateGraph);

console.log("\n--- Duplicate Node Test ---");
console.log("Graph valid:", duplicateResult.valid);
console.log("Errors:", duplicateResult.errors);

const cycleGraph = {
  graphId: "g_104",
  name: "Cycle detection test",
  nodes: [
    {
      id: "n1",
      type: "source.sensor",
      data: {
        sensorId: "turbine-7",
        metric: "temperature"
      }
    },
    {
      id: "n2",
      type: "filter.movingAverage",
      data: {
        windowSize: 5
      }
    },
    {
      id: "n3",
      type: "action.sms",
      data: {
        to: "+91XXXXXXXXXX",
        threshold: 80
      }
    }
  ],
  edges: [
    { source: "n1", target: "n2" },
    { source: "n2", target: "n3" },
    { source: "n3", target: "n1" }
  ]
};

const cycleResult = validateGraph(cycleGraph);

console.log("\n--- Cycle Detection Test ---");
console.log("Graph valid:", cycleResult.valid);
console.log("Errors:", cycleResult.errors);

const orphanGraph = {
  graphId: "g_105",
  name: "Orphan detection test",
  nodes: [
    {
      id: "n1",
      type: "source.sensor",
      data: {
        sensorId: "turbine-7",
        metric: "temperature"
      }
    },
    {
      id: "n2",
      type: "filter.movingAverage",
      data: {
        windowSize: 5
      }
    },
    {
      id: "n3",
      type: "action.sms",
      data: {
        to: "+91XXXXXXXXXX",
        threshold: 80
      }
    },
    {
      id: "n4",
      type: "source.sensor",
      data: {
        sensorId: "isolated-sensor",
        metric: "temperature"
      }
    }
  ],
  edges: [
    { source: "n1", target: "n2" },
    { source: "n2", target: "n3" }
  ]
};

const orphanResult = validateGraph(orphanGraph);

console.log("\n--- Orphan Detection Test ---");
console.log("Graph valid:", orphanResult.valid);
console.log("Errors:", orphanResult.errors);
