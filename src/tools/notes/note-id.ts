// ----------------------------
// NOTE IDS: how Actual keys the notes it shows for each kind of object
// ----------------------------

export const NOTE_TARGETS = ['account', 'category', 'category-group', 'budget-month'] as const;
export type NoteTarget = (typeof NOTE_TARGETS)[number];

/**
 * Builds the note ID the Actual UI reads for an object.
 *
 * Reason: account notes are stored under `account-<id>`; a note saved under the bare
 * account ID is never shown in the app.
 *
 * @param target - Kind of object the note belongs to
 * @param id - The object's ID, or YYYY-MM for a budget month
 * @returns The note ID
 */
export function noteIdFor(target: NoteTarget, id: string): string {
  switch (target) {
    case 'account':
      return `account-${id}`;
    case 'budget-month':
      return `budget-${id}`;
    case 'category':
    case 'category-group':
      return id;
  }
}

/**
 * Splits a stored note ID back into its target kind and object ID.
 *
 * @param noteId - A stored note ID
 * @param categoryGroupIds - IDs of category groups, to tell them apart from categories
 * @returns The target kind and object ID, or null for notes the Actual UI does not show
 */
export function parseNoteId(noteId: string, categoryGroupIds: Set<string>): { target: NoteTarget; id: string } | null {
  if (noteId.startsWith('account-')) {
    return { target: 'account', id: noteId.slice('account-'.length) };
  }
  if (noteId.startsWith('schedule-')) {
    return null;
  }
  if (/^budget-\d{4}-\d{2}$/.test(noteId)) {
    return { target: 'budget-month', id: noteId.slice('budget-'.length) };
  }
  return { target: categoryGroupIds.has(noteId) ? 'category-group' : 'category', id: noteId };
}
