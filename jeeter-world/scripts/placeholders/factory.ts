// Factory interior: one room with a production line, a wall screen and the
// way back out.
import type { Document } from '@gltf-transform/core';
import { Builder, type V3 } from './builder.ts';
import { PALETTE } from './palette.ts';
import { hvac, lamp, uid } from './props.ts';

export function buildFactoryInterior(): Document {
  const b = new Builder(PALETTE);
  const g = b.group('interior');
  b.floor('floor', 20, 16, [0, -0.02, 0], 'paving', { parent: g });
  b.floor('nav_walkable', 20, 16, [0, 0, 0], 'navDebug');
  b.node('spawn_main', [0, 0, 5]);
  const walls: [string, V3, V3][] = [
    ['n', [20, 5, 0.4], [0, 2.5, -8.2]],
    ['s', [20, 5, 0.4], [0, 2.5, 8.2]],
    ['e', [0.4, 5, 16], [10.2, 2.5, 0]],
    ['w', [0.4, 5, 16], [-10.2, 2.5, 0]],
  ];
  // One group per wall so the cutaway fades walls individually.
  for (const [id, size, at] of walls) {
    b.box(`wall_${id}`, size, at, 'factoryWall', { parent: b.group(`interior_wall_${id}`) });
    b.box(`collider_wall_${id}`, size, at, 'colliderDebug');
  }
  b.box('line_base', [8, 1, 1.5], [0, 0.5, -3], 'factoryTrim', { parent: g });
  b.box('line_belt', [8, 0.1, 1.2], [0, 1.05, -3], 'tire', { parent: g });
  for (const x of [-2.5, 2.5]) b.box(uid('line_hood'), [1.6, 1.2, 1.6], [x, 1.9, -3], 'metal', { parent: g });
  b.box('collider_line', [8, 1, 1.5], [0, 0.5, -3], 'colliderDebug');
  for (const [x, z] of [[-8, -6], [8, -6]]) hvac(b, [x, 0.45, z], g);
  for (const [x, z] of [[-9, 6], [9, 6]]) lamp(b, [x, 0, z], g);
  b.panel('screen_factory_wall', 6, 3.375, [0, 3, -7.95], 'screen', { extras: { mediaId: 'factory_loop' } });
  b.box('hotspot_line_info', [1, 1.6, 1], [-6, 0.8, -1], 'signYellow', { extras: { action: 'openPanel', contentId: 'line_info' } });
  b.box('collider_line_info', [1, 1.6, 1], [-6, 0.8, -1], 'colliderDebug');
  b.box('hotspot_badge', [0.6, 0.6, 0.6], [6, 0.8, -1], 'signYellow', { extras: { action: 'collect', contentId: 'factory_badge' } });
  b.box('collider_badge', [0.6, 1.1, 0.6], [6, 0.55, -1], 'colliderDebug');
  b.box('door_exit_plaza', [2.4, 3, 0.3], [0, 1.5, 7.9], 'darkGlass', { extras: { target: 'plaza' } });
  return b.doc;
}
