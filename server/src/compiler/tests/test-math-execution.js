const assert = require("assert");
const { Subject, of } = require("rxjs");
const {
  createMathExecution
} = require("../operators/mathExecution");

// Test 1: Both inputs connected
const inputA$ = of(10);
const inputB$ = of(5);

const results = [];

createMathExecution({
  operation: "add",
  inputA$,
  inputB$
}).subscribe((value) => results.push(value));

assert.strictEqual(results.length, 1);
assert.deepStrictEqual(results[0], {
  operation: "add",
  a: 10,
  b: 5,
  result: 15
});

// Test 2: Use operandB when input b is not connected
const fallbackResults = [];

createMathExecution({
  operation: "multiply",
  inputA$: of(4),
  operandB: 3
}).subscribe((value) => fallbackResults.push(value));

assert.strictEqual(fallbackResults[0].result, 12);

// Test 3: Ignore non-finite input values
const sensor$ = new Subject();
const finiteResults = [];

createMathExecution({
  operation: "add",
  inputA$: sensor$,
  operandB: 2
}).subscribe((value) => finiteResults.push(value));

sensor$.next(NaN);
sensor$.next(Infinity);
sensor$.next(8);

assert.strictEqual(finiteResults.length, 1);
assert.strictEqual(finiteResults[0].result, 10);

// Test 4: Reject missing input a
assert.throws(
  () => createMathExecution({
    operation: "add",
    inputA$: null,
    operandB: 2
  }),
  /Math input a must be an Observable/
);

// Test 5: Reject missing operandB when input b is disconnected
assert.throws(
  () => createMathExecution({
    operation: "add",
    inputA$: of(5)
  }),
  /finite operandB is required/
);

// Test 6: Reject unsupported operation
assert.throws(
  () => createMathExecution({
    operation: "divide",
    inputA$: of(10),
    operandB: 2
  }),
  /Unsupported math operation/
);
// Test 7: Same sensor connected to both inputs
const sharedSensor$ = new Subject();
const sharedResults = [];

createMathExecution({
  operation: "add",
  inputA$: sharedSensor$,
  inputB$: sharedSensor$
}).subscribe((value) => sharedResults.push(value));

sharedSensor$.next(5);

assert.strictEqual(sharedResults.length, 1);
assert.strictEqual(sharedResults[0].result, 10);
console.log("All Math execution tests passed!");