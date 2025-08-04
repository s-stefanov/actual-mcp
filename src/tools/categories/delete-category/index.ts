// ----------------------------
// DELETE CATEGORY TOOL
// ----------------------------

import { deleteCategory } from '../../../actual-api.js';
import { successWithJson, errorFromCatch } from '../../../utils/response.js';

export const schema = {
  name: 'delete-category',
  description: 'Delete a category',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'ID of the category. Should be in UUID format.',
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

    await deleteCategory(args.id);

    return successWithJson('Successfully deleted category ' + args.id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
