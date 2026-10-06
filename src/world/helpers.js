import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const rand = (a, b) => a + Math.random() * (b - a);
export const TAU = Math.PI * 2;

export function std(params = {}) {
  return new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.0, ...params });
}

export function mesh(geo, mat, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

export function box(w, h, d, mat, x = 0, y = 0, z = 0, opts) {
  const m = mesh(new THREE.BoxGeometry(w, h, d), mat, opts);
  m.position.set(x, y + h / 2, z);
  return m;
}

export function cyl(rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 24, opts) {
  const m = mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, opts);
  m.position.set(x, y + h / 2, z);
  return m;
}

// Flat textured plane (sign, banner, screen). Faces +z.
export function panel(w, h, map, { emissive = 0.6, double = false, transparent = false } = {}) {
  const mat = new THREE.MeshStandardMaterial({
    map,
    emissive: 0xffffff,
    emissiveMap: map,
    emissiveIntensity: emissive,
    roughness: 0.6,
    transparent,
    side: double ? THREE.DoubleSide : THREE.FrontSide,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  return m;
}

// Gable (triangular prism) roof spanning w (x) by d (z), apex height h.
export function gableRoof(w, h, d, mat, overhang = 0.8) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 - overhang, 0);
  s.lineTo(0, h);
  s.lineTo(w / 2 + overhang, 0);
  s.lineTo(-w / 2 - overhang, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: d + overhang * 2, bevelEnabled: false });
  g.translate(0, 0, -(d + overhang * 2) / 2);
  return mesh(g, mat);
}

export function instanced(geo, mat, transforms, { cast = false, receive = true, colors = null } = {}) {
  const im = new THREE.InstancedMesh(geo, mat, transforms.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  transforms.forEach((t, i) => {
    p.set(t.x, t.y || 0, t.z);
    e.set(t.rx || 0, t.ry || 0, t.rz || 0);
    q.setFromEuler(e);
    const sc = t.s ?? 1;
    s.set(t.sx ?? sc, t.sy ?? sc, t.sz ?? sc);
    m.compose(p, q, s);
    im.setMatrixAt(i, m);
    if (colors) im.setColorAt(i, colors[i % colors.length] instanceof THREE.Color ? colors[i % colors.length] : new THREE.Color(colors[(Math.random() * colors.length) | 0]));
  });
  im.castShadow = cast;
  im.receiveShadow = receive;
  im.instanceMatrix.needsUpdate = true;
  im.computeBoundingSphere();
  return im;
}

// --- Vegetation geometry --------------------------------------------------------

let palmCache = null;
export function palmGeometries() {
  if (palmCache) return palmCache;
  const trunk = new THREE.CylinderGeometry(0.22, 0.38, 7, 6, 4);
  // slight lean / curve
  const pos = trunk.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) + 3.5;
    pos.setX(i, pos.getX(i) + Math.pow(y / 7, 2) * 0.8);
  }
  trunk.translate(0, 3.5, 0);
  trunk.computeVertexNormals();

  const leaves = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const leaf = new THREE.PlaneGeometry(0.9, 4.2, 1, 5);
    leaf.translate(0, 2.1, 0);
    const lp = leaf.attributes.position;
    for (let v = 0; v < lp.count; v++) {
      const y = lp.getY(v);
      const t = y / 4.2;
      lp.setX(v, lp.getX(v) * (1 - t * 0.7));
      lp.setZ(v, -Math.pow(t, 1.6) * 2.4); // droop
    }
    leaf.rotateX(-Math.PI / 2 + 0.45);
    leaf.rotateY((i / n) * TAU + rand(-0.15, 0.15));
    leaves.push(leaf);
  }
  const crown = mergeGeometries(leaves);
  crown.translate(0.8, 7, 0);
  crown.computeVertexNormals();
  palmCache = { trunk, crown };
  return palmCache;
}

export function makePalms(points, { mobile = false } = {}) {
  const { trunk, crown } = palmGeometries();
  const tMat = std({ color: '#8a6a48', roughness: 1 });
  const cMat = std({ color: '#4f8a3a', roughness: 0.9, side: THREE.DoubleSide });
  const transforms = points.map((p) => ({ x: p.x, y: p.y || 0, z: p.z, ry: rand(0, TAU), s: p.s ?? rand(0.8, 1.25) }));
  const g = new THREE.Group();
  g.add(instanced(trunk, tMat, transforms, { cast: !mobile }));
  const greens = ['#4f8a3a', '#5e9a3f', '#3f7a35', '#6aa648'].map((c) => new THREE.Color(c));
  g.add(instanced(crown, cMat, transforms, { cast: !mobile, colors: greens }));
  return g;
}

export function makePines(points, { mobile = false } = {}) {
  const cone = mergeGeometries([
    new THREE.ConeGeometry(2.2, 4, 7).translate(0, 4, 0),
    new THREE.ConeGeometry(1.7, 3.4, 7).translate(0, 6, 0),
    new THREE.ConeGeometry(1.1, 2.8, 7).translate(0, 8, 0),
  ]);
  const trunk = new THREE.CylinderGeometry(0.25, 0.35, 2.4, 5).translate(0, 1.2, 0);
  const transforms = points.map((p) => ({ x: p.x, y: p.y || 0, z: p.z, ry: rand(0, TAU), s: p.s ?? rand(0.7, 1.4) }));
  const g = new THREE.Group();
  g.add(instanced(trunk, std({ color: '#5a4030' }), transforms));
  const greens = ['#2f5a34', '#3b6a3a', '#284d2e', '#46784a'].map((c) => new THREE.Color(c));
  g.add(instanced(cone, std({ color: '#ffffff', flatShading: true }), transforms, { cast: !mobile, colors: greens }));
  return g;
}

export function makeShrubs(points, palette = ['#4c8a3e', '#6a9c4a', '#8a6fc4', '#a07ad6', '#3e7a3a']) {
  const geo = new THREE.IcosahedronGeometry(1, 0);
  const transforms = points.map((p) => ({ x: p.x, y: (p.y || 0) + 0.4, z: p.z, ry: rand(0, TAU), sx: p.s ?? rand(0.6, 1.3), sy: (p.s ?? 1) * rand(0.5, 0.9), sz: p.s ?? rand(0.6, 1.3) }));
  return instanced(geo, std({ color: '#ffffff', flatShading: true }), transforms, { colors: palette.map((c) => new THREE.Color(c)) });
}

// Point-in-polygon on XZ.
export function insidePoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

// Freeze matrices on static sub-trees; skip nodes flagged userData.dynamic.
export function freezeStatic(root) {
  root.traverse((o) => {
    if (o === root) return;
    let p = o;
    while (p && p !== root) {
      if (p.userData.dynamic) return;
      p = p.parent;
    }
    o.updateMatrix();
    o.matrixAutoUpdate = false;
  });
}

// Generic hover highlighter: tweens emissive toward an accent colour on every
// MeshStandardMaterial within a district group.
export function makeHighlighter(group, accent) {
  const entries = [];
  const seen = new Set();
  const accentColor = new THREE.Color(accent);
  group.traverse((o) => {
    if (!o.isMesh || o.userData.noHighlight) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m || seen.has(m) || !m.emissive) continue;
      seen.add(m);
      entries.push({ m, base: m.emissive.clone(), baseI: m.emissiveIntensity });
    }
  });
  const state = { v: 0 };
  const tmp = new THREE.Color();
  return {
    state,
    apply() {
      for (const e of entries) {
        if (e.m.emissiveMap) {
          e.m.emissiveIntensity = e.baseI * (1 + state.v * 0.7);
        } else {
          e.m.emissive.copy(tmp.copy(e.base).lerp(accentColor, state.v * 0.28));
        }
      }
    },
  };
}

// Glowing ground ring shown on hover.
export function hoverRing(radius, color) {
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const m = new THREE.Mesh(new THREE.RingGeometry(radius * 0.92, radius, 96), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.25;
  m.userData.noHighlight = true;
  m.userData.dynamic = true;
  return m;
}

export function invisibleTrigger(name, geo, district) {
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ visible: false }));
  m.name = name;
  m.userData.district = district;
  m.userData.noHighlight = true;
  return m;
}
