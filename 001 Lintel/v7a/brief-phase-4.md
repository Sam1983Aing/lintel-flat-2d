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

## Tools from 15 Oct

- `?salt=N` changes every shader on the page (true cold loads), `tools/cold_rounds.sh` runs them interleaved, `?bootlog` times draws during load (blames the draw after the slow one, see the journal), `tools/shader_bench.js` times one shader at a time in the loaded page.
- `tools/room_closeups.py --room entrance` (close-ups from fixed places), `tools/walk_offline.mjs --cams "..." --at hall` (a camera path of your own, frame by frame).
- `?dbg=pores|band|fib|pd2|keep|px` shows one layer of the oak, `?codeskip=key,...` keeps materials as scans, `LN_PAGE=001%20Lintel/v6a/` points `tools/look_numbers.py` at a frozen version.
- `tools/guard.sh <seconds> <cmd>`: a watchdog for every probe (macOS has no `timeout`).

## Rules

No em dashes, no semicolons in anything for Sam. Teach files: `teach/journal.md`, `teach/session-log.md` (next entry 90), `teach/decisions.md` (next row 173). Before and after: `v4e/` (the release of 12 Oct), `v6a/` (lit, scans), `v7a/` (all code). `014 Flat 3D/` is a local git repository since 15 Oct (no remote): code and text only, heavy media, the scans and `publish/` left out by `.gitignore`. Commit or push only when asked. Nothing published.
