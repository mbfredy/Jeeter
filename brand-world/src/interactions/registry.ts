import { bus } from '../events/bus.ts';
import type { ActionContext, ActionDef } from './types.ts';

// Every file in ./actions registers itself. Adding an action = adding a file.
const modules = import.meta.glob<{ default: ActionDef }>('./actions/*.ts', { eager: true });
const registry = new Map(Object.values(modules).map((m) => [m.default.name, m.default]));

export function actionNames(): string[] {
  return [...registry.keys()];
}

export function dispatch(actionName: string, ctx: ActionContext) {
  const action = registry.get(actionName);
  if (!action) {
    console.warn(`[interactions] unknown action "${actionName}" on ${ctx.node}`);
    return;
  }
  bus.emit({ type: 'interaction', action: actionName, contentId: ctx.contentId, node: ctx.node, sceneId: ctx.sceneId });
  action.run(ctx);
}
