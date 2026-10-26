import type { Object3D } from 'three';

export function extra(obj: Object3D, key: string): string | undefined {
  const v = obj.userData?.[key];
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}
