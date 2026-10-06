import * as THREE from 'three';
import gsap from 'gsap';

const DESKTOP_FOV = 45;
const PORTRAIT_FOV = 65;

/**
 * Owns the camera + OrbitControls relationship.
 * - GSAP drives a single progress value; position and lookAt target are
 *   interpolated together, with a gentle arc so long flights lift over the city.
 * - While a flight runs OrbitControls is paused so damping can't fight the tween.
 * - Field of view adapts to viewport shape (45° desktop → 65° portrait).
 */
export class CameraManager {
  constructor(camera, controls, { reducedMotion = false } = {}) {
    this.camera = camera;
    this.controls = controls;
    this.reducedMotion = reducedMotion;
    this.tween = null;
    this.flying = false;
    this.bounds = { minX: -170, maxX: 170, minZ: -170, maxZ: 120 };
  }

  get isFlying() {
    return this.flying;
  }

  flyTo(position, target, { duration = 2.2, ease = 'power3.inOut' } = {}) {
    const fromPos = this.camera.position.clone();
    const fromTarget = this.controls.target.clone();
    const toPos = new THREE.Vector3(...position);
    const toTarget = new THREE.Vector3(...target);
    const lift = Math.min(40, fromPos.distanceTo(toPos) * 0.18);
    const state = { p: 0 };
    const pos = new THREE.Vector3();
    const tgt = new THREE.Vector3();

    this.tween?.kill();
    this.flying = true;
    this.controls.enabled = false;

    return new Promise((resolve) => {
      this.tween = gsap.to(state, {
        p: 1,
        duration: this.reducedMotion ? 0.01 : duration,
        ease,
        onUpdate: () => {
          const k = state.p;
          pos.lerpVectors(fromPos, toPos, k);
          pos.y += Math.sin(Math.PI * k) * lift;
          tgt.lerpVectors(fromTarget, toTarget, k);
          this.camera.position.copy(pos);
          this.controls.target.copy(tgt);
          this.camera.lookAt(tgt);
        },
        onComplete: () => {
          this.flying = false;
          this.controls.enabled = true;
          this.controls.update();
          resolve();
        },
        onInterrupt: () => {
          this.flying = false;
          this.controls.enabled = true;
          resolve();
        },
      });
    });
  }

  focusDistrict(d, opts) {
    return this.flyTo(d.camera, d.focus, opts);
  }

  /** FOV from viewport shape; mobile portrait gets the wider lens. */
  resize(width, height) {
    const aspect = width / Math.max(1, height);
    const portrait = aspect < 1;
    // ease between the two lenses for in-between (tablet / square) shapes
    const t = portrait ? THREE.MathUtils.clamp((1 - aspect) / 0.45, 0, 1) : 0;
    this.camera.fov = THREE.MathUtils.lerp(DESKTOP_FOV, PORTRAIT_FOV, t);
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  update() {
    if (this.flying) return;
    this.controls.update();
    // keep panning inside the world
    const t = this.controls.target;
    const cx = THREE.MathUtils.clamp(t.x, this.bounds.minX, this.bounds.maxX);
    const cz = THREE.MathUtils.clamp(t.z, this.bounds.minZ, this.bounds.maxZ);
    const cy = THREE.MathUtils.clamp(t.y, 0, 30);
    if (cx !== t.x || cz !== t.z || cy !== t.y) {
      const dx = cx - t.x;
      const dy = cy - t.y;
      const dz = cz - t.z;
      t.set(cx, cy, cz);
      this.camera.position.x += dx;
      this.camera.position.y += dy;
      this.camera.position.z += dz;
    }
  }
}
