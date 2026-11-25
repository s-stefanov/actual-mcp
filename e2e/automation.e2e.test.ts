import { describe, it, expect, beforeAll, afterAll, inject } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createMcpClient, type McpClientHandle } from './helpers/mcp-client.js';

const ctx = inject('e2e');

describe.skipIf(!ctx.syncId)('schedules, notes, templates, preferences, reconcile (e2e)', () => {
  let mcp: McpClientHandle;

  beforeAll(async () => {
    mcp = await createMcpClient(ctx);
  });

  afterAll(async () => {
    await mcp?.close();
  });

  it('set-preference turns category learning off and get-preferences reads it back', async () => {
    const set = await mcp.callTool('set-preference', { key: 'learn-categories', value: 'false' });
    expect(set.isError).toBe(false);

    const read = await mcp.callTool('get-preferences', {});
    expect(read.isError).toBe(false);
    expect((JSON.parse(read.text) as Record<string, string>)['learn-categories']).toBe('false');
  });

  it('creates, updates and completes a monthly schedule', async () => {
    const name = `E2E Rent ${randomUUID()}`;
    const create = await mcp.callTool('create-schedule', {
      name,
      account: ctx.ids.accounts['Checking'],
      payee: ctx.ids.payees['Whole Foods'],
      amount: -120_000,
      date: { frequency: 'monthly', interval: 1, start: '2025-03-01', endMode: 'never' },
    });
    expect(create.isError).toBe(false);
    const { id } = JSON.parse(create.text) as { id: string };

    const listed = JSON.parse((await mcp.callTool('get-schedules', {})).text) as Array<Record<string, unknown>>;
    const created = listed.find((s) => s.id === id);
    expect(created).toMatchObject({ name, amount: -120_000, amountOp: 'isapprox', payee_name: 'Whole Foods' });

    const update = await mcp.callTool('update-schedule', { id, amount: -125_000, amountOp: 'isapprox' });
    expect(update.isError).toBe(false);
    const afterUpdate = JSON.parse((await mcp.callTool('get-schedules', {})).text) as Array<Record<string, unknown>>;
    expect(afterUpdate.find((s) => s.id === id)?.amount).toBe(-125_000);

    const complete = await mcp.callTool('update-schedule', { id, completed: true });
    expect(complete.isError).toBe(false);
    const active = JSON.parse((await mcp.callTool('get-schedules', {})).text) as Array<{ id: string }>;
    expect(active.map((s) => s.id)).not.toContain(id);
    const all = JSON.parse((await mcp.callTool('get-schedules', { includeCompleted: true })).text) as Array<
      Record<string, unknown>
    >;
    expect(all.find((s) => s.id === id)?.completed).toBe(true);

    expect((await mcp.callTool('delete-schedule', { id })).isError).toBe(false);
    const afterDelete = JSON.parse((await mcp.callTool('get-schedules', { includeCompleted: true })).text) as Array<{
      id: string;
    }>;
    expect(afterDelete.map((s) => s.id)).not.toContain(id);
  });

  it('writes an account note under the id the UI reads', async () => {
    const accountId = ctx.ids.accounts['Savings'];
    const note = `Breakdown ${randomUUID()}`;

    expect((await mcp.callTool('update-note', { target: 'account', id: accountId, note })).isError).toBe(false);

    const one = JSON.parse((await mcp.callTool('get-notes', { target: 'account', id: accountId })).text) as {
      note: string;
    };
    expect(one.note).toBe(note);

    const all = JSON.parse((await mcp.callTool('get-notes', {})).text) as Array<Record<string, unknown>>;
    expect(all).toContainEqual({ target: 'account', id: accountId, name: 'Savings', note });
  });

  it('checks and applies a budget template written into a category note', async () => {
    const categoryId = ctx.ids.categories['Dining'];

    await mcp.callTool('update-note', { target: 'category', id: categoryId, note: '#template schedule Nonexistent' });
    const bad = JSON.parse((await mcp.callTool('check-budget-templates', {})).text) as {
      ok: boolean;
      errors: string[];
    };
    expect(bad.ok).toBe(false);
    expect(bad.errors).toEqual(['Dining: Schedule "Nonexistent" does not exist']);

    await mcp.callTool('update-note', { target: 'category', id: categoryId, note: 'Eating out\n#template 175' });
    const good = JSON.parse((await mcp.callTool('check-budget-templates', {})).text) as { ok: boolean };
    expect(good.ok).toBe(true);

    const apply = await mcp.callTool('apply-budget-templates', { month: '2025-03', categoryIds: [categoryId] });
    expect(apply.isError).toBe(false);
    expect(JSON.parse(apply.text)).toMatchObject({ ok: true, status: 'templates-applied', applied: 1 });

    const month = await mcp.callTool('get-budget-month', { month: '2025-03' });
    expect(month.text).toContain(categoryId);
    expect(month.text).toContain('17500');
  });

  it('reconciles only when the statement balance matches the cleared balance', async () => {
    const accountId = ctx.ids.accounts['Savings'];
    const date = '2025-12-31';
    const cleared = async (): Promise<number> =>
      (
        JSON.parse((await mcp.callTool('reconcile-account', { accountId, date, balance: 0, dryRun: true })).text) as {
          clearedBalance: number;
        }
      ).clearedBalance;
    const before = await cleared();

    for (const [amount, isCleared] of [
      [50_000, true],
      [-12_345, true],
      [-999, false],
    ] as const) {
      const created = await mcp.callTool('create-transaction', {
        account: accountId,
        date: '2025-06-30',
        amount,
        cleared: isCleared,
        payee_name: `E2E reconcile ${randomUUID()}`,
      });
      expect(created.isError).toBe(false);
    }

    // Reason: a split whose lines don't add up must count at its parent amount, as the register shows it.
    const split = await mcp.callTool('create-transaction', {
      account: accountId,
      date: '2025-06-30',
      amount: -10_000,
      cleared: true,
      payee_name: `E2E split ${randomUUID()}`,
      subtransactions: [{ amount: -6_000 }],
    });
    expect(split.isError).toBe(false);

    const probe = JSON.parse(
      (await mcp.callTool('reconcile-account', { accountId, date, balance: 0, dryRun: true })).text
    ) as { clearedBalance: number; difference: number };
    // Reason: the uncleared -9.99 must not count, and the split counts at -100.00, not -60.00.
    expect(probe.clearedBalance - before).toBe(50_000 - 12_345 - 10_000);
    expect(probe.difference + probe.clearedBalance).toBe(0);

    const wrong = JSON.parse(
      (await mcp.callTool('reconcile-account', { accountId, date, balance: probe.clearedBalance + 1 })).text
    ) as { reconciled: boolean; difference: number };
    expect(wrong).toMatchObject({ reconciled: false, difference: 1 });

    const right = JSON.parse(
      (await mcp.callTool('reconcile-account', { accountId, date, balance: probe.clearedBalance })).text
    ) as { reconciled: boolean; lockedTransactions: number };
    expect(right.reconciled).toBe(true);
    expect(right.lockedTransactions).toBeGreaterThan(0);

    const again = JSON.parse(
      (await mcp.callTool('reconcile-account', { accountId, date, balance: probe.clearedBalance })).text
    ) as { reconciled: boolean; lockedTransactions: number };
    expect(again).toMatchObject({ reconciled: true, lockedTransactions: 0 });
  });
});
