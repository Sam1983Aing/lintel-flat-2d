# Entrance materials, blind review 2 (X against Y)

Judged from the eighteen stills only (nine in X, nine in Y, 3456 by 1984), viewed whole and in 1:1 and 3:1 crops, with simple pixel measurements. No code, notes or earlier reviews were opened.

## Scores

| Criterion | X | Y |
|---|---|---|
| 1. Concrete walls | 7.5 | 5 |
| 2. Plaster walls and ceiling | 7 | 5 |
| 3. Stone tile floors (side hall and WC) | 7.5 | 3.5 |
| 4. Pivot door oak | 7 | 3.5 |
| 5. Console oak | 7 | 4 |
| 6. Side door leaf (wc view) | 6 | 5.5 |
| 7. Leaves of the potted branches | 5 | 4.5 |
| 8. Overall, the materials as a whole | 7 | 4.5 |

**Pick: X.** It wins seven of the eight rows and is never behind. X mostly reads as photographed material with a few tells. Y mostly reads as procedural shading, with a few good ideas (form-tie holes, a continuous console top, a vertical door veneer).

## Anchors used

- 3: obvious CG
- 5: decent real-time render
- 7: convincing at a glance, flaws on inspection
- 8: reads as a photographed material in most places
- 10: indistinguishable from a photograph

Half points allowed.

## Measurements

Luminance is 0 to 255. "Fine" is the mean absolute 4-neighbour Laplacian of luminance, a rough measure of pixel-scale surface detail. Regions are given as file, then crop width by height at x, y.

| Region | Mean lum X / Y | Fine X / Y | Notes |
|---|---|---|---|
| Concrete, wall.jpg left of painting (600x700 at 100,600) | 103.9 / 100.6 | 3.01 / 2.59 | |
| Concrete, wallnear.jpg right (600x700 at 2780,400) | 102.9 / 102.6 | 2.94 / 1.98 | |
| Concrete, room.jpg right wall (500x800 at 2700,400) | 107.0 / 109.6 | 2.67 / 1.71 | |
| Plaster, hall.jpg left wall (500x700 at 100,500) | 149.4 / 152.4 | 1.87 / 1.98 | |
| Plaster, wc.jpg left wall (600x700 at 100,300) | 141.2 / 140.5 | 1.98 / 3.34 | Y is high from hard-edged decal speckle |
| Ceiling, ceiling.jpg (600x300 at 300,50) | 158.2 / 159.0 | 1.65 / 0.41 | Y is close to a bare gradient |
| Stone, hall.jpg near (700x450 at 1100,1450) | 142.3 / 138.3 | 2.43 / 1.90 | |
| Stone, wc.jpg near (700x350 at 1200,1600) | 129.0 / 122.9 | 2.44 / 2.15 | spread 7.6 / 10.9, Y jumps tile to tile |
| Pivot door, door.jpg (700x900 at 1500,400) | 124.4 / 125.0 | 3.64 / 1.96 | hue 26 / 24 |
| Console front, console.jpg (1400x600 at 800,1300) | 66.8 / 68.1 | 2.94 / 2.17 | saturation 0.76 / 0.78 |
| Console top, console.jpg (600x120 at 1000,1030) | 125.8 / 114.1 | 4.25 / 1.15 | |
| WC door leaf, wc.jpg (480x1100 at 1700,100) | 69.0 / 66.9 | 2.84 / 1.79 | saturation 0.56 / 0.66 |
| Leaves, green pixels in wallnear.jpg (900x900 at 1740,0) | median 45 / 30 | | 90th percentile 96 / 60, saturation 0.62 / 0.66 |

Repeat checks (autocorrelation of a strip against a shifted copy of itself):

- X pivot door, vertical: 0.44 at a 500 px shift, then a peak of 0.57 at 716 px, then 0.42 at 850 px. The texture repeats about every 716 px on screen.
- Y pivot door, short shifts: 0.66 at 20 px, rising to 0.78 at 30 px. The ring lines are evenly spaced about 30 px apart. X at the same shifts falls smoothly (0.64, then 0.56), as real grain does.
- Console fronts and the room.jpg right concrete wall show no repeat peak in either version.

## What the two have in common

- Same light, same camera, same objects. The mean brightness of each material differs by at most about 6 levels between X and Y, so the versions were matched in tone. The difference is all in texture and structure.
- The same plant geometry in both: flat leaf cards on smooth brown cylinder stems with no bark. In wall.jpg near the top of the plant (about x 2380, y 240) one leaf seen edge-on shows a cross-hatched moiré in both.
- Both console fronts are very saturated orange (0.76 and 0.78), redder and stronger than natural or oiled oak usually photographs.
- The concrete return faces (room.jpg right wall end, about x 3200) are darker and coarser than the wall faces in both.
- The marble floor, painting, vase, pendant and line-drawing view are identical and were not scored.

## X

Scores: concrete 7.5, plaster and ceiling 7, stone floors 7.5, pivot door 7, console 7, side door leaf 6, leaves 5, overall 7.

### Three strongest

1. **Stone floors.** hall.jpg, lower half (x 1000 to 2600, y 1400 to 1984). Limestone with fossil pits, fine dark veining, a soft tone shift from tile to tile and a random lay of different tile sizes. It holds up all the way to the far end of the hall. In wc.jpg near the bottom centre a darker vein runs across one tile, which a real stone would do.
2. **Board-marked concrete.** wallnear.jpg right third (x 2600 to 3456). Board laps, small voids, pale laitance patches and short cracks, at a believable scale. Fine detail 2.94 against 1.98 in Y. At the grazing angle left of the vase (x 1400 to 1620, y 1050 to 1430) it stays smooth and clean.
3. **Console front.** console.jpg, front face (y 1200 to 1984). Oak with large knots, cathedral figure and small pin knots, with no repeat across 1800 px. It reads like a photographed solid plank.

### Three weakest

1. **Leaves.** wallnear.jpg top centre (x 1760 to 2540, y 0 to 880). Flat cards with hard elliptical edges and no midrib. Lit faces are one flat yellow-green, the rest drop to near black, so each leaf has two tones and nothing between. Saturation 0.62 is high for olive-type foliage, which is usually grey-green.
2. **Pivot door repeat.** door.jpg (x 1400 to 2580). The oak repeats vertically about every 716 px, so the same knots in the left-centre staves line up three times down the leaf. The narrow staves also read a little like flooring.
3. **Side door leaf.** wc.jpg (x 1670 to 2230, y 0 to 1380). Horizontal floorboards with butt joints and pale end-joint highlights (for example at about y 265 and y 750). It looks like a plank floor turned onto a door, not a door leaf.

Also noted: the console top (console.jpg, x 1000 to 1600, y 1030 to 1150) shows short staves running front to back, so the top's grain does not continue from the front face. The plaster pits are the same size and density on every wall and the door jamb, which reads more like sprayed stucco than a smooth luxury plaster.

## Y

Scores: concrete 5, plaster and ceiling 5, stone floors 3.5, pivot door 3.5, console 4, side door leaf 5.5, leaves 4.5, overall 4.5.

### Three strongest

1. **Form-tie holes in the concrete.** 07-hall.jpg right wall and wall.jpg. A grid of tie holes gives the walls a cast-in-place architectural reading at room scale. This is a good idea that X does not have.
2. **Console top continuity.** console.jpg (x 1000 to 1600, y 1030 to 1150). The grain runs along the length, and the front edge has a soft highlight like a satin finish. The top is nearly featureless though (fine detail 1.15 against 4.25).
3. **Side door leaf orientation.** wc.jpg (x 1670 to 2230). Vertical straight grain is the right layout for a door leaf and reads at a glance as a quarter-cut veneer.

### Three weakest

1. **Stone floors.** hall.jpg and wc.jpg. Each tile is a flat fill with a soft gradient, and neighbouring tiles jump in tone (spread 10.9 against 7.6 in wc.jpg). The specks are flat cut-out blobs with hard edges and no depth, over a drawn-looking crackle network (hall.jpg near tiles, x 1100 to 2600, y 1450 to 1900). Beyond the second row all of that detail is gone and the tiles are blank. A joint runs straight through every row from about x 1850, y 880 to x 2120, y 1980 in hall.jpg, and four tiles meet at one cross in wc.jpg (about x 1450, y 1700).
2. **Pivot door oak.** door.jpg (x 1400 to 2580). Nested arch rings repeat in every stave, with even ring spacing (correlation 0.78 at 30 px). No pores, no ray flecks, no knots. The colour leans salmon (hue 24) and reads more like cedar than oak. A smeared vertical band runs the full height near x 1540.
3. **Console front.** console.jpg (y 1200 to 1984). Chevron arches stack in rows at the same positions board after board. The seam between two boards is a stair-stepped, aliased light line (x 1100 to 1400, y 1690 to 1720).

Also noted: the plaster speckle is flat and two-tone, like a printed decal, and fades to nothing a couple of metres away (hall.jpg left wall, and the right edge of room.jpg). The ceiling is a bare gradient (fine detail 0.41). The concrete at a grazing angle breaks into dashed dark scan lines (wallnear.jpg, x 1400 to 1620, y 1050 to 1430). Away from the tie holes, the pale patches look like stretched noise rather than laitance (wallnear.jpg right third). The leaves are a third darker than X (median 30 against 45), so the plant reads as one dark mass.

## What would raise each

### X, leaves, from 5 to 7

- Give each leaf a midrib and a slight fold, through a crease in the card or a normal map.
- Move the albedo to a dusty grey-green, around RGB 95, 110, 80, with saturation near 0.35, and make the underside paler and slightly silver.
- Add translucency, so leaves lit from behind glow a warm green and do not go black.
- Vary hue, size and angle a little per leaf, and soften the alpha edge with mipmapped alpha or alpha-to-coverage. That also removes the edge-on moiré.
- Put a fine bark texture on the stems.

### Y, stone floors, from 3.5 to 5.5

- Replace the flat per-tile fill with a scanned limestone albedo that has large mottling and fine veining, and keep it at every distance, not only on the first two rows.
- Swap the cut-out specks for pits with depth: a darker soft-edged interior, a roughness change and a normal map.
- Lay the tiles in running bond or random lengths, so no joint runs straight through more than two rows and there are no four-way crossings.
- Cut the tone jump between tiles to a few percent, and recess the joints slightly with a grout that varies a little in colour.

### Y, pivot door, also at 3.5, to 5.5

- Replace the ring shader with a scanned oak, or break the ring spacing with noise and give each stave its own arch position.
- Add pores and ray flecks, and a few small knots.
- Fix the UV smear near x 1540.
- Pull the hue from salmon toward a yellow-brown oak (around hue 30) with a little less saturation.
