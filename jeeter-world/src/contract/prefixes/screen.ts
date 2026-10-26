import type { Mesh } from 'three';
import type { PrefixHandler } from '../types.ts';
import { extra } from './extras.ts';

export const screen: PrefixHandler = (obj, out) => {
  const mediaId = extra(obj, 'mediaId');
  let mesh: Mesh | undefined;
  obj.traverse((o) => (mesh ??= (o as Mesh).isMesh ? (o as Mesh) : undefined));
  if (!mediaId || !mesh) {
    out.warnings.push(`${obj.name}: screen needs a mesh and extras.mediaId; ignored.`);
    return;
  }
  out.screens.push({ node: obj.name, mesh, mediaId });
  obj.traverse((o) => out.interactive.set(o.uuid, { node: obj.name, kind: 'screen' }));
};
