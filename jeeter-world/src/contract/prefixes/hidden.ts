import type { Mesh, Object3D } from 'three';

// Layer for geometry that exists for logic only. The default raycaster
// (pointer events) only sees layer 0, so these never steal clicks.
export const LOGIC_LAYER = 1;

export function hideForLogic(obj: Object3D): Mesh[] {
  const meshes: Mesh[] = [];
  obj.traverse((o) => {
    o.visible = false;
    o.layers.set(LOGIC_LAYER);
    if ((o as Mesh).isMesh) meshes.push(o as Mesh);
  });
  return meshes;
}
