import type { WebGLRenderer } from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

let loader: GLTFLoader | undefined;

// One shared loader: Meshopt geometry, KTX2 textures (transcoder copied to
// /basis by optimize-assets).
export function getGltfLoader(renderer: WebGLRenderer): GLTFLoader {
  if (!loader) {
    const ktx2 = new KTX2Loader().setTranscoderPath(`${import.meta.env.BASE_URL}basis/`).detectSupport(renderer);
    loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).setKTX2Loader(ktx2);
  }
  return loader;
}

export type { GLTF };
