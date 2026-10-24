import { Box3, type Object3D, type Vector3 } from 'three';
import type { SceneContract } from '../contract/types.ts';

export const INTERACT_RANGE = 2.5; // m, horizontal

interface Target { node: string; box: Box3 }
const targets = new WeakMap<SceneContract, Target[]>();

function targetsOf(c: SceneContract): Target[] {
  let list = targets.get(c);
  if (!list) {
    const objects: [string, Object3D][] = [
      ...c.hotspots.map((h) => [h.object.name, h.object] as [string, Object3D]),
      ...c.doors.map((d) => [d.object.name, d.object] as [string, Object3D]),
      ...c.screens.map((s) => [s.node, s.mesh] as [string, Object3D]),
    ];
    list = objects.map(([node, o]) => ({ node, box: new Box3().setFromObject(o) }));
    targets.set(c, list);
  }
  return list;
}

// Closest interactable within reach of p, measured on the ground plane so
// wall-mounted screens count as near when you stand under them.
export function nearestInteractable(c: SceneContract, p: Vector3): string | null {
  let best: string | null = null;
  let bestD = INTERACT_RANGE;
  for (const { node, box } of targetsOf(c)) {
    const dx = Math.max(box.min.x - p.x, 0, p.x - box.max.x);
    const dz = Math.max(box.min.z - p.z, 0, p.z - box.max.z);
    const d = Math.hypot(dx, dz);
    if (d < bestD) (best = node), (bestD = d);
  }
  return best;
}
