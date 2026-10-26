import { createContext, useContext } from 'react';
import type { Object3D } from 'three';
import type { SceneContract } from '../contract/types.ts';
import type { SceneDef } from '../content/types.ts';
import type { Nav } from '../nav/navmesh.ts';

export interface ActiveSceneData {
  id: string;
  def: SceneDef;
  contract: SceneContract;
  nav: Nav | null;
  root: Object3D;
}

export const SceneContext = createContext<ActiveSceneData | null>(null);

export function useActiveScene(): ActiveSceneData {
  const s = useContext(SceneContext);
  if (!s) throw new Error('useActiveScene outside SceneContext');
  return s;
}
