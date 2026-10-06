// Single source of truth for districts, assets and editable campaign copy.
// Marketing can change copy, links and media IDs here without touching 3D code.

const params = new URLSearchParams(window.location.search);

export const BRAND = {
  purple: '#4b2a8c',
  blue: '#1f3fa8',
  gold: '#c9a25a',
  ink: '#0d0b1a',
};

export const ASSETS = {
  logos: {
    highsman:
      'https://cdn.prod.website-files.com/6218d031a773e4387f831730/6a8f4d16c5dfe0cc409b90ca_highsman.png',
    dodi: 'https://cdn.prod.website-files.com/6218d031a773e4387f831730/6a8f4d16002e34ad2dd962da_dodi.png',
    primitiv:
      'https://cdn.prod.website-files.com/6218d031a773e4387f831730/6a8f4d16cb42fa020a497491_primitiv-p-500.png',
  },
  // Optional Draco-compressed master scene. If the file is missing the
  // procedural world is used; override with ?scene=https://.../file.glb
  masterScene: params.get('scene') || 'models/gameday-master.glb',
  dracoDecoderPath: 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/',
};

// Campaign launch video. Override per page with ?video=<YouTubeID>.
export const VIDEO = {
  youtubeId: params.get('video') || 'REPLACE_WITH_YOUTUBE_ID',
};

export const OVERVIEW = {
  position: [0, 118, 182],
  target: [0, 0, 8],
};

export const DISTRICTS = {
  stadium: {
    id: 'stadium',
    trigger: 'trigger_stadium',
    label: 'Game Day Stadium',
    short: 'Stadium',
    accent: '#5b7cff',
    focus: [0, 6, 0],
    camera: [0, 36, 68],
    modal: 'video',
  },
  highsman: {
    id: 'highsman',
    trigger: 'trigger_highsman',
    label: 'Highsman · Ricky Williams',
    short: 'Highsman',
    accent: '#3fa46a',
    focus: [-75, 8, -25],
    camera: [-48, 26, 20],
    modal: 'highsman',
  },
  primitiv: {
    id: 'primitiv',
    trigger: 'trigger_primitiv',
    label: 'PRIMITIV · Calvin Johnson',
    short: 'PRIMITIV',
    accent: '#2f6bff',
    focus: [75, 6, -20],
    camera: [50, 22, 26],
    modal: 'primitiv',
  },
  dodi: {
    id: 'dodi',
    trigger: 'trigger_dodi',
    label: 'Dodi · Marshawn Lynch',
    short: 'Dodi',
    accent: '#7dff4f',
    focus: [45, 4, 60],
    camera: [24, 18, 96],
    modal: 'dodi',
  },
  vault: {
    id: 'vault',
    trigger: 'trigger_vault',
    label: 'Jeeter · The Vault',
    short: 'The Vault',
    accent: '#e0b46a',
    focus: [-45, 4, 65],
    camera: [-28, 16, 96],
    modal: 'vault',
  },
};

export const DISTRICT_ORDER = ['stadium', 'highsman', 'primitiv', 'dodi', 'vault'];

// ---------------------------------------------------------------------------
// Editable modal copy. Product names, prices and links are placeholders until
// the brand teams supply final data.
// ---------------------------------------------------------------------------
export const CONTENT = {
  highsman: {
    kicker: 'Highsman District',
    title: 'Ricky Williams',
    subtitle: 'Heisman winner. Founder of Highsman.',
    bio: 'Ricky Williams turned the Heisman pose into a brand built around balance: train hard, recover harder. The Highsman lodge is his retreat on the hill: timber, water and fire, a place to slow the game down.',
    highlights: [
      { stat: '34', label: 'The number on the pavilion track' },
      { stat: 'Lodge', label: 'Fire pits, greenhouse, cold plunge falls' },
      { stat: 'Ritual', label: 'Stretch, breathe, recover, repeat' },
    ],
    // Supply hosted MP3/M4A URLs. Empty src renders a "dropping soon" state.
    soundbites: [
      { title: 'On recovery', src: '' },
      { title: 'On the Heisman pose', src: '' },
      { title: 'Game day ritual', src: '' },
    ],
    cta: { label: 'Shop Highsman', href: '#' },
  },
  primitiv: {
    kicker: 'PRIMITIV District',
    title: 'Botanical Lab & Formulations',
    subtitle: 'Calvin "Megatron" Johnson · Motor City Works',
    intro: 'Detroit-built and lab-led. Pick a formulation to see its terpene profile.',
    formulations: [
      {
        name: 'Kickoff',
        mood: 'Bright · Social',
        terpenes: { Limonene: 82, Pinene: 46, Caryophyllene: 38, Myrcene: 22 },
      },
      {
        name: 'Two-Minute Drill',
        mood: 'Focused · Clear',
        terpenes: { Pinene: 78, Terpinolene: 55, Limonene: 40, Linalool: 18 },
      },
      {
        name: 'Overtime',
        mood: 'Calm · Heavy',
        terpenes: { Myrcene: 88, Linalool: 52, Caryophyllene: 44, Humulene: 20 },
      },
    ],
    cta: { label: 'Explore PRIMITIV', href: '#' },
  },
  dodi: {
    kicker: 'Dodi District',
    title: 'Beast Mode Shop',
    subtitle: 'Marshawn Lynch · Oakland',
    products: [
      { name: 'Beast Quake Pre-Roll Pack', meta: '5 × 0.5g', price: '$30', href: '#', hue: 110 },
      { name: '#24 Infused Blunt', meta: '1.5g', price: '$22', href: '#', hue: 140 },
      { name: 'Oakland Gold Flower', meta: '3.5g', price: '$45', href: '#', hue: 45 },
      { name: 'Skittles Run Gummies', meta: '10 pc', price: '$20', href: '#', hue: 300 },
    ],
  },
  vault: {
    kicker: 'The Vault',
    title: 'Collectible Locker',
    subtitle: 'Drag or hover a card to tilt it. Tap to flip.',
    cards: [
      { brand: 'Jeeter', name: 'Game Day', number: '00', rarity: 'Genesis', hue: 265 },
      { brand: 'Highsman', name: 'Ricky Williams', number: '34', rarity: 'Legendary', hue: 140 },
      { brand: 'PRIMITIV', name: 'Calvin Johnson', number: '81', rarity: 'Hall of Fame', hue: 220 },
      { brand: 'Dodi', name: 'Marshawn Lynch', number: '24', rarity: 'Beast Mode', hue: 95 },
    ],
  },
};
