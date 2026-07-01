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
import { isSplitTransaction, buildSplitConversion } from './build-split.js';

export const schema = {
  name: 'update-transaction',
  description:
    'Update an existing transaction. Can modify date, amount, payee, category, notes, cleared status, and subtransactions. Providing subtransactions on a non-split transaction converts it into a split; the children inherit the parent account and date automatically.',
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

    await applySplitConversion(transactionId, filteredUpdateData);

    await updateTransaction(transactionId, filteredUpdateData);

    return success(`Successfully updated transaction ${transactionId}. Updated fields: ${updatedFields}`);
  } catch (error) {
    return errorFromCatch(error);
  }
}

/**
 * When subtransactions are supplied, ensure the update payload will produce a
 * valid split.
 *
 * Actual only propagates the parent account to children when the transaction is
 * already a split. For a plain transaction we must rewrite the payload into a
 * proper conversion (see build-split.ts). Already-split transactions and empty
 * subtransaction arrays are left untouched — Actual handles those paths itself.
 * If the transaction can't be loaded we also leave the payload alone rather than
 * guess at an account.
 *
 * @param transactionId - The id of the transaction being updated
 * @param updateData - The filtered update payload, mutated in place when converting
 */
async function applySplitConversion(transactionId: string, updateData: Record<string, unknown>): Promise<void> {
  const requestedSubs = updateData.subtransactions;
  if (!Array.isArray(requestedSubs) || requestedSubs.length === 0) return;

  const existing = await getTransactionById(transactionId);
  if (!existing || isSplitTransaction(existing)) return;

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
      subtransactions: requestedSubs as UpdateSubtransaction[],
      generateId: randomUUID,
    })
  );
}
