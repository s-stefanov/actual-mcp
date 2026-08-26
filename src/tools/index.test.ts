import { describe, it, expect } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { setupTools } from './index.js';

type Handler = () => { tools: Array<{ name: string; description?: string; inputSchema: unknown }> };

/** Register tools against a stub server and return whatever ListTools would answer. */
function listTools(enableWrite: boolean): ReturnType<Handler> {
  const handlers = new Map<unknown, Handler>();
  const server = {
    setRequestHandler: (schema: unknown, fn: Handler) => handlers.set(schema, fn),
  } as unknown as Server;

  setupTools(server, enableWrite);

  return handlers.get(ListToolsRequestSchema)!();
}

const NEW_READ_TOOLS = ['get-custom-reports', 'get-dashboards'];

const NEW_WRITE_TOOLS = [
  'create-custom-report',
  'update-custom-report',
  'delete-custom-report',
  'add-dashboard-widget',
  'update-dashboard-widget',
  'remove-dashboard-widget',
  'organize-dashboard',
  'create-dashboard-page',
  'rename-dashboard-page',
  'delete-dashboard-page',
];

describe('setupTools', () => {
  it('exposes the report and dashboard read tools without write access', () => {
    const names = listTools(false).tools.map((t) => t.name);

    NEW_READ_TOOLS.forEach((name) => expect(names).toContain(name));
  });

  it('withholds every mutating report and dashboard tool in read-only mode', () => {
    const names = listTools(false).tools.map((t) => t.name);

    NEW_WRITE_TOOLS.forEach((name) => expect(names).not.toContain(name));
  });

  it('adds the write tools when write access is enabled', () => {
    const names = listTools(true).tools.map((t) => t.name);

    NEW_WRITE_TOOLS.forEach((name) => expect(names).toContain(name));
  });

  it('names the saved-report tools after the UI\'s "Custom Reports", not "widget"', () => {
    const names = listTools(true).tools.map((t) => t.name);

    // Reason: in Actual's UI "widget" is a dashboard card, while these are
    // listed under "Custom Reports". Naming them *-widget would collide with
    // the dashboard widget tools asserted below.
    expect(names).toContain('get-custom-reports');
    expect(names).not.toContain('get-reports');
    expect(names.filter((n) => n.endsWith('-widget')).sort()).toEqual([
      'add-dashboard-widget',
      'remove-dashboard-widget',
      'update-dashboard-widget',
    ]);
  });

  it('gives every tool a unique name, a description, and an object input schema', () => {
    const tools = listTools(true).tools;

    expect(new Set(tools.map((t) => t.name)).size).toBe(tools.length);
    tools.forEach((tool) => {
      expect(tool.description, `${tool.name} is missing a description`).toBeTruthy();
      expect((tool.inputSchema as { type?: string }).type, `${tool.name} schema`).toBe('object');
    });
  });

  it('keeps dashboard tools findable under the sidebar\'s "Reports" wording', () => {
    const dashboardTools = listTools(true).tools.filter((t) => t.name.includes('dashboard'));

    expect(dashboardTools.length).toBeGreaterThan(0);
    expect(dashboardTools.some((t) => /Reports section/i.test(t.description ?? ''))).toBe(true);
  });
});
