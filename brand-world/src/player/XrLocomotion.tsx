import { useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXRInputSourceState } from '@react-three/xr';
import { Vector3, type Group } from 'three';
import { interactWithNearby } from '../interactions/nearbyAction.ts';
import { useWorld } from '../store/world.ts';
import { useActiveScene } from '../world/SceneContext.ts';
import { player } from './playerState.ts';

const SPEED = 2; // m/s; slower than flat mode to limit motion sickness
const SNAP_TURN = Math.PI / 6; // 30 degrees
const DEADZONE = 0.2;
const head = new Vector3();
const forward = new Vector3();
const right = new Vector3();
const step = new Vector3();
const UP = new Vector3(0, 1, 0);

// Quest controllers in walk-in mode: left stick walks (kept on the navmesh),
// right stick snap-turns, A or X uses the nearby object. Moves the XR origin
// directly every frame; never through React state.
export function XrLocomotion({ origin }: { origin: RefObject<Group | null> }) {
  const { nav } = useActiveScene();
  const camera = useThree((s) => s.camera);
  const left = useXRInputSourceState('controller', 'left');
  const rightHand = useXRInputSourceState('controller', 'right');
  const turnLatched = useRef(false);
  const buttonHeld = useRef(false);

  useFrame((_, dt) => {
    const o = origin.current;
    if (!o || !nav || useWorld.getState().xrMode !== 'walkin') return;
    dt = Math.min(dt, 0.1);
    camera.getWorldPosition(head);

    const stick = left?.gamepad['xr-standard-thumbstick'];
    const x = stick?.xAxis ?? 0;
    const y = stick?.yAxis ?? 0;
    if (Math.hypot(x, y) > DEADZONE) {
      camera.getWorldDirection(forward).setY(0).normalize();
      right.crossVectors(forward, UP).normalize();
      step.copy(forward).multiplyScalar(-y).addScaledVector(right, x).multiplyScalar(SPEED * dt);
      // Move the head's floor point and let the navmesh decide where it lands.
      const target = nav.closest(step.add(head).setY(player.position.y));
      if (target) {
        o.position.x += target.x - head.x;
        o.position.z += target.z - head.z;
        o.position.y = target.y;
      }
    }

    const turn = rightHand?.gamepad['xr-standard-thumbstick']?.xAxis ?? 0;
    if (!turnLatched.current && Math.abs(turn) > 0.6) {
      turnLatched.current = true;
      // Rotate the origin about the head so the view turns in place.
      const angle = -Math.sign(turn) * SNAP_TURN;
      o.position.sub(head).applyAxisAngle(UP, angle).add(head);
      o.rotation.y += angle;
    } else if (Math.abs(turn) < 0.3) {
      turnLatched.current = false;
    }

    // The player stands where the head is, for zones and proximity.
    camera.getWorldPosition(head);
    const feet = nav.closest(head.setY(o.position.y));
    if (feet) player.position.copy(feet);

    const pressed = ['a-button', 'x-button'].some((id) =>
      [rightHand, left].some((c) => c?.gamepad[id]?.state === 'pressed'),
    );
    if (pressed && !buttonHeld.current) interactWithNearby();
    buttonHeld.current = pressed;
  });
  return null;
}
