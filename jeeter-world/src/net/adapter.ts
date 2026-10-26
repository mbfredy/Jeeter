import type { WorldEvent } from '../analytics/events.ts';

// Placeholder for multiplayer. A real adapter subscribes to the event bus to
// send local events and calls onRemote handlers with other players' events.
// The interaction system never imports this.
export interface RemotePlayer {
  id: string;
  sceneId: string;
  position: [number, number, number];
}

export interface NetAdapter {
  connect(session: { drop: string; sceneId: string }): Promise<void>;
  disconnect(): void;
  sendEvent(e: WorldEvent): void;
  sendPosition(sceneId: string, position: [number, number, number]): void;
  onRemoteEvent(handler: (playerId: string, e: WorldEvent) => void): () => void;
  onPlayers(handler: (players: RemotePlayer[]) => void): () => void;
}

export const nullNetAdapter: NetAdapter = {
  connect: async () => {},
  disconnect: () => {},
  sendEvent: () => {},
  sendPosition: () => {},
  onRemoteEvent: () => () => {},
  onPlayers: () => () => {},
};
