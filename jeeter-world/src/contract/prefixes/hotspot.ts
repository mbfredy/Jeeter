import type { PrefixHandler } from '../types.ts';
import { extra } from './extras.ts';

export const hotspot: PrefixHandler = (obj, out) => {
  const action = extra(obj, 'action');
  const contentId = extra(obj, 'contentId');
  if (!action || !contentId) {
    out.warnings.push(`${obj.name}: hotspot needs extras.action and extras.contentId; ignored.`);
    return;
  }
  out.hotspots.push({ object: obj, action, contentId });
  obj.traverse((o) => out.interactive.set(o.uuid, { node: obj.name, kind: 'hotspot' }));
};
