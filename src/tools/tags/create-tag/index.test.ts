import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('../../../actual-api.js', () => ({
  createTag: vi.fn(),
}));

import { handler, schema } from './index.js';
import { createTag } from '../../../actual-api.js';

describe('create-tag tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct name and description', () => {
      expect(schema.name).toBe('create-tag');
      expect(schema.description).toContain('Create');
    });

    it('should require tag field', () => {
      expect(schema.inputSchema.required).toContain('tag');
    });
  });

  describe('handler - happy path', () => {
    it('should create a tag with all fields', async () => {
      vi.mocked(createTag).mockResolvedValue('tag-new-123');

      const result = await handler({ tag: 'groceries', color: '#ff0000', description: 'Food shopping' });

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('tag-new-123');
      expect(createTag).toHaveBeenCalledWith({ tag: 'groceries', color: '#ff0000', description: 'Food shopping' });
    });

    it('should create a tag with only required field', async () => {
      vi.mocked(createTag).mockResolvedValue('tag-456');

      const result = await handler({ tag: 'recurring' });

      expect(result.isError).toBeUndefined();
      expect(createTag).toHaveBeenCalledWith({ tag: 'recurring' });
    });
  });

  describe('handler - validation', () => {
    it('should return error when tag is missing', async () => {
      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(createTag).not.toHaveBeenCalled();
    });

    it('should return error when tag is not a string', async () => {
      const result = await handler({ tag: 123 });

      expect(result.isError).toBe(true);
      expect(createTag).not.toHaveBeenCalled();
    });
  });

  describe('handler - error', () => {
    it('should return error when createTag throws', async () => {
      vi.mocked(createTag).mockRejectedValue(new Error('Database error'));

      const result = await handler({ tag: 'test' });

      expect(result.isError).toBe(true);
    });
  });
});
