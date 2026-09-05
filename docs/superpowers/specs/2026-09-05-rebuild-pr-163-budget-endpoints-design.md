# Design: Rebuild PR #163 (budget endpoints) onto current `main`

**Date:** 2026-09-05
**PR:** [#163 — feat: add budget endpoints](https://github.com/s-stefanov/actual-mcp/pull/163)
**Author of original PR:** Francisco "Paco" Viramontes (`kidpollo`)
**Status:** Approved — ready for implementation plan

## Problem

PR #163 exposes the six Actual Budget budget-management functions as MCP tools. It
is a cross-repository fork PR (`kidpollo:feat/budget-endpoints`) that has gone stale:
GitHub reports it `CONFLICTING` / `DIRTY` against `main`. The valuable part (the
budget tools) still works, but the branch is dominated by changes that are now
obsolete because `main` has moved from `@actual-app/api` 26.2.1 → **26.8.1**.

An independent contributor (`ryanmac8`, in the PR thread) ported the budget tools onto
current `main` and confirmed all 38 unit tests pass unmodified and all six tools work
live against a 26.8.1 server. This spec captures the plan to land that verified subset.

## Goal

Update PR #163 **in place** so it becomes mergeable, containing only the changes that
are still relevant on current `main`, while preserving `kidpollo`'s authorship (both at
the PR level and the commit level).

## Enabling fact

`maintainerCanModify: true` on PR #163 — the author allowed edits from maintainers, so
we can push directly to the fork branch and update the PR without the author's
involvement.

## Approach: clean rebuild + force-push

Because ~80% of the branch is obsolete content we want *removed* (not reconciled), a
`git merge` or `git rebase` of the whole branch would carry the dead weight forward and
require stripping it afterward. Instead we **cherry-pick only the keeper files** onto a
fresh branch cut from `origin/main`, commit as `kidpollo`, and force-push over the fork
branch.

- Attribution preserved: commit authored `Francisco Viramontes <kidpollo@gmail.com>`
  with a `Co-Authored-By: Claude <noreply@anthropic.com>` trailer; PR thread, reviews,
  and comments survive automatically because they are tied to the PR, not the branch.
- Reversibility: the original fork branch is fetched locally (`fork/feat/budget-endpoints`,
  SHAs `ceba00c` and `89bb762`) as a recovery point before any force-push.

## Scope

### Keeper set (re-applied onto fresh `origin/main`)

| File(s) | How | Notes |
|---|---|---|
| `src/tools/budgets/**` (12 files: 6 tools × `index.ts` + `index.test.ts`) | copy **verbatim** from `fork/feat/budget-endpoints` | Verified to pass unmodified on 26.8.1 |
| `src/actual-api.ts` | **append only** the `BUDGETS` section (6 wrapper functions) | Do NOT apply the PR's import rewrites — `main` already uses `@actual-app/core/*`. Do NOT apply the incidental `deleteCategory` `Promise<void>→unknown` change. |
| `src/tools/index.ts` | add 6 tool imports + read/write registrations | 2 read tools, 4 write tools |
| `src/utils/response.ts` | apply the `errorFromCatch` fix | Extracts `.message` from structured `{ type, message }` API errors instead of stringifying to `[object Object]`. Live bug on `main`. |
| `src/resources.ts` | change ListResources handler `throw error` → `return { resources: [] }` | Same bug class as `errorFromCatch`; graceful degradation. `main`'s global `unhandledRejection` guard already mitigates the crash, so this is an improvement, not a critical fix. Included by decision. |

### Six tools

Read (always available): `get-budget-months`, `get-budget-month`
Write (`--enable-write`): `set-budget-amount`, `set-budget-carryover`,
`hold-budget-for-next-month`, `reset-budget-hold`

### Dropped (obsolete / conflicting)

| File(s) | Why dropped |
|---|---|
| `package.json`, `package-lock.json` | PR downgrades to 26.2.1 then bumps to 26.4.0; `main` is already on 26.8.1 |
| `src/stubs/actual-core.d.ts` | `main` has the real `@actual-app/core` dependency shipping its own types |
| `tsconfig.json` `paths` redirect | only existed to point at the stub |
| `src/index.ts` | `unhandledRejection` guard already on `main` (line 117, via #204) |
| `src/core/data/fetch-rules.ts`, `src/core/data/fetch-transactions.ts`, `src/tools/rules/create-rule/index.ts`, `src/tools/rules/get-rules/index.ts` | import-path churn driven by the removed stub; `main` already migrated these imports |

## Execution flow

1. `git checkout -b rebuild-163 origin/main`
2. `git checkout fork/feat/budget-endpoints -- src/tools/budgets` (verbatim keeper files)
3. Hand-port the merge-in files: `src/actual-api.ts` (append BUDGETS section),
   `src/tools/index.ts` (imports + registrations), `src/utils/response.ts`
   (`errorFromCatch`), `src/resources.ts` (graceful `return { resources: [] }`)
4. **Verify gate (all must pass before pushing):**
   - `npm run type-check`
   - `npm run test` — confirm the 38 budget tests pass and the suite is green
   - `npm run build`
   - `npm run lint`
5. Commit: `git commit --author="Francisco Viramontes <kidpollo@gmail.com>"` with a
   `Co-Authored-By: Claude <noreply@anthropic.com>` trailer
6. `git push --force fork rebuild-163:feat/budget-endpoints`
7. Confirm PR #163 flips `DIRTY` → mergeable; post a short PR comment summarizing the
   rebuild and crediting `ryanmac8`'s independent verification

## Error handling / risks

- **Force-push rejected** (despite `maintainerCanModify`): do not improvise. Fall back
  to opening a new PR from `origin` that credits `kidpollo` (`Co-Authored-By`) and says
  `Closes #163`, then close #163 with a credit comment.
- **A budget test fails on 26.8.1 during the verify gate:** stop and investigate before
  pushing; do not push a red tree. `ryanmac8` verified green, so a failure signals a
  rebuild mistake (e.g. a mis-ported wrapper) rather than an API incompatibility.
- **Recovery point:** `fork/feat/budget-endpoints` (`ceba00c` / `89bb762`) is fetched
  locally; the pre-push state is fully recoverable.

## Testing

The 38 unit tests under `src/tools/budgets/**` (happy path + edge + error case per tool)
are the primary coverage and ship with the keeper set. The verify gate in step 4 runs
them plus type-check, build, and lint. No new tests are required beyond what the PR
already includes.

## Out of scope

- Any refactoring of existing tools beyond the `errorFromCatch` / `resources.ts` fixes.
- Downstream PRs #210 / #211 (budget reporting) — `ryanmac8` has offered to rebase them
  onto this once it lands; no tool-name overlap exists.
