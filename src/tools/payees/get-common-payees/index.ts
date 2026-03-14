// ----------------------------
// GET COMMON PAYEES TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { fetchCommonPayees } from '../../../core/data/fetch-common-payees.js';
import type { Payee } from '../../../types.js';

export const schema = {
  name: 'get-common-payees',
  description: 'Retrieve a list of commonly used payees',
  inputSchema: {
    type: 'object',
    description: 'This tool does not accept any arguments.',
    properties: {},
    additionalProperties: false,
  },
};

export async function handler(): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const payees: Payee[] = await fetchCommonPayees();

    const structured = payees.map((payee) => ({
      id: payee.id,
      name: payee.name,
      transfer_acct: payee.transfer_acct || '(not a transfer payee)',
    }));

    return successWithJson(structured);
  } catch (err) {
    return errorFromCatch(err);
  }
}
