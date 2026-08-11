import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { toJSONSchema } from 'zod';
import { error, success, errorFromCatch } from '../../utils/response.js';
import { updateTransaction } from '../../actual-api.js';
import { UpdateTransactionArgsSchema, type UpdateTransactionArgs, ToolInput } from '../../types.js';

export const schema = {
  name: 'update-transaction',
  description:
    'Update an existing transaction. Can modify date, amount, payee, category, notes, cleared status, and subtransactions.',
  inputSchema: toJSONSchema(UpdateTransactionArgsSchema) as ToolInput,
};

export async function handler(args: UpdateTransactionArgs): Promise<CallToolResult> {
  try {
    // Reason: payee_name is only resolved on the create/import path in @actual-app/api.
    // On update it reaches an unguarded schema-conform step that throws asynchronously
    // after the call already appears to succeed, crashing the whole server process
    // (upstream https://github.com/s-stefanov/actual-mcp/issues/150). Reject it here
    // with a clear alternative rather than silently dropping it or letting it crash.
    if (args && typeof args === 'object' && 'payee_name' in args) {
      return error(
        'payee_name is not supported on update-transaction (it can crash the server). ' +
          'Use create-payee to get or create a payee, then pass its id via the payee field instead.'
      );
    }

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
