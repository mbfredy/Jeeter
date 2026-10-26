import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, type Group } from 'three';
import { useWorld } from '../store/world.ts';
import { useActiveScene } from '../world/SceneContext.ts';
import { stick } from './lookState.ts';
import { player } from './playerState.ts';
import { useKeys } from './useKeys.ts';

const SPEED = 4.5; // m/s
const KEY_DIRS: Record<string, [number, number]> = {
  w: [0, 1], arrowup: [0, 1], s: [0, -1], arrowdown: [0, -1],
  a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0],
};
const forward = new Vector3();
const right = new Vector3();
const step = new Vector3();

// Neutral marker for the player position. Not a character.
export function Player() {
  const { nav } = useActiveScene();
  const xrMode = useWorld((s) => s.xrMode);
  const street = useWorld((s) => s.viewMode === 'street');
  const camera = useThree((s) => s.camera);
  const ref = useRef<Group>(null);
  const keys = useKeys();

  useFrame((_, dt) => {
    dt = Math.min(dt, 0.1);
    let [x, z] = [0, 0];
    for (const k of keys.current) if (KEY_DIRS[k]) (x += KEY_DIRS[k][0], z += KEY_DIRS[k][1]);
    // Keys are full speed; the touch joystick is analog.
    const keyLen = Math.hypot(x, z);
    if (keyLen) (x /= keyLen), (z /= keyLen);
    else (x = stick.x), (z = stick.y);
    if (Math.hypot(x, z) > 0.05 && nav && xrMode === 'none') {
      // Moves relative to the camera, flattened onto the ground.
      camera.getWorldDirection(forward).setY(0).normalize();
      right.crossVectors(forward, camera.up).normalize();
      step.copy(forward).multiplyScalar(z).addScaledVector(right, x).multiplyScalar(SPEED * dt);
      const next = nav.closest(step.add(player.position));
      if (next) player.position.copy(next);
      player.path = [];
    } else if (player.path.length) {
      const target = player.path[0];
      const dist = player.position.distanceTo(target);
      const move = SPEED * dt;
      if (dist <= move) {
        player.position.copy(target);
        player.path.shift();
      } else {
        player.position.lerp(target, move / dist);
      }
    }
    ref.current?.position.copy(player.position);
  });

  return (
    <group ref={ref} visible={xrMode !== 'walkin' && !street}>
      <mesh position={[0, 0.9, 0]}>
        <capsuleGeometry args={[0.3, 1.2, 4, 12]} />
        <meshStandardMaterial color="#e8e8e8" />
      </mesh>
      {/* X-ray silhouette: keeps the player visible behind buildings and palms. */}
      <mesh position={[0, 0.9, 0]} renderOrder={999} visible={xrMode === 'none'}>
        <capsuleGeometry args={[0.3, 1.2, 4, 12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.35} depthTest={false} depthWrite={false} />
      </mesh>
    </group>
  );
}
