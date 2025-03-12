#!/usr/bin/env node

/**
 * This is a template MCP server that implements a simple notes system.
 * It demonstrates core MCP concepts like resources and tools by allowing:
 * - Listing notes as resources
 * - Reading individual notes
 * - Creating new notes via a tool
 * - Summarizing all notes via a prompt
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import api from "@actual-app/api";
import { APIAccountEntity } from "@actual-app/api/@types/loot-core/server/api-models.js";

/**
 * Create an MCP server with capabilities for resources (to list/read accounts),
 * tools (to import new transactions), and prompts (to summarize transactions).
 */
const server = new Server(
  {
    name: "Actual Budget MCP Server",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

/**
 * Handler for listing available accounts as resources.
 * Each account is exposed as a resource with:
 * - An account:// URI scheme
 * - Plain text MIME type
 * - Human readable name and description (now including the account name)
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  await api.init({
    dataDir: process.env.ACTUAL_DATA_DIR ?? "./data",
    // This is the URL of your running server
    serverURL: process.env.ACTUAL_SERVER_URL,
    // This is the password you use to log into the server
    password: process.env.ACTUAL_PASSWORD,
  });

  await api.downloadBudget(process.env.ACTUAL_BUDGET_SYNC_ID);

  const accounts: APIAccountEntity[] = await api.getAccounts();
  return {
    resources: accounts.map(account => ({
      uri: `account:///${account.id}`,
      mimeType: "text/plain",
      name: account.name,
      description: `An account: ${account.name}`
    }))
  };
});


/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
