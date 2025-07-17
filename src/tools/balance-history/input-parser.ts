// Parses and validates input arguments for balance-history tool

export interface BalanceHistoryInput {
  accountId: string;
  includeOffBudget: boolean;
  months: number;
}

export class BalanceHistoryInputParser {
  parse(args: any): BalanceHistoryInput {
    if (!args || typeof args !== "object") {
      throw new Error("Arguments must be an object");
    }
    const { accountId, includeOffBudget, months } = args;
    return {
      accountId,
      includeOffBudget: includeOffBudget ?? false,
      months: typeof months === "number" && months > 0 ? months : 12,
    };
  }
}
