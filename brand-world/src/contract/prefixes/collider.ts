import type { PrefixHandler } from '../types.ts';
import { hideForLogic } from './hidden.ts';

// Colliders block movement by being baked into the navmesh.
export const collider: PrefixHandler = (obj, out) => {
  out.colliders.push(...hideForLogic(obj));
};
