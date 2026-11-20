const { Server } = require("socket.io");
const telemetryBus = require("./telemetryBus");

let ioInstance = null;
let busUnsubscribers = [];

/**
 * Initialize Socket.IO server and bridge to telemetryEventBus.
 * Conforms to Member 1 Week 2 Day 8 deliverables & Contract 4.3.
 * 
 * Events emitted to connected clients:
 * - 'telemetry:update' -> Live sensor readings pushed after ingestion
 * - 'alert:fired'      -> Alerts evaluated by rule engine
 * - 'node:active'      -> Data flowing through active graph node
 * 
 * @param {import("http").Server} httpServer - Node HTTP server instance
 * @param {Object} options - Custom Socket.io configuration options
 * @returns {Server} Socket.io server instance
 */
const initSocket = (httpServer, options = {}) => {
  if (ioInstance) {
    return ioInstance;
  }

  const defaultOptions = {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 20000,
    pingInterval: 10000,
  };

  const io = new Server(httpServer, { ...defaultOptions, ...options });
  ioInstance = io;

  // Active socket tracking
  let connectedClients = 0;

  io.on("connection", (socket) => {
    connectedClients += 1;
    console.log(`[WebSocket] Client connected: ${socket.id} (Total: ${connectedClients})`);

    // Acknowledge connection
    socket.emit("connected", {
      status: "connected",
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });

    // Room subscription: subscribe to specific sensor stream
    socket.on("subscribe:sensor", (payload) => {
      const sensorId = typeof payload === "string" ? payload : payload?.sensorId;
      if (sensorId) {
        const room = `sensor:${sensorId}`;
        socket.join(room);
        socket.emit("subscribed", { sensorId, room });
      }
    });

    // Unsubscribe from specific sensor stream
    socket.on("unsubscribe:sensor", (payload) => {
      const sensorId = typeof payload === "string" ? payload : payload?.sensorId;
      if (sensorId) {
        const room = `sensor:${sensorId}`;
        socket.leave(room);
        socket.emit("unsubscribed", { sensorId, room });
      }
    });

    socket.on("disconnect", (reason) => {
      connectedClients = Math.max(0, connectedClients - 1);
      console.log(`[WebSocket] Client disconnected: ${socket.id} (${reason}). Remaining: ${connectedClients}`);
    });
  });

  // Bridge TelemetryEventBus -> WebSocket Broadcasts
  const unsubTelemetry = telemetryBus.onTelemetryUpdate((reading) => {
    // 1. Global broadcast to all connected clients
    io.emit("telemetry:update", reading);

    // 2. Targeted broadcast to sensor-specific room
    const sensorId = reading.metadata?.sensorId || reading.sensorId || reading.deviceId;
    if (sensorId) {
      io.to(`sensor:${sensorId}`).emit("telemetry:update", reading);
    }
  });

  const onAlert = (alert) => {
    io.emit("alert:fired", alert);
  };
  telemetryBus.on(telemetryBus.EVENTS.ALERT_FIRED, onAlert);

  const onNodeActive = (nodeData) => {
    io.emit("node:active", nodeData);
  };
  telemetryBus.on(telemetryBus.EVENTS.NODE_ACTIVE, onNodeActive);

  busUnsubscribers = [
    unsubTelemetry,
    () => telemetryBus.off(telemetryBus.EVENTS.ALERT_FIRED, onAlert),
    () => telemetryBus.off(telemetryBus.EVENTS.NODE_ACTIVE, onNodeActive),
  ];

  return io;
};

/**
 * Get the active Socket.IO server instance
 */
const getIO = () => {
  return ioInstance;
};

/**
 * Close Socket.IO server and clean up event listeners
 */
const closeSocket = async () => {
  for (const unsub of busUnsubscribers) {
    try {
      unsub();
    } catch (_) {}
  }
  busUnsubscribers = [];

  if (ioInstance) {
    return new Promise((resolve) => {
      ioInstance.close(() => {
        ioInstance = null;
        resolve();
      });
    });
  }
};

/**
 * Direct broadcast helpers
 */
const broadcastTelemetry = (reading) => {
  if (ioInstance) {
    ioInstance.emit("telemetry:update", reading);
  }
};

const broadcastAlert = (alert) => {
  if (ioInstance) {
    ioInstance.emit("alert:fired", alert);
  }
};

const broadcastNodeActive = (nodeData) => {
  if (ioInstance) {
    ioInstance.emit("node:active", nodeData);
  }
};

module.exports = {
  initSocket,
  getIO,
  closeSocket,
  broadcastTelemetry,
  broadcastAlert,
  broadcastNodeActive,
};
