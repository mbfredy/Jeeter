// The designer-to-code naming contract. Shared by the engine and the asset
// scripts, so it must stay free of imports (runs under plain Node too).

export type NodeKind =
  | 'spawn'
  | 'nav'
  | 'collider'
  | 'zone'
  | 'hotspot'
  | 'screen'
  | 'door'
  | 'plot';

interface Rule {
  kind: NodeKind;
  // Exact rules match the whole name (ignoring Blender's .001 suffix);
  // prefix rules match the start.
  match: string;
  exact: boolean;
  requiredExtras: string[];
}

export const RULES: Rule[] = [
  { kind: 'spawn', match: 'spawn_main', exact: true, requiredExtras: [] },
  { kind: 'nav', match: 'nav_walkable', exact: false, requiredExtras: [] },
  { kind: 'collider', match: 'collider_', exact: false, requiredExtras: [] },
  { kind: 'zone', match: 'zone_', exact: false, requiredExtras: [] },
  { kind: 'hotspot', match: 'hotspot_', exact: false, requiredExtras: ['action', 'contentId'] },
  { kind: 'screen', match: 'screen_', exact: false, requiredExtras: ['mediaId'] },
  { kind: 'door', match: 'door_', exact: false, requiredExtras: ['target'] },
  { kind: 'plot', match: 'plot_', exact: false, requiredExtras: [] },
];

// Blender appends .001, .002 to duplicated objects. three's GLTFLoader strips
// the dot, so "spawn_main.001" arrives as "spawn_main001".
export function baseName(name: string): string {
  return name.replace(/\.?\d{3}$/, '');
}

export function ruleFor(name: string): Rule | undefined {
  const n = baseName(name);
  return RULES.find((r) => (r.exact ? n === r.match : n.startsWith(r.match)));
}

const KNOWN_STEMS = ['spawn', 'nav', 'collider', 'zone', 'hotspot', 'screen', 'door', 'plot'];

// Common names from other engines that mean a contract prefix.
const ALIASES: Record<string, string> = {
  collision: 'collider_',
  col: 'collider_',
  trigger: 'zone_',
  portal: 'door_',
  navmesh: 'nav_walkable',
  walkable: 'nav_walkable',
  start: 'spawn_main',
  playerstart: 'spawn_main',
};

// Optimal string alignment distance: edits plus adjacent transpositions,
// so "hotpsot" is one step from "hotspot".
function typoDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

// Art meshes can be named anything. A name only counts as an unknown prefix
// when it looks like a contract name that went wrong: wrong case
// ("Hotspot_"), wrong separator ("door-"), an unsupported variant of an
// exact name ("spawn_side"), a known alias ("collision_"), or a one-letter
// typo in a stem of 5+ letters ("hotpsot_"). Kept strict so ordinary art
// names (lane, floor, street) never warn.
export function suspectedPrefix(name: string): string | undefined {
  if (ruleFor(name)) return undefined;
  const n = baseName(name);
  const stem = n.split(/[_\-. ]/)[0];
  if (!stem) return undefined;
  const lower = stem.toLowerCase();
  if (ALIASES[lower]) return ALIASES[lower];
  for (const known of KNOWN_STEMS) {
    const rule = RULES.find((r) => r.match.startsWith(known))!;
    if (lower === known || (lower.length >= 5 && known.length >= 5 && typoDistance(lower, known) === 1)) {
      return rule.match;
    }
  }
  return undefined;
}
