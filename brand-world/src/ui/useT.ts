import { useMemo } from 'react';
import { createTranslate, type Translate } from '../content/copy.ts';
import { useWorld } from '../store/world.ts';

export function useT(): Translate {
  const copy = useWorld((s) => s.copy);
  const region = useWorld((s) => s.region);
  return useMemo(() => (copy && region ? createTranslate(copy, region) : (k: string) => k), [copy, region]);
}
