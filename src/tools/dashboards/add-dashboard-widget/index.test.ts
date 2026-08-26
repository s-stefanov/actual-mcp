import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('../../../actual-api.js', () => ({
  addDashboardWidget: vi.fn(),
  getDashboardPages: vi.fn(),
}));

import { handler } from './index.js';
import { addDashboardWidget, getDashboardPages } from '../../../actual-api.js';
import { textContent } from '../../../utils/response.js';

describe('add-dashboard-widget handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDashboardPages).mockResolvedValue([{ id: 'page-1', name: 'Default', tombstone: false }]);
    vi.mocked(addDashboardWidget).mockResolvedValue(undefined);
  });

  it('adds a widget to an existing page', async () => {
    const args = { dashboard_page_id: 'page-1', type: 'markdown-card', meta: { content: '# Hi' }, x: 0, y: 0 };

    const result = await handler(args);

    expect(result.isError).toBeUndefined();
    expect(addDashboardWidget).toHaveBeenCalledWith(args);
  });

  it('rejects an unknown page instead of orphaning the widget', async () => {
    // Reason: the underlying handler accepts any page id silently, leaving a
    // widget no dashboard renders.
    const result = await handler({ dashboard_page_id: 'ghost', type: 'markdown-card' });

    expect(result.isError).toBe(true);
    expect(textContent(result.content[0])).toContain('Dashboard page not found: ghost');
    expect(addDashboardWidget).not.toHaveBeenCalled();
  });

  it('requires both a page id and a type', async () => {
    const noPage = await handler({ type: 'markdown-card' });
    expect(noPage.isError).toBe(true);
    expect(textContent(noPage.content[0])).toContain('dashboard_page_id is required');

    const noType = await handler({ dashboard_page_id: 'page-1' });
    expect(noType.isError).toBe(true);
    expect(textContent(noType.content[0])).toContain('type is required');

    expect(addDashboardWidget).not.toHaveBeenCalled();
  });
});
