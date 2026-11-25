
/**
 * Creates a moving average operator.
 * Maintains an independent rolling window for each instance.
 *
 * @param {number} windowSize - Number of readings in the window.
 * @returns {Function} Function that accepts a numeric value.
 */
function createMovingAverage(windowSize) {
  if (
    !Number.isInteger(windowSize) ||
    windowSize < 1 ||
    windowSize > 1000
  ) {
    throw new Error("windowSize must be between 1 and 1000");
  }

  const values = [];
  let sum = 0;

  return function movingAverage(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error("Input must be a finite number");
    }

    values.push(value);
    sum += value;

    if (values.length > windowSize) {
      sum -= values.shift();
    }

    return {
      average: sum / values.length,
      samples: values.length
    };
  };
}

module.exports = {
  createMovingAverage
};
