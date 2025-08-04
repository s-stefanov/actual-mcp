import { getPayees } from '../../actual-api.js';
import type { Payee } from '../types/domain.js';

export async function fetchAllPayees(): Promise<Payee[]> {
  return getPayees();
}
