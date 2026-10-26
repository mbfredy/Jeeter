import type { WorldEvent } from '../analytics/events.ts';

// One stream of typed world events. Analytics and (later) networking
// subscribe here, so neither touches the interaction system.
type Listener = (e: WorldEvent) => void;
const listeners = new Set<Listener>();

export const bus = {
  emit(e: WorldEvent) {
    for (const l of listeners) l(e);
  },
  on(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
