# Turn 2: the first checkpoint, as it came back

12 October 2026. The agent was given one line ("A. The palette is right. Invent a name and a place.") and worked for about 50 minutes, 74 tool calls. This is its reply, word for word. The paths it gives pointed into its temporary folder. Everything it made is copied to `result/` next to this file, so read `result/recordings/...` wherever it says `recordings/...`.

Stills on one sheet: `checkpoint-1-sheet.jpg`. Clips: `result/recordings/checkpoint-1-desktop.mp4` and `checkpoint-1-phone.mp4` (34 seconds each).

---

Checkpoint 1 is built and recorded. I have stopped here as you asked.

**Watch these first**

- Desktop, 34 s: `recordings/checkpoint-1-desktop.mp4`
- Phone, 34 s: `recordings/checkpoint-1-phone.mp4`
- Seven stills, one per moment: `recordings/stills/`

The house is called Casa Larga, in Coll de Marès, Mallorca. I made the place name up and did not check whether a real one exists.

**What is in it**

1. **The sheet.** The plan is the model, cut by a clipping plane at 1.2 m. The camera hangs 1,719 m above it with a 2 degree lens, so wall tops shift by less than half a pixel and nothing reads as 3D. Room names, dimension strings, door swings and the title block lie on the floor and ground of the model.
2. **The lift.** The cut rises and the camera tips straight back over the front of the house. It does not turn. Walls come up with black tops, like a model with its lid off.
3. **The forecourt.** Eye height, 8 m from the door, everything still ink.
4. **The door and the hall.** The oak door pivots open, you step in, and limestone, oak and plaster sweep down the hall away from you. The checkpoint ends 0.9 m inside the door, looking through the hall at the living room, which is still a drawing.

**What I checked**

- Console is clean at both sizes in headless Chrome 155.
- With Lenis and ScrollTrigger live, the camera lands where the scroll position says it should.
- A full scroll down and up averaged 60 fps at 1600 x 900 at 2x on this Mac (M1 Max), with no frame over 34 ms.
- Not tested: Safari, Firefox, a real phone, a slower machine.
- The videos are captured frame by frame at exact scroll positions. They show the motion at an even pace, not this machine's live frame rate.

**Where it is short of the brief, and choices you may want to reverse**

- The roofs close earlier than I promised. The low roofs shut while the camera is still about 25 m up, the living room roof at about 4 m. It is not literally "as you reach the door".
- The hall furniture (console, bench, vase, jar) is modelled by me from simple shapes. No downloaded furniture yet. Everything in the other rooms is a placeholder box, fine as line drawing, not fine once those rooms get materials.
- Bounced light in the hall is faked with two small lamps and a corner-darkening shader. Nothing is baked.
- The painting is generated in a canvas. The travertine console borrows the plaster texture with a warmer tint.
- On a phone the hall frame is narrow: mostly floor, the jar and the doorway. The text on the plan is too small to read there.
- The sun sits south-south-west at 17 degrees so it reaches down the hall. If you want it further west, the hall gets less of it.
- I added a lens / height / cut readout top right, a stop list on the right and a caption tag per stop. All three come out easily.
- The house is 18.8 m wide with the bedroom wing, 41.4 m long.

**To open it yourself**

```
cd result
python3 -m http.server 8231
```

Then go to http://localhost:8231. I stopped my own server, nothing is left running. `node tools/record.mjs --reel recordings/new.mp4 --w 1600 --h 900 --dpr 2` records again with the server up.

**What I downloaded**

Twelve CC0 texture maps from Poly Haven, 9.2 MB, in `assets/textures/`: `marble_01` (the limestone floor), `plastered_wall`, `white_oak_veneer`, `brown_leather`. I also pulled a first oak and some 1k previews to compare, and deleted them. three.js 0.170.0, GSAP 3.12.5 and Lenis 1.1.14 load from jsDelivr, the two fonts from Google Fonts. Nothing was installed.

**Before I go on**

Tell me what to change in these four stops. The three things I would look at hardest are the pace of the lift, whether the faint grey wash on upright faces in the drawing is welcome or should go back to pure line, and whether the hall is at the level you want for the rest of the house. Next would be the walk down the hall and the living room.
