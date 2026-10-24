// Agent and voxel settings shared by the build-time bake and the runtime
// fallback, so both produce the same navmesh. No imports: runs under Node.
const AGENT = { radius: 0.4, height: 1.8, maxClimb: 0.3, maxSlopeDeg: 40 };
const CELL = 0.2;
const CELL_HEIGHT = 0.1;

export const NAV_CONFIG = {
  cs: CELL,
  ch: CELL_HEIGHT,
  walkableSlopeAngle: AGENT.maxSlopeDeg,
  walkableHeight: Math.ceil(AGENT.height / CELL_HEIGHT),
  walkableClimb: Math.floor(AGENT.maxClimb / CELL_HEIGHT),
  walkableRadius: Math.ceil(AGENT.radius / CELL),
  maxEdgeLen: 12 / CELL,
  maxSimplificationError: 1.3,
  minRegionArea: 8,
  mergeRegionArea: 20,
  maxVertsPerPoly: 6,
  detailSampleDist: 6,
  detailSampleMaxError: 1,
};
