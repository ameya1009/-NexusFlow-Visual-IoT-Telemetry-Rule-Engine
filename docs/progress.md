# NexusFlow — Weekly Progress Report

> **Project:** NexusFlow: Visual IoT Telemetry & Rule Engine  
> **Cadence:** Weekly Summary Note (Infotact Guidelines)  
> **Compiled By:** Team Lead (Member 1)  
> **Release Milestone:** `v0.1-week1`

---

## Week 1 Summary: Foundation, Ingestion & Rule Schemas

### 1. Milestone Overview
Week 1 focused on freezing shared data contracts, establishing monorepo architecture, building the high-frequency telemetry ingestion layer, and setting up the visual canvas and graph validation pipeline. All three workstreams have met their core Week 1 deliverables as defined in the project plan.

---

### 2. Deliverables Accomplished by Workstream

#### Member 1: Team Lead & Data Ingestion Engineer
- **Shared Contracts:** Authored and froze data contracts in `/docs/contracts.md` (Contract 4.1 Graph JSON, Contract 4.2 Telemetry Document, Contract 4.3 API & WebSocket events).
- **Architecture:** Initialized clean monorepo structure (`/server`, `/client`, `/docs`).
- **Time-Series Database:** Designed MongoDB 5.0+ Time-Series collection (`timeseries: { timeField: "timestamp", metaField: "metadata", granularity: "seconds" }`).
- **Ingestion API:** Implemented `POST /api/telemetry` supporting both single readings and high-speed batch writes using `insertMany(..., { ordered: false })`.
- **Payload & Rate Guards:** Added payload schema validation and zero-dependency in-memory sliding-window rate limiter (1,000 req/min).
- **IoT Mock Simulator:** Built configurable CLI telemetry simulator (`mockSensor.js`) with speed controls, batching, and anomalous spike generation.
- **Ingestion Audit Demo:** Built end-to-end 1,000 readings verification script (`verifyIngestionDemo.js`) and Postman collection (`NexusFlow_Week1_Ingestion.postman_collection.json`).

#### Member 2: Stream Compiler & Rule Engine Engineer
- **Graph Schema:** Designed JSON Schema for rules and nodes (`source.sensor`, `filter.movingAverage`, `action.sms`, `action.webhook`, `math`, `condition`).
- **Validation Engine:** Built Ajv validator (`graph.validator.js`) ensuring graph integrity, detecting unknown node types, missing edges, disconnected orphan nodes, and cycle loops.
- **Graph Persistence API:** Implemented `POST /api/graphs` and `GET /api/graphs/:id` with Mongoose model.
- **Coexistence:** Unified with the core Express server under `/api/graphs`.

#### Member 3: Frontend & Visualization Engineer
- **Client Workspace:** Initialized React application using Vite in `/client/`.
- **React Flow Canvas:** Integrated interactive canvas with pan, zoom, drag-and-drop, and connection deletion.
- **Node Palette:** Developed sidebar component (`Sidebar.jsx`) featuring draggable source, filter, condition, and action node types.
- **Independent Mock API:** Created client-side mock data layer (`mockApi.js`) allowing visual development decoupled from backend state.

---

### 3. Verification & Test Metrics
- **Automated Test Suites:** 5 suites, 26 unit and integration tests covering server health, CORS, Time-Series schema options, payload validation, rate-limiting, simulator execution, graph schema validation, and dual-module coexistence.
- **Test Pass Rate:** 100% (26 passed, 0 failed).
- **Throughput Benchmark:** Ingestion simulator demonstrated >350 writes/second in local test batches with zero packet drop.

---

### 4. Week 2 Roadmap & Next Steps
1. **Member 1:** Set up WebSocket server (`ws`/Socket.IO), publish `telemetry:update` events, build internal event bus (EventEmitter), and load test up to 5,000 writes/sec.
2. **Member 2:** Build the RxJS compiler, map nodes to reactive operator factories (Moving Average, Threshold, Math), and run against fake stream.
3. **Member 3:** Create custom React Flow node components (Data Source, Filter, Action Trigger) and node settings panels.


---

## Week 2 Progress: Days 1 & 2 (Milestone v0.2-in-progress)

### 1. Ingestion & Event Streaming Deliverables (Member 1 - Team Lead)
- **Time-Range Queries & Indexing (Day 1):**
  - Designed compound MongoDB indexes on `{ "metadata.sensorId": 1, timestamp: -1 }`, `{ "metadata.site": 1, timestamp: -1 }`, and `{ timestamp: -1 }`.
  - Implemented high-performance endpoint `GET /api/telemetry/query` supporting `sensorId`, `site`, `startTime`, `endTime`, `metric`, `minVal`, `maxVal`, pagination (`limit`, `page`), and ordering (`asc`/`desc`).
- **Reactive In-Process Event Bus (Day 1):**
  - Created `TelemetryEventBus` (`server/src/ingestion/services/telemetryBus.js`) based on Node.js `EventEmitter`.
  - Dispatches `telemetry:ingested` and `telemetry:update` on single or batch inserts, enabling zero-latency subscription for Member 2's Stream Compiler without inter-process overhead.
- **WebSocket Live Broadcasting (Day 2):**
  - Integrated Socket.IO server (`server/src/ingestion/services/telemetrySocket.js`) into core HTTP server.
  - Subscribed to `telemetryBus` to emit live events conforming to Contract 4.3:
    - `telemetry:update`: Broadcasts live readings to connected dashboards and sensor-specific rooms.
    - `alert:fired`: Broadcasts rule alert notifications.
    - `node:active`: Broadcasts active execution signal for canvas wire glow animations.
  - Implemented client room subscriptions (`subscribe:sensor`, `unsubscribe:sensor`).
- **Integration #1 Verification:**
  - Demonstrated end-to-end integration between `telemetryBus` and Member 2's compiled RxJS stream pipeline (`streamCompiler.js`), verifying automatic rule trigger and alert firing on live telemetry streams.

### 2. Teammate Progress Tracking
- **Member 2 (Compiler & Rule Engine):** Expanded stream compiler edge case tests, rule condition evaluation (`temperature`, `voltage`, `current`), and validation schemas.
- **Member 3 (Frontend & Visuals):** Added node settings panel, field-level connectivity verification, and graph JSON serialization in React Flow canvas.

### 3. Automated Test Suite Metrics
- **Test Suites:** 8 suites passing (`day7_telemetryQuery.test.js`, `day8_websocket.test.js`, `ingestionAudit.test.js`, `mockSensor.test.js`, `server.test.js`, `telemetry.test.js`, `verifyDemo.test.js`, `week1Milestone.test.js`).
- **Total Tests:** 41 tests passing (100% pass rate).
