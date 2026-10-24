export type WorldEvent =
  | { type: 'age_gate'; result: 'pass' | 'fail' | 'invalid' }
  | { type: 'geo_blocked'; region: string }
  | { type: 'scene_load'; sceneId: string; ms: number }
  | { type: 'zone_enter' | 'zone_exit'; sceneId: string; zone: string }
  | { type: 'interaction'; action: string; contentId: string; node: string; sceneId: string }
  | { type: 'panel_close'; contentId: string }
  | { type: 'media'; mediaId: string; state: 'play' | 'pause' }
  | { type: 'collect'; itemId: string }
  | { type: 'xr'; state: 'enter' | 'exit' | 'walk_in' | 'tabletop' };

export interface EventContext {
  ts: number;
  drop: string;
  device: string;
  region: string;
}

export type TrackedEvent = WorldEvent & EventContext;
