import * as THREE from 'three';
import { jeeterWordmark, coinFace } from './textures.js';
import { std, mesh, box, TAU, rand } from './helpers.js';

// --- Jeeter blimp on a continuous closed curve around the stadium -------------
export function createBlimp() {
  const blimp = new THREE.Group();
  blimp.userData.dynamic = true;
  const white = std({ color: '#f4f5f8', roughness: 0.45, metalness: 0.1 });
  const blue = std({ color: '#22308f', roughness: 0.5 });
  const body = mesh(new THREE.SphereGeometry(1, 40, 20), white, { cast: false });
  body.scale.set(3.6, 3.6, 13);
  blimp.add(body);
  const band = mesh(new THREE.CylinderGeometry(1, 1, 1, 40, 1, true), blue, { cast: false });
  band.rotation.x = Math.PI / 2;
  band.scale.set(3.63, 7, 3.63);
  blimp.add(band);
  // side banners (both sides)
  const tex = jeeterWordmark({ bg: '#22308f', color: '#ffffff', size: 0.7 });
  for (const side of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 3.6), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    p.position.set(side * 3.68, 0, 0);
    p.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    blimp.add(p);
  }
  // fins (tail is -z, nose +z)
  for (let i = 0; i < 4; i++) {
    const fin = mesh(new THREE.BoxGeometry(0.25, 3.6, 3.2), blue, { cast: false });
    const a = (i / 4) * TAU;
    fin.position.set(Math.cos(a) * 2.6, Math.sin(a) * 2.6, -10.5);
    fin.rotation.z = a + Math.PI / 2;
    blimp.add(fin);
  }
  blimp.add(box(1.6, 1, 4, std({ color: '#2a2a33' }), 0, -4.4, 1));
  const nav = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3344, toneMapped: false }));
  nav.position.set(0, 3.7, 0);
  blimp.add(nav);

  const pts = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    pts.push(new THREE.Vector3(Math.cos(a) * 92, 56 + Math.sin(a * 2) * 5, Math.sin(a) * 62 - 10));
  }
  const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
  const tmp = new THREE.Vector3();
  let u = 0.1;
  return {
    object: blimp,
    update(t, dt) {
      u = (u + dt * 0.012) % 1;
      curve.getPointAt(u, blimp.position);
      curve.getPointAt((u + 0.004) % 1, tmp);
      blimp.lookAt(tmp);
      blimp.rotation.z += Math.sin(t * 0.7) * 0.02;
      nav.visible = Math.sin(t * 6) > 0;
    },
  };
}

// --- Instanced firework particles ----------------------------------------------
export function createFireworks({ count = 1400 } = {}) {
  const geo = new THREE.IcosahedronGeometry(0.32, 0);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const im = new THREE.InstancedMesh(geo, mat, count);
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  im.frustumCulled = false;
  im.userData.dynamic = true;
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    im.setMatrixAt(i, zero);
    im.setColorAt(i, color.set(0x000000));
  }
  const P = Array.from({ length: count }, () => ({ alive: false, p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0, max: 1, c: new THREE.Color(), size: 1, rocket: false, burstColor: null }));
  let cursor = 0;
  const palette = ['#ffd34d', '#ff5fa2', '#7d9bff', '#b388ff', '#7dff4f', '#ffffff', '#4fe3ff'];
  const spawn = () => {
    const p = P[cursor];
    cursor = (cursor + 1) % count;
    return p;
  };

  function burst(at, hex) {
    const col = new THREE.Color(hex);
    const n = 110;
    for (let i = 0; i < n; i++) {
      const p = spawn();
      p.alive = true;
      p.rocket = false;
      p.p.copy(at);
      const u = Math.random() * 2 - 1;
      const th = Math.random() * TAU;
      const r = Math.sqrt(1 - u * u);
      const speed = rand(14, 20);
      p.v.set(r * Math.cos(th) * speed, u * speed, r * Math.sin(th) * speed);
      p.life = 0;
      p.max = rand(1.3, 2.1);
      p.c.copy(col).lerp(new THREE.Color('#ffffff'), Math.random() * 0.3);
      p.size = rand(0.8, 1.4);
    }
  }

  function launch(n = 6, origin = new THREE.Vector3(0, 22, 0)) {
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        const p = spawn();
        p.alive = true;
        p.rocket = true;
        p.p.set(origin.x + rand(-30, 30), origin.y, origin.z + rand(-20, 20));
        p.v.set(rand(-2, 2), rand(30, 38), rand(-2, 2));
        p.life = 0;
        p.max = rand(0.9, 1.2);
        p.c.set('#fff2c0');
        p.size = 1.2;
        p.burstColor = palette[(Math.random() * palette.length) | 0];
      }, i * 260);
    }
  }

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  function update(t, dt) {
    let any = false;
    for (let i = 0; i < count; i++) {
      const p = P[i];
      if (!p.alive) continue;
      any = true;
      p.life += dt;
      if (p.life >= p.max) {
        p.alive = false;
        im.setMatrixAt(i, zero);
        if (p.rocket) burst(p.p.clone(), p.burstColor);
        continue;
      }
      const k = p.life / p.max;
      if (p.rocket) {
        p.v.y -= 9 * dt;
      } else {
        p.v.multiplyScalar(1 - 1.6 * dt);
        p.v.y -= 6 * dt;
      }
      p.p.addScaledVector(p.v, dt);
      const sc = p.rocket ? p.size : p.size * (1 - k * 0.7);
      s.setScalar(sc);
      m.compose(p.p, q, s);
      im.setMatrixAt(i, m);
      const fade = p.rocket ? 1 : (1 - k) * (0.75 + Math.random() * 0.5);
      color.copy(p.c).multiplyScalar(fade * 2.2);
      im.setColorAt(i, color);
    }
    if (any) {
      im.instanceMatrix.needsUpdate = true;
      im.instanceColor.needsUpdate = true;
    }
  }

  return { object: im, launch, burst, update };
}

// --- Floating brand coins -------------------------------------------------------
export function createCoin({ image, label, position, rim = '#c9a25a' }) {
  const faceTex = coinFace(image, { rim, label });
  const backTex = faceTex.clone();
  backTex.wrapS = THREE.RepeatWrapping;
  backTex.repeat.x = -1;
  backTex.offset.x = 1;
  backTex.needsUpdate = true;
  const edge = std({ color: rim, metalness: 1, roughness: 0.25 });
  const front = new THREE.MeshStandardMaterial({ map: faceTex, metalness: 0.45, roughness: 0.3, emissive: 0xffffff, emissiveMap: faceTex, emissiveIntensity: 0.35 });
  const back = new THREE.MeshStandardMaterial({ map: backTex, metalness: 0.45, roughness: 0.3, emissive: 0xffffff, emissiveMap: backTex, emissiveIntensity: 0.35 });
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 0.6, 64), [edge, front, back]);
  coin.rotation.x = Math.PI / 2;
  const holder = new THREE.Group();
  holder.add(coin);
  holder.position.copy(position);
  holder.userData.dynamic = true;
  holder.userData.noHighlight = true;
  coin.userData.noHighlight = true;
  // soft halo under the coin
  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(4.8, 40),
    new THREE.MeshBasicMaterial({ color: rim, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  halo.userData.noHighlight = true;
  halo.material.side = THREE.DoubleSide;
  halo.position.z = -0.35;
  holder.add(halo);
  const base = position.y;
  const phase = Math.random() * TAU;
  return {
    object: holder,
    update(t) {
      holder.position.y = base + Math.sin(t * 1.3 + phase) * 1.1;
      holder.rotation.y = t * 0.9 + phase;
    },
  };
}
