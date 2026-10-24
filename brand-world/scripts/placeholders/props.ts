// Reusable blockout props. Each returns a group node so the optimizer can
// merge the whole group by material.
import type { Node as GNode } from '@gltf-transform/core';
import type { Builder, V3 } from './builder.ts';

let n = 0;
let seed = 1;
export const uid = (prefix: string) => `${prefix}_${++n}`;
// Seeded so regenerated placeholders are identical (stable screenshots).
export const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
export const resetPlaceholders = () => ((n = 0), (seed = 1));

export function palm(b: Builder, at: V3, parent: GNode, height = 7, lean = 0.25) {
  const g = b.group(uid('palm'), at, { parent, rot: [0, rand() * Math.PI * 2, 0] });
  const segs = 4;
  let y = 0;
  for (let i = 0; i < segs; i++) {
    const h = height / segs;
    b.cylinder(uid('trunk'), 0.22 - i * 0.03, 0.28 - i * 0.03, h, [lean * i * 0.4, y, 0], 'trunk', 6, { parent: g, rot: [0, 0, -lean * 0.15] });
    y += h * 0.98;
  }
  const top: V3 = [lean * segs * 0.4, y, 0];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.triangle(uid('frond'), [0, 0, -0.35], [0, 0, 0.35], [2.8, -1.1, 0], top, 'frond', { parent: g, rot: [0, a, 0] });
  }
  return g;
}

export function lamp(b: Builder, at: V3, parent: GNode) {
  const g = b.group(uid('lamp'), at, { parent });
  b.cylinder(uid('lamp_post'), 0.07, 0.12, 4, [0, 0, 0], 'factoryTrim', 6, { parent: g });
  b.box(uid('lamp_head'), [0.4, 0.5, 0.4], [0, 4.2, 0], 'lampGlow', { parent: g });
  return g;
}

export function planter(b: Builder, size: V3, at: V3, parent: GNode, shrubs = 2) {
  const g = b.group(uid('planter'), at, { parent });
  b.box(uid('planter_wall'), size, [0, size[1] / 2, 0], 'stone', { parent: g });
  b.box(uid('planter_soil'), [size[0] - 0.3, 0.1, size[2] - 0.3], [0, size[1], 0], 'grass', { parent: g });
  for (let i = 0; i < shrubs; i++) {
    const x = (i - (shrubs - 1) / 2) * (size[0] / Math.max(shrubs, 1)) * 0.8;
    b.cylinder(uid('shrub'), 0.1, 0.6, 1.0, [x, size[1], 0], 'hedge', 6, { parent: g });
  }
  return g;
}

export function banner(b: Builder, at: V3, parent: GNode) {
  const g = b.group(uid('banner'), at, { parent });
  b.cylinder(uid('banner_pole'), 0.06, 0.08, 5, [0, 0, 0], 'factoryTrim', 6, { parent: g });
  b.box(uid('banner_cloth'), [0.9, 1.8, 0.05], [0.5, 3.8, 0], 'signPink', { parent: g });
  return g;
}

export function truck(b: Builder, at: V3, parent: GNode, body = 'truckWhite', rotY = 0) {
  const g = b.group(uid('truck'), at, { parent, rot: [0, rotY, 0] });
  b.box(uid('truck_box'), [2.4, 2.6, 5], [0, 1.9, -0.6], body, { parent: g });
  b.box(uid('truck_cab'), [2.3, 1.8, 1.8], [0, 1.5, 2.8], 'truckWhite', { parent: g });
  b.box(uid('truck_glass'), [2.1, 0.7, 0.05], [0, 1.9, 3.71], 'darkGlass', { parent: g });
  for (const [x, z] of [[-1.15, 2.6], [1.15, 2.6], [-1.15, -1.8], [1.15, -1.8]]) {
    b.cylinder(uid('tire'), 0.45, 0.45, 0.3, [x, 0.45, z], 'tire', 8, { parent: g, rot: [0, 0, Math.PI / 2] });
  }
  return g;
}

export function cafeTable(b: Builder, at: V3, parent: GNode) {
  const g = b.group(uid('cafe'), at, { parent });
  b.cylinder(uid('table'), 0.5, 0.5, 0.06, [0, 0.75, 0], 'factoryTrim', 8, { parent: g });
  b.cylinder(uid('table_leg'), 0.05, 0.05, 0.75, [0, 0, 0], 'factoryTrim', 4, { parent: g });
  b.cylinder(uid('umbrella_pole'), 0.03, 0.03, 2.4, [0, 0, 0], 'stackWhite', 4, { parent: g });
  b.cylinder(uid('umbrella'), 0, 1.3, 0.5, [0, 2.2, 0], 'umbrella', 8, { parent: g });
  return g;
}

// Rooftop clutter that makes flat roofs read as buildings.
export function hvac(b: Builder, at: V3, parent: GNode) {
  b.box(uid('hvac'), [1.4, 0.9, 1.1], at, 'hvac', { parent });
}

export function windowRow(b: Builder, count: number, width: number, y: number, z: number, parent: GNode, w = 1.2, h = 1.6) {
  for (let i = 0; i < count; i++) {
    const x = -width / 2 + (width / count) * (i + 0.5);
    b.box(uid('window'), [w, h, 0.1], [x, y, z], 'window', { parent });
  }
}

export function sailboat(b: Builder, at: V3, parent: GNode) {
  const g = b.group(uid('boat'), at, { parent, rot: [0, rand() * Math.PI, 0] });
  b.box(uid('hull'), [1.2, 0.5, 4], [0, 0.1, 0], 'stackWhite', { parent: g });
  b.triangle(uid('sail'), [0, 0.4, -1.2], [0, 0.4, 1.4], [0, 6, 0.6], [0, 0, 0], 'sail', { parent: g });
  return g;
}
