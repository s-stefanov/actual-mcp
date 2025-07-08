// ----------------------------
// GET CATEGORIES TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from "../../utils/response.js";
import {
  fetchAllCategories,
  fetchAllCategoryGroups,
} from "../../core/data/fetch-categories.js";
import type { Category, CategoryGroup } from "../../core/types/domain.js";
import { CategoryMapper } from "../../core/mapping/category-mapper.js";

export const schema = {
  name: "get-categories",
  description: "Retrieve a list of all categories with their name and ID.",
  inputSchema: {
    type: "object",
    description: "This tool does not accept any arguments.",
    properties: {},
    additionalProperties: false,
  },
};

export async function handler(
  args: unknown
): Promise<
  ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>
> {
  try {
    const categories: Category[] = await fetchAllCategories();
    const categoryGroups: CategoryGroup[] = await fetchAllCategoryGroups();

    const categoryMapper = new CategoryMapper(categories, categoryGroups);

    const structured = categories.map((category) => ({
      id: category.id,
      name: categoryMapper.getCategoryName(category.id),
      group: categoryMapper.getGroupInfo(category.id),
      is_income: category.is_income || false,
    }));

    return successWithJson(structured);
  } catch (err) {
    return errorFromCatch(err);
  }
}
