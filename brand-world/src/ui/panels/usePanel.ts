import { useCallback } from 'react';
import { bus } from '../../events/bus.ts';
import { useWorld } from '../../store/world.ts';
import { useT } from '../useT.ts';
import { panelModel, type PanelModel } from './panelModel.ts';

export function usePanel(): { model: PanelModel | null; close: () => void } {
  const t = useT();
  const panel = useWorld((s) => s.panel);
  const set = useWorld((s) => s.set);
  const close = useCallback(() => {
    if (panel) bus.emit({ type: 'panel_close', contentId: panel });
    set({ panel: null });
  }, [panel, set]);
  return { model: panel ? panelModel(panel, t) : null, close };
}
