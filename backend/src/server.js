
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const mongoose = require("mongoose");

const connectDB = require("./config/database");
const telemetryRoutes = require("./routes/telemetry.routes");
const initializeTelemetrySocket = require("./services/telemetry.socket");

const app = express();
const httpServer = http.createServer(app);

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "NexusFlow IoT Telemetry & Rule Engine API is running",
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    server: "running",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
    websocket: "enabled",
  });
});

app.use("/api/telemetry", telemetryRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

app.use((err, req, res, next) => {
  console.error("API error:", err.message);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

const startServer = async () => {
  try {
    await connectDB();

    initializeTelemetrySocket(httpServer);

    const PORT = process.env.PORT || 5000;

    httpServer.listen(PORT, "127.0.0.1", () => {
      console.log(`NexusFlow server running at http://localhost:${PORT}`);
      console.log("Telemetry API: POST /api/telemetry");
      console.log("Telemetry API: GET /api/telemetry");
      console.log("WebSocket service: enabled");
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
