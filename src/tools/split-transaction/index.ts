// ----------------------------
// SPLIT TRANSACTION TOOL
// ----------------------------

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { toJSONSchema } from 'zod';
import type { TransactionEntity } from '@actual-app/core/types/models';
import { successWithJson, errorFromCatch, error } from '../../utils/response.js';
import { getTransactionById, addSplitTransaction, deleteTransaction } from '../../actual-api.js';
import {
  SplitTransactionArgsSchema,
  type SplitTransactionArgs,
  type TransactionData,
  type ToolInput,
} from '../../types.js';

export const schema = {
  name: 'split-transaction',
  description:
    'Split an existing transaction into two or more subtransactions. Amounts are integer cents and must sum exactly to the original amount. The original transaction is replaced by a new split parent, so its ID changes (the response includes both IDs). Cannot split transactions that are already part of a split, are reconciled, or are one side of a transfer.',
  inputSchema: toJSONSchema(SplitTransactionArgsSchema) as ToolInput,
};

type SplittableResult = { ok: true; transaction: TransactionEntity } | { ok: false; message: string };

/**
 * Look up a transaction and verify it is eligible to be split.
 *
 * @param transactionId - The ID of the transaction to validate
 * @returns The transaction when splittable, otherwise an error message
 */
async function loadSplittableTransaction(transactionId: string): Promise<SplittableResult> {
  const transaction = await getTransactionById(transactionId);
  if (!transaction) {
    return { ok: false, message: `Transaction ${transactionId} was not found` };
  }
  if (transaction.is_parent) {
    return {
      ok: false,
      message: `Transaction ${transactionId} is already a split parent. Update or delete its subtransactions instead.`,
    };
  }
  if (transaction.is_child) {
    return {
      ok: false,
      message: `Transaction ${transactionId} is a subtransaction of split ${transaction.parent_id}. Pass the parent transaction ID instead.`,
    };
  }
  if (transaction.reconciled) {
    return { ok: false, message: `Transaction ${transactionId} is reconciled and cannot be modified` };
  }
  if (transaction.transfer_id) {
    return {
      ok: false,
      message: `Transaction ${transactionId} is one side of a transfer. Unpair the transfer before splitting it.`,
    };
  }
  return { ok: true, transaction };
}

/**
 * Build the replacement split transaction from the original row.
 *
 * @param original - The transaction being split
 * @param splits - The subtransactions to create under the new parent
 * @returns Transaction data for the replacement split parent
 */
function buildReplacement(original: TransactionEntity, splits: SplitTransactionArgs['splits']): TransactionData {
  // Reason: the split replaces the original; carry its data and bank-sync identifiers
  // forward so future imports keep deduplicating against imported_id.
  return {
    date: original.date,
    amount: original.amount,
    payee: original.payee ?? undefined,
    imported_payee: original.imported_payee,
    notes: original.notes,
    imported_id: original.imported_id,
    cleared: original.cleared,
    // Reason: split parents never carry a category; categories live on the children.
    category: undefined,
    subtransactions: splits.map(({ amount, category, notes }) => ({ amount, category, notes })),
  };
}

export async function handler(args: SplitTransactionArgs): Promise<CallToolResult> {
  try {
    const { transactionId, splits } = SplitTransactionArgsSchema.parse(args);

    const loaded = await loadSplittableTransaction(transactionId);
    if (!loaded.ok) {
      return error(loaded.message);
    }
    const original = loaded.transaction;

    const splitTotal = splits.reduce((sum, split) => sum + split.amount, 0);
    if (splitTotal !== original.amount) {
      return error(
        `Split amounts must sum to the original amount. Splits total ${splitTotal} but the transaction amount is ${original.amount}.`
      );
    }

    const createdIds = await addSplitTransaction(original.account, buildReplacement(original, splits));
    const [parentId, ...childIds] = createdIds;
    if (!parentId) {
      return error(`The split for ${transactionId} could not be created. No changes were made.`);
    }

    try {
      await deleteTransaction(transactionId);
    } catch (deleteError) {
      // Reason: the split already exists, so report partial success with both IDs
      // instead of failing; removing the leftover original is a safe manual cleanup step.
      const message = deleteError instanceof Error ? deleteError.message : String(deleteError);
      return successWithJson({
        status: 'completed_with_warning',
        message: `Split created as ${parentId}, but the original transaction ${transactionId} could not be deleted (${message}). Delete the original manually to avoid a duplicate.`,
        originalTransactionId: transactionId,
        splitTransactionId: parentId,
        childTransactionIds: childIds,
      });
    }

    return successWithJson({
      status: 'success',
      message: `Split transaction ${transactionId} into ${childIds.length} subtransactions. New split parent: ${parentId}.`,
      originalTransactionId: transactionId,
      splitTransactionId: parentId,
      childTransactionIds: childIds,
    });
  } catch (err) {
    return errorFromCatch(err);
  }
}
