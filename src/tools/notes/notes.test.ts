import { describe, it, expect, vi, beforeEach } from 'vitest';
import { noteIdFor, parseNoteId } from './note-id.js';
import { handler as getNotesHandler } from './get-notes/index.js';
import { handler as updateNoteHandler } from './update-note/index.js';

vi.mock('../../actual-automation-api.js', () => ({
  getAllNotes: vi.fn(),
  getNote: vi.fn(),
  updateNote: vi.fn(),
}));
vi.mock('../../actual-api.js', () => ({
  getAccounts: vi.fn(),
  getCategoryGroups: vi.fn(),
}));

import { getAllNotes, getNote, updateNote } from '../../actual-automation-api.js';
import { getAccounts, getCategoryGroups } from '../../actual-api.js';

const text = (result: { content: Array<{ type: string; text?: string }> }): string => result.content[0].text ?? '';

describe('note ids', () => {
  it('uses the prefixes the Actual UI reads', () => {
    expect(noteIdFor('account', 'a1')).toBe('account-a1');
    expect(noteIdFor('budget-month', '2026-11')).toBe('budget-2026-11');
    expect(noteIdFor('category', 'c1')).toBe('c1');
    expect(noteIdFor('category-group', 'g1')).toBe('g1');
  });

  it('parses stored ids back, telling groups from categories', () => {
    const groups = new Set(['g1']);
    expect(parseNoteId('account-a1', groups)).toEqual({ target: 'account', id: 'a1' });
    // Reason: the Actual UI has no schedule note editor, so these are not listed.
    expect(parseNoteId('schedule-s1', groups)).toBeNull();
    expect(parseNoteId('budget-2026-11', groups)).toEqual({ target: 'budget-month', id: '2026-11' });
    expect(parseNoteId('g1', groups)).toEqual({ target: 'category-group', id: 'g1' });
    expect(parseNoteId('c1', groups)).toEqual({ target: 'category', id: 'c1' });
  });
});

describe('get-notes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAccounts).mockResolvedValue([{ id: 'a1', name: 'Loan – Ana' }] as never);
    vi.mocked(getCategoryGroups).mockResolvedValue([
      { id: 'g1', name: 'Bills', categories: [{ id: 'c1', name: 'Internet' }] },
    ] as never);
  });

  it('reads one note by target and id', async () => {
    vi.mocked(getNote).mockResolvedValue({ id: 'account-a1', note: 'Ana owes 120' });

    const result = JSON.parse(text(await getNotesHandler({ target: 'account', id: 'a1' })));

    expect(getNote).toHaveBeenCalledWith('account-a1');
    expect(result.note).toBe('Ana owes 120');
  });

  it('returns null for a missing note', async () => {
    vi.mocked(getNote).mockResolvedValue(null);

    expect(JSON.parse(text(await getNotesHandler({ target: 'category', id: 'c1' }))).note).toBeNull();
  });

  it('lists non-empty notes with the names of what they belong to', async () => {
    vi.mocked(getAllNotes).mockResolvedValue([
      { id: 'c1', note: '#template 100' },
      { id: 'account-a1', note: 'Ana owes 120' },
      { id: 'g1', note: '' },
      { id: 'budget-2026-11', note: 'Tight month' },
      { id: 'schedule-s1', note: 'invisible in the app' },
    ]);

    const rows = JSON.parse(text(await getNotesHandler({})));

    expect(rows).toEqual([
      { target: 'category', id: 'c1', name: 'Internet', note: '#template 100' },
      { target: 'account', id: 'a1', name: 'Loan – Ana', note: 'Ana owes 120' },
      { target: 'budget-month', id: '2026-11', name: '2026-11', note: 'Tight month' },
    ]);
  });

  it('rejects a target without an id', async () => {
    expect((await getNotesHandler({ target: 'account' })).isError).toBe(true);
  });
});

describe('update-note', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saves an account note under the account- prefix', async () => {
    const result = await updateNoteHandler({ target: 'account', id: 'a1', note: 'Ana owes 120' });

    expect(result.isError).toBeFalsy();
    expect(updateNote).toHaveBeenCalledWith('account-a1', 'Ana owes 120');
  });

  it('clears a note with an empty string', async () => {
    await updateNoteHandler({ target: 'category', id: 'c1', note: '' });

    expect(updateNote).toHaveBeenCalledWith('c1', '');
  });

  it.each([
    [{ target: 'payee', id: 'p1', note: 'x' }, 'target'],
    [{ target: 'schedule', id: 's1', note: 'x' }, 'target'],
    [{ target: 'account', note: 'x' }, 'id'],
    [{ target: 'budget-month', id: 'Nov', note: 'x' }, 'YYYY-MM'],
    [{ target: 'account', id: 'a1' }, 'note'],
  ])('rejects %j', async (args, message) => {
    const result = await updateNoteHandler(args);

    expect(result.isError).toBe(true);
    expect(text(result)).toContain(message);
    expect(updateNote).not.toHaveBeenCalled();
  });
});
