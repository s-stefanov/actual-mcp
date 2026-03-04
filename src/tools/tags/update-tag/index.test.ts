import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('../../../actual-api.js', () => ({
  updateTag: vi.fn(),
}));

import { handler, schema } from './index.js';
import { updateTag } from '../../../actual-api.js';

describe('update-tag tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct name and description', () => {
      expect(schema.name).toBe('update-tag');
      expect(schema.description).toContain('Update');
    });

    it('should require id field', () => {
      expect(schema.inputSchema.required).toContain('id');
    });
  });

  describe('handler - happy path', () => {
    it('should update a tag with all fields', async () => {
      vi.mocked(updateTag).mockResolvedValue(undefined);

      const result = await handler({
        id: 'tag-1',
        tag: 'new-name',
        color: '#00ff00',
        description: 'Updated desc',
      });

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('tag-1');
      expect(updateTag).toHaveBeenCalledWith('tag-1', {
        tag: 'new-name',
        color: '#00ff00',
        description: 'Updated desc',
      });
    });

    it('should update only the tag name', async () => {
      vi.mocked(updateTag).mockResolvedValue(undefined);

      await handler({ id: 'tag-2', tag: 'renamed' });

      expect(updateTag).toHaveBeenCalledWith('tag-2', { tag: 'renamed' });
    });
  });

  describe('handler - validation', () => {
    it('should return error when id is missing', async () => {
      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(updateTag).not.toHaveBeenCalled();
    });

    it('should return error when id is not a string', async () => {
      const result = await handler({ id: 123 });

      expect(result.isError).toBe(true);
      expect(updateTag).not.toHaveBeenCalled();
    });

    it('should return error when no update fields provided', async () => {
      const result = await handler({ id: 'tag-1' });

      expect(result.isError).toBe(true);
      expect(updateTag).not.toHaveBeenCalled();
    });
  });

  describe('handler - error', () => {
    it('should return error when updateTag throws', async () => {
      vi.mocked(updateTag).mockRejectedValue(new Error('Tag not found'));

      const result = await handler({ id: 'tag-bad', tag: 'test' });

      expect(result.isError).toBe(true);
    });
  });
});
