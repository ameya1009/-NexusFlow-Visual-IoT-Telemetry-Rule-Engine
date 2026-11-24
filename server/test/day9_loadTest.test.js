const { test, describe } = require("node:test");
const assert = require("node:assert");
const {
  getPercentile,
  calculatePercentiles,
  runDirectBatchBenchmark,
} = require("../src/ingestion/scripts/loadTest");

describe("Week 2 Day 3 (Day 9) — Ingestion Load Testing & 5,000 Writes/Sec Batch Tuning Tests", () => {
  describe("1. Percentile & Latency Metric Calculations", () => {
    test("getPercentile correctly calculates p50, p90, p95, and p99", () => {
      // 100 latencies from 1ms to 100ms
      const latencies = Array.from({ length: 100 }, (_, i) => i + 1);

      assert.strictEqual(getPercentile(latencies, 50), 50);
      assert.strictEqual(getPercentile(latencies, 90), 90);
      assert.strictEqual(getPercentile(latencies, 95), 95);
      assert.strictEqual(getPercentile(latencies, 99), 99);
    });

    test("calculatePercentiles returns complete distribution stats", () => {
      const latencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const stats = calculatePercentiles(latencies);

      assert.strictEqual(stats.min, 10);
      assert.strictEqual(stats.max, 100);
      assert.strictEqual(stats.mean, 55);
      assert.strictEqual(stats.p50, 50);
      assert.strictEqual(stats.p95, 100);
    });

    test("calculatePercentiles handles empty array safely", () => {
      const stats = calculatePercentiles([]);
      assert.strictEqual(stats.min, 0);
      assert.strictEqual(stats.max, 0);
      assert.strictEqual(stats.mean, 0);
    });
  });

  describe("2. Batch Tuning & High-Throughput Ingestion Execution", () => {
    test("Tuned batching reaches and exceeds 5,000 writes/sec target with fast handler", async () => {
      // High-speed simulated batch insert (resembles optimized bulk write)
      const mockBulkInsert = async (batch) => {
        // Fast in-memory insertion (takes ~2ms per 1,000 records)
        await new Promise((r) => setTimeout(r, 2));
        return batch.length;
      };

      const result = await runDirectBatchBenchmark(1000, 10000, mockBulkInsert);

      assert.strictEqual(result.totalRecords, 10000);
      assert.strictEqual(result.batchSize, 1000);
      assert.strictEqual(result.totalInserted, 10000);
      assert.ok(result.throughput >= 5000, `Expected >= 5000 writes/sec, got ${result.throughput}`);
      assert.strictEqual(result.targetMet, true);
      assert.ok(result.latencies.p50 >= 0);
      assert.ok(result.latencies.p95 >= 0);
    });

    test("Small batch sizes yield lower throughput, confirming the necessity of batch tuning", async () => {
      // Simulate per-request network/IO overhead (10ms per batch call)
      const mockNetworkInsert = async (batch) => {
        await new Promise((r) => setTimeout(r, 10));
        return batch.length;
      };

      // Untuned small batch size (10 records/batch, 100 batches)
      const untunedResult = await runDirectBatchBenchmark(10, 1000, mockNetworkInsert);

      // Tuned large batch size (500 records/batch, 2 batches)
      const tunedResult = await runDirectBatchBenchmark(500, 1000, mockNetworkInsert);

      assert.ok(
        tunedResult.throughput > untunedResult.throughput * 5,
        `Tuned throughput (${tunedResult.throughput}) should drastically exceed untuned (${untunedResult.throughput})`
      );
    });
  });
});
