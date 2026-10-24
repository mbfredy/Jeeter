import type { TrackedEvent } from './events.ts';

// Swap the console adapter for a real vendor by implementing this.
export interface AnalyticsAdapter {
  track(e: TrackedEvent): void;
}
