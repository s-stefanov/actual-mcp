import { getAccounts } from "../../actual-api.js";
import type { Account } from "../types/domain.js";

export async function fetchAllAccounts(): Promise<Account[]> {
  return getAccounts();
}
