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
    showerFloor: D(P({ color: 0x625446, roughness: 0.86, envMapIntensity: 0.42 })),                                     // non-slip fluted & bush-hammered spa stone shower tray
    glazeBlack: D(P({ color: 0x1b1918, roughness: 0.2, envMapIntensity: 0.95 })),                                       // a black glaze with a shine
    taupe: D(FX.pbr(sets.wool, { size: 0.42, color: rgb(1.95, 1.66, 1.36), env: 0.3, normal: 1.6 }), { sat: 0.15 }),    // the bed's headboard
    shade: D(P({ color: 0xe9dcc6, emissive: 0xffc68a, emissiveIntensity: 0.24, roughness: 0.92, side: THREE.DoubleSide })),   // a pleated linen shade with the bulb behind it
    sheerLinen: D(FX.pbr(sets.linen, { size: 0.5, color: rgb(2.45, 2.36, 2.22), env: 0.3, normal: 0.8 }), { sat: 0 }),   // curtain linen
    kitchenCab: D(FX.pbr(walnut, { size: 0.6, color: rgb(0.45, 0.32, 0.22), env: 0.75, roughness: 0.55 }), { sat: 0.6 }),
    ovenGlass: D(P({ color: 0x121110, roughness: 0.1, envMapIntensity: 1.15 })),
    counterStone: D(P({ color: 0xf1ece3, roughness: 0.16, envMapIntensity: 0.9 })),
    flutedBowl: D(P({ color: 0xd8cebe, roughness: 0.44, envMapIntensity: 0.65 })),
    orange: D(P({ color: 0xe66818, roughness: 0.32 })),
    pear: D(P({ color: 0x8ea038, roughness: 0.38 })),
    apple: D(P({ color: 0xb82e1e, roughness: 0.24 })),
    figFruit: D(P({ color: 0x361832, roughness: 0.48 })),
    plume: D(P({ color: 0xe6d8b4, roughness: 0.88, envMapIntensity: 0.45 }), { noRing: true }),
    flwWhite: D(P({ color: 0xf6f2ea, roughness: 0.52, envMapIntensity: 0.55 }), { noRing: true }),
    flwViolet: D(P({ color: 0x8c72c2, roughness: 0.58, envMapIntensity: 0.48 }), { noRing: true }),
    flwCoral: D(P({ color: 0xd48496, roughness: 0.56, envMapIntensity: 0.50 }), { noRing: true }),
    flwGold: D(P({ color: 0xe4d4e2, roughness: 0.54, envMapIntensity: 0.52 }), { noRing: true }),
    flwCenter: D(P({ color: 0x8c9658, roughness: 0.68, envMapIntensity: 0.38 }), { noRing: true }),
  });
  M.sheerLinen.emissive.setRGB(0.3, 0.28, 0.25);              // a sheer lets the window's light through: lit from behind, it is not a dark sheet
  M.bathSheer = D(FX.pbr(sets.linen, { size: 0.5, color: rgb(2.45, 2.36, 2.22), env: 0.3, normal: 0.8 }), { sat: 0 });
  M.bathSheer.emissive.setRGB(0.3, 0.28, 0.25);
  M.bathSheerPaper = D(FX.pbr(sets.linen, { size: 0.5, color: rgb(2.45, 2.36, 2.22), env: 0.3, normal: 0.8 }), { sat: 0 });
  M.bathSheerPaper.emissive.setRGB(0.3, 0.28, 0.25);
  Object.assign(M, {
    bk1: D(P({ color: 0xe9e2d4, roughness: 0.8 })), bk2: D(P({ color: 0x2c2a28, roughness: 0.8 })), bk3: D(P({ color: 0xb8452a, roughness: 0.8 })), bk4: D(P({ color: 0x8c8676, roughness: 0.8 })),
  });
  if (!M.mocha) { M.mocha = M.charcoal.clone(); M.mocha.onBeforeCompile = M.charcoal.onBeforeCompile; M.mocha.customProgramCacheKey = M.charcoal.customProgramCacheKey; M.mocha.userData = Object.assign({}, M.charcoal.userData); }
  [['sculptBronze', 'brass'], ['sculptDark', 'bronze']].forEach(([k, f]) => { if (M[k]) return; const o = M[f]; M[k] = o.clone(); M[k].onBeforeCompile = o.onBeforeCompile; M[k].customProgramCacheKey = o.customProgramCacheKey; M[k].userData = Object.assign({}, o.userData); });

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
      return add0(mat, g, null, true);
    };
    return bt;
  };
  tagged(B);
  const DEC = {};
  const dec = (zone) => DEC[zone] || (DEC[zone] = tagged(new FX.Batch()));
  const _cylCache = new Map();
  const _unitBall = new THREE.SphereGeometry(1, 26, 16).toNonIndexed();
  const _unitRod = new THREE.CylinderGeometry(1, 1, 1, 8).toNonIndexed();
  const _sprigBall = new THREE.SphereGeometry(0.035, 6, 5).toNonIndexed();
  const box = (bt, mat, x0, y0, x1, y1, z0, z1, r) =>
    bt.add(M[mat], FX.bevelBox(x1 - x0, z1 - z0, y1 - y0, r == null ? 0.01 : r), FX.M(WX((x0 + x1) / 2), (z0 + z1) / 2, WZ((y0 + y1) / 2)));
  // a box turned about its own middle (rot about the vertical, tilt about its width)
  const rbox = (bt, mat, cx, cy, z0, z1, w, d, r, rot, tilt) =>
    bt.add(M[mat], FX.bevelBox(w, z1 - z0, d, r == null ? 0.01 : r), FX.M(WX(cx), (z0 + z1) / 2, WZ(cy), tilt || 0, rot || 0, 0, 1, 1, 1, 'YXZ'));
  const cyl = (bt, mat, x, y, z0, z1, r0, r1, seg) => {
    const rt = r1 == null ? r0 : r1, h = z1 - z0, sg = seg || 28;
    const key = `${rt.toFixed(4)}|${r0.toFixed(4)}|${h.toFixed(4)}|${sg}`;
    let cg = _cylCache.get(key);
    if (!cg) {
      if (_cylCache.size > 400) _cylCache.clear();
      cg = new THREE.CylinderGeometry(rt, r0, h, sg).toNonIndexed();
      _cylCache.set(key, cg);
    }
    return bt.add(M[mat], cg, FX.M(WX(x), (z0 + z1) / 2, WZ(y)));
  };
  const ball = (bt, mat, x, y, z, r, sy, sx, sz) =>
    bt.add(M[mat], _unitBall, FX.M(WX(x), z, WZ(y), 0, 0, 0, r * (sx || 1), r * (sy || 1), r * (sz || sx || 1)));
  const lathe = (bt, mat, x, y, z, pts, sx, sz) =>
    bt.add(M[mat], new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), 36), FX.M(WX(x), z, WZ(y), 0, 0, 0, sx || 1, 1, sz || sx || 1));
  // a thin rod between two points (x, y, z)
  const _rodP = new V3(), _rodQ = new V3(), _rodD = new V3(), _rodUp = new V3(0, 1, 0), _rodQuat = new THREE.Quaternion(), _rodSc = new V3();
  const rod = (bt, mat, a, b, r) => {
    _rodP.set(WX(a[0]), a[2], WZ(a[1])); _rodQ.set(WX(b[0]), b[2], WZ(b[1]));
    _rodD.subVectors(_rodQ, _rodP); const l = _rodD.length() || 1e-4;
    const m = new THREE.Matrix4().compose(_rodP.add(_rodQ).multiplyScalar(0.5), _rodQuat.setFromUnitVectors(_rodUp, _rodD.multiplyScalar(1 / l)), _rodSc.set(r, l, r));
    bt.add(M[mat], _unitRod, m);
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
        bt.add(M[R() < 0.5 ? 'foliage' : 'foliageL'], _sprigBall,
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
    // Stepped architectural ceiling canopy & two-stage suspension rod
    cyl(bt, 'black', x, y, zTop - 0.010, zTop - 0.003, 0.070, 0.072, 36);                       // recessed dark ceiling shadow ring
    cyl(bt, 'brass', x, y, zTop - 0.038, zTop - 0.009, 0.050, 0.064, 36);                       // flared spun-brass ceiling canopy
    bt.add(M.brass, new THREE.TorusGeometry(0.062, 0.004, 12, 36), FX.M(WX(x), zTop - 0.011, WZ(y), Math.PI / 2, 0, 0));
    cyl(bt, 'brass', x, y, zTop - 0.058, zTop - 0.038, 0.015, 0.022, 24);                       // machined brass strain-relief collar
    cyl(bt, 'black', x, y, zTop - 0.074, zTop - 0.058, 0.010, 0.012, 20);                       // thermal reveal grommet
    cyl(bt, 'brass', x, y, zTop - 0.340, zTop - 0.074, 0.0068, 0.0068, 16);                     // upper spun-brass drop sleeve
    cyl(bt, 'brass', x, y, zTop - 0.358, zTop - 0.338, 0.0105, 0.0105, 20);                     // intermediate brass coupler ring
    cyl(bt, 'black', x, y, z + r * 0.96, zTop - 0.358, 0.0052, 0.0052, 16);                     // slender suspension stem
    if (kind === 'dome') {
      // Tiered spun-brass finial neck atop the golden dome
      cyl(bt, 'brass', x, y, z + r * 0.96, z + r * 1.18, 0.046, 0.018, 28);                     // flared brass neck cone
      cyl(bt, 'black', x, y, z + r * 1.18, z + r * 1.22, 0.016, 0.016, 24);                     // dark reveal ring
      cyl(bt, 'brass', x, y, z + r * 1.22, z + r * 1.30, 0.019, 0.012, 24);                     // top brass finial cap
      // Outer satin-polished spun-gold hemisphere, warm white inner reflector, and double-rolled brass equator bezel
      bt.add(M.brass, new THREE.SphereGeometry(r, 64, 28, 0, Math.PI * 2, 0, Math.PI * 0.51), FX.M(WX(x), z, WZ(y)));
      bt.add(M.white, new THREE.SphereGeometry(r * 0.976, 56, 24, 0, Math.PI * 2, 0, Math.PI * 0.50), FX.M(WX(x), z - 0.002, WZ(y)));
      bt.add(M.brass, new THREE.TorusGeometry(r, 0.0082, 14, 72), FX.M(WX(x), z, WZ(y), Math.PI / 2, 0, 0));
      bt.add(M.brass, new THREE.TorusGeometry(r * 0.955, 0.0045, 12, 64), FX.M(WX(x), z + 0.006, WZ(y), Math.PI / 2, 0, 0));
      // Inner concentric brass reflector cuff & luminous frosted opal-glass diffuser globe
      cyl(bt, 'brass', x, y, z + r * 0.36, z + r * 0.54, r * 0.58, r * 0.48, 36);
      ball(bt, 'glowSoft', x, y, z + r * 0.14, r * 0.52, 0.66);
      ball(bt, 'glow', x, y, z + r * 0.24, r * 0.28, 0.55);
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
  // a lounge chair: tailored cognac leather or outdoor linen seat and tilted back cushions on a sculpted timber frame. rot 0 faces south (+y)
  const lounge = (bt, cx, cy, rot, mat, frame) => thing(cx, cy, () => {
    const c = Math.cos(rot || 0), s = Math.sin(rot || 0), at = (dx, dy) => [cx + dx * c + dy * s, cy - dx * s + dy * c], fr = frame || 'walnut';
    [-0.36, 0.36].forEach((dx) => {
      tleg(bt, fr, [...at(dx, 0.33), 0], [...at(dx, 0.3), 0.52], 0.016, 0.024);
      tleg(bt, fr, [...at(dx, -0.34), 0], [...at(dx, -0.28), 0.22], 0.016, 0.025);
      tleg(bt, fr, [...at(dx, -0.28), 0.2], [...at(dx, -0.37), 0.75], 0.024, 0.017);
      const qFootF = at(dx, 0.33), qFootB = at(dx, -0.34);
      cyl(bt, 'brass', qFootF[0], qFootF[1], 0, 0.026, 0.017, 0.016, 12);
      cyl(bt, 'brass', qFootB[0], qFootB[1], 0, 0.026, 0.017, 0.016, 12);
      const qR = at(dx, 0.01), qA = at(dx, -0.01);
      rbox(bt, fr, qR[0], qR[1], 0.17, 0.225, 0.044, 0.64, 0.012, rot);
      rbox(bt, fr, qA[0], qA[1], 0.51, 0.555, 0.090, 0.68, 0.02, rot, -0.03);
    });
    const qF = at(0, 0.28), qB = at(0, -0.27), qU = at(0, -0.35), qD = at(0, 0.01);
    rbox(bt, fr, qF[0], qF[1], 0.165, 0.215, 0.72, 0.045, 0.012, rot);
    rbox(bt, fr, qB[0], qB[1], 0.18, 0.23, 0.72, 0.045, 0.012, rot);
    rbox(bt, fr, qU[0], qU[1], 0.63, 0.72, 0.72, 0.038, 0.012, rot, -0.22);
    // Vertical sculpted timber back spindles connecting the lower back rail to the upper crest rail
    [-0.24, -0.08, 0.08, 0.24].forEach((dx) => {
      tleg(bt, fr, [...at(dx, -0.27), 0.22], [...at(dx, -0.35), 0.65], 0.011, 0.011);
    });
    rbox(bt, fr, qD[0], qD[1], 0.175, 0.205, 0.68, 0.58, 0.01, rot, -0.04);
    const qS = at(0, 0.03), qBk = at(0, -0.23);
    pillow(bt, mat, qS[0], qS[1], 0.2, 0.67, 0.67, 0.15, -Math.PI / 2, rot, true);
    pillow(bt, mat, qBk[0], qBk[1], 0.31, 0.66, 0.48, 0.14, -0.25, rot, true);
  });
  // a mound of lavender: grey-green leaf below, flower spikes above
  // A mound of lavender: a dense cushion of grey-green blades round a core, and flower spikes on thin stems above it.
  // (A smooth ball with purple beads on it until 13 Oct. Sam, on the garden: "the plants feel a little bit weak".) It still
  // makes the same draws from R as before, so the garden's layout after it stays where it was.
  const lavender = (bt, x, y, r, zBase = 0) => thing(x, y, () => {
    const L = FX.rng(Math.round(x * 997 + y * 131));
    // Preserve exact shared R() draw count (14 * 4 = 56 draws) so downstream random layout never shifts
    const rDraws = [];
    for (let i = 0; i < 14; i++) rDraws.push([R(), R(), R(), R()]);
    // Dense multi-tier rosette of arching silvery-sage botanical leaves (no solid green ball at base)
    clump(bt, x, y, zBase + 0.01, r * 1.05, 34, 'sageLeaf', 0.68, L);
    clump(bt, x, y, zBase + 0.02, r * 0.82, 18, 'foliageL', 0.54, L);
    // Multi-whorl botanical lavender spike along an arching stem
    const spike = (a, q, h, w, colKey) => {
      const sx = x + Math.cos(a) * q * 0.38, sy = y + Math.sin(a) * q * 0.38, sz = zBase + r * 0.16;
      const mx = x + Math.cos(a) * q * 0.78, my = y + Math.sin(a) * q * 0.78, mz = zBase + h * 0.56;
      const tx = x + Math.cos(a) * q * 1.12, ty = y + Math.sin(a) * q * 1.12, tz = zBase + h;
      rod(bt, 'sageLeaf', [sx, sy, sz], [mx, my, mz], 0.0032);
      rod(bt, 'sageLeaf', [mx, my, mz], [tx, ty, tz], 0.0026);
      const dx = tx - mx, dy = ty - my, dz = Math.max(0.04, tz - mz), len = Math.hypot(dx, dy, dz) || 1;
      const ux = dx / len, uy = dy / len, uz = dz / len;
      // 4 stacked verticillaster floret whorls tapering to the spike apex
      for (let wIdx = 0; wIdx < 4; wIdx++) {
        const tW = (wIdx / 3.2) * w * 3.4;
        const wx = tx + ux * tW, wy = ty + uy * tW, wz = tz + uz * tW;
        const wr = w * (1.08 - wIdx * 0.17);
        ball(bt, wIdx === 3 ? 'flwViolet' : colKey, wx, wy, wz, wr, 1.35);
      }
    };
    for (let i = 0; i < 14; i++) {
      const [r0, r1, r2, r3] = rDraws[i];
      const a = r0 * 6.28, q = Math.sqrt(r1) * r * 0.85;
      spike(a, q, r * (1.05 + r2 * 0.38), Math.max(0.012, r * (0.055 + r3 * 0.032)), i % 3 === 0 ? 'flwViolet' : 'lav');
    }
    for (let i = 0; i < 16; i++) {
      const a = L() * 6.28, q = Math.sqrt(L()) * r * 0.85;
      spike(a, q, r * (1.02 + L() * 0.40), Math.max(0.012, r * (0.055 + L() * 0.032)), i % 2 === 0 ? 'lav' : 'flwViolet');
    }
    clump(bt, x, y, zBase + r * 0.28, r * 1.15, 6, 'lav', 0.65, L);
  });
  // Tall ornamental fountain/pampas grass with arching green-and-straw blades and feathery cream-gold plume ribbons
  const tallGrass = (bt, x, y, z, h, n, rnd) => thing(x, y, () => {
    const Rg = rnd || FX.rng(Math.round(x * 743 + y * 317));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283 + (Rg() - 0.5) * 0.42, lean = 0.28 + Rg() * 0.42, hh = h * (0.68 + Rg() * 0.44);
      const v = ((i * 7919) % 97) / 97;
      const g = bladeGeo(hh, 0.020 + 0.014 * v, 0.38 + 0.34 * v, 0.18);
      bt.add(M[i % 3 === 0 ? 'straw' : i % 2 === 0 ? 'foliage' : 'foliageL'], g,
        FX.M(WX(x), z, WZ(y), 0, -a + Math.PI / 2, 0, 1, 1, 1, 'YXZ').multiply(new THREE.Matrix4().makeRotationX(lean * 0.58)));
      // Feathery cream-gold plume panicles arching gracefully above the fountain of blades
      if (i % 3 === 0) {
        const pg = bladeGeo(hh * 1.18, 0.030 + 0.014 * v, 0.34 + 0.26 * v, 0.24);
        bt.add(M.plume, pg,
          FX.M(WX(x), z + 0.02, WZ(y), 0, -a + 0.08 + Math.PI / 2, 0, 1, 1, 1, 'YXZ').multiply(new THREE.Matrix4().makeRotationX(lean * 0.50)));
      }
    }
  });
  // Blooming Mediterranean garden flower cluster: lush basal leaf rosette + 2-segment arching stems + 3D cupped double-corolla blossoms
  const PETAL_GEO = new THREE.SphereGeometry(1, 10, 8);
  const flowerCluster = (bt, x, y, z, r, colMat, rnd) => thing(x, y, () => {
    const Rf = rnd || FX.rng(Math.round(x * 613 + y * 887));
    clump(bt, x, y, z, r * 1.50, 22, 'foliage', 0.58, Rf);
    clump(bt, x, y, z, r * 1.28, 16, 'sageLeaf', 0.52, Rf);
    const nBlossoms = 12 + Math.floor(Rf() * 5);
    const matMain = M[colMat || 'flwWhite'] || M.flwWhite;
    const matInner = colMat === 'flwViolet' ? M.lav : colMat === 'flwCoral' ? M.flwGold : M.flwWhite;
    for (let i = 0; i < nBlossoms; i++) {
      const a = (i / nBlossoms) * 6.283 + (Rf() - 0.5) * 0.42;
      const dist = (0.28 + 0.72 * Math.sqrt(Rf())) * r * 0.90;
      const bx = x + Math.cos(a) * dist * 0.28, by = y + Math.sin(a) * dist * 0.28;
      const mx = x + Math.cos(a) * dist * 0.68, my = y + Math.sin(a) * dist * 0.68;
      const tx = x + Math.cos(a) * dist, ty = y + Math.sin(a) * dist;
      const h = z + r * (0.82 + Rf() * 0.52);
      const mh = z + (h - z) * 0.56 + 0.02;
      // Gracefully arching 2-segment botanical stem + green sepal calyx cup
      rod(bt, 'foliage', [bx, by, z + 0.02], [mx, my, mh], 0.0036);
      rod(bt, 'foliage', [mx, my, mh], [tx, ty, h], 0.0028);
      const bScale = 0.024 + Rf() * 0.010;
      const tiltX = (Rf() - 0.5) * 0.28, tiltZ = (Rf() - 0.5) * 0.28;
      bt.add(M.foliage, PETAL_GEO, FX.M(WX(tx), h - 0.004, WZ(ty), tiltX, 0, tiltZ, bScale * 0.42, bScale * 0.36, bScale * 0.42));
      // Subtle botanical pistil heart
      bt.add(M.flwCenter, PETAL_GEO, FX.M(WX(tx), h + 0.005, WZ(ty), tiltX, 0, tiltZ, bScale * 0.34, bScale * 0.28, bScale * 0.34));
      // Outer ring of 5 upward-cupped ovate petals
      for (let p = 0; p < 5; p++) {
        const pa = (p / 5) * 6.283 + a * 0.3;
        const px = tx + Math.cos(pa) * bScale * 0.86, py = ty + Math.sin(pa) * bScale * 0.86;
        bt.add(matMain, PETAL_GEO, FX.M(WX(px), h + 0.003, WZ(py), tiltX * 0.4 + 0.32 * Math.sin(pa), -pa, tiltZ * 0.4 + 0.32 * Math.cos(pa), bScale * 0.82, bScale * 0.22, bScale * 0.56));
      }
      // Inner staggered ring of 5 steeper cupped petals for lush 3D floral volume
      for (let p = 0; p < 5; p++) {
        const pa = ((p + 0.5) / 5) * 6.283 + a * 0.3;
        const px = tx + Math.cos(pa) * bScale * 0.52, py = ty + Math.sin(pa) * bScale * 0.52;
        bt.add(matInner, PETAL_GEO, FX.M(WX(px), h + 0.008, WZ(py), tiltX * 0.4 + 0.52 * Math.sin(pa), -pa, tiltZ * 0.4 + 0.52 * Math.cos(pa), bScale * 0.58, bScale * 0.20, bScale * 0.42));
      }
    }
  });
  // A lounger, its head to the north at y0 and its foot 2 m south, x its west edge: sculpted Burmese teak perimeter chassis with
  // chamfered corner legs, brass wheel casters at the head, slatted teak deck and reclined backrest with ratchet struts, plush
  // piped mattress and backrest cushions, cylindrical neck bolster, and neatly folded spa towels at the foot.
  const lounger = (d, x, y0, towel) => thing(x + 0.375, y0 + 1, () => {
    const cx = x + 0.375;
    // Four standard sculpted Burmese teak corner legs with brushed-brass foot caps
    [[x + 0.05, y0 + 0.12], [x + 0.70, y0 + 0.12], [x + 0.05, y0 + 1.88], [x + 0.70, y0 + 1.88]].forEach(([lx, ly]) => {
      box(B, 'teak', lx - 0.028, ly - 0.028, lx + 0.028, ly + 0.028, 0.018, 0.21, 0.006);
      box(B, 'brass', lx - 0.029, ly - 0.029, lx + 0.029, ly + 0.029, 0, 0.020, 0.003);
    });
    // Perimeter Burmese teak chassis rails and cross-stretchers
    box(B, 'teak', x, y0, x + 0.055, y0 + 2.0, 0.175, 0.248, 0.010);
    box(B, 'teak', x + 0.695, y0, x + 0.75, y0 + 2.0, 0.175, 0.248, 0.010);
    box(B, 'teak', x + 0.05, y0, x + 0.70, y0 + 0.06, 0.175, 0.248, 0.010);
    box(B, 'teak', x + 0.05, y0 + 1.94, x + 0.70, y0 + 2.0, 0.175, 0.248, 0.010);
    box(B, 'black', x + 0.055, y0 + 0.06, x + 0.695, y0 + 1.94, 0.185, 0.238, 0.004);
    // Reclined slatted teak backrest frame & twin angled teak support struts
    rbox(B, 'teak', cx, y0 + 0.36, 0.38, 0.415, 0.66, 0.64, 0.010, 0, 0.58);
    [-0.24, 0.24].forEach((dx) => tleg(B, 'teak', [cx + dx, y0 + 0.48, 0.23], [cx + dx, y0 + 0.26, 0.46], 0.012, 0.014));
    // Plush tailored piped mattress cushion & reclined backrest cushion (using pillowGeo firm cushion loft)
    pillow(B, 'linenW', cx, y0 + 1.28, 0.245, 0.71, 1.42, 0.125, -Math.PI / 2, 0, true);
    pillow(B, 'linenW', cx, y0 + 0.33, 0.275, 0.71, 0.66, 0.115, 0.58 - Math.PI / 2, 0, true);
    // Fluffy contoured headrest pillow & soft folded spa towel at the foot
    pillow(d, towel || 'rust', cx, y0 + 0.27, 0.44, 0.50, 0.28, 0.13, 0.58 - Math.PI / 2, 0, 'sham');
    pillow(d, towel || 'rust', cx, y0 + 1.68, 0.362, 0.52, 0.32, 0.055, -Math.PI / 2, 0, true);
  });
  // Luxury floating pool lounger ("floating device you can sit on"): sculpted Burmese teak perimeter tray frame floating on the
  // water surface, multi-chamber channel-tufted outdoor bouclé/linen mattress, reclined headrest cushion, and terracotta bolster.
  const poolFloat = (d, cx, cy, zW, rot) => thing(cx, cy, () => {
    const c = Math.cos(rot || 0), s = Math.sin(rot || 0), at = (dx, dy) => [cx + dx * c + dy * s, cy - dx * s + dy * c];
    // Buoyant dark shadow hull & sculpted Burmese teak perimeter tray rim
    rbox(d, 'black', cx, cy, zW - 0.02, zW + 0.035, 1.02, 1.82, 0.016, rot);
    rbox(d, 'teak', cx, cy, zW + 0.025, zW + 0.085, 1.08, 1.88, 0.024, rot);
    // Four plush channel-tufted buoyant mattress chambers in warm ivory outdoor fabric
    [-0.58, -0.22, 0.14, 0.50].forEach((dy) => {
      const q = at(0, dy);
      pillow(d, 'linenW', q[0], q[1], zW + 0.075, 0.94, 0.35, 0.115, -Math.PI / 2, rot, true);
    });
    // Reclined floating lounge backrest cushion & cylindrical terracotta neck bolster at the head end (-y)
    const qBack = at(0, -0.68), qBol = at(0, -0.74);
    pillow(d, 'linenW', qBack[0], qBack[1], zW + 0.135, 0.92, 0.42, 0.13, 0.42 - Math.PI / 2, rot, true);
    d.add(M.rust, new THREE.CylinderGeometry(0.068, 0.068, 0.72, 28), FX.M(WX(qBol[0]), zW + 0.26, WZ(qBol[1]), 0, rot, Math.PI / 2));
    // Folded sage/terracotta towel & inlaid teak drink coaster at the foot end (+y)
    const qTow = at(-0.16, 0.72), qTray = at(0.28, 0.72);
    rbox(d, 'rust', qTow[0], qTow[1], zW + 0.14, zW + 0.175, 0.46, 0.28, 0.012, rot + 0.05);
    rbox(d, 'teak', qTray[0], qTray[1], zW + 0.14, zW + 0.162, 0.24, 0.24, 0.008, rot);
    cyl(d, 'brass', qTray[0], qTray[1], zW + 0.162, zW + 0.245, 0.036, 0.032, 20);
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
  let STOOL_BACK = null;
  const stoolBackGeo = () => {
    if (STOOL_BACK) return STOOL_BACK;
    const NU = 40, NV = 22, pos = [], idx = [], uv = [];
    for (let i = 0; i <= NU; i++) {
      const u = (i / NU) * 2 - 1, au = Math.abs(u);
      const th = u * 0.58 * Math.PI;
      const rx = 0.204, ry = 0.194;
      const cx = rx * Math.sin(th), cy = -0.012 + ry * Math.cos(th);
      const tx = rx * Math.cos(th), ty = -ry * Math.sin(th), tl = Math.hypot(tx, ty) || 1;
      const nx = -ty / tl, ny = tx / tl;
      const tipTaper = Math.pow(Math.max(0.02, 1 - Math.pow(au, 5.5)), 0.42);
      const zBot = 0.624 + 0.012 * u * u;
      const zTop = 0.908 - 0.142 * Math.pow(au, 1.55);
      const zm = 0.5 * (zBot + zTop), hh = 0.5 * (zTop - zBot) * tipTaper;
      const ht = 0.029 * Math.pow(Math.max(0.05, 1 - 0.52 * u * u), 0.35) * tipTaper;
      for (let j = 0; j <= NV; j++) {
        const phi = (j / NV) * Math.PI * 2;
        const cv = Math.cos(phi), sv = Math.sin(phi);
        const cvP = Math.sign(cv) * Math.pow(Math.abs(cv), 0.80);
        const svP = Math.sign(sv) * Math.pow(Math.abs(sv), 0.78);
        const hFrac = 0.5 * (svP + 1);
        const lean = (0.028 * (1 - 0.55 * u * u)) * hFrac;
        const seamTuck = cv > 0 ? -0.0025 * Math.exp(-u * u / 0.006) * cv : 0.003 * (1 - u * u) * (-cv);
        const radOff = cvP * ht + lean + seamTuck;
        pos.push(cx + nx * radOff, zm + svP * hh, cy + ny * radOff);
        uv.push(0.5, 0.5);
      }
    }
    for (let i = 0; i < NU; i++) {
      for (let j = 0; j < NV; j++) {
        const k = i * (NV + 1) + j;
        idx.push(k, k + NV + 1, k + 1, k + 1, k + NV + 1, k + NV + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return (STOOL_BACK = g);
  };
  const stool = (bt, x, y) => thing(x, y, () => {
    const SH = 0.61;
    // Four sculpted tapered dark-walnut legs splayed from the under-seat cradle to the floor
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) =>
      tleg(bt, 'chairWood', [x + sx * 0.205, y + sy * 0.198, 0], [x + sx * 0.162, y + sy * 0.156, SH - 0.015], 0.015, 0.025)
    );
    // Sculpted dark-walnut under-seat apron ring and cross stretcher rails
    cyl(bt, 'chairWood', x, y - 0.005, SH - 0.036, SH + 0.002, 0.214, 0.202, 36);
    rbox(bt, 'chairWood', x, y - 0.005, SH - 0.034, SH - 0.006, 0.36, 0.034, 0.005, 0.78, 0);
    rbox(bt, 'chairWood', x, y - 0.005, SH - 0.034, SH - 0.006, 0.36, 0.034, 0.005, -0.78, 0);
    // Plush tailored cognac saddle-leather seat cushion with perimeter welt piping
    cyl(bt, 'leather', x, y - 0.006, SH, SH + 0.052, 0.214, 0.208, 36);
    ball(bt, 'leather', x, y - 0.006, SH + 0.048, 0.210, 0.12, 1.01, 0.98);
    bt.add(M.leather, new THREE.TorusGeometry(0.210, 0.0075, 12, 40), FX.M(WX(x), SH + 0.005, WZ(y - 0.006), Math.PI / 2, 0, 0));
    // Sculpted wrap-around cognac saddle-leather bucket backrest shell
    bt.add(M.leather, stoolBackGeo(), FX.M(WX(x), 0, WZ(y)));
    // Continuous circular brushed-brass footrest ring with radial mounting spokes at z = 0.235 m
    const fz = 0.235;
    bt.add(M.brass, new THREE.TorusGeometry(0.188, 0.0095, 14, 48), FX.M(WX(x), fz, WZ(y), Math.PI / 2, 0, 0));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) =>
      rod(bt, 'brass', [x + sx * 0.125, y + sy * 0.122, fz], [x + sx * 0.165, y + sy * 0.160, fz], 0.0065)
    );
  });

  /* ---------- art ---------------------------------------------------------------- */
  const PAL = ['#ece4d6', '#1f1b18', '#b8452a', '#c9a15a', '#8b8674', '#d9cdb8', '#3d3a33', '#6f7a5a', '#f4efe6'];
  /* Paintings: oil on canvas, one series. Each is a few fields of colour, bands of a landscape or the soft stacked blocks
     of a colour field, laid on in thousands of short brush strokes. A stroke is a handful of bristle lines that each
     carry a little more or less paint, so it shows its tooth. Where two fields meet, strokes from both cross the line,
     so no edge is ruled. Then a few accents: a horizon, a sun, one gesture.
     (13 Oct, Sam on the gallery: "make like art painting inside them instead of like random shape".) */
  const PAINTS = [
    { bands: [[0, '#d8cebc'], [0.58, '#b8ab96']], wave: 0.005, blocks: [[0.10, 0.08, 0.56, 0.52, '#efe6d5'], [0.60, 0.08, 0.90, 0.36, '#b8562e'], [0.60, 0.40, 0.90, 0.91, '#26201b'], [0.10, 0.56, 0.56, 0.91, '#d29544']], line: [0.54, '#26201b'] },
    { bands: [[0, '#ddd6c7'], [0.52, '#8b8373'], [0.80, '#3a352e']], wave: 0.010, blocks: [[0.12, 0.09, 0.88, 0.46, '#c8bca6'], [0.12, 0.52, 0.62, 0.88, '#4e473c'], [0.66, 0.52, 0.88, 0.88, '#b89458']], line: [0.49, '#ece5d8'] },
    { bands: [[0, '#97482b']], blocks: [[0.10, 0.08, 0.90, 0.50, '#c5652f'], [0.10, 0.56, 0.90, 0.92, '#38221a']], line: [0.53, '#e6cdb5'] },
    { bands: [[0, '#2c333c'], [0.56, '#151920']], wave: 0.004, blocks: [[0.14, 0.10, 0.86, 0.50, '#38424e'], [0.18, 0.60, 0.82, 0.89, '#1c212a']], line: [0.56, '#d8d0bc'] },
    { bands: [[0, '#ece6da'], [0.60, '#d0c9bc'], [0.68, '#e9e3d6']], blocks: [[0.12, 0.10, 0.88, 0.54, '#f3ede2'], [0.16, 0.62, 0.84, 0.88, '#c5bdb0']], gesture: '#1e1b19' },
    { bands: [[0, '#d8a84e'], [0.60, '#9e5f2e'], [0.82, '#4a3223']], wave: 0.012, blocks: [[0.12, 0.09, 0.88, 0.52, '#e0b35a'], [0.12, 0.58, 0.56, 0.89, '#8c4c22'], [0.60, 0.58, 0.88, 0.89, '#382519']], line: [0.55, '#f2dfc0'] },
    { bands: [[0, '#8e8981']], blocks: [[0.12, 0.08, 0.88, 0.42, '#d9d3c5'], [0.12, 0.48, 0.88, 0.92, '#393734']], line: [0.45, '#b8965a'] },
    { bands: [[0, '#5d1d18']], blocks: [[0.1, 0.08, 0.9, 0.54, '#201413'], [0.1, 0.61, 0.9, 0.92, '#8d2a1f']] },                               // ember
    { bands: [[0, '#dcdcd6'], [0.42, '#b9c0c0'], [0.5, '#8f9897'], [0.58, '#cfc8b8'], [0.8, '#a39a88']], wave: 0.015, line: [0.5, '#eeeae0'] },   // mist (over the bedroom's chest)
    { bands: [[0, '#ddd2be'], [0.38, '#c5a46c'], [0.68, '#8d5b34'], [0.88, '#36271d']], wave: 0.022, blocks: [[0.08, 0.12, 0.46, 0.56, '#ede4d3'], [0.50, 0.12, 0.92, 0.48, '#b66836'], [0.08, 0.62, 0.60, 0.88, '#4a372a'], [0.64, 0.54, 0.92, 0.88, '#d4a359']], line: [0.58, '#241c17'], gesture: '#281f19' }, // field (the bedroom's ledge)
  ];
  const paint = (g, W, H, P, r) => {
    const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)), rgbS = (c, k) => `rgb(${c.map((v) => Math.max(0, Math.min(255, Math.round(v * k)))).join(',')})`;
    const ph = r() * 6.28, jit = () => (r() - 0.5) * 0.024;
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
    g.lineCap = 'round';
    const bristle = (x, y, len, wid, ang, col, alpha) => {
      const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx, n = 5, c = hex(col), k0 = 0.94 + r() * 0.12;
      g.globalAlpha = alpha * (0.45 + r() * 0.55);
      g.strokeStyle = rgbS(c, k0 * (0.95 + r() * 0.1));
      g.lineWidth = Math.max(1, (wid / n) * 1.7);
      g.beginPath();
      for (let i = 0; i < n; i++) {
        const o = (i / (n - 1) - 0.5) * wid, l = len * (0.7 + r() * 0.3), s0 = (r() - 0.5) * len * 0.15;
        g.moveTo(x + nx * o - dx * (l / 2 - s0), y + ny * o - dy * (l / 2 - s0));
        g.quadraticCurveTo(x + nx * (o + wid * 0.15 * (r() - 0.5)), y + ny * (o + wid * 0.15 * (r() - 0.5)), x + nx * o + dx * (l / 2 + s0), y + ny * o + dy * (l / 2 + s0));
      }
      g.stroke();
      if (r() < 0.18) { g.globalAlpha = 0.18; g.strokeStyle = rgbS(c, 1.25); g.lineWidth = Math.max(1, wid * 0.12); g.beginPath(); g.moveTo(x + nx * wid * 0.45 - dx * len * 0.4, y + ny * wid * 0.45 - dy * len * 0.4); g.lineTo(x + nx * wid * 0.45 + dx * len * 0.4, y + ny * wid * 0.45 + dy * len * 0.4); g.stroke(); }
    };
    const N = Math.round((W * H) / 240);
    for (let i = 0; i < N; i++) {
      const u = r(), v = r(), col = at(u, v, true), big = r() < 0.25;
      bristle(u * W, v * H, W * (big ? 0.12 + r() * 0.1 : 0.04 + r() * 0.07), W * (big ? 0.03 + r() * 0.02 : 0.012 + r() * 0.018), (r() - 0.5) * 0.22 + (r() < 0.08 ? 1.57 : 0), col, 0.55 + r() * 0.4);
    }
    if (P.line) { const c = P.line[1]; for (let x = 0.08; x < 0.92; x += 0.012) bristle(x * W, (P.line[0] + Math.sin(x * 9 + ph) * 0.002) * H, W * 0.05, H * 0.006, (r() - 0.5) * 0.08, c, 0.84); }
    if (P.gesture) {
      // one sweep of a loaded brush across the canvas, along a smooth curve, running dry on the way
      const cv = new THREE.SplineCurve([[0.12, 0.55], [0.32, 0.45], [0.56, 0.5], [0.76, 0.58], [0.88, 0.5]].map(([u, v]) => new THREE.Vector2(u * W, v * H)));
      for (let t = 0; t < 1; t += 0.003) {
        const q = cv.getPoint(t), d = cv.getTangent(t);
        bristle(q.x, q.y, W * 0.04, W * (0.1 - 0.05 * t), Math.atan2(d.y, d.x), P.gesture, (1 - t * 0.6) * (r() < 0.1 + t * 0.45 ? 0.15 : 0.9));
      }
    }
    // the weave of the canvas, under everything that sits on top
    g.globalAlpha = 0.05; g.fillStyle = '#000'; for (let x = 0; x < W; x += 3) g.fillRect(x, 0, 1, H); for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
    g.globalAlpha = 1;
  };
  const _artCache = new Map();
  const artTex = (kind, w, h, seed) => {
    const cKey = `${kind}|${w}|${h}|${seed || 0}`;
    if (_artCache.has(cKey)) return _artCache.get(cKey);
    const outTex = FX.canvasTex(w, h, (g) => {
    if (kind === 'paint') { paint(g, w, h, PAINTS[(seed || 0) % PAINTS.length], FX.rng(100 + (seed || 0))); return; }        // (0 to 6 hang in the gallery, 8 and 9 in the bedroom)
    const r = FX.rng(seed || 1);
    if (kind === 'field') {
      // Full-bleed museum-grade organic soak-stain, wet-in-wet diffusion, and palette-knife impasto on raw Belgian linen
      const G = 128, Perm = new Float32Array(G * G);
      for (let i = 0; i < G * G; i++) Perm[i] = r();
      const n2 = (x, y) => {
        const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
        const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
        const x0 = xi & 127, x1 = (x0 + 1) & 127, y0 = (yi & 127) << 7, y1 = ((yi + 1) & 127) << 7;
        const a = Perm[y0 + x0], b = Perm[y0 + x1], c = Perm[y1 + x0], d = Perm[y1 + x1];
        return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
      };
      const fbm = (x, y) => 0.54 * n2(x, y) + 0.30 * n2(x * 2.13 + 11.7, y * 2.13 + 5.3) + 0.16 * n2(x * 4.41 + 23.1, y * 4.41 + 19.8);
      const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

      const img = g.createImageData(w, h), D = img.data;
      // Stain layers: [cx, cy, rx, ry, cosA, sinA, rCol, gCol, bCol, rDeep, gDeep, bDeep, alpha, warp, freq, seed]
      const mkStain = (cx, cy, rx, ry, ang, col, deep, alpha, warp, freq, seed) => [
        cx, cy, rx, ry, Math.cos(ang), Math.sin(ang), col[0], col[1], col[2], deep[0], deep[1], deep[2], alpha, warp, freq, seed
      ];
      const stains = [
        // 1. Broad atmospheric warm parchment & raw-sienna sizing wash flowing across the linen
        mkStain(0.48, 0.46, 0.52, 0.46, -0.45, [204, 180, 146], [168, 138, 102], 0.58, 0.52, 1.9, 3.1),
        // 2. Luminous golden-ochre & warm amber mineral soak sweeping upper-right to center-left
        mkStain(0.54, 0.34, 0.40, 0.30, 0.42, [196, 140, 72], [156, 98, 40], 0.76, 0.54, 2.2, 9.4),
        // 3. Flowing Venetian terracotta & burnt-sienna organic stain (upper-left through center-right)
        mkStain(0.40, 0.40, 0.38, 0.29, -0.48, [160, 68, 38], [114, 38, 18], 0.84, 0.56, 2.4, 17.2),
        // 4. Luminous warm chalk-ivory & pale flax mineral water-bloom (interleaving organically through the center)
        mkStain(0.56, 0.48, 0.32, 0.22, -0.35, [234, 225, 208], [206, 192, 168], 0.68, 0.58, 2.7, 21.5),
        // 5. Warm rust-sienna & raw-umber organic wash (lower-right flow)
        mkStain(0.62, 0.66, 0.33, 0.25, 0.34, [146, 74, 44], [102, 42, 22], 0.76, 0.50, 2.5, 25.8),
        // 6. Deep smoked walnut-umber soak-stain (lower-left & center-bottom organic mass)
        mkStain(0.38, 0.65, 0.39, 0.28, 0.26, [62, 46, 35], [34, 23, 16], 0.88, 0.54, 2.3, 33.5),
        // 7. Fluid sumi-charcoal & espresso-slate organic core (meandering through the middle & lower-left)
        mkStain(0.43, 0.55, 0.31, 0.23, -0.38, [32, 27, 24], [16, 13, 11], 0.90, 0.58, 2.6, 42.1),
        // 8. Translucent warm sepia-ash veil bridging upper-center and left
        mkStain(0.32, 0.30, 0.28, 0.22, 0.52, [112, 92, 74], [74, 58, 44], 0.62, 0.52, 2.8, 51.6),
        // 9. Secondary warm ochre-sand mineral bloom lifting the lower-center transition
        mkStain(0.52, 0.60, 0.26, 0.19, -0.28, [208, 164, 106], [166, 118, 64], 0.64, 0.56, 3.0, 60.3),
      ];

      for (let py = 0; py < h; py++) {
        const v = py / h;
        const wy = Math.sin(py * 1.45);
        for (let px = 0; px < w; px++) {
          const u = px / w;
          const wx = Math.sin(px * 1.45);
          // Unprimed Belgian linen ground with slub weave and warm flax variation
          const lCloud = fbm(u * 2.4 + 1.2, v * 2.4 + 3.4);
          const lSlub = (wx * (0.6 + 0.5 * n2(u * 3.5, v * 48.0)) + wy * (0.6 + 0.5 * n2(u * 48.0, v * 3.5))) * 3.0;
          const lGrain = (n2(u * 85.0, v * 85.0) - 0.5) * 6.5;
          let R = 232 - lCloud * 15 + lSlub + lGrain;
          let Gc = 223 - lCloud * 17 + lSlub + lGrain;
          let B = 207 - lCloud * 19 + lSlub + lGrain;

          // Shared two-octave curl/fluid warp field for organic liquid flow
          const w1x = fbm(u * 2.1 + 4.1, v * 2.1 + 1.7) - 0.5;
          const w1y = fbm(u * 2.1 + 8.9, v * 2.1 + 6.3) - 0.5;

          for (let s = 0; s < stains.length; s++) {
            const st = stains[s];
            const wf = st[14], sd = st[15], wa = st[13];
            // Coarse bounding check before evaluating stain warp octaves
            if (Math.abs(u - st[0]) > st[2] * 1.65 + wa * 0.45 && Math.abs(v - st[1]) > st[3] * 1.65 + wa * 0.45) continue;
            const w2x = fbm(u * wf + sd, v * wf + sd * 0.7) - 0.5;
            const w2y = fbm(u * wf + sd + 5.2, v * wf + sd * 0.7 + 9.1) - 0.5;
            const uw = u + wa * (0.56 * w1x + 0.44 * w2x);
            const vw = v + wa * (0.56 * w1y + 0.44 * w2y);
            const dx = uw - st[0], dy = vw - st[1];
            const rx = (dx * st[4] - dy * st[5]) / st[2];
            const ry = (dx * st[5] + dy * st[4]) / st[3];
            const r0 = Math.hypot(rx, ry);
            if (r0 >= 1.34) continue;
            const cap = (n2(uw * 18.0 + sd, vw * 18.0 + sd) - 0.5) * 0.08;
            const d = r0 + cap;
            if (d >= 1.296) continue;

            // Variable wet-in-wet diffusion vs crisp capillary dry-linen stop along each stain's coastline
            const wetZone = sstep(0.28, 0.70, fbm(uw * 3.0 + sd * 0.4, vw * 3.0 + sd * 0.6));
            const aa = 0.016 + 0.28 * wetZone;
            if (d < 1.0 + aa) {
              const edge = 1.0 - sstep(1.0 - aa, 1.0 + aa * 0.35, d);
              // Subtle one-sided downhill capillary pooling only where the liquid hits dry linen
              const dryStop = (1.0 - wetZone) * sstep(-0.15, 0.55, dy * 2.8 + rx * 0.4);
              const dr = d - 0.95;
              const pool = Math.exp(-(dr * dr) / 0.0020) * dryStop * 0.24;
              // Rich internal mineral wash with organic pigment granulation
              const gran = fbm(uw * 6.0 + sd * 1.3, vw * 6.0 + sd * 0.9);
              const body = 0.74 + 0.26 * gran;
              const wgt = Math.min(1, (body + pool) * st[12] * edge);
              const deepMix = Math.min(1, (1.0 - gran) * 0.42 + pool * 1.05);
              const sr = st[6] + (st[9] - st[6]) * deepMix;
              const sg = st[7] + (st[10] - st[7]) * deepMix;
              const sb = st[8] + (st[11] - st[8]) * deepMix;
              const mulR = (R * sr) / 234, mulG = (Gc * sg) / 226, mulB = (B * sb) / 212;
              const Mix = s === 3 || s === 8 ? 0.72 : 0.52;
              const tgtR = mulR * (1 - Mix) + sr * Mix;
              const tgtG = mulG * (1 - Mix) + sg * Mix;
              const tgtB = mulB * (1 - Mix) + sb * Mix;
              R += (tgtR - R) * wgt;
              Gc += (tgtG - Gc) * wgt;
              B += (tgtB - B) * wgt;
            }
          }

          const idx = (py * w + px) * 4;
          D[idx] = Math.max(0, Math.min(255, R));
          D[idx + 1] = Math.max(0, Math.min(255, Gc));
          D[idx + 2] = Math.max(0, Math.min(255, B));
          D[idx + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);

      // Subtle mineral pigment spatter along the organic stain transitions
      const S = w / 768;
      for (let i = 0; i < 320; i++) {
        const sx = (0.16 + 0.68 * r()) * w, sy = (0.14 + 0.72 * r()) * h, sr = (0.5 + 1.6 * r()) * S;
        g.globalAlpha = 0.10 + 0.22 * r();
        g.fillStyle = ['#1e1915', '#8e381e', '#b87c38', '#efe6d4', '#4a3d32'][(r() * 5) | 0];
        g.beginPath(); g.arc(sx, sy, sr, 0, 6.28); g.fill();
      }
      g.globalAlpha = 1;
      return;
    }
    const m = Math.round(Math.min(w, h) * 0.085);
    g.fillStyle = '#f6f2ea'; g.fillRect(0, 0, w, h);                        // the mat
    g.save(); g.beginPath(); g.rect(m, m, w - 2 * m, h - 2 * m); g.clip();
    g.fillStyle = PAL[0]; g.fillRect(0, 0, w, h);
    const W = w - 2 * m, H = h - 2 * m;
    if (kind === 'sun') { g.fillStyle = PAL[1]; g.fillRect(m + W * 0.12, m + H * 0.08, W * 0.76, H * 0.36); g.fillStyle = PAL[2]; g.beginPath(); g.arc(w / 2, m + H * 0.7, W * 0.2, 0, 6.3); g.fill(); }
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
    _artCache.set(cKey, outTex);
    return outTex;
  };
  // a framed work on a wall. wall: which way the wall faces you from ('E' = on an east wall, facing west)
  const art = (zone, kind, wall, u, c, z, w, h, frame, seed) => thing(wall === 'E' || wall === 'W' ? c : u, wall === 'E' || wall === 'W' ? u : c, () => {
    const px = kind === 'paint' || kind === 'field' ? 384 : Math.round(256 * Math.min(2.4, Math.max(1, w))), tex = artTex(kind, px, Math.round((px * h) / w), seed);
    const cMat = drawable(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.84, envMapIntensity: 0.42 }), 'none', { side: THREE.FrontSide });
    // Add tactile woven Belgian linen thread relief, impasto brushstroke sheen, and gallery spotlight glow to the painted canvas
    { const before = cMat.onBeforeCompile, keyB = cMat.customProgramCacheKey;
      cMat.onBeforeCompile = (sh, r) => {
        before(sh, r);
        sh.fragmentShader = sh.fragmentShader.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          float cLum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          roughnessFactor = clamp(0.62 + 0.28 * smoothstep(0.25, 0.75, cLum), 0.52, 0.94);`).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          { float wvX = sin(vDrawW.z * 920.0) * cos(vDrawW.y * 920.0);
            float imp = dot(diffuseColor.rgb, vec3(0.333)) * 0.0022 + wvX * 0.00018;
            normal = normalize(normal + vec3(dFdx(imp), dFdy(imp), 0.0) * 18.0); }`).replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          if (vDrawW.x > 13.0) {
            float pyPlan = vDrawW.z + 24.0;
            float spotC = 0.0;
            if (vDrawW.x < 15.0) {
              float pIdx = clamp(floor((pyPlan - 9.4) / 3.0), 0.0, 6.0);
              float dyS = pyPlan - (10.9 + pIdx * 3.0);
              float dzS = vDrawW.y - 1.78;
              spotC = exp(-(dyS * dyS * 1.45 + dzS * dzS * 1.15));
            } else if (vDrawW.x > 20.5 && pyPlan > 38.5) {
              float dyS = pyPlan - 39.85;
              float dzS = vDrawW.y - 1.88;
              spotC = 1.25 * exp(-(dyS * dyS * 2.2 + dzS * dzS * 1.55));
            }
            totalEmissiveRadiance += diffuseColor.rgb * vec3(1.10, 0.94, 0.72) * (0.24 * spotC);
          }`);
      };
      cMat.customProgramCacheKey = () => keyB() + '-canvasImpastoSpot2';
    }
    const m = new THREE.Mesh(mark(new THREE.PlaneGeometry(w, h), THING), cMat);
    // (16 Oct, Sam: "the painting feels like inside the wall, so maybe just add some depth, like a real painting": the canvas
    // now stands 5.4 cm off the wall on a raw-linen stretcher in a stepped museum floating frame with a deep dark shadow gap
    // and a warm brushed-brass inner sight-edge fillet.)
    const e = 0.054, t = 0.032, f = frame || 'walnut';
    if (wall === 'E') { m.rotation.y = -Math.PI / 2; m.position.set(WX(c - e), z, WZ(u)); }
    else if (wall === 'W') { m.rotation.y = Math.PI / 2; m.position.set(WX(c + e), z, WZ(u)); }
    else if (wall === 'N') { m.position.set(WX(u), z, WZ(c + e)); }
    else { m.rotation.y = Math.PI; m.position.set(WX(u), z, WZ(c - e)); }
    scene.add(m); own([m], zone); m.castShadow = true;
    const bt = dec(zone), s = wall === 'E' || wall === 'S' ? -1 : 1, along = wall === 'E' || wall === 'W';
    const slab = (mat, du, dz, lu, lz, a0, a1, r) => { const d0 = c + s * a0, d1 = c + s * a1;
      if (along) box(bt, mat, Math.min(d0, d1), u + du - lu / 2, Math.max(d0, d1), u + du + lu / 2, z + dz - lz / 2, z + dz + lz / 2, r);
      else box(bt, mat, u + du - lu / 2, Math.min(d0, d1), u + du + lu / 2, Math.max(d0, d1), z + dz - lz / 2, z + dz + lz / 2, r); };
    slab('bk2', 0, 0, w, h, 0.012, e - 0.002, 0.003);                                                  // raw-linen stretcher return edge
    const g = 0.014, W2 = w + 2 * g, H2 = h + 2 * g;                                                    // deep museum shadow gap round the canvas
    slab('black', 0, 0, W2 + 0.010, H2 + 0.010, 0.001, 0.016, 0.002);                                    // recessed shadow tray flush against the wall
    // inner warm brushed-brass sight-edge fillet lining the floating frame
    const tb = 0.008, Wb = W2 + 2 * tb, Hb = H2 + 2 * tb;
    const barB = (du, dz, lu, lz) => slab('brass', du, dz, lu, lz, 0.006, e + 0.006, 0.0018);
    barB(0, H2 / 2 + tb / 2, Wb, tb); barB(0, -H2 / 2 - tb / 2, Wb, tb); barB(-W2 / 2 - tb / 2, 0, tb, H2); barB(W2 / 2 + tb / 2, 0, tb, H2);
    // outer architectural floating frame moulding with crisp mitered reveal
    const bar = (du, dz, lu, lz) => slab(f, du, dz, lu, lz, 0.001, e + 0.014, 0.0035);
    bar(0, Hb / 2 + t / 2, Wb + 2 * t, t); bar(0, -Hb / 2 - t / 2, Wb + 2 * t, t); bar(-Wb / 2 - t / 2, 0, t, Hb); bar(Wb / 2 + t / 2, 0, t, Hb);
  });
  /* ---------- soft things: pillows and bedding ---------------------------------------
     A box reads as a block of foam. A pillow is plump in the middle and thin at the seam,
     and a duvet has a little life in its surface and a soft edge. */
  // (firm: a sofa's or armchair's box cushion with a vertical gusset border up to 0.34 * t, rounded welt shoulders, and a soft crown)
  // (miter: -1 or +1 to bevel one end of a backrest cushion at 45 degrees where two runs meet in a corner)
  const pillowGeo = (w, h, t, firm, cx, cy, mat, miter) => {
    const isSoft = !firm || firm === 'sham';
    const g = new THREE.BoxGeometry(w, h, t, isSoft ? 32 : 20, isSoft ? 28 : 20, isSoft ? 14 : 10), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / (w / 2), v = p.getY(i) / (h / 2), w0 = p.getZ(i) / (t / 2);
      if (isSoft) {
        // Seamless C1-continuous 3D down pillow: blends Nowell's analytical cube-to-sphere depth roll (sw) with
        // a true sewn-pillow silhouette (74% rectangular plan + 26% spherical rounding + pinched corner ears)
        // so the 12 BoxGeometry edges vanish while preserving natural down-pillow proportions and soft corner ears
        const u2 = u * u, v2 = v * v, w2 = w0 * w0;
        const su = u * Math.sqrt(Math.max(0.01, 1 - 0.5 * v2 - 0.5 * w2 + (v2 * w2) / 3));
        const sv = v * Math.sqrt(Math.max(0.01, 1 - 0.5 * u2 - 0.5 * w2 + (u2 * w2) / 3));
        const sw = w0 * Math.sqrt(Math.max(0.01, 1 - 0.5 * u2 - 0.5 * v2 + (u2 * v2) / 3));
        // Keep true pillow width/height silhouette with rounded edge wrap and soft pinched corners
        const edgeWrap = 1 - 0.065 * (1 - w2) * (1 - 0.65 * u2 * v2);
        const rx = (u * 0.74 + su * 0.26) * edgeWrap;
        const ry = (v * 0.74 + sv * 0.26) * edgeWrap;
        const rx2 = rx * rx, ry2 = ry * ry;
        const asym = (cx > 47.25 ? 1 : -1) * 0.010 * Math.sin(u * 2.4 + v * 1.9);
        // Plump lower belly & soft pinched down-pillow corner ears
        const earX = 1 + 0.032 * (1 - ry2) - 0.018 * ry * (1 - ry2) + 0.058 * u2 * v2 * (1 - 0.45 * w2) + asym;
        const earY = 1 + 0.052 * u2 * v2 * (1 - 0.45 * w2);
        const vTop = Math.max(0, ry), vBot = Math.max(0, -ry);
        const topDip = (-0.048 * Math.exp(-rx2 * 3.6) + 0.028 * Math.sin(Math.min(1, Math.abs(rx)) * Math.PI * 0.88)) * (h / 2) * Math.pow(vTop, 1.25);
        const botSag = (-0.022 * (1 - rx2) + 0.018 * rx2) * (h / 2) * Math.pow(vBot, 1.25);
        // Smooth 3D down loft across all 6 faces with gravity belly and subtle fabric gather
        const zLoft = Math.sign(sw) * Math.pow(Math.abs(sw), 0.72);
        const gravityBelly = 1 - 0.08 * ry + 0.06 * (1 - ry2);
        const centerCrease = 1 - 0.08 * Math.exp(-rx2 * 5.0) * Math.max(0, ry + 0.20);
        const pleats = 1 + 0.024 * Math.sin(rx * 6.5 + 0.4) * Math.cos(ry * 5.0 - 0.3) * (1 - 0.65 * Math.abs(sw));
        const xNew = (w / 2) * rx * earX;
        const yNew = (h / 2) * ry * earY + topDip + botSag;
        const zNew = (t / 2) * zLoft * gravityBelly * centerCrease * pleats;
        p.setXYZ(i, xNew, yNew, zNew);
      } else {
        const f = Math.pow(Math.max(0, (1 - u * u) * (1 - v * v)), 0.22);
        const pinch = 1 - 0.036 * u * u * v * v + 0.012 * (1 - w0 * w0) - 0.016 * Math.pow(Math.abs(w0), 4) * (1 - f);
        let x = p.getX(i) * pinch, y = p.getY(i) * pinch, z = p.getZ(i) * (0.68 + 0.32 * f);
        if (miter) {
          const tc = Math.max(0, Math.min(1, 0.5 * (1 + miter * u)));
          x -= miter * tc * (z + t * 0.42);
        }
        p.setXYZ(i, x, y, z);
      }
    }
    g.computeVertexNormals();
    if (isSoft) {
      // Weld normals across BoxGeometry shoulder seams so the 3D down roll shades continuously around the edges
      const nrm = g.attributes.normal, map = new Map();
      for (let i = 0; i < p.count; i++) {
        const k = `${Math.round(p.getX(i) * 2000)},${Math.round(p.getY(i) * 2000)},${Math.round(p.getZ(i) * 2000)}`;
        let b = map.get(k); if (!b) { b = [0, 0, 0, []]; map.set(k, b); }
        b[0] += nrm.getX(i); b[1] += nrm.getY(i); b[2] += nrm.getZ(i); b[3].push(i);
      }
      map.forEach((b) => {
        if (b[3].length < 2) return;
        const l = Math.hypot(b[0], b[1], b[2]) || 1, nx = b[0] / l, ny = b[1] / l, nz = b[2] / l;
        for (const i of b[3]) nrm.setXYZ(i, nx, ny, nz);
      });
    }
    const lk = window.LINTEL_HOUSE;                                       // (a room in code puts the cushion's seam in its UV, see house-looks.js)
    return (lk && lk.pillowUv(g, cx, cy, mat, t, firm === true)) || FX.uvMetres(g);
  };
  // z is what it rests on, lean tips it back toward the north (0 stands, -1.4 lies almost flat), rot turns it
  const pillow = (bt, mat, cx, cy, z, w, h, t, lean, rot, firm, miter) =>
    bt.add(M[mat], pillowGeo(w, h, t, firm, cx, cy, mat, miter), FX.M(WX(cx), z + (h / 2) * Math.cos(lean || 0) + (t / 2) * Math.abs(Math.sin(lean || 0)), WZ(cy), lean || 0, rot || 0, 0, 1, 1, 1, 'YXZ'));
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
     w across the block, l along it, hang: how far it falls past [west, east, south, north]. */
  const drapeGeo = (w, l, r, hang, amp, puff, seed) => {
    const [hW, hE, hS, hN] = hang, U = w + hW + hE, V = l + hS + hN;
    const nu = Math.max(12, Math.ceil(U / 0.024)), nv = Math.max(12, Math.ceil(V / 0.024));
    const g = new THREE.PlaneGeometry(1, 1, nu, nv), p = g.attributes.position, uv = g.attributes.uv;
    const sm = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
    for (let iy = 0; iy <= nv; iy++) for (let ix = 0; ix <= nu; ix++) {
      const i = iy * (nu + 1) + ix, u = -(w / 2 + hW) + (ix / nu) * U, v = -(l / 2 + hN) + (iy / nv) * V;
      const dx = Math.max(0, Math.abs(u) - w / 2), dy = Math.max(0, Math.abs(v) - l / 2), e0 = Math.hypot(dx, dy);
      let e = e0;
      if (dx > 0 && dy > 0) { const hx = u < 0 ? hW : hE, hy = v < 0 ? hN : hS; e = Math.min(e0, hx > 0 && hy > 0 ? 1 / Math.hypot(dx / e0 / hx, dy / e0 / hy) : 0); }
      const a = Math.min(e / r, Math.PI / 2), out = r * Math.sin(a), down = r * (1 - Math.cos(a)) + Math.max(0, e - r * Math.PI / 2);
      const nx = e0 > 0 ? (dx / e0) * Math.sign(u) : 0, ny = e0 > 0 ? (dy / e0) * Math.sign(v) : 0;
      const along = u * Math.abs(ny) + v * Math.abs(nx);                                    // where you are along the edge it hangs from
      const fold = amp * sm((e - r * 0.45) / 0.20) * (0.42 + 1.15 * Math.min(1, down / 0.28)) * (0.55 * Math.sin(along * 7.8 + seed) + 0.32 * Math.sin(along * 17.5 + seed * 2.3) + 0.13 * Math.cos(along * 29.0 - seed));
      const baffle = puff * 0.38 * Math.abs(Math.cos(u * 7.1)) * Math.abs(Math.cos(v * 6.5));
      const top = (1 - sm(e / r)) * (puff * (0.55 * Math.sin(u * 4.8 + seed) * Math.sin(v * 4.1 + seed * 1.7) + 0.35 * Math.sin(u * 2.2 + v * 3.0 + seed)) + baffle);
      const hem = sm((e - r * 1.8) / 0.18) * 0.014 * Math.sin(along * 5.4 + seed * 3.1);
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
        float y = vUv.y, t = uTime * 1.15 + vSeed * 5.0;
        float sway = (fbm(vec2(y * 2.2 - t * 1.05, vSeed)) - 0.5) * 0.95 * y;
        float x = (vUv.x - 0.5) * 2.0 + sway;
        float w = pow(1.0 - y, 0.68) * (0.58 + 0.32 * fbm(vec2(vSeed * 3.1, t * 0.65)));
        float body = 1.0 - smoothstep(0.18, 1.0, abs(x) / max(w, 0.03));
        float SubTongue = 0.5 + 0.5 * sin(x * 9.5 + fbm(vec2(x * 2.4, y * 3.0 - t * 1.8)) * 4.2 + vSeed);
        float lick = fbm(vec2(x * 3.4 + vSeed * 2.0, y * 3.8 - t * 2.4)) * (0.75 + 0.25 * SubTongue);
        float f = body * smoothstep(0.18, 0.68, lick + (1.0 - y) * 0.74) * smoothstep(0.0, 0.05, y) * (1.0 - smoothstep(0.58, 1.0, y));
        float core = body * (1.0 - smoothstep(0.0, 0.42, abs(x))) * (1.0 - smoothstep(0.08, 0.52, y));
        vec3 col = mix(vec3(0.98, 0.20, 0.02), vec3(1.0, 0.76, 0.28), smoothstep(0.18, 0.82, f * (1.3 - y * 0.65)));
        col = mix(col, vec3(1.0, 0.96, 0.78), core * 0.65);
        gl_FragColor = vec4(col * f * 1.95, 1.0);
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
    // one slim wall light, right of the door (one each side until 14 Oct; Sam: "keep one, the right, the left you can remove")
    // (12 cm deep. At 7 cm the far edge of each was a step too small to outline from the path: a row of dashes that moved)
    // Iteration 8, Sam, 15 Oct: "double the height. Center vertically", and "clean on the edges", it felt blurry. 1.6 m
    // tall now (0.8 until then, from 1.5 m up), its middle at the middle of the door's height (my reading of "vertically").
    // Its line of light is set 3 mm into the frame instead of standing 6 mm proud of it, so the frame's lips cut it
    // cleanly, and it burns less hot than the house's other lamps (glowLine): at the lamps' heat the bloom ran over its edges.
    const LIGHT = { x: 16.55, zc: 4.2 / 2, h: 1.6 };
    M.sconceFrame = M.sconceFrame || D(P({ color: 0x2c241e, metalness: 0.85, roughness: 0.36, envMapIntensity: 1.0 }));
    M.glowLine = M.glowLine || D(P({ color: 0x2a2018, emissive: 0xffdcae, emissiveIntensity: 1.7, roughness: 1 }));
    {
      const x = LIGHT.x, z0 = LIGHT.zc - LIGHT.h / 2, z1 = LIGHT.zc + LIGHT.h / 2;
      box(B, 'sconceFrame', x - 0.032, 26.2, x + 0.032, 26.31, z0, z1, 0.002);                                // the brushed dark-bronze body
      [[x - 0.032, x - 0.011, z0, z1], [x + 0.011, x + 0.032, z0, z1], [x - 0.032, x + 0.032, z0, z0 + 0.055], [x - 0.032, x + 0.032, z1 - 0.055, z1]]
        .forEach(([a, b, c, e]) => box(B, 'sconceFrame', a, 26.308, b, 26.322, c, e, 0.0015));                // machined side bezels and top/bottom collars
      box(d, 'glowLine', x - 0.011, 26.305, x + 0.011, 26.318, z0 + 0.055, z1 - 0.055, 0.0005);               // the fluted warm alabaster diffuser
    }
    // The boulders: a weathered rock of their own (the dry-stone wall's stone until iteration 8, whose joints drew a net of
    // cracks over each one, like a tortoise's shell). Its scan stand-in is that stone, for ?code=none.
    // (and smooth: an icosphere's faces share no vertices, so its normals were the faces' own and each boulder a cut gem)
    const smoothed = (g) => {
      const p = g.attributes.position, pa = p.array, n = g.attributes.normal, na = n.array, acc = new Map(), ks = new Int32Array(p.count);
      for (let i = 0, c = p.count; i < c; i++) {
        const i3 = i * 3;
        const k = (Math.round(pa[i3] * 10000) * 73856093) ^ (Math.round(pa[i3 + 1] * 10000) * 19349663) ^ (Math.round(pa[i3 + 2] * 10000) * 83492791);
        ks[i] = k;
        let a = acc.get(k); if (!a) acc.set(k, (a = [0, 0, 0]));
        a[0] += na[i3]; a[1] += na[i3 + 1]; a[2] += na[i3 + 2];
      }
      for (let i = 0, c = p.count; i < c; i++) {
        const a = acc.get(ks[i]), l = Math.hypot(a[0], a[1], a[2]) || 1, i3 = i * 3;
        na[i3] = a[0] / l; na[i3 + 1] = a[1] / l; na[i3 + 2] = a[2] / l;
      }
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
    // sculptural multi-stem tropical Giant Bird of Paradise / Traveler's Palm (Strelitzia nicolai) in a stone planter on each side
    {
      M.strelLeaf = M.strelLeaf || D(P({ color: 0x2f5a26, roughness: 0.5, envMapIntensity: 0.6, side: THREE.DoubleSide }), { noRing: true });
      M.strelStem = M.strelStem || D(P({ color: 0x61765a, roughness: 0.55, envMapIntensity: 0.55 }), { noRing: true });
      const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
      const tropLeaf = (L, Wd, bow, fold, twist, seed, nSplit, age, sweep) => {
        const Rl = FX.rng(seed), NL = 40, NW = 16, pos = [], uv = [], idx = [];
        const uvOff = Math.round((age || 0) * 10) * 2.0, sw = sweep || 0;
        const splits = [];
        for (let k = 0; k < nSplit; k++) splits.push([Rl() < 0.5 ? -1 : 1, 0.32 + Rl() * 0.46, 0.40 + Rl() * 0.28]);
        const wa = 0.004 + Rl() * 0.0045, wp = Rl() * 6.28, wk = 20 + Rl() * 12;
        const baseCurve = (t) => (t < 0.18 ? 0.08 + 0.92 * Math.pow(Math.sin((t / 0.18) * Math.PI / 2), 0.72) : 1);
        const tipCurve = (t) => Math.pow(Math.max(0, 1 - Math.pow(Math.max(0, (t - 0.46) / 0.54), 1.85)), 0.68);
        const half = (t) => Wd * 0.5 * baseCurve(t) * tipCurve(t);
        for (let j = 0; j <= NL; j++) {
          const t = j / NL, hw0 = half(t), tw = (twist || 0) * t, ct = Math.cos(tw), st = Math.sin(tw), swX = sw * t * t * L;
          for (let i = 0; i <= NW; i++) {
            const sx = (i / NW) * 2 - 1, ax = Math.abs(sx), sgn = Math.sign(sx);
            let notch = 1.0, droop = 0.0;
            for (let s = 0; s < splits.length; s++) {
              const [sd, ts, dp] = splits[s];
              if (sgn === sd) {
                const tv = t - 0.14 * (1 - ax) - ts;
                const indent = Math.exp(-Math.pow(tv / 0.022, 2)) * sm(1 - dp, 1.0, ax);
                notch = Math.min(notch, 1 - dp * 0.74 * indent);
                if (tv > 0) droop += 0.013 * sm(0, 0.04, tv) * Math.pow(ax, 1.8);
              }
            }
            const hw = hw0 * notch, lx = sx * hw;
            const lz = fold * hw * (ax - 0.52 * ax * ax) + 0.005 * Math.exp(-Math.pow(sx / 0.065, 2)) * (1 - 0.7 * t)
                     + wa * Math.pow(ax, 1.8) * Math.sin(t * wk + wp + sx * 1.5) - droop;
            pos.push(swX + lx * ct - lz * st, t * L - bow * 0.22 * t * t * L, bow * Math.pow(t, 2.2) * L * 1.15 + lx * st + lz * ct);
            uv.push(i / NW, t + uvOff);
          }
        }
        for (let j = 0; j < NL; j++) for (let i = 0; i < NW; i++) {
          const k = j * (NW + 1) + i;
          idx.push(k, k + 1, k + NW + 1, k + 1, k + NW + 2, k + NW + 1);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
        g.computeVertexNormals();
        return g;
      };
      const curvedStalk = (pts, rads) => {
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i + 1];
          tleg(d, 'strelStem', [a.x + 30, a.z + 24, a.y], [b.x + 30, b.z + 24, b.y], rads[i], rads[i + 1]);
        }
      };
      const sheathGeo = new THREE.SphereGeometry(1, 14, 10);
      [[10.45, 27.72, 31, 1], [19.95, 27.85, 47, -1]].forEach(([x, y, sd, dir]) => thing(x, y, () => {
        lathe(B, 'travBlock', x, y, C, [[0, 0], [0.56, 0], [0.56, 0.04], [0.62, 0.055], [0.71, 0.28], [0.77, 0.52], [0.80, 0.64], [0.79, 0.67], [0.72, 0.67], [0.70, 0.60], [0, 0.60]]);
        cyl(d, 'soilDark', x, y, 0.58 + C, 0.61 + C, 0.71, 0.71, 40);
        const Rt = FX.rng(4100 + sd), up = new V3(0, 1, 0), soil = 0.605 + C;
        // fan oriented slightly south-inward toward the forecourt path so the tropical crowns frame both the door and wide views
        const az = dir * 0.24, camHoriz = new V3(Math.sin(az), 0, Math.cos(az)), fanRight = new V3(Math.cos(az), 0, -Math.sin(az));
        const trunks = [[-0.07 * dir, -0.08, 0.044], [0.16 * dir, 0.06, 0.037], [-0.18 * dir, 0.11, 0.033]];
        // Each trunk rises as a woody ringed pseudostem before its fan of petioles diverges
        trunks.forEach(([ox, oy, rBase], ti) => {
          const tb0 = new V3(WX(x) + fanRight.x * ox + camHoriz.x * oy, soil - 0.02, WZ(y) + fanRight.z * ox + camHoriz.z * oy);
          const leanX = (ti === 1 ? 0.14 * dir : ti === 2 ? -0.16 * dir : -0.03 * dir), leanZ = (ti === 0 ? -0.05 : 0.09);
          const th = ti === 0 ? 0.44 : ti === 1 ? 0.34 : 0.26;
          const tm = tb0.clone().addScaledVector(fanRight, leanX * 0.45).addScaledVector(camHoriz, leanZ * 0.45).addScaledVector(up, th * 0.5);
          const tt = tb0.clone().addScaledVector(fanRight, leanX).addScaledVector(camHoriz, leanZ).addScaledVector(up, th);
          curvedStalk([tb0, tm, tt], [rBase, rBase * 0.88, rBase * 0.76]);
        });
        const fronds = [
          // [s, fwd, tilt, Hs, L, Wd, bow, age, trunkIdx, roll]
          [-0.95 * dir,  0.28, 0.78, 0.58, 0.88, 0.28, -0.36, 0.84, 2,  0.14 * dir], // wide outer lower-arch frond draping over planter
          [-0.78 * dir, -0.18, 0.56, 0.88, 0.98, 0.31, -0.28, 0.46, 2,  0.10 * dir], // outer mid-high frond
          [-0.50 * dir,  0.48, 0.70, 0.66, 0.90, 0.29, -0.34, 0.68, 2,  0.12 * dir], // front-left arching paddle
          [-0.36 * dir, -0.12, 0.36, 1.12, 1.10, 0.34, -0.22, 0.22, 0,  0.08 * dir], // tall upper-crown left frond
          [-0.06 * dir,  0.72, 0.76, 0.54, 0.84, 0.27, -0.38, 0.90, 2,  0.06 * dir], // low front-draping frond toward camera
          [ 0.12 * dir, -0.10, 0.28, 1.24, 1.16, 0.36, -0.19, 0.10, 0, -0.06 * dir], // tallest hero crown frond
          [ 0.36 * dir,  0.54, 0.64, 0.74, 0.92, 0.30, -0.32, 0.56, 1, -0.10 * dir], // mid-front inner frond
          [ 0.56 * dir, -0.08, 0.42, 1.04, 1.04, 0.33, -0.24, 0.32, 1, -0.09 * dir], // upper-mid inner-path frond
          [ 0.82 * dir,  0.22, 0.62, 0.82, 0.98, 0.31, -0.30, 0.50, 1, -0.12 * dir], // mid-arch inner-path frond framing the door
          [ 0.98 * dir,  0.34, 0.80, 0.62, 0.90, 0.28, -0.36, 0.78, 1, -0.15 * dir], // far inner-path low arching frond reaching toward path
          [-0.22 * dir, -0.68, 0.58, 0.92, 0.96, 0.30, -0.28, 0.38, 0,  0.08 * dir], // rear-arching depth frond toward the concrete wall
        ];
        fronds.forEach(([s, fwd, tilt, Hs, L, Wd, bow, age, cl, roll], idx) => {
          const [ox, oy] = trunks[cl];
          const b0 = new V3(WX(x) + fanRight.x * ox + camHoriz.x * oy, soil + 0.16, WZ(y) + fanRight.z * ox + camHoriz.z * oy);
          const radH = new V3().addScaledVector(fanRight, s).addScaledVector(camHoriz, fwd).normalize();
          const t0 = tilt * 0.48, t1 = tilt * 0.82, tB = tilt * 1.02;
          const dir0 = new V3().addScaledVector(up, Math.cos(t0)).addScaledVector(radH, Math.sin(t0)).normalize();
          const dir1 = new V3().addScaledVector(up, Math.cos(t1)).addScaledVector(radH, Math.sin(t1)).normalize();
          const m1 = b0.clone().addScaledVector(dir0, Hs * 0.52);
          const top = m1.clone().addScaledVector(dir1, Hs * 0.50);
          const ly = new V3().addScaledVector(up, Math.cos(tB)).addScaledVector(radH, Math.sin(tB)).normalize();
          const lz0 = new V3().addScaledVector(up, Math.sin(tB)).addScaledVector(radH, -Math.cos(tB)).normalize();
          const lx0 = new V3().crossVectors(ly, lz0).normalize();
          const cr = Math.cos(roll), sr = Math.sin(roll);
          const lx = lx0.clone().multiplyScalar(cr).addScaledVector(lz0, sr).normalize();
          const lz = lz0.clone().multiplyScalar(cr).addScaledVector(lx0, -sr).normalize();
          const basis = new THREE.Matrix4().makeBasis(lx, ly, lz).setPosition(top.clone().addScaledVector(dir1, -0.02));
          const splits = age > 0.40 ? 1 + (age > 0.70 ? 1 : 0) : 0, sweep = -s * 0.12;
          const g = tropLeaf(L, Wd, bow, 0.44 + 0.08 * (1 - age), roll * 0.55, 5100 + sd * 13 + idx * 97 + ((Rt() * 99) | 0), splits, age, sweep).applyMatrix4(basis);
          const k1 = new V3(sweep * 0.078 * L, 0.28 * L - bow * 0.22 * 0.078 * L, bow * Math.pow(0.28, 2.2) * L * 1.15 - 0.005).applyMatrix4(basis);
          const k2 = new V3(sweep * 0.336 * L, 0.58 * L - bow * 0.22 * 0.336 * L, bow * Math.pow(0.58, 2.2) * L * 1.15 - 0.004).applyMatrix4(basis);
          curvedStalk([b0, m1, top, k1, k2], [0.024, 0.018, 0.013, 0.008, 0.0035]);
          { const xa = lx0.clone(), za = new V3().crossVectors(xa, dir0).normalize();
            d.add(M.strelStem, sheathGeo, new THREE.Matrix4().makeBasis(xa, dir0, za).scale(new V3(0.044, 0.22, 0.020)).setPosition(b0.clone().addScaledVector(dir0, 0.14))); }
          d.add(M.strelLeaf, g);
        });
        // 12th frond: one tall unfurling spear rising from the main trunk
        { const [ox, oy] = trunks[0], nb = new V3(WX(x) + fanRight.x * ox + camHoriz.x * oy, soil + 0.22, WZ(y) + fanRight.z * ox + camHoriz.z * oy), ntop = nb.clone().addScaledVector(up, 1.18).addScaledVector(fanRight, 0.06 * dir);
          tleg(d, 'strelStem', [nb.x + 30, nb.z + 24, nb.y], [ntop.x + 30, ntop.z + 24, ntop.y], 0.017, 0.011);
          const ly = new V3().addScaledVector(up, 0.992).addScaledVector(fanRight, 0.05 * dir).addScaledVector(camHoriz, 0.04).normalize();
          const lx = new V3().crossVectors(ly, camHoriz).normalize(), lz = new V3().crossVectors(lx, ly).normalize();
          d.add(M.strelLeaf, tropLeaf(0.72, 0.075, -0.03, 1.45, 0.26 * dir, 5900 + sd, 0, 0.0, 0).applyMatrix4(new THREE.Matrix4().makeBasis(lx, ly, lz).setPosition(ntop.clone().addScaledVector(up, -0.03)))); }
      }, 0.6 + C));
    }
    // The arrival court. From above it was "a blank slab" of gravel, and the garage an empty box. Now bands of the
    // path's stone cross the gravel every 2.6 m, three young olives stand in stone rings east of the path, and three
    // cars are in the garage (decor: on the drawing they are the plan's own car symbols).
    // (flat sheets of paving, level with the path. As slabs with bevelled edges they stood on the plan as rows of faint ticks.)
    // (in the path's limestone since 13 Oct, and down in the gravel with it: 12 mm over the chippings, as they were)
    [34.0, 36.6, 39.2, 41.6].forEach((y) => { A.ground(M.pathSlab, -0.6, y - 0.22, 13.3, y + 0.22, C + 0.012); A.ground(M.pathSlab, 16.7, y - 0.22, 22.7, y + 0.22, C + 0.012); });
    [[21.3, 37.95, 67]].forEach(([x, y, sd]) => {
      // (single taller specimen olive in the arrival court; the ring stands 16 cm out of the gravel)
      B.add(M.travBlock, new THREE.CylinderGeometry(0.90, 0.90, 0.2 - C, 44, 1, true), FX.M(WX(x), 0.06 + C / 2, WZ(y))); B.add(M.travBlock, new THREE.RingGeometry(0.70, 0.90, 44), FX.M(WX(x), 0.16, WZ(y), -Math.PI / 2, 0, 0));
      tree(olive(A.extBark, M.bark, x, y, 0.86, sd, A.LOW ? 1200 : 3800, 0.0, null, 0.43), 'ext'); A.crowns.push([x, y, 0.86, 0.0]);      // (dark bark and a dense taller crown)
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
    // Group the console carcass, drawers, top slab, and hardware as one unified furniture piece
    thing(11.43, 19.1, () => {
      // 1. Recessed matte-black plinth base with warm brushed-brass top shadow trim
      box(B, 'black', 11.19, 17.95, 11.65, 20.25, 0, 0.075, 0.004);
      box(d, 'brass', 11.185, 17.945, 11.655, 20.255, 0.075, 0.082, 0.002);
      // 2. Deep espresso-smoked outer carcass & perimeter frame stiles with a recessed matte-black shadow plate behind the 6 drawers
      box(B, 'oakConsole', 11.15, 17.9, 11.688, 20.3, 0.082, 0.848, 0.008);
      box(d, 'black', 11.682, 17.932, 11.696, 20.268, 0.112, 0.818, 0.002);
      // protruding outer mitered case frame stiles & rails around the drawer bank
      box(d, 'oakConsole', 11.686, 17.9, 11.706, 20.3, 0.082, 0.116, 0.003);
      box(d, 'oakConsole', 11.686, 17.9, 11.706, 20.3, 0.814, 0.848, 0.003);
      box(d, 'oakConsole', 11.686, 17.9, 11.706, 17.936, 0.112, 0.818, 0.003);
      box(d, 'oakConsole', 11.686, 20.264, 11.706, 20.3, 0.112, 0.818, 0.003);
      // 3. Brushed-brass shadow collar & inset chamfered dark marble top slab (marbleNero)
      box(d, 'brass', 11.154, 17.904, 11.702, 20.296, 0.848, 0.854, 0.002);
      box(B, 'marbleNero', 11.15, 17.9, 11.708, 20.3, 0.854, 0.876, 0.005);
      // 4. Six warm figured quarter-sawn oak drawer fronts with two-tone dark-bronze backplates & brushed-brass pulls
      const cw = (2.4 - 0.08) / 3;
      for (let c = 0; c < 3; c++) for (let r = 0; r < 2; r++) {
        const y0 = 17.94 + c * cw + 0.006, y1 = y0 + cw - 0.012, z0 = r ? 0.474 : 0.122, z1 = r ? 0.810 : 0.458;
        const ym = (y0 + y1) / 2, zp = z1 - 0.064;
        box(d, 'oakConsole', 11.696, y0, 11.714, y1, z0, z1, 0.0035);
        // recessed dark-bronze escutcheon backplate
        box(d, 'sconceFrame', 11.712, ym - 0.155, 11.718, ym + 0.155, zp - 0.011, zp + 0.011, 0.002);
        // dark-bronze standoffs & warm brushed-brass bar pull with protruding end finials
        [-0.115, 0.115].forEach((o) => box(d, 'sconceFrame', 11.714, ym + o - 0.006, 11.726, ym + o + 0.006, zp - 0.005, zp + 0.005, 0.0015));
        box(d, 'brass', 11.724, ym - 0.145, 11.735, ym + 0.145, zp - 0.006, zp + 0.006, 0.0025);
      }
    });
    // keep the shared random number stream in step
    sprigs(tagged(new FX.Batch()), 11.55, 20.1, 1.6, 1.25, 9);
    books(tagged(new FX.Batch()), 11.43, 19.25, 0.86, 3, 1.5);
    // 5. Super-detailed gallery accessories on the console top (zTop = 0.876), tagged at (11.43, 19.1) so they scan in lockstep with the console
    const zC = 0.876;
    // (a) South end (y = 19.92): Sculptural Alabaster, Honed Travertine & Machined Bronze Table Lamp
    thing(11.43, 19.1, () => {
      const lx = 11.42, ly = 19.92;
      // stepped honed travertine pedestal base with brushed-brass foot & neck rings
      cyl(d, 'brass', lx, ly, zC, zC + 0.010, 0.106, 0.108, 32);
      lathe(d, 'travBlock', lx, ly, zC + 0.010, [[0, 0], [0.104, 0], [0.104, 0.042], [0.092, 0.056], [0.062, 0.062], [0, 0.062]]);
      cyl(d, 'brass', lx, ly, zC + 0.070, zC + 0.082, 0.064, 0.060, 32);
      cyl(d, 'sconceFrame', lx, ly, zC + 0.082, zC + 0.102, 0.048, 0.048, 28);
      // fluted warm-alabaster glowing diffuser column
      cyl(d, 'glowLine', lx, ly, zC + 0.102, zC + 0.355, 0.078, 0.074, 36);
      // four slender vertical dark-bronze cage ribs framing the alabaster column
      for (let k = 0; k < 4; k++) {
        const a = (k + 0.5) * (Math.PI / 2), rx = lx + Math.cos(a) * 0.081, ry = ly + Math.sin(a) * 0.081;
        cyl(d, 'sconceFrame', rx, ry, zC + 0.098, zC + 0.358, 0.0032, 0.0032, 10);
      }
      // spun-brass & dark-bronze tiered saucer reflector cap with top finial knob
      cyl(d, 'brass', lx, ly, zC + 0.352, zC + 0.362, 0.086, 0.084, 36);
      lathe(d, 'sconceFrame', lx, ly, zC + 0.358, [[0, 0], [0.134, 0.004], [0.136, 0.012], [0.095, 0.032], [0.032, 0.044], [0, 0.046]]);
      cyl(d, 'brass', lx, ly, zC + 0.402, zC + 0.422, 0.014, 0.011, 20);
    });
    lamp('entrance', 11.55, 19.92, 1.15, 0xffc98a, 1.15, 4.5);
    // (b) Center (y = 19.12): Blackened-bronze gallery tray, two monograph stacks, interlocking cast-bronze sculpture & reed diffuser
    thing(11.43, 19.1, () => {
      // blackened-bronze tray with brushed-brass rim rails
      box(d, 'sconceFrame', 11.24, 18.80, 11.62, 19.44, zC, zC + 0.010, 0.002);
      box(d, 'brass', 11.24, 18.80, 11.62, 18.808, zC + 0.008, zC + 0.016, 0.0015);
      box(d, 'brass', 11.24, 19.432, 11.62, 19.44, zC + 0.008, zC + 0.016, 0.0015);
      box(d, 'brass', 11.24, 18.80, 11.248, 19.44, zC + 0.008, zC + 0.016, 0.0015);
      box(d, 'brass', 11.612, 18.80, 11.62, 19.44, zC + 0.008, zC + 0.016, 0.0015);
      const zT = zC + 0.010;
      // Primary stack of three large-format cloth-bound art monographs with recessed cream paper blocks (stoneW)
      const bks = [
        ['mocha', 0.28, 0.34, 0.030, 0.04],
        ['bk4',   0.25, 0.30, 0.026, -0.05],
        ['bk1',   0.22, 0.26, 0.024, 0.03],
      ];
      let zb = zT;
      bks.forEach(([mat, w, l, h, rot]) => {
        rbox(d, mat, 11.43, 19.18, zb, zb + h, w, l, 0.003, rot);
        rbox(d, 'stoneW', 11.435, 19.18, zb + 0.0035, zb + h - 0.0035, w - 0.014, l - 0.014, 0.001, rot);
        zb += h;
      });
      // Sculptural cast-bronze interlocking ring & orb on a chamfered honed-travertine plinth block atop the monographs
      rbox(d, 'travBlock', 11.43, 19.18, zb, zb + 0.022, 0.13, 0.15, 0.003, 0.04);
      d.add(M.sculptBronze, new THREE.TorusGeometry(0.052, 0.012, 18, 40), FX.M(WX(11.43), zb + 0.072, WZ(19.16), 0.12, 0.38, 0));
      d.add(M.sculptDark, new THREE.TorusGeometry(0.036, 0.009, 16, 36), FX.M(WX(11.44), zb + 0.054, WZ(19.20), 1.15, -0.4, 0.2));
      ball(d, 'brass', 11.41, 19.22, zb + 0.044, 0.022);
      // Secondary beside-stack object on the tray (y = 18.93): turned smoked-ceramic scent bottle with brass neck & 5 dark reeds
      lathe(d, 'inkObj', 11.43, 18.92, zT, [[0, 0], [0.038, 0], [0.048, 0.028], [0.044, 0.078], [0.018, 0.105], [0.018, 0.118]]);
      cyl(d, 'brass', 11.43, 18.92, zT + 0.104, zT + 0.124, 0.020, 0.019, 20);
      [[-0.22, -0.18, 0.22], [0.18, -0.24, 0.24], [-0.14, 0.20, 0.23], [0.24, 0.16, 0.21], [0.02, 0.04, 0.25]].forEach(([dx, dy, rh]) => {
        rod(d, 'twigDark', [11.43 + dx * 0.015, 18.92 + dy * 0.015, zT + 0.09], [11.43 + dx * 0.16, 18.92 + dy * 0.16, zT + rh], 0.0018);
      });
    });
    // (c) North end (y = 18.30): Footed carved blackened-stoneware centerpiece vessel holding organic travertine & bronze stones
    thing(11.43, 19.1, () => {
      const bx = 11.43, by = 18.30;
      cyl(d, 'brass', bx, by, zC, zC + 0.012, 0.095, 0.102, 32);
      lathe(d, 'inkObj', bx, by, zC + 0.010, [
        [0, 0], [0.098, 0], [0.155, 0.022], [0.210, 0.058], [0.228, 0.095], [0.224, 0.112],
        [0.206, 0.112], [0.188, 0.078], [0.125, 0.038], [0, 0.028]
      ]);
      // organic river stones & cast-bronze pebbles nested inside the bowl
      ball(d, 'travBlock', bx - 0.035, by - 0.028, zC + 0.062, 0.048, 0.58, 1.15, 0.92);
      ball(d, 'quartz', bx + 0.042, by + 0.024, zC + 0.060, 0.042, 0.55, 0.95, 1.18);
      ball(d, 'stoneW', bx - 0.012, by + 0.048, zC + 0.058, 0.034, 0.62, 1.08, 0.88);
      ball(d, 'sculptBronze', bx + 0.018, by - 0.032, zC + 0.074, 0.028, 0.72, 1.10, 0.94);
      ball(d, 'brass', bx - 0.008, by + 0.004, zC + 0.078, 0.020);
    });
    // a tall urn with dry branches by the door
    vase(B, 'inkObj', 12.5, 24.9, 0, 1.9, URN); branches(d, 12.5, 24.9, 1.2, 1.9, 8);
    // Either side of the opening to the living room, on the two piers of wall: a pair of museum-grade smoked bronze-umber &
    // charcoal ceramic amphora floor urns with horizontal wheel-thrown fluting, a recessed blackened stoneware pedestal foot,
    // and a lush architectural botanical arrangement (gnarled dark-wood boughs arching toward the portal, glossy olive &
    // velvety cinnamon-russet Magnolia grandiflora foliage, preserved silver-sage Eucalyptus cinerea sprigs, and warm ivory buds).
    M.stoneware = M.stoneware || D(P({ color: 0x221a14, roughness: 0.28, envMapIntensity: 0.72 }));
    M.twigDark = M.twigDark || D(P({ color: 0x2b1f16, roughness: 0.76 }), { noRing: true });
    M.urnLeaf = M.urnLeaf || D(P({ color: 0x2c3d24, roughness: 0.36, envMapIntensity: 0.55, side: THREE.DoubleSide }), { noRing: true });

    // Sculptural ovoid amphora urn geometry matching ref_entrance_vases: crisp recessed pedestal foot (0..0.082 m, r = 0.162 m),
    // generous rounded spline belly swelling to r = 0.295 m (59 cm diameter) at h = 0.46 m, turned shoulder collar ring at h = 0.765 m,
    // short concave neck (r = 0.148 m), and thick rolled gallery lip (r = 0.172 m) at h = 0.88 m
    const urnFootPts = [
      new THREE.Vector2(0, 0), new THREE.Vector2(0.154, 0), new THREE.Vector2(0.160, 0.012),
      new THREE.Vector2(0.164, 0.068), new THREE.Vector2(0.156, 0.078), new THREE.Vector2(0.174, 0.086)
    ];
    const urnBellyPts = new THREE.SplineCurve([
      [0.174, 0.086], [0.228, 0.17], [0.274, 0.29], [0.295, 0.43],
      [0.292, 0.55], [0.262, 0.66], [0.214, 0.735], [0.190, 0.758]
    ].map(([r, h]) => new THREE.Vector2(r, h))).getPoints(28);
    const urnNeckPts = [
      new THREE.Vector2(0.198, 0.765), new THREE.Vector2(0.194, 0.774), new THREE.Vector2(0.168, 0.786),
      new THREE.Vector2(0.148, 0.812), new THREE.Vector2(0.148, 0.844), new THREE.Vector2(0.168, 0.864),
      new THREE.Vector2(0.172, 0.876), new THREE.Vector2(0.160, 0.882), new THREE.Vector2(0.138, 0.872),
      new THREE.Vector2(0.126, 0.780), new THREE.Vector2(0, 0.770)
    ];
    const urnGeo = new THREE.LatheGeometry([...urnFootPts, ...urnBellyPts.slice(1), ...urnNeckPts], 56);
    urnGeo.computeVertexNormals();

    // 3D cupped botanical blade geometry (species encoded in uv.y = t + species * 2.0)
    const mkUrnBlade = (L, W, cup, bow, sp, roundShape, seed) => {
      const Rl = FX.rng(seed), NL = 14, NW = 8, pos = [], uv = [], idx = [];
      const tw = (Rl() - 0.5) * 0.28, wa = 0.0012 + Rl() * 0.0015, wp = Rl() * 6.28;
      for (let j = 0; j <= NL; j++) {
        const t = j / NL;
        // roundShape (eucalyptus coin leaf) vs pointed elliptic-ovate (magnolia leaf / blossom petal)
        const prof = roundShape
          ? Math.pow(Math.sin(t * Math.PI), 0.62) * (0.85 + 0.15 * (1 - t))
          : Math.sin(t * Math.PI) * (t < 0.5 ? 0.82 + 0.36 * t : 1.0 - 0.18 * (t - 0.5));
        const hw = W * 0.5 * Math.max(0, prof), ct = Math.cos(tw * t), st = Math.sin(tw * t);
        for (let i = 0; i <= NW; i++) {
          const sx = (i / NW) * 2 - 1, ax = Math.abs(sx), lx = sx * hw;
          const lz = cup * hw * Math.pow(ax, 1.35) + wa * ax * Math.sin(t * 9.0 + wp) - bow * t * t * L;
          pos.push(lx * ct - lz * st, t * L * (1 - 0.18 * bow * t), lx * st + lz * ct);
          uv.push(i / NW, t + sp * 2.0);
        }
      }
      for (let j = 0; j < NL; j++) for (let i = 0; i < NW; i++) {
        const k = j * (NW + 1) + i;
        idx.push(k, k + 1, k + NW + 1, k + 1, k + NW + 2, k + NW + 1);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    };
    const magBlades = [
      mkUrnBlade(0.185, 0.082, 0.28, 0.22, 0, false, 701),
      mkUrnBlade(0.155, 0.070, 0.32, 0.18, 0, false, 702),
      mkUrnBlade(0.175, 0.076, 0.30, 0.24, 1, false, 703),
      mkUrnBlade(0.145, 0.064, 0.26, 0.16, 1, false, 704),
    ];
    const eucBlades = [
      mkUrnBlade(0.068, 0.054, 0.34, 0.15, 2, true, 705),
      mkUrnBlade(0.054, 0.045, 0.30, 0.12, 2, true, 706),
    ];
    const budPetal = mkUrnBlade(0.050, 0.023, 0.65, -0.18, 3, false, 707);

    const placeBlade = (bg, p, dirVec, roll, scale) => {
      const ly = dirVec.clone().normalize();
      const ref = Math.abs(ly.y) > 0.9 ? new V3(1, 0, 0) : new V3(0, 1, 0);
      const lx = new V3().crossVectors(ly, ref).normalize().applyAxisAngle(ly, roll);
      const lz = new V3().crossVectors(lx, ly).normalize();
      const m = new THREE.Matrix4().makeBasis(lx, ly, lz).scale(new V3(scale, scale, scale)).setPosition(new V3(WX(p[0]), p[2], WZ(p[1])));
      d.add(M.urnLeaf, bg.clone().applyMatrix4(m));
    };
    const placeBud = (p, dirVec, scale) => {
      const ly = dirVec.clone().normalize();
      const q = [p[0] + ly.x * 0.012, p[1] + ly.z * 0.012, p[2] + ly.y * 0.012];
      tleg(d, 'twigDark', p, q, 0.0042 * scale, 0.0060 * scale);
      for (let k = 0; k < 3; k++) {
        const ang = k * 2.094 + 0.4;
        const pDir = ly.clone().add(new V3(Math.cos(ang) * 0.22, 0.15, Math.sin(ang) * 0.22)).normalize();
        placeBlade(budPetal, q, pDir, ang, scale);
      }
    };

    // Helper to place a rosette cluster of 3 overlapping magnolia blades around a stem node
    const placeRosette = (nodePt, stemDir, Rv, scaleBase, russetChance) => {
      const baseAz = Math.atan2(stemDir.z, stemDir.x);
      for (let k = 0; k < 3; k++) {
        const lAz = baseAz + (k - 1) * (0.68 + (Rv() - 0.5) * 0.22);
        // Arching outward pitch (0.05..0.48 rad) so the upper leaf surface faces upward and toward the viewer
        const lPitch = 0.06 + k * 0.16 + (Rv() - 0.5) * 0.14;
        const lDir = new V3(Math.cos(lAz) * Math.cos(lPitch), Math.sin(lPitch), Math.sin(lAz) * Math.cos(lPitch));
        const isRusset = Rv() < russetChance;
        const bIdx = isRusset ? 2 + ((Rv() * 2) | 0) : (Rv() * 2) | 0;
        placeBlade(magBlades[bIdx], nodePt, lDir, (Rv() - 0.5) * 0.48, scaleBase * (0.86 + Rv() * 0.26));
      }
    };

    [[11.73, 17.48, 3101], [18.27, 17.48, 3107]].forEach(([x, y, seed]) => thing(x, y, () => {
      B.add(M.stoneware, urnGeo, FX.M(WX(x), 0, WZ(y)));
      cyl(B, 'soilDark', x, y, 0.77, 0.84, 0.124, 0.124, 32);
      const Rv = FX.rng(seed), top = 0.86, inSign = x < 15 ? 1 : -1;

      // 1. Six gnarled, S-curved dark-wood boughs weaving upward and arching into a balanced, rounded botanical crown
      // framed cleanly against the white pier (without poking across the portal opening)
      const boughSpecs = [
        // [azDir, upStart, len, r0, r1, archRate, spreadY]
        [0.18,  1.46, 0.86, 0.015, 0.0030, 0.16,  0.04],  // Inner-portal canopy bough (compact arch)
        [-0.45, 1.50, 0.92, 0.015, 0.0030, 0.14, -0.04],  // Tall central-inner crown bough
        [2.65,  1.44, 0.88, 0.014, 0.0028, 0.16,  0.05],  // Outer counter-balancing canopy bough
        [-2.35, 1.48, 0.84, 0.014, 0.0028, 0.15,  0.08],  // High outer-front crown bough
        [0.85,  1.38, 0.76, 0.013, 0.0026, 0.17,  0.14],  // Mid-level forward-inner bough
        [1.95,  1.40, 0.74, 0.012, 0.0026, 0.17,  0.14],  // Mid-level forward-outer bough
      ];

      boughSpecs.forEach(([azOff, up0, len, r0, r1, archRate, spY], bi) => {
        const baseAz = (inSign > 0 ? 0 : Math.PI) + azOff * inSign;
        const ox = Math.cos(baseAz) * 0.038, oy = Math.sin(baseAz) * 0.032 + spY * 0.05;
        let q = [x + ox, y + oy, top - 0.04];
        const mStart = [x + ox * 1.2, y + oy * 1.2, top + 0.04];
        tleg(d, 'twigDark', q, mStart, r0 * 1.08, r0);
        q = mStart;
        const segs = 8;
        let curAz = baseAz, curUp = up0;
        for (let s = 0; s < segs; s++) {
          const f = s / segs;
          // Organic gnarled crook per segment while bending smoothly into an umbrella arch
          curAz += ((s + bi) % 2 === 0 ? 1 : -1) * (0.16 + Rv() * 0.14);
          const bend = s < 2 ? 0.06 : archRate * (0.95 + 0.45 * f);
          curUp = Math.max(-0.08, curUp - bend + (Rv() - 0.5) * 0.10);
          const stepL = (len / segs) * (1.04 - 0.12 * f);
          const dx = Math.cos(curAz) * Math.cos(curUp) * stepL;
          const dy = (Math.sin(curAz) * Math.cos(curUp) * 0.62 + spY * 0.14) * stepL;
          const dz = Math.sin(curUp) * stepL;
          const nq = [q[0] + dx, q[1] + dy, q[2] + dz];
          const rad0 = r0 + (r1 - r0) * (s / segs), rad1 = r0 + (r1 - r0) * ((s + 1) / segs);
          tleg(d, 'twigDark', q, nq, rad0, rad1);
          const stemDir = new V3(dx, dz, dy).normalize();
          q = nq;

          // Forked secondary gnarled twigs with lush 3-leaf magnolia rosettes
          if (s >= 1 && s <= 6) {
            const side = (s % 2 ? 1 : -1) * (0.55 + Rv() * 0.35);
            let fq = q.slice(), fAz = curAz + side, fUp = Math.max(-0.14, curUp - 0.20 + (Rv() - 0.5) * 0.18);
            const fLen = (0.17 + Rv() * 0.12) * (1 - f * 0.25), fSegs = 3;
            for (let fs = 0; fs < fSegs; fs++) {
              fAz += (Rv() - 0.5) * 0.30; fUp += (Rv() - 0.55) * 0.18;
              const fl = fLen / fSegs;
              const fnq = [
                fq[0] + Math.cos(fAz) * Math.cos(fUp) * fl,
                fq[1] + Math.sin(fAz) * Math.cos(fUp) * fl * 0.62,
                fq[2] + Math.sin(fUp) * fl
              ];
              tleg(d, 'twigDark', fq, fnq, rad1 * (0.76 - fs * 0.16), rad1 * (0.60 - fs * 0.16));
              if (fs >= 1) {
                const fDir = new V3(fnq[0] - fq[0], fnq[2] - fq[2], fnq[1] - fq[1]).normalize();
                placeRosette(fnq, fDir, Rv, 0.78 + (1 - f) * 0.22, 0.24);
                if (fs === 2 && (s + bi) % 2 === 0) {
                  placeBud(fnq, new V3(fDir.x * 0.35, 0.88, fDir.z * 0.35), 0.78 + Rv() * 0.20);
                }
              }
              fq = fnq;
            }
          }
          // Rosette clusters directly on the main bough nodes
          if (s >= 2 && s % 2 === 0) {
            placeRosette(q, stemDir, Rv, 0.82 + (1 - f) * 0.20, 0.22);
          }
        }
      });

      // 2. Lush lower & mid dome of curved, multi-segment botanical stems carrying overlapping 3-leaf magnolia rosettes
      // (replaces straight radial sticks with organic arching sprays that fill the urn mouth and mid-crown)
      for (let m = 0; m < 16; m++) {
        const tier = m / 16;
        const az = (m * 2.39996) + (Rv() - 0.5) * 0.24;
        let sq = [x + Math.cos(az) * 0.055, y + Math.sin(az) * 0.055, top - 0.01];
        let sUp = 0.65 + tier * 0.48, sAz = az;
        const sLen = 0.22 + tier * 0.18;
        for (let st = 0; st < 3; st++) {
          sUp -= 0.18 + (Rv() - 0.5) * 0.08;
          sAz += (Rv() - 0.5) * 0.22;
          const sl = sLen / 3;
          const snq = [
            sq[0] + Math.cos(sAz) * Math.cos(sUp) * sl,
            sq[1] + Math.sin(sAz) * Math.cos(sUp) * sl * 0.82,
            sq[2] + Math.sin(sUp) * sl
          ];
          tleg(d, 'twigDark', sq, snq, 0.0052 * (1 - st * 0.22), 0.0038 * (1 - st * 0.22));
          if (st >= 1) {
            const sDir = new V3(snq[0] - sq[0], snq[2] - sq[2], snq[1] - sq[1]).normalize();
            placeRosette(snq, sDir, Rv, 0.88 + (1 - st * 0.15) * 0.18, 0.26);
            if (st === 2 && m % 3 === 0) {
              placeBud([snq[0], snq[1], snq[2] + 0.02], new V3(sDir.x * 0.3, 0.88, sDir.z * 0.3), 0.80 + Rv() * 0.20);
            }
          }
          sq = snq;
        }
      }

      // 3. Cascading collar of preserved glaucous silver-sage Eucalyptus cinerea sprigs around the urn mouth
      for (let e = 0; e < 12; e++) {
        const eAz = (e / 12) * Math.PI * 2 + (Rv() - 0.5) * 0.25;
        const eUp = 0.18 + (e % 3) * 0.20 + (Rv() - 0.5) * 0.12;
        let eq = [x + Math.cos(eAz) * 0.082, y + Math.sin(eAz) * 0.082, top + 0.01];
        const eSteps = 6, eLen = 0.25 + Rv() * 0.10;
        for (let es = 0; es < eSteps; es++) {
          const ef = es / eSteps;
          const curEl = eUp - ef * 0.46; // arches gracefully outward and drapes over the rolled lip
          const step = eLen / eSteps;
          const enq = [
            eq[0] + Math.cos(eAz) * Math.cos(curEl) * step,
            eq[1] + Math.sin(eAz) * Math.cos(curEl) * step * 0.85,
            eq[2] + Math.sin(curEl) * step
          ];
          tleg(d, 'twigDark', eq, enq, 0.0030 * (1 - ef * 0.5), 0.0020 * (1 - ef * 0.5));
          const sDir = new V3(enq[0] - eq[0], enq[2] - eq[2], enq[1] - eq[1]).normalize();
          const sideVec = new V3(-sDir.z, 0, sDir.x).normalize();
          [-1, 1].forEach((sSign) => {
            const lDir = sDir.clone().multiplyScalar(0.62).addScaledVector(sideVec, sSign * 0.78).add(new V3(0, 0.22, 0));
            placeBlade(eucBlades[(es + e) % 2], enq, lDir, sSign * 0.32 + (Rv() - 0.5) * 0.35, 0.80 + (1 - ef * 0.32) * 0.32);
          });
          eq = enq;
        }
      }
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
    // Modular U-shaped conversation pit sofa: outer bounds x = 12.05..17.95, y = 10.55..14.95.
    // A 13 cm upholstered perimeter bolster rail frames the pit on three sides, and every module (base block, seat cushion,
    // and backrest cushion) shares one 82.5 cm square modular grid: two 0.82 x 0.82 m corner modules with 45-degree mitered
    // backrest pairs, six 0.825 x 0.82 m modules along north and south, and three 0.833 x 0.82 m modules along west.
    box(B, 'black', 12.1, 10.6, 17.9, 11.45, -0.45, -0.385, 0.004);
    box(B, 'black', 12.1, 11.45, 12.95, 14.05, -0.45, -0.385, 0.004);
    box(B, 'black', 12.1, 14.05, 17.9, 14.9, -0.45, -0.385, 0.004);
    // perimeter upholstered bolster rail along the north, west, and south pit walls
    box(B, 'sofaWool', 12.05, 10.55, 17.95, 10.68, -0.385, 0.35, 0.024);
    box(B, 'sofaWool', 12.05, 10.68, 12.18, 14.82, -0.385, 0.35, 0.024);
    box(B, 'sofaWool', 12.05, 14.82, 17.95, 14.95, -0.385, 0.35, 0.024);
    const Z_SEAT = -0.21, T_SEAT = 0.195, Z_BACK = -0.035, H_BACK = 0.49, T_BACK = 0.22, LEAN_BACK = -0.15;
    // two square corner modules (NW at 12.18..13.00, 10.68..11.50 and SW at 12.18..13.00, 14.00..14.82)
    box(B, 'sofaWool', 12.18, 10.68, 12.996, 11.496, -0.385, -0.205, 0.018);
    box(B, 'sofaWool', 12.18, 14.004, 12.996, 14.82, -0.385, -0.205, 0.018);
    pillow(B, 'sofaWool', 12.59, 11.09, Z_SEAT, 0.812, 0.812, T_SEAT, -Math.PI / 2, 0, true);
    pillow(B, 'sofaWool', 12.59, 14.41, Z_SEAT, 0.812, 0.812, T_SEAT, -Math.PI / 2, 0, true);
    // 45-degree mitered corner backrest cushions whose outer edges land on the exact x = 13.00 and y = 11.50 / 14.00 module seams
    pillow(d, 'sofaWool', 12.59, 10.8, Z_BACK, 0.812, H_BACK, T_BACK, LEAN_BACK, 0, true, -1);
    pillow(d, 'sofaWool', 12.3, 11.09, Z_BACK, 0.812, H_BACK, T_BACK, LEAN_BACK, Math.PI / 2, true, 1);
    pillow(d, 'sofaWool', 12.59, 14.7, Z_BACK, 0.812, H_BACK, T_BACK, LEAN_BACK, Math.PI, true, 1);
    pillow(d, 'sofaWool', 12.3, 14.41, Z_BACK, 0.812, H_BACK, T_BACK, LEAN_BACK, Math.PI / 2, true, -1);
    // six equal 0.825 m modules along the north and south runs (x = 13.00..17.95), each with its own matched base, seat, and back cushion
    const wNS = (17.95 - 13.0) / 6;
    for (let i = 0; i < 6; i++) {
      const x0 = 13.0 + i * wNS, cx = x0 + 0.5 * wNS, cw = wNS - 0.008;
      box(B, 'sofaWool', x0 + 0.004, 10.68, x0 + wNS - 0.004, 11.5, -0.385, -0.205, 0.018);
      pillow(B, 'sofaWool', cx, 11.09, Z_SEAT, cw, 0.812, T_SEAT, -Math.PI / 2, 0, true);
      pillow(d, 'sofaWool', cx, 10.8, Z_BACK, cw, H_BACK, T_BACK, LEAN_BACK, 0, true);
      box(B, 'sofaWool', x0 + 0.004, 14.0, x0 + wNS - 0.004, 14.82, -0.385, -0.205, 0.018);
      pillow(B, 'sofaWool', cx, 14.41, Z_SEAT, cw, 0.812, T_SEAT, -Math.PI / 2, Math.PI, true);
      pillow(d, 'sofaWool', cx, 14.7, Z_BACK, cw, H_BACK, T_BACK, LEAN_BACK, Math.PI, true);
    }
    // three equal 0.833 m modules along the west run (y = 11.50..14.00), each with its own matched base, seat, and back cushion
    const wW = (14.0 - 11.5) / 3;
    for (let i = 0; i < 3; i++) {
      const y0 = 11.5 + i * wW, cy = y0 + 0.5 * wW, cw = wW - 0.008;
      box(B, 'sofaWool', 12.18, y0 + 0.004, 13.0, y0 + wW - 0.004, -0.385, -0.205, 0.018);
      pillow(B, 'sofaWool', 12.59, cy, Z_SEAT, cw, 0.812, T_SEAT, -Math.PI / 2, Math.PI / 2, true);
      pillow(d, 'sofaWool', 12.3, cy, Z_BACK, cw, H_BACK, T_BACK, LEAN_BACK, Math.PI / 2, true);
    }
    // Staged scatter cushions: a paired ivory + terracotta set at each end of the north and south runs (seated cleanly in front of
    // the backrest cushions at y = 11.06 / 14.44 and spaced onto adjacent modules so no pillow clips into the backrest or overlaps another),
    // and a terracotta lumbar centered on the middle west module
    const PAIR = [
      [13.38, 0.00, 'linenW', 0.46, 0.43, 0.13, -0.17,  0.04],
      [14.08, 0.01, 'rust',   0.42, 0.38, 0.12, -0.18, -0.04],
    ];
    [[1, 11.06, 0], [-1, 14.44, Math.PI]].forEach(([sgn, y, turn]) => [0, 1].forEach((end) => PAIR.forEach(([x, dy, m, w, h, t, lean, a]) => {
      const xx = end ? 13.0 + 17.95 - x : x;
      const yy = y + sgn * dy;
      pillow(d, m, xx, yy, -0.015, w, h, t, lean, turn + (end ? -a : a) * sgn, false);
    })));
    pillow(d, 'rust', 12.56, 12.75, -0.015, 0.56, 0.31, 0.13, -0.18, Math.PI / 2, false);
    });
    thing(15.4, 12.75, () => {
    // the low table: one monolithic block of Roman vein-cut travertine on a recessed dark shadow plinth, styled with a
    // blackened-bronze tray (holding a carved stone bowl, brass sphere, and travertine vessel with branching twigs) and
    // three staggered stacks of cloth-bound art monographs with a sculptural matte-black ceramic vessel
    box(B, 'black', 14.42, 12.22, 16.38, 13.28, -0.45, -0.365, 0.006);
    box(B, 'pathStone', 14.25, 12.08, 16.55, 13.42, -0.365, -0.09, 0.012);
    books(tagged(new FX.Batch()), 14.6, 12.6, -0.1, 3, 0.04);                                  // (kept so shared random numbers stay in step)
    M.pages = M.pages || D(P({ color: 0xece4d2, roughness: 0.92, envMapIntensity: 0.4 }));
    const bookStack = (cx, cy, z0, items) => {
      let z = z0;
      items.forEach(([cloth, w, dp, h, rot]) => {
        const b = 0.0035, r = 0.0015;
        rbox(d, cloth, cx, cy, z, z + b, w, dp, r, rot);
        rbox(d, 'pages', cx + 0.004, cy, z + b, z + h - b, w - 0.012, dp - 0.008, 0.001, rot);
        rbox(d, cloth, cx, cy, z + h - b, z + h, w, dp, r, rot);
        const sx = cx - Math.cos(rot) * (w / 2 - 0.004), sy = cy + Math.sin(rot) * (w / 2 - 0.004);
        rbox(d, cloth, sx, sy, z, z + h, 0.009, dp, 0.003, rot);
        z += h;
      });
      return z;
    };
    thing(14.84, 12.82, () => {
      // blackened-bronze rectangular tray on the west half of the stone table
      box(d, 'black', 14.54, 12.58, 15.14, 13.06, -0.09, -0.082, 0.002);
      box(d, 'black', 14.54, 12.58, 15.14, 12.59, -0.09, -0.054, 0.002);
      box(d, 'black', 14.54, 13.05, 15.14, 13.06, -0.09, -0.054, 0.002);
      box(d, 'black', 14.54, 12.59, 14.55, 13.05, -0.09, -0.054, 0.002);
      box(d, 'black', 15.13, 12.59, 15.14, 13.05, -0.09, -0.054, 0.002);
      // carved travertine mortar bowl, brushed brass sphere, and travertine vessel with branching twigs inside the tray
      vase(d, 'trav', 14.70, 12.88, -0.082, 1.0, [[0, 0], [0.068, 0], [0.078, 0.028], [0.08, 0.078], [0.066, 0.078], [0.06, 0.02], [0, 0.018]]);
      ball(d, 'brass', 14.97, 12.89, -0.082 + 0.052, 0.052);
      vase(d, 'trav', 14.86, 12.69, -0.082, 0.36, VASE);
      const Rr = FX.rng(3030), zRim = -0.082 + 0.21;
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * 6.28 + Rr() * 0.4, lean = 0.18 + Rr() * 0.22, h = 0.22 + Rr() * 0.10;
        const mid = [14.86 + Math.cos(a) * lean * h * 0.45, 12.69 + Math.sin(a) * lean * h * 0.45, zRim + h * 0.5];
        const tip = [14.86 + Math.cos(a + 0.22) * lean * h, 12.69 + Math.sin(a + 0.22) * lean * h, zRim + h];
        rod(d, 'twig', [14.86, 12.69, zRim - 0.08], mid, 0.003);
        rod(d, 'twig', mid, tip, 0.0022);
        for (let k = 0; k < 4; k++) {
          const u = 0.3 + k * 0.22, bx = mid[0] + (tip[0] - mid[0]) * u, by = mid[1] + (tip[1] - mid[1]) * u, bz = mid[2] + (tip[2] - mid[2]) * u;
          ball(d, 'brass', bx + (Rr() - 0.5) * 0.018, by + (Rr() - 0.5) * 0.018, bz, 0.0055);
        }
      }
    });
    sprigs(tagged(new FX.Batch()), 16.05, 12.6, 0.36, 0.7, 5);                                // (the old sprigs: built and thrown away, so the shared random numbers stay in step)
    thing(15.72, 12.72, () => {
      bookStack(15.42, 12.42, -0.09, [['linenW', 0.35, 0.28, 0.032, 0.03], ['sage', 0.32, 0.25, 0.026, -0.02]]);
      bookStack(15.64, 13.00, -0.09, [['linenW', 0.38, 0.30, 0.032, 0.02], ['charcoal', 0.35, 0.27, 0.028, -0.03], ['linenW', 0.31, 0.24, 0.026, 0.04]]);
      const zEast = bookStack(16.06, 12.58, -0.09, [['charcoal', 0.38, 0.30, 0.034, -0.02], ['sage', 0.34, 0.27, 0.026, 0.02]]);
      vase(d, 'inkObj', 16.06, 12.58, zEast, 0.42, AMPHORA);
    });
    });
    box(d, 'rugDark', 13.12, 11.62, 17.78, 13.88, -0.45, -0.425, 0.006);
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
    // cantilevered architectural concrete hearth slab over a recessed dark shadow reveal
    box(B, 'black', 9.95, 10.78, 10.8, 14.22, 0, 0.06, 0.005);
    box(B, 'concretePlain', 9.95, 10.7, 10.9, 14.3, 0.06, 0.32, 0.014);
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
      // four rows of five, four, three, and the two halves on top, with each log's place a little off the stack's grid
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
    // two lounge chairs and a turned travertine drum table by the glass
    lounge(B, 19.7, 9.5, -Math.PI / 2 - 0.25, 'leather'); lounge(B, 19.7, 11.6, -Math.PI / 2 + 0.25, 'leather');
    books(tagged(new FX.Batch()), 20.0, 10.55, 0.46, 2, 0.6);
    thing(20.0, 10.55, () => {
      cyl(B, 'black', 20.0, 10.55, 0, 0.03, 0.19, 0.19, 32);
      vase(B, 'travBlock', 20.0, 10.55, 0.028, 1, [[0, 0], [0.215, 0], [0.228, 0.02], [0.248, 0.22], [0.26, 0.405], [0.25, 0.432], [0.15, 0.432], [0, 0.432]]);
      let zb = 0.46;
      [['charcoal', 0.24, 0.19, 0.026, 0.52], ['linenW', 0.21, 0.165, 0.022, 0.38]].forEach(([cloth, w, dp, h, rot]) => {
        const b = 0.003, r = 0.0015, bx = 19.95, by = 10.62;
        rbox(d, cloth, bx, by, zb, zb + b, w, dp, r, rot);
        rbox(d, 'pages', bx + 0.003, by, zb + b, zb + h - b, w - 0.01, dp - 0.008, 0.001, rot);
        rbox(d, cloth, bx, by, zb + h - b, zb + h, w, dp, r, rot);
        const sx = bx - Math.cos(rot) * (w / 2 - 0.004), sy = by + Math.sin(rot) * (w / 2 - 0.004);
        rbox(d, cloth, sx, sy, zb, zb + h, 0.008, dp, 0.0025, rot);
        zb += h;
      });
      cyl(d, 'brass', 20.05, 10.46, 0.46, 0.482, 0.036, 0.04, 24);
      vase(d, 'glowSoft', 20.05, 10.46, 0.48, 1, [[0, 0], [0.035, 0], [0.042, 0.055], [0.088, 0.075], [0.092, 0.11], [0.064, 0.152], [0.022, 0.168], [0, 0.17]]);
    });
    // (no lamp over the pit since 13 Oct. Sam, after a better one: "let's remove that lamp")
    // A bird of paradise (Strelitzia nicolai) in a woven basket, in the corner where the olive stood, curtains gathered at the
    // end of the glass. (Iteration 8, Sam, 15 Oct, with a photo of one: "something more similar to the screenshot. I think it
    // will be nicer and takes less place". The olive's basalt planter was 1.2 m across, this basket 57 cm.) A dozen stems from
    // the soil, fanned a little, each carrying one long paddle of a leaf, the low ones leaning out, the young ones upright.
    // Its own random numbers: nothing else in the house moves.
    {
      const X = 10.18, Y = 16.12, BASKET = window.LINTEL_BASKET = { x: X, y: Y, h: 0.5 };
      M.rattan = M.rattan || D(P({ color: 0xb08a5c, roughness: 0.8, envMapIntensity: 0.5 }));
      M.strelLeaf = M.strelLeaf || D(P({ color: 0x2f5a26, roughness: 0.5, envMapIntensity: 0.6, side: THREE.DoubleSide }), { noRing: true });
      M.strelStem = M.strelStem || D(P({ color: 0x61765a, roughness: 0.55, envMapIntensity: 0.55 }), { noRing: true });
      // A Strelitzia nicolai blade with a smooth cordate-ovate base (tapering into the petiole), cambered S-curve cross-section,
      // smooth manifold marginal wind-split indentations (no sawtooth dropped triangles), and per-leaf age encoded in uv.y.
      const leaf = (L, Wd, bow, fold, twist, seed, nSplit, age, sweep) => {
        const Rl = FX.rng(seed), NL = 44, NW = 18, pos = [], uv = [], idx = [];
        const uvOff = Math.round((age || 0) * 10) * 2.0, sw = sweep || 0;
        const splits = [];
        for (let k = 0; k < nSplit; k++) splits.push([Rl() < 0.5 ? -1 : 1, 0.34 + Rl() * 0.44, 0.38 + Rl() * 0.28]);
        const wa = 0.0035 + Rl() * 0.004, wp = Rl() * 6.28, wk = 22 + Rl() * 12;
        const baseCurve = (t) => (t < 0.48 ? 0.022 + 0.978 * Math.pow(Math.sin((t / 0.48) * Math.PI / 2), 1.58) : 1);
        const tipCurve = (t) => Math.pow(Math.max(0, 1 - Math.pow(Math.max(0, (t - 0.52) / 0.48), 1.85)), 0.72);
        const half = (t) => Wd * 0.5 * baseCurve(t) * tipCurve(t);
        for (let j = 0; j <= NL; j++) {
          const t = j / NL, hw0 = half(t), tw = (twist || 0) * t, ct = Math.cos(tw), st = Math.sin(tw), swX = sw * t * t * L;
          for (let i = 0; i <= NW; i++) {
            const sx = (i / NW) * 2 - 1, ax = Math.abs(sx), sgn = Math.sign(sx);
            let notch = 1.0, droop = 0.0;
            for (let s = 0; s < splits.length; s++) {
              const [sd, ts, dp] = splits[s];
              if (sgn === sd) {
                const tv = t - 0.14 * (1 - ax) - ts;
                const indent = Math.exp(-Math.pow(tv / 0.022, 2)) * smoothstep(1 - dp, 1.0, ax);
                notch = Math.min(notch, 1 - dp * 0.72 * indent);
                if (tv > 0) droop += 0.011 * smoothstep(0, 0.04, tv) * Math.pow(ax, 1.8);
              }
            }
            const hw = hw0 * notch, lx = sx * hw;
            const lz = fold * hw * (ax - 0.52 * ax * ax) + 0.0042 * Math.exp(-Math.pow(sx / 0.065, 2)) * (1 - 0.7 * t)
                     + wa * Math.pow(ax, 1.8) * Math.sin(t * wk + wp + sx * 1.5) - droop;
            pos.push(swX + lx * ct - lz * st, t * L - bow * 0.22 * t * t * L, bow * Math.pow(t, 2.2) * L * 1.15 + lx * st + lz * ct);
            uv.push(i / NW, t + uvOff);
          }
        }
        for (let j = 0; j < NL; j++) for (let i = 0; i < NW; i++) {
          const k = j * (NW + 1) + i;
          idx.push(k, k + 1, k + NW + 1, k + 1, k + NW + 2, k + NW + 1);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
        g.computeVertexNormals();
        return g;
      };
      const smoothstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
      // A curved, tapered petiole that arches smoothly from the soil sheath into the leaf base and continues up the abaxial midrib
      const curvedStalk = (pts, rads) => {
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i + 1];
          tleg(d, 'strelStem', [a.x + 30, a.z + 24, a.y], [b.x + 30, b.z + 24, b.y], rads[i], rads[i + 1]);
        }
      };
      const pebble2 = new THREE.SphereGeometry(1, 14, 10);
      thing(X, Y, () => {
        // the basket: a tapered woven pot 50 cm tall, a rolled rim, the soil 4 cm under it
        const prof = [[0, 0], [0.2, 0], [0.214, 0.015], [0.268, 0.47], [0.284, 0.49], [0.286, 0.505], [0.274, 0.512], [0.258, 0.495], [0.25, 0.46], [0, 0.46]];
        B.add(M.rattan, new THREE.LatheGeometry(prof.map(([r, h]) => new THREE.Vector2(r, h)), 72), FX.M(WX(X), 0, WZ(Y)));
        cyl(d, 'soilDark', X, Y, 0.45, 0.462, 0.252, 0.252, 40);
        // 10 leaves total (9 open blades staggered asymmetrically across height and angle + 1 central spear), so adjacent
        // leaves alternate low and high stem heights and every stalk and blade has clean negative space from bottom to top.
        const Rs = FX.rng(2031), up = new V3(0, 1, 0), soil = 0.462;
        const camHoriz = new V3(Math.cos(-0.61), 0, Math.sin(-0.61)), fanRight = new V3(-Math.sin(-0.61), 0, Math.cos(-0.61));
        const clusters = [[-0.052, -0.014], [0.004, 0.020], [0.048, -0.010]];
        const fronds = [
          // [s, fwd, Hs, L, Wd, yaw, bow, age, cluster, roll]
          [-0.82,  0.22, 0.42, 0.43, 0.136, -0.28, -0.22, 0.78, 0, -0.10], // B3: lower-mid far-left arching blade
          [-0.54,  0.06, 0.65, 0.57, 0.178, -0.20, -0.18, 0.42, 0, -0.05], // B1: upper-mid outer-left blade
          [-0.36,  0.24, 0.46, 0.45, 0.142, -0.14, -0.20, 0.64, 0,  0.07], // C1: mid-low inner-left blade
          [-0.22, -0.02, 0.80, 0.64, 0.194, -0.10, -0.14, 0.20, 1,  0.04], // A2: tall upper center-left blade
          [-0.06,  0.34, 0.36, 0.38, 0.124,  0.04, -0.24, 0.90, 1, -0.06], // C3: lowest front-arching blade over rim
          [ 0.12, -0.04, 0.90, 0.67, 0.200,  0.09, -0.13, 0.10, 1, -0.03], // A1: tallest upper center-right hero blade
          [ 0.31,  0.22, 0.50, 0.46, 0.144,  0.15, -0.19, 0.56, 2, -0.06], // B2: mid-low inner-right blade
          [ 0.48,  0.04, 0.68, 0.58, 0.182,  0.20, -0.17, 0.34, 2,  0.05], // A3: upper-mid outer-right blade
          [ 0.76,  0.20, 0.40, 0.42, 0.134,  0.28, -0.22, 0.82, 2,  0.10], // C2: lower-mid far-right arching blade
        ];
        fronds.forEach(([s, fwd, Hs, L, Wd, yaw, bow, age, cl, roll], idx) => {
          const [ox, oy] = clusters[cl];
          const b0 = new V3(WX(X) + fanRight.x * ox + camHoriz.x * oy, soil - 0.015, WZ(Y) + fanRight.z * ox + camHoriz.z * oy);
          const dir0 = new V3().addScaledVector(fanRight, Math.sin(s * 0.52)).addScaledVector(up, Math.cos(s * 0.52)).addScaledVector(camHoriz, fwd * 0.52).normalize();
          const dir1 = new V3().addScaledVector(fanRight, Math.sin(s * 0.88)).addScaledVector(up, Math.cos(s * 0.88)).addScaledVector(camHoriz, fwd * 0.88).normalize();
          const m1 = b0.clone().addScaledVector(dir0, Hs * 0.52);
          const top = m1.clone().addScaledVector(dir1, Hs * 0.50);
          const ly = new V3().addScaledVector(fanRight, Math.sin(s * 1.06)).addScaledVector(up, Math.cos(s * 1.06)).addScaledVector(camHoriz, fwd * 1.06).normalize();
          const lzTarget = new V3().addScaledVector(camHoriz, Math.cos(yaw)).addScaledVector(fanRight, Math.sin(yaw)).addScaledVector(up, 0.34).normalize();
          const lx = new V3().crossVectors(ly, lzTarget).normalize();
          lx.applyAxisAngle(ly, roll);
          const lz = new V3().crossVectors(lx, ly).normalize();
          const basis = new THREE.Matrix4().makeBasis(lx, ly, lz).setPosition(top.clone().addScaledVector(dir1, -0.015));
          const splits = age > 0.45 ? 1 + (age > 0.75 ? 1 : 0) : 0, sweep = -Math.sin(s) * 0.16;
          const g = leaf(L, Wd, bow, 0.42 + 0.08 * (1 - age), roll * 0.7, 3100 + idx * 97 + ((Rs() * 99) | 0), splits, age, sweep).applyMatrix4(basis);
          const k1 = new V3(sweep * 0.078 * L, 0.28 * L - bow * 0.22 * 0.078 * L, bow * Math.pow(0.28, 2.2) * L * 1.15 - 0.004).applyMatrix4(basis);
          const k2 = new V3(sweep * 0.336 * L, 0.58 * L - bow * 0.22 * 0.336 * L, bow * Math.pow(0.58, 2.2) * L * 1.15 - 0.003).applyMatrix4(basis);
          curvedStalk([b0, m1, top, k1, k2], [0.0135, 0.0105, 0.0078, 0.0048, 0.0022]);
          // the sheath: a slim clasping sleeve round the stalk's foot
          { const xa = fanRight.clone().addScaledVector(dir0, -fanRight.dot(dir0)).normalize(), za = new V3().crossVectors(xa, dir0);
            d.add(M.strelStem, pebble2, new THREE.Matrix4().makeBasis(xa, dir0, za).scale(new V3(0.014, 0.075, 0.009)).setPosition(b0.clone().addScaledVector(dir0, 0.055))); }
          d.add(M.strelLeaf, g);
        });
        // 10th leaf: one slender unfurling spear rising from the center cluster
        { const [ox, oy] = clusters[1], nb = new V3(WX(X) + fanRight.x * ox + camHoriz.x * oy, soil, WZ(Y) + fanRight.z * ox + camHoriz.z * oy), ntop = nb.clone().addScaledVector(up, 0.84);
          tleg(d, 'strelStem', [nb.x + 30, nb.z + 24, nb.y], [ntop.x + 30, ntop.z + 24, ntop.y], 0.0125, 0.008);
          const ly = new V3().addScaledVector(up, 0.995).addScaledVector(fanRight, -0.04).addScaledVector(camHoriz, 0.05).normalize();
          const lx = new V3().crossVectors(ly, camHoriz).normalize(), lz = new V3().crossVectors(lx, ly).normalize();
          d.add(M.strelLeaf, leaf(0.46, 0.054, -0.03, 1.45, 0.28, 901, 0, 0.0, 0).applyMatrix4(new THREE.Matrix4().makeBasis(lx, ly, lz).setPosition(ntop.clone().addScaledVector(up, -0.025)))); }
      }, 1.2);
    }
    curtain('living', 'v', 20.72, 15.6, 16.6, 0.02, 4.42); curtain('living', 'v', 20.72, 8.3, 9.0, 0.02, 4.42);
    // (1.3 by 1.75 m, its foot at 1.18 m, since iteration 8, the same as the painting on the pier's kitchen face. 1.4 by 1.9 at 2.2)
    art('living', 'gesture', 'N', 10.05, 8.13, 2.05, 1.3, 1.75, 'black', 5);
  }

  /* ================= kitchen and dining =============================================== */
  {
    const d = dec('kitchen');
    thing(14.8, 4.0, () => {
    // Helper to extrude a horizontal slab [x0..x1, y0..y1, z0..z1] with a rounded rectangular cutout hole [hx0..hx1, hy0..hy1]
    const slabWithHole = (bt, mat, x0, y0, x1, y1, z0, z1, e, hx0, hy0, hx1, hy1, hr) => {
      const u0 = WX(x0) + e, u1 = WX(x1) - e, v0 = -WZ(y1) + e, v1 = -WZ(y0) - e;
      const sh = new THREE.Shape();
      sh.moveTo(u0, v0); sh.lineTo(u1, v0); sh.lineTo(u1, v1); sh.lineTo(u0, v1); sh.closePath();
      const hu0 = WX(hx0) - e, hu1 = WX(hx1) + e, hv0 = -WZ(hy1) - e, hv1 = -WZ(hy0) + e, r = Math.min(hr || 0.015, (hu1 - hu0) * 0.3, (hv1 - hv0) * 0.3);
      const hl = new THREE.Path();
      hl.moveTo(hu0 + r, hv0);
      hl.lineTo(hu1 - r, hv0); hl.quadraticCurveTo(hu1, hv0, hu1, hv0 + r);
      hl.lineTo(hu1, hv1 - r); hl.quadraticCurveTo(hu1, hv1, hu1 - r, hv1);
      hl.lineTo(hu0 + r, hv1); hl.quadraticCurveTo(hu0, hv1, hu0, hv1 - r);
      hl.lineTo(hu0, hv0 + r); hl.quadraticCurveTo(hu0, hv0, hu0 + r, hv0);
      sh.holes.push(hl);
      const g = new THREE.ExtrudeGeometry(sh, { depth: z1 - z0 - 2 * e, bevelEnabled: true, bevelThickness: e, bevelSize: e, bevelSegments: 3, curveSegments: 8 });
      bt.add(M[mat], g, new THREE.Matrix4().makeRotationX(-Math.PI / 2).setPosition(0, z0 + e, 0));
    };
    // 1. Recessed matte-black plinth, architectural oak base (hollow under the sink), and shadow-gap collar
    box(B, 'black', 11.62, 3.52, 16.38, 4.48, 0, 0.095, 0.003);
    slabWithHole(B, 'cabinet', 11.55, 3.45, 16.45, 4.55, 0.095, 0.876, 0.005, 12.21, 3.60, 13.19, 4.18, 0.016);
    slabWithHole(B, 'black', 11.565, 3.465, 16.435, 4.535, 0.874, 0.886, 0.002, 12.22, 3.61, 13.18, 4.17, 0.016);
    // 2. Monolithic 5 cm honed Calacatta Oro / Taj Mahal white quartzite countertop with bevelled undermount sink cutout
    slabWithHole(B, 'counterStone', 11.48, 3.38, 16.52, 4.92, 0.885, 0.935, 0.005, 12.24, 3.63, 13.16, 4.15, 0.018);
    colliders.push({ id: 'island', box: new THREE.Box3(new V3(WX(11.48), 0, WZ(3.38)), new V3(WX(16.52), 0.935, WZ(4.92))) });
    // 3. Deep recessed undermount brushed stainless-steel sink basin (z = 0.695 .. 0.886), drain strainer, and drying rack
    box(B, 'steel', 12.222, 3.615, 12.242, 4.165, 0.695, 0.886, 0.002);                        // west stainless basin wall
    box(B, 'steel', 13.158, 3.615, 13.178, 4.165, 0.695, 0.886, 0.002);                        // east stainless basin wall
    box(B, 'steel', 12.222, 3.615, 13.178, 3.635, 0.695, 0.886, 0.002);                        // north stainless basin wall
    box(B, 'steel', 12.222, 4.145, 13.178, 4.165, 0.695, 0.886, 0.002);                        // south stainless basin wall
    box(B, 'steel', 12.222, 3.615, 13.178, 4.165, 0.688, 0.704, 0.002);                        // recessed stainless basin floor (23 cm deep)
    cyl(d, 'black', 12.84, 3.89, 0.692, 0.706, 0.046, 0.046, 28);                              // recessed drain well
    d.add(M.steel, new THREE.TorusGeometry(0.044, 0.005, 10, 28), FX.M(WX(12.84), 0.705, WZ(3.89), Math.PI / 2, 0, 0));
    cyl(d, 'steel', 12.84, 3.89, 0.696, 0.707, 0.030, 0.030, 24);                              // stainless basket strainer cap
    cyl(d, 'black', 12.84, 3.89, 0.706, 0.710, 0.0045, 0.0045, 12);                            // strainer center pin
    // Integrated workstation roll-mat stainless drying rack on the left ledge of the sink
    box(d, 'black', 12.248, 3.635, 12.502, 3.655, 0.858, 0.868, 0.002);
    box(d, 'black', 12.248, 4.125, 12.502, 4.145, 0.858, 0.868, 0.002);
    for (let k = 0; k < 8; k++) rod(d, 'steel', [12.268 + k * 0.030, 3.645, 0.863], [12.268 + k * 0.030, 4.135, 0.863], 0.0038);
    // 4. Connected Dornbracht-style brushed stainless-steel gooseneck mixer faucet & deck soap dispenser
    cyl(d, 'black', 12.70, 4.23, 0.934, 0.938, 0.032, 0.032, 32);                              // deck mounting gasket
    cyl(d, 'steel', 12.70, 4.23, 0.937, 0.956, 0.028, 0.031, 32);                              // machined base escutcheon collar
    cyl(d, 'steel', 12.70, 4.23, 0.956, 1.115, 0.021, 0.021, 32);                              // vertical mixer valve body
    cyl(d, 'black', 12.70, 4.23, 1.115, 1.119, 0.0195, 0.0195, 28);                            // swivel joint ring
    cyl(d, 'steel', 12.70, 4.23, 1.119, 1.148, 0.0175, 0.020, 28);                             // upper swivel collar
    d.add(M.steel, new THREE.CylinderGeometry(0.0145, 0.0145, 0.048, 24), FX.M(WX(12.736), 1.018, WZ(4.23), 0, 0, Math.PI / 2));
    d.add(M.black, new THREE.CylinderGeometry(0.0148, 0.0148, 0.0035, 24), FX.M(WX(12.748), 1.018, WZ(4.23), 0, 0, Math.PI / 2));
    tleg(d, 'steel', [12.754, 4.23, 1.018], [12.766, 4.215, 1.110], 0.0052, 0.0042);           // single-lever mixer pin handle
    { // Smooth 180-degree high-arch gooseneck tubular spout curving over the sink basin
      const archPts = [new V3(WX(12.70), 1.142, WZ(4.23)), new V3(WX(12.70), 1.195, WZ(4.23))];
      for (let i = 0; i <= 18; i++) {
        const a = (i / 18) * Math.PI;
        archPts.push(new V3(WX(12.70), 1.205 + Math.sin(a) * 0.150, WZ(4.075 + Math.cos(a) * 0.155)));
      }
      d.add(M.steel, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(archPts), 36, 0.0142, 24, false));
    }
    cyl(d, 'black', 12.70, 3.92, 1.201, 1.206, 0.0145, 0.0145, 24);                            // pull-down spray head docking ring
    cyl(d, 'steel', 12.70, 3.92, 1.138, 1.201, 0.0162, 0.0145, 28);                            // pull-down stainless spray wand
    cyl(d, 'black', 12.70, 3.92, 1.135, 1.139, 0.0132, 0.0132, 24);                            // recessed aerator nozzle
    // Matching deck-mounted brushed-stainless soap dispenser at (12.95, 4.23)
    cyl(d, 'steel', 12.95, 4.23, 0.935, 0.946, 0.018, 0.019, 24);
    cyl(d, 'steel', 12.95, 4.23, 0.946, 1.026, 0.011, 0.012, 24);
    rod(d, 'steel', [12.95, 4.23, 1.016], [12.95, 4.14, 1.010], 0.0055);
    // 5. Carved 44-flute Roman travertine centerpiece bowl & detailed fresh fruit arrangement at (14.65, 4.00)
    for (let i = 0; i < 21; i++) R();                                                          // preserve exact 21 shared RNG draws
    {
      const bx = 14.65, by = 4.00, bz = 0.935;
      // Radially fluted pedestal bowl geometry (44 vertical carved flutes on the exterior, smooth honed basin inside)
      const prof = [
        [0.0, 0.0], [0.116, 0.0], [0.118, 0.022], [0.106, 0.026],
        [0.145, 0.038], [0.192, 0.058], [0.232, 0.084], [0.258, 0.112], [0.268, 0.134],
        [0.262, 0.138], [0.250, 0.134], [0.220, 0.098], [0.172, 0.068], [0.108, 0.048], [0.0, 0.042]
      ];
      const NA = 176, NR = prof.length, bPos = [], bIdx = [];
      for (let j = 0; j < NR; j++) {
        const [r0, h0] = prof[j];
        const isExt = j >= 4 && j <= 9;
        const fluteAmp = isExt ? 0.0045 * Math.sin(((j - 3.5) / 6.0) * Math.PI) : 0;
        for (let i = 0; i <= NA; i++) {
          const a = (i / NA) * Math.PI * 2;
          const r = r0 + fluteAmp * Math.cos(a * 44);
          bPos.push(Math.cos(a) * r, h0, Math.sin(a) * r);
        }
      }
      for (let j = 0; j < NR - 1; j++) {
        for (let i = 0; i < NA; i++) {
          const k = j * (NA + 1) + i;
          bIdx.push(k, k + NA + 1, k + 1, k + 1, k + NA + 1, k + NA + 2);
        }
      }
      const bGeo = new THREE.BufferGeometry();
      bGeo.setAttribute('position', new THREE.Float32BufferAttribute(bPos, 3));
      bGeo.setIndex(bIdx);
      bGeo.computeVertexNormals();
      d.add(M.flutedBowl, bGeo, FX.M(WX(bx), bz, WZ(by)));

      // Sculpted LatheGeometry profiles for Amalfi lemons, Anjou pears, Honeycrisp apples, and Black Mission figs
      const mkLathe = (pts, seg) => new THREE.LatheGeometry(new THREE.SplineCurve(pts.map(([r, y]) => new THREE.Vector2(r, y))).getPoints(20).map((v) => new THREE.Vector2(Math.max(0, v.x), v.y)), seg || 28);
      const lemonGeo = mkLathe([[0, -0.048], [0.007, -0.044], [0.014, -0.036], [0.028, -0.018], [0.032, 0], [0.028, 0.018], [0.014, 0.036], [0.007, 0.044], [0, 0.048]], 26);
      const pearGeo = mkLathe([[0, -0.044], [0.022, -0.042], [0.038, -0.022], [0.036, 0.002], [0.023, 0.024], [0.016, 0.044], [0.009, 0.056], [0, 0.060]], 26);
      const appleGeo = mkLathe([[0, -0.036], [0.022, -0.038], [0.038, -0.024], [0.043, 0.002], [0.039, 0.026], [0.024, 0.039], [0.008, 0.035], [0, 0.031]], 28);
      const figGeo = mkLathe([[0, -0.024], [0.016, -0.022], [0.024, -0.008], [0.022, 0.008], [0.012, 0.022], [0.005, 0.030], [0, 0.033]], 24);
      const cLeafGeo = bladeGeo(0.088, 0.034, 0.22, 0.14);

      // Place Amalfi lemons on the left & front-left with fresh green citrus leaves
      [
        [-0.155,  0.015, 0.106,  0.4,  0.2,  1.1, 1.02],
        [-0.105,  0.065, 0.112, -0.3,  0.5,  0.8, 0.98],
        [-0.125, -0.055, 0.108,  0.6, -0.3,  1.3, 1.00],
        [-0.065,  0.010, 0.132,  0.2,  0.8, -0.9, 0.96],
        [-0.175, -0.020, 0.124, -0.5,  0.3,  0.9, 0.94],
        [-0.045,  0.085, 0.114,  0.3, -0.4,  1.2, 0.95],
      ].forEach(([dx, dy, dz, rx, ry, rz, sc]) => {
        d.add(M.lemon, lemonGeo, FX.M(WX(bx + dx), bz + dz, WZ(by + dy), rx, ry, rz, sc, sc, sc));
      });
      // Fresh green citrus sprigs & leaves arching naturally along the lemons and bowl rim
      [
        [-0.165,  0.012, 0.136,  1.18, -1.7, 0.95],
        [-0.128,  0.048, 0.140,  1.12, -0.9, 0.90],
        [-0.095, -0.038, 0.140,  1.16,  0.4, 0.92],
        [-0.185, -0.022, 0.130,  1.26, -2.3, 0.86],
        [-0.058,  0.036, 0.144,  1.10, -0.3, 0.85],
      ].forEach(([dx, dy, dz, tilt, yaw, sc]) => {
        d.add(M.foliage, cLeafGeo, FX.M(WX(bx + dx), bz + dz, WZ(by + dy), tilt, yaw, 0, sc, sc, sc, 'YXZ'));
      });

      // Place Anjou pears in the center-left and center with woody stems
      [
        [-0.025, -0.020, 0.118,  0.35, 0.4, -0.30, 1.02],
        [ 0.025,  0.055, 0.122, -0.25, 1.1,  0.45, 0.98],
        [-0.055, -0.075, 0.112,  0.55, 2.1,  0.25, 0.95],
        [ 0.045, -0.045, 0.134,  0.18, 0.7, -0.20, 0.96],
      ].forEach(([dx, dy, dz, rx, ry, rz, sc]) => {
        const px = bx + dx, py = by + dy, pz = bz + dz;
        d.add(M.pear, pearGeo, FX.M(WX(px), pz, WZ(py), rx, ry, rz, sc, sc, sc));
        rod(d, 'twig', [px, py, pz + 0.048 * sc], [px + 0.008, py - 0.006, pz + 0.070 * sc], 0.0024);
      });

      // Place Honeycrisp red-blush apples in the center and center-right with stems
      [
        [ 0.065,  0.015, 0.116,  0.15, 0.5, -0.12, 1.04],
        [ 0.005,  0.015, 0.140, -0.10, 1.4,  0.18, 0.98],
        [ 0.095, -0.055, 0.112,  0.25, 2.3,  0.10, 0.96],
        [ 0.080,  0.075, 0.114, -0.20, 0.8,  0.22, 0.94],
      ].forEach(([dx, dy, dz, rx, ry, rz, sc]) => {
        const ax = bx + dx, ay = by + dy, az = bz + dz;
        d.add(M.apple, appleGeo, FX.M(WX(ax), az, WZ(ay), rx, ry, rz, sc, sc, sc));
        rod(d, 'twig', [ax, ay, az + 0.030 * sc], [ax - 0.005, ay + 0.004, az + 0.048 * sc], 0.0022);
      });

      // Place Valencia oranges on the right side of the bowl
      [
        [ 0.155,  0.025, 0.114, 0.039],
        [ 0.135, -0.045, 0.112, 0.037],
        [ 0.180, -0.010, 0.120, 0.036],
        [ 0.115,  0.055, 0.128, 0.035],
      ].forEach(([dx, dy, dz, r]) => {
        ball(d, 'orange', bx + dx, by + dy, bz + dz, r, 0.90);
      });

      // Place Black Mission purple figs & dark grape cluster nestled among the apples and oranges
      [
        [ 0.115,  0.005, 0.132,  0.3, 0.8, -0.4, 1.02],
        [ 0.145,  0.055, 0.122, -0.4, 1.5,  0.3, 0.96],
        [ 0.055,  0.050, 0.134,  0.2, 2.1,  0.5, 1.00],
        [ 0.165,  0.020, 0.130,  0.5, 0.3, -0.2, 0.94],
      ].forEach(([dx, dy, dz, rx, ry, rz, sc]) => {
        d.add(M.figFruit, figGeo, FX.M(WX(bx + dx), bz + dz, WZ(by + dy), rx, ry, rz, sc, sc, sc));
      });
      const Rg = FX.rng(5059);
      for (let k = 0; k < 16; k++) {
        const gx = bx + 0.085 + (Rg() - 0.5) * 0.080, gy = by - 0.015 + (Rg() - 0.5) * 0.080, gz = bz + 0.126 + Rg() * 0.022;
        ball(d, 'figFruit', gx, gy, gz, 0.011 + Rg() * 0.003, 1.12);
      }
      // Underlying fruit bed filler so no empty gap shows through the arrangement
      [[-0.08, 0.0, 'lemon'], [0.0, 0.02, 'pear'], [0.06, -0.01, 'apple'], [0.11, 0.01, 'orange']].forEach(([dx, dy, m]) =>
        ball(d, m, bx + dx, by + dy, bz + 0.082, 0.042, 0.85)
      );
    }
    // (a cleaner counter since 13 Oct: no boards, no vase of sprigs. The sprigs are built and thrown away, for the random numbers.)
    sprigs(tagged(new FX.Batch()), 16.15, 4.25, 1.24, 0.6, 4);
    // Three sculpted cognac saddle-leather & dark-walnut counter barstools tucked along the south overhang
    [12.6, 14.0, 15.4].forEach((x) => stool(B, x, 5.06));
    });
    // 6. Ceiling-mounted architectural twin-cylinder spotlight pod at the center of the island (x = 14.0, y = 4.0, z = 3.598),
    // with articulated brass swivel knuckles: left spotlight angled toward the left, right spotlight angled diagonally toward the right.
    thing(14.0, 4.0, () => {
      box(d, 'brass', 13.66, 3.87, 14.34, 4.13, 3.584, 3.597, 0.003);                          // brushed-brass ceiling bezel
      box(d, 'black', 13.68, 3.89, 14.32, 4.11, 3.568, 3.592, 0.004);                          // matte-black recessed track housing
      [
        [13.83, new V3(-Math.sin(0.46), -Math.cos(0.46), 0.04).normalize()],                   // left can: angled toward the left
        [14.17, new V3(Math.sin(0.48), -Math.cos(0.48), 0.08).normalize()],                    // right can: angled diagonally toward the right
      ].forEach(([sx, aimDir]) => {
        cyl(d, 'brass', sx, 4.00, 3.548, 3.572, 0.044, 0.050, 32);                             // stationary brass ceiling stem collar
        ball(d, 'brass', sx, 4.00, 3.548, 0.045, 0.95);                                        // articulated brass swivel ball joint
        const piv = new V3(WX(sx), 3.546, WZ(4.00));
        const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), aimDir.clone().negate());
        const one = new V3(1, 1, 1);
        const canCyl = (mat, d0, d1, rTop, rBot, seg) => {
          const p = piv.clone().addScaledVector(aimDir, 0.5 * (d0 + d1));
          d.add(M[mat], new THREE.CylinderGeometry(rTop, rBot, d1 - d0, seg || 36), new THREE.Matrix4().compose(p, q, one));
        };
        const canTorus = (mat, dist, r, tube, seg) => {
          const p = piv.clone().addScaledVector(aimDir, dist);
          const m = new THREE.Matrix4().compose(p, q, one).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
          d.add(M[mat], new THREE.TorusGeometry(r, tube, 12, seg || 36), m);
        };
        d.add(M.brass, new THREE.SphereGeometry(0.068, 36, 16, 0, Math.PI * 2, 0, Math.PI * 0.52), new THREE.Matrix4().compose(piv.clone().addScaledVector(aimDir, 0.024), q, new V3(1, 0.35, 1)));
        canCyl('brass', 0.022, 0.036, 0.068, 0.068, 36);                                       // top spun-brass barrel crown
        canCyl('black', 0.035, 0.176, 0.068, 0.068, 36);                                       // upper matte-black cylinder barrel
        canCyl('brass', 0.174, 0.238, 0.0685, 0.0685, 36);                                     // lower brushed-brass baffle cuff
        canTorus('brass', 0.238, 0.064, 0.0045, 36);                                           // rolled brass aperture lip
        canCyl('black', 0.194, 0.236, 0.058, 0.058, 32);                                       // recessed dark anti-glare baffle
        canTorus('brass', 0.226, 0.048, 0.003, 32);                                            // inner brass lens retaining ring
        canCyl('glow', 0.212, 0.226, 0.046, 0.046, 32);                                        // warm glowing optical lens
        d.add(M.glowSoft, new THREE.SphereGeometry(0.042, 24, 14), new THREE.Matrix4().compose(piv.clone().addScaledVector(aimDir, 0.226), q, new V3(1, 0.35, 1)));
      });
    }, 3.5);
    lamp('kitchen', 14.0, 4.0, 3.10, 0xffd8a8, 1.8, 6.5);                                      // warm downward spotlight pool over island
    // the cabinet wall: book-matched dark smoked walnut joinery framing a Sub-Zero French-door stainless refrigerator,
    // a stacked Gaggenau brushed-stainless microwave and convection oven tower, and a recessed Nero Marquina marble
    // cooking alcove with a five-burner stainless range top and extractor hood. It scans in like a wall (see scanned)
    scanned(() => {
    colliders.push({ id: 'tall', box: new THREE.Box3(new V3(WX(9.13), 0, WZ(0.4)), new V3(WX(9.78), 2.64, WZ(4.6))) });
    // Outer mitered dark smoked-walnut portal frame & recessed matte-black shadow plinth
    box(B, 'kitchenCab', 9.13, 0.40, 9.782, 0.472, 0.0, 2.644, 0.005);
    box(B, 'kitchenCab', 9.13, 4.528, 9.782, 4.60, 0.0, 2.644, 0.005);
    box(B, 'kitchenCab', 9.13, 0.472, 9.782, 4.528, 2.572, 2.644, 0.005);
    box(B, 'black', 9.13, 1.555, 9.705, 4.528, 0.0, 0.088, 0.003);
    // Recessed dark shadow carcass behind door reveals
    box(B, 'black', 9.13, 0.472, 9.736, 2.965, 0.088, 2.572, 0.003);
    box(B, 'black', 9.13, 2.965, 9.736, 4.148, 0.088, 0.875, 0.003);
    box(B, 'black', 9.13, 2.965, 9.736, 4.148, 2.095, 2.572, 0.003);
    box(B, 'black', 9.13, 4.148, 9.736, 4.528, 0.088, 2.572, 0.003);
    // Architectural brushed-stainless cabinet door bar handles (so every cabinet door is immediately legible)
    const cabHandleV = (hy, z0, z1) => {
      rod(d, 'steel', [9.796, hy, z0], [9.796, hy, z1], 0.0085);
      [z0 + 0.035, z1 - 0.035].forEach((hz) => rod(d, 'steel', [9.764, hy, hz], [9.796, hy, hz], 0.007));
    };
    const cabHandleH = (y0, y1, hz) => {
      rod(d, 'steel', [9.796, y0, hz], [9.796, y1, hz], 0.0085);
      [y0 + 0.035, y1 - 0.035].forEach((hy) => rod(d, 'steel', [9.764, hy, hz], [9.796, hy, hz], 0.007));
    };
    // Bay 1 (Right / North, y = 0.480 .. 1.548): Built-in Sub-Zero French-door brushed stainless refrigerator + clean upper doors
    box(B, 'kitchenCab', 9.738, 0.480, 9.766, 1.010, 2.112, 2.564, 0.004);
    box(B, 'kitchenCab', 9.738, 1.018, 9.766, 1.548, 2.112, 2.564, 0.004);
    cabHandleV(0.964, 2.155, 2.355);
    cabHandleV(1.064, 2.155, 2.355);
    box(B, 'steel', 9.715, 0.482, 9.754, 1.546, 0.006, 0.082, 0.003);                        // stainless toe-kick
    box(B, 'steel', 9.740, 0.482, 9.776, 1.546, 0.090, 0.640, 0.006);                        // lower pull-out freezer drawer
    rod(d, 'steel', [9.812, 0.64, 0.545], [9.812, 1.39, 0.545], 0.011);                      // freezer bar handle
    [0.70, 1.33].forEach((hy) => rod(d, 'steel', [9.775, hy, 0.545], [9.812, hy, 0.545], 0.009));
    box(B, 'steel', 9.740, 0.482, 9.776, 1.009, 0.652, 1.854, 0.006);                        // right French door
    box(B, 'steel', 9.740, 1.019, 9.776, 1.546, 0.652, 1.854, 0.006);                        // left French door
    [0.962, 1.066].forEach((hy) => {                                                         // pair of vertical tubular stainless handles
      rod(d, 'steel', [9.814, hy, 0.80], [9.814, hy, 1.72], 0.0115);
      [0.86, 1.66].forEach((hz) => rod(d, 'steel', [9.775, hy, hz], [9.814, hy, hz], 0.0095));
    });
    box(d, 'black', 9.775, 0.53, 9.780, 0.62, 1.785, 1.804, 0.001);                          // upper-right Sub-Zero nameplate badge
    box(B, 'steel', 9.740, 0.482, 9.774, 0.506, 1.864, 2.102, 0.003);                        // top compressor grille frame
    box(B, 'steel', 9.740, 1.522, 9.774, 1.546, 1.864, 2.102, 0.003);
    box(B, 'steel', 9.740, 0.482, 9.776, 1.546, 2.082, 2.102, 0.003);
    box(B, 'steel', 9.740, 0.482, 9.776, 1.546, 1.864, 1.882, 0.003);
    for (let k = 0; k < 6; k++) { const lz = 1.894 + k * 0.032; box(d, 'steel', 9.744, 0.504, 9.776, 1.524, lz, lz + 0.019, 0.002); }
    // Bay 2 (y = 1.558 .. 1.895): Continuous full-height smoked-walnut larder door with vertical stainless handle
    box(B, 'kitchenCab', 9.738, 1.558, 9.766, 1.895, 0.092, 2.564, 0.004);
    cabHandleV(1.842, 0.84, 1.48);
    // Bay 3 (Center, y = 1.905 .. 2.615): Stacked Gaggenau brushed-stainless microwave / speed-oven & full convection oven tower
    box(B, 'kitchenCab', 9.738, 1.905, 9.766, 2.615, 0.092, 0.754, 0.004);                   // lower deep pan drawer below oven
    cabHandleH(2.08, 2.44, 0.682);
    box(B, 'kitchenCab', 9.738, 1.905, 9.766, 2.256, 1.792, 2.564, 0.004);                   // unified upper cabinet doors above microwave
    box(B, 'kitchenCab', 9.738, 2.264, 9.766, 2.615, 1.792, 2.564, 0.004);
    cabHandleV(2.210, 1.845, 2.065);
    cabHandleV(2.310, 1.845, 2.065);
    const buildOvenUnit = (z0, z1, isMicro) => {
      const wy0 = 2.025, wy1 = 2.495, wz0 = z0 + 0.092, wz1 = z1 - 0.125;
      box(B, 'steel', 9.742, 1.906, 9.776, 2.614, wz1, z1, 0.004);                           // top brushed-stainless control header
      box(B, 'steel', 9.742, 1.906, 9.776, 2.614, z0, wz0, 0.004);                           // bottom brushed-stainless rail
      box(B, 'steel', 9.742, 1.906, 9.776, wy0, wz0, wz1, 0.004);                            // right brushed-stainless stile
      box(B, 'steel', 9.742, wy1, 9.776, 2.614, wz0, wz1, 0.004);                            // left brushed-stainless stile
      box(B, 'ovenGlass', 9.738, wy0, 9.754, wy1, wz0, wz1, 0.002);                          // smoked double-glazed viewing window
      const r1z = wz0 + (wz1 - wz0) * 0.32;
      box(d, 'steel', 9.750, wy0 + 0.022, 9.758, wy1 - 0.022, r1z - 0.005, r1z + 0.005, 0.001);
      if (!isMicro) { const r2z = wz0 + (wz1 - wz0) * 0.62; box(d, 'steel', 9.750, wy0 + 0.022, 9.758, wy1 - 0.022, r2z - 0.005, r2z + 0.005, 0.001); }
      box(d, 'glazeBlack', 9.774, 2.185, 9.783, 2.335, wz1 + 0.014, z1 - 0.012, 0.002);      // central top dark glass control bezel
      const kCyl = (mat, x0, x1, ky, kz, r) => d.add(M[mat], new THREE.CylinderGeometry(r, r, x1 - x0, 24), FX.M(WX((x0 + x1) / 2), kz, WZ(ky), 0, 0, Math.PI / 2));
      [2.222, 2.298].forEach((ky) => {
        kCyl('black', 9.781, 9.790, ky, wz1 + 0.044, 0.018);
        kCyl('frame', 9.789, 9.799, ky, wz1 + 0.044, 0.0145);
        kCyl('steel', 9.797, 9.803, ky, wz1 + 0.044, 0.0125);
      });
      box(d, 'bayGlow', 9.782, 2.212, 9.785, 2.308, z1 - 0.038, z1 - 0.024, 0.001);          // digital display bar
      rod(d, 'steel', [9.808, 1.98, wz1 - 0.028], [9.808, 2.54, wz1 - 0.028], 0.010);        // horizontal tubular stainless handle
      [2.03, 2.49].forEach((hy) => rod(d, 'steel', [9.774, hy, wz1 - 0.028], [9.808, hy, wz1 - 0.028], 0.0085));
    };
    buildOvenUnit(0.764, 1.344, false);                                                      // lower full convection oven
    buildOvenUnit(1.356, 1.782, true);                                                       // upper built-in microwave / speed-oven
    // Bay 4 (y = 2.625 .. 2.960): Continuous full-height smoked-walnut pantry door with vertical stainless handle
    box(B, 'kitchenCab', 9.738, 2.625, 9.766, 2.960, 0.092, 2.564, 0.004);
    cabHandleV(2.678, 0.84, 1.48);
    // Bay 5 (Left / South, y = 2.968 .. 4.144): Professional Brushed-Stainless Range + Range Oven Door, Nero Marquina Alcove & Canopy Extractor Hood
    box(B, 'kitchenCab', 9.738, 2.968, 9.766, 3.552, 2.112, 2.564, 0.004);                   // upper cabinet doors above cooking alcove
    box(B, 'kitchenCab', 9.738, 3.560, 9.766, 4.144, 2.112, 2.564, 0.004);
    cabHandleV(3.504, 2.155, 2.355);
    cabHandleV(3.608, 2.155, 2.355);
    // 1. Underneath the 6 stove buttons: Full-width built-in Brushed-Stainless Range Oven Door & Warming Drawer (no wooden cabinet squares)
    box(B, 'steel', 9.715, 2.972, 9.754, 4.140, 0.006, 0.082, 0.003);                        // stainless range toe-kick
    box(B, 'steel', 9.742, 2.972, 9.776, 4.140, 0.090, 0.218, 0.004);                        // lower brushed-stainless warming drawer
    rod(d, 'steel', [9.804, 3.28, 0.162], [9.804, 3.83, 0.162], 0.009);                      // warming drawer handle
    [3.34, 3.77].forEach((hy) => rod(d, 'steel', [9.774, hy, 0.162], [9.804, hy, 0.162], 0.0075));
    // Range Oven Door (z = 0.228 .. 0.768) directly below the 6 rotary knobs
    const rwy0 = 3.125, rwy1 = 3.987, rwz0 = 0.312, rwz1 = 0.638;
    box(B, 'steel', 9.742, 2.972, 9.778, 4.140, rwz1, 0.768, 0.005);                         // top brushed-stainless oven door rail
    box(B, 'steel', 9.742, 2.972, 9.778, 4.140, 0.228, rwz0, 0.005);                         // bottom brushed-stainless oven door rail
    box(B, 'steel', 9.742, 2.972, 9.778, rwy0, rwz0, rwz1, 0.005);                           // right brushed-stainless oven door stile
    box(B, 'steel', 9.742, rwy1, 9.778, 4.140, rwz0, rwz1, 0.005);                           // left brushed-stainless oven door stile
    box(B, 'ovenGlass', 9.738, rwy0, 9.754, rwy1, rwz0, rwz1, 0.002);                        // wide smoked double-glazed range-oven viewing window
    [0.415, 0.528].forEach((rz) => {                                                         // two heavy stainless-steel range oven racks inside cavity
      box(d, 'steel', 9.750, rwy0 + 0.022, 9.758, rwy1 - 0.022, rz - 0.005, rz + 0.005, 0.001);
    });
    rod(d, 'steel', [9.814, 3.04, 0.704], [9.814, 4.07, 0.704], 0.0115);                     // full-width tubular stainless range-oven towel-bar handle
    [3.12, 3.99].forEach((hy) => rod(d, 'steel', [9.776, hy, 0.704], [9.814, hy, 0.704], 0.0095));
    // 2. Full-width Brushed-Stainless Range Control Bullnose Manifold & 6 Machined Rotary Knobs (z = 0.776 .. 0.918)
    box(B, 'steel', 9.740, 2.972, 9.784, 4.140, 0.776, 0.918, 0.005);
    box(d, 'glazeBlack', 9.778, 3.030, 9.786, 4.082, 0.806, 0.884, 0.002);                   // recessed dark control bezel strip
    box(d, 'bayGlow', 9.784, 3.505, 9.788, 3.607, 0.832, 0.858, 0.001);                      // central oven digital temperature readout
    [3.11, 3.25, 3.39, 3.72, 3.86, 4.00].forEach((ky) => {
      d.add(M.black, new THREE.CylinderGeometry(0.024, 0.024, 0.008, 24), FX.M(WX(9.786), 0.845, WZ(ky), 0, 0, Math.PI / 2));
      d.add(M.frame, new THREE.CylinderGeometry(0.019, 0.019, 0.016, 24), FX.M(WX(9.796), 0.845, WZ(ky), 0, 0, Math.PI / 2));
      d.add(M.steel, new THREE.CylinderGeometry(0.016, 0.016, 0.008, 24), FX.M(WX(9.806), 0.845, WZ(ky), 0, 0, Math.PI / 2));
      box(d, 'black', 9.795, ky - 0.0038, 9.814, ky + 0.0038, 0.831, 0.859, 0.001);
      box(d, 'steel', 9.807, ky - 0.0024, 9.816, ky + 0.0024, 0.833, 0.857, 0.001);
    });
    // 3. Recessed Cooking Alcove (wooden cabinet side cheeks + painted house wall back) & 5-Burner Professional Cooktop
    box(B, 'kitchenCab', 9.14, 2.968, 9.766, 2.998, 0.875, 2.104, 0.003);                      // right wooden cabinet cheek wall
    box(B, 'kitchenCab', 9.14, 4.114, 9.766, 4.144, 0.875, 2.104, 0.003);                      // left wooden cabinet cheek wall
    box(B, 'kitchenCab', 9.14, 2.998, 9.766, 4.114, 2.082, 2.104, 0.003);                      // top wooden cabinet alcove soffit
    box(B, 'plaster', 9.135, 2.998, 9.175, 4.114, 0.916, 2.082, 0.002);                        // alcove back wall in our house wall paint color
    box(B, 'steel', 9.175, 2.998, 9.774, 4.114, 0.875, 0.934, 0.004);                          // stainless range deck chassis
    box(B, 'steel', 9.175, 2.998, 9.235, 4.114, 0.934, 0.988, 0.003);                          // rear brushed-stainless island vent backguard riser
    box(d, 'black', 9.182, 3.040, 9.232, 4.072, 0.982, 0.990, 0.001);                          // rear vent louver slot
    box(d, 'black', 9.255, 3.035, 9.748, 4.077, 0.928, 0.936, 0.002);                          // recessed dark porcelain burner pan
    [[9.38, 3.22, 0.046], [9.61, 3.22, 0.052], [9.495, 3.556, 0.074], [9.38, 3.89, 0.046], [9.61, 3.89, 0.052]].forEach(([bx, by, br]) => {
      cyl(d, 'brass', bx, by, 0.934, 0.947, br, br * 0.96, 24);
      cyl(d, 'black', bx, by, 0.947, 0.955, br * 0.88, br * 0.84, 24);
    });
    [9.275, 9.495, 9.715].forEach((gx) => box(d, 'black', gx - 0.010, 3.035, gx + 0.010, 4.077, 0.934, 0.962, 0.002));
    for (let k = 0; k < 11; k++) { const gy = 3.046 + k * 0.102; box(d, 'black', 9.270, gy - 0.0075, 9.720, gy + 0.0075, 0.934, 0.962, 0.002); }
    // 4. Clean 2-Layer Brushed-Stainless Range Hood with Centered Top Chimney Block (z = 1.660 .. 2.082)
    box(B, 'steel', 9.175, 3.004, 9.746, 4.108, 1.660, 1.724, 0.004);                          // Layer 1: slim lower brushed-stainless extractor visor
    box(B, 'steel', 9.175, 3.096, 9.655, 4.016, 1.724, 1.784, 0.004);                          // Layer 2: second symmetrically stepped canopy tier
    box(B, 'steel', 9.295, 3.366, 9.575, 3.746, 1.784, 2.082, 0.004);                          // Top block: centered vertical extraction chimney flue
    box(d, 'frame', 9.288, 3.358, 9.582, 3.754, 2.070, 2.082, 0.002);                          // top chimney soffit shadow collar
    // Centered front hood fan-speed & task-light control bezel with 4 stainless push buttons
    box(d, 'glazeBlack', 9.740, 3.436, 9.750, 3.676, 1.676, 1.708, 0.002);
    box(d, 'bayGlow', 9.746, 3.452, 9.751, 3.508, 1.684, 1.700, 0.001);
    [3.540, 3.576, 3.612, 3.648].forEach((by) => d.add(M.steel, new THREE.CylinderGeometry(0.0075, 0.0075, 0.008, 16), FX.M(WX(9.749), 1.692, WZ(by), 0, 0, Math.PI / 2)));
    // Recessed underside extraction plenum with 3 angled louvered stainless baffle grease filter cassettes & twin warm LED task strips
    box(d, 'black', 9.215, 3.040, 9.708, 4.072, 1.654, 1.664, 0.002);
    [[3.065, 3.375], [3.400, 3.712], [3.737, 4.047]].forEach(([fy0, fy1]) => {
      box(d, 'steel', 9.265, fy0, 9.645, fy1, 1.656, 1.665, 0.002);                            // stainless filter cassette perimeter frame
      for (let s = 0; s < 6; s++) {
        const sx = 9.292 + s * 0.056;
        box(d, 'steel', sx, fy0 + 0.016, sx + 0.036, fy1 - 0.016, 1.653, 1.662, 0.0015);       // commercial baffle louver slats
      }
      box(d, 'frame', 9.615, (fy0 + fy1) * 0.5 - 0.028, 9.635, (fy0 + fy1) * 0.5 + 0.028, 1.651, 1.658, 0.001); // cassette release latch
    });
    box(d, 'glow', 9.665, 3.06, 9.698, 4.05, 1.655, 1.664, 0.002);                             // front warm LED under-hood task light bar
    box(d, 'glow', 9.218, 3.06, 9.252, 4.05, 1.655, 1.664, 0.002);                             // rear warm LED under-hood task light bar
    // Bay 6 (Leftmost / South end, y = 4.152 .. 4.524): Continuous full-height smoked-walnut pantry door with vertical stainless handle
    box(B, 'kitchenCab', 9.738, 4.152, 9.766, 4.524, 0.092, 2.564, 0.004);
    cabHandleV(4.208, 0.84, 1.48);
    // Full-width two-panel architectural ripplefold linen curtain across the 13 m north window (x = 10.5 .. 23.5),
    // hanging from a continuous dark bronze ceiling track and connecting at the 4th (middle) vertical beam at x = 17.00
    // with a tailored center-meet gap that frames the middle mullion. Placed in B so the curtain is shown in outline
    // form during the paper phase before scanning rather than exposing the 3D exterior scene through the window.
    box(B, 'frame', 10.32, 0.150, 23.68, 0.206, 3.568, 3.598, 0.003);
    box(B, 'black', 10.34, 0.170, 23.66, 0.186, 3.564, 3.570, 0.001);
    const kCurtainPanel = (x0, x1, isLeft, seed) => {
      const NX = 440, NZ = 32, z0 = 0.012, z1 = 3.568, cY = 0.178;
      const pos = [], uv = [], idx = [];
      // Precompute cloth arc-length uCloth from the center-meet leading edge (s = 0 at Beam #4) outward to the jamb (s = 1)
      const uArr = new Float32Array(NX + 1);
      const waveAt = (s, t) => {
        // 19 fuller S-waves per panel, gathering tighter near the outer jamb and center master carrier, with organic fold-to-fold sway
        const uWave = s + 0.028 * Math.sin(s * Math.PI) - 0.036 * s * s * s
                    + 0.0055 * Math.sin(s * 31.0 + seed) + 0.0038 * Math.cos(s * 17.0 - seed * 1.3);
        const billow = (1.0 - t) * (0.11 * Math.sin(s * 13.0 + seed) + 0.07 * Math.cos(s * 23.0 - seed));
        const phi = 0.38 * Math.PI + uWave * 19.0 * Math.PI * 2.0 + billow;
        const w1 = Math.sin(phi), w3 = Math.sin(3.0 * phi);
        const foldAmp = 0.86 + 0.24 * Math.sin(s * 27.0 + seed * 2.1) * Math.cos(s * 11.0 - seed);
        const crest = Math.max(-1.0, Math.min(1.0, (w1 + 0.20 * w3) * foldAmp));
        const topPinch = 1.0 - 0.18 * Math.max(0.0, (t - 0.90) / 0.10);
        const depth = (0.036 + 0.012 * (1.0 - t)) * topPinch;
        const hemKick = t < 0.065 ? 0.0055 * Math.pow(1.0 - t / 0.065, 2.0) : 0.0;
        // Inward-curling 3D return fold at the center-meet leading edge (s -> 0) and outer jamb (s -> 1)
        const leadCurl = s < 0.016 ? -0.034 * Math.pow(1.0 - s / 0.016, 1.65) : 0.0;
        const outerCurl = s > 0.984 ? -0.030 * Math.pow((s - 0.984) / 0.016, 1.65) : 0.0;
        const py = cY + crest * depth + hemKick + leadCurl + outerCurl;
        // Omega-pleat X-pinch at inflection points + subtle carrier kiss at Beam #4 (x = 17.00)
        const endFade = Math.min(1.0, s / 0.028) * Math.min(1.0, (1.0 - s) / 0.028);
        const pinch = -0.0125 * Math.sin(2.0 * phi) * (0.74 + 0.26 * (1.0 - t)) * endFade;
        const topKiss = (isLeft ? 1.0 : -1.0) * 0.014 * Math.pow(t, 2.0) * Math.exp(-s / 0.035);
        const px = x0 + (x1 - x0) * (isLeft ? 1.0 - s : s) + (isLeft ? -pinch : pinch) + topKiss;
        return [px, py, crest];
      };
      let acc = 0, prev = waveAt(0, 0.5);
      for (let k = 0; k <= NX; k++) {
        const s = k / NX, cur = waveAt(s, 0.5);
        if (k > 0) acc += Math.hypot(cur[0] - prev[0], cur[1] - prev[1]);
        uArr[isLeft ? NX - k : k] = acc;
        prev = cur;
      }
      for (let j = 0; j <= NZ; j++) {
        const t = j / NZ, pz = z0 + (z1 - z0) * t;
        for (let i = 0; i <= NX; i++) {
          const s = isLeft ? 1.0 - i / NX : i / NX;
          const [px, py, crest] = waveAt(s, t);
          pos.push(WX(px), pz, WZ(py));
          uv.push(100.0 + uArr[i], 100.0 + crest);
        }
      }
      for (let j = 0; j < NZ; j++) {
        for (let i = 0; i < NX; i++) {
          const k = j * (NX + 1) + i;
          idx.push(k, k + 1, k + NX + 1, k + 1, k + NX + 2, k + NX + 1);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      B.add(M.sheerLinen, g);
    };
    kCurtainPanel(10.36, 16.968, true, 1.7);
    kCurtainPanel(17.032, 23.64, false, 4.3);
    });
    // Live-edge solid Black Walnut tree-trunk slab dining table (x = 18.00 .. 23.15, y ~ 3.44 .. 4.56, z = 0.805 .. 0.880),
    // doubling the clearance from the kitchen island counter (1.42 m gap vs 0.62 m) and matching the counter's horizon height,
    // mounted on an integrated sculpted trapezoidal walnut & blackened-bronze through-tenon trestle foundation.
    thing(20.58, 4.0, () => {
      const x0 = 18.00, x1 = 23.15, z0 = 0.805, z1 = 0.880, NX = 112;
      const cos = Math.cos, sin = Math.sin;
      const trunkEdge = (u) => {
        const flare = 0.048 * Math.pow(2.0 * u - 1.0, 4.0) - 0.026 * sin(u * Math.PI);
        const nWave = 0.038 * sin(u * 6.283185 + 0.45) + 0.022 * cos(u * 15.708 - 0.80) + 0.012 * sin(u * 28.274 + 1.2);
        const sWave = 0.042 * sin(u * 6.283185 + 2.35) - 0.024 * cos(u * 12.566 + 0.50) + 0.014 * cos(u * 25.133 - 0.7);
        return [4.00 - (0.505 + flare + nWave), 4.00 + (0.505 + flare + sWave)];
      };
      const ringAt = (u) => {
        const [yN, yS] = trunkEdge(u);
        const slN = 0.038 + 0.012 * sin(u * 18.85 + 0.9), slS = 0.040 + 0.013 * cos(u * 15.71 - 0.4);
        const dz = z1 - z0;
        return [
          [4.00, z1],
          [yN + 0.016, z1],
          [yN + 0.003, z1 - 0.004],
          [yN - slN * 0.28 - 0.006, z1 - dz * 0.26],
          [yN - slN * 0.62 - 0.009, z1 - dz * 0.56],
          [yN - slN * 0.92 - 0.005, z1 - dz * 0.84],
          [yN - slN * 0.86, z0 + 0.004],
          [yN - slN * 0.70, z0],
          [4.00, z0],
          [yS + slS * 0.70, z0],
          [yS + slS * 0.86, z0 + 0.004],
          [yS + slS * 0.92 + 0.005, z1 - dz * 0.84],
          [yS + slS * 0.62 + 0.009, z1 - dz * 0.56],
          [yS + slS * 0.28 + 0.006, z1 - dz * 0.26],
          [yS - 0.003, z1 - 0.004],
          [yS - 0.016, z1],
        ];
      };
      const NP = 16, pos = [], idx = [];
      for (let i = 0; i <= NX; i++) {
        const u = i / NX, ring = ringAt(u);
        for (let j = 0; j < NP; j++) {
          const [py, pz] = ring[j];
          const vF = Math.min(1.0, Math.abs(py - 4.00) / 0.52);
          const endBow = (i === 0 ? -1 : i === NX ? 1 : 0) * 0.012 * (1.0 - vF * vF);
          const px = x0 + (x1 - x0) * u + endBow;
          pos.push(WX(px), pz, WZ(py));
        }
      }
      for (let i = 0; i < NX; i++) {
        const b0 = i * NP, b1 = (i + 1) * NP;
        for (let j = 0; j < NP; j++) {
          const jn = (j + 1) % NP;
          idx.push(b0 + j, b1 + jn, b0 + jn, b0 + j, b1 + j, b1 + jn);
        }
      }
      // West (i = 0) and East (i = NX) end-grain caps with duplicated vertices for crisp crosscut normals
      [0, NX].forEach((iEnd, isEast) => {
        const u = iEnd / NX, ring = ringAt(u), px0 = x0 + (x1 - x0) * u;
        const cIdx = pos.length / 3;
        pos.push(WX(px0 + (isEast ? 0.012 : -0.012)), 0.5 * (z0 + z1), WZ(4.00));
        for (let j = 0; j < NP; j++) {
          const [py, pz] = ring[j], vF = Math.min(1.0, Math.abs(py - 4.00) / 0.52);
          const px = px0 + (isEast ? 1 : -1) * 0.012 * (1.0 - vF * vF);
          pos.push(WX(px), pz, WZ(py));
        }
        for (let j = 0; j < NP; j++) {
          const a = cIdx + 1 + j, b = cIdx + 1 + ((j + 1) % NP);
          if (isEast) idx.push(cIdx, b, a); else idx.push(cIdx, a, b);
        }
      });
      const slabGeo = new THREE.BufferGeometry();
      slabGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      slabGeo.setIndex(idx);
      slabGeo.computeVertexNormals();
      B.add(M.walnutSolid, slabGeo);

      // Four inlaid brushed-brass butterfly bow-tie (Dutchman) keys bridging natural heartwood checks near both ends
      const btShape = new THREE.Shape();
      btShape.moveTo(-0.062, -0.026); btShape.lineTo(-0.008, -0.011); btShape.lineTo(0.008, -0.011); btShape.lineTo(0.062, -0.026);
      btShape.lineTo(0.062, 0.026); btShape.lineTo(0.008, 0.011); btShape.lineTo(-0.008, 0.011); btShape.lineTo(-0.062, 0.026); btShape.closePath();
      const btGeo = new THREE.ExtrudeGeometry(btShape, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.001, bevelSegments: 2 });
      [[18.42, 3.74], [18.74, 4.26], [22.41, 3.74], [22.73, 4.26]].forEach(([bx, by]) => {
        d.add(M.brass, btGeo, new THREE.Matrix4().makeRotationX(-Math.PI / 2).setPosition(WX(bx), z1 - 0.0025, WZ(by)));
      });

      // Helper for tapered trapezoidal walnut pedestal & bolster blocks
      const trapPedestal = (bt, mat, cx, cy, tz0, tz1, dx0, dy0, dx1, dy1) => {
        const xA0 = WX(cx - dx0 * 0.5), xA1 = WX(cx + dx0 * 0.5), zA0 = WZ(cy - dy0 * 0.5), zA1 = WZ(cy + dy0 * 0.5);
        const xB0 = WX(cx - dx1 * 0.5), xB1 = WX(cx + dx1 * 0.5), zB0 = WZ(cy - dy1 * 0.5), zB1 = WZ(cy + dy1 * 0.5);
        const V = [
          [xA0, tz0, zA0], [xA1, tz0, zA0], [xA1, tz0, zA1], [xA0, tz0, zA1],
          [xB0, tz1, zB0], [xB1, tz1, zB0], [xB1, tz1, zB1], [xB0, tz1, zB1],
        ];
        const faces = [[0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7], [4, 5, 6, 7], [3, 2, 1, 0]];
        const pArr = [], iArr = [];
        faces.forEach(([a, b, c, e], fi) => {
          const o = fi * 4;
          pArr.push(...V[a], ...V[b], ...V[c], ...V[e]);
          iArr.push(o, o + 1, o + 2, o, o + 2, o + 3);
        });
        const tg = new THREE.BufferGeometry();
        tg.setAttribute('position', new THREE.Float32BufferAttribute(pArr, 3));
        tg.setIndex(iArr);
        tg.computeVertexNormals();
        bt.add(M[mat], tg);
      };

      // Integrated sculpted architectural trestle foundation at xL = 18.88 and xR = 22.27
      [18.88, 22.27].forEach((px) => {
        box(B, 'black', px - 0.165, 3.59, px + 0.165, 4.41, 0.0, 0.020, 0.003);                  // recessed dark bronze floor plinth
        trapPedestal(B, 'walnutSolid', px, 4.00, 0.018, 0.390, 0.35, 0.84, 0.22, 0.66);          // flared trapezoidal solid-walnut pedestal
        box(B, 'black', px - 0.118, 3.66, px + 0.118, 4.34, 0.386, 0.406, 0.004);                // machined blackened-bronze pedestal cap
        [3.76, 4.24].forEach((py) => {                                                           // twin blackened-bronze vertical columns
          box(B, 'black', px - 0.072, py - 0.056, px + 0.072, py + 0.056, 0.402, 0.760, 0.004);
          box(d, 'brass', px - 0.077, py - 0.061, px + 0.077, py + 0.061, 0.404, 0.418, 0.002);
          box(d, 'brass', px - 0.077, py - 0.061, px + 0.077, py + 0.061, 0.744, 0.758, 0.002);
        });
        box(B, 'black', px - 0.125, 3.61, px + 0.125, 4.39, 0.744, 0.762, 0.004);                // upper bronze saddle plate
        trapPedestal(B, 'walnutSolid', px, 4.00, 0.758, 0.808, 0.24, 0.74, 0.30, 0.88);          // mortised walnut upper saddle bolster
      });
      // Full-span longitudinal solid-walnut through-tenon stretcher spine beam with brass locking wedges & diagonal struts
      box(B, 'walnutSolid', 18.46, 3.925, 22.69, 4.075, 0.210, 0.315, 0.006);
      [18.70, 19.06, 22.09, 22.45].forEach((mx) => box(d, 'black', mx - 0.012, 3.916, mx + 0.012, 4.084, 0.202, 0.323, 0.002));
      [18.57, 22.58].forEach((wx) => box(d, 'brass', wx - 0.014, 3.945, wx + 0.014, 4.055, 0.182, 0.344, 0.003));
      tleg(B, 'walnutSolid', [19.28, 4.00, 0.305], [19.86, 4.00, 0.795], 0.032, 0.036);
      tleg(B, 'walnutSolid', [21.87, 4.00, 0.305], [21.29, 4.00, 0.795], 0.032, 0.036);
      box(B, 'walnutSolid', 19.10, 3.95, 22.05, 4.05, 0.765, 0.808, 0.004);                      // central under-slab longitudinal spine keelson
    });

    // Eight sculpted solid-walnut & cognac saddle-leather dining armchairs (4 north, 4 south along x = 18.65 .. 22.49),
    // proportioned to the 0.880 m live-edge trunk slab: sled floor runners, continuous steam-bent wrap-around walnut crest
    // and armrest rail, central rear walnut spine post, channel-tufted cognac leather bucket backrest, and piped seat cushion.
    let DINING_BACK_N = null, DINING_BACK_S = null, DINING_RAIL_N = null, DINING_RAIL_S = null;
    const chairPlanPt = (u, s) => {
      const au = Math.abs(u), a = u * (Math.PI * 0.52);
      const cx = 0.224 * Math.sin(a);
      const cy = s * (0.205 * Math.cos(a) - 0.155 * Math.pow(au, 1.6));
      return [cx, cy];
    };
    const chairPlanFrame = (u, s) => {
      const [cx, cy] = chairPlanPt(u, s);
      const eps = 0.005;
      const [x1, y1] = chairPlanPt(Math.min(1, u + eps), s);
      const [x0, y0] = chairPlanPt(Math.max(-1, u - eps), s);
      const tx = x1 - x0, ty = y1 - y0, tl = Math.hypot(tx, ty) || 1;
      const nx = -s * ty / tl, ny = s * tx / tl;
      return [cx, cy, nx, ny];
    };
    const diningBackGeo = (s) => {
      if (s < 0 && DINING_BACK_N) return DINING_BACK_N;
      if (s > 0 && DINING_BACK_S) return DINING_BACK_S;
      const NU = 40, NV = 20, pos = [], idx = [], uv = [];
      for (let i = 0; i <= NU; i++) {
        const uRaw = (i / NU) * 2 - 1, u = uRaw * 0.92, au = Math.abs(u);
        const [cx, cy, nx, ny] = chairPlanFrame(u, s);
        const tipTaper = Math.pow(Math.max(0.04, 1 - Math.pow(Math.abs(uRaw), 6.0)), 0.38);
        const zBot = 0.530 + 0.025 * Math.pow(au, 1.4);
        const zTop = 0.855 - 0.115 * Math.pow(au, 1.45);
        const zm = 0.5 * (zBot + zTop), hh = 0.5 * (zTop - zBot) * tipTaper;
        const ht = 0.026 * Math.pow(Math.max(0.08, 1 - 0.42 * u * u), 0.35) * tipTaper;
        for (let j = 0; j <= NV; j++) {
          const phi = (j / NV) * Math.PI * 2;
          const cv = Math.cos(phi), sv = Math.sin(phi);
          const cvP = Math.sign(cv) * Math.pow(Math.abs(cv), 0.80);
          const svP = Math.sign(sv) * Math.pow(Math.abs(sv), 0.78);
          const hFrac = 0.5 * (svP + 1);
          const lean = s * (0.024 * (1 - 0.55 * u * u)) * hFrac;
          const radOff = cvP * ht + lean;
          pos.push(cx + nx * radOff, zm + svP * hh, cy + ny * radOff);
          uv.push(0.5, 0.5);
        }
      }
      for (let i = 0; i < NU; i++) {
        for (let j = 0; j < NV; j++) {
          const k = i * (NV + 1) + j;
          if (s > 0) idx.push(k, k + NV + 1, k + 1, k + 1, k + NV + 1, k + NV + 2);
          else idx.push(k, k + 1, k + NV + 1, k + 1, k + NV + 2, k + NV + 1);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      return s < 0 ? (DINING_BACK_N = g) : (DINING_BACK_S = g);
    };
    const diningRailGeo = (s) => {
      if (s < 0 && DINING_RAIL_N) return DINING_RAIL_N;
      if (s > 0 && DINING_RAIL_S) return DINING_RAIL_S;
      const NU = 44, NV = 16, pos = [], idx = [], uv = [];
      for (let i = 0; i <= NU; i++) {
        const u = (i / NU) * 2 - 1, au = Math.abs(u);
        const [cx, cy, nx, ny] = chairPlanFrame(u, s);
        const tipCap = Math.pow(Math.max(0.03, 1 - Math.pow(au, 12.0)), 0.35);
        const zCenter = 0.862 - 0.115 * Math.pow(au, 1.45);
        const radCenter = s * (0.024 * (1 - 0.55 * u * u)) + s * 0.005;
        const ht = 0.021 * tipCap, hh = 0.016 * tipCap;
        for (let j = 0; j <= NV; j++) {
          const phi = (j / NV) * Math.PI * 2;
          const cv = Math.cos(phi), sv = Math.sin(phi);
          const cvP = Math.sign(cv) * Math.pow(Math.abs(cv), 0.78);
          const svP = Math.sign(sv) * Math.pow(Math.abs(sv), 0.78);
          const radOff = radCenter + cvP * ht;
          pos.push(cx + nx * radOff, zCenter + svP * hh, cy + ny * radOff);
          uv.push(0.5, 0.5);
        }
      }
      for (let i = 0; i < NU; i++) {
        for (let j = 0; j < NV; j++) {
          const k = i * (NV + 1) + j;
          if (s > 0) idx.push(k, k + NV + 1, k + 1, k + 1, k + NV + 1, k + NV + 2);
          else idx.push(k, k + 1, k + NV + 1, k + 1, k + NV + 2, k + NV + 1);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      return s < 0 ? (DINING_RAIL_N = g) : (DINING_RAIL_S = g);
    };
    const chair = (x, y, s) => thing(21.5 + (x - 18.65) * 0.45, y, () => {
      const SH = 0.525;
      // Sculpted dark-walnut sled floor runners, front armrest legs, raked rear legs, and central rear spine post
      [-1, 1].forEach((sx) => {
        rbox(B, 'chairWood', x + sx * 0.224, y + s * 0.018, 0.0, 0.024, 0.026, 0.40, 0.005, 0, 0);                        // side sled floor runner
        tleg(B, 'chairWood', [x + sx * 0.224, y - s * 0.168, 0.018], [x + sx * 0.224, y - s * 0.168, 0.747], 0.015, 0.019); // front leg into walnut armrest tip
        tleg(B, 'chairWood', [x + sx * 0.224, y + s * 0.205, 0.018], [x + sx * 0.212, y + s * 0.185, SH], 0.016, 0.021);    // lower rear leg into seat frame
      });
      rbox(B, 'chairWood', x, y + s * 0.205, 0.0, 0.024, 0.448, 0.026, 0.005, 0, 0);                                      // clean rear floor sled cross-bar
      tleg(B, 'chairWood', [x, y + s * 0.195, SH - 0.035], [x, y + s * 0.232, 0.862], 0.022, 0.017);                      // central vertical walnut back spine
      // Sculpted dark-walnut under-seat cradle & plush cognac saddle-leather seat cushion with waterfall front
      rbox(B, 'chairWood', x, y - s * 0.008, SH - 0.048, SH - 0.004, 0.455, 0.425, 0.008, 0, 0);
      rbox(B, 'leather', x, y - s * 0.012, SH - 0.008, SH + 0.046, 0.436, 0.415, 0.022, 0, 0);
      ball(B, 'leather', x, y - s * 0.012, SH + 0.042, 0.212, 0.10, 1.02, 0.96);
      // Upholstered cognac saddle-leather wrap-around bucket backrest & continuous steam-bent walnut crest/armrest rail
      B.add(M.leather, diningBackGeo(s), FX.M(WX(x), 0, WZ(y)));
      B.add(M.chairWood, diningRailGeo(s), FX.M(WX(x), 0, WZ(y)));
    });
    [18.65, 19.93, 21.21, 22.49].forEach((x) => { chair(x, 3.24, -1); chair(x, 4.76, 1); });

    // Curated dining tabletop styling: tailored oatmeal Belgian linen runner with stone selvedge hem,
    // central carved 44-flute Roman travertine bowl filled with figs, pears, lemons, and apples,
    // flanked by two pairs of architectural travertine & brushed-brass pillar candle holders.
    thing(20.58, 4.0, () => {
      const rz = 0.8805;
      // Tailored oatmeal Belgian linen table runner with warm stone selvedge borders
      box(d, 'wool', 18.72, 3.840, 22.44, 4.160, rz, rz + 0.006, 0.002);
      box(d, 'flutedBowl', 18.70, 3.826, 22.46, 3.842, rz, rz + 0.0065, 0.0015);
      box(d, 'flutedBowl', 18.70, 4.158, 22.46, 4.174, rz, rz + 0.0065, 0.0015);
      box(d, 'flutedBowl', 18.70, 3.826, 18.724, 4.174, rz, rz + 0.0065, 0.0015);
      box(d, 'flutedBowl', 22.436, 3.826, 22.46, 4.174, rz, rz + 0.0065, 0.0015);
      // Keep exact throwaway sprigs calls so downstream shared R() calls remain identical
      [[18.6, 0.75], [20.2, 1.0], [21.8, 0.7]].forEach(([x, s]) => sprigs(tagged(new FX.Batch()), x, 4.0, 0.766 + 0.5 * s, 0.6 * s + 0.2, 5));

      // Centerpiece carved 44-flute Roman travertine bowl at (20.58, 4.00) with sculpted fruits
      const bx = 20.58, by = 4.00, bz = rz + 0.0055;
      const dProf = [
        [0.0, 0.0], [0.105, 0.0], [0.108, 0.018], [0.098, 0.022],
        [0.135, 0.032], [0.178, 0.048], [0.214, 0.068], [0.236, 0.088], [0.244, 0.104],
        [0.238, 0.108], [0.226, 0.104], [0.198, 0.076], [0.154, 0.052], [0.096, 0.036], [0.0, 0.032]
      ];
      const NA = 160, NR = dProf.length, bPos = [], bIdx = [];
      for (let j = 0; j < NR; j++) {
        const [r0, h0] = dProf[j], isExt = j >= 4 && j <= 9;
        const fluteAmp = isExt ? 0.0040 * Math.sin(((j - 3.5) / 6.0) * Math.PI) : 0;
        for (let i = 0; i <= NA; i++) {
          const a = (i / NA) * Math.PI * 2, r = r0 + fluteAmp * Math.cos(a * 44);
          bPos.push(Math.cos(a) * r, h0, Math.sin(a) * r);
        }
      }
      for (let j = 0; j < NR - 1; j++) {
        for (let i = 0; i < NA; i++) {
          const k = j * (NA + 1) + i;
          bIdx.push(k, k + NA + 1, k + 1, k + 1, k + NA + 1, k + NA + 2);
        }
      }
      const dbGeo = new THREE.BufferGeometry();
      dbGeo.setAttribute('position', new THREE.Float32BufferAttribute(bPos, 3));
      dbGeo.setIndex(bIdx);
      dbGeo.computeVertexNormals();
      d.add(M.flutedBowl, dbGeo, FX.M(WX(bx), bz, WZ(by)));

      const mkLathe = (pts, seg) => new THREE.LatheGeometry(new THREE.SplineCurve(pts.map(([r, y]) => new THREE.Vector2(r, y))).getPoints(18).map((v) => new THREE.Vector2(Math.max(0, v.x), v.y)), seg || 24);
      const dPear = mkLathe([[0, -0.040], [0.020, -0.038], [0.035, -0.020], [0.033, 0.002], [0.021, 0.022], [0.014, 0.040], [0.008, 0.052], [0, 0.055]], 24);
      const dLemon = mkLathe([[0, -0.044], [0.006, -0.040], [0.013, -0.032], [0.026, -0.016], [0.030, 0], [0.026, 0.016], [0.013, 0.032], [0.006, 0.040], [0, 0.044]], 24);
      const dApple = mkLathe([[0, -0.033], [0.020, -0.035], [0.035, -0.022], [0.040, 0.002], [0.036, 0.024], [0.022, 0.036], [0.007, 0.032], [0, 0.028]], 24);
      const dFig = mkLathe([[0, -0.022], [0.015, -0.020], [0.023, -0.007], [0.021, 0.007], [0.011, 0.020], [0.005, 0.028], [0, 0.031]], 22);
      // Black Mission purple figs on the left of the bowl
      [[-0.135, 0.010, 0.088, 0.2, 0.4, -0.2, 1.05], [-0.105, -0.042, 0.086, -0.2, 1.1, 0.3, 1.00], [-0.095, 0.048, 0.088, 0.3, 1.8, -0.3, 1.00],
       [-0.055, -0.015, 0.096, 0.1, 0.7, 0.2, 1.04], [-0.155, -0.025, 0.084, 0.4, 2.2, 0.1, 0.94]].forEach(([dx, dy, dz, rx, ry, rz, sc]) => {
        d.add(M.figFruit, dFig, FX.M(WX(bx + dx), bz + dz, WZ(by + dy), rx, ry, rz, sc, sc, sc));
      });
      // Anjou pears in the center with woody stems
      [[-0.015, 0.018, 0.094, 0.20, 0.5, -0.18, 1.02], [0.028, -0.032, 0.092, -0.18, 1.3, 0.24, 0.98], [0.042, 0.038, 0.096, 0.15, 2.1, -0.15, 0.95]].forEach(([dx, dy, dz, rx, ry, rz, sc]) => {
        const px = bx + dx, py = by + dy, pz = bz + dz;
        d.add(M.pear, dPear, FX.M(WX(px), pz, WZ(py), rx, ry, rz, sc, sc, sc));
        rod(d, 'twig', [px, py, pz + 0.044 * sc], [px + 0.006, py - 0.005, pz + 0.064 * sc], 0.0022);
      });
      // Amalfi lemons & Honeycrisp apples on the right of the bowl
      [[0.085, -0.015, 0.088, 0.4, 0.3, 1.1, 1.00], [0.125, 0.025, 0.090, -0.3, 0.6, 0.9, 0.96], [0.065, -0.055, 0.086, 0.5, -0.2, 1.2, 0.94]].forEach(([dx, dy, dz, rx, ry, rz, sc]) => {
        d.add(M.lemon, dLemon, FX.M(WX(bx + dx), bz + dz, WZ(by + dy), rx, ry, rz, sc, sc, sc));
      });
      [[0.145, -0.020, 0.090, 0.12, 0.6, -0.10, 1.00], [0.105, 0.050, 0.088, -0.15, 1.5, 0.16, 0.95]].forEach(([dx, dy, dz, rx, ry, rz, sc]) => {
        const ax = bx + dx, ay = by + dy, az = bz + dz;
        d.add(M.apple, dApple, FX.M(WX(ax), az, WZ(ay), rx, ry, rz, sc, sc, sc));
        rod(d, 'twig', [ax, ay, az + 0.026 * sc], [ax - 0.004, ay + 0.004, az + 0.042 * sc], 0.0020);
      });
      [[-0.08, 0.0, 'figFruit'], [0.0, 0.0, 'pear'], [0.08, 0.0, 'lemon']].forEach(([dx, dy, m]) => ball(d, m, bx + dx, by + dy, bz + 0.062, 0.036, 0.80));

      // Two pairs of architectural Roman travertine & brushed-brass pillar candle holders flanking the centerpiece bowl
      [
        [19.48, 3.97, 0.072, 0.086],
        [19.62, 4.04, 0.118, 0.102],
        [21.54, 4.04, 0.118, 0.102],
        [21.68, 3.97, 0.072, 0.086],
      ].forEach(([cx, cy, ph, ch]) => {
        cyl(d, 'flutedBowl', cx, cy, bz, bz + ph, 0.035, 0.026, 28);                                    // tapered carved travertine pedestal
        cyl(d, 'brass', cx, cy, bz + ph, bz + ph + 0.010, 0.028, 0.038, 28);                            // flared brushed-brass candle cup
        cyl(d, 'brass', cx, cy, bz + ph + 0.010, bz + ph + 0.016, 0.040, 0.040, 32);                    // brass wax drip bobeche saucer
        d.add(M.brass, new THREE.TorusGeometry(0.039, 0.003, 10, 32), FX.M(WX(cx), bz + ph + 0.013, WZ(cy), Math.PI / 2, 0, 0));
        const cz0 = bz + ph + 0.016, cz1 = cz0 + ch;
        cyl(d, 'stoneW', cx, cy, cz0, cz1, 0.028, 0.0275, 28);                                          // thick ivory beeswax pillar candle
        d.add(M.stoneW, new THREE.TorusGeometry(0.0245, 0.003, 10, 28), FX.M(WX(cx), cz1, WZ(cy), Math.PI / 2, 0, 0));
        cyl(d, 'black', cx, cy, cz1 - 0.002, cz1 + 0.008, 0.0016, 0.0012, 8);                           // charred cotton wick
        ball(d, 'glow', cx, cy, cz1 + 0.017, 0.0065, 2.2);                                              // bright inner candle flame
        ball(d, 'flame', cx, cy, cz1 + 0.020, 0.0105, 1.9);                                             // warm outer flame halo
      });
    });
    [19.00, 20.58, 22.16].forEach((x) => pendant(d, x, 4.0, 3.6, 1.84, 0.31, 'dome'));
    lamp('kitchen', 20.58, 4.0, 2.28, 0xffd6a0, 2.4, 8);                  // warm pool over the live-edge trunk slab
    lamp('kitchen', 10.35, 3.55, 1.48, 0xffd296, 0.55, 3.6);             // warm task fill outside the cooking alcove
    // The wine room behind its glass (16 Oct, Sam: "a view of a nice wine cellar that would look premium". The walk now
    // turns to it from the far end of the table, before the patio). Walls in smoked oak; the east wall a backlit wall of
    // bottles lying on black steel rails, three bays of nine rows, necks toward you, their capsules a scatter of gold,
    // claret, black and cream; the side walls shelves of bottles standing label out, lit from under each shelf; in the
    // middle a tasting table of travertine on a black plinth with a decanter and four glasses, a brass pendant over it.
    // (Until then: two dark boards and nine rows of black cylinders.) Its own random numbers.
    {
      const Rw = FX.rng(808);
      if (!M.bottle) Object.assign(M, {
        bottle: D(new THREE.MeshPhysicalMaterial({ color: 0x101c15, roughness: 0.10, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.45 })),
        capGold: D(P({ color: 0xba9254, metalness: 0.92, roughness: 0.28, envMapIntensity: 1.25 })),
        capRed: D(P({ color: 0x621622, metalness: 0.35, roughness: 0.38, envMapIntensity: 0.85 })),
        capCream: D(P({ color: 0xe8dec8, roughness: 0.55 })),
        label: D(P({ color: 0xede4d2, roughness: 0.82 })),
        clearGlass: D(new THREE.MeshPhysicalMaterial({ color: 0x4f5958, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0.01, envMapIntensity: 2.2 })),
        redWine: D(new THREE.MeshPhysicalMaterial({ color: 0x3a0610, roughness: 0.05, clearcoat: 1, envMapIntensity: 1.2 })),
      });
      if (!M.bottleG) Object.assign(M, {
        bottleG: D(new THREE.MeshPhysicalMaterial({ color: 0x243416, roughness: 0.10, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.45 })),
        bottleA: D(new THREE.MeshPhysicalMaterial({ color: 0x38220e, roughness: 0.10, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.45 })),
        cheese: D(P({ color: 0xe8d6a8, roughness: 0.7 })),
        grape: D(new THREE.MeshPhysicalMaterial({ color: 0x2a0f22, roughness: 0.3, clearcoat: 0.6, envMapIntensity: 0.8 })),
      });
      if (!M.wineWood) Object.assign(M, {
        wineWood: D(P({ color: 0x422a1b, roughness: 0.38, envMapIntensity: 0.92 })),
        wineCrate: D(P({ color: 0xb59164, roughness: 0.54, envMapIntensity: 0.55 })),
      });
      const CAPS = ['capGold', 'capRed', 'black', 'capCream', 'capRed', 'capGold'], GLASS = ['bottle', 'bottle', 'bottleG', 'bottleA'];
      // Turned high-craft bottle profiles with linear height uv.y = y / hMax so wrapped estate labels sit strictly on the cylinder belly
      const lt = (pts, hMax) => {
        const g = new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), 16);
        const p = g.attributes.position, uv = g.attributes.uv;
        for (let i = 0; i < p.count; i++) uv.setY(i, Math.max(0, Math.min(1, p.getY(i) / hMax)));
        return g;
      };
      const BORD = lt([[0, 0], [0.035, 0.002], [0.038, 0.018], [0.038, 0.065], [0.038, 0.125], [0.038, 0.188], [0.035, 0.214], [0.021, 0.240], [0.0142, 0.258], [0.0142, 0.296], [0.0155, 0.300], [0.0142, 0.304], [0, 0.304]], 0.304);
      const BURG = lt([[0, 0], [0.041, 0.002], [0.043, 0.020], [0.043, 0.062], [0.043, 0.112], [0.043, 0.145], [0.034, 0.198], [0.019, 0.242], [0.0142, 0.260], [0.0142, 0.296], [0.0155, 0.300], [0.0142, 0.304], [0, 0.304]], 0.304);
      const MAG = lt([[0, 0], [0.050, 0.003], [0.054, 0.026], [0.054, 0.100], [0.054, 0.195], [0.054, 0.285], [0.048, 0.326], [0.026, 0.368], [0.019, 0.392], [0.019, 0.445], [0.0205, 0.450], [0.019, 0.454], [0, 0.454]], 0.454);
      const CAP = new THREE.CylinderGeometry(0.0152, 0.0152, 0.054, 14), CAPM = new THREE.CylinderGeometry(0.020, 0.020, 0.068, 16);
      // Orient each bottle along axis u so that its wrapped estate label (local -Z in LatheGeometry, uv.x = 0.5) faces frontDir
      const bottleAt = (bt, p, u, cap, kind, frontDir) => {
        const up = u.clone().normalize();
        const fHint = frontDir ? frontDir.clone() : new V3(-1, 0.4, 0);
        let left = new V3().crossVectors(fHint, up);
        if (left.lengthSq() < 1e-5) left.set(0, 0, -1); else left.normalize();
        const front = new V3().crossVectors(up, left).normalize();
        const back = front.clone().negate();
        const rotM = new THREE.Matrix4().makeBasis(left, up, back);
        const q = new THREE.Quaternion().setFromRotationMatrix(rotM);
        const at = (o) => new THREE.Matrix4().compose(p.clone().addScaledVector(up, o), q, new V3(1, 1, 1));
        const mag = kind === 2;
        bt.add(M[GLASS[(Rw() * GLASS.length) | 0]], mag ? MAG : kind ? BURG : BORD, at(0));
        bt.add(M[cap], mag ? CAPM : CAP, at(mag ? 0.428 : 0.282));
      };
      // 1. Bespoke solid American Walnut perimeter joinery, pilasters, counter ledge, and coffered walnut ceiling frieze
      thing(26.0, 4.0, () => {
        box(B, 'wineWood', 25.12, 0.20, 28.87, 0.245, 0, 3.55, 0.004);
        box(B, 'wineWood', 28.82, 0.20, 28.87, 7.80, 0, 3.55, 0.004);
        box(B, 'wineWood', 25.12, 7.755, 28.87, 7.80, 0, 3.55, 0.004);
        // Coffered walnut crown cornice & vertical fin frieze above the wine bays (z = 2.74 .. 3.55)
        box(B, 'wineWood', 28.44, 0.24, 28.84, 7.76, 2.72, 2.77, 0.004);
        box(B, 'brass', 28.432, 0.24, 28.445, 7.76, 2.732, 2.758, 0.0015);
        box(B, 'wineWood', 28.44, 0.24, 28.84, 7.76, 3.50, 3.55, 0.004);
        for (let y = 0.30; y < 7.70; y += 0.085) box(d, 'wineWood', 28.68, y, 28.83, y + 0.042, 2.77, 3.50, 0.003);
        // Side wall upper walnut cornice beams
        box(B, 'wineWood', 25.14, 0.22, 28.46, 0.62, 2.72, 2.77, 0.004);
        box(B, 'wineWood', 25.14, 7.38, 28.46, 7.78, 2.72, 2.77, 0.004);
        // Four full-height fluted walnut pilasters dividing the three east-wall collector bays
        [0.44, 2.80, 5.20, 7.56].forEach((yp) => {
          box(B, 'wineWood', 28.44, yp - 0.065, 28.84, yp + 0.065, 0, 2.74, 0.004);
          box(d, 'brass', 28.432, yp - 0.018, 28.444, yp + 0.018, 0.06, 2.70, 0.0015);
          box(B, 'brass', 28.428, yp - 0.072, 28.845, yp + 0.072, 0, 0.045, 0.002);
        });
        // Continuous waist-height walnut counter ledge across the east wall (z = 0.88 .. 0.93)
        box(B, 'wineWood', 28.38, 0.38, 28.84, 7.62, 0.88, 0.935, 0.005);
        box(d, 'brass', 28.374, 0.38, 28.384, 7.62, 0.895, 0.920, 0.0015);
      });
      // 2. East wall: Three backlit Honey Onyx / Alabaster collector bays with angled walnut display cradles,
      // warm concealed LED cove strips, lower diamond X-bin walnut cubbies, and stamped wooden OWC wine cases
      const tiltDir = new V3(0.52, 0.854, 0).normalize();                       // collector easel angle: base in front cradle, neck leaning up & back
      const tiltFront = new V3(-0.854, 0.52, 0).normalize();                    // label normal facing out toward viewer & up toward cove lights
      [[0.52, 2.72], [2.88, 5.12], [5.28, 7.48]].forEach(([y0, y1], bay) => thing(26.6, (y0 + y1) / 2, () => {
        const ym = (y0 + y1) / 2;
        // Backlit honey-onyx alabaster luminous panel behind the upper angled display racks
        box(d, 'bayGlow', 28.79, y0, 28.82, y1, 0.95, 2.68, 0.001);
        // Lower section (z = 0.05 .. 0.88): Recessed walnut carcass with diamond X-bin bulk bottle cubbies & OWC wooden crates
        box(B, 'black', 28.46, y0, 28.48, y1, 0, 0.05, 0.002);
        box(d, 'wineWood', 28.46, y0 + 0.72, 28.82, y0 + 0.75, 0.05, 0.88, 0.003);
        box(d, 'wineWood', 28.46, y1 - 0.75, 28.82, y1 - 0.72, 0.05, 0.88, 0.003);
        // Left & right lower cubbies: diagonal walnut X-bin crosses + stacked bulk bottles
        [[y0 + 0.02, y0 + 0.71], [y1 - 0.71, y1 - 0.02]].forEach(([ya, yb]) => {
          const yc = (ya + yb) / 2;
          rod(d, 'wineWood', [28.47, ya + 0.02, 0.07], [28.47, yb - 0.02, 0.86], 0.012);
          rod(d, 'wineWood', [28.47, yb - 0.02, 0.07], [28.47, ya + 0.02, 0.86], 0.012);
          rod(d, 'wineWood', [28.72, ya + 0.02, 0.07], [28.72, yb - 0.02, 0.86], 0.012);
          rod(d, 'wineWood', [28.72, yb - 0.02, 0.07], [28.72, ya + 0.02, 0.86], 0.012);
          // Staged bottles nestled inside the lower walnut diamond X-bins
          [[yc, 0.16], [yc - 0.09, 0.23], [yc + 0.09, 0.23], [yc, 0.64], [yc - 0.09, 0.71], [yc + 0.09, 0.71], [ya + 0.14, 0.45], [yb - 0.14, 0.45]].forEach(([by, bz]) =>
            bottleAt(d, new V3(WX(28.77), bz, WZ(by)), new V3(-1, 0, 0), CAPS[(Rw() * CAPS.length) | 0], Rw() < 0.35 ? 1 : 0, new V3(0, 1, 0))
          );
        });
        // Center lower cubby (y0 + 0.76 .. y1 - 0.76): Two stacked pine/oak Original Wooden Wine Crates (OWC) with recessed handles
        box(d, 'wineWood', 28.46, y0 + 0.75, 28.82, y1 - 0.75, 0.45, 0.48, 0.003);
        [0.06, 0.49].forEach((zc) => {
          box(d, 'wineCrate', 28.47, y0 + 0.79, 28.79, y1 - 0.79, zc, zc + 0.36, 0.004);
          box(d, 'black', 28.465, ym - 0.11, 28.475, ym + 0.11, zc + 0.24, zc + 0.28, 0.001);
          box(d, 'brass', 28.464, y0 + 0.82, 28.472, y0 + 0.86, zc + 0.03, zc + 0.33, 0.001);
          box(d, 'brass', 28.464, y1 - 0.86, 28.472, y1 - 0.82, zc + 0.03, zc + 0.33, 0.001);
        });
        // Upper section (z = 0.95 .. 2.70): Four tiers of angled walnut display cradles holding tilted collector bottles
        [1.00, 1.42, 1.84, 2.26].forEach((z, rowIdx) => {
          if (bay === 1 && (rowIdx === 1 || rowIdx === 2)) return;               // leave central collector niche open in middle bay
          // Front walnut heel cradle rail with brushed-brass retaining lip, plus rear walnut neck rest beam
          box(d, 'wineWood', 28.45, y0, 28.56, y1, z - 0.032, z + 0.004, 0.003);
          box(d, 'brass', 28.442, y0, 28.454, y1, z - 0.012, z + 0.015, 0.0015);
          box(d, 'wineWood', 28.66, y0, 28.76, y1, z + 0.125, z + 0.160, 0.003);
          box(d, 'glow', 28.48, y0 + 0.03, 28.52, y1 - 0.03, z - 0.040, z - 0.032, 0.001);
          // Angled collector bottles with cream-and-gold estate labels facing outward toward the viewer
          for (let y = y0 + 0.095; y < y1 - 0.075; y += 0.125) {
            const kind = Rw() < 0.35 ? 1 : 0;
            bottleAt(d, new V3(WX(28.50), z + 0.005, WZ(y)), tiltDir, CAPS[(Rw() * CAPS.length) | 0], kind, tiltFront);
          }
        });
        // Middle Bay Collector's Feature Niche (z = 1.38 .. 2.16): Heavy walnut & brass display deck with standing Magnums & angled rares
        if (bay === 1) {
          box(d, 'wineWood', 28.40, y0, 28.80, y1, 1.36, 1.405, 0.004);
          box(d, 'brass', 28.392, y0, 28.404, y1, 1.365, 1.400, 0.0015);
          box(d, 'wineWood', 28.42, y0, 28.80, y1, 2.12, 2.155, 0.004);
          box(d, 'glow', 28.45, y0 + 0.04, 28.49, y1 - 0.04, 2.11, 2.12, 0.001);
          // Three standing collector Magnum bottles on turned walnut & brass presentation coasters in the center
          [ym - 0.34, ym, ym + 0.34].forEach((y, k) => {
            cyl(d, 'brass', 28.60, y, 1.405, 1.418, 0.066, 0.068, 24);
            cyl(d, 'wineWood', 28.60, y, 1.418, 1.428, 0.060, 0.062, 24);
            bottleAt(d, new V3(WX(28.60), 1.428, WZ(y)), new V3(0, 1, 0), ['capGold', 'capRed', 'capGold'][k], 2, new V3(-1, 0, 0));
          });
          // Flanking angled walnut cradles on left and right of the Magnums holding rare Bordeaux vintages
          [[y0 + 0.16, y0 + 0.30, y0 + 0.44], [y1 - 0.44, y1 - 0.30, y1 - 0.16]].forEach((ys) => {
            box(d, 'wineWood', 28.46, ys[0] - 0.07, 28.55, ys[2] + 0.07, 1.405, 1.435, 0.003);
            box(d, 'brass', 28.452, ys[0] - 0.07, 28.462, ys[2] + 0.07, 1.420, 1.445, 0.0015);
            box(d, 'wineWood', 28.64, ys[0] - 0.07, 28.74, ys[2] + 0.07, 1.53, 1.565, 0.003);
            ys.forEach((yb, idx) => bottleAt(d, new V3(WX(28.50), 1.435, WZ(yb)), tiltDir, idx === 1 ? 'capGold' : 'capRed', idx % 2, tiltFront));
          });
        }
        // Top cove LED strip beneath the walnut bay header
        box(d, 'glow', 28.48, y0 + 0.03, 28.52, y1 - 0.03, 2.69, 2.71, 0.001);
      }));
      // 3. North & South side walls: Bespoke walnut wine racking with angled collector rows, upper vertical cubbies,
      // warm under-shelf LED lighting, and continuous rows of stamped OWC wooden wine crates below
      [[0.24, 1], [7.76, -1]].forEach(([yw, f]) => thing(26.3, yw + f * 0.22, () => {
        const yf = yw + f * 0.36;
        // Side wall vertical walnut end pilasters and intermediate dividers
        [25.36, 26.38, 27.40, 28.42].forEach((xp) => {
          box(B, 'wineWood', xp - 0.025, Math.min(yw, yf), xp + 0.025, Math.max(yw, yf), 0, 2.74, 0.003);
          box(d, 'brass', xp - 0.008, yf - f * 0.008, xp + 0.008, yf, 0.06, 2.70, 0.001);
        });
        // Waist-height walnut counter ledge & lower shelf (z = 0.88 .. 0.92 and z = 0.44 .. 0.47)
        box(B, 'wineWood', 25.36, Math.min(yw, yf + f * 0.03), 28.42, Math.max(yw, yf + f * 0.03), 0.88, 0.925, 0.004);
        box(d, 'wineWood', 25.38, Math.min(yw, yf), 28.40, Math.max(yw, yf), 0.44, 0.47, 0.003);
        // Lower wooden wine crates (OWC) across all three bays on two tiers
        [25.87, 26.89, 27.91].forEach((xc) => {
          [0.05, 0.48].forEach((zc) => {
            box(d, 'wineCrate', xc - 0.42, Math.min(yw + f * 0.03, yf - f * 0.02), xc + 0.42, Math.max(yw + f * 0.03, yf - f * 0.02), zc, zc + 0.36, 0.004);
            box(d, 'black', xc - 0.09, yf - f * 0.022, xc + 0.09, yf - f * 0.015, zc + 0.24, zc + 0.28, 0.001);
          });
        });
        // Two angled collector display shelves (z = 1.00 and z = 1.42) with tilted bottles facing into the cellar
        const sTilt = new V3(0, 0.854, -f * 0.52).normalize();
        const sFront = new V3(-0.28, 0.50, f * 0.82).normalize();
        [1.00, 1.42].forEach((z) => {
          box(d, 'wineWood', 25.38, Math.min(yw + f * 0.25, yf), 28.40, Math.max(yw + f * 0.25, yf), z - 0.032, z + 0.004, 0.003);
          box(d, 'brass', 25.38, yf - f * 0.008, 28.40, yf + f * 0.004, z - 0.012, z + 0.015, 0.0015);
          box(d, 'wineWood', 25.38, Math.min(yw + f * 0.06, yw + f * 0.16), 28.40, Math.max(yw + f * 0.06, yw + f * 0.16), z + 0.125, z + 0.160, 0.003);
          box(d, 'glow', 25.40, yf - f * 0.03, 28.38, yf - f * 0.015, z - 0.040, z - 0.032, 0.001);
          for (let x = 25.50; x < 28.32; x += 0.125) {
            if (Math.abs(x - 26.38) < 0.06 || Math.abs(x - 27.40) < 0.06) continue;
            bottleAt(d, new V3(WX(x), z + 0.005, WZ(yf - f * 0.06)), sTilt, CAPS[(Rw() * CAPS.length) | 0], Rw() < 0.38 ? 1 : 0, sFront);
          }
        });
        // Two upper shelves (z = 1.88 and z = 2.30) with standing collector bottles behind a brushed-brass retaining rail
        [1.88, 2.30].forEach((z) => {
          box(d, 'wineWood', 25.38, Math.min(yw, yf), 28.40, Math.max(yw, yf), z - 0.032, z, 0.003);
          box(d, 'glow', 25.40, yf - f * 0.025, 28.38, yf - f * 0.012, z - 0.038, z - 0.032, 0.001);
          rod(d, 'brass', [25.38, yf - f * 0.02, z + 0.095], [28.40, yf - f * 0.02, z + 0.095], 0.0045);
          for (let x = 25.50; x < 28.32; x += 0.13) {
            if (Math.abs(x - 26.38) < 0.06 || Math.abs(x - 27.40) < 0.06) continue;
            bottleAt(d, new V3(WX(x), z, WZ(yw + f * 0.18)), new V3(0, 1, 0), CAPS[(Rw() * CAPS.length) | 0], Rw() < 0.4 ? 1 : 0, new V3(-0.32, 0, f * 0.95));
          }
        });
      }));
      // 4. Central Tasting Island: Honed Roman travertine slab on a fluted American Walnut & brushed-brass pedestal base,
      // styled with a walnut serving tray, crystal red-wine decanter, four long-stemmed glasses, open bottle & cork,
      // dark slate cheese & grape board, and spun-brass champagne chiller bucket
      thing(27.6, 4.0, () => {
        // Stepped brushed-brass floor plinth and recessed dark shadow reveal
        box(B, 'brass', 26.54, 3.54, 27.46, 4.46, 0, 0.042, 0.003);
        box(B, 'black', 26.57, 3.57, 27.43, 4.43, 0.042, 0.062, 0.002);
        // Solid walnut pedestal core with upper brushed-brass collar under the travertine slab
        box(B, 'wineWood', 26.58, 3.58, 27.42, 4.42, 0.062, 0.858, 0.005);
        box(B, 'brass', 26.565, 3.565, 27.435, 4.435, 0.858, 0.880, 0.003);
        for (let k = 0; k < 9; k++) {
          const o = -0.36 + k * 0.09;
          [[26.58, 1], [27.42, -1]].forEach(([x, sd]) => cyl(d, 'wineWood', x - sd * 0.009, 4.0 + o, 0.065, 0.855, 0.024, 0.024, 12));
          [[3.58, 1], [4.42, -1]].forEach(([y, sd]) => cyl(d, 'wineWood', 27.0 + o, y - sd * 0.009, 0.065, 0.855, 0.024, 0.024, 12));
        }
        // Thick honed Roman travertine tasting countertop with chamfered edges
        d.add(M.travBlock, FX.bevelBox(1.64, 0.084, 1.08, 0.018), FX.M(WX(27.0), 0.922, WZ(4.0)));
        // Walnut decanter tray with brass corner inlays
        box(d, 'wineWood', 26.54, 3.60, 27.12, 3.99, 0.964, 0.980, 0.004);
        box(d, 'brass', 26.536, 3.596, 27.124, 3.994, 0.965, 0.974, 0.0015);
        // Crystal red-wine decanter with ruby wine & faceted glass stopper
        lathe(d, 'redWine', 26.75, 3.80, 0.980, [[0, 0], [0.112, 0], [0.128, 0.026], [0.122, 0.054], [0.0, 0.054]]);
        lathe(d, 'clearGlass', 26.75, 3.80, 0.980, [[0.126, 0.05], [0.102, 0.088], [0.045, 0.135], [0.022, 0.205], [0.020, 0.312], [0.028, 0.332], [0.0, 0.332]]);
        ball(d, 'clearGlass', 26.75, 3.80, 1.332, 0.022, 1.15);
        // Four long-stemmed crystal Bordeaux tasting glasses
        [[26.95, 3.70], [27.04, 3.88], [26.62, 3.66], [26.92, 3.92]].forEach(([x, y]) =>
          lathe(d, 'clearGlass', x, y, 0.980, [[0, 0], [0.038, 0], [0.038, 0.004], [0.0045, 0.010], [0.0045, 0.125], [0.035, 0.155], [0.047, 0.205], [0.041, 0.255], [0.0, 0.255]])
        );
        // Open vintage Burgundy bottle & natural cork on the table
        bottleAt(d, new V3(WX(27.25), 0.964, WZ(3.80)), new V3(0, 1, 0), 'capRed', 1, new V3(-1, 0, 0));
        cyl(d, 'cheese', 27.33, 3.92, 0.964, 1.002, 0.011, 0.011, 12);
        // Dark honed slate charcuterie & cheese board with aged cheese wedges and dark grapes
        box(d, 'black', 26.58, 4.10, 26.99, 4.39, 0.964, 0.980, 0.003);
        [[26.70, 4.20], [26.80, 4.28], [26.88, 4.18]].forEach(([x, y], k) =>
          d.add(M.cheese, new THREE.CylinderGeometry(0.052, 0.052, 0.042, 3, 1, false, 0, 0.92), FX.M(WX(x), 1.000, WZ(y), 0, k * 1.7, 0))
        );
        for (let k = 0; k < 14; k++) ball(d, 'grape', 26.90 + (Rw() - 0.5) * 0.08, 4.28 + (Rw() - 0.5) * 0.07, 0.994 + Rw() * 0.03, 0.0095);
        // Spun-brass champagne chiller bucket with an angled gold-capsule bottle
        lathe(d, 'brass', 27.22, 4.20, 0.964, [[0, 0], [0.072, 0], [0.088, 0.022], [0.098, 0.205], [0.104, 0.225], [0.092, 0.225], [0.082, 0.04], [0, 0.03]]);
        bottleAt(d, new V3(WX(27.22), 0.994, WZ(4.20)), new V3(0.15, 1, 0).normalize(), 'capGold', 0, new V3(-1, 0.15, 0));
      });
      // 5. Pair of bespoke sculpted cognac saddle-leather, walnut & brushed-brass tasting barstools
      [[26.42, 4.74, 0.36], [27.58, 4.74, -0.36]].forEach(([x, y, rot]) => thing(x + 0.9, y, () => {
        const SH = 0.62;
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) =>
          tleg(B, 'wineWood', [x + sx * 0.195, y + sy * 0.190, 0], [x + sx * 0.155, y + sy * 0.150, SH - 0.015], 0.014, 0.024)
        );
        cyl(B, 'wineWood', x, y, SH - 0.034, SH + 0.002, 0.206, 0.196, 32);
        cyl(B, 'leather', x, y, SH, SH + 0.050, 0.208, 0.202, 32);
        ball(B, 'leather', x, y, SH + 0.046, 0.204, 0.12, 1.0, 0.98);
        B.add(M.leather, new THREE.TorusGeometry(0.204, 0.007, 12, 36), FX.M(WX(x), SH + 0.005, WZ(y), Math.PI / 2, 0, 0));
        B.add(M.leather, stoolBackGeo(), FX.M(WX(x), 0.01, WZ(y), 0, rot, 0));
        const fz = 0.24;
        B.add(M.brass, new THREE.TorusGeometry(0.180, 0.009, 14, 44), FX.M(WX(x), fz, WZ(y), Math.PI / 2, 0, 0));
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) =>
          rod(B, 'brass', [x + sx * 0.12, y + sy * 0.12, fz], [x + sx * 0.16, y + sy * 0.16, fz], 0.006)
        );
      }));
      // 6. Framed central glass cellar door in the middle bay (y = 2.867 .. 5.133) of the three equal bronze-framed panels
      thing(25.0, 4.0, () => {
        // Brushed-brass floor threshold plate across the central door opening
        box(B, 'brass', 24.94, 2.88, 25.06, 5.12, 0, 0.010, 0.002);
        // Inner dark-bronze door leaf perimeter stiles and top/bottom rails (inset inside the middle panel)
        box(B, 'bronze', 24.962, 2.890, 25.038, 2.942, 0.012, 2.758, 0.003);              // north hinge stile
        box(B, 'bronze', 24.962, 5.058, 25.038, 5.110, 0.012, 2.758, 0.003);              // south latch stile
        box(B, 'bronze', 24.962, 2.942, 25.038, 5.058, 0.012, 0.072, 0.003);              // bottom door kicking rail
        box(B, 'bronze', 24.962, 2.942, 25.038, 5.058, 2.705, 2.758, 0.003);              // top door header rail
        // Three heavy architectural brushed-brass barrel hinges along the north hinge stile (y = 2.89)
        [0.42, 1.40, 2.38].forEach((zh) => cyl(d, 'brass', 24.955, 2.888, zh - 0.045, zh + 0.045, 0.012, 0.012, 16));
        // Sculpted full-height walnut & brushed-brass ladder pull handles on both faces of the latch stile (y = 4.94)
        [-0.048, 0.048].forEach((dx) => {
          const hx = 25.0 + dx;
          cyl(d, 'brass', hx, 4.94, 0.68, 0.80, 0.013, 0.013, 18);                        // lower brass end-cap
          cyl(d, 'wineWood', hx, 4.94, 0.80, 1.72, 0.014, 0.014, 18);                     // warm turned walnut grip
          cyl(d, 'brass', hx, 4.94, 1.72, 1.84, 0.013, 0.013, 18);                        // upper brass end-cap
          [0.76, 1.76].forEach((zs) => rod(d, 'brass', [25.0, 4.94, zs], [hx, 4.94, zs], 0.009));
        });
        // Brushed-brass mortise lock escutcheon plate on the latch stile
        box(d, 'brass', 24.956, 5.064, 25.044, 5.104, 1.02, 1.16, 0.002);
      });
      // 7. Single centered architectural ceiling spotlight rail (x = 27.00, y = 1.58 .. 6.42) with 3 articulated swivel spotlights:
      //    - Left spotlight (y = 1.85): angled toward the left wine wall (y = 0.24) to illuminate the wine on the left wall
      //    - Middle spotlight (y = 4.00): aimed straight down onto the small tasting table in the middle (x = 27.0, y = 4.0)
      //    - Right spotlight (y = 6.15): angled toward the right wine wall (y = 7.76) to illuminate the wine on the right wall
      thing(27.0, 4.0, () => {
        const sx = 27.00;
        box(d, 'brass', sx - 0.054, 1.58, sx + 0.054, 6.42, 3.588, 3.598, 0.002);              // brushed-brass ceiling track bezel
        box(d, 'black', sx - 0.046, 1.60, sx + 0.046, 6.40, 3.572, 3.595, 0.003);              // matte-black recessed track channel
        [
          [1.85, new V3(0, -Math.cos(0.68), -Math.sin(0.68)).normalize()],                     // left spotlight: angled at left wine wall
          [4.00, new V3(0, -1, 0)],                                                            // middle spotlight: straight down on central table
          [6.15, new V3(0, -Math.cos(0.68), Math.sin(0.68)).normalize()],                      // right spotlight: angled at right wine wall
        ].forEach(([sy, aimDir]) => {
          cyl(d, 'brass', sx, sy, 3.546, 3.574, 0.042, 0.048, 32);                             // stationary brass ceiling stem collar
          ball(d, 'brass', sx, sy, 3.546, 0.044, 0.95);                                        // articulated brass swivel ball joint
          const piv = new V3(WX(sx), 3.544, WZ(sy));
          const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), aimDir.clone().negate());
          const one = new V3(1, 1, 1);
          const canCyl = (mat, d0, d1, rTop, rBot, seg) => {
            const p = piv.clone().addScaledVector(aimDir, 0.5 * (d0 + d1));
            d.add(M[mat], new THREE.CylinderGeometry(rTop, rBot, d1 - d0, seg || 32), new THREE.Matrix4().compose(p, q, one));
          };
          const canTorus = (mat, dist, r, tube, seg) => {
            const p = piv.clone().addScaledVector(aimDir, dist);
            const m = new THREE.Matrix4().compose(p, q, one).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
            d.add(M[mat], new THREE.TorusGeometry(r, tube, 12, seg || 32), m);
          };
          d.add(M.brass, new THREE.SphereGeometry(0.058, 32, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), new THREE.Matrix4().compose(piv.clone().addScaledVector(aimDir, 0.022), q, new V3(1, 0.35, 1)));
          canCyl('brass', 0.020, 0.034, 0.058, 0.058, 32);                                     // top spun-brass barrel crown
          canCyl('black', 0.033, 0.174, 0.058, 0.058, 32);                                     // upper matte-black spotlight barrel
          canCyl('brass', 0.172, 0.232, 0.0585, 0.0585, 32);                                   // lower brushed-brass baffle cuff
          canTorus('brass', 0.232, 0.054, 0.004, 32);                                          // rolled brass aperture lip
          canCyl('black', 0.190, 0.230, 0.049, 0.049, 28);                                     // recessed anti-glare inner baffle
          canCyl('glow', 0.208, 0.222, 0.039, 0.039, 28);                                      // warm optical LED lens
          d.add(M.glowSoft, new THREE.SphereGeometry(0.036, 24, 14), new THREE.Matrix4().compose(piv.clone().addScaledVector(aimDir, 0.222), q, new V3(1, 0.35, 1)));
        });
      }, 3.5);
      lamp('kitchen', 26.95, 0.92, 2.05, 0xffd296, 2.15, 5.2);                                 // left spotlight wash on north wine wall
      lamp('kitchen', 27.00, 4.00, 2.15, 0xffd8a4, 2.55, 5.4);                                 // middle spotlight pool on central tasting table
      lamp('kitchen', 26.95, 7.08, 2.05, 0xffd296, 2.15, 5.2);                                 // right spotlight wash on south wine wall
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
    // Keep exact shared RNG consumption from the original bookshelf loop so downstream Patio/Garden random calls never shift
    [[29.3, 37.7], [38.3, 43.3]].forEach(([a, b]) => {
      for (let j = 0; j < 6; j++) {
        for (let x = a + 0.06; x < b - 0.3;) {
          const n = 5 + ((R() * 12) | 0);
          for (let q = 0; q < n && x < b - 0.08; q++) { const t = 0.024 + R() * 0.034; R(); R(); x += t + 0.002; }
          x += 0.1 + R() * 0.42;
        }
      }
    });
    Object.assign(M, {
      bk5: D(P({ color: 0x3b4d3e, roughness: 0.78 })),
      bk6: D(P({ color: 0x263849, roughness: 0.78 })),
      bk7: D(P({ color: 0xc89b54, roughness: 0.76 })),
      bk8: D(P({ color: 0x6b3a2e, roughness: 0.74 })),
      tvScreen: D(P({ color: 0x090a0c, metalness: 0.18, roughness: 0.07, envMapIntensity: 1.35 })),
      tvArt: D(P({ color: 0x181614, emissive: 0x2a2118, emissiveIntensity: 0.22, roughness: 0.12, envMapIntensity: 1.1 })),
    });
    const d = dec('patio'), Rs = FX.rng(2027);
    // ---- furniture for the rooms the walk never enters, drawn on the plan (16 Oct, Sam: "for the two guest suites, try to
    // find a creative layout... the two nightstands, the bed, some furniture, because right now both of them are exactly the
    // same layout, and I don't know what is each corner in the bottom left on each room, so remove that... the media, enhance
    // it a little bit... study and library, just add a little bit more to fill the room". They are read from above, so they
    // are drawn for their outlines. Until then each suite had the same bed and a walled box in its south-west corner.)
    const chair = (bt, x, y, rot, mat) => thing(x, y, () => {                // a side chair, its back away from rot's front
      const c = Math.cos(rot), sn = Math.sin(rot), at = (dx, dy) => [x + dx * c + dy * sn, y - dx * sn + dy * c];
      rbox(bt, mat || 'boucle', x, y, 0.42, 0.48, 0.48, 0.48, 0.03, rot); const b = at(0, -0.21); rbox(bt, 'walnut', b[0], b[1], 0.48, 0.85, 0.50, 0.055, 0.022, rot);
      const bPad = at(0, -0.185); rbox(bt, mat || 'boucle', bPad[0], bPad[1], 0.51, 0.82, 0.44, 0.04, 0.018, rot);
      [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].forEach(([dx, dy]) => { const l = at(dx, dy); cyl(bt, 'walnut', l[0], l[1], 0, 0.42, 0.018, 0.014, 10); });
    });
    const lampOn = (bt, x, y, z) => { cyl(bt, 'brass', x, y, z, z + 0.025, 0.075, 0.07, 20); cyl(bt, 'brass', x, y, z + 0.025, z + 0.4, 0.014, 0.014, 12); cyl(bt, 'shade', x, y, z + 0.36, z + 0.6, 0.16, 0.125, 28); };
    const floorLamp = (bt, x, y) => { cyl(bt, 'black', x, y, 0, 0.025, 0.17, 0.17, 24); cyl(bt, 'brass', x, y, 0.025, 1.48, 0.012, 0.012, 12); cyl(bt, 'shade', x, y, 1.44, 1.76, 0.21, 0.17, 28); };
    const potPlant = (bt, x, y, h) => { cyl(bt, 'clay', x, y, 0, 0.42, 0.21, 0.16, 24); ball(bt, 'foliage', x, y, 0.42 + h * 0.45, h * 0.5, 1, 0.75); ball(bt, 'foliageL', x + 0.1, y - 0.08, 0.42 + h * 0.6, h * 0.3, 1.2, 0.6); };
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
    // the study (left room, x = 29..38, y = 0..8): bespoke 6-bay walnut bookcase with randomized multi-color books,
    // wall-mounted flat-screen TV and floating media credenza on the left wall, executive walnut-and-leather desk, and reading lounge
    {
      const dd = d;
      // 1. Bespoke 6-bay solid walnut bookcase along the north wall (x = 29.24..37.76, y = 0.16..0.78)
      const bA = 29.24, bB = 37.76, bays = 6, bayW = (bB - bA) / bays;
      box(B, 'black', bA + 0.06, 0.22, bB - 0.06, 0.74, 0, 0.08, 0.004);                             // recessed shadow plinth
      box(B, 'kitchenCab', bA, 0.16, bB, 0.24, 0.08, 2.84, 0.006);                                   // dark walnut back panel
      box(B, 'walnut', bA, 0.22, bB, 0.76, 0.08, 0.64, 0.008);                                       // lower closed cabinet carcase
      box(B, 'counterStone', bA - 0.01, 0.21, bB + 0.01, 0.79, 0.64, 0.68, 0.005);                   // honed travertine counter ledge
      box(B, 'walnut', bA - 0.01, 0.20, bB + 0.01, 0.62, 2.78, 2.85, 0.006);                         // upper cornice fascia
      for (let k = 0; k <= bays; k++) {
        const xDiv = bA + k * bayW;
        box(B, 'walnut', xDiv - 0.022, 0.22, xDiv + 0.022, 0.60, 0.68, 2.80, 0.004);                 // vertical walnut bay stile
        if (k < bays) {
          const x0 = xDiv + 0.022, x1 = xDiv + bayW - 0.022, xm = 0.5 * (x0 + x1);
          // Paired lower cabinet door leaves with shadow reveal and brushed-brass pulls
          box(dd, 'walnutFine', x0 + 0.008, 0.755, xm - 0.005, 0.78, 0.10, 0.62, 0.003);
          box(dd, 'walnutFine', xm + 0.005, 0.755, x1 - 0.008, 0.78, 0.10, 0.62, 0.003);
          box(dd, 'brass', xm - 0.024, 0.78, xm - 0.012, 0.795, 0.46, 0.57, 0.002);
          box(dd, 'brass', xm + 0.012, 0.78, xm + 0.024, 0.795, 0.46, 0.57, 0.002);
          // Warm concealed LED cove strip at top of each bay
          box(dd, 'bayGlow', x0 + 0.04, 0.26, x1 - 0.04, 0.34, 2.755, 2.775, 0.002);
        }
      }
      const bkMats = ['bk1', 'bk2', 'bk3', 'bk4', 'bk5', 'bk6', 'bk7', 'bk8'];
      const shelfZs = [0.68, 1.10, 1.52, 1.94, 2.36];
      shelfZs.forEach((zS, j) => {
        if (j > 0) box(B, 'walnutFine', bA + 0.02, 0.22, bB - 0.02, 0.58, zS - 0.032, zS, 0.004);
        for (let k = 0; k < bays; k++) {
          const xStart = bA + k * bayW + 0.045, xEnd = bA + (k + 1) * bayW - 0.045;
          let x = xStart + Rs() * 0.05;
          while (x < xEnd - 0.14) {
            const mode = Rs();
            if (mode < 0.68) {
              // Run of randomized upright books with varied heights, depths, colors, and spine bands
              const count = 4 + ((Rs() * 9) | 0);
              let lastH = 0.24, lastD = 0.20;
              for (let q = 0; q < count && x < xEnd - 0.08; q++) {
                const t = 0.020 + Rs() * 0.030;
                const h = 0.175 + Rs() * 0.145;
                const dep = 0.165 + Rs() * 0.065;
                const yFront = 0.545 + (Rs() - 0.5) * 0.026;
                const yMid = yFront - dep / 2;
                const mKey = bkMats[(Rs() * bkMats.length) | 0];
                rbox(dd, mKey, x + t / 2, yMid, zS, zS + h, t, dep, 0.003, (Rs() - 0.5) * 0.03);
                // Occasional contrasting spine title band on the front edge
                if (Rs() < 0.38) {
                  const bandZ = zS + h * (0.62 + Rs() * 0.20);
                  box(dd, mKey === 'bk1' ? 'bk2' : 'bk1', x + 0.002, yFront - 0.008, x + t - 0.002, yFront + 0.002, bandZ, bandZ + 0.018, 0.001);
                }
                x += t + 0.0025;
                lastH = h; lastD = dep;
              }
              // Occasional leaning book resting at an angle against the end of the upright run
              if (Rs() < 0.48 && x < xEnd - 0.12) {
                const tL = 0.024 + Rs() * 0.018, hL = Math.min(0.28, lastH * (0.88 + Rs() * 0.15));
                const lean = 0.20 + Rs() * 0.12;
                const cxL = x + (hL * Math.sin(lean)) * 0.46 + tL * 0.5;
                const czL = zS + (hL * Math.cos(lean)) * 0.48;
                const mLean = bkMats[(Rs() * bkMats.length) | 0];
                dd.add(M[mLean], FX.bevelBox(tL, hL, lastD, 0.003), FX.M(WX(cxL), czL, WZ(0.54 - lastD / 2), 0, 0, lean));
                x += hL * Math.sin(lean) + tL + 0.03;
              }
              x += 0.06 + Rs() * 0.16;
            } else if (mode < 0.88 && x < xEnd - 0.34) {
              // Horizontal stack of 2 to 4 large-format art monographs
              const wStack = 0.23 + Rs() * 0.07, dStack = 0.18 + Rs() * 0.04;
              const nStack = 2 + ((Rs() * 3) | 0);
              let zz = zS;
              for (let s = 0; s < nStack; s++) {
                const th = 0.022 + Rs() * 0.016;
                const mKey = bkMats[(Rs() * bkMats.length) | 0];
                rbox(dd, mKey, x + wStack / 2, 0.44, zz, zz + th, wStack - s * 0.014, dStack - s * 0.01, 0.003, (Rs() - 0.5) * 0.12);
                zz += th;
              }
              if (Rs() < 0.45) ball(dd, Rs() < 0.5 ? 'brass' : 'travBlock', x + wStack / 2, 0.44, zz + 0.038, 0.038, 1);
              x += wStack + 0.08 + Rs() * 0.14;
            } else if (x < xEnd - 0.26) {
              // Sculptural ceramic vessel or travertine object on the shelf
              const vMat = ['ceramic', 'glazeBlack', 'stoneW', 'clay'][(Rs() * 4) | 0];
              vase(dd, vMat, x + 0.11, 0.44, zS, 0.36 + Rs() * 0.16, Rs() < 0.5 ? VASE : AMPHORA);
              x += 0.24 + Rs() * 0.16;
            } else break;
          }
        }
      });

      // 2. Wall-mounted 85-inch flat-screen OLED TV & floating walnut/travertine media credenza on the left (west) wall (x = 29.13..29.68)
      thing(29.38, 4.10, () => {
        // Floating walnut & honed travertine media console (y = 2.45..5.75, z = 0.16..0.64)
        box(B, 'black', 29.14, 2.55, 29.52, 5.65, 0.12, 0.16, 0.003);                                // recessed wall cleats
        box(B, 'walnut', 29.14, 2.45, 29.66, 5.75, 0.16, 0.61, 0.008);                               // floating walnut cabinet body
        box(B, 'counterStone', 29.14, 2.44, 29.68, 5.76, 0.61, 0.645, 0.005);                        // honed travertine console top
        [3.275, 4.10, 4.925].forEach((ySeam) => box(dd, 'black', 29.655, ySeam - 0.004, 29.668, ySeam + 0.004, 0.18, 0.59, 0.001));
        // Sleek Dolby Atmos soundbar centered below the TV
        box(dd, 'black', 29.34, 3.55, 29.48, 4.65, 0.645, 0.705, 0.006);
        box(dd, 'brass', 29.345, 3.545, 29.475, 3.555, 0.648, 0.702, 0.002);
        box(dd, 'brass', 29.345, 4.645, 29.475, 4.655, 0.648, 0.702, 0.002);
        // Console accessories flanking the TV
        lampOn(dd, 29.42, 2.78, 0.645);
        vase(dd, 'glazeBlack', 29.42, 5.38, 0.645, 0.52);
        rbox(dd, 'bk1', 29.42, 5.02, 0.645, 0.672, 0.24, 0.30, 0.003, 0.05);
        rbox(dd, 'bk6', 29.42, 5.02, 0.672, 0.696, 0.22, 0.27, 0.003, -0.04);
        // Wall-mounted 85-inch flat-screen OLED TV on the left wall (x = 29.14..29.23, y = 3.02..5.18, z = 1.12..2.38)
        box(dd, 'bayGlow', 29.132, 3.08, 29.150, 5.12, 1.16, 2.34, 0.003);                           // warm ambient bias light behind TV
        box(B, 'black', 29.142, 3.35, 29.185, 4.85, 1.32, 2.18, 0.004);                              // recessed slim wall-mount bracket
        box(B, 'black', 29.182, 3.02, 29.218, 5.18, 1.12, 2.38, 0.006);                              // ultra-thin anodized dark outer chassis
        box(dd, 'brass', 29.205, 3.016, 29.222, 5.184, 1.116, 1.128, 0.002);                         // brushed-bronze lower bezel trim
        box(dd, 'brass', 29.205, 3.016, 29.222, 5.184, 2.372, 2.384, 0.002);                         // brushed-bronze upper bezel trim
        box(B, 'tvScreen', 29.216, 3.05, 29.228, 5.15, 1.145, 2.355, 0.002);                         // sleek dark OLED glass screen surface
        box(dd, 'tvArt', 29.226, 3.22, 29.231, 4.98, 1.26, 2.24, 0.001);                             // subtle ambient standby gallery vignette
      });

      // 3. Large tailored wool area rug & executive walnut-and-leather desk (x = 30.2..36.8, y = 1.3..6.8)
      box(dd, 'rugTaupe', 30.15, 1.35, 36.85, 6.85, 0, 0.014, 0.005);
      box(dd, 'wool', 30.35, 1.55, 36.65, 6.65, 0.004, 0.022, 0.006);
      thing(33.4, 2.8, () => {
        // Executive walnut desk with leather blotter, drawer pedestal, and bronze slab leg
        box(B, 'walnut', 31.85, 2.32, 34.95, 3.28, 0.71, 0.76, 0.008);                               // mitered solid walnut desktop
        box(dd, 'bk2', 32.55, 2.42, 34.25, 3.18, 0.758, 0.766, 0.003);                               // inlaid dark saddle-leather writing pad
        box(B, 'walnut', 31.92, 2.38, 32.58, 3.22, 0.08, 0.71, 0.006);                               // left walnut drawer pedestal
        box(B, 'black', 31.96, 2.42, 32.54, 3.18, 0, 0.08, 0.003);
        box(B, 'walnut', 32.58, 2.96, 34.78, 3.04, 0.22, 0.71, 0.005);                               // recessed walnut modesty panel
        box(B, 'black', 34.74, 2.40, 34.86, 3.20, 0, 0.71, 0.005);                                   // right architectural bronze/black slab leg
        box(dd, 'brass', 34.73, 2.39, 34.87, 3.21, 0, 0.035, 0.002);                                 // brass foot shoe
        lampOn(dd, 34.48, 2.58, 0.76);
        rbox(dd, 'bk1', 32.22, 2.75, 0.76, 0.786, 0.22, 0.28, 0.003, 0.08);
        rbox(dd, 'bk3', 32.22, 2.75, 0.786, 0.810, 0.20, 0.25, 0.003, -0.05);
      });
      lounge(B, 33.4, 1.62, 0, 'leather', 'walnut');                                                 // executive leather chair behind desk
      chair(B, 32.75, 3.85, Math.PI, 'boucle');                                                      // visitor chair left
      chair(B, 34.05, 3.85, Math.PI, 'boucle');                                                      // visitor chair right

      // 4. Foreground TV lounge table & reading corner (positioned to keep the left-wall TV completely unobstructed)
      thing(31.35, 5.75, () => {
        cyl(B, 'walnut', 31.35, 5.75, 0, 0.39, 0.26, 0.22, 32);                                      // fluted walnut drum base
        cyl(B, 'counterStone', 31.35, 5.75, 0.39, 0.44, 0.54, 0.54, 40);                             // low honed travertine round table top
        vase(dd, 'ceramic', 31.22, 5.68, 0.44, 0.42);
        rbox(dd, 'bk5', 31.48, 5.82, 0.44, 0.468, 0.22, 0.26, 0.003, 0.22);
      });
      lounge(B, 36.15, 5.85, Math.PI + 0.58, 'leather', 'walnut');                                   // corner leather reading lounge chair
      cushion(B, 'leather', 35.42, 5.18, 0.14, 0.56, 0.28, 0.46, 0.58);                              // matching leather ottoman cushion
      rbox(B, 'walnut', 35.42, 5.18, 0, 0.14, 0.54, 0.44, 0.01, 0.58);                               // walnut ottoman base
      floorLamp(dd, 37.15, 6.62);
    }
    // the salon / private dining & atelier (right room, x = 38..44, y = 0..8): book-free architectural room with
    // a sculptural honed Roman travertine and walnut table centered behind the single large glass pane, sculpted boucle chairs,
    // low north-wall walnut credenza, framed east-wall painting, and corner sculpture plinth
    {
      const dd = d;
      // 1. Tailored wool & taupe border area rug centered in the Salon
      box(dd, 'rugTaupe', 38.65, 2.15, 42.95, 6.45, 0, 0.014, 0.005);
      box(dd, 'wool', 38.85, 2.35, 42.75, 6.25, 0.004, 0.022, 0.006);

      // 2. Sculptural honed Roman travertine & fluted-walnut Salon Table (x = 39.40..41.90, y = 3.65..5.00, z = 0..0.765)
      thing(40.65, 4.325, () => {
        [39.98, 41.32].forEach((xPed) => {
          cyl(B, 'brass', xPed, 4.325, 0, 0.035, 0.245, 0.245, 32);                                  // brushed-brass plinth ring
          cyl(B, 'walnut', xPed, 4.325, 0.035, 0.70, 0.23, 0.19, 36);                                // tapered walnut pedestal drum
        });
        box(B, 'walnut', 39.98, 4.26, 41.32, 4.39, 0.18, 0.26, 0.006);                               // solid walnut stretcher beam
        box(B, 'walnut', 39.46, 3.71, 41.84, 4.94, 0.695, 0.725, 0.008);                             // bevelled walnut sub-apron
        box(B, 'counterStone', 39.40, 3.65, 41.90, 5.00, 0.725, 0.768, 0.010);                       // honed Roman travertine slab top
        // Tabletop styling: carved travertine centerpiece bowl + pair of warm brass/linen lamps
        lathe(dd, 'flutedBowl', 40.65, 4.325, 0.768, BOWL.map(([r, h]) => [r * 1.35, h * 1.25]));
        ball(dd, 'pear', 40.61, 4.30, 0.81, 0.038, 1.2);
        ball(dd, 'figFruit', 40.69, 4.35, 0.805, 0.034, 1.1);
        ball(dd, 'orange', 40.65, 4.36, 0.81, 0.036, 1.0);
        lampOn(dd, 39.88, 4.325, 0.768);
        lampOn(dd, 41.42, 4.325, 0.768);
      });

      // 3. Sculpted bouclé-and-walnut salon chairs surrounding the table
      [39.88, 40.65, 41.42].forEach((x) => {
        chair(B, x, 3.16, 0, 'boucle');
        chair(B, x, 5.49, Math.PI, 'boucle');
      });
      chair(B, 38.92, 4.325, -Math.PI / 2, 'boucle');
      chair(B, 42.38, 4.325, Math.PI / 2, 'boucle');

      // 4. Low walnut & honed-travertine credenza along the north wall (below the north window sill, z = 0..0.74)
      thing(41.0, 0.48, () => {
        box(B, 'black', 39.18, 0.24, 42.82, 0.68, 0, 0.09, 0.004);
        box(B, 'walnut', 39.10, 0.20, 42.90, 0.72, 0.09, 0.70, 0.008);
        box(B, 'counterStone', 39.09, 0.19, 42.91, 0.73, 0.70, 0.74, 0.005);
        [40.05, 41.0, 41.95].forEach((xSeam) => box(dd, 'black', xSeam - 0.004, 0.715, xSeam + 0.004, 0.726, 0.11, 0.68, 0.001));
        lampOn(dd, 39.55, 0.46, 0.74);
        vase(dd, 'ceramic', 42.25, 0.45, 0.74, 0.58, AMPHORA);
        vase(dd, 'glazeBlack', 42.55, 0.48, 0.74, 0.42, VASE);
      });

      // 5. Framed abstract painting on the east wall and sculptural plinth in the NE corner
      art('patio', 'paint', 'E', 4.325, 43.86, 1.62, 2.35, 1.42, 'walnut', 5);
      thing(43.25, 1.35, () => {
        plinth(B, 43.25, 1.35, 0.92, 0.24);
        vase(dd, 'brass', 43.25, 1.35, 0.92, 0.56, URN);
      });
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
    [24.6, 26.2, 34.4, 36].forEach((x) => lounger(d, x, 22.7, 'sage'));
    // Luxury floating pool lounger drifting on the main courtyard swimming pool
    poolFloat(d, 32.6, 28.1, -0.14, 0.22);
    // Between each pair a drum of limestone with a bowl of lemons, and the parasol: a square canopy with a valance on
    // eight teak ribs, a teak pole on a stone foot, a bronze cap.
    [25.78, 35.58].forEach((x) => thing(x, 23.7, () => {
      cyl(B, 'pathStone', x, 23.2, 0, 0.4, 0.21, 0.21, 40); cyl(B, 'pathStone', x, 23.2, 0.4, 0.42, 0.21, 0.195, 40);
      lathe(d, 'ceramic', x, 23.2, 0.42, BOWL.map(([r, h]) => [r * 0.85, h * 0.85]));
      [[0.04, 0.02], [-0.045, 0.015], [0.0, -0.05], [0.01, 0.0]].forEach(([dx, dy], i) => ball(d, 'lemon', x + dx, 23.2 + dy, 0.49 + (i === 3 ? 0.04 : 0), 0.038, 0.88, 1.08));
      box(B, 'pathStone', x - 0.26, 23.84, x + 0.26, 24.36, 0, 0.07, 0.01);
      cyl(B, 'teak', x, 24.1, 0.07, 2.62, 0.032, 0.03, 16);
      const cut = dec('patio:cut'), S = 1.24, top = 2.62;
      cut.add(M.linenW, new THREE.ConeGeometry(S * Math.SQRT2, 0.34, 4, 1, true), FX.M(WX(x), top + 0.17, WZ(24.1), 0, Math.PI / 4, 0));
      [[-1, 0], [1, 0]].forEach(([s]) => { box(cut, 'linenW', x + s * S - 0.006, 24.1 - S, x + s * S + 0.006, 24.1 + S, top - 0.11, top + 0.005, 0.002); box(cut, 'linenW', x - S, 24.1 + s * S - 0.006, x + S, 24.1 + s * S + 0.006, top - 0.11, top + 0.005, 0.002); });
      // ribs under the cloth from the crown to the edge, stretchers from a bronze runner on the pole to the ribs' middles
      [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b], i) => {
        rod(cut, 'teak', [x, 24.1, top + 0.3], [x + a * (S - 0.03), 24.1 + b * (S - 0.03), top - 0.012], 0.012);
        if (i > 3) rod(cut, 'teak', [x, 24.1, top - 0.2], [x + a * S * 0.5, 24.1 + b * S * 0.5, top + 0.14], 0.009);
      });
      cyl(cut, 'teak', x, 24.1, 2.62, top + 0.3, 0.03, 0.026, 16);
      cyl(cut, 'bronze', x, 24.1, top - 0.26, top - 0.16, 0.045, 0.045, 16); cyl(cut, 'bronze', x, 24.1, top + 0.33, top + 0.41, 0.035, 0.018, 16);
    }));
    // (The canopies are cut with the house. Left whole like the trees, they were two burnt-out white octagons over the
    // loungers in the last look from above, with the loungers' outlines showing through and a glow on the pool.)
    // an outdoor lounge on the north side, clear of the way from the kitchen to the gallery door
    M.outdoorWhite = M.outdoorWhite || D(FX.pbr(sets.linen, { size: 0.45, color: rgb(2.35, 2.28, 2.14), env: 0.35, normal: 1.8 }), { sat: 0.08 });
    M.outdoorSage  = M.outdoorSage  || D(FX.pbr(sets.linen, { size: 0.45, color: rgb(0.85, 1.05, 0.76), env: 0.35, normal: 1.8 }), { sat: 0.28 });
    M.outdoorRope  = M.outdoorRope  || D(P({ color: 0x3b3631, roughness: 0.78, envMapIntensity: 0.42 }));
    thing(29.0, 10.6, () => {
      // 1. Tapered Burmese teak legs with machined dark-bronze foot ferrules & top mounting collars (z = 0..0.205 m)
      [
        [25.92, 9.04], [25.92, 9.92], [27.38, 9.04], [27.38, 9.92],
        [28.86, 9.04], [28.86, 9.92], [30.36, 9.92], [31.28, 9.04],
        [30.40, 11.45], [31.28, 11.45], [30.40, 12.96], [31.28, 12.96],
      ].forEach(([lx, ly]) => {
        cyl(d, 'black',  lx, ly, 0.000, 0.006, 0.017, 0.018, 14);
        cyl(d, 'bronze', lx, ly, 0.006, 0.044, 0.018, 0.016, 16);
        cyl(d, 'teak',   lx, ly, 0.044, 0.190, 0.025, 0.018, 16);
        cyl(d, 'bronze', lx, ly, 0.188, 0.205, 0.027, 0.026, 16);
      });
      // 2. Recessed dark-bronze under-frame shadow chassis (z = 0.180..0.200 m)
      box(d, 'bronze', 25.90, 9.02, 31.30, 9.94, 0.180, 0.200, 0.005);
      box(d, 'bronze', 30.38, 9.94, 31.30, 12.98, 0.180, 0.200, 0.005);
      // 3. Connected L-shaped bullnose solid Burmese teak platform perimeter rails (z = 0.198..0.254 m)
      box(B, 'teak', 25.84, 8.96, 31.36, 9.035, 0.198, 0.254, 0.020);
      box(B, 'teak', 25.84, 9.925, 30.395, 10.00, 0.198, 0.254, 0.020);
      box(B, 'teak', 25.84, 8.96, 25.915, 10.00, 0.198, 0.254, 0.020);
      box(B, 'teak', 31.285, 8.96, 31.36, 13.06, 0.198, 0.254, 0.020);
      box(B, 'teak', 30.32, 9.925, 30.395, 13.06, 0.198, 0.254, 0.020);
      box(B, 'teak', 30.32, 12.985, 31.36, 13.06, 0.198, 0.254, 0.020);
      // Cross-tie teak deck bearers & cantilevered West-end slatted Burmese teak side-table extension (x = 25.91..26.40)
      box(d, 'teak', 26.38, 9.02, 26.43, 9.94, 0.200, 0.252, 0.012);
      for (let s = 0; s < 10; s++) {
        const sy = 9.042 + s * 0.089;
        box(d, 'teak', 25.91, sy, 26.39, sy + 0.074, 0.214, 0.252, 0.007);
      }
      // Small bronze tray & stoneware espresso cup on the West slatted teak side-table extension
      cyl(d, 'bronze', 26.14, 9.52, 0.252, 0.258, 0.085, 0.088, 24);
      lathe(d, 'stoneW', 26.14, 9.52, 0.258, [[0, 0], [0.034, 0], [0.042, 0.018], [0.044, 0.056], [0.038, 0.056], [0.032, 0.012], [0, 0.012]]);
      // Sub-cushion slatted teak deck along North & East wings
      for (let s = 0; s < 7; s++) {
        const sy = 9.06 + s * 0.132;
        box(d, 'teak', 26.42, sy, 31.29, sy + 0.095, 0.206, 0.244, 0.006);
      }
      for (let s = 0; s < 7; s++) {
        const sx = 30.41 + s * 0.132;
        box(d, 'teak', sx, 10.00, sx + 0.095, 12.99, 0.206, 0.244, 0.006);
      }
      // 4. Sculpted South-end cantilevered slatted Burmese teak armrest & side-table console (x = 30.30..31.36, y = 12.68..13.06, z = 0.50..0.544 m)
      [[30.38, 12.73], [31.28, 12.73], [30.38, 12.99], [31.28, 12.99]].forEach(([ax, ay]) => {
        cyl(d, 'bronze', ax, ay, 0.252, 0.268, 0.017, 0.017, 14);
        tleg(d, 'teak', [ax, ay, 0.264], [ax, ay + 0.012, 0.506], 0.016, 0.014);
        cyl(d, 'bronze', ax, ay + 0.012, 0.494, 0.508, 0.016, 0.016, 14);
      });
      box(B, 'teak', 30.30, 12.68, 31.36, 13.06, 0.502, 0.542, 0.016);
      for (let s = 0; s < 5; s++) {
        const sy = 12.725 + s * 0.064;
        box(d, 'teak', 30.35, sy, 31.31, sy + 0.048, 0.506, 0.544, 0.005);
      }
      for (let r = 0; r < 14; r++) {
        const rx = 30.42 + r * 0.062;
        cyl(d, 'outdoorRope', rx, 12.735, 0.254, 0.504, 0.0042, 0.0042, 8);
      }
      // 5. Open-frame raked Burmese teak & hand-woven charcoal-taupe rope backrest (z = 0.252..0.775 m)
      // Continuous rounded solid Burmese teak top crest rail & lower stringer rail
      box(B, 'teak', 26.38, 8.915, 31.38, 8.995, 0.736, 0.778, 0.019);
      box(B, 'teak', 31.30, 8.915, 31.38, 12.73, 0.736, 0.778, 0.019);
      box(d, 'teak', 26.38, 8.955, 31.34, 9.015, 0.268, 0.300, 0.011);
      box(d, 'teak', 31.28, 8.955, 31.34, 12.73, 0.268, 0.300, 0.011);
      // Raked tapered solid teak backrest stanchions with dark-bronze collars
      [26.42, 27.39, 28.36, 29.33, 30.30, 31.31].forEach((px) => {
        cyl(d, 'bronze', px, 8.99, 0.252, 0.270, 0.020, 0.020, 14);
        tleg(d, 'teak', [px, 8.99, 0.258], [px, 8.955, 0.748], 0.019, 0.015);
        cyl(d, 'bronze', px, 8.955, 0.724, 0.740, 0.017, 0.017, 14);
      });
      [9.90, 10.84, 11.78, 12.70].forEach((py) => {
        cyl(d, 'bronze', 31.31, py, 0.252, 0.270, 0.020, 0.020, 14);
        tleg(d, 'teak', [31.31, py, 0.258], [31.345, py, 0.748], 0.019, 0.015);
        cyl(d, 'bronze', 31.345, py, 0.724, 0.740, 0.017, 0.017, 14);
      });
      // Taut vertical hand-woven outdoor rope cords along North & East backrests
      for (let rx = 26.47; rx <= 31.27; rx += 0.052) {
        rod(d, 'outdoorRope', [rx, 8.985, 0.295], [rx, 8.955, 0.740], 0.0044);
      }
      for (let ry = 9.02; ry <= 12.66; ry += 0.052) {
        rod(d, 'outdoorRope', [31.31, ry, 0.295], [31.34, ry, 0.740], 0.0044);
      }
      // Mid-height horizontal woven rope tension band
      rod(d, 'outdoorRope', [26.42, 8.97, 0.515], [31.32, 8.97, 0.515], 0.0052);
      rod(d, 'outdoorRope', [31.325, 8.97, 0.515], [31.325, 12.70, 0.515], 0.0052);

      // 6. Tailored French-piped outdoor cushions in a strict two-color scheme:
      //    Warm Ivory-White (M.outdoorWhite) + Mediterranean Sage-Olive Green (M.outdoorSage) (zero yellow)
      const Z_SEAT = 0.246, T_SEAT = 0.176, Z_BACK = 0.398, H_BACK = 0.455, T_BACK = 0.195, LEAN_BACK = -0.22;
      // (a) Four North-wing modules (x = 26.40..30.32, w = 0.98 m each)
      const wN = (30.32 - 26.40) / 4;
      for (let i = 0; i < 4; i++) {
        const cx = 26.40 + (i + 0.5) * wN, cw = wN - 0.010;
        pillow(B, 'outdoorWhite', cx, 9.49, Z_SEAT, cw, 0.90, T_SEAT, -Math.PI / 2, 0, true);
        pillow(d, 'outdoorWhite', cx, 9.21, Z_BACK, cw - 0.006, H_BACK, T_BACK, LEAN_BACK, 0, true);
      }
      // (b) North-East corner module (x = 30.32..31.28, y = 9.04..10.00) with 45-degree mitered corner backrests
      pillow(B, 'outdoorWhite', 30.80, 9.49, Z_SEAT, 0.945, 0.90, T_SEAT, -Math.PI / 2, 0, true);
      pillow(d, 'outdoorWhite', 30.80, 9.21, Z_BACK, 0.935, H_BACK, T_BACK, LEAN_BACK, 0, true, 1);
      pillow(d, 'outdoorWhite', 31.08, 9.49, Z_BACK, 0.900, H_BACK, T_BACK, LEAN_BACK, -Math.PI / 2, true, -1);
      // (c) Three East-wing modules (y = 10.00..12.67, w = 0.89 m each) facing West (rot = -Math.PI / 2)
      const wE = (12.67 - 10.00) / 3;
      for (let i = 0; i < 3; i++) {
        const cy = 10.00 + (i + 0.5) * wE, cw = wE - 0.010;
        pillow(B, 'outdoorWhite', 30.80, cy, Z_SEAT, cw, 0.90, T_SEAT, -Math.PI / 2, -Math.PI / 2, true);
        pillow(d, 'outdoorWhite', 31.08, cy, Z_BACK, cw - 0.006, H_BACK, T_BACK, LEAN_BACK, -Math.PI / 2, true);
      }
      // (d) Tailored box-piped Sage-Olive Green (M.outdoorSage) & Warm Ivory (M.outdoorWhite) lumbar and accent cushions,
      //     spaced onto individual modules and seated cleanly in front of the backrests (zero overlap)
      pillow(d, 'outdoorSage',  26.82, 9.44, 0.408, 0.56, 0.32, 0.145, -0.28,  0.05, true);
      pillow(d, 'outdoorSage',  28.85, 9.44, 0.408, 0.60, 0.32, 0.145, -0.28, -0.02, true);
      pillow(d, 'outdoorWhite', 29.83, 9.44, 0.408, 0.54, 0.30, 0.135, -0.30,  0.03, true);
      // North-East corner angled Sage-Olive Green accent pillow bridging the L-turn
      pillow(d, 'outdoorSage',  30.67, 9.42, 0.410, 0.48, 0.40, 0.155, -0.26, -Math.PI / 4, true);
      // East wing tailored lumbar & accent cushions facing West
      pillow(d, 'outdoorSage',  30.85, 10.45, 0.408, 0.56, 0.32, 0.145, -0.28, -Math.PI / 2 + 0.03, true);
      pillow(d, 'outdoorWhite', 30.85, 11.34, 0.408, 0.54, 0.30, 0.135, -0.30, -Math.PI / 2 - 0.02, true);
      pillow(d, 'outdoorSage',  30.85, 12.23, 0.408, 0.56, 0.34, 0.150, -0.28, -Math.PI / 2 - 0.05, true);
    });
    thing(28.3, 11.6, () => {
      // Sculpted Honed Roman Travertine, Slatted Burmese Teak & Dark-Bronze Architectural Low Coffee Table (x = 27.32..29.18, y = 10.82..12.08)
      // 1. Tapered dark-bronze legs with warm brushed-brass glides (z = 0..0.062 m)
      [[27.44, 10.94], [29.06, 10.94], [27.44, 11.96], [29.06, 11.96]].forEach(([lx, ly]) => {
        cyl(d, 'brass',  lx, ly, 0.000, 0.008, 0.017, 0.018, 16);
        cyl(d, 'bronze', lx, ly, 0.008, 0.062, 0.020, 0.016, 16);
      });
      // 2. Lower bullnose solid Burmese teak frame & longitudinal slatted shelf (z = 0.058..0.098 m)
      box(B, 'teak', 27.36, 10.86, 29.14, 10.925, 0.058, 0.098, 0.015);
      box(B, 'teak', 27.36, 11.975, 29.14, 12.04, 0.058, 0.098, 0.015);
      box(B, 'teak', 27.36, 10.86, 27.425, 12.04, 0.058, 0.098, 0.015);
      box(B, 'teak', 29.075, 10.86, 29.14, 12.04, 0.058, 0.098, 0.015);
      for (let s = 0; s < 12; s++) {
        const sy = 10.935 + s * 0.086;
        box(d, 'teak', 27.42, sy, 29.08, sy + 0.066, 0.064, 0.092, 0.006);
      }
      // 3. Dark-bronze structural posts, end gallery spindles & recessed upper shadow chassis (z = 0.096..0.292 m)
      [[27.44, 10.94], [28.25, 10.94], [29.06, 10.94], [27.44, 11.96], [28.25, 11.96], [29.06, 11.96]].forEach(([px, py]) => {
        cyl(d, 'bronze', px, py, 0.096, 0.288, 0.014, 0.014, 16);
        cyl(d, 'brass',  px, py, 0.096, 0.108, 0.016, 0.016, 16);
      });
      for (let g = 1; g <= 5; g++) {
        const gy = 10.94 + g * (1.02 / 6);
        cyl(d, 'bronze', 27.44, gy, 0.096, 0.288, 0.0048, 0.0048, 10);
        cyl(d, 'bronze', 29.06, gy, 0.096, 0.288, 0.0048, 0.0048, 10);
      }
      box(d, 'bronze', 27.40, 10.90, 29.10, 12.00, 0.268, 0.292, 0.005);
      // 4. Floating chamfered honed Roman vein-cut travertine slab top (z = 0.290..0.348 m)
      box(B, 'pathStone', 27.32, 10.82, 29.18, 12.08, 0.290, 0.348, 0.014);
      // 5. Curated tabletop styling (z = 0.348 m): blackened-bronze tray with two-tone travertine/brass candle vessels + carved basalt bowl
      const zT = 0.348;
      box(d, 'bronze', 27.62, 11.16, 28.18, 11.66, zT, zT + 0.010, 0.002);
      box(d, 'brass',  27.62, 11.16, 28.18, 11.168, zT + 0.008, zT + 0.016, 0.0015);
      box(d, 'brass',  27.62, 11.652, 28.18, 11.66, zT + 0.008, zT + 0.016, 0.0015);
      [[27.80, 11.34, 0.145, 0.056], [27.98, 11.48, 0.105, 0.048]].forEach(([vx, vy, vh, vr]) => {
        cyl(d, 'travBlock', vx, vy, zT + 0.010, zT + 0.010 + vh * 0.42, vr, vr * 0.96, 24);
        cyl(d, 'brass',     vx, vy, zT + 0.010 + vh * 0.42, zT + 0.010 + vh * 0.50, vr * 1.01, vr * 1.01, 24);
        cyl(d, 'glowSoft',  vx, vy, zT + 0.010 + vh * 0.50, zT + 0.010 + vh, vr * 0.92, vr * 0.92, 24);
      });
      // Footed carved dark-basalt centerpiece bowl with travertine & sage-ceramic decorative spheres
      cyl(d, 'brass', 28.58, 11.50, zT, zT + 0.012, 0.105, 0.112, 28);
      lathe(d, 'inkObj', 28.58, 11.50, zT + 0.010, BOWL.map(([r, h]) => [r * 1.42, h * 1.38]));
      ball(d, 'travBlock',    28.54, 11.47, zT + 0.068, 0.044, 0.62, 1.12, 0.94);
      ball(d, 'outdoorSage',  28.63, 11.52, zT + 0.066, 0.040, 0.65, 1.05, 0.96);
      ball(d, 'outdoorWhite', 28.57, 11.55, zT + 0.064, 0.034, 0.68, 0.98, 1.04);
    });
    // Big planters with agaves and grasses along the gallery glass and by the kitchen. (Rebuilt the night of 15 Oct, Sam: "the
    // connection from the plant to the vase, maybe add some dirt or rocks... and make the plants a little bit more
    // realistic". Each was a closed concrete drum with a flat lid and a thin tuft standing on it.) Now an open vessel in the
    // dark concrete with a rolled lip, its inside wall showing down to the soil 8 cm under the lip, the soil dressed with
    // river pebbles, and the plant growing out of it: an agave as a dense spiral rosette of thick blue-green leaves, stiff and
    // spreading outside, upright at the heart; a New Zealand flax as broad strap leaves in olive and bronze. Their own random numbers (the old planting is built and thrown away, so nothing else moves).
    M.agave = M.agave || D(P({ color: 0x345e2e, roughness: 0.44, envMapIntensity: 0.68, side: THREE.DoubleSide }), { noRing: true });
    M.agave2 = M.agave2 || D(P({ color: 0x456e35, roughness: 0.42, envMapIntensity: 0.68, side: THREE.DoubleSide }), { noRing: true });
    M.flax = M.flax || D(P({ color: 0x2d5428, roughness: 0.44, envMapIntensity: 0.68, side: THREE.DoubleSide }), { noRing: true });
    M.flax2 = M.flax2 || D(P({ color: 0x4a7036, roughness: 0.42, envMapIntensity: 0.68, side: THREE.DoubleSide }), { noRing: true });
    const PLANTER = [[0, 0], [0.4, 0], [0.416, 0.02], [0.488, 0.66], [0.5, 0.69], [0.5, 0.705], [0.486, 0.712], [0.47, 0.695], [0.462, 0.64], [0, 0.62]];
    const pebble = new THREE.SphereGeometry(1, 10, 7);
    // Smooth, multi-segment sculpted botanical sword/rosette leaf with full UVs and true arc integration from upright base to arching tip
    const patioLeafGeo = (len, w, theta0, bend, cup, twist, leafId) => {
      const NL = 16, NW = 6, pos = [], uv = [], idx = [];
      let yy = 0, zz = 0;
      const ds = len / NL;
      for (let j = 0; j <= NL; j++) {
        const t = j / NL;
        const th = theta0 + bend * Math.pow(t, 1.28);
        if (j > 0) {
          const thMid = theta0 + bend * Math.pow((j - 0.5) / NL, 1.28);
          yy += ds * Math.cos(thMid);
          zz += ds * Math.sin(thMid);
        }
        const baseK = t < 0.18 ? 0.54 + 0.46 * Math.sin((t / 0.18) * (Math.PI / 2)) : 1.0;
        const tipK = Math.pow(Math.max(0, 1 - Math.pow(Math.max(0, (t - 0.30) / 0.70), 1.48)), 0.76);
        const hw = 0.5 * w * baseK * tipK;
        const ny = -Math.sin(th), nz = Math.cos(th);
        const tw = (twist || 0) * t, ct = Math.cos(tw), st = Math.sin(tw);
        for (let i = 0; i <= NW; i++) {
          const u = i / NW, sx = u * 2 - 1, ax = Math.abs(sx);
          const lx = sx * hw;
          const lnOff = -cup * hw * (ax - 0.32 * ax * ax) + 0.0045 * (1 - ax * ax) * (1 - 0.65 * t);
          const rx = lx * ct - lnOff * st;
          const rn = lx * st + lnOff * ct;
          pos.push(rx, yy + rn * ny, zz + rn * nz);
          uv.push(u, t * 0.996 + 0.002 + (leafId || 0));
        }
      }
      for (let j = 0; j < NL; j++) for (let i = 0; i < NW; i++) {
        const k0 = j * (NW + 1) + i;
        idx.push(k0, k0 + 1, k0 + NW + 1, k0 + 1, k0 + NW + 2, k0 + NW + 1);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    };
    // Preserve exact global RNG state from original 5-planter clump calls
    [[39.9, 15.5, 'a', 41], [39.9, 21.5, 'g', 43], [39.9, 26.0, 'a', 47], [22.0, 13.5, 'g', 53], [22.0, 21.0, 'a', 59]].forEach(([x, y, k]) => {
      const old = tagged(new FX.Batch());
      if (k === 'a') clump(old, x, y, 0.66, 0.85, 14, 'foliage', 0.9); else clump(old, x, y, 0.66, 1.3, 26, 'straw', 0.45);
    });
    // Four balanced architectural planters: two along the west wall (22.0, 13.5 and 22.0, 21.0) and two framing the gallery glass wall (39.9, 16.0 and 39.9, 22.2)
    [[22.0, 13.5, 53, 1.04], [22.0, 21.0, 59, 0.96], [39.9, 16.0, 41, 1.00], [39.9, 22.2, 43, 0.98]].forEach(([x, y, sd, sc]) => {
      thing(x, y, () => {
        const Rp = FX.rng(sd * 101), soil = 0.625;
        B.add(M.conc, new THREE.LatheGeometry(PLANTER.map(([r, h]) => new THREE.Vector2(r, h)), 64), FX.M(WX(x), 0, WZ(y)));
        cyl(d, 'soilDark', x, y, soil - 0.01, soil, 0.468, 0.468, 48);
        // Top dressing: white and warm-grey river pebbles over dark soil, plus woody central trunk collar
        for (let i = 0; i < 115; i++) {
          const a = Rp() * 6.28, r = 0.10 + Math.sqrt(Rp()) * 0.34, sz = 0.013 + Rp() * Rp() * 0.030;
          d.add(i % 4 ? M.stoneW : M.pathStone, pebble, FX.M(WX(x + Math.cos(a) * r), soil + sz * 0.35, WZ(y + Math.sin(a) * r), Rp() * 0.4, Rp() * 6.28, 0, sz * (1.1 + Rp() * 0.5), sz * 0.6, sz));
        }
        cyl(d, 'twig', x, y, soil - 0.01, soil + 0.095, 0.086, 0.066, 18);
        // Unified sculptural variegated architectural rosette & sword-leaf crown (40 broad, gracefully arching leaves)
        const N = 40;
        for (let i = 0; i < N; i++) {
          const t = i / (N - 1);
          const a = i * 2.39996 + (Rp() - 0.5) * 0.15;
          // Base angle from vertical (theta0) and progressive outward arch (bend) so outer leaves sweep over the rim and inner leaves form a fountain crown
          const theta0 = (0.58 - 0.50 * Math.pow(t, 0.82)) + (Rp() - 0.5) * 0.06;
          const bend = (0.98 - 0.72 * Math.pow(t, 0.90)) * (0.90 + Rp() * 0.20);
          const len = sc * (0.74 + 0.28 * Math.sin(t * Math.PI * 0.80) - 0.12 * t * t) * (0.92 + Rp() * 0.15);
          const w = sc * (0.152 - 0.038 * t) * (0.94 + Rp() * 0.12);
          const cup = 0.28 + 0.10 * (1 - t);
          const twist = (Rp() - 0.5) * 0.22 * (1 - 0.5 * t);
          const g = patioLeafGeo(len, w, theta0, bend, cup, twist, i + sd);
          const rBase = 0.048 * (1 - 0.78 * t);
          const mat = (i % 2 === 0) ? (i % 4 === 0 ? M.agave2 : M.flax2) : (i % 3 === 0 ? M.agave : M.flax);
          d.add(mat, g, FX.M(WX(x + Math.cos(a) * rBase), soil + 0.02 + 0.055 * t, WZ(y + Math.sin(a) * rBase), 0, -a + Math.PI / 2, 0, 1, 1, 1, 'YXZ'));
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
    for (let i = 0; i < 7; i++) art('gallery', 'paint', 'E', 10.9 + i * 3, 43.77, 1.72, 1.24, 1.64, 'black', i);
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
    // Centered flush-recessed ceiling spotlight slot track (x = 42.50, y = 9.2..30.8, flush in the z = 3.60 ceiling plane)
    // segmented into 7 modular bays with brushed-brass trim flanges, twin brass busbars, and 7 articulated gimbal spotlights
    // angled (+40 deg toward +X) directly at the 7 east-wall paintings (x = 43.77, z = 1.72) with visible glowing optical bulbs.
    if (!M.bulbBright) {
      M.bulbBright = D(P({ color: 0xfff8ea, emissive: 0xffdf9e, emissiveIntensity: 6.8, roughness: 0.12, envMapIntensity: 1.0 }));
      M.bulbCore = D(P({ color: 0xffffff, emissive: 0xfff7e0, emissiveIntensity: 11.5, roughness: 0.05, envMapIntensity: 1.0 }));
    }
    for (let i = 0; i < 7; i++) {
      const y = 10.9 + i * 3, yA = i === 0 ? 9.18 : y - 1.505, yB = i === 6 ? 30.82 : y + 1.505;
      thing(42.50, y, () => {
        box(d, 'brass', 42.412, yA, 42.430, yB, 3.588, 3.600, 0.0015);
        box(d, 'brass', 42.570, yA, 42.588, yB, 3.588, 3.600, 0.0015);
        if (i === 0) box(d, 'brass', 42.412, 9.18, 42.588, 9.20, 3.588, 3.600, 0.0015);
        if (i === 6) box(d, 'brass', 42.412, 30.80, 42.588, 30.82, 3.588, 3.600, 0.0015);
        box(d, 'black', 42.430, yA, 42.570, yB, 3.591, 3.600, 0.001);
        box(d, 'brass', 42.442, yA, 42.449, yB, 3.588, 3.594, 0.001);
        box(d, 'brass', 42.551, yA, 42.558, yB, 3.588, 3.594, 0.001);
        // Track mounting adapter plate, brushed-brass bezel ring & twin gimbal yoke arms descending from the ceiling slot
        box(d, 'bronze', 42.432, y - 0.14, 42.568, y + 0.14, 3.582, 3.596, 0.002);
        cyl(d, 'brass', 42.50, y, 3.572, 3.590, 0.072, 0.072, 28);
        [y - 0.064, y + 0.052].forEach((yy) => box(d, 'brass', 42.478, yy, 42.522, yy + 0.012, 3.515, 3.580, 0.0015));
        // Articulated directional spotlight barrel & prominent glowing PAR30 optical bulb aimed at each east-wall painting (+X = East, -Y = Down)
        const aimDir = new V3(0.68, -0.71, -0.18).normalize();
        const piv = new V3(WX(42.495), 3.542, WZ(y));
        const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), aimDir.clone().negate());
        const one = new V3(1, 1, 1);
        const spotCyl = (mat, d0, d1, rTop, rBot, seg) => {
          const p = piv.clone().addScaledVector(aimDir, 0.5 * (d0 + d1));
          d.add(M[mat], new THREE.CylinderGeometry(rTop, rBot, d1 - d0, seg || 28), new THREE.Matrix4().compose(p, q, one));
        };
        const spotTorus = (mat, dist, r, tube, seg) => {
          const p = piv.clone().addScaledVector(aimDir, dist);
          const m = new THREE.Matrix4().compose(p, q, one).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
          d.add(M[mat], new THREE.TorusGeometry(r, tube, 12, seg || 28), m);
        };
        d.add(M.brass, new THREE.SphereGeometry(0.056, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), new THREE.Matrix4().compose(piv.clone().addScaledVector(aimDir, -0.012), q, new V3(1, 0.40, 1)));
        spotCyl('brass', -0.014, 0.010, 0.057, 0.057, 28);                                      // rear spun-brass crown
        spotCyl('black', 0.010, 0.084, 0.057, 0.060, 28);                                       // angled matte-black projector barrel
        spotCyl('brass', 0.082, 0.112, 0.060, 0.063, 28);                                       // front brushed-brass bezel cuff
        spotTorus('brass', 0.112, 0.060, 0.0052, 28);                                           // rolled brass aperture lip
        spotCyl('glow', 0.088, 0.115, 0.044, 0.057, 28);                                        // warm golden reflector cone
        spotTorus('glow', 0.114, 0.052, 0.0045, 28);                                            // glowing optical lens rim
        d.add(M.bulbBright, new THREE.SphereGeometry(0.048, 28, 18), new THREE.Matrix4().compose(piv.clone().addScaledVector(aimDir, 0.118), q, new V3(1.0, 0.84, 1.0))); // prominent protruding light bulb globe
        d.add(M.bulbCore, new THREE.SphereGeometry(0.024, 20, 14), new THREE.Matrix4().compose(piv.clone().addScaledVector(aimDir, 0.130), q, new V3(1.0, 0.72, 1.0)));   // bright halogen filament core
      }, 0.15);
      lamp('gallery', 43.20, y, 2.85, 0xffd8a8, 0.62, 6.8);
    }
    // Bespoke museum gallery benches (y = 16.9, 22.9, cx = 43.34): sculpted solid American Walnut A-frame trestle legs on
    // machined brushed-brass sabots, mortised cross-transoms, wedged-tenon longitudinal stretcher, bevelled walnut platform deck
    // with brass inlay, channel-tufted cognac saddle-leather seat mattress with leather/brass cinch straps, and cylindrical bolster rolls.
    [16.9, 22.9].forEach((yc) => thing(43.34, yc, () => {
      const y0 = yc - 1.04, y1 = yc + 1.04;
      [y0 + 0.18, y1 - 0.18].forEach((yl) => {
        [[43.11, 43.17], [43.51, 43.57]].forEach(([x0, x1]) => {
          box(B, 'bronze', x0 + 0.004, yl - 0.030, x1 - 0.004, yl + 0.030, 0, 0.006, 0.001);
          box(B, 'brass', x0 - 0.002, yl - 0.036, x1 + 0.002, yl + 0.036, 0.006, 0.038, 0.003);
          box(B, 'walnutZ', x0, yl - 0.034, x1, yl + 0.034, 0.038, 0.362, 0.006);
        });
        box(B, 'walnutZ', 43.13, yl - 0.026, 43.55, yl + 0.026, 0.112, 0.156, 0.005);
        box(B, 'walnutZ', 43.12, yl - 0.030, 43.56, yl + 0.030, 0.312, 0.362, 0.005);
        box(B, 'brass', 43.106, yl - 0.012, 43.574, yl + 0.012, 0.126, 0.142, 0.002);
      });
      // Longitudinal mortised walnut stretcher with wedged brass tenon caps
      box(B, 'walnutZ', 43.31, y0 + 0.14, 43.37, y1 - 0.14, 0.116, 0.154, 0.005);
      [y0 + 0.126, y1 - 0.140].forEach((yt) => box(B, 'brass', 43.316, yt, 43.364, yt + 0.014, 0.122, 0.148, 0.002));
      // Recessed dark-bronze shadow rail, brushed-brass perimeter trim, and bevelled solid-walnut platform deck
      box(B, 'bronze', 43.09, y0 + 0.03, 43.59, y1 - 0.03, 0.352, 0.366, 0.002);
      box(B, 'brass', 43.064, y0 + 0.004, 43.616, y1 - 0.004, 0.364, 0.370, 0.0015);
      box(B, 'walnutZ', 43.06, y0, 43.62, y1, 0.370, 0.404, 0.009);
      // Lofted, piped, channel-tufted cognac saddle-leather seat mattress lying flat (lean = -Math.PI / 2, firm = true)
      pillow(B, 'leather', 43.34, yc, 0.402, 0.50, 1.98, 0.082, -Math.PI / 2, 0, true);
      // Tailored dark-bronze leather cinch straps with brushed-brass buckles
      [yc - 0.54, yc + 0.54].forEach((ys) => {
        box(B, 'bronze', 43.084, ys - 0.016, 43.596, ys + 0.016, 0.368, 0.485, 0.003);
        box(B, 'brass', 43.078, ys - 0.020, 43.088, ys + 0.020, 0.408, 0.448, 0.002);
      });
      // Cylindrical cognac saddle-leather bolster rolls at both ends with turned walnut end-caps, brass buttons, and round leather strap rings
      [y0 + 0.14, y1 - 0.14].forEach((yb) => {
        B.add(M.leather, new THREE.CylinderGeometry(0.062, 0.062, 0.49, 24), FX.M(WX(43.34), 0.532, WZ(yb), 0, 0, Math.PI / 2));
        B.add(M.walnutZ, new THREE.CylinderGeometry(0.052, 0.052, 0.502, 20), FX.M(WX(43.34), 0.532, WZ(yb), 0, 0, Math.PI / 2));
        B.add(M.brass, new THREE.CylinderGeometry(0.016, 0.016, 0.510, 14), FX.M(WX(43.34), 0.532, WZ(yb), 0, 0, Math.PI / 2));
        [43.19, 43.49].forEach((xs) => {
          B.add(M.bronze, new THREE.CylinderGeometry(0.064, 0.064, 0.022, 24), FX.M(WX(xs), 0.532, WZ(yb), 0, 0, Math.PI / 2));
          box(B, 'bronze', xs - 0.011, yb - 0.020, xs + 0.011, yb + 0.020, 0.398, 0.482, 0.002);
        });
      });
    }));
    // Museum-grade fluted Roman travertine sculpture pedestals (x = 41.62, y = 13.9, 19.9, 25.9): brushed-brass floor base rim,
    // recessed dark-bronze shadow plinth, stepped travertine base collar, fluted Roman travertine shaft (plinthW), dark-bronze and
    // brass neck reveal, cantilevered bevelled travertine tabletop slab (travBlock), and inset brass museum placard.
    const block = (y, s, h) => {
      box(B, 'brass', 41.62 - s - 0.004, y - s - 0.004, 41.62 + s + 0.004, y + s + 0.004, 0, 0.012, 0.002);
      box(B, 'bronze', 41.62 - s + 0.016, y - s + 0.016, 41.62 + s - 0.016, y + s - 0.016, 0.012, 0.046, 0.002);
      box(B, 'travBlock', 41.62 - s - 0.006, y - s - 0.006, 41.62 + s + 0.006, y + s + 0.006, 0.046, 0.076, 0.004);
      box(B, 'plinthW', 41.62 - s, y - s, 41.62 + s, y + s, 0.076, h - 0.052, 0.006);
      box(B, 'bronze', 41.62 - s + 0.010, y - s + 0.010, 41.62 + s - 0.010, y + s - 0.010, h - 0.052, h - 0.036, 0.002);
      box(B, 'brass', 41.62 - s + 0.004, y - s + 0.004, 41.62 + s - 0.004, y + s - 0.004, h - 0.046, h - 0.040, 0.001);
      box(B, 'travBlock', 41.62 - s - 0.014, y - s - 0.014, 41.62 + s + 0.014, y + s + 0.014, h - 0.036, h, 0.005);
      // Stepped dark-bronze and brushed-brass museum mounting pad on the tabletop crown
      box(B, 'bronze', 41.62 - s * 0.58, y - s * 0.58, 41.62 + s * 0.58, y + s * 0.58, h, h + 0.008, 0.002);
      box(B, 'brass', 41.62 - s * 0.60, y - s * 0.60, 41.62 + s * 0.60, y + s * 0.60, h, h + 0.004, 0.001);
      // Inset bronze-bezel and brushed-brass museum title placard centered on the north face (facing the arriving viewer)
      box(d, 'bronze', 41.62 - 0.068, y - s - 0.004, 41.62 + 0.068, y - s, h - 0.238, h - 0.176, 0.001);
      box(d, 'brass', 41.62 - 0.062, y - s - 0.006, 41.62 + 0.062, y - s - 0.002, h - 0.232, h - 0.182, 0.001);
    };
    [['sculptBronze', 'brass'], ['sculptDark', 'bronze']].forEach(([k, f]) => { if (M[k]) return; const o = M[f]; M[k] = o.clone(); M[k].onBeforeCompile = o.onBeforeCompile; M[k].customProgramCacheKey = o.customProgramCacheKey; M[k].userData = Object.assign({}, o.userData); });
    // a bird in flight: one polished bronze blade, swelling and tapering, on a small block of basalt
    thing(41.62, 13.9, () => { block(13.9, 0.23, 0.92); cyl(B, 'basalt', 41.62, 13.9, 0.928, 1.04, 0.068, 0.078, 28);
      vase(B, 'sculptBronze', 41.62, 13.9, 1.04, 1, [[0, 0], [0.028, 0], [0.024, 0.05], [0.019, 0.1], [0.038, 0.22], [0.066, 0.45], [0.072, 0.62], [0.054, 0.82], [0.026, 1.0], [0.006, 1.07], [0, 1.075]]); });
    // a pierced form: a ring of dark bronze swollen into an oval, the hole through it seen from the corridor at an angle
    thing(41.62, 19.9, () => { block(19.9, 0.25, 0.76); cyl(B, 'basalt', 41.62, 19.9, 0.768, 0.798, 0.072, 0.072, 24);
      B.add(M.sculptDark, new THREE.TorusGeometry(0.2, 0.15, 40, 90), FX.M(WX(41.62), 0.798 + 0.35 * 1.28 - 0.02, WZ(19.9), 0, 1.15, 0, 1, 1.28, 0.62)); });
    // a moon jar in a black glaze
    thing(41.62, 25.9, () => { block(25.9, 0.25, 0.62);
      vase(B, 'glazeBlack', 41.62, 25.9, 0.628, 1, [[0, 0], [0.1, 0], [0.19, 0.05], [0.25, 0.15], [0.265, 0.26], [0.245, 0.37], [0.18, 0.46], [0.125, 0.51], [0.118, 0.545], [0.13, 0.555]]);
      cyl(B, 'black', 41.62, 25.9, 1.138, 1.148, 0.112, 0.112, 28); });
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
    if (!M.loungeDark) { M.loungeDark = M.boucle.clone(); M.loungeDark.onBeforeCompile = M.boucle.onBeforeCompile; M.loungeDark.customProgramCacheKey = M.boucle.customProgramCacheKey; M.loungeDark.userData = Object.assign({}, M.boucle.userData); }
    if (!M.shadeDark) { M.shadeDark = D(P({ color: 0x3a2d22, emissive: 0xffb870, emissiveIntensity: 0.16, roughness: 0.88, side: THREE.DoubleSide })); }
    if (!M.rugPile) { M.rugPile = M.rugTaupe.clone(); M.rugPile.onBeforeCompile = M.rugTaupe.onBeforeCompile; M.rugPile.customProgramCacheKey = M.rugTaupe.customProgramCacheKey; M.rugPile.userData = Object.assign({}, M.rugTaupe.userData); }
    if (!M.rugPileB) { M.rugPileB = M.wool.clone(); M.rugPileB.onBeforeCompile = M.wool.onBeforeCompile; M.rugPileB.customProgramCacheKey = M.wool.customProgramCacheKey; M.rugPileB.userData = Object.assign({}, M.wool.userData); }
    const HB = 1.66;                                                     // the headboard's top
    const stack = (bt, x, y, z, cols, rot) => { let zz = z; cols.forEach((c, i) => { const h = 0.026 + ((i * 7) % 3) * 0.006; rbox(bt, c, x, y, zz, zz + h, 0.27 - i * 0.025, 0.2 - i * 0.015, 0.003, rot + (i % 2 ? 0.08 : -0.05)); zz += h; }); return zz; };
    // Clean architectural column & tapered conical-drum table lamp (18 Oct, Sam: "The lamp feels too round, so just review those
    // lamps, make it more clean"): turned honed Roman travertine column on a stepped brushed-brass base cuff, slender brass stem,
    // and a crisp architectural tapered linen-and-alabaster conical drum shade with warm internal diffuser glow.
    const archLamp = (bt, lx, ly, z0, sc) => {
      const s = sc || 1.0;
      cyl(bt, 'bronze', lx, ly, z0, z0 + 0.008 * s, 0.058 * s, 0.060 * s, 32);
      cyl(bt, 'brass', lx, ly, z0 + 0.008 * s, z0 + 0.086 * s, 0.058 * s, 0.058 * s, 36);
      bt.add(M.brass, new THREE.TorusGeometry(0.058 * s, 0.003 * s, 10, 36), FX.M(WX(lx), z0 + 0.086 * s, WZ(ly), Math.PI / 2, 0, 0));
      cyl(bt, 'plinthW', lx, ly, z0 + 0.086 * s, z0 + 0.292 * s, 0.056 * s, 0.056 * s, 40);
      cyl(bt, 'brass', lx, ly, z0 + 0.292 * s, z0 + 0.308 * s, 0.058 * s, 0.054 * s, 36);
      cyl(bt, 'brass', lx, ly, z0 + 0.308 * s, z0 + 0.385 * s, 0.011 * s, 0.011 * s, 20);
      // Clean architectural tapered conical-drum linen shade (bottom r0 = 0.215 * s, top r1 = 0.078 * s, height = 0.228 * s)
      const r0 = 0.215 * s, r1 = 0.078 * s, shH = 0.228 * s, zSh = z0 + 0.442 * s;
      bt.add(M.shade, new THREE.CylinderGeometry(r1, r0, shH, 48, 1, true), FX.M(WX(lx), zSh, WZ(ly)));
      bt.add(M.brass, new THREE.TorusGeometry(r0, 0.0028 * s, 10, 48), FX.M(WX(lx), zSh - shH / 2, WZ(ly), Math.PI / 2, 0, 0));
      bt.add(M.brass, new THREE.TorusGeometry(r1, 0.0026 * s, 10, 48), FX.M(WX(lx), zSh + shH / 2, WZ(ly), Math.PI / 2, 0, 0));
      // Warm frosted alabaster bottom & top diffuser baffles + internal luminous core
      cyl(bt, 'globeGlow', lx, ly, zSh - shH * 0.44, zSh - shH * 0.38, r0 * 0.88, r0 * 0.84, 36);
      cyl(bt, 'glowSoft', lx, ly, zSh - shH * 0.35, zSh + shH * 0.38, r0 * 0.52, r1 * 0.78, 28);
      cyl(bt, 'brass', lx, ly, zSh + shH * 0.44, zSh + shH * 0.48, 0.016 * s, 0.016 * s, 20);
    };

    // Three-Zone Architectural Headboard Wall with Illuminated Solid-Walnut Display Niche (X - 2.34 .. X + 2.34, HB = 1.66 m):
    // - Outer solid-walnut perimeter frame (walnutZ) with brushed-brass trim inlay and recessed dark-bronze shadow plinth
    // - Left & Right Nightstand Wings (X - 2.28 .. X - 1.38 and X + 1.38 .. X + 2.28): 4 full-height sculpted suede-velvet channels each
    // - Center California King Bed Zone (X - 1.38 .. X + 1.38, 2.76 m wide): 10 lower suede-velvet channels (z = 0.04..1.28 m)
    //   crowned by a recessed, warm cove-lit solid-walnut display niche (z = 1.28..1.62 m) spanning the exact width of the King bed.
    thing(X, 32.3, () => {
      const makeChannel = (w, h) => {
        const dp = 0.145, rf = 0.048, rb = 0.010, sh = new THREE.Shape(), x0 = -w / 2, x1 = w / 2, y0 = -dp / 2, y1 = dp / 2;
        sh.moveTo(x0 + rb, y1); sh.lineTo(x1 - rb, y1); sh.quadraticCurveTo(x1, y1, x1, y1 - rb); sh.lineTo(x1, y0 + rf); sh.quadraticCurveTo(x1, y0, x1 - rf, y0);
        sh.lineTo(x0 + rf, y0); sh.quadraticCurveTo(x0, y0, x0, y0 + rf); sh.lineTo(x0, y1 - rb); sh.quadraticCurveTo(x0, y1, x0 + rb, y1);
        const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.005, bevelSegments: 3, curveSegments: 12 });
        g.rotateX(-Math.PI / 2); g.translate(0, 0.04, 0); return g;
      };
      const CH_WING = makeChannel(0.218, HB - 0.06);
      const CH_BED  = makeChannel(0.268, 1.23);
      // 4 full-height channels on the Left Wing and 4 on the Right Wing
      for (let i = 0; i < 4; i++) {
        B.add(M.mushroom, CH_WING, FX.M(WX(X - 2.165 + i * 0.222), 0, WZ(32.238)));
        B.add(M.mushroom, CH_WING, FX.M(WX(X + 1.499 + i * 0.222), 0, WZ(32.238)));
      }
      // 10 lower backrest channels spanning the 2.76 m California King bed center zone (X - 1.38 .. X + 1.38)
      for (let i = 0; i < 10; i++) {
        B.add(M.mushroom, CH_BED, FX.M(WX(X - 1.233 + i * 0.274), 0, WZ(32.238)));
      }
      // Dark-bronze recessed backing behind the channel joints & floor shadow plinth
      box(B, 'bronze', X - 2.30, 32.21, X + 2.30, 32.265, 0, 0.042, 0.002);
      box(B, 'mushroom', X - 2.28, 32.235, X + 2.28, 32.262, 0.04, 1.28, 0.004);
      // Outer mitered solid American Walnut perimeter frame (left stile, right stile, and continuous top crown ledge)
      box(B, 'walnutZ', X - 2.34, 32.16, X - 2.28, 32.35, 0.02, HB + 0.045, 0.005);
      box(B, 'walnutZ', X + 2.28, 32.16, X + 2.34, 32.35, 0.02, HB + 0.045, 0.005);
      box(B, 'walnutZ', X - 2.34, 32.14, X + 2.34, 32.38, HB + 0.005, HB + 0.050, 0.006);
      box(B, 'brass', X - 2.342, 32.376, X + 2.342, 32.382, HB + 0.003, HB + 0.009, 0.0015);
      // Center Recessed Illuminated Walnut Display Niche (X - 1.385 .. X + 1.385, z = 1.28 .. HB + 0.005)
      box(B, 'walnutZ', X - 1.388, 32.16, X - 1.352, 32.35, 0.04, HB + 0.005, 0.004);
      box(B, 'walnutZ', X + 1.352, 32.16, X + 1.388, 32.35, 0.04, HB + 0.005, 0.004);
      box(B, 'walnutZ', X - 1.385, 32.16, X + 1.385, 32.355, 1.278, 1.312, 0.004);
      box(B, 'brass', X - 1.385, 32.350, X + 1.385, 32.358, 1.276, 1.282, 0.0015);
      // Warm cove-lit solid American Walnut & fluted Roman travertine back panel inside the display niche + concealed top LED strip
      box(B, 'walnutZ', X - 1.352, 32.16, X + 1.352, 32.198, 1.310, HB + 0.005, 0.003);
      box(B, 'plinthW', X - 1.335, 32.198, X + 1.335, 32.212, 1.316, HB - 0.008, 0.003);
      [-0.46, 0.46].forEach((dx) => box(B, 'brass', X + dx - 0.004, 32.208, X + dx + 0.004, 32.222, 1.314, HB - 0.006, 0.001));
      box(d, 'glow', X - 1.34, 32.30, X + 1.34, 32.325, HB - 0.010, HB + 0.002, 0.001);
      // Curated gallery objects inside the three walnut-and-travertine niche bays (with the larger fluted bowl centered on the bottom shelf)
      stack(d, X - 0.90, 32.275, 1.312, ['bk2', 'bk1'], 0.03);
      ball(d, 'sculptBronze', X - 0.90, 32.275, 1.312 + 0.062 + 0.026, 0.026);
      lathe(d, 'flutedBowl', X, 32.275, 1.312, BOWL.map(([r, h]) => [r * 0.82, h * 0.82]));
      stack(d, X + 0.86, 32.275, 1.312, ['bk4'], -0.02);
      vase(d, 'glazeBlack', X + 1.06, 32.275, 1.312, 0.16, URN);
    });

    // Sleek, proportionate horizontal framed abstract impasto artwork above the headboard crown (w = 1.54 m, h = 0.62 m)
    // symmetrically flanked on both left and right by matching patinated-bronze URN vessels
    art('bedroom', 'paint', 'N', X, 32.215, HB + 0.050 + 0.042 + 0.31, 1.54, 0.62, 'black', 9);
    // Preserve exact shared R() calls in Z while placing matching bronze vessels on left and right of the painting (z = HB + 0.050)
    vase(d, 'sculptDark', X + 1.04, 32.26, HB + 0.050, 0.38, URN);
    branches(Z, X + 1.8, 32.3, HB + 0.36, 0.62, 5);
    books(Z, 47.15, 32.3, 1.43, 3, 0.1);
    vase(d, 'sculptDark', X - 1.04, 32.26, HB + 0.050, 0.38, URN);
    // Continuous warm architectural ceiling cove wash across the charred larch battens
    box(d, 'glow', 43.7, 32.236, 50.8, 32.27, 3.578, 3.596, 0.001);

    // Commanding California King / Emperor Platform Bed (2.76 m wide x 2.50 m long, X - 1.38 .. X + 1.38, Y0 = 32.32 .. Y1 = 34.82):
    // - Recessed dark-walnut & brushed-brass shadow plinth (z = 0..0.058 m)
    // - Mitered, softly crowned suede-velvet upholstered platform rails (mushroom, z = 0.058..0.345 m) with corner seam reveals
    // - Plush pillow-top mattress (cotton, z = 0.33..0.63 m) with double French welt piping
    // - Cloud-loft quilted Belgian flax-linen duvet (duvet), crisp fold-back cotton percale top sheet (cotton),
    //   and multi-fold terracotta-rust cashmere bed runner throw (rust)
    // - Three-tier couture flanged & piped pillow arrangement (2 wide cognac-mocha Euro shams, 2 ivory percale King pillows,
    //   and 2 pairs of layered olive-velvet & oatmeal-boucle lumbar cushions)
    thing(X, 33.55, () => {
      const W = 1.38, Y0 = 32.32, Y1 = 34.82;
      // Recessed dark-walnut & brushed-brass shadow plinth
      box(B, 'brass', X - W + 0.135, Y0 + 0.08, X + W - 0.135, Y1 - 0.12, 0, 0.008, 0.002);
      box(B, 'walnutZ', X - W + 0.14, Y0 + 0.08, X + W - 0.14, Y1 - 0.12, 0.008, 0.058, 0.005);
      // Sculpted upholstered platform bed frame with rounded side/foot rails
      box(B, 'mushroom', X - W, Y0, X + W, Y1, 0.058, 0.345, 0.042);
      // Solid-walnut & brushed-brass inner mattress trim collar
      box(B, 'walnutZ', X - W + 0.06, Y0 + 0.02, X + W - 0.06, Y1 - 0.06, 0.338, 0.352, 0.004);
      box(B, 'brass', X - W + 0.055, Y0 + 0.015, X + W - 0.055, Y1 - 0.055, 0.346, 0.351, 0.0015);
      // Sculpted pillow-top mattress with crowned top and piped perimeter welt
      pillow(B, 'cotton', X, 33.55, 0.335, 2.58, 2.36, 0.295, -Math.PI / 2, 0, true);
      // Cloud-loft Belgian flax-linen duvet, fold-back ivory cotton percale sheet, and multi-fold terracotta-cashmere throw
      // Stepped widths (2.58 -> 2.63 -> 2.66 m) ensure outer layers wrap cleanly outside the duvet's side skirts with zero clipping
      drape(d, 'duvet', X, 33.92, 0.672, 2.58, 1.68, 0.13, [0.32, 0.32, 0.34, 0.04], 0.022, 0.020, 1);
      drape(d, 'cotton', X, 33.24, 0.692, 2.63, 0.38, 0.07, [0.20, 0.20, 0.04, 0.04], 0.010, 0.010, 3);
      drape(d, 'rust', X, 34.16, 0.712, 2.66, 0.82, 0.12, [0.25, 0.25, 0.06, 0.05], 0.018, 0.014, 5);
      // Secondary folded cashmere pleat along the upper edge of the terracotta bed runner
      pillow(d, 'rust', X, 33.82, 0.708, 2.56, 0.22, 0.042, -Math.PI / 2, 0, true);
      // Three-Tier Fluffy Down Pillows with Clearly Stepped Widths (1.18 m -> 0.84 m -> 0.56 m) and zero mesh intersection:
      // 1. Back row: Two wide Cognac-Sienna Euro headboard cushions (mocha, 1.18 m wide each) resting against the headboard
      [-0.62, 0.62].forEach((dx, i) => pillow(d, 'mocha', X + dx, 32.45, 0.655, 1.18, 0.54, 0.18, -0.18, i ? -0.025 : 0.025, 'sham'));
      // 2. Middle row: Two plump Ivory Cotton-Percale sleeping pillows (cotton, 0.84 m wide each, 34 cm narrower) leaning in front of the brown cushions
      [-0.58, 0.58].forEach((dx, i) => pillow(d, 'cotton', X + dx, 32.76, 0.668, 0.84, 0.44, 0.18, -0.34, i ? 0.025 : -0.025, 'sham'));
      // 3. Front row: Two Oatmeal-Boucle down lumbar cushions (boucle, 0.56 m wide each) leaning in front of the white pillows
      [-0.58, 0.58].forEach((dx, i) => pillow(d, 'boucle', X + dx, 33.04, 0.692, 0.56, 0.28, 0.15, -0.46, i ? -0.020 : 0.020, 'sham'));
    });

    // Flanking Solid American Walnut & Honed Calacatta Marble Nightstands (x = X - 1.84 and X + 1.84, width = 0.76 m)
    // with Clean Architectural Conical-Drum Column Lamps (archLamp)
    [X - 1.84, X + 1.84].forEach((x, i) => thing(x, 32.6, () => {
      box(B, 'black', x - 0.31, 32.38, x + 0.31, 32.80, 0, 0.06, 0.004);
      box(B, 'brass', x - 0.315, 32.375, x + 0.315, 32.805, 0.056, 0.064, 0.002);
      box(B, 'walnutZ', x - 0.37, 32.34, x + 0.37, 32.86, 0.064, 0.510, 0.008);
      // Recessed dark-bronze shadow reveal between upper and lower walnut drawers + twin brushed-brass bar pulls
      box(d, 'bronze', x - 0.355, 32.858, x + 0.355, 32.866, 0.282, 0.290, 0.001);
      [0.415, 0.195].forEach((zh) => {
        box(d, 'brass', x - 0.12, 32.880, x + 0.12, 32.892, zh - 0.006, zh + 0.006, 0.0025);
        [-0.10, 0.10].forEach((o) => box(d, 'brass', x + o - 0.005, 32.860, x + o + 0.005, 32.882, zh - 0.004, zh + 0.004, 0.001));
      });
      // Honed Calacatta marble countertop slab with subtle brushed-brass under-collar
      box(B, 'brass', x - 0.375, 32.335, x + 0.375, 32.865, 0.510, 0.515, 0.0015);
      box(B, 'counterStone', x - 0.38, 32.33, x + 0.38, 32.87, 0.515, 0.542, 0.005);
      const lx = x + (i ? 0.04 : -0.04);
      archLamp(d, lx, 32.58, 0.542, 1.0);
      // Preserve shared R() calls in Z + curated tabletop catchall dish
      books(Z, x - 1.05 + (i ? -0.15 : 0.15), 32.64, 0.53, 2, 0.2);
      lathe(d, i ? 'counterStone' : 'glazeBlack', x + (i ? -0.22 : 0.22), 32.64, 0.542, BOWL.map(([r, h]) => [r * 0.42, h * 0.42]));
      lamp('bedroom', lx, 32.74, 1.04, 0xffc68a, 0.85, 2.6);
    }));
    lamp('bedroom', X, 32.78, 2.55, 0xffd09a, 4.8, 8);                  // close to the larch and high, so it grazes the battens

    // Sculpted Designer End-of-Bed Bench (X = 47.25, yc = 35.28, width = 2.04 m, depth = 0.52 m):
    // - 4 standard solid American Walnut corner legs (four clean points of contact) with machined brushed-brass foot sabots
    // - Bevelled solid-walnut platform seat rail with dark-bronze shadow reveal and brass inlay
    // - 8x2 Channel-tufted oatmeal-boucle seat mattress (boucle)
    // - Solid-walnut & cognac-leather valet tray on the left holding an open large-format architectural monograph + folded cashmere throw on the right
    thing(X, 35.28, () => {
      const BY = 35.28;
      // 4 standard tapered solid-walnut corner legs with machined brushed-brass foot sabots
      [[-0.86, -0.18], [0.86, -0.18], [-0.86, 0.18], [0.86, 0.18]].forEach(([dx, dy]) => {
        const lx = X + dx, ly = BY + dy;
        cyl(B, 'bronze', lx, ly, 0, 0.005, 0.018, 0.018, 16);
        cyl(B, 'brass', lx, ly, 0.005, 0.052, 0.018, 0.022, 20);
        tleg(B, 'walnutZ', [lx, ly, 0.052], [lx, ly, 0.273], 0.022, 0.030);
      });
      // Recessed bronze shadow rail, brass trim, and bevelled solid-walnut platform deck
      box(B, 'bronze', X - 0.98, BY - 0.22, X + 0.98, BY + 0.22, 0.258, 0.270, 0.002);
      box(B, 'brass', X - 1.015, BY - 0.255, X + 1.015, BY + 0.255, 0.268, 0.273, 0.0015);
      box(B, 'walnutZ', X - 1.02, BY - 0.26, X + 1.02, BY + 0.26, 0.273, 0.312, 0.008);
      // 8x2 Channel-Tufted Oatmeal-Boucle Seat Mattress (channel grooves & tufted squares rendered in boucle shader)
      pillow(B, 'boucle', X, BY, 0.308, 2.02, 0.50, 0.118, -Math.PI / 2, 0, true);
      // Right (X + 0.42): Neatly folded two-layer warm stone-taupe & oatmeal cashmere throw
      pillow(d, 'taupe', X + 0.42, BY, 0.420, 0.42, 0.36, 0.028, -Math.PI / 2, 0.02, true);
      pillow(d, 'oat', X + 0.42, BY + 0.01, 0.446, 0.38, 0.33, 0.024, -Math.PI / 2, -0.01, true);
      // Left (X - 0.38): Mitered Solid-Walnut & Cognac-Leather Valet Tray with an Open Large-Format Art Monograph
      const TX_B = X - 0.38;
      box(d, 'walnutZ', TX_B - 0.28, BY - 0.18, TX_B + 0.28, BY + 0.18, 0.420, 0.448, 0.004);
      box(d, 'leather', TX_B - 0.26, BY - 0.16, TX_B + 0.26, BY + 0.16, 0.426, 0.450, 0.002);
      // Open architectural monograph inside the tray (left & right arched pages + dark photographic plates)
      box(d, 'bk2', TX_B - 0.21, BY - 0.13, TX_B + 0.21, BY + 0.13, 0.450, 0.458, 0.002);
      [-1, 1].forEach((sd) => {
        rbox(d, 'cotton', TX_B + sd * 0.098, BY, 0.456, 0.474, 0.192, 0.245, 0.004, 0, sd * 0.05);
        rbox(d, sd < 0 ? 'bk2' : 'bk4', TX_B + sd * 0.102, BY + sd * 0.01, 0.468, 0.476, 0.125, 0.145, 0.001, 0, sd * 0.05);
      });
      books(Z, 45.75, 35.24, 0.42, 2, 0.3);
    });
    // Museum-grade hand-knotted Tibetan wool & bamboo-silk area carpet (18 Oct, Sam: "Here for the main carpet, just make sure
    // to reduce the length a tiny bit so it doesn't reach the circular carpet"):
    // - Outer mitered corded wool border (rugPileB): X - 2.95 .. X + 2.95 (44.30..50.20), y = 33.05..36.75 (yc = 34.90)
    // - Inner carved-relief wool & silk field (rugPile): X - 2.35 .. X + 2.35 (44.90..49.60), y = 33.62..36.18 (yc = 34.90)
    box(d, 'rugPileB', X - 2.95, 33.05, X + 2.95, 36.75, 0, 0.016, 0.006);
    box(d, 'rugPile', X - 2.35, 33.62, X + 2.35, 36.18, 0, 0.025, 0.008);
    // 1. South-West Glass Corner Lounge Ensemble (18 Oct, Sam: "And for the two chairs and the furniture on the circular carpet,
    //    I think just change the color. I like it, but the cushion and the carpet have the same color tone, so lack of contrast.
    //    Maybe those two chairs, you can make it a little bit darker. And as well, for the carpet, just change the color tone
    //    different from the main carpet underneath the master bed"):
    //    - Concentric-braided round rug (straw) in a cool mineral silver-celadon & pewter-sage palette at (42.86, 38.86)
    //    - Two corner lounge chairs with dark smoked-oak frames (chairWood), deep roasted espresso-umber bouclé cushions (loungeDark),
    //      and tailored cognac saddle-leather accent lumbar pillows (leather)
    //    - Turned dark American walnut, brushed-brass & Nero-marble drum side table at (42.42, 39.18)
    //    - Brushed-brass & smoked-taupe pleated-linen floor lamp tucked behind the table at (41.78, 39.92)
    cyl(d, 'straw', 42.86, 38.86, 0, 0.009, 1.60, 1.60, 64);
    cyl(d, 'straw', 42.86, 38.86, 0, 0.016, 1.54, 1.54, 64);
    lounge(B, 42.26, 38.05, 0.96, 'loungeDark', 'chairWood');
    lounge(B, 43.62, 39.42, 2.22, 'loungeDark', 'chairWood');
    // Tailored cognac saddle-leather accent lumbar cushions resting against each corner chair's backrest
    [[42.26, 38.05, 0.96], [43.62, 39.42, 2.22]].forEach(([cx, cy, rot]) => {
      const c = Math.cos(rot), s = Math.sin(rot);
      pillow(d, 'leather', cx - 0.10 * s, cy - 0.10 * c, 0.30, 0.44, 0.20, 0.085, -0.34, rot, true);
    });
    thing(42.42, 39.18, () => {
      const TX = 42.42, TY = 39.18;
      cyl(B, 'bronze', TX, TY, 0, 0.028, 0.225, 0.225, 40);
      cyl(B, 'brass', TX, TY, 0.028, 0.038, 0.238, 0.238, 40);
      cyl(B, 'walnutZ', TX, TY, 0.038, 0.416, 0.256, 0.256, 48);
      cyl(B, 'brass', TX, TY, 0.224, 0.232, 0.259, 0.259, 48);
      cyl(B, 'brass', TX, TY, 0.416, 0.426, 0.264, 0.264, 48);
      cyl(B, 'marbleNero', TX, TY, 0.426, 0.460, 0.285, 0.285, 48);
      vase(d, 'sculptBronze', TX - 0.08, TY - 0.06, 0.460, 0.52);
      sprigs(d, TX - 0.08, TY - 0.06, 0.70, 0.45, 4);
      stack(d, TX + 0.09, TY + 0.06, 0.460, ['bk3', 'bk1'], 0.65);
      cyl(d, 'brass', TX + 0.06, TY - 0.11, 0.460, 0.466, 0.046, 0.040, 24);
      cyl(d, 'mocha', TX + 0.06, TY - 0.11, 0.466, 0.510, 0.028, 0.024, 24);
    });
    thing(41.78, 39.92, () => {
      cyl(B, 'bronze', 41.78, 39.92, 0, 0.026, 0.175, 0.175, 32);
      cyl(B, 'brass', 41.78, 39.92, 0.026, 0.042, 0.042, 0.024, 20);
      cyl(B, 'brass', 41.78, 39.92, 0.042, 1.52, 0.009, 0.009, 12);
      d.add(M.shadeDark, pleatGeo(0.21, 0.175, 0.31, 32), FX.M(WX(41.78), 1.63, WZ(39.92)));
      cyl(B, 'brass', 41.78, 39.92, 1.78, 1.81, 0.012, 0.004, 12);
    });
    lamp('bedroom', 41.78, 39.92, 1.56, 0xffe2b8, 0.62, 4.5);

    // 2. Relocated Cream Ceramic Amphora Vase on a Fluted Travertine Pedestal on the Right Side of the Exit Door
    //    (18 Oct, Sam: "maybe remove the vase. Maybe you can add it on the right side of the door, the exit"):
    //    The exit doorway to the dressing room spans y = 32.6..34.4 on the East wall (x = 51.0). Standing at (50.56, 34.86)
    //    right beside the right jamb of the exit doorway is a fluted Roman travertine cylinder pedestal holding the cream
    //    stoneware amphora and sculpted dark botanical twigs.
    thing(50.56, 34.86, () => {
      const VX = 50.56, VY = 34.86, PH0 = 0.68;
      cyl(B, 'bronze', VX, VY, 0, 0.032, 0.165, 0.165, 36);
      cyl(B, 'brass', VX, VY, 0.032, 0.040, 0.175, 0.175, 36);
      cyl(B, 'plinthW', VX, VY, 0.040, PH0 - 0.034, 0.185, 0.185, 44);
      cyl(B, 'brass', VX, VY, PH0 - 0.034, PH0 - 0.026, 0.192, 0.192, 44);
      cyl(B, 'travBlock', VX, VY, PH0 - 0.026, PH0, 0.205, 0.205, 44);
      vase(B, 'ceramic', VX, VY, PH0, 0.84, URN);
      const Rb = FX.rng(5150);
      [[-0.52, 0.62], [-0.15, 0.68], [0.18, 0.66], [0.55, 0.56]].forEach(([lean, len], k) => {
        let p = [VX, VY, PH0 + 0.42], a = Math.PI / 2 + lean * 0.65, up = 1.22 - Math.abs(lean) * 0.24;
        for (let i = 0; i < 6; i++) {
          a += (Rb() - 0.5) * 0.28; up += (Rb() - 0.5) * 0.14;
          const l = len / 6, q = [p[0] + Math.cos(a) * Math.cos(up) * l * 0.28, p[1] + Math.sin(a) * Math.cos(up) * l, p[2] + Math.sin(up) * l];
          rod(B, 'twigDark', p, q, 0.0065 - i * 0.0008);
          if (i >= 2) {
            const sDir = (k % 2 ? 1 : -1) * (i % 2 ? 1 : -0.7);
            const tip = [q[0] - 0.015, q[1] + sDir * 0.055, q[2] + 0.048];
            rod(B, 'twigDark', q, tip, 0.0024);
            ball(B, 'urnLeaf', tip[0], tip[1], tip[2], 0.012, 0.45, 1.4, 0.7);
          }
          p = q;
        }
      });
    });

    // 3. Raised Bespoke American Walnut & Calacatta Stone Makeup Vanity Desk, Vanity Stool, Rich Makeup Styling &
    //    Illuminated Architectural Vanity Mirror (18 Oct, Sam: "For the picture, this is a desk for makeup, so maybe you can
    //    raise it a little bit, add more drawer, spend detail on the texture, add more nice decoration, and maybe remove the
    //    vase... Replace the painting by a mirror, but the mirror doesn't need to show actual reflection. Just create a mirror
    //    and add some light texture inside so we can see"):
    M.vanityMirror = M.vanityMirror || D(P({ color: 0xd8e0e8, roughness: 0.06, metalness: 0.22 }));
    thing(50.58, 37.00, () => {
      const DX0 = 50.32, DX1 = 50.86, DY0 = 35.46, DY1 = 38.54, DTOP = 0.785;
      // Left & Right 4-Drawer Pedestal Cabinets (y = 35.46..36.32 and y = 37.68..38.54)
      [[35.46, 36.32], [37.68, 38.54]].forEach(([py0, py1]) => {
        // Recessed matte-black shadow plinth & brushed-brass base trim
        box(B, 'black', DX0 + 0.04, py0 + 0.03, DX1, py1 - 0.03, 0, 0.100, 0.003);
        box(B, 'brass', DX0 + 0.032, py0 + 0.022, DX1, py1 - 0.022, 0.100, 0.112, 0.002);
        // Solid American Walnut pedestal carcass with mitered side stiles
        box(B, 'walnutZ', DX0 + 0.008, py0, DX1, py1, 0.112, 0.742, 0.006);
        // Dark-bronze recessed drawer shadow cavity behind the 4 drawer fronts
        box(B, 'bronze', DX0 + 0.003, py0 + 0.018, DX0 + 0.014, py1 - 0.018, 0.124, 0.734, 0.001);
        // 4 Graduated Horizontal Walnut Drawers per pedestal (8 pedestal drawers total)
        const dHeights = [[0.128, 0.268], [0.278, 0.418], [0.428, 0.568], [0.578, 0.730]];
        dHeights.forEach(([z0, z1]) => {
          const ym = (py0 + py1) * 0.5, zm = (z0 + z1) * 0.5;
          box(B, 'walnutZ', DX0 - 0.004, py0 + 0.022, DX0 + 0.010, py1 - 0.022, z0, z1, 0.003);
          // Machined brushed-brass bar pull on twin standoffs
          box(B, 'brass', DX0 - 0.024, ym - 0.13, DX0 - 0.013, ym + 0.13, zm - 0.006, zm + 0.006, 0.002);
          [-0.105, 0.105].forEach((o) => box(B, 'brass', DX0 - 0.014, ym + o - 0.005, DX0 - 0.003, ym + o + 0.005, zm - 0.004, zm + 0.004, 0.001));
        });
      });

      // Center Kneehole Modesty Back Panel & Wide Upper Makeup Drawer (9th Drawer, y = 36.32..37.68, z = 0.612..0.736)
      box(B, 'walnutZ', DX1 - 0.06, 36.32, DX1, 37.68, 0.112, 0.612, 0.004);
      box(B, 'brass', DX1 - 0.065, 36.32, DX1 - 0.055, 37.68, 0.112, 0.124, 0.002);
      box(B, 'walnutZ', DX0 + 0.008, 36.32, DX1, 37.68, 0.608, 0.742, 0.005);
      box(B, 'bronze', DX0 + 0.003, 36.335, DX0 + 0.014, 37.665, 0.616, 0.732, 0.001);
      // Wide center velvet-lined makeup drawer front with twin brushed-brass bar pulls
      box(B, 'walnutZ', DX0 - 0.004, 36.34, DX0 + 0.010, 37.66, 0.620, 0.730, 0.003);
      [36.68, 37.32].forEach((ym) => {
        const zm = 0.675;
        box(B, 'brass', DX0 - 0.024, ym - 0.12, DX0 - 0.013, ym + 0.12, zm - 0.006, zm + 0.006, 0.002);
        [-0.095, 0.095].forEach((o) => box(B, 'brass', DX0 - 0.014, ym + o - 0.005, DX0 - 0.003, ym + o + 0.005, zm - 0.004, zm + 0.004, 0.001));
      });

      // Continuous Bevelled Solid Walnut Sub-Apron, Brushed-Brass Perimeter Collar & Honed Calacatta Stone Countertop Slab
      box(B, 'walnutZ', DX0 - 0.008, DY0 - 0.008, DX1, DY1 + 0.008, 0.736, 0.756, 0.004);
      box(B, 'brass', DX0 - 0.010, DY0 - 0.010, DX1, DY1 + 0.010, 0.756, 0.761, 0.0015);
      box(B, 'counterStone', DX0 - 0.014, DY0 - 0.014, DX1, DY1 + 0.014, 0.761, DTOP, 0.005);
      // Low 3.5 cm Calacatta stone backsplash lip along the East wall
      box(B, 'counterStone', DX1 - 0.032, DY0 - 0.014, DX1, DY1 + 0.014, DTOP, DTOP + 0.036, 0.003);

      // Tucked Round Oatmeal-Bouclé & Brushed-Brass Vanity Stool in the center kneehole (x = 50.20, y = 37.00, z = 0..0.465 m)
      const SX = 50.20, SY = 37.00;
      cyl(B, 'bronze', SX, SY, 0, 0.018, 0.195, 0.195, 36);
      cyl(B, 'brass', SX, SY, 0.018, 0.042, 0.208, 0.208, 36);
      cyl(B, 'boucle', SX, SY, 0.042, 0.335, 0.215, 0.215, 40);
      cyl(B, 'brass', SX, SY, 0.335, 0.354, 0.220, 0.220, 40);
      cyl(B, 'boucle', SX, SY, 0.354, 0.455, 0.226, 0.220, 40);
      ball(B, 'boucle', SX, SY, 0.445, 0.222, 0.16, 1.0, 1.0);

      // --- Luxury Makeup & Vanity Tabletop Styling (on DTOP = 0.785 m) ---
      // (A) Left Wing (y = 35.78): Clean Architectural Column & Conical-Drum Vanity Table Lamp + Fashion Monographs
      archLamp(d, 50.56, 35.78, DTOP, 0.76);
      stack(d, 50.58, 36.12, DTOP, ['bk2', 'bk1'], 1.58);
      ball(d, 'sculptBronze', 50.58, 36.12, DTOP + 0.06 + 0.038, 0.038);

      // (B) Center-Left (y = 36.38..36.86): Brushed-Brass Mirrored Perfume & Skincare Tray
      box(d, 'brass', 50.45, 36.38, 50.71, 36.86, DTOP, DTOP + 0.012, 0.003);
      box(d, 'vanityMirror', 50.465, 36.395, 50.695, 36.845, DTOP + 0.008, DTOP + 0.014, 0.001);
      // 4 Crystal, Amber & Emerald Glass Perfume Flacons with gold atomizers
      // Flacon 1: Tall rectangular amber glass parfum bottle
      box(d, 'bottleA', 50.54, 36.45, 50.61, 36.53, DTOP + 0.014, DTOP + 0.125, 0.006);
      cyl(d, 'brass', 50.575, 36.49, DTOP + 0.125, DTOP + 0.156, 0.015, 0.015, 18);
      // Flacon 2: Faceted emerald glass flacon with spherical gold stopper
      cyl(d, 'bottleG', 50.62, 36.61, DTOP + 0.014, DTOP + 0.105, 0.034, 0.028, 12);
      cyl(d, 'brass', 50.62, 36.61, DTOP + 0.105, DTOP + 0.122, 0.012, 0.012, 16);
      ball(d, 'brass', 50.62, 36.61, DTOP + 0.136, 0.016);
      // Flacon 3: Slender dark botanical elixir bottle
      cyl(d, 'bottle', 50.51, 36.63, DTOP + 0.014, DTOP + 0.118, 0.024, 0.022, 20);
      cyl(d, 'brass', 50.51, 36.63, DTOP + 0.118, DTOP + 0.145, 0.010, 0.012, 16);
      // Flacon 4: Wide crystal rose-water flacon
      box(d, 'glass', 50.53, 36.71, 50.60, 36.79, DTOP + 0.014, DTOP + 0.095, 0.008);
      box(d, 'brass', 50.55, 36.73, 50.58, 36.77, DTOP + 0.095, DTOP + 0.118, 0.003);
      // 2 Luxury Skincare Jars with spun gold lids
      cyl(d, 'ceramic', 50.64, 36.76, DTOP + 0.014, DTOP + 0.056, 0.032, 0.030, 22);
      cyl(d, 'brass', 50.64, 36.76, DTOP + 0.056, DTOP + 0.068, 0.033, 0.033, 22);
      cyl(d, 'glazeBlack', 50.50, 36.53, DTOP + 0.014, DTOP + 0.048, 0.026, 0.025, 20);
      cyl(d, 'brass', 50.50, 36.53, DTOP + 0.048, DTOP + 0.058, 0.027, 0.027, 20);

      // (C) Center-Right (y = 37.02..37.48): Fluted Brass Makeup Brush Cup, 3 Gold Lipsticks & Open Compact Palette
      box(d, 'walnutZ', 50.45, 37.02, 50.69, 37.44, DTOP, DTOP + 0.012, 0.003);
      box(d, 'mushroom', 50.465, 37.035, 50.675, 37.425, DTOP + 0.008, DTOP + 0.014, 0.002);
      // Fluted brushed-brass cylinder cup holding 7 fanned cosmetic & kabuki brushes
      const BX = 50.59, BY = 37.11;
      cyl(d, 'brass', BX, BY, DTOP + 0.014, DTOP + 0.112, 0.034, 0.038, 24);
      cyl(d, 'bronze', BX, BY, DTOP + 0.106, DTOP + 0.113, 0.032, 0.032, 20);
      [[-0.014, -0.012, 0.085, 0.014, 'cotton'], [0.015, -0.010, 0.092, 0.016, 'boucle'],
       [-0.006, 0.015, 0.078, 0.012, 'mocha'], [0.012, 0.014, 0.088, 0.015, 'cotton'],
       [0.0, 0.0, 0.098, 0.018, 'boucle'], [-0.016, 0.004, 0.082, 0.011, 'rust'],
       [0.005, -0.016, 0.080, 0.012, 'cotton']].forEach(([ox, oy, bh, br, bMat]) => {
        const p0 = [BX + ox * 0.4, BY + oy * 0.4, DTOP + 0.08], p1 = [BX + ox * 1.45, BY + oy * 1.45, DTOP + 0.112 + bh];
        rod(d, 'bronze', p0, p1, 0.0038);
        ball(d, bMat, p1[0], p1[1], p1[2] + br * 0.6, br, 1.25, 0.88, 0.88);
      });
      // 3 Gold-Cased Luxury Lipsticks (one uncapped showing its terracotta-rose bullet)
      cyl(d, 'brass', 50.50, 37.18, DTOP + 0.014, DTOP + 0.068, 0.010, 0.010, 16);
      cyl(d, 'rust', 50.50, 37.18, DTOP + 0.068, DTOP + 0.088, 0.0075, 0.005, 14);
      cyl(d, 'brass', 50.53, 37.21, DTOP + 0.014, DTOP + 0.052, 0.010, 0.010, 16);
      cyl(d, 'brass', 50.49, 37.24, DTOP + 0.014, DTOP + 0.084, 0.010, 0.010, 16);
      // Open Gold & Ebony Makeup Compact Palette with 4 blush/bronzer powder pans
      box(d, 'bronze', 50.51, 37.29, 50.61, 37.39, DTOP + 0.014, DTOP + 0.024, 0.002);
      box(d, 'brass', 50.508, 37.288, 50.612, 37.392, DTOP + 0.014, DTOP + 0.021, 0.002);
      [[50.535, 37.315, 'rust'], [50.585, 37.315, 'ochre'], [50.535, 37.365, 'mocha'], [50.585, 37.365, 'linenW']].forEach(([px, py, pm]) => {
        cyl(d, pm, px, py, DTOP + 0.021, DTOP + 0.025, 0.018, 0.018, 16);
      });
      rbox(d, 'bronze', 50.615, 37.34, DTOP + 0.022, DTOP + 0.112, 0.008, 0.098, 0.002, 0, -0.22);

      // (D) Right Wing (y = 37.54..38.42): Freestanding Round Brass Magnifying Mirror, Art Books, Candles & Reed Diffuser
      const MX = 50.56, MY = 37.58;
      cyl(d, 'brass', MX, MY, DTOP, DTOP + 0.016, 0.068, 0.062, 28);
      cyl(d, 'brass', MX, MY, DTOP + 0.016, DTOP + 0.145, 0.006, 0.006, 12);
      // Round magnifying mirror ring & silvered-glass face oriented toward the vanity stool
      rbox(d, 'brass', MX, MY, DTOP + 0.140, DTOP + 0.330, 0.018, 0.204, 0.006, 0.25, 0);
      rbox(d, 'vanityMirror', MX - 0.003, MY, DTOP + 0.150, DTOP + 0.320, 0.016, 0.184, 0.004, 0.25, 0);
      // Preserved shared-RNG books draw + tabletop book stack & candle/diffuser tray
      books(Z, 50.68, 37.8, 0.6, 3, 1.6);
      stack(d, 50.58, 37.90, DTOP, ['bk1', 'bk4', 'bk2'], 1.62);
      box(d, 'walnutZ', 50.48, 38.12, 50.74, 38.44, DTOP, DTOP + 0.014, 0.004);
      [[38.20, 0.115], [38.28, 0.082]].forEach(([y, h]) => {
        cyl(d, 'bk1', 50.58, y, DTOP + 0.014, DTOP + 0.014 + h, 0.024, 0.024, 20);
        cyl(d, 'glow', 50.58, y, DTOP + 0.014 + h, DTOP + 0.020 + h, 0.0025, 0.0045, 8);
      });
      // Smoked-glass reed diffuser with 5 fine botanical reeds
      cyl(d, 'bottleA', 50.64, 38.36, DTOP + 0.014, DTOP + 0.105, 0.028, 0.024, 20);
      cyl(d, 'brass', 50.64, 38.36, DTOP + 0.105, DTOP + 0.122, 0.014, 0.014, 16);
      [[-0.018, -0.022], [0.016, -0.018], [-0.014, 0.020], [0.018, 0.022], [0.0, 0.004]].forEach(([rx, ry]) => {
        rod(d, 'twigDark', [50.64, 38.36, DTOP + 0.09], [50.64 + rx, 38.36 + ry, DTOP + 0.245], 0.0014);
      });

      // --- Illuminated Architectural Vanity Mirror on the East Wall (x = 50.81..50.87, y = 36.18..37.82, z = 0.88..2.28 m) ---
      // Replaces the old painting with a museum-grade dark-bronze & brushed-brass framed mirror with warm LED perimeter backlight
      scanned(() => {
        const MY0 = 36.18, MY1 = 37.82, MZ0 = 0.88, MZ1 = 2.28, FW = 0.028, BW = 0.008;
        // Recessed warm LED perimeter backlight strip behind the frame
        box(B, 'glowLine', 50.848, MY0 + 0.03, 50.868, MY1 - 0.03, MZ0 + 0.03, MZ0 + 0.045, 0.001);
        box(B, 'glowLine', 50.848, MY0 + 0.03, 50.868, MY1 - 0.03, MZ1 - 0.045, MZ1 - 0.03, 0.001);
        box(B, 'glowLine', 50.848, MY0 + 0.03, 50.868, MY0 + 0.045, MZ0 + 0.03, MZ1 - 0.03, 0.001);
        box(B, 'glowLine', 50.848, MY1 - 0.045, 50.868, MY1 - 0.03, MZ0 + 0.03, MZ1 - 0.03, 0.001);
        // Outer mitered dark-bronze architectural frame
        box(B, 'bronze', 50.808, MY0, 50.868, MY1, MZ1 - FW, MZ1, 0.002);
        box(B, 'bronze', 50.808, MY0, 50.868, MY1, MZ0, MZ0 + FW, 0.002);
        box(B, 'bronze', 50.808, MY0, 50.868, MY0 + FW, MZ0 + FW, MZ1 - FW, 0.002);
        box(B, 'bronze', 50.808, MY1 - FW, 50.868, MY1, MZ0 + FW, MZ1 - FW, 0.002);
        // Inner stepped brushed-brass sight-edge bezel
        box(B, 'brass', 50.812, MY0 + FW, 50.842, MY1 - FW, MZ1 - FW - BW, MZ1 - FW, 0.001);
        box(B, 'brass', 50.812, MY0 + FW, 50.842, MY1 - FW, MZ0 + FW, MZ0 + FW + BW, 0.001);
        box(B, 'brass', 50.812, MY0 + FW, 50.842, MY0 + FW + BW, MZ0 + FW + BW, MZ1 - FW - BW, 0.001);
        box(B, 'brass', 50.812, MY1 - FW - BW, 50.842, MY1 - FW, MZ0 + FW + BW, MZ1 - FW - BW, 0.001);
        // Silvered low-iron bevelled mirror glass pane (vanityMirror shader)
        box(B, 'vanityMirror', 50.818, MY0 + FW + BW, 50.836, MY1 - FW - BW, MZ0 + FW + BW, MZ1 - FW - BW, 0.001);
      });
    });
    lamp('bedroom', 50.45, 35.78, 1.12, 0xffe4bc, 0.85, 4.5);
    // A fiddle-leaf fig (Ficus lyrata) in a reeded terracotta pot, in the corner by the glass. (16 Oct & 18 Oct, Sam: "make sure
    // to have nice detail and polishing on the plant. The plant is nice").
    plant(Z, 50.2, 40.1, 0, 1.5, 'clay', 1.1);                                   // (the old plant's draws, kept for the shared sequence)
    {
      M.figLeaf = M.figLeaf || D(P({ color: 0x2c4a22, roughness: 0.3, envMapIntensity: 0.85, side: THREE.DoubleSide }), { noRing: true });
      M.figStem = M.figStem || D(P({ color: 0x6f6553, roughness: 0.75, envMapIntensity: 0.5 }), { noRing: true });
      M.figStalk = M.figStalk || D(P({ color: 0x56603a, roughness: 0.55, envMapIntensity: 0.5 }), { noRing: true });
      M.figPot = M.figPot || D(P({ color: 0xa8664a, roughness: 0.8, envMapIntensity: 0.6 }));
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
        // Architectural dark-bronze & brushed-brass plant saucer base ring beneath the 22-reed terracotta pot
        cyl(B, 'bronze', PX, PY, 0, 0.016, 0.184, 0.184, 48);
        cyl(B, 'brass', PX, PY, 0.016, 0.022, 0.178, 0.178, 48);
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
    // 4. Open-State Light Sheer-Linen Ripplefold Curtains on Both Sides of Both Glass Walls
    //    (18 Oct, Sam: "Make sure to have a curtain on each side of the wall that has glasses, but the state will be open for
    //    both sides, the front side and the right side. Do the same thing for the other side and make sure the curtains are light.
    //    Feel light because we have a strong floor. Make sure the texture is premium"):
    //    Built inside scanned() so the drapery and full-span ceiling tracks scan smoothly with the room and use the 3D omega-pleat
    //    geometry + Warm Alabaster & Pearl-Ivory Belgian Voile-Linen shader (curtainLinen with isBedCurtain = true).
    scanned(() => {
      const buildBedCurtainStack = (dir, fixed, a0, a1, z0, z1, folds, seed) => {
        const spanW = a1 - a0, nx = Math.max(96, Math.round(folds * 14)), ny = 24;
        const g = new THREE.PlaneGeometry(1, z1 - z0, nx, ny);
        g.translate(0.5, (z0 + z1) * 0.5, 0);
        const pos = g.attributes.position, uv = g.attributes.uv;
        let uCloth = 0, prevX = a0, prevZ = 0;
        const uArr = new Float32Array(nx + 1), xArr = new Float32Array(nx + 1), zArr = new Float32Array(nx + 1), cArr = new Float32Array(nx + 1);
        for (let ix = 0; ix <= nx; ix++) {
          const u = ix / nx, ph = u * folds * Math.PI;
          const sWave = Math.sin(ph) + 0.16 * Math.sin(3.0 * ph), cWave = Math.cos(ph);
          const xCur = a0 + u * spanW - 0.015 * (spanW / folds) * cWave * Math.sin(ph);
          const zCur = 0.052 * sWave;
          if (ix > 0) uCloth += Math.hypot(xCur - prevX, zCur - prevZ);
          prevX = xCur; prevZ = zCur;
          uArr[ix] = uCloth; xArr[ix] = xCur; zArr[ix] = zCur; cArr[ix] = Math.sin(ph);
        }
        for (let iy = 0; iy <= ny; iy++) {
          const py = pos.getY(iy * (nx + 1));
          const hFrac = Math.max(0, Math.min(1, (z1 - py) / (z1 - z0)));
          const relax = 1.0 + 0.10 * Math.pow(hFrac, 1.35);
          const sway = 0.008 * Math.sin(hFrac * Math.PI * 1.15 + seed);
          for (let ix = 0; ix <= nx; ix++) {
            const idx = iy * (nx + 1) + ix;
            const along = xArr[ix] + sway * (0.4 + 0.6 * cArr[ix]);
            const across = fixed + zArr[ix] * relax;
            if (dir === 'h') { pos.setX(idx, WX(along)); pos.setZ(idx, WZ(across)); }
            else { pos.setX(idx, WX(across)); pos.setZ(idx, WZ(along)); }
            uv.setXY(idx, 100.0 + uArr[ix], 100.0 + cArr[ix]);
          }
        }
        g.computeVertexNormals();
        B.add(M.sheerLinen, g);
        // Subtle carrier gliders along the stack span
        for (let k = 0; k <= folds; k += 2) {
          const gc = a0 + (k / folds) * spanW;
          if (dir === 'h') cyl(B, 'brass', gc, fixed, z1 - 0.006, z1 + 0.010, 0.005, 0.005, 8);
          else cyl(B, 'brass', fixed, gc, z1 - 0.006, z1 + 0.010, 0.005, 0.005, 8);
        }
      };

      // (A) Front Glass Wall (South Wall, y = 40.66, x = 41.34..50.66):
      //     Continuous full-span dark-bronze & brushed-brass ceiling track + Open curtain stacks on BOTH Right (West) and Left (East) sides
      box(B, 'bronze', 41.32, 40.62, 50.68, 40.70, 3.568, 3.598, 0.002);
      box(B, 'brass', 41.32, 40.616, 50.68, 40.624, 3.566, 3.574, 0.001);
      box(B, 'brass', 41.32, 40.696, 50.68, 40.704, 3.566, 3.574, 0.001);
      buildBedCurtainStack('h', 40.66, 41.36, 42.92, 0.014, 3.568, 18, 0.4);   // Front wall, Right (West) open stack
      buildBedCurtainStack('h', 40.66, 49.08, 50.64, 0.014, 3.568, 18, 1.9);   // Front wall, Left (East) open stack

      // (B) Right Glass Wall (West Wall, x = 41.34, y = 32.205..40.66):
      //     Continuous full-span dark-bronze & brushed-brass ceiling track + Open curtain stacks on BOTH North and South ends
      box(B, 'bronze', 41.30, 32.20, 41.38, 40.68, 3.568, 3.598, 0.002);
      box(B, 'brass', 41.296, 32.20, 41.304, 40.68, 3.566, 3.574, 0.001);
      box(B, 'brass', 41.376, 32.20, 41.384, 40.68, 3.566, 3.574, 0.001);
      buildBedCurtainStack('v', 41.34, 32.205, 33.76, 0.014, 3.568, 18, 0.8); // Right wall, North open stack (flush to larch wall)
      buildBedCurtainStack('v', 41.34, 39.08, 40.64, 0.014, 3.568, 18, 2.3);  // Right wall, South open stack
    });
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
    // Built about the neck: across the shoulders along plan y, thickness along x (the rail's way), hanging down.
    // Camera looks East (+worldX, which is -localX in m) from x ~ 51, so the visible leading edge of every hanging
    // garment is -localX and +localZ (toward the corridor center at y = 33.5).
    const GT = {
      shirt:    { len: 0.78, W: 0.212, T: 0.056, drop: 0.062, sl: 0.71, slW: 0.046, slT: 0.024, collar: 0.052, flare: 0.018, waist: 0.018, shirt: true },
      jacket:   { len: 0.77, W: 0.236, T: 0.078, drop: 0.042, sl: 0.70, slW: 0.055, slT: 0.032, collar: 0.064, flare: 0.012, waist: 0.028, lapel: true },
      coat:     { len: 1.08, W: 0.246, T: 0.088, drop: 0.046, sl: 0.76, slW: 0.060, slT: 0.036, collar: 0.072, flare: 0.032, waist: 0.020, lapel: true },
      dress:    { len: 1.15, W: 0.150, T: 0.046, drop: 0.024, sl: 0,    collar: 0,     flare: 0.140, waist: 0.028, dress: true },
      trousers: { len: 0.56, W: 0.165, T: 0.050, drop: 0,     sl: 0,    collar: 0,     flare: -0.022, waist: 0, bar: true },
    };
    // x, y: the rail in plan, z: the rail's height
    const garment = (bt, mat, x, y, z, type, seed) => {
      const G = GT[type], r = FX.rng(seed), ph = r() * 6.28, ph2 = r() * 6.28, ph3 = r() * 6.28;
      const amp = 0.008 + r() * 0.008;
      // Angle hangers organically and vary pitch/roll/length so they never read as a rigid soldier line
      const yaw = (G.bar ? 0.08 : 0.14) + (r() - 0.5) * 0.24;
      const pitch = (r() - 0.5) * 0.042, roll = (r() - 0.5) * 0.038;
      const len = G.len * (0.92 + r() * 0.15);
      const m = FX.M(WX(x), z - 0.065, WZ(y), pitch, yaw, roll);

      // Brass hook over the rail
      bt.add(M.brass, new THREE.TorusGeometry(0.018, 0.0028, 7, 16, Math.PI * 1.15), FX.mul(m, FX.M(0, 0.065, 0.002, 0, Math.PI / 2, -0.15)));

      if (G.bar) {
        // Savile Row walnut trouser clamp bar suspended from the brass hook + twin pleated trouser legs
        segL(bt, 'brass', m, [0, 0.002, 0], [0, 0.065, 0.020], 0.0026);
        const hW = G.W + 0.024;
        bt.add(M.walnut, softBox(0.018, 0.016, hW * 2, 0.004, 2, 1, 4), FX.mul(m, FX.M(0, -0.004, 0)));
        [-1, 1].forEach((sd) => bt.add(M.brass, softBox(0.021, 0.018, 0.016, 0.002, 1, 1, 1), FX.mul(m, FX.M(0, -0.004, sd * (hW - 0.014)))));
        // Two distinct tailored trouser legs with pressed Savile Row creases, natural knee drape, and ankle cuffs
        [-1, 1].forEach((leg) => {
          const zLeg = leg * G.W * 0.45, legW = G.W * 0.44, xLeg = leg * 0.004;
          bt.add(M[mat], grid(20, 22, (ti, aj) => {
            const t = Math.pow(ti, 1.12), a = aj * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
            const topRound = Math.sqrt(Math.min(1, t / 0.05));
            const taper = 1 - 0.18 * t;
            const cuff = t > 0.90 && t < 0.995 ? 1.10 : 1.0;
            const creaseX = Math.sign(sa) * Math.pow(Math.abs(sa), 0.64) * (G.T * 0.56 * topRound * taper * cuff);
            const widthZ = Math.sign(ca) * Math.pow(Math.abs(ca), 0.76) * (legW * taper * cuff);
            const pleat = 0.0042 * Math.sin(ca * Math.PI * 2 + leg) * (1 - 0.45 * t) * topRound;
            const swayX = amp * 1.1 * Math.sin(t * 4.8 + ph + leg * 0.8) * Math.pow(t, 0.85);
            const swayZ = 0.008 * Math.sin(t * 3.6 + ph2 + leg) * t;
            const yTop = -0.006 - t * len + (1 - topRound) * 0.008;
            return [xLeg + creaseX + pleat + swayX, yTop, zLeg + widthZ + swayZ];
          }, true), m);
          // Turned-up hem cuff + dark ankle opening hollow
          const cx = xLeg + amp * 1.1 * Math.sin(4.8 + ph + leg * 0.8), cz = zLeg + 0.008 * Math.sin(3.6 + ph2 + leg);
          bt.add(M[mat], softBox(G.T * 0.95, 0.036, legW * 1.66, 0.005, 2, 1, 2), FX.mul(m, FX.M(cx, -0.006 - len + 0.018, cz)));
          bt.add(M.inkObj, softBox(G.T * 0.65, 0.008, legW * 1.35, 0.002, 1, 1, 1), FX.mul(m, FX.M(cx, -0.006 - len + 0.002, cz)));
        });
        return;
      }

      // 1. Sculpted warm-walnut coat hanger visibly rising above the garment neck and shoulders
      const hW = G.W * 0.96, hDrop = Math.max(0.042, G.drop * 0.88);
      bt.add(M.walnut, grid(14, 10, (ui, vj) => {
        const u = ui * 2 - 1, a = vj * Math.PI * 2, arch = Math.pow(Math.abs(u), 1.32);
        const rad = (0.010 + 0.005 * (1 - Math.abs(u)) + (G.lapel ? 0.005 * Math.pow(Math.abs(u), 1.4) : 0)) * Math.sqrt(Math.max(0, 1 - u * u * 0.82));
        const sweepX = -0.009 * arch;
        return [sweepX + Math.sin(a) * rad * 0.88, 0.024 - hDrop * arch + Math.cos(a) * rad * 0.78, u * hW];
      }, true), m);
      bt.add(M.brass, new THREE.CylinderGeometry(0.0055, 0.0072, 0.016, 12), FX.mul(m, FX.M(0, 0.032, 0)));
      segL(bt, 'brass', m, [0, 0.036, 0], [0, 0.065, 0.020], 0.0026);

      // 2. Main garment body with soft S-curve corridor profile and deep 3D fabric flutes (no rigid straight edges)
      const bodyY0 = -0.014;
      const Wt = (t) => G.W + G.flare * Math.pow(t, 1.25) - G.waist * Math.sin(Math.PI * Math.min(1, t / 0.76));
      const top = (u) => bodyY0 - G.drop * Math.pow(Math.abs(u), 1.35);
      const NR = len > 0.95 ? 24 : 20, tOf = (ti) => (ti > 1 - 1e-9 ? 1 : Math.pow((ti * NR) / (NR - 1), 1.22) * 0.988);
      bt.add(M[mat], grid(NR, 30, (ti, aj) => {
        const t = tOf(ti), a = aj * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        const u = Math.sign(ca) * Math.pow(Math.abs(ca), 0.58);
        // Organic S-curve wave along the corridor-facing & wall-facing edges so the vertical profile is never a straight ruler line
        const edgeWaveZ = (0.014 * Math.sin(t * Math.PI * 1.45 + ph) + 0.007 * Math.cos(t * 6.8 + ph2)) * Math.pow(Math.abs(u), 1.1) * Math.sin(t * Math.PI * 0.92);
        const hemRound = t > 0.88 ? 1 - 0.14 * Math.pow((t - 0.88) / 0.12, 1.8) * Math.pow(Math.abs(u), 1.6) : 1;
        const acr = u * Wt(t) * hemRound + edgeWaveZ;
        const chestLoft = 1 + 0.28 * Math.exp(-Math.pow((t - 0.16) / 0.18, 2)) * (1 - 0.5 * u * u);
        const drapeLoft = 1 + 0.18 * Math.sin(t * Math.PI) * (0.5 + 0.5 * Math.cos(acr * 18 + ph3));
        const tk = G.T * chestLoft * drapeLoft * Math.sqrt(Math.min(1, (t * len) / 0.028)) * (1 - 0.35 * u * u) * (t >= 1 ? 0 : t > 0.97 ? 0.55 : 1);
        const fold = amp * Math.pow(t, 0.85) * (0.58 * Math.sin(acr * 22 + ph) + 0.34 * Math.sin(acr * 44 + ph2) + 0.24 * Math.cos(t * 6.5 + ph3));
        const frontOverlap = sa < 0 && Math.abs(u) < 0.28 ? -0.0055 * Math.exp(-Math.pow((u - 0.04) / 0.15, 2)) : 0;
        const shirtTail = G.shirt && t > 0.78 ? -0.026 * Math.cos(u * Math.PI) * Math.pow((t - 0.78) / 0.22, 1.3) : 0;
        const hemWave = t > 0.84 ? (G.dress ? 0.016 : 0.009) * Math.sin(acr * 20 + ph2) * ((t - 0.84) / 0.16) : 0;
        const swayX = -0.016 * Math.sin(t * Math.PI * 0.88) + (r() - 0.5) * 0.010 * t;
        return [Math.sign(sa) * Math.pow(Math.abs(sa), 0.65) * tk / 2 + fold + frontOverlap + swayX, top(u) * (1 - t * 0.82) - t * len + hemWave + shirtTail, acr];
      }, true), m);

      // 3. Full-length tailored sleeves that blend smoothly from the shoulder to the wrist cuff (eliminating the stair-step notch)
      if (G.sl) [-1, 1].forEach((sd) => {
        const slLen = len * (0.89 + (r() - 0.5) * 0.06);
        const c0 = sd * (Wt(0.03) - G.slW * 0.58), y0 = top(0.90) - 0.004, x0 = -G.T * 0.16 + (sd > 0 ? -0.008 : 0.005);
        bt.add(M[mat], grid(16, 18, (t, aj) => {
          const a = aj * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
          const cap = Math.sqrt(Math.min(1, t / 0.03)) * (t > 0.96 ? Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.96) / 0.04, 2))) : 1);
          const cuff = G.shirt && t > 0.86 && t < 0.97 ? 1.14 : 1.0;
          const wv = G.slW * (1.14 - 0.34 * t) * cap * cuff, tv = G.slT * (1.10 - 0.16 * t) * cap * cuff;
          const elbowBendX = -0.028 * Math.sin(t * Math.PI * 0.86) + amp * 0.9 * Math.sin(t * 7.5 + ph + sd);
          // Smoothly drape inward as the sleeve falls so its outer edge flows naturally into the hem without a sharp step
          const naturalHangZ = sd * (0.016 * Math.sin(t * Math.PI * 0.82) - 0.024 * Math.pow(t, 1.25) + 0.006 * Math.cos(t * 6 + ph2));
          const crease = 0.0035 * Math.sin(t * 13 + ph2) * Math.sin(t * Math.PI);
          return [x0 + sa * tv + elbowBendX + crease, y0 - t * slLen, c0 + naturalHangZ + ca * wv];
        }, true), m);
      });

      // 4. Tailoring details around the neck, chest, and cuffs
      if (G.shirt) {
        bt.add(M.inkObj, new THREE.CylinderGeometry(0.038, 0.028, 0.042, 14), FX.mul(m, FX.M(-0.005, -0.016, 0, 0, 0, 0.12, 0.58, 1, 0.95)));
        bt.add(M[mat], new THREE.TorusGeometry(G.collar, 0.013, 8, 22), FX.mul(m, FX.M(-0.003, -0.004, 0, Math.PI / 2, 0.08, 0, 0.56, 1.04, 1.06)));
        [-1, 1].forEach((sd) => {
          bt.add(M[mat], softBox(0.016, 0.062, 0.038, 0.004, 2, 2, 2), FX.mul(m, FX.M(-G.T * 0.46, -0.034, sd * 0.036, sd * 0.24, -sd * 0.28, 0.26)));
        });
        bt.add(M[mat], softBox(0.008, len * 0.84, 0.028, 0.002, 1, 4, 1), FX.mul(m, FX.M(-G.T * 0.50 - 0.005, -len * 0.46, 0, 0, 0, -0.016)));
        for (let b = 0; b < 5; b++) {
          const by = -0.10 - b * (len * 0.14);
          bt.add(M.cotton, new THREE.CylinderGeometry(0.0045, 0.0045, 0.0028, 10), FX.mul(m, FX.M(-G.T * 0.52 - 0.007, by, 0, 0, 0, Math.PI / 2)));
        }
      } else if (G.lapel) {
        bt.add(M.inkObj, new THREE.CylinderGeometry(0.046, 0.032, 0.068, 14), FX.mul(m, FX.M(-0.008, -0.028, 0, 0, 0, 0.14, 0.60, 1, 0.96)));
        bt.add(M[mat], new THREE.TorusGeometry(G.collar, 0.016, 8, 24, Math.PI * 1.35), FX.mul(m, FX.M(-0.002, -0.004, 0, Math.PI / 2, 0, -Math.PI * 0.68, 0.58, 1.05, 1.06)));
        [-1, 1].forEach((sd) => {
          bt.add(M[mat], softBox(0.016, 0.25, 0.048, 0.004, 2, 4, 2), FX.mul(m, FX.M(-G.T * 0.48 - 0.004, -0.14, sd * 0.040, -sd * 0.16, -sd * 0.18, 0.08)));
          bt.add(M[mat], softBox(0.012, 0.030, 0.098, 0.003, 1, 1, 2), FX.mul(m, FX.M(-G.T * 0.40 - 0.006, -len * 0.64, sd * G.W * 0.52, 0, -sd * 0.12, 0)));
        });
        const nb = type === 'coat' ? 3 : 2;
        for (let b = 0; b < nb; b++) {
          bt.add(M.inkObj, new THREE.CylinderGeometry(0.008, 0.008, 0.0038, 12), FX.mul(m, FX.M(-G.T * 0.50 - 0.008, -0.28 - b * 0.11, 0.006, 0, 0, Math.PI / 2)));
        }
      } else if (G.dress) {
        [-1, 1].forEach((sd) => {
          bt.add(M[mat], new THREE.TorusGeometry(0.024, 0.0045, 6, 16, Math.PI * 1.1), FX.mul(m, FX.M(-0.004, 0.004, sd * G.W * 0.72, 0, Math.PI / 2, 0)));
        });
        bt.add(M[mat], softBox(G.T * 0.90, 0.024, (G.W - G.waist) * 1.86, 0.004, 2, 1, 2), FX.mul(m, FX.M(-0.006, -len * 0.34, 0)));
      }
    };
    // a rail between two posts, with a round flange at each end
    const rail = (bt, a, b, y, z) => { rod(bt, 'brass', [a, y, z], [b, y, z], 0.011); [a, b].forEach((x) => bt.add(M.brass, new THREE.CylinderGeometry(0.02, 0.02, 0.008, 18), FX.M(WX(x + (x === a ? 0.004 : -0.004)), z, WZ(y), 0, 0, Math.PI / 2))); };
    // a row of garments along a rail from a to b, each [type, material], spaced by how thick they are
    const hang = (bt, list, a, b, y, z) => {
      const gap = list.map(([t]) => (t === 'coat' ? 0.155 : t === 'jacket' ? 0.135 : t === 'trousers' ? 0.118 : t === 'dress' ? 0.105 : 0.092));
      const tot = gap.reduce((s, g) => s + g, 0) - (gap[0] + gap[gap.length - 1]) / 2;
      let x = (a + b) / 2 - tot / 2;
      list.forEach(([t, mat], i) => {
        const dy = (Rd() - 0.5) * 0.022;
        garment(bt, mat, x, y + dy, z, t, (Rd() * 1e6) | 0);
        x += (gap[i] + (gap[i + 1] || 0)) / 2 + (Rd() - 0.5) * 0.022;
      });
    };

    // ---- folded things ----
    // A folded sweater or dress shirt: rolled front fold at +z, horizontal U-fold cleft along both sides and front corners
    // separating the lower and upper folded halves, tucked sleeve ridges, soft pinched sides, and organic hand-fold wave.
    const foldedGeo = (w, h, dd, seed) => {
      const r = FX.rng(seed), sk = (r() - 0.5) * 0.018, dome = 0.055 + r() * 0.065, ph = r() * 6.28, ph2 = r() * 6.28;
      const rx = h * 0.34, ry = h / 2, rf = h * 0.49, rb = h * 0.38;
      const g = new THREE.BoxGeometry(w, h, dd, 22, 10, 16), p = g.attributes.position, nr = g.attributes.normal, v = new V(), c = new V(), o = new V();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        c.set(Math.max(-w / 2 + rx, Math.min(w / 2 - rx, v.x)), 0, Math.max(-dd / 2 + rb, Math.min(dd / 2 - rf, v.z)));
        const rz = v.z > 0 ? rf : rb;
        o.set((v.x - c.x) / rx, v.y / ry, (v.z - c.z) / rz); if (o.lengthSq() < 1e-12) o.fromBufferAttribute(nr, i); o.normalize();
        let x = c.x + o.x * rx, y = o.y * ry, z = c.z + o.z * rz;
        const u = x / (w / 2), s = z / (dd / 2), vy = y / (h / 2);
        // Deep U-fold cleft along sides, back, and front-side corners where upper folded half meets lower half
        const sideOrBack = Math.max(Math.max(0, Math.abs(u) - 0.58) / 0.42, Math.max(0, -s - 0.45) / 0.55);
        const cleft = Math.exp(-Math.pow(vy / 0.28, 2)) * sideOrBack;
        x -= Math.sign(u) * cleft * 0.015;
        if (s < 0) z += cleft * 0.012;
        // Front rolled fold crease + soft recessed horizontal fold line across the front
        if (s > 0.25) {
          const frontCrease = Math.exp(-Math.pow((vy + 0.04) / 0.22, 2)) * Math.max(0, (s - 0.25) / 0.75);
          z -= frontCrease * 0.0055 * (0.45 + 0.55 * Math.pow(Math.abs(u), 0.8));
          y -= frontCrease * 0.0025 * vy;
        }
        // Softly pinched side edges (never a vertical brick wall on left/right) and tucked sleeve ridges
        y *= 1 - 0.14 * Math.pow(Math.abs(u), 2.2);
        if (y > 0) {
          const sleeveRidge = 0.11 * h * Math.exp(-Math.pow((Math.abs(u) - 0.36) / 0.18, 2)) * (1 - 0.30 * s * s);
          const seamGroove = 0.13 * h * Math.exp(-Math.pow((Math.abs(u) - 0.58) / 0.11, 2));
          y += (dome * h * Math.max(0, 1 - 0.70 * u * u) * Math.max(0, 1 - 0.60 * s * s) + sleeveRidge - seamGroove) * o.y;
        }
        // Organic hand-folded wave and corner droop so stacked layers undulate naturally
        const cornerDroop = 0.10 * h * Math.pow(Math.abs(u), 2.0) * Math.pow(Math.abs(s), 1.6);
        const waveY = 0.0038 * Math.sin(u * 4.2 + ph) + 0.0024 * Math.cos(s * 4.8 + ph2);
        const waveX = 0.0030 * Math.sin(s * 5.2 + ph) * Math.pow(Math.abs(u), 0.8);
        p.setXYZ(i, x + sk * (y / h) + waveX, y - cornerDroop + waveY, z + waveX * 0.7);
      }
      g.computeVertexNormals();
      return FX.uvMetres(g);
    };
    // a pile of them on a shelf, toward +y (rot π: toward -y), the mats from the bottom up
    const pile = (bt, mats, x, y, z, w, dd, rot, hh) => {
      let zz = z;
      const f = rot ? -1 : 1;
      mats.forEach((mat, idx) => {
        const h = (hh || 0.056) + Rd() * 0.022;
        const dx = (Rd() - 0.5) * 0.024, dy = (Rd() - 0.5) * 0.018, dRot = (rot || 0) + (Rd() - 0.5) * 0.12;
        const wi = w * (1 - idx * 0.022) + (Rd() - 0.5) * 0.024, ddi = dd * (1 - idx * 0.015);
        const m = FX.M(WX(x + dx), zz + h / 2, WZ(y + dy), (Rd() - 0.5) * 0.025, dRot, (Rd() - 0.5) * 0.025);
        bt.add(M[mat], foldedGeo(wi, h, ddi, (Rd() * 1e6) | 0), m);
        // Subtle folded collar / ribbed neckband ring on the top garment of each stack
        if (idx === mats.length - 1) {
          bt.add(M[mat], new THREE.TorusGeometry(wi * 0.21, h * 0.15, 7, 20), FX.mul(m, FX.M(0, h * 0.46, f * ddi * 0.10, Math.PI / 2 + 0.05, 0, 0, 1.05, 0.76, 0.34)));
        }
        zz += h * 0.89;
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
      bt.add(M.brass, softBox(0.042, 0.010, 0.004, 0.001, 1, 1, 1), FX.mul(m, FX.M(0, h - 0.045, dd / 2 + 0.001)));
    };
    const hatBox = (bt, mat, x, y, z, r, h) => { cyl(bt, mat, x, y, z, z + h - 0.03, r, r, 40); cyl(bt, mat, x, y, z + h - 0.036, z + h, r + 0.005, r + 0.005, 40); cyl(bt, 'inkObj', x, y, z + h - 0.05, z + h - 0.042, r + 0.0015, r + 0.0015, 40); };

    // ---- shoes ----
    // Sculpted handcrafted Italian footwear lofted along an anatomical last with upward toe spring, Goodyear welt rim,
    // stacked heel block, tan calfskin footbed lining, contour-hugging penny strap & brass horsebit, cap-toe seam, and Chelsea gusset.
    const SH = {
      loafer:  { L: 0.292, W: 0.050, ts: 0.011, hh: 0.025, ph: 2.25, sp: 0.009, h: [[0, 0.065], [0.25, 0.067], [0.55, 0.072], [0.8, 0.053], [1, 0.036]], o: [0.06, 0.50, 0.026], strap: true },
      oxford:  { L: 0.298, W: 0.049, ts: 0.011, hh: 0.027, ph: 1.95, sp: 0.010, h: [[0, 0.067], [0.30, 0.071], [0.52, 0.076], [0.8, 0.051], [1, 0.033]], o: [0.06, 0.42, 0.022], laces: true, cap: true },
      sneaker: { L: 0.292, W: 0.053, ts: 0.032, hh: 0.004, ph: 2.55, sp: 0.012, h: [[0, 0.072], [0.30, 0.074], [0.55, 0.076], [0.8, 0.054], [1, 0.038]], o: [0.05, 0.42, 0.024], laces: true, tab: true },
      pump:    { L: 0.254, W: 0.039, ts: 0.006, hh: 0.086, ph: 1.55, sp: 0.005, h: [[0, 0.062], [0.30, 0.060], [0.60, 0.048], [0.85, 0.034], [1, 0.020]], o: [0.05, 0.65, 0.032], stiletto: true },
      boot:    { L: 0.294, W: 0.051, ts: 0.015, hh: 0.030, ph: 2.20, sp: 0.010, q: 0.32, h: [[0, 0.205], [0.34, 0.205], [0.50, 0.088], [0.8, 0.057], [1, 0.036]], o: [0.03, 0.38, 0.030], boot: true },
    };
    const shoeGeos = {};
    const shoeParts = (kind, side) => {
      const id = kind + side; if (shoeGeos[id]) return shoeGeos[id];
      const S = SH[kind], NS = 28, Q = S.q || 0.58, [o0, o1, dip] = S.o;
      const sOf = (i) => 0.5 - 0.5 * Math.cos(Math.PI * i);
      const hAt = (s) => { const h = S.h; for (let k = 1; k < h.length; k++) if (s <= h[k][0]) { const a = h[k - 1], b = h[k], q = (s - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * q * q * (3 - 2 * q); } return h[h.length - 1][1]; };
      const e = (s) => { const p = s < 0.5 ? 2.35 : S.ph, x = Math.abs(2 * s - 1); return Math.pow(Math.max(0, 1 - Math.pow(x, p)), 1 / p); };
      const wAt = (s) => S.W * e(s) * (0.78 + 0.24 * FX.smooth((s - 0.44) / 0.26) - 0.10 * Math.exp(-Math.pow((s - 0.38) / 0.11, 2)));
      const cAt = (s) => -side * S.W * (0.15 * FX.smooth((s - 0.38) / 0.58) - 0.05 * Math.exp(-Math.pow((s - 0.35) / 0.14, 2)));
      const toeSpring = (s) => (S.sp || 0.008) * Math.pow(Math.max(0, (s - 0.62) / 0.38), 2.1);
      const lift = (s) => S.hh * (1 - FX.smooth((s - 0.22) / 0.46)) + toeSpring(s);
      const yb = (s) => (S.stiletto ? lift(s) : (s < 0.28 ? toeSpring(s) : lift(s) * FX.smooth((s - 0.25) / 0.04))), yt = (s) => lift(s) + S.ts;
      const bump = (s) => (s > o0 && s < o1 ? Math.sin((Math.PI * (s - o0)) / (o1 - o0)) : 0);
      const hTop = (s) => hAt(s) * (s > 0.58 ? Math.pow(e(s), 0.56) : 1);
      const zz = (s) => (s - 0.5) * S.L;
      const parts = [];
      // 1. Sculpted leather/suede upper with vamp crease, cap-toe ridge, and penny-strap relief baked smoothly into the last
      parts.push(['up', grid(NS, 20, (si, tj) => {
        const s = sOf(si), th = tj * Math.PI, st = Math.sin(th), ct = Math.cos(th);
        let a = Math.min(hTop(s) * Math.pow(st, Q), hTop(s) - dip * bump(s));
        const vampCrease = !S.boot && s > 0.58 && s < 0.76 ? -0.0016 * Math.sin((s - 0.58) / 0.18 * Math.PI * 2) * Math.pow(st, 1.6) : 0;
        const strapBand = S.strap && s > 0.48 && s < 0.58 ? 0.0028 * Math.sin((s - 0.48) / 0.10 * Math.PI) * Math.pow(st, 0.8) : 0;
        const capSeam = S.cap && s > 0.72 && s < 0.76 ? 0.0016 * Math.sin((s - 0.72) / 0.04 * Math.PI) * Math.pow(st, 0.9) : 0;
        const ankleTaper = S.boot && s < 0.42 ? 1 - 0.12 * FX.smooth((a - 0.06) / 0.12) : 1;
        return [cAt(s) + wAt(s) * ct * (1 - 0.14 * st) * ankleTaper, yt(s) + a + vampCrease + strapBand + capSeam, zz(s)];
      })]);
      // 2. Outsole and stacked heel block
      parts.push(['sole', grid(NS, 16, (si, tj) => {
        const s = sOf(si), th = tj * Math.PI * 2, w = wAt(s) + (S.tab ? 0.0042 : 0.0032) * Math.pow(e(s), 0.28);
        const c = Math.cos(th), sn = Math.sin(th), b = yb(s), t = yt(s);
        return [cAt(s) + w * Math.sign(c) * Math.pow(Math.abs(c), 0.32), (b + t) / 2 + ((t - b) / 2) * Math.sign(sn) * Math.pow(Math.abs(sn), 0.28), zz(s)];
      }, true)]);
      // 3. Contrasting Goodyear welt rim along the upper-to-sole junction
      if (!S.stiletto) {
        parts.push(['welt', grid(NS, 8, (si, tj) => {
          const s = sOf(si), th = tj * Math.PI * 2, w = wAt(s) + 0.0038 * Math.pow(e(s), 0.28);
          const c = Math.cos(th), sn = Math.sin(th), y0 = yt(s) + 0.0015;
          return [cAt(s) + w * c, y0 + 0.0024 * sn, zz(s)];
        }, true)]);
      }
      // 4. Warm calfskin leather footbed lining
      parts.push(['in', grid(14, 6, (si, tj) => {
        const s = o0 + (o1 - o0) * (0.5 - 0.5 * Math.cos(Math.PI * si)), ht = hTop(s), hc = ht - dip * bump(s), st = Math.pow(Math.min(1, hc / ht), 1 / Q);
        const x0 = Math.max(0, wAt(s) * Math.cos(Math.asin(Math.min(1, st))) * (1 - 0.14 * st) - 0.0025);
        return [cAt(s) + (tj * 2 - 1) * x0, yt(s) + hc + 0.001, zz(s)];
      }, false, [0, 1, 0])]);
      if (S.strap) {
        // Brushed-brass horsebit bar hugging the contour of the loafer instep
        const sB = 0.53, wB = wAt(sB) * 0.56, gB = softBox(wB * 1.9, 0.0036, 0.006, 0.0015, 2, 1, 1);
        gB.applyMatrix4(FX.M(cAt(sB), yt(sB) + hTop(sB) + 0.0022, zz(sB), 0.42, 0, 0));
        parts.push(['bit', gB]);
      }
      if (S.laces) for (let k = 0; k < 4; k++) {
        const s = 0.44 + k * 0.044, w = wAt(s) * 0.60, g = softBox(w * 2, 0.0032, 0.006, 0.0014, 2, 1, 1);
        g.applyMatrix4(FX.M(cAt(s), yt(s) + hTop(s) + 0.0015, zz(s), 0.40, 0, (k % 2 ? 0.03 : -0.03))); parts.push(['lace', g]);
      }
      if (S.tab) {
        // Sneaker contrast heel counter tab hugging the back collar
        const gH = softBox(wAt(0.08) * 1.35, 0.018, 0.010, 0.003, 2, 1, 1);
        gH.applyMatrix4(FX.M(cAt(0.06), yt(0.06) + hTop(0.06) - 0.012, zz(0.05), 0.12, 0, 0));
        parts.push(['tab', gH]);
      }
      if (S.boot) {
        // Chelsea boot dark elastic side gussets
        [-1, 1].forEach((gs) => {
          const gG = softBox(0.004, 0.10, 0.044, 0.002, 1, 2, 2);
          gG.applyMatrix4(FX.M(cAt(0.22) + gs * (wAt(0.22) * 0.80), yt(0.22) + 0.132, zz(0.22), 0, gs * 0.06, -gs * 0.05));
          parts.push(['gore', gG]);
        });
      }
      if (S.stiletto) { const g = new THREE.CylinderGeometry(0.008, 0.0042, lift(0.07), 14); g.applyMatrix4(FX.M(cAt(0.07), lift(0.07) / 2, zz(0.07))); parts.push(['heel', g]); }
      return (shoeGeos[id] = parts);
    };
    // a pair, its middle at x, y (plan) on z, toes toward +y turned by rot (π: toward -y); mats: { up, sole, welt, in, lace, heel, bit, tab, gore }
    const pair = (bt, kind, x, y, z, rot, mats) => [-1, 1].forEach((sd) => {
      const ox = sd * (SH[kind].W + 0.015), oz = sd * 0.007;
      const yaw = rot + sd * 0.058 + (sd > 0 ? 0.025 : -0.012);
      const m = FX.M(WX(x) + Math.cos(rot) * ox - Math.sin(rot) * oz, z, WZ(y) - Math.sin(rot) * ox - Math.cos(rot) * oz, 0, yaw, 0);
      shoeParts(kind, sd).forEach(([role, g]) => {
        const fallback = role === 'in' ? 'leather' : role === 'welt' ? (mats.sole === 'white' ? 'white' : 'soleTan') : role === 'bit' ? 'brass' : role === 'gore' ? 'inkObj' : role === 'tab' ? 'leather' : mats.up;
        bt.add(M[mats[role] || fallback], g, m);
      });
    });
    const SHOE = {
      sneakerW: ['sneaker', { up: 'shoeWhite', sole: 'white', welt: 'white', lace: 'cotton', tab: 'suede', in: 'oat' }],
      loaferC:  ['loafer',  { up: 'leather', sole: 'soleTan', welt: 'soleTan', bit: 'brass', in: 'soleTan' }],
      loaferB:  ['loafer',  { up: 'leatherBlk', sole: 'black', welt: 'soleTan', bit: 'brass', in: 'leather' }],
      loaferS:  ['loafer',  { up: 'suede', sole: 'soleTan', welt: 'soleTan', bit: 'brass', in: 'soleTan' }],
      oxfordB:  ['oxford',  { up: 'leatherBlk', sole: 'black', welt: 'soleTan', lace: 'inkObj', in: 'leather' }],
      oxfordC:  ['oxford',  { up: 'leather', sole: 'soleTan', welt: ' leather' === 'leather' ? 'soleTan' : 'black', lace: 'inkObj', in: 'soleTan' }],
      pumpB:    ['pump',    { up: 'leatherBlk', sole: 'soleTan', heel: 'black', in: 'nude' }],
      pumpN:    ['pump',    { up: 'nude', sole: 'soleTan', heel: 'nude', in: 'soleTan' }],
      bootS:    ['boot',    { up: 'suede', sole: 'black', welt: 'soleTan', gore: 'inkObj', in: 'leather' }],
      bootB:    ['boot',    { up: 'leatherBlk', sole: 'black', welt: 'soleTan', gore: 'inkObj', in: 'leather' }],
      sneakerB: ['sneaker', { up: 'leatherBlk', sole: 'white', welt: 'white', lace: 'cotton', tab: 'white', in: 'leather' }],
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

    // ---- the wardrobe on the north wall: figured walnut veneer on a recessed black plinth with brass shelf trims ----
    box(B, 'wardrobe', X0, Y0, X1, Y0 + 0.04, 0.1, 2.6, 0.003);
    box(B, 'black', X0 + 0.02, Y0 + 0.04, X1 - 0.02, Y1 - 0.05, 0, 0.1, 0.003);
    box(B, 'brass', X0 + 0.01, Y1 - 0.052, X1 - 0.01, Y1 - 0.044, 0.092, 0.102, 0.002);
    box(B, 'wardrobe', X0, Y0, X1, Y1, 0.1, 0.13, 0.004); box(B, 'wardrobe', X0, Y0, X1, Y1, 2.5, 2.6, 0.004);
    box(B, 'brass', X0, Y1 - 0.004, X1, Y1 + 0.002, 2.502, 2.512, 0.001);
    for (let i = 0; i <= NB; i++) box(d, 'wardrobe', X0 + i * bw - 0.019, Y0, X0 + i * bw + 0.019, Y1, 0.13, 2.5, 0.004);
    // Interleaved garment colors & varied silhouettes so adjacent pieces never merge into wide solid blocks
    const BAYS = [
      { up: [['shirt', 'cotton'], ['shirt', 'shirtBlue'], ['shirt', 'oat'], ['shirt', 'cotton'], ['shirt', 'suitNavy'], ['shirt', 'cotton'], ['shirt', 'shirtBlue'], ['shirt', 'oat'], ['shirt', 'shirtBlue'], ['shirt', 'suitNavy']],
        low: [['trousers', 'oat'], ['trousers', 'suitCharcoal'], ['trousers', 'coatCamel'], ['trousers', 'suitNavy'], ['trousers', 'oat'], ['trousers', 'suitCharcoal'], ['trousers', 'suitNavy']],
        shoes: ['sneakerW', 'loaferC', 'sneakerW', 'loaferB'] },
      { shelves: ['boxes', 'knits', 'knitsNavy', 'bags', 'boxes'] },
      { up: [['jacket', 'suitNavy'], ['jacket', 'coatCamel'], ['jacket', 'suitCharcoal'], ['jacket', 'oat'], ['jacket', 'suitNavy'], ['jacket', 'suitCharcoal'], ['jacket', 'coatCamel'], ['jacket', 'oat']],
        low: [['trousers', 'suitNavy'], ['trousers', 'oat'], ['trousers', 'suitCharcoal'], ['trousers', 'coatCamel'], ['trousers', 'suitNavy'], ['trousers', 'suitCharcoal']],
        shoes: ['oxfordB', 'oxfordC', 'oxfordB', 'bootS'] },
      { shelves: ['boxes', 'knits2', 'bags2', 'shirts', 'hatboxes'] },
      { up: [['dress', 'silkChamp'], ['dress', 'silkBlk'], ['dress', 'silkChamp'], ['dress', 'silkBlk'], ['coat', 'coatCamel'], ['coat', 'suitCharcoal'], ['coat', 'suitNavy']],
        shoes: ['pumpN', 'pumpB', 'pumpN', 'bootB'] },
      { shelves: ['boxes', 'tees', 'knits', 'bags3', 'boxes'] },
    ];
    // Multi-tone interleaved sweater stacks so every folded layer is individually legible
    const KN = {
      knits:     [['knitIvory', 'knitCamel', 'knitIvory', 'knitGrey'], ['knitCamel', 'knitIvory', 'knitCamel'], ['knitGrey', 'knitIvory', 'knitNavy', 'knitGrey']],
      knitsNavy: [['knitNavy', 'knitIvory', 'knitNavy', 'knitGrey'], ['knitGrey', 'knitCamel', 'knitGrey'], ['knitIvory', 'knitNavy', 'knitIvory', 'knitCamel']],
      knits2:    [['knitCamel', 'knitIvory', 'knitGrey', 'knitCamel'], ['knitNavy', 'knitGrey', 'knitNavy'], ['knitIvory', 'knitCamel', 'knitIvory', 'knitGrey']],
    };
    // one shelf's things across a bay from a to b, standing at z, their fronts toward +y from yb (rot π: toward -y from yb)
    const shelfThings = (bt, kind, a, b, yb, z, rot) => {
      const mid = (a + b) / 2, wd = b - a, f = rot ? -1 : 1, yc = (dd) => yb - f * dd / 2;     // (yb: the shelf's front edge)
      if (kind === 'boxes') [-1, 1].forEach((sd) => lidBox(bt, sd < 0 ? 'oat' : 'linenW', mid + sd * wd * 0.24, yc(0.4), z, 0.38, 0.27, 0.4, (rot || 0) + (Rd() - 0.5) * 0.03));
      else if (kind === 'hatboxes') { hatBox(bt, 'oat', mid - wd * 0.22, yc(0.4), z, 0.19, 0.24); hatBox(bt, 'inkObj', mid + wd * 0.22, yc(0.4), z, 0.17, 0.2); }
      else if (KN[kind]) KN[kind].forEach((stack, i) => pile(bt, stack, mid + (i - 1) * wd * 0.33, yc(0.32), z, 0.30, 0.32, rot, 0.056));
      else if (kind === 'shirts') [-1, 0, 1].forEach((i) => pile(bt, i < 0 ? ['cotton', 'shirtBlue', 'cotton', 'oat'] : i ? ['shirtBlue', 'cotton', 'shirtBlue', 'suitNavy'] : ['oat', 'cotton', 'shirtBlue', 'oat'], mid + i * wd * 0.33, yc(0.3), z, 0.275, 0.30, rot, 0.038));
      else if (kind === 'tees') [-1, 0, 1].forEach((i) => pile(bt, i < 0 ? ['cotton', 'knitGrey', 'cotton', 'oat', 'cotton'] : i ? ['suitNavy', 'cotton', 'knitGrey', 'suitNavy', 'shirtBlue'] : ['knitGrey', 'cotton', 'knitCamel', 'knitGrey'], mid + i * wd * 0.33, yc(0.28), z, 0.265, 0.28, rot, 0.034));
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
        Z4.forEach((z) => {
          box(d, 'wardrobe', a - 0.02, Y0 + 0.04, b + 0.02, Y1 - 0.012, z, z + 0.028, 0.003);
          box(d, 'brass', a - 0.018, Y1 - 0.015, b + 0.018, Y1 - 0.009, z + 0.008, z + 0.020, 0.001);
        });
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
      box(B, 'brass', a + 0.01, SY0 + 0.044, b - 0.01, SY0 + 0.052, 0.092, 0.102, 0.002);
      box(B, 'wardrobe', a, SY0, b, SY1, 0.1, 0.13, 0.004); box(B, 'wardrobe', a, SY0, b, SY1, 2.5, 2.6, 0.004);
      box(B, 'brass', a, SY0 - 0.002, b, SY0 + 0.004, 2.502, 2.512, 0.001);
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
        box(d, 'brass', 51.22, SY0 + 0.007, 52.58, SY0 + 0.013, z - 0.019, z - 0.009, 0.001);
        rod(d, 'brass', [51.24, SY0 + 0.016, z + 0.014], [52.56, SY0 + 0.016, z + 0.014], 0.004);
        shoes(d, ROWS[k], 51.24, 52.56, SY0 + 0.21, z, Math.PI);
      });
      lidBox(d, 'oat', 51.55, SY0 + 0.25, 0.13, 0.4, 0.26, 0.4, Math.PI); lidBox(d, 'linenW', 52.22, SY0 + 0.25, 0.13, 0.4, 0.26, 0.4, Math.PI);
      box(d, 'wardrobe', 51.22, SY0 + 0.01, 52.58, SY1 - 0.03, 2.222, 2.25, 0.003); shelfThings(d, 'hatboxes', 51.22, 52.58, SY0 + 0.03, 2.25, Math.PI);
      // drawers, a walnut top with a valet tray, two shelves above, boxes at the top
      drawers(d, 52.62, 53.98, 0.13, 0.85, 3);
      box(d, 'wardrobe', 52.62, SY0, 53.98, SY1 - 0.03, 0.85, 0.88, 0.003);
      box(d, 'brass', 52.62, SY0 - 0.003, 53.98, SY0 + 0.003, 0.860, 0.870, 0.001);
      tray(d, 53.0, SY0 + 0.2, 0.88, 0.42, 0.26, 'oat'); belt(d, 'leather', 52.9, SY0 + 0.2, 0.902, -1); belt(d, 'leatherBlk', 53.08, SY0 + 0.22, 0.902, -1);
      pile(d, ['knitGrey', 'knitIvory', 'knitCamel'], 53.6, SY0 + 0.2, 0.88, 0.3, 0.32, Math.PI, 0.052);
      [1.32, 1.76, 2.2].forEach((z, k) => {
        box(d, 'wardrobe', 52.62, SY0 + 0.01, 53.98, SY1 - 0.03, z - 0.028, z, 0.003);
        box(d, 'brass', 52.62, SY0 + 0.007, 53.98, SY0 + 0.013, z - 0.019, z - 0.009, 0.001);
        shelfThings(d, ['knits2', 'bags3', 'boxes'][k], 52.62, 53.98, SY0 + 0.03, z, Math.PI);
      });
    });
    thing(58.35, 34.56, () => {
      unit(57.9, 58.8, [57.9, 58.8]);
      drawers(d, 57.92, 58.78, 0.13, 0.8, 2);
      box(d, 'wardrobe', 57.92, SY0, 58.78, SY1 - 0.03, 0.8, 0.83, 0.003);
      box(d, 'brass', 57.92, SY0 - 0.003, 58.78, SY0 + 0.003, 0.810, 0.820, 0.001);
      // on the top, a tray lined in velvet: three pairs of sunglasses, two watches
      tray(d, 58.35, SY0 + 0.2, 0.83, 0.74, 0.3, 'suede');                   // (a black velvet lost the black sunglasses)
      [58.08, 58.26, 58.44].forEach((x, k) => shades(d, x, SY0 + 0.15, 0.853, Math.PI + (k - 1) * 0.12));
      watch(d, 58.6, SY0 + 0.24, 0.853, 'leatherBlk', 'steel', 'white', Math.PI); watch(d, 58.6, SY0 + 0.13, 0.853, 'leather', 'brass', 'black', Math.PI);
      // perfume on a brass tray; belts rolled and scarves; a felt hat and a straw one; a hat box at the top
      [1.18, 1.56, 1.94, 2.24].forEach((z) => {
        box(d, 'wardrobe', 57.92, SY0 + 0.01, 58.78, SY1 - 0.03, z - 0.028, z, 0.003);
        box(d, 'brass', 57.92, SY0 + 0.007, 58.78, SY0 + 0.013, z - 0.019, z - 0.009, 0.001);
      });
      box(d, 'brass', 58.06, SY0 + 0.1, 58.64, SY0 + 0.32, 1.18, 1.188, 0.002);
      [0, 1, 2, 3, 0].forEach((kd, k) => perfume(d, 58.12 + k * 0.115, SY0 + 0.2 + (k % 2) * 0.05, 1.188, kd));
      belt(d, 'leather', 58.03, SY0 + 0.2, 1.56, -1); belt(d, 'leatherBlk', 58.13, SY0 + 0.25, 1.56, -1); belt(d, 'suede', 58.24, SY0 + 0.19, 1.56, -1);
      pile(d, ['silkChamp', 'silkBlk', 'knitIvory'], 58.58, SY0 + 0.2, 1.56, 0.3, 0.26, Math.PI, 0.028);
      hat(d, 'felt', 58.14, SY0 + 0.27, 1.94, 0.3); hat(d, 'straw', 58.56, SY0 + 0.27, 1.94, -0.2);
      hatBox(d, 'oat', 58.35, SY0 + 0.27, 2.24, 0.2, 0.24);
    });

    // the runner: high-relief ribbed bouclé-and-wool runner from the bedroom's marble threshold to the far mirror
    box(d, 'runner', 51.0, 33.03, 58.35, 33.97, 0, 0.015, 0.006);
    box(d, 'brass', 58.82, 33.0, 58.85, 34.0, 0.1, 2.3, 0.003); box(d, 'glassMirror', 58.815, 33.04, 58.83, 33.96, 0.14, 2.26, 0.002);
    // Tailored oatmeal-bouclé ottoman pouf on a recessed dark-bronze and brushed-brass plinth with piped crown seam
    cyl(B, 'black', 57.6, 33.5, 0, 0.028, 0.285, 0.285, 32);
    cyl(B, 'brass', 57.6, 33.5, 0.016, 0.038, 0.304, 0.304, 36);
    cyl(B, 'boucle', 57.6, 33.5, 0.036, 0.295, 0.312, 0.320, 36);
    cyl(B, 'brass', 57.6, 33.5, 0.292, 0.302, 0.321, 0.321, 36);
    cyl(B, 'boucle', 57.6, 33.5, 0.300, 0.425, 0.322, 0.305, 36);
    btRing: {
      const mPouf = FX.M(WX(57.6), 0.422, WZ(33.5), Math.PI / 2, 0, 0);
      B.add(M.boucle, new THREE.TorusGeometry(0.306, 0.009, 10, 36), mPouf);
      B.add(M.boucle, new THREE.CylinderGeometry(0.26, 0.304, 0.022, 36), FX.M(WX(57.6), 0.432, WZ(33.5)));
    }
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
    //Preserve the exact PRNG sequence for the private garden after this room
    sprigs(Z, 51.5, 38.3, 1.04, 0.3, 3);
    plant(Z, 51.72, 40.58, 0, 1.3, 'ceramic', 0.85);

    // Helper: plush folded spa towel with a continuous U-folded front nose, inner crease cleft, upper/lower layers, and woven dobby border band
    const foldedBathTowel = (bt, mat, cx, cy, z0, wX, dY, h, rotY) => {
      const halfH = h * 0.48, gap = h * 0.04, r = Math.min(0.015, halfH * 0.46), rot = rotY || 0;
      rbox(bt, mat, cx, cy, z0, z0 + halfH, wX, dY, r, rot);
      rbox(bt, mat, cx, cy, z0 + halfH + gap, z0 + h, wX * 0.99, dY * 0.99, r, rot);
      // U-folded front nose along the -Y (room-facing) edge so the two layers connect into a single folded sheet
      rbox(bt, mat, cx, cy - dY * 0.46, z0 + halfH * 0.35, z0 + h - halfH * 0.35, wX * 0.985, 0.024, 0.008, rot);
    };
    // Helper: tight spa towel roll (along X or Y) with layered spiral core end-caps and outer hem flap
    const rolledBathTowel = (bt, mat, cx, cy, zC, r, len, alongY) => {
      if (alongY) {
        rod(bt, mat, [cx, cy - len / 2, zC], [cx, cy + len / 2, zC], r);
        rod(bt, 'oat', [cx, cy - len / 2 - 0.001, zC], [cx, cy + len / 2 + 0.001, zC], r * 0.58);
        rod(bt, mat, [cx, cy - len / 2 - 0.002, zC], [cx, cy + len / 2 + 0.002, zC], r * 0.38);
        rod(bt, 'inkObj', [cx, cy - len / 2 - 0.003, zC], [cx, cy + len / 2 + 0.003, zC], r * 0.16);
      } else {
        rod(bt, mat, [cx - len / 2, cy, zC], [cx + len / 2, cy, zC], r);
        rod(bt, 'oat', [cx - len / 2 - 0.001, cy, zC], [cx + len / 2 + 0.001, cy, zC], r * 0.58);
        rod(bt, mat, [cx - len / 2 - 0.002, cy, zC], [cx + len / 2 + 0.002, cy, zC], r * 0.38);
        rod(bt, 'inkObj', [cx - len / 2 - 0.003, cy, zC], [cx + len / 2 + 0.003, cy, zC], r * 0.16);
      }
    };

    // 1. FREESTANDING SCULPTED OVAL STONE BATHTUB & TUB-CONNECTED BRUSHED-BRASS FILLER COLUMN
    const TUB = new THREE.SplineCurve([
      [0, 0.072], [0.30, 0.072], [0.375, 0.092], [0.418, 0.165], [0.442, 0.30],
      [0.456, 0.46], [0.460, 0.565], [0.452, 0.596], [0.436, 0.598], [0.424, 0.575],
      [0.418, 0.45], [0.402, 0.30], [0.368, 0.20], [0.295, 0.155], [0, 0.146]
    ].map(([r, h]) => new THREE.Vector2(r, h))).getPoints(64).map((v) => [Math.max(0, v.x), v.y]);
    const STOOL_PROF = new THREE.SplineCurve([
      [0, 0.015], [0.190, 0.015], [0.204, 0.036], [0.186, 0.14], [0.162, 0.23],
      [0.186, 0.32], [0.206, 0.415], [0.200, 0.444], [0, 0.444]
    ].map(([r, h]) => new THREE.Vector2(r, h))).getPoints(44).map((v) => [Math.max(0, v.x), v.y]);
    const TX = 52.30, TY = 40.05;
    scanned(() => {
      // Recessed dark bronze shadow plinth & sculpted solid-surface oval bathtub
      lathe(B, 'black', TX, TY, 0, [[0, 0], [0.305, 0], [0.305, 0.076], [0, 0.076]], 1.92, 0.93);
      lathe(B, 'tubStone', TX, TY, 0, TUB, 2.05, 1.0);
      // Brushed-brass center pop-up waste drain & inner slot overflow plate
      cyl(B, 'brass', TX, TY, 0.145, 0.153, 0.038, 0.038, 24);
      cyl(B, 'black', TX, TY, 0.144, 0.150, 0.044, 0.044, 24);
      box(B, 'brass', TX - 0.855, TY - 0.045, TX - 0.840, TY + 0.045, 0.485, 0.502, 0.002);

      // Floor-standing brushed-brass freestanding tub filler column at the WNW shoulder of the tub (x = 51.34, y = 39.95),
      // structurally bridged directly to the bathtub's outer rim (instead of floating disconnected on the west wall)
      const FX0 = 51.34, FY0 = 39.95, FRIM_X = 51.44;
      cyl(B, 'brass', FX0, FY0, 0, 0.022, 0.058, 0.054, 28);                     // machined floor escutcheon plate
      cyl(B, 'brass', FX0, FY0, 0.022, 0.068, 0.034, 0.028, 24);                 // stepped base collar
      cyl(B, 'brass', FX0, FY0, 0.068, 0.725, 0.021, 0.021, 24);                 // tall vertical brass riser column
      // Structural brass bridge bracket & rim saddle clamping the filler column directly to the bathtub's outer rim
      cyl(B, 'brass', FX0, FY0, 0.545, 0.592, 0.030, 0.030, 24);                 // mixer body collar on column
      rod(B, 'brass', [FX0, FY0, 0.568], [FRIM_X + 0.015, FY0, 0.568], 0.018);   // structural connector bar into tub wall
      box(B, 'brass', FRIM_X - 0.018, FY0 - 0.048, FRIM_X + 0.032, FY0 + 0.048, 0.548, 0.598, 0.004); // sculpted brass rim mount saddle
      // Progressive temperature & flow lever controls flanking the mixer body
      [-0.068, 0.068].forEach((dy) => {
        cyl(B, 'brass', FX0, FY0 + dy, 0.554, 0.582, 0.018, 0.018, 18);
        rod(B, 'brass', [FX0, FY0 + dy, 0.568], [FX0 + (dy < 0 ? -0.04 : 0.04), FY0 + dy * 1.45, 0.568], 0.0065);
      });
      // Arching gooseneck spout reaching cleanly over the bathtub rim and down toward the water
      cyl(B, 'brass', FX0, FY0, 0.720, 0.755, 0.024, 0.022, 22);
      rod(B, 'brass', [FX0, FY0, 0.750], [FX0 + 0.08, FY0 + 0.015, 0.785], 0.016);
      rod(B, 'brass', [FX0 + 0.08, FY0 + 0.015, 0.785], [51.65, FY0 + 0.04, 0.782], 0.0155);
      rod(B, 'brass', [51.65, FY0 + 0.04, 0.782], [51.67, FY0 + 0.04, 0.730], 0.015);
      cyl(B, 'brass', 51.67, FY0 + 0.04, 0.722, 0.735, 0.017, 0.016, 20);        // aerator nozzle tip
      // Handheld brass shower wand in side cradle + draped flexible brass hose loop
      rod(B, 'brass', [FX0, FY0 - 0.02, 0.495], [FX0, FY0 - 0.085, 0.495], 0.010);
      cyl(B, 'brass', FX0, FY0 - 0.095, 0.455, 0.635, 0.015, 0.013, 18);         // cylindrical brass hand wand
      cyl(B, 'black', FX0, FY0 - 0.095, 0.600, 0.632, 0.0155, 0.0155, 18);       // wand spray face
      rod(B, 'brass', [FX0, FY0 - 0.095, 0.455], [FX0 + 0.02, FY0 - 0.06, 0.36], 0.0065);
      rod(B, 'brass', [FX0 + 0.02, FY0 - 0.06, 0.36], [FX0, FY0, 0.46], 0.0065);

      // Bespoke solid American Walnut bath caddy across the tub with recessed side handles & book easel
      box(B, 'walnutZ', TX + 0.28, TY - 0.49, TX + 0.60, TY + 0.49, 0.592, 0.618, 0.005);
      box(B, 'walnutZ', TX + 0.31, TY - 0.36, TX + 0.57, TY + 0.36, 0.582, 0.594, 0.003); // under-rim locator cleats
      box(B, 'brass', TX + 0.38, TY - 0.22, TX + 0.40, TY + 0.04, 0.618, 0.695, 0.002);   // brass book-rest easel bar
      rbox(B, 'linenW', TX + 0.43, TY - 0.09, 0.618, 0.685, 0.06, 0.21, 0.006, 0.0);      // open art book aligned with easel
      cyl(B, 'white', TX + 0.46, TY - 0.31, 0.618, 0.698, 0.036, 0.036, 20);              // scented wax candle in glass
      cyl(B, 'brass', TX + 0.46, TY - 0.31, 0.616, 0.626, 0.042, 0.042, 20);              // candle brass coaster
      cyl(d, 'glow', TX + 0.46, TY - 0.31, 0.698, 0.718, 0.004, 0.008, 8);                // warm candle flame
      lathe(B, 'glazeBlack', TX + 0.45, TY + 0.22, 0.618, BOWL.map(([r, h]) => [r * 0.42, h * 0.42]));

      // Sculpted fluted Roman travertine & brushed-brass drum stool aligned directly with the east end of the tub (SX = 53.62, SY = 40.05),
      // topped with neatly aligned folded and rolled spa towels (rotY = 0, parallel to the tub)
      const SX = 53.62, SY = 40.05;
      lathe(B, 'black', SX, SY, 0, [[0, 0], [0.182, 0], [0.182, 0.018], [0, 0.018]], 1, 1);
      cyl(B, 'brass', SX, SY, 0.014, 0.026, 0.194, 0.194, 36);                            // brushed-brass base collar ring
      lathe(B, 'plinthW', SX, SY, 0, STOOL_PROF, 1, 1);                                   // fluted Roman travertine hourglass body
      cyl(B, 'brass', SX, SY, 0.224, 0.236, 0.165, 0.165, 36);                            // brushed-brass waist inlay ring
      foldedBathTowel(B, 'linenW', SX, SY, 0.444, 0.30, 0.24, 0.056, 0);                  // lower folded bath sheet aligned with tub
      foldedBathTowel(B, 'oat', SX, SY, 0.500, 0.27, 0.21, 0.048, 0);                     // upper folded bath towel aligned with tub
      rolledBathTowel(B, 'cotton', SX, SY, 0.576, 0.028, 0.20, false);                    // top rolled hand towel aligned along tub axis

      // Plush hand-loomed bordered chenille/cotton bath rug centered and aligned in front of the tub
      cloth(B, 'rugTaupe', 52.30, 39.18, 0, 1.46, 0.032, 0.68, 0.0045, 2);
      cloth(B, 'rugTaupe', 52.30, 39.18, 0.006, 1.32, 0.030, 0.54, 0.0035, 5);
    });
    { const w = new THREE.Mesh(mark(new THREE.CircleGeometry(0.418, 48), [WX(TX), WZ(TY), 0.5]), M.water); w.rotation.x = -Math.PI / 2; w.scale.set(2.05, 1, 1); w.position.set(WX(TX), 0.5, WZ(TY)); scene.add(w); own([w], 'bath'); w.castShadow = false; }
    colliders.push({ id: 'tub', box: new THREE.Box3(new V3(WX(TX - 0.95), 0, WZ(TY - 0.47)), new V3(WX(TX + 0.95), 0.6, WZ(TY + 0.47))) });

    // 2. BESPOKE AMERICAN WALNUT DOUBLE VANITY, SCULPTED VESSEL BASINS, DECK MIXERS, SOAP & BACKLIT MIRROR
    const V0 = 35.50, V1 = 38.70, VB = [36.30, 37.90], VL = [35.66, 37.10, 38.54];
    scanned(() => {
      // Recessed dark-bronze toe-kick plinth & walnut vanity carcass
      box(B, 'black', 51.14, V0 + 0.08, 51.65, V1 - 0.08, 0, 0.10, 0.004);
      box(B, 'walnutZ', 51.14, V0, 51.72, V1, 0.10, 0.78, 0.008);
      // Dark bronze shadow-gap channels behind the 6 bevelled walnut drawer fronts
      box(B, 'black', 51.715, V0 + 0.015, 51.736, V1 - 0.015, 0.115, 0.765, 0.002);
      // Six individual bevelled crown-cut American Walnut drawer fronts (3 columns x 2 rows) with machined brass pulls
      const dSpan = (V1 - V0) / 3;
      for (let col = 0; col < 3; col++) {
        const yA = V0 + col * dSpan + 0.008, yB = V0 + (col + 1) * dSpan - 0.008, yMid = (yA + yB) * 0.5;
        // Lower deep drawer front & upper drawer front
        box(B, 'walnutZ', 51.720, yA, 51.752, yB, 0.112, 0.434, 0.006);
        box(B, 'walnutZ', 51.720, yA, 51.752, yB, 0.446, 0.768, 0.006);
        // Machined brushed-brass architectural bar pulls on twin standoffs
        [0.375, 0.705].forEach((zP) => {
          box(B, 'brass', 51.762, yMid - 0.14, 51.774, yMid + 0.14, zP - 0.006, zP + 0.006, 0.002);
          box(B, 'brass', 51.750, yMid - 0.11, 51.764, yMid - 0.095, zP - 0.004, zP + 0.004, 0.001);
          box(B, 'brass', 51.750, yMid + 0.095, 51.764, yMid + 0.11, zP - 0.004, zP + 0.004, 0.001);
        });
      }
      // Mitered 6 cm Calacatta marble countertop slab (quartz -> counterQuartzite) & 7 cm rear backsplash upstand
      box(B, 'quartz', 51.14, V0 - 0.05, 51.80, V1 + 0.05, 0.78, 0.84, 0.006);
      box(B, 'quartz', 51.14, V0 - 0.05, 51.178, V1 + 0.05, 0.84, 0.908, 0.004);

      // Two sculpted oval Cristalplant vessel basins with brass pop-up waste drains & tall deck-mounted brass mixer faucets
      const BASIN_PROF = [
        [0, 0], [0.08, 0], [0.145, 0.018], [0.192, 0.058], [0.214, 0.110],
        [0.218, 0.142], [0.208, 0.145], [0.198, 0.138], [0.184, 0.092],
        [0.145, 0.048], [0.065, 0.034], [0, 0.034]
      ];
      VB.forEach((y) => {
        lathe(B, 'tubStone', 51.53, y, 0.84, BASIN_PROF, 0.84, 1.18);
        cyl(B, 'brass', 51.53, y, 0.872, 0.878, 0.024, 0.024, 20);
        cyl(B, 'black', 51.53, y, 0.870, 0.875, 0.029, 0.029, 20);
        // Tall deck-mounted brushed-brass single-lever basin mixer faucet rising from the marble counter behind the bowl
        const fx = 51.27;
        cyl(B, 'brass', fx, y, 0.84, 0.858, 0.028, 0.026, 22);                 // deck base escutcheon ring
        cyl(B, 'brass', fx, y, 0.858, 1.135, 0.019, 0.019, 22);                // tall cylindrical mixer body
        cyl(B, 'brass', fx, y, 1.135, 1.158, 0.020, 0.018, 22);                // top cap
        rod(B, 'brass', [fx, y + 0.018, 1.115], [fx + 0.02, y + 0.082, 1.125], 0.0055); // progressive pin lever
        rod(B, 'brass', [fx, y, 1.095], [51.45, y, 1.095], 0.0125);            // horizontal spout arm over basin
        rod(B, 'brass', [51.45, y, 1.095], [51.46, y, 1.055], 0.012);          // downward aerator nozzle
      });

      // Countertop staging: travertine soap trays, pump liquid-soap dispensers, artisanal soap bar, tumbler, center vessel & hand towels
      // North end: stacked plush folded hand towels
      foldedBathTowel(B, 'linenW', 51.48, V0 + 0.24, 0.84, 0.26, 0.19, 0.044, 0.05, 1);
      foldedBathTowel(B, 'oat', 51.48, V0 + 0.24, 0.884, 0.24, 0.17, 0.038, 0.11, 2);
      // North basin soap set (y = 35.94): carved travertine soap tray + pump soap dispenser + ivory soap bar
      box(B, 'travBlock', 51.38, 35.84, 51.54, 36.02, 0.84, 0.858, 0.004);
      cyl(B, 'glazeBlack', 51.44, 35.96, 0.858, 0.985, 0.032, 0.030, 20);
      cyl(B, 'brass', 51.44, 35.96, 0.985, 1.018, 0.012, 0.010, 16);
      rod(B, 'brass', [51.44, 35.96, 1.012], [51.475, 35.96, 1.006], 0.004);
      rbox(B, 'cotton', 51.48, 35.88, 0.858, 0.880, 0.055, 0.038, 0.008, 0.18);
      // Center vanity styling (y = 37.10): honed travertine tray, sculpted ceramic vase, apothecary jar & diffuser reeds
      box(B, 'travBlock', 51.34, 36.88, 51.58, 37.32, 0.84, 0.858, 0.005);
      vase(B, 'glazeBlack', 51.45, 37.04, 0.858, 0.34);
      cyl(B, 'tubStone', 51.47, 37.21, 0.858, 0.965, 0.038, 0.038, 22);
      cyl(B, 'brass', 51.47, 37.21, 0.965, 0.982, 0.040, 0.040, 22);
      // South basin soap & tumbler set (y = 38.34): brushed-brass round tray + ceramic pump dispenser + dark tumbler
      cyl(B, 'brass', 51.46, V1 - 0.32, 0.84, 0.854, 0.115, 0.115, 32);
      cyl(B, 'ceramic', 51.43, V1 - 0.37, 0.854, 0.995, 0.034, 0.032, 20);
      cyl(B, 'brass', 51.43, V1 - 0.37, 0.995, 1.028, 0.012, 0.010, 16);
      rod(B, 'brass', [51.43, V1 - 0.37, 1.022], [51.465, V1 - 0.37, 1.016], 0.004);
      cyl(B, 'glazeBlack', 51.49, V1 - 0.26, 0.854, 0.955, 0.030, 0.028, 20);

      // Architectural stepped backlit brass-and-bronze vanity mirror & 3 fluted alabaster wall sconces
      box(B, 'black', 51.132, V0 + 0.06, 51.148, V1 - 0.06, 0.99, 2.53, 0.003);  // deep dark-bronze recessed shadow chassis
      box(B, 'brass', 51.142, V0 + 0.08, 51.164, V1 - 0.08, 1.005, 2.515, 0.003); // outer mitered brushed-brass frame
      box(B, 'glassMirror', 51.148, V0 + 0.10, 51.168, V1 - 0.10, 1.02, 2.50, 0.002);
      VL.forEach((y) => {
        box(B, 'black', 51.166, y - 0.028, 51.184, y + 0.028, 1.28, 2.22, 0.003); // sconce mounting spine
        cyl(B, 'brass', 51.205, y, 1.28, 1.35, 0.024, 0.024, 20);                 // lower brass finial holder
        cyl(B, 'brass', 51.205, y, 2.15, 2.22, 0.024, 0.024, 20);                 // upper brass finial holder
        cyl(B, 'brass', 51.205, y, 1.735, 1.765, 0.025, 0.025, 20);               // center brass ring band
        cyl(B, 'glowSoft', 51.205, y, 1.35, 2.15, 0.021, 0.021, 20);              // glowing fluted alabaster light tube
      });
      lamp('bath', 51.55, 37.1, 2.78, 0xffdcb0, 2.4, 7);
      // Overhead linear brushed-brass architectural vanity light bar
      box(B, 'brass', 51.134, V0 + 0.10, 51.22, V1 - 0.10, 2.56, 2.60, 0.004);
      box(B, 'glowSoft', 51.15, V0 + 0.14, 51.21, V1 - 0.14, 2.550, 2.560, 0.001);
    });

    // 3. NORTH-WALL SCULPTED SOLID WALNUT TOWEL LADDER WITH MULTI-LAYER DRAPED SPA TOWELS
    thing(54.0, 35.25, () => {
      rod(B, 'walnutSolid', [53.68, 35.32, 0.02], [53.68, 35.14, 1.92], 0.017);
      rod(B, 'walnutSolid', [54.32, 35.32, 0.02], [54.32, 35.14, 1.92], 0.017);
      cyl(B, 'brass', 53.68, 35.32, 0, 0.035, 0.018, 0.018, 16);
      cyl(B, 'brass', 54.32, 35.32, 0, 0.035, 0.018, 0.018, 16);
      [0.46, 0.82, 1.18, 1.54].forEach((z) => {
        const yR = 35.32 - (z / 1.90) * 0.18;
        rod(B, 'walnutSolid', [53.68, yR, z], [54.32, yR, z], 0.0125);
        cyl(B, 'brass', 53.67, yR, z - 0.008, z + 0.008, 0.014, 0.014, 14);
        cyl(B, 'brass', 54.33, yR, z - 0.008, z + 0.008, 0.014, 0.014, 14);
      });
      // Upper rung (z = 1.54): folded warm-oatmeal hand towel draped over the rung
      rod(B, 'oat', [53.78, 35.175, 1.545], [54.04, 35.175, 1.545], 0.022);
      rbox(B, 'oat', 53.91, 35.190, 1.24, 1.545, 0.26, 0.022, 0.010, 0);
      rbox(B, 'oat', 53.91, 35.160, 1.27, 1.545, 0.255, 0.020, 0.010, 0);
      // Middle rung (z = 1.18): wide plush ivory bath sheet with front & back hanging folds and bottom hem border
      rod(B, 'linenW', [53.79, 35.208, 1.185], [54.23, 35.208, 1.185], 0.024);
      rbox(B, 'linenW', 54.01, 35.224, 0.54, 1.185, 0.44, 0.024, 0.012, 0);
      rbox(B, 'linenW', 54.01, 35.192, 0.58, 1.185, 0.435, 0.022, 0.012, 0);
      box(B, 'oat', 53.79, 35.212, 54.23, 35.237, 0.56, 0.59, 0.004);
    });

    // East wall south of WC: floor-to-ceiling walnut slats over dark shadow backing
    scanned(() => {
      for (let y = 39.66; y < 40.9; y += 0.115) box(d, 'walnut', 58.74, y, 58.8, y + 0.07, 0.02, 3.56, 0.004);
      box(d, 'black', 58.785, 39.6, 58.8, 40.9, 0, 3.58, 0.001);
    });

    // 4. WALK-IN TRAVERTINE & BRONZE-FRAMED GLASS RAIN SHOWER (COMPLETE IN BOTH OUTLINE & 3D)
    // All architectural glass framing, threshold curb, linear drain, East-wall exposed brass riser column, thermostatic mixer,
    // ceiling/wall rain head, hand-shower rail, and recessed travertine niche are placed in B inside scanned() so Screenshot 1
    // and Screenshot 2 show the complete shower outline before the 3D reveal sweeps across in Screenshot 3.
    const SX0 = 57.25, SX1 = 58.80, SY0 = 35.13, SY1 = 37.85;
    scanned(() => {
      // Full-height vein-cut Roman travertine North & East shower walls
      box(B, 'travBlock', SX0, SY0 - 0.01, SX1, SY0 + 0.02, 0, 3.58, 0.003);
      box(B, 'travBlock', SX1 - 0.04, SY0, SX1, 39.60, 0, 3.58, 0.003);
      // Honed travertine & dark-bronze shower threshold curb along West and South glass lines
      box(B, 'travBlock', SX0 - 0.03, SY0 + 0.02, SX0 + 0.03, SY1 + 0.03, 0, 0.032, 0.004);
      box(B, 'travBlock', SX0 - 0.03, SY1 - 0.03, SX1 - 0.04, SY1 + 0.03, 0, 0.032, 0.004);
      // Clear architectural tempered glass panes (West pane with 68 cm walk-in entry gap, South pane)
      box(dec('bath:see'), 'glass', SX0 - 0.01, SY0 + 0.02, SX0 + 0.01, SY1 - 0.68, 0.032, 2.24, 0.002);
      box(dec('bath:see'), 'glass', SX0, SY1 - 0.01, SX1 - 0.04, SY1 + 0.01, 0.032, 2.24, 0.002);
      // Complete dark-bronze & brushed-brass structural glass frame (in B so visible in outline drawing!)
      box(B, 'black', SX0 - 0.018, SY0 + 0.02, SX0 + 0.018, SY1 - 0.68, 0.030, 0.052, 0.002);   // West bottom track
      box(B, 'black', SX0 - 0.018, SY0 + 0.02, SX0 + 0.018, SY1 - 0.68, 2.225, 2.258, 0.003);   // West top header rail
      box(B, 'black', SX0 - 0.018, SY0 + 0.02, SX0 + 0.018, SY0 + 0.048, 0.030, 2.258, 0.002);  // North-West wall stile
      box(B, 'black', SX0 - 0.018, SY1 - 0.708, SX0 + 0.018, SY1 - 0.678, 0.030, 2.258, 0.003); // West door-opening vertical stile
      box(B, 'brass', SX0 - 0.021, SY1 - 0.704, SX0 + 0.021, SY1 - 0.682, 0.95, 1.25, 0.002);   // Brass edge guard on entry stile
      box(B, 'black', SX0 - 0.018, SY1 - 0.018, SX1 - 0.04, SY1 + 0.018, 0.030, 0.052, 0.002);  // South bottom track
      box(B, 'black', SX0 - 0.018, SY1 - 0.018, SX1 - 0.04, SY1 + 0.018, 2.225, 2.258, 0.003);  // South top header rail
      box(B, 'black', SX0 - 0.020, SY1 - 0.020, SX0 + 0.020, SY1 + 0.020, 0.030, 2.262, 0.003); // South-West corner post
      box(B, 'black', SX1 - 0.068, SY1 - 0.018, SX1 - 0.04, SY1 + 0.018, 0.030, 2.258, 0.002);  // South-East wall stile
      // Overhead structural horizontal transom bar spanning across the entry gap (no vertical ceiling rod)
      box(B, 'black', SX0 - 0.016, SY1 - 0.68, SX0 + 0.016, SY1 + 0.018, 2.230, 2.256, 0.002);  // Continuous West transom bar

      // Bespoke Non-Slip Fluted & Bush-Hammered Stone Shower Tray with Recessed Dark-Bronze Perimeter Drainage Slot
      box(B, 'black', SX0 + 0.012, SY0 + 0.022, SX1 - 0.042, SY1 - 0.018, 0.001, 0.006, 0.001);       // Recessed perimeter drainage pan
      box(B, 'showerFloor', SX0 + 0.046, SY0 + 0.048, SX1 - 0.068, SY1 - 0.046, 0.003, 0.015, 0.004); // Raised non-slip fluted stone tray
      // Recessed brushed-brass linear floor drain channel with slotted grate along the East wall
      box(B, 'black', SX1 - 0.32, SY0 + 0.22, SX1 - 0.23, SY1 - 0.16, 0.006, 0.016, 0.001);
      box(B, 'brass', SX1 - 0.308, SY0 + 0.235, SX1 - 0.242, SY1 - 0.175, 0.007, 0.017, 0.0015);

      // Floating cantilevered Roman travertine shower bench along North wall with shadow cleats & spa towels
      box(B, 'black', SX0 + 0.26, SY0 + 0.02, SX1 - 0.28, SY0 + 0.38, 0.39, 0.425, 0.003);
      box(B, 'travBlock', SX0 + 0.22, SY0 + 0.02, SX1 - 0.24, SY0 + 0.44, 0.425, 0.488, 0.006);
      foldedBathTowel(B, 'linenW', SX0 + 0.68, SY0 + 0.24, 0.488, 0.34, 0.26, 0.052, 0.08, 3);
      rolledBathTowel(B, 'oat', SX0 + 0.68, SY0 + 0.24, 0.568, 0.028, 0.22, false);

      // Complete East-Wall Cantilevered Brushed-Brass Rain Shower Column (x = 58.76, y = 36.48) — 100% wall-mounted, zero ceiling rod!
      const SH_Y = 36.48, SH_X = SX1 - 0.04;
      // 1. Architectural thermostatic mixer console on East wall (z = 1.10) with bevelled escutcheon & 3 knurled rotary dials
      box(B, 'black', SH_X - 0.010, SH_Y - 0.225, SH_X, SH_Y + 0.225, 1.052, 1.148, 0.002);       // Recessed dark-bronze shadow gasket
      box(B, 'brass', SH_X - 0.020, SH_Y - 0.215, SH_X, SH_Y + 0.215, 1.060, 1.140, 0.004);       // Bevelled brushed-brass wall plate
      rod(B, 'brass', [SH_X - 0.060, SH_Y - 0.175, 1.10], [SH_X - 0.060, SH_Y + 0.175, 1.10], 0.024); // Cylindrical thermostatic bar
      rod(B, 'brass', [SH_X, SH_Y - 0.12, 1.10], [SH_X - 0.060, SH_Y - 0.12, 1.10], 0.018);       // Left wall union
      rod(B, 'brass', [SH_X, SH_Y + 0.12, 1.10], [SH_X - 0.060, SH_Y + 0.12, 1.10], 0.018);       // Right wall union
      [-0.14, 0.0, 0.14].forEach((dy) => {
        rod(B, 'black', [SH_X - 0.060, SH_Y + dy, 1.10], [SH_X - 0.082, SH_Y + dy, 1.10], 0.018); // Dark index collar
        rod(B, 'brass', [SH_X - 0.078, SH_Y + dy, 1.10], [SH_X - 0.102, SH_Y + dy, 1.10], 0.020); // Knurled front control dial
      });
      // 2. Wall-anchored vertical brushed-brass riser column (z = 1.10..2.36) with circular wall rosettes & cantilevered wall arm
      cyl(B, 'brass', SH_X - 0.060, SH_Y, 1.115, 1.155, 0.022, 0.018, 18);                        // Mixer top riser manifold collar
      rod(B, 'brass', [SH_X - 0.060, SH_Y, 1.12], [SH_X - 0.060, SH_Y, 2.36], 0.0135);            // Sturdy vertical brass riser column
      [1.52, 2.00].forEach((zB) => {
        box(B, 'brass', SH_X - 0.012, SH_Y - 0.028, SH_X, SH_Y + 0.028, zB - 0.028, zB + 0.028, 0.003); // Wall anchor rosette plate
        rod(B, 'brass', [SH_X, SH_Y, zB], [SH_X - 0.060, SH_Y, zB], 0.011);                       // Horizontal wall anchor strut
        cyl(B, 'brass', SH_X - 0.060, SH_Y, zB - 0.014, zB + 0.014, 0.018, 0.018, 16);            // Machined pipe clamp collar
      });
      // Top structural wall mounting flange at z = 2.36 + T-elbow union + cantilevered horizontal shower arm (no ceiling rod!)
      box(B, 'black', SH_X - 0.010, SH_Y - 0.044, SH_X, SH_Y + 0.044, 2.316, 2.404, 0.002);       // Upper wall shadow gasket
      box(B, 'brass', SH_X - 0.022, SH_Y - 0.038, SH_X, SH_Y + 0.038, 2.322, 2.398, 0.004);       // Upper structural wall flange
      cyl(B, 'brass', SH_X - 0.060, SH_Y, 2.332, 2.388, 0.022, 0.022, 20);                        // Top T-elbow riser union
      rod(B, 'brass', [SH_X, SH_Y, 2.36], [58.08, SH_Y, 2.36], 0.0155);                           // Cantilevered horizontal shower arm
      rod(B, 'brass', [SH_X - 0.060, SH_Y, 2.22], [58.46, SH_Y, 2.36], 0.0085);                   // Architectural diagonal wall-arm brace
      // 90-degree downward elbow & sculpted multi-tier Dornbracht-style cushion-square rain showerhead (x = 58.08, y = 36.48)
      ball(B, 'brass', 58.08, SH_Y, 2.36, 0.019, 1.0);                                            // Machined 90-degree arm elbow
      cyl(B, 'brass', 58.08, SH_Y, 2.305, 2.360, 0.016, 0.016, 20);                               // Short vertical drop neck from arm
      cyl(B, 'brass', 58.08, SH_Y, 2.288, 2.312, 0.022, 0.038, 24);                               // Conical swivel ball-joint bell
      rbox(B, 'brass', 58.08, SH_Y, 2.276, 2.290, 0.22, 0.22, 0.032, 0);                          // Upper stepped brass crown plate
      rbox(B, 'brass', 58.08, SH_Y, 2.254, 2.278, 0.38, 0.38, 0.052, 0);                          // Main bevelled brushed-brass rain head
      rbox(B, 'black', 58.08, SH_Y, 2.247, 2.255, 0.34, 0.34, 0.044, 0);                          // Recessed dark-bronze nozzle bezel
      rbox(B, 'brass', 58.08, SH_Y, 2.244, 2.249, 0.30, 0.30, 0.038, 0);                          // Inner perforated brass spray face
      for (let ix = -2; ix <= 2; ix++) {
        for (let iy = -2; iy <= 2; iy++) {
          cyl(B, 'black', 58.08 + ix * 0.055, SH_Y + iy * 0.055, 2.238, 2.245, 0.0055, 0.0045, 8); // Rain nozzle jets
        }
      }
      // 3. Adjacent vertical hand-shower slide rail, wand cradle, cylindrical brass wand & hose loop (y = 36.10)
      const HR_Y = 36.10;
      rod(B, 'brass', [SH_X - 0.048, HR_Y, 0.98], [SH_X - 0.048, HR_Y, 1.82], 0.009);             // Vertical slide rail
      [1.02, 1.78].forEach((zR) => {
        box(B, 'brass', SH_X - 0.010, HR_Y - 0.022, SH_X, HR_Y + 0.022, zR - 0.022, zR + 0.022, 0.002);
        rod(B, 'brass', [SH_X, HR_Y, zR], [SH_X - 0.048, HR_Y, zR], 0.0105);
      });
      cyl(B, 'brass', SH_X - 0.058, HR_Y, 1.40, 1.45, 0.018, 0.018, 16);                          // Slide cradle
      cyl(B, 'brass', SH_X - 0.088, HR_Y, 1.36, 1.56, 0.014, 0.012, 18);                          // Cylindrical brass hand-shower wand
      cyl(B, 'brass', SH_X - 0.088, HR_Y, 1.56, 1.60, 0.028, 0.024, 18);                          // Hand-shower head
      rod(B, 'brass', [SH_X - 0.088, HR_Y, 1.36], [SH_X - 0.068, (HR_Y + SH_Y) * 0.5, 0.94], 0.006); // Hose drop
      rod(B, 'brass', [SH_X - 0.068, (HR_Y + SH_Y) * 0.5, 0.94], [SH_X - 0.060, SH_Y - 0.06, 1.08], 0.006); // Hose return to mixer

      // 4. Framed Recessed Travertine & Brushed-Brass Shower Niche on East wall (y = 36.88..37.54, z = 1.12..1.56)
      box(B, 'black', SH_X - 0.008, 36.88, SH_X, 37.54, 1.12, 1.56, 0.002);                       // Deep niche shadow back
      box(B, 'brass', SH_X - 0.065, 36.86, SH_X + 0.002, 37.56, 1.105, 1.125, 0.003);             // Bottom brass sill
      box(B, 'brass', SH_X - 0.065, 36.86, SH_X + 0.002, 37.56, 1.555, 1.572, 0.003);             // Top brass head
      box(B, 'brass', SH_X - 0.065, 36.86, SH_X + 0.002, 36.88, 1.105, 1.572, 0.003);             // North brass jamb
      box(B, 'brass', SH_X - 0.065, 37.54, SH_X + 0.002, 37.56, 1.105, 1.572, 0.003);             // South brass jamb
      box(B, 'travBlock', SH_X - 0.14, 36.86, SH_X, 37.56, 1.09, 1.115, 0.004);                   // Projecting travertine shelf ledge
      [36.98, 37.13, 37.29, 37.43].forEach((y, k) => {
        const hB = 0.15 + (k % 3) * 0.028;
        cyl(B, k % 2 ? 'glazeBlack' : 'tubStone', SH_X - 0.075, y, 1.125, 1.125 + hB, 0.028, 0.026, 18);
        cyl(B, 'brass', SH_X - 0.075, y, 1.125 + hB, 1.125 + hB + 0.024, 0.010, 0.009, 14);
      });

      // 5. Centered Bathroom Ceiling Horizontal Architectural Spotlight Rail (x = 52.80..57.20, y = 38.45, z = 3.58) with 4 Evenly Spaced Gimbal Spotlights
      const spX0 = 52.80, spX1 = 57.20, spY = 38.45, spZ = 3.58;
      box(B, 'brass', spX0, spY - 0.056, spX1, spY + 0.056, spZ - 0.012, spZ, 0.002);             // Brushed-brass ceiling track bezel
      box(B, 'black', spX0 + 0.02, spY - 0.046, spX1 - 0.02, spY + 0.046, spZ - 0.026, spZ - 0.002, 0.002); // Matte-black recessed channel
      box(B, 'brass', spX0 + 0.02, spY - 0.036, spX1 - 0.02, spY - 0.029, spZ - 0.014, spZ - 0.006, 0.001); // North brass busbar
      box(B, 'brass', spX0 + 0.02, spY + 0.029, spX1 - 0.02, spY + 0.036, spZ - 0.014, spZ - 0.006, 0.001); // South brass busbar
      [
        [53.14, new V3(-0.42, -0.85, 0.31).normalize()],                                          // Spotlight 1: angled toward freestanding tub
        [54.38, new V3(-0.44, -0.86, -0.25).normalize()],                                         // Spotlight 2: angled toward double vanity
        [55.62, new V3(0.32, -0.88, 0.35).normalize()],                                           // Spotlight 3: angled toward central floor & curtain
        [56.86, new V3(0.46, -0.84, -0.28).normalize()],                                          // Spotlight 4: angled toward shower & WC monolith
      ].forEach(([sx, aimDir]) => {
        cyl(B, 'brass', sx, spY, spZ - 0.052, spZ - 0.024, 0.040, 0.046, 28);                     // Stationary brass ceiling stem collar
        ball(B, 'brass', sx, spY, spZ - 0.052, 0.042, 0.95);                                      // Articulated brass swivel ball joint
        const piv = new V3(WX(sx), spZ - 0.054, WZ(spY));
        const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), aimDir.clone().negate());
        const one = new V3(1, 1, 1);
        const canCyl = (bt, mat, d0, d1, rTop, rBot, seg) => {
          const p = piv.clone().addScaledVector(aimDir, 0.5 * (d0 + d1));
          bt.add(M[mat], new THREE.CylinderGeometry(rTop, rBot, d1 - d0, seg || 28), new THREE.Matrix4().compose(p, q, one));
        };
        const canTorus = (bt, mat, dist, r, tube, seg) => {
          const p = piv.clone().addScaledVector(aimDir, dist);
          const m = new THREE.Matrix4().compose(p, q, one).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
          bt.add(M[mat], new THREE.TorusGeometry(r, tube, 12, seg || 28), m);
        };
        B.add(M.brass, new THREE.SphereGeometry(0.054, 28, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), new THREE.Matrix4().compose(piv.clone().addScaledVector(aimDir, 0.020), q, new V3(1, 0.35, 1)));
        canCyl(B, 'brass', 0.018, 0.032, 0.054, 0.054, 28);                                       // Top spun-brass barrel crown
        canCyl(B, 'black', 0.031, 0.156, 0.054, 0.054, 28);                                       // Matte-black spotlight barrel
        canCyl(B, 'brass', 0.154, 0.208, 0.055, 0.055, 28);                                       // Lower brushed-brass baffle cuff
        canTorus(B, 'brass', 0.208, 0.051, 0.0038, 28);                                           // Rolled brass aperture lip
        canCyl(B, 'black', 0.170, 0.206, 0.046, 0.046, 24);                                       // Recessed anti-glare inner baffle
        canCyl(d, 'glow', 0.186, 0.200, 0.037, 0.037, 24);                                        // Warm optical LED lens
        d.add(M.glowSoft, new THREE.SphereGeometry(0.034, 20, 12), new THREE.Matrix4().compose(piv.clone().addScaledVector(aimDir, 0.200), q, new V3(1, 0.35, 1)));
      });
    });

    // 5. REDESIGNED SCULPTED WALL-HUNG CERAMIC TOILET & ARTICULATED TRAVERTINE CISTERN MONOLITH
    // Replaces the blocky rectangular box + floating lid with a custom 3D D-shaped organic rimless porcelain bowl,
    // contoured seat, flush soft-close lid with brass hinges, recessed dual-flush brass actuator plate, roll holder & brush.
    const WC_X = 58.48, WC_Y = 38.75;
    const buildWcGeo = () => {
      const nU = 36, nV = 16;
      // Helper for D-shaped plan contour: u in [-1, 1] around perimeter (u = 0 at front nose x = 57.90, u = ±1 at rear wall x = 58.48)
      const dPoint = (u, lenX, halfY) => {
        const a = u * Math.PI; // -pi to +pi, 0 is front (-X)
        // Smooth transition from semicircular front nose to straight rear mounting shoulders against x = WC_X
        const frontW = 0.5 - 0.5 * Math.cos(a); // 0 at front, 1 at back
        const x = WC_X - lenX * (0.5 + 0.5 * Math.cos(a)) * (1 - 0.12 * frontW * Math.sin(a) * Math.sin(a));
        const y = WC_Y + halfY * Math.sin(a) * (1 + 0.08 * Math.pow(frontW, 1.5));
        return [x, y];
      };
      // 1. Sculpted Rimless Ceramic Bowl (outer organic hull + rim + recessed inner bowl basin)
      const bowl = new THREE.BufferGeometry();
      const pos = [], uvs = [], indices = [];
      // Rings from v = 0 (bottom sump at z = 0.165) up to v = 9 (outer rim at z = 0.408), v = 10 (inner rim lip), down to v = 15 (inner water basin at z = 0.255)
      const rings = [
        { z: 0.165, lx: 0.24, hy: 0.085, xOff: 0.06 },
        { z: 0.180, lx: 0.36, hy: 0.130, xOff: 0.03 },
        { z: 0.215, lx: 0.45, hy: 0.158, xOff: 0.01 },
        { z: 0.265, lx: 0.51, hy: 0.175, xOff: 0.00 },
        { z: 0.320, lx: 0.545, hy: 0.186, xOff: 0.00 },
        { z: 0.370, lx: 0.560, hy: 0.190, xOff: 0.00 },
        { z: 0.402, lx: 0.562, hy: 0.191, xOff: 0.00 },
        { z: 0.410, lx: 0.556, hy: 0.188, xOff: 0.00 }, // outer top rim crest
        { z: 0.410, lx: 0.490, hy: 0.152, xOff: 0.045 }, // inner rimless lip
        { z: 0.375, lx: 0.465, hy: 0.142, xOff: 0.055 },
        { z: 0.320, lx: 0.410, hy: 0.120, xOff: 0.075 },
        { z: 0.268, lx: 0.310, hy: 0.085, xOff: 0.110 },
        { z: 0.252, lx: 0.020, hy: 0.010, xOff: 0.220 }, // inner basin center
      ];
      for (let iv = 0; iv < rings.length; iv++) {
        const R = rings[iv];
        for (let iu = 0; iu <= nU; iu++) {
          const u = (iu / nU) * 2 - 1;
          const [px, py] = dPoint(u, R.lx, R.hy);
          const xClamped = Math.min(WC_X, px - R.xOff * (1 - Math.pow(Math.abs(u), 2.5)));
          pos.push(WX(xClamped), R.z, WZ(py));
          uvs.push(iu / nU, iv / (rings.length - 1));
        }
      }
      for (let iv = 0; iv < rings.length - 1; iv++) {
        for (let iu = 0; iu < nU; iu++) {
          const a = iv * (nU + 1) + iu, b = a + 1, c = a + (nU + 1), d0 = c + 1;
          indices.push(a, c, b, b, c, d0);
        }
      }
      bowl.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      bowl.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      bowl.setIndex(indices);
      bowl.computeVertexNormals();

      // 2. Tailored Soft-Close Ergonomic Seat & Flush Cover Lid (sitting flush on the rim at z = 0.412..0.450)
      const lid = new THREE.BufferGeometry();
      const lPos = [], lUvs = [], lIdx = [];
      const lidRings = [
        { z: 0.412, lx: 0.548, hy: 0.184 },
        { z: 0.418, lx: 0.558, hy: 0.190 }, // lower seat ring bevel
        { z: 0.430, lx: 0.558, hy: 0.190 }, // seat ring / lid seam
        { z: 0.443, lx: 0.554, hy: 0.188 }, // upper flush lid edge
        { z: 0.450, lx: 0.460, hy: 0.150 }, // crowned lid top
        { z: 0.452, lx: 0.010, hy: 0.005 },
      ];
      for (let iv = 0; iv < lidRings.length; iv++) {
        const R = lidRings[iv];
        for (let iu = 0; iu <= nU; iu++) {
          const u = (iu / nU) * 2 - 1;
          const [px, py] = dPoint(u, R.lx, R.hy);
          lPos.push(WX(Math.min(WC_X - 0.008, px)), R.z, WZ(py));
          lUvs.push(iu / nU, iv / (lidRings.length - 1));
        }
      }
      for (let iv = 0; iv < lidRings.length - 1; iv++) {
        for (let iu = 0; iu < nU; iu++) {
          const a = iv * (nU + 1) + iu, b = a + 1, c = a + (nU + 1), d0 = c + 1;
          lIdx.push(a, c, b, b, c, d0);
        }
      }
      lid.setAttribute('position', new THREE.Float32BufferAttribute(lPos, 3));
      lid.setAttribute('uv', new THREE.Float32BufferAttribute(lUvs, 2));
      lid.setIndex(lIdx);
      lid.computeVertexNormals();

      // 3. D-curved shadow reveal collar between the ceramic bowl rim and the soft-close seat
      const seam = new THREE.BufferGeometry();
      const sPos = [], sUvs = [], sIdx = [];
      const seamRings = [
        { z: 0.408, lx: 0.553, hy: 0.187 },
        { z: 0.414, lx: 0.553, hy: 0.187 },
      ];
      for (let iv = 0; iv < 2; iv++) {
        const R = seamRings[iv];
        for (let iu = 0; iu <= nU; iu++) {
          const u = (iu / nU) * 2 - 1;
          const [px, py] = dPoint(u, R.lx, R.hy);
          sPos.push(WX(Math.min(WC_X - 0.006, px)), R.z, WZ(py));
          sUvs.push(iu / nU, iv);
        }
      }
      for (let iu = 0; iu < nU; iu++) {
        const a = iu, b = a + 1, c = a + (nU + 1), d0 = c + 1;
        sIdx.push(a, c, b, b, c, d0);
      }
      seam.setAttribute('position', new THREE.Float32BufferAttribute(sPos, 3));
      seam.setAttribute('uv', new THREE.Float32BufferAttribute(sUvs, 2));
      seam.setIndex(sIdx);
      seam.computeVertexNormals();
      return { bowl, lid, seam };
    };
    const wcGeos = buildWcGeo();
    scanned(() => {
      // Articulated Roman travertine cistern monolith with recessed dark-bronze plinth, brass side trims & chamfered top ledge
      box(B, 'black', 58.50, 37.96, SX1 - 0.04, 39.54, 0, 0.06, 0.003);          // Recessed shadow plinth
      box(B, 'travBlock', WC_X, 37.95, SX1 - 0.04, 39.55, 0.06, 1.06, 0.006);    // Travertine cistern enclosure
      box(B, 'brass', WC_X - 0.004, 37.945, SX1 - 0.04, 37.965, 0.06, 1.06, 0.002); // North vertical brass reveal trim
      box(B, 'brass', WC_X - 0.004, 39.535, SX1 - 0.04, 39.555, 0.06, 1.06, 0.002); // South vertical brass reveal trim
      box(B, 'black', WC_X - 0.003, 37.95, SX1 - 0.04, 39.55, 1.06, 1.074, 0.002);  // Shadow reveal under ledge
      box(B, 'quartz', WC_X - 0.025, 37.93, SX1 - 0.04, 39.57, 1.074, 1.115, 0.005); // Overhanging Calacatta stone top shelf
      // Sculpted D-shaped rimless ceramic toilet bowl, contoured seat & lid, D-curved shadow seam, and twin brushed-brass rear hinges
      B.add(M.tubStone, wcGeos.bowl, new THREE.Matrix4());
      B.add(M.tubStone, wcGeos.lid, new THREE.Matrix4());
      B.add(M.black, wcGeos.seam, new THREE.Matrix4());
      [-0.105, 0.105].forEach((dy) => {
        cyl(B, 'brass', WC_X - 0.045, WC_Y + dy, 0.408, 0.456, 0.016, 0.016, 18); // Brushed-brass soft-close hinge barrels
      });
      // Recessed brushed-brass dual-flush actuator plate on the cistern monolith above the WC (all in B so clean in draft & 3D!)
      box(B, 'brass', WC_X - 0.012, WC_Y - 0.145, WC_X + 0.002, WC_Y + 0.145, 0.83, 0.99, 0.003); // Outer brass bezel
      box(B, 'black', WC_X - 0.015, WC_Y - 0.130, WC_X - 0.006, WC_Y + 0.130, 0.845, 0.975, 0.002); // Shadow recess
      box(B, 'brass', WC_X - 0.019, WC_Y - 0.122, WC_X - 0.008, WC_Y + 0.018, 0.852, 0.968, 0.002); // Full-flush brass paddle
      box(B, 'brass', WC_X - 0.019, WC_Y + 0.028, WC_X - 0.008, WC_Y + 0.122, 0.852, 0.968, 0.002); // Half-flush brass paddle
      // Wall-mounted brushed-brass toilet paper holder & roll (south of bowl at y = 39.26)
      box(B, 'brass', WC_X - 0.014, 39.20, WC_X, 39.34, 0.67, 0.71, 0.002);
      rod(B, 'brass', [WC_X, 39.22, 0.69], [58.35, 39.22, 0.69], 0.0065);
      rod(B, 'brass', [58.35, 39.22, 0.69], [58.35, 39.35, 0.69], 0.0065);
      cyl(B, 'cotton', 58.39, 39.29, 0.635, 0.735, 0.056, 0.056, 24);
      cyl(B, 'inkObj', 58.39, 39.29, 0.633, 0.737, 0.019, 0.019, 14);
      // Cylindrical brushed-brass floor toilet brush holder (north of bowl at y = 38.18)
      cyl(B, 'brass', 58.34, 38.18, 0, 0.28, 0.048, 0.046, 24);
      cyl(B, 'black', 58.34, 38.18, 0.275, 0.285, 0.042, 0.042, 20);
      rod(B, 'brass', [58.34, 38.18, 0.28], [58.34, 38.18, 0.43], 0.006);
      // Cistern stone shelf styling: brass tray, amber diffuser bottle & folded guest towel
      box(B, 'brass', WC_X + 0.04, 38.12, WC_X + 0.22, 38.44, 1.115, 1.127, 0.002);
      cyl(B, 'glazeBlack', WC_X + 0.13, 38.22, 1.127, 1.245, 0.032, 0.030, 18);
      cyl(B, 'brass', WC_X + 0.13, 38.22, 1.245, 1.268, 0.014, 0.014, 16);
      foldedBathTowel(B, 'cotton', WC_X + 0.13, 38.35, 1.127, 0.13, 0.16, 0.028, 0.04, 4);
    });

    lamp('bath', 58.0, 36.5, 2.5, 0xffdcb0, 1.55, 4.8);
    // 6. MUSEUM-GRADE FRAMED ABSTRACT PAINTING OVER THE TUB (built-in picture light removed per Sam's feedback)
    art('bath', 'field', 'W', 39.85, 51.13, 1.82, 1.06, 1.34, 'walnut', 19);
    lamp('bath', 51.45, 39.85, 2.45, 0xffdcb0, 1.15, 3.6);

    // 7. CLOSED SEMI-TRANSPARENT LIGHT SHEER RIPPLEFOLD DRAPERY ACROSS THE MASTER BATHROOM WINDOW (x = 51.40..55.02, y = 40.82)
    //    Two center-meeting 3D omega-pleat panels in Warm Alabaster & Pearl-Ivory Belgian Voile-Linen (bathSheer / bathSheerPaper)
    //    hanging from a full-span recessed dark-bronze & brushed-brass ceiling track behind the freestanding bathtub.
    scanned(() => {
      const cy = 40.82;
      const cEnd = 55.04, cMid = 53.215;
      box(B, 'bronze', 51.40, cy - 0.04, cEnd, cy + 0.04, 3.568, 3.598, 0.002);
      box(B, 'brass', 51.40, cy - 0.044, cEnd, cy - 0.036, 3.566, 3.574, 0.001);
      box(B, 'brass', 51.40, cy + 0.036, cEnd, cy + 0.044, 3.566, 3.574, 0.001);
      const buildBathCurtainPanel = (a0, a1, z0, z1, folds, leadAtRight, seed) => {
        const spanW = a1 - a0, nx = Math.max(112, Math.round(folds * 14)), ny = 24;
        const g = new THREE.PlaneGeometry(1, z1 - z0, nx, ny);
        g.translate(0.5, (z0 + z1) * 0.5, 0);
        const pos = g.attributes.position, uv = g.attributes.uv;
        let uCloth = 0, prevX = a0, prevZ = 0;
        const uArr = new Float32Array(nx + 1), xArr = new Float32Array(nx + 1), zArr = new Float32Array(nx + 1), cArr = new Float32Array(nx + 1);
        for (let ix = 0; ix <= nx; ix++) {
          const u = ix / nx, ph = u * folds * Math.PI;
          const sWave = Math.sin(ph) + 0.16 * Math.sin(3.0 * ph), cWave = Math.cos(ph);
          const xCur = a0 + u * spanW - 0.014 * (spanW / folds) * cWave * Math.sin(ph);
          const zCur = 0.040 * sWave;
          if (ix > 0) uCloth += Math.hypot(xCur - prevX, zCur - prevZ);
          prevX = xCur; prevZ = zCur;
          uArr[ix] = uCloth; xArr[ix] = xCur; zArr[ix] = zCur; cArr[ix] = Math.sin(ph);
        }
        const totalCloth = uCloth;
        for (let iy = 0; iy <= ny; iy++) {
          const py = pos.getY(iy * (nx + 1));
          const hFrac = Math.max(0, Math.min(1, (z1 - py) / (z1 - z0)));
          const relax = 1.0 + 0.08 * Math.pow(hFrac, 1.35);
          const sway = 0.006 * Math.sin(hFrac * Math.PI * 1.15 + seed);
          for (let ix = 0; ix <= nx; ix++) {
            const idx = iy * (nx + 1) + ix;
            const along = xArr[ix] + sway * (0.4 + 0.6 * cArr[ix]);
            const across = cy + zArr[ix] * relax;
            pos.setX(idx, WX(along)); pos.setZ(idx, WZ(across));
            const uLead = leadAtRight ? (totalCloth - uArr[ix]) : uArr[ix];
            uv.setXY(idx, 100.0 + uLead, 100.0 + cArr[ix]);
          }
        }
        g.computeVertexNormals();
        B.add(M.bathSheerPaper, g);
        B.add(M.bathSheer, g);
        for (let k = 0; k <= folds; k += 2) {
          const gc = a0 + (k / folds) * spanW;
          cyl(B, 'brass', gc, cy, z1 - 0.006, z1 + 0.010, 0.005, 0.005, 8);
        }
      };
      buildBathCurtainPanel(51.41, cMid - 0.003, 0.014, 3.568, 22, true, 0.6);  // West panel (closed to center-meet seam at x = 53.215)
      buildBathCurtainPanel(cMid + 0.003, 55.02, 0.014, 3.568, 22, false, 1.8); // East panel (closed to center-meet seam at x = 53.215)
    });
  }

  /* ================= private garden ==================================================
     Sam, 9 Oct: "you see water and the hill, but the scene feels weak. Empty... a two out of ten."
     Rebuilt for the view you get stepping out of the bath, looking south-west: a fire bowl and chairs close
     to you, the loungers and the water beyond them with the sea behind, the old olive in the middle of the
     lawn, a slatted pergola with a sofa at the far end, planting along every edge. */
  {
    const d = dec('garden'), Rg = FX.rng(7788);
    box(B, 'concrete', 41, 49.55, 62, 50, -0.04, 0.5, 0.01); box(B, 'concrete', 61.55, 41, 62, 49.55, -0.04, 0.5, 0.01);
    // Consistent 80x80 cm honed Roman travertine terrace tiles along the house
    box(B, 'travP', 41.2, 41.2, 61.5, 42.5, 0, 0.012, 0.004);
    // Long infinity water trough against the south wall with honed travertine coping, submerged corner steps, and luxury pool float
    box(B, 'travP', 50.2, 47.0, 61.55, 47.22, -0.04, 0.5, 0.008); box(B, 'travP', 50.2, 47.22, 50.42, 49.55, -0.04, 0.5, 0.008);
    // Honed travertine entry steps at the West-North corner of the garden pool (submerged below 0.487 m water surface)
    box(B, 'travP', 50.42, 47.22, 50.80, 48.48, 0.22, 0.355, 0.006);
    box(B, 'travP', 50.80, 47.22, 51.18, 48.48, 0.08, 0.220, 0.006);
    box(B, 'travP', 51.18, 47.22, 51.56, 48.48, -0.06, 0.080, 0.006);
    { const w = new THREE.Mesh(FX.plane(11.13, 2.33, 64, 18), M.water); w.rotation.x = -Math.PI / 2; w.position.set(WX(55.985), 0.487, WZ(48.385)); w.receiveShadow = true; scene.add(w); own([w], 'garden'); w.castShadow = false; }
    // Sculpted basalt & cast-bronze fire bowl, river cobble bed, glowing embers, and split oak logs
    thing(55.3, 45.4, () => {
      cyl(B, 'basalt', 55.3, 45.4, -0.04, 0.045, 0.48, 0.50, 48);
      lathe(B, 'bronze', 55.3, 45.4, 0.035, [[0, 0], [0.24, 0], [0.30, 0.09], [0.36, 0.22], [0.64, 0.39], [0.70, 0.44], [0.68, 0.46], [0.58, 0.45], [0.56, 0.42], [0.28, 0.27], [0, 0.27]]);
      cyl(d, 'inkObj', 55.3, 45.4, 0.34, 0.385, 0.55, 0.55, 36);
      for (let i = 0; i < 70; i++) { const a = R() * 6.28, r = Math.sqrt(R()) * 0.49; ball(d, i % 3 ? 'rock' : 'basalt', 55.3 + Math.cos(a) * r, 45.4 + Math.sin(a) * r, 0.392, 0.026 + R() * 0.026, 0.62); }
      for (let i = 0; i < 26; i++) { const a = R() * 6.28, r = Math.sqrt(R()) * 0.32; ball(d, 'ember', 55.3 + Math.cos(a) * r, 45.4 + Math.sin(a) * r, 0.405, 0.016 + R() * 0.016, 0.75); }
      for (let i = 0; i < 5; i++) { R(); R(); R(); } // preserve exact shared R() draw count
      // Six sculpted split oak & bark firewood logs arranged in an authentic campfire pyramid over the glowing ember heart
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.28 + (Rg() - 0.5) * 0.22;
        const rMid = 0.09 + (i % 2) * 0.03, tilt = Math.PI / 2 - (0.34 + (i % 3) * 0.08);
        const lx = 55.3 + Math.cos(a) * rMid, ly = 45.4 + Math.sin(a) * rMid, lz = 0.455 + (i % 2) * 0.028;
        d.add(M.logBark, new THREE.CylinderGeometry(0.038, 0.046, 0.44, 14, 1, false, 0, Math.PI * 1.3), FX.M(WX(lx), lz, WZ(ly), 0, -a, tilt, 1, 1, 1, 'YXZ'));
        d.add(M.logSplit, new THREE.BoxGeometry(0.068, 0.438, 0.024), FX.M(WX(lx), lz, WZ(ly), 0, -a, tilt, 1, 1, 1, 'YXZ'));
        ball(d, 'ember', 55.3 + Math.cos(a) * 0.05, 45.4 + Math.sin(a) * 0.05, 0.435, 0.028, 0.8);
      }
    });
    // Six crossed sheets of lively multi-tongue fire
    {
      const N = 6, pos = [], uvs = [], seed = [], idx = [];
      for (let k = 0; k < N; k++) {
        const a = (k / N) * Math.PI + 0.25, c = Math.cos(a), s2 = Math.sin(a), w = 0.42 + (k % 2) * 0.06, h = 0.64 + (k % 3) * 0.07, b = k * 4;
        [[-1, 0], [1, 0], [-1, 1], [1, 1]].forEach(([sx, sy]) => { pos.push(WX(55.3) + c * w * sx, 0.40 + h * sy, WZ(45.4) + s2 * w * sx); uvs.push(sx * 0.5 + 0.5, sy); seed.push(k * 1.7 + 0.3); });
        idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1)); g.setIndex(idx);
      flameMat = flameShader();
      const fm = new THREE.Mesh(g, flameMat); fm.frustumCulled = false; fm.renderOrder = 4;
      scene.add(fm); own([fm], 'garden'); fm.castShadow = false; fm.receiveShadow = false;
      lamp('garden', 55.3, 45.4, 0.9, 0xffa058, 3.6, 5.6, true);
    }
    [[53.95, 44.75, 1.0], [56.7, 45.9, -1.25]].forEach(([x, y, a]) => lounge(B, x, y, a, 'linenW', 'teak'));
    pillow(d, 'ochre', 53.88, 44.71, 0.34, 0.44, 0.35, 0.16, -0.32, 1.0, 'sham');
    pillow(d, 'rust', 56.77, 45.87, 0.34, 0.44, 0.35, 0.16, -0.32, -1.25, 'sham');
    thing(53.6, 46.4, () => {
      box(B, 'bronze', 53.36, 46.18, 53.84, 46.78, -0.04, 0.035, 0.004);
      for (let j = 0; j < 3; j++) for (let i = 0; i < 4 - j; i++) d.add(M.logBark, new THREE.CylinderGeometry(0.05, 0.055, 0.45, 12), FX.M(WX(53.6), 0.075 + j * 0.095, WZ(46.25 + (i + j * 0.5) * 0.11), 0, 0, Math.PI / 2));
    });
    colliders.push({ id: 'firepit', box: new THREE.Box3(new V3(WX(53.4), 0, WZ(44.2)), new V3(WX(57.2), 0.8, WZ(46.6))) });
    // Two sculpted teak sun-loungers facing the sea beside the water, towels, and a turned stone drum side table with bowl
    [50.9, 52.3].forEach((x) => lounger(d, x, 44.7, 'rust'));
    cyl(B, 'pathStone', 51.98, 45.2, -0.04, 0.4, 0.21, 0.21, 40); cyl(B, 'pathStone', 51.98, 45.2, 0.4, 0.42, 0.22, 0.20, 40);
    lathe(d, 'ceramic', 51.98, 45.2, 0.42, BOWL.map(([r, h]) => [r * 0.78, h * 0.78]));
    [[0.03, 0.02], [-0.035, 0.012], [0.0, -0.04]].forEach(([dx, dy]) => ball(d, 'lemon', 51.98 + dx, 45.2 + dy, 0.48, 0.034, 0.88, 1.08));
    // The old olive stands in a round bed of gravel with a honed stone curb edge, lavender and garden flowers at its foot
    cyl(B, 'pathStone', 46.9, 46.2, -0.04, 0.18, 1.06, 1.06, 72); cyl(B, 'gravel', 46.9, 46.2, 0.18, 0.19, 0.94, 0.94, 64);
    for (let i = 0; i < 9; i++) { const a = i * 0.7 + 0.3, r = 0.56 + R() * 0.16; lavender(d, 46.9 + Math.cos(a) * r, 46.2 + Math.sin(a) * r, 0.18 + R() * 0.05, 0.185); }
    // (18 Oct, Sam: "Make sure this doesn't stay in the scene because I don't know what it is... add some high grass and a nice flower around".
    // The low stone block with the floating tilted yellow cushion at 47.8, 48.97 is removed and replaced with tall feathery ornamental grasses and blooming garden flowers.)
    // Bespoke Burmese teak pergola / gazebo at the west end: four posts with bronze foot shoes, mortised knee braces,
    // twin bearer beams, perimeter fascia, and dense architectural shade louvers over a consistent travP stone terrace
    { const X0 = 41.50, X1 = 45.25, Y0 = 42.55, Y1 = 45.15, Hh = 2.6;
      [[X0, Y0, 1, 1], [X1, Y0, -1, 1], [X0, Y1, 1, -1], [X1, Y1, -1, -1]].forEach(([x, y, sx, sy]) => {
        box(B, 'bronze', x - 0.075, y - 0.075, x + 0.075, y + 0.075, 0, 0.055, 0.004);
        box(B, 'brass', x - 0.072, y - 0.072, x + 0.072, y + 0.072, 0.055, 0.072, 0.002);
        box(B, 'teak', x - 0.068, y - 0.068, x + 0.068, y + 0.068, 0.072, Hh, 0.008);
        box(B, 'bronze', x - 0.074, y - 0.074, x + 0.074, y + 0.074, Hh - 0.04, Hh + 0.01, 0.003);
        // Mortised teak diagonal knee-brace corbels along X and Y
        tleg(B, 'teak', [x + sx * 0.05, y, Hh - 0.42], [x + sx * 0.44, y, Hh + 0.02], 0.024, 0.028);
        tleg(B, 'teak', [x, y + sy * 0.05, Hh - 0.42], [x, y + sy * 0.44, Hh + 0.02], 0.024, 0.028);
      });
      // Main longitudinal bearer beams & transverse tie beams
      [Y0, Y1].forEach((y) => box(B, 'teak', X0 - 0.28, y - 0.058, X1 + 0.28, y + 0.058, Hh, Hh + 0.19, 0.008));
      [X0, X1].forEach((x) => box(B, 'teak', x - 0.052, Y0 - 0.28, x + 0.052, Y1 + 0.28, Hh + 0.02, Hh + 0.18, 0.007));
      // Dense architectural teak shade rafters & cross-purlin battens
      for (let x = X0 - 0.20; x <= X1 + 0.21; x += 0.165) box(B, 'teak', x - 0.022, Y0 - 0.30, x + 0.022, Y1 + 0.30, Hh + 0.18, Hh + 0.30, 0.005);
      [Y0 + 0.50, (Y0 + Y1) / 2, Y1 - 0.50].forEach((y) => box(B, 'teak', X0 - 0.22, y - 0.018, X1 + 0.22, y + 0.018, Hh + 0.29, Hh + 0.325, 0.003));
      // Under it: consistent 80x80 cm Roman travertine terrace floor (travP), sculpted L-shaped teak sofa with piped cushions, low table, lantern
      box(B, 'travP', X0 - 0.20, Y0 - 0.20, X1 + 0.20, Y1 + 0.25, -0.04, 0.01, 0.004);
      thing(43.25, 43.65, () => {
        // Recessed shadow plinth & sculpted Burmese teak L-sofa platform with chamfered back & side rails
        box(B, 'black', 41.76, 42.74, 44.84, 43.47, 0, 0.08, 0.004); box(B, 'black', 41.76, 43.47, 42.49, 44.30, 0, 0.08, 0.004);
        box(B, 'teak', 41.68, 42.66, 44.92, 43.54, 0.08, 0.28, 0.014); box(B, 'teak', 41.68, 43.54, 42.56, 44.38, 0.08, 0.28, 0.014);
        box(B, 'teak', 41.68, 42.66, 44.92, 42.76, 0.28, 0.72, 0.012); box(B, 'teak', 41.68, 42.76, 41.78, 44.38, 0.28, 0.72, 0.012);
        // Tailored piped seat & backrest cushions (using pillowGeo firm cushion loft)
        [42.28, 43.32, 44.36].forEach((cx) => {
          pillow(B, 'linenW', cx, 43.13, 0.28, 1.02, 0.76, 0.16, -Math.PI / 2, 0, true);
          pillow(B, 'linenW', cx, 42.84, 0.42, 1.00, 0.42, 0.14, -0.22, 0, true);
        });
        [43.94].forEach((cy) => {
          pillow(B, 'linenW', 42.15, cy, 0.28, 0.76, 0.80, 0.16, -Math.PI / 2, 0, true);
          pillow(B, 'linenW', 41.86, cy, 0.42, 0.78, 0.42, 0.14, -0.22, Math.PI / 2, true);
        });
        [[42.6, 0], [43.8, 0.1], [44.6, -0.1]].forEach(([x, r], i) => pillow(d, ['ochre', 'sage', 'rust'][i], x, 43.04, 0.44, 0.46, 0.38, 0.14, -0.3, r));
        pillow(d, 'boucle', 42.06, 43.94, 0.44, 0.46, 0.38, 0.14, -0.3, Math.PI / 2);
      });
      thing(43.85, 44.35, () => {
        box(B, 'black', 43.28, 44.06, 44.42, 44.64, 0, 0.06, 0.004);
        box(B, 'pathStone', 43.18, 43.98, 44.52, 44.72, 0.06, 0.32, 0.012);
        lathe(d, 'clay', 43.60, 44.35, 0.32, BOWL.map(([r, h]) => [r * 1.05, h * 1.05]));
        books(d, 44.15, 44.30, 0.32, 2, 0.4);
      });
      lantern(d, 41.85, 45.20);
      lamp('garden', 43.6, 44.0, 1.4, 0xffb86c, 1.8, 6.5);
    }
    // planting: grasses along the south and west walls, tall ornamental fountain grasses, and blooming flowers
    for (let i = 0; i < 40; i++) { const x = 41.6 + R() * 8.2, y = 48.9 + R() * 0.5; if (x > 45.9 && x < 49.7) continue; clump(d, x, y, 0, 0.8 + R() * 0.6, 10, R() < 0.7 ? 'straw' : 'foliageL', 0.5); }
    for (let i = 0; i < 12; i++) clump(d, 41.4 + R() * 0.5, 46.1 + i * 0.28, 0, 0.7 + R() * 0.5, 9, 'straw', 0.5);
    for (let i = 0; i < 26 * 59; i++) R(); // preserve exact shared R() state after removing the purple lavender drift across the lawn & terrace tile
    // (13 Oct & 18 Oct, Sam: "add some high grass and a nice flower around". Tall feathery fountain grasses and colorful Mediterranean
    // flower clusters border the south lawn, the pool edge, and the foot of the broadleaf trees.)
    { const L = FX.rng(1314);
      for (let i = 0; i < 70; i++) { const x = 41.6 + L() * 8.2, y = 48.85 + L() * 0.6; clump(d, x, y, 0, 0.7 + L() * 0.6, 14, L() < 0.75 ? 'straw' : 'foliageL', 0.5, L); }
      for (let i = 0; i < 24; i++) clump(d, 41.35 + L() * 0.6, 46.0 + L() * 3.3, 0, 0.6 + L() * 0.5, 12, 'straw', 0.5, L);
      const Rfl = FX.rng(1818), flCols = ['flwWhite', 'flwViolet', 'flwCoral', 'flwGold'];
      // Tall ornamental fountain grasses with feathery cream-gold plumes along the south and west lawn borders
      [
        [42.1, 49.05, 1.15], [43.0, 49.18, 1.26], [43.9, 49.02, 1.10], [44.9, 49.15, 1.22],
        [46.0, 48.92, 1.18], [46.9, 49.08, 1.30], [47.8, 48.88, 1.26], [48.6, 49.05, 1.24], [49.4, 48.82, 1.16],
        [41.55, 46.8, 1.12], [41.60, 47.8, 1.18], [41.65, 48.6, 1.22], [49.8, 47.6, 1.14]
      ].forEach(([gx, gy, gh]) => tallGrass(d, gx, gy, 0, gh, 26, Rfl));
      // Blooming Mediterranean flower clusters in white, violet, soft rose, and lilac-cream (no yellow overload)
      [
        [42.5, 48.78, 0, 0.36, 'flwWhite'], [43.5, 48.84, 0, 0.38, 'flwViolet'], [44.5, 48.72, 0, 0.35, 'flwCoral'],
        [45.5, 48.78, 0, 0.38, 'flwGold'], [46.5, 48.68, 0, 0.40, 'flwWhite'], [47.4, 48.74, 0, 0.42, 'flwViolet'],
        [48.2, 48.68, 0, 0.38, 'flwCoral'], [49.0, 48.62, 0, 0.40, 'flwWhite'], [49.7, 48.45, 0, 0.36, 'flwViolet'],
        [41.8, 46.5, 0, 0.36, 'flwViolet'], [41.85, 47.4, 0, 0.38, 'flwWhite'], [41.9, 48.2, 0, 0.36, 'flwCoral'],
        [46.34, 46.52, 0.185, 0.25, 'flwWhite'], [47.46, 46.42, 0.185, 0.25, 'flwViolet'], [46.95, 45.58, 0.185, 0.24, 'flwCoral']
      ].forEach(([fx, fy, fz, fr, fc]) => flowerCluster(d, fx, fy, fz, fr, fc || flCols[0], Rfl));
    }
    // Three dark architectural concrete planters with rolled lips, river pebbles, and vibrant variegated agaves along the house terrace
    [[42.6, 41.85], [50.9, 41.85], [58.6, 41.85]].forEach(([x, y], idx) => {
      cyl(B, 'conc', x, y, 0.02, 0.58, 0.33, 0.41, 36);
      B.add(M.conc, new THREE.TorusGeometry(0.395, 0.022, 14, 36), FX.M(WX(x), 0.58, WZ(y), Math.PI / 2, 0, 0));
      cyl(B, 'gravel', x, y, 0.54, 0.565, 0.36, 0.36, 28);
      clump(d, x, y, 0.55, 0.85, 16, idx % 2 ? 'agave2' : 'agave', 0.92, Rg);
    });
    // Behind you as you step out: a Burmese teak outdoor dining table and benches under the east wall
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
