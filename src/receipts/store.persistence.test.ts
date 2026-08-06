import { randomUUID } from 'node:crypto';
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const tracking = vi.hoisted(() => ({ events: [] as string[], failTempSync: false }));

vi.mock('node:fs/promises', async (importActual) => {
  const actual = await importActual<typeof import('node:fs/promises')>();
  return {
    ...actual,
    open: vi.fn(
      async (path: Parameters<typeof actual.open>[0], flags: Parameters<typeof actual.open>[1], mode?: number) => {
        const handle = await actual.open(path, flags, mode);
        const label = String(path).endsWith('.tmp') ? 'temp' : flags === 'r' ? 'directory-or-read' : 'other';
        tracking.events.push(`${label}:open`);
        return new Proxy(handle, {
          get(target, property) {
            if (property === 'sync') {
              return async () => {
                tracking.events.push(`${label}:sync`);
                if (label === 'temp' && tracking.failTempSync) throw new Error('simulated fsync failure');
                return target.sync();
              };
            }
            if (property === 'close') {
              return async () => {
                tracking.events.push(`${label}:close`);
                return target.close();
              };
            }
            const value = target[property as keyof typeof target];
            return typeof value === 'function' ? value.bind(target) : value;
          },
        });
      }
    ),
    rename: vi.fn(async (...args: Parameters<typeof actual.rename>) => {
      tracking.events.push('rename');
      return actual.rename(...args);
    }),
  };
});

import { ReceiptStore } from './store.js';

describe('ReceiptStore durable persistence', () => {
  beforeEach(() => {
    tracking.events.length = 0;
    tracking.failTempSync = false;
  });

  it('fsyncs the temporary file before rename and the parent directory after rename', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'actual-mcp-durable-'));
    tracking.events.length = 0;
    await new ReceiptStore(directory).record({
      intakeId: randomUUID(),
      merchant: 'Cafe',
      purchaseDate: '2026-08-02',
      total: 500,
      lineGroups: [{ description: 'Lunch', category: 'Dining', amount: 500 }],
    });

    const tempSync = tracking.events.indexOf('temp:sync');
    const rename = tracking.events.indexOf('rename');
    const directorySync = tracking.events.lastIndexOf('directory-or-read:sync');
    expect(tempSync).toBeGreaterThanOrEqual(0);
    expect(rename).toBeGreaterThan(tempSync);
    expect(directorySync).toBeGreaterThan(rename);
  });

  it('closes and removes the temporary file when persistence fails', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'actual-mcp-durable-error-'));
    tracking.failTempSync = true;

    await expect(
      new ReceiptStore(directory).record({
        intakeId: randomUUID(),
        merchant: 'Cafe',
        purchaseDate: '2026-08-02',
        total: 500,
        lineGroups: [{ description: 'Lunch', category: 'Dining', amount: 500 }],
      })
    ).rejects.toThrow('simulated fsync failure');

    expect(await readdir(directory)).toEqual([]);
  });
});
