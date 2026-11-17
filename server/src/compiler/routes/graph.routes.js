
const express = require("express");

const {
  createGraph,
  getGraphById,
} = require("../controllers/graph.controller");

const router = express.Router();

// Save a graph
router.post("/", createGraph);

// Retrieve a graph by graphId
router.get("/:id", getGraphById);

module.exports = router;
