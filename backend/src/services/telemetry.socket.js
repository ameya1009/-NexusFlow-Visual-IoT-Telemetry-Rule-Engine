
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const { compileGraph } = require("./streamCompiler");

let io;

const activePipelines = new Map();

const initializeTelemetrySocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`IoT client connected: ${socket.id}`);

    // Subscribe to a device's telemetry room
    socket.on("telemetry:subscribe", (deviceId) => {
      if (typeof deviceId !== "string" || !deviceId.trim()) {
        socket.emit("telemetry:error", {
          message: "A valid device ID is required",
        });
        return;
      }

      const cleanId = deviceId.trim();

      socket.join(`device:${cleanId}`);

      socket.emit("telemetry:subscribed", {
        success: true,
        deviceId: cleanId,
      });
    });

    // Compile and activate a graph for a device
    socket.on("graph:compile", (graph) => {
      try {
        const pipeline = compileGraph(graph);

        const sensor = graph.nodes.find(
          (node) => node.type === "sensor"
        );

        const deviceId = sensor.data.deviceId.trim();

        // Replace an existing pipeline for this device
        const previous = activePipelines.get(deviceId);

        if (previous) {
          previous.subscription.unsubscribe();
          previous.pipeline.close();
        }

        const subscription = pipeline.output$.subscribe({
          next: (result) => {
            io.to(`device:${deviceId}`).emit(
              "telemetry:processed",
              result
            );

            result.alerts.forEach((alert) => {
              io.to(`device:${deviceId}`).emit(
                "telemetry:alert",
                alert
              );
            });
          },

          error: (error) => {
            console.error(
              "Stream pipeline error:",
              error.message
            );

            io.to(`device:${deviceId}`).emit(
              "pipeline:error",
              { message: error.message }
            );

            const active = activePipelines.get(deviceId);

            if (active?.pipeline === pipeline) {
              activePipelines.delete(deviceId);
            }

            pipeline.close();
          },
        });

        activePipelines.set(deviceId, {
          pipeline,
          subscription,
          ownerSocketId: socket.id,
        });

        socket.join(`device:${deviceId}`);

        socket.emit("graph:compiled", {
          success: true,
          deviceId,
          message: "RxJS telemetry pipeline activated",
        });

        console.log(
          `RxJS pipeline activated for ${deviceId}`
        );
      } catch (error) {
        socket.emit("graph:error", {
          success: false,
          message: error.message,
        });
      }
    });

    // Stop a device's active graph
    socket.on("graph:stop", (deviceId) => {
      const active = activePipelines.get(deviceId);

      if (!active || active.ownerSocketId !== socket.id) {
        socket.emit("graph:error", {
          message: "No owned active pipeline found for this device",
        });
        return;
      }

      active.subscription.unsubscribe();
      active.pipeline.close();
      activePipelines.delete(deviceId);

      socket.emit("graph:stopped", {
        success: true,
        deviceId,
      });
    });

    // Receive, validate and store live telemetry
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

        const deviceId = document.metadata.deviceId;

        // Broadcast original telemetry
        io.to(`device:${deviceId}`).emit(
          "telemetry:update",
          response
        );

        socket.emit("telemetry:stored", response);

        // Send the stored reading into the active RxJS pipeline
        const active = activePipelines.get(deviceId);

        if (active) {
          active.pipeline.telemetryInput$.next({
            ...document,
            deviceId,
          });
        }
      } catch (error) {
        console.error(
          "WebSocket telemetry error:",
          error.message
        );

        socket.emit("telemetry:error", {
          message: "Unable to store telemetry reading",
        });
      }
    });

    socket.on("disconnect", () => {
      // Stop pipelines owned by this disconnected client
      for (const [deviceId, active] of activePipelines) {
        if (active.ownerSocketId === socket.id) {
          active.subscription.unsubscribe();
          active.pipeline.close();
          activePipelines.delete(deviceId);

          console.log(
            `Stopped pipeline for ${deviceId}`
          );
        }
      }

      console.log(`IoT client disconnected: ${socket.id}`);
    });
  });

  console.log("NexusFlow WebSocket service initialized");

  return io;
};

module.exports = initializeTelemetrySocket;
