import * as THREE from 'three';
import gsap from 'gsap';
import { brickTexture, windowGridTexture, windowEmissiveTexture, textPanel, bannerTexture, stoneTexture, FONT_BLOCK, FONT_SCRIPT } from './textures.js';
import { std, mesh, box, cyl, panel, instanced, makeShrubs, hoverRing, invisibleTrigger, rand, TAU } from './helpers.js';

export function buildPrimitiv({ logo, mobile }) {
  const group = new THREE.Group();
  group.name = 'district_primitiv';
  const site = new THREE.Group();
  site.position.set(75, 0, -20);
  site.rotation.y = -0.5; // local +z faces the district camera
  group.add(site);

  const brickMat = std({ map: brickTexture({ base: '#8e3a24' }), roughness: 0.9, emissive: 0xffffff, emissiveMap: null });
  brickMat.map.repeat.set(2.5, 1);
  brickMat.emissive.set(0x000000);
  const brickPlain = std({ map: brickTexture({ base: '#8a3a26', windows: false }), roughness: 0.95 });
  brickPlain.map.repeat.set(2, 6);
  const cobalt = '#1f4fd1';
  const steel = std({ color: '#c9ced6', metalness: 0.9, roughness: 0.22 });
  const glassBlue = std({ color: '#9fc0e8', metalness: 0.6, roughness: 0.1, emissive: 0x0a1d3a, emissiveIntensity: 0.6 });

  // --- Factory -------------------------------------------------------------------
  const fac = new THREE.Group();
  fac.position.set(-12, 0, -12);
  site.add(fac);
  fac.add(box(32, 13, 13, brickMat, 0, 0, 0));
  fac.add(box(33, 0.8, 14, std({ color: '#5a2a1c' }), 0, 13, 0, { cast: false }));
  // sawtooth glass roof
  const saw = new THREE.Shape();
  saw.moveTo(0, 0);
  saw.lineTo(5, 0);
  saw.lineTo(0, 3.4);
  saw.lineTo(0, 0);
  const sawGeo = new THREE.ExtrudeGeometry(saw, { depth: 12, bevelEnabled: false }).translate(0, 0, -6);
  for (let i = 0; i < 6; i++) {
    const tooth = mesh(sawGeo, [glassBlue, std({ color: '#3a3f4a' })]);
    tooth.position.set(-15 + i * 5.2, 13.8, 0);
    fac.add(tooth);
  }
  // facade sign
  const sign = panel(16, 3.6, textPanel([
    { text: 'PRIMITIV', size: 0.62 },
    { text: 'MOTOR CITY WORKS', size: 0.26 },
  ], { w: 1024, h: 256, bg: '#111317', font: FONT_BLOCK }), { emissive: 0.7 });
  sign.position.set(2, 10.3, 6.6);
  fac.add(sign);
  // #81 cobalt banners
  const b81 = bannerTexture({ top: 'PRIMITIV', number: '81', lines: ['HALL', 'OF FAME'], bg: [cobalt, '#0e2a8a'] });
  for (const x of [-12, -4.5]) {
    const b = panel(3.4, 8.6, b81, { emissive: 0.45 });
    b.position.set(x, 5.2, 6.62);
    fac.add(b);
  }
  // garage bay
  fac.add(box(6, 5, 0.3, std({ color: '#1a1a1d', emissive: 0x3a2a12, emissiveIntensity: 0.5 }), 11, 0, 6.5));
  // painted wall text
  const paint = panel(10, 6, textPanel([
    { text: 'PLANTS', size: 0.18 },
    { text: 'PEOPLE', size: 0.18 },
    { text: 'PERFORMANCE', size: 0.18 },
    { text: 'A HIGHER', size: 0.18 },
    { text: 'TOMORROW', size: 0.18 },
  ], { w: 512, h: 320, bg: 'rgba(0,0,0,0)', color: '#f3eee6', font: FONT_BLOCK }), { emissive: 0.15, transparent: true });
  paint.position.set(-16.05, 7, 0);
  paint.rotation.y = -Math.PI / 2;
  fac.add(paint);
  const detroit = panel(6, 3, textPanel([{ text: 'DETROIT', size: 0.3 }, { text: 'BUILT', size: 0.3 }, { text: 'HIGHER', size: 0.3 }], { w: 256, h: 128, bg: 'rgba(0,0,0,0)', color: '#f3eee6', font: FONT_BLOCK }), { emissive: 0.15, transparent: true });
  detroit.position.set(-16.05, 2.6, 2);
  detroit.rotation.y = -Math.PI / 2;
  fac.add(detroit);

  // water tower on the roof
  const wt = new THREE.Group();
  wt.position.set(-11, 14, -2);
  fac.add(wt);
  for (const [x, z] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) wt.add(cyl(0.12, 0.12, 5, std({ color: '#2a2a2a' }), x, 0, z, 5));
  wt.add(cyl(2.6, 2.6, 4.2, std({ color: '#2b2b30', roughness: 0.6 }), 0, 5, 0, 20));
  wt.add(mesh(new THREE.ConeGeometry(2.9, 1.8, 20).translate(0, 10.1, 0), std({ color: '#222' })));
  const wtl = panel(4.6, 1.2, textPanel([{ text: 'PRIMITIV', size: 0.7 }], { w: 512, h: 128, bg: '#2b2b30', font: FONT_BLOCK }), { emissive: 0.4 });
  wtl.position.set(0, 7.1, 2.62);
  wt.add(wtl);

  // smokestacks + silos
  const stack = cyl(1.6, 2.2, 34, brickPlain, -28, 0, -16, 16);
  site.add(stack);
  site.add(cyl(1.75, 1.75, 1, std({ color: '#3a2a22' }), -28, 33.5, -16, 16));
  const stackText = panel(1.6, 16, verticalText('PRIMITIV'), { emissive: 0.4, transparent: true });
  stackText.position.set(-28, 20, -13.85);
  stackText.rotation.x = 0.016;
  site.add(stackText);
  site.add(cyl(1.1, 1.5, 24, brickPlain, -33, 0, -9, 14));
  for (const [x, z] of [[-34, 2], [-29, 3.5]]) {
    site.add(cyl(2.2, 2.2, 13, std({ color: '#c3c7cc', metalness: 0.7, roughness: 0.35 }), x, 0, z, 18));
    site.add(mesh(new THREE.ConeGeometry(2.3, 1.6, 18).translate(x, 13.8, z), steel));
  }
  // smoke puffs
  const smoke = [];
  const smokeMat = new THREE.MeshStandardMaterial({ color: '#e8e4df', transparent: true, opacity: 0.45, depthWrite: false, roughness: 1 });
  for (let i = 0; i < (mobile ? 6 : 12); i++) {
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 1), smokeMat);
    s.userData.dynamic = true;
    s.userData.noHighlight = true;
    s.userData.phase = i / (mobile ? 6 : 12);
    smoke.push(s);
    site.add(s);
  }

  // --- Botanical lab (multi-tier glass) -----------------------------------------
  const lab = new THREE.Group();
  lab.position.set(16, 0, -4);
  site.add(lab);
  const labMap = windowGridTexture({ w: 256, h: 256, cols: 6, rows: 4, frame: '#e9eef2', glass: '#5f8a77', lit: '#cdeec0', litChance: 0.6 });
  const labEm = windowEmissiveTexture({ w: 256, h: 256, cols: 6, rows: 4, litChance: 0.6, lit: '#a8ff9a' });
  labMap.repeat.set(3, 1);
  labEm.repeat.set(3, 1);
  const labMat = std({ map: labMap, emissive: 0xffffff, emissiveMap: labEm, emissiveIntensity: 0.4, metalness: 0.4, roughness: 0.15 });
  const tiers = [[20, 6, 15, 0], [17, 6, 12.5, 6], [13, 5, 10, 12]];
  tiers.forEach(([w, h, d, y], i) => {
    lab.add(box(w, h, d, labMat, 0, y, -i * 1.2));
    // green terrace planters
    lab.add(makeShrubs(Array.from({ length: 16 }, () => ({ x: rand(-w / 2 + 1, w / 2 - 1), y: y + h, z: -i * 1.2 + d / 2 - rand(0.5, 2.2), s: rand(0.5, 0.9) })), ['#4f8a3a', '#6aa648', '#8a6fc4', '#3f7a35']));
  });
  for (let i = -4; i <= 4; i++) lab.add(box(0.3, 17, 0.5, steel, i * 2.2, 0, 7.8, { cast: false }));
  const labSign = logo
    ? panel(10, 3.4, logo, { emissive: 0.6, transparent: true })
    : panel(10, 3.4, textPanel([{ text: 'PRIMITIV', size: 0.6 }, { text: 'MOTOR CITY WORKS', size: 0.25 }], { w: 1024, h: 340, bg: 'rgba(0,0,0,0)', font: FONT_BLOCK }), { emissive: 0.6, transparent: true });
  labSign.position.set(0, 9, 6.55);
  lab.add(labSign);
  const cult = panel(3.4, 9, bannerTexture({ top: '', lines: ['CULTI-', 'VATING', 'A HIGHER', 'TOMORROW'], bg: [cobalt, '#0e2a8a'] }), { emissive: 0.45 });
  cult.position.set(10.05, 8, 2);
  cult.rotation.y = Math.PI / 2;
  lab.add(cult);

  // skybridge with blue light line
  site.add(box(8, 3, 3.4, glassBlue, 8, 8, -8));
  const neon = box(8, 0.2, 0.2, new THREE.MeshBasicMaterial({ color: 0x3f7bff, toneMapped: false }), 8, 9.4, -6.3, { cast: false });
  neon.userData.noHighlight = true;
  site.add(neon);

  // --- Courtyard: paving, rails, planters ---------------------------------------
  const pave = mesh(new THREE.PlaneGeometry(40, 24), std({ map: stoneTexture('#b9a58e'), roughness: 1 }), { cast: false });
  pave.material.map.repeat.set(8, 5);
  pave.rotation.x = -Math.PI / 2;
  pave.position.set(-2, 0.08, 6);
  site.add(pave);
  const sleepers = [];
  for (let i = -18; i <= 18; i += 1.2) sleepers.push({ x: i, y: 0.1, z: 9 + i * 0.12, ry: -0.12, sx: 0.4, sy: 0.12, sz: 2.4 });
  site.add(instanced(new THREE.BoxGeometry(1, 1, 1), std({ color: '#5b4636' }), sleepers));
  for (const off of [-0.7, 0.7]) {
    const rail = box(37, 0.15, 0.15, steel, 0, 0.18, 9 + off, { cast: false });
    rail.rotation.y = -0.12;
    site.add(rail);
  }
  site.add(makeShrubs(Array.from({ length: 26 }, () => ({ x: rand(-20, 18), z: rand(13, 17), s: rand(0.6, 1.2) })), ['#4f8a3a', '#6aa648', '#9a7ad6', '#3f7a35']));

  // delivery truck
  const truck = new THREE.Group();
  truck.position.set(-15, 0, 13);
  truck.rotation.y = 0.3;
  truck.add(box(2.6, 3.4, 8, std({ color: '#111' }), 0, 0.6, 0));
  truck.add(box(2.4, 2.4, 2.4, std({ color: '#222' }), 0, 0.4, 5.3));
  const tl = panel(6.6, 1.4, textPanel([{ text: 'PRIMITIV', size: 0.7 }], { w: 512, h: 110, bg: '#111', font: FONT_BLOCK }), { emissive: 0.4 });
  tl.position.set(1.32, 2.6, 0);
  tl.rotation.y = Math.PI / 2;
  truck.add(tl);
  site.add(truck);

  // Motor City Works mural block
  const mural = new THREE.Group();
  mural.position.set(26, 0, 17);
  mural.rotation.y = -0.2;
  mural.add(box(14, 8, 9, brickPlain, 0, 0, 0));
  const mp = panel(13, 6.5, textPanel([{ text: 'Motor City', size: 0.36, font: FONT_SCRIPT }, { text: 'Works', size: 0.3, font: FONT_SCRIPT }, { text: 'PRIMITIV', size: 0.2 }], { w: 640, h: 320, bg: '#2a54c8', font: FONT_BLOCK }), { emissive: 0.35 });
  mp.position.set(0, 4.2, 4.56);
  mural.add(mp);
  site.add(mural);

  // --- Orbital football sculpture ("81 Hall of Fame") -----------------------------
  const sculpt = new THREE.Group();
  sculpt.position.set(0, 0, 6);
  site.add(sculpt);
  sculpt.add(box(5.6, 3, 5.6, std({ map: stoneTexture('#c9c3ba') }), 0, 0, 0));
  const plaque = panel(5, 2.6, textPanel([{ text: '81', size: 0.55 }, { text: 'HALL OF FAME', size: 0.25 }], { w: 512, h: 256, bg: '#d5d0c8', color: '#2a2a2a', font: FONT_BLOCK }), { emissive: 0.1 });
  plaque.position.set(0, 1.5, 2.82);
  sculpt.add(plaque);
  const ball = mesh(new THREE.SphereGeometry(1, 32, 16), std({ color: '#7a4a2a', metalness: 0.55, roughness: 0.35 }));
  ball.scale.set(2.6, 1.6, 1.6);
  ball.position.y = 10;
  ball.rotation.z = 0.4;
  sculpt.add(ball);
  const laces = box(2.2, 0.15, 0.35, std({ color: '#f2f2f2' }), 0, 1.55, 0, { cast: false });
  laces.position.y = 0.95;
  laces.scale.set(1 / 2.6, 1 / 1.6, 1 / 1.6);
  ball.add(laces);
  sculpt.add(cyl(0.35, 0.5, 7, steel, 0, 3, 0, 10));
  const rings = [];
  const ringBlue = new THREE.MeshBasicMaterial({ color: 0x3f7bff, toneMapped: false });
  const tilts = [[0.5, 0, 0.3], [-0.6, 0.8, 0], [1.3, -0.4, 0.6]];
  tilts.forEach(([x, y, z], i) => {
    const pivot = new THREE.Group();
    pivot.position.y = 10;
    pivot.rotation.set(x, y, z);
    pivot.userData.dynamic = true;
    const r = 5.4 + i * 0.9;
    const steelRing = mesh(new THREE.TorusGeometry(r, 0.3, 10, 96), steel);
    const glow = new THREE.Mesh(new THREE.TorusGeometry(r, 0.1, 6, 96), ringBlue);
    glow.position.z = 0.32;
    glow.userData.noHighlight = true;
    steelRing.add(glow);
    steelRing.userData.dynamic = true;
    pivot.add(steelRing);
    sculpt.add(pivot);
    rings.push({ mesh: steelRing, speed: 0.25 + i * 0.12, axis: i % 2 ? 'y' : 'x' });
  });
  const sculptLight = new THREE.PointLight(0x4f7bff, 40, 24, 2);
  sculptLight.position.set(0, 10, 4);
  sculpt.add(sculptLight);

  // --- Hover ring / trigger ------------------------------------------------------
  const ring = hoverRing(34, '#3f7bff');
  ring.position.set(75, 0.3, -20);
  group.add(ring);
  const trigger = invisibleTrigger('trigger_primitiv', new THREE.BoxGeometry(64, 34, 48), 'primitiv');
  trigger.position.set(0, 17, -2);
  site.add(trigger);

  const spin = { mult: 1 };
  let smokeT = 0;

  return {
    group,
    trigger,
    ring,
    onHover(on) {
      gsap.to(spin, { mult: on ? 7 : 1, duration: on ? 0.8 : 1.6, ease: 'power2.out' });
    },
    update(t, dt) {
      for (const r of rings) r.mesh.rotation[r.axis] += r.speed * spin.mult * dt;
      ball.rotation.y += 0.15 * spin.mult * dt;
      sculptLight.intensity = 18 + (spin.mult - 1) * 8;
      smokeT += dt;
      for (const s of smoke) {
        const p = (s.userData.phase + smokeT * 0.08) % 1;
        s.position.set(-28 + p * 7 + Math.sin(p * 8) * 0.8, 34 + p * 16, -16 - p * 4);
        const sc = 1 + p * 3.2;
        s.scale.setScalar(sc);
      }
    },
  };
}

function verticalText(text) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 1280;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.font = `120px ${FONT_BLOCK}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  [...text].forEach((ch, i) => g.fillText(ch, 64, 90 + i * 152));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
