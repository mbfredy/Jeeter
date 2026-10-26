import { Suspense, lazy, useEffect } from 'react';
import { appConfig } from '../config/app.config.ts';
import { consoleAdapter } from './analytics/consoleAdapter.ts';
import { startAnalytics } from './analytics/index.ts';
import { BootFlow } from './boot/BootFlow.tsx';
import { regionCode } from './content/region.ts';
import { bus } from './events/bus.ts';
import { nullNetAdapter } from './net/adapter.ts';
import { useWorld } from './store/world.ts';

// The 3D engine only downloads after the age gate passes.
const World = lazy(() => import('./world/World.tsx').then((m) => ({ default: m.World })));

export function App() {
  useEffect(() => {
    const stopAnalytics = startAnalytics(consoleAdapter, () => {
      const s = useWorld.getState();
      return { drop: appConfig.activeDrop, device: s.device ?? 'unknown', region: s.region ? regionCode(s.region) : 'unknown' };
    });
    // Multiplayer slot: a real NetAdapter plugs in here, not in interactions.
    const stopNet = bus.on((e) => nullNetAdapter.sendEvent(e));
    return () => {
      stopAnalytics();
      stopNet();
    };
  }, []);

  return (
    <BootFlow>
      <Suspense fallback={null}>
        <World />
      </Suspense>
    </BootFlow>
  );
}
