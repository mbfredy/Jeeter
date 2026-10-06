# Jeeter · Game Day Kickoff: Interactive World

Each district is one of the campaign renders, brought to life in WebGL
(Vite + Three.js + GSAP). The renders stay photoreal; the app adds:

- **Isometric parallax.** Each render sits on a depth-displaced plane. Pointer
  tilt, idle drift, drag-to-pan and pinch/wheel zoom give a diorama feel.
- **Living surfaces** (shader, driven by a per-scene effect mask): water
  ripple and sun glints, flowing waterfalls, twinkling windows and string
  lights, pulsing LED screens and neon (Beast Quake green, PRIMITIV blue,
  Vault gold).
- **Effects:**
  - fireworks over the stadium, on a timer and in volleys on click
  - factory smoke from the PRIMITIV stacks, chimney smoke at the Highsman lodge
  - stadium light beams
  - gulls
  - a 3D Jeeter blimp with LED dot-matrix screens on both sides scrolling the
    Jeeter logo (from `public/brand/jeeter-logo.svg`)
- **Hotspots** with brand-logo markers. Hover glows the area; click flies in
  and opens that district's experience. Portal markers jump to neighbouring
  districts.

| District | Main action |
| --- | --- |
| Game Day Stadium | Light beams and a firework volley, then the YouTube launch video |
| Highsman | Lodge, Highsman sign, 34 Pavilion: athlete bio, wellness, soundbites |
| PRIMITIV | Factory, 81 Hall of Fame, lab: formulation explorer |
| Dodi | Clubhouse, #24 mural, Beast Quake (neon surges on hover): store drawer |
| The Vault | Zoom to the vault door, gold glow and sparkles: collectible card locker |

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in /dist
```

## Files

| Path | Role |
| --- | --- |
| `src/scenes.json` | **Per-scene layout**: hotspots (image coords 0–1), water/waterfall/neon regions, smoke emitters, blimp path, fireworks area |
| `src/config.js` | Logo URLs, YouTube ID, all modal copy and product links |
| `src/SceneView.js` | Photo plane with depth displacement and the effects shader |
| `src/CameraRig.js` | Pan / zoom / tilt camera and GSAP focus moves |
| `src/effects/` | Fireworks, smoke, light beams, gulls, LED blimp |
| `src/ModalManager.js` | Video modal, Highsman and PRIMITIV features, Dodi drawer, Vault locker |
| `tools/build_assets.py` | Builds `public/scenes/*` from `tools/src-*.webp` |
| `webflow/` | Webflow embed snippets |

## Updating art

1. Drop a render in `tools/` as `src-<scene>.webp` (`stadium`, `highsman`,
   `primitiv`, `dodi`, `vault`, or `map`).
2. Run `pip install opencv-python-headless numpy` once, then `npm run assets`.
   This upscales the render, writes `public/scenes/<scene>.webp`, and writes
   the effect mask `<scene>-fx.png` (R = water, G = waterfall, B = lights/neon).
3. Adjust hotspot positions in `src/scenes.json` if the composition changed.

**Full map hub.** Save the full-map render as `tools/src-map.webp` and run
`npm run assets`. The app detects `public/scenes/map.webp` and starts on the
map, with hotspots that dive into each district (already defined in
`scenes.json`) and a "Full map" button in the HUD. The static blimp in the map
art is painted out at build time and replaced by the animated one.

## Content to supply

All in `src/config.js`:

- `VIDEO.youtubeId`: the launch video. `?video=<id>` also works.
- Highsman soundbite audio URLs.
- Dodi product names, prices and checkout links (currently placeholders).
- PRIMITIV formulation data and CTA links.

## URL parameters and iframe API

- `?zone=stadium|highsman|primitiv|dodi|vault|map` opens on that scene.
- Parent page: `iframe.contentWindow.postMessage({ type: 'jgd:zone', zone: 'vault' }, '*')`.
- The app posts `{ type: 'jgd:scene' | 'jgd:district', id }` to the parent, for analytics.

## Performance

- About 1 MB of WebP per district, loaded on demand. Other districts
  prefetch during idle time.
- One draw call per scene plus pooled GPU particles.
- Rendering pauses when the embed is off-screen or the tab is hidden.
- `prefers-reduced-motion` disables drift and ambient fireworks and makes
  transitions instant.
