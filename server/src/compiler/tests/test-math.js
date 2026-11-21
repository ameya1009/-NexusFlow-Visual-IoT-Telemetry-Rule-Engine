
const assert = require("assert");

const { calculate } = require("../operators/math");

// Addition
assert.strictEqual(calculate("add", [10, 20, 30]), 60);

// Multiplication
assert.strictEqual(calculate("multiply", [2, 3, 4]), 24);

// Minimum
assert.strictEqual(calculate("min", [15, 5, 25]), 5);

// Maximum
assert.strictEqual(calculate("max", [15, 5, 25]), 25);

// Negative numbers
assert.strictEqual(calculate("add", [-10, 20]), 10);

// Decimal values
assert.strictEqual(calculate("add", [1.5, 2.5]), 4);

// Invalid inputs
assert.throws(() => calculate("add", []));
assert.throws(() => calculate("add", "10,20"));
assert.throws(() => calculate("add", [10, Infinity]));
assert.throws(() => calculate("divide", [10, 2]));

console.log("All Math operator tests passed!");
