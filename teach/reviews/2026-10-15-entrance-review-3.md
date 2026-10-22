# Entrance materials, blind review 3 (P, Q, R)

Judged from the 27 stills only (nine per version, 3456 by 1984). All coordinates are full-resolution pixels, written as a point (x,y) or a region "W by H at X,Y". Crops were looked at whole, at 1:1 and at 3:1.

## Scores

| Criterion | P | Q | R |
|---|---|---|---|
| 1. Concrete walls (board-formed) | 5 | 5.5 | 7.5 |
| 2. Plaster walls and ceiling | 4 | 4 | 7 |
| 3. Stone tile floors (side hall, WC) | 4 | 4.5 | 8 |
| 4. Pivot door oak | 5 | 3.5 | 6.5 |
| 5. Console oak | 5.5 | 3.5 | 7 |
| 6. Side door leaf (wc view) | 6 | 5 | 5.5 |
| 7. Leaves of the potted branches | 4.5 | 4.5 | 3.5 |
| 8. Overall, materials as a whole | 4.5 | 4 | 6.5 |

## Pick

R. It is the only version where the big surfaces (board-formed concrete, limestone floor, console front) read as photographed materials, and its fine detail holds into the distance where P and Q go flat. Its faults are a tiled pivot door, floorboards turned sideways on the side door, a console top with its boards running the wrong way and unlit leaves, and those are cheaper to fix than the procedural look that runs through every surface of P and Q.

## Anchors

- 3: obvious CG
- 5: a decent real-time render
- 7: convincing at a glance, flaws on inspection
- 8: reads as a photographed material in most places
- 10: indistinguishable from a photograph

## Measurements

Luma is BT.601 grey from ffmpeg. Each cell is mean luma / standard deviation / mean absolute 4-neighbour Laplacian ("fine detail"). Floor crops were placed inside a single tile in all three versions (checked at 3:1 and 5:1, no grout in any crop).

| Region | File and crop | P | Q | R |
|---|---|---|---|---|
| Concrete, near | wallnear.jpg, 640 by 700 at 2700,100 | 101.0 / 10.2 / 2.18 | 101.8 / 10.1 / 2.24 | 103.0 / 10.3 / 3.10 |
| Concrete, mid | wall.jpg, 600 by 700 at 40,200 | 97.1 / 9.9 / 2.70 | 97.5 / 10.1 / 2.82 | 104.5 / 10.2 / 3.25 |
| Concrete, far | room.jpg, 400 by 700 at 2700,500 | 111.1 / 7.4 / 1.82 | 111.7 / 7.5 / 2.08 | 109.1 / 7.9 / 3.14 |
| Plaster, WC wall | wc.jpg, 400 by 500 at 1050,250 | 162.4 / 2.4 / 0.47 | 166.7 / 2.4 / 0.50 | 164.1 / 3.1 / 1.96 |
| Plaster, hall near | hall.jpg, 400 by 600 at 100,300 | 145.2 / 5.3 / 1.65 | 147.3 / 6.3 / 3.72 | 145.6 / 5.4 / 1.85 |
| Plaster, hall far wall | hall.jpg, 300 by 400 at 2100,250 | 151.7 / 1.9 / 0.44 | 155.2 / 2.0 / 0.43 | 151.7 / 2.2 / 1.88 |
| Ceiling | ceiling.jpg, 640 by 300 at 200,60 | 153.5 / 9.6 / 0.49 | 154.8 / 9.8 / 0.39 | 154.1 / 10.5 / 1.89 |
| Floor, hall near | hall.jpg, 300 by 60 at 1250,1595 | 141.0 / 4.3 / 1.32 | 142.5 / 5.8 / 2.54 | 142.2 / 3.9 / 2.05 |
| Floor, hall mid | hall.jpg, 220 by 40 at 1665,1178 | 148.9 / 1.6 / 0.79 | 159.2 / 1.1 / 0.59 | 151.3 / 4.6 / 2.41 |
| Floor, hall far | hall.jpg, 120 by 24 at 1730,960 | 152.3 / 1.6 / 0.80 | 160.7 / 1.1 / 0.68 | 151.1 / 2.0 / 1.85 |
| Floor, WC near | wc.jpg, 340 by 60 at 1470,1730 | 128.8 / 2.7 / 1.07 | 119.3 / 6.2 / 2.16 | 127.5 / 5.7 / 3.09 |
| Pivot door | door.jpg, 600 by 800 at 1600,700 | 130.2 / 8.0 / 3.35 | 128.7 / 7.9 / 3.47 | 128.8 / 8.7 / 4.61 |
| Console front | console.jpg, 640 by 500 at 1300,1300 | 72.0 / 6.5 / 2.74 | 72.7 / 6.4 / 2.75 | 71.0 / 7.2 / 3.10 |
| Side door leaf | wc.jpg, 450 by 900 at 1700,200 | 68.3 / 5.3 / 2.52 | 68.9 / 5.3 / 2.31 | 71.5 / 7.2 / 3.42 |

Other measurements.

| Measurement | File and crop | P | Q | R |
|---|---|---|---|---|
| Tone spread between hall tiles (box 30 by 14 at each tile centre, sd / range / mean difference between side-by-side tiles) | hall.jpg, 12, 14 and 18 tiles between y 890 and 1535 | 5.1 / 17.4 / 5.2 | 8.6 / 25.9 / 8.6 | 4.8 / 17.7 / 7.5 |
| Vertical autocorrelation, strongest peak (high-passed, 4x down) | door.jpg, 560 by 1840 at 1620,100 | 0.46 at 112 px | 0.59 at 36 px, harmonics at 72, 108, 140 | 0.20 at 712 px |
| Vertical autocorrelation | wall.jpg, 600 by 1800 at 20,0 | no peak above 0.12 | no peak above 0.12 | no peak above 0.12 |
| Horizontal autocorrelation | console.jpg, 3200 by 560 at 100,1340 | no peak above 0.12 | no peak above 0.12 | no peak above 0.12 |
| Vertical autocorrelation | wc.jpg, 500 by 1380 at 1690,0 | none | none | 0.20 at 48 px (board rows) |
| Near-black pixels, luma under 22 | wallnear.jpg, 640 by 800 at 1760,0 | 11.2 % | 16.0 % | 24.5 % |
| Near-black pixels, luma under 22 | wall.jpg, 600 by 900 at 1950,300 | 4.8 % | 6.9 % | 12.1 % |
| Leaf luma p10 / p50 / p90 (greenish pixels) | wallnear.jpg, 640 by 800 at 1760,0 | 16 / 42 / 62 | 11 / 30 / 67 | 10 / 28 / 68 |

The tile tone spread includes the light falloff down the hall, so read the side-by-side difference rather than the sd. The 712 px peak on the R door was checked by eye: the strips door.jpg 560 by 700 at 1620,60 and 560 by 700 at 1620,772 are the same texture, with the same pale streak near x 1865 in both.

## What the three have in common

Camera, light, geometry and the warm white balance are identical. The main entrance floor is the same black stone with glowing light trails in all three and was not scored. The potted branch has the same stems everywhere, and in all three the leaves are flat cards with hard alpha edges that stair-step at 3:1, with no light passing through them. None of the wood faces shows a visible sheen or a reflection of the bright doorway, so all the timber reads matte. Tile edges are knife-straight with no arris or chips, and the grout is a thin flat dark line with no depth. The pendant, the art, the vase and the gold sphere are unchanged. The concrete sits at the same tone (luma 97 to 111) in all three, so the differences are pattern and detail rather than colour.

## P

Strongest

1. Concrete tie holes are crisp cone recesses with a shadowed lip, at wall.jpg (333,542) and wallnear.jpg (3025,173), (3275,287), (2730,630), (3050,705).
2. The side door leaf has straight, quiet vertical grain that passes for a dark veneer at a glance (wc.jpg, 450 by 900 at 1700,200). No repeat shows up in the autocorrelation.
3. The leaves carry a midrib line and a lighter top tone (wallnear.jpg, 120 by 60 at 2440,320). Fewer of them go near-black than in R (11.2 % against 24.5 %). The console top grain also runs lengthwise as it should (console.jpg, 640 by 300 at 600,940).

Weakest

1. Wood figure shows through the plaster. Cathedral loops are visible in the WC wall (wc.jpg, 400 by 500 at 1050,250) and in the hall right wall (hall.jpg, 400 by 350 at 2150,50). Once seen, the wall reads as painted wood.
2. The stone floor reads as wood laminate. Horizontal streak bands run across every far tile (hall.jpg, 650 by 390 at 1300,860), the near flecks are flat brown decals with no pit depth (hall.jpg, 640 by 600 at 1000,1384), and fine detail drops to 0.80 in the far tiles against 1.85 for R.
3. The concrete is a two-tone camouflage of flat blotches with sharp edges (room.jpg, 520 by 900 at 2660,400), and the board seams render as dotted stair-step lines (wallnear.jpg, 210 by 230 at 2900,300). There is no board grain imprint. The pivot door also repeats its arches every 112 px (door.jpg, 560 by 1840 at 1620,100, correlation 0.46), and the console plank seams are aliased bright jaggies (console.jpg, 210 by 60 at 1500,1650).

## Q

Strongest

1. The concrete gains fine horizontal form streaks over P (wall.jpg, 600 by 700 at 40,200, detail 2.82 against 2.70), which hints at board-formed concrete. The tie holes are as good as P's.
2. The near floor tiles have a crack network and visible tile-to-tile tone shifts that read more like stone than P at a glance (hall.jpg, 640 by 600 at 1000,1384 and wc.jpg, 640 by 500 at 1450,1484).
3. The outer two thirds of the side door leaf have straight veneer grain (wc.jpg, 250 by 1100 at 1700,200). The leaves are the same as P's, a touch darker (mean luma 33.5 against 36.9 on the shared silhouettes).

Weakest

1. The pivot door is a comb of nested arches spaced like a print (door.jpg, 560 by 1840 at 1620,100, correlation 0.59 at 36 px), in a salmon pink that is not oak. It is the strongest CG tell in the set.
2. The console front repeats the same stacked chevrons (console.jpg, 640 by 300 at 1300,1400 and room.jpg, 770 by 600 at 0,1250), and you can read them from across the room. The plank seams stair-step as in P. The side door has a column of the same chevrons in its centre (wc.jpg, 40 by 650 at 1960,200).
3. At 3:1 the plaster speckle is a blocky maze of right-angled shapes (hall.jpg, 210 by 230 at 200,900, Laplacian 3.72 from hard edges, not relief), and the wood ghost in the WC wall is stronger than in P (wc.jpg, 400 by 500 at 1050,250). The far floor turns into flat colour blocks (hall.jpg, 600 by 370 at 1450,870, detail 0.68), with side-by-side tile jumps of up to 16 luma levels that look painted on rather than natural.

## R

Strongest

1. The board-formed concrete reads as a photograph: board imprint, seams with small fins, chalky lighter patches and board-to-board tone shifts (wall.jpg, 600 by 700 at 40,200 and room.jpg, 520 by 900 at 2660,400). Detail holds at distance (3.14 far against 1.82 for P).
2. The limestone floor has fossils, veins and pits, mixed tile sizes and darker grout, and the detail carries to the end of the hall (hall.jpg, 1000 by 620 at 1300,860, far detail 1.85, and wc.jpg, 640 by 500 at 1450,1484).
3. The console front is convincing oak with rays, pores and small knots (console.jpg, 640 by 800 at 1300,1180), and it holds up in the wide view (room.jpg, 770 by 600 at 0,1250). The plaster has pitted relief that survives at distance (hall.jpg, 300 by 400 at 2100,250, detail 1.88 against 0.44) and there is no wood ghosting.

Weakest

1. The pivot door texture repeats vertically every 712 px. The strips at door.jpg 560 by 700 at 1620,60 and 560 by 700 at 1620,772 are the same, with a matching pale streak near x 1865. The narrow knotty strips read as flooring, not as a pivot door leaf, and at 3:1 the texture is soft (door.jpg, 210 by 230 at 1900,1100).
2. The side door leaf is horizontal floorboards with end joints and repeated pale streaks, at (2014 to 2139, 265) and (1829 to 1989, 865), over wc.jpg 560 by 1385 at 1675,0. The same horizontal boards turn up on the vertical member in console.jpg, 130 by 430 at 2250,510. A door leaf with this layout reads as flooring stood on end.
3. The leaves are unlit cards with no midrib. Many go near-black (wallnear.jpg, 80 by 40 at 1884,560 and 70 by 30 at 1794,630, 24.5 % near-black pixels against 11.2 % for P), and others are flat yellow-green with no shading (wallnear.jpg, 40 by 95 at 2495,365). There are also two smaller faults. The console top boards run front to back, with joints near x 660, 900, 1040, 1190 and 1500 (console.jpg, 1000 by 180 at 600,1010), so the top reads as short planks laid across the console. The concrete has a lighter rectangle with a hard vertical edge (wallnear.jpg, 150 by 130 at 3065,315). The near centre tile in the hall is noticeably cleaner and brighter than its neighbours (hall.jpg, 500 by 250 at 1600,1420).

## What would raise each version's two weakest criteria by two points

### P, stone floors (4 to 6)

Get rid of the horizontal streak banding that makes the far tiles read as planks (hall.jpg, 650 by 390 at 1300,860). Replace it with a stone base that has cloudy low-frequency variation of 2 to 4 luma levels over 20 to 60 cm, plus fine grain. Turn the flat fleck decals into pits that are darker at the bottom and catch a little light on one rim. Offset or rotate the stone pattern per tile so side-by-side tiles differ in pattern as well as tone. Give the grout a recessed, slightly darker line and give each tile edge a 1 to 2 mm arris that catches the sun patch. Targets: far-tile detail from 0.80 to at least 1.6 in hall.jpg 120 by 24 at 1730,960, and no horizontal banding visible after a 5x contrast boost.

### P, plaster walls and ceiling (4 to 6)

The plaster must show no wood figure at all. After a 5x contrast boost, wc.jpg 400 by 500 at 1050,250 and hall.jpg 400 by 350 at 2150,50 should show no loops. Replace the flat two-tone blob speckle with a fine trowel or sand-float relief that the scene light shades, so it reads as surface rather than print. Keep it alive at mid distance: target detail of at least 1.5 in hall.jpg 300 by 400 at 2100,250, where it is 0.44 now. Give the ceiling a very soft trowel variation of 2 to 3 percent so it stops reading as a perfect gradient (detail 0.49 now).

### Q, pivot door oak (3.5 to 5.5)

Replace the evenly spaced nested arches with real oak figure. Keep the cathedral arches to the middle of each board, make them irregular in spacing and height, and run straight rift grain toward the board edges. Add open pores as short dark dashes along the grain and the occasional silver ray fleck. Vary tone from board to board. Pull the hue from salmon pink toward a yellow-brown oak. Target: no vertical autocorrelation peak above 0.2 at any lag under 400 px in door.jpg 560 by 1840 at 1620,100 (0.59 at 36 px now).

### Q, console oak (3.5 to 5.5)

Remove the stacked chevrons (console.jpg, 640 by 300 at 1300,1400 and room.jpg, 770 by 600 at 0,1250). Use flat-sawn oak with a different arch pattern on each plank, pores, and grain that wraps over the top front arris. Fix the plank seams that stair-step (console.jpg, 210 by 60 at 1500,1650): they should be antialiased thin dark grooves, or real geometry. Add a hairline chamfer highlight along the top front edge. Apply the same change to the side door's centre column of chevrons (wc.jpg, 40 by 650 at 1960,200).

### R, leaves (3.5 to 5.5)

Light both faces of the leaf cards so no leaf goes near-black on its back face. Target: under 12 percent near-black pixels in wallnear.jpg 640 by 800 at 1760,0 (24.5 percent now), fixing the leaves at 80 by 40 at 1884,560 and 70 by 30 at 1794,630 first. Add a midrib and a paler underside like P and Q have. Let some light pass through leaves seen against the bright clerestory, and give each leaf a slight fold or curl so it shades across its width. Narrow the per-leaf hue range so the flat yellow-green cards (40 by 95 at 2495,365) sit in the same family as the rest. Antialias the leaf edges.

### R, side door leaf (5.5 to 7.5)

Turn the grain to run vertically along the leaf height, and use one wide veneer face or two or three full-height boards with no end joints. Keep the smoked oak tone, which works. Remove the repeated pale end streaks at (2014 to 2139, 265) and (1829 to 1989, 865) in wc.jpg. Do the same for the vertical member at console.jpg 130 by 430 at 2250,510, which carries the same horizontal boards. While doing this, fix the 712 px vertical repeat on the pivot door with a full-height texture or per-board random offsets, and turn the console top boards to run lengthwise (console.jpg, 1000 by 180 at 600,1010).
