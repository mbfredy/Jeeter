import { Vector3 } from 'three';

// Per-frame player data lives outside React to avoid re-renders.
// Positions are in scene-local space (same space as the navmesh).
export const player = {
  position: new Vector3(),
  path: [] as Vector3[],
};

export function placePlayer(p: Vector3) {
  player.position.copy(p);
  player.path = [];
}
