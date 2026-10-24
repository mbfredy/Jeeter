import { useState } from 'react';
import { useWorld } from '../../store/world.ts';
import { triggerNode } from '../../interactions/trigger.ts';
import { currentContract } from '../../world/currentContract.ts';
import { useT } from '../useT.ts';

// Keyboard and screen-reader access to every interactable in the scene.
// Fires the same interactions as tapping the object.
export function PlacesMenu() {
  const t = useT();
  const items = useWorld((s) => s.interactables);
  const ready = useWorld((s) => s.sceneReady);
  const [open, setOpen] = useState(false);
  if (!ready || !items.length) return null;
  return (
    <nav className="places" aria-label={t('ui.interactables')}>
      <button aria-expanded={open} onClick={() => setOpen(!open)}>{t('ui.interactables')}</button>
      {open && (
        <ul>
          {items.map((i) => (
            <li key={i.node}>
              <button onClick={() => { setOpen(false); const c = currentContract(); if (c) triggerNode(i.node, c); }}>
                {t(`node.${i.node}`, i.node)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
