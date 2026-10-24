import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera, Vector3 } from 'three';
import { player } from './playerState.ts';

const OFFSET = new Vector3(18, 20, 18);
const target = new Vector3();
const desired = new Vector3();

// Isometric follow camera for flat screens. Zoom fits ~24 m across the
// shorter screen side so phones and desktops frame the same area.
export function IsoCamera() {
  const camera = useThree((s) => s.camera) as OrthographicCamera;
  const size = useThree((s) => s.size);

  useEffect(() => {
    camera.zoom = Math.min(size.width, size.height) / 24;
    camera.updateProjectionMatrix();
    target.copy(player.position);
    camera.position.copy(player.position).add(OFFSET);
    camera.lookAt(player.position);
  }, [camera, size]);

  useFrame((_, dt) => {
    target.lerp(player.position, Math.min(1, dt * 4));
    desired.copy(target).add(OFFSET);
    camera.position.copy(desired);
    camera.lookAt(target);
  });
  return null;
}
