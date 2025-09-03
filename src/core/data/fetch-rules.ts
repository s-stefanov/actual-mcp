import { RuleEntity } from '@actual-app/api/@types/loot-core/src/types/models/rule.js';
import { getRules } from '../../actual-api.js';

export async function fetchAllRules(): Promise<RuleEntity[]> {
  return getRules();
}
