# MCP End-to-End Validation Gate — Design (Leaner Revision)

**Date:** 2026-09-06
**Status:** Revised — leaner design supersedes the earlier heavier draft (per-file
containers, snapshot export/import cache, and scenario DSL builder are CUT; see §2)
**Author:** Stefan Stefanov (with Claude)

## 1. Problem & Goal

The existing test suite (`src/**/*.test.ts`) mocks `@actual-app/api`, so it
verifies unit logic but never exercises the MCP server the way a real client
does: over the actual MCP wire protocol, against a real Actual Budget server,
mutating real data.

The MCP tools are **thin wrappers over `@actual-app/api`**, and renovate
regularly bumps `@actual-app/*`. Because the unit tests **mock** that dependency,
a bump can break real behavior while the unit suite stays green. That is the core
motivation for having any gate at all: **the e2e gate catches exactly the class
of breakage the mocked suite is blind to** — a dependency bump that changes real
wire behavior.

**Goal:** a validation gate that spawns a client which connects to the running
MCP server and exercises the tools end-to-end — proving each tool works against a
real backend, not just against mocks.

Scope is a **deterministic scripted MCP client** (via `@modelcontextprotocol/sdk`
`Client`), not an LLM-driven agent.

## 2. Non-Goals

- No LLM-in-the-loop / natural-language judgment of tool output. (Could be a
  future layer; out of scope here.)
- No diff-scoped selective execution. The gate runs the whole suite when it fires.
- No change to the existing unit test suite, its config, or its speed. Unit tests
  stay fully mocked and Docker-free.
- No committed opaque binary budget fixtures — seed data is code-defined (§5).
- **No per-file container isolation.** One shared container for the whole suite
  (§4). Considered and cut as disproportionate for a small-maintainer repo.
- **No snapshot export/import cache** (`exportBudget`/`importBudget` `.zip`
  round-trip). Seed once, in-process, programmatically (§5). Cut.
- **No scenario DSL / builder framework.** Plain typed seed helper functions
  instead (§5). Cut.

The three cuts above were all in the earlier draft and are intentionally removed:
for a repo with thin wrapper tools and a single maintainer, they add machinery
whose cost outweighs the isolation/speed they buy.

## 3. When the Gate Runs (CI trigger)

Unchanged from the earlier design. The e2e suite is Docker-backed and slow, so it
does **not** run on every PR. It runs only when one of these is true:

1. The PR is a release-please PR (`startsWith(github.head_ref, 'release-please--')`),
   i.e. right before a version ships (which is precisely when a merged dependency
   bump would otherwise ship unvalidated).
2. The PR carries the `run-e2e` label — applied manually by an author/reviewer
   when a PR touches `src/tools/**` or an `@actual-app/*` bump.

Implemented as a new `e2e-test` job in `.github/workflows/pr-validation.yml`:

```yaml
on:
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened, labeled] # `labeled` so adding the
                                                    # label re-triggers an open PR

jobs:
  # ... existing build-and-test / type-check / lint / coverage-report jobs unchanged ...

  e2e-test:
    name: E2E Validation Gate
    runs-on: ubuntu-latest
    timeout-minutes: 20
    if: >
      startsWith(github.head_ref, 'release-please--') ||
      contains(github.event.pull_request.labels.*.name, 'run-e2e')
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - run: npm run test:e2e
```

GitHub-hosted `ubuntu-latest` runners provide Docker natively, so no extra setup
step is required. Existing lint/unit/type-check jobs remain on every PR.

## 4. Architecture Overview

```
vitest.e2e.config.ts
  globalSetup (e2e/global-setup.ts) — ONCE per run:
       │   1. start ONE actual-server container (testcontainers)     (§7.1)
       │   2. bootstrap server password                              (§7.2)
       │   3. api.init + seed ONE budget programmatically            (§5)
       │   4. api.sync() → capture cloudFileId (sync id) + name→id map
       │   5. expose { url, password, syncId, ids } to the suite
       ▼
e2e/*.e2e.test.ts   (a handful of files, grouped by tool family)
       │   one shared MCP client for the whole run:
       │     spawn `node build/index.js --enable-write` (StdioClientTransport)
       │     wired to the shared container, ACTUAL_SYNC_TTL_MS=0     (§7.3)
       └─ tests: callTool(name, args) → assert on real results
```

**One shared container + one shared budget for the entire run.** There is no
per-file lifecycle: `globalSetup` boots and seeds once; the suite reuses it.

**Isolation is achieved by naming, not by containers** (§6): mutating tests
create uniquely-named records and assert only on those, so they coexist safely in
the shared budget. Read tests assert on the known seeded data.

**Explicit tradeoff:** a single shared container + shared budget trades some test
isolation for much lower CI cost and complexity, mitigated by unique-named records
in mutating tests.

## 5. Seed Layer

The budget is seeded **once**, in `globalSetup`, in-process, using **plain typed
helper functions** — no builder DSL, no `.zip` snapshot cache. The helpers wrap
the same `@actual-app/api` create functions that `src/actual-api.ts` wraps
(`createAccount`, `createCategoryGroup`, `createCategory`, `createPayee`,
`importTransactions`):

```ts
// e2e/helpers/seed.ts — plain functions, no framework
export async function seedAccount(name: string, balance: number): Promise<string>;
export async function seedCategoryGroup(
  name: string,
  cats: string[],
  opts?: { isIncome?: boolean },
): Promise<{ groupId: string; catIds: Record<string, string> }>;
export async function seedPayee(name: string): Promise<string>;
export async function seedTxn(
  account: string,
  payee: string,
  category: string,
  amount: number,   // cents
  date: string,     // 'YYYY-MM-DD'
): Promise<string>;
```

`global-setup.ts` calls these against the shared container, then `api.sync()` to
push the seeded data up. It records:

- The resulting **cloudFileId (sync id)** — captured after sync via
  `api.getBudgets()` (see §10) — passed to the spawned MCP server as
  `ACTUAL_BUDGET_SYNC_ID` (the server calls `downloadBudget(syncId)`; see
  `src/actual-api.ts` `initActualApi`).
- A **name → id map** of every seeded entity, shared with the tests so they never
  hardcode UUIDs.

Because the seeder is a **separate process** from the MCP server, the server is
run with `ACTUAL_SYNC_TTL_MS=0` (sync before every call) so it always sees the
latest data — both the seed and any mutations tests make.

## 6. Test Files & Isolation-by-Naming

A **handful of test files, grouped by tool family**, not one file per tool:

```
e2e/accounts-transactions.e2e.test.ts
e2e/categories.e2e.test.ts
e2e/payees.e2e.test.ts
e2e/rules.e2e.test.ts
e2e/budgets.e2e.test.ts
e2e/imports.e2e.test.ts            # import-transactions, run-bank-sync
```

Each file drives the real MCP server via the shared SDK `Client` and asserts
against the shared backend.

**Isolation without per-file containers:** mutating tests create records with a
**per-test unique token** in the name (e.g. `` `E2E ${crypto.randomUUID()}` ``)
and assert only on records carrying that token. This keeps concurrently-run tests
from contaminating each other's assertions within the one shared budget. Read
tests assert against the known seeded data from the `ids` map.

## 7. Container & MCP Client Helpers

### 7.1 `e2e/helpers/actual-server.ts`

Uses `testcontainers` (new devDependency) to launch **one** shared
`actualbudget/actual-server` container for the run:

- Image tag pinned to match the installed `@actual-app/api` (`26.8.1`) to avoid
  client/server protocol drift. (Exact tag confirmed at implementation time.)
- Random host port (testcontainers default).
- HTTP health wait strategy before returning; `withStartupTimeout` so Docker
  problems fail fast with a clear message instead of cascading test failures.
- Returns `{ url, stop() }`.
- **Docker-unavailable local dev:** the helper detects when Docker is not
  reachable and the suite **skips cleanly** with a clear message rather than
  hard-failing, so contributors without Docker can still run `npm run test`.

### 7.2 Password bootstrap

A fresh server has no password. Before `api.init` can authenticate, the harness
bootstraps a fixed test password against the container's bootstrap endpoint
(`POST /account/bootstrap`, or the SDK path if one is exposed — confirmed at
implementation time). That password is then used for `ACTUAL_PASSWORD` and the
seed/sync in §5.

### 7.3 `e2e/helpers/mcp-client.ts`

- Spawns the built server: `node build/index.js --enable-write` as a child
  process over stdio. `--enable-write` is required so write tools are registered
  (see `src/tools/index.ts` `setupTools(server, enableWrite)`).
- Env wired once: `ACTUAL_SERVER_URL`, `ACTUAL_PASSWORD`,
  `ACTUAL_BUDGET_SYNC_ID`, and `ACTUAL_SYNC_TTL_MS=0` (force a sync before every
  tool call so the MCP server — a *separate process* from the seeder — always
  sees the seeded/mutated data). `ACTUAL_DATA_DIR` set to a dedicated temp dir.
- Connects `@modelcontextprotocol/sdk` `Client` over `StdioClientTransport`.
- `callTool(name, args)` → calls the tool, normalizes the MCP content payload, and
  surfaces `isError`.
- **One shared MCP client connection for the whole run** is fine because the
  backend is shared; keep it simple. (Per-file is an option if it proves cleaner
  — see §10.)

## 8. Test Coverage per Tool

Each tool covered gets, at minimum:

- **Happy path:** call the tool with valid args (using the `ids` map), assert on
  real returned data.
- **Persistence check (mutating tools):** after a create/update/delete, re-read to
  verify the change actually persisted server-side (e.g. `create-transaction` →
  `get-transactions` shows it). Confirms the mutation crossed the wire, not just
  that the tool returned success. Mutations use unique-named records (§6).
- **Failure path:** invalid/missing id or malformed args → assert `isError: true`
  with a message matching the tool's real error contract in
  `src/tools/<tool>/index.ts` (verified against the actual error branches, not
  assumed).

Coverage spans the ~20+ tools across get-accounts, get-transactions,
create/update/delete-transaction, categories/*, payees/*, rules/*, budgets/*,
import-transactions, run-bank-sync, spending-by-category, monthly-summary,
balance-history — grouped into the files listed in §6.

## 9. Runner Configuration

`vitest.e2e.config.ts` (separate config, independent of `vitest.config.ts`):

- `include: ['e2e/**/*.e2e.test.ts']`
- `globalSetup: ['e2e/global-setup.ts']` (boot + seed once, §4/§5)
- Longer `testTimeout` / `hookTimeout` to accommodate image pull + container boot
  + seed. Tuned at implementation time.

`package.json` scripts:

- `"test:e2e": "vitest run --config vitest.e2e.config.ts"`
- `npm run test` / `test:unit` unchanged — they never touch Docker.

## 10. File Layout (new, leaner)

```
e2e/
  global-setup.ts        # boot shared container, seed budget once, expose url/syncId/ids
  helpers/
    actual-server.ts     # testcontainers wrapper + password bootstrap
    seed.ts              # plain typed seed helpers
    mcp-client.ts        # spawn server child + SDK Client + callTool()
  accounts-transactions.e2e.test.ts
  categories.e2e.test.ts
  payees.e2e.test.ts
  rules.e2e.test.ts
  budgets.e2e.test.ts
  imports.e2e.test.ts
vitest.e2e.config.ts
```

## 11. New Dependencies

- `testcontainers` (devDependency) — container lifecycle for `actual-server`.
- No new runtime dependencies. `@modelcontextprotocol/sdk` (already present,
  v1.27.1) provides the `Client` + `StdioClientTransport`.

## 12. Open Items to Confirm at Implementation Time

Known unknowns to resolve while building (not blockers to the design):

1. Exact `actualbudget/actual-server` image tag compatible with
   `@actual-app/api@26.8.1`.
2. Exact password-bootstrap mechanism (HTTP `POST /account/bootstrap` payload vs.
   any SDK-exposed helper).
3. How to read back the seeded budget's **cloudFileId** after `api.sync()` to pass
   as `ACTUAL_BUDGET_SYNC_ID` (via `api.getBudgets()`, resolving by name).
4. Whether **one shared MCP client for the whole run** vs. **per-file** is cleaner
   in practice.

## 13. Good Practices Captured (MCP testing)

- Test through the **real MCP transport** (stdio `Client`), not by importing tool
  handlers directly — catches protocol/serialization/registration bugs.
- Test against a **real backend** in a disposable container — catches data-layer
  behavior mocks hide (the renovate-bump-breaks-real-behavior case that motivates
  this gate).
- **Deterministic, code-defined seed data** so assertions can check exact values.
- **Assert persistence**, not just tool success, for mutations.
- **Cover the error contract**, not only the happy path.
- Keep the slow gate **off the hot PR path**; gate it behind release PRs + an
  opt-in label.
- **Explicit tradeoff:** a single shared container + shared budget trades some test
  isolation for much lower CI cost and complexity, mitigated by unique-named
  records in mutating tests.
