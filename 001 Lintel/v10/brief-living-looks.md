# Brief: three looks for the living room (Lintel, iteration 5)

Written 14 Oct 2026 at the end of a long session, to start a fresh one. Read this first, then `../CLAUDE.md`, `~/.claude/CLAUDE.md`, and the memory index.

## The question

Sam's words: "the concept of 2D to 3D is super premium, but the result doesn't really match it... sometimes it feels a little bit baked in and the render is not that great." He asked whether building every material in Three.js code, with no Poly Haven scans, would look better than what we have.

My answer in the last session was: probably not on its own. The baked-in feeling comes mostly from light and reflection, not from where the textures come from:
- every shiny surface indoors reflects the outdoor sky (`scene.environment = sk.env`, scene.js ~949)
- no light bounces off the floor and walls
- the materials written in code are colour only, so they are flat under light
- many objects are boxes with tiny rounded edges

That is a guess until we see it. So: build three versions of the living room and compare them side by side. **Sam decides after watching. Do not pick for him.**

## The three versions

All three behind one URL switch, `?look=now | code | light`. With no switch the page must be exactly as it is now (`now`).

**1. Now** (`?look=now`, the default)
The living room as it is at the end of 14 Oct: Poly Haven scans for concrete, plaster, oak floor, wool, linen, leather and bark, and code for the stone table, the planter, the fire, the paintings. It is frozen as `v5a/`. Do not change it.

**2. All code** (`?look=code`)
Every scanned texture in the living room replaced by a material written in code. **Sam's ask: the best texture and the best realism possible in Three.js.** He thinks Poly Haven "can be good but it's lacking something". This version has to be our best effort, not a straw man. Lighting stays as it is now, so the comparison isolates materials. Surfaces to cover, at least:
- the fireplace breast (board-marked concrete, `concretePlain`), the plaster walls and ceiling (`plaster`, `ceiling`)
- the oak floor (`oak`): planks with their own tone, grain and rays, bevelled joints, satin finish with worn paths
- the sofa's boucle (`sofaWool`), the linen cushions (`linenW`, `rust`, `sage`, `ochre`, `charcoal`), the dark rug (`rugDark`)
- the leather lounge chairs (`leather`), the olive's bark (`barkIn`) and leaves (`leafCard`, the sprig canvas), the firewood (`logBark`, `logEnd`)

What "best possible" should mean, from what we learned this week:
- every code material gets real relief: a height from its own pattern, turned into a normal with `dFdx`/`dFdy`, so light grazes it
- roughness that varies (worn, polished, dusty), never one value
- fabrics: woven or looped structure at the right scale, plus sheen (`MeshPhysicalMaterial` has `sheen`, check `drawable()` accepts it), seams and piping where they belong
- filter fine patterns by `fwidth()` so nothing shimmers or blinks while scrolling (blinking has been our most frequent complaint)
- first versions of a rule look like the rule (the marble took three tries, the charred wall two): look at each one closely at Sam's window size before moving on

**3. Lighting first** (`?look=light`)
The materials of Now, with the light fixed:
- the room reflects itself: one 360 capture of the living room (a CubeCamera, then PMREM) taken once, when the room has finished turning real, used as `envMap` for the living room's materials instead of the sky. Brass, glass, the black vase, the stone table, the floor's sheen
- bounce light: a soft fill tinted by the floor and walls (a light probe from that same capture, or a hemisphere light), warmer where the sun lands
- contact shadows: soft dark patches under the sofa runs, the table, the planter, the chairs, where the screen space shading misses
- relief on the code materials already in the room (stone table, planter, fire surround)
- leaves: alpha to coverage or softened edges, and light through them when backlit
- optional, desktop only: a second, tighter shadow map around the room (the one sun map covers the whole site, so indoor shadows are soft). Shadows are rendered once and reused (`renderer.shadowMap.autoUpdate = false`, scene.js ~1953), so this costs memory, not frame time

The upgrades in 3 do not depend on the materials. If Sam likes 2, they can be added to it afterwards.

## How to build it

- Put all of it in one new file, `001 Lintel/look-options.js`, the way `facade-options.js` works (`window.LINTEL_FACADE` and its `materials()` hook in scene.js after the material table). Touch scene.js and staging.js only to add the hooks.
- Living room only: room `living`, plan rect `[9, 8, 21, 17]`, the sunken seating area `[12, 10.5, 18, 15]`. Other rooms must not change in any version.
- The 2D to 3D reveal must work the same in all three. `drawable()` (scene.js ~228) reveals by each pixel's position in the world, so code materials reveal fine. The paper hatching kinds `'concrete'`, `'timber'`, `'stone'` read the texture's UVs: a code material that takes their place needs its paper hatch in world coordinates, or `'none'`.
- Shared random numbers: everything in staging.js draws from one seeded list `R`, in order. Never add or remove an `R()` call in the living room or every object after it moves. New pieces bring their own `FX.rng(seed)`. A piece you remove still makes its calls into a batch nobody sees (see `Z` in the bedroom and bath blocks).
- Where things are:
  - scene.js: material table and code materials ~950 to 1110 (`surfaced()` at ~417, examples: `marbleNero`, `walnutZ`, `porcelain`, `pathSlab`, the charred `larch` with its normal patch), the living olive (search `tree(olive(IB`), leaf cards (`leafSets`, `M.leafCard`), high windows (`CLERE`), lights (`lampPool`), sun shadow (~1946)
  - staging.js: materials table at the top (`sofaWool`, `logBark`, `logEnd`...), the living block (`/* ================= living`), the sofa (`seatRun`, `pillow(..., firm)`), the fireplace (`flameSheet`), `pillowGeo`, `drape`
  - shared/fx-core.js: `FX.pbr` (~317, how a scan becomes a material), shared/fx-post.js (AO, bloom, ACES, DOF, grain)
  - the bath mirror and the garden water (`buildMirror`, `buildPool` in scene.js) show how to draw the room a second time, and how to let a picture appear only where the room is already real (blend on destination alpha)

## How to compare

1. Record first, with the demo-options scripts (`~/.claude/skills/demo-options/scripts/record.mjs`, `reel.mjs`): one scroll plan for all three, from the entrance into the living room, down into the seating area, holding at the living room's stop. Desktop and phone. Send "Now" first.
2. Stills at Sam's window, `--size 1728x992 --dpr 2` (`tools/review_stills.py --only 09,10,11`), plus close ups: the sofa and cushions, the fireplace and logs, the olive in its planter, the floor where the sun lands.
3. Numbers, measured, for each version:
   - download size (textures loaded)
   - frame time at 1728x992 DPR 2 during the scroll and at the hold, average and worst
   - time to the first frame of the living room (shader warm up)
   - the same on the phone preset
4. Optional: a separate agent scores the stills blind (memory: "Scores and outside review"). Report its numbers as they are.
5. One sheet with the three side by side (HTML, rendered with `tools/probe.mjs`, memory: "Captioned sheets via HTML"), and the reels. Then a short reply: what each version changed, the numbers, one line on which I would pick and why.

## Rules that still apply

- No em dashes, no semicolons in anything for Sam. Short plain sentences.
- Teachable build: keep `teach/journal.md`, `teach/session-log.md` (next entry 80), `teach/decisions.md` (next row 141). Before and after images in `teach/shots/`.
- Trust measurements over screenshots. The Browser pane cannot open `file://`.
- Commit or push only when asked. Nothing is published. The live page is unchanged.

## State at the end of 14 Oct

- Iteration 5 is still open. The working page = `v5a/`, frozen today before this work.
- Open: blink count measured on a busy machine (to re-measure), never checked on a real phone, the pool reflection's cost on phones not measured.
- Sam's latest living room notes are all in: sofa runs the full length, back cushions all leaning back, high windows on two sides meeting at a bronze corner post, fireplace breast to the ceiling (moved 20 cm north), sheet flames, detailed logs, painting higher, olive on one trunk in a basalt planter with soil and pebbles, vase centred with brass reeds. The look can change, the layout should not.
