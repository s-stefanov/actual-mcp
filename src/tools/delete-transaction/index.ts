import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { success, errorFromCatch } from '../../utils/response.js';
import { deleteTransaction } from '../../actual-api.js';
import { ToolInput } from '../../types.js';

const DeleteTransactionArgsSchema = z.object({
  id: z.string().describe('Required. The ID of the transaction to delete'),
});

type DeleteTransactionArgs = z.infer<typeof DeleteTransactionArgsSchema>;

export const schema = {
  name: 'delete-transaction',
  description: 'Delete a transaction by its ID. This action is permanent and cannot be undone.',
  inputSchema: zodToJsonSchema(DeleteTransactionArgsSchema) as ToolInput,
};

export async function handler(args: DeleteTransactionArgs): Promise<CallToolResult> {
  try {
    const validatedArgs = DeleteTransactionArgsSchema.parse(args);
    const result = await deleteTransaction(validatedArgs.id);

    // API returns array of deleted transactions - empty means nothing was found
    if (Array.isArray(result) && result.length === 0) {
      return {
        content: [{ type: 'text', text: `Transaction ${validatedArgs.id} not found or already deleted` }],
        isError: true,
      };
    }

    return success(`Successfully deleted transaction ${validatedArgs.id}`);
  } catch (error) {
    return errorFromCatch(error);
  }
}
