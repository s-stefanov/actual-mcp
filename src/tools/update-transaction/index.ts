import api from '@actual-app/api';
import { initActualApi } from '../../actual-api.js';
import { success, errorFromCatch } from '../../utils/response.js';

export const schema = {
  name: 'update-transaction',
  description: 'Update an existing transaction with new category, payee, notes, or amount',
  inputSchema: {
    type: 'object',
    properties: {
      transactionId: {
        type: 'string',
        description: 'The ID of the transaction to update',
      },
      categoryId: {
        type: 'string',
        description: 'The category ID to assign to the transaction',
      },
      payeeId: {
        type: 'string',
        description: 'The payee ID to assign to the transaction',
      },
      notes: {
        type: 'string',
        description: 'Notes to add to the transaction',
      },
      amount: {
        type: 'number',
        description: 'The amount to update (in cents)',
      },
    },
    required: ['transactionId'],
  },
};

export async function handler(args: any) {
  try {
    await initActualApi();

    const { transactionId, categoryId, payeeId, notes, amount } = args;

    // Build update object with only provided fields
    const updateData: Record<string, any> = {};

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
    const result = await api.updateTransaction(transactionId, updateData);

    return success(`Successfully updated transaction ${transactionId}`);
  } catch (error) {
    return errorFromCatch(error);
  }
}
