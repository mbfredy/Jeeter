import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { XR, createXRStore } from '@react-three/xr';
import { IsoCamera } from '../player/IsoCamera.tsx';
import { OccluderFade } from '../player/OccluderFade.tsx';
import { Player } from '../player/Player.tsx';
import { StreetCamera } from '../player/StreetCamera.tsx';
import { StreetControls } from '../player/StreetControls.tsx';
import { player } from '../player/playerState.ts';
import { XrRig } from '../player/XrRig.tsx';
import { useWorld } from '../store/world.ts';
import { Overlay } from '../ui/dom/Overlay.tsx';
import { XrPanel } from '../ui/xr/XrPanel.tsx';
import { ProximityWatcher } from '../player/ProximityWatcher.tsx';
import { ActiveScene } from './ActiveScene.tsx';
import { useActiveScene } from './SceneContext.ts';
import { Atmosphere } from './Atmosphere.tsx';
import { SceneModel } from './SceneModel.tsx';
import { Screens } from './Screens.tsx';
import { ZoneWatcher } from './ZoneWatcher.tsx';

export const xrStore = createXRStore({
  // Dev only: VITE_XR_EMULATE=true npm run dev fakes a Quest for desktop testing.
  emulate: import.meta.env.DEV && import.meta.env.VITE_XR_EMULATE === 'true' ? 'metaQuest3' : false,
  // Fixed foveation trades edge sharpness for frame rate on Quest.
  foveation: 1,
  controller: { teleportPointer: true },
  hand: { teleportPointer: true },
});

// Dev + emulator only: handles for tests/xr. Compiled out of production.
if (import.meta.env.DEV && import.meta.env.VITE_XR_EMULATE === 'true') {
  Object.assign(window, { __xrStore: xrStore, __world: useWorld, __player: player });
}

function FlatOnly() {
  const xrMode = useWorld((s) => s.xrMode);
  const viewMode = useWorld((s) => s.viewMode);
  const cutaway = useActiveScene().def.cutaway;
  if (xrMode !== 'none') return null;
  if (viewMode === 'street') {
    return (
      <>
        <StreetCamera />
        <StreetControls />
      </>
    );
  }
  return (
    <>
      <IsoCamera />
      {cutaway && <OccluderFade />}
    </>
  );
}

export function World() {
  // Re-check XR support after the XR runtime loads; the dev emulator
  // installs asynchronously, so retry for a few seconds.
  useEffect(() => {
    let tries = 0;
    const id = setInterval(async () => {
      const ok = await navigator.xr?.isSessionSupported('immersive-vr').catch(() => false);
      if (ok) useWorld.getState().set({ xrSupported: true });
      if (ok || ++tries >= 6) clearInterval(id);
    }, 500);
    return () => clearInterval(id);
  }, []);
  return (
    <>
      <Canvas
        orthographic
        camera={{ position: [36, 40, 36], near: 0.1, far: 800 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        style={{ position: 'fixed', inset: 0 }}
      >
        <XR store={xrStore}>
          <ActiveScene>
            <Atmosphere />
            <XrRig>
              <SceneModel />
              <Player />
              <ZoneWatcher />
              <ProximityWatcher />
              <Screens />
            </XrRig>
            <XrPanel />
            <FlatOnly />
          </ActiveScene>
        </XR>
      </Canvas>
      <Overlay xrStore={xrStore} />
    </>
  );
}
