
# NexusFlow – Graph JSON Contract

## 1. Purpose

This document defines the agreed graph structure and node configuration for the NexusFlow Stream Compiler.

The graph contains nodes and edges. Nodes define processing operations, while edges define connections between node ports.

## 2. Node Structure

Each node contains:

- `id`: Unique node identifier.
- `type`: Node type using the category.name convention.
- `data`: Node configuration.

Example:

```json
{
  "id": "n2",
  "type": "math.operation",
  "data": {
    "operation": "multiply",
    "operandB": 1.8
  }
}
```

## 3. Math Operation Node

### Node type

`math.operation`

### Input and output ports

| Port | Purpose |
|---|---|
| `a` | First input |
| `b` | Second input |
| `out` | Output |

### Supported operations

- `add`
- `multiply`
- `min`
- `max`

### Configuration

| Field | Description |
|---|---|
| `operation` | Math operation to execute |
| `operandB` | Optional constant used when input port `b` is not connected |

Input `a` must always be connected.

Input `b` can receive data from an upstream node or use `data.operandB`.

The validator must reject a Math node if input `a` is disconnected, or if input `b` is disconnected and `operandB` is null.

## 4. Edge Structure

Edges connect an upstream node to a downstream node.

The `targetHandle` field identifies the input port receiving the connection.

Example:

```json
{
  "id": "e1",
  "source": "n1",
  "target": "n2",
  "targetHandle": "a"
}
```

## 5. Math Node Execution

- When both inputs are connected, use RxJS `combineLatest`.
- The Math node emits when both inputs have values.
- Non-finite numeric values must be ignored.
- When input `b` is not connected, use `data.operandB` as its constant value.

## 6. Required Tests

The compiler must test:

1. Addition, multiplication, minimum and maximum.
2. Both input ports connected.
3. Input `b` using `operandB`.
4. Missing input `a`.
5. Missing input `b` and missing `operandB`.
6. Non-finite numeric values.
7. One sensor feeding both input ports, including possible duplicate emissions.

## 7. Approval Status

This document records the Math node design communicated by the team lead.

Final shared-contract approval from all team members is still required before implementation changes are merged.
