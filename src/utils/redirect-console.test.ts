import { describe, it, expect, vi, afterEach } from 'vitest';
import { redirectConsoleToStderr } from './redirect-console.js';

describe('redirectConsoleToStderr', () => {
  let restore: (() => void) | undefined;

  afterEach(() => {
    restore?.();
    restore = undefined;
    vi.restoreAllMocks();
  });

  it('should write console.log, console.info, and console.debug to stderr', () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    restore = redirectConsoleToStderr();

    console.log('log message');
    console.info('info message');
    console.debug('debug message');

    expect(stderrSpy).toHaveBeenCalledWith('log message\n');
    expect(stderrSpy).toHaveBeenCalledWith('info message\n');
    expect(stderrSpy).toHaveBeenCalledWith('debug message\n');
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it('should format multiple arguments and objects like console.log', () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);

    restore = redirectConsoleToStderr();

    console.log('[Breadcrumb]', { message: 'loaded spreadsheet', category: 'server' });

    expect(stderrSpy).toHaveBeenCalledWith("[Breadcrumb] { message: 'loaded spreadsheet', category: 'server' }\n");
  });

  it('should restore original console methods when the returned function is called', () => {
    const originalLog = console.log;
    const originalInfo = console.info;
    const originalDebug = console.debug;

    const restoreFn = redirectConsoleToStderr();
    expect(console.log).not.toBe(originalLog);

    restoreFn();

    expect(console.log).toBe(originalLog);
    expect(console.info).toBe(originalInfo);
    expect(console.debug).toBe(originalDebug);
  });
});
