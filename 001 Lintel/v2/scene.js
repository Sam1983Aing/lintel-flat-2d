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
  const ACCENT = new THREE.Color('#b8452a');
  const OX = 30, OZ = 24;
  const WX = (x) => x - OX, WZ = (y) => y - OZ;

  /* ---------- the house: rooms in plan coordinates ---------------------------
     r: [x0, y0, x1, y1]. h: ceiling height. walls: per side material overrides.
     label: where the room name is written on the plan. */
  const ROOMS = [
    { id: 'media', r: [0, 0, 9, 8], name: 'Media', label: [4.5, 2.6] },
    { id: 'kitchen', r: [9, 0, 25, 8], name: 'Kitchen and dining', floor: 'trav', label: [16.2, 1.7],
      skylights: [[12.9, 4.9, 14.1, 6.1], [14.9, 4.9, 16.1, 6.1], [16.9, 4.9, 18.1, 6.1]] },
    { id: 'wine', r: [25, 0, 29, 8], name: 'Wine', small: true, label: [27, 4.2], floor: 'trav' },
    { id: 'study', r: [29, 0, 38, 8], name: 'Study', label: [33.5, 6.2] },
    { id: 'library', r: [38, 0, 44, 8], name: 'Library', label: [41, 4.4] },
    { id: 'guest1', r: [0, 8, 9, 16], name: 'Guest suite', label: [4.5, 14.2] },
    { id: 'guest2', r: [0, 16, 9, 24], name: 'Guest suite', label: [4.5, 22.2] },
    { id: 'garage', r: [0, 24, 9, 32], name: 'Garage', label: [4.5, 31.1], h: 3.0, floor: 'conc', sub: '3 cars' },
    { id: 'living', r: [9, 8, 21, 17], name: 'Living', label: [15, 15.55], h: 4.5, clerestory: true },
    { id: 'hall', r: [9, 17, 11, 26], name: 'Hall', small: true, label: [10, 21.5], rot: -Math.PI / 2, floor: 'trav' },
    { id: 'entrance', r: [11, 17, 19, 26], name: 'Entrance', label: [14.6, 19.4], h: 4.8, floor: 'trav', walls: { W: 'concreteIn' }, clerestory: true },
    { id: 'wc', r: [19, 17, 21, 26], name: 'WC', small: true, label: [20, 21.5], rot: -Math.PI / 2, floor: 'trav' },
    { id: 'patio', r: [21, 8, 41, 32], name: 'Patio', outdoor: true, label: [31, 10.6] },
    { id: 'gallery', r: [41, 8, 44, 32], name: 'Glass gallery', label: [42.5, 20], rot: -Math.PI / 2, floor: 'trav' },
    { id: 'bedroom', r: [41, 32, 51, 41], name: 'Master bedroom', label: [46, 39.4], walls: { N: 'larch' } },
    { id: 'dressing', r: [51, 32, 59, 35], name: 'Dressing', label: [55, 33.9], sub: false },
    { id: 'bath', r: [51, 35, 59, 41], name: 'Bath', label: [54.8, 36.5], floor: 'trav' },
    { id: 'garden', r: [41, 41, 62, 50], name: 'Private garden', outdoor: true, label: [51.5, 46.4] },
  ];
  const RM = {};
  ROOMS.forEach((r, i) => { r.i = i; r.h = r.h || 3.6; RM[r.id] = r; });
  const NR = ROOMS.length;
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

  /* ---------- the room table every material reads ---------------------------- */
  const RU = {
    uRR: { value: ROOMS.map((r) => new THREE.Vector4(WX(r.r[0]), WZ(r.r[1]), WX(r.r[2]), WZ(r.r[3]))) },
    uRO: { value: ROOMS.map((r) => new THREE.Vector4(WX((r.r[0] + r.r[2]) / 2), 0.5, WZ((r.r[1] + r.r[3]) / 2), 20)) },
    uRV: { value: new Array(NR).fill(0) },
    uXO: { value: new THREE.Vector4(0, 0, 0, 60) },
    uXV: { value: 0 },
    uCutOn: { value: 1 },
    uAccent: { value: ACCENT },
  };
  const ROOM_GLSL = `
    uniform vec4 uRR[${NR}]; uniform vec4 uRO[${NR}]; uniform float uRV[${NR}];
    uniform vec4 uXO; uniform float uXV; uniform float uCutOn; uniform vec3 uAccent;
    void roomOf(vec3 wp, vec3 wn, out float rev, out vec4 org) {
      vec2 q = wp.xz + wn.xz * 0.06;
      rev = uXV; org = uXO;
      for (int i = 0; i < ${NR}; i++) {
        vec4 r = uRR[i];
        if (q.x > r.x && q.x < r.z && q.y > r.y && q.y < r.w) { rev = uRV[i]; org = uRO[i]; break; }
      }
    }
    float revealAt(vec3 wp, float rev, vec4 org, out float ring) {
      float dA = distance(wp, org.xyz);
      float front = rev * org.w;
      float soft = 0.03 + org.w * 0.002;
      ring = (1.0 - smoothstep(0.0, max(fwidth(dA) * 1.6, 0.012), abs(dA - front))) * step(0.001, rev) * step(rev, 0.998);
      return rev >= 0.999 ? 1.0 : 1.0 - smoothstep(front - soft, front + soft, dA);
    }`;

  /* ---------- drawable: any standard material, paper until its room arrives -- */
  const HATCH = { none: 0, concrete: 1, stone: 2, timber: 3, glass: 4, water: 5, gravel: 7 };
  function drawable(mat, hatch, opts) {
    opts = opts || {};
    const h = HATCH[hatch] || 0;
    const force = opts.room == null ? -1 : opts.room === 'ext' ? -2 : RM[opts.room].i;
    mat.side = opts.side == null ? THREE.DoubleSide : opts.side;
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, RU);
      sh.uniforms.uGlassOp = { value: opts.glassOpacity || 0.3 };
      sh.uniforms.uSat = { value: opts.sat == null ? 1 : opts.sat };
      sh.uniforms.uMacro = { value: opts.macro || 0 };
      sh.vertexShader = 'varying vec3 vDrawW;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
        vec4 dwp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          dwp = instanceMatrix * dwp;
        #endif
        vDrawW = (modelMatrix * dwp).xyz;`);
      sh.fragmentShader = `
        #define HATCH ${h}
        ${force >= 0 ? `#define FORCE_ROOM ${force}` : ''}
        ${force === -2 ? '#define FORCE_EXT' : ''}
        ${opts.glass ? '#define GLASS' : ''}
        ${opts.noCap ? '#define NO_CAP' : ''}
        varying vec3 vDrawW;
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
          float w = max(fwidth(c), 1e-4) * width;
          return 1.0 - smoothstep(w * 0.5, w * 1.5, f);
        }
        float hatchOf(vec3 wp, vec3 wn) {
          bool horiz = abs(wn.y) > 0.7;
          vec2 q = horiz ? wp.xz : vec2(abs(wn.x) > abs(wn.z) ? wp.z : wp.x, wp.y);
          #if HATCH == 1
            vec2 cell = (fract((q + vec2(0.3, 0.3)) / 0.6) - 0.5) * 0.6;
            float r = max(0.018, max(fwidth(q.x), fwidth(q.y)) * 0.9);
            float ties = 1.0 - smoothstep(r * 0.7, r * 1.3, length(cell));
            return horiz ? 0.0 : ties * 0.8;
          #elif HATCH == 2
            float a = lineAA(q.y, 0.6, 1.0);
            float b = lineAA(q.x + step(0.5, fract(q.y / 1.2)) * 0.6, 1.2, 1.0);
            return horiz ? max(lineAA(q.x, 1.2, 1.0), lineAA(q.y, 0.6, 1.0)) * 0.28 : max(a, b) * 0.5;
          #elif HATCH == 3
            return horiz ? 0.0 : lineAA(q.x, 0.16, 1.0) * 0.6;
          #elif HATCH == 4
            float d = q.x - q.y * 0.85;
            return clamp(lineAA(d, 2.4, 1.2) + lineAA(d + 0.3, 2.4, 1.0), 0.0, 1.0) * 0.55;
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
        ${opts.alphaMip ? `{ vec2 tx = vMapUv * ${opts.alphaMip.toFixed(1)}; float lod = max(0.0, 0.5 * log2(max(dot(dFdx(tx), dFdx(tx)), dot(dFdy(tx), dFdy(tx)))));
          diffuseColor.a *= 1.0 + lod * 0.3; }` : ''}
        diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114))), diffuseColor.rgb, uSat);
        diffuseColor.rgb *= 1.0 + uMacro * ((vn(vDrawW * 0.35) - 0.5) * 0.9 + (vn(vDrawW * 1.7) - 0.5) * 0.35);`).replace('#include <dithering_fragment>', `#include <dithering_fragment>
        {
          vec3 wn = normalize((vec4(vNormal, 0.0) * viewMatrix).xyz);
          float rev; vec4 org;
          #if defined(FORCE_ROOM)
            rev = uRV[FORCE_ROOM]; org = uRO[FORCE_ROOM];
          #elif defined(FORCE_EXT)
            rev = uXV; org = uXO;
          #else
            roomOf(vDrawW, wn, rev, org);
          #endif
          float ring;
          float paper = 1.0 - revealAt(vDrawW, rev, org, ring);
          float full = step(0.999, paper);
          float hatch = hatchOf(vDrawW, wn);
          vec3 lit = gl_FragColor.rgb;
          #ifdef GLASS
            float op = mix(uGlassOp, 1.0, paper);
            vec3 col = mix(lit, vec3(hatch), full);
            col = mix(col, uAccent * 3.0, ring);
            gl_FragColor = vec4(col * op, op);
          #else
            vec3 col = mix(lit, vec3(hatch), full);
            col = mix(col, uAccent * 3.0, ring);
            gl_FragColor = vec4(col, paper * (1.0 - ring));
          #endif
          #if defined(DOUBLE_SIDED) && !defined(NO_CAP)
            // the cut: looking into a sliced wall shows its inside, drawn as solid ink
            if (!gl_FrontFacing && uCutOn > 0.5) gl_FragColor = vec4(1.0);
          #endif
        }`);
    };
    mat.customProgramCacheKey = () => `lintel-${h}-${force}-${opts.glass ? 1 : 0}-${opts.noCap ? 1 : 0}-${opts.alphaMip || 0}-${mat.map ? 1 : 0}-${mat.side}`;
    return mat;
  }

  /* ---------- camera keys ----------------------------------------------------
     hero: a 3 degree lens from 1.2 km straight up, which is a plan. lens: the
     lens widens while still looking down, so the walls rise into depth. door:
     eye level (1.6 m) in front of the pivot door, looking slightly up. */
  const KEYS = [
    { id: 'hero', t: [-17, 0, -3.1], yaw: 0, pitch: 89.4, fov: 3, frame: 66, hold: 40, go: 150 },
    { id: 'lens', t: [-14.75, 0, -4], yaw: 0, pitch: 64, fov: 36, dist: 46, go: 130 },
    { id: 'door', t: [-14.75, 2.2, -2.5], yaw: 0, pitch: -3, fov: 50, dist: 11.5, hold: 90, go: 110 },
    { id: 'hall', t: [-14.75, 1.9, -9.6], yaw: 0, pitch: -2, fov: 60, dist: 9.8, hold: 100, go: 140 },
    // the roof lifts off, the camera rises and narrows back to a plan of the living room
    { id: 'rise', t: [-15, 0, -16], yaw: 0, pitch: 62, fov: 30, dist: 20, go: 120 },
    { id: 'livingTop', t: [-15, 0, -11.6], yaw: 0, pitch: 89.4, fov: 4, frame: 13.5, hold: 90, go: 120 },
    // then drops into it, and turns toward the fireplace and the low sun
    { id: 'drop', t: [-16, 0.5, -15], yaw: 40, pitch: 50, fov: 44, dist: 11, go: 110 },
    { id: 'living', t: [-17.5, 1.25, -13], yaw: 54.3, pitch: 2.3, fov: 58, dist: 8.75, hold: 110, go: 100 },
    // through the wide opening, already turning toward the island
    { id: 'pass', t: [-16.71, 1.556, -16.57], yaw: 62, pitch: 1, fov: 58, dist: 2.5, go: 100 },
    // the far end of the table, looking back along it into the light of the roof lights
    { id: 'dining', t: [-9.82, 1.487, -18.04], yaw: 75.2, pitch: 2.6, fov: 52, dist: 2.5, hold: 100, go: 110 },
    // out through the sliding door: the sky arrives. From here on the target sits 2.5 m
    // in front of the camera, so the path follows the targets and turning only turns the view.
    { id: 'slide', t: [-6.15, 1.58, -13.6], yaw: 180, pitch: 0.6, fov: 56, dist: 2, go: 90 },
    { id: 'patio', t: [-3.7, 1.76, -9.57], yaw: 222.8, pitch: -3.6, fov: 54, dist: 2.5, hold: 110, go: 120 },
    // round the north side of the olive, to look back at it against the sun
    { id: 'olive', t: [2.85, 2.04, -6.74], yaw: 110.1, pitch: -10.2, fov: 58, dist: 2.5, hold: 100, go: 120 },
    { id: 'turn', t: [10.7, 1.58, -12.0], yaw: -90, pitch: 0.5, fov: 56, dist: 2.5, go: 90 },
    // the gallery: twenty metres straight down Z
    { id: 'gallery', t: [12.4, 1.58, -10.5], yaw: -180, pitch: 0.4, fov: 46, dist: 2.5, hold: 90, go: 200 },
    { id: 'galleryEnd', t: [12.4, 1.55, 6.9], yaw: -180, pitch: 1, fov: 54, dist: 2.5, hold: 90, go: 90 },
    // the master suite: in at the corner, round to the bed and the charred larch
    { id: 'bedIn', t: [15.35, 1.58, 13.86], yaw: -110, pitch: 0.5, fov: 56, dist: 2.5, go: 90 },
    { id: 'bedroom', t: [18.3, 1.47, 13.26], yaw: 31.3, pitch: 3, fov: 56, dist: 2.5, hold: 100, go: 90 },
    // through the dressing room to the bath
    { id: 'dressDoor', t: [22.5, 1.58, 9.5], yaw: -90, pitch: 0.5, fov: 58, dist: 2.5, go: 80 },
    { id: 'dress', t: [25.45, 1.58, 11.67], yaw: -150, pitch: 2, fov: 58, dist: 2.5, go: 80 },
    { id: 'bath', t: [26.55, 1.34, 14.81], yaw: -195, pitch: 6, fov: 56, dist: 2.5, hold: 90, go: 110 },
    // out onto the lawn: the valley, then the sea
    { id: 'garden', t: [25.95, 1.64, 23.55], yaw: -200, pitch: -1, fov: 56, dist: 2.5, hold: 110, go: 150 },
    // and up, turning, back to the plan we started on, now built
    { id: 'lift', t: [21.5, 0, 21.5], yaw: -280, pitch: 60, fov: 30, dist: 40, go: 150 },
    { id: 'asbuilt', t: [-17, 0, -3.1], yaw: -360, pitch: 89.4, fov: 3, frame: 66, hold: 90 },
  ];

  const DOSSIERS = [
    {
      no: '01', kicker: 'Room', key: 'hall', anchor: 'entrance', title: ['The', 'entrance'],
      meta: '8.00 × 9.00 m <b>·</b> 72 m² <b>·</b> ceiling 4.80 <b>·</b> open file +',
      label: { type: 'camera', tilt: 0, off: [0.35, 0.15] },
      fileMeta: 'Casa Serra · entrance · A-101',
      text: 'The door is a single leaf of oak, 2.4 metres wide and as tall as a room. It turns on a pivot, so it opens with one finger. Above the neighbouring rooms the walls give way to a band of glass, and at five in the afternoon the sun draws a line across the east wall.',
      facts: [['Door', 'Oak pivot, 2.4 × 4.2 m'], ['Floor', 'Honed travertine, 1200 × 600'], ['West wall', 'Board-marked concrete'], ['Ceiling', '4.80 m, clerestory on three sides']],
    },
    {
      no: '02', kicker: 'Room', key: 'living', anchor: 'living', title: ['The', 'living room'],
      meta: '12.00 × 9.00 m <b>·</b> 108 m² <b>·</b> ceiling 4.50 <b>·</b> open file +',
      label: { type: 'camera', tilt: 0, off: [0.3, 0.25] },
      fileMeta: 'Casa Serra · living · A-101',
      text: 'A room you step down into. The lounge sits 45 centimetres below the oak floor, the fireplace is one block of board-marked concrete, and a band of glass under the ceiling lets the late sun cut across the whole room.',
      facts: [['Floor', 'Oiled oak, 220 mm boards'], ['Lounge', '6.00 × 4.50 m, sunk 450 mm'], ['Fireplace', 'Board-marked concrete'], ['Glazing', '4.50 m, sliding onto the patio']],
    },
    {
      no: '03', kicker: 'Room', key: 'dining', anchor: 'kitchen', title: ['Kitchen', 'and dining'],
      meta: '16.00 × 8.00 m <b>·</b> 128 m² <b>·</b> a table for 14 <b>·</b> open file +',
      label: { type: 'camera', tilt: 0, off: [-0.2, 0.5] },
      fileMeta: 'Casa Serra · kitchen and dining · A-101',
      text: 'One room for cooking and for long lunches. A five metre island in honed travertine, an oak table for fourteen, and three roof lights that put the sun on the table at five in the afternoon.',
      facts: [['Island', 'Travertine, 5.00 × 1.20 m'], ['Table', 'Oak, 6.00 m, seats 14'], ['Roof lights', 'Three, 1.20 m square'], ['Wine room', 'Behind glass, 1,400 bottles']],
    },
    {
      no: '04', kicker: 'Courtyard', key: 'olive', anchor: 'olive', title: ['The', 'olive patio'],
      meta: '20.00 × 24.00 m <b>·</b> an olive from c. 1890 <b>·</b> open file +',
      label: { type: 'camera', tilt: 0, off: [0.6, -0.4] },
      fileMeta: 'Casa Serra · patio · A-101',
      text: 'The house was drawn around one tree. The olive was here a century before us, so the patio is the size of its shade at five in the afternoon, and the pool runs along the south side to hold its reflection.',
      facts: [['Olive', 'Olea europaea, c. 1890'], ['Paving', 'Travertine, unfilled'], ['Pool', '18.00 × 3.00 m, overflow edge'], ['Light', 'West south west, late afternoon']],
    },
    {
      no: '05', kicker: 'Room', key: 'gallery', anchor: 'gallery', title: ['The', 'glass gallery'],
      meta: '3.00 × 24.00 m <b>·</b> 72 m² <b>·</b> open file +',
      label: { type: 'camera', tilt: 0, off: [0.2, 0.2] },
      fileMeta: 'Casa Serra · gallery · A-101',
      text: 'Twenty four metres of glass on one side and a wall for paintings on the other. In the late afternoon every mullion draws a line across the floor and up the canvases, and the walk to the bedroom takes as long as the light allows.',
      facts: [['Glazing', 'Floor to ceiling, bronze frames'], ['Length', '24.00 m'], ['Floor', 'Travertine'], ['Wall', 'Lime plaster, for hanging art']],
    },
    {
      no: '06', kicker: 'Room', key: 'bedroom', anchor: 'bedroom', title: ['The', 'master suite'],
      meta: '10.00 × 9.00 m <b>·</b> 162 m² with dressing and bath <b>·</b> open file +',
      label: { type: 'camera', tilt: 0, off: [0.3, 0.3] },
      fileMeta: 'Casa Serra · master suite · A-101',
      text: 'A wall of charred larch behind the bed, the garden at its foot and the low sun from the west. Through the dressing room, a bath sunk into the stone floor, level with the lawn outside.',
      facts: [['Bedroom', '10.00 × 9.00 m'], ['Wall', 'Charred larch, burnt on site'], ['Bath', 'Sunk stone, 3.60 × 1.80 m'], ['Dressing', 'Walk through, oak']],
    },
    {
      no: '07', kicker: 'Garden', key: 'garden', anchor: 'garden', title: ['The', 'private garden'],
      meta: '21.00 × 9.00 m <b>·</b> the valley, then the sea <b>·</b> open file +',
      label: { type: 'camera', tilt: 0, off: [-1.6, 0.6] },
      fileMeta: 'Casa Serra · garden · A-101',
      text: 'The walk ends outside. A lawn, a low wall and nothing between you and the valley. On a clear evening you can see the Atlantic from here, and the sun goes down a little to the right of the old olive.',
      facts: [['Lawn', '21.00 × 9.00 m'], ['Wall', 'Board-marked concrete, 450 mm'], ['View', 'South west, to the Atlantic'], ['Sunset, 21 June', '21:05']],
    },
  ];

  /* ---------- the plan drawing: one big ink texture lying on the ground ------ */
  const SX0 = -12, SY0 = -12, SIZE = 84, TPX = 4096, S = TPX / SIZE;
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

    // room names, areas and sizes
    ROOMS.forEach((r) => {
      const [x0, y0, x1, y1] = r.r;
      const w = x1 - x0, d = y1 - y0;
      const [lx, ly] = r.label;
      if (r.small) { txt(r.name.toUpperCase(), lx, ly, 0.5, { rot: r.rot }); return; }
      txt(r.name.toUpperCase(), lx, ly, 0.78, { rot: r.rot });
      if (r.sub === false) return;
      const sub = r.sub || `${w * d} m²   ${w.toFixed(2)} × ${d.toFixed(2)}`;
      txt(sub, lx, ly, 0.46, { rot: r.rot, w: 400, dy: 0.95 * S, ls: 0.06 });
    });

    // dimension strings
    metres();
    g.lineWidth = 0.055;
    const tick = (x, y) => { g.beginPath(); g.moveTo(x - 0.28, y + 0.28); g.lineTo(x + 0.28, y - 0.28); g.stroke(); };
    const dimH = (y, xs, ext) => {
      g.beginPath(); g.moveTo(xs[0] - 0.6, y); g.lineTo(xs[xs.length - 1] + 0.6, y); g.stroke();
      xs.forEach((x) => { tick(x, y); g.beginPath(); g.moveTo(x, y - 0.5); g.lineTo(x, y + (ext || 0.5)); g.stroke(); });
      for (let i = 0; i < xs.length - 1; i++) txt((xs[i + 1] - xs[i]).toFixed(2), (xs[i] + xs[i + 1]) / 2, y - 0.62, 0.5, { w: 400, ls: 0.04 });
      metres();
    };
    const dimV = (x, ys, ext) => {
      g.beginPath(); g.moveTo(x, ys[0] - 0.6); g.lineTo(x, ys[ys.length - 1] + 0.6); g.stroke();
      ys.forEach((y) => { tick(x, y); g.beginPath(); g.moveTo(x - 0.5, y); g.lineTo(x + (ext || 0.5), y); g.stroke(); });
      for (let i = 0; i < ys.length - 1; i++) txt((ys[i + 1] - ys[i]).toFixed(2), x - 0.62, (ys[i] + ys[i + 1]) / 2, 0.5, { w: 400, ls: 0.04, rot: -Math.PI / 2 });
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

    // the canopy over the entrance and the roof lights, above the cut, so dashed
    metres();
    g.lineWidth = 0.05; g.setLineDash([0.4, 0.25]);
    g.strokeRect(11, 26, 8, 3.5);
    RM.kitchen.skylights.forEach((q) => g.strokeRect(q[0], q[1], q[2] - q[0], q[3] - q[1]));
    g.setLineDash([]);

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
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }
  // returns leaf card matrices; adds wood to the batch
  function olive(Bt, bark, x, y, s, seed, cardsWanted, base) {
    const R = FX.rng(seed), o = new V3(WX(x), base || 0, WZ(y)), up = new V3(0, 1, 0);
    const ends = [];
    const stems = 3;
    for (let k = 0; k < stems; k++) {
      const a = (k / stems) * Math.PI * 2 + R() * 0.8, d = new V3(Math.cos(a), 0, Math.sin(a));
      const p0 = o.clone().addScaledVector(d, 0.18 * s);
      const p1 = p0.clone().addScaledVector(d, 0.25 * s).addScaledVector(up, 0.7 * s).add(new V3(R() - 0.5, 0, R() - 0.5).multiplyScalar(0.25 * s));
      const p2 = p1.clone().addScaledVector(d, 0.35 * s).addScaledVector(up, 0.8 * s).add(new V3(R() - 0.5, 0, R() - 0.5).multiplyScalar(0.3 * s));
      const p3 = p2.clone().addScaledVector(d, 0.3 * s).addScaledVector(up, 0.55 * s);
      Bt.add(bark, tubeGeo([o.clone().add(new V3(0, -0.1, 0)), p0, p1, p2, p3], 0.34 * s, 0.13 * s, 18, 12, 0.32, seed + k));
      const nb = 2 + (R() < 0.5 ? 1 : 0);
      for (let b = 0; b < nb; b++) {
        const ba = a + (b - (nb - 1) / 2) * 0.9 + (R() - 0.5) * 0.4, bd = new V3(Math.cos(ba), 0, Math.sin(ba));
        const q1 = p3.clone().addScaledVector(bd, 0.6 * s).addScaledVector(up, 0.5 * s);
        const q2 = q1.clone().addScaledVector(bd, (0.7 + R() * 0.5) * s).addScaledVector(up, (0.35 + R() * 0.4) * s);
        Bt.add(bark, tubeGeo([p3.clone(), q1, q2], 0.12 * s, 0.035 * s, 10, 8, 0.2, seed + k * 7 + b));
        ends.push(q2);
      }
    }
    const M4 = [], q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new V3(), pp = new V3();
    const per = Math.max(1, Math.round(cardsWanted / ends.length));
    ends.forEach((c) => {
      for (let i = 0; i < per; i++) {
        let vx, vy, vz;
        do { vx = R() * 2 - 1; vy = R() * 2 - 1; vz = R() * 2 - 1; } while (vx * vx + vy * vy + vz * vz > 1);
        pp.set(c.x + vx * 1.25 * s, c.y + vy * 0.7 * s + 0.15 * s, c.z + vz * 1.25 * s);
        e.set(R() * 6.28, R() * 6.28, R() * 6.28); q.setFromEuler(e);
        const k = (0.75 + R() * 0.6) * s;
        M4.push(new THREE.Matrix4().compose(pp.clone(), q.clone(), sc.set(k, k, k).clone()));
      }
    });
    return M4;
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
    const fall = 240 * (1 - Math.exp(-sy / 230)) + 22 * (FX.noise3(x * 0.006, 7, y * 0.006) - 0.4) * FX.smooth(sy / 150);
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
      if (hole && x > hole[0] && x < hole[2] && y > hole[1] && y < hole[3]) h = Math.min(h, -3);
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
  let pivot = null, annMat = null, sunLight = null, fireLight = null, skyMat = null;
  const panes = {};
  const roofMeshes = [];
  const LATE = ['library', 'study', 'media', 'guest1', 'guest2', 'garage', 'hall', 'wc'];
  const dims = {};
  const dustSets = {};
  const RES = { value: new THREE.Vector2(800, 450) };

  async function build(ctx) {
    const { scene, renderer, loader } = ctx;
    renderer.setClearColor(0x000000, 1);                   // alpha 1 = paper, rgb 0 = no hatch
    renderer.clippingPlanes = [cutPlane];
    if (document.fonts) await Promise.all(['500 40px "Geist Mono"', '400 40px "Geist Mono"'].map((f) => document.fonts.load(f).catch(() => null)));

    // late afternoon sun from the south west
    const sk = await loader.sky(SKY + 'qwantani_late_afternoon_puresky_1k.hdr', SKY + 'qwantani_late_afternoon_puresky.jpg', { sunAzimuth: Math.atan2(0.37, -0.93) });
    scene.environment = sk.env;

    const leafTex = FX.canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#34402a'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 4200; i++) {
        const x = Math.random() * w, y = Math.random() * h, sz = 3 + Math.random() * 7;
        g.fillStyle = ['#283222', '#46553a', '#5b6b47', '#2f3a26', '#6f7d55'][(Math.random() * 5) | 0];
        g.beginPath(); g.ellipse(x, y, sz, sz * 0.45, Math.random() * 3, 0, 6.28); g.fill();
      }
    }, { repeat: true });
    const [conc, trav, plaster, oak, gravel, linen, grass, wool, barkSet, planks] = await Promise.all([
      loader.set(TEX + 'wood_textured_concrete'), loader.set(TEX + 'marble_01'), loader.set(TEX + 'white_stucco'),
      loader.set(TEX + 'oak_wood_planks'), loader.set(TEX + 'gravel_floor_02'), loader.set(TEX + 'rough_linen'), loader.set(TEX + 'withered_grass'),
      loader.set(TEX + 'poly_wool_herringbone'), loader.set(TEX + 'pine_bark'), loader.set(TEX + 'black_painted_planks'),
    ]);
    const plain = (o) => new THREE.MeshStandardMaterial(o);
    const M = {
      // this scan averages a quarter of the stucco's brightness, so it is lifted in linear colour
      concrete: drawable(FX.pbr(conc, { size: 1.8, color: new THREE.Color().setRGB(1.5, 1.52, 1.52), normal: 1.3, env: 0.7, rotate: Math.PI / 2 }), 'concrete', { sat: 0.25, macro: 0.5 }),
      concreteIn: drawable(FX.pbr(conc, { size: 1.8, color: new THREE.Color().setRGB(2.3, 2.28, 2.2), normal: 1.2, env: 0.6, rotate: Math.PI / 2 }), 'concrete', { sat: 0.3, macro: 0.35 }),
      plaster: drawable(FX.pbr(plaster, { size: 2.4, color: 0xfbf8f2, env: 0.62, normal: 0.8 }), 'none', { sat: 0.5, macro: 0.06 }),
      ceiling: drawable(FX.pbr(plaster, { size: 2.4, color: new THREE.Color().setRGB(1.85, 1.78, 1.68), env: 0.75, normal: 0.6 }), 'none', { sat: 0.5 }),
      trav: drawable(FX.pbr(trav, { size: 2.4, color: 0xfff8ee, env: 0.5, normal: 0.6, roughness: 1 }), 'stone', { sat: 0.8, macro: 0.1 }),
      travBlock: drawable(FX.pbr(trav, { size: 1.8, color: 0xfbf3e8, env: 0.55, normal: 0.6 }), 'none', { sat: 0.8, macro: 0.08 }),
      oak: drawable(FX.pbr(oak, { size: 1.4, color: new THREE.Color().setRGB(1.12, 1.02, 0.92), env: 0.55 }), 'none', { sat: 0.55 }),
      oakDoor: drawable(FX.pbr(oak, { size: 1.3, color: new THREE.Color().setRGB(1.25, 1.08, 0.9), env: 1.1, rotate: Math.PI / 2 }), 'timber', { room: 'entrance', sat: 0.55 }),
      glassSky: drawable(plain({ color: 0x0b0f11, metalness: 0, roughness: 0.04, envMapIntensity: 1.6, transparent: true, depthWrite: false }), 'glass', { glass: true, glassOpacity: 0.26, room: 'ext' }),
      conc: drawable(FX.pbr(conc, { size: 2.2, color: 0xc9cbcb, env: 0.5 }), 'none', { sat: 0.3 }),
      fabric: drawable(FX.pbr(linen, { size: 0.8, color: new THREE.Color().setRGB(1.95, 1.78, 1.52), env: 0.3 }), 'none', { sat: 0 }),
      dark: drawable(plain({ color: 0x2b2724, roughness: 0.55, envMapIntensity: 0.6 }), 'none'),
      car: drawable(plain({ color: 0x1b1e21, metalness: 0.6, roughness: 0.3 }), 'none'),
      bronze: drawable(plain({ color: 0x4a3626, metalness: 0.85, roughness: 0.38, envMapIntensity: 1.1 }), 'none'),
      glass: drawable(plain({ color: 0x0b0f11, metalness: 0, roughness: 0.04, envMapIntensity: 1.6, transparent: true, depthWrite: false }), 'glass', { glass: true, glassOpacity: 0.26 }),
      water: drawable(plain({ color: 0x0a1c1f, metalness: 0, roughness: 0.06, envMapIntensity: 0.9 }), 'water', { side: THREE.FrontSide }),
      fire: drawable(plain({ color: 0x000000, emissive: 0xff7a2e, emissiveIntensity: 0, roughness: 1 }), 'none'),
      roof: drawable(FX.pbr(plaster, { size: 2.4, color: new THREE.Color().setRGB(1.85, 1.78, 1.68), env: 0.75, normal: 0.6 }), 'none', { sat: 0.5 }),
      larch: drawable(FX.pbr(planks, { size: 1.6, color: 0xb9b5b0, env: 0.7, normal: 1.4 }), 'timber'),
      lawn: drawable(FX.pbr(grass, { size: 1.4, color: new THREE.Color().setRGB(0.62, 0.78, 0.4), env: 0.5 }), 'none', { sat: 0.9, macro: 0.4, side: THREE.FrontSide }),
      glassMirror: drawable(plain({ color: 0xcfd2d2, metalness: 1, roughness: 0.03, envMapIntensity: 1 }), 'none'),
      rug: drawable(FX.pbr(linen, { size: 0.5, color: new THREE.Color().setRGB(0.98, 0.9, 0.78), env: 0.4, normal: 1.6 }), 'none', { sat: 0 }),
      leaf: drawable(new THREE.MeshStandardMaterial({ map: leafTex, roughness: 0.9, envMapIntensity: 0.5 }), 'none'),
      gravel: drawable(FX.pbr(gravel, { size: 2, color: new THREE.Color().setRGB(1.25, 1.18, 1.05), env: 0.6 }), 'gravel', { sat: 0.5, macro: 0.3, side: THREE.FrontSide }),
      ground: drawable(FX.pbr(grass, { size: 2.4, color: 0xc7c2a8, env: 0.5 }), 'none', { sat: 0.6, macro: 0.6, side: THREE.FrontSide }),
    };
    [M.glass, M.glassSky].forEach((g) => Object.assign(g, { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor }));
    M.gravel.polygonOffset = true; M.gravel.polygonOffsetFactor = -1; M.gravel.polygonOffsetUnits = -2;

    const house = new THREE.Group();
    scene.add(house);
    const B = new FX.Batch();
    const colliders = [];
    // a box from plan rect x0..x1, y0..y1 and height z0..z1
    const boxP = (mat, x0, y0, x1, y1, z0, z1, r, coll) => {
      B.add(mat, FX.bevelBox(x1 - x0, z1 - z0, y1 - y0, r == null ? 0.01 : r), FX.M(WX((x0 + x1) / 2), (z0 + z1) / 2, WZ((y0 + y1) / 2)));
      if (coll) colliders.push({ id: coll, box: new THREE.Box3(new V3(WX(x0), z0, WZ(y0)), new V3(WX(x1), z1, WZ(y1))) });
    };
    // the same, but for a box along a wall line: u along the line, w across it
    const boxL = (axis, c, u0, u1, w0, w1, z0, z1, mat, coll) => {
      if (u1 - u0 < 0.005 || z1 - z0 < 0.005) return;
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
    const glassRun = (axis, c, u0, u1, z0, z1, T, pane) => {
      boxL(axis, c, u0, u1, -0.015, 0.015, z0 + 0.05, z1 - 0.05, pane || M.glass);
      boxL(axis, c, u0, u1, -T * 0.3, T * 0.3, z0, z0 + 0.05, M.bronze);
      boxL(axis, c, u0, u1, -T * 0.3, T * 0.3, z1 - 0.05, z1, M.bronze);
      const n = Math.max(1, Math.ceil((u1 - u0) / 2.2));
      for (let i = 0; i <= n; i++) {
        const u = u0 + ((u1 - u0) * i) / n;
        boxL(axis, c, Math.max(u0, u - 0.03), Math.min(u1, u + 0.03), -T * 0.3, T * 0.3, z0, z1, M.bronze);
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
        paneCache[key] = drawable(plain({ color: 0x0b0f11, metalness: 0, roughness: 0.04, envMapIntensity: 1.6, transparent: true, depthWrite: false }),
          'glass', { glass: true, glassOpacity: 0.26, room: key });
        Object.assign(paneCache[key], { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor,
          blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor });
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
        solids.forEach(([u0, u1]) => {
          const open0 = cuts.some((k) => Math.abs(k[1] - u0) < 1e-6), open1 = cuts.some((k) => Math.abs(k[0] - u1) < 1e-6);
          const x0 = open0 ? 0 : Math.max(0, crossing(axis, u0, c) / 2 - 0.003);
          const x1 = open1 ? 0 : Math.max(0, crossing(axis, u1, c) / 2 - 0.003);
          boxL(axis, c, u0 - x0, u1 + x1, 0, T / 2, 0, top, wallMat(e.p, axis, 1), 'wall');
          boxL(axis, c, u0 - x0, u1 + x1, -T / 2, 0, 0, top, wallMat(e.n, axis, -1), 'wall');
        });
        // above the lower roof: concrete, or a band of clerestory glass
        if (e.p && e.n && Math.abs(e.p.h - e.n.h) > 0.01) {
          const high = e.p.h > e.n.h ? e.p : e.n, hs = high === e.p ? 1 : -1, lo = top, hi = high.h + ROOF;
          if (high.clerestory) {
            glassRun(axis, c, a + 0.15, b - 0.15, lo, high.h, T, M.glassSky);
            boxL(axis, c, a, a + 0.15, -T / 2, T / 2, lo, high.h, M.concrete);
            boxL(axis, c, b - 0.15, b, -T / 2, T / 2, lo, high.h, M.concrete);
            boxL(axis, c, a, b, -T / 2, T / 2, high.h, hi, M.concrete);
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
          boxL(axis, c, u0, u1, 0, T / 2, head, top, wallMat(e.p, axis, 1));
          boxL(axis, c, u0, u1, -T / 2, 0, head, top, wallMat(e.n, axis, -1));
          if (o.type === 'glass') glassRun(axis, c, u0, u1, 0, head, T, paneFor(e, axis, c, (u0 + u1) / 2));
          if (o.type === 'door') doorLeaves.push({ o, T, head: Math.min(head, 3.0) });
          if (o.type === 'pivot') o.T = T;
        });
      });
    });

    // interior doors, standing open at 90 degrees
    doorLeaves.forEach(({ o, T }) => {
      const room = RM[o.into], along = o.axis === 'h';
      const side = along ? (room.r[1] >= o.c ? 1 : -1) : (room.r[0] >= o.c ? 1 : -1);
      const hinge = o.hinge === 'a' ? o.a : o.b, w = o.b - o.a - 0.02;
      const h0 = T / 2, h1 = T / 2 + w;
      const u0 = o.hinge === 'a' ? hinge + 0.01 : hinge - 0.06, u1 = u0 + 0.05;
      if (along) boxP(M.oak, u0, side > 0 ? o.c + h0 : o.c - h1, u1, side > 0 ? o.c + h1 : o.c - h0, 0, 2.95, 0.01);
      else boxP(M.oak, side > 0 ? o.c + h0 : o.c - h1, u0, side > 0 ? o.c + h1 : o.c - h0, u1, 0, 2.95, 0.01);
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
      const pull = new THREE.Mesh(FX.bevelBox(0.04, 1.6, 0.06, 0.01), M.bronze);
      pull.position.set(o.b - 0.3 - o.pivot, 1.3, 0.08);
      pivot.add(pull);
    }

    /* floors, roofs and the canopy ------------------------------------------- */
    const floorMat = (r) => ({ trav: M.trav, conc: M.conc }[r.floor] || M.oak);
    ROOMS.filter((r) => !r.outdoor).forEach((r) => {
      const [x0, y0, x1, y1] = r.r;
      if (r.id !== 'living' && r.id !== 'bath') boxP(floorMat(r), x0, y0, x1, y1, -0.3, 0, 0.005);
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
    [[9, 8, 21, 10.5], [9, 15, 21, 17], [9, 10.5, 12, 15], [18, 10.5, 21, 15]].forEach((q) => boxP(M.oak, q[0], q[1], q[2], q[3], -0.8, 0, 0.005));
    boxP(M.oak, pit[0], pit[1], pit[2], pit[3], -0.8, -0.45, 0.005);
    // bath: a tub sunk into the stone floor
    const tub = [53, 37.6, 56.6, 39.4];
    [[51, 35, 59, 37.6], [51, 39.4, 59, 41], [51, 37.6, 53, 39.4], [56.6, 37.6, 59, 39.4]].forEach((q) => boxP(M.trav, q[0], q[1], q[2], q[3], -0.8, 0, 0.005));
    boxP(M.travBlock, tub[0], tub[1], tub[2], tub[3], -0.8, -0.58, 0.005);
    {
      const bw = new THREE.Mesh(FX.plane(tub[2] - tub[0] - 0.02, tub[3] - tub[1] - 0.02), M.water);
      bw.rotation.x = -Math.PI / 2; bw.position.set(WX((tub[0] + tub[2]) / 2), -0.12, WZ((tub[1] + tub[3]) / 2));
      bw.receiveShadow = true; house.add(bw);
    }
    boxP(M.concrete, 11, 26, 19, 29.5, 4.85, 5.15, 0.01, 'canopy');

    /* outside: patio, pool, garden, forecourt ---------------------------------- */
    const pool = [22.5, 27, 40.5, 30];
    [[21, 8, 41, 27], [21, 30, 41, 32], [21, 27, 22.5, 30], [40.5, 27, 41, 30]].forEach((q) => boxP(M.trav, q[0], q[1], q[2], q[3], -1.6, 0, 0.005));
    boxP(M.trav, pool[0], pool[1], pool[2], pool[3], -1.7, -1.5, 0.005);
    const water = new THREE.Mesh(FX.plane(pool[2] - pool[0], pool[3] - pool[1]), M.water);
    water.rotation.x = -Math.PI / 2; water.position.set(WX((pool[0] + pool[2]) / 2), -0.14, WZ((pool[1] + pool[3]) / 2));
    water.receiveShadow = true; house.add(water);
    boxP(M.trav, 41, 41, 59, 43.6, -0.3, 0, 0.005);                     // garden terrace
    boxP(M.trav, 13.5, 26, 17, 42, -0.3, 0, 0.005);                     // the path to the door
    const flat = (mat, x0, y0, x1, y1, y) => {
      const m = new THREE.Mesh(FX.plane(x1 - x0, y1 - y0), mat);
      m.rotation.x = -Math.PI / 2; m.position.set(WX((x0 + x1) / 2), y, WZ((y0 + y1) / 2));
      m.receiveShadow = true; house.add(m); return m;
    };
    flat(M.gravel, -1, 26, 23, 42, -0.012);
    flat(M.lawn, 41, 43.6, 61.55, 49.55, -0.008);
    // the site, with holes where the house steps down (the lounge, the pool)
    {
      const holes = [[12, 10.5, 18, 15], [22.5, 27, 40.5, 30], [53, 37.6, 56.6, 39.4]];
      const xs = [SITE[0], SITE[2], ...holes.flatMap((q) => [q[0], q[2]])].sort((a, b) => a - b);
      const ys = [SITE[1], SITE[3], ...holes.flatMap((q) => [q[1], q[3]])].sort((a, b) => a - b);
      for (let j = 0; j < ys.length - 1; j++) for (let i = 0; i < xs.length - 1; i++) {
        const cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2;
        if (holes.some((q) => cx > q[0] && cx < q[2] && cy > q[1] && cy < q[3])) continue;
        flat(M.ground, xs[i], ys[j], xs[i + 1], ys[j + 1], -0.03).userData.ground = true;
      }
    }

    /* the land around: near terrain at 2 m, far terrain at 20 m, the sea ------------- */
    const landMat = drawable(FX.pbr(grass, { size: 2.4, color: 0x98a27a, env: 0.5, vertexColors: true }), 'none', { sat: 0.75, macro: 0.7, side: THREE.FrontSide });
    const tint = (g) => FX.colorize(g, (x, y, z) => { const k = 0.8 + 0.3 * FX.noise3(x * 0.04, 1, z * 0.04); return [k, k * 0.97, k * 0.88]; });
    const near = new THREE.Mesh(tint(terrain(420, 210, 31, 22, [SITE[0] + 3, SITE[1] + 3, SITE[2] - 3, SITE[3] - 3])), landMat);
    const far = new THREE.Mesh(tint(terrain(5200, 260, 31, 900, [-170, -180, 222, 214])), landMat);
    [near, far].forEach((m) => { m.receiveShadow = true; m.userData.ground = true; scene.add(m); });
    const seaMat = drawable(plain({ color: 0x23404c, roughness: 0.14, metalness: 0, envMapIntensity: 1.1 }), 'water', { side: THREE.FrontSide });
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(9000, 5000), seaMat);
    sea.rotation.x = -Math.PI / 2; sea.position.set(WX(31), -205, WZ(3100));
    scene.add(sea);

    // the sky: a dome that writes alpha, so it can be paper until the patio
    skyMat = new THREE.ShaderMaterial({
      uniforms: { map: { value: sk.bg }, paper: { value: 1 }, intensity: { value: 1.0 } },
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
    M.bark = drawable(FX.pbr(barkSet, { size: 1.1, color: new THREE.Color().setRGB(1.35, 1.3, 1.2), env: 0.6, normal: 1.5 }), 'none', { sat: 0.2 });
    M.barkFar = drawable(FX.pbr(barkSet, { size: 1.1, color: new THREE.Color().setRGB(1.35, 1.3, 1.2), env: 0.6, normal: 1.5 }), 'none', { sat: 0.2, noCap: true });
    M.leafCard = drawable(new THREE.MeshStandardMaterial({ map: sprigTex(), alphaTest: 0.5, roughness: 0.62, envMapIntensity: 0.32, color: new THREE.Color().setRGB(0.6, 0.64, 0.54) }), 'none', { noCap: true, alphaMip: 256 });
    const WB = new FX.Batch();
    const cards = [];
    cards.push(...olive(WB, M.bark, 30, 18, 1.25, 1890, ctx.LOW ? 2200 : 4200, 0));
    const RG = FX.rng(77);
    for (let i = 0; i < 90; i++) {
      const a = RG() * Math.PI * 2, r = 60 + RG() * 220;
      const x = 31 + Math.cos(a) * r, y = 22 + Math.sin(a) * r * 0.9 + 30;
      if (x > -60 && x < 80 && y > -25 && y < 64) continue;           // keep the plan sheet clean
      cards.push(...olive(WB, M.barkFar, x, y, 0.75 + RG() * 0.35, 400 + i, 420, terrH(x, y)));
    }
    cards.push(...olive(WB, M.bark, 43.4, 47.4, 0.62, 2026, ctx.LOW ? 700 : 1300, 0));
    WB.build(scene).forEach((m) => { m.castShadow = true; m.receiveShadow = true; });
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
      LB.build(scene).forEach((m) => { m.castShadow = true; m.receiveShadow = true; m.userData.noPrepass = true; });
    }
    const leafGeo = new THREE.PlaneGeometry(0.42, 0.42);
    const leaves = new THREE.InstancedMesh(leafGeo, M.leafCard, cards.length);
    cards.forEach((m4, i) => leaves.setMatrixAt(i, m4));
    leaves.castShadow = true; leaves.receiveShadow = true; leaves.userData.noPrepass = true;
    scene.add(leaves);
    // cypresses along the north and west edges
    const fol = FX.canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#2c3423'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 5000; i++) {
        const x = Math.random() * w, y = Math.random() * h, sz = 2 + Math.random() * 6;
        g.fillStyle = ['#1c2417', '#3a4630', '#4d5a3a', '#252e1d', '#5f6b45'][(Math.random() * 5) | 0];
        g.beginPath(); g.ellipse(x, y, sz, sz * 0.6, Math.random() * 3, 0, 6.28); g.fill();
      }
    }, { repeat: true });
    fol.repeat.set(0.35, 0.35);
    M.cypress = drawable(new THREE.MeshStandardMaterial({ map: fol, roughness: 0.95, envMapIntensity: 0.5 }), 'none', { noCap: true });
    const CB = new FX.Batch();
    [[-10, -9, 11], [-11.5, -4, 13], [-9, 2, 10], [-11, 8, 12.5], [6, -10.5, 10.5], [16, -11, 12], [27, -10, 11], [50, -9, 12], [64, -8, 10], [70, 2, 13],
      [-10.5, 40, 11], [-12, 47, 13]].forEach(([x, y, hgt], i) => {
      const g = new THREE.IcosahedronGeometry(1, 4), pp = g.attributes.position, v = new V3();
      for (let k = 0; k < pp.count; k++) {
        v.fromBufferAttribute(pp, k);
        const yy = v.y, taper = Math.pow(Math.max(0.02, 1 - Math.abs(yy - 0.15)), 0.8) * (yy > 0 ? 1 - yy * 0.55 : 1);
        const nn = 0.8 + FX.noise3(v.x * 3 + i, yy * 7, v.z * 3) * 0.4;
        pp.setXYZ(k, v.x * 1.15 * taper * nn, (yy + 1) * 0.5 * hgt, v.z * 1.15 * taper * nn);
      }
      g.computeVertexNormals();
      CB.add(M.cypress, g, FX.M(WX(x), terrH(x, y), WZ(y)));
    });
    CB.build(scene).forEach((m) => { m.castShadow = true; m.receiveShadow = true; });
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
      FX.colorize(tg, (x, y) => { const k = 0.3 + 0.7 * Math.min(1, y / 0.6); return [0.55 * k + 0.06, 0.5 * k + 0.06, 0.3 * k + 0.04]; });
      const tm = drawable(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, envMapIntensity: 0.6 }), 'none', { noCap: true });
      const N = ctx.LOW ? 5000 : 12000, tufts = new THREE.InstancedMesh(tg, tm, N), dm = new THREE.Object3D();
      let n = 0;
      while (n < N) {
        const x = 31 + (R2() - 0.5) * 220, y = 22 + (R2() - 0.5) * 200;
        if (x > SITE[0] - 1 && x < SITE[2] + 1 && y > SITE[1] - 1 && y < SITE[3] + 1) continue;
        if (FX.noise3(x * 0.12, 3, y * 0.12) < 0.36 && R2() < 0.7) continue;
        dm.position.set(WX(x), terrH(x, y), WZ(y)); dm.rotation.set(0, R2() * 6.28, 0);
        dm.scale.set(0.8 + R2() * 0.8, 0.6 + R2() * 1.1, 0.8 + R2() * 0.8);
        dm.updateMatrix(); tufts.setMatrixAt(n++, dm.matrix);
      }
      tufts.receiveShadow = true; tufts.userData.noPrepass = true;
      scene.add(tufts);
    }

    /* furniture ---------------------------------------------------------------- */
    const F = (mat, x0, y0, x1, y1, z0, z1, r, coll) => boxP(M[mat], x0, y0, x1, y1, z0, z1, r == null ? 0.02 : r, coll);
    // entrance
    F('travBlock', 11.25, 19.3, 11.85, 23.7, 0, 0.86, 0.01);
    B.add(M.dark, new THREE.CylinderGeometry(0.34, 0.4, 1.15, 40), FX.M(WX(12.55), 0.575, WZ(24.6)));
    // living: lounge in the pit, fireplace, chairs by the glass
    F('fabric', 12.1, 10.6, 17.9, 11.5, -0.45, 0, 0.08); F('fabric', 12.1, 11.5, 13.0, 14.9, -0.45, 0, 0.08); F('fabric', 12.1, 14.1, 16.2, 14.9, -0.45, 0, 0.08);
    F('travBlock', 14.2, 12.3, 16.4, 13.4, -0.45, -0.1, 0.01);
    F('concreteIn', 9.13, 10.2, 9.95, 15.2, 0, 3.92, 0.01, 'fire');
    F('dark', 9.9, 11.7, 9.98, 13.7, 0.3, 1.05, 0.005);
    F('fire', 9.86, 11.9, 9.9, 13.5, 0.36, 0.7, 0.005);
    F('concreteIn', 9.95, 10.9, 10.9, 14.5, 0, 0.32, 0.01);
    F('rug', 13.2, 11.7, 17.6, 13.95, -0.45, -0.43, 0.005);
    F('fabric', 19.2, 9.4, 20.1, 10.3, 0, 0.72, 0.1); F('fabric', 19.2, 11.0, 20.1, 11.9, 0, 0.72, 0.1);
    // kitchen and dining
    F('travBlock', 11.5, 3.4, 16.5, 4.6, 0, 0.92, 0.01, 'island');
    F('oak', 9.13, 0.4, 9.75, 4.6, 0, 2.6, 0.01, 'tall');
    F('oak', 17.2, 3.4, 23.2, 4.6, 0.7, 0.76, 0.005);
    F('oak', 17.5, 3.6, 17.62, 4.4, 0, 0.7, 0.005); F('oak', 22.78, 3.6, 22.9, 4.4, 0, 0.7, 0.005);
    for (let i = 0; i < 7; i++) {
      const x = 17.55 + i * 0.84;
      F('fabric', x, 2.8, x + 0.5, 3.25, 0.4, 0.47, 0.03); F('oak', x, 2.72, x + 0.5, 2.8, 0.4, 0.85, 0.02);
      F('fabric', x, 4.75, x + 0.5, 5.2, 0.4, 0.47, 0.03); F('oak', x, 5.2, x + 0.5, 5.28, 0.4, 0.85, 0.02);
      [[x + 0.03, 2.82], [x + 0.43, 2.82], [x + 0.03, 3.18], [x + 0.43, 3.18], [x + 0.03, 4.77], [x + 0.43, 4.77], [x + 0.03, 5.13], [x + 0.43, 5.13]]
        .forEach(([lx, ly]) => F('oak', lx, ly, lx + 0.04, ly + 0.04, 0, 0.4, 0.005));
    }
    F('dark', 25.2, 0.2, 28.8, 0.6, 0, 2.6, 0.01); F('dark', 28.4, 0.6, 28.8, 7.4, 0, 2.6, 0.01);
    // media, study, library
    F('fabric', 2, 5.4, 7, 6.4, 0, 0.7, 0.1); F('fabric', 2, 4.4, 2.9, 5.4, 0, 0.7, 0.1);
    F('dark', 2.4, 0.2, 6.6, 0.3, 0.9, 2.9, 0.01);
    F('oak', 31.5, 2.2, 34.5, 3.1, 0, 0.75, 0.01);
    F('oak', 29.2, 0.2, 37.8, 0.6, 0, 2.8, 0.01); F('oak', 38.2, 0.2, 43.8, 0.6, 0, 2.8, 0.01); F('oak', 43.4, 0.6, 43.8, 7.4, 0, 2.8, 0.01);
    // guest suites
    [8, 16].forEach((y) => {
      F('fabric', 3.9, y + 2, 6.1, y + 4.2, 0, 0.55, 0.06); F('oak', 3.7, y + 1.75, 6.3, y + 2, 0, 1.2, 0.01);
      F('plaster', 0.2, y + 5.3, 3.3, y + 5.45, 0, 2.6, 0.005); F('plaster', 3.3, y + 5.3, 3.45, y + 7.8, 0, 2.6, 0.005);
      F('travBlock', 0.2, y + 6, 0.8, y + 7.6, 0, 0.85, 0.01);
    });
    // garage: three cars
    [1.1, 3.6, 6.1].forEach((x) => F('car', x, 25, x + 1.9, 29.8, 0, 1.4, 0.4));
    // gallery: a bench, a bronze on a plinth (the canvases are added after the batch)
    F('oak', 43.15, 17.4, 43.65, 20.6, 0, 0.45, 0.02);
    F('travBlock', 41.4, 24.0, 41.95, 24.55, 0, 0.92, 0.01);
    B.add(M.bronze, new THREE.SphereGeometry(0.27, 40, 20), FX.M(WX(41.68), 1.19, WZ(24.28)));
    // master suite: the bed against the charred larch, facing the garden
    F('oak', 44.6, 32.35, 47.6, 34.85, 0, 0.26, 0.02);
    F('fabric', 44.7, 32.45, 47.5, 34.75, 0.26, 0.5, 0.06);
    F('rug', 44.68, 33.5, 47.52, 34.8, 0.5, 0.58, 0.05);
    F('fabric', 44.95, 32.5, 45.95, 32.95, 0.5, 0.66, 0.08); F('fabric', 46.25, 32.5, 47.25, 32.95, 0.5, 0.66, 0.08);
    F('fabric', 44.3, 32.15, 47.9, 32.33, 0, 1.15, 0.04);
    F('oak', 43.55, 32.2, 44.15, 32.7, 0, 0.5, 0.01); F('oak', 48.05, 32.2, 48.65, 32.7, 0, 0.5, 0.01);
    F('bronze', 43.84, 32.44, 43.86, 32.46, 1.2, 3.6, 0.002); F('bronze', 48.34, 32.44, 48.36, 32.46, 1.2, 3.6, 0.002);
    F('rug', 43.6, 34.2, 48.6, 37.8, 0, 0.02, 0.005);
    F('fabric', 41.6, 37.3, 42.5, 38.2, 0, 0.72, 0.1); F('fabric', 41.6, 38.7, 42.5, 39.6, 0, 0.72, 0.1);
    F('travBlock', 41.75, 38.3, 42.35, 38.6, 0, 0.45, 0.01);
    // dressing: oak both sides
    F('oak', 51.2, 32.15, 58.8, 32.75, 0, 2.6, 0.01); F('oak', 51.2, 34.25, 54.9, 34.85, 0, 2.6, 0.01); F('oak', 57.9, 34.25, 58.8, 34.85, 0, 2.6, 0.01);
    // bath: a long stone vanity and a mirror (the sunk bath is built with the floors)
    F('travBlock', 58.2, 35.8, 58.85, 39.8, 0, 0.88, 0.01);
    F('glassMirror', 58.83, 36.0, 58.86, 39.6, 1.05, 2.45, 0.003);
    // garden: a low board-marked wall on the south and east, a stone bench, two loungers
    F('concrete', 41, 49.55, 62, 50, 0, 0.5, 0.01); F('concrete', 61.55, 41, 62, 49.55, 0, 0.5, 0.01);
    F('travBlock', 46.2, 48.7, 49.4, 49.25, 0, 0.45, 0.01);
    [51.6, 53.0].forEach((x) => { F('oak', x, 45.4, x + 0.75, 47.4, 0, 0.3, 0.03); F('fabric', x + 0.04, 45.45, x + 0.71, 47.35, 0.3, 0.4, 0.04); });
    // patio loungers, garden beds
    [24.6, 26.2, 34.4, 36].forEach((x) => { F('oak', x, 24.2, x + 0.75, 26.2, 0, 0.3, 0.03); F('fabric', x + 0.04, 24.25, x + 0.71, 26.15, 0.3, 0.4, 0.04); });

    B.build(house);
    house.traverse((o) => { if (o.isMesh) { o.castShadow = !o.material.transparent && o.material !== M.water && !o.userData.ground; o.receiveShadow = true; } });
    house.traverse((o) => { if (o.isMesh && o.material === M.roof) roofMeshes.push(o); });

    // the painting on the concrete wall of the entrance
    const paintTex = FX.canvasTex(512, 640, (g, w, h) => {
      g.fillStyle = '#e8dccb'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#b8452a'; g.fillRect(44, 56, w - 88, h * 0.5);
      g.fillStyle = '#231e1a'; g.fillRect(44, h * 0.62, w - 88, h * 0.3);
      g.globalAlpha = 0.1; for (let i = 0; i < 900; i++) { g.fillStyle = i % 2 ? '#fff' : '#000'; g.fillRect(Math.random() * w, Math.random() * h, 2, 12); }
    });
    const painting = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.0), drawable(new THREE.MeshStandardMaterial({ map: paintTex, roughness: 0.9, envMapIntensity: 0.4 }), 'none', { side: THREE.FrontSide }));
    painting.rotation.y = Math.PI / 2;
    painting.position.set(WX(11.13 + 0.03), 2.75, WZ(21.5));
    painting.castShadow = false; painting.receiveShadow = true;
    house.add(painting);

    // living: a second canvas on the north pier, a potted olive in the corner, the fire's light
    const paint2 = FX.canvasTex(512, 680, (g, w, h) => {
      g.fillStyle = '#ece4d6'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#1f1b18'; g.fillRect(60, 70, w - 120, h * 0.34);
      g.fillStyle = '#b8452a'; g.beginPath(); g.arc(w / 2, h * 0.66, w * 0.2, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 0.08; for (let i = 0; i < 900; i++) { g.fillStyle = i % 2 ? '#fff' : '#000'; g.fillRect(Math.random() * w, Math.random() * h, 2, 10); }
    });
    const canvas2 = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.0), drawable(new THREE.MeshStandardMaterial({ map: paint2, roughness: 0.9, envMapIntensity: 0.4 }), 'none', { side: THREE.FrontSide }));
    canvas2.position.set(WX(10.05), 2.2, WZ(8.15));
    house.add(canvas2);
    // three canvases on the gallery's solid wall
    [[14, ['#efe6d6', '#1f1b18', '#b8452a']], [21, ['#d9cdb8', '#b8452a', '#2a2622']], [28, ['#e9e1d2', '#3d3a33', '#c9bfae']]].forEach(([y, c], i) => {
      const tex = FX.canvasTex(512, 660, (g, w, h) => {
        g.fillStyle = c[0]; g.fillRect(0, 0, w, h);
        g.fillStyle = c[1];
        if (i === 0) g.fillRect(70, 90, w - 140, h * 0.55);
        else if (i === 1) { g.beginPath(); g.arc(w / 2, h * 0.42, w * 0.3, 0, Math.PI * 2); g.fill(); }
        else { for (let k = 0; k < 7; k++) g.fillRect(60, 80 + k * 72, w - 120, 30); }
        g.fillStyle = c[2]; g.fillRect(70, h * 0.78, w - 140, 26);
        g.globalAlpha = 0.08; for (let k = 0; k < 900; k++) { g.fillStyle = k % 2 ? '#fff' : '#000'; g.fillRect(Math.random() * w, Math.random() * h, 2, 10); }
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.6), drawable(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, envMapIntensity: 0.4 }), 'none', { side: THREE.FrontSide }));
      m.rotation.y = -Math.PI / 2; m.position.set(WX(43.77), 2.0, WZ(y));
      m.receiveShadow = true; house.add(m);
    });
    {
      const TB = new FX.Batch();
      TB.add(M.dark, new THREE.CylinderGeometry(0.42, 0.34, 0.62, 32), FX.M(WX(10.0), 0.31, WZ(16.2)));
      TB.add(M.dark, new THREE.CylinderGeometry(0.05, 0.08, 1.5, 10), FX.M(WX(10.0), 1.3, WZ(16.2), 0.08, 0, 0.1));
      const RR = FX.rng(31);
      for (let i = 0; i < 9; i++) {
        const g = new THREE.IcosahedronGeometry(1, 2), pp = g.attributes.position, v = new V3();
        for (let k = 0; k < pp.count; k++) { v.fromBufferAttribute(pp, k); v.multiplyScalar(0.8 + FX.noise3(v.x * 2 + i, v.y * 2, v.z * 2) * 0.4); pp.setXYZ(k, v.x, v.y, v.z); }
        g.computeVertexNormals();
        const a = RR() * 6.28, rr = 0.15 + RR() * 0.45;
        TB.add(M.leaf, g, FX.M(WX(10.0) + Math.cos(a) * rr, 2.0 + RR() * 0.9, WZ(16.2) + Math.sin(a) * rr, 0, RR() * 6, 0, 0.35 + RR() * 0.25, 0.28 + RR() * 0.15, 0.35 + RR() * 0.25));
      }
      TB.build(house);
    }
    fireLight = new THREE.PointLight(0xff8a40, 0, 7, 1.8);
    fireLight.position.set(WX(10.4), 0.6, WZ(12.7));
    scene.add(fireLight);

    /* the plan drawing on the ground ---------------------------------------- */
    const annTex = drawPlan();
    annMat = new THREE.ShaderMaterial({
      uniforms: Object.assign({ tAnn: { value: annTex }, uOrg: { value: new THREE.Vector2(WX(SX0), WZ(SY0)) }, uSize: { value: SIZE }, uOp: { value: 1 } }, RU),
      vertexShader: 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform sampler2D tAnn; uniform vec2 uOrg; uniform float uSize; uniform float uOp; varying vec3 vW;
        ${ROOM_GLSL}
        void main() {
          float a = texture2D(tAnn, (vW.xz - uOrg) / uSize).r;
          float rev; vec4 org; roomOf(vW, vec3(0.0, 1.0, 0.0), rev, org);
          float ring; float real = revealAt(vW, rev, org, ring);
          a *= (1.0 - real) * uOp;
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
    scene.add(new THREE.HemisphereLight(0xefebe4, 0xd8c3a6, 0.5));

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
        texts.push({ s: d.t, at: A.clone().add(Bv).multiplyScalar(0.5).addScaledVector(perp, d.side || 0.32).add(new V3(0, 0.12, 0)) });
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
      { a: [9, 8.7, HL], b: [21, 8.7, HL], t: '12.00' },
      { a: [20.4, 8, HL], b: [20.4, 17, HL], t: '9.00', side: -0.42 },
      { a: [12, 10.15, HL], b: [18, 10.15, HL], t: '6.00' },
      { a: [11.7, 10.5, HL], b: [11.7, 15, HL], t: '4.50', side: -0.42 },
      { a: [20.6, 16.6, 0], b: [20.6, 16.6, 4.5], t: '4.50', side: 0.3 },
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
        count: ctx.LOW ? Math.round(count * 0.45) : count, seed: 11 + count, size: 0.0075, base: 0, color: 0xffe6c4,
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
    RU.uRO.value[ent.i].set(WX(15.25), 0.4, WZ(25.8), 14);
    RU.uRO.value[RM.living.i].set(WX(15), 0.5, WZ(17), 14);
    RU.uRO.value[RM.kitchen.i].set(WX(15), 0.5, WZ(8), 16);
    RU.uRO.value[RM.wine.i].set(WX(15), 0.5, WZ(8), 16);
    RU.uRO.value[RM.patio.i].set(WX(23.9), 0.5, WZ(8), 34);
    RU.uRO.value[RM.gallery.i].set(WX(41.2), 0.5, WZ(11.6), 26);
    RU.uXO.value.set(WX(23.9), 0.5, WZ(8), 260);
    RU.uRO.value[RM.bedroom.i].set(WX(42.5), 0.5, WZ(32), 15);
    RU.uRO.value[RM.dressing.i].set(WX(51), 0.5, WZ(33.5), 9);
    RU.uRO.value[RM.bath.i].set(WX(56), 0.5, WZ(35), 9);
    RU.uRO.value[RM.garden.i].set(WX(56.5), 0.5, WZ(41), 24);
    // the rooms you never walk into fill in on the way back up, each from its own middle
    LATE.forEach((id) => { const r = RM[id]; RU.uRO.value[r.i].set(WX((r.r[0] + r.r[2]) / 2), 1.2, WZ((r.r[1] + r.r[3]) / 2), 9); });

    window.__lintel = { RU, RM, cutPlane, sunDir: sd, M };
    return {
      anchors: { entrance: new V3(WX(18.3), 3.3, WZ(17.2)), living: new V3(WX(10.1), 3.3, WZ(9.3)), kitchen: new V3(WX(13.2), 2.5, WZ(3.4)),
        olive: new V3(WX(31.2), 4.2, WZ(17.2)), gallery: new V3(WX(43.6), 3.1, WZ(12.6)),
        bedroom: new V3(WX(48.6), 2.6, WZ(32.3)), garden: new V3(WX(52), 2.2, WZ(52)) },
      colliders, M,
      update() {},
    };
  }

  /* ---------- per-frame choreography --------------------------------------------- */
  const _k = {};
  let outdoorK = 0;
  // haze density, exposure, haze strength, by where the camera stands
  const AIR = { room: [0.3, 1.16, 0.85], living: [0.32, 1.18, 0.85], kitchen: [0.28, 1.1, 0.85], gallery: [0.05, 0.92, 0.5],
    bedroom: [0.2, 1.08, 0.75], dressing: [0.2, 1.15, 0.75], bath: [0.16, 1.05, 0.7], out: [0.012, 0.84, 0.4] };
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
      const rise = FX.smooth(span(idx, 0.18, 0.9)), close = FX.smooth(span(idx, 1.1, 1.62));
      cut = close >= 1 ? OFF : FX.lerp(1.2, 3.52, rise) + 2.7 * close;
    } else {
      const off = FX.smooth(span(s, at('hall', 'h1'), at('hall', 'h1') + 30));
      const land = FX.smooth(span(s, at('living') - 22, at('living') + 30));
      cut = land > 0 ? (land >= 1 ? OFF : FX.lerp(3.52, 5.3, land)) : FX.lerp(5.3, 3.52, off);
    }
    cutPlane.constant = cut;
    RU.uCutOn.value = cut >= OFF ? 0 : 1;
    P.zBase = Math.max(0, st.dist * 0.9 - 20, st.dist - 70);
    const tele = 1 - FX.smooth(FX.range(ctx.camera.fov, 6, 30));        // 1 while the lens is a plan

    // the pivot door turns along its drawn arc, then the entrance arrives
    const open = ease(span(s, at('door') + 8, at('door', 'h1') - 6));
    if (pivot) pivot.rotation.y = open * Math.PI / 2;
    const inside = ease(span(s, at('door') + 40, at('hall') + 45));
    RU.uRV.value[RM.entrance.i] = inside;
    const living = ease(span(s, at('living') - 50, at('living') + 50));
    RU.uRV.value[RM.living.i] = living;
    const kitchen = ease(span(s, at('living', 'h1') + 10, at('dining') + 30));
    RU.uRV.value[RM.kitchen.i] = RU.uRV.value[RM.wine.i] = kitchen;

    // out on the patio the sky arrives, the outside sweeps in, then the gallery
    const patio = ease(span(s, at('dining', 'h1') + 15, at('patio') + 40));
    RU.uRV.value[RM.patio.i] = patio;
    const outside = ease(span(s, at('dining', 'h1') + 30, at('patio', 'h1')));
    RU.uXV.value = outside;
    if (skyMat) skyMat.uniforms.paper.value = 1 - ease(span(s, at('dining', 'h1') + 40, at('patio') + 20));
    const gallery = ease(span(s, at('turn') - 50, at('gallery') + 40));
    RU.uRV.value[RM.gallery.i] = gallery;
    const bedroom = ease(span(s, at('galleryEnd', 'h1') + 10, at('bedroom') + 30));
    RU.uRV.value[RM.bedroom.i] = bedroom;
    const dressing = ease(span(s, at('bedroom', 'h1') + 10, at('dress')));
    RU.uRV.value[RM.dressing.i] = dressing;
    const bath = ease(span(s, at('dress') - 30, at('bath') + 30));
    RU.uRV.value[RM.bath.i] = bath;
    const garden = ease(span(s, at('bath', 'h1') + 10, at('garden') + 30));
    RU.uRV.value[RM.garden.i] = garden;
    LATE.forEach((id, i) => { RU.uRV.value[RM[id].i] = ease(span(s, at('garden', 'h1') + 30 + i * 12, at('garden', 'h1') + 110 + i * 12)); });
    // on the way back up the roofs stop drawing, but still cast their shade: a pool of light in every room
    const roofsOff = s > at('garden', 'h1') + 20 && ctx.camera.position.y > 5;
    roofMeshes.forEach((m) => { m.material.colorWrite = !roofsOff; m.material.depthWrite = !roofsOff; m.userData.noPrepass = roofsOff; });
    if (ctx.scene.fog) { ctx.scene.fog.near = Math.max(140, st.dist - 60); ctx.scene.fog.far = ctx.scene.fog.near + 3500; }

    // glass in front of a drawing: once its own side is real it stops adding its reflection to the paper
    const realFor = { ext: outside, patio, garden };
    const glassState = (g, real) => {
      g.blendSrc = real ? THREE.OneMinusDstAlphaFactor : THREE.OneFactor;
      g.blendSrcAlpha = real ? THREE.ZeroFactor : THREE.OneFactor;
      g.blendDstAlpha = real ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor;
    };
    Object.keys(panes).forEach((k) => glassState(panes[k], (realFor[k] || 0) >= 0.999));
    if (ctx.world && ctx.world.M) glassState(ctx.world.M.glassSky, outside >= 0.999);

    // the plan's dimensions hang in the room, then go once the materials have arrived
    if (dims.living) dims.living.value = FX.smooth(span(s, at('livingTop') - 70, at('livingTop') - 10)) * (1 - FX.smooth(span(s, at('living') + 50, at('living', 'h1') - 10)));
    if (dims.kitchen) dims.kitchen.value = FX.smooth(span(s, at('living', 'h1') - 10, at('living', 'h1') + 40)) * (1 - FX.smooth(span(s, at('dining') + 40, at('dining', 'h1') - 10)));
    if (dims.patio) dims.patio.value = FX.smooth(span(s, at('dining', 'h1'), at('dining', 'h1') + 50)) * (1 - FX.smooth(span(s, at('olive') + 10, at('olive', 'h1') - 10)));
    if (dims.bedroom) dims.bedroom.value = FX.smooth(span(s, at('galleryEnd', 'h1') - 10, at('galleryEnd', 'h1') + 40)) * (1 - FX.smooth(span(s, at('bedroom') + 40, at('bedroom', 'h1'))));
    if (dims.garden) dims.garden.value = FX.smooth(span(s, at('bath', 'h1'), at('bath', 'h1') + 50)) * (1 - FX.smooth(span(s, at('garden') + 40, at('garden', 'h1'))));
    if (dims.gallery) dims.gallery.value = FX.smooth(span(s, at('turn') - 30, at('turn') + 20)) * (1 - FX.smooth(span(s, at('galleryEnd') - 30, at('galleryEnd') + 30)));
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
      dustSets.entrance.material.uniforms.uFade.value = inside;
      dustSets.living.material.uniforms.uFade.value = living;
      dustSets.kitchen.material.uniforms.uFade.value = kitchen;
      dustSets.patio.material.uniforms.uFade.value = patio * 0.25;
      dustSets.gallery.material.uniforms.uFade.value = gallery * 0.3;
      dustSets.bedroom.material.uniforms.uFade.value = bedroom * 0.7;
      dustSets.bath.material.uniforms.uFade.value = bath * 0.6;
      Object.values(dustSets).forEach((d) => { d.material.uniforms.uTime.value = st.t; });
    }
    const flick = 0.75 + 0.25 * Math.sin(st.t * 7.1) * Math.sin(st.t * 3.3 + 1.2);
    if (fireLight) fireLight.intensity = living * 3.2 * flick;
    if (ctx.world && ctx.world.M) ctx.world.M.fire.emissiveIntensity = living * 2.2 * flick;

    // finish: paper wherever a room has not arrived yet
    P.paperOn = 1;
    P.ink = 1;
    P.inkTele = Math.max(st.flat, tele);
    P.shafts = air.haze * (1 - tele);
    P.shaftAmp = air.amp;
    P.shaftDist = 24;
    P.sunDust = 1 - tele;
    P.ao = 0.9;
    P.aoRadius = 0.5;
    P.dof = st.m.phase === 'hold' && st.m.key > 0 ? 0.25 : 0.08;
    P.focus = st.dist < 4 ? (outdoorK > 0.5 ? 400 : 7) : st.dist;   // close targets on the walk: focus further out, outside on the view
    P.bloomAmt = 0.18;
    P.exposure = FX.lerp(1.0, air.exp, inside);
    P.inkReal = FX.lerp(0.12, 0.05, outdoorK * outside);
    P.warmth = FX.lerp(0.08, 0.14, inside);
    P.saturation = 0.96;
    P.contrast = 1.06;
    P.vignette = FX.lerp(0.04, 0.28, 1 - st.flat);
    P.grain = 0.018;
  }

  // keep north up while the camera is still looking straight down
  function camera(ctx, st, cam) {
    const top = FX.smooth(FX.range(cam.pitch, 70, 88));
    if (top > 0) {
      ctx.sampleKeys(st.m.idx, _k);
      cam.yaw = FX.lerp(cam.yaw, _k.yaw, top);
      cam.pitch = Math.min(cam.pitch, 89.5);
    }
  }

  function intro(tl) {
    const lines = document.querySelectorAll('.hero__title .mask > span');
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
    post: { fadeCol: [0.937, 0.922, 0.886], paperCol: [0.937, 0.922, 0.886], inkCol: [0.13, 0.13, 0.14], paperOn: 1, ink: 1, chroma: 0.0006, halation: 0.05 },
    postOptions: { preScale: 1.0 },
    options: { scrollScale: 0.85, parallax: 0.6, endFlat: 0 },
    heroFade: 40,
    finaleRise: 130,
    build, frame, camera, intro,
  });
})();
