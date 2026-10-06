import * as THREE from 'three';
import gsap from 'gsap';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import './style.css';
import SCENES from './scenes.json';
import { ASSETS } from './config.js';
import { SceneView } from './SceneView.js';
import { CameraRig } from './CameraRig.js';
import { ModalManager } from './ModalManager.js';
import { Fireworks, Smoke, Beams, Gulls } from './effects/particles.js';
import { Blimp } from './effects/Blimp.js';

const root = document.getElementById('jgd-app');
const $ = (s) => root.querySelector(s);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = window.matchMedia('(pointer: coarse)').matches;
const params = new URLSearchParams(window.location.search);
const BASE = import.meta.env.BASE_URL;

// --- Renderer ------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.75 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; // only affects lit meshes (blimp)
$('[data-jgd-canvas]').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#120c2c');
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.7;
pmrem.dispose();
scene.add(new THREE.HemisphereLight('#dfe9ff', '#c49a6c', 1.1));
const sun = new THREE.DirectionalLight('#ffd6a0', 2.6);
sun.position.set(-6, 5, 8);
scene.add(sun);

const rig = new CameraRig(renderer.domElement, { reducedMotion });
const modals = new ModalManager(root, { reducedMotion });

// --- Scenes ------------------------------------------------------------------------
const views = {};
for (const id of SCENES.order) views[id] = new SceneView(id, SCENES.scenes[id], renderer);
let current = null;
let busy = false;

// --- Shared effects ------------------------------------------------------------------
const fx = {
  fireworks: new Fireworks(coarse ? 2000 : 4000),
  blimp: null,
  smoke: null,
  beams: null,
  gulls: null,
  scale: 300,
};
scene.add(fx.fireworks.object);
fx.fireworks.onBurst = () => {
  if (!current) return;
  const u = current.uniforms.uFlash;
  gsap.fromTo(u, { value: Math.min(0.5, u.value + 0.3) }, { value: 0, duration: 1.2, ease: 'power2.out' });
};

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Per-scene effect rigs, rebuilt when a scene becomes active.
function mountSceneFx(view) {
  for (const k of ['smoke', 'beams', 'gulls']) {
    if (fx[k]) {
      scene.remove(fx[k].object);
      fx[k] = null;
    }
  }
  const def = view.def;
  const W = view.width;
  if (def.smoke?.length) {
    fx.smoke = new Smoke(
      def.smoke.map(([u, v, strength]) => ({
        p: view.toWorld(u, v, 0.05),
        strength,
        scale: W * 0.012,
        wind: new THREE.Vector3(W * 0.028, -W * 0.002, 0),
      })),
      coarse ? 90 : 160,
    );
    fx.smoke.pool.setScale(fx.scale);
    // pre-warm so plumes are already established when the district appears
    for (let i = 0; i < 140; i++) fx.smoke.update(i / 20, 1 / 20);
    scene.add(fx.smoke.object);
  }
  if (def.beams?.length) {
    fx.beams = new Beams(def.beams.map(([u, v]) => view.toWorld(u, v, 0.1)), view.height * 0.9);
    scene.add(fx.beams.object);
  }
  fx.gulls = new Gulls({ x0: -W * 0.5, x1: W * 0.5, y0: view.height * 0.2, y1: view.height * 0.42, z: 0.6 }, 4);
  scene.add(fx.gulls.object);
  const b = def.blimp;
  if (fx.blimp && b) {
    const top = view.toWorld((b.x0 + b.x1) / 2, b.y, 0);
    fx.blimp.setPath({ cx: top.x, cy: top.y, rx: ((b.x1 - b.x0) / 2) * W, rz: 0.9, z: 1.4, length: b.scale * W });
    fx.blimp.object.visible = true;
  } else if (fx.blimp) fx.blimp.object.visible = false;
}

function stadiumVolley(n = 6) {
  if (!current) return;
  const area = current.def.fireworks;
  if (!area) return;
  for (let i = 0; i < n; i++) {
    setTimeout(() => {
      if (!current?.def.fireworks) return;
      const u = THREE.MathUtils.lerp(area[0], area[2], Math.random());
      const v = THREE.MathUtils.lerp(area[1], area[3], Math.random());
      const to = current.toWorld(u, v, 1.2);
      const from = current.toWorld(THREE.MathUtils.clamp(u + (Math.random() - 0.5) * 0.06, 0, 1), Math.min(1, v + 0.35), 1.2);
      fx.fireworks.rocket(from, to, current.width / 16);
    }, i * (reducedMotion ? 60 : 280));
  }
}

// --- Markers (DOM) ----------------------------------------------------------------
const markerLayer = $('[data-jgd-markers]');
let markers = [];
const logoFor = (brand) => BASE + (ASSETS.logos[brand] || ASSETS.logos.jeeter);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function buildMarkers(view) {
  markerLayer.innerHTML = '';
  markers = view.def.hotspots.filter((h) => h.marker !== false).map((h) => {
    const portal = h.action.startsWith('goto');
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `jgd-marker${h.primary ? ' is-primary' : ''}${portal ? ' is-portal' : ''}`;
    el.setAttribute('aria-label', h.label);
    const [title, sub] = h.label.split(' · ');
    el.innerHTML = `<span class="jgd-marker__dot"></span><span class="jgd-marker__label"><img alt="" src="${esc(logoFor(h.brand))}" class="is-${h.brand}"><span class="jgd-marker__text"><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span>${portal ? '<i aria-hidden="true">→</i>' : ''}</span>`;
    el.querySelector('img').addEventListener('error', (e) => e.target.remove(), { once: true });
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      runAction(h);
    });
    el.addEventListener('pointerenter', () => setHover(h));
    el.addEventListener('pointerleave', () => setHover(null));
    markerLayer.appendChild(el);
    const at = h.m || h.c;
    return { h, el, world: view.toWorld(at[0], at[1], 0.02) };
  });
}

const tmpV = new THREE.Vector3();
function placeMarkers() {
  const w = root.clientWidth;
  const h = root.clientHeight;
  for (const m of markers) {
    tmpV.copy(m.world).project(rig.camera);
    const x = (tmpV.x * 0.5 + 0.5) * w;
    const y = (-tmpV.y * 0.5 + 0.5) * h;
    const off = x < 8 || x > w - 8 || y < 60 || y > h - 70;
    m.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    m.el.classList.toggle('is-off', off);
    m.el.classList.toggle('is-left', w < 640 ? x > w / 2 : x > w - 230);
  }
}

// --- Hover / click on the photo plane -------------------------------------------------
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let hovered = null;

function setHover(h) {
  if (h === hovered || !current) return;
  hovered = h;
  const u = current.uniforms;
  if (h) {
    u.uHover.value.set(h.c[0], h.c[1], h.r[0], h.r[1]);
    gsap.to(u.uHoverAmt, { value: 1, duration: 0.35, overwrite: true });
    if (h.fx === 'rings' || h.fx === 'neon' || current.id === 'dodi') gsap.to(u.uNeon, { value: 1.4, duration: 0.4, overwrite: true });
    if (h.fx === 'door') gsap.to(u.uDoor.value, { z: 0.35, duration: 0.4, overwrite: true });
  } else {
    gsap.to(u.uHoverAmt, { value: 0, duration: 0.35, overwrite: true });
    if (!modals.isOpen && !busy) {
      gsap.to(u.uNeon, { value: 0, duration: 0.6, overwrite: true });
      gsap.to(u.uDoor.value, { z: 0, duration: 0.6, overwrite: true });
    }
  }
  renderer.domElement.style.cursor = h ? 'pointer' : '';
  markers.forEach((m) => m.el.classList.toggle('is-hover', m.h === h));
}

function pick(e) {
  if (!current?.mesh) return null;
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ndc, rig.camera);
  const hit = raycaster.intersectObject(current.pickMesh, false)[0];
  if (!hit) return null;
  return current.hotspotAt(hit.uv.x, 1 - hit.uv.y);
}

renderer.domElement.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || busy || modals.isOpen || rig.pointers.size) return;
  setHover(pick(e));
});
let downAt = 0;
renderer.domElement.addEventListener('pointerdown', () => {
  downAt = performance.now();
});
renderer.domElement.addEventListener('pointerup', (e) => {
  if (busy || modals.isOpen) return;
  if (rig.dragMoved > 8 || performance.now() - downAt > 500) return;
  const h = pick(e);
  if (h) runAction(h);
});

// --- Actions ---------------------------------------------------------------------------
async function runAction(h) {
  if (busy || !current) return;
  const [verb, target] = h.action.split(':');
  if (verb === 'goto') return goTo(target, h);
  busy = true;
  hideHint();
  notifyParent('jgd:district', { id: target });
  const view = current;
  const u = view.uniforms;
  rig.locked = true;
  markerLayer.classList.add('is-hidden');
  switch (target) {
    case 'stadium':
      if (fx.beams) gsap.to(fx.beams, { boost: 1, duration: 0.6, yoyo: true, repeat: 1, repeatDelay: 2 });
      stadiumVolley(10);
      await rig.focus(h.c[0], h.c[1] - 0.05, 1.15, 1.2);
      await wait(900);
      modals.open('video', { onClose: afterModal });
      break;
    case 'vault':
      await rig.focus(view.def.door[0], view.def.door[1], 2.1, 1.3);
      gsap.to(u.uDoor.value, { z: 1.2, duration: 1.1, ease: 'power2.out' });
      fx.fireworks.sparkle(view.toWorld(view.def.door[0], view.def.door[1], 0.3), view.width / 16);
      await wait(1300);
      modals.open('vault', {
        onClose: () => {
          gsap.to(u.uDoor.value, { z: 0, duration: 0.8 });
          afterModal();
        },
      });
      break;
    default:
      gsap.to(u.uNeon, { value: 1.6, duration: 0.5 });
      await rig.focus(h.c[0], h.c[1], 1.7, 1.2);
      modals.open(target, {
        onClose: () => {
          gsap.to(u.uNeon, { value: 0, duration: 0.8 });
          afterModal();
        },
      });
  }
  busy = false;
}

function afterModal() {
  rig.locked = false;
  markerLayer.classList.remove('is-hidden');
  rig.reset(1.2);
}

const transition = $('[data-jgd-transition]');
const transitionLogo = $('[data-jgd-transition-logo]');

async function goTo(id, fromHotspot = null, { instant = false } = {}) {
  const next = views[id];
  if (!next || next === current || (busy && !instant)) return;
  busy = true;
  setHover(null);
  hideHint();
  if (modals.isOpen) modals.close({ silent: true });
  setActiveNav(id);
  notifyParent('jgd:scene', { id });
  transitionLogo.src = logoFor(next.def.brand);
  transitionLogo.onerror = () => {
    transitionLogo.onerror = null;
    transitionLogo.src = BASE + ASSETS.logos.jeeter;
  };
  const loading = next.load(BASE);
  if (current && !instant) {
    rig.locked = true;
    markerLayer.classList.add('is-hidden');
    if (fromHotspot) rig.focus(fromHotspot.c[0], fromHotspot.c[1], 2.2, 1.0);
    await wait(reducedMotion ? 0 : 450);
    await new Promise((r) => gsap.to(transition, { opacity: 1, duration: reducedMotion ? 0.01 : 0.45, ease: 'power2.in', onComplete: r }));
  }
  await loading;
  if (current) current.group.visible = false;
  current = next;
  if (!current.group.parent) scene.add(current.group);
  current.group.visible = true;
  const primary = next.def.hotspots.find((x) => x.primary) || next.def.hotspots[0];
  rig.setScene(next, { zoom: instant ? 1 : 1.45, center: primary.c });
  mountSceneFx(next);
  buildMarkers(next);
  markerLayer.classList.remove('is-hidden');
  $('[data-jgd-title]').textContent = next.def.title;
  rig.locked = false;
  rig.reset(reducedMotion ? 0.01 : 1.8);
  gsap.to(transition, { opacity: 0, duration: reducedMotion ? 0.01 : 0.7, delay: 0.1, ease: 'power2.out' });
  if (next.def.fireworks && !reducedMotion) setTimeout(() => stadiumVolley(4), 900);
  busy = false;
  // warm the cache for the other districts
  idle(() => Object.values(views).forEach((v) => v.load(BASE).catch(() => {})));
}

// --- HUD ---------------------------------------------------------------------------------
const navButtons = [...root.querySelectorAll('[data-jgd-zone]')];
navButtons.forEach((b) => b.addEventListener('click', () => goTo(b.dataset.jgdZone)));
function setActiveNav(id) {
  navButtons.forEach((b) => b.classList.toggle('is-active', b.dataset.jgdZone === id));
}
const mapBtn = $('[data-jgd-map]');
mapBtn.addEventListener('click', () => goTo('map'));
const hint = $('[data-jgd-hint]');
function hideHint() {
  hint.classList.add('is-hidden');
}

window.addEventListener('message', (e) => {
  const m = e.data;
  if (!m || typeof m !== 'object') return;
  if (m.type === 'jgd:zone' && views[m.zone]) goTo(m.zone);
});
function notifyParent(type, payload) {
  if (window.parent !== window) window.parent.postMessage({ type, ...payload }, '*');
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const idle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 2500 }) : setTimeout(fn, 1200));

// --- Resize / visibility ----------------------------------------------------------------
function resize() {
  const w = root.clientWidth || window.innerWidth;
  const h = root.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  rig.resize(w, h);
  fx.scale = (h * renderer.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(rig.camera.fov / 2)));
  fx.fireworks.pool.setScale(fx.scale);
  fx.smoke?.pool.setScale(fx.scale);
}
new ResizeObserver(resize).observe(root);
let inView = true;
new IntersectionObserver(([e]) => (inView = e.isIntersecting)).observe(root);

// --- Loop -------------------------------------------------------------------------------------
const clock = new THREE.Clock();
let t = 0;
let nextVolley = 6;
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 1 / 20);
  if (!inView || document.hidden || !current) return;
  t += dt;
  rig.update(t, dt);
  current.update(t);
  fx.fireworks.update(t, dt);
  fx.smoke?.update(t, dt);
  fx.beams?.update(t);
  fx.gulls?.update(t, dt);
  fx.blimp?.update(t, dt, rig.camera);
  if (current.def.fireworks && !modals.isOpen && !reducedMotion && t > nextVolley) {
    nextVolley = t + 3.5 + Math.random() * 3;
    stadiumVolley(current.id === 'stadium' ? 3 : 2);
  }
  placeMarkers();
  renderer.render(scene, rig.camera);
}

// --- Boot -------------------------------------------------------------------------------------
const pre = {
  el: $('[data-jgd-preloader]'),
  bar: $('[data-jgd-progress]'),
  pct: $('[data-jgd-pct]'),
  set(v) {
    this.bar.style.width = `${Math.round(v * 100)}%`;
    this.pct.textContent = `${Math.round(v * 100)}%`;
  },
};

async function boot() {
  pre.set(0.08);
  const [logo] = await Promise.all([
    loadImage(BASE + ASSETS.logos.jeeter),
    document.fonts?.load ? Promise.race([document.fonts.load("64px 'Anton'"), wait(2500)]).catch(() => {}) : null,
  ]);
  fx.blimp = new Blimp(logo);
  scene.add(fx.blimp.object);
  pre.set(0.25);

  // The full map is optional: it becomes the hub once public/scenes/map.webp exists.
  let hub = 'stadium';
  try {
    await views.map.load(BASE);
    hub = 'map';
    mapBtn.hidden = false;
  } catch {
    delete views.map;
  }
  pre.set(0.6);
  const start = views[params.get('zone')] ? params.get('zone') : hub;
  await views[start].load(BASE);
  pre.set(0.95);
  resize();
  await goTo(start, null, { instant: true });
  renderer.compile(scene, rig.camera);
  pre.set(1);
  tick();
  gsap.to(pre.el, { opacity: 0, duration: 0.8, delay: 0.2, onComplete: () => pre.el.remove() });
  const primary = current.def.hotspots.find((x) => x.primary) || current.def.hotspots[0];
  rig.setScene(current, { zoom: 1.35, center: primary.c });
  rig.reset(reducedMotion ? 0.01 : 2.6);
  setTimeout(hideHint, 9000);
}

if (params.has('debug')) window.__jgd = { fx, rig, views, get current() { return current; }, stadiumVolley, runAction, goTo };

boot().catch((err) => {
  console.error(err);
  pre.pct.textContent = 'Unable to start. Please try another browser.';
});
