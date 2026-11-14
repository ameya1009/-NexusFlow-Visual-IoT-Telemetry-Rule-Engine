# Stream Compiler & Rule Engine Module

> **Owner:** Member 2 (Stream Compiler & Rule Engine Engineer)  
> **Area:** Graph validation, JSON-to-RxJS compiler, Node operator library, Live rule execution

## Planned Structure (Week 1 & Week 2):
- `graph.validator.js`: Ajv / JSON Schema validator checking for unknown node types, missing edges, cycles, and orphan nodes.
- `graph.model.js`: Mongoose Schema for saving and querying graph definitions in `graphs` collection.
- `graph.routes.js`: Handlers for `POST /api/graphs`, `GET /api/graphs/:id`, and activation triggers.
- `operators/`: RxJS operator factories for filters, math, conditions, and actions.
- `compiler.js`: Topological sort & reactive stream compilation pipeline.
