import { describe, it, expect } from 'vitest';
import { CashFlowInputParser } from './input-parser.js';

describe('CashFlowInputParser', () => {
  const parser = new CashFlowInputParser();

  it('defaults to six monthly periods', () => {
    expect(parser.parse({})).toMatchObject({ months: 6, interval: 'monthly' });
  });

  it('accepts the weekly interval', () => {
    expect(parser.parse({ interval: 'weekly' })).toMatchObject({ interval: 'weekly' });
  });

  it('rejects an unsupported interval', () => {
    expect(() => parser.parse({ interval: 'daily' })).toThrow();
  });

  it('rejects a non-positive month count', () => {
    expect(() => parser.parse({ months: -3 })).toThrow('months must be a positive number');
  });
});
