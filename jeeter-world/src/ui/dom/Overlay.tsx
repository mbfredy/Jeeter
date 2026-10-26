import type { XRStore } from '@react-three/xr';
import { useWorld } from '../../store/world.ts';
import { useT } from '../useT.ts';
import { CollectedTray } from './CollectedTray.tsx';
import { DomPanel } from './DomPanel.tsx';
import { InteractPrompt } from './InteractPrompt.tsx';
import { KeyboardControls } from './KeyboardControls.tsx';
import { LoadingBar } from './LoadingBar.tsx';
import { PlacesMenu } from './PlacesMenu.tsx';
import { TouchJoystick } from './TouchJoystick.tsx';
import { ViewToggle } from './ViewToggle.tsx';

// Flat-screen UI layered over the canvas. XR uses ui/xr instead.
export function Overlay({ xrStore }: { xrStore: XRStore }) {
  const t = useT();
  const { xrSupported, device, viewMode, pointerLocked, panel } = useWorld();
  const street = viewMode === 'street';
  const touch = device !== 'desktop';
  const hint = street ? (touch ? 'ui.streetHintTouch' : pointerLocked ? 'ui.streetHintLocked' : 'ui.streetHintDesktop') : touch ? null : 'ui.wasdHint';
  return (
    <div className="overlay">
      <LoadingBar />
      <PlacesMenu />
      <CollectedTray />
      <DomPanel />
      {street && touch && <TouchJoystick />}
      {street && pointerLocked && <div className="crosshair" aria-hidden="true" />}
      <InteractPrompt raised={street && touch} />
      <KeyboardControls />
      {/* Hidden while a panel is open so it never covers the panel's buttons on phones. */}
      <div className="corner" hidden={!!panel}>
        {hint && <span className="hint">{t(hint)}</span>}
        <ViewToggle />
        {xrSupported && <button className="primary" onClick={() => xrStore.enterVR()}>{t('ui.enterVr')}</button>}
      </div>
    </div>
  );
}
