#!/usr/bin/env node

/**
 * NexusFlow Ingestion Audit & Storage Benchmark Utility
 * Prepares benchmark evidence for Mid-Project Review & Ingestion Optimization.
 * Measures writes/second, batch latency, and memory footprint.
 */

const { generateBatch, sendPayload } = require("./mockSensor");

const DEFAULT_AUDIT_CONFIG = {
  url: process.env.TELEMETRY_API_URL || "http://127.0.0.1:5000/api/telemetry",
  testSizes: [100, 500, 1000],
  batchSizes: [10, 50, 100],
  sensors: ["turbine-1", "turbine-2", "turbine-7"],
  site: "plant-A",
  verbose: true,
};

/**
 * Benchmarks a specific batch configuration.
 * @param {string} url 
 * @param {number} totalRecords 
 * @param {number} batchSize 
 * @returns {Promise<Object>}
 */
async function benchmarkBatch(url, totalRecords, batchSize) {
  const numBatches = Math.ceil(totalRecords / batchSize);
  const memBefore = process.memoryUsage().heapUsed;
  const start = Date.now();

  let sent = 0;
  let failed = 0;
  const latencies = [];

  for (let b = 0; b < numBatches; b++) {
    const size = Math.min(batchSize, totalRecords - sent);
    if (size <= 0) break;

    const batch = generateBatch(size, ["turbine-7"], "plant-A");
    const t0 = Date.now();

    try {
      await sendPayload(url, size === 1 ? batch[0] : batch);
      sent += size;
      latencies.push(Date.now() - t0);
    } catch {
      failed += size;
    }
  }

  const durationMs = Date.now() - start;
  const memAfter = process.memoryUsage().heapUsed;
  const durationSec = durationMs / 1000 || 0.001;
  const throughput = +(sent / durationSec).toFixed(1);
  const avgLatency = latencies.length ? +(latencies.reduce((a, c) => a + c, 0) / latencies.length).toFixed(1) : 0;
  const memDeltaMb = +((memAfter - memBefore) / (1024 * 1024)).toFixed(2);

  return {
    totalRecords,
    batchSize,
    sent,
    failed,
    durationMs,
    throughput,
    avgLatency,
    memDeltaMb,
  };
}

/**
 * Runs complete Ingestion Audit benchmark across configurations.
 */
async function runIngestionAudit(customConfig = {}) {
  const config = { ...DEFAULT_AUDIT_CONFIG, ...customConfig };
  const { url, testSizes, batchSizes, verbose } = config;

  if (verbose) {
    console.log("\n===============================================================================");
    console.log("⚡ NexusFlow Ingestion Audit & Throughput Benchmark");
    console.log("===============================================================================");
    console.log(`Target URL : ${url}`);
    console.log(`Timestamp  : ${new Date().toISOString()}`);
    console.log("-------------------------------------------------------------------------------");
  }

  const results = [];

  for (const total of testSizes) {
    for (const bSize of batchSizes) {
      if (bSize > total) continue;

      if (verbose) {
        process.stdout.write(`Testing: ${total} records | Batch size: ${bSize}... `);
      }

      const res = await benchmarkBatch(url, total, bSize);
      results.push(res);

      if (verbose) {
        console.log(`✅ ${res.throughput} writes/sec (avg latency: ${res.avgLatency}ms)`);
      }
    }
  }

  if (verbose) {
    console.log("\n===============================================================================");
    console.log("📊 INGESTION AUDIT SUMMARY TABLE");
    console.log("===============================================================================");
    console.log(
      "Records".padEnd(10) +
      "Batch".padEnd(8) +
      "Throughput (writes/s)".padEnd(25) +
      "Avg Latency (ms)".padEnd(20) +
      "Memory Delta (MB)"
    );
    console.log("-".repeat(79));

    for (const r of results) {
      console.log(
        String(r.totalRecords).padEnd(10) +
        String(r.batchSize).padEnd(8) +
        String(r.throughput).padEnd(25) +
        String(r.avgLatency).padEnd(20) +
        String(r.memDeltaMb)
      );
    }
    console.log("===============================================================================\n");
  }

  return results;
}

if (require.main === module) {
  runIngestionAudit().catch((err) => {
    console.error("Audit failed:", err);
    process.exit(1);
  });
}

module.exports = {
  benchmarkBatch,
  runIngestionAudit,
};
