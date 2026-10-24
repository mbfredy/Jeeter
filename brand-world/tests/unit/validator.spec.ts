import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { Document, NodeIO } from '@gltf-transform/core';

// Builds a deliberately broken drop and checks the validator explains each
// problem in designer terms.
function brokenDrop(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bw-validate-'));
  const drop = path.join(dir, 'test-drop');
  fs.mkdirSync(path.join(drop, 'scenes'), { recursive: true });
  fs.writeFileSync(path.join(drop, 'district.json'), JSON.stringify({
    id: 'test-drop', startScene: 'lobby',
    scenes: { lobby: { glb: 'scenes/lobby.glb' }, missing: { glb: 'scenes/missing.glb' } },
    media: {}, links: {}, collectibles: {},
  }));
  fs.writeFileSync(path.join(drop, 'copy.json'), JSON.stringify({ default: {} }));
  return dir;
}

test('validator reports actionable errors', async () => {
  const dir = brokenDrop();
  // A valid GLB that breaks the naming contract.
  await new NodeIO().write(path.join(dir, 'test-drop', 'scenes', 'lobby.glb'), brokenScene());

  const run = spawnSync('node', ['scripts/validate-assets.ts'], { env: { ...process.env, CONTENT_DIR: dir }, encoding: 'utf8' });
  const out = run.stdout + run.stderr;
  expect(run.status).toBe(1);
  expect(out).toContain('No "spawn_main" object');
  expect(out).toContain('No "nav_walkable" mesh');
  expect(out).toContain('"hotspot_no_extras" is missing the custom property "action"');
  expect(out).toContain('"hotspot_bad_action" has action "teleportUser", which the app does not know');
  expect(out).toContain('"Hotspot_wrong_case" looks like it should be a hotspot_ object');
  expect(out).toContain('"door_nowhere" leads to scene "basement", which does not exist');
  expect(out).toContain('Scene "missing" expects this file but it does not exist');
});

function brokenScene(): Document {
  const doc = new Document();
  const scene = doc.createScene();
  for (const [name, extras] of [
    ['hotspot_no_extras', {}],
    ['hotspot_bad_action', { action: 'teleportUser', contentId: 'x' }],
    ['Hotspot_wrong_case', {}],
    ['door_nowhere', { target: 'basement' }],
  ] as [string, Record<string, string>][]) {
    scene.addChild(doc.createNode(name).setExtras(extras));
  }
  return doc;
}
