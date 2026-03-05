import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { toJSONSchema } from 'zod';
import { success, errorFromCatch } from '../../utils/response.js';
import { getAccounts, getCategories, getPayees } from '../../actual-api.js';
import { getDateRange, formatAmount } from '../../utils.js';
import { fetchTransactionsForAccount, fetchAllOnBudgetTransactions } from '../../core/data/fetch-transactions.js';
import { QueryTransactionsArgsSchema, type QueryTransactionsArgs, type ToolInput } from '../../types.js';
import type { Transaction } from '../../core/types/domain.js';

export const schema = {
  name: 'query-transactions',
  description:
    'Unified transaction query tool. Filter by any field using AQL-like operators ($eq, $ne, $gt, $gte, $lt, $lte, $like, $oneof, $regexp). Supports tag filtering (#hashtags in notes), sorting, pagination, and optional summary stats with groupBy.',
  inputSchema: toJSONSchema(QueryTransactionsArgsSchema) as ToolInput,
};

const DEFAULT_SELECT = ['date', 'payee', 'amount', 'category', 'notes'];
const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 100;

type FilterMap = Record<string, unknown>;

/**
 * Apply a single operator object to a value.
 * Returns true if the value passes all operators in the object.
 */
function applyOperators(fieldValue: unknown, opObj: Record<string, unknown>): boolean {
  for (const [op, opVal] of Object.entries(opObj)) {
    switch (op) {
      case '$eq':
        if (fieldValue !== opVal) return false;
        break;
      case '$ne':
        if (fieldValue === opVal) return false;
        break;
      case '$gt':
        if (typeof fieldValue === 'string' && typeof opVal === 'string') {
          if (fieldValue <= opVal) return false;
        } else if (typeof fieldValue !== 'number' || typeof opVal !== 'number') {
          return false;
        } else if (fieldValue <= opVal) {
          return false;
        }
        break;
      case '$gte':
        if (typeof fieldValue === 'string' && typeof opVal === 'string') {
          if (fieldValue < opVal) return false;
        } else if (typeof fieldValue !== 'number' || typeof opVal !== 'number') {
          return false;
        } else if (fieldValue < opVal) {
          return false;
        }
        break;
      case '$lt':
        if (typeof fieldValue === 'string' && typeof opVal === 'string') {
          if (fieldValue >= opVal) return false;
        } else if (typeof fieldValue !== 'number' || typeof opVal !== 'number') {
          return false;
        } else if (fieldValue >= opVal) {
          return false;
        }
        break;
      case '$lte':
        if (typeof fieldValue === 'string' && typeof opVal === 'string') {
          if (fieldValue > opVal) return false;
        } else if (typeof fieldValue !== 'number' || typeof opVal !== 'number') {
          return false;
        } else if (fieldValue > opVal) {
          return false;
        }
        break;
      case '$like':
        if (typeof fieldValue !== 'string' || typeof opVal !== 'string') return false;
        if (!fieldValue.toLowerCase().includes(opVal.toLowerCase())) return false;
        break;
      case '$notlike':
        if (typeof fieldValue !== 'string' || typeof opVal !== 'string') return false;
        if (fieldValue.toLowerCase().includes(opVal.toLowerCase())) return false;
        break;
      case '$regexp':
        if (typeof fieldValue !== 'string' || typeof opVal !== 'string') return false;
        if (!new RegExp(opVal).test(fieldValue)) return false;
        break;
      case '$oneof':
        if (!Array.isArray(opVal)) return false;
        if (!opVal.includes(fieldValue)) return false;
        break;
    }
  }
  return true;
}

/**
 * Test a transaction field value against a filter spec (plain value or operator object).
 */
function matchesFilter(fieldValue: unknown, filterSpec: unknown): boolean {
  if (filterSpec === null || filterSpec === undefined) {
    return fieldValue === null || fieldValue === undefined;
  }
  if (typeof filterSpec === 'object' && !Array.isArray(filterSpec)) {
    return applyOperators(fieldValue, filterSpec as Record<string, unknown>);
  }
  // plain value — exact match (case-insensitive for strings)
  if (typeof filterSpec === 'string' && typeof fieldValue === 'string') {
    return fieldValue.toLowerCase() === filterSpec.toLowerCase();
  }
  return fieldValue === filterSpec;
}

/**
 * Build tag regex patterns from a tag filter value (string or array of strings).
 */
function buildTagPatterns(tagFilter: unknown): RegExp[] {
  const tags = Array.isArray(tagFilter) ? tagFilter : [tagFilter];
  return tags
    .filter((t): t is string => typeof t === 'string')
    .map((t) => new RegExp(`#${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'));
}

/**
 * Test if a transaction's notes contain any of the given tag patterns.
 */
function matchesTagFilter(notes: string | undefined, patterns: RegExp[]): boolean {
  if (!notes) return false;
  return patterns.some((p) => p.test(notes));
}

/**
 * Extract date bounds from a date filter spec for use when fetching from the API.
 * Returns undefined if the filter isn't a simple range.
 */
function extractDateBounds(dateFilter: unknown): { start?: string; end?: string } {
  if (typeof dateFilter === 'string') {
    return { start: dateFilter, end: dateFilter };
  }
  if (typeof dateFilter === 'object' && dateFilter !== null && !Array.isArray(dateFilter)) {
    const obj = dateFilter as Record<string, unknown>;
    return {
      start: typeof obj['$gte'] === 'string' ? obj['$gte'] : typeof obj['$gt'] === 'string' ? obj['$gt'] : undefined,
      end: typeof obj['$lte'] === 'string' ? obj['$lte'] : typeof obj['$lt'] === 'string' ? obj['$lt'] : undefined,
    };
  }
  return {};
}

/**
 * Apply all filters to a transaction array in memory.
 */
function applyFilters(
  txns: Transaction[],
  filters: FilterMap,
  resolvedCategoryId: string | undefined,
  resolvedPayeeId: string | undefined,
  resolvedAccountId: string | undefined,
  tagPatterns: RegExp[]
): Transaction[] {
  return txns.filter((t) => {
    // category filter — compare resolved ID
    if (resolvedCategoryId !== undefined) {
      if (t.category !== resolvedCategoryId) return false;
    } else if (filters['category'] !== undefined) {
      if (!matchesFilter(t.category_name, filters['category'])) return false;
    }

    // payee filter — compare resolved ID
    if (resolvedPayeeId !== undefined) {
      if (t.payee !== resolvedPayeeId) return false;
    } else if (filters['payee'] !== undefined) {
      if (!matchesFilter(t.payee_name, filters['payee'])) return false;
    }

    // account filter
    if (resolvedAccountId !== undefined) {
      if (t.account !== resolvedAccountId) return false;
    }

    // date filter (in-memory, in case the API date range was wider)
    if (filters['date'] !== undefined) {
      if (!matchesFilter(t.date, filters['date'])) return false;
    }

    // amount filter — filter values are dollars, internal amounts are cents
    if (filters['amount'] !== undefined) {
      const amountSpec = filters['amount'];
      if (typeof amountSpec === 'number') {
        // plain value: exact match in cents
        if (t.amount !== amountSpec * 100) return false;
      } else if (typeof amountSpec === 'object' && amountSpec !== null && !Array.isArray(amountSpec)) {
        // operator object: convert each operator value from dollars to cents
        const centSpec: Record<string, unknown> = {};
        for (const [op, val] of Object.entries(amountSpec as Record<string, unknown>)) {
          centSpec[op] =
            typeof val === 'number'
              ? val * 100
              : Array.isArray(val)
                ? val.map((v) => (typeof v === 'number' ? v * 100 : v))
                : val;
        }
        if (!applyOperators(t.amount, centSpec)) return false;
      }
    }

    // notes filter
    if (filters['notes'] !== undefined) {
      if (!matchesFilter(t.notes, filters['notes'])) return false;
    }

    // cleared filter
    if (filters['cleared'] !== undefined) {
      if (!matchesFilter(t.cleared, filters['cleared'])) return false;
    }

    // tag filter
    if (tagPatterns.length > 0) {
      if (!matchesTagFilter(t.notes, tagPatterns)) return false;
    }

    return true;
  });
}

/**
 * Sort transactions by the given orderBy spec.
 */
function sortTransactions(txns: Transaction[], orderBy: Record<string, 'asc' | 'desc'>): Transaction[] {
  const entries = Object.entries(orderBy);
  if (entries.length === 0) return txns;

  return [...txns].sort((a, b) => {
    for (const [field, dir] of entries) {
      const aVal = (a as unknown as Record<string, unknown>)[field];
      const bVal = (b as unknown as Record<string, unknown>)[field];
      let cmp = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        cmp = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal;
      }
      if (cmp !== 0) return dir === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
}

/**
 * Format a single field value for table display.
 */
function formatField(t: Transaction, field: string, accountName?: string): string {
  switch (field) {
    case 'date':
      return t.date ?? '';
    case 'payee':
      return t.payee_name ?? t.payee ?? '';
    case 'amount':
      return formatAmount(t.amount);
    case 'category':
      return t.category_name ?? t.category ?? '';
    case 'notes':
      return t.notes ?? '';
    case 'id':
      return t.id ?? '';
    case 'account':
      return accountName ?? t.account ?? '';
    case 'cleared':
      return t.cleared ? 'yes' : 'no';
    default:
      return String((t as unknown as Record<string, unknown>)[field] ?? '');
  }
}

/**
 * Build a markdown table from a list of transactions.
 */
function buildTable(txns: Transaction[], fields: string[], accountsById: Map<string, string>): string {
  const header = '| ' + fields.map((f) => capitalize(f)).join(' | ') + ' |';
  const separator = '|' + fields.map(() => '------|').join('');
  const rows = txns.map((t) => {
    const accountName = accountsById.get(t.account);
    const cells = fields.map((f) => formatField(t, f, accountName));
    return '| ' + cells.join(' | ') + ' |';
  });
  return [header, separator, ...rows].join('\n');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Build a summary stats block.
 */
function buildSummary(txns: Transaction[]): string {
  const count = txns.length;
  const total = txns.reduce((sum, t) => sum + t.amount, 0);
  const average = count > 0 ? Math.round(total / count) : 0;
  return [
    '## Summary',
    '',
    '| Metric | Value |',
    '|--------|-------|',
    `| Count | ${count} |`,
    `| Total | ${formatAmount(total)} |`,
    `| Average | ${formatAmount(average)} |`,
  ].join('\n');
}

/**
 * Build a grouped summary stats block.
 */
function buildGroupedSummary(txns: Transaction[], groupField: string, accountsById: Map<string, string>): string {
  const groups = new Map<string, Transaction[]>();
  for (const t of txns) {
    const key = formatField(t, groupField, accountsById.get(t.account)) || '(none)';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  const header = `## Summary by ${capitalize(groupField)}`;
  const tableHeader = `| ${capitalize(groupField)} | Count | Total | Average |`;
  const tableSep = `|------|-------|-------|---------|`;
  const rows: string[] = [];
  for (const [key, grpTxns] of groups.entries()) {
    const count = grpTxns.length;
    const total = grpTxns.reduce((sum, t) => sum + t.amount, 0);
    const avg = count > 0 ? Math.round(total / count) : 0;
    rows.push(`| ${key} | ${count} | ${formatAmount(total)} | ${formatAmount(avg)} |`);
  }

  return [header, '', tableHeader, tableSep, ...rows].join('\n');
}

export async function handler(args: QueryTransactionsArgs): Promise<CallToolResult> {
  try {
    const parsed = QueryTransactionsArgsSchema.parse(args);
    const {
      filters = {},
      select = DEFAULT_SELECT,
      orderBy = { date: 'desc' },
      limit = DEFAULT_LIMIT,
      offset = 0,
      includeSummary = false,
      groupBy,
    } = parsed;

    const effectiveLimit = Math.min(limit, MAX_LIMIT);

    // --- Resolve date range ---
    const dateFilter = filters['date'];
    const { start: dateStart, end: dateEnd } = extractDateBounds(dateFilter);
    const { startDate: start, endDate: end } = getDateRange(dateStart, dateEnd);

    // --- Load accounts ---
    const accounts = await getAccounts();
    const accountsById = new Map(accounts.map((a) => [a.id, a.name]));

    // --- Resolve account filter ---
    let resolvedAccountId: string | undefined;
    const accountFilter = filters['account'];
    if (accountFilter !== undefined && typeof accountFilter === 'string') {
      // try ID match first, then name match
      const byId = accounts.find((a) => a.id === accountFilter);
      if (byId) {
        resolvedAccountId = byId.id;
      } else {
        const byName = accounts.find((a) => a.name.toLowerCase() === accountFilter.toLowerCase());
        if (byName) {
          resolvedAccountId = byName.id;
        } else {
          return errorFromCatch(new Error(`Account not found: "${accountFilter}"`));
        }
      }
    }

    // --- Resolve category filter ---
    let resolvedCategoryId: string | undefined;
    const categoryFilter = filters['category'];
    if (categoryFilter !== undefined && typeof categoryFilter === 'string') {
      const categories = await getCategories();
      const match = categories
        .filter((c): c is { id: string; name: string; group_id: string } => 'group_id' in c)
        .find((c) => c.name.toLowerCase() === categoryFilter.toLowerCase());
      if (!match) {
        return errorFromCatch(new Error(`Category not found: "${categoryFilter}"`));
      }
      resolvedCategoryId = match.id;
    }

    // --- Resolve payee filter ---
    let resolvedPayeeId: string | undefined;
    const payeeFilter = filters['payee'];
    if (payeeFilter !== undefined && typeof payeeFilter === 'string') {
      const payees = await getPayees();
      const match = payees.find((p) => p.name.toLowerCase() === payeeFilter.toLowerCase());
      if (!match) {
        return errorFromCatch(new Error(`Payee not found: "${payeeFilter}"`));
      }
      resolvedPayeeId = match.id;
    }

    // --- Build tag patterns ---
    const tagPatterns = filters['tag'] !== undefined ? buildTagPatterns(filters['tag']) : [];

    // --- Fetch transactions ---
    let txns: Transaction[];
    if (resolvedAccountId !== undefined) {
      txns = await fetchTransactionsForAccount(resolvedAccountId, start, end);
    } else {
      txns = await fetchAllOnBudgetTransactions(accounts, start, end);
    }

    // --- Apply in-memory filters ---
    txns = applyFilters(
      txns,
      filters as FilterMap,
      resolvedCategoryId,
      resolvedPayeeId,
      resolvedAccountId,
      tagPatterns
    );

    // --- Sort ---
    txns = sortTransactions(txns, orderBy);

    // --- Build filter description ---
    const filterDescs: string[] = [];
    if (categoryFilter) filterDescs.push(`category = ${categoryFilter}`);
    if (payeeFilter) filterDescs.push(`payee = ${payeeFilter}`);
    if (accountFilter) filterDescs.push(`account = ${accountFilter}`);
    if (dateFilter) {
      if (typeof dateFilter === 'string') {
        filterDescs.push(`date = ${dateFilter}`);
      } else if (typeof dateFilter === 'object') {
        const obj = dateFilter as Record<string, unknown>;
        if (obj['$gte']) filterDescs.push(`date >= ${obj['$gte']}`);
        if (obj['$lte']) filterDescs.push(`date <= ${obj['$lte']}`);
        if (obj['$gt']) filterDescs.push(`date > ${obj['$gt']}`);
        if (obj['$lt']) filterDescs.push(`date < ${obj['$lt']}`);
      }
    }
    if (filters['amount']) filterDescs.push(`amount filtered`);
    if (filters['tag'])
      filterDescs.push(`tag = ${Array.isArray(filters['tag']) ? filters['tag'].join(', ') : filters['tag']}`);
    if (filters['notes']) filterDescs.push(`notes filtered`);
    if (filters['cleared'] !== undefined) filterDescs.push(`cleared = ${filters['cleared']}`);

    const totalMatched = txns.length;

    // --- No results ---
    if (totalMatched === 0) {
      const filterStr = filterDescs.length > 0 ? ` matching ${filterDescs.join(', ')}` : '';
      return success(`No transactions found${filterStr} between ${start} and ${end}.`);
    }

    // --- Pagination ---
    const paginated = txns.slice(offset, offset + effectiveLimit);

    // --- Build output ---
    const lines: string[] = ['## Query Results', ''];
    if (filterDescs.length > 0) lines.push(`Filters: ${filterDescs.join(', ')}`);
    lines.push(`Showing ${paginated.length} of ${totalMatched} transactions`);
    lines.push('');
    lines.push(buildTable(paginated, select, accountsById));

    if (includeSummary) {
      lines.push('');
      if (groupBy) {
        lines.push(buildGroupedSummary(txns, groupBy, accountsById));
      } else {
        lines.push(buildSummary(txns));
      }
    }

    return success(lines.join('\n'));
  } catch (err) {
    return errorFromCatch(err);
  }
}
