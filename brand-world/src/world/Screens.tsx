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

// Puts a video texture on every screen_* mesh. Screens showing the same
// mediaId share one video element and texture (one decoder; matters on
// Quest). One video plays with sound at a time (store.playingMedia).
export function Screens() {
  const { contract } = useActiveScene();
  const district = useWorld((s) => s.district)!;
  const playing = useWorld((s) => s.playingMedia);

  useEffect(() => {
    const shared = new Map<string, ScreenVideo & { material: MeshBasicMaterial }>();
    const restore: [typeof contract.screens[number]['mesh'], Material | Material[]][] = [];
    for (const screen of contract.screens) {
      const media = district.media[screen.mediaId];
      if (!media) {
        console.warn(`[screens] ${screen.node}: unknown mediaId "${screen.mediaId}"`);
        continue;
      }
      let entry = shared.get(screen.mediaId);
      if (!entry) {
        const video = createVideo(contentUrl(media.src), media.loop ?? true);
        const map = new VideoTexture(video);
        map.colorSpace = SRGBColorSpace;
        map.flipY = false; // glTF UV convention
        entry = { mediaId: screen.mediaId, video, material: new MeshBasicMaterial({ map, toneMapped: false }) };
        shared.set(screen.mediaId, entry);
        if (media.autoplayMuted) video.play().catch(() => {});
      }
      restore.push([screen.mesh, screen.mesh.material]);
      screen.mesh.material = entry.material;
    }
    setScreenVideos([...shared.values()]);
    return () => {
      for (const { video, material } of shared.values()) {
        video.pause();
        video.removeAttribute('src');
        video.load();
        material.map?.dispose();
        material.dispose();
      }
      for (const [mesh, original] of restore) mesh.material = original;
      setScreenVideos([]);
    };
  }, [contract, district]);

  useEffect(() => syncScreenVideos(playing, district), [playing, contract, district]);

  return null;
}
