// ----------------------------
// CREATE CATEGORY GROUP TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { createCategoryGroup } from '../../../actual-api.js';

export const schema = {
  name: 'create-category-group',
  description: 'Create a new category group',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the category',
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

    const id: string = await createCategoryGroup(data);

    return successWithJson('Successfully created category group ' + id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
