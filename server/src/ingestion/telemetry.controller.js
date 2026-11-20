const Telemetry = require("./models/telemetry.model");
const { validateTelemetryPayload } = require("./telemetry.validator");
const telemetryBus = require("./services/telemetryBus");

/**
 * Handle high-speed single or batch telemetry ingestion.
 * Conforms to Member 1 Week 1 Day 2 & Week 2 Day 7/8 deliverables.
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
        insertedDocs = insertError.insertedDocs;
      } else {
        throw insertError;
      }
    }

    // Publish to in-process EventBus for Member 2 (Compiler) & WebSocket Broadcaster (Member 3)
    try {
      const recordsToPublish = insertedDocs && insertedDocs.length > 0 ? insertedDocs : data;
      telemetryBus.publish(recordsToPublish);
    } catch (busError) {
      console.warn("[TelemetryController] Warning: Failed to publish to event bus:", busError.message);
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
 * High-performance time-range and sensor query endpoint.
 * Route: GET /api/telemetry/query
 * 
 * Supports:
 * - sensorId: filter by metadata.sensorId
 * - site: filter by metadata.site
 * - startTime: ISO timestamp or milliseconds (inclusive start)
 * - endTime: ISO timestamp or milliseconds (inclusive end)
 * - metric: specific metric required (e.g. temperature, vibration)
 * - minVal / maxVal: range filters for metric
 * - limit: max records to return (default: 100, max: 5000)
 * - page: pagination offset page (default: 1)
 * - sort: 'desc' (default) or 'asc'
 */
const queryTelemetry = async (req, res, next) => {
  try {
    const {
      sensorId,
      site,
      startTime,
      endTime,
      metric,
      minVal,
      maxVal,
      limit = 100,
      page = 1,
      sort = "desc",
    } = req.query;

    const query = {};

    // Sensor & Site Filters
    if (sensorId) {
      query["metadata.sensorId"] = String(sensorId).trim();
    }
    if (site) {
      query["metadata.site"] = String(site).trim();
    }

    // Time-Range Filters
    if (startTime || endTime) {
      query.timestamp = {};

      if (startTime) {
        const start = new Date(startTime);
        if (isNaN(start.getTime())) {
          return res.status(400).json({
            success: false,
            error: "Invalid startTime format. Provide a valid ISO 8601 date string or timestamp.",
          });
        }
        query.timestamp.$gte = start;
      }

      if (endTime) {
        const end = new Date(endTime);
        if (isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            error: "Invalid endTime format. Provide a valid ISO 8601 date string or timestamp.",
          });
        }
        query.timestamp.$lte = end;
      }

      // Check logical validity
      if (startTime && endTime && query.timestamp.$gte > query.timestamp.$lte) {
        return res.status(400).json({
          success: false,
          error: "startTime cannot be greater than endTime.",
        });
      }
    }

    // Metric Existence & Value Filters
    if (metric) {
      const metricKey = String(metric).trim();
      query[metricKey] = { $exists: true, $ne: null };

      if (minVal !== undefined || maxVal !== undefined) {
        query[metricKey] = {};
        if (minVal !== undefined) {
          const parsedMin = Number(minVal);
          if (isNaN(parsedMin)) {
            return res.status(400).json({ success: false, error: "minVal must be a numeric value." });
          }
          query[metricKey].$gte = parsedMin;
        }
        if (maxVal !== undefined) {
          const parsedMax = Number(maxVal);
          if (isNaN(parsedMax)) {
            return res.status(400).json({ success: false, error: "maxVal must be a numeric value." });
          }
          query[metricKey].$lte = parsedMax;
        }
      }
    }

    // Pagination & Sorting
    const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 100, 5000));
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const skip = (parsedPage - 1) * parsedLimit;
    const sortDirection = sort === "asc" ? 1 : -1;

    // Execute query with lean for performance
    const readings = await Telemetry.find(query)
      .sort({ timestamp: sortDirection })
      .skip(skip)
      .limit(parsedLimit)
      .lean();

    return res.status(200).json({
      success: true,
      count: readings.length,
      page: parsedPage,
      limit: parsedLimit,
      sort: sort === "asc" ? "asc" : "desc",
      filters: {
        sensorId: sensorId || null,
        site: site || null,
        startTime: startTime || null,
        endTime: endTime || null,
        metric: metric || null,
      },
      data: readings,
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
  queryTelemetry,
  getLatestTelemetry,
};
