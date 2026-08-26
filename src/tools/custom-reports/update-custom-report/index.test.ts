import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('../../../actual-api.js', () => ({
  getReports: vi.fn(),
  updateReport: vi.fn(),
}));

import { handler } from './index.js';
import { getReports, updateReport } from '../../../actual-api.js';
import { textContent } from '../../../utils/response.js';
import type { CustomReportEntity } from '@actual-app/core/types/models';

const existing = {
  id: 'report-1',
  name: 'Groceries',
  startDate: '2026-01-01',
  endDate: '2026-06-30',
  isDateStatic: false,
  dateRange: 'Last 6 months',
  mode: 'time',
  groupBy: 'Category',
  interval: 'Monthly',
  balanceType: 'Payment',
  showEmpty: false,
  showOffBudget: false,
  showHiddenCategories: false,
  includeCurrentInterval: true,
  showUncategorized: false,
  trimIntervals: false,
  showTrendLines: true,
  graphType: 'BarGraph',
  conditionsOp: 'and',
} as CustomReportEntity;

describe('update-report handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getReports).mockResolvedValue([existing]);
    vi.mocked(updateReport).mockResolvedValue(undefined);
  });

  it('merges the patch onto the saved report instead of replacing it', async () => {
    const result = await handler({ id: 'report-1', name: 'Groceries & Dining', graphType: 'LineGraph' });

    expect(result.isError).toBeUndefined();
    expect(updateReport).toHaveBeenCalledWith({
      ...existing,
      name: 'Groceries & Dining',
      graphType: 'LineGraph',
    });
    // Fields the caller did not mention must survive the update.
    const sent = vi.mocked(updateReport).mock.calls[0][0];
    expect(sent.interval).toBe('Monthly');
    expect(sent.showTrendLines).toBe(true);
  });

  it('returns an error when the report does not exist', async () => {
    const result = await handler({ id: 'missing' });

    expect(result.isError).toBe(true);
    expect(textContent(result.content[0])).toContain('Report not found: missing');
    expect(updateReport).not.toHaveBeenCalled();
  });

  it('returns an error when id is omitted', async () => {
    const result = await handler({ name: 'No id' });

    expect(result.isError).toBe(true);
    expect(textContent(result.content[0])).toContain('id is required');
    expect(updateReport).not.toHaveBeenCalled();
  });
});
