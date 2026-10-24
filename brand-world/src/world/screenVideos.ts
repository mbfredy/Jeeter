import type { District } from '../content/types.ts';

export interface ScreenVideo {
  mediaId: string;
  video: HTMLVideoElement;
}

let active: ScreenVideo[] = [];

export function setScreenVideos(list: ScreenVideo[]) {
  active = list;
}

// Called synchronously from the tap handler: iOS only allows unmuted play()
// inside the user gesture, not in a later React effect.
export function syncScreenVideos(playing: string | null, district: District) {
  for (const { mediaId, video } of active) {
    if (mediaId === playing) {
      video.muted = false;
      video.play().catch(() => {
        video.muted = true; // sound refused: keep playing muted
        video.play().catch(() => {});
      });
    } else {
      video.muted = true;
      if (district.media[mediaId]?.autoplayMuted) video.play().catch(() => {});
      else video.pause();
    }
  }
}
