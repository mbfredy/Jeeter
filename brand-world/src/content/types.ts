// Shape of /content/<drop-id>/district.json and copy.json.

export interface SceneDef {
  glb: string;
  // Prebaked navmesh written by optimize-assets. Optional: the engine builds
  // one at runtime from nav_walkable if missing (slow on Quest).
  navmesh?: string;
  // In XR, scenes without walkIn only show as a tabletop model.
  walkIn?: boolean;
  tabletopScale?: number;
}

export interface MediaDef {
  src: string;
  loop?: boolean;
  autoplayMuted?: boolean;
}

export interface Visibility {
  hideInStates?: string[]; // "US-NY" style region codes, or a country "CA"
}

export interface District {
  id: string;
  startScene: string;
  scenes: Record<string, SceneDef>;
  media: Record<string, MediaDef>;
  links: Record<string, { url: string }>;
  collectibles: Record<string, object>;
  // Font file for in-scene XR text, relative to the drop folder.
  fonts?: { xr?: string };
  // Keyed by GLB node name or content id.
  visibility?: Record<string, Visibility>;
}

export interface CopyFile {
  default: Record<string, string>;
  overrides?: Record<string, Record<string, string>>;
}

// Which district.json table a hotspot's contentId points into.
export type ContentKind = 'copy-panel' | 'media' | 'scenes' | 'links' | 'collectibles';
