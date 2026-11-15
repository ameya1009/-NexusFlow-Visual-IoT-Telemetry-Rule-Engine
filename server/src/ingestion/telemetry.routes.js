const express = require("express");
const router = express.Router();
const { ingestTelemetry, getLatestTelemetry } = require("./telemetry.controller");

// High-speed single & batch ingestion endpoint (Member 1 Day 2)
router.post("/", ingestTelemetry);

// Query latest telemetry
router.get("/latest", getLatestTelemetry);

module.exports = router;
