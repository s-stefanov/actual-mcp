import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { success, errorFromCatch } from '../../utils/response.js';
import { updateTransaction } from '../../actual-api.js';
import { UpdateTransactionArgsSchema, type UpdateTransactionArgs, ToolInput } from '../../types.js';

export const schema = {
  name: 'update-transaction',
  description:
    'Update an existing transaction. Can modify date, amount, payee, category, notes, cleared status, and subtransactions.',
  inputSchema: zodToJsonSchema(UpdateTransactionArgsSchema) as ToolInput,
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

    await updateTransaction(transactionId, filteredUpdateData);

    const updatedFields = Object.keys(filteredUpdateData).join(', ');
    return success(`Successfully updated transaction ${transactionId}. Updated fields: ${updatedFields}`);
  } catch (error) {
    return errorFromCatch(error);
  }
}
