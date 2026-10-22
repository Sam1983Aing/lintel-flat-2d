# Entrance materials, blind review 4 (K, M, N)

Outside reviewer, 15 October 2026. Judged from the 27 stills in `2026-10-15-entrance-blind-4/K`, `/M` and `/N` only. Every still was viewed whole, then in 1:1 and 3:1 crops. Coordinates below are full-resolution pixels in the 3456 by 1984 stills, origin top left.

## Scores

| Criterion | K | M | N |
|---|---|---|---|
| 1. Concrete walls (board-formed) | 6.0 | 7.5 | 6.5 |
| 2. Plaster walls and ceiling | 5.5 | 7.0 | 6.0 |
| 3. Stone tile floors (side hall and WC) | 5.0 | 8.0 | 5.5 |
| 4. Pivot door oak | 4.5 | 7.5 | 5.0 |
| 5. Console oak | 5.0 | 7.5 | 5.0 |
| 6. Side door leaf (wc view) | 5.5 | 6.0 | 5.0 |
| 7. Leaves of the potted branches | 5.0 | 4.5 | 5.0 |
| 8. Overall, the materials as a whole | 5.0 | 7.0 | 5.5 |

## Pick

M. It is the only version where the concrete, the stone floor and both large oak surfaces read as photographed materials at normal viewing distance, and none of its wood shows a repeating figure.

Its two real failures (a side door dressed in horizontal floorboards and leaves that go black) are local fixes, while K and N would need new wood and stone materials before they could catch up.

## Anchors

- 3: obvious CG.
- 5: a decent real-time render.
- 7: convincing at a glance, with flaws on inspection.
- 8: reads as a photographed material in most places.
- 10: indistinguishable from a photograph.

## Measurements

Luminance is Rec. 709 on 0 to 255. "Fine detail" is the mean absolute 4-neighbour Laplacian of luminance. Same light and camera in all three, so means agree within about 3 levels almost everywhere and the differences sit in spread and fine detail.

| Region (file, crop W by H at X,Y) | What | K | M | N |
|---|---|---|---|---|
| wall.jpg 300 by 300 at 2750,550 | concrete mean / sd / fine detail | 106.0 / 8.2 / 2.25 | 104.3 / 8.7 / 3.30 | 105.3 / 7.8 / 2.18 |
| wallnear.jpg 300 by 300 at 2800,500 | concrete mean / sd / fine detail | 106.6 / 8.7 / 2.20 | 109.4 / 11.2 / 4.31 | 106.1 / 8.3 / 2.07 |
| room.jpg 300 by 300 at 2700,700 | concrete mean / sd / fine detail | 113.8 / 6.3 / 1.82 | 111.4 / 6.9 / 3.10 | 112.8 / 5.7 / 1.69 |
| wallnear.jpg 560 by 300 at 2880,1150 | concrete tiling search, best normalised cross-correlation of a 200 by 160 patch shifted 30 to 340 px | 0.21 | 0.27 | 0.24 |
| hall.jpg 300 by 300 at 200,400 | plaster mean / sd / fine detail | 147.4 / 4.1 / 1.51 | 147.5 / 4.5 / 1.95 | 147.3 / 4.2 / 1.39 |
| wc.jpg 300 by 300 at 300,300 | plaster mean / sd / fine detail | 138.2 / 4.6 / 1.90 | 141.0 / 5.0 / 2.27 | 137.7 / 4.5 / 1.73 |
| room.jpg 300 by 200 at 1100,380 | sunlit back plaster mean / sd / fine detail | 176.7 / 9.5 / 0.57 | 178.2 / 9.4 / 1.41 | 176.6 / 9.5 / 0.98 |
| ceiling.jpg 300 by 300 at 500,150 | ceiling mean / sd / fine detail | 160.7 / 4.8 / 0.45 | 161.7 / 5.4 / 1.98 | 160.7 / 4.9 / 0.69 |
| hall.jpg 300 by 300 at 200,400 | plaster pits (4 levels below local mean): count / size variation / largest px | 417 / 0.87 / 53 | 433 / 0.89 / 69 | 353 / 0.60 / 40 |
| wc.jpg 300 by 300 at 300,300 | plaster pits: count / size variation / largest px | 466 / 0.84 / 62 | 584 / 0.95 / 89 | 386 / 0.68 / 38 |
| hall.jpg 300 by 200 at 1250,1600 | near floor mean / sd / fine detail | 137.6 / 5.5 / 1.62 | 140.0 / 7.5 / 2.89 | 138.2 / 5.0 / 1.44 |
| wc.jpg 300 by 200 at 1500,1650 | near floor mean / sd / fine detail | 128.6 / 4.8 / 1.64 | 129.4 / 7.6 / 3.12 | 128.9 / 4.5 / 1.53 |
| hall.jpg, 40 by 40 boxes either side of 4 joints (K, N) or 5 joints (M) | tone step between neighbouring tiles, mean (max) | 3.3 (6.1) | 5.9 (9.9) | 3.7 (5.3) |
| hall.jpg 200 by 50 at 1700,1150 (M at 1700,1170) | far tile streaking, sd of row means divided by sd of column means (1.0 means no direction) | 3.78 | 0.99 | 1.65 |
| door.jpg 300 by 400 at 1600,600 | pivot door mean / sd / fine detail | 128.5 / 7.1 / 3.24 | 128.4 / 9.0 / 4.73 | 126.7 / 7.7 / 3.97 |
| door.jpg 80 by 1500 at 1760,300 | pivot door vertical autocorrelation, strongest peak | 0.56 at 103 px, then 0.34 at 204, 0.25 at 304 | 0.23, no period | 0.39 at 86 px |
| console.jpg 300 by 300 at 1500,1250 | console front mean / sd / fine detail | 69.7 / 6.0 / 3.16 | 68.7 / 7.7 / 3.14 | 69.0 / 6.5 / 3.06 |
| console.jpg 300 by 300 at 1500,1250 | console front mean RGB | 119, 60, 25 | 115, 59, 27 | 118, 59, 25 |
| wc.jpg 300 by 400 at 1720,400 | side door mean / sd / fine detail | 66.2 / 5.1 / 2.68 | 71.4 / 6.9 / 3.50 | 63.9 / 5.7 / 3.07 |
| wc.jpg 120 by 1200 at 1760,100 | side door vertical autocorrelation, strongest peak | 0.11 | 0.18 at 83 px (plank height) | 0.10 |
| wallnear.jpg 300 by 300 at 2000,200 | leaves mean / sd / fine detail | 45.8 / 22.1 / 7.86 | 39.5 / 27.6 / 8.62 | 45.6 / 22.0 / 7.84 |
| wallnear.jpg 800 by 860 at 1760,0 | leaves: near-black neutral px / leaf luminance median / mean saturation | 4,073 / 32 / 0.66 | 27,695 / 21 / 0.77 | 3,998 / 32 / 0.66 |
| wall.jpg 560 by 900 at 1960,300 | leaves: near-black neutral px | 5,700 | 16,143 | 5,920 |

A difference image of K against N shows that N changed the concrete blotches, the plaster speckle, the ceiling, the floor and all three oak surfaces. The leaves are identical between K and N to within JPEG noise.

## What the three have in common

- The main hall floor is the same in all three: near-black stone with glowing cream "veins" that loop like light trails, for example room.jpg 560 by 400 at 800,1500. It reads as a neon effect, not as stone, and it is the largest dark surface in room.jpg and 07-hall.jpg. It caps the overall score for every version.
- Every tile floor is perfectly flat. No lippage, no edge arris catching the light, and the joints are one uniform thin dark line everywhere (hall.jpg 1000 by 800 at 1300,1100).
- The console oak is the same saturated orange-red in all three (mean RGB about 118, 60, 25 on the front). Real oiled oak in this light would sit browner and less saturated.
- The leaf geometry and the stems are shared: stems are smooth brown cylinders with no bark, and leaf edges stair-step at 3:1 (wallnear.jpg 186 by 180 at 2200,300).
- No surface shows visible specular variation. Wood, plaster and stone all carry one even sheen, so the low sun from the clerestory never picks out texture by glancing highlight.
- The plaster everywhere is the same warm grey. Light, room geometry and objects are identical, so every difference reported here is material.

## K

Strongest

1. Concrete tie holes and board joints. room.jpg 560 by 700 at 2640,500 shows cone holes on a regular grid, for example at 2833,535, 2940,675, 2835,712, 3080,852 and 2945,873, with a dark core and soft rim, and straight board joints with fine bleed lines. The grid gives the wall the right architectural scale.
2. Tile format and layout. hall.jpg shows a running bond of long tiles with crisp thin joints, for example the joint at x 1590 from y 1370 to 1560 and the slanted joint from 2040,1570 to 2110,1850. The format reads right for a side hall.
3. Leaf colour. wallnear.jpg 560 by 700 at 1880,0 has a grey-olive top, darker underside and a lighter midrib, which reads as olive at a glance.

Weakest

1. The pivot door figure repeats. In door.jpg the cathedral arch at about x 1840 recurs at y 300, 403, 506, 609 and so on down the leaf, period 103 px, autocorrelation 0.56 with clean harmonics. Across the whole door (x 1400 to 2560) it looks like a printed laminate. There are no pores and no rays.
2. Camouflage concrete. room.jpg 560 by 700 at 2640,500 and 07-hall.jpg 400 by 600 at 300,400 carry pale blotches with crisp lobed edges that ignore the board lines, for example 2680 to 2980 by 550 to 640 in room.jpg. A looped glyph sits at room.jpg 2710 to 2747 by 1090 to 1123. Fine detail is only 1.8 to 2.25, so there is no board-grain imprint at all.
3. Painted pits and wood-like tiles. hall.jpg 186 by 140 at 1300,1600 has a teardrop pit at 1385 to 1430 by 1650 to 1662 that is one flat brown with no rim, no depth and no shadow. Farther down the hall (hall.jpg 560 by 420 at 1380,860) the pits vanish and the tiles show horizontal streaks (ratio 3.78), so they read as laminate planks. The ceiling is a flat fill (fine detail 0.45).

## M

Strongest

1. Stone floor. hall.jpg 1700 by 1000 at 880,900 reads as a photographed limestone: hairline veins, fossil marks such as the swirl at 1780 to 1880 by 1170 to 1220, mixed tile sizes and real batch variation (the lighter tile at 1600 to 2095 by 1400 to 1670). Tone step between tiles is 5.9 against 3.3 and 3.7, and there is no directional streaking (ratio 0.99). wc.jpg 1500 by 900 at 1000,1080 holds up the same way.
2. Concrete. room.jpg 560 by 700 at 2640,500 and wallnear.jpg 560 by 700 at 2700,300 show board-grain imprint, laitance, honeycombing and real cracks, for example wall.jpg 2870 to 3000 by 790 to 810. Fine detail is 3.1 to 4.3 against about 2 in K and N, and the tiling search found no repeat (0.27).
3. Oak on the console and pivot door. console.jpg has real knots at 1530,1305, 1615,1320 and 1900,1250, flake and cathedral figure on the front, and an open grain top. door.jpg has a knot at 1940,765 and no period anywhere on the leaf (best autocorrelation 0.23).

Weakest

1. Side door leaf dressed as flooring. wc.jpg 520 by 700 at 1690,300 shows horizontal planks about 83 px tall with staggered butt ends and pale filler streaks at 2020 to 2190 by 750 and 1830 to 1980 by 865. On a door leaf this reads as a floor texture applied sideways, which is a stronger tell than any CG look.
2. Leaves going black. wall.jpg 2254 to 2347 by 403 to 463 and wallnear.jpg 1880 to 2040 by 380 to 600 have leaflets rendered as near-black silhouettes. The near-black count in wallnear.jpg is 27,695 px against 4,073 in K. Overall leaf colour is a saturated grass green (saturation 0.77) with no olive silver. The tapered leaf shape is better than K and N, but the shading undoes it.
3. Concrete and plaster pushed too far. The concrete has no tie holes anywhere, square straight-edged patches at wallnear.jpg 3060 to 3120 by 315 to 440 and 2810 to 2830 by 880 to 1000, and bright white laitance bands at room.jpg 2640 to 3200 by 830 to 950, so it reads as an old weathered wall more than a new house. Plaster pits are dense and dark (584 in wc.jpg 300 by 300 at 300,300, largest 89 px), for example hall.jpg 280,390 and 490,430, and at close range they read as dirt.

## N

Strongest

1. Quieter concrete. 07-hall.jpg 400 by 600 at 2700,600 and room.jpg 560 by 700 at 2640,500 keep K's tie holes and board joints but soften the blotches (sd 5.7 against 6.3 in room.jpg), so at a glance the wall reads as even fair-faced concrete.
2. Better far floor than K. In hall.jpg 560 by 420 at 1380,860 pits survive into the distance, for example at 1760 to 1820 by 920 to 930 and 1640 to 1720 by 1180 to 1190, and the plank-like streaking drops from 3.78 to 1.65.
3. Ceiling and plaster less synthetic than K. ceiling.jpg 560 by 500 at 300,50 has a faint large-scale mottle (fine detail 0.69 against 0.45), and the wall dots are fewer and more even (353 against 417 in hall.jpg 300 by 300 at 200,400).

Weakest

1. The pivot door still repeats. door.jpg 80 by 1500 at 1760,300 shows arches at about x 1830 recurring every 86 px (autocorrelation 0.39). The lines are finer than K but the stacked V pattern is the same tell.
2. Leaves unchanged from K. wall.jpg 186 by 160 at 2200,380 shows leaflets with square ends and stair-step edges, for example 2250 to 2300 by 420 to 463. They are flat shaded with no light passing through.
3. Smeared side door and flat stone. wc.jpg 186 by 180 at 1800,700 is fine vertical hairline streaking that looks brushed rather than grown, with no pores and no figure. The floor pits are still flat decals, for example wc.jpg 560 by 400 at 1300,1560.

## How to raise each version's two weakest criteria by two points

### K, pivot door oak (4.5 to 6.5)

- Break the period. Warp the ring field with low-frequency 2D noise across the full leaf so no arch recurs inside 300 px, and offset the arch apex sideways per board. Target a vertical autocorrelation peak under 0.25 on door.jpg 80 by 1500 at 1760,300.
- Build the leaf from two or three wide veneer leaves with different figure, book-matched at a visible but tight seam, instead of one continuous procedural sheet.
- Add pores as dark 1 to 2 px dashes running with the grain and a sprinkle of medullary ray flecks, and raise grain contrast from sd 7.1 to about 9.
- Vary roughness with the grain so the low sun picks out the figure at a glance.

### K, stone tile floors (5.0 to 7.0, chosen over console and leaves at the same score because it covers the most area)

- Give the pits depth: darker core, lighter rim, a small normal or AO dip, and vary pit size and density per tile. Today every pit is the same flat brown.
- Remove the horizontal streak bands (ratio 3.78) or turn them into faint vein-cut bedding that keeps its detail with distance. Fix the mip or LOD falloff so pits do not vanish beyond y 1280 in hall.jpg.
- Add per-tile tone and hue offsets so the joint step reaches 5 to 8 levels, plus faint veins or fossil inclusions.
- Add a 1 to 2 px arris highlight on tile edges and slight per-tile tilt so the joints stop reading as drawn lines.

### N, pivot door oak (5.0 to 7.0)

- Everything listed for K's door applies. The 86 px period has to go first, since it is the one thing a viewer notices.
- Keep N's finer line density but add knots or pin knots at a low rate (one or two per door) and some colour drift along the length, so the leaf stops looking uniform from top to bottom.

### N, leaves (5.0 to 7.0, chosen over console and side door at the same score because K and N share them unchanged)

- Replace the rectangular leaflet alpha with a tapered lanceolate olive leaf: pointed tip, short petiole, slight asymmetry.
- Shade two sides. Darker grey-green on top, a pale silvery underside, and diffuse transmission so backlit leaves glow instead of staying flat.
- Jitter hue and value per leaf by about 10 percent and give each leaf a slight curl so normals vary.
- Turn on alpha-to-coverage or MSAA on the foliage so the stair steps at 3:1 disappear.

### M, leaves (4.5 to 6.5)

- Fix the black leaves first. Light both faces (flip normals on back faces) and add transmission, so no leaflet falls below roughly 15 on luminance in wall.jpg 560 by 900 at 1960,300.
- Lift the underside albedo to a silvery grey-green and pull overall saturation from 0.77 toward 0.6 so the plant reads as olive, not as grass.
- Keep M's tapered leaf shape, which is already the best of the three, and anti-alias the alpha edge.

### M, side door leaf (6.0 to 8.0)

- Run the grain vertically and use one continuous veneer, or two or three wide book-matched leaves, with no plank butt ends and no pale filler streaks.
- Match the species and finish of the pivot door, or go deliberately darker (smoked oak) but without knots and cracks, since a flush interior door would be a select grade.
- Check texel density on this mesh. At 3:1 its knots are soft-edged compared with the console, so a higher resolution map or tighter UV scale is needed for a leaf seen this close.
