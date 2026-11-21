
/**
 * Evaluates a threshold condition against a numeric value.
 *
 * Supported operators:
 * >, >=, <, <=, ==, !=
 *
 * @param {number} actual - Actual telemetry value.
 * @param {string} operator - Comparison operator.
 * @param {number} threshold - Threshold value.
 * @returns {boolean}
 */
function evaluateThreshold(actual, operator, threshold) {
  if (
    typeof actual !== "number" ||
    !Number.isFinite(actual)
  ) {
    throw new Error("Actual value must be a finite number");
  }

  if (
    typeof threshold !== "number" ||
    !Number.isFinite(threshold)
  ) {
    throw new Error("Threshold must be a finite number");
  }

  switch (operator) {
    case ">":
      return actual > threshold;

    case ">=":
      return actual >= threshold;

    case "<":
      return actual < threshold;

    case "<=":
      return actual <= threshold;

    case "==":
      return actual === threshold;

    case "!=":
      return actual !== threshold;

    default:
      throw new Error(`Unsupported comparison operator: ${operator}`);
  }
}

module.exports = {
  evaluateThreshold
};
