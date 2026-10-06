import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { groundTexture, GROUND_BOUNDS, skyTexture, facadeTextures } from './textures.js';
import { createWaterMaterial, shoreMaskTexture } from './water.js';
import { std, mesh, instanced, makePalms, makePines, makeShrubs, insidePoly, rand, TAU, box, cyl } from './helpers.js';

// Coastline (x, z). South: Vault marina, curved beach, Dodi waterfront.
// West: Highsman cliffs dropping into the sea. North-east: the bay and bridge.
export const LAND_POLY = [
  [-158, -170],
  [168, -170],
  [168, 40],
  [150, 72],
  [120, 80],
  [32, 80],
  [24, 88],
  [12, 98],
  [-4, 102],
  [-20, 99],
  [-32, 90],
  [-38, 80],
  [-100, 80],
  [-122, 70],
  [-142, 44],
  [-156, 10],
  [-160, -60],
];

export const RING = { rx: 52, rz: 44 }; // stadium ring road
export const BOULEVARD_Z = 51;

// Keep each district's camera sight-line clear of filler buildings / palms.
const SIGHTLINES = [
  [[0, 68], [0, 0]],
  [[-48, 20], [-75, -25]],
  [[50, 26], [75, -20]],
  [[24, 96], [45, 60]],
  [[-28, 96], [-45, 65]],
];
export function inSightline(x, z, pad = 12) {
  for (const [[ax, az], [bx, bz]] of SIGHTLINES) {
    const vx = bx - ax;
    const vz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
    if (Math.hypot(x - (ax + vx * t), z - (az + vz * t)) < pad) return true;
  }
  return false;
}

// Areas the procedural city filler must avoid.
function blocked(x, z) {
  if (inSightline(x, z, 14)) return true;
  if ((x / 58) ** 2 + (z / 50) ** 2 < 1) return true; // stadium + ring road
  if (x < -52 && z < 30) return true; // Highsman hillside
  if (x > 46 && x < 118 && z > -52 && z < 6) return true; // PRIMITIV
  if (x > 22 && z > 46) return true; // Dodi + waterfront
  if (x < -22 && z > 44) return true; // Vault + marina
  if (z > 44 && Math.abs(x) < 40) return true; // plaza, palm grove, beach
  if (Math.abs(z - BOULEVARD_Z) < 6) return true;
  if (Math.abs(x) < 5 && z < -40) return true; // north avenue
  if (Math.abs(z + 60) < 5) return true; // cross street
  if (Math.abs(x - 100) < 5 && z < -50) return true;
  if (x > 150 && z < -140) return true; // bridge approach
  return !insidePoly(x, z, LAND_POLY.map(([a, b]) => [a * 0.96, b * 0.96]));
}

function paintGround(g, P, s, W, H) {
  g.fillStyle = '#cbb898';
  g.fillRect(0, 0, W, H);
  // pocket parks scattered through the city blocks
  g.fillStyle = '#86a75a';
  for (let i = 0; i < 40; i++) {
    const [px, pz] = P(rand(-50, 166), rand(-168, 46));
    g.beginPath();
    g.ellipse(px, pz, rand(4, 9) * s, rand(4, 9) * s, rand(0, 3), 0, TAU);
    g.fill();
  }

  // park lawns
  g.fillStyle = '#7ea255';
  const lawn = (x, z, rx, rz) => {
    const [px, pz] = P(x, z);
    g.beginPath();
    g.ellipse(px, pz, rx * s, rz * s, 0, 0, TAU);
    g.fill();
  };
  lawn(-80, 20, 30, 18);
  lawn(-150, -40, 30, 80);
  lawn(-60, -110, 30, 30);

  // beach sand (the southern bulge)
  g.fillStyle = '#ead6aa';
  g.beginPath();
  [[-40, 66], [-38, 80], [-32, 90], [-20, 99], [-4, 102], [12, 98], [24, 88], [32, 80], [34, 66], [0, 72]].forEach(([x, z], i) => {
    const [px, pz] = P(x, z);
    if (i) g.lineTo(px, pz);
    else g.moveTo(px, pz);
  });
  g.closePath();
  g.fill();

  const road = (pts, width) => {
    g.strokeStyle = '#4f5158';
    g.lineWidth = width * s;
    g.lineCap = 'round';
    g.beginPath();
    pts.forEach(([x, z], i) => {
      const [px, pz] = P(x, z);
      if (i) g.lineTo(px, pz);
      else g.moveTo(px, pz);
    });
    g.stroke();
    g.strokeStyle = 'rgba(255,240,200,0.7)';
    g.lineWidth = 0.25 * s;
    g.setLineDash([2 * s, 2 * s]);
    g.stroke();
    g.setLineDash([]);
  };
  // stadium ring road
  const ring = [];
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * TAU;
    ring.push([Math.cos(a) * RING.rx, Math.sin(a) * RING.rz]);
  }
  road(ring, 7);
  road([[-120, BOULEVARD_Z], [160, BOULEVARD_Z]], 7);
  road([[0, -RING.rz], [0, -170]], 7);
  road([[-60, -60], [168, -60]], 6);
  road([[100, -60], [100, -170]], 6);
  road([[RING.rx, 0], [168, 10]], 6);
  road([[-RING.rx, 4], [-58, 10]], 6);
  road([[160, -60], [168, -150]], 6);

  // plaza between stadium and boulevard + compass star
  const [cx, cz] = P(0, 36);
  g.fillStyle = '#e8dcc4';
  g.beginPath();
  g.ellipse(cx, cz, 26 * s, 9 * s, 0, 0, TAU);
  g.fill();
  g.fillStyle = '#5c6f9a';
  g.beginPath();
  g.arc(cx, cz, 7 * s, 0, TAU);
  g.fill();
  g.fillStyle = '#e9d7a5';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const r = i % 2 ? 4 : 6.5;
    g.beginPath();
    g.moveTo(cx, cz);
    g.lineTo(cx + Math.cos(a - 0.22) * 1.6 * s, cz + Math.sin(a - 0.22) * 1.6 * s);
    g.lineTo(cx + Math.cos(a) * r * s, cz + Math.sin(a) * r * s);
    g.lineTo(cx + Math.cos(a + 0.22) * 1.6 * s, cz + Math.sin(a + 0.22) * 1.6 * s);
    g.closePath();
    g.fill();
  }
  // crosswalk stripes on the boulevard
  g.fillStyle = 'rgba(255,255,255,0.85)';
  for (const x0 of [-20, 20]) {
    for (let i = 0; i < 7; i++) {
      const [px, pz] = P(x0 - 3 + i, BOULEVARD_Z - 3.5);
      g.fillRect(px, pz, 0.5 * s, 7 * s);
    }
  }
  // waterfront promenade boards
  g.fillStyle = '#b98f62';
  const [a1, b1] = P(-100, 74);
  g.fillRect(a1, b1, 62 * s, 6 * s);
  const [a2, b2] = P(32, 74);
  g.fillRect(a2, b2, 90 * s, 6 * s);
}

// Highsman hillside heightfield (west). Returns world height for x,z.
export function hillHeight(x, z) {
  if (!insidePoly(x, z, LAND_POLY)) return -4;
  const d1 = Math.hypot(x + 122, z + 82);
  let h = 44 * Math.exp(-((d1 / 52) ** 2));
  const d2 = Math.hypot(x + 140, z + 18);
  h += 22 * Math.exp(-((d2 / 30) ** 2));
  const d3 = Math.hypot(x + 96, z + 40);
  h += 16 * Math.exp(-((d3 / 22) ** 2));
  h += (Math.sin(x * 0.21) * Math.cos(z * 0.17) + Math.sin(x * 0.07 + z * 0.11)) * 1.4;
  // lodge plateau at y = 8
  const dl = Math.hypot(x + 76, z + 26);
  const k = THREE.MathUtils.smoothstep(dl, 14, 36);
  h = THREE.MathUtils.lerp(8, Math.max(h, 2), k);
  // fade into flat city ground towards the east / south
  const fadeX = THREE.MathUtils.smoothstep(-x, 52, 70);
  const fadeZ = THREE.MathUtils.smoothstep(-z, -26, -6);
  h *= Math.min(fadeX, fadeZ);
  // flat pad for the 34 Pavilion sprint track
  const fx = Math.max(0, -90 - x, x + 48);
  const fz = Math.max(0, 0 - z, z - 22);
  h *= THREE.MathUtils.smoothstep(Math.hypot(fx, fz), 0, 9);
  // sea cliffs
  const coast = distToCoastWest(x, z);
  if (coast < 6) h = Math.min(h, THREE.MathUtils.lerp(-4, h, coast / 6));
  return h;
}

function distToCoastWest(x, z) {
  let best = Infinity;
  for (let i = 0; i < LAND_POLY.length; i++) {
    const [ax, az] = LAND_POLY[i];
    const [bx, bz] = LAND_POLY[(i + 1) % LAND_POLY.length];
    if (Math.min(ax, bx) > -95) continue;
    const vx = bx - ax;
    const vz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
    best = Math.min(best, Math.hypot(x - (ax + vx * t), z - (az + vz * t)));
  }
  return best;
}

export function createEnvironment({ scene, mobile, sunDir }) {
  const root = new THREE.Group();
  root.name = 'environment';
  const dynamic = [];

  // --- Sky dome -------------------------------------------------------------
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1600, 32, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  sky.renderOrder = -1;
  root.add(sky);

  // --- Land -----------------------------------------------------------------
  const shape = new THREE.Shape(LAND_POLY.map(([x, z]) => new THREE.Vector2(x, -z)));
  const landGeo = new THREE.ExtrudeGeometry(shape, { depth: 6, bevelEnabled: false });
  landGeo.rotateX(-Math.PI / 2);
  landGeo.translate(0, -6, 0);
  // planar UVs in world XZ for the painted ground
  const lp = landGeo.attributes.position;
  const uv = landGeo.attributes.uv;
  for (let i = 0; i < lp.count; i++) {
    uv.setXY(
      i,
      (lp.getX(i) - GROUND_BOUNDS.minX) / (GROUND_BOUNDS.maxX - GROUND_BOUNDS.minX),
      1 - (lp.getZ(i) - GROUND_BOUNDS.minZ) / (GROUND_BOUNDS.maxZ - GROUND_BOUNDS.minZ),
    );
  }
  const groundMap = groundTexture(paintGround);
  const land = mesh(landGeo, [std({ map: groundMap, roughness: 0.95 }), std({ color: '#8d8173', roughness: 1 })], { cast: false });
  root.add(land);

  // seawall rocks along the urban waterfront (riprap like the references)
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rocks = [];
  const addRocksAlong = (a, b, step = 1.6) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let d = 0; d < len; d += step) {
      const t = d / len;
      rocks.push({ x: a[0] + (b[0] - a[0]) * t + rand(-0.6, 0.6), y: -0.6, z: a[1] + (b[1] - a[1]) * t + rand(0.4, 1.4), s: rand(0.9, 1.6), rx: rand(0, 3), ry: rand(0, 3) });
    }
  };
  addRocksAlong([-100, 80], [-38, 80]);
  addRocksAlong([32, 80], [120, 80]);
  addRocksAlong([120, 80], [150, 72]);
  addRocksAlong([150, 72], [168, 40]);
  root.add(instanced(rockGeo, std({ color: '#8b8580', flatShading: true }), rocks, { colors: ['#8b8580', '#77716b', '#9c958c'] }));

  // --- Water ----------------------------------------------------------------
  const shore = shoreMaskTexture(LAND_POLY);
  const waterMat = createWaterMaterial({ shoreMask: shore, sunDir });
  waterMat.uniforms.uShore.value = shore;
  const water = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000, 1, 1), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.7;
  water.receiveShadow = false;
  root.add(water);

  // --- Highsman hillside terrain (shared world terrain) ----------------------
  const tw = 130;
  const td = 200;
  const seg = mobile ? 70 : 110;
  const tGeo = new THREE.PlaneGeometry(tw, td, seg, Math.round((seg * td) / tw));
  tGeo.rotateX(-Math.PI / 2);
  tGeo.translate(-170 + tw / 2, 0, -170 + td / 2);
  const tp = tGeo.attributes.position;
  const colors = new Float32Array(tp.count * 3);
  const cGrass = new THREE.Color('#6f9a4c');
  const cForest = new THREE.Color('#3f6436');
  const cRock = new THREE.Color('#6f6a52');
  const cSand = new THREE.Color('#b9a58a');
  const c = new THREE.Color();
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i);
    const z = tp.getZ(i);
    let h = hillHeight(x, z);
    if (h > -3.9 && h < 0.08) h = 0.08;
    tp.setY(i, h);
  }
  tGeo.computeVertexNormals();
  const tn = tGeo.attributes.normal;
  for (let i = 0; i < tp.count; i++) {
    const h = tp.getY(i);
    const slope = 1 - tn.getY(i);
    c.copy(cGrass).lerp(cForest, THREE.MathUtils.smoothstep(h, 3, 14));
    c.lerp(cRock, THREE.MathUtils.smoothstep(slope, 0.35, 0.65) * 0.8);
    if (h < 0.5) c.lerp(cSand, 0.4);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  tGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const terrain = mesh(tGeo, std({ vertexColors: true, roughness: 1, flatShading: false }), { cast: !mobile });
  terrain.name = 'terrain_highsman';
  root.add(terrain);

  // pines on the hillside
  const pinePts = [];
  for (let i = 0; i < (mobile ? 220 : 420); i++) {
    const x = rand(-160, -52);
    const z = rand(-168, 24);
    const h = hillHeight(x, z);
    if (h < 2 || h > 50) continue;
    if (Math.hypot(x + 76, z + 26) < 17) continue; // lodge
    if (Math.hypot(x + 94, z + 30) < 9) continue; // waterfall channel
    if (x > -60 && z > 0) continue;
    pinePts.push({ x, y: h - 0.3, z });
  }
  root.add(makePines(pinePts, { mobile }));

  // --- Mountains & far shores -----------------------------------------------
  const mountainMat = std({ vertexColors: true, roughness: 1 });
  const cLow = new THREE.Color('#58744a');
  const cHigh = new THREE.Color('#a8916e');
  const mountain = (x, z, r, h, seed) => {
    const g = new THREE.IcosahedronGeometry(1, 4);
    const p = g.attributes.position;
    const col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const vx = p.getX(i);
      const vy = p.getY(i);
      const vz = p.getZ(i);
      const n = 1 + 0.18 * Math.sin(vx * 5 + seed) * Math.cos(vz * 4 + seed * 2) + 0.08 * Math.sin(vx * 13 + vz * 11 + seed);
      p.setXYZ(i, vx * r * n, Math.max(vy, -0.2) * h * n, vz * r * 0.7 * n);
      const t = THREE.MathUtils.clamp(vy, 0, 1);
      c.copy(cLow).lerp(cHigh, THREE.MathUtils.smoothstep(t, 0.45, 0.95));
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    const m = mesh(g, mountainMat, { cast: false, receive: false });
    m.position.set(x, -3, z);
    return m;
  };
  [
    [-360, -330, 150, 110, 1],
    [-220, -420, 140, 140, 2],
    [-470, -150, 120, 80, 3],
    [-70, -560, 180, 120, 4],
    [180, -640, 220, 150, 5],
    [430, -560, 170, 100, 6],
    [-340, 90, 90, 50, 7],
  ].forEach((a) => root.add(mountain(...a)));

  // --- Golden-Gate-style suspension bridge (north-east) ---------------------
  root.add(buildBridge(new THREE.Vector3(172, 0, -150), new THREE.Vector3(560, 0, -470)));

  // --- City filler ------------------------------------------------------------
  const cityTransforms = [];
  const roofTransforms = [];
  const tries = mobile ? 900 : 1600;
  for (let i = 0; i < tries && cityTransforms.length < (mobile ? 110 : 190); i++) {
    const x = rand(-60, 166);
    const z = rand(-168, 48);
    if (blocked(x, z)) continue;
    const w = rand(7, 14);
    const d = rand(7, 14);
    if (blocked(x + w / 2, z + d / 2) || blocked(x - w / 2, z - d / 2)) continue;
    if (cityTransforms.some((b) => Math.abs(b.x - x) < (b.sx + w) / 2 + 2 && Math.abs(b.z - z) < (b.sz + d) / 2 + 2)) continue;
    const far = z < -100 && x > 10 && x < 150;
    const h = far ? rand(18, 38) : rand(6, 18);
    cityTransforms.push({ x, y: 0, z, sx: w, sy: h, sz: d, ry: 0 });
    roofTransforms.push({ x, y: h, z, sx: w * 0.9, sy: 0.5, sz: d * 0.9 });
  }
  const bGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const [winMap, winEm] = facadeTextures();
  const bMat = std({ map: winMap, emissive: 0xffffff, emissiveMap: winEm, emissiveIntensity: 0.45, roughness: 0.75 });
  worldSpaceWindows(bMat, 13, 19);
  root.add(
    instanced(bGeo, bMat, cityTransforms, {
      cast: true,
      colors: ['#c98e6b', '#ead9bf', '#b5704a', '#dccbb0', '#c4bdb2', '#d6ae84', '#a9bccf', '#e8e2d6', '#9a5a3c'].map((x) => new THREE.Color(x)),
    }),
  );
  root.add(instanced(bGeo, std({ color: '#ffffff' }), roofTransforms, { colors: ['#6f7a68', '#5c8a46', '#7a7a7a', '#6a9a50'].map((x) => new THREE.Color(x)) }));

  // --- Palms ------------------------------------------------------------------
  const palmPts = [];
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * TAU;
    palmPts.push({ x: Math.cos(a) * (RING.rx + 5.5), z: Math.sin(a) * (RING.rz + 5.5) });
    if (i % 2 === 0) palmPts.push({ x: Math.cos(a) * (RING.rx - 5.5), z: Math.sin(a) * (RING.rz - 5.5) });
  }
  for (let x = -110; x <= 150; x += 9) {
    if (Math.abs(x) < 24) continue;
    palmPts.push({ x, z: BOULEVARD_Z - 5 }, { x: x + 4, z: BOULEVARD_Z + 5 });
  }
  for (let x = -98; x <= 120; x += 7) {
    if (x > -40 && x < 30) continue;
    palmPts.push({ x, z: 77 + rand(-0.5, 0.5) });
  }
  // dense palm grove between plaza and beach (composite reference)
  for (let i = 0; i < 34; i++) {
    const x = rand(-34, 30);
    const z = rand(58, 72);
    palmPts.push({ x, z, s: rand(0.8, 1.15) });
  }
  for (let i = 0; i < 26; i++) palmPts.push({ x: rand(-22, 22), z: rand(26, 32) });
  root.add(makePalms(palmPts.filter((p) => !(Math.abs(p.x) < 9 && p.z > 30 && p.z < 44) && !(p.z < 60 && inSightline(p.x, p.z, 5))), { mobile }));

  const shrubPts = [];
  for (let i = 0; i < (mobile ? 200 : 420); i++) {
    const x = rand(-150, 160);
    const z = rand(-160, 78);
    if (!insidePoly(x, z, LAND_POLY)) continue;
    if ((x / 44) ** 2 + (z / 36) ** 2 < 1) continue; // stadium
    const ring = (x / RING.rx) ** 2 + (z / RING.rz) ** 2;
    if (ring > 0.82 && ring < 1.2) continue; // ring road
    if (x < -52 && z < 30) continue; // hillside
    if (Math.abs(z - BOULEVARD_Z) < 4) continue;
    if (Math.abs(x) < 12 && z > 28 && z < 46) continue; // fountain plaza
    shrubPts.push({ x, z, s: rand(0.5, 1.2) });
  }
  root.add(makeShrubs(shrubPts));

  // jacaranda (purple flowering) trees, signature of every reference image
  const jac = [];
  for (let i = 0; i < 36; i++) {
    const a = rand(0, TAU);
    jac.push({ x: Math.cos(a) * (RING.rx + rand(8, 13)), y: 2.5, z: Math.sin(a) * (RING.rz + rand(8, 13)), s: rand(1.6, 2.4) });
  }
  for (let i = 0; i < 16; i++) jac.push({ x: rand(-95, -30), y: 2.5, z: rand(55, 74), s: rand(1.4, 2.2) });
  const jacFiltered = jac.filter((p) => !(Math.abs(p.z - BOULEVARD_Z) < 4) && !(p.x > 22 && p.z > 46 && p.x < 90));
  root.add(instanced(new THREE.IcosahedronGeometry(1.4, 1), std({ color: '#ffffff', flatShading: true }), jacFiltered, { colors: ['#8a6ad0', '#9d7fe0', '#7b5cc4'].map((x) => new THREE.Color(x)), cast: !mobile }));
  root.add(instanced(new THREE.CylinderGeometry(0.15, 0.25, 2.5, 5).translate(0, 1.25, 0), std({ color: '#5a4636' }), jacFiltered.map((p) => ({ ...p, y: 0, s: 1 }))));

  // --- Plaza fountain (compass) --------------------------------------------
  const fountain = new THREE.Group();
  fountain.position.set(0, 0, 36);
  fountain.add(cyl(7.2, 7.4, 0.6, std({ color: '#d9cfbf' }), 0, 0, 0, 48));
  const pool = new THREE.Mesh(new THREE.CircleGeometry(6.6, 48), waterMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.62;
  fountain.add(pool);
  const jets = [];
  const jetMat = new THREE.MeshBasicMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.75, depthWrite: false });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const j = new THREE.Mesh(new THREE.ConeGeometry(0.35, 4, 8, 1, true).translate(0, 2, 0), jetMat);
    j.position.set(Math.cos(a) * 3.2, 0.6, Math.sin(a) * 3.2);
    j.userData.dynamic = true;
    jets.push(j);
    fountain.add(j);
  }
  const center = new THREE.Mesh(new THREE.ConeGeometry(0.5, 6, 8, 1, true).translate(0, 3, 0), jetMat);
  center.position.y = 0.6;
  center.userData.dynamic = true;
  jets.push(center);
  fountain.add(center);
  root.add(fountain);

  // --- Beach: cabanas, umbrellas, loungers (south bulge) ----------------------
  const cabanaPts = [[-24, 84], [-14, 90], [-2, 93], [10, 89], [20, 82], [-28, 76], [4, 80]];
  const hutWood = std({ color: '#8a5a34', roughness: 0.9 });
  const thatch = std({ color: '#6b4a2e', roughness: 1 });
  root.add(instanced(new THREE.BoxGeometry(3, 2.4, 3).translate(0, 1.2, 0), hutWood, cabanaPts.map(([x, z]) => ({ x, z, ry: rand(-0.3, 0.3) })), { cast: true }));
  root.add(instanced(new THREE.ConeGeometry(3.2, 1.8, 4).rotateY(Math.PI / 4).translate(0, 3.3, 0), thatch, cabanaPts.map(([x, z]) => ({ x, z, ry: rand(-0.3, 0.3) })), { cast: true }));
  const beachUmb = [];
  const loungers = [];
  for (let i = 0; i < (mobile ? 18 : 34); i++) {
    const x = rand(-30, 26);
    const z = rand(78, 99);
    if (!insidePoly(x, z, LAND_POLY.map(([a, b]) => [a * 0.97, b * 0.97]))) continue;
    if (cabanaPts.some(([cx, cz]) => Math.hypot(cx - x, cz - z) < 4)) continue;
    beachUmb.push({ x, z, s: rand(0.8, 1.1) });
    loungers.push({ x: x + 1.2, y: 0, z: z + 0.6, ry: rand(-0.4, 0.4) });
  }
  root.add(instanced(new THREE.ConeGeometry(1.7, 0.6, 10).translate(0, 2.4, 0), std({ color: '#ffffff' }), beachUmb, { colors: ['#f4efe2', '#2a1a74', '#e9dcc0', '#1f3fa8'] }));
  root.add(instanced(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 5).translate(0, 1.2, 0), std({ color: '#ddd' }), beachUmb));
  root.add(instanced(new THREE.BoxGeometry(0.8, 0.25, 2).translate(0, 0.3, 0), std({ color: '#f2ece0' }), loungers));

  // --- Street lamps along boulevard -----------------------------------------
  const lampPts = [];
  for (let x = -100; x <= 150; x += 18) lampPts.push({ x, z: BOULEVARD_Z - 4 }, { x: x + 9, z: BOULEVARD_Z + 4 });
  root.add(instanced(new THREE.CylinderGeometry(0.1, 0.14, 5, 6).translate(0, 2.5, 0), std({ color: '#2d2d33', metalness: 0.6, roughness: 0.4 }), lampPts));
  root.add(instanced(new THREE.SphereGeometry(0.35, 8, 6).translate(0, 5.1, 0), new THREE.MeshBasicMaterial({ color: 0xfff1c8, toneMapped: false }), lampPts));

  // --- People (static crowd) ---------------------------------------------------
  const personGeo = mergeGeometries([
    new THREE.CapsuleGeometry(0.28, 0.9, 2, 6).translate(0, 0.75, 0),
    new THREE.SphereGeometry(0.22, 6, 5).translate(0, 1.55, 0),
  ]);
  const personMat = std({ color: '#ffffff', roughness: 0.9 });
  const shirts = ['#4b2a8c', '#1f3fa8', '#ffffff', '#2a2a2a', '#7e62d9', '#d8d8d8', '#3a66d6', '#e9c46a', '#111111'].map((x) => new THREE.Color(x));
  const crowd = [];
  const crowdN = mobile ? 300 : 650;
  for (let i = 0; i < crowdN; i++) {
    const r = Math.random();
    let x;
    let z;
    if (r < 0.35) {
      const a = rand(0, TAU);
      const k = rand(1.02, 1.12);
      x = Math.cos(a) * 36 * k * 1.0;
      z = Math.sin(a) * 28 * k;
    } else if (r < 0.55) {
      x = rand(-26, 26);
      z = rand(30, 44);
      if (Math.hypot(x, z - 36) < 7.6) continue;
    } else if (r < 0.75) {
      x = rand(-100, 120);
      z = rand(74.5, 79);
      if (x > -38 && x < 32) continue;
    } else if (r < 0.88) {
      x = rand(-30, 26);
      z = rand(76, 96);
      if (!insidePoly(x, z, LAND_POLY)) continue;
    } else {
      x = rand(-100, 140);
      z = BOULEVARD_Z + (Math.random() < 0.5 ? -4.4 : 4.4) + rand(-0.5, 0.5);
    }
    crowd.push({ x, y: 0, z, ry: rand(0, TAU), s: rand(0.9, 1.1) });
  }
  root.add(instanced(personGeo, personMat, crowd, { colors: shirts }));

  // --- Walkers (animated) around the stadium promenade -------------------------
  const walkerN = mobile ? 90 : 220;
  const walkers = new THREE.InstancedMesh(personGeo, personMat, walkerN);
  walkers.userData.dynamic = true;
  const walkerData = [];
  for (let i = 0; i < walkerN; i++) {
    walkerData.push({ a: rand(0, TAU), k: rand(1.1, 1.3), speed: rand(0.02, 0.05) * (Math.random() < 0.5 ? -1 : 1) });
    walkers.setColorAt(i, shirts[i % shirts.length]);
  }
  root.add(walkers);

  // --- Traffic -----------------------------------------------------------------
  const carGeo = mergeGeometries([
    new THREE.BoxGeometry(1.8, 0.8, 3.8).translate(0, 0.6, 0),
    new THREE.BoxGeometry(1.6, 0.7, 2).translate(0, 1.3, -0.2),
  ]);
  const carN = mobile ? 40 : 80;
  const cars = new THREE.InstancedMesh(carGeo, std({ color: '#ffffff', metalness: 0.4, roughness: 0.35 }), carN);
  cars.userData.dynamic = true;
  cars.castShadow = false;
  const carColors = ['#c0392b', '#ecf0f1', '#2c3e50', '#bdc3c7', '#1f3fa8', '#111111', '#7f8c8d', '#f1c40f'].map((x) => new THREE.Color(x));
  const carData = [];
  for (let i = 0; i < carN; i++) {
    cars.setColorAt(i, carColors[i % carColors.length]);
    const onRing = i < carN * 0.55;
    carData.push(
      onRing
        ? { type: 'ring', a: rand(0, TAU), lane: Math.random() < 0.5 ? -1.6 : 1.6, speed: 0 }
        : { type: 'blvd', x: rand(-120, 160), lane: Math.random() < 0.5 ? -1.6 : 1.6, speed: rand(7, 11) },
    );
    const d = carData[i];
    if (d.type === 'ring') d.speed = (d.lane > 0 ? 1 : -1) * rand(0.08, 0.12);
    else d.speed *= d.lane > 0 ? 1 : -1;
  }
  root.add(cars);

  // shuttle buses (Jeeter-wrapped) on the boulevard
  const bus = new THREE.Group();
  bus.add(box(2.6, 2.8, 9, std({ color: '#f2f2f2' }), 0, 0.3, 0));
  bus.add(box(2.65, 1, 8.6, std({ color: '#2a1a74' }), 0, 1.6, 0, { cast: false }));
  bus.userData.dynamic = true;
  root.add(bus);

  // --- Boats -------------------------------------------------------------------
  const boats = [];
  const hullMat = std({ color: '#f4f4f2', roughness: 0.4 });
  const sailMat = std({ color: '#fffdf6', side: THREE.DoubleSide });
  const makeSailboat = () => {
    const g = new THREE.Group();
    const hull = mesh(new THREE.SphereGeometry(1, 12, 6, 0, TAU, Math.PI / 2, Math.PI / 2), hullMat);
    hull.scale.set(1.1, 0.8, 3.4);
    g.add(hull);
    g.add(cyl(0.06, 0.08, 9, std({ color: '#bbb' }), 0, 0, 0.4, 6));
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(0, 8.2);
    s.lineTo(3.4, 0.4);
    const sail = new THREE.Mesh(new THREE.ShapeGeometry(s), sailMat);
    sail.rotation.y = -Math.PI / 2;
    sail.position.set(0, 0.8, 0.5);
    g.add(sail);
    return g;
  };
  const makeSpeedboat = () => {
    const g = new THREE.Group();
    const hull = mesh(new THREE.SphereGeometry(1, 12, 6, 0, TAU, Math.PI / 2, Math.PI / 2), std({ color: '#ffffff' }));
    hull.scale.set(1.3, 0.9, 4);
    g.add(hull);
    g.add(box(2, 0.6, 2.4, std({ color: '#1b2a4a' }), 0, 0.1, -0.6));
    const wake = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false }),
    );
    wake.rotation.x = -Math.PI / 2;
    wake.position.set(0, -0.3, -10);
    g.add(wake);
    return g;
  };
  const boatPaths = [
    { cx: -120, cz: 150, r: 34, speed: 0.05, make: makeSailboat },
    { cx: 60, cz: 170, r: 50, speed: -0.04, make: makeSailboat },
    { cx: 260, cz: -260, r: 60, speed: 0.03, make: makeSailboat },
    { cx: 320, cz: -180, r: 40, speed: -0.05, make: makeSailboat },
    { cx: -10, cz: 140, r: 28, speed: 0.16, make: makeSpeedboat },
    { cx: 220, cz: -90, r: 45, speed: -0.12, make: makeSpeedboat },
  ];
  for (const p of boatPaths) {
    const b = p.make();
    b.userData.dynamic = true;
    b.userData.path = { ...p, a: rand(0, TAU) };
    boats.push(b);
    root.add(b);
  }

  scene.add(root);

  // --- Per-frame update -----------------------------------------------------
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const pos = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  function update(t, dt) {
    waterMat.uniforms.uTime.value = t;
    jets.forEach((j, i) => {
      j.scale.y = 0.8 + Math.sin(t * 3 + i) * 0.2;
    });
    for (let i = 0; i < walkerN; i++) {
      const w = walkerData[i];
      w.a += w.speed * dt;
      pos.set(Math.cos(w.a) * 36 * w.k, Math.abs(Math.sin(t * 6 + i)) * 0.08, Math.sin(w.a) * 28 * w.k);
      q.setFromAxisAngle(up, -w.a + (w.speed > 0 ? 0 : Math.PI));
      m4.compose(pos, q, one);
      walkers.setMatrixAt(i, m4);
    }
    walkers.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < carN; i++) {
      const d = carData[i];
      if (d.type === 'ring') {
        d.a += d.speed * dt;
        pos.set(Math.cos(d.a) * (RING.rx + d.lane), 0, Math.sin(d.a) * (RING.rz + d.lane));
        const tx = -Math.sin(d.a) * RING.rx;
        const tz = Math.cos(d.a) * RING.rz;
        q.setFromAxisAngle(up, Math.atan2(tx, tz) + (d.speed < 0 ? Math.PI : 0));
      } else {
        d.x += d.speed * dt;
        if (d.x > 162) d.x = -118;
        if (d.x < -118) d.x = 162;
        pos.set(d.x, 0, BOULEVARD_Z + d.lane);
        q.setFromAxisAngle(up, d.speed > 0 ? Math.PI / 2 : -Math.PI / 2);
      }
      m4.compose(pos, q, one);
      cars.setMatrixAt(i, m4);
    }
    cars.instanceMatrix.needsUpdate = true;
    const bx = ((t * 6) % 280) - 120;
    bus.position.set(bx, 0, BOULEVARD_Z + 1.6);
    bus.rotation.y = Math.PI / 2;
    for (const b of boats) {
      const p = b.userData.path;
      p.a += p.speed * dt;
      b.position.set(p.cx + Math.cos(p.a) * p.r, -0.4 + Math.sin(t * 1.4 + p.r) * 0.12, p.cz + Math.sin(p.a) * p.r);
      b.rotation.y = -p.a + (p.speed > 0 ? Math.PI : 0);
      b.rotation.z = Math.sin(t * 1.1 + p.r) * 0.04;
    }
  }

  return { root, update, waterMat, sky };
}

// Windows sized in world units, so instanced boxes of any scale get evenly
// sized windows instead of stretched texture tiles.
function worldSpaceWindows(mat, sizeU, sizeV) {
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vWinUv;')
      .replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
        {
          mat4 im = modelMatrix;
          #ifdef USE_INSTANCING
            im = modelMatrix * instanceMatrix;
          #endif
          vec4 wp = im * vec4(position, 1.0);
          vec3 wn = normalize(mat3(im) * normal);
          vWinUv = (abs(wn.x) > 0.5 ? vec2(wp.z, wp.y) : vec2(wp.x, wp.y)) / vec2(${sizeU.toFixed(1)}, ${sizeV.toFixed(1)});
        }`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vWinUv;')
      .replace('#include <map_fragment>', 'diffuseColor *= texture2D( map, vWinUv );')
      .replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance *= texture2D( emissiveMap, vWinUv ).rgb;');
  };
}

function buildBridge(a, b) {
  const g = new THREE.Group();
  const red = std({ color: '#c0442b', roughness: 0.6, metalness: 0.2 });
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  g.position.copy(a);
  g.rotation.y = Math.atan2(dir.x, dir.z);
  const deckY = 14;
  // deck (local +z is along the span)
  g.add(box(9, 1.6, len, red, 0, deckY, len / 2, { cast: false }));
  g.add(box(7, 0.3, len, std({ color: '#55565c' }), 0, deckY + 1.6, len / 2, { cast: false }));
  const towers = [len * 0.22, len * 0.72];
  const towerH = 78;
  for (const tz of towers) {
    for (const sx of [-4.2, 4.2]) g.add(box(2.6, towerH, 3.2, red, sx, -1, tz, { cast: false }));
    for (const y of [deckY + 8, 40, 58, towerH - 4]) g.add(box(10, 2.4, 2.4, red, 0, y, tz, { cast: false }));
    g.add(box(12, 6, 10, std({ color: '#b3aca0' }), 0, -2, tz, { cast: false }));
  }
  // main cables: catenary approximations
  const cableMat = std({ color: '#b6402a', roughness: 0.5 });
  const hangerPts = [];
  for (const sx of [-4.2, 4.2]) {
    const pts = [];
    const spans = [
      [0, towers[0], deckY + 3, towerH - 2, 'up'],
      [towers[0], towers[1], towerH - 2, towerH - 2, 'sag'],
      [towers[1], len, towerH - 2, deckY + 3, 'down'],
    ];
    for (const [z0, z1, y0, y1, kind] of spans) {
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        const z = z0 + (z1 - z0) * t;
        let y = y0 + (y1 - y0) * t;
        if (kind === 'sag') y -= Math.sin(Math.PI * t) * (towerH - deckY - 8);
        else y -= Math.sin(Math.PI * t) * 6;
        pts.push(new THREE.Vector3(sx, y, z));
        if (i % 2 === 0 && y > deckY + 2.5) hangerPts.push(sx, deckY + 1.6, z, sx, y, z);
      }
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.45, 6), cableMat));
  }
  const hg = new THREE.BufferGeometry();
  hg.setAttribute('position', new THREE.Float32BufferAttribute(hangerPts, 3));
  g.add(new THREE.LineSegments(hg, new THREE.LineBasicMaterial({ color: 0xb6402a })));
  return g;
}
