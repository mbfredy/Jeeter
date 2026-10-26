import { Text } from '@react-three/drei';
import { bus } from '../../events/bus.ts';
import { useWorld } from '../../store/world.ts';
import { useActiveScene } from '../../world/SceneContext.ts';
import { useT } from '../useT.ts';
import { XrButton, useXrFont } from './XrButton.tsx';

// In-scene controls for XR. Lives inside XROrigin, so it moves and turns
// with the play space.
export function XrHud() {
  const t = useT();
  const font = useXrFont();
  const { def } = useActiveScene();
  const xrMode = useWorld((s) => s.xrMode);
  const set = useWorld((s) => s.set);
  if (xrMode === 'none') return null;

  const toggle = () => {
    const next = xrMode === 'walkin' ? 'tabletop' : 'walkin';
    set({ xrMode: next });
    bus.emit({ type: 'xr', state: next === 'walkin' ? 'walk_in' : 'tabletop' });
  };

  return (
    <group position={[0, 1.05, -0.6]} rotation-x={-0.5}>
      {def.walkIn && <XrButton label={t(xrMode === 'walkin' ? 'ui.tabletop' : 'ui.walkIn')} position={[0, 0, 0]} onClick={toggle} />}
      {xrMode === 'walkin' && (
        <Text font={font} fontSize={0.022} position={[0, -0.07, 0]} color="#cccccc" anchorX="center" anchorY="top">
          {t('ui.xrMoveHint')}
        </Text>
      )}
    </group>
  );
}
