import { getCategories, getCategoryGroups } from '../../actual-api.js';
import type { Category, CategoryGroup } from '../types/domain.js';

export async function fetchAllCategories(): Promise<Category[]> {
  const all = await getCategories();
  return all.filter((item): item is Category => 'group_id' in item);
}

export async function fetchAllCategoryGroups(): Promise<CategoryGroup[]> {
  return getCategoryGroups();
}
