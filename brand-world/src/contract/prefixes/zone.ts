import { Box3 } from 'three';
import type { PrefixHandler } from '../types.ts';
import { extra } from './extras.ts';
import { hideForLogic } from './hidden.ts';

export const zone: PrefixHandler = (obj, out) => {
  const box = new Box3().setFromObject(obj);
  hideForLogic(obj);
  const preload = (extra(obj, 'preload') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  out.zones.push({ name: obj.name, box, preload });
};
