/**
 * Stub type declarations for @actual-app/core.
 *
 * Reason: @actual-app/api >=26.4.0 imports types directly from @actual-app/core source
 * TypeScript (.ts) files instead of compiled declaration files. Our strict tsconfig cannot
 * compile those files. This stub covers every subpath import that @actual-app/api exposes so
 * TypeScript resolves to this file (via tsconfig `paths`) rather than the raw source.
 *
 * All exports are derived from the @actual-app/core source at version 26.4.0.
 */

// ---------------------------------------------------------------------------
// @actual-app/core/server/api-models
// ---------------------------------------------------------------------------

export type APIAccountEntity = {
  id: string;
  name: string;
  offbudget?: boolean;
  closed?: boolean;
  balance_current?: number | null;
  type?: string;
  balance?: number;
};

export type APICategoryEntity = {
  id: string;
  name: string;
  is_income?: boolean;
  hidden?: boolean;
  group_id: string;
};

export type APICategoryGroupEntity = {
  id: string;
  name: string;
  is_income?: boolean;
  hidden?: boolean;
  categories?: APICategoryEntity[];
};

export type APIPayeeEntity = {
  id: string;
  name: string;
  transfer_acct?: string;
};

export type APIFileEntity = {
  id?: string;
  cloudFileId: string;
  groupId?: string;
  name: string;
  state?: 'remote';
  hasKey?: boolean;
};

export type APIScheduleEntity = {
  id: string;
  name?: string | null;
  posts_transaction?: boolean;
  rule?: unknown;
  next_date?: string | null;
};

export type APITagEntity = {
  id: string;
  tag: string;
  color?: string | null;
  description?: string | null;
};

// ---------------------------------------------------------------------------
// @actual-app/core/types/models
// ---------------------------------------------------------------------------

export type TransactionEntity = {
  id: string;
  is_parent?: boolean;
  is_child?: boolean;
  parent_id?: string;
  account: string;
  category?: string;
  amount: number;
  payee?: string | null;
  notes?: string;
  date: string;
  imported_id?: string;
  imported_payee?: string;
  starting_balance_flag?: boolean;
  transfer_id?: string;
  sort_order?: number;
  cleared?: boolean;
  reconciled?: boolean;
  tombstone?: boolean;
  forceUpcoming?: boolean;
  schedule?: string;
  subtransactions?: TransactionEntity[];
  _unmatched?: boolean;
  _deleted?: boolean;
  error?: { type: 'SplitTransactionError'; version: 1; difference: number } | null;
  raw_synced_data?: string;
  payee_name?: string;
  category_name?: string;
};

export type RuleEntity = {
  id: string;
  stage: string | null;
  conditionsOp: 'and' | 'or';
  conditions: unknown[];
  actions: unknown[];
  tombstone?: boolean;
};

export type ImportTransactionEntity = {
  account: string;
  date: string;
  amount?: number;
  payee?: string | null;
  payee_name?: string;
  imported_id?: string;
  imported_payee?: string;
  category?: string;
  notes?: string;
  cleared?: boolean;
  transfer_id?: string;
  // Reason: subtransactions in import mode inherit account/date from parent, so fields are partial
  subtransactions?: Partial<ImportTransactionEntity>[];
};

// ---------------------------------------------------------------------------
// @actual-app/core/types/api-handlers
// ---------------------------------------------------------------------------

export type ImportTransactionsOpts = {
  defaultCleared?: boolean;
  dryRun?: boolean;
  reimportDeleted?: boolean;
};

// ---------------------------------------------------------------------------
// @actual-app/core/server/main
// ---------------------------------------------------------------------------

export type InitConfig = { dataDir: string; serverURL: string; password: string } | { dataDir: string };

export declare const lib: unknown;

// ---------------------------------------------------------------------------
// @actual-app/core/shared/query
// ---------------------------------------------------------------------------

export declare class Query {
  constructor(state: unknown);
  filter(conditions: unknown): Query;
  select(fields?: unknown): Query;
  calculate(expr: unknown): Query;
  groupBy(fields: unknown): Query;
  orderBy(fields: unknown): Query;
  limit(n: number): Query;
  offset(n: number): Query;
  raw(): unknown;
}

// ---------------------------------------------------------------------------
// Catch-all: any other @actual-app/core/* subpath resolves here too.
// Exporting everything as unknown prevents implicit-any errors in strict mode.
// ---------------------------------------------------------------------------
export declare const _catchAll: unknown;
