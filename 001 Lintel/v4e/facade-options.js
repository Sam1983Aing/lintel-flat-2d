/* ==========================================================================
   Lintel, facade options (13 Oct 2026). Materials for the outside walls, behind ?facade=

     ?facade=holes   Tie Holes. The same board-marked concrete, finished like a real pour: the dots of the
                     drawing become the holes the formwork ties leave, the panels show their joints and
                     each one its own tone, and rain has run down from the top
     ?facade=char    Charred Larch. The wall in burnt black boards, the oak fins warm in front of it,
                     the house's name in brass
     ?facade=tile    Glazed Tile. Narrow hand-made tiles in bottle green, stacked upright. Every tile has its
                     own tilt and its own depth of glaze, so the sky slides over the wall as you move
     ?facade=earth   Rammed Earth. The front wall built up in packed lifts of ochre, sand and red earth,
                     their lines not quite level, grit and small stones showing
     ?facade=trav    Travertine Slabs. The path's stone carried up the front wall in slabs of 1.2 by 0.6 m,
                     the joints lined up with the door, every slab another piece of the block

   and one for the reflecting pool beside the path, behind ?pool=

     ?pool=water     the pool as water: small ripples that move, and a dark wet line where it meets its edge

   Without a parameter this file does nothing and the page is as it was. The two can be combined.

   One idea carries all of them: the house's outside wall is one material (M.concrete in scene.js), and every
   material there is already wrapped by drawable(), which keeps it a drawing until its room arrives. An option
   swaps that one material for another, then lays a small piece of shader over it that knows where on the wall
   it is, in metres (the same wall coordinates the drawing's hatch uses, so the drawing's dots and the real
   holes are the same dots).

   scene.js calls materials() once, right after its own table of materials and before any wall is built,
   and frame() once a frame for the water's clock.
   Demo quality. holes, char and tile change every outside wall of the house. earth and trav change the front
   wall only (the wall the door is in, and the sides of the door's opening).
   ========================================================================== */
(function () {
  'use strict';
  const Q = new URLSearchParams(location.search);
  const SLUG = Q.get('facade'), POOL = Q.get('pool') === 'water';
  const KNOWN = ['holes', 'char', 'tile', 'earth', 'trav'].indexOf(SLUG) >= 0;
  if (!KNOWN && !POOL) return;
  const clock = { value: 0 };
  const f = (n) => Number(n).toFixed(3);

  // Where a pixel is on its wall: q.x metres along the wall, q.y metres up. Floors and wall tops are left alone.
  const WALL = `
    vec3 fwn = normalize((vec4(vNormal, 0.0) * viewMatrix).xyz);
    bool upright = abs(fwn.y) < 0.7;
    bool alongX = abs(fwn.x) <= abs(fwn.z);
    vec2 q = vec2(alongX ? vDrawW.x : vDrawW.z, vDrawW.y);
    float qpx = max(fwidth(q.x), fwidth(q.y));`;
  // The front wall: its face to the forecourt and the two sides of the door's opening. F has its numbers in world metres.
  const FRONT = (F) => `
    float fband = step(abs(vDrawW.z - ${f(F.z)}), 0.6) * step(${f(F.x0)}, vDrawW.x) * step(vDrawW.x, ${f(F.x1)}) * step(vDrawW.y, ${f(F.top)});
    float fdoor = step(${f(F.door0 - 0.3)}, vDrawW.x) * step(vDrawW.x, ${f(F.door1 + 0.3)}) * step(0.5, abs(fwn.x));
    bool front = fband * max(step(0.5, fwn.z), fdoor) > 0.5;
    float ax = q.x - ${f(F.door0)};                                            // metres along the wall from the door's edge`;

  // Lays `surface` (colour and roughness) and optionally `normal` over a material that drawable() has patched.
  function overlay(mat, key, surface, normal, extra) {
    const before = mat.onBeforeCompile, keyBefore = mat.customProgramCacheKey;
    extra = extra || {};
    mat.onBeforeCompile = (sh, r) => {
      before(sh, r);
      Object.assign(sh.uniforms, { uFacadeT: clock }, extra.uniforms || {});
      sh.fragmentShader = sh.fragmentShader
        .replace('void main() {', `uniform float uFacadeT; ${extra.head || ''}\nvec3 gFacadeTilt = vec3(0.0); float gFacadeFlat = 0.0;\nvoid main() {`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n{ ${WALL}\n ${surface} }`);
      if (normal) sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${normal}`);
    };
    mat.customProgramCacheKey = () => keyBefore() + '-facade-' + key;
    return mat;
  }
  // the scan's own bumps step back where an option has put another surface (gFacadeFlat), then the option's lean goes on
  const LEAN = `{ vec3 plain = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
    normal = normalize(mix(normal, plain, gFacadeFlat) + (viewMatrix * vec4(gFacadeTilt, 0.0)).xyz); }`;
  const concrete = (A, normal) => A.drawable(A.FX.pbr(A.sets.conc, { size: 1.8, color: new A.THREE.Color().setRGB(1.5, 1.52, 1.52), normal: normal, env: 0.7, rotate: Math.PI / 2 }), 'concrete', { sat: 0.25, macro: 0.5 });

  const OPTIONS = {
    /* ---------- 01 Tie Holes ------------------------------------------------------------ */
    holes(A) {
      A.M.concrete = overlay(concrete(A, 1.9), 'holes', `if (upright) {
        // tie holes on the drawing's own grid, 60 cm each way
        vec2 cell = (fract((q + vec2(0.3)) / 0.6) - 0.5) * 0.6;
        float d = length(cell);
        float big = 1.0 - smoothstep(0.011, 0.026, qpx);                       // too small to draw: they would twinkle
        float hole = (1.0 - smoothstep(0.016, 0.016 + max(qpx, 0.003), d)) * big;
        float lip = smoothstep(0.014, 0.02, d) * (1.0 - smoothstep(0.02, 0.034, d)) * clamp(-cell.y / 0.022, 0.0, 1.0) * big;
        // formwork panels of 2.4 by 1.2 m, their joints between the rows of holes
        vec2 pq = q + vec2(0.3);
        float joint = max(lineAA(pq.x, 2.4, 1.4), lineAA(pq.y, 1.2, 1.1) * 0.75);
        vec2 pid = floor(pq / vec2(2.4, 1.2));
        float tone = (dh(pid) - 0.5) * 0.2;                                   // each panel its own pour
        // rain that ran down from the top of the wall
        float run = vn(vec3(q.x * 2.4, q.y * 0.16, 3.0)) * vn(vec3(q.x * 11.0, q.y * 0.4, 7.0));
        float wet = smoothstep(0.2, 0.5, run) * smoothstep(0.4, 3.4, q.y) * 0.34;
        diffuseColor.rgb *= (1.0 + tone) * (1.0 - wet) * (1.0 - joint * 0.42) * (1.0 - hole * 0.86);
        diffuseColor.rgb += lip * 0.07;
        roughnessFactor = mix(roughnessFactor, 0.55, wet); }`);
    },

    /* ---------- 02 Charred Larch --------------------------------------------------------- */
    char(A) {
      const { M, FX, THREE, drawable, sets } = A;
      M.concrete = overlay(drawable(FX.pbr(sets.planks, { size: 1.6, color: new THREE.Color().setRGB(1.25, 1.18, 1.12), normal: 2.8, env: 1.25, roughness: 0.85 }), 'timber', { sat: 0.2, macro: 0.3 }), 'char', `if (upright) {
        // burnt boards: each stretch charred a little deeper or lighter, and a silver sheen where the grain stands proud
        float deep = vn(vec3(q.x * 5.0, q.y * 0.5, 2.0));
        float scale = vn(vec3(q.x * 46.0, q.y * 7.0, 5.0));
        diffuseColor.rgb *= (0.7 + 0.7 * deep) * (0.75 + 0.5 * scale);
        roughnessFactor = clamp(roughnessFactor * (0.38 + 0.5 * scale), 0.2, 1.0); }`);
      this.nameColor = 0xd6b56e;                                              // the name in brass, or it is black on black
    },

    /* ---------- 03 Glazed Tile ----------------------------------------------------------- */
    tile(A) {
      const { M, drawable, plain } = A;
      M.concrete = overlay(drawable(plain({ color: 0xffffff, roughness: 1, metalness: 0, envMapIntensity: 0.95 }), 'stone', { sat: 1, macro: 0 }), 'tile', `if (upright) {
        // finger tiles of 7.5 by 30 cm, stacked upright
        vec2 ts = vec2(0.075, 0.30);
        vec2 g = q / ts, id = floor(g), f = fract(g) - 0.5;
        float far = smoothstep(0.22, 0.55, max(fwidth(g.x), fwidth(g.y)));     // far off the tiles melt into one glaze
        vec2 e = (0.5 - abs(f)) * ts;                                          // metres to the tile's edge
        float grout = (1.0 - smoothstep(0.0012, 0.0012 + qpx, min(e.x, e.y))) * (1.0 - far);
        float h1 = dh(id), h2 = dh(id + 17.3), h3 = dh(id + 41.7);
        vec3 glaze = mix(vec3(0.010, 0.036, 0.022), vec3(0.026, 0.075, 0.043), h1);         // bottle green, tile by tile
        glaze *= 0.8 + 0.4 * vn(vec3(q * 16.0, h2 * 9.0));                                  // where the glaze pooled
        glaze = mix(glaze, vec3(0.018, 0.055, 0.032), far);
        diffuseColor.rgb = mix(glaze, vec3(0.02, 0.022, 0.02), grout);
        roughnessFactor = mix(mix(0.07, 0.2, h2), 0.9, grout);
        // every tile leans its own way a little and is slightly domed: that is what makes the sky slide over the wall
        vec2 lean = ((vec2(h1, h3) - 0.5) * 0.07 + f * vec2(0.09, 0.03)) * (1.0 - far);
        gFacadeTilt = (alongX ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 0.0, 1.0)) * lean.x + vec3(0.0, lean.y, 0.0); }`, LEAN);
      this.nameColor = 0xd8b86c;
    },

    /* ---------- 04 Rammed Earth (the front wall only) -------------------------------------- */
    earth(A) {
      A.M.concrete = overlay(concrete(A, 1.3), 'earth', `${FRONT(A.front)}
        if (upright && front) {
          // lifts of 12 cm, each rammed down before the next went in. Their lines are not quite level
          float yy = q.y + (vn(vec3(q.x * 0.7, 0.0, 4.0)) - 0.5) * 0.10 + (vn(vec3(q.x * 3.1, 0.0, 9.0)) - 0.5) * 0.03;
          float lift = yy / 0.125, id = floor(lift), fl = fract(lift);
          float h1 = dh(vec2(id, 3.0));
          vec3 earth = h1 < 0.3 ? vec3(0.44, 0.27, 0.15) : h1 < 0.62 ? vec3(0.55, 0.40, 0.26) : h1 < 0.8 ? vec3(0.36, 0.19, 0.10) : vec3(0.50, 0.34, 0.20);
          earth = mix(earth, vec3(0.46, 0.31, 0.19), 0.42);                      // the lifts are cousins, not strangers
          earth *= 0.84 + 0.22 * smoothstep(0.0, 0.55, fl);                     // packed tight and dark at the bottom of a lift
          float seam = 1.0 - smoothstep(0.0, 0.06, fl);                         // the line between two lifts
          earth *= 1.0 - seam * 0.24;
          // grit: sand, and now and then a small pale stone
          float grit = vn(vec3(q * 60.0, id));
          float stone = smoothstep(0.8, 0.9, vn(vec3(q * 24.0, 7.0 + id)));
          earth *= 0.86 + 0.28 * grit;
          earth = mix(earth, earth * 1.4 + 0.04, stone * 0.55);
          earth *= 0.9 + 0.2 * vn(vec3(q.x * 0.35, q.y * 0.5, 2.0));            // a slow drift along the wall
          earth *= 1.0 - lineAA(ax, 2.4, 1.2) * 0.18;                           // the formwork's panels, 2.4 m, from the door's edge
          diffuseColor.rgb = earth;
          roughnessFactor = 0.97;
          gFacadeFlat = 1.0;
          gFacadeTilt = vec3(0.0, (seam - (smoothstep(0.88, 1.0, fl)) * 0.6) * 0.3 + (grit - 0.5) * 0.12, 0.0);
        }`, LEAN);
    },

    /* ---------- 05 Travertine Slabs (the front wall only) ---------------------------------- */
    trav(A) {
      A.M.concrete = overlay(concrete(A, 1.3), 'trav', `${FRONT(A.front)}
        if (upright && front) {
          // slabs of 1.2 by 0.6 m, their joints lined up with the door's edges and its head
          vec2 sq = vec2(ax, q.y) / vec2(1.2, 0.6), id = floor(sq), fs = fract(sq);
          vec2 e = min(fs, 1.0 - fs) * vec2(1.2, 0.6);                          // metres to the slab's edge
          float joint = 1.0 - smoothstep(0.0025, 0.0025 + qpx, min(e.x, e.y));
          float bevel = 1.0 - smoothstep(0.0, 0.014, min(e.x, e.y));
          // every slab is another piece of the block: its own place in the scan, its own tone
          vec2 off = vec2(dh(id), dh(id + 5.7));
          vec3 stone = texture2D(tFacade, (vec2(ax, q.y) + off * 7.0) / 2.4).rgb;
          stone = mix(vec3(dot(stone, vec3(0.299, 0.587, 0.114))), stone, 0.7) * vec3(1.1, 0.99, 0.82);
          stone *= 0.92 + 0.16 * dh(id + 2.2);
          // cut across the bed: soft level bands, and small open pores along them
          float band = vn(vec3(q.x * 0.6 + off.x * 9.0, (q.y + off.y) * 34.0, 1.0));
          stone *= 0.9 + 0.2 * band;
          float pore = smoothstep(0.8, 0.9, vn(vec3(q.x * 26.0, q.y * 150.0, off.x * 9.0))) * smoothstep(0.45, 0.7, band);
          stone *= 1.0 - pore * 0.5;
          diffuseColor.rgb = mix(stone, vec3(0.11, 0.1, 0.09), joint);
          roughnessFactor = mix(0.44 + 0.3 * pore, 0.92, joint);
          gFacadeFlat = 1.0;
          vec2 lean = (e.x < e.y ? vec2(sign(fs.x - 0.5), 0.0) : vec2(0.0, sign(fs.y - 0.5))) * bevel * 0.4;
          gFacadeTilt = (alongX ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 0.0, 1.0)) * lean.x + vec3(0.0, lean.y, 0.0);
        }`, LEAN, { head: 'uniform sampler2D tFacade;', uniforms: { tFacade: { value: A.sets.trav.diff } } });
    },
  };

  /* ---------- the reflecting pool as water ------------------------------------------------- */
  function pool(A) {
    const P = A.pool;                                                          // the pool beside the path, world metres: x0, z0, x1, z1
    overlay(A.M.water, 'water', `{
      vec2 w = vDrawW.xz; float t = uFacadeT;
      // two sets of small ripples crossing each other, stronger where a breath of wind passes
      vec2 r1 = vec2(cos(w.x * 9.0 + w.y * 3.0 + t * 0.9), cos(w.y * 11.0 - w.x * 2.0 - t * 0.7));
      vec2 r2 = vec2(cos(w.x * 23.0 - w.y * 7.0 - t * 1.6), cos(w.y * 19.0 + w.x * 5.0 + t * 1.3));
      float gust = 0.35 + vn(vec3(w * 0.8, t * 0.1));
      vec2 slope = (r1 * 0.02 + r2 * 0.01) * gust;
      gFacadeTilt = vec3(slope.x, 0.0, slope.y);
      diffuseColor.rgb = vec3(0.01, 0.03, 0.034);
      roughnessFactor = 0.035;
      // where the water meets its edge: a dark wet line, as if it stood a finger below the stone
      vec2 e = min(w - vec2(${f(P[0])}, ${f(P[1])}), vec2(${f(P[2])}, ${f(P[3])}) - w);
      float inside = step(0.0, min(e.x, e.y));
      float rim = (1.0 - smoothstep(0.0, 0.07, min(e.x, e.y))) * inside;
      diffuseColor.rgb *= 1.0 - rim * 0.85; roughnessFactor = mix(roughnessFactor, 0.5, rim);
      gFacadeTilt *= 1.0 - rim; }`,
      '{ normal = normalize(normal + (viewMatrix * vec4(gFacadeTilt, 0.0)).xyz); }');
  }

  window.LINTEL_FACADE = {
    slug: KNOWN ? SLUG : null,
    nameColor: null,
    poolEdge: POOL ? { mat: 'travBlock', wider: 0.1 } : null,
    materials(A) { if (KNOWN) OPTIONS[SLUG].call(this, A); if (POOL) pool(A); },
    frame(t) { clock.value = t; },
  };
})();
