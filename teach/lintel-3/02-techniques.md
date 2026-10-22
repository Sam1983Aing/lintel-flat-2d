# Lintel iteration 3: the techniques

Four signature moves get a full card and a demo. The supporting moves are listed at the end with one line each.

All "where" references point at the frozen copy of iteration 3, `001 Lintel/v3/`. The code sketches are simplified from the real code so they fit on a slide. Each card says what was left out.

---

## ★ The plan is a real cut (a section plan with a clipping plane and capped walls)
Level: intermediate · Needs: three.js basics (camera, materials) · Demo: `demos/section-cut.html` · Where: `v3/scene.js:756` (the cut), `:845` and `:992` (the lids), `:1758` (the lids follow the cut)

**The feel.** The page opens on a sheet of paper and nothing moves. Then you scroll and the sheet turns out to have height. The more the first second looks like a real drawing, the bigger that moment is. So the plan can't be a picture of the house. It has to be the house.

**The idea.** An architect's plan is the house sliced at about 1.2 m and seen from straight above. So slice the real 3D house with one plane and look at it through a very long lens from far away. A 3D wall is hollow, so every wall also gets a flat lid of ink that rides just under the slice. Architects call that solid fill poché.

**How it works.**

    // one plane for the whole renderer: nothing above it is drawn
    const cutPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1.2);
    renderer.clippingPlanes = [cutPlane];

    // a long lens straight above. At 3 degrees there is almost no perspective left
    camera.fov = 3;
    camera.position.set(0, FRAME / Math.tan(1.5 * Math.PI / 180), 0);
    camera.up.set(0, 0, -1);            // north is up on the sheet
    camera.lookAt(0, 0, 0);

    // every wall piece: the wall itself, and a lid the size of its footprint
    WALLS.forEach(([x0, z0, x1, z1]) => {
      scene.add(wallBox(x0, z0, x1, z1));
      const lid = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2);
      lids.add(new THREE.Mesh(lid.translate((x0 + x1) / 2, 0, (z0 + z1) / 2), ink));
    });

    // each frame: the lids ride a hair under the cut
    cutPlane.constant = cut;
    lids.position.y = cut - 0.004;
    lids.visible = cut < WALL_H;        // above the walls there is nothing to close

(The real version collects the lids while it builds the walls, groups them by height range into one mesh each, and shows a group only while the cut passes through its range. Glass gets a lid 4 cm wide so it reads as a line. The lids also read how much of each room's ink is on the sheet, which is what lets the drawn opening ink the plan room by room.)

**The knobs.**
- Cut height 1.2 m. It passes through the windows and above the furniture, which is why real plans cut there. Lower and the windows vanish. Higher and you slice the door heads.
- Lens 3°. At 10° the walls near the edge of the sheet start showing their sides. At 3° you can't tell it is 3D, which is the point.
- Lid drop 4 mm. Put the lid exactly on the cut and the plane slices it off too.
- The opening move: lens from 3° to 36° while the camera tilts and comes closer so the house keeps its size. That one move is the whole reveal.

**Remix it.**
- A product cutaway: slice a shoe, a watch case or a speaker and cap the cut in one flat colour. Scroll moves the plane.
- A building that opens floor by floor: raise the cut one storey per section.
- A "drawing mode" on any 3D product page: long lens, cut and lids on, then let go.

**Gotchas we hit.**
- *Walls drawn by accident.* For a long time there were no lids. The ink was whatever the camera saw inside the hollow walls once their tops were sliced off. From straight above that is almost nothing, so some walls came out black and some as two thin lines, and they changed as soon as the view tilted. I saw it before I understood it: "some lines are thinner, some walls are wider, I think it's hiding something underneath." With lids the flicker score at the first scroll went from 2.65 to 0.51.
- *The old trick inked everything hollow.* It also filled the inside of the olive's stone ring. Ink on back faces is now something a material has to ask for.
- *Roofs popping black and white.* On the way down the cut swept through the roof slabs. Inside a slab you see its hollow. Now the cut waits just under the ceilings until the camera is below every roof.
- *A drawing has to hold still.* Film grain, depth of field, camera drift and pointer parallax are all off while the view is a plan. Measured: 0.000 change between frames at rest.
- *The comb.* Hatch lines (paving, glass) turn into a comb when they get closer together than a pixel can show. They now fade out before that (`lineAA`, `v3/scene.js:248`).

---

## ★ The scan that follows the camera (a per-room reveal from drawing to material, timed by scroll)
Level: advanced · Needs: a first fragment shader, a scroll-driven camera · Demo: `demos/scan-follows-camera.html` · Where: `v3/scene.js:35` (the room table), `:149` (`revealAt`), `:213` (`drawable`), `:1565` (where each wave starts), `:1783` on (when each wave runs)

**The feel.** You never arrive in a finished room. The room finishes around you, a step ahead of where you look. In my words from the review: "As we walk through the house it's scanning along the way, that makes the effect premium."

**The idea.** Every room has one number, from 0 (a drawing) to 1 (real). Every point on every surface knows which room it is in, and at which moment of that number it turns real. The scroll only moves the numbers, and it moves each one when the camera gets there.

**How it works.** In the shader, added to every material:

    float room = roomOf(worldPos);                  // which room is this point in
    float rev  = uRev[int(room)];                   // that room's number
    vec3 cell  = floor(worldPos / PIECE);           // which slab or panel
    float t    = mix(depthIntoRoom(cell), hash(cell), 0.25);   // the moment this piece lands
    float real = step(t, rev);
    float fresh = real * (1.0 - smoothstep(0.0, 0.14, rev - t));   // just landed
    color = mix(paperAndInk, color, real);
    color = mix(color, ORANGE, fresh * outlineOf(cell));

In the page, once per frame:

    // s is the scroll position, at('living') is where the camera reaches that stop
    rev.living  = ease(span(s, at('living') - 50, at('living') + 50));
    rev.kitchen = ease(span(s, at('living', 'h1') + 10, at('dining') + 30));
    rev.patio   = ease(span(s, at('dining', 'h1') - 8, at('patio') + 22));

(The real version finds the room from a table of rectangles, gives each room a start point and a direction for its wave, and has three more fills behind `?fill=`. Lines come from an edge pass over depth and normals. The demo draws box edges instead.)

**The knobs.**
- When each wave runs, in scroll units around a camera stop. The living room goes from 50 before its stop to 50 after. Start it too late and the front is under your feet, so all you see ahead is a drawing.
- Where each wave starts (`FROM`). Always the door you come in by. The patio starts at the sliding door. The garden starts at the bath's glass.
- The fill. Laid (pieces land one at a time, with an orange outline) is the default. `?fill=level`, `section` and `circle` are still there.
- The outline band. It trails less far behind the front in long rooms, or the gallery turns orange for half its length.
- The gallery's wave has two parts: 46 percent while you turn in, the rest stays a few metres in front of the lens for the whole 24 metres.

**Remix it.**
- A product that builds itself part by part as the camera travels along it, from wireframe to material.
- A flat site: each section goes from a line illustration to a photograph as it reaches the middle of the screen. Same two questions per pixel.
- A map or a campus tour where districts colour in as you fly over them.

**Gotchas we hit.**
- *The circle.* The first fill spread from a point as a sphere. I said it "feels like a big round circle is just growing". Giving every point a moment t made three better fills cheap.
- *A rule nobody confirmed.* On 5 October Claude read my notes as "a window never shows a drawing" and let the patio and the gallery finish early, behind glass. On 9 October I said the opposite: nothing ahead of the camera should be finished. The rule now: beside and behind you is real, ahead is a drawing, even through glass.
- *White cut-out trees.* Things that are not on the drawing (trees, cushions, water) were drawn as blank paper before their scan. Against a finished sky that reads as holes. Now they are not drawn at all until their spot is real.
- *Glass and the depth pass.* With glass in the depth pass, a room still in ink behind finished glass looked boarded up. With glass left out for good, every view through a window went milky. It now joins once both of its sides are real.
- *Floating objects.* Small things stayed out of the depth pass after their room was real, so they had no contact shadow. That was half of "it feels there's stuff floating".
- *Orange specks.* The Laid outline drew on twigs and leaves. They are excluded.

---

## ★ The roll of paper (a world-space wipe whose edge is a page element)
Level: intermediate · Needs: patching a three.js material, CSS transforms · Demo: `demos/paper-roll.html` · Where: `v3/scene.js:1680` (`roll()`), `:306` (the shader line), `v3/theme.css:93` (the band)

**The feel.** The walk ends above the built house. Then the architect's sheet rolls back across it and you are looking at the drawing you started with. The idea came from the French *plan d'architecte*, the plan they carry rolled in a tube.

**The idea.** Two halves that move as one. In the 3D there is a line on the ground, and behind it every material shows the drawing again. On the page there is a band of CSS, lit like a cylinder, that is placed on that same line every frame. The roll is not an overlay on top of a fade. It is the edge of the wipe.

**How it works.**

    // the 3D half: one uniform, read by every material
    uRoll.set(N.x, N.z, d);                         // a line on the ground: its normal and its distance
    // ...and in every fragment shader:
    //   float rolled = step(dot(worldPos.xz, uRoll.xy), uRoll.z);
    //   if (notOnTheDrawing && rolled > 0.5) discard;        // trees were never on the plan
    //   color = mix(color, paperOrInk, rolled);

    // the page half: ask the camera where two points of that line are on screen
    const a = toScreen(pointOnLine(d, -60)), b = toScreen(pointOnLine(d, +60));
    const angle = Math.atan2(b.y - a.y, b.x - a.x) - Math.PI / 2;
    band.style.width = width + 'px';
    band.style.transform =
      `translate(${(a.x + b.x) / 2}px, ${(a.y + b.y) / 2}px) translate(-50%, -50%) rotate(${angle}rad)`;

    // three beats instead of one slide
    d = k < 0.16 ? lerp(OFF_SHEET, BESIDE_HOUSE, easeOut(k / 0.16))
      : k < 0.27 ? BESIDE_HOUSE
      : lerp(BESIDE_HOUSE, PAST_IT, easeInOut((k - 0.27) / 0.73));

(The real version works from a screen position back to the line, so the rest position can be "70 pixels left of the plan" on any screen. It also hides the plan's notes behind the line and steps the page's small print back while the ground behind it is dark.)

**The knobs.**
- Lean 3°. Nobody unrolls a sheet dead straight. At 0 it reads as a wipe. Past 8 it reads as a mistake.
- The three beats: in by 0.16, resting until 0.27, then across. Without the rest you never see the tube as an object.
- Width from 104 px down to about a third. A roll gets thinner as it gives its paper.
- The band's look: a five stop gradient for the cylinder, a faint print that slides as it turns, a long shadow on the side it rolls toward.

**Remix it.**
- A blind or a curtain that closes a scene, with the fabric's edge as the wipe line.
- A before and after slider on a renovation page where the divider is a real object, a level or a paint roller.
- A receipt or a ticket printing out over a product scene.

**Gotchas we hit.**
- *The first take was a plain cream cylinder.* The outside reviewer: "we never see the tube as an object before it starts wiping". Half its travel also uncovered empty paper, because the left 40 percent of the sheet is the margin where the headline sits. Hence the three beats.
- *The notes were missing behind the roll.* Labels and dimensions have their own shaders. Each needed the same line.
- *The finale walked in during the roll.* The engine starts the last section a fixed distance after the last stop. The roll's window now ends before that.
- *It has to land on frame one.* After the roll the picture differs from the first frame of the page by 0.1 grey levels out of 255. That number is what makes it a loop and not a fade.
- *A reading that needed a yes.* I said "at the end". Claude took that as the end of the scroll, not the page load, and listed it as its own reading. I confirmed it at the start of iteration 4.

---

## ★ The light is one number (time-of-day lighting from a single table)
Level: intermediate · Needs: three.js lights and tone mapping · Demo: `demos/one-number-light.html` · Where: `v3/light-options.js:41` (the table), `:60` (`hourAt`), `:74` (the clock for each stop), `:86` (the looks), `:130` (`capSky`)

**The feel.** Before this round the whole walk had one light, nearly white, from the front door to the garden. No stop felt like a time of day. I wanted a late afternoon you could feel, and maybe an afternoon that passes while you walk.

**The idea.** Everything about the light follows from how high the sun stands. One table says what the sun, the shade, the sky, the haze, the exposure and the lamps do at five heights. The code blends between two rows. A look is then only a clock.

**How it works.**

    const HOURS = [                       // one row per sun height, in degrees
      { el: 44, sun: 0xfff0dc, power: 6.0, hemi: 0.50, exposure: 0.98, haze: 0.5, lamps: 0.7 },
      { el: 32, sun: 0xffd9a8, power: 6.2, hemi: 0.46, exposure: 0.98, haze: 0.6, lamps: 1.0 },
      { el: 20, sun: 0xffc282, power: 6.4, hemi: 0.40, exposure: 1.12, haze: 0.9, lamps: 1.6 },
      { el: 12, sun: 0xffa758, power: 6.2, hemi: 0.30, exposure: 1.36, haze: 1.1, lamps: 2.4 },
      { el: 5,  sun: 0xff8a3c, power: 5.6, hemi: 0.30, exposure: 1.50, haze: 1.2, lamps: 3.0 },
    ];
    // how high the sun is at a given hour (one place, one day)
    const elAt = (t) => degrees(Math.asin(0.0655 + 0.775 * Math.cos(radians((t - 13.63) * 15))));

    function apply(clock) {
      const el = elAt(clock), h = hourAt(el);         // hourAt blends the two rows around el
      sun.position.copy(directionFor(el, clock)).multiplyScalar(60);
      sun.color.copy(h.sun);  sun.intensity = h.power;
      hemi.intensity = h.hemi;
      renderer.toneMappingExposure = h.exposure;
      setHaze(h.haze);  setLamps(h.lamps);
    }

    const LOOKS = { warm: () => 17.17, golden: () => 19.0, passes: (scroll) => clockAtStop(scroll) };

(The real table has about twenty columns, including bloom, dust, fog and a tint for the shade. It also refits the sun's shadow box to the house every time the sun moves, so a sun at 5° keeps the same crisp edge as one at 44°.)

**The knobs.**
- The clock. Warm Afternoon is ten past five (sun at 32°). Golden Hour is seven in the evening (11°). The Afternoon Passes runs from four at the front door to half past seven in the garden.
- Exposure rises as the sun drops. A low sun gives less light, and without this the evening looks underexposed instead of golden.
- Dust falls from full at four o'clock to a fifth at sunset. In a low sun the dust read as snow.
- Lamps come up as the sun goes down, from 0.7 to 3.0.

**Remix it.**
- A hotel or property page where the hero goes from morning to evening as you scroll the day's schedule.
- A product page with one "mood" number: studio white at one end, warm living room at the other.
- A weather number instead of a sun height: clear to overcast, with shadows softening and colour draining from one table.

**Gotchas we hit.**
- *The sun was in the scene twice.* The dining floor washed out white and the olive glared, and no exposure setting fixed it. The sun exists as the directional light (which casts shadows) and again as the brightest spot of the sky photo that lights everything (which nothing can shade). Indoors the polished floor mirrored that second sun straight through the walls. Fix: rebuild the sky map with its sun capped at six times the sky's middle brightness (`capSky`).
- *Fading one sky into another.* The dome is a simple mix of two photos. The light the sky gives is the hard part, because three.js r160 has no way to blend two prefiltered sky maps. But a prefiltered map is only a 2D texture with a fixed layout, so a tiny pass mixes the two into a third one, and the scene reads that. The fade runs along the gallery, where the sun is out of frame, so nobody sees two suns.
- *Stutter that was not the page.* Clips froze at random places while the Mac was busy. Two takes of the same clip froze at different times, which is how we knew.
- *The default was not my pick at first.* Warm Afternoon became the default on 9 October because the rooms could not score under the old glare. That was Claude's call, flagged as such. I confirmed it at the start of iteration 4. The other two looks stay behind `?light=`.

---

## Supporting moves

| Move | What it does | Where (in `001 Lintel/v3/`) |
|---|---|---|
| The last frame is the first frame | From the garden every reveal runs backwards, so the page ends on the sheet it opened on. One number per room made the reverse free. | `scene.js:1750` on |
| Staging that arrives with the materials | Furniture is an ink outline while its room is a drawing. Decor (cushions, books, lamps, plants) is hidden until the room turns real, so each room gets a second hit. | `staging.js` |
| Soft bedding | A pillow is a box whose faces swell in the middle and pinch at the seam. Duvets and throws are slabs with a gentle sag. | `staging.js:216` (`pillowGeo`), `:230` (`softSlab`) |
| Contact shadows by joining the depth pass | Small objects join the depth pass the moment their room is fully real. That is what stopped them floating. | `scene.js:1828` |
| A real mirror | A second camera on the other side of the glass draws the room into a small picture, every other frame, only inside the suite. A second clipping plane that is always present keeps the wall behind the mirror out of it. | `scene.js:1618`, `:1636`, `:757` |
| A room laid out for the lens | The bath's pieces sat on three walls and no lens takes in three walls. Everything moved onto one diagonal view from the door. | camera key `bath`, `scene.js:345` on |
| Near, middle and far | The garden has something within three metres of the lens, something in the middle, and a ridge two kilometres off. | `staging.js`, `scene.js:1210` on |
| One map, used twice | The woods darken the land's colour where they stand, and the same map plants the tree shapes. | `scene.js:721`, `:1210` |
| Plan figures that leave on time | The dimensions floating in each room fade before that room's title comes up. | `scene.js:1863`, `dimK` |
| Colour out of the scan, not out of the tint | Cloths are grey scans with a tint. The saturation control was applied after the tint, so every cushion was grey. One line. | `scene.js:290`, in `drawable` |
| Two surfaces in one place | A comb of dashes on the gallery ceiling survived every effect being switched off. The piece of wall over each window started exactly in the ceiling's plane. It now starts 6 mm higher. | `scene.js:967` |
| Pay first-use costs under the loader | Hiding trees until needed moved all their setup to one frame and froze the door for 2.4 s. One whole frame is now drawn while loading. | `scene.js:1606`, `precompile()` |
| Two fixed pixel budgets | 5.6 megapixels while the view is a drawing, 3.4 on the walk, so sharpness never changes in steps. | `scene.js:1842` |
| A number for blinking | `tools/flicker.mjs` compares each frame with the average of its two neighbours. With a step of zero it is a stillness test that has to read 0.000. | `tools/flicker.mjs` |
| A reel made of stills | For each frame: place the scroll, let the page draw, take a still. Slow, and it comes out smooth however busy the machine is. | `tools/walk_offline.mjs` |
| Options behind URL switches | `?type=`, `?loader=`, `?hero=draw`, `?fill=`, `?light=`. The page without a switch is what I picked. | `hero-options.js`, `light-options.js` |
