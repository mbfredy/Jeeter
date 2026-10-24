import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useWorld } from '../store/world.ts';
import { useActiveScene } from '../world/SceneContext.ts';
import { nearestInteractable } from './nearby.ts';
import { player } from './playerState.ts';

const CHECK_EVERY = 0.15; // s

// Tracks the interactable the player is standing next to (store.nearby),
// which the keyboard, the on-screen prompt and XR buttons act on.
export function ProximityWatcher() {
  const { contract } = useActiveScene();
  const timer = useRef(0);
  useFrame((_, dt) => {
    timer.current += dt;
    if (timer.current < CHECK_EVERY) return;
    timer.current = 0;
    const near = nearestInteractable(contract, player.position);
    if (near !== useWorld.getState().nearby) useWorld.getState().set({ nearby: near });
  });
  return null;
}
