import * as THREE from 'three';

const TAP_MOVE_PX = 8;
const TAP_MS = 450;

/**
 * Pointer → district resolution.
 * Raycasts only against the invisible `trigger_*` volumes (a handful of
 * primitives), so hover tests stay cheap even with a dense scene.
 * Mouse: hover highlight + cursor + label, click to activate.
 * Touch/pen: tap-to-activate, drags are left to OrbitControls.
 */
export class RaycastManager {
  constructor({ camera, dom, onHover, onClick, isBlocked = () => false }) {
    this.camera = camera;
    this.dom = dom;
    this.onHover = onHover;
    this.onClick = onClick;
    this.isBlocked = isBlocked;
    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.targets = [];
    this.hovered = null;
    this.down = null;
    this.pendingMove = null;
    this.client = { x: 0, y: 0 };

    this._move = this._move.bind(this);
    this._down = this._down.bind(this);
    this._up = this._up.bind(this);
    this._leave = this._leave.bind(this);
    dom.addEventListener('pointermove', this._move);
    dom.addEventListener('pointerdown', this._down);
    dom.addEventListener('pointerup', this._up);
    dom.addEventListener('pointerleave', this._leave);
  }

  setTargets(meshes) {
    this.targets = meshes;
  }

  pick(clientX, clientY) {
    const r = this.dom.getBoundingClientRect();
    this.ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hit = this.raycaster.intersectObjects(this.targets, false)[0];
    return hit ? { id: hit.object.userData.district, point: hit.point } : null;
  }

  // Hover is resolved once per frame (from main loop) rather than per event.
  update() {
    if (!this.pendingMove) return;
    const e = this.pendingMove;
    this.pendingMove = null;
    if (this.isBlocked()) return this._setHover(null);
    const hit = this.pick(e.x, e.y);
    this._setHover(hit ? hit.id : null);
  }

  _setHover(id) {
    if (id === this.hovered) {
      if (id) this.onHover(id, this.client);
      return;
    }
    this.hovered = id;
    this.dom.style.cursor = id ? 'pointer' : '';
    this.onHover(id, this.client);
  }

  _move(e) {
    this.client = { x: e.clientX, y: e.clientY };
    if (e.pointerType !== 'mouse') return;
    if (this.down && e.buttons) return; // dragging the camera
    this.pendingMove = { x: e.clientX, y: e.clientY };
  }

  _down(e) {
    this.down = { x: e.clientX, y: e.clientY, t: performance.now() };
  }

  _up(e) {
    const d = this.down;
    this.down = null;
    if (!d || this.isBlocked()) return;
    const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y);
    if (moved > TAP_MOVE_PX || performance.now() - d.t > TAP_MS) return;
    const hit = this.pick(e.clientX, e.clientY);
    if (hit) {
      if (e.pointerType !== 'mouse') this._setHover(null);
      this.onClick(hit.id, hit.point);
    }
  }

  _leave() {
    this.pendingMove = null;
    this._setHover(null);
  }

  dispose() {
    this.dom.removeEventListener('pointermove', this._move);
    this.dom.removeEventListener('pointerdown', this._down);
    this.dom.removeEventListener('pointerup', this._up);
    this.dom.removeEventListener('pointerleave', this._leave);
  }
}
