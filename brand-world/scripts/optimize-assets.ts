// Compresses every scene GLB (Meshopt geometry, KTX2 textures), bakes its
// navmesh, and writes the shippable drop to public/content/<drop-id>/.
//   node scripts/optimize-assets.ts
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { dedup, meshopt, prune, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import { createIO } from './lib/io.ts';
import { listDrops } from './lib/drops.ts';
import { CONTENT_OUT, ROOT } from './lib/paths.ts';
import { Report, printReports } from './lib/report.ts';
import { bakeNavMesh } from './lib/navmesh.ts';

const budgets = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/budgets.json'), 'utf8'));

// KTX2 needs the toktx binary (KTX-Software). Without it, textures fall back
// to WebP so local builds still work; CI should install toktx.
async function textureStep(report: Report) {
  const cli = await import('@gltf-transform/cli');
  if (!spawnSync('toktx', ['--version']).error) {
    return cli.toktx({ mode: cli.Mode.ETC1S, quality: 255, resize: [budgets.maxTextureSize, budgets.maxTextureSize] } as never);
  }
  report.warn('toktx not installed: textures compressed to WebP instead of KTX2. Install KTX-Software for production builds (KTX2 cuts GPU memory on Quest).');
  const sharp = (await import('sharp')).default;
  return textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [budgets.maxTextureSize, budgets.maxTextureSize] });
}

function copyBasisTranscoder() {
  const src = path.join(ROOT, 'node_modules/three/examples/jsm/libs/basis');
  const out = path.join(ROOT, 'public', 'basis');
  fs.mkdirSync(out, { recursive: true });
  for (const f of ['basis_transcoder.js', 'basis_transcoder.wasm']) fs.copyFileSync(path.join(src, f), path.join(out, f));
}

async function main() {
  const io = await createIO();
  const reports: Report[] = [];
  copyBasisTranscoder();

  for (const drop of listDrops()) {
    const outDir = path.join(CONTENT_OUT, drop.id);
    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(path.join(outDir, 'scenes'), { recursive: true });
    const district = structuredClone(drop.district);

    for (const [id, scene] of Object.entries(district.scenes)) {
      const report = new Report(`${drop.id}/${scene.glb}`);
      reports.push(report);
      const doc = await io.read(path.join(drop.dir, scene.glb));

      const nav = await bakeNavMesh(doc);
      if (typeof nav === 'string') {
        report.warn(`Navmesh could not be prebaked (${nav}). The app will build it at load time, which stalls on Quest.`);
      } else {
        scene.navmesh = `scenes/${id}.navmesh.bin`;
        fs.writeFileSync(path.join(outDir, scene.navmesh), nav);
      }

      await doc.transform(
        dedup(),
        // keepLeaves: spawn_main is an empty node and must survive.
        // keepAttributes: screen_* meshes need UVs even with no texture yet.
        prune({ keepLeaves: true, keepExtras: true, keepAttributes: true }),
        weld(),
        ...(doc.getRoot().listTextures().length ? [await textureStep(report)] : []),
        meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
      );
      const out = path.join(outDir, scene.glb);
      await io.write(out, doc);
      const bytes = fs.statSync(out).size;
      if (bytes > budgets.maxGlbBytesCompressed) {
        report.error(`After compression the file is ${(bytes / 1048576).toFixed(1)} MB; the budget is ${(budgets.maxGlbBytesCompressed / 1048576).toFixed(0)} MB. Reduce texture sizes or count first, then geometry.`);
      }
      console.log(`  ${drop.id}/${scene.glb}: ${(bytes / 1024).toFixed(1)} KB${scene.navmesh ? ' + navmesh' : ''}`);
    }

    for (const media of Object.values(district.media)) {
      const out = path.join(outDir, media.src);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.copyFileSync(path.join(drop.dir, media.src), out);
    }
    fs.writeFileSync(path.join(outDir, 'district.json'), JSON.stringify(district, null, 2));
    fs.copyFileSync(path.join(drop.dir, 'copy.json'), path.join(outDir, 'copy.json'));
  }
  if (!printReports(reports)) process.exit(1);
}

await main();
