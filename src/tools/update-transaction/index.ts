import { randomUUID } from 'node:crypto';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { toJSONSchema } from 'zod';
import { success, errorFromCatch } from '../../utils/response.js';
import { updateTransaction, getTransactionById } from '../../actual-api.js';
import {
  UpdateTransactionArgsSchema,
  type UpdateTransactionArgs,
  type UpdateSubtransaction,
  ToolInput,
} from '../../types.js';
import { isSplitTransaction, buildSplitConversion, sumSubtransactions } from './build-split.js';

export const schema = {
  name: 'update-transaction',
  description:
    'Update an existing transaction. Can modify date, amount, payee, category, notes, cleared status, and subtransactions. Providing subtransactions on a non-split transaction converts it into a split; the children inherit the parent account and date automatically. Subtransaction amounts must sum to the transaction total or the update is rejected.',
  inputSchema: toJSONSchema(UpdateTransactionArgsSchema) as ToolInput,
};

export async function handler(args: UpdateTransactionArgs): Promise<CallToolResult> {
  try {
    const validatedArgs = UpdateTransactionArgsSchema.parse(args);
    const { id: transactionId, ...updateData } = validatedArgs;

    // Filter out undefined values to only send fields that were explicitly provided
    const filteredUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([, value]) => value !== undefined)
    );

    if (Object.keys(filteredUpdateData).length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No fields provided to update. Please specify at least one field to modify.',
          },
        ],
        isError: true,
      };
    }

    // Capture the caller-facing field names before any split conversion rewrites
    // the payload, so the confirmation message reflects what the user asked for.
    const updatedFields = Object.keys(filteredUpdateData).join(', ');

    const subtransactionError = await prepareSubtransactions(transactionId, filteredUpdateData);
    if (subtransactionError) {
      return {
        content: [{ type: 'text', text: subtransactionError }],
        isError: true,
      };
    }

    await updateTransaction(transactionId, filteredUpdateData);

    return success(`Successfully updated transaction ${transactionId}. Updated fields: ${updatedFields}`);
  } catch (error) {
    return errorFromCatch(error);
  }
}

/**
 * Validate and, when necessary, rewrite supplied subtransactions before the
 * update is sent to Actual.
 *
 * Two responsibilities:
 *  1. Reject splits whose child amounts don't sum to the parent total. Actual
 *     would otherwise accept the update and only surface the mismatch as an
 *     error in the app, so we fail loudly here instead.
 *  2. Convert a plain transaction into a split. Actual only propagates the parent
 *     account to children when the transaction is already a split, so a plain
 *     transaction's children must be rewritten into fully-formed rows (see
 *     build-split.ts). Already-split transactions and empty arrays are left
 *     untouched — Actual handles those paths itself. If the transaction can't be
 *     loaded we leave the payload alone rather than guess at an account.
 *
 * @param transactionId - The id of the transaction being updated
 * @param updateData - The filtered update payload, mutated in place when converting
 * @returns An error message when the split is invalid, otherwise null
 */
async function prepareSubtransactions(
  transactionId: string,
  updateData: Record<string, unknown>
): Promise<string | null> {
  const requestedSubs = updateData.subtransactions;
  if (!Array.isArray(requestedSubs) || requestedSubs.length === 0) return null;
  const subtransactions = requestedSubs as UpdateSubtransaction[];

  const existing = await getTransactionById(transactionId);

  // Validate the split totals against the parent amount. Prefer a new amount set
  // on this update, otherwise the transaction's current amount. When neither is
  // known (transaction not found and no amount supplied) we can't validate.
  const parentTotal = (updateData.amount as number | undefined) ?? existing?.amount;
  if (parentTotal !== undefined) {
    const childrenTotal = sumSubtransactions(subtransactions);
    if (childrenTotal !== parentTotal) {
      return (
        `Subtransaction amounts must sum to the transaction total. ` +
        `The subtransactions add up to ${childrenTotal} but the transaction total is ${parentTotal} ` +
        `(a difference of ${parentTotal - childrenTotal}). Amounts are integers in minor units.`
      );
    }
  }

  if (!existing || isSplitTransaction(existing)) return null;

  const account = (updateData.account as string | undefined) ?? existing.account;
  const date = (updateData.date as string | undefined) ?? existing.date;
  // Prefer a payee explicitly set on this update, otherwise inherit the
  // transaction's current payee. (payee_name is resolved server-side and can't
  // be propagated to children, which are inserted as raw transaction rows.)
  const payee = (updateData.payee as string | undefined) ?? existing.payee;

  Object.assign(
    updateData,
    buildSplitConversion({
      parentId: transactionId,
      account,
      date,
      payee,
      subtransactions,
      generateId: randomUUID,
    })
  );
  return null;
}
