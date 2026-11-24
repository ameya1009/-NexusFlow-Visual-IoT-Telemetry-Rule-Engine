const { test, describe } = require("node:test");
const assert = require("node:assert");
const {
  calculateStorageMetrics,
  generateAuditEvidence,
  runStorageAudit,
} = require("../src/ingestion/scripts/storageAudit");

describe("Week 2 Day 4 (Day 10) — Ingestion Audit Storage Comparison Tests", () => {
  describe("1. Storage Metrics & Compression Mathematics", () => {
    test("calculateStorageMetrics accurately computes storage footprints for 100,000 records", () => {
      const metrics = calculateStorageMetrics(100000);

      assert.strictEqual(metrics.recordCount, 100000);

      // Verify Standard Collection metrics
      assert.ok(metrics.standard.rawDataSizeMb > 15);
      assert.ok(metrics.standard.storageSizeMb > 8);
      assert.ok(metrics.standard.indexSizeMb > 4);
      assert.ok(metrics.standard.totalFootprintMb > 12);

      // Verify Time-Series Collection metrics
      assert.ok(metrics.timeSeries.storageSizeMb < 4);
      assert.ok(metrics.timeSeries.indexSizeMb < 1);
      assert.ok(metrics.timeSeries.totalFootprintMb < 4);

      // Verify Storage Savings & Ratios
      assert.ok(
        metrics.savings.storageSavingsPct >= 70,
        `Expected >= 70% storage savings, got ${metrics.savings.storageSavingsPct}%`
      );
      assert.ok(
        metrics.savings.compressionRatio >= 3.5,
        `Expected >= 3.5x compression, got ${metrics.savings.compressionRatio}x`
      );
      assert.ok(
        metrics.savings.indexReductionPct >= 85,
        `Expected >= 85% index reduction, got ${metrics.savings.indexReductionPct}%`
      );
    });

    test("Time-Series average bytes per reading is significantly lower than standard B-tree", () => {
      const metrics = calculateStorageMetrics(50000);
      assert.ok(
        metrics.timeSeries.avgBytesPerReading < metrics.standard.avgBytesPerReading / 3,
        "Time-Series bytes per reading should be less than one-third of standard collection"
      );
    });
  });

  describe("2. Audit Evidence Generation Across Dataset Scaling", () => {
    test("generateAuditEvidence scales across increments and maintains high savings", () => {
      const increments = [10000, 50000, 100000];
      const evidence = generateAuditEvidence(increments);

      assert.strictEqual(evidence.length, 3);
      assert.strictEqual(evidence[0].recordCount, 10000);
      assert.strictEqual(evidence[1].recordCount, 50000);
      assert.strictEqual(evidence[2].recordCount, 100000);

      for (const item of evidence) {
        assert.ok(item.savings.storageSavingsPct > 70);
        assert.ok(item.savings.compressionRatio > 3.0);
      }
    });

    test("runStorageAudit executes cleanly and returns complete audit array", async () => {
      const result = await runStorageAudit({
        increments: [1000, 5000],
        verbose: false,
      });

      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].recordCount, 1000);
      assert.strictEqual(result[1].recordCount, 5000);
    });
  });
});
