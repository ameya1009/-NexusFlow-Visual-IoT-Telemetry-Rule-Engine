require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const mongoose = require("mongoose");
const connectDB = require("./config/database");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// Core Middleware
app.use(
  cors({
    origin: [CLIENT_URL, "http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

// Payload size guard for telemetry data ingestion
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Root Information Endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    name: "NexusFlow Visual IoT Telemetry & Rule Engine API",
    status: "online",
    version: "1.0.0",
    docs: "/docs/contracts.md",
  });
});

// System Health Check Endpoint
app.get("/api/health", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  res.status(200).json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      server: "running",
      database: dbStatusMap[dbState] || "unknown",
    },
  });
});

// Module placeholder routes - populated in upcoming Week 1 days
// Member 1: app.use("/api/telemetry", telemetryRoutes);
// Member 2: app.use("/api/graphs", graphRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    path: req.originalUrl,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("[Server Error]", err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
});

/**
 * Start Server & Establish DB Connection
 */
const start = async () => {
  await connectDB();

  server.listen(PORT, () => {
    console.log(`[NexusFlow Server] Running on port ${PORT}`);
    console.log(`[NexusFlow Server] Health check available at http://localhost:${PORT}/api/health`);
  });
};

if (require.main === module) {
  start();
}

module.exports = { app, server };
