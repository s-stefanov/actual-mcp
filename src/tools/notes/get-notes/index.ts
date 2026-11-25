// ----------------------------
// GET NOTES TOOL
// ----------------------------

import { getAllNotes, getNote } from '../../../actual-automation-api.js';
import { getAccounts, getCategoryGroups } from '../../../actual-api.js';
import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { NOTE_TARGETS, noteIdFor, parseNoteId } from '../note-id.js';
import type { NoteTarget } from '../note-id.js';

export const schema = {
  name: 'get-notes',
  description:
    'Read notes on accounts, categories, category groups and budget months. Category notes hold ' +
    'budget templates (#template lines). Pass target and id for one note, or nothing to list every non-empty note.',
  inputSchema: {
    type: 'object',
    properties: {
      target: { type: 'string', enum: NOTE_TARGETS, description: 'Kind of object the note belongs to.' },
      id: { type: 'string', description: 'The object ID, or YYYY-MM for a budget month.' },
    },
    additionalProperties: false,
  },
};

/**
 * Builds a lookup from object ID to display name for accounts, categories and groups.
 */
async function loadNames(): Promise<{ names: Map<string, string>; groupIds: Set<string> }> {
  const [accounts, groups] = await Promise.all([getAccounts(), getCategoryGroups()]);
  const names = new Map<string, string>();
  const groupIds = new Set(groups.map((g) => g.id));
  accounts.forEach((a) => names.set(a.id, a.name));
  groups.forEach((g) => {
    names.set(g.id, g.name);
    (g.categories ?? []).forEach((c) => names.set(c.id, c.name));
  });
  return { names, groupIds };
}

/**
 * Returns one note, or every non-empty note with the name of the object it belongs to.
 *
 * @param args - Optional `target` and `id`
 * @returns Notes as JSON, or an error response
 */
export async function handler(
  args: Record<string, unknown> = {}
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (args.target !== undefined || args.id !== undefined) {
      if (!NOTE_TARGETS.includes(args.target as NoteTarget) || typeof args.id !== 'string' || !args.id) {
        return errorFromCatch(`Pass both target (${NOTE_TARGETS.join(', ')}) and id`);
      }
      const noteId = noteIdFor(args.target as NoteTarget, args.id);
      const note = await getNote(noteId);
      return successWithJson({ target: args.target, id: args.id, note: note?.note ?? null });
    }

    const [notes, { names, groupIds }] = await Promise.all([getAllNotes(), loadNames()]);
    const result = notes
      .filter((n) => n.note && n.note.trim() !== '')
      .flatMap((n) => {
        const parsed = parseNoteId(n.id, groupIds);
        if (!parsed) {
          return [];
        }
        const { target, id } = parsed;
        return [{ target, id, name: names.get(id) ?? (target === 'budget-month' ? id : null), note: n.note }];
      });

    return successWithJson(result);
  } catch (err) {
    return errorFromCatch(err);
  }
}
