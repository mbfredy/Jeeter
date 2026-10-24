// App-wide settings. Nothing in here is drop-specific copy or art.
export const appConfig = {
  // Which /content/<drop-id>/ folder the build serves.
  activeDrop: 'rolled-fresh',
  minimumAge: 21,
  geo: {
    // ISO 3166-1 alpha-2. A non-empty allow list blocks everything not on it.
    allowCountries: [] as string[],
    blockCountries: ['CA'],
    // Region the v1 stub reports. Replace with an edge lookup (see src/boot/geo.ts).
    stubRegion: { country: 'US', state: 'CA' },
  },
  // Max scenes kept parsed in memory. 2 keeps Quest standalone under budget.
  sceneResidency: 2,
};
