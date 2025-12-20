import api from '@actual-app/api';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { initActualApi } from '../../actual-api.js';
import { success, errorFromCatch } from '../../utils/response.js';
import { UpdateTransactionArgsSchema, type UpdateTransactionArgs, ToolInput } from '../../types.js';

export const schema = {
  name: 'update-transaction',
  description: 'Update an existing transaction with new category, payee, notes, or amount',
  inputSchema: zodToJsonSchema(UpdateTransactionArgsSchema) as ToolInput,
};

export async function handler(args: UpdateTransactionArgs): Promise<CallToolResult> {
  try {
    await initActualApi();

    const { transactionId, categoryId, payeeId, notes, amount } = args;

    // Build update object with only provided fields
    const updateData: { category?: string; payee?: string; notes?: string; amount?: number } = {};

    if (categoryId !== undefined) {
      updateData.category = categoryId;
    }

    if (payeeId !== undefined) {
      updateData.payee = payeeId;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (amount !== undefined) {
      updateData.amount = amount;
    }

    // Update the transaction using the Actual API
    await api.updateTransaction(transactionId, updateData);

    return success(`Successfully updated transaction ${transactionId}`);
  } catch (error) {
    return errorFromCatch(error);
  }
}
