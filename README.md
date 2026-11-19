# NexusFlow: Visual IoT Telemetry & Rule Engine

> A high-performance MERN-stack IoT platform allowing non-technical operators to construct visual drag-and-drop sensor filter and alert pipelines in React Flow, compiled into live reactive RxJS streams running against MongoDB 5.0+ Time-Series collections.

---

## 1. Project Architecture

NexusFlow is structured as a modular monorepo to ensure clean separation of concerns:

```
NexusFlow/
├── client/              # Frontend (Member 3): React, React Flow, Recharts, WebSocket client
│   ├── src/
│   │   ├── components/  # FlowCanvas, Sidebar node palette, node settings
│   │   └── App.jsx
│   └── package.json
├── server/              # Backend (Members 1 & 2): Express, MongoDB Time-Series, RxJS
│   ├── src/
│   │   ├── ingestion/   # Member 1 (Lead): Time-Series schema, batch API, rate limiter, simulator
│   │   ├── compiler/    # Member 2: JSON Schema, Ajv validator, RxJS stream compiler
│   │   ├── config/      # Database & environment configurations
│   │   └── server.js    # Express application & unified API routing
│   ├── test/            # Automated Node.js test suites
│   └── package.json
└── docs/                # Architecture & Team Governance (Team Lead)
    ├── contracts.md     # Frozen shared data contracts (Graph JSON, Telemetry shape, Events)
    └── progress.md      # Weekly sprint summaries & milestone reviews
```

---

## 2. Team Structure & Areas of Ownership

| Member | Role | Area of Ownership | Tech Stack |
| :--- | :--- | :--- | :--- |
| **Member 1 (Team Lead)** | Data & Ingestion Engineer | MongoDB Time-Series design, Express ingestion API, WebSockets, rate guards, project coordination | Node.js, Express, MongoDB 5.0+, Socket.io |
| **Member 2** | Stream Compiler Engineer | Graph JSON validation, JSON-to-RxJS compiler, operator library, live pipeline execution | Node.js, RxJS, Ajv, JSON Schema |
| **Member 3** | Frontend Engineer | React Flow canvas, draggable node library, live charts, visual wire feedback | React, React Flow, Recharts, Vite |

---

## 3. Quickstart & Installation

### Prerequisites
- **Node.js:** v18.0.0 or higher (v22+ recommended)
- **MongoDB:** v5.0+ (required for Time-Series collection support)
- **Git**

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/ameya1009/-NexusFlow-Visual-IoT-Telemetry-Rule-Engine.git
cd -NexusFlow-Visual-IoT-Telemetry-Rule-Engine

# 2. Setup Server
cd server
npm install
cp .env.example .env
npm start

# 3. Setup Client (in a separate terminal)
cd ../client
npm install
npm run dev
```

---

## 4. Key Server Scripts

| Command | Purpose |
| :--- | :--- |
| `npm test` | Runs the automated test suite across all modules (26+ tests) |
| `npm run mock-sensor` | Runs the high-speed IoT mock sensor simulator (default: 1,000 readings at 100/sec) |
| `npm run verify-demo` | Executes the end-to-end Week 1 ingestion audit demo |
| `npm run audit` | Runs the Ingestion Storage & Throughput benchmark utility |

---

## 5. API Endpoints Overview

- `GET /api/health` — System and database connectivity health check
- `POST /api/telemetry` — High-speed single / batch telemetry ingestion (`insertMany, ordered: false`)
- `GET /api/telemetry/latest` — Query latest telemetry records by sensorId
- `POST /api/graphs` — Validate and save visual graph JSON (Ajv validated)
- `GET /api/graphs/:id` — Retrieve a saved rule graph by ID

For detailed data payloads, refer to [`docs/contracts.md`](docs/contracts.md).
