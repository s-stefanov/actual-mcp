import { describe, it, expect } from 'vitest';
import { syncServerJsonVersion } from './sync-server-json-version.js';

interface FixturePackage {
  registryType: string;
  identifier: string;
  version: string;
  transport: { type: string };
}

interface FixtureServerJson {
  name: string;
  version: string;
  title: string;
  packages: FixturePackage[];
}

const base = (): FixtureServerJson => ({
  name: 'io.github.s-stefanov/actual-mcp',
  version: '1.0.0',
  title: 'x',
  packages: [
    { registryType: 'npm', identifier: 'actual-mcp', version: '1.0.0', transport: { type: 'stdio' } },
    {
      registryType: 'oci',
      identifier: 'docker.io/s-stefanov/actual-mcp',
      version: '1.0.0',
      transport: { type: 'stdio' },
    },
  ],
});

describe('syncServerJsonVersion', () => {
  it('updates the top-level and every package version (happy path)', () => {
    const result = syncServerJsonVersion(
      base() as unknown as Record<string, unknown>,
      '2.3.4'
    ) as unknown as FixtureServerJson;
    expect(result.version).toBe('2.3.4');
    expect(result.packages.every((p: FixturePackage) => p.version === '2.3.4')).toBe(true);
  });

  it('leaves other fields untouched (edge)', () => {
    const result = syncServerJsonVersion(
      base() as unknown as Record<string, unknown>,
      '2.3.4'
    ) as unknown as FixtureServerJson;
    expect(result.name).toBe('io.github.s-stefanov/actual-mcp');
    expect(result.title).toBe('x');
    expect(result.packages[0].identifier).toBe('actual-mcp');
  });

  it('throws when packages is missing (failure case)', () => {
    expect(() => syncServerJsonVersion({ version: '1.0.0' }, '2.0.0')).toThrow(/packages/);
  });
});
