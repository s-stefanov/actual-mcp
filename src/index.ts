#!/usr/bin/env node
/**
 * MCP Server for Actual Budget
 *
 * This server exposes your Actual Budget data to LLMs through the Model Context Protocol,
 * allowing for natural language interaction with your financial data.
 *
 * Features:
 * - List and view accounts
 * - View transactions with filtering
 * - Generate financial statistics and analysis
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import path from "path";

import { setupPrompts } from "./prompts.js";
import { setupTools } from "./tools/index.js";
import { setupResources } from "./resources.js";

// Configuration
const DEFAULT_DATA_DIR: string = path.resolve(
  process.env.HOME || process.env.USERPROFILE || ".",
  ".actual"
);

// Initialize the MCP server
const server = new Server(
  {
    name: "Actual Budget",
    version: "1.0.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

// ----------------------------
// SERVER STARTUP
// ----------------------------

// Start the server
async function main(): Promise<void> {
  // Validate environment variables
  if (!process.env.ACTUAL_DATA_DIR && !process.env.ACTUAL_SERVER_URL) {
    console.error(
      "Warning: Neither ACTUAL_DATA_DIR nor ACTUAL_SERVER_URL is set."
    );
    console.error(
      `Will try to use default data directory: ${DEFAULT_DATA_DIR}`
    );
  }

  if (process.env.ACTUAL_SERVER_URL && !process.env.ACTUAL_PASSWORD) {
    console.error(
      "Warning: ACTUAL_SERVER_URL is set but ACTUAL_PASSWORD is not."
    );
    console.error(
      "If your server requires authentication, initialization will fail."
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Actual Budget MCP Server started");
}

setupResources(server);
setupTools(server);
setupPrompts(server);

main().catch((error: unknown) => {
  console.error("Server error:", error);
  process.exit(1);
});
