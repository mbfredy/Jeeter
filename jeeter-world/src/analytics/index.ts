import { bus } from '../events/bus.ts';
import type { AnalyticsAdapter } from './adapter.ts';
import type { EventContext } from './events.ts';

export function startAnalytics(adapter: AnalyticsAdapter, context: () => Omit<EventContext, 'ts'>) {
  return bus.on((e) => adapter.track({ ...e, ...context(), ts: Date.now() }));
}
