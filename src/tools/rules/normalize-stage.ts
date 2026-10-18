export function normalizeRuleStage(args: Record<string, unknown>): Record<string, unknown> {
  if (args.stage !== 'null') {
    return args;
  }

  return { ...args, stage: null };
}
