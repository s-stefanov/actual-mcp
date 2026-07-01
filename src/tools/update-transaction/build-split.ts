import type { UpdateSubtransaction } from '../../types.js';

/**
 * Minimal shape needed to reason about an existing transaction's split state.
 */
export interface ExistingSplitState {
  is_parent?: boolean;
  subtransactions?: unknown[];
}

/**
 * Determine whether a transaction is already a split (i.e. it already has child
 * subtransactions). Actual's `updateTransaction` only propagates the parent
 * account to children when the transaction is already a split, so this decides
 * whether we can pass subtransactions through untouched.
 *
 * @param txn - The existing transaction (grouped), or null if it couldn't be loaded
 * @returns True when the transaction already has children
 */
export function isSplitTransaction(txn: ExistingSplitState | null): boolean {
  if (!txn) return false;
  return txn.is_parent === true || (Array.isArray(txn.subtransactions) && txn.subtransactions.length > 0);
}

/**
 * Build the update payload fields required to convert a plain (non-split)
 * transaction into a split.
 *
 * Actual's grouped update path does not synthesize child rows for a transaction
 * that isn't already a split — it inserts whatever is handed to it verbatim,
 * which fails with `"account" is required` because children carry no account.
 * We therefore construct fully-formed children here, mirroring Actual's internal
 * `makeSplitTransaction`/`makeChild`: each child inherits the parent's account,
 * date and payee and is linked back via `parent_id`/`is_child`. The parent is
 * marked `is_parent` and its own category is cleared (categories live on the
 * children).
 *
 * @param params.parentId - The id of the transaction being converted
 * @param params.account - The account the parent belongs to (children inherit it)
 * @param params.date - The parent's date (children inherit it)
 * @param params.payee - The parent's payee id, propagated to each child when set
 * @param params.subtransactions - The requested subtransactions from the caller
 * @param params.generateId - Factory for new child ids (injected for testability)
 * @returns Partial update fields to merge into the transaction update payload
 */
export function buildSplitConversion(params: {
  parentId: string;
  account: string;
  date: string;
  payee?: string | null;
  subtransactions: UpdateSubtransaction[];
  generateId: () => string;
}): Record<string, unknown> {
  const { parentId, account, date, payee, subtransactions, generateId } = params;

  const children = subtransactions.map((sub, index) => {
    const child: Record<string, unknown> = {
      id: sub.id ?? generateId(),
      account,
      date,
      amount: sub.amount,
      parent_id: parentId,
      is_child: true,
      // Reason: preserve caller ordering; Actual's makeSplitTransaction uses the
      // same 0-based descending offsets so children keep their relative order.
      sort_order: 0 - index,
    };
    // Reason: split children should carry the parent's payee so they display
    // consistently; only set it when the parent actually has one.
    if (payee != null) child.payee = payee;
    if (sub.category !== undefined) child.category = sub.category;
    if (sub.notes !== undefined) child.notes = sub.notes;
    return child;
  });

  return {
    is_parent: true,
    // Reason: a split parent holds no category of its own; the children carry them.
    category: null,
    subtransactions: children,
  };
}
