import * as api from "../../actual-api.js";
import type { Payee } from "../types/domain.js";

export async function createPayee(payee: Payee): Promise<string> {
  return api.createPayee(payee);
}

export async function updatePayee(id: string, payee: Payee) {
  return api.updatePayee(id, payee);
}

export async function deletePayee(id: string) {
  return api.deletePayee(id);
}
