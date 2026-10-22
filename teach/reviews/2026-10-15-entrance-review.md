# Entrance materials review: P against Q (blind)

Judged from the 18 stills only (nine per version, 3456 x 1984, same cameras). I looked at each one whole and in full resolution crops, and took region measurements from the pixels with ffmpeg. I did not open any code, notes or keys.

## Scores

| Criterion | P | Q |
|---|---|---|
| 1. Concrete walls | 5 | 7.5 |
| 2. Stone tile floors (side hall and WC) | 4 | 7.5 |
| 3. Pivot door oak | 3 | 6.5 |
| 4. Console oak | 3.5 | 8 |
| 5. Side door leaf (wc view) | 3 | 5.5 |
| 6. Leaves of the potted branches | 4 | 5.5 |
| 7. Overall, the materials as a whole | 4 | 7 |

## Pick

Q, clearly. It wins all seven rows. Its wood and stone look like photographed surfaces and read as real at a glance. P's wood and stone are procedural and read as computer generated at a glance in most views.

## Anchors used

3 is obvious CG. 5 is a decent real-time render. 7 is convincing at a glance, with flaws on inspection. 8 reads as a photographed material in most places. 10 cannot be told from a photograph. Half points allowed.

## Measurements

Fine detail is the mean absolute Laplacian of luma, measured at half scale. Higher means more small-scale texture. Hue is in degrees, saturation from 0 to 1, luma from 0 to 255.

| Region (file, place) | P | Q |
|---|---|---|
| Concrete, wall.jpg, left of the painting: luma, fine detail | 97.9, 2.4 | 103.7, 4.7 |
| Concrete, wallnear.jpg, right of the vase: fine detail | 2.4 | 4.7 |
| Concrete under this light: hue, saturation | 34.4, 0.32 | 33.3, 0.33 |
| Pivot door, door.jpg, centre of the leaf: hue, saturation, luma | 18.6, 0.47, 88 | 26.1, 0.56, 124 |
| Console front, console.jpg: hue, saturation | 19.5, 0.78 | 21.6, 0.76 |
| Console top, console.jpg: hue, saturation, fine detail | 22.7, 0.61, 2.3 | 25.8, 0.55, 7.0 |
| Hall floor, hall.jpg, lower centre: luma, spread (sd) | 135, 10.0 | 139, 13.0 |
| WC floor, wc.jpg, lower centre: luma, spread (sd) | 125, 9.7 | 129, 7.7 |
| WC door leaf, wc.jpg: hue, luma, spread (sd) | 32.9, 60, 4.0 | 27.5, 70, 6.9 |
| Leaves, wallnear.jpg: luma, share of leaf pixels below luma 25 | 32.5, 43% | 27.5, 57% |
| Leaves, room.jpg: luma, share below luma 25 | 31.4, 37% | 22.5, 66% |

The light is warm. Grey concrete comes out at hue 33 to 34 with saturation 0.32. So oiled oak under this light should land somewhere near hue 28 to 34. Q's oak is close. P's door, at 18.6, is pink.

I also ran a repeat check (autocorrelation of high-passed luma). The concrete strips in wall.jpg (1800 px tall) peak at 0.08 in both versions. The console front over 3300 px peaks at 0.04 in both. The Q pivot door peaks at 0.15. None of these shows a tiled repeat.

## What the two have in common

- Same light, same marble, same pendant. The marble in room.jpg measures luma 33.1 in both.
- The black marble floor (room.jpg, lower half) has veins made of dotted, sparkly lines. It is the same in both, and it is the loudest CG tell in the entrance views. It is not one of the scored materials, but it pulls both overall impressions down.
- Bright white dust specks float in every view.
- No large surface shows a tiled repeat.
- Nothing has relief at grazing angles. In 07-hall.jpg, the side walls change tone along the boards but no board edge ever catches the light.
- Edges are sharp, with no bevel highlight. See the console top edge in console.jpg and the pivot door edge in door.jpg.
- One difference outside the stated list: the white plaster walls and the ceiling do not match. Q has a fine stipple (fine detail 3.2 to 3.6 on the hall, WC and door jamb plaster, against 0.6 to 0.7 in P, and 3.1 against 1.6 on the ceiling). The marble and the exposure match. I scored only the listed materials, but the stipple makes Q's hall and wc views look more finished. Someone comparing the two will feel a slightly bigger gap than the material scores alone suggest.

## P

Scores: concrete 5, floors 4, pivot door 3, console 3.5, side door leaf 3, leaves 4, overall 4.

Strongest:
1. wall.jpg, right of the plant: form tie holes on a regular grid, each with a small shaded cone. A real architectural cue that Q does not have.
2. room.jpg, right wall: from the door, the soft mottling and long seams pass for smooth formed concrete. It only breaks down up close.
3. room.jpg and 07-hall.jpg, the plant: from a distance the leaves look lighter and finer than Q's (leaf luma 31 against 22, 37% near black against 66%), so it reads as foliage and not as a dark mass.

Weakest:
1. door.jpg, centre of the leaf: salmon pink (hue 18.6). The nested arcs look like thin drawn contour lines with an embossed rim. They stop dead at hard vertical stave lines, and there are no pores. Obvious CG.
2. wc.jpg, the door leaf (around x 1700 to 2200): columns of near identical nested drape arcs stacked down the leaf. It reads as a pattern, not as wood.
3. wallnear.jpg, upper middle (leaves against the wall, around x 1840 to 2540, y 100 to 700): dotted and dashed dark outlines around each leaf card, plus stray pixel specks. You can see the cut-out edges from a normal viewing distance.

Also seen:
- console.jpg front: cherry red (saturation 0.78), evenly spaced chevron rings and stair-stepped ring lines. It looks like laminate.
- hall.jpg floor: flat beige with a printed crackle decal. The joints are drawn as uniform lines, and the long joint is wider and darker than the cross joints.
- wallnear.jpg, right: the concrete blotches are soft-edged camouflage shapes with no fine texture, and the seams have stair-stepped aliasing. With three or four seams up the wall, it reads as plywood-formed concrete, not board-marked.

## Q

Scores: concrete 7.5, floors 7.5, pivot door 6.5, console 8, side door leaf 5.5, leaves 5.5, overall 7.

Strongest:
1. console.jpg, front face: oak with knots, cathedral figure and open pores. The top and front clearly show different cuts. It reads as photographed, and nothing repeats across 3300 px.
2. hall.jpg, lower half: limestone with fossil pits and fine veins, staggered tile lengths, and a tone shift from tile to tile (luma sd 13.0 against 10.0 in P).
3. wallnear.jpg, right of the vase: board-formed concrete with board ends, small chips and white laitance patches, and about twice P's fine detail. Convincing at arm's length.

Weakest:
1. wc.jpg, the door leaf: the grain runs horizontally in narrow strips, with end joints and pale sapwood streaks along the strip edges. It is a floorboard texture laid across a door.
2. wallnear.jpg and room.jpg, the leaves: flat, single-tone ellipses, all the same shape, with no vein and no translucency. 57% of leaf pixels in wallnear.jpg and 66% in room.jpg sit below luma 25, so from the door the plant reads as a black mass.
3. door.jpg, the pivot door: about ten narrow staves with bright pale lines between them. It reads as butcher block or flooring, not as a veneered pivot door. At 1:1 the texture is soft, and the grain blurs before you get down to screen pixels.

Also seen:
- 07-hall.jpg, right wall: the concrete has no tie holes and no relief at grazing angles.
- hall.jpg: two pale tiles with almost no figure (around x 1780, y 1040 and x 1840, y 1520) look like flat fills.
- The same S-shaped vein shows up on a hall tile (hall.jpg, around x 1840, y 1200) and on the bottom tile in wc.jpg (around x 1900, y 1860). That repeat is visible if you walk through both.
- The joints are thin, uniform lines with no grout shadow.

## What would raise each version's weakest material by two points

P, pivot door oak (3 to 5). The same fix applies to the side door leaf.
- Replace the procedural arcs with a photographed or scanned oak veneer, rift or flat cut, with no hard vertical stave cuts. Use two or three book-matched leaves across the door.
- Move the colour from hue 18.6 to about 28 to 32 under this light, at a saturation of about 0.5.
- Give it at least one texel per screen pixel in the door view (about 4k texels across the leaf). Add a pore normal map and a roughness map so the oiled sheen breaks up.
- In wc.jpg, use one vertical veneer with real figure in place of the repeating drape arcs.
- For P's leaves, anti-aliased alpha (alpha to coverage, or premultiplied alpha with a mip-aware cutoff) would remove the dotted fringe. That alone is worth one to two points.

Q, side door leaf (5.5 to 7.5).
- Turn the grain vertical. Use one wide veneer face, or two book-matched leaves, in place of the strip floor texture. No end joints and no pale strip edges.
- Match the grain scale of the console oak, with pores visible at 1:1.
- Give the leaf a visible edge in a slightly lighter edge-band colour, with a small bevel that catches the hall light.

Q, leaves (5.5 to 7.5), a close second.
- Add a transmission term so backlit leaves glow green instead of going black. Aim for under 20% of leaf pixels below luma 25 in room.jpg.
- Use a leaf texture with a midrib and a lighter underside. Vary hue and size per leaf by about 10 to 15%, and use two or three different leaf outlines.
