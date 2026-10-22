/* ==========================================================================
   Lintel, the house room by room (14 Oct 2026, brief-code-house.md). Two switches, each a list of rooms or "all":

     ?lit=living,entrance   those rooms lit as rooms: each its own 360 picture (taken while the page loads), reflections
                            read from the room's own box, light that bounces twice, soft corners. Indoor rooms only:
                            outdoors the sky is the right light. (Lighting First of the living room test.)
                            THE DEFAULT since 14 Oct (Sam, after the walk door to bath: "it looks good"): no switch
                            means every room lit. ?lit=none gives the house as it was lit before (frozen in v5b/).
     ?code=living           those rooms in the materials of code-materials.js instead of the Poly Haven scans.
                            THE DEFAULT since 15 Oct: every room in code (Sam: "I don't want any Poly Haven textures,
                            everything should be in code now"). ?code=none gives the scans back, for comparing.
     ?look=code|light|codelit   the living room test of 14 Oct (frozen in v5b/), as the same two switches for the living room

   With no switch: every room lit, every material a scan (until each room's code is approved, brief-phase-3.md).

   How a room gets its own materials: every material in this house is shared (one plaster for every wall, one
   leather for every chair), and the house is built as a few big merged meshes. Once it is built, every merged mesh
   is split by the room each of its triangles faces into (its middle, pushed 6 cm out along its normal, the same
   rule the reveal uses), and each room's part gets that room's material. So a room switches without touching the
   others, and no room block in staging.js has to know.
   ========================================================================== */
(function () {
  'use strict';
  const Q = new URLSearchParams(location.search);
  const list = (s) => (s == null ? [] : s.split(',').map((x) => x.trim()).filter(Boolean));
  // every room in code unless a switch says otherwise (Sam, 15 Oct: "I don't want any Poly Haven textures, everything should
  // be in code now"). ?code=none gives the scans back, for comparing; ?code=living,entrance only those rooms.
  const LOOK = Q.get('look');
  const SKIP = list(Q.get('codeskip'));                 // (tools: ?codeskip=bark,trav keeps those materials as scans, for measuring)
  const code = Q.get('code') != null ? list(Q.get('code')).filter((r) => r !== 'none') : LOOK ? [] : ['all'];
  // every room lit unless a switch says otherwise (the living room test's ?look= keeps its own meaning: only the living room)
  const lit = Q.get('lit') != null ? list(Q.get('lit')).filter((r) => r !== 'none') : LOOK ? [] : ['all'];
  if (LOOK === 'code' || LOOK === 'codelit') code.push('living');
  if (LOOK === 'light' || LOOK === 'codelit') lit.push('living');
  if (!code.length && !lit.length) return;
  const CM = window.LINTEL_CODEMAT, T = window.THREE;
  const { overlay, f, v3, W } = CM;
  let A = null, ROOMS = [], RM = {};
  const mine = new Set();
  const inCode = (room) => code.includes('all') || code.includes(room);
  const inLit = (room) => !!RM[room] && !RM[room].outdoor && (lit.includes('all') || lit.includes(room));
  // ?bake=entrance,hall,wc (iteration 8, a trial): those rooms' code materials drawn once into textures at load and
  // sampled with mipmaps and anisotropic filtering where a pixel is bigger than a texel (code-materials.js, bakedFrom).
  // ?bakemb=N the graphics card memory the room group may take (default 256), ?bakeonly the textures alone.
  // THE DEFAULT since iteration 8: the stone floors of the hall and the WC only, the one place the trial showed a gain (the
  // stone kept two and three rows further down the hall). ?bake=none: no bake at all.
  const bakeRooms = Q.get('bake') != null ? list(Q.get('bake')).filter((r) => r !== 'none') : ['hall', 'wc'];
  const bakeKeys = Q.get('bake') != null ? null : ['trav'];
  const inBake = (room, k) => (bakeRooms.includes('all') || bakeRooms.includes(room)) && (!bakeKeys || bakeKeys.includes(k));
  // how fine each material is baked, against the others (a texel's size, relative), and the brightest its colour goes
  const BAKEABLE = { concreteIn: 1, concretePlain: 1, plaster: 1.3, roof: 2, trav: 0.7, oakDoor: 0.5, oakConsole: 0.5, oakLeaf: 0.6 };
  const BAKE_SCALE = { roof: 1.6, plaster: 1.2 };
  const bakedMats = new Map();
  // (and the outside walls seen from the front and the land, since iteration 8: fair faced concrete, the board concrete before.
  // The patio's and the garden's walls keep the board concrete until their turn comes.)
  const ROOM_OWN = { entrance: { roof: 'roofWhite' }, ext: { concrete: 'concreteFair' } };

  /* ---------- which room a point is in (plan metres) ---------- */
  function roomAt(x, y) {
    for (const r of ROOMS) if (x > r.r[0] && x < r.r[2] && y > r.r[1] && y < r.r[3]) return r.id;
    return 'ext';
  }
  // a triangle: its middle (world), pushed 6 cm out along its normal, so each skin of a wall belongs to the room it faces
  function roomOfTri(x, y, z, nx, nz) {
    let px = x + 30 + nx * 0.06, py = z + 24 + nz * 0.06;
    if (y > 0.02 && Math.abs(x + 30 - 41) < 0.27 && py > 8 && py < 32) px = 41.3;   // the gallery's glass wall takes the gallery's light (its reveal is the court's since 16 Oct, see roomOf in scene.js)
    return roomAt(px, py);
  }

  /* ---------- a room's own copy of a material ---------- */
  const keyOf = (mat) => { for (const k in A.M) if (A.M[k] === mat) return k; return null; };
  const codeMats = new Map(), cache = new Map();
  function variant(orig, room) {
    let byRoom = cache.get(orig);
    if (!byRoom) cache.set(orig, (byRoom = new Map()));
    if (byRoom.has(room)) return byRoom.get(room);
    let m = orig;
    const k = keyOf(orig);
    // (outdoors the olives keep the leaves the page paints on a canvas at load, written in code too: the shader that draws
    // the sprig leaf by leaf costs every pixel of thousands of overlapping cards, and the patio's frame went from 22 to 60 ms)
    const heavy = (k === 'leafCard' && RM[room] && RM[room].outdoor) || SKIP.includes(k);
    // (a room may wear its own version of a shared material: the entrance's ceiling is a plain white since iteration 8)
    const kk = (ROOM_OWN[room] && ROOM_OWN[room][k]) || k;
    if (inCode(room) && k && CM.has(kk) && !heavy) { if (!codeMats.has(kk)) codeMats.set(kk, CM.build(kk, orig)); m = codeMats.get(kk); }
    if (m !== orig && inBake(room, k) && BAKEABLE[k] && m.userData.lkSrc) {
      if (!bakedMats.has(k)) { const bm = CM.bakedFrom(orig, m); bm.userData.bake.mkey = k; bakedMats.set(k, bm); }
      m = bakedMats.get(k);
    }
    if (inLit(room)) m = LIGHT.variant(m, k, room);
    byRoom.set(room, m);
    if (m !== orig) mine.add(m);
    return m;
  }

  /* ---------- the split ---------- */
  function split(I) {
    const { scene, zones } = I;
    const zoneOf = new Map();
    Object.keys(zones).forEach((z) => zones[z].forEach((m) => zoneOf.set(m, z)));
    const swapIn = (old, fresh) => { const z = zoneOf.get(old); if (!z) return; const a = zones[z], i = a.indexOf(old); if (i >= 0) a.splice(i, 1, ...fresh); };
    const todo = [];
    scene.traverse((o) => {
      const m = o.material;
      if (!o.isMesh || !m || Array.isArray(m) || !m.isMeshStandardMaterial || !m.userData.drawable || m.transparent || mine.has(m)) return;
      todo.push(o);
    });
    const v = new T.Vector3(), c = new T.Vector3(), nrm = new T.Vector3(), nm = new T.Matrix3();
    let parts = 0;
    todo.forEach((o) => {
      if (o.isInstancedMesh) {
        // leaves: one room, where the middle of the instances is
        const m4 = new T.Matrix4(); c.set(0, 0, 0);
        for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m4); c.add(v.setFromMatrixPosition(m4)); }
        c.multiplyScalar(1 / Math.max(1, o.count));
        const nv = variant(o.material, roomAt(c.x + 30, c.z + 24));
        if (nv !== o.material) { o.userData.baseMat = o.material; o.material = nv; }
        return;
      }
      o.updateMatrixWorld(true);
      const forced = o.material.userData.room;
      if (o.matrixAutoUpdate !== false || forced) {
        // a thing of its own (a painting, the pivot door): one room, where its middle is. A material drawable() was told
        // the room of (the pivot door's, whose middle is on the entrance's very edge) belongs to that room, all of it.
        new T.Box3().setFromObject(o).getCenter(c);
        const nv = variant(o.material, forced || roomAt(c.x + 30, c.z + 24));
        if (nv !== o.material) { o.userData.baseMat = o.material; o.material = nv; }
        return;
      }
      // a merged batch: triangle by triangle
      const g = o.geometry, pos = g.attributes.position, nor = g.attributes.normal, idx = g.index;
      if (!nor) return;
      const mw = o.matrixWorld; nm.getNormalMatrix(mw);
      const tris = (idx ? idx.count : pos.count) / 3, vi = (t, k) => (idx ? idx.getX(t * 3 + k) : t * 3 + k);
      const groups = new Map();
      for (let t = 0; t < tris; t++) {
        c.set(0, 0, 0); nrm.set(0, 0, 0);
        for (let k = 0; k < 3; k++) { const i = vi(t, k); c.add(v.fromBufferAttribute(pos, i)); nrm.add(v.fromBufferAttribute(nor, i)); }
        c.multiplyScalar(1 / 3).applyMatrix4(mw); nrm.applyMatrix3(nm).normalize();
        const room = roomOfTri(c.x, c.y, c.z, nrm.x, nrm.z);
        let a = groups.get(room); if (!a) groups.set(room, (a = []));
        a.push(t);
      }
      const byMat = new Map();
      groups.forEach((ts, room) => { const nv = variant(o.material, room); let a = byMat.get(nv); if (!a) byMat.set(nv, (a = [])); for (const t of ts) a.push(t); });
      if (byMat.size === 1 && byMat.has(o.material)) return;
      const fresh = [];
      byMat.forEach((ts, mat) => {
        const ng = new T.BufferGeometry();
        Object.keys(g.attributes).forEach((name) => {
          const at = g.attributes[name], n = at.itemSize, out = new at.array.constructor(ts.length * 3 * n);
          let w = 0;
          for (const t of ts) for (let k = 0; k < 3; k++) { const i = vi(t, k); for (let j = 0; j < n; j++) out[w++] = at.array[i * n + j]; }
          ng.setAttribute(name, new T.BufferAttribute(out, n, at.normalized));
        });
        ng.computeBoundingSphere(); ng.computeBoundingBox();
        const nmsh = new T.Mesh(ng, mat);
        Object.assign(nmsh, { castShadow: o.castShadow, receiveShadow: o.receiveShadow, renderOrder: o.renderOrder, frustumCulled: o.frustumCulled, visible: o.visible, matrixAutoUpdate: false, name: o.name });
        nmsh.matrix.copy(o.matrix); nmsh.matrixWorldNeedsUpdate = true;
        nmsh.userData = Object.assign({}, o.userData, { baseMat: o.material });
        o.parent.add(nmsh); fresh.push(nmsh); parts++;
      });
      o.parent.remove(o); g.dispose();
      swapIn(o, fresh);
    });
    window.__house = { code, lit, split: todo.length, parts };
  }

  /* ======================================================================================
     ROOMS LIT AS ROOMS (Lighting First, for any indoor room)
     ====================================================================================== */
  const LIGHT = (() => {
    // How bright each room's own light is taken. A capture is one bounce, a real room bounces many times, so its
    // picture is lifted. 1.7 brought the living room's rest to Now's brightness (14 Oct). Per room once measured.
    // (Entrance, gallery and dressing were 6 to 14 percent darker than Now at their rests with 1.7, measured on the review
    // stills of 14 Oct. Their light comes more from the sky in their glass and less from a sunlit floor.)
    const K = { entrance: 2.5, gallery: 2.2, dressing: 1.95 };
    // The finishes that run through the house (the floor's marble, the white walls, the white ceilings) look the same in every
    // room: the entrance's strength of light wherever they are, and outside the entrance some of the room's bounce taken
    // toward grey, so a room's warm light (the living room's fire and low sun) does not turn its white walls cream. (Sam,
    // 15 Oct: "the same color from the front wall in the entrance... the same color for the ceiling... so the colors feel
    // consistent". With each room's own light, the living room's ceiling measured 179,161,140 against the entrance's 204,192,180.)
    const SHARED_K = { marbleDark: K.entrance, plaster: K.entrance, roof: K.entrance, limewash: K.entrance, limewashEntry: K.entrance };
    // (80 percent of the way to one warm white in every room, the entrance too, since the night of 15 Oct: at 45 percent and
    // the entrance left out, two faces of one wall in two rooms still differed in tint. Sam: "there's a slight variation
    // difference from the color of the two wall connecting")
    const NEUTRAL_END = `
      { vec3 lkInd = reflectedLight.indirectDiffuse; float lkIl = dot(lkInd, vec3(0.2126, 0.7152, 0.0722));
        reflectedLight.indirectDiffuse = mix(lkInd, vec3(lkIl) * vec3(1.03, 1.0, 0.95), 0.8); }`;
    const rooms = {};
    function roomData(id) {
      if (rooms[id]) return rooms[id];
      const r = RM[id], floor = id === 'living' ? -0.45 : 0;
      const min = W(r.r[0], r.r[1], floor), max = W(r.r[2], r.r[3], r.h);
      const probe = id === 'living' ? W(15, 12.5, 1.4) : W((r.r[0] + r.r[2]) / 2, (r.r[1] + r.r[3]) / 2, Math.min(1.5, r.h * 0.4));
      const U = { uLkBoxMin: { value: new T.Vector3(...min) }, uLkBoxMax: { value: new T.Vector3(...max) }, uLkProbe: { value: new T.Vector3(...probe) },
        uLkFloor: { value: floor }, uLkCrown: { value: new T.Vector3() } };
      // (every room's picture the sky's size, 256, since 15 Oct: a picture's size is part of every lit shader, and with the
      // small rooms at 128 each lit material was two shaders, and three.js threw away and rebuilt its blur shader at every
      // change of size, 24 times a load. A phone keeps 128 for all.)
      return (rooms[id] = { id, U, users: [], probe, size: 256, K: K[id] || 1.7, env: null });
    }

    /* 1. The room reflects itself, read as if its picture hung on the room's walls (box projection) */
    const ENV = T.ShaderChunk.envmap_physical_pars_fragment.replace('reflectVec = inverseTransformDirection( reflectVec, viewMatrix );',
      'reflectVec = inverseTransformDirection( reflectVec, viewMatrix );\n\t\t\treflectVec = lkBoxDir( vDrawW, reflectVec );');
    const BOXFN = `
      uniform vec3 uLkBoxMin; uniform vec3 uLkBoxMax; uniform vec3 uLkProbe; uniform float uLkFloor;
      vec3 lkBoxDir(vec3 p, vec3 d) {
        vec3 q = clamp(p, uLkBoxMin + 0.02, uLkBoxMax - 0.02);
        vec3 t1 = (uLkBoxMax - q) / d, t2 = (uLkBoxMin - q) / d, tf = max(t1, t2);
        float t = min(min(tf.x, tf.y), tf.z);
        return normalize(q + d * t - uLkProbe);
      }`;
    // the bounce, with some of its colour taken out: one probe sees the sunlit floor far more than a ceiling does
    const MAPS = T.ShaderChunk.lights_fragment_maps.replace('iblIrradiance += getIBLIrradiance( geometryNormal );',
      'vec3 lkIrr = getIBLIrradiance( geometryNormal );\n\t\tiblIrradiance += mix( vec3( dot( lkIrr, vec3( 0.2126, 0.7152, 0.0722 ) ) ), lkIrr, 0.45 );');

    /* 2. Soft corners: where walls meet the floor, the ceiling and each other, from the room's own box. Any room. */
    const CONTACT_ROOM = `
      float lkContact(vec3 p, vec3 n) {
        float ao = 1.0;
        vec2 lo = uLkBoxMin.xz, hi = uLkBoxMax.xz;
        float inside = min(min(p.x - lo.x, hi.x - p.x), min(p.z - lo.y, hi.y - p.z));
        if (n.y > 0.6 && abs(p.y - uLkFloor) < 0.03) ao *= 1.0 - 0.35 * (1.0 - smoothstep(0.0, 0.3, inside));
        if (n.y < -0.6) ao *= 1.0 - 0.32 * (1.0 - smoothstep(0.0, 0.45, inside));
        if (abs(n.y) < 0.4) {
          ao *= 1.0 - 0.3 * (1.0 - smoothstep(0.0, 0.3, p.y - uLkFloor));
          ao *= 1.0 - 0.22 * (1.0 - smoothstep(0.0, 0.4, uLkBoxMax.y - p.y));
          float along = abs(n.x) > abs(n.z) ? min(p.z - lo.y, hi.y - p.z) : min(p.x - lo.x, hi.x - p.x);
          ao *= 1.0 - 0.22 * (1.0 - smoothstep(0.0, 0.35, along));
        }
        return ao;
      }`;
    /* The living room's own, as in the test (v5b): the corners, plus soft dark ground under the sofa's runs, the
       table, the hearth, the planter, the chairs and the side table, and along the pit's sides */
    const ROOM = { x0: 9, y0: 8, x1: 21, y1: 17, pitFloor: -0.45, ceil: 4.5 };
    const LBOX = { min: W(ROOM.x0, ROOM.y0, ROOM.pitFloor), max: W(ROOM.x1, ROOM.y1, ROOM.ceil) };
    const boxes = [
      [12.1, 10.6, 17.9, 11.5, -0.45, 0.14, 0.7], [12.1, 11.5, 13.0, 14.1, -0.45, 0.14, 0.7], [12.1, 14.1, 17.9, 14.9, -0.45, 0.14, 0.7],
      [14.2, 12.3, 16.4, 13.4, -0.425, 0.12, 0.75],
      [9.95, 10.7, 10.9, 14.3, 0, 0.12, 0.55], [9.13, 10.0, 9.95, 15.0, 0, 0.14, 0.5],
    ];
    const discs = [[10.55, 15.75, 0.47, 0, 0.2, 0.6], [20.0, 10.55, 0.24, 0, 0.12, 0.55]];
    const chairs = [[19.7, 9.5, -Math.PI / 2 - 0.25], [19.7, 11.6, -Math.PI / 2 + 0.25]];
    const glslBox = (b) => `ao *= lkOcc(p, n, ${v3(W((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, b[4]))}, vec2(${f((b[2] - b[0]) / 2)}, ${f((b[3] - b[1]) / 2)}), ${f(b[5])}, ${f(b[6])});`;
    const CONTACT_LIVING = `
      float lkBoxSD(vec2 p, vec2 h) { vec2 d = abs(p) - h; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
      float lkOcc(vec3 p, vec3 n, vec3 c, vec2 h, float soft, float k) {
        if (n.y < 0.6 || abs(p.y - c.y) > 0.03) return 1.0;
        float d = lkBoxSD(p.xz - c.xz, h);
        return 1.0 - k * (1.0 - smoothstep(-soft * 0.2, soft, d));
      }
      float lkDisc(vec3 p, vec3 n, vec3 c, float r, float soft, float k) {
        if (n.y < 0.6 || abs(p.y - c.y) > 0.03) return 1.0;
        return 1.0 - k * (1.0 - smoothstep(-soft * 0.2, soft, length(p.xz - c.xz) - r));
      }
      float lkContact(vec3 p, vec3 n) {
        float ao = 1.0;
        ${boxes.map(glslBox).join('\n        ')}
        ${discs.map((d) => `ao *= lkDisc(p, n, ${v3(W(d[0], d[1], d[3]))}, ${f(d[2])}, ${f(d[4])}, ${f(d[5])});`).join('\n        ')}
        ${chairs.map(([x, y, r]) => { const cs = Math.cos(r), sn = Math.sin(r), C = W(x, y);
          return `{ vec2 o = p.xz - vec2(${f(C[0])}, ${f(C[2])}); vec2 l = vec2(o.x * ${f(cs)} - o.y * ${f(sn)}, o.x * ${f(sn)} + o.y * ${f(cs)});
          if (n.y > 0.6 && abs(p.y) < 0.03) ao *= 1.0 - 0.55 * (1.0 - smoothstep(-0.05, 0.28, lkBoxSD(l, vec2(0.4, 0.38)))); }`; }).join('\n        ')}
        if (n.y > 0.6 && abs(p.y - (${f(ROOM.pitFloor)})) < 0.03) {
          ao *= 1.0 - 0.4 * (1.0 - smoothstep(0.0, 0.22, -lkBoxSD(p.xz - ${(() => { const cc = W(15, 12.75); return `vec2(${f(cc[0])}, ${f(cc[2])})`; })()}, vec2(3.0, 2.25))));
          ao *= 1.0 - 0.25 * (1.0 - smoothstep(0.0, 0.04, lkBoxSD(p.xz - ${(() => { const cc = W(15.4, 12.825); return `vec2(${f(cc[0])}, ${f(cc[2])})`; })()}, vec2(2.2, 1.125))));
        }
        vec2 lo = vec2(${f(LBOX.min[0])}, ${f(LBOX.min[2])}), hi = vec2(${f(LBOX.max[0])}, ${f(LBOX.max[2])});
        if (n.y > 0.6 && abs(p.y) < 0.03) ao *= 1.0 - 0.35 * (1.0 - smoothstep(0.0, 0.3, min(min(p.x - lo.x, hi.x - p.x), min(p.z - lo.y, hi.y - p.z))));
        if (n.y < -0.6) ao *= 1.0 - 0.32 * (1.0 - smoothstep(0.0, 0.45, min(min(p.x - lo.x, hi.x - p.x), min(p.z - lo.y, hi.y - p.z))));
        if (abs(n.y) < 0.4) {
          float fl = p.y < -0.02 && p.x > ${f(W(12, 0)[0])} && p.x < ${f(W(18, 0)[0])} && p.z > ${f(W(0, 10.5)[2])} && p.z < ${f(W(0, 15)[2])} ? ${f(ROOM.pitFloor)} : 0.0;
          ao *= 1.0 - 0.3 * (1.0 - smoothstep(0.0, 0.3, p.y - fl));
          ao *= 1.0 - 0.22 * (1.0 - smoothstep(0.0, 0.4, ${f(ROOM.ceil)} - p.y));
          float along = abs(n.x) > abs(n.z) ? min(p.z - lo.y, hi.y - p.z) : min(p.x - lo.x, hi.x - p.x);
          ao *= 1.0 - 0.22 * (1.0 - smoothstep(0.0, 0.35, along));
        }
        return ao;
      }`;
    const END = `
      vec3 lkNC = normalize((vec4(geometryNormal, 0.0) * viewMatrix).xyz);
      float ao = lkContact(vDrawW, lkNC);
      reflectedLight.indirectDiffuse *= ao;
      reflectedLight.indirectSpecular *= mix(1.0, ao, 0.75);
      reflectedLight.directDiffuse *= mix(1.0, ao, 0.3);`;

    /* 3. Relief on the code materials the scans never replaced, which were colour only */
    const RELIEF = {
      pathStone: `
        vec4 g = lkFbm(lkP, 55.0, 0.6, 5, lkPx);
        float pit = smoothstep(0.8, 0.9, lkn(lkP * 150.0)) * lkKeep(0.003, lkPx);
        lkG = g.yzw * 0.00012 + lkSurfGrad(lkWN, dFdx(-0.0005 * pit), dFdy(-0.0005 * pit));
        diffuseColor.rgb *= 1.0 - 0.25 * pit;
        roughnessFactor = clamp(roughnessFactor + 0.2 * pit + 0.08 * g.x, 0.2, 1.0);`,
      basalt: `
        vec4 g = lkFbm(lkP, 80.0, 0.6, 4, lkPx);
        float turn = sin(lkP.y * 1570.0 + 6.0 * lkn(lkP * 20.0)) * lkKeep(0.004, lkPx);
        lkG = g.yzw * 0.00008 + lkSurfGrad(lkWN, dFdx(0.00003 * turn), dFdy(0.00003 * turn));
        roughnessFactor = clamp(roughnessFactor + 0.1 * g.x, 0.2, 1.0);`,
      black: `
        vec2 q; vec3 ta, tb; lkPlane(lkP, lkWN, q, ta, tb);
        vec4 g = lkFbm(vec3(q, 3.0), 120.0, 0.55, 4, lkPx);
        vec4 b = lkFbm(vec3(q * vec2(1.0, 30.0), 5.0), 8.0, 0.6, 3, lkPx);
        lkG = (ta * g.y + tb * g.z) * 0.00006 + (ta * b.y + tb * b.z * 30.0) * 0.00002;
        roughnessFactor = clamp(roughnessFactor + 0.14 * g.x + 0.1 * b.x, 0.25, 0.9);`,
    };

    /* 4. Leaves: light through them from behind, bent toward the crown, and a second pass for their soft edge
       (the page's alpha channel is its paper mask, so no alpha to coverage) */
    const LEAFLIGHT = T.ShaderChunk.lights_physical_pars_fragment.replace('reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );',
      'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n\treflectedLight.directDiffuse += saturate( - dot( geometryNormal, directLight.direction ) ) * directLight.color * BRDF_Lambert( material.diffuseColor ) * vec3( 0.32, 0.4, 0.16 ) * 0.9;');
    const CROWN = `{ vec3 cn = normalize(vDrawW - uLkCrown); vec3 cv = (viewMatrix * vec4(cn, 0.0)).xyz;
      normal = normalize(mix(normal, cv * (dot(cv, normal) < -0.2 ? -1.0 : 1.0), 0.5)); }`;

    function variant(mat, key, room) {
      if (!mat || !mat.isMeshStandardMaterial || key === 'fire' || !mat.userData.drawable) return mat;
      const R = roomData(room), living = room === 'living';
      const c = mat.clone();
      c.onBeforeCompile = mat.onBeforeCompile; c.customProgramCacheKey = mat.customProgramCacheKey;
      c.userData = Object.assign({}, mat.userData, { look: 'room', room });
      // (the finishes that run from room to room take the entrance's strength wherever they are, so the floor's marble reads
      // as one stone through the opening: at the living room's own 1.7 the same slabs read a shade darker and browner than
      // the entrance's 2.5. Sam, 15 Oct: "I like the lighter color from the entrance. So make sure to unify the color")
      c.envMapIntensity = mat.envMapIntensity * (SHARED_K[key] || R.K);
      // (one shader for every room's copy of the same material: the room is in its uniforms, not in its code. Only the
      // living room's own contact shadows, the relief and the leaves change the code. A key per material made 416 shaders)
      const neutral = !!SHARED_K[key];
      const o = { key: (living ? 'roomL' : 'room') + (RELIEF[key] || key === 'leafCard' ? '-' + key : '') + (neutral ? '-n' : ''), uniforms: R.U,
        chunks: { envmap_physical_pars_fragment: BOXFN + '\n' + ENV, lights_fragment_maps: MAPS }, head: living ? CONTACT_LIVING : CONTACT_ROOM, end: END + (neutral ? NEUTRAL_END : '') };
      if (RELIEF[key]) o.surface = RELIEF[key];
      // (the bird of paradise's leaves take the light through them from behind too, since the night of 15 to 16 Oct)
      if (key === 'strelLeaf') { o.chunks.lights_physical_pars_fragment = LEAFLIGHT; o.key += '-strel'; }
      if (key === 'leafCard') {
        o.chunks.lights_physical_pars_fragment = LEAFLIGHT;
        o.head += 'uniform vec3 uLkCrown;';
        o.alpha = 'lkAlpha = diffuseColor.a;';
        o.surface = ''; o.normal = CROWN; o.end = null;
      }
      overlay(c, o);
      if (key === 'leafCard') {
        const e = c.clone();
        e.onBeforeCompile = c.onBeforeCompile; e.customProgramCacheKey = c.customProgramCacheKey;
        e.userData = Object.assign({}, c.userData);
        e.alphaTest = 0.03; e.transparent = true; e.depthWrite = false;
        Object.assign(e, { blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.SrcAlphaFactor, blendDst: T.OneMinusSrcAlphaFactor,
          blendSrcAlpha: T.ZeroFactor, blendDstAlpha: T.OneMinusSrcAlphaFactor });
        overlay(e, { key: 'edge', last: 'if (lkAlpha >= 0.5) discard; gl_FragColor.a = clamp(lkAlpha * 2.0, 0.0, 1.0);' });
        c.userData.edge = e; R.users.push(e);
      }
      R.users.push(c);
      return c;
    }

    /* Each room's picture: six views from its middle, taken while the page loads, with the whole house (and what you
       see from it) forced real for that moment, the fire and the nearest lamps lit. Every room once with the sky's
       light on its materials, then every room again with the first pictures on them: light that bounced twice. */
    function capture(ctx, I) {
      const ids = Object.keys(rooms);
      if (!ids.length) return;
      const t0 = performance.now();
      const r = ctx.renderer, scene = ctx.scene, RU = A.RU;
      const rts = {}, cams = {};
      const was = { rv: RU.uRV.value.slice(), xv: RU.uXV.value, cut: RU.uCutY.value, on: RU.uCutOn.value, roll: RU.uRoll.value.clone(), paper: I.skyMat.uniforms.paper.value };
      RU.uRV.value.fill(1); RU.uXV.value = 1; RU.uCutY.value = 1e5; RU.uCutOn.value = 0; RU.uRoll.value.set(1, 0, -1e6); I.skyMat.uniforms.paper.value = 0;
      const caps = I.capMeshes.map((m) => m.visible); I.capMeshes.forEach((m) => { m.visible = false; });
      const slots = I.lampSlots.map((s) => ({ l: s.l, p: s.l.position.clone(), c: s.l.color.clone(), i: s.l.intensity, d: s.l.distance, k: s.l.decay }));
      const fire = I.M.fire.emissiveIntensity;
      I.M.fire.emissiveIntensity = 2.2 * 0.75;
      const pm = new T.PMREMGenerator(r);
      const passes = [];
      // (what a room cannot really see, or only as a speck through its glass: 22,000 tufts of grass, 4,600 far woods and the
      // grove's leaf cards cost most of each view)
      const away = [];
      (I.zones.ext || []).forEach((m) => { if (m.isInstancedMesh && m.visible) { away.push(m); m.visible = false; } });
      // The six views are drawn into a buffer of the scene's own kind (half float, the scene's samples, a depth buffer), then
      // copied into the cube face by face. Metal builds a shader once for each kind of buffer it draws into: drawn straight
      // into the cube, every material of the house was built a second time for the cube, 82 of them, 8 s of a first
      // visit (15 Oct). The scene, the bath's mirror and the pool's mirror already share one kind.
      const flat = {}, samples = ctx.post && ctx.post.rtScene ? ctx.post.rtScene.samples : 0;
      const copy = new T.Mesh(new T.PlaneGeometry(2, 2), new T.ShaderMaterial({ uniforms: { t: { value: null } }, depthTest: false, depthWrite: false, blending: T.NoBlending,
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main() { gl_FragColor = texture2D(t, vUv); }' }));
      copy.frustumCulled = false;
      const copyScene = new T.Scene(), copyCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      copyScene.add(copy);
      const shoot = (size, cam, cube) => {
        if (cam.coordinateSystem !== r.coordinateSystem) { cam.coordinateSystem = r.coordinateSystem; cam.updateCoordinateSystem(); }
        cam.updateMatrixWorld(true);
        const f = flat[size] || (flat[size] = new T.WebGLRenderTarget(size, size, { type: T.HalfFloatType, samples, depthBuffer: true }));
        cam.children.forEach((c, i) => {
          r.setRenderTarget(f); r.render(scene, c);
          copy.material.uniforms.t.value = f.texture;
          r.setRenderTarget(cube, i); r.render(copyScene, copyCam);
        });
        r.setRenderTarget(null);
      };
      r.shadowMap.needsUpdate = true;
      for (let pass = 0; pass < 2; pass++) {
        const tp = performance.now();
        ids.forEach((id) => {
          const R = rooms[id], size = ctx.LOW ? Math.min(128, R.size) : R.size;
          if (!rts[size]) { rts[size] = new T.WebGLCubeRenderTarget(size, { type: T.HalfFloatType, generateMipmaps: false }); cams[size] = new T.CubeCamera(0.05, 8000, rts[size]); }
          // the lamps nearest the room's middle, as bright as they are when you stand there (a fire at its middle flicker)
          const near = I.stage.lights.map((o) => ({ o, d: Math.hypot(o.x - R.probe[0], o.y - R.probe[1], o.z - R.probe[2]) }))
            .filter((e) => e.d < (e.o.far || e.o.dist * 1.5 + 4)).sort((a, b) => a.d - b.d).slice(0, slots.length);
          slots.forEach((s, i) => { const e = near[i]; s.l.intensity = 0; if (!e) return;
            s.l.position.set(e.o.x, e.o.y, e.o.z); s.l.color.setHex(e.o.color); s.l.distance = e.o.dist; s.l.decay = e.o.decay;
            s.l.intensity = e.o.k * (e.o.fire === 'hearth' ? 0.75 : e.o.fire ? 0.8 : 1); });
          cams[size].position.set(...R.probe);
          shoot(size, cams[size], rts[size]);
          R.next = pm.fromCubemap(rts[size].texture);
        });
        ids.forEach((id) => { const R = rooms[id]; R.users.forEach((m) => { m.envMap = R.next.texture; m.needsUpdate = true; }); if (R.env) R.env.dispose(); R.env = R.next; R.next = null; });
        r.getContext().finish(); passes.push(Math.round(performance.now() - tp));
      }
      pm.dispose(); Object.values(rts).forEach((rt) => rt.dispose()); Object.values(flat).forEach((rt) => rt.dispose());
      away.forEach((m) => { m.visible = true; });
      RU.uRV.value.forEach((x, i) => { RU.uRV.value[i] = was.rv[i]; }); RU.uXV.value = was.xv; RU.uCutY.value = was.cut; RU.uCutOn.value = was.on; RU.uRoll.value.copy(was.roll);
      I.skyMat.uniforms.paper.value = was.paper;
      I.capMeshes.forEach((m, i) => { m.visible = caps[i]; });
      slots.forEach((s) => { s.l.position.copy(s.p); s.l.color.copy(s.c); s.l.intensity = s.i; s.l.distance = s.d; s.l.decay = s.k; });
      I.M.fire.emissiveIntensity = fire;
      copy.geometry.dispose(); copy.material.dispose();
      r.shadowMap.needsUpdate = true;
      r.getContext().finish();
      window.__look = { rooms: ids, ms: performance.now() - t0, passes };
      if (window.__bootT) window.__bootT.capture = Math.round(performance.now());
    }

    /* Before the capture: the shaders of every lit material as they will be once their room's picture is on them, sent
       to the graphics card side by side with the rest (scene.js, warmShaders). A picture's size is part of its shader, so
       a small room's 128 picture is another shader than the sky's 256 one, and until 15 Oct it was built while everything
       waited, at the first draw of the second pass. A stand-in of the right size is enough for that: nothing is drawn. */
    async function warm(ctx) {
      if (!ctx.warmShaders) return;
      const fakes = {}, was = [];
      Object.values(rooms).forEach((R) => {
        const size = ctx.LOW ? Math.min(128, R.size) : R.size;
        let fk = fakes[size];
        if (!fk) { fk = fakes[size] = new T.Texture(); fk.mapping = T.CubeUVReflectionMapping; fk.image = { width: 3 * Math.max(size, 112), height: 4 * size }; }
        R.users.forEach((m) => { was.push([m, m.envMap]); m.envMap = fk; });
      });
      await ctx.warmShaders();
      was.forEach(([m, e]) => { m.envMap = e; m.needsUpdate = true; });
      if (window.__bootT) window.__bootT.litWarm = Math.round(performance.now());
    }

    return {
      variant,
      async build(ctx, I) {
        // the leaves of a lit room: where their crown is, and their edge pass
        ctx.scene.traverse((o) => {
          if (!o.isInstancedMesh || !o.material || !o.material.userData.edge) return;
          const R = rooms[o.material.userData.room]; if (!R) return;
          const v = new T.Vector3(), m4 = new T.Matrix4(), c = new T.Vector3();
          for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m4); c.add(v.setFromMatrixPosition(m4)); }
          R.U.uLkCrown.value.copy(c.multiplyScalar(1 / Math.max(1, o.count)));
          const e = new T.InstancedMesh(o.geometry, o.material.userData.edge, o.count);
          e.instanceMatrix = o.instanceMatrix; e.instanceColor = o.instanceColor;
          e.castShadow = false; e.receiveShadow = true; e.userData.noPrepass = true; e.renderOrder = 2; e.frustumCulled = o.frustumCulled;
          o.parent.add(e);
          Object.keys(I.zones).forEach((z) => { if (I.zones[z].includes(o)) I.zones[z].push(e); });
        });
        await warm(ctx);
        capture(ctx, I);
      },
    };
  })();

  /* ---------- the bake (?bake=) ----------
     Every baked material's faces, read from its triangles: each triangle goes to the plane its pattern lies in (by the
     way it faces, as lkPlane decides), and triangles whose rectangles in that plane overlap become one face. The two
     long concrete walls lie in the same plane (z, y) and over the same rectangle, so they share one face, as they share
     one pattern in the rule. Then the memory is shared out by area and by how fine each material wants to be. */
  function bakeAll(ctx) {
    if (!bakedMats.size) return;
    const t0 = performance.now(), AX = CM.BK_AXES, TOL = 0.03;
    const byKey = new Map();
    const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), e1 = new T.Vector3(), e2 = new T.Vector3(), n = new T.Vector3();
    ctx.scene.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || !o.material || Array.isArray(o.material) || !o.material.userData.bake) return;
      const B = o.material.userData.bake, local = B.src.local;
      let e = byKey.get(B); if (!e) byKey.set(B, (e = { B, mat: bakedMats.get(B.mkey), rects: [[], [], []] }));
      o.updateMatrixWorld(true);
      const g = o.geometry, pos = g.attributes.position, idx = g.index, mw = o.matrixWorld;
      const tris = (idx ? idx.count : pos.count) / 3, vi = (t, k) => (idx ? idx.getX(t * 3 + k) : t * 3 + k);
      for (let t = 0; t < tris; t++) {
        a.fromBufferAttribute(pos, vi(t, 0)); b.fromBufferAttribute(pos, vi(t, 1)); c.fromBufferAttribute(pos, vi(t, 2));
        if (!local) { a.applyMatrix4(mw); b.applyMatrix4(mw); c.applyMatrix4(mw); }
        // (below the ground: the slab's edge, seen only in the cut from far above, stays with the rule)
        if (!local && Math.max(a.y, b.y, c.y) < -0.02) continue;
        n.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a));
        const ln = n.length(); if (ln < 1e-8) continue;
        const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
        const axis = ay >= ax && ay >= az ? 0 : ax >= az ? 1 : 2;
        const [ta, tb, nn] = AX[axis];
        const uv = [a, b, c].map((p) => [p.x * ta[0] + p.y * ta[1] + p.z * ta[2], p.x * tb[0] + p.y * tb[1] + p.z * tb[2]]);
        const r = [Math.min(...uv.map((q) => q[0])), Math.min(...uv.map((q) => q[1])), Math.max(...uv.map((q) => q[0])), Math.max(...uv.map((q) => q[1]))];
        r.off = (a.x + b.x + c.x) / 3 * nn[0] + (a.y + b.y + c.y) / 3 * nn[1] + (a.z + b.z + c.z) / 3 * nn[2];
        r.area = ln / 2;
        e.rects[axis].push(r);
      }
    });
    const hit = (p, q) => p[0] <= q[2] + TOL && q[0] <= p[2] + TOL && p[1] <= q[3] + TOL && q[1] <= p[3] + TOL;
    const join = (p, q) => { p[0] = Math.min(p[0], q[0]); p[1] = Math.min(p[1], q[1]); p[2] = Math.max(p[2], q[2]); p[3] = Math.max(p[3], q[3]); };
    const jobs = [];
    byKey.forEach((e) => {
      const faces = [];
      e.rects.forEach((list, axis) => {
        const cl = [];
        list.forEach((r) => { const k = cl.find((q) => hit(q, r)); if (k) { join(k, r); k.area += r.area; } else { const q = r.slice(0, 4); q.off = r.off; q.area = r.area; cl.push(q); } });
        for (let again = true; again;) {
          again = false;
          for (let i = 0; i < cl.length && !again; i++) for (let j = i + 1; j < cl.length; j++) if (hit(cl[i], cl[j])) { join(cl[i], cl[j]); cl[i].area += cl[j].area; cl.splice(j, 1); again = true; break; }
        }
        // (a face that is mostly empty, the tops of walls chained round a room into one rectangle of 12 by 9 m, stays with
        // the rule: a tenth of it would be drawn, all of it would be paid for)
        cl.forEach((q) => { const ra = (q[2] - q[0]) * (q[3] - q[1]); if (ra > 1 && q.area < 0.3 * ra) return;
          faces.push({ axis, off: q.off, r: [q[0], q[1], Math.max(q[2] - q[0], 0.01), Math.max(q[3] - q[1], 0.01)] }); });
      });
      // (more faces than the shader reads: the smallest join the nearest of their plane)
      faces.sort((p, q) => q.r[2] * q.r[3] - p.r[2] * p.r[3]);
      while (faces.length > 8) {
        const s = faces.pop(), k = faces.find((q) => q.axis === s.axis) || faces[0];
        const r = [Math.min(k.r[0], s.r[0]), Math.min(k.r[1], s.r[1]), Math.max(k.r[0] + k.r[2], s.r[0] + s.r[2]), Math.max(k.r[1] + k.r[3], s.r[1] + s.r[3])];
        if (k.axis === s.axis) k.r = [r[0], r[1], r[2] - r[0], r[3] - r[1]];
      }
      jobs.push({ e, faces, area: faces.reduce((s, q) => s + q.r[2] * q.r[3], 0), f: BAKEABLE[e.B.mkey] || 1 });
    });
    // the memory: texels = budget / (8 bytes and a third more for the mipmaps), shared so that a texel's size is t0 times f
    const budget = (Number(Q.get('bakemb')) || (bakeKeys ? 96 : 256)) * 1048576, texels = budget / (8 * 4 / 3);
    // (texels counted with each face's 16 texel border and a sixth more for the packing, settled in a few rounds)
    const need = (t) => jobs.reduce((s, j) => s + 1.17 * j.faces.reduce((a, q) => a + (q.r[2] / (t * j.f) + 32) * (q.r[3] / (t * j.f) + 32), 0), 0);
    let t0m = Math.sqrt(jobs.reduce((s, j) => s + j.area / (j.f * j.f), 0) / texels);
    for (let i = 0; i < 6; i++) t0m *= Math.sqrt(need(t0m) / texels);
    let bytes = 0;
    const out = {};
    jobs.forEach((j) => {
      const tx = Math.max(0.0004, t0m * j.f);
      bytes += CM.bake(ctx.renderer, j.e.mat, j.faces, tx, BAKE_SCALE[j.e.B.mkey] || 1);
      out[j.e.B.mkey] = { faces: j.faces.map((q) => q.axis + ':' + q.r.map((x) => x.toFixed(2)).join(',')), mm: +(j.e.B.tx * 1000).toFixed(2), size: j.e.B.size };
    });
    ctx.renderer.getContext().finish();
    window.__bake = { ms: Math.round(performance.now() - t0), mb: Math.round(bytes / 1048576), mats: out };
  }

  window.LINTEL_HOUSE = {
    code, lit, allCode: code.includes('all'),
    materials(a) { A = a; CM.init(a); ROOMS = a.ROOMS; ROOMS.forEach((r) => { RM[r.id] = r; }); },
    split,
    // staging.js, pillowGeo: a cushion in a room that wears code carries its thickness in its UV, for its seam and piping
    pillowUv(g, cx, cy, mat) {
      if (!inCode(roomAt(cx, cy)) || !CM.has(mat)) return null;
      const p = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getZ(i), 1000);
      uv.needsUpdate = true;
      return g;
    },
    async build(ctx, I) {
      // the code leaves' shadows: the sprigs, not their cards
      if (CM.leafDepth) ctx.scene.traverse((o) => { if (o.isInstancedMesh && o.material && o.material.userData.sprig) o.customDepthMaterial = CM.leafDepth; });
      bakeAll(ctx);
      await LIGHT.build(ctx, I);
    },
    frame() {},
  };
})();
