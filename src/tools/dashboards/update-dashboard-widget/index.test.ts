import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('../../../actual-api.js', () => ({
  getDashboardWidgets: vi.fn(),
  updateDashboardWidget: vi.fn(),
}));

import { handler } from './index.js';
import { getDashboardWidgets, updateDashboardWidget } from '../../../actual-api.js';
import { textContent } from '../../../utils/response.js';
import type { DashboardWidgetEntity } from '@actual-app/core/types/models';

const widget = {
  id: 'w1',
  dashboard_page_id: 'page-1',
  type: 'markdown-card',
  x: 0,
  y: 0,
  width: 4,
  height: 2,
  meta: { content: '# Old' },
  tombstone: false,
} as unknown as DashboardWidgetEntity;

describe('update-dashboard-widget handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDashboardWidgets).mockResolvedValue([widget]);
    vi.mocked(updateDashboardWidget).mockResolvedValue(undefined);
  });

  it('forwards only the supplied fields plus the id', async () => {
    const result = await handler({ id: 'w1', meta: { content: '# New' } });

    expect(result.isError).toBeUndefined();
    expect(updateDashboardWidget).toHaveBeenCalledWith({ id: 'w1', meta: { content: '# New' } });
  });

  it('rejects an unknown widget id', async () => {
    const result = await handler({ id: 'ghost' });

    expect(result.isError).toBe(true);
    expect(textContent(result.content[0])).toContain('Widget not found: ghost');
    expect(updateDashboardWidget).not.toHaveBeenCalled();
  });

  it('requires an id', async () => {
    const result = await handler({ meta: {} });

    expect(result.isError).toBe(true);
    expect(textContent(result.content[0])).toContain('id is required');
  });
});
