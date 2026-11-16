#!/usr/bin/env node

/**
 * NexusFlow IoT Mock Sensor Telemetry Generator
 * Conforms to Shared Contract Section 4.2 & Member 1 Week 1 Day 3 Deliverables.
 * 
 * Simulates high-frequency IoT sensor telemetry (e.g. industrial turbines, pumps, generators)
 * with configurable emission rate, batch size, sensor count, and anomalous spike injection.
 */

const http = require("http");
const https = require("https");
const { URL } = require("url");

// Default configuration options
const DEFAULT_CONFIG = {
  url: process.env.TELEMETRY_API_URL || "http://127.0.0.1:5000/api/telemetry",
  count: 1000,           // Total readings to generate (PDF Week 1 demo target)
  rate: 100,             // Target readings per second
  batchSize: 10,         // Readings per HTTP POST batch request
  site: "plant-A",
  sensorIds: ["turbine-1", "turbine-2", "turbine-7"],
  spikeProbability: 0.05, // 5% chance of anomalous temperature spike (> 80°C)
  verbose: true,
};

/**
 * Generates a single contract-compliant telemetry reading.
 * @param {string} sensorId 
 * @param {string} site 
 * @param {Object} options 
 * @returns {Object}
 */
function generateReading(sensorId = "turbine-7", site = "plant-A", options = {}) {
  const isSpike = Math.random() < (options.spikeProbability !== undefined ? options.spikeProbability : 0.05);

  // Normal temperature 65°C - 78°C; anomalous spike 81°C - 95°C (triggers > 80°C rules)
  const temperature = isSpike
    ? +(80.5 + Math.random() * 15).toFixed(2)
    : +(65.0 + Math.random() * 13).toFixed(2);

  // Vibration in mm/s: normal 0.10 - 0.45; spike 0.50 - 0.95
  const vibration = isSpike
    ? +(0.50 + Math.random() * 0.45).toFixed(2)
    : +(0.10 + Math.random() * 0.35).toFixed(2);

  return {
    timestamp: new Date().toISOString(),
    metadata: {
      sensorId,
      site,
    },
    temperature,
    vibration,
  };
}

/**
 * Generates an array of readings for batch ingestion.
 * @param {number} size 
 * @param {string[]} sensorIds 
 * @param {string} site 
 * @param {Object} options 
 * @returns {Array<Object>}
 */
function generateBatch(size = 10, sensorIds = ["turbine-7"], site = "plant-A", options = {}) {
  const batch = [];
  for (let i = 0; i < size; i++) {
    const sensorId = sensorIds[Math.floor(Math.random() * sensorIds.length)];
    batch.push(generateReading(sensorId, site, options));
  }
  return batch;
}

/**
 * Sends a telemetry payload to the ingestion API endpoint.
 * @param {string} targetUrl 
 * @param {Object|Array} payload 
 * @returns {Promise<{ status: number, data: Object }>}
 */
function sendPayload(targetUrl, payload) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(targetUrl);
    const client = parsedUrl.protocol === "https:" ? https : http;
    const data = JSON.stringify(payload);

    const req = client.request(
      targetUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
          "User-Agent": "NexusFlow-MockSensor/1.0",
        },
        timeout: 5000,
      },
      (res) => {
        let responseBody = "";
        res.on("data", (chunk) => {
          responseBody += chunk;
        });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(responseBody);
            resolve({ status: res.status, data: parsed });
          } catch {
            resolve({ status: res.status, data: { raw: responseBody } });
          }
        });
      }
    );

    req.on("error", (err) => reject(err));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });

    req.write(data);
    req.end();
  });
}

/**
 * Runs the mock sensor simulation with progress reporting.
 * @param {Partial<typeof DEFAULT_CONFIG>} customConfig 
 * @returns {Promise<{ sent: number, failed: number, durationMs: number, throughput: number }>}
 */
async function runSimulator(customConfig = {}) {
  const config = { ...DEFAULT_CONFIG, ...customConfig };
  const { url, count, rate, batchSize, sensorIds, site, verbose } = config;

  const intervalMs = Math.max(10, Math.floor((batchSize / rate) * 1000));
  const totalBatches = Math.ceil(count / batchSize);

  let sent = 0;
  let failed = 0;
  let batchIndex = 0;

  if (verbose) {
    console.log("=================================================");
    console.log("🚀 NexusFlow IoT Mock Sensor Simulator");
    console.log("=================================================");
    console.log(`Target URL       : ${url}`);
    console.log(`Total Readings   : ${count}`);
    console.log(`Emission Rate    : ${rate} readings/sec`);
    console.log(`Batch Size       : ${batchSize} readings/req`);
    console.log(`Batch Interval   : ${intervalMs} ms`);
    console.log(`Sensors          : ${sensorIds.join(", ")}`);
    console.log(`Site             : ${site}`);
    console.log("-------------------------------------------------");
  }

  const startTime = Date.now();

  for (let b = 0; b < totalBatches; b++) {
    const currentBatchSize = Math.min(batchSize, count - sent);
    if (currentBatchSize <= 0) break;

    const batch = generateBatch(currentBatchSize, sensorIds, site, config);

    try {
      await sendPayload(url, currentBatchSize === 1 ? batch[0] : batch);
      sent += currentBatchSize;
    } catch (err) {
      failed += currentBatchSize;
      if (verbose) {
        console.error(`[Error] Batch ${b + 1} failed: ${err.message}`);
      }
    }

    batchIndex++;

    if (verbose && (batchIndex % 10 === 0 || sent + failed >= count)) {
      const pct = Math.min(100, Math.round(((sent + failed) / count) * 100));
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      process.stdout.write(
        `\rProgress: [${pct}%] ${sent}/${count} sent (${failed} failed) in ${elapsed}s`
      );
    }

    // Rate-limiting delay between batches
    if (b < totalBatches - 1) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  const durationMs = Date.now() - startTime;
  const durationSec = durationMs / 1000 || 0.001;
  const throughput = +(sent / durationSec).toFixed(1);

  if (verbose) {
    console.log("\n-------------------------------------------------");
    console.log("✅ Simulation Completed");
    console.log(`Total Sent       : ${sent} readings`);
    console.log(`Failed           : ${failed}`);
    console.log(`Total Duration   : ${durationSec.toFixed(2)} seconds`);
    console.log(`Avg Throughput   : ${throughput} readings/sec`);
    console.log("=================================================\n");
  }

  return {
    sent,
    failed,
    durationMs,
    throughput,
  };
}

// CLI Argument Parser
function parseCliArgs() {
  const args = process.argv.slice(2);
  const config = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--count" || arg === "-c") {
      config.count = parseInt(args[++i], 10);
    } else if (arg === "--rate" || arg === "-r") {
      config.rate = parseInt(args[++i], 10);
    } else if (arg === "--batch" || arg === "-b") {
      config.batchSize = parseInt(args[++i], 10);
    } else if (arg === "--url" || arg === "-u") {
      config.url = args[++i];
    } else if (arg === "--sensors" || arg === "-s") {
      config.sensorIds = args[++i].split(",").map((s) => s.trim());
    } else if (arg === "--site") {
      config.site = args[++i];
    } else if (arg === "--spike") {
      config.spikeProbability = parseFloat(args[++i]);
    } else if (arg === "--silent") {
      config.verbose = false;
    }
  }

  return config;
}

// CLI Execution entrypoint
if (require.main === module) {
  const cliConfig = parseCliArgs();
  runSimulator(cliConfig).catch((err) => {
    console.error("Simulator encountered fatal error:", err);
    process.exit(1);
  });
}

module.exports = {
  generateReading,
  generateBatch,
  sendPayload,
  runSimulator,
  DEFAULT_CONFIG,
};
