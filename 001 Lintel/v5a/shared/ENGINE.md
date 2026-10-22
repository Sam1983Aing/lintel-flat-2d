# The shared engine

Every page from 001 onward is three files (`index.html`, `theme.css`,
`scene.js`) sitting on top of this folder. The page describes its world and its
camera path. The engine does the rest: scroll, camera, labels, HUD, loader,
post-processing.

000 The Long Second is the odd one out. It has its own copy of everything in
`000 The Long Second/js/` and paints its textures in code, so it needs no image
files and opens by double-click.

## Files

| File | What it gives you |
|---|---|
| `fx-core.js` | Maths helpers, geometry (bevelled boxes with metre UVs, boulders, gable roofs live in the pages), batching, the texture and HDR sky loader, the PBR material factory. |
| `fx-post.js` | `FX.Finisher`: the photographic finish used by 001 to 003 (AO, bloom, DOF, ACES grade, vintage print, halftone, paper and ink drawing mode, postcard card mode). Opt in extras added for Lintel iteration 2: `post.shaftLight` (a shadow-casting DirectionalLight) with `P.shafts`, `P.shaftAmp`, `P.shaftDist` for sun shafts marched through its shadow map, `post.dustScene` with `P.sunDust` for dust drawn after the image, `P.inkTele` for ink edges through a telephoto lens, `P.zBase` to keep depth precision when the camera is far away, and global clipping planes respected in the normals and depth pass. Added for Lintel iteration 3: `P.grainPaper` (default 1, set 0 to keep the moving film grain off drawing regions so a paper sheet holds still). Added for Lintel iteration 4, both opt in and off for every other page: the constructor option `preMsaa` (samples for the normals and depth pass, read with linear filtering) and, with it, `P.inkAA` (1 draws ink edges that keep their place inside a pixel, so lines glide while the camera moves and hairlines fade by coverage instead of breaking into dots. It needs `preMsaa`, with a plain prepass it does nothing useful). `post.preMat` may be replaced by a page that wants to leave things out of the depth pass per pixel (Lintel does, for decor that is still paper). |
| `fx-paint.js` | `FX.PaintFinisher`: real materials seen through a paint filter that can be dialled from "oil painting" (`radius` 5) down to "film still" (`radius` 1.3), with light shafts (`shafts`, `shaftPos`), depth of field (`dof`, `focus`) and a woodblock print mode (`ink` key lines from depth, `posterize`). Anything in `post.dustScene` is drawn after the paint so it stays crisp: `FX.dust()` for specks, snow, petals or distant lit windows (`box` makes them wrap round a volume), `FX.streaks()` for rain lines, frozen or falling. Used by 004 to 006. |
| `fx-ink.js` | `FX.InkFinisher`: the clean finish used by 007 to 009. Ink lines where depth breaks (`inkDepth`) or surfaces crease (`inkNormal`), drawn on the near side only so every outline has one weight, gentle tone curve, paper fibre (`paper`), depth of field, the same after-paint dust pass. `FX.toon(color)` for flat colour with one soft shadow tone. `FX.hatch(material)` turns any lit material into pen hatching that keeps a steady stroke width on screen (call `FX.hatchUpdate(camera, height)` every frame). Set `ink: 0` for a clean render with no lines (009 does). |
| `fx-experience.js` | `FX.experience(cfg)`: the scroll film. |
| `fx-ui.css` | HUD structure. Each page themes it through CSS variables in its own `theme.css`. |

Libraries come from CDNs as classic scripts: three.js r160 (`three.min.js`),
GSAP 3.13 with ScrollTrigger, Lenis 1.1.14.

## The camera: keys

```js
{ id: 'hero', t: [x, y, z], yaw: 40, pitch: 3, fov: 5, frame: 66, roll: 0, hold: 36, go: 190 }
```

- `t` is the point the camera looks at. `yaw` and `pitch` (degrees) place the
  camera around it. `pitch` above zero looks down.
- Distance comes either from `dist` (metres) or from `frame` (the width in
  metres that fills the view). Give the hero a tiny `fov` and a `frame`, give
  the next key a wide `fov` and a similar `frame`: the engine interpolates fov
  and frame separately in log space, which is the dolly zoom that turns a flat
  plate into depth.
- `hold` is how long the camera rests on this key (vh of scroll). `go` is how
  long the travel to the next key takes. Keys with no `hold` are waypoints the
  path bends through (Catmull-Rom).
- `roll` tilts the horizon (dutch angle).

A key with a `hold` that a dossier points at becomes a stop with a label.

## Dossiers (the stops)

```js
{ no: 'I', kicker: 'Chapter', key: 'd1', anchor: 'harbour', title: ['The', 'harbour'],
  meta: 'one line under the title', label: { type: 'camera', tilt: 10, off: [1.2, 1.4] },
  fileMeta: 'shown in the side panel', text: 'side panel paragraph', facts: [['Wind', 'West, force 4']] }
```

- `anchor` names a point in `world.anchors` (returned by `build`).
- `label.type: 'camera'` keeps the label facing the camera, turned by `tilt`
  degrees. `'world'` pins it to a plane you give with `R` (right) and `U` (up)
  vectors. `off` shifts it in metres inside that plane.

## cfg for FX.experience

| Key | Meaning |
|---|---|
| `keys`, `dossiers` | as above |
| `build(ctx)` | async, builds the scene, returns `{ anchors, colliders, update(t, camera, st) }` |
| `frame(ctx, st)` | runs every frame before render. Set post values on `ctx.P` here. `st.sD` is the smoothed scroll in vh, `st.m` the scroll mapping, `st.flat` is 1 on the hero plate and 0 once inside |
| `camera(ctx, st, cam)` | optional last word on the camera sample (shake, look-around) |
| `intro(tl, ctx)` | adds hero reveal tweens to the load timeline |
| `hud(ctx, st)` | per-frame DOM choreography |
| `finisher(renderer)` | returns the post pipeline, for example `(r) => new FX.PaintFinisher(r)` |
| `post` | starting values for `ctx.P` |
| `beatKey` | a key during which the `#beat` interstitial line shows |
| `hints` | `{ hero, first, stop }` strings for the bottom hint |
| `options` | `renderScale`, `scrollScale`, `camWeight` (how heavy the camera follows), `parallax` (pointer), `fitAspect` (widen the lens on portrait) |
| `endFlat` | how flat the last key becomes (0 to 1) |
| `finaleRise` | vh of scroll after the last key before the finale section |
| `labelPadRight` | pixels a stop's title keeps clear of the right edge (default 16). Set it when a ruler or a counter stands there |

`ctx` has `scene, renderer, camera, post, P, K, KEY, C, LOW, reduced, cam,
world, W, H, vh, at(id, part), span(x, a, b), project, goTo, sampleKeys,
applyCamera, mapScroll, loader`.

## Materials and assets

```js
const set = await ctx.loader.set('../assets/tex/oak_wood_planks');   // { diff, nor, arm }
const mat = FX.pbr(set, { size: 1.2, color: 0xffffff, env: 0.5, normal: 1 });
FX.tweak(mat, { sat: 0.7, macro: 0.2, gain: 1.1 });                   // grade one material
const sky = await ctx.loader.sky(hdrUrl, jpgUrl, { sunAzimuth: rad }); // { env, bg, sunDir }
```

Geometry uses metre UVs (`FX.uvMetres`), so `size` is how many metres one tile
of the texture covers. Batch static meshes by material with `new FX.Batch()`,
`add(mat, geo, FX.M(x, y, z, rx, ry, rz, sx, sy, sz))`, then `build(parent)`.

Textures and skies are Poly Haven CC0, fetched by `tools/fetch_assets.py`
(add ids to its list and rerun). They land in `assets/tex/<id>/` as diff, nor
and arm JPGs, and `assets/sky/` as a 1k HDR plus a 4k tonemapped JPG.

## Running and checking

```bash
python3 tools/serve.py
```

Then open `http://127.0.0.1:8014/004%20The%20Last%20Keeper/` (spaces become
`%20`). Photo textures need the server because WebGL refuses `file://`
images. Add `?at=320` to jump straight to a scroll position in vh.

- `tools/shots.sh "<url>" <outdir> 0 200 400` rests on each position and saves
  a still, headless (1440x900, `SIZE=390x844 PHONE=1` for phone).
- `tools/check.sh "<url>" <outdir> 60` scrolls the whole page once with an
  on-screen counter for page errors, shaders that failed to compile and the
  frame rate, and saves the pass, a contact sheet and the last frame.
- `window.__checkPath()` in the console lists every point where the camera
  path passes through a collider box.
- `node tools/probe.mjs <url> steps.json [WxH]` loads a page headless, jumps to
  scroll positions, evaluates JS and saves stills, then lists page errors. Use
  it for measurements, key positions (`__rig.K`) and "zero errors".
- `python3 tools/walk_reel.py <url> out.mp4 [--phone] [--from KEY] [--to KEY] [--share]`
  records a walkthrough that rests on every stop, with the scroll plan built
  from the page's own keys.
- `node tools/flicker.mjs <url> "<at>:<step>:<frames>,..." [WxH] [dpr]` steps the
  scroll in equal steps at retina resolution and scores how much the picture
  flickers (grain, crawling edges, twinkling dots), plus frame time and render
  size. Step 0 is the stillness test.
- The Browser pane pauses rendering while hidden, so judge motion from the
  headless recorder: `node ~/.claude/skills/demo-options/scripts/record.mjs`.
