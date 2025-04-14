import type { MonthData, Account } from "../../types.js";
import type { MonthlySummaryReportData } from "./types.js";

export class MonthlySummaryReportDataBuilder {
  build(
    start: string,
    end: string,
    accountId: string | undefined,
    accounts: Account[],
    sortedMonths: MonthData[],
    averages: any
  ): MonthlySummaryReportData {
    const accountName = accountId
      ? accounts.find((a) => a.id === accountId)?.name
      : undefined;

    return {
      start,
      end,
      accountId,
      accountName,
      sortedMonths,
      ...averages,
    };
  }
}
