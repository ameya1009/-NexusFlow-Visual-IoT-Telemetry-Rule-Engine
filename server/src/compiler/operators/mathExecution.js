
const {
  combineLatest,
  isObservable,
  of,
  filter,
  map
} = require("rxjs");
const SUPPORTED_OPERATIONS = [
  "add",
  "multiply",
  "min",
  "max"
];

function calculate(operation, a, b) {
  if (
    typeof a !== "number" ||
    !Number.isFinite(a) ||
    typeof b !== "number" ||
    !Number.isFinite(b)
  ) {
    return null;
  }

  switch (operation) {
    case "add":
      return a + b;

    case "multiply":
      return a * b;

    case "min":
      return Math.min(a, b);

    case "max":
      return Math.max(a, b);

    default:
      throw new Error(`Unsupported math operation: ${operation}`);
  }
}

function createMathExecution({
  operation,
  inputA$,
  inputB$,
  operandB
}) {
  if (!SUPPORTED_OPERATIONS.includes(operation)) {
    throw new Error(`Unsupported math operation: ${operation}`);
  }

  if (!isObservable(inputA$)) {
    throw new Error("Math input a must be an Observable");
  }

  if (inputB$ !== undefined && !isObservable(inputB$)) {
    throw new Error("Math input b must be an Observable");
  }

  if (
    inputB$ === undefined &&
    (operandB === null ||
      typeof operandB !== "number" ||
      !Number.isFinite(operandB))
  ) {
    throw new Error("A finite operandB is required when input b is not connected");
  }

const resolvedInputB$ = inputB$ ?? of(operandB);

return combineLatest([inputA$, resolvedInputB$]).pipe(
  filter(([a, b]) =>
    Number.isFinite(a) && Number.isFinite(b)
  ),
  map(([a, b]) => ({
      operation,
      a,
      b,
      result: calculate(operation, a, b)
    }))
  );
}

module.exports = {
  calculate,
  createMathExecution
};
