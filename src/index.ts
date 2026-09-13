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
import { isValidBearerToken } from './utils/bearer-auth.js';
import { initActualApi, shutdownActualApi } from './actual-api.js';
import { fetchAllAccounts } from './core/data/fetch-accounts.js';
import { getActualConnection } from './integrations/actual/connection.js';
import { createServer } from './server.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

// Reason: dotenv@17 (dotenvx) prints to stdout by default, which breaks MCP stdio JSON parsing
dotenv.config({ path: '.env', quiet: true } as Parameters<typeof dotenv.config>[0]);

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

  if (!isValidBearerToken(token, expectedToken)) {
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

// Reason: drainAndClose() waits on in-flight Actual work; if the Actual server is
// unreachable a hanging sync/download would keep the process alive forever, and because
// we handle SIGINT ourselves Ctrl-C no longer terminates it. Bound the wait, and let a
// second signal give up immediately.
const DRAIN_TIMEOUT_MS = 5000;
// Reason: httpServer.close()'s callback only fires once every socket has closed, and this
// server holds long-lived SSE streams and StreamableHTTP sessions that may not close
// promptly (or at all) on their own. Treat hitting this bound as the normal shutdown path,
// not a rare edge case. The value trades two things off: longer gives in-flight handlers
// more room to finish before drainAndClose() flips the connection to "closing" (the race
// this ordering exists to narrow), but quiesce + drain run sequentially and must fit
// inside Docker's default 10s stop grace period -- the Dockerfile runs node as PID 1, so
// SIGKILL at 10s would cut the Actual drain short. 3s + 5s = 8s leaves headroom.
const HTTP_QUIESCE_TIMEOUT_MS = 3000;
let shuttingDown = false;

const drainConnection = async (): Promise<void> => {
  const timeout = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), DRAIN_TIMEOUT_MS));
  try {
    if ((await Promise.race([getActualConnection().drainAndClose(), timeout])) === 'timeout') {
      console.error(`Actual connection did not drain within ${DRAIN_TIMEOUT_MS}ms, exiting anyway`);
    }
  } catch (err) {
    console.error(`Error during connection shutdown: ${toErrorMessage(err)}`);
  }
};

const onShutdownSignal = (shutdown: (signal: string) => Promise<void>): void => {
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      if (shuttingDown) process.exit(1);
      shuttingDown = true;
      // Reason: shutdown()'s promise is otherwise discarded, so a throw inside it would
      // only surface as an "unhandled rejection" -- which the handler below logs and
      // swallows -- leaving the process running forever instead of exiting. Contain the
      // error here and force the exit ourselves.
      shutdown(signal).catch((err: unknown) => {
        console.error(`Error during shutdown: ${toErrorMessage(err)}`);
        process.exit(1);
      });
    });
  }
};

// Reason: a rejection or throw from anywhere in the process (e.g. an unawaited async
// side-effect inside @actual-app/api, see s-stefanov/actual-mcp#150 and #95) otherwise
// terminates the whole server. That kills every in-flight tool call and, over stdio,
// disconnects the client; over HTTP it can leave sessions in a state that looks
// connected but never responds. Log and keep serving instead of exiting.
process.on('unhandledRejection', (reason) => {
  console.error(`Unhandled rejection: ${toErrorMessage(reason)}`);
});
process.on('uncaughtException', (err) => {
  console.error(`Uncaught exception: ${toErrorMessage(err)}`);
});

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
    const app = express();
    app.use(express.json());

    // Log bearer auth status
    if (enableBearer) {
      process.stderr.write('Bearer authentication enabled for SSE endpoints\n');
    } else {
      process.stderr.write('Bearer authentication disabled - endpoints are public\n');
    }

    // Per-connection maps for legacy SSE and streamable HTTP
    const legacySseConnections = new Map<string, { server: Server; transport: SSEServerTransport }>();
    const streamableSessions = new Map<string, { server: Server; transport: StreamableHTTPServerTransport }>();

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
      const connectionId = randomUUID();
      const connServer = createServer({ enableWrite: !!enableWrite });
      const sseTransport = new SSEServerTransport(`/messages?connectionId=${connectionId}`, res);
      legacySseConnections.set(connectionId, { server: connServer, transport: sseTransport });

      connServer.connect(sseTransport).then(() => {
        process.stderr.write(`Legacy SSE connection established (connectionId ${connectionId})\n`);
      });

      res.on('close', () => {
        legacySseConnections.delete(connectionId);
        connServer.close();
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
        let session = sessionHeader ? streamableSessions.get(sessionHeader) : undefined;

        if (!session) {
          if (req.method === 'POST' && isInitializeRequest(req.body)) {
            const remoteAddress = req.ip ?? req.socket.remoteAddress ?? 'unknown';
            const sessionServer = createServer({ enableWrite: !!enableWrite });
            const streamableTransport = new StreamableHTTPServerTransport({
              sessionIdGenerator: () => randomUUID(),
              onsessioninitialized: (sessionId) => {
                streamableSessions.set(sessionId, { server: sessionServer, transport: streamableTransport });
                console.info(`Streamable HTTP session initialized (session ${sessionId}) from ${remoteAddress}`);
              },
              onsessionclosed: (sessionId) => {
                streamableSessions.delete(sessionId);
                sessionServer.close();
                console.info(`Streamable HTTP session closed (session ${sessionId})`);
              },
            });

            streamableTransport.onclose = () => {
              const activeSessionId = streamableTransport.sessionId;
              if (activeSessionId) {
                streamableSessions.delete(activeSessionId);
                console.info(`Streamable HTTP transport closed (session ${activeSessionId})`);
              }
            };

            try {
              await sessionServer.connect(streamableTransport);
              process.stderr.write(`Actual Budget MCP Server (Streamable HTTP) started on port ${resolvedPort}\n`);
            } catch (error) {
              process.stderr.write(`Failed to connect streamable HTTP transport: ${toErrorMessage(error)}\n`);
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

            session = { server: sessionServer, transport: streamableTransport };
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

        await session.transport.handleRequest(req, res, req.body);
      } catch (error) {
        process.stderr.write(`Streamable HTTP handler error for ${requestLabel}: ${toErrorMessage(error)}\n`);

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
      const connectionId = req.query.connectionId as string | undefined;
      const conn = connectionId ? legacySseConnections.get(connectionId) : undefined;
      if (conn) {
        await conn.transport.handlePostMessage(req, res, req.body);
      } else {
        res.status(400).json({ error: 'Invalid or missing connectionId' });
      }
    });

    const httpServer = app.listen(resolvedPort, (error) => {
      if (error) {
        process.stderr.write(`Error: ${toErrorMessage(error)}\n`);
      } else {
        process.stderr.write(`Actual Budget MCP Server (HTTP) listening on port ${resolvedPort}\n`);
      }
    });

    const shutdown = async (signal: string): Promise<void> => {
      process.stderr.write(`${signal} received, shutting down server\n`);

      // Reason: quiesce the listener and every MCP server/transport BEFORE draining the
      // Actual connection. drainAndClose() flips the connection state to "closing"
      // immediately, so if it ran first, a handler still in flight could reach
      // ActualConnection.run() afterward and fail with "ActualConnection is closed".
      const listenerClosed = new Promise<void>((resolve) => {
        httpServer.close((err) => {
          if (err) {
            process.stderr.write(`Error closing HTTP listener: ${toErrorMessage(err)}\n`);
          }
          resolve();
        });
      });
      // Reason: idle keep-alive sockets otherwise hold the listener open indefinitely.
      // Optional call since there's no `engines` field pinning a Node version that's
      // guaranteed to have this method.
      httpServer.closeIdleConnections?.();

      const closures: Promise<unknown>[] = [listenerClosed];
      for (const [, conn] of legacySseConnections) {
        closures.push(conn.server.close());
      }
      for (const [, session] of streamableSessions) {
        closures.push(session.server.close());
        closures.push(session.transport.close());
      }

      // Reason: the listener callback (and the SSE/StreamableHTTP transports it's
      // waiting on) may never resolve -- this server holds long-lived streams that
      // outlive a normal request. Hitting this bound is the expected exit path under
      // load, not a fallback, so it gets its own timeout rather than hanging main().
      const quiesceTimeout = new Promise<'timeout'>((resolve) =>
        setTimeout(() => resolve('timeout'), HTTP_QUIESCE_TIMEOUT_MS)
      );
      const outcome = await Promise.race([Promise.allSettled(closures), quiesceTimeout]);
      if (outcome === 'timeout') {
        process.stderr.write(
          `HTTP layer did not quiesce within ${HTTP_QUIESCE_TIMEOUT_MS}ms, draining Actual connection anyway\n`
        );
      } else {
        for (const result of outcome) {
          if (result.status === 'rejected') {
            process.stderr.write(`Error closing HTTP session: ${toErrorMessage(result.reason)}\n`);
          }
        }
      }

      await drainConnection();
      process.exit(0);
    };
    onShutdownSignal(shutdown);
  } else {
    const server = createServer({ enableWrite: !!enableWrite });
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Actual Budget MCP Server (stdio) started');

    const shutdown = async (signal: string): Promise<void> => {
      console.error(`${signal} received, shutting down server`);
      // Reason: await the MCP server's own close before draining the Actual connection,
      // for the same reason as the HTTP path -- so a handler still in flight doesn't
      // reach ActualConnection.run() after drainAndClose() has closed it. A rejected
      // close must not skip the drain below, so contain it here the same way the HTTP
      // path's Promise.allSettled does.
      await server.close().catch((err: unknown) => {
        console.error(`Error closing MCP server: ${toErrorMessage(err)}`);
      });
      await drainConnection();
      process.exit(0);
    };
    onShutdownSignal(shutdown);
  }
}

main().catch((error: unknown) => {
  console.error(`Server error: ${toErrorMessage(error)}`);
  process.exit(1);
});
