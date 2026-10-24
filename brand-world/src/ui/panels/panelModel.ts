import type { Translate } from '../../content/copy.ts';

// Renderer-agnostic panel content. DomPanel and XrPanel both draw this, so
// panel logic and copy lookup exist once.
export interface PanelModel {
  contentId: string;
  title: string;
  body: string;
  closeLabel: string;
}

export function panelModel(contentId: string, t: Translate): PanelModel {
  return {
    contentId,
    title: t(`panel.${contentId}.title`, ''),
    body: t(`panel.${contentId}.body`, ''),
    closeLabel: t('ui.close'),
  };
}
