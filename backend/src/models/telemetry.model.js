
const mongoose = require("mongoose");

const telemetrySchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      required: true,
    },
    metadata: {
      deviceId: {
        type: String,
        required: true,
        trim: true,
      },
      location: {
        type: String,
        trim: true,
        default: "unknown",
      },
    },
    temperature: {
      type: Number,
      required: true,
      min: -50,
      max: 200,
    },
    voltage: {
      type: Number,
      required: true,
      min: 0,
    },
    current: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    collection: "telemetry",
    versionKey: false,
  }
);

const Telemetry = mongoose.model("Telemetry", telemetrySchema);

module.exports = Telemetry;
