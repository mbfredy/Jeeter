import { Vector3, type Mesh } from 'three';
import { importNavMesh, init, NavMeshQuery, type NavMesh } from 'recast-navigation';
import { threeToSoloNavMesh } from '@recast-navigation/three';
import { NAV_CONFIG } from './config.ts';

export interface Nav {
  path(from: Vector3, to: Vector3): Vector3[];
  // reach: how far (m, horizontally) to search for the navmesh.
  closest(p: Vector3, reach?: number): Vector3 | null;
  dispose(): void;
}

let ready: Promise<void> | undefined;
const HALF_EXTENTS = { x: 2, y: 4, z: 2 };

// Uses the navmesh baked by optimize-assets; builds one at runtime only as a
// fallback (blocks the main thread, noticeable on Quest).
export async function createNav(baked: Uint8Array | null, meshes: Mesh[]): Promise<Nav | null> {
  ready ??= init();
  await ready;
  let navMesh: NavMesh | undefined;
  if (baked) {
    navMesh = importNavMesh(baked).navMesh;
  } else if (meshes.length) {
    console.warn('[nav] no baked navmesh; generating at runtime');
    const result = threeToSoloNavMesh(meshes, NAV_CONFIG);
    if (result.success) navMesh = result.navMesh;
  }
  if (!navMesh) return null;
  const query = new NavMeshQuery(navMesh);
  const v = (p: { x: number; y: number; z: number }) => new Vector3(p.x, p.y, p.z);
  return {
    path(from, to) {
      const r = query.computePath(from, to, { halfExtents: HALF_EXTENTS });
      return r.success ? r.path.map(v) : [];
    },
    closest(p, reach = HALF_EXTENTS.x) {
      const r = query.findClosestPoint(p, { halfExtents: { x: reach, y: HALF_EXTENTS.y, z: reach } });
      return r.success ? v(r.point) : null;
    },
    dispose() {
      query.destroy();
      navMesh!.destroy();
    },
  };
}
