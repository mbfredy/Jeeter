import type { District } from './types.ts';
import { regionCode, type Region } from './region.ts';

// True when district.json hides this node name or content id in the region.
export function isHidden(district: District, key: string, region: Region): boolean {
  const states = district.visibility?.[key]?.hideInStates ?? [];
  return states.includes(regionCode(region)) || states.includes(region.country);
}
