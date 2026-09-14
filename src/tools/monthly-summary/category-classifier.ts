import type { Category, CategoryGroup } from '../../core/types/domain.js';
import { CategoryMapper } from '../../core/mapping/category-mapper.js';

export class MonthlySummaryCategoryClassifier {
  classify(categories: Category[], groups: CategoryGroup[]): Set<string> {
    const mapper = new CategoryMapper(categories, groups);
    return new Set(
      categories.filter((category) => mapper.getGroupInfo(category.id)?.isIncome).map((category) => category.id)
    );
  }
}
