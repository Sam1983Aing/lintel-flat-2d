# Lintel: a prompt ladder

This is a ladder to build something of your own in the same spirit. It is not a copy of mine, and it will not give you my page. Lintel took about 70 prompts across six sessions and two weeks (26 September to 9 October 2026), and four full iterations. Most of those prompts were me reacting to what I saw. So the ladder gives you the first prompt I would start with today, and then the six asks that moved the page the most, in the order they happened. Swap the parts in `[brackets]` for your own subject.

Built inside Claude Code with Opus 5.5, thinking set to extra high, on the Max 5x plan. The page is three.js, GSAP ScrollTrigger and Lenis, plain files with no build step. Textures are free CC0 scans from Poly Haven. Everything you see is geometry made in code. No Blender on this one.

---

### Step 1. The starter prompt

**Prompt**
> I want to build a scroll-driven landing page for [an architecture studio, a house, a hotel, your subject].
>
> The idea: the page opens on a flat floor plan, like a sheet an architect prints. Black ink on paper, room names, dimensions. Nothing looks 3D. When the visitor scrolls, the walls rise out of the drawing, the camera comes down to the front door and walks through [the rooms you want, in order] at eye height. Each room stays a line drawing until the camera gets there, then the real materials sweep across it.
>
> What I care about:
> - The floor plan is not a picture. It is the real 3D model, cut at about 1.2 m and seen from straight above through a very long lens. The drawing and the building are the same thing.
> - The camera travels deep into the space, room after room. It does not orbit the building from outside.
> - It should feel like [a house that costs millions, your level of ambition]: big rooms, real furniture, late afternoon light.
> - three.js, GSAP ScrollTrigger and Lenis, plain files, no build step. Free CC0 materials for the textures.
>
> Before you write any code, propose the layout of the building with sizes I can picture, and the camera path stop by stop. Give me two or three directions to choose from and wait for my answer. Then build in checkpoints. First checkpoint only: the plan sheet, the walls rising, and the walk to the first room. Record it and show me before you go further.

**What this step teaches:** say the feeling and the one rule that makes the trick honest (the plan is the model), then ask for choices before code. The last paragraph matters as much as the idea. Without it you get a finished page you did not choose.
**What I actually said:** my real start was not this prompt. It was a 57 second video of an old Medal of Honor site: "It feels like an illustration, like in 2D, and then as we scroll into it we see the element is kind of 3D. I want you to analyze the short video and think about how we can reproduce it." The floor plan came four days later, after three other concepts: Lintel has more potential as a floor plan you walk into, "in the living room you have the flat view on top with all the dimensions, but as we scroll we can see it." And the line about choices is there because I had to stop it once: "Wait, you're going too fast. You didn't propose options I can choose from."
**Skill in play:** cinematic-landing-page for the first build. Not sure which others ran in that first session, ask Sam.

### Step 2. Make it worth walking through

**Prompt**
> The layout is too modest. Make it feel like [a premium version of your subject]. Don't be scared of big spacious rooms. And I can't picture the numbers, so give me every size with a comparison from everyday life.

**What this step teaches:** the first proposal is always sensible and small. A tour needs rooms you want to stand in. And floor areas mean nothing to most people until they are translated.
**What I actually said:** "Make sure it feels like a premium house, like one that costs millions. Don't be scared to have big spacious rooms... like a celebrity house that we see in Hollywood."
**Skill in play:** none

### Step 3. Travel into it, don't circle it

**Prompt**
> Right now the camera mostly looks at [the subject] from outside. I want to feel the depth. Move the camera along the Z axis, deep into the space, with things passing close on both sides.

**What this step teaches:** the reveal from flat to 3D is only half of it. The feeling of being inside comes from travelling through layers of space.
**What I actually said:** about the first build of this whole exploration, which had it, against three that did not: "At first it looks like a simple painting, and when we start scrolling we can really feel the 3D, and you move along the Z axis, so there is more depth to it."
**Skill in play:** none

### Step 4. The scan follows the camera

**Prompt**
> When I turn the camera, the next space is already finished. It should never be. Everything ahead stays a drawing until the camera gets there, and the materials arrive as I walk. Show me [three] ways the drawing could turn into material, as recorded demos, before you pick one.

**What this step teaches:** the page has one promise (a drawing becomes a building) and every room has to keep it. One room that is already built when you arrive breaks the spell for all of them.
**What I actually said:** "We should always have the scanning effect as we follow the camera, so the rest of the scene should not be fully displayed yet. It only moves with the camera. As we walk through the house it's scanning along the way, that makes the effect premium."
**Skill in play:** demo-options (the fill, the light and the hero were each chosen from recorded options)

### Step 5. Review it with scores

**Prompt**
> Here are screenshots with my notes, room by room. I'm giving each one a score out of ten. [Room]: [score], because [what feels weak]. For everything I asked for, reach at least eight out of ten.

**What this step teaches:** a score turns taste into a target. "Make it better" gets you a little better. "This is a four, I want an eight" gets you a different room.
**What I actually said:** about the bedroom, "It feels a little bit weak, I would give it a four. Make it premium, a high-end bedroom." About the garden, "That's a two out of ten." And the bar: "reach a score of at least eight out of ten."
**Skill in play:** none. The frozen copy of each version before a round (`v1/`, `v2/`, `v3/`) is what makes the before and after possible.

### Step 6. Let someone else score it, and measure what moves

**Prompt**
> Don't score your own work. Have a separate reviewer, strict, who only gets my words and the stills, score every part. Report its numbers as they are. For anything about motion, like blinking, give it frames and a number, not a still.

**What this step teaches:** the builder always thinks it is fixed. An outside reviewer on stills caught the same claim failing two rounds in a row. And blinking cannot be judged from a screenshot, so it had to be counted.
**What I actually said:** "As we start scrolling you can see it starts blinking, because there's stuff happening between the flat surface and the 3D world. That should definitely be gone." Then, to start the last iteration: "I want you to reach at least eight out of ten for all categories."
**Skill in play:** none. Seven rounds of outside review on the last day, from 7.5 to 8.

### Step 7. Give it a beginning and an end

**Prompt**
> I want the page to open and close on [one physical gesture from your subject's world]. For mine it is the roll of paper an architect carries. Use the loader we have, then [the gesture] reveals the first screen.

**What this step teaches:** one object from the subject's own world, used at both ends, makes the page feel designed and not assembled.
**What I actually said:** "You know when the architect has a plan d'architecte. The paper, sometimes they roll it into a tube. So the transition to the hero is like the roll of paper opening up, and then we see the sketch of the house." And later: "I wanted it after the loader. When the loader ends, the paper can roll out."
**Skill in play:** none

---

What the ladder leaves out: the wrong turns. A first version that orbited the house from outside. A painted style I did not like. A phone that froze for twelve seconds in the bathroom. Those are in `teach/journal.md` and they are most of the lesson.

---

## A short answer for the comments

Drafted 12 Oct for the people asking "what's the prompt" under the posts. Sam has not posted it yet, and it is his to reword.

> Thanks everyone. A few of you asked for the prompt. Honest answer: there isn't one.
>
> This took about 70 prompts over two weeks and four full versions. It started with a 57 second video of an old game site I liked. The floor plan idea only showed up on day four.
>
> It's not a single detailed prompt and not really a chain either. It's a conversation with checkpoints. I ask for options, pick one, watch a recording, give notes with a score out of ten, and go again.
>
> I'll post the prompt I'd start with today. It won't give you my page. It gets you a first version of the idea, and then the real work starts.

