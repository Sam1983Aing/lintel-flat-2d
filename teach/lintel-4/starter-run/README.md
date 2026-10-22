# The starter prompt, run once by a stranger

12 October 2026. Before Sam posts the starter prompt (step 1 of `../03-prompt-ladder.md`), it was run once the way someone who found it under his post would run it: a fresh session, an empty folder, nothing from this project.

## How the test was set up

- A separate agent (Opus 5.5), started with no knowledge of Lintel. Its folder was empty and outside this project.
- It was told to work only in that folder, to read nothing outside it, and to use no skills, memory or project notes. A stranger has none of Sam's.
- The brackets were filled in the plainest way: a house, four rooms (entrance hall, living room, kitchen, courtyard), "a house that costs millions". Same subject as Lintel on purpose, so the result can stand next to it.
- Whatever came back is kept here as it came. Nothing was fixed by hand.

One thing this test cannot remove: the agent ran on Sam's machine, so it had the same tools a session here has (node, ffmpeg, Chrome). It did not have his skills or his notes.

## The prompt, exactly as sent

> I want to build a scroll-driven landing page for a house.
>
> The idea: the page opens on a flat floor plan, like a sheet an architect prints. Black ink on paper, room names, dimensions. Nothing looks 3D. When the visitor scrolls, the walls rise out of the drawing, the camera comes down to the front door and walks through the entrance hall, the living room, the kitchen and the courtyard at eye height. Each room stays a line drawing until the camera gets there, then the real materials sweep across it.
>
> What I care about:
> - The floor plan is not a picture. It is the real 3D model, cut at about 1.2 m and seen from straight above through a very long lens. The drawing and the building are the same thing.
> - The camera travels deep into the space, room after room. It does not orbit the building from outside.
> - It should feel like a house that costs millions: big rooms, real furniture, late afternoon light.
> - three.js, GSAP ScrollTrigger and Lenis, plain files, no build step. Free CC0 materials for the textures.
>
> Before you write any code, propose the layout of the building with sizes I can picture, and the camera path stop by stop. Give me two or three directions to choose from and wait for my answer. Then build in checkpoints. First checkpoint only: the plan sheet, the walls rising, and the walk to the first room. Record it and show me before you go further.

## What came back

**Turn 1, about 5 minutes, no code.** Three layouts with sizes ("one half of a tennis court", "a small car"), a camera path stop by stop, which one it would pick and why, three questions, and then it stopped. Word for word in `01-first-reply.md`.

**The answer it got.** "A. The palette is right. Invent a name and a place." Its own recommendation and nothing else, so the result shows the prompt and not somebody steering.

**Turn 2, about 50 minutes, 74 tool calls.** Checkpoint 1 and only checkpoint 1, as the prompt asks: the plan sheet (the real model, cut at 1.2 m, a 2 degree lens from 1,719 m up), the cut rising, the forecourt as a line drawing, the door opening, and limestone, oak and plaster sweeping across the hall while the living room ahead stays a drawing. It recorded itself on desktop and phone, listed where it fell short, and stopped again. Word for word in `02-second-reply.md`. Everything it made is in `result/` (45 MB, 9 MB of that is textures it fetched from Poly Haven).

- One sheet of its stills: `checkpoint-1-sheet.jpg`
- Its clips: `result/recordings/checkpoint-1-desktop.mp4`, `result/recordings/checkpoint-1-phone.mp4` (34 seconds each)
- To open it: start the `starter-run` server from the Browser pane (it is in `.claude/launch.json`), or `cd result && python3 -m http.server 8231`. Then http://localhost:8231

## Verdict

The prompt holds. Nothing in it needed fixing. A stranger gets the idea working in one sitting: the drawing really is the building, the camera goes in and does not orbit, and the materials arrive with the camera.

What it does not get is Lintel. Four stops, one room with materials, furniture made of simple shapes, a house nobody has walked through and said "that's a four" about. That gap is the honest answer to "single prompt or chaining?", and it is on screen: this sheet next to `001 Lintel/recordings/lintel4-before-after.jpg`.

## What I checked and what I did not

- I looked at its seven stills and read its report. Later the same day I loaded the page in a headless Chrome and scrolled to the end: no console errors, no failed requests, the sheet at the top and the hall with its materials at the end. I did not re-measure its frame rate. The 60 frames a second is the agent's own claim.
- Its clips are stepped frame by frame, so they show the motion and not the speed of a real visit.

## Usage, measured (the only number we have)

The harness counted about 83 thousand tokens for turn 1 and about 407 thousand for turn 2. I am not sure whether the second figure includes the first. Either way it is for this one checkpoint by one agent, not for Lintel. Nobody measured Lintel's 70 prompts.
