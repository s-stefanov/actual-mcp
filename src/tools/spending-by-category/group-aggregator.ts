// Aggregates category spendings into groups and sorts them
import type {
  CategorySpending as _CategorySpending,
  GroupSpending as _GroupSpending,
} from '../../core/types/domain.js';
import { GroupAggregator } from '../../core/aggregation/group-by.js';

// This file now only re-exports GroupAggregator from core.
export { GroupAggregator };
