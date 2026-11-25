
/**
 * Creates a safe, mockable action handler.
 *
 * Supports SMS and Webhook actions through injected callbacks.
 * No real messages or HTTP requests are sent by this module.
 */
function createActionHandler(handlers = {}) {
  return async function executeAction(action, payload) {
    if (!action || typeof action !== "string") {
      throw new Error("Action type must be a string");
    }

    if (!payload || typeof payload !== "object") {
      throw new Error("Action payload must be an object");
    }

    const handler = handlers[action];

    if (typeof handler !== "function") {
      throw new Error(`No handler registered for action: ${action}`);
    }

    return await handler(payload);
  };
}

module.exports = {
  createActionHandler
};
