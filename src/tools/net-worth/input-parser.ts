// Parses and normalizes arguments for net-worth tool
import { NetWorthArgsSchema, type NetWorthArgs } from '../../types.js';

export class NetWorthInputParser {
  parse(args: unknown): Required<NetWorthArgs> {
    const parsed = NetWorthArgsSchema.parse(args ?? {});
    if (parsed.months <= 0) {
      throw new Error('months must be a positive number');
    }
    return parsed as Required<NetWorthArgs>;
  }
}
