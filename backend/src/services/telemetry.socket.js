
const { Server } = require("socket.io");
const mongoose = require("mongoose");

let io;

const initializeTelemetrySocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`IoT client connected: ${socket.id}`);

    socket.on("telemetry:subscribe", (deviceId) => {
      if (typeof deviceId !== "string" || !deviceId.trim()) {
        socket.emit("telemetry:error", {
          message: "A valid device ID is required",
        });
        return;
      }

      const room = `device:${deviceId.trim()}`;
      socket.join(room);

      socket.emit("telemetry:subscribed", {
        success: true,
        deviceId: deviceId.trim(),
      });
    });

    socket.on("telemetry:reading", async (reading) => {
      try {
        if (
          !reading ||
          typeof reading.deviceId !== "string" ||
          !reading.deviceId.trim() ||
          typeof reading.temperature !== "number" ||
          !Number.isFinite(reading.temperature) ||
          typeof reading.voltage !== "number" ||
          !Number.isFinite(reading.voltage) ||
          typeof reading.current !== "number" ||
          !Number.isFinite(reading.current)
        ) {
          socket.emit("telemetry:error", {
            message: "Invalid telemetry reading",
          });
          return;
        }

        if (
          reading.temperature < -50 ||
          reading.temperature > 200 ||
          reading.voltage < 0 ||
          reading.current < 0
        ) {
          socket.emit("telemetry:error", {
            message: "Telemetry values are outside allowed limits",
          });
          return;
        }

        const document = {
          timestamp: reading.timestamp
            ? new Date(reading.timestamp)
            : new Date(),
          metadata: {
            deviceId: reading.deviceId.trim(),
            location:
              typeof reading.location === "string" &&
              reading.location.trim()
                ? reading.location.trim()
                : "unknown",
          },
          temperature: reading.temperature,
          voltage: reading.voltage,
          current: reading.current,
        };

        if (Number.isNaN(document.timestamp.getTime())) {
          socket.emit("telemetry:error", {
            message: "Invalid timestamp",
          });
          return;
        }

        const collection =
          mongoose.connection.db.collection("telemetry");

        const result = await collection.insertOne(document);

        const response = {
          success: true,
          id: result.insertedId,
          ...document,
        };

        io.to(`device:${document.metadata.deviceId}`).emit(
          "telemetry:update",
          response
        );

        socket.emit("telemetry:stored", response);
      } catch (error) {
        console.error("WebSocket telemetry error:", error.message);

        socket.emit("telemetry:error", {
          message: "Unable to store telemetry reading",
        });
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`IoT client disconnected: ${socket.id}`, reason);
    });
  });

  console.log("NexusFlow WebSocket service initialized");

  return io;
};

module.exports = initializeTelemetrySocket;

