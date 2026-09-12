import { getTransactions } from '../../actual-api.js';
import { fetchAllPayees } from './fetch-payees.js';
import { fetchAllCategories } from './fetch-categories.js';
import { GroupAggregator } from '../aggregation/group-by.js';
import type { Account, Transaction, Payee, Category } from '../types/domain.js';
import { TransactionEntity } from '@actual-app/core/types/models';

const groupAggregator = new GroupAggregator();

interface TransactionLookupOptions {
  includePayees: boolean;
  includeCategories: boolean;
}

interface TransactionLookups {
  payeesById: Record<string, Payee>;
  categoriesById: Record<string, Category>;
}

async function _buildTransactionLookups(options: TransactionLookupOptions): Promise<TransactionLookups> {
  const [payees, categories] = await Promise.all([
    options.includePayees ? fetchAllPayees() : Promise.resolve<Payee[]>([]),
    options.includeCategories ? fetchAllCategories() : Promise.resolve<Category[]>([]),
  ]);

  const payeesById: Record<string, Payee> = options.includePayees ? groupAggregator.byId(payees) : {};
  const categoriesById: Record<string, Category> = options.includeCategories ? groupAggregator.byId(categories) : {};

  return { payeesById, categoriesById };
}

// Reason: A split's subtransactions can each have their own payee/category (e.g. one leg is a
// transfer, another is categorized spending), so lookup-need detection and name enrichment must
// look one level into `subtransactions` as well as at the top-level transaction.
function _hasField(transactions: TransactionEntity[], field: 'payee' | 'category'): boolean {
  return transactions.some((t) => Boolean(t[field]) || (t.subtransactions ?? []).some((sub) => Boolean(sub[field])));
}

function _enrichSingleTransaction(
  transaction: TransactionEntity,
  payeesById: Record<string, Payee>,
  categoriesById: Record<string, Category>,
  needsPayees: boolean,
  needsCategories: boolean
): Transaction {
  const payeeName = needsPayees && transaction.payee ? payeesById[transaction.payee]?.name : undefined;
  const categoryName = needsCategories && transaction.category ? categoriesById[transaction.category]?.name : undefined;

  const enriched: Transaction = { ...transaction };

  if (payeeName !== undefined) {
    enriched.payee_name = payeeName;
  }

  if (categoryName !== undefined) {
    enriched.category_name = categoryName;
  }

  if (transaction.subtransactions) {
    enriched.subtransactions = transaction.subtransactions.map((sub) =>
      _enrichSingleTransaction(sub, payeesById, categoriesById, needsPayees, needsCategories)
    );
  }

  return enriched;
}

async function _enrichTransactions(transactions: TransactionEntity[]): Promise<Transaction[]> {
  if (transactions.length === 0) {
    return transactions;
  }

  // # Reason: Only fetch lookup tables when transactions are missing names to avoid redundant API calls.
  const needsPayees = _hasField(transactions, 'payee');
  const needsCategories = _hasField(transactions, 'category');

  if (!needsPayees && !needsCategories) {
    return transactions;
  }

  const { payeesById, categoriesById } = await _buildTransactionLookups({
    includePayees: needsPayees,
    includeCategories: needsCategories,
  });

  return transactions.map((transaction) =>
    _enrichSingleTransaction(transaction, payeesById, categoriesById, needsPayees, needsCategories)
  );
}

export async function fetchTransactionsForAccount(
  accountId: string,
  start: string,
  end: string
): Promise<Transaction[]> {
  const transactions = await getTransactions(accountId, start, end);
  return _enrichTransactions(transactions);
}

export async function fetchAllOnBudgetTransactions(
  accounts: Account[],
  start: string,
  end: string
): Promise<Transaction[]> {
  let transactions: Transaction[] = [];
  const onBudgetAccounts = accounts.filter((a) => !a.offbudget && !a.closed);
  for (const account of onBudgetAccounts) {
    const tx = await getTransactions(account.id, start, end);
    transactions = [...transactions, ...tx];
  }
  return _enrichTransactions(transactions);
}

export async function fetchAllTransactions(accounts: Account[], start: string, end: string): Promise<Transaction[]> {
  let transactions: Transaction[] = [];
  for (const account of accounts) {
    const tx = await getTransactions(account.id, start, end);
    transactions = [...transactions, ...tx];
  }
  return _enrichTransactions(transactions);
}
