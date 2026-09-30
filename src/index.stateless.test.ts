import { spawn, type ChildProcessByStdio } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { Readable } from 'node:stream';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

interface TestServer {
  port: number;
  process: ChildProcessByStdio<null, Readable, Readable>;
  dataDir: string;
}

async function freePort(): Promise<number> {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  await new Promise<void>((resolveClose, reject) => server.close((error) => (error ? reject(error) : resolveClose())));
  return port;
}

async function startHttpServer(extraArgs: string[]): Promise<TestServer> {
  const port = await freePort();
  const dataDir = mkdtempSync(join(tmpdir(), 'actual-mcp-http-test-'));
  const child = spawn(
    process.execPath,
    [resolve('node_modules/tsx/dist/cli.mjs'), 'src/index.ts', '--sse', '--port', String(port), ...extraArgs],
    {
      cwd: process.cwd(),
      env: { ...process.env, ACTUAL_DATA_DIR: dataDir },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  await Promise.race([
    new Promise<void>((resolveStarted, reject) => {
      const check = (chunk: Buffer): void => {
        if (chunk.toString().includes('listening on port')) {
          child.stderr.off('data', check);
          resolveStarted();
        }
      };
      child.stderr.on('data', check);
      child.once('exit', (code) => reject(new Error(`server exited with ${code}: ${stderr}`)));
    }),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`server did not start: ${stderr}`)), 10_000)),
  ]);

  return { port, process: child, dataDir };
}

async function stopHttpServer(server?: TestServer): Promise<void> {
  if (!server) return;
  if (server.process.exitCode === null) {
    server.process.kill('SIGTERM');
    await once(server.process, 'exit');
  }
  rmSync(server.dataDir, { recursive: true, force: true });
}

async function rpc(port: number, body: object, sessionId?: string): Promise<Response> {
  return fetch(`http://127.0.0.1:${port}/mcp`, {
    method: 'POST',
    headers: {
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
      'mcp-protocol-version': '2025-06-18',
      ...(sessionId ? { 'mcp-session-id': sessionId } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe('stateless Streamable HTTP mode', () => {
  let stateless: TestServer;
  let stateful: TestServer;

  beforeAll(async () => {
    // Start sequentially so the free-port probe cannot hand the same released
    // port to both child processes before either one starts listening.
    stateless = await startHttpServer(['--stateless']);
    stateful = await startHttpServer([]);
  }, 20_000);

  afterAll(async () => {
    await Promise.all([stopHttpServer(stateless), stopHttpServer(stateful)]);
  });

  it('does not issue a session ID during initialization', async () => {
    const response = await rpc(stateless.port, {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'stateless-test', version: '1.0.0' },
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('mcp-session-id')).toBeNull();
  });

  it('accepts an expired session ID on a later request', async () => {
    const response = await rpc(
      stateless.port,
      { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
      'session-from-a-previous-container'
    );
    const payload = (await response.json()) as { result?: { tools?: unknown[] } };

    expect(response.status).toBe(200);
    expect(payload.result?.tools?.length).toBeGreaterThan(0);
  });

  it('keeps stateful session validation as the default', async () => {
    const response = await rpc(
      stateful.port,
      { jsonrpc: '2.0', id: 3, method: 'tools/list', params: {} },
      'unknown-session'
    );
    const payload = (await response.json()) as { error?: { message?: string } };

    expect(response.status).toBe(400);
    expect(payload.error?.message).toContain('No valid session ID');
  });
});
