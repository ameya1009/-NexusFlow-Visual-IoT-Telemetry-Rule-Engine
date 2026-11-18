
const mongoose = require("mongoose");

const graphSchema = new mongoose.Schema(
  {
    graphId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    nodes: {
      type: [mongoose.Schema.Types.Mixed],
      required: true,
    },

    edges: {
      type: [mongoose.Schema.Types.Mixed],
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Graph = mongoose.model("Graph", graphSchema);

module.exports = Graph;
