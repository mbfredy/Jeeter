import { appConfig } from '../../config/app.config.ts';
import type { Region } from '../content/region.ts';

// v1 stub: a static site cannot see the visitor's country. Production needs
// an edge function (Cloudflare Worker / Vercel Edge) that reads the request's
// country header and returns it here. Only this function changes.
export async function lookupRegion(): Promise<Region> {
  if (import.meta.env.DEV) {
    const override = new URLSearchParams(location.search).get('region');
    if (override) {
      const [country, state] = override.toUpperCase().split('-');
      return { country, state };
    }
  }
  return appConfig.geo.stubRegion;
}

export function isRegionAllowed(region: Region): boolean {
  const { allowCountries, blockCountries } = appConfig.geo;
  if (blockCountries.includes(region.country)) return false;
  return allowCountries.length === 0 || allowCountries.includes(region.country);
}
