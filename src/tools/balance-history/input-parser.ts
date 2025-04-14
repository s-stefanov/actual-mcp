// Parses and validates input arguments for balance-history tool

export interface BalanceHistoryInput {
  accountId: string;
  months: number;
}

export class BalanceHistoryInputParser {
  parse(args: any): BalanceHistoryInput {
    if (!args || typeof args !== "object") {
      throw new Error("Arguments must be an object");
    }
    const { accountId, months } = args;
    if (!accountId || typeof accountId !== "string") {
      throw new Error("accountId is required and must be a string");
    }
    return {
      accountId,
      months: typeof months === "number" && months > 0 ? months : 12,
    };
  }
}
