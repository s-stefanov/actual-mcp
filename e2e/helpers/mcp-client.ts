import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface CallToolResponse {
  text: string;
  isError: boolean;
  raw: unknown;
}

export interface McpClientHandle {
  callTool: (name: string, args?: Record<string, unknown>) => Promise<CallToolResponse>;
  close: () => Promise<void>;
}

/**
 * Spawns the built MCP server (build/index.js --enable-write) as a stdio child
 * wired to the shared container, and connects an SDK Client over stdio.
 * ACTUAL_SYNC_TTL_MS=0 forces a sync before every tool call so this separate
 * process always sees seeded + mutated data (spec §7.3).
 */
export async function createMcpClient(ctx: {
  url: string;
  password: string;
  syncId: string;
}): Promise<McpClientHandle> {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'actual-e2e-mcp-'));

  const transport = new StdioClientTransport({
    command: 'node',
    args: ['build/index.js', '--enable-write'],
    env: {
      ...process.env,
      ACTUAL_SERVER_URL: ctx.url,
      ACTUAL_PASSWORD: ctx.password,
      ACTUAL_BUDGET_SYNC_ID: ctx.syncId,
      ACTUAL_SYNC_TTL_MS: '0',
      ACTUAL_DATA_DIR: dataDir,
    },
  });

  const client = new Client({ name: 'e2e-client', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);

  return {
    callTool: async (name, args = {}) => {
      const result = (await client.callTool({ name, arguments: args })) as {
        isError?: boolean;
        content?: Array<{ type: string; text?: string }>;
      };
      const text = (result.content ?? [])
        .filter((c) => c.type === 'text')
        .map((c) => c.text ?? '')
        .join('');
      return { text, isError: result.isError === true, raw: result };
    },
    close: async () => {
      await client.close();
      fs.rmSync(dataDir, { recursive: true, force: true });
    },
  };
}
