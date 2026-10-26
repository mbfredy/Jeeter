import { Euler, Vector3 } from 'three';
import type { PrefixHandler } from '../types.ts';

export const spawn: PrefixHandler = (obj, out) => {
  const position = obj.getWorldPosition(new Vector3());
  const rotationY = new Euler().setFromQuaternion(obj.getWorldQuaternion(obj.quaternion.clone()), 'YXZ').y;
  out.spawn = { position, rotationY };
};
