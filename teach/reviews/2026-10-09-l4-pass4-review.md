# Lintel · Casa Serra. Outside review of iteration 4, pass 4 (round 7)

Date: 9 October 2026
Reviewer: outside creative director, same as rounds 1 to 6
Material: the 42 stills in `teach/shots/2026-10-09-l4-pass4/` (the 35 in walk order, `21c-bedIn-mid-scan`, `03b-walls-rising` and five frames of the opening), set against the round 6 stills (`2026-10-09-l4-pass3`, same names) and the round 4 and 5 sets where a detail has a history. I looked at all 42 at full size and wrote down what I saw. Then I measured how far each still moved from its round 6 twin and enlarged about ninety crops, most of them as pairs. I checked the builder's journal from "Round 6: 7.93 again" to the end, line by line against the stills he names, and the rewritten motion note against the clips and my own runs on the live page. I did not touch any code. My working frames, scripts and notes are in `/tmp/review7`, outside the project.

Scoring is unchanged. 8 means a paying client who asked for premium takes that part with no notes. Quarter points are used where a part moved and still carries notes. Where I give an 8 and still list something, those are remarks and not conditions.

Six things about the material before the scores.

1. The stills are newer than the build. `scene.js` was saved at 20:20:03, `theme.css` at 20:20:58, `staging.js` at 19:34:54, `fx-post.js` at 13:14:40. The 35 stills were saved between 20:22:52 and 20:24:51, `21c` at 20:25:02, `03b` at 20:25:05. The five opening frames were saved at 21:00:51 and come out of `lintel4-opening-roll-desktop.mp4`, which was recorded at 20:22:29. The walk recordings are from 20:56 and 20:59, the side by side clip from 21:00:14, the three-frame sheet from 20:59:47. That claim holds.
2. Two of the sheets do not. `lid-dashes-before-after-lens2.jpg` (18:48) and `garden-olive-egg-before-after.jpg` (18:51) are older than the last change to `scene.js`. The pass 4 stills and my own retina stills show the same result, so nothing hangs on it. The motion note's sentence "all numbers below were taken after the last change" is true for the numbers and not for these two pictures.
3. The places are the same as in round 6. Where the picture did not change the crops of both rounds line up to the pixel (`12-dining`, `21-bedIn`, `23-dress` and `34-finale` have no pixel that moved by more than 40 levels).
4. I ignored the "Scroll to walk in" hint on stills taken between two stops, the sway of the olive's leaves and the random foliage of the cypresses, as asked.
5. On motion I ran the builder's table on the current page, his real-step test on the current page at two different starting points and on the frozen pass 3, the floor with the outlines off, a fine sweep across 160.8 vh, my own searches on all of those frames, and I took the side by side clip and both walk recordings apart again. Six sweeps and one set of retina stills, about 940 frames kept. The machine was busy (load between 5 and 36). No command hung.
6. Part of the way through, the first batch of crops I had looked at was no longer in front of me. I had written the findings down, and I looked again at every still and at every crop this review relies on before scoring.

Short version: all seven items are at 8. That is the first time. The plan crosses the line because every reason I gave for holding it at 7.75 is closed, and I checked each one myself: the pale dashes are off the wall lids, the patio's south edge is one steady line, the five crossed labels are clear, the one-frame search at the scroll's real step exists and finds nothing at two different phases, and the sheet answers the scroll a quarter of a second after the tube leaves. The garden is back at 8 because the black egg is gone from both trees. The ending holds its 8, but not cleanly: the last look at the built house now shows whole trees where round 6 had stumps, which is right, and it also shows the two patio parasols as burnt-out white discs, which is new and is not in the journal. The new board has a grain, as I asked, and a visible tile seam down it at x 900, which is also new. Neither is the kind of thing I expect a client to raise, so neither takes a quarter off. Both are small jobs and I would do them before he sees the page. The average is 8.0.

---

## 1. Plan lines and the opening

**Round 1: 7. Round 2: 7.25. Round 3: 7.25. Round 4: 7.5. Round 5: 7.75. Round 6: 7.75. Round 7: 8.**

**The opening, and my three remarks from round 6.**

Timings from the desktop clip, measured frame by frame. The loader's last line is at full strength until 3.37 s, fades from 3.40 s and is gone by 4.07 s. The tube's shadow deepens from about 4.3 s, the tube's body is in the frame from 4.87 s, the roll's front passes the middle of the screen at about 5.8 s, and the tube is off the screen at 6.77 s. The hint and the nav start to appear at 7.00 s and are at full strength by 7.45 s.

- *The loader's line against the tube's entry.* Better, not gone. The tube does not move until the words have left, so the claim in the journal holds for the roll's travel. But the board is what the loader fades onto, and the tube's shadow is already parked along the left edge of it. `o0-loader-line-leaving` (3.85 s) shows it: "This is the walk we drew for it", half faded, with the loader's small labels, on the grained board, and a dark band at x 0 to 40. For two thirds of a second the board still has ghost lettering on it. It no longer collides with anything that moves. A remark.
- *The hand-over to the scroll.* Closed. The tube is gone at 6.77 s and the hint starts at 7.00 s. Round 6 had 0.8 s between the two. `o4-sheet-down-hint-in` at 7.2 s has the nav and the hint coming in over a finished sheet.
- *The board's surface.* Closed, with a new fault. The board has a fine horizontal grain now and reads as a brushed drawing board under a light, darker toward the edges. It is the right answer. But the grain is a picture 900 pixels wide laid side by side, and where the second copy starts there is a straight vertical seam from the top of the screen to the bottom. I saw it at full size in `o0` and `o1` before I enlarged anything, and it is in the live recording (frame 140, 4.67 s). Across x 899 to 900 the mean jump is 1.5 grey levels and 152 of 900 rows jump by 3 or more. Across the columns I sampled on either side it is 0.1 and no row does. It runs through the end of the loader's fading line. It is on screen from 3.4 s until the roll covers it at about 5.9 s. A 1920 screen would have two. The phone has none. It is faint, it is gone in two and a half seconds, and it is the first picture of the page.

`o1`, `o2` and `o3` are as good as in round 6: a cylinder with a highlight and a shaded side, the next strip of the drawing wrapped round it, the sheet with its headline, lede and title block left behind, nothing but board ahead. This time `o3-roll-late` has the roll in it. The phone clip holds up the same way. The tube is still proportionally fat there.

**The stills. What changed since round 6.**

Closed:

- `03-lens2`: the wall lids are solid. I enlarged the entrance's east wall (x 860 to 950, y 300 to 600) and the fireplace block (x 500 to 610, y 140 to 290) ten times, round 6 beside round 7. Round 6 has the pale dashed line down the middle of each. Round 7 has none. My own retina still of the same place, taken from the live page, has none. `09-livingTop` shows the same on the lids round the living room, which had pale lines and cross marks in round 6.
- `00-hero`: "3 cars" is gone and GARAGE stands between the cars and the dashed door line. STUDY stands clear under the desk with its figures under it.
- `03-lens2`: the figures under STUDY are clear of the glass wall's line. The top of the "7" touches the end of the standing wall. The room reads "72 m²".
- `04-lens3`: the fat dashes that ran under CONTACT and across STUDIO are gone. Both links stand on plain paper.
- `10-drop`: the living room's figures are gone before the camera drops. `09-livingTop` still has them, on plain floor.
- `00-hero`, `01-scroll1`, `03b-walls-rising`: the patio, the path and the garden's terrace have a thin steady outline where the paving ends. In round 6 the patio's edge was nothing in the still and pieces of line in motion.
- `05-approach`, `06-door`: both wall lights are firm black bars. The pull is a pale grey stroke.
- `03-lens2`: the loose outlined stroke under the hint is gone.

Changed and not better, or new:

- `03-lens2`, `03b-walls-rising`: the path's two new edge lines and the reflecting pool's outline now run through the scroll hint. In round 6 the hint stood on clean paper in `03-lens2`. The builder saw this and gave the hint a little paper of its own, so the lines fade out round the words, with soft ends, and carry on through the progress bar under them. In `03-lens2` the left line comes down on the R of SCROLL and the right one on IN. The words are readable. It is a patch and it looks like one.
- `01-scroll1` at (829, 577) and `03b-walls-rising` at (847, 659): the speck beside the pool's south-west corner is still there. It now sits on the new line. More under motion.
- `03-lens2`: the chain of doubled dashes beside the fireplace block (x 600 to 604, y 222 to 290) is the same as round 6 to the pixel.
- `04-lens3`: the cluster of small boxes on the far wall line, as before. The builder says he left it.
- `04-lens3`, bottom right: where round 6 had a thin double line behind the right planter there is now a fat soft dark stroke (x 1375 to 1440, y 780 to 815). It is one of the new edge lines seen from close by. Next to crisp ink it is out of register.
- `04-lens3`: six tiny clusters of specks on a diagonal from (923, 723) to (977, 835), where the path's joints stop. And the reflecting pool, which was a strong black outline beside the path in round 6, is not drawn at all in this still or in `05-approach`. Its edge lives on the annotation sheet, and that sheet has faded by the time the camera is down here.

**My round 6 list, point by point.**

1. *The pale dashes down the wall lids.* Closed, at the third attempt. `03-lens2`, `09-livingTop`, my retina still. I ran 170 vh again as I asked. The blink map no longer follows the lids. True one-frame pixels at 170 vh fell from 117 per million to 37.
2. *The patio slab's edges between 100 and 125 vh.* The south edge is closed. At 120 vh it is one thin steady line in 12 of 12 frames I laid side by side. In the clip, frames 8, 9 and 10 of the right half have the same line in the same place, where round 6 had three different pieces. The west edge is a steady line too, and the dash is still on it. I counted it with the same detector on the frames of both rounds: 18 of 30 frames at 120 vh in pass 3, 22 of 30 now, at a different height in each (y 993, 977, 943, 930, 896, 881 in device pixels), and several times with two at once. At the scroll's real step it is on the line in about 5 of 16 frames. It is 3 by 6 device pixels. On open paper it was a mark that jumped. On a line it is a bead that slides, and I would not have found it in motion without knowing where to look. Half closed. A remark now.
3. *Crossed lettering.* All five closed: CONTACT and STUDIO (`04-lens3`), the figures under STUDY (`03-lens2`), "12.00" and "6.00" (`10-drop`), "3 cars" (`00-hero`).
4. *The one-frame search at the scroll's real step.* Done, and it does what I asked. See below.
5. *Small things.* The loose stroke under the hint: gone. The doubled dashes by the fireplace block: not touched, though the note says they were. The boxes in `04-lens3`: not done, and said so. The wall light's far edge at 255 to 256 vh: closed. In frames 190 to 198 of the clip both lights are a firm outline that does not change. The hairline from 160.798 vh: I ran 40 samples from 160.780 to 160.819 in steps of 0.001. Nothing crosses the opening or the letters of LIVING in any of them. The lids on either side step half a pixel twice and stay, which is what an edge does.
6. *The opening.* The hand-over is closed. The loader's line is half closed. The board has a surface and a seam.
7. *Sam on the live page.* Not yet. The note says so itself.

**The builder's fix list, line by line, in the stills he names.**

- Canopy dashes under CONTACT and STUDIO (`04-lens3`): holds.
- STUDY (`03-lens2`, `00-hero`): holds.
- GARAGE (`00-hero`, `03-lens2`): holds.
- Living room's figures (`10-drop`, `09-livingTop`): holds.
- Paving edges as thin lines (`00-hero`, `01-scroll1`, `03-lens2`, `03b-walls-rising`, three-frame sheet): holds for the edges. The same line says "the dash by the pool's corner was the same edge". It was not. The dash is in `01-scroll1` and in `03b-walls-rising`, two of the stills he names, at the coordinates I gave in round 6.
- Reflecting pool flush with the path (`03-lens2`): the loose stroke is gone. The chain of doubled dashes I named is somewhere else and has not moved.
- Wall lights 12 cm deep (`06-door`): holds, in the still and in the clip.
- The hint's own paper (`03-lens2`): holds as described. He caught his own side effect, which is new and good. What he did about it is a patch.
- The opening (`o1-board-and-roll`, the clips): the roll waits for the loader, the hand-over is prompt, the board has a grain. The shadow under the fading words and the seam are both in the stills he names.

Six of nine hold outright and the other three hold in their main point. That is a different journal from the one I read in round 6.

**The motion evidence.**

What I did, and what came out:

- I ran the builder's table on the current page. Means: 0.96, 1.71, 2.20, 3.21, 1.58. Pops, counted with his script on my frames: 1,102, 2,388, 3,356, 7,705, 1,246. His: 1,105, 2,403, 3,430, 7,657, 1,243. Every number holds to within three percent. I did not run iteration 3 again. It is a frozen copy and I confirmed its numbers in round 6.
- I ran the floor with the outlines off. Pops: 10, 16, 184, 1,555, 396. His: 10, 15, 82, 1,412, 427. It holds at 80, 120 and 300 vh. At 170 vh I get more than twice his figure, and still a third of pass 3's 578. One run each, so I take the direction and not the 82.
- I counted true one-frame pixels again (a pixel that differs from the frame before and the frame after by more than 64 levels in the same direction while those two agree), with the same script on the frames of both rounds. Per million per frame at 80, 120, 170, 220 and 300 vh: iteration 3 has 168, 436, 655, 997 and 95. Pass 3 had 93, 188, 117, 387 and 14. Now it is 89, 127, 37, 285 and 19. With the outlines off it is 3, 1, 1, 100 and 0. So the two places I called worse in round 6 are now the two that improved most, and 300 vh went up by five pixels per million.
- I mapped where they are. At 170 vh they sit on the sides of the walls round the hall, on the timber screen and on the loungers, and no longer down the lids. At 220 vh the largest source is still the kitchen's stools and chairs at the top of the frame, then the front of the sofa and the door's frame. At 120 vh it is the garage's west wall, furniture edges and the patio's west edge.
- I ran his real-step test (`R=20 tools/flash.sh`) on my own sweep of 200 frames at 0.8 vh. One frame over 100: frame 113, 105 pixels at x 3 to 11, y 1541 to 1568. I looked at it. It is the outline of a car in the garage coming in at the left edge of the screen. His table says one frame, 107 pixels, same place.
- I ran the same test on the frozen pass 3. Six frames over 100, the worst frame 8 with 129 pixels at x 1871 to 2289, y 1274 to 1275. That is the patio's south edge below the pool, the thing I found by eye in round 6. His table says six frames and 163 pixels at the same place. So the test finds the fault I know was there.
- I ran it a third time on the current page from a different starting point (100.37 vh in place of 100), because one sweep only samples one phase. No frame over 100. The worst has 32 pixels, a thin line near the bottom of the screen that travels more than 20 pixels between two frames.
- I ran a search of my own, written separately, on all three sweeps. Current page: no frame over 100 in either (worst 51 and 30). Pass 3: four frames over 100, the worst again frame 8 on the patio's south edge.
- I pulled the 200 frames of the clip and ran my round 6 search on each half. Iteration 3 has the same three frames with more than 100 lonely pixels (289, 279, 158). The current build has two such pixels in the whole clip. Round 6 had frames with 97, 96 and 88.
- I went back to the four places I named. The patio's south edge in frames 8 to 10: one line, steady. The dash on the west edge: still there, see above. The lids at 170 vh (frames 86 to 88): solid black and the same in all three. The wall light at 255 to 256 vh (frames 190 to 198): steady.
- I checked both walk recordings for stalls. The picture stands still in the same four places on desktop and phone (the opening, the living room's plan, the closing sheet and the finale) and nowhere else.

Does the second test close the blind spot? For what I named, yes. I said a piece of line that lives for a twentieth of a vh passes the small-step test and is on screen for exactly one frame at a real scroll speed. The new test is run at that speed, it finds exactly those pieces in pass 3, and it finds none in pass 4 at two phases. My own code agrees with it on all three sweeps. Two limits remain and the note should name them. It only sees a stroke that has nothing dark within 20 pixels of it in the neighbouring frames, so a thing that comes and goes on or beside a line is invisible to it. The bead on the patio's west edge is the proof. And one sweep is one phase, so a clean result means more when it is run from two or three starting points, as I did.

What weight I give it. Enough to carry the score, for the first time. The table holds, both one-frame tests hold, the fault the new test was built to find is found by it in the old build and absent from the new one, and I see the same with my own eyes in the frames. In round 6 I wrote that the counts get checked and the claims do not. This time the claims were checked too, each against a named still, and six of nine hold outright. Where the other three fall short it is over small things described as fixed that are still in the stills he names. That habit is not gone. It has shrunk from the lids to a bead and a chain of dashes.

Three things I could not check. The recordings are 30 frames a second files, so I can confirm no stall and not "60 a second, longest gap 34 ms". The note now says this itself. I did not count shader programs. And I did not read the lid's 68 pale pixels out of the buffer. I looked at the lid.

**Verdict on item 1.** In round 6 I gave four reasons for 7.75: the lids claimed fixed and not, two labels untouched, a fix that moved a problem from one still to the next, and the patio's edge flickering in pieces. All four are closed, and I checked each in a still and in frames I made myself. The plan is flat and clean while the headline leaves, the walls rise out of it with solid tops, the lettering is clear, and between 100 and 260 vh I can find no line that switches on and off except a bead of three by six pixels. The page opens the way the client asked. What is left is a list of small things, two of them new. None is the kind of note a client raises, with one possible exception, the seam, which is faint and gone in under three seconds. That is the standard I hold the other six items to, so it is an 8. It is the 8 with the longest list under it, and the one thing no measurement replaces is still outstanding: the client's own hand on the scroll.

Remarks (not conditions):

1. The board's seam. `o0-loader-line-leaving`, `o1-board-and-roll`, a straight vertical line at x 900. Make the grain one picture as wide as the screen, or one that repeats without a join. It is a small job and I would do it before the client sees the page.
2. The bead on the patio's west edge. `01-scroll1` at (829, 577), `03b-walls-rising` at (847, 659), 22 of 30 frames at 120 vh.
3. The scroll hint on the path. `03-lens2`, `03b-walls-rising`. The path's edges run to the bottom of the screen through the hint and its bar. Stop the path's lines short of the hint, or end the paper behind it with a clean edge.
4. The loader's words fading over the board with the tube's shadow already standing at the left edge. `o0-loader-line-leaving`. Bring the shadow in with the tube.
5. `03-lens2`: the doubled dashes beside the fireplace block. `04-lens3`: the boxes on the far wall line, the soft fat stroke at the bottom right, the specks where the path's joints end. `04-lens3` and `05-approach`: the reflecting pool is missing from the drawing.
6. `08-rise` and `10-drop`: the hint lies on heavy black lines (the coffee table's outline through "THE MARKER" and "FILE", two diagonals through "CLICK" and "TO"). Both were like this in round 6 and I did not write them down. The hint's new paper trims them a little.
7. At 220 vh the kitchen's stools and chairs are still the busiest thing in the frame.
8. Sam on the live page, on his own screen, scrolling from 100 to 260 vh.

## 2. The scan follows the camera (patio)

**Round 1: 7.5. Round 2: 7.75. Round 3: 7.75. Round 4: 8. Round 5: 8. Round 6: 8. Round 7: 8.**

`13-turn-to-patio`, `14-slide`, `15-patio` and `16-olive` are the round 6 frames apart from the olive's leaves. In `13` 61 pixels moved. In `14` both cypresses beyond the wall are whole and the scan's front still crosses the olive's trunk as a band. The change in how the house is cut did nothing to this part that I can find.

I take this part. Remarks, both as in round 6:

1. `14-slide`: the white paper squares at the top end of the dark wall (x 925 to 968, y 288 to 400). The builder says they are tiles the scan has not reached. They have looked like holes for four rounds.
2. `16-olive`: the first word of the scroll hint is weak on the gravel.

## 3. The gallery

**Round 1: 6.5. Round 2: 7.5. Round 3: 7.5. Round 4: 8. Round 5: 8. Round 6: 8. Round 7: 8.**

`18-gallery`, `19-galleryMid` and `20-galleryEnd` are the round 6 frames. Nothing got worse in the room.

One new thing on the way in. `17-to-gallery`: a hard black line now runs along the gallery's threshold from (488, 768) to (858, 838) and through the words NEXT ROOM of the hint. It is one of the new paving edge lines. At full size it reads as the edge of the paper floor, so it does not look wrong, but it was not there in round 6 and it is not in the journal. In the live walk it is under the hint for about six frames.

I take this part. Remarks:

1. `17-to-gallery`: the threshold line through the hint.
2. `20-galleryEnd`: the last artwork on the left, with specks in its black square, as before. A new thin line at (435 to 551, 524) beside the reversed lettering on the floor.

## 4. The master bedroom

**Round 1: 6.5. Round 2: 7. Round 3: 7.5. Round 4: 7.75. Round 5: 8. Round 6: 8. Round 7: 8.**

`21-bedIn` and `23-dress` did not change by a pixel worth counting. `22-bedroom` changed in the window only (the olive's leaves and a cypress). `21c-bedIn-mid-scan` has one new thin dark stroke beside the ruler at (1368 to 1423, 541 to 557). It is faint.

I take this part. Remarks, the first three as in rounds 5 and 6:

1. `23-dress`: the blurred pale column at the left edge of the frame.
2. `22-bedroom`: the thin dark line at the bed's left foot corner.
3. `21-bedIn`: the counter is hard to read.
4. `21c-bedIn-mid-scan`: the new stroke by the ruler.

## 5. The bath

**Round 1: 7. Round 2: 7.5. Round 3: 7.75. Round 4: 8. Round 5: 8. Round 6: 8. Round 7: 8.**

`24-bath-start` has thinner outlines on the garden's terrace through the glass, which is the paving change and looks fine. `25-bath-mid` and `26-bath-end` changed in the window only. I looked at the two meadow olives through the glass, as I asked in round 6. Neither shows its inner body.

I take this part. Remarks, as before:

1. `25-bath-mid`, `26-bath-end`: the cypress still lines up behind the garden's olive, so the olive grows a spire.
2. The hard white dot on the mullion at lamp height.
3. The window frames are rust brown in the mirror and near black in the room.

## 6. The private garden

**Round 1: 6.5. Round 2: 7.5. Round 3: 7.75. Round 4: 8. Round 5: 8. Round 6: 7.75. Round 7: 8.**

Both things I asked for are done.

1. *The inner crown must not show from eye height.* Closed. `27-garden`: the tree in the middle at (800, 395) is a clean olive on the horizon, two trunks and a flat crown of leaves with sky between them. The black egg is gone. The tree at the left edge at (60, 430) has lost its slab. I enlarged both, round 6 beside round 7. `28-lift` shows the same trees from above with their bodies still under the leaves, as they were.
2. *Say what moved the trees into this view.* Closed. The journal says it was the builder's own change to the slope south of the house, made for the phone's hero, and that he did not look at the garden afterwards. That is the honest account.

With the egg gone the frame is better than the one I gave an 8 in round 5. It has a middle distance now. The fire, the chairs, the pool, the sky and the type are as they were. I take this part.

Remark:

1. The cypresses behind the garden's own olive are still smooth cones in a camouflage print next to trees made of leaves.

## 7. The ending

**Round 1: 6.5. Round 2: 7. Round 3: 7. Round 4: 7.75. Round 5: 7.75. Round 6: 8. Round 7: 8.**

I was asked to look at `29-top-built` in particular, and it is where this item changed.

My round 6 remarks, point by point:

1. *The court olives.* Closed. The three ragged blots in the arrival court are three small crowns now, at about (822, 646), (832, 683) and (820, 716). They read as young trees from above. This was written down in three rounds.
2. *The grey scrap on the lawn.* Closed. The bat at (305, 170) is a whole meadow olive.
3. *The cypresses in `28-lift`.* As before.
4. *The two tree dots at the ends of the button.* Closed. The nearest cypress is at (1178, 33) and the button starts at x 1240.
5. *The tube's end.* Not done, on purpose. Still a remark.

What the change did besides. The landscape and everything that stands outdoors is no longer cut at plan height, so the last look shows a built house with its trees. The patio's olive is a full three-lobed crown over the middle of the patio, the garden's olive covers its ring, the indoor tree by the living room shows a few leaves over its pot. This is right. A house seen from above has its trees, and round 6's patio with a ring and a dark dot in it was the drawing's convention carried into the wrong picture. The builder asks whether the client wants the big crown there, since it hides the ring. My view: keep it.

Two things came with it and neither is in the journal.

- **The parasols.** `29-top-built`, `30-roll-rest`, `31-roll-1`: the two patio parasols are no longer cut either. From above each is a flat white octagon 43 pixels across, at (893, 513) and (1027, 513), burnt out to paper white (253, 254, 248, against 238, 228, 203 for the paving beside them), with the loungers showing through faintly and a glow spilling onto the pool's edge below. In round 6 that corner had two pairs of loungers. Pixels at 250 or more on all three channels in that area: 130 then, 590 now. They are the brightest things in the frame and they sit against its darkest. They read as umbrellas, which is why this is a remark and not a quarter. They do not read as part of this render. The phone's last look has them too. The builder's own before and after sheet shows them in its last row and says nothing.
- **The meadow olive.** `29-top-built` at (300, 165): seen from straight above, the tree's inner body is a smooth dark disc with a thin wreath of leaves and bare branches round it. In `28-lift`, at an angle, the leaves cover it. It is the garden's egg seen from the one direction the fix does not help. At this size, about 30 pixels across, it reads as a tree with a dense middle. At retina size it is a ball. The three court olives and the two trees by the door are the same in small.

Why still 8. Set against round 6 the frame gained more than it lost: three remarks I carried are closed and the house is finally shown with its garden. The roll (`30-roll-rest` to `32-roll-2`) is as strong as it was, the tube carries the drawing, `33-sheet` is the hero's own sheet with the corrected labels on it, and `34-finale` closes the page properly. Frames 2610 to 2790 of the live walk show the lift, the turn, about two seconds of the last look and the roll. At every twelfth frame I see nothing out of place. I would show this ending to the client as it is. Given an hour, I would tone the parasols down first.

Remarks:

1. `29-top-built`: the parasols. Give them the cream of the fabric they have in `15-patio`, keep the highlights under paper white, and let nothing show through. Or cut them with the house, as before.
2. `29-top-built`: the meadow olive's body from straight above. More leaves over its top, or a body that breaks up when the camera is directly overhead.
3. `28-lift`: the cypresses at the top of the frame.
4. The tube's end, once.

The open question is the same as in round 6. The client has not said whether the roll at the end stays. I scored what is built, and my view has not changed: keep it.

---

## Scores

| # | Item | Before | Round 1 | Round 2 | Round 3 | Round 4 | Round 5 | Round 6 | Round 7 | Gap to 8 |
|---|------|--------|---------|---------|---------|---------|---------|---------|---------|----------|
| 1 | Plan lines and the opening | 5 | 7 | 7.25 | 7.25 | 7.5 | 7.75 | 7.75 | 8 | 0 |
| 2 | Scan follows the camera (patio) | 3 | 7.5 | 7.75 | 7.75 | 8 | 8 | 8 | 8 | 0 |
| 3 | Gallery | 4 | 6.5 | 7.5 | 7.5 | 8 | 8 | 8 | 8 | 0 |
| 4 | Master bedroom | 4 | 6.5 | 7 | 7.5 | 7.75 | 8 | 8 | 8 | 0 |
| 5 | Bath | 4 | 7 | 7.5 | 7.75 | 8 | 8 | 8 | 8 | 0 |
| 6 | Private garden | 2 | 6.5 | 7.5 | 7.75 | 8 | 8 | 7.75 | 8 | 0 |
| 7 | Ending (paper roll) | 4 | 6.5 | 7 | 7 | 7.75 | 7.75 | 8 | 8 | 0 |
| | Average | 3.7 | 6.8 | 7.4 | 7.5 | 7.9 | 7.9 | 7.9 | 8.0 | 0 |

The average is 8.00. All seven items are at 8. None is above it.

## Overall

The page meets the bar the client set, in every category, and I can say that without holding my nose on any of them. What changed between round 6 and this one is not talent, which was never short, but the last step of each fix. The lid dashes were "fixed" twice by moving something and looking at the number. The third time the builder counted the fault in one place, changed one thing at a time and found the cause. The garden's egg was traced to a change made for a different view on a different device. Each line of the fix list names a still, and when I opened those stills six of nine lines were simply true and the other three were true in the main. He also caught one of his own side effects before I did, which has not happened before in seven rounds.

The pattern I have described since round 4 is smaller and still there. This pass made three new things that nobody looked at: a seam in the board, two burnt-out parasols in the last view, and a handful of new edge lines in frames that were not on the list (`17-to-gallery`, `04-lens3`). Two old things are written up as fixed and are not (the bead on the patio's edge, the chain of dashes). None of these costs a quarter. Together they are the difference between an 8 and the 8.5 this page could be.

Three things should happen before this goes out. Fix the seam, because it is the first picture. Tone down the parasols, because it is nearly the last. And put the page under the client's own hand, because every decision the builder lists as his own (whole trees in the last view, "3 cars" gone, the reflecting pool flush, deeper wall lights, the hint's paper, the board's grain, the opening's timing, and whether the second roll stays) is the client's to confirm, and because his sentence about blinking was about what he saw while scrolling. I have measured that as far as it can be measured. He has not yet looked.

## Claims that did not hold, and what got worse

Claims from the builder's journal and motion note, checked in the stills, the clips and my own runs.

Hold: the stills, the clips and the three-frame sheet are newer than the code. The same 35 places. The table in the motion note for the current build (all means, all pops). The real-step test: one frame of 201 over 100 on the current page, six on pass 3 with the worst on the patio's south edge. The small-step test at 160.8 vh. The lids clean (`03-lens2`, `09-livingTop`, my retina still, the blink map at 170 vh). The patio's south edge as one steady line (120 vh, clip frames 8 to 10, the three-frame sheet's last row). All five labels (`00-hero`, `03-lens2`, `04-lens3`, `10-drop`). The wall lights firm in the still and steady at 255 to 256 vh. The egg gone from both garden olives, from the garden and through the bath's glass (`27-garden`, `25-bath-mid`, `26-bath-end`), and unchanged from above (`28-lift`). What moved those trees. Whole trees in the last look, and the two cypresses clear of the button (`29-top-built`). The hand-over after the roll. No stall in either recorded walk. The correction about the 3 bytes, which settles the looseness I flagged twice.

Hold in part:

- "The dash by the pool's corner was the same edge." The edge is steady. The dash is still in `01-scroll1` at (829, 577) and `03b-walls-rising` at (847, 659), and in 22 of 30 frames at 120 vh against 18 of 30 in pass 3.
- "The roll starts once the loader's last line has gone." The tube's travel does. Its shadow stands at the left edge of the board from 3.40 s, while the line fades until 4.07 s (`o0-loader-line-leaving`).
- "The board has a fine grain." It has, and a seam at x 900.
- "The scroll hint stands on a little paper of its own." It does. The lines it hides resume above and below it and cross its bar.
- "The floor fell through at 80, 120 and 170 vh: 10, 15 and 82." I get 10, 16 and 184. Against 578 in pass 3 the point stands. The 82 does not repeat.
- "The reflecting pool is flush, edge on the annotation sheet." True at 170 vh. By `04-lens3` and `05-approach` the sheet has faded and the pool is not in the drawing.
- "From above it is as it was." True in `28-lift`. From straight above in `29-top-built`, where the trees were stumps before and are whole now, the body shows.
- "All numbers below were taken after the last change to the code." The numbers, yes. The lid sheet and the egg sheet are from 18:48 and 18:51.

Do not hold:

- "The doubled dashes on the fireplace block were lid dashes", and in the journal that the pool's kerb was the chain of doubled dashes. The chain I named stands beside the fireplace block in `03-lens2` at x 600 to 604, y 222 to 290, and it is the same as round 6 to the pixel.

Worse than round 6, or newly wrong:

- `o0-loader-line-leaving`, `o1-board-and-roll`: the seam in the board at x 900.
- `29-top-built`, `30-roll-rest`, `31-roll-1`: the parasols as burnt-out white discs. Not in the journal.
- `29-top-built`: the meadow olive's body as a dark disc from straight above.
- `03-lens2`, `03b-walls-rising`: the path's edges through the scroll hint and its bar.
- `04-lens3`: the soft fat stroke at (1375 to 1440, 780 to 815), the specks from (923, 723) to (977, 835), the reflecting pool gone from the drawing here and in `05-approach`.
- `17-to-gallery`: the threshold line through the hint. `20-galleryEnd`: the line at (435 to 551, 524). `21c-bedIn-mid-scan`: the stroke at (1368 to 1423, 541 to 557). None in the journal.
- The bead on the patio's west edge: 18 of 30 frames then, 22 of 30 now.
- 300 vh: pops from 1,152 to 1,246 and true one-frame pixels from 14 to 19 per million. The note reports the first and gives a reason I find plausible.

Still open from earlier rounds:

- `03-lens2`: the doubled dashes beside the fireplace block.
- `04-lens3`: the cluster of boxes.
- `08-rise`, `10-drop`: the hint on heavy black lines (there since round 4 at least, first noted now).
- `14-slide`: paper squares at the top of the dark wall. `16-olive`: the hint on the gravel.
- `20-galleryEnd`: the last artwork.
- `22-bedroom`: the line at the bed's foot. `23-dress`: the pale column at the left edge. `21-bedIn`: the counter.
- `25-bath-mid`, `26-bath-end`: the white dot on the mullion, the spire behind the olive, the rust frames in the mirror.
- `28-lift`: the cypresses as lumps.
- The tube's end, never in frame.
- Sam's own scroll of the live page.

Cleared from the "worse" list of round 6: the egg and the slab in the garden's olives. The figures on other lines in `10-drop`. The figures under STUDY on the wall line. The loader's line against a moving tube. The rise in one-frame pixels at 170 and 220 vh. Also cleared from the older list: the lid dashes, the loose stroke under the hint, CONTACT and STUDIO on the dashed line, "3 cars", the patio's south edge in pieces, the wall light's far edge, the hairline at 160.8 vh, the court olives, the grey scrap on the lawn, the tree dots at the button, the late hand-over, the flat board.

## How to repeat what I found

The seam in the board, from the live recording (the join is the vertical line in the middle of the crop):

```bash
ffmpeg -v error -i "001 Lintel/recordings/lintel4-opening-roll-desktop.mp4" -vf "select='eq(n,140)',crop=600:400:600:250,scale=1200:-1" -frames:v 1 /tmp/review7/seam.png
```

The parasols and the meadow olive at retina size (the parasols are at device pixels x 1700 to 2180, y 940 to 1120 of `29-top-built`, the tree at x 480 to 740, y 180 to 420):

```bash
python3 tools/review_stills.py "http://localhost:8014/001%20Lintel/?at=0&steady" /tmp/review7/retina --only 29 --dpr 2
```

The bead on the patio's west edge (in the kept frames the edge is at device pixels x 1085 to 1155, y 770 to 1020, and the bead is at a different height in each frame from the fourth on):

```bash
node tools/flicker.mjs "http://localhost:8014/001%20Lintel/?at=0&steady" "120:0.05:30" 1440x900 2 /tmp/review7/f120
```

The real-step test from a second starting point, and on the frozen pass 3 for comparison:

```bash
CROP=0,0,1,1 node tools/flicker.mjs "http://localhost:8014/001%20Lintel/?at=0&steady" "100.37:0.8:200" 1440x900 2 /tmp/review7/f-speed-b
```

```bash
CROP=0,0,1,1 node tools/flicker.mjs "http://localhost:8014/001%20Lintel/v4b/?at=0&steady" "100:0.8:200" 1440x900 2 /tmp/review7/f-speed-p3
```

```bash
R=20 tools/flash.sh /tmp/review7/f-speed-b /tmp/review7/f-speed-p3
```

The floor with the outlines off, to see whether 82 at 170 vh repeats:

```bash
node tools/flicker.mjs "http://localhost:8014/001%20Lintel/?at=0&steady&ink=none" "170:0.05:30" 1440x900 2 /tmp/review7/f-noink
```

The path's lines through the hint: crop `03-lens2.jpg` of pass 3 and of pass 4 at x 520 to 920, y 770 to 860 and put them side by side.
