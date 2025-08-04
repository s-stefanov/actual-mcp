import { getCategories, getCategoryGroups } from '../../actual-api.js';
import type { Category, CategoryGroup } from '../types/domain.js';

export async function fetchAllCategories(): Promise<Category[]> {
  return getCategories();
}

export async function fetchAllCategoryGroups(): Promise<CategoryGroup[]> {
  return getCategoryGroups();
}
