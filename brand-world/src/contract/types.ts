import type { Box3, Mesh, Object3D, Vector3 } from 'three';

export interface Hotspot { object: Object3D; action: string; contentId: string }
export interface Door { object: Object3D; target: string }
export interface Screen { node: string; mesh: Mesh; mediaId: string }
export interface Zone { name: string; box: Box3; preload: string[] }

export interface SceneContract {
  spawn: { position: Vector3; rotationY: number } | null;
  navMeshes: Mesh[];
  colliders: Mesh[];
  zones: Zone[];
  hotspots: Hotspot[];
  doors: Door[];
  screens: Screen[];
  plots: Object3D[];
  // Maps an object (by uuid) to the contract node it belongs to, for clicks.
  interactive: Map<string, { node: string; kind: 'hotspot' | 'door' | 'screen' }>;
  warnings: string[];
}

export type PrefixHandler = (obj: Object3D, out: SceneContract) => void;
