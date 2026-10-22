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
  // (each hangs from a ceiling rose since the night of 15 Oct: a brass canopy 9 cm across where its rod meets the ceiling, and
  // a small collar where the rod enters it. Sam: "the light connection to the ceiling... feels it's floating, add a point of
  // connection, like something that would in real life")
  const pendant = (bt, x, y, zTop, z, r, kind) => thing(x, y, () => {
    cyl(bt, 'black', x, y, z + r * 0.8, zTop - 0.03, 0.005, 0.005, 6);
    cyl(bt, 'brass', x, y, zTop - 0.03, zTop - 0.004, 0.04, 0.045, 32);                          // the canopy, flared to the ceiling (4 mm short of it: the kitchen's ceiling sheet is 2 mm under its slab)
    cyl(bt, 'brass', x, y, zTop - 0.047, zTop - 0.03, 0.009, 0.009, 16);                         // its collar
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
  // A counter stool (iteration 8, Sam, 15 Oct: "make sure that the chairs feel more premium, like a stool, like nice stool"):
  // four tapered walnut legs splayed a little, a walnut seat with a cognac leather cushion on it, a low curved back in walnut
  // on two posts, and a brass footrest round the legs. It faces north, to the island.
  const tleg = (bt, mat, a, b, r0, r1) => {
    const p = new V3(WX(a[0]), a[2], WZ(a[1])), q = new V3(WX(b[0]), b[2], WZ(b[1])), dv = q.clone().sub(p), l = dv.length();
    const m = new THREE.Matrix4().compose(p.clone().add(q).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), dv.normalize()), new V3(1, 1, 1));
    bt.add(M[mat], new THREE.CylinderGeometry(r1, r0, l, 14), m);
  };
  // A backrest bent round the sitter in one piece of wood: an arc of a circle radius R, its two ends at the posts (half a
  // chord w/2 either side, at plan offset s * yEnd behind the seat's middle), t thick, from z0 to z1, its edges eased.
  // (Five short flat pieces turned to the curve until the night of 15 Oct. Sam: "the thing for the resting of the back
  // feels weird, at an angle... make it more full, like a nice premium wood chair")
  const curvedBack = (bt, mat, x, y, s, w, yEnd, R, t, z0, z1) => {
    const phi = Math.asin(Math.min(0.99, w / 2 / R)), cy = s * (yEnd - R * Math.cos(phi)), N = 18, sh = new THREE.Shape();
    const P = (a, rr) => new THREE.Vector2(rr * Math.sin(a), -(cy + s * rr * Math.cos(a)));     // (u, v): plan x, minus plan y
    for (let i = 0; i <= N; i++) { const a = -phi + (2 * phi * i) / N, p = P(a, R); i ? sh.lineTo(p.x, p.y) : sh.moveTo(p.x, p.y); }
    for (let i = N; i >= 0; i--) { const a = -phi + (2 * phi * i) / N, p = P(a, R - t); sh.lineTo(p.x, p.y); }
    const e = 0.004, g = new THREE.ExtrudeGeometry(sh, { depth: z1 - z0 - 2 * e, bevelEnabled: true, bevelThickness: e, bevelSize: e, bevelSegments: 2 });
    bt.add(M[mat], g, new THREE.Matrix4().makeRotationX(-Math.PI / 2).setPosition(WX(x), z0 + e, WZ(y)));
  };
  const stool = (bt, x, y) => thing(x, y, () => {
    const SH = 0.64;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => tleg(bt, 'chairWood', [x + sx * 0.2, y + sy * 0.19, 0], [x + sx * 0.165, y + sy * 0.155, SH - 0.03], 0.013, 0.021));
    rbox(bt, 'chairWood', x, y, SH - 0.035, SH, 0.42, 0.4, 0.008, 0, 0);                         // the seat
    rbox(bt, 'leather', x, y - 0.005, SH, SH + 0.055, 0.4, 0.37, 0.022, 0, 0);                     // its cushion
    [-0.15, 0.15].forEach((dx) => tleg(bt, 'chairWood', [x + dx, y + 0.17, SH], [x + dx * 1.05, y + 0.21, SH + 0.24], 0.011, 0.013));
    // the back: one band of the wood bent round the sitter, on the posts' tops
    curvedBack(bt, 'chairWood', x, y, 1, 0.33, 0.215, 0.3, 0.024, SH + 0.13, SH + 0.27);
    // the footrest: brass bars between the legs, 26 cm up
    const fz = 0.26, fx = 0.19, fy = 0.18;
    [[[-fx, -fy], [fx, -fy]], [[-fx, -fy], [-fx, fy]], [[fx, -fy], [fx, fy]]].forEach(([a, b]) => rod(bt, 'brass', [x + a[0], y + a[1], fz], [x + b[0], y + b[1], fz], 0.008));
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
    // (16 Oct, Sam: "the painting feels like inside the wall, so maybe just add some depth, like a real painting": the canvas
    // now stands 5 cm off the wall on a stretcher with its painted edges showing, in a floating frame with a dark shadow gap
    // round it, and it casts its own shadow. The canvas was a bare plane 3.5 cm off the wall in a thin frame.)
    const e = 0.05, t = 0.022, f = frame || 'walnut';
    if (wall === 'E') { m.rotation.y = -Math.PI / 2; m.position.set(WX(c - e), z, WZ(u)); }
    else if (wall === 'W') { m.rotation.y = Math.PI / 2; m.position.set(WX(c + e), z, WZ(u)); }
    else if (wall === 'N') { m.position.set(WX(u), z, WZ(c + e)); }
    else { m.rotation.y = Math.PI; m.position.set(WX(u), z, WZ(c - e)); }
    scene.add(m); own([m], zone); m.castShadow = true;
    const bt = dec(zone), s = wall === 'E' || wall === 'S' ? -1 : 1, along = wall === 'E' || wall === 'W';
    const slab = (mat, du, dz, lu, lz, a0, a1, r) => { const d0 = c + s * a0, d1 = c + s * a1;
      if (along) box(bt, mat, Math.min(d0, d1), u + du - lu / 2, Math.max(d0, d1), u + du + lu / 2, z + dz - lz / 2, z + dz + lz / 2, r);
      else box(bt, mat, u + du - lu / 2, Math.min(d0, d1), u + du + lu / 2, Math.max(d0, d1), z + dz - lz / 2, z + dz + lz / 2, r); };
    slab('bk1', 0, 0, w, h, 0.012, e - 0.002, 0.003);                                                  // the stretcher, its edges painted
    const g = 0.012, W2 = w + 2 * g, H2 = h + 2 * g;                                                    // the gap round the canvas
    slab('black', 0, 0, W2 + 0.004, H2 + 0.004, 0.004, 0.01, 0.002);                                    // its shadow, at the back
    const bar = (du, dz, lu, lz) => slab(f, du, dz, lu, lz, 0.004, e + 0.006, 0.003);
    bar(0, H2 / 2 + t / 2, W2 + 2 * t, t); bar(0, -H2 / 2 - t / 2, W2 + 2 * t, t); bar(-W2 / 2 - t / 2, 0, t, H2); bar(W2 / 2 + t / 2, 0, t, H2);
  });
  /* ---------- soft things: pillows and bedding ---------------------------------------
     A box reads as a block of foam. A pillow is plump in the middle and thin at the seam,
     and a duvet has a little life in its surface and a soft edge. */
  // (firm: a sofa's seat or back cushion, which keeps more of its thickness out to a rounded welt)
  const pillowGeo = (w, h, t, firm, cx, cy, mat) => {
    const g = new THREE.BoxGeometry(w, h, t, 18, 18, 2), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / (w / 2), v = p.getY(i) / (h / 2);
      // full in the middle, thinning all the way to the seam, corners drawn in (at 0.32 it stayed a slab to its edge)
      const f = Math.pow(Math.max(0, (1 - u * u) * (1 - v * v)), firm ? 0.18 : 0.5), k = 1 - (firm ? 0.04 : 0.13) * u * u * v * v;
      p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * (firm ? 0.45 + 0.55 * f : 0.12 + 0.88 * f));
    }
    g.computeVertexNormals();
    const lk = window.LINTEL_HOUSE;                                       // (a room in code puts the cushion's seam in its UV, see house-looks.js)
    return (lk && lk.pillowUv(g, cx, cy, mat)) || FX.uvMetres(g);
  };
  // z is what it rests on, lean tips it back toward the north (0 stands, -1.4 lies almost flat), rot turns it
  const pillow = (bt, mat, cx, cy, z, w, h, t, lean, rot, firm) =>
    bt.add(M[mat], pillowGeo(w, h, t, firm, cx, cy, mat), FX.M(WX(cx), z + (h / 2) * Math.cos(lean || 0) + (t / 2) * Math.abs(Math.sin(lean || 0)), WZ(cy), lean || 0, rot || 0, 0, 1, 1, 1, 'YXZ'));
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
    const C = A.court;                                                     // the forecourt's gravel, level with the house's floor since iteration 8 (scene.js, COURT)
    // timber fins on the wall west of the door, a bench under the canopy
    // Thirteen fins, the same space of bare concrete either side of the screen, as you see it from the path at the door:
    // from the step where the tall wall begins (10.87) and to the door's opening (13.8). (Eleven until iteration 8, from
    // 11.5, which left 63 cm on the left. Sam, 15 Oct: "where there's that gap... add more wood but make sure the left and
    // right have the same space".) The fins stand 14 cm proud of the wall, so from the door the screen's far end comes 9 cm
    // toward the step: at 24 cm each side the left read half the right. So 33 cm on the left, 24 on the right, which look
    // the same from where the walk stops (measured at the door's rest, plan x 15.13).
    // code-materials.js lays each fin's grain from these numbers.
    const FINS = window.LINTEL_FINS = { x0: 11.2, x1: 13.56, n: 13, w: 0.06, y0: 26.2, y1: 26.34 };
    FINS.pitch = (FINS.x1 - FINS.w - FINS.x0) / (FINS.n - 1);
    for (let i = 0; i < FINS.n; i++) { const x = FINS.x0 + i * FINS.pitch; box(B, 'oakFin', x, FINS.y0, x + FINS.w, FINS.y1, C, 4.2, 0.004); A.cap(x, FINS.y0, x + FINS.w, FINS.y1, 0.02, 4.2); }   // each fin a solid tick in the cut, like a wall
    // (The bench was a block of the path's travertine until 13 Oct. Sam: it matched the path, "so it doesn't make sense".
    // Then the fins' oak, one piece of joinery with the screen behind it, until iteration 8. Sam, 15 Oct: "the box to sit, try
    // to make cleaner and try to use another texture because it feels the same family texture as the wood".)
    // (1.5 m since 14 Oct: at 1.9 its end stood 10 cm from the path. Sam: "reduce the width a little bit so it doesn't overlap the path")
    // Now one block of the dark honed basalt (the patio olive's ring), sharp edged, floating on a plinth set back 7 cm in
    // shadow. Centred under the screen.
    const bx = (FINS.x0 + FINS.x1) / 2 - 0.75;
    box(B, 'black', bx + 0.07, 26.67, bx + 1.43, 27.03, C, C + 0.07, 0.002);
    box(B, 'basalt', bx, 26.6, bx + 1.5, 27.1, C + 0.07, 0.44, 0.004);
    cushion(d, 'boucle', bx + 0.45, 26.85, 0.44, 0.7, 0.09, 0.44, 0);
    // one slim wall light, right of the door (one each side until 14 Oct; Sam: "keep one, the right, the left you can remove")
    // (12 cm deep. At 7 cm the far edge of each was a step too small to outline from the path: a row of dashes that moved)
    // Iteration 8, Sam, 15 Oct: "double the height. Center vertically", and "clean on the edges", it felt blurry. 1.6 m
    // tall now (0.8 until then, from 1.5 m up), its middle at the middle of the door's height (my reading of "vertically").
    // Its line of light is set 3 mm into the frame instead of standing 6 mm proud of it, so the frame's lips cut it
    // cleanly, and it burns less hot than the house's other lamps (glowLine): at the lamps' heat the bloom ran over its edges.
    const LIGHT = { x: 16.55, zc: 4.2 / 2, h: 1.6 };
    M.glowLine = M.glowLine || D(P({ color: 0x2a2018, emissive: 0xffdcae, emissiveIntensity: 1.7, roughness: 1 }));
    {
      const x = LIGHT.x, z0 = LIGHT.zc - LIGHT.h / 2, z1 = LIGHT.zc + LIGHT.h / 2;
      box(B, 'frame', x - 0.03, 26.2, x + 0.03, 26.31, z0, z1, 0.002);                                  // the body
      [[x - 0.03, x - 0.011, z0, z1], [x + 0.011, x + 0.03, z0, z1], [x - 0.011, x + 0.011, z0, z0 + 0.05], [x - 0.011, x + 0.011, z1 - 0.05, z1]]
        .forEach(([a, b, c, e]) => box(B, 'frame', a, 26.309, b, 26.32, c, e, 0.001));                   // its lips, 1 cm proud
      box(d, 'glowLine', x - 0.011, 26.305, x + 0.011, 26.317, z0 + 0.05, z1 - 0.05, 0.0005);            // the line of light between them
    }
    // The boulders: a weathered rock of their own (the dry-stone wall's stone until iteration 8, whose joints drew a net of
    // cracks over each one, like a tortoise's shell). Its scan stand-in is that stone, for ?code=none.
    // (and smooth: an icosphere's faces share no vertices, so its normals were the faces' own and each boulder a cut gem)
    const smoothed = (g) => {
      const p = g.attributes.position, n = g.attributes.normal, acc = new Map(), key = (i) => p.getX(i).toFixed(4) + ',' + p.getY(i).toFixed(4) + ',' + p.getZ(i).toFixed(4);
      for (let i = 0; i < p.count; i++) { const k = key(i), a = acc.get(k) || [0, 0, 0]; a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i); acc.set(k, a); }
      for (let i = 0; i < p.count; i++) { const a = acc.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1; n.setXYZ(i, a[0] / l, a[1] / l, a[2] / l); }
      return g;
    };
    if (!M.rock) { M.rock = M.drystone.clone(); M.rock.onBeforeCompile = M.drystone.onBeforeCompile; M.rock.customProgramCacheKey = M.drystone.customProgramCacheKey; M.rock.userData = Object.assign({}, M.drystone.userData); }
    // planting west of the path: grasses and three boulders
    [[12.2, 29.6, 0.5, 3], [11.4, 31.0, 0.34, 5], [12.6, 32.3, 0.42, 9]].forEach(([x, y, r, sd]) => d.add(M.rock, smoothed(FX.boulder(r, sd, 0.5)), FX.M(WX(x), r * 0.35 + C, WZ(y), 0, sd, 0)));
    for (let i = 0; i < 16; i++) { const x = 10.6 + R() * 2.5, y = 29.0 + R() * 4.6; clump(d, x, y, C, 0.7 + R() * 0.5, 9, R() < 0.6 ? 'straw' : 'foliageL', 0.55); }
    // The same east of the path, where a reflecting pool lay until 13 Oct. Sam: it read as "a glass inside the concrete"
    // and the two sides of the path did not match. Now both sides are gravel with grasses and three boulders.
    // (Its own random numbers, so nothing placed after it moves.)
    { let sd = 20261013; const R2 = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };
      [[17.9, 30.9, 0.46, 13], [18.7, 32.2, 0.36, 15], [17.5, 33.4, 0.4, 19]].forEach(([x, y, r, s2]) => d.add(M.rock, smoothed(FX.boulder(r, s2, 0.5)), FX.M(WX(x), r * 0.35 + C, WZ(y), 0, s2, 0)));
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
      // canvas pixels, metres on the wall. Its place is set from the ink itself, below.
      // (Iteration 8, Sam, 15 Oct: "bring it closer, but center vertically relative to the... light". 1.1 m from the light
      // until then, its middle at 2.12 m, its top in line with the light's top.)
      const CW = 512, CH = 320, WM = 0.88, GAP = 0.36;
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
      // the ink's own extent, so the numerals' left edge stands GAP from the light's frame and their middle at its middle
      const k = WM / CW, inkL = Math.min(...bars.map((b) => b[0])), inkT = Math.min(...bars.map((b) => b[2])), inkB = Math.max(...bars.map((b) => b[3]));
      const x0 = LIGHT.x + 0.03 + GAP - inkL * k, zTop = LIGHT.zc + ((inkB - inkT) / 2 + inkT) * k, cx = x0 + WM / 2, cz = LIGHT.zc;
      // (in the decor batch: on the drawing a number of a thousand small bars drew itself as a grey smudge, so it waits for the material)
      thing(cx, 26.23, () => bars.forEach(([p0, p1, r0, r1]) => d.add(M.numeral, new THREE.BoxGeometry((p1 - p0) * k, (r1 - r0) * k, 0.035), FX.M(WX(x0 + ((p0 + p1) / 2) * k), zTop - ((r0 + r1) / 2) * k, WZ(26.2325)))), cz);
    }
  }

  /* ================= entrance ======================================================= */
  {
    const d = dec('entrance');
    // the console: one block of smoked oak (a block of the floor's travertine until 13 Oct. Sam: "doesn't really make
    // sense to have tiles on the sides"). In the corner of the concrete wall and the front wall since iteration 8, 2.4 m
    // long: until then it stood across the opening to the hall, with the painting hung over the opening. (Sam, 15 Oct:
    // "you clearly see that there's an entrance to go to the hall, but the furniture and the painting is blocking... push it
    // towards the corner... reduce the size if needed")
    // (with drawers since 16 Oct, Sam: "on the left side, the furniture, maybe you can add drawers, will feel more premium".
    // Three columns of two, their fronts a hair proud of the carcass with a shadow line round each, a slim brass bar on each,
    // the whole on a recessed black plinth. One plain block before.)
    box(B, 'black', 11.19, 17.95, 11.64, 20.25, 0, 0.08, 0.004);
    box(B, 'oakConsole', 11.15, 17.9, 11.7, 20.3, 0.08, 0.86, 0.01);
    { const cw = (2.4 - 0.08) / 3;
      for (let c = 0; c < 3; c++) for (let r = 0; r < 2; r++) {
        const y0 = 17.94 + c * cw + 0.004, y1 = y0 + cw - 0.008, z0 = r ? 0.475 : 0.12, z1 = r ? 0.82 : 0.465;
        box(d, 'oakConsole', 11.7, y0, 11.712, y1, z0, z1, 0.003);
        box(d, 'brass', 11.712, (y0 + y1) / 2 - 0.13, 11.724, (y0 + y1) / 2 + 0.13, z1 - 0.07, z1 - 0.058, 0.002);
        [-0.11, 0.11].forEach((o) => box(d, 'brass', 11.7, (y0 + y1) / 2 + o - 0.005, 11.716, (y0 + y1) / 2 + o + 0.005, z1 - 0.068, z1 - 0.06, 0.001));
      } }
    // (the white urn with its armful of olive branches came off the console in iteration 8. Sam, 15 Oct: "the vase with the
    // actual plant maybe you can remove it", so the painting reads centred over the console, which it is)
    sprigs(tagged(new FX.Batch()), 11.55, 20.1, 1.6, 1.25, 9);                          // (the nine thin sprigs that stood here: built and thrown away, so the shared random numbers stay in step)
    const top = books(d, 11.43, 19.25, 0.86, 3, 1.5); ball(d, 'brass', 11.43, 19.25, top + 0.07, 0.07);
    lathe(d, 'inkObj', 11.43, 18.45, 0.86, BOWL.map(([r, h]) => [r * 1.5, h * 1.5]));
    cyl(d, 'glowSoft', 11.4, 19.95, 0.9, 1.22, 0.08, 0.08, 20); cyl(d, 'brass', 11.4, 19.95, 0.86, 0.9, 0.1, 0.1, 20);
    // the table lamp lights its corner (since the hanging light came out, iteration 8: a lamp that glowed and lit nothing)
    lamp('entrance', 11.55, 19.95, 1.12, 0xffc98a, 1.1, 4.5);
    // a tall urn with dry branches by the door
    vase(B, 'inkObj', 12.5, 24.9, 0, 1.9, URN); branches(d, 12.5, 24.9, 1.2, 1.9, 8);
    // Either side of the opening to the living room, on the two piers of wall: a pair of tall stone vessels, each with three
    // bare branches. (Iteration 8, Sam, 15 Oct: "a nice vase with something inside, but not a too big plant that will take
    // all the attention away. Something that feels premium and clean".) Slender bottles in the dark honed basalt, a metre
    // tall, so they read as a pair framing the way in. Their own random numbers: nothing else in the house moves.
    const BOTTLE = [[0.0, 0], [0.1, 0], [0.155, 0.06], [0.18, 0.22], [0.172, 0.46], [0.13, 0.7], [0.075, 0.86], [0.056, 0.95], [0.062, 0.99], [0.07, 1.0]];
    // a matte stoneware in a deep warm charcoal, a soft sheen (the basalt first: its pale flecks were made for a planter
    // seen from the patio, and on a bottle at arm's length they read as splashes)
    // (light since the same evening, Sam: "a lighter color", against the dark floor and the darker front wall)
    // (glazed since the night of 15 Oct, Sam: "a little bit more polishing texture to the vase, make it a little bit more
    // shiny, like a real vase, premium": a glossy cream glaze over a speckled stoneware, see code-materials.js, glaze)
    M.stoneware = M.stoneware || D(P({ color: 0xe2dbcd, roughness: 0.7, envMapIntensity: 0.7 }));
    // the branches: bleached while the front wall was charcoal (dark ones vanished against it), dark again on the white wall
    // (Sam, the same night: "for the woods inside, just make it a little bit darker for better contrast")
    M.twigDark = M.twigDark || D(P({ color: 0x4b3b2d, roughness: 0.8 }), { noRing: true });
    // a branch as a curve: a few short pieces, each turned a little from the last, thinner toward its tip
    const bough = (Rv, p, dir, len, r0, r1, n, bend) => {
      let q = p.slice(), a = dir[0], up = dir[1];
      for (let k = 0; k < n; k++) {
        a += (Rv() - 0.5) * bend; up += (Rv() - 0.5) * bend * 0.6;
        const l = len / n, nx = q[0] + Math.cos(a) * Math.cos(up) * l, ny = q[1] + Math.sin(a) * Math.cos(up) * l * 0.55, nz = q[2] + Math.sin(up) * l;
        rod(d, 'twigDark', q, [nx, ny, nz], r0 + (r1 - r0) * (k / n)); q = [nx, ny, nz];
      }
      return q;
    };
    // (on each pier's middle as you see it: from the side wall's face, 13 cm in, to the opening. At 11.5 and 18.5 they stood
    // toward the side walls, Sam: "make the vase a little bit more centered with the part of the wall")
    // (and as you see it from the hall: a vase stands 32 cm in front of its pier, so from the middle of the room, 6.5 m off,
    // it slides outward past the pier's middle. At the piers' true middles, 11.565 and 18.435, Sam saw "the left one too
    // far on the left and the right one too far on the right". The night of 15 Oct: 16.5 cm in toward the opening, where
    // each pier's visible middle falls at the vase's depth, seen from the room's axis.)
    [[11.73, 17.45, 3101], [18.27, 17.45, 3107]].forEach(([x, y, seed]) => thing(x, y, () => {
      vase(B, 'stoneware', x, y, 0, 1.14, BOTTLE);
      const Rv = FX.rng(seed), top = 1.14;
      // three boughs, rising and leaning apart, each with two or three twigs of its own. Each comes up the neck first, nearly
      // straight, and leaves through the opening before it leans (16 Oct, Sam: "make sure it comes out of the hole of the vase,
      // right now it feels it came out through the vase": leaning from 20 cm down, every bough left through the neck's wall)
      [[-0.55, 1.18, 1.05], [0.35, 1.28, 1.2], [1.6, 1.12, 0.9]].forEach(([lean, upA, len]) => {
        const a = (x < 15 ? 0 : Math.PI) + lean, ox = Math.cos(a) * 0.012, oy = Math.sin(a) * 0.012;
        const foot = [x + ox * 0.5, y + oy * 0.5, top - 0.3], start = [x + ox * 2, y + oy * 2, top + 0.035];
        rod(d, 'twigDark', foot, start, 0.0078);
        const tip = bough(Rv, start, [a, upA], len, 0.0075, 0.0028, 8, 0.32);
        for (let k = 0; k < 3; k++) {
          const t = 0.35 + k * 0.2 + Rv() * 0.1, b = [0, 1, 2].map((c) => start[c] + (tip[c] - start[c]) * t);
          bough(Rv, b, [a + (k % 2 ? 0.7 : -0.7) + (Rv() - 0.5) * 0.4, upA - 0.35], 0.14 + Rv() * 0.18, 0.0034, 0.0016, 4, 0.5);
        }
      });
    }));
    // a bench under a round mirror (a wool runner lay down the middle of the room until 13 Oct. Sam: the floor is one
    // field of marble now, and the runner "should be unified with the whole floor")
    thing(18.56, 23.5, () => {
    box(B, 'walnut', 18.3, 22.5, 18.82, 24.5, 0.34, 0.42, 0.01); box(B, 'black', 18.36, 22.6, 18.4, 22.64, 0, 0.34, 0.004); box(B, 'black', 18.72, 22.6, 18.76, 22.64, 0, 0.34, 0.004);
    box(B, 'black', 18.36, 24.36, 18.4, 24.4, 0, 0.34, 0.004); box(B, 'black', 18.72, 24.36, 18.76, 24.4, 0, 0.34, 0.004);
    cushion(d, 'leather', 18.56, 23.5, 0.42, 0.44, 0.07, 1.9, 0);
    });
    d.add(M.brass, new THREE.CylinderGeometry(0.82, 0.82, 0.03, 48), FX.M(WX(18.84), 2.0, WZ(23.5), 0, 0, Math.PI / 2));
    d.add(M.glassMirror, new THREE.CylinderGeometry(0.77, 0.77, 0.034, 48), FX.M(WX(18.838), 2.0, WZ(23.5), 0, 0, Math.PI / 2));
    // No light hangs in the entrance since iteration 8 (Sam, 15 Oct: "I decide to remove completely the light in the entrance").
    // What hung here before: five opal globes (until 13 Oct), three brass rings (until 14 Oct), four slender brass bars at
    // an angle (until 15 Oct), and three chandeliers tried that evening (Alabaster Drum, Glass Cascade, Bronze Branch, kept
    // for reference in demo/entrance-v8/entrance-options.js). The room is lit by its clerestory and the sky.
    // (over the console, on the concrete between the front wall and the opening to the hall: 1.8 by 2.3 m, the same work)
    art('entrance', 'field', 'W', 19.1, 11.13, 2.33, 1.8, 2.3, 'black', 3);
  }

  /* ================= living ========================================================= */
  {
    const d = dec('living');
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
    // Scatter cushions in two colours only, staged, not scattered (the night of 15 to 16 Oct, Sam: "a little bit too random,
    // multiple color, multiple size, the placement is random... find a clean premium staging presentation... use two color
    // that fits well the living room"). An ivory linen, the walls' and the table's, and a terracotta, the fire's, the
    // painting's and the kitchen's leather. At each end of the two long runs the same pair, mirrored: a large ivory square
    // against the back, a smaller terracotta one in front of it and a little in, both leaning at one angle. On the short run,
    // one terracotta lumbar, centred. (Until then six colours in five sizes, and an ochre throw.)
    const PAIR = [[12.95, 'linenW', 0.56, 0.52, 0.05], [13.42, 'rust', 0.46, 0.43, -0.04]];
    [[1, 11.1, 0], [-1, 14.4, Math.PI]].forEach(([sgn, y, turn]) => [0, 1].forEach((end) => PAIR.forEach(([x, m, w, h, a]) => {
      const xx = end ? 12.1 + 17.9 - x : x;                                          // (the far end, mirrored about the run's middle)
      pillow(d, m, xx, y, -0.02, w, h, 0.16, -0.26, turn + (end ? -a : a) * sgn, false);
    })));
    pillow(d, 'rust', 12.6, 12.8, -0.02, 0.62, 0.32, 0.15, -0.26, Math.PI / 2, false);
    });
    thing(15.3, 12.85, () => {
    // the low table: one block of the path's limestone (travertine with its tile joints until 13 Oct), a stack of books
    // with a dark sphere, and a wide dark vessel (a thin vase with five sprigs before)
    box(B, 'pathStone', 14.2, 12.3, 16.4, 13.4, -0.45, -0.1, 0.012);
    // (the old stack, three thin red and dark slabs under a black ball: built and thrown away, so the shared random numbers stay
    // in step. Sam, 15 Oct: "add a better decoration on the table, maybe books. Because now there's a red thing, but I don't
    // know what it is".) Now three large art books, cloth bound in linen, charcoal and sage, each with its block of cream pages
    // showing between its boards, squared up and turned a little, a small brass sphere on top.
    books(tagged(new FX.Batch()), 14.6, 12.6, -0.1, 3, 0.04);
    M.pages = M.pages || D(P({ color: 0xece4d2, roughness: 0.92, envMapIntensity: 0.4 }));
    thing(14.5, 12.62, () => {
      let z = -0.1;
      [['linenW', 0.34, 0.27, 0.034, 0.05], ['charcoal', 0.3, 0.24, 0.028, -0.06], ['sage', 0.26, 0.205, 0.024, 0.02]].forEach(([cloth, w, dp, h, rot]) => {
        const b = 0.0035, r = 0.0015;
        rbox(d, cloth, 14.5, 12.62, z, z + b, w, dp, r, rot);                                    // the back board
        rbox(d, 'pages', 14.5 + 0.004, 12.62, z + b, z + h - b, w - 0.012, dp - 0.008, 0.001, rot); // the pages, set in from the boards
        rbox(d, cloth, 14.5, 12.62, z + h - b, z + h, w, dp, r, rot);                            // the front board
        // the spine, along the book's west edge
        const sx = 14.5 - Math.cos(rot) * (w / 2 - 0.004), sy = 12.62 + Math.sin(rot) * (w / 2 - 0.004);   // (a turn about the vertical takes local x to plan (cos, -sin))
        rbox(d, cloth, sx, sy, z, z + h, 0.009, dp, 0.003, rot);
        z += h;
      });
      ball(d, 'brass', 14.47, 12.6, z + 0.035, 0.035);
    });
    sprigs(tagged(new FX.Batch()), 16.05, 12.6, 0.36, 0.7, 5);                           // (the old sprigs: built and thrown away, so the shared random numbers stay in step)
    // the vase in the table's middle with a sheaf of slender brass reeds in it (14 Oct, Sam: "the vase can be centred, and
    // something inside, not a plant, just a decoration"). Off to one side until then.
    // (smaller since iteration 8, 0.75 of its old size, 39 cm, and its reeds cut down so they stand only 6 to 9 cm out of its
    // neck. Sam, 15 Oct: "make it a little bit smaller and the stick... shorter, right now it feels too long... like three
    // inches". They stood 30 to 70 cm out of it.)
    const VS = 0.75, rim = -0.1 + 0.52 * VS;
    vase(d, 'inkObj', 15.3, 12.85, -0.1, VS, AMPHORA);
    { const Rr = FX.rng(3030); for (let i = 0; i < 9; i++) { const a = Rr() * 6.28, lean = 0.1 + Rr() * 0.25, h = 0.06 + Rr() * 0.03;
      rod(d, 'brass', [15.3 + Math.cos(a) * 0.008, 12.85 + Math.sin(a) * 0.008, rim - 0.2], [15.3 + Math.cos(a) * (0.012 + lean * h), 12.85 + Math.sin(a) * (0.012 + lean * h), rim + h], 0.003); } }
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
    // (in brick since iteration 8, Sam, 15 Oct: "can you try to make more like brick texture? Because right now I feel like
    // flat". The board concrete until then. Its scan stand-in is that concrete, for ?code=none.)
    if (!M.chairWood) { M.chairWood = M.walnutSolid.clone(); M.chairWood.onBeforeCompile = M.walnutSolid.onBeforeCompile; M.chairWood.customProgramCacheKey = M.walnutSolid.customProgramCacheKey; M.chairWood.userData = Object.assign({}, M.walnutSolid.userData); }
    if (!M.cabinet) { M.cabinet = M.oak.clone(); M.cabinet.onBeforeCompile = M.oak.onBeforeCompile; M.cabinet.customProgramCacheKey = M.oak.customProgramCacheKey; M.cabinet.userData = Object.assign({}, M.oak.userData); }
    if (!M.brick) { M.brick = M.concretePlain.clone(); M.brick.onBeforeCompile = M.concretePlain.onBeforeCompile; M.brick.customProgramCacheKey = M.concretePlain.customProgramCacheKey; M.brick.userData = Object.assign({}, M.concretePlain.userData); }
    box(B, 'brick', 9.13, 10.0, 9.95, 15.0, 0, 4.62, 0.01); A.cap(9.13, 10.0, 9.95, 15.0, 0, 4.62); colliders.push({ id: 'fire', box: new THREE.Box3(new V3(WX(9.13), 0, WZ(10.0)), new V3(WX(9.95), 4.62, WZ(15.0))) });
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
    // (rebuilt the night of 15 Oct, Sam: "make sure the logs feel a little bit more real". They were perfect cylinders of one
    // size in a perfect pyramid.) Each log now its own: a little oval and lumpy round its girth, tapering and bending a hair
    // along its length, its ends sawn at a slight angle, between 9 and 15 cm across, laid with some give in the stack, and
    // two split halves on top, their torn faces up. Its own random numbers.
    {
      const Lr = FX.rng(5150);
      if (!M.logSplit) { M.logSplit = M.logEnd.clone(); M.logSplit.onBeforeCompile = M.logEnd.onBeforeCompile; M.logSplit.customProgramCacheKey = M.logEnd.customProgramCacheKey; M.logSplit.userData = Object.assign({}, M.logEnd.userData); }
      const logPiece = (cx, cy, cz, r, len, yaw, half) => {
        const A = half ? 12 : 22, NL = 6, ell = 0.86 + Lr() * 0.22, w0 = Lr() * 6.28, w1 = Lr() * 6.28, w2 = Lr() * 6.28;
        const bend = (Lr() - 0.5) * 0.04, taper = 0.9 + Lr() * 0.08, cut = [(Lr() - 0.5) * 0.25, (Lr() - 0.5) * 0.25];
        const rad = (th, t) => r * (1 + 0.07 * Math.sin(3 * th + w0) + 0.04 * Math.sin(5 * th + w1) + 0.03 * Math.sin(2 * th + w2)) * (1 - (1 - taper) * t);
        // a point on the log in its own frame (u along it, v across, w up), then into the plan and the world
        const at = (u, v, w) => { const t = (u + len / 2) / len, bw = bend * Math.sin(Math.PI * t);
          return [WX(cx + u * Math.cos(yaw) - v * Math.sin(yaw)), cz + w + bw, WZ(cy + u * Math.sin(yaw) + v * Math.cos(yaw))]; };
        const ring = (u, th, k) => { const t = (u + len / 2) / len, rr = rad(th, t) * k, v = Math.cos(th) * rr * ell, w = Math.sin(th) * rr;
          const end = u > 0 ? 1 : 0, uu = Math.abs(u) > len / 2 - 1e-6 ? u + cut[end] * v : u; return at(uu, v, w); };
        const T0 = half ? Math.PI : 0, T1 = Math.PI * 2;                                           // (a half is the log's lower half: its torn face on top)
        const mk = (pos, uv, idx) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; };
        { const pos = [], uv = [], idx = [];                                                            // the bark
          for (let j = 0; j <= NL; j++) for (let i = 0; i <= A; i++) { const u = -len / 2 + (len * j) / NL, th = T0 + ((T1 - T0) * i) / A; pos.push(...ring(u, th, 1)); uv.push(i / A, j / NL); }
          for (let j = 0; j < NL; j++) for (let i = 0; i < A; i++) { const k = j * (A + 1) + i; idx.push(k, k + A + 1, k + 1, k + 1, k + A + 1, k + A + 2); }
          d.add(M.logBark, mk(pos, uv, idx)); }
        [-1, 1].forEach((sg) => {                                                                        // the sawn ends
          const u = sg * len / 2, pos = [...ring(u, 0, 0)], uv = [0.5, 0.5], idx = [];
          for (let i = 0; i <= A; i++) { const th = T0 + ((T1 - T0) * i) / A; pos.push(...ring(u, th, 1)); uv.push(0.5 + 0.5 * Math.cos(th), 0.5 + 0.5 * Math.sin(th)); }
          for (let i = 1; i <= A; i++) sg > 0 ? idx.push(0, i + 1, i) : idx.push(0, i, i + 1);
          d.add(M.logEnd, mk(pos, uv, idx));
        });
        if (half) {                                                                                      // the split face, up
          const pos = [], uv = [], idx = [], NV = 4;
          for (let j = 0; j <= NL; j++) for (let i = 0; i <= NV; i++) { const u = -len / 2 + (len * j) / NL, t = (u + len / 2) / len, v = (-1 + (2 * i) / NV) * r * ell * (1 - (1 - taper) * t);
            const uu = Math.abs(u) > len / 2 - 1e-6 ? u + cut[u > 0 ? 1 : 0] * v : u; pos.push(...at(uu, v, 0.002 * Math.sin(i * 2.3 + j * 1.7))); uv.push(i / NV, j / NL); }
          for (let j = 0; j < NL; j++) for (let i = 0; i < NV; i++) { const k = j * (NV + 1) + i; idx.push(k, k + 1, k + NV + 1, k + 1, k + NV + 2, k + NV + 1); }
          d.add(M.logSplit, mk(pos, uv, idx));
        }
      };
      // four rows of five, four, three, and the two halves on top; each log's place a little off the stack's grid
      let zRow = 0.32;
      [5, 4, 3, 2].forEach((n, j) => {
        let rMax = 0;
        for (let i = 0; i < n; i++) {
          const r = 0.045 + Lr() * 0.03, len = 0.42 + Lr() * 0.1; rMax = Math.max(rMax, r);
          const y = 13.74 + (i + j * 0.5) * 0.122 + (Lr() - 0.5) * 0.012, x = 10.3 + (Lr() - 0.5) * 0.05;
          logPiece(x, y, zRow + r, r, len, (Lr() - 0.5) * 0.12, j === 3);
        }
        zRow += j === 3 ? 0 : rMax * 1.62;
      });
    }
    });
    // (higher since 14 Oct, its bottom 70 cm over the firebox: at 37 cm it sat on top of the fire)
    art('living', 'veil', 'W', 12.5, 9.95, 2.68, 1.3, 1.7, 'black', 11);
    // two lounge chairs and a round table by the glass
    lounge(B, 19.7, 9.5, -Math.PI / 2 - 0.25, 'leather'); lounge(B, 19.7, 11.6, -Math.PI / 2 + 0.25, 'leather');
    cyl(B, 'travBlock', 20.0, 10.55, 0, 0.46, 0.22, 0.26, 28); const st = books(d, 20.0, 10.55, 0.46, 2, 0.6); cyl(d, 'glowSoft', 20.02, 10.5, st, st + 0.16, 0.05, 0.05, 14);
    // (no lamp over the pit since 13 Oct. Sam, after a better one: "let's remove that lamp")
    // A bird of paradise (Strelitzia nicolai) in a woven basket, in the corner where the olive stood, curtains gathered at the
    // end of the glass. (Iteration 8, Sam, 15 Oct, with a photo of one: "something more similar to the screenshot. I think it
    // will be nicer and takes less place". The olive's basalt planter was 1.2 m across, this basket 57 cm.) A dozen stems from
    // the soil, fanned a little, each carrying one long paddle of a leaf, the low ones leaning out, the young ones upright.
    // Its own random numbers: nothing else in the house moves.
    {
      const X = 10.15, Y = 16.15, BASKET = window.LINTEL_BASKET = { x: X, y: Y, h: 0.5 };
      M.rattan = M.rattan || D(P({ color: 0xb08a5c, roughness: 0.8, envMapIntensity: 0.5 }));
      M.strelLeaf = M.strelLeaf || D(P({ color: 0x2f5a26, roughness: 0.5, envMapIntensity: 0.6, side: THREE.DoubleSide }), { noRing: true });
      M.strelStem = M.strelStem || D(P({ color: 0x61765a, roughness: 0.55, envMapIntensity: 0.55 }), { noRing: true });   // (a blue green with a bloom, 16 Oct)
      // A leaf (the third version, 16 Oct. Sam: "this still feels too weak, doesn't look like a real plant, so spend extra
      // detail on it". The second, the night before, was a puffed, cupped paddle on a long bare stalk, sixteen of them.)
      // A Strelitzia's blade is long and broad, square at its stalk, nearly flat across with its halves falling to the edge, a
      // raised pale midrib. The wind tears it along its side veins, so most older leaves have splits running in from the edge
      // toward the midrib, leaning to the tip, and its edge is never ruled. 40 by 16 pieces: local x across, y along, z out of
      // its face; the tears are left out of the mesh as narrow gaps between strips of the blade.
      const leaf = (L, Wd, bow, fold, twist, seed, nSplit) => {
        const Rl = FX.rng(seed), NL = 40, NW = 16, pos = [], uv = [], idx = [];
        // (a tear is a split, not a hole: it widens to the edge and the strip beyond it hangs a little lower, so it reads as torn
        // leaf. Cut one row wide, the first ones read as white specks against the wall)
        const tears = []; for (let k = 0; k < nSplit; k++) tears.push([Rl() < 0.5 ? -1 : 1, 0.3 + Rl() * 0.5, 0.55 + Rl() * 0.35]);
        const tl = (ac, te) => te - 0.16 * (1 - ac), past = (sx, t) => tears.reduce((z, [sd, te, dp]) => (Math.sign(sx) === sd && Math.abs(sx) > 1 - dp && t > tl(Math.abs(sx), te) ? z + 1 : z), 0);
        const wa = 0.003 + Rl() * 0.004, wp = Rl() * 6.28, wk = 26 + Rl() * 14;
        const half = (t) => Wd * 0.5 * (t < 0.1 ? 0.6 + 0.4 * Math.sin((t / 0.1) * Math.PI / 2) : 1) * Math.pow(Math.max(0, 1 - Math.pow(Math.max(0, (t - 0.42) / 0.58), 2.2)), 0.55);
        for (let j = 0; j <= NL; j++) {
          const t = j / NL, hw = half(t), tw = (twist || 0) * t, ct = Math.cos(tw), st = Math.sin(tw);
          for (let i = 0; i <= NW; i++) {
            const sx = (i / NW) * 2 - 1, ax = Math.abs(sx), lx = sx * hw;
            const lz = fold * hw * (ax - 1.25 * ax * ax) + 0.0035 * Math.exp(-Math.pow(sx / 0.07, 2)) + wa * Math.pow(ax, 3) * Math.sin(t * wk + wp + sx) - 0.012 * past(sx, t) * Math.pow(ax, 2);
            pos.push(lx * ct - lz * st, t * L - bow * 0.2 * t * t * L, bow * t * t * t * L * 1.3 + lx * st + lz * ct); uv.push(i / NW, t);
          }
        }
        for (let j = 0; j < NL; j++) for (let i = 0; i < NW; i++) {
          const tc = (j + 0.5) / NL, sc = ((i + 0.5) / NW) * 2 - 1, ac = Math.abs(sc);
          if (tears.some(([sd, te, dp]) => Math.sign(sc) === sd && ac > 1 - dp && Math.abs(tc - tl(ac, te)) < (0.42 + 1.1 * Math.max(0, ac - (1 - dp)) / dp) / NL)) continue;
          const k = j * (NW + 1) + i; idx.push(k, k + 1, k + NW + 1, k + 1, k + NW + 2, k + NW + 1);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
        g.computeVertexNormals();
        return g;
      };
      const pebble2 = new THREE.SphereGeometry(1, 14, 10);
      thing(X, Y, () => {
        // the basket: a tapered woven pot 50 cm tall, a rolled rim, the soil 4 cm under it
        const prof = [[0, 0], [0.2, 0], [0.214, 0.015], [0.268, 0.47], [0.284, 0.49], [0.286, 0.505], [0.274, 0.512], [0.258, 0.495], [0.25, 0.46], [0, 0.46]];
        B.add(M.rattan, new THREE.LatheGeometry(prof.map(([r, h]) => new THREE.Vector2(r, h)), 72), FX.M(WX(X), 0, WZ(Y)));
        cyl(d, 'soilDark', X, Y, 0.45, 0.462, 0.252, 0.252, 40);
        // Four fans, as a Strelitzia grows: in each, leaves alternate left and right in one plane, the old ones low, broad, torn
        // and arching out, the young ones upright and whole, and in two of them a new leaf still rolled. Each stalk is stout and
        // tapers from a flattened sheath at the soil, where the sheaths of a fan overlap. The fans face the room.
        const Rs = FX.rng(2031), up = new V3(0, 1, 0), soil = 0.462;
        [[0.86, 0.0, 0.0, 7], [0.2, 0.07, -0.05, 6], [1.6, -0.07, 0.06, 6], [2.35, -0.09, -0.03, 5]].forEach(([phi, ox, oy, n], f) => {
          const fa = new V3(Math.cos(phi), 0, Math.sin(phi)), fn = new V3(-Math.sin(phi), 0, Math.cos(phi));   // along the fan, and its face
          const bx = X + ox, by = Y + oy;
          for (let k = 0; k < n; k++) {
            const age = 1 - k / (n - 1), side = k % 2 ? 1 : -1;                               // 1 the oldest leaf, 0 the youngest
            const q = Array.from({ length: 12 }, () => Rs());
            // (a leaf that would cross a wall or reach over the hearth's end leans in a little less: the corner's two walls
            // cut the low leaves off, 16 Oct, Sam: "fix this bug")
            const build = (ks) => {
              const ln = ks * (side * (0.1 + 0.62 * age) + (q[0] - 0.5) * 0.1), Hs = (0.42 + 0.45 * (1 - age)) * (0.9 + q[1] * 0.25);
              const dir = new V3().addScaledVector(fa, Math.sin(ln)).addScaledVector(up, Math.cos(ln)).addScaledVector(fn, (q[2] - 0.5) * 0.14).normalize();
              const b0 = new V3(WX(bx) + fa.x * side * 0.018 * k, soil - 0.02, WZ(by) + fa.z * side * 0.018 * k), top = b0.clone().addScaledVector(dir, Hs);
              const L = (0.62 + 0.32 * age) * (0.9 + q[3] * 0.2), Wd = L * (0.35 + q[4] * 0.07);
              const ly = new V3().addScaledVector(fa, Math.sin(ln * 1.35)).addScaledVector(up, Math.cos(ln * 1.35)).addScaledVector(fn, (q[5] - 0.5) * 0.3).normalize();
              const lx = new V3().crossVectors(ly, fn).normalize(); lx.applyAxisAngle(ly, (q[6] - 0.5) * 0.7);
              const lz = new V3().crossVectors(lx, ly).normalize();
              const tears = age > 0.4 ? 1 + (q[11] < 0.35 * age ? 1 : 0) : 0;
              const g = leaf(L, Wd, -(0.06 + 0.26 * age + q[7] * 0.08), 0.16 + q[8] * 0.12, (q[9] - 0.5) * 0.6, (q[10] * 1e6) | 0, tears).applyMatrix4(new THREE.Matrix4().makeBasis(lx, ly, lz).setPosition(top.clone().addScaledVector(dir, -0.02)));
              const p = g.attributes.position; let ok = true;
              for (let i = 0; i < p.count && ok; i++) { const px = p.getX(i) + 30, py = p.getZ(i) + 24; if (py > 16.78 || px < 9.3 || (px < 10.02 && py < 15.12)) ok = false; }
              return { ok, b0, top, dir, g };
            };
            let lf = build(1);
            for (let ks = 0.85; !lf.ok && ks > 0.2; ks *= 0.85) lf = build(ks);
            const { b0, top, dir } = lf;
            tleg(d, 'strelStem', [b0.x + 30, b0.z + 24, b0.y], [top.x + 30, top.z + 24, top.y], 0.021, 0.011);
            // the sheath: a flattened sleeve round the stalk's foot, in the plane of the fan
            { const xa = fa.clone().addScaledVector(dir, -fa.dot(dir)).normalize(), za = new V3().crossVectors(xa, dir);
              d.add(M.strelStem, pebble2, new THREE.Matrix4().makeBasis(xa, dir, za).scale(new V3(0.04, 0.17, 0.018)).setPosition(b0.clone().addScaledVector(dir, 0.14))); }
            d.add(M.strelLeaf, lf.g);
          }
          // the new leaf, still rolled: a slender spear at the fan's heart, its tip just opening (a leaf folded nearly shut)
          if (f < 2) {
            const nb = new V3(WX(bx), soil, WZ(by)), ntop = nb.clone().addScaledVector(up, 0.95 + Rs() * 0.15);
            tleg(d, 'strelStem', [nb.x + 30, nb.z + 24, nb.y], [ntop.x + 30, ntop.z + 24, ntop.y], 0.016, 0.011);
            const lx = fn.clone(), ly = up.clone().addScaledVector(fa, 0.08).normalize(), lz = new V3().crossVectors(lx, ly).normalize();
            d.add(M.strelLeaf, leaf(0.55, 0.075, -0.03, 1.5, 0.4, 900 + f, 0).applyMatrix4(new THREE.Matrix4().makeBasis(lx, ly, lz).setPosition(ntop.clone().addScaledVector(up, -0.03))));
          }
        });
      }, 1.2);
    }
    curtain('living', 'v', 20.72, 15.6, 16.6, 0.02, 4.42); curtain('living', 'v', 20.72, 8.3, 9.0, 0.02, 4.42);
    // (1.3 by 1.75 m, its foot at 1.18 m, since iteration 8, the same as the painting on the pier's kitchen face. 1.4 by 1.9 at 2.2)
    art('living', 'gesture', 'N', 10.05, 8.13, 2.05, 1.3, 1.75, 'black', 5);
  }

  /* ================= kitchen and dining =============================================== */
  {
    const d = dec('kitchen');
    thing(14.0, 4.0, () => {
    // The island (iteration 8, Sam, 15 Oct: "make sure that we have a marble counter, so we don't have like a rectangle
    // block... a counter on the top that is another color, darker... exceeding only the side where the chairs are, so the
    // chairs can be underneath"). A base in the tall cabinets' matte oak on a recessed black plinth, and a 4 cm top of the
    // gallery's black marble that runs 30 cm past the base on the stools' side only. One block of white quartz until then.
    box(B, 'black', 11.6, 3.5, 16.4, 4.5, 0, 0.1, 0.003);                                   // the plinth, set back
    box(B, 'cabinet', 11.55, 3.45, 16.45, 4.55, 0.1, 0.89, 0.006);                          // the base
    box(B, 'marbleNero', 11.5, 3.4, 16.5, 4.9, 0.89, 0.93, 0.006);                          // the top, over the stools' knees
    colliders.push({ id: 'island', box: new THREE.Box3(new V3(WX(11.5), 0, WZ(3.4)), new V3(WX(16.5), 0.93, WZ(4.9))) });
    box(d, 'black', 12.3, 3.65, 13.1, 4.15, 0.905, 0.932, 0.004);                           // the sink
    // the faucet on the stools' side of the sink, its spout reaching back over it, so whoever is at the sink faces the room
    // (Sam: "the faucet is on the other side". It stood on the far side, so the cook would have turned their back to the stools.)
    rod(d, 'brass', [12.7, 4.28, 0.93], [12.7, 4.28, 1.31], 0.012); rod(d, 'brass', [12.7, 4.28, 1.31], [12.7, 4.04, 1.31], 0.012); rod(d, 'brass', [12.7, 4.04, 1.31], [12.7, 4.04, 1.23], 0.012);
    lathe(d, 'ceramic', 14.6, 4.0, 0.93, BOWL.map(([r, h]) => [r * 1.5, h * 1.5])); for (let i = 0; i < 7; i++) ball(d, 'lemon', 14.6 + (R() - 0.5) * 0.3, 4.0 + (R() - 0.5) * 0.3, 1.03 + R() * 0.05, 0.045, 1.15);
    // (a cleaner counter since 13 Oct: no boards, no vase of sprigs. The sprigs are built and thrown away, for the random numbers.)
    sprigs(tagged(new FX.Batch()), 16.15, 4.25, 1.24, 0.6, 4);
    });
    // (tucked in under the top's overhang since iteration 8: 4.98 until then, against a block with no overhang)
    // (three, each under one of the island's pendants: four until iteration 8, Sam: "for the stool, maybe you can also just add three")
    [12.6, 14.0, 15.4].forEach((x) => stool(B, x, 5.12));
    [12.6, 14.0, 15.4].forEach((x) => pendant(d, x, 4.0, 3.6, 1.72, 0.1, 'drum'));
    // the cabinet wall: oak fronts, a dark oven, a lit niche. It scans in like a wall (see scanned)
    scanned(() => {
    // (a matte oak veneer of its own since iteration 8, Sam, 15 Oct: "make a better texture for this cabinet, more polished
    // and more like matte". It wore the floor's oak, whose boards and bevels drew a patchwork of squares on the doors.)
    box(B, 'cabinet', 9.13, 0.4, 9.75, 4.6, 0, 2.6, 0.01); colliders.push({ id: 'tall', box: new THREE.Box3(new V3(WX(9.13), 0, WZ(0.4)), new V3(WX(9.75), 2.6, WZ(4.6))) });
    for (let i = 1; i < 7; i++) box(d, 'black', 9.748, 0.4 + i * 0.6 - 0.004, 9.754, 0.4 + i * 0.6 + 0.004, 0.02, 2.58, 0.001);
    box(d, 'black', 9.75, 2.24, 9.762, 2.96, 0.95, 1.95, 0.003); box(d, 'brass', 9.762, 2.3, 9.775, 2.9, 1.82, 1.84, 0.002);
    box(d, 'black', 9.75, 3.44, 9.76, 4.56, 1.1, 1.75, 0.003); box(d, 'glow', 9.76, 3.46, 9.764, 4.54, 1.72, 1.74, 0.001);
    });
    thing(9.86, 3.9, () => { vase(d, 'ceramic', 9.86, 3.7, 1.12, 0.45); lathe(d, 'clay', 9.86, 4.1, 1.12, BOWL.map(([r, h]) => [r * 0.7, h * 0.7])); });
    // The table for fourteen: one slab of solid walnut on two slab legs (a scan of veneer tiles until 13 Oct, with chairs in
    // another wood. Sam: "make sure the table have a nice wooden premium texture", "make better premium chair").
    thing(20.2, 4.0, () => { box(B, 'walnutSolid', 17.2, 3.4, 23.2, 4.6, 0.7, 0.76, 0.006); box(B, 'walnutSolid', 17.5, 3.6, 17.62, 4.4, 0, 0.7, 0.005); box(B, 'walnutSolid', 22.78, 3.6, 22.9, 4.4, 0, 0.7, 0.005); });
    // Six chairs, three a side, each under one of the three pendants (fourteen in a row until iteration 8. Sam, 15 Oct: "remove
    // ... three on each side, because right now it feels like a line of chair"), in a dark smoked oak (the table's walnut until
    // then: "find another color, maybe darker, more premium... right now it feels like cheap wood with a cushion"): four
    // tapered legs, a slim apron, a leather seat set flush into it, the back legs running on up into posts that lean back, and
    // a back rail bent round the sitter. s: which side the back is on (-1 north, +1 south).
    const chair = (x, y, s) => thing(x, y, () => {
      const SH = 0.46;
      [[-1, -1], [1, -1]].forEach(([sx]) => tleg(B, 'chairWood', [x + sx * 0.215, y - s * 0.215, 0], [x + sx * 0.2, y - s * 0.2, SH], 0.013, 0.02));      // the front legs
      [-1, 1].forEach((sx) => { tleg(B, 'chairWood', [x + sx * 0.215, y + s * 0.235, 0], [x + sx * 0.2, y + s * 0.2, SH], 0.014, 0.02);                  // the back legs, and on up
        tleg(B, 'chairWood', [x + sx * 0.2, y + s * 0.2, SH], [x + sx * 0.19, y + s * 0.27, 0.86], 0.02, 0.014); });
      rbox(B, 'chairWood', x, y, SH - 0.06, SH - 0.005, 0.44, 0.44, 0.006, 0, 0);                                              // the apron
      rbox(B, 'leather', x, y - s * 0.005, SH - 0.02, SH + 0.035, 0.4, 0.4, 0.018, 0, 0);                                      // the seat
      // the back: one curved panel of the wood, 18 cm deep, wrapping the posts' tops (five flat pieces until the night of 15 Oct)
      curvedBack(B, 'chairWood', x, y, s, 0.44, 0.27, 0.34, 0.026, 0.66, 0.86);
    });
    // (four a side since the night of 15 Oct, Sam: "let's add four on each side, right now it feels too much space", and
    // tucked in: the seat's front edge 5 cm under the table's edge. They stood 20 cm out from it: "too far from the table")
    [18.25, 19.55, 20.85, 22.15].forEach((x) => { chair(x, 3.25, -1); chair(x, 4.75, 1); });
    box(d, 'linenW', 17.9, 3.82, 22.5, 4.18, 0.76, 0.766, 0.002);                          // a runner
    // small vessels down the runner, in two groups (three vases of olive sprigs and two bowls until 13 Oct. Sam: "remove the
    // plant on the table", "add smaller vase for the decoration"). The sprigs are built and thrown away, for the random numbers.
    [[18.6, 0.75], [20.2, 1.0], [21.8, 0.7]].forEach(([x, s]) => sprigs(tagged(new FX.Batch()), x, 4.0, 0.766 + 0.5 * s, 0.6 * s + 0.2, 5));
    [[19.25, 3.95, 'ceramic', 0.42, null], [19.42, 4.06, 'clay', 0.3, AMPHORA], [19.08, 4.07, 'inkObj', 0.26, null],
     [21.1, 3.94, 'inkObj', 0.38, AMPHORA], [21.28, 4.06, 'ceramic', 0.28, null]].forEach(([x, y, m, sc, pts]) => vase(d, m, x, y, 0.766, sc, pts || undefined));
    [19.0, 20.6, 22.2].forEach((x) => { cyl(d, 'brass', x, 3.92, 0.766, 0.9, 0.012, 0.012, 8); cyl(d, 'white', x, 3.92, 0.9, 1.04, 0.011, 0.011, 8); });
    [18.5, 20.2, 21.9].forEach((x) => pendant(d, x, 4.0, 3.6, 1.78, 0.3, 'dome'));
    lamp('kitchen', 20.2, 4.0, 2.25, 0xffd6a0, 4.2, 8);                  // up among the pendants: at 1.5 m it stood in the sprigs and burnt them white
    // The wine room behind its glass (16 Oct, Sam: "a view of a nice wine cellar that would look premium". The walk now
    // turns to it from the far end of the table, before the patio). Walls in smoked oak; the east wall a backlit wall of
    // bottles lying on black steel rails, three bays of nine rows, necks toward you, their capsules a scatter of gold,
    // claret, black and cream; the side walls shelves of bottles standing label out, lit from under each shelf; in the
    // middle a tasting table of travertine on a black plinth with a decanter and four glasses, a brass pendant over it.
    // (Until then: two dark boards and nine rows of black cylinders.) Its own random numbers.
    {
      const Rw = FX.rng(808);
      if (!M.bottle) Object.assign(M, {
        bottle: D(new THREE.MeshPhysicalMaterial({ color: 0x14201a, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.3 })),
        capGold: D(P({ color: 0xb08a52, metalness: 0.9, roughness: 0.35, envMapIntensity: 1.1 })), capRed: D(P({ color: 0x5a1520, roughness: 0.45, envMapIntensity: 0.7 })),
        capCream: D(P({ color: 0xe7ddc8, roughness: 0.6 })), label: D(P({ color: 0xe9e1cf, roughness: 0.85 })),
        clearGlass: D(new THREE.MeshPhysicalMaterial({ color: 0x4f5958, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0.01, envMapIntensity: 2.2 })),   // (dark, its light all reflection: pale, it read as white china)
        redWine: D(new THREE.MeshPhysicalMaterial({ color: 0x3a0610, roughness: 0.05, clearcoat: 1, envMapIntensity: 1.2 })),
      });
      // (the detail pass, 16 Oct, Sam: "on the wine cellar, just focus on details a little bit more. Right now it feels it's
      // good, but a bit average... polishing the details, the table, and all that stuff inside")
      if (!M.bottleG) Object.assign(M, {
        bottleG: D(new THREE.MeshPhysicalMaterial({ color: 0x2c3a1c, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.3 })),
        bottleA: D(new THREE.MeshPhysicalMaterial({ color: 0x3b2410, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.3 })),
        cheese: D(P({ color: 0xe8d6a8, roughness: 0.7 })), grape: D(new THREE.MeshPhysicalMaterial({ color: 0x2a0f22, roughness: 0.3, clearcoat: 0.6, envMapIntensity: 0.8 })),
      });
      const CAPS = ['capGold', 'capRed', 'black', 'capCream', 'capRed', 'capGold'], GLASS = ['bottle', 'bottle', 'bottleG', 'bottleA'];
      // two shapes of bottle, turned: a Bordeaux, straight with high shoulders, and a Burgundy, broader with sloping ones;
      // the capsule over the neck a separate piece in its foil
      const lt = (pts) => new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), 10);
      const BORD = lt([[0, 0], [0.034, 0.002], [0.037, 0.02], [0.037, 0.2], [0.033, 0.225], [0.018, 0.25], [0.0145, 0.262], [0.0145, 0.3], [0, 0.3]]);
      const BURG = lt([[0, 0], [0.04, 0.002], [0.042, 0.02], [0.042, 0.15], [0.032, 0.21], [0.018, 0.25], [0.0145, 0.262], [0.0145, 0.3], [0, 0.3]]);
      const MAG = lt([[0, 0], [0.05, 0.003], [0.054, 0.03], [0.054, 0.3], [0.046, 0.34], [0.024, 0.38], [0.019, 0.395], [0.019, 0.45], [0, 0.45]]);
      const CAP = new THREE.CylinderGeometry(0.0155, 0.0155, 0.05, 8), CAPM = new THREE.CylinderGeometry(0.02, 0.02, 0.065, 10);
      // a bottle with its base at p along the world direction u
      const bottleAt = (bt, p, u, cap, kind) => {
        const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), u), at = (o) => new THREE.Matrix4().compose(p.clone().addScaledVector(u, o), q, new V3(1, 1, 1));
        const mag = kind === 2;
        bt.add(M[GLASS[(Rw() * GLASS.length) | 0]], mag ? MAG : kind ? BURG : BORD, at(0)); bt.add(M[cap], mag ? CAPM : CAP, at(mag ? 0.43 : 0.285));
      };
      // the walls in smoked oak (the outer walls are 40 cm, so their faces are at 0.2 and 7.8: the east one, inside, is 26)
      box(B, 'chairWood', 25.15, 0.2, 28.87, 0.24, 0, 3.55, 0.004); box(B, 'chairWood', 28.83, 0.2, 28.87, 7.8, 0, 3.55, 0.004); box(B, 'chairWood', 25.15, 7.76, 28.87, 7.8, 0, 3.55, 0.004);
      // over the racks, a frieze of oak fins up to the ceiling
      for (let y = 0.3; y < 7.7; y += 0.09) box(d, 'chairWood', 28.78, y, 28.83, y + 0.045, 2.8, 3.55, 0.003);
      // the east wall: three backlit bays of bottles on black rails, necks out; in the middle one, a lit shelf of three magnums
      [[0.55, 2.75], [2.95, 5.15], [5.35, 7.55]].forEach(([y0, y1], bay) => thing(28.6, (y0 + y1) / 2, () => {
        box(d, 'bayGlow', 28.8, y0, 28.82, y1, 0.3, 2.62, 0.001);
        box(d, 'black', 28.5, y0 - 0.06, 28.83, y0, 0.25, 2.7, 0.003); box(d, 'black', 28.5, y1, 28.83, y1 + 0.06, 0.25, 2.7, 0.003);
        for (let j = 0; j < 9; j++) {
          const z = 0.42 + j * 0.25;
          if (bay === 1 && j >= 3 && j <= 5) continue;
          box(d, 'black', 28.48, y0, 28.52, y1, z - 0.05, z - 0.04, 0.001); box(d, 'black', 28.66, y0, 28.7, y1, z - 0.05, z - 0.04, 0.001);
          for (let y = y0 + 0.07; y < y1 - 0.05; y += 0.115) bottleAt(d, new V3(WX(28.78), z, WZ(y)), new V3(-1, 0, 0), CAPS[(Rw() * CAPS.length) | 0], Rw() < 0.3 ? 1 : 0);
        }
        if (bay === 1) {
          box(d, 'chairWood', 28.42, y0, 28.8, y1, 1.12, 1.15, 0.003); box(d, 'brass', 28.415, y0, 28.425, y1, 1.12, 1.15, 0.001);
          [y0 + 0.55, (y0 + y1) / 2, y1 - 0.55].forEach((y, k) => bottleAt(d, new V3(WX(28.62), 1.15, WZ(y)), new V3(0, 1, 0), ['capGold', 'capRed', 'capGold'][k], 2));
          [y0 + 0.82, y1 - 0.82].forEach((y) => { const p = new V3(WX(28.6), 1.17, WZ(y)); bottleAt(d, p, new V3(0, 0.12, y < (y0 + y1) / 2 ? 1 : -1).normalize(), 'capCream', 0); });
          box(d, 'glow', 28.5, y0, 28.52, y1, 1.68, 1.69, 0.001);
        }
        box(d, 'glow', 28.5, y0, 28.52, y1, 2.72, 2.73, 0.001);
      }));
      // the side walls: oak shelves of bottles standing label out, a line of light under each shelf's front
      [[0.24, 1], [7.76, -1]].forEach(([yw, f]) => thing(26.9, yw + f * 0.2, () => {
        for (let j = 0; j < 6; j++) {
          const z = 0.5 + j * 0.36, yf = yw + f * 0.34;
          box(d, 'chairWood', 25.4, Math.min(yw, yf), 28.45, Math.max(yw, yf), z - 0.03, z, 0.003);
          box(d, 'glow', 25.42, yf - f * 0.02, 28.43, yf - f * 0.012, z - 0.034, z - 0.03, 0.001);
          for (let x = 25.55; x < 28.35; x += 0.115) { const kind = Rw() < 0.4 ? 1 : 0, rr = kind ? 0.042 : 0.037; bottleAt(d, new V3(WX(x), z, WZ(yw + f * 0.17)), new V3(0, 1, 0), CAPS[(Rw() * CAPS.length) | 0], kind);
            if (Rw() < 0.75) box(d, 'label', x - 0.028, yw + f * 0.17 + f * rr, x + 0.028, yw + f * 0.17 + f * (rr + 0.0015), z + 0.05, z + 0.135, 0.001); }
        }
        // wooden cases under the lowest shelf
        [[25.7, 0], [26.25, 0], [25.95, 0.19]].forEach(([x, zc], k) => { box(d, 'oakConsole', x - 0.25, yw + f * 0.04, x + 0.25, yw + f * 0.36, zc, zc + 0.18, 0.004); box(d, 'black', x - 0.07, yw + f * 0.36, x + 0.07, yw + f * 0.362, zc + 0.11, zc + 0.14, 0.001); });
      }));
      // the tasting table: a slab of travertine, its edge eased, on a fluted pedestal of smoked oak with a brass band at its
      // foot. On it a walnut tray: a decanter of red, four tall glasses, an open bottle and its cork; a slate of cheese with
      // grapes; a brass bucket with a bottle in it. Two leather stools.
      thing(27.0, 4.0, () => {
        box(B, 'chairWood', 26.6, 3.6, 27.4, 4.4, 0.04, 0.88, 0.004); box(B, 'brass', 26.58, 3.58, 27.42, 4.42, 0, 0.04, 0.003);
        for (let k = 0; k < 9; k++) { const o = -0.36 + k * 0.09; [[26.6, 1], [27.4, -1]].forEach(([x, sd]) => cyl(d, 'chairWood', x - sd * 0.008, 4.0 + o, 0.05, 0.86, 0.022, 0.022, 10)); [[3.6, 1], [4.4, -1]].forEach(([y, sd]) => cyl(d, 'chairWood', 27.0 + o, y - sd * 0.008, 0.05, 0.86, 0.022, 0.022, 10)); }
        d.add(M.travBlock, FX.bevelBox(1.6, 0.08, 1.05, 0.018), FX.M(WX(27.0), 0.92, WZ(4.0)));
        box(d, 'walnutZ', 26.55, 3.62, 27.1, 3.98, 0.96, 0.975, 0.004);
        lathe(d, 'redWine', 26.75, 3.8, 0.975, [[0, 0], [0.11, 0], [0.125, 0.025], [0.12, 0.05], [0.0, 0.05]]);
        lathe(d, 'clearGlass', 26.75, 3.8, 0.975, [[0.124, 0.05], [0.1, 0.085], [0.045, 0.13], [0.022, 0.2], [0.02, 0.31], [0.026, 0.33], [0.0, 0.33]]);
        [[26.95, 3.7], [27.04, 3.88], [26.62, 3.66], [26.92, 3.92]].forEach(([x, y]) => lathe(d, 'clearGlass', x, y, 0.975, [[0, 0], [0.037, 0], [0.037, 0.004], [0.004, 0.01], [0.004, 0.12], [0.034, 0.15], [0.046, 0.2], [0.04, 0.25], [0.0, 0.25]]));
        bottleAt(d, new V3(WX(27.25), 0.96, WZ(3.8)), new V3(0, 1, 0), 'capRed', 1); cyl(d, 'cheese', 27.33, 3.92, 0.96, 0.995, 0.011, 0.011, 10);
        box(d, 'black', 26.6, 4.12, 26.98, 4.38, 0.96, 0.975, 0.003);
        [[26.7, 4.2], [26.8, 4.28], [26.88, 4.18]].forEach(([x, y], k) => d.add(M.cheese, new THREE.CylinderGeometry(0.05, 0.05, 0.04, 3, 1, false, 0, 0.9), FX.M(WX(x), 0.995, WZ(y), 0, k * 1.7, 0)));
        for (let k = 0; k < 14; k++) ball(d, 'grape', 26.9 + (Rw() - 0.5) * 0.08, 4.28 + (Rw() - 0.5) * 0.07, 0.99 + Rw() * 0.03, 0.009);
        lathe(d, 'brass', 27.22, 4.2, 0.96, [[0, 0], [0.07, 0], [0.085, 0.02], [0.095, 0.2], [0.1, 0.22], [0.09, 0.22], [0.08, 0.04], [0, 0.03]]);
        bottleAt(d, new V3(WX(27.22), 0.99, WZ(4.2)), new V3(0.15, 1, 0).normalize(), 'capGold', 0);
      });
      [[26.45, 4.75, 0.5], [27.55, 4.75, -0.5]].forEach(([x, y]) => thing(x, y, () => {
        cyl(B, 'brass', x, y, 0, 0.015, 0.2, 0.2, 28); cyl(B, 'brass', x, y, 0.015, 0.66, 0.018, 0.018, 10); cyl(B, 'brass', x, y, 0.28, 0.29, 0.17, 0.17, 24);
        cyl(B, 'leather', x, y, 0.66, 0.74, 0.2, 0.19, 28);
      }));
      // the glass door into it from the kitchen, a long brass pull at its edge
      box(B, 'brass', 24.96, 4.38, 24.98, 4.4, 0.55, 1.95, 0.004); [0.65, 1.85].forEach((z) => box(B, 'brass', 24.98, 4.385, 24.995, 4.395, z - 0.01, z + 0.01, 0.002));
      pendant(d, 27.0, 4.0, 3.6, 1.9, 0.24, 'dome');
      lamp('kitchen', 27.0, 4.0, 2.3, 0xffcf96, 2.2, 6);
    }
    // (on the pier's kitchen face, the same size and height as the living room's on its other face since iteration 8. Sam,
    // 15 Oct: "try to have the same height for the painting on both sides, and start at the same height". It hung 40 cm in
    // front of the wall, facing it, so from the kitchen it was an empty frame.)
    art('kitchen', 'veil', 'S', 10.05, 8 - 0.13, 2.05, 1.3, 1.75, 'walnut', 23);
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
    // ---- furniture for the rooms the walk never enters, drawn on the plan (16 Oct, Sam: "for the two guest suites, try to
    // find a creative layout... the two nightstands, the bed, some furniture, because right now both of them are exactly the
    // same layout, and I don't know what is each corner in the bottom left on each room, so remove that... the media, enhance
    // it a little bit... study and library, just add a little bit more to fill the room". They are read from above, so they
    // are drawn for their outlines. Until then each suite had the same bed and a walled box in its south-west corner.)
    const chair = (bt, x, y, rot, mat) => thing(x, y, () => {                // a side chair, its back away from rot's front
      const c = Math.cos(rot), sn = Math.sin(rot), at = (dx, dy) => [x + dx * c + dy * sn, y - dx * sn + dy * c];
      rbox(bt, mat || 'boucle', x, y, 0.42, 0.48, 0.46, 0.46, 0.03, rot); const b = at(0, -0.21); rbox(bt, 'walnut', b[0], b[1], 0.48, 0.86, 0.46, 0.05, 0.02, rot);
      [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].forEach(([dx, dy]) => { const l = at(dx, dy); cyl(bt, 'walnut', l[0], l[1], 0, 0.42, 0.016, 0.016, 6); });
    });
    const lampOn = (bt, x, y, z) => { cyl(bt, 'brass', x, y, z, z + 0.4, 0.012, 0.012, 8); cyl(bt, 'shade', x, y, z + 0.38, z + 0.6, 0.15, 0.12, 24); };
    const floorLamp = (bt, x, y) => { cyl(bt, 'black', x, y, 0, 0.02, 0.16, 0.16, 20); cyl(bt, 'brass', x, y, 0.02, 1.45, 0.01, 0.01, 8); cyl(bt, 'shade', x, y, 1.42, 1.72, 0.2, 0.17, 26); };
    const potPlant = (bt, x, y, h) => { cyl(bt, 'clay', x, y, 0, 0.42, 0.2, 0.16, 24); ball(bt, 'foliage', x, y, 0.42 + h * 0.45, h * 0.5, 1, 0.75); ball(bt, 'foliageL', x + 0.1, y - 0.08, 0.42 + h * 0.6, h * 0.3, 1.2, 0.6); };
    // a bed: its head on the wall at (hx, hy), lying along dir ('S', 'N', 'E', 'W'), w wide; pillows, a turned-down duvet, a throw
    const bedAt = (bt, dd, hx, hy, dir, w, throwMat) => {
      const L = 2.15, ax = { S: [0, 1], N: [0, -1], E: [1, 0], W: [-1, 0] }[dir], px = [-ax[1], ax[0]];
      const P = (a, b) => [hx + ax[0] * a + px[0] * b, hy + ax[1] * a + px[1] * b], bx = (bt2, m, a0, a1, b0, b1, z0, z1, r) => { const p0 = P(a0, b0), p1 = P(a1, b1); box(bt2, m, Math.min(p0[0], p1[0]), Math.min(p0[1], p1[1]), Math.max(p0[0], p1[0]), Math.max(p0[1], p1[1]), z0, z1, r); };
      thing(...P(L / 2, 0), () => {
        bx(bt, 'boucle', 0, 0.16, -w / 2 - 0.12, w / 2 + 0.12, 0, 1.2, 0.04);                     // the headboard
        bx(bt, 'walnut', 0.16, L, -w / 2, w / 2, 0, 0.26, 0.02); bx(bt, 'linenW', 0.18, L - 0.02, -w / 2 + 0.04, w / 2 - 0.04, 0.26, 0.5, 0.06);
        bx(dd, 'white', 0.22, 0.62, -w / 2 + 0.08, -0.04, 0.5, 0.62, 0.05); bx(dd, 'white', 0.22, 0.62, 0.04, w / 2 - 0.08, 0.5, 0.62, 0.05);   // pillows
        bx(dd, 'linenW', 0.7, 0.86, -w / 2 + 0.02, w / 2 - 0.02, 0.5, 0.56, 0.02);                 // the duvet turned down
        bx(dd, throwMat, L - 0.62, L - 0.2, -w / 2 - 0.02, w / 2 + 0.02, 0.5, 0.54, 0.02);          // a throw across the foot
        [-1, 1].forEach((sd) => { bx(bt, 'walnut', 0.04, 0.5, sd * (w / 2 + 0.12), sd * (w / 2 + 0.62), 0, 0.5, 0.01); const q = P(0.27, sd * (w / 2 + 0.37)); lampOn(dd, q[0], q[1], 0.5); });
      });
    };
    // Guest suite one: the bed against the east wall, facing the window; a pair of chairs and a table at the glass, a desk on
    // the north wall, a wardrobe along the south wall, a plant in the corner.
    {
      const dd = dec('living');
      bedAt(B, dd, 8.84, 13.0, 'W', 1.8, 'rust');
      box(dd, 'wool', 5.6, 11.4, 8.8, 14.6, 0, 0.018, 0.006);
      thing(6.15, 13.0, () => { box(B, 'walnut', 5.95, 12.25, 6.35, 13.75, 0, 0.38, 0.01); box(B, 'boucle', 5.93, 12.23, 6.37, 13.77, 0.38, 0.46, 0.03); });
      lounge(B, 1.25, 10.6, Math.PI / 2, 'boucle'); lounge(B, 2.95, 10.6, -Math.PI / 2, 'boucle'); cyl(B, 'travBlock', 2.1, 10.6, 0, 0.5, 0.26, 0.26, 28);
      box(dd, 'wool', 0.55, 9.6, 3.65, 11.6, 0, 0.018, 0.006);
      thing(4.6, 8.5, () => { box(B, 'walnut', 3.7, 8.15, 5.5, 8.75, 0.72, 0.76, 0.006); [3.75, 5.45].forEach((x) => box(B, 'black', x - 0.02, 8.2, x + 0.02, 8.7, 0, 0.72, 0.003)); lampOn(dd, 5.2, 8.4, 0.76); });
      chair(B, 4.4, 9.15, Math.PI, 'leather');
      box(B, 'walnut', 2.4, 15.25, 6.6, 15.86, 0, 2.4, 0.01); [3.45, 4.5, 5.55].forEach((x) => box(dd, 'black', x - 0.004, 15.24, x + 0.004, 15.25, 0.05, 2.35, 0.001));
      potPlant(dd, 0.65, 15.3, 1.3); potPlant(dd, 7.6, 8.7, 1.0);
    }
    // Guest suite two: the bed against the south wall; a chaise and a floor lamp by the window, a small round table with two
    // chairs in the north-west corner, a long credenza on the north wall, a wardrobe on the east wall past the door.
    {
      const dd = dec('entrance');
      bedAt(B, dd, 5.6, 23.86, 'N', 1.6, 'sage');
      box(dd, 'wool', 3.9, 20.7, 7.3, 23.8, 0, 0.018, 0.006);
      thing(1.25, 21.4, () => { rbox(B, 'boucle', 1.25, 21.4, 0.1, 0.42, 0.72, 1.7, 0.08, 0.35); rbox(B, 'boucle', 1.25 - 0.27, 21.4 - 0.75, 0.4, 0.75, 0.66, 0.34, 0.08, 0.35, -0.5); [[-0.25, -0.7], [0.25, -0.7], [-0.25, 0.7], [0.25, 0.7]].forEach(([dx, dy]) => cyl(B, 'walnut', 1.25 + dx * 0.94 + dy * 0.34, 21.4 - dx * 0.34 + dy * 0.94, 0, 0.1, 0.02, 0.02, 6)); });
      floorLamp(dd, 0.75, 22.55);
      cyl(B, 'walnut', 1.7, 17.4, 0.7, 0.74, 0.45, 0.45, 32); cyl(B, 'black', 1.7, 17.4, 0, 0.7, 0.05, 0.05, 10);
      chair(B, 1.7, 16.75, 0, 'boucle'); chair(B, 1.7, 18.05, Math.PI, 'boucle');
      thing(4.5, 16.4, () => { box(B, 'walnut', 2.8, 16.13, 6.2, 16.6, 0.1, 0.72, 0.01); box(B, 'black', 2.9, 16.18, 6.1, 16.55, 0, 0.1, 0.004); lampOn(dd, 3.3, 16.36, 0.72); vase(dd, 'ceramic', 5.6, 16.36, 0.72, 0.6); });
      box(B, 'walnut', 8.25, 20.7, 8.86, 23.2, 0, 2.4, 0.01); [21.53, 22.37].forEach((y) => box(dd, 'black', 8.24, y - 0.004, 8.25, y + 0.004, 0.05, 2.35, 0.001));
      lounge(B, 7.5, 17.6, -Math.PI * 0.75, 'leather'); potPlant(dd, 8.4, 16.6, 1.1);
    }
    // the media room, filled out: two speakers either side of the screen, a pair of leather chairs, side tables, a lamp, a long
    // console on the south wall, slats on the east wall
    {
      const dd = dec('kitchen');
      [[1.75, 2.15], [6.85, 7.25]].forEach(([a, b]) => box(B, 'black', a, 0.3, b, 0.7, 0, 1.15, 0.01));
      lounge(B, 7.7, 3.0, -Math.PI * 0.82, 'leather'); lounge(B, 7.7, 4.5, -Math.PI * 0.6, 'leather'); cyl(B, 'travBlock', 8.25, 3.75, 0, 0.5, 0.2, 0.2, 24);
      [[1.55, 5.9], [7.45, 5.9]].forEach(([x, y]) => { cyl(B, 'walnut', x, y, 0, 0.5, 0.22, 0.22, 24); lampOn(dd, x, y, 0.5); });
      thing(4.5, 7.6, () => { box(B, 'walnut', 2.2, 7.35, 6.8, 7.8, 0.1, 0.75, 0.01); box(B, 'black', 2.3, 7.4, 6.7, 7.75, 0, 0.1, 0.004); vase(dd, 'glazeBlack', 3.0, 7.57, 0.75, 0.7); vase(dd, 'ceramic', 6.0, 7.57, 0.75, 0.5); });
      for (let y = 0.5; y < 4.7; y += 0.12) box(dd, 'walnut', 8.8, y, 8.86, y + 0.06, 0.05, 2.9, 0.003);
      potPlant(dd, 0.65, 7.3, 1.2);
    }
    // the study: a round table with four chairs, a reading chair with an ottoman and a lamp, a credenza, a lamp on the desk
    {
      const dd = dec('gallery');
      lampOn(dd, 34.2, 2.45, 0.75);
      cyl(B, 'walnut', 31.0, 6.4, 0.72, 0.76, 0.55, 0.55, 40); cyl(B, 'black', 31.0, 6.4, 0, 0.72, 0.06, 0.06, 12);
      [0, 1, 2, 3].forEach((k) => { const a = k * Math.PI / 2 + Math.PI / 4; chair(B, 31.0 + Math.cos(a) * 0.82, 6.4 + Math.sin(a) * 0.82, -a - Math.PI / 2, 'leather'); });
      lounge(B, 36.6, 6.5, Math.PI + 0.55, 'leather'); cushion(B, 'leather', 36.0, 5.75, 0, 0.55, 0.42, 0.45, 0.4); floorLamp(dd, 37.4, 7.3);
      thing(29.4, 4.0, () => { box(B, 'walnut', 29.15, 2.4, 29.62, 5.6, 0.1, 0.75, 0.01); lampOn(dd, 29.38, 2.8, 0.75); vase(dd, 'glazeBlack', 29.38, 5.0, 0.75, 0.6); });
      potPlant(dd, 37.4, 1.2, 1.3);
    }
    // the library: a long reading table with six chairs and two lamps, a sofa against the west wall, a ladder on the shelves
    {
      const dd = dec('gallery');
      thing(41.1, 2.6, () => { box(B, 'walnut', 39.6, 2.1, 42.6, 3.1, 0.72, 0.77, 0.008); [39.9, 42.3].forEach((x) => box(B, 'walnut', x - 0.04, 2.25, x + 0.04, 2.95, 0, 0.72, 0.004)); [40.3, 41.9].forEach((x) => lampOn(dd, x, 2.6, 0.77)); });
      [40.2, 41.1, 42.0].forEach((x) => { chair(B, x, 1.65, 0, 'leather'); chair(B, x, 3.55, Math.PI, 'leather'); });
      box(dd, 'wool', 39.1, 1.3, 43.1, 3.9, 0, 0.018, 0.006);
      thing(38.6, 2.6, () => { box(B, 'walnut', 38.15, 1.4, 38.95, 3.8, 0.1, 0.42, 0.01); box(B, 'leather', 38.18, 1.45, 38.92, 3.75, 0.42, 0.55, 0.06); box(B, 'leather', 38.15, 1.4, 38.35, 3.8, 0.42, 0.85, 0.04); });
      rod(B, 'brass', [40.9, 0.62, 2.75], [40.9, 1.35, 0], 0.014); rod(B, 'brass', [41.35, 0.62, 2.75], [41.35, 1.35, 0], 0.014);
      for (let k = 1; k < 8; k++) { const t = k / 8; rod(B, 'brass', [40.9, 0.62 + 0.73 * (1 - t), 2.75 * t], [41.35, 0.62 + 0.73 * (1 - t), 2.75 * t], 0.01); }
    }
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
    // Big planters with agaves and grasses along the gallery glass and by the kitchen. (Rebuilt the night of 15 Oct, Sam: "the
    // connection from the plant to the vase, maybe add some dirt or rocks... and make the plants a little bit more
    // realistic". Each was a closed concrete drum with a flat lid and a thin tuft standing on it.) Now an open vessel in the
    // dark concrete with a rolled lip, its inside wall showing down to the soil 8 cm under the lip, the soil dressed with
    // river pebbles, and the plant growing out of it: an agave as a dense spiral rosette of thick blue-green leaves, stiff and
    // spreading outside, upright at the heart; a New Zealand flax as broad strap leaves in olive and bronze. Their own random numbers (the old planting is built and thrown away, so nothing else moves).
    M.agave = M.agave || D(P({ color: 0x627d70, roughness: 0.55, envMapIntensity: 0.6 }), { noRing: true });
    M.agave2 = M.agave2 || D(P({ color: 0x7f9787, roughness: 0.6, envMapIntensity: 0.6 }), { noRing: true });
    M.flax = M.flax || D(P({ color: 0x4f5a34, roughness: 0.55, envMapIntensity: 0.6, side: THREE.DoubleSide }), { noRing: true });
    M.flax2 = M.flax2 || D(P({ color: 0x5e4a33, roughness: 0.55, envMapIntensity: 0.6, side: THREE.DoubleSide }), { noRing: true });
    const PLANTER = [[0, 0], [0.4, 0], [0.416, 0.02], [0.488, 0.66], [0.5, 0.69], [0.5, 0.705], [0.486, 0.712], [0.47, 0.695], [0.462, 0.64], [0, 0.62]];
    const pebble = new THREE.SphereGeometry(1, 10, 7);
    [[39.9, 15.5, 'a', 41], [39.9, 21.5, 'g', 43], [39.9, 26.0, 'a', 47], [22.0, 13.5, 'g', 53], [22.0, 21.0, 'a', 59]].forEach(([x, y, k, sd]) => {
      const old = tagged(new FX.Batch());
      if (k === 'a') clump(old, x, y, 0.66, 0.85, 14, 'foliage', 0.9); else clump(old, x, y, 0.66, 1.3, 26, 'straw', 0.45);
      thing(x, y, () => {
        const Rp = FX.rng(sd * 101), soil = 0.625;
        B.add(M.conc, new THREE.LatheGeometry(PLANTER.map(([r, h]) => new THREE.Vector2(r, h)), 64), FX.M(WX(x), 0, WZ(y)));
        cyl(d, 'soilDark', x, y, soil - 0.01, soil, 0.468, 0.468, 48);
        // the top dressing: river pebbles, pale and grey, two to five centimetres, thicker toward the rim
        for (let i = 0; i < 110; i++) { const a = Rp() * 6.28, r = 0.12 + Math.sqrt(Rp()) * 0.33, sz = 0.012 + Rp() * Rp() * 0.03;
          d.add(i % 4 ? M.stoneW : M.pathStone, pebble, FX.M(WX(x + Math.cos(a) * r), soil + sz * 0.35, WZ(y + Math.sin(a) * r), Rp() * 0.4, Rp() * 6.28, 0, sz * (1.1 + Rp() * 0.5), sz * 0.6, sz)); }
        if (k === 'a') {
          // the rosette: leaves on a golden-angle spiral, the outer ones longest and spreading, the inner short and upright
          const N = 30;
          for (let i = 0; i < N; i++) {
            const t = i / N, a = i * 2.39996 + Rp() * 0.2, len = (0.78 - 0.42 * t) * (0.9 + Rp() * 0.2), w = 0.12 - 0.04 * t;
            const lean = 1.2 - 1.05 * t + (Rp() - 0.5) * 0.12, g = bladeGeo(len, w, 0.08 + 0.12 * Rp() * (1 - t), 0.32);
            d.add(i % 3 ? M.agave : M.agave2, g, FX.M(WX(x), soil + 0.02, WZ(y), 0, -a + Math.PI / 2, 0, 1, 1, 1, 'YXZ').multiply(new THREE.Matrix4().makeRotationX(lean)));
          }
        } else {
          // a New Zealand flax: some 46 broad strap leaves, 3 to 5 cm wide, rising and arching out, in bronze and olive greens.
          // (A fountain grass of fine blades first: thinner than a pixel from across the patio, it would have blinked, as the
          // thin tuft did. Sam: "the small plant is like blinking, and is not really detailed".)
          for (let i = 0; i < 36; i++) {
            const t = i / 36, a = i * 2.39996 + Rp() * 0.3, lean = 0.75 - 0.6 * t + (Rp() - 0.5) * 0.15, hh = (0.85 + 0.45 * t) * (0.85 + Rp() * 0.3);
            const g = bladeGeo(hh, 0.11 + Rp() * 0.04, 0.18 + 0.3 * Rp() * (1 - t), 0.1);       // (the blade narrows to its tip: 7 to 10 cm at the foot is a 4 cm strap half way)
            d.add(i % 3 === 0 ? M.flax2 : M.flax, g, FX.M(WX(x), soil + 0.01, WZ(y), 0, -a + Math.PI / 2, 0, 1, 1, 1, 'YXZ').multiply(new THREE.Matrix4().makeRotationX(lean)));
          }
        }
      }, 0.9);
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
    // The door from the patio: a sliding pane of glass in a slim bronze frame, parked open outside the fixed glass beside the
    // doorway the walk comes in by, on a track at the floor and the ceiling, a long bronze pull on its leading edge. (16 Oct,
    // Sam: "here we should have the door. Even though the camera goes through the glass, I'm fine with it, but at least we
    // should have a door". A gap in the glass until then.)
    thing(40.9, 12.6, () => {
      box(dec('patio:see'), 'glass', 40.885, 12.64, 40.9, 14.6, 0.05, 3.53, 0.002);
      [[12.6, 12.645], [14.595, 14.64]].forEach(([a, b]) => box(B, 'frame', 40.875, a, 40.91, b, 0.03, 3.55, 0.002));
      box(B, 'frame', 40.875, 12.6, 40.91, 14.64, 0.03, 0.07, 0.002); box(B, 'frame', 40.875, 12.6, 40.91, 14.64, 3.51, 3.55, 0.002);
      box(B, 'frame', 40.86, 10.55, 40.925, 14.68, 0, 0.022, 0.002); box(B, 'frame', 40.86, 10.55, 40.925, 14.68, 3.55, 3.6, 0.002);
      box(d, 'bronze', 40.84, 12.67, 40.86, 12.69, 0.6, 2.0, 0.004); [0.7, 1.9].forEach((z) => box(d, 'bronze', 40.86, 12.672, 40.876, 12.688, z - 0.01, z + 0.01, 0.002));
    });
    // a track of spots on the ceiling, one aimed at each painting
    box(d, 'black', 43.0, 9.0, 43.03, 31.0, 3.56, 3.58, 0.002);
    for (let i = 0; i < 7; i++) { const y = 10.9 + i * 3; d.add(M.black, new THREE.CylinderGeometry(0.035, 0.04, 0.12, 12), FX.M(WX(43.05), 3.5, WZ(y), 0, 0, -0.5)); cyl(d, 'glow', 43.085, y, 3.435, 3.445, 0.028, 0.028, 10); }
    // benches: two trestles of solid walnut on brass shoes, a stretcher between them, a seat of cognac leather on a walnut
    // frame (16 Oct, Sam: "for the small bench as well". A walnut slab on two black legs until then)
    [16.9, 22.9].forEach((yc) => thing(43.4, yc, () => {
      const y0 = yc - 1, y1 = yc + 1;
      [y0 + 0.14, y1 - 0.14].forEach((yl) => { box(B, 'walnutZ', 43.19, yl - 0.032, 43.61, yl + 0.032, 0.025, 0.37, 0.006); box(B, 'brass', 43.19, yl - 0.034, 43.61, yl + 0.034, 0, 0.025, 0.003); });
      box(B, 'walnutZ', 43.37, y0 + 0.14, 43.43, y1 - 0.14, 0.1, 0.15, 0.004);
      box(B, 'walnutZ', 43.15, y0, 43.65, y1, 0.37, 0.4, 0.008);
      cushion(B, 'leather', 43.4, yc, 0.4, 0.48, 0.075, 1.96, 0);
    }));
    // the plinths: white, on a black shadow gap, a reveal line under a cap of travertine a hair proud, a small brass plate
    // with the work's title on the face you pass (16 Oct, Sam: "add more details to the white vertical tower". Plain white
    // blocks until then, travertine with its tile lines until 13 Oct)
    const block = (y, s, h) => {
      box(B, 'black', 41.62 - s + 0.015, y - s + 0.015, 41.62 + s - 0.015, y + s - 0.015, 0, 0.035, 0.002);
      box(B, 'plinthW', 41.62 - s, y - s, 41.62 + s, y + s, 0.035, h - 0.03, 0.006);
      box(d, 'black', 41.62 - s - 0.0012, y - s - 0.0012, 41.62 + s + 0.0012, y + s + 0.0012, h - 0.1, h - 0.093, 0.001);
      box(B, 'travBlock', 41.62 - s - 0.008, y - s - 0.008, 41.62 + s + 0.008, y + s + 0.008, h - 0.03, h, 0.004);
      box(d, 'brass', 41.62 + s, y - 0.06, 41.62 + s + 0.004, y + 0.06, h - 0.32, h - 0.26, 0.001);
    };
    [['sculptBronze', 'brass'], ['sculptDark', 'bronze']].forEach(([k, f]) => { if (M[k]) return; const o = M[f]; M[k] = o.clone(); M[k].onBeforeCompile = o.onBeforeCompile; M[k].customProgramCacheKey = o.customProgramCacheKey; M[k].userData = Object.assign({}, o.userData); });
    // a bird in flight: one polished bronze blade, swelling and tapering, on a small block of basalt
    thing(41.62, 13.9, () => { block(13.9, 0.22, 0.92); cyl(B, 'basalt', 41.62, 13.9, 0.92, 1.04, 0.065, 0.075, 28);
      vase(B, 'sculptBronze', 41.62, 13.9, 1.04, 1, [[0, 0], [0.028, 0], [0.024, 0.05], [0.019, 0.1], [0.038, 0.22], [0.066, 0.45], [0.072, 0.62], [0.054, 0.82], [0.026, 1.0], [0.006, 1.07], [0, 1.075]]); });
    // a pierced form: a ring of dark bronze swollen into an oval, the hole through it seen from the corridor at an angle
    thing(41.62, 19.9, () => { block(19.9, 0.25, 0.76); cyl(B, 'basalt', 41.62, 19.9, 0.76, 0.79, 0.07, 0.07, 24);
      B.add(M.sculptDark, new THREE.TorusGeometry(0.2, 0.15, 40, 90), FX.M(WX(41.62), 0.79 + 0.35 * 1.28 - 0.02, WZ(19.9), 0, 1.15, 0, 1, 1.28, 0.62)); });
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
    // The night of 15 to 16 Oct, Sam: "convert it into a king size format, so it should have a lot of space, nice pillow, nice
    // sheet... the head rest, maybe bring it a little bit higher... make sure the color fits well with the environment...
    // everything feel more premium in quality and texture, and the carpet as well... spend extra time on the master bedroom".
    // Materials of the room's own (their scan stand-ins are the ones they grew from, for ?code=none):
    // mushroom: the headboard's and the bed base's bouclé, deeper than the sofa's; oat: a linen for the euro squares;
    // cotton: a fine white weave for the sheets and the sleeping pillows; duvet: an ivory linen pressed smooth (the sofa's
    // linen, its crumples kept, read as a camouflage of blotches on the bed); rugPile and rugPileB: the rug's field and border.
    if (!M.mushroom) { M.mushroom = M.boucle.clone(); M.mushroom.onBeforeCompile = M.boucle.onBeforeCompile; M.mushroom.customProgramCacheKey = M.boucle.customProgramCacheKey; M.mushroom.userData = Object.assign({}, M.boucle.userData); }
    if (!M.oat) { M.oat = M.linenW.clone(); M.oat.onBeforeCompile = M.linenW.onBeforeCompile; M.oat.customProgramCacheKey = M.linenW.customProgramCacheKey; M.oat.userData = Object.assign({}, M.linenW.userData); }
    if (!M.cotton) { M.cotton = M.white.clone(); M.cotton.onBeforeCompile = M.white.onBeforeCompile; M.cotton.customProgramCacheKey = M.white.customProgramCacheKey; M.cotton.userData = Object.assign({}, M.white.userData); }
    if (!M.duvet) { M.duvet = M.linenW.clone(); M.duvet.onBeforeCompile = M.linenW.onBeforeCompile; M.duvet.customProgramCacheKey = M.linenW.customProgramCacheKey; M.duvet.userData = Object.assign({}, M.linenW.userData); }
    if (!M.mocha) { M.mocha = M.charcoal.clone(); M.mocha.onBeforeCompile = M.charcoal.onBeforeCompile; M.mocha.customProgramCacheKey = M.charcoal.customProgramCacheKey; M.mocha.userData = Object.assign({}, M.charcoal.userData); }
    if (!M.globeGlow) {
      // an opal glass globe lit from inside: brightest where you look straight through it, falling off to its rim, a little
      // warmer at the rim (16 Oct, Sam: "make sure it feels like more like a globe shining, because right now there's two
      // circles". The flat glow of the shades made a disc with a halo round it)
      M.globeGlow = D(P({ color: 0xf1e6d2, emissive: 0xffd9a8, emissiveIntensity: 1.25, roughness: 0.35, envMapIntensity: 0.6 }));
      const b0 = M.globeGlow.onBeforeCompile, k0 = M.globeGlow.customProgramCacheKey;
      M.globeGlow.onBeforeCompile = (sh, r) => { b0(sh, r); sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { float ndv = clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
          totalEmissiveRadiance *= mix(vec3(0.42, 0.34, 0.24), vec3(1.25, 1.18, 1.05), pow(ndv, 1.6)); }`); };
      M.globeGlow.customProgramCacheKey = () => (k0 ? k0() : '') + '-globe';
    }
    if (!M.oliveVelvet) { M.oliveVelvet = M.sage.clone(); M.oliveVelvet.onBeforeCompile = M.sage.onBeforeCompile; M.oliveVelvet.customProgramCacheKey = M.sage.customProgramCacheKey; M.oliveVelvet.userData = Object.assign({}, M.sage.userData); }
    if (!M.rugPile) { M.rugPile = M.rugTaupe.clone(); M.rugPile.onBeforeCompile = M.rugTaupe.onBeforeCompile; M.rugPile.customProgramCacheKey = M.rugTaupe.customProgramCacheKey; M.rugPile.userData = Object.assign({}, M.rugTaupe.userData); }
    if (!M.rugPileB) { M.rugPileB = M.wool.clone(); M.rugPileB.onBeforeCompile = M.wool.onBeforeCompile; M.rugPileB.customProgramCacheKey = M.wool.customProgramCacheKey; M.rugPileB.userData = Object.assign({}, M.wool.userData); }
    const HB = 1.66;                                                     // the headboard's top (1.36 until the night of 15 Oct)
    const stack = (bt, x, y, z, cols, rot) => { let zz = z; cols.forEach((c, i) => { const h = 0.026 + ((i * 7) % 3) * 0.006; rbox(bt, c, x, y, zz, zz + h, 0.27 - i * 0.025, 0.2 - i * 0.015, 0.003, rot + (i % 2 ? 0.08 : -0.05)); zz += h; }); return zz; };
    // the headboard: ten plump channels of a mushroom bouclé from the floor up to a walnut ledge, a line of light under the ledge
    // (cognac leather until 13 Oct: under the lamps it read orange against the black wall. A taupe herringbone until the night
    // of 15 Oct, 30 cm lower: it read as cardboard beside the larch)
    thing(X, 32.3, () => {
      // (pressed together since 16 Oct, 47 cm on a 45.6 cm pitch, a bouclé backing behind the joints: 44 cm wide with rounded
      // edges, the walnut showed down every joint. Sam: "fill it, so we don't see the wood texture between those vertical
      // elements. On the side, top is fine")
      // (square at the top since 16 Oct: rounded on every edge, the channels left a round notch between them at the top where
      // the walnut showed. Sam: "make it more square so the corners snap together... but do create the undulation". Each is
      // a section rounded only at its front corners, run up from the floor, its top edge eased by a centimetre)
      const CH = (() => { const w = 0.47, dp = 0.16, rf = 0.07, rb = 0.012, sh = new THREE.Shape(), x0 = -w / 2, x1 = w / 2, y0 = -dp / 2, y1 = dp / 2;
        sh.moveTo(x0 + rb, y1); sh.lineTo(x1 - rb, y1); sh.quadraticCurveTo(x1, y1, x1, y1 - rb); sh.lineTo(x1, y0 + rf); sh.quadraticCurveTo(x1, y0, x1 - rf, y0);
        sh.lineTo(x0 + rf, y0); sh.quadraticCurveTo(x0, y0, x0, y0 + rf); sh.lineTo(x0, y1 - rb); sh.quadraticCurveTo(x0, y1, x0 + rb, y1);
        const g = new THREE.ExtrudeGeometry(sh, { depth: HB - 0.05, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.006, bevelSegments: 3, curveSegments: 12 });
        g.rotateX(-Math.PI / 2); g.translate(0, 0.04, 0); return g; })();
      for (let i = 0; i < 10; i++) B.add(M.mushroom, CH, FX.M(WX(X - 2.052 + i * 0.456), 0, WZ(32.235)));
      box(B, 'mushroom', X - 2.2, 32.236, X + 2.2, 32.26, 0.04, HB - 0.08, 0.004);
      box(B, 'walnutSolid', X - 2.32, 32.2, X + 2.32, 32.235, 0, HB + 0.04, 0.005);
      box(B, 'walnutSolid', X - 2.32, 32.14, X + 2.32, 32.42, HB + 0.02, HB + 0.07, 0.008);
      box(d, 'glow', X - 2.25, 32.32, X + 2.25, 32.335, HB + 0.002, HB + 0.016, 0.001);
    });
    // on the ledge: a painting leaning in the middle, a dark vase with branches at one end, books and a bowl at the other
    { const tex = artTex('paint', 720, 500, 9), m = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.8), drawable(new THREE.MeshStandardMaterial({ map: tex, color: 0x9c9c9c, roughness: 0.85, envMapIntensity: 0.3 }), 'none'));   // (a shade darker: the lamp over the bed lights it from close by)
      m.rotation.x = -0.09; m.position.set(WX(X), HB + 0.07 + 0.4, WZ(32.29)); m.castShadow = false; scene.add(m); own([m], 'bedroom'); }
    rbox(d, 'black', X, 32.272, HB + 0.07, HB + 0.89, 1.19, 0.03, 0.003, 0, -0.09);
    // the vase in the entrance's cream glaze, its branches fewer and shorter, and the bowl cream too: dark on the larch they
    // were lost (Sam: "reduce the branch a little bit, and the vase... a lighter, so it has a nice contrast... the bowl as well")
    vase(d, 'stoneware', X + 1.8, 32.3, HB + 0.07, 0.5); branches(Z, X + 1.8, 32.3, HB + 0.36, 0.62, 5);
    // (the old five, built and thrown away for the shared random numbers; three short ones from numbers of their own)
    { const Rb = FX.rng(4711), z0 = HB + 0.07 + 0.42;
      [-0.42, 0.05, 0.48].forEach((lean, k) => {
        let p = [X + 1.8, 32.3, z0 - 0.08], ang = lean, h = 0.26 + Rb() * 0.14;
        for (let i = 0; i < 4; i++) { ang += (Rb() - 0.5) * 0.25; const l = h / 4, q = [p[0] + Math.sin(ang) * l, p[1] + (Rb() - 0.5) * 0.02, p[2] + Math.cos(ang) * l];
          rod(d, 'twigDark', p, q, 0.005 - i * 0.0008); if (i === 2) { const t = [q[0] + Math.sin(ang + 0.7 * (k - 1 || 1)) * 0.07, q[1], q[2] + 0.06]; rod(d, 'twigDark', q, t, 0.002); } p = q; }
      }); }
    books(Z, 47.15, 32.3, 1.43, 3, 0.1); stack(d, X - 1.75, 32.29, HB + 0.07, ['bk2', 'bk1', 'bk4'], 0.12);
    lathe(d, 'stoneware', X - 1.2, 32.29, HB + 0.07, BOWL.map(([r, h]) => [r * 0.75, h * 0.75]));
    // a wash of light where the larch meets the ceiling, wall to wall
    box(d, 'glow', 43.7, 32.236, 50.8, 32.27, 3.578, 3.596, 0.001);

    // The bed, a king: a recessed black plinth, a base upholstered in the headboard's bouclé, 2.3 by 2.4 m, a deep mattress.
    // Over it an ivory linen duvet, thick and soft, hanging in folds down both sides and the foot; the white sheet turned
    // down over its head in a broad band. Against the headboard three oat linen euro squares; in front of them two white king
    // pillows; one charcoal lumbar in front; a charcoal throw folded across the foot. (A queen until the night of 15 Oct, two
    // and two pillows and a terracotta one, the base in the sofa's bouclé.)
    thing(X, 33.55, () => {
      const W = 1.15, Y0 = 32.33, Y1 = 34.73;
      box(B, 'black', X - W + 0.08, Y0 + 0.08, X + W - 0.08, Y1 - 0.08, 0, 0.05, 0.005);
      box(B, 'mushroom', X - W, Y0, X + W, Y1, 0.05, 0.36, 0.04);
      box(B, 'cotton', X - W + 0.05, Y0 + 0.04, X + W - 0.05, Y1 - 0.04, 0.36, 0.64, 0.12);
      drape(d, 'duvet', X, 33.88, 0.705, 2.36, 1.72, 0.09, [0.36, 0.36, 0.4, 0], 0.016, 0.016, 1);
      drape(d, 'cotton', X, 33.12, 0.745, 2.38, 0.4, 0.04, [0.3, 0.3, 0.04, 0.03], 0.006, 0.007, 3);
      // (16 Oct, Sam: "add a little bit more colour stuff that feel premium", then "for the pillow, some edges feel weird...
      // add colours to pillows, right now it feels too blending together because they are light": the euro squares in a mocha
      // linen behind the white pillows, an olive velvet lumbar, a terracotta throw. A piping cord round each pillow and, before
      // it, a flat flange were tried and dropped: one read as wire, the other as a frame)
      [-0.68, 0, 0.68].forEach((dx, i) => pillow(d, 'mocha', X + dx, 32.47, 0.66, 0.66, 0.66, 0.2, -0.14, [0.04, 0, -0.04][i]));
      [-0.47, 0.47].forEach((dx, i) => pillow(d, 'cotton', X + dx, 32.82, 0.66, 0.88, 0.5, 0.18, -0.55, i ? 0.05 : -0.05));
      pillow(d, 'oliveVelvet', X, 33.1, 0.68, 0.86, 0.3, 0.14, -0.7, 0);
      drape(d, 'rust', X, 34.33, 0.75, 2.42, 0.58, 0.1, [0.22, 0.45, 0.03, 0.03], 0.016, 0.009, 5);
    });

    // Nightstands: solid walnut on a recessed plinth, one drawer with a brass pull, a top of white quartz. On each a lamp:
    // a black glazed gourd, a brass neck, a pleated linen shade lit from inside. (A white ceramic urn under a glowing
    // drum, and a travertine top with its tile lines, until 13 Oct.)
    const GOURD = [[0, 0], [0.07, 0], [0.12, 0.06], [0.14, 0.16], [0.12, 0.27], [0.06, 0.35], [0.026, 0.38], [0.026, 0.4]];
    [X - 1.8, X + 1.8].forEach((x, i) => thing(x, 32.6, () => {
      box(B, 'black', x - 0.26, 32.42, x + 0.26, 32.8, 0, 0.06, 0.004);
      box(B, 'walnutSolid', x - 0.31, 32.36, x + 0.31, 32.86, 0.06, 0.5, 0.01);
      // two drawers, a shadow line between them, a brass bar on standoffs on each (16 Oct, Sam: "make sure we have some
      // handle on the two drawers". One pull until then)
      box(d, 'black', x - 0.295, 32.859, x + 0.295, 32.866, 0.272, 0.279, 0.001);
      [0.41, 0.19].forEach((zh) => { box(d, 'brass', x - 0.1, 32.882, x + 0.1, 32.894, zh - 0.006, zh + 0.006, 0.003); [-0.085, 0.085].forEach((o) => box(d, 'brass', x + o - 0.005, 32.86, x + o + 0.005, 32.884, zh - 0.004, zh + 0.004, 0.001)); });
      box(B, 'quartz', x - 0.33, 32.34, x + 0.33, 32.88, 0.5, 0.53, 0.006);
      const lx = x + (i ? 0.1 : -0.1);
      // (16 Oct, Sam: "the light... feels a little bit too old school, so maybe try to have a more modern lamp stand": an opal
      // glass globe on a slim brass stem, a disc of travertine for a foot. A black gourd under a pleated shade until then)
      cyl(d, 'travBlock', lx, 32.58, 0.53, 0.555, 0.085, 0.09, 36); cyl(d, 'brass', lx, 32.58, 0.555, 0.565, 0.03, 0.03, 20);
      cyl(d, 'brass', lx, 32.58, 0.565, 0.9, 0.006, 0.006, 10); cyl(d, 'brass', lx, 32.58, 0.9, 0.93, 0.028, 0.02, 20);
      ball(d, 'globeGlow', lx, 32.58, 1.05, 0.13);
      books(Z, x - 1.05 + (i ? -0.15 : 0.15), 32.64, 0.53, 2, 0.2); stack(d, x + (i ? -0.14 : 0.14), 32.66, 0.53, i ? ['bk4', 'bk1'] : ['bk1', 'bk2'], 0.2);
      // each lamp throws its own pool: on the stone top, up the headboard beside it
      lamp('bedroom', lx, 32.74, 1.04, 0xffc68a, 0.85, 2.6);
    }));
    lamp('bedroom', X, 32.78, 2.55, 0xffd09a, 4.8, 8);                  // close to the larch and high, so it grazes the battens

    // a bench at the foot: a boucle cushion on a solid walnut frame with four slim legs
    thing(X, 35.24, () => {
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(B, 'walnutSolid', X + a * 0.74 - 0.025, 35.24 + b * 0.18 - 0.025, X + a * 0.74 + 0.025, 35.24 + b * 0.18 + 0.025, 0, 0.29, 0.004));
      box(B, 'walnutSolid', X - 0.8, 35.01, X + 0.8, 35.47, 0.27, 0.31, 0.008);
      rbox(B, 'boucle', X, 35.24, 0.31, 0.45, 1.6, 0.46, 0.05);
      // (a throw over one end until 16 Oct, sage, then taupe. Sam: "you can remove this blanket over that bench")
      books(Z, 45.75, 35.24, 0.42, 2, 0.3); stack(d, X - 0.4, 35.24, 0.45, ['bk2'], 0.3);
    });
    // the rug: a hand-knotted wool, a taupe field with a carved tone-on-tone lattice in a cream border (see rugPile, code-materials.js)
    box(d, 'rugPileB', X - 2.9, 33.2, X + 2.9, 37.8, 0, 0.018, 0.008); box(d, 'rugPile', X - 2.76, 33.34, X + 2.76, 37.66, 0, 0.028, 0.01);
    // two chairs and a limestone table on a round rug by the west glass, a floor lamp with the same pleated shade
    cyl(d, 'straw', 42.6, 37.5, 0, 0.012, 1.75, 1.75, 56);
    lounge(B, 42.2, 36.4, Math.PI / 2 + 0.3, 'boucle'); lounge(B, 42.2, 38.6, Math.PI / 2 - 0.3, 'boucle');
    cyl(B, 'pathStone', 42.35, 37.5, 0, 0.44, 0.2, 0.24, 32); vase(d, 'inkObj', 42.35, 37.5, 0.44, 0.5); sprigs(d, 42.35, 37.5, 0.68, 0.45, 4);
    cyl(B, 'bronze', 41.7, 39.9, 0, 0.025, 0.17, 0.17, 28); cyl(B, 'brass', 41.7, 39.9, 0.025, 1.5, 0.008, 0.008, 8);
    d.add(M.shade, pleatGeo(0.2, 0.17, 0.3, 30), FX.M(WX(41.7), 1.62, WZ(39.9)));
    // a long low chest on the east wall with a painting over it, a tall plant in the corner
    thing(50.68, 36.8, () => {
    box(B, 'walnutZ', 50.5, 35.3, 50.86, 38.3, 0.14, 0.6, 0.01); box(B, 'black', 50.56, 35.4, 50.8, 38.2, 0, 0.14, 0.005);
    // four drawers across its front, a shadow line round each, a brass bar on standoffs on each; on top, from the left: the cream
    // urn with three dry branches, a stack of art books with a bronze sphere, the black bowl with three stones, a walnut tray
    // with two candles and a small vessel (16 Oct, Sam: "this part feels a little bit weak, maybe add some drawers, and better
    // decoration on the table". A plain front, the urn, the bowl and a few books until then)
    for (let k = 0; k < 4; k++) { const y0 = 35.32 + k * 0.74, y1 = y0 + 0.72;
      box(d, 'walnutZ', 50.496, y0, 50.503, y1, 0.16, 0.58, 0.002);
      box(d, 'brass', 50.474, (y0 + y1) / 2 - 0.12, 50.484, (y0 + y1) / 2 + 0.12, 0.505, 0.517, 0.003);
      [-0.1, 0.1].forEach((o) => box(d, 'brass', 50.483, (y0 + y1) / 2 + o - 0.005, 50.497, (y0 + y1) / 2 + o + 0.005, 0.507, 0.515, 0.001)); }
    vase(d, 'ceramic', 50.68, 35.8, 0.6, 0.8, URN);
    { const Rb = FX.rng(5150); [[-0.5, 0.58], [0.1, 0.65], [0.6, 0.52]].forEach(([lean, len], k) => {     // (half as long since 16 Oct, Sam: "it has a very long branch... reduce it halfway so it doesn't go too high")
        let p = [50.68, 35.8, 1.0], a = Math.PI / 2 + lean * 0.6, up = 1.2 - Math.abs(lean) * 0.25;
        for (let i = 0; i < 6; i++) { a += (Rb() - 0.5) * 0.3; up += (Rb() - 0.5) * 0.15; const l = len / 6, q = [p[0] + Math.cos(a) * Math.cos(up) * l * 0.25, p[1] + Math.sin(a) * Math.cos(up) * l, p[2] + Math.sin(up) * l];
          rod(d, 'twigDark', p, q, 0.006 - i * 0.0008); if (i === 3) rod(d, 'twigDark', q, [q[0], q[1] + (k - 1 || 1) * 0.07, q[2] + 0.06], 0.0025); p = q; } }); }
    stack(d, 50.68, 36.5, 0.6, ['bk2', 'bk1', 'bk4'], 1.62); ball(d, 'sculptDark', 50.68, 36.5, 0.6 + 0.09 + 0.06, 0.06);
    lathe(d, 'glazeBlack', 50.68, 37.2, 0.6, BOWL.map(([r, h]) => [r * 1.1, h * 1.1]));
    [[37.17, 0.03], [37.24, 0.024], [37.2, 0.02]].forEach(([y, r], k) => ball(d, k % 2 ? 'basalt' : 'travBlock', 50.68 + (k - 1) * 0.04, y, 0.635 + r * 0.5, r, 0.6));
    box(d, 'walnutZ', 50.56, 37.82, 50.8, 38.18, 0.6, 0.615, 0.004);
    [[37.9, 0.11], [37.98, 0.075]].forEach(([y, h]) => { cyl(d, 'bk1', 50.66, y, 0.615, 0.615 + h, 0.022, 0.022, 18); cyl(d, 'glow', 50.66, y, 0.615 + h, 0.62 + h, 0.002, 0.004, 6); });
    vase(d, 'glazeBlack', 50.7, 38.1, 0.615, 0.3);
    books(Z, 50.68, 37.8, 0.6, 3, 1.6); stack(d, 50.68, 37.75, 0.6, ['bk1', 'bk4', 'bk2'], 1.62);
    });
    art('bedroom', 'paint', 'E', 36.8, 50.87, 1.72, 1.6, 1.1, 'black', 8);
    // A fiddle-leaf fig (Ficus lyrata) in a reeded terracotta pot, in the corner by the glass. (16 Oct, Sam: "there's a plant
    // appearing. So the plant is not in the scanning... make sure the plant is well detailed. Right now it feels plastic".
    // Sixteen squashed balls on a stick until then, in the decor, which is never drawn on the paper, so it arrived in one
    // frame.) In the house's own batch now and scanned, so the fill's line runs through it as through the walls. Three stems
    // from the soil, each with its leaves spiralling up its top two thirds: big violin-shaped blades, waisted below the middle,
    // broad and round at the end, cupped, their edges a little wavy, on short stalks, the low ones held out flat and the young
    // ones at the top upright. Its own random numbers: nothing else in the house moves.
    plant(Z, 50.2, 40.1, 0, 1.5, 'clay', 1.1);                                   // (the old plant's draws, kept for the shared sequence)
    {
      M.figLeaf = M.figLeaf || D(P({ color: 0x2c4a22, roughness: 0.4, envMapIntensity: 0.6, side: THREE.DoubleSide }), { noRing: true });
      M.figStem = M.figStem || D(P({ color: 0x6f6553, roughness: 0.75, envMapIntensity: 0.5 }), { noRing: true });
      M.figStalk = M.figStalk || D(P({ color: 0x56603a, roughness: 0.55, envMapIntensity: 0.5 }), { noRing: true });
      M.figPot = M.figPot || D(P({ color: 0xa8664a, roughness: 0.85, envMapIntensity: 0.5 }));
      const PX = 50.12, PY = 40.04, PH = 0.56, SOIL = 0.515, Rf = FX.rng(4417), up = new V3(0, 1, 0);
      // the blade's half width along it (0 at the stalk, 1 at the end): a heart-shaped foot, a waist, the broad round end
      const FIG = [[0, 0.0], [0.03, 0.34], [0.1, 0.55], [0.22, 0.62], [0.36, 0.6], [0.5, 0.7], [0.64, 0.88], [0.76, 0.99], [0.85, 0.97], [0.92, 0.82], [0.97, 0.52], [1.0, 0.0]];
      const figHalf = (t) => {
        let i = 0; while (i < FIG.length - 2 && t > FIG[i + 1][0]) i++;
        const a = FIG[i][1], b = FIG[i + 1][1], am = FIG[Math.max(0, i - 1)][1], bp = FIG[Math.min(FIG.length - 1, i + 2)][1], u = (t - FIG[i][0]) / (FIG[i + 1][0] - FIG[i][0]);
        return Math.max(0, 0.5 * (2 * a + (b - am) * u + (2 * am - 5 * a + 4 * b - bp) * u * u + (3 * a - am - 3 * b + bp) * u * u * u));
      };
      // a blade, L long and W wide, 30 by 14 pieces: local x across, y along, z out of its upper face. It cups up from the
      // midrib, its edge ripples, and its end bows down (bow) and turns a little (twist).
      const figBlade = (L, W, cup, bow, seed) => {
        const Rl = FX.rng(seed), NL = 30, NW = 14, pos = [], uv = [], idx = [];
        const wa = 0.0018 + Rl() * 0.0022, wk = 1.6 + Rl() * 1.2, wp = Rl() * 6.28, tw = (Rl() - 0.5) * 0.35;
        for (let j = 0; j <= NL; j++) {
          const t = j / NL, hw = W * 0.5 * figHalf(t), ct = Math.cos(tw * t), st = Math.sin(tw * t);
          for (let i = 0; i <= NW; i++) {
            const sx = (i / NW) * 2 - 1, ax = Math.abs(sx), lx = sx * hw;
            const lz = cup * hw * Math.pow(ax, 1.4) + wa * Math.pow(ax, 2.5) * Math.sin(t * wk * 6.2832 + wp + sx * 1.3) - bow * t * t * L;
            pos.push(lx * ct - lz * st, t * L * (1 - 0.25 * bow * t), lx * st + lz * ct); uv.push(i / NW, t);
          }
        }
        for (let j = 0; j < NL; j++) for (let i = 0; i < NW; i++) { const k = j * (NW + 1) + i; idx.push(k, k + 1, k + NW + 1, k + 1, k + NW + 2, k + NW + 1); }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
        g.computeVertexNormals();
        return g;
      };
      scanned(() => {
        // the pot: a tall tapered cylinder of reeds, 22 round ribs that fade out under the rim and at the foot, a rolled rim
        const prof = [[0, 0], [0.165, 0], [0.176, 0.012], ...Array.from({ length: 17 }, (_, i) => { const h = 0.03 + i * (PH - 0.06) / 16; return [0.176 + 0.029 * (h - 0.012) / (PH - 0.042), h]; }), [0.205, PH - 0.03], [0.214, PH - 0.016], [0.214, PH], [0.201, PH], [0.196, SOIL], [0, SOIL]];
        const pg = new THREE.LatheGeometry(prof.map(([r, h]) => new THREE.Vector2(r, h)), 176), pp = pg.attributes.position;
        for (let i = 0; i < pp.count; i++) {
          const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i), r = Math.hypot(x, z);
          if (r < 0.17 || y > PH - 0.04 || y < 0.015) continue;
          const k = 1 + (0.0065 * Math.pow(Math.abs(Math.cos(Math.atan2(z, x) * 11)), 0.6) * Math.min(1, (PH - 0.04 - y) / 0.03, (y - 0.015) / 0.03)) / r;
          pp.setX(i, x * k); pp.setZ(i, z * k);
        }
        pg.computeVertexNormals();
        B.add(M.figPot, pg, FX.M(WX(PX), 0, WZ(PY)));
        cyl(B, 'soilDark', PX, PY, SOIL - 0.01, SOIL + 0.006, 0.197, 0.197, 48);
        for (let i = 0; i < 26; i++) { const a = Rf() * 6.28, rr = 0.03 + Math.sqrt(Rf()) * 0.15, r = 0.008 + Rf() * 0.01;
          ball(B, Rf() < 0.6 ? 'basalt' : 'travBlock', PX + Math.cos(a) * rr, PY + Math.sin(a) * rr, SOIL + 0.004, r, 0.55); }
        // three stems, leaning a little out of the corner into the room and apart, each bending back toward upright
        [[1.5, -2.35, 0.16, 15], [1.22, -1.45, 0.3, 12], [0.95, -3.15, 0.34, 10]].forEach(([H, az, lean, n], s) => {
          const base = new V3(WX(PX) + Math.cos(az) * 0.035, SOIL, WZ(PY) + Math.sin(az) * 0.035), out = new V3(Math.cos(az), 0, Math.sin(az));
          const pts = [base.clone()]; let dir = out.clone().multiplyScalar(lean).add(up).normalize(), p = base.clone();
          for (let i = 0; i < 9; i++) { dir.lerp(up, 0.07).add(new V3(Rf() - 0.5, 0, Rf() - 0.5).multiplyScalar(0.08)).normalize(); p = p.clone().addScaledVector(dir, H / 9); pts.push(p); }
          const at = (t) => { const f = t * 9, i = Math.min(8, Math.floor(f)); return pts[i].clone().lerp(pts[i + 1], f - i); };
          for (let i = 0; i < 9; i++) { const r0 = 0.017 - 0.0095 * (i / 9), r1 = 0.017 - 0.0095 * ((i + 1) / 9);
            tleg(B, 'figStem', [pts[i].x + 30, pts[i].z + 24, pts[i].y], [pts[i + 1].x + 30, pts[i + 1].z + 24, pts[i + 1].y], r0, r1); }
          // the bud at the top: a slender pale sheath
          { const tp = pts[9], tq = tp.clone().addScaledVector(up, 0.045); tleg(B, 'figStalk', [tp.x + 30, tp.z + 24, tp.y], [tq.x + 30, tq.z + 24, tq.y], 0.0075, 0.0015); }
          for (let k = 0; k < n; k++) {
            const f = k / (n - 1), t = 0.2 + 0.8 * Math.pow(f, 0.8), node = at(t);   // f 0: the oldest leaf, low; 1: the youngest, at the top
            const L = (0.42 - 0.2 * Math.pow(f, 1.4)) * (0.9 + Rf() * 0.2), W = L * (0.72 + Rf() * 0.08), el = (-0.12 + 1.0 * Math.pow(f, 1.5)) + (Rf() - 0.5) * 0.25;
            const cup = 0.12 + Rf() * 0.1, bow = 0.12 + 0.18 * (1 - f) + Rf() * 0.08, roll = (Rf() - 0.5) * 0.5, seed = (Rf() * 1e6) | 0;
            let phi = az + s * 0.9 + k * 2.4, lf = null;
            // (a leaf that would reach the east wall or the curtain at the glass turns on round the stem until it clears them)
            for (let tr = 0; tr < 12 && !lf; tr++, phi += 0.45) {
              const o = new V3(Math.cos(phi), 0, Math.sin(phi)), sB = 0.035 + 0.015 * (1 - f);
              const stalkEnd = node.clone().addScaledVector(o, sB * 0.85).addScaledVector(up, sB * 0.5);
              const ly = o.clone().multiplyScalar(Math.cos(el)).addScaledVector(up, Math.sin(el)).normalize();
              const lz = up.clone().addScaledVector(ly, -ly.dot(up)).normalize().applyAxisAngle(ly, roll), lx = new V3().crossVectors(ly, lz);
              const g = figBlade(L, W, cup, bow, seed).applyMatrix4(new THREE.Matrix4().makeBasis(lx, ly, lz).setPosition(stalkEnd));
              const q = g.attributes.position; let ok = true;
              for (let i = 0; i < q.count && ok; i += 3) { if (q.getX(i) + 30 > 50.84 || q.getZ(i) + 24 > 40.6) ok = false; }
              if (ok) lf = { g, stalkEnd };
            }
            if (!lf) continue;
            ball(B, 'figStem', node.x + 30, node.z + 24, node.y, 0.017 - 0.0095 * t + 0.0012, 0.45);                 // the node, a slight swelling where the stalk leaves
            tleg(B, 'figStalk', [node.x + 30, node.z + 24, node.y], [lf.stalkEnd.x + 30, lf.stalkEnd.z + 24, lf.stalkEnd.y], 0.0045, 0.0035);
            B.add(M.figLeaf, lf.g);
          }
        });
      });
    }
    // linen curtains in deep, even ripple folds, stacked at both ends of the west and south glass, on a ceiling track
    // (the north-west one now starts at the larch: it started 10 cm short, and the bright glass behind showed through the
    // gap as a white line down the wall's end, the "vertical white line crack" Sam saw on 13 Oct)
    curtain('bedroom', 'v', 41.3, 32.205, 33.5, 0.015, 3.56); curtain('bedroom', 'v', 41.3, 39.5, 40.7, 0.015, 3.56); curtain('bedroom', 'h', 40.7, 41.5, 42.7, 0.015, 3.56); curtain('bedroom', 'h', 40.7, 49.4, 50.6, 0.015, 3.56);
  }

  /* ================= dressing =======================================================
     The outside review, three rounds running: "still a dead frame", two walls of walnut with a grain the size of a
     dinner plate. So the long side is now an open wardrobe: six bays in a fine-grained walnut, each lit from its
     back edge, three with clothes on a brass rail and shoes under them, three with shelves of folded things. The
     short side has closed fronts, fluted, in a warm grey lacquer. A lamp of its own, so the room is not a tunnel.
     16 Oct, Sam: "everything feels blocky... the shoes is blocked... spend those extra detail to try to create real object,
     clothing, shoes... the carpet, make sure it reach the separation between the marble floor and the wood floor... a lot
     more texture, maybe darker, so it has a nice contrast... for the cabinet the wood, spend extra detail on polishing...
     the two on the right side, make sure those color fits and maybe make it open instead, because right now it's closed...
     this one maybe can be reserved for accessory... perfume, hat, glass".
     So the clothes are clothes now: shirts, jackets, coats and dresses on brass hooks, sleeves down their sides, trousers
     folded over a lower rail; sweaters folded, rolled at the front, in a knit; bags with handles; shoes lofted from a last,
     in pairs, a dark opening where the foot goes. The wardrobe is a walnut veneer on a recessed black plinth. The two closed
     fronts on the south wall are open walnut units: a lit wall of shoes and a bay of drawers and shelves, and by the bath's
     door a cabinet for the small things (perfume, sunglasses, watches, belts, hats). The runner is a dark flat weave from
     the bedroom's marble to the window. (The old contents are still built, into Z, for the shared random numbers.) */
  {
    const d = dec('dressing'), Z = tagged(new FX.Batch());
    const GARM = ['linenW', 'charcoal', 'ochre', 'sage', 'rust', 'wool', 'white', 'boucle', 'charcoal', 'linenW'];
    const X0 = 51.2, X1 = 58.8, Y0 = 32.15, Y1 = 32.75, NB = 6, bw = (X1 - X0) / NB;
    // ---- the wardrobe as it was until 16 Oct, built and thrown away (its R() calls keep the rooms after this one as they were)
    box(Z, 'walnutFine', X0, Y0, X1, Y0 + 0.04, 0, 2.6, 0.004); box(Z, 'walnutFine', X0, Y0, X1, Y1, 0, 0.12, 0.006); box(Z, 'walnutFine', X0, Y0, X1, Y1, 2.5, 2.6, 0.006);
    for (let i = 0; i < NB; i++) thing(X0 + (i + 0.5) * bw, 32.5, () => {
      const a = X0 + i * bw + 0.04, b = X0 + (i + 1) * bw - 0.04;
      if (i % 2 === 0) {
        for (let x = a + 0.08; x < b - 0.09;) {
          const t = 0.035 + R() * 0.035, len = 0.8 + R() * 0.6;
          rbox(Z, GARM[(R() * GARM.length) | 0], x + t / 2, 32.47, 1.94 - len, 1.94, t, 0.44, t * 0.46, (R() - 0.5) * 0.12);
          x += t + 0.04 + R() * 0.035;
        }
      } else {
        [0.6, 1.07, 1.54, 2.01].forEach((z, row) => {
          for (let x = a + 0.09; x < b - 0.36;) {
            const w = 0.3 + R() * 0.06, n = 2 + ((R() * 4) | 0);
            if (row === 1 && R() < 0.4) rbox(Z, 'leather', x + w / 2, 32.47, z + 0.03, z + 0.03 + 0.24, w, 0.16, 0.03, 0);
            else { let zz = z + 0.03; for (let q = 0; q < n; q++) { const h = 0.034 + R() * 0.03; rbox(Z, GARM[(R() * GARM.length) | 0], x + w / 2, 32.47, zz, zz + h, w, 0.36, 0.012, (R() - 0.5) * 0.06); zz += h; } }
            x += w + 0.07 + R() * 0.1;
          }
        });
      }
    });

    // ---- materials of the room's own (their scan stand-ins are what they grew from, for ?code=none)
    const mk = (key, from) => { if (M[key]) return; const s = M[from]; M[key] = s.clone(); M[key].onBeforeCompile = s.onBeforeCompile; M[key].customProgramCacheKey = s.customProgramCacheKey; M[key].userData = Object.assign({}, s.userData); };
    // wardrobe: the kitchen's veneer in walnut; runner: a dark flat weave; knits for the folded sweaters; wools for the tailoring
    mk('wardrobe', 'walnutFine'); mk('runner', 'rugTaupe'); mk('knitCamel', 'ochre'); mk('knitIvory', 'wool'); mk('knitGrey', 'charcoal'); mk('knitNavy', 'charcoal');
    mk('coatCamel', 'ochre'); mk('suitNavy', 'charcoal'); mk('suitCharcoal', 'charcoal'); mk('shirtBlue', 'linenW'); mk('leatherBlk', 'inkObj'); mk('cotton', 'white'); mk('oat', 'linenW');
    if (!M.silkBlk) Object.assign(M, {
      silkBlk: D(new THREE.MeshPhysicalMaterial({ color: 0x1c1a19, roughness: 0.36, sheen: 1, sheenRoughness: 0.3, sheenColor: new THREE.Color(0x5a524b), envMapIntensity: 0.6 })),
      silkChamp: D(new THREE.MeshPhysicalMaterial({ color: 0xc4ae8e, roughness: 0.34, sheen: 1, sheenRoughness: 0.3, sheenColor: new THREE.Color(0xfff0d8), envMapIntensity: 0.6 })),
      suede: D(P({ color: 0x7a5a3e, roughness: 0.97, envMapIntensity: 0.3 })),
      shoeWhite: D(new THREE.MeshPhysicalMaterial({ color: 0xefebe4, roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.4, envMapIntensity: 0.7 })),
      soleTan: D(P({ color: 0x8a5d3a, roughness: 0.6, envMapIntensity: 0.5 })),
      nude: D(new THREE.MeshPhysicalMaterial({ color: 0xb79579, roughness: 0.45, clearcoat: 0.4, clearcoatRoughness: 0.3, envMapIntensity: 0.6 })),
      perfAmber: D(new THREE.MeshPhysicalMaterial({ color: 0x5e3210, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 })),
      perfSmoke: D(new THREE.MeshPhysicalMaterial({ color: 0x8f8a83, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 })),
      felt: D(P({ color: 0x6b513d, roughness: 0.96, envMapIntensity: 0.3 })),
      velvet: D(new THREE.MeshPhysicalMaterial({ color: 0x1d1716, roughness: 0.9, sheen: 1, sheenRoughness: 0.4, sheenColor: new THREE.Color(0x4a3b33), envMapIntensity: 0.3 })),
    });

    // ---- shapes ----
    const V = THREE.Vector3;
    // a mesh from a grid of points fn(u, v), u and v from 0 to 1, wrap: v closes into a ring. Turned to face outward (from its
    // middle, or along dir for a flat piece)
    const outward = (g, dir) => {
      g.computeVertexNormals();
      const p = g.attributes.position, n = g.attributes.normal; let cx = 0, cy = 0, cz = 0, s = 0;
      for (let i = 0; i < p.count; i++) { cx += p.getX(i); cy += p.getY(i); cz += p.getZ(i); }
      cx /= p.count; cy /= p.count; cz /= p.count;
      for (let i = 0; i < p.count; i++) s += dir ? n.getX(i) * dir[0] + n.getY(i) * dir[1] + n.getZ(i) * dir[2] : (p.getX(i) - cx) * n.getX(i) + (p.getY(i) - cy) * n.getY(i) + (p.getZ(i) - cz) * n.getZ(i);
      if (s < 0) { const ix = g.index.array; for (let k = 0; k < ix.length; k += 3) { const t = ix[k + 1]; ix[k + 1] = ix[k + 2]; ix[k + 2] = t; } g.index.needsUpdate = true; g.computeVertexNormals(); }
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(p.count * 2), 2));
      return FX.uvMetres(g);
    };
    const grid = (nu, nv, fn, wrap, dir) => {
      const row = wrap ? nv : nv + 1, pos = [], idx = [];
      for (let i = 0; i <= nu; i++) for (let j = 0; j < row; j++) pos.push(...fn(i / nu, j / nv));
      for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * row + j, b = a + row, a1 = i * row + (j + 1) % row, b1 = a1 + row; idx.push(a, b, a1, b, b1, a1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
      return outward(g, dir);
    };
    // a box with every edge rounded to r and its points spread over the rounding (bevelBox keeps them in a thin strip): soft things
    const softBox = (w, h, dd, r, nx, ny, nz) => {
      r = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, dd / 2 - 1e-4);
      const g = new THREE.BoxGeometry(w, h, dd, nx || 6, ny || 4, nz || 5), p = g.attributes.position, nr = g.attributes.normal;
      const ix = w / 2 - r, iy = h / 2 - r, iz = dd / 2 - r, v = new V(), c = new V(), o = new V();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        c.set(Math.max(-ix, Math.min(ix, v.x)), Math.max(-iy, Math.min(iy, v.y)), Math.max(-iz, Math.min(iz, v.z)));
        o.copy(v).sub(c); if (o.lengthSq() < 1e-12) o.fromBufferAttribute(nr, i); else o.normalize();
        nr.setXYZ(i, o.x, o.y, o.z); p.setXYZ(i, c.x + o.x * r, c.y + o.y * r, c.z + o.z * r);
      }
      return FX.uvMetres(g);
    };
    // a rod between two points given in a piece's own space (m)
    const segL = (bt, mat, m, a, b, r) => {
      const p = new V(...a), q = new V(...b), dv = q.clone().sub(p), l = dv.length();
      bt.add(M[mat], new THREE.CylinderGeometry(r, r, l, 6), FX.mul(m, new THREE.Matrix4().compose(p.clone().add(q).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new V(0, 1, 0), dv.normalize()), new V(1, 1, 1))));
    };
    const Rd = FX.rng(1610);                                              // (numbers of its own, not the shared R)

    // ---- clothes on hangers ----
    // Built about the neck: across the shoulders along plan y, the thickness along x (the rail's way), hanging down. The body
    // is a flattened tube: a seam along the shoulders falling from the neck, full in the middle and thin at the sides, folds
    // that deepen toward the hem, the hem closed off thin. Sleeves hang down both sides, in front; a collar rings the hook.
    // (len, W: half the width across the shoulders, T: thickness, drop: of the shoulders, sl: the sleeve's length, flare at
    // the hem, waist: drawn in)
    const GT = {
      shirt:    { len: 0.8, W: 0.205, T: 0.03, drop: 0.055, sl: 0.6, slW: 0.046, slT: 0.016, collar: 0.052, flare: 0.012, waist: 0.012 },
      jacket:   { len: 0.76, W: 0.232, T: 0.06, drop: 0.03, sl: 0.62, slW: 0.056, slT: 0.024, collar: 0.064, flare: 0, waist: 0.028 },
      coat:     { len: 1.1, W: 0.24, T: 0.07, drop: 0.035, sl: 0.64, slW: 0.062, slT: 0.028, collar: 0.072, flare: 0.02, waist: 0.014 },
      dress:    { len: 1.16, W: 0.13, T: 0.022, drop: 0.012, sl: 0, collar: 0, flare: 0.13, waist: 0.022 },
      trousers: { len: 0.54, W: 0.16, T: 0.032, drop: 0, sl: 0, collar: 0, flare: -0.025, waist: 0, bar: true },
    };
    // x, y: the rail in plan, z: the rail's height
    const garment = (bt, mat, x, y, z, type, seed) => {
      const G = GT[type], r = FX.rng(seed), ph = r() * 6.28, ph2 = r() * 6.28, amp = 0.005 + r() * 0.006, lean = (r() - 0.5) * 0.08;
      const m = FX.M(WX(x), z - 0.06, WZ(y), 0, lean, 0);
      const Wt = (t) => G.W + G.flare * Math.pow(t, 1.3) - G.waist * Math.sin(Math.PI * Math.min(1, t / 0.8));
      const top = (u) => -G.drop * Math.pow(Math.abs(u), 1.4);
      const NR = G.len > 1 ? 20 : 16, tOf = (ti) => (ti > 1 - 1e-9 ? 1 : Math.pow((ti * NR) / (NR - 1), 1.35) * 0.985);
      bt.add(M[mat], grid(NR, 22, (ti, aj) => {
        const t = tOf(ti), a = aj * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        const u = Math.sign(ca) * Math.pow(Math.abs(ca), 0.55), acr = u * Wt(t);
        const tk = G.T * Math.sqrt(Math.min(1, (t * G.len) / 0.035)) * (1 - 0.5 * u * u) * (t >= 1 ? 0 : t > 0.97 ? 0.6 : 1);
        const fold = amp * Math.pow(t, 1.1) * (0.6 * Math.sin(acr * 26 + ph) + 0.4 * Math.sin(acr * 53 + ph2));
        const hem = t > 0.9 ? 0.008 * Math.sin(acr * 17 + ph2) * (t - 0.9) / 0.1 : 0;
        return [Math.sign(sa) * Math.pow(Math.abs(sa), 0.7) * tk / 2 + fold, top(u) * (1 - t) - t * G.len + hem - (G.bar ? 0.004 : 0), acr];
      }, true), m);
      if (G.sl) [-1, 1].forEach((sd) => {
        const c0 = sd * (Wt(0.05) - G.slW * 0.85), y0 = top(1) - 0.015, x0 = G.T * 0.32;
        bt.add(M[mat], grid(10, 12, (t, aj) => {
          // (full width from the shoulder, as an armhole is, and squared off at the cuff: closed to a point at both ends,
          // each sleeve read as a long diamond laid on the shirt)
          const a = aj * Math.PI * 2, rad = Math.sqrt(Math.min(1, t / 0.012)) * (t > 0.97 ? Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.97) / 0.03, 2))) : 1);
          const wv = G.slW * (1.15 - 0.4 * t) * rad, tv = G.slT * (1 - 0.15 * t) * rad, f = amp * 0.8 * Math.sin(t * 9 + ph + sd);
          return [x0 + Math.sin(a) * tv + f, y0 - t * G.sl, c0 - sd * 0.018 * t + Math.cos(a) * wv];
        }, true), m);
      });
      if (G.collar) bt.add(M[mat], new THREE.TorusGeometry(G.collar, G.T * 0.2 + 0.005, 6, 22), FX.mul(m, FX.M(0, -0.006, 0, Math.PI / 2, 0, 0, 0.45, 1, 1)));
      // the hook over the rail, its stem down to the neck (trousers: to a bar they are folded over)
      bt.add(M.brass, new THREE.TorusGeometry(0.017, 0.0024, 5, 12, Math.PI), FX.mul(m, FX.M(0, 0.06, 0, 0, Math.PI / 2, 0)));
      segL(bt, 'brass', m, [0, G.bar ? -0.012 : -0.01, 0], [0, 0.06, 0.017], 0.0024);
      if (G.bar) segL(bt, 'brass', m, [0, -0.012, -G.W - 0.035], [0, -0.012, G.W + 0.035], 0.006);
    };
    // a rail between two posts, with a round flange at each end
    const rail = (bt, a, b, y, z) => { rod(bt, 'brass', [a, y, z], [b, y, z], 0.011); [a, b].forEach((x) => bt.add(M.brass, new THREE.CylinderGeometry(0.02, 0.02, 0.008, 18), FX.M(WX(x + (x === a ? 0.004 : -0.004)), z, WZ(y), 0, 0, Math.PI / 2))); };
    // a row of garments along a rail from a to b, each [type, material], spaced by how thick they are
    const hang = (bt, list, a, b, y, z) => {
      const gap = list.map(([t]) => (t === 'coat' ? 0.15 : t === 'jacket' ? 0.13 : t === 'trousers' ? 0.115 : t === 'dress' ? 0.1 : 0.09));
      const tot = gap.reduce((s, g) => s + g, 0) - (gap[0] + gap[gap.length - 1]) / 2;
      let x = (a + b) / 2 - tot / 2;
      list.forEach(([t, mat], i) => { garment(bt, mat, x, y, z, t, (Rd() * 1e6) | 0); x += (gap[i] + (gap[i + 1] || 0)) / 2 + (Rd() - 0.5) * 0.012; });
    };

    // ---- folded things ----
    // a folded sweater or shirt: the front (the fold, toward the room) rolled round its full thickness, the back pressed
    // thinner, the sides only softened (a cushion is round all over, a folded sweater is not: rounded on every side they read
    // as stacked cushions), the top flat with a shallow groove where each sleeve is folded under, a crease across the front
    const foldedGeo = (w, h, dd, seed) => {
      const r = FX.rng(seed), sk = (r() - 0.5) * 0.01, dome = 0.03 + r() * 0.05, rx = h * 0.22, ry = h / 2, rf = h / 2, rb = h * 0.3;
      const g = new THREE.BoxGeometry(w, h, dd, 12, 4, 6), p = g.attributes.position, nr = g.attributes.normal, v = new V(), c = new V(), o = new V();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        c.set(Math.max(-w / 2 + rx, Math.min(w / 2 - rx, v.x)), 0, Math.max(-dd / 2 + rb, Math.min(dd / 2 - rf, v.z)));
        const rz = v.z > 0 ? rf : rb;
        o.set((v.x - c.x) / rx, v.y / ry, (v.z - c.z) / rz); if (o.lengthSq() < 1e-12) o.fromBufferAttribute(nr, i); o.normalize();
        let x = c.x + o.x * rx, y = o.y * ry, z = c.z + o.z * rz;
        const u = x / (w / 2), s = z / (dd / 2);
        if (y > 0) y += dome * h * Math.max(0, 1 - u * u) * Math.max(0, 1 - s * s) - 0.1 * h * Math.exp(-Math.pow((Math.abs(u) - 0.52) / 0.12, 2)) * o.y;
        if (z > dd / 2 - rf && Math.abs(y) < h * 0.14) z -= 0.0035;
        p.setXYZ(i, x + sk * (y / h), y, z);
        nr.setXYZ(i, o.x / rx, o.y / ry, o.z / rz);
      }
      for (let i = 0; i < nr.count; i++) { v.fromBufferAttribute(nr, i).normalize(); nr.setXYZ(i, v.x, v.y, v.z); }
      return FX.uvMetres(g);
    };
    // a pile of them on a shelf, toward +y (rot π: toward -y), the mats from the bottom up
    const pile = (bt, mats, x, y, z, w, dd, rot, hh) => {
      let zz = z;
      mats.forEach((mat) => {
        const h = (hh || 0.05) + Rd() * 0.02, m = FX.M(WX(x + (Rd() - 0.5) * 0.012), zz + h / 2, WZ(y + (Rd() - 0.5) * 0.01), 0, (rot || 0) + (Rd() - 0.5) * 0.05, 0);
        bt.add(M[mat], foldedGeo(w + (Rd() - 0.5) * 0.02, h, dd, (Rd() * 1e6) | 0), m); zz += h * 0.94;
      });
      return zz;
    };
    // a bag standing on its base: a tote (handles front and back) or a structured one (a flap, a brass clasp, one handle)
    const bag = (bt, mat, x, y, z, w, h, dd, rot, kind) => {
      const m = FX.M(WX(x), z, WZ(y), 0, rot || 0, 0), tote = kind === 'tote';
      const g = softBox(w, h, dd, 0.012, 6, 5, 3), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const k = p.getY(i) / h + 0.5; p.setXYZ(i, p.getX(i) * (1 - 0.12 * k), p.getY(i) + h / 2, p.getZ(i) * (1 - (tote ? 0.3 : 0.12) * k)); }
      bt.add(M[mat], g, m);
      if (tote) [-1, 1].forEach((sd) => bt.add(M[mat], new THREE.TorusGeometry(w * 0.2, 0.0055, 6, 18, Math.PI), FX.mul(m, FX.M(0, h - 0.004, sd * dd * 0.3))));
      else {
        const zf = (dd / 2) * 0.92;
        bt.add(M[mat], softBox(w * 0.88, h * 0.36, 0.008, 0.003, 3, 2, 1), FX.mul(m, FX.M(0, h * 0.8, zf + 0.004, -0.06, 0, 0)));
        bt.add(M.brass, softBox(0.024, 0.02, 0.008, 0.002, 1, 1, 1), FX.mul(m, FX.M(0, h * 0.64, zf + 0.01)));
        bt.add(M[mat], new THREE.TorusGeometry(w * 0.17, 0.007, 6, 18, Math.PI), FX.mul(m, FX.M(0, h + 0.002, 0)));
      }
    };
    // a storage box with a lid and a leather pull, on its base
    const lidBox = (bt, mat, x, y, z, w, h, dd, rot) => {
      const m = FX.M(WX(x), z, WZ(y), 0, rot || 0, 0);
      bt.add(M[mat], softBox(w, h - 0.03, dd, 0.004, 3, 2, 3), FX.mul(m, FX.M(0, (h - 0.03) / 2, 0)));
      bt.add(M[mat], softBox(w + 0.008, 0.036, dd + 0.008, 0.005, 3, 2, 3), FX.mul(m, FX.M(0, h - 0.018, 0)));
      bt.add(M.leather, softBox(0.034, 0.024, 0.006, 0.002, 1, 1, 1), FX.mul(m, FX.M(0, h - 0.045, dd / 2 + 0.003)));
    };
    const hatBox = (bt, mat, x, y, z, r, h) => { cyl(bt, mat, x, y, z, z + h - 0.03, r, r, 40); cyl(bt, mat, x, y, z + h - 0.036, z + h, r + 0.005, r + 0.005, 40); cyl(bt, 'inkObj', x, y, z + h - 0.05, z + h - 0.042, r + 0.0015, r + 0.0015, 40); };

    // ---- shoes ----
    // A shoe lofted along its last: s from the heel (0) to the toe (1), at each s an arch over the footprint (the upper) and a
    // rounded slab under it (the sole), raised at the back by the heel. Where the foot goes in, the arch is cut flat at the
    // collar and a dark lining shows in the cut. Toe toward +z, standing on y = 0. (L: length, W: half the width at the ball,
    // ts: the sole, hh: the heel, ph: how round the toe (low: pointed), h: the upper's height along the last, o: the opening
    // from s, to s, and how deep it is cut, q: how square the arch, low for a boot's shaft)
    const SH = {
      loafer:  { L: 0.29, W: 0.049, ts: 0.012, hh: 0.024, ph: 2.3, h: [[0, 0.064], [0.25, 0.066], [0.55, 0.07], [0.8, 0.052], [1, 0.035]], o: [0.06, 0.5, 0.024] },
      oxford:  { L: 0.295, W: 0.048, ts: 0.012, hh: 0.026, ph: 2.0, h: [[0, 0.066], [0.3, 0.07], [0.5, 0.074], [0.8, 0.05], [1, 0.032]], o: [0.06, 0.42, 0.02], laces: true },
      sneaker: { L: 0.29, W: 0.052, ts: 0.03, hh: 0, ph: 2.6, h: [[0, 0.07], [0.3, 0.072], [0.55, 0.074], [0.8, 0.052], [1, 0.035]], o: [0.06, 0.4, 0.02], laces: true },
      pump:    { L: 0.25, W: 0.038, ts: 0.006, hh: 0.085, ph: 1.6, h: [[0, 0.06], [0.3, 0.06], [0.6, 0.05], [0.85, 0.035], [1, 0.02]], o: [0.05, 0.64, 0.03], stiletto: true },
      boot:    { L: 0.29, W: 0.05, ts: 0.014, hh: 0.028, ph: 2.3, q: 0.3, h: [[0, 0.2], [0.34, 0.2], [0.5, 0.085], [0.8, 0.056], [1, 0.034]], o: [0.03, 0.38, 0.032] },
    };
    const shoeGeos = {};
    const shoeParts = (kind, side) => {
      const id = kind + side; if (shoeGeos[id]) return shoeGeos[id];
      const S = SH[kind], NS = 20, Q = S.q || 0.6, [o0, o1, dip] = S.o;
      const sOf = (i) => 0.5 - 0.5 * Math.cos(Math.PI * i);
      const hAt = (s) => { const h = S.h; for (let k = 1; k < h.length; k++) if (s <= h[k][0]) { const a = h[k - 1], b = h[k], q = (s - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * q * q * (3 - 2 * q); } return h[h.length - 1][1]; };
      const e = (s) => { const p = s < 0.5 ? 2.3 : S.ph, x = Math.abs(2 * s - 1); return Math.pow(Math.max(0, 1 - Math.pow(x, p)), 1 / p); };
      const wAt = (s) => S.W * e(s) * (0.8 + 0.2 * FX.smooth((s - 0.45) / 0.27) - 0.07 * Math.exp(-Math.pow((s - 0.42) / 0.1, 2)));
      const cAt = (s) => -side * S.W * 0.12 * FX.smooth((s - 0.4) / 0.6);           // the toe turns in a little
      const lift = (s) => S.hh * (1 - FX.smooth((s - 0.2) / 0.48));
      const yb = (s) => (S.stiletto ? lift(s) : lift(s) * FX.smooth((s - 0.2) / 0.04)), yt = (s) => lift(s) + S.ts;
      const bump = (s) => (s > o0 && s < o1 ? Math.sin((Math.PI * (s - o0)) / (o1 - o0)) : 0);
      const hTop = (s) => hAt(s) * (s > 0.6 ? Math.pow(e(s), 0.6) : 1);
      const zz = (s) => (s - 0.5) * S.L;
      const parts = [];
      parts.push(['up', grid(NS, 12, (si, tj) => {
        const s = sOf(si), th = tj * Math.PI, st = Math.sin(th), a = Math.min(hTop(s) * Math.pow(st, Q), hTop(s) - dip * bump(s));
        return [cAt(s) + wAt(s) * Math.cos(th) * (1 - 0.14 * st), yt(s) + a, zz(s)];
      })]);
      parts.push(['sole', grid(NS, 14, (si, tj) => {
        const s = sOf(si), th = tj * Math.PI * 2, w = wAt(s) + 0.0025 * Math.pow(e(s), 0.3), c = Math.cos(th), sn = Math.sin(th), b = yb(s), t = yt(s);
        return [cAt(s) + w * Math.sign(c) * Math.pow(Math.abs(c), 0.35), (b + t) / 2 + ((t - b) / 2) * Math.sign(sn) * Math.pow(Math.abs(sn), 0.3), zz(s)];
      }, true)]);
      parts.push(['in', grid(12, 4, (si, tj) => {
        const s = o0 + (o1 - o0) * (0.5 - 0.5 * Math.cos(Math.PI * si)), ht = hTop(s), hc = ht - dip * bump(s), st = Math.pow(Math.min(1, hc / ht), 1 / Q);
        const x0 = Math.max(0, wAt(s) * Math.cos(Math.asin(Math.min(1, st))) * (1 - 0.14 * st) - 0.003);
        return [cAt(s) + (tj * 2 - 1) * x0, yt(s) + hc + 0.0008, zz(s)];
      }, false, [0, 1, 0])]);
      if (S.laces) for (let k = 0; k < 4; k++) {
        const s = 0.45 + k * 0.045, w = wAt(s) * 0.62, g = softBox(w * 2, 0.003, 0.006, 0.0014, 2, 1, 1);
        g.applyMatrix4(FX.M(cAt(s), yt(s) + hTop(s) + 0.0012, zz(s), 0.35, 0, 0)); parts.push(['lace', g]);
      }
      if (S.stiletto) { const g = new THREE.CylinderGeometry(0.0075, 0.0042, lift(0.07), 12); g.applyMatrix4(FX.M(cAt(0.07), lift(0.07) / 2, zz(0.07))); parts.push(['heel', g]); }
      return (shoeGeos[id] = parts);
    };
    // a pair, its middle at x, y (plan) on z, toes toward +y turned by rot (π: toward -y); mats: { up, sole, in, lace, heel }
    const pair = (bt, kind, x, y, z, rot, mats) => [-1, 1].forEach((sd) => {
      const ox = sd * (SH[kind].W + 0.014), m = FX.M(WX(x) + Math.cos(rot) * ox, z, WZ(y) - Math.sin(rot) * ox, 0, rot + sd * 0.025, 0);
      shoeParts(kind, sd).forEach(([role, g]) => bt.add(M[mats[role] || (role === 'in' ? 'inkObj' : mats.up)], g, m));
    });
    const SHOE = {
      sneakerW: ['sneaker', { up: 'shoeWhite', sole: 'white', lace: 'cotton' }], loaferC: ['loafer', { up: 'leather', sole: 'soleTan' }],
      loaferB: ['loafer', { up: 'leatherBlk', sole: 'black' }], loaferS: ['loafer', { up: 'suede', sole: 'soleTan' }],
      oxfordB: ['oxford', { up: 'leatherBlk', sole: 'black', lace: 'inkObj' }], oxfordC: ['oxford', { up: 'leather', sole: 'soleTan', lace: 'inkObj' }],
      pumpB: ['pump', { up: 'leatherBlk', sole: 'black', heel: 'black' }], pumpN: ['pump', { up: 'nude', sole: 'soleTan', heel: 'nude' }],
      bootS: ['boot', { up: 'suede', sole: 'black' }], bootB: ['boot', { up: 'leatherBlk', sole: 'black' }], sneakerB: ['sneaker', { up: 'leatherBlk', sole: 'white', lace: 'inkObj' }],
    };
    const shoes = (bt, names, a, b, y, z, rot) => { const n = names.length, st = (b - a) / n; names.forEach((nm, i) => pair(bt, SHOE[nm][0], a + st * (i + 0.5), y, z, rot, SHOE[nm][1])); };

    // ---- small things ----
    const perfume = (bt, x, y, z, kind) => {
      const m = FX.M(WX(x), z, WZ(y), 0, (Rd() - 0.5) * 0.4, 0);
      if (kind === 0) { bt.add(M.perfAmber, softBox(0.062, 0.085, 0.034, 0.006, 2, 3, 2), FX.mul(m, FX.M(0, 0.0425, 0))); bt.add(M.brass, new THREE.CylinderGeometry(0.008, 0.008, 0.01, 12), FX.mul(m, FX.M(0, 0.09, 0))); bt.add(M.glazeBlack, softBox(0.03, 0.032, 0.03, 0.004, 1, 1, 1), FX.mul(m, FX.M(0, 0.111, 0))); }
      else if (kind === 1) { bt.add(M.perfSmoke, new THREE.SphereGeometry(0.04, 22, 14), FX.mul(m, FX.M(0, 0.034, 0, 0, 0, 0, 1, 0.85, 1))); bt.add(M.brass, new THREE.CylinderGeometry(0.012, 0.012, 0.05, 16), FX.mul(m, FX.M(0, 0.088, 0))); }
      else if (kind === 2) { bt.add(M.glazeBlack, new THREE.CylinderGeometry(0.022, 0.022, 0.11, 24), FX.mul(m, FX.M(0, 0.055, 0))); bt.add(M.brass, new THREE.CylinderGeometry(0.02, 0.02, 0.03, 24), FX.mul(m, FX.M(0, 0.125, 0))); }
      else { bt.add(M.perfSmoke, softBox(0.05, 0.1, 0.05, 0.004, 2, 3, 2), FX.mul(m, FX.M(0, 0.05, 0))); bt.add(M.glazeBlack, new THREE.CylinderGeometry(0.018, 0.018, 0.04, 16), FX.mul(m, FX.M(0, 0.12, 0))); }
    };
    // a felt or straw hat: crown with a dent, a brim with its edge turned up, a band
    const HAT = [[0, 0.002], [0.09, 0.002], [0.142, 0.007], [0.152, 0.013], [0.148, 0.018], [0.11, 0.013], [0.088, 0.015], [0.084, 0.06], [0.077, 0.1], [0.05, 0.113], [0.02, 0.104], [0, 0.107]];
    const hat = (bt, mat, x, y, z, rot) => {
      const m = FX.M(WX(x), z, WZ(y), 0, rot || 0, 0, 1, 1, 1.12);
      const g = new THREE.LatheGeometry(HAT.map(([r, h]) => new THREE.Vector2(r, h)), 40); g.deleteAttribute('normal');
      bt.add(M[mat], outward(g), m);
      bt.add(M.inkObj, new THREE.CylinderGeometry(0.0884, 0.0896, 0.022, 40, 1, true), FX.mul(m, FX.M(0, 0.027, 0)));
    };
    // sunglasses, folded, standing on their rims, the lenses toward +y (plan) turned by rot
    const shades = (bt, x, y, z, rot) => {
      const m = FX.M(WX(x), z, WZ(y), 0, rot || 0, 0);
      [-1, 1].forEach((sd) => {
        bt.add(M.glazeBlack, new THREE.SphereGeometry(1, 16, 10), FX.mul(m, FX.M(sd * 0.033, 0.024, 0, 0, 0, 0, 0.028, 0.022, 0.004)));
        bt.add(M.black, new THREE.TorusGeometry(0.025, 0.0024, 5, 24), FX.mul(m, FX.M(sd * 0.033, 0.024, 0, 0, 0, 0, 1.12, 0.88, 1)));
        bt.add(M.black, softBox(0.125, 0.005, 0.004, 0.0015, 4, 1, 1), FX.mul(m, FX.M(sd * 0.004, 0.036 - sd * 0.004, -0.01 - (sd + 1) * 0.004, 0, 0, sd * 0.05)));
      });
      segL(bt, 'black', m, [-0.009, 0.036, 0], [0.009, 0.036, 0], 0.0022);
    };
    // a watch round a small cushion, its face toward +y (plan) turned by rot
    const watch = (bt, x, y, z, band, cs, face, rot) => {
      const m = FX.M(WX(x), z, WZ(y), 0, rot || 0, 0);
      bt.add(M.oat, new THREE.CylinderGeometry(0.026, 0.026, 0.062, 20), FX.mul(m, FX.M(0, 0.026, 0, 0, 0, Math.PI / 2)));
      bt.add(M[band], new THREE.CylinderGeometry(0.0285, 0.0285, 0.02, 24, 1, true), FX.mul(m, FX.M(0, 0.026, 0, 0, 0, Math.PI / 2)));
      bt.add(M[cs], new THREE.CylinderGeometry(0.019, 0.019, 0.009, 28), FX.mul(m, FX.M(0, 0.026, 0.0325, Math.PI / 2, 0, 0)));
      bt.add(M[face], new THREE.CylinderGeometry(0.0158, 0.0158, 0.002, 28), FX.mul(m, FX.M(0, 0.026, 0.0372, Math.PI / 2, 0, 0)));
    };
    // a belt rolled up, its buckle toward f (+1: +y, -1: -y)
    const belt = (bt, mat, x, y, z, f) => { cyl(bt, mat, x, y, z, z + 0.034, 0.042, 0.042, 28); cyl(bt, 'inkObj', x, y, z + 0.001, z + 0.0345, 0.012, 0.012, 16); bt.add(M.brass, softBox(0.03, 0.026, 0.007, 0.002, 1, 1, 1), FX.M(WX(x), z + 0.017, WZ(y + (f || 1) * 0.044))); };
    // a tray: a walnut rim, a lining inside
    const tray = (bt, x, y, z, w, dd, lining) => { box(bt, 'wardrobe', x - w / 2, y - dd / 2, x + w / 2, y + dd / 2, z, z + 0.022, 0.004); box(bt, lining, x - w / 2 + 0.012, y - dd / 2 + 0.012, x + w / 2 - 0.012, y + dd / 2 - 0.012, z + 0.004, z + 0.0225, 0.002); };

    // ---- the wardrobe on the north wall: a walnut veneer on a recessed black plinth, each bay lit from its back edge
    box(B, 'wardrobe', X0, Y0, X1, Y0 + 0.04, 0.1, 2.6, 0.003);
    box(B, 'black', X0 + 0.02, Y0 + 0.04, X1 - 0.02, Y1 - 0.05, 0, 0.1, 0.003);
    box(B, 'wardrobe', X0, Y0, X1, Y1, 0.1, 0.13, 0.004); box(B, 'wardrobe', X0, Y0, X1, Y1, 2.5, 2.6, 0.004);
    for (let i = 0; i <= NB; i++) box(d, 'wardrobe', X0 + i * bw - 0.019, Y0, X0 + i * bw + 0.019, Y1, 0.13, 2.5, 0.004);
    // what each bay holds, west to east. Hanging bays: the upper rail, the lower rail (double hung), the shoes under them.
    // Shelf bays: from the bay's floor up, what stands on each shelf.
    const BAYS = [
      { up: [['shirt', 'cotton'], ['shirt', 'cotton'], ['shirt', 'cotton'], ['shirt', 'cotton'], ['shirt', 'oat'], ['shirt', 'oat'], ['shirt', 'shirtBlue'], ['shirt', 'shirtBlue'], ['shirt', 'shirtBlue'], ['shirt', 'suitNavy']],
        low: [['trousers', 'oat'], ['trousers', 'oat'], ['trousers', 'coatCamel'], ['trousers', 'suitCharcoal'], ['trousers', 'suitCharcoal'], ['trousers', 'suitNavy'], ['trousers', 'suitNavy']],
        shoes: ['sneakerW', 'sneakerW', 'loaferC', 'loaferB'] },
      { shelves: ['boxes', 'knits', 'knitsNavy', 'bags', 'boxes'] },
      { up: [['jacket', 'suitNavy'], ['jacket', 'suitNavy'], ['jacket', 'suitNavy'], ['jacket', 'suitCharcoal'], ['jacket', 'suitCharcoal'], ['jacket', 'coatCamel'], ['jacket', 'oat'], ['jacket', 'oat']],
        low: [['trousers', 'suitNavy'], ['trousers', 'suitNavy'], ['trousers', 'suitCharcoal'], ['trousers', 'suitCharcoal'], ['trousers', 'oat'], ['trousers', 'coatCamel']],
        shoes: ['oxfordB', 'oxfordB', 'oxfordC', 'bootS'] },
      { shelves: ['boxes', 'knits2', 'bags2', 'shirts', 'hatboxes'] },
      { up: [['dress', 'silkChamp'], ['dress', 'silkChamp'], ['dress', 'silkBlk'], ['dress', 'silkBlk'], ['coat', 'coatCamel'], ['coat', 'suitCharcoal'], ['coat', 'suitNavy']],
        shoes: ['pumpN', 'pumpB', 'pumpB', 'bootB'] },
      { shelves: ['boxes', 'tees', 'knits', 'bags3', 'boxes'] },
    ];
    const KN = { knits: ['knitIvory', 'knitCamel', 'knitGrey'], knitsNavy: ['knitNavy', 'knitGrey', 'knitIvory'], knits2: ['knitCamel', 'knitNavy', 'knitIvory'] };
    // one shelf's things across a bay from a to b, standing at z, their fronts toward +y from yb (rot π: toward -y from yb)
    const shelfThings = (bt, kind, a, b, yb, z, rot) => {
      const mid = (a + b) / 2, wd = b - a, f = rot ? -1 : 1, yc = (dd) => yb - f * dd / 2;     // (yb: the shelf's front edge)
      if (kind === 'boxes') [-1, 1].forEach((sd) => lidBox(bt, sd < 0 ? 'oat' : 'linenW', mid + sd * wd * 0.24, yc(0.4), z, 0.38, 0.27, 0.4, (rot || 0) + (Rd() - 0.5) * 0.03));
      else if (kind === 'hatboxes') { hatBox(bt, 'oat', mid - wd * 0.22, yc(0.4), z, 0.19, 0.24); hatBox(bt, 'inkObj', mid + wd * 0.22, yc(0.4), z, 0.17, 0.2); }
      else if (KN[kind]) KN[kind].forEach((mt, i) => pile(bt, [mt, mt, mt, mt].slice(0, 3 + (Rd() < 0.5 ? 1 : 0)), mid + (i - 1) * wd * 0.33, yc(0.32), z, 0.3, 0.32, rot));
      else if (kind === 'shirts') [-1, 0, 1].forEach((i) => pile(bt, i < 0 ? ['cotton', 'cotton', 'cotton', 'cotton'] : i ? ['shirtBlue', 'shirtBlue', 'cotton', 'shirtBlue'] : ['oat', 'oat', 'cotton', 'oat'], mid + i * wd * 0.33, yc(0.3), z, 0.27, 0.3, rot, 0.03));
      else if (kind === 'tees') [-1, 0, 1].forEach((i) => pile(bt, i < 0 ? ['cotton', 'cotton', 'cotton', 'cotton', 'cotton'] : i ? ['suitNavy', 'suitNavy', 'knitGrey', 'suitNavy', 'suitNavy'] : ['knitGrey', 'knitGrey', 'knitGrey', 'cotton'], mid + i * wd * 0.33, yc(0.28), z, 0.26, 0.28, rot, 0.025));
      else if (kind === 'bags') { bag(bt, 'leather', mid - wd * 0.24, yc(0.17), z, 0.38, 0.27, 0.17, rot, 'tote'); bag(bt, 'leatherBlk', mid + wd * 0.22, yc(0.15), z, 0.3, 0.22, 0.15, rot, 'kelly'); }
      else if (kind === 'bags2') { bag(bt, 'leatherBlk', mid - wd * 0.26, yc(0.15), z, 0.28, 0.21, 0.14, rot, 'kelly'); bag(bt, 'leather', mid + wd * 0.04, yc(0.15), z, 0.28, 0.21, 0.14, rot, 'kelly'); bag(bt, 'oat', mid + wd * 0.31, yc(0.12), z, 0.22, 0.2, 0.12, rot, 'tote'); }
      else if (kind === 'bags3') { bag(bt, 'suede', mid - wd * 0.2, yc(0.18), z, 0.42, 0.3, 0.18, rot, 'tote'); bag(bt, 'leather', mid + wd * 0.27, yc(0.14), z, 0.26, 0.2, 0.14, rot, 'kelly'); }
    };
    for (let i = 0; i < NB; i++) thing(X0 + (i + 0.5) * bw, 32.5, () => {
      const a = X0 + i * bw + 0.04, b = X0 + (i + 1) * bw - 0.04, B6 = BAYS[i];
      box(d, 'glow', a, Y0 + 0.05, b, Y0 + 0.064, 2.46, 2.485, 0.001);
      box(d, 'bayGlow', a - 0.02, Y0 + 0.04, b + 0.02, Y0 + 0.048, 0.13, 2.46, 0.001);                   // the back of the bay, washed by that light
      if (B6.up) {
        rail(d, a - 0.02, b + 0.02, 32.47, 2.0); hang(d, B6.up, a, b, 32.47, 2.0);
        if (B6.low) { rail(d, a - 0.02, b + 0.02, 32.47, 1.06); hang(d, B6.low, a, b, 32.47, 1.06); }
        shoes(d, B6.shoes, a + 0.02, b - 0.02, 32.52, 0.13, 0);
      } else {
        const Z4 = [0.6, 1.07, 1.54, 2.01];
        Z4.forEach((z) => box(d, 'wardrobe', a - 0.02, Y0 + 0.04, b + 0.02, Y1 - 0.012, z, z + 0.028, 0.003));
        [0.13, ...Z4.map((z) => z + 0.028)].forEach((z, k) => shelfThings(d, B6.shelves[k], a, b, Y1 - 0.03, z, 0));
      }
    });

    // ---- the south wall: two open units in the same walnut (closed fluted fronts in a grey lacquer until 16 Oct, which read
    // olive beside the walnut). West of the bath's door a wall of shoes, lit, and a bay of drawers and shelves; east of it
    // a cabinet for the small things.
    const SY0 = 34.275, SY1 = 34.85;
    const unit = (a, b, cuts) => {
      box(B, 'wardrobe', a, SY1 - 0.03, b, SY1, 0.1, 2.6, 0.003);
      box(B, 'black', a + 0.02, SY0 + 0.05, b - 0.02, SY1 - 0.03, 0, 0.1, 0.003);
      box(B, 'wardrobe', a, SY0, b, SY1, 0.1, 0.13, 0.004); box(B, 'wardrobe', a, SY0, b, SY1, 2.5, 2.6, 0.004);
      cuts.forEach((x) => box(d, 'wardrobe', x - 0.019, SY0, x + 0.019, SY1, 0.13, 2.5, 0.004));
      for (let k = 0; k + 1 < cuts.length; k++) {
        box(d, 'glow', cuts[k] + 0.02, SY1 - 0.064, cuts[k + 1] - 0.02, SY1 - 0.05, 2.46, 2.485, 0.001);
        box(d, 'bayGlow', cuts[k] + 0.019, SY1 - 0.038, cuts[k + 1] - 0.019, SY1 - 0.03, 0.13, 2.46, 0.001);
      }
    };
    // drawers: walnut fronts with a shadow line between, a brass bar on each
    const drawers = (bt, a, b, z0, z1, n) => {
      const h = (z1 - z0) / n;
      for (let k = 0; k < n; k++) {
        const za = z0 + k * h + 0.002, zb = z0 + (k + 1) * h - 0.002;
        box(bt, 'wardrobe', a + 0.002, SY0 - 0.004, b - 0.002, SY0 + 0.02, za, zb, 0.003);
        box(bt, 'brass', (a + b) / 2 - 0.12, SY0 - 0.026, (a + b) / 2 + 0.12, SY0 - 0.014, zb - 0.06, zb - 0.048, 0.003);
        [-0.1, 0.1].forEach((o) => box(bt, 'brass', (a + b) / 2 + o - 0.005, SY0 - 0.018, (a + b) / 2 + o + 0.005, SY0 - 0.004, zb - 0.058, zb - 0.05, 0.001));
      }
    };
    thing(52.6, 34.56, () => {
      unit(51.2, 54.0, [51.2, 52.6, 54.0]);
      // the shoe wall: five shelves of three pairs, toes out, a brass rod along each shelf's front
      const SZ = [0.45, 0.82, 1.19, 1.56, 1.93], ROWS = [['bootB', 'bootS', 'bootB'], ['pumpB', 'pumpN', 'pumpB'], ['oxfordC', 'oxfordB', 'loaferS'], ['loaferC', 'loaferB', 'loaferC'], ['sneakerW', 'sneakerB', 'sneakerW']];
      SZ.forEach((z, k) => {
        box(d, 'wardrobe', 51.22, SY0 + 0.01, 52.58, SY1 - 0.03, z - 0.028, z, 0.003);
        rod(d, 'brass', [51.24, SY0 + 0.016, z + 0.014], [52.56, SY0 + 0.016, z + 0.014], 0.004);
        shoes(d, ROWS[k], 51.24, 52.56, SY0 + 0.21, z, Math.PI);
      });
      lidBox(d, 'oat', 51.55, SY0 + 0.25, 0.13, 0.4, 0.26, 0.4, Math.PI); lidBox(d, 'linenW', 52.22, SY0 + 0.25, 0.13, 0.4, 0.26, 0.4, Math.PI);
      box(d, 'wardrobe', 51.22, SY0 + 0.01, 52.58, SY1 - 0.03, 2.222, 2.25, 0.003); shelfThings(d, 'hatboxes', 51.22, 52.58, SY0 + 0.03, 2.25, Math.PI);
      // drawers, a walnut top with a valet tray, two shelves above, boxes at the top
      drawers(d, 52.62, 53.98, 0.13, 0.85, 3);
      box(d, 'wardrobe', 52.62, SY0, 53.98, SY1 - 0.03, 0.85, 0.88, 0.003);
      tray(d, 53.0, SY0 + 0.2, 0.88, 0.42, 0.26, 'oat'); belt(d, 'leather', 52.9, SY0 + 0.2, 0.902, -1); belt(d, 'leatherBlk', 53.08, SY0 + 0.22, 0.902, -1);
      pile(d, ['knitGrey', 'knitIvory'], 53.6, SY0 + 0.2, 0.88, 0.3, 0.32, Math.PI);
      [1.32, 1.76, 2.2].forEach((z, k) => { box(d, 'wardrobe', 52.62, SY0 + 0.01, 53.98, SY1 - 0.03, z - 0.028, z, 0.003); shelfThings(d, ['knits2', 'bags3', 'boxes'][k], 52.62, 53.98, SY0 + 0.03, z, Math.PI); });
    });
    thing(58.35, 34.56, () => {
      unit(57.9, 58.8, [57.9, 58.8]);
      drawers(d, 57.92, 58.78, 0.13, 0.8, 2);
      box(d, 'wardrobe', 57.92, SY0, 58.78, SY1 - 0.03, 0.8, 0.83, 0.003);
      // on the top, a tray lined in velvet: three pairs of sunglasses, two watches
      tray(d, 58.35, SY0 + 0.2, 0.83, 0.74, 0.3, 'suede');                   // (a black velvet lost the black sunglasses)
      [58.08, 58.26, 58.44].forEach((x, k) => shades(d, x, SY0 + 0.15, 0.853, Math.PI + (k - 1) * 0.12));
      watch(d, 58.6, SY0 + 0.24, 0.853, 'leatherBlk', 'steel', 'white', Math.PI); watch(d, 58.6, SY0 + 0.13, 0.853, 'leather', 'brass', 'black', Math.PI);
      // perfume on a brass tray; belts rolled and scarves; a felt hat and a straw one; a hat box at the top
      [1.18, 1.56, 1.94, 2.24].forEach((z) => box(d, 'wardrobe', 57.92, SY0 + 0.01, 58.78, SY1 - 0.03, z - 0.028, z, 0.003));
      box(d, 'brass', 58.06, SY0 + 0.1, 58.64, SY0 + 0.32, 1.18, 1.188, 0.002);
      [0, 1, 2, 3, 0].forEach((kd, k) => perfume(d, 58.12 + k * 0.115, SY0 + 0.2 + (k % 2) * 0.05, 1.188, kd));
      belt(d, 'leather', 58.03, SY0 + 0.2, 1.56, -1); belt(d, 'leatherBlk', 58.13, SY0 + 0.25, 1.56, -1); belt(d, 'suede', 58.24, SY0 + 0.19, 1.56, -1);
      pile(d, ['silkChamp', 'silkBlk', 'knitIvory'], 58.58, SY0 + 0.2, 1.56, 0.3, 0.26, Math.PI, 0.018);
      hat(d, 'felt', 58.14, SY0 + 0.27, 1.94, 0.3); hat(d, 'straw', 58.56, SY0 + 0.27, 1.94, -0.2);
      hatBox(d, 'oat', 58.35, SY0 + 0.27, 2.24, 0.2, 0.24);
    });

    // the runner: a dark flat weave from the bedroom's marble to the window (it stopped 60 cm short of the threshold)
    box(d, 'runner', 51.0, 33.05, 58.35, 33.95, 0, 0.012, 0.004);
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
    // 16 Oct, Sam: "in that corner, maybe you can add a shower, and then a real toilet, because right now there's no toilet...
    // the bathtub can be on the right side, of the thing with the mirror on the right side, so in the corner, the tub, with
    // the faucet. The faucet right now feels a little bit disconnected... just do a nice makeover". So, from the door: the
    // vanity and its mirror along the west wall, moved north; the tub in the corner where that wall meets the garden glass,
    // its spout coming out of the wall over its rim; a walk-in shower of travertine and glass in the corner on the left as
    // you come in; a wall-hung WC on a travertine ledge beside it. (The tub stood in the middle of the room in front of the
    // glass, its filler a column 21 cm off its end, and the shower was a glass screen and a stone box.)
    // a freestanding tub of white stone with a thin rolled rim, floating on a dark recessed foot, a walnut tray across it
    const TUB = new THREE.SplineCurve([[0, 0.07], [0.3, 0.07], [0.37, 0.09], [0.415, 0.16], [0.44, 0.3], [0.455, 0.46], [0.458, 0.56], [0.45, 0.59], [0.435, 0.592], [0.426, 0.57],
      [0.42, 0.45], [0.405, 0.3], [0.37, 0.2], [0.3, 0.155], [0, 0.145]].map(([r, h]) => new THREE.Vector2(r, h))).getPoints(60).map((v) => [Math.max(0, v.x), v.y]);
    const TX = 52.3, TY = 40.05;                                          // the tub's middle: 18 cm off the west wall, 36 cm off the glass
    scanned(() => {
      lathe(B, 'black', TX, TY, 0, [[0, 0], [0.3, 0], [0.3, 0.075], [0, 0.075]], 1.9, 0.92);
      lathe(B, 'tubStone', TX, TY, 0, TUB, 2.05, 1.0);
      // the spout and its two handles on the west wall, the spout reaching 12 cm in over the rim, 18 cm above it
      box(B, 'brass', 51.135, TY - 0.05, 51.15, TY + 0.05, 0.72, 0.82, 0.003);
      rod(B, 'brass', [51.15, TY, 0.78], [51.43, TY, 0.78], 0.016); rod(B, 'brass', [51.43, TY, 0.78], [51.43, TY, 0.75], 0.016);
      [-0.16, 0.16].forEach((o) => { cyl(B, 'brass', 51.15, TY + o, 0.75, 0.76, 0.03, 0.03, 18); rod(B, 'brass', [51.15, TY + o, 0.755], [51.24, TY + o, 0.755], 0.007); });
      box(B, 'walnutZ', TX + 0.32, TY - 0.49, TX + 0.62, TY + 0.49, 0.6, 0.622, 0.004);
      // a stool of limestone with two folded towels by its foot, a bath mat
      cyl(B, 'pathStone', 53.75, 39.35, 0, 0.44, 0.19, 0.2, 40);
      rbox(B, 'linenW', 53.75, 39.35, 0.44, 0.5, 0.32, 0.23, 0.025, 0.4); rbox(B, 'sage', 53.75, 39.35, 0.5, 0.55, 0.29, 0.21, 0.022, 0.3);
    });
    { const w = new THREE.Mesh(mark(new THREE.CircleGeometry(0.418, 48), [WX(TX), WZ(TY), 0.5]), M.water); w.rotation.x = -Math.PI / 2; w.scale.set(2.05, 1, 1); w.position.set(WX(TX), 0.5, WZ(TY)); scene.add(w); own([w], 'bath'); w.castShadow = false; }
    colliders.push({ id: 'tub', box: new THREE.Box3(new V3(WX(TX - 0.95), 0, WZ(TY - 0.47)), new V3(WX(TX + 0.95), 0.6, WZ(TY + 0.47))) });
    cyl(d, 'white', TX + 0.47, TY - 0.25, 0.622, 0.7, 0.035, 0.035, 18); cyl(d, 'glow', TX + 0.47, TY - 0.25, 0.7, 0.72, 0.004, 0.008, 8);
    lathe(d, 'glazeBlack', TX + 0.47, TY + 0.17, 0.622, BOWL.map(([r, h]) => [r * 0.45, h * 0.45]));
    cloth(d, 'rugTaupe', TX + 0.2, 39.25, 0, 1.3, 0.032, 0.55, 0.004, 2);
    // The vanity along the west wall: a recessed plinth, solid walnut with the grain along it, three columns of two drawers
    // with brass pulls, a top of white quartz, two thin stone basins with brass wall spouts, a mirror the length of it,
    // three tubes of light standing on the mirror. (36.5 to 40.1 until 16 Oct: it moved north for the tub.)
    const V0 = 35.5, V1 = 38.7, VB = [36.3, 37.9], VL = [35.66, 37.1, 38.54];
    scanned(() => {
    box(B, 'black', 51.14, V0 + 0.1, 51.66, V1 - 0.1, 0, 0.1, 0.004); box(B, 'walnutZ', 51.14, V0, 51.74, V1, 0.1, 0.78, 0.01); box(B, 'quartz', 51.14, V0 - 0.06, 51.8, V1 + 0.06, 0.78, 0.84, 0.006);
    [V0 + (V1 - V0) / 3, V0 + (2 * (V1 - V0)) / 3].forEach((y) => box(d, 'black', 51.74, y - 0.004, 51.744, y + 0.004, 0.12, 0.76, 0.001));
    box(d, 'black', 51.74, V0 + 0.02, 51.744, V1 - 0.02, 0.44, 0.448, 0.001);
    [0, 1, 2].map((k) => V0 + ((k + 0.5) * (V1 - V0)) / 3).forEach((y) => { box(d, 'brass', 51.742, y - 0.12, 51.756, y + 0.12, 0.6, 0.612, 0.002); box(d, 'brass', 51.742, y - 0.12, 51.756, y + 0.12, 0.27, 0.282, 0.002); });
    VB.forEach((y) => {
      vase(B, 'tubStone', 51.5, y, 0.84, 1, [[0, 0], [0.07, 0], [0.15, 0.025], [0.2, 0.07], [0.215, 0.12], [0.212, 0.135], [0.2, 0.132], [0.19, 0.095], [0.15, 0.055], [0.06, 0.04], [0, 0.04]]);
      cyl(d, 'brass', 51.5, y, 0.879, 0.881, 0.024, 0.024, 16);
      cyl(d, 'brass', 51.17, y, 1.06, 1.1, 0.035, 0.035, 20); rod(d, 'brass', [51.17, y, 1.08], [51.36, y, 1.08], 0.011); rod(d, 'brass', [51.36, y, 1.08], [51.36, y, 1.03], 0.011);
    });
    box(B, 'glassMirror', 51.134, V0 + 0.1, 51.158, V1 - 0.1, 1.02, 2.5, 0.003); box(d, 'brass', 51.132, V0 + 0.08, 51.146, V1 - 0.08, 1.0, 2.52, 0.002);
    VL.forEach((y) => { box(d, 'brass', 51.158, y - 0.03, 51.19, y + 0.03, 1.3, 2.2, 0.004); box(d, 'glowSoft', 51.19, y - 0.022, 51.225, y + 0.022, 1.34, 2.16, 0.01); });
    // on the top: a black glazed vessel between the basins, hand towels at one end, a brass tray with two bottles at the other
    vase(d, 'glazeBlack', 51.48, 37.1, 0.84, 0.36); sprigs(Z, 51.5, 38.3, 1.04, 0.3, 3);
    rbox(d, 'linenW', 51.48, V0 + 0.3, 0.84, 0.9, 0.28, 0.21, 0.025, 0.06); rbox(d, 'linenW', 51.48, V0 + 0.3, 0.9, 0.955, 0.27, 0.2, 0.022, 0.1);
    cyl(d, 'brass', 51.45, V1 - 0.33, 0.84, 0.85, 0.11, 0.11, 32);
    vase(d, 'glazeBlack', 51.42, V1 - 0.38, 0.85, 0.32, [[0, 0], [0.1, 0], [0.11, 0.05], [0.11, 0.42], [0.09, 0.46], [0.035, 0.47], [0.035, 0.53], [0.05, 0.54]]);
    vase(d, 'ceramic', 51.48, V1 - 0.26, 0.85, 0.26, [[0, 0], [0.12, 0], [0.13, 0.05], [0.13, 0.4], [0.1, 0.44], [0.035, 0.46], [0.035, 0.52], [0.05, 0.53]]);
    lamp('bath', 51.55, 37.1, 2.78, 0xffdcb0, 2.4, 7);                 // over the mirror: lower down, the mirror showed it as a white blob
    box(B, 'brass', 51.134, V0 + 0.1, 51.21, V1 - 0.1, 2.56, 2.6, 0.004); box(d, 'glow', 51.15, V0 + 0.16, 51.2, V1 - 0.16, 2.552, 2.56, 0.001);   // the fitting that light comes from
    });
    // (a tall plant stood in the north-west corner until 13 Oct: Sam, "remove the plant")
    plant(Z, 51.72, 40.58, 0, 1.3, 'ceramic', 0.85);
    // a towel ladder on the north wall
    thing(54.0, 35.25, () => {
    rod(B, 'walnutSolid', [53.7, 35.14, 0], [53.7, 35.3, 1.9], 0.016); rod(B, 'walnutSolid', [54.3, 35.14, 0], [54.3, 35.3, 1.9], 0.016);
    [0.6, 1.0, 1.4].forEach((z) => rod(B, 'walnutSolid', [53.7, 35.2 + z * 0.05, z], [54.3, 35.2 + z * 0.05, z], 0.012));
    rbox(d, 'linenW', 54.0, 35.3, 0.72, 1.4, 0.42, 0.04, 0.015, 0, 0.08);
    });
    // the east wall in walnut slats, floor to ceiling (decor, like the wardrobe's dividers: on the plan 49 slats were a ragged
    // edge on the wall, and as decor they arrive one after the other as the scan passes). Scanned, so the black board behind
    // them arrives with them: with the mirror's picture on from the start of the scan, it showed in the glass as a black hole.
    // From 39.6 on: the shower and the WC have travertine instead.
    scanned(() => { for (let y = 39.66; y < 40.9; y += 0.115) box(d, 'walnut', 58.74, y, 58.8, y + 0.07, 0.02, 3.56, 0.004);
      box(d, 'black', 58.785, 39.6, 58.8, 40.9, 0, 3.58, 0.001); });
    // The shower: a walk-in in the north-east corner, 1.5 by 2.7 m, its two walls in travertine to the ceiling, glass on its
    // two open sides with a slim black frame, the way in at the south-west corner. A brass rain head on an arm, a mixer and a
    // hand shower on a rail, a niche with bottles, a travertine bench along the north wall, a brass drain along the east.
    const SX0 = 57.25, SX1 = 58.8, SY0 = 35.13, SY1 = 37.85;
    scanned(() => {
      box(B, 'travBlock', SX0, SY0 - 0.01, SX1, SY0 + 0.02, 0, 3.58, 0.003);                 // the north wall's slab
      box(B, 'travBlock', SX1 - 0.04, SY0, SX1, 39.6, 0, 3.58, 0.003);                       // the east wall's, on past the WC
      box(dec('bath:see'), 'glass', SX0 - 0.01, SY0 + 0.02, SX0 + 0.01, SY1 - 0.68, 0.03, 2.2, 0.002);     // the west pane, the way in beside it
      box(dec('bath:see'), 'glass', SX0, SY1 - 0.01, SX1 - 0.04, SY1 + 0.01, 0.03, 2.2, 0.002);             // the south pane
      box(d, 'black', SX0 - 0.016, SY0 + 0.02, SX0 + 0.016, SY1 - 0.68, 2.2, 2.226, 0.002); box(d, 'black', SX0 - 0.016, SY1 - 0.7, SX0 + 0.016, SY1 - 0.68, 0.03, 2.226, 0.002);
      box(d, 'black', SX0, SY1 - 0.016, SX1 - 0.04, SY1 + 0.016, 2.2, 2.226, 0.002); box(d, 'black', SX0 - 0.016, SY1 - 0.016, SX0 + 0.016, SY1 + 0.016, 0.03, 2.226, 0.002);
      rod(d, 'black', [SX0, SY1, 2.21], [SX0, SY0 + 0.02, 2.4], 0.008);                       // the stay from the panes' corner to the wall
      box(d, 'brass', SX1 - 0.3, SY0 + 0.25, SX1 - 0.25, SY1 - 0.15, 0.001, 0.005, 0.001);   // the drain
      box(B, 'travBlock', SX0 + 0.25, SY0 + 0.02, SX1 - 0.3, SY0 + 0.42, 0.42, 0.48, 0.005);   // the bench
    });
    thing(58.1, 36.5, () => {
      rod(B, 'brass', [SX1 - 0.04, 36.5, 2.32], [58.1, 36.5, 2.32], 0.012); box(B, 'brass', 57.95, 36.35, 58.25, 36.65, 2.28, 2.3, 0.004);
      d.add(M.brass, new THREE.CylinderGeometry(0.07, 0.07, 0.012, 28), FX.M(WX(58.3), 1.1, WZ(SY0 + 0.026), Math.PI / 2, 0, 0));       // the mixer's round plate
      rod(d, 'brass', [58.3, SY0 + 0.03, 1.1], [58.3, SY0 + 0.085, 1.1], 0.012); rod(d, 'brass', [58.3, SY0 + 0.085, 1.1], [58.4, SY0 + 0.085, 1.1], 0.007);
      rod(d, 'brass', [58.62, SY0 + 0.05, 0.95], [58.62, SY0 + 0.05, 1.85], 0.008);
      rod(d, 'brass', [58.62, SY0 + 0.07, 1.6], [58.62, SY0 + 0.07, 1.42], 0.016); cyl(d, 'brass', 58.62, SY0 + 0.07, 1.6, 1.64, 0.032, 0.03, 18);
      box(d, 'black', SX1 - 0.045, 36.9, SX1 - 0.04, 37.5, 1.15, 1.5, 0.001);                // the niche, dark
      [37.0, 37.14, 37.3, 37.42].forEach((y, k) => cyl(d, k % 2 ? 'glazeBlack' : 'tubStone', SX1 - 0.12, y, 1.15, 1.15 + 0.16 + (k % 3) * 0.03, 0.03, 0.03, 16));
      box(d, 'travBlock', SX1 - 0.18, 36.88, SX1 - 0.04, 37.52, 1.13, 1.15, 0.003);
      rbox(d, 'linenW', SX0 + 0.75, SY0 + 0.22, 0.48, 0.54, 0.34, 0.3, 0.025, 0.1);           // a towel on the bench
    });
    // The WC: wall hung, a soft white bowl on a travertine ledge that hides its cistern, a brass flush plate, a brass roll
    // holder, a small brass hook with a hand towel.
    thing(58.3, 38.7, () => {
      box(B, 'travBlock', 58.5, 37.95, SX1 - 0.04, 39.55, 0, 1.05, 0.006);
      // (the bowl, its seat and the flush plate with the room's big things since 16 Oct, so they are drawn on the paper too: as
      // decor they only came with the room, and the drawing showed a stone ledge that turned into a WC, Sam: "it swaps from a
      // drawer to something else")
      B.add(M.tubStone, FX.bevelBox(0.56, 0.3, 0.37, 0.13), FX.M(WX(58.22), 0.27, WZ(38.75)));
      B.add(M.tubStone, FX.bevelBox(0.5, 0.035, 0.38, 0.016), FX.M(WX(58.23), 0.437, WZ(38.75)));
      box(B, 'brass', 58.49, 38.6, 58.5, 38.9, 0.82, 0.99, 0.002); box(d, 'brass', 58.483, 38.62, 58.49, 38.745, 0.84, 0.97, 0.002); box(d, 'brass', 58.483, 38.755, 58.49, 38.88, 0.84, 0.97, 0.002);
      rod(d, 'brass', [58.5, 39.35, 0.7], [58.36, 39.35, 0.7], 0.006); cyl(d, 'cotton', 58.4, 39.35, 0.66, 0.74, 0.055, 0.055, 24); cyl(d, 'inkObj', 58.4, 39.35, 0.665, 0.735, 0.02, 0.02, 12);
    });
    lamp('bath', 58.0, 36.5, 2.5, 0xffdcb0, 1.1, 4);
    // a painting over the tub, on the white wall between the vanity and the glass (16 Oct, Sam: "add a nice painting around the
    // walls, so it feels less empty")
    art('bath', 'paint', 'W', 39.85, 51.13, 1.85, 1.0, 1.3, 'walnut', 31);
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
  // ('zone:see': glass among the furniture, the shower's panes and the gallery's sliding door. It stays out of the depth pass,
  // as the house's own windows do while a drawing shows through them: in it, a pane hid the drawing's lines behind it, and
  // from the bath's door the WC was not drawn until the camera passed the shower's glass, then it popped in. 16 Oct, Sam:
  // "one frame we see the image on the first screenshot, and then on the second frame we see another thing")
  Object.keys(DEC).forEach((key) => { const [zone, flag] = key.split(':'); const ms = DEC[key].build(scene); own(ms, zone); ms.forEach((m) => { if (flag === 'see') { m.userData.noPrepass = true; return; } m.userData.decor = true; if (flag === 'cut') m.userData.cutWithHouse = true; }); });
  delete B.add;                                                        // the house batch goes back to scene.js as it came
  return { lights, flame: flameMat };
};
