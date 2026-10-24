import type { Object3D } from 'three';
import type { District } from '../content/types.ts';
import { isHidden } from '../content/visibility.ts';
import type { Region } from '../content/region.ts';
import { ruleFor, suspectedPrefix, type NodeKind } from './rules.ts';
import type { PrefixHandler, SceneContract } from './types.ts';
import { spawn } from './prefixes/spawn.ts';
import { nav } from './prefixes/nav.ts';
import { collider } from './prefixes/collider.ts';
import { zone } from './prefixes/zone.ts';
import { hotspot } from './prefixes/hotspot.ts';
import { screen } from './prefixes/screen.ts';
import { door } from './prefixes/door.ts';
import { plot } from './prefixes/plot.ts';

const HANDLERS: Record<NodeKind, PrefixHandler> = { spawn, nav, collider, zone, hotspot, screen, door, plot };

// Walks a loaded GLB and wires behavior from node names and extras.
// Never throws on bad content: problems become warnings.
export function parseScene(root: Object3D, district: District, region: Region): SceneContract {
  const out: SceneContract = {
    spawn: null, navMeshes: [], colliders: [], zones: [], hotspots: [], doors: [], screens: [], plots: [],
    interactive: new Map(), warnings: [],
  };
  root.updateMatrixWorld(true);
  const claimed: Object3D[] = [];
  root.traverse((obj) => {
    if (claimed.some((c) => isDescendant(obj, c))) return;
    const rule = ruleFor(obj.name);
    if (!rule) {
      const meant = suspectedPrefix(obj.name);
      if (meant) out.warnings.push(`${obj.name}: looks like a misnamed "${meant}" object; treated as decoration.`);
      return;
    }
    claimed.push(obj);
    if (isHidden(district, obj.name, region)) {
      obj.visible = false;
      return;
    }
    HANDLERS[rule.kind](obj, out);
  });
  if (!out.spawn) out.warnings.push('No spawn_main; starting at the origin.');
  if (!out.navMeshes.length) out.warnings.push('No nav_walkable; walking is disabled.');
  for (const w of out.warnings) console.warn(`[contract] ${w}`);
  return out;
}

function isDescendant(obj: Object3D, ancestor: Object3D): boolean {
  for (let p = obj.parent; p; p = p.parent) if (p === ancestor) return true;
  return false;
}
