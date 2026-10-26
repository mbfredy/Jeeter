// Bakes a navmesh from nav_walkable + collider_* meshes at build time, so
// Quest never has to run Recast on load.
import type { Document } from '@gltf-transform/core';
import { init, exportNavMesh } from 'recast-navigation';
import { generateSoloNavMesh } from 'recast-navigation/generators';
import { ruleFor } from '../../src/contract/rules.ts';
import { NAV_CONFIG } from '../../src/nav/config.ts';

let ready: Promise<void> | undefined;

export async function bakeNavMesh(doc: Document): Promise<Uint8Array | string> {
  ready ??= init();
  await ready;
  const positions: number[] = [];
  const indices: number[] = [];
  for (const node of doc.getRoot().listNodes()) {
    const kind = ruleFor(node.getName())?.kind;
    if (kind !== 'nav' && kind !== 'collider') continue;
    const m = node.getWorldMatrix();
    for (const prim of node.getMesh()?.listPrimitives() ?? []) {
      const pos = prim.getAttribute('POSITION');
      if (!pos) continue;
      const base = positions.length / 3;
      const v = [0, 0, 0];
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, v);
        positions.push(
          m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
          m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
          m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14],
        );
      }
      const idx = prim.getIndices();
      const count = idx ? idx.getCount() : pos.getCount();
      for (let i = 0; i < count; i++) indices.push(base + (idx ? idx.getScalar(i) : i));
    }
  }
  if (!indices.length) return 'no nav_walkable geometry';
  const result = generateSoloNavMesh(new Float32Array(positions), new Uint32Array(indices), NAV_CONFIG);
  if (!result.success) return result.error ?? 'Recast failed';
  const data = exportNavMesh(result.navMesh);
  result.navMesh.destroy();
  return data;
}
