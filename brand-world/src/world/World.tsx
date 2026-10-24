import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { XR, createXRStore } from '@react-three/xr';
import { IsoCamera } from '../player/IsoCamera.tsx';
import { OccluderFade } from '../player/OccluderFade.tsx';
import { Player } from '../player/Player.tsx';
import { XrRig } from '../player/XrRig.tsx';
import { useWorld } from '../store/world.ts';
import { Overlay } from '../ui/dom/Overlay.tsx';
import { XrHud } from '../ui/xr/XrHud.tsx';
import { ActiveScene } from './ActiveScene.tsx';
import { SceneModel } from './SceneModel.tsx';
import { Screens } from './Screens.tsx';
import { ZoneWatcher } from './ZoneWatcher.tsx';

const xrStore = createXRStore({
  // Dev only: VITE_XR_EMULATE=true npm run dev fakes a Quest for desktop testing.
  emulate: import.meta.env.DEV && import.meta.env.VITE_XR_EMULATE === 'true' ? 'metaQuest3' : false,
  // Fixed foveation trades edge sharpness for frame rate on Quest.
  foveation: 1,
  controller: { teleportPointer: true },
  hand: { teleportPointer: true },
});

function FlatOnly() {
  const xrMode = useWorld((s) => s.xrMode);
  return xrMode === 'none' ? (
    <>
      <IsoCamera />
      <OccluderFade />
    </>
  ) : null;
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
        camera={{ position: [18, 20, 18], near: 0.1, far: 500 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        style={{ position: 'fixed', inset: 0 }}
      >
        <color attach="background" args={['#1b1b1d']} />
        <XR store={xrStore}>
          {/* Default lighting for blockouts; real scenes should bake light in Blender. */}
          <hemisphereLight args={['#ffffff', '#444444', 1.6]} />
          <directionalLight position={[10, 20, 8]} intensity={1.6} />
          <ActiveScene>
            <XrRig>
              <SceneModel />
              <Player />
              <ZoneWatcher />
              <Screens />
            </XrRig>
            <XrHud />
            <FlatOnly />
          </ActiveScene>
        </XR>
      </Canvas>
      <Overlay xrStore={xrStore} />
    </>
  );
}
