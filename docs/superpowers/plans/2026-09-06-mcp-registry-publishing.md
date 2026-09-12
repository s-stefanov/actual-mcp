# MCP Registry Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish `actual-mcp` to the official MCP Registry advertising both stdio and streamable-http transports, with CI auto-publishing on each release.

**Architecture:** Add the two registry metadata artifacts (`mcpName` in `package.json`, a `server.json` at repo root describing three packages), a testable version-sync module that keeps every `version` field in `server.json` equal to `package.json`, and steps in the existing `release-please.yml` release job that sync the version and publish via `mcp-publisher` using GitHub OIDC (no secrets). A downstream directory-claiming checklist is documented for the one-time manual go-to-market.

**Tech Stack:** TypeScript, Node 24 ESM, Vitest, `tsx`, GitHub Actions, release-please, `mcp-publisher` CLI.

**Spec:** `docs/superpowers/specs/2026-09-06-mcp-registry-publishing-design.md`

## Global Constraints

- Server name (reverse-DNS): `io.github.s-stefanov/actual-mcp` — must be **byte-identical** in `package.json` `mcpName` and `server.json` `name`, or registry publish fails.
- npm package identifier: `actual-mcp`. Docker/OCI identifier: `docker.io/s-stefanov/actual-mcp`.
- Every `version` field in `server.json` (top-level and each `packages[].version`) must equal `package.json` `version` at publish time.
- `server.json` `$schema`: `https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json`.
- Approved npm registry base URL: `https://registry.npmjs.org`.
- Env vars (name / required / secret / default): `ACTUAL_SERVER_URL` (req), `ACTUAL_PASSWORD` (req, secret), `ACTUAL_BUDGET_SYNC_ID` (req), `ACTUAL_DATA_DIR`, `ACTUAL_BUDGET_ENCRYPTION_PASSWORD` (secret), `ACTUAL_SYNC_TTL_MS` (default `60000`).
- Tests live under `src/**/*.test.ts` (vitest `include`). Use ESM `.js` import specifiers in TS source per repo convention.
- Package manager: `npm`. Never introduce a different one.

---

### Task 1: Registry metadata files (`mcpName` + `server.json`)

**Files:**
- Modify: `package.json` (add `mcpName`)
- Create: `server.json` (repo root)
- Create test: `src/registry/server-json.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `server.json` at repo root with `name: "io.github.s-stefanov/actual-mcp"`, top-level `version`, and a `packages` array of three entries (npm/stdio, npm/streamable-http, oci/stdio). Task 2's sync module and Task 3's CI depend on this file's shape and location.

- [ ] **Step 1: Write the failing test**

Create `src/registry/server-json.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const serverJson = JSON.parse(readFileSync(`${root}server.json`, 'utf8'));
const pkg = JSON.parse(readFileSync(`${root}package.json`, 'utf8'));

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
    const npmPkgs = serverJson.packages.filter((p: any) => p.registryType === 'npm');
    expect(npmPkgs.every((p: any) => p.identifier === 'actual-mcp')).toBe(true);
    const stdio = npmPkgs.find((p: any) => p.transport.type === 'stdio');
    const http = npmPkgs.find((p: any) => p.transport.type === 'streamable-http');
    expect(stdio).toBeDefined();
    expect(http).toBeDefined();
    expect(http.transport.url).toBe('http://localhost:3000/mcp');
    expect(http.packageArguments.some((a: any) => a.name === '--sse')).toBe(true);
  });

  it('includes the Docker/OCI package', () => {
    const oci = serverJson.packages.find((p: any) => p.registryType === 'oci');
    expect(oci?.identifier).toBe('docker.io/s-stefanov/actual-mcp');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/registry/server-json.test.ts`
Expected: FAIL — `server.json` does not exist (readFileSync throws / cannot find module).

- [ ] **Step 3: Add `mcpName` to `package.json`**

Add this key next to `name` (top level):

```json
  "mcpName": "io.github.s-stefanov/actual-mcp",
```

- [ ] **Step 4: Create `server.json` at repo root**

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  "name": "io.github.s-stefanov/actual-mcp",
  "title": "Actual Budget MCP Server",
  "description": "MCP server exposing Actual Budget accounts, transactions, budgets and reporting to LLM assistants.",
  "version": "1.12.1",
  "websiteUrl": "https://github.com/s-stefanov/actual-mcp",
  "repository": {
    "url": "https://github.com/s-stefanov/actual-mcp",
    "source": "github"
  },
  "packages": [
    {
      "registryType": "npm",
      "registryBaseUrl": "https://registry.npmjs.org",
      "identifier": "actual-mcp",
      "version": "1.12.1",
      "runtimeHint": "npx",
      "transport": { "type": "stdio" },
      "environmentVariables": [
        { "name": "ACTUAL_SERVER_URL", "description": "URL of your Actual Budget server", "isRequired": true },
        { "name": "ACTUAL_PASSWORD", "description": "Actual Budget server password", "isRequired": true, "isSecret": true },
        { "name": "ACTUAL_BUDGET_SYNC_ID", "description": "Budget sync ID", "isRequired": true },
        { "name": "ACTUAL_DATA_DIR", "description": "Local dir for cached budget data" },
        { "name": "ACTUAL_BUDGET_ENCRYPTION_PASSWORD", "description": "E2E encryption password, if enabled", "isSecret": true },
        { "name": "ACTUAL_SYNC_TTL_MS", "description": "Sync cache TTL in ms", "default": "60000" }
      ]
    },
    {
      "registryType": "npm",
      "registryBaseUrl": "https://registry.npmjs.org",
      "identifier": "actual-mcp",
      "version": "1.12.1",
      "runtimeHint": "npx",
      "transport": { "type": "streamable-http", "url": "http://localhost:3000/mcp" },
      "packageArguments": [
        { "type": "named", "name": "--sse" },
        { "type": "named", "name": "--port", "value": "3000" }
      ],
      "environmentVariables": [
        { "name": "ACTUAL_SERVER_URL", "description": "URL of your Actual Budget server", "isRequired": true },
        { "name": "ACTUAL_PASSWORD", "description": "Actual Budget server password", "isRequired": true, "isSecret": true },
        { "name": "ACTUAL_BUDGET_SYNC_ID", "description": "Budget sync ID", "isRequired": true },
        { "name": "ACTUAL_DATA_DIR", "description": "Local dir for cached budget data" },
        { "name": "ACTUAL_BUDGET_ENCRYPTION_PASSWORD", "description": "E2E encryption password, if enabled", "isSecret": true },
        { "name": "ACTUAL_SYNC_TTL_MS", "description": "Sync cache TTL in ms", "default": "60000" }
      ]
    },
    {
      "registryType": "oci",
      "identifier": "docker.io/s-stefanov/actual-mcp",
      "version": "1.12.1",
      "runtimeHint": "docker",
      "transport": { "type": "stdio" },
      "environmentVariables": [
        { "name": "ACTUAL_SERVER_URL", "description": "URL of your Actual Budget server", "isRequired": true },
        { "name": "ACTUAL_PASSWORD", "description": "Actual Budget server password", "isRequired": true, "isSecret": true },
        { "name": "ACTUAL_BUDGET_SYNC_ID", "description": "Budget sync ID", "isRequired": true }
      ]
    }
  ]
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/registry/server-json.test.ts`
Expected: PASS (all 5 assertions).

- [ ] **Step 6: Include `server.json` in the published tarball**

In `package.json`, add `"server.json"` to the `files` array so downstream tools that read it from the package can find it:

```json
  "files": [
    "build",
    "README.md",
    "LICENSE",
    "server.json"
  ],
```

- [ ] **Step 7: Commit**

```bash
git add package.json server.json src/registry/server-json.test.ts
git commit -m "feat: add server.json and mcpName for MCP registry publishing"
```

---

### Task 2: Version-sync module

**Files:**
- Create: `src/registry/sync-server-json-version.ts`
- Create test: `src/registry/sync-server-json-version.test.ts`
- Modify: `package.json` (add `sync:server-json` script)

**Interfaces:**
- Consumes: `server.json` shape from Task 1.
- Produces: exported `syncServerJsonVersion(serverJson: Record<string, unknown>, version: string): Record<string, unknown>` — returns a new object with top-level `version` and every `packages[].version` set to `version`. Also an npm script `sync:server-json` that rewrites `server.json` in place from `package.json`'s version. Task 3's CI calls `npm run sync:server-json`.

- [ ] **Step 1: Write the failing test**

Create `src/registry/sync-server-json-version.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/registry/sync-server-json-version.test.ts`
Expected: FAIL — cannot find module `./sync-server-json-version.js`.

- [ ] **Step 3: Write the implementation**

Create `src/registry/sync-server-json-version.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/registry/sync-server-json-version.test.ts`
Expected: PASS (3 assertions).

- [ ] **Step 5: Add the npm script**

In `package.json` `scripts`, add:

```json
    "sync:server-json": "tsx src/registry/sync-server-json-version.ts",
```

- [ ] **Step 6: Verify the script runs and is idempotent**

Run: `npm run sync:server-json && npx vitest run src/registry/server-json.test.ts`
Expected: prints `server.json version synced to 1.12.1`; server.json invariant test still PASSES; `git diff server.json` shows no version change (already 1.12.1) — only possible whitespace reformat. If reformatting churns the file, that is acceptable and expected once.

- [ ] **Step 7: Commit**

```bash
git add package.json server.json src/registry/sync-server-json-version.ts src/registry/sync-server-json-version.test.ts
git commit -m "feat: add server.json version sync script"
```

---

### Task 3: CI auto-publish in `release-please.yml`

**Files:**
- Modify: `.github/workflows/release-please.yml`

**Interfaces:**
- Consumes: `npm run sync:server-json` (Task 2), `server.json` (Task 1), the existing `release_created` output and `npm publish` step.
- Produces: registry publish on release. No downstream code depends on this.

- [ ] **Step 1: Add the registry-publish steps after the existing `npm publish` step**

The workflow already has `permissions: id-token: write` (required for OIDC) and an `npm publish` step gated on `${{ steps.release.outputs.release_created }}`. Insert these steps immediately **after** the `- run: npm publish` line, each guarded with the same `if`:

```yaml
      - name: Sync server.json version
        if: ${{ steps.release.outputs.release_created }}
        run: npm run sync:server-json
      - name: Install mcp-publisher
        if: ${{ steps.release.outputs.release_created }}
        run: |
          curl -L "https://github.com/modelcontextprotocol/registry/releases/latest/download/mcp-publisher_$(uname -s | tr '[:upper:]' '[:lower:]')_$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/').tar.gz" | tar xz mcp-publisher
      - name: Authenticate to MCP Registry
        if: ${{ steps.release.outputs.release_created }}
        run: ./mcp-publisher login github-oidc
      - name: Publish to MCP Registry
        if: ${{ steps.release.outputs.release_created }}
        run: ./mcp-publisher publish
```

Ordering rationale (do not reorder): `npm publish` must complete first so the registry can verify the `mcpName` field in the live tarball; `sync:server-json` guarantees `server.json`'s version equals the just-published npm version; then publish. Keep the Docker steps where they are.

- [ ] **Step 2: Validate the workflow YAML locally**

Run: `npx --yes yaml-lint .github/workflows/release-please.yml` (or `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/release-please.yml'))"`).
Expected: no syntax errors. (If neither tool is available, confirm indentation matches the surrounding steps by inspection — every new step is a sibling of `- run: npm publish`.)

- [ ] **Step 3: Confirm no new secrets are required**

Verify the OIDC path needs no secret: the job already declares `id-token: write`, and `mcp-publisher login github-oidc` uses it. The npm publish step's auth is unchanged. No `MCP_GITHUB_TOKEN`/`MCP_PRIVATE_KEY` needed.
Expected: no `secrets.MCP_*` references added.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/release-please.yml
git commit -m "ci: publish to MCP registry on release via github-oidc"
```

**First-release note (not a code step):** The registry listing appears on the **next** release-please release — the first release that ships a tarball carrying `mcpName`. No manual publish is performed; if a listing is wanted sooner, a maintainer can run `npm publish` of a version carrying `mcpName` then `mcp-publisher login github` + `mcp-publisher publish` locally, but the default path is to wait for the next automated release.

---

### Task 4: Documentation — README section + downstream directory checklist

**Files:**
- Modify: `README.md`
- Create: `docs/mcp-registry-checklist.md`

**Interfaces:**
- Consumes: nothing at runtime.
- Produces: human-facing docs only.

- [ ] **Step 1: Add a "Registry & Discovery" section to `README.md`**

Add near the end of `README.md` (before any license/footer section):

```markdown
## Registry & Discovery

`actual-mcp` is published to the [official MCP Registry](https://registry.modelcontextprotocol.io)
as `io.github.s-stefanov/actual-mcp`. Registry metadata lives in
[`server.json`](./server.json) and is published automatically on each release
(see `.github/workflows/release-please.yml`).

It advertises two transports on the npm package — `stdio` (default) and
`streamable-http` (via the `--sse` flag) — plus a Docker/OCI image
(`docker.io/s-stefanov/actual-mcp`).

Post-release directory listings are tracked in
[`docs/mcp-registry-checklist.md`](./docs/mcp-registry-checklist.md).
```

- [ ] **Step 2: Create the downstream checklist**

Create `docs/mcp-registry-checklist.md`:

```markdown
# MCP Registry — Post-Publish Directory Checklist

The official registry publish is automated (release-please + mcp-publisher).
These downstream directories reward an explicitly **claimed** listing; do each
once after the first successful registry publish.

- [ ] **Official MCP Registry** — automated on release. Confirm the entry at
  https://registry.modelcontextprotocol.io shows all three packages.
- [ ] **Glama** (https://glama.ai/mcp) — claim ownership to move out of the
  crawled tier; verify the imported description/links.
- [ ] **PulseMCP** — claim the entry to separate verified owner info from
  auto-generated data.
- [ ] **Smithery** (https://smithery.ai) — `smithery mcp publish <url> -n
  s-stefanov/actual-mcp`, or claim the crawled listing.
- [ ] **awesome-mcp-servers** (https://github.com/punkpeye/awesome-mcp-servers)
  — open a PR adding the server under the finance/budgeting category.

## What the scores reward

- **Official registry**: passing namespace auth + package ownership (binary
  gate) → propagates to GitHub MCP registry, VS Code, and others.
- **Glama quality score**: claimed ownership, scanner-readable metadata
  (transport declared ✓), zero-config setup, active repo, clear license,
  complete tool annotations.
- **MCP Toplist ranking**: version count, GitHub release/commit activity,
  stars, listing age. Regular releases (release-please) and stars move this.
```

- [ ] **Step 3: Verify links and formatting**

Run: `npx --yes markdownlint-cli2 README.md docs/mcp-registry-checklist.md` if available; otherwise visually confirm the two files render (headings, checkboxes, links well-formed).
Expected: no broken markdown; relative links resolve to existing files.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/mcp-registry-checklist.md
git commit -m "docs: document MCP registry publishing and directory checklist"
```

---

## Final verification (after all tasks)

- [ ] Run the full quality gate: `npm run quality && npm run test`
  Expected: lint, format-check, type-check, and all vitest tests PASS (including the two new `src/registry/*.test.ts` files).
- [ ] Confirm `git status` is clean and the branch contains four focused commits (Tasks 1–4).

## Self-Review notes (author)

- **Spec coverage:** server.json both transports → Task 1; mcpName ownership → Task 1; oci/Docker package → Task 1; CI version sync → Task 2 + Task 3; CI auto-publish via OIDC → Task 3; downstream checklist + scoring tips → Task 4; testing/verification → per-task tests + final gate. All spec sections mapped.
- **Schema shapes** verified against `server.schema.json` (2025-12-11): required package fields `registryType`/`identifier`/`transport`; named-flag arg `{type:"named",name:"--sse"}`; valued arg adds `value`; streamable-http transport requires `url`; oci identifier carries the registry host. `isRequired`/`isSecret`/`default` on env vars follow the registry's generic-server-json reference example. The real conformance gate is the server-side validation performed by `mcp-publisher publish` on the first CI release.
- **Type consistency:** `syncServerJsonVersion(serverJson, version)` is referenced identically in Task 2's test, implementation, and Task 3's `npm run sync:server-json` wrapper.
```
