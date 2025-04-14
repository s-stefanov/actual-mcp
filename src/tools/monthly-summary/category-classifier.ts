import type { Category } from "../../types.js";

export class MonthlySummaryCategoryClassifier {
  classify(categories: Category[]): {
    incomeCategories: Set<string>;
    investmentSavingsCategories: Set<string>;
  } {
    const incomeCategories = new Set<string>();
    const investmentSavingsCategories = new Set<string>();

    categories.forEach((cat) => {
      if (cat.is_income) incomeCategories.add(cat.id);
      if (
        cat.name.toLowerCase().includes("investment") ||
        cat.name.toLowerCase().includes("vacation") ||
        cat.name.toLowerCase().includes("savings")
      ) {
        investmentSavingsCategories.add(cat.id);
      }
    });

    return { incomeCategories, investmentSavingsCategories };
  }
}
