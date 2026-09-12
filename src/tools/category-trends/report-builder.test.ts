import { describe, it, expect } from 'vitest';
import { CategoryTrendsReportBuilder } from './report-builder.js';
import type { CategoryTrendRow } from './types.js';

function row(name: string, trend: CategoryTrendRow['trend'], changePercent?: number): CategoryTrendRow {
  return {
    id: name,
    name,
    group: 'G',
    amountsByMonth: {},
    total: 100,
    average: 50,
    min: 0,
    max: 100,
    trend,
    changePercent,
  };
}

describe('CategoryTrendsReportBuilder', () => {
  it('ranks biggest movers by absolute change, regardless of direction', () => {
    const report = new CategoryTrendsReportBuilder().build({
      months: ['2026-07', '2026-08'],
      includeIncome: false,
      rows: [row('Small', 'rising', 10), row('BigDrop', 'falling', -97), row('BigRise', 'rising', 42)],
    });

    expect(report.biggestMovers.map((r) => r.name)).toEqual(['BigDrop', 'BigRise', 'Small']);
    expect(report.categories).toHaveLength(3);
    expect(report.amountsIn).toMatch(/cents/i);
  });

  it('excludes flat categories and those with no computed change', () => {
    const report = new CategoryTrendsReportBuilder().build({
      months: ['2026-07'],
      includeIncome: false,
      rows: [row('Flat', 'flat', 1), row('NoChange', 'rising', undefined), row('Real', 'falling', -20)],
    });

    expect(report.biggestMovers.map((r) => r.name)).toEqual(['Real']);
  });

  it('caps the mover list at ten', () => {
    const rows = Array.from({ length: 25 }, (_, i) => row(`c${i}`, 'rising', i + 10));

    const report = new CategoryTrendsReportBuilder().build({ months: ['2026-07'], includeIncome: false, rows });

    expect(report.biggestMovers).toHaveLength(10);
    expect(report.categories).toHaveLength(25);
  });

  it('returns empty lists when nothing matched', () => {
    const report = new CategoryTrendsReportBuilder().build({ months: [], includeIncome: true, rows: [] });

    expect(report.categories).toEqual([]);
    expect(report.biggestMovers).toEqual([]);
    expect(report.includeIncome).toBe(true);
  });
});
