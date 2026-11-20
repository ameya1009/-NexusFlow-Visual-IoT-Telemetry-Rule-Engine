const express = require("express");
const router = express.Router();
const {
  ingestTelemetry,
  getLatestTelemetry,
  queryTelemetry,
} = require("./telemetry.controller");
const createRateLimiter = require("./middleware/rateLimiter");

// Telemetry ingestion rate limiter (default: 1000 requests per minute)
const telemetryRateLimiter = createRateLimiter();

// High-speed single & batch ingestion endpoint protected with rate limiting & payload guards
router.post("/", telemetryRateLimiter, ingestTelemetry);

// High-performance time-range, sensor and metric query endpoint (Day 7)
router.get("/query", queryTelemetry);

// Query latest telemetry
router.get("/latest", getLatestTelemetry);

module.exports = router;
