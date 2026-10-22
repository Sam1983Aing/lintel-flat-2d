# Brief: Lintel, share the demo as it is

## Start here (for a new session)
You are in `014 Flat 3D/001 Lintel/`. This session does **not** build or polish the page. It takes the demo as it stands today and makes it shareable, fast, because a post about it took off.

Three things to deliver, in this order:
1. **A live link on GitHub**, so people can scroll it themselves.
2. **A starter prompt** people can use to try something in the same spirit, posted with an honest note on how the page was really made.
3. **A quick YouTube video** about the demo and how it got here.

Sam, 12 Oct 2026, in his words: **"I won't wait until my landing page is polished. Maybe we can create a YouTube video out of it. A quick one. Maybe share a live link on GitHub. Maybe a starter prompt... I think it's good enough to share because even though it's not polished, almost more than 500 likes, a lot of reposts, a lot of comments. It was unexpected, never happened to me before when I shared a preliminary demo. We should ride the wave."**

Speed matters more than completeness here. The wave is a few days long.

## What happened
- 11 Oct: Sam posted a 1 minute 47 clip of the walk (`recordings/lintel4-share-demo.mp4`) on LinkedIn, Threads and his community Slack, with a few lines in his own words: "At first it looks like a flat floor plan of a house. Until you scroll. The house gets built in real time and you walk through all of it. Work in progress, built with Opus 5.5."
- 12 Oct, about 8 hours later. Threads (`prompting_lab`): 16.6K views, 321 likes, 25 comments, 22 reposts, 131 shares. LinkedIn: 3,829 impressions, 120 likes, 17 comments, 6 reposts. Far above his normal numbers.
- What people asked, in their words: "How did you do it?", "Any prompt to share to get started?", "Is that a single detailed prompt or a prompt chaining approach?", "What is your token usage looking like these days?", "Can you guide how to do it?", and whether there is an online demo to try.
- 14 hours in: Threads 39.2K views, 537 likes, 226 shares. LinkedIn 22,230 impressions, 545 likes, 45 comments, 36 reposts. **X: 90 views, 2 likes.** Same clip, same words. The clip opened on four seconds of nearly blank paper, which is the wrong first frame for X's autoplay. A 35 second cut that opens on the roll laying the plan is in `recordings/lintel4-share-x-35s.mp4`.
- Sam put a music track on the posted clip himself (the files in `recordings/` are silent). A commenter on LinkedIn: "What makes it even better for me is the track you've used, you need a way to try and keep that in there!" Sam: the pick was "kind of random, but at the end it matches the demo well". Ask him which track it is and whether he has the right to use it in the video. Sound on the live page is not in scope unless he asks.
- Other comments worth keeping for the video: "I always get really confused looking at 2D floor plans and nod away saying, yes, looks nice" (the practical reason the idea lands), and a frontend lead asking how it behaves on mid range phones (Sam's answer: an experiment for fun, mostly desktop so far).
- **How Sam describes his own process, in a message to someone who asked where his prompts come from (12 Oct).** Use these words in the video, they are his: "I don't really use any detailed prompt. I always start the same way. I have an idea and ask the agent to create three to five iterations of that idea, and I inspect them and I refine them if I see some potential. Just using my own judgment and my own taste." And why he builds: "I did not specifically build a demo for architecture. I just like to experiment and see what can be built with AI in a creative way. Now that AI can build almost anything you can think of, I always try to think outside the box and create stuff that we don't see everywhere on social media." And where this one came from: "This demo was kind of inspired by this latest post where I incorporated a full 3D scene inside a postcard": https://www.linkedin.com/feed/update/urn:li:activity:7514174569985949696/ (the postcard concept is `003 Hotel Kyma` in this folder).
- His own score for the page: **"a good seven point five for me, because we didn't polish the details, the content, the texture. But the concept is there. It's a strong concept."** And: "we fixed all the blinking."

## Where the page stands
| Thing | State |
|---|---|
| The working files (`index.html`, `scene.js`, `staging.js`, `light-options.js`, `hero-options.js`, `theme.css`, plus `../shared/`) | Iteration 4 as it ended on 9 Oct: the build an outside reviewer scored 8 in all seven parts (frozen as `v4c/`), plus six small cleanups made after the score. **This is the version to publish.** Do not change how it looks. |
| `v1/`, `v2/`, `v3a/`, `v3/`, `v4a/`, `v4b/`, `v4c/` | Frozen copies of every iteration, each runs at `http://localhost:8014/001%20Lintel/<name>/`. Never edit them. They are the "before" for the video. |
| `recordings/` | Every clip sent to Sam. The posted clip is `lintel4-share-demo.mp4`. Also the walk on desktop and phone, the opening, the before and after sheet (`lintel4-before-after.jpg`), and the opening's lines side by side with iteration 3. |
| `brief-iteration-4.md` | Everything about how the page works, its traps and its tools. Read "Map of the code" and "Tools" only if you need to touch the page. |
| `../teach/lintel-3/` | A finished teaching pack for iteration 3: `00-overview.md`, `01-process.md`, `02-techniques.md`, `04-video-plan.md`, and four small standalone demos in `demos/` (section cut, scan follows camera, paper roll, one number light). |
| `../teach/lintel-4/03-prompt-ladder.md` | The starter prompt and the six asks that came after it, each with what Sam actually said. Written 12 Oct. |
| `../teach/journal.md`, `session-log.md`, `decisions.md`, `reviews/`, `shots/` | The whole story as it happened: 19 asks in Sam's words, 68 decisions with who made them, seven review rounds, stills of every pass. |

Run it: `preview_start` with the name `flat3d` (never start the server through Bash), then `http://localhost:8014/001%20Lintel/`.

## Facts you will need (measured 12 Oct)
- **How it was really made.** About 70 prompts across six sessions, 26 Sept to 9 Oct 2026. Four iterations. It began with a 57 second video of an old Medal of Honor site, went through three concepts on a shared engine, and the floor plan idea arrived on day four. Seven rounds of outside review on the last day took it from 7.5 to 8. Built inside Claude Code with Opus 5.5, thinking set to extra high, on the Max 5x plan (Sam's words, 12 Oct, his answer to the people asking about tokens). There is no single prompt.
- **What the page loads.** 41 asset files (40 JPG textures in 15 sets and one HDR sky), **about 38 MB**. Code is about 430 kB unminified: `scene.js` 177 kB, `staging.js` 78 kB, four engine files in `../shared/`. From outside: three.js 0.160.1 and Lenis 1.1.14 (jsDelivr), GSAP 3.13.0 with ScrollTrigger (cdnjs), four Google Fonts. All versions are pinned.
- **Paths.** `index.html` loads `../shared/…`. `scene.js` has `const TEX = '../assets/tex/'` and `const SKY = '../assets/sky/'` near the top. The frozen copies show how to flatten this (`shared/` moved inside, the two constants rewritten).
- **The whole `assets/` folder is 142 MB** and serves ten concepts. Only the 41 files Lintel loads should go online. Get the list from the page itself (`performance.getEntriesByType('resource')` after walking to the end), do not guess it.
- **Frame rate.** 60 a second on this Mac at desktop and phone size, in a headless Chrome. Nobody has tried it on a real phone or inside the LinkedIn or Threads in-app browser, which is where most of these visitors will open the link.
- **No share tags.** `index.html` has a title and a description and no `og:` or `twitter:` tags, so a pasted link shows no picture yet.
- **The page's buttons go nowhere.** "Start a project", "Work | Studio | Contact" and the closing call to action belong to a studio that does not exist.
- GitHub is signed in on this machine as `Sam1983Aing` (`gh auth status`).

## Deliverable 1: the live link
What "done" looks like: one URL Sam can paste under his posts, that opens on a phone and a laptop, shows a picture when pasted, and says it is a work in progress.

Build it as a **separate output folder** (suggestion: `014 Flat 3D/publish/lintel/`), never inside `001 Lintel/`. The working files stay as they are.

The work:
1. Flatten the paths and copy only the 41 assets.
2. Make it safe on Linux hosting: GitHub Pages is case sensitive and macOS is not. Check the case of every path the page requests. No spaces in folder names. Add an empty `.nojekyll`.
3. It will be served from `https://sam1983aing.github.io/<repo>/`, a sub-path. Every path must be relative. Test the folder locally from a sub-path before pushing, not from the root.
4. A fallback for devices that cannot run it (no WebGL2, no float render targets, a context that is lost, or a load that takes too long): a still, the clip, and one line. Today such a visitor gets a blank page.
5. A small, quiet "work in progress" mark and a "best on a laptop" note for phones.
6. Share tags and a 1200 x 630 picture (the plan beside the built house, from `../teach/shots/2026-10-09-l4-pass5/`).
7. Record it on desktop and phone from the local sub-path, and check for console errors, before asking Sam to look.

**Decisions that are Sam's. Ask once, together, with a recommendation each, and show the local build first.**
| Decision | Recommendation |
|---|---|
| Repo name, and that it is public | A new public repo just for the demo, for example `casa-serra`. Pages needs it public on a free account. |
| Is the code readable? | Publish a stripped and minified copy. The source has a comment on almost every block explaining how it works, which is his course material. Minified code is still public, the explanations are not. |
| Where the textures live | In the same repo. It is one place and one push. (The project's `CLAUDE.md` describes another route for single-file builds: the `Sam1983Aing/aura-assets` repo through jsDelivr at a pinned tag. Use that only if he prefers it, and check jsDelivr's size limits first.) |
| Texture weight | 38 MB is a lot on mobile data. Offer a lighter set (smaller JPGs for the biggest five sets) with a before and after still, so he can see that nothing visible is lost. |
| What the page's buttons do | Point them at one place he chooses (the YouTube video, his profile, or his community), or make them inert. |
| A credit line | "A concept by Sam Aing, built with Claude Opus 5.5", small, with one link. His wording. |
| Analytics | None unless he asks. |

Pushing to GitHub publishes it. He has said he wants a live link on GitHub. Still: show him the local build and get his yes on the repo name before the first push.

## Deliverable 2: the starter prompt
It exists: step 1 of `../teach/lintel-4/03-prompt-ladder.md`, about 1,400 characters, with brackets for the reader's own subject. A short answer for the comments is at the end of the same file. Sam has not posted either yet.

Before he posts it:
1. **Try it.** Run the starter prompt once in an empty scratch folder outside this project, as a stranger would, and record what comes back. If the first result is poor, fix the prompt, not the result. Sam should never share a prompt nobody has run.
2. That first result is content. "Here is what one prompt gives you, and here is where two weeks of feedback took it" is the honest answer to "single prompt or chaining?" and a strong beat for the video.
3. It is too long for a comment on either platform. It is its own follow-up post.
4. On token usage: nobody measured it. Do not invent a number. What Sam says publicly: Claude Code, Opus 5.5 at extra high thinking, the Max 5x plan. If he wants a figure, measure it.

## Deliverable 3: the quick video
Sam teaches how he builds, on YouTube and in his AI Builder course. His rule: viewers should understand the process well enough to make their own thing, not paste his prompts. So the story is the workflow.

Use the `teachable-build` skill. Most of the extract work is done (`../teach/lintel-3/`). What is missing is iteration 4 and the angle.

1. **Propose two or three angles first, and wait.** He asked for "a quick one". Ask him the length he has in mind. Candidates: "the post that surprised me, and how the page was made", "there is no prompt: 70 prompts in 10 minutes", "from a flat plan to a house: the four moves".
2. Then write `../teach/lintel-4/04-video-plan.md`: hook, chapters, what is on screen for each, one "try it yourself" per chapter. Bring `00-overview.md` and `01-process.md` up to iteration 4 only as far as the video needs.
3. What there is to show: the frozen copies side by side (v1 orbits the house from outside, v2 is the first plan you walk into, v3, v4), the reference that started it, the four demos, the before and after sheets, the reviewer's score table over seven rounds, the stills of each pass, and the posts themselves.
4. Voiceover only if he asks. Then follow his guide first: `/Users/sam/Projects/Courses/000 AI Builder Course/00 Course Reference/05-voiceover-style-guide.md`, and `BROLL-STYLE-BRIEF.md` next to it for clips.
5. B-roll: the `demo-options` recorder (`~/.claude/skills/demo-options/scripts/record.mjs`) and `tools/walk_reel.py` record any stretch at a fixed pace on desktop and phone. Record only what the plan calls for.
6. Not known, ask Sam: where the original 57 second reference video is, his channel name and usual length, and whether he appears on camera.

## Rules
- **Scope.** Publish and explain what exists. No new features, no polish, no "while I'm here". The polish pass (materials, content, texture, the moment a drawing turns into material) is a later session. If something is broken for a visitor, fix that and say so.
- **Writing.** Sam's global rules apply to everything written for him and everything he will post: no em dashes, no semicolons, plain first person, uneven rhythm, no hype words. Posts go out in his words. Offer a draft, keep what he changes.
- **He is visual.** Show a recording or a still, not a description. For options, use the `demo-options` skill.
- **Propose before building** when there is a choice. Two or three directions, then checkpoints.
- **Keep the record.** `../teach/journal.md` (tag `share`), `../teach/session-log.md` (one block per ask, his words), `../teach/decisions.md`. Quietly.
- **Publishing needs his yes in this session**, for the push and for anything posted in his name. Never post for him.
- **Do not edit** `v*/`, `shared/` or the working page for looks. A build step that writes into `publish/` is the way.
- Verify with measurements and headless recordings. The Browser pane pauses when hidden and cannot open `file://`.

## First step
1. Read this brief, then `../teach/lintel-4/03-prompt-ladder.md` and blocks 17 to 20 of `../teach/session-log.md`.
2. Start the server and confirm the working page still loads clean: `node tools/probe.mjs "http://localhost:8014/001%20Lintel/?at=0" <steps.json>` must end with "PAGE PROBLEMS: none".
3. Build the publish folder locally (deliverable 1, steps 1 to 4), serve it from a sub-path, record it on desktop and phone.
4. Show Sam the recording and the table of decisions with your recommendations. Ask for the repo name. Do not push yet.
5. While he looks: run the starter prompt once in a scratch folder (deliverable 2).
