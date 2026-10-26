import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Raycaster, Vector3, type Material, type Mesh } from 'three';
import { useActiveScene } from '../world/SceneContext.ts';
import { player } from './playerState.ts';

const CHECK_EVERY = 0.1; // s
const FADED_OPACITY = 0.15;
const ray = new Raycaster();
const head = new Vector3();
const dir = new Vector3();

// Isometric interiors: fades any mesh between the camera and the player so
// walls never hide them. Flat-screen only.
export function OccluderFade() {
  const { root } = useActiveScene();
  const camera = useThree((s) => s.camera);
  const faded = useRef(new Map<Mesh, Material | Material[]>());
  const timer = useRef(0);

  const restore = (mesh: Mesh) => {
    const original = faded.current.get(mesh)!;
    for (const m of ([] as Material[]).concat(mesh.material)) m.dispose();
    mesh.material = original;
    faded.current.delete(mesh);
  };

  useEffect(() => () => [...faded.current.keys()].forEach(restore), [root]);

  useFrame((_, dt) => {
    timer.current += dt;
    if (timer.current < CHECK_EVERY) return;
    timer.current = 0;
    head.copy(player.position).setY(player.position.y + 1);
    dir.subVectors(head, camera.position);
    const dist = dir.length();
    ray.set(camera.position, dir.normalize());
    ray.far = dist - 0.5;
    const hits = new Set(ray.intersectObject(root, true).map((h) => h.object as Mesh).filter((o) => o.isMesh));
    for (const mesh of [...faded.current.keys()]) if (!hits.has(mesh)) restore(mesh);
    for (const mesh of hits) {
      if (faded.current.has(mesh)) continue;
      faded.current.set(mesh, mesh.material);
      mesh.material = ([] as Material[]).concat(mesh.material).map((m) => {
        const c = m.clone();
        Object.assign(c, { transparent: true, opacity: FADED_OPACITY, depthWrite: false });
        return c;
      }) as Material[];
      if (mesh.material.length === 1) mesh.material = mesh.material[0];
    }
  });
  return null;
}
