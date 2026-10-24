import { useWorld } from '../store/world.ts';
import { currentContract } from '../world/currentContract.ts';
import { triggerNode } from './trigger.ts';

// Uses whatever the player is standing next to. Shared by the keyboard,
// the on-screen prompt and XR controller buttons.
export function interactWithNearby(): boolean {
  const { nearby, panel } = useWorld.getState();
  const contract = currentContract();
  if (panel || !nearby || !contract) return false;
  triggerNode(nearby, contract);
  return true;
}
