// ----------------------------
// UPDATE CATEGORY TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { updateCategory, saveNote } from '../../../actual-api.js';

export const schema = {
  name: 'update-category',
  description: 'Update a category',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'ID of the category. Should be in UUID format.',
      },
      name: {
        type: 'string',
        description: 'New name for the category. If not changing, repeat.',
      },
      groupId: {
        type: 'string',
        description: 'New ID for the category group. Should be in UUID format.',
      },
      note: {
        type: 'string',
        description: 'Note for the category. Used for budget template directives (e.g. "#template 250").',
      },
    },
    required: ['id', 'name'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.id || typeof args.id !== 'string') {
      return errorFromCatch('id is required and must be a string');
    }

    const data: Record<string, unknown> = {};
    if (args.name) {
      data.name = args.name;
    }
    if (args.groupId) {
      data.group_id = args.groupId;
    }

    await updateCategory(args.id, data);

    if (typeof args.note === 'string') {
      await saveNote(args.id, args.note);
    }

    return successWithJson('Successfully updated category ' + args.id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
