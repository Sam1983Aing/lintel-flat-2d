# Brief: the whole house in code, lit as rooms (Lintel, iteration 6)

Written 14 Oct 2026, after the living room test (`brief-living-looks.md`). Read this first, then `../CLAUDE.md`, `~/.claude/CLAUDE.md` and the memory index.

## Where this comes from

Sam watched the three living room looks and said "Lighting First is better, add its lighting to all code". That became a fourth look, All Code, Lit (`?look=codelit`). Then: "we found a direction where I want all the elements encoded instead of using Poly Haven texture, with some lighting on it... go segment by segment".

The two blind reviews of 14 Oct, as given (the reviewer's numbers, not Sam's):
- Now 5, All Code 4, Lighting First 6.
- Lit side by side: Lighting First 6, All Code, Lit 4.5. Same light in both. The scans won on oak, concrete, leather, linen, logs, side table. The code won on the boucle.

So the light is the bigger lever, and the code materials still have work to do before they beat the scans. Sam chose the direction anyway: every material written in code, lit as a room. He did not answer the two questions below in words ("ok proceed let's do this"), so the suggested answers are what we work to, as my reading:
- **A room switches to code when it passes Sam's eye**, with the outside reviewer's notes as the fix list. Not a score.
- **Light first, house-wide, then the materials room by room.**

## Progress

- 14 Oct: Phase 0 done (v5b frozen, `code-materials.js`, `house-looks.js` with `?lit=` and `?code=`). Phase 1 done (`?lit=all`, per-room bounce in `house-looks.js` K). Phase 2 done (the reviewer's fixes in `code-materials.js`). Waiting for Sam on the Phase 1 reel (`001 Lintel/demo/house/house-lit-desktop.mp4`) before Phase 3 starts with the entrance, hall and WC. Not yet the default: the page still opens as Now.

## The order

**Phase 0. Groundwork**
- Freeze the four living room looks: done, `v5b/` (`v5b/?look=now|code|light|codelit`).
- One shared library of code materials (`code-materials.js`), out of the living room test file.
- Every room can switch on its own: `?lit=` and `?code=` take a list of rooms, or `all`. With no switch the page is as it was. The living room test's `?look=` keeps working (it maps onto the two switches).
- A room's materials are found after the house is built: every merged mesh is split by the room each triangle faces into, so no room block in staging.js has to change, and a room switches without touching the others.
- Stills for every room: the 35 review places (`tools/review_stills.py`) and the living room close-ups (`tools/living_closeups.py`), at Sam's window, 1728x992 at DPR 2.

**Phase 1. Light the whole house** (scans still on)
Every indoor room gets what the living room got in Lighting First: its own 360 picture taken at load, reflections read from the room's own box, light that bounces twice, a bounce with some of its colour taken out, soft corners where walls meet floors and ceilings. Outdoor areas keep the sky. Checked room by room for brightness against Now, then a reel of the walk for Sam.

**Phase 2. Finish the living room's code**
The reviewer's list: plank joints that break into dots at a grazing angle, a dotted bright seam along the hearth's front edge, trowel marks reading as faint loops, glossy logs with a drawn outline, leaves that sparkle (a blink in motion). The living room becomes the reference.

**Phase 3. Room by room, in walk order**
1. Entrance, hall, WC: inside concrete, the oak pivot door, travertine floors.
2. Facade and forecourt: outside concrete with tie holes, gravel, oak fins (seen from 1 km up at the start: watch for blinking).
3. Kitchen and dining: mostly done (oak, leather, linen, quartz and walnut are code). New: cabinet oak.
4. Patio and the big olive: travertine paving, bark, pool. Outdoor light.
5. Gallery: limewash.
6. Master suite, dressing, bath: charred larch as pure code, headboard wool, wardrobes.
7. Garden and landscape: lawn, meadow, dry stone, grove, hills. Largest surfaces, hardest to keep still at a distance. Last.
8. Rooms the walk never enters (media, study, library, guest suites, garage, wine): seen from above or through glass.
9. Remove the scans from the download (36.8 MB of textures, 41 files) and freeze.

**The same routine for every room**
1. Build its new materials, starting from the scan's own mean colour (measure it, see the living room test).
2. Stills of scans and code side by side under the same light. Outside reviewer, blind.
3. Blink check on the walk through the room (`tools/flicker.mjs`), and frame cost against the scan version (`tools/look_numbers.py`, versions interleaved: the machine's load changes within minutes).
4. A short reel of the two (`tools/walk_offline.mjs --size 1728x992 --plan ...` when the machine is busy). Sam says yes or what to fix.
5. Freeze the version, journal, session log, decisions.

## What we learned on the living room (apply everywhere)
- A rule needs detail at every size, down to two pixels, or it reads as laminate. Contour lines of smooth noise read as drawings. Streaks at several sizes, cracks between cells (Voronoi F2 minus F1) and thresholded patches read as material.
- The detail filter (`lkKeep`, `lkFbm`) fades a feature out at about two pixels. At six it looked blurry.
- One height reading per pixel and the slope from its screen derivatives was enough (`lkSurfGrad`); three readings cost double for no visible gain.
- Indoors, never reflect the outdoor sky. The room's own picture is the biggest single change.
- The page's alpha channel is the paper mask: no alpha to coverage, soft edges need a second blended pass.

## Rules that still apply
No em dashes, no semicolons in anything for Sam. Teachable build files (`teach/journal.md`, `teach/session-log.md`, `teach/decisions.md`, next rows after 149). Trust measurements over screenshots. Commit or push only when asked. Nothing published. The live page is unchanged.
