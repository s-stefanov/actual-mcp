import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Returns a copy of `serverJson` with the top-level `version` and every
 * `packages[].version` set to `version`. Pure — does not mutate the input.
 *
 * @param serverJson - Parsed server.json object.
 * @param version - The version to stamp everywhere (from package.json).
 * @returns A new server.json object with synced versions.
 */
export function syncServerJsonVersion(
  serverJson: Record<string, unknown>,
  version: string,
): Record<string, unknown> {
  const packages = serverJson.packages;
  if (!Array.isArray(packages)) {
    throw new Error('server.json is missing a "packages" array');
  }
  return {
    ...serverJson,
    version,
    packages: packages.map((p) => ({ ...(p as Record<string, unknown>), version })),
  };
}

// Reason: run in CI (`npm run sync:server-json`) to keep server.json in lockstep
// with package.json's version, which release-please bumps.
function main(): void {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const pkg = JSON.parse(readFileSync(`${root}package.json`, 'utf8')) as { version: string };
  const serverJson = JSON.parse(readFileSync(`${root}server.json`, 'utf8')) as Record<string, unknown>;
  const updated = syncServerJsonVersion(serverJson, pkg.version);
  writeFileSync(`${root}server.json`, JSON.stringify(updated, null, 2) + '\n');
  console.log(`server.json version synced to ${pkg.version}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
