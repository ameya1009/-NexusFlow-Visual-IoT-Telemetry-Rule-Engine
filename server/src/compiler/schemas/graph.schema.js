
const graphSchema = {
  type: "object",
  required: ["graphId", "name", "nodes", "edges"],
  additionalProperties: false,

  properties: {
    graphId: { type: "string", minLength: 1 },
    name: { type: "string", minLength: 1 },

    nodes: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["id", "type", "data"],
        additionalProperties: false,

        properties: {
          id: { type: "string", minLength: 1 },

          type: {
            type: "string",
            enum: [
              "source.sensor",
              "filter.movingAverage",
              "math",
              "condition",
              "action.sms",
              "action.webhook"
            ]
          },

          data: { type: "object" }
        },

        allOf: [
          {
            if: {
              properties: { type: { const: "source.sensor" } },
              required: ["type"]
            },
            then: {
              properties: {
                data: {
                  type: "object",
                  required: ["sensorId", "metric"],
                  additionalProperties: false,
                  properties: {
                    sensorId: { type: "string", minLength: 1 },
                    metric: { type: "string", minLength: 1 }
                  }
                }
              }
            }
          },
          {
            if: {
              properties: { type: { const: "filter.movingAverage" } },
              required: ["type"]
            },
            then: {
              properties: {
                data: {
                  type: "object",
                  required: ["windowSize"],
                  additionalProperties: false,
                  properties: {
                    windowSize: {
                      type: "integer",
                      minimum: 1,
                      maximum: 1000
                    }
                  }
                }
              }
            }
          },
          {
            if: {
              properties: { type: { const: "action.sms" } },
              required: ["type"]
            },
            then: {
              properties: {
                data: {
                  type: "object",
                  required: ["to", "threshold"],
                  additionalProperties: false,
                  properties: {
                    to: { type: "string", minLength: 1 },
                    threshold: { type: "number" }
                  }
                }
              }
            }
          }
        ]
      }
    },

    edges: {
      type: "array",
      items: {
        type: "object",
        required: ["source", "target"],
        additionalProperties: false,
        properties: {
          source: { type: "string", minLength: 1 },
          target: { type: "string", minLength: 1 }
        }
      }
    }
  }
};

module.exports = graphSchema;
