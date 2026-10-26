// Building blockouts for the district. Each building is one group (merged by
// material at optimize time); contract nodes are added at the scene root.
import type { Builder, V3 } from './builder.ts';
import { cafeTable, hvac, uid, windowRow } from './props.ts';

const HALF_PI = Math.PI / 2;

// Interactive contract pieces shared by every storefront.
function storefront(b: Builder, id: string, door: V3, doorRot: V3, body: { size: V3; at: V3 }, action: Record<string, string>) {
  b.box(`hotspot_${id}`, [2.4, 3, 0.3], door, 'darkGlass', { rot: doorRot, extras: action });
  b.box(`collider_${id}`, body.size, body.at, 'colliderDebug');
}

function awning(b: Builder, width: number, at: V3, parent: ReturnType<Builder['group']>, rotY = 0) {
  const g = b.group(uid('awning'), at, { parent, rot: [0, rotY, 0] });
  const stripes = Math.round(width / 0.8);
  for (let i = 0; i < stripes; i++) {
    const x = -width / 2 + (i + 0.5) * (width / stripes);
    b.box(uid('awning_stripe'), [width / stripes, 0.08, 1.8], [x, 0, 0.8], i % 2 ? 'awningWhite' : 'awningGreen', { parent: g, rot: [0.35, 0, 0] });
  }
}

export function factory(b: Builder) {
  const g = b.group('district_factory');
  b.box('factory_body', [28, 12, 20], [0, 6, -30], 'factoryWall', { parent: g });
  b.box('factory_annex', [12, 16, 10], [-6, 8, -35], 'factoryWall', { parent: g });
  b.box('factory_trim', [28.4, 0.6, 20.4], [0, 12, -30], 'factoryTrim', { parent: g });
  windowRow(b, 9, 26, 3.5, -19.95, g);
  windowRow(b, 9, 26, 8, -19.95, g);
  b.box('factory_dock', [5, 4.5, 0.3], [9, 2.25, -19.9], 'factoryTrim', { parent: g });
  b.box('blockout_sign_factory', [12, 3.2, 0.5], [0, 13.8, -20.5], 'signYellow', { parent: g });
  b.cylinder('blockout_plinth_factory_roof', 1.6, 1.8, 0.6, [0, 12.3, -25], 'plinth', 16, { parent: g });
  for (const [i, x] of [4, 7, 10, 13].entries()) {
    const h = 10 + (i % 2) * 3;
    b.cylinder(uid('stack'), 0.8, 0.9, h, [x, 12, -36], 'stackWhite', 12, { parent: g });
    b.cylinder(uid('stack_band'), 0.82, 0.82, 1.2, [x, 12 + h - 2.5, -36], 'stackRed', 12, { parent: g });
  }
  for (const z of [-24, -27]) b.cylinder(uid('pipe'), 0.35, 0.35, 22, [11, 12.6, z], 'metal', 8, { parent: g, rot: [0, 0, HALF_PI] });
  for (const [x, z] of [[-10, -24], [-10, -28], [6, -26], [-2, -38]]) hvac(b, [x, 12.5, z], g);
  // Water tower
  const t = b.group('water_tower', [19, 0, -36], { parent: g });
  for (const [x, z] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) b.box(uid('tower_leg'), [0.3, 10, 0.3], [x, 5, z], 'factoryTrim', { parent: t });
  b.cylinder('tower_tank', 2.2, 2.2, 4, [0, 10, 0], 'stone', 14, { parent: t });
  b.cylinder('tower_roof', 0, 2.5, 1.6, [0, 14, 0], 'factoryTrim', 14, { parent: t });

  b.box('door_factory', [3, 3.6, 0.3], [0, 1.8, -19.85], 'darkGlass', { extras: { target: 'factory_interior' } });
  b.box('zone_factory_approach', [12, 3, 7], [0, 1.5, -15], 'colliderDebug', { extras: { preload: 'factory_interior' } });
  b.box('collider_factory', [28, 12, 20], [0, 6, -30], 'colliderDebug');
  b.box('collider_water_tower', [3, 10, 3], [19, 5, -36], 'colliderDebug');
}

export function cornerStore(b: Builder) {
  const g = b.group('district_corner_store');
  b.box('store_body', [15, 7, 14], [-38.5, 3.5, -30], 'pinkWall', { parent: g });
  b.box('store_cornice', [15.4, 0.5, 14.4], [-38.5, 7, -30], 'stone', { parent: g });
  windowRow(b, 3, 12, 2.2, -22.95, g, 2.6, 2.4);
  awning(b, 14, [-38.5, 3.4, -23], g);
  b.box('blockout_sign_store', [8, 2.2, 0.4], [-38.5, 5.6, -22.7], 'signPink', { parent: g });
  b.cylinder('blockout_plinth_store_roof', 1.4, 1.6, 0.6, [-42, 7.2, -30], 'plinth', 16, { parent: g });
  for (const x of [-44, -40.5, -33]) cafeTable(b, [x, 0, -20.5], g);
  hvac(b, [-34, 7.6, -33], g);
  storefront(b, 'corner_store', [-36, 1.5, -22.85], [0, 0, 0], { size: [15, 7, 14], at: [-38.5, 3.5, -30] }, { action: 'openPanel', contentId: 'corner_store' });
}

export function theater(b: Builder) {
  const g = b.group('district_theater');
  b.box('theater_body', [15, 10, 16], [38.5, 5, -31], 'theaterWall', { parent: g });
  b.box('theater_tower', [3, 8, 1.6], [38.5, 14, -23.6], 'signRed', { parent: g });
  b.box('theater_marquee', [12, 1.4, 2.6], [38.5, 4.2, -21.8], 'signYellow', { parent: g });
  b.box('theater_canopy', [12.4, 0.3, 2.8], [38.5, 3.4, -21.8], 'red', { parent: g });
  for (const x of [32.5, 44.5]) b.box(uid('poster'), [1.6, 2.6, 0.2], [x, 2.2, -22.9], 'signPink', { parent: g });
  b.floor('theater_carpet', 3, 4, [38.5, 0.02, -21], 'red', { parent: g });
  b.cylinder('film_reel', 1.8, 1.8, 0.5, [43, 12, -30], 'factoryTrim', 16, { parent: g, rot: [HALF_PI, 0, 0] });
  for (const x of [33, 44]) {
    b.cylinder(uid('searchlight'), 0.6, 0.7, 1, [x, 10, -36], 'metal', 10, { parent: g });
    b.cylinder(uid('searchlight_beam'), 2.2, 0.5, 30, [x, 11, -36], 'beam', 10, { parent: g, rot: [0, 0, x < 38 ? 0.25 : -0.25] });
  }
  b.panel('screen_theater_marquee', 9, 3.4, [38.5, 7.2, -22.95], 'screen', { extras: { mediaId: 'plaza_loop' } });
  storefront(b, 'theater', [38.5, 1.5, -22.85], [0, 0, 0], { size: [15, 10, 16], at: [38.5, 5, -31] }, { action: 'openPanel', contentId: 'theater' });
}

export function comicShop(b: Builder) {
  const g = b.group('district_comic_shop');
  b.box('comics_body', [15, 9, 16], [38.5, 4.5, 0], 'teal', { parent: g });
  b.box('comics_cornice', [15.4, 0.5, 16.4], [38.5, 9, 0], 'tealDark', { parent: g });
  b.box('comics_glass', [0.1, 3, 10], [30.95, 2, -2], 'window', { parent: g });
  b.cylinder('blockout_sign_comics', 2.2, 2.2, 0.4, [38.5, 11.5, 7.6], 'signBlank', 16, { parent: g, rot: [HALF_PI, 0, 0] });
  for (const [x, z] of [[35, -4], [38, -4], [41, -4], [35, 2], [41, 2]]) hvac(b, [x, 9.7, z], g);
  b.panel('screen_comics_billboard', 9, 5, [30.95, 6.3, 0], 'screen', { rot: [0, -HALF_PI, 0], extras: { mediaId: 'plaza_loop' } });
  storefront(b, 'comic_shop', [30.85, 1.5, 5.5], [0, HALF_PI, 0], { size: [15, 9, 16], at: [38.5, 4.5, 0] }, { action: 'openPanel', contentId: 'comic_shop' });
}

export function boutique(b: Builder) {
  const g = b.group('district_boutique');
  b.box('boutique_body', [15, 7, 14], [38.5, 3.5, 39], 'tealDark', { parent: g });
  b.box('boutique_cornice', [15.4, 0.5, 14.4], [38.5, 7, 39], 'teal', { parent: g });
  windowRow(b, 3, 12, 2.2, 31.95, g, 2.6, 2.4);
  awning(b, 14, [38.5, 3.4, 32], g, Math.PI);
  b.box('blockout_sign_boutique', [9, 2, 0.4], [38.5, 5.6, 31.7], 'signBlank', { parent: g });
  for (const [x, z] of [[34, 42], [38, 42], [42, 42], [36, 37]]) hvac(b, [x, 7.6, z], g);
  storefront(b, 'boutique', [41, 1.5, 31.85], [0, 0, 0], { size: [15, 7, 14], at: [38.5, 3.5, 39] }, { action: 'link', contentId: 'store_locator' });
}

export function palace(b: Builder) {
  const g = b.group('district_palace');
  b.box('palace_body', [24, 8, 14], [-34, 4, 39], 'purple', { parent: g });
  b.box('palace_cornice', [24.6, 0.8, 14.6], [-34, 8.2, 39], 'gold', { parent: g });
  for (let x = -45; x <= -23; x += 3) b.cylinder(uid('column'), 0.35, 0.4, 8, [x, 0, 31.6], 'gold', 8, { parent: g });
  b.box('palace_pool_rim', [11, 0.5, 7], [-34, 8.6, 39], 'gold', { parent: g });
  b.box('palace_pool', [10, 0.2, 6], [-34, 8.85, 39], 'poolWater', { parent: g });
  b.cylinder('blockout_plinth_palace_pool', 1.2, 1.2, 0.3, [-34, 8.9, 39], 'plinth', 16, { parent: g });
  b.box('blockout_sign_palace', [9, 3, 0.3], [-34, 5, 31.75], 'signPurple', { parent: g });
  b.floor('palace_carpet', 3, 3, [-30, 0.02, 30.3], 'red', { parent: g });
  storefront(b, 'palace', [-30, 1.5, 31.85], [0, 0, 0], { size: [24, 8, 14], at: [-34, 4, 39] }, { action: 'openPanel', contentId: 'palace' });
}
