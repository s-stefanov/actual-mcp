// ----------------------------
// DELETE TAG TOOL
// ----------------------------

import { deleteTag } from '../../../actual-api.js';
import { successWithJson, errorFromCatch } from '../../../utils/response.js';

export const schema = {
  name: 'delete-tag',
  description: 'Delete a tag',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'ID of the tag. Should be in UUID format.',
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

    await deleteTag(args.id);

    return successWithJson('Successfully deleted tag ' + args.id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
