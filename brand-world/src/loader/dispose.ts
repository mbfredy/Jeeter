import type { Material, Mesh, Object3D, Texture } from 'three';

export function disposeObject(root: Object3D) {
  root.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    for (const m of ([] as Material[]).concat(mesh.material)) {
      for (const v of Object.values(m)) if ((v as Texture)?.isTexture) (v as Texture).dispose();
      m.dispose();
    }
  });
}
