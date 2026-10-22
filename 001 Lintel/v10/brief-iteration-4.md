# Brief: Lintel, iteration 4

## Start here (for a new session)
You are in `014 Flat 3D/001 Lintel/`. The files next to this brief are **iteration 4**. On 9 Oct 2026 it went through five passes and seven rounds of outside review, and in round 7 **every one of Sam's seven parts was scored 8**, which was his bar. He has seen reels of the first two passes ("I love it... almost an eight") and asked for the paper to roll out after the loader, which is built. He has **not yet scrolled the result himself**. The concept is settled and Sam likes it. Do not redesign it.

| Folder | What it is |
|---|---|
| `001 Lintel/` | Iteration 4, work here. `scene.js` (architecture, reveals, camera, the roll, the mirror), `staging.js` (furniture, decor, planting), `light-options.js` (the light, Warm Afternoon by default), `hero-options.js` (type, loader and hero switches), `theme.css`, `index.html` |
| `001 Lintel/v4c/` | Iteration 4 as round 7 scored it: all seven parts at 8 (9 Oct, late evening). The working files are this plus six small cleanups that were not scored (see the journal, "After the score"). Never edit it. |
| `001 Lintel/v4b/` | Iteration 4 as round 6 scored it (7.93). Never edit it. |
| `001 Lintel/v4a/` | Iteration 4 after the three review passes, before the roll of paper moved to the start (9 Oct, evening). Frozen with its own engine copy. Never edit it. |
| `001 Lintel/v3/` | Iteration 3 as it ended (9 Oct, afternoon), frozen with its own engine copy. The "before" for everything in iteration 4. Never edit it. |
| `001 Lintel/v3a/` | Iteration 3 as Sam reviewed it on the morning of 9 Oct, before the review pass. |
| `001 Lintel/v2/`, `v1/` | Iterations 2 and 1. History. |
| `001 Lintel/recordings/` | Every reel and sheet sent to Sam. The newest are `lintel4-*`: the new opening (`lintel4-opening-roll-share.mp4`, `-phone-share.mp4`), the walk (`lintel4-walk-share.mp4`, `-phone-share.mp4`), the before and after sheet (`lintel4-before-after.jpg`), and the opening's lines side by side with iteration 3 (`lintel4-opening-lines-before-after-share.mp4`). |
| `001 Lintel/demo/` | Recorded option rounds (hero, fill, picks, light). |
| `../teach/` | `journal.md` (why things are the way they are), `session-log.md` (each ask in Sam's words), `decisions.md` (who brought which idea, who decided), `reviews/` (the outside reviewer's reports, round by round, and the motion evidence note), `shots/` (before and after stills, `2026-10-09-l4-pass5/` is the page as it is, `-pass4/` is what round 7 scored). |

Run it: `python3 tools/serve.py` from `014 Flat 3D/` (or `preview_start` with the name `flat3d`), then `http://localhost:8014/001%20Lintel/`. Add `?at=1100` to jump to a scroll position in vh. Older versions are at `/001%20Lintel/v4c/`, `/v4b/`, `/v4a/`, `/v3/`, `/v3a/`, `/v2/`, `/v1/`.

**Read before coding, in this order:**
1. This brief.
2. `../teach/session-log.md`, blocks 5 to 8. Sam's review of 9 Oct in his own words, and his verdict.
3. `../teach/reviews/2026-10-09-pass2-review.md`. What a strict outside reviewer still found.
4. `../teach/journal.md`, the entries of 9 Oct (tagged `l3`). Every cause that was found and every trap.
5. `brief-iteration-3.md`, the sections "Things that cost time" and "Tools". Still true. Its line numbers and its "where it stands" are out of date, this brief replaces them.
6. `../shared/ENGINE.md`.

## The page in one paragraph
Casa Serra is a 946 m² courtyard house above Sintra. The page opens on its floor plan, which is the real 3D model cut at 1.2 m and seen straight down through a 3 degree lens. Scrolling opens the lens (the walls rise), glides down to a pivot door, and walks the house at eye height: entrance, living room, kitchen and dining, patio with the old olive, the 24 m glass gallery, master suite, dressing, bath, private garden. Every space is ink on paper until the camera gets there, then real materials are scanned across it piece by piece with an orange outline (the "Laid" fill). At the end the camera lifts over the built house, a roll of architect's paper opens across it and leaves the drawing, which is the sheet the page began on. Then the closing section.

## Where it stands (9 Oct 2026, end of the day)
Sam, after the reels of the first two passes: **"Looks pretty strong. I love it. You fixed a lot of issues with the blinking. I still need to scroll everything slowly, but so far the experience feels like almost an eight. Eventually we will polish the details of the material when it transforms from draft to real element."** And: **"at the end, you added the paper scroll effect. I wanted it after the loader. So right now use the loader that we have. And when the loader ends, the paper can roll out, so we see the architecture plan. And then as we start scrolling, we can enter the 3D world."**

- **The opening (new, his request).** After the loader the page is a bare drawing board. The tube crosses it from the left and leaves the sheet: the plan and the page's words. The scroll is held until the sheet is down. `rollInFrame` and `intro` in `scene.js`, `.board` in `theme.css`. `?open=plain` gives the opening as it was. The roll at the end of the walk is still there: he has not said whether it stays.

What the three review passes did (the journal's `l4` entries have the why of each):
- **Plan.** Depth for the outlines is good to 1 cm on the plan (it was 7 cm, which made small outlines blink). Outlines move in quarter pixels. The garage is cut and capped like every room. Thin frames are one stroke of ink from far off. Slats, dividers and fluting are not on the drawing. All ground is one plane in the depth picture.
- **Scan.** The lawn south of the patio is scanned with the patio. The gallery's glass wall belongs to the gallery. Furniture and decor arrive whole and opaque, one thing at a time. Glass is drawn in two passes and never goes milky.
- **Rooms.** Gallery stop a metre further in, title on bare wall. Draped bedding and lamp light in the bedroom. An open lit wardrobe and a walk down the middle of the dressing room (new key `dressMid`). A sharp mirror. A fire that burns and lights the garden. Tree trunks lit from the right side (they were inside out).
- **Ending.** A lit top view (the sun climbs to 60 degrees as the camera lifts), cars in the garage, an arrival court with stone bands and olives, the plan printed on the roll, closing words on clean paper.
- **Small print.** Wordmark, corner links, counter, ruler, hint and room titles read the picture behind them and turn light on dark.
- **Scores, outside reviewer on stills.** End of iteration 3: 7.5. After pass 1 (round 4): 7.9, with scan, gallery, bath and garden at 8, bedroom and ending at 7.75, plan at 7.5. After pass 2 (round 5): 7.93, with scan, gallery, bedroom, bath and garden at 8, plan and ending at 7.75. After pass 3 (round 6): 7.93 again, the ending up to 8 and the garden down to 7.75 (two meadow olives had risen into its view with a black core showing). **After pass 4 (round 7): 8.00, all seven parts at 8.** The reviewer's own words for the 8: no conditions, a list of remarks.
- **Blinking, measured.** Pixels that pop while the plan opens are 57 to 76 percent fewer than in iteration 3, and pieces of line that show for a single frame at scroll speed went from 41 frames in 200 to 1 or 2 (`../teach/reviews/2026-10-09-l4-motion-evidence.md`). The plan at rest reads 0.000. The frame after the roll is the first frame of the page byte for byte. Sam's own slow scroll is still the test and has not happened.
- **Frame rate.** The whole walk filmed live: 60 frames a second on desktop and at phone size, longest gap under 40 ms. No shader is built after the loader. A 12 second freeze on phone in the bath (first visit only) was found and fixed in pass 3. One evening three desktop takes came in at 49 a second: it was the machine (Blender rendering), see the journal before chasing it again.

## What is open
1. **Sam's slow scroll through the page**, which he said he still has to do, and his word on the new opening. Ask him the things only he can answer: does he still see blinking and where, and does the roll at the end of the walk stay now that the page opens with one.
2. **The moment a drawing turns into material.** He named it as the next thing to polish ("the details of the material when it transforms from draft to real element"). He has given no specifics yet. Propose before building (the `demo-options` skill fits: it is a transition).
3. **Things Claude decided that he has not confirmed.** From pass 4 and after: trees stay whole in the last look from above (the big olive's crown covers its ring), "3 cars" is gone from under GARAGE, the reflecting pool by the path is flush, the scroll hint has a little paper behind it over the drawing, the board has a grain, the roll waits a second after the loader. From earlier: the sun climbs while the camera lifts at the end, cars in the garage and olives in the arrival court, the dressing room as an open wardrobe, the wordmark and the counter stepping back over plan sheets, the page's words printed on the sheet. He was told and did not object. That is not a yes: show, do not ask in words (a spoken yes of his was reversed the same day once he saw the reel).
4. **What the last review still lists** (round 7, remarks under 8s, `../teach/reviews/2026-10-09-l4-pass4-review.md`). Done after the score: the board's seam, the roll's shadow under the loader's line, the parasols, the line at the glass doors, the bead by the pool. Not done: the path's edge lines run under the scroll hint while the walls rise (`03-lens2`), a meadow olive seen from straight above is a smooth disc in a thin ring of leaves (`29-top-built`), small marks beside the fireplace block and on the far wall line (`03-lens2`, `04-lens3`), the hint on heavy lines in `08-rise` and `10-drop`, the tube's end never in frame. And its first point every round: Sam on the live page, scrolling 100 to 260 vh himself.
4b. **Letting the visitor choose (asked 12 Oct, not built).** A commenter wrote "tours usually want free movement, not a fixed path", and Sam asked: "for our landing page, to implement something like that, where the user has control of which room to explore and how long he stays there, is it doable?" The answer given: yes, in three sizes. Small: pick a room (on the plan itself, or the ruler) and the camera goes there. Medium: look around at each stop by dragging. Large: walk freely, which needs reveals by where you stand, every room dressed for every angle, and a way back into the scroll. Recommended the first two. The `3d-virtual-tour` skill covers this. Show options as recorded demos before building any of it.
5. **The loader.** He said on 9 Oct: "right now use the loader that we have". So it stays, and the roll-out follows it. The three candidates stay behind `?loader=dimension | lintel | datum`, and `?hero=draw`.
6. **The hour of the light.** Warm Afternoon is confirmed as the default. Golden Hour and The Afternoon Passes stay behind `?light=`.
7. **Phone.** The curved line on the hero is gone, titles wrap and pick their colour. Nothing else was tuned: the plan is small on a phone, the living room's plan view is cropped.
8. **The phone freeze** is explained and fixed (pass 3: the phone's mirror buffer had no multisampling, so every shader was rebuilt on its first frame). If a stall shows on a first visit again, read "Shaders built on the walk" below.
9. **When he calls it final:** freeze into `v4/` (the six files plus `shared/`, paths rewritten, as `v3/` was), full reels, then the `teachable-build` skill in extract mode.

## Sam's rules for this page
These came from him. Break one and he will notice.
- **The paper rolls out after the loader** (9 Oct, evening: "I wanted it after the loader"). The page opens with it.
- **Confirmed by him on 9 Oct:** the garden is scanned through the glass while you stand in the bath, Warm Afternoon is the default light. (He also said yes that morning to "the roll is at the end of the scroll" and took it back the same evening.)
- **The scan follows the camera.** Nothing ahead on the walk is finished before you get there, even behind glass. What is beside and behind you is real. Rooms the walk never enters turn real with a neighbour, so no outline is ever left behind.
- **No blinking.** The plan must hold perfectly still at rest (measure it, see Tools), and nothing may flicker while it opens.
- **No circle.** The fill from drawing to material must not read as a round shape growing. He picked the Laid fill.
- **Start and end on the same drawing.** The roll of paper lays the ink plan down at the start. At the end a roll brings it back (kept by Claude, not yet confirmed by him).
- **A million dollar home staging**, and nothing that floats. Things stand on something and have a shadow under them.
- **At least eight out of ten in every category** (9 Oct, twice). Have it scored by an outside reviewer on stills, never by yourself. Take the stills after the last change to the code, and leave the code alone while the review is out.
- **The loader is one thing**, clean and about architecture.
- **A house that costs millions.** Big rooms, tall glass, few and good materials.
- **Keep a history.** Freeze the working version into its own folder before a new round (`v3/` is how: the six files plus the engine in `shared/`, paths rewritten).
- **Keep his options.** Stencil type with signal orange and the Laid fill are his picks. The other types and fills stay behind their switches.

## How Sam works (keep to this)
- Propose before building anything new, and build in checkpoints. For options on a section, a look or a transition, use the `demo-options` skill (three options behind a URL switch, recorded next to the current one). A fix with one right answer can be done directly and shown as before and after.
- He reviews by score ("a four", "a two", "at least eight") and by screenshot. When he does: freeze the version, take before stills, do the work, have a separate agent score before and after given only his words, save the review in `../teach/reviews/`, report the numbers as they are.
- A rule you derive from his feedback is your reading until he confirms it. Say so in the reply and ask. One such reading (5 Oct, "a window never shows a drawing") was reversed four days later and cost a rebuild.
- He is visual. Send reels and stills, not descriptions. He watches in his own Chrome on a retina screen.
- No em dashes and no semicolons in anything written for him, chat included. Plain first person.
- Keep the teaching files going while you work (`teachable-build` skill): `../teach/journal.md` (tag `l4`), one block per ask in `../teach/session-log.md` with his words, one row per decision in `../teach/decisions.md`, stills in `../teach/shots/`.
- Verify with measurements and the headless tools. The in-app Browser pane pauses when hidden.
- Commit or push only when asked. The project is not a git repo.
- Update `../PROGRESS.md` when the state changes.

## Map of the code
Plan coordinates: x east, y south, metres, origin at the north-west corner of the house. World: `X = x - 30`, `Z = y - 24`, Y up.

`scene.js` (2,272 lines, numbers as of iteration 4, pass 1: search for the names when they have moved)

| Line | What |
|---|---|
| 36 | `ROOMS`. Rectangles, ceiling heights, where each label sits on the plan. The last one, `yard`, is not a room: it is the lawn south of the patio, so the patio's scan runs on across it. |
| 74 | `OPEN`. Doorways, doors, glass runs, the pivot door. |
| 125 | `RU` and `ROOM_GLSL`. The room table every material reads. `uRV` is each room's reveal, `uRoll` the roll of paper's line. |
| 223 | `drawable(mat, hatch, opts)`. Paper until the room arrives. Also: the tint fix, the roll, `aDecor`, and `whole` (a thing that arrives in one piece, see `thing()` in `staging.js`). |
| 370 | `KEYS`. The camera path. Walking keys have their target 2.5 m ahead of the lens. `dressMid` is new in iteration 4. |
| 421 | `DOSSIERS`. The seven stops and their titles. |
| 484 | `drawPlan()`. The plan's dimension strings, grid bubbles and symbols as one ink texture. Also makes `planPrint`, the small copy printed on the paper roll. |
| 765 | `woodAt`, `terrH`. Where the woods stand, and the land. |
| 816 | `build()`. Walls from the room table (`boxL` at 885), `buildCaps` (1030), floors and roofs (1085), land and sea (1141), trees (1181), staging call (1384), sun (1482), figures in the air (1504), dust (1612), where each fill starts (`FROM`, 1639), the depth pass that knows about paper (1658). |
| 1749 | `buildMirror`, `mirrorFrame`. The bath's mirror. Its lens is cropped to the glass. |
| 1831 | `roll()`. The roll of paper, and the plan printed on it. |
| 1865 | `nearestSeen`. Where the depth base sits (precision of every outline). |
| 1880 | `lampPool`. Four real lights for all the lamps in the house. |
| 1904 | `frame()`. The cut plane, the ending (`backRaw` 1931, `rollK` 1941), the reveal waves (from 1962), the figures in the air (2061), the light from above, focus and finisher values. |
| 2146 | `camera()`, with the design aids `__cam` and `__camKey()`. |
| 2186 | `hud()`. The small print reads the picture behind it (`__ground` in the console). |
| 2256 | `FX.experience({...})`. `finaleRise: 217` belongs to the last key's `hold: 150`. |

`staging.js` (847 lines): materials at the top, `thing()` and the tagging of whole things at 66, helpers to 309 (`pillowGeo`, `drapeGeo`, `lavender`, `lamp`), then one block per room: front 311, entrance 358, living 383, kitchen 429, other rooms 472, patio 508, gallery 541, master suite 561, dressing 634, bath 681, garden 733.

`light-options.js` (276 lines): `HOURS` says what the light does at five heights of the sun, `LOOKS` are clocks, `capSky` takes the second sun out of the sky map. `scene.js` raises the sun through `__light.over` while the camera is above the house.

Stops in vh (read them from the page when a key changes, `tools/review_stills.py` does): hero 0 to 34, door 349 to 425, hall 519 to 604, living plan 825 to 901, living 1097 to 1190, dining 1360 to 1445, patio 1615 to 1709, olive 1811 to 1896, gallery 2074 to 2151, gallery end 2321 to 2397, bedroom 2550 to 2635, bath 2880 to 2956, garden 3050 to 3143, top view and roll 3398 to 3526, page end 3635. Everything after the bedroom moved 32 vh later with the new key.

## Things that cost time on 9 Oct (do not rediscover them)
The list in `brief-iteration-3.md` still holds. New:

**The drawing**
- The black wall fill used to be "whatever the camera sees inside a hollow cut wall". It is now a lid per wall piece (`capRects`, collected in `boxL`, plus `A.cap()` for the fireplace). Anything new that is solid and taller than the cut needs `A.cap(x0, y0, x1, y1, z0, z1)` or it shows as an outline.
- Ink for the inside of cut solids is opt-in now (`inkCut`). Left on for everything it inked any open shape seen from behind.
- Every geometry drawn with a `drawable` material carries `aDecor` (0 on the drawing, 1 for planting, decor, water). It is set once at the end of `build()`. A mesh created after that needs it too, or the shader reads whatever value is lying around.
- Decor joins the depth pass only when its room is fully real, and leaves it under the plan lens. Glass leaves the depth pass only while a drawing can be seen through it (`seeThrough`). Leave glass out for good and every view through a window turns milky.
- The plan's notes and labels have their own two small shaders. They need the roll's term too (`uRoll`), or the sheet behind the roll has walls and no text.

**Geometry**
- Flicker that survives every effect being switched off (`__P = { ao: 0, ink: 0, dof: 0, shafts: 0 }`) is two surfaces in one plane. The lintel over each opening now starts 6 mm above its head and window frames stop 4 mm short of floor and ceiling.
- The renderer always has two clipping planes (the cut, and `mirrorClip`, which cuts nothing except during the mirror's pass). Never change how many there are while the page runs: every shader would be rebuilt.
- The mirror's first version tilted its camera's near plane into the glass. That skews the far plane and, from the door, culled the whole room. Check a view-dependent effect from the stop, not from wherever it is easy to debug.

**Colour and light**
- A tint laid over a grey scan is applied after the scan is desaturated (`uSat` in `drawable`). Before that fix every ochre, rust and sage cloth was grey.
- The sun is in the scene once. `capSky` caps it in the sky map. With `?light=off` the old glare is back.

**Titles**
- The engine pushes a room title back inside the screen when it would run off the right edge, and then it lands on its own marker. Move the anchor (in `anchors`, returned by `build`), not only the offset. Three titles moved in a hurry on 9 Oct landed on objects and went back.

**The ending**
- The closing section enters when the scroll reaches the last key's start plus `finaleRise` minus 100 vh. It does not know about the last key's rest. Change one, change the other.
- From the garden only land two kilometres off or more shows over the edge of the hill. That is where the village stands.

**Recording and measuring**
- When another session renders in Blender, every real-time recorder stutters and frame times mean nothing, for old code too. Check `ps -Ao %cpu,comm -r | head -4` first. Then use `tools/walk_offline.mjs` (one still per frame, smooth whatever the load, about ten minutes for the desktop walk).
- Under load the page lowers its own render size in steps during the first seconds. A stillness test that starts with the hero then reads non-zero. Measure the hero second: `"372:0:8,20:0:10,3478:0:8"`.
- `renderer.info` counts per render call. To count a frame, switch `autoReset` off, reset, wait N frames, divide by N.
- zsh does not split an unquoted variable into words. `for seg in "--from a --to b"; do tool $seg; done` passes one argument and the tool silently ignores it.

## Things that cost time in iteration 4 (new)
**Measuring blinking**
- The flicker score rises with how fast the picture moves. Never compare two places by the score alone (I did for two rounds: "2.4 against 0.51"). Compare the same place before and after, or use the `ratio` column.
- Under load the page lowers its own render size, and then two runs are not the same picture. Add `&steady` to the URL for any before and after measurement. `&ink=old` gives the outlines as they were in iteration 3.
- To find what blinks, take two frames 0.05 vh apart and enlarge a crop four times. A heat map of a whole reel only says where.

**Depth and outlines**
- Outlines, contact shadows and blur all come from one depth picture, stored as a 16 bit float measured from a base distance (`P.zBase`). Its precision is about a thousandth of the distance past the base. `nearestSeen()` keeps the base a metre in front of the nearest thing in view. Move it and centimetre steps start to blink.
- The depth pass is Lintel's own material now (`ctx.post.preMat` is replaced in `build`). It reads `aDecor` and the colour attribute on everything it draws, so every mesh needs both (they are added at the end of `build()`, a mesh made later needs them too). `aDecor`: 0 on the drawing, 1 not on the drawing, 0.25 the land (never cut in the depth pass).
- Something that looks see-through is usually missing from the depth pass, not transparent.
- In that material only what is **tested** is `centroid` (`vW`, `vDecor`, `vCtr`). What is **written** (depth `vZ`, normal `vN`) and the ground's plane (`vWd`) are plain. All centroid gave a strip of dashes on the side of every east to west wall while the walls rose. All plain gives back the line that flashes for one frame at 160.8 vh. Do not tidy it.
- The walls' lids carry `aDecor` 0.35, the land 0.25. They were the same number once, and a fix meant for the land flattened the lids.
- After any change to the depth pass or the outline test, run the numbers again at 80, 120, 170, 220 and 300 vh (`tools/flicker.mjs`, then `tools/pops.sh`) and the two one-frame sweeps (`tools/flash.sh`). Two fixes of 9 Oct each made another place worse, and nobody saw it in the reels.
- **The cut is the page's own now** (`renderer.clippingPlanes` only holds the mirror's plane). Every house material discards above `uCutY` itself, in `drawable` and in the depth pass, on a height read inside the triangle. The land (`aDecor` 0.25), the lids (0.35) and whatever stands outdoors (1.5: zones `ext`, `patio`, `garden`) are never cut. A new material that should be cut has to go through `drawable`.
- A cut made by discarding is all or nothing per pixel, and a pixel has four samples: where a face crosses the cut inside a pixel, its samples above the cut are written too, and they are nearer than the wall's lid. So a lid counts as `LID_NEAR` (0.6 m) nearer for the depth test only, in its own shader and in the depth pass. That is safe because nothing under the cut can stand in front of a lid for a camera above the cut. Do not "fix" pale pixels on a lid by moving the lid (I did, twice), and do not discard every pixel that might reach over the cut: that opens a one pixel gap under every lid and the pop counts at 170 and 220 vh go up by a third.
- A step of about 3 to 9 cm between two flat things is what the outline test cannot make up its mind about from the height the plan opens at: its line comes and goes in pieces. Either make it flat in the depth picture and draw the edge on the annotation sheet (`uCourt` in the depth pass, and the "where paving ends" lines in the annotation canvas), or make the step at least 12 cm.
- An olive's inner body (`buildCrowns`) is `fromAbove`: it shrinks away when the camera is beside it. Without that it is a black egg in the tree against a bright sky.
- Changing the land (`terrH`) moves every tree that stands on it. Two meadow olives rose into the garden's view that way. After any change to the land, look at `27-garden`, `25-bath-mid` and `15-patio`.
- To see where a number comes from, map it. For the pops at 120 vh the map showed bright bands on every horizontal wall and none on the vertical ones, which named the cause in a minute.

**Shaders built on the walk (hitches, and one 12 second freeze on phone)**
- The graphics card builds a material's shader once per kind of buffer it is drawn into (samples, formats). Draw the house into a buffer of a new kind and every material is built again in that frame. The phone's mirror buffer had no multisampling and the scene's has four: two of five phone takes stood still for 12 seconds in the bath. Any new buffer the house is drawn into must match `rtScene` (half float, 4 samples).
- Built shaders are kept by the system between runs. A stall like that only shows on the first run after a shader's text changed, and on every visitor's first visit. To test it, change a constant in `ROOM_GLSL` (for example the `0.06` in `roomOf`), record, and put it back.
- `precompile()` in `scene.js` draws one frame behind the loader with nothing hidden, nothing culled, shafts and dust on, and the mirror's picture. Anything that is switched on later by a new condition (a new post pass, a new hidden mesh with its own material) has to be reachable by that frame. Check: `renderer.info.programs.length` must not grow while the page is walked (114 at load, 114 at the end).
- The engine's own `renderer.compile(scene, camera)` at boot builds the screen variant of every material, which this page never uses (everything is drawn into buffers). It costs load time on every page. Not touched, it is shared.

**Whole things**
- Everything added through `staging.js` carries the middle of the thing it belongs to in its colour attribute (x, z, 2 plus its height) and turns real in one step when the fill reaches that point. Group pieces with `thing(x, y, () => { ... })`. Anything longer than 6.5 m stays with the room's tiles. A mesh added to the scene by hand (a water surface, a canvas) needs `mark(geometry, THING)` inside a `thing()`.

**Lamps**
- `lamp()` in `staging.js` is a place where light comes from, not a light. Never add a `PointLight`: each one costs about half a millisecond a frame over the whole house. `lampPool` moves four real lights to the lamps that matter from where the camera is.

**Camera keys**
- The engine lets the view drift a degree to one side during a rest, left on even keys and right on odd ones. Adding a key flips every later rest. `camera()` puts the rests after `dressMid` back. Add another key and check the stops after it against the stills.
- `tools/review_stills.py` ties the 35 review stills to key ids. Add a key and they follow.

**Outdoor "rooms"**
- Each pane of glass belongs to the outdoor room it looks onto (`paneFor`). A new outdoor rectangle in `ROOMS` takes over the panes that face it, and it needs a line in `realFor` in `frame()`, or its glass stays "drawn" and the view through it goes milky (the bedroom's west glass did, after `yard`).

**Small print**
- The wordmark, corner links, counter, ruler, hint and room titles choose dark or light from the pixels behind them (`hud()`). In the console `__ground.lum` shows what each last read and `__ground.tone` what it made of it. It reads five rows per piece, one was not enough.

## Tools
```bash
python3 tools/serve.py
```
The 35 stills the outside reviewer scores, always from the same places (`--only 03,29` for a few, `--size 390x844 --dpr 2` for a phone):
```bash
python3 tools/review_stills.py "http://localhost:8014/001%20Lintel/?at=0&steady" teach/shots/<folder>
```
Stills, measurements, console errors, collisions. `DPR=2` in front takes them at retina size:
```bash
node tools/probe.mjs "http://localhost:8014/001%20Lintel/?at=0" steps.json
```
Is it clean in motion, and still at rest? `CROP=x,y,w,h` in front scores one part of the screen:
```bash
node tools/flicker.mjs "http://localhost:8014/001%20Lintel/?at=0" "372:0:8,20:0:10,36:0.05:30,120:0.05:30,170:0.05:30,3478:0:8" 1440x900 2
```
What switches on and off, counted on the frames `flicker.mjs` keeps (give it a folder as last argument). `pops.sh`: pixels that jump. `flash.sh`: things that exist for one frame. `R=3` with a 0.004 vh step for a face that slips past the cut at one camera position, `R=20` with a 0.8 vh step for pieces of line at the speed people scroll. `MASK=<dir>` writes the worst frame with its marks:
```bash
tools/pops.sh /tmp/kept
```
```bash
R=20 MASK=/tmp/marks tools/flash.sh /tmp/kept
```
The whole walk as a reel, filmed live (this is the one that tells you the frame rate):
```bash
python3 tools/walk_reel.py "http://localhost:8014/001%20Lintel/" out.mp4 --through door,asbuilt --rest 2.8 --speed 52
```
The same walk as a reel that is smooth whatever the machine is doing (add `--phone`, `--share`, `--from KEY`, `--to KEY`):
```bash
node tools/walk_offline.mjs "http://localhost:8014/001%20Lintel/" "001 Lintel/recordings/lintel4-walk-desktop.mp4" --share
```
A captioned before and after sheet from two folders of stills:
```bash
python3 tools/before_after.py out.jpg "Title" teach/shots/before-dir teach/shots/after-dir "caption|before.jpg|after.jpg"
```
In the page's console: `__cam = { p: [x, y, eye], look: [x, y, h], fov: 56 }` stands the camera anywhere in plan coordinates, `__camKey()` prints that view as a key, `__P = { ao: 0 }` overrides any finisher value, `__checkPath()` lists camera collisions (ignore `roof`), `__rig.K` holds the keys with their positions.

After any edit in `../shared/`, load every page and read the problem list (the loop is in `brief-iteration-3.md`). `v1` to `v3` have their own engine copies and are safe from it.

## First step
1. Start the server. Run `python3 tools/review_stills.py "http://localhost:8014/001%20Lintel/?at=0&steady" /tmp/check --only 00,22,27` and compare with `../teach/shots/2026-10-09-l4-pass5/`: they must look the same (tree leaves sway and the cypresses' foliage is random per load, so those pixels differ). Run the probe once at `?at=0` and confirm "PAGE PROBLEMS: none" and zero collisions.
2. Read the newest review in `../teach/reviews/` and the journal's `l4` entries, so you know what the reviewer still lists and why things are the way they are.
3. If Sam has answered, start from his words. If he has not, ask him what he saw, with the list under "What is open" as the proposal. Before any round of changes that he asked for: freeze the working version first.
