import * as THREE from 'three';

// World width of every scene plane. Height follows the image aspect.
export const PLANE_W = 16;
// How far the nearest (bottom) row of the render is pushed toward the camera.
// The aerial renders are effectively a tilted ground plane, so depth grows
// from the horizon (top) to the foreground (bottom); this gives the
// isometric diorama parallax without warping buildings.
export const DEPTH = 1.9;

export const depthAt = (v) => Math.pow(THREE.MathUtils.clamp(v, 0, 1), 1.35) * DEPTH;

const NEON_COLORS = {
  green: new THREE.Color('#7dff4f'),
  blue: new THREE.Color('#3f86ff'),
  gold: new THREE.Color('#ffc46b'),
  fire: new THREE.Color('#ff9a40'),
  default: new THREE.Color('#9d84ff'),
};

const vertexShader = /* glsl */ `
  uniform float uDepth;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.z += pow(clamp(1.0 - uv.y, 0.0, 1.0), 1.35) * uDepth;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform sampler2D uFx;
  uniform float uTime;
  uniform float uOpacity;
  uniform vec4 uHover;       // centre.xy, radius.xy (image space, top-left origin)
  uniform float uHoverAmt;
  uniform vec3 uAccent;
  uniform float uNeon;       // extra neon drive (hover / events)
  uniform vec3 uNeonColor;
  uniform float uFlash;      // fireworks sky flash
  uniform vec3 uDoor;        // xy door centre, z glow amount
  uniform vec2 uTexel;
  varying vec2 vUv;

  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    float a = hash(i), b = hash(i + vec2(1, 0)), c = hash(i + vec2(0, 1)), d = hash(i + vec2(1, 1));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void main() {
    vec2 uv = vUv;
    vec2 iu = vec2(uv.x, 1.0 - uv.y);
    vec3 fx = texture2D(uFx, uv).rgb;
    float water = fx.r;
    float fall = fx.g;
    float lights = fx.b;
    float t = uTime;

    // water: gentle refraction ripple
    vec2 off = vec2(0.0);
    float n1 = noise(iu * vec2(90.0, 160.0) + vec2(t * 0.6, t * 0.35));
    float n2 = noise(iu * vec2(140.0, 260.0) - vec2(t * 0.45, -t * 0.5));
    off += water * vec2(n1 - 0.5, n2 - 0.5) * 0.0022;
    // waterfall: downward flow distortion
    float flow = noise(vec2(iu.x * 160.0, iu.y * 22.0 - t * 3.2));
    off += fall * vec2((flow - 0.5) * 0.0025, (flow - 0.5) * 0.004);

    vec3 col = texture2D(uMap, uv + off).rgb;

    // water sun glints
    float g = noise(iu * vec2(420.0, 700.0) + vec2(t * 1.3, -t * 0.7));
    col += water * pow(g, 14.0) * vec3(1.0, 0.92, 0.78) * 2.4;
    col += water * (n1 - 0.5) * 0.05;

    // waterfall white streaks + mist
    float streak = noise(vec2(iu.x * 260.0, iu.y * 18.0 - t * 4.5));
    col = mix(col, vec3(0.96, 0.98, 1.0), fall * smoothstep(0.55, 0.95, streak) * 0.55);

    // practical lights: warm windows / string lights twinkle subtly
    float warm = clamp(lights / 0.4, 0.0, 1.0) * (1.0 - smoothstep(0.6, 0.8, lights));
    float phase = hash(floor(iu * 420.0)) * 6.2831;
    col *= 1.0 + warm * (0.1 + 0.1 * sin(t * 2.2 + phase));

    // neon / LED screens with a soft halo
    float neon = smoothstep(0.6, 0.9, lights);
    float halo = 0.0;
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.7854;
      halo += smoothstep(0.6, 0.9, texture2D(uFx, uv + vec2(cos(a), sin(a)) * uTexel * 9.0).b);
    }
    halo /= 8.0;
    float pulse = 0.55 + 0.45 * sin(t * 2.4) + uNeon;
    float flicker = step(0.97, hash(vec2(floor(t * 12.0), 3.0))) * 0.35;
    col += col * neon * (0.18 + 0.35 * pulse - flicker);
    col += uNeonColor * halo * (0.12 + 0.35 * pulse);

    // hovered hotspot: lift + accent rim
    vec2 d2 = (iu - uHover.xy) / max(uHover.zw, vec2(1e-4));
    float d = length(d2);
    float inside = 1.0 - smoothstep(0.75, 1.0, d);
    col *= 1.0 + uHoverAmt * inside * 0.14;
    float rim = smoothstep(0.08, 0.0, abs(d - 1.0)) * uHoverAmt;
    col += uAccent * rim * 0.55;

    // vault door glow
    float dd = length((iu - uDoor.xy) * vec2(1.78, 1.0));
    col += vec3(1.0, 0.72, 0.32) * uDoor.z * (exp(-dd * 18.0) * 1.6 + exp(-dd * 5.0) * 0.25);

    // fireworks flash lights the sky and roofs
    col += vec3(1.0, 0.82, 0.6) * uFlash * (0.04 + 0.16 * (1.0 - iu.y));

    // subtle grade + vignette
    col = mix(col, col * col * (3.0 - 2.0 * col), 0.18);
    float vig = smoothstep(1.25, 0.35, length((iu - 0.5) * vec2(1.25, 1.0)));
    col *= mix(0.8, 1.0, vig);

    gl_FragColor = vec4(col, uOpacity);
    #include <colorspace_fragment>
  }
`;

export class SceneView {
  constructor(id, def, renderer) {
    this.id = id;
    this.def = def;
    this.renderer = renderer;
    this.group = new THREE.Group();
    this.group.name = `scene_${id}`;
    this.group.visible = false;
    this.ready = false;
    this.aspect = 16 / 9;
    this.uniforms = {
      uMap: { value: null },
      uFx: { value: null },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uDepth: { value: DEPTH },
      uHover: { value: new THREE.Vector4(-1, -1, 0.1, 0.1) },
      uHoverAmt: { value: 0 },
      uAccent: { value: new THREE.Color('#ffd27a') },
      uNeon: { value: 0 },
      uNeonColor: { value: (NEON_COLORS[def.neonColor] || NEON_COLORS.default).clone() },
      uFlash: { value: 0 },
      uDoor: { value: new THREE.Vector3(def.door?.[0] ?? -1, def.door?.[1] ?? -1, 0) },
      uTexel: { value: new THREE.Vector2(1 / 1024, 1 / 576) },
    };
  }

  get width() {
    return PLANE_W;
  }

  get height() {
    return PLANE_W / this.aspect;
  }

  load(base = '') {
    if (this.loading) return this.loading;
    const loader = new THREE.TextureLoader();
    const load = (url) => new Promise((res, rej) => loader.load(base + url, res, undefined, rej));
    this.loading = Promise.all([load(`scenes/${this.id}.webp`), load(`scenes/${this.id}-fx.png`)]).then(([map, fx]) => {
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      map.generateMipmaps = true;
      map.minFilter = THREE.LinearMipmapLinearFilter;
      fx.colorSpace = THREE.NoColorSpace;
      this.aspect = map.image.width / map.image.height;
      this.uniforms.uMap.value = map;
      this.uniforms.uFx.value = fx;
      this.uniforms.uTexel.value.set(1 / fx.image.width, 1 / fx.image.height);
      const geo = new THREE.PlaneGeometry(this.width, this.height, 1, 120);
      this.material = new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: true,
      });
      this.mesh = new THREE.Mesh(geo, this.material);
      this.mesh.renderOrder = 0;
      this.group.add(this.mesh);
      this.renderer.initTexture?.(map);
      this.ready = true;
      return this;
    });
    return this.loading;
  }

  /** Image-space (top-left origin) → world position on the displaced plane. */
  toWorld(u, v, lift = 0, target = new THREE.Vector3()) {
    return target.set((u - 0.5) * this.width, (0.5 - v) * this.height, depthAt(v) + lift);
  }

  /** World ray hit (uv from three.js, bottom-left origin) → image space. */
  static toImage(uv) {
    return { u: uv.x, v: 1 - uv.y };
  }

  hotspotAt(u, v) {
    let best = null;
    let bestScore = Infinity;
    for (const h of this.def.hotspots) {
      const dx = (u - h.c[0]) / h.r[0];
      const dy = (v - h.c[1]) / h.r[1];
      const d = Math.hypot(dx, dy);
      if (d > 1) continue;
      // prefer the smaller target when areas overlap (signs over buildings)
      const score = d * 0.5 + h.r[0] * h.r[1] * 40;
      if (score < bestScore) {
        bestScore = score;
        best = h;
      }
    }
    return best;
  }

  update(t) {
    this.uniforms.uTime.value = t;
  }
}
