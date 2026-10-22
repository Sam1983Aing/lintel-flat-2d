# Lintel · Casa Serra. Outside review of iteration 4, pass 2 (round 5)

Date: 9 October 2026
Reviewer: outside creative director, same as rounds 1 to 4
Material: the 36 stills in `teach/shots/2026-10-09-l4-pass2/` (35 in walk order plus `21c-bedIn-mid-scan`), set against the round 4 stills (`2026-10-09-l4-pass1`, same file names) and the round 3 set where a detail has gone back and forth. I looked at all 36 at full size first and wrote down what I saw. Then I put each one next to its round 4 twin and enlarged about fifty pairs of crops. I checked the builder's journal entries from "Round 4: 7.9, four parts at eight" to the end against the stills. For item 1 I read the motion note, looked at the three-frame sheet, took the opening clip apart frame by frame, and ran the measurements myself against the live page. I did not touch any code. My working frames are outside the project.

Scoring is unchanged. 8 means a paying client who asked for premium takes that part with no notes. Quarter points are used where a part moved and still carries notes. Where I give an 8 and still list something, those are remarks and not conditions.

Four things about the material before the scores.

1. The stills are newer than the build this time. `scene.js` and `staging.js` were saved at 13:52:22, `theme.css` at 13:22:05, `fx-post.js` at 13:14:40. The 35 stills were saved between 13:53:40 and 13:55:39 and `21c` at 14:09:03. That claim holds.
2. The places are the same as in round 4. Wherever the picture itself did not change, the crops of both rounds line up to the pixel.
3. I ignored the "Scroll to walk in" hint on stills taken between two stops, as asked.
4. This is the first round in which I could judge motion at all. Item 1 says what I did and what weight it gets.

Short version: five items are at 8 now (patio scan, gallery, bedroom, bath, garden). The bedroom is the one that crossed the line this round, and it did so cleanly. The plan moves from 7.5 to 7.75 and the ending stays at 7.75. On motion: the evidence is good and I could reproduce every number in it. The things that blinked in iteration 3 are gone. But the builder's own clip contains one line that flashes for a single frame in the new build and not in the old one, and the front door's handle still crawls. This round broke far less than round 4 did. Two small things are new and wrong: a cypress tip that floats in the sky in `14-slide` and a straight seam through the meadow in `28-lift`.

---

## 1. Plan lines and the opening

**Round 1: 7. Round 2: 7.25. Round 3: 7.25. Round 4: 7.5. Round 5: 7.75.**

**The stills.**

Most of what I listed is done. In `00-hero` the master wing is clean: the ragged inner edge on the bath's east wall is gone, so are the dashes in the dressing room, the faint basins are bold again, the specks by the corner seat are gone and the strip over the bench at the front door is a tidy comb. In `02-lens1` the counter and the ruler are off the plan. In `03-lens2` the study's mullions are whole strokes where they were little ladders of dashes, the timber screen by the door is a row of solid fins, the olive's ring is whole and the two entry planters are black like the others. In `04-lens3` the glass hatch on the right has its frame back and the dotted remnant on the left is gone. In `08-rise` and `09-livingTop` the wordmark steps back while the picture is a plan.

What is still open in the stills:

- `03-lens2`, enlarged: the dark wall lids still carry a pale dashed line down their middle. The crop is the same as round 4 dash for dash. The journal says this was fixed. It was not.
- `03-lens2`: the solid mullions now run straight through the STUDY label and its figures. One of them covers the 7, so the room reads "2 m²". This is a side effect of the mullion fix.
- `03-lens2`: a doubled dashed line beside the dark fireplace block is still a chain of dashes. A short loose grey stroke sits under the scroll hint, to the right of its underline.
- `04-lens3`: the lot's dashed boundary runs along the bottom of the frame right under STUDIO and CONTACT, so the links look underlined. The front door's pull handle is a pale broken stroke while the handle on the wall to its right is black. A small cluster of boxes still sits on the wall line right of centre.
- `02-lens1`: the START A PROJECT button sits on the sheet's own heading and "PLA" sticks out to its right. It was like this in round 4 and I missed it.
- `09-livingTop`: the room's dimension figures lie on the sofa's own lines (6.00 on the back, 4.50 on the arm, 9.00 crossed by a wall line). Same as round 4.

**The motion evidence, and what weight I give it.**

What I asked for in round 4, and what came:

- A 60 fps recording at a normal scroll speed, full retina size, old against new, with 2x crops on the garage, the timber screen and the study glazing. What came is 200 stepped positions from 100 to 260 vh, old left and new right, at real pixel size. That is better for taking apart than a live capture and worse for judging feel. It shows the middle 1440 x 900 of the retina frame, so the study glazing is out of frame for nearly all of it. No 2x crops.
- The two-frame test at four labelled places. What came is three frames at four labelled places, all at 120 vh. Two of the four are places I named (garage door, entry slab). The rug edge and the wall bevel are not there.
- The flicker tool with the step scaled to the camera's speed. It came as numbers in the note: ratios of 1.26, 1.42 and 1.46 for the new lines against 1.36, 1.57 and 1.54 for the old. I did not rerun those.
- The client's own eyes. Not yet.

What I did:

- I ran the builder's commands against the live page for all three builds. My means: now 1.06, 1.83, 2.28, 3.41, 1.56. Iteration 3: 0.88, 2.04, 2.85, 4.37, 1.54. No outlines: 0.52, 0.80, 0.85, 1.04, 0.29. I counted the pops with my own script from the kept frames: now 1,282, 2,691, 3,656, 8,471, 1,170. Iteration 3: 2,654, 7,015, 11,653, 17,838, 5,145. The means of all three builds and the pops of these two hold to within a few percent of his table. I did not recount the pops of the build with no outlines.
- A pop, as he counts it, is mostly an edge that moved over by a pixel and stayed. That is a step and not a blink. So I split the pops and counted only pixels that differ from both the frame before and the frame after by more than 64 levels in the same direction while those two agree. That is a pixel that is there for one frame, or gone for one frame. Per million pixels per frame, at 80, 120, 170, 220 and 300 vh: iteration 3 had 172, 470, 697, 1,052 and 100. Now it is 104, 208, 81, 363 and 88. So true blinks are under a tenth of the pops and they fell by 40, 56, 88, 65 and 12 percent. They are not zero.
- I pulled all 200 frames of the clip and counted loose dots in each half (dark pixels with almost nothing dark around them). Iteration 3 averages 474 a frame, the new build 155. In the second half of the clip, where the house is in 3D, it is 620 against 27. In the first quarter, where the plan is still flat, it is 410 against 376. Those are the drawing's own dashes and lettering in both builds.
- I put three consecutive frames side by side at seven moments of the clip and enlarged them. Garage, frames 20 to 22: the old planter has inner arcs that change shape every frame, the new one is a clean circle in all three. Front door, frames 60 to 62: the old timber screen is ragged and different in each frame and the entry slab's outline has pieces missing. The new screen is a regular comb and the slab is whole in all three. Frames 100 to 102, 130 to 132 and 150 to 152: the old screen is thin strokes with rows of dots between them that sit somewhere else in every frame. The new one is solid fins, the same in every frame. This is the clearest gain in the whole clip.
- I searched every frame of the clip for ink that is there in one frame with nothing near it in the frame before or after.

What that search found:

- **A line that flashes for one frame.** Frame 77 of the clip (2.5 seconds in, and again at 9.2 and 15.9), right half only: a double line runs across the living room's opening, straight through the LIVING label, from one wall end to the other. It is not in frame 76 or 78, and it is not in the iteration 3 half at all. I reproduced it on the live page three times with finer and finer steps. It is there from 160.798 to 160.804 vh and at no other position between 160 and 162. That is 0.7 vh before the `lens` camera key. The window is about 0.007 vh wide, so on a normal pass the chance of a frame landing in it is under one percent. It is still a line that switches on and off, in the build that was sent to me as free of that, and it shows in the evidence that was meant to prove it.
- **The front door's handle crawls.** From about 252 to 260 vh the pull handle on the door is drawn as black segments that sit at a different height in every frame, with a pale wipe over the door's boards behind it. Iteration 3 had a broken handle too. It is the same handle that is pale in `04-lens3`.
- **A sweep for more of the same.** Because one flash turned up on a grid as coarse as 0.8 vh, I stepped the live page from 140 to 142 vh in 500 steps of 0.004 vh and ran the same search. No stroke appears from nowhere in that stretch. What does happen, in 19 of the 500 samples, is that an edge of a furniture symbol doubles or thins for one sample (150 device pixels at most). So the line at 160.80 has no sibling there. I tested only that one stretch.

What convinced me: the numbers are real and I can repeat them. The mechanism is named and the picture agrees with it. The three places where iteration 3 visibly came and went (the dots on the open land, the line across the garage door, the timber screen) are steady in every frame I enlarged. That is most of what the client described.

What did not: "glide" is still not what the lines do, and the builder now says so himself, which I respect. The three-frame sheet proves four places at one position. The clip was not searched before it was sent, or the flash at frame 77 would have been found.

**Verdict on item 1.** I give the motion evidence real weight. It is the reason this item moves at all. I also drop the blanket condition from round 4: I no longer hold this item back for lack of motion evidence. What holds it at 7.75 is specific. One line flashes at 160.80 vh. One handle crawls and is visibly weaker than its neighbour in a still. Lettering is crossed in three places. The lids still have their dashes. None of these is large. Together they are notes, and 8 means no notes.

Remaining fixes:

1. The line across the living room's opening at 160.80 vh. Find what draws it and remove the cause. Then show the 21 samples from 160.790 to 160.810 in steps of 0.001 with no line in any of them.
2. The front door's pull handle, 252 to 260 vh and in `04-lens3`: one whole stroke, the same weight as the handle beside it.
3. Run the one-frame search over the clip before it is sent again. It should report no stroke longer than a hundred device pixels that exists in one frame only. Then sweep 2 vh either side of the `lens` and `approach` keys in steps of 0.004.
4. `03-lens2`: the pale dashes down the middle of the dark lids.
5. Lettering that is crossed: STUDY and its "72 m²" in `03-lens2`, CONTACT and STUDIO in `04-lens3`, the sheet heading under the button in `02-lens1`, the figures on the sofa in `09-livingTop`.
6. Small: the dashed double line by the fireplace block and the loose stroke under the hint in `03-lens2`, the cluster of boxes in `04-lens3`.
7. Sam's own eyes on his own screen. That one is his to do and not something the builder can hand me.

## 2. The scan follows the camera (patio)

**Round 1: 7.5. Round 2: 7.75. Round 3: 7.75. Round 4: 8. Round 5: 8.**

Better than round 4 in one way that matters. The olive's trunk is dark and rough in `15-patio` and `16-olive`, where the uplight used to bleach it, and the young olives beyond the pool have dark trunks where they were chalk white. The builder found that every trunk in the scene was lit from the wrong side. That closes a note I had carried since round 2. The scroll hint in `16-olive` has a halo now and can be read, though "SCROLL" is still the weak half on the gravel.

I take this part. Remarks:

1. `14-slide`, new: a cypress tip floats in the sky left of centre, above a dark canopy that was not there in round 4. Its lower half is missing and sky shows between the two. In round 4 the same tip stood on the wall line. It is thirty-five pixels tall and the client used the word "floating" about another room. Fix it before he sees it. This is the nearest thing to a condition on this item.
2. `14-slide`: the three white paper squares at the top end of the dark wall are still there, unchanged since round 3.

## 3. The gallery

**Round 1: 6.5. Round 2: 7.5. Round 3: 7.5. Round 4: 8. Round 5: 8.**

The chopped ".00" in the doorway of `17-to-gallery` is gone. `18-gallery`, `19-galleryMid` and `20-galleryEnd` are as they were. Nothing got worse.

I take this part. Remark:

1. `20-galleryEnd`: the last artwork on the left is as soft as in round 4 and has two specks in its black square where it had one.

## 4. The master bedroom

**Round 1: 6.5. Round 2: 7. Round 3: 7.5. Round 4: 7.75. Round 5: 8.**

Every one of my five fixes is done.

- The window in `22-bedroom` is clear in all panes: a dusk sky, the dark wall, the umbrella and the loungers crisp. I measured the same patch of the left pane in three rounds: 116 in round 3, 149 in round 4, 112 now. The glass rewrite did what the journal says.
- The dotted mesh strip at the right end of the headboard is a plain timber edge again.
- The left lamp no longer makes a glossy hot spot. Both lamps glow and both throw a soft pool on the leather.
- The duvet's corner at the foot is tucked.
- `21c-bedIn-mid-scan` is the frame I asked for. The scan's front is on the floor beside the bed, in orange. The bed is finished and solid. The bench in front of it and the long cabinet on the far wall are still drawings. Nothing is see-through. The veil I complained about for three rounds is gone at the moment it used to show.

`22-bedroom` is now a frame I would put in a portfolio: the leather headboard under its strip of light, the two lamps, the throw, the bench with its books, the branches against the charred wall and the pool terrace through clear glass. The client gave this room a four and asked for "a high-end bedroom" with nothing floating. It is that. I take this part.

Remarks:

1. `23-dress`: a blurred pale column fills the left edge of the frame, something hanging very close to the lens. It was orange in round 4. The hanging clothes are rounded now, as claimed. I still see no light in the bays.
2. `22-bedroom`: a thin dark line stands at the bed's left foot corner, above the book on the bench.
3. `21-bedIn`: the counter sits on the scan's orange line on the rug and is hard to read.

## 5. The bath

**Round 1: 7. Round 2: 7.5. Round 3: 7.75. Round 4: 8. Round 5: 8.**

Two of my three remarks are answered. In `26-bath-end` the ruler is clear of the mirror's edge. In `25-bath-mid` the view through the glass is a clear dusk sky with the garden under it, where round 4 had a pale veil over the whole window. That was the fault the glass rewrite was written for and it is gone.

I take this part. Remarks:

1. The window frames are still rust brown in the mirror and near black in the room.
2. `25-bath-mid` and `26-bath-end`: a small hard white dot sits on a mullion at lamp height. It is brighter than in round 4.
3. `25-bath-mid`: the cypress behind the garden's olive lines up with it, so the olive seems to grow a spike. One pale bar is left at the head of the left pane.

## 6. The private garden

**Round 1: 6.5. Round 2: 7.5. Round 3: 7.75. Round 4: 8. Round 5: 8.**

The one step back I named in round 4 is undone. The olive's trunk in `27-garden` is dark again, for the same reason as the patio's. The fire, its light on the bowl and the grass, the sky and the nav are as they were. Nothing got worse.

I take this part. No new remarks.

## 7. The ending

**Round 1: 6.5. Round 2: 7. Round 3: 7. Round 4: 7.75. Round 5: 7.75.**

Three of four fixes moved. In `30-roll-rest` the tube at rest carries the drawing: the west wall, the guest suites' door swings and three ink cars that sit right beside the three real ones. That frame was nearly blank paper in round 4 and it is now the best statement of the client's idea in the sequence. The nav and the wordmark on the paper are dark and easy to read again. In `29-top-built` the grid in the lawn is gone. In `28-lift` the meadow olives have far more leaf and a smooth crown where they had a faceted grey one.

Why not 8. All of it is in two frames.

- `28-lift`, left quarter. Each meadow olive is still a smooth green egg inside a wreath of black flecks. The leaves lie round the crown and not over it, so from above the eye finds the egg first. The cypresses at the top are lumps in the same camouflage print. And there is a new fault: a straight vertical seam runs through the meadow about 160 pixels in from the left edge, from a third of the way down to the bottom, with lighter grass to its right. It was not there in round 4.
- `29-top-built`. The three olives of the arrival court are pale torn scraps in their rings. The journal says they got crowns. From above they got lighter. The court's stone bands have also faded, so the court is a larger blank than it was.

On the tube's end. I asked for one glimpse of it in rounds 3 and 4 and it was not done. The builder says so. With the drawing on the tube at rest the roll now reads as a roll without it, so I move this from a fix to a remark.

Remaining fixes:

1. `28-lift`: the seam in the meadow.
2. `28-lift`: the meadow olives. Put the leaves over the crown, or frame the two trees out. I said "real crowns, or take them out of this frame" in round 4 and that still stands.
3. `29-top-built`: the court olives. A small dark crown each, like the patio's olive seen from above, or leave the rings empty.
4. Remark: one end of the tube in frame, once.

---

## Scores

| # | Item | Before | Round 1 | Round 2 | Round 3 | Round 4 | Round 5 | Gap to 8 |
|---|------|--------|---------|---------|---------|---------|---------|----------|
| 1 | Plan lines and the opening | 5 | 7 | 7.25 | 7.25 | 7.5 | 7.75 | 0.25 |
| 2 | Scan follows the camera (patio) | 3 | 7.5 | 7.75 | 7.75 | 8 | 8 | 0 |
| 3 | Gallery | 4 | 6.5 | 7.5 | 7.5 | 8 | 8 | 0 |
| 4 | Master bedroom | 4 | 6.5 | 7 | 7.5 | 7.75 | 8 | 0 |
| 5 | Bath | 4 | 7 | 7.5 | 7.75 | 8 | 8 | 0 |
| 6 | Private garden | 2 | 6.5 | 7.5 | 7.75 | 8 | 8 | 0 |
| 7 | Ending (paper roll) | 4 | 6.5 | 7 | 7 | 7.75 | 7.75 | 0.25 |
| | Average | 3.7 | 6.8 | 7.4 | 7.5 | 7.9 | 7.9 | 0.1 |

To two places the average is 7.93, up from 7.86. Five items are at 8: patio scan, gallery, bedroom, bath, garden. Two are under: plan (7.75) and ending (7.75).

## Overall

This was a careful round. Round 4 fixed a lot and broke a handful of things on the way. Round 5 fixed nearly everything I listed and broke two small ones. The glass, the trunks and the hero's specks were each traced to a cause and not patched, and it shows: the bedroom window, the bath's view and three trunks all came right at once. The bedroom is the result I would point to. On motion the builder did the honest thing. He measured the same places on three builds, wrote down what the numbers do not show, and stopped calling it a glide. I could repeat all of it. What I add is that the clip should have been searched before it was sent, because the one flash in it took me a few minutes to find once I looked for it. What stands between this page and seven eights is short and exact: one line at 160.80 vh, one door handle, a few crossed labels and the lid dashes on the plan. One seam and two sets of olives at the ending. None of it is a matter of taste.

## Claims that did not hold, and what got worse

Claims from the builder's journal and motion note, checked in the stills, the clip and my own runs.

Hold: the stills are newer than the code. The same 35 places. Window frames and mullions as one solid stroke from far off, and no hatch without its frame (`03-lens2`, `04-lens3`). Lids on the timber screen's fins. The olive's ring whole and the entry planters black. The hero's master wing clean. The trunks (`15-patio`, `16-olive`, `27-garden`). The glass (`22-bedroom`, `25-bath-mid`). The headboard's end, the lamps and the tucked duvet. The bed opaque with the scan's front beside it (`21c`). The lawn without its grid. The tube carrying the west wall and the first rooms at rest. The wordmark and corner links staying until the closing section, the counter and ruler stepping back over a plan. The numbers in the motion note's table that I reran (all the means, and the pops of iteration 3 and of the current build). "Things that pop fell by half to three quarters." The garage door's line steady in three frames. The open land west of the house as plain paper.

Hold in part:

- "Does anything switch on and off?" Not at the four places on the sheet. At 160.80 vh a line across the living room's opening does, in the new build only.
- "The meadow olives have three times the leaves and a smooth leaf-coloured crown inside." True as written. In `28-lift` it reads as an egg in a wreath.
- "The scroll hint keeps a paper halo over mid tones." It has one in `16-olive` and the first word is still weak.
- "Each bay has a lit back. Hanging clothes are rounded." The clothes are. I see no light in the bays in `23-dress`.
- The recording is described as the opening "at a normal scroll speed". It is 200 still positions. In the live walk the same stretch passes in a little over two seconds, at more than 1 vh a frame. The clip shows what is drawn at each position. It does not show what that feels like.
- The motion note says the frame after the roll and the first frame of the page are "the same in every byte". The journal says they "differ in 9 bytes out of six million". One of the two is loose. I did not check which.

Do not hold:

- "Wall lids win over the bevel between a wall's two skins (the pale dashed line down the middle of every cut wall)." The dashes are in `03-lens2` exactly as in round 4, and in the new half of the clip.
- "The olives of the arrival court get crowns too." In `29-top-built` they are paler scraps than before.

Worse than round 4, or newly wrong:

- `14-slide`: a cypress tip floating in the sky above a new canopy.
- `28-lift`: a straight seam through the meadow.
- `03-lens2`: mullion strokes through the STUDY label, "72 m²" reads "2 m²".
- `29-top-built`: the court's stone bands are fainter and the court olives paler.
- `25-bath-mid`, `26-bath-end`: the white dot on the mullion is brighter.
- In motion, new build only: the one-frame line at 160.80 vh.

Still open from earlier rounds:

- `14-slide`: paper squares at the top of the dark wall.
- `20-galleryEnd`: soft last artwork.
- `09-livingTop`: dimension figures on the sofa's lines.
- `02-lens1`: the button on the sheet heading (there in round 4, first noted now).
- The front door's handle, broken in iteration 3 and still crawling.
- The tube's end, never in frame.

Cleared from the "worse" list of round 4: the milky panes, the mesh strip and the hot spot in `22-bedroom`. The pale trunk in `27-garden`. The specks on `00-hero`. The broken ring and the grey planters in `03-lens2`. The hatch without mullions in `04-lens3`. The pale nav in `30-roll-rest`. The ruler on the mirror's edge in `26-bath-end`. The chopped ".00" in `17-to-gallery`. Also cleared from the older list: the bleached trunk in `16-olive` and the wordmark on plan lettering in `08-rise` and `09-livingTop`. The meadow olives in `28-lift` are better and not cleared.

## How to repeat what I found

The one-frame line, on the live page (seven of the 21 samples show it):

```bash
CROP=0.4,0.3,0.25,0.2 node tools/flicker.mjs "http://localhost:8014/001%20Lintel/?at=0&steady" "160.79:0.001:21" 1440x900 2 /tmp/review5/line
```

The same line in the clip (right half, across the LIVING label):

```bash
ffmpeg -v error -i "001 Lintel/recordings/lintel4-opening-lines-before-after.mp4" -vf "select='between(n,75,77)'" -vsync 0 /tmp/review5/f%03d.png
```

The handle, on the live page (40 frames, the door is in the middle of the frame):

```bash
CROP=0,0,1,1 node tools/flicker.mjs "http://localhost:8014/001%20Lintel/?at=0&steady" "252:0.2:40" 1440x900 2 /tmp/review5/handle
```
