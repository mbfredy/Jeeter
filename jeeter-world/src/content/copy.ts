import type { CopyFile } from './types.ts';
import { regionCode, type Region } from './region.ts';

export type Translate = (key: string, fallback?: string) => string;

// Region overrides win: "US-CA" first, then "US", then default.
export function createTranslate(copy: CopyFile, region: Region): Translate {
  const layers = [copy.overrides?.[regionCode(region)], copy.overrides?.[region.country], copy.default].filter(
    (l): l is Record<string, string> => !!l,
  );
  return (key, fallback) => {
    for (const l of layers) if (key in l) return l[key];
    if (import.meta.env.DEV) console.warn(`[copy] missing key "${key}"`);
    return fallback ?? key;
  };
}
