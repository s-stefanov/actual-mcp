// Groups transactions by category and aggregates spending
import type {
  Transaction as _Transaction,
  CategorySpending as _CategorySpending,
  CategoryGroupInfo as _CategoryGroupInfo,
} from '../../core/types/domain.js';
import { TransactionGrouper } from '../../core/aggregation/transaction-grouper.js';

// This file now only re-exports TransactionGrouper from core.
export { TransactionGrouper };
