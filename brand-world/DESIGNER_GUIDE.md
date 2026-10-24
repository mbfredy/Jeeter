# Designer guide: Blender to brand world

The app reads your object **names** and **custom properties** and builds the interactive world from them. No code needed. One scene = one `.glb` file.

## 1. Name your objects

Names are lowercase with underscores. Anything else is treated as decoration.

| Name | What it does | Custom properties |
|---|---|---|
| `spawn_main` | Where the visitor starts. Use an Empty. Exactly one per scene. | none |
| `nav_walkable` | Flat mesh covering everywhere people may walk. Invisible in the app. | none |
| `collider_<anything>` | Invisible wall or block. Use simple boxes. | none |
| `zone_<anything>` | Invisible trigger box. Walking in can preload the next scene. | `preload` (optional): scene ids, comma-separated |
| `hotspot_<anything>` | Something people click or tap. | `action`, `contentId` |
| `screen_<anything>` | Plays a video. Must be UV-unwrapped. | `mediaId` |
| `door_<anything>` | Takes people to another scene. | `target` |
| `plot_<anything>` | Reserved for later. Safe to include; does nothing yet. | none |

Values for `action`: `openPanel`, `playVideo`, `loadScene`, `link`, `collect`. Ids for `contentId`, `mediaId`, `target` and `preload` come from the content owner (they live in `district.json` and `copy.json`).

Tips:
- Keep `nav_walkable` slightly larger than the floor area you want and cut holes where people should not go. Colliders are subtracted automatically.
- Collider and zone meshes can be low-poly boxes; they are never seen.
- Hotspots, doors and screens don't block walking. Put a `collider_` box around anything people shouldn't walk through (kiosks, counters, props).
- People can use a hotspot, door or screen from up to 2.5 m away (keyboard E, the on-screen prompt, or the A button on Quest). Leave walkable floor within that distance of each one.
- Blender's `.001` suffixes are fine (`hotspot_kiosk.001`).
- Lighting: bake it into textures. The app adds no shadows.
- Don't rely on object scale for anything; the optimizer may rewrite it.
- Group decoration under one Empty per building or area (e.g. `theater`, `plaza_props`). The optimizer merges each group by material so Quest and phones can draw it fast. Don't group the whole map under one Empty.
- The placeholder district marks where your pieces go: `blockout_plinth_*` for sculptures and centerpieces, `blockout_sign_*` for signage. Replace them with your art.

## How your art is seen

The same scene is shown three ways, so model for the closest one:

| View | Where | Camera |
|---|---|---|
| Overview | Phone and desktop (default) | Isometric, from high above, about 40 m across the screen |
| Street view | Phone and desktop (toggle) | First person at **1.6 m eye height**, looking anywhere |
| VR | Quest | Tabletop miniature, or walk-in at 1:1 scale with eye height = the visitor's real height |

What that means in Blender:
- **Work in real-world scale: 1 Blender unit = 1 metre.** Doors about 2.2 m tall, counters about 1 m, steps 15-18 cm. Wrong scale is very noticeable in VR.
- **Everything at eye level gets inspected up close** in street view and VR: storefronts, signs, kiosks, benches, the fountain. Spend detail and texture resolution there.
- **Roofs and tops of tall things are mostly seen from above** in the overview. Keep them clean and readable, not detailed.
- **Background (skyline, bridge, water)** is seen only from far away. Keep it very low-poly.
- **`spawn_main` sets where people start and which way they face** in street view and VR. Point the Empty's green **+Y** axis where they should look.
- Leave **at least 1.2 m** of walkable floor in front of anything interactive, and don't block sightlines to doors at eye height.

## 2. Add custom properties

1. Select the object.
2. Properties panel > **Object Properties** (orange square) > **Custom Properties** > **New**.
3. Click the gear on the new property: set **Type** to **String**, **Property Name** to e.g. `action`, **Default Value** to e.g. `openPanel`.
4. Repeat for each property (`contentId`, etc.).

Use Object properties, not Mesh data properties.

## 3. Export settings (File > Export > glTF 2.0)

- **Format**: glTF Binary (`.glb`)
- **Include**: check **Custom Properties**. Without it, nothing interactive works.
- **Include > Limit to**: leave **Visible Objects** unchecked, so collider/nav/zone objects you hid in the viewport still export
- **Transform**: +Y Up on
- **Data > Mesh**: Apply Modifiers on, UVs on, Normals on
- **Data > Compression**: off (the pipeline compresses)
- **Animation**: off unless agreed
- Textures: PNG or JPEG, at most 2048 x 2048

Save to `brand-world/content/<drop-id>/scenes/<scene-id>.glb` (for example `content/rolled-fresh/scenes/plaza.glb`).

## 4. Budgets

Per scene: at most **100,000 triangles** (invisible nav/collider/zone meshes don't count), textures at most **2048 px**, and at most **8 MB** after compression. Quest headsets run the same files, so stay well under where you can.

## 5. Run the validator

From the `brand-world` folder:

```bash
npm install          # first time only
npm run assets:validate
```

It lists every problem in plain language, with the object name and the fix. For example:

```
✖ content/rolled-fresh/scenes/plaza.glb: "hotspot_kiosk" is missing the custom property "contentId". In Blender: select the object, open Object Properties > Custom Properties, click New, set the name to contentId and type String.
⚠ content/rolled-fresh/scenes/plaza.glb: "Hotspot_kiosk" looks like it should be a hotspot_ object but does not match the naming rules ...
```

Errors (✖) block the build. Warnings (⚠) don't, but fix them anyway. To see your scene in the app: `npm run dev`, then open http://localhost:5173.
