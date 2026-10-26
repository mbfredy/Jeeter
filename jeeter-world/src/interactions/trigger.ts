import type { SceneContract } from '../contract/types.ts';
import { useWorld } from '../store/world.ts';
import { dispatch } from './registry.ts';
import { worldApi } from './worldApi.ts';

// Doors and screens are shorthand for loadScene / playVideo hotspots, so all
// interactions go through the same registry (and the same analytics).
export function triggerNode(node: string, contract: SceneContract) {
  const { district, sceneId } = useWorld.getState();
  if (!district || !sceneId) return;
  const base = { node, sceneId, district, world: worldApi };
  const hotspot = contract.hotspots.find((h) => h.object.name === node);
  if (hotspot) return dispatch(hotspot.action, { ...base, contentId: hotspot.contentId });
  const door = contract.doors.find((d) => d.object.name === node);
  if (door) return dispatch('loadScene', { ...base, contentId: door.target });
  const screen = contract.screens.find((s) => s.node === node);
  if (screen) return dispatch('playVideo', { ...base, contentId: screen.mediaId });
}
