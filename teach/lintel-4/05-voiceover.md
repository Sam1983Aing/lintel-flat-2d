# Lintel: how the floor plan becomes a house

12 October 2026. Written to `05-voiceover-style-guide.md`.

Every line has one number, from 1 to the end of the file. "Change 27" is enough. Lines under one heading are read together. A new heading is a pause, and usually a cut.

---

# LONG VERSION, ABOUT TEN AND A HALF MINUTES (1327 words)

## HOOK

`1` This might look like a regular 2D floor plan of a house.  
`2` But watch what happens when you scroll into it.  
`3` The walls rise out of the drawing, and you walk through the whole house.  
`4` It was a 3D model all along, seen from straight above.

## WHY THIS VIDEO

`5` I posted this demo as a work in progress.  
`6` I didn't expect that much interest from it, because the page wasn't even finished yet.  
`7` In less than 24 hours, it went viral on LinkedIn and Threads.  
`8` I've never had numbers like that on anything I've shared, so I'm still a bit surprised.  
`9` Most of the comments ask the same thing. How is it done, and is there a prompt or a workflow I can share?  
`10` So I'm not going to wait until the page is perfect to answer that.  
`11` Here's how it works, and then how it really got made.

## THE PLAN IS THE HOUSE

`12` A floor plan is really a house that's been sliced open and looked at from above.  
`13` So that's exactly what this page does.  
`14` It builds the whole house in 3D first, and then it cuts it at one point two metres above the floor.  
`15` The camera then sits very high above it and zooms all the way in, so you can't see any depth and everything looks flat.  
`16` That's why it looks like ink on paper, even though it's the real building.

## THE WALK

`17` When you scroll, that cut moves up. That's the walls growing.  
`18` Then the same camera comes down to the front door and goes in.  
`19` It goes from room to room, so you're not looking at a model from the outside. You're walking through it.

## THE ONE RULE

`20` Now look at the next room. It's still just a drawing.  
`21` The wood, the stone and the light only show up when you step inside.  
`22` So the house keeps building itself around you as you walk. For me, that's what makes the whole thing work.

## WHAT IT'S BUILT WITH

`23` The 3D is three.js. It's a free library that draws 3D right in the browser.  
`24` GSAP is an animation library. It handles the timing of everything that moves, like the loader and the text.  
`25` Lenis smooths the scroll, so the walk glides and doesn't jump from one step to the next.  
`26` The wood, the stone and the fabric come from Poly Haven, a site with free scans of real materials that anyone can use.  
`27` Everything else, the walls, the furniture and the trees, is shapes made in code.

## HOW THE IDEA STARTED

`28` So how did I come up with this idea?  
`29` It all started with a three.js course I'm following.  
`30` One of the lessons shows this amazing effect.  
`31` I recorded a short video of that part and gave it to Claude Code, and I asked if it could reproduce that kind of effect.  
`32` It actually did. This is the first version I got, from an idea I saw on the web.  
`33` At first it looks like a regular painting.  
`34` But there's a whole 3D scene hidden right before your eyes.  
`35` You only notice it when you start scrolling, and the camera flies into the painting.

## FROM A POSTCARD TO A HOUSE

`36` That idea led to a landing page I've already shared, built on a similar concept.  
`37` At first it looks like a postcard, but as you scroll, there's a whole 3D scene inside it.  
`38` If you're curious how that 3D scene was made, I have a video that explains it.  
`39` After that landing page, I knew this technique could be recreated pretty easily with Opus 5.5.  
`40` So I wanted to explore it in a more creative way, in a completely different field.  
`41` That's where the idea of a flat 2D plan that turns into a house comes from.  
`42` This is the first iteration. The concept was there, but it wasn't perfect.  
`43` In iteration two, we're much closer to the version you've seen in the demo.  
`44` But the walls and the ceilings were glitching, as you can see here.  
`45` So I had to clean all of that up.

## HOW I DIRECT IT

`46` To refine the 3D scene, there's no specific detailed prompt. Most of it is just me reacting to what I see, in plain language.  
`47` On version three, I asked for typography that fits the landing page better, and this is what I got.  
`48` For the scanning effect, I like to ask the AI for three to five options.  
`49` But I don't want them as a written list that I have to imagine. I ask for a video of each one.  
`50` That way I can look at all the options, and I just go with the one I like the most.  
`51` It takes a little more time, because the AI has to build every option.  
`52` But when you only read about an effect, you can misunderstand it, and you can miss out on a great option.  
`53` Then I keep inspecting, section by section, and I score what I'm looking at.  
`54` For example, the bedroom is a four out of ten, and the garden is a two.  
`55` And I tell it to fix them until they reach at least an eight out of ten.  
`56` A number is much easier to chase than "make it better".  
`57` And the score doesn't come from the AI that built the page. A second AI, which hasn't built anything, looks at screenshots of every room and gives each one a score.  
`58` That way the AI keeps iterating on its own work, and it spends longer on the small details.  
`59` Without that, it works five or ten minutes on a fix and calls it done.  
`60` With this technique, it can sometimes work for more than an hour ⚠️ on one section.  
`61` It builds, compares with the previous version, gets a score, and keeps going until we have something satisfying.

## WHAT ONE PROMPT GIVES YOU

`62` There is a prompt I would start with today, and I test it on a fresh session that knows nothing about this project.  
`63` About an hour later, this is what comes back. A real plan, walls that rise, and a walk into the first room.  
`64` Everyone will get a slightly different result from the starter prompt.  
`65` It's a pretty strong start, and from there you just say what you want.  
`66` You can ask for a more premium floor plan, for more rooms, or to visit those rooms in a specific order.  
`67` This is where your creativity comes in, and there's no perfect prompt for the rest.

## WHO THIS IS FOR

`68` This demo is a house, so the obvious fit is anyone who has to show a space before it exists.  
`69` That's architects, interior designers, home builders, and developers who sell apartments from a plan.  
`70` Kitchen studios, landscape designers and renovation companies can use it the same way.  
`71` But the idea is wider than houses.  
`72` You start on something flat that people already know from your field, and you let it become the real thing.  
`73` For a trip or a hotel, that flat thing is a postcard.  
`74` This is my Kelingking Beach page. It opens on a postcard lying on the sand, and when you scroll you go into it.  
`75` It's a pretty creative way to bring a 3D scene I built earlier into a landing page.  
`76` I actually decided to rebuild my personal portfolio to showcase all my work. It's still in the early stages.  
`77` It uses the same concept. It looks flat at the beginning, and then you enter several rooms.  
`78` Each room showcases a specific part of my work, like landing pages, YouTube videos and paid templates.  
`79` I thought it was a really nice way to make my portfolio more interactive.  
`80` So for your own project, look for the flat thing your customer already knows.

## CLOSE

`81` Everything is in the description: the starter prompt, the live demo and the repo.  
`82` The demo runs best on a laptop.  
`83` It's still a work in progress, but I hope you enjoyed this short breakdown of how I made it.  
`84` The effect might look impressive, but in reality it's less complex to build than it looks.  
`85` So try it on your own subject, and go impress your friends.

---

# SHORT VERSION, ABOUT A MINUTE (139 words)

## HOOK

`86` This might look like a regular 2D floor plan of a house.  
`87` But watch what happens when you scroll into it.

## HOW IT WORKS

`88` The house is built in 3D, then cut at one point two metres, like a real floor plan.  
`89` Scroll, and the cut moves up. That's the walls growing.  
`90` Then the camera comes down to the front door and walks in.  
`91` Every room stays a drawing until you get there. The materials arrive with you.

## THERE IS NO PROMPT

`92` People asked for the prompt. There isn't one.  
`93` It takes about seventy ⚠️ prompts over two weeks.  
`94` I ask for options I can watch, and I score every room out of ten.

## CLOSE

`95` The prompt I would start with today is in the description, with the live page.  
`96` In my test it gets to a first version in about an hour. The rest is the work.

---

# OTHER WAYS TO OPEN

Each one replaces the hook (lines 1 to 4). The rest stays.

## THE PROMPT QUESTION

`97` If I gave you the prompt for this page, what do you think you would get?  
`98` A lot of people asked me for it, so I tested it.  
`99` This is what one prompt gives me. And this is where two weeks of notes took it.

## THE COUNT

`100` This is a floor plan. Scroll, and it turns into the house.  
`101` How many prompts do you think that takes?  
`102` It's about seventy ⚠️, and most of them are me saying what I don't like.

---

# Who can use it (to pick from for "Who this is for")

**The house version, as it is.** Anyone who shows a space before it exists, or a space you can't visit yet:

- Architects and architecture studios
- Interior designers
- Home builders, and makers of prefab or modular homes
- Property developers and agents who sell from a plan
- Kitchen and bathroom studios
- Renovation and extension companies
- Landscape and garden designers, pool builders
- Hotels, resorts and villa rentals (the plan of a suite, then the suite)
- Office fit-out and shop design studios
- Venues that rent a space: weddings, events, restaurants
- Museums and galleries (the plan of an exhibition, then the rooms)
- Boat builders, tiny homes and camper conversions (a deck plan or a layout is a floor plan too)

**The idea in other fields.** The flat thing the customer already knows, then the real thing:

| Field | Starts flat as | Becomes |
|---|---|---|
| Travel, hotels | A postcard | The place. Your Kelingking Beach page (live at sam1983aing.github.io/turun), and `003 Hotel Kyma` in this folder |
| Products | A technical or patent drawing | The object, taken apart. `008 Aldren No. 1` in this folder is a watch done this way, `007 Rue One` an e-bike |
| Places | A map | The ground: a resort, a ski area, a campus, a vineyard, a festival site |
| Museums, exhibitions | A print or a painting | The scene inside it. `005 The Floating World` (a woodblock print) and `000 The Long Second` (a painting) |
| Fashion | A sketch or a sewing pattern | The garment |
| Games, film, books | A storyboard panel or a cover | The scene |
| Engineering | A section drawing | The machine, cut open |

Pages 000 to 009 in this folder are first passes of the same effect. Whether any of them is good enough to show is your call.

# Numbers to confirm before recording

- ⚠️ **About seventy prompts** (93, 102). Only in the short version and in one of the other openings now. A count from the session record made for the brief on 12 October. I did not count them again today.
- **Two weeks** (93). 26 September to 9 October 2026.
- **One point two metres** (14, 88). The cut height in `scene.js`.
- **A four, a two, at least an eight** (54, 55). Your words on 9 October (bedroom, garden, the bar).
- **About an hour** (63, 96). The test session took 5 minutes to propose and about 50 to build its first checkpoint. It ran on this Mac, with no skills and no notes from this project.
- **The second AI** (57). A separate AI agent that did not build the page. It got your notes and screenshots of every room and scored each part out of ten, seven rounds on 9 October, from 7.5 to 8. It was Claude's way of working (the same as on the macaque), not something you asked for in those words. The reviews are in `teach/reviews/`.
- ⚠️ **More than an hour on one section** (60). Your words. I have no measured time per section.
- **Version three, the typography and the scanning effect** (47, 48). On screen: `001 Lintel/demo/hero/type-options.jpg`, then `demo/fill/fill-options-share.mp4` (four ways the drawing turns into material), then your picks, `demo/picks/stencil-laid-share.mp4`.
- **The course and the effect** (29, 30). The journal says the recording is the Medal of Honor: Above and Beyond site, shown in a Three.js Journey lesson. The script names neither. Naming the course would be a fair credit, since the idea came from its lesson. Your call.
- **"The first version I got"** (32). That is `000 The Long Second` (a painted village, not a house). Its reel: `000 The Long Second/recordings/walkthrough-share.mp4`.
- **Poly Haven** (26). The textures are CC0 scans from polyhaven.com.
- **"The live page is in the description"** (81, 95). True since 12 October: https://sam1983aing.github.io/casa-serra/. The description draft is `06-video-description.md`.
- **The Kelingking line** (74). Written from that project's notes (a postcard on sand, scrolling goes into it). Check it against the page as it is today.
- **The post's numbers** (shown over lines 5 to 8, not spoken). From your two screenshots, both at 23 hours: LinkedIn 764 likes, 103 comments, 48 reposts, 35,618 impressions. Threads 725 likes, 56 comments, 47 reposts, 319 shares. Line 7 says "went viral" and no figure, so it stays true as they move.
- **"I've never had numbers like that"** (8). Your words: "this is the first time I get those kind of numbers."
- **The order of the story** (36 to 41). The script says the postcard page came first and the house after it. The project's notes say it the other way round: the floor plan idea is dated 30 September, and the postcard opening of the Kelingking page 5 October. Both were under way in the same two weeks. If you want the script to match the notes, line 39 can become "Around the same time, I knew this technique could be recreated pretty easily with Opus 5.5."
- **"I have a video that explains it"** (38). Which video? Its link belongs in the description.
- **Iteration one and two** (line 42 and line 43). On screen: `001 Lintel/v1/` (a side view of the house and a board of materials, not a floor plan yet) and then `001 Lintel/v2/`, the first floor plan you walk into (`001 Lintel/recordings/lintel2-full-share.mp4`).
- **The glitching** (line 44). Shown, not described: the iteration two reel still has it, and `lintel4-opening-lines-before-after-share.mp4` puts before and after side by side.
- **The Kelingking page now comes up twice**, here (lines 36 and 37) and again in "Who this is for" (lines 73 and 74). The second time could shrink to one line: "For a trip or a hotel, that flat thing is a postcard, like the page I showed earlier."
- **The portfolio** (76 to 79). Your words. It is in `../00 Portfolio` and it is not public. Show only what you are happy to show at this stage.
