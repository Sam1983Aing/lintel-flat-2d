# Lintel, iteration 4. What moves while the plan opens

9 October 2026, fourth version of this note (after pass 4). Written by the builder for the outside reviewer and for Sam. Everything here can be run again (commands at the end). All numbers below were taken after the last change to the code, in one run.

## What was measured
`tools/flicker.mjs` steps the scroll by a fixed 0.05 vh a frame at full retina size (2880 x 1800, the middle 60 percent of the screen) and keeps 30 frames per place. Three builds, same places, same step:
- **iteration 3**: the frozen `001 Lintel/v3/`
- **iteration 4**: the page as it is now
- **no outlines**: the page now with the ink outlines switched off (`?ink=none`). This is the floor: what the wall fills, the hatching and the lettering contribute by themselves.

Two numbers per place:
- **mean**: the tool's own score. How far a pixel is from the average of the frame before and the frame after, averaged over the picture. It counts a small step the same as a big one.
- **pops**: pixels per million, per frame, that jump by more than 48 grey levels (out of 255) against that average. These are the things that switch on and off. `tools/pops.sh`.

| Place | mean, iteration 3 | mean, iteration 4 | mean, no outlines | pops, iteration 3 | pops, iteration 4 | pops, no outlines |
|---|---|---|---|---|---|---|
| 80 vh | 0.89 | 0.95 | 0.46 | 2,657 | 1,105 | 10 |
| 120 vh | 2.03 | 1.72 | 0.72 | 7,010 | 2,403 | 15 |
| 170 vh | 2.86 | 2.23 | 0.76 | 11,664 | 3,430 | 82 |
| 220 vh | 4.36 | 3.20 | 1.02 | 17,813 | 7,657 | 1,412 |
| 300 vh | 1.53 | 1.58 | 0.33 | 5,144 | 1,243 | 427 |

Pops for iteration 4 over the passes, same places:

| Place | pass 2 | pass 3 | pass 4 |
|---|---|---|---|
| 80 vh | 1,282 | 1,136 | 1,105 |
| 120 vh | 2,689 | 2,668 | 2,403 |
| 170 vh | 3,679 | 3,544 | 3,430 |
| 220 vh | 8,505 | 7,785 | 7,657 |
| 300 vh | 1,171 | 1,151 | 1,243 |

Two runs of the same build differ by about one percent (80 vh gave 1,092 and 1,105 an hour apart). Anything inside that is noise.

At rest (372 vh, 10 vh, and 3520 vh after the roll of paper) the picture does not change at all: 0.000. The frame after the roll and the first frame of the page are the same in every byte (0 of 5,971,968 differ).

## How to read it
- **Things that pop are 57 to 76 percent fewer than in iteration 3**: 58, 66, 71, 57 and 76 percent.
- **The floor fell through at 80, 120 and 170 vh**: with outlines off, 185, 368 and 578 pops in pass 3 and 10, 15 and 82 now. That was the pale dashes on the wall lids (see below). They were paper showing on black, in the colour picture, so they counted with outlines on or off.
- **300 vh went up by 8 percent** (1,151 to 1,243) while its floor went down (460 to 427). The two wall lights by the door are drawn firmly now, which is more ink in motion there. I have not taken it apart further.
- **The outlines are still most of the score.** The lines do not glide. They move in quarter pixels where they moved in whole ones.

## Things that exist for one frame
Two tests, because one of them has a blind spot the reviewer pointed out in round 6.
- **Small step** (`tools/flash.sh`, 0.004 vh a frame, nothing travels a pixel between frames): finds a thing that lives for less than one step, like the line across the living room's opening at 160.8 vh in round 5. Two sweeps of 500 frames at retina size. 160.5 to 162.5 vh: worst frame 1 pixel. 262.5 to 264.5 vh: worst frame 5 pixels. No frame over 100.
- **Real scroll step** (`R=20 tools/flash.sh`, the 200 frames of the clip at 0.8 vh a frame, full screen): finds a piece of line that is on screen for one frame at the speed people scroll. It counts dark pixels with nothing dark within 20 pixels in the frame before or the frame after.

| Build | frames with more than 100 such pixels | worst frame |
|---|---|---|
| iteration 3 | 41 of 201 | 1,672 pixels |
| pass 3 (what round 6 scored) | 6 of 201 | 163 pixels, the patio's south edge |
| pass 4 | 1 of 201 | 107 pixels |

The one frame left is frame 113: a mark 8 pixels wide and 27 tall at the very left edge of the screen (x 3 to 11, y 1541 to 1568 of 2880 x 1800), something of the drawing entering the picture. `MASK=<dir>` writes that frame with its marks if you want to look.

The count is made on the raw pixels now. The earlier version of the tool read it from ffmpeg's `signalstats`, which now and then returned a round 100,000 or 200,000 for a frame with two marked pixels. The small-step numbers in earlier notes were checked against the new version on the same frames and hold.

## What round 6 listed for the opening, and what was done
1. **The pale dashes on the wall lids.** Found, at the third attempt. A cut made by throwing pixels away is all or nothing per pixel, and a pixel has four samples. Where a wall's face crosses the cut inside one pixel, the samples above the cut are written too, and they are nearer than the lid. The faces where a wall's two halves touch are slivers along its centre line from above. The lid now wins the depth test against anything under the cut, which is safe for a camera above the cut. Pale pixels in one test lid: 68 before, 0 after. `teach/shots/2026-10-09-l4/lid-dashes-before-after-lens2.jpg`.
   On the way I tried a stricter cut that also cleaned the lids and made 170 and 220 vh worse (4,481 and 10,150 pops). The count caught it and it was taken out.
2. **The patio's edges.** The slab stands 3 cm proud of the ground, a step the outline test draws in pieces. In the depth picture the outdoor paving now lies on the ground's plane, and its free edges are thin lines on the annotation sheet. The last row of the three-frame sheet is the patio's south edge below the pool.
3. **Crossed lettering.** CONTACT and STUDIO (`04-lens3`), the figures under STUDY (`03-lens2`), "12.00" and "6.00" (`10-drop`), "3 cars" (`00-hero`). And one I made and caught myself: the path's new edge lines ran through the scroll hint, which now has a little paper behind it while the page shows the drawing.
4. **The one-frame search at the scroll's real step.** Above.
5. **Small things.** The loose stroke under the hint and the doubled dashes beside it were the reflecting pool's 6 cm kerb (flush now, edge on the annotation sheet). The doubled dashes on the fireplace block were lid dashes. The wall light's far edge: the lights are 12 cm deep now and outline firmly. Not done: the small boxes on the far wall line in `04-lens3` (the tops of the kitchen's wall piers).
6. **The opening.** The roll starts once the loader's last line has gone (`o0`, `o1`), the sheet answers the scroll the moment the tube has left the screen (`o4`), the board has a fine grain.

`teach/shots/2026-10-09-l4/pass4-before-after.jpg` puts five of these side by side, pass 3 against pass 4.

## Frame rate
- Whole walk, recorded live on the final build while another program was rendering on this machine (load 5 to 9). Desktop (1440 x 900): 60 frames a second, longest gap 34 ms. Phone (390 x 844): 60 frames a second, longest gap 28 ms. The files are written at 30 frames a second, so they can show that nothing stalls and not the rate itself.
- No shader is built after the loader (114 programs at load, 114 at the end of the walk, phone and desktop).
- The phone freeze in the bath (found and fixed in pass 3) has not come back in three more full phone walks.

## After round 7 (not scored)
Round 7 scored the build above at 8 in every part and listed faults that pass 4 itself had introduced. Six of them were fixed afterwards (the journal has the list). The numbers for the page as it now is, same method:

| Place | pops, scored build | pops, now | 
|---|---|---|
| 80 vh | 1,105 | 1,111 |
| 120 vh | 2,403 | 2,372 |
| 170 vh | 3,430 | 3,240 |
| 220 vh | 7,657 | 7,421 |
| 300 vh | 1,243 | 1,182 |

- At 220 and 300 vh the dust in the sunlight is on, and it drifts with the clock and not with the scroll. On a busy machine frames are further apart in time and those two counts rise by several percent for the same code (8,310 against 7,657 an hour apart). Measured back to back in the same minute: 7,914 and 1,257 for the scored copy `v4c/`, 7,804 and 1,308 for the page now. 80, 120 and 170 vh have no dust and repeat to one percent.
- One-frame search at the real scroll step: 2 frames of 201 over 100 pixels, the worst 110, both the same mark entering at the left edge of the screen. Small step: worst frames 1 and 6 pixels.
- At rest 0.000, first frame against the frame after the roll 0 bytes of 5,971,968.
- The whole walk, recorded live: desktop 60 a second, longest gap 37 ms. Phone 60 a second, longest gap 28 ms. Earlier that evening three desktop takes had come in at 49. Four more, alternating this build and the round 6 copy, all came in at 60: it was the machine.
- The seam in the board's grain: the jump in mean grey level between screen columns 899 and 900 is 0.02, as between any other two.
- `teach/shots/2026-10-09-l4/pass5-after-the-score.jpg`: the scored build against the page now at four of the places round 7 named. Stills of the page as it is: `teach/shots/2026-10-09-l4-pass5/`.

## What it does not show
How the opening feels under the hand. At 50 vh a second the lines travel 2 to 18 pixels a frame in the middle of the opening and nothing can glide at that speed. What the eye catches there is things that come and go, which is what the pop count, the two one-frame tests and the three-frame sheet are about. Sam's own eyes on his own screen are still the test, and he has not yet scrolled this build. A headless Chrome on this Mac is not a phone either.

## The pictures
- `teach/shots/2026-10-09-l4/three-frames-four-places-120vh.jpg`: three frames in a row at six labelled places, iteration 3 beside iteration 4, enlarged three times.
- `teach/shots/2026-10-09-l4/pass4-before-after.jpg`: pass 3 against pass 4 at five of the places round 6 named.
- `teach/shots/2026-10-09-l4/lid-dashes-before-after-lens2.jpg` and `garden-olive-egg-before-after.jpg`: the two faults at retina size.
- `001 Lintel/recordings/lintel4-opening-lines-before-after.mp4`: 100 to 260 vh in 200 equal steps of 0.8 vh, played at half speed three times over. Iteration 3 on the left, iteration 4 on the right, both at real pixel size. Rebuilt from the final build. These are the same 200 frames the real-step test ran on.
- `001 Lintel/recordings/lintel4-opening-roll-desktop.mp4` and `-phone.mp4`: the opening filmed live.
- `001 Lintel/recordings/lintel4-walk-desktop.mp4` and `-phone.mp4`: the whole walk filmed live.

## Run it again
```bash
node tools/flicker.mjs "http://localhost:8014/001%20Lintel/?at=0&steady" "80:0.05:30,120:0.05:30,170:0.05:30,220:0.05:30,300:0.05:30" 1440x900 2 /tmp/f-new
```
```bash
node tools/flicker.mjs "http://localhost:8014/001%20Lintel/v3/?at=0" "80:0.05:30,120:0.05:30,170:0.05:30,220:0.05:30,300:0.05:30" 1440x900 2 /tmp/f-v3
```
```bash
tools/pops.sh /tmp/f-v3 /tmp/f-new
```
The small step:
```bash
CROP=0.25,0.2,0.5,0.6 node tools/flicker.mjs "http://localhost:8014/001%20Lintel/?at=0&steady" "160.5:0.004:500" 1440x900 2 /tmp/f-lens
```
```bash
tools/flash.sh /tmp/f-lens
```
The real step (the frames of the clip):
```bash
CROP=0,0,1,1 node tools/flicker.mjs "http://localhost:8014/001%20Lintel/?at=0&steady" "100:0.8:200" 1440x900 2 /tmp/f-speed
```
```bash
R=20 MASK=/tmp/marks tools/flash.sh /tmp/f-speed
```
