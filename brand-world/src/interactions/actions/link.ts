import type { ActionDef } from '../types.ts';

const action: ActionDef = {
  name: 'link',
  contentKind: 'links',
  run: ({ contentId, district, world }) => {
    const link = district.links[contentId];
    if (link) world.openUrl(link.url);
  },
};
export default action;
