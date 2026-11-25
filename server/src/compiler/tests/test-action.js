
const assert = require("assert");

const {
  createActionHandler
} = require("../operators/action");

async function runTests() {
  let smsCalled = false;
  let webhookCalled = false;

  // Mock SMS handler
  const handlers = {
    sms: async payload => {
      smsCalled = true;
      return {
        success: true,
        message: payload.message
      };
    },

    webhook: async payload => {
      webhookCalled = true;
      return {
        success: true,
        url: payload.url
      };
    }
  };

  const executeAction = createActionHandler(handlers);

  // Test SMS
  const smsResult = await executeAction("sms", {
    message: "High temperature detected"
  });

  assert.strictEqual(smsCalled, true);
  assert.strictEqual(smsResult.success, true);

  // Test Webhook
  const webhookResult = await executeAction("webhook", {
    url: "https://example.com/webhook"
  });

  assert.strictEqual(webhookCalled, true);
  assert.strictEqual(webhookResult.success, true);

  // Test unsupported action
  await assert.rejects(
    executeAction("email", {}),
    /No handler registered/
  );

  // Test invalid action
  await assert.rejects(
    executeAction("", {}),
    /Action type must be a string/
  );

  // Test invalid payload
  await assert.rejects(
    executeAction("sms", null),
    /Action payload must be an object/
  );

  console.log("All Action operator tests passed!");
}

runTests().catch(error => {
  console.error("Action tests failed:", error);
  process.exitCode = 1;
});
