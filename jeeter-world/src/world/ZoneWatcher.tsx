import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { bus } from '../events/bus.ts';
import { preloadScenes } from '../loader/sceneCache.ts';
import { player } from '../player/playerState.ts';
import { useWorld } from '../store/world.ts';
import { useActiveScene } from './SceneContext.ts';

const CHECK_EVERY = 0.2; // s

// Fires zone enter/exit and preloads the scenes a zone links to.
export function ZoneWatcher() {
  const { id, contract } = useActiveScene();
  const gl = useThree((s) => s.gl);
  const inside = useRef(new Set<string>());
  const timer = useRef(0);

  useFrame((_, dt) => {
    timer.current += dt;
    if (timer.current < CHECK_EVERY) return;
    timer.current = 0;
    for (const zone of contract.zones) {
      const now = zone.box.containsPoint(player.position);
      const was = inside.current.has(zone.name);
      if (now === was) continue;
      if (now) {
        inside.current.add(zone.name);
        bus.emit({ type: 'zone_enter', sceneId: id, zone: zone.name });
        const district = useWorld.getState().district;
        if (district) preloadScenes(zone.preload, district, gl, id);
      } else {
        inside.current.delete(zone.name);
        bus.emit({ type: 'zone_exit', sceneId: id, zone: zone.name });
      }
    }
  });
  return null;
}
