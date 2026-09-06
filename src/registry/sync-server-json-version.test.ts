import { describe, it, expect } from 'vitest';
import { syncServerJsonVersion } from './sync-server-json-version.js';

const base = () => ({
  name: 'io.github.s-stefanov/actual-mcp',
  version: '1.0.0',
  title: 'x',
  packages: [
    { registryType: 'npm', identifier: 'actual-mcp', version: '1.0.0', transport: { type: 'stdio' } },
    { registryType: 'oci', identifier: 'docker.io/s-stefanov/actual-mcp', version: '1.0.0', transport: { type: 'stdio' } },
  ],
});

describe('syncServerJsonVersion', () => {
  it('updates the top-level and every package version (happy path)', () => {
    const result = syncServerJsonVersion(base(), '2.3.4') as any;
    expect(result.version).toBe('2.3.4');
    expect(result.packages.every((p: any) => p.version === '2.3.4')).toBe(true);
  });

  it('leaves other fields untouched (edge)', () => {
    const result = syncServerJsonVersion(base(), '2.3.4') as any;
    expect(result.name).toBe('io.github.s-stefanov/actual-mcp');
    expect(result.title).toBe('x');
    expect(result.packages[0].identifier).toBe('actual-mcp');
  });

  it('throws when packages is missing (failure case)', () => {
    expect(() => syncServerJsonVersion({ version: '1.0.0' }, '2.0.0')).toThrow(/packages/);
  });
});
