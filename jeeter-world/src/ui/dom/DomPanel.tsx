import { useEffect } from 'react';
import { usePanel } from '../panels/usePanel.ts';

export function DomPanel() {
  const { model, close } = usePanel();
  useEffect(() => {
    if (!model) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [model, close]);
  if (!model) return null;
  return (
    <section className="panel" role="dialog" aria-labelledby="panel-title" data-panel={model.contentId}>
      <h2 id="panel-title">{model.title}</h2>
      <p>{model.body}</p>
      <button className="primary" onClick={close} autoFocus>{model.closeLabel}</button>
    </section>
  );
}
