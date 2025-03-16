// ----------------------------
// TOOLS
// ----------------------------

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { initActualApi } from "../actual-api.js";
import {
  GetTransactionsArgs,
  SpendingByCategoryArgs,
  MonthlySummaryArgs,
  BalanceHistoryArgs,
} from "../types.js";
import {
  schema as getTransactionsSchema,
  handler as getTransactionsHandler,
} from "./get-transactions.js";
import {
  schema as spendingByCategorySchema,
  handler as spendingByCategoryHandler,
} from "./spending-by-category.js";
import {
  schema as monthlySummarySchema,
  handler as monthlySummaryHandler,
} from "./monthly-summary.js";
import {
  schema as balanceHistorySchema,
  handler as balanceHistoryHandler,
} from "./balance-history.js";

export const setupTools = (server: Server) => {
  /**
   * Handler for listing available tools
   */
  server.setRequestHandler(ListToolsRequestSchema, toolsSchema);

  /**
   * Handler for calling tools
   */
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      await initActualApi();
      const { name, arguments: args } = request.params;

      // Execute the requested tool
      switch (name) {
        case "get-transactions": {
          // TODO: Validate against schema
          return getTransactionsHandler(args as unknown as GetTransactionsArgs);
        }

        case "spending-by-category": {
          return spendingByCategoryHandler(
            args as unknown as SpendingByCategoryArgs
          );
        }

        case "monthly-summary": {
          return monthlySummaryHandler(args as unknown as MonthlySummaryArgs);
        }

        case "balance-history": {
          return balanceHistoryHandler(args as unknown as BalanceHistoryArgs);
        }

        default:
          return {
            isError: true,
            content: [{ type: "text", text: `Error: Unknown tool ${name}` }],
          };
      }
    } catch (error) {
      console.error(`Error executing tool ${request.params.name}:`, error);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  });
};

function toolsSchema() {
  return {
    tools: [
      getTransactionsSchema,
      spendingByCategorySchema,
      monthlySummarySchema,
      balanceHistorySchema,
    ],
  };
}
