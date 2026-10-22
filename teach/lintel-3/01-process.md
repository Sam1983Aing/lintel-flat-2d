# Lintel iteration 3: the process

This is the story of the polish round, 1 to 9 October 2026. Iteration 2 already had the idea working: a floor plan you walk into. Iteration 3 is where I tried to make it premium, and it is mostly a story about feedback. What I said, what came back, and what happened when my notes were read the wrong way.

Quotes are mine, from voice dictation, cleaned of the filler. "Claude" is Claude Code, which wrote all the code.

## Where it started

After the full walk of iteration 2 I say: "I think we have a really strong iteration. I like the visual, and I think we can polish it further and bring it to the next level." So no new direction. Iteration 2 gets frozen in `001 Lintel/v2/` with its own copy of the engine, so nothing I do later can change it.

My first polish notes are about the opening. The flat plan has "noise in certain areas, blinking super fast, it doesn't feel like a still static drawing". And on the way down into the house, "sometimes a room has a roof, sometimes black, sometimes white, it doesn't feel like a continuous motion". I want a blueprint with super clean lines, all the way until we enter the house.

## Round 1 (1 and 2 October): a sheet that holds still

Claude finds four separate causes for the blinking: film grain running on the paper, a gravel stipple computed per pixel, ink specks where trees met the edge detector, and the camera's own small drift. All four go while the view is a plan. Then it measures a three second recording of the resting sheet. Zero pixels change from frame to frame. Iteration 2 changed on every frame.

The roofs were a different thing. The plan is cut by a plane, and on the way down that plane swept up through the roof slabs. Inside a slab you see its hollow, which was drawn as solid ink. So black, then white. Now the cut waits under the ceilings until the camera is below every roof.

Then I say "go ahead with the materials up close" and get a before and after sheet against v2: sharp floor labels, a real olive in the living room, a denser crown on the patio olive, greener land.

At the end of the session I ask for a brief so the work can continue in a new chat. That brief (`001 Lintel/brief-iteration-3.md`) lists what is done, what is left, my rules, a map of the code and every trap that cost time.

## Round 2 (5 and 6 October): "if I just see a plan, it feels weak"

I open the page in my own Chrome and send a screenshot. "The concept of this turning into a 3D world is really good. I love the idea. So we need to make something very premium." Then I ask Claude to rate the flat hero out of ten.

It says 6. The idea and the headline carry it. The drawing loses the points: labels that collide with walls, a guest suite that reads "2 m²" because a wall hides the 7, walls that change weight along their length, three black cars as the darkest thing on the sheet.

I push further. "If I load the page and I just see that straight away, it feels weak. Just a boring page. Maybe I would not like to scroll." The loader has "too much stuff going on, three levels". The serif "needs to go", I want something more architectural, and I'm not sure about the orange.

What comes back is not a list. It is the real page with URL switches: five font and accent pairs (`?type=`), three loaders (`?loader=`), a hero that draws itself (`?hero=draw`), and reels of each next to what I had.

Then I walk the house and send ten screenshots. I love the move from outline to real texture, but the fill "feels like a big round circle is just growing". So the fill becomes three more options behind `?fill=`: Level, Section and Laid.

My picks: "It might not be my definite choice, so keep those options available. But for font and accent I would choose stencil. For loader, for the moment, I'm not sure, so don't add any loader for now. For fill, let's use laid."

Both of those were the options Claude had labelled as the wildcards. Not the ones it recommended.

The rest of my list in that round is about the house itself. Materials are "good but it feels like five everywhere, let's bring it to a ten". The decoration "feels very below average". Stage it like "a nice home staging that you want to sell a million dollar house". And the ending "feels disconnected from the beginning", so it should turn back into the ink plan. All of that gets built: a staging file, tinted materials, and a return to the first sheet that is the opening run backwards.

## Round 3 (6 October): the light, in two words

I ask "what is next" and get the seven things left on the brief, with one argument for changing their order: do the light before more staging, because most of the weak spots in the rooms are glare, and judging rooms under a light that is about to change is wasted work.

I answer "yes proceed".

First Claude records the page as it is, on one fixed walk from the dining table to the garden. Then it builds three looks on that same walk: Warm Afternoon, Golden Hour, The Afternoon Passes (the sun drops as you scroll). They are cheap to build because they all come from one table. A look is only a time of day.

The most useful thing in that reply is something I never asked for. The dining room floor washed out white and nothing fixed it, because the sun was in the scene twice. Once as the light that casts shadows, once as the bright spot in the sky photo that lights everything and that no wall can shade.

I have not picked a look yet.

## Round 4 (9 October): ten screenshots and "at least eight"

This is the long one. I walk the page and dictate over ten screenshots. Seven notes:

1. The plan: "some lines are thinner, some walls are wider, I think it's hiding something underneath." And when I start scrolling "it starts blinking". "It should feel flat, like a flat surface, when we scroll and then open up into a 3D scene."
2. The scan: "We should always have the scanning effect as we follow the camera, so the rest of the scene should not be fully displayed yet."
3. The gallery: "everything is displayed already, and you can see some rough edges blinking on the top right."
4. The master bedroom: "I would give it a four. Make it premium. Right now it feels there's stuff floating."
5. The bath: "we don't really see much of the room. We see the bath and the window, that's it."
6. The garden: "Empty. That's a two out of ten."
7. The ending. An idea: the architect's plan rolled in a tube. "The roll of paper opening up, and then we see the sketch of the house."

And the bar: "This will be a long one. For all the feedback where I asked for something specific, reach a score of at least eight out of ten."

Before any code the reviewed version is frozen as `001 Lintel/v3a/` and a still is taken at 28 points of the walk.

**The note I thought was the smallest had a real bug behind it.** My guess that the walls were "hiding something underneath" was right. A plan fills every cut wall with solid ink. The page had no such fill. Its ink was whatever the camera happened to see inside the hollow walls, so it changed the moment the view tilted. That change was the blinking. Every wall now carries a flat lid under the cut.

**The scan note reversed a rule I never gave.** On 5 October Claude had read my notes as "a window never shows a drawing" and made the patio and the gallery turn real early, behind the living room's glass. It had even written "my reading, to check with him" next to it. It never checked. The new rule is mine: beside you and behind you is real, everything ahead stays a drawing until you get there, even through glass.

**"Floating" was two things.** Some of it was design (a nightstand hung on the wall, lamps on hair-thin rods). The rest was rendering: small objects had no contact shadow because they were kept out of a depth pass. And on the way Claude found that every cushion and throw in the house was grey. The colours were in the code and never reached the screen.

**The bath** was laid out again for one view across its diagonal. **The garden** got three distances: a fire bowl near the lens, water and the old olive in the middle, the sea and a village far off.

**The roll of paper** was built as the edge of a wipe, not as an overlay. More on that in the technique card.

### Who gives the score

I had asked for eights. Claude did not score its own work. It gave another agent my words, the before stills and the after stills, and nothing else. Round one: 3.7 on average before, 6.8 after. "Every one of the seven items is clearly better than before. None of them is at 8 yet."

The best sentence in that review: "the same few faults repeat from room to room... fix those as systems and four or five of the seven items move up together." Stiff bedding, blown-out lamp shades, plan figures drifting through finished rooms, titles you can't read on dark ground.

So the second pass fixes systems, not rooms. Round two: 7.4. Still no eight. And the reviewer checked Claude's list of claims against the stills. Four did not hold. The best catch: "Bath mirror as a real reflection: not visible." It worked from close up, where it had been debugged. From the door, where the page actually stops, it showed blank paper.

A third pass followed and was not scored that day.

### What I said at the end

"It looks really good now compared to the previous version. It fixed a lot of issues. Still not perfect, but we're getting there. We have some blinking effects sometimes, but less than before. Especially in the beginning, where everything was blinking and rough edges, now a lot of them disappear."

Then: "Give me a brief so I start v4 on a new chat session." Iteration 3 is frozen in `001 Lintel/v3/`.

## Dead ends

- **The growing circle.** The first room reveal spread from one point as a sphere. I said it "feels like a big round circle is just growing". Claude then built the drawn hero with the same circle, caught it before I saw it, and changed it.
- **"A window never shows a drawing."** A rule Claude wrote from my notes, labelled as its own reading, and never confirmed. It cost a whole round of the scan going the wrong way.
- **Walls inked by what the camera sees inside them.** It held up from straight above through iteration 2 and most of iteration 3, and fell apart the moment the view tilted.
- **The tilted mirror camera.** The textbook way to keep the wall behind a mirror out of its reflection. From the angle of the stop it made the engine throw the whole room away. Replaced by a second cut plane that is always there and only moves during the mirror's pass.
- **Titles moved off their markers.** Three of them landed on a painting, a pendant and a track light. They went back.
- **The village half a kilometre away.** It was simply hidden by the edge of the hill the garden sits on. Only land two kilometres off or more shows from there.
- **Filming in real time next to a Blender render.** Another session had the GPU. The fix was a recorder that takes one still per frame and does not care how busy the machine is.

## How I work

- **A brief at the end of every session, a new chat from the brief.** The brief is the memory. It forces a count of what is done, what is open and what I never actually decided.
- **Every version in its own folder**, with its own copy of the engine. "Which version is this one?" always has a one line answer, and "compared to the previous version" is one click.
- **Options as demos, not as text.** Fonts, loaders, fills and light looks were all built into the real page behind a URL switch and recorded on the same walk as what I had (the `demo-options` skill). I picked the wildcards twice. I would not have picked them from a written list.
- **Scores, not solutions.** "A four." "A two." "At least eight." That turns taste into a target the AI can work toward and check itself against.
- **An outside reviewer.** The builder cannot grade the build. Give someone else the client's words and the pictures, and ask for the faults that repeat.
- **Measure before fixing.** Blinking got a number (`tools/flicker.mjs`), and a page at rest has to read exactly zero. Half of the "3D noise" turned out to be film grain on a sheet of paper.
- **A journal while it happens** (the `teachable-build` skill). `teach/journal.md`, `teach/session-log.md` and `teach/decisions.md` are where this page of text came from.

## What carries over

1. **Draw the thing you mean.** An effect that works because of how the camera happens to see it is a bug waiting for the camera to move.
2. **Find the one number.** A room's reveal is one number. The light is one number. Once it is, three options are three values and not three builds, and running it backwards is free.
3. **Write down which rules are the client's and which are your reading.** Then go and check the second kind.
4. **Fix the fault that repeats, not the room it showed up in.**
5. **Check a view from where the visitor stands**, not from where it is easy to debug.
6. **"Less than before" is a real answer.** I did not need it perfect to know the direction was right, and saying where it still blinks is what makes the next pass short.

## Still open when iteration 3 closed

- Some blinking in the middle of the plan's opening, where thin ink edges break into dots.
- Which loader, and whether the hero that draws itself becomes the opening.
- An eight. Nothing had reached it yet, by the outside reviewer's count or by Claude's own (7.3).

Three things were Claude's readings of my notes when iteration 3 closed, and the brief for iteration 4 listed them as such. I confirmed all three at the start of iteration 4 ("yes to all three"): the roll of paper belongs at the end of the scroll, the garden is scanned through the glass while you stand in the bath, and Warm Afternoon is the default light.
