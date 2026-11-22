import { describe, it, expect } from 'vitest';
import { errorFromCatch, textContent } from './response.js';

describe('errorFromCatch', () => {
  it('includes the details of a thrown object that has no message', () => {
    const result = errorFromCatch({ error: 'out-of-sync-migrations' });
    const text = textContent(result.content[0]);
    expect(result.isError).toBe(true);
    expect(text).toContain('out-of-sync-migrations');
    expect(text).not.toContain('[object Object]');
  });

  it('keeps nested fields of a thrown object', () => {
    const result = errorFromCatch({ error: { reason: 'internal' } });
    expect(result.isError).toBe(true);
    expect(textContent(result.content[0])).toContain('internal');
  });

  it('does not throw on a circular thrown object', () => {
    const circular: Record<string, unknown> = { name: 'loop' };
    circular.self = circular;
    const result = errorFromCatch(circular);
    expect(result.isError).toBe(true);
    const text = textContent(result.content[0]);
    expect(text).not.toBe('Error: [object Object]');
    expect(text).toContain('loop');
  });

  it('keeps existing output for Error, message objects and strings', () => {
    const cases: Array<[unknown, string]> = [
      [new Error('boom'), 'Error: boom'],
      [{ message: 'text' }, 'Error: text'],
      ['plain', 'Error: plain'],
    ];
    for (const [input, expected] of cases) {
      const result = errorFromCatch(input);
      expect(result.isError).toBe(true);
      expect(textContent(result.content[0])).toBe(expected);
    }
  });
});
