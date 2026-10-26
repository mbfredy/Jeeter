import type { SceneContract } from '../contract/types.ts';

// The mounted scene's contract, for DOM UI that lives outside the canvas.
let current: SceneContract | null = null;

export const setCurrentContract = (c: SceneContract | null) => {
  current = c;
};
export const currentContract = () => current;
