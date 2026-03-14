// ----------------------------
// GET TAGS TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { getTags } from '../../../actual-api.js';

export const schema = {
  name: 'get-tags',
  description: 'Retrieve a list of all tags with their id, tag name, color and description.',
  inputSchema: {
    type: 'object',
    description: 'This tool does not accept any arguments.',
    properties: {},
    additionalProperties: false,
  },
};

export async function handler(): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const tags = await getTags();

    const structured = tags.map((t) => ({
      id: t.id,
      tag: t.tag,
      color: t.color || null,
      description: t.description || null,
    }));

    return successWithJson(structured);
  } catch (err) {
    return errorFromCatch(err);
  }
}
