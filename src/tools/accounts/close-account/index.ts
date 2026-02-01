// ----------------------------
// CLOSE ACCOUNT TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { closeAccount, reopenAccount } from '../../../actual-api.js';

export const schema = {
  name: 'close-account',
  description:
    'Close or reopen an account. Closing is non-destructive — all transactions are preserved. ' +
    'Optionally transfer the remaining balance to another account.',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'ID of the account. Should be in UUID format.',
      },
      reopen: {
        type: 'boolean',
        description: 'Set to true to reopen a previously closed account instead of closing it.',
      },
      transferAccountId: {
        type: 'string',
        description: 'Account ID to transfer the remaining balance to when closing. ' + 'Should be in UUID format.',
      },
      transferCategoryId: {
        type: 'string',
        description: 'Category ID for the transfer transaction. Should be in UUID format.',
      },
    },
    required: ['id'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.id || typeof args.id !== 'string') {
      return errorFromCatch('id is required and must be a string');
    }

    if (args.reopen === true) {
      await reopenAccount(args.id);
      return successWithJson(`Successfully reopened account ${args.id}`);
    }

    const transferAccountId = typeof args.transferAccountId === 'string' ? args.transferAccountId : undefined;
    const transferCategoryId = typeof args.transferCategoryId === 'string' ? args.transferCategoryId : undefined;

    await closeAccount(args.id, transferAccountId, transferCategoryId);

    return successWithJson(`Successfully closed account ${args.id}`);
  } catch (err) {
    return errorFromCatch(err);
  }
}
