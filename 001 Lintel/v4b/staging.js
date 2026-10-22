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
    bk1: D(P({ color: 0xe9e2d4, roughness: 0.8 })), bk2: D(P({ color: 0x2c2a28, roughness: 0.8 })), bk3: D(P({ color: 0xb8452a, roughness: 0.8 })), bk4: D(P({ color: 0x8c8676, roughness: 0.8 })),
  });

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
  const mark = (g, c) => { const n = g.attributes.position.count, col = new Float32Array(n * 3); for (let i = 0; i < n; i++) { col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = 2 + Math.min(8, Math.max(0, c[2] || 0)); } g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g; };
  const tagged = (bt) => {
    const add0 = bt.add.bind(bt);
    bt.add = (mat, geo, m) => {
      const g = geo.index ? geo.toNonIndexed() : geo.clone();
      if (!g.attributes.normal) g.computeVertexNormals();
      if (m) g.applyMatrix4(m);
      let c = THING;
      if (!c) { g.computeBoundingBox(); const b = g.boundingBox; if (Math.max(b.max.x - b.min.x, b.max.z - b.min.z) <= 6.5) c = [(b.min.x + b.max.x) / 2, (b.min.z + b.max.z) / 2, (b.min.y + b.max.y) / 2]; }
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
  const R = FX.rng(2026);
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
  const books = (bt, x, y, z, n, rot) => thing(x, y, () => { let zz = z; for (let i = 0; i < n; i++) { const h = 0.028 + R() * 0.02; rbox(bt, ['bk1', 'bk2', 'bk3', 'bk4'][(R() * 4) | 0], x, y, zz, zz + h, 0.3 - i * 0.02, 0.22 - i * 0.015, 0.003, (rot || 0) + (R() - 0.5) * 0.3); zz += h; } return zz; });
  const cushion = (bt, mat, cx, cy, z, w, h, d, rot, tilt) => rbox(bt, mat, cx, cy, z, z + h, w, d, Math.min(w, h, d) * 0.42, rot, tilt);
  // a pendant: a thin rod from the ceiling to a glowing globe, or a brass dome with a glowing disc under it
  const pendant = (bt, x, y, zTop, z, r, kind) => thing(x, y, () => {
    cyl(bt, 'black', x, y, z + r * 0.8, zTop, 0.005, 0.005, 6);
    if (kind === 'dome') {
      bt.add(M.brass, new THREE.SphereGeometry(r, 28, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), FX.M(WX(x), z, WZ(y)));
      cyl(bt, 'glow', x, y, z - 0.012, z, r * 0.82, r * 0.82, 24);
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
  // tall grass or an agave: narrow cones fanning out
  const clump = (bt, x, y, z, h, n, mat, spread) => thing(x, y, () => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + R(), lean = (spread || 0.5) * (0.3 + R() * 0.7), hh = h * (0.6 + R() * 0.5);
      bt.add(M[mat], new THREE.ConeGeometry(0.03 + (spread || 0.5) * 0.06, hh, 5), FX.M(WX(x + Math.cos(a) * lean * hh * 0.5), z + hh * 0.5 * Math.cos(lean), WZ(y + Math.sin(a) * lean * hh * 0.5), Math.sin(a) * lean, 0, -Math.cos(a) * lean));
    }
  });
  // a curtain gathered into folds along a wall line (axis 'v': along y at x = c, 'h': along x at y = c)
  const curtain = (zone, axis, c, a, b, z0, z1) => {
    const n = Math.max(8, Math.round((b - a) / 0.05)), g = new THREE.PlaneGeometry(b - a, z1 - z0, n, 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const u = p.getX(i); p.setZ(i, Math.sin(u * 34) * 0.045 + Math.sin(u * 13 + 1) * 0.02); }
    g.computeVertexNormals();
    dec(zone).add(M.sheer, g, FX.M(WX(axis === 'v' ? c : (a + b) / 2), (z0 + z1) / 2, WZ(axis === 'v' ? (a + b) / 2 : c), 0, axis === 'v' ? Math.PI / 2 : 0, 0));
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
  const lavender = (bt, x, y, r) => thing(x, y, () => { ball(bt, 'sageLeaf', x, y, r * 0.5, r, 0.62);
    for (let i = 0; i < 14; i++) { const a = R() * 6.28, q = Math.sqrt(R()) * r * 0.85; ball(bt, 'lav', x + Math.cos(a) * q, y + Math.sin(a) * q, r * (0.8 + R() * 0.32), r * (0.1 + R() * 0.08), 1.5); }
    clump(bt, x, y, r * 0.5, r * 1.25, 5, 'lav', 0.7); });
  const stool = (bt, x, y) => thing(x, y, () => { cyl(bt, 'leather', x, y, 0.66, 0.72, 0.19, 0.19, 24); cyl(bt, 'black', x, y, 0.02, 0.66, 0.018, 0.018, 8); cyl(bt, 'black', x, y, 0, 0.02, 0.2, 0.2, 24); cyl(bt, 'brass', x, y, 0.22, 0.235, 0.16, 0.16, 20); });

  /* ---------- art ---------------------------------------------------------------- */
  const PAL = ['#ece4d6', '#1f1b18', '#b8452a', '#c9a15a', '#8b8674', '#d9cdb8', '#3d3a33', '#6f7a5a', '#f4efe6'];
  const artTex = (kind, w, h, seed) => FX.canvasTex(w, h, (g) => {
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
    else if (kind === 'dots') { for (let k = 0; k < 60; k++) { g.fillStyle = k % 9 ? PAL[1] : PAL[2]; g.beginPath(); g.arc(m + W * (0.08 + r() * 0.84), m + H * (0.06 + r() * 0.88), W * (0.008 + r() * 0.02), 0, 6.3); g.fill(); } }
    else if (kind === 'ochre') { g.fillStyle = PAL[3]; g.fillRect(m + W * 0.1, m + H * 0.08, W * 0.8, H * 0.4); g.fillStyle = PAL[5]; g.fillRect(m + W * 0.1, m + H * 0.52, W * 0.8, H * 0.14); g.fillStyle = PAL[7]; g.fillRect(m + W * 0.1, m + H * 0.7, W * 0.8, H * 0.22); }
    else { g.fillStyle = PAL[1]; g.fillRect(m + W * 0.1, m + H * 0.08, W * 0.8, H * 0.84); g.fillStyle = PAL[2]; g.beginPath(); g.arc(m + W * 0.5, m + H * 0.5, W * 0.16, 0, 6.3); g.fill(); }
    // canvas tooth
    g.globalAlpha = 0.07; for (let i = 0; i < 1400; i++) { g.fillStyle = i % 2 ? '#fff' : '#000'; g.fillRect(r() * w, r() * h, 2, 9); }
    g.restore();
  });
  // a framed work on a wall. wall: which way the wall faces you from ('E' = on an east wall, facing west)
  const art = (zone, kind, wall, u, c, z, w, h, frame, seed) => thing(wall === 'E' || wall === 'W' ? c : u, wall === 'E' || wall === 'W' ? u : c, () => {
    const px = Math.round(256 * Math.min(2.4, Math.max(1, w))), tex = artTex(kind, px, Math.round((px * h) / w), seed);
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
  const pillowGeo = (w, h, t) => {
    const g = new THREE.BoxGeometry(w, h, t, 14, 14, 2), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / (w / 2), v = p.getY(i) / (h / 2);
      // full in the middle, thinning all the way to the seam, corners drawn in (at 0.32 it stayed a slab to its edge)
      const f = Math.pow(Math.max(0, (1 - u * u) * (1 - v * v)), 0.5), k = 1 - 0.13 * u * u * v * v;
      p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * (0.12 + 0.88 * f));
    }
    g.computeVertexNormals();
    return FX.uvMetres(g);
  };
  // z is what it rests on, lean tips it back toward the north (0 stands, -1.4 lies almost flat), rot turns it
  const pillow = (bt, mat, cx, cy, z, w, h, t, lean, rot) =>
    bt.add(M[mat], pillowGeo(w, h, t), FX.M(WX(cx), z + (h / 2) * Math.cos(lean || 0) + (t / 2) * Math.abs(Math.sin(lean || 0)), WZ(cy), lean || 0, rot || 0, 0, 1, 1, 1, 'YXZ'));
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
  // A lamp is a place where light comes from, not a light of its own: scene.js keeps four real lights and moves them
  // to whichever lamps are near the camera (see lampPool). far: from how far off it still matters (metres).
  const lamp = (zone, x, y, z, color, k, dist, fire, far) => lights.push({ l: { intensity: 0 }, zone, k, fire: fire ? 'bowl' : null, x: WX(x), y: z, z: WZ(y), color, dist: dist || 7, decay: 1.7, far });

  /* ================= the front of the house ======================================= */
  {
    const d = dec('ext');
    // oak fins on the wall west of the door, a bench under the canopy
    for (let i = 0; i < 11; i++) { box(B, 'oakFin', 11.5 + i * 0.2, 26.2, 11.56 + i * 0.2, 26.34, 0.02, 4.2, 0.004); A.cap(11.5 + i * 0.2, 26.2, 11.56 + i * 0.2, 26.34, 0.02, 4.2); }   // each fin a solid tick in the cut, like a wall
    box(B, 'travBlock', 11.5, 26.6, 13.5, 27.1, 0, 0.44, 0.012);
    cushion(d, 'boucle', 12.0, 26.85, 0.44, 0.7, 0.09, 0.44, 0);
    // two slim wall lights
    [13.45, 16.55].forEach((x) => { box(B, 'frame', x - 0.03, 26.2, x + 0.03, 26.27, 1.5, 2.3, 0.004); box(d, 'glow', x - 0.012, 26.268, x + 0.012, 26.276, 1.56, 2.24, 0.001); });
    // a reflecting pool along the east side of the path, stepping stones beside it
    box(B, 'conc', 17.3, 26.4, 19.0, 33.4, -0.2, 0.06, 0.01);
    { const w = new THREE.Mesh(FX.plane(1.5, 6.8), M.water); w.rotation.x = -Math.PI / 2; w.position.set(WX(18.15), 0.065, WZ(29.9)); w.receiveShadow = true; scene.add(w); own([w], 'ext'); w.castShadow = false; }
    // planting west of the path: grasses and three boulders
    [[12.2, 29.6, 0.5, 3], [11.4, 31.0, 0.34, 5], [12.6, 32.3, 0.42, 9]].forEach(([x, y, r, sd]) => d.add(M.drystone, FX.boulder(r, sd, 0.5), FX.M(WX(x), r * 0.35, WZ(y), 0, sd, 0)));
    for (let i = 0; i < 16; i++) { const x = 10.6 + R() * 2.5, y = 29.0 + R() * 4.6; clump(d, x, y, 0, 0.7 + R() * 0.5, 9, R() < 0.6 ? 'straw' : 'foliageL', 0.55); }
    // an olive in a stone planter on each side
    [[10.3, 27.7, 31], [20.2, 27.9, 47]].forEach(([x, y, sd]) => {
      lathe(B, 'travBlock', x, y, 0, [[0, 0], [0.62, 0], [0.78, 0.5], [0.8, 0.66], [0.72, 0.66], [0, 0.6]]);
      tree(olive(A.extBark, M.barkFar, x, y, 0.58, sd, A.LOW ? 500 : 1100, 0.6, null, 0.6), 'ext'); A.crowns.push([x, y, 0.58, 0.6]);
    });
    // The arrival court. From above it was "a blank slab" of gravel, and the garage an empty box. Now bands of the
    // path's stone cross the gravel every 2.6 m, three young olives stand in stone rings east of the path, and three
    // cars are in the garage (decor: on the drawing they are the plan's own car symbols).
    // (flat sheets of paving, level with the path. As slabs with bevelled edges they stood on the plan as rows of faint ticks.)
    [34.0, 36.6, 39.2, 41.6].forEach((y) => { A.ground(M.trav, -0.6, y - 0.22, 13.3, y + 0.22, 0.0); A.ground(M.trav, 17.2, y - 0.22, 22.7, y + 0.22, 0.0); });
    [[20.5, 35.3, 61], [21.3, 37.95, 67], [20.2, 40.45, 73]].forEach(([x, y, sd]) => {
      B.add(M.travBlock, new THREE.CylinderGeometry(0.85, 0.85, 0.16, 44, 1, true), FX.M(WX(x), 0.0, WZ(y))); B.add(M.travBlock, new THREE.RingGeometry(0.66, 0.85, 44), FX.M(WX(x), 0.08, WZ(y), -Math.PI / 2, 0, 0));
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
    // the house's name by the door
    // (in the page's display face, so stencil letters when the stencil type is on)
    const face = (getComputedStyle(document.documentElement).getPropertyValue('--display') || '').split(',')[0].trim().replace(/['"]/g, '') || 'Geist Mono';
    if (document.fonts) await Promise.race([document.fonts.load(`400 92px "${face}"`).catch(() => null), new Promise((r) => setTimeout(r, 2000))]);
    const nameTex = FX.canvasTex(1024, 160, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = `400 86px "${face}", "Geist Mono"`; g.letterSpacing = '22px'; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillText('CASA SERRA', w / 2, h / 2 + 4, w - 20); });
    const nm = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.3), drawable(new THREE.MeshStandardMaterial({ map: nameTex, alphaTest: 0.5, color: 0x4a3626, metalness: 0.85, roughness: 0.4 }), 'none', { side: THREE.FrontSide, room: 'ext' }));
    nm.position.set(WX(17.95), 1.55, WZ(26.215)); scene.add(nm); own([nm], 'ext'); nm.castShadow = false;
  }

  /* ================= entrance ======================================================= */
  {
    const d = dec('entrance');
    box(B, 'travBlock', 11.25, 19.3, 11.85, 23.7, 0, 0.86, 0.01);                       // the stone console
    vase(d, 'ceramic', 11.55, 20.1, 0.86, 1.25, URN); sprigs(d, 11.55, 20.1, 1.6, 1.25, 9);
    const top = books(d, 11.55, 21.5, 0.86, 3, 1.5); ball(d, 'brass', 11.55, 21.5, top + 0.07, 0.07);
    lathe(d, 'inkObj', 11.55, 22.9, 0.86, BOWL.map(([r, h]) => [r * 1.5, h * 1.5]));
    cyl(d, 'glowSoft', 11.5, 23.4, 0.9, 1.22, 0.08, 0.08, 20); cyl(d, 'brass', 11.5, 23.4, 0.86, 0.9, 0.1, 0.1, 20);
    // a tall urn with dry branches by the door
    vase(B, 'inkObj', 12.5, 24.9, 0, 1.9, URN); branches(d, 12.5, 24.9, 1.2, 1.9, 8);
    // the runner, a bench under a round mirror
    box(d, 'wool', 13.95, 18.6, 16.55, 24.9, 0, 0.018, 0.006);
    thing(18.56, 23.5, () => {
    box(B, 'walnut', 18.3, 22.5, 18.82, 24.5, 0.34, 0.42, 0.01); box(B, 'black', 18.36, 22.6, 18.4, 22.64, 0, 0.34, 0.004); box(B, 'black', 18.72, 22.6, 18.76, 22.64, 0, 0.34, 0.004);
    box(B, 'black', 18.36, 24.36, 18.4, 24.4, 0, 0.34, 0.004); box(B, 'black', 18.72, 24.36, 18.76, 24.4, 0, 0.34, 0.004);
    cushion(d, 'leather', 18.56, 23.5, 0.42, 0.44, 0.07, 1.9, 0);
    });
    d.add(M.brass, new THREE.CylinderGeometry(0.82, 0.82, 0.03, 48), FX.M(WX(18.84), 2.0, WZ(23.5), 0, 0, Math.PI / 2));
    d.add(M.glassMirror, new THREE.CylinderGeometry(0.77, 0.77, 0.034, 48), FX.M(WX(18.838), 2.0, WZ(23.5), 0, 0, Math.PI / 2));
    // five globes hanging in the tall volume
    [[14.7, 20.6, 3.3, 0.16], [15.5, 20.2, 2.75, 0.13], [15.9, 21.1, 3.5, 0.11], [15.0, 21.4, 2.5, 0.15], [15.35, 20.75, 3.05, 0.1]].forEach(([x, y, z, r]) => pendant(d, x, y, 4.8, z, r));
    lamp('entrance', 15.2, 20.8, 3.0, 0xffd6a0, 4.5, 9);
    art('entrance', 'field', 'W', 21.5, 11.13, 2.75, 2.2, 2.8, 'black', 3);
  }

  /* ================= living ========================================================= */
  {
    const d = dec('living');
    // the pit's seating: deep seats, loose back cushions against the pit's edge, scatter cushions
    thing(15.0, 12.7, () => {
    box(B, 'boucle', 12.1, 10.6, 17.9, 11.5, -0.45, -0.03, 0.07); box(B, 'boucle', 12.1, 11.5, 13.0, 14.9, -0.45, -0.03, 0.07); box(B, 'boucle', 12.1, 14.1, 16.2, 14.9, -0.45, -0.03, 0.07);
    for (let i = 0; i < 6; i++) cushion(d, 'boucle', 12.7 + i * 0.93, 10.76, -0.03, 0.86, 0.42, 0.2, 0, -0.14);
    for (let i = 0; i < 3; i++) cushion(d, 'boucle', 12.26, 12.1 + i * 0.93, -0.03, 0.2, 0.42, 0.86, 0, 0);
    for (let i = 0; i < 4; i++) cushion(d, 'boucle', 13.5 + i * 0.86, 14.74, -0.03, 0.8, 0.42, 0.2, 0, 0.14);
    [['ochre', 13.3, 11.0, 0.4], ['charcoal', 14.6, 11.05, -0.3], ['rust', 16.9, 11.0, 0.5], ['sage', 12.5, 13.6, 1.2], ['charcoal', 12.55, 12.4, 1.9], ['ochre', 15.3, 14.5, 2.8], ['rust', 13.9, 14.45, 3.3]]
      .forEach(([m, x, y, a]) => cushion(d, m, x, y, 0.0, 0.42, 0.14, 0.42, a, 0.9));
    rbox(d, 'ochre', 17.2, 11.05, -0.03, 0.0, 0.9, 0.7, 0.012, 0.2);                       // a throw over the seat
    });
    thing(15.3, 12.85, () => {
    box(B, 'travBlock', 14.2, 12.3, 16.4, 13.4, -0.45, -0.1, 0.012);                       // the low table
    box(d, 'walnut', 14.4, 12.45, 15.1, 12.95, -0.1, -0.075, 0.006);
    lathe(d, 'ceramic', 14.75, 12.7, -0.075, BOWL); const tb = books(d, 15.7, 12.95, -0.1, 3, 0.3); ball(d, 'inkObj', 15.7, 12.95, tb + 0.06, 0.06);
    vase(d, 'inkObj', 16.05, 12.6, -0.1, 0.8); sprigs(d, 16.05, 12.6, 0.36, 0.7, 5);
    });
    box(d, 'wool', 13.2, 11.7, 17.6, 13.95, -0.45, -0.425, 0.006);
    // the fireplace: board-marked concrete, a hearth, logs, a canvas leaning on the hearth
    thing(9.6, 12.7, () => {
    box(B, 'concreteIn', 9.13, 10.2, 9.95, 15.2, 0, 3.92, 0.01); A.cap(9.13, 10.2, 9.95, 15.2, 0, 3.92); colliders.push({ id: 'fire', box: new THREE.Box3(new V3(WX(9.13), 0, WZ(10.2)), new V3(WX(9.95), 3.92, WZ(15.2))) });
    box(d, 'dark', 9.9, 11.7, 9.98, 13.7, 0.3, 1.05, 0.005); box(d, 'fire', 9.86, 11.9, 9.9, 13.5, 0.36, 0.7, 0.005);      // (decor: two plates a hand thick were a dashed double line on the plan)
    box(B, 'concreteIn', 9.95, 10.9, 10.9, 14.5, 0, 0.32, 0.01);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 5 - j; i++) d.add(M.walnut, new THREE.CylinderGeometry(0.055, 0.06, 0.5, 9), FX.M(WX(10.3), 0.38 + j * 0.105, WZ(13.95 + (i + j * 0.5) * 0.115), 0, 0, Math.PI / 2));
    });
    { const tex = artTex('horizon', 512, 640, 8), m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.5), drawable(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, envMapIntensity: 0.35 }), 'none'));
      m.rotation.set(0, Math.PI / 2, 0); m.rotateX(-0.09); m.position.set(WX(10.12), 1.07, WZ(11.35)); scene.add(m); own([m], 'living'); }
    // two lounge chairs and a round table by the glass
    lounge(B, 19.7, 9.5, -Math.PI / 2 - 0.25, 'leather'); lounge(B, 19.7, 11.6, -Math.PI / 2 + 0.25, 'leather');
    cyl(B, 'travBlock', 20.0, 10.55, 0, 0.46, 0.22, 0.26, 28); const st = books(d, 20.0, 10.55, 0.46, 2, 0.6); cyl(d, 'glowSoft', 20.02, 10.5, st, st + 0.16, 0.05, 0.05, 14);
    // an arc lamp reaching over the pit
    thing(11.5, 15.6, () => {
    cyl(B, 'travBlock', 11.5, 15.6, 0, 0.14, 0.22, 0.22, 24);
    { const pts = []; for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push([11.5 + t * 2.6, 15.6 - t * 1.9, 0.14 + Math.sin(t * Math.PI * 0.62) * 2.5]); } for (let i = 0; i < 14; i++) rod(B, 'brass', pts[i], pts[i + 1], 0.012);
      const e = pts[14]; d.add(M.brass, new THREE.SphereGeometry(0.24, 28, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), FX.M(WX(e[0]), e[2] - 0.12, WZ(e[1]))); cyl(d, 'glow', e[0], e[1], e[2] - 0.135, e[2] - 0.12, 0.2, 0.2, 24);
      lamp('living', e[0], e[1], e[2] - 0.4, 0xffd09a, 3.2, 7, false, 30); }
    });
    // the olive in its stone planter, curtains gathered at the end of the glass
    B.add(M.travBlock, new THREE.CylinderGeometry(0.56, 0.46, 0.72, 40), FX.M(WX(10.55), 0.36, WZ(15.75)));
    B.add(M.dark, new THREE.CylinderGeometry(0.5, 0.5, 0.02, 40), FX.M(WX(10.55), 0.71, WZ(15.75)));
    curtain('living', 'v', 20.72, 15.6, 16.6, 0.02, 4.42); curtain('living', 'v', 20.72, 8.3, 9.0, 0.02, 4.42);
    art('living', 'sun', 'N', 10.05, 8.13, 2.2, 1.4, 1.9, 'black', 5);
  }

  /* ================= kitchen and dining =============================================== */
  {
    const d = dec('kitchen');
    thing(14.0, 4.0, () => {
    box(B, 'travBlock', 11.5, 3.4, 16.5, 4.6, 0, 0.92, 0.01); colliders.push({ id: 'island', box: new THREE.Box3(new V3(WX(11.5), 0, WZ(3.4)), new V3(WX(16.5), 0.92, WZ(4.6))) });
    box(d, 'black', 12.3, 3.7, 13.1, 4.2, 0.9, 0.925, 0.004);                              // the sink
    rod(d, 'brass', [12.7, 3.62, 0.92], [12.7, 3.62, 1.3], 0.012); rod(d, 'brass', [12.7, 3.62, 1.3], [12.7, 3.86, 1.3], 0.012); rod(d, 'brass', [12.7, 3.86, 1.3], [12.7, 3.86, 1.22], 0.012);
    lathe(d, 'ceramic', 14.6, 4.0, 0.92, BOWL.map(([r, h]) => [r * 1.5, h * 1.5])); for (let i = 0; i < 7; i++) ball(d, 'lemon', 14.6 + (R() - 0.5) * 0.3, 4.0 + (R() - 0.5) * 0.3, 1.02 + R() * 0.05, 0.045, 1.15);
    rbox(d, 'walnut', 15.75, 3.75, 0.92, 0.95, 0.5, 0.32, 0.006, 0.3); rbox(d, 'walnut', 15.9, 3.82, 0.95, 0.975, 0.4, 0.26, 0.006, -0.2);
    vase(d, 'inkObj', 16.15, 4.25, 0.92, 0.7); sprigs(d, 16.15, 4.25, 1.24, 0.6, 4);
    });
    [12.4, 13.5, 14.6, 15.7].forEach((x) => stool(B, x, 4.98));
    [12.6, 14.0, 15.4].forEach((x) => pendant(d, x, 4.0, 3.6, 1.72, 0.1, 'drum'));
    // the cabinet wall: oak fronts, a dark oven, a lit niche
    thing(9.44, 2.5, () => {
    box(B, 'oak', 9.13, 0.4, 9.75, 4.6, 0, 2.6, 0.01); colliders.push({ id: 'tall', box: new THREE.Box3(new V3(WX(9.13), 0, WZ(0.4)), new V3(WX(9.75), 2.6, WZ(4.6))) });
    for (let i = 1; i < 7; i++) box(d, 'black', 9.748, 0.4 + i * 0.6 - 0.004, 9.754, 0.4 + i * 0.6 + 0.004, 0.02, 2.58, 0.001);
    box(d, 'black', 9.75, 2.24, 9.762, 2.96, 0.95, 1.95, 0.003); box(d, 'brass', 9.762, 2.3, 9.775, 2.9, 1.82, 1.84, 0.002);
    box(d, 'black', 9.75, 3.44, 9.76, 4.56, 1.1, 1.75, 0.003); box(d, 'glow', 9.76, 3.46, 9.764, 4.54, 1.72, 1.74, 0.001);
    vase(d, 'ceramic', 9.86, 3.7, 1.12, 0.45); lathe(d, 'clay', 9.86, 4.1, 1.12, BOWL.map(([r, h]) => [r * 0.7, h * 0.7]));
    });
    // the table for fourteen
    thing(20.2, 4.0, () => { box(B, 'walnut', 17.2, 3.4, 23.2, 4.6, 0.7, 0.76, 0.006); box(B, 'walnut', 17.5, 3.6, 17.62, 4.4, 0, 0.7, 0.005); box(B, 'walnut', 22.78, 3.6, 22.9, 4.4, 0, 0.7, 0.005); });
    for (let i = 0; i < 7; i++) {
      const x = 17.55 + i * 0.84;
      [[2.8, 3.25, 2.72, 2.8], [4.75, 5.2, 5.2, 5.28]].forEach(([s0, s1, b0, b1], k) => thing(x + 0.25, (s0 + s1) / 2, () => {
        box(B, 'leather', x, s0, x + 0.5, s1, 0.4, 0.47, 0.03); box(B, 'walnut', x, b0, x + 0.5, b1, 0.4, 0.86, 0.02);
        [[x + 0.03, k ? 4.77 : 2.82], [x + 0.43, k ? 4.77 : 2.82], [x + 0.03, k ? 5.13 : 3.18], [x + 0.43, k ? 5.13 : 3.18]].forEach(([lx, ly]) => box(B, 'black', lx, ly, lx + 0.035, ly + 0.035, 0, 0.4, 0.004));
      }));
    }
    box(d, 'linenW', 17.9, 3.82, 22.5, 4.18, 0.76, 0.766, 0.002);                          // a runner
    [[18.6, 0.75, 'ceramic'], [20.2, 1.0, 'inkObj'], [21.8, 0.7, 'clay']].forEach(([x, s, m]) => { vase(d, m, x, 4.0, 0.766, s); sprigs(d, x, 4.0, 0.766 + 0.5 * s, 0.6 * s + 0.2, 5); });
    [19.4, 21.0].forEach((x) => lathe(d, 'ceramic', x, 4.0, 0.766, BOWL));
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
    // a stone ring to sit on around the olive, gravel inside it
    B.add(M.travBlock, new THREE.CylinderGeometry(2.5, 2.5, 0.45, 72, 1, true), FX.M(WX(30), 0.225, WZ(18)));
    B.add(M.travBlock, new THREE.RingGeometry(1.95, 2.5, 72), FX.M(WX(30), 0.45, WZ(18), -Math.PI / 2, 0, 0));
    B.add(M.travBlock, new THREE.CylinderGeometry(1.95, 1.95, 0.45, 72, 1, true), FX.M(WX(30), 0.225, WZ(18)));
    B.add(M.gravel, new THREE.CircleGeometry(1.95, 48), FX.M(WX(30), 0.3, WZ(18), -Math.PI / 2, 0, 0));
    colliders.push({ id: 'ring', box: new THREE.Box3(new V3(WX(27.5), 0, WZ(15.5)), new V3(WX(32.5), 0.45, WZ(20.5))) });
    // loungers by the pool, each with a towel, a table between each pair, two parasols
    [24.6, 26.2, 34.4, 36].forEach((x) => thing(x + 0.375, 25.2, () => { box(B, 'walnut', x, 24.2, x + 0.75, 26.2, 0.12, 0.28, 0.03); box(B, 'black', x + 0.05, 24.3, x + 0.7, 26.1, 0, 0.12, 0.01); box(B, 'linenW', x + 0.04, 24.25, x + 0.71, 26.15, 0.28, 0.38, 0.04);
      rbox(B, 'linenW', x + 0.375, 24.45, 0.38, 0.46, 0.67, 0.6, 0.04, 0, 0.5); rbox(d, 'sage', x + 0.375, 25.9, 0.38, 0.43, 0.6, 0.34, 0.02, 0); }));
    [25.78, 35.58].forEach((x) => thing(x, 25.2, () => { cyl(B, 'travBlock', x, 24.7, 0, 0.36, 0.17, 0.2, 20); lathe(d, 'ceramic', x, 24.7, 0.36, BOWL.map(([r, h]) => [r * 0.6, h * 0.6]));
      cyl(B, 'walnut', x, 25.6, 0, 2.5, 0.025, 0.025, 10); d.add(M.linenW, new THREE.ConeGeometry(1.6, 0.42, 10, 1, true), FX.M(WX(x), 2.6, WZ(25.6))); }));
    // an outdoor lounge on the north side, clear of the way from the kitchen to the gallery door
    thing(29.0, 10.6, () => {
    box(B, 'walnut', 26.2, 9.0, 30.2, 10.0, 0.08, 0.3, 0.02); box(B, 'linenW', 26.25, 9.05, 30.15, 9.95, 0.3, 0.44, 0.05); box(B, 'walnut', 26.2, 8.86, 30.2, 9.02, 0.08, 0.78, 0.02);
    box(B, 'walnut', 30.4, 10.2, 31.4, 13.0, 0.08, 0.3, 0.02); box(B, 'linenW', 30.45, 10.25, 31.35, 12.95, 0.3, 0.44, 0.05); box(B, 'walnut', 31.38, 10.2, 31.54, 13.0, 0.08, 0.78, 0.02);
    for (let i = 0; i < 4; i++) cushion(d, i % 2 ? 'sage' : 'linenW', 26.7 + i * 1.0, 9.2, 0.44, 0.8, 0.4, 0.18, 0, -0.15);
    for (let i = 0; i < 3; i++) cushion(d, i % 2 ? 'ochre' : 'linenW', 31.2, 10.7 + i * 0.9, 0.44, 0.18, 0.4, 0.8, 0, 0);
    });
    thing(28.3, 11.6, () => {
    box(B, 'travBlock', 27.4, 11.0, 29.2, 12.2, 0, 0.3, 0.012); lathe(d, 'inkObj', 28.3, 11.6, 0.3, BOWL.map(([r, h]) => [r * 1.4, h * 1.4])); cyl(d, 'glowSoft', 27.8, 11.4, 0.3, 0.48, 0.06, 0.06, 14);
    });
    // big planters with agaves and grasses along the gallery glass and by the kitchen
    [[39.9, 15.5, 'a'], [39.9, 21.5, 'g'], [39.9, 26.0, 'a'], [22.0, 13.5, 'g'], [22.0, 21.0, 'a']].forEach(([x, y, k]) => {
      cyl(B, 'conc', x, y, 0, 0.7, 0.42, 0.5, 28);
      if (k === 'a') clump(d, x, y, 0.66, 0.85, 14, 'foliage', 0.9); else clump(d, x, y, 0.66, 1.3, 26, 'straw', 0.45);
    });
    // lanterns at the corners of the pool
    [[22.9, 26.6], [40.1, 26.6], [22.9, 30.4], [40.1, 30.4]].forEach(([x, y]) => { box(B, 'black', x - 0.09, y - 0.09, x + 0.09, y + 0.09, 0, 0.34, 0.006); cyl(d, 'glowSoft', x, y, 0.05, 0.28, 0.045, 0.045, 10); });
  }

  /* ================= gallery ======================================================== */
  {
    const d = dec('gallery');
    // a hang along the solid wall: big, small, pair, big
    // (between the small plan and the arcs the wall is left bare for three metres: that is where the room's title stands at the stop)
    [['dark', 10.9, 2.0, 2.3, 3.0, 'black'], ['plan', 13.15, 1.6, 1.0, 1.3, 'walnut'], ['arcs', 18.0, 1.9, 1.5, 2.0, 'black'], ['grid', 20.3, 1.9, 1.7, 2.3, 'walnut'],
      ['stroke', 22.4, 1.8, 1.1, 1.5, 'black'], ['ochre', 23.8, 1.8, 1.1, 1.5, 'black'], ['horizon', 26.6, 1.95, 2.6, 2.0, 'walnut'], ['dots', 29.4, 1.8, 1.2, 1.6, 'black'], ['sun', 30.9, 1.8, 0.9, 1.2, 'walnut']]
      .forEach(([k, y, z, w, h, f], i) => art('gallery', k, 'E', y, 43.77, z, w, h, f, 20 + i));
    // a track of small spots on the ceiling, aimed at the wall
    box(d, 'black', 43.0, 9.0, 43.03, 31.0, 3.56, 3.58, 0.002);
    for (let y = 10.2; y < 31; y += 1.7) { d.add(M.black, new THREE.CylinderGeometry(0.035, 0.04, 0.12, 12), FX.M(WX(43.05), 3.5, WZ(y), 0, 0, -0.5)); cyl(d, 'glow', 43.085, y, 3.435, 3.445, 0.028, 0.028, 10); }
    // benches
    [[17.4, 20.6], [26.0, 28.4]].forEach(([y0, y1]) => thing(43.4, (y0 + y1) / 2, () => { box(B, 'walnut', 43.15, y0, 43.65, y1, 0.36, 0.44, 0.012); box(B, 'black', 43.2, y0 + 0.15, 43.6, y0 + 0.21, 0, 0.36, 0.004); box(B, 'black', 43.2, y1 - 0.21, 43.6, y1 - 0.15, 0, 0.36, 0.004); }));
    // sculpture on plinths along the glass
    plinth(B, 41.62, 15.6, 0.95); [0.2, 0.15, 0.11].reduce((z, r) => { ball(B, 'bronze', 41.62, 15.6, z + r, r); return z + r * 1.86; }, 0.95);
    plinth(B, 41.62, 18.9, 0.8); B.add(M.drystone, FX.boulder(0.34, 12, 0.2), FX.M(WX(41.62), 1.12, WZ(18.9), 0.2, 1.1, 0, 0.8, 1.5, 0.8));
    plinth(B, 41.62, 24.28, 0.92); B.add(M.bronze, new THREE.TorusGeometry(0.3, 0.06, 18, 54), FX.M(WX(41.62), 1.28, WZ(24.28), 0, 0.5, 0));
    plinth(B, 41.62, 29.2, 0.7); [[0.17, 0.08], [0.12, 0.12], [0.19, 0.07], [0.1, 0.16], [0.15, 0.07], [0.08, 0.2]].reduce((z, [r, h], i) => { cyl(B, i % 2 ? 'travBlock' : 'inkObj', 41.62, 29.2, z, z + h, r, r, 28); return z + h; }, 0.7);
  }

  /* ================= master suite =====================================================
     Sam, 9 Oct: "a four... make it premium, a high-end bedroom. Right now it feels there's stuff floating."
     So everything now stands on something. The headboard runs from the floor to a lit ledge, the
     nightstands stand on the floor and carry lamps (the hanging globes and the hung light bar are gone),
     the bed has a base down to the floor, and the bedding is made of soft shapes, not blocks. */
  {
    const d = dec('bedroom');
    // the headboard: ten wide leather channels from the floor up to a walnut ledge, a line of light under the ledge
    thing(46.2, 32.3, () => {
      for (let i = 0; i < 10; i++) box(B, 'leather', 43.92 + i * 0.456, 32.15, 44.36 + i * 0.456, 32.3, 0.02, 1.36, 0.04);
      box(B, 'walnut', 43.88, 32.2, 48.52, 32.235, 0, 1.4, 0.005);            // (in front of the wall, whose face is at 32.2: flush with it, the two fought as a dotted strip at the headboard's end)
      box(B, 'walnut', 43.88, 32.14, 48.52, 32.42, 1.38, 1.43, 0.008);
      box(d, 'glow', 43.95, 32.32, 48.45, 32.335, 1.362, 1.376, 0.001);
    });
    // on the ledge: a canvas leaning on the larch, a dark vase with branches, a few books
    { const tex = artTex('arcs', 512, 640, 23), m = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.82), drawable(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, envMapIntensity: 0.35 }), 'none'));
      m.rotation.x = -0.09; m.position.set(WX(44.75), 1.43 + 0.41, WZ(32.275)); m.castShadow = false; scene.add(m); own([m], 'bedroom'); }
    rbox(d, 'black', 44.75, 32.262, 1.43, 2.27, 0.7, 0.018, 0.003, 0, -0.09);
    vase(d, 'inkObj', 47.85, 32.3, 1.43, 0.5); branches(d, 47.85, 32.3, 1.72, 0.62, 5);
    books(d, 47.15, 32.3, 1.43, 3, 0.1); lathe(d, 'clay', 45.6, 32.3, 1.43, BOWL.map(([r, h]) => [r * 0.7, h * 0.7]));
    // a wash of light where the larch meets the ceiling, wall to wall
    box(d, 'glow', 43.7, 32.2, 50.8, 32.235, 3.578, 3.596, 0.001);

    // The bed: a plinth, an upholstered base, the mattress. Over it a duvet that hangs down both sides and the foot in
    // folds, its corners rounded, the sheet turned down over its top edge in a thick roll, five pillows, and a throw
    // laid across the foot that falls further on one side than the other. (Until iteration 4 the duvet was a slab with
    // three boards for its sides and the throw's drop was a card.) It all arrives as one thing.
    thing(46.2, 33.5, () => {
      box(B, 'black', 45.2, 32.42, 47.2, 34.52, 0, 0.04, 0.005);
      box(B, 'boucle', 45.12, 32.34, 47.28, 34.6, 0.04, 0.33, 0.035);
      box(B, 'linenW', 45.16, 32.38, 47.24, 34.56, 0.33, 0.58, 0.12);
      drape(d, 'linenW', 46.2, 33.8, 0.645, 2.13, 1.56, 0.075, [0.33, 0.33, 0.36, 0], 0.013, 0.012, 1);
      drape(d, 'white', 46.2, 33.11, 0.68, 2.15, 0.34, 0.034, [0.27, 0.27, 0.04, 0.03], 0.006, 0.006, 3);     // the sheet, turned down over the duvet's top edge
      [45.66, 46.74].forEach((x, i) => pillow(d, 'linenW', x, 32.5, 0.58, 0.78, 0.6, 0.28, -0.34, i ? -0.05 : 0.06));
      [45.66, 46.74].forEach((x, i) => pillow(d, 'boucle', x, 32.82, 0.58, 0.7, 0.46, 0.22, -0.62, i ? 0.09 : -0.07));
      pillow(d, 'rust', 46.24, 33.08, 0.6, 0.56, 0.28, 0.16, -0.72, 0.06);
      drape(d, 'ochre', 46.2, 34.18, 0.682, 2.22, 0.6, 0.09, [0.2, 0.43, 0.03, 0.03], 0.018, 0.008, 5);
    });

    // nightstands that stand on the floor, each with a lamp, books and a small bowl
    [44.42, 47.98].forEach((x, i) => thing(x, 32.6, () => {
      box(B, 'black', x - 0.3, 32.4, x + 0.3, 32.82, 0, 0.03, 0.004); box(B, 'walnut', x - 0.34, 32.34, x + 0.34, 32.86, 0.03, 0.5, 0.012); box(B, 'travBlock', x - 0.35, 32.33, x + 0.35, 32.87, 0.5, 0.53, 0.006);
      box(d, 'black', x - 0.33, 32.86, x + 0.33, 32.864, 0.262, 0.268, 0.001);
      const lx = x + (i ? 0.1 : -0.1);
      vase(d, 'ceramic', lx, 32.56, 0.53, 0.52, URN); cyl(d, 'brass', lx, 32.56, 0.87, 0.98, 0.012, 0.012, 8); cyl(d, 'glowSoft', lx, 32.56, 0.96, 1.22, 0.17, 0.14, 28);
      books(d, x + (i ? -0.15 : 0.15), 32.64, 0.53, 2, 0.2);
      // each lamp throws its own pool: on the stone top, up the leather beside it
      lamp('bedroom', lx, 32.74, 1.04, 0xffc68a, 0.85, 2.6);                  // (out from the leather: close to it, it made a small glossy hot spot)
    }));
    lamp('bedroom', 46.2, 32.78, 2.25, 0xffd09a, 4.8, 8);               // close to the larch and high, so it grazes the boards

    // an upholstered bench at the foot with a folded blanket, a big wool rug under it all
    thing(46.2, 35.24, () => {
    box(B, 'black', 45.46, 35.06, 46.94, 35.42, 0, 0.02, 0.003); box(B, 'walnut', 45.4, 35.02, 47.0, 35.46, 0.02, 0.17, 0.01); box(B, 'boucle', 45.34, 34.98, 47.06, 35.5, 0.17, 0.42, 0.07);
    rbox(d, 'sage', 46.62, 35.24, 0.42, 0.47, 0.5, 0.36, 0.02, 0.12); books(d, 45.75, 35.24, 0.42, 2, 0.3);
    });
    box(d, 'wool', 43.3, 33.2, 49.1, 37.8, 0, 0.016, 0.008); box(d, 'rugTaupe', 43.44, 33.34, 48.96, 37.66, 0, 0.026, 0.01);   // a taupe field in a cream border
    // two chairs and a stone table on a round rug by the west glass, a floor lamp
    cyl(d, 'straw', 42.6, 37.5, 0, 0.012, 1.75, 1.75, 56);
    lounge(B, 42.2, 36.4, Math.PI / 2 + 0.3, 'boucle'); lounge(B, 42.2, 38.6, Math.PI / 2 - 0.3, 'boucle');
    cyl(B, 'travBlock', 42.35, 37.5, 0, 0.44, 0.2, 0.24, 24); vase(d, 'inkObj', 42.35, 37.5, 0.44, 0.5); sprigs(d, 42.35, 37.5, 0.68, 0.45, 4);
    cyl(B, 'black', 41.7, 39.9, 0, 0.03, 0.16, 0.16, 20); cyl(B, 'brass', 41.7, 39.9, 0.03, 1.5, 0.008, 0.008, 8); cyl(d, 'glowSoft', 41.7, 39.9, 1.5, 1.82, 0.15, 0.13, 22);
    // a long low chest on the east wall with a canvas over it, a tall plant in the corner
    thing(50.68, 36.8, () => {
    box(B, 'walnut', 50.5, 35.3, 50.86, 38.3, 0.14, 0.6, 0.01); box(B, 'black', 50.56, 35.4, 50.8, 38.2, 0, 0.14, 0.005);
    vase(d, 'ceramic', 50.68, 35.8, 0.6, 0.8, URN); lathe(d, 'clay', 50.68, 36.9, 0.6, BOWL.map(([r, h]) => [r * 1.1, h * 1.1])); books(d, 50.68, 37.8, 0.6, 3, 1.6);
    });
    art('bedroom', 'ochre', 'E', 36.8, 50.87, 1.75, 1.9, 1.3, 'black', 41);
    plant(d, 50.2, 40.1, 0, 1.5, 'clay', 1.1);
    // sheer curtains gathered at both ends of the west and south glass
    curtain('bedroom', 'v', 41.3, 32.3, 33.3, 0.02, 3.56); curtain('bedroom', 'v', 41.3, 39.8, 40.7, 0.02, 3.56); curtain('bedroom', 'h', 40.7, 41.5, 42.4, 0.02, 3.56); curtain('bedroom', 'h', 40.7, 49.6, 50.6, 0.02, 3.56);
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
  {
    const d = dec('bath');
    // a freestanding stone tub in front of the garden glass, a walnut tray across it
    const TUB = [[0.0, 0.07], [0.3, 0.07], [0.4, 0.16], [0.445, 0.4], [0.46, 0.6], [0.43, 0.6], [0.41, 0.4], [0.36, 0.2], [0.0, 0.14]];
    thing(53.9, 39.35, () => {
    lathe(B, 'stoneW', 53.9, 39.35, 0, TUB, 2.05, 1.0);
    lathe(B, 'stoneW', 53.9, 39.35, 0, [[0, 0], [0.26, 0], [0.3, 0.07], [0, 0.07]], 2.05, 1.0);
    { const w = new THREE.Mesh(mark(new THREE.CircleGeometry(0.42, 40), THING), M.water); w.rotation.x = -Math.PI / 2; w.scale.set(2.05, 1, 1); w.position.set(WX(53.9), 0.5, WZ(39.35)); scene.add(w); own([w], 'bath'); w.castShadow = false; }
    colliders.push({ id: 'tub', box: new THREE.Box3(new V3(WX(52.95), 0, WZ(38.88)), new V3(WX(54.85), 0.6, WZ(39.82))) });
    rod(B, 'brass', [52.75, 39.35, 0], [52.75, 39.35, 0.95], 0.022); rod(B, 'brass', [52.75, 39.35, 0.95], [53.02, 39.35, 0.95], 0.02); rod(B, 'brass', [53.02, 39.35, 0.95], [53.02, 39.35, 0.85], 0.02); cyl(B, 'brass', 52.75, 39.35, 0, 0.02, 0.07, 0.07, 20);
    box(d, 'walnut', 54.25, 38.86, 54.5, 39.84, 0.6, 0.622, 0.004); cyl(d, 'ceramic', 54.37, 39.1, 0.622, 0.7, 0.035, 0.035, 14); lathe(d, 'clay', 54.37, 39.5, 0.622, BOWL.map(([r, h]) => [r * 0.45, h * 0.45]));
    });
    // a stool with towels, a bath mat
    cyl(B, 'travBlock', 55.3, 38.6, 0, 0.44, 0.19, 0.2, 32); rbox(d, 'linenW', 55.3, 38.6, 0.44, 0.52, 0.3, 0.22, 0.03, 0.4); rbox(d, 'sage', 55.3, 38.6, 0.52, 0.58, 0.28, 0.2, 0.03, 0.3);
    cloth(d, 'rugTaupe', 53.9, 38.43, 0, 1.4, 0.032, 0.58, 0.004, 2);
    // the vanity along the west wall: a plinth, a walnut chest, a stone top, two bowls with wall taps,
    // a mirror the length of it, three tubes of light standing on the mirror
    thing(51.45, 38.3, () => {
    box(B, 'black', 51.14, 36.6, 51.66, 40.0, 0, 0.1, 0.004); box(B, 'walnut', 51.14, 36.5, 51.74, 40.1, 0.1, 0.78, 0.01); box(B, 'travBlock', 51.14, 36.44, 51.8, 40.16, 0.78, 0.86, 0.006);
    [37.7, 38.9].forEach((y) => box(d, 'black', 51.74, y - 0.004, 51.744, y + 0.004, 0.12, 0.76, 0.001));
    box(d, 'black', 51.74, 36.52, 51.744, 40.08, 0.44, 0.448, 0.001); [37.1, 38.3, 39.5].forEach((y) => box(d, 'brass', 51.742, y - 0.12, 51.756, y + 0.12, 0.6, 0.612, 0.002));
    [37.4, 39.2].forEach((y) => { lathe(B, 'stoneW', 51.5, y, 0.86, [[0, 0], [0.1, 0], [0.2, 0.07], [0.21, 0.13], [0.19, 0.13], [0.12, 0.05], [0, 0.03]]);
      rod(d, 'brass', [51.14, y, 1.08], [51.36, y, 1.08], 0.012); rod(d, 'brass', [51.36, y, 1.08], [51.36, y, 1.02], 0.012); });
    box(B, 'glassMirror', 51.134, 36.6, 51.158, 40.0, 1.02, 2.5, 0.003); box(d, 'brass', 51.132, 36.58, 51.146, 40.02, 1.0, 2.52, 0.002);
    [36.74, 38.3, 39.86].forEach((y) => { box(d, 'brass', 51.158, y - 0.03, 51.19, y + 0.03, 1.3, 2.2, 0.004); box(d, 'glowSoft', 51.19, y - 0.022, 51.225, y + 0.022, 1.34, 2.16, 0.01); });
    vase(d, 'ceramic', 51.5, 38.3, 0.86, 0.38); sprigs(d, 51.5, 38.3, 1.04, 0.3, 3); rbox(d, 'linenW', 51.48, 36.82, 0.86, 0.94, 0.26, 0.2, 0.03, 0.1); cyl(d, 'brass', 51.45, 39.75, 0.86, 0.9, 0.09, 0.09, 20);
    lamp('bath', 51.55, 38.3, 2.78, 0xffdcb0, 2.4, 7);                 // over the mirror: lower down, the mirror showed it as a white blob
    box(B, 'brass', 51.134, 36.6, 51.21, 40.0, 2.56, 2.6, 0.004); box(d, 'glow', 51.15, 36.66, 51.2, 39.94, 2.552, 2.56, 0.001);   // the fitting that light comes from
    });
    // a tall plant in the north-west corner, a towel ladder on the north wall
    plant(d, 51.72, 40.58, 0, 1.3, 'ceramic', 0.85);                    // in the corner by the glass, whole in the frame
    thing(54.0, 35.25, () => {
    rod(B, 'walnut', [53.7, 35.14, 0], [53.7, 35.3, 1.9], 0.016); rod(B, 'walnut', [54.3, 35.14, 0], [54.3, 35.3, 1.9], 0.016);
    [0.6, 1.0, 1.4].forEach((z) => rod(B, 'walnut', [53.7, 35.2 + z * 0.05, z], [54.3, 35.2 + z * 0.05, z], 0.012));
    rbox(d, 'linenW', 54.0, 35.3, 0.72, 1.4, 0.42, 0.04, 0.015, 0, 0.08);
    });
    // the east wall in walnut slats, floor to ceiling: warm behind the shower, and it is what the mirror shows from the door
    // (decor, like the wardrobe's dividers and the fluting next door: on the plan 49 slats were a ragged edge on the wall,
    // and as decor they arrive one after the other as the scan passes)
    for (let y = 35.24; y < 40.9; y += 0.115) box(d, 'walnut', 58.74, y, 58.8, y + 0.07, 0.02, 3.56, 0.004);
    box(d, 'black', 58.785, 35.2, 58.8, 40.9, 0, 3.58, 0.001);
    // the shower on the east wall: a glass screen, a rain head, a stone bench with a towel
    box(B, 'glass', 57.25, 35.5, 57.28, 38.2, 0.02, 2.4, 0.002); box(B, 'travBlock', 58.25, 35.5, 58.8, 38.2, 0, 0.44, 0.01);
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
      flameMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
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
      const fm = new THREE.Mesh(g, flameMat); fm.frustumCulled = false; fm.renderOrder = 4;
      scene.add(fm); own([fm], 'garden'); fm.castShadow = false; fm.receiveShadow = false;
      lamp('garden', 55.3, 45.4, 0.9, 0xffa058, 3.4, 5.2, true);
    }
    [[53.95, 44.75, 1.0], [56.7, 45.9, -1.25]].forEach(([x, y, a]) => lounge(B, x, y, a, 'linenW', 'walnut'));                // two chairs, the third stood in the lens
    pillow(d, 'ochre', 53.9, 44.7, 0.42, 0.42, 0.36, 0.13, -0.35, 1.0 + Math.PI / 2); pillow(d, 'rust', 56.78, 45.9, 0.42, 0.42, 0.36, 0.13, -0.35, -1.25 - Math.PI / 2);
    thing(53.6, 46.4, () => { for (let j = 0; j < 3; j++) for (let i = 0; i < 4 - j; i++) d.add(M.walnut, new THREE.CylinderGeometry(0.05, 0.055, 0.45, 9), FX.M(WX(53.6), 0.06 + j * 0.1, WZ(46.25 + (i + j * 0.5) * 0.11), 0, 0, Math.PI / 2)); });
    colliders.push({ id: 'firepit', box: new THREE.Box3(new V3(WX(53.4), 0, WZ(44.2)), new V3(WX(57.2), 0.8, WZ(46.6))) });
    // two loungers facing the sea beside the water, towels, a low table with a bowl
    [50.9, 52.3].forEach((x) => thing(x + 0.375, 45.7, () => { box(B, 'walnut', x, 44.7, x + 0.75, 46.7, 0.12, 0.28, 0.03); box(B, 'black', x + 0.05, 44.8, x + 0.7, 46.6, 0, 0.12, 0.01); box(B, 'linenW', x + 0.04, 44.75, x + 0.71, 46.65, 0.28, 0.38, 0.04);
      rbox(B, 'linenW', x + 0.375, 44.95, 0.38, 0.46, 0.67, 0.6, 0.04, 0, 0.5); rbox(d, 'rust', x + 0.375, 46.4, 0.38, 0.43, 0.6, 0.34, 0.02, 0); }));
    cyl(B, 'travBlock', 51.97, 45.2, 0, 0.36, 0.17, 0.2, 20); lathe(d, 'ceramic', 51.97, 45.2, 0.36, BOWL.map(([r, h]) => [r * 0.6, h * 0.6]));
    // the old olive stands in a round bed of gravel with a stone edge, lavender at its foot
    cyl(B, 'travBlock', 46.9, 46.2, 0, 0.16, 1.5, 1.5, 56); cyl(B, 'gravel', 46.9, 46.2, 0.16, 0.17, 1.38, 1.38, 48);      // (a kerb you can sit on, and tall enough to be a whole circle on the plan)
    for (let i = 0; i < 9; i++) { const a = i * 0.7 + 0.3, r = 0.95 + R() * 0.3; lavender(d, 46.9 + Math.cos(a) * r, 46.2 + Math.sin(a) * r, 0.24 + R() * 0.07); }
    // a stone bench by the south wall, cushions on it
    thing(47.8, 48.97, () => { box(B, 'travBlock', 46.2, 48.7, 49.4, 49.25, 0, 0.45, 0.01); cushion(d, 'boucle', 47.0, 48.97, 0.45, 1.2, 0.08, 0.46, 0); cushion(d, 'ochre', 48.9, 48.97, 0.45, 0.42, 0.14, 0.42, 0.4, 0.6); });
    // the pergola at the west end: four posts, two beams, slats that stripe the floor with shade
    { const X0 = 41.9, X1 = 46.0, Y0 = 42.7, Y1 = 45.7, Hh = 2.6;
      [[X0, Y0], [X1, Y0], [X0, Y1], [X1, Y1]].forEach(([x, y]) => box(B, 'walnut', x - 0.06, y - 0.06, x + 0.06, y + 0.06, 0, Hh, 0.006));
      [Y0, Y1].forEach((y) => box(B, 'walnut', X0 - 0.3, y - 0.05, X1 + 0.3, y + 0.05, Hh, Hh + 0.18, 0.006));
      for (let x = X0 - 0.2; x <= X1 + 0.21; x += 0.21) box(B, 'walnut', x - 0.022, Y0 - 0.35, x + 0.022, Y1 + 0.35, Hh + 0.18, Hh + 0.3, 0.004);
      // under it: a stone floor, an outdoor sofa in an L, a low table, two lanterns
      box(B, 'travBlock', X0 - 0.3, Y0 - 0.3, X1 + 0.3, Y1 + 0.3, 0, 0.01, 0.004);          // (2 mm under the terrace's strip, which it runs into: at the same height the two tops fought, and their edges drew a double line on the plan)
      thing(43.6, 43.9, () => {
      box(B, 'walnut', 42.1, 42.9, 45.3, 43.75, 0.08, 0.3, 0.02); box(B, 'walnut', 42.1, 43.75, 42.95, 45.5, 0.08, 0.3, 0.02);
      box(B, 'linenW', 42.14, 42.94, 45.26, 43.72, 0.3, 0.46, 0.05); box(B, 'linenW', 42.14, 43.72, 42.92, 45.46, 0.3, 0.46, 0.05);
      box(B, 'linenW', 42.14, 42.94, 45.26, 43.14, 0.46, 0.82, 0.06); box(B, 'linenW', 42.14, 43.14, 42.34, 45.46, 0.46, 0.82, 0.06);
      [[43.0, 0], [44.2, 0.1], [45.0, -0.1]].forEach(([x, r], i) => pillow(d, ['ochre', 'sage', 'rust'][i], x, 43.26, 0.46, 0.46, 0.4, 0.14, -0.3, r));
      pillow(d, 'boucle', 42.46, 44.6, 0.46, 0.46, 0.4, 0.14, -0.3, Math.PI / 2);
      });
      thing(44.25, 44.65, () => { box(B, 'travBlock', 43.6, 44.3, 44.9, 45.0, 0, 0.32, 0.01); lathe(d, 'clay', 44.0, 44.65, 0.32, BOWL.map(([r, h]) => [r * 1.0, h * 1.0])); books(d, 44.55, 44.6, 0.32, 2, 0.4); });
      [[45.75, 45.45], [42.2, 45.6]].forEach(([x, y]) => { box(d, 'black', x - 0.09, y - 0.09, x + 0.09, y + 0.09, 0.03, 0.36, 0.004); box(d, 'glowSoft', x - 0.06, y - 0.06, x + 0.06, y + 0.06, 0.08, 0.3, 0.004); }); }
    // planting: grasses along the south and west walls, lavender in drifts, clipped balls, agaves in pots
    for (let i = 0; i < 40; i++) { const x = 41.6 + R() * 8.2, y = 48.9 + R() * 0.5; if (x > 45.9 && x < 49.7) continue; clump(d, x, y, 0, 0.8 + R() * 0.6, 10, R() < 0.7 ? 'straw' : 'foliageL', 0.5); }
    for (let i = 0; i < 12; i++) clump(d, 41.4 + R() * 0.5, 46.1 + i * 0.28, 0, 0.7 + R() * 0.5, 9, 'straw', 0.5);
    for (let i = 0; i < 26; i++) { const t = i / 25, x = 50.0 - t * 2.4 + (R() - 0.5) * 0.5, y = 43.2 + t * 1.2 + (R() - 0.5) * 0.7; lavender(d, x, y, 0.22 + R() * 0.1); }
    // clipped box balls. They were perfect spheres in the cypress's big-blotched leaf ("a sphere in camouflage print"):
    // now each is a little out of round, hand-clipped, in one small dark leaf that the light models
    [[49.5, 44.6, 0.42], [48.6, 44.9, 0.3], [50.3, 43.4, 0.34], [58.9, 43.4, 0.4], [60.3, 43.0, 0.3]].forEach(([x, y, r], k) => {
      const g = new THREE.IcosahedronGeometry(1, 4), pp = g.attributes.position, v = new V3();
      for (let i = 0; i < pp.count; i++) { v.fromBufferAttribute(pp, i); const q = 1 + (FX.noise3(v.x * 1.6 + k * 7, v.y * 1.6, v.z * 1.6) - 0.5) * 0.16 + (FX.noise3(v.x * 9 + k, v.y * 9, v.z * 9) - 0.5) * 0.05; pp.setXYZ(i, v.x * q, Math.max(v.y * q * 0.9, -0.72), v.z * q); }
      g.computeVertexNormals();
      d.add(M.boxLeaf, g, FX.M(WX(x), r * 0.72, WZ(y), 0, k * 1.3, 0, r, r, r));
    });
    [[42.6, 41.85], [50.9, 41.85], [58.6, 41.85]].forEach(([x, y]) => { cyl(B, 'conc', x, y, 0.03, 0.6, 0.32, 0.4, 28); clump(d, x, y, 0.56, 0.8, 14, 'foliage', 0.9); });
    // behind you as you step out: a table for eight under the east wall
    thing(59.8, 45.4, () => {
    box(B, 'walnut', 58.6, 44.9, 61.0, 45.9, 0.7, 0.75, 0.01); [[58.75, 45.05], [60.85, 45.05], [58.75, 45.75], [60.85, 45.75]].forEach(([x, y]) => box(B, 'black', x - 0.03, y - 0.03, x + 0.03, y + 0.03, 0, 0.7, 0.004));
    [44.55, 46.25].forEach((y) => box(B, 'walnut', 58.7, y - 0.17, 60.9, y + 0.17, 0.4, 0.45, 0.01)); [[58.85, 44.55], [60.75, 44.55], [58.85, 46.25], [60.75, 46.25]].forEach(([x, y]) => box(B, 'black', x - 0.03, y - 0.12, x + 0.03, y + 0.12, 0, 0.4, 0.004));
    lathe(d, 'ceramic', 59.8, 45.4, 0.75, BOWL.map(([r, h]) => [r * 1.2, h * 1.2])); vase(d, 'inkObj', 59.2, 45.4, 0.75, 0.5); sprigs(d, 59.2, 45.4, 1.0, 0.4, 4);
    });
  }

  // decor is landscape as far as the drawing goes: no ink pass, shown when its zone turns real
  Object.keys(DEC).forEach((zone) => { const ms = DEC[zone].build(scene); own(ms, zone); ms.forEach((m) => { m.userData.decor = true; }); });
  delete B.add;                                                        // the house batch goes back to scene.js as it came
  return { lights, flame: flameMat };
};
