import { useEffect } from 'react';
import { interactWithNearby } from '../../interactions/nearbyAction.ts';
import { usePanel } from '../panels/usePanel.ts';

const TYPING = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A']);

// E or Enter uses the nearby object; E also closes an open panel.
// Movement keys are read by player/Player.tsx; Escape by DomPanel.
export function KeyboardControls() {
  const { model, close } = usePanel();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key !== 'e' && key !== 'enter') return;
      // Let focused buttons and fields handle their own Enter.
      if (key === 'enter' && TYPING.has((e.target as HTMLElement)?.tagName)) return;
      if (model && key === 'e') return close();
      if (interactWithNearby()) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [model, close]);
  return null;
}
