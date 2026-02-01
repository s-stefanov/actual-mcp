// ----------------------------
// UPDATE ACCOUNT TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { updateAccount } from '../../../actual-api.js';

export const schema = {
  name: 'update-account',
  description: 'Update an existing account. Can rename or change off-budget status.',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'ID of the account to update. Should be in UUID format.',
      },
      name: {
        type: 'string',
        description: 'New name for the account',
      },
      offBudget: {
        type: 'boolean',
        description: 'Whether this is an off-budget (tracking) account',
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

    const fields: Record<string, unknown> = {};

    if (args.name !== undefined) {
      if (typeof args.name !== 'string') {
        return errorFromCatch('name must be a string');
      }
      fields.name = args.name;
    }
    if (args.offBudget !== undefined) {
      fields.offbudget = args.offBudget;
    }

    if (Object.keys(fields).length === 0) {
      return errorFromCatch('At least one field to update must be provided (name, offBudget)');
    }

    await updateAccount(args.id, fields);

    return successWithJson(`Successfully updated account ${args.id}`);
  } catch (err) {
    return errorFromCatch(err);
  }
}
