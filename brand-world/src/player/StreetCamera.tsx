import { PerspectiveCamera } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { PerspectiveCamera as PCam } from 'three';
import { useActiveScene } from '../world/SceneContext.ts';
import { EYE_HEIGHT, look } from './lookState.ts';
import { player } from './playerState.ts';

// First-person camera at eye height, driven by look.yaw/pitch.
export function StreetCamera() {
  const ref = useRef<PCam>(null);
  const { contract } = useActiveScene();

  // Arriving in a new scene: face the way spawn_main faces. (On first mount
  // the toggle has already set a heading that matches the overview.)
  const seen = useRef(contract);
  useEffect(() => {
    if (seen.current === contract) return;
    seen.current = contract;
    if (contract.spawn) look.yaw = contract.spawn.rotationY;
    look.pitch = -0.05;
  }, [contract]);

  useFrame(() => {
    const cam = ref.current;
    if (!cam) return;
    cam.position.set(player.position.x, player.position.y + EYE_HEIGHT, player.position.z);
    cam.rotation.set(look.pitch, look.yaw, 0, 'YXZ');
  });
  return <PerspectiveCamera ref={ref} makeDefault fov={70} near={0.1} far={800} />;
}
