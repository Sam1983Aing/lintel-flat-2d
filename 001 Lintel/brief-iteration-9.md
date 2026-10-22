# Brief: Iteration 9, Product & Service Landing Page UI + Load Optimization (Lintel)

**Written:** 18 Oct 2026  
**Workspace Root:** `/Users/sam/Projects/Landing Pages/Interactive 3D/002 Lintel Flat 2D`  
**Active Landing Page:** `/Users/sam/Projects/Landing Pages/Interactive 3D/002 Lintel Flat 2D/001 Lintel`  
**Frozen Iteration 8 Baseline:** `/Users/sam/Projects/Landing Pages/Interactive 3D/002 Lintel Flat 2D/001 Lintel/v8d`  

Read `../GEMINI.md` and this file first.

---

## 1. Where We Stand Entering Iteration 9 (`v8d/`)

Iteration 8 (the 100% procedural code-material, geometry, scan-choreography, and lighting polish pass across all rooms and gardens) is complete and frozen as `001 Lintel/v8d/`.

### What Is Built and Locked in `v8d/`
1. **Zero External Texture Downloads (`0.85 MB` total):** All 41 Poly Haven scans and the HDR sky are replaced by procedural GLSL shaders in `001 Lintel/code-materials.js` (`357 KB`) and `001 Lintel/code-sky.js` (`7 KB`).
2. **All Rooms, Courtyards, and Gardens Polished to Architectural Reference Standards:**
   - **00 · Plan & Forecourt (`plan` / `door`):** 1:200 floor plan horizontal section cut at `1.2 m` with poché backfaces, fair-faced concrete facade panels (`fairFaced`), 13 straight-grain oak fins (`finWood`), Jura limestone pathway (`juraPath`) flush with two-size gravel (`courtGravel`), weathered boulders (`rock`), upright ornamental grasses, floating basalt bench, and 3D stainless-steel house number `14`.
   - **01 · Entrance (`hall`):** Honed grey marble floor slabs (`slabs`), white limewash walls (`limewashEntry`), white ceiling (`roofWhite`), corner walnut console with drawers and scanned tabletop styling, and a pair of ribbed smoked-bronze amphora floor vessels with multi-branch botanical arrangements.
   - **02 · Living Room (`living`):** Sunken conversation pit with box-piped oatmeal bouclé sofa cushions (`pillowGeo`), vein-cut Roman travertine low coffee table, woven wool geometric rug, sculpted walnut and cognac saddle-leather armchairs, turned fluted travertine side table with alabaster lamp, floor-to-ceiling Kolumba brick fireplace breast with split oak logs and animated flames, and dual open Belgian linen curtain stacks.
   - **03 · Kitchen (`kitchen`):** Calacatta breccia marble slab floor, full-height smoked-eucalyptus cabinet wall (`kitchenVeneer`) with integrated two-door brushed-stainless refrigerator, stacked speed-oven and convection oven, recessed Nero Marquina cooking alcove with 6-burner hob, stainless range oven door, and pyramid canopy extractor hood, plus a `5.0 m` Calacatta quartzite island (`counterQuartzite`) with deep stainless undermount sink, gooseneck mixer, fluted travertine fruit bowl, 3 sculpted leather/walnut barstools, and angled twin-cylinder ceiling spotlights.
   - **04 · Dining Room (`dining`):** `5.15 m` solid Black Walnut live-edge tree-trunk slab table (`trunkSlabGeo`, `liveEdgeWalnut`) with brass butterfly bow-tie keys and integrated walnut/bronze trestle foundation, 8 sculpted walnut and cognac leather dining armchairs, and 3 spun-brass dome pendants.
   - **05 · Wine Cellar (`wine`):** 3 equal bronze-framed glass partition bays with a central glass cellar door and walnut/brass pull handles, dark basalt slab floor (`cellarBasaltFloor`), solid American Walnut joinery (`cellarWalnut`), 3 backlit honey-onyx collector bays (`backlitOnyx`) with 38-degree angled vintage bottles, OWC wooden crates, fluted travertine tasting island, and 6 ceiling spotlights.
   - **06 · Olive Patio, Study & Salon (`patio` / `olive`):** `80 x 80 cm` flat-honed square Roman travertine tiles (`travP`), 4 dark architectural concrete planters with natural olive-emerald botanical rosettes (`patioPlantLeaf`), ancient braided-trunk Mediterranean olive tree (`8,800` multi-shoot leaf cards, 12 buttress roots, basalt curb ring, and vertex wind simulation), L-shaped Burmese teak and two-color white/sage outdoor sofa lounge, 2-pane Study with 6-bay walnut bookcase and 85-inch wall-mounted OLED TV, and 1-pane book-free Salon.
   - **07 · Glass Gallery (`gallery`):** 3 fluted Roman travertine sculpture pedestals with cast-bronze sculptures, 2 solid-walnut and channel-tufted cognac leather gallery benches, 7 purely abstract impasto paintings (`PAINTS[0..6]`) in mitered floating frames, polished Nero Marquina black-and-gold marble floor slabs (`neroSlabs`), and a centered flush-recessed ceiling spotlight track with 7 directional PAR30 bulb spotlights aimed at the paintings.
   - **08 · Master Suite (`bedroom` / `dress` / `bath`):**
     - **Master Bedroom:** 4 open-state 18-fold sheer-linen curtain stacks (`buildBedCurtainStack`), dark espresso-umber corner lounge chairs on a slate-celadon braided circular rug (`strawWeave`), fiddle-leaf fig (`figLeaf`), 9-drawer Walnut & Calacatta makeup vanity desk with backlit mirror (`vanityMirror`), and a centered wider hero camera shot framing the `2.76 m` California King bed (`drapeGeo` linen duvet, Oxford-flanged pillows, column-and-drum architectural bedside lamps, symmetrical golden-bronze urns), channel-tufted walnut/bouclé end-of-bed bench, and carved Tibetan wool-and-silk carpet (`rugPile`).
     - **Dressing Room:** Figured American Walnut wardrobe bays (`veneerWal`) with contoured walnut/brass hangers, collared shirts, lapelled blazers, two-leg pleated trousers, U-folded cashmere sweater stacks (`foldedGeo`, `knit`), 28x18-last Goodyear-welted footwear (`shoeParts`), and a ribbed wool runner (`runnerWeave`) over wide-plank European oak (`oak`).
     - **Master Bathroom:** Complete outline-and-3D walk-in rain shower, D-shaped rimless wall-hung WC (`wcGeos`), freestanding oval stone bathtub with floor-standing brushed-brass tub filler column connected to the rim, aligned fluted-travertine towel stool (`foldedBathTowel`, `rolledBathTowel`), bordered chenille bath rug (`bathRug`), 6-drawer walnut double vanity with vessel basins and backlit mirror, shiny veined porcelain floor tiles (`porcelainTiles`), and open-doorway camera transition (`bathTurn`, `bathDoor`) out to the garden.
   - **09 · Private Garden & Return Walk (`garden` -> `front` -> `asbuilt`):** Consistent `travP` terrace and pergola paving, slant-tolerant lawn grass (`GRASS`), slow caustic pool water (`poolWater`) with submerged corner entry stairs and floating teak/bouclé loungers (`poolFloat`) in both the garden pool and the widened `13.6 x 4.8 m` main courtyard swimming pool, sculpted basalt/bronze fire pit with animated flames, Burmese teak sun-loungers and pergola/gazebo, 6 standard broadleaf deciduous trees (`broadTree`, `broadLeaf`) surrounded by tall ornamental fountain grasses (`tallGrass`) and blooming flowers (`flowerCluster`), and the non-linear return walk (`gardenHouse`, `gardenGazebo`, `openGrass`, `pool`, `forecourt`, `front`, `lift`, `asbuilt`).
3. **Four Procedural Time-of-Day Lighting Environments (`001 Lintel/light-options.js`):**
   - `?light=morning`, `?light=noon`, `?light=golden`, `?light=night`, plus live switching via `window.__light.setTod(name)` (`0.0 ms` per-frame cost while scrolling, `~600 ms` one-time probe recapture when switching live).

---

## 2. The Goal of Iteration 9: Turn the House Tour into a Real Product / Service Landing Page

Sam's direction (18 Oct 2026):
> "And in the end goal, when we are done refining everything, the goal is to turn it into a landing page that feels like a real product. Right now, the card is mostly a description of each room, quite not at a landing page level because we're just showcasing a house. It's like we're selling a house. We have to explore a way we can sell this as a service. I'm not sure how we can adapt this to a landing page, or maybe a company architect firm that can do the plan, build house, and offer staging services. So maybe each room is like an overview of their service, the business, how long they've been in business, and the team, or stuff like that, or a mix of stuff like that. We need to brainstorm on that before. And yeah, so we're almost there. The polishing is almost done, and then we just convert it into a nice landing page, and then we optimize everything so it's easy on loading."

### Core Narrative Hook
The signature visual mechanic of the page (a flat 2D architectural floor plan rising into 3D structural walls and scanning into fully furnished, art-curated, landscaped rooms) is the exact visual proof of an **end-to-end Architecture, Construction & Interior Staging Firm**:
1. **Phase 01 · The Plan (2D Sheet `A-101`):** Master planning, architectural design, structural engineering, and permitting.
2. **Phase 02 · The Build (Rising Walls & Concrete/Stone Shell):** Turnkey construction, fair-faced concrete, quarry stone, glazing, and bespoke millwork.
3. **Phase 03 · The Staging (The Oxide Scan Line):** Full interior staging, custom furniture fabrication, fine art curation, lighting scenes, and landscape architecture.

---

## 3. UI & DOM Architecture (Files to Edit in Iteration 9)

All UI, HUD, and copy live in four small files, completely cleanly separated from the 3D geometry:

1. **`001 Lintel/index.html` (137 lines):**
   - `.loader` (lines 34-42): Opening story lines and progress bar.
   - `.topbar` (lines 44-47): Brand mark (`Lintel`), section navigation links, and primary CTA pill (`Start a project`).
   - `.hero` (lines 49-63): Kicker, display headline, lede paragraph, and architectural `.titleblock` table on the 2D floor plan sheet.
   - `.spots` / `.ruler` / `.count` / `.hint` / `.corner` (lines 65-82): Fixed HUD elements.
   - `.finale` (lines 86-106): Closing conversion section over the rolled-back blueprint (`eyebrow`, `finale__title`, `finale__lede`, `finale__cta`, `finale__meta`).
   - `.file` (lines 108-115): Slide-over side drawer (`fileNo`, `fileTitle`, `fileTime`, `fileText`, `fileFacts`).
2. **`001 Lintel/scene.js` (`DOSSIERS` array, lines 583-680, and `hud()` / `roll()`, lines 3110-3240):**
   - `DOSSIERS` defines the 10 anchored floating cards along the camera walk (`01` through `09`, plus any stop we attach a dossier to, such as `pool` or `front`).
   - Each entry in `DOSSIERS` has: `no`, `kicker`, `key` (matching a `KEYS` id), `anchor` (3D world point in `world.anchors`), `title` (array of display lines), `meta` (bottom line on the floating card), `fileMeta`, `text` (main copy inside the slide-over drawer), and `facts` (key-value specification/service rows inside the drawer).
3. **`shared/fx-experience.js` (556 lines):**
   - Builds the `.spot` reticles and `.tag` cards from `cfg.dossiers` (lines 152-203).
   - Projects 3D anchors into screen space with perspective skew (`placeLabels`, lines 235-252).
   - Drives `.ruler` tick marks and `[data-to]` smooth scroll navigation (lines 254-320).
   - Populates and opens/closes the `.file` slide-over drawer (`openFile`, lines 322-355).
4. **`001 Lintel/theme.css` (143 lines) & `shared/fx-ui.css` (153 lines):**
   - Typography tokens (`--display`, `--label`, `--body`), card styles (`.tag`, `.reticle`), topbar, titleblock, slide-over drawer (`.file`), and finale layout.

---

## 4. Proposed Stop-by-Stop Landing Page Map (`DOSSIERS` & HUD)

Instead of labeling cards `ROOM 01 · THE ENTRANCE · 8.00 × 9.00 m` (which reads like selling one house), each stop along the scroll walk becomes a real landing page section for **Lintel** (an integrated Architecture, Build & Staging practice):

| Stop # | Camera Stop (`key`) | Card Kicker & Title | Card Summary / Metrics (`meta`) | Slide-Over Drawer (`file`) Focus |
| :--- | :--- | :--- | :--- | :--- |
| **Hero** | `plan` (`0 vh`) | **Every home starts as a plan. We build and stage the rest.** | `Architecture · Construction · Interior Staging` | Titleblock shows **Practice: Lintel Studio**, **Track Record: 18 Years / 42 Estates**, **Model: Turnkey Design-Build**, **Case Study: Casa Serra (No. 14)**. |
| **01** | `hall` (Entrance) | `01 · SERVICE PILLAR I` <br> **Architectural Planning** | `Feasibility · 1:200 Plans · Permitting · Explore +` | How Lintel takes raw land from topographic survey and structural drawings to monumental volumes and daylight engineering. |
| **02** | `living` (Living Room) | `02 · SERVICE PILLAR II` <br> **Interior Staging & Curation** | `Bespoke Furniture · Textiles · Fine Art · Explore +` | Full-residence staging and custom furniture design (bouclé pit sofas, monolithic stone tables, commissioned canvas works) tailored to each room's proportions. |
| **03** | `kitchen` (Kitchen) | `03 · SERVICE PILLAR III` <br> **Bespoke Millwork & Systems** | `In-House Joinery · Gaggenau/Sub-Zero · MEP · Explore +` | Our in-house cabinet workshop and engineering team: floor-to-ceiling fumed walnut cabinetry, stone islands, and concealed climate and lighting systems. |
| **04** | `dining` (Dining) | `04 · MATERIAL ATELIER` <br> **Direct-from-Quarry Sourcing** | `Whole-Trunk Timber · Roman Travertine · Brass · Explore +` | Direct sourcing of single-tree walnut slabs, monolithic blocks of Calacatta and Jura stone, and hand-spun brass fixtures from European quarries and foundries. |
| **05** | `wine` (Wine Cellar) | `05 · PRIVATE COMMISSIONS` <br> **Specialty Spaces & Cellars** | `Climate Engineering · Alabaster & Walnut · Explore +` | Custom collector environments: 13 °C climate-controlled wine cellars, private screening rooms, libraries, and wellness spas. |
| **06** | `olive` (Olive Patio) | `06 · THE PRACTICE` <br> **18 Years of Built Work** | `Founded 2008 · 42 Residences · Lisbon & Zurich · Explore +` | Company history, philosophy, and hard numbers: 18 years in business, 42 completed private estates, 100% single-contract accountability. |
| **07** | `gallery` (Glass Gallery) | `07 · THE TEAM` <br> **Architects, Builders & Curators** | `28 Specialists · 3 Founding Partners · Meet the Team +` | Partner bios, structural engineers, master joiners, and interior curators who stay on a single project from first sketch to key handover. |
| **08** | `bedroom` (Master Suite) | `08 · THE PROCESS` <br> **One Contract, Zero Friction** | `Fixed Timeline · Guaranteed Budget · See Timeline +` | How a client works with Lintel across 4 transparent milestones (01 Concept & Plan, 02 Engineering & Shell, 03 Millwork & Finishes, 04 Furnishing & Styling). |
| **09** | `bath` (Dressing & Bath) | `09 · WHITE-GLOVE HANDOVER` <br> **Staged to the Last Detail** | `Wardrobes · Spa Fixtures · Lighting Scenes · Explore +` | Turnkey Move-In Ready delivery: from custom walnut dressing rooms and monolithic stone baths to linens, tableware, and art lighting. |
| **10** | `garden` (Private Garden) | `10 · LANDSCAPE & ESTATE` <br> **Pools, Pergolas & Grounds** | `Infinity Pools · Native Groves · Outdoor Living · Explore +` | Full site and landscape architecture: reflection pools, teak pergolas, outdoor fire lounges, mature olive trees, and native perennial borders. |
| **Finale** | `finale` (End Sheet) | **Bring us a site, a sketch, or a room.** | **Interactive Project Inquiry / Consultation Booking** | Service selector (`Full Turnkey Residence`, `Architectural Planning`, `Interior Staging & Curation`), project location/timeline, studio addresses, and updated credits (`100% Procedural Code Architecture`). |

---

## 5. High-Impact UI Upgrades to Explore in the New Session

1. **Upgraded Top Navigation Bar (`.topbar`):**
   - Keep the clean architectural restraint, and add direct jump-scroll links in the top bar (`Services`, `Craft`, `Track Record`, `Team`, `Process`, plus the `Start a project` CTA pill) wired via `data-to` so visitors can either scroll naturally through the house or jump straight to a business section.
2. **Richer Floating Cards (`.tag`):**
   - Right now `.tag` only shows a 2-word title and a dimension string. We can add a concise 2-line editorial value proposition and a pair of crisp metric pills right on the floating card so visitors get the full landing-page story even without clicking `Explore +` on every stop.
3. **Interactive Time-of-Day Switcher in the HUD:**
   - Wire a sleek 4-state lighting toggle (`Morning · Noon · Golden · Night`) in the HUD calling `window.__light.setTod(name)` (or lock in Sam's single favorite time of day as the default and offer the toggle as a "Lighting Study" control).
4. **Upgraded Side Drawer (`.file`) & Finale Inquiry Flow (`.finale`):**
   - Give the `.file` drawer richer structured content (deliverables checklist, timeline badges, team portraits/credits, and a direct `Inquire about this service ->` button).
   - Upgrade `.finale` from a static paragraph into a real agency conversion section (service pillars summary, studio locations, interactive scope selector, and accurate `100% Procedural WebGL2` colophon replacing the outdated `Materials: Poly Haven, CC0` line).

---

## 6. Final Loading & Performance Optimization Plan (Phase 2 of Iteration 9)

Once Sam approves the UI and landing page copy:
1. **Progressive Load-Time Cubemap Capture:** Spread the 8 indoor room cubemap probe captures (`house-looks.js` `capture()`) across `requestAnimationFrame` ticks while the loader bar (`#loadFill`, `#loadPct`) animates from `0%` to `100%`, eliminating the single-frame main-thread pause on boot.
2. **Shader Program Cache & Dead-Code Cleanup:** Prune unused legacy scan fallbacks or test switches if Sam no longer needs `?code=none`, and minify JS/CSS for production.
3. **Verification:** Run `tools/probe.mjs` and `tools/flicker.mjs` across desktop (`1728x992`) and mobile (`390x844`) viewports to ensure 60 fps scrolling and zero layout overlap.

---

## 7. First Step for the New Session

1. Start the local server (`python3 tools/serve.py 8014` from `/Users/sam/Projects/Landing Pages/Interactive 3D/002 Lintel Flat 2D`).
2. Ask Sam two quick kickoff questions (or prototype the options visually right on `http://127.0.0.1:8014/001%20Lintel/`):
   - Which Time of Day (`morning`, `noon`, `golden`, `night`) should be the default on load, and should we include a small `Morning / Noon / Golden / Night` switcher pill in the HUD?
   - Does the 10-stop **Architecture + Build + Staging Studio** landing page map above match his vision for the cards, top navigation, and finale conversion section?
