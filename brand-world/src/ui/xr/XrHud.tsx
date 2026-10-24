import { bus } from '../../events/bus.ts';
import { useWorld } from '../../store/world.ts';
import { useActiveScene } from '../../world/SceneContext.ts';
import { useT } from '../useT.ts';
import { XrButton } from './XrButton.tsx';
import { XrPanel } from './XrPanel.tsx';

// In-scene UI for XR, placed in front of the play-space origin.
export function XrHud() {
  const t = useT();
  const { def } = useActiveScene();
  const xrMode = useWorld((s) => s.xrMode);
  const set = useWorld((s) => s.set);
  const origin = useWorld((s) => s.xrOrigin);
  if (xrMode === 'none') return null;

  const toggle = () => {
    const next = xrMode === 'walkin' ? 'tabletop' : 'walkin';
    set({ xrMode: next });
    bus.emit({ type: 'xr', state: next === 'walkin' ? 'walk_in' : 'tabletop' });
  };

  return (
    <group position={origin}>
      {def.walkIn && (
        <XrButton label={t(xrMode === 'walkin' ? 'ui.tabletop' : 'ui.walkIn')} position={[0, 1.05, -0.6]} onClick={toggle} />
      )}
      <XrPanel position={[0, 1.45, -0.9]} />
    </group>
  );
}
