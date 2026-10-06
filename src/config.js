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
    jeeter: 'brand/jeeter-logo.svg',
    // bundled copies of the brand teams' Webflow-hosted logos
    highsman: 'brand/highsman.png',
    dodi: 'brand/dodi.png',
    primitiv: 'brand/primitiv.png',
  },
};

// Campaign launch video. Override per page with ?video=<YouTubeID>.
export const VIDEO = {
  youtubeId: params.get('video') || 'REPLACE_WITH_YOUTUBE_ID',
};

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
