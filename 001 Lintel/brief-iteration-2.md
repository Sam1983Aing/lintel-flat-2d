# Brief: Lintel, room by room (iteration 2)

## Start here (for a new session)
You are in `014 Flat 3D/001 Lintel/`. The files next to this brief (`index.html`, `theme.css`, `scene.js`) are iteration 1: an elevation drawing that dollies into a paper model of Casa Serra, then four material reveals, orbiting the house from outside.

**First step:** copy iteration 1 into `001 Lintel/v1/` so the before state stays openable (in the copy, change `../shared/` and `../assets/` to `../../shared/` and `../../assets/`). Build iteration 2 in `001 Lintel/` itself.

**Read before coding:**
1. `../shared/ENGINE.md`, the engine every page uses (camera keys, dossiers, materials, running and checking).
2. `scene.js` of iteration 1, especially `drawable()` (line ~33). It patches any material so it can be paper plus architectural hatch until a reveal sphere passes over it, with the oxide construction line on the front. Iteration 2 reuses it per room.
3. `../000 The Long Second/js/main.js`, the `KEYS` array (line ~68). That is the camera language Sam loves: a 6 degree telephoto plate, a dolly zoom to 62 degrees, then a long flight along Z with rests. Iteration 2 should feel like that, indoors.

**Why this iteration exists (Sam, 26 and 30 Sept 2026):** The Long Second was the most cinematic because the camera travels deep along Z through layers. The three photo concepts (Lintel included) show the 3D but orbit one object, so they feel less immersive. Sam then asked for Lintel as a plan: "a blueprint of the house... when you scroll it creates each room... a virtual tour guide of the house. In the living room you have the flat view on top with all the dimensions, but as we scroll we can see it."

**Assets:** `../assets/tex/` has concrete (`wood_textured_concrete`), travertine (`marble_01`), charred larch (`black_painted_planks`), oak (`oak_wood_planks`, `old_wood_floor`), plasters (`white_rough_plaster`, `painted_plaster_wall`, `white_stucco`), `long_white_tiles`, `terracotta_floor_tiles`, `gravel_floor_02`. Missing and worth fetching with `tools/fetch_assets.py`: a linen or wool fabric, a bark for the olive tree, a honed stone for the bath. Sky: `kloofendal_38d_partly_cloudy_puresky` (used in iteration 1) or `qwantani_late_afternoon_puresky` for lower sun.

**Finisher:** iteration 1 uses `FX.Finisher` in paper mode (`paperOn`, `ink`, `inkReal`), which is what draws the plan. Keep it. The dust in the sun shafts comes from `FX.dust()` (in `../shared/fx-paint.js`), which needs the finisher to draw `post.dustScene` after the image. `FX.PaintFinisher` does that, `FX.Finisher` does not yet. Port the dust pass into `FX.Finisher` (render the dust scene into its own target, blur a copy for the halo, screen it over the image in the final pass, the way `fx-paint.js` does it). That is smaller than moving paper mode across.

### How Sam works (keep to this)
- Propose before building anything new. Checkpoints: build the first milestone, record a desktop reel with the headless recorder, send it, wait for his reaction, continue.
- For "give me options" on a section or transition, use the `demo-options` skill (three options behind a URL switch, recorded), not a written list.
- Keep `teach/journal.md` going (the `teachable-build` skill, journal mode). Short entries for decisions, turns in Sam's words, new techniques, teachable bugs.
- No em dashes and no semicolons in anything written for Sam, including chat replies and page copy.
- Verify with measurements and the headless recorder, not Browser pane screenshots (the pane pauses rendering when hidden). `tools/shots.sh` for stills, `window.__checkPath()` for camera collisions, an injected error counter for "zero errors".
- Commit or push only when asked. The project is not a git repo.

## The brief

### Core concept
Every house starts as a plan, so the page opens on one. Then you walk into it, and each room lifts off the paper as you step through its door.

### What Sam asked for
The architectural idea, but from the floor plan instead of the elevation: a blueprint of the house with its dimensions, seen flat from above. Scrolling becomes a virtual tour, room by room. In the living room you first see the flat view from the top with all the dimensions, then as you scroll you are standing in it.

### What we keep from the first Lintel
- Paper, ink and one oxide accent. Instrument Serif, Geist, Geist Mono.
- The drawing-to-material reveal: a room stays ink on paper until you enter, then the oxide line sweeps the real material across it (scanned concrete, oak, travertine, charred larch, plaster).
- Real Poly Haven materials, real sky, the photographic finish.

### What changes, and why
- **Top-down, not front-on.** The plan is the 3D model seen straight down through a very long lens. Wall tops render as solid black poché, floors as paper, furniture as outlines, door swings as arcs. Nobody can tell it is 3D until the camera tilts.
- **A walk, not an orbit.** The camera moves at eye height (1.6 m) through doorways and corridors, deep along Z. Doorways are natural wipes between rooms. This is the fix for Sam's note that the first three concepts orbited too much.
- **The drawing stays with you.** Dimension strings from the plan hang in the 3D room as thin ink lines at their real positions (like a measuring tape in the air), then fade once the room's materials have arrived.
- **Dust in the light.** Sun shafts through the windows, fine dust motes floating in them, drawn crisp on top. They give every room depth and a time of day.

### The house
A single-storey courtyard house, U-shaped around a patio with one old olive tree. One level keeps the walk simple and every room gets light from two sides.

**Scale (Sam, 30 Sept 2026):** it has to read as a house that costs millions, a celebrity house in the hills, with big spacious rooms, a big kitchen and dining. The page showcases this one house. So the first 190 m² sketch became about 950 m² (10,200 sq ft) inside, plus a three-car garage, with 3.6 m ceilings (4.8 m in the entrance gallery).

Rooms in walking order, with sizes:
| Room | Size | Notes |
|---|---|---|
| Entrance gallery | 8 × 9 m, 72 m² | 2.4 × 4.2 m oak pivot door, 4.8 m ceiling with a clerestory band on three sides |
| Living | 12 × 9 m, 108 m² | 4.5 m ceiling with a clerestory band (the late sun comes in over the guest wing), sunken lounge, concrete fireplace, glass sliding onto the patio |
| Kitchen and dining | 16 × 8 m, 128 m² | 5 m travertine island, a 6 m table for 14, three roof lights that put the sun on the table, a wine wall behind glass |
| Patio | 20 × 24 m | the olive tree, an 18 × 3 m pool along the open south side |
| Glass gallery | 3 × 24 m, 72 m² | art on the solid wall, patio and pool through the glass |
| Master suite | bedroom 10 × 9 m (90 m², clearly bigger than each 9 × 8 m guest suite), walk-through dressing 8 × 3 m, bath 8 × 6 m | bed against a charred larch wall (north), west glass for the low sun, linen, a stone bath sunk into the floor |
| Private garden | 21 × 9 m | the last stop of the walk (Sam: the tour should not end in the bathroom). Low sun, open to the valley and the sea. The camera rises from here back to the plan |

On the plan only (never walked, revealed in the return to the plan): media room, two guest suites, study and library, a three-car garage, staff and utility, powder room.

### Narrative arc (the scroll)
1. **The plan.** Full sheet from above: poché walls, room names with areas, dimension strings, north arrow, title block. "Every house starts as a plan."
2. **Into the hall.** The lens opens from the top view and tilts down into the entrance. The front door swings open along its drawn arc.
3. **Living room.** Top view first, all dimensions (12 × 9 m, 108 m²), then the camera drops in. Concrete, oak floor, a fireplace, low sun through tall glazing, dust in the shafts.
4. **Kitchen and dining.** Through the opening, along the long table. Travertine island.
5. **The patio.** Out through the sliding glass into the courtyard, around the olive tree. The sky arrives here for the first time.
6. **The glass corridor.** A long Z-axis walk with the patio on one side (the best depth moment of the page).
7. **Master suite and the private garden.** Charred larch wall, linen, a sunk stone bath, then out into the garden and the view over the valley to the sea. The walk ends outside, not in the bathroom.
8. **Back to the plan.** Up from the garden, through the roofless house to the same top view, now built: real materials, shadows, the olive tree, the pool of light in each room.
9. **Finale.** "Every building starts flat. Ours don't stay that way." Contact.

### Signature moments
1. **Plan to room.** Top-down telephoto drawing that tilts into eye-level perspective: the dolly zoom, but vertical.
2. **Rooms that materialise as you enter.** Ink to real material, one room at a time.
3. **Dimensions in the air.** The plan's measurements floating in the real rooms.

### Art direction
Paper #efebe2, ink #1d1d1f, oxide #b8452a. Warm low sun (late afternoon), white plaster, concrete, oak, travertine, charred larch, linen. Quiet, precise, calm. Labels read as drawing annotations (room name, area, dimensions).

### What this page refuses
- A 3D model spinning on a white background.
- A floor plan with hotspot pins you click.
- Rooms that just crossfade.
- Orbiting the house from outside.

### Build plan, with checkpoints
1. Plan view and the tilt into the hall. Send a reel.
2. Living room and kitchen with the reveals and the dust. Send a reel.
3. Patio and the glass gallery. Send a reel. (Sam, 30 Sept: split the last checkpoint in two.)
4. Master suite, the private garden, the return to the plan, finale. Send reels, desktop and phone.
