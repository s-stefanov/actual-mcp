// ----------------------------
// CREATE ACCOUNT TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { createAccount } from '../../../actual-api.js';

export const schema = {
  name: 'create-account',
  description: 'Create a new account in Actual Budget. Returns the new account ID.',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the account',
      },
      offBudget: {
        type: 'boolean',
        description: 'Whether this is an off-budget (tracking) account. Defaults to false.',
      },
      closed: {
        type: 'boolean',
        description: 'Whether this account is closed. Defaults to false.',
      },
      initialBalance: {
        type: 'number',
        description: 'Initial balance in cents (e.g., 12030 for $120.30). Defaults to 0.',
      },
    },
    required: ['name'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.name || typeof args.name !== 'string') {
      return errorFromCatch('name is required and must be a string');
    }

    const data: Record<string, unknown> = {
      name: args.name,
    };

    if (args.offBudget !== undefined) {
      data.offbudget = args.offBudget;
    }
    if (args.closed !== undefined) {
      data.closed = args.closed;
    }

    const initialBalance = typeof args.initialBalance === 'number' ? args.initialBalance : undefined;

    const id: string = await createAccount(data, initialBalance);

    return successWithJson(`Successfully created account '${args.name}' with ID: ${id}`);
  } catch (err) {
    return errorFromCatch(err);
  }
}
