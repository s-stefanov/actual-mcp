# Rebuild PR #163 (Budget Endpoints) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the still-relevant subset of PR #163 (six budget MCP tools + two error-handling fixes) onto current `main` and update the fork PR in place so it becomes mergeable, preserving `kidpollo`'s authorship.

**Architecture:** Cut a fresh branch from `origin/main`, copy the 12 budget tool files verbatim from the fork branch, hand-port four merge-in files (`actual-api.ts`, `tools/index.ts`, `utils/response.ts`, `resources.ts`), run the full verify gate, commit as `kidpollo`, and force-push over `kidpollo:feat/budget-endpoints`. The obsolete ~80% of the original PR (dependency downgrade, type stubs, tsconfig paths, duplicate process guard, import churn) is dropped.

**Tech Stack:** TypeScript (ESM), `@actual-app/api` 26.8.1, zod 4.4.3, Vitest, `@modelcontextprotocol/sdk`.

## Global Constraints

- Target branch is a clean cut of `origin/main` — do NOT carry any commit from `fork/feat/budget-endpoints`; cherry-pick files only.
- `@actual-app/api` and `@actual-app/core` stay at **26.8.1** — never touch `package.json` / `package-lock.json`.
- Do NOT create `src/stubs/`, do NOT add `tsconfig.json` `paths`, do NOT modify `src/index.ts` (the `unhandledRejection` guard is already there via #204).
- All imports use `.js` extensions (ESM) and relative paths, matching existing tools.
- Budget tool files are copied **verbatim** from `fork/feat/budget-endpoints` — do not hand-retype them.
- The final commit MUST be authored `Francisco Viramontes <kidpollo@gmail.com>` with a `Co-Authored-By: Claude <noreply@anthropic.com>` trailer.
- Recovery point: `fork/feat/budget-endpoints` (SHAs `ceba00c`, `89bb762`) is fetched locally; do not delete this ref until the PR is confirmed mergeable.

---

### Task 1: Branch setup + copy budget tool files verbatim

**Files:**
- Create (via checkout from fork): `src/tools/budgets/get-budget-months/index.ts` + `index.test.ts`
- Create: `src/tools/budgets/get-budget-month/index.ts` + `index.test.ts`
- Create: `src/tools/budgets/set-budget-amount/index.ts` + `index.test.ts`
- Create: `src/tools/budgets/set-budget-carryover/index.ts` + `index.test.ts`
- Create: `src/tools/budgets/hold-budget-for-next-month/index.ts` + `index.test.ts`
- Create: `src/tools/budgets/reset-budget-hold/index.ts` + `index.test.ts`

**Interfaces:**
- Produces: six tool modules, each exporting `schema` (with `.name` = the tool name) and `handler()`. Each `handler` imports its wrapper from `../../../actual-api.js` (`getBudgetMonths`, `getBudgetMonth`, `setBudgetAmount`, `setBudgetCarryover`, `holdBudgetForNextMonth`, `resetBudgetHold`) and uses `successWithJson` / `errorFromCatch` from `../../../utils/response.js`. These wrappers do not yet exist on the branch (added in Task 2), so tests will pass via `vi.mock('../../../actual-api.js', ...)` but a build will fail until Task 2.

- [ ] **Step 1: Confirm the fork ref is present**

Run: `git rev-parse --short fork/feat/budget-endpoints`
Expected: prints `89bb762` (or the tip SHA). If it errors, run `git fetch fork feat/budget-endpoints` first (remote `fork` = `https://github.com/kidpollo/actual-mcp.git`).

- [ ] **Step 2: Create the rebuild branch from clean main**

```bash
git fetch origin
git checkout -b rebuild-163 origin/main
```

- [ ] **Step 3: Copy the budget tool directory verbatim from the fork branch**

```bash
git checkout fork/feat/budget-endpoints -- src/tools/budgets
```

- [ ] **Step 4: Verify exactly 12 files landed and nothing else did**

Run: `git status --porcelain src/tools/budgets && ls src/tools/budgets/*/`
Expected: 12 new files staged (6 dirs × `index.ts` + `index.test.ts`). No files outside `src/tools/budgets/`.

- [ ] **Step 5: Run the budget tests (they mock actual-api, so they pass now)**

Run: `npx vitest run src/tools/budgets`
Expected: PASS — 38 tests green (the handlers' `actual-api.js` import is mocked, so the missing wrappers don't matter yet).

- [ ] **Step 6: Commit the verbatim tool files**

```bash
git add src/tools/budgets
git commit -m "feat: add budget tool modules (get/set budget months, amounts, carryover, holds)

Six MCP tools wrapping the Actual Budget budget API, copied from the
original #163 work by kidpollo and rebuilt onto current main.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Port the budget API wrappers into `actual-api.ts`

**Files:**
- Modify: `src/actual-api.ts` (append a `BUDGETS` section at end of file)

**Interfaces:**
- Consumes: existing `initActualApi()` and the module-level `api` (`import * as api from '@actual-app/api'`) already in `src/actual-api.ts`.
- Produces: six exported async wrappers consumed by Task 1's tools:
  - `getBudgetMonths(): Promise<string[]>`
  - `getBudgetMonth(month: string): Promise<unknown>`
  - `setBudgetAmount(month: string, categoryId: string, value: number): Promise<void>`
  - `setBudgetCarryover(month: string, categoryId: string, flag: boolean): Promise<void>`
  - `holdBudgetForNextMonth(month: string, value: number): Promise<boolean>`
  - `resetBudgetHold(month: string): Promise<void>`

- [ ] **Step 1: Append the BUDGETS section to the end of `src/actual-api.ts`**

Add exactly this block at the end of the file (do NOT touch the imports at the top of the file — main already uses `@actual-app/core/*`; do NOT change the `deleteCategory` signature):

```typescript

// ----------------------------
// BUDGETS
// ----------------------------

/**
 * Get all budget months (ensures API is initialized)
 */
export async function getBudgetMonths(): Promise<string[]> {
  await initActualApi();
  return api.getBudgetMonths();
}

/**
 * Get budget data for a specific month (ensures API is initialized)
 *
 * @param month - Month in YYYY-MM format
 */
export async function getBudgetMonth(month: string): Promise<unknown> {
  await initActualApi();
  return api.getBudgetMonth(month);
}

/**
 * Set the budgeted amount for a category in a given month (ensures API is initialized)
 *
 * @param month - Month in YYYY-MM format
 * @param categoryId - ID of the category
 * @param value - Amount in integer cents (e.g. 12030 = $120.30)
 */
export async function setBudgetAmount(month: string, categoryId: string, value: number): Promise<void> {
  await initActualApi();
  return api.setBudgetAmount(month, categoryId, value);
}

/**
 * Enable or disable carryover for a category in a given month (ensures API is initialized)
 *
 * @param month - Month in YYYY-MM format
 * @param categoryId - ID of the category
 * @param flag - true to enable carryover, false to disable
 */
export async function setBudgetCarryover(month: string, categoryId: string, flag: boolean): Promise<void> {
  await initActualApi();
  return api.setBudgetCarryover(month, categoryId, flag);
}

/**
 * Hold budget funds for the next month (ensures API is initialized)
 *
 * @param month - Month in YYYY-MM format
 * @param value - Amount in integer cents to hold
 */
export async function holdBudgetForNextMonth(month: string, value: number): Promise<boolean> {
  await initActualApi();
  return api.holdBudgetForNextMonth(month, value);
}

/**
 * Reset any held budget amounts for a month (ensures API is initialized)
 *
 * @param month - Month in YYYY-MM format
 */
export async function resetBudgetHold(month: string): Promise<void> {
  await initActualApi();
  return api.resetBudgetHold(month);
}
```

- [ ] **Step 2: Type-check to confirm the wrappers match the 26.8.1 API surface**

Run: `npm run type-check`
Expected: PASS, no errors. (If `api.getBudgetMonths` etc. are not found on the type, stop — the 26.8.1 API differs and the wrapper signatures need reconciling before proceeding.)

- [ ] **Step 3: Commit**

```bash
git add src/actual-api.ts
git commit -m "feat: add budget API wrappers to actual-api

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Register the six tools in `src/tools/index.ts`

**Files:**
- Modify: `src/tools/index.ts`

**Interfaces:**
- Consumes: the six tool modules from Task 1 (each exports `schema` + `handler`).
- Produces: the tools wired into `readTools` (2) and `writeTools` (4) so `setupTools(server, enableWrite)` registers them.

- [ ] **Step 1: Add the six imports after the existing tool imports**

Add near the other `import * as ...` lines (after the `update-transaction` import, matching the PR):

```typescript
import * as getBudgetMonths from './budgets/get-budget-months/index.js';
import * as getBudgetMonth from './budgets/get-budget-month/index.js';
import * as setBudgetAmount from './budgets/set-budget-amount/index.js';
import * as setBudgetCarryover from './budgets/set-budget-carryover/index.js';
import * as holdBudgetForNextMonth from './budgets/hold-budget-for-next-month/index.js';
import * as resetBudgetHold from './budgets/reset-budget-hold/index.js';
```

- [ ] **Step 2: Add the two read tools to the `readTools` array**

Append these entries inside the `readTools` array literal:

```typescript
  getBudgetMonths,
  getBudgetMonth,
```

- [ ] **Step 3: Add the four write tools to the `writeTools` array**

Append these entries inside the `writeTools` array literal:

```typescript
  setBudgetAmount,
  setBudgetCarryover,
  holdBudgetForNextMonth,
  resetBudgetHold,
```

- [ ] **Step 4: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/index.ts
git commit -m "feat: register budget tools in tool registry

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Port the `errorFromCatch` and `resources.ts` error-handling fixes

**Files:**
- Modify: `src/utils/response.ts` (the `errorFromCatch` function)
- Modify: `src/resources.ts` (the ListResources handler's catch block)

**Interfaces:**
- Consumes / Produces: `errorFromCatch(err: unknown): CallToolResult` — signature unchanged; only its body changes to extract `.message` from structured `{ type, message }` API errors. `resources.ts` ListResources handler returns `{ resources: [] }` on error instead of re-throwing.

- [ ] **Step 1: Replace the message-extraction line in `errorFromCatch`**

In `src/utils/response.ts`, find the current line inside `errorFromCatch`:

```typescript
  const message = err instanceof Error ? err.message : String(err);
```

Replace it with:

```typescript
  let message: string;
  if (err instanceof Error) {
    message = err.message;
  } else if (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as Record<string, unknown>).message === 'string'
  ) {
    // Reason: @actual-app/api throws structured objects like { type: 'APIError', message: '...' }
    // rather than Error instances. Extract the message field so errors are human-readable.
    message = (err as Record<string, unknown>).message as string;
  } else {
    message = String(err);
  }
```

- [ ] **Step 2: Make the ListResources handler degrade gracefully in `src/resources.ts`**

In `src/resources.ts`, in the ListResources handler's `catch (error)` block (the one around line 31-33, immediately before its `finally`), find:

```typescript
      console.error('Error listing resources:', error);
      throw error;
```

Replace with:

```typescript
      // Reason: re-throwing a non-Error APIError object causes an unhandled rejection crash in Node ≥15.
      // Return an empty list so the MCP server stays alive when the budget isn't loaded yet.
      console.error('Error listing resources:', error);
      return { resources: [] };
```

Note: only change the **ListResources** handler (the one returning `{ resources: [...] }`). Do NOT change the ReadResource handler's `throw error` later in the file — that one must still propagate.

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 4: Run the response util tests (and any resources tests)**

Run: `npx vitest run src/utils/response src/resources`
Expected: PASS (or "no test files" for resources — that is acceptable; the type-check in Step 3 covers it).

- [ ] **Step 5: Commit**

```bash
git add src/utils/response.ts src/resources.ts
git commit -m "fix: surface structured API error messages and degrade resource listing gracefully

errorFromCatch now extracts .message from { type, message } API errors
instead of serialising them as [object Object]; ListResources returns an
empty list instead of re-throwing a non-Error object.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Full verify gate

**Files:** none (verification only)

**Interfaces:** none.

- [ ] **Step 1: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 2: Full test suite**

Run: `npm run test`
Expected: PASS. Confirm the 38 budget tests under `src/tools/budgets/**` are included and green. (Two pre-existing failures in `transaction-aggregator.test.ts` were noted historically — if they still fail, confirm they are unrelated to this change by checking they also fail on `origin/main`; do not fix them here.)

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: PASS, TypeScript compiles.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: PASS, no errors.

- [ ] **Step 5: STOP for reviewer checkpoint**

Do not push until a human confirms the gate is green. This is the last step before an outward-facing, history-rewriting push to someone else's fork.

---

### Task 6: Reauthor as kidpollo and force-push to update PR #163

**Files:** none (git history + remote operation)

**Interfaces:** none.

- [ ] **Step 1: Squash the task commits into one, authored as kidpollo**

Collapse the Task 1–4 commits into a single commit authored by the original PR author:

```bash
git reset --soft origin/main
git commit \
  --author="Francisco Viramontes <kidpollo@gmail.com>" \
  -m "feat: add budget endpoints (getBudgetMonths, getBudgetMonth, setBudgetAmount, setBudgetCarryover, holdBudgetForNextMonth, resetBudgetHold)

Exposes the six Actual Budget budget API functions as MCP tools (2 read,
4 write) with zod validation and 38 unit tests. Also fixes two pre-existing
error-handling bugs surfaced during integration: errorFromCatch now extracts
.message from structured API errors, and ListResources degrades to an empty
list instead of re-throwing.

Rebuilt onto @actual-app/api 26.8.1; the obsolete 26.4.0 bump, type stubs,
tsconfig paths, and duplicate unhandledRejection guard from the original
branch are dropped. Independently verified against a live server by ryanmac8.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

- [ ] **Step 2: Confirm authorship and file set**

Run: `git log -1 --format='%an <%ae>%n%b' && git diff --stat origin/main`
Expected: author line is `Francisco Viramontes <kidpollo@gmail.com>`; the diff stat lists only the 12 budget files, `src/actual-api.ts`, `src/tools/index.ts`, `src/utils/response.ts`, `src/resources.ts` — nothing else (no `package.json`, `tsconfig.json`, `src/index.ts`, `src/stubs/`).

- [ ] **Step 3: Force-push to the fork branch**

```bash
git push --force fork rebuild-163:feat/budget-endpoints
```

If this fails with a permission error, STOP — do not improvise. Fall back to the alternate path: push `rebuild-163` to `origin` and open a new PR (`gh pr create`) whose body says `Closes #163` and credits kidpollo, then close #163 with a credit comment.

- [ ] **Step 4: Confirm PR #163 is now mergeable**

Run: `gh pr view 163 --json mergeable,mergeStateStatus,files`
Expected: `mergeable` is `MERGEABLE` (no longer `CONFLICTING`) and `files` lists only the keeper set.

- [ ] **Step 5: Post a summary comment on the PR**

```bash
gh pr comment 163 --body "Rebuilt this branch onto current \`main\` (@actual-app/api 26.8.1). Kept the six budget tools + their 38 tests, plus the \`errorFromCatch\` and ListResources error-handling fixes. Dropped the now-obsolete parts (the 26.4.0 bump, \`src/stubs/actual-core.d.ts\` + tsconfig \`paths\`, and the duplicate \`unhandledRejection\` guard already on main via #204). Thanks @ryanmac8 for the independent live verification — that made this straightforward."
```

- [ ] **Step 6: Report final state**

Summarize to the user: PR #163 status, CI check status once it runs (`gh pr checks 163`), and that the local `fork/feat/budget-endpoints` recovery ref is still intact.

---

## Self-Review

**Spec coverage:**
- Six budget tools → Task 1 (files) + Task 3 (registration). ✅
- `actual-api.ts` wrappers → Task 2. ✅
- `errorFromCatch` fix → Task 4 Step 1. ✅
- `resources.ts` graceful degradation → Task 4 Step 2. ✅
- Drop obsolete files → enforced by Global Constraints + Task 6 Step 2 diff check. ✅
- Verbatim copy of tool files → Task 1 Step 3. ✅
- Verify gate (type-check/test/build/lint) → Task 5. ✅
- Author as kidpollo + Co-Authored-By → Task 6 Step 1. ✅
- Force-push updates #163 in place → Task 6 Step 3-4. ✅
- Force-push-rejected fallback → Task 6 Step 3. ✅
- Recovery point preserved → Global Constraints + Task 6 Step 6. ✅

**Placeholder scan:** No TBD/TODO/vague steps; all code blocks are concrete. ✅

**Type consistency:** Wrapper signatures in Task 2 match the imports named in Task 1's Interfaces block and the registrations in Task 3. `errorFromCatch(err: unknown): CallToolResult` unchanged in Task 4. ✅
