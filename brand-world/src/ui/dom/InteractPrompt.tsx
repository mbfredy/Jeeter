import { interactWithNearby } from '../../interactions/nearbyAction.ts';
import { useWorld } from '../../store/world.ts';
import { useT } from '../useT.ts';

// Shows what is in reach. Keyboard users press E; touch users tap it.
export function InteractPrompt() {
  const t = useT();
  const nearby = useWorld((s) => s.nearby);
  const panel = useWorld((s) => s.panel);
  const device = useWorld((s) => s.device);
  if (!nearby || panel) return null;
  return (
    <button className="prompt" onClick={interactWithNearby} aria-keyshortcuts="E">
      {device === 'desktop' && <kbd>{t('ui.interactKey')}</kbd>}
      {t(`node.${nearby}`, nearby)}
    </button>
  );
}
