import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CopyFile, District } from '../content/types.ts';
import type { Region } from '../content/region.ts';
import type { Device } from '../boot/device.ts';

export type XrMode = 'none' | 'tabletop' | 'walkin';

export interface Interactable {
  node: string;
  kind: 'hotspot' | 'door' | 'screen';
}

interface WorldState {
  // session
  ageVerified: boolean;
  ageDenied: boolean;
  region: Region | null;
  device: Device | null;
  xrSupported: boolean;
  // content
  district: District | null;
  copy: CopyFile | null;
  // scene
  sceneId: string | null;
  sceneReady: boolean;
  loadProgress: number | null;
  interactables: Interactable[];
  // Interactable within reach of the player, if any.
  nearby: string | null;
  xrMode: XrMode;
  // progress
  unlocked: string[];
  collected: string[];
  // ui
  panel: string | null;
  playingMedia: string | null;

  set: (partial: Partial<WorldState>) => void;
  unlock: (id: string) => void;
  collect: (id: string) => void;
}

const addUnique = (list: string[], id: string) => (list.includes(id) ? list : [...list, id]);

export const useWorld = create<WorldState>()(
  persist(
    (set) => ({
      ageVerified: false,
      ageDenied: false,
      region: null,
      device: null,
      xrSupported: false,
      district: null,
      copy: null,
      sceneId: null,
      sceneReady: false,
      loadProgress: null,
      interactables: [],
      nearby: null,
      xrMode: 'none',
      unlocked: [],
      collected: [],
      panel: null,
      playingMedia: null,
      set: (partial) => set(partial),
      unlock: (id) => set((s) => ({ unlocked: addUnique(s.unlocked, id) })),
      collect: (id) => set((s) => ({ collected: addUnique(s.collected, id) })),
    }),
    {
      // Session only: closing the tab ends the session and re-runs the gate.
      name: 'brand-world-session',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({
        ageVerified: s.ageVerified,
        ageDenied: s.ageDenied,
        unlocked: s.unlocked,
        collected: s.collected,
      }),
    },
  ),
);
