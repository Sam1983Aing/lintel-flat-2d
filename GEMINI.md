# Project Brief and Rules: Flat 2D / 001 Lintel (Gemini Workspace)

**Workspace Root:** `/Users/sam/Projects/Landing Pages/Interactive 3D/002 Lintel Flat 2D`
**Active Landing Page:** `/Users/sam/Projects/Landing Pages/Interactive 3D/002 Lintel Flat 2D/001 Lintel`

## 1. Sam's Global Rules (Read First)

- **No em dashes and no semicolons:** Never use em dashes or semicolons in anything written for Sam, including chat replies, code comments shown to him, documentation, and page copy. Use periods, commas, parentheses, colons, or line breaks instead. Avoid "+" as a bullet connector. Write in plain, concrete first-person prose.
- **Visual over text:** Sam is visual. When proposing design, material, or staging changes, build options behind URL query parameters (like `?look=`, `?facade=`, `?bake=`), capture comparison stills or clips with the tools in `tools/`, and show him the result rather than listing abstract text choices.
- **Trust measurements and live renders:** Measure frame times, flicker (`tools/flicker.mjs`), and screen-space bounds (`tools/probe.mjs`, `tools/room_closeups.py`).
- **Keep the teachable record:** Quietly maintain `teach/journal.md`, `teach/session-log.md` (next entry: 205), and `teach/decisions.md` (next row: 354). Never overwrite frozen version folders (`v1/` through `v8d/`). Commit or push only when asked.

---

## 2. Where `001 Lintel` Stands (V9 Complete in `001 Lintel/`, Starting V10 in `001 Lintel/v10/`)

Lintel (Casa Serra) is an interactive architectural landing page where a flat 1:200 floor plan (a horizontal section cut at 1.2 m viewed through a 3 degree lens with ink poché backfaces) rises into a full 3D house as you scroll, revealing materials room by room via the `laid` fill sweep.

### Active Directories & Live URLs (`python3 tools/serve.py 8014`)
- **V9 (`001 Lintel/`, `http://127.0.0.1:8014/001%20Lintel/`):** Completed Iteration 9 service landing page with the full-screen blueprint hero and all 3D room, garden, pool, lighting, curtain, and doorway refinements.
- **V10 (`001 Lintel/v10/`, `http://127.0.0.1:8014/001%20Lintel/v10/`):** Isolated V10 workspace with its own `001 Lintel/v10/shared/` engine copy. Features the Dark Studio Workstation loader (`#loader` with `.loader__desk` and 4 live dataset counters), the dark smoked-walnut architect's desk (`deskSurface` in `001 Lintel/v10/shared/fx-post.js`), the 3D cylindrical paper roll-out (`deskUnroll` in `scene.js`), the `-3°` angled `A-101` blueprint sheet (`cardScale: 0.62`, `cardRot: -0.052`, `cardCenter: [0.655, 0.49]`), the left-column Hero layout (`html.on-desk`), and smooth scroll-in expansion (`s = 6..96`) into the 3D house walk.

### Key Files in `/Users/sam/Projects/Landing Pages/Interactive 3D/002 Lintel Flat 2D`
- `001 Lintel/v10/index.html` & `001 Lintel/v10/theme.css`: V10 Dark Studio Workstation loader, topbar (`Services / Craft / Practice / Team / Process` + `Start a Project`), left-hand desk Hero layout (`html.on-desk`), bottom-left Time-of-Day switcher (`Morning / Noon / Golden / Night`), 10-chapter service drawer (`.file`), and consultation Finale (`#finale`).
- `001 Lintel/v10/shared/fx-post.js` & `001 Lintel/v10/shared/fx-experience.js`: V10 post-processing shader with `deskSurface(vUv)` (dark walnut planks, overhead studio lamp pool, drafting mat datum grid, and recessed brass metric scale rule), 3D unrolling paper cylinder (`cardUnroll`), angled blueprint sheet (`cardOn`, `cardScale`, `cardRot`, `cardCenter`, `cardBorder`), and live telemetry loader progress.
- `001 Lintel/scene.js` & `001 Lintel/v10/scene.js` (3,833 lines): Room table (`ROOMS`), openings (`OPEN`), camera path (`KEYS`), 10-chapter service cards (`DOSSIERS`), `IS_V10` desk roll-out and scroll-in expansion (`deskUnroll`, `deskExpand`), planar-reflection pools (`buildPool`), and reverse ceiling disappearance on final ascent.
- `001 Lintel/staging.js` & `001 Lintel/v10/staging.js` (5,771 lines): All high-craft 3D furniture, appliances, lighting rails, art, botanical foliage, sheer curtains, and garden staging.
- `001 Lintel/code-materials.js` & `001 Lintel/v10/code-materials.js` (5,003 lines): 100% procedural GLSL material library (`window.LINTEL_CODEMAT`).
- `001 Lintel/house-looks.js` & `001 Lintel/light-options.js` (synced in `v10/`): Async-yielding per-room reflection probe builder and 4 zero-download Time-of-Day lighting presets (`golden` default).
- `tools/`: Local server (`python3 tools/serve.py 8014`), headless DevTools probe (`tools/probe.mjs`), close-up capture (`tools/room_closeups.py`), offline video walk (`tools/walk_offline.mjs`), and flicker benchmark (`tools/flicker.mjs`).

---

## 3. Antigravity 3D Realism & Texture Workflow for Testing

1. **Step 1 (Generate Visual Target):** Use the `image-generator` subagent to generate studio architectural reference photos (or seamless tileable textures) for any furniture piece or surface Sam wants to upgrade.
2. **Step 2 (Multimodal Deconstruction):** Inspect the generated reference image with `view_file` to extract exact dimensional ratios, cushion loft, bevel radii, and micro-surface relief before editing `001 Lintel/staging.js` or `001 Lintel/code-materials.js`.
3. **Step 3 (Shader & Geometry Upgrade):** Translate the reference into high-craft geometry in `staging.js` (bevelled profiles, spline extrusions, lathe curves) and multi-scale procedural or baked shaders in `code-materials.js` (or custom tileable textures if requested).
4. **Step 4 (Live Verification):** Run `python3 tools/serve.py 8014` from `/Users/sam/Projects/Landing Pages/Interactive 3D/002 Lintel Flat 2D`, inspect at `http://127.0.0.1:8014/001%20Lintel/`, capture stills with `tools/probe.mjs` or `tools/room_closeups.py`, and verify zero new flicker with `tools/flicker.mjs`.

