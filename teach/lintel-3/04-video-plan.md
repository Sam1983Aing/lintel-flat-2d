# Video plan: a floor plan you can walk into

Working title ideas: "I scored every room out of ten and let the AI chase the number" or "This floor plan is also the house".
Length target: about 12 minutes (check the course style guide if this goes into the course).

**Hook (first 15 s):** the roll of paper opening across the built house and leaving the ink plan, then straight into the flat sheet tilting and growing walls. One line: "This is a drawing, and it is also the house. Four ideas make it work, and one habit made it good: I stopped giving solutions and started giving scores."

## Chapters

| # | Chapter | On screen | Say (talking points, not a script) | Try it yourself |
|---|---|---|---|---|
| 1 | Where it started | The Medal of Honor recording (`flat 3D.mp4`), then `001 Lintel/v1/` next to `v2/` | The reference looks flat until you scroll. My first version orbited a house and felt like a model on a table. The version that worked travels deep into the scene. The plan you walk into came from that. | Take any 3D scene you have and move the camera through it, not around it. |
| 2 | The plan is a real cut | `demos/section-cut.html`. Untick the lids, drag "Open the view". Then `v3a/` and `v3/` side by side at the top of the page | A plan is the house sliced at 1.2 m. The slice is real here. My note was "some walls are wider, I think it's hiding something underneath", and I was right: the ink was only what the camera saw inside hollow walls. Lids fixed it. Draw the thing you mean. | Move the cut to 0.4 m and to 2.4 m. Say what the drawing loses each time. |
| 3 | Options I can watch | `demo/hero/type-options.jpg`, `demo/hero/loader-options-share.mp4`, `demo/fill/fill-options-share.mp4`, then `demo/picks/stencil-laid-share.mp4` | "If I just see a plan, it feels weak." I didn't get a list back. I got the real page with switches in the URL and a reel of each option next to what I had. I picked the two wildcards. From a written list I would have picked the safe ones. | Ask for three options built into the real page behind a URL switch, recorded on the same scroll. |
| 4 | The scan follows the camera | `demos/scan-follows-camera.html` with the checkbox off, then on. Then `v3a/` and `v3/` from the dining table to the patio (`?at=1445` to `?at=1709`) | One number per room. The scroll moves the numbers. The first version finished the patio behind glass before I got there, because the AI had written itself a rule from my notes and never checked it with me. Label your readings and confirm them. | Set Lead to zero, then to 0.15. Find where it feels like the room is waiting for you. |
| 5 | Scores, not solutions | My ten screenshots (`teach/shots/2026-10-09-sam/`), the two reviews (`teach/reviews/`), and before and after stills of bedroom, bath and garden (`teach/shots/2026-10-09-before/` and `-after-final/`, or `recordings/lintel3-review-2026-10-09-before-after.jpg`) | "A four." "A two out of ten." "At least eight." The builder did not grade itself. Another agent got my words and the stills. 3.7, then 6.8, then 7.4. It never said eight. It caught a mirror that only worked from the angle it was debugged from. And it said the thing that changed the second pass: the same faults repeat from room to room, so fix them as systems. | On your next review, give each note a number and name the number you want. Then have someone who did not build it score the result. |
| 6 | The light is one number | `demos/one-number-light.html`, the three buttons. Then `demo/light/light-options-share.mp4` | Two words from me ("yes proceed") and three light looks came back, because all three are the same table read at a different hour. The floor that glared whatever we did: the sun was in the scene twice. | Add a sixth row to the table for a sun at 2 degrees and decide what dusk looks like. |
| 7 | The roll of paper | `demos/paper-roll.html` with "Show the roll" off, then on. Then the real ending, `v3/` from `?at=3239` to the end | My idea, from the plan d'architecte rolled in a tube. Without the band it is a wipe. With it, it is paper, because the thing you see is the thing doing the work. The three beats (roll in, rest, open) came from the reviewer: "we never see the tube as an object". | Change the lean from 0 to 3 to 10 degrees and find where it stops looking like a hand did it. |
| 8 | Not perfect, and how I close a session | The review reel (`recordings/lintel3-review-2026-10-09-share.mp4`), then `001 Lintel/brief-iteration-4.md` on screen | "Really good now compared to the previous version. Still not perfect, but we're getting there." Some blinking is left in the middle of the opening. I end by asking for a brief, and the next chat starts from that file. The brief is the memory. | End your next long session by asking for a brief: what is done, what is open, what you never decided. |

## Clips to record

Server first: `python3 tools/serve.py`. Positions are `?at=` values in viewport heights, read from the frozen page.

| Clip | Page | From | To | Notes |
|---|---|---|---|---|
| The sheet opens | `001 Lintel/v3/` | 0 | 349 | Hold two seconds on the still sheet first |
| The same, before the lids | `001 Lintel/v3a/` | 0 | 349 | For the side by side in chapter 2 |
| Front door and entrance | `001 Lintel/v3/` | 349 | 604 | The first wave |
| Living room from above, then in | `001 Lintel/v3/` | 723 | 1190 | Plan figures leaving as the materials land |
| Dining to patio | `001 Lintel/v3/` and `v3a/` | 1445 | 1709 | The clearest before and after of the scan |
| The gallery | `001 Lintel/v3/` | 1998 | 2397 | The scan running ahead for 24 metres |
| Bedroom, bath, garden | `001 Lintel/v3/` and `v3a/` | 2474 | 3111 | Three restaged rooms in one take |
| Lift and roll | `001 Lintel/v3/` | 3239 | 3603 | The roll rests at about 3390 |
| The three light looks | `001 Lintel/v3/?light=golden`, `?light=passes`, and no switch | 1360 | 3111 | Or reuse `demo/light/light-options-share.mp4` |
| The fills that lost | `001 Lintel/v3/?fill=circle`, `level`, `section` | 1003 | 1190 | Or reuse `demo/fill/fill-options-share.mp4` |
| The four demos | `teach/lintel-3/demos/*.html` | | | Screen record while dragging the sliders |

Already recorded and usable as they are: the full walk on desktop and phone (`recordings/lintel3-review-2026-10-09-desktop.mp4`, `-phone.mp4`, and the smaller `-share` copies). Those were made frame by frame with `tools/walk_offline.mjs`, so they are smooth, but things that run on the clock (dust, titles sliding in) look quicker than live.

For new clips on a quiet machine use the live recorders. If something else has the GPU:

```bash
node tools/walk_offline.mjs "http://127.0.0.1:8014/001%20Lintel/v3/" out.mp4 --from door --to living
```

## Numbers to confirm before they go on camera

- **Dates of iteration 1 and 2.** 26 and 30 September come from the session list and the journal. The "really strong iteration" line is filed under 30 September in the journal and may have been said on 1 October.
- **The scores.** Mine: bedroom 4, garden 2, bar of 8. Claude's 6 for the flat hero on 5 October. Outside reviewer: 3.7 before, 6.8 after pass one, 7.4 after pass two. The third pass was not scored during iteration 3. The iteration 4 session sent the final stills out for a third round, so check `teach/reviews/` for a pass 3 file before quoting a final number.
- **Flicker.** 2.65 to 0.51 at the first scroll, 2.18 to 0.65 as the plan zooms, 0.000 at rest. Measured with `tools/flicker.mjs` at 1440 x 900 and 2x.
- **First frame and last frame.** 0.1 grey levels out of 255 apart after the roll.
- **Frame rate.** The light clips ran at 57 to 60 frames a second. The full walk was only measured live on a busy machine (42, 50, 55 and 59 in four runs). Measure it once on a quiet one.
- **The house.** 946 m² in the page's own copy. The journal says "about 950 m² (10,200 sq ft)", a 108 m² living room and a 24 m gallery.

## Ask Sam before recording

- Loader, and whether the hero that draws itself (`?hero=draw`) becomes the opening. Both were still open when iteration 3 closed.
- Whether the video is about iteration 3 alone or waits for iteration 4. Iteration 4 is chasing the eights, so some "after" clips will be better there.

Settled since (9 October, at the start of iteration 4, "yes to all three"): the roll of paper is at the end of the scroll, the garden is scanned through the bath's glass, Warm Afternoon is the default light.
