import type { WebGLRenderer } from 'three';
import { appConfig } from '../../config/app.config.ts';
import { contentUrl } from '../content/load.ts';
import type { District } from '../content/types.ts';
import { disposeObject } from './dispose.ts';
import { getGltfLoader, type GLTF } from './gltf.ts';

export interface LoadedScene {
  gltf: GLTF;
  navmesh: Uint8Array | null;
}

const cache = new Map<string, Promise<LoadedScene>>();
const order: string[] = []; // most recently used last

function touch(id: string) {
  const i = order.indexOf(id);
  if (i >= 0) order.splice(i, 1);
  order.push(id);
}

// Keeps at most appConfig.sceneResidency scenes parsed; evicts the least
// recently used one that is not the current scene.
function evict(current: string) {
  while (order.length > appConfig.sceneResidency) {
    const id = order.find((x) => x !== current);
    if (!id) return;
    order.splice(order.indexOf(id), 1);
    cache.get(id)?.then((s) => disposeObject(s.gltf.scene));
    cache.delete(id);
  }
}

export function loadScene(
  id: string,
  district: District,
  renderer: WebGLRenderer,
  onProgress?: (fraction: number) => void,
  { current = id }: { current?: string } = {},
): Promise<LoadedScene> {
  touch(id);
  let p = cache.get(id);
  if (!p) {
    const def = district.scenes[id];
    if (!def) return Promise.reject(new Error(`Unknown scene "${id}"`));
    const glb = getGltfLoader(renderer).loadAsync(contentUrl(def.glb), (e) => {
      if (e.total) onProgress?.(e.loaded / e.total);
    });
    const nav = def.navmesh
      ? fetch(contentUrl(def.navmesh)).then((r) => (r.ok ? r.arrayBuffer().then((b) => new Uint8Array(b)) : null)).catch(() => null)
      : Promise.resolve(null);
    p = Promise.all([glb, nav]).then(([gltf, navmesh]) => ({ gltf, navmesh }));
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  } else {
    onProgress?.(1);
  }
  evict(current);
  return p;
}

// Zone proximity preloading: fetch and parse, no GPU upload until rendered.
export function preloadScenes(ids: string[], district: District, renderer: WebGLRenderer, current: string) {
  for (const id of ids) if (id !== current && district.scenes[id]) loadScene(id, district, renderer, undefined, { current }).catch(() => {});
}
