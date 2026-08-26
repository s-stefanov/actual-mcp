import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('../../../actual-api.js', () => ({
  getDashboardWidgets: vi.fn(),
  updateDashboard: vi.fn(),
}));

import { handler } from './index.js';
import { getDashboardWidgets, updateDashboard } from '../../../actual-api.js';
import { textContent } from '../../../utils/response.js';
import type { DashboardWidgetEntity } from '@actual-app/core/types/models';

const widgets = [
  {
    id: 'w1',
    dashboard_page_id: 'page-1',
    type: 'net-worth-card',
    x: 0,
    y: 0,
    width: 6,
    height: 2,
    meta: null,
    tombstone: false,
  },
  {
    id: 'w2',
    dashboard_page_id: 'page-1',
    type: 'markdown-card',
    x: 6,
    y: 0,
    width: 6,
    height: 2,
    meta: { content: '# Notes' },
    tombstone: false,
  },
] as unknown as DashboardWidgetEntity[];

describe('organize-dashboard handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDashboardWidgets).mockResolvedValue(widgets);
    vi.mocked(updateDashboard).mockResolvedValue(undefined);
  });

  it('sends only the id and the layout fields that were supplied', async () => {
    const result = await handler({ widgets: [{ id: 'w2', x: 0, y: 2 }] });

    expect(result.isError).toBeUndefined();
    // Reason: this handler skips schema conversion, so the stored widget's
    // parsed `meta` object and boolean `tombstone` must never be sent back.
    expect(updateDashboard).toHaveBeenCalledWith([{ id: 'w2', x: 0, y: 2 }]);
  });

  it('ignores non-numeric layout values rather than forwarding them', async () => {
    const result = await handler({ widgets: [{ id: 'w1', x: 3, width: 'wide' }] });

    expect(result.isError).toBeUndefined();
    expect(updateDashboard).toHaveBeenCalledWith([{ id: 'w1', x: 3 }]);
  });

  it('rejects ids that do not match an existing widget', async () => {
    const result = await handler({ widgets: [{ id: 'w1' }, { id: 'ghost' }] });

    expect(result.isError).toBe(true);
    expect(textContent(result.content[0])).toContain('Unknown widget ids: ghost');
    expect(updateDashboard).not.toHaveBeenCalled();
  });

  it('rejects an empty or missing widgets array', async () => {
    for (const args of [{ widgets: [] }, {}]) {
      const result = await handler(args);
      expect(result.isError).toBe(true);
      expect(textContent(result.content[0])).toContain('widgets must be a non-empty array');
    }
    expect(updateDashboard).not.toHaveBeenCalled();
  });
});
