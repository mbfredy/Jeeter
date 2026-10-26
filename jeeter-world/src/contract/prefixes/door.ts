import type { PrefixHandler } from '../types.ts';
import { extra } from './extras.ts';

export const door: PrefixHandler = (obj, out) => {
  const target = extra(obj, 'target');
  if (!target) {
    out.warnings.push(`${obj.name}: door needs extras.target; ignored.`);
    return;
  }
  out.doors.push({ object: obj, target });
  obj.traverse((o) => out.interactive.set(o.uuid, { node: obj.name, kind: 'door' }));
};
