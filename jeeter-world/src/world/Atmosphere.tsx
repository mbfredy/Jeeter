import { useWorld } from '../store/world.ts';
import { useActiveScene } from './SceneContext.ts';

const DEFAULTS = { background: '#1b1b1d', sky: '#ffffff', ground: '#444444', ambient: 1.6 };
const DEFAULT_SUN = { color: '#ffffff', intensity: 1.6, direction: [10, 20, 8] as [number, number, number] };

// Background, fog and lights from district.json scene.atmosphere. No
// shadows: real scenes bake lighting in Blender.
export function Atmosphere() {
  const { def } = useActiveScene();
  const xrMode = useWorld((s) => s.xrMode);
  const a = def.atmosphere ?? {};
  const sun = a.sun ?? DEFAULT_SUN;
  const dir = sun.direction;
  const len = Math.hypot(...dir) || 1;
  return (
    <>
      <color attach="background" args={[a.background ?? DEFAULTS.background]} />
      {/* Fog is in metres, so it would swallow the scaled-down tabletop model. */}
      {a.fog && xrMode !== 'tabletop' && <fog attach="fog" args={[a.fog.color, a.fog.near, a.fog.far]} />}
      <hemisphereLight args={[a.sky ?? DEFAULTS.sky, a.ground ?? DEFAULTS.ground, a.ambient ?? DEFAULTS.ambient]} />
      <directionalLight color={sun.color} intensity={sun.intensity} position={[(dir[0] / len) * 50, (dir[1] / len) * 50, (dir[2] / len) * 50]} />
    </>
  );
}
