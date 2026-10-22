# Brief: Iteration 8, the house in code, refined room by room (Lintel)

Written 15 Oct 2026 to start a fresh session. We are at iteration 7 (`v7a/`, everything in code). This session starts iteration 8. Read this first, then `brief-code-house.md` (the whole plan and its progress line), `../CLAUDE.md`, `~/.claude/CLAUDE.md` and the memory index.

## Where we are

Sam, 15 Oct: "I don't want any Poly Haven textures, everything should be in code now." Done the same day, and frozen as `v7a/`:

- **Every material in every room is code by default.** The 16 that had no code were written (facade and canopy concrete with tie holes and rain runs, garage concrete, limewash, dry stone, two gravels, lawn and land with grass blades, charred larch, three herringbone wools, outdoor olive bark, oak fins and bench, fine walnut), each starting at its scan's measured colour. `?code=none` brings the scans back, for comparing only.
- **The sky is code.** `code-sky.js` makes the HDR panorama and the visible sky at load, from a rule fitted to the photograph it replaced (`qwantani_late_afternoon_puresky`). Outdoor frames within 1 to 2 levels of 255 of the photographed sky. The light looks and their hours run on it unchanged.
- **Nothing is downloaded from Poly Haven.** 41 texture files and 37.7 MB before, none now (0.85 MB in all).
- **First visit loading fixed** before any of that: the published page 57 s to 14.5 s cold, the lit house 242 s to 23 s. One room-lookup loop was most of it (see the journal, 15 Oct).
- **No new blinking** on the walk: flicker numbers as the scans' at the patio, olive, gallery, garden, the rise and the top view.
- **The outdoor olives keep the canvas leaves** (painted in code at load). The shader sprig leaf costs too much over thousands of cards. Indoors (living, entrance) the shader sprig stays.

Preview (server: `python3 tools/serve.py 8014` from `014 Flat 3D/`, in a Terminal tab):
- the page: http://127.0.0.1:8014/001%20Lintel/
- frozen: http://127.0.0.1:8014/001%20Lintel/v7a/
- the old scans and sky, for comparing: http://127.0.0.1:8014/001%20Lintel/?code=none
- jump to a place: add `&at=560` (the entrance), `1650` (patio), `3100` (garden)
- the reel of the whole walk in code: `001 Lintel/demo/all-code/walk-all-code-share.mp4`

## Sam's verdict on iteration 7

"It looks way much nicer now that we remove the Poly Haven texture. It feels more alive. Great job." He prefers the all-code page (link 1) over the scans, although the blind reviewer had preferred the scans. So his eye decides, the reviewer's notes are a fix list (memory: Scores and outside review).

## Performance, scans against code (15 Oct, measured, Sam asked for numbers)

A frame at each rest, 1728x992 at 2x, full resolution, uncapped, two interleaved runs on a busy Mac (compare the columns, not the values): entrance 20 / 18 ms, living 15 / 11, kitchen 12 / 7, patio 10 / 15, under the olive 29 / 34, gallery 9 / 12, bedroom 18 / 16, bath 41 / 49, garden 9 / 7, top view 41 / 44. Average 20.4 with scans, 21.3 with code: about even, cheaper indoors, dearer at the patio, gallery and bath. Download 37.7 MB / 0.85 MB. Texture memory on the graphics card about 0.9 GB / almost none (estimate: 39 scans of 2048 square and a 4k sky). Shaders 114 / 166. Repeat visit about 5 s both. Cold first visit 23 / 36 s (the build of shaders), less the 37.7 MB no longer downloaded.

## What is not good yet (numbers as measured)

1. **Material quality.** The entrance, reviewed blind twice: code 4, then 4.5 after a round of fixes, against the scans' 7 (`teach/reviews/2026-10-15-entrance-review*.md`). The oak and the stone are furthest behind ("drawn contour lines", "a printed decal"). The living room test said the same a day earlier (4.5 against 6).
2. **Frame cost under the patio olive.** About 50 ms a frame against 36 with the scans (1728x992 at 2x, uncapped, busy machine). The other rests cost the same as the scans. Not one material: keeping any one group as scans (`?codeskip=`) removed 0 to 14 ms, and leaving out the cut's discard did not help.
3. **Cold first visit.** 166 shaders against 114: 36 s cold against 23 (the 37 MB no longer downloaded wins back several seconds on a real line). Warm about 5 s.
4. **The finale still says "Materials: Poly Haven, CC0"** (`index.html`, the finale's meta line). New words are Sam's to give.

## Iteration 8: the plan Sam agreed (15 Oct)

Room by room, in walk order. For each: Sam's notes (ask him first, show the room), fixes from his notes and the reviewer's list, a short clip of before and after, his yes, then freeze the next letter: `v8a` after the entrance, `v8b` after the facade, and so on, as iteration 4 did (v4a to v4e).

1. Entrance, hall, WC (start here)
2. Facade and forecourt (seen from far above at the start: watch for blinking)
3. Kitchen and dining
4. Patio and the big olive (and the frame cost there)
5. Gallery
6. Master suite, dressing, bath
7. Garden and landscape (largest surfaces, hardest to keep still at a distance)
8. The rooms the walk never enters (media, study, library, guest suites, garage, wine), seen from above or through glass

Alongside: fewer shaders (faster first visit), and baking code into textures at load where a room needs sharper surfaces or a cheaper frame, tried on one room first. To finish: new credit words, the scan files removed, the final version frozen, the live page (https://sam1983aing.github.io/casa-serra/, still iteration 4) updated, optionally the build broken down for a video.

## Notes on the next steps (my recommendations)

1. **Sam watches the walk in code** (the reel, then the page) and gives his notes. His eye decides, the reviewer's notes are the fix list.
2. **Try baking the code into textures at load**, on the entrance first, behind a switch: the same rules drawn once into high resolution textures while the page loads, then sampled like any texture, with mipmaps and anisotropic filtering. Still no Poly Haven. What it should fix: the per-pixel fade compromises the reviewer keeps finding (grain lost on the pivot door at a slant, floor detail gone after the second row, drawn-looking lines), and part of the frame cost. What it will not fix: a figure designed badly. Prove it with stills and a blind review against the scans, as on 15 Oct.
3. **Frame cost under the olive.** Measure with `tools/look_numbers.py`-style rests (the probe step in the session of 15 Oct: patio 1660, olive 1850), interleaved, `?codeskip=` to bisect. Suspects: the bark's 3D cell loops on a trunk that fills the screen, the travertine's cells, depth complexity through the glass.
4. **Fewer shaders.** Lit materials could share their scan's shader if the room light lived in `drawable()` behind uniforms (brief-phase-3, idea 2). Similar code materials could share one shader with a switch.
5. **When Sam is happy:** new credit words, the scan files removed from `assets/` (and `?code=none` with them), freeze, then publish (the live `publish/lintel/` is unchanged and knows none of this).

## Progress (iteration 8)

- 15 Oct, the entrance, first pass. Before clip (v7a) on a fixed camera path, `demo/entrance-v8/cams.txt`, sent to Sam for his notes. The bake trial is built (`?bake=entrance,hall,wc`, `?bakemb=`, `?bakeonly`, code-materials.js `bakedFrom`/`bake`, house-looks.js `bakeAll`): 233 MB, under a second, keeps the hall floor's stone further back, changes nothing else in the entrance, saves no frame time. It stays a switch. The reviewer's list fixed in the rules instead: oak figure and colour (door, console, side leaves), travertine pores, tones and offset rows (also in the drawing's floor hatch: my reading, to confirm), concrete joints by the pixel across them, round plaster pits, lighter leaves. Reel: `demo/entrance-v8/entrance-v8-desktop.mp4`. No new blinking, frame cost unchanged, only the patio moved elsewhere in the house (its stone). The scans' gravel shader now compiles (`?code=none`). Blind reviews 3 and 4 (`teach/reviews/2026-10-15-entrance-review-3.md`, `-4.md`): v7a 4, first pass 4.5 (round 3), then first pass 5.0, second pass 5.5, scans 7.0 (round 4). The second pass also bakes the hall's and the WC's stone by default (86 MB, `?bake=none` to compare). Reel: `demo/entrance-v8/entrance-v8-pass2-desktop.mp4`. Next on the reviewer's list: one door board still stacks its arches, the side leaf's grain, the floor's pits, the leaves (olive shape, two-sided, light through). Waiting for Sam's notes and his yes before `v8a`.
- 15 Oct, evening: Sam redesigned the entrance. Console in the corner of the concrete and the front wall (2.4 m), the opening to the hall clear, the painting above the console. A pair of cream stoneware bottles with bleached branches on the two piers either side of the opening. The floor in dark grey stone slabs (1.2 by 2.4 m, joints on the opening's edges), honed (code: `slabs()`, key `slabDark`). The front wall a dark charcoal limewash (`limewashEntry`, its own shader key: with one key, three.js had given it the gallery's grey). The light: three options were tried (reels in `demo/entrance-v8/entrance-chandelier-*.mp4`), then Sam removed the hanging light altogether (the options file kept in `demo/entrance-v8/`, not loaded). Later the same evening: the entrance in white (Sam: "more traditional"): a white ceiling (`roofWhite`, the entrance's own, via `ROOM_OWN` in house-looks.js), the front wall a white limewash a shade under it, the floor a grey marble (`slabs()`). Clips: `demo/entrance-v8/room-light-d.mp4`, `after-redesign2.mp4`. Sam: "I'm satisfied with the entrance now". **Frozen as `v8a/`.** Next: the facade and forecourt (room 2 of the plan), starting the same way: a clip of it as it is, his notes first.
- 15 Oct, night: the facade and forecourt, first pass, all from Sam's notes (three rounds of screenshots, session log 97 to 99). The path flush with the gravel (`COURT = 0`, the gravel in pieces round the slabs, gravel in the joints, the wall plinths gone), the shaded forecourt not navy (`SHADE_FILL`), the path a Jura limestone (`juraPath`, code-materials.js), the gravel in two sizes (`courtGravel`), the boulders a smooth weathered rock (`M.rock`, `rock()`). Thirteen fins (`window.LINTEL_FINS`, equal space either side as seen from the door: 33 and 24 cm true), in a straight grain wrapped round each fin (`finWood`), a floating basalt bench. The light 1.6 m, centred on the door's height, its line between the frame's lips (`glowLine`), the 14 placed from its ink 36 cm from it. The outside walls (`ext`) in fair faced concrete on 2.4 by 1.2 m panels from the door (`fairFaced`, `ROOM_OWN.ext`). Camera path `demo/facade-v8/cams.txt`, `walk_offline.mjs --dpr 2` records at retina. Clips: `demo/facade-v8/before-v8a.mp4`, `after-1.mp4`, reel `facade-v8-pass1-desktop.mp4`. No new blinking from far above (`tools/flicker.mjs` with `CAMSEG`, `teach/numbers/2026-10-15-facade-v8-flicker.txt`). Sam: "I'm good with that version, good job". **Frozen as `v8b/`.** Next, at Sam's word: the living room (not in the list above: it had its own looks test in iteration 5).
- New tool: `tools/view_cost.py "<query>" --room entrance`, frame cost at the close-up places, uncapped. `tools/room_closeups.py --room entrance2`: the redesign's places (front, vessel, floor, chand, room).

## Lessons from the entrance (15 Oct, apply to the facade and every room after)

- Start with a clip of the room as it is, on a fixed camera path saved in a file (`demo/entrance-v8/cams.txt` is the model), and ask Sam for his notes. His notes then redesigned the room (layout, colours, objects), which mattered more to him than the reviewer's material scores.
- A code material written in two colours needs two shader keys. three.js keys its compiled programs by `customProgramCacheKey`, not by the shader's text: two limewash colours under one key gave the entrance the gallery's grey for a whole round (`limewash(m, base, key)`, `plaster(m, ceiling, colour, key)`).
- A room can wear its own version of a shared material: `ROOM_OWN` in house-looks.js (the entrance's white ceiling).
- Look at the plan from above for layout faults: the console and the painting stood across the opening to the hall, plain from above, hidden at eye height.
- Veins as the middle line of round noise close into loops (and mirrored, into drops). Stretch the noise along the vein, or let the ground carry the stone.
- The bake (`?bake=`) only pays on long slanted surfaces seen from far (the hall's floor). The forecourt's gravel and paving from 1 km up may be the next place it helps: try it there.
- Measure a repeat with autocorrelation (the reviewer's measure), and blinking with `tools/flicker.mjs` at the opening (120, 170 vh) and the approach: the facade is seen from far above first.
- Recording: `tools/walk_offline.mjs --cams "$(cat cams.txt)" --at <key> --size 1728x992` (and `--phone`). Chrome 155 exits with an error after a headless screenshot, so the demo-options reel script needs `CHROME` set to a wrapper that succeeds when the screenshot exists (`001 Lintel/demo/entrance-v8/README.md`). Its phone reel read the clips as 0 s long: put that one together with ffmpeg.

## Tools from 15 Oct

- `?salt=N` changes every shader on the page (true cold loads), `tools/cold_rounds.sh` runs them interleaved, `?bootlog` times draws during load (blames the draw after the slow one, see the journal), `tools/shader_bench.js` times one shader at a time in the loaded page.
- `tools/room_closeups.py --room entrance` (close-ups from fixed places), `tools/walk_offline.mjs --cams "..." --at hall` (a camera path of your own, frame by frame).
- `?dbg=pores|band|fib|pd2|keep|px` shows one layer of the oak, `?codeskip=key,...` keeps materials as scans, `LN_PAGE=001%20Lintel/v6a/` points `tools/look_numbers.py` at a frozen version.
- `tools/guard.sh <seconds> <cmd>`: a watchdog for every probe (macOS has no `timeout`).

## Rules

No em dashes, no semicolons in anything for Sam. Teach files: `teach/journal.md`, `teach/session-log.md` (next entry 101), `teach/decisions.md` (next row 207). Before and after: `v4e/` (the release of 12 Oct), `v6a/` (lit, scans), `v7a/` (all code), `v8a/` (the entrance redone), `v8b/` (the facade redone). `014 Flat 3D/` is a local git repository since 15 Oct (no remote): code and text only, heavy media, the scans and `publish/` left out by `.gitignore`. Commit or push only when asked. Nothing published.
