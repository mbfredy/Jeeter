import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import {
  glassRoofTexture,
  crowdTexture,
  fieldTexture,
  ledRibbonTexture,
  screenTexture,
  bannerTexture,
  windowGridTexture,
  windowEmissiveTexture,
  jeeterWordmark,
  stoneTexture,
} from './textures.js';
import { std, mesh, box, cyl, panel, hoverRing, invisibleTrigger, TAU } from './helpers.js';

const SX = 1.3; // oval stretch along x
const R = 28; // facade radius (unscaled)

// Point + outward yaw on the stadium ellipse.
function onEllipse(a, r = R) {
  const x = Math.cos(a) * r * SX;
  const z = Math.sin(a) * r;
  const nx = Math.cos(a) / SX;
  const nz = Math.sin(a);
  return { x, z, yaw: Math.atan2(nx, nz) };
}

export function buildStadium({ font, mobile }) {
  const group = new THREE.Group();
  group.name = 'district_stadium';
  const oval = new THREE.Group();
  oval.scale.set(SX, 1, 1);
  group.add(oval);

  // podium
  const podium = mesh(new THREE.CylinderGeometry(R + 2.2, R + 2.6, 1.2, 96), std({ map: stoneTexture('#d9d2c4'), color: '#e6dfd2' }));
  podium.position.y = 0.6;
  oval.add(podium);

  // glass facade with warm lit concourses
  const cols = 8;
  const rows = 7;
  const fMap = windowGridTexture({ w: 256, h: 256, cols, rows, frame: '#e3eaf5', glass: '#6d86b8', lit: '#ffd9a3', litChance: 0.55 });
  const fEm = windowEmissiveTexture({ w: 256, h: 256, cols, rows, litChance: 0.55, lit: '#ffc979' });
  fMap.repeat.set(22, 1);
  fEm.repeat.set(22, 1);
  const facadeMat = std({ map: fMap, emissive: 0xffffff, emissiveMap: fEm, emissiveIntensity: 0.55, roughness: 0.25, metalness: 0.35 });
  const facade = mesh(new THREE.CylinderGeometry(R, R, 17, 128, 1, true), facadeMat);
  facade.position.y = 1.2 + 8.5;
  oval.add(facade);
  // horizontal floor slabs
  for (const y of [6, 11.5]) {
    const slab = mesh(new THREE.CylinderGeometry(R + 0.35, R + 0.35, 0.5, 128, 1, true), std({ color: '#eef1f6', roughness: 0.4 }), { cast: false });
    slab.position.y = y;
    oval.add(slab);
  }

  // exterior LED ribbon under the roof lip
  const ledTex = ledRibbonTexture();
  ledTex.repeat.set(3, 1);
  const ledMat = new THREE.MeshBasicMaterial({ map: ledTex, toneMapped: false });
  const ledOut = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.45, R + 0.45, 1.3, 128, 1, true), ledMat);
  ledOut.position.y = 17.4;
  ledOut.userData.noHighlight = true;
  oval.add(ledOut);

  // curved glass roof ring (lathe profile = closed section)
  const prof = [
    [R + 1.8, 17.9],
    [R + 1.4, 19.2],
    [R - 2.0, 21.4],
    [R - 6.5, 22.0],
    [R - 10.2, 21.0],
    [R - 10.4, 20.3],
    [R - 6.5, 20.9],
    [R - 2.0, 20.2],
    [R + 1.2, 18.1],
    [R + 1.8, 17.9],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const roofTex = glassRoofTexture();
  roofTex.repeat.set(5, 1);
  const roofMat = std({ map: roofTex, color: '#dfe9ff', roughness: 0.18, metalness: 0.45, emissive: 0x1a2a55, emissiveIntensity: 0.25, side: THREE.DoubleSide });
  const roof = mesh(new THREE.LatheGeometry(prof, 128), roofMat);
  oval.add(roof);
  // seating bowl (stepped lathe) with crowd texture
  const seatProf = [];
  const tiers = 3;
  let r = 15.5;
  let y = 0.9;
  seatProf.push(new THREE.Vector2(r, y));
  for (let t = 0; t < tiers; t++) {
    r += 3.6;
    y += 5.2;
    seatProf.push(new THREE.Vector2(r, y));
    r += 0.6;
    seatProf.push(new THREE.Vector2(r, y));
    y += 0.6;
    seatProf.push(new THREE.Vector2(r, y));
  }
  seatProf.push(new THREE.Vector2(R - 0.2, y + 0.4));
  const crowd = crowdTexture();
  crowd.repeat.set(6, 2);
  const seats = mesh(new THREE.LatheGeometry(seatProf, 128), std({ map: crowd, roughness: 0.9, side: THREE.DoubleSide }), { cast: false });
  oval.add(seats);
  // inner LED ribbon between tiers
  const ledIn = new THREE.Mesh(new THREE.CylinderGeometry(19.15, 19.15, 0.8, 128, 1, true), new THREE.MeshBasicMaterial({ map: ledTex, toneMapped: false, side: THREE.BackSide }));
  ledIn.position.y = 6.5;
  ledIn.userData.noHighlight = true;
  oval.add(ledIn);

  // pitch
  const surround = mesh(new THREE.CircleGeometry(16, 64), std({ color: '#3d7a33' }), { cast: false });
  surround.rotation.x = -Math.PI / 2;
  surround.position.y = 0.95;
  oval.add(surround);
  const field = mesh(new THREE.PlaneGeometry(36, 18), std({ map: fieldTexture(), roughness: 0.9 }), { cast: false });
  field.rotation.x = -Math.PI / 2;
  field.position.y = 1.0;
  group.add(field);

  // jumbotrons on the inner north rim + roof-edge screens
  const scr = screenTexture();
  const addScreen = (a, rad, yy, w, h, faceIn) => {
    const p = onEllipse(a, rad);
    const s = panel(w, h, scr, { emissive: 1.1 });
    s.material.toneMapped = false;
    s.position.set(p.x, yy, p.z);
    s.rotation.y = p.yaw + (faceIn ? Math.PI : 0);
    const frame = box(w + 0.6, h + 0.6, 0.6, std({ color: '#1b1b22' }), 0, -(h + 0.6) / 2, -0.35);
    s.add(frame);
    group.add(s);
  };
  addScreen(-Math.PI / 2, 24.5, 24.4, 16, 6, true);
  addScreen(-Math.PI / 2 - 0.75, 24.5, 23.8, 10, 4.5, true);
  addScreen(-Math.PI / 2 + 0.75, 24.5, 23.8, 10, 4.5, true);
  addScreen(Math.PI / 2 - 0.42, R + 0.6, 9.5, 8, 5, false);
  addScreen(-0.2, R + 0.6, 9.5, 7, 4.5, false);

  // facade banners (Jeeter / GAME DAY KICK OFF)
  const bTex = bannerTexture({ top: 'Jeeter', lines: ['GAME', 'DAY', 'KICK OFF'] });
  const bTex2 = bannerTexture({ top: 'Jeeter', number: '7', lines: ['GAME DAY'] });
  const nBanners = mobile ? 10 : 16;
  for (let i = 0; i < nBanners; i++) {
    const a = (i / nBanners) * TAU + 0.1;
    const p = onEllipse(a, R + 0.7);
    const b = panel(3.2, 8, i % 2 ? bTex : bTex2, { emissive: 0.45 });
    b.position.set(p.x, 7.6, p.z);
    b.rotation.y = p.yaw;
    group.add(b);
  }

  // main south entrance with Jeeter marquee
  const ent = onEllipse(Math.PI / 2, R);
  const entrance = new THREE.Group();
  entrance.position.set(ent.x, 0, ent.z);
  entrance.add(box(16, 0.8, 5, std({ color: '#f3f3f5', metalness: 0.4, roughness: 0.3 }), 0, 6.2, 2.2));
  const marquee = panel(9, 2.6, jeeterWordmark({ bg: '#2a1a74', color: '#ffffff', size: 0.68 }), { emissive: 0.9 });
  marquee.position.set(0, 8.4, 2.6);
  entrance.add(marquee);
  entrance.add(box(9.4, 3, 0.4, std({ color: '#1a1240' }), 0, 6.9, 2.35));
  const doors = panel(12, 5.2, null, { emissive: 0 });
  doors.material.color.set('#ffdca6');
  doors.material.emissive.set('#ffbf6a');
  doors.material.emissiveIntensity = 0.7;
  doors.position.set(0, 3.8, 0.9);
  entrance.add(doors);
  group.add(entrance);

  // GAME / DAY 3D letters on the roof
  const letterMat = std({ color: '#f7f7f9', roughness: 0.35, metalness: 0.05 });
  const letterSide = std({ color: '#b9c0cc', roughness: 0.5 });
  const addWord = (text, a, size) => {
    const geo = new TextGeometry(text, { font, size, depth: 1.6, curveSegments: 4, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.18, bevelSegments: 2 });
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    geo.translate(-(bb.max.x + bb.min.x) / 2, -(bb.max.y + bb.min.y) / 2, 0);
    const m = mesh(geo, [letterMat, letterSide]);
    const p = onEllipse(a, R - 4.6);
    let tx = -Math.sin(a) * SX;
    let tz = Math.cos(a);
    if (tx < 0) {
      tx = -tx;
      tz = -tz;
    }
    m.rotation.order = 'YXZ';
    m.rotation.y = Math.atan2(-tz, tx);
    m.rotation.x = -Math.PI / 2 + 0.5;
    m.position.set(p.x, 23.2, p.z);
    group.add(m);
    return m;
  };
  addWord('GAME', Math.PI + 0.55, 6.4);
  addWord('DAY', 0.62, 7.4);

  // Jeeter script decal on the roof (south-west), oriented like the letters
  const decal = new THREE.Mesh(
    new THREE.PlaneGeometry(15, 5.6),
    new THREE.MeshStandardMaterial({ map: jeeterWordmark({ color: '#ffffff', stroke: '#2a3f8f' }), transparent: true, depthWrite: false, roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.15, polygonOffset: true, polygonOffsetFactor: -2 }),
  );
  const da = Math.PI / 2 + 0.85;
  const dp = onEllipse(da, R - 4.4);
  let dtx = -Math.sin(da) * SX;
  let dtz = Math.cos(da);
  if (dtx < 0) {
    dtx = -dtx;
    dtz = -dtz;
  }
  decal.rotation.order = 'YXZ';
  decal.rotation.y = Math.atan2(-dtz, dtx);
  decal.rotation.x = -Math.PI / 2 + 0.22;
  decal.position.set(dp.x, 22.35, dp.z);
  decal.renderOrder = 3;
  group.add(decal);

  // interior light glow so the bowl reads at golden hour
  const bowlLight = new THREE.PointLight(0xfff0d0, 120, 60, 2);
  bowlLight.position.set(0, 26, 0);
  group.add(bowlLight);

  // hover ring + trigger
  const ring = hoverRing(R + 4, '#7a95ff');
  ring.scale.x = SX;
  group.add(ring);
  const trigger = invisibleTrigger('trigger_stadium', new THREE.CylinderGeometry(R + 2.5, R + 2.5, 26, 32).scale(SX, 1, 1).translate(0, 13, 0), 'stadium');
  group.add(trigger);

  return {
    group,
    trigger,
    ring,
    update(t) {
      ledTex.offset.x = -t * 0.05;
    },
  };
}
