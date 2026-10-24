import { bus } from '../events/bus.ts';
import { useWorld } from '../store/world.ts';
import { syncScreenVideos } from '../world/screenVideos.ts';
import type { WorldApi } from './types.ts';

// The only place actions reach into engine state.
export const worldApi: WorldApi = {
  goToScene(sceneId) {
    const s = useWorld.getState();
    if (sceneId === s.sceneId || !s.district?.scenes[sceneId]) return;
    s.set({ sceneId, sceneReady: false, panel: null, playingMedia: null });
  },
  openPanel(contentId) {
    const s = useWorld.getState();
    s.set({ panel: contentId });
    s.unlock(contentId);
  },
  playMedia(mediaId) {
    const s = useWorld.getState();
    const playing = s.playingMedia === mediaId ? null : mediaId;
    s.set({ playingMedia: playing });
    if (s.district) syncScreenVideos(playing, s.district);
    bus.emit({ type: 'media', mediaId, state: playing ? 'play' : 'pause' });
  },
  collect(itemId) {
    const s = useWorld.getState();
    if (s.collected.includes(itemId)) return;
    s.collect(itemId);
    bus.emit({ type: 'collect', itemId });
  },
  openUrl(url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  },
};
