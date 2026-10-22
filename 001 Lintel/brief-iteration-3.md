# Brief: Lintel, the polish (iteration 3)

> Iteration 3 closed on 9 Oct 2026 and is frozen in `v3/`. The current brief is `brief-iteration-4.md`. This file stays for its lists of traps and tools, which still hold. Its line numbers are out of date.

## Start here (for a new session)
You are in `014 Flat 3D/001 Lintel/`. The files next to this brief (`index.html`, `theme.css`, `scene.js`) are **iteration 3, in progress**. It is the polish of the plan you walk into. The concept is settled and Sam likes it. Do not redesign it.

| Folder | What it is |
|---|---|
| `001 Lintel/` | Iteration 3, work here. `scene.js` (architecture, reveals, camera), `staging.js` (furniture, decor, art, lamps, planting), `hero-options.js` (the type, loader and hero switches), `light-options.js` (the three light looks behind `?light=`) |
| `001 Lintel/v3a/` | Iteration 3 as Sam reviewed it on 9 Oct 2026, frozen with its own engine copy. The "before" for the review pass. Never edit it. |
| `001 Lintel/v2/` | Iteration 2, frozen on 1 Oct 2026 with its own copy of the engine in `v2/shared/`. The "before" for everything now. Never edit it. |
| `001 Lintel/v1/` | Iteration 1 (the elevation that orbits a house). History only. |
| `001 Lintel/recordings/` | Every reel sent to Sam, checkpoint by checkpoint |

Run it: `python3 tools/serve.py` from `014 Flat 3D/`, then `http://localhost:8014/001%20Lintel/`. Add `?at=1100` to jump to a scroll position in vh. v2 is at `/001%20Lintel/v2/`.

**Read before coding, in this order:**
1. This brief.
2. `brief-iteration-2.md`. Still the spec for the concept, the house (room sizes, materials) and the narrative arc.
3. `../shared/ENGINE.md`. Camera keys, dossiers, the finisher options added for this page.
4. `../teach/journal.md`, the entries tagged `l2` and `l3`. They say why each thing is the way it is, including every bug that cost time.
5. The map of `scene.js` below, then the code.

## The page in one paragraph
Casa Serra is a 946 m² courtyard house above Sintra. The page opens on its floor plan, which is the real 3D model cut at 1.2 m and seen straight down through a 3 degree lens from 1.2 km. Scrolling opens the lens (the walls rise), glides down to a 2.4 × 4.2 m pivot door, and walks the house at eye height: entrance, living room (seen first as a plan from above, then dropped into), kitchen and dining, out to the patio with the old olive (the sky arrives), the 24 m glass gallery, the master suite, the private garden over the valley to the sea. Each room is ink on paper until you step in, then an oxide line sweeps the real material across it. The plan's dimensions hang in the air of each room, then fade. At the end the camera spirals up to the opening frame, now built, and the finale rises.

## The review pass of 9 Oct 2026 (read this first, it is the newest)
Sam walked the page and sent ten screenshots with seven notes and a bar: at least eight out of ten on each. His words are in `../teach/session-log.md` (block 5). What was done is in `../teach/journal.md` (all entries of 9 Oct) and scored by an outside reviewer in `../teach/reviews/`. In short:
- **Plan.** Every cut wall has a solid lid that rides under the cut plane (`buildCaps`), so the plan has one line weight and no longer changes as the view tilts. Room labels were moved clear of furniture.
- **The scan follows the camera.** New rule, from Sam: beside and behind you is real, everything still ahead on the walk is a drawing until you get there, even through glass. The patio, the gallery and the garden have their own waves again (the garden's runs while you stand in the bath). This replaces the 5 Oct rule "a window never shows a drawing", which was Claude's reading.
- **Rooms.** Master bedroom, bath and private garden restaged, each with a new stop. Cloth tints work now (they were all grey), small objects get contact shadows once their room is real, the bath's mirror has a real reflection (`buildMirror`).
- **Ending.** The house stays built while the camera lifts, then a roll of paper opens across it and leaves the drawing (`roll()`, `.roll` in `theme.css`). The last rest is 127 vh long and `finaleRise` is 217 so the closing section waits for it.
- **Light.** Warm Afternoon is the default (`light-options.js`). `?light=off` gives the old light. Sam has still not picked an hour.
- **Scores.** Outside reviewer, strict: 3.7 before, 6.8 after pass 1, 7.4 after pass 2 (plan 7.25, scan 7.75, gallery 7.5, bedroom 7, bath 7.5, garden 7.5, ending 7). A third pass followed and was not scored. Sam asked for 8, so this is not there yet by the reviewer's count.
- **Reels of the pass:** `recordings/lintel3-review-2026-10-09-share.mp4` (desktop), `-phone-share.mp4`, and the sheet `-before-after.jpg`. They were made frame by frame with `tools/walk_offline.mjs`, because a Blender render in another session held the GPU all night.
- **Frame rate, checked live on 9 Oct (afternoon), once the Blender render had stopped:** four runs of the whole walk with `tools/walk_reel.py` gave 42, 50, 55 and 59 frames a second. The machine was still not idle (load 7 to 14), which is the spread. In the best run the longest gaps were 129 and 117 ms, the rest under 50, and the freezes fell at different moments in each run, so there is no hitch built into the page. On 6 Oct the same reel gave 60. Geometry per frame went from about 3.3 to 3.8 million triangles (4.8 in the garden, 4.7 in the bath with its mirror).
- **Open after this pass:** what round 2 still lists (`../teach/reviews/2026-10-09-pass2-review.md`): bedding and lamps in the bedroom, the top view just before the roll, the tube's own look, ink edges that break into dots while the plan opens (that part lives in the shared finisher), a few titles. Then Sam's reaction to all of it, three readings of his to confirm (the roll at the end of the scroll, the garden scanned through the bath's glass, Warm Afternoon as default), the loader pick, the light pick. Then final reels, freeze into `v3/`, the teachable extract.

## Where iteration 3 stood before that (5 Oct 2026)
Sam, after the full walk of iteration 2: "I think we have a really strong iteration. I like the visual, and I think we can polish it further and bring it to the next level."

**Done in iteration 3 (1 Oct):**
- The plan sheet is a still, crisp drawing. Grain and depth of field are off while the view is a plan, the camera is locked while it looks down, the gravel is stippled once into the drawing texture, trees outside the house stay out of the ink pass, the 3D renders at full retina resolution. Measured: zero pixel change frame to frame at rest.
- No roof ever shows from above on the way down. The cut plane holds just under the ceilings until the camera is below every roof, then the entrance closes over you once you are through the door.
- A gliding approach over the forecourt (key `approach`), bigger dimension numbers, labels moved off the furniture.
- Materials up close: each room name is its own sharp label on the floor, the living room tree is a small potted olive, the olive crowns break into clumps with two-tone leaves, the land has green and dry patches, a grove of 150 olives, a dry-stone wall at the edge of the hill, and focus is set per stop.
- Before and after sheet: `recordings/lintel3-materials-before-after.jpg`. New opening reel: `recordings/lintel3-opening-desktop.mp4`.

**Sam's review of 5 Oct (evening) changed the order.** He walked the page in his Chrome and sent two rounds of notes. His words are in `../teach/journal.md` (entries of 5 Oct tagged `l3`). In short: the hero feels weak, the house is "a five everywhere" and has to reach a nine, and the page must end on the same ink plan it starts on.

**Sam's picks of 6 Oct** ("it might not be my definite choice, so keep those options available"):
- **Font and accent: Stencil** (Saira Stencil One, signal orange #f0500f). It is the default. The others stay behind `?type=azulejo | redline | olive | brass`, and `?type=classic` is the first serif with the oxide accent. Sheet: `demo/hero/type-options.jpg`. `theme.css` still holds the classic values, `hero-options.js` lays the pick over it.
- **Fill: Laid.** It is the default. The others stay behind `?fill=level | section | circle`. Clips in `demo/fill/clips/`.
- **Loader: no pick yet** ("don't add any loader for now"). The page keeps its first loader, set in the stencil face. The three candidates stay behind `?loader=dimension | lintel | datum`, each followed by the drawn opening. `?hero=draw` is the drawn opening behind the first loader. Whether the drawn opening becomes the default is still open: ask him.
- A clip of the page with these defaults: `demo/picks/stencil-laid-share.mp4`.

**Fixed directly on 5 Oct (no switch):**
- Reveal groups. Each wave now carries a room's side rooms and whatever lies behind its glass, and the world outside turns real when the front door opens. Rule: beside and behind you is real, ahead on the walk is a drawing, a window never shows a drawing. Six waves: entrance, living (with patio, gallery, study, library, guest suite), kitchen (with wine, media), bedroom (with garden), dressing, bath.

- **Blinking**, measured with `tools/flicker.mjs` (numbers in the journal). No film grain on paper (`P.grainPaper`), shadow map on demand, trees hidden until their zone turns real, no stipple, cars as plan symbols, thin bronze out of the plan's edge pass, and two fixed pixel budgets in `frame()` in place of the engine's stepping render scale.
- **The ending.** From the garden every reveal runs backwards and the cut plane returns, so the last frame is the ink plan of the first frame. The "as built" view from above is gone (the key is still called `asbuilt`).
- **Staging**, all in `staging.js` (new). Furniture joins the ink pass, decor is hidden until its room turns real. See the journal for the list. The bath's sunk tub became a freestanding one. The patio olive is tighter (`tight` argument of `olive()`).
- **Materials and exposure.** Floors, woods and cloths retinted, a soft sheen on floors, less haze and exposure indoors.

**Order for what is left:**
1. **The loader and the drawn opening**: his pick is still open. Do not remove the other type and fill options, he asked to keep them. Bring Stencil and Laid to full quality (phone, reduced motion, a hard flick of the scroll).
2. **A second pass on staging and materials with his eyes on it.** I judged it from stills only. Known weak spots: the dining room's west half still washes out in the sun, the olive stop glares, the dressing room is bare, the garden stop itself shows mostly the water trough, the sky through the bath door reads as a white board.
3. **Light and atmosphere.** Built as three recorded looks on 6 Oct (evening), waiting on Sam's pick. All in `light-options.js`, behind `?light=warm | golden | passes` (Warm Afternoon, Golden Hour, The Afternoon Passes). Without the switch the page is unchanged. Reels: `demo/light/light-options-desktop.mp4` and `-phone.mp4`, clips in `demo/light/clips/`, recorded with `demo/light/record.sh` (dining table to garden, 32 s). How it works and what it found is in the journal (6 Oct, `l3`): the light is a function of the sun's height (`HOURS`), a look is a clock, and the glare came from the sun being in the sky map as well as in the light (`capSky`). After his pick: make it the default, decide whether the cap on the sky map's sun moves into `scene.js` for good, then redo item 2 in the new light.
4. **Hero drawing discipline** (my own list, he did not object): labels that collide, soft small text, line weights, the plan cropped at the bottom. The cars are done.
5. **Phone.** The drawn opening and the fills were checked on a phone-sized screen. The staging was not. A thin curved line shows at the top of the phone hero (it was there before this session).
6. **Remaining shimmer.** Wall poché edges still step a little while the plan zooms (4 sample anti-aliasing). The ink edge lines are hard edged by design of the shared finisher. A softer edge pass would be an opt in change in `shared/fx-post.js`.
7. **Final reels**, then freeze into `v3/` and run the `teachable-build` skill in extract mode.

**Known small things (fix along the way, none is urgent):**
- Looking toward the sun under the olive, the trunk reads pale and the travertine glares.
- One grove olive looks bare from straight above on the built plan.
- Ceilings read as flat gray.
- Walking through the pivot door, the open leaf fills a third of the frame for a moment.
- In the living room two floating numbers ("6.00" and "12.00") overlap from the stop's angle.
- The gallery's first painting reads as a dark smear in the haze.
- The garden olive (west end of the lawn) is out of the sea view.
- The dressing room passes quickly.
- Phone: the plan is small and a little specky, the living room plan view is cropped.
- The dimension lines and door arcs on the floor (still in the big texture) are soft up close. The room names are fixed.

## Sam's rules for this page
These came from him. Break one and he will notice.
- **The scan follows the camera** (9 Oct, replaces "no outline left behind" as written on 5 Oct). Nothing ahead on the walk is finished before you get there, even behind glass. What is beside and behind you is real, and rooms the walk never enters turn real with a neighbour, so no outline is ever left behind.
- **At least eight out of ten** on anything he gives a note on. Have it scored by an outside reviewer on stills, not by yourself.
- **No circle.** The fill from drawing to material must not read as a round shape growing.
- **Start and end on the same drawing.** The ink plan opens the page and closes it.
- **A million dollar home staging.** Decoration, art, light fittings, planting. An empty room with one piece of furniture reads as below average.
- **The loader is one thing**, clean and about architecture. Not three levels of text.
- **The plan is a blueprint with super clean lines.** It must hold perfectly still at rest. No noise, no shimmer, no stray specks. Check with the frame difference test below after any change that touches the top view.
- **Continuous motion from the sheet to the door.** The roofless blueprint all the way down. Nothing may pop: no roof appearing, no black slab, no wall jumping.
- **A house that costs millions.** Big rooms, tall glass, few and good materials. When in doubt, more space and less clutter.
- **The walk ends in the garden**, never in a bathroom, and the master bedroom is clearly bigger than the guest suites.
- **Numbers mean nothing without a picture.** When talking sizes with him, translate them (a living room the size of a two-bedroom flat).
- **Keep a history.** Freeze the working version into its own folder before a new round (copy the three files and the engine into `vN/shared/`, as v2 was done).

## How Sam works (keep to this)
- Propose before building anything new. Build in checkpoints, record a reel with the headless recorder, send it, wait for his reaction.
- For options or improvements on a section, a transition or a look, use the `demo-options` skill: three options behind a URL switch, recorded next to the current version on desktop and phone. A fix with one right answer can be done directly and shown as before and after.
- Keep `../teach/journal.md` going (the `teachable-build` skill, journal mode, tag `l3`). Short entries: decisions, his words, new techniques, teachable bugs, where each "before" lives.
- No em dashes and no semicolons in anything written for him, chat included. Plain first person.
- He is visual. Send reels and stills, not descriptions. He watches in his own Chrome on a retina screen.
- Verify with measurements and the headless tools. The Browser pane reports a zero viewport height when hidden, which turns the scroll position into NaN and floods the console with errors that are not real.
- Commit or push only when asked. The project is not a git repo.
- Update `../PROGRESS.md` when the state changes.

## Map of `scene.js` (1,640 lines)
Plan coordinates: x east, y south, metres, origin at the north-west corner of the house. World: `X = x - 30`, `Z = y - 24`, Y up. So north is `-Z`.

| Line | What |
|---|---|
| 33 | `ROOMS`. Rectangles `[x0, y0, x1, y1]`, ceiling height `h`, wall material overrides, `clerestory`, `skylights`, label position. Walls, floors and roofs are generated from this table. |
| 62 | `OPEN`. Every doorway, door, glass run and the pivot door, as intervals on wall lines (`axis 'h'` is a line along x at `y = c`). |
| 113 | `RU`, `ROOM_GLSL`. The room table as uniform arrays shared by every material. Each pixel finds its room from its world position, nudged along its normal. `uRV[i]` is that room's reveal, `uXV` is "everything outside". |
| 143 | `drawable(mat, hatch, opts)`. Patches a standard material so it is paper plus hatch until its room's reveal sphere passes, with the oxide ring on the front. Options: `room` (force a room or `'ext'`), `glass`, `noCap`, `alphaMip`, `side`. |
| 251 | `KEYS`. Two kinds: far-target keys (hero to drop) and walking keys from `pass` on, whose target sits 2.5 m ahead of the lens and which carry an explicit `focus`. |
| 292 | `DOSSIERS`. The seven stops with their labels and side panel copy. |
| 353 | `drawPlan()`. Dimension strings, grid bubbles, door swings, gravel stipple, olive symbol, north arrow, title, as one 4096 ink texture lying on the ground (2 cm a pixel). |
| 519 | `tubeGeo`, `olive()`, `sprigTex()`. The olive trees. `arc` keeps a tree's stems inside an angle. |
| 615 | `SITE`, `terrH()`, `terrain()`. Flat site, hills to the north, the drop to the valley and the sea just past the garden wall. |
| 659 | `build()`. Materials `M` (684), wall generator (732), glass by what it looks onto (779), floors and roofs (876), land (941), trees and grass (978), furniture (1103), plan drawing (1222), room name labels (1247), sun (1293), dimensions in the air (1312), dust (1420), reveal origins (1444). |
| 1474 | `AIR`. Haze density, exposure and haze strength by the room the camera stands in. |
| 1477 | `frame()`. The cut plane schedule (1482), room reveals, roofs off for the ending (1534), glass state (1540), dims and dust fades, focus (1594), finisher values. |
| 1608 | `camera()`. Locks the camera while it looks straight down. |
| 1624 | Phone framing of the plan, then `FX.experience({...})`. |

Current stops in vh (they shift whenever a key is added, so read them from the page, see Tools): hero 0, door 349 to 425, hall 519, living plan 825, living 1097, dining 1360, patio 1615, olive 1811, gallery 2074, gallery end 2321, bedroom 2550, bath 2848, garden 3018, built plan and the roll 3366 to 3494, page end 3603. Line numbers in the table above are from 5 Oct and have moved: search for the names.

## Things that cost time (do not rediscover them)
**The paper pipeline**
- In the scene buffer, alpha is the paper mask and, where alpha is 1, the red channel is the amount of hatching ink. So the clear colour must be black with alpha 1 (paper, no hatch), and anything that adds colour over a paper pixel turns into ink.
- Glass does exactly that. Each pane belongs to what it looks onto (`paneFor`), and `glassState` switches its blending: drawn glass writes paper itself, real glass only adds over real pixels. Rooms not yet visited then stay clean drawings behind real glass.
- Ink on top of both paper and real surfaces (dimensions in the air) uses one blend: source factor = destination alpha.
- Landscape must stay off the paper sheet: no hatch and `userData.noPrepass = true` (trees, grove, dry-stone wall, lavender). Architecture and furniture join the ink pass.

**The cut plane**
- It is a global clipping plane (`cutPlane`), also respected by the finisher's normals and depth pass. It is not applied in the shadow pass, so roofs keep casting shade when they are cut away. The ending relies on that, and there the roofs are hidden with `colorWrite = false`.
- Back faces seen through the cut are drawn as solid ink (poché) while `uCutOn` is 1. Never let the cut rest inside a roof slab while the camera can see it from above: that is the black roof Sam saw. Roof slabs sit at 3.0, 3.6, 4.5 and 4.8 m, each 0.33 m thick.
- Leaf cards, the grove and indoor trees use `noCap`.

**Telephoto**
- Half-float depth is only good to about 0.1 percent. From 1.2 km that is a metre, and the edge detector draws it as contour lines. `P.zBase` stores depth relative to a base near the target. `P.inkTele` judges depth steps by pixel size. Ambient occlusion fades out past 90 m.
- Anything procedural per pixel (stipple, fine hatch) shimmers through a 3 degree lens. Draw it into a texture.
- A step of a few centimetres at the edge of two ground meshes becomes an ink line across the sheet. The terrain meets the site at 3 cm.
- Alpha-tested leaves vanish from far away unless alpha is boosted by mip level (`alphaMip`).

**The camera**
- The engine orbits a target. With a target 10 m away, turning the view swings the camera sideways into walls. Walking keys keep the target 2.5 m ahead and set `focus` by hand.
- Run `__checkPath()` after any key change. Ignore hits with id `roof`.
- Key ids (`patio`, `gallery`, `bedroom`, `bath`, `garden`) also exist in `ROOMS`. Match `{ id: 'patio', t:` when editing keys by script.

**Light**
- The sky's own sun is at 19 degrees, too low to reach into rooms. The key light keeps its bearing (west south west) but stands at 32 degrees. The living room faces away from it, so its light comes from a clerestory above the guest wing. The kitchen has three roof lights.
- Sun shafts are marched through the shadow map in the finisher. They only read when the camera looks toward the light. A room that is all sun (gallery, patio) needs very little haze or it washes out, hence `AIR`.
- A view is about what the foreground lets you see. The valley only showed once the hill dropped right past the garden wall.

**Materials (Poly Haven)**
- `white_rough_plaster` is a peeling wall. Walls use `white_stucco`.
- `rough_linen` is dyed blue. Use its weave with saturation 0 and tint it.
- `wood_textured_concrete` and `pine_bark` are dark. They are lifted with linear colours above 1.
- The site ground runs under the house. Sunken areas (lounge, pool, bath) need holes in it.

**Zones and first use**
- Landscape and decor sit in `zones` and are hidden until their zone's reveal is above zero. Anything hidden at load is first drawn mid-scroll, and that frame pays for its shaders and buffers. `precompile()` (returned by `build`) draws one full frame at load with everything showing. Keep it when adding zones.
- The shadow map is drawn on demand (`shadowMap.autoUpdate = false`). It is refreshed when the door moves or a zone appears. Anything new that moves and casts a shadow must set `renderer.shadowMap.needsUpdate = true`.
- Run the stillness test on the page without switches too (`20:0:8,372:0:8,3404:0:8` must all read 0.000). A fill option can hide a fault of the default.

**The shared engine**
- `../shared/` is used by every page from 002 up, and 003 Hotel Kyma patches `FX.Finisher` and `FX.dust` with its own uniforms. A name clash there broke 003 for a whole day without anyone noticing. After any edit in `shared/`, load every page headless and read the problem list (command below). New finisher options must be opt-in and are documented in `ENGINE.md`.
- `v2/` has its own engine copy, so it is safe from this.

**Recording**
- A headless Chrome sometimes hangs at start when another session is recording (no output, almost no CPU). Kill your own tool and its Chrome (check the parent pid and the `--user-data-dir` name first) and run it again. On macOS there is no `timeout`: use `perl -e 'alarm shift; exec @ARGV' 90 node tools/probe.mjs ...`.
- Other sessions sometimes record at the same time. If the recorder reports under 45 frames a second or gaps over 300 ms, wait and record again. Do not kill Chrome processes you did not start.
- The session scratchpad does not survive a new session. Tools that matter live in `../tools/`.
- A recorder that hangs keeps its output pipe open. `$(sh record.sh | tail -1)` then waits for ever, even after an alarm killed the shell. Write the output to a file and stop the recorder and its Chrome from a watchdog, as `demo/light/record-clean.sh` does. It also repeats a take until it is clean (55 frames a second, no gap over 100 ms).
- Stutter in a clip: run `ffmpeg -i clip.mp4 -vf freezedetect=n=0.0005:d=0.12 -f null -` on two takes. Freezes at the same second are the page. Freezes at different seconds are the machine (check `sysctl -n vm.loadavg`).

## Tools
New on 9 Oct: `DPR=2 node tools/probe.mjs ...` takes stills at retina size. `CROP=x,y,w,h node tools/flicker.mjs ...` scores one part of the screen. `python3 tools/walk_takes.py <url> <out.mp4> [--phone] [--share]` records the walk in stretches and keeps the cleanest take of each (use it when another session is rendering). `python3 tools/before_after.py` builds a captioned before and after sheet. In the page's console: `__cam = { p: [x, y, eye], look: [x, y, h], fov }` stands the camera anywhere in plan coordinates and `__camKey()` prints it as a key, `__P = { ao: 0 }` overrides any finisher value.
```bash
python3 tools/serve.py
```
Is it clean in motion? Flicker score, frame time and render size at retina size (see the header of the file):
```bash
node tools/flicker.mjs "http://localhost:8014/001%20Lintel/?at=0" "20:0:8,70:0.03:30,215:0.02:30,372:0:16,560:0:16" 1440x900 2
```
Stills, measurements, console errors, collisions (see the header of the file for the step format):
```bash
node tools/probe.mjs "http://localhost:8014/001%20Lintel/?at=0" steps.json
```
The whole walk as a reel, or one stretch of it, with the scroll plan built from the page's own keys:
```bash
python3 tools/walk_reel.py "http://localhost:8014/001%20Lintel/" "001 Lintel/recordings/lintel3-full-desktop.mp4" --share
```
```bash
python3 tools/walk_reel.py "http://localhost:8014/001%20Lintel/" "001 Lintel/recordings/lintel3-full-phone.mp4" --phone --share
```
```bash
python3 tools/walk_reel.py "http://localhost:8014/001%20Lintel/" out.mp4 --from olive --to galleryEnd
```
Is the plan still? Record three seconds at rest, then measure the change between frames. After the first second (the intro text) every value must be 0:
```bash
node ~/.claude/skills/demo-options/scripts/record.mjs --url "http://localhost:8014/001%20Lintel/?at=0" --out still.mp4 --wait "window.__rig && window.__rig.world && !document.getElementById('loader')" --settle 4000 --seconds 3
```
```bash
ffmpeg -v error -i still.mp4 -vf "crop=900:700:520:120,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=still.txt" -f null - && grep -o "YAVG=[0-9.]*" still.txt | tail -40
```
After an edit in `shared/`, every page must still load clean. This takes about ten minutes for the fourteen pages, so run it in the background. Last run on 5 Oct 2026: all fourteen and `v2/` reported no problems.
```bash
echo '[{"jump":0,"wait":2500},{"jump":300,"wait":2500}]' > /tmp/two.json; for d in */; do [ -f "$d/scene.js" ] && echo "== $d" && node tools/probe.mjs "http://localhost:8014/$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$d")?at=0" /tmp/two.json | tail -2; done
```
Before and after: take the same stop in `v2/` and in the working page with the probe (v2's positions are 76.5 vh lower after the door, because iteration 3 added the `approach` key), lay the pairs out in a small HTML page and screenshot it with `NOWAIT=1 node tools/probe.mjs file:///...`. This machine's ffmpeg has no text filter and Python has no Pillow.

## First step
1. Start the server, run the probe once at `?at=0` and confirm "PAGE PROBLEMS: none" and zero collisions.
2. Watch `recordings/lintel3-opening-desktop.mp4` and `recordings/lintel2-full-share.mp4`, and look at the before and after sheet, so you know what Sam has seen.
3. Tell Sam how you would approach the light and atmosphere pass before touching code. He expects options he can watch.
