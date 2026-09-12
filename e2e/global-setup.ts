import type { TestProject } from 'vitest/node';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as api from '@actual-app/api';
import { startActualServer, isDockerAvailable, type ActualServerHandle } from './helpers/actual-server.js';
import { seedAccount, seedCategoryGroup, seedPayee, seedTxn } from './helpers/seed.js';

export interface E2EContext {
  url: string;
  password: string;
  syncId: string;
  ids: {
    accounts: Record<string, string>;
    categories: Record<string, string>;
    categoryGroups: Record<string, string>;
    payees: Record<string, string>;
    transactions: Record<string, string>;
  };
}

const BUDGET_NAME = 'E2E Test Budget';

export default async function setup(ctx: TestProject): Promise<() => Promise<void>> {
  if (!(await isDockerAvailable())) {
    // Skip cleanly on Docker-less machines: provide a sentinel the tests treat
    // as "skip". Tests guard with `describe.skipIf` on a missing syncId.
    console.warn('[e2e] Docker not available — e2e suite will be skipped.');
    ctx.provide('e2e', { url: '', password: '', syncId: '', ids: emptyIds() });
    return async () => {};
  }

  let server: ActualServerHandle | undefined;
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'actual-e2e-seed-'));

  try {
    server = await startActualServer();

    const lib = await api.init({ dataDir, serverURL: server.url, password: server.password });

    const ids: E2EContext['ids'] = emptyIds();

    // Create + load a fresh budget, then seed inside the import transaction.
    await api.runImport(BUDGET_NAME, async () => {
      ids.accounts['Checking'] = await seedAccount('Checking', 500_000); // $5,000.00
      ids.accounts['Savings'] = await seedAccount('Savings', 1_000_000); // $10,000.00

      const groceriesGroup = await seedCategoryGroup('Everyday', ['Groceries', 'Dining']);
      ids.categoryGroups['Everyday'] = groceriesGroup.groupId;
      Object.assign(ids.categories, groceriesGroup.catIds);

      const incomeGroup = await seedCategoryGroup('Income', ['Salary'], { isIncome: true });
      ids.categoryGroups['Income'] = incomeGroup.groupId;
      Object.assign(ids.categories, incomeGroup.catIds);

      ids.payees['Whole Foods'] = await seedPayee('Whole Foods');
      ids.payees['Employer'] = await seedPayee('Employer');

      ids.transactions['grocery-1'] = await seedTxn(
        ids.accounts['Checking'],
        ids.payees['Whole Foods'],
        ids.categories['Groceries'],
        -8_500, // -$85.00
        '2025-01-15'
      );
      ids.transactions['salary-1'] = await seedTxn(
        ids.accounts['Checking'],
        ids.payees['Employer'],
        ids.categories['Salary'],
        300_000, // +$3,000.00
        '2025-01-01'
      );
    });

    // Upload the freshly created local budget to the server so it gets a
    // cloudFileId + groupId. `sync-reset` runs resetSync -> resetSync$1 ->
    // upload(). Routing is confirmed: init's `send` dispatches on the single
    // combined handler map (send$1 -> app.handlers[name]), and sync-reset is
    // registered there (app.method("sync-reset", resetSync)), so this reaches it.
    await lib.send('sync-reset' as never);
    await api.sync();

    // Read the groupId back by budget name (spec §10 / open item 3). This is
    // the "sync id" downloadBudget matches on (api/download-budget looks up
    // `f.groupId === syncId`), not cloudFileId. getBudgets can return both a
    // local-only entry and the synced/remote entry under the same name; only
    // the remote one carries a groupId.
    const budgets = (await api.getBudgets()) as Array<{ name?: string; groupId?: string; id?: string }>;
    const ours = budgets.find((b) => b.name === BUDGET_NAME && b.groupId);
    const syncId = ours?.groupId;
    if (!syncId) {
      throw new Error(
        `Could not resolve groupId for "${BUDGET_NAME}". getBudgets returned: ${JSON.stringify(budgets)}`
      );
    }

    await api.shutdown();

    const context: E2EContext = { url: server.url, password: server.password, syncId, ids };
    ctx.provide('e2e', context);

    const startedServer = server;
    return async () => {
      await startedServer.stop();
      fs.rmSync(dataDir, { recursive: true, force: true });
    };
  } catch (err) {
    try {
      await api.shutdown();
    } catch {
      /* ignore */
    }
    await server?.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
    throw err;
  }
}

function emptyIds(): E2EContext['ids'] {
  return { accounts: {}, categories: {}, categoryGroups: {}, payees: {}, transactions: {} };
}

// Type the injected value for `inject('e2e')` across the suite.
declare module 'vitest' {
  interface ProvidedContext {
    e2e: E2EContext;
  }
}
