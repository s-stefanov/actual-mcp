/**
 * Resolves the optional comma-separated tool allowlist.
 *
 * The CLI setting takes precedence whenever it is present, including when it
 * is explicitly empty. Empty CSV entries are ignored and duplicates retain
 * their first position.
 */
export function resolveAllowedTools(
  cliValue: string | undefined,
  environmentValue: string | undefined
): string[] | undefined {
  const configuredValue = cliValue !== undefined ? cliValue : environmentValue;
  if (configuredValue === undefined) {
    return undefined;
  }

  return [
    ...new Set(
      configuredValue
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
    ),
  ];
}
