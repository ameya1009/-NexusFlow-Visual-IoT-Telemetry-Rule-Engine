/**
 * Telemetry validation middleware and helper functions.
 * Conforms to Shared Contract 4.2.
 */

const MAX_BATCH_SIZE = 5000;

/**
 * Validates an individual telemetry reading.
 * @param {Object} item 
 * @returns {{ valid: boolean, error?: string, normalized?: Object }}
 */
function validateTelemetryItem(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return { valid: false, error: "Reading must be a non-empty JSON object." };
  }

  // Validate metadata
  if (!item.metadata || typeof item.metadata !== "object") {
    return { valid: false, error: "Missing required 'metadata' object." };
  }

  if (!item.metadata.sensorId || typeof item.metadata.sensorId !== "string" || !item.metadata.sensorId.trim()) {
    return { valid: false, error: "Missing or invalid 'metadata.sensorId' (must be a non-empty string)." };
  }

  // Validate timestamp if provided; default to Date.now() if missing
  let timestamp = new Date();
  if (item.timestamp) {
    const parsed = new Date(item.timestamp);
    if (isNaN(parsed.getTime())) {
      return { valid: false, error: "Invalid 'timestamp' format. Must be a valid ISO Date or timestamp string." };
    }
    timestamp = parsed;
  }

  // Check that at least one metric is provided
  const keys = Object.keys(item).filter((k) => k !== "timestamp" && k !== "metadata");
  if (keys.length === 0) {
    return { valid: false, error: "Telemetry reading must contain at least one metric (e.g. temperature, vibration)." };
  }

  // Check metrics are numbers
  for (const k of keys) {
    if (typeof item[k] !== "number" || isNaN(item[k])) {
      return { valid: false, error: `Metric '${k}' must be a valid number.` };
    }
  }

  const normalized = {
    ...item,
    timestamp,
    metadata: {
      sensorId: item.metadata.sensorId.trim(),
      site: (item.metadata.site && typeof item.metadata.site === "string" ? item.metadata.site.trim() : "plant-A"),
    },
  };

  return { valid: true, normalized };
}

/**
 * Validates single reading or array of readings.
 * @param {Object|Array} body 
 * @returns {{ valid: boolean, error?: string, data?: Array }}
 */
function validateTelemetryPayload(body) {
  if (!body) {
    return { valid: false, error: "Request body cannot be empty." };
  }

  const isBatch = Array.isArray(body);
  const items = isBatch ? body : [body];

  if (items.length === 0) {
    return { valid: false, error: "Batch array cannot be empty." };
  }

  if (items.length > MAX_BATCH_SIZE) {
    return { valid: false, error: `Batch size exceeds maximum limit of ${MAX_BATCH_SIZE} readings.` };
  }

  const normalizedList = [];
  for (let i = 0; i < items.length; i++) {
    const result = validateTelemetryItem(items[i]);
    if (!result.valid) {
      return {
        valid: false,
        error: isBatch ? `Item [${i}]: ${result.error}` : result.error,
      };
    }
    normalizedList.push(result.normalized);
  }

  return {
    valid: true,
    data: normalizedList,
    isBatch,
  };
}

module.exports = {
  validateTelemetryItem,
  validateTelemetryPayload,
  MAX_BATCH_SIZE,
};
