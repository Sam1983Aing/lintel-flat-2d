# Lintel · Casa Serra, iteration 3: how it was built

**The idea:** a concept page for an architecture studio. It opens on a floor plan drawn in ink on paper. You scroll, the sheet turns out to have height, and you walk through the house room by room while each room turns from drawing into real material around you. At the end a roll of architect's paper opens across the built house and leaves you on the drawing you started with.

**Built with:** three.js r160 (the classic script build), GSAP 3.13 with ScrollTrigger, Lenis 1.1.14, and the shared scroll engine of this folder (`shared/fx-core.js`, `fx-post.js`, `fx-paint.js`, `fx-experience.js`). Textures and skies are Poly Haven CC0 scans. There is no Blender model. The whole house is generated in code from one table of rooms. Display face: Saira Stencil One.

**Where the effect comes from:** a screen recording of the Medal of Honor: Above and Beyond site (`flat 3D.mp4` in this folder), which looks like a flat illustration until you scroll.

**Time and rounds:** iteration 3 is the polish round. It ran from 1 to 9 October 2026 in four stretches, on top of iteration 1 (26 September, a house you orbit) and iteration 2 (30 September, the plan you walk into). The last stretch was one long review pass with three passes of fixes and two outside reviews.

**This pack covers iteration 3 only.** Code references point at the frozen copy in `001 Lintel/v3/`.

## The page, section by section

| # | Section | What you see | Driven by | Technique(s) |
|---|---|---|---|---|
| 1 | The sheet | A ground floor plan in ink, straight from above, with a stencil headline. Nothing moves. | load, then a rest | **The plan is a real cut** ★, stillness rules |
| 2 | The lens opens | The sheet tilts. Walls grow out of it. | scroll scrub | Long lens to wide lens (3° to 36°), the cut plane rising, hatch that fades before it combs |
| 3 | Approach and front door | A low glide over the forecourt. The door swings open and the land outside turns real. | scrub, rest at the door | First reveal wave, one whole frame drawn under the loader |
| 4 | 01 The entrance | Hanging globes, a runner, a mirror | scrub, rest | **The scan that follows the camera** ★, staging that arrives with the materials |
| 5 | 02 The living room | The roof lifts, the camera rises to a plan of the room with its dimensions, then drops in | scrub, two rests | The scan ★, plan figures in the air that leave as the materials arrive |
| 6 | 03 Kitchen and dining | Through the wide opening and along the table | scrub, rest | The scan ★, the second sun capped |
| 7 | 04 The olive patio | Out through the sliding door. The patio is scanned as the camera turns to it. | scrub, two rests | The scan ★ starting at the sliding door, focus that belongs to each stop |
| 8 | 05 The glass gallery | Twenty four metres straight ahead. The scan runs in front of the lens the whole way. | scrub, a rest at each end | The scan ★ in two parts |
| 9 | 06 The master suite | The bed wall, then the dressing room | scrub, rest | Soft bedding shapes, small objects joining the depth pass |
| 10 | The bath | One view across the room's diagonal, the tub against the garden glass | scrub, rest | A real mirror reflection, a room laid out for the lens |
| 11 | 07 The private garden | Fire bowl up close, water and the old olive, the sea and a village on the far ridge | scrub, rest | Near, middle and far |
| 12 | The lift | The camera rises and turns back to the top view. The house stays built. | scrub | The opening move in reverse |
| 13 | The roll | A roll of paper comes in, rests beside the house, then opens across it | scrub, during a long rest | **The roll of paper** ★ |
| 14 | Finale | The first sheet again, then "Every building starts flat. Ours don't stay that way." and the Start a project button | scrub | The last frame is the first frame |

The whole walk is lit by **The light is one number** ★. Warm Afternoon is the default. Golden Hour and The Afternoon Passes are behind `?light=golden` and `?light=passes`.

★ = signature move. It has a card in `02-techniques.md` and a demo in `demos/`.

## How it got here

| When | What changed | Where the before lives |
|---|---|---|
| 26 Sep | Iteration 1. A house you orbit from outside. I said the orbiting pages felt less immersive than the one that travels deep into the scene. | `001 Lintel/v1/` |
| 30 Sep | Iteration 2. The plan you walk into, built in four checkpoints. I called it "a really strong iteration" and asked for polish, not a new direction. | `001 Lintel/v2/`, reels `recordings/lintel2-*` |
| 1 and 2 Oct | Iteration 3 starts. The sheet stops blinking (measured at zero change at rest), roofs stop popping on the way down, materials get fixed up close. | `recordings/lintel3-materials-before-after.jpg` |
| 5 and 6 Oct | "If I just see a plan, it feels weak." Font, loader, fill and drawn opening built as options. I picked Stencil and Laid. The house gets staged. The ending returns to the ink plan. | `demo/hero/`, `demo/fill/`, `demo/picks/` |
| 6 Oct | Three light looks on one table. The sun turns out to be in the scene twice. | `demo/light/` |
| 9 Oct, morning | My review: ten screenshots, seven notes, "at least eight out of ten" on each. | `001 Lintel/v3a/`, `teach/shots/2026-10-09-sam/` and `-before/` |
| 9 Oct | Three passes. Walls get lids, the scan follows the camera, bedroom, bath and garden are restaged, the roll of paper ends the page. An outside reviewer scores it 6.8, then 7.4. | `teach/reviews/`, `teach/shots/2026-10-09-after-pass1/`, `-after-pass2/`, `-after-final/` |
| 9 Oct, afternoon | "Really good now compared to the previous version. Still not perfect, but we're getting there." Iteration 3 is frozen and a brief starts iteration 4. | `001 Lintel/v3/`, reels `recordings/lintel3-review-2026-10-09-*` |

## Open it

```bash
python3 tools/serve.py
```

Then:

- Iteration 3: http://127.0.0.1:8014/001%20Lintel/v3/
- As reviewed on the morning of 9 October: http://127.0.0.1:8014/001%20Lintel/v3a/
- Iteration 2: http://127.0.0.1:8014/001%20Lintel/v2/
- The demos: http://127.0.0.1:8014/teach/lintel-3/demos/section-cut.html (and `scan-follows-camera.html`, `paper-roll.html`, `one-number-light.html`). They also open by double-click.

## The rest of the pack

- `01-process.md`: the story of iteration 3, with the dead ends
- `02-techniques.md`: a card for each ★ and a line for each supporting move
- `04-video-plan.md`: an episode outline
- `demos/`: one small standalone page per ★
