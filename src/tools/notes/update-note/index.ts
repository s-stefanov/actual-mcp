// ----------------------------
// UPDATE NOTE TOOL
// ----------------------------

import { updateNote } from '../../../actual-automation-api.js';
import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { NOTE_TARGETS, noteIdFor } from '../note-id.js';
import type { NoteTarget } from '../note-id.js';

export const schema = {
  name: 'update-note',
  description:
    'Write the note on an account, category, category group or budget month, replacing its text. ' +
    'Budget templates live in category notes as "#template ..." lines; run check-budget-templates after editing them. ' +
    'An empty string clears the note.',
  inputSchema: {
    type: 'object',
    properties: {
      target: { type: 'string', enum: NOTE_TARGETS, description: 'Kind of object the note belongs to.' },
      id: { type: 'string', description: 'The object ID, or YYYY-MM for a budget month.' },
      note: { type: 'string', description: 'The full note text (Markdown).' },
    },
    required: ['target', 'id', 'note'],
    additionalProperties: false,
  },
};

/**
 * Saves a note under the ID the Actual UI reads for the target.
 *
 * @param args - `target`, `id` and `note`
 * @returns A success message, or an error response
 */
export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!NOTE_TARGETS.includes(args.target as NoteTarget)) {
      return errorFromCatch(`target must be one of ${NOTE_TARGETS.join(', ')}`);
    }
    if (typeof args.id !== 'string' || !args.id) {
      return errorFromCatch('id is required and must be a string');
    }
    if (args.target === 'budget-month' && !/^\d{4}-\d{2}$/.test(args.id)) {
      return errorFromCatch('For a budget month, id must be YYYY-MM');
    }
    if (typeof args.note !== 'string') {
      return errorFromCatch('note is required and must be a string');
    }

    await updateNote(noteIdFor(args.target as NoteTarget, args.id), args.note);

    return successWithJson(`Saved the note on ${args.target} ${args.id}`);
  } catch (err) {
    return errorFromCatch(err);
  }
}
