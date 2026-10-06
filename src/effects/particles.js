import * as THREE from 'three';

const rand = (a, b) => a + Math.random() * (b - a);

// Soft round sprite, used by fireworks (additive) and smoke (alpha).
function spriteTexture(kind) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  if (kind === 'glow') {
    // sharp spark: hard bright core, thin halo
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.12, 'rgba(255,255,255,1)');
    gr.addColorStop(0.22, 'rgba(255,255,255,0.45)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0.08)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
  } else {
    // billowy smoke puff: many soft blobs
    for (let i = 0; i < 26; i++) {
      const x = 64 + rand(-26, 26);
      const y = 64 + rand(-26, 26);
      const r = rand(16, 38);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.4)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 128, 128);
    }
    const mask = g.createRadialGradient(64, 64, 30, 64, 64, 64);
    mask.addColorStop(0, 'rgba(0,0,0,1)');
    mask.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalCompositeOperation = 'destination-in';
    g.fillStyle = mask;
    g.fillRect(0, 0, 128, 128);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * GPU point pool. Each particle has position, colour, size, alpha and
 * rotation; the CPU only updates attributes for live particles.
 */
class PointPool {
  constructor(count, { blending, texture, depthTest = false }) {
    this.count = count;
    this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(count * 3);
    this.col = new Float32Array(count * 3);
    this.size = new Float32Array(count);
    this.alpha = new Float32Array(count);
    this.rot = new Float32Array(count);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aRot', new THREE.BufferAttribute(this.rot, 1).setUsage(THREE.DynamicDrawUsage));
    this.material = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: texture }, uScale: { value: 300 } },
      vertexShader: /* glsl */ `
        attribute vec3 aColor; attribute float aSize; attribute float aAlpha; attribute float aRot;
        uniform float uScale;
        varying vec3 vColor; varying float vAlpha; varying float vRot;
        void main() {
          vColor = aColor; vAlpha = aAlpha; vRot = aRot;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uScale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uTex;
        varying vec3 vColor; varying float vAlpha; varying float vRot;
        void main() {
          vec2 p = gl_PointCoord - 0.5;
          float c = cos(vRot), s = sin(vRot);
          p = mat2(c, -s, s, c) * p + 0.5;
          vec4 tex = texture2D(uTex, p);
          gl_FragColor = vec4(vColor * tex.rgb, tex.a * vAlpha);
          if (gl_FragColor.a < 0.003) discard;
        }`,
      transparent: true,
      depthWrite: false,
      depthTest,
      blending,
    });
    this.points = new THREE.Points(this.geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    this.live = Array.from({ length: count }, () => ({ alive: false }));
    this.cursor = 0;
  }

  spawn() {
    for (let k = 0; k < this.count; k++) {
      const i = (this.cursor + k) % this.count;
      if (!this.live[i].alive) {
        this.cursor = (i + 1) % this.count;
        return i;
      }
    }
    const i = this.cursor;
    this.cursor = (i + 1) % this.count;
    return i;
  }

  flush() {
    for (const k of ['position', 'aColor', 'aSize', 'aAlpha', 'aRot']) this.geo.attributes[k].needsUpdate = true;
  }

  setScale(px) {
    this.material.uniforms.uScale.value = px;
  }
}

// --- Fireworks ----------------------------------------------------------------
export class Fireworks {
  constructor(count = 2200) {
    this.pool = new PointPool(count, { blending: THREE.NormalBlending, texture: spriteTexture('glow') });
    this.object = this.pool.points;
    this.state = this.pool.live.map(() => ({ alive: false, p: new THREE.Vector3(), v: new THREE.Vector3(), c: new THREE.Color(), life: 0, max: 1, size: 1, kind: 0 }));
    this.palette = ['#ffc400', '#ff2d7a', '#5a6bff', '#9b4dff', '#ff7a1a', '#00c8ff', '#ff3b3b', '#c27dff'].map((c) => new THREE.Color(c));
    this.onBurst = null;
    this.trail = count > 3000 ? 0.05 : 0.025;
  }

  _emit(kind, p, v, color, max, size) {
    const i = this.pool.spawn();
    const s = this.state[i];
    s.alive = true;
    this.pool.live[i].alive = true;
    s.kind = kind;
    s.p.copy(p);
    s.v.copy(v);
    s.c.copy(color);
    s.life = 0;
    s.max = max;
    s.size = size;
    return s;
  }

  /** Rocket from `from` up to `to`, then a burst. Units are world units. */
  rocket(from, to, scale = 1) {
    const color = this.palette[(Math.random() * this.palette.length) | 0];
    const time = rand(0.9, 1.3);
    const v = new THREE.Vector3().subVectors(to, from).divideScalar(time);
    const s = this._emit(1, from, v, new THREE.Color('#fff1c8'), time, 0.16 * scale);
    s.target = color;
    s.scale = scale;
  }

  burst(at, color, scale = 1, n = 220) {
    const style = Math.random();
    for (let k = 0; k < n; k++) {
      const u = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const sp = (style < 0.35 ? rand(0.95, 1) : rand(0.6, 1)) * 3.1 * scale;
      const v = new THREE.Vector3(r * Math.cos(th), u, r * Math.sin(th) * 0.4).multiplyScalar(sp);
      const c = color.clone().lerp(new THREE.Color('#ffffff'), Math.random() * 0.15);
      this._emit(2, at, v, c, rand(1.1, 1.7), rand(0.24, 0.34) * scale);
    }
    this.onBurst?.(color);
  }

  /** Gold dust fountain (vault door). */
  sparkle(at, scale = 1, n = 160) {
    const gold = new THREE.Color('#ffcf7a');
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(0.3, 1.5) * scale;
      const v = new THREE.Vector3(Math.cos(a) * sp, Math.sin(a) * sp + 0.25 * scale, rand(0, 0.5) * scale);
      this._emit(3, at, v, gold.clone().lerp(new THREE.Color('#fff6dc'), Math.random() * 0.6), rand(1.2, 2.4), rand(0.07, 0.13) * scale);
    }
  }

  update(t, dt) {
    const pool = this.pool;
    let any = false;
    for (let i = 0; i < this.state.length; i++) {
      const s = this.state[i];
      if (!s.alive) {
        pool.alpha[i] = 0;
        continue;
      }
      any = true;
      s.life += dt;
      const k = s.life / s.max;
      if (k >= 1) {
        s.alive = false;
        pool.live[i].alive = false;
        pool.alpha[i] = 0;
        if (s.kind === 1) this.burst(s.p, s.target, s.scale);
        continue;
      }
      if (s.kind === 1) {
        // rocket + trail sparks
        if (Math.random() < 0.7) this._emit(4, s.p, new THREE.Vector3(rand(-0.05, 0.05), -0.1, 0), new THREE.Color('#ffc98a'), 0.45, s.size * 0.6);
      } else if (s.kind === 2) {
        s.v.multiplyScalar(1 - 2.2 * dt);
        s.v.y -= 0.35 * dt;
        // ember trail
        if (k < 0.7 && Math.random() < this.trail) {
          const e = this._emit(4, s.p, new THREE.Vector3(0, -0.15, 0).multiplyScalar(s.size * 5), s.c, rand(0.35, 0.6), s.size * 0.6);
          e.c.lerp(new THREE.Color('#ffd9a0'), 0.4);
        }
      } else if (s.kind === 3) {
        s.v.multiplyScalar(1 - 0.9 * dt);
        s.v.y -= 0.12 * dt;
      }
      s.p.addScaledVector(s.v, dt);
      pool.pos[i * 3] = s.p.x;
      pool.pos[i * 3 + 1] = s.p.y;
      pool.pos[i * 3 + 2] = s.p.z;
      const fade = s.kind === 1 ? 1 : Math.pow(1 - k, 1.4);
      const tw = s.kind === 2 && k > 0.5 ? 0.5 + 0.5 * Math.sin(t * 40 + i) : 1;
      // hot white core early, saturated colour as sparks cool
      const heat = s.kind === 2 ? Math.max(0, 1 - k * 3) : 1;
      pool.col[i * 3] = s.c.r + (1 - s.c.r) * heat;
      pool.col[i * 3 + 1] = s.c.g + (1 - s.c.g) * heat;
      pool.col[i * 3 + 2] = s.c.b + (1 - s.c.b) * heat;
      pool.alpha[i] = fade * tw;
      pool.size[i] = s.size * (s.kind === 2 ? 1 - k * 0.4 : 1);
    }
    if (any || this._wasAny) pool.flush();
    this._wasAny = any;
  }
}

// --- Smoke ---------------------------------------------------------------------
export class Smoke {
  constructor(emitters, count = 140) {
    // emitters: [{ p: Vector3, strength, wind: Vector3, scale }]
    this.emitters = emitters;
    this.pool = new PointPool(count, { blending: THREE.NormalBlending, texture: spriteTexture('smoke') });
    this.object = this.pool.points;
    this.state = this.pool.live.map(() => ({ alive: false, p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0, max: 1, e: null, rot: 0, spin: 0 }));
    this.acc = emitters.map(() => 0);
    this.shade = new THREE.Color('#b9b3ad');
    this.lit = new THREE.Color('#f2ece6');
  }

  update(t, dt) {
    const pool = this.pool;
    this.emitters.forEach((e, n) => {
      this.acc[n] += dt * 9 * e.strength;
      while (this.acc[n] > 1) {
        this.acc[n] -= 1;
        const i = pool.spawn();
        const s = this.state[i];
        s.alive = true;
        pool.live[i].alive = true;
        s.e = e;
        s.p.copy(e.p);
        s.v.set(rand(-0.1, 0.1), rand(0.7, 1.0), 0).multiplyScalar(e.scale);
        s.life = 0;
        s.max = rand(5, 7.5);
        s.rot = rand(0, 6.28);
        s.spin = rand(-0.2, 0.2);
      }
    });
    for (let i = 0; i < this.state.length; i++) {
      const s = this.state[i];
      if (!s.alive) {
        pool.alpha[i] = 0;
        continue;
      }
      s.life += dt;
      const k = s.life / s.max;
      if (k >= 1) {
        s.alive = false;
        pool.live[i].alive = false;
        pool.alpha[i] = 0;
        continue;
      }
      // rise slows, wind takes over
      s.v.y *= 1 - 0.18 * dt;
      s.p.addScaledVector(s.v, dt).addScaledVector(s.e.wind, dt * Math.min(1, 0.25 + k * 2));
      s.rot += s.spin * dt;
      pool.pos[i * 3] = s.p.x;
      pool.pos[i * 3 + 1] = s.p.y;
      pool.pos[i * 3 + 2] = s.p.z;
      const c = this.shade.clone().lerp(this.lit, 0.25 + 0.55 * k);
      pool.col[i * 3] = c.r;
      pool.col[i * 3 + 1] = c.g;
      pool.col[i * 3 + 2] = c.b;
      pool.alpha[i] = Math.min(1, k * 5) * Math.pow(1 - k, 1.3) * 0.85 * Math.min(1, s.e.strength + 0.25);
      pool.size[i] = (1.8 + k * 13) * s.e.scale;
      pool.rot[i] = s.rot;
    }
    pool.flush();
  }
}

// --- Stadium light beams ------------------------------------------------------
export class Beams {
  constructor(origins, length) {
    this.object = new THREE.Group();
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 256;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 256, 0, 0);
    gr.addColorStop(0, 'rgba(255,248,230,0.9)');
    gr.addColorStop(1, 'rgba(255,248,230,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 256);
    const side = g.createLinearGradient(0, 0, 64, 0);
    side.addColorStop(0, 'rgba(0,0,0,1)');
    side.addColorStop(0.5, 'rgba(0,0,0,0)');
    side.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = side;
    g.fillRect(0, 0, 64, 256);
    const tex = new THREE.CanvasTexture(c);
    this.beams = origins.map((o, i) => {
      const geo = new THREE.PlaneGeometry(length * 0.16, length).translate(0, length / 2, 0);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, side: THREE.DoubleSide });
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(o);
      m.renderOrder = 3;
      m.userData.phase = i * 1.7;
      this.object.add(m);
      return m;
    });
    this.boost = 0;
  }

  update(t) {
    for (const b of this.beams) {
      b.rotation.z = Math.sin(t * 0.35 + b.userData.phase) * 0.38 + (b.position.x < 0 ? 0.22 : -0.22);
      b.material.opacity = 0.07 + 0.05 * Math.sin(t * 0.8 + b.userData.phase) + this.boost * 0.22;
    }
  }
}

// --- Gulls: tiny flapping silhouettes for life in the sky ---------------------
export class Gulls {
  constructor(region, n = 5) {
    this.object = new THREE.Group();
    const mat = new THREE.LineBasicMaterial({ color: 0x2b2a30, transparent: true, opacity: 0.75, depthTest: false });
    this.birds = Array.from({ length: n }, () => {
      const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-1, 0.25, 0, 0, 0, 0, 0, 0, 0, 1, 0.25, 0], 3));
      const l = new THREE.LineSegments(geo, mat);
      l.renderOrder = 4;
      l.userData = { phase: rand(0, 6), speed: rand(0.12, 0.22) * (Math.random() < 0.5 ? -1 : 1), y: rand(region.y0, region.y1), x: rand(region.x0, region.x1), s: rand(0.04, 0.07) };
      this.object.add(l);
      return l;
    });
    this.region = region;
  }

  update(t, dt) {
    const r = this.region;
    for (const b of this.birds) {
      const d = b.userData;
      d.x += d.speed * dt;
      if (d.x > r.x1) d.x = r.x0;
      if (d.x < r.x0) d.x = r.x1;
      b.position.set(d.x, d.y + Math.sin(t * 0.7 + d.phase) * 0.05, r.z);
      const flap = Math.sin(t * 9 + d.phase);
      const p = b.geometry.attributes.position;
      p.setY(0, flap * 0.45);
      p.setY(3, flap * 0.45);
      p.needsUpdate = true;
      b.scale.setScalar(d.s);
    }
  }
}
