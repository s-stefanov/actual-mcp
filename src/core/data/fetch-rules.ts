import { RuleEntity } from '@actual-app/core/types/models';
import { getRules } from '../../actual-api.js';

export async function fetchAllRules(): Promise<RuleEntity[]> {
  return getRules();
}
