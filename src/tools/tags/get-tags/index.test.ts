import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('../../../actual-api.js', () => ({
  getTags: vi.fn(),
}));

import { handler, schema } from './index.js';
import { getTags } from '../../../actual-api.js';

describe('get-tags tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct name and description', () => {
      expect(schema.name).toBe('get-tags');
      expect(schema.description).toContain('tags');
    });

    it('should have inputSchema defined', () => {
      expect(schema.inputSchema).toBeDefined();
      expect(schema.inputSchema.type).toBe('object');
    });
  });

  describe('handler - happy path', () => {
    it('should return all tags with structured fields', async () => {
      vi.mocked(getTags).mockResolvedValue([
        { id: 'tag-1', tag: 'groceries', color: '#ff0000', description: 'Food shopping' },
        { id: 'tag-2', tag: 'recurring', color: '#00ff00', description: 'Monthly bills' },
      ]);

      const result = await handler();

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      const data = JSON.parse(text);
      expect(data).toHaveLength(2);
      expect(data[0]).toEqual({
        id: 'tag-1',
        tag: 'groceries',
        color: '#ff0000',
        description: 'Food shopping',
      });
    });
  });

  describe('handler - empty tags', () => {
    it('should return empty array when no tags exist', async () => {
      vi.mocked(getTags).mockResolvedValue([]);

      const result = await handler();

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      const data = JSON.parse(text);
      expect(data).toEqual([]);
    });
  });

  describe('handler - missing optional fields', () => {
    it('should use fallback values for missing color and description', async () => {
      vi.mocked(getTags).mockResolvedValue([{ id: 'tag-1', tag: 'test', color: '', description: '' }]);

      const result = await handler();

      const text = (result.content[0] as { text: string }).text;
      const data = JSON.parse(text);
      expect(data[0].color).toBeNull();
      expect(data[0].description).toBeNull();
    });
  });

  describe('handler - error', () => {
    it('should return error when getTags throws', async () => {
      vi.mocked(getTags).mockRejectedValue(new Error('API connection failed'));

      const result = await handler();

      expect(result.isError).toBe(true);
    });
  });
});
