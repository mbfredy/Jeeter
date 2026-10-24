import { useEffect, useMemo, type ReactNode } from 'react';
import { TeleportTarget, XROrigin, useXR } from '@react-three/xr';
import { Mesh, MeshBasicMaterial, type Vector3 } from 'three';
import { bus } from '../events/bus.ts';
import { useWorld } from '../store/world.ts';
import { useActiveScene } from '../world/SceneContext.ts';
import { player } from './playerState.ts';

const TABLE_POSITION: [number, number, number] = [0, 0.85, -1.1];
const invisible = new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });

// XR: tabletop model of the scene by default; walk-in (1:1 with teleport)
// only for scenes flagged walkIn in district.json.
export function XrRig({ children }: { children: ReactNode }) {
  const session = useXR((s) => s.session);
  const { def, contract } = useActiveScene();
  const xrMode = useWorld((s) => s.xrMode);
  const set = useWorld((s) => s.set);

  useEffect(() => {
    if (!session) return;
    set({ xrMode: 'tabletop' });
    bus.emit({ type: 'xr', state: 'enter' });
    return () => {
      set({ xrMode: 'none' });
      bus.emit({ type: 'xr', state: 'exit' });
    };
  }, [session, set]);

  useEffect(() => {
    if (xrMode === 'walkin' && !def.walkIn) set({ xrMode: 'tabletop' });
  }, [def, xrMode, set]);

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

  const walkin = xrMode === 'walkin';
  const origin = useWorld((s) => s.xrOrigin);
  useEffect(() => set({ xrOrigin: walkin ? player.position.toArray() : [0, 0, 0] }), [walkin, contract, set]);
  const scale = walkin || xrMode === 'none' ? 1 : (def.tabletopScale ?? 0.05);
  const onTeleport = (p: Vector3) => {
    player.position.copy(p);
    player.path = [];
    set({ xrOrigin: p.toArray() });
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
      <XROrigin position={origin} />
    </>
  );
}
