# Phase B: connection lifecycle ownership and report correctness

Date: 2026-09-05. Status: approved design, not implemented.
Source: [repository overview](../../repository-overview.md), sections 3 (P0 findings) and 8 (Phase B). Baseline commit `97b6e22`.

## Goal

Make the Actual connection safe under concurrent MCP calls and make the financial reports arithmetically and semantically correct. This is the recommended first implementation slice of the modernization roadmap.

## Decisions taken during brainstorming

- **Deployment target:** both stdio and long-lived HTTP matter. Design for the concurrent HTTP case; stdio uses the same path.
- **Compatibility:** report fixes land as corrected behavior directly — no flags, no opt-in parameters. Changes are documented in README/CHANGELOG and released with a version bump.
- **Fix scope:** the six table findings from the overview plus the cheap adjacent cases (account-ID keying, explicit balance cutoff, zero-activity months). Transfer/split counting policy is deferred beyond the existing skip rule.
- **Classification:** derived from Actual's data model only. Income = category in an `is_income` group. No savings/investment configuration; the heuristic savings/investment bucket is removed.
- **Architecture:** Approach 2 — an `ActualConnection` owner class behind the existing `actual-api.ts` facade. Not a minimal in-place patch, not the full target architecture.

## Part 1: connection lifecycle ownership

### Problem (observed at baseline)

- `src/tools/index.ts` shuts down the global Actual API in `finally` after **every** tool call; `src/resources.ts` does the same after resource listing but not after resource reads.
- `src/actual-api.ts` guards initialization with shared booleans and a 100 ms polling loop; `initializationError` is sticky — after a failed attempt followed by a successful retry, a waiter can still observe the stale error.
- Consequence: overlapping calls can close each other's connection; sequential calls re-initialize and re-download repeatedly, defeating the sync TTL.

### Design

New module `src/integrations/actual/connection.ts` exporting an `ActualConnection` class and a process-wide instance accessor (`getActualConnection()`). It is the **only** code allowed to call `api.init`, `api.downloadBudget`, `api.sync`, and `api.shutdown`.

States: `idle → initializing → ready → closing → closed`, plus `failed` (retryable back to `initializing`).

| Member | Behavior |
| --- | --- |
| `ensureReady()` | Returns the shared in-flight init promise when one exists; otherwise starts initialization. A failed attempt rejects only the callers awaiting that attempt; the next call starts a fresh attempt. No polling. Init logic (data dir, server URL/password, budget selection, encryption password) is carried over from the current `initActualApi` unchanged. |
| sync-if-stale | Same policy as today: `ACTUAL_SYNC_TTL_MS` (default 60 000 ms; `0` = always, negative = never); sync failure logs and continues on local data. New: concurrent stale reads share one in-flight sync promise. |
| `run(operation)` | Ensures readiness, then executes the operation on an internal FIFO queue (promise-chain mutex). **All budget operations are serialized initially**, per the overview's guidance, until concurrency is deliberately tested. The lock is acquired exactly once at this boundary; wrappers never re-acquire it, so no recursive deadlock is possible. Relaxing read concurrency later changes only this method. |
| `drainAndClose()` | Stops accepting new operations, awaits the queue tail, calls `api.shutdown()`. Idempotent; safe to call from multiple signal handlers. |

### Caller changes

| File | Change |
| --- | --- |
| `src/actual-api.ts` | Every exported wrapper keeps its signature but delegates through `connection.run(...)`. `initActualApi`/`shutdownActualApi` remain as deprecated aliases for `ensureReady`/`drainAndClose`. **No individual tool implementation files change** (the shared `src/tools/index.ts` lifecycle calls do change; see the next row). |
| `src/tools/index.ts` | Remove `finally { await shutdownActualApi() }` and the up-front `initActualApi()` (wrappers ensure readiness). |
| `src/resources.ts` | Remove `shutdownActualApi()` from listing. Replace direct `api.getAccounts` / `api.getTransactions` / `api.getAccountBalance` calls with the `actual-api.ts` wrappers so resources flow through the queue. |
| `src/index.ts` | SIGINT/SIGTERM handlers call `drainAndClose()` before exit for both stdio and HTTP modes; in HTTP mode, stop accepting requests, then drain the connection, then exit. |

### Out of scope (later phases)

Typed `ActualGateway` and domain-type conversion, upstream error taxonomy/normalization, `uncaughtException` policy change, request-scoped lookup context, HTTP boundary hardening.

## Part 2: report semantics corrections

All corrections ship as new default behavior, documented as breaking output changes.

### 2.1 Balance history (`src/tools/balance-history/`)

Rewrite `BalanceHistoryCalculator`:

- Generate month keys with **integer year/month arithmetic** (no `Date#setMonth` on a preserved day-of-month). Fixes the reproduced bug where an end date of March 31 with three requested months yields only two.
- Compute each month's balance at an **explicit end-of-month cutoff**: start from the as-of anchor balance and walk transactions once, assigning each completed month the balance after all transactions dated ≤ its last day. Fixes the reproduced bug where the current month's "end-of-month" balance excludes its own transactions (10 000 anchor, −2 000 September expense reported as 12 000).
- The current calendar month is reported with `isPartial: true` and its balance is the as-of-today balance.
- All-accounts mode keys by **account ID**; the account name is display metadata. Fixes silent merging of same-named accounts.

### 2.2 Explicit balance cutoff policy

A shared helper (in `src/core/`) defines "balance as of date D". Reported balances use **as of today**; the `2099-01-01` far-future cutoff in `src/resources.ts` and core account fetching is removed. Future-dated transactions are excluded consistently from both the anchor balance and fetched history, resolving the current mismatch (far-future anchor vs. history fetched only to today). Documented as a behavior change superseding the README's prior note.

### 2.3 Monthly summary classification (`src/tools/monthly-summary/`, `src/core/mapping/category-mapper.ts`)

- Remove the `amount > 0 ⇒ income` branch. Income = the transaction's category belongs to a category group with `is_income`.
- All non-income activity nets **signed** amounts into `expenses`; a +2 000 grocery refund reduces expenses instead of creating income.
- Remove the `investments` bucket from `MonthData` and the monthly-summary report; delete the name-substring savings/investment heuristics in the classifier and category-mapper. Update the prompts that reference savings classification to match.
- Keep the existing rule: uncategorized transfer pairs (`transfer_id` set, no category) are skipped; document it.

### 2.4 Historical inclusion and coverage (`src/core/data/fetch-transactions.ts`, monthly summary)

- Closed accounts' transactions are **included** in historical reports; `closed` only affects current-account listings and labels.
- Months with zero activity inside the requested range appear as zero rows and are counted in monthly averages.

### 2.5 Balance-history parameter coherence (`input-parser.ts`, `index.ts`, `data-fetcher.ts`, shared schema)

- Honor `includeOffBudget` end to end.
- Unknown `accountId` returns a validation error, not empty output.
- Parser defaults, the advertised JSON schema, and handler behavior are reconciled to one contract (single source for defaults such as month count).

## Part 3: testing

TDD: each defect above gets a failing fixture test **before** its fix, reproducing at minimum:

1. Anchor 10 000 / September −2 000 → September end-of-month correctness (partial-month labeling).
2. End date March 31, three months → three month rows.
3. +2 000 refund → expenses reduced, income unchanged.
4. Same-named accounts → separate histories.
5. Closed-account transactions present in history.
6. Leap-year and month-end boundary dates; zero-activity months in range and in averages.

Connection tests (deterministic, deferred-promise based, in `connection.test.ts`):

- Overlapping operations cannot close each other's connection; exactly one `api.init` per lifecycle.
- Concurrent stale reads share a single sync.
- Failed init, then retry: first waiters get the failure, later callers succeed (no sticky error).
- `drainAndClose()` awaits in-flight operations; operations submitted after close are rejected.

Integration: one in-memory MCP client/server round-trip test where two overlapping tool calls both succeed (guards the dispatcher regression directly).

### Acceptance criteria (Phase B completion evidence)

- All new fixture tests pass; each was demonstrated failing at baseline behavior first.
- Concurrency tests pass; no per-call shutdown remains in dispatch or resources.
- `npm run test`, `npm run build`, and `npm run quality` pass.
- README/CHANGELOG document the changed report semantics, the removed `investments` bucket, the balance as-of-today policy, and graceful-shutdown behavior.

## Non-goals

MCP SDK v2 migration, structured `outputSchema` results, HTTP security boundary, budget allocation endpoints, schedules/search/reconciliation extensions, transfer/split counting policy beyond the existing skip rule, multi-budget or multi-tenant support.
