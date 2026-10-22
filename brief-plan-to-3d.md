# Brief: a tool that turns a 2D plan into a 3D walk, to see what is possible

## Start here (for a new session)
You are in `014 Flat 3D/`. This session is a **brainstorm with small proofs**, not a build. Sam wants to find out whether the Lintel demo could become a tool for architects: a floor plan goes in, a house you can walk through comes out.

Sam, 13 Oct 2026, in his words: **"A few persons say you should sell this idea to architects. So maybe we can start a new chat session and brainstorm on building a tool that converts a 2D plan into 3D, just to see what's possible."**

"Just to see what's possible" is the scope. No product, no pricing page, no sign-up. A clear answer to: what would this tool be, what is hard about it, and what is the smallest thing that proves it.

## What happened before this
- 26 Sept to 9 Oct: Lintel was built in `001 Lintel/`, four iterations. A flat floor plan that becomes a house as you scroll.
- 11 Oct: Sam posted a work in progress clip. Two days later: LinkedIn 38,122 impressions, 824 likes, 107 comments. Threads 60.2K views, 758 likes. X 12.4K views, 347 bookmarks. Far above anything he had posted before.
- 12 and 13 Oct: the demo went live, a starter prompt was published, and a YouTube video about how it was made went out.
- In the comments and messages, several people told him to sell it to architects. **Nobody in this project has read those messages.** They are on his LinkedIn. Ask him for them first: what people actually asked for decides what the tool is.

## What exists and where
| Thing | Where |
|---|---|
| The live demo | https://sam1983aing.github.io/casa-serra/ (repo `Sam1983Aing/casa-serra`, minified code) |
| The working page | `001 Lintel/` (`scene.js` 2,543 lines, `staging.js` 865 lines, engine in `shared/`). **Do not edit it for this.** |
| How the page works, its traps, its tools | `001 Lintel/brief-iteration-4.md`, sections "Map of the code" and "Tools" |
| The starter prompt | https://github.com/Sam1983Aing/casa-serra/blob/main/starter-prompt.md |
| What that prompt built, from nothing, in about an hour | https://sam1983aing.github.io/casa-larga/ and `teach/lintel-4/starter-run/` (readable code, 82 kB) |
| The video | https://youtu.be/rKv4PrtBkb8, script in `teach/lintel-4/05-voiceover.md` |
| The whole story so far | `teach/journal.md`, `teach/session-log.md`, `teach/decisions.md` |

Run the project: `preview_start` with the name `flat3d`, then `http://localhost:8014/001%20Lintel/`.

## The one fact that makes a tool thinkable
In both builds the house is already **a table of rooms**, and the 3D is generated from it.

Lintel, `001 Lintel/scene.js` line 37:
```js
const ROOMS = [
  { id: 'media', r: [0, 0, 9, 8], name: 'Media', label: [4.5, 1.3] },
  { id: 'kitchen', r: [9, 0, 25, 8], name: 'Kitchen and dining', floor: 'trav', ... },
```
`r` is a rectangle in metres. `OPEN` (line 76) lists the doors and the glass. Walls, floors, the cut, the ink drawing, the dimensions on the sheet and the scan that turns each room real all come from those tables.

Casa Larga does the same with its own `ROOMS` in `teach/lintel-4/starter-run/result/js/plan.js`.

So "convert a 2D plan into 3D" comes down to: **get from somebody's plan to a table like that**, then generate.

## What is not generated today (the honest list)
Everything below was done by hand for one house. A tool has to do it for any house, or do without it.
- **Reading a plan.** Nobody has tried to turn a real plan (a PDF, a photo, a CAD file) into the rooms table. This is the unknown.
- **Only rectangles.** Rooms are axis-aligned rectangles on one floor. No angled walls, no curves, no stairs, no second storey.
- **Furniture.** `staging.js` is 865 lines of furniture placed by hand, room by room. It is most of why the rooms look lived in.
- **The camera path.** `KEYS` (line 416) is authored stop by stop. It took several rounds to get right.
- **Looks.** Lights, materials per room, the garden, the trees: hand-tuned over two weeks and seven review rounds.
- **A long list of fixes that belong to this house.** See "Things that cost time" in `brief-iteration-4.md`. Many of them are about this building's exact geometry.
- **Weight.** The page loads 38.6 MB of textures on a laptop (12.9 MB on a phone). Nobody has run it on a real phone.

## What Lintel is, compared with what already exists
Tools that turn floor plans into 3D already exist, and real-time walkthroughs are a normal part of architecture software. From memory, not checked: Floorplanner, Planner 5D, RoomSketcher, Coohom, CubiCasa, Matterport (from scans), Shapespark, and Twinmotion, Enscape or Lumion on the rendering side. **Check this properly before saying anything is new.**

What none of those is, as far as I know: a story on a web page, where the drawing itself becomes the building as you scroll. Lintel is closer to a way of *presenting* a project (a studio's website, a sales page for a house that is not built yet) than to a design tool. That may be the real product. Test that idea, do not assume it.

## Directions to weigh (seeds, not decisions)
Bring Sam two or three, each with something he can look at. These are starting points.

1. **Plan in, walk out.** Upload a plan (image or PDF). A vision model reads the rooms and sizes into the table. The person corrects it in a simple editor. The page is generated. The risk is the reading: it has to be right, or easy to fix.
2. **Draw it, walk it.** No reading at all. A simple editor where you draw rooms as rectangles with sizes, mark doors and glass, pick a style, and get a link. Reliable, less magic.
3. **Done for you, first.** No tool for the public yet. A pipeline Sam runs with Claude Code: a client's plan in, a page out, in a day. He sells the result, learns what architects really want, and the pipeline turns into the product later.
4. **For builders, not architects.** A Claude Code skill or an open starter that takes a plan image and builds the walk. His audience is people who build with AI, and that is who watched the video.

Questions each direction has to answer: who pays, what do they have in hand (a PDF, a DWG, a Revit model, a sketch), what do they get (a link to send a client, a page for their own site), how exact does it have to be, and what does it cost to run.

## Small proofs worth doing in this session
Cheap, and each one answers a real question. Do them in a scratch folder (suggestion: `010 Plan to 3D/`), never in `001 Lintel/`.

- **Can the generator take another house?** Copy Lintel into the scratch folder, replace `ROOMS` and `OPEN` with a different, simple house, and see what breaks. This says how much of Lintel is an engine and how much is one building.
- **Can a model read a plan?** Take two or three real floor plans (public ones, or ones Sam's contacts sent) and have a vision model produce the rooms table. Draw its rectangles over the plan and look at how wrong it is.
- **What does a house look like with no hand-made furniture?** Generate one with empty rooms, or with a few generic pieces placed by rule. Is it still worth showing a client?
- **How far does the starter route go?** Casa Larga came from one prompt. Give the same prompt a real plan image as the layout and see what comes back.

Show each result as a still or a clip, with what it proved and what it did not.

## Sam's to decide. Ask early, together
- **What people actually said.** The comments and messages from architects. Without them this is guessing.
- **What he wants out of it.** A product, a service, a video ("I built a tool that..."), or a course module. They lead to different tools.
- **How much time.** An afternoon of exploring, or a week.
- **Is Lintel's source part of it?** The live repo is minified on purpose. He told someone on X he would work on open-sourcing it ("coming soon"). A tool built on that code touches the same question.
- **The name and the place.** A new folder here, or a new project of its own.

## Rules
- **Propose before building.** Two or three directions, then checkpoints. He decides.
- **He is visual.** A still or a clip, not a description. For options on something he can see, use the `demo-options` skill.
- **Do not touch** `001 Lintel/`, `publish/` (those two folders are the live sites) or `shared/`. Copy what you need.
- **Nothing public without his yes.** No repo, no page, no post.
- **Be straight about what is hard.** He would rather hear "reading plans is the whole problem" on day one than discover it in week two.
- **Writing.** His global rules: no em dashes, no semicolons, plain first person, no hype words.
- **Keep the record.** `teach/journal.md` (tag `tool`), `teach/session-log.md` (one block per ask, his words), `teach/decisions.md`.
- **Probes can hang.** On this Mac a headless Chrome sometimes freezes at start-up when other sessions are recording. Run every probe under a time limit and retry (see the note in the project memory).

## First step
1. Read this brief, then "Map of the code" in `001 Lintel/brief-iteration-4.md`, then `ROOMS`, `OPEN` and `KEYS` in `001 Lintel/scene.js`, and `teach/lintel-4/starter-run/result/js/plan.js`.
2. Ask Sam the five things under "Sam's to decide", and ask for the messages from architects.
3. While he gathers them, check what already exists (the list above is from memory) and write down in a few lines what Lintel does that those tools do not.
4. Run the first proof, "can the generator take another house", in a scratch folder. It needs nothing from him and it tells you the most.
5. Come back with two or three directions, each with what it would take and one picture.
