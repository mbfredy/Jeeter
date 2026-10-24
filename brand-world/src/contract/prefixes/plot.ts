import type { PrefixHandler } from '../types.ts';

// Reserved for user-built spaces. Parsed and kept, no behavior in v1.
export const plot: PrefixHandler = (obj, out) => {
  out.plots.push(obj);
};
