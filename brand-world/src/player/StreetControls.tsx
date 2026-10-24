import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Raycaster, Vector2 } from 'three';
import { triggerNode } from '../interactions/trigger.ts';
import { useWorld } from '../store/world.ts';
import { useActiveScene } from '../world/SceneContext.ts';
import { look } from './lookState.ts';

const MOUSE_SPEED = 0.0025; // rad per px
const TOUCH_SPEED = 0.005;
const PITCH_LIMIT = 1.3;
const REACH = 8; // m: crosshair clicks only use things this close
const ray = new Raycaster();
const center = new Vector2(0, 0);

function turn(dx: number, dy: number, speed: number) {
  look.yaw -= dx * speed;
  look.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, look.pitch - dy * speed));
}

// Desktop: click to capture the mouse (pointer lock) and look around; while
// captured, clicking uses whatever the crosshair is on. Esc frees the mouse.
// Touch (and mice without pointer lock): drag on the scene to look.
export function StreetControls() {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const { root, contract } = useActiveScene();
  const panel = useWorld((s) => s.panel);

  // Panels need a free mouse to click Close.
  useEffect(() => {
    if (panel && document.pointerLockElement) document.exitPointerLock();
  }, [panel]);

  useEffect(() => {
    const el = gl.domElement;
    let drag: { id: number; x: number; y: number } | null = null;

    const onDown = (e: PointerEvent) => {
      if (document.pointerLockElement === el) {
        ray.setFromCamera(center, camera);
        const hit = ray.intersectObject(root, true).find((h) => h.distance <= REACH);
        for (let o = hit?.object ?? null; o; o = o.parent) {
          const node = contract.interactive.get(o.uuid);
          if (node) return triggerNode(node.node, contract);
        }
        return;
      }
      if (e.pointerType === 'mouse' && useWorld.getState().device === 'desktop' && el.requestPointerLock) {
        // Some browsers return a promise that rejects (e.g. right after Esc).
        (el.requestPointerLock() as unknown as Promise<void> | undefined)?.catch?.(() => {});
        return;
      }
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    };
    const onMove = (e: PointerEvent) => {
      if (document.pointerLockElement === el) return turn(e.movementX, e.movementY, MOUSE_SPEED);
      if (!drag || e.pointerId !== drag.id) return;
      turn(e.clientX - drag.x, e.clientY - drag.y, e.pointerType === 'mouse' ? MOUSE_SPEED : TOUCH_SPEED);
      drag.x = e.clientX;
      drag.y = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      if (drag?.id === e.pointerId) drag = null;
    };
    const onLock = () => useWorld.getState().set({ pointerLocked: document.pointerLockElement === el });

    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    document.addEventListener('pointerlockchange', onLock);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      document.removeEventListener('pointerlockchange', onLock);
      if (document.pointerLockElement === el) document.exitPointerLock();
      useWorld.getState().set({ pointerLocked: false });
    };
  }, [gl, camera, root, contract]);

  return null;
}
