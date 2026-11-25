
const assert = require("assert");

const { createDelay } = require("../operators/delay");

async function runTests() {
  // Test 1: Original value is returned
  const delay = createDelay(100);
  const result = await delay("Turbine-001");

  assert.strictEqual(result, "Turbine-001");

  // Test 2: Delay takes at least the requested duration
  const start = Date.now();
  await createDelay(150)("test");
  const elapsed = Date.now() - start;

  assert.ok(
    elapsed >= 150,
    `Expected at least 150ms, received ${elapsed}ms`
  );

  // Test 3: Zero delay is accepted
  const zeroDelayResult = await createDelay(0)(123);
  assert.strictEqual(zeroDelayResult, 123);

  // Test 4: Invalid delay values are rejected
  assert.throws(() => createDelay(-1));
  assert.throws(() => createDelay(60001));
  assert.throws(() => createDelay(1.5));

  console.log("All Delay operator tests passed!");
}

runTests().catch(error => {
  console.error("Delay operator tests failed:", error);
  process.exitCode = 1;
});
