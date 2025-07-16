export class MonthlySummaryInputParser {
  parse(args: any): { months: number; accountId?: string } {
    const months = typeof args.months === 'number' && args.months > 0 ? args.months : 3;
    const accountId = typeof args.accountId === 'string' && args.accountId.length > 0 ? args.accountId : undefined;
    return { months, accountId };
  }
}
