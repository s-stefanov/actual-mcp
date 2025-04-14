// Parses and validates input arguments for spending-by-category tool

export interface SpendingByCategoryInput {
  startDate: string;
  endDate: string;
  accountId?: string;
  includeIncome: boolean;
}

export class SpendingByCategoryInputParser {
  parse(args: any): SpendingByCategoryInput {
    if (!args || typeof args !== "object") {
      throw new Error("Arguments must be an object");
    }
    const { startDate, endDate, accountId, includeIncome } = args;
    if (!startDate || typeof startDate !== "string") {
      throw new Error("startDate is required and must be a string (YYYY-MM-DD)");
    }
    if (!endDate || typeof endDate !== "string") {
      throw new Error("endDate is required and must be a string (YYYY-MM-DD)");
    }
    return {
      startDate,
      endDate,
      accountId: accountId && typeof accountId === "string" ? accountId : undefined,
      includeIncome: typeof includeIncome === "boolean" ? includeIncome : false,
    };
  }
}
