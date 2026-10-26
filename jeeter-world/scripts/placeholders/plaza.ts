// The district: central fountain plaza, buildings around it, waterfront and
// a distant skyline. Layout follows the concept board; x east, -z north.
import type { Document } from '@gltf-transform/core';
import { Builder } from './builder.ts';
import { boutique, comicShop, cornerStore, factory, palace, theater } from './buildings.ts';
import { PALETTE } from './palette.ts';
import { banner, lamp, palm, planter, rand, sailboat, truck, uid } from './props.ts';

const LAND = { minX: -48, maxX: 48, minZ: -42, maxZ: 48 };
const W = LAND.maxX - LAND.minX;
const D = LAND.maxZ - LAND.minZ;
const CX = (LAND.minX + LAND.maxX) / 2;
const CZ = (LAND.minZ + LAND.maxZ) / 2;

function ground(b: Builder) {
  const g = b.group('district_streets');
  b.floor('ground_paving', W, D, [CX, -0.02, CZ], 'paving', { parent: g });
  // Streets: one east-west north of the plaza, one along the south, two north-south.
  b.floor('street_north', W, 8, [CX, 0.0, -15], 'asphalt', { parent: g });
  b.floor('street_south', W, 8, [CX, 0.0, 27], 'asphalt', { parent: g });
  for (const x of [-27, 27]) b.floor(uid('street_ns'), 8, D, [x, 0.005, CZ], 'asphalt', { parent: g });
  for (let x = LAND.minX + 2; x < LAND.maxX; x += 5) {
    if (Math.abs(Math.abs(x) - 27) < 5) continue;
    for (const z of [-15, 27]) b.floor(uid('lane'), 2.4, 0.25, [x, 0.012, z], 'lane', { parent: g });
  }
  for (let z = LAND.minZ + 2; z < LAND.maxZ; z += 5) {
    if (Math.abs(z + 15) < 5 || Math.abs(z - 27) < 5) continue;
    for (const x of [-27, 27]) b.floor(uid('lane'), 0.25, 2.4, [x, 0.012, z], 'lane', { parent: g });
  }
  b.floor('nav_walkable', W, D, [CX, 0, CZ], 'navDebug');
}

function plaza(b: Builder) {
  const g = b.group('district_plaza');
  b.cylinder('plaza_ring', 9, 9, 0.02, [0, 0, 4], 'pavingAccent', 32, { parent: g });
  b.cylinder('fountain_basin', 5.5, 5.8, 0.8, [0, 0, 4], 'stone', 32, { parent: g });
  b.cylinder('fountain_water', 5, 5, 0.06, [0, 0.8, 4], 'poolWater', 32, { parent: g });
  b.cylinder('fountain_tier', 2, 2.4, 1.6, [0, 0.8, 4], 'stone', 20, { parent: g });
  b.cylinder('fountain_tier_water', 1.8, 1.8, 0.05, [0, 2.4, 4], 'poolWater', 20, { parent: g });
  // Centerpiece sculpture goes here (designer art).
  b.cylinder('blockout_plinth_fountain', 1, 1.2, 1.2, [0, 2.4, 4], 'plinth', 16, { parent: g });
  b.cylinder('collider_fountain', 5.8, 5.8, 1, [0, 0, 4], 'colliderDebug', 16);

  // Terraced planters frame the plaza; the lane at x -8..-4 stays open.
  const planters: [number, number, number, number][] = [
    [-16, -6, 8, 3], [16, -6, 8, 3], [-17, 14, 6, 6], [17, 14, 6, 6], [14, 4, 3, 8], [-15, 4, 3, 8],
  ];
  for (const [x, z, w, d] of planters) {
    planter(b, [w, 0.9, d], [x, 0, z], g, 2);
    palm(b, [x, 0.9, z], g, 6.5);
    b.box(uid('collider_planter'), [w, 1, d], [x, 0.5, z], 'colliderDebug');
  }
  for (const [x, z] of [[-11, -9], [11, -9], [-11, 20], [11, 20]]) banner(b, [x, 0, z], g);
  for (const [x, z] of [[-10, -2], [10, -2], [-10, 10], [10, 10], [-3, 21], [3, 21]]) lamp(b, [x, 0, z], g);
  for (const [x, z] of [[-6, 3], [6, 3]]) b.box(uid('bench'), [2.4, 0.5, 0.7], [x, 0.25, z], 'factoryTrim', { parent: g });

  b.box('hotspot_info_kiosk', [1, 1.6, 1], [-6.5, 0.8, 11.5], 'signYellow', { extras: { action: 'openPanel', contentId: 'plaza_welcome' } });
  b.box('collider_info_kiosk', [1, 1.6, 1], [-6.5, 0.8, 11.5], 'colliderDebug');
  b.node('spawn_main', [0, 0, 18]);
}

function streetscape(b: Builder) {
  const g = b.group('district_streetscape');
  // Palms along the street edges, skipping intersections and the walking lane.
  for (let x = LAND.minX + 4; x < LAND.maxX; x += 7) {
    if (Math.abs(Math.abs(x) - 27) < 6) continue;
    if (x > -9 && x < -3) continue;
    palm(b, [x, 0, -10], g, 6 + rand() * 2);
    palm(b, [x, 0, 22], g, 6 + rand() * 2);
  }
  for (let z = -6; z < 20; z += 7) for (const x of [-22, 22]) lamp(b, [x, 0, z], g);
  truck(b, [12, 0, -16], g, 'truckWhite', Math.PI / 2);
  truck(b, [10, 0, 26.5], g, 'truckGreen', -Math.PI / 2);
  b.box('collider_truck_north', [6.6, 3, 2.6], [12.6, 1.5, -16], 'colliderDebug');
  b.box('collider_truck_south', [6.6, 3, 2.6], [9.4, 1.5, 26.5], 'colliderDebug');
  const van = b.group('van', [-12, 0, 28], { parent: g, rot: [0, Math.PI / 2, 0] });
  b.box('van_body', [2.2, 2.4, 5], [0, 1.6, 0], 'vanPink', { parent: van });
  b.box('collider_van', [5, 3, 2.2], [-12, 1.5, 28], 'colliderDebug');
  b.floor('plot_lot_01', 10, 10, [-4, 0.02, 40], 'grass');
}

function waterfront(b: Builder) {
  const g = b.group('district_waterfront');
  // Sized to stay a diorama in the XR tabletop view (260 m x tabletopScale).
  b.floor('bay', 260, 260, [0, -0.9, 0], 'water', { parent: g });
  const wall = 1.4;
  b.box('seawall_north', [W + wall * 2, 1.6, wall], [CX, -0.6, LAND.minZ - wall / 2], 'seawall', { parent: g });
  b.box('seawall_south', [W + wall * 2, 1.6, wall], [CX, -0.6, LAND.maxZ + wall / 2], 'seawall', { parent: g });
  b.box('seawall_west', [wall, 1.6, D], [LAND.minX - wall / 2, -0.6, CZ], 'seawall', { parent: g });
  b.box('seawall_east', [wall, 1.6, D], [LAND.maxX + wall / 2, -0.6, CZ], 'seawall', { parent: g });
  for (let x = -18; x <= 26; x += 6) {
    if (x > -10 && x < 2) continue; // plot
    palm(b, [x, 0, 46], g, 7 + rand() * 2);
  }
  for (let z = -36; z <= 24; z += 8) palm(b, [-46, 0, z], g, 7 + rand() * 2);
  for (const at of [[-70, -0.9, 10], [-62, -0.9, 38], [-88, -0.9, -24], [20, -0.9, 64]] as const) sailboat(b, [...at], g);
}

function backdrop(b: Builder) {
  const g = b.group('district_backdrop');
  for (let x = -120; x < 90; x += 9) {
    const h = 14 + rand() * 46;
    b.box(uid('tower'), [6 + rand() * 4, h, 6 + rand() * 4], [x, h / 2 - 1, -80 - rand() * 10], 'skyline', { parent: g });
    const h2 = 10 + rand() * 30;
    b.box(uid('tower_far'), [8, h2, 8], [x + 4, h2 / 2 - 1, -104], 'skylineFar', { parent: g });
  }
  for (let x = -125; x < 130; x += 42) b.cylinder(uid('mountain'), 0, 30 + rand() * 12, 24 + rand() * 18, [x, -1, -122], 'mountain', 7, { parent: g });
  // Suspension bridge across the bay to the north-west.
  const br = b.group('bridge', [-112, 0, -58], { parent: g });
  b.box('bridge_deck', [120, 1.5, 6], [0, 10, 0], 'bridgeRed', { parent: br });
  for (const x of [-30, 30]) {
    for (const z of [-2.5, 2.5]) b.box(uid('bridge_tower'), [1.6, 42, 1.6], [x, 21, z], 'bridgeRed', { parent: br });
    b.box(uid('bridge_tower_beam'), [1.6, 1.4, 6], [x, 38, 0], 'bridgeRed', { parent: br });
  }
  // Main cable as a sagging polyline between towers and anchors.
  const pts: [number, number][] = [];
  for (let i = 0; i <= 12; i++) {
    const x = -30 + (60 * i) / 12;
    pts.push([x, 12 + 26 * ((x / 30) ** 2)]);
  }
  pts.unshift([-60, 11]);
  pts.push([60, 11]);
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    for (const z of [-2.5, 2.5]) {
      b.box(uid('bridge_cable'), [len, 0.3, 0.3], [(x1 + x2) / 2, (y1 + y2) / 2, z], 'bridgeRed', { parent: br, rot: [0, 0, Math.atan2(y2 - y1, x2 - x1)] });
    }
  }
}

export function buildPlaza(): Document {
  const b = new Builder(PALETTE);
  ground(b);
  plaza(b);
  factory(b);
  cornerStore(b);
  theater(b);
  comicShop(b);
  boutique(b);
  palace(b);
  streetscape(b);
  waterfront(b);
  backdrop(b);
  return b.doc;
}
