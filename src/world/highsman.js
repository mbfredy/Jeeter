import * as THREE from 'three';
import { hillHeight } from './environment.js';
import { woodTexture, stoneTexture, textPanel, FONT_BLOCK } from './textures.js';
import { std, mesh, box, cyl, panel, gableRoof, instanced, makeShrubs, makePalms, hoverRing, invisibleTrigger, rand, TAU } from './helpers.js';

// Ribbon of water that hugs the terrain between path points (cascade chute).
function cascade(path, width, mat) {
  const samples = [];
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, az] = path[i];
    const [bx, bz] = path[i + 1];
    for (let s = 0; s < 12; s++) {
      const t = s / 12;
      samples.push([ax + (bx - ax) * t, az + (bz - az) * t]);
    }
  }
  samples.push(path[path.length - 1]);
  const n = samples.length;
  const pos = new Float32Array(n * 2 * 3);
  const uv = new Float32Array(n * 2 * 2);
  const idx = [];
  for (let i = 0; i < n; i++) {
    const [x, z] = samples[i];
    const [nx, nz] = samples[Math.min(n - 1, i + 1)];
    const [px, pz] = samples[Math.max(0, i - 1)];
    let dx = nx - px;
    let dz = nz - pz;
    const l = Math.hypot(dx, dz) || 1;
    dx /= l;
    dz /= l;
    const y = Math.max(hillHeight(x, z), -0.6) + 0.45;
    const ox = -dz * width * 0.5;
    const oz = dx * width * 0.5;
    pos.set([x - ox, y, z - oz, x + ox, y, z + oz], i * 6);
    const v = 1 - i / (n - 1);
    uv.set([0, v * 4, 1, v * 4], i * 4);
    if (i < n - 1) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.renderOrder = 2;
  return m;
}

export function buildHighsman({ logo, mobile, waterfallMat, waterMat }) {
  const group = new THREE.Group();
  group.name = 'district_highsman';

  const timber = woodTexture('#7b4e2a');
  timber.repeat.set(3, 2);
  const wallMat = std({ map: timber, roughness: 0.85 });
  const roofMat = std({ color: '#4a3424', roughness: 0.7, metalness: 0.15 });
  const stoneMat = std({ map: stoneTexture('#9c9284'), roughness: 1 });
  const glowMat = std({ color: '#ffd9a0', emissive: 0xffb45c, emissiveIntensity: 0.9, roughness: 0.2 });
  const glassMat = std({ color: '#cfe6f2', transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.3, side: THREE.DoubleSide });

  // --- Lodge (rotated to face its camera) -------------------------------------
  const lodge = new THREE.Group();
  lodge.position.set(-75, 8, -25);
  lodge.rotation.y = 0.54;
  group.add(lodge);

  // stone retaining wall + Highsman sign
  lodge.add(box(30, 8.4, 3, stoneMat, 0, -8.2, 11));
  const signBack = box(13, 5.2, 0.6, std({ color: '#1f3b2a', roughness: 0.6 }), 0, -4.4, 12.8);
  lodge.add(signBack);
  if (logo) {
    const s = panel(11.5, 4.4, logo, { emissive: 0.5, transparent: true });
    s.position.set(0, -1.8, 13.15);
    lodge.add(s);
  } else {
    const s = panel(11.5, 4.4, textPanel([{ text: 'Highsman', size: 0.7, font: "'Yellowtail', cursive" }], { bg: '#1f3b2a' }), { emissive: 0.5 });
    s.position.set(0, -1.8, 13.15);
    lodge.add(s);
  }
  // ivy on the wall
  lodge.add(makeShrubs(Array.from({ length: 22 }, () => ({ x: rand(-14, 14), y: rand(-6, -1), z: 12.6, s: rand(0.5, 1) })), ['#3f6b2f', '#4f7a36', '#2f5a28']));

  // stone plinth & main hall
  lodge.add(box(22, 1.2, 13, stoneMat, 0, 0, 0));
  lodge.add(box(18, 7.5, 10, wallMat, 0, 1.2, -0.5));
  const front = panel(15, 6.4, null);
  front.material = glowMat;
  front.position.set(0, 4.6, 4.56);
  lodge.add(front);
  // mullions
  for (let i = -3; i <= 3; i++) lodge.add(box(0.25, 6.6, 0.3, std({ color: '#3a2616' }), i * 2.4, 1.3, 4.7));
  lodge.add(box(15.4, 0.3, 0.3, std({ color: '#3a2616' }), 0, 4.6, 4.7));
  const roof = gableRoof(18, 6.5, 10, roofMat, 1.4);
  roof.position.set(0, 8.7, -0.5);
  lodge.add(roof);
  // glazed gable triangle
  const tri = new THREE.Shape();
  tri.moveTo(-7.5, 0);
  tri.lineTo(0, 5.4);
  tri.lineTo(7.5, 0);
  const triMesh = new THREE.Mesh(new THREE.ShapeGeometry(tri), glowMat);
  triMesh.position.set(0, 8.75, 4.62);
  lodge.add(triMesh);
  // side wing
  lodge.add(box(10, 5.5, 9, wallMat, -13, 1.2, -2));
  const wingRoof = gableRoof(9, 3.6, 10, roofMat, 0.8);
  wingRoof.rotation.y = Math.PI / 2;
  wingRoof.position.set(-13, 6.7, -2);
  lodge.add(wingRoof);
  const wingGlow = panel(8, 3.6, null);
  wingGlow.material = glowMat;
  wingGlow.position.set(-13, 3.8, 2.56);
  lodge.add(wingGlow);
  // chimney
  lodge.add(box(2.2, 15, 2.2, stoneMat, 5, 1.2, -3));
  // deck + railings
  lodge.add(box(26, 0.5, 6, std({ map: woodTexture('#9a6a3e') }), -2, 0.9, 7.5));
  for (let i = -14; i <= 10; i += 2) lodge.add(box(0.15, 1.2, 0.15, std({ color: '#3a2616' }), i, 1.4, 10.4, { cast: false }));
  lodge.add(box(24.5, 0.15, 0.2, std({ color: '#3a2616' }), -2, 2.5, 10.4, { cast: false }));
  // umbrellas on the deck
  for (const x of [-10, -5, 6]) {
    lodge.add(cyl(0.06, 0.06, 2.6, std({ color: '#ddd' }), x, 1.4, 8, 6));
    lodge.add(cyl(0.1, 1.8, 0.7, std({ color: '#f1ead8' }), x, 3.8, 8, 10));
  }

  // greenhouse conservatory
  const gh = new THREE.Group();
  gh.position.set(16, 1.2, 1.5);
  lodge.add(gh);
  gh.add(mesh(new THREE.BoxGeometry(10, 5, 8).translate(0, 2.5, 0), glassMat, { cast: false }));
  const ghRoof = gableRoof(10, 3, 8, glassMat, 0.2);
  ghRoof.position.y = 5;
  ghRoof.castShadow = false;
  gh.add(ghRoof);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(10, 5, 8).translate(0, 2.5, 0)), new THREE.LineBasicMaterial({ color: 0xffffff }));
  gh.add(edges);
  for (let i = -4; i <= 4; i += 2) gh.add(box(0.12, 5, 0.12, std({ color: '#f2f2f2' }), i, 0, 4, { cast: false }));
  gh.add(makeShrubs(Array.from({ length: 18 }, () => ({ x: rand(-4, 4), y: 0, z: rand(-3, 3), s: rand(0.5, 1.1) })), ['#3e8a3a', '#5fa64a', '#2f6f2f', '#a07ad6']));
  const ghLight = new THREE.PointLight(0xffe2b0, 10, 14, 2);
  ghLight.position.set(0, 4, 0);
  gh.add(ghLight);

  // fire pits on the lower terrace
  const flames = [];
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  for (const [x, z] of [[-8, 13.5], [8, 13.5]]) {
    const pit = new THREE.Group();
    pit.position.set(x, -8, z + 3);
    pit.add(cyl(1.2, 1.3, 0.6, stoneMat, 0, 0, 0, 12));
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.8, 8).translate(0, 0.9, 0), flameMat);
    f.position.y = 0.6;
    f.userData.dynamic = true;
    f.userData.noHighlight = true;
    pit.add(f);
    flames.push(f);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU;
      pit.add(box(1.4, 0.5, 0.6, std({ color: '#c9b79a' }), Math.cos(a) * 2.6, 0, Math.sin(a) * 2.6));
    }
    lodge.add(pit);
  }
  const fireLight = new THREE.PointLight(0xff9a40, 14, 16, 2);
  fireLight.position.set(0, -5, 16);
  lodge.add(fireLight);

  const lodgeLight = new THREE.PointLight(0xffc27a, 16, 18, 2);
  lodgeLight.position.set(0, 5, 8);
  lodge.add(lodgeLight);

  // --- Cascading waterfalls ------------------------------------------------------
  const falls = cascade([[-114, -52], [-110, -44], [-104, -30], [-98, -16], [-94, -6]], 3.4, waterfallMat);
  group.add(falls);
  const seaFall = cascade([[-134, -16], [-146, -13], [-154, -12], [-160, -11]], 3.6, waterfallMat);
  group.add(seaFall);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(6, 32), waterMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(-93, hillHeight(-93, -4) + 0.35, -4);
  group.add(pool);
  // rocks framing the cascade
  const rocks = [];
  const fallPts = [[-110, -44], [-104, -30], [-98, -16], [-94, -6], [-146, -13]];
  for (const [x, z] of fallPts) {
    for (let k = 0; k < 9; k++) {
      const rx = x + rand(-5, 5);
      const rz = z + rand(-4, 4);
      if (Math.abs(rx - x) < 2.4) continue;
      rocks.push({ x: rx, y: hillHeight(rx, rz), z: rz, s: rand(1.2, 3), rx: rand(0, 3), ry: rand(0, 3) });
    }
  }
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * TAU;
    const x = -93 + Math.cos(a) * 6.6;
    const z = -4 + Math.sin(a) * 6.6;
    rocks.push({ x, y: hillHeight(x, z), z, s: rand(0.9, 1.6), rx: rand(0, 3), ry: rand(0, 3) });
  }
  group.add(instanced(new THREE.DodecahedronGeometry(1, 0), std({ color: '#ffffff', flatShading: true }), rocks, { cast: !mobile, colors: ['#8f877c', '#7a736a', '#a39a8c'] }));
  group.add(makeShrubs(Array.from({ length: 30 }, () => {
    const x = rand(-112, -86);
    const z = rand(-46, 2);
    return { x, y: hillHeight(x, z), z, s: rand(0.6, 1.3) };
  }), ['#4e8a3a', '#2f6b2f', '#8a5ac4', '#c0405a']));
  group.add(makePalms([[-88, 2], [-99, 0], [-86, -12], [-90, -40], [-62, -40]].map(([x, z]) => ({ x, y: hillHeight(x, z), z })), { mobile }));

  // --- 34 Pavilion & sprint track -------------------------------------------------
  const track = mesh(new THREE.PlaneGeometry(30, 9), std({ map: trackTexture(), roughness: 0.9 }), { cast: false });
  track.rotation.x = -Math.PI / 2;
  track.position.set(-69, 0.14, 11);
  group.add(track);
  const pav = new THREE.Group();
  pav.position.set(-88, 0, 11);
  pav.rotation.y = Math.PI / 2;
  group.add(pav);
  pav.add(box(11, 6, 7, wallMat, 0, 0, 0));
  const pr = gableRoof(11, 3, 7, roofMat, 0.8);
  pr.position.y = 6;
  pav.add(pr);
  const p34 = panel(4.2, 5, textPanel([{ text: '34', size: 0.72 }], { w: 256, h: 320, bg: '#1d6e6a', font: FONT_BLOCK }), { emissive: 0.4 });
  p34.position.set(-3, 3, 3.56);
  pav.add(p34);
  const pglass = panel(5, 4.4, null);
  pglass.material = glowMat;
  pglass.position.set(2.4, 2.6, 3.56);
  pav.add(pglass);

  // --- Hover ring / trigger ------------------------------------------------------
  const ring = hoverRing(30, '#5fd08a');
  ring.position.set(-78, 0.3, -12);
  group.add(ring);
  const trigger = invisibleTrigger('trigger_highsman', new THREE.BoxGeometry(46, 30, 50), 'highsman');
  trigger.position.set(-80, 12, -14);
  trigger.rotation.y = 0.5;
  group.add(trigger);

  return {
    group,
    trigger,
    ring,
    update(t) {
      flames.forEach((f, i) => {
        f.scale.set(1 + Math.sin(t * 13 + i) * 0.12, 0.8 + Math.abs(Math.sin(t * 9 + i * 2)) * 0.5, 1 + Math.cos(t * 11 + i) * 0.12);
      });
      fireLight.intensity = 12 + Math.sin(t * 17) * 2.5 + Math.sin(t * 7.3) * 1.5;
    },
  };
}

function trackTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 300;
  const g = c.getContext('2d');
  g.fillStyle = '#5a8f3e';
  g.fillRect(0, 0, 1024, 300);
  g.fillStyle = '#b5523a';
  g.fillRect(0, 40, 1024, 220);
  g.strokeStyle = '#fff';
  g.lineWidth = 4;
  for (let i = 0; i <= 6; i++) {
    const y = 40 + (i * 220) / 6;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(1024, y);
    g.stroke();
  }
  g.fillStyle = '#fff';
  g.font = "bold 90px 'Anton', Impact, sans-serif";
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('34', 860, 150);
  g.fillRect(100, 40, 8, 220);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
