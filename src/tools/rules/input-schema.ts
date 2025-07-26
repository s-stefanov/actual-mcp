export const RuleInputSchema = {
  type: "object",
  required: ["stage", "conditions", "actions", "conditionsOp"],
  properties: {
    id: {
      type: "string",
      description: "Rule ID in UUID format (only needed for updating a rule)",
    },
    stage: {
      type: ["string", "null"],
      enum: ["pre", "post", null],
      description: "When the rule should be applied (null for default stage)",
    },
    conditionsOp: {
      type: "string",
      enum: ["and", "or"],
      description: "How to combine conditions",
    },
    conditions: {
      type: "array",
      description: "Conditions for the rule to apply",
      items: {
        type: "object",
        required: ["field", "op", "value"],
        properties: {
          field: {
            type: "string",
            enum: [
              "account",
              "category",
              "date",
              "payee",
              "amount",
              "imported_payee",
            ],
            description: "Field to apply the condition on.",
          },
          op: {
            type: "string",
            enum: [
              "is",
              "isNot",
              "oneOf",
              "notOneOf",
              "onBudget",
              "offBudget",
              "isapprox",
              "gt",
              "gte",
              "lt",
              "lte",
              "isbetween",
              "contains",
              "doesNotContain",
              "matches",
              "hasTags",
            ],
            description: "Condition operator",
          },
          value: {
            type: ["string", "number", "string[]", "number[]"],
            description: `Condition value. Format depends on field and operator types:
              account, category, payee: ID in UUID format,
              date: YYYY-MM-DD format,
              amount: number,
              notes: string,
              string[] is only used for oneOf and notOneOf,
              number[] is only used for isbetween.`,
          },
        },
      },
    },
    actions: {
      type: "array",
      description: "Actions of the applied rule",
      items: {
        type: "object",
        required: ["field", "op", "value"],
        properties: {
          field: {
            type: ["string", "null"],
            enum: [
              "account",
              "category",
              "date",
              "payee",
              "amount",
              "cleared",
              "notes",
              null,
            ],
            description:
              "Field to apply the action on. Use null for split actions.",
          },
          op: {
            type: "string",
            enum: ["set", "prepend-notes", "append-notes", "set-split-amount"],
            description: "Action operator",
          },
          value: {
            type: ["boolean", "string", "number", "null"],
            description: `Action value. For regular actions depends on field type:
              account, category, payee: ID in UUID format,
              date: YYYY-MM-DD format,
              amount: number (in cents: positive for deposit, negative for payment),
              cleared: boolean,
              notes: string.
              For split actions depends on method:
              remainder: null,
              fixed-amount: number (in cents: positive for deposit, negative for payment),
              fixed-percent: number (0-100).
              `,
          },
          options: {
            type: "object",
            description:
              "Additional properties concerning splits. Only necessary if the rule is split.",
            properties: {
              splitIndex: {
                type: "number",
                description:
                  "Split index (counting from 1) to apply the action on. Use 0 to apply to all splits.",
              },
              method: {
                type: "string",
                enum: ["fixed-amount", "fixed-percent", "remainder"],
                description: "Split method. Only for split actions.",
              },
            },
          },
        },
      },
    },
  },
};
