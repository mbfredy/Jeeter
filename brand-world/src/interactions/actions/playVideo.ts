import type { ActionDef } from '../types.ts';

const action: ActionDef = {
  name: 'playVideo',
  contentKind: 'media',
  run: ({ contentId, world }) => world.playMedia(contentId),
};
export default action;
