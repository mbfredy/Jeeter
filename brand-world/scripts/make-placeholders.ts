// Generates blockout GLBs that follow the naming contract, so the whole
// pipeline runs before real art arrives. Grey boxes only: this is not art.
//   node scripts/make-placeholders.ts [drop-id]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { Document, type Buffer as GBuffer, type Material, type Node as GNode } from '@gltf-transform/core';
import { createIO } from './lib/io.ts';
import { CONTENT_SRC } from './lib/paths.ts';

type V3 = [number, number, number];

class Builder {
  doc = new Document();
  buffer: GBuffer = this.doc.createBuffer();
  scene = this.doc.createScene('scene');
  mats = new Map<string, Material>();

  mat(hex: string): Material {
    if (!this.mats.has(hex)) {
      const c = parseInt(hex.slice(1), 16);
      const rgb = [(c >> 16) & 255, (c >> 8) & 255, c & 255].map((v) => (v / 255) ** 2.2);
      this.mats.set(hex, this.doc.createMaterial(hex).setBaseColorFactor([...rgb, 1] as [number, number, number, number]).setRoughnessFactor(0.9));
    }
    return this.mats.get(hex)!;
  }

  mesh(name: string, pos: number[], nrm: number[], uv: number[], idx: number[], color: string) {
    const acc = (type: 'VEC3' | 'VEC2' | 'SCALAR', arr: Float32Array<ArrayBuffer> | Uint16Array<ArrayBuffer>) =>
      this.doc.createAccessor().setType(type).setArray(arr).setBuffer(this.buffer);
    const prim = this.doc
      .createPrimitive()
      .setAttribute('POSITION', acc('VEC3', new Float32Array(pos)))
      .setAttribute('NORMAL', acc('VEC3', new Float32Array(nrm)))
      .setAttribute('TEXCOORD_0', acc('VEC2', new Float32Array(uv)))
      .setIndices(acc('SCALAR', new Uint16Array(idx)))
      .setMaterial(this.mat(color));
    return this.doc.createMesh(name).addPrimitive(prim);
  }

  add(name: string, at: V3, extras?: Record<string, string>, mesh?: ReturnType<Builder['mesh']>): GNode {
    const node = this.doc.createNode(name).setTranslation(at);
    if (mesh) node.setMesh(mesh);
    if (extras) node.setExtras(extras);
    this.scene.addChild(node);
    return node;
  }

  box(name: string, size: V3, at: V3, color: string, extras?: Record<string, string>) {
    const [x, y, z] = size.map((s) => s / 2);
    const faces: { n: V3; c: V3[] }[] = [
      { n: [1, 0, 0], c: [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]] },
      { n: [-1, 0, 0], c: [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]] },
      { n: [0, 1, 0], c: [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z]] },
      { n: [0, -1, 0], c: [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]] },
      { n: [0, 0, 1], c: [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]] },
      { n: [0, 0, -1], c: [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]] },
    ];
    const pos: number[] = [], nrm: number[] = [], uv: number[] = [], idx: number[] = [];
    faces.forEach((f, i) => {
      f.c.forEach((c) => (pos.push(...c), nrm.push(...f.n)));
      uv.push(0, 1, 1, 1, 1, 0, 0, 0);
      const b = i * 4;
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    });
    return this.add(name, at, extras, this.mesh(name, pos, nrm, uv, idx, color));
  }

  // Floor plane facing +Y.
  floor(name: string, w: number, d: number, at: V3, color: string) {
    const [x, z] = [w / 2, d / 2];
    const pos = [-x, 0, z, x, 0, z, x, 0, -z, -x, 0, -z];
    return this.add(name, at, undefined, this.mesh(name, pos, Array(4).fill([0, 1, 0]).flat(), [0, 1, 1, 1, 1, 0, 0, 0], [0, 1, 2, 0, 2, 3], color));
  }

  // Vertical plane facing +Z, glTF UV convention (v=0 at top).
  panel(name: string, w: number, h: number, at: V3, color: string, extras?: Record<string, string>) {
    const [x, y] = [w / 2, h / 2];
    const pos = [-x, -y, 0, x, -y, 0, x, y, 0, -x, y, 0];
    return this.add(name, at, extras, this.mesh(name, pos, Array(4).fill([0, 0, 1]).flat(), [0, 1, 1, 1, 1, 0, 0, 0], [0, 1, 2, 0, 2, 3], color));
  }
}

const GREY = '#9a9a9a', DARK = '#5c5c5c', NAV = '#3fbf6f', DOOR = '#6f86a8', HOT = '#c8a050', COL = '#b04040';

function plaza(): Document {
  const b = new Builder();
  b.floor('blockout_ground', 40, 40, [0, -0.02, 0], GREY);
  b.floor('nav_walkable', 40, 40, [0, 0, 0], NAV);
  b.add('spawn_main', [0, 0, 10]);
  b.box('blockout_fountain', [4, 1, 4], [0, 0.5, 0], DARK);
  b.box('collider_fountain', [4, 1, 4], [0, 0.5, 0], COL);
  b.box('blockout_factory', [14, 8, 8], [0, 4, -15], DARK);
  b.box('collider_factory', [14, 8, 8], [0, 4, -15], COL);
  b.box('door_factory', [2.4, 3, 0.3], [0, 1.5, -10.9], DOOR, { target: 'factory_interior' });
  b.box('zone_factory_approach', [8, 3, 6], [0, 1.5, -7], COL, { preload: 'factory_interior' });
  b.box('hotspot_info_kiosk', [1, 1.6, 1], [-6, 0.8, 3], HOT, { action: 'openPanel', contentId: 'plaza_welcome' });
  b.box('hotspot_store_link', [1, 1.6, 1], [6, 0.8, 3], HOT, { action: 'link', contentId: 'store_locator' });
  b.floor('plot_lot_01', 6, 6, [14, 0.01, 14], DARK);
  return b.doc;
}

function factory(): Document {
  const b = new Builder();
  b.floor('blockout_floor', 20, 16, [0, -0.02, 0], GREY);
  b.floor('nav_walkable', 20, 16, [0, 0, 0], NAV);
  b.add('spawn_main', [0, 0, 5]);
  const walls: [string, V3, V3][] = [
    ['n', [20, 5, 0.4], [0, 2.5, -8.2]],
    ['s', [20, 5, 0.4], [0, 2.5, 8.2]],
    ['e', [0.4, 5, 16], [10.2, 2.5, 0]],
    ['w', [0.4, 5, 16], [-10.2, 2.5, 0]],
  ];
  for (const [id, size, at] of walls) {
    b.box(`blockout_wall_${id}`, size, at, DARK);
    b.box(`collider_wall_${id}`, size, at, COL);
  }
  b.box('blockout_line', [8, 1, 1.5], [0, 0.5, -3], DARK);
  b.box('collider_line', [8, 1, 1.5], [0, 0.5, -3], COL);
  b.panel('screen_factory_wall', 6, 3.375, [0, 3, -7.95], '#111111', { mediaId: 'factory_loop' });
  b.box('hotspot_line_info', [1, 1.6, 1], [-6, 0.8, -1], HOT, { action: 'openPanel', contentId: 'line_info' });
  b.box('hotspot_badge', [0.6, 0.6, 0.6], [6, 0.8, -1], HOT, { action: 'collect', contentId: 'factory_badge' });
  b.box('door_exit_plaza', [2.4, 3, 0.3], [0, 1.5, 7.9], DOOR, { target: 'plaza' });
  return b.doc;
}

// Neutral test-pattern clip for screen_* targets.
function placeholderVideo(out: string) {
  if (fs.existsSync(out)) return;
  try {
    execFileSync('ffmpeg', ['-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=1280x720:rate=30:duration=6',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-profile:v', 'main', '-b:v', '600k', '-movflags', '+faststart', '-an', out]);
    console.log(`  wrote ${path.relative(CONTENT_SRC, out)}`);
  } catch {
    console.warn('  ⚠ ffmpeg not found: add a placeholder MP4 at', out);
  }
}

const drop = process.argv[2] ?? 'rolled-fresh';
const dir = path.join(CONTENT_SRC, drop);
fs.mkdirSync(path.join(dir, 'scenes'), { recursive: true });
fs.mkdirSync(path.join(dir, 'media'), { recursive: true });
const io = await createIO();
for (const [name, build] of [['plaza', plaza], ['factory_interior', factory]] as const) {
  const out = path.join(dir, 'scenes', `${name}.glb`);
  await io.write(out, build());
  console.log(`  wrote ${path.relative(CONTENT_SRC, out)}`);
}
placeholderVideo(path.join(dir, 'media', 'factory_loop.mp4'));
