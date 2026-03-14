// ----------------------------
// CREATE TAG TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { createTag } from '../../../actual-api.js';

export const schema = {
  name: 'create-tag',
  description: 'Create a new tag',
  inputSchema: {
    type: 'object',
    properties: {
      tag: {
        type: 'string',
        description: 'Name of the tag',
      },
      color: {
        type: 'string',
        description: 'Color of the tag (e.g. hex color code)',
      },
      description: {
        type: 'string',
        description: 'Description of the tag',
      },
    },
    required: ['tag'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.tag || typeof args.tag !== 'string') {
      return errorFromCatch('tag is required and must be a string');
    }

    const data: Record<string, unknown> = { tag: args.tag };
    if (args.color) {
      data.color = args.color;
    }
    if (args.description) {
      data.description = args.description;
    }

    const id: string = await createTag(data as Parameters<typeof createTag>[0]);

    return successWithJson('Successfully created tag ' + id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
