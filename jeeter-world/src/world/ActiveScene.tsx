import { useEffect, useState, type ReactNode } from 'react';
import { useThree } from '@react-three/fiber';
import { bus } from '../events/bus.ts';
import { parseScene } from '../contract/parseScene.ts';
import type { SceneContract } from '../contract/types.ts';
import { loadScene, type LoadedScene } from '../loader/sceneCache.ts';
import { createNav } from '../nav/navmesh.ts';
import { placePlayer, player } from '../player/playerState.ts';
import { useWorld, type Interactable } from '../store/world.ts';
import { SceneContext, type ActiveSceneData } from './SceneContext.ts';
import { setCurrentContract } from './currentContract.ts';

const contracts = new WeakMap<LoadedScene, SceneContract>();

function contractFor(loaded: LoadedScene): SceneContract {
  let c = contracts.get(loaded);
  if (!c) {
    const { district, region } = useWorld.getState();
    c = parseScene(loaded.gltf.scene, district!, region!);
    contracts.set(loaded, c);
  }
  return c;
}

function interactablesOf(c: SceneContract): Interactable[] {
  const seen = new Map<string, Interactable>();
  for (const v of c.interactive.values()) seen.set(v.node, v);
  return [...seen.values()];
}

// Loads the current scene and provides its contract and navmesh.
export function ActiveScene({ children }: { children: ReactNode }) {
  const gl = useThree((s) => s.gl);
  const sceneId = useWorld((s) => s.sceneId);
  const set = useWorld((s) => s.set);
  const [active, setActive] = useState<ActiveSceneData | null>(null);

  useEffect(() => {
    if (!sceneId) return;
    let cancelled = false;
    let nav: ActiveSceneData['nav'] = null;
    const started = performance.now();
    const { district } = useWorld.getState();
    set({ loadProgress: 0, sceneReady: false });
    loadScene(sceneId, district!, gl, (f) => set({ loadProgress: f }))
      .then(async (loaded) => {
        const contract = contractFor(loaded);
        nav = await createNav(loaded.navmesh, [...contract.navMeshes, ...contract.colliders]);
        if (cancelled) return nav?.dispose();
        placePlayer((contract.spawn?.position ?? player.position.set(0, 0, 0)).clone());
        setActive({ id: sceneId, def: district!.scenes[sceneId], contract, nav, root: loaded.gltf.scene });
        set({ loadProgress: null, interactables: interactablesOf(contract) });
        bus.emit({ type: 'scene_load', sceneId, ms: Math.round(performance.now() - started) });
      })
      .catch((e) => {
        console.error(`[loader] ${sceneId}:`, e);
        set({ loadProgress: null });
      });
    return () => {
      cancelled = true;
      nav?.dispose();
    };
  }, [sceneId, gl, set]);

  // Mark ready one frame after the new scene mounts (used by tests).
  useEffect(() => {
    if (!active) return;
    document.body.dataset.scene = active.id;
    setCurrentContract(active.contract);
    const raf = requestAnimationFrame(() => {
      set({ sceneReady: true });
      document.body.dataset.sceneReady = 'true';
    });
    return () => {
      cancelAnimationFrame(raf);
      setCurrentContract(null);
      document.body.dataset.sceneReady = 'false';
    };
  }, [active, set]);

  if (!active || active.id !== sceneId) return null;
  return (
    <SceneContext.Provider value={active}>
      {children}
    </SceneContext.Provider>
  );
}
