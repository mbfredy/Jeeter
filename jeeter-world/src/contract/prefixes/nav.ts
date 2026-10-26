import type { PrefixHandler } from '../types.ts';
import { hideForLogic } from './hidden.ts';

export const nav: PrefixHandler = (obj, out) => {
  out.navMeshes.push(...hideForLogic(obj));
};
