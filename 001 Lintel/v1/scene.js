/* ==========================================================================
   Lintel / Casa Serra
   Concept: every building starts flat, so the page does too.

   The house is a blockout (bevelled boxes) dressed in real scanned materials.
   Every material is patched so it can also be a drawing: until its reveal
   passes, a surface writes "paper" (alpha 1) plus its architectural hatch,
   and the finish pass shows paper and ink lines there. Each reveal is a
   sphere growing from the point where the material swatch lands, with a thin
   oxide-red construction line on its front.
   ========================================================================== */
(function () {
  'use strict';

  const V3 = THREE.Vector3;
  const DEG = Math.PI / 180;
  const TEX = '../../assets/tex/';
  const SKY = '../../assets/sky/';
  const ACCENT = new THREE.Color('#b8452a');

  /* ---------- reveal groups ------------------------------------------------ */
  const group = (origin, len) => ({ reveal: { value: 0 }, origin: { value: origin }, len: { value: len } });
  const G = {
    concrete: group(new V3(9.5, 5.6, 0.62), 30),
    stone: group(new V3(-1.2, 0.46, 3.2), 26),
    timber: group(new V3(-11, 6.4, -1.95), 12),
    glass: group(new V3(-2, 2.2, -0.4), 14),
    env: group(new V3(0, 0, -1), 700),
  };
  const HATCH = { none: 0, concrete: 1, stone: 2, timber: 3, glass: 4, water: 5, oak: 6 };

  // Patch a standard material so it can be paper until its group reveals it.
  function drawable(mat, g, hatch, opts) {
    opts = opts || {};
    const h = HATCH[hatch] || 0;
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uReveal = g.reveal;
      sh.uniforms.uOrigin = g.origin;
      sh.uniforms.uLen = g.len;
      sh.uniforms.uAccent = { value: ACCENT };
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
        #define DRAWABLE 1
        #define HATCH ${h}
        ${opts.flat ? '#define FLAT_REVEAL' : ''}
        ${opts.glass ? '#define GLASS' : ''}
        varying vec3 vDrawW;
        uniform float uReveal; uniform vec3 uOrigin; uniform float uLen; uniform vec3 uAccent; uniform float uGlassOp; uniform float uSat; uniform float uMacro;
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
            float stip = step(0.992, dh(floor(q * 55.0))) * 0.55;
            return horiz ? stip * 0.4 : max(ties * 0.9, stip);
          #elif HATCH == 2
            float a = lineAA(q.y, 0.6, 1.0);
            float b = lineAA(q.x + step(0.5, fract(q.y / 1.2)) * 0.6, 1.2, 1.0);
            return horiz ? max(lineAA(q.x, 1.2, 1.0), lineAA(q.y, 0.6, 1.0)) * 0.35 : max(a, b) * 0.6;
          #elif HATCH == 3
            return horiz ? 0.0 : lineAA(q.x, 0.16, 1.0) * 0.8;
          #elif HATCH == 4
            float d = q.x - q.y * 0.85;
            return clamp(lineAA(d, 2.4, 1.2) + lineAA(d + 0.3, 2.4, 1.0), 0.0, 1.0) * 0.55;
          #elif HATCH == 5
            return lineAA(q.y + sin(q.x * 1.3) * 0.05, 0.45, 1.0) * 0.4;
          #elif HATCH == 6
            return lineAA(q.x, 0.12, 1.0) * 0.5;
          #else
            return 0.0;
          #endif
        }
      ` + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114))), diffuseColor.rgb, uSat);
        diffuseColor.rgb *= 1.0 + uMacro * ((vn(vDrawW * 0.35) - 0.5) * 0.9 + (vn(vDrawW * 1.7) - 0.5) * 0.35);`).replace('#include <dithering_fragment>', `#include <dithering_fragment>
        {
          vec3 wn = normalize((vec4(vNormal, 0.0) * viewMatrix).xyz);
          #ifdef FLAT_REVEAL
            float dA = distance(vDrawW.xz, uOrigin.xz);
          #else
            float dA = distance(vDrawW, uOrigin);
          #endif
          float front = uReveal * uLen;
          float soft = 0.03 + uLen * 0.002;
          float revealed = uReveal >= 0.999 ? 1.0 : 1.0 - smoothstep(front - soft, front + soft, dA);
          float ring = (1.0 - smoothstep(0.0, max(fwidth(dA) * 1.6, 0.012), abs(dA - front))) * step(0.001, uReveal) * step(uReveal, 0.998);
          float paper = 1.0 - revealed;
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
        }`);
    };
    mat.customProgramCacheKey = () => `draw-${h}-${opts.flat ? 1 : 0}-${opts.glass ? 1 : 0}-${mat.map ? 1 : 0}`;
    return mat;
  }

  /* ---------- camera keys --------------------------------------------------
     hero and plate: a 3 degree lens from 570 m away, camera at ground level,
     which is as close to a true orthographic elevation as a perspective
     camera gets. The ground plane then collapses onto the ground line. */
  const KEYS = [
    { id: 'hero', t: [-8, 10, 0], yaw: 0, pitch: -0.72, fov: 3, frame: 40, roll: 0, hold: 36, go: 190 },
    { id: 'open', t: [0.5, 3.6, -1], yaw: 30, pitch: 15, fov: 50, dist: 40, roll: 0, go: 120 },
    { id: 'd1', t: [9.2, 5.3, 0.4], yaw: -20, pitch: -15, fov: 52, dist: 12.5, roll: 2, hold: 100, go: 110 },
    { id: 'd2', t: [-0.8, 0.9, 2.6], yaw: 38, pitch: 7, fov: 54, dist: 9.5, roll: -1.5, hold: 100, go: 110 },
    { id: 'd3', t: [-11, 5.6, -2], yaw: -38, pitch: -7, fov: 50, dist: 13, roll: -3, hold: 100, go: 120 },
    { id: 'd4', t: [0.5, 3.3, -1], yaw: 24, pitch: 6, fov: 44, dist: 31, roll: 0, hold: 110, go: 110 },
    { id: 'beat', t: [1, 3.6, -2], yaw: -32, pitch: 11, fov: 40, dist: 44, roll: 0, hold: 70, go: 180 },
    { id: 'plate', t: [-8, 10, 0], yaw: 0, pitch: -0.72, fov: 3, frame: 40, roll: 0, hold: 60 },
  ];

  const DOSSIERS = [
    {
      no: '01', kicker: 'Material', key: 'd1', anchor: 'concrete', title: ['Board-marked', 'concrete'], meta: 'A-201 <b>·</b> 20 mm pine formwork <b>·</b> open file +',
      label: { type: 'world', R: [1, 0, 0], U: [0, 1, 0], off: [0.8, 1.1] },
      fileMeta: 'Casa Serra · south elevation · A-201',
      text: 'Poured in four lifts against rough-sawn pine. The boards were used once, then became the fence along the lane.',
      facts: [['Formwork', '20 mm Scots pine'], ['Lifts', 'Four'], ['Cantilever', '9.2 m, no column']],
    },
    {
      no: '02', kicker: 'Material', key: 'd2', anchor: 'stone', title: ['Honed', 'travertine'], meta: 'A-305 <b>·</b> 30 mm, unfilled <b>·</b> open file +',
      label: { type: 'camera', tilt: 14, off: [0.9, 1.3] },
      fileMeta: 'Casa Serra · terrace and pool · A-305',
      text: 'The same stone as the step at the old station. Left unfilled, so the rain has somewhere to go.',
      facts: [['Finish', 'Honed, unfilled'], ['Slab', '600 x 1200 x 30 mm'], ['Pool edge', 'Overflow, 1.2 m']],
    },
    {
      no: '03', kicker: 'Material', key: 'd3', anchor: 'timber', title: ['Charred', 'larch'], meta: 'A-410 <b>·</b> burnt on site <b>·</b> open file +',
      label: { type: 'world', R: [1, 0, 0], U: [0, 1, 0], off: [-6.6, 0.6] },
      fileMeta: 'Casa Serra · stair core · A-410',
      text: 'Larch boards charred on site in April. Black on the day, silver in ten years, still standing in eighty.',
      facts: [['Timber', 'Siberian larch'], ['Board', '140 mm, open joint'], ['Char depth', '3 mm']],
    },
    {
      no: '04', kicker: 'Material', key: 'd4', anchor: 'glass', title: ['Bronze', 'and light'], meta: 'A-512 <b>·</b> the last thing we draw <b>·</b> open file +',
      label: { type: 'camera', tilt: -12, off: [3.2, 3.8] },
      fileMeta: 'Casa Serra · glazing · A-512',
      text: 'The last thing we draw is the light. The frames darken to the colour of the core, and after a season the glass is the only thing you do not notice.',
      facts: [['Frames', 'Phosphor bronze'], ['Glazing', 'Low-iron, 3.4 m tall'], ['Sunset, 21 June', '21:04']],
    },
  ];

  /* ---------- the build ----------------------------------------------------- */
  let interiorLight, skyMat, levelsEl, swatchEls = [];
  const ridges = [];

  async function build(ctx) {
    const { scene, renderer, loader } = ctx;
    const R = FX.rng(412);
    renderer.setClearColor(0xefebe2, 1);

    // sun from the front left, low, raking across the south face
    const sk = await loader.sky(SKY + 'kloofendal_38d_partly_cloudy_puresky_1k.hdr', SKY + 'kloofendal_38d_partly_cloudy_puresky.jpg',
      { sunAzimuth: Math.atan2(0.62, -0.78) });                  // (x, z) = (-0.78, 0.62): front left
    scene.environment = sk.env;

    const [conc, trav, planks, oak, gravel, rock, grass] = await Promise.all([
      loader.set(TEX + 'wood_textured_concrete'), loader.set(TEX + 'marble_01'), loader.set(TEX + 'black_painted_planks'),
      loader.set(TEX + 'oak_wood_planks'), loader.set(TEX + 'gravel_floor_02'), loader.set(TEX + 'rock_boulder_dry'), loader.set(TEX + 'withered_grass'),
    ]);

    /* materials */
    const M = {
      concrete: drawable(FX.pbr(conc, { size: 1.8, color: 0xd4d6d6, normal: 1.3, env: 0.7, rotate: Math.PI / 2 }), G.concrete, 'concrete', { sat: 0.25, macro: 0.5 }),
      oak: drawable(FX.pbr(oak, { size: 1.2, color: 0xe8d2b8, env: 0.8 }), G.concrete, 'oak'),
      travertine: drawable(FX.pbr(trav, { size: 1.5, color: 0xfaf6f0, env: 0.7, normal: 0.8 }), G.stone, 'stone', { sat: 0.55, macro: 0.25 }),
      larch: drawable(FX.pbr(planks, { size: 1.6, color: 0xb5b2ae, env: 0.9, normal: 1.3 }), G.timber, 'timber'),
      bronze: drawable(new THREE.MeshStandardMaterial({ color: 0x4a3626, metalness: 0.85, roughness: 0.38, envMapIntensity: 1.1 }), G.glass, 'none'),
      glass: drawable(new THREE.MeshStandardMaterial({ color: 0x0b0f11, metalness: 0, roughness: 0.04, envMapIntensity: 1.6, transparent: true, depthWrite: false }), G.glass, 'glass', { glass: true, glassOpacity: 0.28 }),
      ribbon: drawable(new THREE.MeshStandardMaterial({ color: 0x14191c, metalness: 0.1, roughness: 0.05, envMapIntensity: 1.5 }), G.concrete, 'glass'),
      water: drawable(new THREE.MeshStandardMaterial({ color: 0x0a1c1f, metalness: 0, roughness: 0.06, envMapIntensity: 0.9 }), G.stone, 'water'),
      oakInt: drawable(FX.pbr(oak, { size: 1.2, color: 0xd8b894, env: 0.5 }), G.glass, 'none'),
      fabric: drawable(new THREE.MeshStandardMaterial({ color: 0x8c7b68, roughness: 0.95 }), G.glass, 'none'),
      lamp: drawable(new THREE.MeshStandardMaterial({ color: 0x2a2520, emissive: 0xffc58a, emissiveIntensity: 0, roughness: 0.6 }), G.glass, 'none'),
      gravel: drawable(FX.pbr(gravel, { size: 2, color: 0xd9d4ca, env: 0.6 }), G.env, 'none', { flat: true, sat: 0.4, macro: 0.3 }),
      grass: drawable(FX.pbr(grass, { size: 2.4, color: 0xc7c2a8, env: 0.5, vertexColors: true }), G.env, 'none', { flat: true, sat: 0.6, macro: 0.6 }),
      rock: drawable(FX.pbr(rock, { size: 1.8, color: 0xa9a399, env: 0.6 }), G.env, 'none', { flat: true, sat: 0.5 }),
      finConc: drawable(FX.pbr(conc, { size: 1.8, color: 0xcfd1d1, normal: 1.3, env: 0.7, rotate: Math.PI / 2 }), G.concrete, 'concrete', { sat: 0.25, macro: 0.5 }),
    };
    // glass keeps the paper mask of whatever is behind it
    Object.assign(M.glass, { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor });
    M.lamp.userData.isLamp = true;

    const house = new THREE.Group();
    scene.add(house);
    const B = new FX.Batch();
    const at = (x, y, z) => FX.M(x, y, z);
    const box = (mat, w, h, d, x, y, z, r) => B.add(mat, FX.bevelBox(w, h, d, r == null ? 0.02 : r), at(x, y, z));

    // plinth with a pool cut into its right-hand end
    box(M.travertine, 19, 0.45, 13, -3.5, 0.225, -1.5, 0.01);             // x -13..6
    box(M.travertine, 8.5, 0.45, 7, 10.25, 0.225, -4.5, 0.01);            // behind pool
    box(M.travertine, 8.5, 0.45, 1.2, 10.25, 0.225, 4.4, 0.01);           // front coping
    box(M.travertine, 1, 0.45, 4.8, 14, 0.225, 1.4, 0.01);                // right coping
    box(M.travertine, 6, 0.15, 1.2, -1, 0.075, 5.6, 0.01);                // steps
    box(M.travertine, 6, 0.3, 0.8, -1, 0.15, 5.4, 0.01);
    const ripple = FX.canvasTex(256, 256, (g, w, h) => {
      const img = g.createImageData(w, h), hf = (x, y) => Math.sin(x * 0.19 + Math.sin(y * 0.07) * 2) * 0.5 + Math.sin(y * 0.23 + x * 0.05) * 0.5 + Math.sin((x + y) * 0.11) * 0.3;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dx = hf(x + 1, y) - hf(x - 1, y), dy = hf(x, y + 1) - hf(x, y - 1);
        const i = (y * w + x) * 4; img.data[i] = 128 - dx * 40; img.data[i + 1] = 128 - dy * 40; img.data[i + 2] = 255; img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }, { repeat: true, linear: true });
    M.water.normalMap = ripple; M.water.normalScale.set(0.25, 0.25); ripple.repeat.set(0.5, 0.5);
    const water = new THREE.Mesh(FX.plane(7.5, 4.8), M.water);
    water.rotation.x = -Math.PI / 2; water.position.set(9.75, 0.39, 1.4);
    water.receiveShadow = true; house.add(water);
    box(M.travertine, 7.5, 0.05, 4.8, 9.75, 0.03, 1.4, 0.005);

    // upper bar: board-marked concrete, a ribbon window, an oak soffit
    const BY0 = 3.85, BY1 = 7.25;
    box(M.concrete, 26, BY1 - BY0, 7.3, 1, (BY0 + BY1) / 2, -3.35, 0.03);   // core of the bar, z -7..0.3
    box(M.concrete, 26, 0.85, 0.3, 1, BY0 + 0.425, 0.45, 0.02);            // front skin below the window
    box(M.concrete, 26, 0.85, 0.3, 1, BY1 - 0.425, 0.45, 0.02);            // above
    box(M.concrete, 5, 1.7, 0.3, -9.5, 5.55, 0.45, 0.02);                  // left pier
    box(M.concrete, 7, 1.7, 0.3, 10.5, 5.55, 0.45, 0.02);                  // right pier
    const rib = new THREE.Mesh(FX.plane(14, 1.7), M.ribbon);
    rib.position.set(0, 5.55, 0.31); house.add(rib);
    for (let i = 0; i <= 7; i++) box(M.bronze, 0.05, 1.7, 0.08, -7 + i * 2, 5.55, 0.33, 0.005);
    const soffit = new THREE.Mesh(FX.plane(26, 7.6), M.oak);
    soffit.rotation.x = Math.PI / 2; soffit.position.set(1, BY0 - 0.004, -3.2);
    soffit.receiveShadow = true; house.add(soffit);

    // charred larch stair core, rising through the bar
    box(M.larch, 4, 9.15, 5, -11, 0.45 + 9.15 / 2, -4.5, 0.02);

    // glass pavilion under the bar
    const PX0 = -9, PX1 = 5, PZ = -0.4, PY0 = 0.45;
    const gl = (w, h, x, y, z, ry) => { const m = new THREE.Mesh(FX.plane(w, h), M.glass); m.position.set(x, y, z); m.rotation.y = ry || 0; m.renderOrder = 2; house.add(m); return m; };
    gl(PX1 - PX0, BY0 - PY0, (PX0 + PX1) / 2, (PY0 + BY0) / 2, PZ);
    gl(6, BY0 - PY0, PX1, (PY0 + BY0) / 2, -3.4, Math.PI / 2);
    for (let i = 0; i <= 7; i++) box(M.bronze, 0.06, BY0 - PY0, 0.1, PX0 + i * 2, (PY0 + BY0) / 2, PZ, 0.005);
    box(M.bronze, PX1 - PX0, 0.08, 0.14, (PX0 + PX1) / 2, PY0 + 0.04, PZ, 0.005);
    box(M.bronze, PX1 - PX0, 0.1, 0.14, (PX0 + PX1) / 2, BY0 - 0.05, PZ, 0.005);
    box(M.bronze, 0.08, BY0 - PY0, 6, PX1, (PY0 + BY0) / 2, -3.4, 0.005);
    // interior: its own floor (so the paper mask behind the glass matches the glass), oak back wall, table, pendant, sofa, painting
    const floorMat = drawable(FX.pbr(trav, { size: 1.5, color: 0xe9e3d9, env: 0.5, normal: 0.6 }), G.glass, 'none');
    const inFloor = new THREE.Mesh(FX.plane(PX1 - PX0 - 0.1, 5.9), floorMat);
    inFloor.rotation.x = -Math.PI / 2; inFloor.position.set((PX0 + PX1) / 2, PY0 + 0.004, -3.4); inFloor.receiveShadow = true; house.add(inFloor);
    const back = new THREE.Mesh(FX.plane(PX1 - PX0, BY0 - PY0), M.oakInt);
    back.position.set((PX0 + PX1) / 2, (PY0 + BY0) / 2, -6.35); back.receiveShadow = true; house.add(back);
    box(M.oakInt, 4.2, 0.06, 1.1, -3, 1.2, -3.6, 0.01);
    box(M.oakInt, 0.08, 0.72, 0.9, -4.8, 0.81, -3.6, 0.005);
    box(M.oakInt, 0.08, 0.72, 0.9, -1.2, 0.81, -3.6, 0.005);
    box(M.fabric, 2.8, 0.42, 0.95, 2.3, 0.66, -5.2, 0.08);
    box(M.fabric, 2.8, 0.45, 0.2, 2.3, 1.05, -5.62, 0.06);
    const lampM = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.26, 32, 1, true), M.lamp);
    lampM.position.set(-3, 2.55, -3.6); house.add(lampM);
    box(M.bronze, 0.015, 1.05, 0.015, -3, 3.2, -3.6, 0.002);
    const paintTex = FX.canvasTex(512, 640, (g, w, h) => {
      g.fillStyle = '#e8dccb'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#b8452a'; g.fillRect(40, 60, w - 80, h * 0.46);
      g.fillStyle = '#231e1a'; g.fillRect(40, h * 0.58, w - 80, h * 0.34);
      g.globalAlpha = 0.12; for (let i = 0; i < 900; i++) { g.fillStyle = i % 2 ? '#fff' : '#000'; g.fillRect(Math.random() * w, Math.random() * h, 2, 12); }
    });
    const painting = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.9), drawable(new THREE.MeshStandardMaterial({ map: paintTex, roughness: 0.9 }), G.glass, 'none'));
    painting.position.set(1.9, 2.2, -6.32); house.add(painting);

    // freestanding concrete wall leading out into the meadow
    B.add(M.finConc, FX.bevelBox(16, 2.8, 0.35, 0.02), at(-22, 1.4, 1));

    B.build(house);
    house.traverse((o) => { if (o.isMesh) { o.castShadow = o.material !== M.glass && o.material !== M.water; o.receiveShadow = true; } });

    // interior light, warming up when the glass arrives
    interiorLight = new THREE.PointLight(0xffb070, 0, 14, 1.6);
    interiorLight.position.set(-2, 2.8, -3.4);
    scene.add(interiorLight);
    M.lampRef = M.lamp;

    /* landscape */
    const land = new THREE.Group();
    scene.add(land);
    const gSize = 3200;
    const ground = new THREE.PlaneGeometry(gSize, gSize, 200, 200);
    ground.rotateX(-Math.PI / 2);
    const gp = ground.attributes.position;
    for (let i = 0; i < gp.count; i++) {
      const x = gp.getX(i), z = gp.getZ(i);
      const dd = Math.hypot(x, z + 10);
      const behind = FX.smooth((-z - 120) / 300);                      // only rises well behind the house
      const hgt = behind * Math.min(14, Math.pow(Math.max(0, dd - 120) / 400, 1.3) * 14) * (0.4 + 0.6 * FX.noise3(x * 0.004, 0, z * 0.004));
      gp.setY(i, hgt - 0.02);
    }
    ground.computeVertexNormals();
    FX.uvMetres(ground);
    FX.colorize(ground, (x, y, z) => { const k = 0.82 + 0.28 * FX.noise3(x * 0.05, 1, z * 0.05); return [k, k * 0.97, k * 0.9]; });
    const gm = new THREE.Mesh(ground, M.grass);
    gm.receiveShadow = true; land.add(gm);
    const grav = new THREE.Mesh(FX.plane(34, 21), M.gravel);
    grav.rotation.x = -Math.PI / 2; grav.position.set(0.5, 0.004, -1.5);
    grav.receiveShadow = true; land.add(grav);
    M.gravel.polygonOffset = true; M.gravel.polygonOffsetFactor = -1; M.gravel.polygonOffsetUnits = -2;

    // a far tree line on the horizon, left to the haze
    const treeG = new THREE.IcosahedronGeometry(1, 2);
    const trees = new THREE.InstancedMesh(treeG, new THREE.MeshStandardMaterial({ color: 0x3f4632, roughness: 1, envMapIntensity: 0.35 }), 420);
    const tdm = new THREE.Object3D();
    for (let i = 0; i < 420; i++) {
      const a = -Math.PI * (0.08 + R() * 0.84), rr = 380 + R() * 260;
      const x = Math.cos(a) * rr * 1.4, z = Math.sin(a) * rr - 40;
      const hh = 6 + R() * 9;
      tdm.position.set(x, hh * 0.45, z); tdm.scale.set(4 + R() * 5, hh, 4 + R() * 5); tdm.rotation.y = R() * 6;
      tdm.updateMatrix(); trees.setMatrixAt(i, tdm.matrix);
    }
    trees.userData.noPrepass = true; trees.visible = false;
    // kept out: at this distance the fog turns them into paper cut-outs

    // boulders by the wall and the pool
    const LB = new FX.Batch();
    [[-27, 2.4, 1.2], [-25.5, 3.2, 0.7], [-16.5, 3.6, 0.9], [17.2, 3.4, 1.1], [18.5, -1.5, 0.8], [-14.8, -7.5, 1.3], [16.5, 6.4, 0.6]].forEach(([x, z, r], i) => {
      LB.add(M.rock, FX.boulder(r, i * 3.1, 0.62), FX.M(x, r * 0.25, z, 0, R() * 6, 0));
    });
    LB.build(land);

    // cypresses behind the wall: lumpy spindles in a dark foliage material
    const fol = FX.canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#2c3423'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 5000; i++) {
        const x = Math.random() * w, y = Math.random() * h, s = 2 + Math.random() * 6;
        g.fillStyle = ['#1c2417', '#3a4630', '#4d5a3a', '#252e1d', '#5f6b45'][(Math.random() * 5) | 0];
        g.beginPath(); g.ellipse(x, y, s, s * 0.6, Math.random() * 3, 0, 6.28); g.fill();
      }
    }, { repeat: true });
    const cypM = drawable(new THREE.MeshStandardMaterial({ map: fol, roughness: 0.95, envMapIntensity: 0.5 }), G.env, 'none', { flat: true });
    fol.repeat.set(0.35, 0.35);
    [[-24, -9, 10.5], [-21.5, -11.5, 12.2], [-26.8, -13, 9], [27, -12, 11]].forEach(([x, z, hgt], i) => {
      const g = new THREE.IcosahedronGeometry(1, 5);
      const p = g.attributes.position, v = new V3();
      for (let k = 0; k < p.count; k++) {
        v.fromBufferAttribute(p, k);
        const yy = v.y;
        const taper = Math.pow(Math.max(0.02, 1 - Math.abs(yy - 0.15)), 0.8) * (yy > 0 ? 1 - yy * 0.55 : 1);
        const n = 0.8 + FX.noise3(v.x * 3 + i, yy * 7, v.z * 3) * 0.4;
        v.x *= 1.1 * taper * n; v.z *= 1.1 * taper * n; v.y = (yy + 1) * 0.5 * hgt;
        p.setXYZ(k, v.x, v.y, v.z);
      }
      g.computeVertexNormals();
      const uv = g.attributes.uv; for (let k = 0; k < p.count; k++) uv.setXY(k, Math.atan2(p.getZ(k), p.getX(k)) * 1.5, p.getY(k));
      const m = new THREE.Mesh(g, cypM);
      m.position.set(x, 0, z); m.castShadow = true; m.receiveShadow = true; land.add(m);
    });

    // dry meadow grass: instanced tufts of curved blades
    const blades = [];
    for (let b = 0; b < 9; b++) {
      const a = (b / 9) * 6.283 + R(), lean = 0.1 + R() * 0.25, hgt = 0.28 + R() * 0.4;
      const bx = Math.cos(a) * 0.06, bz = Math.sin(a) * 0.06;
      const segs = 4;
      for (let s = 0; s < segs; s++) {
        const t0 = s / segs, t1 = (s + 1) / segs;
        const w0 = 0.011 * (1 - t0), w1 = 0.011 * (1 - t1);
        const p0 = [bx + Math.cos(a) * lean * t0 * t0, hgt * t0, bz + Math.sin(a) * lean * t0 * t0];
        const p1 = [bx + Math.cos(a) * lean * t1 * t1, hgt * t1, bz + Math.sin(a) * lean * t1 * t1];
        const px = -Math.sin(a), pz = Math.cos(a);
        blades.push(p0[0] - px * w0, p0[1], p0[2] - pz * w0, p0[0] + px * w0, p0[1], p0[2] + pz * w0, p1[0] + px * w1, p1[1], p1[2] + pz * w1);
        blades.push(p0[0] - px * w0, p0[1], p0[2] - pz * w0, p1[0] + px * w1, p1[1], p1[2] + pz * w1, p1[0] - px * w1, p1[1], p1[2] - pz * w1);
      }
    }
    const tuftG = new THREE.BufferGeometry();
    tuftG.setAttribute('position', new THREE.Float32BufferAttribute(blades, 3));
    tuftG.computeVertexNormals();
    FX.colorize(tuftG, (x, y) => { const k = 0.3 + 0.7 * Math.min(1, y / 0.6); return [0.55 * k + 0.06, 0.5 * k + 0.06, 0.3 * k + 0.04]; });
    const tuftM = drawable(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide, envMapIntensity: 0.6 }), G.env, 'none', { flat: true });
    const N = ctx.LOW ? 4000 : 11000;
    const tufts = new THREE.InstancedMesh(tuftG, tuftM, N);
    const dm = new THREE.Object3D();
    let n = 0;
    while (n < N) {
      const x = (R() - 0.5) * 130, z = (R() - 0.5) * 100 - 5;
      if (x > -17.5 && x < 18.5 && z > -12.5 && z < 9.5) continue;   // keep off the gravel
      if (FX.noise3(x * 0.12, 3, z * 0.12) < 0.38 && R() < 0.7) continue;   // clumps, not a carpet
      if (Math.abs(z - 1) < 1.2 && x > -31 && x < -13) continue;      // and the wall
      dm.position.set(x, 0, z); dm.rotation.set(0, R() * 6.28, 0); dm.scale.set(0.8 + R() * 0.8, 0.6 + R() * 1.1, 0.8 + R() * 0.8);
      dm.updateMatrix(); tufts.setMatrixAt(n++, dm.matrix);
    }
    tufts.receiveShadow = true; tufts.castShadow = false;
    tufts.userData.noPrepass = true;
    land.add(tufts);

    // sky: a dome that writes alpha, so it can be paper too
    skyMat = new THREE.ShaderMaterial({
      uniforms: { map: { value: sk.bg }, paper: { value: 1 }, intensity: { value: 1.0 } },
      vertexShader: 'varying vec3 vDir; void main() { vDir = normalize((modelMatrix * vec4(position, 0.0)).xyz); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }',
      fragmentShader: `uniform sampler2D map; uniform float paper; uniform float intensity; varying vec3 vDir;
        void main() { vec3 d = normalize(vDir); vec2 uv = vec2(atan(d.z, d.x) * 0.15915494 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5);
          vec3 c = texture2D(map, uv).rgb * intensity; gl_FragColor = vec4(c * (1.0 - step(0.999, paper)), paper); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    const skyM = new THREE.Mesh(new THREE.SphereGeometry(2000, 48, 24), skyMat);
    skyM.renderOrder = -10; skyM.frustumCulled = false; skyM.userData.noPrepass = true;
    scene.add(skyM);
    sk.bg.colorSpace = THREE.SRGBColorSpace;

    // sun and fog
    const sun = new THREE.DirectionalLight(0xfff0dc, 4.4);
    const sd = sk.sunDir.clone();
    sd.normalize();
    sun.position.copy(sd).multiplyScalar(80).add(new V3(0, 0, -2));
    sun.target.position.set(0, 0, -2);
    scene.add(sun, sun.target);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    const sc = sun.shadow.camera;
    sc.left = -38; sc.right = 38; sc.top = 30; sc.bottom = -30; sc.near = 10; sc.far = 220;
    sc.updateProjectionMatrix();
    sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.025; sun.shadow.radius = 3;
    scene.fog = new THREE.Fog(0xc4ccd2, 90, 1100);

    const world = {
      anchors: {
        concrete: new V3(9.5, 6.9, 0.62), stone: new V3(-1.2, 0.46, 3.2), timber: new V3(-11, 7.4, -1.95), glass: new V3(-2, 3.5, -0.4),
      },
      colliders: [
        { id: 'bar', box: new THREE.Box3(new V3(-12.1, 3.8, -7.1), new V3(14.1, 7.3, 0.7)) },
        { id: 'core', box: new THREE.Box3(new V3(-13.1, 0, -7.1), new V3(-8.9, 9.7, -1.9)) },
        { id: 'pavilion', box: new THREE.Box3(new V3(-9.1, 0, -6.5), new V3(5.1, 3.9, -0.3)) },
        { id: 'wall', box: new THREE.Box3(new V3(-30.1, 0, 0.7), new V3(-13.9, 2.9, 1.3)) },
      ],
      M, tufts, land,
    };
    return world;
  }

  /* ---------- per-frame choreography --------------------------------------- */
  const SW = [
    { g: 'concrete', from: 'd1' }, { g: 'stone', from: 'd2' }, { g: 'timber', from: 'd3' }, { g: 'glass', from: 'd4' },
  ];
  const tmp = [0, 0, 0];

  function frame(ctx, st) {
    const s = st.sD, at = ctx.at, span = ctx.span, P = ctx.P, W = ctx.W, H = ctx.H;
    const ease = FX.easeInOut;
    G.concrete.reveal.value = ease(span(s, at('d1') - 26, at('d1') + 55));
    G.stone.reveal.value = ease(span(s, at('d2') - 26, at('d2') + 55));
    G.timber.reveal.value = ease(span(s, at('d3') - 26, at('d3') + 50));
    G.glass.reveal.value = ease(span(s, at('d4') - 30, at('d4') + 38));
    const env = ease(span(s, at('d4') - 6, at('d4', 'h1') + 20));
    G.env.reveal.value = env;
    skyMat.uniforms.paper.value = 1 - ease(span(s, at('d4') + 10, at('d4', 'h1') + 30));
    ridges.forEach((r) => { r.visible = skyMat.uniforms.paper.value < 0.99; });
    const glassOn = G.glass.reveal.value;
    interiorLight.intensity = glassOn * 16;
    ctx.world.M.lampRef.emissiveIntensity = glassOn * 5;

    // finish: paper everywhere a material has not arrived yet
    P.paperOn = 1;
    P.ink = 1;
    P.inkReal = FX.lerp(0.16, 0.0, env);
    P.ao = 0.9;
    P.aoRadius = 0.55;
    P.dof = st.m.phase === 'hold' && st.m.key > 0 && st.m.key < ctx.KEY.beat ? 0.35 : 0.12;
    P.focus = st.dist;
    P.bloomAmt = 0.18;
    P.exposure = 1.0;
    P.warmth = 0.06;
    P.saturation = 0.96;
    P.contrast = 1.06;
    const fn = Math.max(90, st.dist * 0.9 - 60);
    ctx.scene.fog.near = fn; ctx.scene.fog.far = fn + 1100;
    P.vignette = FX.lerp(0.05, 0.3, 1 - st.flat);
    P.grain = 0.018;

    // swatches: pinned on the sheet, docked on the left, then thrown onto the house
    const heroEnd = at('hero', 'h1');
    const dock = FX.easeOut(span(s, heroEnd * 0.6, heroEnd + 70));
    SW.forEach((sw, i) => {
      const el = swatchEls[i];
      if (!el) return;
      const size0 = Math.min(96, W * 0.066), size1 = Math.min(64, W * 0.05);
      const gap = Math.max(16, size0 * 0.3);
      const hx = W - 44 - (4 - i) * (size0 + gap) + gap, hy = Math.max(118, H * 0.17);
      const dx = (ctx.C.gutterPx || 44), dy = H * 0.3 + i * (size1 + 34);
      let x = FX.lerp(hx, dx, dock), y = FX.lerp(hy, dy, dock), size = FX.lerp(size0, size1, dock);
      const fly = span(s, at(sw.from) - 70, at(sw.from) - 26);
      let op = 1, rot = FX.lerp(i % 2 ? 2 : -2, 0, dock);
      if (fly > 0) {
        ctx.project(G[sw.g].origin.value, tmp);
        const e = FX.easeInOut(fly);
        x = FX.lerp(x, tmp[0] - size * 0.15, e); y = FX.lerp(y, tmp[1] - size * 0.15, e);
        size = FX.lerp(size, size * 0.3, e); rot = FX.lerp(rot, i % 2 ? -12 : 12, e);
        op = 1 - FX.smooth(span(fly, 0.82, 1));
      }
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg)`;
      el.style.width = el.style.height = `${size.toFixed(1)}px`;
      el.style.opacity = String(op * ctx.boardIn);
      el.classList.toggle('is-docked', dock > 0.5);
      el.style.visibility = op <= 0.001 ? 'hidden' : 'visible';
    });

    // elevation annotations: levels and the overall dimension, only on the sheet
    if (levelsEl && st.flat > 0.01) {
      levelsEl.forEach((lv) => {
        ctx.project(lv.p, tmp);
        lv.el.style.transform = `translate3d(${tmp[0].toFixed(1)}px, ${tmp[1].toFixed(1)}px, 0)`;
      });
    }
  }

  /* ---------- DOM that belongs to this concept ------------------------------ */
  const ctxRef = {};
  function preIntro(ctx) {
    ctx.boardIn = 0;
    swatchEls = Array.from(document.querySelectorAll('.swatch'));
    const hero = document.getElementById('levels');
    const levels = [[3.85, '+3.85', 'First floor'], [7.25, '+7.25', 'Roof'], [9.6, '+9.60', 'Core']];
    levelsEl = levels.map(([y, v, name]) => {
      const el = document.createElement('div');
      el.className = 'level';
      el.innerHTML = `<i></i><b>${v}</b><span>${name}</span>`;
      hero.appendChild(el);
      return { el, p: new V3(15.2, y, 0.6) };
    });
    const dim = document.createElement('div');
    dim.className = 'level level--ground';
    dim.innerHTML = '<i></i><b>&plusmn;0.00</b><span>Ground</span>';
    hero.appendChild(dim);
    levelsEl.push({ el: dim, p: new V3(15.2, 0, 0.6) });
    Object.assign(ctxRef, { ctx });
  }
  function intro(tl, ctx) {
    const lines = document.querySelectorAll('.hero__title .mask > span');
    tl.fromTo(lines, { yPercent: 110 }, { yPercent: 0, duration: 1.6, ease: 'expo.out', stagger: 0.12 }, 0.7)
      .fromTo('.hero__kicker, .sheet-meta, .titleblock', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 1.4, ease: 'expo.out', stagger: 0.08 }, 1.0)
      .fromTo('.level', { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2, ease: 'expo.out', stagger: 0.06 }, 1.3)
      .fromTo('.level i', { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: 'expo.out', stagger: 0.06 }, 1.3)
      .to(ctx, { boardIn: 1, duration: 1.2, ease: 'expo.out' }, 1.2);
  }
  function hud(ctx, st) {
    const board = document.querySelector('.board-label');
    if (board) board.style.opacity = String(ctx.boardIn * FX.smooth(ctx.span(st.sD, ctx.at('hero', 'h1'), ctx.at('hero', 'h1') + 60)) * (1 - FX.smooth(ctx.span(st.sD, ctx.at('d4') - 30, ctx.at('d4')))));
  }

  FX.experience({
    keys: KEYS,
    dossiers: DOSSIERS,
    beatKey: 'beat',
    hints: { hero: 'Scroll to build the house', first: 'Click the marker to open the file', stop: 'Scroll to the next material' },
    post: { fadeCol: [0.937, 0.922, 0.886], paperCol: [0.937, 0.922, 0.886], inkCol: [0.13, 0.13, 0.14], paperOn: 1, ink: 1, chroma: 0.0008, halation: 0.05 },
    postOptions: { preScale: 1.0 },
    options: { scrollScale: 0.85, parallax: 0.8, endFlat: 1 },
    heroFade: 40,
    build, frame, intro, hud, preIntro,
  });
})();
