/* ==========================================================================
   Lintel / Casa Serra, iteration 2: the plan you walk into.

   The plan IS the model. The house is cut by a horizontal plane at 1.2 m
   (a real clipping plane) and seen straight down through a 3 degree lens.
   Every drawable material is double sided, and where the cut opens a wall
   you look at the inside of its box: those back faces are drawn as solid
   ink, which is exactly what an architect's poché is. Raising the cut makes
   the walls grow out of the drawing.

   Rooms stay ink on paper until you step in. A single table of room
   rectangles (uniform arrays shared by every material) tells each pixel
   which room it belongs to, so one plaster material can be real in the
   entrance and still a drawing next door. The reveal is a sphere growing
   from the doorway with a thin oxide line on its front.

   Plan coordinates: x east, y south, in metres, origin at the north-west
   corner of the house. World: X = x - 30, Z = y - 24, Y up.
   ========================================================================== */
(function () {
  'use strict';

  const V3 = THREE.Vector3;
  const TEX = '../../assets/tex/';
  const SKY = '../../assets/sky/';
  const ACCENT = new THREE.Color((getComputedStyle(document.documentElement).getPropertyValue('--accent') || '').trim() || '#b8452a');
  const HERO = window.LINTEL_HERO || null;                // optional hero switches, see hero-options.js
  const LIGHT = window.LINTEL_LIGHT || null;              // optional light looks (?light=), see light-options.js
  const FACADE = window.LINTEL_FACADE || null;            // optional materials for the outside walls (?facade=), see facade-options.js
  const HOUSE = window.LINTEL_HOUSE || null;              // optional: rooms lit as rooms (?lit=), rooms in code materials (?code=), see house-looks.js
  const OX = 30, OZ = 24;
  const INK_NONE = new URLSearchParams(location.search).get('ink') === 'none';
  const STEADY = new URLSearchParams(location.search).has('steady');   // tools: keep the full pixel budget however slow the machine is
  const WX = (x) => x - OX, WZ = (y) => y - OZ;

  // ?salt=N (tools only): every shader the page sends to the graphics card gets a line that depends on N, so no shader
  // cache can help and a load measures what a first visit costs. (The Mac keeps compiled shaders across browser profiles.
  // code-materials.js salted only its own materials until 15 Oct, so the 185 s measured on 14 Oct had the base page warm.)
  // Each stage of the load leaves its time in window.__bootT, in ms from navigation.
  const BOOT_T = (window.__bootT = window.__bootT || {});
  const bootMark = (k) => { BOOT_T[k] = Math.round(performance.now()); };
  {
    const salt = Number(new URLSearchParams(location.search).get('salt')) || 0;
    if (salt && window.WebGL2RenderingContext) {
      const P = WebGL2RenderingContext.prototype, src = P.shaderSource, type = new WeakMap(), mk = P.createShader;
      P.createShader = function (t) { const s = mk.call(this, t); if (s) type.set(s, t); return s; };
      P.shaderSource = function (s, code) {
        const n = (salt % 1e6) | 0;
        const line = type.get(s) === this.FRAGMENT_SHADER ? `if (gl_FragCoord.x < -${n}.5) discard;` : `if (gl_VertexID == -${n}) { gl_Position = vec4(0.0); return; }`;
        return src.call(this, s, code.replace(/void\s+main\s*\(\s*(void)?\s*\)\s*\{/, (m) => m + '\n' + line + '\n'));
      };
    }
  }

  /* ---------- the house: rooms in plan coordinates ---------------------------
     r: [x0, y0, x1, y1]. h: ceiling height. walls: per side material overrides.
     label: where the room name is written on the plan. */
  const ROOMS = [
    { id: 'media', r: [0, 0, 9, 8], name: 'Media', label: [4.5, 1.3] },
    { id: 'kitchen', r: [9, 0, 25, 8], name: 'Kitchen and dining', label: [14.4, 1.45],          // (the living's oak runs on since 13 Oct; travertine tiles before)
      skylights: [[12.9, 4.9, 14.1, 6.1], [14.9, 4.9, 16.1, 6.1], [16.9, 4.9, 18.1, 6.1]] },
    { id: 'wine', r: [25, 0, 29, 8], name: 'Wine', small: true, label: [27, 4.2], floor: 'trav' },
    { id: 'study', r: [29, 0, 38, 8], name: 'Study', label: [33.5, 3.7] },      // (north of where the glass wall's mullions fall across the floor in the tilted view, and far enough that the wall's own top line stays clear of the figures)
    { id: 'library', r: [38, 0, 44, 8], name: 'Library', label: [41, 2.5], subSize: 0.42 },
    { id: 'guest1', r: [0, 8, 9, 16], name: 'Guest suite', label: [6.2, 13.55], nameSize: 0.62, subSize: 0.4 },
    { id: 'guest2', r: [0, 16, 9, 24], name: 'Guest suite', label: [6.2, 21.55], nameSize: 0.62, subSize: 0.4 },
    { id: 'garage', r: [0, 24, 9, 32], name: 'Garage', label: [4.5, 30.5], floor: 'conc', sub: false },   // (no "3 cars" under it: the three cars are drawn, and the words lay on the door's dashed line)
    //   // 3.6 like the wing it ends: at 3.0 the cut passed over it and it stood on the sheet as a white box
    { id: 'living', r: [9, 8, 21, 17], name: 'Living', label: [15, 15.55], h: 4.5, clerestory: true },
    { id: 'hall', r: [9, 17, 11, 26], name: 'Hall', small: true, label: [10, 21.5], rot: -Math.PI / 2, floor: 'trav' },
    { id: 'entrance', r: [11, 17, 19, 26], name: 'Entrance', label: [15.25, 19.4], h: 4.8, floor: 'marble', walls: { W: 'concreteIn', E: 'concreteIn', N: 'limewashEntry' }, clerestory: true },
    { id: 'wc', r: [19, 17, 21, 26], name: 'WC', small: true, label: [20, 21.5], rot: -Math.PI / 2, floor: 'trav' },
    { id: 'patio', r: [21, 8, 41, 32], name: 'Patio', outdoor: true, label: [36, 11.3] },
    { id: 'gallery', r: [41, 8, 44, 32], name: 'Glass gallery', label: [42.5, 20], rot: -Math.PI / 2, floor: 'nero', walls: { E: 'limewash', N: 'limewash', S: 'limewash' } },   // (travertine and white until 13 Oct)
    { id: 'bedroom', r: [41, 32, 51, 41], name: 'Master bedroom', label: [46.95, 38.9], nameSize: 0.68, subSize: 0.48, floor: 'nero', walls: { N: 'larch' } },
    { id: 'dressing', r: [51, 32, 59, 35], name: 'Dressing', label: [54.3, 33.9], sub: false },
    { id: 'bath', r: [51, 35, 59, 41], name: 'Bath', label: [55.0, 37.2], subSize: 0.42, floor: 'porcelain' },        // (travertine until 13 Oct)
    { id: 'garden', r: [41, 41, 62, 50], name: 'Private garden', outdoor: true, label: [50.2, 42.75] },
    // Not a room: the lawn south of the patio, out to the stone wall and the cypresses. It used to belong to "outside",
    // which is real from the front door on, so from the patio the far lawn was finished while the loungers in front of
    // it were still paper. Now the patio's scan runs on across it (iteration 4).
    { id: 'yard', r: [23, 32, 41, 56], name: 'Yard', outdoor: true, hidden: true, label: [32, 44] },
  ];
  const RM = {};
  ROOMS.forEach((r, i) => { r.i = i; r.h = r.h || 3.6; RM[r.id] = r; });
  const NR = ROOMS.length;
  // How a room turns from drawing to material. Sam picked "laid" on 6 Oct (slabs and panels arrive piece by piece).
  // The others stay behind ?fill=: level, section, and circle (the sphere growing from the door, iteration 2).
  const FILLS = { circle: 0, level: 1, section: 2, laid: 3 }, fillAsked = new URLSearchParams(location.search).get('fill');
  const FILL = fillAsked in FILLS ? FILLS[fillAsked] : FILLS.laid;
  if (HERO) HERO.init({ ROOMS, OX, OZ, ru: () => RU });
  const ROOF = 0.35;

  /* openings. axis 'h' = a wall line along x at y = c, 'v' = along y at x = c.
     open: a doorway with no leaf. door: a leaf standing open at 90 degrees into
     `into`, hinged at end a or b. glass: floor to ceiling glazing. */
  const OPEN = [
    // north facade
    { axis: 'h', c: 0, a: 1, b: 8, type: 'glass' },
    { axis: 'h', c: 0, a: 10.5, b: 23.5, type: 'glass' },
    { axis: 'h', c: 0, a: 30, b: 37, type: 'glass' },
    { axis: 'h', c: 0, a: 39, b: 43, type: 'glass' },
    // y = 8: living to kitchen, kitchen and the north bar to the patio, library to gallery
    { axis: 'h', c: 8, a: 11, b: 19, type: 'open', head: 3.6 },
    { axis: 'h', c: 8, a: 21.3, b: 22.95, type: 'glass' },
    { axis: 'h', c: 8, a: 23.05, b: 24.7, type: 'open' },
    { axis: 'h', c: 8, a: 30, b: 37, type: 'glass' },
    { axis: 'h', c: 8, a: 38.3, b: 40.7, type: 'glass' },
    { axis: 'h', c: 8, a: 41.4, b: 43.6, type: 'open', head: 3.0 },
    // y = 17: entrance into living
    { axis: 'h', c: 17, a: 12, b: 18, type: 'open', head: 3.6 },
    // y = 26: the pivot door
    { axis: 'h', c: 26, a: 13.8, b: 16.2, type: 'pivot', pivot: 14.3, head: 4.2 },
    // y = 32: garage door, gallery into the bedroom, bedroom window
    { axis: 'h', c: 32, a: 0.5, b: 8.5, type: 'open', head: 2.6 },
    { axis: 'h', c: 32, a: 41.4, b: 43.6, type: 'open', head: 3.0 },
    // dressing into bath
    { axis: 'h', c: 35, a: 55, b: 57, type: 'open', head: 3.0 },
    // south glass to the garden
    { axis: 'h', c: 41, a: 41.4, b: 50.6, type: 'glass' },
    { axis: 'h', c: 41, a: 51.4, b: 55.1, type: 'glass' },
    { axis: 'h', c: 41, a: 55.2, b: 57.8, type: 'open', head: 3.0 },
    { axis: 'h', c: 41, a: 57.9, b: 58.6, type: 'glass' },
    // west facade
    { axis: 'v', c: 0, a: 1.5, b: 6.5, type: 'glass' },
    { axis: 'v', c: 0, a: 9.5, b: 14.5, type: 'glass' },
    { axis: 'v', c: 0, a: 17.5, b: 22.5, type: 'glass' },
    // x = 9: doors off the kitchen, living and hall
    { axis: 'v', c: 9, a: 5, b: 6.4, type: 'door', into: 'media', hinge: 'b' },
    { axis: 'v', c: 9, a: 9, b: 10.2, type: 'door', into: 'guest1', hinge: 'a' },
    { axis: 'v', c: 9, a: 19, b: 20.2, type: 'door', into: 'guest2', hinge: 'a' },
    { axis: 'v', c: 9, a: 24.5, b: 25.7, type: 'door', into: 'garage', hinge: 'b' },
    // entrance side doors
    { axis: 'v', c: 11, a: 20.5, b: 22, type: 'open', head: 3.0 },
    { axis: 'v', c: 19, a: 20.5, b: 21.5, type: 'door', into: 'wc', hinge: 'b' },
    // living and gallery glass to the patio
    { axis: 'v', c: 21, a: 8.4, b: 16.6, type: 'glass' },
    { axis: 'v', c: 25, a: 0.6, b: 7.4, type: 'glass' },
    { axis: 'v', c: 38, a: 5, b: 6.2, type: 'door', into: 'library', hinge: 'b' },
    { axis: 'v', c: 41, a: 8.3, b: 10.5, type: 'glass' },
    { axis: 'v', c: 41, a: 10.6, b: 12.6, type: 'open' },
    { axis: 'v', c: 41, a: 12.7, b: 31.7, type: 'glass' },
    { axis: 'v', c: 41, a: 32.5, b: 40.5, type: 'glass' },
    { axis: 'v', c: 51, a: 32.6, b: 34.4, type: 'open', head: 3.0 },
  ];

  // High windows laid out by hand, per room and wall line (room|axis|line). 'plain': no high window on that wall. Otherwise
  // the wall's whole span (across the runs it is split into), its bands of glass, and panes per band.
  // (14 Oct, Sam on the living room: "just add windows on two sides; that small window on the third side, a plain wall
  // instead... make sure there's no wall between... equal width". The west wall's band was cut in two at the guest rooms'
  // party wall by a 30 cm pier, with a 70 cm window after it, and two small ones stood over the hall and the WC. Now: the
  // north and the west only, every pane 1.67 m, the west's two either side of the fireplace's breast, which runs up to
  // the ceiling.)
  // (Later the same day: "connect both windows from those two walls together, make sure there's no gap between". The north
  // and west bands now run into the north-west corner and meet at a bronze post; the north has six panes of 1.95 m, the
  // west one of 1.87 m either side of the fireplace's breast, which moved 20 cm north to stand in the band's middle.)
  const CLERE = {
    'living|h|17': 'plain',
    'living|h|8': { span: [9, 21], glass: [[9.132, 20.85]], panes: 6 },
    'living|v|9': { span: [8, 17], glass: [[8.132, 10.0], [15.0, 16.87]], panes: 1 },
  };

  /* ---------- the room table every material reads ---------------------------- */
  const RU = {
    uRR: { value: ROOMS.map((r) => new THREE.Vector4(WX(r.r[0]), WZ(r.r[1]), WX(r.r[2]), WZ(r.r[3]))) },
    uRO: { value: ROOMS.map((r) => new THREE.Vector4(WX((r.r[0] + r.r[2]) / 2), 0.5, WZ((r.r[1] + r.r[3]) / 2), 20)) },
    uRV: { value: new Array(NR).fill(0) },
    uXO: { value: new THREE.Vector4(0, 0, 0, 60) },
    uXV: { value: 0 },
    uCutOn: { value: 1 },
    uAccent: { value: ACCENT },
    uRD: { value: ROOMS.map((r) => new THREE.Vector4(0, -1, 9, r.h)) },   // fill: direction x, z, length, height
    uXD: { value: new THREE.Vector4(1, 0, -34, 5.2) },                    // outside opens to both sides of the door (negative length: both ways)
    uFill: { value: FILL },
    uRI: { value: new Array(NR).fill(1) },               // how much of each room's ink is on the sheet (the hero draws it in)
    uXI: { value: 1 },
    uTele: { value: 1 },                                  // 1 while the view is a plan (the lens under 6 degrees), 0 from 30 degrees on
    uCutY: { value: 1e5 },                                // the cut's height, for the depth pass (see "the depth pass, taught about paper")
    uRoll: { value: new THREE.Vector3(1, 0, -1e6) },      // the roll of paper at the end: a line on the ground (normal x, z and distance), drawing behind it
  };
  const ROOM_GLSL = `
    uniform vec4 uRR[${NR}]; uniform vec4 uRO[${NR}]; uniform float uRV[${NR}];
    uniform vec4 uXO; uniform float uXV; uniform float uCutOn; uniform vec3 uAccent; uniform float uRI[${NR}]; uniform float uXI;
    uniform vec4 uRD[${NR}]; uniform vec4 uXD; uniform float uFill; uniform vec3 uRoll;
    float gInk = 1.0; vec4 gDir = vec4(0.0, -1.0, 9.0, 3.6);
    float rh2(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
    void roomOf(vec3 wp, vec3 wn, out float rev, out vec4 org) {
      vec2 q = wp.xz + wn.xz * 0.06;
      // the gallery's glass wall onto the patio is the gallery's: its frames and the band over them arrive with that room,
      // not with the court in front of it (they stood finished round paper panes)
      if (wp.y > 0.02 && abs(wp.x - ${WX(41).toFixed(2)}) < 0.27 && wp.z > ${WZ(8).toFixed(2)} && wp.z < ${WZ(32).toFixed(2)}) q.x = ${(WX(41) + 0.3).toFixed(2)};
      rev = uXV; org = uXO; gInk = uXI; gDir = uXD;
      // (find the room first, then read its numbers once. Read inside the loop, five numbers for each of twenty rooms,
      // it cost Metal 1.35 s more to build every shader of the house: about a minute of a first visit's load. 15 Oct)
      int k = -1;
      for (int i = 0; i < ${NR}; i++) {
        vec4 r = uRR[i];
        if (q.x > r.x && q.x < r.z && q.y > r.y && q.y < r.w) { k = i; break; }
      }
      if (k >= 0) { rev = uRV[k]; org = uRO[k]; gInk = uRI[k]; gDir = uRD[k]; }
    }
    float revealAt(vec3 wp, vec3 wn, float rev, vec4 org, out float ring) {
      float on = step(0.001, rev) * step(rev, 0.998);
      if (uFill < 0.5) {
        float dA = distance(wp, org.xyz);
        float front = rev * org.w;
        float soft = 0.03 + org.w * 0.002;
        ring = (1.0 - smoothstep(0.0, max(fwidth(dA) * 1.6, 0.012), abs(dA - front))) * on;
        // (a room that has not started stays pure paper: the soft edge must not leak round its origin)
        return rev >= 0.999 ? 1.0 : rev <= 0.001 ? 0.0 : 1.0 - smoothstep(front - soft, front + soft, dA);
      }
      // every point gets a moment t (0 to 1) at which it turns real, and the oxide line is where t meets the front
      bool both = gDir.z < 0.0;                                    // a negative length runs both ways from the start
      float L = abs(gDir.z);
      vec2 d2 = wp.xz - org.xz;
      float along = dot(d2, gDir.xy) / L;
      along = clamp(both ? abs(along) : along, 0.0, 1.0);
      float H = gDir.w, y = max(wp.y, 0.0);
      float front = rev * 1.08 - 0.04;
      if (uFill < 2.5) {
        float t = along;                                           // section: a plane walks through the room ahead of you
        if (uFill < 1.5) {
          // level: the floor runs away from the door, then a level line climbs the walls, then the ceiling closes
          t = 0.3 + 0.56 * clamp(y / H, 0.0, 1.0);
          if (wn.y > 0.7 && y < 0.08) t = 0.3 * along;
          if (wn.y < -0.7 && y > H - 0.2) t = 0.88 + 0.12 * (1.0 - along);
        }
        float w = clamp(fwidth(t), 1e-5, 0.004);
        ring = (1.0 - smoothstep(0.7, 2.4, abs(t - front) / w)) * on;
        return rev >= 0.999 ? 1.0 : 1.0 - smoothstep(-w, w, t - front);
      }
      // laid: slabs and panels arrive one piece at a time, course by course from the door
      vec3 cw = wp; vec2 id; float edge;
      if (abs(wn.y) > 0.7) {
        vec2 sz = abs(gDir.x) > 0.5 ? vec2(0.6, 1.2) : vec2(1.2, 0.6);
        // a ceiling arrives as boards right across the room: in slabs its front was a staircase overhead
        if (wn.y < -0.7) sz = abs(gDir.x) > 0.5 ? vec2(0.6, 4000.0) : vec2(4000.0, 0.6);
        vec2 c = (wp.xz + 1000.0) / sz;
        if (sz.x > sz.y) c.x += 0.5 * mod(floor(c.y), 2.0); else c.y += 0.5 * mod(floor(c.x), 2.0);
        id = floor(c); vec2 f = fract(c);
        edge = min(min(f.x, 1.0 - f.x) * sz.x, min(f.y, 1.0 - f.y) * sz.y);
        vec2 ctr = id + 0.5;
        if (sz.x > sz.y) ctr.x -= 0.5 * mod(id.y, 2.0); else ctr.y -= 0.5 * mod(id.x, 2.0);
        cw.xz = ctr * sz - 1000.0;
      } else {
        bool nx = abs(wn.x) > abs(wn.z);
        vec2 c = vec2(nx ? wp.z : wp.x, wp.y) / 1.2;
        id = floor(c); vec2 f = fract(c);
        edge = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)) * 1.2;
        vec2 ctr = (id + 0.5) * 1.2;
        if (nx) cw.z = ctr.x; else cw.x = ctr.x;
        cw.y = ctr.y; id += 37.0;
      }
      vec2 dc = cw.xz - org.xz;
      float ac = dot(dc, gDir.xy) / L;
      ac = clamp(both ? abs(ac) : ac, 0.0, 1.0);
      float t = 0.82 * ac + 0.1 * rh2(id) + 0.08 * clamp(cw.y / H, 0.0, 1.0);
      float local = (front - t) / 0.07;
      float px = max(length(fwidth(wp)), 1e-4);
      float line = 1.0 - smoothstep(px * 0.5, px * 1.8, edge);
      float band = max(1.0, L / 9.0);                              // in a 24 m gallery the outlines trailed five metres behind the front
      ring = line * smoothstep(0.0, 0.3, local) * (1.0 - smoothstep(1.3 / band, 2.4 / band, local)) * on;
      return rev >= 0.999 ? 1.0 : smoothstep(0.45, 1.15, local);
    }`;

  /* ---------- drawable: any standard material, paper until its room arrives -- */
  const HATCH = { none: 0, concrete: 1, stone: 2, timber: 3, glass: 4, water: 5, gravel: 7 };
  function drawable(mat, hatch, opts) {
    opts = opts || {};
    const h = HATCH[hatch] || 0;
    const force = opts.room == null ? -1 : opts.room === 'ext' ? -2 : RM[opts.room].i;
    mat.side = opts.side == null ? THREE.DoubleSide : opts.side;
    mat.userData.drawable = true;
    if (opts.room && opts.room !== 'ext') mat.userData.room = opts.room;    // (house-looks.js: a thing forced into a room belongs to it)
    mat.userData.drawOpts = Object.assign({ hatch }, opts);               // (code-materials.js: a material written in code keeps the drawing's hatch and options)
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, RU);
      sh.uniforms.uGlassOp = { value: opts.glassOpacity || 0.3 };
      sh.uniforms.uSat = { value: opts.sat == null ? 1 : opts.sat };
      sh.uniforms.uMacro = { value: opts.macro || 0 };
      sh.vertexShader = 'varying vec3 vDrawW; centroid varying float vCutH; attribute float aDecor; varying float vDecor; varying vec3 vCtr;\n#ifndef USE_COLOR\nattribute vec3 color;\n#endif\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
        vDecor = aDecor;
        // staging.js writes the middle of the thing a piece belongs to into its (otherwise unused) colour attribute: x, z, 2
        #ifdef USE_COLOR
          vCtr = vec3(0.0);
        #else
          vCtr = color;
        #endif
        vec4 dwp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          dwp = instanceMatrix * dwp;
        #endif
        vDrawW = (modelMatrix * dwp).xyz; vCutH = vDrawW.y;`);
      // A body that is only there for the view from above (the shade inside an olive's crown): it shrinks to nothing as
      // the eye comes down beside it. Seen from the garden against the evening sky it was a black egg in the tree.
      if (opts.fromAbove) sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          #ifdef USE_INSTANCING
            vec3 bodyAt = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          #else
            vec3 bodyAt = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          #endif
          vec3 toEye = cameraPosition - bodyAt;
          transformed *= smoothstep(0.22, 0.5, toEye.y / max(length(toEye), 1e-3));
        }`);
      sh.fragmentShader = `
        #define HATCH ${h}
        ${force >= 0 ? `#define FORCE_ROOM ${force}` : ''}
        ${force === -2 ? '#define FORCE_EXT' : ''}
        ${opts.glass ? '#define GLASS' : ''}
        ${opts.glassPaper ? '#define GLASS_PAPER' : ''}
        ${opts.farFlat ? '#define FAR_FLAT' : ''}
        ${opts.noCap ? '#define NO_CAP' : ''}
        ${opts.inkCut ? '#define INK_CUT' : ''}
        ${opts.noRing ? '#define NO_RING' : ''}
        varying vec3 vDrawW; varying float vDecor; varying vec3 vCtr;
        centroid varying float vCutH; uniform float uCutY;
        uniform float uGlassOp; uniform float uSat; uniform float uMacro;
        ${ROOM_GLSL}
        float vn(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          float n = dot(i, vec3(1.0, 57.0, 113.0));
          vec4 a = fract(sin(vec4(n, n + 1.0, n + 57.0, n + 58.0)) * 43758.5453);
          vec4 b = fract(sin(vec4(n + 113.0, n + 114.0, n + 170.0, n + 171.0)) * 43758.5453);
          vec4 c = mix(a, b, f.z); vec2 d = mix(c.xy, c.zw, f.y); return mix(d.x, d.y, f.x); }
        float dh(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
        float lineAA(float c, float period, float width) {
          float f = abs(fract(c / period + 0.5) - 0.5) * period;
          float px = max(fwidth(c), 1e-4), w = px * width;
          // lines closer together than about three pixels turn into a comb that crawls: they fade out first
          return (1.0 - smoothstep(w * 0.5, w * 1.5, f)) * (1.0 - smoothstep(period * 0.16, period * 0.4, px));
        }
        float hatchOf(vec3 wp, vec3 wn) {
          bool horiz = abs(wn.y) > 0.7;
          vec2 q = horiz ? wp.xz : vec2(abs(wn.x) > abs(wn.z) ? wp.z : wp.x, wp.y);
          #if HATCH == 1
            vec2 cell = (fract(q / 0.6) - 0.5) * 0.6;                    // (30 cm in from the ground and the door's edges, as the real holes are: see facade-options.js)
            float fw = max(fwidth(q.x), fwidth(q.y));
            float r = max(0.018, fw * 0.9);
            float ties = 1.0 - smoothstep(r * 0.7, r * 1.3, length(cell));
            // a tie hole smaller than a couple of pixels twinkles as the camera moves, so it waits until it is big enough
            return horiz ? 0.0 : ties * 0.8 * (1.0 - smoothstep(0.011, 0.026, fw));
          #elif HATCH == 2
            float a = lineAA(q.y, 0.6, 1.0);
            float b = lineAA(q.x + step(0.5, fract(q.y / 1.2)) * 0.6, 1.2, 1.0);
            float far = 1.0 - smoothstep(0.05, 0.13, max(fwidth(q.x), fwidth(q.y)));   // joints closer than a few pixels fade out
            // (floors too in rows offset by half a tile since iteration 8, as the walls were: the straight grid ran one joint
            // through every row of the hall, and the reviewer read the four-way crosses as fake. The stone follows it)
            return max(a, b) * (horiz ? 0.2 : 0.5) * far;
          #elif HATCH == 3
            return horiz ? 0.0 : lineAA(q.x, 0.16, 1.0) * 0.6;
          #elif HATCH == 4
            float d = q.x - q.y * 0.85;
            // (it fades out with distance at about the point where the pane's frames turn into single strokes: far off, a hatch
            // with no frame round it hung in the air)
            return clamp(lineAA(d, 2.4, 1.2) + lineAA(d + 0.3, 2.4, 1.0), 0.0, 1.0) * 0.55 * (1.0 - smoothstep(0.014, 0.034, max(fwidth(q.x), fwidth(q.y))));
          #elif HATCH == 5
            return lineAA(q.y + sin(q.x * 1.3) * 0.05, 0.6, 1.0) * 0.35;
          #elif HATCH == 7
            vec2 gc = floor(q * 4.0);
            float r = length(fract(q * 4.0) - 0.5 - (vec2(dh(gc), dh(gc + 7.1)) - 0.5) * 0.5);
            float rr = max(0.09, max(fwidth(q.x), fwidth(q.y)) * 4.0 * 0.8);
            return step(0.78, dh(gc + 3.3)) * (1.0 - smoothstep(rr * 0.6, rr, r)) * 0.4;
          #else
            return 0.0;
          #endif
        }
      ` + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        // The cut. It is made here and not by the renderer, on a height read inside the triangle (vCutH), so that a face
        // seen dead edge-on is judged where it really is. A cut made by throwing pixels away is still all or nothing
        // per pixel, though, and a pixel has four samples: where a wall's face crosses the cut inside one pixel, the
        // samples above the cut are written too. Those lie nearer than the wall's black lid. The faces where the two
        // halves of a wall touch are slivers along its centre line seen from above, so that was the pale dashed line
        // down the middle of every lid, which I "fixed" twice by moving the lid a few millimetres. The cure is on the
        // lid's side (see buildCaps): nothing under the cut can ever stand in front of a lid for a camera above it.
        // The land and what stands outdoors (trees, parasols, the pergola: vDecor 1.5) are not cut at all. In the last look
        // at the built house the cut is at plan height, and every tree was a stump: "ragged dark blots", "a grey scrap
        // on the lawn", "two dots at the ends of the button" were olives and cypresses sliced at 1.2 m.
        if (vDecor < 1.4 && abs(vDecor - 0.25) > 0.05 && vCutH > uCutY) discard;
        ${opts.alphaMip ? `{ vec2 tx = vMapUv * ${opts.alphaMip.toFixed(1)}; float lod = max(0.0, 0.5 * log2(max(dot(dFdx(tx), dFdx(tx)), dot(dFdy(tx), dFdy(tx)))));
          diffuseColor.a *= 1.0 + lod * 0.3; }` : ''}
        // take the colour out of the scan, not out of the tint laid over it. (Until 9 Oct this ran on scan times tint,
        // so every cloth tinted over a grey weave, the ochre throw and the rust cushions among them, came out grey.)
        { vec3 scan = diffuseColor.rgb / max(diffuse, vec3(1e-4));
          #if defined(FAR_FLAT) && defined(USE_MAP)
            // seen from high up a ground texture shows as a grid of its own tiles: there it gives way to its average colour
            scan = mix(scan, texture2D(map, vMapUv, 7.0).rgb, smoothstep(0.006, 0.02, length(fwidth(vMapUv))));
          #endif
          diffuseColor.rgb = mix(vec3(dot(scan, vec3(0.299, 0.587, 0.114))), scan, uSat) * diffuse; }
        diffuseColor.rgb *= 1.0 + uMacro * ((vn(vDrawW * 0.35) - 0.5) * 0.9 + (vn(vDrawW * 1.7) - 0.5) * 0.35);`).replace('#include <dithering_fragment>', `#include <dithering_fragment>
        {
          vec3 wn = normalize((vec4(vNormal, 0.0) * viewMatrix).xyz);
          float rev; vec4 org;
          // Furniture and decor turn real one whole thing at a time, at the moment the fill reaches the middle of the
          // thing. Tile by tile, a bed was half drawing and half cloth for a second, and you saw through it.
          bool whole = vCtr.z > 1.5;
          vec3 wq = whole ? vec3(vCtr.x, vCtr.z - 2.0, vCtr.y) : vDrawW;
          #if defined(FORCE_ROOM)
            rev = uRV[FORCE_ROOM]; org = uRO[FORCE_ROOM]; gInk = uRI[FORCE_ROOM]; gDir = uRD[FORCE_ROOM];
          #elif defined(FORCE_EXT)
            rev = uXV; org = uXO; gInk = uXI; gDir = uXD;
          #else
            roomOf(wq, whole ? vec3(0.0) : wn, rev, org);
          #endif
          float ring;
          float got = revealAt(wq, whole ? vec3(0.0, 1.0, 0.0) : wn, rev, org, ring);
          float paper = 1.0 - got;
          // One thing, one moment: it is a drawing until the fill is half way through it, then it is there, whole and
          // opaque. Its accent is a rim of orange that dies away over the rest of the fill. (A cross-fade, tried first,
          // made a duvet a veil for a third of a second, with the mattress's outline showing through it.)
          if (whole) { float rim = 1.0 - abs(normalize(vNormal).z); ring = step(0.5, got) * (1.0 - got) * 1.8 * rim * rim * step(0.001, rev) * step(rev, 0.998); paper = 1.0 - step(0.5, got); }
          // The ending: a roll of drawing paper opens across the built house. Behind its line everything is the
          // drawing again, and what was never on the drawing (trees, cushions, water) is simply not there.
          float rolled = step(dot(vDrawW.xz, uRoll.xy), uRoll.z);
          paper = max(paper, rolled); ring *= 1.0 - rolled;
          // Planting, cushions, lamps and the like are not on the drawing. While their spot is still paper they are not
          // drawn at all. (Before 9 Oct they were drawn as blank paper: white cut-out trees against a finished sky, and a
          // bed that looked like a double exposure half way through its scan.)
          if (vDecor > 0.9 && paper > 0.5) discard;
          // A thin member (a window frame) is one solid stroke of ink while it is narrower than about four pixels, and an
          // outlined shape from then on. Outlined at every size, a frame seen from far off was two edges a pixel apart: a
          // chain of dashes. Its width rides in the same per-vertex number, as 0.5 plus metres.
          float thinK = (vDecor > 0.45 && vDecor < 0.9) ? 1.0 - smoothstep(3.0, 5.0, (vDecor - 0.5) / max(length(fwidth(vDrawW)), 1e-5)) : 0.0;
          #ifdef NO_RING
            ring = 0.0;                        // twigs and leaves: the accent line on such thin things reads as specks
          #endif
          float full = step(0.999, paper);
          float inkK = smoothstep(0.0, 0.7, gInk);
          float hatch = hatchOf(vDrawW, wn) * inkK;
          vec3 lit = gl_FragColor.rgb;
          #ifdef GLASS
            // Glass is drawn twice (see glassMat). First what is still paper of it: the pane as a sheet with its hatch.
            // Then what is real of it: a reflection laid over real pixels only, so a drawing behind it stays clean.
            #ifdef GLASS_PAPER
              float w = paper * (1.0 - ring);
              gl_FragColor = vec4(vec3(hatch) * w, w);
            #else
              float a = mix(uGlassOp, 1.0, ring) * (1.0 - paper * (1.0 - ring));
              gl_FragColor = vec4(mix(lit, uAccent * 2.2, ring) * a, a);
            #endif
          #else
            vec3 col = mix(lit, vec3(max(hatch, thinK * inkK)), full);
            col = mix(col, uAccent * 2.2, ring);
            gl_FragColor = vec4(col, paper * (1.0 - ring));
          #endif
          #if defined(DOUBLE_SIDED) && defined(INK_CUT)
            // Opt in (inkCut): the inside of a sliced solid drawn as ink. Walls no longer rely on this, they
            // carry real lids (see "the cut, capped"). Left on for everything, it inked any open shape seen
            // from behind, such as the inside of the olive's stone ring.
            if (!gl_FrontFacing && uCutOn > 0.5) gl_FragColor = vec4(vec3(inkK), 1.0);
          #endif
        }`);
    };
    mat.customProgramCacheKey = () => `lintel-${h}-${force}-${opts.glass ? (opts.glassPaper ? 2 : 1) : 0}-${opts.noCap ? 1 : 0}-${opts.inkCut ? 1 : 0}-${opts.noRing ? 1 : 0}-${opts.alphaMip || 0}-${opts.farFlat ? 1 : 0}-${mat.map ? 1 : 0}-${mat.side}`;
    return mat;
  }

  /* ---------- surfaced: a few lines of shader over a drawable material -------
     glsl runs once the scan's colour and roughness are known (diffuseColor, roughnessFactor), with the place in the
     world (vDrawW) and vn(), dh() and lineAA() at hand. For surfaces that are a rule and not a picture: one field of
     marble with no joint in it, a slab of limestone, gravel that keeps its grain. */
  function surfaced(mat, key, glsl) {
    const before = mat.onBeforeCompile, keyBefore = mat.customProgramCacheKey;
    // (the code on lines of its own: the gravel's starts with an #ifdef and ends with an #endif, which must each be alone on
    // their line. Until iteration 8 it did not compile, and with the scans on, ?code=none, the gravel was not drawn)
    mat.onBeforeCompile = (sh, r) => { before(sh, r); sh.fragmentShader = sh.fragmentShader.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n{\n${glsl}\n}`); };
    mat.customProgramCacheKey = () => keyBefore() + '-' + key;
    return mat;
  }

  /* ---------- camera keys ----------------------------------------------------
     hero: a 3 degree lens from 1.2 km straight up, which is a plan. lens: the
     lens widens while still looking down, so the walls rise into depth. door:
     eye level (1.6 m) in front of the pivot door, looking slightly up. */
  const KEYS = [
    { id: 'hero', t: [-17, 0, -3.1], yaw: 0, pitch: 89.4, fov: 3, frame: 66, hold: 40, go: 150 },
    { id: 'lens', t: [-14.75, 0, -4], yaw: 0, pitch: 64, fov: 36, dist: 46, go: 120 },
    // glide in low over the forecourt, the door growing ahead
    { id: 'approach', t: [-14.75, 2.6, 2], yaw: 0, pitch: 13.6, fov: 44, dist: 12.35, go: 100 },
    { id: 'door', t: [-14.75, 2.2, -2.5], yaw: 0, pitch: -3, fov: 50, dist: 11.5, hold: 90, go: 110 },
    { id: 'hall', t: [-14.75, 1.9, -9.6], yaw: 0, pitch: -2, fov: 60, dist: 9.8, hold: 100, go: 140 },
    // the roof lifts off, the camera rises and narrows back to a plan of the living room
    { id: 'rise', t: [-15, 0, -16], yaw: 0, pitch: 62, fov: 30, dist: 20, go: 120 },
    { id: 'livingTop', t: [-15, 0, -11.6], yaw: 0, pitch: 89.4, fov: 4, frame: 13.5, hold: 90, go: 120 },
    // then drops into it, and turns toward the fireplace and the low sun
    { id: 'drop', t: [-16, 0.5, -15], yaw: 40, pitch: 50, fov: 44, dist: 11, go: 110 },
    { id: 'living', t: [-17.5, 1.25, -13], yaw: 54.3, pitch: 2.3, fov: 58, dist: 8.75, hold: 110, go: 100 },
    // through the wide opening, already turning toward the island
    { id: 'pass', focus: 7, t: [-16.71, 1.556, -16.57], yaw: 62, pitch: 1, fov: 58, dist: 2.5, go: 100 },
    // the far end of the table, looking back along it into the light of the roof lights
    { id: 'dining', focus: 8.5, t: [-9.82, 1.487, -18.04], yaw: 75.2, pitch: 2.6, fov: 52, dist: 2.5, hold: 100, go: 110 },
    // out through the sliding door: the sky arrives. From here on the target sits 2.5 m
    // in front of the camera, so the path follows the targets and turning only turns the view.
    { id: 'slide', focus: 9, t: [-6.15, 1.58, -13.6], yaw: 180, pitch: 0.6, fov: 56, dist: 2, go: 90 },
    { id: 'patio', focus: 9.5, t: [-3.7, 1.76, -9.57], yaw: 222.8, pitch: -3.6, fov: 54, dist: 2.5, hold: 110, go: 120 },
    // round the north side of the olive, to look back at it against the sun
    { id: 'olive', focus: 5.6, t: [2.85, 2.04, -6.74], yaw: 110.1, pitch: -10.2, fov: 58, dist: 2.5, hold: 100, go: 120 },
    { id: 'turn', focus: 6, t: [10.7, 1.58, -12.0], yaw: -90, pitch: 0.5, fov: 56, dist: 2.5, go: 90 },
    // the gallery: twenty metres straight down Z
    // (a metre further in than before: the first, biggest work is beside you and no longer a soft fifth of the frame,
    // and the title has a stretch of bare lit wall to stand on)
    { id: 'gallery', focus: 7, t: [12.4, 1.58, -9.5], yaw: -180, pitch: 0.4, fov: 46, dist: 2.5, hold: 90, go: 200 },
    { id: 'galleryEnd', focus: 5, t: [12.4, 1.55, 6.9], yaw: -180, pitch: 1, fov: 54, dist: 2.5, hold: 90, go: 90 },
    // the master suite: in at the corner, round to the bed and the charred larch
    { id: 'bedIn', focus: 6, t: [15.35, 1.58, 13.86], yaw: -110, pitch: 0.5, fov: 56, dist: 2.5, go: 90 },
    // square to the bed and its wall, 4.6 m back, so the bed sits in the middle of the charred larch with a lamp either side
    // (13 Oct, with the bed moved to the middle of the wall. Until then from the corner, 33 degrees round, the patio through
    // the glass on the left.)
    { id: 'bedroom', focus: 5, t: [17.25, 1.18, 10.3], yaw: 0, pitch: 3.9, fov: 50, dist: 2.5, hold: 100, go: 90 },
    // through the dressing room to the bath
    { id: 'dressDoor', focus: 4, t: [22.5, 1.58, 9.5], yaw: -90, pitch: 0.5, fov: 58, dist: 2.5, go: 62 },
    // down the middle of the dressing room, still looking along it. The turn to the bath starts past the last wardrobe
    // and ends square in front of the door: turning early put a wall in two fifths of the frame for three seconds.
    { id: 'dressMid', focus: 4.5, t: [26.3, 1.56, 9.5], yaw: -93, pitch: 1, fov: 58, dist: 2.5, go: 56 },
    { id: 'dress', focus: 4, t: [25.82, 1.5, 11.94], yaw: -184, pitch: 2, fov: 58, dist: 2.5, go: 80 },
    // just inside the door, looking across the room's diagonal: the tub against the garden glass, the vanity down the west wall
    // (level, at 1.32 m: tilted down, the wide lens made the mirror and the lights on it lean)
    { id: 'bath', focus: 4.4, t: [24.55, 1.26, 13.78], yaw: -227.6, pitch: 1.5, fov: 56, dist: 2.5, hold: 90, go: 110 },
    // out onto the lawn: the valley, then the sea
    // a few steps onto the terrace, looking south over the fire: the water behind it, the sea and the far ridge with its village,
    // the old olive on the right. Away from the sun, so the sky keeps its blue.
    { id: 'garden', focus: 5.5, t: [26.03, 1.46, 20.63], yaw: -219.1, pitch: 3.0, fov: 58, dist: 2.5, hold: 110, go: 150 },
    // and up, turning, back to the plan we started on, now built
    { id: 'lift', t: [21.5, 0, 21.5], yaw: -280, pitch: 60, fov: 30, dist: 40, go: 150 },
    { id: 'asbuilt', t: [-17, 0, -3.1], yaw: -360, pitch: 89.4, fov: 3, frame: 66, hold: 150 },   // a long rest: the roll of paper opens during it
  ];

  const DOSSIERS = [
    {
      no: '01', kicker: 'Room', key: 'hall', anchor: 'entrance', title: ['The', 'entrance'],
      meta: '8.00 × 9.00 m <b>·</b> 72 m² <b>·</b> ceiling 4.80 <b>·</b> open file +',
      label: { type: 'camera', tilt: 0, off: [0.55, 0.2] },
      fileMeta: 'Casa Serra · entrance · A-101',
      text: 'The door is a single leaf of oak, 2.4 metres wide and as tall as a room. It turns on a pivot, so it opens with one finger. Above the neighbouring rooms the walls give way to a band of glass, and at five in the afternoon the sun draws a line across the east wall.',
      facts: [['Door', 'Oak pivot, 2.4 × 4.2 m'], ['Floor', 'Dark marble, polished, one field'], ['Walls', 'Board-marked concrete'], ['Ceiling', '4.80 m, clerestory on three sides']],
    },
    {
      no: '02', kicker: 'Room', key: 'living', anchor: 'living', title: ['The', 'living room'],
      meta: '12.00 × 9.00 m <b>·</b> 108 m² <b>·</b> ceiling 4.50 <b>·</b> open file +',
      label: { type: 'camera', tilt: 0, off: [0.42, 0.25] },
      fileMeta: 'Casa Serra · living · A-101',
      text: 'A room you step down into. The lounge sits 45 centimetres below the oak floor, the fireplace is one block of board-marked concrete, and a band of glass under the ceiling lets the late sun cut across the whole room.',
      facts: [['Floor', 'Oiled oak, 220 mm boards'], ['Lounge', '6.00 × 4.50 m, sunk 450 mm'], ['Fireplace', 'Board-marked concrete, floor to ceiling'], ['Glazing', '4.50 m, clerestory on two sides']],
    },
    {
      no: '03', kicker: 'Room', key: 'dining', anchor: 'kitchen', title: ['Kitchen', 'and dining'],
      meta: '16.00 × 8.00 m <b>·</b> 128 m² <b>·</b> a table for 14 <b>·</b> open file +',
      label: { type: 'camera', tilt: 0, off: [0.45, 0.3] },
      fileMeta: 'Casa Serra · kitchen and dining · A-101',
      text: 'One room for cooking and for long lunches. A five metre island in honed travertine, an oak table for fourteen, and three roof lights that put the sun on the table at five in the afternoon.',
      facts: [['Island', 'White quartz, 5.00 × 1.20 m'], ['Table', 'Solid walnut, 6.00 m, seats 14'], ['Roof lights', 'Three, 1.20 m square'], ['Wine room', 'Behind glass, 1,400 bottles']],
    },
    {
      no: '04', kicker: 'Courtyard', key: 'olive', anchor: 'olive', title: ['The', 'olive patio'],
      meta: '20.00 × 24.00 m <b>·</b> an olive from c. 1890 <b>·</b> open file +',
      label: { type: 'camera', tilt: 0, off: [0.6, -0.4] },
      fileMeta: 'Casa Serra · patio · A-101',
      text: 'The house was drawn around one tree. The olive was here a century before us, so the patio is the size of its shade at five in the afternoon, and the pool runs along the south side to hold its reflection.',
      facts: [['Olive', 'Olea europaea, c. 1890'], ['Paving', 'Travertine, honed'], ['Pool', '18.00 × 3.00 m, overflow edge'], ['Light', 'West south west, late afternoon']],
    },
    {
      no: '05', kicker: 'Room', key: 'gallery', anchor: 'gallery', title: ['The', 'glass gallery'],
      meta: '3.00 × 24.00 m <b>·</b> 72 m² <b>·</b> open file +',
      label: { type: 'camera', tilt: 0, off: [0.2, 0.2] },
      fileMeta: 'Casa Serra · gallery · A-101',
      text: 'Twenty four metres of glass on one side and a wall for paintings on the other. In the late afternoon every mullion draws a line across the floor and up the canvases, and the walk to the bedroom takes as long as the light allows.',
      facts: [['Glazing', 'Floor to ceiling, bronze frames'], ['Length', '24.00 m'], ['Floor', 'Black marble, polished'], ['Wall', 'Warm grey limewash, seven paintings']],
    },
    {
      no: '06', kicker: 'Room', key: 'bedroom', anchor: 'bedroom', title: ['The', 'master suite'],
      meta: '10.00 × 9.00 m <b>·</b> 162 m² with dressing and bath <b>·</b> open file +',
      label: { type: 'camera', tilt: 0, off: [0.45, 0.3] },
      fileMeta: 'Casa Serra · master suite · A-101',
      text: 'A wall of charred larch behind the bed, the garden at its foot and the low sun from the west. Through the dressing room, a bath sunk into the stone floor, level with the lawn outside.',
      facts: [['Bedroom', '10.00 × 9.00 m'], ['Wall', 'Charred larch battens'], ['Bath', 'Freestanding stone tub, porcelain floor'], ['Dressing', 'Walk through, oak']],
    },
    {
      no: '07', kicker: 'Garden', key: 'garden', anchor: 'garden', title: ['The', 'private garden'],
      meta: '21.00 × 9.00 m <b>·</b> the valley, then the sea <b>·</b> open file +',
      label: { type: 'camera', tilt: 0, off: [1.5, 0.2] },
      fileMeta: 'Casa Serra · garden · A-101',
      text: 'The walk ends outside. A lawn, a low wall and nothing between you and the valley. On a clear evening you can see the Atlantic from here, and the sun goes down a little to the right of the old olive.',
      facts: [['Lawn', '21.00 × 9.00 m'], ['Wall', 'Board-marked concrete, 450 mm'], ['View', 'South west, to the Atlantic'], ['Sunset, 21 June', '21:05']],
    },
  ];

  /* ---------- the plan drawing: one big ink texture lying on the ground ------ */
  const SX0 = -12, SY0 = -12, SIZE = 84, TPX = 4096, S = TPX / SIZE;
  const PRINT = [-6, -6, 74, 62];                        // the part of the sheet printed on the paper roll: x, y, width, height in metres
  let planPrint = null;
  function drawPlan() {
    const cv = document.createElement('canvas');
    cv.width = cv.height = TPX;
    const g = cv.getContext('2d');
    const metres = () => g.setTransform(S, 0, 0, S, -SX0 * S, -SY0 * S);
    const txt = (s, x, y, size, o) => {
      o = o || {};
      g.save();
      g.setTransform(1, 0, 0, 1, (x - SX0) * S, (y - SY0) * S);
      if (o.rot) g.rotate(o.rot);
      g.font = `${o.w || 500} ${Math.round(size * S)}px "Geist Mono"`;
      g.letterSpacing = `${((o.ls == null ? 0.14 : o.ls) * size * S).toFixed(1)}px`;
      g.textAlign = o.align || 'center';
      g.textBaseline = o.base || 'middle';
      g.fillText(s, o.dx || 0, o.dy || 0);
      g.restore();
    };
    g.fillStyle = g.strokeStyle = '#000';
    metres();

    // (room names are their own sharp labels, see roomLabels)

    // dimension strings
    metres();
    g.lineWidth = 0.065;
    const tick = (x, y) => { g.beginPath(); g.moveTo(x - 0.28, y + 0.28); g.lineTo(x + 0.28, y - 0.28); g.stroke(); };
    const dimH = (y, xs, ext) => {
      g.beginPath(); g.moveTo(xs[0] - 0.6, y); g.lineTo(xs[xs.length - 1] + 0.6, y); g.stroke();
      xs.forEach((x) => { tick(x, y); g.beginPath(); g.moveTo(x, y - 0.5); g.lineTo(x, y + (ext || 0.5)); g.stroke(); });
      for (let i = 0; i < xs.length - 1; i++) txt((xs[i + 1] - xs[i]).toFixed(2), (xs[i] + xs[i + 1]) / 2, y - 0.72, 0.68, { w: 500, ls: 0.04 });
      metres();
    };
    const dimV = (x, ys, ext) => {
      g.beginPath(); g.moveTo(x, ys[0] - 0.6); g.lineTo(x, ys[ys.length - 1] + 0.6); g.stroke();
      ys.forEach((y) => { tick(x, y); g.beginPath(); g.moveTo(x - 0.5, y); g.lineTo(x + (ext || 0.5), y); g.stroke(); });
      for (let i = 0; i < ys.length - 1; i++) txt((ys[i + 1] - ys[i]).toFixed(2), x - 0.72, (ys[i] + ys[i + 1]) / 2, 0.68, { w: 500, ls: 0.04, rot: -Math.PI / 2 });
      metres();
    };
    dimH(-2.4, [0, 9, 25, 29, 38, 44]);
    dimH(-4.6, [0, 44]);
    dimV(-2.4, [0, 8, 16, 24, 32]);
    dimV(-4.6, [0, 32]);
    dimV(46.2, [8, 32]);
    dimH(52.2, [41, 51, 59, 62]);
    dimV(60.6, [32, 35, 41], 0.5);

    // structural grid bubbles
    g.lineWidth = 0.05;
    const bubble = (x, y, s) => { g.beginPath(); g.arc(x, y, 0.95, 0, Math.PI * 2); g.stroke(); txt(s, x, y + 0.04, 0.72, { w: 400, ls: 0 }); metres(); };
    [[0, 'A'], [9, 'B'], [21, 'C'], [41, 'D'], [44, 'E']].forEach(([x, s]) => {
      g.setLineDash([0.5, 0.25, 0.1, 0.25]); g.beginPath(); g.moveTo(x, -6.2); g.lineTo(x, -0.8); g.stroke(); g.setLineDash([]);
      bubble(x, -7.2, s);
    });
    [[0, '1'], [8, '2'], [17, '3'], [26, '4'], [32, '5'], [41, '6']].forEach(([y, s]) => {
      g.setLineDash([0.5, 0.25, 0.1, 0.25]); g.beginPath(); g.moveTo(-6.2, y); g.lineTo(-0.8, y); g.stroke(); g.setLineDash([]);
      bubble(-7.2, y, s);
    });

    // door swings, and dashed heads over the open doorways
    OPEN.forEach((o) => {
      metres();
      const along = o.axis === 'h';
      if (o.type === 'door' || o.type === 'pivot') {
        const w = o.type === 'pivot' ? o.b - o.pivot : o.b - o.a;
        let hx, hy, a0, a1, ccw;
        if (o.type === 'pivot') {                           // pivot swings inward (north)
          hx = o.pivot; hy = o.c; a0 = 0; a1 = -Math.PI / 2; ccw = true;
          g.lineWidth = 0.045;
          g.beginPath(); g.arc(hx, hy, o.pivot - o.a, Math.PI, Math.PI / 2, true); g.stroke();
        } else {
          const room = RM[o.into];
          const side = along ? (room.r[1] >= o.c ? 1 : -1) : (room.r[0] >= o.c ? 1 : -1);
          const hingeAt = o.hinge === 'a' ? o.a : o.b, toward = o.hinge === 'a' ? 1 : -1;
          if (along) { hx = hingeAt; hy = o.c; a0 = toward > 0 ? 0 : Math.PI; a1 = side > 0 ? Math.PI / 2 : -Math.PI / 2; }
          else { hx = o.c; hy = hingeAt; a0 = toward > 0 ? Math.PI / 2 : -Math.PI / 2; a1 = side > 0 ? 0 : Math.PI; }
          const diff = Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0));
          ccw = diff < 0;
        }
        g.lineWidth = 0.045;
        g.beginPath(); g.arc(hx, hy, w, a0, a1, ccw); g.stroke();
        g.lineWidth = 0.08;
        g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + Math.cos(a1) * w, hy + Math.sin(a1) * w); g.stroke();
      } else if (o.type === 'open') {
        g.lineWidth = 0.045; g.setLineDash([0.35, 0.22]);
        g.beginPath();
        if (along) { g.moveTo(o.a, o.c); g.lineTo(o.b, o.c); } else { g.moveTo(o.c, o.a); g.lineTo(o.c, o.b); }
        g.stroke(); g.setLineDash([]);
      }
    });

    // Where paving ends with no wall: the patio towards the lawn and beside the entrance court, the path to the door,
    // the garden's terrace. These slabs stand 3 cm proud of the ground, which is exactly the size of step the outline
    // test cannot make up its mind about, so their edges came and went in pieces while the plan opened. In the depth
    // picture the ground's plane is at their level (see the depth pass) and their edges are drawn here, once.
    metres();
    g.lineWidth = 0.045; g.setLineDash([]);
    g.beginPath(); g.moveTo(21, 26); g.lineTo(21, 32); g.lineTo(41, 32); g.stroke();
    g.strokeRect(13.5, 26, 3.0, 16);                                     // (3.5 m wide until 14 Oct, off the door's middle by 25 cm)
    { const lw = g.lineWidth; g.lineWidth = 0.022; for (let y = 28; y < 42; y += 2) { g.beginPath(); g.moveTo(13.5, y); g.lineTo(16.5, y); g.stroke(); } g.lineWidth = lw; }   // (its slabs)
    g.beginPath(); g.moveTo(41, 43.6); g.lineTo(59, 43.6); g.stroke();

    // the canopy over the entrance and the roof lights, above the cut, so dashed
    metres();
    g.lineWidth = 0.05; g.setLineDash([0.4, 0.25]);
    g.strokeRect(11, 26, 8, 3.5);
    RM.kitchen.skylights.forEach((q) => g.strokeRect(q[0], q[1], q[2] - q[0], q[3] - q[1]));
    g.setLineDash([]);

    // three cars in the garage, as light outlines
    [1.1, 3.6, 6.1].forEach((x) => {
      const y = 25.1, w = 1.9, l = 4.7;
      g.lineWidth = 0.05;
      g.beginPath(); g.roundRect(x, y, w, l, 0.42); g.stroke();
      g.lineWidth = 0.035;
      g.beginPath(); g.roundRect(x + 0.2, y + 1.15, w - 0.4, 2.3, 0.22); g.stroke();              // roof
      g.beginPath(); g.moveTo(x + 0.2, y + 1.3); g.lineTo(x + 0.32, y + 0.72); g.lineTo(x + w - 0.32, y + 0.72); g.lineTo(x + w - 0.2, y + 1.3); g.stroke();   // windscreen
      g.beginPath(); g.moveTo(x + 0.22, y + 3.35); g.lineTo(x + 0.34, y + 3.85); g.lineTo(x + w - 0.34, y + 3.85); g.lineTo(x + w - 0.22, y + 3.35); g.stroke();  // rear glass
    });

    // the olive tree
    g.lineWidth = 0.06;
    g.beginPath();
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2, rr = 3.3 + Math.sin(a * 7) * 0.22 + Math.sin(a * 13 + 1) * 0.12;
      const x = 30 + Math.cos(a) * rr, y = 18 + Math.sin(a) * rr;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    g.lineWidth = 0.035;
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + 0.2;
      g.beginPath(); g.moveTo(30 + Math.cos(a) * 0.5, 18 + Math.sin(a) * 0.5); g.lineTo(30 + Math.cos(a) * (1.6 + (i % 3) * 0.5), 18 + Math.sin(a) * (1.6 + (i % 3) * 0.5)); g.stroke();
    }
    g.beginPath(); g.arc(30, 18, 0.38, 0, Math.PI * 2); g.fill();
    txt('OLIVE, C. 1890', 30, 22.3, 0.42, { w: 400 });
    txt('POOL', 31.5, 28.5, 0.6, {});
    metres(); g.lineWidth = 0.06; g.strokeRect(22.5, 27, 18, 3); g.lineWidth = 0.03; g.strokeRect(22.8, 27.3, 17.4, 2.4);

    // north arrow
    metres();
    g.lineWidth = 0.06;
    const NX = 58.6, NY = 5.2;
    g.beginPath(); g.arc(NX, NY, 1.6, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(NX, NY - 1.9); g.lineTo(NX + 0.75, NY + 1.3); g.lineTo(NX, NY + 0.7); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(NX, NY - 1.9); g.lineTo(NX - 0.75, NY + 1.3); g.lineTo(NX, NY + 0.7); g.closePath(); g.stroke();
    txt('N', NX, NY - 2.9, 0.7, {});

    // drawing title and scale bar, north east of the house
    const TX = 46.6, TY = -4.8;
    txt('GROUND FLOOR PLAN', TX, TY, 1.05, { align: 'left', ls: 0.1 });
    txt('CASA SERRA   SINTRA   946 m²   1:200', TX, TY + 1.5, 0.46, { align: 'left', w: 400, ls: 0.12 });
    metres();
    g.lineWidth = 0.05;
    [[0, 1], [1, 2], [2, 5], [5, 10]].forEach(([a, b], i) => {
      if (i % 2 === 0) g.fillRect(TX + a, TY + 2.8, b - a, 0.35); else g.strokeRect(TX + a, TY + 2.8, b - a, 0.35);
      txt(String(a), TX + a, TY + 3.9, 0.42, { w: 400, ls: 0 }); metres();
    });
    g.strokeRect(TX, TY + 2.8, 10, 0.35);
    txt('10 m', TX + 10.3, TY + 3.9, 0.42, { w: 400, ls: 0, align: 'left' });

    // A small copy for the roll of paper at the end, walls included (on the page the walls are the model's own cut,
    // not part of this texture): it is what shows on the tube as it turns. 16 pixels a metre, from PRINT[0], PRINT[1].
    {
      const pc = document.createElement('canvas'), k = 16;
      pc.width = PRINT[2] * k; pc.height = PRINT[3] * k;
      const pg = pc.getContext('2d');
      pg.drawImage(cv, (PRINT[0] - SX0) * S, (PRINT[1] - SY0) * S, PRINT[2] * S, PRINT[3] * S, 0, 0, pc.width, pc.height);
      pg.setTransform(k, 0, 0, k, -PRINT[0] * k, -PRINT[1] * k);
      pg.strokeStyle = '#1d1d1f'; pg.lineWidth = 0.34; pg.lineJoin = 'miter';
      ROOMS.filter((r) => !r.outdoor).forEach((r) => pg.strokeRect(r.r[0], r.r[1], r.r[2] - r.r[0], r.r[3] - r.r[1]));
      planPrint = pc.toDataURL('image/png');
    }
    // keep only the ink, as one channel
    const src = g.getImageData(0, 0, TPX, TPX).data;
    const a = new Uint8Array(TPX * TPX);
    for (let i = 0; i < a.length; i++) a[i] = src[i * 4 + 3];
    const tex = new THREE.DataTexture(a, TPX, TPX, THREE.RedFormat, THREE.UnsignedByteType);
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
  }

  /* ---------- trees and land ---------------------------------------------------------
     An old olive: three twisted stems from one base, limbs out to five or six
     clusters, and leaf cards (each a sprig of a dozen leaves) around every cluster. */
  function tubeGeo(points, r0, r1, seg, ring, wob, seed) {
    const curve = new THREE.CatmullRomCurve3(points);
    const fr = curve.computeFrenetFrames(seg, false), len = curve.getLength();
    const pos = [], nor = [], uv = [], idx = [];
    const P = new V3(), n = new V3();
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, r = FX.lerp(r0, r1, Math.pow(t, 0.8));
      curve.getPointAt(t, P);
      for (let j = 0; j <= ring; j++) {
        const th = (j / ring) * Math.PI * 2;
        n.copy(fr.normals[i]).multiplyScalar(Math.cos(th)).addScaledVector(fr.binormals[i], Math.sin(th));
        const k = 1 + wob * (FX.noise3(P.x * 2.1 + seed, P.y * 2.1, P.z * 2.1 + th * 0.6) - 0.5) * 2;
        pos.push(P.x + n.x * r * k, P.y + n.y * r * k, P.z + n.z * r * k);
        nor.push(n.x, n.y, n.z);
        uv.push((j / ring) * Math.PI * 2 * Math.max(r, 0.08), t * len);
      }
    }
    for (let i = 0; i < seg; i++) for (let j = 0; j < ring; j++) {
      const a = i * (ring + 1) + j, b = a + ring + 1;
      // (wound so the outside is the front. Until iteration 4 every trunk and limb was inside out: the renderer then turns
      // the normals round, so an olive was lit on the side away from the sun. "Looking toward the sun, the trunk reads pale.")
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }
  // returns leaf cards { m: matrices, c: tints }; adds the wood to the batch.
  // arc: [a0, a1] keeps the stems inside an angle (a tree in a corner)
  // tight: under 1 holds the stems and limbs closer to the trunk, for one crown instead of a split one
  // (simple: two stems and no twigs, for a tree indoors that should read as a shape and not as a thicket.
  // single: one old trunk that rises, leans and twists before it divides into four limbs, for the patio's olive. With three
  // stems from the ground it looked split in half. Sam, 13 Oct: "maybe just one trunk".)
  function olive(Bt, bark, x, y, s, seed, cardsWanted, base, arc, tight, simple, single) {
    const R = FX.rng(seed), o = new V3(WX(x), base || 0, WZ(y)), up = new V3(0, 1, 0), tg = tight == null ? 1 : tight;
    const ends = [];
    const stems = single ? 4 : simple ? 2 : 3;
    // (single, rebuilt 14 Oct. Sam: "the trunk is very weird, disconnected, weird angle... lower the height so we can see the
    // green leaves". The first version twisted in an S for 2.2 m and its limbs came out of its side half a metre down. Now a
    // short, thick, gnarled trunk leans a little and opens at 1.3 m into four limbs that grow out of its top, carrying on
    // its line before they spread, so the crown sits two metres lower.)
    let top = o;
    if (single) {
      top = o.clone().add(new V3(0.1 * s, 1.05 * s, 0.0));
      Bt.add(bark, tubeGeo([o.clone().add(new V3(0, -0.15, 0)), o.clone().add(new V3(0.03 * s, 0.3 * s, 0.01 * s)), o.clone().add(new V3(0.08 * s, 0.7 * s, -0.04 * s)), top, top.clone().add(new V3(0.01 * s, 0.1 * s, 0))], 0.46 * s, 0.3 * s, 22, 18, 0.36, seed + 101));
    }
    for (let k = 0; k < stems; k++) {
      const a = arc ? arc[0] + ((k + 0.5) / stems) * (arc[1] - arc[0]) + (R() - 0.5) * 0.2 : (k / stems) * Math.PI * 2 + R() * 0.8;
      const d = new V3(Math.cos(a), 0, Math.sin(a));
      let p0, p1, p2, p3, start, r0;
      if (single) {
        start = top.clone().addScaledVector(d, 0.04 * s).addScaledVector(up, -0.35 * s);
        p0 = top.clone().addScaledVector(d, 0.12 * s).addScaledVector(up, 0.12 * s);
        p1 = p0.clone().addScaledVector(d, 0.4 * s).addScaledVector(up, 0.4 * s).add(new V3(R() - 0.5, 0, R() - 0.5).multiplyScalar(0.18 * s));
        p2 = p1.clone().addScaledVector(d, 0.45 * s).addScaledVector(up, 0.35 * s).add(new V3(R() - 0.5, 0, R() - 0.5).multiplyScalar(0.22 * s));
        p3 = p2.clone().addScaledVector(d, 0.3 * s).addScaledVector(up, 0.22 * s);
        r0 = 0.21 * s;
      } else {
        p0 = o.clone().addScaledVector(d, 0.18 * s * tg);
        p1 = p0.clone().addScaledVector(d, 0.25 * s * tg * tg).addScaledVector(up, 0.7 * s).add(new V3(R() - 0.5, 0, R() - 0.5).multiplyScalar(0.25 * s * tg));
        p2 = p1.clone().addScaledVector(d, 0.35 * s * tg).addScaledVector(up, 0.8 * s).add(new V3(R() - 0.5, 0, R() - 0.5).multiplyScalar(0.3 * s));
        p3 = p2.clone().addScaledVector(d, 0.3 * s).addScaledVector(up, 0.55 * s);
        start = o.clone().add(new V3(0, -0.1, 0)); r0 = (0.34 + (1 - tg) * 0.2) * s;
      }
      Bt.add(bark, tubeGeo([start, p0, p1, p2, p3], r0, (single ? 0.09 : 0.11) * s, 18, 12, 0.32, seed + k));
      const nb = 2 + (R() < 0.5 ? 1 : 0);
      const spread = arc ? 0.5 : 0.9;
      for (let b = 0; b < nb; b++) {
        const ba = a + (b - (nb - 1) / 2) * spread + (R() - 0.5) * 0.4, bd = new V3(Math.cos(ba), 0, Math.sin(ba));
        const q1 = p3.clone().addScaledVector(bd, 0.6 * s * (0.5 + 0.5 * tg)).addScaledVector(up, 0.5 * s);
        const q2 = q1.clone().addScaledVector(bd, (0.7 + R() * 0.5) * s).addScaledVector(up, (0.35 + R() * 0.4) * s);
        Bt.add(bark, tubeGeo([p3.clone(), q1, q2], 0.12 * s, 0.035 * s, 10, 8, 0.2, seed + k * 7 + b));
        ends.push({ p: q2, r: 0.9 + R() * 0.45 });
        // two twigs off each limb, so the crown breaks into clumps with sky between them
        for (let t = 0; t < (simple ? 0 : 2); t++) {
          const ta = ba + (t ? 1 : -1) * (0.5 + R() * 0.5), td = new V3(Math.cos(ta), 0, Math.sin(ta));
          const from = q1.clone().lerp(q2, 0.45 + R() * 0.3);
          const tip = from.clone().addScaledVector(td, (0.45 + R() * 0.45) * s).addScaledVector(up, (R() * 0.5 - 0.15) * s);
          Bt.add(bark, tubeGeo([from, from.clone().lerp(tip, 0.5).add(new V3(0, 0.08 * s, 0)), tip], 0.04 * s, 0.015 * s, 6, 6, 0.1, seed + k * 31 + b * 3 + t));
          ends.push({ p: tip, r: 0.5 + R() * 0.35 });
        }
      }
    }
    // a tight tree gets leaves in the middle too, so its crown reads as one mass and not as two lobes
    if (tg < 1) {
      const c = new V3(); ends.forEach((en) => c.add(en.p)); c.multiplyScalar(1 / ends.length);
      ends.push({ p: c.clone().add(new V3(0, 0.3 * s, 0)), r: 1.3 }, { p: c.clone().add(new V3(0.55 * s, -0.1 * s, 0.3 * s)), r: 1.0 }, { p: c.clone().add(new V3(-0.45 * s, 0, -0.5 * s)), r: 1.0 });
    } else {
      // an open tree gets a cap of leaves over its middle as well: from above its clumps stood in a wreath round a bare centre
      const c = new V3(); ends.forEach((en) => c.add(en.p)); c.multiplyScalar(1 / ends.length);
      ends.push({ p: c.clone().add(new V3(0, 0.55 * s, 0)), r: 1.25 }, { p: c.clone().add(new V3(0.6 * s, 0.3 * s, 0.35 * s)), r: 0.95 }, { p: c.clone().add(new V3(-0.5 * s, 0.35 * s, -0.55 * s)), r: 0.95 }, { p: c.clone().add(new V3(-0.3 * s, 0.3 * s, 0.65 * s)), r: 0.85 });
    }
    const M4 = [], C = [], q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new V3(), pp = new V3();
    const total = ends.reduce((acc, c) => acc + c.r * c.r, 0);
    ends.forEach((c) => {
      const n = Math.max(4, Math.round((cardsWanted * c.r * c.r) / total));
      const flat = 0.45 + R() * 0.25, tint = R();                       // each clump a little flatter or rounder, greener or more silver
      for (let i = 0; i < n; i++) {
        let vx, vy, vz;
        do { vx = R() * 2 - 1; vy = R() * 2 - 1; vz = R() * 2 - 1; } while (vx * vx + vy * vy + vz * vz > 1);
        const rr = c.r * s * (0.55 + 0.45 * Math.cbrt(R()));               // denser at the heart of the clump, ragged at its edge
        pp.set(c.p.x + vx * 1.25 * rr, c.p.y + vy * flat * 1.25 * rr + 0.12 * s - (vy < 0 ? 0.15 * s * R() : 0), c.p.z + vz * 1.25 * rr);
        e.set(R() * 6.28, R() * 6.28, R() * 6.28); q.setFromEuler(e);
        const k = (0.7 + R() * 0.6) * s;
        M4.push(new THREE.Matrix4().compose(pp.clone(), q.clone(), sc.set(k, k, k).clone()));
        const sil = Math.min(1, Math.max(0, tint * 0.6 + R() * 0.55 - 0.15));
        C.push(new THREE.Color().setRGB(FX.lerp(0.84, 1.0, sil), FX.lerp(0.93, 1.02, sil), FX.lerp(0.76, 0.92, sil)));
      }
    });
    return { m: M4, c: C };
  }
  // a sprig: a dozen narrow leaves on a twig, silver green on one side
  function sprigTex() {
    return FX.canvasTex(256, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.strokeStyle = '#4b4236'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(20, 236); g.quadraticCurveTo(120, 140, 236, 24); g.stroke();
      for (let i = 0; i < 14; i++) {
        const t = 0.08 + i * 0.065, x = 20 + t * 216, y = 236 - t * 212 + Math.sin(t * 9) * 6;
        const side = i % 2 ? 1 : -1, ang = -0.78 + side * (0.75 + Math.random() * 0.35);
        g.save(); g.translate(x, y); g.rotate(ang);
        g.fillStyle = Math.random() < 0.4 ? '#a9b39b' : ['#5b6a4a', '#66754f', '#4f5d41'][(Math.random() * 3) | 0];
        g.beginPath(); g.ellipse(26, 0, 27, 5.5, 0, 0, Math.PI * 2); g.fill();
        g.restore();
      }
    });
  }
  // the land: flat where the house stands, rising to the north and east, falling to the south toward the sea
  const SITE = [-14, -14, 76, 51];
  // where the woods stand (plan coordinates): the land's colour and the trees themselves read the same map
  const woodAt = (x, y) => FX.noise3(x * 0.0035, 2, y * 0.0035) * 0.75 + FX.noise3(x * 0.016, 8, y * 0.016) * 0.25;
  function terrH(x, y) {
    const dx = Math.max(SITE[0] - x, 0, x - SITE[2]), dy = Math.max(SITE[1] - y, 0, y - SITE[3]);
    const d = Math.hypot(dx, dy);
    if (d <= 0) return -0.06;
    const south = FX.smooth(FX.clamp01((y - SITE[3]) / 60));
    // the Sintra hills behind (north, east, west), ridged by noise
    const ridge = Math.abs(FX.noise3(x * 0.0018, 11, y * 0.0018) - 0.5) * 2;
    const rise = (18 * FX.smooth(d / 300) + 160 * FX.smooth(d / 2200) * (0.55 + 0.9 * ridge) + 5 * (FX.noise3(x * 0.012, 3, y * 0.012) - 0.5) * FX.smooth(d / 60)) * (1 - south);
    // to the south the hill drops away just past the garden wall, down to a valley and the sea,
    // with ridges coming down on either side
    const sy = Math.max(0, y - SITE[3] - 1);
    // (The drop begins over a rounded shoulder: the slope grows from nothing to its full 46 degrees over 20 m and never
    // passes it. Starting at full slope, the lip of the hill was a sharp crease right along the site's south edge, and
    // on the plan a crease is an ink line across the whole sheet.)
    const tq = Math.min(1, sy / 20);
    const fall = 20.87 * (tq * tq * tq - 0.5 * tq * tq * tq * tq) + 240 * (1 - Math.exp(-Math.max(0, sy - 20) / 230)) + 22 * (FX.noise3(x * 0.006, 7, y * 0.006) - 0.4) * FX.smooth(sy / 150);
    const sides = 210 * FX.smooth((Math.abs(x - 31) - 260) / 1100) * south * (0.6 + 0.8 * ridge);
    return -0.06 + rise + sides - fall - Math.min(d, 2) * 0.05;
  }
  function terrain(size, segs, cx, cy, hole) {
    const g = new THREE.PlaneGeometry(size, size, segs, segs);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + cx, y = p.getZ(i) + cy;                    // plan coordinates
      let h = terrH(x, y);
      // (Three metres under the surface, not "down to minus three": south of the house the hill is already lower than that,
      // so there the coarse far land lay in the same place as the fine near land and showed through it in 20 m facets,
      // with a ruled seam where it began.)
      if (hole && x > hole[0] && x < hole[2] && y > hole[1] && y < hole[3]) h = Math.min(h - 3, -3);
      p.setXYZ(i, WX(x), h, WZ(y));
    }
    g.computeVertexNormals();
    // texture projected from above: on steep slopes it stretches a little, but never flips into stripes
    const uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), -p.getZ(i));
    uv.needsUpdate = true;
    return g;
  }

  /* ---------- the build --------------------------------------------------------- */
  const cutPlane = new THREE.Plane(new V3(0, -1, 0), 1.2);
  const LID_NEAR = 0.6;                                         // metres a wall's lid is pulled towards the eye, for the depth test only (see buildCaps)
  const mirrorClip = new THREE.Plane(new V3(0, 1, 0), 1e6);     // cuts nothing, except while the bath's mirror is being drawn
  let pivot = null, annMat = null, sunLight = null, skyMat = null;
  const zones = { patio: [], ext: [], garden: [], living: [] };   // landscape, shown once its zone starts to turn real
  let hemiLight = null, elBase = null;
  const lampSlots = [];
  let decorKey = -1, zoneKey = -1, doorWas = -1, frames = 0, resBudget = 1, slow = 0, stage = null;
  const capMeshes = [];
  const glassMeshes = [], glassPairs = [];
  const panes = {};
  const roofMeshes = [];
  const dims = {};
  const dustSets = {};
  const RES = { value: new THREE.Vector2(800, 450) };

  /* Every shader the house uses goes to the graphics card at once, before anything is drawn, and the page waits for
     them without blocking. Drawn first, a shader is built there and then while everything waits for it, one at a time.
     A first visit (no shader cache) took 57 s to be ready that way, 15 Oct, and one Metal compiler sat at 100 percent the
     whole time. They are built for the buffer the scene is really drawn into (the finisher's, linear colour): the
     engine's renderer.compile built them for the canvas, a variant the scene never uses. */
  async function warmShaders(ctx) {
    const { renderer, scene, camera } = ctx;
    if (!renderer.compileAsync || new URLSearchParams(location.search).get('warm') === '0') return;     // (?warm=0: the load as it was, for comparing)
    const rt = ctx.post && ctx.post.rtScene;
    renderer.setRenderTarget(rt || null);
    const job = renderer.compileAsync(scene, camera);
    renderer.setRenderTarget(null);
    await job;
  }

  async function build(ctx) {
    const { scene, renderer, loader } = ctx;
    ctx.warmShaders = () => warmShaders(ctx);           // (house-looks.js calls it again for what it adds before its capture)
    // With every room in code (the default since 15 Oct) no Poly Haven scan is downloaded: a scan set comes back empty, and the
    // materials built from it are only the names house-looks.js gives their code to. ?code=none loads the scans, for comparing.
    if (HOUSE && HOUSE.allCode) loader.set = () => Promise.resolve({ diff: null, nor: null, arm: null });
    // ?bootlog (tools only): every draw is timed to the end of its work on the graphics card, and the slow ones are kept in
    // window.__bootLog: [ms, what was drawn, its material, which buffer]. The first draw of a shader in a buffer of a new
    // kind is where a cold load waits.
    if (new URLSearchParams(location.search).has('bootlog')) {
      const gl = renderer.getContext(), rbd = renderer.renderBufferDirect, log = (window.__bootLog = []);
      const nameOf = (m) => { const L = window.__lintel; if (L) for (const k in L.M) if (L.M[k] === m) return k; return (m.userData.look ? m.userData.look + (m.userData.room ? '@' + m.userData.room : '') : '') || m.name || (m.uniforms ? 'shader:' + Object.keys(m.uniforms).slice(0, 5).join(',') : m.type); };
      const rtOf = (rt) => !rt ? 'canvas' : rt.isWebGLCubeRenderTarget ? 'cube' + rt.width : (rt.texture && rt.texture.format === THREE.RGBAFormat && rt.texture.type === THREE.HalfFloatType ? 'h' : 'x') + rt.samples + (rt.depthBuffer ? 'd' : '') + ':' + rt.width;
      renderer.renderBufferDirect = function (camera, sc, geometry, material, object, group) {
        const t = performance.now();
        rbd.call(this, camera, sc, geometry, material, object, group);
        gl.finish();
        const dt = performance.now() - t;
        if (window.__drawSum) { const k = nameOf(material) + ' | ' + rtOf(renderer.getRenderTarget()); window.__drawSum[k] = (window.__drawSum[k] || 0) + dt; }
        if (dt > 15) log.push([Math.round(dt), (object.name || object.type) + (object.isInstancedMesh ? '#' + object.count : '') + ':' + (geometry.index ? geometry.index.count : geometry.attributes.position.count), nameOf(material), material.isShaderMaterial ? 'shader' : material.type, rtOf(renderer.getRenderTarget()), object.isInstancedMesh ? 'inst' : '', Math.round(t)]);
      };
    }
    bootMark('build');
    renderer.setClearColor(0x000000, 1);                   // alpha 1 = paper, rgb 0 = no hatch
    // The cut is not the renderer's any more. Every material of the house tests it itself (see "The cut, once more" in
    // drawable, and the depth pass), which lets the land, the trees and what stands in the gardens stay whole.
    renderer.clippingPlanes = [mirrorClip];
    if (document.fonts) await Promise.all(['500 40px "Geist Mono"', '400 40px "Geist Mono"'].map((f) => document.fonts.load(f).catch(() => null)));

    // late afternoon sun from the south west
    // (with every room in code, the sky is code too: the same two pictures made from a rule fitted to this panorama, see
    // code-sky.js. ?code=none loads the panorama)
    const sk = HOUSE && HOUSE.allCode && window.LINTEL_CODESKY ? window.LINTEL_CODESKY.make(THREE, renderer, { sunAzimuth: Math.atan2(0.37, -0.93) })
      : await loader.sky(SKY + 'qwantani_late_afternoon_puresky_1k.hdr', SKY + 'qwantani_late_afternoon_puresky.jpg', { sunAzimuth: Math.atan2(0.37, -0.93) });
    scene.environment = sk.env;
    bootMark('sky');

    const leafTex = FX.canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#34402a'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 4200; i++) {
        const x = Math.random() * w, y = Math.random() * h, sz = 3 + Math.random() * 7;
        g.fillStyle = ['#283222', '#46553a', '#5b6b47', '#2f3a26', '#6f7d55'][(Math.random() * 5) | 0];
        g.beginPath(); g.ellipse(x, y, sz, sz * 0.45, Math.random() * 3, 0, 6.28); g.fill();
      }
    }, { repeat: true });
    const [conc, trav, plaster, oak, gravel, linen, grass, wool, barkSet, planks, stoneSet] = await Promise.all([
      loader.set(TEX + 'wood_textured_concrete'), loader.set(TEX + 'marble_01'), loader.set(TEX + 'white_stucco'),
      loader.set(TEX + 'oak_wood_planks'), loader.set(TEX + 'gravel_floor_02'), loader.set(TEX + 'rough_linen'), loader.set(TEX + 'withered_grass'),
      loader.set(TEX + 'poly_wool_herringbone'), loader.set(TEX + 'pine_bark'), loader.set(TEX + 'black_painted_planks'),
      loader.set(TEX + 'rustic_stone_wall'),
    ]);
    bootMark('tex');
    const plain = (o) => new THREE.MeshStandardMaterial(o);
    /* Glass, as two materials on one mesh. Until iteration 4 a pane had one material with two blend states, "drawn"
       and "real", switched when the space behind it had finished turning real. In between, a real pane laid a quarter
       of paper over everything seen through it (the garden went pale while it was scanned from the bath) and the
       view cleared with a jump at the switch. Now each pane is drawn twice, with no states: its paper part writes
       paper, its real part only adds a reflection over real pixels. Each fragment decides for itself. */
    const glassMat = (o) => {
      const mk = (paper) => Object.assign(drawable(plain({ color: 0x0b0f11, metalness: 0, roughness: 0.04, envMapIntensity: 1.6, transparent: true, depthWrite: false }),
        'glass', Object.assign({ glass: true, glassOpacity: 0.26, glassPaper: paper }, o)), { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendDst: THREE.OneMinusSrcAlphaFactor },
        paper ? { blendSrc: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor }
          : { blendSrc: THREE.OneMinusDstAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor });
      const real = mk(false);
      real.userData.paperTwin = mk(true); real.userData.paneKey = o.room || null;
      return real;
    };
    const M = {
      // this scan averages a quarter of the stucco's brightness, so it is lifted in linear colour
      concrete: drawable(FX.pbr(conc, { size: 1.8, color: new THREE.Color().setRGB(1.5, 1.52, 1.52), normal: 1.3, env: 0.7, rotate: Math.PI / 2 }), 'concrete', { sat: 0.25, macro: 0.5 }),
      concreteIn: drawable(FX.pbr(conc, { size: 1.8, color: new THREE.Color().setRGB(2.3, 2.28, 2.2), normal: 1.2, env: 0.6, rotate: Math.PI / 2 }), 'concrete', { sat: 0.3, macro: 0.35 }),
      // the outside concrete with no tie holes and no dots in the drawing: for pieces too narrow to carry one (the piers beside a clerestory)
      concretePlain: drawable(FX.pbr(conc, { size: 1.8, color: new THREE.Color().setRGB(1.5, 1.52, 1.52), normal: 1.3, env: 0.7, rotate: Math.PI / 2 }), 'none', { sat: 0.25, macro: 0.5 }),
      plaster: drawable(FX.pbr(plaster, { size: 2.4, color: 0xfbf8f2, env: 0.62, normal: 0.8 }), 'none', { sat: 0.5, macro: 0.06 }),
      ceiling: drawable(FX.pbr(plaster, { size: 2.4, color: new THREE.Color().setRGB(1.85, 1.78, 1.68), env: 0.75, normal: 0.6 }), 'none', { sat: 0.5 }),
      // (more relief, colour and variation since 13 Oct. Sam, on the patio: "enhance the texture a little bit more")
      trav: drawable(FX.pbr(trav, { size: 2.4, color: new THREE.Color().setRGB(0.95, 0.91, 0.84), env: 0.75, normal: 1.15, roughness: 0.72 }), 'stone', { sat: 0.68, macro: 0.28 }),
      travBlock: drawable(FX.pbr(trav, { size: 1.8, color: new THREE.Color().setRGB(1.0, 0.95, 0.88), env: 0.65, normal: 0.6, roughness: 0.8 }), 'none', { sat: 0.55, macro: 0.08 }),
      oak: drawable(FX.pbr(oak, { size: 1.4, color: new THREE.Color().setRGB(1.06, 1.0, 0.84), env: 0.8, roughness: 0.74 }), 'none', { sat: 0.3 }),
      oakDoor: drawable(FX.pbr(oak, { size: 1.3, color: new THREE.Color().setRGB(1.25, 1.08, 0.9), env: 1.1, rotate: Math.PI / 2 }), 'timber', { room: 'entrance', sat: 0.55 }),
      glassSky: glassMat({ room: 'ext' }),
      conc: drawable(FX.pbr(conc, { size: 2.2, color: 0xc9cbcb, env: 0.5 }), 'none', { sat: 0.3 }),
      concFloor: drawable(FX.pbr(conc, { size: 2.2, color: new THREE.Color().setRGB(1.2, 1.2, 1.17), env: 0.5 }), 'none', { sat: 0.3 }),   // the garage floor: the dark scan, lifted
      fabric: drawable(FX.pbr(linen, { size: 0.8, color: new THREE.Color().setRGB(1.95, 1.78, 1.52), env: 0.3 }), 'none', { sat: 0 }),
      dark: drawable(plain({ color: 0x2b2724, roughness: 0.55, envMapIntensity: 0.6 }), 'none'),
      car: drawable(plain({ color: 0x1b1e21, metalness: 0.6, roughness: 0.3 }), 'none'),
      bronze: drawable(plain({ color: 0x3d3029, metalness: 0.85, roughness: 0.4, envMapIntensity: 1.0 }), 'none'),
      frame: drawable(plain({ color: 0x3d3029, metalness: 0.85, roughness: 0.4, envMapIntensity: 1.0 }), 'none'),          // window frames and mullions: bronze, as its own material so it can be a "thin member"   // darker and less red: lit by a lamp it went rust orange
      glass: glassMat({}),
      water: drawable(plain({ color: 0x0a1c1f, metalness: 0, roughness: 0.06, envMapIntensity: 0.9 }), 'water', { side: THREE.FrontSide }),
      fire: drawable(plain({ color: 0x000000, emissive: 0xff7a2e, emissiveIntensity: 0, roughness: 1 }), 'none'),
      roof: drawable(FX.pbr(plaster, { size: 2.4, color: new THREE.Color().setRGB(1.85, 1.78, 1.68), env: 0.75, normal: 0.6 }), 'none', { sat: 0.5 }),
      larch: drawable(FX.pbr(planks, { size: 1.6, color: 0x8f8a86, env: 0.6, normal: 1.9 }), 'timber'),
      lawn: drawable(FX.pbr(grass, { size: 1.4, color: new THREE.Color().setRGB(0.5, 0.74, 0.4), env: 0.5 }), 'none', { farFlat: true, sat: 0.55, macro: 0.5, side: THREE.FrontSide }),
      glassMirror: drawable(plain({ color: 0xc4c8c8, metalness: 1, roughness: 0.08, envMapIntensity: 0.8 }), 'none'),
      rug: drawable(FX.pbr(linen, { size: 0.5, color: new THREE.Color().setRGB(0.98, 0.9, 0.78), env: 0.4, normal: 1.6 }), 'none', { sat: 0 }),
      leaf: drawable(new THREE.MeshStandardMaterial({ map: leafTex, roughness: 0.9, envMapIntensity: 0.5 }), 'none'),
      gravel: drawable(FX.pbr(gravel, { size: 2, color: new THREE.Color().setRGB(1.04, 0.98, 0.87), env: 0.6 }), 'none', { farFlat: true, sat: 0.5, macro: 0.3, side: THREE.FrontSide }),   // a tone under the path's stone, so from above the court is not one pale slab
      ground: drawable(FX.pbr(grass, { size: 2.4, color: 0xc7c2a8, env: 0.5 }), 'none', { farFlat: true, sat: 0.6, macro: 0.6, side: THREE.FrontSide }),
    };
    // The interior doors' leaves: the floor's oak scan, as a material of their own, so that in code they can be a door (an
    // upright veneer) and not the floor's boards turned on their side. (Same textures, same shader: nothing more to load.)
    M.oakLeaf = M.oak.clone(); M.oakLeaf.onBeforeCompile = M.oak.onBeforeCompile; M.oakLeaf.customProgramCacheKey = M.oak.customProgramCacheKey;
    M.oakLeaf.userData = Object.assign({}, M.oak.userData);
    M.gravel.polygonOffset = true; M.gravel.polygonOffsetFactor = -1; M.gravel.polygonOffsetUnits = -2;
    // Gravel keeps its grain in the shade. Lit only by the sky it went to a smooth grey slab, and the forecourt read as
    // two materials: flat grey west of the path, grainy and warm east of it (Sam, 13 Oct). The scan's own light and
    // dark count once more, near the eye only: far off the scan is its own average and the factor is 1.
    const GRAIN = `#ifdef USE_MAP
      vec3 Wl = vec3(0.299, 0.587, 0.114); float fine = dot(texture2D(map, vMapUv).rgb, Wl), avg = dot(texture2D(map, vMapUv, 8.0).rgb, Wl);
      diffuseColor.rgb *= clamp(mix(1.0, fine / max(avg, 1e-3), 0.5), 0.6, 1.5);
      #endif`;
    surfaced(M.gravel, 'grain', GRAIN);
    // The forecourt's gravel: dark grey chippings, no colour of their own, so they are the same grey in the house's
    // shadow and in the sun. (Sam, 13 Oct: "the left colour, can we apply it on the right as well".)
    M.gravelCourt = surfaced(drawable(FX.pbr(gravel, { size: 2, color: new THREE.Color().setRGB(0.36, 0.37, 0.39), env: 0.45 }), 'none', { farFlat: true, sat: 0, macro: 0.3, side: THREE.FrontSide }), 'grain', GRAIN);
    M.gravelCourt.polygonOffset = true; M.gravelCourt.polygonOffsetFactor = -1; M.gravelCourt.polygonOffsetUnits = -2;
    // The path's stone: big slabs of a pale limestone, honed. No scan (the travertine's scan carries its own tile joints,
    // and a slab has none): clouds, a fine grain, a few fossil flecks and a faint vein, each slab a shade of its own.
    M.pathStone = surfaced(drawable(plain({ color: 0xffffff, roughness: 1, metalness: 0, envMapIntensity: 0.6 }), 'none', { sat: 1, macro: 0 }), 'limestone', `
      vec2 p = vDrawW.xz; float slab = floor((vDrawW.z - ${WZ(26).toFixed(3)}) / 2.0);
      float cloud = vn(vec3(p * 0.55, slab * 3.1)), fine = vn(vec3(p * 38.0, 2.0)), fleck = smoothstep(0.74, 0.86, vn(vec3(p * 11.0, 9.0 + slab)));
      float vein = 1.0 - smoothstep(0.0, 0.035, abs(vn(vec3(p * vec2(0.9, 2.6) + cloud, slab)) - 0.5));
      vec3 stone = vec3(0.5, 0.455, 0.385) * (0.86 + 0.28 * cloud) * (0.9 + 0.2 * fine) * (0.95 + 0.1 * dh(vec2(slab, 4.0)));
      stone = mix(stone, stone * vec3(0.8, 0.77, 0.72), fleck * 0.55);
      stone = mix(stone, stone * vec3(1.1, 1.08, 1.04), vein * 0.5);
      diffuseColor.rgb = stone; roughnessFactor = 0.5 + 0.16 * fine;`);
    // The path's slabs (and the bands across the forecourt): a vein-cut travertine, honed. Its strata run down the path in
    // bands of honey and fawn that wander a little, with small elongated pores, a cloud, a fine grain, each slab a shade of
    // its own. (Sam, 14 Oct: "I like that you have some block delimitation, but try to use a more premium stone texture".
    // The plain limestone before it read as a pale flat slab in the sun.)
    M.pathSlab = surfaced(drawable(plain({ color: 0xffffff, roughness: 1, metalness: 0, envMapIntensity: 0.65 }), 'none', { sat: 1, macro: 0 }), 'travertineVein', `
      vec3 p = vDrawW; vec2 q = p.xz; float slab = floor((p.z - ${WZ(26).toFixed(3)}) / 2.0);
      float wv = vn(vec3(q * vec2(0.5, 0.12), slab)) * 1.4 + vn(vec3(q * vec2(2.0, 0.5), slab + 9.0)) * 0.25;
      float strata = vn(vec3(q.x * 16.0 + wv * 4.0, p.y * 16.0, q.y * 0.45 + slab * 5.0));
      float fineS = vn(vec3(q.x * 42.0 + wv * 9.0, p.y * 42.0, q.y * 1.5 + slab));
      float cloud = vn(vec3(q * 0.9, slab * 3.1)), grain = vn(vec3(q * 60.0, 2.0)), grit = vn(vec3(q * 150.0, 4.0));
      float pore = smoothstep(0.84, 0.94, vn(vec3(q.x * 95.0 + wv * 14.0, p.y * 95.0, q.y * 24.0 + slab))) * smoothstep(0.4, 0.7, vn(vec3(q * 4.0, 8.0)));
      float vein = 1.0 - smoothstep(0.0, 0.06, abs(vn(vec3(q.x * 5.0 + wv * 2.5, p.y * 5.0, q.y * 0.35 + slab * 2.0)) - 0.5));
      vec3 stone = mix(vec3(0.6, 0.52, 0.41), vec3(0.44, 0.37, 0.28), smoothstep(0.25, 0.75, strata));
      stone = mix(stone, stone * vec3(1.08, 1.06, 1.03), smoothstep(0.6, 0.85, fineS) * 0.6);
      stone *= (0.9 + 0.16 * cloud) * (0.93 + 0.12 * grain) * (0.96 + 0.07 * grit) * (0.94 + 0.12 * dh(vec2(slab, 4.0)));
      stone *= (1.0 - 0.3 * pore) * (1.0 - 0.22 * vein);
      diffuseColor.rgb = stone; roughnessFactor = 0.5 + 0.14 * grain + 0.2 * pore;`);
    // The entrance's floor: one field of dark marble, polished, no joint in it, like a Nero Marquina. Veins are the
    // crests of noise that has been bent and then stretched along one direction, three sizes of them: a few that read,
    // more that are hairlines. (Two first tries: veins as the contour lines of plain noise read as a map, and a sine
    // bent by turbulence closed into glowing loops.)
    M.marbleDark = surfaced(drawable(plain({ color: 0xffffff, roughness: 1, metalness: 0, envMapIntensity: 0.18 }), 'none', { sat: 1, macro: 0 }), 'marble', `
      vec2 p = vDrawW.xz;
      vec2 q = p + 0.7 * vec2(vn(vec3(p * 0.5, 1.0)), vn(vec3(p * 0.5, 2.0)));
      vec2 r = mat2(0.82, -0.57, 0.57, 0.82) * q;
      float n1 = 1.0 - abs(2.0 * vn(vec3(r * vec2(0.45, 1.9), 3.0)) - 1.0);
      float n2 = 1.0 - abs(2.0 * vn(vec3(r * vec2(1.1, 4.6) + 5.0, 4.0)) - 1.0);
      float n3 = 1.0 - abs(2.0 * vn(vec3(r * vec2(2.6, 10.0) + 9.0, 5.0)) - 1.0);
      // (each vein no sharper than a pixel can hold, its strength kept: thinner, the veins broke into dots that sparkled as
      // the camera moved, "the loudest CG tell in the entrance", the outside review of 15 Oct)
      float k1 = min(70.0, 1.0 / max(fwidth(n1) * 1.6, 1e-4)), k2 = min(110.0, 1.0 / max(fwidth(n2) * 1.6, 1e-4)), k3 = min(140.0, 1.0 / max(fwidth(n3) * 1.6, 1e-4));
      float vein = pow(n1, k1) * (k1 / 70.0) * (0.35 + 0.65 * vn(vec3(p * 0.6, 6.0))) + pow(n2, k2) * (k2 / 110.0) * 0.45 + pow(n3, k3) * (k3 / 140.0) * 0.25 + pow(n1, 12.0) * 0.05;
      vec3 base = vec3(0.034, 0.031, 0.029) * (0.8 + 0.4 * vn(vec3(p * 1.6, 9.0)));
      diffuseColor.rgb = mix(base, vec3(0.48, 0.47, 0.45), clamp(vein, 0.0, 1.0));
      roughnessFactor = 0.34 + 0.06 * vein;`);
    // The kitchen island's quartz: a warm white with soft grey veins, polished. The same veins as the entrance's marble,
    // wider apart and fainter. (Travertine with its tile joints until 13 Oct. Sam: "a counter made out of quartz".)
    M.quartz = surfaced(drawable(plain({ color: 0xffffff, roughness: 1, metalness: 0, envMapIntensity: 0.55 }), 'none', { sat: 1, macro: 0 }), 'quartz', `
      vec2 p = vDrawW.xz + vec2(0.0, vDrawW.y * 0.8);
      vec2 q = p + 0.6 * vec2(vn(vec3(p * 0.4, 1.0)), vn(vec3(p * 0.4, 2.0)));
      vec2 r = mat2(0.94, -0.34, 0.34, 0.94) * q;
      float n1 = 1.0 - abs(2.0 * vn(vec3(r * vec2(0.35, 1.2), 3.0)) - 1.0);
      float n2 = 1.0 - abs(2.0 * vn(vec3(r * vec2(0.9, 3.2) + 5.0, 4.0)) - 1.0);
      float vein = pow(n1, 40.0) * (0.4 + 0.6 * vn(vec3(p * 0.5, 6.0))) + pow(n2, 90.0) * 0.35 + pow(n1, 8.0) * 0.06;
      vec3 base = vec3(0.8, 0.785, 0.76) * (0.97 + 0.06 * vn(vec3(p * 2.2, 9.0)));
      diffuseColor.rgb = mix(base, vec3(0.42, 0.42, 0.42), clamp(vein, 0.0, 1.0) * 0.75);
      roughnessFactor = 0.16;`);
    // Dark honed basalt: near black, a fine pale fleck, a soft sheen (the patio olive's ring since 13 Oct)
    M.basalt = surfaced(drawable(plain({ color: 0xffffff, roughness: 1, metalness: 0, envMapIntensity: 0.5 }), 'none', { sat: 1, macro: 0 }), 'basalt', `
      vec3 p = vDrawW;
      float fine = vn(p * 60.0), fleck = smoothstep(0.82, 0.92, vn(p * 34.0 + 3.0)), cloud = vn(p * 1.4);
      diffuseColor.rgb = vec3(0.045, 0.045, 0.048) * (0.8 + 0.4 * cloud) * (0.85 + 0.3 * fine) + fleck * vec3(0.06);
      roughnessFactor = 0.5 + 0.15 * fine;`);
    // A low cushion of groundcover: small leaves in clumps, darker in the hollows between them. Round the olive's foot it
    // gives way to a collar of dark soil with grit in it, its edge ragged, so the roots and stones sit in earth.
    M.moss = surfaced(drawable(plain({ color: 0xffffff, roughness: 1, metalness: 0, envMapIntensity: 0.3 }), 'none', { sat: 1, macro: 0, room: 'patio' }), 'moss', `
      vec3 p = vDrawW;
      float clumps = vn(p * 4.0), tuft = vn(p * 14.0), leaf = vn(p * 42.0), sparkle = smoothstep(0.72, 0.95, vn(p * 95.0));
      vec3 col = mix(vec3(0.03, 0.05, 0.018), vec3(0.1, 0.15, 0.05), clumps) * (0.6 + 0.5 * tuft) * (0.75 + 0.5 * leaf) + sparkle * vec3(0.05, 0.07, 0.025);
      float dT = length(p.xz - vec2(${WX(30).toFixed(2)}, ${WZ(18).toFixed(2)}));
      float soil = 1.0 - smoothstep(0.62, 1.2, dT + (vn(p * 3.0) - 0.5) * 0.55 + (tuft - 0.5) * 0.25);
      vec3 earth = vec3(0.055, 0.04, 0.03) * (0.65 + 0.7 * vn(p * 70.0)) + smoothstep(0.78, 0.94, vn(p * 48.0)) * vec3(0.09, 0.08, 0.07);
      col = mix(col, earth, soil);
      diffuseColor.rgb = col; roughnessFactor = 0.85 + 0.1 * soil;`);
    // Solid walnut for the dining table and its chairs: a slab, not a scan of veneer tiles. Streaks run along x (the table's
    // length), growth rings cross the slab's width, fine pores ride the streaks.
    M.walnutSolid = surfaced(drawable(plain({ color: 0xffffff, roughness: 1, metalness: 0, envMapIntensity: 0.55 }), 'none', { sat: 1, macro: 0 }), 'walnut', `
      vec3 p = vDrawW;
      float warp = vn(vec3(p.x * 0.35, p.y * 2.5, p.z * 2.5)) * 0.9 + vn(vec3(p.x * 1.2, p.y * 8.0, p.z * 8.0)) * 0.15;
      float rings = fract((p.z * 2.6 + p.y * 3.1) + warp * 1.6);
      float ring = smoothstep(0.0, 0.15, rings) * (1.0 - smoothstep(0.55, 1.0, rings));
      float pores = vn(vec3(p.x * 1.5, p.y * 160.0, p.z * 160.0));
      vec3 col = mix(vec3(0.13, 0.075, 0.045), vec3(0.27, 0.16, 0.09), ring) * (0.82 + 0.32 * pores);
      diffuseColor.rgb = col; roughnessFactor = 0.48 + 0.12 * pores;`);
    // Teak for the patio's loungers and lounge, oiled, a honey brown with a close straight grain along z (a lounger's length).
    // (Walnut boxes until 13 Oct. Sam: "make better patio furniture... more premium".)
    M.teak = surfaced(drawable(plain({ color: 0xffffff, roughness: 1, metalness: 0, envMapIntensity: 0.55 }), 'none', { sat: 1, macro: 0 }), 'teak', `
      vec3 p = vDrawW;
      float warp = vn(vec3(p.x * 3.0, p.y * 3.0, p.z * 0.4)) * 0.8;
      float streak = vn(vec3(p.x * 46.0 + warp * 3.0, p.y * 46.0 + warp * 3.0, p.z * 1.3));
      float pores = vn(vec3(p.x * 170.0, p.y * 170.0, p.z * 4.0));
      vec3 col = mix(vec3(0.24, 0.14, 0.075), vec3(0.4, 0.26, 0.14), streak) * (0.84 + 0.28 * pores);
      diffuseColor.rgb = col; roughnessFactor = 0.5 + 0.12 * pores;`);
    // The gallery's and the master suite's floor: one field of black marble, polished, fine white veins in a network and a
    // few that cross the whole floor. (Travertine tiles in the gallery until 13 Oct, the same as the patio outside its
    // glass, and oak in the bedroom. Sam: "this is a new floor... it will continue to the master bedroom... dark and
    // really premium".) Darker and glossier than the entrance's marble, with brighter veins.
    M.marbleNero = surfaced(drawable(plain({ color: 0xffffff, roughness: 1, metalness: 0, envMapIntensity: 0.3 }), 'none', { sat: 1, macro: 0 }), 'nero', `
      vec2 p = vDrawW.xz;
      vec2 q = p + 0.45 * vec2(vn(vec3(p * 0.35, 21.0)), vn(vec3(p * 0.35, 22.0)));
      vec2 r = mat2(0.57, -0.82, 0.82, 0.57) * q;
      float n1 = 1.0 - abs(2.0 * vn(vec3(r * vec2(0.22, 2.4), 23.0)) - 1.0);
      float n2 = 1.0 - abs(2.0 * vn(vec3(r * vec2(0.6, 5.5) + 5.0, 24.0)) - 1.0);
      float n3 = 1.0 - abs(2.0 * vn(vec3(r * vec2(1.6, 12.0) + 9.0, 25.0)) - 1.0);
      float vein = pow(n1, 160.0) * (0.25 + 0.75 * vn(vec3(p * 0.5, 26.0))) + pow(n2, 200.0) * 0.35 + pow(n3, 220.0) * 0.2 + pow(n1, 18.0) * 0.03;
      vec3 base = vec3(0.016, 0.016, 0.018) * (0.8 + 0.4 * vn(vec3(p * 1.6, 27.0)));
      diffuseColor.rgb = mix(base, vec3(0.44, 0.435, 0.42), clamp(vein, 0.0, 1.0));
      roughnessFactor = 0.24 + 0.06 * vein;`);
    // Solid walnut with its grain along z (world), for long pieces that run that way: the gallery's benches, the bedroom's
    // chest, the bath's vanity. The same wood as the dining table, turned.
    M.walnutZ = surfaced(drawable(plain({ color: 0xffffff, roughness: 1, metalness: 0, envMapIntensity: 0.55 }), 'none', { sat: 1, macro: 0 }), 'walnutZ', `
      vec3 p = vDrawW;
      float warp = vn(vec3(p.z * 0.35, p.y * 2.5, p.x * 2.5)) * 0.9 + vn(vec3(p.z * 1.2, p.y * 8.0, p.x * 8.0)) * 0.15;
      float rings = fract((p.x * 2.6 + p.y * 3.1) + warp * 1.6);
      float ring = smoothstep(0.0, 0.15, rings) * (1.0 - smoothstep(0.55, 1.0, rings));
      float pores = vn(vec3(p.z * 1.5, p.y * 160.0, p.x * 160.0));
      vec3 col = mix(vec3(0.13, 0.075, 0.045), vec3(0.27, 0.16, 0.09), ring) * (0.82 + 0.32 * pores);
      diffuseColor.rgb = col; roughnessFactor = 0.48 + 0.12 * pores;`);
    // The bath's floor: large porcelain tiles, 1.2 by 0.6 m, a warm stone grey with a soft cloud and a fine grain, each tile a
    // shade of its own, a thin dark joint with the tiles' edges eased into it, a satin finish. (Travertine until 13 Oct.
    // Sam: "the tile, make like premium ceramic with nice texture".)
    M.porcelain = surfaced(drawable(plain({ color: 0xffffff, roughness: 1, metalness: 0, envMapIntensity: 0.5 }), 'none', { sat: 1, macro: 0 }), 'porcelain', `
      vec2 p = vDrawW.xz, sz = vec2(1.2, 0.6);
      vec2 t = (p - vec2(${WX(51).toFixed(2)}, ${WZ(35).toFixed(2)})) / sz, id = floor(t), f = fract(t) * sz;
      float g = min(min(f.x, sz.x - f.x), min(f.y, sz.y - f.y));
      float joint = 1.0 - smoothstep(0.0012, 0.0026, g), ease = 1.0 - smoothstep(0.0026, 0.009, g);
      float cloud = vn(vec3(p * 1.4, id.x + id.y * 7.0)), drift = vn(vec3(p * vec2(0.6, 3.0), 2.0)), fine = vn(vec3(p * 60.0, 3.0)), speck = smoothstep(0.8, 0.93, vn(vec3(p * 150.0, 5.0)));
      vec3 tile = vec3(0.46, 0.43, 0.395) * (0.92 + 0.1 * dh(id)) * (0.88 + 0.16 * cloud + 0.06 * drift) * (0.94 + 0.1 * fine) - speck * 0.035;
      diffuseColor.rgb = mix(tile * (1.0 - 0.18 * ease), vec3(0.17, 0.16, 0.15), joint);
      roughnessFactor = mix(0.4 + 0.12 * fine, 0.9, joint);`);
    // The gallery's walls: a warm grey limewash a few shades down from the white, so the paintings stand off it
    // (Sam, 13 Oct: "a little bit darker so you have nice contrast")
    M.limewash = drawable(FX.pbr(plaster, { size: 2.4, color: new THREE.Color().setRGB(0.42, 0.395, 0.36), env: 0.5, normal: 1.0 }), 'none', { sat: 0.5, macro: 0.28 });
    // The entrance's front wall, round the opening to the living room: the same limewash in a warm taupe, darker than the
    // white, between the concrete either side and the dark floor (iteration 8, Sam, 15 Oct: "another color than off-white
    // that fits well with the texture of the left and right wall and the floor... a little bit darker")
    M.limewashEntry = drawable(FX.pbr(plaster, { size: 2.4, color: new THREE.Color().setRGB(0.66, 0.64, 0.6), env: 0.5, normal: 1.0 }), 'none', { sat: 0.6, macro: 0.28 });
    // The charred larch behind the bed: vertical battens 9 cm apart with a shadow gap between them, each burnt to a
    // slightly different black, a long grain with a dull sheen on its ridges, and the cracks of shou sugi ban running
    // across it. The battens' edges catch the light through the normal. (A scanned plank texture until 13 Oct. Sam:
    // "I like the dark wall, maybe make a more premium texture". A first try with square scales read as mosaic tiles.)
    surfaced(M.larch, 'char', `
      vec3 p = vDrawW; float u = (p.x + p.z) / 0.09, b = floor(u), f = fract(u);
      float face = smoothstep(0.0, 0.04, f) * (1.0 - smoothstep(0.84, 0.87, f));
      float grain = vn(vec3(u * 7.0, p.y * 0.9, b)), fine = vn(vec3(u * 28.0, p.y * 3.5, b + 3.0));
      float rc = 1.0 - abs(2.0 * vn(vec3(u * 0.55 + b * 1.7, p.y * 15.0, b)) - 1.0);
      float split = 1.0 - abs(2.0 * vn(vec3(u * 3.2, p.y * 1.2, b + 5.0)) - 1.0);
      float crack = smoothstep(0.88, 0.975, rc) * smoothstep(0.3, 0.7, vn(vec3(u * 2.0, p.y * 3.0, b + 7.0))) + smoothstep(0.93, 0.99, split) * 0.6;
      vec3 col = vec3(0.034, 0.032, 0.03) * (0.8 + 0.4 * dh(vec2(b, 9.0))) * (0.72 + 0.4 * grain) * (0.85 + 0.3 * fine);
      col += vec3(0.013, 0.013, 0.015) * smoothstep(0.55, 0.9, grain);
      col *= (1.0 - 0.75 * clamp(crack, 0.0, 1.0)) * mix(0.15, 1.0, face);
      diffuseColor.rgb = col; roughnessFactor = mix(0.92, 0.55, smoothstep(0.4, 0.85, grain) * face);`);
    {
      const before = M.larch.onBeforeCompile, keyBefore = M.larch.customProgramCacheKey;
      M.larch.onBeforeCompile = (sh, r) => { before(sh, r); sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { float f = fract((vDrawW.x + vDrawW.z) / 0.09);
          float sl = (1.0 - smoothstep(0.0, 0.04, f)) - smoothstep(0.81, 0.86, f) * (1.0 - step(0.87, f));
          vec3 tx = normalize((viewMatrix * vec4(0.7071, 0.0, 0.7071, 0.0)).xyz);
          normal = normalize(normal + tx * sl * 0.9); }`); };
      M.larch.customProgramCacheKey = () => keyBefore() + '-batten';
    }
    // (front: the wall the door is in, on plan line y = 26 from x = 9 to 21)
    if (FACADE) FACADE.materials({ M, FX, THREE, drawable, plain, sets: { conc, planks, trav, oak },   // before any wall is built
      front: { z: WZ(26), x0: WX(9) - 0.5, x1: WX(21) + 0.5, top: 4.845, door0: WX(13.8), door1: WX(16.2) } });
    if (HOUSE) HOUSE.materials({ M, FX, THREE, drawable, plain, WX, WZ, RU, ROOMS });

    const house = new THREE.Group();
    scene.add(house);
    const B = new FX.Batch();
    const colliders = [];
    const capRects = [];                                   // [x0, y0, x1, y1, z0, z1] in plan coordinates
    // a box from plan rect x0..x1, y0..y1 and height z0..z1
    const boxP = (mat, x0, y0, x1, y1, z0, z1, r, coll) => {
      B.add(mat, FX.bevelBox(x1 - x0, z1 - z0, y1 - y0, r == null ? 0.01 : r), FX.M(WX((x0 + x1) / 2), (z0 + z1) / 2, WZ((y0 + y1) / 2)));
      if (coll) colliders.push({ id: coll, box: new THREE.Box3(new V3(WX(x0), z0, WZ(y0)), new V3(WX(x1), z1, WZ(y1))) });
    };
    // the same, but for a box along a wall line: u along the line, w across it
    const boxL = (axis, c, u0, u1, w0, w1, z0, z1, mat, coll) => {
      if (u1 - u0 < 0.005 || z1 - z0 < 0.005) return;
      // what the cut plane leaves of this piece: a solid lid in ink (see "the cut, capped" below).
      // Glass is a thin line, frames and mullions are too fine to draw at 1:200.
      if (mat !== M.frame || z1 - z0 > 1) {                      // frames: only the upright ones, as ticks along the glass
        const glassy = mat.userData.pane || mat === M.glass || mat === M.glassSky;
        const a0 = glassy ? -0.02 : w0, a1 = glassy ? 0.02 : w1, e = glassy ? 0 : 0.004;
        capRects.push(axis === 'h' ? [u0 - e, c + a0, u1 + e, c + a1, z0, z1] : [c + a0, u0 - e, c + a1, u1 + e, z0, z1]);
      }
      if (axis === 'h') boxP(mat, u0, c + w0, u1, c + w1, z0, z1, 0.008, coll);
      else boxP(mat, c + w0, u0, c + w1, u1, z0, z1, 0.008, coll);
    };

    /* walls, from the room rectangles --------------------------------------- */
    const lines = new Map();
    const mark = (axis, c, a, b, side, room) => {
      const k = axis + '|' + c;
      let L = lines.get(k);
      if (!L) lines.set(k, (L = { axis, c, cells: new Map() }));
      for (let i = a; i < b; i++) {
        let e = L.cells.get(i);
        if (!e) L.cells.set(i, (e = { p: null, n: null }));
        e[side] = room;
      }
    };
    ROOMS.filter((r) => !r.outdoor).forEach((r) => {
      const [x0, y0, x1, y1] = r.r;
      mark('h', y0, x0, x1, 'p', r); mark('h', y1, x0, x1, 'n', r);
      mark('v', x0, y0, y1, 'p', r); mark('v', x1, y0, y1, 'n', r);
    });
    const thick = (e) => (e.p && e.n ? 0.26 : 0.4);
    // thickness of the wall that crosses this line at point u (for filling corners)
    const crossing = (axis, u, c) => {
      const L = lines.get((axis === 'h' ? 'v' : 'h') + '|' + u);
      if (!L) return 0;
      let t = 0;
      [Math.floor(c) - 1, Math.floor(c)].forEach((i) => { const e = L.cells.get(i); if (e) t = Math.max(t, thick(e)); });
      return t;
    };
    // which side of a line a room is on, and which of its walls that is
    const wallMat = (room, axis, sign) => {
      if (!room) return M.concrete;
      const dir = axis === 'h' ? (sign > 0 ? 'N' : 'S') : (sign > 0 ? 'W' : 'E');
      const k = room.walls && room.walls[dir];
      return k ? M[k] : M.plaster;
    };
    // both skins stop at the lower roof, anything above that is dealt with as one piece
    const skinTop = (e) => (e.p && e.n ? Math.min(e.p.h, e.n.h) : (e.p || e.n).h) + ROOF;
    const glassRun = (axis, c, u0, u1, z0, z1, T, pane, into, panes) => {
      // The frame stops 4 mm short of the floor and of the ceiling. Flush with them, its end faces lay in the same
      // plane as the slab and the two fought for every pixel: the "rough edges blinking" Sam saw along the top of
      // the gallery's glass (9 Oct).
      // (into: the frame runs that far into the wall below and the beam above instead, so no slit stays open between
      // them once the beam over a clerestory stands 6 mm clear of the ceiling.)
      const zb = into ? z0 - into : z0 + 0.004, zt = into ? z1 + into : z1 - 0.004;
      // (with into, the glass also runs 2.5 cm into its frame at the sill and the head. Ending on the frame's face, glass and
      // frame shared a plane and a high window's sill showed a dotted line, Sam's "rough edges" in the living, 13 Oct.)
      const gi = into ? 0.025 : 0.05;
      boxL(axis, c, u0, u1, -0.015, 0.015, z0 + gi, z1 - gi, pane || M.glass);
      // (with into, the sill member is a bronze cap over the whole wall, 2 mm proud of both faces and 3 cm down over its
      // top: the rounded top edge of the wall under a high window caught the light in a line too thin to draw, a row of
      // bright specks along every clerestory's sill)
      if (into) boxL(axis, c, u0, u1, -T / 2 - 0.002, T / 2 + 0.002, z0 - 0.03, z0 + 0.05, M.frame);
      else boxL(axis, c, u0, u1, -T * 0.3, T * 0.3, zb, z0 + 0.05, M.frame);
      // (with into, the head is a bronze band the wall's full width too, up to the beam: the head member used to be 60% of
      // the wall's width, and along both its edges a strip of the beam's underside 6 mm above the ceiling showed as a thin
      // jagged line. Sam, 14 Oct: "try to make cleaner edges".)
      if (into) boxL(axis, c, u0, u1, -T / 2 - 0.002, T / 2 + 0.002, z1 - 0.05, z1 + 0.006, M.frame);
      else boxL(axis, c, u0, u1, -T * 0.3, T * 0.3, z1 - 0.05, zt, M.frame);
      const n = panes || Math.max(1, Math.ceil((u1 - u0) / 2.2));
      for (let i = 0; i <= n; i++) {
        const u = u0 + ((u1 - u0) * i) / n;
        boxL(axis, c, Math.max(u0, u - 0.03), Math.min(u1, u + 0.03), -T * 0.3, T * 0.3, zb, zt, M.frame);
      }
    };
    const doorLeaves = [];
    const paneCache = {};
    const paneFor = (e, axis, c, mid) => {
      if (e.p && e.n) return M.glass;
      const sg = e.p ? -1 : 1;
      const px = axis === 'h' ? mid : c + sg * 0.6, py = axis === 'h' ? c + sg * 0.6 : mid;
      const out = ROOMS.find((r) => r.outdoor && px > r.r[0] && px < r.r[2] && py > r.r[1] && py < r.r[3]);
      const key = out ? out.id : 'ext';
      if (!paneCache[key]) {
        paneCache[key] = glassMat({ room: key });
        paneCache[key].userData.pane = true;
        panes[key] = paneCache[key];
      }
      return paneCache[key];
    };

    lines.forEach((L) => {
      const { axis, c } = L;
      const idx = [...L.cells.keys()].sort((a, b) => a - b);
      // runs of cells with the same rooms on both sides
      const runs = [];
      idx.forEach((i) => {
        const e = L.cells.get(i), last = runs[runs.length - 1];
        if (last && last.b === i && last.e.p === e.p && last.e.n === e.n) last.b = i + 1;
        else runs.push({ a: i, b: i + 1, e });
      });
      runs.forEach(({ a, b, e }) => {
        const T = thick(e);
        const top = skinTop(e);
        const ops = OPEN.filter((o) => o.axis === axis && o.c === c && o.b > a && o.a < b);
        // solid stretches between the openings
        const cuts = ops.map((o) => [Math.max(a, o.a), Math.min(b, o.b)]).sort((x, y) => x[0] - y[0]);
        let u = a;
        const solids = [];
        cuts.forEach(([o0, o1]) => { if (o0 > u) solids.push([u, o0]); u = Math.max(u, o1); });
        if (u < b) solids.push([u, b]);
        // (a taller room whose wall here has no high window runs its own side up in one piece, see CLERE 'plain')
        const tall = e.p && e.n && Math.abs(e.p.h - e.n.h) > 0.01 ? (e.p.h > e.n.h ? e.p : e.n) : null;
        const plainHigh = tall && tall.clerestory && CLERE[tall.id + '|' + axis + '|' + c] === 'plain';
        const topP = plainHigh && tall === e.p ? tall.h + ROOF : top, topN = plainHigh && tall === e.n ? tall.h + ROOF : top;
        solids.forEach(([u0, u1]) => {
          const open0 = cuts.some((k) => Math.abs(k[1] - u0) < 1e-6), open1 = cuts.some((k) => Math.abs(k[0] - u1) < 1e-6);
          const x0 = open0 ? 0 : Math.max(0, crossing(axis, u0, c) / 2 - 0.003);
          const x1 = open1 ? 0 : Math.max(0, crossing(axis, u1, c) / 2 - 0.003);
          boxL(axis, c, u0 - x0, u1 + x1, 0, T / 2, 0, topP, wallMat(e.p, axis, 1), 'wall');
          boxL(axis, c, u0 - x0, u1 + x1, -T / 2, 0, 0, topN, wallMat(e.n, axis, -1), 'wall');
        });
        // above the lower roof: concrete, or a band of clerestory glass
        if (e.p && e.n && Math.abs(e.p.h - e.n.h) > 0.01) {
          const high = e.p.h > e.n.h ? e.p : e.n, hs = high === e.p ? 1 : -1, lo = top, hi = high.h + ROOF;
          const band = CLERE[high.id + '|' + axis + '|' + c];
          if (high.clerestory && band === 'plain') {
            // a wall with no high window (see CLERE): concrete outside above the low roof. The room's own side was built in one
            // piece from the floor with the solid stretches above (topP, topN): as two boxes it showed a line at the joint.
            boxL(axis, c, a, b, hs > 0 ? -T / 2 : 0, hs > 0 ? 0 : T / 2, lo, hi, M.concrete);
          } else if (high.clerestory && band) {
            // a wall whose high windows are laid out by hand, across the runs it is made of: built once, with its first run
            if (a === band.span[0]) {
              // (a solid stretch under 20 cm, at a corner or an end, is a bronze post the wall's full width, like the frames)
              const solid = (s0, s1) => {
                if (s1 - s0 < 0.2) { boxL(axis, c, s0, s1, -T / 2 - 0.002, T / 2 + 0.002, lo - 0.03, high.h + 0.006, M.frame); return; }
                boxL(axis, c, s0, s1, hs > 0 ? 0 : -T / 2, hs > 0 ? T / 2 : 0, lo, high.h + 0.006, wallMat(high, axis, hs)); boxL(axis, c, s0, s1, hs > 0 ? -T / 2 : 0, hs > 0 ? 0 : T / 2, lo, high.h + 0.006, M.concrete);
              };
              let u = band.span[0];
              band.glass.forEach(([g0, g1]) => {
                if (g0 > u) solid(u, g0);
                glassRun(axis, c, g0, g1, lo, high.h, T, M.glassSky, 0.012, band.panes || 1);
                u = g1;
              });
              const e1 = band.span[1];
              if (e1 > u) solid(u, e1);
              boxL(axis, c, band.span[0], band.span[1], -T / 2, T / 2, high.h + 0.006, hi, M.concrete);
            }
          } else if (high.clerestory) {
            glassRun(axis, c, a + 0.15, b - 0.15, lo, high.h, T, M.glassSky, 0.012, high.id === 'living' ? Math.max(1, Math.round((b - a - 0.3) / 1.67)) : 0);
            // (plain: a pier 15 cm wide with one tie hole on it, seen from indoors, read as a fault)
            boxL(axis, c, a, a + 0.15, -T / 2, T / 2, lo, high.h, M.concretePlain);
            boxL(axis, c, b - 0.15, b, -T / 2, T / 2, lo, high.h, M.concretePlain);
            // The beam over the band starts 6 mm above the ceiling. In the ceiling's plane, the two fought along the wall's
            // width: a band of dark diagonal teeth along the head of the glass, in every clerestory (Sam, 13 Oct, in the
            // entrance: "near the window there's some glitching"). The same fault as over the gallery's glass on 9 Oct.
            boxL(axis, c, a, b, -T / 2, T / 2, high.h + 0.006, hi, M.concrete);
          } else {
            // the taller room keeps its own wall, the other half is facade above the low roof
            boxL(axis, c, a, b, hs > 0 ? 0 : -T / 2, hs > 0 ? T / 2 : 0, lo, hi, wallMat(high, axis, hs));
            boxL(axis, c, a, b, hs > 0 ? -T / 2 : 0, hs > 0 ? 0 : T / 2, lo, hi, M.concrete);
          }
        }
        // the openings themselves
        ops.forEach((o) => {
          const u0 = Math.max(a, o.a), u1 = Math.min(b, o.b);
          const head = o.head || Math.min(e.p ? e.p.h : 99, e.n ? e.n.h : 99);
          // The piece over an opening starts 6 mm above its head. Over floor to ceiling glass the head is the ceiling
          // itself, and the underside of this piece lay in the ceiling's plane along a strip as wide as the wall:
          // the two fought, as a comb of dark dashes along the top of the glass (the gallery, 9 Oct).
          // Over a doorway it is also 1.6 cm longer at each end. Every box of a wall has rounded edges, and where this
          // piece met the wall beside the opening in one plane, the two rounded edges drew a line from the opening's
          // corner up to the ceiling (Sam, 13 Oct: "two lines in the wall, vertical"). Longer, its flat face covers both.
          const lap = o.type === 'glass' ? 0 : 0.016;
          boxL(axis, c, u0 - lap, u1 + lap, 0, T / 2, head + 0.006, top, wallMat(e.p, axis, 1));
          boxL(axis, c, u0 - lap, u1 + lap, -T / 2, 0, head + 0.006, top, wallMat(e.n, axis, -1));
          if (o.type === 'glass') glassRun(axis, c, u0, u1, 0, head, T, paneFor(e, axis, c, (u0 + u1) / 2));
          if (o.type === 'door') doorLeaves.push({ o, T, head: Math.min(head, 3.0) });
          if (o.type === 'pivot') o.T = T;
        });
      });
    });

    /* the cut, capped -----------------------------------------------------------
       A plan fills every cut wall with solid ink (poché). Until now that ink was whatever the camera
       happened to see inside a hollow, sliced wall: its far faces. Straight from above there is almost
       nothing to see in there, so some walls came out black, some as two thin lines, and they changed
       as the view tilted. Now every wall piece carries a flat lid that rides just under the cut plane.
       One mesh per height range, shown only while the cut passes through that range. Built at the end
       of build(), once the staging has added its own solid blocks (the fireplace). */
    const buildCaps = () => {
      const groups = new Map();
      capRects.forEach((r) => {
        const k = r[4].toFixed(2) + '|' + r[5].toFixed(2);
        if (!groups.has(k)) groups.set(k, { z0: r[4], z1: r[5], pos: [], idx: [] });
        const g = groups.get(k), n = g.pos.length / 3;
        g.pos.push(WX(r[0]), 0, WZ(r[1]), WX(r[2]), 0, WZ(r[1]), WX(r[2]), 0, WZ(r[3]), WX(r[0]), 0, WZ(r[3]));
        g.idx.push(n, n + 2, n + 1, n, n + 3, n + 2);
      });
      const capMat = new THREE.ShaderMaterial({
        uniforms: RU,
        // For the depth test only, a lid counts as LID_NEAR metres nearer than it is (its place on screen and the depth it
        // reports do not change). From a camera above the cut nothing under the cut can stand in front of a lid, so this
        // can only ever put the lid over what the cut should have removed and did not: the few samples of a wall's
        // face that lie above the cut in a pixel the cut passes through. The depth pass does the same (LID_NEAR there).
        vertexShader: `uniform float uCutY; varying vec3 vW;
          void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mv = viewMatrix * w; gl_Position = projectionMatrix * mv;
            if (cameraPosition.y > uCutY + 0.3) { vec4 nearer = projectionMatrix * vec4(mv.xyz * (1.0 - ${LID_NEAR.toFixed(2)} / max(length(mv.xyz), 1.5)), 1.0); gl_Position.z = nearer.z / nearer.w * gl_Position.w; } }`,
        fragmentShader: ROOM_GLSL + `varying vec3 vW;
          void main() { float rev; vec4 org; roomOf(vW, vec3(0.0, 1.0, 0.0), rev, org); gl_FragColor = vec4(vec3(smoothstep(0.0, 0.7, gInk)), 1.0); }`,
        side: THREE.DoubleSide,
        // (The lid rides a millimetre above the cut. The clipping plane does not cut it: this material is not clipped, and
        // in the depth pass it counts as "never cut", like the land. It used to ride 4 mm under the cut, and what was left
        // of the wall above it, the inner faces of its two skins, showed as a pale dashed line down the middle of every wall.)
      });
      groups.forEach((g) => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(g.pos, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(g.pos.length / 3).fill([0, 1, 0]).flat(), 3));
        geo.setAttribute('aDecor', new THREE.Float32BufferAttribute(new Float32Array(g.pos.length / 3).fill(0.35), 1));     // (0.35: a lid. Not cut, and not land)
        geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(g.pos.length), 3));
        geo.setIndex(g.idx);
        const m = new THREE.Mesh(geo, capMat);
        m.frustumCulled = false; m.visible = false;
        m.userData.cap = [g.z0, g.z1];
        house.add(m);
        capMeshes.push(m);
      });
    };

    // interior doors, standing open at 90 degrees
    doorLeaves.forEach(({ o, T }) => {
      const room = RM[o.into], along = o.axis === 'h';
      const side = along ? (room.r[1] >= o.c ? 1 : -1) : (room.r[0] >= o.c ? 1 : -1);
      const hinge = o.hinge === 'a' ? o.a : o.b, w = o.b - o.a - 0.02;
      const h0 = T / 2, h1 = T / 2 + w;
      const u0 = o.hinge === 'a' ? hinge + 0.01 : hinge - 0.06, u1 = u0 + 0.05;
      if (along) boxP(M.oakLeaf, u0, side > 0 ? o.c + h0 : o.c - h1, u1, side > 0 ? o.c + h1 : o.c - h0, 0, 2.95, 0.01);
      else boxP(M.oakLeaf, side > 0 ? o.c + h0 : o.c - h1, u0, side > 0 ? o.c + h1 : o.c - h0, u1, 0, 2.95, 0.01);
    });

    // the pivot door: its own mesh, turned by scroll
    {
      const o = OPEN.find((k) => k.type === 'pivot');
      const leaf = new THREE.Mesh(FX.bevelBox(o.b - o.a - 0.02, o.head - 0.02, 0.08, 0.01), M.oakDoor);
      leaf.position.set(((o.a + o.b) / 2) - o.pivot, (o.head - 0.02) / 2, 0);
      pivot = new THREE.Group();
      pivot.position.set(WX(o.pivot), 0.01, WZ(o.c));
      pivot.add(leaf);
      leaf.castShadow = leaf.receiveShadow = true;
      house.add(pivot);
      const pull = new THREE.Mesh(FX.bevelBox(0.04, 1.6, 0.06, 0.01), M.frame);      // (a thin member: one stroke of ink from far off, where its two outlines used to crawl)
      pull.position.set(o.b - 0.3 - o.pivot, 1.3, 0.08);
      pivot.add(pull);
    }

    /* floors, roofs and the canopy ------------------------------------------- */
    const floorMat = (r) => ({ trav: M.trav, conc: M.concFloor, marble: M.marbleDark, nero: M.marbleNero, porcelain: M.porcelain }[r.floor] || M.oak);
    ROOMS.filter((r) => !r.outdoor).forEach((r) => {
      const [x0, y0, x1, y1] = r.r;
      // (Floor slabs have sharp edges, so two of them meet flush. With a 5 mm bevel on each, every doorway had a groove a
      // centimetre wide across it. Seen from above with the plan square to the screen, such a groove lines up with one row of
      // pixels at some camera position and with none a moment later: a line across an opening that flashed for one frame.)
      if (r.id !== 'living') boxP(floorMat(r), x0, y0, x1, y1, -0.3, 0, 0);
      // the roof slab, split into cells around any roof lights
      const holes = r.skylights || [];
      const xs = [...new Set([x0, x1, ...holes.flatMap((q) => [q[0], q[2]])])].sort((a, b) => a - b);
      const ys = [...new Set([y0, y1, ...holes.flatMap((q) => [q[1], q[3]])])].sort((a, b) => a - b);
      for (let j = 0; j < ys.length - 1; j++) {
        let run = null;
        for (let i = 0; i < xs.length - 1; i++) {
          const cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2;
          const hole = holes.some((q) => cx > q[0] && cx < q[2] && cy > q[1] && cy < q[3]);
          if (!hole) { if (run) run[1] = xs[i + 1]; else run = [xs[i], xs[i + 1]]; }
          if ((hole || i === xs.length - 2) && run) { boxP(M.roof, run[0], ys[j], run[1], ys[j + 1], r.h, r.h + ROOF - 0.02, 0.005, 'roof'); run = null; }
        }
      }
    });
    // living: a sunken lounge
    const pit = [12, 10.5, 18, 15];
    [[9, 8, 21, 10.5], [9, 15, 21, 17], [9, 10.5, 12, 15], [18, 10.5, 21, 15]].forEach((q) => boxP(M.oak, q[0], q[1], q[2], q[3], -0.8, 0, 0));
    boxP(M.oak, pit[0], pit[1], pit[2], pit[3], -0.8, -0.45, 0.005);
    boxP(M.concrete, 11, 26, 19, 29.5, 4.85, 5.15, 0.01, 'canopy');

    /* outside: patio, pool, garden, forecourt ---------------------------------- */
    const pool = [22.5, 27, 40.5, 30];
    [[21, 8, 41, 27], [21, 30, 41, 32], [21, 27, 22.5, 30], [40.5, 27, 41, 30]].forEach((q) => boxP(M.trav, q[0], q[1], q[2], q[3], -1.6, 0, 0));
    boxP(M.trav, pool[0], pool[1], pool[2], pool[3], -1.7, -1.5, 0.005);
    const water = new THREE.Mesh(FX.plane(pool[2] - pool[0], pool[3] - pool[1]), M.water);
    water.rotation.x = -Math.PI / 2; water.position.set(WX((pool[0] + pool[2]) / 2), -0.14, WZ((pool[1] + pool[3]) / 2));
    water.receiveShadow = true; house.add(water);
    boxP(M.trav, 41, 41, 59, 43.6, -0.3, 0, 0);                         // garden terrace
    // The path to the door: eight slabs of limestone, 3.5 by 2 m, a finger's gap between them, standing 8 cm out of the
    // gravel. (Until 13 Oct one box in the travertine's scan, flush with the gravel. Sam: "stone that goes a little bit up
    // from the ground, I think that will feel more premium than those tiles". The slabs did not go up: their tops are still
    // the level of the house's floor, or the door would sweep through them. The gravel went down, see COURT.)
    const COURT = -0.08;
    // (13.5 to 16.5, centred on the door's 13.8 to 16.2. It ran to 17 until 14 Oct, and Sam saw the door sit off its middle:
    // "from the opening door, on the left it's less than on the right". In the vein-cut travertine since then, see pathSlab.)
    for (let i = 0; i < 8; i++) boxP(M.pathSlab, 13.5, 26 + i * 2 + (i ? 0.02 : 0), 16.5, 28 + i * 2 - 0.02, -0.3, 0, 0.012);
    // the walls that stand at the forecourt go down to the lowered gravel (in the wall's own concrete, flush, up to the
    // rounded edge at the wall's foot), and the garage gets a sill
    [[9.0, 26.0, 13.5, 26.2], [16.5, 26.0, 21.2, 26.2], [9.0, 26.0, 9.2, 32.2], [-0.2, 32.0, 9.2, 32.2]].forEach((q) => boxP(M.concrete, q[0], q[1], q[2], q[3], -0.3, 0.008, 0));
    boxP(M.concFloor, 0.5, 32.0, 8.5, 32.7, -0.3, 0, 0.006);
    const flat = (mat, x0, y0, x1, y1, y, seg) => {
      const m = new THREE.Mesh(seg ? FX.plane(x1 - x0, y1 - y0, Math.min(90, Math.ceil((x1 - x0) / seg)), Math.min(90, Math.ceil((y1 - y0) / seg))) : FX.plane(x1 - x0, y1 - y0), mat);
      m.rotation.x = -Math.PI / 2; m.position.set(WX((x0 + x1) / 2), y, WZ((y0 + y1) / 2));
      m.receiveShadow = true; house.add(m); return m;
    };
    // (both count as ground: in the depth picture all ground near the site's level is one plane, see the depth pass)
    // (two sheets: the court in front of the house and garage, and the strip south of the garage. Half a metre wider than
    // the hole in the site, so nobody looks under the site's edge.)
    flat(M.gravelCourt, 9.0, 25.9, 23.5, 42.5, COURT).userData.ground = true;
    flat(M.gravelCourt, -1.5, 31.9, 9.0, 42.5, COURT).userData.ground = true;
    // The garden's lawn: dense and mown, a fine blade grain, soft clumps, and the faint stripes a mower leaves along its length.
    surfaced(M.lawn, 'mown', `
      vec3 p = vDrawW;
      float stripe = smoothstep(0.35, 0.65, abs(fract(p.z / 1.6) - 0.5) * 2.0);
      float clump = vn(vec3(p.xz * 2.2, 7.0)), fine = vn(vec3(p.x * 70.0, 1.0, p.z * 70.0)), blade = vn(vec3(p.x * 28.0, 2.0, p.z * 85.0));
      diffuseColor.rgb *= (0.93 + 0.1 * stripe) * (0.86 + 0.22 * clump) * (0.84 + 0.26 * fine) * (0.9 + 0.16 * blade) * vec3(0.96, 1.02, 0.92);`);
    flat(M.lawn, 41, 43.6, 61.55, 49.55, -0.008).userData.ground = true;
    // the site, with holes where the house steps down (the lounge, the pool)
    const sitePieces = [];
    {
      const holes = [[12, 10.5, 18, 15], [22.5, 27, 40.5, 30], [53, 37.6, 56.6, 39.4], [9.2, 26.2, 23, 42], [-1, 32.2, 9.2, 42]];   // (the last two: the forecourt's gravel lies 8 cm lower)
      const xs = [SITE[0], SITE[2], ...holes.flatMap((q) => [q[0], q[2]])].sort((a, b) => a - b);
      const ys = [SITE[1], SITE[3], ...holes.flatMap((q) => [q[1], q[3]])].sort((a, b) => a - b);
      for (let j = 0; j < ys.length - 1; j++) for (let i = 0; i < xs.length - 1; i++) {
        const cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2;
        if (holes.some((q) => cx > q[0] && cx < q[2] && cy > q[1] && cy < q[3])) continue;
        const piece = flat(M.ground, xs[i], ys[j], xs[i + 1], ys[j + 1], -0.03, 2);
        piece.userData.ground = true; piece.userData.plan = [(xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2];
        sitePieces.push(piece);
      }
    }

    /* the land around: near terrain at 2 m, far terrain at 20 m, the sea ------------- */
    const landMat = drawable(FX.pbr(grass, { size: 2.4, color: 0x8a9c7c, env: 0.5, vertexColors: true }), 'none', { farFlat: true, sat: 0.45, macro: 0.5, side: THREE.FrontSide });
    // patches of greener and drier meadow, broken up at two scales (world x, z)
    // (13 Oct, Sam: "make sure the grass feels full, not just in spots... add a nice grass texture... in the final overview
    // shot as well, make sure the grass texture is premium". The scan alone, from above, was a felt with pale tufts on it.
    // Now the meadow has clumps at two sizes, a blade grain close to you, and drier patches that drift across it.)
    surfaced(landMat, 'meadow', `
      vec3 p = vDrawW; float dc = length(cameraPosition - p);
      float clump = vn(vec3(p.xz * 1.6, 1.0)), tuft = vn(vec3(p.xz * 5.5, 2.0)), drift = vn(vec3(p.xz * 0.35, 6.0)), dry = smoothstep(0.55, 0.85, vn(vec3(p.xz * 0.09, 5.0)));
      float blade = vn(vec3(p.x * 45.0, 3.0, p.z * 12.0)) * 0.5 + vn(vec3(p.x * 12.0, 4.0, p.z * 45.0)) * 0.5;
      vec3 c = diffuseColor.rgb * (0.78 + 0.3 * clump) * (0.88 + 0.22 * tuft) * (0.9 + 0.2 * drift) * mix(1.0, 0.76 + 0.48 * blade, 1.0 - smoothstep(10.0, 45.0, dc));
      diffuseColor.rgb = mix(c, c * vec3(1.16, 1.05, 0.74), dry * 0.4);`);
    M.land = landMat;                                                  // (by name, so house-looks.js can give it its code)
    const tintAt = (x, z) => {
      const k = 0.8 + 0.3 * FX.noise3(x * 0.04, 1, z * 0.04);
      const green = FX.smooth((FX.noise3(x * 0.012, 5, z * 0.012) - 0.38) * 3) * (0.6 + 0.4 * FX.noise3(x * 0.07, 9, z * 0.07));
      // far from the house the slopes carry woods: darker, greener patches a few hundred metres across
      const far = FX.smooth((Math.hypot(x - 1, z - 1) - 260) / 500);
      const wood = far * FX.smooth((woodAt(x + OX, z + OZ) - 0.5) * 5);
      return [k * FX.lerp(FX.lerp(1, 0.82, green), 0.42, wood), k * FX.lerp(FX.lerp(0.97, 1.0, green), 0.56, wood), k * FX.lerp(FX.lerp(0.88, 0.7, green), 0.36, wood)];
    };
    const tint = (g) => FX.colorize(g, (x, y, z) => tintAt(x, z));
    const near = new THREE.Mesh(tint(terrain(420, 210, 31, 22, [SITE[0] + 3, SITE[1] + 3, SITE[2] - 3, SITE[3] - 3])), landMat);
    const far = new THREE.Mesh(tint(terrain(5200, 260, 31, 900, [-170, -180, 222, 214])), landMat);
    [near, far].forEach((m) => { m.receiveShadow = true; m.userData.ground = true; scene.add(m); });
    // the site itself takes the same meadow, so its edge does not show from above
    sitePieces.forEach((m) => {
      const px = WX(m.userData.plan[0]), pz = WZ(m.userData.plan[1]);
      FX.colorize(m.geometry, (x, y) => tintAt(x + px, -y + pz));
      m.material = landMat;
    });
    const seaMat = drawable(plain({ color: 0x23404c, roughness: 0.14, metalness: 0, envMapIntensity: 1.1 }), 'water', { side: THREE.FrontSide });
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(9000, 5000), seaMat);
    sea.rotation.x = -Math.PI / 2; sea.position.set(WX(31), -205, WZ(3100));
    scene.add(sea);

    // the sky: a dome that writes alpha, so it can be paper until the patio
    skyMat = new THREE.ShaderMaterial({
      uniforms: { map: { value: sk.bg }, paper: { value: 1 }, intensity: { value: 0.86 } },
      vertexShader: 'varying vec3 vDir; void main() { vDir = normalize((modelMatrix * vec4(position, 0.0)).xyz); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }',
      fragmentShader: `uniform sampler2D map; uniform float paper; uniform float intensity; varying vec3 vDir;
        void main() { vec3 d = normalize(vDir); vec2 uv = vec2(atan(d.z, d.x) * 0.15915494 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5);
          vec3 c = texture2D(map, uv).rgb * intensity; gl_FragColor = vec4(c * (1.0 - step(0.999, paper)), paper); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    const skyM = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), skyMat);
    skyM.renderOrder = -10; skyM.frustumCulled = false; skyM.userData.noPrepass = true;
    scene.add(skyM);
    scene.fog = new THREE.Fog(0xd8d2c6, 140, 3600);

    /* the olive, the grove, the cypresses, the dry grass ------------------------------- */
    // the patio's olive is cut by the plan like a wall (its trunk in solid ink), the grove is not
    // (the trunk's dot on the plan is drawn by drawPlan, so no tree needs the cut's solid ink)
    M.bark = drawable(FX.pbr(barkSet, { size: 1.1, color: new THREE.Color().setRGB(0.5, 0.44, 0.38), env: 0.35, normal: 1.8 }), 'none', { sat: 0.3, noCap: true, noRing: true });
    // (trees off the house's own floors are part of "outside" wherever they stand: three cypresses stood inside the yard's
    // rectangle, the yard's scan took them tile by tile, and for a moment a cypress tip hung in the sky with nothing under it)
    M.barkFar = drawable(FX.pbr(barkSet, { size: 1.1, color: new THREE.Color().setRGB(1.35, 1.3, 1.2), env: 0.6, normal: 1.5 }), 'none', { sat: 0.2, noCap: true, noRing: true, room: 'ext' });
    M.leafCard = drawable(new THREE.MeshStandardMaterial({ map: sprigTex(), alphaTest: 0.5, roughness: 0.85, envMapIntensity: 0.32, color: new THREE.Color().setRGB(0.6, 0.64, 0.54) }), 'none', { noCap: true, noRing: true, alphaMip: 256 });
    M.leafCardExt = drawable(new THREE.MeshStandardMaterial({ map: M.leafCard.map, alphaTest: 0.5, roughness: 0.85, envMapIntensity: 0.32, color: new THREE.Color().setRGB(0.6, 0.64, 0.54) }), 'none', { noCap: true, noRing: true, alphaMip: 256, room: 'ext' });
    // Trees are landscape: on the paper sheet they draw nothing, so each group stays hidden (and out of the
    // shadow pass) until the zone it stands in starts to turn real. Hidden trees also keep the opening fast.
    const WB = new FX.Batch(), PB = new FX.Batch(), GB = new FX.Batch();
    const leafSets = { patio: [[], []], ext: [[], []], garden: [[], []], living: [[], []], entrance: [[], []] };
    const tree = (res, zone) => { leafSets[zone][0].push(...res.m); leafSets[zone][1].push(...res.c); };
    const own = (meshes, zone) => meshes.forEach((m) => { m.castShadow = true; m.receiveShadow = true; m.userData.noPrepass = true; (zones[zone] = zones[zone] || []).push(m); });
    tree(olive(PB, M.bark, 30, 18, 1.25, 1890, ctx.LOW ? 2600 : 5600, 0.3, null, 0.42, false, true), 'patio');
    // Its foot: seven roots flare out of the trunk, run over the bed and dive into it, and river stones lie caught between
    // them on a collar of dark soil (the soil is in the groundcover's shader). Until 13 Oct the trunk stood in the bed like
    // a post. Sam: "make sure it feels like it's rooted inside the dirt and the rock and the soil around connects properly".
    {
      const rr = FX.rng(1891), o = new V3(WX(30), 0, WZ(18)), bed = (r) => 0.33 + 0.1365 * Math.sqrt(Math.max(0, 1 - (r / 1.95) ** 2));
      const at = (a, r, y) => o.clone().add(new V3(Math.cos(a) * r, y, Math.sin(a) * r));
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2 + rr() * 0.5, L = 0.9 + rr() * 0.5, bend = (rr() - 0.5) * 0.5;
        PB.add(M.bark, tubeGeo([at(a, 0.15, 0.95), at(a, 0.5, 0.62), at(a + bend * 0.3, 0.78, bed(0.78) + 0.05), at(a + bend * 0.6, 0.6 + L * 0.5, bed(0.6 + L * 0.5) - 0.01),
          at(a + bend, 0.6 + L, bed(0.6 + L) - 0.12)], 0.24, 0.03, 16, 10, 0.3, 1891 + k), new THREE.Matrix4());
      }
      for (let k = 0; k < 11; k++) {
        const a = ((k + 0.5) / 11) * Math.PI * 2 + (rr() - 0.5) * 0.4, r = 0.75 + rr() * 0.7, s = 0.07 + rr() * 0.09;
        PB.add(k % 4 ? M.pathStone : M.basalt, FX.boulder(1, 8 + k, 0.6), FX.M(o.x + Math.cos(a) * r, bed(r) + s * 0.12, o.z + Math.sin(a) * r, 0, rr() * 6.28, 0, s * 1.3, s * 0.8, s));
      }
    }
    // the grove: olives on the land around, more of them on the slope south of the house.
    // On the paper sheet they draw nothing (no ink pass, no cut), so they can stand anywhere off the site.
    const RG = FX.rng(77), GN = ctx.LOW ? 70 : 150, crowns = [];
    for (let i = 0, n = 0; n < GN && i < 2000; i++) {
      const south = RG() < 0.45;
      const x = south ? -20 + RG() * 110 : 31 + (RG() - 0.5) * 460, y = south ? 54 + Math.pow(RG(), 1.6) * 110 : 22 + (RG() - 0.5) * 440;
      if (x > SITE[0] - 3 && x < SITE[2] + 3 && y > SITE[1] - 3 && y < SITE[3] + 2) continue;
      const gs = 0.7 + RG() * 0.4;
      tree(olive(WB, M.barkFar, x, y, gs, 400 + i, ctx.LOW ? 260 : Math.hypot(x - 31, y - 26) < 85 ? 1400 : 460, terrH(x, y) - 0.1), 'ext');   // those you fly over get three times the leaves
      crowns.push([x, y, gs, terrH(x, y) - 0.1]);
      n++;
    }
    // Each grove olive has a few hundred leaf cards. From the side that is a crown, from straight above it was
    // "black confetti on bare branches". So each gets a soft dark body inside its leaves: the shade of its own crown.
    // (Built after the staging, which adds the olives of the arrival court to the list.)
    const buildCrowns = () => {
      const cg = new THREE.IcosahedronGeometry(1, 3), cp = cg.attributes.position, v = new V3();
      for (let k = 0; k < cp.count; k++) { v.fromBufferAttribute(cp, k); const q = 0.86 + FX.noise3(v.x * 1.7, v.y * 1.7 + 4, v.z * 1.7) * 0.28; cp.setXYZ(k, v.x * q, v.y * q, v.z * q); }
      cg.computeVertexNormals();                                          // (smooth, and in the leaf's own mottle: with flat facets it read as a rock in a bush)
      const cm = drawable(new THREE.MeshStandardMaterial({ map: leafTex, color: 0x6c775a, roughness: 0.96, envMapIntensity: 0.3 }), 'none', { noCap: true, noRing: true, room: 'ext', fromAbove: true });
      const cr = new THREE.InstancedMesh(cg, cm, crowns.length), dm = new THREE.Object3D();
      crowns.forEach(([x, y, gs, base], k) => { dm.position.set(WX(x), base + 2.95 * gs, WZ(y)); dm.rotation.y = k * 2.4; dm.scale.set(1.3 * gs, 0.8 * gs, 1.3 * gs); dm.updateMatrix(); cr.setMatrixAt(k, dm.matrix); });
      scene.add(cr); own([cr], 'ext'); cr.castShadow = false;
    };
    // the old olive of the garden: in the middle of the lawn, where the view from the bath door finds it against the valley
    tree(olive(GB, M.bark, 46.9, 46.2, 0.95, 2026, ctx.LOW ? 1300 : 3000, 0.1, null, 0.5), 'garden');
    // the living room's tree: a small olive in a stone planter, its crown leaning into the room.
    M.barkIn = drawable(FX.pbr(barkSet, { size: 0.9, color: new THREE.Color().setRGB(1.35, 1.3, 1.2), env: 0.5, normal: 1.5 }), 'none', { sat: 0.2, noCap: true, noRing: true });
    const IB = new FX.Batch();
    // (leaning into the room and held tighter since 13 Oct: its stems leaned north across the fireplace. Sam: "make the angle a little better")
    // (and simpler: two stems, no twigs, half the leaves. Sam: "a big trunk, a lot of branch and a lot of leaves... make it more clean")
    // (one trunk since 14 Oct, in the soil of its planter 10 cm under the lip, with a few roots at its foot. Sam: "the two
    // branches separated feels weird... better leaves and a little bit greener")
    tree(olive(IB, M.barkIn, 10.55, 15.75, 0.5, 77, ctx.LOW ? 420 : 760, 0.62, [-1.25, 0.45], 0.72, false, true), 'living');
    { const rr = FX.rng(78), o = new V3(WX(10.55), 0.62, WZ(15.75));
      for (let k = 0; k < 5; k++) { const a = (k / 5) * 6.28 + rr() * 0.6, at = (r, y) => o.clone().add(new V3(Math.cos(a) * r, y, Math.sin(a) * r));
        IB.add(M.barkIn, tubeGeo([at(0.05, 0.32), at(0.18, 0.14), at(0.3, 0.03), at(0.4, -0.04)], 0.09, 0.02, 12, 8, 0.3, 78 + k), new THREE.Matrix4()); } }
    own(IB.build(scene), 'living'); own(WB.build(scene), 'ext'); own(PB.build(scene), 'patio'); own(GB.build(scene), 'garden');
    // lavender along the garden walls
    {
      const lavTex = FX.canvasTex(256, 256, (g, w, h) => {
        g.fillStyle = '#7d8670'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 1400; i++) {
          g.fillStyle = Math.random() < 0.45 ? ['#8a79a8', '#9b8bbb', '#6f6290'][(Math.random() * 3) | 0] : ['#6b755d', '#93998a', '#5c654f'][(Math.random() * 3) | 0];
          g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 5 + Math.random() * 8);
        }
      }, { repeat: true });
      const lavM = drawable(new THREE.MeshStandardMaterial({ map: lavTex, roughness: 0.95, envMapIntensity: 0.5 }), 'none', { noCap: true });
      const LB = new FX.Batch(), RL = FX.rng(5);
      const bush = (x, y) => {
        const g = new THREE.IcosahedronGeometry(1, 2), pp = g.attributes.position, v = new V3();
        for (let k = 0; k < pp.count; k++) { v.fromBufferAttribute(pp, k); v.multiplyScalar(0.85 + FX.noise3(v.x * 3 + x, v.y * 3, v.z * 3 + y) * 0.3); pp.setXYZ(k, v.x, Math.max(v.y, -0.2), v.z); }
        g.computeVertexNormals();
        const r = 0.2 + RL() * 0.08;
        LB.add(lavM, g, FX.M(WX(x), r * 0.45, WZ(y), 0, RL() * 6, 0, r, r * 0.8, r));
      };
      for (let y = 43.9; y < 49.2; y += 0.42) { bush(61.15 + (RL() - 0.5) * 0.1, y); bush(60.7 + (RL() - 0.5) * 0.1, y + 0.2); }
      own(LB.build(scene), 'garden');
    }
    // cypresses along the north and west edges
    // (small upright sprays in the same greens since 13 Oct, from its own random numbers so it is the same on every visit)
    const fol = FX.canvasTex(512, 512, (g, w, h) => {
      const Rc = FX.rng(4242); g.fillStyle = '#222b1b'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) {
        const x = Rc() * w, y = Rc() * h, sz = 1.5 + Rc() * 4.5;
        g.fillStyle = ['#1a2215', '#34402b', '#465237', '#273021', '#58643f'][(Rc() * 5) | 0];
        g.beginPath(); g.ellipse(x, y, sz * 0.5, sz * 1.4, (Rc() - 0.5) * 0.6, 0, 6.28); g.fill();
      }
    }, { repeat: true });
    fol.repeat.set(0.35, 0.35);
    M.cypress = drawable(new THREE.MeshStandardMaterial({ map: fol, roughness: 0.95, envMapIntensity: 0.5 }), 'none', { noCap: true, noRing: true, room: 'ext' });
    // An Italian cypress is a column, not a cone: foliage nearly to the ground, the same width for the middle half of its
    // height, then closing over in a soft point, its surface in long upright lobes. (13 Oct, Sam on the last view: "there's
    // like pine tree, that feels like a triangular move, fix that". Until then the widest point was a quarter of the way up
    // and from there it ran straight to a sharp tip.)
    const cypressGeo = (hgt, seed) => {
      const g = new THREE.IcosahedronGeometry(1, 5), pp = g.attributes.position, v = new V3(), W = 0.42 + hgt * 0.055;
      for (let k = 0; k < pp.count; k++) {
        v.fromBufferAttribute(pp, k);
        const th = (v.y + 1) / 2, r = Math.hypot(v.x, v.z) || 1, a = Math.atan2(v.z, v.x);
        const prof = th < 0.09 ? Math.sin((th / 0.09) * Math.PI / 2) * 0.85 + 0.15 * th / 0.09 : th < 0.58 ? 1 - 0.16 * (th - 0.09) / 0.49 : 0.84 * Math.pow(Math.max(0, 1 - ((th - 0.58) / 0.42) ** 2), 0.75);
        const lobe = 0.8 + 0.3 * FX.noise3(Math.cos(a) * 1.7 + seed, th * hgt * 0.32, Math.sin(a) * 1.7) + 0.15 * FX.noise3(Math.cos(a) * 4.5 + seed, th * hgt * 1.1, Math.sin(a) * 4.5 + seed);
        const k2 = W * prof * lobe;
        pp.setXYZ(k, (v.x / r) * k2 * Math.min(1, r * 6), th * hgt, (v.z / r) * k2 * Math.min(1, r * 6));
      }
      g.computeVertexNormals();
      return g;
    };
    const CB = new FX.Batch();
    [[-10, -9, 11], [-11.5, -4, 13], [-9, 2, 10], [-11, 8, 12.5], [6, -10.5, 10.5], [16, -11, 12], [27, -10, 11], [46.5, -9.5, 12], [67.5, -8, 10], [70, 2, 13],      // (two of them stood exactly at the two ends of the page's button in the last view from above)
      [-10.5, 40, 11], [-12, 47, 13]].forEach(([x, y, hgt], i) => {
      CB.add(M.cypress, cypressGeo(hgt, i * 3.1), FX.M(WX(x), terrH(x, y), WZ(y)));
    });
    own(CB.build(scene), 'ext');
    // The valley below the garden was bare slopes, so the last view of the walk was "water and a hill" (Sam, 9 Oct).
    // Woods now stand on the slopes in clumps (the land's colour darkens where they do), and a white village sits
    // on the far ridge to the south-west.
    {
      const RW = FX.rng(77), crown = new THREE.IcosahedronGeometry(1, 1), cp = crown.attributes.position;
      for (let k = 0; k < cp.count; k++) cp.setY(k, cp.getY(k) * 0.78 + 0.55);
      crown.computeVertexNormals();
      const wm = drawable(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, envMapIntensity: 0.45 }), 'none', { noCap: true, noRing: true });
      const NW = ctx.LOW ? 1800 : 4600, woods = new THREE.InstancedMesh(crown, wm, NW), dm = new THREE.Object3D(), col = new THREE.Color();
      let n = 0, tries = 0, cx = 0, cy = 0, left = 0;
      while (n < NW && tries++ < NW * 40) {
        // a third stand close below the house, the rest far off as whole clumps of crowns
        const close = n < NW * 0.35;
        // The close ones grow in copses of five to sixteen round a first tree, with bare slope between: sprinkled
        // one by one they read, from the garden, as evenly spaced blobs on the ridge.
        const inCopse = close && left > 0;
        let x, y;
        if (inCopse) { const a = RW() * 6.28, r = Math.sqrt(RW()) * 30; x = cx + Math.cos(a) * r; y = cy + Math.sin(a) * r * 0.6; left--; }
        else { x = 31 + (RW() - 0.5) * (close ? 1300 : 5000); y = close ? 60 + RW() * 620 : -900 + RW() * 4200; }
        if (x > -90 && x < 160 && y > -90 && y < 120) continue;              // not on the house's own hill top
        if (!inCopse && woodAt(x, y) < (close ? 0.5 : 0.52)) continue;
        if (close && !inCopse) { cx = x; cy = y; left = 4 + Math.floor(RW() * 12); }
        const h = terrH(x, y);
        if (h < -200) continue;                                              // never in the water
        const sc = close ? (inCopse ? 2.6 + RW() * 4.4 : 5 + RW() * 3.5) : 11 + RW() * 13;
        dm.position.set(WX(x), h - sc * 0.08, WZ(y)); dm.rotation.y = RW() * 6.28; dm.scale.set(sc * (0.9 + RW() * 0.5), sc * (close ? 0.8 + RW() * 0.5 : 0.5 + RW() * 0.25), sc * (0.9 + RW() * 0.5)); dm.updateMatrix();
        woods.setMatrixAt(n, dm.matrix);
        const g = RW();
        woods.setColorAt(n, col.setRGB(0.07 + g * 0.06, 0.11 + g * 0.08, 0.05 + g * 0.03));
        n++;
      }
      woods.count = n; woods.instanceMatrix.needsUpdate = true; if (woods.instanceColor) woods.instanceColor.needsUpdate = true;
      woods.frustumCulled = false; woods.castShadow = false; woods.receiveShadow = false;
      scene.add(woods); own([woods], 'ext'); woods.castShadow = false;
      // the village: white walls, clay roofs. From the garden only land two kilometres off or more shows over the
      // edge of the hill, so that is where it stands, on the western ridge above the sea.
      const VB = new FX.Batch(), wallM = drawable(plain({ color: 0xefe6d8, roughness: 0.9 }), 'none', { noCap: true, noRing: true }), roofM = drawable(plain({ color: 0xa8563a, roughness: 0.9 }), 'none', { noCap: true, noRing: true });
      const VX = -976, VY = 1986;
      for (let i = 0; i < (ctx.LOW ? 45 : 90); i++) {
        const a = RW() * 6.28, r = Math.pow(RW(), 0.7) * 150, x = VX + Math.cos(a) * r * 1.6, y = VY + Math.sin(a) * r, h = terrH(x, y);
        if (h < -200) continue;
        const w = 9 + RW() * 9, dp = 8 + RW() * 7, hh = 5 + RW() * 6, rot = RW() * 3.14;
        VB.add(wallM, new THREE.BoxGeometry(w, hh, dp), FX.M(WX(x), h + hh / 2 - 1, WZ(y), 0, rot, 0));
        VB.add(roofM, new THREE.BoxGeometry(w + 0.8, 0.9, dp + 0.8), FX.M(WX(x), h + hh - 0.5, WZ(y), 0, rot, 0));
      }
      VB.add(wallM, new THREE.BoxGeometry(8, 26, 8), FX.M(WX(VX), terrH(VX, VY) + 12, WZ(VY)));       // the church tower
      own(VB.build(scene), 'ext');
      // three cypresses just past the garden's south-west corner, behind the pergola
      const CB2 = new FX.Batch();
      [[38.6, 52.4, 9.5], [36.4, 54.2, 11.5], [40.2, 54.6, 8.5]].forEach(([x, y, hgt], i) => {
        CB2.add(M.cypress, cypressGeo(hgt, 20 + i * 3.1), FX.M(WX(x), terrH(x, y) - 0.4, WZ(y)));
      });
      own(CB2.build(scene), 'ext');
    }
    // dry grass tufts in the meadow around the site
    {
      const R2 = FX.rng(412), blades = [];
      for (let b = 0; b < 9; b++) {
        const a = (b / 9) * 6.283 + R2(), lean = 0.1 + R2() * 0.25, hgt = 0.28 + R2() * 0.4;
        const bx = Math.cos(a) * 0.06, bz = Math.sin(a) * 0.06;
        for (let sg = 0; sg < 4; sg++) {
          const t0 = sg / 4, t1 = (sg + 1) / 4, w0 = 0.011 * (1 - t0), w1 = 0.011 * (1 - t1);
          const p0 = [bx + Math.cos(a) * lean * t0 * t0, hgt * t0, bz + Math.sin(a) * lean * t0 * t0];
          const p1 = [bx + Math.cos(a) * lean * t1 * t1, hgt * t1, bz + Math.sin(a) * lean * t1 * t1];
          const px = -Math.sin(a), pz = Math.cos(a);
          blades.push(p0[0] - px * w0, p0[1], p0[2] - pz * w0, p0[0] + px * w0, p0[1], p0[2] + pz * w0, p1[0] + px * w1, p1[1], p1[2] + pz * w1);
          blades.push(p0[0] - px * w0, p0[1], p0[2] - pz * w0, p1[0] + px * w1, p1[1], p1[2] + pz * w1, p1[0] - px * w1, p1[1], p1[2] - pz * w1);
        }
      }
      const tg = new THREE.BufferGeometry();
      tg.setAttribute('position', new THREE.Float32BufferAttribute(blades, 3));
      tg.computeVertexNormals();
      FX.colorize(tg, (x, y) => { const k = 0.3 + 0.7 * Math.min(1, y / 0.6); return [0.5 * k + 0.05, 0.52 * k + 0.07, 0.29 * k + 0.04]; });   // (greener at the foot since 13 Oct, so a tuft sits in the meadow and is not a pale spot on it)
      const tm = drawable(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, envMapIntensity: 0.6 }), 'none', { noCap: true, noRing: true });
      const N = ctx.LOW ? 7000 : 22000, tufts = new THREE.InstancedMesh(tg, tm, N), dm = new THREE.Object3D();
      let n = 0;
      while (n < N) {
        const near = R2() < 0.6;                                          // most of the grass close to the house, where you can see it
        const x = 31 + (R2() - 0.5) * (near ? 120 : 240), y = 22 + (R2() - 0.5) * (near ? 100 : 220);
        // (They used to stop dead at the site's boundary, which from above was a pale strip with a ruled edge down the
        // lawn. Now they run on over the open ground of the site and thin out toward the house and its gravel.)
        if (x > SITE[0] - 1 && x < SITE[2] + 1 && y > SITE[1] - 1 && y < SITE[3] + 1) {
          const off = Math.max(-2.5 - x, -2.5 - y, x - 64.5, 0);            // how far west, north or east of the house and its yards
          if (off <= 0 || R2() > FX.smooth(off / 9)) continue;
        }
        if (FX.noise3(x * 0.12, 3, y * 0.12) < 0.36 && R2() < 0.7) continue;
        dm.position.set(WX(x), terrH(x, y), WZ(y)); dm.rotation.set(0, R2() * 6.28, 0);
        dm.scale.set(0.8 + R2() * 0.8, 0.6 + R2() * 1.1, 0.8 + R2() * 0.8);
        dm.updateMatrix(); tufts.setMatrixAt(n++, dm.matrix);
      }
      scene.add(tufts);
      own([tufts], 'ext'); tufts.castShadow = false; tufts.userData.noReflect = true;
    }

    // a dry-stone wall along the south and east edges of the site, where the hill begins to fall
    // (it is landscape, not architecture: no hatch and no ink, so the paper sheet stays clean until the outside arrives)
    M.drystone = drawable(FX.pbr(stoneSet, { size: 2.0, color: new THREE.Color().setRGB(1.15, 1.1, 1.02), env: 0.6, normal: 1.6 }), 'none', { sat: 0.6, macro: 0.5 });
    [[SITE[0], SITE[3] + 0.4, 40.6, SITE[3] + 1.0], [62.4, SITE[3] + 0.4, SITE[2] + 0.6, SITE[3] + 1.0], [SITE[2], SITE[1], SITE[2] + 0.6, SITE[3] + 1.0]].forEach(([x0, y0, x1, y1]) => {
      for (let x = x0; x < x1 - 0.01; x += 6) {
        for (let y = y0; y < y1 - 0.01; y += 6) {
          const xe = Math.min(x1, x + 6), ye = Math.min(y1, y + 6), hgt = 0.75 + FX.noise3(x * 0.3, 2, y * 0.3) * 0.25;
          boxP(M.drystone, x, y, xe, ye, -0.3, hgt, 0.08);
        }
      }
    });

    /* furniture, decor, art, lamps, planting: see staging.js --------------------- */
    const EB = new FX.Batch();
    stage = await window.LINTEL_STAGE({ THREE, FX, M, B, WX, WZ, drawable, loader, TEX, sets: { wool, linen, oak }, scene, own, colliders, olive, tree, ROOMS, extBark: EB, LOW: ctx.LOW, crowns, court: COURT,
      ground: (mat, x0, y0, x1, y1, y) => { const m = flat(mat, x0, y0, x1, y1, y); m.userData.ground = true; return m; },
      cap: (x0, y0, x1, y1, z0, z1) => capRects.push([x0, y0, x1, y1, z0, z1]) });
    own(EB.build(scene), 'ext');
    buildCrowns();
    const leafGeo = new THREE.PlaneGeometry(0.42, 0.42);
    Object.keys(leafSets).forEach((zone) => {
      const [cards, tints] = leafSets[zone];
      const leaves = new THREE.InstancedMesh(leafGeo, zone === 'ext' ? M.leafCardExt : M.leafCard, cards.length);
      const tk = zone === 'living' ? new THREE.Color().setRGB(1.0, 1.25, 0.88) : null;          // (the living room's olive a fresher green since 14 Oct: indoors it read nearly black)
      cards.forEach((m4, i) => { leaves.setMatrixAt(i, m4); leaves.setColorAt(i, tk ? tints[i].clone().multiply(tk) : tints[i]); });
      scene.add(leaves);
      own([leaves], zone);
    });

    B.build(house);
    M.frame.userData.thin = 0.06;
    bootMark('stage');
    if (HOUSE) HOUSE.split({ scene, house, zones });                    // each room's part of every merged mesh gets that room's material
    house.traverse((o) => { if (o.isMesh) { o.castShadow = !o.material.transparent && o.material !== M.water && !o.userData.ground; o.receiveShadow = true; } });
    house.traverse((o) => { if (o.isMesh && o.material && (o.material.userData.pane || o.material === M.glass || o.material === M.glassSky)) glassMeshes.push(o); });
    // each pane's second mesh: the same geometry in the paper material, drawn first
    glassMeshes.slice().forEach((m) => {
      const t = new THREE.Mesh(m.geometry, m.material.userData.paperTwin);
      t.matrixAutoUpdate = false; t.matrix.copy(m.matrix); t.castShadow = false; t.receiveShadow = false; t.renderOrder = -0.5;
      house.add(t); glassMeshes.push(t);
      glassPairs.push({ real: m, paper: t, key: m.material.userData.paneKey });
    });
    house.traverse((o) => { const bm = o.isMesh && (o.userData.baseMat || o.material); if (bm === M.roof) roofMeshes.push(o); if (bm === M.drystone) { o.userData.noPrepass = true; zones.ext.push(o); } });

    // The lamps. Every point light is paid for by every lit pixel of every frame, wherever the light stands: with ten of
    // them (iteration 3 had six) the garden lost a fifth of its frame rate to lamps three rooms away. So there are four
    // lights, and each frame they stand at the four lamps that matter most from where the camera is (lampPool).
    stage.lights.push({ l: { intensity: 0 }, zone: 'living', k: 3.2, fire: 'hearth', x: WX(10.4), y: 0.6, z: WZ(12.7), color: 0xff8a40, dist: 7, decay: 1.8, far: 30 });
    for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(0xffffff, 0, 7, 1.7); scene.add(l); lampSlots.push({ l, spot: null }); }

    /* the plan drawing on the ground ---------------------------------------- */
    // Lettering read four times inside each pixel, each reading one mip sharper than the card would pick by itself.
    // One reading blends in the half-size copy of the drawing, which is coarser than the screen (24 pixels a metre
    // against the screen's 30 on the opening sheet) and makes small type soft. Four spread readings stay steady in motion.
    const TEX4_GLSL = `vec4 tex4(sampler2D t, vec2 uv) {
      vec2 dx = dFdx(uv), dy = dFdy(uv), a = 0.125 * dx + 0.375 * dy, b = 0.375 * dx - 0.125 * dy;
      return 0.25 * (texture2D(t, uv + a, -1.0) + texture2D(t, uv - a, -1.0) + texture2D(t, uv + b, -1.0) + texture2D(t, uv - b, -1.0));
    }`;
    const annTex = drawPlan();
    annMat = new THREE.ShaderMaterial({
      uniforms: Object.assign({ tAnn: { value: annTex }, uOrg: { value: new THREE.Vector2(WX(SX0), WZ(SY0)) }, uSize: { value: SIZE }, uOp: { value: 1 },
        uHead: { value: new THREE.Vector4(WX(46.2), WZ(-5.9), WX(62), WZ(-0.2)) }, uHeadK: { value: 0 },
        uCan: { value: new THREE.Vector4(WX(10.5), WZ(25.5), WX(19.5), WZ(30)) }, uCanK: { value: 0 } }, RU),      // (the entrance canopy's dashed outline)
      vertexShader: 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform sampler2D tAnn; uniform vec2 uOrg; uniform float uSize; uniform float uOp; uniform vec4 uHead; uniform float uHeadK; uniform vec4 uCan; uniform float uCanK; varying vec3 vW;
        ${ROOM_GLSL}
        ${TEX4_GLSL}
        void main() {
          float a = tex4(tAnn, (vW.xz - uOrg) / uSize).r;
          float rev; vec4 org; roomOf(vW, vec3(0.0, 1.0, 0.0), rev, org);
          float ring; float real = revealAt(vW, vec3(0.0, 1.0, 0.0), rev, org, ring);
          real *= 1.0 - step(dot(vW.xz, uRoll.xy), uRoll.z);                 // behind the roll of paper the drawing's notes are back
          a *= (1.0 - real) * uOp * smoothstep(0.35, 1.0, gInk);
          // the sheet's own heading (title and scale bar) steps back as the lens opens: it slid under the page's button
          a *= 1.0 - uHeadK * step(uHead.x, vW.x) * step(vW.x, uHead.z) * step(uHead.y, vW.z) * step(vW.z, uHead.w);
          // The dashed outline of the canopy lies on the ground in front of the door. On the way down to the door it
          // grew into a row of fat dashes along the bottom of the screen, right under the corner links.
          a *= 1.0 - uCanK * step(uCan.x, vW.x) * step(vW.x, uCan.z) * step(uCan.y, vW.z) * step(vW.z, uCan.w);
          if (a < 0.004) discard;
          gl_FragColor = vec4(1.0, 1.0, 1.0, a);
        }`,
      transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    });
    const ann = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), annMat);
    ann.rotation.x = -Math.PI / 2;
    ann.position.set(WX(SX0 + SIZE / 2), 0.03, WZ(SY0 + SIZE / 2));
    ann.userData.noPrepass = true; ann.renderOrder = 1;
    scene.add(ann);

    /* room names: each its own label, lying on the floor at 170 pixels a metre (the big
       drawing is 2 cm a pixel, fine from above, soft when you stand on it) ----------- */
    {
      const PXM = 170, aniso = renderer.capabilities.getMaxAnisotropy();
      const labelMat = (tex) => new THREE.ShaderMaterial({
        uniforms: Object.assign({ tLab: { value: tex }, uOp: annMat.uniforms.uOp }, RU),
        vertexShader: 'varying vec3 vW; varying vec2 vUv; void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
        fragmentShader: `uniform sampler2D tLab; uniform float uOp; varying vec3 vW; varying vec2 vUv;
          ${ROOM_GLSL}
          ${TEX4_GLSL}
          void main() {
            float a = tex4(tLab, vUv).a;
            float rev; vec4 org; roomOf(vW, vec3(0.0, 1.0, 0.0), rev, org);
            float ring; float real = revealAt(vW, vec3(0.0, 1.0, 0.0), rev, org, ring);
            real *= 1.0 - step(dot(vW.xz, uRoll.xy), uRoll.z);
            a *= (1.0 - real) * uOp * smoothstep(0.35, 1.0, gInk);
            if (a < 0.004) discard;
            gl_FragColor = vec4(1.0, 1.0, 1.0, a);
          }`,
        transparent: true, depthWrite: false,
        blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
        blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
      });
      const font = (g, sz, wt, ls) => { g.font = `${wt} ${Math.round(sz * PXM)}px "Geist Mono"`; g.letterSpacing = `${(ls * sz * PXM).toFixed(1)}px`; };
      ROOMS.filter((r) => !r.hidden).forEach((r) => {
        const [x0, y0, x1, y1] = r.r, w = x1 - x0, d = y1 - y0;
        const lines = [[r.name.toUpperCase(), r.small ? 0.56 : r.nameSize || 0.78, 500, 0.14]];
        if (!r.small && r.sub !== false) lines.push([r.sub || `${w * d} m²   ${w.toFixed(2)} × ${d.toFixed(2)}`, r.subSize || 0.54, 400, 0.04]);
        const c = document.createElement('canvas'), g = c.getContext('2d');
        let wm = 0;
        lines.forEach(([t, sz, wt, ls]) => { font(g, sz, wt, ls); wm = Math.max(wm, g.measureText(t).width / PXM); });
        wm += 0.6;
        const hm = lines.length > 1 ? 2.2 : 1.2, yName = 0.6;               // metres; the name sits 0.6 m from the top
        c.width = Math.min(4096, Math.ceil(wm * PXM)); c.height = Math.ceil(hm * PXM);
        const k = c.width / wm, g2 = c.getContext('2d');
        g2.fillStyle = '#000'; g2.textAlign = 'center'; g2.textBaseline = 'middle';
        lines.forEach(([t, sz, wt, ls], i) => { font(g2, sz, wt, ls); g2.fillText(t, c.width / 2, (yName + i * 1.0) * k); });
        const tex = new THREE.CanvasTexture(c);
        tex.anisotropy = aniso;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(wm, hm), labelMat(tex));
        const rot = r.rot || 0, off = hm / 2 - yName, [lx, ly] = r.label;
        m.rotation.set(-Math.PI / 2, -rot, 0, 'YXZ');
        m.position.set(WX(lx - Math.sin(rot) * off), 0.034, WZ(ly + Math.cos(rot) * off));
        m.userData.noPrepass = true; m.renderOrder = 2;
        scene.add(m);
      });
    }

    /* light ---------------------------------------------------------------------- */
    const sun = new THREE.DirectionalLight(0xffe2bc, 6.2);
    // the sky's own sun sits at 19 degrees, too low to reach into the rooms. The key light
    // keeps its bearing (west south west) but stands at 32 degrees, so the clerestory light
    // lands on the entrance floor and climbs the east wall.
    const EL = 32 * Math.PI / 180, AZ = Math.atan2(0.37, -0.93);
    const sd = new V3(Math.cos(AZ) * Math.cos(EL), Math.sin(EL), Math.sin(AZ) * Math.cos(EL));
    sun.position.copy(sd).multiplyScalar(140).add(new V3(1, 0, 1));
    sun.target.position.set(1, 0, 1);
    scene.add(sun, sun.target);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    const sc = sun.shadow.camera;
    sc.left = -44; sc.right = 44; sc.top = 40; sc.bottom = -40; sc.near = 40; sc.far = 300;
    sc.updateProjectionMatrix();
    sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
    sunLight = sun;
    // nothing in the house moves but the front door, so the shadow map is drawn again only when it has to be
    renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
    hemiLight = new THREE.HemisphereLight(0xefebe4, 0xd8c3a6, 0.5);
    scene.add(hemiLight);

    /* dimensions in the air: the plan's measuring tape, hung at its real height ------ */
    const inkBlend = { transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
      // ink over paper raises the hatch, ink over a real surface darkens it: one blend does both, by reading the paper mask
      blendSrc: THREE.DstAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor };
    const P3 = (x, y, h) => new V3(WX(x), h, WZ(y));
    const buildDims = (id, list) => {
      const op = { value: 0 };
      const segs = [], texts = [];
      list.forEach((d) => {
        const A = P3(...d.a), Bv = P3(...d.b), dir = Bv.clone().sub(A).normalize();
        const vert = Math.abs(dir.y) > 0.9;
        const perp = vert ? new V3(1, 0, 0) : new V3(-dir.z, 0, dir.x);
        segs.push([A, Bv]);
        [A, Bv].forEach((E) => {
          segs.push([E.clone().addScaledVector(perp, -0.22), E.clone().addScaledVector(perp, 0.22)]);
          const sl = dir.clone().add(perp).normalize().multiplyScalar(0.15);
          segs.push([E.clone().sub(sl), E.clone().add(sl)]);
        });
        texts.push({ s: d.t, at: A.clone().lerp(Bv, d.tp == null ? 0.5 : d.tp).addScaledVector(perp, d.side || 0.32).add(new V3(0, 0.12, 0)) });     // tp: how far along the line the figure sits
      });
      // lines: quads expanded in screen space, so they stay hairlines from any distance
      const n = segs.length, pa = new Float32Array(n * 12), pb = new Float32Array(n * 12), se = new Float32Array(n * 8), idx = [];
      segs.forEach(([A, Bv], i) => {
        for (let k = 0; k < 4; k++) {
          A.toArray(pa, i * 12 + k * 3); Bv.toArray(pb, i * 12 + k * 3);
          se[i * 8 + k * 2] = k % 2 ? 1 : -1; se[i * 8 + k * 2 + 1] = k < 2 ? 0 : 1;
        }
        const b = i * 4; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pa.slice(), 3));
      g.setAttribute('aA', new THREE.BufferAttribute(pa, 3)); g.setAttribute('aB', new THREE.BufferAttribute(pb, 3));
      g.setAttribute('aSE', new THREE.BufferAttribute(se, 2)); g.setIndex(idx);
      const lm = new THREE.ShaderMaterial(Object.assign({
        uniforms: { uOp: op, uWidth: { value: 1.05 }, uRes: RES },
        vertexShader: `attribute vec3 aA; attribute vec3 aB; attribute vec2 aSE; uniform float uWidth; uniform vec2 uRes;
          void main() {
            vec4 vA = viewMatrix * vec4(aA, 1.0), vB = viewMatrix * vec4(aB, 1.0);
            float nz = -0.12;
            if (vA.z > nz && vB.z > nz) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
            if (vA.z > nz) vA = mix(vA, vB, (vA.z - nz) / (vA.z - vB.z));
            if (vB.z > nz) vB = mix(vB, vA, (vB.z - nz) / (vB.z - vA.z));
            vec4 cA = projectionMatrix * vA, cB = projectionMatrix * vB;
            vec2 d = cB.xy / cB.w * uRes - cA.xy / cA.w * uRes;
            d = length(d) < 1e-4 ? vec2(1.0, 0.0) : normalize(d);
            vec4 c = aSE.y < 0.5 ? cA : cB;
            c.xy += vec2(-d.y, d.x) * aSE.x * uWidth / uRes * c.w;
            gl_Position = c;
          }`,
        fragmentShader: 'uniform float uOp; void main() { gl_FragColor = vec4(vec3(uOp), uOp); }',
      }, inkBlend));
      const lines = new THREE.Mesh(g, lm);
      lines.frustumCulled = false; lines.userData.noPrepass = true; lines.renderOrder = 3;
      scene.add(lines);
      // numbers: billboards that always face you, sized in metres
      texts.forEach((t) => {
        const tex = FX.canvasTex(384, 96, (c2, w, h) => {
          c2.fillStyle = '#000'; c2.font = '500 78px "Geist Mono"'; c2.textAlign = 'center'; c2.textBaseline = 'middle';
          c2.letterSpacing = '4px'; c2.fillText(t.s, w / 2, h / 2 + 2);
        });
        const tm = new THREE.ShaderMaterial(Object.assign({
          uniforms: { uOp: op, tText: { value: tex }, uCenter: { value: t.at }, uSize: { value: new THREE.Vector2(0.9, 0.225) } },
          vertexShader: `uniform vec3 uCenter; uniform vec2 uSize; varying vec2 vUv;
            void main() { vUv = uv; vec4 mv = viewMatrix * vec4(uCenter, 1.0); mv.xy += position.xy * uSize; gl_Position = projectionMatrix * mv; }`,
          fragmentShader: `uniform sampler2D tText; uniform float uOp; varying vec2 vUv;
            void main() { float a = texture2D(tText, vUv).a * uOp; if (a < 0.01) discard; gl_FragColor = vec4(vec3(a), a); }`,
        }, inkBlend));
        const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), tm);
        m.frustumCulled = false; m.userData.noPrepass = true; m.renderOrder = 3;
        scene.add(m);
      });
      dims[id] = op;
    };
    const HL = 2.7, HK = 2.4;
    buildDims('living', [
      { a: [9, 8.42, HL], b: [21, 8.42, HL], t: '12.00', side: 0.3 },
      // (placed for the view straight down at the living room's plan: each figure on bare floor, none on the sofa's lines)
      { a: [20.55, 8, HL], b: [20.55, 17, HL], t: '9.00', side: 0.5, tp: 0.63 },
      { a: [12, 10.0, HL], b: [18, 10.0, HL], t: '6.00', side: -0.3 },
      { a: [11.92, 10.5, HL], b: [11.92, 15, HL], t: '4.50', side: 0.47 },
      { a: [20.3, 16.2, 0], b: [20.3, 16.2, 4.5], t: '4.50', side: -0.5 },
    ]);
    buildDims('kitchen', [
      { a: [9, 0.7, HK], b: [25, 0.7, HK], t: '16.00' },
      { a: [11.5, 2.2, HK], b: [16.5, 2.2, HK], t: '5.00', side: -0.32 },
      { a: [17.2, 2.2, HK], b: [23.2, 2.2, HK], t: '6.00', side: -0.32 },
      { a: [24.4, 0, HK], b: [24.4, 8, HK], t: '8.00', side: -0.42 },
      { a: [9.5, 7.5, 0], b: [9.5, 7.5, 3.6], t: '3.60', side: 0.3 },
    ]);
    buildDims('patio', [
      { a: [21, 8.9, 3.0], b: [41, 8.9, 3.0], t: '20.00' },
      { a: [21.7, 8, 3.0], b: [21.7, 32, 3.0], t: '24.00', side: 0.42 },
      { a: [22.5, 26.6, 1.1], b: [40.5, 26.6, 1.1], t: '18.00', side: -0.32 },
      { a: [33.4, 18.0, 0], b: [33.4, 18.0, 7.0], t: '7.00', side: 0.3 },
    ]);
    buildDims('bedroom', [
      { a: [41, 40.5, 2.6], b: [51, 40.5, 2.6], t: '10.00', side: -0.3 },
      { a: [50.5, 32, 2.6], b: [50.5, 41, 2.6], t: '9.00', side: -0.42 },
      { a: [41.5, 32.5, 0], b: [41.5, 32.5, 3.6], t: '3.60', side: 0.3 },
    ]);
    buildDims('garden', [
      { a: [41, 49.2, 1.3], b: [62, 49.2, 1.3], t: '21.00', side: -0.3 },
    ]);
    buildDims('gallery', [
      { a: [42.5, 8, 2.75], b: [42.5, 32, 2.75], t: '24.00', side: 0.0 },
      { a: [41, 9.5, 2.75], b: [44, 9.5, 2.75], t: '3.00', side: 0.3 },
      { a: [43.6, 31.5, 0], b: [43.6, 31.5, 3.6], t: '3.60', side: -0.3 },
    ]);

    /* dust: only lit where the sun actually reaches (a shadow map lookup) ------------- */
    const dustScene = new THREE.Scene();
    const dustIn = (id, r, h, count) => {
      const [x0, y0, x1, y1] = r;
      const d = FX.dust({
        count: ctx.LOW ? Math.round(count * 0.45) : Math.round(count * 0.8), seed: 11 + count, size: 0.0052, base: 0, color: 0xffe0b8,   // (raised on 14 Oct, back toward iteration 2's 0.0075 and full count. Sam: "in the first iteration the effect was more strong... increase it a little bit so it feels more cinematic")
        sun: true, sunGain: 5, wind: [0.025, 0.004, -0.012],
        box: [[WX(x0), 0.05, WZ(y0)], [x1 - x0, h, y1 - y0]],
        spawn: (Rr) => [WX(x0) + Rr() * (x1 - x0), 0.05 + Rr() * h, WZ(y0) + Rr() * (y1 - y0), 0.4 + Rr() * 1.2],
      });
      d.material.uniforms.uFade.value = 0;
      dustScene.add(d);
      dustSets[id] = d;
    };
    dustIn('entrance', [11.2, 17.2, 18.8, 25.8], 4.6, 5000);
    dustIn('living', [9.2, 8.2, 20.8, 16.8], 4.3, 9000);
    dustIn('kitchen', [9.2, 0.2, 24.8, 7.8], 3.5, 8000);
    dustIn('patio', [21.5, 8.5, 40.5, 31.5], 6.5, 7000);
    dustIn('gallery', [41.2, 8.2, 43.8, 31.8], 3.5, 2500);
    dustIn('bedroom', [41.2, 32.2, 50.8, 40.8], 3.5, 6000);
    dustIn('bath', [51.2, 35.2, 58.8, 40.8], 3.5, 3000);
    ctx.post.dustScene = dustScene;
    ctx.post.shaftLight = sun;

    // reveal origins: each room from the door you walk in by
    const ent = RM.entrance;
    // where each room starts to fill and which way the fill runs: [x, y, direction x, direction y, length, sphere radius]
    const FROM = {
      entrance: [15.25, 25.8, 0, -1, 9, 14], hall: [15.25, 25.8, 0, -1, 9, 14], wc: [15.25, 25.8, 0, -1, 9, 14],
      guest2: [9, 19.6, -1, 0, 9, 11], garage: [9, 25.1, -1, 0, 9, 11],
      living: [15, 17, 0, -1, 9, 14], guest1: [9, 9.6, -1, 0, 9, 11],
      patio: [23.9, 8.2, 0.55, 0.835, 52, 47], yard: [23.9, 8.2, 0.55, 0.835, 52, 47], gallery: [42.5, 8.2, 0, 1, 24, 26], study: [33.5, 8, 0, -1, 8, 12], library: [39.5, 8, 0, -1, 8, 12],
      kitchen: [15, 8, 0, -1, 8, 16], wine: [25, 4, 1, 0, 4, 16], media: [9, 5.7, -1, 0, 9, 11],
      bedroom: [42.5, 32, 0, 1, 9, 15], garden: [56.5, 41, -0.7, 0.714, 14, 24],
      dressing: [51, 33.5, 1, 0, 8, 9], bath: [56, 35, 0, 1, 6, 9],
    };
    ROOMS.forEach((r) => {
      const f = FROM[r.id];
      RU.uRO.value[r.i].set(WX(f[0]), 0.5, WZ(f[1]), f[5]);
      RU.uRD.value[r.i].set(f[2], f[3], f[4], r.outdoor ? 4.6 : r.h);
    });
    // the world outside turns real from the front door outward
    RU.uXO.value.set(WX(15.25), 0.5, WZ(26.2), 260);

    buildCaps();
    buildMirror(ctx);
    buildPool(ctx, sd);
    /* The depth pass, taught about paper. Decor (cushions, bedding, vases) used to be kept out of the depth pass
       until its whole room was real, so that it was never outlined on a drawing. The price: while a room was half
       way through its fill, a duvet that had already arrived had no depth of its own, and the outline, the contact
       shadow and the blur of the mattress under it were drawn across it. That is the "see-through bed" the outside
       review found three rounds running. Now decor is always in the depth pass, and the pass itself leaves out
       every piece that is still paper, by the same rule the colour pass uses. */
    {
      const pre = ctx.post.preMat;
      ctx.post.preMat = new THREE.ShaderMaterial({
        uniforms: Object.assign({ zBase: pre.uniforms.zBase,
          uCourt: { value: [[20.95, 7.95, 41.05, 32.05], [13.45, 25.95, 16.55, 42.05], [40.95, 40.95, 59.05, 43.65], [0, 0, 0, 0]].map((q) => new THREE.Vector4(WX(q[0]), WZ(q[1]), WX(q[2]), WZ(q[3]))) } }, RU),      // (patio, path to the door, garden terrace, reflecting pool)
        // Every varying here is "centroid": taken inside the triangle, never beside it. The depth picture is multisampled,
        // so a pixel is shaded when a triangle covers any of its four samples, and by default the values are then read at
        // the pixel's middle, which may lie off the triangle. For a face seen dead edge-on (a sliver a hundredth of a pixel
        // thick) that guess is wild. The 6 mm bevel under the beam over the living room's opening was such a sliver at
        // exactly one camera position: its height came out below the cut, it was not cut away, and for that one frame a
        // line ran across the opening. The cut itself is tested here on the world height (uCutY), not by the renderer.
        // Only what is tested is centroid (vW, vDecor, vCtr). What is written, the depth and the normal, is read at the
        // pixel's middle (vZ, vN, and vWd for the ground's plane). For a day all of it was centroid, and on this GPU
        // "inside the triangle" means at one of its samples, not at their middle: along every diagonal inside a wall's
        // face the depth came out up to a third of a pixel off. Seen from above a wall's side is a strip nine pixels
        // tall whose depth falls 15 cm a pixel, so that was 5 cm of error, enough for the plan's outline test: every
        // east to west wall carried a strip of dashes that shimmered while the walls rose (80 to 130 vh).
        vertexShader: `
          #include <common>
          attribute float aDecor; attribute vec3 color; uniform float uCutY;
          varying vec3 vN; varying float vZ; centroid varying vec3 vW; centroid varying float vDecor; centroid varying vec3 vCtr; varying vec3 vWd;
          void main() {
            #include <beginnormal_vertex>
            #include <defaultnormal_vertex>
            #include <begin_vertex>
            #include <project_vertex>
            if (abs(aDecor - 0.35) < 0.02 && cameraPosition.y > uCutY + 0.3) {     // (a lid wins the depth test against what is under the cut, see buildCaps)
              vec4 nearer = projectionMatrix * vec4(mvPosition.xyz * (1.0 - ${LID_NEAR.toFixed(2)} / max(length(mvPosition.xyz), 1.5)), 1.0);
              gl_Position.z = nearer.z / nearer.w * gl_Position.w;
            }
            vN = normalize(transformedNormal);
            vZ = -mvPosition.z;
            vDecor = aDecor; vCtr = color;
            vec4 wp = vec4(transformed, 1.0);
            #ifdef USE_INSTANCING
              wp = instanceMatrix * wp;
            #endif
            vW = (modelMatrix * wp).xyz; vWd = vW;
          }`,
        fragmentShader: `
          uniform float zBase; uniform float uCutY; uniform float uTele; uniform vec4 uCourt[4];
          varying vec3 vN; varying float vZ; centroid varying vec3 vW; centroid varying float vDecor; centroid varying vec3 vCtr; varying vec3 vWd;
          ${ROOM_GLSL}
          void main() {
            // The land is not cut. North of the house it rises past the cut's height, and the edge where the cut sliced
            // it was drawn as an ink line: the thin curved line across the top of the phone's hero, where the upright
            // sheet shows 80 metres of land beyond the house. (In colour, cut land and paper land look the same.)
            if (vDecor < 1.4 && abs(vDecor - 0.3) > 0.1 && vW.y > uCutY) discard;                 // (0.25 the land, 0.35 the walls' lids, 1.5 what stands outdoors)
            if (vDecor > 0.45) {
              bool whole = vCtr.z > 1.5;
              vec3 wn = normalize((vec4(normalize(vN), 0.0) * viewMatrix).xyz);
              vec3 wq = whole ? vec3(vCtr.x, vCtr.z - 2.0, vCtr.y) : vW;
              float rev; vec4 org; roomOf(wq, whole ? vec3(0.0) : wn, rev, org);
              float ring; float got = revealAt(wq, whole ? vec3(0.0, 1.0, 0.0) : wn, rev, org, ring);
              float paper = max(whole ? 1.0 - step(0.5, got) : 1.0 - got, step(dot(vW.xz, uRoll.xy), uRoll.z));
              // a thin member has no outline while it is drawn as one stroke of ink (see thinK in drawable)
              if (vDecor < 0.9) { if (paper > 0.5 && (vDecor - 0.5) / max(length(fwidth(vWd)), 1e-5) < 4.0) discard; }
              else if (paper > 0.5) discard;
            }
            // The ground is several sheets lying a centimetre or three apart (site, meadow, gravel, lawn, paving bands), so
            // they do not fight. Where one ends over another that is a step, and at some distances a step of that size is
            // right at the limit of what gets an outline: a faint line that came and went along the edge of the site
            // while the plan opened. In the depth picture all ground within a hand of the site's level is one plane.
            // And while the view is a plan (uTele), all land everywhere is that plane, facing up: a hillside 15 m below
            // the house is at the limit of the depth picture's precision, and the edges of its facets came out as faint
            // scratches on the sheet (the phone's upright hero shows that slope, the desktop's does not).
            // (Only the land. The walls' lids were once caught by this too, they shared the land's number: while the walls
            // rose out of the plan their tops were pressed down onto the floor in the depth picture, and the outlines
            // of every wall shimmered between 80 and 120 vh. The lids have their own number now.)
            // (That plane is at the level of the floors and the paving, y = 0, three centimetres above the site's own
            // sheet. The outdoor paving stands 3 cm proud of the site, and where it ends with no wall that step was
            // exactly the size the outline test cannot make up its mind about: the patio's edge came and went in pieces
            // between 100 and 125 vh, where Sam first saw blinking. With the ground's plane at the paving's own level
            // there is no step. The 3 cm of side a slab shows where it ends is laid on that plane too, facing up (court):
            // a face that thin still draws a line by the way it faces. The paving's free edges are lines on the
            // annotation sheet. For one pass I pressed the paving down onto the site's level instead, which made a new
            // 3 cm step at every glass door onto it.)
            float z = vZ; vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
            bool land = abs(vDecor - 0.25) < 0.05, court = false;
            // (the path, court 1, shows 8 cm of side since the forecourt's gravel was lowered: all of it counts)
            if (vDecor < 0.1 && vWd.y < 0.004) for (int i = 0; i < 4; i++) { vec4 q = uCourt[i]; if (vWd.y > (i == 1 ? -0.12 : -0.035) && vWd.x > q.x && vWd.x < q.z && vWd.z > q.y && vWd.z < q.w) court = true; }
            if (land || court) {
              float k = court ? 1.0 : max(1.0 - smoothstep(0.1, 0.3, abs(vWd.y + 0.03)), uTele);
              z *= mix(1.0, cameraPosition.y / max(cameraPosition.y - vWd.y, 0.01), k);
              n = normalize(mix(n, normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz), k));
            }
            gl_FragColor = vec4(n * 0.5 + 0.5, 1.0 / (1.0 + max(z - zBase, 0.0))); }`,
        side: THREE.DoubleSide,
      });
    }
    // What the roll must take away and what it must turn back into ink: everything kept in `zones` (planting,
    // decor, water, leaves) was never on the drawing. Each geometry carries that as one number per vertex.
    {
      const off = new Set(), outdoors = new Set();
      Object.keys(zones).forEach((z) => zones[z].forEach((m) => { off.add(m); if (z === 'ext' || z === 'patio' || z === 'garden') outdoors.add(m); }));
      scene.traverse((o) => {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        if (!o.geometry || !o.isMesh || o.geometry.attributes.aDecor) return;                // (every mesh: the depth pass reads both attributes on all it draws)
        o.geometry.setAttribute('aDecor', new THREE.Float32BufferAttribute(new Float32Array(o.geometry.attributes.position.count).fill(off.has(o) ? (outdoors.has(o) && !o.userData.cutWithHouse ? 1.5 : 1) : o.userData.ground ? 0.25 : o.material && o.material.userData && o.material.userData.thin ? 0.5 + o.material.userData.thin : 0), 1));
        // (1: not on the drawing. 1.5: the same, and outdoors, so never cut. 0.25: the land, never cut. 0.35: a wall's lid, not cut either. 0.5 plus a width in metres: a thin member)
        // (and a colour attribute, which carries "this piece belongs to a whole thing": zero means it does not)
        if (!o.geometry.attributes.color) o.geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(o.geometry.attributes.position.count * 3), 3));
      });
    }
    bootMark('built');
    await warmShaders(ctx);
    bootMark('shaders');
    if (LIGHT) await LIGHT.build(ctx, { sun, sky: sk, skyMat, SKY });
    if (HOUSE) await HOUSE.build(ctx, { sun, skyMat, zones, capMeshes, lampSlots, stage, M });
    bootMark('house');
    window.__lintel = { RU, RM, cutPlane, sunDir: sd, M, terrH, scene, drawable, surfaced };
    return {
      // Where each room's title hangs. Iteration 4 moved three of them off things and onto calm ground: the living room's
      // and the kitchen's up under the plain ceiling, the gallery's onto a bare stretch of its lit wall.
      anchors: { entrance: new V3(WX(16.1), 4.15, WZ(17.2)), living: new V3(WX(13.1), 4.01, WZ(14.32)), kitchen: new V3(WX(18.88), 2.63, WZ(7.81)),
        olive: new V3(WX(31.2), 4.2, WZ(17.2)), gallery: new V3(WX(43.56), 1.96, WZ(13.91)),
        bedroom: new V3(WX(48.6), 2.6, WZ(32.3)), garden: new V3(WX(54.1), 6.6, WZ(62.4)) },     // the garden's title hangs in the sky, left of the ridge
      colliders, M,
      update() {},
      // One whole frame, shadows included, with every zone still showing, while the loader is up.
      // Without it the first time the landscape appears (the door opening) froze the page for two seconds:
      // shader variants, shadow depth programs and big instance buffers were all made on that frame.
      // Iteration 4 found four shaders that still missed that frame and were built on the walk, each one a hitch: the
      // walls' lids (hidden until the cut rises, 112 vh), the village on the far hill (outside the view at load, so
      // never drawn: 1500 vh, the first look out from the patio), and the bath's mirror (hidden until the bath is real,
      // 2880 vh). So for this one frame nothing is hidden and nothing is left out for being off screen, and the
      // mirror's own picture is drawn once. The sun's shafts and the dust in them are switched off over the plan and
      // came on at 112 vh, two more shaders: they are on for this frame too.
      precompile() {
        renderer.shadowMap.needsUpdate = true;
        const culled = [], hidden = [];
        scene.traverse((o) => {
          if (o.isLight) return;                                         // (a light switched on would change every material's shader)
          if (o.frustumCulled) { culled.push(o); o.frustumCulled = false; }
          if (!o.visible) { hidden.push(o); o.visible = true; }
        });
        if (mirror) { mirror.mesh.visible = false; renderer.setRenderTarget(mirror.rt); renderer.render(scene, ctx.camera); renderer.setRenderTarget(null); mirror.mesh.visible = true; }
        if (poolMir) { poolMir.mesh.visible = false; renderer.setRenderTarget(poolMir.rt); renderer.render(scene, ctx.camera); renderer.setRenderTarget(null); poolMir.mesh.visible = true; }
        const P = ctx.P, was = [P.shafts, P.sunDust];
        P.shafts = Math.max(P.shafts || 0, 0.01); P.sunDust = Math.max(P.sunDust || 0, 0.01);
        ctx.post.render(scene, ctx.camera, P);
        P.shafts = was[0]; P.sunDust = was[1];
        culled.forEach((o) => { o.frustumCulled = true; });
        hidden.forEach((o) => { o.visible = false; });
        if (mirror) mirror.mesh.visible = false;
        if (poolMir) poolMir.mesh.visible = false;
        renderer.shadowMap.needsUpdate = true;
      },
    };
  }

  /* ---------- the bath's mirror ----------------------------------------------------
     The outside review of 9 Oct: "the mirror shows a flat blue sky and nothing of the room, it reads as a blue
     screen." A mirror in this engine only reflects the sky map. So this one gets a real reflection: a second
     camera stands where the lens would be on the other side of the glass, the room is drawn once more from
     there into a small picture, and the mirror shows that picture. Only while you are in the suite and the
     bath is real. A clipping plane in the mirror keeps the wall it hangs on out of its own picture. */
  const MIR = { x: 51.164, y0: 36.6, y1: 40.0, z0: 1.02, z1: 2.5 };
  let mirror = null;
  function buildMirror(ctx) {
    // (Four samples on a phone too, as the scene's own buffer has. With none, the mirror's picture was the only place the
    // house was ever drawn without multisampling, and the graphics card builds each material's shader again for that: all
    // of them at once on the mirror's first frame. Twice in five recorded phone walks the page stood still for 12
    // seconds there. The desktop's mirror always had four and never stalled.)
    const rt = new THREE.WebGLRenderTarget(ctx.LOW ? 512 : 1152, ctx.LOW ? 256 : 576, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, colorSpace: THREE.LinearSRGBColorSpace,
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false, samples: 4 });
    const mat = new THREE.ShaderMaterial({
      uniforms: { tMir: { value: rt.texture }, uVP: { value: new THREE.Matrix4() } },
      vertexShader: 'uniform mat4 uVP; varying vec4 vClip; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vClip = uVP * w; gl_Position = projectionMatrix * viewMatrix * w; }',
      // in the scene's buffer alpha 1 means paper and red is then the amount of ink: a room still drawn shows as a drawing in the glass too
      // (both clamped: a pane of glass still on paper adds into them, and with the picture on from the start of the scan that
      // showed as a black hole in the mirror while the shower's screen was being drawn)
      fragmentShader: `uniform sampler2D tMir; varying vec4 vClip;
        void main() { vec4 c = texture2D(tMir, vClip.xy / vClip.w * 0.5 + 0.5); vec3 col = mix(c.rgb, vec3(0.8, 0.77, 0.71) * (1.0 - 0.8 * clamp(c.r, 0.0, 1.0)), clamp(c.a, 0.0, 1.0)); gl_FragColor = vec4(col * vec3(0.84, 0.87, 0.88), 0.0); }`,
    });
    // It lays its picture over the glass only where the glass under it is already real: the buffer's alpha says paper, and
    // the blend weighs the mirror by one minus that and keeps the alpha. So the reflection arrives with the scan, row by row,
    // as the glass does. (13 Oct, Sam: "it snaps to full with no reflection, and then as we continue there's a reflection
    // appearing". The vanity came whole, its glass showed the sky map, and the picture only switched on at 90 percent.)
    Object.assign(mat, { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneMinusDstAlphaFactor, blendDst: THREE.DstAlphaFactor,
      blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(MIR.y1 - MIR.y0, MIR.z1 - MIR.z0), mat);
    mesh.rotation.y = Math.PI / 2;                                   // facing east, into the room
    mesh.position.set(WX(MIR.x), (MIR.z0 + MIR.z1) / 2, WZ((MIR.y0 + MIR.y1) / 2));
    mesh.visible = false; mesh.castShadow = false; mesh.renderOrder = 5;            // (after the glass it lies on)
    ctx.scene.add(mesh);
    mirror = { rt, mat, mesh, cam: new THREE.PerspectiveCamera(), n: new V3(1, 0, 0), p0: new V3(WX(MIR.x), 1.7, WZ(38.3)), tick: 0,
      v: new V3(), t: new V3(), up: new V3(), vp: new THREE.Matrix4(), crop: new THREE.Matrix4(), q: new THREE.Vector4() };
  }
  function mirrorFrame(ctx, on) {
    const m = mirror;
    if (!m) return;
    const c = ctx.camera;
    on = on && c.position.x > m.p0.x + 0.3;                          // never from behind it
    if (!on) { m.mesh.visible = false; return; }
    if (m.mesh.visible && (m.tick++ & 1)) return;                    // every other frame is plenty for a reflection
    const refl = (v, dirOnly) => { const k = 2 * (dirOnly ? v.dot(m.n) : v.clone().sub(m.p0).dot(m.n)); return v.addScaledVector(m.n, -k); };
    const vc = m.cam;
    vc.position.copy(refl(m.v.copy(c.position)));
    c.getWorldDirection(m.t); m.t.add(c.position); refl(m.t);
    m.up.set(0, 1, 0).applyQuaternion(c.quaternion); refl(m.up, true);
    vc.up.copy(m.up); vc.lookAt(m.t);
    vc.updateMatrixWorld();
    vc.projectionMatrix.copy(c.projectionMatrix);
    // The mirror covers a third of the screen. Its picture used to be taken of the whole screen, so only a third of
    // its pixels ever reached the glass, three screen pixels to one: slat tops stepped like a staircase. Now the lens
    // of the second camera is cropped to the box the glass fills in its view, so every
    // pixel of the picture lands on the mirror.
    {
      m.vp.copy(vc.matrixWorld).invert().premultiply(c.projectionMatrix);          // (the second camera's own view of the glass)
      let x0 = 1, x1 = -1, y0 = 1, y1 = -1, ok = true;
      for (let i = 0; i < 4; i++) {
        m.q.set(WX(MIR.x), i & 1 ? MIR.z1 : MIR.z0, WZ(i & 2 ? MIR.y1 : MIR.y0), 1).applyMatrix4(m.vp);
        if (m.q.w < 0.05) { ok = false; break; }
        x0 = Math.min(x0, m.q.x / m.q.w); x1 = Math.max(x1, m.q.x / m.q.w); y0 = Math.min(y0, m.q.y / m.q.w); y1 = Math.max(y1, m.q.y / m.q.w);
      }
      x0 = Math.max(-1, x0 - 0.02); x1 = Math.min(1, x1 + 0.02); y0 = Math.max(-1, y0 - 0.02); y1 = Math.min(1, y1 + 0.02);
      if (ok && x1 - x0 > 0.02 && y1 - y0 > 0.02) {
        const hw = (x1 - x0) / 2, hh = (y1 - y0) / 2, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        m.crop.set(1 / hw, 0, 0, -cx / hw, 0, 1 / hh, 0, -cy / hh, 0, 0, 1, 0, 0, 0, 0, 1);
        vc.projectionMatrix.premultiply(m.crop);
      }
    }
    vc.projectionMatrixInverse.copy(vc.projectionMatrix).invert();
    vc.matrixWorldInverse.copy(vc.matrixWorld).invert();
    m.mat.uniforms.uVP.value.multiplyMatrices(vc.projectionMatrix, vc.matrixWorldInverse);
    // Only what is in front of the glass may be in the picture. (The first version tilted this camera's near plane
    // into the mirror instead. That also skews its far plane, and from the door the whole room was culled away:
    // the mirror showed blank paper.)
    mirrorClip.normal.copy(m.n); mirrorClip.constant = -m.p0.dot(m.n);
    const r = ctx.renderer, was = r.getRenderTarget();
    m.mesh.visible = false;
    // (the meadow's 22,000 tufts, the woods and the other rooms' planting and decor: none of it can be seen in this glass)
    if (!m.skip) { m.skip = []; Object.keys(zones).forEach((z) => zones[z].forEach((o) => { if ((z !== 'bath' && z !== 'garden' && z !== 'dressing' && z !== 'ext') || (z === 'ext' && o.isInstancedMesh)) m.skip.push(o); })); }
    const shown = m.skip.filter((o) => o.visible);
    shown.forEach((o) => { o.visible = false; });
    r.setRenderTarget(m.rt); const ca = r.getClearAlpha(); r.setClearAlpha(1); r.clear(); r.setClearAlpha(ca); r.render(ctx.scene, vc);   // (cleared to paper: where nothing is drawn the glass shows the sheet, not a black hole)
    shown.forEach((o) => { o.visible = true; });
    r.setRenderTarget(was);
    mirrorClip.normal.set(0, 1, 0); mirrorClip.constant = 1e6;
    m.mesh.visible = true;
  }

  /* ---------- the garden's water ---------------------------------------------------
     13 Oct, Sam: "for the pool make sure that we have some water reflection, right now it feels flat". Water here only
     reflected the sky map, so the trough was one pale grey, and from above the sun lay on it as a white blot. It gets a
     picture like the bath's mirror: a second camera under the surface looks up through it, the garden is drawn into a
     picture, and the water shows that picture shifted by two sets of small waves that drift, mixed with its own dark
     colour by how steeply you look into it (steeply: you see into the water; along it: you see the trees and the sky).
     The sun leaves a scatter of glints instead of a blot. Like the mirror it shows only where the garden is already real. */
  const POOL = { x0: 50.42, x1: 61.55, y0: 47.22, y1: 49.55, h: 0.487 };
  let poolMir = null;                                              // (not 'pool': the build has a pool of its own, the patio's rectangle)
  function buildPool(ctx, sunDir) {
    const rt = new THREE.WebGLRenderTarget(ctx.LOW ? 640 : 1536, ctx.LOW ? 192 : 448, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, colorSpace: THREE.LinearSRGBColorSpace,
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false, samples: 4 });
    const mat = new THREE.ShaderMaterial({
      uniforms: { tMir: { value: rt.texture }, uVP: { value: new THREE.Matrix4() }, uTime: { value: 0 }, uCam: { value: new V3() }, uSun: { value: sunDir.clone() } },
      vertexShader: 'uniform mat4 uVP; varying vec4 vClip; varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vClip = uVP * w; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform sampler2D tMir; uniform float uTime; uniform vec3 uCam, uSun; varying vec4 vClip; varying vec3 vW;
        float hh(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
        float nz(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hh(i), hh(i + vec2(1.0, 0.0)), f.x), mix(hh(i + vec2(0.0, 1.0)), hh(i + vec2(1.0, 1.0)), f.x), f.y); }
        float wav(vec2 p) { return nz(p * 2.6 + vec2(uTime * 0.32, uTime * 0.17)) + 0.55 * nz(p * 6.5 - vec2(uTime * 0.45, -uTime * 0.28)) + 0.25 * nz(p * 15.0 + vec2(-uTime * 0.6, uTime * 0.5)); }
        void main() {
          vec2 p = vW.xz; float e = 0.015, w0 = wav(p);
          vec2 sl = vec2(wav(p + vec2(e, 0.0)) - w0, wav(p + vec2(0.0, e)) - w0) / e * 0.011;
          vec3 nrm = normalize(vec3(-sl.x, 1.0, -sl.y)), V = normalize(uCam - vW);
          float fres = 0.025 + 0.975 * pow(1.0 - max(dot(nrm, V), 0.0), 5.0);
          vec4 c = texture2D(tMir, vClip.xy / vClip.w * 0.5 + 0.5 + sl * 0.5);
          vec3 refl = mix(c.rgb, vec3(0.8, 0.77, 0.71) * (1.0 - 0.8 * clamp(c.r, 0.0, 1.0)), clamp(c.a, 0.0, 1.0));
          vec3 deep = vec3(0.01, 0.032, 0.038) * (0.85 + 0.3 * w0);
          vec3 col = mix(deep, refl * vec3(0.86, 0.9, 0.9), clamp(fres * 1.2, 0.0, 1.0));
          col += vec3(1.0, 0.86, 0.66) * pow(max(dot(reflect(-V, nrm), normalize(uSun)), 0.0), 900.0) * 6.0;
          gl_FragColor = vec4(col, 0.0);
        }`,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneMinusDstAlphaFactor, blendDst: THREE.DstAlphaFactor,
      blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(POOL.x1 - POOL.x0, POOL.y1 - POOL.y0), mat);
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(WX((POOL.x0 + POOL.x1) / 2), POOL.h + 0.002, WZ((POOL.y0 + POOL.y1) / 2));
    mesh.visible = false; mesh.castShadow = false; mesh.receiveShadow = false; mesh.renderOrder = 5;
    ctx.scene.add(mesh);
    poolMir = { rt, mat, mesh, cam: new THREE.PerspectiveCamera(), tick: 1, t: new V3(), up: new V3(), vp: new THREE.Matrix4(), crop: new THREE.Matrix4(), q: new THREE.Vector4() };
  }
  function poolFrame(ctx, on, time) {
    const m = poolMir;
    if (!m) return;
    const c = ctx.camera;
    on = on && c.position.y > POOL.h + 0.2 && c.position.y < 60;
    if (!on) { m.mesh.visible = false; return; }
    m.mat.uniforms.uTime.value = time; m.mat.uniforms.uCam.value.copy(c.position);
    if (m.mesh.visible && (m.tick++ & 1)) return;                    // every other frame, the frames the mirror skips
    const vc = m.cam, H = POOL.h;
    vc.position.copy(c.position); vc.position.y = 2 * H - vc.position.y;
    c.getWorldDirection(m.t); m.t.add(c.position); m.t.y = 2 * H - m.t.y;
    m.up.set(0, 1, 0).applyQuaternion(c.quaternion); m.up.y = -m.up.y;
    vc.up.copy(m.up); vc.lookAt(m.t); vc.updateMatrixWorld();
    vc.projectionMatrix.copy(c.projectionMatrix);
    {
      m.vp.copy(vc.matrixWorld).invert().premultiply(c.projectionMatrix);
      let x0 = 1, x1 = -1, y0 = 1, y1 = -1, ok = true;
      for (let i = 0; i < 4; i++) {
        m.q.set(WX(i & 1 ? POOL.x1 : POOL.x0), H, WZ(i & 2 ? POOL.y1 : POOL.y0), 1).applyMatrix4(m.vp);
        if (m.q.w < 0.05) { ok = false; break; }
        x0 = Math.min(x0, m.q.x / m.q.w); x1 = Math.max(x1, m.q.x / m.q.w); y0 = Math.min(y0, m.q.y / m.q.w); y1 = Math.max(y1, m.q.y / m.q.w);
      }
      x0 = Math.max(-1, x0 - 0.04); x1 = Math.min(1, x1 + 0.04); y0 = Math.max(-1, y0 - 0.04); y1 = Math.min(1, y1 + 0.04);
      if (ok && x1 - x0 > 0.02 && y1 - y0 > 0.02) {
        const hw = (x1 - x0) / 2, hh = (y1 - y0) / 2, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        m.crop.set(1 / hw, 0, 0, -cx / hw, 0, 1 / hh, 0, -cy / hh, 0, 0, 1, 0, 0, 0, 0, 1);
        vc.projectionMatrix.premultiply(m.crop);
      }
    }
    vc.projectionMatrixInverse.copy(vc.projectionMatrix).invert();
    vc.matrixWorldInverse.copy(vc.matrixWorld).invert();
    m.mat.uniforms.uVP.value.multiplyMatrices(vc.projectionMatrix, vc.matrixWorldInverse);
    mirrorClip.normal.set(0, 1, 0); mirrorClip.constant = -H;
    const r = ctx.renderer, was = r.getRenderTarget();
    m.mesh.visible = false;
    // (only the garden, the house and the land and trees round it can lie in this water: not the meadow's tufts, not the rooms)
    if (!m.skip) { m.skip = []; Object.keys(zones).forEach((z) => zones[z].forEach((o) => { if ((z !== 'garden' && z !== 'ext' && z !== 'bath') || o.userData.noReflect) m.skip.push(o); })); }
    const shown = m.skip.filter((o) => o.visible);
    shown.forEach((o) => { o.visible = false; });
    r.setRenderTarget(m.rt); const ca = r.getClearAlpha(); r.setClearAlpha(1); r.clear(); r.setClearAlpha(ca); r.render(ctx.scene, vc);   // (cleared to paper: where nothing is drawn the glass shows the sheet, not a black hole)
    shown.forEach((o) => { o.visible = true; });
    r.setRenderTarget(was);
    mirrorClip.normal.set(0, 1, 0); mirrorClip.constant = 1e6;
    m.mesh.visible = true;
  }

  /* ---------- the roll of paper ----------------------------------------------------
     Sam, 9 Oct: "the plan d'architecte... sometimes they roll it into a tube. So the transition to the hero,
     it's like the roll of paper is opening up, and then we see the sketch of the house."
     Two halves that move as one. In the 3D, a line on the ground: every material behind it is the drawing
     again (uRoll in drawable). On the page, a band of paper drawn in CSS that sits on that line: the roll,
     thick when it starts and thin when it has given all its paper, with its shadow on the house ahead.
     The line leans three degrees, because nobody unrolls a sheet dead straight. */
  const ROLL_A = 3 * Math.PI / 180, ROLL_N = [Math.cos(ROLL_A), Math.sin(ROLL_A)];
  const _r0 = new V3(), _r1 = new V3();
  let rollEl = null;
  const ensureRoll = () => {
    if (rollEl) return;
    rollEl = document.createElement('div'); rollEl.className = 'roll'; rollEl.setAttribute('aria-hidden', 'true'); rollEl.innerHTML = '<i></i><b></b>'; document.body.appendChild(rollEl);
    if (planPrint) rollEl.style.setProperty('--print', 'url(' + planPrint + ')');
  };
  // the line's distance for a point of the screen (at mid height), and the screen position of a point of the plan
  const rollTools = (cam) => {
    const W = innerWidth, H = innerHeight;
    return {
      dAt: (px) => { _r0.set((px / W) * 2 - 1, 0, 0.5).unproject(cam).sub(cam.position); const t = -cam.position.y / _r0.y; return (cam.position.x + _r0.x * t) * ROLL_N[0] + (cam.position.z + _r0.z * t) * ROLL_N[1]; },
      sx: (v) => { v.project(cam); return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H]; },
    };
  };
  // lays the tube on the line that passes through screen x = pxAt, dia pixels thick. Returns the line: its distance and two of its points on screen
  function placeRoll(ctx, pxAt, dia) {
    const H = innerHeight, { dAt, sx } = rollTools(ctx.camera);
    const d = dAt(pxAt);
    const a = sx(_r0.set(ROLL_N[0] * d + ROLL_N[1] * 60, 0, ROLL_N[1] * d - ROLL_N[0] * 60)), b = sx(_r1.set(ROLL_N[0] * d - ROLL_N[1] * 60, 0, ROLL_N[1] * d + ROLL_N[0] * 60));
    const cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2, ang = Math.atan2(b[1] - a[1], b[0] - a[0]) - Math.PI / 2;
    rollEl.style.opacity = 1;
    rollEl.style.width = dia.toFixed(1) + 'px';
    rollEl.style.setProperty('--turn', (-pxAt * 1.1).toFixed(1) + 'px');                      // the sheet's free edge on the tube turns as it rolls
    // The plan itself is printed on the tube: the strip of the drawing that is about to be laid, at the sheet's own
    // scale and height, pressed to two thirds of its width by the curve. It slides as the roll moves on.
    const o0 = sx(_r0.set(WX(PRINT[0]), 0, WZ(PRINT[1]))), o1 = sx(_r1.set(WX(PRINT[0] + PRINT[2]), 0, WZ(PRINT[1] + PRINT[3])));
    rollEl.style.setProperty('--bs', ((o1[0] - o0[0]) * 0.64).toFixed(1) + 'px ' + (o1[1] - o0[1]).toFixed(1) + 'px');
    // (what shows on a roll is the stretch about to be laid, so the strip starts two tube widths ahead of the line, less than one turn.
    // At rest beside the house the tube then already carries the west wall and the first rooms.)
    rollEl.style.setProperty('--bp', (-((cx - dia / 2 + dia * 2.2) - o0[0]) * 0.64).toFixed(1) + 'px ' + (o0[1] - (cy - H * 0.9)).toFixed(1) + 'px');
    rollEl.style.transform = `translate(${(cx - dia / 2).toFixed(1)}px, ${(cy - H * 0.9).toFixed(1)}px) rotate(${ang.toFixed(4)}rad)`;
    return { d, a, b };
  }
  function roll(ctx, k) {
    ensureRoll();
    const u = RU.uRoll.value;
    if (k <= 0 || k >= 1) { u.set(ROLL_N[0], ROLL_N[1], -1e6); rollEl.style.opacity = 0; return; }   // past 1 the rooms themselves are back to ink
    const W = innerWidth, { sx } = rollTools(ctx.camera);
    const planLeft = sx(_r1.set(WX(-3), 0, WZ(16)))[0];
    // Three beats. The tube rolls in fast over the empty margin and comes to rest just left of the house, so for a
    // moment it is an object lying on the site. Then it opens across the plan, slowly, and runs off the right edge.
    const rest = Math.max(W * 0.05, Math.min(W * 0.4, planLeft - 70));
    const eo = (t) => 1 - (1 - t) * (1 - t), eio = (t) => t * t * (3 - 2 * t);
    const dia0 = 104 * Math.min(1, W / 900 + 0.35);
    const pxAt = k < 0.16 ? FX.lerp(-dia0, rest, eo(k / 0.16)) : k < 0.27 ? rest : FX.lerp(rest, W + dia0 * 0.6, eio((k - 0.27) / 0.73));
    const dia = FX.lerp(dia0, dia0 * 0.3, Math.max(0, (pxAt + dia0) / (W + dia0 * 1.6)));      // it thins as the sheet comes off it
    u.set(ROLL_N[0], ROLL_N[1], placeRoll(ctx, pxAt, dia).d);
  }

  /* ---------- the paper rolls out after the loader -------------------------------------
     Sam, 9 Oct (evening), on seeing the roll at the end of the walk: "I wanted it after the loader. When the loader
     ends, the paper can roll out. So we see the architecture plan. And then as we start scrolling, we can enter
     the 3D world." So the page now opens on a bare drawing board. The same tube crosses it from the left and
     leaves the sheet behind it: the plan, and the page's own words, which are printed on that sheet.
     The 3D needs nothing new for this (at the start everything already is the drawing). The board is a plain
     element over the page, cut along the roll's line, and the scroll is held until the sheet is down.
     Not with ?at= (tools and jump links), not with reduced motion, not with the drawn openings (?hero=draw,
     ?loader=), and ?open=plain gives the opening as it was. */
  const rollIn = { on: false, k: 0, board: null, done: null };
  let sheetWas = null;
  function rollInFrame(ctx) {
    ensureRoll();
    rollEl.classList.add('roll--intro');
    const W = innerWidth, H = innerHeight, dia0 = 104 * Math.min(1, W / 900 + 0.35);
    // (it waits well off the left edge: at three quarters of a width its shadow already lay on the board while the
    // loader's last line was still fading there)
    const pxAt = FX.lerp(-dia0 * 2.8, W + dia0 * 0.75, rollIn.k);
    const r = placeRoll(ctx, pxAt, FX.lerp(dia0 * 1.12, dia0 * 0.3, Math.max(0, (pxAt + dia0) / (W + dia0 * 1.6))));
    // everything right of the line is still bare board
    const slope = (r.b[0] - r.a[0]) / (r.b[1] - r.a[1]), xTop = r.a[0] - r.a[1] * slope, xBot = r.a[0] + (H - r.a[1]) * slope;
    if (rollIn.board) rollIn.board.style.clipPath = `polygon(${xTop.toFixed(1)}px 0, ${W + 4}px 0, ${W + 4}px ${H + 4}px, ${xBot.toFixed(1)}px ${H + 4}px)`;
    // The sheet is down the moment the tube has left the screen, and from then it answers. (The move itself eases out
    // for another half second off screen. Waiting for that, the sheet "looked ready and did not answer".)
    if (rollIn.done && Math.min(xTop, xBot) - dia0 * 0.4 > W) rollIn.done();
  }

  // how far in front of the lens the nearest visible point of the scene can be, taking everything to lie under height Y
  const _q = new THREE.Quaternion(), _fw = new V3(), _ry = new V3();
  function nearestSeen(cam, Y) {
    if (cam.position.y <= Y + 0.5) return 1;
    const th = Math.tan((cam.fov * Math.PI) / 360), tw = th * cam.aspect;
    _fw.set(0, 0, -1).applyQuaternion(_q.copy(cam.quaternion));
    let near = Infinity;
    for (let i = 0; i < 5; i++) {
      _ry.set(i === 4 ? 0 : (i & 1 ? tw : -tw), i === 4 ? 0 : (i & 2 ? th : -th), -1).applyQuaternion(_q);     // a corner ray, one unit deep
      if (_ry.y < -1e-6) near = Math.min(near, (cam.position.y - Y) / -_ry.y);                                  // its depth where it meets the lid
    }
    return near === Infinity ? 1 : Math.max(1, near);
  }

  // Four lights for all the lamps of the house. A lamp's weight is its brightness now (its room's reveal, the hour,
  // a fire's flicker), fading out once the camera is too far for it to matter. A light stays with its lamp until
  // that weight is zero, so nothing pops: a lamp only loses its light to one more than twice as strong.
  function lampPool(cam) {
    if (!stage || !lampSlots.length) return;
    const L = stage.lights;
    L.forEach((o) => {
      const d = Math.hypot(cam.position.x - o.x, cam.position.y - o.y, cam.position.z - o.z), f0 = o.far || o.dist * 1.5 + 4;
      o.w = o.l.intensity * (1 - FX.smooth(FX.clamp01((d - f0) / 6)));
    });
    lampSlots.forEach((p) => { if (p.spot && p.spot.w <= 1e-4) { p.spot.slot = null; p.spot = null; } });
    L.filter((o) => o.w > 1e-4 && !o.slot).sort((a, b) => b.w - a.w).forEach((o) => {
      let p = lampSlots.find((q) => !q.spot);
      if (!p) { p = lampSlots.reduce((a, b) => (a.spot.w < b.spot.w ? a : b)); if (p.spot.w > o.w * 0.5) return; p.spot.slot = null; }
      p.spot = o; o.slot = p;
      p.l.position.set(o.x, o.y, o.z); p.l.color.setHex(o.color); p.l.distance = o.dist; p.l.decay = o.decay;
    });
    lampSlots.forEach((p) => { p.l.intensity = p.spot ? p.spot.w : 0; });
  }

  /* ---------- per-frame choreography --------------------------------------------- */
  const _k = {};
  let outdoorK = 0, dofNow = 0.05;
  // haze density, exposure, haze strength, by where the camera stands
  const AIR = { room: [0.24, 1.03, 0.6], living: [0.26, 1.03, 0.62], kitchen: [0.16, 0.9, 0.4], gallery: [0.05, 0.9, 0.5],
    bedroom: [0.18, 1.0, 0.6], dressing: [0.2, 1.04, 0.6], bath: [0.14, 0.95, 0.55], out: [0.008, 0.74, 0.22] };
  const air = { haze: 0.3, exp: 1.16, amp: 0.85 };
  function frame(ctx, st) {
    const s = st.sD, at = ctx.at, span = ctx.span, P = ctx.P;
    const ease = FX.easeInOut;
    const idx = st.m.idx;

    // the cut. First it rises through the house while the lens opens and drops away
    // as the camera comes down to the door. In the entrance the roof lifts off for the
    // climb to the living room plan, and the walls grow back up around you as you land.
    const OFF = 1e5;
    let cut;
    if (s < at('hall', 'h1')) {
      // the walls rise to just under the ceilings and stay there, so no roof ever shows from above.
      // Below 3.55 m nothing can see a roof top, so the walls finish growing as the camera lands,
      // and the entrance closes over you once you are through the door.
      const rise = FX.smooth(span(idx, 0.18, 0.9));
      const camY = ctx.camera.position.y;
      const land = camY < 3.55 ? FX.smooth((3.55 - camY) / 1.0) : 0;
      const inside = FX.smooth(span(s, at('door', 'h1') + 45, at('hall') - 5));
      cut = inside >= 1 ? OFF : inside > 0 ? FX.lerp(4.25, 5.3, inside) : FX.lerp(1.2, 3.52, rise) + 0.73 * land;
    } else {
      const off = FX.smooth(span(s, at('hall', 'h1'), at('hall', 'h1') + 30));
      const land = FX.smooth(span(s, at('living') - 22, at('living') + 30));
      cut = land > 0 ? (land >= 1 ? OFF : FX.lerp(3.52, 5.3, land)) : FX.lerp(5.3, 3.52, off);
    }
    // The way back. From the garden the camera lifts over the house and everything turns back into the
    // drawing it started as: materials drain away, the cut comes down through the walls, the lens closes.
    // The last frame is the first frame.
    const backRaw = span(s, at('garden', 'h1') + 25, at('asbuilt') - 30);
    if (backRaw > 0) {
      const LK = ctx.K.length - 1;
      const down = FX.smooth(span(backRaw, 0.38, 0.72));
      const flatten = FX.smooth(span(idx, LK - 0.9, LK - 0.18));
      cut = down <= 0 ? OFF : FX.lerp(FX.lerp(5.3, 3.52, down), 1.2, flatten);
    }
    // Until 9 Oct every room drained back to ink on the way up. Now the house stays built while the camera lifts
    // (the cut still comes down, so from above it is the plan in real materials), and then the architect's roll
    // of paper opens across it from the left and leaves the drawing: the sheet the page began on.
    const rollK = span(s, at('asbuilt') + 4, at('asbuilt', 'h1') - 24);
    const fwdRoom = rollK >= 1 ? 0 : 1, fwdExt = fwdRoom;
    if (rollIn.on) { P.fadeBlack = 0; rollInFrame(ctx); } else roll(ctx, rollK);
    // While the page shows the drawing, the scroll hint stands on a little paper of its own, as lettering on a plan does
    // (theme.css, .on-sheet). The path's edges ran straight through its words.
    const onSheet = s < at('door') - 20 || rollK >= 1;
    if (onSheet !== sheetWas) { sheetWas = onSheet; document.documentElement.classList.toggle('on-sheet', onSheet); }
    cutPlane.constant = cut;
    RU.uCutY.value = cut;
    RU.uCutOn.value = cut >= OFF ? 0 : 1;
    capMeshes.forEach((m) => {
      const c = m.userData.cap;
      m.visible = cut < OFF && cut > c[0] + 0.01 && cut < c[1] - 0.005;
      if (m.visible) m.position.y = cut + 0.001;
    });
    // Depth is kept as 1 / (1 + distance past zBase) in a half float, which is good to about a thousandth of that
    // distance. The base used to sit 70 m in front of the target, so on the plan a depth was only good to 7 cm:
    // a slab 1 cm proud of the gravel, a rug, a bevel fell on one side of a rounding step or the other from frame
    // to frame, and their outlines blinked on and off while the plan opened. Now the base sits a metre in front of
    // the nearest thing the lens can see (its corners against a lid at 6.2 m, above every roof): good to a centimetre.
    P.zBase = nearestSeen(ctx.camera, 6.2) - 1;
    if (annMat) annMat.uniforms.uCanK.value = 1 - FX.smooth(FX.range(ctx.camera.position.y, 7, 22));
    if (annMat) annMat.uniforms.uHeadK.value = FX.smooth(FX.range(Math.exp(ctx.cam.lf), 3.05, 4.0));     // (the lens is at 3 degrees on the sheet, first and last)
    const tele = 1 - FX.smooth(FX.range(ctx.camera.fov, 6, 30));        // 1 while the lens is a plan
    RU.uTele.value = tele;

    // the pivot door turns along its drawn arc, then the entrance arrives
    const open = ease(span(s, at('door') + 8, at('door', 'h1') - 6)) * (1 - ease(span(backRaw, 0.35, 0.9)));
    if (pivot) pivot.rotation.y = open * Math.PI / 2;
    // Each wave turns a room real together with everything you can see from it: its side rooms and
    // whatever lies behind its glass. Only the rooms ahead on the walk stay a drawing.
    const V = RU.uRV.value, set = (ids, v) => ids.forEach((id) => { V[RM[id].i] = v; });
    // 1. the door opens: the entrance, and the world outside with it
    const inside = ease(span(s, at('door') + 40, at('hall') + 45)) * fwdRoom;
    set(['entrance', 'hall', 'wc'], inside);
    set(['guest2', 'garage'], ease(span(s, at('door') + 70, at('hall') + 45)) * fwdRoom);
    const outside = ease(span(s, at('door') + 34, at('door', 'h1') + 60)) * fwdExt;
    RU.uXV.value = outside;
    if (skyMat) skyMat.uniforms.paper.value = Math.max(1 - ease(span(s, at('door') + 44, at('door', 'h1') + 40)), ease(span(backRaw, 0.3, 0.75)));
    // Sam, 9 Oct: "we should always have the scanning effect as we follow the camera, so the rest of the scene
    // should not be fully displayed yet." So the rule is now: beside you and behind you is real, and every
    // space still ahead on the walk stays a drawing until you get there, even when you see it through glass.
    // Rooms the walk never enters turn real with their neighbour, so no outline is ever left behind.
    // 2. the living room and the guest suite beside it
    const living = ease(span(s, at('living') - 50, at('living') + 50)) * fwdRoom;
    set(['living', 'guest1'], living);
    // 3. the kitchen
    const kitchen = ease(span(s, at('living', 'h1') + 10, at('dining') + 30)) * fwdRoom;
    set(['kitchen', 'wine', 'media'], kitchen);
    // 4. the patio: scanned from the sliding door as the camera turns to it and steps out, done as you arrive.
    // The study and the library face it across the stone, so they follow a beat later.
    const patio = ease(span(s, at('dining', 'h1') - 8, at('patio') + 22)) * fwdRoom;
    // The same wave runs on over the lawn south of the pool while you stand in the court (the yard, see ROOMS).
    // 0.72 of it is the patio itself (29 of the wave's 52 metres), the rest is the lawn, the wall and the cypresses.
    V[RM.patio.i] = V[RM.yard.i] = 0.72 * patio + 0.28 * FX.smooth(span(s, at('patio') + 4, at('patio', 'h1') - 26)) * fwdRoom;
    set(['study', 'library'], ease(span(s, at('slide') - 10, at('patio') + 40)) * fwdRoom);
    // 5. the gallery: the scan runs down its 24 metres ahead of you. It reaches a third of the way as you
    // step in, waits there while you stand, then stays a few metres in front of the lens to the far door.
    const g0 = span(s, at('olive', 'h1') + 15, at('gallery')), g1 = span(s, at('gallery', 'h1') - 20, at('galleryEnd') - 30);
    const gallery = (0.46 * ease(g0) + 0.54 * FX.smooth(g1)) * fwdRoom;
    V[RM.gallery.i] = gallery;
    // 6. the master bedroom
    const bedroom = ease(span(s, at('galleryEnd', 'h1') + 10, at('bedroom') + 30)) * fwdRoom;
    V[RM.bedroom.i] = bedroom;
    // 7 and 8. the dressing room and the bath
    // (its scan runs ahead of you down the wardrobe and is done as you reach the middle of the room)
    const dressing = ease(span(s, at('bedroom', 'h1') + 10, at('dressMid') - 6)) * fwdRoom;
    V[RM.dressing.i] = dressing;
    const bath = ease(span(s, at('dress') - 30, at('bath') + 30)) * fwdRoom;
    V[RM.bath.i] = bath;
    // 9. the garden: scanned from the bath's door outward while you stand in the bath and watch it through the
    // glass, so the tub gets its view of the sea and the lawn is ready when you step onto it
    const garden = ease(span(s, at('bath') + 4, at('bath') + 56)) * fwdRoom;
    V[RM.garden.i] = garden;
    // on the way back up the roofs stop drawing, but still cast their shade: a pool of light in every room
    const roofsOff = s > at('garden', 'h1') + 20 && ctx.camera.position.y > 5;
    // (And they no longer cast their shade either. With it every room was a dark box with one pool of light, and
    // the last look at the built house was the murkiest frame of the walk.)
    roofMeshes.forEach((m) => { m.material.colorWrite = !roofsOff; m.material.depthWrite = !roofsOff; m.userData.noPrepass = roofsOff;
      if (m.castShadow === roofsOff) { m.castShadow = !roofsOff; ctx.renderer.shadowMap.needsUpdate = true; } });
    if (ctx.scene.fog) { ctx.scene.fog.near = Math.max(140, st.dist - 60); ctx.scene.fog.far = ctx.scene.fog.near + 3500; }

    // landscape shows once its zone starts to turn real. A change in what casts shadows (that, or the door) redraws the shadow map.
    const rv = { patio, ext: outside, garden, living, entrance: inside, kitchen, gallery, bedroom, dressing, bath };
    let key = 0, bit = 1;
    for (const z in rv) { if (rv[z] > 0) key += bit; bit *= 2; }
    if (key !== zoneKey) { zoneKey = key; Object.keys(zones).forEach((z) => zones[z].forEach((m) => { m.visible = rv[z] > 0; })); ctx.renderer.shadowMap.needsUpdate = true; }
    const flick = 0.75 + 0.25 * Math.sin(st.t * 7.1) * Math.sin(st.t * 3.3 + 1.2);
    if (stage) stage.lights.forEach((o) => { o.l.intensity = o.k * (rv[o.zone] || 0) * (o.fire === 'hearth' ? flick : o.fire ? 0.8 + 0.4 * flick : 1); });
    if (stage && stage.flame) stage.flame.uniforms.uTime.value = st.t;
    // Decor is in the depth pass, which leaves out whatever of it is still paper (see "the depth pass, taught about
    // paper" in build). So a piece that has arrived has contact shadows under it, sits at its own depth in the blur,
    // and nothing behind it is outlined across it. Only under the plan lens does it stay out altogether.
    let dk = 0, db = 1;
    for (const z in rv) { if (rv[z] >= 0.999) dk += db; db *= 2; }
    if (tele > 0.5) dk = -2;                                           // seen as a plan it stays out, or the roll would leave its outlines on the sheet
    if (dk !== decorKey) { decorKey = dk; Object.keys(zones).forEach((z) => zones[z].forEach((m) => { if (m.userData.decor) m.userData.noPrepass = tele > 0.5; })); }
    if (open !== doorWas || frames++ < 12) { doorWas = open; ctx.renderer.shadowMap.needsUpdate = true; }
    // glass is left out of the depth pass only while a drawing can be seen through it (so the drawing keeps its lines)
    const seeThrough = (living > 0 && patio < 0.999) || (patio > 0 && gallery < 0.999) || (bath > 0 && garden < 0.999);
    glassMeshes.forEach((m) => { m.userData.noPrepass = seeThrough; });

    // Resolution. The plan needs every pixel for its hairlines and is cheap to draw. The walk is photographic,
    // costs far more per pixel and looks the same with fewer. Each gets a fixed pixel budget, so the picture
    // never changes sharpness in steps while you scroll (the engine's own step-down is switched off for this page).
    {
      const dpr = ctx.renderer.getPixelRatio(), W = innerWidth, H = innerHeight;
      // the change of budget happens as you step through the door, and again once the house is back on paper
      const drawing = tele > 0.5 || s < at('door', 'h1') + 5 || backRaw > 0.8;
      // 8.3 million is a 4K screen's worth. At 5.6 the sheet was only drawn 1:1 up to 1440 by 900 at retina: on a 16 inch
      // MacBook (1728 by 992) it was drawn at 90% and stretched, which is what made the lettering look soft.
      const budget = (drawing ? (backRaw > 0 && rollK < 1 ? 4.2e6 : 8.3e6) : 3.4e6) * resBudget;
      const k = Math.min(1, Math.sqrt(budget / (W * H * dpr * dpr)));
      const rw = Math.max(2, Math.round(W * dpr * k)), rh = Math.max(2, Math.round(H * dpr * k));
      if (ctx.post.w !== rw || ctx.post.h !== rh) ctx.post.setSize(rw, rh, Math.round(W * dpr), Math.round(H * dpr));
      // a machine that still cannot hold the pace gets a smaller budget, once, after two slow seconds
      slow = (st.dt || 0.016) > 0.026 ? slow + (st.dt || 0.016) : Math.max(0, slow - 0.01);
      if (slow > 2 && resBudget > 0.45 && !STEADY) { resBudget *= 0.75; slow = 0; }
    }

    // of a pane's two meshes only the one with something to draw is shown: all paper, all real, or both in between
    glassPairs.forEach((p) => { const r = p.key == null ? 0.5 : p.key === 'ext' ? outside : V[RM[p.key].i]; p.paper.visible = r < 0.999; p.real.visible = r > 0.001; });

    // the plan's dimensions hang in the room, then go once the materials have arrived
    // (Until 9 Oct they stayed through each stop and ran through the room titles. Now each set is gone by the time you stand still.)
    const dimK = (inA, inB, outA, outB) => FX.smooth(span(s, inA, inB)) * (1 - FX.smooth(span(s, outA, outB)));
    // (gone before the camera drops: they are placed for the view straight down, and on the way down "12.00" slid onto
    // the dashed roof lights and "6.00" onto the dashed line of the opening)
    if (dims.living) dims.living.value = dimK(at('livingTop') - 70, at('livingTop') - 10, at('livingTop', 'h1') + 5, at('livingTop', 'h1') + 55);
    if (dims.kitchen) dims.kitchen.value = dimK(at('living', 'h1') - 10, at('living', 'h1') + 40, at('dining') - 30, at('dining') + 4);
    // (the court's and the bedroom's are only read from the room before: once the camera starts toward a figure it was chopped by a wall)
    if (dims.patio) dims.patio.value = dimK(at('dining', 'h1') - 4, at('dining', 'h1') + 30, at('slide') - 50, at('slide') - 14);
    if (dims.gallery) dims.gallery.value = dimK(at('olive', 'h1') + 10, at('olive', 'h1') + 44, at('turn') - 50, at('turn') - 24);     // read through the glass from the court, gone before you step in
    if (dims.bedroom) dims.bedroom.value = dimK(at('galleryEnd', 'h1') - 10, at('galleryEnd', 'h1') + 30, at('bedIn') - 36, at('bedIn') - 8);
    if (dims.garden) dims.garden.value = 0;
    RES.value.set(ctx.post.w / 2, ctx.post.h / 2);
    // the room the camera stands in sets the haze and the exposure: a room crossed by a few
    // shafts can take a lot of haze, a room that is all sun (the gallery, the patio) very little
    const cpx = ctx.camera.position.x + OX, cpy = ctx.camera.position.z + OZ;
    const here = ROOMS.find((r) => !r.outdoor && cpx > r.r[0] && cpx < r.r[2] && cpy > r.r[1] && cpy < r.r[3]);
    const look = (here && AIR[here.id]) || (here ? AIR.room : AIR.out);
    const kk = 1 - Math.exp(-(st.dt || 0.016) * 2.5);
    air.haze += (look[0] - air.haze) * kk; air.exp += (look[1] - air.exp) * kk; air.amp += (look[2] - air.amp) * kk;
    outdoorK += ((here ? 0 : 1) - outdoorK) * kk;

    // dust in the sun, room by room, and the fire
    if (dustSets.entrance) {
      // Sam likes the dust for the depth it gives. The outside review read it as snow indoors and, near a window at dusk,
      // as stars. So it stays in the two rooms the sun crosses in shafts and is only a trace anywhere else.
      // (14 Oct: all of it a little stronger again, the sunlit rooms most)
      dustSets.entrance.material.uniforms.uFade.value = inside * 0.85;
      dustSets.living.material.uniforms.uFade.value = living * 0.9;
      dustSets.kitchen.material.uniforms.uFade.value = kitchen * 0.65;
      dustSets.patio.material.uniforms.uFade.value = patio * 0.06;
      dustSets.gallery.material.uniforms.uFade.value = gallery * 0.18;
      dustSets.bedroom.material.uniforms.uFade.value = bedroom * 0.3;
      dustSets.bath.material.uniforms.uFade.value = bath * 0.22;
      Object.values(dustSets).forEach((d) => { d.material.uniforms.uTime.value = st.t; });
    }
    if (ctx.world && ctx.world.M) ctx.world.M.fire.emissiveIntensity = living * 2.2 * flick;

    // finish: paper wherever a room has not arrived yet
    P.paperOn = 1;
    P.ink = INK_NONE ? 0 : 1;
    P.inkTele = Math.max(st.flat, tele);
    P.inkAA = ctx.post.opts && ctx.post.opts.preMsaa ? 1 : 0;
    // While the garden is scanned through the bath's glass, that glass is out of the depth pass (see seeThrough), so
    // the sunlit air is counted all the way out to the lawn: the half-finished garden went pale, and cleared with a
    // jump the moment the scan was done. The haze now steps back for that stretch and returns over the end of the rest.
    const gardenScan = FX.smooth(span(s, at('dress') - 60, at('dress') - 30)) * (1 - FX.smooth(span(s, at('bath') + 56, at('bath') + 74)));
    P.shafts = air.haze * (1 - tele) * (1 - gardenScan);
    P.shaftAmp = air.amp;
    P.shaftDist = 24;
    P.sunDust = 1 - tele;
    P.ao = inside > 0 || outside > 0 ? 0.9 : 0;                       // no contact shadows to compute while the whole sheet is paper
    P.aoRadius = 0.5;
    const still = Math.max(st.flat, tele);
    // The blur used to jump between two strengths at the edge of every stop (0.08 walking, 0.25 standing), which read
    // as a blink, and things close to the lens got a hard, rough outline. It now eases from one to the other, and less of it.
    dofNow += ((st.m.phase === 'hold' && st.m.key > 0 ? FX.lerp(0.18, 0.07, outdoorK) : 0.05) - dofNow) * kk;
    P.dof = still > 0.5 ? 0 : dofNow;
    // focus: each stop says where the subject is (the walking keys have their target 2.5 m ahead,
    // which is not what you look at), and the focus glides between stops
    const fk = (i) => { const k = ctx.K[i]; return k.focus || Math.max(3, Math.exp(k.lfr) / (2 * Math.tan((Math.exp(k.lf) * Math.PI) / 360))); };
    P.focus = st.m.phase === 'hold' ? fk(st.m.key) : Math.exp(FX.lerp(Math.log(fk(st.m.key)), Math.log(fk(st.m.to)), FX.smooth(st.m.f)));
    P.bloomAmt = 0.18;
    P.exposure = FX.lerp(1.0, air.exp, inside) * FX.lerp(1, 1.5, tele);     // from above the built house is in open shade and came out muddy
    P.inkReal = FX.lerp(0.12, 0.05, outdoorK * outside);
    P.warmth = FX.lerp(0.08, 0.2, inside);
    P.saturation = 1.0;
    P.contrast = 1.1;
    P.vignette = FX.lerp(0.04, 0.28, 1 - still);
    P.grain = 0.007 * (1 - still);                                   // a trace of film grain on real surfaces only (grainPaper 0)
    // Seen from above the house is a model on a table, and a model is lit from high up: the sun climbs to 60 degrees
    // while the camera lifts, so walls throw short crisp shadows and not six metres of black across every floor.
    const aboveK = FX.smooth(span(backRaw, 0.1, 0.55));
    if (LIGHT && window.__light) {
      if (aboveK > 0) { if (elBase == null) elBase = window.__light.state.el || 32; window.__light.over = { el: FX.lerp(elBase, 60, aboveK) }; }
      else if (elBase != null) { elBase = null; window.__light.over = null; }
    }
    if (LIGHT) LIGHT.frame(ctx, st, P, { s, inside, outside, outdoorK, backRaw, stage });
    lampPool(ctx.camera);
    if (HOUSE) HOUSE.frame(ctx, st, P, { living, tele });
    if (!LIGHT && hemiLight) hemiLight.intensity = 0.5;                 // (a light look sets it every frame, the old light does not)
    if (aboveK > 0) { if (hemiLight) hemiLight.intensity *= 1 + 1.3 * aboveK; P.warmth *= 1 - 0.55 * aboveK; P.exposure *= 1 - 0.14 * aboveK; }
    if (HERO) HERO.frame(ctx, st, P);
    mirrorFrame(ctx, bath > 0.01 && tele < 0.5 && rollK <= 0 && s > at('bedroom', 'h1') && s < at('garden') + 30);
    poolFrame(ctx, garden > 0.01 && rollK <= 0 && s > at('bath', 'h0'), st.t);
    if (window.__P) Object.assign(P, window.__P);                      // design aid: __P = { ao: 0 } overrides any finisher value from the console
  }

  // while the camera looks straight down the sheet holds perfectly still: no drift on the
  // rests, no pointer parallax, north up. Any sub-pixel motion makes hairlines shimmer.
  function camera(ctx, st, cam) {
    // The engine lets the view drift a degree to one side during a rest, left on even keys and right on odd ones.
    // The key added in the dressing room made every later key change sides: the bath and the garden keep the drift Sam saw.
    // (Before the lock below, which takes all drift out of a top view: after it, this turned the last sheet by two degrees.)
    if (st.m.key > ctx.KEY.dressMid) cam.yaw -= 2.4 * st.m.push * (st.m.key % 2 ? -1 : 1);
    const top = FX.smooth(FX.range(cam.pitch, 70, 88));
    if (top > 0) {
      ctx.sampleKeys(st.m.idx, _k);
      cam.yaw = FX.lerp(cam.yaw, _k.yaw, top);
      cam.pitch = Math.min(FX.lerp(cam.pitch, _k.pitch, top), 89.5);
      cam.lfr = FX.lerp(cam.lfr, _k.lfr, top);
    }
    if (HERO) HERO.camera(ctx, st, cam);
    // Design aid for placing a stop. In the console: __cam = { p: [x, y, eye], look: [x, y, h], fov: 56 } in plan
    // coordinates (metres, as in ROOMS) stands the camera at p looking at look, whatever the scroll says.
    // __camKey() then prints that view as a walking key for KEYS. __cam = null gives the page back.
    const dbg = window.__cam;
    if (dbg) {
      const dx = WX(dbg.p[0]) - WX(dbg.look[0]), dy = dbg.p[2] - dbg.look[2], dz = WZ(dbg.p[1]) - WZ(dbg.look[1]), dist = Math.hypot(dx, dy, dz);
      cam.tx = WX(dbg.look[0]); cam.ty = dbg.look[2]; cam.tz = WZ(dbg.look[1]);
      cam.yaw = Math.atan2(dx, dz) * 180 / Math.PI; cam.pitch = Math.asin(dy / dist) * 180 / Math.PI; cam.roll = 0;
      cam.lf = Math.log(dbg.fov || 56); cam.lfr = Math.log(dist * 2 * Math.tan(((dbg.fov || 56) * Math.PI) / 360));
    }
  }
  window.__camKey = () => {
    const d = window.__cam; if (!d) return '';
    const v = new V3(WX(d.look[0]) - WX(d.p[0]), d.look[2] - d.p[2], WZ(d.look[1]) - WZ(d.p[1])).normalize();
    const t = [WX(d.p[0]) + v.x * 2.5, d.p[2] + v.y * 2.5, WZ(d.p[1]) + v.z * 2.5].map((n) => +n.toFixed(2));
    return `t: [${t.join(', ')}], yaw: ${(Math.atan2(-v.x, -v.z) * 180 / Math.PI).toFixed(1)}, pitch: ${(Math.asin(-v.y) * 180 / Math.PI).toFixed(1)}, fov: ${d.fov || 56}, dist: 2.5`;
  };

  /* ---------- the page's small print reads its own ground ------------------------------
     The wordmark, the corner links, the room counter, the ruler, the hint and the room titles lie over a picture
     that goes from white paper to charred larch. Each of them looks at the pixels behind it (one row of them, read
     back without making the GPU wait) and turns to paper over dark ground, or keeps a halo over a mid tone.
     Until iteration 4 two titles were marked "light" by hand, and the corners simply hid over the built plan:
     the outside review kept finding half a nav on the lawn and a wordmark lost in the olive's leaves. */
  const GROUND = [['.mark', 'tl'], ['.corner', 'bl'], ['#count', 'br'], ['#ruler', 'r'], ['#hint', 'b']];
  const gr = { els: null, pbo: null, sync: null, jobs: [], wait: 20, buf: new Uint8Array(0), tone: {}, lum: {} };
  const c01 = (v) => Math.min(1, Math.max(0, v));
  window.__ground = gr;                                    // design aid: __ground.lum is what each piece last read, __ground.tone what it made of it
  function hud(ctx, st) {
    const sD = st.sD, k0 = ctx.K[0], root = document.documentElement;
    if (!gr.els) gr.els = GROUND.map(([q, id]) => ({ el: document.querySelector(q), id })).filter((g) => g.el);
    // The wordmark waits until the hero's own "Lintel · Casa Serra" line has gone (the name read twice), the counter
    // and the ruler until the plan's dimension figures have moved out from under them.
    // While the picture is a plan sheet (the way down to the door, and the living room seen from above) the counter and
    // the ruler step back, and over the living room's plan the wordmark too: they lay on the plan's own lettering.
    // At the end the wordmark and the corner links stay until the closing section rises (the engine took them out as
    // the roll of paper came in).
    const sp = (a, b) => FX.smooth(c01((sD - a) / (b - a))), at = ctx.at, KL = ctx.K[ctx.K.length - 1];
    const lateA = sp(k0.h1 + 12, k0.h1 + 32), descent = 1 - sp(at('approach') - 30, at('approach') + 10);
    const livingPlan = sp(at('rise') - 50, at('rise') - 10) * (1 - sp(at('drop') - 10, at('drop') + 40)), endK = 1 - sp(KL.h0 + 92, KL.h0 + 116);
    gr.els.forEach((g) => {
      if (g.id === 'tl') g.el.style.opacity = String(lateA * (1 - livingPlan) * endK);
      else if (g.id === 'bl') { g.el.style.opacity = String(endK); g.el.style.visibility = endK <= 0 ? 'hidden' : 'visible'; }
      else if (g.id === 'br' || g.id === 'r') { const k = (1 - descent) * (1 - livingPlan); if (k < 1) g.el.style.opacity = String(Math.min(parseFloat(g.el.style.opacity) || 0, k)); }
    });

    const gl = ctx.renderer.getContext(), cv = ctx.renderer.domElement;
    if (gr.sync) {
      const r = gl.clientWaitSync(gr.sync, 0, 0);
      if (r === gl.TIMEOUT_EXPIRED) return;
      gl.deleteSync(gr.sync); gr.sync = null; gr.wait = 7;
      if (r === gl.WAIT_FAILED) return;
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, gr.pbo); gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, gr.buf); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
      const acc = {};
      gr.jobs.forEach((j) => {
        let sum = 0;
        for (let i = 0; i < j.n; i++) { const o = j.o + i * 4; sum += gr.buf[o] * 0.2126 + gr.buf[o + 1] * 0.7152 + gr.buf[o + 2] * 0.0722; }
        const a = acc[j.id] || (acc[j.id] = { sum: 0, n: 0, tag: j.tag });
        a.sum += sum; a.n += j.n;
      });
      Object.keys(acc).forEach((id) => {
        const a = acc[id], lum = a.sum / (a.n * 255), was = gr.tone[id] || '';
        gr.lum[id] = lum;
        const tone = lum < (was === 'd' ? 0.47 : 0.41) ? 'd' : lum > (was === '' ? 0.72 : 0.78) ? '' : 'm';
        if (tone === was) return;
        gr.tone[id] = tone;
        if (a.tag) { [a.tag.el.spot, a.tag.el.tag].forEach((e) => { if (e) e.classList.toggle('spot--light', tone === 'd'); }); return; }
        root.classList.toggle('g-' + id + '-d', tone === 'd'); root.classList.toggle('g-' + id + '-m', tone === 'm');
      });
      return;
    }
    if (gr.wait-- > 0) return;
    const kx = cv.width / innerWidth, ky = cv.height / innerHeight, jobs = [];
    // What is read: five rows across the piece (one column down the ruler), clipped to the screen. One row was not
    // enough: on a phone the entrance's title happened to lie along the ink line of a door head and read as "dark".
    const row = (id, rc, tag) => {
      const L = Math.max(0, rc.left), Rt = Math.min(innerWidth, rc.right), T = Math.max(0, rc.top), Bm = Math.min(innerHeight, rc.bottom);
      if (Rt - L < 4 || Bm - T < 4) return;
      const put = (x, y, w, h) => { x = Math.round(x * kx); y = Math.round(cv.height - y * ky); w = Math.min(cv.width - x, Math.round(w)); h = Math.min(cv.height - y, Math.round(h));
        if (x >= 0 && y >= 0 && w > 0 && h > 0 && w * h < 4096) jobs.push({ id, x0: x, y0: y, w, h, n: w * h, tag }); };
      if (id === 'r') put(Rt - 4, Bm, 1, (Bm - T) * ky);
      else for (let i = 0; i < 5; i++) put(L, T + (Bm - T) * (0.14 + 0.18 * i), (Rt - L) * kx, 1);
    };
    gr.els.forEach((g) => { if (parseFloat(g.el.style.opacity || '1') > 0.02) row(g.id, g.el.getBoundingClientRect()); });
    const live = DOSSIERS.find((d) => { const k = ctx.K[ctx.KEY[d.key]]; return d.el && d.el.tag && sD > k.h0 - 20 && sD < k.h1 + 16; });
    if (live) row('t' + live.no, live.el.tag.getBoundingClientRect(), live);
    if (!jobs.length) { gr.wait = 7; return; }
    let o = 0; jobs.forEach((j) => { j.o = o; o += j.n * 4; });
    if (gr.buf.length < o) gr.buf = new Uint8Array(o);
    if (!gr.pbo) gr.pbo = gl.createBuffer();
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, gr.pbo); gl.bufferData(gl.PIXEL_PACK_BUFFER, gr.buf.length, gl.STREAM_READ);
    jobs.forEach((j) => gl.readPixels(j.x0, j.y0, j.w, j.h, gl.RGBA, gl.UNSIGNED_BYTE, j.o));
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    gr.jobs = jobs; gr.sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); gl.flush();
  }

  function intro(tl, ctx) {
    if (HERO && HERO.draw) return HERO.intro(tl, ctx);
    const lines = document.querySelectorAll('.hero__title .mask > span');
    const q = new URLSearchParams(location.search);
    if (!ctx.reduced && !q.has('at') && q.get('open') !== 'plain') {
      // the words are on the sheet: they are simply there when the roll has passed
      gsap.set(lines, { yPercent: 0 });
      gsap.set('.hero__kicker, .hero__lede, .titleblock', { autoAlpha: 1, y: 0 });
      const root = document.documentElement;
      rollIn.board = document.createElement('div'); rollIn.board.className = 'board'; rollIn.board.setAttribute('aria-hidden', 'true');
      document.body.appendChild(rollIn.board);
      rollIn.on = true; rollIn.k = 0;
      root.classList.add('is-rollin');
      rollIn.done = () => {
        rollIn.done = null;
        rollIn.on = false;
        if (rollIn.board) { rollIn.board.remove(); rollIn.board = null; }
        if (rollEl) { rollEl.style.opacity = 0; rollEl.classList.remove('roll--intro'); }
        root.classList.add('rollin-out'); root.classList.remove('is-rollin');
        setTimeout(() => root.classList.remove('rollin-out'), 1600);
      };
      // (it starts once the loader's last line has gone: half a second earlier that line was still fading on the board
      // while the tube's shadow came in)
      tl.to(rollIn, { k: 1, duration: 3.2, ease: 'power2.inOut' }, 0.8)
        .add(() => { if (rollIn.done) rollIn.done(); }, 4.05);
      return;
    }
    tl.fromTo(lines, { yPercent: 110 }, { yPercent: 0, duration: 1.6, ease: 'expo.out', stagger: 0.12 }, 0.7)
      .fromTo('.hero__kicker, .hero__lede, .titleblock', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 1.4, ease: 'expo.out', stagger: 0.08 }, 1.0);
  }

  // a phone holds the sheet upright: centre the plan under the headline and fit its width
  if (innerWidth / innerHeight < 0.8) {
    KEYS.forEach((k) => { if (k.id === 'hero' || k.id === 'asbuilt') { k.t = [-1.5, 0, -17.5]; k.frame = 80; } });
  }

  FX.experience({
    keys: KEYS,
    dossiers: DOSSIERS,
    hints: { hero: 'Scroll to walk in', first: 'Click the marker to open the file', stop: 'Scroll to the next room' },
    post: { fadeCol: [0.937, 0.922, 0.886], paperCol: [0.937, 0.922, 0.886], inkCol: [0.13, 0.13, 0.14], paperOn: 1, ink: 1, chroma: 0, halation: 0.05, grainPaper: 0 },   // no lens fringe: it drew a red line down a pier and violet ones on the wall tops
    // preMsaa with P.inkAA: ink edges that keep their place inside a pixel, so an outline moves in quarter pixels and not in whole ones (iteration 4).
    // ?ink=old gives the outlines of iteration 3, ?ink=none no outlines at all (to measure what else moves on the sheet).
    postOptions: { preScale: 1.0, preMsaa: new URLSearchParams(location.search).get('ink') === 'old' ? 0 : 4 },
    // full retina resolution, so the plan's hairlines stay crisp (the engine steps down by itself if frames get slow)
    // renderScale 0.5 only parks the engine's automatic step-down: frame() sets the real size from a pixel budget
    options: { scrollScale: 0.85, parallax: 0.6, endFlat: 0, renderScale: 0.5, maxRenderDPR: 2 },
    heroFade: 40,
    labelPadRight: innerWidth > 760 ? 92 : 16,        // a title never runs under the ruler on the right (a phone has no ruler)
    finaleRise: 217,          // the closing section waits until the roll of paper has crossed the sheet (the last rest is 127 vh long)
    build, frame, camera, intro, hud,
    preIntro: HERO ? (ctx) => HERO.preIntro(ctx) : null,
  });
})();
