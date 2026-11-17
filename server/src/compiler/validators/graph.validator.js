
const Ajv = require("ajv");
const graphSchema = require("../schemas/graph.schema");

const ajv = new Ajv({
  allErrors: true,
  strict: false
});

const validateGraphSchema = ajv.compile(graphSchema);

function validateGraph(graph) {
  const errors = [];

  // 1. Validate JSON structure using Ajv
  const schemaValid = validateGraphSchema(graph);

  if (!schemaValid) {
    errors.push(
      ...validateGraphSchema.errors.map((error) => ({
        field: error.instancePath || "/",
        message: error.message
      }))
    );

    return { valid: false, errors };
  }

  const nodeIds = new Set();
  const adjacencyList = new Map();

  // 2. Check duplicate node IDs
  for (const node of graph.nodes) {
    if (nodeIds.has(node.id)) {
      errors.push({
        field: `/nodes/${node.id}`,
        message: `Duplicate node ID: ${node.id}`
      });
    }

    nodeIds.add(node.id);
    adjacencyList.set(node.id, []);
  }

  // 3. Validate edges
  const edgeSet = new Set();

  for (const edge of graph.edges) {
    const { source, target } = edge;
    const edgeKey = `${source}->${target}`;

    if (!nodeIds.has(source) || !nodeIds.has(target)) {
      errors.push({
        field: "/edges",
        message: `Edge references an unknown node: ${source} -> ${target}`
      });
      continue;
    }

    if (source === target) {
      errors.push({
        field: "/edges",
        message: `Self-connection detected at node: ${source}`
      });
      continue;
    }

    if (edgeSet.has(edgeKey)) {
      errors.push({
        field: "/edges",
        message: `Duplicate edge: ${edgeKey}`
      });
      continue;
    }

    edgeSet.add(edgeKey);
    adjacencyList.get(source).push(target);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // 4. Detect cycles using DFS
  const visited = new Set();
  const recursionStack = new Set();
  let hasCycle = false;

  function detectCycle(nodeId) {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    for (const neighbor of adjacencyList.get(nodeId)) {
      if (!visited.has(neighbor)) {
        if (detectCycle(neighbor)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const nodeId of nodeIds) {
    if (!visited.has(nodeId) && detectCycle(nodeId)) {
      hasCycle = true;
      break;
    }
  }

  if (hasCycle) {
    errors.push({
      field: "/edges",
      message: "Cycle detected in graph"
    });
  }

  
  // 5. Detect disconnected nodes
  const undirectedGraph = new Map();

  for (const nodeId of nodeIds) {
    undirectedGraph.set(nodeId, []);
  }

  // Treat edges as connections in both directions
  for (const edge of graph.edges) {
    if (
      nodeIds.has(edge.source) &&
      nodeIds.has(edge.target)
    ) {
      undirectedGraph.get(edge.source).push(edge.target);
      undirectedGraph.get(edge.target).push(edge.source);
    }
  }

  // Start from the first node and visit its connected component
  const connectedNodes = new Set();

  function markConnected(nodeId) {
    if (connectedNodes.has(nodeId)) return;

    connectedNodes.add(nodeId);

    for (const neighbor of undirectedGraph.get(nodeId)) {
      markConnected(neighbor);
    }
  }

  const firstNode = graph.nodes[0];

  if (firstNode) {
    markConnected(firstNode.id);
  }

 
  // Any unvisited node belongs to a disconnected component
  for (const nodeId of nodeIds) {
    if (!connectedNodes.has(nodeId)) {
      errors.push({
        field: `/nodes/${nodeId}`,
        message: `Node is disconnected: ${nodeId}`
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateGraph
};

