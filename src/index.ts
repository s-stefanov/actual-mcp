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
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { mcpAuthMetadataRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { initActualApi, shutdownActualApi } from './actual-api.js';
import { buildAuthContext, type AuthContext, MCP_PUBLIC_URL } from './auth/index.js';
import { fetchAllAccounts } from './core/data/fetch-accounts.js';
import { setupPrompts } from './prompts.js';
import { setupResources } from './resources.js';
import { setupTools } from './tools/index.js';
import { SetLevelRequestSchema, isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

dotenv.config({ path: '.env' });

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
  values: {
    sse: useSse,
    'enable-write': enableWrite,
    'enable-bearer': enableBearer,
    'enable-oauth': enableOauth,
    port,
    'test-resources': testResources,
    'test-custom': testCustom,
  },
} = parseArgs({
  options: {
    sse: { type: 'boolean', default: false },
    'enable-write': { type: 'boolean', default: false },
    'enable-bearer': { type: 'boolean', default: false },
    'enable-oauth': { type: 'boolean', default: false },
    port: { type: 'string' },
    'test-resources': { type: 'boolean', default: false },
    'test-custom': { type: 'boolean', default: false },
  },
  allowPositionals: true,
});

const resolvedPort = port ? parseInt(port, 10) : 3000;

/**
 * Safely stringify values for logging without throwing on circular structures.
 */
const safeStringify = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
};

const toErrorMessage = (value: unknown): string =>
  value instanceof Error ? `${value.name}: ${value.message}` : safeStringify(value);

// ----------------------------
// SERVER STARTUP
// ----------------------------

// Start the server
async function main(): Promise<void> {
  // If testing resources, verify connectivity and list accounts, then exit
  if (testResources) {
    console.log('Testing resources...');
    try {
      await initActualApi();
      const accounts = await fetchAllAccounts();
      console.log(`Found ${accounts.length} account(s).`);
      accounts.forEach((account) => console.log(`- ${account.id}: ${account.name}`));
      console.log('Resource test passed.');
      await shutdownActualApi();
      process.exit(0);
    } catch (error) {
      console.error('Resource test failed:', error);
      process.exit(1);
    }
  }

  if (testCustom) {
    console.log('Initializing custom test...');
    try {
      await initActualApi();

      // Custom test here

      // ----------------

      console.log('Custom test passed.');
      await shutdownActualApi();
      process.exit(0);
    } catch (error) {
      console.error('Custom test failed:', error);
    }
  }

  // Validate environment variables
  if (!process.env.ACTUAL_DATA_DIR && !process.env.ACTUAL_SERVER_URL) {
    console.error('Warning: Neither ACTUAL_DATA_DIR nor ACTUAL_SERVER_URL is set.');
  }

  if (process.env.ACTUAL_SERVER_URL && !process.env.ACTUAL_PASSWORD) {
    console.error('Warning: ACTUAL_SERVER_URL is set but ACTUAL_PASSWORD is not.');
    console.error('If your server requires authentication, initialization will fail.');
  }

  if (useSse) {
    // Build auth context based on CLI flags and env vars
    const authContext: AuthContext = await buildAuthContext({
      enableOauth,
      enableBearer,
      port: resolvedPort,
    });

    const app = express();
    app.use(express.json());
    let transport: SSEServerTransport | null = null;

    // Log auth mode status
    console.error(`Authentication mode: ${authContext.mode}`);

    const streamableHttpTransports = new Map<string, StreamableHTTPServerTransport>();

    const parseSessionHeader = (value: string | string[] | undefined): string | undefined => {
      if (!value) {
        return undefined;
      }
      return Array.isArray(value) ? value[0] : value;
    };

    // Set up OAuth metadata router if OAuth is enabled
    if (authContext.oauthMetadata !== undefined) {
      const mcpPublicUrl = new URL(MCP_PUBLIC_URL);
      app.use(
        mcpAuthMetadataRouter({
          oauthMetadata: authContext.oauthMetadata,
          resourceServerUrl: mcpPublicUrl,
          scopesSupported: ['openid', 'email'],
          resourceName: 'Actual Budget MCP Server',
        })
      );
    } else {
      // Return 404 for OAuth metadata endpoints when OAuth is not configured
      app.get(
        ['/.well-known/oauth-authorization-server', '/.well-known/oauth-authorization-server/sse'],
        (_req, res) => {
          res.status(404).json({ error: 'OAuth metadata not configured for this server' });
        }
      );
      app.get(['/sse/.well-known/oauth-authorization-server'], (_req, res) => {
        res.status(404).json({ error: 'OAuth metadata not configured for this server' });
      });
    }

    const handleLegacySse = (_req: Request, res: Response): void => {
      transport = new SSEServerTransport('/messages', res);
      server.connect(transport).then(() => {
        console.log = (message: string) => server.sendLoggingMessage({ level: 'info', data: message });

        console.error = (message: string) => server.sendLoggingMessage({ level: 'error', data: message });

        console.error(`Actual Budget MCP Server (SSE) started on port ${resolvedPort}`);
      });
    };

    // Register routes with optional auth middleware
    const authMiddleware = authContext.middleware;

    if (authMiddleware) {
      app.get('/sse', authMiddleware, handleLegacySse);
    } else {
      app.get('/sse', handleLegacySse);
    }

    const streamablePaths = ['/', '/mcp'];

    const handleStreamable = async (req: Request, res: Response): Promise<void> => {
      const sessionHeader = parseSessionHeader(req.headers['mcp-session-id']);
      if (req.method === 'GET' && !sessionHeader && req.headers.accept?.includes('text/event-stream')) {
        handleLegacySse(req, res);
        return;
      }
      const requestLabel = `${req.method} ${req.path}`;
      try {
        let streamableTransport = sessionHeader ? streamableHttpTransports.get(sessionHeader) : undefined;

        if (!streamableTransport) {
          if (req.method === 'POST' && isInitializeRequest(req.body)) {
            const remoteAddress = req.ip ?? req.socket.remoteAddress ?? 'unknown';
            streamableTransport = new StreamableHTTPServerTransport({
              sessionIdGenerator: () => randomUUID(),
              onsessioninitialized: (sessionId) => {
                streamableHttpTransports.set(sessionId, streamableTransport!);
                console.info(`Streamable HTTP session initialized (session ${sessionId}) from ${remoteAddress}`);
              },
              onsessionclosed: (sessionId) => {
                streamableHttpTransports.delete(sessionId);
                console.info(`Streamable HTTP session closed (session ${sessionId})`);
              },
            });

            streamableTransport.onclose = () => {
              const activeSessionId = streamableTransport?.sessionId;
              if (activeSessionId) {
                streamableHttpTransports.delete(activeSessionId);
                console.info(`Streamable HTTP transport closed (session ${activeSessionId})`);
              }
            };

            try {
              await server.connect(streamableTransport);

              console.log = (message: string) => server.sendLoggingMessage({ level: 'info', data: message });

              console.error = (message: string) => server.sendLoggingMessage({ level: 'error', data: message });

              console.error(`Actual Budget MCP Server (Streamable HTTP) started on port ${resolvedPort}`);
            } catch (error) {
              console.error(`Failed to connect streamable HTTP transport: ${toErrorMessage(error)}`);
              res.status(500).json({
                jsonrpc: '2.0',
                error: {
                  code: -32603,
                  message: 'Internal server error',
                },
                id: null,
              });
              return;
            }
          } else {
            res.status(400).json({
              jsonrpc: '2.0',
              error: {
                code: -32000,
                message: 'Bad Request: No valid session ID provided',
              },
              id: null,
            });
            return;
          }
        }

        if (!streamableTransport) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal server error',
            },
            id: null,
          });
          return;
        }

        await streamableTransport.handleRequest(req, res, req.body);
      } catch (error) {
        console.error(`Streamable HTTP handler error for ${requestLabel}: ${toErrorMessage(error)}`);

        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal server error',
            },
            id: null,
          });
        }
      }
    };

    // Register streamable paths with optional auth middleware
    if (authMiddleware) {
      app.all(streamablePaths, authMiddleware, (req: Request, res: Response) => {
        void handleStreamable(req, res);
      });
    } else {
      app.all(streamablePaths, (req: Request, res: Response) => {
        void handleStreamable(req, res);
      });
    }

    const handleMessages = async (req: Request, res: Response): Promise<void> => {
      if (transport) {
        await transport.handlePostMessage(req, res, req.body);
      } else {
        res.status(500).json({ error: 'Transport not initialized' });
      }
    };

    if (authMiddleware) {
      app.post('/messages', authMiddleware, (req: Request, res: Response) => {
        void handleMessages(req, res);
      });
    } else {
      app.post('/messages', (req: Request, res: Response) => {
        void handleMessages(req, res);
      });
    }

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
setupTools(server, enableWrite);
setupPrompts(server);

server.setRequestHandler(SetLevelRequestSchema, (request) => {
  console.log(`--- Logging level: ${request.params.level}`);
  return {};
});

process.on('SIGINT', () => {
  console.error('SIGINT received, shutting down server');
  server.close();
  process.exit(0);
});

main()
  .then(() => {
    if (!useSse) {
      // TODO: Setup proper logging level change. Messages are available in the notification of MCP Inspector
      console.log = (message: string) =>
        server.sendLoggingMessage({
          level: 'info',
          data: message,
        });
      console.error = (message: string) =>
        server.sendLoggingMessage({
          level: 'error',
          data: message,
        });
    }
  })
  .catch((error: unknown) => {
    console.error(`Server error: ${toErrorMessage(error)}`);
    process.exit(1);
  });
