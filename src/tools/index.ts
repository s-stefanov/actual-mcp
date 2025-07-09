// ----------------------------
// TOOLS
// ----------------------------

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { initActualApi, shutdownActualApi } from "../actual-api.js";
import { error, errorFromCatch } from "../utils/response.js";

import * as getTransactions from "./get-transactions/index.js";
import * as spendingByCategory from "./spending-by-category/index.js";
import * as monthlySummary from "./monthly-summary/index.js";
import * as balanceHistory from "./balance-history/index.js";
import * as getAccounts from "./get-accounts/index.js";
import * as getCategories from "./get-categories/index.js";
import * as getPayees from "./payees/get-payees/index.js";
import * as createPayee from "./payees/create-payee/index.js";
import * as updatePayee from "./payees/update-payee/index.js";
import * as deletePayee from "./payees/delete-payee/index.js";
import * as getRules from "./rules/get-rules/index.js";
import * as createRule from "./rules/create-rule/index.js";
import * as updateRule from "./rules/update-rule/index.js";
import * as deleteRule from "./rules/delete-rule/index.js";

const allTools = [
  getTransactions,
  spendingByCategory,
  monthlySummary,
  balanceHistory,
  getAccounts,
  getCategories,
  getPayees,
  createPayee,
  updatePayee,
  deletePayee,
  getRules,
  createRule,
  updateRule,
  deleteRule,
];

export const setupTools = (server: Server) => {
  /**
   * Handler for listing available tools
   */
  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: allTools.map((tool) => tool.schema),
  }));

  /**
   * Handler for calling tools
   */
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      await initActualApi();
      const { name, arguments: args } = request.params;

      const tool = allTools.find((t) => t.schema.name === name);
      if (!tool) {
        return error(`Unknown tool ${name}`);
      }

      return tool.handler(args);
    } catch (err) {
      console.error(`Error executing tool ${request.params.name}:`, err);
      return errorFromCatch(err);
    } finally {
      await shutdownActualApi();
    }
  });
};
