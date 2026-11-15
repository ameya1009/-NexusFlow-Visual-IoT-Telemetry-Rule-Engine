const mongoose = require("mongoose");

/**
 * MongoDB Time-Series Schema for NexusFlow IoT Telemetry.
 * Conforms to PDF Contract Section 4.2.
 * 
 * Spec:
 * - timeseries collection: timeField = "timestamp", metaField = "metadata", granularity = "seconds"
 * - metadata: { sensorId: string, site: string }
 * - metrics: temperature, vibration, etc.
 */
const telemetrySchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    metadata: {
      sensorId: {
        type: String,
        required: [true, "metadata.sensorId is required"],
        trim: true,
        index: true,
      },
      site: {
        type: String,
        trim: true,
        default: "plant-A",
      },
    },
    temperature: {
      type: Number,
    },
    vibration: {
      type: Number,
    },
  },
  {
    timeseries: {
      timeField: "timestamp",
      metaField: "metadata",
      granularity: "seconds",
    },
    collection: "telemetry",
    strict: false, // Allows arbitrary sensor metrics (pressure, humidity, etc.) alongside defaults
    versionKey: false,
  }
);

// Compound index on sensorId and timestamp for high-performance time-range reads
telemetrySchema.index({ "metadata.sensorId": 1, timestamp: -1 });

const Telemetry = mongoose.model("Telemetry", telemetrySchema);

module.exports = Telemetry;
