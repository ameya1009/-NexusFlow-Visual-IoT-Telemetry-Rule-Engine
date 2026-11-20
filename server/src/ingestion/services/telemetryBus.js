const EventEmitter = require("events");

/**
 * TelemetryEventBus - In-process Reactive Event Bus (Node.js EventEmitter)
 * 
 * Provides decoupled pub/sub streaming between:
 * 1. Data Ingestion Pipeline (Member 1)
 * 2. RxJS Stream Compiler & Rule Engine (Member 2)
 * 3. WebSocket Real-time Broadcaster to React Flow Dashboard (Member 3)
 * 
 * Complies with Contract Section 2.3 & Week 2 Day 7/8 Specifications.
 */
class TelemetryEventBus extends EventEmitter {
  constructor() {
    super();
    // Allow many active graph subscriptions without MaxListenersExceeded warning
    this.setMaxListeners(100);

    // Event constants
    this.EVENTS = {
      TELEMETRY_INGESTED: "telemetry:ingested",
      TELEMETRY_UPDATE: "telemetry:update",
      ALERT_FIRED: "alert:fired",
      NODE_ACTIVE: "node:active",
    };

    // In-memory runtime telemetry metrics
    this.metrics = {
      totalIngestedEvents: 0,
      totalUpdatesEmitted: 0,
      totalAlertsEmitted: 0,
      totalActiveEmitted: 0,
      lastIngestTimestamp: null,
    };
  }

  /**
   * Publish ingested telemetry data to all subscribers.
   * Accepts a single telemetry reading or an array of readings (batch).
   * 
   * @param {Object|Array<Object>} readings - One or more telemetry readings
   */
  publish(readings) {
    if (!readings) return;

    const list = Array.isArray(readings) ? readings : [readings];
    if (list.length === 0) return;

    this.metrics.totalIngestedEvents += list.length;
    this.metrics.lastIngestTimestamp = new Date().toISOString();

    // 1. Emit aggregate batch event for bulk consumers
    this.emit(this.EVENTS.TELEMETRY_INGESTED, list);

    // 2. Emit per-reading update matching Contract 4.3 (WS event: telemetry:update)
    for (const reading of list) {
      // Normalize to plain object if Mongoose document
      const plain = reading && typeof reading.toObject === "function" ? reading.toObject() : reading;

      // Provide deviceId alias alongside metadata.sensorId for universal compatibility
      const normalized = {
        ...plain,
        deviceId: plain.deviceId || plain.metadata?.sensorId || plain.sensorId,
      };

      this.metrics.totalUpdatesEmitted += 1;
      this.emit(this.EVENTS.TELEMETRY_UPDATE, normalized);
    }
  }

  /**
   * Publish an alert fired by the rule engine (Member 2 -> Member 1 broadcaster)
   * @param {Object} alert - { graphId, nodeId, value, time, alertType, sensorId }
   */
  publishAlert(alert) {
    this.metrics.totalAlertsEmitted += 1;
    this.emit(this.EVENTS.ALERT_FIRED, alert);
  }

  /**
   * Publish a node active event for React canvas wire glowing (Member 2 -> Member 3)
   * @param {Object} nodeActive - { graphId, nodeId, timestamp, value }
   */
  publishNodeActive(nodeActive) {
    this.metrics.totalActiveEmitted += 1;
    this.emit(this.EVENTS.NODE_ACTIVE, nodeActive);
  }

  /**
   * Subscribe to single telemetry updates
   * @param {Function} callback 
   */
  onTelemetryUpdate(callback) {
    this.on(this.EVENTS.TELEMETRY_UPDATE, callback);
    return () => this.off(this.EVENTS.TELEMETRY_UPDATE, callback);
  }

  /**
   * Subscribe to batch telemetry events
   * @param {Function} callback 
   */
  onTelemetryIngested(callback) {
    this.on(this.EVENTS.TELEMETRY_INGESTED, callback);
    return () => this.off(this.EVENTS.TELEMETRY_INGESTED, callback);
  }

  /**
   * Retrieve bus throughput & subscription statistics
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeSubscribers: {
        telemetryUpdate: this.listenerCount(this.EVENTS.TELEMETRY_UPDATE),
        telemetryIngested: this.listenerCount(this.EVENTS.TELEMETRY_INGESTED),
        alertFired: this.listenerCount(this.EVENTS.ALERT_FIRED),
        nodeActive: this.listenerCount(this.EVENTS.NODE_ACTIVE),
      },
    };
  }

  /**
   * Reset metrics and clear all listeners (for unit testing)
   */
  reset() {
    this.removeAllListeners();
    this.metrics = {
      totalIngestedEvents: 0,
      totalUpdatesEmitted: 0,
      totalAlertsEmitted: 0,
      totalActiveEmitted: 0,
      lastIngestTimestamp: null,
    };
  }
}

// Global Singleton Instance
const telemetryBus = new TelemetryEventBus();

module.exports = telemetryBus;
module.exports.TelemetryEventBus = TelemetryEventBus;
