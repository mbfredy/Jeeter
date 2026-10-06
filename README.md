# Jeeter · Game Day Kickoff: Interactive 3D World

Vite + Three.js (r169) + GSAP. A procedural, fully interactive version of the
Game Day Kickoff map: the Jeeter stadium at the centre, Highsman (Ricky
Williams) on the western hillside, PRIMITIV (Calvin Johnson) in the north-east
industrial quarter, Dodi (Marshawn Lynch) on the Oakland-style waterfront and
Jeeter's Vault on the marina, with the beach, bay and suspension bridge from the
composite key art.

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # static output in /dist
npm run preview
```

## Project layout

| File | Role |
| --- | --- |
| `index.html` | Mount point `#jgd-app`, preloader, HUD + quick-nav, every modal's DOM |
| `src/main.js` | Renderer, lighting, asset loading, world assembly, hover/click flow, render loop |
| `src/CameraManager.js` | GSAP camera flights (position + lookAt together, arced), OrbitControls limits, FOV per viewport |
| `src/RaycastManager.js` | Hover (mouse) and tap/click (touch) picking against `trigger_*` volumes |
| `src/ModalManager.js` | YouTube modal, Highsman feature, PRIMITIV lab, Dodi drawer, Vault card locker |
| `src/config.js` | **Edit here:** district coordinates, logo URLs, video ID, all modal copy, product links |
| `src/world/*.js` | Procedural districts, environment, water shaders, canvas textures, blimp/fireworks/coins |
| `webflow/` | Copy-paste Webflow embed snippets (iframe and direct) |

## Districts

| Zone | Trigger | Focus | Camera | Click opens |
| --- | --- | --- | --- | --- |
| Game Day Stadium | `trigger_stadium` | (0, 6, 0) | (0, 36, 68) | Fireworks + YouTube modal |
| Highsman | `trigger_highsman` | (-75, 8, -25) | (-48, 26, 20) | Athlete bio, highlights, soundbites |
| PRIMITIV | `trigger_primitiv` | (75, 6, -20) | (50, 22, 26) | Botanical lab / formulation explorer (hover spins the orbital rings) |
| Dodi | `trigger_dodi` | (45, 4, 60) | (24, 18, 96) | Slide-out store drawer (hover pulses the Beast Quake neon) |
| The Vault | `trigger_vault` | (-45, 4, 65) | (-28, 16, 96) | Vault wheel spins, door swings open, collectible locker |

Orbit limits: polar π/4 to π/2.3, distance 35 to 220, panning clamped to the
map. FOV is 45° on landscape and eases to 65° on portrait.

## Content to supply before launch

All of these live in `src/config.js`:

- `VIDEO.youtubeId`: the campaign launch video (11-character YouTube ID). Until
  it's set the stadium modal shows a "drops soon" card. `?video=<id>` overrides it per page.
- `CONTENT.highsman.soundbites[].src`: hosted MP3/M4A files. Empty entries render
  a disabled "Dropping on game day" row.
- `CONTENT.dodi.products`: names, prices and checkout URLs (currently placeholders).
- `CONTENT.primitiv.formulations`: terpene numbers are illustrative sample data.
- CTA links for Highsman and PRIMITIV.

## Brand logos

Logos are loaded from the Webflow CDN with `crossOrigin="anonymous"` so they can
be drawn into WebGL textures (coins, signage). If the CDN does not send CORS
headers, or the request fails, every surface falls back to a canvas-drawn
wordmark. The modals use plain `<img>` tags and are unaffected.

## Optional authored scene (GLTF + Draco)

Drop a Draco-compressed `public/models/gameday-master.glb` (or pass
`?scene=https://…/file.glb`) and it is loaded after the procedural world is up.
Naming conventions:

- `trigger_<id>`: becomes that district's click volume (rendered invisible)
- `district_<id>`: hides the procedural visuals for that district

The loader is code-split and only downloaded when the file exists.

## URL parameters

| Param | Effect |
| --- | --- |
| `?zone=<id>` | Fly to a district and open its experience after load |
| `?cam=<id>` | Frame a district without opening its modal (QA, screenshots) |
| `?video=<id>` | Override the YouTube ID |
| `?scene=<url>` | Load a different master GLB |

## Parent-page API (iframe)

```js
iframe.contentWindow.postMessage({ type: 'jgd:zone', zone: 'vault' }, '*');
iframe.contentWindow.postMessage({ type: 'jgd:overview' }, '*');
// the world posts { type: 'jgd:district', id } to the parent on every open
```

## Performance notes

- Repeated props (palms, pines, buildings, crowd, cars, rocks, umbrellas) are `InstancedMesh`.
- Static sub-trees have `matrixAutoUpdate` disabled. The shadow map is rendered
  once and refreshed only while the vault door animates.
- Hover raycasts hit only five primitive trigger volumes, once per frame.
- Pixel ratio is capped (2 desktop, 1.5 mobile) and drops automatically if the
  frame rate falls below ~45 fps. Rendering pauses when the embed is scrolled
  off-screen or the tab is hidden.
- Mobile gets smaller shadow maps and fewer instances.

## Webflow

See `webflow/embed-iframe.html` (recommended) and `webflow/embed-direct.html`.
`public/_headers` adds the CORS and caching headers that the direct embed needs
on Netlify / Cloudflare Pages.
