import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('../../../actual-api.js', () => ({
  deleteTag: vi.fn(),
}));

import { handler, schema } from './index.js';
import { deleteTag } from '../../../actual-api.js';

describe('delete-tag tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct name and description', () => {
      expect(schema.name).toBe('delete-tag');
      expect(schema.description).toContain('Delete');
    });

    it('should require id field', () => {
      expect(schema.inputSchema.required).toContain('id');
    });
  });

  describe('handler - happy path', () => {
    it('should delete a tag successfully', async () => {
      vi.mocked(deleteTag).mockResolvedValue(undefined);

      const result = await handler({ id: 'tag-1' });

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('tag-1');
      expect(deleteTag).toHaveBeenCalledWith('tag-1');
    });
  });

  describe('handler - validation', () => {
    it('should return error when id is missing', async () => {
      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(deleteTag).not.toHaveBeenCalled();
    });

    it('should return error when id is not a string', async () => {
      const result = await handler({ id: 42 });

      expect(result.isError).toBe(true);
      expect(deleteTag).not.toHaveBeenCalled();
    });
  });

  describe('handler - error', () => {
    it('should return error when deleteTag throws', async () => {
      vi.mocked(deleteTag).mockRejectedValue(new Error('Tag not found'));

      const result = await handler({ id: 'tag-bad' });

      expect(result.isError).toBe(true);
    });
  });
});
