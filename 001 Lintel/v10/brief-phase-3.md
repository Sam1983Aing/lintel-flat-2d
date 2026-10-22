# Brief: Phase 3, the house in code room by room (Lintel, iteration 6)

Written 14 Oct 2026 to start a fresh session. Read this first, then `brief-code-house.md` (the whole plan), `../CLAUDE.md`, `~/.claude/CLAUDE.md` and the memory index.

## Where we are

Sam's direction (14 Oct): every material in the house written in code instead of Poly Haven scans, lit as rooms, done segment by segment. His words: "I want all the elements encoded instead of using Poly Haven texture, with some lighting on it... go segment by segment."

- **Phase 0 done.** The four living room test looks are frozen in `v5b/` (`v5b/?look=now|code|light|codelit`). The code materials live in one library, `code-materials.js`. Two switches for any room in `house-looks.js`: `?code=` and `?lit=`, each a list of room ids or `all`.
- **Phase 1 done and approved.** Every indoor room lit as a room (its own 360 picture taken at load, reflections from its own box, two bounces, soft corners). Sam, after the walk door to bath: "it looks good". **It is now the page's default.** `?lit=none` gives the old light. Frozen as `v6a/`.
- **Phase 2 done, not yet re-reviewed.** The outside reviewer's faults in the living room's code are fixed (plank joints, the hearth's edge seam, trowel loops, firewood, leaves, bark). See the living room with `?code=living&at=1150`.
- **Phase 3 starts now**, with the entrance, the hall and the WC.

## First job: the first visit's loading time (before any new room)

Measured at the end of 14 Oct on Sam's Mac (busy at the time, so read them as large, not exact):
- A warm load (shaders already compiled once) is ready to draw in about 7 s with every room lit.
- **A cold load is not.** macOS keeps compiled shaders across browser profiles, so every test after the first one was warm. With a salt that changes every shader's code (`?salt=<any number>`, in `code-materials.js`), the lit house took **185 s** to be ready and lit plus the living room in code **298 s**. A first-time visitor gets the cold case.
- Not measured yet: the original page cold. The salt only touches the materials of `code-materials.js` and `house-looks.js`, not the base drawables.

What to do:
1. Measure honestly. Put the same salt into `drawable()` in scene.js (a hook) so the whole page can be loaded cold. Compare `?lit=none&salt=N` (the page as published), `?salt=N` (lit), `?code=living&salt=N`. Interleave the runs, the machine's load changes within minutes (`tools/look_numbers.py`, which now also reports `bootMs`).
2. Bring it down. Ideas in order of likely gain: compile with `renderer.compileAsync` (three r160 has it) during the loader instead of blocking; fewer shader programs (the lit copies add 89 programs to the base 148: the room lighting could live inside `drawable()` itself, driven by uniforms, so a lit material needs no program of its own); smaller code shaders (the cell loops `voro` 27 cells, `loops` 9 cells, `trowel` 9 cells, `sprig` 14 leaves, fbm loops up to 7 octaves all unroll on Metal).
3. Agree a budget with Sam (for example: the lit house cold no slower than the page as published today, plus a few seconds).

## Phase 3, room 1: entrance, hall, WC

Rooms: `entrance` (plan 11 to 19, 17 to 26, ceiling 4.8 m), `hall` (9 to 11, 17 to 26), `wc` (19 to 21, 17 to 26). Switch: `?code=entrance,hall,wc`.

Still scans there, and what to build:

| Material (M key) | Where | Scan | Code today? | Effective colour to match (linear) |
|---|---|---|---|---|
| `concreteIn` | entrance's east and west walls | wood_textured_concrete, tint 2.3 / 2.28 / 2.2, sat 0.3 | **new** (start from the living room's board concrete, paler) | about 0.363 / 0.340 / 0.299 |
| `plaster` | the other walls | white_stucco | yes | |
| `roof` | ceilings | white_stucco | yes | |
| `trav` | hall and WC floors (also the patio, the pool and the garden terrace later) | marble_01 as travertine tiles, tint 0.95 / 0.91 / 0.84, sat 0.68 | **new** | about 0.392 / 0.311 / 0.205 |
| `oakDoor` | the pivot door | oak_wood_planks, turned 90 degrees, tint 1.25 / 1.08 / 0.9, sat 0.55 | **new** (the living room's oak, grain upright) | about 0.376 / 0.218 / 0.135 |
| `oakConsole` | the console | oak, smoked, tint 0.82 / 0.62 / 0.46, sat 0.5 | **new** | about 0.241 / 0.126 / 0.072 |
| `oak` | the leaves of the side doors | oak | yes | |
| `walnut` | the bench | natural_walnut_veneer | yes | |
| `leather` | the bench's cushion | leather_red_02 | yes | |
| `concretePlain` | the piers beside the clerestory | wood_textured_concrete | yes (the fireplace's) | |

Already code there: the dark marble floor (`marbleDark`), the brass light bars, the black steel, the urns, the glass.

Two things the drawing asks for. The paper's hatch is drawn in world metres (`hatchOf` in scene.js), and the materials should agree with it:
- `concreteIn` has the `concrete` hatch: dots on a 60 cm grid, 30 cm in from the ground and the door's edges. Put the tie holes on that grid, as the facade's Tie Holes option does (`facade-options.js`).
- `trav` has the `stone` hatch: joints every 0.6 m one way and 1.2 m the other, rows offset. Lay the code travertine's joints on the same lines.

How to get each colour: measure the scan's mean albedo (the ffmpeg one-liner in the living room session: scale to 64 by 64 with area filtering, average in linear), then apply drawable's own maths: `mix(luma, scan, sat) * tint`, with luma weights 0.299 / 0.587 / 0.114. The table above was computed that way.

## The routine for every room (from brief-code-house.md)

1. Build the room's new materials in `code-materials.js` (add a `BUILD_CODE` entry per M key). Start from the scan's colour.
2. Stills: scan and code under the same light. `tools/review_stills.py <url> <out> --only 06,07 --size 1728x992 --dpr 2` for the rest views. For close-ups, generalise `tools/living_closeups.py` into a per-room tool (same `__cam` aid). Suggested entrance views, plan metres, `p: [x, y, eye]`, `look: [x, y, height]`: the board concrete wall `p [14.5, 22.5, 1.6] look [11.2, 21, 2.2]`; the pivot door from inside `p [15.2, 19.5, 1.6] look [14.3, 26, 1.6]`; the hall floor `p [10, 18.5, 1.4] look [10, 24, 0]`; the console `p [13.5, 22, 1.3] look [11.55, 21.5, 0.9]`; the WC `p [20, 18, 1.5] look [20, 24, 0.3]`; the ceiling and clerestory `p [15, 24, 1.6] look [15, 18, 4.6]`. Check they frame what they say before using them.
3. An outside reviewer scores scan and code blind (copy the stills into folders A and B, keep the key in a separate file, as in `teach/reviews/2026-10-14-living-looks-*`). Report its numbers as they are.
4. Blink check on the walk through the room (`tools/flicker.mjs`), frame cost (`tools/look_numbers.py`, interleaved with the scan version).
5. A short reel of the two for Sam: `tools/walk_offline.mjs <url> <out.mp4> --plan "..." --size 1728x992` records frame by frame, smooth even when the machine is busy. Then `node ~/.claude/skills/demo-options/scripts/reel.mjs reel.json` (phone clips are optional).
6. Sam says yes or what to fix. When yes, that room's code becomes part of the default (the default `code` list in `house-looks.js`, the way `lit` became `all`). Freeze the version, teach files.

## Order after the entrance (walk order)

Facade and forecourt (outside concrete with tie holes, gravel, oak fins: seen from 1 km up at the start, watch for blinking), kitchen and dining (mostly done, cabinet oak is new), patio and the big olive (travertine paving, `bark`, pool), gallery (`limewash`), master suite, dressing and bath (`larch` as pure code, `taupe` wool, wardrobes), garden and landscape (`lawn`, `ground`, the land, `gravel`, `drystone`, `barkFar`), then the rooms the walk never enters. Last: take the scans out of the download (41 files, 36.8 MB).

Open question for Sam, not urgent: the skies are Poly Haven too (two HDR panoramas and their JPGs). Keep them, or replace them with a sky written in code (the `3d-sky-background` skill)?

## What the living room taught (apply everywhere)

- The first version of a rule looks like the rule. Look at each material close up at Sam's window before moving on.
- A rule needs detail at every size, down to two pixels, or it reads as laminate. Contour lines of smooth noise read as drawings. Streaks at several sizes, cracks between cells, thresholded patches read as material.
- Dots and sparkles along joints and edges are steps in the relief height: ease each piece's own tilt back to nothing at its joint, and use `lkFlat()` to fade relief on the rounded edges of boxes. Relief slopes are capped in `TILT`.
- One height reading per pixel, slope from its screen derivatives (`lkSurfGrad`).
- Measure frame times uncapped and interleaved (memory: Headless recorder verification).

## Open notes from the reviews (shared by every look, not yet done)

The fire's light leaks onto the floor under the hearth's front (the hearth's point light has no shadow). The clerestory glass is not the brightest thing in the frame. The black vase reflects almost nothing. A pale sliver where each back cushion meets the seat. The rug's shadow side goes nearly black. The ceiling reads as one flat plane. These are not Phase 3, but worth listing for Sam when a room touches them.

## Practical

- Server: `python3 tools/serve.py` from `014 Flat 3D/` (port 8014), best run in a Terminal tab so it stays up. The in-app Browser pane only reaches a server the session starts itself (the `flat3d-looks` entry in `.claude/launch.json`, port 8016).
- Teach files: `teach/journal.md`, `teach/session-log.md` (next entry 84), `teach/decisions.md` (next row 160). Shots in `teach/shots/`, reviews in `teach/reviews/`.
- Rules: no em dashes, no semicolons in anything for Sam. Short plain sentences. Commit or push only when asked. Nothing published. The live page (`publish/lintel/`) is unchanged and does not know about `code-materials.js` or `house-looks.js` yet.
