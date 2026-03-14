import { RuleEntity } from '@actual-app/api/@types/loot-core/src/types/models/rule.js';
import { getPayeeRules } from '../../actual-api.js';

export async function fetchPayeeRules(payeeId: string): Promise<RuleEntity[]> {
  return getPayeeRules(payeeId);
}
