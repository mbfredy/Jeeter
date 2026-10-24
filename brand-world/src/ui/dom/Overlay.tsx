import type { XRStore } from '@react-three/xr';
import { useWorld } from '../../store/world.ts';
import { useT } from '../useT.ts';
import { CollectedTray } from './CollectedTray.tsx';
import { DomPanel } from './DomPanel.tsx';
import { InteractPrompt } from './InteractPrompt.tsx';
import { KeyboardControls } from './KeyboardControls.tsx';
import { LoadingBar } from './LoadingBar.tsx';
import { PlacesMenu } from './PlacesMenu.tsx';

// Flat-screen UI layered over the canvas. XR uses ui/xr instead.
export function Overlay({ xrStore }: { xrStore: XRStore }) {
  const t = useT();
  const { xrSupported, device } = useWorld();
  return (
    <div className="overlay">
      <LoadingBar />
      <PlacesMenu />
      <CollectedTray />
      <DomPanel />
      <InteractPrompt />
      <KeyboardControls />
      <div className="corner">
        {device === 'desktop' && <span className="hint">{t('ui.wasdHint')}</span>}
        {xrSupported && <button className="primary" onClick={() => xrStore.enterVR()}>{t('ui.enterVr')}</button>}
      </div>
    </div>
  );
}
