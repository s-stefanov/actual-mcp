import { describe, it, expect } from 'vitest';
import { GetTransactionsReportGenerator } from './report-generator.js';

describe('GetTransactionsReportGenerator', () => {
  const generator = new GetTransactionsReportGenerator();

  const transferRow = {
    id: 'tx-1',
    date: '2024-05-01',
    payee: 'Savings',
    category: '(Uncategorized)',
    amount: '$50.00',
    notes: '',
    cleared: true,
    transferId: 'tx-2',
  };

  const regularRow = {
    id: 'tx-3',
    date: '2024-05-02',
    payee: 'Coffee Shop',
    category: 'Dining',
    amount: '-$12.34',
    notes: 'morning',
    cleared: false,
    transferId: '',
  };

  it('renders the Transfer column in the header', () => {
    const md = generator.generate([transferRow], 'Date range: 2024-05-01 to 2024-05-31', 1, 1);

    expect(md).toContain('| ID | Date | Payee | Category | Amount | Cleared | Notes | Transfer |');
    expect(md).toContain('| ---- | ----- | -------- | ------ | ----- | ------- | ----- | -------- |');
  });

  it('renders transferId in the Transfer cell for transfer rows', () => {
    const md = generator.generate([transferRow], '', 1, 1);

    expect(md).toContain('| tx-1 | 2024-05-01 | Savings | (Uncategorized) | $50.00 | true |  | tx-2 |');
  });

  it('leaves the Transfer cell empty for non-transfer rows', () => {
    const md = generator.generate([regularRow], '', 1, 1);

    expect(md).toContain('| tx-3 | 2024-05-02 | Coffee Shop | Dining | -$12.34 | false | morning |  |');
  });

  it('preserves the leading columns so name-anchored parsers do not break', () => {
    const md = generator.generate([regularRow], '', 1, 1);
    const headerLine = md.split('\n').find((line) => line.startsWith('| ID |'));

    expect(headerLine).toBeDefined();
    const headers = headerLine!
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean);
    expect(headers.slice(0, 7)).toEqual(['ID', 'Date', 'Payee', 'Category', 'Amount', 'Cleared', 'Notes']);
    expect(headers[7]).toBe('Transfer');
  });

  it('renders a split subtransaction as its own row, nested under the parent, with its id visible', () => {
    const splitRow = {
      ...regularRow,
      id: 'tx-parent',
      subtransactions: [
        {
          id: 'tx-child-1',
          date: '2024-05-02',
          payee: '(No payee)',
          category: 'Groceries',
          amount: '-$8.00',
          notes: '',
          cleared: false,
          transferId: '',
        },
        {
          id: 'tx-child-2',
          date: '2024-05-02',
          payee: 'Transfer: Savings',
          category: '(Uncategorized)',
          amount: '-$4.34',
          notes: '',
          cleared: false,
          transferId: 'tx-transfer-counterpart',
        },
      ],
    };

    const md = generator.generate([splitRow], '', 1, 1);
    const lines = md.split('\n');
    const parentIndex = lines.findIndex((line) => line.startsWith('| tx-parent |'));

    expect(parentIndex).toBeGreaterThan(-1);
    // The child rows immediately follow the parent row, keeping the id visible so it can be
    // targeted with update-transaction (e.g. to turn a leg into a transfer).
    expect(lines[parentIndex + 1]).toContain('| ↳ tx-child-1 |');
    expect(lines[parentIndex + 1]).toContain('Groceries');
    expect(lines[parentIndex + 2]).toContain('| ↳ tx-child-2 |');
    expect(lines[parentIndex + 2]).toContain('tx-transfer-counterpart');
  });

  it('does not add any rows for a transaction without subtransactions', () => {
    const md = generator.generate([regularRow], '', 1, 1);
    const rowLines = md
      .split('\n')
      .filter((line) => line.startsWith('|') && !line.startsWith('| ID') && !line.startsWith('| ----'));

    expect(rowLines).toHaveLength(1);
  });
});
