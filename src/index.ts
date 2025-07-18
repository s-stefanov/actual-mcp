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
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import { parseArgs } from "node:util";
import { initActualApi, shutdownActualApi } from "./actual-api.js";
import { fetchAllAccounts } from "./core/data/fetch-accounts.js";
import { setupPrompts } from "./prompts.js";
import { setupResources } from "./resources.js";
import { setupTools } from "./tools/index.js";
dotenv.config({ path: ".env" });

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
      logging: {},
    },
  }
);

// Argument parsing
const {
  values: {
    sse: useSse,
    "enable-write": enableWrite,
    "enable-bearer": enableBearer,
    port,
    "test-resources": testResources,
    "test-custom": testCustom,
  },
} = parseArgs({
  options: {
    sse: { type: "boolean", default: false },
    "enable-write": { type: "boolean", default: false },
    "enable-bearer": { type: "boolean", default: false },
    port: { type: "string" },
    "test-resources": { type: "boolean", default: false },
    "test-custom": { type: "boolean", default: false },
  },
  allowPositionals: true,
});

const resolvedPort = port ? parseInt(port, 10) : 3000;

// Bearer authentication middleware
const bearerAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!enableBearer) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      error: "Authorization header required",
    });
    return;
  }

  if (!authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Authorization header must start with 'Bearer '",
    });
    return;
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix
  const expectedToken = process.env.BEARER_TOKEN;

  if (!expectedToken) {
    console.error("BEARER_TOKEN environment variable not set");
    res.status(500).json({
      error: "Server configuration error",
    });
    return;
  }

  if (token !== expectedToken) {
    res.status(401).json({
      error: "Invalid bearer token",
    });
    return;
  }

  next();
};

// ----------------------------
// SERVER STARTUP
// ----------------------------

// Start the server
async function main(): Promise<void> {
  // If testing resources, verify connectivity and list accounts, then exit
  if (testResources) {
    console.log("Testing resources...");
    try {
      await initActualApi();
      const accounts = await fetchAllAccounts();
      console.log(`Found ${accounts.length} account(s).`);
      accounts.forEach((account) =>
        console.log(`- ${account.id}: ${account.name}`)
      );
      console.log("Resource test passed.");
      await shutdownActualApi();
      process.exit(0);
    } catch (error) {
      console.error("Resource test failed:", error);
      process.exit(1);
    }
  }

  if (testCustom) {
    console.log("Initializing custom test...");
    try {
      await initActualApi();

      // Custom test here

      // ----------------

      console.log("Custom test passed.");
      await shutdownActualApi();
      process.exit(0);
    } catch (error) {
      console.error("Custom test failed:", error);
    }
  }

  // Validate environment variables
  if (!process.env.ACTUAL_DATA_DIR && !process.env.ACTUAL_SERVER_URL) {
    console.error(
      "Warning: Neither ACTUAL_DATA_DIR nor ACTUAL_SERVER_URL is set."
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

  if (useSse) {
    const app = express();
    app.use(express.json());
    let transport: SSEServerTransport | null = null;

    // Log bearer auth status
    if (enableBearer) {
      console.error("Bearer authentication enabled for SSE endpoints");
    } else {
      console.error("Bearer authentication disabled - endpoints are public");
    }

    // Placeholder for future HTTP transport (stateless)
    app.post("/mcp", bearerAuth, async (req: Request, res: Response) => {
      res.status(501).json({ error: "HTTP transport not implemented yet" });
    });

    app.get("/sse", bearerAuth, (req: Request, res: Response) => {
      transport = new SSEServerTransport("/messages", res);
      server.connect(transport).then(() => {
        console.log = (message: string) =>
          server.sendLoggingMessage({ level: "info", message });

        console.error = (message: string) =>
          server.sendLoggingMessage({ level: "error", message });

        console.error(
          `Actual Budget MCP Server (SSE) started on port ${resolvedPort}`
        );
      });
    });
    app.post("/messages", bearerAuth, async (req: Request, res: Response) => {
      if (transport) {
        await transport.handlePostMessage(req, res, req.body);
      } else {
        res.status(500).json({ error: "Transport not initialized" });
      }
    });

    app.listen(resolvedPort, (error) => {
      if (error) {
        console.error("Error:", error);
      } else {
        console.error(
          `Actual Budget MCP Server (SSE) started on port ${resolvedPort}`
        );
      }
    });
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Actual Budget MCP Server (stdio) started");
  }
}

setupResources(server);
setupTools(server, enableWrite);
setupPrompts(server);

process.on("SIGINT", () => {
  console.error("SIGINT received, shutting down server");
  server.close();
  process.exit(0);
});

main()
  .then(() => {
    if (!useSse) {
      console.log = (message: string) =>
        server.sendLoggingMessage({
          level: "info",
          message,
        });
      console.error = (message: string) =>
        server.sendLoggingMessage({
          level: "error",
          message,
        });
    }
  })
  .catch((error: unknown) => {
    console.error("Server error:", error);
    process.exit(1);
  });
