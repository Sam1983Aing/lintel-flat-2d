# 002 Lintel Flat 2D

Lintel, finished. An architecture studio landing page where a 1:200 floor plan rises into a 3D house you walk through room by room. The final version is `001 Lintel/v10/` (21 Oct 2026). Its standalone file is `lintel.html` and the Aura copy is `lintel-aura.html` (see "The standalone file for Aura" below).

Where it came from: built with Claude Code in `Claude Code/014 Flat 3D/` up to v8c (16 Oct), copied on 17 Oct to `Gemini/Flat 2D/` and carried on there to v10, then moved here on 22 Oct 2026. The table below still lists the other flat-3D pages. They stayed in `014 Flat 3D/`, and only Lintel is in this folder.

---

(The rest is the README this folder was copied with, kept as it was.)

## 014 Flat 3D

Landing pages built on one effect: the page opens on what looks like a flat
illustration, and scrolling reveals it was a 3D world all along. The reference
is the Medal of Honor: Above and Beyond site, recorded in `flat 3D.mp4`.

## The pages

| Folder | What it is | Status |
|---|---|---|
| `000 The Long Second` | Normandy village frozen in one second, 1944. Textures painted in code. The camera language every later page copies. | First iteration. Sam loves the depth and the camera, not the painted look. |
| `001 Lintel` | Architecture studio. The floor plan of a house opens into a walk through it, room by room, and a roll of paper turns it back into the drawing. | Iteration 4 about to start, from `brief-iteration-4.md` (`v1/`, `v2/`, `v3a/`, `v3/` hold the earlier versions) |
| `002 Hallworth Diorama` | Museum vitrine, swans lifting off a frozen lake. | Iteration 1 done. Parked. |
| `003 Hotel Kyma` | A 1963 hotel postcard you step into. | Iteration 2 under way in its own session (iteration 1 kept in `v1/`) |
| `004 The Last Keeper` | The last night a Cornish lighthouse has a keeper, 1983. | First full pass, reel in `recordings/` |
| `005 The Floating World` | A woodblock print of the old coast road that opens into the real road. | First full pass, reel in `recordings/` |
| `006 The Night Train` | The last run of a sleeper train, held on a viaduct at 23:58. | First full pass, parked |
| `007 Rue One` | City e-bike in ligne claire. Goal: book a test ride. | First full pass, reel in `recordings/` |
| `008 Aldren No. 1` | A mechanical watch as its own patent drawing, taken apart. Goal: reserve one of 300. | First full pass, reel in `recordings/` |
| `009 Northfold Hollow 2` | A tent, one weekend, all cut paper. Goal: shop the tent. | First full pass, reel in `recordings/` |

Sam's own portfolio (five options built here on 30 September) moved to `../0000 Portfolio` on 6 October, with its own copy of the engine.

## Shared folders

- `shared/` is the engine used by 001 to 009. `shared/ENGINE.md` documents it.
- `assets/` holds the Poly Haven CC0 textures and skies.
- `tools/` has the local server, the asset fetcher and the stills recorder.
- `teach/lintel-3/` is the teaching pack for Lintel iteration 3 (overview, process, technique cards, video plan, four demos).
- `teach/journal.md` is the running log of decisions for the YouTube and course material. Next to it, `teach/session-log.md` keeps each ask in Sam's words with what came back, and `teach/decisions.md` says who brought which idea and who decided (both start on 6 October 2026).

## The working project on GitHub (private)

This folder is its own git repository since 22 October 2026, pushed to the private
https://github.com/Sam1983Aing/lintel-flat-2d (the public demo stays `casa-serra`, below).
It is not `lintel-source`: that one is the repository of `Claude Code/014 Flat 3D/` and its
other flat-3D pages, and it stops at v8c. This one starts fresh at v10, with every frozen
version inside it (`001 Lintel/v1/` to `001 Lintel/v10/`).

It holds code and text only: the page, every frozen version, the tools, the teach notes,
v10's photos, `lintel.html` and `lintel-aura.html`. The videos, `teach/shots/`, the scans in
`assets/`, `publish/` (two repositories of their own) and the standalone build's download cache
stay on this Mac (see `.gitignore`). After a clone, `python3 tools/fetch_assets.py` downloads
the textures and skies again (only the versions before v7a need them).

Each version Sam signs off is tagged (`v10`, ...). The version's own folder is the page as it
was frozen. To save new work:

```bash
git add -A && git commit -m "what changed" && git push
```

To tag a new freeze:

```bash
git tag -a v11 -m "what it is" && git push origin v11
```

## Publishing Lintel (the live link)

**Live since 12 October 2026:**

| What | Live | Repo (public) | Local folder |
|---|---|---|---|
| Lintel, the work in progress demo | https://sam1983aing.github.io/casa-serra/ | https://github.com/Sam1983Aing/casa-serra | `publish/lintel/` (its own git repo) |
| The starter prompt, the link to share | https://github.com/Sam1983Aing/casa-serra/blob/main/starter-prompt.md | the same repo | `publish/lintel/starter-prompt.md`, written by the build from `tools/publish/starter-prompt.txt` |
| Casa Larga, what the starter prompt gave | https://sam1983aing.github.io/casa-larga/ | https://github.com/Sam1983Aing/casa-larga | `publish/casa-larga/` (its own git repo) |

To put a change online: run the build, look at it locally, then push.

```bash
python3 tools/publish_lintel.py
```

```bash
git -C publish/lintel add -A && git -C publish/lintel commit -m "what changed" && git -C publish/lintel push
```

GitHub Pages rebuilds in under a minute. The build keeps the `.git` folder, so the history stays. Casa Larga is not built by a script: it is a copy of `teach/lintel-4/starter-run/result/` without its recordings and tools, and it should stay as it came.

What is live: minified scripts, the full textures on a laptop and half-size ones on a phone (`TEXTURES = "phone"`), share picture A, the buttons as on the working page, no credit link, no analytics, no license file.

The working page in `001 Lintel/` is never edited for this. One script reads it and writes a flat copy that GitHub Pages can serve from a sub-path:

```bash
python3 tools/publish_lintel.py
```

- Output: `publish/lintel/`. Sources that only the published copy has: `tools/publish/` (`gate.js` is the fallback for devices that cannot draw the page, `publish.css`, `assets.json` is the list of the 41 files the page loads, `media/` holds the share picture, the fallback's still and the clip).
- Everything that is a decision is a constant at the top of the script: repo name, share picture, the work in progress wording, the credit and its link, where the page's buttons go. Change one and run it again.
- `--readable` keeps the comments and the long names. Without it the scripts are stripped and minified (first time: `cd tools/publish && npm install`).
- Test it the way it will be served, from a sub-path and with exact case: start the `publish` server (`python3 tools/serve_publish.py 8015`), open http://localhost:8015/lintel/ and read `publish/requests.log` afterwards. Anything that is not 200 will be a 404 online.
- The fallback's four states can be looked at on a machine that runs the page fine: `?fallback=nogl`, `?fallback=lost`, `?fallback=slow`.
- If the page ever loads a new texture, measure the list again (walk to the end, then `performance.getEntriesByType('resource')`) and update `tools/publish/assets.json`. The script refuses to build when the count is not 41, so change that number with it.

## The standalone file for Aura (Lintel v10)

`lintel.html` at the project root is Lintel v10 in one file (2.5 MB, made 21 October 2026). It opens by double-clicking, from `file://`, and is the file to upload to Aura.

```bash
node tools/build-standalone.mjs
```

What is inside it: every script and stylesheet of `001 Lintel/v10/` in the page's own order, three.js, GSAP, ScrollTrigger and Lenis at the versions the page links, and the four fonts (Instrument Serif, Saira Stencil One, Geist, Geist Mono) as base64. The libraries and fonts are downloaded once into `tools/standalone/`, so later builds need no network. `001 Lintel/v10/` itself is never edited.

What is not inside: the 14 photos of the service drawer. They are on the CDN, from the assets repo `Sam1983Aing/aura-assets`, folder `lintel/`, pinned to a tag:

```
https://cdn.jsdelivr.net/gh/Sam1983Aing/aura-assets@1.22.0/lintel/<photo>.jpg
```

(`arch-plan`, `craft-cellar`, `craft-stone`, `craft-walnut`, `practice-lounge`, `practice-olive`, `practice-pool`, `process-bath`, `process-garden`, `service-build`, `service-interior`, `team-gallery`, `team-joinery`, `team-suite`. The tag `lintel-v1` points at the same commit.)

Without a network it still runs. The house, its materials and the sky are all code. A photo that cannot load is hidden, so its card shows a plain panel instead of a broken image.

**New or changed photos:**

1. Copy `001 Lintel/v10/assets/*.jpg` into `lintel/` of a clone of `aura-assets`. Commit and push `main`.
2. Tag it twice and push both tags: the next number in the shared series (after `1.22.0` comes `1.23.0`, unless another project took it, check with `git ls-remote --tags origin`) and `lintel-v2`, `-v3` ...
3. Set `TAG` at the top of `tools/build-standalone.mjs` to the new number.
4. Rebuild. The build fetches every photo from the CDN at `TAG` and stops unless each is the same bytes as the local copy (jsDelivr can take a minute to see a new tag).

**The Aura copy, `lintel-aura.html` (897 KB):** Aura's editor refuses to save a page over 1,048,576 bytes, so `lintel.html` (2.5 MB) cannot go in as it is.

```bash
node tools/build-standalone.mjs --aura
```

- three.js, GSAP, ScrollTrigger and Lenis stay `<script src>` tags at the pinned versions, and the fonts stay the Google Fonts link, the way v10 itself loads them. The page's own scripts are minified with `tools/publish/strip.mjs` (the same stripper as the live GitHub Pages copy). It needs a network, which Aura has.
- Aura also refuses a page when an inline script looks to its check like it has an unterminated string. The check does not know regex literals, so `/['"]/g` in staging.js tripped it. The build writes those quotes as `\x27` and `\x22` (same match) and runs Aura's check itself before it finishes.
- On save Aura re-serialises the HTML (uppercase DOCTYPE, `<meta>` without the slash) and adds `<script src="https://cdn.tailwindcss.com/">`. Tested: neither changes the page. Tailwind's only effect is a console warning.
- To put it in: paste it into the project's Code view and Save. A plain paste gets reformatted by the editor (it breaks lines in the minified scripts), so check the line count after pasting: it should be 3,468. The first copy went into the "Minimalist User Profile Card Template" project, version "Transform profile card to Lintel Studio landing", 21 October 2026.

A change to the code alone needs only step 4. To test before a push, start the local server (`python3 tools/serve.py 8014`) and point the build at it: `node tools/build-standalone.mjs --asset-base=http://127.0.0.1:8014/001%20Lintel/v10/assets/` writes `lintel-local.html`.

## Run

```bash
python3 tools/serve.py
```

Then open http://127.0.0.1:8014/ and pick a folder. 000 also works by
double-clicking its `index.html`. The others need the server because they load
photo textures.
