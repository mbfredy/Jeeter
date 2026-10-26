// Generates blockout GLBs that follow the naming contract, so the whole
// pipeline runs before real art arrives. Primitives and flat colors only:
// a layout guide, not art. Sculptures, signage and characters are left as
// named plinths and blank sign slabs for the design team.
//   node scripts/make-placeholders.ts [drop-id]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createIO } from './lib/io.ts';
import { CONTENT_SRC } from './lib/paths.ts';
import { buildPlaza } from './placeholders/plaza.ts';
import { buildFactoryInterior } from './placeholders/factory.ts';
import { resetPlaceholders } from './placeholders/props.ts';

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
for (const [name, build] of [['plaza', buildPlaza], ['factory_interior', buildFactoryInterior]] as const) {
  resetPlaceholders();
  const out = path.join(dir, 'scenes', `${name}.glb`);
  await io.write(out, build());
  console.log(`  wrote ${path.relative(CONTENT_SRC, out)}`);
}
placeholderVideo(path.join(dir, 'media', 'factory_loop.mp4'));
