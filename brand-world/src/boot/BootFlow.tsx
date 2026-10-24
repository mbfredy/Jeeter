import { useEffect, useState, type ReactNode } from 'react';
import { bus } from '../events/bus.ts';
import { loadContent } from '../content/load.ts';
import { regionCode } from '../content/region.ts';
import { useWorld } from '../store/world.ts';
import { useT } from '../ui/useT.ts';
import { AgeGate } from './AgeGate.tsx';
import { Notice } from './Notice.tsx';
import { devSkipAgeGate } from './age.ts';
import { detectDevice } from './device.ts';
import { isRegionAllowed, lookupRegion } from './geo.ts';

// Order: content + region + device, then geo block, then age gate, then world.
export function BootFlow({ children }: { children: ReactNode }) {
  const t = useT();
  const { set, region, ageVerified, ageDenied, district } = useWorld();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([loadContent(), lookupRegion(), detectDevice()])
      .then(([content, region, dev]) => {
        set({ ...content, region, ...dev, sceneId: content.district.startScene });
        if (!isRegionAllowed(region)) bus.emit({ type: 'geo_blocked', region: regionCode(region) });
        if (devSkipAgeGate()) set({ ageVerified: true });
      })
      .catch((e: Error) => setError(e.message));
  }, [set]);

  if (error) return <Notice text={error} />;
  if (!district || !region) return null;
  if (!isRegionAllowed(region)) return <Notice text={t('geo.blocked')} />;
  if (ageDenied) return <Notice text={t('ageGate.denied')} />;
  if (!ageVerified) return <AgeGate />;
  return <>{children}</>;
}
