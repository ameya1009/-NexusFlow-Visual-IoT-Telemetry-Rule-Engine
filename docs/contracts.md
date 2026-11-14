# NexusFlow Shared Contracts & Architecture Specification

> **Status:** FROZEN (Week 1, Day 1-2)  
> **Author:** Team Lead (Member 1)  
> **Audience:** Member 1 (Data & Ingestion), Member 2 (Stream Compiler & Rule Engine), Member 3 (Frontend & Visualization)

---

## 1. Overview & Repository Architecture

NexusFlow is structured as a monorepo consisting of three dedicated directories to ensure clean separation of concerns and avoid merge conflicts:

```
nexusflow/
├── docs/                 # Managed by Team Lead (Member 1) - Contracts, specifications, architecture
├── server/               # Backend modules (Members 1 & 2)
│   ├── src/
│   │   ├── ingestion/    # Owned by Member 1 (Ingestion API, Time-Series DB, WebSockets, Alerting)
│   │   ├── compiler/     # Owned by Member 2 (Graph validation, JSON-to-RxJS compiler, Rule Engine)
│   │   └── config/       # Shared server configurations (Database, App setup)
│   └── package.json
└── client/               # Frontend application (Owned by Member 3 - React, React Flow, Dashboards)
```

### Git Branching Guidelines
- `main`: Protected production branch. No direct commits allowed.
- Feature branches strictly follow:
  - `feature/m1-...` (Member 1 - Team Lead & Data/Ingestion)
  - `feature/m2-...` (Member 2 - Compiler & Rule Engine)
  - `feature/m3-...` (Member 3 - Frontend & Visualization)
- Every pull request must be reviewed by the Team Lead and at least one teammate before merging into `main`.

---

## 2. Shared Data Contracts

### 2.1 Graph JSON Contract (Member 3 produces, Member 2 consumes)

The visual graph created on the React Flow canvas by Member 3 must serialize into the following standard JSON schema before being sent to Member 2's validation and compilation service:

```json
{
  "graphId": "g_101",
  "name": "Turbine overheat",
  "nodes": [
    {
      "id": "n1",
      "type": "source.sensor",
      "data": {
        "sensorId": "turbine-7",
        "metric": "temperature"
      }
    },
    {
      "id": "n2",
      "type": "filter.movingAverage",
      "data": {
        "windowSize": 5
      }
    },
    {
      "id": "n3",
      "type": "action.sms",
      "data": {
        "to": "+91XXXXXXXXXX",
        "threshold": 80
      }
    }
  ],
  "edges": [
    { "source": "n1", "target": "n2" },
    { "source": "n2", "target": "n3" }
  ]
}
```

#### Node Catalogue Types:
- **Source:** `source.sensor` (required params: `sensorId`, `metric`)
- **Filter:** `filter.movingAverage` (`windowSize`), `filter.threshold` (`min`, `max`), `filter.deadband`
- **Math:** `math.add`, `math.multiply`, `math.min`, `math.max`
- **Condition:** `condition.compare` (`operator`: `>`, `<`, `>=`, `<=`, `==`, `threshold`)
- **Action:** `action.sms` (`to`, `threshold`, `template`), `action.webhook` (`url`, `method`, `payload`)

---

### 2.2 Telemetry Document Contract (Member 1 stores, Member 2 consumes)

Ingested sensor telemetry stored in MongoDB Time-Series collection:

```json
{
  "timestamp": "2026-11-14T15:00:00.000Z",
  "metadata": {
    "sensorId": "turbine-7",
    "site": "plant-A"
  },
  "temperature": 82.4,
  "vibration": 0.31
}
```

#### MongoDB Time-Series Specifications:
- **Collection Name:** `telemetry`
- **timeField:** `timestamp`
- **metaField:** `metadata`
- **granularity:** `seconds` (suitable for high-frequency IoT readings)

---

### 2.3 API and WebSocket Events Contract

| Interface | Method / Event | Owner | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/telemetry` | `POST` | Member 1 | High-speed single / batch ingestion of sensor readings (`insertMany`, `ordered: false`). |
| `/api/graphs` | `POST` | Member 2 | Save and validate graph JSON against Ajv schema. |
| `/api/graphs/:id` | `GET` | Member 2 | Retrieve a saved graph by ID. |
| `/api/graphs/:id/activate` | `POST` | Member 2 | Compile graph into a live running RxJS pipeline. |
| `/api/graphs/:id/deactivate` | `POST` | Member 2 | Stop and tear down a running RxJS pipeline. |
| `telemetry:update` | WS Event (Emit) | Member 1 | Pushes live readings to connected dashboards and the internal rule engine bus. |
| `alert:fired` | WS Event (Broadcast) | Member 2 emits, Member 1 broadcasts | Emitted when a rule condition evaluates to true; carries `{ graphId, nodeId, value, time, alertType }`. |
| `node:active` | WS Event (Render) | Member 2 emits, Member 3 renders | Broadcasts active data flow through nodes; tells React Flow canvas which wire to glow. |

---

## 3. Communication & Integration Protocol

- **Mock Data First:** In Week 1, Member 3 builds the UI against mocked REST APIs and mock WebSocket events. Member 2 develops unit tests and validates graphs using mock JSON payloads and fake RxJS Subjects.
- **Contract Changes:** Any change to the contracts above requires agreement from all three members and formal approval by the Team Lead.
