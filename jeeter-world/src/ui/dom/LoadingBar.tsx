import { useWorld } from '../../store/world.ts';
import { useT } from '../useT.ts';

export function LoadingBar() {
  const t = useT();
  const progress = useWorld((s) => s.loadProgress);
  if (progress === null) return null;
  const pct = Math.round(progress * 100);
  return (
    <div className="loading" role="progressbar" aria-label={t('ui.loading')} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <span>{t('ui.loading')} {pct}%</span>
      <div className="bar"><div style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
