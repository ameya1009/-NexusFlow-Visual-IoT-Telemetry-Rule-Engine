
const express = require("express");

const {
  ingestTelemetry,
  getTelemetry,
} = require("../controllers/telemetry.controller");

const router = express.Router();

router.post("/", ingestTelemetry);
router.get("/", getTelemetry);

module.exports = router;
