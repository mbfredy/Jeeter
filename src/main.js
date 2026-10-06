import * as THREE from 'three';
import gsap from 'gsap';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import helvetikerBold from 'three/examples/fonts/helvetiker_bold.typeface.json';

import './style.css';
import { ASSETS, DISTRICTS, OVERVIEW } from './config.js';
import { CameraManager } from './CameraManager.js';
import { RaycastManager } from './RaycastManager.js';
import { ModalManager } from './ModalManager.js';
import { setMaxAnisotropy, canvasTexture } from './world/textures.js';
import { freezeStatic, makeHighlighter } from './world/helpers.js';
import { createEnvironment } from './world/environment.js';
import { createWaterfallMaterial } from './world/water.js';
import { buildStadium } from './world/stadium.js';
import { buildHighsman } from './world/highsman.js';
import { buildPrimitiv } from './world/primitiv.js';
import { buildDodi } from './world/dodi.js';
import { buildVault } from './world/vault.js';
import { createBlimp, createFireworks, createCoin } from './world/effects.js';

const root = document.getElementById('jgd-app');
const $ = (sel) => root.querySelector(sel);
const canvasHost = $('[data-jgd-canvas]');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.matchMedia('(pointer: coarse)').matches || Math.min(window.innerWidth, window.innerHeight) < 700;

// --- Preloader -------------------------------------------------------------------
const preloader = {
  el: $('[data-jgd-preloader]'),
  bar: $('[data-jgd-progress]'),
  pct: $('[data-jgd-pct]'),
  value: 0,
  set(v) {
    this.value = Math.max(this.value, v);
    this.bar.style.width = `${Math.round(this.value * 100)}%`;
    this.pct.textContent = `${Math.round(this.value * 100)}%`;
  },
  hide() {
    return new Promise((resolve) => {
      gsap.to(this.el, { opacity: 0, duration: 0.8, delay: 0.15, ease: 'power2.out', onComplete: () => { this.el.remove(); resolve(); } });
    });
  },
};

// --- Renderer / scene / camera -----------------------------------------------------
const renderer = new THREE.WebGLRenderer({
  antialias: window.devicePixelRatio < 2,
  powerPreference: 'high-performance',
  alpha: false,
});
let pixelRatio = Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2);
renderer.setPixelRatio(pixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false; // the sun is static: bake once, refresh on demand
canvasHost.appendChild(renderer.domElement);
setMaxAnisotropy(renderer.capabilities.getMaxAnisotropy());

const scene = new THREE.Scene();
scene.background = new THREE.Color('#f2d6b3');
scene.fog = new THREE.Fog('#efd9bd', 320, 1100);

const camera = new THREE.PerspectiveCamera(45, 1, 1, 2600);
camera.position.set(0, 260, 420);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minPolarAngle = Math.PI / 4;
controls.maxPolarAngle = Math.PI / 2.3;
controls.minDistance = 35;
controls.maxDistance = 220;
controls.screenSpacePanning = false;
controls.rotateSpeed = 0.6;
controls.zoomSpeed = 0.8;
controls.panSpeed = 0.7;
controls.target.set(...OVERVIEW.target);
controls.enabled = false;

const cameraManager = new CameraManager(camera, controls, { reducedMotion });

// --- Lighting: golden hour ---------------------------------------------------------
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;
pmrem.dispose();

const hemi = new THREE.HemisphereLight('#d6e6ff', '#b8875a', 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffd7a3', 3.1);
sun.position.set(-170, 150, 120);
sun.castShadow = true;
sun.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -190, right: 190, top: 160, bottom: -160, near: 10, far: 600 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.6;
scene.add(sun);
scene.add(sun.target);
const fill = new THREE.DirectionalLight('#9fb6ff', 0.5);
fill.position.set(160, 80, -100);
scene.add(fill);

const requestShadowUpdate = () => {
  renderer.shadowMap.needsUpdate = true;
};

// --- Asset loading ------------------------------------------------------------------
function withTimeout(promise, ms, fallback) {
  return Promise.race([promise, new Promise((r) => setTimeout(() => r(fallback), ms))]);
}

async function loadFonts() {
  if (!document.fonts?.load) return;
  await withTimeout(
    Promise.all(['64px Yellowtail', '64px Anton', '600 64px Cinzel'].map((f) => document.fonts.load(f).catch(() => null))),
    3500,
  );
}

// Remote logos need CORS to be used in WebGL; on failure the textures fall back
// to canvas-drawn wordmarks so the world never shows a broken surface.
function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function loadLogos(onEach) {
  const out = {};
  await Promise.all(
    Object.entries(ASSETS.logos).map(async ([id, url]) => {
      const img = await withTimeout(loadImage(url), 7000, null);
      out[id] = img ? { image: img, texture: canvasTexture(img) } : { image: null, texture: null };
      onEach();
    }),
  );
  return out;
}

// --- World ----------------------------------------------------------------------------
const world = {
  env: null,
  districts: {},
  highlighters: {},
  coins: [],
  blimp: null,
  fireworks: null,
  waterfallMat: null,
  triggers: {},
};

function buildWorld(logos) {
  const sunDir = sun.position.clone().normalize();
  world.env = createEnvironment({ scene, mobile: isMobile, sunDir });
  freezeStatic(world.env.root);

  const font = new FontLoader().parse(helvetikerBold);
  world.waterfallMat = createWaterfallMaterial();

  const built = {
    stadium: buildStadium({ font, mobile: isMobile }),
    highsman: buildHighsman({ logo: logos.highsman.texture, mobile: isMobile, waterfallMat: world.waterfallMat, waterMat: world.env.waterMat }),
    primitiv: buildPrimitiv({ logo: logos.primitiv.texture, mobile: isMobile }),
    dodi: buildDodi({ logo: logos.dodi.texture, mobile: isMobile }),
    vault: buildVault({ mobile: isMobile, reducedMotion }),
  };
  for (const [id, d] of Object.entries(built)) {
    scene.add(d.group);
    freezeStatic(d.group);
    world.districts[id] = d;
    world.triggers[id] = d.trigger;
    world.highlighters[id] = makeHighlighter(d.group, DISTRICTS[id].accent);
  }

  world.blimp = createBlimp();
  scene.add(world.blimp.object);
  world.fireworks = createFireworks({ count: isMobile ? 700 : 1500 });
  scene.add(world.fireworks.object);

  const coinDefs = [
    { id: 'stadium', label: 'Jeeter', image: null, pos: [0, 38, 0], rim: '#c9a25a' },
    { id: 'highsman', image: logos.highsman.image, label: 'Highsman', pos: [-75, 32, -25], rim: '#9bc48a' },
    { id: 'primitiv', image: logos.primitiv.image, label: 'PRIMITIV', pos: [75, 34, -20], rim: '#8fb0ff' },
    { id: 'dodi', image: logos.dodi.image, label: 'Dodi', pos: [45, 28, 62], rim: '#b9ff9a' },
    { id: 'vault', label: 'Jeeter', image: null, pos: [-45, 26, 62], rim: '#e0b46a' },
  ];
  for (const c of coinDefs) {
    const coin = createCoin({ image: c.image, label: c.label, position: new THREE.Vector3(...c.pos), rim: c.rim });
    scene.add(coin.object);
    world.coins.push(coin);
  }
  requestShadowUpdate();
}

// Optional Draco-compressed master scene. Only fetched if the file exists and
// really is glTF (dev servers answer missing files with index.html).
async function loadMasterScene() {
  try {
    const res = await fetch(ASSETS.masterScene, { cache: 'force-cache' });
    if (!res.ok) return;
    const buf = await res.arrayBuffer();
    const head = new TextDecoder().decode(new Uint8Array(buf, 0, Math.min(4, buf.byteLength)));
    if (head !== 'glTF' && head[0] !== '{') return;
    const [{ GLTFLoader }, { DRACOLoader }] = await Promise.all([
      import('three/examples/jsm/loaders/GLTFLoader.js'),
      import('three/examples/jsm/loaders/DRACOLoader.js'),
    ]);
    const draco = new DRACOLoader().setDecoderPath(ASSETS.dracoDecoderPath);
    const loader = new GLTFLoader().setDRACOLoader(draco);
    const base = ASSETS.masterScene.substring(0, ASSETS.masterScene.lastIndexOf('/') + 1);
    const gltf = await new Promise((resolve, reject) => loader.parse(buf, base, resolve, reject));
    integrateMasterScene(gltf.scene);
    draco.dispose();
  } catch (err) {
    console.info('[jgd] master scene not loaded, using procedural world', err?.message || '');
  }
}

// Conventions for the authored scene:
//   trigger_<id>   → raycast volume for that district (rendered invisible)
//   district_<id>  → replaces the procedural district visuals
//   environment    → replaces the procedural environment (water/sky kept)
function integrateMasterScene(gltfScene) {
  gltfScene.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
    const m = /^trigger_(\w+)$/.exec(o.name);
    if (m && DISTRICTS[m[1]]) {
      o.userData.district = m[1];
      if (o.material) o.material = new THREE.MeshBasicMaterial({ visible: false });
      world.triggers[m[1]] = o;
    }
    const d = /^district_(\w+)$/.exec(o.name);
    if (d && world.districts[d[1]]) {
      const g = world.districts[d[1]].group;
      g.children.forEach((c) => {
        if (c !== world.districts[d[1]].trigger && c !== world.districts[d[1]].ring) c.visible = false;
      });
    }
  });
  scene.add(gltfScene);
  raycast.setTargets(Object.values(world.triggers));
  requestShadowUpdate();
}

// --- UI -----------------------------------------------------------------------------
const modals = new ModalManager(root, { reducedMotion });
const tooltip = $('[data-jgd-tooltip]');
const hint = $('[data-jgd-hint]');
const navButtons = [...root.querySelectorAll('[data-jgd-zone]')];
let currentZone = null;
let busy = false;

function setActiveNav(id) {
  navButtons.forEach((b) => b.classList.toggle('is-active', b.dataset.jgdZone === id));
}

function hoverDistrict(id, on) {
  const h = world.highlighters[id];
  const d = world.districts[id];
  if (!h || !d) return;
  gsap.to(h.state, { v: on ? 1 : 0, duration: 0.35, onUpdate: h.apply, overwrite: true });
  gsap.to(d.ring.material, { opacity: on ? 0.85 : 0, duration: 0.35, overwrite: true });
  d.onHover?.(on);
}

let hovered = null;
const raycast = new RaycastManager({
  camera,
  dom: renderer.domElement,
  isBlocked: () => modals.isOpen || busy,
  onHover(id, client) {
    if (id !== hovered) {
      if (hovered) hoverDistrict(hovered, false);
      if (id) hoverDistrict(id, true);
      hovered = id;
    }
    if (id) {
      const r = root.getBoundingClientRect();
      tooltip.textContent = DISTRICTS[id].label;
      tooltip.style.transform = `translate(${client.x - r.left + 16}px, ${client.y - r.top + 16}px)`;
      tooltip.classList.add('is-visible');
    } else tooltip.classList.remove('is-visible');
  },
  onClick(id) {
    activate(id);
  },
});

async function activate(id) {
  const d = DISTRICTS[id];
  if (!d || busy) return;
  busy = true;
  currentZone = id;
  tooltip.classList.remove('is-visible');
  hint.classList.add('is-hidden');
  setActiveNav(id);
  notifyParent('jgd:district', { id });
  if (modals.isOpen) modals.close({ silent: true });

  if (id === 'stadium') world.fireworks.launch(isMobile ? 5 : 8);
  await cameraManager.focusDistrict(d);

  if (id === 'vault') {
    const v = world.districts.vault;
    await v.openDoor(requestShadowUpdate);
    modals.open('vault', { onClose: () => v.closeDoor(requestShadowUpdate) });
  } else {
    modals.open(d.modal);
  }
  busy = false;
}

async function overview() {
  if (busy) return;
  if (modals.isOpen) modals.close();
  currentZone = null;
  setActiveNav(null);
  busy = true;
  await cameraManager.flyTo(OVERVIEW.position, OVERVIEW.target, { duration: 2 });
  busy = false;
}

navButtons.forEach((b) => b.addEventListener('click', () => activate(b.dataset.jgdZone)));
$('[data-jgd-overview]').addEventListener('click', overview);

// Parent-page bridge (Webflow iframe): window.postMessage({type:'jgd:zone', zone:'dodi'}, '*')
window.addEventListener('message', (e) => {
  const msg = e.data;
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'jgd:zone' && DISTRICTS[msg.zone]) activate(msg.zone);
  if (msg.type === 'jgd:overview') overview();
});
function notifyParent(type, payload) {
  if (window.parent !== window) window.parent.postMessage({ type, ...payload }, '*');
}

// --- Resize / visibility ----------------------------------------------------------------
function resize() {
  const w = root.clientWidth || window.innerWidth;
  const h = root.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  cameraManager.resize(w, h);
}
new ResizeObserver(resize).observe(root);
resize();

let inView = true;
new IntersectionObserver(([entry]) => {
  inView = entry.isIntersecting;
}).observe(root);

// --- Loop ---------------------------------------------------------------------------------
const clock = new THREE.Clock();
let elapsed = 0;
let frameTimes = [];
let lastFireworks = 0;

function tick() {
  requestAnimationFrame(tick);
  if (!inView || document.hidden) {
    clock.getDelta();
    return;
  }
  const dt = Math.min(clock.getDelta(), 1 / 20);
  elapsed += dt;
  const t = elapsed;

  cameraManager.update();
  raycast.update();

  world.env.update(t, dt);
  world.waterfallMat.uniforms.uTime.value = t;
  for (const d of Object.values(world.districts)) d.update?.(t, dt);
  world.blimp.update(t, dt);
  world.fireworks.update(t, dt);
  for (const c of world.coins) c.update(t);

  // occasional celebration over the stadium while idle on the overview
  if (!reducedMotion && !modals.isOpen && t - lastFireworks > 14) {
    lastFireworks = t;
    world.fireworks.launch(3);
  }

  renderer.render(scene, camera);
  adaptQuality(dt);
}

// Drop pixel ratio if the device can't hold ~45fps; never below 1.
function adaptQuality(dt) {
  frameTimes.push(dt);
  if (frameTimes.length < 120) return;
  const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
  frameTimes = [];
  if (avg > 1 / 45 && pixelRatio > 1) {
    pixelRatio = Math.max(1, pixelRatio - 0.25);
    renderer.setPixelRatio(pixelRatio);
    resize();
  }
}

// --- Boot ------------------------------------------------------------------------------------
async function boot() {
  preloader.set(0.05);
  await loadFonts();
  preloader.set(0.3);
  let done = 0;
  const logos = await loadLogos(() => preloader.set(0.3 + (++done / 3) * 0.4));
  preloader.set(0.75);
  await new Promise((r) => requestAnimationFrame(r));
  buildWorld(logos);
  raycast.setTargets(Object.values(world.triggers));
  preloader.set(0.9);
  // compile shaders before revealing so the first frames don't hitch
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  preloader.set(1);
  tick();
  await preloader.hide();

  const params = new URLSearchParams(window.location.search);
  const zone = params.get('zone');
  const camOnly = DISTRICTS[params.get('cam')]; // ?cam=<id>: frame a district without opening its modal
  if (camOnly) await cameraManager.focusDistrict(camOnly, { duration: 0.01 });
  else await cameraManager.flyTo(OVERVIEW.position, OVERVIEW.target, { duration: 3.2, ease: 'power2.inOut' });
  if (!reducedMotion) world.fireworks.launch(isMobile ? 4 : 7);
  if (zone && DISTRICTS[zone]) activate(zone);
  setTimeout(() => hint.classList.add('is-hidden'), 7000);

  loadMasterScene();
}

boot().catch((err) => {
  console.error(err);
  preloader.pct.textContent = 'Unable to start 3D. Please try a different browser.';
});

