// Checks every GLB in /content against the naming contract and budgets.
// Prints plain-language problems a designer can fix in Blender.
//   node scripts/validate-assets.ts [path/to/one.glb]
import fs from 'node:fs';
import path from 'node:path';
import type { Document, Node as GNode } from '@gltf-transform/core';
import { createIO } from './lib/io.ts';
import { listDrops, type Drop } from './lib/drops.ts';
import { ACTIONS_DIR, ROOT } from './lib/paths.ts';
import { Report, printReports } from './lib/report.ts';
import { RULES, baseName, ruleFor, suspectedPrefix } from '../src/contract/rules.ts';
import type { ActionDef } from '../src/interactions/types.ts';
import type { ContentKind } from '../src/content/types.ts';

const budgets = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/budgets.json'), 'utf8'));
const HIDDEN_KINDS = new Set(['nav', 'collider', 'zone']);
const CUSTOM_PROP_HOWTO = 'In Blender: select the object, open Object Properties > Custom Properties, click New';

async function loadActions(): Promise<Map<string, ActionDef>> {
  const map = new Map<string, ActionDef>();
  for (const f of fs.readdirSync(ACTIONS_DIR).filter((f) => f.endsWith('.ts'))) {
    const mod = await import(path.join(ACTIONS_DIR, f));
    map.set(mod.default.name, mod.default);
  }
  return map;
}

function contentExists(kind: ContentKind, id: string, drop: Drop): boolean {
  const d = drop.district;
  switch (kind) {
    case 'copy-panel': return `panel.${id}.title` in drop.copy.default;
    case 'media': return id in d.media;
    case 'scenes': return id in d.scenes;
    case 'links': return id in d.links;
    case 'collectibles': return id in d.collectibles;
  }
}

const WHERE: Record<ContentKind, string> = {
  'copy-panel': 'copy.json (as panel.<id>.title and panel.<id>.body)',
  media: 'district.json under "media"',
  scenes: 'district.json under "scenes"',
  links: 'district.json under "links"',
  collectibles: 'district.json under "collectibles"',
};

function str(node: GNode, key: string): string | undefined {
  const v = (node.getExtras() as Record<string, unknown>)[key];
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function triangleCount(node: GNode): number {
  let n = 0;
  for (const prim of node.getMesh()?.listPrimitives() ?? []) {
    if (prim.getMode() !== 4) continue; // TRIANGLES
    const count = prim.getIndices()?.getCount() ?? prim.getAttribute('POSITION')?.getCount() ?? 0;
    n += count / 3;
  }
  return n;
}

function checkDoc(doc: Document, r: Report, drop: Drop, actions: Map<string, ActionDef>) {
  const nodes = doc.getRoot().listNodes();
  const spawns = nodes.filter((n) => baseName(n.getName()) === 'spawn_main');
  if (spawns.length === 0) r.error('No "spawn_main" object. Add an Empty named exactly spawn_main where the player should start.');
  if (spawns.length > 1) r.error(`Found ${spawns.length} objects named spawn_main. Keep exactly one.`);
  if (!nodes.some((n) => ruleFor(n.getName())?.kind === 'nav' && n.getMesh())) {
    r.error('No "nav_walkable" mesh. Add a flat mesh named nav_walkable covering everywhere the player may walk. It is hidden in the app.');
  }

  const seen = new Set<string>();
  let tris = 0;
  for (const node of nodes) {
    const name = node.getName();
    if (!name) continue;
    if (seen.has(name)) r.warn(`Two objects are named "${name}". Give each a unique name so analytics and copy can tell them apart.`);
    seen.add(name);

    const rule = ruleFor(name);
    if (!rule) {
      const meant = suspectedPrefix(name);
      if (meant) r.warn(`"${name}" looks like it should be a ${meant} object but does not match the naming rules (lowercase, underscore, exact spelling). Rename it to start with "${meant}". Until then it is treated as plain decoration.`);
      if (node.getMesh()) tris += triangleCount(node);
      continue;
    }
    if (!HIDDEN_KINDS.has(rule.kind)) tris += triangleCount(node);
    if (HIDDEN_KINDS.has(rule.kind) && !node.getMesh()) {
      r.error(`"${name}" has no mesh. ${rule.kind === 'zone' ? 'Zones' : 'Colliders and nav meshes'} must be mesh objects, not Empties.`);
    }
    for (const key of rule.requiredExtras) {
      if (!str(node, key)) {
        r.error(`"${name}" is missing the custom property "${key}". ${CUSTOM_PROP_HOWTO}, set the name to ${key} and type String. ${hintFor(rule.kind, key, actions)}`);
      }
    }
    checkReferences(node, rule.kind, r, drop, actions);
  }

  if (tris > budgets.maxTrianglesPerScene) {
    r.error(`Scene has ${Math.round(tris).toLocaleString()} triangles; the budget is ${budgets.maxTrianglesPerScene.toLocaleString()}. Decimate or remove detail (hidden nav, collider and zone meshes are not counted).`);
  }
  for (const tex of doc.getRoot().listTextures()) {
    const size = tex.getSize();
    if (size && Math.max(...size) > budgets.maxTextureSize) {
      r.error(`Texture "${tex.getName() || tex.getURI() || 'unnamed'}" is ${size[0]}x${size[1]}px; the max is ${budgets.maxTextureSize}px. Resize it before export.`);
    }
  }
}

function hintFor(kind: string, key: string, actions: Map<string, ActionDef>): string {
  if (key === 'action') return `Value must be one of: ${[...actions.keys()].join(', ')}.`;
  if (key === 'contentId') return 'Value is the id of the content this hotspot shows (ask the content owner).';
  if (key === 'mediaId') return 'Value is a media id from district.json.';
  if (key === 'target') return 'Value is the scene id to load, e.g. plaza.';
  return '';
}

function checkReferences(node: GNode, kind: string, r: Report, drop: Drop, actions: Map<string, ActionDef>) {
  const name = node.getName();
  const scenes = drop.district.scenes;
  if (kind === 'hotspot') {
    const action = str(node, 'action');
    const contentId = str(node, 'contentId');
    if (action && !actions.has(action)) {
      r.error(`"${name}" has action "${action}", which the app does not know. Use one of: ${[...actions.keys()].join(', ')} (spelling and capitals matter).`);
    } else if (action && contentId) {
      const def = actions.get(action)!;
      if (!contentExists(def.contentKind, contentId, drop)) {
        r.error(`"${name}" points to contentId "${contentId}", but that id is not in ${WHERE[def.contentKind]}. Fix the custom property or ask for the content to be added.`);
      }
    }
  }
  if (kind === 'screen') {
    if (!node.getMesh()?.listPrimitives().every((p) => p.getAttribute('TEXCOORD_0'))) {
      r.error(`"${name}" has no UV map, so video cannot be placed on it. In Blender: Edit Mode > select all > U > Unwrap, then re-export.`);
    }
    const id = str(node, 'mediaId');
    if (id && !(id in drop.district.media)) r.error(`"${name}" uses mediaId "${id}", which is not listed in district.json under "media".`);
  }
  if (kind === 'door') {
    const id = str(node, 'target');
    if (id && !(id in scenes)) r.error(`"${name}" leads to scene "${id}", which does not exist. Scenes in this drop: ${Object.keys(scenes).join(', ')}.`);
  }
  if (kind === 'zone') {
    for (const id of (str(node, 'preload') ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
      if (!(id in scenes)) r.error(`"${name}" preloads scene "${id}", which does not exist. Scenes in this drop: ${Object.keys(scenes).join(', ')}.`);
    }
  }
  if (['hotspot', 'door', 'screen'].includes(kind) && !(`node.${baseName(name)}` in drop.copy.default)) {
    r.warn(`"${name}" has no label in copy.json (key "node.${baseName(name)}"). Screen readers and the places menu will show the raw object name.`);
  }
}

async function main() {
  const io = await createIO();
  const actions = await loadActions();
  const only = process.argv[2] ? path.resolve(process.argv[2]) : undefined;
  const reports: Report[] = [];

  for (const drop of listDrops()) {
    const dropReport = new Report(`${drop.id}/district.json`);
    reports.push(dropReport);
    if (!(drop.district.startScene in drop.district.scenes)) dropReport.error(`startScene "${drop.district.startScene}" is not one of the scenes.`);
    const referenced = new Set<string>();
    for (const [id, scene] of Object.entries(drop.district.scenes)) {
      const file = path.join(drop.dir, scene.glb);
      referenced.add(file);
      if (only && file !== only) continue;
      const r = new Report(path.relative(ROOT, file));
      reports.push(r);
      if (!fs.existsSync(file)) {
        r.error(`Scene "${id}" expects this file but it does not exist. Export it from Blender to this path.`);
        continue;
      }
      try {
        checkDoc(await io.read(file), r, drop, actions);
      } catch (e) {
        r.error(`Could not be read as a GLB (${(e as Error).message}). Re-export from Blender as glTF Binary (.glb).`);
      }
    }
    for (const [id, media] of Object.entries(drop.district.media)) {
      if (!fs.existsSync(path.join(drop.dir, media.src))) dropReport.error(`Media "${id}" points to ${media.src}, which does not exist.`);
    }
    const scenesDir = path.join(drop.dir, 'scenes');
    for (const f of fs.existsSync(scenesDir) ? fs.readdirSync(scenesDir) : []) {
      if (f.endsWith('.glb') && !referenced.has(path.join(scenesDir, f))) {
        dropReport.warn(`scenes/${f} is not used by any scene in district.json and will not ship.`);
      }
    }
  }
  console.log(`Contract prefixes: ${RULES.map((r) => r.match).join(', ')}\n`);
  if (!printReports(reports)) process.exit(1);
}

await main();
