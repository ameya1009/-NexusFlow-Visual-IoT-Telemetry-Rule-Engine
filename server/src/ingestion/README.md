# Telemetry & Ingestion Module

> **Owner:** Member 1 (Team Lead & Data/Ingestion Engineer)  
> **Area:** Express ingestion API, MongoDB Time-Series design, WebSockets, Rate limiting, Webhooks

## Planned Structure (Week 1 - Day 2 onwards):
- `telemetry.model.js`: Mongoose Schema for MongoDB Time-Series collection (`timeseries: { timeField: "timestamp", metaField: "metadata", granularity: "seconds" }`).
- `telemetry.controller.js`: Handlers for `POST /api/telemetry` (single reading and high-speed batch insert with `insertMany(..., { ordered: false })`).
- `telemetry.routes.js`: Express routes for ingestion.
- `telemetry.validator.js`: Payload schema validation and rate-limit guards.
- `mockSensor.js`: Standalone IoT sensor simulator script emitting readings at configurable rates.
