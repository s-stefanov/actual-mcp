import { getRules } from "../../actual-api.js";
import type { Rule } from "../types/domain.js";

export async function fetchAllRules(): Promise<Rule[]> {
  return getRules();
}
