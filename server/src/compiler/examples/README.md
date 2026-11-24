# NexusFlow – Sample Graph Examples

## Overview

This folder contains three sample graphs demonstrating the NexusFlow Stream Compiler and Rule Engine.

Each graph uses sensor telemetry, graph nodes, rules and alert generation.

## 1. Turbine Temperature Detection

**File:** `test-stream-compiler.js`

**Purpose:** Detect high turbine temperature using a moving average.

- Sensor ID: `TURBINE-001`
- Moving Average Window: 3
- Rule: Temperature > 80
- Alert: High temperature detected!

**Node sequence:**

Sensor → Moving Average → Rule → Alert

**Test readings:** 75, 85, 90, 100

Expected result: Alerts are generated when the moving average exceeds 80.

## 2. High Voltage Detection

**File:** `high-voltage-graph.json`

**Purpose:** Detect high voltage in a substation.

- Device ID: `SUBSTATION-001`
- Rule: Voltage > 240
- Alert: High voltage detected!

**Node sequence:**

Sensor → Rule → Alert

**Test readings:** 250 V and 220 V

Expected result:
- 250 V triggers an alert.
- 220 V does not trigger an alert.

## 3. High Current Detection

**File:** `high-current-graph.json`

**Purpose:** Monitor motor current using a moving average.

- Device ID: `MOTOR-001`
- Moving Average Window: 3
- Rule: Current > 15
- Alert: High motor current detected!

**Node sequence:**

Sensor → Moving Average → Rule → Alert

**Test readings:** 10, 16, 20, 22

Expected result: Alerts are generated when the moving average exceeds 15.

## Running the Sample Graph Tests

From the server directory, execute:

```bash
node ./src/compiler/examples/test-sample-graphs.js
node ./test-stream-compiler.js
```

## Verification

All three sample graph demonstrations have been tested using the existing Stream Compiler.

The separate operator test files cover Moving Average, Math, Threshold, Delay, Action and Math execution.

## Notes

These examples demonstrate the current compiler implementation. Math execution integration and external SMS/Webhook delivery remain separate pending tasks.
