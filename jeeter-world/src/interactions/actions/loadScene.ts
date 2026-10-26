import type { ActionDef } from '../types.ts';

const action: ActionDef = {
  name: 'loadScene',
  contentKind: 'scenes',
  run: ({ contentId, world }) => world.goToScene(contentId),
};
export default action;
