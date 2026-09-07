import { createAccount, createCategoryGroup, createCategory, createPayee, addTransactions } from '@actual-app/api';

/**
 * Plain typed seed helpers (no builder DSL, spec §5). Each wraps the same
 * @actual-app/api create function src/actual-api.ts wraps. Called inside
 * api.runImport(...) in global-setup, against a freshly loaded budget.
 */

export async function seedAccount(name: string, balance: number): Promise<string> {
  // initialBalance is in cents; second arg to createAccount seeds the balance.
  return createAccount({ name, offbudget: false }, balance);
}

export async function seedCategoryGroup(
  name: string,
  cats: string[],
  opts?: { isIncome?: boolean }
): Promise<{ groupId: string; catIds: Record<string, string> }> {
  const groupId = await createCategoryGroup({
    name,
    is_income: opts?.isIncome ?? false,
  });

  const catIds: Record<string, string> = {};
  for (const cat of cats) {
    catIds[cat] = await createCategory({
      name: cat,
      group_id: groupId,
      is_income: opts?.isIncome ?? false,
    });
  }
  return { groupId, catIds };
}

export async function seedPayee(name: string): Promise<string> {
  return createPayee({ name });
}

export async function seedTxn(
  accountId: string,
  payeeId: string,
  categoryId: string,
  amount: number,
  date: string
): Promise<string> {
  // NOTE: addTransactions resolves to the literal "ok" (Promise<'ok'>), not a
  // transaction id — the API has no bulk-create call that returns created ids.
  // This mirrors src/actual-api.ts's createTransaction, which has the same
  // shape (`Promise<string>` populated by `api.addTransactions(...)`). Callers
  // needing the real transaction id must look it up separately (e.g. via
  // getTransactions(accountId, date, date)).
  const result = await addTransactions(accountId, [{ date, amount, payee: payeeId, category: categoryId }], {
    runTransfers: false,
    learnCategories: false,
  });
  return result;
}
