# Lintel · Casa Serra. Outside review of iteration 4, pass 1 (round 4)

Date: 9 October 2026
Reviewer: outside creative director, same as rounds 1 to 3
Material: the 35 stills in `teach/shots/2026-10-09-l4-pass1/`, set against the round 3 stills (`2026-10-09-after-final`, same file names), with the round 2 and BEFORE sets for the details that have gone back and forth. I looked at all 35 new stills first. Then I put each one next to its round 3 twin, and for the details that matter I enlarged crops of both. I checked the builder's list of changes (the l4 entries in `teach/journal.md`) against the stills, and I looked at the five crops in `teach/shots/2026-10-09-l4/`. I also read the header of `tools/flicker.mjs`, because what its numbers mean is part of item 1. I did not touch any code.

Scoring is unchanged. 8 means a paying client who asked for premium takes that part with no notes. Quarter points are used where a part moved and still carries notes. Where I give an 8 and still list something, those are remarks and not conditions.

Three things about the material before the scores.

1. More stills moved than I was told. `17-to-gallery`, `21-bedIn` and `23-dress` were declared as matched by eye and `18-gallery` was moved on purpose. `02-lens1` (the sheet sits lower in the frame), `06-door` (the door stands much further open) and `13-turn-to-patio` (the camera is further round and the dining table is in frame) are not the round 3 frames either. I compared those by what is in them and not pixel for pixel.
2. The stills are older than the build. They were saved between 12:24 and 12:26. `scene.js` was saved at 12:51 and the journal gained four more l4 entries while I worked. One of them describes a fix for a fault I found in these stills (the bedroom glass). I score the stills I was given and say where a later claim touches them.
3. Motion cannot be judged from stills. Item 1 says how I weighed the builder's numbers.

Short version: this is the first round where the work went into the parts that needed it most. Four items reach 8 (patio scan, gallery, bath, garden). Three do not: the bedroom and the ending are a quarter point short, the plan is half a point short. The ending made the largest jump of any item in four rounds. The round also broke a few things: the bedroom's window is milky again in `22-bedroom`, the garden's olive trunk went pale again, the newly furnished rooms leak specks onto the hero plan, and the meadow olives were changed without getting better.

---

## 1. Plan lines and the opening

**Round 1: 7. Round 2: 7.25. Round 3: 7.25. Round 4: 7.5.**

What I can see is better. In `03-lens2` the garage is a room now: its walls are cut and capped like the rest of the house and three car symbols lie on its floor. In round 3 it was a white box with dotted edges. The partitions in both guest suites are real walls with lids (`00-hero`, `03-lens2`). The entry path and the garage edges no longer break into rows of dots in `03-lens2`, which was my first fix in round 1. In `01-scroll1` the wordmark no longer doubles the project line and the counter is off the plan's figures. Both GUEST SUITE labels sit clear of their beds in `00-hero`. The timber screen in `05-approach` has lost the loose fragments it had between its slats.

What is still dotted: the study mullions in `03-lens2` are still chains of dashes, each one a little ladder. The timber screen left of the front door in the same still is rows of dashes. The row of small boxes at the top right of `04-lens3` is still there. The mullions above the horizon in `04-lens3` are gone now, apart from one dotted remnant on the left, and the glass hatch they belonged to still hangs on the blank paper.

What is new and wrong. In `03-lens2` the ring round the olive is two loose arcs with dotted ends. In round 3 the outer ring was whole. The two planters by the front door went pale grey while everything round them is black. And the hero itself picked up dirt from the rooms that were furnished this round. Enlarged, `00-hero` shows a ragged inner edge on the bath's east wall, a row of broken dashes in the dressing room, basin symbols that went from bold to faint, a thin line running into the P of PRIVATE GARDEN, loose specks where the fire circle was, and a dotted strip over the bench at the front door. Each is a pixel or two. Together they are exactly what the client described: thinner lines, and a feeling that something is hiding underneath.

**The flicker number, and what weight I give it.**

For three rounds I held this score on a comparison I was handed: 2.4 and 3.0 in the middle against 0.51 on the first scroll. The builder now says that comparison was his mistake, because the tool steps the scroll by a fixed amount, the camera moves about four times faster at 170 vh, and the score rises with movement. I think he is right about that. A score built on the difference between frames grows with how far the picture travels per step. I made 0.51 the condition and I drop it. I should have asked what the number measured before I leaned on it.

I do not take the replacement at face value either. Three reasons.

- The ratio went from about 1.85 to about 1.5. The tool's own header says a ratio "under about 0.35 reads as smooth, over 0.6 reads as noise". The journal uses a different yardstick (about 2 for a line that jumps a whole pixel, near 0 for a line that glides). On either one, 1.5 is not gliding. The entry is headed "Ink lines that glide". The number under it says they glide a little more than they did.
- I doubt the ratio is free of speed. At a fixed step the lines in the middle of the opening probably travel a pixel or more per frame, and at that speed a thin line scores near 2 however smooth it is drawn. So the ratio may have the same weakness as the raw number in a milder form. That would also explain why two very different places both read 1.9.
- "0.000 at rest" was already true in round 3. It is not a gain.

What I do give weight to. The raw scores fell by 15 to 26 percent at the same four places with the same step, old lines against new. That is a fair like for like and I read it as "somewhat calmer". The depth fix has a mechanism I can follow (outlines of centimetre steps falling either side of a rounding boundary), and `blink-two-frames-garage-door.jpg` shows a line across the garage door that is there in one frame and gone in the next. That is the thing a client calls blinking, far more than a line that steps by a pixel. If it is fixed, most of what he saw may be gone. But the crop shows the fault and not its absence, and its third panel is unlabelled and still shows half a line by the wall. `lines-before-after-door-300vh.jpg` does support cleaner lines: the broken dashes between the slats are gone. `lines-and-flicker-map-220vh.jpg` shows the timber screen as bright in the map after as before. `lines-before-after-garage-170vh.jpg` was taken before the garage got its walls, so it is not the current picture.

So: the old number no longer holds this score down, and the new numbers do not lift it. The 7.5 comes from the stills. I will not sign an 8 on this item without seeing it move, because the client's complaint here was about motion.

What I would want to see to be sure:

1. One 60 fps recording of 100 to 260 vh at a normal scroll speed, at full retina size, old lines (`?ink=old`) and new side by side, with a 2x crop on the garage, the timber screen and the study glazing.
2. The two-frame test repeated on the new build at four places (the garage door, a rug edge, the entry slab, a wall bevel), each panel labelled, showing that nothing switches on and off.
3. The flicker tool run again with the step scaled to the camera's speed, so that lines travel about a quarter of a pixel per frame at every position, old against new. If the lines glide, the ratio falls toward zero there. If it stays near 2, they still step.
4. The client's own eyes. He is the one who still saw "some blinking effects sometimes" after round 3.

Remaining fixes:

1. Show the motion (the four points above).
2. `03-lens2`: the study mullions and the timber screen by the door. Whole strokes or none. This is fix 2 from round 3 and it is still open.
3. `03-lens2`: draw the olive's ring whole. Give the entry planters the same weight as the other planters.
4. `00-hero`: clean the master wing and the front door. The bath's east wall, the dashes in the dressing room, the basins, the line through PRIVATE GARDEN, the specks by the corner seat, the strip over the bench. Furniture added in 3D must either read as a clean symbol on the sheet or stay off it.
5. `04-lens3`: the row of small boxes at the top right, and the hatch that outlived its mullions.
6. `02-lens1`: the counter sits on the garden's loungers and the ruler runs through DRESSING and BATH. `08-rise` and `09-livingTop`: the wordmark sits on plan lettering.
7. Small: the dark wall lids carry a pale dashed line down their middle in `03-lens2`. It was there in round 3 and there are more lids now.

## 2. The scan follows the camera (patio)

**Round 1: 7.5. Round 2: 7.75. Round 3: 7.75. Round 4: 8.**

All four fixes from round 3 are done, and the first of them had been open since round 1. In `14-slide` the lawn and the pool beyond the paving are still paper, the two loungers are caught in the orange of the scan and the umbrella is a proper umbrella. Nothing finished stands behind something drawn any more, which is what the client asked for in his own words. "24." and "18.00" are gone. The nav and the counter read in paper white on the dark paving. In `15-patio` the whole gallery wing is a drawing, frames and concrete band included, and the court in front of it is finished down to the cypresses. That is the cleanest statement of the idea in the whole walk. In `16-olive` the title's link stops short of the ruler and the wordmark reads on the leaves.

I take this part. Remarks, not conditions:

1. `14-slide`: three white paper squares still sit at the top end of the dark wall. On the right a few far olives and a piece of stone wall are finished behind the paper lawn.
2. `14-slide`: the pane at the right edge shows a grey drawing of a curtain inside a finished black frame.
3. `16-olive`: the uplight still bleaches the trunk, the scroll hint is lost on the gravel, and the young olives beyond the pool have chalk white trunks.

## 3. The gallery

**Round 1: 6.5. Round 2: 7.5. Round 3: 7.5. Round 4: 8.**

Moving the stop a metre in cured two things at once, as I hoped. In `18-gallery` the soft first artwork is out of frame and the title stands on a bare stretch of lit wall, well clear of the wordmark, with its marker beside it and nothing behind the letters. The corridor ahead is still a drawing with the scan's orange on it, so the client's "everything is displayed already" is answered more firmly than before. In `19-galleryMid` the three artworks are sharp, the ceiling arrives as boards across the room with a straight front where it used to step in squares, and I can find almost none of the white dots. `20-galleryEnd` has two or three specks left.

I take this part. Remarks:

1. `17-to-gallery`: a chopped ".00" hangs in the doorway, cut by the jamb. Same family as the "24." and the "9." that were cleared elsewhere.
2. `20-galleryEnd`: the last artwork on the left is still soft and has specks inside its black square.
3. `18-gallery`: the pale plate behind the title shows its hard corners on the grey wall when enlarged.

## 4. The master bedroom

**Round 1: 6.5. Round 2: 7. Round 3: 7.5. Round 4: 7.75.**

The bed is finally a bed. In `22-bedroom` the duvet has rounded corners and hangs over the base, the sheet is turned down with a real fold, and the throw sags over the side with a slanted hem where it was a folded card. Both lamps throw light on the leather and the bases are smooth. The link in the title stops short of the ruler and the counter reads. In `21-bedIn` the duvet is opaque, the bench is upholstered and no longer a glossy capsule, and the chopped "9." is gone. From above in `28-lift` the room reads as a furnished suite.

Two things in `22-bedroom` cost it the 8. The two left panes of the window are milky again. In round 3 I called the clear view the best gain in the room: a dusk sky, a dark wall, the umbrella crisp. Now the same panes are a pale grey haze, as they were in round 2. I measured it: the mean brightness of that pane went from 97 back to 141, and round 2 was 138. The pane next to the bed is clear, so the wall has two kinds of glass in one frame. The journal has a later entry that calls this a regression of the builder's own and says it is fixed. The stills are older than that entry, so I cannot see the fix. Second, at the right end of the headboard, between the last leather panel and the black wall, there is a strip of fine dotted mesh broken by three blocks of wood. It was a plain timber edge in round 3. A pattern like that will shimmer when the camera moves.

Remaining fixes:

1. `22-bedroom`: clear the two left panes. If the glass rewrite did it, one new still settles it.
2. `22-bedroom`: the dotted mesh strip at the right end of the headboard.
3. `22-bedroom`: the left lamp makes a small glossy hot spot on the leather. Widen it and dim it so it matches the right lamp's pool.
4. A still at the old `21-bedIn` place, with the scan's front on the bench. The new 21 is taken later in the scan, so the moment I complained about for three rounds is not in the set. The builder's own before crop (`bed-mid-scan-still-a-veil.jpg`) against the new 21 does show the veil gone at that frame.
5. Small: the duvet's corner at the foot hangs to a sharp point.

## 5. The bath

**Round 1: 7. Round 2: 7.5. Round 3: 7.75. Round 4: 8.**

Everything I listed is answered. In `26-bath-end` the red line down the pier is gone and so is the pink fringe on the right sconce. The mirror is sharp: the slat tops are a clean line where they stepped like a staircase, and the reflected plant has leaves. The white specks that read as stars are gone and the sky through the glass has a real dusk gradient, warm at the horizon. The garden's fire shows at the left edge, which ties the two rooms together. In `24-bath-start` the plant is solid green in front of the paper window. The room was already well composed. Now it is also clean.

I take this part. Remarks:

1. `26-bath-end`: the progress ruler now lies exactly on the mirror's right edge, so the brass frame looks notched. Move one of them a few pixels.
2. The window frames are still rust brown in the mirror and near black in the room.
3. `25-bath-mid`: the view through the middle pane is pale while the garden scans, and slivers of paper sit at the head of the windows. The journal's later glass entry is about this. I have not seen its result.

## 6. The private garden

**Round 1: 6.5. Round 2: 7.5. Round 3: 7.75. Round 4: 8.**

The fire is lit. In `27-garden` the flame is soft with a glow round it, and it warms the rim of the bowl, the stone of the pool wall behind it and the grass. The shadows on the lawn are no longer black. All three nav links read in paper white. The sky has its gradient. The clipped ball under the ruler is an uneven dark shrub and no longer a sphere in camouflage print. The frame has a subject and light coming from it. From a 2 to an 8 in four rounds.

I take this part. Remarks:

1. `27-garden`: the olive's trunk went back to pale tan, with black blotches on it. In round 3 it was dark and rough and I said so. This is a step back inside a frame that otherwise moved forward.
2. The flame's core burns out to white. The scrub on the ridge is grouped now and still reads as dots.

## 7. The ending

**Round 1: 6.5. Round 2: 7. Round 3: 7. Round 4: 7.75.**

The frame that held this item down for two rounds is a different picture. `29-top-built` is bright and legible: the rooms are lit, the shadows are short, the sawtooth on the garage floor is gone, the violet and red lines on the wall tops are gone, three cars stand in the garage, the arrival court has bands and three olives, and the ruled pale strip on the lawn is gone. It reads like a photograph of a model, which is the right last look at the built house. The roll is better too. In `31-roll-1` and `32-roll-2` the tube carries the plan itself, walls and dimension figures, and there is a visible edge where the sheet leaves it. The best detail of the round is in `31-roll-1`: the ink cars on the tube sit right beside the real cars on the garage floor, same size, same row. In `34-finale` the headline stands on clean paper and the plan is a faint mark to its right. `28-lift` is lighter and the dressing room reads from above.

Why not 8. In `28-lift` the meadow olives were changed and not improved: each is a faceted grey-green boulder inside a ring of black flecks, in the left quarter of the frame. The tube still shows neither end, so there is no spiral of paper to see at any point. In `30-roll-rest` the tube at rest carries only a faint string of figures, and the nav and the wordmark on the paper are paler than in round 3. I accept the builder's reason for not enlarging the house in the top view.

Remaining fixes:

1. `28-lift`: the meadow olives. Real crowns, or take them out of this frame.
2. The tube: let one end come into frame once, with the paper's spiral. In `30-roll-rest` put the plan on it at rest as well.
3. `30-roll-rest`: the nav and the wordmark on the paper. They were darker and easier to read in round 3. If they are fading out here, start the fade later.
4. `29-top-built`: the lawn's texture repeats in a visible grid, and the three court olives are ragged dark blots from above.

---

## Scores

| # | Item | Before | Round 1 | Round 2 | Round 3 | Round 4 | Gap to 8 |
|---|------|--------|---------|---------|---------|---------|----------|
| 1 | Plan lines and the opening | 5 | 7 | 7.25 | 7.25 | 7.5 | 0.5 |
| 2 | Scan follows the camera (patio) | 3 | 7.5 | 7.75 | 7.75 | 8 | 0 |
| 3 | Gallery | 4 | 6.5 | 7.5 | 7.5 | 8 | 0 |
| 4 | Master bedroom | 4 | 6.5 | 7 | 7.5 | 7.75 | 0.25 |
| 5 | Bath | 4 | 7 | 7.5 | 7.75 | 8 | 0 |
| 6 | Private garden | 2 | 6.5 | 7.5 | 7.75 | 8 | 0 |
| 7 | Ending (paper roll) | 4 | 6.5 | 7 | 7 | 7.75 | 0.25 |
| | Average | 3.7 | 6.8 | 7.4 | 7.5 | 7.9 | 0.1 |

Four items are at 8: patio scan, gallery, bath, garden. Three are under: plan (7.5), bedroom (7.75), ending (7.75).

## Overall

Round 4 did what round 3 did not. The two items with the largest gaps got the most work and both moved, the ending by three quarters of a point. Of the roughly thirty fixes I listed at the end of round 3, most are done and done properly: scan by distance, the gallery stop, the opaque bed, the bedding, the mirror, the fire's light, the top view, the plan on the tube. The page averages 7.9 and four of its seven parts need nothing more from me. What stands between the other three and 8 is short. The bedroom needs one clear window and one clean strip of headboard, and by the builder's own account the first may already be done. The ending needs olives in the meadow that look like trees and one glimpse of the roll's end. The plan needs the last dotted strokes drawn whole, a clean hero, and above all a recording, because I have now scored this item four times without once seeing it move. One habit to watch: a change this wide touched things it was not aimed at. The window, the trunk and the specks on the hero were all fine in round 3.

## Claims that did not hold, and what got worse

Claims from the builder's l4 list, checked in the stills.

Hold: the garage with lids and car symbols. The guest suite partitions. The GUEST SUITE labels. The lawn as part of the patio's wave. The gallery wing as a drawing until its own scan. The ceiling arriving as boards. The titles clear of the ruler and on plain ground (`11-living`, `12-dining`, `16-olive`, `18-gallery`, `22-bedroom`). No lens fringe (`26-bath-end`, `29-top-built`). The gallery stop. The bedding, the lamp pools and the smooth bases. The sharper mirror. The fire that lights things, the box balls, the sky. Finer dust. The top view, the cars, the court, the lawn without its strip. The plan on the tube with its edge. The closing headline on clean paper.

Hold in part:

- "Ink lines glide. Hairlines no longer break into dots." True for the entry path and the garage edges. Not for the study mullions and the timber screen in `03-lens2`, and the olive's ring is more broken than before. The measured ratio of 1.5 is not a glide on the tool's own scale or on the journal's.
- "Lines that blinked on and off between frames no longer do." Plausible, and the crop shows the old fault. Nothing shows the new build free of it. Not verified.
- "The room counter and the ruler wait until the plan's dimension figures have moved out from under them." True in `01-scroll1`. In `02-lens1` the counter lies on the garden's loungers and the ruler runs through two room labels.
- "No more chopped '24.' or '9.'" True for those two. A chopped ".00" hangs in `17-to-gallery`.
- "Opaque from the moment they arrive. That was the see-through bed." True in the frame shown. The frame with the scan's front on the bed is not in the set.
- "Nothing hides any more." Nearly. The nav and the wordmark in `30-roll-rest` are paler than in round 3, the scroll hint in `16-olive` is lost on the gravel, and the link in `11-living` loses its end on the high window.
- "Six lit bays" in the dressing room. `23-dress` shows open bays with folded things and hanging clothes, which ends the dead frame. I see no light in them, and the hanging clothes are flat boards.
- "Bronze is darker and less red." A little. The frames in the mirror are still rust brown.
- "Each grove olive has a dark crown inside its leaves." True as written. In `28-lift` it reads as a boulder in a thorn bush.
- "Same 35 places as before." Seven of them are not the same frame (see the top of this review).

Does not hold in these stills:

- The later journal entry on glass says the bedroom's milky view was a regression that has been fixed, and that finished things no longer look pale through a pane. `22-bedroom` shows two milky panes and `25-bath-mid` shows a pale view. The stills are older than `scene.js`, so either they predate the fix or the fix did not hold. New stills of 22 and 25 would settle it.

Worse than round 3, or newly wrong:

- `22-bedroom`: the two left window panes are milky again.
- `22-bedroom`: dotted mesh strip at the right end of the headboard. Small hot spot from the left lamp on the leather.
- `27-garden`: the olive's trunk is pale tan with black blotches. It was dark in round 3.
- `00-hero`: specks and broken strokes in the master wing and at the front door, from the newly furnished rooms.
- `03-lens2`: the olive's ring is two arcs. The entry planters are pale grey.
- `04-lens3`: the mullions above the horizon are gone and their hatch is not.
- `30-roll-rest`: nav and wordmark paler on the paper.
- `28-lift`: the meadow olives, different and no better.
- `26-bath-end`: the ruler sits on the mirror's edge.
- `17-to-gallery`: chopped ".00".

Still open from earlier rounds and not listed above:

- `14-slide`: paper squares at the top of the dark wall.
- `16-olive`: bleached trunk under the uplight.
- `20-galleryEnd`: soft last artwork.
- `08-rise`, `09-livingTop`: the wordmark on plan lettering.

Cleared from the "still broken" list of round 3: the burnt-out branch in `12-dining`, the link into the ruler in `16-olive`, the dead frame in `23-dress`, the snow in `07-hall`, the doubled name in `01-scroll1`.
