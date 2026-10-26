// Draw-call reduction for Quest and phones. Designers group decoration under
// one parent per area (a building, a street); this pulls every decorative
// mesh in a group up to that parent and joins them by material, so a group
// costs one draw call per material. Contract nodes are never touched, and
// merging per group (not globally) keeps the iso wall-fade per building.
import type { Document, Node as GNode, Transform } from '@gltf-transform/core';
import { join } from '@gltf-transform/functions';
import { Matrix4 } from 'three';
import { ruleFor } from '../../src/contract/rules.ts';

const isContract = (n: GNode) => !!ruleFor(n.getName());

function decorDescendants(node: GNode, out: GNode[] = []): GNode[] {
  for (const child of node.listChildren()) {
    if (isContract(child)) continue;
    out.push(child);
    decorDescendants(child, out);
  }
  return out;
}

export function mergeDecor(): Transform {
  return async (doc: Document) => {
    for (const scene of doc.getRoot().listScenes()) {
      for (const top of scene.listChildren()) {
        if (isContract(top) || top.getMesh()) continue;
        const toLocal = new Matrix4().fromArray(top.getWorldMatrix()).invert();
        for (const d of decorDescendants(top)) {
          if (!d.getMesh() || d.getParentNode() === top) continue;
          const local = toLocal.clone().multiply(new Matrix4().fromArray(d.getWorldMatrix()));
          d.getParentNode()?.removeChild(d);
          d.setMatrix(local.toArray() as Parameters<GNode['setMatrix']>[0]);
          top.addChild(d);
        }
      }
    }
    // cleanup: false, because join's own prune drops empty leaf nodes such as
    // spawn_main. The optimizer's prune (keepLeaves) runs next.
    await doc.transform(join({ keepNamed: false, cleanup: false, filter: (n) => !isContract(n) }));
    // Drop decoration nodes left empty by the merge (each costs a matrix
    // update per frame). Contract nodes like spawn_main are kept.
    // join() empties merged meshes but leaves them attached.
    for (const n of doc.getRoot().listNodes()) {
      const mesh = n.getMesh();
      if (mesh && mesh.listPrimitives().length === 0) n.setMesh(null);
    }
    let removed = true;
    while (removed) {
      removed = false;
      for (const n of doc.getRoot().listNodes()) {
        if (!isContract(n) && !n.getMesh() && n.listChildren().length === 0 && n.getParentNode()) {
          n.dispose();
          removed = true;
        }
      }
    }
  };
}
