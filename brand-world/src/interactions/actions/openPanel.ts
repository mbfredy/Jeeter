import type { ActionDef } from '../types.ts';

const action: ActionDef = {
  name: 'openPanel',
  contentKind: 'copy-panel',
  run: ({ contentId, world }) => world.openPanel(contentId),
};
export default action;
