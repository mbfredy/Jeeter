import type { ThreeEvent } from '@react-three/fiber';
import { Raycaster, type Vector3 } from 'three';
import { LOGIC_LAYER } from '../contract/prefixes/hidden.ts';
import { triggerNode } from '../interactions/trigger.ts';
import { player } from '../player/playerState.ts';
import { useWorld } from '../store/world.ts';
import { useActiveScene } from './SceneContext.ts';

const navRay = new Raycaster();
navRay.layers.set(LOGIC_LAYER);
const OFF_MESH_REACH = 60; // m: taps beyond the walkable area go to its nearest edge

// Renders the GLB and routes taps: contract objects trigger their action,
// anything else is a walk target on the navmesh.
export function SceneModel() {
  const { root, contract, nav } = useActiveScene();
  const groundY = contract.spawn?.position.y ?? 0;
  const flat = useWorld((s) => s.xrMode === 'none');

  function walkTo(e: ThreeEvent<MouseEvent>) {
    if (!nav || useWorld.getState().xrMode !== 'none') return;
    navRay.set(e.ray.origin, e.ray.direction);
    const ground = navRay.intersectObjects(contract.navMeshes, false)[0];
    const point: Vector3 = ground ? ground.point : e.point;
    const goal = nav.closest(point, ground ? undefined : OFF_MESH_REACH);
    if (goal) player.path = nav.path(player.position, goal);
  }

  function onClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    // A drag (street-view look) is not a tap; captured-mouse clicks are
    // handled by the crosshair in StreetControls.
    if (e.delta > 6 || document.pointerLockElement) return;
    for (let o: typeof e.object | null = e.object; o; o = o.parent) {
      const hit = contract.interactive.get(o.uuid);
      if (hit) return triggerNode(hit.node, contract);
    }
    walkTo(e);
  }

  return (
    <>
      <primitive object={root} onClick={onClick} />
      {/* Catches taps on empty space so they still walk toward the nearest edge. */}
      {flat && (
        <mesh visible={false} rotation-x={-Math.PI / 2} position-y={groundY - 0.05} onClick={(e) => (e.stopPropagation(), e.delta <= 6 && !document.pointerLockElement && walkTo(e))}>
          <planeGeometry args={[1000, 1000]} />
        </mesh>
      )}
    </>
  );
}
