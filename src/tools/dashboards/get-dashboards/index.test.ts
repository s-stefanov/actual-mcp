import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('../../../actual-api.js', () => ({
  getDashboardPages: vi.fn(),
  getDashboardWidgets: vi.fn(),
}));

import { handler } from './index.js';
import { getDashboardPages, getDashboardWidgets } from '../../../actual-api.js';
import { textContent } from '../../../utils/response.js';
import type { DashboardWidgetEntity } from '@actual-app/core/types/models';

function widget(id: string, pageId: string, x: number, y: number): DashboardWidgetEntity {
  return {
    id,
    dashboard_page_id: pageId,
    type: 'markdown-card',
    x,
    y,
    width: 3,
    height: 2,
    meta: { content: id },
    tombstone: false,
  } as unknown as DashboardWidgetEntity;
}

describe('get-dashboards handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('groups widgets under their page, ordered top-left first', async () => {
    vi.mocked(getDashboardPages).mockResolvedValue([
      { id: 'page-1', name: 'Default', tombstone: false },
      { id: 'page-2', name: 'Spending Plan', tombstone: false },
    ]);
    vi.mocked(getDashboardWidgets).mockResolvedValue([
      widget('c', 'page-1', 6, 2),
      widget('a', 'page-1', 0, 0),
      widget('b', 'page-1', 6, 0),
      widget('d', 'page-2', 0, 0),
    ]);

    const result = await handler();
    const dashboards = JSON.parse(textContent(result.content[0]));

    expect(dashboards.map((d: { name: string }) => d.name)).toEqual(['Default', 'Spending Plan']);
    expect(dashboards[0].widgets.map((w: { id: string }) => w.id)).toEqual(['a', 'b', 'c']);
    expect(dashboards[1].widgets.map((w: { id: string }) => w.id)).toEqual(['d']);
  });

  it('returns a page with an empty widget list when it has none', async () => {
    vi.mocked(getDashboardPages).mockResolvedValue([{ id: 'page-1', name: 'Empty', tombstone: false }]);
    vi.mocked(getDashboardWidgets).mockResolvedValue([]);

    const result = await handler();
    const dashboards = JSON.parse(textContent(result.content[0]));

    expect(dashboards).toEqual([{ id: 'page-1', name: 'Empty', widgets: [] }]);
  });

  it('surfaces an API failure as a tool error', async () => {
    vi.mocked(getDashboardPages).mockRejectedValue(new Error('API Error'));
    vi.mocked(getDashboardWidgets).mockResolvedValue([]);

    const result = await handler();

    expect(result.isError).toBe(true);
    expect(textContent(result.content[0])).toContain('API Error');
  });
});
