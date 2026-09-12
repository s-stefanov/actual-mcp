# MCP Registry Publishing — Design

**Date:** 2026-09-06
**Status:** Approved (brainstorming) — ready for implementation planning
**Branch:** `s-stefanov/feat-registry`

## Goal

Increase discovery of `actual-mcp` by publishing it to the **official MCP
Registry** (`registry.modelcontextprotocol.io`) — the canonical source of truth
that downstream directories and AI clients ingest — and then claiming the
high-traffic downstream directories. Publishing correctly propagates the
listing to places like the GitHub MCP registry and VS Code automatically.

The server must advertise **both transports** it supports: `stdio` (default)
and `streamable-http` (`--sse` flag).

## Background: how the server runs

From `src/index.ts`:

- **Default = stdio.** Launched via `npx actual-mcp` / `node build/index.js`,
  speaks MCP over stdin/stdout.
- **`--sse` flag = HTTP.** Starts an Express server exposing **streamable
  HTTP** at paths `/` and `/mcp` (plus legacy SSE) on `--port` (default
  `3000`). Optional `--enable-bearer` adds bearer-token auth. `--enable-write`
  gates write tools.

Environment variables:

| Variable | Required | Secret | Notes |
|---|---|---|---|
| `ACTUAL_SERVER_URL` | yes | no | URL of the Actual Budget server |
| `ACTUAL_PASSWORD` | yes | yes | Server password |
| `ACTUAL_BUDGET_SYNC_ID` | yes | no | Budget sync ID |
| `ACTUAL_DATA_DIR` | no | no | Local cache dir for budget data |
| `ACTUAL_BUDGET_ENCRYPTION_PASSWORD` | no | yes | Only if E2E encryption enabled |
| `ACTUAL_SYNC_TTL_MS` | no | no | Sync cache TTL, default `60000` |

**Key constraint:** the HTTP mode is **self-hosted** — every user runs their own
instance; there is no single public URL. Therefore the official registry's
`remotes` field (for publicly-hosted fixed endpoints) does **not** apply. Both
transports are expressed as `packages` entries on the same npm package.

## Current state

- Published on npm as `actual-mcp` (v1.12.1), public, MIT, `bin: actual-mcp`.
- Public GitHub repo `s-stefanov/actual-mcp`; Docker image published to Docker
  Hub as `s-stefanov/actual-mcp` on each release.
- `release-please.yml` already auto-publishes npm + Docker Hub on release and
  declares `permissions: id-token: write` (OIDC).
- **Missing:** `server.json`, and the `mcpName` field in `package.json`.

## Components

### 1. `package.json` — ownership proof

Add one field:

```json
"mcpName": "io.github.s-stefanov/actual-mcp"
```

The registry downloads the published npm tarball and verifies this field
matches the `server.json` `name` exactly. Publish **fails** if it is missing or
mismatched. This means the npm version carrying `mcpName` must be published
**before** (or in the same release as) the registry publish.

### 2. `server.json` (repo root)

Reverse-DNS name `io.github.s-stefanov/actual-mcp` (GitHub namespace, proven via
OIDC in CI or OAuth locally). Three `packages` entries:

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
        { "type": "named", "name": "--sse", "value": "" },
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
      "registryBaseUrl": "https://docker.io",
      "identifier": "s-stefanov/actual-mcp",
      "version": "1.12.1",
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

Notes for implementation:
- The exact `packageArguments` shape (`named` boolean flag with empty value vs.
  a `positional`/flag form) must be validated against the current
  `server.schema.json`; the representation above is the intent — adjust to
  whatever the schema accepts for a bare `--sse` flag plus a `--port 3000`
  value pair.
- The `oci` package `registryBaseUrl` / identifier form must be confirmed
  against the schema's approved OCI registries (Docker Hub is approved).
- Docker Hub tags are published per release (`:<tag>` and `:latest`); the
  registry entry pins the semver `version`.

### 3. CI automation (`release-please.yml`)

Extend the existing `release_created`-gated job. All steps below run only when
release-please cut a release.

1. **Version sync script** — add `scripts/sync-server-json-version.mjs`:
   reads `version` from `package.json` and rewrites `server.json`'s top-level
   `version` **and** every `packages[].version`. Run it right after checkout /
   before publish. Rationale: release-please (`release-type: node`) bumps
   `package.json` cleanly, but nested `packages[].version` in comment-less JSON
   can't be reliably targeted by release-please updaters, so a script is the
   robust single source of truth.
2. **npm publish** — unchanged (already present); ships the tarball carrying
   `mcpName`.
3. **Install `mcp-publisher`** — via the official curl install step.
4. **Authenticate** — `mcp-publisher login github-oidc` (uses existing
   `id-token: write`; **no secrets to manage**).
5. **Publish** — `mcp-publisher publish` (reads `server.json` from repo root).

Ordering: the synced `server.json` version must equal the just-published npm
version, and npm publish must complete before `mcp-publisher publish` so the
registry can verify the `mcpName` field in the live tarball.

### 4. Downstream directory checklist (manual, after first successful publish)

Publishing to the official registry propagates automatically to several
consumers, but the high-traffic directories reward an explicitly **claimed**
listing. Do these once:

- [ ] **Glama** (`glama.ai/mcp`) — claim ownership to move out of the crawled
  tier into "Claimed"/"Official". Verify the auto-imported description/links.
- [ ] **PulseMCP** — claim the entry to separate verified owner info from
  auto-generated data.
- [ ] **Smithery** (`smithery.ai`) — `smithery mcp publish <url> -n
  s-stefanov/actual-mcp` (or claim the crawled listing) for install UX + reach.
- [ ] **awesome-mcp-servers** (punkpeye, GitHub) — open a PR adding the server
  under the appropriate category (finance/budgeting).

### Scoring / ranking tips (what the directories reward)

- **Official registry**: binary gate — passing namespace auth + package
  ownership is the whole game; that gets you propagated everywhere.
- **Glama quality score**: claimed ownership, scanner-readable metadata
  (transport declared — satisfied by `server.json`), zero-config-ish setup,
  active repo, clear license, complete tool schemas/annotations.
- **MCP Toplist ranking**: version count, GitHub release + commit activity,
  stars, listing age. Regular releases (release-please) and asking users for
  stars move this.

## Error handling / gotchas

- **`mcpName` mismatch** → publish rejected. Keep name identical in
  `package.json` and `server.json`.
- **Version drift** → registry rejects if the referenced package version isn't
  live on npm. The sync script + ordering prevent this.
- **Schema drift** → pin the `$schema` date; re-validate `packageArguments` and
  `oci` shapes against it during implementation.
- **First publish is chicken-and-egg**: the npm version with `mcpName` must be
  live before the first registry publish. Options: (a) let the next
  release-please release carry both, or (b) do a one-time manual publish
  (`npm publish` of a version with `mcpName`, then local `mcp-publisher login
  github` + `mcp-publisher publish`). The implementation plan should pick one;
  recommendation is (a) to keep a single automated path, accepting that the
  registry listing appears at the next release.

## Testing / verification

- Validate `server.json` against the published `server.schema.json` with `ajv`
  (add a dev step or a `scripts/` check).
- Run `mcp-publisher` local validation (`mcp-publisher publish --dry-run` or
  equivalent validate command) before wiring CI.
- Unit-test `sync-server-json-version.mjs`: reads package version, updates all
  version fields (happy path), leaves other fields untouched (edge), and fails
  loudly if `server.json` is missing/malformed (failure case) — per repo
  testing conventions.
- Dry-run the release job on a branch / with `act` or a test tag where
  feasible; confirm ordering (npm publish → registry publish).

## Out of scope

- Changing the server's transport implementation (already supports both).
- Hosting a public remote endpoint (the server is self-hosted by design).
- Non-registry marketing.

## Sources

- Official MCP Registry — about / quickstart / GitHub:
  https://modelcontextprotocol.io/registry/about ,
  https://modelcontextprotocol.io/registry/quickstart ,
  https://github.com/modelcontextprotocol/registry
- server.json schema reference:
  https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/generic-server-json.md
- GitHub Actions OIDC publishing:
  https://modelcontextprotocol.io/registry/github-actions
- Glama server.json requirements:
  https://glama.ai/blog/2026-01-24-official-mcp-registry-serverjson-requirements
- Directory listing guide:
  https://tallyfy.com/how-to-list-mcp-server-registry-smithery-glama-pulsemcp/
