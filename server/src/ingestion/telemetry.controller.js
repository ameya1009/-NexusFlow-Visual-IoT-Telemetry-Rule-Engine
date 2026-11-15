const Telemetry = require("./models/telemetry.model");
const { validateTelemetryPayload } = require("./telemetry.validator");

/**
 * Handle high-speed single or batch telemetry ingestion.
 * Conforms to Member 1 Week 1 Day 2 deliverables.
 * Route: POST /api/telemetry
 */
const ingestTelemetry = async (req, res, next) => {
  try {
    const validation = validateTelemetryPayload(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validation.error,
      });
    }

    const { data, isBatch } = validation;

    // Use insertMany with ordered: false for maximum ingestion throughput
    let insertedCount = data.length;
    let insertedDocs = [];

    try {
      insertedDocs = await Telemetry.insertMany(data, { ordered: false });
      insertedCount = insertedDocs.length;
    } catch (insertError) {
      // In case of duplicate keys or partial write failures with ordered: false
      if (insertError.insertedDocs) {
        insertedCount = insertError.insertedDocs.length;
      } else {
        throw insertError;
      }
    }

    return res.status(201).json({
      success: true,
      message: isBatch
        ? `Successfully ingested batch of ${insertedCount} telemetry readings.`
        : "Successfully ingested telemetry reading.",
      count: insertedCount,
      timestamp: new Date().toISOString(),
      sample: isBatch ? data[0] : data[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Quick query to fetch latest readings by sensorId.
 * Route: GET /api/telemetry/latest?sensorId=...&limit=10
 */
const getLatestTelemetry = async (req, res, next) => {
  try {
    const { sensorId, limit = 10 } = req.query;

    const query = {};
    if (sensorId) {
      query["metadata.sensorId"] = sensorId;
    }

    const readings = await Telemetry.find(query)
      .sort({ timestamp: -1 })
      .limit(Math.min(parseInt(limit, 10) || 10, 100))
      .lean();

    return res.status(200).json({
      success: true,
      count: readings.length,
      data: readings,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  ingestTelemetry,
  getLatestTelemetry,
};
