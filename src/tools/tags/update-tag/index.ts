// ----------------------------
// UPDATE TAG TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { updateTag } from '../../../actual-api.js';

export const schema = {
  name: 'update-tag',
  description: 'Update a tag',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'ID of the tag. Should be in UUID format.',
      },
      tag: {
        type: 'string',
        description: 'New name for the tag',
      },
      color: {
        type: 'string',
        description: 'New color for the tag (e.g. hex color code)',
      },
      description: {
        type: 'string',
        description: 'New description for the tag',
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

    const data: Record<string, unknown> = {};
    if (args.tag) {
      data.tag = args.tag;
    }
    if (args.color) {
      data.color = args.color;
    }
    if (args.description) {
      data.description = args.description;
    }

    if (Object.keys(data).length === 0) {
      return errorFromCatch('at least one field to update must be provided (tag, color, description)');
    }

    await updateTag(args.id, data as Parameters<typeof updateTag>[1]);

    return successWithJson('Successfully updated tag ' + args.id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
