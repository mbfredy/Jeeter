export type Device = 'desktop' | 'mobile' | 'xr';

const HEADSET_UA = /OculusBrowser|Quest|Pico|Wolvic/i;

export async function detectDevice(): Promise<{ device: Device; xrSupported: boolean }> {
  const xrSupported = (await navigator.xr?.isSessionSupported('immersive-vr').catch(() => false)) ?? false;
  if (HEADSET_UA.test(navigator.userAgent)) return { device: 'xr', xrSupported };
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  return { device: coarse ? 'mobile' : 'desktop', xrSupported };
}
