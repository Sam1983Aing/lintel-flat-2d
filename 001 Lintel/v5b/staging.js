/* ==========================================================================
   Lintel / Casa Serra: the staging.

   Everything a stager would bring into the house: seating, tables, lamps, rugs,
   cushions, art, plants, sculpture, the bath, the garden. scene.js builds the
   architecture, then calls LINTEL_STAGE once.

   Two kinds of things:
   - furniture goes into the house batch (B). It joins the ink pass, so it is an
     outline while its room is still a drawing.
   - decor goes into one batch per zone (dec('living')). It stays out of the ink
     pass and hidden until its room starts to turn real, so the drawing stays
     clean and the staging arrives with the materials.

   Plan coordinates as in scene.js: x east, y south, metres. z is height.
   ========================================================================== */
window.LINTEL_STAGE = async function (A) {
  'use strict';
  const { THREE, FX, M, B, WX, WZ, drawable, loader, TEX, sets, scene, own, colliders, olive, tree, ROOMS } = A;
  const V3 = THREE.Vector3;
  const rgb = (r, g, b) => new THREE.Color().setRGB(r, g, b);
  const P = (o) => new THREE.MeshStandardMaterial(o);
  const D = (m, o) => drawable(m, 'none', o);

  /* ---------- materials ------------------------------------------------------- */
  const [walnut, leather] = await Promise.all([loader.set(TEX + 'natural_walnut_veneer'), loader.set(TEX + 'leather_red_02')]);
  Object.assign(M, {
    // the scans are greyer and paler than the woods and cloths they stand for, so each is tinted in linear colour
    walnut: D(FX.pbr(walnut, { size: 0.5, color: rgb(0.74, 0.5, 0.33), env: 0.75, roughness: 0.8 }), { sat: 1.0 }),      // 0.5 m a tile: at 1.3 the figure of the veneer was the size of a dinner plate
    oakFin: drawable(FX.pbr(sets.oak, { size: 1.3, color: rgb(1.25, 1.08, 0.9), env: 0.9, rotate: Math.PI / 2 }), 'timber', { room: 'ext', sat: 0.55 }),
    oakBench: drawable(FX.pbr(sets.oak, { size: 1.3, color: rgb(1.25, 1.08, 0.9), env: 0.9 }), 'none', { room: 'ext', sat: 0.55 }),   // the same oak, grain along the seat
    oakConsole: drawable(FX.pbr(sets.oak, { size: 1.5, color: rgb(0.82, 0.62, 0.46), env: 0.7 }), 'none', { sat: 0.5 }),               // the entrance's console: a darker, smoked oak
    rugDark: D(FX.pbr(sets.wool, { size: 0.5, color: rgb(0.62, 0.54, 0.46), env: 0.25, normal: 2.2 }), { sat: 0.25 }),                    // the living's rug: a deep taupe wool
    steel: D(P({ color: 0xbdbcb7, metalness: 1, roughness: 0.3, envMapIntensity: 1.1 })),                                                // brushed steel
    walnutFine: D(FX.pbr(walnut, { size: 0.26, color: rgb(0.74, 0.5, 0.33), env: 0.7, roughness: 0.8 }), { sat: 1.0 }),                                   // for things you stand right next to
    lacq: D(P({ color: 0x8d8576, roughness: 0.5, envMapIntensity: 0.6 })),
    bayGlow: D(P({ color: 0xe9dcc6, emissive: 0xffd6a2, emissiveIntensity: 0.5, roughness: 0.9 })),
    leather: D(FX.pbr(leather, { size: 0.8, color: rgb(2.7, 2.3, 1.9), env: 0.55, roughness: 0.8 }), { sat: 0.8 }),
    boucle: D(FX.pbr(sets.wool, { size: 0.42, color: rgb(3.7, 3.42, 2.95), env: 0.3, normal: 1.7 }), { sat: 0.1 }),
    charcoal: D(FX.pbr(sets.linen, { size: 0.6, color: rgb(0.6, 0.58, 0.56), env: 0.3 }), { sat: 0 }),
    ochre: D(FX.pbr(sets.linen, { size: 0.6, color: rgb(1.7, 1.18, 0.56), env: 0.3 }), { sat: 0 }),
    rust: D(FX.pbr(sets.linen, { size: 0.6, color: rgb(1.3, 0.52, 0.34), env: 0.3 }), { sat: 0 }),
    sage: D(FX.pbr(sets.linen, { size: 0.6, color: rgb(1.0, 1.08, 0.86), env: 0.3 }), { sat: 0 }),
    linenW: D(FX.pbr(sets.linen, { size: 0.7, color: rgb(2.3, 2.22, 2.08), env: 0.35 }), { sat: 0 }),
    wool: D(FX.pbr(sets.wool, { size: 0.7, color: rgb(3.3, 3.02, 2.55), env: 0.3, normal: 1.4 }), { sat: 0.1 }),
    brass: D(P({ color: 0xb08a52, metalness: 1, roughness: 0.32, envMapIntensity: 1.2 })),
    black: D(P({ color: 0x1b1a19, metalness: 0.35, roughness: 0.5, envMapIntensity: 0.7 })),
    ceramic: D(P({ color: 0xece6da, roughness: 0.4, envMapIntensity: 0.7 })),
    clay: D(P({ color: 0xb06a46, roughness: 0.85 })),
    stoneW: D(P({ color: 0xf1ede4, roughness: 0.42, envMapIntensity: 0.8 })),
    inkObj: D(P({ color: 0x25221f, roughness: 0.55, envMapIntensity: 0.6 })),
    glow: D(P({ color: 0x2a2018, emissive: 0xffd39a, emissiveIntensity: 3.4, roughness: 1 })),
    glowSoft: D(P({ color: 0xcdb99a, emissive: 0xffc98a, emissiveIntensity: 0.34, roughness: 0.9 })),                      // a shade that glows, not a white cut-out
    rugTaupe: D(FX.pbr(sets.wool, { size: 0.5, color: rgb(2.25, 1.98, 1.66), env: 0.25, normal: 2.2 }), { sat: 0.1 }),
    ember: D(P({ color: 0x1a0f0a, emissive: 0xff6a22, emissiveIntensity: 2.6, roughness: 1 })),
    flame: D(P({ color: 0x1a0f0a, emissive: 0xffb24a, emissiveIntensity: 3.4, roughness: 1 })),
    lemon: D(P({ color: 0xe6c236, roughness: 0.6 })),
    foliage: D(P({ color: 0x55653f, roughness: 0.75, envMapIntensity: 0.4 }), { noRing: true }),
    foliageL: D(P({ color: 0x8a9466, roughness: 0.8, envMapIntensity: 0.4 }), { noRing: true }),
    straw: D(P({ color: 0xc9b98c, roughness: 0.9 }), { noRing: true }),
    lav: D(P({ color: 0x9d96ad, roughness: 0.95, envMapIntensity: 0.3 }), { noRing: true }),
    sageLeaf: D(P({ color: 0x7c8768, roughness: 0.95, envMapIntensity: 0.3 }), { noRing: true }),
    twig: D(P({ color: 0x5a4a3a, roughness: 0.9 }), { noRing: true }),
    boxLeaf: D(P({ color: 0x4b5a33, roughness: 0.92, envMapIntensity: 0.3 }), { noRing: true, macro: 0.35 }),
    white: D(P({ color: 0xf6f3ee, roughness: 0.7 })),
    sheer: D(P({ color: 0xf3efe7, roughness: 0.95, envMapIntensity: 0.3 })),
    plinthW: D(P({ color: 0xe7e3db, roughness: 0.82, envMapIntensity: 0.5 })),
    soilDark: D(P({ color: 0x2a2119, roughness: 1, envMapIntensity: 0.2 })),
    // firewood: bark with long fissures round each log, and its cut ends with rings, checks and a darker rim
    logBark: D(new THREE.MeshStandardMaterial({ roughness: 0.95, envMapIntensity: 0.3, map: FX.canvasTex(256, 512, (g, w, h) => {
      const r = FX.rng(77); g.fillStyle = '#3a2f26'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) { const x = r() * w, y = r() * h, l = 20 + r() * 120; g.strokeStyle = ['#2a221c', '#4d4136', '#5e5245', '#1f1914', '#6b6153'][(r() * 5) | 0]; g.lineWidth = 1 + r() * 4; g.globalAlpha = 0.5 + r() * 0.5; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + (r() - 0.5) * 8, y + l * 0.3, x + (r() - 0.5) * 8, y + l * 0.6, x + (r() - 0.5) * 10, y + l); g.stroke(); }
      g.globalAlpha = 0.25; for (let i = 0; i < 60; i++) { g.fillStyle = '#8a8676'; g.beginPath(); g.ellipse(r() * w, r() * h, 3 + r() * 10, 6 + r() * 20, 0, 0, 6.3); g.fill(); }
      g.globalAlpha = 1; }, { repeat: true }) })),
    logEnd: D(new THREE.MeshStandardMaterial({ roughness: 0.9, envMapIntensity: 0.25, map: FX.canvasTex(256, 256, (g, w, h) => {
      const r = FX.rng(91), cx = w / 2 + 6, cy = h / 2 - 4;
      g.fillStyle = '#2b2119'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#b8936a'; g.beginPath(); g.arc(cx, cy, w * 0.43, 0, 6.3); g.fill();
      for (let k = 1; k < 26; k++) { g.strokeStyle = k % 3 ? 'rgba(120,84,52,0.45)' : 'rgba(96,64,40,0.6)'; g.lineWidth = 1 + r() * 1.5; g.beginPath(); g.ellipse(cx, cy, k * 4.2 + r() * 2, k * 4.0 + r() * 2, r(), 0, 6.3); g.stroke(); }
      g.fillStyle = '#6e4e33'; g.beginPath(); g.arc(cx, cy, 5, 0, 6.3); g.fill();
      g.strokeStyle = 'rgba(40,28,18,0.8)'; for (let k = 0; k < 4; k++) { const a = r() * 6.28; g.lineWidth = 1.5 + r() * 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8); g.lineTo(cx + Math.cos(a) * (40 + r() * 60), cy + Math.sin(a) * (40 + r() * 60)); g.stroke(); }
    }) })),
    sofaWool: D(FX.pbr(sets.wool, { size: 0.3, color: rgb(3.25, 2.95, 2.5), env: 0.25, normal: 2.6 }), { sat: 0.18 }),   // the living pit's sofa: an oatmeal boucle with deep loops
    tubStone: D(P({ color: 0xf3f0ea, roughness: 0.3, envMapIntensity: 0.8 })),                                          // the tub and the basins: a white stone, honed to a soft sheen                                          // gallery plinths: a matt white, no joints
    glazeBlack: D(P({ color: 0x1b1918, roughness: 0.2, envMapIntensity: 0.95 })),                                       // a black glaze with a shine
    taupe: D(FX.pbr(sets.wool, { size: 0.42, color: rgb(1.95, 1.66, 1.36), env: 0.3, normal: 1.6 }), { sat: 0.15 }),    // the bed's headboard
    shade: D(P({ color: 0xe9dcc6, emissive: 0xffc68a, emissiveIntensity: 0.24, roughness: 0.92, side: THREE.DoubleSide })),   // a pleated linen shade with the bulb behind it
    sheerLinen: D(FX.pbr(sets.linen, { size: 0.5, color: rgb(2.45, 2.36, 2.22), env: 0.3, normal: 0.8 }), { sat: 0 }),   // curtain linen
  });
  M.sheerLinen.emissive.setRGB(0.3, 0.28, 0.25);              // a sheer lets the window's light through: lit from behind, it is not a dark sheet
  Object.assign(M, {
    bk1: D(P({ color: 0xe9e2d4, roughness: 0.8 })), bk2: D(P({ color: 0x2c2a28, roughness: 0.8 })), bk3: D(P({ color: 0xb8452a, roughness: 0.8 })), bk4: D(P({ color: 0x8c8676, roughness: 0.8 })),
  });

  // the box balls' small leaves: a dense speckle of light and dark leaves with dark gaps between clumps, a little shine
  { const m = M.boxLeaf, b = m.onBeforeCompile, k = m.customProgramCacheKey;
    m.onBeforeCompile = (sh, r) => { b(sh, r); sh.fragmentShader = sh.fragmentShader.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      { vec3 p = vDrawW; float l = vn(p * 60.0), l2 = vn(p * 22.0 + 4.0), gap = smoothstep(0.3, 0.08, vn(p * 28.0 + 9.0));
        diffuseColor.rgb *= (0.6 + 0.6 * l) * (0.78 + 0.32 * l2) * (1.0 - 0.6 * gap); roughnessFactor = 0.5 + 0.4 * (1.0 - l); }`); };
    m.customProgramCacheKey = () => k() + '-leaves'; }
  /* ---------- helpers ---------------------------------------------------------- */
  /* ---------- whole things ---------------------------------------------------------
     Every piece added in this file carries the middle of the thing it belongs to, and the fill turns it from
     drawing to material in one go when it reaches that point (see "whole" in scene.js). Before iteration 4 the
     fill ran through furniture tile by tile like through a wall, and for a second a bed was half ink and half
     cloth: you saw the pillows through the duvet. A piece on its own uses its own middle. thing(x, y, fn) gives
     everything added inside fn one middle: a bed with its pillows, a plant with its leaves, a lamp with its shade.
     Anything longer than 6.5 m (a garden wall, a water trough) stays with the room's tiles. The middle travels in
     the colour attribute, which no material here uses: x, z, and 2 plus its height (so what hangs from a ceiling arrives
     with the ceiling, not with the floor under it). */
  let THING = null;
  // (h: the height the thing counts as standing at, for the order of the fill. On the floor unless said: a pendant says the ceiling.)
  const thing = (x, y, fn, h) => { const was = THING; THING = THING || [WX(x), WZ(y), h == null ? 0.3 : h]; const r = fn(); THING = was; return r; };
  // scanned(fn): what fn adds turns real tile by tile, like a wall, with the fill's orange line running over it. For a fitted
  // piece too big to arrive in one go (the kitchen's cabinet wall stayed white paper, then snapped to oak: Sam, 13 Oct).
  const SCAN = 'scan';
  const scanned = (fn) => { const was = THING; THING = SCAN; const r = fn(); THING = was; return r; };
  const mark = (g, c) => { const n = g.attributes.position.count, col = new Float32Array(n * 3); for (let i = 0; i < n; i++) { col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = 2 + Math.min(8, Math.max(0, c[2] || 0)); } g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g; };
  const tagged = (bt) => {
    const add0 = bt.add.bind(bt);
    bt.add = (mat, geo, m) => {
      const g = geo.index ? geo.toNonIndexed() : geo.clone();
      if (!g.attributes.normal) g.computeVertexNormals();
      if (m) g.applyMatrix4(m);
      let c = THING;
      if (c === SCAN) c = null;
      else if (!c) { g.computeBoundingBox(); const b = g.boundingBox; if (Math.max(b.max.x - b.min.x, b.max.z - b.min.z) <= 6.5) c = [(b.min.x + b.max.x) / 2, (b.min.z + b.max.z) / 2, (b.min.y + b.max.y) / 2]; }
      if (c) mark(g, c);
      return add0(mat, g, null);
    };
    return bt;
  };
  tagged(B);
  const DEC = {};
  const dec = (zone) => DEC[zone] || (DEC[zone] = tagged(new FX.Batch()));
  const box = (bt, mat, x0, y0, x1, y1, z0, z1, r) =>
    bt.add(M[mat], FX.bevelBox(x1 - x0, z1 - z0, y1 - y0, r == null ? 0.01 : r), FX.M(WX((x0 + x1) / 2), (z0 + z1) / 2, WZ((y0 + y1) / 2)));
  // a box turned about its own middle (rot about the vertical, tilt about its width)
  const rbox = (bt, mat, cx, cy, z0, z1, w, d, r, rot, tilt) =>
    bt.add(M[mat], FX.bevelBox(w, z1 - z0, d, r == null ? 0.01 : r), FX.M(WX(cx), (z0 + z1) / 2, WZ(cy), tilt || 0, rot || 0, 0, 1, 1, 1, 'YXZ'));
  const cyl = (bt, mat, x, y, z0, z1, r0, r1, seg) =>
    bt.add(M[mat], new THREE.CylinderGeometry(r1 == null ? r0 : r1, r0, z1 - z0, seg || 28), FX.M(WX(x), (z0 + z1) / 2, WZ(y)));
  const ball = (bt, mat, x, y, z, r, sy, sx, sz) =>
    bt.add(M[mat], new THREE.SphereGeometry(r, 26, 16), FX.M(WX(x), z, WZ(y), 0, 0, 0, sx || 1, sy || 1, sz || sx || 1));
  const lathe = (bt, mat, x, y, z, pts, sx, sz) =>
    bt.add(M[mat], new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), 36), FX.M(WX(x), z, WZ(y), 0, 0, 0, sx || 1, 1, sz || sx || 1));
  // a thin rod between two points (x, y, z)
  const rod = (bt, mat, a, b, r) => {
    const p = new V3(WX(a[0]), a[2], WZ(a[1])), q = new V3(WX(b[0]), b[2], WZ(b[1])), d = q.clone().sub(p), l = d.length();
    const m = new THREE.Matrix4().compose(p.clone().add(q).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), d.normalize()), new V3(1, 1, 1));
    bt.add(M[mat], new THREE.CylinderGeometry(r, r, l, 8), m);
  };
  const R = FX.rng(2026), R0 = R;
  const VASE = [[0.0, 0], [0.09, 0], [0.13, 0.08], [0.15, 0.22], [0.11, 0.38], [0.055, 0.5], [0.05, 0.56], [0.065, 0.6]];
  const URN = [[0.0, 0], [0.16, 0], [0.26, 0.12], [0.3, 0.3], [0.24, 0.5], [0.15, 0.6], [0.17, 0.66]];
  const BOWL = [[0.0, 0], [0.07, 0], [0.16, 0.04], [0.21, 0.1], [0.2, 0.1], [0.15, 0.05], [0.0, 0.03]];
  const POT = [[0.0, 0], [0.2, 0], [0.27, 0.3], [0.3, 0.5], [0.27, 0.5], [0.0, 0.46]];
  // (the profile is rounded through its points and turned in 48 steps: with seven straight stretches and 36 steps a
  // ceramic lamp base showed its facets)
  const vase = (bt, mat, x, y, z, s, pts) => bt.add(M[mat], new THREE.LatheGeometry(new THREE.SplineCurve((pts || VASE).map(([r, h]) => new THREE.Vector2(r * s, h * s))).getPoints(30).map((v) => new THREE.Vector2(Math.max(0, v.x), v.y)), 48), FX.M(WX(x), z, WZ(y)));
  // dry branches standing in a vase
  const branches = (bt, x, y, z, h, n, mat) => thing(x, y, () => {
    for (let i = 0; i < n; i++) {
      const a = R() * 6.28, lean = 0.12 + R() * 0.3, hh = h * (0.7 + R() * 0.4);
      const tip = [x + Math.cos(a) * lean * hh, y + Math.sin(a) * lean * hh, z + hh];
      rod(bt, mat || 'twig', [x, y, z], tip, 0.006);
      for (let k = 0; k < 3; k++) {
        const t = 0.45 + R() * 0.5, b = [x + (tip[0] - x) * t, y + (tip[1] - y) * t, z + hh * t], a2 = R() * 6.28;
        rod(bt, mat || 'twig', b, [b[0] + Math.cos(a2) * 0.12, b[1] + Math.sin(a2) * 0.12, b[2] + 0.1 + R() * 0.1], 0.004);
      }
    }
  });
  // olive sprigs in a vase: twigs with small leaf blobs
  const sprigs = (bt, x, y, z, h, n) => thing(x, y, () => {
    for (let i = 0; i < n; i++) {
      const a = R() * 6.28, lean = 0.2 + R() * 0.35, hh = h * (0.65 + R() * 0.45);
      const tip = [x + Math.cos(a) * lean * hh, y + Math.sin(a) * lean * hh, z + hh];
      rod(bt, 'twig', [x, y, z], tip, 0.005);
      for (let k = 0; k < 7; k++) {
        const t = 0.35 + R() * 0.65;
        bt.add(M[R() < 0.5 ? 'foliage' : 'foliageL'], new THREE.SphereGeometry(0.035, 6, 5),
          FX.M(WX(x + (tip[0] - x) * t + (R() - 0.5) * 0.08), z + hh * t + (R() - 0.5) * 0.06, WZ(y + (tip[1] - y) * t + (R() - 0.5) * 0.08), R() * 3, R() * 3, 0, 1.9, 0.5, 0.8));
      }
    }
  });
  // An armful of olive branches standing in a vessel: wood as thin rods in two bends, leaves as the cards the olives
  // outdoors wear. Its own random numbers (seed), so nothing else in the house moves when one is added.
  const armful = (zone, x, y, z0, n, h0, hr, seed, spread) => {
    const Rb = FX.rng(seed), m4 = [], col = [], q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new V3(), o = [x, y, z0], sp = spread || 0.4;
    thing(x, y, () => { for (let i = 0; i < n; i++) {
      const a = Rb() * 6.28, lean = 0.12 + Rb() * sp, h = h0 + Rb() * hr;
      const mid = [o[0] + Math.cos(a) * lean * h * 0.3, o[1] + Math.sin(a) * lean * h * 0.3, o[2] + h * 0.55];
      const tip = [o[0] + Math.cos(a + 0.3) * lean * h * (0.85 + Rb() * 0.35), o[1] + Math.sin(a + 0.3) * lean * h * (0.85 + Rb() * 0.35), o[2] + h];
      rod(dec(zone), 'twig', o, mid, 0.006); rod(dec(zone), 'twig', mid, tip, 0.004);
      const k = 10 + Math.floor(Rb() * 6);
      for (let j = 0; j < k; j++) {
        const t = 0.38 + 0.66 * (j / k) + Rb() * 0.06, u = t < 0.55 ? t / 0.55 : (t - 0.55) / 0.45, p0 = t < 0.55 ? o : mid, p1 = t < 0.55 ? mid : tip;
        const P = [0, 1, 2].map((c) => p0[c] + (p1[c] - p0[c]) * u);
        e.set(Rb() * 6.28, Rb() * 6.28, Rb() * 6.28); q.setFromEuler(e); const s2 = (0.4 + Rb() * 0.3) * (h0 < 0.8 ? 0.75 : 1);
        m4.push(new THREE.Matrix4().compose(new V3(WX(P[0] + (Rb() - 0.5) * 0.1), P[2] + (Rb() - 0.5) * 0.08, WZ(P[1] + (Rb() - 0.5) * 0.1)), q.clone(), sc.set(s2, s2, s2).clone()));
        const sil = Rb(); col.push(new THREE.Color().setRGB(FX.lerp(0.84, 1.0, sil), FX.lerp(0.93, 1.02, sil), FX.lerp(0.76, 0.92, sil)));
      } } });
    A.tree({ m: m4, c: col }, zone);
  };
  // a vessel with a wide shoulder and a narrow neck
  const AMPHORA = [[0.0, 0], [0.1, 0], [0.17, 0.07], [0.2, 0.19], [0.17, 0.32], [0.09, 0.41], [0.065, 0.47], [0.08, 0.52]];
  const books = (bt, x, y, z, n, rot) => thing(x, y, () => { let zz = z; for (let i = 0; i < n; i++) { const h = 0.028 + R() * 0.02; rbox(bt, ['bk1', 'bk2', 'bk3', 'bk4'][(R() * 4) | 0], x, y, zz, zz + h, 0.3 - i * 0.02, 0.22 - i * 0.015, 0.003, (rot || 0) + (R() - 0.5) * 0.3); zz += h; } return zz; });
  const cushion = (bt, mat, cx, cy, z, w, h, d, rot, tilt) => rbox(bt, mat, cx, cy, z, z + h, w, d, Math.min(w, h, d) * 0.42, rot, tilt);
  // a pendant: a thin rod from the ceiling to a glowing globe, or a brass dome with a glowing disc under it
  const pendant = (bt, x, y, zTop, z, r, kind) => thing(x, y, () => {
    cyl(bt, 'black', x, y, z + r * 0.8, zTop, 0.005, 0.005, 6);
    if (kind === 'dome') {
      // brushed brass outside, white inside, a rolled rim, and the light up in the crown: from below a glow, not a white disc
      // across the rim (until 13 Oct. Sam: "make the two luminaires a little bit more premium, cleaner. I like the shape")
      bt.add(M.brass, new THREE.SphereGeometry(r, 48, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), FX.M(WX(x), z, WZ(y)));
      bt.add(M.white, new THREE.SphereGeometry(r * 0.975, 48, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), FX.M(WX(x), z - 0.003, WZ(y)));
      bt.add(M.brass, new THREE.TorusGeometry(r, 0.006, 8, 72), FX.M(WX(x), z, WZ(y), Math.PI / 2, 0, 0));
      cyl(bt, 'glowSoft', x, y, z + r * 0.42, z + r * 0.47, r * 0.42, r * 0.42, 24);
    } else if (kind === 'drum') {
      cyl(bt, 'glowSoft', x, y, z - r * 0.7, z + r * 0.7, r, r, 28);
      cyl(bt, 'brass', x, y, z + r * 0.7, z + r * 0.7 + 0.02, r * 1.02, r * 1.02, 28);
    } else ball(bt, 'glowSoft', x, y, z, r);
  }, zTop - 0.1);
  // a leafy plant in a pot: a stem and broad leaves
  const plant = (bt, x, y, z, h, potMat, s) => thing(x, y, () => {
    lathe(bt, potMat || 'ceramic', x, y, z, POT.map(([r, hh]) => [r * (s || 1), hh * (s || 1)]));
    const z0 = z + 0.46 * (s || 1);
    rod(bt, 'twig', [x, y, z0], [x + 0.04, y, z0 + h], 0.014);
    for (let i = 0; i < 16; i++) {
      const t = 0.3 + (i / 16) * 0.7, a = i * 2.4, l = 0.26 + R() * 0.12;
      bt.add(M[i % 3 ? 'foliage' : 'foliageL'], new THREE.SphereGeometry(l, 18, 10),
        FX.M(WX(x + Math.cos(a) * l * 0.9), z0 + h * t, WZ(y + Math.sin(a) * l * 0.9), 0.5 + R() * 0.5, -a, 0, 1, 0.07, 0.5, 'YXZ'));
    }
  });
  // Tall grass or an agave, as blades that taper to a point and arch outward. (Cones until 13 Oct, which read as
  // shards. Sam: "less triangular... add a little bit more life to it".) A blade is a strip of six segments, grown up its
  // own y and bent toward its z, then turned to its place. A wide spread makes an agave: few, broad, stiff leaves with a
  // little curl. A narrow one makes grass: many thin blades that arch over. The shared random numbers are drawn exactly
  // as before (three a blade), so nothing else in the house moves; the blade's own shape comes from its index.
  const bladeGeo = (len, w, arch, curl) => {
    const S = 6, pos = [], idx = [];
    for (let k = 0; k <= S; k++) {
      const t = k / S, ww = w * Math.pow(1 - t, 0.85) * (1 - 0.25 * Math.pow(1 - t, 6)), yy = len * (t - arch * 0.35 * t * t), zz = len * arch * t * t;
      pos.push(-ww / 2, yy, zz - curl * ww, ww / 2, yy, zz - curl * ww, 0, yy, zz + curl * ww * 0.6);   // left, right, and a midrib a little forward: a leaf with a fold
      if (k) { const o = (k - 1) * 3; idx.push(o, o + 3, o + 2, o + 2, o + 3, o + 5, o + 2, o + 5, o + 1, o + 1, o + 5, o + 4); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  };
  const clump = (bt, x, y, z, h, n, mat, spread, rnd) => thing(x, y, () => {
    const R = rnd || R0, sp = spread || 0.5, agave = sp >= 0.8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + R(), lean = sp * (0.3 + R() * 0.7), hh = h * (0.6 + R() * 0.5);
      const v = ((i * 7919) % 97) / 97;                                                    // this blade's own number, from its index
      const g = agave ? bladeGeo(hh * 0.95, 0.07 + 0.05 * v, 0.12 + 0.12 * v, 0.25) : bladeGeo(hh * 1.05, 0.016 + 0.012 * v, 0.35 + 0.35 * v, 0.15);
      bt.add(M[mat], g, FX.M(WX(x), z, WZ(y), 0, -a + Math.PI / 2, 0, 1, 1, 1, 'YXZ').multiply(new THREE.Matrix4().makeRotationX(lean * (agave ? 0.75 : 0.6))));
    }
  });
  // a curtain gathered into folds along a wall line (axis 'v': along y at x = c, 'h': along x at y = c)
  // A curtain hung in ripple folds along a wall line (axis 'v': along y at x = c, 'h': along x at y = c): even waves 12 cm
  // apart, a little irregular, a heavier hem that kicks out, in a linen with a weave, on a slim track at the top.
  // (13 Oct, Sam: "I like the curtain, but make it more premium". A plain sheet with sine folds until then.)
  const curtain = (zone, axis, c, a, b, z0, z1) => {
    const n = Math.max(12, Math.round((b - a) / 0.02)), g = new THREE.PlaneGeometry(b - a, z1 - z0, n, 8), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i), v = (p.getY(i) + (z1 - z0) / 2) / (z1 - z0), low = Math.pow(1 - v, 6);
      p.setZ(i, Math.sin(u * 52.4 + 0.3 * Math.sin(u * 7.1)) * (0.05 + 0.012 * low) + Math.sin(u * 9 + 1) * 0.012 + low * 0.025);
    }
    g.computeVertexNormals(); FX.uvMetres(g);
    const bt = dec(zone);
    bt.add(M.sheerLinen, g, FX.M(WX(axis === 'v' ? c : (a + b) / 2), (z0 + z1) / 2, WZ(axis === 'v' ? (a + b) / 2 : c), 0, axis === 'v' ? Math.PI / 2 : 0, 0));
    if (axis === 'v') box(bt, 'black', c - 0.035, a - 0.05, c + 0.035, b + 0.05, z1, z1 + 0.035, 0.003); else box(bt, 'black', a - 0.05, c - 0.035, b + 0.05, c + 0.035, z1, z1 + 0.035, 0.003);
  };
  // a pleated lampshade: an open drum whose wall runs in and out n times (r0 at the bottom, r1 at the top)
  const pleatGeo = (r0, r1, h, n) => {
    const g = new THREE.CylinderGeometry(r1, r0, h, n * 4, 1, true), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), k = 1 + 0.05 * Math.abs(Math.sin(Math.atan2(z, x) * n / 2)); p.setX(i, x * k); p.setZ(i, z * k); }
    g.computeVertexNormals(); return g;
  };
  // a lounge chair: seat, back, arms, on a low frame. rot 0 faces south (+y)
  const lounge = (bt, cx, cy, rot, mat, frame) => thing(cx, cy, () => {
    const c = Math.cos(rot || 0), s = Math.sin(rot || 0), at = (dx, dy) => [cx + dx * c + dy * s, cy - dx * s + dy * c];
    let q = at(0, 0.02); rbox(bt, mat, q[0], q[1], 0.2, 0.42, 0.78, 0.74, 0.09, rot);
    q = at(0, -0.3); rbox(bt, mat, q[0], q[1], 0.36, 0.86, 0.78, 0.2, 0.09, rot, -0.16);
    q = at(-0.42, 0.02); rbox(bt, mat, q[0], q[1], 0.2, 0.6, 0.14, 0.74, 0.06, rot);
    q = at(0.42, 0.02); rbox(bt, mat, q[0], q[1], 0.2, 0.6, 0.14, 0.74, 0.06, rot);
    q = at(0, 0.02); rbox(bt, frame || 'walnut', q[0], q[1], 0.1, 0.2, 0.8, 0.76, 0.02, rot);
    [[-0.34, -0.3], [0.34, -0.3], [-0.34, 0.33], [0.34, 0.33]].forEach(([dx, dy]) => { const l = at(dx, dy); cyl(bt, frame || 'walnut', l[0], l[1], 0, 0.1, 0.02, 0.025, 8); });
  });
  // a mound of lavender: grey-green leaf below, flower spikes above
  // A mound of lavender: a dense cushion of grey-green blades round a core, and flower spikes on thin stems above it.
  // (A smooth ball with purple beads on it until 13 Oct. Sam, on the garden: "the plants feel a little bit weak".) It still
  // makes the same draws from R as before, so the garden's layout after it stays where it was.
  const lavender = (bt, x, y, r) => thing(x, y, () => {
    const L = FX.rng(Math.round(x * 997 + y * 131));
    ball(bt, 'sageLeaf', x, y, r * 0.42, r * 0.8, 0.55);
    clump(bt, x, y, r * 0.15, r * 0.95, 28, 'sageLeaf', 0.7, L);
    const spike = (a, q, h, w) => { const tx = x + Math.cos(a) * q * 1.15, ty = y + Math.sin(a) * q * 1.15;
      rod(bt, 'sageLeaf', [x + Math.cos(a) * q * 0.5, y + Math.sin(a) * q * 0.5, r * 0.5], [tx, ty, h], 0.0035);
      ball(bt, 'lav', tx, ty, h + w * 2.2, w, 3.2); };
    for (let i = 0; i < 14; i++) { const a = R() * 6.28, q = Math.sqrt(R()) * r * 0.85; spike(a, q, r * (1.15 + R() * 0.4), Math.max(0.012, r * (0.06 + R() * 0.04))); }
    for (let i = 0; i < 16; i++) { const a = L() * 6.28, q = Math.sqrt(L()) * r * 0.85; spike(a, q, r * (1.1 + L() * 0.45), Math.max(0.012, r * (0.06 + L() * 0.04))); }
    clump(bt, x, y, r * 0.5, r * 1.25, 5, 'lav', 0.7); });
  // A lounger, its head to the north at y0 and its foot 2 m south, x its west edge: a recessed plinth in shadow, a base of
  // three teak boards with a shadow gap between them, a plump mattress with a rounded edge, a raised back on a teak support
  // with a bolster, a towel folded at the foot. (Walnut boxes with a flat mattress until 13 Oct. Sam: "I like the concept,
  // but just make it more premium".)
  const lounger = (d, x, y0, towel) => thing(x + 0.375, y0 + 1, () => {
    const cx = x + 0.375;
    box(B, 'black', x + 0.1, y0 + 0.16, x + 0.65, y0 + 1.84, 0, 0.08, 0.006);
    box(B, 'black', x + 0.016, y0 + 0.016, x + 0.734, y0 + 1.984, 0.08, 0.244, 0.004);
    [0.08, 0.135, 0.19].forEach((z) => box(B, 'teak', x, y0, x + 0.75, y0 + 2, z + 0.004, z + 0.052, 0.01));
    rbox(B, 'linenW', cx, y0 + 1.275, 0.244, 0.37, 0.72, 1.43, 0.05);
    rbox(B, 'teak', cx, y0 + 0.36, 0.38, 0.415, 0.6, 0.62, 0.008, 0, 0.6);
    rbox(B, 'linenW', cx, y0 + 0.33, 0.44, 0.55, 0.72, 0.66, 0.045, 0, 0.6);
    d.add(M.charcoal, new THREE.CylinderGeometry(0.075, 0.075, 0.6, 24), FX.M(WX(cx), 0.72, WZ(y0 + 0.18), 0, 0, Math.PI / 2));
    rbox(d, towel, cx, y0 + 1.66, 0.37, 0.405, 0.6, 0.36, 0.014, 0); rbox(d, towel, cx + 0.01, y0 + 1.68, 0.405, 0.43, 0.56, 0.3, 0.012, 0.04);
  });
  // a lantern: a bronze frame, a lid with a ring, a candle burning inside
  const lantern = (d, x, y) => {
    box(d, 'bronze', x - 0.12, y - 0.12, x + 0.12, y + 0.12, 0, 0.03, 0.004); box(d, 'bronze', x - 0.125, y - 0.125, x + 0.125, y + 0.125, 0.44, 0.47, 0.004);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(d, 'bronze', x + a * 0.106 - 0.012, y + b * 0.106 - 0.012, x + a * 0.106 + 0.012, y + b * 0.106 + 0.012, 0.03, 0.44, 0.002));
    d.add(M.bronze, new THREE.TorusGeometry(0.05, 0.007, 8, 24), FX.M(WX(x), 0.51, WZ(y)));
    cyl(d, 'white', x, y, 0.03, 0.2, 0.045, 0.045, 18); cyl(d, 'glow', x, y, 0.2, 0.235, 0.006, 0.012, 8);
  };
  // A counter stool: a cognac leather seat on a walnut shell, a low back on the side away from the counter, four slim
  // bronze legs and a footrest ring. (A leather disc on a black pole until 13 Oct. Sam: "a bunch of random shape".)
  const stool = (bt, x, y) => thing(x, y, () => {
    rbox(bt, 'walnutSolid', x, y, 0.6, 0.64, 0.44, 0.42, 0.012, 0, 0);
    rbox(bt, 'leather', x, y - 0.01, 0.64, 0.7, 0.42, 0.39, 0.022, 0, 0);
    [-0.17, 0.17].forEach((dx) => rod(bt, 'bronze', [x + dx, y + 0.18, 0.62], [x + dx, y + 0.2, 0.86], 0.009));
    rbox(bt, 'walnutSolid', x, y + 0.205, 0.76, 0.88, 0.42, 0.03, 0.01, 0, 0.14);
    [[-0.17, -0.16], [0.17, -0.16], [-0.17, 0.16], [0.17, 0.16]].forEach(([dx, dy]) => rod(bt, 'bronze', [x + dx, y + dy, 0.6], [x + dx * 1.25, y + dy * 1.25, 0], 0.011));
    bt.add(M.bronze, new THREE.TorusGeometry(0.23, 0.008, 8, 56), FX.M(WX(x), 0.27, WZ(y), Math.PI / 2, 0, 0));
  });

  /* ---------- art ---------------------------------------------------------------- */
  const PAL = ['#ece4d6', '#1f1b18', '#b8452a', '#c9a15a', '#8b8674', '#d9cdb8', '#3d3a33', '#6f7a5a', '#f4efe6'];
  /* Paintings: oil on canvas, one series. Each is a few fields of colour, bands of a landscape or the soft stacked blocks
     of a colour field, laid on in thousands of short brush strokes. A stroke is a handful of bristle lines that each
     carry a little more or less paint, so it shows its tooth. Where two fields meet, strokes from both cross the line,
     so no edge is ruled. Then a few accents: a horizon, a sun, one gesture.
     (13 Oct, Sam on the gallery: "make like art painting inside them instead of like random shape".) */
  const PAINTS = [
    { bands: [[0, '#eee2cd'], [0.36, '#e2c6a3'], [0.46, '#7d8b8e'], [0.55, '#b39969'], [0.73, '#3e352b']], wave: 0.025 },                       // coast at dawn
    { bands: [[0, '#c7cab6'], [0.5, '#858b66'], [0.78, '#c9b98d']], wave: 0.03, blobs: [[0.22, 0.52, 0.2, 0.11, '#3b4330'], [0.6, 0.48, 0.27, 0.13, '#475034'], [0.92, 0.53, 0.14, 0.09, '#3b4330']] },   // olive grove
    { bands: [[0, '#97482b']], blocks: [[0.1, 0.07, 0.9, 0.5, '#c5652f'], [0.1, 0.57, 0.9, 0.93, '#38221a']] },                                // terra
    { bands: [[0, '#2c333c'], [0.56, '#151920']], wave: 0.004, line: [0.56, '#d8d0bc'] },                                                      // night sea
    { bands: [[0, '#ece6da'], [0.6, '#d0c9bc'], [0.68, '#e9e3d6']], gesture: '#1e1b19' },                                                     // chalk
    { bands: [[0, '#d8a84e'], [0.64, '#9e5f2e'], [0.82, '#4a3223']], wave: 0.03, sun: [0.5, 0.32, 0.13, '#e3672a'] },                            // sun
    { bands: [[0, '#8e8981']], blocks: [[0.12, 0.08, 0.88, 0.4, '#d9d3c5'], [0.12, 0.47, 0.88, 0.92, '#393734']] },                             // stone
    { bands: [[0, '#5d1d18']], blocks: [[0.1, 0.08, 0.9, 0.54, '#201413'], [0.1, 0.61, 0.9, 0.92, '#8d2a1f']] },                               // ember
    { bands: [[0, '#dcdcd6'], [0.42, '#b9c0c0'], [0.5, '#8f9897'], [0.58, '#cfc8b8'], [0.8, '#a39a88']], wave: 0.015, line: [0.5, '#eeeae0'] },   // mist (over the bedroom's chest)
    { bands: [[0, '#d9c9a6'], [0.3, '#c9ad78'], [0.62, '#8e6b45'], [0.86, '#3f3227']], wave: 0.035 },                                       // field (the bedroom's ledge)
  ];
  const paint = (g, W, H, P, r) => {
    const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)), rgbS = (c, k) => `rgb(${c.map((v) => Math.max(0, Math.min(255, Math.round(v * k)))).join(',')})`;
    const ph = r() * 6.28, jit = () => (r() - 0.5) * 0.035;
    const at = (u, v, j) => {
      let c = P.bands[0][1]; const vw = v + (P.wave || 0.008) * Math.sin(u * 7 + ph) + (P.wave || 0.008) * 0.5 * Math.sin(u * 19 + ph * 2) + (j ? jit() : 0);
      P.bands.forEach(([v0, col]) => { if (vw >= v0) c = col; });
      (P.blocks || []).forEach(([a, b, c2, d2, col]) => { const e = j ? jit() : 0; if (u > a + e && u < c2 - e && v > b + e && v < d2 - e) c = col; });
      (P.blobs || []).forEach(([x, y, rx, ry, col]) => { if (((u - x) / rx) ** 2 + ((v - y) / ry) ** 2 < 1 + (j ? jit() * 12 : 0)) c = col; });
      if (P.sun && Math.hypot((u - P.sun[0]) * W / H, v - P.sun[1]) < P.sun[2] + (j ? jit() * 0.6 : 0)) c = P.sun[3];
      return c;
    };
    // the ground, in cells, then softened
    const cs = Math.max(6, Math.round(W / 60));
    for (let y = 0; y < H; y += cs) for (let x = 0; x < W; x += cs) { g.fillStyle = at(x / W, y / H, false); g.fillRect(x, y, cs + 1, cs + 1); }
    g.save(); g.filter = `blur(${Math.round(W / 70)}px)`; g.drawImage(g.canvas, 0, 0); g.restore();
    const bristle = (x, y, len, wid, ang, col, alpha) => {
      const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx, n = 5, c = hex(col), k0 = 0.94 + r() * 0.12;
      g.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const o = (i / (n - 1) - 0.5) * wid, l = len * (0.7 + r() * 0.3), s0 = (r() - 0.5) * len * 0.15;
        g.globalAlpha = alpha * (0.45 + r() * 0.55); g.strokeStyle = rgbS(c, k0 * (0.95 + r() * 0.1)); g.lineWidth = Math.max(1, (wid / n) * 1.7);
        g.beginPath(); g.moveTo(x + nx * o - dx * (l / 2 - s0), y + ny * o - dy * (l / 2 - s0));
        g.quadraticCurveTo(x + nx * (o + wid * 0.15 * (r() - 0.5)), y + ny * (o + wid * 0.15 * (r() - 0.5)), x + nx * o + dx * (l / 2 + s0), y + ny * o + dy * (l / 2 + s0)); g.stroke();
      }
      if (r() < 0.18) { g.globalAlpha = 0.18; g.strokeStyle = rgbS(c, 1.25); g.lineWidth = Math.max(1, wid * 0.12); g.beginPath(); g.moveTo(x + nx * wid * 0.45 - dx * len * 0.4, y + ny * wid * 0.45 - dy * len * 0.4); g.lineTo(x + nx * wid * 0.45 + dx * len * 0.4, y + ny * wid * 0.45 + dy * len * 0.4); g.stroke(); }
    };
    const N = Math.round((W * H) / 240);
    for (let i = 0; i < N; i++) {
      const u = r(), v = r(), col = at(u, v, true), big = r() < 0.25;
      bristle(u * W, v * H, W * (big ? 0.12 + r() * 0.1 : 0.04 + r() * 0.07), W * (big ? 0.03 + r() * 0.02 : 0.012 + r() * 0.018), (r() - 0.5) * 0.32 + (r() < 0.1 ? (r() - 0.5) * 1.2 : 0), col, 0.55 + r() * 0.4);
    }
    if (P.line) { const c = P.line[1]; for (let x = -0.02; x < 1.02; x += 0.012) bristle(x * W, (P.line[0] + Math.sin(x * 9 + ph) * 0.002) * H, W * 0.05, H * 0.006, (r() - 0.5) * 0.08, c, 0.8); }
    if (P.sun) { g.save(); g.filter = `blur(${Math.round(W / 18)}px)`; g.globalAlpha = 0.35; g.fillStyle = '#f2a04a'; g.beginPath(); g.arc(P.sun[0] * W, P.sun[1] * H, P.sun[2] * H * 1.5, 0, 6.3); g.fill(); g.restore(); }
    if (P.gesture) {
      // one sweep of a loaded brush across the canvas, along a smooth curve, running dry on the way
      const cv = new THREE.SplineCurve([[0.1, 0.55], [0.32, 0.45], [0.56, 0.5], [0.76, 0.58], [0.9, 0.5]].map(([u, v]) => new THREE.Vector2(u * W, v * H)));
      for (let t = 0; t < 1; t += 0.003) {
        const q = cv.getPoint(t), d = cv.getTangent(t);
        bristle(q.x, q.y, W * 0.04, W * (0.1 - 0.05 * t), Math.atan2(d.y, d.x), P.gesture, (1 - t * 0.6) * (r() < 0.1 + t * 0.45 ? 0.15 : 0.9));
      }
    }
    // the weave of the canvas, under everything that sits on top
    g.globalAlpha = 0.05; g.fillStyle = '#000'; for (let x = 0; x < W; x += 3) g.fillRect(x, 0, 1, H); for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
    g.globalAlpha = 1;
  };
  const artTex = (kind, w, h, seed) => FX.canvasTex(w, h, (g) => {
    if (kind === 'paint') { paint(g, w, h, PAINTS[(seed || 0) % PAINTS.length], FX.rng(100 + (seed || 0))); return; }        // (0 to 6 hang in the gallery, 8 and 9 in the bedroom)
    const r = FX.rng(seed || 1), m = Math.round(Math.min(w, h) * 0.085);
    g.fillStyle = '#f6f2ea'; g.fillRect(0, 0, w, h);                        // the mat
    g.save(); g.beginPath(); g.rect(m, m, w - 2 * m, h - 2 * m); g.clip();
    g.fillStyle = PAL[0]; g.fillRect(0, 0, w, h);
    const W = w - 2 * m, H = h - 2 * m;
    if (kind === 'field') { g.fillStyle = PAL[2]; g.fillRect(m + W * 0.08, m + H * 0.07, W * 0.84, H * 0.5); g.fillStyle = PAL[1]; g.fillRect(m + W * 0.08, m + H * 0.62, W * 0.84, H * 0.3); }
    else if (kind === 'sun') { g.fillStyle = PAL[1]; g.fillRect(m + W * 0.12, m + H * 0.08, W * 0.76, H * 0.36); g.fillStyle = PAL[2]; g.beginPath(); g.arc(w / 2, m + H * 0.7, W * 0.2, 0, 6.3); g.fill(); }
    else if (kind === 'bars') { g.fillStyle = PAL[6]; for (let k = 0; k < 7; k++) g.fillRect(m + W * 0.12, m + H * (0.1 + k * 0.105), W * 0.76, H * 0.045); g.fillStyle = PAL[3]; g.fillRect(m + W * 0.12, m + H * 0.86, W * 0.76, H * 0.04); }
    else if (kind === 'arcs') { g.strokeStyle = PAL[1]; g.lineWidth = Math.max(2, W * 0.006); for (let k = 1; k < 13; k++) { g.beginPath(); g.arc(m + W * 0.5, m + H * 0.98, W * 0.07 * k, Math.PI, 0); g.stroke(); } g.fillStyle = PAL[2]; g.beginPath(); g.arc(m + W * 0.5, m + H * 0.3, W * 0.07, 0, 6.3); g.fill(); }
    else if (kind === 'grid') { for (let j = 0; j < 9; j++) for (let i = 0; i < 6; i++) { g.fillStyle = [PAL[3], PAL[5], PAL[2], PAL[4], PAL[8], PAL[6]][(r() * 6) | 0]; g.fillRect(m + W * (0.1 + i * 0.136), m + H * (0.07 + j * 0.098), W * 0.11, H * 0.075); } }
    else if (kind === 'horizon') { const bands = ['#e9dfcf', '#dccfb9', '#c9b48f', '#a9a58f', '#7f8a86', '#58656a']; bands.forEach((c, k) => { g.fillStyle = c; g.fillRect(m, m + H * (0.3 + k * 0.1), W, H * 0.12); }); g.fillStyle = '#efe7da'; g.fillRect(m, m, W, H * 0.32); g.fillStyle = PAL[2]; g.beginPath(); g.arc(m + W * 0.7, m + H * 0.26, H * 0.07, 0, 6.3); g.fill(); }
    else if (kind === 'stroke') { g.strokeStyle = PAL[1]; g.lineCap = 'round'; for (let k = 0; k < 5; k++) { g.lineWidth = W * (0.03 + r() * 0.05); g.beginPath(); const x0 = m + W * (0.15 + r() * 0.2), y0 = m + H * (0.15 + k * 0.16); g.moveTo(x0, y0); g.bezierCurveTo(x0 + W * 0.3, y0 - H * 0.1 * r(), x0 + W * 0.4, y0 + H * 0.12 * r(), x0 + W * (0.45 + r() * 0.2), y0 + H * 0.03); g.stroke(); } }
    else if (kind === 'plan') {
      g.fillStyle = '#efe9dd'; g.fillRect(m, m, W, H);
      const k = Math.min(W / 70, H / 58), ox = m + (W - 62 * k) / 2, oy = m + (H - 50 * k) / 2;
      g.strokeStyle = PAL[1]; g.lineWidth = Math.max(2, k * 0.35);
      ROOMS.forEach((rm) => { if (!rm.outdoor) g.strokeRect(ox + rm.r[0] * k, oy + rm.r[1] * k, (rm.r[2] - rm.r[0]) * k, (rm.r[3] - rm.r[1]) * k); });
      g.lineWidth = Math.max(1, k * 0.12); g.strokeRect(ox + 21 * k, oy + 8 * k, 20 * k, 24 * k); g.strokeRect(ox + 41 * k, oy + 41 * k, 21 * k, 9 * k);
      g.fillStyle = PAL[2]; g.beginPath(); g.arc(ox + 30 * k, oy + 18 * k, k * 1.2, 0, 6.3); g.fill();
    }
    // Two abstract works for the living (13 Oct). First a sun and a red dot, then colour fields and brushstrokes that still
    // had hard edges (Sam: "more abstract than hard edge shape"). Now no edge at all: paint laid on soft, through a blur.
    // veil: deep earth colours that drift into each other, a warm light breaking through near the top.
    // gesture: a pale ground, one broad sweep of a dark wash, smoke-like, and a rust bloom under it.
    else if (kind === 'veil' || kind === 'gesture') {
      const S = W / 330, blob = (x, y, rx, ry, a, col, alpha, blur) => { g.save(); g.filter = `blur(${Math.round(blur * S)}px)`; g.globalAlpha = alpha; g.fillStyle = col;
        g.beginPath(); g.ellipse(m + W * x, m + H * y, W * rx, H * ry, a, 0, 6.3); g.fill(); g.restore(); };
      if (kind === 'veil') {
        g.fillStyle = '#8a5a40'; g.fillRect(m, m, W, H);
        blob(0.5, 0.8, 0.7, 0.3, 0.1, '#2b211d', 0.6, 40); blob(0.35, 0.55, 0.45, 0.22, -0.3, '#8a3a24', 0.75, 45);
        blob(0.68, 0.42, 0.4, 0.2, 0.4, '#a14a2a', 0.6, 50); blob(0.55, 0.22, 0.5, 0.2, 0.05, '#d8a65e', 0.9, 38);
        blob(0.45, 0.16, 0.3, 0.1, 0.0, '#f3dcae', 0.75, 26); blob(0.2, 0.9, 0.3, 0.12, 0.2, '#6d5a48', 0.5, 35);
        for (let k = 0; k < 30; k++) blob(r(), r(), 0.04 + r() * 0.12, 0.02 + r() * 0.06, r() * 3, ['#3b2f29', '#b0532e', '#c79a55', '#7a4a35'][(r() * 4) | 0], 0.12, 14);
      } else {
        g.fillStyle = '#e9e1d2'; g.fillRect(m, m, W, H);
        blob(0.55, 0.45, 0.5, 0.36, -0.5, '#cdbb9a', 0.55, 50); blob(0.4, 0.7, 0.3, 0.16, 0.3, '#a4512f', 0.45, 34);
        for (let k = 0; k < 26; k++) { const t = k / 25; blob(0.15 + t * 0.7, 0.62 - Math.sin(t * 2.6) * 0.3, 0.06 + 0.05 * Math.sin(t * 3.1), 0.035, -0.6 + t, '#24201c', 0.22, 10); }
        for (let k = 0; k < 14; k++) { const t = k / 13; blob(0.3 + t * 0.5, 0.25 + t * 0.08, 0.05, 0.02, 0.2, '#4a4038', 0.15, 8); }
      }
    }
    else if (kind === 'dots') { for (let k = 0; k < 60; k++) { g.fillStyle = k % 9 ? PAL[1] : PAL[2]; g.beginPath(); g.arc(m + W * (0.08 + r() * 0.84), m + H * (0.06 + r() * 0.88), W * (0.008 + r() * 0.02), 0, 6.3); g.fill(); } }
    else if (kind === 'ochre') { g.fillStyle = PAL[3]; g.fillRect(m + W * 0.1, m + H * 0.08, W * 0.8, H * 0.4); g.fillStyle = PAL[5]; g.fillRect(m + W * 0.1, m + H * 0.52, W * 0.8, H * 0.14); g.fillStyle = PAL[7]; g.fillRect(m + W * 0.1, m + H * 0.7, W * 0.8, H * 0.22); }
    else { g.fillStyle = PAL[1]; g.fillRect(m + W * 0.1, m + H * 0.08, W * 0.8, H * 0.84); g.fillStyle = PAL[2]; g.beginPath(); g.arc(m + W * 0.5, m + H * 0.5, W * 0.16, 0, 6.3); g.fill(); }
    // canvas tooth
    g.globalAlpha = 0.07; for (let i = 0; i < 1400; i++) { g.fillStyle = i % 2 ? '#fff' : '#000'; g.fillRect(r() * w, r() * h, 2, 9); }
    g.restore();
  });
  // a framed work on a wall. wall: which way the wall faces you from ('E' = on an east wall, facing west)
  const art = (zone, kind, wall, u, c, z, w, h, frame, seed) => thing(wall === 'E' || wall === 'W' ? c : u, wall === 'E' || wall === 'W' ? u : c, () => {
    const px = kind === 'paint' ? 720 : Math.round(256 * Math.min(2.4, Math.max(1, w))), tex = artTex(kind, px, Math.round((px * h) / w), seed);
    const m = new THREE.Mesh(mark(new THREE.PlaneGeometry(w, h), THING), drawable(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, envMapIntensity: 0.35 }), 'none', { side: THREE.FrontSide }));
    const e = 0.035, t = 0.03, f = frame || 'walnut';
    if (wall === 'E') { m.rotation.y = -Math.PI / 2; m.position.set(WX(c - e), z, WZ(u)); }
    else if (wall === 'W') { m.rotation.y = Math.PI / 2; m.position.set(WX(c + e), z, WZ(u)); }
    else if (wall === 'N') { m.position.set(WX(u), z, WZ(c + e)); }
    else { m.rotation.y = Math.PI; m.position.set(WX(u), z, WZ(c - e)); }
    scene.add(m); own([m], zone); m.castShadow = false;
    const bt = dec(zone), s = wall === 'E' || wall === 'S' ? -1 : 1, along = wall === 'E' || wall === 'W';
    const bar = (du, dz, lu, lz) => { const d0 = c + s * 0.005, d1 = c + s * 0.05;
      if (along) box(bt, f, Math.min(d0, d1), u + du - lu / 2, Math.max(d0, d1), u + du + lu / 2, z + dz - lz / 2, z + dz + lz / 2, 0.004);
      else box(bt, f, u + du - lu / 2, Math.min(d0, d1), u + du + lu / 2, Math.max(d0, d1), z + dz - lz / 2, z + dz + lz / 2, 0.004); };
    bar(0, h / 2 + t / 2, w + 2 * t, t); bar(0, -h / 2 - t / 2, w + 2 * t, t); bar(-w / 2 - t / 2, 0, t, h); bar(w / 2 + t / 2, 0, t, h);
  });
  /* ---------- soft things: pillows and bedding ---------------------------------------
     A box reads as a block of foam. A pillow is plump in the middle and thin at the seam,
     and a duvet has a little life in its surface and a soft edge. */
  // (firm: a sofa's seat or back cushion, which keeps more of its thickness out to a rounded welt)
  const pillowGeo = (w, h, t, firm) => {
    const g = new THREE.BoxGeometry(w, h, t, 18, 18, 2), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / (w / 2), v = p.getY(i) / (h / 2);
      // full in the middle, thinning all the way to the seam, corners drawn in (at 0.32 it stayed a slab to its edge)
      const f = Math.pow(Math.max(0, (1 - u * u) * (1 - v * v)), firm ? 0.18 : 0.5), k = 1 - (firm ? 0.04 : 0.13) * u * u * v * v;
      p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * (firm ? 0.45 + 0.55 * f : 0.12 + 0.88 * f));
    }
    g.computeVertexNormals();
    const lk = window.LINTEL_LOOK;                                        // (a look may put the cushion's seam in its UV, see look-options.js)
    return (lk && lk.pillowUv && lk.pillowUv(g)) || FX.uvMetres(g);
  };
  // z is what it rests on, lean tips it back toward the north (0 stands, -1.4 lies almost flat), rot turns it
  const pillow = (bt, mat, cx, cy, z, w, h, t, lean, rot, firm) =>
    bt.add(M[mat], pillowGeo(w, h, t, firm), FX.M(WX(cx), z + (h / 2) * Math.cos(lean || 0) + (t / 2) * Math.abs(Math.sin(lean || 0)), WZ(cy), lean || 0, rot || 0, 0, 1, 1, 1, 'YXZ'));
  // a slab of cloth lying flat: w along x, l along y, t thick. Its top rolls gently and its edge rounds off
  const softSlab = (w, t, l, amp, seed) => {
    const g = new THREE.BoxGeometry(w, t, l, 22, 1, 22), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      if (p.getY(i) < 0) continue;
      const x = p.getX(i), z = p.getZ(i);
      const e = Math.min(1, (w / 2 - Math.abs(x)) / 0.1) * Math.min(1, (l / 2 - Math.abs(z)) / 0.1), es = e * e * (3 - 2 * e);
      p.setY(i, p.getY(i) - (1 - es) * t * 0.42 + es * amp * (Math.sin(x * 6.3 + seed) * Math.sin(z * 4.1 + seed * 2) + 0.6 * Math.sin(x * 2.2 + z * 5.3 + seed)));
    }
    g.computeVertexNormals();
    return FX.uvMetres(g);
  };
  const cloth = (bt, mat, cx, cy, z, w, t, l, amp, seed) => bt.add(M[mat], softSlab(w, t, l, amp == null ? 0.01 : amp, seed || 1), FX.M(WX(cx), z + t / 2, WZ(cy)));

  /* A sheet of cloth laid over a block: flat on top with a little life in it, rolling over the block's edges with
     radius r, then hanging, its corners rounded, the hanging part falling in folds that deepen on the way down.
     w across the block, l along it, hang: how far it falls past [west, east, south, north]. The outside review, three
     rounds running: "the duvet is still a box... the part of the throw that drops over the side is a flat card". */
  const drapeGeo = (w, l, r, hang, amp, puff, seed) => {
    const [hW, hE, hS, hN] = hang, U = w + hW + hE, V = l + hS + hN;
    const nu = Math.max(8, Math.ceil(U / 0.035)), nv = Math.max(8, Math.ceil(V / 0.035));
    const g = new THREE.PlaneGeometry(1, 1, nu, nv), p = g.attributes.position, uv = g.attributes.uv;
    const sm = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
    for (let iy = 0; iy <= nv; iy++) for (let ix = 0; ix <= nu; ix++) {
      const i = iy * (nu + 1) + ix, u = -(w / 2 + hW) + (ix / nu) * U, v = -(l / 2 + hN) + (iy / nv) * V;
      const dx = Math.max(0, Math.abs(u) - w / 2), dy = Math.max(0, Math.abs(v) - l / 2), e0 = Math.hypot(dx, dy);
      // (at a corner the sheet's own corner would hang 40 percent lower than its sides, to a point: there the hem follows
      // an ellipse between the two sides' lengths, as if the corner were tucked)
      let e = e0;
      if (dx > 0 && dy > 0) { const hx = u < 0 ? hW : hE, hy = v < 0 ? hN : hS; e = Math.min(e0, hx > 0 && hy > 0 ? 1 / Math.hypot(dx / e0 / hx, dy / e0 / hy) : 0); }
      const a = Math.min(e / r, Math.PI / 2), out = r * Math.sin(a), down = r * (1 - Math.cos(a)) + Math.max(0, e - r * Math.PI / 2);
      const nx = e0 > 0 ? (dx / e0) * Math.sign(u) : 0, ny = e0 > 0 ? (dy / e0) * Math.sign(v) : 0;
      const along = u * Math.abs(ny) + v * Math.abs(nx);                                    // where you are along the edge it hangs from
      const fold = amp * sm((e - r * 0.5) / 0.22) * (0.45 + 1.1 * Math.min(1, down / 0.3)) * (0.62 * Math.sin(along * 8.3 + seed) + 0.38 * Math.sin(along * 19.7 + seed * 2.3));
      const top = (1 - sm(e / r)) * puff * (0.6 * Math.sin(u * 5.1 + seed) * Math.sin(v * 4.3 + seed * 1.7) + 0.4 * Math.sin(u * 2.3 + v * 3.1 + seed));
      const hem = sm((e - r * 2) / 0.2) * 0.012 * Math.sin(along * 5.1 + seed * 3.1);        // a hem is never ruled
      p.setXYZ(i, Math.max(-w / 2, Math.min(w / 2, u)) + nx * (out + fold), -down + top + hem, Math.max(-l / 2, Math.min(l / 2, v)) + ny * (out + fold));
      uv.setXY(i, u, v);
    }
    g.computeVertexNormals();
    return g;
  };
  // cx, cy: the middle of the block it lies on, z: the block's top
  const drape = (bt, mat, cx, cy, z, w, l, r, hang, amp, puff, seed) => bt.add(M[mat], drapeGeo(w, l, r, hang, amp == null ? 0.012 : amp, puff == null ? 0.008 : puff, seed || 1), FX.M(WX(cx), z, WZ(cy)));

  const plinth = (bt, x, y, h, s) => box(bt, 'travBlock', x - (s || 0.26), y - (s || 0.26), x + (s || 0.26), y + (s || 0.26), 0, h, 0.008);

  const lights = [];
  let flameMat = null;
  // Flames, as quads that face the room: tongues that narrow, lean and tear off upward. One clock (FLAME_U) for every
  // fire in the house: scene.js sets it once a frame through the material it is handed back (flame).
  const FLAME_U = { uTime: { value: 0 } };
  const flameShader = () => new THREE.ShaderMaterial({
    uniforms: FLAME_U,
    vertexShader: 'attribute float aSeed; varying vec2 vUv; varying float vSeed; void main() { vUv = uv; vSeed = aSeed; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime; varying vec2 vUv; varying float vSeed;
      float h2(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
      float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }
      float fbm(vec2 p) { return 0.55 * n2(p) + 0.3 * n2(p * 2.1 + 3.7) + 0.15 * n2(p * 4.3 + 9.1); }
      void main() {
        float y = vUv.y, t = uTime * 1.25 + vSeed * 5.0;
        float x = (vUv.x - 0.5) * 2.0 + (fbm(vec2(y * 2.4 - t * 1.1, vSeed)) - 0.5) * 1.1 * y;             // the higher, the more it leans about
        float w = pow(1.0 - y, 0.75) * (0.5 + 0.3 * fbm(vec2(vSeed * 3.1, t * 0.7)));                       // a tongue narrows to its tip
        float body = 1.0 - smoothstep(0.25, 1.0, abs(x) / max(w, 0.03));
        float lick = fbm(vec2(x * 3.2 + vSeed * 2.0, y * 3.6 - t * 2.6));                                    // pieces tearing off upward
        float f = body * smoothstep(0.2, 0.7, lick + (1.0 - y) * 0.7) * smoothstep(0.0, 0.05, y) * (1.0 - smoothstep(0.55, 1.0, y));
        vec3 col = mix(vec3(1.0, 0.24, 0.03), vec3(1.0, 0.8, 0.36), smoothstep(0.2, 0.85, f * (1.25 - y * 0.7)));
        gl_FragColor = vec4(col * f * 1.7, 1.0);
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneMinusDstAlphaFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  });
  // A sheet of fire for a linear firebox: x along the box, y up. The height of the fire wanders along it at two scales, the
  // tongues are ridges that drift and sway, the body tears upward, the root is blue and the ends fade.
  const flameSheet = () => new THREE.ShaderMaterial({
    uniforms: FLAME_U,
    vertexShader: 'attribute float aSeed; varying vec2 vUv; varying float vSeed; void main() { vUv = uv; vSeed = aSeed; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime; varying vec2 vUv; varying float vSeed;
      float h2(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
      float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }
      float fbm(vec2 p) { return 0.55 * n2(p) + 0.3 * n2(p * 2.1 + 3.7) + 0.15 * n2(p * 4.3 + 9.1); }
      void main() {
        float t = uTime * 1.15 + vSeed * 7.0, u = vUv.x, v = vUv.y;
        float hgt = 0.3 + 0.5 * fbm(vec2(u * 6.0 + vSeed * 3.0, t * 0.5)) + 0.3 * fbm(vec2(u * 17.0 - t * 0.35, vSeed + t * 0.2));
        float sway = (fbm(vec2(u * 9.0 + vSeed, v * 2.5 - t * 1.4)) - 0.5) * 0.06 * v;
        float tongue = 0.5 + 0.5 * sin((u + sway) * 62.0 + fbm(vec2(u * 5.0, t * 0.7)) * 7.0 + vSeed);
        float y = v / max(hgt, 0.05), lick = fbm(vec2((u + sway) * 22.0, v * 4.5 - t * 2.4));
        float f = 1.0 - smoothstep(0.3, 1.0, y + (lick - 0.5) * 0.7 - (tongue - 0.5) * 0.35 * smoothstep(0.15, 0.6, y));
        f *= smoothstep(0.0, 0.05, v) * smoothstep(0.0, 0.05, u) * smoothstep(0.0, 0.05, 1.0 - u);
        vec3 col = mix(vec3(0.95, 0.2, 0.02), vec3(1.0, 0.82, 0.45), smoothstep(0.2, 0.9, f * (1.35 - y * 0.85)));
        col = mix(col, vec3(0.3, 0.45, 1.0), (1.0 - smoothstep(0.0, 0.09, v)) * 0.55);
        gl_FragColor = vec4(col * f * 1.25, 1.0);
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneMinusDstAlphaFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  });
  // A lamp is a place where light comes from, not a light of its own: scene.js keeps four real lights and moves them
  // to whichever lamps are near the camera (see lampPool). far: from how far off it still matters (metres).
  const lamp = (zone, x, y, z, color, k, dist, fire, far) => lights.push({ l: { intensity: 0 }, zone, k, fire: fire ? 'bowl' : null, x: WX(x), y: z, z: WZ(y), color, dist: dist || 7, decay: 1.7, far });

  /* ================= the front of the house ======================================= */
  {
    const d = dec('ext');
    const C = A.court;                                                     // the forecourt's gravel, 8 cm under the house's floor (scene.js, COURT)
    // oak fins on the wall west of the door, a bench under the canopy
    for (let i = 0; i < 11; i++) { box(B, 'oakFin', 11.5 + i * 0.2, 26.2, 11.56 + i * 0.2, 26.34, C, 4.2, 0.004); A.cap(11.5 + i * 0.2, 26.2, 11.56 + i * 0.2, 26.34, 0.02, 4.2); }   // each fin a solid tick in the cut, like a wall
    // (The bench was a block of the path's travertine until 13 Oct. Sam: it matched the path, "so it doesn't make sense".
    // Now it is the fins' oak, one piece of joinery with the screen behind it.)
    // (1.5 m since 14 Oct: at 1.9 its end stood 10 cm from the path. Sam: "reduce the width a little bit so it doesn't overlap the path")
    box(B, 'oakBench', 11.5, 26.6, 13.0, 27.1, C, 0.44, 0.012);
    cushion(d, 'boucle', 11.95, 26.85, 0.44, 0.7, 0.09, 0.44, 0);
    // one slim wall light, right of the door (one each side until 14 Oct; Sam: "keep one, the right, the left you can remove")
    // (12 cm deep. At 7 cm the far edge of each was a step too small to outline from the path: a row of dashes that moved)
    [16.55].forEach((x) => { box(B, 'frame', x - 0.03, 26.2, x + 0.03, 26.32, 1.5, 2.3, 0.004); box(d, 'glow', x - 0.012, 26.318, x + 0.012, 26.326, 1.56, 2.24, 0.001); });
    // planting west of the path: grasses and three boulders
    [[12.2, 29.6, 0.5, 3], [11.4, 31.0, 0.34, 5], [12.6, 32.3, 0.42, 9]].forEach(([x, y, r, sd]) => d.add(M.drystone, FX.boulder(r, sd, 0.5), FX.M(WX(x), r * 0.35 + C, WZ(y), 0, sd, 0)));
    for (let i = 0; i < 16; i++) { const x = 10.6 + R() * 2.5, y = 29.0 + R() * 4.6; clump(d, x, y, C, 0.7 + R() * 0.5, 9, R() < 0.6 ? 'straw' : 'foliageL', 0.55); }
    // The same east of the path, where a reflecting pool lay until 13 Oct. Sam: it read as "a glass inside the concrete"
    // and the two sides of the path did not match. Now both sides are gravel with grasses and three boulders.
    // (Its own random numbers, so nothing placed after it moves.)
    { let sd = 20261013; const R2 = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };
      [[17.9, 30.9, 0.46, 13], [18.7, 32.2, 0.36, 15], [17.5, 33.4, 0.4, 19]].forEach(([x, y, r, s2]) => d.add(M.drystone, FX.boulder(r, s2, 0.5), FX.M(WX(x), r * 0.35 + C, WZ(y), 0, s2, 0)));
      // (from 30.6 south: nearer the wall a clump put one fat blade of grass across the corner of the picture at the door)
      for (let i = 0; i < 16; i++) { const x = 17.1 + R2() * 2.5, y = 30.6 + R2() * 3.4; clump(d, x, y, C, 0.7 + R2() * 0.5, 9, R2() < 0.6 ? 'straw' : 'foliageL', 0.55, R2); } }
    // an olive in a stone planter on each side
    [[10.3, 27.7, 31], [20.2, 27.9, 47]].forEach(([x, y, sd]) => {
      lathe(B, 'travBlock', x, y, C, [[0, 0], [0.62, 0], [0.78, 0.5], [0.8, 0.66], [0.72, 0.66], [0, 0.6]]);
      tree(olive(A.extBark, M.barkFar, x, y, 0.58, sd, A.LOW ? 500 : 1100, 0.6 + C, null, 0.6), 'ext'); A.crowns.push([x, y, 0.58, 0.6 + C]);
    });
    // The arrival court. From above it was "a blank slab" of gravel, and the garage an empty box. Now bands of the
    // path's stone cross the gravel every 2.6 m, three young olives stand in stone rings east of the path, and three
    // cars are in the garage (decor: on the drawing they are the plan's own car symbols).
    // (flat sheets of paving, level with the path. As slabs with bevelled edges they stood on the plan as rows of faint ticks.)
    // (in the path's limestone since 13 Oct, and down in the gravel with it: 12 mm over the chippings, as they were)
    [34.0, 36.6, 39.2, 41.6].forEach((y) => { A.ground(M.pathSlab, -0.6, y - 0.22, 13.3, y + 0.22, C + 0.012); A.ground(M.pathSlab, 16.7, y - 0.22, 22.7, y + 0.22, C + 0.012); });
    [[20.5, 35.3, 61], [21.3, 37.95, 67], [20.2, 40.45, 73]].forEach(([x, y, sd]) => {
      // (the ring stands 16 cm out of the gravel. At 8 cm it was a step the outline test draws in pieces from above)
      B.add(M.travBlock, new THREE.CylinderGeometry(0.85, 0.85, 0.2 - C, 44, 1, true), FX.M(WX(x), 0.06 + C / 2, WZ(y))); B.add(M.travBlock, new THREE.RingGeometry(0.66, 0.85, 44), FX.M(WX(x), 0.16, WZ(y), -Math.PI / 2, 0, 0));
      tree(olive(A.extBark, M.bark, x, y, 0.62, sd, A.LOW ? 600 : 2200, 0.0, null, 0.5), 'ext'); A.crowns.push([x, y, 0.62, 0.0]);      // (dark bark and a dense crown: from above they were pale scraps)
    });
    {
      const g = dec('entrance');
      [2.05, 4.55, 7.05].forEach((x, i) => thing(x, 27.45, () => {                                  // where the plan draws its three car symbols
        const y0 = 25.1, paint = ['car', 'inkObj', 'stoneW'][i];
        box(g, paint, x - 0.94, y0, x + 0.94, y0 + 4.7, 0.3, 0.86, 0.16);                                 // the body
        box(g, 'black', x - 0.8, y0 + 1.25, x + 0.8, y0 + 3.6, 0.84, 1.38, 0.2);                             // the glasshouse
        box(g, paint, x - 0.74, y0 + 1.5, x + 0.74, y0 + 3.3, 1.36, 1.41, 0.02);                             // the roof
        [[-0.86, 0.95], [0.86, 0.95], [-0.86, 3.75], [0.86, 3.75]].forEach(([dx, dy]) => g.add(M.black, new THREE.CylinderGeometry(0.34, 0.34, 0.24, 20), FX.M(WX(x + dx), 0.34, WZ(y0 + dy), 0, 0, Math.PI / 2)));
      }));
    }
    // the house's number by the door (its name stood here until 13 Oct)
    // (in the page's display face, so stencil letters when the stencil type is on)
    const face = (getComputedStyle(document.documentElement).getPropertyValue('--display') || '').split(',')[0].trim().replace(/['"]/g, '') || 'Geist Mono';
    if (document.fonts) await Promise.race([document.fonts.load(`400 92px "${face}"`).catch(() => null), new Promise((r) => setTimeout(r, 2000))]);
    // Real numerals: cut from bronze 3.5 cm thick and held 1.5 cm off the wall, so they throw a shadow and show their
    // sides. (First a flat cut-out. Sam, 13 Oct: "right now it feels like a stamp... add some depth, like we're hanging
    // [it] on the wall".) The page has its type as a font, not as shapes, so the number is drawn once on a canvas and
    // read back row by row: every run of ink in a row becomes a small bar, and a run that repeats in the next row grows.
    const HOUSE_NO = '14';                                                                                            // one word to change
    {
      const CW = 512, CH = 320, WM = 0.88, cx = 17.95, cz = 2.12;     // (1.62 until 14 Oct: now its top lines up with the light's)                       // canvas pixels, metres on the wall, where its middle is
      const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
      const g = cv.getContext('2d', { willReadFrequently: true });
      g.fillStyle = '#fff'; g.font = `400 250px "${face}", "Geist Mono"`; g.letterSpacing = '14px'; g.textBaseline = 'middle'; g.textAlign = 'center';
      g.fillText(HOUSE_NO, CW / 2 + 7, CH / 2 + 10, CW - 20);
      const px = g.getImageData(0, 0, CW, CH).data, ink = (x, y) => px[(y * CW + x) * 4 + 3] > 127;
      const bars = [];
      let open = [];
      for (let y = 0; y <= CH; y++) {
        const runs = [];
        if (y < CH) for (let x = 0; x < CW; x++) if (ink(x, y)) { let x1 = x; while (x1 < CW && ink(x1, y)) x1++; runs.push([x, x1]); x = x1; }
        const next = [];
        open.forEach((bar) => { const same = runs.find((r) => r[0] === bar[0] && r[1] === bar[1]); if (same) { same.used = true; bar[3] = y + 1; next.push(bar); } else bars.push(bar); });
        runs.forEach((r) => { if (!r.used) next.push([r[0], r[1], y, y + 1]); });
        open = next;
      }
      // (brushed stainless steel since 14 Oct, Sam: "a nice metallic silver texture instead of brown". Dark bronze before.)
      M.numeral = drawable(new THREE.MeshStandardMaterial({ color: (window.LINTEL_FACADE && window.LINTEL_FACADE.nameColor) || 0xc9ccce, metalness: 1, roughness: 0.3, envMapIntensity: 1.25 }), 'none', { side: THREE.FrontSide, room: 'ext' });
      const k = WM / CW, x0 = cx - WM / 2, zTop = cz + (CH * k) / 2;
      // (in the decor batch: on the drawing a number of a thousand small bars drew itself as a grey smudge, so it waits for the material)
      thing(cx, 26.23, () => bars.forEach(([p0, p1, r0, r1]) => d.add(M.numeral, new THREE.BoxGeometry((p1 - p0) * k, (r1 - r0) * k, 0.035), FX.M(WX(x0 + ((p0 + p1) / 2) * k), zTop - ((r0 + r1) / 2) * k, WZ(26.2325)))), cz);
    }
  }

  /* ================= entrance ======================================================= */
  {
    const d = dec('entrance');
    // the console: one block of smoked oak (a block of the floor's travertine until 13 Oct. Sam: "doesn't really make
    // sense to have tiles on the sides")
    box(B, 'oakConsole', 11.25, 19.3, 11.85, 23.7, 0, 0.86, 0.01);
    vase(d, 'ceramic', 11.55, 20.1, 0.86, 1.25, URN);
    sprigs(tagged(new FX.Batch()), 11.55, 20.1, 1.6, 1.25, 9);                          // (the nine thin sprigs that stood here: built and thrown away, so the shared random numbers stay in step)
    // an armful of olive branches in the urn (Sam, 13 Oct: "a little bit more full, or something more premium")
    armful('entrance', 11.55, 20.1, 0.86 + 0.66 * 1.25 - 0.3, 14, 1.0, 0.8, 1402);
    const top = books(d, 11.55, 21.5, 0.86, 3, 1.5); ball(d, 'brass', 11.55, 21.5, top + 0.07, 0.07);
    lathe(d, 'inkObj', 11.55, 22.9, 0.86, BOWL.map(([r, h]) => [r * 1.5, h * 1.5]));
    cyl(d, 'glowSoft', 11.5, 23.4, 0.9, 1.22, 0.08, 0.08, 20); cyl(d, 'brass', 11.5, 23.4, 0.86, 0.9, 0.1, 0.1, 20);
    // a tall urn with dry branches by the door
    vase(B, 'inkObj', 12.5, 24.9, 0, 1.9, URN); branches(d, 12.5, 24.9, 1.2, 1.9, 8);
    // a bench under a round mirror (a wool runner lay down the middle of the room until 13 Oct. Sam: the floor is one
    // field of marble now, and the runner "should be unified with the whole floor")
    thing(18.56, 23.5, () => {
    box(B, 'walnut', 18.3, 22.5, 18.82, 24.5, 0.34, 0.42, 0.01); box(B, 'black', 18.36, 22.6, 18.4, 22.64, 0, 0.34, 0.004); box(B, 'black', 18.72, 22.6, 18.76, 22.64, 0, 0.34, 0.004);
    box(B, 'black', 18.36, 24.36, 18.4, 24.4, 0, 0.34, 0.004); box(B, 'black', 18.72, 24.36, 18.76, 24.4, 0, 0.34, 0.004);
    cushion(d, 'leather', 18.56, 23.5, 0.42, 0.44, 0.07, 1.9, 0);
    });
    d.add(M.brass, new THREE.CylinderGeometry(0.82, 0.82, 0.03, 48), FX.M(WX(18.84), 2.0, WZ(23.5), 0, 0, Math.PI / 2));
    d.add(M.glassMirror, new THREE.CylinderGeometry(0.77, 0.77, 0.034, 48), FX.M(WX(18.838), 2.0, WZ(23.5), 0, 0, Math.PI / 2));
    // Four slender brass light bars in the tall volume, each hung on two fine cables, each turned a different way and tipped
    // out of level, at four heights: lines of light at an angle, crossing one another in the air. A warm line of light runs
    // along the underside of each. (Five opal globes until 13 Oct, then three brass rings. Sam, 14 Oct: "I prefer something
    // more at an angle... right now it feels like a bunch of circles attached with string".)
    const bar = (x, y, z, L, yaw, tilt) => thing(x, y, () => {
      const dx = Math.cos(yaw) * L / 2, dy = Math.sin(yaw) * L / 2, dz = Math.sin(tilt) * L / 2;
      rod(d, 'brass', [x - dx, y - dy, z - dz], [x + dx, y + dy, z + dz], 0.017);
      rod(d, 'glow', [x - dx * 0.97, y - dy * 0.97, z - dz * 0.97 - 0.016], [x + dx * 0.97, y + dy * 0.97, z + dz * 0.97 - 0.016], 0.0065);
      [-0.42, 0.42].forEach((t) => { const px = x + dx * 2 * t, py = y + dy * 2 * t, pz = z + dz * 2 * t;
        rod(d, 'black', [px, py, pz + 0.017], [px, py, 4.79], 0.0018); cyl(d, 'brass', px, py, 4.775, 4.8, 0.035, 0.035, 20); });
    }, 4.7);
    bar(15.1, 21.0, 3.6, 2.4, 0.35, 0.1); bar(15.3, 20.7, 3.18, 2.0, -0.55, -0.14); bar(14.95, 21.3, 2.82, 1.7, 1.15, 0.12); bar(15.45, 21.05, 2.5, 1.3, -1.2, -0.09);
    lamp('entrance', 15.2, 20.9, 2.9, 0xffd6a0, 4.5, 9);
    art('entrance', 'field', 'W', 21.5, 11.13, 2.75, 2.2, 2.8, 'black', 3);
  }

  /* ================= living ========================================================= */
  {
    const d = dec('living');
    const look = window.LINTEL_LOOK, back = look ? look.enter(M) : null;      // a look for the living room swaps in its own materials here (?look=, look-options.js)
    // The pit's seating, three runs round a low table, open to the east. (13 Oct, Sam: "since this furniture is all in code,
    // can you build something more premium, especially with the texture... the side that has four, there's one exceeding the
    // furniture, take the whole space like the one that has six... make the pillows nicer, like a premium couch".)
    // The south run now runs the pit's full length like the north one, its last back cushion no longer past its end. Each
    // run: a dark recessed plinth, a base in the sofa's wool, separate seat cushions with a rounded welt and a gap between
    // them, plump back cushions leaning into the pit's edge. The wool is a deeper oatmeal boucle with more loop to it.
    thing(15.0, 12.7, () => {
    const seatRun = (x0, y0, x1, y1, along) => {
      box(B, 'black', x0 + 0.04, y0 + 0.04, x1 - 0.04, y1 - 0.04, -0.45, -0.38, 0.004);
      box(B, 'sofaWool', x0, y0, x1, y1, -0.38, -0.21, 0.03);
      const L = along === 'x' ? x1 - x0 : y1 - y0, n = Math.max(1, Math.round(L / 0.95)), w = L / n;
      for (let i = 0; i < n; i++) {
        const c = (along === 'x' ? x0 : y0) + (i + 0.5) * w;
        if (along === 'x') pillow(B, 'sofaWool', c, (y0 + y1) / 2, -0.21, w - 0.012, y1 - y0 - 0.02, 0.19, -Math.PI / 2, 0, true);
        else pillow(B, 'sofaWool', (x0 + x1) / 2, c, -0.21, w - 0.012, x1 - x0 - 0.02, 0.19, -Math.PI / 2, Math.PI / 2, true);
      }
    };
    seatRun(12.1, 10.6, 17.9, 11.5, 'x'); seatRun(12.1, 11.5, 13.0, 14.1, 'y'); seatRun(12.1, 14.1, 17.9, 14.9, 'x');
    // back cushions: six along the north and the south, three along the west
    for (let i = 0; i < 6; i++) pillow(d, 'sofaWool', 12.7 + i * 0.93, 10.8, -0.04, 0.9, 0.5, 0.24, -0.2, 0, true);
    // (turned +90 degrees since 14 Oct: at -90 the west row's backs leaned forward into the pit, Sam: "the angle feels inward")
    for (let i = 0; i < 3; i++) pillow(d, 'sofaWool', 12.3, 12.1 + i * 0.93, -0.04, 0.9, 0.5, 0.24, -0.2, Math.PI / 2, true);
    for (let i = 0; i < 6; i++) pillow(d, 'sofaWool', 12.7 + i * 0.93, 14.7, -0.04, 0.9, 0.5, 0.24, -0.2, Math.PI, true);
    // Scatter cushions, the same on the north and the south run: a linen square and a terracotta one in the west corner, a
    // charcoal square with an ochre bolster in front of it at the open end; two sage squares in the middle of the west run.
    // Each stands on the seat and leans into the back cushion behind it. [material, x, y, row n, w or s, turn, width, height]
    const sc = [['linenW', 12.95, 0.1, 0.56, 0.52], ['rust', 13.52, -0.08, 0.46, 0.42], ['ochre', 16.6, 0.04, 0.6, 0.28], ['charcoal', 17.28, -0.1, 0.54, 0.5]];
    sc.forEach(([m, x, a, w, h]) => { pillow(d, m, x, 11.1, -0.02, w, h, 0.16, -0.26, a, false); pillow(d, m, x, 14.4, -0.02, w, h, 0.16, -0.26, Math.PI - a, false); });
    [[12.35, 0.08], [13.15, -0.1]].forEach(([y, a]) => pillow(d, 'sage', 12.6, y, -0.02, 0.5, 0.46, 0.16, -0.26, Math.PI / 2 + a));
    // a heavy throw laid over the north run's seat and down its front, clear of the cushion under it (it sank into it before)
    drape(d, 'ochre', 15.2, 11.2, 0.005, 0.8, 0.6, 0.04, [0, 0, 0.3, 0], 0.012, 0.006, 9);
    });
    thing(15.3, 12.85, () => {
    // the low table: one block of the path's limestone (travertine with its tile joints until 13 Oct), a stack of books
    // with a dark sphere, and a wide dark vessel (a thin vase with five sprigs before)
    box(B, 'pathStone', 14.2, 12.3, 16.4, 13.4, -0.45, -0.1, 0.012);
    const tb = books(d, 14.6, 12.6, -0.1, 3, 0.04); ball(d, 'inkObj', 14.6, 12.6, tb + 0.06, 0.06);
    sprigs(tagged(new FX.Batch()), 16.05, 12.6, 0.36, 0.7, 5);                           // (the old sprigs: built and thrown away, so the shared random numbers stay in step)
    // the vase in the table's middle with a sheaf of slender brass reeds in it (14 Oct, Sam: "the vase can be centred, and
    // something inside, not a plant, just a decoration"). Off to one side until then.
    vase(d, 'inkObj', 15.3, 12.85, -0.1, 1.1, AMPHORA);
    { const Rr = FX.rng(3030), z0 = -0.1 + 0.62 * 1.1; for (let i = 0; i < 9; i++) { const a = Rr() * 6.28, lean = 0.05 + Rr() * 0.16, h = 0.45 + Rr() * 0.4;
      rod(d, 'brass', [15.3 + Math.cos(a) * 0.012, 12.85 + Math.sin(a) * 0.012, z0 - 0.25], [15.3 + Math.cos(a) * lean * h, 12.85 + Math.sin(a) * lean * h, z0 + h], 0.0035); } }
    });
    box(d, 'rugDark', 13.2, 11.7, 17.6, 13.95, -0.45, -0.425, 0.006);                     // (a darker wool since 13 Oct)
    // The fireplace: a block of the outside's board-marked concrete (darker than the walls since 13 Oct: in the clerestory's
    // light the pale concrete washed out along its top), a steel firebox standing 16 cm out of it with a bed of embers and
    // flames that move, a hearth, logs, and a painting hung over the middle. (Until 13 Oct a black plate with an orange
    // glow, and a canvas leaning on the hearth. Sam: "make it more premium", "the picture centered on the wall over the fire".)
    // (Everything here sits 20 cm further north since 14 Oct, centred at 12.5: the middle of the west wall's high windows, so
    // the two panes either side of the breast are the same width once the windows run into the corner.)
    thing(9.6, 12.5, () => {
    // (up through the ceiling since 14 Oct, Sam: "for the brick wall texture, make sure it goes up to the top". It stopped at
    // 3.92 m under the high windows. Its top is above the ceiling, so no face of it lies in the ceiling's plane.)
    box(B, 'concretePlain', 9.13, 10.0, 9.95, 15.0, 0, 4.62, 0.01); A.cap(9.13, 10.0, 9.95, 15.0, 0, 4.62); colliders.push({ id: 'fire', box: new THREE.Box3(new V3(WX(9.13), 0, WZ(10.0)), new V3(WX(9.95), 4.62, WZ(15.0))) });
    box(B, 'concretePlain', 9.95, 10.7, 10.9, 14.3, 0, 0.32, 0.01);
    box(d, 'dark', 9.95, 11.5, 9.975, 13.5, 0.32, 1.1, 0.003);                                         // the firebox's back
    [[9.95, 11.5, 10.11, 13.5, 1.06, 1.1], [9.95, 11.5, 10.11, 13.5, 0.32, 0.36], [9.95, 11.5, 10.11, 11.54, 0.32, 1.1], [9.95, 13.46, 10.11, 13.5, 0.32, 1.1]]
      .forEach((q) => box(d, 'black', q[0], q[1], q[2], q[3], q[4], q[5], 0.004));                  // its steel frame
    box(d, 'fire', 9.98, 11.56, 10.09, 13.44, 0.36, 0.385, 0.004);                                     // the ember bed
    { const Re = FX.rng(4417); for (let i = 0; i < 26; i++) ball(d, 'inkObj', 9.995 + Re() * 0.085, 11.6 + (i + Re() * 0.6) * 0.071, 0.395, 0.025 + Re() * 0.012, 0.55, 1.2); }
    // The flames: three sheets of fire at three depths in the box, each painted by a shader into one ragged band of tongues
    // that rise and fall along it, blue at the root, white-gold in the body, red at the tips. (Twelve separate tongues in a
    // row until 14 Oct. Sam: "the fire, try to make it more realistic". They read as a crown of cut-outs.)
    { const pos = [], uvs = [], seed = [], idx = [];
      [[10.0, 0.5, 0.2], [10.035, 0.62, 1.7], [10.07, 0.44, 3.3]].forEach(([x, h, sd], k) => {
        const b = k * 4;
        [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([u, v]) => { pos.push(WX(x), 0.38 + h * v, WZ(11.58 + 1.84 * u)); uvs.push(u, v); seed.push(sd); });
        idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1)); g.setIndex(idx);
      const fm = new THREE.Mesh(g, flameSheet()); fm.frustumCulled = false; fm.renderOrder = 4;
      scene.add(fm); own([fm], 'living'); fm.castShadow = false; fm.receiveShadow = false; }
    // Logs stacked on the hearth, five, four, three, two: bark round each with long fissures, and the cut ends showing their
    // rings and checks. (Twelve walnut cylinders until 14 Oct. Sam: "the wood, more detailed, and maybe add two more logs on top".)
    { const Lr = FX.rng(5150);
      for (let j = 0; j < 4; j++) for (let i = 0; i < 5 - j; i++) {
        const y = 13.75 + (i + j * 0.5) * 0.118, z = 0.38 + j * 0.104, r = 0.054 + Lr() * 0.01, len = 0.46 + Lr() * 0.08, tw = Lr() * 6.28, dx = (Lr() - 0.5) * 0.04;
        d.add(M.logBark, new THREE.CylinderGeometry(r * 0.97, r, len, 14, 1, true), FX.M(WX(10.3 + dx), z, WZ(y), tw, 0, Math.PI / 2));
        [-1, 1].forEach((sgn) => d.add(M.logEnd, new THREE.CircleGeometry(r * (sgn > 0 ? 0.97 : 1), 18), FX.M(WX(10.3 + dx + sgn * len / 2), z, WZ(y), 0, sgn * Math.PI / 2, tw)));
      }
    }
    });
    // (higher since 14 Oct, its bottom 70 cm over the firebox: at 37 cm it sat on top of the fire)
    art('living', 'veil', 'W', 12.5, 9.95, 2.68, 1.3, 1.7, 'black', 11);
    // two lounge chairs and a round table by the glass
    lounge(B, 19.7, 9.5, -Math.PI / 2 - 0.25, 'leather'); lounge(B, 19.7, 11.6, -Math.PI / 2 + 0.25, 'leather');
    cyl(B, 'travBlock', 20.0, 10.55, 0, 0.46, 0.22, 0.26, 28); const st = books(d, 20.0, 10.55, 0.46, 2, 0.6); cyl(d, 'glowSoft', 20.02, 10.5, st, st + 0.16, 0.05, 0.05, 14);
    // (no lamp over the pit since 13 Oct. Sam, after a better one: "let's remove that lamp")
    // the olive in its stone planter, curtains gathered at the end of the glass
    // The olive's planter: a tapered vessel of dark honed basalt with a rolled lip and its inside wall showing, the soil 10 cm
    // under the lip, white river pebbles on it, the trunk's roots going down into it (scene.js). (Sam, 14 Oct: "it feels like
    // one block underneath and the tree on top, so it doesn't feel connected... more depth, more texture, more polishing".
    // Until then a black cylinder with a dark lid.)
    { const prof = new THREE.SplineCurve([[0, 0], [0.44, 0], [0.47, 0.035], [0.53, 0.4], [0.565, 0.66], [0.585, 0.705], [0.575, 0.725], [0.55, 0.722], [0.535, 0.69], [0.52, 0.6], [0, 0.6]].map(([r, h]) => new THREE.Vector2(r, h))).getPoints(48).map((v) => [Math.max(0, v.x), v.y]);
      thing(10.55, 15.75, () => {
        B.add(M.basalt, new THREE.LatheGeometry(prof.map(([r, h]) => new THREE.Vector2(r, h)), 64), FX.M(WX(10.55), 0, WZ(15.75)));
        cyl(d, 'soilDark', 10.55, 15.75, 0.6, 0.62, 0.525, 0.525, 48);
        const Rp = FX.rng(1575);
        for (let i = 0; i < 70; i++) { const a = Rp() * 6.28, r = 0.2 + Math.sqrt(Rp()) * 0.3, sz = 0.018 + Rp() * 0.022;
          d.add(i % 5 ? M.stoneW : M.pathStone, FX.boulder(1, 3 + i, 0.6), FX.M(WX(10.55 + Math.cos(a) * r), 0.62 + sz * 0.3, WZ(15.75 + Math.sin(a) * r), 0, Rp() * 6.28, 0, sz * 1.3, sz * 0.7, sz)); }
      }, 0.7); }
    curtain('living', 'v', 20.72, 15.6, 16.6, 0.02, 4.42); curtain('living', 'v', 20.72, 8.3, 9.0, 0.02, 4.42);
    art('living', 'gesture', 'N', 10.05, 8.13, 2.2, 1.4, 1.9, 'black', 5);
    if (back) back();
  }

  /* ================= kitchen and dining =============================================== */
  {
    const d = dec('kitchen');
    thing(14.0, 4.0, () => {
    box(B, 'quartz', 11.5, 3.4, 16.5, 4.6, 0, 0.92, 0.012); colliders.push({ id: 'island', box: new THREE.Box3(new V3(WX(11.5), 0, WZ(3.4)), new V3(WX(16.5), 0.92, WZ(4.6))) });
    box(d, 'black', 12.3, 3.7, 13.1, 4.2, 0.9, 0.925, 0.004);                              // the sink
    rod(d, 'brass', [12.7, 3.62, 0.92], [12.7, 3.62, 1.3], 0.012); rod(d, 'brass', [12.7, 3.62, 1.3], [12.7, 3.86, 1.3], 0.012); rod(d, 'brass', [12.7, 3.86, 1.3], [12.7, 3.86, 1.22], 0.012);
    lathe(d, 'ceramic', 14.6, 4.0, 0.92, BOWL.map(([r, h]) => [r * 1.5, h * 1.5])); for (let i = 0; i < 7; i++) ball(d, 'lemon', 14.6 + (R() - 0.5) * 0.3, 4.0 + (R() - 0.5) * 0.3, 1.02 + R() * 0.05, 0.045, 1.15);
    // (a cleaner counter since 13 Oct: no boards, no vase of sprigs. The sprigs are built and thrown away, for the random numbers.)
    sprigs(tagged(new FX.Batch()), 16.15, 4.25, 1.24, 0.6, 4);
    });
    [12.4, 13.5, 14.6, 15.7].forEach((x) => stool(B, x, 4.98));
    [12.6, 14.0, 15.4].forEach((x) => pendant(d, x, 4.0, 3.6, 1.72, 0.1, 'drum'));
    // the cabinet wall: oak fronts, a dark oven, a lit niche. It scans in like a wall (see scanned)
    scanned(() => {
    box(B, 'oak', 9.13, 0.4, 9.75, 4.6, 0, 2.6, 0.01); colliders.push({ id: 'tall', box: new THREE.Box3(new V3(WX(9.13), 0, WZ(0.4)), new V3(WX(9.75), 2.6, WZ(4.6))) });
    for (let i = 1; i < 7; i++) box(d, 'black', 9.748, 0.4 + i * 0.6 - 0.004, 9.754, 0.4 + i * 0.6 + 0.004, 0.02, 2.58, 0.001);
    box(d, 'black', 9.75, 2.24, 9.762, 2.96, 0.95, 1.95, 0.003); box(d, 'brass', 9.762, 2.3, 9.775, 2.9, 1.82, 1.84, 0.002);
    box(d, 'black', 9.75, 3.44, 9.76, 4.56, 1.1, 1.75, 0.003); box(d, 'glow', 9.76, 3.46, 9.764, 4.54, 1.72, 1.74, 0.001);
    });
    thing(9.86, 3.9, () => { vase(d, 'ceramic', 9.86, 3.7, 1.12, 0.45); lathe(d, 'clay', 9.86, 4.1, 1.12, BOWL.map(([r, h]) => [r * 0.7, h * 0.7])); });
    // The table for fourteen: one slab of solid walnut on two slab legs (a scan of veneer tiles until 13 Oct, with chairs in
    // another wood. Sam: "make sure the table have a nice wooden premium texture", "make better premium chair").
    thing(20.2, 4.0, () => { box(B, 'walnutSolid', 17.2, 3.4, 23.2, 4.6, 0.7, 0.76, 0.006); box(B, 'walnutSolid', 17.5, 3.6, 17.62, 4.4, 0, 0.7, 0.005); box(B, 'walnutSolid', 22.78, 3.6, 22.9, 4.4, 0, 0.7, 0.005); });
    // fourteen chairs in the same walnut: tapered legs, a cognac leather seat, two posts and a back rail that leans back.
    // s: which side the back is on (-1 north, +1 south).
    const chair = (x, y, s) => thing(x, y, () => {
      rbox(B, 'walnutSolid', x, y, 0.4, 0.44, 0.5, 0.47, 0.01, 0, 0);
      rbox(B, 'leather', x, y - s * 0.01, 0.44, 0.5, 0.47, 0.43, 0.025, 0, 0);
      [[-0.21, -0.19], [0.21, -0.19], [-0.21, 0.19], [0.21, 0.19]].forEach(([dx, dy]) => cyl(B, 'walnutSolid', x + dx, y + dy, 0, 0.4, 0.016, 0.022, 10));
      [-0.21, 0.21].forEach((dx) => rod(B, 'walnutSolid', [x + dx, y + s * 0.2, 0.42], [x + dx, y + s * 0.25, 0.84], 0.014));
      rbox(B, 'walnutSolid', x, y + s * 0.235, 0.64, 0.84, 0.48, 0.035, 0.012, 0, -s * 0.12);
    });
    for (let i = 0; i < 7; i++) { const x = 17.8 + i * 0.84; chair(x, 3.0, -1); chair(x, 5.0, 1); }
    box(d, 'linenW', 17.9, 3.82, 22.5, 4.18, 0.76, 0.766, 0.002);                          // a runner
    // small vessels down the runner, in two groups (three vases of olive sprigs and two bowls until 13 Oct. Sam: "remove the
    // plant on the table", "add smaller vase for the decoration"). The sprigs are built and thrown away, for the random numbers.
    [[18.6, 0.75], [20.2, 1.0], [21.8, 0.7]].forEach(([x, s]) => sprigs(tagged(new FX.Batch()), x, 4.0, 0.766 + 0.5 * s, 0.6 * s + 0.2, 5));
    [[19.25, 3.95, 'ceramic', 0.42, null], [19.42, 4.06, 'clay', 0.3, AMPHORA], [19.08, 4.07, 'inkObj', 0.26, null],
     [21.1, 3.94, 'inkObj', 0.38, AMPHORA], [21.28, 4.06, 'ceramic', 0.28, null]].forEach(([x, y, m, sc, pts]) => vase(d, m, x, y, 0.766, sc, pts || undefined));
    [19.0, 20.6, 22.2].forEach((x) => { cyl(d, 'brass', x, 3.92, 0.766, 0.9, 0.012, 0.012, 8); cyl(d, 'white', x, 3.92, 0.9, 1.04, 0.011, 0.011, 8); });
    [18.5, 20.2, 21.9].forEach((x) => pendant(d, x, 4.0, 3.6, 1.78, 0.3, 'dome'));
    lamp('kitchen', 20.2, 4.0, 2.25, 0xffd6a0, 4.2, 8);                  // up among the pendants: at 1.5 m it stood in the sprigs and burnt them white
    // wine behind glass: racks of bottles, a lit shelf line
    box(B, 'dark', 25.2, 0.2, 28.8, 0.6, 0, 2.6, 0.01); box(B, 'dark', 28.4, 0.6, 28.8, 7.4, 0, 2.6, 0.01);
    for (let j = 0; j < 9; j++) { box(d, 'brass', 28.36, 0.7, 28.4, 7.3, 0.3 + j * 0.26, 0.31 + j * 0.26, 0.001); for (let i = 0; i < 30; i++) d.add(M.inkObj, new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8), FX.M(WX(28.26), 0.36 + j * 0.26, WZ(0.82 + i * 0.218), 0, 0, Math.PI / 2)); }
    box(d, 'glow', 28.38, 0.7, 28.39, 7.3, 2.55, 2.57, 0.001);
    art('kitchen', 'bars', 'N', 10.05, 8.13 - 0.26 - 0.07, 2.0, 1.2, 1.6, 'walnut', 11);
  }

  /* ================= the other rooms on the plan: media, study, library, guest suites === */
  {
    thing(4.5, 5.6, () => { box(B, 'boucle', 2, 5.4, 7, 6.4, 0, 0.42, 0.1); box(B, 'boucle', 2, 4.4, 2.9, 5.4, 0, 0.42, 0.1); box(B, 'boucle', 2, 6.2, 7, 6.42, 0.3, 0.82, 0.08); });
    box(B, 'dark', 2.4, 0.2, 6.6, 0.3, 0.9, 2.9, 0.01); box(B, 'walnut', 2.2, 0.3, 6.8, 0.7, 0.2, 0.55, 0.01); box(B, 'travBlock', 3.6, 3.4, 5.4, 4.3, 0, 0.36, 0.01);
    box(dec('kitchen'), 'wool', 1.6, 2.6, 7.4, 6.9, 0, 0.018, 0.006);
    thing(33.0, 2.65, () => { box(B, 'walnut', 31.5, 2.2, 34.5, 3.1, 0.7, 0.75, 0.008); box(B, 'black', 31.6, 2.3, 31.66, 3.0, 0, 0.7, 0.004); box(B, 'black', 34.34, 2.3, 34.4, 3.0, 0, 0.7, 0.004); });
    lounge(B, 33.0, 1.5, 0, 'leather', 'black');
    box(B, 'oak', 29.2, 0.2, 37.8, 0.6, 0, 2.8, 0.01); box(B, 'oak', 38.2, 0.2, 43.8, 0.6, 0, 2.8, 0.01); box(B, 'oak', 43.4, 0.6, 43.8, 7.4, 0, 2.8, 0.01);
    const d = dec('gallery');
    box(d, 'wool', 30.6, 1.2, 36.4, 6.6, 0, 0.018, 0.006); lounge(B, 39.6, 5.2, Math.PI * 0.8, 'boucle'); lounge(B, 41.6, 5.6, -Math.PI * 0.8, 'boucle'); cyl(B, 'travBlock', 40.6, 5.9, 0, 0.44, 0.22, 0.26, 24);
    // books on the library and study shelves, seen from the patio through the glass
    // (They were single spines a hand apart, stuck flat on the cabinet: from the patio a wall of confetti. Now six
    // boards carry runs of books standing shoulder to shoulder, with a gap here and there.)
    [[29.3, 37.7], [38.3, 43.3]].forEach(([a, b]) => {
      for (let j = 0; j < 6; j++) {
        const z = 0.3 + j * 0.42;
        for (let x = a; x < b - 0.01; x += 2.1) box(d, 'walnutFine', x, 0.6, Math.min(b, x + 2.1), 0.86, z - 0.03, z, 0.003);
        for (let x = a + 0.06; x < b - 0.3;) {
          const n = 5 + ((R() * 12) | 0);
          for (let q = 0; q < n && x < b - 0.08; q++) { const t = 0.024 + R() * 0.034, h = 0.19 + R() * 0.11; d.add(M[['bk1', 'bk2', 'bk3', 'bk4', 'bk1', 'bk4'][(R() * 6) | 0]], new THREE.BoxGeometry(t, h, 0.17), FX.M(WX(x + t / 2), z + h / 2, WZ(0.71))); x += t + 0.002; }
          x += 0.1 + R() * 0.42;
        }
      }
    });
    [8, 16].forEach((y, k) => {
      const dd = dec(k ? 'entrance' : 'living');
      thing(5.0, y + 3.2, () => {
        box(B, 'walnut', 3.7, y + 2.0, 6.3, y + 4.4, 0, 0.26, 0.02); box(B, 'linenW', 3.8, y + 2.1, 6.2, y + 4.3, 0.26, 0.5, 0.06); box(B, 'boucle', 3.6, y + 1.8, 6.4, y + 1.98, 0, 1.25, 0.04);
        cushion(dd, 'linenW', 4.45, y + 2.4, 0.5, 0.75, 0.16, 0.45, 0, 0.3); cushion(dd, 'linenW', 5.55, y + 2.4, 0.5, 0.75, 0.16, 0.45, 0, 0.3); rbox(dd, k ? 'sage' : 'rust', 5.0, y + 3.9, 0.5, 0.56, 2.44, 0.7, 0.03, 0);
      });
      box(B, 'plaster', 0.2, y + 5.3, 3.3, y + 5.45, 0, 2.6, 0.005); box(B, 'plaster', 3.3, y + 5.3, 3.45, y + 7.8, 0, 2.6, 0.005);
      A.cap(0.2, y + 5.3, 3.3, y + 5.45, 0, 2.6); A.cap(3.3, y + 5.3, 3.45, y + 7.8, 0, 2.6);      // partitions are walls: a lid in the cut, like the rest box(B, 'travBlock', 0.2, y + 6, 0.8, y + 7.6, 0, 0.85, 0.01);
      box(dd, 'wool', 3.0, y + 2.6, 7.0, y + 5.0, 0, 0.018, 0.006);
    });
  }

  /* ================= patio ========================================================== */
  {
    const d = dec('patio');
    // A ring to sit on around the olive, in dark honed basalt against the pale paving, a low cushion of groundcover inside.
    // (Travertine like the floor round it and gravel inside until 13 Oct. Sam: "make it a little bit more premium, add a
    // better colour contrast with the tile floor".)
    B.add(M.basalt, new THREE.CylinderGeometry(2.5, 2.5, 0.45, 96, 1, true), FX.M(WX(30), 0.225, WZ(18)));
    B.add(M.basalt, new THREE.RingGeometry(1.95, 2.5, 96), FX.M(WX(30), 0.45, WZ(18), -Math.PI / 2, 0, 0));
    B.add(M.basalt, new THREE.CylinderGeometry(1.95, 1.95, 0.45, 96, 1, true), FX.M(WX(30), 0.225, WZ(18)));
    { const g = new THREE.SphereGeometry(1.95, 64, 10, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, 0.07, 1);
      B.add(M.moss, g, FX.M(WX(30), 0.33, WZ(18))); }
    colliders.push({ id: 'ring', box: new THREE.Box3(new V3(WX(27.5), 0, WZ(15.5)), new V3(WX(32.5), 0.45, WZ(20.5))) });
    // Loungers by the pool, two pairs, a stone table and a parasol between each pair (see lounger above). Until 13 Oct the
    // tables were travertine drums and the parasols ten-sided cones on a stick.
    [24.6, 26.2, 34.4, 36].forEach((x) => lounger(d, x, 24.2, 'sage'));
    // Between each pair a drum of limestone with a bowl of lemons, and the parasol: a square canopy with a valance on
    // eight teak ribs, a teak pole on a stone foot, a bronze cap.
    [25.78, 35.58].forEach((x) => thing(x, 25.2, () => {
      cyl(B, 'pathStone', x, 24.7, 0, 0.4, 0.21, 0.21, 40); cyl(B, 'pathStone', x, 24.7, 0.4, 0.42, 0.21, 0.195, 40);
      lathe(d, 'ceramic', x, 24.7, 0.42, BOWL.map(([r, h]) => [r * 0.85, h * 0.85]));
      [[0.04, 0.02], [-0.045, 0.015], [0.0, -0.05], [0.01, 0.0]].forEach(([dx, dy], i) => ball(d, 'lemon', x + dx, 24.7 + dy, 0.49 + (i === 3 ? 0.04 : 0), 0.038, 0.88, 1.08));
      box(B, 'pathStone', x - 0.26, 25.34, x + 0.26, 25.86, 0, 0.07, 0.01);
      cyl(B, 'teak', x, 25.6, 0.07, 2.62, 0.032, 0.03, 16);
      const cut = dec('patio:cut'), S = 1.24, top = 2.62;
      cut.add(M.linenW, new THREE.ConeGeometry(S * Math.SQRT2, 0.34, 4, 1, true), FX.M(WX(x), top + 0.17, WZ(25.6), 0, Math.PI / 4, 0));
      [[-1, 0], [1, 0]].forEach(([s]) => { box(cut, 'linenW', x + s * S - 0.006, 25.6 - S, x + s * S + 0.006, 25.6 + S, top - 0.11, top + 0.005, 0.002); box(cut, 'linenW', x - S, 25.6 + s * S - 0.006, x + S, 25.6 + s * S + 0.006, top - 0.11, top + 0.005, 0.002); });
      // ribs under the cloth from the crown to the edge, stretchers from a bronze runner on the pole to the ribs' middles
      [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b], i) => {
        rod(cut, 'teak', [x, 25.6, top + 0.3], [x + a * (S - 0.03), 25.6 + b * (S - 0.03), top - 0.012], 0.012);
        if (i > 3) rod(cut, 'teak', [x, 25.6, top - 0.2], [x + a * S * 0.5, 25.6 + b * S * 0.5, top + 0.14], 0.009);
      });
      cyl(cut, 'teak', x, 25.6, 2.62, top + 0.3, 0.03, 0.026, 16);
      cyl(cut, 'bronze', x, 25.6, top - 0.26, top - 0.16, 0.045, 0.045, 16); cyl(cut, 'bronze', x, 25.6, top + 0.33, top + 0.41, 0.035, 0.018, 16);
    }));
    // (The canopies are cut with the house. Left whole like the trees, they were two burnt-out white octagons over the
    // loungers in the last look from above, with the loungers' outlines showing through and a glow on the pool.)
    // an outdoor lounge on the north side, clear of the way from the kitchen to the gallery door
    thing(29.0, 10.6, () => {
    box(B, 'teak', 26.2, 9.0, 30.2, 10.0, 0.08, 0.3, 0.02); box(B, 'black', 26.26, 9.06, 30.14, 9.94, 0, 0.08, 0.006); rbox(B, 'linenW', 28.2, 9.5, 0.3, 0.46, 3.88, 0.88, 0.06); box(B, 'teak', 26.2, 8.86, 30.2, 9.02, 0.08, 0.78, 0.02);
    box(B, 'teak', 30.4, 10.2, 31.4, 13.0, 0.08, 0.3, 0.02); box(B, 'black', 30.46, 10.26, 31.34, 12.94, 0, 0.08, 0.006); rbox(B, 'linenW', 30.9, 11.6, 0.3, 0.46, 0.88, 2.68, 0.06); box(B, 'teak', 31.38, 10.2, 31.54, 13.0, 0.08, 0.78, 0.02);
    for (let i = 0; i < 4; i++) cushion(d, i % 2 ? 'sage' : 'linenW', 26.7 + i * 1.0, 9.2, 0.44, 0.8, 0.4, 0.18, 0, -0.15);
    for (let i = 0; i < 3; i++) cushion(d, i % 2 ? 'ochre' : 'linenW', 31.2, 10.7 + i * 0.9, 0.44, 0.18, 0.4, 0.8, 0, 0);
    });
    thing(28.3, 11.6, () => {
    box(B, 'pathStone', 27.4, 11.0, 29.2, 12.2, 0.02, 0.3, 0.012); box(B, 'black', 27.5, 11.1, 29.1, 12.1, 0, 0.02, 0.004); lathe(d, 'inkObj', 28.3, 11.6, 0.3, BOWL.map(([r, h]) => [r * 1.4, h * 1.4])); cyl(d, 'glowSoft', 27.8, 11.4, 0.3, 0.48, 0.06, 0.06, 14);
    });
    // big planters with agaves and grasses along the gallery glass and by the kitchen
    [[39.9, 15.5, 'a'], [39.9, 21.5, 'g'], [39.9, 26.0, 'a'], [22.0, 13.5, 'g'], [22.0, 21.0, 'a']].forEach(([x, y, k]) => {
      cyl(B, 'conc', x, y, 0, 0.7, 0.42, 0.5, 28);
      if (k === 'a') clump(d, x, y, 0.66, 0.85, 14, 'foliage', 0.9); else clump(d, x, y, 0.66, 1.3, 26, 'straw', 0.45);
    });
    // lanterns at the corners of the pool
    // (decor, not on the drawing: an 18 cm box is three pixels on the plan, and its outline was a bead that jumped about beside the pool's corner)
    // (bronze frames round a candle since 13 Oct, black boxes before)
    [[22.9, 26.6], [40.1, 26.6], [22.9, 30.4], [40.1, 30.4]].forEach(([x, y]) => lantern(d, x, y));
  }

  /* ================= gallery ========================================================
     (13 Oct, Sam: "use same size picture on the wall and proper spacing, so same height, equal spacing across the whole
     wall so it feels premium... art painting inside them instead of random shape... make better sculpture".)
     Seven paintings of one size, 1.2 by 1.6 m, their middles 1.72 m up and three metres apart, from one end of the
     wall to the other, the room's title standing in the gap after the second. Across from the second, fourth and sixth,
     along the glass, three white plinths with a sculpture each, and two benches under the third and fifth. */
  {
    const d = dec('gallery');
    for (let i = 0; i < 7; i++) art('gallery', 'paint', 'E', 10.9 + i * 3, 43.77, 1.72, 1.2, 1.6, 'black', i);
    // a track of spots on the ceiling, one aimed at each painting
    box(d, 'black', 43.0, 9.0, 43.03, 31.0, 3.56, 3.58, 0.002);
    for (let i = 0; i < 7; i++) { const y = 10.9 + i * 3; d.add(M.black, new THREE.CylinderGeometry(0.035, 0.04, 0.12, 12), FX.M(WX(43.05), 3.5, WZ(y), 0, 0, -0.5)); cyl(d, 'glow', 43.085, y, 3.435, 3.445, 0.028, 0.028, 10); }
    // benches: a solid walnut seat on two black legs
    [16.9, 22.9].forEach((yc) => thing(43.4, yc, () => { const y0 = yc - 1, y1 = yc + 1; box(B, 'walnutZ', 43.15, y0, 43.65, y1, 0.37, 0.44, 0.012); box(B, 'black', 43.2, y0 + 0.15, 43.6, y0 + 0.2, 0, 0.37, 0.004); box(B, 'black', 43.2, y1 - 0.2, 43.6, y1 - 0.15, 0, 0.37, 0.004); }));
    // the plinths: plain white blocks, no joints (travertine with its tile lines until 13 Oct)
    const block = (y, s, h) => box(B, 'plinthW', 41.62 - s, y - s, 41.62 + s, y + s, 0, h, 0.006);
    // a bird in flight: one polished bronze blade, swelling and tapering, on a small black stone
    thing(41.62, 13.9, () => { block(13.9, 0.22, 0.92); cyl(B, 'inkObj', 41.62, 13.9, 0.92, 1.04, 0.065, 0.075, 28);
      vase(B, 'brass', 41.62, 13.9, 1.04, 1, [[0, 0], [0.028, 0], [0.024, 0.05], [0.019, 0.1], [0.038, 0.22], [0.066, 0.45], [0.072, 0.62], [0.054, 0.82], [0.026, 1.0], [0.006, 1.07], [0, 1.075]]); });
    // a pierced form: a ring of dark bronze swollen into an oval, the hole through it seen from the corridor at an angle
    thing(41.62, 19.9, () => { block(19.9, 0.25, 0.76); cyl(B, 'bronze', 41.62, 19.9, 0.76, 0.79, 0.07, 0.07, 24);
      B.add(M.bronze, new THREE.TorusGeometry(0.2, 0.15, 40, 90), FX.M(WX(41.62), 0.79 + 0.35 * 1.28 - 0.02, WZ(19.9), 0, 1.15, 0, 1, 1.28, 0.62)); });
    // a moon jar in a black glaze
    thing(41.62, 25.9, () => { block(25.9, 0.25, 0.62);
      vase(B, 'glazeBlack', 41.62, 25.9, 0.62, 1, [[0, 0], [0.1, 0], [0.19, 0.05], [0.25, 0.15], [0.265, 0.26], [0.245, 0.37], [0.18, 0.46], [0.125, 0.51], [0.118, 0.545], [0.13, 0.555]]);
      cyl(B, 'black', 41.62, 25.9, 1.13, 1.14, 0.112, 0.112, 28); });
  }

  /* ================= master suite =====================================================
     Sam, 9 Oct: "a four... make it premium, a high-end bedroom. Right now it feels there's stuff floating."
     So everything now stands on something. The headboard runs from the floor to a lit ledge, the
     nightstands stand on the floor and carry lamps (the hanging globes and the hung light bar are gone),
     the bed has a base down to the floor, and the bedding is made of soft shapes, not blocks. */
  /* 13 Oct, Sam: "center the bed properly with the wall... the dark wall, make more premium texture... for the bed and
     lamp and stuff, enhance everything... the curtain, make it more premium... clean up, better layout".
     The bed sat 1.05 m west of the middle of the solid wall (the door from the gallery takes the wall's first 2.6 m).
     Everything that belongs to it, headboard, ledge, nightstands, bench, rug, moved with it. The calls that draw from the
     shared random sequence (books, branches, sprigs, the plant) are all still made, in their order, so the rooms after this
     one stay as they were; those whose pieces are gone draw into Z, a batch that is never shown. */
  {
    const d = dec('bedroom'), Z = tagged(new FX.Batch()), X = 47.25;
    const stack = (bt, x, y, z, cols, rot) => { let zz = z; cols.forEach((c, i) => { const h = 0.026 + ((i * 7) % 3) * 0.006; rbox(bt, c, x, y, zz, zz + h, 0.27 - i * 0.025, 0.2 - i * 0.015, 0.003, rot + (i % 2 ? 0.08 : -0.05)); zz += h; }); return zz; };
    // the headboard: ten plump channels of a taupe wool from the floor up to a walnut ledge, a line of light under the ledge
    // (cognac leather until 13 Oct: under the lamps it read orange against the black wall)
    thing(X, 32.3, () => {
      for (let i = 0; i < 10; i++) rbox(B, 'taupe', X - 2.052 + i * 0.456, 32.235, 0.03, 1.36, 0.44, 0.15, 0.06);
      box(B, 'walnutSolid', X - 2.32, 32.2, X + 2.32, 32.235, 0, 1.4, 0.005);
      box(B, 'walnutSolid', X - 2.32, 32.14, X + 2.32, 32.42, 1.38, 1.43, 0.008);
      box(d, 'glow', X - 2.25, 32.32, X + 2.25, 32.335, 1.362, 1.376, 0.001);
    });
    // on the ledge: a painting leaning in the middle, a dark vase with branches at one end, books and a bowl at the other
    { const tex = artTex('paint', 720, 500, 9), m = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.8), drawable(new THREE.MeshStandardMaterial({ map: tex, color: 0x9c9c9c, roughness: 0.85, envMapIntensity: 0.3 }), 'none'));   // (a shade darker: the lamp over the bed lights it from close by)
      m.rotation.x = -0.09; m.position.set(WX(X), 1.43 + 0.4, WZ(32.29)); m.castShadow = false; scene.add(m); own([m], 'bedroom'); }
    rbox(d, 'black', X, 32.272, 1.43, 2.25, 1.19, 0.03, 0.003, 0, -0.09);
    vase(d, 'inkObj', X + 1.8, 32.3, 1.43, 0.5); branches(d, X + 1.8, 32.3, 1.72, 0.62, 5);
    books(Z, 47.15, 32.3, 1.43, 3, 0.1); stack(d, X - 1.75, 32.29, 1.43, ['bk2', 'bk1', 'bk4'], 0.12);
    lathe(d, 'glazeBlack', X - 1.2, 32.29, 1.43, BOWL.map(([r, h]) => [r * 0.75, h * 0.75]));
    // a wash of light where the larch meets the ceiling, wall to wall
    box(d, 'glow', 43.7, 32.236, 50.8, 32.27, 3.578, 3.596, 0.001);

    // The bed: a plinth, an upholstered base, the mattress. Over it a duvet that hangs down both sides and the foot in
    // folds, its corners rounded, the sheet turned down over its top edge in a thick roll. Two big square pillows stand
    // against the headboard, two to sleep on lean in front of them, one long one in front, a charcoal throw across the foot.
    thing(X, 33.5, () => {
      box(B, 'black', X - 1.0, 32.42, X + 1.0, 34.52, 0, 0.04, 0.005);
      box(B, 'boucle', X - 1.08, 32.34, X + 1.08, 34.6, 0.04, 0.33, 0.035);
      box(B, 'linenW', X - 1.04, 32.38, X + 1.04, 34.56, 0.33, 0.58, 0.12);
      drape(d, 'linenW', X, 33.8, 0.645, 2.13, 1.56, 0.075, [0.33, 0.33, 0.36, 0], 0.013, 0.012, 1);
      drape(d, 'white', X, 33.11, 0.68, 2.15, 0.34, 0.034, [0.27, 0.27, 0.04, 0.03], 0.006, 0.006, 3);
      [-0.53, 0.53].forEach((dx, i) => pillow(d, 'linenW', X + dx, 32.46, 0.6, 0.7, 0.64, 0.2, -0.16, i ? -0.04 : 0.05));
      [-0.51, 0.51].forEach((dx, i) => pillow(d, 'white', X + dx, 32.8, 0.6, 0.74, 0.48, 0.17, -0.58, i ? 0.07 : -0.06));
      pillow(d, 'rust', X + 0.04, 33.06, 0.62, 0.6, 0.26, 0.14, -0.72, 0.04);
      drape(d, 'charcoal', X, 34.18, 0.682, 2.22, 0.6, 0.09, [0.2, 0.43, 0.03, 0.03], 0.018, 0.008, 5);
    });

    // Nightstands: solid walnut on a recessed plinth, one drawer with a brass pull, a top of white quartz. On each a lamp:
    // a black glazed gourd, a brass neck, a pleated linen shade lit from inside. (A white ceramic urn under a glowing
    // drum, and a travertine top with its tile lines, until 13 Oct.)
    const GOURD = [[0, 0], [0.07, 0], [0.12, 0.06], [0.14, 0.16], [0.12, 0.27], [0.06, 0.35], [0.026, 0.38], [0.026, 0.4]];
    [X - 1.8, X + 1.8].forEach((x, i) => thing(x, 32.6, () => {
      box(B, 'black', x - 0.26, 32.42, x + 0.26, 32.8, 0, 0.06, 0.004);
      box(B, 'walnutSolid', x - 0.31, 32.36, x + 0.31, 32.86, 0.06, 0.5, 0.01);
      box(d, 'black', x - 0.295, 32.859, x + 0.295, 32.866, 0.272, 0.279, 0.001);
      box(d, 'brass', x - 0.07, 32.86, x + 0.07, 32.876, 0.37, 0.382, 0.002);
      box(B, 'quartz', x - 0.33, 32.34, x + 0.33, 32.88, 0.5, 0.53, 0.006);
      const lx = x + (i ? 0.1 : -0.1);
      vase(d, 'glazeBlack', lx, 32.58, 0.53, 1, GOURD); cyl(d, 'brass', lx, 32.58, 0.93, 1.0, 0.008, 0.008, 8);
      d.add(M.shade, pleatGeo(0.17, 0.15, 0.26, 26), FX.M(WX(lx), 1.11, WZ(32.58)));
      d.add(M.brass, new THREE.TorusGeometry(0.17, 0.004, 6, 48), FX.M(WX(lx), 0.98, WZ(32.58), Math.PI / 2, 0, 0));
      books(Z, x - 1.05 + (i ? -0.15 : 0.15), 32.64, 0.53, 2, 0.2); stack(d, x + (i ? -0.14 : 0.14), 32.66, 0.53, i ? ['bk4', 'bk1'] : ['bk1', 'bk2'], 0.2);
      // each lamp throws its own pool: on the stone top, up the headboard beside it
      lamp('bedroom', lx, 32.74, 1.04, 0xffc68a, 0.85, 2.6);
    }));
    lamp('bedroom', X, 32.78, 2.25, 0xffd09a, 4.8, 8);                  // close to the larch and high, so it grazes the battens

    // a bench at the foot: a boucle cushion on a solid walnut frame with four slim legs, a sage throw over one end
    thing(X, 35.24, () => {
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(B, 'walnutSolid', X + a * 0.74 - 0.025, 35.24 + b * 0.18 - 0.025, X + a * 0.74 + 0.025, 35.24 + b * 0.18 + 0.025, 0, 0.29, 0.004));
      box(B, 'walnutSolid', X - 0.8, 35.01, X + 0.8, 35.47, 0.27, 0.31, 0.008);
      rbox(B, 'boucle', X, 35.24, 0.31, 0.45, 1.6, 0.46, 0.05);
      drape(d, 'sage', X + 0.5, 35.24, 0.45, 0.42, 0.46, 0.03, [0, 0, 0.17, 0.17], 0.01, 0.006, 7);
      books(Z, 45.75, 35.24, 0.42, 2, 0.3); stack(d, X - 0.4, 35.24, 0.45, ['bk2'], 0.3);
    });
    box(d, 'wool', X - 2.9, 33.2, X + 2.9, 37.8, 0, 0.016, 0.008); box(d, 'rugTaupe', X - 2.76, 33.34, X + 2.76, 37.66, 0, 0.026, 0.01);   // a taupe field in a cream border
    // two chairs and a limestone table on a round rug by the west glass, a floor lamp with the same pleated shade
    cyl(d, 'straw', 42.6, 37.5, 0, 0.012, 1.75, 1.75, 56);
    lounge(B, 42.2, 36.4, Math.PI / 2 + 0.3, 'boucle'); lounge(B, 42.2, 38.6, Math.PI / 2 - 0.3, 'boucle');
    cyl(B, 'pathStone', 42.35, 37.5, 0, 0.44, 0.2, 0.24, 32); vase(d, 'inkObj', 42.35, 37.5, 0.44, 0.5); sprigs(d, 42.35, 37.5, 0.68, 0.45, 4);
    cyl(B, 'bronze', 41.7, 39.9, 0, 0.025, 0.17, 0.17, 28); cyl(B, 'brass', 41.7, 39.9, 0.025, 1.5, 0.008, 0.008, 8);
    d.add(M.shade, pleatGeo(0.2, 0.17, 0.3, 30), FX.M(WX(41.7), 1.62, WZ(39.9)));
    // a long low chest on the east wall with a painting over it, a tall plant in the corner
    thing(50.68, 36.8, () => {
    box(B, 'walnutZ', 50.5, 35.3, 50.86, 38.3, 0.14, 0.6, 0.01); box(B, 'black', 50.56, 35.4, 50.8, 38.2, 0, 0.14, 0.005);
    vase(d, 'ceramic', 50.68, 35.8, 0.6, 0.8, URN); lathe(d, 'glazeBlack', 50.68, 36.9, 0.6, BOWL.map(([r, h]) => [r * 1.1, h * 1.1]));
    books(Z, 50.68, 37.8, 0.6, 3, 1.6); stack(d, 50.68, 37.75, 0.6, ['bk1', 'bk4', 'bk2'], 1.62);
    });
    art('bedroom', 'paint', 'E', 36.8, 50.87, 1.72, 1.6, 1.1, 'black', 8);
    plant(d, 50.2, 40.1, 0, 1.5, 'clay', 1.1);
    // linen curtains in deep, even ripple folds, stacked at both ends of the west and south glass, on a ceiling track
    // (the north-west one now starts at the larch: it started 10 cm short, and the bright glass behind showed through the
    // gap as a white line down the wall's end, the "vertical white line crack" Sam saw on 13 Oct)
    curtain('bedroom', 'v', 41.3, 32.205, 33.5, 0.015, 3.56); curtain('bedroom', 'v', 41.3, 39.5, 40.7, 0.015, 3.56); curtain('bedroom', 'h', 40.7, 41.5, 42.7, 0.015, 3.56); curtain('bedroom', 'h', 40.7, 49.4, 50.6, 0.015, 3.56);
  }

  /* ================= dressing =======================================================
     The outside review, three rounds running: "still a dead frame", two walls of walnut with a grain the size of a
     dinner plate. So the long side is now an open wardrobe: six bays in a fine-grained walnut, each lit from its
     back edge, three with clothes on a brass rail and shoes under them, three with shelves of folded things. The
     short side has closed fronts, fluted, in a warm grey lacquer. A lamp of its own, so the room is not a tunnel. */
  {
    const d = dec('dressing');
    const GARM = ['linenW', 'charcoal', 'ochre', 'sage', 'rust', 'wool', 'white', 'boucle', 'charcoal', 'linenW'];
    const X0 = 51.2, X1 = 58.8, Y0 = 32.15, Y1 = 32.75, NB = 6, bw = (X1 - X0) / NB;
    box(B, 'walnutFine', X0, Y0, X1, Y0 + 0.04, 0, 2.6, 0.004); box(B, 'walnutFine', X0, Y0, X1, Y1, 0, 0.12, 0.006); box(B, 'walnutFine', X0, Y0, X1, Y1, 2.5, 2.6, 0.006);
    for (let i = 0; i <= NB; i++) box(d, 'walnutFine', X0 + i * bw - 0.02, Y0, X0 + i * bw + 0.02, Y1, 0.12, 2.5, 0.004);
    for (let i = 0; i < NB; i++) thing(X0 + (i + 0.5) * bw, 32.5, () => {
      const a = X0 + i * bw + 0.04, b = X0 + (i + 1) * bw - 0.04;
      box(d, 'glow', a, Y0 + 0.05, b, Y0 + 0.064, 2.46, 2.485, 0.001);
      box(d, 'bayGlow', a, Y0 + 0.04, b, Y0 + 0.048, 0.14, 2.46, 0.001);                   // the back of the bay, washed by that light
      if (i % 2 === 0) {
        rod(d, 'brass', [a, 32.47, 2.0], [b, 32.47, 2.0], 0.011);
        for (let x = a + 0.08; x < b - 0.09;) {
          const t = 0.035 + R() * 0.035, len = 0.8 + R() * 0.6;
          rbox(d, GARM[(R() * GARM.length) | 0], x + t / 2, 32.47, 1.94 - len, 1.94, t, 0.44, t * 0.46, (R() - 0.5) * 0.12);
          cyl(d, 'brass', x + t / 2, 32.47, 1.94, 2.0, 0.004, 0.004, 5);
          x += t + 0.04 + R() * 0.035;
        }
        for (let k = 0; k < 4; k++) { const px = a + 0.18 + k * ((b - a - 0.36) / 3); [-0.06, 0.06].forEach((o) => rbox(d, k % 2 ? 'inkObj' : 'leather', px + o, 32.52, 0.12, 0.2, 0.09, 0.27, 0.02, 0)); }
      } else {
        [0.6, 1.07, 1.54, 2.01].forEach((z, row) => {
          box(d, 'walnutFine', a, Y0 + 0.04, b, Y1 - 0.02, z, z + 0.03, 0.003);
          for (let x = a + 0.09; x < b - 0.36;) {
            const w = 0.3 + R() * 0.06, n = 2 + ((R() * 4) | 0);
            if (row === 1 && R() < 0.4) { rbox(d, 'leather', x + w / 2, 32.47, z + 0.03, z + 0.03 + 0.24, w, 0.16, 0.03, 0); cyl(d, 'brass', x + w / 2, 32.47, z + 0.27, z + 0.3, 0.05, 0.05, 10); }   // a bag
            else { let zz = z + 0.03; for (let q = 0; q < n; q++) { const h = 0.034 + R() * 0.03; rbox(d, GARM[(R() * GARM.length) | 0], x + w / 2, 32.47, zz, zz + h, w, 0.36, 0.012, (R() - 0.5) * 0.06); zz += h; } }
            x += w + 0.07 + R() * 0.1;
          }
        });
        [[0.2, 'boucle'], [0.34, 'inkObj']].forEach(([h, m], k) => rbox(d, m, a + 0.28 + k * 0.52, 32.47, 0.12, 0.12 + h, 0.42, 0.38, 0.02, 0));                // two boxes on the bay's floor
      }
    });
    [[51.2, 54.0], [57.9, 58.8]].forEach(([a, b]) => {
      box(B, 'lacq', a, 34.275, b, 34.85, 0, 2.6, 0.006);
      for (let x = a + 0.02; x < b - 0.03; x += 0.07) box(d, 'lacq', x, 34.25, x + 0.036, 34.28, 0.1, 2.56, 0.008);
      box(d, 'brass', a, 34.243, b, 34.25, 1.02, 1.034, 0.002); box(d, 'glow', a, 34.236, b, 34.25, 2.6, 2.618, 0.001);
    });
    box(d, 'wool', 51.6, 33.05, 58.2, 33.95, 0, 0.018, 0.006);
    box(d, 'brass', 58.82, 33.0, 58.85, 34.0, 0.1, 2.3, 0.003); box(d, 'glassMirror', 58.815, 33.04, 58.83, 33.96, 0.14, 2.26, 0.002);
    cyl(B, 'boucle', 57.6, 33.5, 0, 0.42, 0.3, 0.32, 24);
    lamp('dressing', 55.0, 33.5, 2.35, 0xffdcb0, 2.4, 6);
  }

  /* ================= bath ============================================================
     Sam, 9 Oct: "the camera angle is weird because we don't really see much of the room... we see the bath
     and the window, that's it." The room is now laid out for one view from the door, across its diagonal:
     the tub in front of the garden glass, the vanity and its long mirror down the west wall, a plant in the
     far corner. The shower moved to the east wall, behind you as you look. */
  /* 13 Oct, Sam: "add proper scanning on the mirror and the furniture, because it snaps to full... and then there's a
     reflection appearing... enhance the bathtub, the tile, make it premium ceramic with nice texture, all the accessory,
     remove the plant, better wood texture on the cabinet, the sink". The vanity, the tub and the stool are scanned now,
     like the walls, so the scan runs over them; the mirror's picture is on from the moment the bath starts to turn real
     and shows only where the glass under it already is (see the mirror in scene.js). The random draws the plants made
     still happen, into Z, which is never shown, so the garden after this room stays as it was. */
  {
    const d = dec('bath'), Z = tagged(new FX.Batch());
    // a freestanding tub of white stone with a thin rolled rim, floating on a dark recessed foot, a walnut tray across it
    const TUB = new THREE.SplineCurve([[0, 0.07], [0.3, 0.07], [0.37, 0.09], [0.415, 0.16], [0.44, 0.3], [0.455, 0.46], [0.458, 0.56], [0.45, 0.59], [0.435, 0.592], [0.426, 0.57],
      [0.42, 0.45], [0.405, 0.3], [0.37, 0.2], [0.3, 0.155], [0, 0.145]].map(([r, h]) => new THREE.Vector2(r, h))).getPoints(60).map((v) => [Math.max(0, v.x), v.y]);
    scanned(() => {
      lathe(B, 'black', 53.9, 39.35, 0, [[0, 0], [0.3, 0], [0.3, 0.075], [0, 0.075]], 1.9, 0.92);
      lathe(B, 'tubStone', 53.9, 39.35, 0, TUB, 2.05, 1.0);
      rod(B, 'brass', [52.75, 39.35, 0], [52.75, 39.35, 0.95], 0.02); rod(B, 'brass', [52.75, 39.35, 0.95], [53.04, 39.35, 0.95], 0.017); rod(B, 'brass', [53.04, 39.35, 0.95], [53.04, 39.35, 0.86], 0.017);
      cyl(B, 'brass', 52.75, 39.35, 0, 0.015, 0.075, 0.075, 28); rod(B, 'brass', [52.75, 39.35, 0.78], [52.75, 39.47, 0.8], 0.008);
      box(B, 'walnutZ', 54.22, 38.86, 54.52, 39.84, 0.6, 0.622, 0.004);
      // a stool of limestone with two folded towels, a bath mat
      cyl(B, 'pathStone', 55.3, 38.6, 0, 0.44, 0.19, 0.2, 40);
      rbox(B, 'linenW', 55.3, 38.6, 0.44, 0.5, 0.32, 0.23, 0.025, 0.4); rbox(B, 'sage', 55.3, 38.6, 0.5, 0.55, 0.29, 0.21, 0.022, 0.3);
    });
    { const w = new THREE.Mesh(mark(new THREE.CircleGeometry(0.418, 48), [WX(53.9), WZ(39.35), 0.5]), M.water); w.rotation.x = -Math.PI / 2; w.scale.set(2.05, 1, 1); w.position.set(WX(53.9), 0.5, WZ(39.35)); scene.add(w); own([w], 'bath'); w.castShadow = false; }
    colliders.push({ id: 'tub', box: new THREE.Box3(new V3(WX(52.95), 0, WZ(38.88)), new V3(WX(54.85), 0.6, WZ(39.82))) });
    cyl(d, 'white', 54.37, 39.1, 0.622, 0.7, 0.035, 0.035, 18); cyl(d, 'glow', 54.37, 39.1, 0.7, 0.72, 0.004, 0.008, 8);
    lathe(d, 'glazeBlack', 54.37, 39.52, 0.622, BOWL.map(([r, h]) => [r * 0.45, h * 0.45]));
    cloth(d, 'rugTaupe', 53.9, 38.43, 0, 1.4, 0.032, 0.58, 0.004, 2);
    // The vanity along the west wall: a recessed plinth, solid walnut with the grain along it (a veneer scan with a grain
    // the size of a plate until 13 Oct), three columns of two drawers with brass pulls, a top of white quartz, two thin
    // stone basins with brass wall spouts, a mirror the length of it, three tubes of light standing on the mirror.
    scanned(() => {
    box(B, 'black', 51.14, 36.6, 51.66, 40.0, 0, 0.1, 0.004); box(B, 'walnutZ', 51.14, 36.5, 51.74, 40.1, 0.1, 0.78, 0.01); box(B, 'quartz', 51.14, 36.44, 51.8, 40.16, 0.78, 0.84, 0.006);
    [37.7, 38.9].forEach((y) => box(d, 'black', 51.74, y - 0.004, 51.744, y + 0.004, 0.12, 0.76, 0.001));
    box(d, 'black', 51.74, 36.52, 51.744, 40.08, 0.44, 0.448, 0.001);
    [37.1, 38.3, 39.5].forEach((y) => { box(d, 'brass', 51.742, y - 0.12, 51.756, y + 0.12, 0.6, 0.612, 0.002); box(d, 'brass', 51.742, y - 0.12, 51.756, y + 0.12, 0.27, 0.282, 0.002); });
    [37.4, 39.2].forEach((y) => {
      vase(B, 'tubStone', 51.5, y, 0.84, 1, [[0, 0], [0.07, 0], [0.15, 0.025], [0.2, 0.07], [0.215, 0.12], [0.212, 0.135], [0.2, 0.132], [0.19, 0.095], [0.15, 0.055], [0.06, 0.04], [0, 0.04]]);
      cyl(d, 'brass', 51.5, y, 0.879, 0.881, 0.024, 0.024, 16);
      cyl(d, 'brass', 51.17, y, 1.06, 1.1, 0.035, 0.035, 20); rod(d, 'brass', [51.17, y, 1.08], [51.36, y, 1.08], 0.011); rod(d, 'brass', [51.36, y, 1.08], [51.36, y, 1.03], 0.011);
    });
    box(B, 'glassMirror', 51.134, 36.6, 51.158, 40.0, 1.02, 2.5, 0.003); box(d, 'brass', 51.132, 36.58, 51.146, 40.02, 1.0, 2.52, 0.002);
    [36.74, 38.3, 39.86].forEach((y) => { box(d, 'brass', 51.158, y - 0.03, 51.19, y + 0.03, 1.3, 2.2, 0.004); box(d, 'glowSoft', 51.19, y - 0.022, 51.225, y + 0.022, 1.34, 2.16, 0.01); });
    // on the top: a black glazed vessel between the basins, hand towels at one end, a brass tray with two bottles at the other
    vase(d, 'glazeBlack', 51.48, 38.3, 0.84, 0.36); sprigs(Z, 51.5, 38.3, 1.04, 0.3, 3);
    rbox(d, 'linenW', 51.48, 36.82, 0.84, 0.9, 0.28, 0.21, 0.025, 0.06); rbox(d, 'linenW', 51.48, 36.82, 0.9, 0.955, 0.27, 0.2, 0.022, 0.1);
    cyl(d, 'brass', 51.45, 39.75, 0.84, 0.85, 0.11, 0.11, 32);
    vase(d, 'glazeBlack', 51.42, 39.7, 0.85, 0.32, [[0, 0], [0.1, 0], [0.11, 0.05], [0.11, 0.42], [0.09, 0.46], [0.035, 0.47], [0.035, 0.53], [0.05, 0.54]]);
    vase(d, 'ceramic', 51.48, 39.82, 0.85, 0.26, [[0, 0], [0.12, 0], [0.13, 0.05], [0.13, 0.4], [0.1, 0.44], [0.035, 0.46], [0.035, 0.52], [0.05, 0.53]]);
    lamp('bath', 51.55, 38.3, 2.78, 0xffdcb0, 2.4, 7);                 // over the mirror: lower down, the mirror showed it as a white blob
    box(B, 'brass', 51.134, 36.6, 51.21, 40.0, 2.56, 2.6, 0.004); box(d, 'glow', 51.15, 36.66, 51.2, 39.94, 2.552, 2.56, 0.001);   // the fitting that light comes from
    });
    // (a tall plant stood in the north-west corner until 13 Oct: Sam, "remove the plant")
    plant(Z, 51.72, 40.58, 0, 1.3, 'ceramic', 0.85);
    // a towel ladder on the north wall
    thing(54.0, 35.25, () => {
    rod(B, 'walnutSolid', [53.7, 35.14, 0], [53.7, 35.3, 1.9], 0.016); rod(B, 'walnutSolid', [54.3, 35.14, 0], [54.3, 35.3, 1.9], 0.016);
    [0.6, 1.0, 1.4].forEach((z) => rod(B, 'walnutSolid', [53.7, 35.2 + z * 0.05, z], [54.3, 35.2 + z * 0.05, z], 0.012));
    rbox(d, 'linenW', 54.0, 35.3, 0.72, 1.4, 0.42, 0.04, 0.015, 0, 0.08);
    });
    // the east wall in walnut slats, floor to ceiling: warm behind the shower, and it is what the mirror shows from the door
    // (decor, like the wardrobe's dividers and the fluting next door: on the plan 49 slats were a ragged edge on the wall,
    // and as decor they arrive one after the other as the scan passes)
    // (scanned since 13 Oct, so the black board behind them arrives at the same moment as the slats in front of it: with the
    // mirror's picture on from the start of the scan, the board showed in the glass as a black hole until the slats came)
    scanned(() => { for (let y = 35.24; y < 40.9; y += 0.115) box(d, 'walnut', 58.74, y, 58.8, y + 0.07, 0.02, 3.56, 0.004);
      box(d, 'black', 58.785, 35.2, 58.8, 40.9, 0, 3.58, 0.001); });
    // the shower on the east wall: a glass screen, a rain head, a stone bench with a towel
    box(B, 'glass', 57.25, 35.5, 57.28, 38.2, 0.02, 2.4, 0.002); box(B, 'quartz', 58.25, 35.5, 58.8, 38.2, 0, 0.44, 0.01);
    thing(58.4, 37.0, () => {
    rod(d, 'brass', [58.8, 36.9, 2.3], [58.0, 36.9, 2.3], 0.012); cyl(d, 'brass', 57.95, 36.9, 2.27, 2.29, 0.16, 0.16, 24);
    rbox(d, 'linenW', 58.52, 37.5, 0.44, 0.52, 0.34, 0.5, 0.03, 0);
    });
  }

  /* ================= private garden ==================================================
     Sam, 9 Oct: "you see water and the hill, but the scene feels weak. Empty... a two out of ten."
     Rebuilt for the view you get stepping out of the bath, looking south-west: a fire bowl and chairs close
     to you, the loungers and the water beyond them with the sea behind, the old olive in the middle of the
     lawn, a slatted pergola with a sofa at the far end, planting along every edge. */
  {
    const d = dec('garden');
    box(B, 'concrete', 41, 49.55, 62, 50, 0, 0.5, 0.01); box(B, 'concrete', 61.55, 41, 62, 49.55, 0, 0.5, 0.01);
    // a terrace of stone along the house, and stepping stones from the bath door to the fire
    box(B, 'travBlock', 41.2, 41.2, 61.5, 42.5, 0, 0.012, 0.004);            // (12 mm proud, it was 30: on the plan its edge ran as a line into the garden's label)
    [[56.9, 43.05, 0.2], [56.5, 43.85, -0.15]].forEach(([x, y, a]) => rbox(B, 'travBlock', x, y, 0, 0.014, 0.8, 0.52, 0.005, a));
    // a long water trough against the south wall, brim full, so the water meets the sea
    box(B, 'travBlock', 50.2, 47.0, 61.55, 47.22, 0, 0.5, 0.008); box(B, 'travBlock', 50.2, 47.22, 50.42, 49.55, 0, 0.5, 0.008);
    { const w = new THREE.Mesh(FX.plane(11.13, 2.33), M.water); w.rotation.x = -Math.PI / 2; w.position.set(WX(55.985), 0.487, WZ(48.385)); w.receiveShadow = true; scene.add(w); own([w], 'garden'); w.castShadow = false; }
    // the fire bowl, three chairs round it, a stack of logs
    thing(55.3, 45.4, () => {
    lathe(B, 'bronze', 55.3, 45.4, 0, [[0, 0], [0.2, 0], [0.26, 0.1], [0.3, 0.26], [0.62, 0.42], [0.66, 0.46], [0.6, 0.44], [0.26, 0.3], [0, 0.3]]);
    cyl(d, 'inkObj', 55.3, 45.4, 0.36, 0.385, 0.52, 0.52, 28);
    for (let i = 0; i < 70; i++) { const a = R() * 6.28, r = Math.sqrt(R()) * 0.47; ball(d, 'inkObj', 55.3 + Math.cos(a) * r, 45.4 + Math.sin(a) * r, 0.395, 0.03 + R() * 0.028, 0.7); }
    for (let i = 0; i < 26; i++) { const a = R() * 6.28, r = Math.sqrt(R()) * 0.3; ball(d, 'ember', 55.3 + Math.cos(a) * r, 45.4 + Math.sin(a) * r, 0.405, 0.014 + R() * 0.014, 0.8); }
    for (let i = 0; i < 5; i++) d.add(M.inkObj, new THREE.CylinderGeometry(0.04, 0.045, 0.42, 8), FX.M(WX(55.3 + (R() - 0.5) * 0.25), 0.47, WZ(45.4 + (R() - 0.5) * 0.25), 0, R() * 3, Math.PI / 2 - 0.3));
    });
    // The fire itself. The review: "the flames are hard-edged cones, like folded paper, and they throw no light." So the
    // flame is now drawn, not modelled: three upright sheets crossed like a star, and on each a shader paints tongues
    // that lean, tear off and fade out at the tip, a little differently on every sheet. It adds its light to what is
    // behind it, but only where the picture is real (so it never inks the paper, and the paper roll puts it out).
    // And it lights the garden: a warm lamp in the bowl that wavers with it (the lamp with the fire flag, see frame() in scene.js).
    {
      const N = 4, pos = [], uvs = [], seed = [], idx = [];
      for (let k = 0; k < N; k++) {
        const a = (k / N) * Math.PI + 0.3, c = Math.cos(a), s2 = Math.sin(a), w = 0.4 + (k % 2) * 0.05, h = 0.6 + (k % 3) * 0.07, b = k * 4;
        [[-1, 0], [1, 0], [-1, 1], [1, 1]].forEach(([sx, sy]) => { pos.push(WX(55.3) + c * w * sx, 0.4 + h * sy, WZ(45.4) + s2 * w * sx); uvs.push(sx * 0.5 + 0.5, sy); seed.push(k * 1.7 + 0.3); });
        idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1)); g.setIndex(idx);
      flameMat = flameShader();
      const fm = new THREE.Mesh(g, flameMat); fm.frustumCulled = false; fm.renderOrder = 4;
      scene.add(fm); own([fm], 'garden'); fm.castShadow = false; fm.receiveShadow = false;
      lamp('garden', 55.3, 45.4, 0.9, 0xffa058, 3.4, 5.2, true);
    }
    [[53.95, 44.75, 1.0], [56.7, 45.9, -1.25]].forEach(([x, y, a]) => lounge(B, x, y, a, 'linenW', 'teak'));                // two chairs, the third stood in the lens
    pillow(d, 'ochre', 53.9, 44.7, 0.42, 0.42, 0.36, 0.13, -0.35, 1.0 + Math.PI / 2); pillow(d, 'rust', 56.78, 45.9, 0.42, 0.42, 0.36, 0.13, -0.35, -1.25 - Math.PI / 2);
    thing(53.6, 46.4, () => { for (let j = 0; j < 3; j++) for (let i = 0; i < 4 - j; i++) d.add(M.walnut, new THREE.CylinderGeometry(0.05, 0.055, 0.45, 9), FX.M(WX(53.6), 0.06 + j * 0.1, WZ(46.25 + (i + j * 0.5) * 0.11), 0, 0, Math.PI / 2)); });
    colliders.push({ id: 'firepit', box: new THREE.Box3(new V3(WX(53.4), 0, WZ(44.2)), new V3(WX(57.2), 0.8, WZ(46.6))) });
    // two loungers facing the sea beside the water, towels, a low table with a bowl
    [50.9, 52.3].forEach((x) => lounger(d, x, 44.7, 'rust'));
    cyl(B, 'pathStone', 51.98, 45.2, 0, 0.4, 0.2, 0.2, 40); lathe(d, 'ceramic', 51.98, 45.2, 0.4, BOWL.map(([r, h]) => [r * 0.75, h * 0.75]));
    [[0.03, 0.02], [-0.035, 0.012], [0.0, -0.04]].forEach(([dx, dy]) => ball(d, 'lemon', 51.98 + dx, 45.2 + dy, 0.46, 0.034, 0.88, 1.08));
    // the old olive stands in a round bed of gravel with a stone edge, lavender at its foot
    cyl(B, 'pathStone', 46.9, 46.2, 0, 0.16, 1.5, 1.5, 72); cyl(B, 'gravel', 46.9, 46.2, 0.16, 0.17, 1.38, 1.38, 64);      // (a kerb you can sit on, and tall enough to be a whole circle on the plan)
    for (let i = 0; i < 9; i++) { const a = i * 0.7 + 0.3, r = 0.95 + R() * 0.3; lavender(d, 46.9 + Math.cos(a) * r, 46.2 + Math.sin(a) * r, 0.24 + R() * 0.07); }
    // a stone bench by the south wall, cushions on it
    thing(47.8, 48.97, () => { box(B, 'pathStone', 46.2, 48.7, 49.4, 49.25, 0, 0.45, 0.01); cushion(d, 'boucle', 47.0, 48.97, 0.45, 1.2, 0.08, 0.46, 0); cushion(d, 'ochre', 48.9, 48.97, 0.45, 0.42, 0.14, 0.42, 0.4, 0.6); });
    // the pergola at the west end: four posts, two beams, slats that stripe the floor with shade
    { const X0 = 41.9, X1 = 46.0, Y0 = 42.7, Y1 = 45.7, Hh = 2.6;
      [[X0, Y0], [X1, Y0], [X0, Y1], [X1, Y1]].forEach(([x, y]) => box(B, 'teak', x - 0.06, y - 0.06, x + 0.06, y + 0.06, 0, Hh, 0.006));
      [Y0, Y1].forEach((y) => box(B, 'teak', X0 - 0.3, y - 0.05, X1 + 0.3, y + 0.05, Hh, Hh + 0.18, 0.006));
      for (let x = X0 - 0.2; x <= X1 + 0.21; x += 0.21) box(B, 'teak', x - 0.022, Y0 - 0.35, x + 0.022, Y1 + 0.35, Hh + 0.18, Hh + 0.3, 0.004);
      // under it: a stone floor, an outdoor sofa in an L, a low table, two lanterns
      box(B, 'pathStone', X0 - 0.3, Y0 - 0.3, X1 + 0.3, Y1 + 0.3, 0, 0.01, 0.004);          // (2 mm under the terrace's strip, which it runs into: at the same height the two tops fought, and their edges drew a double line on the plan)
      thing(43.6, 43.9, () => {
      box(B, 'teak', 42.1, 42.9, 45.3, 43.75, 0.08, 0.3, 0.02); box(B, 'teak', 42.1, 43.75, 42.95, 45.5, 0.08, 0.3, 0.02);
      rbox(B, 'linenW', 43.7, 43.33, 0.3, 0.46, 3.12, 0.78, 0.06); rbox(B, 'linenW', 42.53, 44.59, 0.3, 0.46, 0.78, 1.74, 0.06);
      box(B, 'linenW', 42.14, 42.94, 45.26, 43.14, 0.46, 0.82, 0.06); box(B, 'linenW', 42.14, 43.14, 42.34, 45.46, 0.46, 0.82, 0.06);
      [[43.0, 0], [44.2, 0.1], [45.0, -0.1]].forEach(([x, r], i) => pillow(d, ['ochre', 'sage', 'rust'][i], x, 43.26, 0.46, 0.46, 0.4, 0.14, -0.3, r));
      pillow(d, 'boucle', 42.46, 44.6, 0.46, 0.46, 0.4, 0.14, -0.3, Math.PI / 2);
      });
      thing(44.25, 44.65, () => { box(B, 'pathStone', 43.6, 44.3, 44.9, 45.0, 0, 0.32, 0.01); lathe(d, 'clay', 44.0, 44.65, 0.32, BOWL.map(([r, h]) => [r * 1.0, h * 1.0])); books(d, 44.55, 44.6, 0.32, 2, 0.4); });
      [[45.75, 45.45], [42.2, 45.6]].forEach(([x, y]) => lantern(d, x, y)); }
    // planting: grasses along the south and west walls, lavender in drifts, clipped balls, agaves in pots
    for (let i = 0; i < 40; i++) { const x = 41.6 + R() * 8.2, y = 48.9 + R() * 0.5; if (x > 45.9 && x < 49.7) continue; clump(d, x, y, 0, 0.8 + R() * 0.6, 10, R() < 0.7 ? 'straw' : 'foliageL', 0.5); }
    for (let i = 0; i < 12; i++) clump(d, 41.4 + R() * 0.5, 46.1 + i * 0.28, 0, 0.7 + R() * 0.5, 9, 'straw', 0.5);
    for (let i = 0; i < 26; i++) { const t = i / 25, x = 50.0 - t * 2.4 + (R() - 0.5) * 0.5, y = 43.2 + t * 1.2 + (R() - 0.5) * 0.7; lavender(d, x, y, 0.22 + R() * 0.1); }
    // (13 Oct, Sam: "the plants feel a little bit weak". The grasses along the south and west walls are filled in, from
    // their own random numbers, so nothing placed after them moves.)
    { const L = FX.rng(1314);
      for (let i = 0; i < 70; i++) { const x = 41.6 + L() * 8.2, y = 48.85 + L() * 0.6; if (x > 45.9 && x < 49.7) continue; clump(d, x, y, 0, 0.7 + L() * 0.6, 14, L() < 0.75 ? 'straw' : 'foliageL', 0.5, L); }
      for (let i = 0; i < 24; i++) clump(d, 41.35 + L() * 0.6, 46.0 + L() * 3.3, 0, 0.6 + L() * 0.5, 12, 'straw', 0.5, L); }
    // clipped box balls. They were perfect spheres in the cypress's big-blotched leaf ("a sphere in camouflage print"):
    // now each is a little out of round, hand-clipped, in one small dark leaf that the light models
    [[49.5, 44.6, 0.42], [48.6, 44.9, 0.3], [50.3, 43.4, 0.34], [58.9, 43.4, 0.4], [60.3, 43.0, 0.3]].forEach(([x, y, r], k) => {
      // (13 Oct: finer, with clumps of shoots in the surface, and the small leaves in its shader, see boxLeaf)
      const g = new THREE.IcosahedronGeometry(1, 5), pp = g.attributes.position, v = new V3();
      for (let i = 0; i < pp.count; i++) { v.fromBufferAttribute(pp, i); const q = 1 + (FX.noise3(v.x * 1.6 + k * 7, v.y * 1.6, v.z * 1.6) - 0.5) * 0.18 + (FX.noise3(v.x * 6 + k, v.y * 6, v.z * 6) - 0.5) * 0.09 + (FX.noise3(v.x * 16 + k, v.y * 16, v.z * 16) - 0.5) * 0.05; pp.setXYZ(i, v.x * q, Math.max(v.y * q * 0.9, -0.72), v.z * q); }
      g.computeVertexNormals();
      d.add(M.boxLeaf, g, FX.M(WX(x), r * 0.72, WZ(y), 0, k * 1.3, 0, r, r, r));
    });
    [[42.6, 41.85], [50.9, 41.85], [58.6, 41.85]].forEach(([x, y]) => { cyl(B, 'conc', x, y, 0.03, 0.6, 0.32, 0.4, 28); clump(d, x, y, 0.56, 0.8, 14, 'foliage', 0.9); });
    // behind you as you step out: a table for eight under the east wall
    thing(59.8, 45.4, () => {
    box(B, 'teak', 58.6, 44.9, 61.0, 45.9, 0.7, 0.75, 0.01); [[58.75, 45.05], [60.85, 45.05], [58.75, 45.75], [60.85, 45.75]].forEach(([x, y]) => box(B, 'black', x - 0.03, y - 0.03, x + 0.03, y + 0.03, 0, 0.7, 0.004));
    [44.55, 46.25].forEach((y) => box(B, 'teak', 58.7, y - 0.17, 60.9, y + 0.17, 0.4, 0.45, 0.01)); [[58.85, 44.55], [60.75, 44.55], [58.85, 46.25], [60.75, 46.25]].forEach(([x, y]) => box(B, 'black', x - 0.03, y - 0.12, x + 0.03, y + 0.12, 0, 0.4, 0.004));
    lathe(d, 'ceramic', 59.8, 45.4, 0.75, BOWL.map(([r, h]) => [r * 1.2, h * 1.2])); vase(d, 'inkObj', 59.2, 45.4, 0.75, 0.5); sprigs(d, 59.2, 45.4, 1.0, 0.4, 4);
    });
  }

  // decor is landscape as far as the drawing goes: no ink pass, shown when its zone turns real
  // (a zone written as 'patio:cut' is the patio's, and is cut with the house: see the parasols)
  Object.keys(DEC).forEach((key) => { const [zone, flag] = key.split(':'); const ms = DEC[key].build(scene); own(ms, zone); ms.forEach((m) => { m.userData.decor = true; if (flag === 'cut') m.userData.cutWithHouse = true; }); });
  delete B.add;                                                        // the house batch goes back to scene.js as it came
  return { lights, flame: flameMat };
};
