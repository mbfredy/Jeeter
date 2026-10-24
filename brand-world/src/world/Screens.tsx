import { useEffect } from 'react';
import { MeshBasicMaterial, SRGBColorSpace, VideoTexture, type Material } from 'three';
import { contentUrl } from '../content/load.ts';
import { useWorld } from '../store/world.ts';
import { useActiveScene } from './SceneContext.ts';
import { setScreenVideos, syncScreenVideos, type ScreenVideo } from './screenVideos.ts';

function createVideo(src: string, loop: boolean): HTMLVideoElement {
  const v = document.createElement('video');
  Object.assign(v, { src, loop, muted: true, playsInline: true, crossOrigin: 'anonymous', preload: 'auto' });
  v.setAttribute('playsinline', '');
  return v;
}

// Puts a video texture on every screen_* mesh. One video plays with sound at
// a time (store.playingMedia); others idle muted or paused.
export function Screens() {
  const { contract } = useActiveScene();
  const district = useWorld((s) => s.district)!;
  const playing = useWorld((s) => s.playingMedia);

  useEffect(() => {
    const videos: ScreenVideo[] = [];
    const restore: [typeof contract.screens[number]['mesh'], Material | Material[]][] = [];
    for (const screen of contract.screens) {
      const media = district.media[screen.mediaId];
      if (!media) {
        console.warn(`[screens] ${screen.node}: unknown mediaId "${screen.mediaId}"`);
        continue;
      }
      const video = createVideo(contentUrl(media.src), media.loop ?? true);
      const map = new VideoTexture(video);
      map.colorSpace = SRGBColorSpace;
      map.flipY = false; // glTF UV convention
      restore.push([screen.mesh, screen.mesh.material]);
      screen.mesh.material = new MeshBasicMaterial({ map, toneMapped: false });
      videos.push({ mediaId: screen.mediaId, video });
      if (media.autoplayMuted) video.play().catch(() => {});
    }
    setScreenVideos(videos);
    return () => {
      for (const { video } of videos) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      for (const [mesh, original] of restore) {
        const m = mesh.material as MeshBasicMaterial;
        m.map?.dispose();
        m.dispose();
        mesh.material = original;
      }
      setScreenVideos([]);
    };
  }, [contract, district]);

  useEffect(() => syncScreenVideos(playing, district), [playing, contract, district]);

  return null;
}
