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
    walnut: D(FX.pbr(walnut, { size: 1.3, color: rgb(0.74, 0.5, 0.33), env: 0.75, roughness: 0.8 }), { sat: 1.0 }),
    oakFin: drawable(FX.pbr(sets.oak, { size: 1.3, color: rgb(1.25, 1.08, 0.9), env: 0.9, rotate: Math.PI / 2 }), 'timber', { room: 'ext', sat: 0.55 }),
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
    glowSoft: D(P({ color: 0xf2e6d2, emissive: 0xffd9a8, emissiveIntensity: 1.3, roughness: 0.8 })),
    ember: D(P({ color: 0x1a0f0a, emissive: 0xff6a22, emissiveIntensity: 2.6, roughness: 1 })),
    lemon: D(P({ color: 0xe6c236, roughness: 0.6 })),
    foliage: D(P({ color: 0x55653f, roughness: 0.75, envMapIntensity: 0.4 }), { noRing: true }),
    foliageL: D(P({ color: 0x8a9466, roughness: 0.8, envMapIntensity: 0.4 }), { noRing: true }),
    straw: D(P({ color: 0xc9b98c, roughness: 0.9 }), { noRing: true }),
    twig: D(P({ color: 0x5a4a3a, roughness: 0.9 }), { noRing: true }),
    white: D(P({ color: 0xf6f3ee, roughness: 0.7 })),
    sheer: D(P({ color: 0xf3efe7, roughness: 0.95, envMapIntensity: 0.3 })),
    bk1: D(P({ color: 0xe9e2d4, roughness: 0.8 })), bk2: D(P({ color: 0x2c2a28, roughness: 0.8 })), bk3: D(P({ color: 0xb8452a, roughness: 0.8 })), bk4: D(P({ color: 0x8c8676, roughness: 0.8 })),
  });

  /* ---------- helpers ---------------------------------------------------------- */
  const DEC = {};
  const dec = (zone) => DEC[zone] || (DEC[zone] = new FX.Batch());
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
  const vase = (bt, mat, x, y, z, s, pts) => lathe(bt, mat, x, y, z, (pts || VASE).map(([r, h]) => [r * s, h * s]));
  // dry branches standing in a vase
  const branches = (bt, x, y, z, h, n, mat) => {
    for (let i = 0; i < n; i++) {
      const a = R() * 6.28, lean = 0.12 + R() * 0.3, hh = h * (0.7 + R() * 0.4);
      const tip = [x + Math.cos(a) * lean * hh, y + Math.sin(a) * lean * hh, z + hh];
      rod(bt, mat || 'twig', [x, y, z], tip, 0.006);
      for (let k = 0; k < 3; k++) {
        const t = 0.45 + R() * 0.5, b = [x + (tip[0] - x) * t, y + (tip[1] - y) * t, z + hh * t], a2 = R() * 6.28;
        rod(bt, mat || 'twig', b, [b[0] + Math.cos(a2) * 0.12, b[1] + Math.sin(a2) * 0.12, b[2] + 0.1 + R() * 0.1], 0.004);
      }
    }
  };
  // olive sprigs in a vase: twigs with small leaf blobs
  const sprigs = (bt, x, y, z, h, n) => {
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
  };
  const books = (bt, x, y, z, n, rot) => { let zz = z; for (let i = 0; i < n; i++) { const h = 0.028 + R() * 0.02; rbox(bt, ['bk1', 'bk2', 'bk3', 'bk4'][(R() * 4) | 0], x, y, zz, zz + h, 0.3 - i * 0.02, 0.22 - i * 0.015, 0.003, (rot || 0) + (R() - 0.5) * 0.3); zz += h; } return zz; };
  const cushion = (bt, mat, cx, cy, z, w, h, d, rot, tilt) => rbox(bt, mat, cx, cy, z, z + h, w, d, Math.min(w, h, d) * 0.42, rot, tilt);
  // a pendant: a thin rod from the ceiling to a glowing globe, or a brass dome with a glowing disc under it
  const pendant = (bt, x, y, zTop, z, r, kind) => {
    cyl(bt, 'black', x, y, z + r * 0.8, zTop, 0.005, 0.005, 6);
    if (kind === 'dome') {
      bt.add(M.brass, new THREE.SphereGeometry(r, 28, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), FX.M(WX(x), z, WZ(y)));
      cyl(bt, 'glow', x, y, z - 0.012, z, r * 0.82, r * 0.82, 24);
    } else if (kind === 'drum') {
      cyl(bt, 'glowSoft', x, y, z - r * 0.7, z + r * 0.7, r, r, 28);
      cyl(bt, 'brass', x, y, z + r * 0.7, z + r * 0.7 + 0.02, r * 1.02, r * 1.02, 28);
    } else ball(bt, 'glowSoft', x, y, z, r);
  };
  // a leafy plant in a pot: a stem and broad leaves
  const plant = (bt, x, y, z, h, potMat, s) => {
    lathe(bt, potMat || 'ceramic', x, y, z, POT.map(([r, hh]) => [r * (s || 1), hh * (s || 1)]));
    const z0 = z + 0.46 * (s || 1);
    rod(bt, 'twig', [x, y, z0], [x + 0.04, y, z0 + h], 0.014);
    for (let i = 0; i < 16; i++) {
      const t = 0.3 + (i / 16) * 0.7, a = i * 2.4, l = 0.26 + R() * 0.12;
      bt.add(M[i % 3 ? 'foliage' : 'foliageL'], new THREE.SphereGeometry(l, 10, 6),
        FX.M(WX(x + Math.cos(a) * l * 0.9), z0 + h * t, WZ(y + Math.sin(a) * l * 0.9), 0.5 + R() * 0.5, -a, 0, 1, 0.07, 0.5, 'YXZ'));
    }
  };
  // tall grass or an agave: narrow cones fanning out
  const clump = (bt, x, y, z, h, n, mat, spread) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + R(), lean = (spread || 0.5) * (0.3 + R() * 0.7), hh = h * (0.6 + R() * 0.5);
      bt.add(M[mat], new THREE.ConeGeometry(0.03 + (spread || 0.5) * 0.06, hh, 5), FX.M(WX(x + Math.cos(a) * lean * hh * 0.5), z + hh * 0.5 * Math.cos(lean), WZ(y + Math.sin(a) * lean * hh * 0.5), Math.sin(a) * lean, 0, -Math.cos(a) * lean));
    }
  };
  // a curtain gathered into folds along a wall line (axis 'v': along y at x = c, 'h': along x at y = c)
  const curtain = (zone, axis, c, a, b, z0, z1) => {
    const n = Math.max(8, Math.round((b - a) / 0.05)), g = new THREE.PlaneGeometry(b - a, z1 - z0, n, 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const u = p.getX(i); p.setZ(i, Math.sin(u * 34) * 0.045 + Math.sin(u * 13 + 1) * 0.02); }
    g.computeVertexNormals();
    dec(zone).add(M.sheer, g, FX.M(WX(axis === 'v' ? c : (a + b) / 2), (z0 + z1) / 2, WZ(axis === 'v' ? (a + b) / 2 : c), 0, axis === 'v' ? Math.PI / 2 : 0, 0));
  };
  // a lounge chair: seat, back, arms, on a low frame. rot 0 faces south (+y)
  const lounge = (bt, cx, cy, rot, mat, frame) => {
    const c = Math.cos(rot || 0), s = Math.sin(rot || 0), at = (dx, dy) => [cx + dx * c + dy * s, cy - dx * s + dy * c];
    let q = at(0, 0.02); rbox(bt, mat, q[0], q[1], 0.2, 0.42, 0.78, 0.74, 0.09, rot);
    q = at(0, -0.3); rbox(bt, mat, q[0], q[1], 0.36, 0.86, 0.78, 0.2, 0.09, rot, -0.16);
    q = at(-0.42, 0.02); rbox(bt, mat, q[0], q[1], 0.2, 0.6, 0.14, 0.74, 0.06, rot);
    q = at(0.42, 0.02); rbox(bt, mat, q[0], q[1], 0.2, 0.6, 0.14, 0.74, 0.06, rot);
    q = at(0, 0.02); rbox(bt, frame || 'walnut', q[0], q[1], 0.1, 0.2, 0.8, 0.76, 0.02, rot);
    [[-0.34, -0.3], [0.34, -0.3], [-0.34, 0.33], [0.34, 0.33]].forEach(([dx, dy]) => { const l = at(dx, dy); cyl(bt, frame || 'walnut', l[0], l[1], 0, 0.1, 0.02, 0.025, 8); });
  };
  const stool = (bt, x, y) => { cyl(bt, 'leather', x, y, 0.66, 0.72, 0.19, 0.19, 24); cyl(bt, 'black', x, y, 0.02, 0.66, 0.018, 0.018, 8); cyl(bt, 'black', x, y, 0, 0.02, 0.2, 0.2, 24); cyl(bt, 'brass', x, y, 0.22, 0.235, 0.16, 0.16, 20); };

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
  const art = (zone, kind, wall, u, c, z, w, h, frame, seed) => {
    const px = Math.round(256 * Math.min(2.4, Math.max(1, w))), tex = artTex(kind, px, Math.round((px * h) / w), seed);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), drawable(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, envMapIntensity: 0.35 }), 'none', { side: THREE.FrontSide }));
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
  };
  const plinth = (bt, x, y, h, s) => box(bt, 'travBlock', x - (s || 0.26), y - (s || 0.26), x + (s || 0.26), y + (s || 0.26), 0, h, 0.008);

  const lights = [];
  const lamp = (zone, x, y, z, color, k, dist) => { const l = new THREE.PointLight(color, 0, dist || 7, 1.7); l.position.set(WX(x), z, WZ(y)); scene.add(l); lights.push({ l, zone, k }); };

  /* ================= the front of the house ======================================= */
  {
    const d = dec('ext');
    // oak fins on the wall west of the door, a bench under the canopy
    for (let i = 0; i < 11; i++) box(B, 'oakFin', 11.5 + i * 0.2, 26.2, 11.56 + i * 0.2, 26.34, 0.02, 4.2, 0.004);
    box(B, 'travBlock', 11.5, 26.6, 13.5, 27.1, 0, 0.44, 0.012);
    cushion(d, 'boucle', 12.0, 26.85, 0.44, 0.7, 0.09, 0.44, 0);
    // two slim wall lights
    [13.45, 16.55].forEach((x) => { box(B, 'bronze', x - 0.03, 26.2, x + 0.03, 26.27, 1.5, 2.3, 0.004); box(d, 'glow', x - 0.012, 26.268, x + 0.012, 26.276, 1.56, 2.24, 0.001); });
    // a reflecting pool along the east side of the path, stepping stones beside it
    box(B, 'conc', 17.3, 26.4, 19.0, 33.4, -0.2, 0.06, 0.01);
    { const w = new THREE.Mesh(FX.plane(1.5, 6.8), M.water); w.rotation.x = -Math.PI / 2; w.position.set(WX(18.15), 0.065, WZ(29.9)); w.receiveShadow = true; scene.add(w); own([w], 'ext'); w.castShadow = false; }
    // planting west of the path: grasses and three boulders
    [[12.2, 29.6, 0.5, 3], [11.4, 31.0, 0.34, 5], [12.6, 32.3, 0.42, 9]].forEach(([x, y, r, sd]) => d.add(M.drystone, FX.boulder(r, sd, 0.5), FX.M(WX(x), r * 0.35, WZ(y), 0, sd, 0)));
    for (let i = 0; i < 16; i++) { const x = 10.6 + R() * 2.5, y = 29.0 + R() * 4.6; clump(d, x, y, 0, 0.7 + R() * 0.5, 9, R() < 0.6 ? 'straw' : 'foliageL', 0.55); }
    // an olive in a stone planter on each side
    [[10.3, 27.7, 31], [20.2, 27.9, 47]].forEach(([x, y, sd]) => {
      lathe(B, 'travBlock', x, y, 0, [[0, 0], [0.62, 0], [0.78, 0.5], [0.8, 0.66], [0.72, 0.66], [0, 0.6]]);
      tree(olive(A.extBark, M.barkFar, x, y, 0.58, sd, A.LOW ? 500 : 1100, 0.6, null, 0.6), 'ext');
    });
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
    box(B, 'walnut', 18.3, 22.5, 18.82, 24.5, 0.34, 0.42, 0.01); box(B, 'black', 18.36, 22.6, 18.4, 22.64, 0, 0.34, 0.004); box(B, 'black', 18.72, 22.6, 18.76, 22.64, 0, 0.34, 0.004);
    box(B, 'black', 18.36, 24.36, 18.4, 24.4, 0, 0.34, 0.004); box(B, 'black', 18.72, 24.36, 18.76, 24.4, 0, 0.34, 0.004);
    cushion(d, 'leather', 18.56, 23.5, 0.42, 0.44, 0.07, 1.9, 0);
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
    box(B, 'boucle', 12.1, 10.6, 17.9, 11.5, -0.45, -0.03, 0.07); box(B, 'boucle', 12.1, 11.5, 13.0, 14.9, -0.45, -0.03, 0.07); box(B, 'boucle', 12.1, 14.1, 16.2, 14.9, -0.45, -0.03, 0.07);
    for (let i = 0; i < 6; i++) cushion(d, 'boucle', 12.7 + i * 0.93, 10.76, -0.03, 0.86, 0.42, 0.2, 0, -0.14);
    for (let i = 0; i < 3; i++) cushion(d, 'boucle', 12.26, 12.1 + i * 0.93, -0.03, 0.2, 0.42, 0.86, 0, 0);
    for (let i = 0; i < 4; i++) cushion(d, 'boucle', 13.5 + i * 0.86, 14.74, -0.03, 0.8, 0.42, 0.2, 0, 0.14);
    [['ochre', 13.3, 11.0, 0.4], ['charcoal', 14.6, 11.05, -0.3], ['rust', 16.9, 11.0, 0.5], ['sage', 12.5, 13.6, 1.2], ['charcoal', 12.55, 12.4, 1.9], ['ochre', 15.3, 14.5, 2.8], ['rust', 13.9, 14.45, 3.3]]
      .forEach(([m, x, y, a]) => cushion(d, m, x, y, 0.0, 0.42, 0.14, 0.42, a, 0.9));
    rbox(d, 'ochre', 17.2, 11.05, -0.03, 0.0, 0.9, 0.7, 0.012, 0.2);                       // a throw over the seat
    box(B, 'travBlock', 14.2, 12.3, 16.4, 13.4, -0.45, -0.1, 0.012);                       // the low table
    box(d, 'walnut', 14.4, 12.45, 15.1, 12.95, -0.1, -0.075, 0.006);
    lathe(d, 'ceramic', 14.75, 12.7, -0.075, BOWL); const tb = books(d, 15.7, 12.95, -0.1, 3, 0.3); ball(d, 'inkObj', 15.7, 12.95, tb + 0.06, 0.06);
    vase(d, 'inkObj', 16.05, 12.6, -0.1, 0.8); sprigs(d, 16.05, 12.6, 0.36, 0.7, 5);
    box(d, 'wool', 13.2, 11.7, 17.6, 13.95, -0.45, -0.425, 0.006);
    // the fireplace: board-marked concrete, a hearth, logs, a canvas leaning on the hearth
    box(B, 'concreteIn', 9.13, 10.2, 9.95, 15.2, 0, 3.92, 0.01); colliders.push({ id: 'fire', box: new THREE.Box3(new V3(WX(9.13), 0, WZ(10.2)), new V3(WX(9.95), 3.92, WZ(15.2))) });
    box(B, 'dark', 9.9, 11.7, 9.98, 13.7, 0.3, 1.05, 0.005); box(B, 'fire', 9.86, 11.9, 9.9, 13.5, 0.36, 0.7, 0.005);
    box(B, 'concreteIn', 9.95, 10.9, 10.9, 14.5, 0, 0.32, 0.01);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 5 - j; i++) d.add(M.walnut, new THREE.CylinderGeometry(0.055, 0.06, 0.5, 9), FX.M(WX(10.3), 0.38 + j * 0.105, WZ(13.95 + (i + j * 0.5) * 0.115), 0, 0, Math.PI / 2));
    { const tex = artTex('horizon', 512, 640, 8), m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.5), drawable(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, envMapIntensity: 0.35 }), 'none'));
      m.rotation.set(0, Math.PI / 2, 0); m.rotateX(-0.09); m.position.set(WX(10.12), 1.07, WZ(11.35)); scene.add(m); own([m], 'living'); }
    // two lounge chairs and a round table by the glass
    lounge(B, 19.7, 9.5, -Math.PI / 2 - 0.25, 'leather'); lounge(B, 19.7, 11.6, -Math.PI / 2 + 0.25, 'leather');
    cyl(B, 'travBlock', 20.0, 10.55, 0, 0.46, 0.22, 0.26, 28); const st = books(d, 20.0, 10.55, 0.46, 2, 0.6); cyl(d, 'glowSoft', 20.02, 10.5, st, st + 0.16, 0.05, 0.05, 14);
    // an arc lamp reaching over the pit
    cyl(B, 'travBlock', 11.5, 15.6, 0, 0.14, 0.22, 0.22, 24);
    { const pts = []; for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push([11.5 + t * 2.6, 15.6 - t * 1.9, 0.14 + Math.sin(t * Math.PI * 0.62) * 2.5]); } for (let i = 0; i < 14; i++) rod(B, 'brass', pts[i], pts[i + 1], 0.012);
      const e = pts[14]; d.add(M.brass, new THREE.SphereGeometry(0.24, 28, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), FX.M(WX(e[0]), e[2] - 0.12, WZ(e[1]))); cyl(d, 'glow', e[0], e[1], e[2] - 0.135, e[2] - 0.12, 0.2, 0.2, 24);
      lamp('living', e[0], e[1], e[2] - 0.4, 0xffd09a, 3.2, 7); }
    // the olive in its stone planter, curtains gathered at the end of the glass
    B.add(M.travBlock, new THREE.CylinderGeometry(0.56, 0.46, 0.72, 40), FX.M(WX(10.55), 0.36, WZ(15.75)));
    B.add(M.dark, new THREE.CylinderGeometry(0.5, 0.5, 0.02, 40), FX.M(WX(10.55), 0.71, WZ(15.75)));
    curtain('living', 'v', 20.72, 15.6, 16.6, 0.02, 4.42); curtain('living', 'v', 20.72, 8.3, 9.0, 0.02, 4.42);
    art('living', 'sun', 'N', 10.05, 8.13, 2.2, 1.4, 1.9, 'black', 5);
  }

  /* ================= kitchen and dining =============================================== */
  {
    const d = dec('kitchen');
    box(B, 'travBlock', 11.5, 3.4, 16.5, 4.6, 0, 0.92, 0.01); colliders.push({ id: 'island', box: new THREE.Box3(new V3(WX(11.5), 0, WZ(3.4)), new V3(WX(16.5), 0.92, WZ(4.6))) });
    box(d, 'black', 12.3, 3.7, 13.1, 4.2, 0.9, 0.925, 0.004);                              // the sink
    rod(d, 'brass', [12.7, 3.62, 0.92], [12.7, 3.62, 1.3], 0.012); rod(d, 'brass', [12.7, 3.62, 1.3], [12.7, 3.86, 1.3], 0.012); rod(d, 'brass', [12.7, 3.86, 1.3], [12.7, 3.86, 1.22], 0.012);
    lathe(d, 'ceramic', 14.6, 4.0, 0.92, BOWL.map(([r, h]) => [r * 1.5, h * 1.5])); for (let i = 0; i < 7; i++) ball(d, 'lemon', 14.6 + (R() - 0.5) * 0.3, 4.0 + (R() - 0.5) * 0.3, 1.02 + R() * 0.05, 0.045, 1.15);
    rbox(d, 'walnut', 15.75, 3.75, 0.92, 0.95, 0.5, 0.32, 0.006, 0.3); rbox(d, 'walnut', 15.9, 3.82, 0.95, 0.975, 0.4, 0.26, 0.006, -0.2);
    vase(d, 'inkObj', 16.15, 4.25, 0.92, 0.7); sprigs(d, 16.15, 4.25, 1.24, 0.6, 4);
    [12.4, 13.5, 14.6, 15.7].forEach((x) => stool(B, x, 4.98));
    [12.6, 14.0, 15.4].forEach((x) => pendant(d, x, 4.0, 3.6, 1.72, 0.1, 'drum'));
    // the cabinet wall: oak fronts, a dark oven, a lit niche
    box(B, 'oak', 9.13, 0.4, 9.75, 4.6, 0, 2.6, 0.01); colliders.push({ id: 'tall', box: new THREE.Box3(new V3(WX(9.13), 0, WZ(0.4)), new V3(WX(9.75), 2.6, WZ(4.6))) });
    for (let i = 1; i < 7; i++) box(d, 'black', 9.748, 0.4 + i * 0.6 - 0.004, 9.754, 0.4 + i * 0.6 + 0.004, 0.02, 2.58, 0.001);
    box(d, 'black', 9.75, 2.24, 9.762, 2.96, 0.95, 1.95, 0.003); box(d, 'brass', 9.762, 2.3, 9.775, 2.9, 1.82, 1.84, 0.002);
    box(d, 'black', 9.75, 3.44, 9.76, 4.56, 1.1, 1.75, 0.003); box(d, 'glow', 9.76, 3.46, 9.764, 4.54, 1.72, 1.74, 0.001);
    vase(d, 'ceramic', 9.86, 3.7, 1.12, 0.45); lathe(d, 'clay', 9.86, 4.1, 1.12, BOWL.map(([r, h]) => [r * 0.7, h * 0.7]));
    // the table for fourteen
    box(B, 'walnut', 17.2, 3.4, 23.2, 4.6, 0.7, 0.76, 0.006); box(B, 'walnut', 17.5, 3.6, 17.62, 4.4, 0, 0.7, 0.005); box(B, 'walnut', 22.78, 3.6, 22.9, 4.4, 0, 0.7, 0.005);
    for (let i = 0; i < 7; i++) {
      const x = 17.55 + i * 0.84;
      [[2.8, 3.25, 2.72, 2.8], [4.75, 5.2, 5.2, 5.28]].forEach(([s0, s1, b0, b1], k) => {
        box(B, 'leather', x, s0, x + 0.5, s1, 0.4, 0.47, 0.03); box(B, 'walnut', x, b0, x + 0.5, b1, 0.4, 0.86, 0.02);
        [[x + 0.03, k ? 4.77 : 2.82], [x + 0.43, k ? 4.77 : 2.82], [x + 0.03, k ? 5.13 : 3.18], [x + 0.43, k ? 5.13 : 3.18]].forEach(([lx, ly]) => box(B, 'black', lx, ly, lx + 0.035, ly + 0.035, 0, 0.4, 0.004));
      });
    }
    box(d, 'linenW', 17.9, 3.82, 22.5, 4.18, 0.76, 0.766, 0.002);                          // a runner
    [[18.6, 0.75, 'ceramic'], [20.2, 1.0, 'inkObj'], [21.8, 0.7, 'clay']].forEach(([x, s, m]) => { vase(d, m, x, 4.0, 0.766, s); sprigs(d, x, 4.0, 0.766 + 0.5 * s, 0.6 * s + 0.2, 5); });
    [19.4, 21.0].forEach((x) => lathe(d, 'ceramic', x, 4.0, 0.766, BOWL));
    [19.0, 20.6, 22.2].forEach((x) => { cyl(d, 'brass', x, 3.92, 0.766, 0.9, 0.012, 0.012, 8); cyl(d, 'white', x, 3.92, 0.9, 1.04, 0.011, 0.011, 8); });
    [18.5, 20.2, 21.9].forEach((x) => pendant(d, x, 4.0, 3.6, 1.78, 0.3, 'dome'));
    lamp('kitchen', 20.2, 4.0, 1.5, 0xffd6a0, 5, 8);
    // wine behind glass: racks of bottles, a lit shelf line
    box(B, 'dark', 25.2, 0.2, 28.8, 0.6, 0, 2.6, 0.01); box(B, 'dark', 28.4, 0.6, 28.8, 7.4, 0, 2.6, 0.01);
    for (let j = 0; j < 9; j++) { box(d, 'brass', 28.36, 0.7, 28.4, 7.3, 0.3 + j * 0.26, 0.31 + j * 0.26, 0.001); for (let i = 0; i < 30; i++) d.add(M.inkObj, new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8), FX.M(WX(28.26), 0.36 + j * 0.26, WZ(0.82 + i * 0.218), 0, 0, Math.PI / 2)); }
    box(d, 'glow', 28.38, 0.7, 28.39, 7.3, 2.55, 2.57, 0.001);
    art('kitchen', 'bars', 'N', 10.05, 8.13 - 0.26 - 0.07, 2.0, 1.2, 1.6, 'walnut', 11);
  }

  /* ================= the other rooms on the plan: media, study, library, guest suites === */
  {
    box(B, 'boucle', 2, 5.4, 7, 6.4, 0, 0.42, 0.1); box(B, 'boucle', 2, 4.4, 2.9, 5.4, 0, 0.42, 0.1); box(B, 'boucle', 2, 6.2, 7, 6.42, 0.3, 0.82, 0.08);
    box(B, 'dark', 2.4, 0.2, 6.6, 0.3, 0.9, 2.9, 0.01); box(B, 'walnut', 2.2, 0.3, 6.8, 0.7, 0.2, 0.55, 0.01); box(B, 'travBlock', 3.6, 3.4, 5.4, 4.3, 0, 0.36, 0.01);
    box(dec('kitchen'), 'wool', 1.6, 2.6, 7.4, 6.9, 0, 0.018, 0.006);
    box(B, 'walnut', 31.5, 2.2, 34.5, 3.1, 0.7, 0.75, 0.008); box(B, 'black', 31.6, 2.3, 31.66, 3.0, 0, 0.7, 0.004); box(B, 'black', 34.34, 2.3, 34.4, 3.0, 0, 0.7, 0.004);
    lounge(B, 33.0, 1.5, 0, 'leather', 'black');
    box(B, 'oak', 29.2, 0.2, 37.8, 0.6, 0, 2.8, 0.01); box(B, 'oak', 38.2, 0.2, 43.8, 0.6, 0, 2.8, 0.01); box(B, 'oak', 43.4, 0.6, 43.8, 7.4, 0, 2.8, 0.01);
    const d = dec('gallery');
    box(d, 'wool', 30.6, 1.2, 36.4, 6.6, 0, 0.018, 0.006); lounge(B, 39.6, 5.2, Math.PI * 0.8, 'boucle'); lounge(B, 41.6, 5.6, -Math.PI * 0.8, 'boucle'); cyl(B, 'travBlock', 40.6, 5.9, 0, 0.44, 0.22, 0.26, 24);
    // books on the library and study shelves, seen from the patio through the glass
    for (let j = 0; j < 6; j++) for (let i = 0; i < 44; i++) { if (R() < 0.18) continue; const x = 29.4 + i * 0.32, h = 0.2 + R() * 0.1; if (x > 37.6 && x < 38.3) continue; box(d, ['bk1', 'bk2', 'bk3', 'bk4'][(R() * 4) | 0], x, 0.6, x + 0.04 + R() * 0.05, 0.62, 0.3 + j * 0.42, 0.3 + j * 0.42 + h, 0.002); }
    [8, 16].forEach((y, k) => {
      box(B, 'walnut', 3.7, y + 2.0, 6.3, y + 4.4, 0, 0.26, 0.02); box(B, 'linenW', 3.8, y + 2.1, 6.2, y + 4.3, 0.26, 0.5, 0.06); box(B, 'boucle', 3.6, y + 1.8, 6.4, y + 1.98, 0, 1.25, 0.04);
      const dd = dec(k ? 'entrance' : 'living');
      cushion(dd, 'linenW', 4.45, y + 2.4, 0.5, 0.75, 0.16, 0.45, 0, 0.3); cushion(dd, 'linenW', 5.55, y + 2.4, 0.5, 0.75, 0.16, 0.45, 0, 0.3); rbox(dd, k ? 'sage' : 'rust', 5.0, y + 3.9, 0.5, 0.56, 2.44, 0.7, 0.03, 0);
      box(B, 'plaster', 0.2, y + 5.3, 3.3, y + 5.45, 0, 2.6, 0.005); box(B, 'plaster', 3.3, y + 5.3, 3.45, y + 7.8, 0, 2.6, 0.005); box(B, 'travBlock', 0.2, y + 6, 0.8, y + 7.6, 0, 0.85, 0.01);
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
    [24.6, 26.2, 34.4, 36].forEach((x) => { box(B, 'walnut', x, 24.2, x + 0.75, 26.2, 0.12, 0.28, 0.03); box(B, 'black', x + 0.05, 24.3, x + 0.7, 26.1, 0, 0.12, 0.01); box(B, 'linenW', x + 0.04, 24.25, x + 0.71, 26.15, 0.28, 0.38, 0.04);
      rbox(B, 'linenW', x + 0.375, 24.45, 0.38, 0.46, 0.67, 0.6, 0.04, 0, 0.5); rbox(d, 'sage', x + 0.375, 25.9, 0.38, 0.43, 0.6, 0.34, 0.02, 0); });
    [25.78, 35.58].forEach((x) => { cyl(B, 'travBlock', x, 24.7, 0, 0.36, 0.17, 0.2, 20); lathe(d, 'ceramic', x, 24.7, 0.36, BOWL.map(([r, h]) => [r * 0.6, h * 0.6]));
      cyl(B, 'walnut', x, 25.6, 0, 2.5, 0.025, 0.025, 10); d.add(M.linenW, new THREE.ConeGeometry(1.6, 0.42, 10, 1, true), FX.M(WX(x), 2.6, WZ(25.6))); });
    // an outdoor lounge on the north side, clear of the way from the kitchen to the gallery door
    box(B, 'walnut', 26.2, 9.0, 30.2, 10.0, 0.08, 0.3, 0.02); box(B, 'linenW', 26.25, 9.05, 30.15, 9.95, 0.3, 0.44, 0.05); box(B, 'walnut', 26.2, 8.86, 30.2, 9.02, 0.08, 0.78, 0.02);
    box(B, 'walnut', 30.4, 10.2, 31.4, 13.0, 0.08, 0.3, 0.02); box(B, 'linenW', 30.45, 10.25, 31.35, 12.95, 0.3, 0.44, 0.05); box(B, 'walnut', 31.38, 10.2, 31.54, 13.0, 0.08, 0.78, 0.02);
    for (let i = 0; i < 4; i++) cushion(d, i % 2 ? 'sage' : 'linenW', 26.7 + i * 1.0, 9.2, 0.44, 0.8, 0.4, 0.18, 0, -0.15);
    for (let i = 0; i < 3; i++) cushion(d, i % 2 ? 'ochre' : 'linenW', 31.2, 10.7 + i * 0.9, 0.44, 0.18, 0.4, 0.8, 0, 0);
    box(B, 'travBlock', 27.4, 11.0, 29.2, 12.2, 0, 0.3, 0.012); lathe(d, 'inkObj', 28.3, 11.6, 0.3, BOWL.map(([r, h]) => [r * 1.4, h * 1.4])); cyl(d, 'glowSoft', 27.8, 11.4, 0.3, 0.48, 0.06, 0.06, 14);
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
    [['dark', 10.9, 2.0, 2.3, 3.0, 'black'], ['plan', 13.6, 1.75, 1.0, 1.3, 'walnut'], ['arcs', 15.4, 1.9, 1.5, 2.0, 'black'], ['grid', 18.9, 1.9, 1.7, 2.3, 'walnut'],
      ['stroke', 22.0, 1.8, 1.1, 1.5, 'black'], ['ochre', 23.5, 1.8, 1.1, 1.5, 'black'], ['horizon', 26.4, 1.95, 2.6, 2.0, 'walnut'], ['dots', 29.5, 1.8, 1.2, 1.6, 'black'], ['sun', 31.0, 1.8, 0.9, 1.2, 'walnut']]
      .forEach(([k, y, z, w, h, f], i) => art('gallery', k, 'E', y, 43.77, z, w, h, f, 20 + i));
    // a track of small spots on the ceiling, aimed at the wall
    box(d, 'black', 43.0, 9.0, 43.03, 31.0, 3.56, 3.58, 0.002);
    for (let y = 10.2; y < 31; y += 1.7) { d.add(M.black, new THREE.CylinderGeometry(0.035, 0.04, 0.12, 12), FX.M(WX(43.05), 3.5, WZ(y), 0, 0, -0.5)); cyl(d, 'glow', 43.085, y, 3.435, 3.445, 0.028, 0.028, 10); }
    // benches
    [[17.4, 20.6], [26.0, 28.4]].forEach(([y0, y1]) => { box(B, 'walnut', 43.15, y0, 43.65, y1, 0.36, 0.44, 0.012); box(B, 'black', 43.2, y0 + 0.15, 43.6, y0 + 0.21, 0, 0.36, 0.004); box(B, 'black', 43.2, y1 - 0.21, 43.6, y1 - 0.15, 0, 0.36, 0.004); });
    // sculpture on plinths along the glass
    plinth(B, 41.62, 14.2, 0.95); [0.2, 0.15, 0.11].reduce((z, r) => { ball(B, 'bronze', 41.62, 14.2, z + r, r); return z + r * 1.86; }, 0.95);
    plinth(B, 41.62, 18.9, 0.8); B.add(M.drystone, FX.boulder(0.34, 12, 0.2), FX.M(WX(41.62), 1.12, WZ(18.9), 0.2, 1.1, 0, 0.8, 1.5, 0.8));
    plinth(B, 41.62, 24.28, 0.92); B.add(M.bronze, new THREE.TorusGeometry(0.3, 0.06, 18, 54), FX.M(WX(41.62), 1.28, WZ(24.28), 0, 0.5, 0));
    plinth(B, 41.62, 29.2, 0.7); [[0.17, 0.08], [0.12, 0.12], [0.19, 0.07], [0.1, 0.16], [0.15, 0.07], [0.08, 0.2]].reduce((z, [r, h], i) => { cyl(B, i % 2 ? 'travBlock' : 'inkObj', 41.62, 29.2, z, z + h, r, r, 28); return z + h; }, 0.7);
  }

  /* ================= master suite ===================================================== */
  {
    const d = dec('bedroom');
    // a tall upholstered headboard in channels, floating nightstands, a wide bed
    for (let i = 0; i < 15; i++) box(B, 'leather', 43.95 + i * 0.3, 32.15, 44.23 + i * 0.3, 32.3, 0.3, 1.75, 0.035);
    box(B, 'walnut', 43.9, 32.14, 48.5, 32.19, 0.2, 1.85, 0.005);
    box(B, 'walnut', 44.95, 32.38, 47.45, 34.95, 0.06, 0.3, 0.02); box(B, 'black', 45.1, 32.5, 47.3, 34.8, 0, 0.06, 0.01);
    box(B, 'linenW', 45.05, 32.42, 47.35, 34.85, 0.3, 0.56, 0.07);
    box(d, 'linenW', 45.0, 33.25, 47.4, 34.9, 0.5, 0.68, 0.085);                            // the duvet
    rbox(d, 'ochre', 46.2, 34.5, 0.66, 0.72, 2.46, 0.62, 0.03, 0);                          // a throw at the foot
    [[45.6, 32.52], [46.8, 32.52]].forEach(([x, y]) => cushion(d, 'linenW', x, y, 0.56, 0.66, 0.66, 0.2, 0, -0.2));
    [[45.6, 32.86], [46.8, 32.86]].forEach(([x, y]) => cushion(d, 'boucle', x, y, 0.56, 0.72, 0.44, 0.2, 0, -0.35));
    cushion(d, 'rust', 46.2, 33.12, 0.6, 0.62, 0.26, 0.16, 0, -0.3);
    [[43.95, 44.8], [47.6, 48.45]].forEach(([x0, x1]) => { box(B, 'walnut', x0, 32.2, x1, 32.74, 0.34, 0.52, 0.01); const tz = books(d, (x0 + x1) / 2 + 0.1, 32.5, 0.52, 2, 0.2); vase(d, 'ceramic', (x0 + x1) / 2 - 0.2, 32.46, 0.52, 0.4); });
    [44.38, 48.02].forEach((x) => pendant(d, x, 32.52, 3.6, 1.22, 0.11));
    lamp('bedroom', 46.2, 33.0, 1.5, 0xffd09a, 4.2, 8);
    box(d, 'glow', 43.6, 32.2, 48.8, 32.215, 3.5, 3.52, 0.001);                             // a wash of light down the larch
    // a leather bench at the foot, a big wool rug
    box(B, 'leather', 45.3, 35.15, 47.1, 35.6, 0.34, 0.46, 0.04); [[45.4, 35.22], [46.95, 35.22], [45.4, 35.5], [46.95, 35.5]].forEach(([x, y]) => box(B, 'black', x, y, x + 0.04, y + 0.04, 0, 0.34, 0.004));
    box(d, 'wool', 43.7, 33.4, 48.7, 37.6, 0, 0.022, 0.008);
    // two chairs and a stone table by the west glass, a floor lamp
    lounge(B, 42.2, 36.4, Math.PI / 2 + 0.3, 'boucle'); lounge(B, 42.2, 38.6, Math.PI / 2 - 0.3, 'boucle');
    cyl(B, 'travBlock', 42.35, 37.5, 0, 0.44, 0.2, 0.24, 24); vase(d, 'inkObj', 42.35, 37.5, 0.44, 0.5); sprigs(d, 42.35, 37.5, 0.68, 0.45, 4);
    cyl(B, 'black', 41.7, 39.9, 0, 0.03, 0.16, 0.16, 20); cyl(B, 'brass', 41.7, 39.9, 0.03, 1.5, 0.008, 0.008, 8); cyl(d, 'glowSoft', 41.7, 39.9, 1.5, 1.82, 0.15, 0.13, 22);
    // a long low chest on the east wall with a canvas over it
    box(B, 'walnut', 50.5, 35.3, 50.86, 38.3, 0.14, 0.6, 0.01); box(B, 'black', 50.56, 35.4, 50.8, 38.2, 0, 0.14, 0.005);
    vase(d, 'ceramic', 50.68, 35.8, 0.6, 0.8, URN); lathe(d, 'clay', 50.68, 36.9, 0.6, BOWL.map(([r, h]) => [r * 1.1, h * 1.1])); books(d, 50.68, 37.8, 0.6, 3, 1.6);
    art('bedroom', 'ochre', 'E', 36.8, 50.87, 1.75, 1.9, 1.3, 'black', 41);
    // sheer curtains gathered at both ends of the west and south glass
    curtain('bedroom', 'v', 41.3, 32.3, 33.3, 0.02, 3.56); curtain('bedroom', 'v', 41.3, 39.8, 40.7, 0.02, 3.56); curtain('bedroom', 'h', 40.7, 41.5, 42.4, 0.02, 3.56); curtain('bedroom', 'h', 40.7, 49.6, 50.6, 0.02, 3.56);
  }

  /* ================= dressing ======================================================= */
  {
    const d = dec('dressing');
    box(B, 'oak', 51.2, 32.15, 58.8, 32.75, 0, 2.6, 0.01); box(B, 'oak', 51.2, 34.25, 54.9, 34.85, 0, 2.6, 0.01); box(B, 'oak', 57.9, 34.25, 58.8, 34.85, 0, 2.6, 0.01);
    for (let i = 1; i < 12; i++) box(d, 'black', 51.2 + i * 0.633 - 0.003, 32.748, 51.2 + i * 0.633 + 0.003, 32.754, 0.02, 2.58, 0.001);
    box(d, 'glow', 51.2, 32.75, 58.8, 32.762, 2.6, 2.62, 0.001); box(d, 'glow', 51.2, 34.238, 54.9, 34.25, 2.6, 2.62, 0.001);
    box(d, 'wool', 51.6, 33.05, 58.2, 33.95, 0, 0.018, 0.006);
    box(d, 'brass', 58.82, 33.0, 58.85, 34.0, 0.1, 2.3, 0.003); box(d, 'glassMirror', 58.815, 33.04, 58.83, 33.96, 0.14, 2.26, 0.002);
    cyl(B, 'boucle', 57.6, 33.5, 0, 0.42, 0.3, 0.32, 24);
  }

  /* ================= bath ============================================================ */
  {
    const d = dec('bath');
    // a freestanding stone tub in front of the garden glass
    const TUB = [[0.0, 0.07], [0.3, 0.07], [0.4, 0.16], [0.445, 0.4], [0.46, 0.6], [0.43, 0.6], [0.41, 0.4], [0.36, 0.2], [0.0, 0.14]];
    lathe(B, 'stoneW', 53.9, 39.35, 0, TUB, 2.05, 1.0);
    lathe(B, 'stoneW', 53.9, 39.35, 0, [[0, 0], [0.26, 0], [0.3, 0.07], [0, 0.07]], 2.05, 1.0);
    { const w = new THREE.Mesh(new THREE.CircleGeometry(0.42, 40), M.water); w.rotation.x = -Math.PI / 2; w.scale.set(2.05, 1, 1); w.position.set(WX(53.9), 0.5, WZ(39.35)); scene.add(w); own([w], 'bath'); w.castShadow = false; }
    colliders.push({ id: 'tub', box: new THREE.Box3(new V3(WX(52.95), 0, WZ(38.88)), new V3(WX(54.85), 0.6, WZ(39.82))) });
    rod(B, 'brass', [52.75, 39.35, 0], [52.75, 39.35, 0.95], 0.014); rod(B, 'brass', [52.75, 39.35, 0.95], [53.0, 39.35, 0.95], 0.014); rod(B, 'brass', [53.0, 39.35, 0.95], [53.0, 39.35, 0.86], 0.014);
    // a stool with towels, a tray on the rim, a fern
    cyl(B, 'walnut', 55.25, 38.5, 0, 0.44, 0.17, 0.2, 20); rbox(d, 'linenW', 55.25, 38.5, 0.44, 0.52, 0.3, 0.22, 0.03, 0.4); rbox(d, 'sage', 55.25, 38.5, 0.52, 0.58, 0.28, 0.2, 0.03, 0.3);
    plant(d, 51.75, 40.3, 0, 1.25, 'clay', 0.9);
    // the vanity: a floating walnut chest under a stone top, two bowls, wall taps, a long mirror, two pendants
    box(B, 'walnut', 58.25, 35.9, 58.85, 39.7, 0.42, 0.78, 0.01); box(B, 'travBlock', 58.2, 35.8, 58.86, 39.8, 0.78, 0.86, 0.006);
    [36.9, 38.7].forEach((y) => { lathe(B, 'stoneW', 58.5, y, 0.86, [[0, 0], [0.1, 0], [0.2, 0.07], [0.21, 0.13], [0.19, 0.13], [0.12, 0.05], [0, 0.03]]);
      rod(d, 'brass', [58.84, y, 1.08], [58.62, y, 1.08], 0.012); rod(d, 'brass', [58.62, y, 1.08], [58.62, y, 1.02], 0.012); pendant(d, 58.42, y - 0.62, 3.6, 1.72, 0.085); });
    box(B, 'glassMirror', 58.83, 36.0, 58.86, 39.6, 1.05, 2.45, 0.003); box(d, 'brass', 58.82, 35.98, 58.835, 39.62, 1.03, 2.47, 0.002);
    vase(d, 'ceramic', 58.5, 37.8, 0.86, 0.38); sprigs(d, 58.5, 37.8, 1.04, 0.3, 3); rbox(d, 'linenW', 58.52, 36.25, 0.86, 0.94, 0.26, 0.2, 0.03, 0.1);
    lamp('bath', 57.6, 37.8, 1.9, 0xffdcb0, 2.6, 6);
    // the shower: a glass screen, a rain head, a stone bench
    box(B, 'glass', 53.1, 35.2, 53.13, 37.0, 0.02, 2.4, 0.002); box(B, 'travBlock', 51.2, 35.2, 51.75, 37.0, 0, 0.44, 0.01);
    rod(d, 'brass', [52.2, 35.14, 2.3], [52.2, 35.5, 2.3], 0.012); cyl(d, 'brass', 52.2, 35.6, 2.27, 2.29, 0.16, 0.16, 24);
    rbox(d, 'linenW', 51.47, 36.1, 0.44, 0.52, 0.34, 0.5, 0.03, 0);
    // a towel ladder on the north wall, a bath mat
    rod(B, 'walnut', [53.7, 35.14, 0], [53.7, 35.3, 1.9], 0.016); rod(B, 'walnut', [54.3, 35.14, 0], [54.3, 35.3, 1.9], 0.016);
    [0.6, 1.0, 1.4].forEach((z) => rod(B, 'walnut', [53.7, 35.2 + z * 0.05, z], [54.3, 35.2 + z * 0.05, z], 0.012));
    rbox(d, 'linenW', 54.0, 35.3, 0.72, 1.4, 0.42, 0.04, 0.015, 0, 0.08);
    box(d, 'wool', 53.2, 38.2, 54.6, 38.75, 0, 0.02, 0.008);
  }

  /* ================= private garden ================================================== */
  {
    const d = dec('garden');
    box(B, 'concrete', 41, 49.55, 62, 50, 0, 0.5, 0.01); box(B, 'concrete', 61.55, 41, 62, 49.55, 0, 0.5, 0.01);
    // a long water trough against the south wall, brim full, so the water meets the sea
    box(B, 'concrete', 50.2, 47.9, 61.55, 48.08, 0, 0.5, 0.008); box(B, 'concrete', 50.2, 48.08, 50.38, 49.55, 0, 0.5, 0.008);
    { const w = new THREE.Mesh(FX.plane(11.17, 1.47), M.water); w.rotation.x = -Math.PI / 2; w.position.set(WX(55.965), 0.485, WZ(48.815)); w.receiveShadow = true; scene.add(w); own([w], 'garden'); w.castShadow = false; }
    // a fire bowl with seats round it
    lathe(B, 'bronze', 59.4, 45.4, 0, [[0, 0], [0.2, 0], [0.26, 0.1], [0.3, 0.26], [0.62, 0.42], [0.66, 0.46], [0.6, 0.44], [0.26, 0.3], [0, 0.3]]);
    cyl(d, 'ember', 59.4, 45.4, 0.36, 0.385, 0.5, 0.5, 28); for (let i = 0; i < 6; i++) d.add(M.inkObj, new THREE.CylinderGeometry(0.045, 0.05, 0.5, 8), FX.M(WX(59.4 + (R() - 0.5) * 0.3), 0.43, WZ(45.4 + (R() - 0.5) * 0.3), 0, R() * 3, Math.PI / 2 - 0.25));
    [[58.0, 44.2, 0.8], [60.9, 44.3, -0.8], [59.5, 47.1, Math.PI]].forEach(([x, y, a]) => lounge(B, x, y, a, 'linenW', 'walnut'));
    colliders.push({ id: 'firepit', box: new THREE.Box3(new V3(WX(57.5), 0, WZ(43.7)), new V3(WX(61.4), 0.8, WZ(47.6))) });
    // the stone bench, the loungers with towels, a low table
    box(B, 'travBlock', 46.2, 48.7, 49.4, 49.25, 0, 0.45, 0.01); cushion(d, 'boucle', 47.0, 48.97, 0.45, 1.2, 0.08, 0.46, 0); cushion(d, 'ochre', 48.9, 48.97, 0.45, 0.42, 0.14, 0.42, 0.4, 0.6);
    [51.6, 53.0].forEach((x) => { box(B, 'walnut', x, 45.4, x + 0.75, 47.4, 0.12, 0.28, 0.03); box(B, 'black', x + 0.05, 45.5, x + 0.7, 47.3, 0, 0.12, 0.01); box(B, 'linenW', x + 0.04, 45.45, x + 0.71, 47.35, 0.28, 0.38, 0.04);
      rbox(B, 'linenW', x + 0.375, 45.65, 0.38, 0.46, 0.67, 0.6, 0.04, 0, 0.5); rbox(d, 'rust', x + 0.375, 47.1, 0.38, 0.43, 0.6, 0.34, 0.02, 0); });
    cyl(B, 'travBlock', 52.67, 45.9, 0, 0.36, 0.17, 0.2, 20); lathe(d, 'ceramic', 52.67, 45.9, 0.36, BOWL.map(([r, h]) => [r * 0.6, h * 0.6]));
    // stepping stones from the bath to the fire, grasses along the walls, agaves in pots on the terrace
    [[56.6, 44.0], [57.0, 44.75], [56.5, 45.5], [57.1, 46.2]].forEach(([x, y], i) => rbox(B, 'travBlock', x, y, 0, 0.03, 0.7, 0.5, 0.008, i * 0.4 - 0.3));
    for (let i = 0; i < 40; i++) { const x = 41.6 + R() * 8.2, y = 48.9 + R() * 0.5; if (x > 45.9 && x < 49.7) continue; clump(d, x, y, 0, 0.8 + R() * 0.6, 10, R() < 0.7 ? 'straw' : 'foliageL', 0.5); }
    for (let i = 0; i < 14; i++) clump(d, 41.4 + R() * 0.7, 44.0 + i * 0.36, 0, 0.7 + R() * 0.5, 9, 'straw', 0.5);
    [[42.6, 42.6], [49.6, 43.0], [58.3, 42.4]].forEach(([x, y]) => { cyl(B, 'conc', x, y, 0, 0.6, 0.36, 0.44, 28); clump(d, x, y, 0.56, 0.8, 14, 'foliage', 0.9); });
  }

  // decor is landscape as far as the drawing goes: no ink pass, shown when its zone turns real
  Object.keys(DEC).forEach((zone) => own(DEC[zone].build(scene), zone));
  return { lights };
};
