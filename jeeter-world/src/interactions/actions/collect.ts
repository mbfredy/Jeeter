import type { ActionDef } from '../types.ts';

const action: ActionDef = {
  name: 'collect',
  contentKind: 'collectibles',
  run: ({ contentId, world }) => world.collect(contentId),
};
export default action;
