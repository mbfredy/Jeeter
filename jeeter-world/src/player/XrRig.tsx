import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { TeleportTarget, XROrigin, useXR } from '@react-three/xr';
import { Mesh, MeshBasicMaterial, type Group, type Vector3 } from 'three';
import { bus } from '../events/bus.ts';
import { useWorld } from '../store/world.ts';
import { XrHud } from '../ui/xr/XrHud.tsx';
import { useActiveScene } from '../world/SceneContext.ts';
import { player } from './playerState.ts';
import { XrLocomotion } from './XrLocomotion.tsx';

const TABLE_POSITION: [number, number, number] = [0, 0.85, -1.1];
const invisible = new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });

// XR: tabletop model of the scene by default; walk-in (1:1, thumbstick and
// teleport) only for scenes flagged walkIn in district.json.
export function XrRig({ children }: { children: ReactNode }) {
  const session = useXR((s) => s.session);
  const { def, contract } = useActiveScene();
  const xrMode = useWorld((s) => s.xrMode);
  const set = useWorld((s) => s.set);
  const origin = useRef<Group>(null);

  useEffect(() => {
    if (!session) return;
    // XR drives its own camera; leave street view so flat mode resumes cleanly.
    set({ xrMode: 'tabletop', viewMode: 'overview' });
    bus.emit({ type: 'xr', state: 'enter' });
    return () => {
      set({ xrMode: 'none' });
      bus.emit({ type: 'xr', state: 'exit' });
    };
  }, [session, set]);

  useEffect(() => {
    if (xrMode === 'walkin' && !def.walkIn) set({ xrMode: 'tabletop' });
  }, [def, xrMode, set]);

  const walkin = xrMode === 'walkin';

  // Leaving walk-in: the play space goes back to the room origin. Entering
  // walk-in is handled inside XrLocomotion's frame loop, so the origin is
  // placed before any head-to-player sync can run.
  useEffect(() => {
    if (!walkin) origin.current?.position.set(0, 0, 0);
    origin.current?.rotation.set(0, 0, 0);
  }, [walkin, contract]);

  // Teleport needs hittable geometry; the navmesh source is hidden, so use
  // invisible clones on the default layer.
  const teleportMeshes = useMemo(
    () => contract.navMeshes.map((m) => {
      const c = new Mesh(m.geometry, invisible);
      m.updateWorldMatrix(true, false);
      c.matrixAutoUpdate = false;
      c.matrix.copy(m.matrixWorld);
      return c;
    }),
    [contract],
  );

  const scale = walkin || xrMode === 'none' ? 1 : (def.tabletopScale ?? 0.05);
  const onTeleport = (p: Vector3) => {
    player.position.copy(p);
    player.path = [];
    origin.current?.position.copy(p);
  };

  return (
    <>
      <group position={xrMode === 'tabletop' ? TABLE_POSITION : [0, 0, 0]} scale={scale}>
        {children}
        {walkin && (
          <TeleportTarget onTeleport={onTeleport}>
            {teleportMeshes.map((m) => <primitive key={m.uuid} object={m} />)}
          </TeleportTarget>
        )}
      </group>
      <XROrigin ref={origin}>
        <XrHud />
      </XROrigin>
      {xrMode !== 'none' && <XrLocomotion origin={origin} />}
    </>
  );
}
