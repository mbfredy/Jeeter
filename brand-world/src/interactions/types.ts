import type { ContentKind, District } from '../content/types.ts';

// What an action can do to the world. Actions get this instead of importing
// engine modules, which keeps action files tiny and loadable by the validator.
export interface WorldApi {
  goToScene(sceneId: string): void;
  openPanel(contentId: string): void;
  playMedia(mediaId: string): void;
  collect(itemId: string): void;
  openUrl(url: string): void;
}

export interface ActionContext {
  contentId: string;
  node: string;
  sceneId: string;
  district: District;
  world: WorldApi;
}

export interface ActionDef {
  name: string;
  // Lets the validator check that contentId exists in the right table.
  contentKind: ContentKind;
  run(ctx: ActionContext): void;
}
