// Maps category IDs to names and groups.
import type { Category, CategoryGroup, CategoryGroupInfo } from '../types/domain.js';

export class CategoryMapper {
  categoryNames: Record<string, string> = {};
  groupNames: Record<string, string> = {};
  categoryToGroup: Record<string, CategoryGroupInfo> = {};
  categoryGroupsById: Map<string, CategoryGroup> = new Map();

  constructor(categories: Category[], categoryGroups: CategoryGroup[]) {
    categories.forEach((cat) => {
      this.categoryNames[cat.id] = cat.name;
    });
    categoryGroups.forEach((group) => {
      this.groupNames[group.id] = group.name;
      this.categoryGroupsById.set(group.id, group);
    });
    categories.forEach((cat) => {
      const group = this.categoryGroupsById.get(cat.group_id);
      this.categoryToGroup[cat.id] = {
        id: cat.group_id,
        name: group?.name ?? 'Unknown Group',
        isIncome: !!group?.is_income,
      };
    });
  }

  getCategoryName(categoryId: string): string {
    return this.categoryNames[categoryId] || 'Unknown Category';
  }

  getGroupInfo(categoryId: string): CategoryGroupInfo | undefined {
    return this.categoryToGroup[categoryId];
  }
}
