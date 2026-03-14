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
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { initActualApi, shutdownActualApi } from './actual-api.js';
import { fetchAllAccounts } from './core/data/fetch-accounts.js';
import { setupPrompts } from './prompts.js';
import { setupResources } from './resources.js';
import { setupTools } from './tools/index.js';
import { SetLevelRequestSchema, isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

// Reason: dotenv@17 (dotenvx) prints to stdout by default, which breaks MCP stdio JSON parsing
dotenv.config({ path: '.env', quiet: true } as Parameters<typeof dotenv.config>[0]);

/**
 * Create a fresh Server instance with all handlers registered.
 * Each SSE/HTTP connection gets its own instance to avoid the
 * "Already connected to a transport" error on reconnect.
 */
const createServer = (writeEnabled: boolean): Server => {
  const s = new Server(
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

  setupResources(s);
  setupTools(s, writeEnabled);
  setupPrompts(s);

  s.setRequestHandler(SetLevelRequestSchema, (request) => {
    console.log(`--- Logging level: ${request.params.level}`);
    return {};
  });

  return s;
};

// Argument parsing
const {
  values: {
    sse: useSse,
    'enable-write': enableWrite,
    'enable-bearer': enableBearer,
    port,
    'test-resources': testResources,
    'test-custom': testCustom,
  },
} = parseArgs({
  options: {
    sse: { type: 'boolean', default: false },
    'enable-write': { type: 'boolean', default: false },
    'enable-bearer': { type: 'boolean', default: false },
    port: { type: 'string' },
    'test-resources': { type: 'boolean', default: false },
    'test-custom': { type: 'boolean', default: false },
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
      error: 'Authorization header required',
    });
    return;
  }

  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: "Authorization header must start with 'Bearer '",
    });
    return;
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix
  const expectedToken = process.env.BEARER_TOKEN;

  if (!expectedToken) {
    console.error('BEARER_TOKEN environment variable not set');
    res.status(500).json({
      error: 'Server configuration error',
    });
    return;
  }

  if (token !== expectedToken) {
    res.status(401).json({
      error: 'Invalid bearer token',
    });
    return;
  }

  next();
};

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

// Keep references to the original console methods so we can fall back
// when the MCP transport is disconnected.
const originalConsoleLog = console.log.bind(console);
const originalConsoleError = console.error.bind(console);

// track whether we've already overridden console so a second client
// connection doesn't clobber the first client's log forwarding.
let consoleOverridden = false;

/**
 * Create a safe console override that forwards to `s.sendLoggingMessage`
 * but falls back to the original console method if the server is not connected.
 */
const safeSendLog = (s: Server, level: 'info' | 'error', fallback: (...args: unknown[]) => void) => {
  return (message: string) => {
    try {
      s.sendLoggingMessage({ level, data: message });
    } catch {
      fallback(message);
    }
  };
};

// ----------------------------
// SERVER STARTUP
// ----------------------------

// tracks all active Server instances so SIGINT can close them cleanly
const activeServers = new Set<Server>();

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
    const app = express();
    app.use(express.json());

    // Log bearer auth status
    if (enableBearer) {
      console.error('Bearer authentication enabled for SSE endpoints');
    } else {
      console.error('Bearer authentication disabled - endpoints are public');
    }

    // keyed by session ID so each SSE client routes to its own transport
    const sseTransports = new Map<string, { server: Server; transport: SSEServerTransport }>();
    const streamableHttpTransports = new Map<string, StreamableHTTPServerTransport>();

    const parseSessionHeader = (value: string | string[] | undefined): string | undefined => {
      if (!value) {
        return undefined;
      }
      return Array.isArray(value) ? value[0] : value;
    };

    app.get(['/.well-known/oauth-authorization-server', '/.well-known/oauth-authorization-server/sse'], (_req, res) => {
      res.status(404).json({ error: 'OAuth metadata not configured for this server' });
    });
    app.get(['/sse/.well-known/oauth-authorization-server'], (_req, res) => {
      res.status(404).json({ error: 'OAuth metadata not configured for this server' });
    });

    const handleLegacySse = (_req: Request, res: Response): void => {
      const sseServer = createServer(enableWrite);
      const sseTransport = new SSEServerTransport('/messages', res);
      const sessionId = sseTransport.sessionId;
      sseTransports.set(sessionId, { server: sseServer, transport: sseTransport });
      activeServers.add(sseServer);

      // clean up when the SSE connection closes
      res.on('close', () => {
        sseTransports.delete(sessionId);
        activeServers.delete(sseServer);
        // restore originals so the next client can claim log forwarding
        if (consoleOverridden) {
          console.log = originalConsoleLog;
          console.error = originalConsoleError;
          consoleOverridden = false;
        }
        console.info(`SSE client disconnected (session ${sessionId})`);
      });

      sseServer
        .connect(sseTransport)
        .then(() => {
          // only the first client gets log forwarding
          if (!consoleOverridden) {
            consoleOverridden = true;
            console.log = safeSendLog(sseServer, 'info', originalConsoleLog);
            console.error = safeSendLog(sseServer, 'error', originalConsoleError);
          }
          console.error(`Actual Budget MCP Server (SSE) started on port ${resolvedPort}`);
        })
        .catch((error) => {
          console.error(`Failed to connect SSE transport (session ${sessionId}): ${toErrorMessage(error)}`);
          sseTransports.delete(sessionId);
          activeServers.delete(sseServer);
        });
    };

    app.get('/sse', bearerAuth, handleLegacySse);

    const streamablePaths = ['/', '/mcp'];

    app.all(streamablePaths, bearerAuth, async (req: Request, res: Response) => {
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
            const httpServer = createServer(enableWrite);
            activeServers.add(httpServer);
            streamableTransport = new StreamableHTTPServerTransport({
              sessionIdGenerator: () => randomUUID(),
              onsessioninitialized: (sessionId) => {
                streamableHttpTransports.set(sessionId, streamableTransport!);
                console.info(`Streamable HTTP session initialized (session ${sessionId}) from ${remoteAddress}`);
              },
              onsessionclosed: (sessionId) => {
                streamableHttpTransports.delete(sessionId);
                activeServers.delete(httpServer);
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
              await httpServer.connect(streamableTransport);

              if (!consoleOverridden) {
                consoleOverridden = true;
                console.log = safeSendLog(httpServer, 'info', originalConsoleLog);
                console.error = safeSendLog(httpServer, 'error', originalConsoleError);
              }
              console.error(`Actual Budget MCP Server (Streamable HTTP) started on port ${resolvedPort}`);
            } catch (error) {
              activeServers.delete(httpServer);
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
    });

    app.post('/messages', bearerAuth, async (req: Request, res: Response) => {
      const sessionId = parseSessionHeader(req.headers['mcp-session-id']);
      const entry = sessionId ? sseTransports.get(sessionId) : undefined;
      if (entry) {
        await entry.transport.handlePostMessage(req, res, req.body);
      } else {
        res.status(400).json({ error: 'No SSE session found for the given session ID' });
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
    const stdioServer = createServer(enableWrite);
    const transport = new StdioServerTransport();
    await stdioServer.connect(transport);
    activeServers.add(stdioServer);
    stdioServer.onclose = () => activeServers.delete(stdioServer);
    console.error('Actual Budget MCP Server (stdio) started');

    // TODO: Setup proper logging level change. Messages are available in the notification of MCP Inspector
    console.log = safeSendLog(stdioServer, 'info', originalConsoleLog);
    console.error = safeSendLog(stdioServer, 'error', originalConsoleError);
  }
}

process.on('SIGINT', async () => {
  originalConsoleError('SIGINT received, shutting down');
  await Promise.allSettled([...activeServers].map((s) => s.close()));
  process.exit(0);
});

main().catch((error: unknown) => {
  console.error(`Server error: ${toErrorMessage(error)}`);
  process.exit(1);
});
