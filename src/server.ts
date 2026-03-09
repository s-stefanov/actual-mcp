import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SetLevelRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { setupPrompts } from './prompts.js';
import { setupResources } from './resources.js';
import { setupTools } from './tools/index.js';

interface CreateServerOptions {
  enableWrite: boolean;
}

/**
 * Creates and configures a new MCP Server instance with all resources, tools, and prompts.
 *
 * @param options - Server configuration options
 * @returns A fully configured Server instance ready to be connected to a transport
 */
export function createServer(options: CreateServerOptions): Server {
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

  setupResources(server);
  setupTools(server, options.enableWrite);
  setupPrompts(server);

  server.setRequestHandler(SetLevelRequestSchema, (request) => {
    process.stderr.write(`--- Logging level: ${request.params.level}\n`);
    return {};
  });

  return server;
}
