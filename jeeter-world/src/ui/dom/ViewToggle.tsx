import { useEffect } from 'react';
import { look } from '../../player/lookState.ts';
import { useWorld } from '../../store/world.ts';
import { useT } from '../useT.ts';

const OVERVIEW_YAW = Math.PI / 4; // matches the isometric camera's heading

function toggle() {
  const s = useWorld.getState();
  const next = s.viewMode === 'street' ? 'overview' : 'street';
  // Entering street view keeps facing the way the overview looked.
  if (next === 'street') (look.yaw = OVERVIEW_YAW), (look.pitch = -0.05);
  s.set({ viewMode: next });
}

// Switches between the isometric overview and first-person street view.
// Keyboard: V.
export function ViewToggle() {
  const t = useT();
  const street = useWorld((s) => s.viewMode === 'street');
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'v' || e.repeat || (e.target as HTMLElement)?.tagName === 'INPUT') return;
      toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <button onClick={toggle} aria-pressed={street} aria-keyshortcuts="V">
      {t(street ? 'ui.overview' : 'ui.streetView')}
    </button>
  );
}
