import * as THREE from 'three';
import gsap from 'gsap';
import { brickTexture, muralTexture, neonSignTexture, textPanel, woodTexture, FONT_BLOCK, FONT_SCRIPT } from './textures.js';
import { std, mesh, box, cyl, panel, instanced, hoverRing, invisibleTrigger, rand, TAU } from './helpers.js';

export function buildDodi({ logo, mobile }) {
  const group = new THREE.Group();
  group.name = 'district_dodi';
  const FACE = -0.49; // yaw toward the district camera

  const brick = std({ map: brickTexture({ base: '#7f3423' }), roughness: 0.9 });
  brick.map.repeat.set(3, 1);
  const brickWing = std({ map: brickTexture({ base: '#86402a' }), roughness: 0.9 });
  brickWing.map.repeat.set(2, 1);
  const iron = std({ color: '#1b1c20', metalness: 0.6, roughness: 0.45 });

  // --- Clubhouse ----------------------------------------------------------------
  const club = new THREE.Group();
  club.position.set(42, 0, 62);
  club.rotation.y = FACE;
  group.add(club);
  club.add(cyl(7, 7, 13, brick, 0, 0, 0, 40));
  club.add(box(18, 11, 12, brickWing, 8, 0, -7));
  // iron crown drum with sign
  club.add(cyl(7.5, 7.5, 3.6, iron, 0, 13, 0, 40));
  club.add(mesh(new THREE.ConeGeometry(7.8, 2.4, 40).translate(0, 17.8, 0), std({ color: '#2a2c33', metalness: 0.5, roughness: 0.5 })));
  // balcony band + glowing ground floor
  club.add(cyl(7.6, 7.6, 0.5, iron, 0, 6.3, 0, 40));
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(7.05, 7.05, 4.6, 40, 1, true, -1.2, 2.4).translate(0, 3.2, 0),
    std({ color: '#ffd59a', emissive: 0xffb050, emissiveIntensity: 0.8 }),
  );
  club.add(glass);
  const signTex = logo
    ? null
    : textPanel([{ text: 'Dodi', size: 0.62, font: FONT_SCRIPT }, { text: 'BEAST MODE', size: 0.22 }], { w: 512, h: 256, bg: '#14151a', font: FONT_BLOCK });
  const signBoard = box(8.4, 4.4, 0.4, iron, 0, 12.6, 7.4);
  club.add(signBoard);
  if (logo) {
    const lp = panel(7.4, 2.8, logo, { emissive: 0.9, transparent: true });
    lp.position.set(0, 15.4, 7.62);
    club.add(lp);
    const bm = panel(7, 1.1, textPanel([{ text: 'BEAST MODE', size: 0.8 }], { w: 512, h: 80, bg: '#14151a', font: FONT_BLOCK }), { emissive: 0.6 });
    bm.position.set(0, 13.4, 7.62);
    club.add(bm);
  } else {
    const sp = panel(8, 4, signTex, { emissive: 0.8 });
    sp.position.set(0, 14.8, 7.62);
    club.add(sp);
  }
  const lowerSign = panel(5, 1.6, logo || textPanel([{ text: 'Dodi', size: 0.8, font: FONT_SCRIPT }], { w: 320, h: 100, bg: '#14151a' }), { emissive: 0.8, transparent: !!logo });
  lowerSign.position.set(0, 6.9, 7.65);
  club.add(lowerSign);
  // Oakland banners
  const oak = textPanel([{ text: 'O' }, { text: 'A' }, { text: 'K' }, { text: 'L' }, { text: 'A' }, { text: 'N' }, { text: 'D' }].map((l) => ({ ...l, size: 0.13 })), { w: 128, h: 768, bg: '#111', font: FONT_BLOCK });
  for (const x of [-1, 1]) {
    const b = panel(1.6, 9, oak, { emissive: 0.4 });
    b.position.set(x * 9.2, 5.2, 0.5);
    b.rotation.y = 0;
    club.add(b);
  }
  const clubLight = new THREE.PointLight(0xffb060, 22, 20, 2);
  clubLight.position.set(0, 4, 11);
  club.add(clubLight);

  // --- Mural wall ---------------------------------------------------------------
  const wall = new THREE.Group();
  wall.position.set(60, 0, 60);
  wall.rotation.y = -0.25;
  wall.add(box(16, 9, 1.2, brickWing, 0, 0, 0));
  const mural = panel(15.4, 8.4, muralTexture(), { emissive: 0.2 });
  mural.position.set(0, 4.6, 0.62);
  wall.add(mural);
  group.add(wall);

  // --- Practice field -------------------------------------------------------------
  const field = mesh(new THREE.PlaneGeometry(28, 14), std({ map: practiceFieldTexture(), emissive: 0xffffff, emissiveMap: practiceFieldGlow(), emissiveIntensity: 0.9 }), { cast: false });
  field.rotation.x = -Math.PI / 2;
  field.rotation.z = -0.1;
  field.position.set(84, 0.12, 64);
  group.add(field);
  const fence = [];
  for (let i = 0; i <= 14; i++) fence.push({ x: 70 + i * 2, y: 0, z: 56.4, sx: 0.1, sy: 2, sz: 0.1 });
  group.add(instanced(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), std({ color: '#333' }), fence));
  // players on the field
  const players = [];
  for (let i = 0; i < 14; i++) players.push({ x: rand(74, 94), y: 0, z: rand(59, 69), ry: rand(0, TAU) });
  group.add(instanced(new THREE.CapsuleGeometry(0.3, 1, 2, 6).translate(0, 0.8, 0), std({ color: '#ffffff' }), players, { colors: ['#111', '#f2f2f2', '#7dff4f'] }));

  // --- Cafés, umbrellas, string lights -----------------------------------------
  const umb = [];
  for (let i = 0; i < 16; i++) umb.push({ x: rand(26, 68), y: 0, z: rand(70, 77), s: rand(0.9, 1.1) });
  group.add(instanced(new THREE.ConeGeometry(1.8, 0.8, 10).translate(0, 2.8, 0), std({ color: '#ffffff' }), umb, { colors: ['#f2ede0', '#1b1c20', '#e8e1cf'] }));
  group.add(instanced(new THREE.CylinderGeometry(0.05, 0.05, 2.8, 5).translate(0, 1.4, 0), std({ color: '#ccc' }), umb));
  group.add(instanced(new THREE.CylinderGeometry(0.7, 0.7, 0.1, 10).translate(0, 1, 0), std({ color: '#5a4636' }), umb));
  const bulbs = [];
  const strand = (a, b, n = 18) => {
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      bulbs.push({ x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t - Math.sin(Math.PI * t) * 1.2, z: a[2] + (b[2] - a[2]) * t, s: 1 });
    }
  };
  strand([26, 5, 69], [46, 5, 72]);
  strand([46, 5, 72], [68, 5, 69]);
  strand([26, 5, 77], [68, 5, 77]);
  strand([48, 12, 70], [62, 5, 77]);
  group.add(instanced(new THREE.SphereGeometry(0.16, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffe0a0, toneMapped: false }), bulbs));

  // --- Container pier & cranes --------------------------------------------------
  const pier = box(40, 1.2, 16, std({ color: '#8d8a85', roughness: 1 }), 120, -1, 88);
  group.add(pier);
  const containers = [];
  for (let i = 0; i < 26; i++) {
    containers.push({ x: rand(104, 136), y: 0.2 + ((i / 9) | 0) * 2.6, z: rand(82, 94), sx: 6, sy: 2.6, sz: 2.4, ry: Math.random() < 0.8 ? 0 : Math.PI / 2 });
  }
  group.add(instanced(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), std({ color: '#ffffff', roughness: 0.7 }), containers, { cast: !mobile, colors: ['#c0392b', '#2c6fa8', '#e2a43a', '#3a8a5a', '#7f8c8d', '#d35400'] }));
  for (const [x, z, r] of [[112, 92, 0.2], [130, 90, -0.15]]) group.add(crane(x, z, r));

  // --- Beast Quake neon pier venue ----------------------------------------------
  const deck = new THREE.Group();
  deck.position.set(66, 0, 91);
  group.add(deck);
  deck.add(box(18, 0.6, 24, std({ map: woodTexture('#8a6a4a') }), 0, -0.2, 0));
  const piles = [];
  for (let x = -8; x <= 8; x += 4) for (let z = -11; z <= 11; z += 4) piles.push({ x, y: -3, z });
  deck.add(instanced(new THREE.CylinderGeometry(0.3, 0.3, 3, 6).translate(0, 1.5, 0), std({ color: '#3d342c' }), piles));
  const venue = new THREE.Group();
  venue.position.set(0, 0.4, 3);
  venue.rotation.y = -0.6;
  deck.add(venue);
  venue.add(box(13, 6, 9, std({ color: '#1b2236', roughness: 0.6 }), 0, 0, 0));
  venue.add(mesh(new THREE.ConeGeometry(9.6, 3.2, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.7).translate(0, 7.6, 0), std({ color: '#222a3e', roughness: 0.5 })));
  const venueGlass = panel(11, 4, null);
  venueGlass.material.color.set('#ffe0a8');
  venueGlass.material.emissive.set('#ffb860');
  venueGlass.material.emissiveIntensity = 0.9;
  venueGlass.position.set(0, 2.4, 4.56);
  venue.add(venueGlass);
  const neonTex = neonSignTexture('BEAST QUAKE', '#7dff4f');
  const neonMat = new THREE.MeshBasicMaterial({ map: neonTex, toneMapped: false, color: 0xffffff });
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(11, 2.75), neonMat);
  neon.position.set(0, 7.3, 4.7);
  neon.userData.noHighlight = true;
  venue.add(neon);
  venue.add(box(11.6, 3.2, 0.3, iron, 0, 5.7, 4.45));
  const neonLight = new THREE.PointLight(0x7dff4f, 30, 20, 2);
  neonLight.position.set(0, 7, 8);
  venue.add(neonLight);
  const quakeStripe = box(0.3, 0.08, 20, new THREE.MeshBasicMaterial({ color: 0x7dff4f, toneMapped: false }), -8.6, 0.12, 0, { cast: false });
  quakeStripe.userData.noHighlight = true;
  deck.add(quakeStripe);

  // "BEAST MODE LIVES HERE" seawall banner
  const lives = panel(16, 2.6, textPanel([{ text: 'BEAST MODE LIVES HERE', size: 0.62 }], { w: 1024, h: 160, bg: '#111', font: FONT_BLOCK }), { emissive: 0.5 });
  lives.position.set(44, 0.4, 81.2);
  group.add(lives);

  // --- Hover ring / trigger ------------------------------------------------------
  const ring = hoverRing(30, '#7dff4f');
  ring.position.set(55, 0.3, 66);
  group.add(ring);
  const trigger = invisibleTrigger('trigger_dodi', new THREE.BoxGeometry(62, 24, 46), 'dodi');
  trigger.position.set(60, 10, 74);
  group.add(trigger);

  const pulse = { amp: 0.15, speed: 2 };
  return {
    group,
    trigger,
    ring,
    onHover(on) {
      gsap.to(pulse, { amp: on ? 0.75 : 0.15, speed: on ? 9 : 2, duration: 0.5 });
    },
    update(t) {
      const k = 1 - pulse.amp * 0.5 + Math.sin(t * pulse.speed) * pulse.amp * 0.5 + (Math.random() < 0.01 ? -0.4 : 0);
      neonMat.color.setScalar(Math.max(0.35, k * 1.25));
      neonLight.intensity = 14 + k * 24;
      quakeStripe.material.color.setRGB(0.49 * k, 1 * k, 0.31 * k);
    },
  };
}

function crane(x, z, ry) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  const orange = std({ color: '#d9822b', roughness: 0.6, metalness: 0.3 });
  for (const [lx, lz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) g.add(box(0.6, 18, 0.6, orange, lx, 0, lz));
  g.add(box(7, 1, 7, orange, 0, 18, 0));
  g.add(box(4, 3, 4, orange, 0, 19, -1));
  g.add(box(1.2, 1, 34, orange, 0, 21, 8));
  for (let i = 0; i < 6; i++) {
    const d = box(0.2, 0.2, 6.6, orange, 0, 21 + 1.6, -6 + i * 5.5, { cast: false });
    d.rotation.x = i % 2 ? 0.25 : -0.25;
    g.add(d);
  }
  g.add(box(0.06, 12, 0.06, std({ color: '#333' }), 0, 9, 18, { cast: false }));
  return g;
}

function practiceFieldTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');
  for (let i = 0; i < 10; i++) {
    g.fillStyle = i % 2 ? '#2f6d2c' : '#377a33';
    g.fillRect((i * 1024) / 10, 0, 103, 512);
  }
  drawFieldLines(g, '#ffffff');
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function practiceFieldGlow() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, 1024, 512);
  drawFieldLines(g, '#7dff4f');
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function drawFieldLines(g, col) {
  g.strokeStyle = col;
  g.lineWidth = 6;
  g.strokeRect(20, 20, 984, 472);
  for (let i = 1; i < 10; i++) {
    g.beginPath();
    g.moveTo(20 + i * 98.4, 20);
    g.lineTo(20 + i * 98.4, 492);
    g.stroke();
  }
  g.fillStyle = col;
  g.font = `200px ${FONT_BLOCK}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('24', 512, 266);
}
