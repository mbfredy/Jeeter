import { useWorld } from '../../store/world.ts';
import { useT } from '../useT.ts';

export function CollectedTray() {
  const t = useT();
  const collected = useWorld((s) => s.collected);
  if (!collected.length) return null;
  return (
    <aside className="collected" aria-live="polite">
      <strong>{t('ui.collected')}</strong>
      <ul>{collected.map((id) => <li key={id}>{t(`collect.${id}`, id)}</li>)}</ul>
    </aside>
  );
}
