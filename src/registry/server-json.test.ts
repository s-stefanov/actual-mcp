import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

interface ServerPackage {
  registryType: string;
  identifier: string;
  version: string;
  transport: { type: string; url?: string };
  packageArguments?: { name: string }[];
}

interface ServerJson {
  name: string;
  version: string;
  packages: ServerPackage[];
}

const root = fileURLToPath(new URL('../../', import.meta.url));
const serverJson = JSON.parse(readFileSync(`${root}server.json`, 'utf8')) as ServerJson;
const pkg = JSON.parse(readFileSync(`${root}package.json`, 'utf8')) as {
  mcpName: string;
  version: string;
};

describe('server.json', () => {
  it('name matches package.json mcpName exactly', () => {
    expect(serverJson.name).toBe('io.github.s-stefanov/actual-mcp');
    expect(pkg.mcpName).toBe(serverJson.name);
  });

  it('every version field equals package.json version', () => {
    expect(serverJson.version).toBe(pkg.version);
    for (const p of serverJson.packages) {
      expect(p.version).toBe(pkg.version);
    }
  });

  it('each package declares the required fields', () => {
    for (const p of serverJson.packages) {
      expect(p.registryType).toBeTruthy();
      expect(p.identifier).toBeTruthy();
      expect(p.transport?.type).toBeTruthy();
    }
  });

  it('advertises both stdio and streamable-http on the npm package', () => {
    const npmPkgs = serverJson.packages.filter((p: ServerPackage) => p.registryType === 'npm');
    expect(npmPkgs.every((p: ServerPackage) => p.identifier === 'actual-mcp')).toBe(true);
    const stdio = npmPkgs.find((p: ServerPackage) => p.transport.type === 'stdio');
    const http = npmPkgs.find((p: ServerPackage) => p.transport.type === 'streamable-http');
    expect(stdio).toBeDefined();
    expect(http).toBeDefined();
    expect(http?.transport.url).toBe('http://localhost:3000/mcp');
    expect(http?.packageArguments?.some((a: { name: string }) => a.name === '--sse')).toBe(true);
  });
});
