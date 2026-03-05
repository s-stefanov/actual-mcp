import { getCommonPayees } from '../../actual-api.js';
import type { Payee } from '../types/domain.js';

export async function fetchCommonPayees(): Promise<Payee[]> {
  return getCommonPayees();
}
