import * as THREE from 'three';
import gsap from 'gsap';
import { stoneTexture, jeeterWordmark, textPanel, holoCardTexture, woodTexture, FONT_SERIF } from './textures.js';
import { std, mesh, box, cyl, panel, instanced, makeShrubs, makePalms, hoverRing, invisibleTrigger, rand, TAU } from './helpers.js';

export function buildVault({ mobile }) {
  const group = new THREE.Group();
  group.name = 'district_vault';

  const bronze = std({ color: '#b07a3a', metalness: 1, roughness: 0.32 });
  const darkBronze = std({ color: '#6e4a24', metalness: 1, roughness: 0.4 });
  const stone = std({ map: stoneTexture('#e6dccb'), roughness: 0.75 });
  stone.map.repeat.set(6, 2);

  const R = 9.5;
  const rot = new THREE.Group();
  rot.position.set(-45, 0, 62);
  rot.rotation.y = 0.5; // local +z faces the vault camera
  group.add(rot);

  // stone drum with a glazed sector to the right of the door
  const G0 = -0.02 * Math.PI;
  const GL = 0.48 * Math.PI;
  rot.add(mesh(new THREE.CylinderGeometry(R, R, 9, 64, 1, true, G0 + GL, TAU - GL).translate(0, 4.5, 0), stone));
  const interior = mesh(new THREE.CylinderGeometry(R - 0.4, R - 0.4, 8.6, 48, 1, true, G0, GL).translate(0, 4.5, 0), std({ color: '#3a2a1a', emissive: 0x6a4420, emissiveIntensity: 0.6, side: THREE.BackSide }), { cast: false });
  rot.add(interior);
  const glass = mesh(
    new THREE.CylinderGeometry(R, R, 8.2, 48, 1, true, G0, GL).translate(0, 4.4, 0),
    std({ color: '#fff0d8', transparent: true, opacity: 0.22, metalness: 0.5, roughness: 0.05 }),
    { cast: false },
  );
  rot.add(glass);
  // bronze mullions + bands
  for (let i = 0; i <= 8; i++) {
    const a = G0 + (i / 8) * GL;
    rot.add(box(0.2, 8.4, 0.2, bronze, Math.sin(a) * (R + 0.05), 0.4, Math.cos(a) * (R + 0.05), { cast: false }));
  }
  for (const y of [0.2, 8.6]) {
    const band = mesh(new THREE.CylinderGeometry(R + 0.3, R + 0.3, 0.6, 64, 1, true), bronze, { cast: false });
    band.position.y = y + 0.3;
    rot.add(band);
  }
  // floor + steps
  rot.add(cyl(R + 1.5, R + 2, 0.5, stone, 0, 0, 0, 64));
  // roof canopy and rooftop garden
  rot.add(cyl(R + 2.6, R + 2.6, 1.4, darkBronze, 0, 9, 0, 64));
  rot.add(cyl(R + 1.8, R + 1.8, 0.8, std({ color: '#5a7a3a' }), 0, 10.4, 0, 48));
  rot.add(makeShrubs(Array.from({ length: mobile ? 26 : 50 }, () => {
    const a = rand(0, TAU);
    const r = rand(R - 3, R + 1.5);
    return { x: Math.cos(a) * r, y: 10.9, z: Math.sin(a) * r, s: rand(0.6, 1.3) };
  }), ['#4f8a3a', '#6aa648', '#8a6fc4', '#a07ad6', '#e7d27a']));
  rot.add(makePalms([[-4, 3], [3, -5], [5, 2]].map(([x, z]) => ({ x, y: 10.8, z, s: 0.8 })), { mobile }));

  // signage: Jeeter + THE VAULT
  const signBack = box(13, 4.6, 0.6, darkBronze, 0, 9.8, R + 2.95);
  const jl = panel(7, 2.6, jeeterWordmark({ color: '#ffffff' }), { emissive: 1, transparent: true });
  jl.position.set(0, 13.2, R + 3.36);
  const ellipse = mesh(new THREE.CircleGeometry(1, 48).scale(4, 1.55, 1), darkBronze, { cast: false });
  ellipse.position.set(0, 13.2, R + 3.28);
  const tv = panel(11.5, 1.6, textPanel([{ text: 'THE VAULT', size: 0.8, color: '#f4e1b8' }], { w: 1024, h: 140, bg: '#4a3018', font: FONT_SERIF }), { emissive: 0.7 });
  tv.position.set(0, 10.9, R + 3.28);
  const signGroup = new THREE.Group();
  signGroup.rotation.y = -0.2 * Math.PI;
  signGroup.add(signBack, jl, ellipse, tv);
  rot.add(signGroup);
  // pillar with stacked words (CULTURE / FLOWERS / PEOPLE / HIGHER / TOGETHER)
  rot.add(cyl(2.2, 2.2, 9, stone, Math.sin(0.55 * Math.PI) * (R + 1), 0, Math.cos(0.55 * Math.PI) * (R + 1), 24));
  const words = panel(2.6, 6, textPanel(['CULTURE', 'FLOWERS', 'PEOPLE', 'HIGHER', 'TOGETHER'].map((t) => ({ text: t, size: 0.16, color: '#8a6a3a' })), { w: 256, h: 512, bg: '#e6dccb', font: FONT_SERIF }), { emissive: 0.1 });
  words.position.set(Math.sin(0.55 * Math.PI) * (R + 3.25), 4.5, Math.cos(0.55 * Math.PI) * (R + 3.25));
  words.rotation.y = 0.55 * Math.PI;
  rot.add(words);

  // --- Vault door (hinged) -------------------------------------------------------
  const DOOR_A = -0.2 * Math.PI;
  const mount = new THREE.Group();
  mount.rotation.y = DOOR_A;
  rot.add(mount);
  const doorCenter = new THREE.Vector3(0, 4.3, R + 0.1);
  const frame = mesh(new THREE.TorusGeometry(3.7, 0.55, 16, 64), bronze);
  frame.position.copy(doorCenter);
  mount.add(frame);
  const recess = mesh(new THREE.CircleGeometry(3.6, 48), std({ color: '#2a1a0c', emissive: 0xffb050, emissiveIntensity: 0.0 }), { cast: false });
  recess.position.copy(doorCenter).add(new THREE.Vector3(0, 0, -0.3));
  mount.add(recess);
  const hinge = new THREE.Group();
  hinge.position.copy(doorCenter).add(new THREE.Vector3(-3.5, 0, 0.3));
  hinge.userData.dynamic = true;
  mount.add(hinge);
  const door = new THREE.Group();
  door.position.set(3.5, 0, 0);
  hinge.add(door);
  const disc = mesh(new THREE.CylinderGeometry(3.45, 3.45, 0.9, 64).rotateX(Math.PI / 2), bronze);
  door.add(disc);
  for (let i = 1; i <= 3; i++) {
    const r = mesh(new THREE.TorusGeometry(i * 0.95, 0.07, 6, 64), darkBronze, { cast: false });
    r.position.z = 0.48;
    door.add(r);
  }
  // locking bolts around the rim
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const b = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.5, 8).rotateX(Math.PI / 2), darkBronze, { cast: false });
    b.position.set(Math.cos(a) * 3.05, Math.sin(a) * 3.05, 0.5);
    door.add(b);
  }
  // gear wheel
  const wheel = new THREE.Group();
  wheel.position.z = 0.95;
  wheel.userData.dynamic = true;
  door.add(wheel);
  wheel.add(mesh(new THREE.TorusGeometry(1.9, 0.16, 10, 48), bronze));
  wheel.add(mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.5, 24).rotateX(Math.PI / 2), bronze));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const spoke = mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.4, 8), bronze, { cast: false });
    spoke.rotation.z = a;
    spoke.position.set(-Math.sin(a) * 1.2, Math.cos(a) * 1.2, 0);
    wheel.add(spoke);
    const knob = mesh(new THREE.SphereGeometry(0.22, 10, 8), bronze, { cast: false });
    knob.position.set(-Math.sin(a) * 2.35, Math.cos(a) * 2.35, 0);
    wheel.add(knob);
  }
  // stanchions with velvet rope
  for (const x of [-4, 4]) mount.add(cyl(0.12, 0.2, 1.4, bronze, x, 0.5, R + 2.6, 8));
  const rope = mesh(new THREE.TorusGeometry(3.9, 0.06, 6, 24, Math.PI), std({ color: '#5a1426' }), { cast: false });
  rope.rotation.z = Math.PI;
  rope.scale.y = 0.18;
  rope.position.set(0, 1.9, R + 2.6);
  mount.add(box(9, 0.3, 4, stone, 0, 0.5, R + 1.4));
  mount.add(rope);

  // glowing pedestal display cases with holographic cards
  const cards = [];
  const cardData = [['Ricky', '34', 140], ['Calvin', '81', 220], ['Marshawn', '24', 95], ['Jeeter', '00', 265], ['Game Day', '7', 300]];
  cardData.forEach(([n, num, hue], i) => {
    const a = 0.12 + i * 0.27;
    const r = R - 2.2;
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    rot.add(box(1.4, 1.6, 1.4, std({ color: '#1d1610', metalness: 0.5, roughness: 0.4 }), x, 0.5, z, { cast: false }));
    const caseGlass = mesh(new THREE.BoxGeometry(1.3, 2.2, 1.3).translate(0, 1.1, 0), std({ color: '#fff', transparent: true, opacity: 0.18, roughness: 0.05 }), { cast: false });
    caseGlass.position.set(x, 2.1, z);
    rot.add(caseGlass);
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.25), new THREE.MeshBasicMaterial({ map: holoCardTexture(n, num, hue), side: THREE.DoubleSide, toneMapped: false }));
    card.position.set(x, 3.2, z);
    card.userData.dynamic = true;
    card.userData.noHighlight = true;
    rot.add(card);
    cards.push(card);
  });
  const vaultLight = new THREE.PointLight(0xffc27a, 30, 20, 2);
  vaultLight.position.set(2, 5, R + 3);
  rot.add(vaultLight);
  const innerLight = new THREE.PointLight(0xffb050, 0, 14, 2);
  innerLight.position.copy(doorCenter).add(new THREE.Vector3(0, 0, -1.5));
  mount.add(innerLight);

  // --- Marina: promenade docks + yachts -----------------------------------------
  const dockMat = std({ map: woodTexture('#9a7a55'), roughness: 0.9 });
  dockMat.map.repeat.set(1, 8);
  const dockMain = box(70, 0.5, 3, dockMat, -62, -0.3, 86);
  group.add(dockMain);
  const fingers = [];
  for (let x = -94; x <= -30; x += 10) fingers.push({ x, y: -0.3, z: 95, sx: 2, sy: 0.5, sz: 16 });
  group.add(instanced(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), dockMat, fingers));
  const yachts = [];
  const slots = [-89, -79, -69, -59, -49, -39];
  slots.forEach((x, i) => {
    const y = yacht(i % 2 ? 1 : 1.25);
    y.position.set(x, -0.5, 97 + rand(-1, 1));
    y.rotation.y = Math.PI / 2 + (i % 2 ? Math.PI : 0);
    y.userData.dynamic = true;
    y.userData.phase = rand(0, TAU);
    group.add(y);
    yachts.push(y);
  });
  // bollard lamps along the promenade
  const lamps = [];
  for (let x = -98; x <= -40; x += 6) lamps.push({ x, y: 0, z: 79.3 });
  group.add(instanced(new THREE.CylinderGeometry(0.18, 0.22, 1.1, 8).translate(0, 0.55, 0), std({ color: '#3a2c1c', emissive: 0xffc070, emissiveIntensity: 0.3 }), lamps));
  // lounge seating near the rotunda
  const lounges = [];
  for (let i = 0; i < 8; i++) lounges.push({ x: rand(-62, -30), y: 0, z: rand(72, 77), ry: rand(-0.3, 0.3) });
  group.add(instanced(new THREE.BoxGeometry(2.4, 0.7, 1).translate(0, 0.35, 0), std({ color: '#efe6d6' }), lounges));
  // planters
  group.add(makeShrubs(Array.from({ length: mobile ? 30 : 60 }, () => {
    const a = rand(0, TAU);
    const r = rand(R + 3, R + 7);
    return { x: -45 + Math.cos(a) * r, z: 62 + Math.sin(a) * r, s: rand(0.6, 1.2) };
  }).filter((p) => p.z < 80), ['#4f8a3a', '#6aa648', '#8a6fc4', '#a07ad6', '#3f7a35']));

  // --- Hover ring / trigger ------------------------------------------------------
  const ring = hoverRing(R + 6, '#e0b46a');
  ring.position.set(-45, 0.3, 62);
  group.add(ring);
  const trigger = invisibleTrigger('trigger_vault', new THREE.CylinderGeometry(R + 4, R + 4, 16, 24).translate(0, 8, 0), 'vault');
  trigger.position.set(-45, 0, 62);
  group.add(trigger);

  let open = false;
  let tl = null;
  return {
    group,
    trigger,
    ring,
    // Wheel spins to unlock, door swings on its hinge, the vault glows.
    openDoor(onShadowUpdate) {
      if (open) return Promise.resolve();
      open = true;
      tl?.kill();
      return new Promise((resolve) => {
        tl = gsap.timeline({ onUpdate: onShadowUpdate, onComplete: resolve });
        tl.to(wheel.rotation, { z: -Math.PI * 3, duration: 1.3, ease: 'power2.inOut' })
          .to(hinge.rotation, { y: -1.95, duration: 1.4, ease: 'power3.inOut' }, '-=0.15')
          .to(recess.material, { emissiveIntensity: 1.4, duration: 1 }, '<0.2')
          .to(innerLight, { intensity: 90, duration: 1 }, '<');
      });
    },
    closeDoor(onShadowUpdate) {
      if (!open) return;
      open = false;
      tl?.kill();
      tl = gsap.timeline({ onUpdate: onShadowUpdate });
      tl.to(hinge.rotation, { y: 0, duration: 1.2, ease: 'power2.inOut' })
        .to(recess.material, { emissiveIntensity: 0, duration: 0.8 }, '<')
        .to(innerLight, { intensity: 0, duration: 0.8 }, '<')
        .to(wheel.rotation, { z: 0, duration: 1, ease: 'power2.inOut' });
    },
    update(t) {
      cards.forEach((c, i) => {
        c.rotation.y = t * 0.9 + i;
        c.position.y = 3.2 + Math.sin(t * 1.6 + i) * 0.12;
      });
      for (const y of yachts) {
        y.position.y = -0.5 + Math.sin(t * 1.2 + y.userData.phase) * 0.12;
        y.rotation.z = Math.sin(t * 0.9 + y.userData.phase) * 0.02;
      }
    },
  };
}

function yacht(scale = 1) {
  const g = new THREE.Group();
  const white = std({ color: '#f7f7f5', roughness: 0.35 });
  const dark = std({ color: '#1d2a3a', roughness: 0.2, metalness: 0.4 });
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-1.8, 0);
  hullShape.lineTo(1.8, 0);
  hullShape.lineTo(1.8, 6);
  hullShape.quadraticCurveTo(0, 10, -1.8, 6);
  hullShape.lineTo(-1.8, 0);
  const hullGeo = new THREE.ExtrudeGeometry(hullShape, { depth: 1.6, bevelEnabled: true, bevelSize: 0.3, bevelThickness: 0.3, bevelSegments: 2 });
  hullGeo.rotateX(-Math.PI / 2);
  hullGeo.translate(0, 0, 3);
  g.add(mesh(hullGeo, white));
  g.add(box(2.8, 1.2, 4.6, white, 0, 1.6, -0.6));
  g.add(box(2.85, 0.5, 4.2, dark, 0, 2.1, -0.4, { cast: false }));
  g.add(box(2.2, 1, 2.6, white, 0, 2.8, -1));
  g.add(box(2.25, 0.4, 2.2, dark, 0, 3.2, -0.8, { cast: false }));
  g.scale.setScalar(scale);
  return g;
}
