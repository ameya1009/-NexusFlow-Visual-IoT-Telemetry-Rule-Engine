
const { io } = require("socket.io-client");

const SERVER_URL = "http://127.0.0.1:5000";
const DEVICE_ID = "TURBINE-WS-001";

const socket = io(SERVER_URL, {
  reconnection: false,
  timeout: 5000,
});

let finished = false;

function finish(code) {
  if (finished) return;
  finished = true;
  socket.disconnect();
  process.exitCode = code;
}

const timeout = setTimeout(() => {
  console.error("Test failed: timed out waiting for server response.");
  finish(1);
}, 10000);

socket.on("connect", () => {
  console.log("Connected to NexusFlow WebSocket server.");
  console.log("Socket ID:", socket.id);

  socket.emit("telemetry:subscribe", DEVICE_ID);
});

socket.on("telemetry:subscribed", (response) => {
  console.log("Subscription confirmed:", response);

  socket.emit("telemetry:reading", {
    deviceId: DEVICE_ID,
    location: "Factory-A",
    temperature: 78.5,
    voltage: 231.2,
    current: 13.6,
  });
});

socket.on("telemetry:update", (data) => {
  console.log("Live telemetry update received:");
  console.log(data);
});

socket.on("telemetry:stored", (data) => {
  console.log("Telemetry successfully stored in MongoDB:");
  console.log(data);

  clearTimeout(timeout);
  console.log("WebSocket test passed.");
  finish(0);
});

socket.on("telemetry:error", (error) => {
  console.error("Server reported an error:", error);
  clearTimeout(timeout);
  finish(1);
});

socket.on("connect_error", (error) => {
  console.error("Connection failed:", error.message);
  clearTimeout(timeout);
  finish(1);
});
