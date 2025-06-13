// Groups transactions by category and aggregates spending
import type { Transaction, CategorySpending, CategoryGroupInfo } from "../../core/types/domain.js";
import { TransactionGrouper } from "../../core/aggregation/transaction-grouper.js";

// This file now only re-exports TransactionGrouper from core.
export { TransactionGrouper };
