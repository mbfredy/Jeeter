import * as THREE from 'three';
import gsap from 'gsap';

const FOV = 24;
const MAX_ZOOM = 2.4;
const TILT_YAW = THREE.MathUtils.degToRad(4.5);
const TILT_PITCH = THREE.MathUtils.degToRad(3);
const COVER_MARGIN = 0.93; // keep frame edges hidden while tilting

/**
 * Diorama camera over a single photo plane.
 *  - always covers the viewport (no letterboxing), pans within the image
 *  - pointer position tilts the camera a few degrees (isometric parallax)
 *  - drag pans, wheel / pinch zooms, idle breathing drift
 *  - focus(): GSAP move that centres + zooms onto an image point
 */
export class CameraRig {
  constructor(dom, { reducedMotion = false } = {}) {
    this.dom = dom;
    this.reducedMotion = reducedMotion;
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
    this.scene = null; // SceneView
    this.state = { x: 0, y: 0, zoom: 1, yaw: 0, pitch: 0 };
    this.goal = { x: 0, y: 0, zoom: 1 };
    this.tilt = { x: 0, y: 0 };
    this.aspect = 1;
    this.locked = false;
    this.pointers = new Map();
    this.pinch = null;
    this.dragMoved = 0;
    this.lastInteract = 0;
    this._bind();
  }

  setScene(scene, { zoom = 1, center = null } = {}) {
    this.scene = scene;
    this.home = center;
    this.goal.zoom = this.state.zoom = zoom;
    const c = center ? this._imageToPan(center[0], center[1]) : { x: 0, y: 0 };
    const cl = this._clamp(c.x, c.y, zoom);
    this.goal.x = this.state.x = cl.x;
    this.goal.y = this.state.y = cl.y;
  }

  resize(w, h) {
    this.aspect = w / Math.max(1, h);
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
  }

  // visible area of the plane at a given zoom (world units)
  _visible(zoom) {
    const s = this.scene;
    const coverH = Math.min(s.height, s.width / this.aspect) * COVER_MARGIN;
    const h = coverH / zoom;
    return { w: h * this.aspect, h };
  }

  _clamp(x, y, zoom) {
    const s = this.scene;
    const v = this._visible(zoom);
    const mx = Math.max(0, (s.width - v.w) / 2);
    const my = Math.max(0, (s.height - v.h) / 2);
    return { x: THREE.MathUtils.clamp(x, -mx, mx), y: THREE.MathUtils.clamp(y, -my, my) };
  }

  _imageToPan(u, v) {
    return { x: (u - 0.5) * this.scene.width, y: (0.5 - v) * this.scene.height };
  }

  /** Smoothly centre an image point and zoom in. */
  focus(u, v, zoom = 1.6, duration = 1.2) {
    const p = this._imageToPan(u, v);
    const c = this._clamp(p.x, p.y, zoom);
    gsap.killTweensOf(this.goal);
    return new Promise((resolve) => {
      gsap.to(this.goal, { x: c.x, y: c.y, zoom, duration: this.reducedMotion ? 0.01 : duration, ease: 'power3.inOut', onComplete: resolve });
    });
  }

  /** Resting view: zoom 1, centred on the scene's main attraction (matters on portrait). */
  reset(duration = 1.1) {
    const [u, v] = this.home || [0.5, 0.5];
    return this.focus(u, v, 1, duration);
  }

  update(t, dt) {
    if (!this.scene) return;
    const k = 1 - Math.pow(0.0015, dt); // frame-rate independent damping
    const c = this._clamp(this.goal.x, this.goal.y, this.goal.zoom);
    this.goal.x = c.x;
    this.goal.y = c.y;
    const s = this.state;
    s.x += (this.goal.x - s.x) * k;
    s.y += (this.goal.y - s.y) * k;
    s.zoom += (this.goal.zoom - s.zoom) * k;
    const idle = this.reducedMotion ? 0 : 1;
    const drift = Math.min(1, (performance.now() / 1000 - this.lastInteract) / 4) * idle;
    const ty = this.tilt.x * TILT_YAW + Math.sin(t * 0.13) * 0.4 * TILT_YAW * drift;
    const tp = this.tilt.y * TILT_PITCH + Math.sin(t * 0.09 + 1) * 0.35 * TILT_PITCH * drift;
    s.yaw += (ty - s.yaw) * k * 0.6;
    s.pitch += (tp - s.pitch) * k * 0.6;

    const v = this._visible(s.zoom);
    const dist = v.h / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    // look at a point slightly in front of the plane so parallax pivots on the mid-ground
    const pivotZ = 0.9;
    const target = new THREE.Vector3(s.x, s.y, pivotZ);
    const offset = new THREE.Vector3(0, 0, dist).applyEuler(new THREE.Euler(-s.pitch, s.yaw, 0, 'YXZ'));
    this.camera.position.copy(target).add(offset);
    this.camera.lookAt(target);
  }

  // --- input -----------------------------------------------------------------
  _bind() {
    const el = this.dom;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      if (e.pointerType === 'mouse') {
        this.tilt.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
        this.tilt.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      }
      if (!this.pointers.has(e.pointerId) || this.locked) return;
      const prev = this.pointers.get(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.lastInteract = performance.now() / 1000;
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (this.pinch) this.goal.zoom = THREE.MathUtils.clamp(this.goal.zoom * (d / this.pinch), 1, MAX_ZOOM);
        this.pinch = d;
        this.dragMoved += 10;
        return;
      }
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      this.dragMoved += Math.abs(dx) + Math.abs(dy);
      const v = this._visible(this.state.zoom);
      this.goal.x -= (dx / r.width) * v.w;
      this.goal.y += (dy / r.height) * v.h;
    });
    el.addEventListener('pointerdown', (e) => {
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 1) this.dragMoved = 0;
      this.pinch = null;
      el.setPointerCapture?.(e.pointerId);
    });
    const up = (e) => {
      this.pointers.delete(e.pointerId);
      this.pinch = null;
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse') this.tilt.x = this.tilt.y = 0;
    });
    el.addEventListener(
      'wheel',
      (e) => {
        if (this.locked) return;
        e.preventDefault();
        this.lastInteract = performance.now() / 1000;
        const z = THREE.MathUtils.clamp(this.goal.zoom * Math.exp(-e.deltaY * 0.0015), 1, MAX_ZOOM);
        // zoom toward the cursor
        const r = el.getBoundingClientRect();
        const v0 = this._visible(this.goal.zoom);
        const v1 = this._visible(z);
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        this.goal.x += nx * (v0.w - v1.w);
        this.goal.y -= ny * (v0.h - v1.h);
        this.goal.zoom = z;
      },
      { passive: false },
    );
  }
}
