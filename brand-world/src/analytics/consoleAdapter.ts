import type { AnalyticsAdapter } from './adapter.ts';

export const consoleAdapter: AnalyticsAdapter = {
  track(e) {
    console.info('[analytics]', e.type, e);
  },
};
