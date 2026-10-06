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
// Jeeter Game Day 2026 Official Short. Override per page with ?video=<YouTubeID>.
export const VIDEO = {
  youtubeId: params.get('video') || '3x26NitaGYg',
  start: params.get('video') ? 0 : 8,
  title: 'Jeeter Game Day 2026 Official Short (Feat. Marshawn Lynch, Calvin Johnson & Ricky Williams)',
};

// ---------------------------------------------------------------------------
// Campaign copy and assets, taken from the live drop page:
// https://www.jeeter.com/boutique-drop/gd-kick-off
// ---------------------------------------------------------------------------
export const DROP = {
  url: 'https://www.jeeter.com/boutique-drop/gd-kick-off',
  storesUrl: 'https://www.jeeter.com/boutique-drop/gd-kick-off',
  title: 'Jeeter Game Day Kick Off',
  tagline: 'The Season Starts Here',
  logo: 'drop/game-day-logo.svg',
  oneG: {
    label: '1G All-in-One Vapes',
    badge: 'California exclusive',
    headline: 'Three players. Three strains. One California-exclusive lineup.',
    copy: 'Game Day Kick Off brings Ricky Williams, Marshawn Lynch and Calvin Johnson’s signature strains to the 1G All-In-One. Featuring Sticky Ricky, Beast Quake and Megachron, each device pairs bold flavor with upgraded performance built to go from kickoff to the final whistle.',
    image: 'drop/1g-vapes.webp',
  },
};

const ATHLETE_BASE = { format: '2G XL All-in-One Vape', badge: 'New' };

export const CONTENT = {
  highsman: {
    ...ATHLETE_BASE,
    brand: 'highsman',
    athlete: 'Ricky Williams',
    strain: 'Sticky Ricky',
    type: 'Indica',
    copy: 'Sticky Ricky brings sweet mango up front, layered with earthy funk and a touch of spicy pine. Tropical and bold with a savory edge that keeps the profile balanced. Ricky Williams’ signature strain returns for another season, bringing a familiar favorite back to Game Day. Built to pair with the Ricky Williams Collectible Card and complete the Game Day Kick Off collection.',
    flavor: ['Sweet mango', 'Earthy funk', 'Spicy pine'],
    product: 'drop/2g-highsman.webp',
    card: 'drop/card-highsman.webp',
  },
  primitiv: {
    ...ATHLETE_BASE,
    brand: 'primitiv',
    athlete: 'Calvin Johnson',
    strain: 'Megachron',
    type: 'Indica',
    copy: 'Megachron leads with sweet berry flavor backed by earthy undertones for a smooth, balanced profile. Inspired by Calvin Johnson and built around the larger-than-life legacy behind Megatron. Built to pair with the Calvin Johnson Collectible Card and complete the Game Day Kick Off collection.',
    flavor: ['Sweet berry', 'Earthy undertones'],
    product: 'drop/2g-primitiv.webp',
    card: 'drop/card-primitiv.webp',
  },
  dodi: {
    ...ATHLETE_BASE,
    brand: 'dodi',
    athlete: 'Marshawn Lynch',
    strain: 'Beast Quake',
    type: 'Indica',
    copy: 'Beast Quake hits with bold berry and sweet blue raspberry, rounded out by earthy undertones for a smooth, full-flavored finish. Inspired by Marshawn Lynch’s legendary 67-yard run and one of football’s most unforgettable moments. Built to pair with the Marshawn Lynch Collectible Card and complete the Game Day Kick Off collection.',
    flavor: ['Bold berry', 'Sweet blue raspberry', 'Earthy undertones'],
    product: 'drop/2g-dodi.webp',
    card: 'drop/card-dodi.webp',
  },
  vault: {
    kicker: 'Collect ’em all',
    title: 'Three players. Three cards. One collection.',
    subtitle: 'Each Game Day Kick Off collectible unlocks a digital card inside the Jeeter Collector Series. Scan, collect, and complete the full lineup featuring Calvin Johnson, Marshawn Lynch, and Ricky Williams.',
    footer: 'Collect all three to complete the set.',
    hint: 'Hover or drag to tilt · Tap to flip',
    cards: ['primitiv', 'dodi', 'highsman'],
  },
};
