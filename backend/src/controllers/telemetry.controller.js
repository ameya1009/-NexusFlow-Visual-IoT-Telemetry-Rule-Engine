
const mongoose = require("mongoose");

const ingestTelemetry = async (req, res, next) => {
  try {
    const {
      deviceId,
      location,
      temperature,
      voltage,
      current,
      timestamp,
    } = req.body;

    if (typeof deviceId !== "string" || !deviceId.trim()) {
      return res.status(400).json({
        success: false,
        message: "A valid deviceId is required",
      });
    }

    for (const [field, value] of Object.entries({
      temperature,
      voltage,
      current,
    })) {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return res.status(400).json({
          success: false,
          message: `${field} must be a valid number`,
        });
      }
    }

    if (temperature < -50 || temperature > 200) {
      return res.status(400).json({
        success: false,
        message: "Temperature must be between -50 and 200",
      });
    }

    if (voltage < 0 || current < 0) {
      return res.status(400).json({
        success: false,
        message: "Voltage and current cannot be negative",
      });
    }

    const readingTime =
      timestamp === undefined ? new Date() : new Date(timestamp);

    if (Number.isNaN(readingTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid timestamp",
      });
    }

    const telemetryDocument = {
      timestamp: readingTime,
      metadata: {
        deviceId: deviceId.trim(),
        location:
          typeof location === "string" && location.trim()
            ? location.trim()
            : "unknown",
      },
      temperature,
      voltage,
      current,
    };

    const collection = mongoose.connection.db.collection("telemetry");
    const result = await collection.insertOne(telemetryDocument);

    return res.status(201).json({
      success: true,
      message: "Telemetry reading stored successfully",
      data: {
        id: result.insertedId,
        ...telemetryDocument,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getTelemetry = async (req, res, next) => {
  try {
    const { deviceId, limit = "100" } = req.query;

    const parsedLimit = Number(limit);

    if (
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > 1000
    ) {
      return res.status(400).json({
        success: false,
        message: "Limit must be an integer between 1 and 1000",
      });
    }

    const filter = {};

    if (deviceId !== undefined) {
      if (typeof deviceId !== "string" || !deviceId.trim()) {
        return res.status(400).json({
          success: false,
          message: "A valid deviceId filter is required",
        });
      }

      filter["metadata.deviceId"] = deviceId.trim();
    }

    const collection = mongoose.connection.db.collection("telemetry");

    const readings = await collection
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(parsedLimit)
      .toArray();

    return res.status(200).json({
      success: true,
      count: readings.length,
      data: readings,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  ingestTelemetry,
  getTelemetry,
};
