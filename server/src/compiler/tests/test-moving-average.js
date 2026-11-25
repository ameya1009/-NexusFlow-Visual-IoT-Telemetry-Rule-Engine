
const assert = require("assert");

const {
  createMovingAverage
} = require("../operators/movingAverage");

const average = createMovingAverage(3);

assert.deepStrictEqual(average(75), {
  average: 75,
  samples: 1
});

assert.deepStrictEqual(average(85), {
  average: 80,
  samples: 2
});

assert.deepStrictEqual(average(90), {
  average: 83.33333333333333,
  samples: 3
});

assert.deepStrictEqual(average(100), {
  average: 91.66666666666667,
  samples: 3
});

// Invalid window size
assert.throws(() => createMovingAverage(0));
assert.throws(() => createMovingAverage(1001));

// Invalid input
assert.throws(() => average("hot"));
assert.throws(() => average(Infinity));

// Independent operator instances
const secondAverage = createMovingAverage(2);

assert.deepStrictEqual(secondAverage(20), {
  average: 20,
  samples: 1
});

console.log("All Moving Average operator tests passed!");
