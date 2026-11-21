
const assert = require("assert");

const {
  evaluateThreshold
} = require("../operators/threshold");

// Greater than
assert.strictEqual(evaluateThreshold(90, ">", 80), true);
assert.strictEqual(evaluateThreshold(70, ">", 80), false);

// Greater than or equal
assert.strictEqual(evaluateThreshold(80, ">=", 80), true);

// Less than
assert.strictEqual(evaluateThreshold(70, "<", 80), true);

// Less than or equal
assert.strictEqual(evaluateThreshold(80, "<=", 80), true);

// Equal
assert.strictEqual(evaluateThreshold(80, "==", 80), true);

// Not equal
assert.strictEqual(evaluateThreshold(90, "!=", 80), true);

// Invalid values
assert.throws(() => evaluateThreshold("hot", ">", 80));
assert.throws(() => evaluateThreshold(90, ">", Infinity));
assert.throws(() => evaluateThreshold(90, "invalid", 80));

console.log("All Threshold operator tests passed!");
