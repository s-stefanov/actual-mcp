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
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import express, { Request, Response } from 'express';
import { parseArgs } from 'node:util';
import path from 'path';
import { setupPrompts } from './prompts.js';
import { setupResources } from './resources.js';
import { setupTools } from './tools/index.js';

// Configuration
const DEFAULT_DATA_DIR: string = path.resolve(process.env.HOME || process.env.USERPROFILE || '.', '.actual');

// Initialize the MCP server
const server = new Server(
  {
    name: 'Actual Budget',
    version: '1.0.0',
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
  values: { sse: useSse, port },
} = parseArgs({
  options: {
    sse: { type: 'boolean', default: false },
    port: { type: 'string' },
  },
  allowPositionals: true,
});

const resolvedPort = port ? parseInt(port, 10) : 3000;

// ----------------------------
// SERVER STARTUP
// ----------------------------

// Start the server
async function main(): Promise<void> {
  // Validate environment variables
  if (!process.env.ACTUAL_DATA_DIR && !process.env.ACTUAL_SERVER_URL) {
    console.error('Warning: Neither ACTUAL_DATA_DIR nor ACTUAL_SERVER_URL is set.');
    console.error(`Will try to use default data directory: ${DEFAULT_DATA_DIR}`);
  }

  if (process.env.ACTUAL_SERVER_URL && !process.env.ACTUAL_PASSWORD) {
    console.error('Warning: ACTUAL_SERVER_URL is set but ACTUAL_PASSWORD is not.');
    console.error('If your server requires authentication, initialization will fail.');
  }

  if (useSse) {
    const app = express();
    app.use(express.json());
    let transport: SSEServerTransport | null = null;

    // Placeholder for future HTTP transport (stateless)
    app.post('/mcp', async (req: Request, res: Response) => {
      res.status(501).json({ error: 'HTTP transport not implemented yet' });
    });

    app.get('/sse', (req: Request, res: Response) => {
      transport = new SSEServerTransport('/messages', res);
      server.connect(transport);
    });
    app.post('/messages', async (req: Request, res: Response) => {
      if (transport) {
        await transport.handlePostMessage(req, res, req.body);
      } else {
        res.status(500).json({ error: 'Transport not initialized' });
      }
    });

    app.listen(resolvedPort, (error) => {
      if (error) {
        console.error('Error:', error);
      } else {
        console.error(`Actual Budget MCP Server (SSE) started on port ${resolvedPort}`);
      }
    });
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Actual Budget MCP Server (stdio) started');
  }
}

setupResources(server);
setupTools(server);
setupPrompts(server);

process.on('SIGINT', () => {
  console.error('SIGINT received, shutting down server');
  server.close();
  process.exit(0);
});

main()
  .then(() => {
    console.log = (message: string) =>
      server.sendLoggingMessage({
        level: 'info',
        message,
      });
    console.error = (message: string) =>
      server.sendLoggingMessage({
        level: 'error',
        message,
      });
  })
  .catch((error: unknown) => {
    console.error('Server error:', error);
    process.exit(1);
  });
