/**
 * Keeps Node's built-in fetch on its own dispatcher.
 *
 * Reason: testcontainers bundles undici 8, which installs itself as the global
 * dispatcher on import. Node's fetch then routes through it, and undici 8 rejects
 * the Content-Length header @actual-app/api sends when uploading the seeded budget
 * ("invalid content-length header"), so global setup fails with "invalid fileId".
 * This module must be imported before testcontainers: it lets Node's fetch create
 * its dispatcher first and returns a function that puts it back afterwards.
 */
const LEGACY_DISPATCHER = Symbol.for('undici.globalDispatcher.1');

// Reason: reading globalThis.fetch loads Node's bundled undici, which registers its Agent.
void globalThis.fetch;
const nodeDispatcher = (globalThis as Record<symbol, unknown>)[LEGACY_DISPATCHER];

export function restoreNodeFetchDispatcher(): void {
  if (nodeDispatcher !== undefined) {
    (globalThis as Record<symbol, unknown>)[LEGACY_DISPATCHER] = nodeDispatcher;
  }
}
