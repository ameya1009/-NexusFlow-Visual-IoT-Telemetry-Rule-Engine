const { test, describe, before, after } = require("node:test");
const assert = require("node:assert");
const http = require("http");
const { io: Client } = require("socket.io-client");
const { app } = require("../src/server");
const { initSocket, closeSocket } = require("../src/ingestion/services/telemetrySocket");
const telemetryBus = require("../src/ingestion/services/telemetryBus");

describe("Week 2 Day 8 — WebSocket Server & Real-Time Broadcast Tests", () => {
  let serverInstance;
  let serverPort;
  let ioServer;
  let clientSocket;

  before(async () => {
    return new Promise((resolve) => {
      serverInstance = http.createServer(app);
      ioServer = initSocket(serverInstance);

      serverInstance.listen(0, "127.0.0.1", () => {
        serverPort = serverInstance.address().port;
        resolve();
      });
    });
  });

  after(async () => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
    await closeSocket();
    return new Promise((resolve) => {
      serverInstance.close(resolve);
    });
  });

  test("Client establishes WebSocket connection and receives handshake acknowledgment", async () => {
    return new Promise((resolve, reject) => {
      clientSocket = Client(`http://127.0.0.1:${serverPort}`, {
        transports: ["websocket"],
      });

      clientSocket.on("connect", () => {
        assert.ok(clientSocket.connected);
      });

      clientSocket.on("connected", (data) => {
        assert.strictEqual(data.status, "connected");
        assert.ok(data.socketId);
        assert.ok(data.timestamp);
        resolve();
      });

      clientSocket.on("connect_error", (err) => {
        reject(err);
      });
    });
  });

  test("WebSocket broadcasts telemetry:update event when telemetryBus publishes reading", async () => {
    return new Promise((resolve) => {
      const expectedSensorId = "turbine-live-99";
      const expectedTemp = 86.4;

      clientSocket.once("telemetry:update", (reading) => {
        assert.strictEqual(reading.metadata.sensorId, expectedSensorId);
        assert.strictEqual(reading.temperature, expectedTemp);
        assert.strictEqual(reading.deviceId, expectedSensorId);
        resolve();
      });

      telemetryBus.publish({
        timestamp: new Date().toISOString(),
        metadata: { sensorId: expectedSensorId, site: "plant-A" },
        temperature: expectedTemp,
        vibration: 0.28,
      });
    });
  });

  test("WebSocket supports room subscription via subscribe:sensor", async () => {
    return new Promise((resolve) => {
      const targetSensor = "turbine-room-1";

      clientSocket.once("subscribed", (subData) => {
        assert.strictEqual(subData.sensorId, targetSensor);
        assert.strictEqual(subData.room, `sensor:${targetSensor}`);

        // Set up listener for targeted update
        clientSocket.once("telemetry:update", (reading) => {
          assert.strictEqual(reading.metadata.sensorId, targetSensor);
          resolve();
        });

        // Trigger reading
        telemetryBus.publish({
          timestamp: new Date().toISOString(),
          metadata: { sensorId: targetSensor, site: "plant-B" },
          temperature: 78.9,
        });
      });

      clientSocket.emit("subscribe:sensor", { sensorId: targetSensor });
    });
  });

  test("WebSocket broadcasts alert:fired event from rule engine bus", async () => {
    return new Promise((resolve) => {
      clientSocket.once("alert:fired", (alert) => {
        assert.strictEqual(alert.graphId, "graph-alarm-1");
        assert.strictEqual(alert.nodeId, "n3-sms");
        assert.strictEqual(alert.value, 94.2);
        assert.strictEqual(alert.alertType, "OVERHEAT");
        resolve();
      });

      telemetryBus.publishAlert({
        graphId: "graph-alarm-1",
        nodeId: "n3-sms",
        value: 94.2,
        alertType: "OVERHEAT",
        time: new Date().toISOString(),
      });
    });
  });

  test("WebSocket broadcasts node:active event for canvas wire animation", async () => {
    return new Promise((resolve) => {
      clientSocket.once("node:active", (nodeData) => {
        assert.strictEqual(nodeData.graphId, "graph-alarm-1");
        assert.strictEqual(nodeData.nodeId, "n2-ma");
        assert.strictEqual(nodeData.value, 83.1);
        resolve();
      });

      telemetryBus.publishNodeActive({
        graphId: "graph-alarm-1",
        nodeId: "n2-ma",
        value: 83.1,
      });
    });
  });
});
