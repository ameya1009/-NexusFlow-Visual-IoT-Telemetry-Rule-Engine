
const Graph = require("../../models/graph.model");
const { validateGraph } = require("../validators/graph.validator");

// POST /api/graphs
const createGraph = async (req, res) => {
  try {
    const graphData = req.body;

    const validationResult = validateGraph(graphData);

    if (!validationResult.valid) {
      return res.status(400).json({
        success: false,
        message: "Invalid graph data",
        errors: validationResult.errors,
      });
    }

    const graph = await Graph.create(graphData);

    return res.status(201).json({
      success: true,
      message: "Graph saved successfully",
      data: graph,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A graph with this graphId already exists",
      });
    }

    console.error("Create graph error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to save graph",
    });
  }
};

// GET /api/graphs/:id
const getGraphById = async (req, res) => {
  try {
    const graph = await Graph.findOne({
      graphId: req.params.id,
    });

    if (!graph) {
      return res.status(404).json({
        success: false,
        message: "Graph not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Graph retrieved successfully",
      data: graph,
    });
  } catch (error) {
    console.error("Get graph error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve graph",
    });
  }
};

module.exports = {
  createGraph,
  getGraphById,
};
