import { expect, test } from '@playwright/test';
import { ruleFor, suspectedPrefix } from '../../src/contract/rules.ts';
import { checkBirthdate } from '../../src/boot/age.ts';
import { isRegionAllowed } from '../../src/boot/geo.ts';

test('contract names map to kinds', () => {
  expect(ruleFor('spawn_main')?.kind).toBe('spawn');
  expect(ruleFor('nav_walkable.001')?.kind).toBe('nav');
  expect(ruleFor('spawn_main001')?.kind).toBe('spawn'); // as GLTFLoader names a Blender duplicate
  expect(ruleFor('hotspot_kiosk')?.kind).toBe('hotspot');
  expect(ruleFor('plot_lot_01')?.kind).toBe('plot');
  expect(ruleFor('bench_01')).toBeUndefined();
});

test('near-miss names are flagged, art names are not', () => {
  expect(suspectedPrefix('Hotspot_kiosk')).toBe('hotspot_');
  expect(suspectedPrefix('hotpsot_kiosk')).toBe('hotspot_');
  expect(suspectedPrefix('door-factory')).toBe('door_');
  expect(suspectedPrefix('collision_wall')).toBe('collider_');
  expect(suspectedPrefix('spawn_side')).toBe('spawn_main');
  expect(suspectedPrefix('doorframe_left')).toBeUndefined();
  expect(suspectedPrefix('bench_01')).toBeUndefined();
});

test('age check', () => {
  const now = new Date(2026, 5, 15);
  expect(checkBirthdate(2005, 6, 15, now)).toBe('pass');
  expect(checkBirthdate(2005, 6, 16, now)).toBe('fail');
  expect(checkBirthdate(1990, 2, 31, now)).toBe('invalid');
  expect(checkBirthdate(2030, 1, 1, now)).toBe('invalid');
});

test('Canada is blocked by default', () => {
  expect(isRegionAllowed({ country: 'CA' })).toBe(false);
  expect(isRegionAllowed({ country: 'US', state: 'CA' })).toBe(true);
});
