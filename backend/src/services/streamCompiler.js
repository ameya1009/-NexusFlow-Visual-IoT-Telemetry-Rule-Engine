
const {
  Subject,
  scan,
  map,
  filter,
  tap
} = require("rxjs");

// Supported graph node types
const SUPPORTED_NODES = [
  "sensor",
  "movingAverage",
  "rule",
  "alert"
];

// Validate graph structure
function validateGraph(graph) {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    throw new Error("Graph must contain nodes and edges arrays");
  }

  if (graph.nodes.length === 0) {
    throw new Error("Graph must contain at least one node");
  }

  const nodeIds = new Set();

  for (const node of graph.nodes) {
    if (!node.id || !node.type) {
      throw new Error("Every node must have an id and type");
    }

    if (nodeIds.has(node.id)) {
      throw new Error(`Duplicate node ID: ${node.id}`);
    }

    nodeIds.add(node.id);

    if (!SUPPORTED_NODES.includes(node.type)) {
      throw new Error(`Unsupported node type: ${node.type}`);
    }

    if (node.type === "sensor" && !node.data?.deviceId) {
      throw new Error(`Sensor ${node.id} requires a deviceId`);
    }

    if (node.type === "movingAverage") {
      const size = node.data?.windowSize;

      if (!Number.isInteger(size) || size < 1 || size > 1000) {
        throw new Error(
          `Moving average ${node.id} requires windowSize between 1 and 1000`
        );
      }
    }

    if (node.type === "rule") {
      const { field, operator, value } = node.data || {};

      if (
        !["temperature", "voltage", "current"].includes(field) ||
        ![">", ">=", "<", "<=", "==", "!="].includes(operator) ||
        typeof value !== "number" ||
        !Number.isFinite(value)
      ) {
        throw new Error(`Rule ${node.id} has invalid configuration`);
      }
    }
  }

  const edgePairs = new Set();

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      throw new Error("Edge references a node that does not exist");
    }

    if (edge.source === edge.target) {
      throw new Error("Self-connections are not allowed");
    }

    const pair = `${edge.source}->${edge.target}`;

    if (edgePairs.has(pair)) {
      throw new Error(`Duplicate edge: ${pair}`);
    }

    edgePairs.add(pair);
  }

  return true;
}

// Check whether a rule matches a telemetry reading
function evaluateRule(reading, rule) {
  const actual = reading[rule.field];
  const expected = rule.value;

  if (typeof actual !== "number" || !Number.isFinite(actual)) {
    return false;
  }

  switch (rule.operator) {
    case ">": return actual > expected;
    case ">=": return actual >= expected;
    case "<": return actual < expected;
    case "<=": return actual <= expected;
    case "==": return actual === expected;
    case "!=": return actual !== expected;
    default: return false;
  }
}

// Create an executable RxJS pipeline
function compileGraph(graph) {
  validateGraph(graph);

  const sensors = graph.nodes.filter(
    node => node.type === "sensor"
  );

  if (sensors.length !== 1) {
    throw new Error("Version 1 supports exactly one sensor node");
  }

  const sensor = sensors[0];

  const incoming = new Map(
    graph.nodes.map(node => [node.id, []])
  );

  for (const edge of graph.edges) {
    incoming.get(edge.target).push(edge.source);
  }

  // Process nodes in topological order
  const orderedNodes = [];
  const visited = new Set();
  const visiting = new Set();

  function visit(nodeId) {
    if (visiting.has(nodeId)) {
      throw new Error("Graph contains a cycle");
    }

    if (visited.has(nodeId)) return;

    visiting.add(nodeId);

    for (const parentId of incoming.get(nodeId)) {
      visit(parentId);
    }

    visiting.delete(nodeId);
    visited.add(nodeId);

    orderedNodes.push(
      graph.nodes.find(node => node.id === nodeId)
    );
  }

  graph.nodes.forEach(node => visit(node.id));

  // Ensure all processing nodes are connected to the sensor
  const reachable = new Set([sensor.id]);

  for (const node of orderedNodes) {
    if (node.id === sensor.id) continue;

    if (incoming.get(node.id).some(id => reachable.has(id))) {
      reachable.add(node.id);
    } else {
      throw new Error(`Node ${node.id} is not connected to the sensor`);
    }
  }

  // A separate state is maintained for each moving average node
  const averageStates = new Map();

  for (const node of graph.nodes) {
    if (node.type === "movingAverage") {
      averageStates.set(node.id, []);
    }
  }

  const telemetryInput$ = new Subject();

  const output$ = telemetryInput$.pipe(
    map(reading => {
      if (!reading || typeof reading !== "object") {
        throw new Error("Telemetry reading must be an object");
      }

      if (reading.deviceId !== sensor.data.deviceId) {
        throw new Error("Telemetry deviceId does not match sensor");
      }

      return { ...reading };
    }),

    map(reading => {
      const results = {};
      const alerts = [];

      for (const node of orderedNodes) {
        if (node.type === "sensor") {
          results[node.id] = { ...reading };
          continue;
        }

        const parentId = incoming.get(node.id)[0];
        const parentValue = results[parentId];

        if (node.type === "movingAverage") {
          const field = node.data?.field || "temperature";

          const value = parentValue[field];

          if (typeof value !== "number" || !Number.isFinite(value)) {
            throw new Error(
              `Invalid numeric field ${field} for ${node.id}`
            );
          }

          const values = averageStates.get(node.id);

          values.push(value);

          if (values.length > node.data.windowSize) {
            values.shift();
          }

          const average =
            values.reduce((sum, item) => sum + item, 0) /
            values.length;

          results[node.id] = {
            ...parentValue,
            [field]: average,
            movingAverage: {
              field,
              value: average,
              samples: values.length
            }
          };

          continue;
        }

        if (node.type === "rule") {
          const matched = evaluateRule(
            parentValue,
            node.data
          );

          results[node.id] = {
            ...parentValue,
            ruleMatched: matched,
            ruleId: node.id
          };

          continue;
        }

        if (node.type === "alert") {
          const ruleParent = incoming.get(node.id)
            .map(id => results[id])
            .find(result =>
              result && typeof result.ruleMatched === "boolean"
            );

          if (ruleParent?.ruleMatched) {
            alerts.push({
              nodeId: node.id,
              message:
                node.data?.message || "Telemetry threshold exceeded",
              deviceId: reading.deviceId,
              timestamp: new Date().toISOString()
            });
          }

          results[node.id] = {
            ...parentValue,
            alerts
          };
        }
      }

      return {
        deviceId: reading.deviceId,
        processedAt: new Date().toISOString(),
        results,
        alerts
      };
    })
  );

  return {
    telemetryInput$,
    output$,
    close() {
      telemetryInput$.complete();
    }
  };
}

module.exports = {
  validateGraph,
  evaluateRule,
  compileGraph
};
