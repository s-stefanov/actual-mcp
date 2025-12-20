// ----------------------------
// CREATE TRANSACTION TOOL
// ----------------------------

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { successWithJson, errorFromCatch } from '../../utils/response.js';
import { createTransaction } from '../../actual-api.js';
import { CreateTransactionArgsSchema, type CreateTransactionArgs, ToolInput } from '../../types.js';

export const schema = {
  name: 'create-transaction',
  description: 'Create a new transaction. Use this to add transactions to accounts.',
  inputSchema: zodToJsonSchema(CreateTransactionArgsSchema) as ToolInput,
};

export async function handler(args: CreateTransactionArgs): Promise<CallToolResult> {
  try {
    // Validate with Zod schema
    const validatedArgs = CreateTransactionArgsSchema.parse(args);

    const { account: accountId, ...transactionData } = validatedArgs;

    const id: string = await createTransaction(accountId, transactionData);

    return successWithJson('Successfully created transaction ' + id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
