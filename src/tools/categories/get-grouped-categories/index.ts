// ----------------------------
// GET GROUPED CATEGORY TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { fetchAllCategoryGroups } from '../../../core/data/fetch-categories.js';
import type { CategoryGroup } from '../../../core/types/domain.js';

export const schema = {
  name: 'get-grouped-categories',
  description: 'Retrieve a list of all category groups with their id, name, type and category list.',
  inputSchema: {
    type: 'object',
    description: 'This tool does not accept any arguments.',
    properties: {},
    additionalProperties: false,
  },
};

export async function handler(): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const categoryGroups: CategoryGroup[] = await fetchAllCategoryGroups();

    return successWithJson(categoryGroups);
  } catch (err) {
    return errorFromCatch(err);
  }
}
