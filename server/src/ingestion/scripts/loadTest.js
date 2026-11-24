#!/usr/bin/env node

/**
 * NexusFlow High-Speed Batch Ingestion Load Tester & Tuning Suite
 * Conforms to Member 1 Week 2 Day 3 Deliverables.
 * Target: Load test and tune batching to reach 5,000 writes/sec.
 */

const http = require("http");
const https = require("https");
const { URL } = require("url");
const { generateBatch } = require("./mockSensor");

// High-performance HTTP agent with keep-alive connection pooling
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 20,
  timeout: 30000,
});

const DEFAULT_LOAD_CONFIG = {
  url: process.env.TELEMETRY_API_URL || "http://127.0.0.1:5000/api/telemetry",
  targetWritesPerSec: 5000,
  totalRecords: 10000,
  batchSize: 1000,
  concurrency: 5,
  sensorIds: ["turbine-1", "turbine-2", "turbine-3", "turbine-7"],
  site: "plant-A",
  verbose: true,
};

/**
 * Calculates percentile from an array of numbers.
 * @param {number[]} values 
 * @param {number} p 
 * @returns {number}
 */
function getPercentile(values, p) {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

/**
 * Calculates latency statistics.
 * @param {number[]} latencies 
 * @returns {Object}
 */
function calculatePercentiles(latencies) {
  if (!latencies || latencies.length === 0) {
    return { min: 0, max: 0, mean: 0, p50: 0, p90: 0, p95: 0, p99: 0 };
  }

  const sum = latencies.reduce((acc, val) => acc + val, 0);
  const mean = +(sum / latencies.length).toFixed(2);

  return {
    min: Math.min(...latencies),
    max: Math.max(...latencies),
    mean,
    p50: getPercentile(latencies, 50),
    p90: getPercentile(latencies, 90),
    p95: getPercentile(latencies, 95),
    p99: getPercentile(latencies, 99),
  };
}

/**
 * Sends a single batch payload using keep-alive connection.
 * @param {string} targetUrl 
 * @param {Array<Object>} batch 
 * @returns {Promise<{ statusCode: number, latencyMs: number }>}
 */
function sendBatch(targetUrl, batch) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const parsedUrl = new URL(targetUrl);
    const client = parsedUrl.protocol === "https:" ? https : http;
    const bodyData = JSON.stringify(batch);

    const req = client.request(
      targetUrl,
      {
        method: "POST",
        agent: httpAgent,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(bodyData),
          "User-Agent": "NexusFlow-LoadTester/2.0",
        },
        timeout: 10000,
      },
      (res) => {
        res.resume(); // Discard response body quickly to free socket
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode,
            latencyMs: Date.now() - t0,
          });
        });
      }
    );

    req.on("error", (err) => reject(err));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out during load test"));
    });

    req.write(bodyData);
    req.end();
  });
}

/**
 * Executes a load test run with specific batch size and concurrency.
 * @param {Object} options 
 * @returns {Promise<Object>}
 */
async function executeLoadRun(options = {}) {
  const config = { ...DEFAULT_LOAD_CONFIG, ...options };
  const { url, totalRecords, batchSize, concurrency, sensorIds, site } = config;

  const totalBatches = Math.ceil(totalRecords / batchSize);
  const latencies = [];
  let sentRecords = 0;
  let failedRecords = 0;
  let completedBatches = 0;

  const memBefore = process.memoryUsage().heapUsed;
  const startTime = Date.now();

  // Worker task queue
  let currentBatchIndex = 0;
  async function worker() {
    while (currentBatchIndex < totalBatches) {
      const idx = currentBatchIndex++;
      const currentSize = Math.min(batchSize, totalRecords - idx * batchSize);
      if (currentSize <= 0) break;

      const batch = generateBatch(currentSize, sensorIds, site);

      try {
        const res = await sendBatch(url, batch);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          sentRecords += currentSize;
          latencies.push(res.latencyMs);
        } else {
          failedRecords += currentSize;
        }
      } catch (err) {
        failedRecords += currentSize;
      }

      completedBatches++;
    }
  }

  // Spawn concurrent workers
  const workerPool = [];
  const activeConcurrency = Math.min(concurrency, totalBatches);
  for (let c = 0; c < activeConcurrency; c++) {
    workerPool.push(worker());
  }

  await Promise.all(workerPool);

  const durationMs = Date.now() - startTime;
  const durationSec = durationMs / 1000 || 0.001;
  const throughput = +(sentRecords / durationSec).toFixed(1);
  const memAfter = process.memoryUsage().heapUsed;
  const memDeltaMb = +((memAfter - memBefore) / (1024 * 1024)).toFixed(2);
  const percentiles = calculatePercentiles(latencies);

  return {
    totalRecords,
    batchSize,
    concurrency: activeConcurrency,
    sentRecords,
    failedRecords,
    durationMs,
    durationSec: +durationSec.toFixed(3),
    throughput,
    targetMet: throughput >= config.targetWritesPerSec,
    targetWritesPerSec: config.targetWritesPerSec,
    latencies: percentiles,
    memDeltaMb,
  };
}

/**
 * Benchmark batch tuning across different batch sizes to identify
 * the optimal configuration that reaches or exceeds 5,000 writes/sec.
 * @param {Object} options 
 * @returns {Promise<Array<Object>>}
 */
async function tuneBatching(options = {}) {
  const config = { ...DEFAULT_LOAD_CONFIG, ...options };
  const candidateBatchSizes = options.batchSizes || [50, 100, 250, 500, 1000, 2000];
  const results = [];

  if (config.verbose) {
    console.log("\n===============================================================================");
    console.log("⚡ NexusFlow Batch Tuning Suite (Target: 5,000 Writes/Second)");
    console.log("===============================================================================");
    console.log(`Ingestion Target : ${config.url}`);
    console.log(`Concurrency      : ${config.concurrency} parallel streams`);
    console.log(`Target Speed     : >= ${config.targetWritesPerSec.toLocaleString()} writes/sec`);
    console.log("-------------------------------------------------------------------------------");
  }

  for (const bSize of candidateBatchSizes) {
    const testRecords = Math.max(bSize * 5, 2000); // Send at least 5 batches per size
    if (config.verbose) {
      process.stdout.write(`Evaluating batch size: ${String(bSize).padEnd(6)} | ${testRecords} records... `);
    }

    try {
      const runResult = await executeLoadRun({
        ...config,
        totalRecords: testRecords,
        batchSize: bSize,
      });

      results.push(runResult);

      if (config.verbose) {
        const status = runResult.targetMet ? "PASSED ✅" : "BELOW TARGET ⚠️";
        console.log(
          `${runResult.throughput.toLocaleString()} writes/sec (p95: ${runResult.latencies.p95}ms) [${status}]`
        );
      }
    } catch (err) {
      if (config.verbose) {
        console.log(`FAILED ❌ (${err.message})`);
      }
    }
  }

  if (config.verbose && results.length > 0) {
    printTuningSummary(results);
  }

  return results;
}

/**
 * Prints formatted summary table of tuning results.
 * @param {Array<Object>} results 
 */
function printTuningSummary(results) {
  console.log("\n===============================================================================");
  console.log("📊 BATCH TUNING AUDIT REPORT (5,000 WRITES/SEC DELIVERABLE)");
  console.log("===============================================================================");
  console.log(
    "Batch Size".padEnd(12) +
    "Records".padEnd(10) +
    "Duration".padEnd(12) +
    "Throughput".padEnd(20) +
    "p95 Latency".padEnd(14) +
    "Target (>=5,000)"
  );
  console.log("-".repeat(79));

  let optimalBatch = null;
  let maxThroughput = 0;

  for (const r of results) {
    const met = r.targetMet ? "PASSED ✅" : "NO ❌";
    console.log(
      String(r.batchSize).padEnd(12) +
      String(r.sentRecords).padEnd(10) +
      `${r.durationSec}s`.padEnd(12) +
      `${r.throughput.toLocaleString()} w/s`.padEnd(20) +
      `${r.latencies.p95}ms`.padEnd(14) +
      met
    );

    if (r.throughput > maxThroughput) {
      maxThroughput = r.throughput;
      optimalBatch = r.batchSize;
    }
  }

  console.log("===============================================================================");
  console.log(`🏆 Optimal Batch Configuration: ${optimalBatch} readings/batch`);
  console.log(`🚀 Peak Ingestion Throughput   : ${maxThroughput.toLocaleString()} writes/sec`);
  console.log("===============================================================================\n");
}

/**
 * Fast direct execution helper for in-memory / unit testing
 * without requiring live socket listeners.
 * @param {number} batchSize 
 * @param {number} totalRecords 
 * @param {Function} [insertHandler] 
 * @returns {Object}
 */
async function runDirectBatchBenchmark(batchSize = 1000, totalRecords = 5000, insertHandler = null) {
  const handler = insertHandler || (async (batch) => batch.length);
  const totalBatches = Math.ceil(totalRecords / batchSize);
  const latencies = [];

  const tStart = Date.now();
  let totalInserted = 0;

  for (let b = 0; b < totalBatches; b++) {
    const count = Math.min(batchSize, totalRecords - totalInserted);
    const mockBatch = generateBatch(count, ["turbine-7"], "plant-A");
    const t0 = Date.now();
    const inserted = await handler(mockBatch);
    latencies.push(Date.now() - t0);
    totalInserted += inserted;
  }

  const durationMs = Date.now() - tStart;
  const durationSec = durationMs / 1000 || 0.001;
  const throughput = +(totalInserted / durationSec).toFixed(1);

  return {
    totalRecords,
    batchSize,
    totalInserted,
    durationMs,
    durationSec: +durationSec.toFixed(3),
    throughput,
    targetMet: throughput >= 5000,
    latencies: calculatePercentiles(latencies),
  };
}

if (require.main === module) {
  tuneBatching().catch((err) => {
    console.error("Load test failed:", err);
    process.exit(1);
  });
}

module.exports = {
  executeLoadRun,
  tuneBatching,
  runDirectBatchBenchmark,
  calculatePercentiles,
  getPercentile,
};
