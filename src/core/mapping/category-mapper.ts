// Maps category IDs to names/groups and identifies income/savings/investment categories
import type { Category, CategoryGroup, CategoryGroupInfo } from '../types/domain.js';

export class CategoryMapper {
  categoryNames: Record<string, string> = {};
  groupNames: Record<string, string> = {};
  categoryToGroup: Record<string, CategoryGroupInfo> = {};
  investmentCategories: Set<string> = new Set();

  constructor(categories: Category[], categoryGroups: CategoryGroup[]) {
    categories.forEach((cat) => {
      this.categoryNames[cat.id] = cat.name;
    });
    categoryGroups.forEach((group) => {
      this.groupNames[group.id] = group.name;
    });
    categories.forEach((cat) => {
      const groupName = this.groupNames[cat.group_id] || 'Unknown Group';
      const isIncome = !!cat.is_income;
      const isSavingsOrInvestment =
        groupName.toLowerCase().includes('investment') || groupName.toLowerCase().includes('savings');
      this.categoryToGroup[cat.id] = {
        id: cat.group_id,
        name: groupName,
        isIncome,
        isSavingsOrInvestment,
      };
      if (isSavingsOrInvestment) {
        this.investmentCategories.add(cat.id);
      }
    });
  }

  getCategoryName(categoryId: string): string {
    return this.categoryNames[categoryId] || 'Unknown Category';
  }

  getGroupInfo(categoryId: string): CategoryGroupInfo | undefined {
    return this.categoryToGroup[categoryId];
  }

  isInvestmentCategory(categoryId: string): boolean {
    return this.investmentCategories.has(categoryId);
  }
}
