import { getTransactions } from '../../actual-api.js';
import { fetchAllPayees } from './fetch-payees.js';
import { fetchAllCategories } from './fetch-categories.js';
import { GroupAggregator } from '../aggregation/group-by.js';
import type { Account, Transaction, Payee, Category } from '../types/domain.js';
import { TransactionEntity } from '@actual-app/api/@types/loot-core/src/types/models/transaction.js';

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

async function _enrichTransactions(transactions: TransactionEntity[]): Promise<Transaction[]> {
  if (transactions.length === 0) {
    return transactions;
  }

  // # Reason: Only fetch lookup tables when transactions are missing names to avoid redundant API calls.
  const needsPayees = transactions.some((transaction) => Boolean(transaction.payee));
  const needsCategories = transactions.some((transaction) => Boolean(transaction.category));

  if (!needsPayees && !needsCategories) {
    return transactions;
  }

  const { payeesById, categoriesById } = await _buildTransactionLookups({
    includePayees: needsPayees,
    includeCategories: needsCategories,
  });

  return transactions.map((transaction: TransactionEntity) => {
    const payeeName = needsPayees && transaction.payee ? payeesById[transaction.payee]?.name : undefined;
    const categoryName =
      needsCategories && transaction.category ? categoriesById[transaction.category]?.name : undefined;

    const enriched: Transaction = { ...transaction };

    if (payeeName !== undefined) {
      enriched.payee_name = payeeName;
    }

    if (categoryName !== undefined) {
      enriched.category_name = categoryName;
    }

    return enriched;
  });
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
