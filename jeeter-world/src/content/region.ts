export interface Region {
  country: string;
  state?: string;
}

export function regionCode(r: Region): string {
  return r.state ? `${r.country}-${r.state}` : r.country;
}
