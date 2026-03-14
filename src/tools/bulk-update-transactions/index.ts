import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { toJSONSchema } from 'zod';
import { success, errorFromCatch } from '../../utils/response.js';
import { updateTransaction } from '../../actual-api.js';
import { BulkUpdateTransactionsArgsSchema, type BulkUpdateTransactionsArgs, ToolInput } from '../../types.js';

export const schema = {
  name: 'bulk-update-transactions',
  description:
    'Update multiple transactions in a single operation. Each transaction must include an id and at least one field to update. Returns a summary of successful updates and any errors.',
  inputSchema: toJSONSchema(BulkUpdateTransactionsArgsSchema) as ToolInput,
};

export async function handler(args: BulkUpdateTransactionsArgs): Promise<CallToolResult> {
  try {
    const { transactions } = BulkUpdateTransactionsArgsSchema.parse(args);

    let updated = 0;
    const errors: Array<{ id: string; message: string }> = [];

    for (const txn of transactions) {
      const { id, ...data } = txn;

      // Filter out undefined values to only send fields that were explicitly provided
      const filteredData = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));

      if (Object.keys(filteredData).length === 0) {
        errors.push({ id, message: 'No update fields provided' });
        continue;
      }

      try {
        await updateTransaction(id, filteredData);
        updated++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push({ id, message });
      }
    }

    const errorWord = errors.length === 1 ? 'error' : 'errors';
    let summary = `Bulk update complete: ${updated} updated, ${errors.length} ${errorWord}`;

    if (errors.length > 0) {
      summary += '\n\nErrors:\n' + errors.map((e) => `- ${e.id}: ${e.message}`).join('\n');
    }

    return success(summary);
  } catch (err) {
    return errorFromCatch(err);
  }
}
