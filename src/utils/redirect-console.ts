// ----------------------------
// CONSOLE REDIRECTION FOR STDIO MODE
// ----------------------------

import { format } from 'node:util';

/**
 * Redirect stdout-bound console methods (log, info, debug) to stderr.
 *
 * In MCP stdio mode, stdout is reserved exclusively for JSON-RPC messages.
 * Dependencies such as @actual-app/api's internal logger write informational
 * logs (e.g. "[Breadcrumb] ...", "Loaded spreadsheet ...", "Syncing since ...")
 * via console.log/console.info, which corrupts the protocol stream and causes
 * "Unexpected token ... is not valid JSON" errors in MCP clients.
 *
 * console.warn and console.error already write to stderr in Node.js, so they
 * are left untouched.
 *
 * @returns A function that restores the original console methods
 */
export function redirectConsoleToStderr(): () => void {
  const original = {
    log: console.log,
    info: console.info,
    debug: console.debug,
  };

  const writeToStderr = (...args: unknown[]): void => {
    process.stderr.write(format(...args) + '\n');
  };

  console.log = writeToStderr;
  console.info = writeToStderr;
  console.debug = writeToStderr;

  return (): void => {
    console.log = original.log;
    console.info = original.info;
    console.debug = original.debug;
  };
}
