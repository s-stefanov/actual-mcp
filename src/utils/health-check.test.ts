import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express, { type Express } from 'express';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { registerHealthCheck } from './health-check.js';

describe('registerHealthCheck', () => {
  let app: Express;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    app = express();
    registerHealthCheck(app);
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  });

  it('returns 200 with a status of ok for GET /health', async () => {
    const response = await fetch(`${baseUrl}/health`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });

  it('responds with JSON content type', async () => {
    const response = await fetch(`${baseUrl}/health`);

    expect(response.headers.get('content-type')).toContain('application/json');
  });

  it('rejects requests that are not GET /health', async () => {
    const response = await fetch(`${baseUrl}/health`, { method: 'POST' });

    expect(response.status).toBe(404);
  });
});
