# ESLint Issues Fix PRP - Fix TypeScript Linting Errors

## 🎯 Objective

Fix all existing ESLint errors and warnings in the mcp-actualbudget project by adding proper TypeScript return type annotations and replacing `any` types with specific, type-safe alternatives. Transform the codebase from 25 linting violations to zero violations.

## 📋 Context Analysis

### Current Project State

Based on running `npm run lint`:

- **ESLint is already configured** and working (eslint.config.ts exists)
- **25 linting violations** identified (15 errors, 10 warnings)
- **Well-structured TypeScript project** with strict type checking enabled
- **Vitest testing framework** with comprehensive coverage and proper patterns
- **Consistent coding patterns** already established
- **Proper development workflow** with quality gates already in place

### Current ESLint Issues (from `npm run lint`)

**Missing Return Types (15 errors):**

```
src/prompts.ts:36:63, 75:53, 116:46 - Arrow functions in prompt templates
src/resources.ts:15:48 - Resource handler function
src/tools/balance-history/index.ts:53:8 - Main tool handler
src/tools/get-transactions/index.ts:76:8 - Main tool handler
src/tools/get-transactions/transaction-mapper.ts:6:3 - Mapper function
src/tools/index.ts:19:44, 68:1 - Tool registration functions
src/tools/monthly-summary/index.ts:31:8 - Main tool handler
src/tools/monthly-summary/summary-calculator.ts:4:3 - Calculator function
src/tools/spending-by-category/index.ts:61:8 - Main tool handler
```

**Use of `any` Type (10 warnings):**

```
src/tools/balance-history/input-parser.ts:9:15 - Input parameter
src/tools/get-transactions/input-parser.ts:15:15 - Input parameter
src/tools/monthly-summary/index.ts:31:37 - Tool arguments
src/tools/monthly-summary/input-parser.ts:2:15 - Input parameter
src/tools/monthly-summary/report-data-builder.ts:11:15 - Data parameter
src/tools/monthly-summary/report-generator.ts:35:34 - Generator parameter
src/tools/monthly-summary/types.ts:7:17 - Type definition
src/tools/spending-by-category/index.ts:61:37 - Tool arguments
src/tools/spending-by-category/input-parser.ts:11:15 - Input parameter
src/utils/response.ts:16:14 - Response utility parameter
```

### Available Types for Implementation

**From @actual-app/api (`node_modules/@actual-app/api/@types/loot-core/src/server/api-models.d.ts`):**

```typescript
export type APIAccountEntity = Pick<AccountEntity, 'id' | 'name'> & {
  offbudget: boolean;
  closed: boolean;
};

export type APICategoryEntity = Pick<CategoryEntity, 'id' | 'name' | 'is_income' | 'hidden'> & {
  group_id: string;
};

export type APICategoryGroupEntity = Pick<CategoryGroupEntity, 'id' | 'name' | 'is_income' | 'hidden'> & {
  categories: APICategoryEntity[];
};
```

**From src/core/types/domain.ts:**

```typescript
export interface Account {
  id: string;
  name: string;
  type?: string;
  offbudget?: boolean;
  closed?: boolean;
  balance?: number;
}

export interface Transaction {
  id?: string;
  account: string;
  date: string;
  amount: number;
  payee?: string;
  payee_name?: string;
  category?: string;
  category_name?: string;
  notes?: string;
}
```

**From src/types.ts:**

```typescript
export interface GetTransactionsArgs {
  accountId: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  category?: string;
  payee?: string;
  limit?: number;
}
// ... other tool argument interfaces
```

## 🔍 Key Insights & Patterns

### Test Pattern Analysis (from `src/core/data/fetch-accounts.test.ts`)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAllAccounts } from './fetch-accounts.js';

// CRITICAL: Mock before imports
vi.mock('../../actual-api.js', () => ({
  getAccounts: vi.fn(),
}));

import { getAccounts } from '../../actual-api.js';

describe('fetchAllAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return accounts from API', async () => {
    const mockAccounts = [
      /* mock data */
    ];
    vi.mocked(getAccounts).mockResolvedValue(mockAccounts);

    const result = await fetchAllAccounts();

    expect(result).toEqual(mockAccounts);
    expect(getAccounts).toHaveBeenCalledOnce();
  });
});
```

### Current ESLint Configuration Analysis

The project has a properly configured `eslint.config.ts` with:

- **Explicit Function Return Type**: Error level, requires all functions to have return types
- **No Explicit Any**: Warning level, discourages use of `any` type
- **TypeScript Integration**: Full type-aware linting enabled
- **Prettier Integration**: Code formatting conflicts resolved

### Key TypeScript ESLint Rules in Effect

```typescript
// From eslint.config.ts
'@typescript-eslint/explicit-function-return-type': [
  'error',
  {
    allowExpressions: true,
    allowTypedFunctionExpressions: true,
  },
],
'@typescript-eslint/no-explicit-any': 'warn',
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: @actual-app/api uses different type names than domain types
// Use APIAccountEntity[] for actual-api.ts getAccounts() return type
// Use APICategoryEntity[] for getCategories() return type
// Use APICategoryGroupEntity[] for getCategoryGroups() return type

// GOTCHA: Input parsers receive MCP CallToolRequest.params which is 'any'
// Replace with: unknown, then type-guard or validate to proper interfaces

// GOTCHA: Some tools receive CallToolRequest which has 'any' in arguments
// Use proper interfaces from src/types.ts like GetTransactionsArgs, etc.

// PATTERN: Follow existing test patterns with vi.mock() and proper typing
// See src/core/data/fetch-accounts.test.ts for reference
```

## 🚀 Implementation Blueprint

### Task 1: Fix actual-api.ts return types (3 errors)

**MODIFY src/actual-api.ts:**

- ADD proper return types to getCategories(), getCategoryGroups(), getTransactions()
- USE types from @actual-app/api/@types/loot-core/src/server/api-models.d.ts
- PRESERVE existing functionality and error handling

```typescript
// Lines to fix:
// Line 82: export async function getCategories() {
// Line 90: export async function getCategoryGroups() {
// Line 98: export async function getTransactions(accountId: string, start: string, end: string) {

// Example fixes:
export async function getCategories(): Promise<APICategoryEntity[]> {
  await initActualApi();
  return api.getCategories();
}

export async function getCategoryGroups(): Promise<APICategoryGroupEntity[]> {
  await initActualApi();
  return api.getCategoryGroups();
}

export async function getTransactions(accountId: string, start: string, end: string): Promise<Transaction[]> {
  await initActualApi();
  return api.getTransactions(accountId, start, end);
}
```

### Task 2: Fix prompts.ts return types (3 errors)

**MODIFY src/prompts.ts:**

- ADD explicit return types to arrow functions at lines 36, 75, 116
- USE string return type for template functions
- FOLLOW pattern from existing typed functions

### Task 3: Fix resources.ts return types (1 error)

**MODIFY src/resources.ts:**

- ADD return type annotation to function at line 15
- USE appropriate MCP resource type or Promise<Resource[]>

### Task 4: Fix tool index files return types (5 errors)

**MODIFY tool handler functions:**

- src/tools/balance-history/index.ts:53 - ADD CallToolResult return type
- src/tools/get-transactions/index.ts:76 - ADD CallToolResult return type
- src/tools/monthly-summary/index.ts:31 - ADD CallToolResult return type
- src/tools/spending-by-category/index.ts:61 - ADD CallToolResult return type
- src/tools/index.ts:19,68 - ADD proper return types for tool registration

### Task 5: Fix utility function return types (3 errors)

**MODIFY remaining files:**

- src/tools/get-transactions/transaction-mapper.ts:6 - ADD return type
- src/tools/monthly-summary/summary-calculator.ts:4 - ADD return type
- src/tools/index.ts functions - ADD proper return types

### Task 6: Replace 'any' types in input parsers (10 warnings)

**MODIFY input parser files:**

- REPLACE `any` with `unknown` for raw input parameters
- ADD proper type guards or use existing argument interfaces
- USE interfaces from src/types.ts like GetTransactionsArgs, SpendingByCategoryArgs, etc.

```typescript
// Example transformation pattern:
// FROM: function parseInput(args: any): ParsedArgs {
// TO:   function parseInput(args: unknown): ParsedArgs {
//         if (typeof args !== 'object' || args === null) {
//           throw new Error('Invalid arguments');
//         }
//         const typed = args as GetTransactionsArgs;
//         // Use type guards or validation
//       }
```

**Files to update:**

- src/tools/balance-history/input-parser.ts:9
- src/tools/get-transactions/input-parser.ts:15
- src/tools/monthly-summary/input-parser.ts:2
- src/tools/monthly-summary/report-data-builder.ts:11
- src/tools/monthly-summary/report-generator.ts:35
- src/tools/monthly-summary/types.ts:7
- src/tools/spending-by-category/input-parser.ts:11
- src/utils/response.ts:16

### Task 7: Update tests if needed

**CREATE/MODIFY test files only if logic changes:**

- ENSURE all modified functions have corresponding tests
- USE existing test patterns with vi.mock()
- TEST both happy path and error cases
- FOLLOW pattern in src/core/data/fetch-accounts.test.ts

## 📝 Implementation Checklist

### Core Fixes

- [ ] Fix actual-api.ts return types (3 errors)
  - [ ] getCategories(): Promise<APICategoryEntity[]>
  - [ ] getCategoryGroups(): Promise<APICategoryGroupEntity[]>
  - [ ] getTransactions(): Promise<Transaction[]>

- [ ] Fix prompts.ts return types (3 errors)
  - [ ] Line 36: Arrow function return type
  - [ ] Line 75: Arrow function return type
  - [ ] Line 116: Arrow function return type

- [ ] Fix resources.ts return types (1 error)
  - [ ] Line 15: Resource handler function

- [ ] Fix tool handler return types (5 errors)
  - [ ] balance-history/index.ts:53
  - [ ] get-transactions/index.ts:76
  - [ ] monthly-summary/index.ts:31
  - [ ] spending-by-category/index.ts:61
  - [ ] tools/index.ts:19,68

- [ ] Fix utility function return types (3 errors)
  - [ ] get-transactions/transaction-mapper.ts:6
  - [ ] monthly-summary/summary-calculator.ts:4
  - [ ] Additional functions in tools/index.ts

### Type Safety Improvements

- [ ] Replace 'any' types (10 warnings)
  - [ ] balance-history/input-parser.ts:9
  - [ ] get-transactions/input-parser.ts:15
  - [ ] monthly-summary/input-parser.ts:2
  - [ ] monthly-summary/report-data-builder.ts:11
  - [ ] monthly-summary/report-generator.ts:35
  - [ ] monthly-summary/types.ts:7
  - [ ] spending-by-category/input-parser.ts:11
  - [ ] utils/response.ts:16
  - [ ] monthly-summary/index.ts:31 (args parameter)
  - [ ] spending-by-category/index.ts:61 (args parameter)

### Validation & Testing

- [ ] All ESLint errors resolved: `npm run lint` shows 0 problems
- [ ] All TypeScript compilation passes: `npm run type-check`
- [ ] All existing tests pass: `npm run test`
- [ ] Update tests if logic changes
- [ ] Build process works: `npm run build`

## 🔍 Validation Loop

### Level 1: Syntax & Style

```bash
# Run these FIRST - fix any errors before proceeding
npm run lint           # Should show 0 problems (down from 25)
npm run type-check     # Should pass with no TypeScript errors
npm run format:check   # Should pass formatting validation

# Expected: No errors. If errors, READ the error message and fix the specific issue.
```

### Level 2: Unit Tests

```bash
# Run all existing tests to ensure no regressions
npm run test           # All tests should pass
npm run test:coverage  # Check coverage hasn't decreased

# If tests fail:
# 1. Read the specific test error
# 2. Understand which change broke the test
# 3. Fix the code (don't modify tests unless types require it)
# 4. Re-run tests
```

### Level 3: Build & Integration

```bash
# Full quality validation
npm run quality        # Runs lint + format:check + type-check
npm run build          # Should compile successfully

# Expected: All commands pass without errors
```

### Progressive Validation Strategy

```bash
# 1. Fix one file at a time
npm run lint src/actual-api.ts

# 2. Test immediately after each fix
npm run test

# 3. Continue iteratively
npm run lint src/prompts.ts
npm run test

# 4. Final validation
npm run lint           # Should be 0 problems
npm run quality        # Should pass completely
```

## 🎯 Success Criteria

### Primary Goals

- [ ] **Zero ESLint errors**: `npm run lint` passes completely (down from 15 errors)
- [ ] **Zero ESLint warnings**: All `any` types replaced with proper types (down from 10 warnings)
- [ ] **Type safety improved**: All functions have explicit return types
- [ ] **No regressions**: All existing tests continue to pass
- [ ] **Build compatibility**: TypeScript compilation and build process unaffected

### Code Quality Improvements

- [ ] **Better IntelliSense**: IDE autocomplete and error detection improved
- [ ] **Maintainability**: Code is more self-documenting with explicit types
- [ ] **Error prevention**: Type-related bugs caught at compile time
- [ ] **Consistency**: All functions follow the same typing standards

### Validation Requirements

- [ ] `npm run lint` shows "0 problems"
- [ ] `npm run type-check` passes without errors
- [ ] `npm run test` all tests pass
- [ ] `npm run build` compiles successfully
- [ ] `npm run quality` passes completely

## 🔧 Common Issues & Solutions

### Issue: "Cannot find type 'APICategoryEntity'"

**Solution**: Import the type from the correct path:

```typescript
import { APICategoryEntity } from '@actual-app/api/@types/loot-core/src/server/api-models.js';
```

### Issue: "Type 'unknown' is not assignable to type 'ParsedArgs'"

**Solution**: Add proper type guards:

```typescript
function parseInput(args: unknown): ParsedArgs {
  if (typeof args !== 'object' || args === null) {
    throw new Error('Invalid arguments');
  }
  // Use type assertion with validation
  return args as ParsedArgs;
}
```

### Issue: "Promise<any> is not assignable to Promise<Transaction[]>"

**Solution**: Check the actual return type from the API and use the correct interface.

### Issue: "Test failures after adding return types"

**Solution**: Update test mocks to return properly typed values:

```typescript
vi.mocked(getCategories).mockResolvedValue(mockCategories);
// Ensure mockCategories matches APICategoryEntity[]
```

## 📊 Implementation Score

**Confidence Level: 9/10**

### Scoring Rationale

- **Specific error locations identified**: Exact files and line numbers from `npm run lint`
- **Available type definitions mapped**: Clear understanding of types from @actual-app/api and local domain types
- **Existing test patterns documented**: Can follow established Vitest patterns for any needed test updates
- **Clear transformation examples**: Concrete before/after code examples provided
- **Executable validation commands**: Can verify progress with `npm run lint` at each step
- **Iterative approach**: Can fix and validate one file at a time
- **Zero breaking changes**: Only adding types, not changing functionality

### Risk Mitigation

- **Low risk**: Only adding type annotations, not changing logic
- **Incremental approach**: Fix one file, test, then continue
- **Existing tests**: Will catch any unintended breaking changes
- **Clear rollback**: Git allows easy reversion if needed
- **Type safety**: TypeScript compiler prevents type mismatches

## 🔗 Documentation References

### Essential Context

- **File**: `src/core/data/fetch-accounts.test.ts` - Test pattern reference
- **File**: `node_modules/@actual-app/api/@types/loot-core/src/server/api-models.d.ts` - API types
- **File**: `src/core/types/domain.ts` - Local domain types
- **File**: `src/types.ts` - Tool argument interfaces

### TypeScript ESLint Rules

- **Rule**: `@typescript-eslint/explicit-function-return-type` - [Documentation](https://typescript-eslint.io/rules/explicit-function-return-type/)
- **Rule**: `@typescript-eslint/no-explicit-any` - [Documentation](https://typescript-eslint.io/rules/no-explicit-any/)

### Validation Commands

```bash
npm run lint           # Primary validation - should show 0 problems
npm run type-check     # TypeScript compilation check
npm run test           # Ensure no regressions
npm run build          # Final integration check
```

## Anti-Patterns to Avoid

- ❌ Don't use `any` as a quick fix - find the proper type
- ❌ Don't suppress ESLint rules with disable comments
- ❌ Don't change existing function signatures unnecessarily
- ❌ Don't modify tests just to make them pass - fix the code
- ❌ Don't ignore TypeScript compiler errors
- ❌ Don't break existing API contracts
- ❌ Don't add return types that are too broad (like `any` or `object`)

---

_This PRP provides comprehensive context for fixing all 25 ESLint violations through systematic type improvements with zero functionality changes._
