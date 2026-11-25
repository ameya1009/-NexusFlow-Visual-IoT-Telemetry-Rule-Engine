
/**
 * Performs mathematical operations for the Stream Compiler.
 *
 * Supported operations:
 * add, multiply, min, max
 *
 * @param {string} operation
 * @param {number[]} values
 * @returns {number}
 */
function calculate(operation, values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("Values must be a non-empty array");
  }

  if (
    !values.every(
      value => typeof value === "number" && Number.isFinite(value)
    )
  ) {
    throw new Error("All values must be finite numbers");
  }

  switch (operation) {
    case "add":
      return values.reduce((sum, value) => sum + value, 0);

    case "multiply":
      return values.reduce((result, value) => result * value, 1);

    case "min":
      return Math.min(...values);

    case "max":
      return Math.max(...values);

    default:
      throw new Error(`Unsupported math operation: ${operation}`);
  }
}

module.exports = {
  calculate
};
