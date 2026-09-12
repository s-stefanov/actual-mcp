# MCP End-to-End Validation Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Docker-backed e2e validation gate that drives the real MCP server over the stdio wire protocol against a real Actual Budget server, proving each tool works end-to-end — catching the dependency-bump breakage the fully-mocked unit suite is blind to.

**Architecture:** A separate Vitest config (`vitest.e2e.config.ts`) runs `e2e/**/*.e2e.test.ts`. A `globalSetup` boots ONE `actualbudget/actual-server` container (testcontainers), bootstraps its password, then in-process creates and seeds ONE budget via `api.runImport(...)`, uploads it to the server via the internal `sync-reset` handler to obtain a `cloudFileId`, and exposes `{ url, password, syncId, ids }` to the suite via Vitest's `provide()`. Each test file spawns the built MCP server (`node build/index.js --enable-write`) as a stdio child wired to that container with `ACTUAL_SYNC_TTL_MS=0`, connects a `@modelcontextprotocol/sdk` `Client`, and asserts on real tool results. Isolation is by unique-named records, not by containers.

**Tech Stack:** TypeScript (ESM), Vitest 4.1.10, `testcontainers` (new devDependency), `@modelcontextprotocol/sdk` 1.27.1 (`Client` + `StdioClientTransport`), `@actual-app/api` 26.8.1, Docker (provided natively by GitHub-hosted `ubuntu-latest`).

**Spec:** `docs/superpowers/specs/2026-09-06-mcp-e2e-validation-gate-design.md`

## Global Constraints

- **Node version:** 24 (matches the CI `e2e-test` job and `setup-node`).
- **ESM only:** all imports use explicit `.js` extensions in relative paths (e.g. `import { x } from './seed.js'`), consistent with the existing `src/**` code. Test files under `e2e/` import helpers with `.js` suffixes.
- **Build output path:** the compiled server entry is `build/index.js` (per `tsconfig.build.json` `outDir: ./build`). The e2e suite requires `npm run build` to have run first.
- **Write tools:** the MCP server registers the 17 write tools only when spawned with `--enable-write` (see `src/tools/index.ts` `setupTools`). The e2e client always spawns with `--enable-write`.
- **Sync freshness / write propagation (verified from source):** `src/tools/index.ts` runs `initActualApi()` → handler → `shutdownActualApi()` in a `finally` on **every** tool call, and `shutdownActualApi()` calls `api.shutdown()`, which itself does `await internal.send("sync")` → `fullSync()` (a synchronous, awaited CRDT push) **before** `close-budget` (confirmed in `@actual-app/api/dist/index.js`: `shutdown()` and `app.method("sync", sync$1)` where `sync$1 = () => fullSync()`). So each mutation is flushed to the server before the next `callTool`'s fresh `downloadBudget`. This is what makes the create→read persistence checks reliable. `ACTUAL_SYNC_TTL_MS=0` is set for defensiveness but is effectively inert in the per-call-init model (its early-return branch never runs). **Do not assume** — Task 5 Step 4 treats the first persistence test as the gating experiment, with a spelled-out remedy (`NODE_ENV: 'test'` in the child env forces immediate `fullSync` per dist line ~62202) if it proves flaky.
- **Actual-server image tag:** pin to `actualbudget/actual-server:25.10.0` **only if** that exact tag is confirmed on Docker Hub to be protocol-compatible with `@actual-app/api@26.8.1`; otherwise pin to the published tag whose version equals the installed api version (`26.8.1`). The tag is defined in ONE place (`E2E_SERVER_IMAGE` constant in `e2e/helpers/actual-server.ts`). Never use `:latest`.
- **Do not modify** `vitest.config.ts`, the existing `src/**/*.test.ts` suite, or `npm run test` / `npm run test:unit` — unit tests stay fully mocked and Docker-free (spec §2).
- **Error contract (uniform):** every tool surfaces failures as `{ isError: true, content: [{ type: 'text', text: 'Error: <message>' }] }` (via `errorFromCatch` in `src/utils/response.ts`, or a tool-local `isError` branch). Failure-path assertions key on `isError === true` plus a substring of the real message.
- **Tool output shapes differ:** some tools return JSON text (`successWithJson`, e.g. `get-accounts`), others return Markdown text (`success`, e.g. `get-transactions`). `callTool` returns the raw concatenated text; JSON tools are parsed with `JSON.parse`, Markdown tools are asserted with substring checks. Never assume every tool returns JSON.
- **No budgets tests:** the spec lists `budgets.e2e.test.ts` / "budgets/*" coverage, but **no budget tools exist** in `src/tools/` (they are the subject of the separate PR #163 rebuild). That file is intentionally omitted; add it only when budget tools are registered in `src/tools/index.ts`.

---

## File Structure

**New files:**
- `vitest.e2e.config.ts` — separate Vitest config for the e2e suite (include glob, globalSetup, long timeouts).
- `e2e/helpers/actual-server.ts` — testcontainers wrapper: start container, HTTP health wait, password bootstrap, Docker-unavailable detection, `{ url, password, stop() }`.
- `e2e/helpers/seed.ts` — plain typed seed helper functions wrapping `@actual-app/api` create functions.
- `e2e/helpers/mcp-client.ts` — spawn built server as stdio child, connect SDK `Client`, `callTool(name, args)` returning normalized `{ text, isError }`.
- `e2e/global-setup.ts` — orchestrates: boot container → bootstrap → `api.init` → `runImport`+seed → `sync-reset` → capture `cloudFileId` + name→id map → `provide()` → teardown.
- `e2e/accounts-transactions.e2e.test.ts` — get-accounts, get-transactions, create/update/delete-transaction.
- `e2e/categories.e2e.test.ts` — get-grouped-categories, create/update/delete category + category-group.
- `e2e/payees.e2e.test.ts` — get-payees, create/update/delete-payee.
- `e2e/rules.e2e.test.ts` — get-rules, create/update/delete-rule.
- `e2e/imports.e2e.test.ts` — import-transactions, run-bank-sync, plus report tools (spending-by-category, monthly-summary, balance-history).

**Modified files:**
- `package.json` — add `test:e2e` script and `testcontainers` devDependency.
- `.github/workflows/pr-validation.yml` — add the gated `e2e-test` job.

Each helper has one responsibility; test files are grouped by tool family (spec §6). No file approaches 500 lines.

---

## Task 1: Dependency + runner scaffold

**Files:**
- Modify: `package.json` (scripts + devDependencies)
- Create: `vitest.e2e.config.ts`

**Interfaces:**
- Produces: the `npm run test:e2e` command, and a `vitest.e2e.config.ts` whose `globalSetup` path is `./e2e/global-setup.ts` (created in Task 4) and whose `include` is `['e2e/**/*.e2e.test.ts']`.

- [ ] **Step 1: Add the testcontainers devDependency**

Run:

```bash
npm install --save-dev testcontainers
```

Expected: `testcontainers` appears under `devDependencies` in `package.json` and `package-lock.json` updates.

- [ ] **Step 2: Add the `test:e2e` script**

Modify `package.json` `scripts` — add this entry (leave `test`, `test:unit`, etc. untouched):

```json
"test:e2e": "vitest run --config vitest.e2e.config.ts"
```

- [ ] **Step 3: Create the e2e Vitest config**

Create `vitest.e2e.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Reason: e2e suite is Docker-backed and slow; it is fully independent of
// vitest.config.ts (which stays mocked + fast). Timeouts must absorb image
// pull, container boot, budget seed, and per-call downloadBudget round-trips.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['e2e/**/*.e2e.test.ts'],
    globals: true,
    globalSetup: ['e2e/global-setup.ts'],
    // One file at a time: all files share one budget on one container.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 180_000,
    alias: {
      '^(\\.{1,2}/.*)\\.js$': '$1', // Handle .js imports in TypeScript
    },
    testTransformMode: {
      web: ['\\.tsx?$'],
    },
  },
});
```

- [ ] **Step 4: Verify the config loads (no e2e tests yet)**

Run: `npx vitest run --config vitest.e2e.config.ts`
Expected: Vitest starts, reports "No test files found, exiting with code 0" (the `globalSetup` file does not exist yet, but Vitest does not load `globalSetup` when there are zero matching test files). If instead it errors on the missing `e2e/global-setup.ts`, that is also acceptable at this stage — proceed; Task 4 creates it.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.e2e.config.ts
git commit -m "chore(e2e): add testcontainers dep and e2e vitest config"
```

---

## Task 2: Actual-server container helper

**Files:**
- Create: `e2e/helpers/actual-server.ts`
- Test: `e2e/helpers/actual-server.smoke.e2e.test.ts` (temporary smoke test; deleted in Step 6)

**Interfaces:**
- Produces:
  - `const E2E_SERVER_IMAGE: string` — the pinned image tag (single source of truth).
  - `async function isDockerAvailable(): Promise<boolean>` — true when a Docker daemon is reachable.
  - `async function startActualServer(): Promise<{ url: string; password: string; stop: () => Promise<void> }>` — boots one container, waits for HTTP health, bootstraps the fixed test password `'e2e-test-password'`, returns the mapped `url` (e.g. `http://localhost:49xxx`), the `password`, and a `stop()` that terminates the container.
  - `const E2E_TEST_PASSWORD = 'e2e-test-password'`.

- [ ] **Step 1: Write the failing smoke test**

Create `e2e/helpers/actual-server.smoke.e2e.test.ts`:

```ts
import { describe, it, expect, afterAll } from 'vitest';
import { startActualServer, isDockerAvailable } from './actual-server.js';

const dockerUp = await isDockerAvailable();

describe.skipIf(!dockerUp)('actual-server helper', () => {
  let handle: Awaited<ReturnType<typeof startActualServer>> | undefined;

  afterAll(async () => {
    await handle?.stop();
  });

  it('boots a container, bootstraps, and reports needs-bootstrap=false', async () => {
    handle = await startActualServer();
    expect(handle.url).toMatch(/^http:\/\/[^/]+:\d+$/);

    const res = await fetch(`${handle.url}/account/needs-bootstrap`);
    const body = (await res.json()) as { status: string; data: { bootstrapped: boolean } };
    expect(body.data.bootstrapped).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --config vitest.e2e.config.ts e2e/helpers/actual-server.smoke.e2e.test.ts`
Expected: FAIL — `Failed to resolve import "./actual-server.js"` (the helper does not exist yet). If Docker is not running locally, the test is skipped instead; in that case rely on CI (Task 10) to exercise it, and continue.

- [ ] **Step 3: Implement the helper**

Create `e2e/helpers/actual-server.ts`:

```ts
import { GenericContainer, Wait, type StartedTestContainer } from 'testcontainers';

/**
 * Pinned to match the installed @actual-app/api (see Global Constraints).
 * Verify this exact tag exists on Docker Hub and is protocol-compatible with
 * @actual-app/api@26.8.1 before merging.
 */
export const E2E_SERVER_IMAGE = 'actualbudget/actual-server:25.10.0';

/** Fixed password used for the disposable test server + budget sync. */
export const E2E_TEST_PASSWORD = 'e2e-test-password';

const ACTUAL_INTERNAL_PORT = 5006;

/**
 * Returns true when a Docker daemon is reachable. Lets the suite skip cleanly
 * on machines without Docker instead of hard-failing (spec §7.1).
 */
export async function isDockerAvailable(): Promise<boolean> {
  try {
    // Prefer testcontainers' runtime-client probe when the export exists; fall
    // back to false on any error (missing export, no daemon) so the suite skips
    // cleanly instead of throwing. Verify the export name against the installed
    // testcontainers version; if absent, replace the body with a lightweight
    // Docker socket check (e.g. fs.existsSync('/var/run/docker.sock')).
    const tc = (await import('testcontainers')) as {
      getContainerRuntimeClient?: () => Promise<unknown>;
    };
    if (typeof tc.getContainerRuntimeClient !== 'function') return false;
    await tc.getContainerRuntimeClient();
    return true;
  } catch {
    return false;
  }
}

export interface ActualServerHandle {
  url: string;
  password: string;
  stop: () => Promise<void>;
}

/**
 * Boots ONE actual-server container, waits for HTTP health, and bootstraps the
 * server password so api.init can authenticate.
 */
export async function startActualServer(): Promise<ActualServerHandle> {
  const container: StartedTestContainer = await new GenericContainer(E2E_SERVER_IMAGE)
    .withExposedPorts(ACTUAL_INTERNAL_PORT)
    .withWaitStrategy(Wait.forHttp('/account/needs-bootstrap', ACTUAL_INTERNAL_PORT).forStatusCode(200))
    .withStartupTimeout(120_000)
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(ACTUAL_INTERNAL_PORT);
  const url = `http://${host}:${port}`;

  // Bootstrap: a fresh server has no password. POST {url}/account/bootstrap
  // with { password } (confirmed against @actual-app/api bootstrap()).
  const res = await fetch(`${url}/account/bootstrap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: E2E_TEST_PASSWORD }),
  });
  if (!res.ok) {
    const text = await res.text();
    await container.stop();
    throw new Error(`Server bootstrap failed (${res.status}): ${text}`);
  }

  return {
    url,
    password: E2E_TEST_PASSWORD,
    stop: async () => {
      await container.stop();
    },
  };
}
```

- [ ] **Step 4: Run the smoke test to verify it passes**

Run: `npx vitest run --config vitest.e2e.config.ts e2e/helpers/actual-server.smoke.e2e.test.ts`
Expected: PASS (Docker available) or SKIPPED (Docker absent). If it fails on the wait strategy or bootstrap status, inspect the container logs the failure prints and confirm `E2E_SERVER_IMAGE` is a valid published tag and that `/account/needs-bootstrap` and `/account/bootstrap` are the correct paths for that server version, then re-run.

- [ ] **Step 5: If the bootstrap endpoint shape differs, reconcile**

If Step 4 fails with a non-200 bootstrap response, temporarily log `res.status`/body, verify the payload the installed api sends by reading `node_modules/@actual-app/api/dist/index.js` around the `bootstrap(loginConfig)` function (posts `loginConfig` to `SIGNUP_SERVER + "/bootstrap"`, `SIGNUP_SERVER = {url}/account`), and adjust the body accordingly. Re-run Step 4 until PASS.

- [ ] **Step 6: Delete the temporary smoke test and commit**

```bash
rm e2e/helpers/actual-server.smoke.e2e.test.ts
git add e2e/helpers/actual-server.ts
git commit -m "feat(e2e): add testcontainers actual-server helper with bootstrap"
```

The smoke test is removed because Task 4's global-setup and Task 5's real tests exercise the helper end-to-end; keeping a standalone container-boot test would double CI container starts.

---

## Task 3: Seed helpers

**Files:**
- Create: `e2e/helpers/seed.ts`

**Interfaces:**
- Consumes: `@actual-app/api` create functions (`createAccount`, `createCategoryGroup`, `createCategory`, `createPayee`, `addTransactions`), which require an initialized + loaded budget (Task 4 calls these inside `api.runImport`).
- Produces:
  - `async function seedAccount(name: string, balance: number): Promise<string>` — creates an on-budget account with `initialBalance` in cents, returns account id.
  - `async function seedCategoryGroup(name: string, cats: string[], opts?: { isIncome?: boolean }): Promise<{ groupId: string; catIds: Record<string, string> }>` — creates a group and its categories, returns the group id and a category-name→id map.
  - `async function seedPayee(name: string): Promise<string>` — returns payee id.
  - `async function seedTxn(accountId: string, payeeId: string, categoryId: string, amount: number, date: string): Promise<string>` — creates one transaction (amount in cents, date `'YYYY-MM-DD'`), returns the transaction id.

- [ ] **Step 1: Implement the seed helpers**

Create `e2e/helpers/seed.ts`:

```ts
import { createAccount, createCategoryGroup, createCategory, createPayee, addTransactions } from '@actual-app/api';

/**
 * Plain typed seed helpers (no builder DSL, spec §5). Each wraps the same
 * @actual-app/api create function src/actual-api.ts wraps. Called inside
 * api.runImport(...) in global-setup, against a freshly loaded budget.
 */

export async function seedAccount(name: string, balance: number): Promise<string> {
  // initialBalance is in cents; second arg to createAccount seeds the balance.
  return createAccount({ name, offbudget: false } as Parameters<typeof createAccount>[0], balance);
}

export async function seedCategoryGroup(
  name: string,
  cats: string[],
  opts?: { isIncome?: boolean },
): Promise<{ groupId: string; catIds: Record<string, string> }> {
  const groupId = await createCategoryGroup({
    name,
    is_income: opts?.isIncome ?? false,
  } as Parameters<typeof createCategoryGroup>[0]);

  const catIds: Record<string, string> = {};
  for (const cat of cats) {
    catIds[cat] = await createCategory({
      name: cat,
      group_id: groupId,
      is_income: opts?.isIncome ?? false,
    } as Parameters<typeof createCategory>[0]);
  }
  return { groupId, catIds };
}

export async function seedPayee(name: string): Promise<string> {
  return createPayee({ name } as Parameters<typeof createPayee>[0]);
}

export async function seedTxn(
  accountId: string,
  payeeId: string,
  categoryId: string,
  amount: number,
  date: string,
): Promise<string> {
  // addTransactions returns the id of the last added transaction.
  const result = await addTransactions(
    accountId,
    [{ date, amount, payee: payeeId, category: categoryId } as never],
    { runTransfers: false, learnCategories: false },
  );
  return typeof result === 'string' ? result : String(result);
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "e2e/helpers/seed" || echo "seed.ts OK"`
Expected: `seed.ts OK` (no type errors attributable to `e2e/helpers/seed.ts`). If `createAccount`/`createCategory` field names mismatch, cross-check the signatures in `node_modules/@actual-app/api/@types/methods.d.ts` (`createAccount(account, initialBalance?)`, `createCategoryGroup`, `createCategory`) and the `APIAccountEntity`/`APICategoryEntity` models, then adjust field names.

- [ ] **Step 3: Commit**

```bash
git add e2e/helpers/seed.ts
git commit -m "feat(e2e): add typed budget seed helpers"
```

---

## Task 4: Global setup — boot, seed, upload, expose

**Files:**
- Create: `e2e/global-setup.ts`
- Test: `e2e/global-setup.probe.e2e.test.ts` (temporary probe; deleted in Step 7)

**Interfaces:**
- Consumes: `startActualServer` (Task 2), the seed helpers (Task 3), and `@actual-app/api` (`init`, `runImport`, `sync`, `getBudgets`, `shutdown`).
- Produces — values shared with every test via Vitest `provide()` (all JSON-serializable):
  - `provide('e2e', value: E2EContext)` where
    ```ts
    interface E2EContext {
      url: string;
      password: string;
      syncId: string; // the budget's cloudFileId, for ACTUAL_BUDGET_SYNC_ID
      ids: {
        accounts: Record<string, string>;   // name -> id
        categories: Record<string, string>; // name -> id
        categoryGroups: Record<string, string>;
        payees: Record<string, string>;
        transactions: Record<string, string>; // label -> id
      };
    }
    ```
  - The `E2EContext` type is exported from `e2e/global-setup.ts` and imported by tests and by `mcp-client.ts`.

- [ ] **Step 1: Write the probe test that reads the injected context**

Create `e2e/global-setup.probe.e2e.test.ts`:

```ts
import { describe, it, expect, inject } from 'vitest';

describe('global-setup provides e2e context', () => {
  it('exposes url, syncId, and seeded ids', () => {
    const ctx = inject('e2e');
    expect(ctx.url).toMatch(/^http:\/\//);
    expect(ctx.syncId).toBeTruthy();
    expect(Object.keys(ctx.ids.accounts).length).toBeGreaterThan(0);
    expect(ctx.ids.categories).toHaveProperty('Groceries');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --config vitest.e2e.config.ts e2e/global-setup.probe.e2e.test.ts`
Expected: FAIL — Vitest errors that `globalSetup` file `e2e/global-setup.ts` cannot be resolved, or (if Docker is down) the run aborts in setup. Either way it is not green yet.

- [ ] **Step 3: Implement global-setup**

Create `e2e/global-setup.ts`:

```ts
import type { GlobalSetupContext } from 'vitest/node';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as api from '@actual-app/api';
import { startActualServer, isDockerAvailable, type ActualServerHandle } from './helpers/actual-server.js';
import { seedAccount, seedCategoryGroup, seedPayee, seedTxn } from './helpers/seed.js';

export interface E2EContext {
  url: string;
  password: string;
  syncId: string;
  ids: {
    accounts: Record<string, string>;
    categories: Record<string, string>;
    categoryGroups: Record<string, string>;
    payees: Record<string, string>;
    transactions: Record<string, string>;
  };
}

const BUDGET_NAME = 'E2E Test Budget';

export default async function setup(ctx: GlobalSetupContext): Promise<() => Promise<void>> {
  if (!(await isDockerAvailable())) {
    // Skip cleanly on Docker-less machines: provide a sentinel the tests treat
    // as "skip". Tests guard with `describe.skipIf` on a missing syncId.
    console.warn('[e2e] Docker not available — e2e suite will be skipped.');
    ctx.provide('e2e', { url: '', password: '', syncId: '', ids: emptyIds() });
    return async () => {};
  }

  let server: ActualServerHandle | undefined;
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'actual-e2e-seed-'));

  try {
    server = await startActualServer();

    const lib = await api.init({ dataDir, serverURL: server.url, password: server.password });

    const ids: E2EContext['ids'] = emptyIds();

    // Create + load a fresh budget, then seed inside the import transaction.
    await api.runImport(BUDGET_NAME, async () => {
      ids.accounts['Checking'] = await seedAccount('Checking', 500_000); // $5,000.00
      ids.accounts['Savings'] = await seedAccount('Savings', 1_000_000); // $10,000.00

      const groceriesGroup = await seedCategoryGroup('Everyday', ['Groceries', 'Dining']);
      ids.categoryGroups['Everyday'] = groceriesGroup.groupId;
      Object.assign(ids.categories, groceriesGroup.catIds);

      const incomeGroup = await seedCategoryGroup('Income', ['Salary'], { isIncome: true });
      ids.categoryGroups['Income'] = incomeGroup.groupId;
      Object.assign(ids.categories, incomeGroup.catIds);

      ids.payees['Whole Foods'] = await seedPayee('Whole Foods');
      ids.payees['Employer'] = await seedPayee('Employer');

      ids.transactions['grocery-1'] = await seedTxn(
        ids.accounts['Checking'],
        ids.payees['Whole Foods'],
        ids.categories['Groceries'],
        -8_500, // -$85.00
        '2025-01-15',
      );
      ids.transactions['salary-1'] = await seedTxn(
        ids.accounts['Checking'],
        ids.payees['Employer'],
        ids.categories['Salary'],
        300_000, // +$3,000.00
        '2025-01-01',
      );
    });

    // Upload the freshly created local budget to the server so it gets a
    // cloudFileId + groupId. `sync-reset` runs resetSync -> resetSync$1 ->
    // upload(). Routing is confirmed: init's `send` dispatches on the single
    // combined handler map (send$1 -> app.handlers[name]), and sync-reset is
    // registered there (app.method("sync-reset", resetSync)), so this reaches it.
    await lib.send('sync-reset' as never);
    await api.sync();

    // Read the cloudFileId back by budget name (spec §10 / open item 3).
    const budgets = (await api.getBudgets()) as Array<{ name?: string; cloudFileId?: string; id?: string }>;
    const ours = budgets.find((b) => b.name === BUDGET_NAME);
    const syncId = ours?.cloudFileId;
    if (!syncId) {
      throw new Error(
        `Could not resolve cloudFileId for "${BUDGET_NAME}". getBudgets returned: ${JSON.stringify(budgets)}`,
      );
    }

    await api.shutdown();

    const context: E2EContext = { url: server.url, password: server.password, syncId, ids };
    ctx.provide('e2e', context);

    const startedServer = server;
    return async () => {
      await startedServer.stop();
      fs.rmSync(dataDir, { recursive: true, force: true });
    };
  } catch (err) {
    try {
      await api.shutdown();
    } catch {
      /* ignore */
    }
    await server?.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
    throw err;
  }
}

function emptyIds(): E2EContext['ids'] {
  return { accounts: {}, categories: {}, categoryGroups: {}, payees: {}, transactions: {} };
}

// Type the injected value for `inject('e2e')` across the suite.
declare module 'vitest' {
  interface ProvidedContext {
    e2e: E2EContext;
  }
}
```

- [ ] **Step 4: Run the probe to verify it passes**

Run: `npm run build && npx vitest run --config vitest.e2e.config.ts e2e/global-setup.probe.e2e.test.ts`
Expected: PASS (Docker up) or the whole suite skips (Docker down — the probe test would then fail its assertions; if Docker is unavailable locally, rely on CI). If it fails at `sync-reset` or the cloudFileId lookup, add a temporary `console.log(JSON.stringify(budgets))`, confirm the budget name matches and that `sync-reset` is a valid handler key in `node_modules/@actual-app/api/dist/index.js` (`app.method("sync-reset", ...)`), and adjust.

- [ ] **Step 5: If `sync-reset` requires a different call shape, reconcile**

If `lib.send('sync-reset')` throws "unknown handler" or an auth error: verify in `node_modules/@actual-app/api/dist/index.js` that `resetSync` is registered and that `upload()` requires a `user-token` (obtained via the password login that `api.init` performed). Ensure the container was bootstrapped with the *same* password passed to `api.init`. Re-run Step 4 until PASS.

- [ ] **Step 6: Guard tests for Docker-less skip**

Confirm the probe still behaves when `syncId === ''`: it will fail its assertions, which is expected only on Docker-less machines. Real test files (Task 5+) use `describe.skipIf(!inject('e2e').syncId)` so they skip cleanly. No code change here unless Step 4 revealed an issue.

- [ ] **Step 7: Delete the probe test and commit**

```bash
rm e2e/global-setup.probe.e2e.test.ts
git add e2e/global-setup.ts
git commit -m "feat(e2e): boot+seed budget once, upload for cloudFileId, expose context"
```

---

## Task 5: MCP client helper + accounts/transactions tests

**Files:**
- Create: `e2e/helpers/mcp-client.ts`
- Create: `e2e/accounts-transactions.e2e.test.ts`

**Interfaces:**
- Consumes: `E2EContext` (Task 4), the built server at `build/index.js`.
- Produces:
  - `interface CallToolResponse { text: string; isError: boolean; raw: unknown }`
  - `async function createMcpClient(ctx: { url: string; password: string; syncId: string }): Promise<McpClientHandle>`
  - `interface McpClientHandle { callTool(name: string, args?: Record<string, unknown>): Promise<CallToolResponse>; close(): Promise<void> }`
  - `callTool` concatenates all text content items into `text`, sets `isError` from the result's `isError` flag.

- [ ] **Step 1: Implement the MCP client helper**

Create `e2e/helpers/mcp-client.ts`:

```ts
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface CallToolResponse {
  text: string;
  isError: boolean;
  raw: unknown;
}

export interface McpClientHandle {
  callTool: (name: string, args?: Record<string, unknown>) => Promise<CallToolResponse>;
  close: () => Promise<void>;
}

/**
 * Spawns the built MCP server (build/index.js --enable-write) as a stdio child
 * wired to the shared container, and connects an SDK Client over stdio.
 * ACTUAL_SYNC_TTL_MS=0 forces a sync before every tool call so this separate
 * process always sees seeded + mutated data (spec §7.3).
 */
export async function createMcpClient(ctx: {
  url: string;
  password: string;
  syncId: string;
}): Promise<McpClientHandle> {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'actual-e2e-mcp-'));

  const transport = new StdioClientTransport({
    command: 'node',
    args: ['build/index.js', '--enable-write'],
    env: {
      ...process.env,
      ACTUAL_SERVER_URL: ctx.url,
      ACTUAL_PASSWORD: ctx.password,
      ACTUAL_BUDGET_SYNC_ID: ctx.syncId,
      ACTUAL_SYNC_TTL_MS: '0',
      ACTUAL_DATA_DIR: dataDir,
    },
  });

  const client = new Client({ name: 'e2e-client', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);

  return {
    callTool: async (name, args = {}) => {
      const result = (await client.callTool({ name, arguments: args })) as {
        isError?: boolean;
        content?: Array<{ type: string; text?: string }>;
      };
      const text = (result.content ?? [])
        .filter((c) => c.type === 'text')
        .map((c) => c.text ?? '')
        .join('');
      return { text, isError: result.isError === true, raw: result };
    },
    close: async () => {
      await client.close();
      fs.rmSync(dataDir, { recursive: true, force: true });
    },
  };
}
```

- [ ] **Step 2: Write the accounts/transactions tests**

Create `e2e/accounts-transactions.e2e.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, inject } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createMcpClient, type McpClientHandle } from './helpers/mcp-client.js';

const ctx = inject('e2e');

describe.skipIf(!ctx.syncId)('accounts + transactions (e2e)', () => {
  let mcp: McpClientHandle;

  beforeAll(async () => {
    mcp = await createMcpClient(ctx);
  });

  afterAll(async () => {
    await mcp?.close();
  });

  it('get-accounts returns the seeded accounts (happy path, JSON)', async () => {
    const res = await mcp.callTool('get-accounts', {});
    expect(res.isError).toBe(false);
    const accounts = JSON.parse(res.text) as Array<{ id: string; name: string }>;
    const names = accounts.map((a) => a.name);
    expect(names).toContain('Checking');
    expect(names).toContain('Savings');
  });

  it('get-transactions returns seeded transactions (happy path, Markdown)', async () => {
    const res = await mcp.callTool('get-transactions', {
      accountId: ctx.ids.accounts['Checking'],
      startDate: '2025-01-01',
      endDate: '2025-01-31',
    });
    expect(res.isError).toBe(false);
    expect(res.text).toContain('Whole Foods');
  });

  it('get-transactions with a missing accountId returns isError (failure path)', async () => {
    const res = await mcp.callTool('get-transactions', {});
    expect(res.isError).toBe(true);
    expect(res.text).toContain('accountId is required');
  });

  it('create-transaction persists and is visible via get-transactions (mutation + persistence)', async () => {
    const token = `E2E ${randomUUID()}`;
    const create = await mcp.callTool('create-transaction', {
      accountId: ctx.ids.accounts['Checking'],
      amount: -1234, // tool contract: amount in cents
      date: '2025-02-10',
      payee_name: token,
      notes: token,
    });
    expect(create.isError).toBe(false);

    const read = await mcp.callTool('get-transactions', {
      accountId: ctx.ids.accounts['Checking'],
      startDate: '2025-02-01',
      endDate: '2025-02-28',
    });
    expect(read.isError).toBe(false);
    expect(read.text).toContain(token);
  });
});
```

- [ ] **Step 3: Verify create-transaction's real argument contract before running**

Read `src/tools/create-transaction/index.ts` and `src/tools/create-transaction/input-parser.ts`. Confirm the exact argument names (`accountId`, `amount`, `date`, `payee_name`/`payeeId`, `notes`) and the amount unit (cents vs dollars). Adjust the `create-transaction` call args in Step 2 to match the real schema. Do the same for `get-transactions` output (Markdown) — confirm the seeded payee name appears in the report.

- [ ] **Step 4: Run the tests — this is the write-propagation gating experiment**

Run: `npm run build && npx vitest run --config vitest.e2e.config.ts e2e/accounts-transactions.e2e.test.ts`
Expected: PASS (Docker up) or SKIPPED (Docker down). The `create-transaction` → `get-transactions` persistence test is the **load-bearing experiment** for the whole gate: it proves a mutation issued through one `callTool` (which ends in `api.shutdown()` → awaited `fullSync`) is visible to the next `callTool`'s fresh `downloadBudget`.

- If the persistence test **fails or is flaky** (created token not found on re-read): the mutation is not reaching the server before the next download. Remedy: add `NODE_ENV: 'test'` to the child `env` in `e2e/helpers/mcp-client.ts` (forces immediate synchronous `fullSync` in the server per `@actual-app/api/dist` line ~62202 `scheduleFullSync`), rebuild, and re-run. If still flaky, add a bounded retry/poll around the re-read (re-call `get-transactions` up to 3× with a short delay) and document why.
- If the happy-path JSON parse fails, print `res.text` and confirm `get-accounts` returns JSON via `successWithJson`.
- If the failure-path message differs, update the substring to match `src/tools/get-transactions/input-parser.ts` (`'accountId is required and must be a string'`).

- [ ] **Step 5: Commit**

```bash
git add e2e/helpers/mcp-client.ts e2e/accounts-transactions.e2e.test.ts
git commit -m "feat(e2e): add MCP stdio client helper and accounts/transactions tests"
```

---

## Task 6: Categories tests

**Files:**
- Create: `e2e/categories.e2e.test.ts`

**Interfaces:**
- Consumes: `E2EContext` (Task 4), `createMcpClient` (Task 5).

- [ ] **Step 1: Verify the category tool argument contracts**

Read `src/tools/categories/create-category/index.ts` (+ its `input-parser.ts`), `update-category`, `delete-category`, `create-category-group`, `delete-category-group`, and `get-grouped-categories`. Note the exact arg names (e.g. `name`, `group_id`/`groupId`, `id`) and each tool's output shape (JSON vs Markdown) and error message. Use these exact names in Step 2.

- [ ] **Step 2: Write the categories tests**

Create `e2e/categories.e2e.test.ts` (replace `<...>` arg names with the ones confirmed in Step 1 — do not leave placeholders in the committed file):

```ts
import { describe, it, expect, beforeAll, afterAll, inject } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createMcpClient, type McpClientHandle } from './helpers/mcp-client.js';

const ctx = inject('e2e');

describe.skipIf(!ctx.syncId)('categories (e2e)', () => {
  let mcp: McpClientHandle;

  beforeAll(async () => {
    mcp = await createMcpClient(ctx);
  });

  afterAll(async () => {
    await mcp?.close();
  });

  it('get-grouped-categories returns the seeded groups (happy path)', async () => {
    const res = await mcp.callTool('get-grouped-categories', {});
    expect(res.isError).toBe(false);
    expect(res.text).toContain('Groceries');
    expect(res.text).toContain('Everyday');
  });

  it('create-category persists and is visible via get-grouped-categories (mutation + persistence)', async () => {
    const token = `E2E ${randomUUID()}`;
    const create = await mcp.callTool('create-category', {
      name: token,
      group_id: ctx.ids.categoryGroups['Everyday'],
    });
    expect(create.isError).toBe(false);

    const read = await mcp.callTool('get-grouped-categories', {});
    expect(read.isError).toBe(false);
    expect(read.text).toContain(token);
  });

  it('delete-category with a bogus id returns isError (failure path)', async () => {
    const res = await mcp.callTool('delete-category', { id: 'does-not-exist-00000000' });
    expect(res.isError).toBe(true);
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `npm run build && npx vitest run --config vitest.e2e.config.ts e2e/categories.e2e.test.ts`
Expected: PASS or SKIPPED. If the delete-of-bogus-id does NOT return `isError` (the underlying api may treat it as a no-op), change the failure assertion to a malformed-args case (e.g. `create-category` with no `name`) and match the real error message from the tool's input-parser.

- [ ] **Step 4: Commit**

```bash
git add e2e/categories.e2e.test.ts
git commit -m "test(e2e): add categories tool coverage"
```

---

## Task 7: Payees tests

**Files:**
- Create: `e2e/payees.e2e.test.ts`

**Interfaces:**
- Consumes: `E2EContext` (Task 4), `createMcpClient` (Task 5).

- [ ] **Step 1: Verify the payee tool argument contracts**

Read `src/tools/payees/get-payees/index.ts`, `create-payee`, `update-payee`, `delete-payee` (+ their `input-parser.ts`). Confirm arg names (`name`, `id`), output shapes, and error messages.

- [ ] **Step 2: Write the payees tests**

Create `e2e/payees.e2e.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, inject } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createMcpClient, type McpClientHandle } from './helpers/mcp-client.js';

const ctx = inject('e2e');

describe.skipIf(!ctx.syncId)('payees (e2e)', () => {
  let mcp: McpClientHandle;

  beforeAll(async () => {
    mcp = await createMcpClient(ctx);
  });

  afterAll(async () => {
    await mcp?.close();
  });

  it('get-payees returns the seeded payees (happy path)', async () => {
    const res = await mcp.callTool('get-payees', {});
    expect(res.isError).toBe(false);
    expect(res.text).toContain('Whole Foods');
  });

  it('create-payee persists and is visible via get-payees (mutation + persistence)', async () => {
    const token = `E2E ${randomUUID()}`;
    const create = await mcp.callTool('create-payee', { name: token });
    expect(create.isError).toBe(false);

    const read = await mcp.callTool('get-payees', {});
    expect(read.isError).toBe(false);
    expect(read.text).toContain(token);
  });

  it('update-payee with a missing id returns isError (failure path)', async () => {
    const res = await mcp.callTool('update-payee', { name: 'no-id-supplied' });
    expect(res.isError).toBe(true);
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `npm run build && npx vitest run --config vitest.e2e.config.ts e2e/payees.e2e.test.ts`
Expected: PASS or SKIPPED. Adjust the failure case per the real `update-payee` input-parser if needed.

- [ ] **Step 4: Commit**

```bash
git add e2e/payees.e2e.test.ts
git commit -m "test(e2e): add payees tool coverage"
```

---

## Task 8: Rules tests

**Files:**
- Create: `e2e/rules.e2e.test.ts`

**Interfaces:**
- Consumes: `E2EContext` (Task 4), `createMcpClient` (Task 5).

- [ ] **Step 1: Verify the rule tool argument contracts**

Read `src/tools/rules/get-rules/index.ts`, `create-rule`, `update-rule`, `delete-rule` (+ their `input-parser.ts`). A rule's create payload is complex (`stage`, `conditionsOp`, `conditions[]`, `actions[]`); capture the exact required shape. Cross-check with `RuleEntity` in `@actual-app/core/types/models` if needed. A valid create needs a real payee/category id — use `ctx.ids`.

- [ ] **Step 2: Write the rules tests**

Create `e2e/rules.e2e.test.ts` (fill the `create-rule` payload with the exact shape confirmed in Step 1 — the payload below is the expected structure; verify field names against the input-parser before committing):

```ts
import { describe, it, expect, beforeAll, afterAll, inject } from 'vitest';
import { createMcpClient, type McpClientHandle } from './helpers/mcp-client.js';

const ctx = inject('e2e');

describe.skipIf(!ctx.syncId)('rules (e2e)', () => {
  let mcp: McpClientHandle;

  beforeAll(async () => {
    mcp = await createMcpClient(ctx);
  });

  afterAll(async () => {
    await mcp?.close();
  });

  it('get-rules returns without error (happy path)', async () => {
    const res = await mcp.callTool('get-rules', {});
    expect(res.isError).toBe(false);
  });

  it('create-rule persists and is visible via get-rules (mutation + persistence)', async () => {
    const create = await mcp.callTool('create-rule', {
      stage: 'default',
      conditionsOp: 'and',
      conditions: [{ field: 'payee', op: 'is', value: ctx.ids.payees['Whole Foods'] }],
      actions: [{ field: 'category', op: 'set', value: ctx.ids.categories['Groceries'] }],
    });
    expect(create.isError).toBe(false);

    const read = await mcp.callTool('get-rules', {});
    expect(read.isError).toBe(false);
    // The created rule references the Groceries category id.
    expect(read.text).toContain(ctx.ids.categories['Groceries']);
  });

  it('delete-rule with a missing id returns isError (failure path)', async () => {
    const res = await mcp.callTool('delete-rule', {});
    expect(res.isError).toBe(true);
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `npm run build && npx vitest run --config vitest.e2e.config.ts e2e/rules.e2e.test.ts`
Expected: PASS or SKIPPED. If `create-rule` fails validation, correct the payload to the exact structure the input-parser and `@actual-app/api` `createRule` require (verify `op`/`field` enums), and re-run. If `delete-rule` with no id is validated differently, match the real error path.

- [ ] **Step 4: Commit**

```bash
git add e2e/rules.e2e.test.ts
git commit -m "test(e2e): add rules tool coverage"
```

---

## Task 9: Imports + report tools tests

**Files:**
- Create: `e2e/imports.e2e.test.ts`

**Interfaces:**
- Consumes: `E2EContext` (Task 4), `createMcpClient` (Task 5).

- [ ] **Step 1: Verify the import/report tool argument contracts**

Read `src/tools/import-transactions/index.ts` (+ `input-parser.ts`), `src/tools/run-bank-sync/index.ts`, `src/tools/spending-by-category/index.ts`, `src/tools/monthly-summary/index.ts`, `src/tools/balance-history/index.ts`. Confirm arg names (`accountId`, `transactions[]` shape with `imported_id`/`date`/`amount`/`payee_name`, date-range args) and output shapes. `run-bank-sync` against a budget with no linked bank accounts should succeed as a no-op or return a clear result — confirm which.

- [ ] **Step 2: Write the imports + report tests**

Create `e2e/imports.e2e.test.ts` (use the exact `import-transactions` payload shape confirmed in Step 1):

```ts
import { describe, it, expect, beforeAll, afterAll, inject } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createMcpClient, type McpClientHandle } from './helpers/mcp-client.js';

const ctx = inject('e2e');

describe.skipIf(!ctx.syncId)('imports + reports (e2e)', () => {
  let mcp: McpClientHandle;

  beforeAll(async () => {
    mcp = await createMcpClient(ctx);
  });

  afterAll(async () => {
    await mcp?.close();
  });

  it('import-transactions adds a transaction that persists (mutation + persistence)', async () => {
    const token = `E2E ${randomUUID()}`;
    const importRes = await mcp.callTool('import-transactions', {
      accountId: ctx.ids.accounts['Savings'],
      transactions: [
        {
          imported_id: token,
          date: '2025-03-05',
          amount: -4200,
          payee_name: token,
        },
      ],
    });
    expect(importRes.isError).toBe(false);

    const read = await mcp.callTool('get-transactions', {
      accountId: ctx.ids.accounts['Savings'],
      startDate: '2025-03-01',
      endDate: '2025-03-31',
    });
    expect(read.isError).toBe(false);
    expect(read.text).toContain(token);
  });

  it('import-transactions with a missing accountId returns isError (failure path)', async () => {
    const res = await mcp.callTool('import-transactions', { transactions: [] });
    expect(res.isError).toBe(true);
  });

  it('run-bank-sync succeeds with no linked accounts (happy path / no-op)', async () => {
    const res = await mcp.callTool('run-bank-sync', {});
    expect(res.isError).toBe(false);
  });

  it('spending-by-category returns a report (happy path)', async () => {
    const res = await mcp.callTool('spending-by-category', {
      startDate: '2025-01-01',
      endDate: '2025-01-31',
    });
    expect(res.isError).toBe(false);
    expect(res.text).toContain('Groceries');
  });

  it('monthly-summary returns a report (happy path)', async () => {
    const res = await mcp.callTool('monthly-summary', { months: 3 });
    expect(res.isError).toBe(false);
  });

  it('balance-history returns a report for the Checking account (happy path)', async () => {
    const res = await mcp.callTool('balance-history', { accountId: ctx.ids.accounts['Checking'] });
    expect(res.isError).toBe(false);
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `npm run build && npx vitest run --config vitest.e2e.config.ts e2e/imports.e2e.test.ts`
Expected: PASS or SKIPPED. Correct any arg names / report substrings that differ from the real tool schemas found in Step 1. If `run-bank-sync` returns `isError` when no accounts are linked, change the assertion to match the tool's documented behavior (it may report an informational message rather than an error).

- [ ] **Step 4: Run the whole e2e suite once, end to end**

Run: `npm run build && npm run test:e2e`
Expected: all e2e files pass in one run (single container boot + seed shared across files, `fileParallelism: false`). If total wall-clock exceeds the CI `timeout-minutes: 20`, reduce redundant `callTool` round-trips or raise the job timeout in Task 10.

- [ ] **Step 5: Commit**

```bash
git add e2e/imports.e2e.test.ts
git commit -m "test(e2e): add imports and report tool coverage"
```

---

## Task 10: CI gate job

**Files:**
- Modify: `.github/workflows/pr-validation.yml`

**Interfaces:**
- Consumes: `npm run build`, `npm run test:e2e` (Tasks 1–9).

- [ ] **Step 1: Inspect the existing workflow**

Read `.github/workflows/pr-validation.yml`. Confirm the current `on:` trigger and existing job names/structure so the new job matches the file's conventions (checkout/setup-node action versions, Node version). Note whether `labeled` is already in `on.pull_request.types`.

- [ ] **Step 2: Ensure the `labeled` trigger is present**

In `.github/workflows/pr-validation.yml`, ensure `on.pull_request.types` includes `labeled` (so adding the `run-e2e` label re-triggers an open PR). If the file currently has no explicit `types`, add:

```yaml
on:
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened, labeled]
```

Preserve any existing branch filters and other trigger config.

- [ ] **Step 3: Add the `e2e-test` job**

Append this job under `jobs:` in `.github/workflows/pr-validation.yml` (do not alter existing jobs):

```yaml
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

- [ ] **Step 4: Validate the workflow YAML**

Run: `npx --yes js-yaml .github/workflows/pr-validation.yml > /dev/null && echo "YAML OK"`
Expected: `YAML OK` (no parse error). If `js-yaml` is unavailable, run `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/pr-validation.yml')); print('YAML OK')"`.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/pr-validation.yml
git commit -m "ci(e2e): gate e2e validation on release-please PRs and run-e2e label"
```

- [ ] **Step 6: Update README**

Add a short "E2E validation gate" subsection to `README.md` documenting: what the gate does, that it needs Docker, that it runs only on release-please PRs or with the `run-e2e` label, and how to run it locally (`npm run build && npm run test:e2e`, requires Docker). Commit:

```bash
git add README.md
git commit -m "docs: document the e2e validation gate"
```

---

## Self-Review

**1. Spec coverage:**

| Spec section | Task(s) |
| --- | --- |
| §3 CI trigger (release-please / `run-e2e` label, `labeled` type, `e2e-test` job) | Task 10 |
| §4 architecture (one container, one budget, globalSetup) | Tasks 2, 4 |
| §5 seed layer (plain typed helpers, `runImport`, cloudFileId capture, name→id map, `ACTUAL_SYNC_TTL_MS=0`) | Tasks 3, 4, 5 |
| §6 test files grouped by family + isolation-by-naming (unique token) | Tasks 5–9 |
| §7.1 testcontainers wrapper, pinned tag, health wait, Docker-skip | Task 2 |
| §7.2 password bootstrap | Task 2 |
| §7.3 mcp-client (spawn `build/index.js --enable-write`, env, SDK Client, `callTool`) | Task 5 |
| §8 coverage per tool (happy / persistence / failure) | Tasks 5–9 |
| §9 runner config (separate config, globalSetup, long timeouts) | Task 1 |
| §10 file layout | all tasks (budgets file intentionally omitted — see Global Constraints) |
| §11 new deps (`testcontainers`, existing SDK) | Task 1 |
| §12 open items (image tag, bootstrap, cloudFileId readback, shared-vs-per-file client) | Resolved: tag = `E2E_SERVER_IMAGE` (Task 2); bootstrap `POST /account/bootstrap {password}` (Task 2); cloudFileId via `getBudgets()` by name after `sync-reset` (Task 4); **per-file client** via `beforeAll`/`afterAll` (Task 5). Also verified from source: `send('sync-reset')` routes via the single combined handler map (Task 4); write propagation is guaranteed by `api.shutdown()`'s awaited `fullSync` run in `tools/index.ts`'s per-call `finally` (Global Constraints + Task 5 Step 4 gating experiment). |
| §13 good practices | Realized across Tasks 5–9 (real transport, real backend, code-defined seed, persistence asserts, error contract, off hot path) |

No spec requirement is left without a task. The `budgets.e2e.test.ts` file is deliberately dropped (no budget tools exist yet — Global Constraints).

**2. Placeholder scan:** The test files in Tasks 6–9 instruct the implementer to confirm exact tool argument names from the real `input-parser.ts` files in a preceding step, then fill them into concrete, runnable code (no `TODO`/`TBD` left in committed files). The `create-rule`/`import-transactions` payloads are given as concrete expected structures to verify-and-adjust, not as "handle appropriately" placeholders. Image tag is a single concrete constant with a stated fallback rule.

**3. Type consistency:** `E2EContext` (Task 4) is the shared shape consumed by `createMcpClient` (Task 5) and every test via `inject('e2e')`; `ids` sub-keys (`accounts`, `categories`, `categoryGroups`, `payees`, `transactions`) are populated in Task 4 and read by the same names in Tasks 5–9. `createMcpClient` returns `McpClientHandle` with `callTool`/`close`, used identically in every test file. `CallToolResponse` fields (`text`, `isError`, `raw`) are asserted consistently. `startActualServer` returns `{ url, password, stop }`, consumed by Task 4.
