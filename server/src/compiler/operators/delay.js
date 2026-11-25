
/**
 * Creates an asynchronous delay operator.
 *
 * @param {number} delayMs - Delay duration in milliseconds.
 * @returns {Function} Function that resolves with the input after the delay.
 */
function createDelay(delayMs) {
  if (
    !Number.isInteger(delayMs) ||
    delayMs < 0 ||
    delayMs > 60000
  ) {
    throw new Error("delayMs must be between 0 and 60000");
  }

  return function delayValue(value) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(value);
      }, delayMs);
    });
  };
}

module.exports = {
  createDelay
};
