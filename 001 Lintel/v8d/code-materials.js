/* ==========================================================================
   Lintel, materials written in code (14 Oct 2026).

   One library for the whole house. Each entry replaces one Poly Haven scan of the material table (scene.js and
   staging.js) with a rule: a height from its own pattern turned into a normal, a roughness that changes over the
   surface, and detail that steps back before it is smaller than about two pixels, so nothing shimmers while you
   scroll. Colours start from the scans' own averages (measured), so a room keeps its colours when it switches.

   Written for the living room first (brief-living-looks.md, the All Code look), moved here so every room can use
   them (brief-code-house.md). house-looks.js decides which rooms wear them.

   Every material stays a drawable() material: paper until its room arrives, revealed by where each pixel is.
   ========================================================================== */
window.LINTEL_CODEMAT = (function () {
  'use strict';
  const LOW = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
  const f = (n) => Number(n).toFixed(5);
  const v3 = (c) => `vec3(${f(c[0])}, ${f(c[1])}, ${f(c[2])})`;
  let A = null, THREE = null;
  // plan x, y in metres to world: X = x - 30, Z = y - 24
  const W = (x, y, h) => [x - 30, h || 0, y - 24];
  const SALT = Number(new URLSearchParams(location.search).get('salt')) || 0;
  const DBG = new URLSearchParams(location.search).get('dbg') || '';                // (tools: ?dbg=pores|band|fib shows one layer of the oak)
  const ORIGIN = W(15, 12.5);                                           // patterns are laid from here (the living room's middle): small numbers, fine noise stays exact

  /* ---------- shared shader code ----------------------------------------------------------------
     Hashes without sin() (stable far from the origin), value noise with its gradient, fractal noise whose octaves
     fade out before they get finer than about three pixels (so nothing shimmers or blinks while you scroll), and
     the step that turns a height into a tilted normal. Heights are in metres, slopes in metres per metre. */
  const LIB = `
    #define LK_O ${v3(ORIGIN)}
    vec3 lkG = vec3(0.0);                 // the slope of the surface's relief, world space, set by a material's surface code
    float lkAlpha = 1.0;
    float lkH(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
    float lkH2(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
    vec2 lkH22(vec2 p) { vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); q += dot(q, q.yzx + 33.33); return fract((q.xx + q.yz) * q.zy); }
    // value noise: x is the value (0 to 1), yzw its gradient
    vec4 lkN(vec3 x) {
      vec3 i = floor(x), w = fract(x);
      vec3 u = w * w * (3.0 - 2.0 * w), du = 6.0 * w * (1.0 - w);
      float a = lkH(i), b = lkH(i + vec3(1.0, 0.0, 0.0)), c = lkH(i + vec3(0.0, 1.0, 0.0)), d = lkH(i + vec3(1.0, 1.0, 0.0));
      float e = lkH(i + vec3(0.0, 0.0, 1.0)), f = lkH(i + vec3(1.0, 0.0, 1.0)), g = lkH(i + vec3(0.0, 1.0, 1.0)), h = lkH(i + vec3(1.0, 1.0, 1.0));
      float k1 = b - a, k2 = c - a, k3 = e - a, k4 = a - b - c + d, k5 = a - c - e + g, k6 = a - b - e + f, k7 = -a + b + c - d + e - f - g + h;
      return vec4(a + k1 * u.x + k2 * u.y + k3 * u.z + k4 * u.x * u.y + k5 * u.y * u.z + k6 * u.z * u.x + k7 * u.x * u.y * u.z,
        du * vec3(k1 + k4 * u.y + k6 * u.z + k7 * u.y * u.z, k2 + k5 * u.z + k4 * u.x + k7 * u.z * u.x, k3 + k6 * u.x + k5 * u.y + k7 * u.x * u.y));
    }
    float lkn(vec3 x) { return lkN(x).x; }
    // fractal noise centred on 0, with its gradient. fr: the first frequency (per metre), w: metres per pixel.
    // An octave fades out as its period nears two pixels, and the sum keeps its scale (a lost octave is its own average)
    vec4 lkFbm(vec3 p, float fr, float gain, int oct, float w) {
      vec4 s = vec4(0.0); float a = 1.0, q = fr, n = 0.0;
      for (int i = 0; i < 7; i++) {
        if (i >= oct) break;
        float k = 1.0 - smoothstep(0.3, 0.55, w * q);
        if (k > 0.001) { vec4 v = lkN(p * q + vec3(float(i) * 7.13, float(i) * 3.71, float(i) * 1.37)); s += a * k * vec4(v.x - 0.5, v.yzw * q); }
        n += a; a *= gain; q *= 2.03;
      }
      return s / n;
    }
    // how much of a feature of this size (metres) still shows at w metres per pixel
    float lkKeep(float size, float w) { return 1.0 - smoothstep(0.45, 0.9, w / size); }
    // 1 on a face, 0 on the rounded edge of a box, where the pattern's plane changes from one face's to the next
    float lkFlat(vec3 n) { vec3 a = abs(n); float mx = max(a.x, max(a.y, a.z)), mn = min(a.x, min(a.y, a.z)); return smoothstep(0.05, 0.25, mx - (a.x + a.y + a.z - mx - mn)); }
    // the slope (world) of a height whose screen derivatives are hx and hy: the surface gradient of Mikkelsen's bump mapping
    vec3 lkSurfGrad(vec3 n, float hx, float hy) {
      vec3 px = dFdx(vDrawW), py = dFdy(vDrawW);
      vec3 r1 = cross(py, n), r2 = cross(n, px);
      float det = dot(px, r1);
      return abs(det) < 1e-12 ? vec3(0.0) : (hx * r1 + hy * r2) / det;
    }
    // the plane a world pattern is laid in, by the way the surface faces: q in metres along ta and tb
    void lkPlane(vec3 p, vec3 n, out vec2 q, out vec3 ta, out vec3 tb) {
      vec3 a = abs(n);
      if (a.y >= a.x && a.y >= a.z) { ta = vec3(1.0, 0.0, 0.0); tb = vec3(0.0, 0.0, 1.0); }
      else if (a.x >= a.z) { ta = vec3(0.0, 0.0, 1.0); tb = vec3(0.0, 1.0, 0.0); }
      else { ta = vec3(1.0, 0.0, 0.0); tb = vec3(0.0, 1.0, 0.0); }
      q = vec2(dot(p, ta), dot(p, tb));
    }
    float lkSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)); }
  `;
  // at the top of the surface step: where the pixel is (from the room's middle), how big it is, which way the surface faces
  const PREP = `
    vec3 lkP = vDrawW - LK_O;
    float lkPx = max(max(length(dFdx(vDrawW)), length(dFdy(vDrawW))), 1e-5);
    // (cloths: the pixel's mean size, so a cushion's top does not go smooth at a grazing angle while its front is woven)
    float lkPxM = max(sqrt(length(dFdx(vDrawW)) * length(dFdy(vDrawW))) * 1.3, 1e-5);
    vec3 lkWN = normalize((vec4(vNormal, 0.0) * viewMatrix).xyz);
    #ifdef DOUBLE_SIDED
      lkWN *= gl_FrontFacing ? 1.0 : -1.0;
    #endif`;
  // the relief: the normal leans away from where the surface rises
  // (Capped: a slope steeper than about 35 degrees only ever came from a height that jumped between two pixels, at a
  // joint or a corner, and lit up as a dotted line. Sam's reviewer saw them on the oak and the hearth, 14 Oct.)
  const TILT = `{ vec3 lkN0 = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
      vec3 lkT = lkG - dot(lkG, lkN0) * lkN0;
      float lkTl = length(lkT); if (lkTl > 0.7) lkT *= 0.7 / lkTl;
      normal = normalize(normal - (viewMatrix * vec4(lkT, 0.0)).xyz); }`;

  /* Lays shader code over a material drawable() has patched (the facade options do the same). Stages:
       alpha    before the alpha test (diffuseColor.a can still be set)
       surface  once the colour and roughness are read: set diffuseColor, roughnessFactor, and lkG
       normal   after the normal map (default: lean the normal by lkG)
       light    after the material's light parameters are set (material.sheenColor, material.roughness)
       end      once all the light is gathered, before it is added up (reflectedLight)
       last     at the very end, after drawable() has written its paper mask
       chunks   { include: replacement } for whole three.js chunks */
  function overlay(mat, o) {
    const before = mat.onBeforeCompile, keyBefore = mat.customProgramCacheKey;
    mat.onBeforeCompile = (sh, r) => {
      before(sh, r);
      Object.assign(sh.uniforms, o.uniforms || {});
      let vs = sh.vertexShader, fs = sh.fragmentShader;
      if (!/varying vec2 vLkUv/.test(vs)) {
        // (vLkObj, vLkObjN: the place and the facing on the object itself, for a thing that moves, such as the pivot door)
        vs = 'varying vec2 vLkUv; varying float vLkInst;\n' + (o.local ? 'varying vec3 vLkObj; varying vec3 vLkObjN;\n' : '') + vs.replace('#include <uv_vertex>', `#include <uv_vertex>
          vLkUv = uv;
          ${o.local ? 'vLkObj = position; vLkObjN = normal;' : ''}
          #ifdef USE_INSTANCING
            vLkInst = float(gl_InstanceID);
          #else
            vLkInst = 0.0;
          #endif`);
        fs = 'varying vec2 vLkUv; varying float vLkInst;\n' + (o.local ? 'varying vec3 vLkObj; varying vec3 vLkObjN;\n' : '') + fs.replace('void main() {', LIB + '\nvoid main() {');
      }
      Object.entries(o.chunks || {}).forEach(([inc, txt]) => { fs = fs.replace(`#include <${inc}>`, txt); });
      if (o.vertex) vs = o.vertex(vs);
      fs = fs.replace('void main() {', (o.head || '') + '\nvoid main() {');
      if (o.alpha) fs = fs.replace('#include <alphatest_fragment>', `{ ${o.alpha} }\n#include <alphatest_fragment>`);
      if (o.surface) fs = fs.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n{ ${PREP}\n${o.surface} }`);
      const nrm = o.normal || (o.surface ? TILT : null);
      if (nrm) fs = fs.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${nrm}`);
      if (o.light) fs = fs.replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>\n{ ${o.light} }`);
      if (o.end) fs = fs.replace('#include <aomap_fragment>', `#include <aomap_fragment>\n{ ${o.end} }`);
      if (o.last) fs = fs.replace(/\}\s*$/, `{ ${o.last} }\n}`);
      // ?salt=N (tools only): a number that changes every shader's code, so the GPU's own shader cache cannot help and a
      // load measures what a first visit costs (the Mac keeps compiled shaders across browser profiles: 70 s cold, 4 s warm)
      if (SALT) fs = fs.replace(/\}\s*$/, `gl_FragColor.rgb *= ${(1 + SALT * 1e-7).toFixed(9)};\n}`);
      sh.vertexShader = vs; sh.fragmentShader = fs;
    };
    mat.customProgramCacheKey = () => keyBefore() + '-look-' + o.key;
    return mat;
  }
  const phys = (o) => new THREE.MeshPhysicalMaterial(Object.assign({ color: 0xffffff, roughness: 1, metalness: 0 }, o));
  // (the drawing's hatch and the options of the material it replaces come along: the paper drawing must not change when a
  // room's materials do. CUR is the scan material being replaced, set by build())
  let CUR = null;
  const KEEP = ['hatch', 'room', 'side', 'farFlat', 'noCap', 'noRing', 'inkCut', 'fromAbove', 'topExt'];
  const D = (m, o) => {
    const was = (CUR && CUR.userData.drawOpts) || {}, keep = {};
    KEEP.forEach((k) => { if (was[k] !== undefined) keep[k] = was[k]; });
    const opts = Object.assign({ sat: 1, macro: 0 }, keep, o || {});
    return A.drawable(m, opts.hatch || 'none', opts);
  };
  const code = (m, key, o) => {
    const out = overlay(D(m, o && o.drawable), Object.assign({ key }, o)); out.userData.look = key; if (o && o.sprig) out.userData.sprig = true;
    // (what it is made of, kept for baking it into a texture at load: bakedFrom() below)
    out.userData.lkSrc = { key, head: (o && o.head) || '', surface: (o && o.surface) || '', local: !!(o && o.local), uniforms: (o && o.uniforms) || {}, rough: m.roughness,
      drawable: o && o.drawable, phys: { envMapIntensity: m.envMapIntensity, roughness: m.roughness } };
    return out;
  };

  /* ======================================================================================
     ALL CODE: one material per scan the living room used, each a rule and not a picture.
     Colours match the scans they replace (their average, as the page lit them), so the comparison is about
     relief, variation and finish, and not about a new colour. Three things every one of them has:
       relief from its own pattern (a height in metres, turned into a normal)
       a roughness that changes over the surface, never one number
       detail that steps back before it is smaller than a few pixels
     ====================================================================================== */

  // The slope of a height from how it changes from pixel to pixel (one reading per pixel). Every height here keeps
  // its detail at two pixels or more (lkFbm, lkKeep), so this slope is smooth and does not sparkle.
  const SLOPE = (h) => `lkG = lkSurfGrad(lkWN, dFdx(${h}), dFdy(${h}));`;

  /* ---------- oak: 22 cm boards along the room's length -------------------------------------------
     Every board has its own log. Where the board was cut from it (the pith far to one side: quarter sawn, straight
     grain and the ray flecks oak is known for. Below its middle: flat sawn, the rings meet the face in arches) sets
     its figure. Each board its own tone, a little cupped and a little tilted (so each catches the light its own
     way), a 2 mm bevel at every joint, the soft earlywood brushed a hair lower than the hard latewood, an oiled
     satin finish, duller and paler where people walk round the pit. */
  const OAK = `
    vec4 oakA; vec4 oakB;              // tone, pores, fleck, joint / the board's randomness, knot, quarter, grain streak
    // Lf: a board's length when it is fixed (the pivot door: every board the door's height, no end joint). 0: random,
    // 1.7 to 3.2 m, each row its own offset (the floor)
    // bevK: how much of the 2 mm bevel at each joint (1 the floor's; a glued panel shows next to none)
    float oakBoardL(vec2 q, float px, float Wd, float Lf, float bevK, out vec4 a, out vec4 b) {
      float row = floor(q.y / Wd), v = fract(q.y / Wd);
      float L = Lf > 0.0 ? Lf : 1.7 + 1.5 * lkH2(vec2(row, 1.7)), off = Lf > 0.0 ? 0.0 : lkH2(vec2(row, 5.3)) * L;
      float uu = (q.x + off) / L, col = floor(uu), u = fract(uu);
      vec2 id = vec2(row, col);
      float r1 = lkH2(id), r2 = lkH2(id + 17.31), r3 = lkH2(id + 41.7), r4 = lkH2(id + 73.1);
      float lx = u * L, y = (v - 0.5) * Wd;
      float ev = min(v, 1.0 - v) * Wd, eu = min(u, 1.0 - u) * L, ej = min(ev, eu);
      // Cross-grain pixel size (across q.y) so longitudinal plank joints, cathedral arches, and wood fibres stay crisp down long corridors
      float pxY = max(fwidth(q.y) * 0.65, 1e-4), pxX = max(fwidth(q.x) * 0.65, 1e-4);
      float pxA = min(px, pxY);
      float jPx = ev < eu ? pxY : min(px, pxX);
      // the joint: a bevel 2.4 mm wide each side, widened to the axis pixel when bigger (and shallower, so its slope stays clean)
      float bw = max(0.0024, jPx * 1.25);
      float bev = 1.0 - smoothstep(0.0, bw, ej);
      float joint = (1.0 - smoothstep(0.0, max(0.0009, jPx * 0.95), ej)) * min(1.0, 0.0020 / max(jPx, 0.0020));
      // The grain: many fine streaks along the board, of every strength. This is what oak is from a few metres away.
      // The streaks wander a little, as the fibres do.
      float yy = y + 0.0035 * sin(lx * 1.1 + r1 * 6.0) + 0.0065 * (lkn(vec3(lx * 0.35, r2 * 9.0, 1.0)) - 0.5);
      float k1 = lkKeep(0.014, pxA), k2 = lkKeep(0.0050, pxA), k3 = lkKeep(0.0020, pxA);
      float st = (lkn(vec3(lx * 0.45, yy * 68.0, r1 * 30.0)) - 0.5) * k1 + 0.85 * (lkn(vec3(lx * 1.1, yy * 200.0, r2 * 30.0)) - 0.5) * k2
               + 0.65 * (lkn(vec3(lx * 2.6, yy * 540.0, r3 * 30.0)) - 0.5) * k3;
      // Its rings. Where the board was cut from its log (the pith far to one side: quarter sawn, straight lines and
      // the ray flecks oak is known for; under its middle: flat sawn, arches) sets where they meet the face. A ring
      // shows as a line of open earlywood pores at its start and a darker latewood band, some rings stronger than others.
      float quarter = step(0.62, r1);
      float vc = mix((r2 - 0.5) * 0.11, (r2 < 0.5 ? -1.0 : 1.0) * (0.22 + 0.2 * r3), quarter);
      float dc = mix(0.032 + 0.14 * r3, 0.015 * r4, quarter), sl = (r4 - 0.5) * mix(0.075, 0.012, quarter);
      float rr = length(vec2(yy - vc, dc + sl * lx));
      rr += 0.013 * (lkn(vec3(lx * 0.5, yy * 2.5, r1 * 50.0)) - 0.5) + 0.0035 * (lkn(vec3(lx * 2.5, yy * 12.0, r2 * 50.0)) - 0.5);
      float sp = 0.0030 + 0.0028 * r3;
      float ring = rr / sp, rf = fract(ring);
      float fwRing = min(fwidth(ring), pxA / sp * 1.25);
      float vis = 1.0 - smoothstep(0.24, 0.62, fwRing);
      float strength = 0.40 + 0.60 * lkH2(vec2(floor(ring), r1 * 91.0));
      float ringBand = mix(0.18, smoothstep(0.0, 0.28, rf) * (1.0 - smoothstep(0.55, 0.95, rf)) * strength, vis) * (1.0 - 0.45 * quarter);
      float pores = mix(0.11, ((1.0 - smoothstep(0.0, 0.20, rf)) * strength + 0.45 * ringBand), vis) * (1.0 - 0.5 * quarter);
      // ray flecks: short silvery ribbons on a quarter sawn face
      float fleck = quarter * mix(0.06, smoothstep(0.64, 0.85, lkn(vec3(lx * 28.0, yy * 210.0, r2 * 40.0))), lkKeep(0.0045, pxA));
      // a small live knot now and then with a dark swirled grain halo
      float kd = length(vec2((lx - (0.18 + 0.64 * r2) * L) * 0.65, y - (r4 - 0.5) * Wd * 0.58));
      float hasKnot = step(0.82, r3);
      float kn = hasKnot * (1.0 - smoothstep(0.004, 0.009, kd)) + hasKnot * 0.42 * (1.0 - smoothstep(0.009, 0.024, kd));
      // each board its own shade: warm honey, toasted wheat, or pale smoked taupe
      float tone = 0.85 + 0.30 * r1;
      a = vec4(tone, pores, fleck, joint * bevK); b = vec4(r2, kn, quarter, st);
      // (cup and tilt ease back to nothing at the joint: two boards met in a step of up to a millimetre, and its slope lit
      // up as a dotted line along every joint at a grazing angle)
      float ease = smoothstep(0.0, max(0.006, pxA * 2.5), ej);
      return (0.00042 * pow(2.0 * y / Wd, 2.0)                              // cupped
        + (r2 - 0.5) * 0.0026 * (y / Wd) + (r3 - 0.5) * 0.0018 * (lx / L)) * ease   // tilted
        + 0.00022 * st - 0.00028 * pores - 0.0016 * bev * (0.0024 / bw) * bevK - 0.00045 * kn;
    }
    float oakBoard(vec2 q, float px, float Wd, out vec4 a, out vec4 b) { return oakBoardL(q, px, Wd, 0.0, 1.0, a, b); }
`;
  function oak(orig) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.42, clearcoat: 0.16, clearcoatRoughness: 0.30 }), 'oak', {
      head: OAK,
      scale: 2.0 / 0.003,
      surface: `
        // boards on the floor run along x; on the pit's sides one board makes the whole step
        vec2 q; vec3 ta, tb; lkPlane(lkP, lkWN, q, ta, tb);
        float oPx = mix(lkPxM, lkPx, 0.26);
        float Wd = abs(lkWN.y) > 0.7 ? 0.22 : 0.46;
        float h0 = oakBoard(q, oPx, Wd, oakA, oakB);
        ${SLOPE('h0')}
        lkG *= lkFlat(lkWN);
        // worn paths: round the pit from the hall to the kitchen, along its south edge to the fire, and across the north
        vec2 pw = vDrawW.xz;
        float d = min(min(lkSeg(pw, vec2(-14.0, -7.2), vec2(-10.8, -8.6)), lkSeg(pw, vec2(-10.8, -8.6), vec2(-10.8, -14.2))),
                      min(lkSeg(pw, vec2(-10.8, -14.2), vec2(-14.0, -15.8)), min(lkSeg(pw, vec2(-12.0, -8.4), vec2(-19.5, -8.4)), lkSeg(pw, vec2(-12.5, -15.0), vec2(-19.0, -15.0)))));
        float wear = (1.0 - smoothstep(0.15, 0.75, d)) * (0.55 + 0.45 * lkn(vec3(pw * 3.0, 4.0))) * step(0.7, lkWN.y);
        vec3 col = ${v3([0.288, 0.215, 0.156])} * oakA.x * mix(vec3(1.03, 1.0, 0.96), vec3(0.94, 0.96, 1.02), smoothstep(0.45, 0.95, oakB.x)) * 0.95;
        col *= 1.0 + 0.42 * oakB.w;
        col *= 1.0 - 0.36 * oakA.y;
        col = mix(col, col * vec3(1.24, 1.18, 1.08), oakA.z * 0.85);
        col = mix(col, col * vec3(0.36, 0.28, 0.22), clamp(oakB.y, 0.0, 1.0));
        col = mix(col, col * vec3(1.08, 1.07, 1.05) + 0.01, wear * 0.45);
        col *= 1.0 - 0.68 * oakA.w;
        diffuseColor.rgb *= col / 1.0;
        roughnessFactor = clamp(0.38 + 0.08 * oakB.x + 0.18 * oakA.y - 0.08 * oakA.z - 0.10 * oakB.w + 0.18 * wear + 0.34 * oakA.w, 0.20, 0.95);`,
    });
  }

  /* ---------- lime plaster: walls and ceiling ----------------------------------------------------
     Laid with a steel trowel: overlapping strokes, each a soft lens with a lip where the trowel lifted, burnished a
     little smoother and darker along the lips. Fine sand in it. The ceiling is the same plaster, skimmed flatter. */
  const PLASTER = `
    float trowel(vec2 q, float amp, out float lip) {
      vec2 c0 = floor(q / 0.34); float h = 0.0; lip = 0.0;
      for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
        vec2 c = c0 + vec2(float(i), float(j)), r = lkH22(c);
        vec2 d = q - (c + 0.15 + 0.7 * r) * 0.34;
        vec2 dir = normalize(lkH22(c + 9.1) - 0.5 + 1e-4); float ca = dir.x, sa = dir.y;
        d = vec2(ca * d.x + sa * d.y, -sa * d.x + ca * d.y);
        float e = length(d / vec2(0.24 + 0.14 * r.x, 0.1 + 0.06 * r.y));
        float u = clamp((e - 1.0) / 0.21, -1.0, 1.0), w = 0.5 + 0.5 * lkH2(c + 3.3);
        // (the lip is an arc on the trailing side, fading out round the ends: a whole ring read as a drawn loop)
        float l = (1.0 - u * u) * (1.0 - u * u) * smoothstep(-0.1, 0.7, d.x / max(length(d), 1e-4));
        h += ((1.0 - smoothstep(0.0, 1.0, e)) * 0.35 + l) * w;
        lip = max(lip, l * w);
      }
      return h * amp;
    }
    // A round pit, one at most in each cell, at its own place and of its own size (a sixth to a half of the cell across), as
    // a soft bowl: m is where it is, dep how deep there (1 in the middle). Where it is too small to draw, its average.
    // (Thresholded noise made the pits first: square-ish blobs of one shade, "like a printed decal", iteration 8)
    float plPit(vec2 q, float cell, float seed, float px, out float dep) {
      vec2 c = floor(q / cell), r = lkH22(c + seed);
      float rad = cell * (0.08 + 0.17 * lkH2(c + seed + 3.0));
      float on = step(0.3, lkH2(c + seed + 7.0));
      vec2 ctr = (c + 0.5 + (r - 0.5) * (1.0 - 2.0 * rad / cell)) * cell;
      float d = length(q - ctr) / rad, aa = clamp(px / rad, 0.15, 1.0);
      float m = (1.0 - smoothstep(1.0 - aa, 1.0 + aa, d)) * on;
      float k = lkKeep(cell * 0.35, px);
      dep = mix(0.04, m * clamp(1.0 - d * d, 0.0, 1.0), k);
      return mix(0.06, m, k);
    }`;
  // (colour and key: a room's own white, the entrance's ceiling since iteration 8. Its own key, or three.js reuses the
  // first compiled colour, as it did with the limewash)
  function plaster(orig, ceiling, colour, key) {
    const col = colour || (ceiling ? [1.24, 1.17, 1.09] : [0.647, 0.62, 0.577]);
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.88 }), key || (ceiling ? 'ceiling' : 'plaster'), {
      head: PLASTER,
      surface: `
        vec2 q; vec3 ta, tb; lkPlane(lkP, lkWN, q, ta, tb);
        float pPx = ${ceiling ? 'mix(lkPxM, lkPx, 0.35)' : 'lkPx'};
        float lip;
        float h = trowel(q, ${ceiling ? '0.00008' : '0.00016'}, lip);
        // The stucco's stipple: small pits and crumbs of one to four millimetres. (Without it the code walls read smooth
        // and unfinished next to the scan, the reviewer's note of 15 Oct: fine detail 0.6 against the scan's 3.4.)
        // (iteration 8: softer edged, each its own depth, and where too small to draw, their average, not nothing. Hard edged
        // and all one shade they read as "a printed decal", gone a couple of metres away)
        float dA, dB, dC;
        float pit = plPit(q, 0.005, 3.0, pPx, dA) + plPit(q + 0.0031, 0.0038, 11.0, pPx, dB) + 0.8 * plPit(q, 0.011, 19.0, pPx, dC);
        float crumb = mix(0.03, smoothstep(0.74, 0.84, lkn(vec3(q * 520.0, 5.0))), lkKeep(0.002, pPx));
        h += (${ceiling ? '0.75' : '1.0'}) * (-0.0005 * (dA + dB + dC) + 0.00012 * crumb);
        float mh = lkFbm(vec3(q, 9.0), 60.0, 0.55, 3, lkPx).x;
        h += 0.00012 * mh;
        lkG = lkSurfGrad(lkWN, dFdx(h), dFdy(h));
        vec4 sand = lkFbm(vec3(q * 1.0, 0.5), 700.0, 0.55, 3, pPx);          // sand, a millimetre and under
        lkG += (ta * sand.y + tb * sand.z) * 0.00009;
        float cloud = lkFbm(vec3(q, 2.0), 1.3, 0.5, 3, pPx).x;
        lkG *= lkFlat(lkWN);
        // a mottle between the sand and the clouds, 5 mm to 5 cm: what stucco still shows from across a room (the reviewer
        // measured the hall's wall flat at two metres, iteration 8)
        float mott = lkFbm(vec3(q, 7.0), 40.0, 0.6, 4, pPx).x;
        diffuseColor.rgb *= ${v3(col)} * (1.0 + ${ceiling ? '0.028' : '0.07'} * cloud - ${ceiling ? '0.0015' : '0.004'} * lip + 0.025 * sand.x + ${ceiling ? '0.055' : '0.1'} * mott) * (1.0 - ${ceiling ? '0.075' : '0.18'} * clamp(pit, 0.0, 1.0));
        // (the lips no glossier than the rest: burnished, every arc caught the light at a slant as a thin bright scribble,
        // and the reviewer read the WC's wall as "painted wood", iteration 8)
        roughnessFactor = clamp(0.9 - 0.04 * lip + 0.1 * sand.x + 0.04 * mott, 0.5, 1.0);`,
    });
  }

  /* ---------- board-marked concrete: the fireplace -----------------------------------------------
     Poured against rough sawn boards 12 cm wide. Each board a little proud or set back, cupped and tilted, so the
     face is a patchwork of planes; the board's grain and growth rings pressed into it; a fine fin of cement where
     two boards met; bug holes, more of them high in each lift; each board drank the water its own way, so each is
     its own shade. The hearth's top was trowelled, not boarded. */
  const BOARD = `
    vec4 bdA;
    float bdH(vec2 q, float px, out vec4 a) {
      float Hh = 0.12, row = floor(q.y / Hh), v = fract(q.y / Hh);
      float L = 1.8 + 1.4 * lkH2(vec2(row, 2.2)), off = lkH2(vec2(row, 8.8)) * L;
      float uu = (q.x + off) / L, col = floor(uu), u = fract(uu);
      vec2 id = vec2(row, col);
      float r1 = lkH2(id), r2 = lkH2(id + 5.1), r3 = lkH2(id + 9.7);
      float y = (v - 0.5) * Hh, lx = u * L;
      float ev = min(v, 1.0 - v) * Hh, eu = min(u, 1.0 - u) * L;
      // the board's own plane (a little proud or back, cupped, tilted), easing back at the joint: never a step
      float s = max(0.005, px * 1.6);
      float plane = ((r1 - 0.5) * 0.0014 + 0.0004 * pow(2.0 * y / Hh, 2.0) + (r2 - 0.5) * 0.002 * y / Hh) * smoothstep(0.0, s, min(ev, eu));
      // The board's rough sawn face pressed into the concrete: streaks along it at every size, the fibres torn by the
      // saw in short dashes, and a few of its rings. These streaks are what reads as "board marked" from the sofa.
      float yy = y + 0.002 * sin(lx * 2.0 + r3 * 7.0);
      float k1 = lkKeep(0.01, px), k2 = lkKeep(0.0035, px), k3 = lkKeep(0.0015, px);
      float st = (lkn(vec3(lx * 0.8, yy * 90.0, r1 * 30.0)) - 0.5) * k1 + 0.8 * (lkn(vec3(lx * 2.0, yy * 260.0, r2 * 30.0)) - 0.5) * k2
               + 0.6 * (lkn(vec3(lx * 9.0, yy * 650.0, r3 * 30.0)) - 0.5) * k3;
      float rr = length(vec2(yy - (r2 - 0.5) * 0.15, 0.03 + 0.1 * r3 + (r1 - 0.5) * 0.06 * lx)) + 0.01 * lkn(vec3(lx * 0.6, yy * 4.0, r2 * 30.0));
      float ring = rr / 0.006, rv = 1.0 - smoothstep(0.2, 0.5, fwidth(ring));
      float rings = mix(0.0, (1.0 - smoothstep(0.0, 0.2, fract(ring))) * step(0.5, r3), rv);
      // the fin of cement where two boards met, broken here and there; a dark line where it broke away
      // (each joint as wide as the pixel is across it: by the pixel's longest side, which at a slant is the stretched one,
      // the joints along the boards became thick dark bands broken by the fin, "dashed dark scan lines", iteration 8)
      // (at least a pixel and a half: thinner, a seam slanting across the screen broke into dots, the next review)
      float fwy = max(0.0009, fwidth(q.y) * 1.1), fwx = max(0.0009, fwidth(q.x) * 1.1);
      float run = smoothstep(0.35, 0.6, lkn(vec3(q.x * 6.0, row, 2.0)));
      float fin = exp(-pow(ev / fwy, 2.0)) * run * (0.0009 / fwy) + 0.5 * exp(-pow(eu / fwx, 2.0)) * (0.0009 / fwx);
      float gap = exp(-pow(ev / fwy, 2.0)) * (1.0 - run) * (0.0009 / fwy);
      // bug holes: round pits of 1 to 6 mm, few, scattered, more of them near the top of each 1.2 m lift
      vec2 hc = floor(q / 0.045); vec2 hr = lkH22(hc + 3.0);
      float rad = 0.0008 + 0.0028 * pow(lkH2(hc + 7.0), 2.0);
      float pit = step(0.86 - 0.18 * smoothstep(0.6, 1.0, fract(q.y / 1.2)), lkH2(hc + 1.0)) * (1.0 - smoothstep(rad * 0.5, rad, length(q - (hc + 0.15 + 0.7 * hr) * 0.045)));
      pit *= min(1.0, rad / max(px * 0.6, 1e-5));
      a = vec4(1.0 + 0.07 * (r1 - 0.5), fin - gap, pit, st + 0.25 * rings);
      return plane + 0.00028 * st - 0.0001 * rings + 0.0005 * fin - 0.0004 * gap - 0.002 * pit;
    }
`;
  function boardConcrete(orig) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.74 }), 'board', {
      head: BOARD,
      surface: `
        vec2 q; vec3 ta, tb; lkPlane(lkP, lkWN, q, ta, tb);
        vec3 col = ${v3([0.246, 0.236, 0.22])};
        float cloud = lkFbm(vec3(q * 1.0, 6.0), 1.6, 0.5, 4, lkPx).x;
        // monolithic cast architectural concrete hearth: fine trowelled top, crisp aggregate and bug holes on the fascia
        vec4 tr = lkFbm(vec3(q, 3.0), 9.0, 0.5, 4, lkPx), gr = lkFbm(vec3(q, 9.0), 500.0, 0.6, 2, lkPx);
        vec4 mid = lkFbm(vec3(q, 11.0), 28.0, 0.72, 5, lkPx);
        float grit = (lkn(vec3(q * 700.0, 5.0)) - 0.5) * lkKeep(0.0015, lkPx) + 0.6 * (lkn(vec3(q * 300.0, 6.0)) - 0.5) * lkKeep(0.0035, lkPx);
        float voids = smoothstep(0.32, 0.37, lkFbm(vec3(q, 17.0), 85.0, 0.6, 3, lkPx).x) * lkKeep(0.003, lkPx);
        // scattered 2 to 5 mm bug holes on the vertical cast fascia
        vec2 hc = floor(q / 0.038); vec2 hr = lkH22(hc + 3.0);
        float rad = 0.0007 + 0.0022 * pow(lkH2(hc + 7.0), 2.0);
        float pit = step(0.84, lkH2(hc + 1.0)) * (1.0 - smoothstep(rad * 0.45, rad, length(q - (hc + 0.15 + 0.7 * hr) * 0.038)));
        pit *= min(1.0, rad / max(lkPx * 0.6, 1e-5)) * step(abs(lkWN.y), 0.7);
        float swirl = smoothstep(0.55, 0.8, lkn(vec3(q * vec2(3.2, 1.4), 7.0)));
        float agg = smoothstep(0.76, 0.89, lkn(vec3(q * 165.0, 2.0))) * lkKeep(0.0045, lkPx);
        float h0 = 0.00025 * mid.x + 0.00008 * grit - 0.0016 * pit - 0.0006 * voids;
        ${SLOPE('h0')}
        lkG += ((ta * tr.y + tb * tr.z) * 0.0003 + (ta * gr.y + tb * gr.z) * 0.00008) * lkFlat(lkWN);
        diffuseColor.rgb *= col * (1.0 + 0.18 * cloud + 0.04 * gr.x) * (1.0 + 0.24 * mid.x) * (1.0 + 0.28 * grit) * (1.0 + 0.22 * agg) * (1.0 - 0.48 * voids - 0.6 * pit) * (1.0 - 0.08 * swirl);
        roughnessFactor = clamp(0.68 + 0.1 * tr.x - 0.08 * agg - 0.1 * swirl + 0.1 * mid.x + 0.15 * pit, 0.42, 0.96);`,
    });
  }

  /* ---------- the cloths. All laid in the plane the surface faces, in metres ---------------------
     A cushion's thickness rides in its UV (see pillowUv): x is signed height in the cushion, y carries 1000 plus the
     welt shoulder height for box cushions (or 1000 for knife-edge scatter cushions). */
  const SEAM = `
    // the seam round a cushion: double French piping at top and bottom welt shoulders (box cushions) or a knife seam (scatter cushions)
    float seamH(float cord) {
      if (vLkUv.y < 500.0) return 0.0;
      float zSh = max(0.0, vLkUv.y - 1000.0);
      float z = zSh > 0.0001 ? abs(vLkUv.x) - zSh : vLkUv.x;
      float zw = max(fwidth(vLkUv.x), 1e-5);
      float rc = max(cord, zw * 1.15);
      float pipe = cord > 0.0 ? sqrt(max(0.0, rc * rc - z * z)) * (cord / rc) : 0.0;
      float gw = max(0.0014, zw * 0.85), groove = exp(-pow((abs(z) - rc - gw * 0.45) / gw, 2.0)) * (0.0014 / gw);
      float pucker = exp(-abs(z) / 0.022) * (lkn(vec3(vDrawW * 48.0)) - 0.5) * 0.00032 * lkKeep(0.006, zw);
      return pipe - 0.00085 * groove + pucker;
    }`;
  const CLOTH_SEAM = (cord) => `
        { float hs = seamH(${f(cord)}); lkG += lkSurfGrad(lkWN, dFdx(hs), dFdy(hs));
          if (vLkUv.y > 500.0) {
            float zSh = max(0.0, vLkUv.y - 1000.0);
            float zz = abs(zSh > 0.0001 ? abs(vLkUv.x) - zSh : vLkUv.x);
            float sw = max(0.0015, fwidth(vLkUv.x));
            diffuseColor.rgb *= 1.0 - 0.24 * exp(-pow((zz - ${f(cord)} * 1.08) / sw, 2.0));
            diffuseColor.rgb *= 1.0 + 0.06 * exp(-pow(zz / max(${f(cord)} * 0.75, sw * 0.75), 2.0));
          } }`;

  /* boucle: loops of yarn about 3.5 mm across in two shades of wool, bunched into knots of about 9 mm. A sparse sum
     of bumps: each loop a ring with a little yarn in its middle, each knot a dome. The hollows between them are in
     shadow. Seen from across the room the loops are smaller than a pixel: their shade averages out, the knots and
     the sheen (wool lights up at a grazing angle) carry the cloth. */
  const BOUCLE = `
    vec4 bcA;
    float loops(vec2 q, float cell, float rad, float tube, float amp, out float tone) {
      vec2 c0 = floor(q / cell); float h = 0.0, wt = 0.0; tone = 0.0;
      for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
        vec2 c = c0 + vec2(float(i), float(j)), r = lkH22(c);
        float rr = rad * cell * (0.7 + 0.6 * lkH2(c + 4.4));
        float d = length(q - (c + r) * cell);
        float u1 = clamp((d - rr) / (tube * cell * 1.6), -1.0, 1.0), u2 = clamp(d / (rr * 1.1), 0.0, 1.0);
        float b = ((1.0 - u1 * u1) * (1.0 - u1 * u1) + 0.45 * (1.0 - u2 * u2) * (1.0 - u2 * u2)) * (0.55 + 0.45 * r.x);
        h += b; tone += b * lkH2(c + 11.0); wt += b;
      }
      tone = wt > 1e-4 ? tone / wt : 0.5;
      return h * amp;
    }
    float bcH(vec2 q, float px, out vec4 a) {
      float t1, t2;
      float k1 = lkKeep(0.0035, px), k2 = lkKeep(0.009, px);
      float h = 0.0;
      if (k1 > 0.0) h += k1 * loops(q, 0.0035, 0.38, 0.17, 0.0008, t1); else t1 = 0.5;
      if (k2 > 0.0) h += k2 * loops(q + 0.37, 0.009, 0.22, 0.3, 0.0014, t2); else t2 = 0.5;
      float swell = 0.00055 * lkFbm(vec3(q, 2.3), 4.5, 0.5, 3, px).x;
      a = vec4(t1, t2, k1, k2);
      return h + swell;
    }
`;
  function boucle(orig, base, key) {
    base = base || [0.608, 0.548, 0.458];
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.90, sheen: 1, sheenRoughness: 0.48, sheenColor: new THREE.Color().setRGB(base[0] * 0.78, base[1] * 0.78, base[2] * 0.82) }), key || 'boucle', {
      head: BOUCLE + SEAM,
      surface: `
        vec2 q; vec3 ta, tb; lkPlane(lkP, lkWN, q, ta, tb);
        vec4 au; float hh = bcH(q, lkPxM, au);
        // Master Bedroom End-of-Bed Bench (x = 46.23..48.27, y = 35.02..35.54, z = 0.305..0.440):
        // 8x2 channel-tufted oatmeal-boucle seat mattress with deep stitched grooves and pillowed crown squares
        float pxPlan = vDrawW.x + 30.0, pyPlan = vDrawW.z + 24.0, pzH = vDrawW.y;
        float onBedBench = step(46.18, pxPlan) * step(pxPlan, 48.32) * step(34.98, pyPlan) * step(pyPlan, 35.58) * step(0.302, pzH) * step(pzH, 0.442);
        float bxDist = abs(fract((pxPlan - 47.25) / 0.24) - 0.5) * 0.24;
        float byDist = abs(pyPlan - 35.28);
        float gxB = (1.0 - smoothstep(0.0020, max(0.0055, lkPx * 1.4), bxDist)) * step(abs(pxPlan - 47.25), 0.90);
        float gyB = (1.0 - smoothstep(0.0020, max(0.0055, lkPx * 1.4), byDist)) * step(abs(pxPlan - 47.25), 0.94) * step(0.35, abs(lkWN.y));
        float tuftGroove = onBedBench * clamp(gxB + gyB * 0.85, 0.0, 1.0);
        float tuftDimple = onBedBench * exp(-((bxDist * bxDist + byDist * byDist) / 0.00045)) * step(abs(pxPlan - 47.25), 0.90) * step(0.45, abs(lkWN.y));
        float tuftPuff = onBedBench * sin(clamp(bxDist / 0.12, 0.0, 1.0) * 3.14159) * sin(clamp(byDist / 0.25, 0.0, 1.0) * 3.14159) * smoothstep(0.25, 0.85, abs(lkWN.y));
        hh += 0.0011 * tuftPuff - 0.0018 * tuftGroove - 0.0014 * tuftDimple;
        ${SLOPE('hh')}
        // in the hollows the yarn is in its own shadow, and on top of a loop it catches the light. A loop is cream or oat
        float lift = clamp(hh / 0.0016, 0.0, 1.0);
        float shade = mix(0.93, mix(0.80, 1.09, lift), max(au.z, au.w));
        float two = mix(0.5, mix(au.x, au.y, 0.42), max(au.z, au.w));
        vec3 col = ${v3(base)} * shade * mix(vec3(0.93, 0.92, 0.89), vec3(1.07, 1.08, 1.09), two);
        col *= 1.0 + 0.055 * lkFbm(vec3(q, 1.0), 5.5, 0.5, 3, lkPx).x;       // the dye lot drifts a little
        col *= (1.0 + 0.08 * tuftPuff) * (1.0 - 0.36 * tuftGroove - 0.28 * tuftDimple);
        diffuseColor.rgb *= col / 0.93;
        roughnessFactor = clamp(0.92 - 0.09 * lift + 0.06 * tuftGroove, 0.72, 0.98);
        ${CLOTH_SEAM(0.0036)}`,
      light: 'material.sheenColor *= 0.85 + 0.3 * lkn(vec3(vDrawW.xz * 40.0, 1.0));',
    });
  }

  /* linen: a plain weave of slubby yarn. The weave (0.6 mm) only shows close up. From a few metres linen is its
     slubs (threads thicker for a few centimetres, a streak in the cloth), its crumples, and a dull lustre. */
  const LINEN = `
    vec4 lnA;
    float lnH(vec2 q, float px, float seed, out vec4 a) {
      // the weave
      float P = 0.0006; vec2 t = q / P; vec2 ti = floor(t), tf = fract(t);
      float over = mod(ti.x + ti.y, 2.0);
      float kw = lkKeep(P * 2.0, px);
      float weave = kw * mix(sin(3.1416 * tf.y), sin(3.1416 * tf.x), over);
      // slubs: streaks along the warp and the weft at three widths
      float s1 = lkn(vec3(q.x * 320.0, q.y * 14.0, seed)) * lkKeep(0.003, px) + lkn(vec3(q.x * 14.0, q.y * 320.0, seed + 5.0)) * lkKeep(0.003, px);
      float s2 = lkn(vec3(q.x * 110.0, q.y * 6.0, seed + 2.0)) * lkKeep(0.009, px) + lkn(vec3(q.x * 6.0, q.y * 110.0, seed + 7.0)) * lkKeep(0.009, px);
      // crumples: soft ridges a few centimetres apart, and a slower swell
      float cr = 1.0 - abs(2.0 * lkn(vec3(q * vec2(24.0, 38.0), seed + 1.0)) - 1.0);
      float sw = lkn(vec3(q * 9.0, seed + 3.0));
      a = vec4(s1, s2, cr, weave);
      return 0.00008 * weave + 0.00012 * (s1 + s2) + 0.0005 * pow(cr, 3.0) + 0.0012 * sw;
    }
`;
  // (crumple: how much of the crumpled ridges to keep, 1 for all. Bedding is pressed: on the bed's pillows at 1 the ridges
  // read as a camouflage of blotches, the night of 15 to 16 Oct)
  function linen(orig, key, col, sheen, crumple) {
    const ck = f(1 - (crumple == null ? 1 : crumple));
    const isDuvet = key === 'duvet', isCotton = key === 'cotton', isRust = key === 'rust';
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: isCotton ? 0.74 : 0.80, sheen: 1, sheenRoughness: isCotton ? 0.36 : 0.42,
      sheenColor: new THREE.Color().setRGB(col[0] * sheen + 0.04, col[1] * sheen + 0.04, col[2] * sheen + 0.04),
      emissive: orig.emissive ? orig.emissive.clone() : new THREE.Color(0) }), 'linen-' + key, {
      head: LINEN + SEAM,
      surface: `
        vec2 q; vec3 ta, tb; lkPlane(lkP, lkWN, q, ta, tb);
        float lPx = mix(lkPxM, lkPx, 0.26);
        float seed = ${f((key.length * 7.3) % 11)};
        float h0 = lnH(q, lPx, seed, lnA) - ${ck} * 0.0005 * pow(lnA.z, 3.0);
        float baffleShade = 0.0, hemLine = 0.0, cashmereRib = 0.0, bathTerry = 0.0;
        // Bathroom spa towels (x > 51.0, y > 35.0): crisp woven waffle-terrycloth loop relief & dobby border rib
        float inBathTowel = step(51.0, vDrawW.x + 30.0) * step(35.0, vDrawW.z + 24.0);
        if (inBathTowel > 0.5) {
          float kTerry = lkKeep(0.0048, min(lPx, max(min(fwidth(q.x), fwidth(q.y)) * 0.52, 1e-4)));
          float tRibX = sin(q.x / 0.0055 * 6.28318), tRibY = sin(q.y / 0.0045 * 6.28318);
          float waffle = (0.55 * tRibX + 0.45 * tRibY + 0.38 * tRibX * tRibY) * kTerry;
          bathTerry = waffle;
          h0 += 0.00095 * waffle;
        }
        ${isDuvet ? `
        // Cloud-loft Belgian flax-linen duvet: soft quilted baffle channels (44 cm x 48 cm) and organic linen drape creases
        vec2 bDist = abs(fract((vDrawW.xz - vec2(17.25, 9.80)) / vec2(0.44, 0.48) + 0.5) - 0.5) * vec2(0.44, 0.48);
        float bSeamX = (1.0 - smoothstep(0.0025, max(0.0075, lPx * 1.5), bDist.x)) * step(0.45, abs(lkWN.y));
        float bSeamZ = (1.0 - smoothstep(0.0025, max(0.0075, lPx * 1.5), bDist.y)) * step(0.45, abs(lkWN.y));
        float bSeam = clamp(bSeamX * 0.75 + bSeamZ * 0.65, 0.0, 1.0);
        float bPuff = sin(clamp(bDist.x / 0.22, 0.0, 1.0) * 3.14159) * sin(clamp(bDist.y / 0.24, 0.0, 1.0) * 3.14159) * step(0.35, abs(lkWN.y));
        float drapeFold = sin(q.x * 18.0 + lkn(vec3(q * 4.5, 2.0)) * 2.4) * (1.0 - step(0.55, abs(lkWN.y)));
        h0 += 0.00095 * bPuff - 0.00085 * bSeam + 0.00065 * drapeFold;
        baffleShade = 0.06 * bPuff - 0.14 * bSeam + 0.05 * drapeFold;
        ` : ''}
        ${isCotton ? `
        // Crisp 600-thread-count cotton percale: tailored double-stitched hem line on the fold-back sheet & Oxford pillow border
        float pyPlan = vDrawW.z + 24.0;
        float dSheetHem = min(abs(pyPlan - 33.43), abs(pyPlan - 33.04));
        hemLine = exp(-pow(dSheetHem / max(0.0032, lPx * 1.3), 2.0)) * step(32.95, pyPlan) * step(pyPlan, 33.52) * step(0.60, vDrawW.y);
        h0 -= 0.00045 * hemLine;
        ` : ''}
        ${isRust ? `
        // Woven terracotta-cashmere herringbone bed runner throw with tactile twill ribs
        float hCol = floor(q.x / 0.014), hDir = mod(hCol, 2.0) < 0.5 ? 1.0 : -1.0;
        float hWave = sin((q.y + hDir * (q.x - hCol * 0.014)) / 0.0028 * 6.28318) * lkKeep(0.0028, lPx);
        cashmereRib = hWave;
        h0 += 0.00038 * cashmereRib;
        ` : ''}
        ${SLOPE('h0')}
        float streak = (lnA.x - 0.5 * lkKeep(0.003, lPx) * 2.0) * 0.08 + (lnA.y - 0.5 * lkKeep(0.009, lPx) * 2.0) * 0.07;
        vec3 col = ${v3(col)} * mix(1.0, 0.74, inBathTowel) * (1.0 + streak + baffleShade + 0.09 * cashmereRib + 0.20 * bathTerry - 0.12 * hemLine) * (1.0 - 0.08 * (1.0 - ${ck}) * (1.0 - lnA.z)) * (1.0 + 0.05 * lnA.w);
        col *= 1.0 + 0.055 * lkFbm(vec3(q, 7.0), 4.0, 0.5, 3, lPx).x;
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.80 - 0.1 * lnA.x * lkKeep(0.003, lPx) - 0.06 * pow(lnA.z, 3.0) - 0.04 * abs(baffleShade), 0.46, 0.96);
        ${CLOTH_SEAM(0.0030)}`,
    });
  }

  /* the rug: a warm stone-oatmeal hand-loomed Berber wool carpet with chunky corded ribs, natural abrash dye bands,
     a bound selvedge border, and a recessed double-line dark umber architectural windowpane grid */
  const RUGR = [13.12, 11.62, 17.78, 13.88];
  const RUG = `
    vec4 rgA;
    float rgH(vec2 q, float px, float lineMask, out vec4 a) {
      float rib = q.y / 0.015, ri = floor(rib), rf = fract(rib);
      float lp = (q.x + lkH2(vec2(ri, 1.0)) * 0.011) / 0.011, li = floor(lp), lf = fract(lp);
      float k1 = lkKeep(0.015, px), k2 = lkKeep(0.011, px);
      float hr = mix(0.64, sin(3.1416 * rf), k1), hl = mix(0.64, sin(3.1416 * lf), k2 * k1);
      float tuft = (lkn(vec3(q * vec2(26.0, 38.0), 2.0)) - 0.5) * lkKeep(0.022, px);
      float yarn = lkH2(vec2(ri, li));
      a = vec4(yarn, hr, hl, k1);
      return 0.0022 * hr * (0.72 + 0.28 * hl) + 0.0009 * tuft - 0.0011 * lineMask;
    }
`;
  function rug(orig) {
    const W0 = W(RUGR[0], RUGR[1]), W1 = W(RUGR[2], RUGR[3]);
    const CX = (W0[0] + W1[0]) * 0.5, CZ = (W0[2] + W1[2]) * 0.5;
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.92, sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color().setRGB(0.55, 0.49, 0.41) }), 'rug', {
      head: RUG,
      surface: `
        vec2 q = vec2(lkP.x, lkP.z); vec3 ta = vec3(1.0, 0.0, 0.0), tb = vec3(0.0, 0.0, 1.0);
        float edgeX = min(vDrawW.x - ${f(W0[0])}, ${f(W1[0])} - vDrawW.x);
        float edgeZ = min(vDrawW.z - ${f(W0[2])}, ${f(W1[2])} - vDrawW.z);
        float edge = min(edgeX, edgeZ);
        float bind = 1.0 - smoothstep(0.032, 0.038, edge);
        // subtle hand-loomed warp jitter for the architectural double-line grid and inner border frame
        vec2 wj = 0.003 * vec2(lkn(vec3(q * 16.0, 4.0)) - 0.5, lkn(vec3(q * 16.0, 8.0)) - 0.5);
        vec2 p0 = vec2(vDrawW.x - ${f(CX)}, vDrawW.z - ${f(CZ)}) + wj;
        float aa = max(0.0035, lkPx * 0.95);
        // inner perimeter frame at 11 cm and 15.5 cm from the rug edge, plus interior double-line grid every 54 cm x 50 cm
        float inField = smoothstep(0.102, 0.108, edge);
        float inGrid = smoothstep(0.152, 0.158, edge);
        float frameLine = (1.0 - smoothstep(0.0055, 0.0055 + aa, abs(edge - 0.11))) + (1.0 - smoothstep(0.0055, 0.0055 + aa, abs(edge - 0.154)));
        vec2 gCell = floor((p0 + vec2(0.27, 0.25)) / vec2(0.54, 0.50));
        vec2 gLocal = p0 - gCell * vec2(0.54, 0.50);
        float gx = 1.0 - smoothstep(0.0055, 0.0055 + aa, abs(abs(gLocal.x) - 0.022));
        float gz = 1.0 - smoothstep(0.0055, 0.0055 + aa, abs(abs(gLocal.y) - 0.022));
        float lineMask = clamp(frameLine * inField + max(gx, gz) * inGrid, 0.0, 1.0);
        float h0 = rgH(q, lkPx, lineMask, rgA);
        ${SLOPE('h0')}
        // subtle tonal variation between grid bays and natural weft abrash
        float bayTone = (lkH2(gCell + vec2(3.7, 9.1)) - 0.5) * 0.07 * inGrid;
        vec3 y3 = rgA.x < 0.38 ? vec3(0.91, 0.89, 0.86) : rgA.x < 0.78 ? vec3(1.0) : vec3(1.12, 1.09, 1.04);
        vec3 baseCol = ${v3([0.465, 0.398, 0.322])} * (1.0 + bayTone);
        baseCol *= mix(vec3(1.0), y3, rgA.w) * mix(0.96, mix(0.82, 1.12, rgA.y * rgA.z), rgA.w);
        baseCol *= 1.0 + 0.07 * (lkn(vec3(0.0, q.y * 2.8, 3.0)) - 0.5) + 0.05 * lkFbm(vec3(q, 2.0), 3.5, 0.5, 3, lkPx).x;
        vec3 lineCol = ${v3([0.145, 0.112, 0.086])} * (0.92 + 0.16 * rgA.y);
        vec3 col = mix(baseCol, lineCol, lineMask * 0.88);
        col = mix(col, ${v3([0.23, 0.185, 0.145])} * (0.92 + 0.14 * sin(q.x / 0.012 * 6.283)), bind);
        if (lkWN.y < 0.5) col = ${v3([0.21, 0.168, 0.132])};
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.91 - 0.06 * rgA.y + 0.04 * lineMask, 0.78, 0.98);`,
    });
  }

  /* leather: cognac, semi-aniline. A pebble grain (cells about 1.6 mm with creases between them), the deeper creases
     of a seat that has been sat in, darker in the folds and paler where the leather is stretched over them (the oil
     moves away: "pull-up"), a waxed top coat, burnished edges, and saddle-stitched French piping on cushions. */
  const LEATHER = `
    vec4 ltA;
    vec2 cells(vec2 q) { vec2 c0 = floor(q), f0 = fract(q); float d1 = 8.0, d2 = 8.0;
      for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 g = vec2(float(i), float(j)), r = g + lkH22(c0 + g) * 0.85 - f0; float d = dot(r, r);
        if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
      return vec2(sqrt(d1), sqrt(d2)); }
    float ltH(vec2 q, float px, out vec4 a) {
      // the grain: pebbles of about 1.6 mm with creases between them, and the larger, lazier grain of a hide
      float k = lkKeep(0.0016, px), k2 = lkKeep(0.006, px);
      float crease = 0.0;
      if (k > 0.0) { vec2 c = cells(q / 0.0016); crease = (1.0 - smoothstep(0.0, 0.18, c.y - c.x)) * k; }
      float hide = (lkn(vec3(q * vec2(150.0, 60.0), 4.0)) - 0.5) * k2;
      // soft wrinkles where the leather has been sat in, and the slow swell of the padding
      float wr = lkFbm(vec3(q * vec2(1.0, 2.4), 2.0), 8.5, 0.56, 4, px).x;
      float fold = (1.0 - abs(2.0 * lkn(vec3(q * vec2(5.5, 14.0), 7.0)) - 1.0)) * lkKeep(0.015, px);
      float sw = lkn(vec3(q * 4.0, 5.0));
      a = vec4(crease, hide, wr, fold);
      return -0.00006 * crease + 0.00006 * hide + 0.0014 * wr - 0.00045 * pow(fold, 3.0) + 0.0015 * sw;
    }
`;
  // (key and base: another hide of the same leather, the dressing room's black shoes and bags, 16 Oct)
  function leather(orig, key, base) {
    base = base || [0.205, 0.074, 0.021];
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.48, clearcoat: 0.38, clearcoatRoughness: 0.28, sheen: 0.35, sheenRoughness: 0.45, sheenColor: new THREE.Color().setRGB(base[0] * 1.3, base[1] * 1.2, base[2] * 1.1) }), key || 'leather', {
      head: LEATHER + SEAM,
      surface: `
        vec2 q; vec3 ta, tb; lkPlane(lkP, lkWN, q, ta, tb);
        float h0 = ltH(q, lkPxM, ltA);
        // Couture vertical center back seam, twin-needle saddle stitching, and channel fluting on kitchen barstools & dining armchairs
        float pxPlan = vDrawW.x + 30.0, pyPlan = vDrawW.z + 24.0, pzH = vDrawW.y;
        float onStool = step(12.1, pxPlan) * step(pxPlan, 15.9) * step(4.72, pyPlan) * step(pyPlan, 5.48) * step(0.59, pzH);
        float stoolX = 12.6 + 1.4 * clamp(floor((pxPlan - 11.9) / 1.4), 0.0, 2.0);
        float dxSt = abs(pxPlan - stoolX);
        float onBack = onStool * smoothstep(5.00, 5.08, pyPlan) * smoothstep(0.630, 0.642, pzH);
        // Dining armchairs (4 north, 4 south along x = 18.65, 19.93, 21.21, 22.49)
        float onChair = step(18.15, pxPlan) * step(pxPlan, 23.05) * step(2.85, pyPlan) * step(pyPlan, 5.15) * step(0.47, pzH);
        float chairX = 18.65 + 1.28 * clamp(floor((pxPlan - 18.01) / 1.28), 0.0, 3.0);
        float dxCh = abs(pxPlan - chairX);
        float onChairBack = onChair * smoothstep(0.545, 0.565, pzH);
        float isInnerBack = onChairBack * step(abs(pyPlan - 4.00), 0.805);
        float isOuterBack = onChairBack * (1.0 - step(abs(pyPlan - 4.00), 0.805));
        float chPhase = abs(fract((pxPlan - chairX) / 0.068 + 0.5) - 0.5) * 0.068;
        float chanGroove = isInnerBack * (1.0 - smoothstep(0.0012, max(0.0032, lkPx * 1.3), chPhase)) * smoothstep(0.56, 0.59, pzH) * (1.0 - smoothstep(0.83, 0.86, pzH));
        float chanPuff = isInnerBack * sin(clamp(chPhase / 0.034, 0.0, 1.0) * 3.14159) * smoothstep(0.56, 0.59, pzH);
        // Gallery benches (two museum benches at x ~ 43.34, y = 16.9 and 22.9): transverse channel-tufting every 18 cm along y
        float onBench = step(42.95, pxPlan) * step(pxPlan, 43.75) * step(15.65, pyPlan) * step(pyPlan, 24.15) * step(0.38, pzH);
        float benchYc = pyPlan < 19.9 ? 16.9 : 22.9;
        float dyBench = pyPlan - benchYc;
        float onBenchSeat = onBench * step(abs(dyBench), 0.84) * step(pzH, 0.495);
        float bChDist = abs(fract((dyBench + 0.09) / 0.18) - 0.5) * 0.18;
        float benchGroove = onBenchSeat * (1.0 - smoothstep(0.0018, max(0.0045, lkPx * 1.4), bChDist));
        float benchPuff = onBenchSeat * sin(clamp(bChDist / 0.09, 0.0, 1.0) * 3.14159) * smoothstep(0.35, 0.85, abs(lkWN.y));
        float bStDash = 0.45 + 0.55 * smoothstep(-0.2, 0.5, sin(pxPlan * 1450.0)) * lkKeep(0.0025, lkPx);
        float benchStitch = onBenchSeat * exp(-pow((bChDist - 0.0065) / max(0.0016, lkPx * 1.0), 2.0)) * bStDash;
        float vSeam = onBack * exp(-pow(dxSt / max(0.0022, lkPx * 1.15), 2.0)) + isOuterBack * exp(-pow(dxCh / max(0.0024, lkPx * 1.15), 2.0)) + 0.75 * chanGroove + 0.88 * benchGroove;
        float stDash = 0.45 + 0.55 * smoothstep(-0.2, 0.5, sin(pzH * 1650.0)) * lkKeep(0.0025, lkPx);
        float vStitch = (onBack * exp(-pow((dxSt - 0.0068) / max(0.0014, lkPx * 0.95), 2.0)) + isOuterBack * exp(-pow((dxCh - 0.018) / max(0.0015, lkPx * 0.95), 2.0))) * stDash + benchStitch;
        float vPucker = onBack * exp(-pow(dxSt / 0.024, 2.0)) * (1.0 - vSeam) + 0.65 * chanPuff + 0.85 * benchPuff;
        float hWelt = onStool * exp(-pow((pzH - 0.635) / max(0.0024, lkPx * 1.15), 2.0)) + onChair * exp(-pow((pzH - 0.532) / max(0.0024, lkPx * 1.15), 2.0));
        h0 += -0.0014 * vSeam + 0.00058 * vPucker + 0.00035 * vStitch - 0.0009 * hWelt;
        ${SLOPE('h0')}
        float curv = length(fwidth(lkWN)) / max(length(fwidth(vDrawW)), 1e-5);
        float edge = smoothstep(5.0, 12.0, curv);
        float mottle = lkFbm(vec3(q, 3.0), 3.0, 0.6, 5, lkPx).x;
        vec3 col = ${v3(base)} * (1.0 + 0.22 * mottle);
        col = mix(col, col * vec3(1.32, 1.22, 1.08), (clamp(ltA.z * 3.2, 0.0, 1.0) * 0.55 + 0.30 * vPucker));   // pull-up: paler where stretched over a wrinkle
        col *= 1.0 - 0.22 * ltA.x - 0.14 * pow(ltA.w, 3.0) - 0.1 * edge + 0.12 * ltA.y;
        // worn paler on the seat and the tops of the cushions, where hands and legs rest
        float wear = smoothstep(0.5, 0.95, lkWN.y) * smoothstep(0.42, 0.72, lkn(vec3(q * 5.0, 9.0)));
        col = mix(col, col * vec3(1.34, 1.24, 1.09), wear * 0.38 + (onStool + onChair + onBench * 0.85) * 0.14);
        col *= (1.0 - 0.62 * vSeam) * (1.0 - 0.45 * hWelt);
        col = mix(col, ${v3([0.52, 0.32, 0.14])}, vStitch * 0.72);
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.45 + 0.16 * ltA.x - 0.12 * edge + 0.1 * mottle - 0.1 * wear + 0.22 * vSeam, 0.22, 0.88);
        ${CLOTH_SEAM(0.0028)}`,
    });
  }

  /* walnut, for the lounge chairs' frames, gallery benches, the Master Bedroom Makeup Vanity Desk, and the Master Bathroom
     Double Vanity: solid American black walnut, oiled, 3D grain aligned with legs, rails, and drawer fronts, with cathedrals,
     fine dark growth lines, and open pores */
  function walnut(orig, key) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.34, clearcoat: 0.28, clearcoatRoughness: 0.24 }), key || 'walnut', {
      surface: `
        vec3 p = vDrawW;
        float pxPlan = p.x + 30.0, pyPlan = p.z + 24.0, pzH = p.y;
        bool inBedVanity = pxPlan > 50.15 && pxPlan < 51.05 && pyPlan > 35.2 && pyPlan < 38.7 && pzH < 0.82;
        bool inBathVanity = pxPlan > 51.10 && pxPlan < 51.85 && pyPlan > 35.4 && pyPlan < 38.8 && pzH < 0.82;
        bool inVanity = inBedVanity || inBathVanity;
        float drwRow = inBedVanity ? floor(clamp((pzH - 0.14) / 0.15, 0.0, 3.0)) : (inBathVanity ? (pzH < 0.44 ? 0.0 : 1.0) : 0.0);
        float drwCol = inBedVanity ? (pyPlan < 36.33 ? 0.0 : (pyPlan > 37.67 ? 2.0 : 1.0)) : (inBathVanity ? (pyPlan < 36.567 ? 0.0 : (pyPlan > 37.633 ? 2.0 : 1.0)) : 0.0);
        float drwSeed = inVanity ? (drwRow * 3.7 + drwCol * 5.3 + (inBathVanity ? 7.0 : 0.0)) : 0.0;
        float up = step(0.55, abs(lkWN.x) + abs(lkWN.z)) * step(abs(lkWN.y), 0.55);
        bool alongZ = pxPlan > 41.0;
        vec2 g = up > 0.5 ? (alongZ && abs(lkWN.x) > 0.6 ? vec2(p.y + p.x + drwSeed * 0.11, p.z + drwSeed * 0.23) : vec2(p.x + p.z, p.y))
                          : (alongZ ? vec2(p.x + p.y * 0.5, p.z) : vec2(p.x * 0.7 + p.z * 0.7, p.z - p.x));
        float px = max(fwidth(g.x) * 0.7, 1e-5);
        float wan = 0.003 * (lkn(vec3(g.y * 1.4, g.x * 8.0, 1.0 + drwSeed)) - 0.5);
        float ring = (g.x + wan) / 0.0038 + 0.65 * (lkn(vec3(g.x * 24.0, g.y * 0.8, 3.0 + drwSeed)) - 0.5) * 6.0;
        float vis = 1.0 - smoothstep(0.22, 0.55, fwidth(ring));
        float band = mix(0.42, smoothstep(0.0, 0.26, fract(ring)) * (1.0 - smoothstep(0.48, 0.94, fract(ring))), vis);
        float fib = (lkn(vec3(g.x * 650.0, g.y * 6.0, 2.0)) - 0.5) * lkKeep(0.0014, px);
        float pores = smoothstep(0.68, 0.86, lkn(vec3(g.x * 950.0, g.y * 32.0, 4.0))) * lkKeep(0.0012, px);
        float h = 0.00014 * band + 0.00006 * fib - 0.00011 * pores;
        ${SLOPE('h')}
        lkG *= lkFlat(lkWN);
        float plankTone = inVanity ? (0.91 + 0.18 * fract(sin(drwSeed * 12.9898) * 43758.5453)) : 1.0;
        float topLipShade = inVanity ? (1.0 - 0.20 * smoothstep(0.72, 0.77, pzH) * step(0.5, abs(lkWN.x))) : 1.0;
        float bathChamfer = 1.0;
        if (inBathVanity && lkWN.x > 0.5) {
          float dySeam = min(abs(pyPlan - 36.567), abs(pyPlan - 37.633));
          float dzSeam = min(abs(pzH - 0.44), min(abs(pzH - 0.11), abs(pzH - 0.77)));
          bathChamfer = 1.0 - 0.24 * (1.0 - smoothstep(0.004, 0.022, min(dySeam, dzSeam)));
        }
        vec3 col = mix(${v3([0.105, 0.054, 0.026])}, ${v3([0.275, 0.158, 0.084])}, band) * (0.9 + 0.2 * lkn(vec3(g.x * 9.0, g.y * 0.6, 5.0))) * plankTone * topLipShade * bathChamfer;
        col *= (1.0 + 0.24 * fib) * (1.0 - 0.35 * pores);
        diffuseColor.rgb = col;
        roughnessFactor = clamp(0.30 + 0.08 * (1.0 - band) + 0.18 * pores, 0.20, 0.74);`,
    });
  }

  /* travertine, for the round side table and the forecourt's stone planters: cut across the bed, strata that wander,
     two scales of open pores with pale calcite rims, mineral veins, and honed relief */
  function travertine(orig) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.48 }), 'trav', {
      surface: `
        vec3 p = lkP;
        float wv = lkn(vec3(p.x * 2.2, p.y * 0.7, p.z * 2.2)) + 0.38 * lkn(vec3(p.x * 6.2, p.y * 2.2, p.z * 6.2));
        float strata = lkn(vec3(p.x * 1.6, p.y * 24.0 + wv * 4.2, p.z * 1.6)) * 0.56 + lkn(vec3(p.x * 3.6, p.y * 68.0 + wv * 8.5, p.z * 3.6)) * 0.44 * lkKeep(0.014, lkPx);
        float fine = mix(0.5, lkn(vec3(p.x * 6.5, p.y * 130.0 + wv * 9.0, p.z * 6.5)), lkKeep(0.008, lkPx));
        float pvCoarse = lkn(vec3(p.x * 18.0, p.y * 82.0 + wv * 7.0, p.z * 18.0));
        float poreCoarse = smoothstep(0.73, 0.87, pvCoarse) * smoothstep(0.24, 0.58, strata) * lkKeep(0.009, lkPx);
        float pv = lkn(vec3(p.x * 38.0, p.y * 175.0 + wv * 12.0, p.z * 38.0));
        float poreFine = smoothstep(0.74, 0.88, pv) * smoothstep(0.28, 0.58, strata) * lkKeep(0.0032, lkPx);
        float pore = clamp(poreCoarse + 0.85 * poreFine, 0.0, 1.0);
        float rim = (smoothstep(0.64, 0.73, pvCoarse) - poreCoarse) * lkKeep(0.009, lkPx) + (smoothstep(0.66, 0.74, pv) - poreFine) * lkKeep(0.0032, lkPx);
        float grain = (lkn(p * 180.0) - 0.5) * lkKeep(0.005, lkPx) + 0.7 * (lkn(p * 340.0) - 0.5) * lkKeep(0.002, lkPx);
        float h = 0.00055 * (strata - 0.5) + 0.00022 * (fine - 0.5) - 0.0022 * poreCoarse - 0.0014 * poreFine + 0.00012 * grain;
        lkG = lkSurfGrad(lkWN, dFdx(h), dFdy(h));
        vec3 col = mix(${v3([0.48, 0.40, 0.295])}, ${v3([0.33, 0.268, 0.188])}, smoothstep(0.24, 0.76, strata));
        col *= (0.90 + 0.20 * fine + 0.16 * grain + 0.12 * rim) * (1.0 - 0.56 * pore);
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.44 + 0.12 * fine + 0.38 * pore, 0.28, 0.92);`,
    });
  }

  /* monolithic Roman vein-cut travertine block for the low coffee table: crisp linear sedimentary strata, slender
     vein-cut travertine slit-pores with calcite rims, and sharp mineral veins across both the top and vertical sides */
  function stoneTable(orig) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.40, clearcoat: 0.08, clearcoatRoughness: 0.35 }), 'stoneTable', {
      surface: `
        vec3 p = vDrawW;
        float wv = lkn(vec3(p.x * 1.4, p.y * 0.9, p.z * 1.4)) + 0.28 * lkn(p * 4.5);
        float upright = 1.0 - smoothstep(0.5, 0.75, abs(lkWN.y));
        // vein-cut bedding runs lengthwise (along x) across both the tabletop (layered in z) and the vertical sides (layered in y)
        float crossAxis = mix(p.z * 22.0 + p.x * 1.1 + wv * 1.15, p.y * 26.0 + p.x * 0.8 + wv * 1.25, upright);
        float strata = lkn(vec3(p.x * 1.4, crossAxis, p.z * 1.4)) * 0.50
                     + lkn(vec3(p.x * 3.2, crossAxis * 2.8, p.z * 3.2)) * 0.32 * lkKeep(0.018, lkPx)
                     + lkn(vec3(p.x * 6.5, crossAxis * 6.2, p.z * 6.5)) * 0.18 * lkKeep(0.008, lkPx);
        float lamina = (lkn(vec3(p.x * 2.8, crossAxis * 9.5, p.z * 2.8)) - 0.5) * lkKeep(0.007, lkPx);
        // slender, elongated vein-cut travertine slit cavities aligned with the bedding planes (12:1 aspect ratio)
        vec3 poreP1 = mix(vec3(p.x * 9.5, p.y * 20.0, p.z * 105.0 + wv * 6.0), vec3(p.x * 9.5, p.y * 115.0 + wv * 6.0, p.z * 12.0), upright);
        vec3 poreP2 = mix(vec3(p.x * 22.0, p.y * 36.0, p.z * 195.0 + wv * 9.0), vec3(p.x * 22.0, p.y * 210.0 + wv * 9.0, p.z * 24.0), upright);
        float pv1 = lkn(poreP1), pv2 = lkn(poreP2);
        float bandMask = smoothstep(0.28, 0.72, strata);
        float pore1 = smoothstep(0.76, 0.88, pv1) * bandMask * lkKeep(0.014, lkPx);
        float pore2 = smoothstep(0.77, 0.89, pv2) * bandMask * lkKeep(0.007, lkPx);
        float pore = clamp(pore1 * 0.8 + pore2 * 0.75, 0.0, 1.0);
        float rim = clamp((smoothstep(0.68, 0.76, pv1) - pore1) * lkKeep(0.014, lkPx) + (smoothstep(0.69, 0.77, pv2) - pore2) * lkKeep(0.007, lkPx), 0.0, 1.0);
        // crisp calcite and dark mineral bedding veins
        float vCoord1 = lkn(vec3(p.x * 0.95, crossAxis * 0.45, p.z * 1.2 + 3.0));
        float vCoord2 = lkn(vec3(p.x * 1.8 + 4.0, crossAxis * 0.75, p.z * 1.8));
        float veinLight = 1.0 - smoothstep(0.0, max(0.014, fwidth(vCoord1) * 1.15), abs(vCoord1 - 0.52));
        float veinDark = 1.0 - smoothstep(0.0, max(0.012, fwidth(vCoord2) * 1.15), abs(vCoord2 - 0.47));
        float mid = lkFbm(p + 5.0, 9.5, 0.55, 4, lkPx).x;
        float grain = (lkn(p * 260.0) - 0.5) * lkKeep(0.0022, lkPx);
        float h = -0.0022 * pore + 0.00028 * (strata - 0.5) + 0.0002 * lamina + 0.00014 * mid - 0.00022 * veinDark + 0.00005 * grain;
        ${SLOPE('h')}
        lkG *= lkFlat(lkWN);
        vec3 col = mix(${v3([0.525, 0.452, 0.362])}, ${v3([0.385, 0.322, 0.248])}, smoothstep(0.22, 0.78, strata));
        col *= (1.0 + 0.20 * lamina + 0.14 * mid + 0.09 * grain + 0.11 * rim);
        col = mix(col, ${v3([0.61, 0.545, 0.455])}, veinLight * 0.50);
        col = mix(col, ${v3([0.265, 0.215, 0.162])}, veinDark * 0.42);
        col *= 1.0 - 0.48 * pore;
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.36 + 0.1 * mid + 0.12 * (1.0 - strata) + 0.38 * pore, 0.24, 0.88);`,
    });
  }

  /* olive bark: grey and fissured, plates split by cracks that run up the trunk and the limbs and twist with them,
     lichen in pale patches. Combines world position around the branch with tube arc-length (vLkUv.y) so longitudinal
     bark strips and deep fissures flow along leaning limbs and horizontal roots without any UV seam or grazing blur. */
  const BARKH = (center) => `
    vec4 bkA;
    float bkH(vec3 p, float px, out vec4 a) {
      // Seamless 3D world-plus-spline bark coordinates so longitudinal bark plates flow along trunks, leaning limbs, and roots without zebra stripes
      float sL = vLkUv.y;
      vec4 wFbm = lkFbm(p, 2.4, 0.58, 4, px);
      float ang = vLkUv.x * 6.2831853 + sL * 0.35 + wFbm.x * 2.2;
      vec3 bCoord1 = vec3(p.x * 1.45 + cos(ang) * 0.45, sL * 0.55 + p.y * 0.35, p.z * 1.45 + sin(ang) * 0.45);
      vec3 bCoord2 = vec3(p.x * 3.8 + cos(ang * 2.0) * 0.55, sL * 1.15 + p.y * 0.45, p.z * 3.8 + sin(ang * 2.0) * 0.55);
      float k0 = lkKeep(0.020, px), k1 = lkKeep(0.0080, px), k2 = lkKeep(0.0030, px);
      // 1. Macro gnarled bark plates & organic longitudinal furrows driven by 3D warped FBM (zero periodic zebra striping)
      vec4 macroFbm = lkFbm(bCoord1 + wFbm.xyz * 0.38, 3.2, 0.56, 4, px);
      float plate1 = clamp(0.5 + 1.15 * macroFbm.x, 0.0, 1.0);
      float furrow1 = smoothstep(0.52, 0.86, 1.0 - plate1) * k0;
      // Gnarled ancient trunk cavities & burl knots on the lower bole
      float burlField = lkn(bCoord1 * 1.6 + 2.7);
      float trunkMask = smoothstep(2.4, 0.65, vDrawW.y);
      float cavity = smoothstep(0.74, 0.90, burlField) * trunkMask * k0;
      float burlRim = (smoothstep(0.58, 0.74, burlField) - cavity) * trunkMask * k0;
      // 2. Secondary anastomosing longitudinal bark fissures (~2.5 cm scale)
      vec4 medFbm = lkFbm(bCoord2 + macroFbm.yzw * 0.12, 4.6, 0.58, 4, px);
      float f2a = abs(lkn(bCoord2 * 2.4 + vec3(wFbm.x * 1.6, 0.0, wFbm.z * 1.6)) - 0.5);
      float crack2 = (1.0 - smoothstep(0.02, 0.14, f2a)) * k1;
      float ridge2 = clamp(0.5 + 0.95 * medFbm.x, 0.0, 1.0) * (1.0 - 0.55 * crack2) * k1;
      // 3. Fine fibrous longitudinal wood-bark grain (~6 mm scale)
      float w3 = lkn(p * 14.0 + 2.3) - 0.5;
      float strip3 = (0.5 + 0.5 * sin(ang * 28.0 + sL * 3.0 + w3 * 5.2)) * k2;
      // 4. Continuous 3D multi-octave bark roughness so every ridge crest and furrow has tactile woody grain
      vec4 barkRough = lkFbm(p + 1.9, 10.5, 0.58, 4, px) + 0.65 * lkFbm(p + 6.4, 30.0, 0.58, 4, px);
      float microGrain = (lkn(p * 82.0) - 0.5) * k2 + 0.65 * (lkn(p * 170.0 + 4.0) - 0.5) * lkKeep(0.0018, px);
      float crack = clamp(0.55 * furrow1 + 0.52 * crack2 + 0.65 * cavity + 0.20 * (1.0 - strip3) * k2, 0.0, 1.0);
      float ridge = clamp((0.46 * plate1 + 0.34 * ridge2 + 0.24 * burlRim + 0.14 * strip3 + 0.28 * barkRough.x) * (1.0 - 0.70 * cavity), 0.0, 1.0);
      float fine = clamp(0.5 + 0.78 * barkRough.x + 0.48 * microGrain + 0.25 * (strip3 - 0.5), 0.0, 1.0);
      float lichen = smoothstep(0.70, 0.86, lkn(p * 14.0 + 2.0)) * smoothstep(0.45, 0.72, lkn(p * 3.0 + 5.0)) * (1.0 - crack);
      a = vec4(crack, fine, ridge, lichen);
      return 0.0044 * (plate1 + 0.40 * burlRim) * k0 + 0.0028 * ridge2 - 0.0052 * crack - 0.0036 * cavity + 0.0010 * strip3 + 0.0020 * barkRough.x + 0.00075 * microGrain;
    }`;
  // k: the bark's shade against the living olive's
  function bark(orig, key, k, center, room) {
    k = k || [1, 1, 1];
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.86 }), key || 'bark', {
      head: BARKH(center === undefined ? [10.55 - 15, 0, 15.75 - 12.5] : center),
      drawable: Object.assign({ noCap: true, noRing: true }, room ? { room } : {}),
      surface: `
        // Slant-tolerant pixel size so upper curved branches and roots keep their full longitudinal bark relief
        float bPx = mix(lkPxM, lkPx, 0.22);
        float h0 = bkH(lkP, bPx, bkA);
        ${SLOPE('h0')}
        float sunWarm = smoothstep(0.22, 0.78, lkn(vDrawW * 2.0 + 4.0));
        // Cohesive weathered Mediterranean olive bark: warm charcoal-umber crevices rising to weathered grey-taupe and silver-ash bark plates
        vec3 deepBark = ${v3([0.052 * k[0], 0.042 * k[1], 0.032 * k[2]])};
        vec3 midBark = ${v3([0.142 * k[0], 0.124 * k[1], 0.100 * k[2]])};
        vec3 ridgeBark = mix(${v3([0.218 * k[0], 0.198 * k[1], 0.168 * k[2]])}, ${v3([0.265 * k[0], 0.244 * k[1], 0.210 * k[2]])}, sunWarm);
        vec3 col = mix(midBark, ridgeBark, smoothstep(0.22, 0.78, bkA.z));
        col *= 0.78 + 0.44 * bkA.y;
        // Natural dark-umber bark fissures and burl hollows
        col = mix(col, deepBark, bkA.x * 0.74);
        // Subtle silver-celadon crustose lichen on weathered ridge crests
        col = mix(col, ${v3([0.25, 0.26, 0.21])}, bkA.w * 0.26);
        // Damp dark-earth root-collar grounding where the patio olive's roots and trunk base meet the soil bed
        float dPatio = length(vDrawW.xz - vec2(0.0, -6.0));
        float soilCollar = smoothstep(0.49, 0.40, vDrawW.y) * (1.0 - smoothstep(1.50, 1.90, dPatio));
        col = mix(col, ${v3([0.046, 0.033, 0.022])}, soilCollar * 0.50);
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.76 + 0.16 * bkA.x - 0.08 * bkA.z + 0.08 * (bkA.y - 0.5), 0.62, 0.96);`,
      end: `
        vec3 wn = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
        float skyBounce = clamp(wn.y * 0.45 + 0.55, 0.0, 1.0) * (1.0 - bkA.x * 0.72);
        reflectedLight.indirectDiffuse += material.diffuseColor * vec3(0.18, 0.17, 0.15) * skyBounce;`,
    });
  }

  /* olive leaves: a 3-forked woody Mediterranean olive shoot cluster (main curved stem + left and right lateral branchlets)
     bearing 21 slender lanceolate olive blades at varied botanical angles, with waxy deep olive-green upper surfaces,
     powdery silver-celadon upturned undersides, crisp 3D blade normals, and gentle Mediterranean wind sway. */
  const SPRIG = `
    void lkTwig(vec2 uv, vec2 a, vec2 b, float w0, float w1, float bow, inout float best, inout vec4 o) {
      vec2 ab = b - a, dir = normalize(ab), nr = vec2(-dir.y, dir.x);
      float tl = length(ab), t = dot(uv - a, dir), u = clamp(t / tl, 0.0, 1.0);
      if (t > -0.012 && t < tl + 0.008) {
        float curve = sin(u * 3.14159) * bow;
        float tw = abs(dot(uv - a, nr) - curve) - mix(w0, w1, u);
        if (tw < best) { best = tw; o = vec4(0.0, 0.0, 0.0, -1.0); }
      }
    }
    void lkBlade(vec2 uv, vec2 base, float ang, float len, float wid, float id, inout float best, inout vec4 o) {
      vec2 ld = vec2(cos(ang), sin(ang)), ln = vec2(-ld.y, ld.x), d = uv - base;
      float s = dot(d, ld) / len;
      if (s > -0.05 && s < 1.02) {
        float curve = sin(clamp(s, 0.0, 1.0) * 3.14159) * 0.0032 * (mod(id, 2.0) < 0.5 ? 1.0 : -1.0);
        float x = dot(d, ln) - curve;
        if (s < 0.11) {
          float pet = abs(x) - 0.0048;
          if (pet < best) { best = pet; o = vec4(0.0, 0.0, 0.0, -1.0); }
        }
        if (s > 0.0 && s < 1.0 && abs(x) < wid * 1.45) {
          // Slender willow-like lanceolate Olea europaea blade profile with pointed apex and cuneate base
          float w = wid * pow(sin(3.14159 * s), 0.62) * (1.0 - 0.24 * s);
          float dist = abs(x) - w;
          if (dist < best) { best = dist; o = vec4(0.0, w > 1e-5 ? clamp(x / w, -1.0, 1.0) : 0.0, s, id); }
        }
      }
    }
    vec4 sprig(vec2 uv, float seed) {
      // x: coverage, y: across the leaf (-1 to 1), z: along it (0 to 1), w: which leaf (or -1 for the woody twig/petiole)
      float best = 1e3; vec4 o = vec4(0.0, 0.0, 0.0, -1.0);
      float j1 = (lkH2(vec2(seed, 1.1)) - 0.5) * 0.06, j2 = (lkH2(vec2(seed, 2.3)) - 0.5) * 0.06;
      // 1. Main central woody olive twig (a0 -> b0) + two forked lateral branchlets (a1 -> b1, a2 -> b2)
      vec2 a0 = vec2(0.07, 0.05), b0 = vec2(0.81 + j1, 0.85 - j1);
      vec2 d0 = normalize(b0 - a0), n0 = vec2(-d0.y, d0.x); float l0 = length(b0 - a0), ang0 = atan(d0.y, d0.x);
      float bow0 = 0.022 * (lkH2(vec2(seed, 3.7)) - 0.3);
      lkTwig(uv, a0, b0, 0.0084, 0.0040, bow0, best, o);

      vec2 a1 = a0 + d0 * (0.25 * l0) + n0 * (sin(0.25 * 3.14159) * bow0);
      vec2 b1 = vec2(0.18 + j2, 0.78 + j1 * 0.5);
      vec2 d1 = normalize(b1 - a1), n1 = vec2(-d1.y, d1.x); float l1 = length(b1 - a1), ang1 = atan(d1.y, d1.x);
      float bow1 = 0.014;
      lkTwig(uv, a1, b1, 0.0064, 0.0034, bow1, best, o);

      vec2 a2 = a0 + d0 * (0.36 * l0) + n0 * (sin(0.36 * 3.14159) * bow0);
      vec2 b2 = vec2(0.86 - j1 * 0.5, 0.42 + j2);
      vec2 d2 = normalize(b2 - a2), n2 = vec2(-d2.y, d2.x); float l2 = length(b2 - a2), ang2 = atan(d2.y, d2.x);
      float bow2 = -0.014;
      lkTwig(uv, a2, b2, 0.0062, 0.0034, bow2, best, o);

      // 2. 9 lanceolate olive leaves along main shoot (4 opposite/sub-opposite pairs + 1 apical blade)
      for (int i = 0; i < 9; i++) {
        float fi = float(i);
        bool ap = (i == 8);
        float side = mod(fi, 2.0) < 0.5 ? -1.0 : 1.0;
        float u = ap ? 0.985 : 0.14 + floor(fi * 0.5) * 0.21 + side * 0.018;
        vec2 base = a0 + d0 * (u * l0) + n0 * (sin(u * 3.14159) * bow0);
        float h = lkH2(vec2(fi, seed));
        float ang = ap ? ang0 + (h - 0.5) * 0.28 : ang0 - side * (0.52 + 0.42 * h);
        float len = (ap ? 0.155 : 0.178) * (0.86 + 0.28 * lkH2(vec2(fi, seed + 3.0)));
        float wid = 0.0185 * (0.88 + 0.24 * lkH2(vec2(fi, seed + 7.0)));
        lkBlade(uv, base, ang, len, wid, fi, best, o);
      }
      // 3. 6 lanceolate olive leaves along left lateral sub-shoot (2 pairs + terminal V-pair)
      for (int j = 0; j < 6; j++) {
        float fj = float(j), id = 9.0 + fj;
        float side = mod(fj, 2.0) < 0.5 ? -1.0 : 1.0;
        bool tip = (j >= 4);
        float u = tip ? 0.96 : 0.28 + floor(fj * 0.5) * 0.36;
        vec2 base = a1 + d1 * (u * l1) + n1 * (sin(u * 3.14159) * bow1);
        float h = lkH2(vec2(id, seed));
        float ang = tip ? ang1 - side * (0.24 + 0.18 * h) : ang1 - side * (0.56 + 0.38 * h);
        float len = (tip ? 0.148 : 0.165) * (0.86 + 0.26 * lkH2(vec2(id, seed + 4.0)));
        float wid = 0.0172 * (0.88 + 0.22 * lkH2(vec2(id, seed + 8.0)));
        lkBlade(uv, base, ang, len, wid, id, best, o);
      }
      // 4. 6 lanceolate olive leaves along right lateral sub-shoot (2 pairs + terminal V-pair)
      for (int k = 0; k < 6; k++) {
        float fk = float(k), id = 15.0 + fk;
        float side = mod(fk, 2.0) < 0.5 ? -1.0 : 1.0;
        bool tip = (k >= 4);
        float u = tip ? 0.96 : 0.28 + floor(fk * 0.5) * 0.36;
        vec2 base = a2 + d2 * (u * l2) + n2 * (sin(u * 3.14159) * bow2);
        float h = lkH2(vec2(id, seed));
        float ang = tip ? ang2 - side * (0.24 + 0.18 * h) : ang2 - side * (0.56 + 0.38 * h);
        float len = (tip ? 0.148 : 0.165) * (0.86 + 0.26 * lkH2(vec2(id, seed + 5.0)));
        float wid = 0.0172 * (0.88 + 0.22 * lkH2(vec2(id, seed + 9.0)));
        lkBlade(uv, base, ang, len, wid, id, best, o);
      }
      float duv = length(fwidth(uv));
      float aa = clamp(duv * 0.68, 0.0012, 0.0068);
      // Suppress true edge-on card slivers (where foreshortened duv spikes) while keeping full lush leaf coverage on angled shoots
      float edgeOn = smoothstep(0.042, 0.095, duv);
      float dilate = aa * (o.w < 0.0 ? 0.50 : 0.38) * (1.0 - edgeOn);
      o.x = (1.0 - smoothstep(-aa, aa, best - dilate)) * (1.0 - 0.85 * edgeOn);
      return o;
    }`;
  let leafDepth = null;
  function leaf(orig) {
    const m = code(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.68, specularIntensity: 0.15, alphaTest: 0.5, envMapIntensity: orig.envMapIntensity }), 'leaf', {
      drawable: { noCap: true, noRing: true },
      head: 'varying vec3 vLeafBase;\n' + SPRIG + 'vec4 lfS;',
      alpha: `lfS = sprig(vLkUv, vLkInst * 1.37); diffuseColor.a = lfS.x;`,
      sprig: true,
      vertex: (vs) => 'uniform float uTimeW;\nvarying vec3 vLeafBase;\n' + vs.replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          #ifdef USE_INSTANCING
            vec3 wBase = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          #else
            vec3 wBase = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          #endif
          vLeafBase = wBase;
          // Attenuate wind from high overhead plan camera so the 1:200 architectural drawing stays still
          float windOn = 1.0 - smoothstep(16.0, 32.0, cameraPosition.y);
          // Anchored at the woody stem base (uv ~ 0,0) and flexing toward the outer shoot tip (uv ~ 1,1)
          float sprigFlex = smoothstep(0.05, 0.92, (uv.x + uv.y) * 0.5);
          float hCrown = clamp((wBase.y - 1.1) / 2.8, 0.0, 1.0);
          float wPhase = uTimeW * 1.65 + wBase.x * 0.55 + wBase.z * 0.44 + wBase.y * 0.38;
          float gust = 0.60 + 0.40 * sin(uTimeW * 0.48 + wBase.x * 0.20 - wBase.z * 0.16);
          float swayX = sin(wPhase) * 0.036 * gust;
          float swayZ = cos(wPhase * 1.36 + vLkInst * 0.29) * 0.026 * gust;
          float flutter = sin(uTimeW * 3.80 + vLkInst * 1.17 + (uv.x - uv.y) * 4.8) * 0.012 * gust;
          float flex = windOn * (0.20 * hCrown + 0.80 * sprigFlex);
          transformed.x += (swayX + flutter) * flex;
          transformed.y += (swayZ * 0.45 + flutter * 0.65) * flex;
          transformed.z += (swayZ - flutter * 0.85) * flex;
        }`),
      surface: `
        // the card's own axes in the world, for the fold of each leaf
        vec3 dpx = dFdx(vDrawW), dpy = dFdy(vDrawW); vec2 dux = dFdx(vLkUv), duy = dFdy(vLkUv);
        float det = dux.x * duy.y - dux.y * duy.x;
        vec3 T = normalize((dpx * duy.y - dpy * dux.y) / (abs(det) < 1e-10 ? 1e-10 : det));
        vec3 Bv = normalize((dpy * dux.x - dpx * duy.x) / (abs(det) < 1e-10 ? 1e-10 : det));
        float ax = abs(lfS.y), sAlong = lfS.z;
        float rib = lfS.w < 0.0 ? 0.0 : (1.0 - smoothstep(0.04, 0.18, ax)) * (1.0 - 0.32 * sAlong);
        // Subtle lateral venation & leaf margin rim on each lanceolate olive blade
        float latVein = lfS.w < 0.0 ? 0.0 : (0.5 + 0.5 * sin((sAlong * 14.0 - pow(ax, 0.85) * 2.8) * 6.28318)) * smoothstep(0.08, 0.28, ax) * (1.0 - smoothstep(0.78, 0.96, ax));
        float margin = lfS.w < 0.0 ? 0.0 : smoothstep(0.82, 0.98, ax);
        float leafTone = lkH2(vec2(lfS.w, vLkInst));
        float flipHash = lkH2(vec2(lfS.w * 3.7 + 1.3, vLkInst * 0.83));
        // Per-blade upper/underside assignment (independent of gl_FrontFacing so left and right boughs never split into yellow vs green)
        bool showTop = (flipHash > 0.24);
        float youngShoot = lfS.w < 0.0 ? 0.0 : smoothstep(0.55, 0.95, max(vLkUv.x, vLkUv.y)) * (0.40 + 0.60 * sAlong);
        // Weathered grey-umber woody olive branchlets and petioles
        vec3 twigCol = mix(${v3([0.072, 0.060, 0.046])}, ${v3([0.135, 0.118, 0.096])}, lkH2(vec2(vLkInst, 3.0)));
        // Authentic Mediterranean Olea europaea foliage calibrated for warm afternoon sun:
        // Deep waxy olive-green upper blades & powdery silver-celadon undersides
        vec3 topCol = mix(${v3([0.028, 0.086, 0.030])}, ${v3([0.058, 0.142, 0.048])}, leafTone);
        topCol = mix(topCol, ${v3([0.078, 0.168, 0.058])}, youngShoot * 0.42 + latVein * 0.14);
        vec3 underCol = mix(${v3([0.105, 0.168, 0.114])}, ${v3([0.148, 0.214, 0.152])}, leafTone);
        vec3 col = lfS.w < 0.0 ? twigCol : showTop ? topCol : underCol;
        vec3 ribCol = showTop ? ${v3([0.095, 0.178, 0.068])} : ${v3([0.168, 0.228, 0.166])};
        col = mix(col, ribCol, rib * 0.58);
        // Strong leaf-to-leaf and cluster-to-cluster tonal depth so individual olive blades stand out crisply
        col *= (1.0 - 0.16 * margin) * (0.76 + 0.42 * leafTone) * (0.84 + 0.28 * lkH2(vec2(vLkInst, 7.0)));
        // Volumetric 3D canopy self-occlusion for the Patio olive tree (deep forest-olive shadow inside the crown around the boughs)
        vec3 patioCrownC = vec3(0.0, 2.55, -6.0);
        float dPatioHoriz = length(vDrawW.xz - patioCrownC.xz);
        if (dPatioHoriz < 3.8) {
          float rNorm = clamp(length((vDrawW - patioCrownC) * vec3(0.42, 0.58, 0.42)), 0.0, 1.0);
          float hNorm = clamp((vDrawW.y - 1.85) / 2.25, 0.0, 1.0);
          float shootOut = smoothstep(0.08, 0.90, max(vLkUv.x, vLkUv.y));
          float canopyAO = mix(0.36, 1.06, clamp(0.46 * rNorm + 0.36 * hNorm + 0.18 * shootOut, 0.0, 1.0));
          col *= canopyAO;
        }
        #ifdef USE_INSTANCING_COLOR
          diffuseColor.rgb /= max(vColor, vec3(0.05));
        #endif
        diffuseColor.rgb *= col;
        roughnessFactor = lfS.w < 0.0 ? 0.88 : showTop ? clamp(0.62 - 0.05 * youngShoot + 0.08 * margin - 0.04 * rib, 0.52, 0.78) : 0.82;
        // Folded along the midrib, quilted subtly across the veins, and tilted uniquely per blade so edge-on cards never flash as flat planes
        if (lfS.w >= 0.0) {
          float ang = 0.7854 - (mod(lfS.w, 2.0) < 0.5 ? -1.0 : 1.0) * (0.58 + 0.36 * lkH2(vec2(lfS.w, vLkInst * 1.37)));
          vec2 ld = vec2(cos(ang), sin(ang)), ln = vec2(-ld.y, ld.x);
          float pleat = (latVein - 0.5) * 0.08;
          float bladePitch = (leafTone - 0.5) * 0.52, bladeRoll = (flipHash - 0.5) * 0.48;
          vec2 tilt = ln * (lfS.y * 0.44 + pleat + bladeRoll) + ld * ((lfS.z - 0.4) * 0.28 + pleat * 0.5 + bladePitch);
          lkG = T * tilt.x + Bv * tilt.y;
        }`,
      normal: TILT,
      end: `
        reflectedLight.directSpecular *= (lfS.w < 0.0 ? 0.04 : 0.14);
        reflectedLight.indirectSpecular *= (lfS.w < 0.0 ? 0.06 : 0.18);
        if (lfS.w >= 0.0) reflectedLight.indirectDiffuse += material.diffuseColor * vec3(0.16, 0.22, 0.12);`,
    });
    // its shadow is the sprig's too, not the square card
    leafDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaTest: 0.5 });
    leafDepth.onBeforeCompile = (sh) => {
      sh.vertexShader = 'varying vec2 vLkUv; varying float vLkInst;\n' + sh.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
        vLkUv = uv;
        #ifdef USE_INSTANCING
          vLkInst = float(gl_InstanceID);
        #else
          vLkInst = 0.0;
        #endif`);
      sh.fragmentShader = 'varying vec2 vLkUv; varying float vLkInst;\n' + sh.fragmentShader.replace('void main() {', LIB.replace(/vDrawW/g, 'vec3(0.0)') + SPRIG + '\nvoid main() {')
        .replace('#include <alphatest_fragment>', 'diffuseColor.a = sprig(vLkUv, vLkInst * 1.37).x;\n#include <alphatest_fragment>');
    };
    leafDepth.customProgramCacheKey = () => 'look-leaf-depth';
    return m;
  }

  const BROAD_SPRIG = `
    void lkBroadTwig(vec2 uv, vec2 a, vec2 b, float r0, float r1, float bow, inout float best, inout vec4 o) {
      vec2 ab = b - a; float len = length(ab); vec2 dir = ab / max(len, 1e-4), nrm = vec2(-dir.y, dir.x);
      float t = clamp(dot(uv - a, dir) / max(len, 1e-4), 0.0, 1.0);
      vec2 pt = a + dir * (t * len) + nrm * (sin(t * 3.14159) * bow);
      float d = length(uv - pt) - mix(r0, r1, t);
      if (d < best) { best = d; o = vec4(0.0, 0.0, t, -1.0); }
    }
    void lkBroadLeaf(vec2 uv, vec2 base, float ang, float len, float wid, float id, inout float best, inout vec4 o) {
      vec2 ld = vec2(cos(ang), sin(ang)), ln = vec2(-ld.y, ld.x), d = uv - base;
      float s = dot(d, ld) / len;
      if (s > -0.06 && s < 1.04) {
        float curve = sin(clamp(s, 0.0, 1.0) * 3.14159) * 0.0045 * (mod(id, 2.0) < 0.5 ? 1.0 : -1.0);
        float x = dot(d, ln) - curve;
        if (s < 0.12) {
          float pet = abs(x) - 0.0052;
          if (pet < best) { best = pet; o = vec4(0.0, 0.0, 0.0, -1.0); }
        }
        if (s > 0.0 && s < 1.0 && abs(x) < wid * 1.55) {
          // Broad ovate / softly lobed deciduous leaf blade (Plane / Linden / Zelkova silhouette)
          float lobe = 1.0 + 0.085 * sin(s * 18.8495) * sin(s * 3.14159);
          float w = wid * pow(sin(3.14159 * s), 0.56) * (1.08 - 0.30 * s) * lobe;
          float dist = abs(x) - w;
          if (dist < best) { best = dist; o = vec4(0.0, w > 1e-5 ? clamp(x / w, -1.0, 1.0) : 0.0, s, id); }
        }
      }
    }
    vec4 broadSprig(vec2 uv, float seed) {
      float best = 1e3; vec4 o = vec4(0.0, 0.0, 0.0, -1.0);
      float j1 = (lkH2(vec2(seed, 1.1)) - 0.5) * 0.06, j2 = (lkH2(vec2(seed, 2.3)) - 0.5) * 0.06;
      vec2 a0 = vec2(0.08, 0.06), b0 = vec2(0.80 + j1, 0.84 - j1);
      vec2 d0 = normalize(b0 - a0), n0 = vec2(-d0.y, d0.x); float l0 = length(b0 - a0), ang0 = atan(d0.y, d0.x);
      float bow0 = 0.020 * (lkH2(vec2(seed, 3.7)) - 0.3);
      lkBroadTwig(uv, a0, b0, 0.0086, 0.0042, bow0, best, o);

      vec2 a1 = a0 + d0 * (0.26 * l0) + n0 * (sin(0.26 * 3.14159) * bow0);
      vec2 b1 = vec2(0.18 + j2, 0.78 + j1 * 0.5);
      vec2 d1 = normalize(b1 - a1), n1 = vec2(-d1.y, d1.x); float l1 = length(b1 - a1), ang1 = atan(d1.y, d1.x);
      lkBroadTwig(uv, a1, b1, 0.0064, 0.0034, 0.012, best, o);

      vec2 a2 = a0 + d0 * (0.38 * l0) + n0 * (sin(0.38 * 3.14159) * bow0);
      vec2 b2 = vec2(0.85 - j1 * 0.5, 0.44 + j2);
      vec2 d2 = normalize(b2 - a2), n2 = vec2(-d2.y, d2.x); float l2 = length(b2 - a2), ang2 = atan(d2.y, d2.x);
      lkBroadTwig(uv, a2, b2, 0.0062, 0.0034, -0.012, best, o);

      vec2 a3 = a0 + d0 * (0.58 * l0) + n0 * (sin(0.58 * 3.14159) * bow0);
      vec2 b3 = vec2(0.38 - j2, 0.88 - j1 * 0.5);
      vec2 d3 = normalize(b3 - a3), n3 = vec2(-d3.y, d3.x); float l3 = length(b3 - a3), ang3 = atan(d3.y, d3.x);
      lkBroadTwig(uv, a3, b3, 0.0056, 0.0030, 0.010, best, o);

      // 7 broad ovate deciduous leaves along main shoot
      for (int i = 0; i < 7; i++) {
        float fi = float(i);
        bool ap = (i == 6);
        float side = mod(fi, 2.0) < 0.5 ? -1.0 : 1.0;
        float u = ap ? 0.94 : 0.14 + floor(fi * 0.5) * 0.25 + side * 0.02;
        vec2 base = a0 + d0 * (u * l0) + n0 * (sin(u * 3.14159) * bow0);
        float h = lkH2(vec2(fi, seed));
        float ang = ap ? ang0 + (h - 0.5) * 0.24 : ang0 - side * (0.48 + 0.34 * h);
        float len = (ap ? 0.225 : 0.250) * (0.88 + 0.24 * lkH2(vec2(fi, seed + 3.0)));
        float wid = 0.076 * (0.88 + 0.24 * lkH2(vec2(fi, seed + 7.0)));
        lkBroadLeaf(uv, base, ang, len, wid, fi, best, o);
      }
      // 4 broad ovate leaves along left sub-shoot
      for (int j = 0; j < 4; j++) {
        float fj = float(j), id = 7.0 + fj;
        float side = mod(fj, 2.0) < 0.5 ? -1.0 : 1.0;
        bool tip = (j >= 2);
        float u = tip ? 0.88 : 0.34;
        vec2 base = a1 + d1 * (u * l1);
        float h = lkH2(vec2(id, seed));
        float ang = tip ? ang1 - side * (0.28 + 0.18 * h) : ang1 - side * (0.50 + 0.30 * h);
        float len = (tip ? 0.205 : 0.225) * (0.88 + 0.24 * lkH2(vec2(id, seed + 4.0)));
        float wid = 0.068 * (0.88 + 0.22 * lkH2(vec2(id, seed + 8.0)));
        lkBroadLeaf(uv, base, ang, len, wid, id, best, o);
      }
      // 4 broad ovate leaves along right sub-shoot
      for (int k = 0; k < 4; k++) {
        float fk = float(k), id = 11.0 + fk;
        float side = mod(fk, 2.0) < 0.5 ? -1.0 : 1.0;
        bool tip = (k >= 2);
        float u = tip ? 0.88 : 0.34;
        vec2 base = a2 + d2 * (u * l2);
        float h = lkH2(vec2(id, seed));
        float ang = tip ? ang2 - side * (0.28 + 0.18 * h) : ang2 - side * (0.50 + 0.30 * h);
        float len = (tip ? 0.205 : 0.225) * (0.88 + 0.24 * lkH2(vec2(id, seed + 5.0)));
        float wid = 0.068 * (0.88 + 0.22 * lkH2(vec2(id, seed + 9.0)));
        lkBroadLeaf(uv, base, ang, len, wid, id, best, o);
      }
      // 4 broad ovate leaves along upper-center sub-shoot
      for (int m = 0; m < 4; m++) {
        float fm = float(m), id = 15.0 + fm;
        float side = mod(fm, 2.0) < 0.5 ? -1.0 : 1.0;
        bool tip = (m >= 2);
        float u = tip ? 0.88 : 0.36;
        vec2 base = a3 + d3 * (u * l3);
        float h = lkH2(vec2(id, seed));
        float ang = tip ? ang3 - side * (0.26 + 0.18 * h) : ang3 - side * (0.48 + 0.28 * h);
        float len = (tip ? 0.195 : 0.215) * (0.88 + 0.24 * lkH2(vec2(id, seed + 6.0)));
        float wid = 0.066 * (0.88 + 0.22 * lkH2(vec2(id, seed + 10.0)));
        lkBroadLeaf(uv, base, ang, len, wid, id, best, o);
      }
      float duv = length(fwidth(uv));
      float aa = clamp(duv * 0.68, 0.0012, 0.0068);
      float edgeOn = smoothstep(0.045, 0.098, duv);
      float dilate = aa * (o.w < 0.0 ? 0.50 : 0.42) * (1.0 - edgeOn);
      o.x = (1.0 - smoothstep(-aa, aa, best - dilate)) * (1.0 - 0.85 * edgeOn);
      return o;
    }`;

  function broadLeaf(orig) {
    const m = code(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.58, specularIntensity: 0.22, alphaTest: 0.5, envMapIntensity: orig.envMapIntensity }), 'broadLeaf', {
      drawable: { noCap: true, noRing: true },
      head: 'varying vec3 vLeafBase;\n' + BROAD_SPRIG + 'vec4 lfS;',
      alpha: `lfS = broadSprig(vLkUv, vLkInst * 1.37); diffuseColor.a = lfS.x;`,
      sprig: true,
      vertex: (vs) => 'uniform float uTimeW;\nvarying vec3 vLeafBase;\n' + vs.replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          #ifdef USE_INSTANCING
            vec3 wBase = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          #else
            vec3 wBase = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          #endif
          vLeafBase = wBase;
          float windOn = 1.0 - smoothstep(16.0, 32.0, cameraPosition.y);
          float sprigFlex = smoothstep(0.05, 0.92, (uv.x + uv.y) * 0.5);
          float hCrown = clamp((wBase.y - 1.4) / 3.2, 0.0, 1.0);
          float wPhase = uTimeW * 1.55 + wBase.x * 0.48 + wBase.z * 0.42 + wBase.y * 0.35;
          float gust = 0.60 + 0.40 * sin(uTimeW * 0.45 + wBase.x * 0.18 - wBase.z * 0.15);
          float swayX = sin(wPhase) * 0.042 * gust;
          float swayZ = cos(wPhase * 1.32 + vLkInst * 0.29) * 0.030 * gust;
          float flutter = sin(uTimeW * 3.50 + vLkInst * 1.17 + (uv.x - uv.y) * 4.4) * 0.015 * gust;
          float flex = windOn * (0.22 * hCrown + 0.78 * sprigFlex);
          transformed.x += (swayX + flutter) * flex;
          transformed.y += (swayZ * 0.45 + flutter * 0.65) * flex;
          transformed.z += (swayZ - flutter * 0.85) * flex;
        }`),
      surface: `
        vec3 dpx = dFdx(vDrawW), dpy = dFdy(vDrawW); vec2 dux = dFdx(vLkUv), duy = dFdy(vLkUv);
        float det = dux.x * duy.y - dux.y * duy.x;
        vec3 T = normalize((dpx * duy.y - dpy * dux.y) / (abs(det) < 1e-10 ? 1e-10 : det));
        vec3 Bv = normalize((dpy * dux.x - dpx * duy.x) / (abs(det) < 1e-10 ? 1e-10 : det));
        float ax = abs(lfS.y), sAlong = lfS.z;
        float rib = lfS.w < 0.0 ? 0.0 : (1.0 - smoothstep(0.03, 0.14, ax)) * (1.0 - 0.25 * sAlong);
        float latVein = lfS.w < 0.0 ? 0.0 : (0.5 + 0.5 * sin((sAlong * 9.0 - pow(ax, 0.82) * 2.4) * 6.28318)) * smoothstep(0.06, 0.22, ax) * (1.0 - smoothstep(0.80, 0.96, ax));
        float margin = lfS.w < 0.0 ? 0.0 : smoothstep(0.84, 0.98, ax);
        float leafTone = lkH2(vec2(lfS.w, vLkInst));
        float flipHash = lkH2(vec2(lfS.w * 3.7 + 1.3, vLkInst * 0.83));
        bool showTop = (flipHash > 0.22);
        float youngShoot = lfS.w < 0.0 ? 0.0 : smoothstep(0.45, 0.92, max(vLkUv.x, vLkUv.y)) * (0.35 + 0.65 * sAlong);
        vec3 twigCol = mix(${v3([0.085, 0.072, 0.052])}, ${v3([0.145, 0.125, 0.095])}, lkH2(vec2(vLkInst, 3.0)));
        // Lush, vibrant deciduous broadleaf palette (rich emerald, spring leaf green, and warm sunlit chartreuse tips)
        vec3 topCol = mix(${v3([0.045, 0.148, 0.026])}, ${v3([0.098, 0.245, 0.044])}, leafTone);
        topCol = mix(topCol, ${v3([0.165, 0.335, 0.056])}, youngShoot * 0.52 + latVein * 0.18);
        vec3 underCol = mix(${v3([0.078, 0.195, 0.048])}, ${v3([0.135, 0.268, 0.068])}, leafTone);
        vec3 col = lfS.w < 0.0 ? twigCol : showTop ? topCol : underCol;
        vec3 ribCol = ${v3([0.175, 0.320, 0.072])};
        col = mix(col, ribCol, rib * 0.52);
        col *= (1.0 - 0.14 * margin) * (0.78 + 0.42 * leafTone) * (0.85 + 0.28 * lkH2(vec2(vLkInst, 7.0)));
        #ifdef USE_INSTANCING_COLOR
          diffuseColor.rgb /= max(vColor, vec3(0.05));
        #endif
        diffuseColor.rgb *= col;
        roughnessFactor = lfS.w < 0.0 ? 0.86 : showTop ? clamp(0.54 - 0.06 * youngShoot + 0.08 * margin - 0.04 * rib, 0.44, 0.72) : 0.76;
        if (lfS.w >= 0.0) {
          float ang = 0.7854 - (mod(lfS.w, 2.0) < 0.5 ? -1.0 : 1.0) * (0.54 + 0.34 * lkH2(vec2(lfS.w, vLkInst * 1.37)));
          vec2 ld = vec2(cos(ang), sin(ang)), ln = vec2(-ld.y, ld.x);
          float pleat = (latVein - 0.5) * 0.10;
          float bladePitch = (leafTone - 0.5) * 0.48, bladeRoll = (flipHash - 0.5) * 0.44;
          vec2 tilt = ln * (lfS.y * 0.42 + pleat + bladeRoll) + ld * ((lfS.z - 0.4) * 0.26 + pleat * 0.5 + bladePitch);
          lkG = T * tilt.x + Bv * tilt.y;
        }`,
      normal: TILT,
      end: `
        reflectedLight.directSpecular *= (lfS.w < 0.0 ? 0.04 : 0.18);
        reflectedLight.indirectSpecular *= (lfS.w < 0.0 ? 0.06 : 0.22);
        if (lfS.w >= 0.0) reflectedLight.indirectDiffuse += material.diffuseColor * vec3(0.22, 0.30, 0.12);`,
    });
    const dm = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaTest: 0.5 });
    dm.onBeforeCompile = (sh) => {
      sh.vertexShader = 'varying vec2 vLkUv; varying float vLkInst;\n' + sh.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
        vLkUv = uv;
        #ifdef USE_INSTANCING
          vLkInst = float(gl_InstanceID);
        #else
          vLkInst = 0.0;
        #endif`);
      sh.fragmentShader = 'varying vec2 vLkUv; varying float vLkInst;\n' + sh.fragmentShader.replace('void main() {', LIB.replace(/vDrawW/g, 'vec3(0.0)') + BROAD_SPRIG + '\nvoid main() {')
        .replace('#include <alphatest_fragment>', 'diffuseColor.a = broadSprig(vLkUv, vLkInst * 1.37).x;\n#include <alphatest_fragment>');
    };
    dm.customProgramCacheKey = () => 'look-broadleaf-depth';
    m.userData.depthMat = dm;
    return m;
  }

  /* firewood: oak logs. Bark in fissured grey plates along each log, and the cut ends with their rings, a darker heart, a
     pale band of sapwood, the bark's rim, radial checks from drying, and the saw's marks across them. */
  function logBark(orig) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.9 }), 'logbark', {
      surface: `
        vec3 s = lkP * vec3(0.16, 1.0, 1.0);
        float k = lkKeep(0.006, lkPx);
        float n = lkn(s * 60.0) * 0.65 + lkn(s * 140.0 + 2.0) * 0.35 * lkKeep(0.0025, lkPx);
        float fis = (1.0 - smoothstep(0.28, 0.44, n)) * k;
        float plate = lkn(s * 30.0 + 3.0), lich = smoothstep(0.72, 0.86, lkn(lkP * 26.0 + 1.0)) * (1.0 - fis);
        float flake = (lkn(s * vec3(1.0, 3.0, 3.0) * 120.0 + 5.0) - 0.5) * lkKeep(0.003, lkPx);
        float h = -0.003 * fis + 0.0008 * plate + 0.0004 * flake;
        lkG = lkSurfGrad(lkWN, dFdx(h), dFdy(h));
        // (darker plates and less lichen since the night of 15 Oct: on the irregular logs the pale plates and lichen read as birch)
        vec3 col = mix(${v3([0.075, 0.064, 0.052])}, ${v3([0.17, 0.15, 0.125])}, plate) * (1.0 - 0.7 * fis) * (1.0 + 0.3 * flake);
        col = mix(col, ${v3([0.2, 0.21, 0.17])}, lich * 0.2);
        diffuseColor.rgb *= col;
        roughnessFactor = 0.95;`,
    });
  }
  // a split face: oak torn along its fibres, pale, the growth rings as long lines down it, ridges and tears where the
  // fibres pulled apart (the night of 15 Oct, two split halves on the stack: "make sure the logs feel a little bit more real")
  function logSplit(orig) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.9 }), 'logsplit', {
      surface: `
        vec2 g = vec2(vLkUv.x, vLkUv.y);                                    // across the face, along the log
        float ringL = vLkUv.x * 14.0 + 0.6 * lkn(vec3(vLkUv * vec2(3.0, 1.5), 4.0));
        float late = mix(0.3, smoothstep(0.55, 0.85, fract(ringL)), 1.0 - smoothstep(0.25, 0.55, fwidth(ringL)));
        float fib = lkn(vec3(g.x * 160.0, g.y * 6.0, 2.0)), tear = smoothstep(0.78, 0.9, lkn(vec3(g.x * 40.0, g.y * 3.0, 6.0)));
        float h = 0.0012 * fib - 0.002 * tear + 0.0004 * late;
        ${SLOPE('h')}
        vec3 col = mix(${v3([0.44, 0.33, 0.21])}, ${v3([0.3, 0.2, 0.12])}, late * 0.7) * (0.85 + 0.3 * fib) * (1.0 - 0.45 * tear);
        diffuseColor.rgb *= col;
        roughnessFactor = 0.85 + 0.1 * tear;`,
    });
  }
  function logEnd(orig) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.85 }), 'logend', {
      surface: `
        float seed = lkH2(vec2(floor(vDrawW.x * 997.0 + vDrawW.y * 313.0), 3.0));
        vec2 uv0 = (vLkUv - 0.5) * 2.0;
        vec2 c = uv0 - (vec2(lkH2(vec2(seed, 1.0)), lkH2(vec2(seed, 2.0))) - 0.5) * 0.24;
        float rr = length(c), th = atan(c.y, c.x);
        float n = 18.0 + 12.0 * seed;
        float ring = rr * n + 0.38 * lkn(vec3(c * 3.2, seed * 9.0)), vis = 1.0 - smoothstep(0.22, 0.55, fwidth(ring));
        float late = mix(0.3, smoothstep(0.5, 0.85, fract(ring)), vis);
        float rOuter = length(uv0) + 0.035 * sin(th * 7.0 + seed * 6.0) + 0.02 * sin(th * 13.0 + seed * 11.0);
        float rim = smoothstep(0.91, 0.97, rOuter);
        float camb = smoothstep(0.87, 0.91, rOuter) * (1.0 - rim);
        float sap = smoothstep(0.56, 0.72, rr) * (1.0 - rim);
        float ray = (1.0 - smoothstep(0.0, 0.035, abs(fract(th * 14.0 / 6.2832 + 0.1 * lkn(vec3(c * 5.0, seed))) - 0.5))) * smoothstep(0.12, 0.4, rr) * (1.0 - rim);
        float check = 0.0;
        for (int i = 0; i < 4; i++) { float a = lkH2(vec2(seed, float(i) + 5.0)) * 6.2832; float da = abs(mod(th - a + 3.1416, 6.2832) - 3.1416);
          float wob = da + 0.028 * sin(rr * 38.0 + float(i));
          check = max(check, (1.0 - smoothstep(0.0, 0.015 / max(rr, 0.08), abs(wob))) * smoothstep(0.05, 0.24, rr) * (1.0 - smoothstep(0.4, 0.82 + 0.12 * float(i), rr)) * step(0.35, lkH2(vec2(seed, float(i)))));
        }
        float saw = lkn(vec3(vLkUv.x * 55.0 + vLkUv.y * 22.0, seed * 7.0, 1.0));
        float h = -0.0008 * check - 0.0005 * camb + 0.00022 * late + 0.00025 * saw;
        lkG = lkSurfGrad(lkWN, dFdx(h), dFdy(h));
        vec3 heart = ${v3([0.27, 0.17, 0.095])}, sapw = ${v3([0.46, 0.345, 0.215])};
        vec3 col = mix(heart, sapw, sap) * (1.0 - 0.24 * late) * (0.92 + 0.14 * saw) * (1.0 + 0.08 * ray);
        col = mix(col, ${v3([0.14, 0.095, 0.06])}, camb * 0.65);
        col = mix(col, ${v3([0.1, 0.084, 0.068])}, rim * 0.85);
        col *= 1.0 - 0.6 * check;
        diffuseColor.rgb *= col;
        roughnessFactor = 0.82 + 0.12 * check + 0.08 * rim;`,
    });
  }

  /* ======================================================================================
     PHASE 3, ROOM 1: the entrance, the hall and the WC (15 Oct, brief-phase-3.md)
     ====================================================================================== */

  /* ---------- travertine tiles: the hall's and the WC's floors -----------------------------------
     Honed and filled, as the scan is: a warm cream stone, calm from a few metres, with its life up close. Each tile cut
     from another part of the block (its own shade, a little warmer or greyer), soft clouds at three sizes, the ghost of
     the bed's layers along the tile, and travertine's pores: irregular holes of a few millimetres in clusters, most filled
     flush with a resin a shade darker and glossier, a few left open and dark, and now and then a larger filled patch.
     (The first try had strong bands along each tile and read as a pine floor.)
     Tiles of 1.2 m along x by 0.6 m along z on the joints of the drawing's stone hatch (hatchOf in scene.js: lines at
     whole multiples of 1.2 and 0.6 m in the world), so the drawing's lines and the real joints are the same lines. Each
     tile a hair proud or low of its neighbours, easing back to its joint. A 1.5 mm grout line, the arrises eased. On an
     upright face (later: the pool's walls) the hatch's own rows, offset by half a tile. */
  // (a function of the tile since the night of 15 Oct: the patio's are 80 cm squares on a straight grid from its corner)
  const TRAVTF = (sx, sy, bond, ox, oy) => `
    vec4 tvA; vec4 tvB; float tvF; float tvD; float tvR;
    vec2 tvCells(vec2 q) { vec2 c0 = floor(q), f0 = fract(q); float d1 = 8.0, d2 = 8.0;
      for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 g = vec2(float(i), float(j)), r = g + lkH22(c0 + g) * 0.85 - f0; float d = dot(r, r);
        if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
      return vec2(sqrt(d1), sqrt(d2)); }
    float tvH(vec2 q, float px, bool upright, out vec4 a, out vec4 b) {
      vec2 sz = vec2(${f(sx)}, ${f(sy)});
      q -= vec2(${f(ox || 0)}, ${f(oy || 0)});
      vec2 c = q / sz;
      c.x += ${f(bond * 0.5)} * step(0.5, fract(q.y / ${f(2 * sy)}));           // (the hatch: every other row half a tile along, floors too since iteration 8)
      vec2 id = floor(c), lq = fract(c) * sz;                             // lq: metres inside the tile
      float r1 = lkH2(id + 3.1), r2 = lkH2(id + 7.7), r3 = lkH2(id + 13.3), r4 = lkH2(id + 19.9);
      vec2 e2 = min(lq, sz - lq); float ej = min(e2.x, e2.y);            // to the nearest joint, metres
      // the joint: grout 1.5 mm wide and a millimetre down, the arris eased over a millimetre and a half, both widened to
      // the pixel when the pixel is bigger (and made shallower, so the slope stays the same and does not glitter). Each
      // joint by the pixel's size across it: by the larger of the two, the joint running away from the eye was drawn
      // twice as wide and dark as the ones across the view (the reviewer's note, 15 Oct)
      vec2 pq = max(fwidth(q), vec2(1e-5));
      vec2 gw2 = max(vec2(0.00075), pq * 0.75), ew2 = max(vec2(0.0015), pq * 1.3);
      vec2 g2 = 1.0 - smoothstep(gw2 * 0.6, gw2 * 1.4, e2), a2 = 1.0 - smoothstep(vec2(0.0), ew2, e2);
      // (and they fade once a tile is under about 25 pixels: from above, the patio was a drawn grid. A scan's joints fade in its mips)
      float gfar = 1.0 - smoothstep(0.012, 0.035, px);
      float grout = max(g2.x, g2.y) * gfar, arris = max(a2.x, a2.y) * gfar;
      float gw = mix(gw2.y, gw2.x, step(e2.x, e2.y)), ew = mix(ew2.y, ew2.x, step(e2.x, e2.y));
      float dirt = max(1.0 - smoothstep(0.0, max(0.003, pq.x * 2.0), e2.x), 1.0 - smoothstep(0.0, max(0.003, pq.y * 2.0), e2.y)) * gfar;
      // the stone, read at the tile's own place in the block
      vec2 sp = lq + vec2(r2 * 31.0, r3 * 17.0);
      float k2 = lkKeep(0.008, px), k3 = lkKeep(0.0025, px);
      float wv = lkFbm(vec3(sp * vec2(0.8, 2.4), r4 * 9.0), 1.2, 0.55, 3, px).x;
      // the bedding: bands along the tile, cream and tan, wavy (stronger since iteration 8: the far tiles had nothing else)
      // (faint: stronger, every far tile became a plank of "wood laminate", the reviewer of iteration 8)
      float layer = lkn(vec3(sp.x * 0.5, (sp.y + 0.06 * wv) * 16.0, r1 * 13.0)) - 0.5;
      float cloud = lkFbm(vec3(sp, r1 * 5.0), 2.5, 0.55, 5, px).x;
      // pores: soft edged voids drawn out along the bedding, each with a darker core where it goes deeper, some open and
      // some filled. (Iteration 8, the reviewer: "flat cut-out blobs with hard edges and no depth". Before that the second
      // try's pores were blobs of a centimetre or two in one flat colour, and read as splashes of paint.) Where a pore is
      // too small to draw it becomes its average, not nothing, so a far tile keeps its tone.
      vec2 w = sp + 0.012 * vec2(lkn(vec3(sp * 45.0, 1.0)), lkn(vec3(sp * 45.0, 2.0)));
      float cluster = smoothstep(0.3, 0.7, lkn(vec3(sp * vec2(2.2, 4.5), r2 * 7.0)));
      float pv1 = lkn(vec3(w * vec2(110.0, 300.0), 5.0)), pv2 = lkn(vec3(w * vec2(26.0, 110.0), 9.0));
      float p1 = mix(0.04, smoothstep(0.7, 0.82, pv1), k3), d1 = mix(0.015, smoothstep(0.76, 0.9, pv1), k3);
      float p2 = mix(0.015, smoothstep(0.85, 0.95, pv2), k2), d2 = mix(0.006, smoothstep(0.89, 0.97, pv2), k2);
      float depthK = 0.35 + 0.65 * lkn(vec3(w * vec2(40.0, 70.0), 13.0));               // how open each one is
      float pore = max(p1, p2) * cluster;
      tvR = (smoothstep(0.6, 0.68, pv1) - smoothstep(0.68, 0.74, pv1)) * k3 * cluster;
      float open = max(d1, d2) * cluster * depthK;
      float fossil = smoothstep(0.9, 0.96, lkn(vec3(w * vec2(30.0, 48.0), 21.0 + r3))) * k2 * step(0.5, r1);             // a few larger holes, 5 to 10 mm, open
      open = max(open, fossil); pore = max(pore, fossil);
      // hairline fissures, filled: thin dark lines that wander and break off, as the scan's do
      // Hairline cracks, filled: the edges between small cells (Voronoi, the second nearest point less the nearest), cells of
      // one to three centimetres stretched along the tile, in patches. (Noise crests drew thick worms, the third try, and a
      // smooth mottle read as a sponge-painted wall, the fourth.)
      // (iteration 8: shaken at the centimetre too, so an edge wanders as a crack does and is no straight side of a cell)
      vec2 vc = tvCells(sp * vec2(38.0, 60.0) + 0.6 * vec2(lkn(vec3(sp * 9.0, 11.0)), lkn(vec3(sp * 9.0, 12.0))) + 0.3 * vec2(lkn(vec3(sp * 45.0, 18.0)), lkn(vec3(sp * 45.0, 19.0))) - 0.15);
      float cw = max(fwidth(vc.y - vc.x) * 1.1, 0.025);
      // (iteration 8: in fewer patches, and fainter. The reviewer still read the net as "a drawn-looking crackle network")
      float fis = (1.0 - smoothstep(0.0, cw, vc.y - vc.x)) * smoothstep(0.5, 0.72, lkn(vec3(sp * 3.5, 14.0 + r2))) * (0.4 + 0.6 * lkn(vec3(sp * 25.0, 16.0))) * k2;
      fis *= smoothstep(0.5, 0.64, lkn(vec3(sp * 70.0, 17.0)));          // (broken into short pieces: whole, the cells closed into a net, like a crazed glaze)
      fis *= 0.5 + 0.5 * lkn(vec3(sp * 120.0, 23.0));                    // (and each piece darker and paler along its length)
      // the stone's grain: pale calcite specks of a millimetre or two, and a faint mottle
      float grain = 0.5 + 0.35 * lkFbm(vec3(sp, 15.0), 12.0, 0.55, 3, px).x + 0.5 * smoothstep(0.7, 0.8, lkn(vec3(q * 650.0, 3.0))) * lkKeep(0.0018, px);
      // each tile a hair proud or low, and tilted, easing back to nothing at its joint (never a step between two tiles)
      float ease = smoothstep(0.0, max(0.006, px * 2.5), ej);
      float lip = ((r2 - 0.5) * 0.0004 + (r3 - 0.5) * 0.0008 * (lq.x / sz.x - 0.5) + (r4 - 0.5) * 0.0008 * (lq.y / sz.y - 0.5)) * ease;
      a = vec4(layer, cloud, pore, open); b = vec4(r4, grout, grain, r1); tvF = fis; tvD = dirt;
      return lip - 0.0009 * grout * (0.00075 / gw) - 0.0005 * arris * (0.0015 / ew) - 0.0006 * pore * k3 - 0.0012 * open + 0.00004 * (grain - 0.5) + 0.00003 * cloud;
    }`;
  const TRAVT = TRAVTF(1.2, 0.6, 1, 0, 0);
  // tex: more of the stone's texture at the middle sizes, the ones that read from standing height (the patio, the night of
  // 15 Oct, Sam: "maybe just add a little bit more texture to each tile")
  function travTiles(orig, key, head, tex) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.46 }), key || 'travTiles', {
      head: head || TRAVT,
      surface: `
        vec2 q; vec3 ta, tb; lkPlane(vDrawW, lkWN, q, ta, tb);              // (in world metres, as the hatch is: no shift by LK_O)
        bool upright = abs(lkWN.y) < 0.7;
        float tPx = ${tex ? 'mix(lkPxM, lkPx, 0.28)' : 'lkPx'};
        float h0 = tvH(q, tPx, upright, tvA, tvB);
        ${tex ? `
        // Outdoor 80x80 cm square flat-honed stone tiles: subtle sedimentary strata, delicate calcite & mineral veins, and fine stone grain
        vec2 tq = tvB.w > 0.5 ? q : q.yx;
        vec2 tsp = tq + vec2(tvB.x * 19.3, tvB.w * 23.7);
        float kMid = lkKeep(0.012, tPx), kFine = lkKeep(0.0045, tPx);
        float wvP = lkFbm(vec3(tsp * vec2(1.2, 2.5), tvB.x * 9.0), 1.6, 0.54, 3, tPx).x;
        float sedBand = (lkn(vec3(tsp.x * 1.6, (tsp.y + 0.09 * wvP) * 9.5, tvB.x * 17.0)) - 0.5) * kMid;
        float midCloud = lkFbm(vec3(tsp * 1.4, 31.0 + tvB.x * 7.0), 2.8, 0.55, 4, tPx).x;
        // Delicate mineral & calcite hairline veins wandering across each stone slab
        vec2 vCoord = tsp * vec2(1.4, 2.6) + 0.14 * vec2(wvP, lkn(vec3(tsp * 3.8, 5.0)) - 0.5);
        float vField1 = lkFbm(vec3(vCoord, tvB.x * 13.0 + 2.0), 1.8, 0.52, 3, tPx).x;
        float vField2 = lkFbm(vec3(vCoord.yx * vec2(1.3, 0.9) + 4.7, tvB.w * 17.0 + 6.0), 2.1, 0.52, 3, tPx).x;
        float calVein = (1.0 - smoothstep(0.004, 0.032, abs(vField1 - 0.08))) * smoothstep(0.35, 0.68, lkn(vec3(tsp * 2.2, 8.0))) * kMid;
        float minVein = (1.0 - smoothstep(0.005, 0.038, abs(vField2 + 0.06))) * (0.45 + 0.55 * lkn(vec3(tsp * 4.5, 12.0))) * kMid;
        // Fine-scale honed travertine pinholes & mineral sand grain (no large dark blotches)
        vec2 vw = tsp + 0.010 * vec2(lkn(vec3(tsp * 38.0, 2.0)), lkn(vec3(tsp * 38.0, 4.0)));
        float vClust = smoothstep(0.38, 0.72, lkn(vec3(tsp * vec2(2.4, 4.8), tvB.x * 11.0)));
        float finePore = smoothstep(0.75, 0.88, lkn(vec3(vw * vec2(64.0, 175.0), 7.0 + tvB.w * 5.0))) * vClust * kFine;
        float fineSpeck = (lkn(vec3(tsp * 88.0, 13.0)) - 0.5) * kFine;
        h0 = h0 * 0.42 - 0.00018 * finePore - 0.00008 * minVein + 0.00005 * sedBand + 0.00004 * fineSpeck;
        ` : ''}
        ${SLOPE('h0')}
        lkG *= lkFlat(lkWN);
        vec3 col = ${v3([0.356, 0.288, 0.2])};                               // (a little less yellow than the scan's mean: the scan reads cream)
        col *= 0.91 + 0.18 * tvB.x;                                            // each tile its own shade (was 0.8 to 1.2: "neighbouring tiles jump in tone")
        col *= mix(${v3([1.03, 1.0, 0.94])}, ${v3([0.97, 0.98, 1.02])}, tvB.w);  // a little warmer or greyer
        col *= (1.0 + 0.05 * tvA.x) * (1.0 + 0.24 * tvA.y) * (0.9 + 0.2 * clamp(tvB.z, 0.0, 1.0));
        col *= 1.0 + 0.1 * tvR;                                                   // a pale rim round each pore, where its edge breaks
        col = mix(col, col * ${v3([0.86, 0.84, 0.8])}, tvA.z * ${tex ? '0.45' : '1.0'}); // the pore, a little darker (grey, not brown: "brown decals")
        col = mix(col, col * ${v3([0.4, 0.38, 0.35])}, tvA.w * ${tex ? '0.35' : '1.0'}); // and its open core, darker the deeper it goes
        col = mix(col, col * ${v3([0.6, 0.53, 0.45])}, tvF * 0.5);             // the veins, filled: a shade darker and browner, not drawn on
        col *= 1.0 - 0.1 * tvD;                                                   // a little dirt along the joints                                                  // the fissures
        ${tex ? `col *= (1.0 + 0.18 * tvA.y) * (1.0 + 0.20 * midCloud) * (1.0 + 0.15 * sedBand) * (1.0 + 0.11 * fineSpeck);
        col = mix(col, col * ${v3([1.16, 1.14, 1.10])}, calVein * 0.72);         // warm ivory calcite veins
        col = mix(col, col * ${v3([0.74, 0.68, 0.60])}, minVein * 0.62);         // subtle warm-taupe sedimentary mineral veins
        col = mix(col, col * ${v3([0.72, 0.68, 0.62])}, finePore * 0.55);        // fine honed pinholes
        col = mix(col, col * ${v3([0.68, 0.61, 0.52])}, tvF * 0.55);` : ''}
        col = mix(col, ${v3([0.2, 0.17, 0.13])}, tvB.y * 0.9);                   // the grout
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.45 + 0.08 * tvA.y + 0.05 * (tvB.z - 0.5) - 0.08 * tvA.z + 0.22 * tvA.w + 0.35 * tvB.y ${tex ? '+ 0.08 * finePore - 0.06 * calVein + 0.06 * midCloud' : ''}, 0.25, 1.0);`,
    });
  }

  /* ---------- the entrance's board-marked concrete, with its tie holes ----------------------------
     The fireplace's board concrete (BOARD), paler, as the entrance's two long walls. The holes the formwork's ties
     leave, on the grid of the drawing's concrete hatch (hatchOf in scene.js: every 0.6 m each way, 30 cm in from the
     ground and from each end), each a cone pressed 2.5 cm across and about 2 cm deep with a ring where its plug sat,
     darker inside and a little damp-stained under. A fine level line where one 1.2 m lift met the next, each lift its own
     shade. */
  // (also the outside walls and the canopy, since 15 Oct: the same pour, greyer, and a little rain run down it from the top)
  function boardWall(orig, key, base, outdoor, drawableOpts) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.78 }), key, {
      head: BOARD,
      drawable: drawableOpts,
      surface: `
        vec2 q; vec3 ta, tb; lkPlane(lkP, lkWN, q, ta, tb);
        vec2 qw; vec3 ta2, tb2; lkPlane(vDrawW, lkWN, qw, ta2, tb2);         // world metres, for the holes (the hatch's grid)
        float bPx = mix(lkPxM, lkPx, 0.32);
        vec3 col = ${v3(base)};
        float cloud = lkFbm(vec3(q * 1.0, 6.0), 1.6, 0.5, 4, bPx).x;
        float h0 = bdH(q, bPx, bdA);
        // tie holes: a cone, 26 mm across at the face, and a ring 42 mm across where the plug's cone sat
        vec2 cell = (fract(qw / 0.6) - 0.5) * 0.6;
        float d = length(cell);
        float big = 1.0 - smoothstep(0.007, 0.016, bPx);                   // too small to draw: it would twinkle
        float hole = (1.0 - smoothstep(0.0118, 0.0132 + bPx, d)) * big;
        float cone = clamp(1.0 - d / 0.0132, 0.0, 1.0) * hole;
        float ring = exp(-pow((d - 0.0205) / max(0.0016, bPx), 2.0)) * big;
        float stain = (1.0 - smoothstep(0.0, 0.05, abs(cell.x) - 0.006)) * smoothstep(0.0, -0.01, cell.y) * (1.0 - smoothstep(0.02, 0.16, -cell.y)) * big;
        float upright = step(abs(lkWN.y), 0.7);
        hole *= upright; cone *= upright; ring *= upright; stain *= upright;
        float lift = lineAA(qw.y, 1.2, 1.1) * upright * 0.35;
        float tone = (lkH2(vec2(floor(qw.y / 1.2), 5.0)) - 0.5) * 0.07;
        h0 += -0.022 * cone - 0.0005 * ring - 0.0003 * lift;
        ${SLOPE('h0')}
        lkG *= lkFlat(lkWN);
        vec4 mid = lkFbm(vec3(q * vec2(1.0, 1.4), 11.0), 30.0, 0.78, 6, bPx);
        // (the pale skin's edge: its threshold shaken at a few millimetres, so it is sharp and ragged)
        float rag = 0.07 * (lkn(vec3(q * 90.0, 31.0)) - 0.5) * lkKeep(0.004, bPx) + 0.04 * (lkn(vec3(q * 260.0, 37.0)) - 0.5) * lkKeep(0.0015, bPx);
        float grit = (lkn(vec3(q * 700.0, 5.0)) - 0.5) * lkKeep(0.0015, bPx) + 0.6 * (lkn(vec3(q * 300.0, 6.0)) - 0.5) * lkKeep(0.0035, bPx) + 0.5 * (lkn(vec3(q * 120.0, 7.0)) - 0.5) * lkKeep(0.008, bPx);
        // (patches about twice as long as tall: at five times they read as "stretched noise rather than laitance")
        float lait = smoothstep(0.09, 0.11 + bPx * 4.0, lkFbm(vec3(q * vec2(1.0, 2.2), 13.0), 6.0, 0.65, 6, bPx).x + rag);
        float broken = smoothstep(0.3, 0.7, lkn(vec3(q.x * 3.0, q.y * 9.0, 2.0)));
        float bloom = smoothstep(0.6, 0.9, lkn(vec3(q.x * 1.6, q.y * 0.5, 4.0)));
        float damp = smoothstep(0.62, 0.85, lkn(vec3(q.x * 0.9, q.y * 2.2, 8.0)));
        float tear = (smoothstep(0.74, 0.8, lkn(vec3(q.x * 2.2, q.y * 330.0, 21.0))) - smoothstep(0.76, 0.82, lkn(vec3(q.x * 2.6, q.y * 300.0, 27.0)))) * lkKeep(0.0025, bPx);
        lkG += (ta * mid.y + tb * mid.z) * 0.00065;
        float board = (bdA.x - 1.0) / 0.07;                                 // the board's own number, -0.5 to 0.5
        float lait2 = smoothstep(0.1, 0.19 + bPx * 4.0, lkFbm(vec3(q * vec2(1.0, 2.6), 19.0), 2.2, 0.62, 6, bPx).x + rag);
        lait2 *= 0.65 + 0.35 * mix(0.5, lkn(vec3(q * 150.0, 41.0)), lkKeep(0.003, bPx));
        float dark = smoothstep(0.12, 0.3, lkFbm(vec3(q * vec2(1.0, 3.0), 23.0), 1.6, 0.6, 5, bPx).x);
        float along = lkn(vec3(q.x * 1.4, floor(q.y / 0.12) * 3.1, 3.0)) * 0.6 + lkn(vec3(q.x * 5.0, q.y * 12.0, 5.0)) * 0.4;
        float pits = smoothstep(0.84, 0.92, lkn(vec3(q * vec2(140.0, 260.0), 43.0))) * lkKeep(0.0025, bPx);
        float scratch = smoothstep(0.8, 0.86, lkn(vec3(q.x * 9.0, q.y * 420.0, 47.0))) * smoothstep(0.55, 0.75, lkn(vec3(q * 6.0, 49.0))) * lkKeep(0.002, bPx);
        col *= (1.0 + 0.11 * board) * (0.85 + 0.30 * along) * (1.0 + tone) * (1.0 + 0.22 * cloud) * (1.0 + 0.48 * mid.x) * (1.0 + 0.24 * bdA.w * broken) * (1.0 + 0.46 * grit);
        col = mix(col, col * vec3(1.22, 1.2, 1.18) + 0.008, max(lait * 0.45, lait2 * 0.4));
        col *= (1.0 - 0.17 * dark) * (1.0 - 0.48 * pits) * (1.0 - 0.32 * scratch);
        col *= 1.0 + 0.11 * clamp(bdA.y, -1.0, 1.0);
        col = mix(col, col * 1.16 + 0.012, bloom * 0.28);
        col *= 1.0 - 0.14 * damp - 0.58 * bdA.z;
        col *= 1.0 + 0.16 * tear;
        col *= (1.0 - 0.78 * hole * (0.55 + 0.45 * cone)) * (1.0 - 0.15 * ring) * (1.0 - 0.08 * stain) * (1.0 - 0.20 * lift);
        ${outdoor ? `// rain that ran down from the top: narrow, faint, a hint (the facade's Tie Holes option of 13 Oct)
        float run = lkn(vec3(qw.x * 7.0, qw.y * 0.12, 3.0)) * (0.6 + 0.4 * lkn(vec3(qw.x * 23.0, qw.y * 0.3, 7.0)));
        float wet = smoothstep(0.42, 0.7, run) * smoothstep(0.8, 4.0, qw.y) * 0.13 * upright;
        col *= 1.0 - wet;` : 'float wet = 0.0;'}
        diffuseColor.rgb *= col / 1.08;
        roughnessFactor = clamp(0.80 - 0.10 * bdA.y - 0.10 * bdA.w - 0.10 * lait + 0.14 * bdA.z + 0.10 * mid.x + 0.05 * damp + 0.12 * hole - 0.3 * wet, 0.38, 1.0);`,
    });
  }
  const concreteIn = (orig) => fairFaced(orig, 'concreteIn', [0.245, 0.238, 0.226], false);

  /* ---------- the outside walls (and the entrance's left and right walls): fair-faced concrete, cast against panels ----------------------
     Sam, 15 Oct, at the front of the house: "right now it's nice, but maybe make that feel of industrial concrete premium
     wall", and 17 Oct: "For the entrance, just for the entrance, the left and right wall should have a similar texture
     that looks like the front door, so you can reuse that same texture."
     Film-faced panels 2.4 by 1.2 m, a crisp hairline where two panels met (a little cement bled into it, so it is darker),
     the tie holes on the drawing's grid, 30 cm in from each joint. Each panel its own shade, a soft cloud in it and a finer
     silky mottle, multi-scale sand/aggregate roughness, two tiers of bug holes, and a satin sheen. */
  function fairFaced(orig, key, base, outdoor) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.74 }), key, {
      surface: `
        vec2 qw; vec3 ta, tb; lkPlane(vDrawW, lkWN, qw, ta, tb);
        float cPx = mix(lkPxM, lkPx, 0.35);
        float upright = step(abs(lkWN.y), 0.7);
        // the panels: 2.4 m along, 1.2 m up. On N/S walls the door's edges (plan x 13.8 and 16.2) lie on joints;
        // on E/W walls (the entrance's left and right walls) joints lie at multiples of 2.4 m (plan y 19.2, 21.6, 24.0)
        // so every 0.6 m tie hole sits 30 cm inside the panel joints.
        float pOff = abs(lkWN.x) > abs(lkWN.z) ? 7.2 : 16.2;
        vec2 pq = vec2((qw.x + pOff) / 2.4, qw.y / 1.2);
        vec2 pid = floor(pq), pf = fract(pq);
        float r1 = lkH2(pid + 3.0), r2 = lkH2(pid + 11.0);
        vec2 ed = min(pf, 1.0 - pf) * vec2(2.4, 1.2);                       // metres to the panel's nearest edges
        float fwx = max(0.0014, fwidth(qw.x) * 1.15), fwy = max(0.0014, fwidth(qw.y) * 1.15);
        float jx = exp(-pow(ed.x / fwx, 2.0)) * (0.0014 / fwx), jy = exp(-pow(ed.y / fwy, 2.0)) * (0.0014 / fwy);
        float joint = max(jx, jy) * upright;
        float edgeHalo = exp(-min(ed.x, ed.y) / 0.055) * upright;
        // each panel a hair proud or back, easing to nothing at its joints (never a step)
        float s = max(0.012, cPx * 2.0);
        float plane = (r1 - 0.5) * 0.0011 * smoothstep(0.0, s, min(ed.x, ed.y)) * upright;
        // tie holes: a recessed cone 26 mm across, a mortar plug ring 42 mm across where the cone sat
        vec2 cell = (fract(qw / 0.6) - 0.5) * 0.6;
        float d = length(cell);
        float big = 1.0 - smoothstep(0.007, 0.016, cPx);
        float hole = (1.0 - smoothstep(0.012, 0.0135 + cPx, d)) * big * upright;
        float cone = clamp(1.0 - d / 0.0135, 0.0, 1.0) * hole;
        float ring = exp(-pow((d - 0.021) / max(0.0018, cPx), 2.0)) * big * upright;
        float stain = (1.0 - smoothstep(0.0, 0.055, abs(cell.x) - 0.007)) * smoothstep(0.0, -0.01, cell.y) * (1.0 - smoothstep(0.02, 0.18, -cell.y)) * big * upright;
        // tactile concrete skin: panel cloud, medium cement-paste mottle, multi-scale sand/aggregate roughness, and formwork ply grain
        vec4 cloud = lkFbm(vec3(qw * vec2(1.0, 1.3), 6.0 + r2 * 9.0), 0.85, 0.55, 4, cPx);
        vec4 silk = lkFbm(vec3(qw, 11.0 + r1 * 5.0), 7.5, 0.62, 5, cPx);
        vec4 rough = lkFbm(vec3(qw, 19.0 + r2 * 7.0), 26.0, 0.65, 5, cPx);
        float sheet = (lkn(vec3(qw.x * 1.3, qw.y * 42.0, r1 * 20.0)) - 0.5) * lkKeep(0.014, cPx) + 0.55 * (lkn(vec3(qw.x * 26.0, qw.y * 2.2, r2 * 15.0)) - 0.5) * lkKeep(0.016, cPx);
        float gritCoarse = (lkn(vec3(qw * 85.0, 4.0 + r1 * 6.0)) - 0.5) * lkKeep(0.011, cPx);
        float gritMed = (lkn(vec3(qw * 210.0, 6.0)) - 0.5) * lkKeep(0.0048, cPx);
        float gritFine = (lkn(vec3(qw * 540.0, 5.0)) - 0.5) * lkKeep(0.002, cPx);
        // two tiers of architectural bug holes / blowholes (2 to 7 mm and 1 to 3.5 mm), concentrated toward the top of each lift and panel edges
        vec2 hc1 = floor(qw / 0.068); vec2 hr1 = lkH22(hc1 + 5.0);
        float rad1 = 0.0017 + 0.0033 * pow(lkH2(hc1 + 9.0), 1.65);
        float pit1 = step(0.78 - 0.16 * smoothstep(0.45, 1.0, pf.y) - 0.08 * edgeHalo, lkH2(hc1 + 2.0)) * (1.0 - smoothstep(rad1 * 0.42, rad1 + cPx * 0.55, length(qw - (hc1 + 0.16 + 0.68 * hr1) * 0.068)));
        pit1 *= min(1.0, rad1 / max(cPx * 0.45, 1e-5)) * upright;
        vec2 hc2 = floor(qw / 0.036); vec2 hr2 = lkH22(hc2 + 3.0);
        float rad2 = 0.0009 + 0.0020 * pow(lkH2(hc2 + 7.0), 1.8);
        float pit2 = step(0.76 - 0.16 * smoothstep(0.5, 1.0, pf.y), lkH2(hc2 + 1.0)) * (1.0 - smoothstep(rad2 * 0.45, rad2 + cPx * 0.5, length(qw - (hc2 + 0.15 + 0.7 * hr2) * 0.036)));
        pit2 *= min(1.0, rad2 / max(cPx * 0.5, 1e-5)) * upright;
        float pit = clamp(pit1 + 0.85 * pit2, 0.0, 1.0);
        float h0 = plane + 0.00062 * silk.x + 0.00095 * rough.x + 0.00042 * gritCoarse + 0.00026 * gritMed + 0.00012 * gritFine + 0.00022 * sheet - 0.022 * cone - 0.0007 * ring - 0.0038 * pit1 - 0.0022 * pit2 - 0.00065 * joint;
        ${SLOPE('h0')}
        lkG *= lkFlat(lkWN);
        vec3 col = ${v3(base)} * (1.0 + 0.09 * (r1 - 0.5) * upright) * (1.0 + 0.26 * cloud.x) * (1.0 + 0.25 * silk.x) * (1.0 + 0.32 * rough.x) * (1.0 + 0.08 * sheet);
        col *= 1.0 + 0.26 * gritCoarse + 0.24 * gritMed + 0.18 * gritFine;
        col *= (1.0 - 0.42 * joint - 0.06 * edgeHalo * (0.5 - silk.x)) * (1.0 - 0.66 * pit);
        col *= (1.0 - 0.80 * hole * (0.55 + 0.45 * cone)) * (1.0 - 0.18 * ring) * (1.0 - 0.10 * stain);
        ${outdoor !== false ? `// rain that ran down from the top: narrow, faint
        float run = lkn(vec3(qw.x * 7.0, qw.y * 0.12, 3.0)) * (0.6 + 0.4 * lkn(vec3(qw.x * 23.0, qw.y * 0.3, 7.0)));
        float wet = smoothstep(0.45, 0.72, run) * smoothstep(0.8, 4.0, qw.y) * 0.12 * upright;
        col *= 1.0 - wet;` : 'float wet = 0.0;'}
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.78 + 0.12 * silk.x + 0.12 * rough.x + 0.06 * cloud.x + 0.15 * pit + 0.15 * hole + 0.08 * joint - 0.18 * wet, 0.48, 0.99);`,
    });
  }

  /* ---------- oak for the pivot door, the console and the side doors' leaves -------------------------
     The living room's oak boards stood up, with the figure a flat sawn board shows: the growth rings meet the face in
     nested arches (cathedrals), because the log tapers and the saw runs straight. A ring is a pale earlywood band ending
     in a dark line of open pores. Without it the first console read as laminate.
       the pivot door: fifteen boards of 15.9 cm (2.38 m in fifteen), each the door's whole height, laid on the leaf
                       itself so they turn with it. A satin oil.
       the console:    smoked oak, darker and a little greyer, a duller wax. Boards along its length.
       the side doors: a flush leaf in an upright oak veneer, book-matched strips of 16 cm with no joint to speak of. */
  const OAKFIG = `
    // The figure of a flat sawn board: its face is a plane a little tilted to the log's axis, 8 to 28 cm from the pith, so
    // each ring meets it in an arch that closes where the face reaches it. Arches about 30 cm long, a new one every few
    // centimetres. (Two wrong tries: the pith 1 to 6 cm behind the face drew straight lines, then tight chevrons.) rift:
    // the share of boards sawn rift, their pith far to one side, straight grained.
    // x along the grain, y across the board from its middle (metres). Returns where the pixel is in its ring (0 to 1);
    // band: the ring's earlywood, a third of it wide, where oak's big open pores are (oak is ring porous).
    // (Until the reviewer's round of 15 Oct the figure was a thin dark line at each ring's start, on a smooth board: "thin
    // drawn contour lines with an embossed rim", "no pores". Real oak is fibre and pores everywhere, and its figure is
    // where the pores crowd together. So now the ring only says where the pores crowd: see OAKTEX.)
    float oakArch(float x, float y, float px, float seed, float rift, out float band) {
      float r1 = lkH2(vec2(seed, 1.0)), r2 = lkH2(vec2(seed, 2.0)), r3 = lkH2(vec2(seed, 3.0)), r4 = lkH2(vec2(seed, 4.0));
      // (Iteration 8, the reviewer's round of 15 Oct: "nested arch rings repeat in every stave, with even ring spacing".
      // The face cut 3 to 8 cm of radius per metre, so a new arch began every 6 cm in every board. A real log tapers
      // about a centimetre a metre: an arch every 15 to 40 cm, long and few, and the log is no perfect cone, so the
      // arches' tips wander. Rings vary in width over decades, not a little round one width.)
      float depth = 0.1 + 0.25 * r1;
      float taper = (0.004 + 0.022 * r2 * r2) * (r3 < 0.5 ? 1.0 : -1.0);     // (each board its own: an even spread repeated, "every 112 px")
      float off = r4 < rift ? (r3 < 0.5 ? 1.0 : -1.0) * (0.18 + 0.2 * r1) : (r3 - 0.5) * 0.06;
      float yy = y - off + 0.008 * sin(x * 1.1 + seed * 7.0) + 0.012 * (lkn(vec3(x * 0.6, y * 3.0, seed)) - 0.5);
      // (the wobble changes slowly along the board: quicker, it began arches of its own once the taper was gentle)
      float wob = 0.003 * (lkn(vec3(x * 1.0, yy * 25.0, seed + 4.0)) - 0.5) + 0.0015 * (lkn(vec3(x * 2.5, yy * 60.0, seed + 5.0)) - 0.5) + 0.0006 * (lkn(vec3(x * 6.0, yy * 160.0, seed + 6.0)) - 0.5) * lkKeep(0.003, px);
      float lumpy = 0.008 * (lkn(vec3(x * 0.4, seed, 11.0)) - 0.5) + 0.003 * (lkn(vec3(x * 1.3, seed, 12.0)) - 0.5);
      float R = length(vec2(yy, depth)) + taper * x + wob + lumpy;
      float ring = R / (0.0016 + 0.0034 * lkH2(vec2(seed, 5.0)));
      ring += 2.2 * (lkn(vec3(R * 22.0, seed, 7.0)) - 0.5);               // runs of wide years and runs of narrow ones
      // and each year its own width, a wet year next to a dry one (rings of even width read as a print, repeating every
      // 36 to 104 pixels down the door: the reviewer's autocorrelation, iteration 8. Kept under 1 in slope: rings never fold)
      ring += 0.55 * (lkn(vec3(ring * 0.85, seed, 8.0)) - 0.5);
      float fw = fwidth(ring), vis = 1.0 - smoothstep(0.3, 0.7, fw);
      float f = fract(ring), str = 0.45 + 0.55 * lkH2(vec2(floor(ring), seed));
      band = mix(0.3, smoothstep(0.0, 0.05 + fw, f) * (1.0 - smoothstep(0.16, 0.32 + fw, f)) * str, vis);
      return f;
    }
    // Oak's open pores as the eye sees them from a metre or two: short dark dashes along the grain, each a soft ellipse at
    // its own place in a jittered grid stretched along the grain, rounded at its ends. (Thresholded value noise did this
    // first and showed its square grid: blocky dashes like digital camouflage.) p: along, across, in cells
    float oakDash(vec2 p, float seed) {
      vec2 c0 = floor(p); float m = 0.0;
      for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
        vec2 c = c0 + vec2(float(i), float(j)), r = lkH22(c + seed);
        vec2 d = p - c - r;
        float e = length(d / vec2(0.3 + 0.55 * lkH2(c + seed + 3.0), 0.16 + 0.2 * r.y));
        float aa = max(fwidth(e), 0.05);
        m = max(m, (1.0 - smoothstep(1.0 - aa, 1.0 + aa, e)) * step(0.3, lkH2(c + seed + 5.0)) * (0.55 + 0.45 * r.x));
      }
      return m;
    }`;
  // the board's texture at every size, the same for the three: fibre streaks everywhere, open pores as short dashes along
  // the grain (thick in the earlywood, sparse in the latewood), long lighter and darker stretches, the ring bands
  const OAKTEX = `
        // (fine grain fades by the pixel's size across the grain, not its longest side: on a door seen at a slant the pixel
        // is long across the view and short up it, and by its longest side every streak and pore had gone, while a
        // photographed oak keeps them. Its features are thin across the grain and long along it)
        float pxA = max(fwidth(fq.y) * 0.7, 1e-5);                          // (fwidth adds the two screen directions: about 1.4 times a pixel)
        float band; float fph = oakArch(fq.x, fq.y, pxA, fseed, fRift, band);
        float zone = lkn(vec3(fq.x * 0.8, fq.y * 6.0, fseed + 9.0));
        float pk = lkKeep(0.0009, pxA);
        float pd = lkn(vec3(fq.x * 55.0, fq.y * 1700.0, fseed));
        float pores = mix(0.05 + 0.22 * band, smoothstep(0.66 - 0.3 * band, 0.8 - 0.26 * band, pd), pk);
        // and their groups: dark flecks a millimetre or two wide and a few centimetres long, crisp, which is what the grain
        // is from a couple of metres (smooth streaks there read as blur, the scan's grain stays sharp)
        // dashes of a millimetre across and up to 4 cm long, thick in the earlywood band, sparse in the latewood; their average
        // where they are smaller than a pixel across
        float dk = lkKeep(0.0035, pxA);
        // (two layers of cells, 4.5 and 3.2 cm along the grain: one alone left its cell's length as a beat down the board)
        float dash = mix(0.12 + 0.16 * band, max(oakDash(vec2(fq.x * 22.0, fq.y * 300.0), fseed * 7.0), oakDash(vec2(fq.x * 31.0 + 0.37, fq.y * 300.0 + 0.5), fseed * 7.0 + 3.0) * 0.8) * (0.3 + 0.7 * band), dk);
        pores = max(pores, dash * 0.85);
        float fib = (lkn(vec3(fq.x * 4.0, fq.y * 750.0, fseed + 2.0)) - 0.5) * lkKeep(0.0012, pxA)
                  + 0.7 * (lkn(vec3(fq.x * 1.6, fq.y * 220.0, fseed + 3.0)) - 0.5) * lkKeep(0.004, pxA)
                  + 0.5 * (lkn(vec3(fq.x * 0.7, fq.y * 60.0, fseed + 4.0)) - 0.5);`;
  const OAKPAINT = (base) => `
        vec3 col = ${v3(base)} * oakA.x * mix(vec3(1.0), vec3(0.95, 0.97, 1.02), smoothstep(0.6, 1.0, oakB.x));
        col *= (1.0 - 0.2 * band) * (1.0 - 0.5 * pores) * (1.0 + 0.38 * fib) * (0.86 + 0.28 * zone);
        col = mix(col, col * vec3(1.2, 1.15, 1.06), oakA.z * 0.8);
        col = mix(col, col * vec3(0.42, 0.34, 0.28), clamp(oakB.y, 0.0, 1.0));
        ${DBG === 'pores' ? 'col = vec3(pores) * 0.3;' : DBG === 'band' ? 'col = vec3(band) * 0.3;' : DBG === 'fib' ? 'col = vec3(0.5 + fib) * 0.15;' : DBG === 'pd2' ? 'col = vec3(pd2) * 0.3;' : DBG === 'keep' ? 'col = vec3(pk, lkKeep(0.0022, pxA), pxA * 300.0) * 0.3;' : DBG === 'px' ? 'col = vec3(lkPx * 300.0, pxA * 300.0, fwidth(vDrawW.y) * 300.0) * 0.3;' : ''}`;
  function oakDoor(orig) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.5 }), 'oakDoor', {
      head: OAK + OAKFIG, local: true,
      surface: `
        // the leaf's own axes: x across it (2.38 m, centred), y up (4.18 m, centred), z through it (8 cm)
        vec3 an = abs(vLkObjN);
        float Wd = 2.38 / 15.0;
        vec2 q = vec2(vLkObj.y + 50.0, vLkObj.x + 1.19);                  // along the board (up), across the boards
        if (an.x > an.z && an.x > an.y) q.y = (vLkObj.x > 0.0 ? 14.5 : 0.5) * Wd + vLkObj.z * 0.5;   // the leaf's long edges: the outer boards' edge grain
        // (glued boards, a hairline between them: the reviewer read the 2 mm bevel's dark line as hard stave cuts)
        float h0 = oakBoardL(q, lkPx, Wd, 100.0, 0.15, oakA, oakB);
        vec2 fq = vec2(q.x, (fract(q.y / Wd) - 0.5) * Wd); float fseed = floor(q.y / Wd) + 3.0, fRift = 0.5;
        ${OAKTEX}
        h0 -= 0.00006 * pores * pk;
        ${SLOPE('h0')}
        lkG *= lkFlat(lkWN);
        ${OAKPAINT([0.385, 0.232, 0.142])}
        col *= 1.0 - 0.25 * oakA.w;
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.44 + 0.08 * oakB.x + 0.16 * pores - 0.08 * oakA.z + 0.2 * oakA.w, 0.2, 1.0);`,
    });
  }
  function oakConsole(orig) {
    // the console: plan 11.15 to 11.7 by 17.9 to 20.3, 86 cm high (since iteration 8, in the corner). Deep espresso-smoked
    // outer case framing six warmer, high-contrast figured oak drawer fronts (3 columns x 2 rows)
    const c0 = W(11.15, 17.9);
    return code(phys({ envMapIntensity: (orig.envMapIntensity || 1.0) * 1.18, roughness: 0.40, clearcoat: 0.28, clearcoatRoughness: 0.24 }), 'oakConsole', {
      head: OAK + OAKFIG,
      surface: `
        vec3 an = abs(lkWN), p = vDrawW - ${v3(c0)};
        vec2 q; float Wd;
        float drwCol = clamp(floor((p.z - 0.04) / 0.7733), 0.0, 2.0);
        float drwRow = step(0.47, p.y);
        float isDrw = step(0.545, p.x) * step(0.11, p.y) * step(p.y, 0.83) * step(0.035, p.z) * step(p.z, 2.365);
        if (an.y > an.x && an.y > an.z) { q = vec2(p.z + 7.0, p.x); Wd = 0.185; }
        else if (an.x >= an.z) { q = vec2(p.z + 7.0 + isDrw * (drwCol * 3.7 + drwRow * 5.3), p.y); Wd = 0.35; }
        else { q = vec2(p.x + 7.0, p.y); Wd = 0.215; }
        float h0 = oakBoardL(q, lkPx, Wd, 30.0, 0.03, oakA, oakB);
        vec2 fq = vec2(q.x, (fract(q.y / Wd) - 0.5) * Wd);
        float fseed = floor(q.y / Wd) + 11.0 + floor(an.y * 1.5) * 5.0 + isDrw * (drwCol * 7.0 + drwRow * 13.0), fRift = mix(0.45, 0.18, isDrw);
        ${OAKTEX}
        h0 += 0.00010 * fib - 0.00012 * pores * pk;
        ${SLOPE('h0')}
        lkG *= lkFlat(lkWN);
        ${OAKPAINT([0.265, 0.132, 0.068])}
        // High-contrast cabinet work: deep espresso-smoked outer carcass framing warmer, richly figured drawer fronts
        float drwTone = 0.92 + 0.18 * lkH2(vec2(drwCol * 3.0 + drwRow * 5.0, 7.0));
        float figContrast = (1.0 - 0.26 * band) * (0.86 + 0.28 * zone);
        vec3 caseTone = vec3(0.54, 0.49, 0.45);
        vec3 frontTone = vec3(1.12, 1.04, 0.94) * drwTone * figContrast;
        col *= mix(caseTone, frontTone, isDrw);
        // subtle chamfer darkening around each drawer front's perimeter
        float dyDrw = min(abs(p.y - (drwRow > 0.5 ? 0.478 : 0.122)), abs(p.y - (drwRow > 0.5 ? 0.818 : 0.462)));
        float dzDrw = min(abs(p.z - (0.044 + drwCol * 0.7733)), abs(p.z - (0.044 + (drwCol + 1.0) * 0.7733 - 0.012)));
        float drwRim = 1.0 - smoothstep(0.0, 0.018, min(dyDrw, dzDrw));
        col *= 1.0 - 0.28 * isDrw * drwRim - 0.34 * oakA.w;
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(mix(0.46, 0.36, isDrw) + 0.08 * oakB.x + 0.18 * pores - 0.08 * oakA.z + 0.25 * oakA.w, 0.20, 0.88);`,
    });
  }
  function oakLeaf(orig) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.5 }), 'oakLeaf', {
      head: OAK + OAKFIG,
      surface: `
        vec2 qw; vec3 ta, tb; lkPlane(vDrawW, lkWN, qw, ta, tb);           // along the wall, up
        bool face = abs(lkWN.y) < 0.7;
        // one flush leaf in a rift veneer, strips of 16 cm laid edge to edge. (Book-matched, every other strip mirrored,
        // and each strip's streaks the same, the reviewer saw "columns of near identical nested drape arcs")
        float S = 0.16, strip = floor(qw.x / S);
        vec2 q = face ? vec2(qw.y + 50.0, qw.x) : vec2(qw.x + 50.0, qw.y);
        float h0 = oakBoardL(vec2(q.x, q.y + 50.0), lkPx, 5.0, 100.0, 0.0, oakA, oakB);
        vec2 fq = vec2(q.x, (fract(q.y / S) - 0.5) * S); float fseed = strip + 23.0, fRift = 0.6;
        ${OAKTEX}
        h0 = 0.00008 * fib - 0.00006 * pores * pk;
        ${SLOPE('h0')}
        lkG *= lkFlat(lkWN);
        ${OAKPAINT([0.3, 0.205, 0.13])}
        col *= 0.96 + 0.08 * lkH2(vec2(strip, 4.0));
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.46 + 0.06 * oakB.x + 0.14 * pores - 0.06 * oakA.z, 0.25, 1.0);`,
    });
  }

  /* ======================================================================================
     THE REST OF THE HOUSE (15 Oct, Sam: "I don't want any Poly Haven textures, everything should be in code now").
     Colours: each scan's average as the page drew it (the scan's mean in linear light, mixed with its grey by the
     material's own saturation and times its tint, the same maths as drawable()).
     ====================================================================================== */

  // A scan whose own shader already draws the material (the larch's battens, the lawn's stripes, the meadow): the scan
  // comes off, and its average colour as the page lit it takes its place. extra: more code laid on top (the grass blades)
  function descan(orig, key, mean, extra) {
    const m = orig.clone();
    m.onBeforeCompile = orig.onBeforeCompile; m.customProgramCacheKey = orig.customProgramCacheKey;
    m.userData = Object.assign({}, orig.userData, { look: key });
    ['map', 'normalMap', 'roughnessMap', 'aoMap', 'metalnessMap'].forEach((k) => { m[k] = null; });
    m.color.setRGB(mean[0], mean[1], mean[2]);
    return extra ? overlay(m, Object.assign({ key: 'descan-' + key }, extra)) : m;
  }
  // Grass close up and across the lawn: fine fescue blades a couple of millimetres wide, organic turf shoot clusters that
  // stay visible across the open grass walk, subtle mowing-stripe lay, and 3D normal relief.
  const GRASS = {
    head: `
    float gsBlade(vec2 p) {
      vec2 c0 = floor(p); float m = 0.0, t = 0.5;
      for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
        vec2 c = c0 + vec2(float(i), float(j)), r = lkH22(c);
        vec2 d = p - c - r;
        float a = lkH2(c + 4.1) * 6.2832; vec2 dir = vec2(cos(a), sin(a));
        float along = dot(d, dir), across = dot(d, vec2(-dir.y, dir.x));
        float e = length(vec2(along / (0.48 + 0.36 * r.x), across / 0.11));
        float b = 1.0 - smoothstep(0.68, 1.0, e);
        if (b > m) { m = b; t = lkH2(c + 9.3); }
      }
      return m * (0.55 + 0.85 * t);
    }`,
    surface: `
      vec2 gp = vDrawW.xz * 72.0;
      float gPx = mix(lkPxM, lkPx, 0.22);
      float gk = lkKeep(0.0055, gPx);
      float tk = lkKeep(0.014, gPx);
      float mk = lkKeep(0.055, gPx);
      float bl = gk > 0.001 ? gsBlade(gp) : 0.5;
      float blMed = tk > 0.001 ? gsBlade(vDrawW.xz * 38.0 + 7.3) : 0.5;
      float tuft = (0.60 * (lkn(vec3(vDrawW.xz * 14.0, 2.0)) - 0.5) + 0.40 * (lkn(vec3(vDrawW.xz * 32.0, 6.0)) - 0.5)) * mk;
      float micro = (lkn(vec3(vDrawW.xz * 5.5, 3.0)) - 0.5);
      float macro = (lkn(vec3(vDrawW.xz * 1.6, 1.0)) - 0.5);
      float stripe = sin(vDrawW.z * 3.927 + 0.25 * lkn(vec3(vDrawW.xz * 0.9, 5.0))) * 0.5;
      float hG = (0.0018 * (bl - 0.5) * gk + 0.0014 * (blMed - 0.5) * tk + 0.0012 * tuft) * lkFlat(lkWN);
      ${SLOPE('hG')}
      vec3 tipTint = mix(vec3(0.88, 0.94, 0.82), vec3(1.08, 1.08, 0.92), clamp(0.45 * bl + 0.35 * blMed + 0.20 * (stripe + 0.5), 0.0, 1.0));
      diffuseColor.rgb *= mix(1.0, 0.64 + 0.56 * bl, gk) * mix(1.0, 0.74 + 0.42 * blMed, tk * (1.0 - 0.40 * gk));
      diffuseColor.rgb *= (1.0 + 0.24 * tuft + 0.15 * micro + 0.11 * macro + 0.06 * stripe) * mix(vec3(1.0), tipTint, max(gk, tk * 0.70) * 0.45);
      roughnessFactor = clamp(roughnessFactor - 0.08 * bl * gk - 0.05 * blMed * tk - 0.03 * stripe, 0.58, 0.96);`,
  };

  /* plain concrete, cast and power-floated: the garage's floor and sill, a planter. A soft cloud, the trowel's burnished
     arcs, aggregate and sand in it, a few pin holes, a hairline crack now and then */
  function plainConcrete(orig, key, base) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.7 }), key, {
      surface: `
        vec2 q; vec3 ta, tb; lkPlane(lkP, lkWN, q, ta, tb);
        vec4 cl = lkFbm(vec3(q, 2.0), 1.2, 0.55, 4, lkPx), mid = lkFbm(vec3(q, 5.0), 14.0, 0.62, 5, lkPx);
        float swirl = smoothstep(0.55, 0.8, lkn(vec3(q * vec2(3.5, 1.1), 7.0)));
        float agg = smoothstep(0.76, 0.86, lkn(vec3(q * 180.0, 2.0))) * lkKeep(0.004, lkPx);
        float sand = (lkn(vec3(q * 700.0, 5.0)) - 0.5) * lkKeep(0.0015, lkPx);
        float pin = smoothstep(0.86, 0.9, lkn(vec3(q * 260.0, 9.0))) * lkKeep(0.0025, lkPx);
        float cn = lkn(vec3(q * 3.0 + 0.4 * lkn(vec3(q * 9.0, 1.0)), 13.0)) - 0.5;
        float crack = (1.0 - smoothstep(0.0, max(fwidth(cn) * 1.2, 0.002), abs(cn))) * smoothstep(0.62, 0.8, lkn(vec3(q * 0.7, 14.0))) * lkKeep(0.004, lkPx);
        float h = 0.0002 * mid.x + 0.00003 * sand - 0.0008 * pin - 0.0004 * crack;
        ${SLOPE('h')}
        lkG *= lkFlat(lkWN);
        vec3 col = ${v3(base)} * (1.0 + 0.22 * cl.x) * (1.0 + 0.3 * mid.x) * (1.0 + 0.25 * sand) * (1.0 + 0.2 * agg);
        col *= (1.0 - 0.08 * swirl) * (1.0 - 0.5 * pin) * (1.0 - 0.45 * crack);
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.72 + 0.1 * mid.x - 0.18 * swirl + 0.1 * pin, 0.35, 1.0);`,
    });
  }

  /* limewash: the gallery's walls. Lime brushed in thin coats over the plaster: soft clouds in several sizes, the brush's
     strokes crossing at angles, chalky and dead matte, a little darker where a coat lies thicker, the plaster's trowel
     and sand under it */
  // (key: each colour its own shader. With one key for two colours, three.js built the shader once and the entrance's front
  // wall wore the gallery's grey: the colour is written into the code, iteration 8)
  function limewash(orig, base, key, amp, calm) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.92 }), key || 'limewash', {
      head: PLASTER,
      surface: `
        vec2 q; vec3 ta, tb; lkPlane(lkP, lkWN, q, ta, tb);
        float wPx = mix(lkPxM, lkPx, 0.35);
        float lip; float h = trowel(q, ${f(amp || 0.00012)}, lip);
        vec4 sand = lkFbm(vec3(q, 0.5), 600.0, 0.55, 3, wPx);
        float fineMott = lkFbm(vec3(q, 9.0), 42.0, 0.58, 3, wPx).x;
        float c1 = lkFbm(vec3(q, 3.0), 0.8, 0.55, 4, wPx).x, c2 = lkFbm(vec3(q, 4.0), 4.0, 0.6, 4, wPx).x;
        // the brush: strokes 6 to 12 cm wide, long, at a slant that turns patch by patch
        float a = 0.5 + 1.2 * lkn(vec3(q * 0.6, 6.0)); vec2 bq = vec2(cos(a) * q.x + sin(a) * q.y, -sin(a) * q.x + cos(a) * q.y);
        float stroke = lkn(vec3(bq.x * 1.2, bq.y * 11.0, 8.0)) - 0.5;
        h += 0.000045 * fineMott;
        lkG = lkSurfGrad(lkWN, dFdx(h), dFdy(h)) + (ta * sand.y + tb * sand.z) * 0.00011;
        lkG *= lkFlat(lkWN);
        vec3 col = ${v3(base)} * (1.0 + ${f(0.14 * (calm || 1))} * c1) * (1.0 + ${f(0.1 * (calm || 1))} * c2) * (1.0 + ${f(0.1 * (calm || 1))} * stroke) * (1.0 + 0.04 * sand.x + 0.045 * fineMott);
        col = mix(col, col * ${v3([1.04, 1.03, 1.0])}, smoothstep(0.1, 0.3, c2));
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.91 + 0.06 * sand.x + 0.03 * fineMott - 0.05 * lip, 0.78, 1.0);`,
    });
  }

  /* ---------- the entrance's floor: slabs of a dark grey marble ---------------------------------------
     Iteration 8, Sam, 15 Oct: "instead of one smooth surface, big tiles... side by side, so there's that small delimitation
     that is subtle, that feels clean... make it more realistic". Slabs of 1.2 by 2.4 m, the long side toward the living
     room, laid on a grid whose joints meet the edges of the opening (plan x 12 and 18) and the front wall. A grey Italian
     marble (Bardiglio / Pietra Grey), honed to a silky semi-polished satin: multi-scale mineral clouds with fine crystalline
     calcite grain, dark graphite stylolite veins, crisp ivory-silver calcite veins and hairline fractures, eased bevelled
     arrises at each 1.5 mm joint, and a clearcoat satin sheen that reflects the room and the sunbeam. */
  const SLAB = `
    // a geological fracture or stylolite vein along a warped linear coordinate: never forms closed oval loops, and
    // never thinner than a pixel can hold (fainter instead), so it stays razor-clean across the floor
    float slLine(float coord, float t) {
      float fw = max(fwidth(coord), 1e-5), w = max(t, fw * 1.2);
      float d = abs(fract(coord) - 0.5);
      return (1.0 - smoothstep(0.42 * w, 1.42 * w, d)) * (t / w);
    }`;
  function slabs(orig) {
    return code(phys({ envMapIntensity: (orig.envMapIntensity || 1.0) * 1.42, roughness: 0.19, clearcoat: 0.54, clearcoatRoughness: 0.12 }), 'slabDark', {
      head: SLAB,
      surface: `
        vec2 q = vDrawW.xz, o = vec2(-18.0, -7.0), sz = vec2(1.2, 2.4);              // plan x 12, y 17: the grid's corner
        if (abs(lkWN.y) < 0.5) q = abs(lkWN.x) > abs(lkWN.z) ? vec2(vDrawW.y - 18.0, vDrawW.z) : vec2(vDrawW.y - 18.0, vDrawW.x);
        float mPx = mix(lkPxM, lkPx, 0.28);
        vec2 c = (q - o) / sz, id = floor(c), lq = fract(c) * sz;
        float r1 = lkH2(id + 3.1), r2 = lkH2(id + 7.7), r3 = lkH2(id + 13.3);
        vec2 e2 = min(lq, sz - lq); float ej = min(e2.x, e2.y);
        // the joint and the bevelled arris, each by the pixel's size across it so joints stay crisp across the room
        vec2 pq = max(fwidth(q), vec2(1e-5));
        vec2 gw2 = max(vec2(0.0009), pq * 0.85), ew2 = max(vec2(0.0024), pq * 1.5);
        vec2 g2 = 1.0 - smoothstep(gw2 * 0.55, gw2 * 1.35, e2), a2 = 1.0 - smoothstep(vec2(0.0), ew2, e2);
        float gfar = 1.0 - smoothstep(0.038, 0.09, mPx);
        float grout = max(g2.x, g2.y) * gfar, arris = max(a2.x, a2.y) * gfar;
        float gw = mix(gw2.y, gw2.x, step(e2.x, e2.y)), ew = mix(ew2.y, ew2.x, step(e2.x, e2.y));
        // each column of slabs cut in sequence from one quarry block, with per-slab mineral offset
        vec2 sp = vec2(lq.x, q.y - o.y) + vec2(lkH2(vec2(id.x, 5.0)) * 40.0 + r1 * 0.35, lkH2(vec2(id.x, 9.0)) * 3.0 + id.y * 0.12);
        // multi-scale tectonic shear warp (coarse fold + medium angular kink + fine stylolite зуб)
        float w1 = lkFbm(vec3(sp * vec2(0.75, 0.32), 21.0), 1.0, 0.52, 3, mPx).x;
        float w2 = lkFbm(vec3(sp * vec2(2.4, 1.15), 24.0), 1.0, 0.55, 3, mPx).x;
        float w3 = lkFbm(vec3(sp * vec2(7.5, 4.2), 27.0), 1.0, 0.55, 2, mPx).x;
        vec2 rv = mat2(0.95, -0.31, 0.31, 0.95) * sp;
        vec2 cv = mat2(0.91, 0.41, -0.41, 0.91) * sp;
        vec2 xv = mat2(0.64, -0.77, 0.77, 0.64) * sp;
        // 1. Dark graphite stylolite seams & primary mineral veins along open shear planes (no closed rings)
        float v1 = slLine(rv.x * 0.58 + rv.y * 0.06 + w1 * 0.38 + w2 * 0.14 + w3 * 0.04, 0.0085)
                 * smoothstep(-0.18, 0.28, lkFbm(vec3(sp * vec2(0.65, 0.28), 32.0), 1.0, 0.5, 2, mPx).x);
        float v2 = slLine(rv.x * 1.25 - rv.y * 0.11 + w1 * 0.45 - w2 * 0.18 + w3 * 0.05 + 0.37, 0.0095)
                 * smoothstep(-0.12, 0.32, lkFbm(vec3(sp * vec2(1.2, 0.52), 34.0), 1.0, 0.5, 2, mPx).x);
        float v3 = slLine(cv.x * 2.35 + cv.y * 0.22 + w1 * 0.52 + w2 * 0.24 + 0.61, 0.012)
                 * smoothstep(-0.05, 0.36, lkFbm(vec3(sp * vec2(2.2, 0.95), 36.0), 1.0, 0.5, 2, mPx).x);
        float veinDark = clamp(0.72 * v1 + 0.50 * v2 + 0.34 * v3, 0.0, 1.0);
        // 2. Crisp ivory-silver crystalline calcite fracture veins & conjugate hairline veins (Pietra Grey / Grigio Carnico)
        float c1 = slLine(rv.x * 0.68 + rv.y * 0.09 + w1 * 0.34 + w2 * 0.11 + w3 * 0.025 + 0.23, 0.0052)
                 * smoothstep(-0.08, 0.34, lkFbm(vec3(sp * vec2(0.75, 0.32), 52.0), 1.0, 0.5, 2, mPx).x);
        float c2 = slLine(cv.x * 1.18 - cv.y * 0.14 + w1 * 0.36 - w2 * 0.13 + 0.71, 0.0058)
                 * smoothstep(0.02, 0.38, lkFbm(vec3(sp * vec2(1.4, 0.65), 54.0), 1.0, 0.5, 2, mPx).x);
        float c3 = slLine(xv.x * 1.85 + xv.y * 0.18 + w1 * 0.28 + w2 * 0.16 + 0.44, 0.0065)
                 * smoothstep(0.08, 0.42, lkFbm(vec3(sp * vec2(2.4, 1.4), 56.0), 1.0, 0.5, 2, mPx).x) * lkKeep(0.009, mPx);
        float veinLight = clamp(0.82 * c1 + 0.58 * c2, 0.0, 1.0);
        float veinHair = clamp(c3 * 0.72, 0.0, 1.0);
        // 3. Multi-scale mineral breccia clouds, crystalline calcite grain, and fossil shell flecks
        float cloud = lkFbm(vec3(sp, 41.0), 1.3, 0.55, 4, mPx).x + 0.65 * lkFbm(vec3(sp, 42.0), 6.5, 0.56, 4, mPx).x;
        float cloudMed = lkFbm(vec3(sp * vec2(1.6, 0.75), 47.0), 14.0, 0.56, 3, mPx).x;
        vec4 grain = lkFbm(vec3(sp, 43.0), 160.0, 0.60, 3, mPx);
        float patchF = smoothstep(0.32, 0.68, lkn(vec3(sp * 2.5, 45.0)));
        float fleck = mix(0.018, smoothstep(0.79, 0.86, lkn(vec3(sp * 480.0, 44.0))), lkKeep(0.0035, mPx)) * (0.3 + 0.7 * patchF);
        // each slab has a subtle planar tilt, a crisp chamfered arris bevel at the edge, and recessed 1.5 mm grout joint
        // keep surface heightfield band-limited with lkPx so sun reflections stay silky without single-pixel glints
        float ease = smoothstep(0.0, max(0.005, lkPx * 2.0), ej);
        float cloudSurf = lkFbm(vec3(sp * vec2(1.4, 0.7), 49.0), 6.0, 0.52, 2, lkPx).x;
        float h0 = ((r1 - 0.5) * 0.00032 + (r2 - 0.5) * 0.00058 * (lq.x / sz.x - 0.5) + (r3 - 0.5) * 0.00058 * (lq.y / sz.y - 0.5)) * ease
                 - 0.0012 * grout * (0.0009 / gw) - 0.00082 * arris * (0.0024 / ew)
                 + 0.000045 * cloudSurf - 0.00018 * veinDark + 0.00006 * veinLight;
        ${SLOPE('h0')}
        lkG *= lkFlat(lkWN);
        // Nuvolato mineral drift along the block
        float drift = lkFbm(vec3(rv.x * 2.2, rv.y * 0.38, 42.0), 1.0, 0.55, 5, mPx).x;
        float neb = smoothstep(-0.34, 0.36, 0.66 * drift + 0.34 * cloud);
        vec3 col = mix(${v3([0.315, 0.308, 0.296])}, ${v3([0.535, 0.522, 0.502])}, neb);
        col *= (1.0 + 0.12 * cloudMed + 0.08 * grain.x) * (0.955 + 0.09 * lkH2(vec2(id.x + id.y * 3.0, 2.0)));
        // layer dark graphite stylolite veins, warm-taupe hairline calcite fractures, and crisp ivory-silver calcite veins
        col = mix(col, ${v3([0.135, 0.132, 0.128])}, veinDark * 0.74);
        col = mix(col, ${v3([0.62, 0.605, 0.578])}, veinHair * 0.50);
        col = mix(col, ${v3([0.79, 0.772, 0.740])}, veinLight * 0.68);
        col += ${v3([0.068, 0.066, 0.062])} * fleck;
        // subtle specular-catching arris rim and recessed dark joint
        col *= 1.0 + 0.06 * arris * (1.0 - grout);
        col = mix(col, ${v3([0.145, 0.142, 0.136])}, grout * 0.82);
        diffuseColor.rgb *= col;
        // semi-polished luxury honed satin: glassy over calcite veins, silky across the honed body, matte in the joints
        roughnessFactor = clamp(0.17 + 0.06 * (1.0 - neb) + 0.045 * cloudMed + 0.04 * grain.x + 0.06 * veinDark - 0.06 * veinLight + 0.05 * fleck + 0.62 * grout + 0.15 * arris, 0.11, 0.92);`,
    });
  }

  /* ---------- the kitchen and dining floor: large-format Calacatta Monet / warm Crema Marfil breccia marble slabs ----------
     1.6 by 1.0 m semi-polished marble slabs laid east-west in a 50% ashlar running bond across the 16 by 8 m room.
     Distinct in both pattern and warm champagne-ivory colour from the living room's grey Bardiglio marble, with curl-warped
     breccia mineral ribbons in warm umber-taupe, golden-sienna Calacatta filaments, and crisp pearl-ivory calcite veins. */
  function kitchenSlabs(orig) {
    return code(phys({ envMapIntensity: (orig.envMapIntensity || 0.42) * 1.65, roughness: 0.14, clearcoat: 0.68, clearcoatRoughness: 0.08 }), 'slabKitchen', {
      head: SLAB,
      surface: `
        vec2 q = vDrawW.xz, o = vec2(-21.0, -24.0), sz = vec2(1.6, 1.0);
        if (abs(lkWN.y) < 0.5) q = abs(lkWN.x) > abs(lkWN.z) ? vec2(vDrawW.y - 21.0, vDrawW.z) : vec2(vDrawW.y - 21.0, vDrawW.x);
        float mPx = mix(lkPxM, lkPx, 0.28);
        float row = floor((q.y - o.y) / sz.y);
        vec2 c = vec2((q.x - o.x) / sz.x + 0.5 * mod(row, 2.0), (q.y - o.y) / sz.y);
        vec2 id = floor(c), lq = fract(c) * sz;
        float r1 = lkH2(id + 5.3), r2 = lkH2(id + 11.9), r3 = lkH2(id + 19.7);
        vec2 e2 = min(lq, sz - lq); float ej = min(e2.x, e2.y);
        vec2 pq = max(fwidth(q), vec2(1e-5));
        vec2 gw2 = max(vec2(0.0010), pq * 0.90), ew2 = max(vec2(0.0028), pq * 1.6);
        vec2 g2 = 1.0 - smoothstep(gw2 * 0.55, gw2 * 1.35, e2), a2 = 1.0 - smoothstep(vec2(0.0), ew2, e2);
        float gfar = 1.0 - smoothstep(0.042, 0.095, mPx);
        float grout = max(g2.x, g2.y) * gfar, arris = max(a2.x, a2.y) * gfar;
        float gw = mix(gw2.y, gw2.x, step(e2.x, e2.y)), ew = mix(ew2.y, ew2.x, step(e2.x, e2.y));
        // each slab bookmatched from a warm Calacatta / Fior di Bosco quarry block, oriented along x (east-west)
        float flip = mod(id.x + id.y, 2.0) < 0.5 ? 1.0 : -1.0;
        vec2 sp = vec2(lq.x * flip, lq.y) + vec2(lkH2(vec2(id.y, 7.0)) * 22.0 + r1 * 0.85, lkH2(vec2(id.x, 13.0)) * 16.0 + r2 * 0.65);
        // 2D curl-warped breccia fold field so veins undulate organically across each slab
        vec2 w1 = vec2(lkFbm(vec3(sp * vec2(0.65, 0.95), 61.0), 1.0, 0.55, 3, mPx).x,
                       lkFbm(vec3(sp * vec2(0.65, 0.95), 63.0), 1.0, 0.55, 3, mPx).x);
        vec2 w2 = vec2(lkFbm(vec3(sp * vec2(1.85, 2.55), 65.0), 1.0, 0.55, 3, mPx).x,
                       lkFbm(vec3(sp * vec2(1.85, 2.55), 67.0), 1.0, 0.55, 3, mPx).x);
        float w3 = lkFbm(vec3(sp * 6.2, 69.0), 1.0, 0.55, 2, mPx).x;
        vec2 wp = sp + 0.58 * w1 + 0.24 * w2 + 0.05 * w3;
        vec2 rv = mat2(0.48, 0.88, -0.88, 0.48) * wp;
        vec2 cv = mat2(0.84, -0.54, 0.54, 0.84) * wp;
        // 1. Sweeping Calacatta breccia mineral ribbons & warm espresso-umber stylolite seams
        float bMask1 = smoothstep(-0.32, 0.16, lkFbm(vec3(sp * vec2(0.60, 0.80), 71.0), 1.0, 0.5, 2, mPx).x);
        float bMask2 = smoothstep(-0.26, 0.22, lkFbm(vec3(sp * vec2(1.05, 1.35), 73.0), 1.0, 0.5, 2, mPx).x);
        float vHalo = slLine(rv.x * 0.78 + rv.y * 0.18, 0.052) * bMask1
                    + 0.78 * slLine(cv.x * 1.12 - cv.y * 0.28 + 0.33, 0.038) * bMask2;
        float v1 = slLine(rv.x * 0.78 + rv.y * 0.18 + 0.010 * w3, 0.0115) * bMask1;
        float v2 = slLine(cv.x * 1.12 - cv.y * 0.28 + 0.33, 0.0105) * bMask2;
        float v3 = slLine((wp.x + wp.y * 0.65) * 1.55 + 0.48, 0.0085) * bMask1;
        float veinDark = clamp(0.85 * v1 + 0.68 * v2 + 0.45 * v3, 0.0, 1.0);
        // 2. Warm sienna-gold Calacatta mineral filaments
        float gf1 = slLine(rv.x * 0.78 + rv.y * 0.18 + 0.022 + 0.045 * w2.x, 0.0105) * bMask1;
        float gf2 = slLine(cv.x * 1.48 + cv.y * 0.32 + 0.57, 0.0095)
                  * smoothstep(-0.18, 0.28, lkFbm(vec3(sp * 1.35, 75.0), 1.0, 0.5, 2, mPx).x);
        float veinGold = clamp(0.85 * gf1 + 0.68 * gf2, 0.0, 1.0);
        // 3. Crisp pearl-ivory crystalline calcite veins & conjugate quartz fractures
        float c1 = slLine(rv.x * 0.85 - rv.y * 0.20 + 0.41, 0.0072)
                 * smoothstep(-0.20, 0.26, lkFbm(vec3(sp * 0.85, 77.0), 1.0, 0.5, 2, mPx).x);
        float c2 = slLine(cv.x * 1.35 + cv.y * 0.24 + 0.19, 0.0068)
                 * smoothstep(-0.12, 0.30, lkFbm(vec3(sp * 1.45, 79.0), 1.0, 0.5, 2, mPx).x);
        float c3 = slLine((wp.x - wp.y) * 1.85 + 0.63, 0.0070)
                 * smoothstep(-0.04, 0.34, lkFbm(vec3(sp * 2.3, 81.0), 1.0, 0.5, 2, mPx).x) * lkKeep(0.009, mPx);
        float veinLight = clamp(0.88 * c1 + 0.68 * c2, 0.0, 1.0);
        float veinHair = clamp(c3 * 0.78, 0.0, 1.0);
        // 4. Translucent warm mineral clouds & fine crystalline calcite grain
        float cloud = lkFbm(vec3(wp * 0.9, 83.0), 1.2, 0.55, 4, mPx).x + 0.6 * lkFbm(vec3(sp, 84.0), 5.5, 0.55, 3, mPx).x;
        float cloudMed = lkFbm(vec3(sp * vec2(1.3, 1.7), 85.0), 12.0, 0.55, 3, mPx).x;
        vec4 grain = lkFbm(vec3(sp, 86.0), 155.0, 0.58, 3, mPx);
        float fleck = mix(0.015, smoothstep(0.80, 0.87, lkn(vec3(sp * 440.0, 87.0))), lkKeep(0.0035, mPx));
        float ease = smoothstep(0.0, max(0.005, lkPx * 2.0), ej);
        float cloudSurf = lkFbm(vec3(sp * 1.2, 88.0), 5.5, 0.52, 2, lkPx).x;
        float h0 = ((r1 - 0.5) * 0.00030 + (r2 - 0.5) * 0.00054 * (lq.x / sz.x - 0.5) + (r3 - 0.5) * 0.00054 * (lq.y / sz.y - 0.5)) * ease
                 - 0.0013 * grout * (0.0010 / gw) - 0.00085 * arris * (0.0028 / ew)
                 + 0.000045 * cloudSurf - 0.00018 * veinDark + 0.00007 * veinLight;
        ${SLOPE('h0')}
        lkG *= lkFlat(lkWN);
        float neb = smoothstep(-0.38, 0.38, 0.58 * w1.x + 0.42 * cloud);
        vec3 col = mix(${v3([0.54, 0.475, 0.388])}, ${v3([0.75, 0.680, 0.575])}, neb);
        col *= (1.0 + 0.11 * cloudMed + 0.07 * grain.x) * (0.958 + 0.084 * lkH2(vec2(id.x * 3.0 + id.y, 4.0)));
        col = mix(col, ${v3([0.36, 0.292, 0.222])}, clamp(vHalo, 0.0, 1.0) * 0.62);
        col = mix(col, ${v3([0.56, 0.385, 0.195])}, veinGold * 0.68);
        col = mix(col, ${v3([0.175, 0.132, 0.095])}, veinDark * 0.78);
        col = mix(col, ${v3([0.82, 0.765, 0.675])}, veinHair * 0.55);
        col = mix(col, ${v3([0.92, 0.875, 0.795])}, veinLight * 0.76);
        col += ${v3([0.06, 0.055, 0.045])} * fleck;
        col *= 1.0 + 0.065 * arris * (1.0 - grout);
        col = mix(col, ${v3([0.22, 0.185, 0.148])}, grout * 0.84);
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.14 + 0.05 * (1.0 - neb) + 0.038 * cloudMed + 0.03 * grain.x + 0.06 * veinDark - 0.06 * veinLight + 0.04 * fleck + 0.65 * grout + 0.16 * arris, 0.09, 0.92);`,
    });
  }

  /* dry stone: the garden's walls and the boulders by the door. Limestone laid without mortar: irregular stones, wider than
     tall, each its own shade from grey to ochre, domed, with deep dark gaps between, pitted and with lichen. A solid
     pattern in the world (3D cells), so a boulder has no seam and a wall's face and top agree */
  const DRY = `
    vec3 dsA;
    vec3 dsH33(vec3 p) { return vec3(lkH(p), lkH(p + 17.17), lkH(p + 41.41)); }
    vec4 dsVoro(vec3 x) { vec3 i = floor(x), f = fract(x); float d1 = 9.0, d2 = 9.0; vec3 id = vec3(0.0);
      for (int k = -1; k <= 1; k++) for (int j = -1; j <= 1; j++) for (int m = -1; m <= 1; m++) {
        vec3 g = vec3(float(m), float(j), float(k)), r = g + dsH33(i + g) * 0.8 - f; float d = dot(r, r);
        if (d < d1) { d2 = d1; d1 = d; id = i + g; } else if (d < d2) d2 = d; }
      return vec4(sqrt(d1), sqrt(d2), lkH(id), lkH(id + 3.3)); }`;
  function drystone(orig, base) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.9 }), 'drystone', {
      head: DRY,
      drawable: { macro: 0.3 },
      surface: `
        vec3 sp = vDrawW * vec3(2.4, 3.6, 2.4) + 0.25 * vec3(lkn(vDrawW * 3.0), lkn(vDrawW * 3.0 + 4.0), lkn(vDrawW * 3.0 + 8.0));
        vec4 v = dsVoro(sp);
        float e = v.y - v.x;
        float k1 = lkKeep(0.02, lkPx), k2 = lkKeep(0.004, lkPx);
        float gap = (1.0 - smoothstep(0.02, 0.1 + lkPx * 6.0, e)) * k1;
        float dome = clamp(e, 0.0, 0.5);
        vec4 rough = lkFbm(vDrawW * vec3(1.0), 40.0, 0.6, 5, lkPx);
        float pit = smoothstep(0.8, 0.88, lkn(vDrawW * 140.0)) * k2;
        float lichen = smoothstep(0.68, 0.8, lkn(vDrawW * 5.0 + 2.0)) * (1.0 - gap) * smoothstep(0.6, 1.0, lkn(vDrawW * 40.0));
        float h = 0.012 * dome * k1 - 0.02 * gap + 0.0012 * rough.x - 0.0008 * pit;
        ${SLOPE('h')}
        vec3 col = ${v3(base)} * mix(${v3([0.82, 0.86, 0.95])}, ${v3([1.15, 1.08, 0.95])}, v.z) * (0.8 + 0.4 * v.w);
        col *= (1.0 + 0.35 * rough.x) * (1.0 - 0.4 * pit);
        col = mix(col, col * 0.18, gap);
        col = mix(col, ${v3([0.2, 0.21, 0.16])}, lichen * 0.5);
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.86 + 0.08 * rough.x + 0.1 * gap, 0.6, 1.0);`,
    });
  }

  /* gravel: round and broken stones of one to two and a half centimetres, each its own shade, domed, with shadow between
     them. Far off, where a stone is under two pixels, its average and a faint speckle (the forecourt is seen from a
     kilometre up at the start, and must not shimmer). sat: how coloured the stones are (the forecourt's are grey) */
  const GRAV = `
    vec4 gvCells(vec2 q) { vec2 c0 = floor(q), f0 = fract(q); float d1 = 8.0, d2 = 8.0; vec2 id = vec2(0.0);
      for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 g = vec2(float(i), float(j)), r = g + lkH22(c0 + g) * 0.9 - f0; float d = dot(r, r);
        if (d < d1) { d2 = d1; d1 = d; id = c0 + g; } else if (d < d2) d2 = d; }
      return vec4(sqrt(d1), sqrt(d2), lkH2(id), lkH2(id + 7.7)); }`;
  function gravel(orig, key, base, sat) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.85 }), key, {
      head: GRAV,
      drawable: { farFlat: true, macro: 0.3, side: THREE.FrontSide },
      surface: `
        vec2 g = vDrawW.xz * 60.0;
        float k = lkKeep(0.025, lkPx), k2 = lkKeep(0.006, lkPx);
        vec4 c = k > 0.001 ? gvCells(g) : vec4(0.3, 0.6, 0.5, 0.5);
        float e = c.y - c.x;
        float shadow = (1.0 - smoothstep(0.0, 0.18 + lkPx * 40.0, e)) * k;
        float dome = clamp(e * 2.0, 0.0, 1.0);
        float grain = (lkn(vec3(vDrawW.xz * 400.0, 3.0)) - 0.5) * k2;
        float h = (0.004 * dome - 0.003 * shadow) * k + 0.0002 * grain;
        ${SLOPE('h')}
        float tone = mix(0.5, c.z, k), hue = mix(0.5, c.w, k);
        vec3 stone = ${v3(base)} * (0.62 + 0.76 * tone) * mix(vec3(1.0), mix(${v3([0.9, 0.95, 1.06])}, ${v3([1.1, 1.0, 0.86])}, hue), ${f(sat)});
        stone *= 1.0 + 0.3 * grain;
        stone = mix(stone, stone * 0.35, shadow);
        stone *= 1.0 + 0.05 * (lkn(vec3(vDrawW.xz * 0.8, 9.0)) - 0.5);       // the far speckle's cloud
        diffuseColor.rgb *= stone / 0.9;
        roughnessFactor = clamp(0.8 - 0.15 * dome * k + 0.15 * shadow, 0.4, 1.0);`,
    });
  }

  /* wool in a herringbone twill: the bedroom's throws and rugs, the headboard, and the dressing room's tailored suits,
     blazers, overcoats, and pleated trousers. Multi-scale herringbone columns (15 mm) with diagonal twill ribs (3.8 mm),
     two-tone heathered worsted yarns, vertical drape slubbing, and a soft grazing sheen. */
  const HERRING = `
    vec4 hbA;
    float hbH(vec2 q, float px, float seed, out vec4 a) {
      float wPx = px;
      float H = 0.015, col = floor(q.x / H), dir = mod(col, 2.0) < 0.5 ? 1.0 : -1.0;
      float k1 = lkKeep(0.0038, wPx), k2 = lkKeep(0.014, wPx);
      float d = (q.y + dir * (q.x - col * H)) / 0.0038;
      float rib = mix(0.5, 0.5 + 0.5 * sin(6.2832 * d), k1);
      float colShade = mix(0.5, 0.5 + 0.5 * dir * k2, 0.45);
      float seam = mix(0.0, 1.0 - smoothstep(0.0, max(0.0012, wPx * 0.9), min(fract(q.x / H), 1.0 - fract(q.x / H)) * H), k2);
      float yarn = mix(0.5, lkn(vec3(q * vec2(220.0, 220.0), seed)), lkKeep(0.0022, wPx));
      float slub = (lkn(vec3(q.x * 95.0, q.y * 12.0, seed + 4.0)) - 0.5) * lkKeep(0.006, wPx);
      float fuzz = lkFbm(vec3(q, seed + 2.0), 28.0, 0.6, 4, wPx).x;
      a = vec4(rib * 0.72 + colShade * 0.28, seam, yarn, fuzz + 0.6 * slub);
      return 0.00065 * (rib - 0.5) + 0.00028 * (colShade - 0.5) - 0.00035 * seam + 0.00032 * fuzz + 0.00022 * slub + 0.00012 * (yarn - 0.5);
    }`;
  function woolWeave(orig, key, base) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.88, sheen: 1, sheenRoughness: 0.44, sheenColor: new THREE.Color().setRGB(base[0] * 0.68 + 0.02, base[1] * 0.68 + 0.02, base[2] * 0.70 + 0.02) }), key, {
      head: HERRING + SEAM,
      scale: 2.0 / 0.003,
      surface: `
        vec2 q; vec3 ta, tb; lkPlane(lkP, lkWN, q, ta, tb);
        float h0 = hbH(q, mix(lkPxM, lkPx, 0.20), ${f((key.length * 3.7) % 9)}, hbA);
        ${SLOPE('h0')}
        vec3 col = ${v3(base)} * (0.84 + 0.32 * hbA.x) * (1.0 - 0.16 * hbA.y) * mix(${v3([0.91, 0.91, 0.93])}, ${v3([1.09, 1.08, 1.06])}, hbA.z) * (1.0 + 0.12 * hbA.w);
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.88 - 0.08 * hbA.x + 0.04 * hbA.y, 0.72, 0.96);
        ${CLOTH_SEAM(0.0028)}`,
    });
  }

  /* solid oak outside: the fins beside the door (grain up) and the bench under the canopy (grain along the seat). The
     pivot door's oak, its texture and colour (OAKTEX, OAKPAINT), on pieces that have no boards to join */
  function oakSolid(orig, key, axis, base) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.5 }), key, {
      head: OAK + OAKFIG,
      surface: `
        vec3 w = vDrawW;
        ${axis === 'y' ? 'vec2 fq = vec2(w.y + 50.0, fract(w.x / 0.2) * 0.2 - 0.03); float fseed = floor(w.x / 0.2) + 31.0, fRift = 0.6;'
                       : 'vec2 fq = vec2(w.x + 50.0, (fract(w.z / 0.5) - 0.5) * 0.5); float fseed = 47.0, fRift = 0.2;'}
        vec4 oakA = vec4(1.0, 0.0, 0.0, 0.0), oakB = vec4(0.5, 0.0, 0.0, 0.0);
        ${OAKTEX}
        float h0 = 0.00008 * fib - 0.00006 * pores * pk;
        ${SLOPE('h0')}
        lkG *= lkFlat(lkWN);
        ${OAKPAINT(base)}
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.5 + 0.16 * pores, 0.25, 1.0);`,
    });
  }

  /* ======================================================================================
     THE FRONT OF THE HOUSE, iteration 8 (Sam's notes of 15 Oct, brief-phase-4.md)
     ====================================================================================== */

  // The forecourt lies half in the shadow of the canopy and the garage. There the sky alone lit the ground, and the grey
  // gravel and the pale stone went navy beside the sunlit warm side, so the two sides of the path read as two materials
  // (Sam: "maybe it's the lighting, but make sure that the left and right are similar"). In the shade their light is taken
  // most of the way to grey and lifted a little, as the sunlit house and path would bounce some of theirs into it.
  const SHADE_FILL = `
    { vec3 ind = reflectedLight.indirectDiffuse; float il = dot(ind, vec3(0.2126, 0.7152, 0.0722));
      reflectedLight.indirectDiffuse = mix(ind, vec3(il) * vec3(1.03, 1.0, 0.95), 0.65) * 1.25; }`;

  /* the fins beside the door: a straight grained hardwood, quarter sawn, oiled. They wore the pivot door's oak until
     iteration 8, its figure laid by world x alone, so on a fin's sides, where x does not change, the figure ran across
     them as dark bars (Sam: "the texture on the side feels a little bit too much... try to make a premium wood texture").
     Now the grain wraps round each fin (across its face, then round its sides) and runs straight up it: close growth
     lines, long soft streaks, pores as hairlines, each fin a shade of its own. The fins' places: window.LINTEL_FINS. */
  function finWood(orig, key, base) {
    const F = window.LINTEL_FINS || { x0: 11.2, pitch: 0.19167, w: 0.06, y0: 26.2 };
    const X0 = F.x0 - 30, Z0 = F.y0 - 24;
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.46, clearcoat: 0.12, clearcoatRoughness: 0.38 }), key, {
      surface: `
        vec3 w = vDrawW;
        float fi = floor((w.x - ${f(X0)} + 0.07) / ${f(F.pitch)});
        float lx = clamp(w.x - (${f(X0)} + fi * ${f(F.pitch)}), 0.0, ${f(F.w)});
        float ac = lx + (w.z - ${f(Z0)}), al = w.y;                          // across the grain round the fin, and up it (metres)
        float sd = fi * 7.31 + 3.0, r1 = lkH2(vec2(sd, 1.0)), r2 = lkH2(vec2(sd, 2.0));
        float px = max(fwidth(ac) * 0.55, 1e-5);
        // quarter-sawn and rift-sawn growth lines: 4.5 to 7.8 mm apart so they stay crisp from the door stop, plus fine sub-rings close up
        float wan = 0.0042 * (lkn(vec3(al * 0.65, sd, 1.0)) - 0.5) + 0.0016 * (lkn(vec3(al * 2.2, sd, 2.0)) - 0.5);
        float gl = (ac + wan) / (0.0045 + 0.0032 * r1);
        gl += 0.9 * (lkn(vec3(gl * 0.42, al * 0.55 + sd, 3.0)) - 0.5);
        float gk = 1.0 - smoothstep(0.32, 0.85, fwidth(gl));
        float line = mix(0.24, (1.0 - smoothstep(0.0, 0.30, fract(gl))) * (0.45 + 0.55 * lkH2(vec2(floor(gl), sd))), gk);
        float glFine = (ac + wan * 0.6) / 0.0022;
        float gkF = 1.0 - smoothstep(0.25, 0.65, fwidth(glFine));
        float lineFine = mix(0.18, (1.0 - smoothstep(0.0, 0.25, fract(glFine))), gkF);
        // coarse and fine timber fibre, open vessel pore dashes visible from the door, medullary ray flecks, and dark mineral streaks
        float fibCoarse = (lkn(vec3(ac * 95.0, al * 2.2, sd + 1.0)) - 0.5) * lkKeep(0.011, px);
        float fibFine = (lkn(vec3(ac * 380.0, al * 6.5, sd)) - 0.5) * lkKeep(0.0032, px);
        float streak = lkn(vec3(ac * 32.0 + wan * 10.0, al * 0.55, sd + 2.0));
        float band = lkn(vec3(ac * 14.0, al * 0.22, sd + 9.0)) - 0.5;
        float pore = smoothstep(0.65, 0.84, lkn(vec3(ac * 185.0, al * 16.0, sd + 4.0))) * lkKeep(0.0075, px)
                   + 0.75 * smoothstep(0.74, 0.89, lkn(vec3(ac * 640.0, al * 34.0, sd + 5.0))) * lkKeep(0.0022, px);
        float ray = smoothstep(0.72, 0.88, lkn(vec3(ac * 42.0, al * 11.0, sd + 8.0))) * lkKeep(0.008, px);
        float mineral = smoothstep(0.65, 0.82, lkn(vec3(ac * 76.0 + wan * 14.0, al * 0.85, sd + 6.0))) * lkKeep(0.0085, px);
        float arris = exp(-pow((lx - ${f(F.w)}) / 0.0045, 2.0)) + exp(-pow(lx / 0.0045, 2.0));
        float h0 = 0.00058 * fibCoarse + 0.00028 * fibFine - 0.00048 * pore - 0.00042 * line - 0.00020 * lineFine - 0.00024 * mineral;
        ${SLOPE('h0')}
        lkG *= lkFlat(lkWN);
        vec3 col = ${v3(base)} * (0.86 + 0.28 * r2) * mix(vec3(0.95, 0.92, 0.87), ${v3([1.07, 1.01, 0.93])}, r1 * 0.7 + 0.3 * band);
        col *= (1.0 - 0.32 * line - 0.14 * lineFine) * (1.0 + 0.42 * fibCoarse + 0.30 * fibFine) * (0.76 + 0.46 * streak);
        col *= (1.0 - 0.52 * pore) * (1.0 - 0.34 * mineral) * (1.0 + 0.14 * ray) * (1.0 + 0.06 * arris);
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.46 + 0.10 * fibCoarse + 0.16 * pore + 0.08 * line - 0.06 * streak - 0.04 * ray, 0.28, 0.82);`,
    });
  }

  /* the path's stone: a Jura limestone, honed. (Sam, 15 Oct: "enhance the middle path and make the texture more premium".
     The vein-cut travertine before it ran its strata down the path in long streaks, and from the door they read as
     boards.) A calm warm beige in soft clouds with grey-blue patches, full of small fossils: shell fragments, a few larger
     curls, dark and pale specks. Each slab its own shade, the bands across the gravel too. */
  const JURA = `
    // one shell per cell (some cells have none): part of a ring, its rim darker, a little paler inside. q in cells, pxc the
    // pixel in cells. The ring stays inside its cell, so one cell is enough.
    float juShell(vec2 q, float seed, float pxc, float dens, out float fill) {
      vec2 c = floor(q), fq = fract(q) - 0.5, r = lkH22(c + seed);
      fill = 0.0;
      if (lkH2(c + seed + 5.1) > dens) return 0.0;
      vec2 d = fq - (r - 0.5) * 0.3;
      float R = 0.12 + 0.18 * lkH2(c + seed + 2.3), rad = length(d);
      float ang = atan(d.y, d.x) - r.x * 6.2832; ang = abs(mod(ang + 3.14159, 6.28318) - 3.14159);
      float arc = 1.0 - smoothstep(0.5 + 1.6 * r.y, 0.8 + 1.6 * r.y, ang);
      float wd = 0.07 * R + pxc;
      fill = (1.0 - smoothstep(R - wd, R, rad)) * arc;
      return (1.0 - smoothstep(wd * 0.5, wd, abs(rad - R))) * arc;
    }`;
  function juraPath(orig) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.52 }), 'jura', {
      head: JURA,
      surface: `
        vec3 p = vDrawW; vec2 q = p.xz;
        float pPx = mix(lkPxM, lkPx, 0.35);
        float xp = p.x + 30.0, yp = p.z + 24.0;
        // the path's slabs are 2 m along it, the bands across the gravel one stone each
        float slab = (xp > 13.45 && xp < 16.55 && yp < 42.0) ? floor((yp - 26.0) / 2.0) : 20.0 + floor((yp - 32.7) / 2.6) + (xp > 15.0 ? 7.0 : 0.0);
        float r1 = lkH2(vec2(slab, 1.0)), r2 = lkH2(vec2(slab, 2.0));
        vec3 lp = p + vec3(slab * 3.7, 0.0, slab * 1.3);                     // each slab from another part of the block
        vec4 cl = lkFbm(lp, 0.9, 0.55, 3, pPx), cm = lkFbm(lp + 4.0, 5.2, 0.58, 4, pPx);
        vec4 mid = lkFbm(lp + 2.0, 15.0, 0.60, 4, pPx);
        float blue = smoothstep(0.06, 0.30, cl.x + 0.5 * cm.x + 0.22 * (r2 - 0.5));
        vec3 stone = mix(${v3([0.445, 0.392, 0.314])}, ${v3([0.362, 0.358, 0.338])}, blue * 0.72);
        vec4 cb = lkFbm(lp + 7.0, 2.3, 0.54, 3, pPx);
        stone *= (0.9 + 0.2 * r1) * (1.0 + 0.38 * cm.x) * (1.0 + 0.36 * cl.x) * (1.0 + 0.32 * cb.x) * (1.0 + 0.28 * mid.x);
        // sedimentary mineral veins: primary warm-umber/calcite seam and secondary fine crystalline vein
        vec2 vq = mat2(0.84, -0.54, 0.54, 0.84) * (q + vec2(slab * 1.9, slab * 0.7)) + 0.32 * vec2(cl.x, cm.x);
        float vn1 = abs(lkn(vec3(vq * vec2(1.25, 2.9), slab + 2.0)) - 0.5);
        float vw1 = max(0.012, fwidth(vn1) * 1.5);
        float vein1 = (1.0 - smoothstep(vw1 * 0.35, vw1 * 1.4, vn1)) * (0.012 / vw1) * smoothstep(0.35, 0.7, lkn(vec3(q * 1.4, slab + 5.0)));
        float vn2 = abs(lkn(vec3(vq * vec2(3.2, 7.4) + 4.0, slab + 7.0)) - 0.5);
        float vw2 = max(0.016, fwidth(vn2) * 1.5);
        float vein2 = (1.0 - smoothstep(vw2 * 0.35, vw2 * 1.4, vn2)) * (0.016 / vw2) * smoothstep(0.4, 0.75, lkn(vec3(q * 2.8, slab + 9.0)));
        // fossils and mineral clasts: subtle embedded shell fragments, crystalline calcite specks, and iron-oxide flecks
        float f1, f2, k1 = lkKeep(0.014, pPx), k2 = lkKeep(0.0055, pPx), k3 = lkKeep(0.0028, pPx);
        float sh1 = juShell(q * 14.0 + slab * 3.1, 1.0 + slab, pPx * 14.0, 0.14, f1) * k1;
        float sh2 = juShell(q * 42.0 + slab * 1.7, 9.0 + slab, pPx * 42.0, 0.11, f2) * k2;
        vec2 qr = mat2(0.8, -0.6, 0.6, 0.8) * q;
        float frag = smoothstep(0.76, 0.88, lkn(vec3(qr * vec2(85.0, 24.0), slab + 12.0))) * k1;
        float fragP = smoothstep(0.78, 0.90, lkn(vec3(q * vec2(26.0, 95.0), slab + 15.0))) * k1;
        float dark = smoothstep(0.77, 0.89, lkn(vec3(q * 165.0, slab))) * k2, pale = smoothstep(0.80, 0.92, lkn(vec3(q * 125.0, slab + 3.0))) * k2;
        stone = mix(stone, stone * ${v3([1.12, 1.09, 1.04])}, (f1 * k1 + f2 * k2) * 0.26 + vein2 * 0.32);
        stone = mix(stone, stone * ${v3([0.68, 0.61, 0.52])}, max(sh1, sh2) * 0.24 + vein1 * 0.38);
        stone *= (1.0 - 0.32 * dark) * (1.0 + 0.20 * pale) * (1.0 - 0.18 * frag) * (1.0 + 0.15 * fragP);
        // subtle slab-edge border dressing along the 2 m joints and path edges
        float jf = fract((yp - 26.0) / 2.0);
        float edgeD = min(min(jf, 1.0 - jf) * 2.0, min(abs(xp - 13.5), abs(xp - 16.5)));
        float border = exp(-max(0.0, edgeD) / 0.045) * step(13.45, xp) * step(xp, 16.55) * step(yp, 42.0);
        stone *= 1.0 - 0.065 * border;
        // honed mineral relief and two scales of natural travertine/limestone pits
        float pitCoarse = smoothstep(0.76, 0.89, lkn(vec3(q * vec2(58.0, 95.0), slab + 8.0))) * lkKeep(0.011, pPx);
        float pitFine = smoothstep(0.80, 0.91, lkn(vec3(q * 220.0, slab + 6.0))) * k3;
        float pit = clamp(pitCoarse + 0.8 * pitFine, 0.0, 1.0);
        vec4 rf = lkFbm(lp + 9.0, 52.0, 0.62, 4, pPx);
        float h = 0.00064 * mid.x + 0.00038 * rf.x - 0.0016 * pitCoarse - 0.0007 * pitFine - 0.00042 * vein1 - 0.00014 * max(sh1, sh2);
        ${SLOPE('h')}
        lkG *= lkFlat(lkWN);
        stone *= 1.0 - 0.36 * pit;
        diffuseColor.rgb *= stone;
        roughnessFactor = clamp(0.48 + 0.14 * mid.x + 0.12 * rf.x + 0.24 * pit - 0.06 * vein2, 0.30, 0.90);`,
      end: SHADE_FILL,
    });
  }

  /* the forecourt's gravel: crushed angular stone across three scales (coarse 3.5 cm, medium 2 cm, and fine 1 cm chippings),
     using a slant-tolerant pixel size so the stone beds on the left and right stay crisp all the way to the front wall. */
  function courtGravel(orig, key, base) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.86 }), key, {
      head: GRAV,
      drawable: { farFlat: true, macro: 0.3, side: THREE.FrontSide },
      surface: `
        float gPx = mix(lkPxM, lkPx, 0.32);
        float k0 = lkKeep(0.044, gPx), k = lkKeep(0.024, gPx), k2 = lkKeep(0.010, gPx), k3 = lkKeep(0.0032, gPx);
        vec4 c0 = k0 > 0.001 ? gvCells(vDrawW.xz * 25.0 + 7.0) : vec4(0.3, 0.6, 0.5, 0.5);
        vec4 c = k > 0.001 ? gvCells(vDrawW.xz * 46.0) : vec4(0.3, 0.6, 0.5, 0.5);
        vec4 s = k2 > 0.001 ? gvCells(vDrawW.xz * 106.0 + 17.0) : vec4(0.3, 0.6, 0.5, 0.5);
        float e0 = c0.y - c0.x, e = c.y - c.x, es = s.y - s.x;
        float gap0 = (1.0 - smoothstep(0.0, 0.15 + gPx * 16.0, e0)) * k0;
        float gap = (1.0 - smoothstep(0.0, 0.16 + gPx * 24.0, e)) * k;
        float dome0 = clamp(e0 * 2.2, 0.0, 1.0) * k0;
        float dome = clamp(e * 2.3, 0.0, 1.0), domeS = clamp(es * 2.2, 0.0, 1.0) * k2;
        float facet = (lkn(vec3(vDrawW.xz * 78.0 + c.zw * 5.0, 2.0)) - 0.5) * k;
        float grit = (lkn(vec3(vDrawW.xz * 380.0, 3.0)) - 0.5) * k3;
        float h = (0.0072 * dome - 0.0052 * gap + 0.0016 * facet) * k + (0.0052 * dome0 - 0.0038 * gap0) * (1.0 - 0.45 * k) + 0.0022 * domeS * gap + 0.00032 * grit;
        ${SLOPE('h')}
        float t = mix(mix(0.5, c0.z, k0), c.z, k), hu = mix(mix(0.5, c0.w, k0), c.w, k);
        float lum = 0.66 + 0.68 * t + 0.16 * facet;
        lum = mix(lum, 1.92, step(0.865, t) * max(k, k0 * 0.7));
        lum = mix(lum, 0.34, step(t, 0.095) * max(k, k0 * 0.7));
        vec3 stone = ${v3(base)} * lum * mix(${v3([0.92, 0.97, 1.06])}, ${v3([1.08, 1.0, 0.90])}, hu);
        vec3 coarseCol = ${v3(base)} * (0.68 + 0.64 * mix(0.5, c0.z, k0)) * (0.82 + 0.24 * dome0);
        stone = mix(coarseCol, stone, 0.35 + 0.65 * k);
        vec3 small = ${v3(base)} * (0.58 + 0.64 * mix(0.5, s.z, k2)) * (0.72 + 0.28 * domeS);
        stone = mix(stone, small, gap * 0.72);
        stone *= (1.0 - 0.46 * gap * (1.0 - 0.55 * domeS)) * (1.0 - 0.28 * gap0 * (1.0 - 0.6 * k)) * (1.0 + 0.28 * grit);
        stone *= 1.0 + 0.08 * (lkn(vec3(vDrawW.xz * 1.4, 9.0)) - 0.5);
        diffuseColor.rgb *= stone / 0.9;
        roughnessFactor = clamp(0.80 - 0.20 * dome * k - 0.10 * dome0 + 0.16 * gap, 0.42, 0.98);`,
      end: SHADE_FILL,
    });
  }

  /* the boulders in the gravel and olive bed: weathered stratified fieldstone boulders with mineral veins, natural cleavage
     relief, fine crystalline grain, weathered pits, and dark earth grounding at the foot. */
  function rock(orig, base) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.84 }), 'rock', {
      drawable: { macro: 0.3 },
      scale: 2.2 / 0.003,
      surface: `
        vec3 p = vDrawW;
        float rPx = mix(lkPxM, lkPx, 0.25);
        vec4 big = lkFbm(p, 3.8, 0.58, 4, rPx), mid = lkFbm(p + 5.0, 18.0, 0.58, 4, rPx), fine = lkFbm(p + 9.0, 92.0, 0.62, 4, rPx);
        vec4 strata = lkFbm(p * vec3(1.4, 5.2, 1.4) + 2.0, 5.5, 0.58, 4, rPx);
        float grit = (lkn(p * 240.0) - 0.5) * lkKeep(0.0028, rPx);
        float pit = smoothstep(0.74, 0.88, lkn(p * 78.0)) * lkKeep(0.006, rPx) + 0.65 * smoothstep(0.76, 0.89, lkn(p * 175.0 + 4.0)) * lkKeep(0.0028, rPx);
        float fz = lkn(p * vec3(4.8, 2.2, 4.8) + 3.0);
        float fis = (1.0 - smoothstep(0.0, 0.012 + rPx * 3.0, abs(fz - 0.5))) * smoothstep(0.48, 0.74, lkn(p * 2.5 + 7.0)) * lkKeep(0.012, rPx);
        float qv = abs(lkn(p * vec3(3.6, 1.8, 3.6) + 11.0) - 0.5);
        float qVein = (1.0 - smoothstep(0.003, 0.011 + rPx * 2.5, qv)) * smoothstep(0.46, 0.74, lkn(p * 3.0 + 1.0)) * lkKeep(0.01, rPx);
        float up = clamp(lkWN.y, 0.0, 1.0);
        float inOliveBed = step(length(p.xz - vec2(0.0, -6.0)), 2.0);
        float bedY = inOliveBed > 0.5 ? 0.37 : 0.02;
        float foot = 1.0 - smoothstep(bedY, bedY + 0.12, p.y);
        // Karst crags & cushions of green moss tucked into the shady lower crevices and fractures of the olive bed boulders
        float crag = inOliveBed * smoothstep(0.56, 0.82, lkn(p * 15.0 + 1.7)) * lkKeep(0.008, rPx);
        float mossPatch = inOliveBed * smoothstep(0.56, 0.78, lkn(p * 12.0 + 3.2)) * clamp(foot * 0.85 + crag * 0.75 + smoothstep(0.48, 0.85, up) * 0.35, 0.0, 1.0);
        float h = 0.0110 * big.x + 0.0042 * mid.x + 0.0030 * strata.x + 0.00060 * fine.x + 0.00024 * grit - 0.0026 * pit - 0.0034 * fis - 0.0048 * crag + 0.0014 * mossPatch + 0.0004 * qVein;
        ${SLOPE('h')}
        vec3 col = ${v3(base)} * mix(1.0, 0.62, inOliveBed) * (0.76 + 0.46 * big.x + 0.52 * mid.x + 0.38 * strata.x) * (1.0 + 0.38 * fine.x + 0.24 * grit);
        col = mix(col, col * ${v3([1.12, 0.98, 0.80])}, smoothstep(0.12, 0.42, lkn(p * 2.2 + 2.0)) * 0.45);
        col = mix(col, col * ${v3([1.22, 1.18, 1.10])}, qVein * 0.52);
        col *= mix(0.58, 1.06, up) * (1.0 - 0.52 * foot);
        col *= (1.0 - 0.52 * pit) * (1.0 - 0.62 * fis) * (1.0 - 0.68 * crag);
        vec3 mossCol = mix(${v3([0.036, 0.074, 0.022])}, ${v3([0.072, 0.124, 0.038])}, lkn(p * 28.0));
        col = mix(col, mossCol, mossPatch * 0.78);
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.78 + 0.12 * fine.x + 0.14 * pit + 0.14 * mossPatch - 0.08 * qVein, 0.56, 0.96);`,
    });
  }

  /* the forecourt's basalt bench and the patio olive's circular basalt curb ring: dark volcanic basalt with 16 radial
     masoned curb segments on the patio ring, recessed radial mortar joints, chamfered coping arrises, three scales of
     open volcanic vesicles (gas pores), crystalline mineral flecks, and bush-hammered / saw-cut vertical cleft relief. */
  function basalt(orig) {
    return code(phys({ envMapIntensity: 0.66, roughness: 0.45, clearcoat: 0.10, clearcoatRoughness: 0.40 }), 'basalt', {
      surface: `
        vec3 p = vDrawW;
        float bPx = mix(lkPxM, lkPx, 0.28);
        float topFace = smoothstep(0.5, 0.85, abs(lkWN.y));
        float topLip = smoothstep(0.415, 0.436, p.y);
        float honed = clamp(topFace + 0.65 * topLip, 0.0, 1.0);
        // Patio olive circular basalt curb ring at plan (30, 18) -> world (0, -6), r = 1.95..2.50 m
        vec2 dq = p.xz - vec2(0.0, -6.0);
        float rRing = length(dq);
        float isRing = step(1.88, rRing) * step(rRing, 2.58) * step(p.y, 0.52);
        float ang = atan(dq.y, dq.x);
        float seg = (ang * 0.15915494 + 0.5) * 16.0, segId = floor(seg);
        float arcDist = abs(fract(seg) - 0.5) * (rRing * 6.2831853 / 16.0);
        float jw = max(0.0022, bPx * 1.1), aw = max(0.0055, bPx * 2.0);
        float rJoint = isRing * (1.0 - smoothstep(jw * 0.55, jw * 1.4, arcDist));
        float rArris = isRing * (1.0 - smoothstep(0.0, aw, arcDist));
        float ringEdgeDist = min(abs(rRing - 1.95), abs(rRing - 2.50));
        float ringChamfer = isRing * (1.0 - smoothstep(0.0, 0.016, ringEdgeDist)) * topFace;
        float segTone = isRing * (lkH2(vec2(segId, 7.3)) - 0.5) * 0.18;
        vec3 sp = p + vec3(isRing * segId * 1.37, 0.0, isRing * segId * 2.19);
        vec4 cloud = lkFbm(sp, 1.8, 0.55, 4, bPx);
        vec4 mid = lkFbm(sp + 3.7, 16.0, 0.60, 4, bPx);
        vec4 fine = lkFbm(sp + 8.3, 68.0, 0.62, 4, bPx);
        vec4 cleft = lkFbm(sp * vec3(1.4, 2.3, 1.4) + 5.1, 30.0, 0.64, 4, bPx);
        // Three scales of volcanic basalt vesicles (coarse 11 mm, medium 5.5 mm, and fine 2.5 mm gas cavities)
        float vCoarse = lkn(sp * 34.0 + 1.3), vMed = lkn(sp * 68.0 + 2.0), vFine = lkn(sp * 135.0);
        float ves1 = smoothstep(0.75, 0.88, vCoarse) * lkKeep(0.011, bPx);
        float ves2 = smoothstep(0.74, 0.88, vMed) * lkKeep(0.0055, bPx);
        float ves3 = smoothstep(0.75, 0.89, vFine) * lkKeep(0.0028, bPx);
        float ves = clamp(0.95 * ves1 + 0.85 * ves2 + 0.70 * ves3, 0.0, 1.0);
        float vesRim = clamp((smoothstep(0.67, 0.75, vCoarse) - ves1) * lkKeep(0.011, bPx) + (smoothstep(0.67, 0.74, vMed) - ves2) * lkKeep(0.0055, bPx), 0.0, 1.0);
        // Crystalline plagioclase & olivine mineral phenocryst flecks
        float cryst = (lkn(sp * 78.0 + 6.0) - 0.5) * lkKeep(0.006, bPx) + 0.65 * (lkn(sp * 190.0 + 9.0) - 0.5) * lkKeep(0.0028, bPx);
        float speck = smoothstep(0.81, 0.91, lkn(sp * 145.0 + 12.0)) * lkKeep(0.0038, bPx);
        // Delicate diagonal quartz/calcite hairline vein
        vec3 vp = sp + 0.14 * vec3(cloud.x, mid.x, cloud.y);
        float vn = abs(lkn(vec3(vp.x * 1.6 + vp.z * 0.9, vp.y * 1.8, vp.z * 1.4 - vp.x * 0.7)) - 0.5);
        float vw = max(0.006, fwidth(vn) * 1.35);
        float vein = (1.0 - smoothstep(vw * 0.25, vw * 1.2, vn)) * (0.006 / vw) * smoothstep(0.52, 0.80, lkn(sp * 2.4 + 4.0));
        float h = 0.00048 * mid.x + 0.00030 * fine.x + 0.00095 * cleft.x * (1.0 - 0.68 * honed)
                - 0.0026 * ves1 - 0.0018 * ves2 - 0.0010 * ves3 + 0.00022 * cryst + 0.00016 * vein
                - 0.0016 * rJoint - 0.0009 * rArris - 0.0008 * ringChamfer;
        ${SLOPE('h')}
        lkG *= lkFlat(lkWN);
        vec3 baseCol = mix(${v3([0.044, 0.046, 0.050])}, ${v3([0.058, 0.060, 0.065])}, honed) * (1.0 + segTone);
        vec3 col = baseCol * (0.84 + 0.36 * cloud.x) * (1.0 + 0.28 * mid.x) * (1.0 + 0.26 * fine.x + 0.30 * cleft.x * (1.0 - 0.62 * honed));
        col *= (1.0 + 0.24 * cryst + 0.10 * vesRim + 0.08 * (rArris + ringChamfer) * (1.0 - rJoint)) * (1.0 - 0.66 * ves);
        col = mix(col, ${v3([0.115, 0.118, 0.122])}, vein * 0.32 + speck * 0.22);
        col = mix(col, ${v3([0.022, 0.022, 0.024])}, rJoint * 0.85);
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(mix(0.64, 0.40, honed) + 0.12 * mid.x + 0.14 * cleft.x * (1.0 - honed) + 0.28 * ves - 0.05 * vein + 0.35 * rJoint, 0.26, 0.92);`,
    });
  }

  /* the house number '14' beside the door: 3.5 cm thick architectural stainless / titanium steel numerals with horizontal
     hairline brushing, directional anisotropic metallic sheen, bevel edge glint, and darker machined gunmetal side returns. */
  function numeral(orig) {
    return code(phys({ envMapIntensity: 1.3, roughness: 0.28, metalness: 0.78, clearcoat: 0.18, clearcoatRoughness: 0.22 }), 'numeral', {
      drawable: { side: THREE.FrontSide, room: 'ext' },
      surface: `
        vec3 p = vDrawW;
        float front = smoothstep(0.45, 0.85, abs(lkWN.z));
        float brushMacro = (lkn(vec3(p.x * 5.0, p.y * 72.0, p.z * 5.0)) - 0.5) * lkKeep(0.014, lkPx);
        float brushCoarse = (lkn(vec3(p.x * 9.0, p.y * 165.0, p.z * 9.0)) - 0.5) * lkKeep(0.0065, lkPx);
        float brushFine = (lkn(vec3(p.x * 18.0, p.y * 380.0, p.z * 18.0)) - 0.5) * lkKeep(0.0026, lkPx);
        float sheenBand = sin((p.x - ${f(17.3 - 30.0)}) * 9.5 + (p.y - 2.1) * 7.5 + lkn(p * 6.0) * 1.4) * 0.5;
        float edgeBevel = clamp(length(fwidth(lkWN)) * 1.2, 0.0, 1.0);
        float h = (0.00042 * brushMacro + 0.00032 * brushCoarse + 0.00018 * brushFine + 0.00022 * sheenBand) * (0.4 + 0.6 * front);
        ${SLOPE('h')}
        vec3 faceCol = mix(${v3([0.52, 0.535, 0.555])}, ${v3([0.82, 0.835, 0.855])}, 0.5 + 0.5 * sheenBand);
        faceCol *= 1.0 + 0.36 * brushMacro + 0.32 * brushCoarse + 0.22 * brushFine + 0.18 * edgeBevel;
        vec3 sideCol = ${v3([0.32, 0.335, 0.355])} * (0.85 + 0.25 * brushMacro);
        diffuseColor.rgb *= mix(sideCol, faceCol, front);
        roughnessFactor = clamp(mix(0.40, 0.25, front) - 0.08 * sheenBand + 0.10 * abs(brushMacro) + 0.08 * abs(brushCoarse), 0.14, 0.56);`,
    });
  }

  /* the vertical wall light sconce right of the door: a bead-blasted and brushed dark bronze-anodized architectural housing
     framing a fluted warm alabaster / prismatic ribbed glass diffuser with warm edge falloff and bronze tie-bars. */
  function sconceFrame(orig) {
    return code(phys({ envMapIntensity: 1.05, roughness: 0.36, metalness: 0.84, clearcoat: 0.12, clearcoatRoughness: 0.3 }), 'sconceFrame', {
      surface: `
        vec3 p = vDrawW;
        float vGrain = (lkn(vec3(p.x * 260.0, p.y * 18.0, p.z * 260.0)) - 0.5) * lkKeep(0.0035, lkPx);
        float bead = (lkn(p * 380.0) - 0.5) * lkKeep(0.0022, lkPx);
        float h = 0.00018 * vGrain + 0.00012 * bead;
        ${SLOPE('h')}
        vec3 col = ${v3([0.072, 0.060, 0.050])} * (1.0 + 0.22 * vGrain + 0.18 * bead);
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.35 + 0.08 * bead - 0.04 * vGrain, 0.22, 0.55);`,
    });
  }
  function windowFrame(orig) {
    return code(phys({ envMapIntensity: 0.12, roughness: 0.64, metalness: 0.05, clearcoat: 0.0 }), 'windowFrame', {
      surface: `
        vec3 p = vDrawW;
        float vGrain = (lkn(vec3(p.x * 220.0, p.y * 18.0, p.z * 220.0)) - 0.5) * lkKeep(0.004, lkPx);
        float bead = (lkn(p * 340.0) - 0.5) * lkKeep(0.0025, lkPx);
        float h = 0.00010 * vGrain + 0.00008 * bead;
        ${SLOPE('h')}
        lkG *= lkFlat(lkWN);
        vec3 col = ${v3([0.022, 0.023, 0.025])} * (1.0 + 0.14 * vGrain + 0.12 * bead);
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.64 + 0.06 * bead - 0.03 * vGrain, 0.52, 0.76);`,
      end: `reflectedLight.directDiffuse *= 0.12; reflectedLight.directSpecular *= 0.10; reflectedLight.indirectDiffuse *= 0.25; reflectedLight.indirectSpecular *= 0.18;`,
    });
  }
  function glowLine(orig) {
    return code(phys({ color: 0x2a2018, emissive: 0xffdcae, emissiveIntensity: 1.7, roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.22 }), 'glowLine', {
      surface: `
        vec3 p = vDrawW;
        float lx = (p.x - ${f(16.55 - 30.0)}) / 0.011;
        float ly = (p.y - 2.1) / 0.75;
        float kRib = lkKeep(0.006, lkPx);
        float rib = sin(p.y * 520.0) * kRib;
        float fluteX = cos(lx * 3.14159 * 3.0) * lkKeep(0.004, lkPx);
        float alab = lkFbm(p * vec3(14.0, 5.5, 14.0), 1.8, 0.55, 3, lkPx).x;
        // two slim horizontal dark-bronze retainer clips dividing the 1.5 m glass column into three architectural bays
        float clip = (1.0 - smoothstep(0.0035, 0.005 + lkPx, abs(abs(p.y - 2.1) - 0.26)));
        float edgeX = clamp(1.0 - 0.38 * lx * lx, 0.45, 1.0);
        float edgeY = smoothstep(0.0, 0.06, 0.75 - abs(p.y - 2.1));
        float glow = edgeX * (0.72 + 0.28 * edgeY) * (0.90 + 0.12 * rib + 0.08 * fluteX + 0.14 * alab) * (1.0 - 0.88 * clip);
        float h = 0.00045 * rib + 0.0003 * fluteX - 0.0008 * clip;
        ${SLOPE('h')}
        vec3 glassCol = mix(${v3([0.78, 0.52, 0.28])}, ${v3([1.0, 0.88, 0.70])}, clamp(glow, 0.0, 1.0));
        diffuseColor.rgb = mix(glassCol * 0.35, ${v3([0.06, 0.05, 0.042])}, clip);
        totalEmissiveRadiance *= mix(vec3(0.75, 0.48, 0.24), vec3(1.04, 0.94, 0.80), edgeX) * glow;
        roughnessFactor = mix(0.32 - 0.08 * rib, 0.38, clip);`,
    });
  }

  /* the fireplace's breast in brick (iteration 8). Sam, 15 Oct: "the wall for the fireplace, can you try to make more like
     brick texture? Because right now I feel like flat". (The board concrete it wore read as pale smears on a flat grey.)
     A long, slim, wood fired brick, the Kolumba kind: 50 by 4 cm faces, 12 mm joints raked 1 cm deep, laid in a wild bond
     (every course its own offset, so no zigzag of head joints). Each brick its own grey, from near black to a warm ash, darker
     at its ends where the flame licked it, a sanded face with lime specks and small pits, its arrises a little rounded and
     chipped. The mortar a pale grey, in the shadow of the deep joint. All of it by the pixel's size: a joint thinner than a
     pixel and a half becomes the wall's average, never a row of dots. */
  function brickWall(orig, key, base) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.85 }), key, {
      surface: `
        vec2 q; vec3 ta, tb; lkPlane(vDrawW, lkWN, q, ta, tb);
        const float CH = 0.052, JT = 0.012, BL = 0.512;
        float row = floor(q.y / CH), v = q.y - row * CH;                    // the bed joint at the bottom of each course
        float u = q.x + lkH2(vec2(row, 3.0)) * BL, bc = floor(u / BL), uu = u - bc * BL;
        vec2 id = vec2(row, bc);
        float r1 = lkH2(id + 1.7), r2 = lkH2(id + 5.3), r3 = lkH2(id + 9.1), r4 = lkH2(id + 12.9);
        float ev = min(v - JT, CH - v), eu = min(uu - JT, BL - uu);         // metres to the brick's edge (under 0: in a joint)
        float pv = max(fwidth(q.y), 1e-5), pu = max(fwidth(q.x), 1e-5);
        float kv = 1.0 - smoothstep(0.4, 0.8, pv / JT), ku = 1.0 - smoothstep(0.4, 0.8, pu / JT);
        float jv = mix(JT / CH, 1.0 - smoothstep(-0.5 * pv, 0.5 * pv, ev), kv), ju = mix(JT / BL, 1.0 - smoothstep(-0.5 * pu, 0.5 * pu, eu), ku);
        float joint = max(jv, ju * (1.0 - jv));
        // the arris: rounded over 4 mm, chipped here and there, with wire-cut drag lines along the brick face
        float e = min(ev, eu);
        float chip = smoothstep(0.68, 0.84, lkn(vec3(q * 62.0, 5.0))) * lkKeep(0.006, lkPx);
        float arris = smoothstep(0.0, 0.0045 + 0.006 * chip + lkPx, e);
        vec4 face = lkFbm(vec3(q * vec2(1.0, 2.2), r1 * 9.0), 42.0, 0.6, 4, lkPx);
        float drag = (lkn(vec3(q.x * 16.0, q.y * 280.0, r2 * 7.0)) - 0.5) * lkKeep(0.0025, lkPx);
        float pit = smoothstep(0.81, 0.92, lkn(vec3(q * 260.0, 7.0))) * lkKeep(0.003, lkPx);
        float h0 = (0.011 * arris - 0.011) * max(kv, ku)
                 + ((r2 - 0.5) * 0.0018 * (uu / BL - 0.5) + (r3 - 0.5) * 0.0012) * arris + 0.00035 * face.x + 0.00018 * drag - 0.0007 * pit;
        ${SLOPE('h0')}
        lkG *= lkFlat(lkWN);
        // each brick its own grey, darker toward its flashed ends, with a sanded face, lime specks, and pits
        float tone = 0.62 + 0.78 * r1;
        vec3 brick = ${v3(base)} * tone * mix(${v3([0.93, 0.96, 1.05])}, ${v3([1.12, 1.0, 0.87])}, r4);
        float flash = smoothstep(0.28, 0.0, min(uu, BL - uu) / BL) * (0.32 + 0.52 * r3);
        brick *= (1.0 - 0.38 * flash) * (1.0 + 0.24 * face.x + 0.12 * drag) * (1.0 - 0.42 * pit);
        float lime = smoothstep(0.85, 0.94, lkn(vec3(q * 180.0, 11.0 + r2))) * lkKeep(0.003, lkPx);
        brick = mix(brick, ${v3([0.34, 0.325, 0.3])}, lime * 0.52);
        // raked mortar joint: deep shadow under the overhanging upper brick course, warming toward the lower ledge
        float rakeShade = mix(0.62, 0.38 + 0.38 * (1.0 - clamp(v / JT, 0.0, 1.0)), kv);
        vec3 mortar = ${v3([0.21, 0.2, 0.185])} * (0.9 + 0.2 * lkn(vec3(q * 95.0, 13.0))) * rakeShade;
        vec3 col = mix(brick, mortar, joint);
        // the top arris of each course catches a subtle warm grazing rim while the bottom arris turns into the joint
        float topRim = smoothstep(JT, JT + 0.006, v) * (1.0 - smoothstep(JT + 0.006, JT + 0.014, v));
        col *= 1.0 + (0.14 * (1.0 - arris) + 0.08 * topRim) * (1.0 - joint) * max(kv, ku);
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.8 + 0.1 * face.x + 0.12 * joint + 0.08 * pit - 0.1 * lime, 0.5, 1.0);`,
    });
  }

  /* the bird of paradise's basket (iteration 8): rattan woven over upright stakes 2.2 cm apart, each weaver a round cane 8 mm
     high passing in front of one stake and behind the next, the next row the other way. A cane is lit as a cylinder (paler
     along its middle), each its own honey or straw tone, a dark gap where the weave opens. Laid round the basket's axis
     (window.LINTEL_BASKET), so the pattern wraps it. Under two pixels a cane is its average. */
  function rattan(orig) {
    const Bk = window.LINTEL_BASKET || { x: 10.35, y: 15.95 };
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.68 }), 'rattan2', {
      surface: `
        vec3 w = vDrawW - vec3(${f(Bk.x - 30)}, 0.0, ${f(Bk.y - 24)});
        vec2 dir = normalize(w.xz + vec2(1e-6, 0.0));
        float u = (atan(dir.y, dir.x) * 0.15915494 + 0.5) * 44.0;            // 44 upright stakes round the circumference
        float v = w.y, RH = 0.0145;                                          // 14.5 mm chunky hand-woven seagrass/rattan coils
        float row = floor(v / RH), fv = fract(v / RH), st = floor(u), fu = fract(u);
        bool collar = v > 0.435 || v < 0.052;                                // heavy braided rim collar and base foot binding
        bool over = collar ? true : (mod(row + st, 2.0) < 1.0);              // alternating over-under basket weave
        float pu = max(length(fwidth(dir)) * 7.0, 1e-4), pv = max(fwidth(v) / RH, 1e-4);
        float k = 1.0 - smoothstep(0.48, 0.96, max(pu, pv));
        float weavRound = sin(3.14159 * fv);
        float stakeRound = sin(3.14159 * clamp((fu - 0.18) / 0.64, 0.0, 1.0));
        float cane = over ? weavRound : stakeRound;
        // 2-ply twisted seagrass strand micro-ribs along each weaver and upright stake
        float twistPhase = over ? (u * 3.5 + fv * 2.2 + row * 0.37) : (v / RH * 2.5 + fu * 1.8);
        float twist = 0.5 + 0.5 * sin(twistPhase * 6.28318);
        float gap = over
          ? smoothstep(0.36, 0.50, abs(fv - 0.5)) * (1.0 - 0.55 * sin(3.14159 * fu))
          : (1.0 - smoothstep(0.14, 0.26, fu) * (1.0 - smoothstep(0.74, 0.86, fu)));
        float tone = lkH2(over ? vec2(row, floor(u * 0.5)) : vec2(st, 7.0));
        float band = smoothstep(0.18, 0.24, v) * (1.0 - smoothstep(0.28, 0.34, v)); // subtle woven belly band accent
        float h0 = mix(0.0, 0.0028 * cane + 0.00055 * (twist - 0.5) * cane - 0.0024 * gap + (collar ? 0.0012 * sin(fu * 6.28318) : 0.0), k);
        ${SLOPE('h0')}
        vec3 cDark = ${v3([0.28, 0.18, 0.085])}, cLight = ${v3([0.56, 0.42, 0.23])};
        vec3 col = mix(cDark, cLight, tone);
        col = mix(col, ${v3([0.22, 0.14, 0.065])}, band * 0.35 + (collar ? 0.18 : 0.0));
        col *= mix(1.0, 0.58 + 0.56 * cane + 0.14 * (twist - 0.5) * cane, k);
        col = mix(col, ${v3([0.055, 0.038, 0.020])}, clamp(gap * k * 0.92, 0.0, 0.92));
        col *= 1.0 + 0.16 * (lkn(vec3(dir * 28.0, v * 42.0)) - 0.5) * k;
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.58 - 0.16 * cane * k + 0.34 * gap, 0.32, 0.98);`,
    });
  }

  /* the bird of paradise's leaves and stalks: each blade encodes its botanical age in vLkUv.y, with a tapered celadon
     midrib flanked by vascular furrows, 16 bold corrugated parallel lateral pleats with crisp pale primary side veins and
     fine secondary striations, glaucous sage wax bloom on older lower leaves, warm olive-chartreuse chlorophyll glow on
     young upper leaves, and a satin-matte botanical cuticle */
  function strelLeaf(orig) {
    return code(phys({ envMapIntensity: 0.46, roughness: 0.52, side: THREE.DoubleSide, sheen: 0.48, sheenRoughness: 0.58, sheenColor: new THREE.Color(0.15, 0.21, 0.11) }), 'strelLeaf6', {
      surface: `
        float leafTag = floor(vLkUv.y * 0.5 + 0.001);
        float age = clamp(leafTag * 0.1, 0.0, 1.0);
        vec2 lv = vec2(vLkUv.x, clamp(vLkUv.y - leafTag * 2.0, 0.0, 1.0));
        float ax = abs(lv.x * 2.0 - 1.0), t = lv.y;
        // tapered fleshy midrib, slender at the petiole base and narrowing to a fine point at the tip
        float mw = mix(0.044, 0.004, pow(t, 0.74));
        float mid = 1.0 - smoothstep(mw * 0.42, mw + fwidth(ax) * 1.3, ax);
        float furrow = smoothstep(mw * 0.52, mw * 1.15, ax) * (1.0 - smoothstep(mw * 1.15, mw * 2.8, ax));
        // parallel pinnate lateral venation: 16 bold corrugated primary ribs and 56 fine secondary vascular veins
        float vCurve = t - 0.175 * pow(ax, 0.84) - 0.035 * ax * ax;
        float vv1 = vCurve * 16.0, vf1 = fract(vv1), aw1 = fwidth(vv1);
        float vk1 = 1.0 - smoothstep(0.45, 0.94, aw1);
        float pleat = sin(vf1 * 3.14159);
        float dv1 = min(vf1, 1.0 - vf1);
        float vein1 = (1.0 - smoothstep(0.045, 0.16 + aw1 * 0.85, dv1)) * vk1 * smoothstep(mw * 0.75, mw * 1.85, ax) * (1.0 - smoothstep(0.84, 0.97, ax));
        float vv2 = vCurve * 56.0, vk2 = 1.0 - smoothstep(0.32, 0.76, fwidth(vv2));
        float rib2 = mix(0.5, 0.5 - 0.5 * cos(fract(vv2) * 6.2832), vk2);
        // botanical cellular grain and organic variegation across the blade
        float patchy = lkn(vec3(vDrawW * 6.5)), mottle = lkn(vec3(lv.x * 11.0, lv.y * 22.0, age * 5.0 + 1.0));
        float cell = lkn(vec3(lv.x * 32.0, lv.y * 88.0, age * 7.0));
        vec3 matureCol = mix(${v3([0.015, 0.046, 0.024])}, ${v3([0.034, 0.082, 0.038])}, patchy);
        vec3 youngCol = mix(${v3([0.040, 0.105, 0.026])}, ${v3([0.078, 0.154, 0.040])}, patchy);
        vec3 col = mix(youngCol, matureCol, age * 0.82);
        // warm chlorophyll glow on the inner blade, dihedral half-blade contrast, and strong sunlit pleat bevels
        float sunZone = (1.0 - smoothstep(0.14, 0.84, ax)) * (1.0 - 0.42 * age);
        float halfShade = smoothstep(0.47, 0.53, lv.x) - 0.5;
        col = mix(col, col * ${v3([1.42, 1.48, 0.82])}, (sunZone * 0.46 + (0.5 - vf1) * vk1 * 0.38 + halfShade * 0.20) * (1.0 - mid));
        col = mix(col, ${v3([0.048, 0.084, 0.064])}, (1.0 - pleat) * vk1 * (0.28 + 0.28 * age) * (1.0 - mid));
        col *= (0.80 + 0.34 * mottle) * (0.88 + 0.22 * cell) * (0.72 + 0.46 * mix(0.5, pleat, vk1)) * (0.92 + 0.15 * (1.0 - rib2));
        // distinct pale chartreuse-olive primary lateral veins, dark flanking midrib furrow, and tapered golden-celadon midrib
        vec3 latCol = mix(${v3([0.135, 0.205, 0.062])}, ${v3([0.092, 0.152, 0.050])}, age * 0.58);
        col = mix(col, latCol, vein1 * 0.82);
        col *= 1.0 - 0.32 * furrow;
        vec3 midCol = mix(${v3([0.205, 0.282, 0.082])}, ${v3([0.138, 0.204, 0.062])}, age * 0.52 + 0.35 * t);
        col = mix(col, midCol, mid * 0.94);
        // natural dry amber-russet hairline at the outer margin and leaf tip
        float dryEdge = max(smoothstep(0.925, 1.0, ax), smoothstep(0.950, 1.0, t));
        col = mix(col, ${v3([0.115, 0.082, 0.036])}, dryEdge * (0.48 + 0.38 * age));
        if (!gl_FrontFacing) col = col * 1.38 + ${v3([0.022, 0.038, 0.018])};
        diffuseColor.rgb *= col * 1.44;
        float hv = 0.0064 * pleat * vk1 - 0.0014 * vein1 + 0.0006 * (1.0 - rib2) * vk2 + 0.0034 * mid - 0.0012 * furrow;
        if (!gl_FrontFacing) hv = -0.68 * hv + 0.0034 * mid;
        ${SLOPE('hv')}
        roughnessFactor = gl_FrontFacing ? clamp(0.44 + 0.28 * (1.0 - pleat * vk1) - 0.12 * vein1 - 0.14 * mid + 0.08 * age + 0.06 * patchy, 0.30, 0.84) : 0.76;`,
    });
  }
  function strelStem(orig) {
    return code(phys({ envMapIntensity: 0.45, roughness: 0.54, sheen: 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color(0.12, 0.16, 0.12) }), 'strelStem', {
      surface: `
        vec3 p = vDrawW;
        float hRel = clamp((p.y - 0.50) / 1.05, 0.0, 1.0);
        float fib = (lkn(vec3(p.x * 160.0, p.y * 10.0, p.z * 160.0)) - 0.5) * lkKeep(0.004, lkPx)
                  + 0.7 * (lkn(vec3(p.x * 320.0, p.y * 18.0, p.z * 320.0)) - 0.5) * lkKeep(0.002, lkPx);
        float ringScar = sin(p.y * 92.0 + lkn(p * 7.0) * 3.2) * (1.0 - smoothstep(0.15, 0.62, hRel)) * lkKeep(0.008, lkPx);
        float bloom = lkn(p * 9.0);
        // warm woody russet-olive clasping sheaths and leaf-scar rings at the base, glaucous sage-green along the stalk, warming to celadon at the blade
        vec3 baseSheath = mix(${v3([0.068, 0.064, 0.036])}, ${v3([0.042, 0.074, 0.044])}, smoothstep(0.0, 0.35, hRel));
        vec3 upperStalk = mix(${v3([0.048, 0.092, 0.048])}, ${v3([0.082, 0.138, 0.055])}, smoothstep(0.42, 1.0, hRel));
        vec3 col = mix(baseSheath, upperStalk, smoothstep(0.18, 0.65, hRel));
        col = mix(col, ${v3([0.095, 0.082, 0.052])}, clamp(ringScar * 0.5 + 0.5, 0.0, 1.0) * (1.0 - smoothstep(0.1, 0.55, hRel)) * 0.38);
        col = mix(col, ${v3([0.075, 0.108, 0.082])}, (1.0 - hRel) * 0.35 * bloom);
        col *= 1.0 + 0.26 * fib + 0.14 * ringScar;
        diffuseColor.rgb *= col * 1.35;
        float h = 0.00024 * fib + 0.00035 * ringScar;
        ${SLOPE('h')}
        roughnessFactor = clamp(0.52 + 0.14 * (1.0 - hRel) - 0.08 * fib + 0.06 * abs(ringScar), 0.36, 0.80);`,
    });
  }

  /* the bedroom's fiddle-leaf fig (16 Oct & 18 Oct, Sam: "make sure to have nice detail and polishing on the plant. The plant is nice").
     From the blade's own uv (x across 0 to 1, y along it). Waxy botanical cuticle with clearcoat sheen, a prominent pale chartreuse-ivory
     central midrib, ten pairs of arching lateral veins, bullate quilted inter-vein cushions, fine reticulate venation, and warm russet margin. */
  function figLeaf(orig) {
    return code(phys({
      envMapIntensity: 0.92,
      roughness: 0.28,
      clearcoat: 0.36,
      clearcoatRoughness: 0.22,
      sheen: 0.42,
      sheenRoughness: 0.35,
      sheenColor: new THREE.Color(0.24, 0.36, 0.16),
      side: THREE.DoubleSide,
    }), 'figLeaf', {
      surface: `
        vec2 lv = vLkUv; float ax = abs(lv.x * 2.0 - 1.0), t = lv.y;
        float mw = mix(0.056, 0.011, t);
        float mid = 1.0 - smoothstep(mw * 0.42, mw + fwidth(ax) * 1.35, ax);
        float midCore = 1.0 - smoothstep(0.0, mw * 0.48, ax);
        float vv = (t - 0.18 * pow(ax, 0.82) - 0.025) * 10.5, fv = fract(vv), dv = min(fv, 1.0 - fv), aw = fwidth(vv);
        float lw = 0.042 * (1.0 - 0.56 * ax);
        float lat = (1.0 - smoothstep(lw * 0.45, lw + aw * 1.15, dv)) * smoothstep(0.025, 0.085, t) * (1.0 - smoothstep(0.82, 0.97, ax)) * (1.0 - smoothstep(0.32, 0.65, aw));
        float quilt = sin(3.14159 * fv) * smoothstep(0.035, 0.22, ax) * (1.0 - smoothstep(0.84, 1.0, ax));
        float net = lkn(vec3(lv.x * 38.0, lv.y * 58.0, 1.0)), fine = (1.0 - smoothstep(0.025, 0.075, abs(net - 0.5))) * (1.0 - smoothstep(0.3, 0.7, fwidth(lv.y * 58.0)));
        float tone = lkn(vec3(vDrawW * 3.2)), patchy = lkn(vec3(vDrawW * 13.0 + 2.0));
        float youngLift = smoothstep(1.35, 2.05, vDrawW.y);
        vec3 col = mix(${v3([0.024, 0.068, 0.022])}, ${v3([0.052, 0.115, 0.038])}, clamp(tone + 0.28 * youngLift, 0.0, 1.0));
        col *= (0.86 + 0.24 * patchy) * (0.86 + 0.24 * max(0.0, quilt));
        col = mix(col, col * 0.66, fine * 0.48);
        col = mix(col, ${v3([0.135, 0.215, 0.072])}, lat * 0.72);
        col = mix(col, ${v3([0.215, 0.295, 0.105])}, mid * 0.88);
        col = mix(col, ${v3([0.285, 0.355, 0.145])}, midCore * 0.55);
        col = mix(col, ${v3([0.095, 0.062, 0.028])}, smoothstep(0.93, 1.0, ax) * 0.58);
        if (!gl_FrontFacing) col = col * 1.62 + ${v3([0.028, 0.042, 0.016])};
        diffuseColor.rgb *= col * 1.48;
        float hv = 0.0022 * quilt - 0.0011 * lat + 0.0016 * mid - 0.00022 * fine;
        if (!gl_FrontFacing) hv = -hv;
        ${SLOPE('hv')}
        float upSun = clamp(0.5 + 0.5 * lkWN.y, 0.0, 1.0);
        totalEmissiveRadiance += col * (0.14 + 0.18 * upSun + 0.10 * lat);
        roughnessFactor = gl_FrontFacing ? clamp(0.22 + 0.10 * (1.0 - quilt) + 0.07 * patchy + 0.12 * lat - 0.06 * mid, 0.16, 0.52) : 0.68;`,
    });
  }

  /* its pot: an unglazed terracotta in 22 round reeds under a chalky lime wash, worn thin on the reeds' crests and thick in
     the grooves between them, with wheel-thrown horizontal striae and analytical reed slope relief. (Stands at plan 50.12, 40.04.) */
  function figPot(orig) {
    return code(phys({ envMapIntensity: 0.62, roughness: 0.76, clearcoat: 0.08, clearcoatRoughness: 0.45 }), 'figPot', {
      surface: `
        vec3 p = vDrawW; vec2 dq = p.xz - vec2(20.12, 16.04);
        float ang = atan(dq.y, dq.x);
        float inReeds = smoothstep(0.018, 0.045, p.y) * (1.0 - smoothstep(0.50, 0.535, p.y));
        float reed = pow(abs(cos(ang * 11.0)), 0.6) * inReeds;
        float groove = (1.0 - smoothstep(0.0, 0.48, reed)) * inReeds;
        float striae = sin(p.y * 420.0 + 1.5 * lkn(p * 18.0)) * lkKeep(0.004, lkPx);
        float grain = lkn(p * 145.0), cloud = lkn(p * 5.2), wash = lkn(vec3(p.x * 10.0, p.y * 3.5, p.z * 10.0));
        float foot = 1.0 - smoothstep(0.0, 0.13, p.y);
        float rimHi = smoothstep(0.51, 0.555, p.y);
        vec3 terra = mix(${v3([0.32, 0.175, 0.112])}, ${v3([0.44, 0.255, 0.168])}, cloud);
        vec3 lime = ${v3([0.62, 0.545, 0.470])};
        float limeMask = clamp(smoothstep(0.24, 0.74, wash) * 0.58 + 0.44 * groove + 0.24 * rimHi - 0.22 * reed, 0.0, 0.88);
        vec3 col = mix(terra, lime, limeMask);
        col *= (0.91 + 0.18 * grain * lkKeep(0.002, lkPx) + 0.05 * striae + 0.08 * reed) * (1.0 - 0.20 * foot);
        diffuseColor.rgb *= col;
        float h = 0.00085 * reed - 0.00065 * groove + 0.00018 * striae + 0.00018 * grain * lkKeep(0.002, lkPx);
        ${SLOPE('h')}
        roughnessFactor = clamp(0.72 + 0.14 * limeMask - 0.08 * reed + 0.10 * grain, 0.54, 0.92);`,
    });
  }

  /* joinery veneer (iteration 8): the kitchen island's base (veneerOak) and the dressing room's bespoke walnut wardrobes (veneerWal).
     Book-matched crown-cut and rift-sawn hardwood veneer under a hand-rubbed satin furniture lacquer: sweeping cathedral
     heartwood arches down the center of each leaf, straight quarter-sawn outer bands, dark growth rings, open vessel pores,
     and warm chatoyant ribbon figure. */
  function veneer(orig, key, base) {
    const isWal = key === 'veneerWal';
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: isWal ? 0.42 : 0.50, clearcoat: isWal ? 0.28 : 0.18, clearcoatRoughness: isWal ? 0.22 : 0.28 }), key, {
      scale: 2.0 / 0.003,
      surface: `
        vec2 q; vec3 ta, tb; lkPlane(vDrawW, lkWN, q, ta, tb);
        vec2 g = abs(lkWN.y) < 0.7 ? q : q.yx;                               // (across the grain, along it)
        float leafW = ${isWal ? '0.44' : '0.816'};
        float lf = floor(g.x / leafW), r1 = lkH2(vec2(lf, 3.0)), r2 = lkH2(vec2(lf, 8.0)), r3 = lkH2(vec2(lf, 15.0));
        float lx = (fract(g.x / leafW) - 0.5) * leafW;
        float ac = g.x + r1 * 9.0, al = g.y;
        float vPx = mix(lkPxM, lkPx, 0.24);
        float px = min(vPx, max(fwidth(ac) * 0.60, 1e-4));
        float dj = abs(fract(g.x / 0.816 + 0.5) - 0.5) * 0.816;
        float reveal = (1.0 - smoothstep(0.0012, max(0.0026, px * 1.4), dj)) * step(abs(lkWN.y), 0.5) * smoothstep(0.06, 0.14, min(vDrawW.x - ${f(11.55 - 30.0)}, ${f(16.45 - 30.0)} - vDrawW.x));
        float underShadow = smoothstep(0.82, 0.885, vDrawW.y) * step(abs(lkWN.y), 0.5) * step(vDrawW.x, 0.0);
        // Crown-cut cathedral heartwood arches combined with straight rift grain
        float wan = 0.0028 * (lkn(vec3(al * 0.42, lf, 1.0)) - 0.5) + 0.0012 * (lkn(vec3(al * 1.6, ac * 8.0, lf + 5.0)) - 0.5);
        float archDist = length(vec2((lx - (r1 - 0.5) * 0.06) * 1.45, 0.08 + 0.14 * r2)) + (0.009 + 0.016 * r3) * (r2 < 0.5 ? al : -al) + wan * 1.8;
        float archCoord = archDist / (0.0032 + 0.0018 * r1) + 0.85 * (lkn(vec3(archDist * 18.0, al * 0.75, lf + 7.0)) - 0.5);
        float archVis = 1.0 - smoothstep(0.24, 0.65, min(fwidth(archCoord), px / 0.0032));
        float archRing = mix(0.28, (1.0 - smoothstep(0.0, 0.30, fract(archCoord))) * (0.45 + 0.55 * lkH2(vec2(floor(archCoord), lf))), archVis);
        float archBand = mix(0.35, smoothstep(0.0, 0.25, fract(archCoord)) * (1.0 - smoothstep(0.55, 0.94, fract(archCoord))), archVis);
        float gl = (ac + wan) / (0.0026 + 0.0014 * r2);
        gl += 0.75 * (lkn(vec3(gl * 0.3, lf, 3.0)) - 0.5);
        float lineVis = 1.0 - smoothstep(0.25, 0.65, min(fwidth(gl), px / 0.0026));
        float line = mix(0.25, (1.0 - smoothstep(0.0, 0.26, fract(gl))) * (0.42 + 0.58 * lkH2(vec2(floor(gl), lf))), lineVis);
        float fib = (lkn(vec3(ac * 640.0, al * 5.5, lf)) - 0.5) * lkKeep(0.0016, px) + 0.72 * (lkn(vec3(ac * 165.0, al * 1.6, lf + 1.0)) - 0.5) * lkKeep(0.0055, px);
        float streak = lkn(vec3(ac * 14.0 + wan * 12.0, al * 0.32, lf + 2.0));
        float curl = 0.5 + 0.5 * sin(al * 14.0 + lkn(vec3(ac * 6.0, al * 1.2, lf + 9.0)) * 4.5);
        float pore = smoothstep(0.76, 0.90, lkn(vec3(ac * 920.0, al * 28.0, lf + 4.0))) * lkKeep(0.0014, px)
                   + 0.65 * smoothstep(0.74, 0.88, lkn(vec3(ac * 260.0, al * 14.0, lf + 6.0))) * lkKeep(0.0045, px);
        float h0 = 0.00024 * fib - 0.00022 * pore - 0.00018 * archRing - 0.00010 * line - 0.0008 * reveal;
        ${SLOPE('h0')}
        lkG *= lkFlat(lkWN);
        vec3 baseCol = ${v3(base)} * (0.88 + 0.24 * r2) * mix(vec3(0.92, 0.89, 0.85), vec3(1.10, 1.05, 0.98), 0.55 * archBand + 0.45 * curl);
        vec3 col = baseCol * (1.0 - 0.24 * archRing - 0.16 * line) * (1.0 + 0.28 * fib) * (0.82 + 0.36 * streak) * (1.0 - 0.38 * pore);
        col *= (1.0 - 0.62 * reveal) * (1.0 - 0.26 * underShadow);
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(${isWal ? '0.40' : '0.50'} + 0.07 * fib + 0.12 * pore + 0.06 * archRing - 0.05 * curl + 0.24 * reveal, 0.26, 0.82);`,
    });
  }

  /* smoked oak for the dining chairs and the island's stools (iteration 8, Sam: "find another color, maybe darker, more
     premium... that fits well with our table"). Oak fumed to a deep brown-black, oiled: a fine straight grain along each
     piece (up a leg, along a rail), its pores a shade paler, a satin sheen. */
  function smokedOak(orig) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.45 }), 'smokedOak', {
      surface: `
        vec3 p = vDrawW;
        // the grain follows the piece: up the legs and posts, along x on the rails and the seat (most of them run that way)
        float up = step(0.6, abs(lkWN.x) + abs(lkWN.z)) * step(abs(lkWN.y), 0.5);
        vec2 g = up > 0.5 ? vec2(p.x + p.z, p.y) : vec2(p.z, p.x);
        float px = max(fwidth(g.x) * 0.7, 1e-5);
        float gl = g.x / 0.0024 + 0.8 * (lkn(vec3(g.x * 30.0, g.y * 0.4, 5.0)) - 0.5) * 10.0;
        float line = mix(0.25, 1.0 - smoothstep(0.0, 0.3, fract(gl)), 1.0 - smoothstep(0.25, 0.6, fwidth(gl)));
        float fib = (lkn(vec3(g.x * 600.0, g.y * 4.0, 2.0)) - 0.5) * lkKeep(0.0016, px);
        float pore = smoothstep(0.8, 0.92, lkn(vec3(g.x * 1100.0, g.y * 28.0, 4.0))) * lkKeep(0.001, px);
        float h0 = 0.00004 * fib;
        ${SLOPE('h0')}
        lkG *= lkFlat(lkWN);
        vec3 col = ${v3([0.052, 0.036, 0.026])} * (1.0 - 0.15 * line) * (1.0 + 0.3 * fib) * (0.9 + 0.2 * lkn(vec3(g * vec2(9.0, 0.3), 7.0)));
        col = mix(col, ${v3([0.11, 0.085, 0.065])}, pore * 0.5);
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.42 + 0.08 * fib + 0.1 * pore, 0.3, 0.8);`,
    });
  }

  /* the entrance's amphora floor urns: smoked bronze-umber and warm charcoal kiln-reduction stoneware glaze over horizontal
     wheel-thrown fluting, with a matte blackened stoneware pedestal foot and a warm bronze base ring (matching ref_entrance_vases). */
  function glaze(orig) {
    return code(phys({ envMapIntensity: 0.72, roughness: 0.28, clearcoat: 0.42, clearcoatRoughness: 0.16 }), 'glaze', {
      surface: `
        vec3 p = vDrawW;
        float cPx = mix(lkPxM, lkPx, 0.35);
        float pool = lkn(vec3(p.x * 5.5, p.y * 2.4, p.z * 5.5)), run = lkn(vec3(p.x * 13.0, p.y * 1.4, p.z * 13.0));
        // pronounced horizontal wheel-thrown potter's fluting across the belly and finer ribs on the shoulder
        float bellyMask = smoothstep(0.11, 0.24, p.y) * (1.0 - smoothstep(0.60, 0.76, p.y));
        float throwFlute = sin(p.y * 250.0 + lkn(p * 6.5) * 1.1) * lkKeep(0.006, cPx);
        float throwRib = sin(p.y * 96.0 + lkn(p * 4.2) * 1.6) * lkKeep(0.014, cPx);
        float speck = smoothstep(0.82, 0.93, lkn(p * 240.0)) * lkKeep(0.0032, cPx)
                    + 0.65 * smoothstep(0.84, 0.94, lkn(p * 440.0 + 7.0)) * lkKeep(0.0018, cPx);
        float clayGrain = (lkn(p * 340.0 + 3.0) - 0.5) * lkKeep(0.0022, cPx);
        float foot = 1.0 - smoothstep(0.076, 0.092, p.y);
        float baseRing = 1.0 - smoothstep(0.010, 0.018, p.y);
        // shoulder collar ring highlight at y ~ 0.765
        float collar = exp(-pow((p.y - 0.765) / 0.015, 2.0));
        float h = ((0.00038 * throwFlute * (0.45 + 0.55 * bellyMask)) + 0.00028 * throwRib - 0.00016 * speck) * (1.0 - 0.75 * foot) + 0.00024 * clayGrain * foot;
        ${SLOPE('h')}
        // Multi-zone reduction glaze: deep smoked charcoal-espresso on upper shoulder & neck, warm roasted bronze-umber across the mid-belly
        vec3 darkChar = mix(${v3([0.024, 0.020, 0.018])}, ${v3([0.044, 0.036, 0.030])}, pool * 0.65);
        vec3 warmBronze = mix(${v3([0.082, 0.060, 0.042])}, ${v3([0.138, 0.100, 0.068])}, smoothstep(0.25, 0.78, pool) * 0.65 + 0.35 * run);
        float bronzeBand = smoothstep(0.10, 0.25, p.y) * (1.0 - smoothstep(0.48, 0.72, p.y + 0.05 * (pool - 0.5)));
        vec3 col = mix(darkChar, warmBronze, bronzeBand * 0.90);
        // warm golden-bronze mineral pooling inside the horizontal wheel-thrown grooves
        float groovePool = clamp(-throwFlute * 0.5 + 0.5, 0.0, 1.0) * bellyMask;
        col = mix(col, ${v3([0.185, 0.135, 0.088])}, groovePool * 0.38 + collar * 0.28);
        col *= 1.0 + 0.08 * throwFlute + 0.05 * throwRib;
        col = mix(col, ${v3([0.22, 0.16, 0.10])}, speck * 0.35);
        // Matte blackened-stoneware pedestal foot with warm bronze-terracotta bottom kiss ring
        vec3 footCol = mix(${v3([0.018, 0.016, 0.015])} * (1.0 + 0.16 * clayGrain), ${v3([0.18, 0.105, 0.055])}, baseRing);
        col = mix(col, footCol, foot);
        diffuseColor.rgb *= col;
        roughnessFactor = mix(clamp(0.24 + 0.08 * bronzeBand + 0.05 * pool - 0.04 * throwFlute + 0.08 * speck, 0.18, 0.42), 0.76, foot);`,
    });
  }

  /* botanical foliage & blossoms for the entrance floor urns:
     species 0: glossy dark olive-emerald Magnolia grandiflora leaf with velvety cinnamon-russet underside
     species 1: burnished russet-bronze / dark copper magnolia leaf
     species 2: glaucous silver-sage Eucalyptus cinerea rounded leaf
     species 3: warm ivory-champagne & pale ochre magnolia blossom bud */
  function urnLeaf(orig) {
    return code(phys({ envMapIntensity: 0.55, roughness: 0.38, side: THREE.DoubleSide }), 'urnLeaf', {
      surface: `
        float sp = floor(vLkUv.y * 0.5 + 0.001);
        vec2 lv = vec2(vLkUv.x, clamp(vLkUv.y - sp * 2.0, 0.0, 1.0));
        float ax = abs(lv.x * 2.0 - 1.0), t = lv.y;
        float mw = mix(0.055, 0.008, t);
        float mid = 1.0 - smoothstep(mw * 0.5, mw + fwidth(ax) * 1.5, ax);
        float vv = (t - 0.16 * pow(ax, 0.85) - 0.02) * 9.0, fv = fract(vv), dv = min(fv, 1.0 - fv), aw = fwidth(vv);
        float lat = (1.0 - smoothstep(0.04 * (1.0 - 0.5 * ax), 0.04 * (1.0 - 0.5 * ax) + aw * 1.2, dv)) * smoothstep(0.04, 0.10, t) * (1.0 - smoothstep(0.78, 0.96, ax));
        float quilt = sin(3.1416 * fv) * smoothstep(0.04, 0.24, ax) * (1.0 - smoothstep(0.84, 1.0, ax));
        float tone = lkn(vec3(vDrawW * 5.5)), patchy = lkn(vec3(vDrawW * 16.0 + 3.0));
        vec3 col; float rgh;
        if (sp < 0.5) {
          // Species 0: Glossy deep olive-forest Magnolia leaf with rich bronze-olive underside
          vec3 upCol = mix(${v3([0.024, 0.048, 0.015])}, ${v3([0.056, 0.092, 0.026])}, tone) * (0.86 + 0.24 * patchy) * (0.90 + 0.16 * quilt);
          upCol = mix(upCol, ${v3([0.095, 0.132, 0.038])}, lat * 0.45 + mid * 0.72);
          vec3 dnCol = mix(${v3([0.042, 0.052, 0.018])}, ${v3([0.078, 0.068, 0.024])}, tone) * (0.88 + 0.22 * patchy);
          dnCol = mix(dnCol, ${v3([0.115, 0.062, 0.022])}, mid * 0.65 + (1.0 - smoothstep(0.65, 0.95, ax)) * 0.20);
          col = gl_FrontFacing ? upCol : dnCol;
          rgh = gl_FrontFacing ? 0.26 + 0.08 * patchy : 0.52;
        } else if (sp < 1.5) {
          // Species 1: Velvety cinnamon-russet & burnished bronze magnolia accent leaf
          col = mix(${v3([0.105, 0.044, 0.015])}, ${v3([0.168, 0.074, 0.024])}, tone) * (0.86 + 0.26 * patchy) * (0.90 + 0.16 * quilt);
          col = mix(col, ${v3([0.215, 0.105, 0.036])}, lat * 0.42 + mid * 0.68);
          if (!gl_FrontFacing) col *= 0.85;
          rgh = 0.42 + 0.12 * patchy;
        } else if (sp < 2.5) {
          // Species 2: Preserved glaucous silver-sage Eucalyptus cinerea leaf
          col = mix(${v3([0.088, 0.128, 0.110])}, ${v3([0.142, 0.184, 0.160])}, tone) * (0.90 + 0.18 * patchy);
          col = mix(col, ${v3([0.192, 0.232, 0.208])}, mid * 0.55 + lat * 0.25 + smoothstep(0.65, 0.98, ax) * 0.22);
          rgh = 0.62 + 0.10 * patchy;
        } else {
          // Species 3: Warm ivory-champagne & pale ochre magnolia blossom bud
          col = mix(${v3([0.38, 0.28, 0.16])}, ${v3([0.68, 0.61, 0.46])}, smoothstep(0.0, 0.42, t)) * (0.92 + 0.14 * patchy);
          col = mix(col, ${v3([0.78, 0.72, 0.58])}, smoothstep(0.55, 0.95, t) * (1.0 - 0.4 * ax));
          rgh = 0.44;
        }
        diffuseColor.rgb *= col * 1.15;
        float hv = 0.0009 * quilt - 0.0005 * lat - 0.0007 * mid;
        if (!gl_FrontFacing) hv = -hv;
        ${SLOPE('hv')}
        roughnessFactor = clamp(rgh, 0.22, 0.85);`,
    });
  }

  /* dark woody branches in the stoneware vessels, and hand-turned blackened stoneware / basalt ceramic for the console bowl & door urn */
  function twigBark(orig) {
    return code(phys({ envMapIntensity: 0.45, roughness: 0.72 }), 'twigBark', {
      surface: `
        vec3 p = vDrawW;
        float stria = (lkn(vec3(p.x * 220.0, p.y * 18.0, p.z * 220.0)) - 0.5) * lkKeep(0.003, lkPx);
        float node = smoothstep(0.76, 0.88, lkn(vec3(p.x * 24.0, p.y * 42.0, p.z * 24.0)));
        float mottle = lkn(p * 14.0);
        float h = 0.00022 * stria + 0.00035 * node;
        ${SLOPE('h')}
        vec3 col = mix(${v3([0.075, 0.052, 0.036])}, ${v3([0.135, 0.098, 0.068])}, mottle) * (1.0 + 0.28 * stria - 0.25 * node);
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.68 + 0.12 * stria + 0.10 * node, 0.48, 0.90);`,
    });
  }
  function darkCeramic(orig) {
    return code(phys({ envMapIntensity: 0.85, roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.24 }), 'darkCeramic', {
      surface: `
        vec3 p = vDrawW;
        float cPx = mix(lkPxM, lkPx, 0.35);
        float rib = sin(p.y * 190.0 + lkn(p * 11.0) * 1.8) * lkKeep(0.007, cPx);
        float grain = (lkn(p * 320.0) - 0.5) * lkKeep(0.0025, cPx);
        float speck = smoothstep(0.82, 0.93, lkn(p * 180.0 + 4.0)) * lkKeep(0.004, cPx);
        float cloud = lkn(p * 6.5);
        float h = 0.00018 * rib + 0.00012 * grain - 0.00022 * speck;
        ${SLOPE('h')}
        vec3 col = mix(${v3([0.042, 0.040, 0.038])}, ${v3([0.078, 0.074, 0.070])}, cloud) * (1.0 + 0.16 * rib + 0.22 * grain);
        col = mix(col, ${v3([0.14, 0.125, 0.108])}, speck * 0.48);
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.34 + 0.08 * cloud - 0.04 * rib + 0.18 * speck, 0.22, 0.68);`,
    });
  }

  /* the patio olive's bed: predominantly rich dark Mediterranean humus and loam soil (~85% of the bed), Voronoi soil clods,
     decomposed granite grit, shredded bark mulch, and fine surface rootlets, with small natural cushions of velvety moss (~15%)
     tucked around the outer basalt curb and stones. */
  function groundcover(orig) {
    return code(phys({ envMapIntensity: 0.28, roughness: 0.88 }), 'groundcover', {
      head: GRAV,
      surface: `
        vec3 p = vDrawW;
        float gPx = mix(lkPxM, lkPx, 0.28);
        vec2 dq = p.xz - vec2(0.0, -6.0);                                    // the patio olive's trunk (plan 30, 18)
        float dT = length(dq), ang = atan(dq.y, dq.x);
        float k0 = lkKeep(0.032, gPx), k1 = lkKeep(0.012, gPx), k2 = lkKeep(0.004, gPx);
        // Soil dominates ~85% of the planter bed; moss is restricted to small peripheral cushions near the outer ring (r = 1.48..1.88 m)
        float rootLobe = 0.20 * cos(ang * 8.0 + lkn(p * 2.2) * 2.2);
        float mossPatch = lkn(p * 2.6 + 3.0) * 0.58 + lkn(p * 6.8 + 8.0) * 0.42;
        float outerMoss = smoothstep(1.38, 1.76, dT - rootLobe + (mossPatch - 0.5) * 0.55) * smoothstep(0.50, 0.72, mossPatch);
        float mossK = clamp(outerMoss, 0.0, 1.0);
        float soilK = 1.0 - mossK;
        // 1. Voronoi soil clods, small pebbles, and continuous multi-octave humus & loam relief (zero flat contour rings)
        vec4 c0 = k0 > 0.001 ? gvCells(p.xz * 28.0 + 5.0) : vec4(0.3, 0.6, 0.5, 0.5);
        vec4 c1 = k1 > 0.001 ? gvCells(p.xz * 68.0 + 19.0) : vec4(0.3, 0.6, 0.5, 0.5);
        float e0 = c0.y - c0.x, e1 = c1.y - c1.x;
        float clod0 = clamp(e0 * 2.1, 0.0, 1.0) * k0;
        float clod1 = clamp(e1 * 2.2, 0.0, 1.0) * k1;
        float gap0 = (1.0 - smoothstep(0.0, 0.16 + gPx * 18.0, e0)) * k0;
        float gap1 = (1.0 - smoothstep(0.0, 0.18 + gPx * 28.0, e1)) * k1;
        vec4 humus = lkFbm(p, 4.2, 0.56, 4, gPx) + 0.70 * lkFbm(p + 4.2, 16.0, 0.58, 4, gPx);
        float crumb = (lkn(p * 52.0) - 0.5) * k1 + 0.75 * (lkn(p * 135.0 + 2.0) - 0.5) * k2 + 0.55 * (lkn(p * 280.0 + 5.0) - 0.5) * k2;
        // Subtle radiating fine surface rootlets embedded in the soil near the trunk
        float rWarp = (lkn(vec3(dq * 3.5, 1.0)) - 0.5) * 0.65 + (lkn(vec3(dq * 9.5, 4.0)) - 0.5) * 0.25;
        float rWave = pow(0.5 + 0.5 * cos((ang + rWarp) * 16.0), 6.0) * smoothstep(0.25, 0.50, dT) * (1.0 - smoothstep(1.10, 1.65, dT)) * k0;
        // Rich dark Mediterranean soil, roasted bark humus, warm mineral pebbles, and pale granite grit
        float isPebble = smoothstep(0.76, 0.90, c0.z) * k0 + 0.65 * smoothstep(0.78, 0.92, c1.z) * k1;
        float isMulch = smoothstep(0.74, 0.88, c1.w) * k1;
        vec3 earth = mix(${v3([0.028, 0.019, 0.013])}, ${v3([0.078, 0.055, 0.036])}, clamp(0.48 + humus.x * 1.35 + 0.24 * (c0.z - 0.5) * k0, 0.0, 1.0));
        earth *= (0.86 + 0.26 * clod0 + 0.22 * clod1) * (1.0 - 0.35 * gap0 - 0.25 * gap1) * (1.0 + 0.38 * crumb);
        earth = mix(earth, ${v3([0.125, 0.082, 0.048])}, clamp(isMulch * 0.65 + rWave * 0.55, 0.0, 0.85));
        earth = mix(earth, ${v3([0.225, 0.202, 0.172])} * (0.75 + 0.45 * c0.w), clamp(isPebble * 0.68, 0.0, 0.78));
        // 2. Natural peripheral cushions of velvety bryophyte moss (~15% of the bed)
        vec4 mound = lkFbm(p, 4.0, 0.55, 4, gPx) + 0.65 * lkFbm(p + 7.0, 13.0, 0.56, 4, gPx);
        float mLeaf = (lkn(p * 85.0) - 0.5) * k1 + 0.7 * (lkn(p * 210.0 + 3.0) - 0.5) * k2;
        vec3 green = mix(${v3([0.022, 0.046, 0.015])}, ${v3([0.076, 0.122, 0.036])}, clamp(0.5 + mound.x * 1.65, 0.0, 1.0));
        green = mix(green, ${v3([0.125, 0.152, 0.046])}, clamp(0.35 + mound.x * 1.4, 0.0, 1.0) * 0.42);
        green *= 1.0 + 0.36 * mLeaf - 0.25 * gap1;
        vec3 col = mix(green, earth, soilK);
        float hSoil = 0.0052 * humus.x + 0.0046 * clod0 + 0.0028 * clod1 - 0.0032 * gap0 - 0.0018 * gap1 + 0.0032 * rWave + 0.0026 * isPebble + 0.0011 * crumb;
        float hMoss = 0.0095 * mound.x + 0.0022 * clod1 + 0.0012 * mLeaf + 0.0025 * mossK;
        float h = mix(hMoss, hSoil, soilK);
        ${SLOPE('h')}
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(mix(0.84 - 0.08 * mound.x, 0.88 - 0.12 * isPebble - 0.06 * clod0 + 0.08 * gap0, soilK), 0.62, 0.98);`,
    });
  }

  /* the master bedroom's rug (18 Oct, Sam: "And the carpet, make it like a premium carpet in terms of texture").
     Museum-grade hand-knotted Tibetan wool and bamboo-silk architectural carpet matching ref_master_bed_wall_upgrade:
     - Outer border (rugPileB, lat = false): deep corded 1.8 cm wool ribs running parallel to each border edge and mitering
       at 45 degrees at the four corners, with cross-weft yarn knots every 9 mm and a bound selvedge edge.
     - Inner field (rugPile, lat = true): plush hand-knotted wool and bamboo-silk pile with stepped carved perimeter frame
       channels, fine 1.5 cm longitudinal carved pile ribs, multi-tone yarn slubbing, loom abrash, and silk sheen. */
  function rugPile(orig, key, base, lat) {
    return code(phys({
      envMapIntensity: lat ? 0.38 : 0.32,
      roughness: lat ? 0.84 : 0.89,
      sheen: 1.0,
      sheenRoughness: lat ? 0.44 : 0.54,
      sheenColor: new THREE.Color(base[0] * 0.85 + 0.05, base[1] * 0.84 + 0.05, base[2] * 0.80 + 0.04),
    }), key, {
      surface: `
        vec3 p = vDrawW;
        vec2 q = p.xz;
        float rPx = mix(lkPxM, lkPx, 0.28);
        float pxPlan = p.x + 30.0, pyPlan = p.z + 24.0;
        float kRib  = lkKeep(0.016, rPx);
        float kWeft = lkKeep(0.0085, rPx);
        float kTuft = lkKeep(0.0032, rPx);
        float kFine = lkKeep(0.0015, rPx);

        // Relative coordinates around the Master Bedroom rug center (47.25, 34.90)
        float dx = pxPlan - 47.25, dy = pyPlan - 34.90;
        float adx = abs(dx), ady = abs(dy);
        // Miter coordinate: > 0 on East/West wings, < 0 on North/South wings
        float miter = (adx - 2.35) - (ady - 1.28);
        bool ewWing = miter > 0.0;

        // Multi-scale hand-knotted wool tuft & hand-spun yarn slub
        float tuft1 = mix(0.5, lkn(vec3(q * 280.0, 1.0)), kTuft);
        float tuft2 = mix(0.5, lkn(vec3(q * 620.0, 2.0)), kFine);
        float abr = lkn(vec3(q.x * 0.55, q.y * 5.2, 3.0)) * 0.65 + lkn(vec3(q * 1.8, 4.0)) * 0.35;
        float silkCloud = smoothstep(0.32, 0.76, lkn(vec3(q * vec2(1.4, 2.6), 6.0)));

        ${lat ? `
        // INNER FIELD (rugPile): x in 44.90..49.60 (adx <= 2.35), y in 33.62..36.18 (ady <= 1.28)
        float dEdgeX = 2.35 - adx, dEdgeY = 1.28 - ady;
        float dField = min(dEdgeX, dEdgeY);
        float aa = max(0.0035, rPx * 1.15);
        // Stepped carved architectural border channels at 2.5 cm, 11 cm, and 22 cm inside the field edge
        float ch1 = 1.0 - smoothstep(0.005, 0.005 + aa, abs(dField - 0.025));
        float ch2 = 1.0 - smoothstep(0.005, 0.005 + aa, abs(dField - 0.110));
        float ch3 = 1.0 - smoothstep(0.005, 0.005 + aa, abs(dField - 0.220));
        // Mitered corner diagonal relief lines in the outer 22 cm band of the field
        float inBand = 1.0 - smoothstep(0.215, 0.225, dField);
        float miterGroove = (1.0 - smoothstep(0.004, 0.004 + aa, abs(miter))) * inBand;
        // Rib orientation: in the outer 22 cm frame band, ribs miter around the perimeter; in the center field, longitudinal ribs along X
        float across = (dField < 0.22 && !ewWing) ? dy : dx;
        float along  = (dField < 0.22 && !ewWing) ? dx : dy;
        float rCoord = across / 0.0155;
        float rIdx = floor(rCoord), rFrac = fract(rCoord);
        float wCoord = (along + lkH2(vec2(rIdx, 2.0)) * 0.008) / 0.0080;
        float wIdx = floor(wCoord), wFrac = fract(wCoord);
        float ribWave = mix(0.62, sin(3.14159 * rFrac), kRib);
        float ribGroove = mix(0.18, pow(1.0 - sin(3.14159 * rFrac), 2.4), kRib);
        float knotWave = mix(0.65, sin(3.14159 * wFrac), kWeft * kRib);
        float yarnTone = mix(0.5, lkH2(vec2(rIdx, floor(along / 0.045))), kRib);
        // Subtle tone-on-tone carved geometric horizon bands across the center field
        float geoBand = smoothstep(0.22, 0.23, dField) * (1.0 - smoothstep(0.004, 0.004 + aa, abs(fract((dy + 0.27) / 0.54) - 0.5) * 0.54 - 0.25));
        float carve = clamp(ch1 + ch2 * 0.90 + ch3 * 0.85 + miterGroove * 0.85 + geoBand * 0.65, 0.0, 1.0);
        float h = 0.0022 * ribWave * (0.76 + 0.24 * knotWave) - 0.0014 * ribGroove - 0.0028 * carve + 0.0012 * (tuft1 - 0.5) + 0.0005 * (tuft2 - 0.5);
        ${SLOPE('h')}
        lkG *= lkFlat(lkWN);
        vec3 woolCol = ${v3(base)} * (0.90 + 0.18 * abr) * (0.90 + 0.20 * yarnTone);
        vec3 silkCol = ${v3([0.62, 0.575, 0.505])} * (0.94 + 0.14 * abr);
        vec3 col = mix(woolCol, silkCol, silkCloud * 0.46 + 0.18 * smoothstep(0.22, 0.24, dField));
        col *= (0.78 + 0.34 * ribWave * (0.82 + 0.18 * knotWave)) * (1.0 - 0.22 * ribGroove);
        col *= (0.86 + 0.26 * tuft1) * (0.94 + 0.12 * tuft2) * (1.0 - 0.34 * carve);
        diffuseColor.rgb = col;
        roughnessFactor = clamp(0.86 - 0.12 * silkCloud - 0.06 * ribWave + 0.08 * carve, 0.62, 0.96);
        ` : `
        // OUTER CORDED BORDER (rugPileB): heavy 1.8 cm architectural wool ribs mitered at 45 degrees at the four corners
        float dOuter = min(2.95 - adx, 1.85 - ady);
        float bind = (pxPlan > 44.0) ? (1.0 - smoothstep(0.028, 0.036, dOuter)) : 0.0;
        float aa = max(0.0035, rPx * 1.15);
        float miterSeam = (pxPlan > 44.0) ? (1.0 - smoothstep(0.004, 0.004 + aa, abs(miter))) : 0.0;
        float across = ewWing ? dx : dy;
        float along  = ewWing ? dy : dx;
        float rCoord = across / 0.0185;
        float rIdx = floor(rCoord), rFrac = fract(rCoord);
        float wCoord = (along + lkH2(vec2(rIdx, 5.0)) * 0.009) / 0.0095;
        float wIdx = floor(wCoord), wFrac = fract(wCoord);
        float ribWave = mix(0.64, sin(3.14159 * rFrac), kRib);
        float ribGroove = mix(0.20, pow(1.0 - sin(3.14159 * rFrac), 2.6), kRib);
        float knotWave = mix(0.65, sin(3.14159 * wFrac), kWeft * kRib);
        float yarnTone = mix(0.5, lkH2(vec2(rIdx, wIdx)), kWeft);
        float h = 0.0028 * ribWave * (0.74 + 0.26 * knotWave) - 0.0018 * ribGroove - 0.0022 * miterSeam + 0.0011 * (tuft1 - 0.5) + 0.0005 * (tuft2 - 0.5);
        ${SLOPE('h')}
        lkG *= lkFlat(lkWN);
        vec3 col = ${v3(base)} * (0.91 + 0.16 * abr) * (0.90 + 0.20 * yarnTone);
        col *= (0.74 + 0.38 * ribWave * (0.80 + 0.20 * knotWave)) * (1.0 - 0.28 * ribGroove);
        col *= (0.86 + 0.26 * tuft1) * (0.94 + 0.12 * tuft2) * (1.0 - 0.30 * miterSeam);
        col = mix(col, ${v3([0.34, 0.30, 0.25])} * (0.88 + 0.20 * sin(along / 0.010 * 6.28318)), bind * 0.85);
        diffuseColor.rgb = col;
        roughnessFactor = clamp(0.89 - 0.07 * ribWave + 0.06 * ribGroove, 0.72, 0.97);
        `}`,
    });
  }

  /* the dressing room (16 Oct & 18 Oct, Sam: "make the hanging clothes, the folded clothes on each shelf or each hanger a
     little bit more realistic... make more texture on the carpet and on the floor and on the furniture").
     A multi-scale luxury cashmere & merino knit for the folded sweaters: sculpted 7.5 mm Fisherman's rib / cable-knit wales,
     3.8 mm V-stitch stockinette loops, 2-ply heathered yarn variation, and a soft cashmere fibre halo. */
  function knit(orig, key, base) {
    return code(phys({ envMapIntensity: 0.34, roughness: 0.89, sheen: 1, sheenRoughness: 0.48, sheenColor: new THREE.Color(base[0] * 0.82 + 0.04, base[1] * 0.82 + 0.04, base[2] * 0.82 + 0.04) }), key, {
      head: SEAM,
      scale: 2.2 / 0.003,
      surface: `
        vec2 q; vec3 ta, tb; lkPlane(lkP, lkWN, q, ta, tb);
        float kPx = mix(lkPxM, lkPx, 0.22);
        // 1. Macro 7.5 mm Fisherman's rib / cable-knit wales with subtle braided cable undulation
        float kRib = lkKeep(0.0075, kPx);
        float cWave = 0.0009 * sin(q.y / 0.019 * 6.28318);
        float wCoord = (q.x + cWave) / 0.0075, wIdx = floor(wCoord), wFrac = fract(wCoord);
        float wRib = mix(0.58, sin(3.14159 * wFrac), kRib);
        float purlGroove = mix(0.18, pow(1.0 - sin(3.14159 * wFrac), 2.4), kRib);
        float waleTone = mix(0.5, lkH2(vec2(wIdx, floor(q.y / 0.032))), kRib);
        // 2. Medium 3.8 mm x 2.8 mm V-stitch stockinette loops & plied course twist
        vec2 st = vec2((q.x + cWave * 0.5) / 0.0038, q.y / 0.0028);
        float wi = floor(st.x), fx = fract(st.x) - 0.5;
        float rw = st.y - abs(fx) * 1.15, ri = floor(rw), fy = fract(rw);
        float k1 = lkKeep(0.0038, kPx);
        float loop = mix(0.52, (1.0 - pow(abs(fx) * 2.0, 1.85)) * smoothstep(0.0, 0.38, fy) * (1.0 - smoothstep(0.62, 1.0, fy)), k1);
        float yarn = mix(0.5, lkH2(vec2(wi, ri)), k1);
        float fuzz = lkFbm(vec3(q, 3.0), 48.0, 0.6, 3, kPx).x;
        float h = 0.0013 * wRib - 0.00085 * purlGroove + 0.00075 * (loop - 0.5) + 0.00028 * fuzz;
        ${SLOPE('h')}
        lkG *= lkFlat(lkWN) * 0.65 + 0.35;
        vec3 col = ${v3(base)} * (0.76 + 0.38 * wRib) * (1.0 - 0.24 * purlGroove) * (0.84 + 0.28 * loop);
        col *= (0.90 + 0.20 * yarn) * (0.92 + 0.16 * waleTone) * (1.0 + 0.07 * lkn(vec3(q * 3.5, 5.0)));
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.88 + 0.07 * (1.0 - loop) - 0.05 * wRib, 0.72, 0.97);
        ${CLOTH_SEAM(0.0028)}`,
    });
  }

  /* the dressing room's runner (16 Oct & 18 Oct, Sam: "make more texture on the carpet and on the floor and on the furniture").
     Heavy architectural hand-loomed corded wool-and-bouclé runner carpet matching ref_dressing_room_upgrade:
     - Combines 9.5 mm longitudinal bouclé warp cords (across q.y, zero foreshortening down the corridor) with 13.5 mm
       heavy plied weft ribs (along q.x), so both close-up weft knots and full-corridor longitudinal ribs read crisply.
     - Framed by a mitered perimeter border with dual warm champagne-taupe pinstripes, carved border channels, and a
       whipped corded selvedge edge. Plan y from y0 to y1, plan x from 51.0 to 58.35. */
  function runnerWeave(orig, key, base, y0, y1) {
    const A0 = W(0, y0)[2], A1 = W(0, y1)[2], X0 = W(51.0, 0)[0], X1 = W(58.35, 0)[0];
    return code(phys({ envMapIntensity: 0.32, roughness: 0.89, sheen: 1, sheenRoughness: 0.50, sheenColor: new THREE.Color(0.14, 0.125, 0.108) }), key, {
      scale: 2.4 / 0.003,
      surface: `
        vec2 q = vDrawW.xz;
        float rPx = mix(lkPxM, lkPx, 0.20);
        float pxY = max(fwidth(q.y) * 0.58, 1e-4), pxX = min(rPx, max(fwidth(q.x) * 0.58, 1e-4));
        float kWarp = lkKeep(0.0095, pxY);
        float kWeft = lkKeep(0.0135, pxX);
        float kFine = lkKeep(0.0042, min(pxY, rPx));
        // Distance to long edges (ey) and short ends (ex) for mitered border frame
        float ey = min(q.y - ${f(A0)}, ${f(A1)} - q.y);
        float ex = min(q.x - ${f(X0)}, ${f(X1)} - q.x);
        float e = min(ey, ex);
        // 1. Longitudinal 9.5 mm bouclé warp cords (never foreshortened when looking down the corridor)
        float wy = q.y / 0.0095, wyi = floor(wy), wyf = fract(wy);
        float warpRib = mix(0.62, sin(3.14159 * wyf), kWarp);
        float warpGroove = mix(0.20, pow(1.0 - sin(3.14159 * wyf), 2.5), kWarp);
        // 2. Transverse 13.5 mm heavy plied weft cords & basketweave bouclé knots
        float wx = (q.x + lkH2(vec2(wyi, 3.0)) * 0.0065) / 0.0135, wxi = floor(wx), wxf = fract(wx);
        float weftRib = mix(0.64, sin(3.14159 * wxf), kWeft);
        float weftGroove = mix(0.18, pow(1.0 - sin(3.14159 * wxf), 2.3), kWeft);
        // 3. Fine 4.2 mm 2-ply twisted yarn ribs & micro-tufting
        float tw = mix(0.5, 0.5 + 0.5 * sin((q.y / 0.0042 + wxf * 1.5) * 6.28318), kFine);
        float tuft = (lkn(vec3(q * vec2(120.0, 180.0), 2.0)) - 0.5) * kFine;
        float yarn = mix(0.5, lkH2(vec2(wxi, wyi)), max(kWeft, kWarp * 0.7));
        float waleTone = mix(0.5, lkH2(vec2(wyi, floor(q.x / 0.065))), kWarp);
        float abr = lkn(vec3(q.x * 1.4, q.y * 0.6, 3.0)) * 0.6 + lkn(vec3(q * 4.5, 7.0)) * 0.4;
        // 4. Tailored perimeter border: bound selvedge tape (2.4 cm), dual champagne-taupe pinstripes (5.6 cm & 8.2 cm), and carved channel
        float aa = max(0.0022, min(pxY, rPx) * 1.1);
        float tape = 1.0 - smoothstep(0.022, 0.026, e);
        float whip = sin((ey < ex ? q.x : q.y) / 0.0085 * 6.28318) * kWarp;
        float pin1 = smoothstep(0.052 - aa, 0.055, e) * (1.0 - smoothstep(0.062, 0.065 + aa, e));
        float pin2 = smoothstep(0.078 - aa, 0.081, e) * (1.0 - smoothstep(0.086, 0.089 + aa, e));
        float pin = clamp(pin1 + pin2 * 0.85, 0.0, 1.0);
        float borderCarve = (1.0 - smoothstep(0.003, 0.003 + aa, abs(e - 0.050))) + (1.0 - smoothstep(0.003, 0.003 + aa, abs(e - 0.092)));
        borderCarve = clamp(borderCarve, 0.0, 1.0);
        float h = 0.0022 * weftRib * (0.65 + 0.35 * warpRib) + 0.0018 * warpRib - 0.0014 * warpGroove - 0.0011 * weftGroove
                + 0.0005 * (tw - 0.5) + 0.0006 * tuft - 0.0016 * borderCarve - 0.0009 * tape * (1.0 - 0.35 * whip);
        ${SLOPE('h')}
        lkG *= lkFlat(lkWN);
        // Heathered charcoal-taupe, warm espresso, and stone-oatmeal two-tone bouclé yarns
        vec3 darkWool = ${v3(base)} * 0.68;
        vec3 lightWool = ${v3([0.235, 0.208, 0.178])};
        vec3 col = mix(darkWool, lightWool, clamp(0.28 + 0.42 * waleTone + 0.30 * yarn, 0.0, 1.0));
        col *= (0.70 + 0.42 * weftRib * (0.78 + 0.22 * warpRib)) * (0.78 + 0.34 * warpRib) * (1.0 - 0.28 * warpGroove - 0.20 * weftGroove);
        col *= (0.90 + 0.20 * tw) * (0.88 + 0.24 * abr) * (1.0 - 0.32 * borderCarve);
        col = mix(col, ${v3([0.38, 0.335, 0.275])} * (0.78 + 0.34 * warpRib), pin * 0.88);
        col = mix(col, ${v3(base)} * 0.54 * (0.84 + 0.22 * whip + 0.16 * yarn), tape);
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.90 - 0.08 * weftRib - 0.06 * warpRib + 0.06 * warpGroove, 0.72, 0.97);`,
    });
  }

  /* the gallery's bronzes (16 Oct, Sam: "work on the sculpture, make it a little bit more realistic, polishing the texture").
     Cast bronze, finished by hand: polished bright where a hand would rub it, a patina gathering in soft blotches elsewhere
     (darker, browner, a little green), fine streaks of the polishing along the form, the odd pit from the casting. */
  function castBronze(orig, key, base, patina, polish) {
    return code(phys({ metalness: 1, roughness: 0.3, envMapIntensity: 1.2, clearcoat: 0.25, clearcoatRoughness: 0.35 }), key, {
      surface: `
        vec3 p = lkP;
        float blot = smoothstep(0.42, 0.7, lkn(p * 6.0) * 0.65 + lkn(p * 17.0 + 3.0) * 0.35);
        float rub = smoothstep(0.55, 0.85, lkn(p * vec3(2.0, 0.8, 2.0) + 7.0)) * ${f(polish)};
        float pat = blot * (1.0 - rub);
        float streak = mix(0.5, lkn(vec3(p.x * 380.0, p.y * 9.0, p.z * 380.0)), lkKeep(0.002, lkPx));
        float pit = smoothstep(0.86, 0.95, lkn(p * 260.0 + 11.0)) * lkKeep(0.0015, lkPx);
        float h = 0.00003 * streak - 0.00012 * pit;
        ${SLOPE('h')}
        vec3 col = mix(${v3(base)}, ${v3(patina)}, pat * 0.85) * (0.92 + 0.16 * streak) * (1.0 - 0.5 * pit);
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(mix(0.16, 0.5, pat) + 0.08 * (streak - 0.5) + 0.3 * pit, 0.08, 0.8);`,
    });
  }

  /* velvet: the headboard, the bed's upholstered platform rails, and the olive lumbar cushions.
     Brushed Italian suede-velvet and mohair pile with directional nap crush, fine micro-tufts, and French piped cushion seams. */
  function velvet(orig, key, base) {
    return code(phys({ envMapIntensity: 0.38, roughness: 0.84, sheen: 1, sheenRoughness: 0.28, sheenColor: new THREE.Color(base[0] * 1.55 + 0.05, base[1] * 1.52 + 0.05, base[2] * 1.48 + 0.04) }), key, {
      head: SEAM,
      surface: `
        vec3 p = lkP;
        vec2 q; vec3 ta, tb; lkPlane(p, lkWN, q, ta, tb);
        float vPx = mix(lkPxM, lkPx, 0.30);
        float crush = lkn(p * vec3(2.8, 7.5, 2.8)) * 0.58 + lkn(p * 12.0 + 2.0) * 0.42;
        float nap = (lkn(vec3(q.x * 28.0, q.y * 140.0, 3.0)) - 0.5) * lkKeep(0.008, vPx);
        float pile = mix(0.5, lkn(p * 850.0), lkKeep(0.0014, vPx));
        float weave = (sin(q.x * 950.0) * sin(q.y * 950.0)) * lkKeep(0.0022, vPx);
        float h = 0.00005 * pile + 0.00034 * crush + 0.00018 * nap + 0.00008 * weave;
        ${SLOPE('h')}
        diffuseColor.rgb *= ${v3(base)} * (0.86 + 0.26 * crush + 0.10 * nap) * (0.95 + 0.10 * pile);
        roughnessFactor = clamp(0.82 + 0.10 * crush - 0.06 * nap, 0.68, 0.95);
        ${CLOTH_SEAM(0.0030)}`,
    });
  }

  /* the patio and garden pools' water (16 Oct & 18 Oct, Sam: "make sure it moves and we have nice water movement, slight, slow,
     slight... make sure you have to add texture to the water. Right now the water is weak").
     Slow, gentle multi-directional surface swells and capillary ripples tilt the surface normal so sky and architecture shimmer
     softly, while a double-layer Voronoi/ridge underwater caustic network and refracted mosaic tile grid dance across the sunlit
     turquoise-azure floor. */
  function poolWater(orig) {
    return code(phys({ roughness: 0.055, metalness: 0.02, envMapIntensity: 0.68, clearcoat: 0.52, clearcoatRoughness: 0.08 }), 'poolWater2', {
      head: 'uniform float uTimeW;',
      surface: `
        float t = uTimeW * 0.40; vec2 q = vDrawW.xz;
        float wPx = mix(lkPxM, lkPx, 0.25);
        float kMed = lkKeep(0.08, wPx), kFine = lkKeep(0.028, wPx), kTile = lkKeep(0.018, wPx);
        // Slow, slight multi-directional wave swells and fine capillary ripples
        float w1 = lkn(vec3(q * 1.15 + vec2(t * 0.14, t * 0.09), t * 0.07));
        float w2 = lkn(vec3(q * 2.65 - vec2(t * 0.19, -t * 0.13), 4.0 + t * 0.10));
        float w3 = lkn(vec3(q * 5.80 + vec2(-t * 0.24, t * 0.21), 9.0 + t * 0.13)) * kMed;
        float w4 = (sin(q.x * 16.0 + q.y * 11.0 + t * 1.15 + w1 * 3.2) * 0.5 + 0.5) * kFine;
        float h = 0.0072 * w1 + 0.0040 * w2 + 0.0019 * w3 + 0.0007 * w4;
        ${SLOPE('h')}
        // Refracted underwater floor coordinates
        vec2 rq = q + vec2(w1 - 0.5, w2 - 0.5) * 0.22 + (w3 - 0.5) * 0.07;
        // Double-layer sunlit underwater caustic network (crisp intersecting light filaments)
        float c1a = 1.0 - abs(2.0 * lkn(vec3(rq * 2.45 + vec2(t * 0.16, -t * 0.11), t * 0.15)) - 1.0);
        float c1b = 1.0 - abs(2.0 * lkn(vec3(rq.yx * 2.85 - vec2(t * 0.14, t * 0.18) + 3.7, t * 0.17 + 2.0)) - 1.0);
        float c2a = 1.0 - abs(2.0 * lkn(vec3(rq * 5.20 + vec2(-t * 0.22, t * 0.19) + 7.1, t * 0.22)) - 1.0);
        float caustic1 = pow(clamp(0.55 * c1a + 0.45 * c1b, 0.0, 1.0), 4.0) * lkKeep(0.14, wPx);
        float caustic2 = (pow(c1a, 5.2) + pow(c1b, 5.2) + 0.65 * pow(c2a, 5.8)) * lkKeep(0.10, wPx);
        // Subtle submerged 10x10 cm glass-mosaic tile grid on the pool floor, refracted through the moving water
        vec2 tc = fract(rq / 0.10);
        vec2 td = min(tc, 1.0 - tc);
        float tileGroove = (1.0 - smoothstep(0.03, 0.11, min(td.x, td.y))) * kTile;
        float tileTone = (lkH2(floor(rq / 0.10)) - 0.5) * 0.12 * kTile;
        // Refracted plan coordinates for perimeter depth shading & 4 submerged Roman travertine entry steps
        vec2 pl = rq + vec2(30.0, 24.0);
        float isGarden = step(45.0, pl.x);
        float dEdgeP = min(min(pl.x - 24.2, 37.8 - pl.x), min(pl.y - 25.6, 30.4 - pl.y));
        float dEdgeG = min(min(pl.x - 50.42, 61.55 - pl.x), min(pl.y - 47.22, 49.55 - pl.y));
        float dEdge = mix(dEdgeP, dEdgeG, isGarden);
        float edgeShade = 0.68 + 0.32 * smoothstep(0.0, 0.70, dEdge);
        // 4 submerged travertine stair treads at the West end of each pool (0.42 m tread width each)
        float sxP = (pl.x - 24.2) / 0.42;
        float inStairP = (1.0 - isGarden) * step(0.0, sxP) * (1.0 - smoothstep(3.92, 4.02, sxP)) * (1.0 - smoothstep(28.0, 28.12, pl.y));
        float sxG = (pl.x - 50.42) / 0.38;
        float inStairG = isGarden * step(0.0, sxG) * (1.0 - smoothstep(2.92, 3.02, sxG)) * (1.0 - smoothstep(48.45, 48.55, pl.y));
        float sx = mix(sxP, sxG, isGarden);
        float inStair = clamp(inStairP + inStairG, 0.0, 1.0);
        float stepIdx = floor(clamp(sx, 0.0, 3.0));
        float stepFrac = fract(sx);
        float riserLine = inStair * (1.0 - smoothstep(0.0, 0.10, 1.0 - stepFrac));
        float treadDepth = clamp(1.0 - stepIdx * 0.24, 0.20, 1.0) * inStair;
        // Luminous Mediterranean turquoise-azure pool water with sunlit caustic filaments and travertine stair treads
        vec3 deepWater = mix(${v3([0.009, 0.072, 0.102])}, ${v3([0.028, 0.138, 0.178])}, 0.5 * w1 + 0.5 * w2);
        vec3 travStep = ${v3([0.22, 0.25, 0.22])} * (1.0 - 0.38 * riserLine);
        vec3 baseCol = mix(deepWater * edgeShade, travStep, treadDepth * 0.72) * (1.0 + tileTone - 0.14 * tileGroove);
        vec3 causticCol = ${v3([0.10, 0.25, 0.28])} * caustic1 + ${v3([0.16, 0.33, 0.34])} * caustic2;
        diffuseColor.rgb = baseCol + causticCol * (0.65 + 0.35 * edgeShade);
        roughnessFactor = clamp(0.045 + 0.020 * w3, 0.035, 0.085);`,
    });
  }

  // Flat architectural matte wall paint shared across the whole house: slightly darker and warmer than the white ceiling,
  // with zero clouds, brush strokes, or blotchy mottle so close-up walls stay crisp and uniform at every zoom level.
  function flatWall(orig, base, key) {
    return code(phys({ envMapIntensity: 0.55, roughness: 0.94, specularIntensity: 0.06 }), key || 'flatWall', {
      surface: `
        vec2 q; vec3 ta, tb; lkPlane(lkP, lkWN, q, ta, tb);
        float wPx = mix(lkPxM, lkPx, 0.5);
        vec4 sand = lkFbm(vec3(q, 0.5), 750.0, 0.5, 2, wPx);
        lkG = (ta * sand.y + tb * sand.z) * 0.00002 * lkFlat(lkWN);
        vec3 col = ${v3(base)} * (1.0 + 0.005 * sand.x);
        // Glass Gallery east wall (x = 43.77, y = 8.8..31.2): 7 focused ceiling spotlight scallops aimed at each painting (y = 10.9 + i * 3.0)
        float pxPlan = vDrawW.x + 30.0, pyPlan = vDrawW.z + 24.0, pzH = vDrawW.y;
        float onGalEast = step(43.65, pxPlan) * step(pxPlan, 43.95) * smoothstep(8.8, 9.3, pyPlan) * (1.0 - smoothstep(30.7, 31.2, pyPlan)) * step(lkWN.x, -0.5);
        if (onGalEast > 0.01) {
          float pIdx = clamp(floor((pyPlan - 9.4) / 3.0), 0.0, 6.0);
          float pyC = 10.9 + pIdx * 3.0;
          float dy = pyPlan - pyC;
          // Parabolic spotlight cone descending from the centered ceiling slot (z = 3.59, x = 42.50) onto the painting at (x = 43.77, z = 1.72)
          float hFromTop = clamp((3.48 - pzH) / 2.65, 0.0, 1.0);
          float coneW = mix(0.22, 1.18, pow(hFromTop, 0.65));
          float rCone = length(vec2(dy / max(coneW, 0.1), (pzH - 1.92) / 1.38));
          float beam = (1.0 - smoothstep(0.10, 1.04, rCone)) * smoothstep(3.52, 2.82, pzH) * smoothstep(0.35, 1.10, pzH);
          // Upper hyperbolic scallop arch above each frame (z = 2.55..3.38)
          float archY = 3.30 - 0.56 * (dy * dy) / 0.56;
          float scallop = smoothstep(archY + 0.14, archY - 0.28, pzH) * (1.0 - smoothstep(0.55, 1.18, abs(dy))) * smoothstep(0.45, 1.45, pzH);
          float spotGlow = clamp(0.75 * beam + 0.72 * scallop, 0.0, 1.0) * onGalEast;
          // Crisp contact shadow cast by the 6.8 cm deep floating frame (w = 1.35 m, h = 1.75 m around z = 1.72)
          float inFrameShadow = (1.0 - smoothstep(0.65, 0.74, abs(dy))) * (1.0 - smoothstep(0.85, 0.94, abs(pzH - 1.68)));
          col *= 1.0 - 0.26 * inFrameShadow * onGalEast;
          totalEmissiveRadiance += ${v3([0.42, 0.31, 0.17])} * spotGlow * (1.0 - 0.65 * inFrameShadow);
        }
        // Master Bedroom east wall (x = 50.85, y = 35.4..38.6): warm perimeter LED backlight halo behind the Architectural Vanity Mirror (y = 36.18..37.82, z = 0.88..2.28)
        float onBedEast = step(50.70, pxPlan) * step(pxPlan, 50.95) * step(35.3, pyPlan) * step(pyPlan, 38.7) * step(lkWN.x, -0.5);
        if (onBedEast > 0.01) {
          float dMirY = max(abs(pyPlan - 37.00) - 0.82, 0.0);
          float dMirZ = max(abs(pzH - 1.58) - 0.70, 0.0);
          float dMir = length(vec2(dMirY, dMirZ));
          float mirHalo = exp(-dMir * 9.5) * smoothstep(0.0, 0.015, dMir + 0.01) * onBedEast;
          totalEmissiveRadiance += ${v3([0.36, 0.26, 0.15])} * mirHalo;
        }
        // Master Bathroom west wall (x = 51.13, y = 35.3..40.7): warm perimeter LED backlight halo behind the Bath Mirror (y = 35.58..38.62, z = 1.00..2.52) and picture-light wash on the Bath painting (y = 39.85, z = 1.85)
        float onBathWest = step(51.05, pxPlan) * step(pxPlan, 51.25) * step(35.3, pyPlan) * step(pyPlan, 40.7) * step(0.5, lkWN.x);
        if (onBathWest > 0.01) {
          float dBMirY = max(abs(pyPlan - 37.10) - 1.52, 0.0);
          float dBMirZ = max(abs(pzH - 1.76) - 0.76, 0.0);
          float dBMir = length(vec2(dBMirY, dBMirZ));
          float bMirHalo = exp(-dBMir * 8.5) * smoothstep(0.0, 0.014, dBMir + 0.01) * onBathWest;
          float dyArt = pyPlan - 39.85;
          float dzArt = pzH - 1.92;
          float artWash = exp(-(dyArt * dyArt * 2.1 + dzArt * dzArt * 1.35)) * smoothstep(2.74, 2.38, pzH) * onBathWest;
          totalEmissiveRadiance += ${v3([0.34, 0.25, 0.14])} * (bMirHalo + 0.55 * artWash);
        }
        diffuseColor.rgb *= col;
        roughnessFactor = 0.94;`,
    });
  }
  /* architectural ripplefold curtain linen: semi-sheer wide-width Belgian flax and bouclé-linen drapery across the
     kitchen and dining room's 13 m north window and the Master Bedroom's South and West glass walls.
     (18 Oct, Sam: "make sure the curtains are light. Feel light because we have a strong floor. Make sure the texture is premium":
     in the Master Bedroom (p.z > 7.5), the curtains render in an extra-light, airy Warm Alabaster & Pearl-Ivory Belgian Voile-Linen
     with luminous sunlit translucency that contrasts cleanly against the strong dark Nero Marquina marble floor.) */
  function curtainLinen(orig) {
    return code(phys({
      envMapIntensity: 0.36,
      roughness: 0.78,
      sheen: 1.0,
      sheenRoughness: 0.34,
      sheenColor: new THREE.Color(0.84, 0.80, 0.72),
      emissive: new THREE.Color(0.46, 0.42, 0.36),
      emissiveIntensity: 1.0,
    }), 'curtainLinen', {
      surface: `
        vec3 p = vDrawW;
        bool isBedCurtain = p.z > 7.5;
        bool hasCloth = vLkUv.x > 50.0;
        float u = hasCloth ? (vLkUv.x - 100.0) : (abs(lkWN.x) > abs(lkWN.z) ? p.z + 24.0 : p.x + 30.0);
        float v = p.y;
        float crest = hasCloth ? clamp(vLkUv.y - 100.0, -1.0, 1.0) : sin(u * 52.0);
        float cPx = mix(lkPxM, lkPx, 0.25);
        float vWeft = v + 0.0022 * crest;
        vec2 q = vec2(u, vWeft);

        // 1. Fine spun Belgian linen warp & weft weave + micro-slub threads (no coarse rectangular blocks)
        float kWeave = lkKeep(0.0024, cPx);
        float kFine  = lkKeep(0.0065, cPx);
        float kMed   = lkKeep(0.0140, cPx);

        // Fine 2.0 mm plain-weave grid with open-weave backlit interstices
        vec2 tg = q / 0.0020, ti = floor(tg), tf = fract(tg);
        float over = mod(ti.x + ti.y, 2.0);
        float warpCyl = sin(3.14159 * tf.x), weftCyl = sin(3.14159 * tf.y);
        float thread = mix(weftCyl, warpCyl, over);
        float pinhole = (1.0 - warpCyl) * (1.0 - weftCyl) * kWeave;
        float weave = kWeave * (thread - 0.5);

        // High-frequency spun-flax vertical warp threads and horizontal weft threads
        float warpThread = ( sin(u * 1450.0 + 1.4 * lkn(vec3(u * 35.0, vWeft * 4.0, 1.0))) * 0.5
                           + sin(u * 890.0  + 1.6 * lkn(vec3(u * 22.0, vWeft * 3.0, 2.0))) * 0.5 ) * kFine;
        float weftThread = ( sin(vWeft * 1520.0 + 1.4 * lkn(vec3(u * 4.0, vWeft * 35.0, 3.0))) * 0.5
                           + sin(vWeft * 940.0  + 1.6 * lkn(vec3(u * 3.0, vWeft * 22.0, 4.0))) * 0.5 ) * kFine;

        // Delicate millimeter-scale linen slubs along warp and weft
        float warpSlub = (lkn(vec3(u * 260.0, vWeft * 14.0, 7.0)) - 0.5) * kFine
                       + 0.7 * (lkn(vec3(u * 125.0, vWeft * 7.5, 9.0)) - 0.5) * kMed;
        float weftSlub = (lkn(vec3(u * 14.0, vWeft * 240.0, 11.0)) - 0.5) * kFine
                       + 0.7 * (lkn(vec3(u * 7.5, vWeft * 115.0, 13.0)) - 0.5) * kMed;
        float slub = warpSlub + weftSlub + 0.45 * (warpThread + weftThread);

        // Soft isotropic cloud variation across the bolt of cloth
        float boltCloud = lkFbm(vec3(q * 0.9, 5.0), 1.4, 0.5, 3, cPx).x;

        // 2. Tailored architectural bottom hem (11 cm), top buckram header (8.5 cm), and center-meet selvedge border (3.8 cm)
        float bottomHem = 1.0 - smoothstep(0.105, 0.118, v);
        float hemStitch = exp(-pow((v - 0.110) / max(0.0028, cPx * 1.15), 2.0));
        float topHeader = smoothstep(3.470, 3.485, v);
        float hdrStitch = exp(-pow((v - 3.475) / max(0.0028, cPx * 1.15), 2.0));
        float leadHem   = hasCloth ? (1.0 - smoothstep(0.034, 0.042, u)) : 0.0;
        float leadStitch = hasCloth ? exp(-pow((u - 0.037) / max(0.0026, cPx * 1.15), 2.0)) : 0.0;
        float headerGather = smoothstep(3.34, 3.55, v) * smoothstep(0.45, 0.95, abs(crest));
        float doubleLayer = clamp(bottomHem + 0.85 * topHeader + 0.80 * leadHem, 0.0, 1.0);
        float stitch = clamp(hemStitch + hdrStitch + leadStitch, 0.0, 1.0);

        // 3. Surface relief heightfield
        float h = 0.00022 * weave
                + 0.00038 * slub
                + 0.00095 * headerGather
                + 0.00090 * bottomHem + 0.00060 * leadHem - 0.00070 * stitch;
        ${SLOPE('h')}

        // 4. 3D Pleat self-shadowing and backlit window translucency
        float nFace = p.z < -23.3 ? abs(lkWN.z) : max(abs(lkWN.x), abs(lkWN.z));
        float flank = 1.0 - clamp(nFace, 0.0, 1.0);
        float foldShade = isBedCurtain
          ? (0.84 + 0.16 * crest) * (1.0 - 0.28 * pow(flank, 1.15)) * (1.0 - 0.05 * headerGather)
          : (0.76 + 0.24 * crest) * (1.0 - 0.40 * pow(flank, 1.12)) * (1.0 - 0.08 * headerGather);

        // Window mullion and jamb silhouette behind the kitchen north curtain (x = 10.5 .. 23.5, 7 mullions every 2.1667 m)
        float planX = p.x + 30.0;
        float inKitchenWin = p.z < -23.3 ? smoothstep(10.46, 10.58, planX) * (1.0 - smoothstep(23.42, 23.54, planX)) : (isBedCurtain ? 0.96 : 0.88);
        float mullDist = abs(fract((planX - 10.5) / 2.16667 + 0.5) - 0.5) * 2.16667;
        float mullShade = p.z < -23.3 ? (1.0 - 0.34 * (1.0 - smoothstep(0.025, 0.105, mullDist))) : 1.0;
        float skyGrad = smoothstep(0.04, 0.50, v) * (1.0 - 0.20 * smoothstep(3.15, 3.56, v));

        // Backlight transmittance: glowing warmly through the single-layer valleys and open weave in each window bay
        float trans = inKitchenWin * mullShade * (0.45 + 0.55 * skyGrad)
                    * pow(clamp(nFace, 0.0, 1.0), isBedCurtain ? 1.08 : 1.28)
                    * (isBedCurtain ? (0.86 - 0.16 * crest) : (0.80 - 0.22 * crest))
                    * (1.0 - 0.42 * doubleLayer)
                    * (1.0 - 0.08 * slub + 0.14 * pinhole);

        // Base linen yarn colour: warm Belgian oatmeal-flax in kitchen, extra-light Warm Alabaster & Pearl-Ivory Voile-Linen in bedroom
        float yarnTone = clamp(0.54 + 0.24 * slub + 0.16 * boltCloud, 0.0, 1.0);
        vec3 baseLinen = isBedCurtain
          ? mix(${v3([0.875, 0.848, 0.798])}, ${v3([0.990, 0.974, 0.942])}, yarnTone)
          : mix(${v3([0.76, 0.705, 0.620])}, ${v3([0.94, 0.898, 0.822])}, yarnTone);
        baseLinen *= (1.0 + 0.09 * weave) * (1.0 - 0.07 * doubleLayer) * (1.0 - 0.16 * stitch);

        diffuseColor.rgb = baseLinen * foldShade;
        vec3 backGlow = isBedCurtain
          ? mix(${v3([0.78, 0.73, 0.64])}, ${v3([1.48, 1.38, 1.22])}, clamp(trans * 1.45, 0.0, 1.0))
          : mix(${v3([0.58, 0.52, 0.44])}, ${v3([1.30, 1.20, 1.03])}, clamp(trans * 1.45, 0.0, 1.0));
        totalEmissiveRadiance *= backGlow * ((isBedCurtain ? 0.44 : 0.32) + 1.12 * trans) * (0.72 + 0.28 * foldShade);
        roughnessFactor = clamp((isBedCurtain ? 0.76 : 0.82) - 0.07 * abs(slub) + 0.06 * weave + 0.06 * flank, 0.54, 0.94);`,
    });
  }
  /* the kitchen's tall cabinet wall: book-matched dark smoked eucalyptus and fumed walnut veneer under a satin architectural
     lacquer, with horizontal grain along the mitered top lintel header and continuous full-height vertical crown-cut cathedrals
     on each actual architectural door leaf (zero mid-door plank splits), contrasting richly with the natural oak island base. */
  function kitchenVeneer(orig) {
    return code(phys({ envMapIntensity: 0.72, roughness: 0.42, clearcoat: 0.24, clearcoatRoughness: 0.25 }), 'kitchenCab', {
      surface: `
        vec2 q; vec3 ta, tb; lkPlane(vDrawW, lkWN, q, ta, tb);
        float pxPlan = vDrawW.x + 30.0, pyPlan = vDrawW.z + 24.0, pzH = vDrawW.y;
        bool isLintel = pzH > 2.568 && pyPlan > 0.468 && pyPlan < 4.532;
        bool isSideCheek = abs(lkWN.z) > 0.5;
        vec2 g = (abs(lkWN.y) >= 0.7 || isLintel) ? q.yx : q;
        // Continuous book-matched leaf ID per actual cabinet bay (zero arbitrary 36 cm mid-door splits)
        float bayId = pyPlan < 0.474 ? 1.0
                    : pyPlan < 1.014 ? 2.0
                    : pyPlan < 1.554 ? 3.0
                    : pyPlan < 1.900 ? 4.0
                    : pyPlan < 2.260 ? (pzH > 1.75 ? 5.0 : 6.0)
                    : pyPlan < 2.620 ? (pzH > 1.75 ? 7.0 : 6.0)
                    : pyPlan < 2.964 ? 8.0
                    : pyPlan < 3.556 ? 9.0
                    : pyPlan < 4.148 ? 10.0
                    : pyPlan < 4.526 ? 11.0 : 12.0;
        float lf = isLintel ? 31.0 : isSideCheek ? 14.0 : bayId;
        float r1 = lkH2(vec2(lf, 3.0)), r2 = lkH2(vec2(lf, 8.0));
        float ac = g.x + r1 * 4.5, al = g.y, px = max(fwidth(ac) * 0.7, 1e-5);
        float wan = 0.0024 * (lkn(vec3(al * 0.32, lf, 1.0)) - 0.5);
        float gl = (ac + wan) / (0.0022 + 0.0010 * r2);
        gl += 0.75 * (lkn(vec3(gl * 0.26, al * 0.70, lf + 3.0)) - 0.5);
        float line = mix(0.26, (1.0 - smoothstep(0.0, 0.26, fract(gl))) * (0.45 + 0.55 * lkH2(vec2(floor(gl), lf))), 1.0 - smoothstep(0.25, 0.6, fwidth(gl)));
        float fib = (lkn(vec3(ac * 680.0, al * 5.0, lf)) - 0.5) * lkKeep(0.0015, px)
                  + 0.65 * (lkn(vec3(ac * 170.0, al * 1.6, lf + 1.0)) - 0.5) * lkKeep(0.005, px);
        float ribbon = lkn(vec3(ac * 12.0, al * 0.25, lf + 2.0));
        float cathedral = 0.5 + 0.5 * sin(ac * 28.0 + lkn(vec3(ac * 4.2, al * 0.75, lf + 5.0)) * 3.6);
        float pore = smoothstep(0.81, 0.93, lkn(vec3(ac * 1150.0, al * 28.0, lf + 4.0))) * lkKeep(0.001, px);
        // Subtle contact shadow behind the vertical & horizontal brushed-stainless cabinet door handles
        float onFront = step(0.5, lkWN.x) * step(pxPlan, 9.772);
        float vPull1 = (exp(-pow((pyPlan - 1.838) / 0.018, 2.0)) + exp(-pow((pyPlan - 2.682) / 0.018, 2.0)) + exp(-pow((pyPlan - 4.210) / 0.018, 2.0)))
                     * smoothstep(0.80, 0.85, pzH) * (1.0 - smoothstep(1.48, 1.53, pzH));
        float vPullUpper = (exp(-pow((pyPlan - 0.962) / 0.016, 2.0)) + exp(-pow((pyPlan - 1.066) / 0.016, 2.0))
                          + exp(-pow((pyPlan - 3.508) / 0.016, 2.0)) + exp(-pow((pyPlan - 3.604) / 0.016, 2.0)))
                         * smoothstep(2.14, 2.18, pzH) * (1.0 - smoothstep(2.34, 2.38, pzH));
        float vPullMidUp = (exp(-pow((pyPlan - 2.212) / 0.016, 2.0)) + exp(-pow((pyPlan - 2.308) / 0.016, 2.0)))
                         * smoothstep(1.83, 1.87, pzH) * (1.0 - smoothstep(2.04, 2.08, pzH));
        float hPullLow = exp(-pow((pzH - 0.675) / 0.018, 2.0)) * smoothstep(2.02, 2.06, pyPlan) * (1.0 - smoothstep(2.46, 2.50, pyPlan));
        float cabHandleOcc = onFront * clamp(vPull1 + vPullUpper + vPullMidUp + hPullLow, 0.0, 1.0);
        float h0 = 0.000048 * fib - 0.000034 * pore + 0.000018 * (ribbon - 0.5);
        ${SLOPE('h0')}
        lkG *= lkFlat(lkWN);
        vec3 darkWal = ${v3([0.036, 0.024, 0.016])};
        vec3 warmWal = ${v3([0.086, 0.058, 0.038])};
        vec3 col = mix(darkWal, warmWal, clamp(0.28 + 0.44 * ribbon + 0.28 * cathedral, 0.0, 1.0));
        col *= (0.97 + 0.05 * r2) * (1.0 - 0.20 * line) * (1.0 + 0.20 * fib) * (1.0 - 0.26 * pore) * (1.0 - 0.38 * cabHandleOcc);
        col = mix(col, ${v3([0.118, 0.082, 0.055])}, pore * 0.35);
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.41 + 0.06 * fib + 0.08 * pore - 0.04 * ribbon, 0.30, 0.64);`,
    });
  }
  /* directional #4 brushed architectural stainless steel for the built-in French-door refrigerator, stacked Gaggenau
     microwave and convection oven, professional 5-burner range & oven door, pyramid extractor hood, undermount island sink, and gooseneck mixer faucet. */
  function stainlessSteel(orig) {
    return code(phys({ envMapIntensity: 0.82, roughness: 0.23, metalness: 0.78, clearcoat: 0.34, clearcoatRoughness: 0.13 }), 'steel', {
      surface: `
        vec3 p = vDrawW;
        vec2 q; vec3 ta, tb; lkPlane(p, lkWN, q, ta, tb);
        float brushCoarse = (lkn(vec3(q.x * 6.0, q.y * 360.0, p.x * 6.0 + 3.0)) - 0.5) * lkKeep(0.0032, lkPx);
        float brushFine = (lkn(vec3(q.x * 12.0, q.y * 780.0, p.x * 12.0 + 7.0)) - 0.5) * lkKeep(0.0015, lkPx);
        float sheen = 0.58 * sin(q.y * 5.2 - 0.8 + q.x * 1.6 + lkn(p * 1.8) * 0.65) + 0.42 * cos(q.y * 10.8 - q.x * 2.2);
        float edgeBevel = clamp(length(fwidth(lkWN)) * 1.15, 0.0, 1.0);
        // Contact shadow behind the tubular stainless handles and standoffs on the tall cabinet wall
        float pxPlan = p.x + 30.0, pyPlan = p.z + 24.0, pzH = p.y;
        float onDoorPlane = 1.0 - step(9.784, pxPlan);
        float vHandleOcc = (exp(-pow((pyPlan - 0.962) / 0.022, 2.0)) + exp(-pow((pyPlan - 1.066) / 0.022, 2.0)))
                         * smoothstep(0.76, 0.82, pzH) * (1.0 - smoothstep(1.70, 1.76, pzH));
        float hFrzOcc = exp(-pow((pzH - 0.545) / 0.022, 2.0)) * smoothstep(0.61, 0.66, pyPlan) * (1.0 - smoothstep(1.37, 1.42, pyPlan));
        float hOvnOcc = (exp(-pow((pzH - 1.191) / 0.020, 2.0)) + exp(-pow((pzH - 1.632) / 0.020, 2.0)))
                      * smoothstep(1.95, 2.00, pyPlan) * (1.0 - smoothstep(2.52, 2.57, pyPlan));
        float hRangeOvnOcc = exp(-pow((pzH - 0.702) / 0.022, 2.0)) * smoothstep(3.02, 3.08, pyPlan) * (1.0 - smoothstep(4.03, 4.09, pyPlan));
        float handleOcc = onDoorPlane * clamp(vHandleOcc + hFrzOcc + hOvnOcc + hRangeOvnOcc, 0.0, 1.0);
        float isHardware = step(9.780, pxPlan) * step(pxPlan, 9.95);
        float cylCrest = isHardware > 0.5 ? (0.42 + 0.72 * pow(clamp(abs(lkWN.x), 0.0, 1.0), 1.4)) : 1.0;
        // Subtle baffle louver shading under the range extractor hood (z = 1.54..1.62, y = 3.04..4.07)
        float inHoodBaffle = step(9.24, pxPlan) * step(pxPlan, 9.72) * step(3.04, pyPlan) * step(pyPlan, 4.07) * step(1.54, pzH) * step(pzH, 1.61);
        float baffleSlot = inHoodBaffle * (0.5 + 0.5 * sin((pxPlan - 9.25) * 155.0));
        // Deep undermount island sink interior cavity shading, undermount shadow rim, and X-pattern basin drainage creases
        float inSink = step(12.18, pxPlan) * step(pxPlan, 13.22) * step(3.58, pyPlan) * step(pyPlan, 4.20) * step(0.66, pzH) * step(pzH, 0.892);
        float sinkDepth = inSink * clamp((0.890 - pzH) / 0.195, 0.0, 1.0);
        float sinkWallDist = min(min(pxPlan - 12.24, 13.16 - pxPlan), min(pyPlan - 3.63, 4.15 - pyPlan));
        float sinkCornerAO = inSink * (1.0 - smoothstep(0.0, 0.085, max(0.0, sinkWallDist)));
        float underRimOcc = inSink * exp(-pow((pzH - 0.884) / 0.016, 2.0));
        // X-pattern drainage grooves on the sink floor converging toward the drain at (12.84, 3.89)
        vec2 dDr = vec2(pxPlan - 12.84, pyPlan - 3.89);
        float cr1 = exp(-pow(abs(dDr.x * 0.44 - dDr.y) / 0.0045, 2.0));
        float cr2 = exp(-pow(abs(dDr.x * 0.44 + dDr.y) / 0.0045, 2.0));
        float onSinkFloor = inSink * (1.0 - smoothstep(0.700, 0.712, pzH)) * smoothstep(0.048, 0.065, length(dDr));
        float drainCrease = onSinkFloor * max(cr1, cr2);
        // Gooseneck faucet cylindrical specular sheen
        float onFaucet = step(12.45, pxPlan) * step(pxPlan, 13.10) * step(3.80, pyPlan) * step(pyPlan, 4.35) * step(0.93, pzH);
        float faucetCrest = onFaucet > 0.5 ? (0.82 + 0.34 * pow(clamp(max(abs(lkWN.x), abs(lkWN.y)), 0.0, 1.0), 1.2)) : 1.0;
        float sinkCalm = 1.0 - 0.82 * inSink;
        float h = (0.00014 * brushCoarse + 0.00009 * brushFine + 0.00008 * sheen) * sinkCalm - 0.00035 * drainCrease;
        ${SLOPE('h')}
        vec3 darkSteel = ${v3([0.23, 0.242, 0.258])};
        vec3 brightSteel = ${v3([0.64, 0.658, 0.682])};
        vec3 baseSteel = mix(darkSteel, brightSteel, clamp(0.48 + 0.44 * sheen * sinkCalm, 0.0, 1.0));
        baseSteel *= (1.0 + (0.14 * brushCoarse + 0.10 * brushFine) * sinkCalm + 0.18 * edgeBevel) * (1.0 - 0.44 * handleOcc) * (1.0 - 0.28 * baffleSlot) * cylCrest * faucetCrest;
        baseSteel *= (1.0 - 0.38 * sinkDepth - 0.28 * sinkCornerAO - 0.44 * underRimOcc - 0.18 * drainCrease);
        diffuseColor.rgb = baseSteel;
        roughnessFactor = clamp(mix(0.23 - 0.06 * sheen + 0.04 * abs(brushCoarse) - 0.04 * edgeBevel + 0.08 * handleOcc - 0.05 * onFaucet, 0.36 + 0.08 * sinkDepth, inSink), 0.11, 0.46);`,
    });
  }
  /* double-glazed smoked reflective oven and microwave viewing windows with dark ceramic-frit border, warm interior halogen
     cavity illumination, and subtle horizontal chrome rack and back-baffle depth (both stacked wall ovens and the range oven under the stove). */
  function ovenGlass(orig) {
    return code(phys({ envMapIntensity: 1.15, roughness: 0.08, metalness: 0.16, clearcoat: 0.92, clearcoatRoughness: 0.05 }), 'ovenGlass', {
      surface: `
        vec3 p = vDrawW;
        float pyPlan = p.z + 24.0, wz = p.y;
        bool isRangeOven = pyPlan > 2.95;
        bool isUpper = !isRangeOven && wz > 1.35;
        float wy = isRangeOven ? (pyPlan - 3.556) : (pyPlan - 2.260);
        float wHalf = isRangeOven ? 0.435 : 0.235;
        float zLo = isRangeOven ? 0.315 : (isUpper ? 1.448 : 0.865);
        float zHi = isRangeOven ? 0.635 : (isUpper ? 1.658 : 1.215);
        float u = clamp((wy + wHalf) / (2.0 * wHalf), 0.0, 1.0);
        float v = clamp((wz - zLo) / max(0.01, zHi - zLo), 0.0, 1.0);
        float edge = min(min(u, 1.0 - u) * (2.0 * wHalf), min(v, 1.0 - v) * (zHi - zLo));
        float frit = 1.0 - smoothstep(0.018, 0.025, edge);
        float cav = (1.0 - frit) * smoothstep(0.0, 0.12, u) * smoothstep(0.0, 0.12, 1.0 - u);
        float topGlow = cav * smoothstep(0.08, 0.95, v) * (0.65 + 0.35 * sin(u * 3.14159));
        float rack1 = cav * exp(-pow((v - 0.32) / 0.018, 2.0));
        float rack2 = cav * (isUpper ? 0.0 : exp(-pow((v - 0.62) / 0.018, 2.0)));
        float mesh = 0.88 + 0.12 * sin(wy * 420.0) * sin(wz * 420.0) * lkKeep(0.002, lkPx);
        vec3 col = mix(${v3([0.018, 0.017, 0.016])}, ${v3([0.008, 0.008, 0.009])}, frit);
        col += topGlow * ${v3([0.068, 0.044, 0.019])} * mesh;
        col += (rack1 + rack2) * ${v3([0.15, 0.13, 0.10])};
        diffuseColor.rgb = col;
        totalEmissiveRadiance += (topGlow * ${v3([0.115, 0.072, 0.026])} + (rack1 + rack2) * ${v3([0.065, 0.048, 0.028])}) * mesh;
        roughnessFactor = mix(0.07, 0.14, frit);`,
    });
  }
  /* the kitchen island's monolithic countertop: honed Calacatta Oro & Taj Mahal white quartzite with 3D waterfall veining
     that wraps continuously from the top surface down the 5 cm bevelled outer edges and the inner undermount sink cutout rim. */
  function counterQuartzite(orig) {
    return code(phys({ envMapIntensity: 0.92, roughness: 0.15, clearcoat: 0.64, clearcoatRoughness: 0.09 }), 'counterStone', {
      head: SLAB,
      surface: `
        vec3 wp = vDrawW;
        float mPx = mix(lkPxM, lkPx, 0.25);
        // 3D waterfall projection so veins cross the top slab and cascade continuously down the 5 cm front edge and sink cutout walls
        vec2 sp = vec2(wp.x + 18.5 + (0.935 - wp.y) * 1.15, wp.z + 20.0 - (0.935 - wp.y) * 0.95);
        vec2 w1 = vec2(lkFbm(vec3(sp * vec2(0.58, 0.88), 91.0), 1.0, 0.55, 3, mPx).x,
                       lkFbm(vec3(sp * vec2(0.58, 0.88), 93.0), 1.0, 0.55, 3, mPx).x);
        vec2 w2 = vec2(lkFbm(vec3(sp * vec2(1.70, 2.30), 95.0), 1.0, 0.55, 3, mPx).x,
                       lkFbm(vec3(sp * vec2(1.70, 2.30), 97.0), 1.0, 0.55, 3, mPx).x);
        float w3 = lkFbm(vec3(sp * 5.8, 99.0), 1.0, 0.55, 2, mPx).x;
        vec2 q = sp + 0.55 * w1 + 0.24 * w2 + 0.05 * w3;
        vec2 rv = mat2(0.52, 0.85, -0.85, 0.52) * q;
        vec2 cv = mat2(0.86, -0.51, 0.51, 0.86) * q;
        float bMask1 = smoothstep(-0.36, 0.12, lkFbm(vec3(sp * 0.65, 101.0), 1.0, 0.5, 2, mPx).x);
        float bMask2 = smoothstep(-0.30, 0.18, lkFbm(vec3(sp * 1.15, 103.0), 1.0, 0.5, 2, mPx).x);
        // 1. Broad dove-grey & warm taupe Calacatta breccia mineral halos
        float vHalo = slLine(rv.x * 0.78 + rv.y * 0.18, 0.068) * bMask1
                    + 0.82 * slLine(cv.x * 1.12 - cv.y * 0.26 + 0.37, 0.052) * bMask2;
        // 2. Crisp charcoal-taupe & warm graphite stylolite veins
        float v1 = slLine(rv.x * 0.78 + rv.y * 0.18 + 0.012 * w3, 0.0145) * bMask1;
        float v2 = slLine(cv.x * 1.12 - cv.y * 0.26 + 0.37, 0.0130) * bMask2;
        float v3 = slLine((q.x + q.y * 0.62) * 1.55 + 0.51, 0.0105) * bMask1;
        float veinGrey = clamp(0.92 * v1 + 0.75 * v2 + 0.52 * v3, 0.0, 1.0);
        // 3. Warm Calacatta Oro golden-amber mineral veins
        float gf1 = slLine(rv.x * 0.78 + rv.y * 0.18 + 0.022 + 0.045 * w2.x, 0.0135) * bMask1;
        float gf2 = slLine(cv.x * 1.45 + cv.y * 0.30 + 0.61, 0.0115) * bMask2;
        float veinGold = clamp(0.92 * gf1 + 0.72 * gf2, 0.0, 1.0);
        // 4. Crystalline pure-white quartz heal fractures
        float c1 = slLine(rv.x * 0.85 - rv.y * 0.20 + 0.44, 0.0085) * bMask1;
        float c2 = slLine(cv.x * 1.35 + cv.y * 0.24 + 0.18, 0.0075) * bMask2;
        float veinWhite = clamp(0.88 * c1 + 0.68 * c2, 0.0, 1.0);
        float cloud = lkFbm(vec3(q * 0.85, 105.0), 1.2, 0.55, 4, mPx).x;
        float cloudMed = lkFbm(vec3(sp * 1.5, 107.0), 11.0, 0.55, 3, mPx).x;
        vec4 grain = lkFbm(vec3(sp, 109.0), 150.0, 0.58, 3, mPx);
        float h0 = 0.00004 * cloud - 0.00016 * veinGrey + 0.00005 * veinWhite + 0.00002 * grain.x;
        ${SLOPE('h0')}
        lkG *= lkFlat(lkWN);
        float neb = smoothstep(-0.38, 0.38, 0.56 * w1.x + 0.44 * cloud);
        vec3 col = mix(${v3([0.675, 0.648, 0.605])}, ${v3([0.815, 0.792, 0.752])}, neb);
        col *= (1.0 + 0.08 * cloudMed + 0.045 * grain.x);
        col = mix(col, ${v3([0.39, 0.355, 0.312])}, clamp(vHalo, 0.0, 1.0) * 0.68);
        col = mix(col, ${v3([0.50, 0.345, 0.155])}, veinGold * 0.78);
        col = mix(col, ${v3([0.165, 0.140, 0.115])}, veinGrey * 0.84);
        col = mix(col, ${v3([0.92, 0.905, 0.875])}, veinWhite * 0.78);
        // Subtle ambient contact shadow around the gooseneck faucet base and under the centerpiece fruit bowl
        vec2 pPlan = vec2(wp.x + 30.0, wp.z + 24.0);
        float faucetAO = exp(-pow(length(pPlan - vec2(12.70, 4.23)) / 0.048, 2.0)) * step(0.92, wp.y);
        float dispAO = exp(-pow(length(pPlan - vec2(12.95, 4.23)) / 0.032, 2.0)) * step(0.92, wp.y);
        float bowlAO = exp(-pow(length(pPlan - vec2(14.65, 4.00)) / 0.185, 2.0)) * step(0.92, wp.y);
        // Subtle vertical cutout rim contrast so the 5 cm white marble sink cutout wall reads with crisp 3D depth
        float onVertRim = 1.0 - smoothstep(0.45, 0.85, abs(lkWN.y));
        col *= (1.0 - 0.32 * faucetAO - 0.24 * dispAO - 0.34 * bowlAO - 0.10 * onVertRim);
        diffuseColor.rgb = col;
        roughnessFactor = clamp(0.14 + 0.04 * (1.0 - neb) + 0.03 * grain.x + 0.05 * veinGrey - 0.04 * veinWhite, 0.08, 0.35);`,
    });
  }
  /* carved radial-fluted Roman travertine & unglazed stoneware centerpiece fruit bowl at (14.65, 4.00). */
  function flutedBowl(orig) {
    return code(phys({ envMapIntensity: 0.65, roughness: 0.44, clearcoat: 0.14, clearcoatRoughness: 0.32 }), 'flutedBowl', {
      surface: `
        vec3 p = vDrawW;
        vec2 dp = vec2(p.x - ${f(14.65 - 30.0)}, p.z - ${f(4.00 - 24.0)});
        float r = length(dp), ang = atan(dp.y, dp.x);
        float isOuter = step(0.0, dot(normalize(vec2(lkWN.x, lkWN.z) + 1e-5), normalize(dp + 1e-5))) * (1.0 - smoothstep(0.45, 0.82, lkWN.y));
        float fl = cos(ang * 44.0);
        float fluteGroove = isOuter * smoothstep(0.075, 0.125, r) * (0.5 - 0.5 * fl) * lkKeep(0.006, lkPx);
        float strata = lkn(vec3(p.x * 3.5, p.y * 42.0 + lkn(p * 6.0) * 1.8, p.z * 3.5));
        float pore = smoothstep(0.76, 0.89, lkn(vec3(p.x * 65.0, p.y * 190.0, p.z * 65.0))) * lkKeep(0.0025, lkPx);
        float grain = (lkn(p * 240.0) - 0.5) * lkKeep(0.0018, lkPx);
        float h = -0.0014 * fluteGroove + 0.00022 * (strata - 0.5) - 0.0006 * pore + 0.00008 * grain;
        ${SLOPE('h')}
        vec3 col = mix(${v3([0.66, 0.605, 0.520])}, ${v3([0.82, 0.772, 0.692])}, smoothstep(0.2, 0.8, strata));
        col *= (1.0 - 0.24 * fluteGroove + 0.10 * grain) * (1.0 - 0.32 * pore);
        // subtle interior bowl depth shadow toward the bottom center where the fruit sits
        float innerBowl = smoothstep(0.35, 0.95, lkWN.y) * (1.0 - smoothstep(0.05, 0.22, r));
        col *= 1.0 - 0.22 * innerBowl;
        diffuseColor.rgb = col;
        roughnessFactor = clamp(0.42 + 0.12 * fluteGroove + 0.22 * pore - 0.04 * strata, 0.28, 0.78);`,
    });
  }
  /* botanical fruit skins for the kitchen centerpiece bowl: citrus rind oil-gland dimples on lemons and oranges,
     variegated blush and lenticel speckles on apples and pears, and ribbed velvet bloom on figs. */
  function fruitSkin(orig, key, colA, colB, rough, coat, mode) {
    return code(phys({ envMapIntensity: 0.78, roughness: rough, clearcoat: coat, clearcoatRoughness: 0.16 }), key, {
      surface: `
        vec3 p = vDrawW;
        float mottle = lkn(p * 28.0) * 0.62 + lkn(p * 64.0 + 3.7) * 0.38;
        float stripe = lkn(vec3(p.x * 48.0, p.y * 16.0, p.z * 48.0 + 7.1));
        float pore = (lkn(p * 420.0) - 0.5) * lkKeep(0.0012, lkPx);
        float speck = smoothstep(0.76, 0.88, lkn(p * 340.0 + 5.2)) * lkKeep(0.0015, lkPx);
        float h = ${mode === 1 ? '0.00032 * pore' : mode === 2 ? '0.00018 * (stripe - 0.5) - 0.00012 * speck' : '0.00022 * sin(atan(p.z, p.x) * 18.0)'};
        ${SLOPE('h')}
        float t = clamp(${mode === 2 ? '0.55 * mottle + 0.45 * stripe' : 'mottle'}, 0.0, 1.0);
        vec3 col = mix(${v3(colA)}, ${v3(colB)}, t);
        col *= (1.0 + 0.10 * pore) * (1.0 - ${mode === 2 ? '0.22' : '0.08'} * speck);
        // subtle bottom ambient occlusion where each fruit nestles in the bowl
        float botAO = smoothstep(0.15, -0.75, lkWN.y);
        col *= 1.0 - 0.28 * botAO;
        diffuseColor.rgb = col;
        roughnessFactor = clamp(${f(rough)} - 0.06 * t + 0.08 * abs(pore) + 0.12 * botAO, 0.12, 0.78);`,
    });
  }
  /* Live-edge solid American Black Walnut trunk slab & sculpted architectural trestle foundation (walnutSolid):
     On the dining table trunk slab (x = 18.00..23.15, y = 3.40..4.60, z = 0.805..0.880), renders concentric cathedral
     heartwood growth rings, figured burl ripples, dark resin-filled pith checks near the ends, and golden-blonde sapwood
     borders following the exact undulating live-edge trunk contour, under a hand-rubbed satin oil-and-wax finish. */
  function liveEdgeWalnut(orig) {
    return code(phys({ envMapIntensity: 0.55, roughness: 0.28, clearcoat: 0.28, clearcoatRoughness: 0.20 }), 'liveEdgeWalnut', {
      surface: `
        vec3 p = vDrawW;
        float pxPlan = p.x + 30.0, pyPlan = p.z + 24.0, pzH = p.y;
        float cPx = mix(lkPxM, lkPx, 0.45);
        float inDining = step(17.90, pxPlan) * step(pxPlan, 23.25) * step(3.30, pyPlan) * step(pyPlan, 4.70);
        float inSlab = inDining * step(0.790, pzH) * step(pzH, 0.900);
        // Analytical live-edge contour matching trunkSlabGeo in staging.js
        float uT = clamp((pxPlan - 18.00) / 5.15, 0.0, 1.0);
        float flare = 0.048 * pow(2.0 * uT - 1.0, 4.0) - 0.026 * sin(uT * 3.14159265);
        float nWave = 0.038 * sin(uT * 6.283185 + 0.45) + 0.022 * cos(uT * 15.708 - 0.80) + 0.012 * sin(uT * 28.274 + 1.2);
        float sWave = 0.042 * sin(uT * 6.283185 + 2.35) - 0.024 * cos(uT * 12.566 + 0.50) + 0.014 * cos(uT * 25.133 - 0.7);
        float yN = 4.00 - (0.505 + flare + nWave);
        float yS = 4.00 + (0.505 + flare + sWave);
        float dEdgeN = pyPlan - yN, dEdgeS = yS - pyPlan;
        float dEdge = min(dEdgeN, dEdgeS);
        // Natural trunk pith centerline with organic S-curve along the 5.15 m trunk
        float yPith = 4.00 + 0.055 * sin(uT * 4.8 + 0.35) + 0.028 * cos(uT * 10.6 - 0.6);
        // 3D domain-warped cathedral growth-ring field along the trunk
        float warp1 = lkFbm(vec3(p.x * 0.42, p.y * 2.4, p.z * 2.4), 2.1, 0.52, 3, cPx * 0.4).x;
        float warp2 = lkn(vec3(p.x * 1.4, p.y * 6.5, p.z * 6.5)) - 0.5;
        float burl = smoothstep(0.58, 0.86, lkn(vec3(p.x * 1.5 + 4.0, p.z * 3.2, p.y * 3.5))) * (lkn(vec3(p.x * 9.0, p.z * 14.0, p.y * 10.0)) - 0.5);
        float cylR = inDining > 0.5
          ? length(vec2((pyPlan - yPith) * 1.05, (pzH - 0.68) * 1.35)) + 0.14 * warp1 + 0.045 * warp2 + 0.035 * burl
          : (p.z * 0.85 + p.y * 1.15) + 0.14 * warp1 + 0.04 * warp2;
        float ringCoord = cylR * 22.0;
        float rVis = 1.0 - smoothstep(0.24, 0.62, fwidth(ringCoord));
        float rF = fract(ringCoord);
        float earlyLate = mix(0.45, smoothstep(0.0, 0.22, rF) * (1.0 - smoothstep(0.50, 0.94, rF)), rVis);
        // Fine interlocked wood fibers, open vessel pores, and chatoyant curl figure
        float fiber = (lkn(vec3(p.x * 16.0, p.z * 360.0, p.y * 180.0)) - 0.5) * lkKeep(0.0018, cPx);
        float pore = smoothstep(0.74, 0.90, lkn(vec3(p.x * 28.0, p.z * 580.0, p.y * 300.0 + 3.0))) * lkKeep(0.0012, cPx);
        float curlFig = sin(p.x * 18.0 + warp1 * 7.5) * 0.5 + 0.5;
        // Golden-blonde live-edge sapwood border along both undulating outer trunk edges
        float sapWobble = 0.026 * (lkn(vec3(p.x * 2.2, p.z * 7.5, 2.0)) - 0.5) + 0.012 * warp2;
        float sapMask = inSlab * (1.0 - smoothstep(0.052, 0.132, dEdge + sapWobble));
        float cambiumLine = inSlab * exp(-pow((dEdge + sapWobble - 0.088) / 0.016, 2.0));
        float liveSlope = inSlab * (1.0 - step(0.86, abs(lkWN.y))) * step(abs(lkWN.x), 0.5);
        float cambiumStreak = (0.35 * sapMask + liveSlope) * smoothstep(0.58, 0.86, lkn(vec3(p.x * 1.8, p.y * 45.0, p.z * 32.0 + 5.0)));
        // Natural dark resin-filled pith checks at the west and east ends (bridged by the 3D brass butterfly keys)
        float endZone = inSlab * (smoothstep(18.95, 18.70, pxPlan) * step(18.04, pxPlan) + smoothstep(22.20, 22.45, pxPlan) * step(pxPlan, 23.11));
        float checkY = min(abs(pyPlan - (3.74 + 0.008 * warp2)), abs(pyPlan - (4.26 - 0.008 * warp2)));
        float checkLine = endZone * (1.0 - smoothstep(0.0015, max(0.0042, cPx * 1.4), checkY));
        float h = 0.00018 * earlyLate + 0.00008 * fiber - 0.00014 * pore - 0.0012 * checkLine - 0.00022 * cambiumStreak * liveSlope;
        ${SLOPE('h')}
        lkG *= lkFlat(lkWN);
        // Heartwood palette: deep roasted chocolate-espresso to warm amber-walnut cathedrals
        vec3 heartDark = ${v3([0.022, 0.010, 0.005])};
        vec3 heartMid  = ${v3([0.056, 0.027, 0.012])};
        vec3 heartGlow = ${v3([0.105, 0.052, 0.022])};
        vec3 heartCol = mix(heartDark, mix(heartMid, heartGlow, 0.45 + 0.55 * curlFig), earlyLate);
        heartCol *= 0.86 + 0.28 * lkn(vec3(p.x * 1.2, p.z * 5.5, 7.0));
        // Sapwood palette: warm golden-honey & toasted blonde along the live edges
        vec3 sapDark = ${v3([0.125, 0.072, 0.032])};
        vec3 sapLight = ${v3([0.225, 0.138, 0.066])};
        vec3 sapCol = mix(sapDark, sapLight, 0.35 + 0.65 * earlyLate) * (0.92 + 0.16 * curlFig);
        vec3 col = mix(heartCol, sapCol, clamp(sapMask + 0.38 * liveSlope, 0.0, 1.0));
        col *= 1.0 - 0.30 * cambiumLine;
        col = mix(col, ${v3([0.020, 0.009, 0.004])}, clamp(0.42 * cambiumStreak + 0.92 * checkLine, 0.0, 0.95));
        col *= (1.0 + 0.22 * fiber) * (1.0 - 0.32 * pore);
        diffuseColor.rgb = col;
        roughnessFactor = clamp(0.24 + 0.07 * (1.0 - earlyLate) + 0.14 * pore + 0.16 * liveSlope + 0.25 * checkLine, 0.18, 0.62);`,
    });
  }
  /* Satin-polished lathe-spun 24k architectural brass (spunBrass) for the dining dome pendants, ceiling roses,
     barstool footrest rings, and butterfly bow-tie slab inlays: radial concentric hairline brushing with warm gold sheen. */
  function spunBrass(orig) {
    return code(phys({ envMapIntensity: 0.88, metalness: 0.92, roughness: 0.22, clearcoat: 0.26, clearcoatRoughness: 0.16 }), 'spunBrass', {
      surface: `
        vec3 p = vDrawW;
        float cPx = mix(lkPxM, lkPx, 0.35);
        float spun = (lkn(vec3(p.y * 520.0, (p.x + p.z) * 45.0, 2.0)) - 0.5) * lkKeep(0.0014, cPx)
                   + 0.45 * (lkn(vec3(p.x * 380.0, p.z * 380.0, p.y * 120.0)) - 0.5) * lkKeep(0.0018, cPx);
        float sheenBand = 0.5 + 0.5 * sin(p.x * 16.0 + p.z * 12.0 + lkn(p * 4.5) * 2.2);
        float h = 0.00006 * spun;
        ${SLOPE('h')}
        vec3 col = mix(${v3([0.34, 0.19, 0.062])}, ${v3([0.52, 0.31, 0.105])}, sheenBand);
        col *= 1.0 + 0.12 * spun;
        diffuseColor.rgb = col;
        roughnessFactor = clamp(0.19 + 0.06 * (1.0 - sheenBand) + 0.08 * abs(spun), 0.14, 0.34);`,
    });
  }
  /* Honed dark charcoal basalt / Pietra Lavica & Belgian Bluestone running-bond slab floor (wineFloor) for the Wine Cellar:
     0.45 x 0.90 m ashlar slabs laid in a 50% running bond, with deep anthracite-slate to warm oxidized bronze-umber
     slab-to-slab variation, crystalline mineral grain, fine calcite hairlines, chamfered arrises, and satin sealer. */
  function cellarBasaltFloor(orig) {
    return code(phys({ envMapIntensity: 0.58, roughness: 0.28, clearcoat: 0.36, clearcoatRoughness: 0.18 }), 'cellarBasaltFloor', {
      surface: `
        vec2 p = vDrawW.xz;
        float sPx = mix(lkPxM, lkPx, 0.45);
        vec2 sz = vec2(0.45, 0.90);
        float colIdx = floor((p.x + 100.0) / sz.x);
        float rowShift = 0.5 * sz.y * mod(colIdx, 2.0);
        vec2 st = vec2((p.x + 100.0) / sz.x, (p.y + rowShift + 100.0) / sz.y);
        vec2 id = floor(st), f = fract(st) * sz;
        float dEdge = min(min(f.x, sz.x - f.x), min(f.y, sz.y - f.y));
        float jFade = 1.0 - smoothstep(0.04, 0.12, sPx);
        float joint = (1.0 - smoothstep(0.0012, max(0.0024, sPx * 1.4), dEdge)) * jFade;
        float arris = (1.0 - smoothstep(0.0020, 0.0065, dEdge)) * jFade;
        float r1 = lkH2(id + 3.1), r2 = lkH2(id * 1.7 + 9.4);
        vec2 q = p + vec2(r1 * 5.3, r2 * 7.1);
        float cloud = lkn(vec3(q * 2.2, r1 * 6.0));
        float strata = lkn(vec3(q.x * 5.5 + cloud * 1.4, q.y * 1.8, r2 * 4.0));
        vec4 fine = lkFbm(vec3(q, r1 * 3.0), 42.0, 0.52, 2, sPx);
        float fleck = smoothstep(0.76, 0.90, lkn(vec3(q * 110.0, r2 * 8.0))) * lkKeep(0.0025, sPx);
        // Subtle diagonal quartz/calcite & oxidized bronze mineral hairlines
        vec2 vr = mat2(0.80, -0.60, 0.60, 0.80) * q + 0.18 * vec2(cloud, strata);
        float vn1 = 1.0 - abs(2.0 * lkn(vec3(vr * vec2(1.4, 5.2), r1 * 9.0)) - 1.0);
        float veinCalcite = pow(clamp(vn1, 0.0, 1.0), 28.0) * lkKeep(0.008, sPx) * (0.35 + 0.65 * r2);
        float warmPatch = smoothstep(0.62, 0.88, r2) * smoothstep(0.35, 0.78, strata);
        float h = 0.00022 * (strata - 0.5) + 0.00010 * fine.x - 0.0008 * arris - 0.0018 * joint;
        ${SLOPE('h')}
        lkG *= lkFlat(lkWN);
        vec3 slateDark = ${v3([0.044, 0.043, 0.041])};
        vec3 slateLight = ${v3([0.088, 0.084, 0.078])};
        vec3 col = mix(slateDark, slateLight, 0.35 * r1 + 0.40 * cloud + 0.25 * strata);
        // Occasional warm bronze-oxidized bluestone tones matching ref_wine_cellar_upgrade
        col = mix(col, ${v3([0.125, 0.096, 0.068])}, warmPatch * 0.48);
        col *= 1.0 + 0.12 * fine.x + 0.14 * fleck;
        col = mix(col, ${v3([0.24, 0.22, 0.19])}, veinCalcite * 0.55);
        col *= 1.0 - 0.18 * arris;
        col = mix(col, ${v3([0.025, 0.024, 0.022])}, joint * 0.88);
        diffuseColor.rgb = col;
        roughnessFactor = mix(clamp(0.24 + 0.08 * (1.0 - cloud) + 0.06 * fine.x - 0.05 * veinCalcite, 0.18, 0.42), 0.78, joint);`,
    });
  }
  /* Bespoke solid American Black Walnut & quarter-sawn oak wine cellar joinery (wineWood):
     Warm roasted chestnut-walnut cabinetry with cathedral figure on vertical panels/pilasters, fine straight grain
     along shelf rails and diamond X-bin dividers, under a warm satin furniture lacquer. */
  function cellarWalnut(orig) {
    return code(phys({ envMapIntensity: 0.62, roughness: 0.32, clearcoat: 0.30, clearcoatRoughness: 0.20 }), 'cellarWalnut', {
      surface: `
        vec3 p = vDrawW;
        float cPx = mix(lkPxM, lkPx, 0.40);
        bool up = abs(lkWN.y) < 0.55;
        vec2 g = up ? vec2(p.x + p.z, p.y) : vec2(p.z, p.x);
        float plank = floor(g.x / 0.28), r1 = lkH2(vec2(plank, 4.2)), r2 = lkH2(vec2(plank, 9.7));
        float warp = lkFbm(vec3(g.x * 2.2, g.y * 0.65, r1 * 5.0), 1.8, 0.5, 2, cPx * 0.5).x;
        float ring = fract((g.x * 11.0 + warp * 2.4) + r2 * 3.0);
        float earlyLate = smoothstep(0.0, 0.24, ring) * (1.0 - smoothstep(0.54, 0.95, ring));
        float fib = (lkn(vec3(g.x * 380.0, g.y * 14.0, r1 * 7.0)) - 0.5) * lkKeep(0.0016, cPx);
        float pore = smoothstep(0.76, 0.90, lkn(vec3(g.x * 680.0, g.y * 36.0, r2 * 11.0))) * lkKeep(0.0011, cPx);
        float ray = 0.5 + 0.5 * sin(g.y * 22.0 + warp * 5.0);
        float h = 0.00008 * earlyLate + 0.00005 * fib - 0.00008 * pore;
        ${SLOPE('h')}
        lkG *= lkFlat(lkWN);
        vec3 wDark = ${v3([0.052, 0.026, 0.012])};
        vec3 wMid  = ${v3([0.105, 0.056, 0.025])};
        vec3 wWarm = ${v3([0.162, 0.090, 0.042])};
        vec3 col = mix(wDark, mix(wMid, wWarm, 0.45 + 0.55 * ray), earlyLate);
        col *= (0.90 + 0.20 * r1) * (1.0 + 0.20 * fib) * (1.0 - 0.28 * pore);
        diffuseColor.rgb = col;
        roughnessFactor = clamp(0.28 + 0.07 * (1.0 - earlyLate) + 0.10 * pore, 0.20, 0.52);`,
    });
  }
  /* Backlit Honey Onyx & Roman Alabaster translucent stone panels (bayGlow) in the three east-wall wine bays:
     Warm golden-amber mineral clouds, diagonal crystalline calcite and sienna veins, cove-lit perimeter vignette,
     and warm internal LED backlight transmission matching ref_wine_cellar_upgrade. */
  function backlitOnyx(orig) {
    return code(phys({
      envMapIntensity: 0.45,
      roughness: 0.22,
      clearcoat: 0.52,
      clearcoatRoughness: 0.14,
      emissive: new THREE.Color(0.68, 0.44, 0.18),
      emissiveIntensity: 0.78,
    }), 'backlitOnyx', {
      surface: `
        vec3 p = vDrawW;
        float pyPlan = p.z + 24.0, pzH = p.y;
        float sPx = mix(lkPxM, lkPx, 0.35);
        // Bay-local coordinates for perimeter cove-light vignette inside each of the 3 bays ([0.52..2.72], [2.88..5.12], [5.28..7.48])
        float bayIdx = step(2.80, pyPlan) + step(5.20, pyPlan);
        float bY0 = bayIdx < 0.5 ? 0.52 : (bayIdx < 1.5 ? 2.88 : 5.28);
        float bY1 = bayIdx < 0.5 ? 2.72 : (bayIdx < 1.5 ? 5.12 : 7.48);
        float uBay = clamp((pyPlan - bY0) / max(bY1 - bY0, 0.1), 0.0, 1.0);
        float vBay = clamp((pzH - 0.94) / 1.76, 0.0, 1.0);
        float edgeDist = min(min(uBay, 1.0 - uBay), min(vBay, 1.0 - vBay));
        float vignette = smoothstep(0.0, 0.15, edgeDist);
        // Open diagonal Honey Onyx & Roman Alabaster sedimentary strata and mineral veins (no closed contour rings)
        vec2 q = vec2(pyPlan * 0.55 + bayIdx * 1.9, pzH * 0.75);
        vec4 w1 = lkFbm(vec3(q * 0.95, 2.0), 1.5, 0.50, 3, sPx * 0.4);
        float cloud = lkn(vec3(q * 1.3 + 0.35 * w1.xy, 4.0)) * 0.65 + lkn(vec3(q * 2.8 - 0.25 * w1.yx, 7.0)) * 0.35;
        // Monotonic diagonal strata coordinate warped by w1 so veins flow naturally across the slab without bullseye loops
        float strataCoord = q.y * 2.4 + q.x * 0.85 + 0.52 * w1.x + 0.28 * w1.y;
        float bandWave = 0.5 + 0.5 * sin(strataCoord * 3.14159);
        float n1 = 1.0 - abs(sin(strataCoord * 2.2 + 0.35 * cloud));
        float n2 = 1.0 - abs(sin((q.y * 3.8 - q.x * 1.1 + 0.65 * w1.y) * 2.6));
        float veinAmber = pow(clamp(n1, 0.0, 1.0), 6.0) * (0.40 + 0.60 * cloud);
        float veinSienna = pow(clamp(n2, 0.0, 1.0), 16.0) * lkKeep(0.012, sPx) * (0.35 + 0.65 * cloud);
        float veinWhite = pow(clamp(n1, 0.0, 1.0), 22.0) * lkKeep(0.008, sPx);
        float h = 0.00014 * (cloud - 0.5) - 0.00018 * veinSienna;
        ${SLOPE('h')}
        // Warm translucent ivory-alabaster matrix with soft honey-gold clouds and delicate amber/calcite veins
        vec3 alabaster = mix(${v3([0.66, 0.48, 0.25])}, ${v3([0.95, 0.86, 0.68])}, smoothstep(0.18, 0.84, 0.65 * cloud + 0.35 * bandWave));
        alabaster = mix(alabaster, ${v3([0.52, 0.30, 0.11])}, veinAmber * 0.42);
        alabaster = mix(alabaster, ${v3([0.34, 0.17, 0.06])}, veinSienna * 0.45);
        alabaster = mix(alabaster, ${v3([0.99, 0.95, 0.86])}, veinWhite * 0.55);
        alabaster *= 0.78 + 0.26 * vignette;
        diffuseColor.rgb = alabaster;
        totalEmissiveRadiance *= alabaster * (0.88 + 0.30 * smoothstep(0.25, 0.85, cloud)) * (0.74 + 0.26 * vignette);
        roughnessFactor = clamp(0.18 + 0.06 * veinAmber + 0.05 * veinSienna, 0.12, 0.34);`,
    });
  }
  /* Original Wooden Wine Crates (wineCrate / owcCrate): kiln-dried French Maritime Pine & blond oak OWC cases
     with horizontal board joints, corner finger-joint dovetails, and pyrographed Bordeaux chateau stamps. */
  function owcCrate(orig) {
    return code(phys({ envMapIntensity: 0.42, roughness: 0.58, clearcoat: 0.08, clearcoatRoughness: 0.45 }), 'owcCrate', {
      surface: `
        vec3 p = vDrawW;
        float cPx = mix(lkPxM, lkPx, 0.40);
        vec2 q; vec3 ta, tb; lkPlane(p, lkWN, q, ta, tb);
        float board = floor(p.y / 0.085);
        float bSeam = 1.0 - smoothstep(0.0010, max(0.0025, cPx * 1.3), abs(fract(p.y / 0.085 + 0.5) - 0.5) * 0.085);
        float grain = lkn(vec3(q.x * 14.0, q.y * 140.0 + board * 3.7, 2.0));
        float fib = (lkn(vec3(q.x * 32.0, q.y * 420.0, board + 5.0)) - 0.5) * lkKeep(0.0016, cPx);
        // Pyrographed chateau crest & vintage stamp on vertical crate fronts
        float isVert = step(abs(lkWN.y), 0.45);
        vec2 sc = vec2(fract(q.x / 0.46) - 0.5, fract(p.y / 0.175) - 0.5);
        float borderBox = isVert * step(abs(sc.x), 0.32) * step(abs(sc.y), 0.32) * (1.0 - step(abs(sc.x), 0.29) * step(abs(sc.y), 0.27));
        float crest = isVert * smoothstep(0.11, 0.04, length(vec2(sc.x * 0.9, (sc.y - 0.07) * 1.4))) * smoothstep(0.35, 0.72, lkn(vec3(sc * 45.0, 9.0)));
        float titleLine = isVert * step(abs(sc.x), 0.22) * step(abs(sc.y + 0.08), 0.035) * smoothstep(0.30, 0.68, sin(sc.x * 160.0) * 0.5 + 0.5);
        float subLine = isVert * step(abs(sc.x), 0.15) * step(abs(sc.y + 0.17), 0.022);
        float stamp = clamp(borderBox * 0.65 + crest * 0.85 + titleLine * 0.80 + subLine * 0.55, 0.0, 1.0) * lkKeep(0.008, cPx);
        float h = 0.00008 * fib - 0.0006 * bSeam - 0.00018 * stamp;
        ${SLOPE('h')}
        lkG *= lkFlat(lkWN);
        vec3 pine = mix(${v3([0.22, 0.145, 0.078])}, ${v3([0.36, 0.245, 0.138])}, grain) * (0.94 + 0.12 * lkH2(vec2(board, 3.0))) * (1.0 + 0.16 * fib);
        pine *= 1.0 - 0.48 * bSeam;
        pine = mix(pine, ${v3([0.048, 0.028, 0.015])}, stamp * 0.82);
        diffuseColor.rgb = pine;
        roughnessFactor = clamp(0.54 + 0.10 * fib + 0.18 * stamp, 0.42, 0.78);`,
    });
  }
  /* Blown-glass vintage wine bottles (bottle, bottleG, bottleA) with wrapped cotton-paper estate labels:
     Renders deep antique Bordeaux green, dead-leaf Burgundy olive, or dark amber glass on the bottle neck, shoulder,
     and base, and wraps a crisp cream cotton-paper chateau label with gold foil crest and engraved vintage typography
     around the straight cylindrical body (vLkUv.y in 0.16..0.52, linear height fraction) so every tilted or standing bottle displays its label cleanly. */
  function wineBottleGlass(orig, key, glassRgb) {
    return code(phys({ envMapIntensity: 1.35, roughness: 0.08, clearcoat: 1.0, clearcoatRoughness: 0.04 }), key, {
      surface: `
        vec2 uv = vLkUv;
        float cPx = mix(lkPxM, lkPx, 0.35);
        // Wrapped estate label band strictly on the cylindrical belly of the bottle (linear height uv.y in 0.16..0.52)
        float uAng = abs(uv.x - 0.5);
        float inLabelU = 1.0 - smoothstep(0.21, 0.23, uAng);
        float inLabelV = smoothstep(0.16, 0.175, uv.y) * (1.0 - smoothstep(0.505, 0.52, uv.y));
        float isLabel = inLabelU * inLabelV;
        // Normalized coordinates inside the label [0..1, 0..1]
        float lu = clamp((uv.x - 0.28) / 0.44, 0.0, 1.0);
        float lv = clamp((uv.y - 0.165) / 0.35, 0.0, 1.0);
        float bEdge = min(min(lu, 1.0 - lu), min(lv, 1.0 - lv));
        float goldBorder = smoothstep(0.028, 0.042, bEdge) * (1.0 - smoothstep(0.056, 0.070, bEdge));
        // Upper golden chateau crest medallion (lv around 0.74, lu around 0.50)
        float dCrest = length(vec2((lu - 0.50) * 1.4, (lv - 0.74) * 1.8));
        float goldCrest = (1.0 - smoothstep(0.08, 0.13, dCrest)) * (0.55 + 0.45 * sin(lu * 95.0) * cos(lv * 95.0));
        // Engraved chateau name band (lv in 0.46..0.56) & vintage year / appellation lines below
        float titleBand = step(abs(lu - 0.50), 0.34) * step(abs(lv - 0.51), 0.045) * (0.45 + 0.55 * smoothstep(0.2, 0.8, sin(lu * 180.0)));
        float subBand = step(abs(lu - 0.50), 0.24) * step(abs(lv - 0.35), 0.025);
        float yearBand = step(abs(lu - 0.50), 0.12) * step(abs(lv - 0.20), 0.022);
        // Subtle red wax/ribbon seal at bottom-right of label
        float redSeal = 1.0 - smoothstep(0.035, 0.058, length(vec2((lu - 0.74) * 1.3, (lv - 0.21) * 1.6)));
        float paperGrain = (lkn(vec3(vDrawW * 180.0)) - 0.5) * lkKeep(0.002, cPx);
        vec3 paperCol = ${v3([0.78, 0.73, 0.63])} * (1.0 + 0.08 * paperGrain);
        paperCol = mix(paperCol, ${v3([0.48, 0.31, 0.09])}, clamp(goldBorder + goldCrest, 0.0, 1.0) * 0.88);
        paperCol = mix(paperCol, ${v3([0.045, 0.038, 0.032])}, clamp(titleBand * 0.85 + subBand * 0.65 + yearBand * 0.70, 0.0, 1.0));
        paperCol = mix(paperCol, ${v3([0.38, 0.04, 0.05])}, redSeal * 0.85);
        // Deep blown bottle glass with subtle cylindrical specular highlight & ruby wine depth
        float glassStreak = 0.5 + 0.5 * sin(uv.x * 12.566 + vDrawW.y * 8.0);
        vec3 gCol = ${v3(glassRgb)} * (0.82 + 0.36 * glassStreak);
        float h = isLabel * (0.00015 + 0.00004 * paperGrain - 0.00005 * titleBand);
        ${SLOPE('h')}
        diffuseColor.rgb = mix(gCol, paperCol, isLabel);
        roughnessFactor = mix(0.07, 0.68, isLabel * (1.0 - 0.65 * clamp(goldBorder + goldCrest, 0.0, 1.0)));`,
    });
  }
  /* Patio architectural planter foliage (agave, agave2, flax, flax2):
     Natural Mediterranean botanical rosette & sword leaves in desaturated olive-sage, glaucous jade, and muted celadon
     with dihedral keel shading, fine longitudinal vascular ribs, natural dry russet margins, and directional courtyard bounce. */
  function patioPlantLeaf(orig, key, warmVar) {
    return code(phys({
      envMapIntensity: 0.65,
      roughness: 0.44,
      clearcoat: 0.14,
      clearcoatRoughness: 0.34,
      sheen: 0.28,
      sheenRoughness: 0.52,
      sheenColor: new THREE.Color(0.12, 0.15, 0.10),
      side: THREE.DoubleSide,
    }), key, {
      surface: `
        vec2 uv = vLkUv;
        float cPx = mix(lkPxM, lkPx, 0.35);
        float ax = abs(uv.x - 0.5) * 2.0;                                    // 0 at center keel, 1 at outer leaf margin
        float lv = fract(uv.y);                                              // 0 at leaf base, 1 at leaf tip
        float leafId = floor(uv.y);
        float rTone = lkH2(vec2(leafId, ${warmVar ? '7.3' : '2.1'}));
        // Tapered central vascular midrib / keel
        float midW = mix(0.080, 0.016, lv);
        float midrib = (1.0 - smoothstep(midW * 0.35, midW + fwidth(ax) * 1.2, ax)) * (1.0 - 0.45 * smoothstep(0.72, 1.0, lv));
        // Subtle muted sage marginal graduation & dry russet-umber botanical edge hairline
        float varStripe = smoothstep(0.74, 0.86, ax) * (1.0 - smoothstep(0.91, 0.96, ax)) * (1.0 - 0.40 * smoothstep(0.80, 1.0, lv));
        float dryEdge = smoothstep(0.91, 0.98, ax) + 0.60 * smoothstep(0.92, 1.0, lv);
        // Fine longitudinal vascular leaf fibers, organic cellular mottle, and dihedral half-blade contrast
        float ribs = 0.5 + 0.5 * sin(ax * 115.0 + lkn(vec3(vDrawW * 18.0)) * 2.0);
        float mottle = lkn(vec3(vDrawW * 7.5 + leafId * 1.7));
        float cell = lkn(vec3(ax * 28.0, lv * 64.0, leafId * 3.1));
        float halfShade = (smoothstep(0.45, 0.55, uv.x) - 0.5) * (1.0 - midrib);
        // Deep natural self-occlusion in the rosette heart where blades emerge from dark soil & pebbles
        float baseAO = mix(0.24, 1.0, smoothstep(0.0, 0.46, lv)) * mix(0.76, 1.0, smoothstep(0.0, 0.58, ax));
        vec3 deepGreen = ${v3([0.036, 0.072, 0.036])};
        vec3 midGreen  = ${warmVar ? v3([0.148, 0.228, 0.108]) : v3([0.124, 0.204, 0.102])};
        vec3 glaucous  = ${v3([0.138, 0.205, 0.145])};
        vec3 coreGreen = mix(deepGreen, midGreen, clamp(0.50 * smoothstep(0.08, 0.82, lv) + 0.30 * mottle + 0.20 * rTone, 0.0, 1.0));
        coreGreen = mix(coreGreen, glaucous, (1.0 - smoothstep(0.18, 0.78, lv)) * (1.0 - rTone) * 0.40);
        coreGreen *= (0.85 + 0.26 * ribs * lkKeep(0.004, cPx)) * (0.90 + 0.18 * cell) * (1.0 + 0.28 * halfShade);
        vec3 midCol = ${v3([0.195, 0.268, 0.138])};
        vec3 varCol = ${warmVar ? v3([0.215, 0.278, 0.148]) : v3([0.172, 0.242, 0.132])};
        vec3 rimCol = ${v3([0.175, 0.108, 0.062])};
        vec3 col = mix(coreGreen, midCol, midrib * 0.42);
        col = mix(col, varCol, varStripe * ${warmVar ? '0.26' : '0.12'});
        col = mix(col, rimCol, clamp(dryEdge, 0.0, 1.0) * 0.55);
        col *= baseAO;
        if (!gl_FrontFacing) col = col * 0.72 + ${v3([0.012, 0.022, 0.012])};
        float h = (0.00065 * midrib + 0.00018 * (ribs - 0.5) * lkKeep(0.004, cPx)) * (gl_FrontFacing ? 1.0 : -1.0);
        ${SLOPE('h')}
        diffuseColor.rgb = col;
        roughnessFactor = clamp(0.38 + 0.14 * (1.0 - midrib) + 0.08 * ribs + 0.06 * (1.0 - lv), 0.28, 0.68);`,
      normal: TILT,
      end: `
        vec3 wn = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
        vec3 courtDir = normalize(vec3(0.58, 0.74, 0.34));
        float courtLit = pow(clamp(dot(wn, courtDir) * 0.65 + 0.35, 0.0, 1.0), 1.35) * (gl_FrontFacing ? 1.0 : 0.28);
        float tipVis = smoothstep(0.14, 0.84, fract(vLkUv.y));
        float inShadow = 1.0 - clamp(dot(reflectedLight.directDiffuse, vec3(0.333)) * 2.5, 0.0, 1.0);
        reflectedLight.indirectDiffuse += material.diffuseColor * vec3(0.68, 0.65, 0.58) * tipVis * (0.10 + 0.90 * courtLit) * (0.22 + 0.78 * inShadow);`,
    });
  }
  /* Oiled Burmese Plantation Teak (teak / outdoorTeak) for the Patio Lounge, Coffee Table & Pool Loungers:
     Automatically orients grain along each member's structural axis (along x on N/S rails and coffee table slats, along z on
     E/W rails and loungers, and vertically up posts/legs), with golden-honey to warm roasted-amber heartwood, dark mineral
     silica streaks, interlocked open pores, stave variation, and a hand-rubbed satin marine teak oil finish. */
  function outdoorTeak(orig) {
    return code(phys({ envMapIntensity: 0.72, roughness: 0.34, clearcoat: 0.26, clearcoatRoughness: 0.22 }), 'outdoorTeak', {
      surface: `
        vec3 p = vDrawW;
        float pxPlan = p.x + 30.0, pyPlan = p.z + 24.0;
        float tPx = mix(lkPxM, lkPx, 0.35);
        // Determine member axis: vertical posts/legs vs horizontal rails/slats running along X or Z
        bool isVertSide = abs(lkWN.y) < 0.55;
        bool runAlongX = isVertSide
          ? (abs(lkWN.z) > abs(lkWN.x))
          : ((pyPlan < 10.12 && pxPlan > 25.5 && pxPlan < 31.6) || (pyPlan > 10.65 && pyPlan < 12.25 && pxPlan > 27.1 && pxPlan < 29.5));
        // g.x: across the grain, g.y: along the grain
        vec2 g = runAlongX ? vec2(p.z + p.y * 0.7, p.x) : vec2(p.x + p.y * 0.7, p.z);
        if (isVertSide && p.y > 0.27 && abs(lkWN.x) > 0.35 && abs(lkWN.z) > 0.35) {
          g = vec2(p.x + p.z, p.y);
        }
        float stave = floor(g.x / 0.068);
        float r1 = lkH2(vec2(stave, 3.7)), r2 = lkH2(vec2(stave, 9.1));
        float warp = lkFbm(vec3(g.x * 2.8, g.y * 0.65, r1 * 5.0), 1.9, 0.52, 3, tPx * 0.5).x;
        float ringCoord = (g.x * 16.0 + warp * 2.6) + r2 * 4.0;
        float rVis = 1.0 - smoothstep(0.24, 0.62, fwidth(ringCoord));
        float ring = fract(ringCoord);
        float earlyLate = mix(0.46, smoothstep(0.0, 0.24, ring) * (1.0 - smoothstep(0.54, 0.94, ring)), rVis);
        // Characteristic dark mineral/silica oily streaks of Burmese teak
        float darkStreak = smoothstep(0.62, 0.88, lkn(vec3(g.x * 28.0 + warp * 3.2, g.y * 1.4, r1 * 11.0))) * (0.45 + 0.55 * rVis);
        float fib = (lkn(vec3(g.x * 420.0, g.y * 14.0, r1 * 7.0)) - 0.5) * lkKeep(0.0018, tPx)
                  + 0.55 * (lkn(vec3(g.x * 140.0, g.y * 5.0, r2 * 13.0)) - 0.5) * lkKeep(0.0055, tPx);
        float pore = smoothstep(0.75, 0.90, lkn(vec3(g.x * 680.0, g.y * 34.0, r2 * 17.0))) * lkKeep(0.0012, tPx);
        float ray = 0.5 + 0.5 * sin(g.y * 18.0 + warp * 4.5);
        float h = 0.00014 * earlyLate + 0.00008 * fib - 0.00014 * pore - 0.00006 * darkStreak;
        ${SLOPE('h')}
        lkG *= lkFlat(lkWN);
        vec3 teakDark = ${v3([0.115, 0.056, 0.022])};
        vec3 teakMid  = ${v3([0.215, 0.116, 0.048])};
        vec3 teakGold = ${v3([0.335, 0.192, 0.086])};
        vec3 col = mix(teakDark, mix(teakMid, teakGold, 0.42 + 0.58 * ray), earlyLate);
        col = mix(col, ${v3([0.068, 0.032, 0.012])}, darkStreak * 0.58);
        col *= (0.90 + 0.20 * r1) * (1.0 + 0.22 * fib) * (1.0 - 0.32 * pore);
        diffuseColor.rgb = col;
        roughnessFactor = clamp(0.30 + 0.08 * (1.0 - earlyLate) + 0.14 * pore + 0.06 * abs(fib), 0.22, 0.56);`,
    });
  }
  /* Luxury Outdoor Performance Bouclé-Linen Upholstery (outdoorWhite & outdoorSage) for the Patio Lounge Cushions:
     Combines tactile multi-ply basketweave and bouclé loop micro-relief with double French welt piping (CLOTH_SEAM),
     soft fold shading, and sky-hemisphere indirect lift so the white and sage-olive green cushions stay crisp and rich in shade. */
  function outdoorFabric(orig, key, col, isSage) {
    return code(phys({
      envMapIntensity: 0.48,
      roughness: 0.85,
      sheen: 1.0,
      sheenRoughness: 0.46,
      sheenColor: new THREE.Color().setRGB(col[0] * 0.58 + 0.03, col[1] * 0.64 + 0.03, col[2] * 0.55 + 0.03),
    }), key, {
      head: BOUCLE + LINEN + SEAM,
      surface: `
        vec2 q; vec3 ta, tb; lkPlane(lkP, lkWN, q, ta, tb);
        float fPx = mix(lkPxM, lkPx, 0.30);
        vec4 au; float hBoucle = bcH(q, fPx, au);
        float hLinen = lnH(q * 1.15, fPx, ${isSage ? '4.7' : '1.9'}, lnA);
        // Coarse architectural basketweave grid (4.5 mm pitch) visible at medium patio distance
        float kWeave = lkKeep(0.0045, fPx);
        vec2 wc = q / 0.0045, wi = floor(wc), wf = fract(wc);
        float wOver = mod(wi.x + wi.y, 2.0);
        float basket = kWeave * (mix(sin(3.14159 * wf.x), sin(3.14159 * wf.y), wOver) * 0.65 + 0.35 * sin(3.14159 * wf.x) * sin(3.14159 * wf.y));
        float hh = 0.72 * hBoucle + 0.45 * hLinen + 0.00048 * basket;
        ${SLOPE('hh')}
        float lift = clamp((hBoucle + 0.0004 * basket) / 0.0018, 0.0, 1.0);
        float shade = mix(0.92, mix(0.78, 1.12, lift), max(au.z, max(au.w, kWeave)));
        float two = mix(0.5, mix(au.x, au.y, 0.45), max(au.z, au.w));
        vec3 yarnA = ${isSage ? 'vec3(0.80, 0.90, 0.80)' : 'vec3(0.94, 0.93, 0.91)'};
        vec3 yarnB = ${isSage ? 'vec3(1.04, 1.08, 0.98)' : 'vec3(1.06, 1.06, 1.05)'};
        float slub = (lnA.x - 0.5 * lkKeep(0.003, fPx) * 2.0) * 0.06 + (lnA.y - 0.5 * lkKeep(0.009, fPx) * 2.0) * 0.05;
        vec3 baseCol = ${v3(col)} * shade * mix(yarnA, yarnB, two) * (1.0 + slub);
        baseCol *= 1.0 + 0.05 * lkFbm(vec3(q, 3.0), 4.5, 0.5, 3, fPx).x - 0.04 * (1.0 - lnA.z);
        diffuseColor.rgb = baseCol / ${isSage ? '0.98' : '0.94'};
        roughnessFactor = clamp(0.88 - 0.10 * lift - 0.05 * kWeave * basket, 0.62, 0.96);
        ${CLOTH_SEAM(0.0038)}`,
      end: `
        float skyUp = clamp(normalize((vec4(geometryNormal, 0.0) * viewMatrix).xyz).y * 0.5 + 0.5, 0.0, 1.0);
        reflectedLight.indirectDiffuse += material.diffuseColor * ${isSage ? 'vec3(0.09, 0.12, 0.08)' : 'vec3(0.14, 0.14, 0.13)'} * (0.45 + 0.55 * skyUp);`,
    });
  }
  /* Hand-Woven Architectural Outdoor Rope / Cordage (outdoorRope) for the Patio Lounge Open-Frame Backrest:
     4-strand braided charcoal-taupe olefin/polypropylene outdoor rope with diagonal herringbone strand relief. */
  function outdoorRope(orig) {
    return code(phys({ envMapIntensity: 0.38, roughness: 0.78, sheen: 0.45, sheenRoughness: 0.55, sheenColor: new THREE.Color(0.16, 0.15, 0.13) }), 'outdoorRope', {
      surface: `
        vec3 p = vDrawW;
        float rPx = mix(lkPxM, lkPx, 0.32);
        float braid = sin(p.y * 360.0 + (p.x + p.z) * 240.0) * cos(p.y * 360.0 - (p.x - p.z) * 240.0) * lkKeep(0.0035, rPx);
        float rib = sin(p.y * 180.0) * lkKeep(0.006, rPx);
        float h = 0.00035 * braid + 0.00020 * rib;
        ${SLOPE('h')}
        vec3 col = mix(${v3([0.085, 0.078, 0.070])}, ${v3([0.148, 0.136, 0.122])}, 0.5 + 0.35 * braid + 0.15 * rib);
        diffuseColor.rgb = col;
        roughnessFactor = clamp(0.76 - 0.10 * braid, 0.58, 0.92);`,
    });
  }
  /* Nero Marquina & Sahara Noir semi-polished black marble slabs (marbleNero) for the Glass Gallery and Master Bedroom floor:
     1.50 x 3.00 m large-format slabs (centered joint at x = 42.50 down the 3 m gallery), with deep obsidian-anthracite
     mineral clouds, razor-sharp white crystalline calcite fracture veins (slLine, zero contour loops), warm Sahara Noir
     golden-amber secondary veins, eased bevelled slab arrises, and a rich mirror-satin clearcoat sheen. */
  function neroSlabs(orig) {
    return code(phys({ envMapIntensity: 0.72, roughness: 0.14, clearcoat: 0.65, clearcoatRoughness: 0.09 }), 'slabNero', {
      head: SLAB,
      surface: `
        vec3 wp = vDrawW;
        float inNiche = step(wp.x, ${f(9.82 - 30.0)}) * step(${f(2.94 - 24.0)}, wp.z) * step(wp.z, ${f(4.16 - 24.0)}) * step(0.86, wp.y) * step(wp.y, 2.11);
        vec2 qNiche = vec2(wp.y * 1.42 + (wp.x + 20.78) * 0.90 + 12.65, wp.z * 1.28 - wp.y * 0.36 - 15.10);
        vec2 q = mix(wp.xz + vec2(wp.y * 0.65, -wp.y * 0.45), qNiche, inNiche);
        vec2 o = vec2(11.0, -16.0), sz = vec2(1.5, 3.0);
        float mPx = mix(lkPxM, lkPx, 0.26);
        float colIdx = floor((wp.x - o.x) / sz.x);
        vec2 c = vec2((wp.x - o.x) / sz.x, (wp.z - o.y) / sz.y + 0.5 * mod(colIdx, 2.0));
        vec2 id = floor(c), lq = fract(c) * sz;
        float r1 = lkH2(id + 4.1), r2 = lkH2(id + 9.3), r3 = lkH2(id + 17.7);
        vec2 e2 = min(lq, sz - lq); float ej = min(e2.x, e2.y);
        vec2 pq = max(fwidth(wp.xz), vec2(1e-5));
        vec2 gw2 = max(vec2(0.0008), pq * 0.80), ew2 = max(vec2(0.0022), pq * 1.45);
        vec2 g2 = 1.0 - smoothstep(gw2 * 0.55, gw2 * 1.35, e2), a2 = 1.0 - smoothstep(vec2(0.0), ew2, e2);
        float gfar = (1.0 - smoothstep(0.038, 0.090, mPx)) * step(0.5, abs(lkWN.y)) * (1.0 - inNiche);
        float grout = max(g2.x, g2.y) * gfar, arris = max(a2.x, a2.y) * gfar;
        float gw = mix(gw2.y, gw2.x, step(e2.x, e2.y)), ew = mix(ew2.y, ew2.x, step(e2.x, e2.y));
        // Continuous quarry block coordinate with subtle per-slab tectonic shift
        vec2 sp = q + vec2(r1 * 0.42, r2 * 0.38) * (1.0 - inNiche);
        vec2 w1 = vec2(lkFbm(vec3(sp * vec2(0.55, 0.42), 31.0), 1.0, 0.54, 3, mPx).x,
                       lkFbm(vec3(sp * vec2(0.55, 0.42), 33.0), 1.0, 0.54, 3, mPx).x);
        vec2 w2 = vec2(lkFbm(vec3(sp * vec2(1.75, 1.35), 35.0), 1.0, 0.55, 3, mPx).x,
                       lkFbm(vec3(sp * vec2(1.75, 1.35), 37.0), 1.0, 0.55, 3, mPx).x);
        float w3 = lkFbm(vec3(sp * 5.4, 39.0), 1.0, 0.55, 2, mPx).x;
        vec2 qp = sp + 0.52 * w1 + 0.22 * w2 + 0.045 * w3;
        vec2 rv = mat2(0.62, -0.78, 0.78, 0.62) * qp;
        vec2 cv = mat2(0.85, 0.52, -0.52, 0.85) * qp;
        vec2 xv = mat2(0.34, 0.94, -0.94, 0.34) * qp;
        float m1 = max(smoothstep(-0.24, 0.26, lkFbm(vec3(sp * 0.62, 41.0), 1.0, 0.5, 2, mPx).x), 0.90 * inNiche);
        float m2 = max(smoothstep(-0.18, 0.30, lkFbm(vec3(sp * 1.15, 43.0), 1.0, 0.5, 2, mPx).x), 0.84 * inNiche);
        float m3 = max(smoothstep(-0.10, 0.36, lkFbm(vec3(sp * 1.95, 45.0), 1.0, 0.5, 2, mPx).x), 0.76 * inNiche);
        // 1. Crisp stark-white Nero Marquina crystalline calcite fracture veins
        float v1 = slLine(rv.x * 0.56 + rv.y * 0.11 + 0.012 * w3, 0.0052) * m1;
        float v2 = slLine(cv.x * 0.94 - cv.y * 0.16 + 0.37, 0.0046) * m2;
        float v3 = slLine(xv.x * 1.68 + xv.y * 0.22 + 0.61, 0.0042) * m3 * lkKeep(0.012, mPx);
        float veinWhite = clamp(0.92 * v1 + 0.76 * v2 + 0.54 * v3, 0.0, 1.0);
        // Soft mineral breccia halo along primary white veins
        float vHalo = slLine(rv.x * 0.56 + rv.y * 0.11, 0.024) * m1 * 0.35 + slLine(cv.x * 0.94 - cv.y * 0.16 + 0.37, 0.018) * m2 * 0.25;
        // 2. Sahara Noir warm golden-amber & bronze calcite veins
        float g1 = slLine(cv.x * 0.72 + cv.y * 0.14 + 0.19 + 0.03 * w2.x, 0.0048) * m2;
        float g2v = slLine(rv.x * 1.28 - rv.y * 0.19 + 0.73, 0.0042) * m3;
        float veinGold = clamp(0.85 * g1 + 0.65 * g2v, 0.0, 1.0);
        // 3. Deep obsidian-anthracite matrix with multi-scale mineral clouds and fine crystalline calcite grain
        float cloud = lkFbm(vec3(sp * 0.85, 47.0), 1.2, 0.55, 4, mPx).x;
        float cloudMed = lkFbm(vec3(sp * 2.2, 49.0), 8.5, 0.55, 3, mPx).x;
        vec4 grain = lkFbm(vec3(sp, 51.0), 145.0, 0.58, 3, mPx);
        float ease = smoothstep(0.0, max(0.005, lkPx * 2.0), ej);
        float h0 = ((r1 - 0.5) * 0.00024 + (r2 - 0.5) * 0.00042 * (lq.x / sz.x - 0.5) + (r3 - 0.5) * 0.00042 * (lq.y / sz.y - 0.5)) * ease * step(0.5, abs(lkWN.y)) * (1.0 - inNiche)
                 - 0.0011 * grout * (0.0008 / gw) - 0.00072 * arris * (0.0022 / ew)
                 + 0.00004 * cloudMed + 0.00006 * veinWhite + 0.00004 * veinGold;
        ${SLOPE('h0')}
        lkG *= lkFlat(lkWN);
        float neb = smoothstep(-0.36, 0.36, 0.60 * cloud + 0.40 * w1.x);
        vec3 col = mix(${v3([0.008, 0.008, 0.010])}, ${v3([0.019, 0.019, 0.022])}, neb);
        col *= (1.0 + 0.14 * cloudMed + 0.08 * grain.x) * (0.94 + 0.12 * r3);
        col = mix(col, ${v3([0.068, 0.066, 0.062])}, clamp(vHalo, 0.0, 1.0));
        col = mix(col, ${v3([0.52, 0.35, 0.155])}, veinGold * 0.82);
        col = mix(col, ${v3([0.72, 0.70, 0.66])}, veinWhite * 0.90);
        col *= 1.0 + 0.08 * arris * (1.0 - grout);
        col = mix(col, ${v3([0.005, 0.005, 0.006])}, grout * 0.88);
        // Preserve the kitchen stove-niche under-hood LED task light highlight (x < 9.82, y = 2.94..4.16)
        float ledStrip = inNiche * pow(smoothstep(1.08, 1.56, wp.y), 2.0) * (1.0 - smoothstep(1.56, 1.65, wp.y)) * exp(-max(0.0, wp.x - ${f(9.26 - 30.0)}) * 3.8);
        col += ledStrip * (${v3([0.018, 0.013, 0.007])} + 0.25 * veinWhite * ${v3([0.92, 0.74, 0.44])});
        diffuseColor.rgb = col;
        roughnessFactor = clamp(0.12 + 0.05 * (1.0 - neb) + 0.04 * cloudMed - 0.04 * veinWhite + 0.58 * grout + 0.14 * arris + 0.28 * inNiche - 0.04 * ledStrip, 0.07, 0.86);`,
      light: `
        float inNicheL = step(vDrawW.x, ${f(9.82 - 30.0)}) * step(${f(2.94 - 24.0)}, vDrawW.z) * step(vDrawW.z, ${f(4.16 - 24.0)}) * step(0.86, vDrawW.y) * step(vDrawW.y, 2.11);
        material.clearcoat *= 1.0 - 0.88 * inNicheL;
        material.clearcoatRoughness = mix(material.clearcoatRoughness, 0.52, inNicheL);`,
    });
  }
  /* Museum-grade fluted Roman travertine & honed limestone sculpture pedestals (plinthW) for the Glass Gallery
     and Master Bedroom (corner drum side table at 42.52, 39.04 and door-side vase pedestal at 50.56, 34.86):
     Vertical architectural reeding/fluting, horizontal ashlar course reveals, warm vein-cut sedimentary mineral bands,
     elongated travertine vugs with pale calcite rims, and a silky honed sheen. */
  function plinthStone(orig) {
    return code(phys({ envMapIntensity: 0.78, roughness: 0.32, clearcoat: 0.26, clearcoatRoughness: 0.22 }), 'plinthStone', {
      surface: `
        vec3 p = vDrawW;
        float sPx = mix(lkPxM, lkPx, 0.26);
        float pxPlan = p.x + 30.0, pyPlan = p.z + 24.0, pzH = p.y;
        float isVert = 1.0 - smoothstep(0.45, 0.75, abs(lkWN.y));
        bool inBedDrum   = pyPlan > 37.2 && pxPlan < 44.5;
        bool inBathStool = pyPlan > 39.2 && pxPlan > 52.8;
        bool inBedPed    = pyPlan > 33.8 && pxPlan > 49.5 && !inBathStool;
        // Local horizontal coordinate across whichever pedestal or cylindrical drum we are on
        float uFace = inBedDrum   ? (atan(pyPlan - 39.18, pxPlan - 42.42) * 0.255)
                    : inBathStool ? (atan(pyPlan - 40.05, pxPlan - 53.62) * 0.195)
                    : inBedPed    ? (atan(pyPlan - 34.86, pxPlan - 50.56) * 0.185)
                    : (abs(lkWN.x) > abs(lkWN.z) ? (pyPlan - (pyPlan < 16.9 ? 13.9 : (pyPlan < 22.9 ? 19.9 : 25.9))) : (pxPlan - 41.62));
        // Vertical architectural fluting (3.4 cm to 4.0 cm pitch) on the column body, stopping cleanly at top and bottom margins
        float fPitch = inBedDrum ? 0.0367 : (inBathStool ? 0.03403 : (inBedPed ? 0.0349 : 0.040));
        float fDist = abs(fract(uFace / fPitch + 0.5) - 0.5) * fPitch;
        float kFlute = lkKeep(0.011, sPx) * isVert * smoothstep(0.028, 0.045, pzH) * (inBathStool ? (1.0 - smoothstep(0.415, 0.435, pzH)) : 1.0);
        float vGroove = (1.0 - smoothstep(0.0016, max(0.0040, sPx * 1.25), fDist)) * kFlute;
        float vReed = sin(clamp(fDist / (0.5 * fPitch), 0.0, 1.0) * 3.14159) * kFlute;
        // Horizontal ashlar stone reveal grooves
        float hRevDist = (inBedDrum || inBathStool) ? abs(pzH - 0.23) : min(abs(pzH - 0.34), abs(pzH - 0.58));
        float hGroove = (1.0 - smoothstep(0.0016, max(0.0036, sPx * 1.25), hRevDist)) * isVert * lkKeep(0.011, sPx);
        // Vertical vein-cut Roman travertine sedimentary strata & elongated travertine pores
        float wv = lkFbm(vec3(p.x * 2.2, p.y * 1.4, p.z * 2.2), 1.6, 0.54, 3, sPx).x;
        float strataCoord = isVert > 0.5 ? (uFace * 14.0 + pzH * 2.2 + wv * 1.4) : (p.x * 14.0 + p.z * 4.0 + wv * 1.2);
        float strata = 0.55 * lkn(vec3(strataCoord, pzH * 2.4, 3.0)) + 0.45 * lkn(vec3(strataCoord * 2.8, pzH * 5.2, 7.0));
        float pv1 = lkn(vec3((uFace + wv * 0.04) * 95.0, pzH * 18.0, p.x * 18.0 + 5.0));
        float pv2 = lkn(vec3((uFace + wv * 0.04) * 185.0, pzH * 36.0, p.z * 24.0 + 11.0));
        float pore = (smoothstep(0.76, 0.89, pv1) * lkKeep(0.0085, sPx) + 0.75 * smoothstep(0.78, 0.90, pv2) * lkKeep(0.0038, sPx)) * smoothstep(0.25, 0.72, strata);
        float poreRim = (smoothstep(0.68, 0.76, pv1) - smoothstep(0.76, 0.89, pv1)) * lkKeep(0.0085, sPx);
        float calVein = (1.0 - smoothstep(0.003, max(0.016, sPx * 1.6), abs(wv - 0.06))) * lkKeep(0.014, sPx);
        float grain = (lkn(p * 240.0) - 0.5) * lkKeep(0.0025, sPx);
        float h = 0.00115 * vReed - 0.00135 * vGroove - 0.00105 * hGroove + 0.00028 * (strata - 0.5) - 0.0015 * pore + 0.00008 * grain;
        ${SLOPE('h')}
        lkG *= lkFlat(lkWN);
        vec3 stoneDark = ${v3([0.52, 0.465, 0.385])};
        vec3 stoneLight = ${v3([0.74, 0.685, 0.595])};
        vec3 col = mix(stoneDark, stoneLight, smoothstep(0.16, 0.84, strata));
        col *= (0.92 + 0.16 * vReed + 0.09 * grain + 0.10 * poreRim);
        col = mix(col, ${v3([0.84, 0.78, 0.69])}, calVein * 0.55);
        col *= (1.0 - 0.38 * pore) * (1.0 - 0.28 * vGroove) * (1.0 - 0.28 * hGroove) * (inBathStool ? 0.76 : 1.0);
        diffuseColor.rgb = col;
        roughnessFactor = clamp(0.32 + 0.10 * (1.0 - strata) + 0.30 * pore + 0.16 * vGroove, 0.20, 0.80);`,
    });
  }
  /* Bespoke Architectural Illuminated Vanity Mirror for the Master Bedroom Makeup Desk (x = 50.82, y = 36.22..37.78, z = 0.92..2.24):
     (18 Oct, Sam: "Replace the painting by a mirror, but the mirror doesn't need to show actual reflection. Just create a mirror and
     add some light texture inside so we can see.")
     Features a 2.4 cm diamond-polished perimeter bevel with prismatic edge highlights, silvered low-iron glass reflection gradient,
     soft architectural reflection of the sunlit West window bay, airy pearl-ivory sheer curtain folds, dark bronze window mullion,
     warm opal-glass vanity lamp orb glow, and crisp diagonal architectural glass sheen streaks. */
  function vanityMirror(orig) {
    return code(phys({
      envMapIntensity: 1.85,
      roughness: 0.06,
      metalness: 0.22,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      specularIntensity: 1.0,
    }), 'vanityMirror', {
      surface: `
        vec3 p = vDrawW;
        float pyPlan = p.z + 24.0, pzH = p.y;
        // Normalized mirror coordinates: u in [-1, 1] along Y (36.22..37.78, center 37.00, half-width 0.78),
        // v in [-1, 1] along Z (0.92..2.24, center 1.58, half-height 0.66)
        float u = clamp((pyPlan - 37.00) / 0.78, -1.0, 1.0);
        float v = clamp((pzH - 1.58) / 0.66, -1.0, 1.0);
        // Also support the small round tabletop magnifying mirror at (50.56, 37.56, z = 1.02, r = 0.095)
        bool isSmallMir = p.x + 30.0 < 50.72;
        if (isSmallMir) {
          u = clamp((pyPlan - 37.56) / 0.095, -1.0, 1.0);
          v = clamp((pzH - 1.02) / 0.095, -1.0, 1.0);
        }
        // 1. 2.4 cm diamond-polished perimeter bevel & inner etched v-groove
        float dEdge = isSmallMir ? (1.0 - length(vec2(u, v))) : min(0.78 - abs(pyPlan - 37.00), 0.66 - abs(pzH - 1.58));
        float bevelW = isSmallMir ? 0.14 : 0.026;
        float inBevel = 1.0 - smoothstep(0.0, bevelW, dEdge);
        float bevelLine = exp(-pow((dEdge - bevelW) / max(0.0022, lkPx * 1.4), 2.0));
        float bevelSlope = inBevel * (u * 0.45 + v * 0.55);
        // 2. Luminous interior silvered-glass light texture:
        //    - Upper sky & sunlit West window bay reflection
        //    - Gathered pearl-ivory sheer curtain folds on the left/right edges of the reflected window
        //    - Subtle bronze window mullion & warm charred-larch / walnut room depth
        //    - Warm golden orb reflection from the vanity table lamp at (u ~ -0.62, v ~ -0.42)
        //    - Diagonal architectural glass sheen bands (42-degree specular streaks)
        float skyGrad = smoothstep(-0.85, 0.92, v);
        float winBay = smoothstep(-0.72, -0.38, u) * (1.0 - smoothstep(0.42, 0.78, u)) * smoothstep(-0.55, 0.85, v);
        float curtainRefl = (smoothstep(-0.82, -0.45, u) * (1.0 - smoothstep(-0.45, -0.18, u)) + smoothstep(0.28, 0.52, u) * (1.0 - smoothstep(0.52, 0.84, u)))
                          * (0.72 + 0.28 * sin(u * 48.0));
        float mullionRefl = exp(-pow((u - 0.04) / 0.018, 2.0)) * smoothstep(-0.55, 0.85, v);
        // Diagonal light shafts across the silvered glass
        float diag = u * 0.74 + v * 0.67;
        float streak1 = exp(-pow((diag - 0.18) / 0.16, 2.0));
        float streak2 = exp(-pow((diag + 0.34) / 0.09, 2.0));
        float streak3 = exp(-pow((diag - 0.56) / 0.11, 2.0));
        float sheenStreaks = 0.62 * streak1 + 0.48 * streak2 + 0.38 * streak3;
        // Warm vanity table lamp reflection orb in the lower-left quadrant
        float dLamp = length(vec2((u + 0.58) * 1.15, (v + 0.42) * 1.0));
        float lampOrb = exp(-dLamp * dLamp * 14.0) + 0.35 * exp(-dLamp * 3.8);
        // Subtle silvered-glass micro-grain and edge vignette
        float vig = smoothstep(0.0, 0.08, dEdge);
        vec3 colBase = mix(${v3([0.34, 0.37, 0.40])}, ${v3([0.74, 0.78, 0.82])}, skyGrad);
        vec3 colWin  = ${v3([0.92, 0.91, 0.87])};
        vec3 colCurt = ${v3([0.96, 0.94, 0.89])};
        vec3 col = mix(colBase, colWin, winBay * 0.58);
        col = mix(col, colCurt, curtainRefl * 0.45);
        col *= (1.0 - 0.28 * mullionRefl);
        col += ${v3([0.38, 0.39, 0.41])} * sheenStreaks;
        col += ${v3([0.68, 0.50, 0.28])} * lampOrb * 0.65;
        // Prismatic bevel refraction highlight
        col = mix(col, ${v3([0.94, 0.95, 0.97])}, inBevel * (0.42 + 0.38 * bevelSlope));
        col = mix(col, ${v3([0.98, 0.98, 1.00])}, bevelLine * 0.65);
        col *= (0.86 + 0.14 * vig);
        float h = 0.00065 * inBevel * bevelSlope - 0.00035 * bevelLine;
        ${SLOPE('h')}
        diffuseColor.rgb = col;
        totalEmissiveRadiance += col * (0.34 + 0.26 * sheenStreaks + 0.22 * inBevel) + ${v3([0.48, 0.34, 0.16])} * lampOrb * 0.55;
        roughnessFactor = clamp(0.04 + 0.06 * inBevel + 0.08 * bevelLine, 0.03, 0.18);`,
    });
  }
  /* Concentric-braided mineral silver-celadon, pewter-sage & slate-flax wool-and-silk round rug (straw) under the Master Bedroom
     corner lounge ensemble (18 Oct, Sam: "for the carpet, just change the color tone different from the main carpet underneath the master bed"): */
  function strawWeave(orig) {
    return code(phys({ envMapIntensity: 0.38, roughness: 0.84, sheen: 0.85, sheenRoughness: 0.46, sheenColor: new THREE.Color(0.46, 0.52, 0.50) }), 'strawWeave', {
      surface: `
        vec3 p = vDrawW;
        float rPx = mix(lkPxM, lkPx, 0.30);
        vec2 dq = vec2(p.x + 30.0 - 42.86, p.z + 24.0 - 38.86);
        float r = length(dq), ang = atan(dq.y, dq.x);
        float kBraid = lkKeep(0.014, rPx);
        float kKnot  = lkKeep(0.0085, rPx);
        float kFine  = lkKeep(0.0035, rPx);
        // Concentric 1.4 cm hand-braided wool cords with radial bouclé weft knots
        float bCoord = r / 0.0145, bIdx = floor(bCoord), bFrac = fract(bCoord);
        float braid = mix(0.58, sin(bFrac * 3.14159), kBraid);
        float bGroove = mix(0.18, pow(1.0 - sin(bFrac * 3.14159), 2.4), kBraid);
        float nSpokes = floor(max(12.0, r * 115.0));
        float twist = mix(0.55, 0.5 + 0.5 * sin(ang * nSpokes + bIdx * 1.7), kKnot * kBraid);
        float tuft = (lkn(vec3(dq * 220.0, 2.0)) - 0.5) * kFine;
        float ringTone = mix(0.5, lkH2(vec2(bIdx, 7.0)), kBraid);
        float silkCloud = smoothstep(0.30, 0.75, lkn(vec3(dq * 1.8, 4.0)));
        // Architectural concentric border frame: carved channels & silver-flax pinstripes at r = 1.32 m and r = 1.48 m,
        // framing a deep slate-pewter outer band (1.32..1.54 m) and a whipped dark charcoal-slate selvedge rim (1.54..1.60 m)
        float aa = max(0.0035, rPx * 1.15);
        float carve1 = 1.0 - smoothstep(0.004, 0.004 + aa, abs(r - 1.315));
        float carve2 = 1.0 - smoothstep(0.004, 0.004 + aa, abs(r - 1.485));
        float carve3 = 1.0 - smoothstep(0.004, 0.004 + aa, abs(r - 0.72));
        float carve = clamp(carve1 + carve2 * 0.9 + carve3 * 0.55, 0.0, 1.0);
        float pin1 = smoothstep(1.320 - aa, 1.324, r) * (1.0 - smoothstep(1.338, 1.342 + aa, r));
        float pin2 = smoothstep(1.464 - aa, 1.468, r) * (1.0 - smoothstep(1.480, 1.484 + aa, r));
        float pin = clamp(pin1 + pin2, 0.0, 1.0);
        float inBorderBand = smoothstep(1.338 - aa, 1.344 + aa, r) * (1.0 - smoothstep(1.532 - aa, 1.538 + aa, r));
        float outerRim = smoothstep(1.534 - aa, 1.542 + aa, r);
        float h = (0.0018 * braid * (0.76 + 0.24 * twist) - 0.0012 * bGroove - 0.0022 * carve + 0.0006 * tuft) * lkFlat(lkWN);
        ${SLOPE('h')}
        // Cool mineral slate-celadon, pewter-eucalyptus & Nordic sage-silk palette (distinct from the warm sand bed rug)
        vec3 c1 = ${v3([0.165, 0.245, 0.255])};
        vec3 c2 = ${v3([0.265, 0.355, 0.365])};
        vec3 cSilk = ${v3([0.355, 0.455, 0.465])};
        vec3 col = mix(c1, c2, clamp(0.25 + 0.45 * ringTone + 0.30 * twist, 0.0, 1.0));
        col = mix(col, cSilk, silkCloud * 0.42);
        // Deep slate-pewter framed border band & luminous silver-sage pinstripes
        col = mix(col, ${v3([0.105, 0.160, 0.172])} * (0.90 + 0.20 * ringTone), inBorderBand * 0.88);
        col = mix(col, ${v3([0.455, 0.540, 0.545])}, pin * 0.86);
        col = mix(col, ${v3([0.072, 0.108, 0.116])} * (0.88 + 0.22 * twist), outerRim * 0.92);
        col *= (0.76 + 0.36 * braid * (0.82 + 0.18 * twist)) * (1.0 - 0.24 * bGroove) * (1.0 - 0.32 * carve) * (1.0 + 0.16 * tuft);
        diffuseColor.rgb = col;
        roughnessFactor = clamp(0.84 - 0.10 * silkCloud - 0.06 * braid + 0.07 * bGroove, 0.64, 0.95);`,
    });
  }
  /* porcelain, for the Master Bathroom floor: large-format 90 x 60 cm semi-polished Calacatta & Crema Marfil breccia
     marble-porcelain slabs in running bond with 2.2 mm recessed grout joints, diamond-bevelled specular rectified arrises,
     sweeping breccia mineral ribbons, razor-sharp dark stylolite seams, golden-sienna veins, and high-gloss clearcoat sheen */
  function porcelainTiles(orig) {
    return code(phys({ envMapIntensity: 1.72, roughness: 0.10, clearcoat: 0.78, clearcoatRoughness: 0.055, specularIntensity: 1.0 }), 'porcelain', {
      head: SLAB,
      surface: `
        vec3 p = vDrawW;
        float mPx = mix(lkPxM, lkPx, 0.22);
        vec2 sz = vec2(0.90, 0.60);
        float row = floor((p.z + 24.0) / sz.y);
        float stag = mod(row, 3.0) * (sz.x / 3.0);
        vec2 q = vec2(p.x + 30.0 + stag, p.z + 24.0);
        vec2 id = floor(q / sz), lq = fract(q / sz) * sz;
        vec2 e2 = min(lq, sz - lq);
        float ej = min(e2.x, e2.y);

        // Per-tile quarry block sequence & mineral offset
        float r1 = lkH2(id + vec2(19.3, 47.1)), r2 = lkH2(id * 1.7 + vec2(83.2, 11.9)), r3 = lkH2(id + vec2(31.7, 73.4));
        vec2 sp = lq + vec2(lkH2(vec2(id.x, 5.0)) * 28.0 + r1 * 0.45, lkH2(vec2(id.y, 9.0)) * 18.0 + r2 * 0.35);

        // 1. Crisp fwidth-calibrated 2.2 mm rectified grout joint & 5.0 mm diamond-honed specular arris bevel
        vec2 pq = max(fwidth(q), vec2(1e-5));
        vec2 gw2 = max(vec2(0.0012), pq * 0.85), ew2 = max(vec2(0.0032), pq * 1.65);
        vec2 g2 = 1.0 - smoothstep(gw2 * 0.55, gw2 * 1.35, e2), a2 = 1.0 - smoothstep(vec2(0.0), ew2, e2);
        float gfar = 1.0 - smoothstep(0.042, 0.095, mPx);
        float grout = max(g2.x, g2.y) * gfar, arris = max(a2.x, a2.y) * gfar;
        float gw = mix(gw2.y, gw2.x, step(e2.x, e2.y)), ew = mix(ew2.y, ew2.x, step(e2.x, e2.y));
        float lip = ((r1 - 0.5) * 0.00030 + (r2 - 0.5) * 0.00040 * (lq.x / sz.x - 0.5)) * smoothstep(0.0, 0.012, ej);

        // 2. Multi-scale tectonic shear warp & sweeping Calacatta breccia mineral ribbons (vHalo)
        float w1 = lkFbm(vec3(sp * vec2(0.85, 0.48), 21.0), 1.0, 0.52, 3, mPx).x;
        float w2 = lkFbm(vec3(sp * vec2(2.6, 1.45), 24.0), 1.0, 0.55, 3, mPx).x;
        float w3 = lkFbm(vec3(sp * vec2(8.2, 4.8), 27.0), 1.0, 0.55, 2, mPx).x;
        vec2 rv = mat2(0.93, -0.36, 0.36, 0.93) * sp;
        vec2 cv = mat2(0.88, 0.47, -0.47, 0.88) * sp;
        vec2 xv = mat2(0.62, -0.78, 0.78, 0.62) * sp;
        float cloud = 0.55 * lkn(vec3(sp * vec2(1.4, 0.9) + w1 * 0.35, r1 * 9.0))
                    + 0.30 * lkn(vec3(sp * 3.4 + w2 * 0.25, r2 * 13.0))
                    + 0.15 * lkn(vec3(sp * 8.5, 2.7));
        float breccia = smoothstep(0.36, 0.74, lkn(vec3(rv * vec2(1.6, 0.75) + w1 * 0.45, 41.0 + r3 * 5.0)));

        // Wide breccia mineral ribbons (vHalo1, vHalo2) + razor-sharp dark taupe-espresso stylolite seams (v1, v2, v3)
        float ph1 = rv.x * 0.72 + rv.y * 0.12 + w1 * 0.42 + w2 * 0.16 + w3 * 0.04;
        float ph2 = rv.x * 1.45 - rv.y * 0.18 + w1 * 0.48 - w2 * 0.20 + w3 * 0.05 + 0.37;
        float m1 = smoothstep(-0.16, 0.28, lkFbm(vec3(sp * vec2(0.75, 0.35), 32.0), 1.0, 0.5, 2, mPx).x);
        float m2 = smoothstep(-0.10, 0.32, lkFbm(vec3(sp * vec2(1.35, 0.62), 34.0), 1.0, 0.5, 2, mPx).x);
        float vHalo1 = (1.0 - smoothstep(0.012, 0.115, abs(fract(ph1) - 0.5))) * m1;
        float vHalo2 = (1.0 - smoothstep(0.010, 0.085, abs(fract(ph2) - 0.5))) * m2;
        float vHalo  = clamp(vHalo1 + 0.65 * vHalo2, 0.0, 1.0);
        float v1 = slLine(ph1, 0.0110) * m1;
        float v2 = slLine(ph2, 0.0115) * m2;
        float v3 = slLine(cv.x * 2.55 + cv.y * 0.28 + w1 * 0.54 + w2 * 0.24 + 0.61, 0.0130)
                 * smoothstep(-0.04, 0.36, lkFbm(vec3(sp * vec2(2.4, 1.10), 36.0), 1.0, 0.5, 2, mPx).x);
        float veinDark = clamp(0.88 * v1 + 0.68 * v2 + 0.48 * v3, 0.0, 1.0);

        // 4. Luminous pearl-white crystalline calcite veins (c1, c2) & warm golden-sienna filaments (g1, g2)
        float c1 = slLine(rv.x * 0.84 + rv.y * 0.14 + w1 * 0.36 + w2 * 0.12 + w3 * 0.03 + 0.23, 0.0082)
                 * smoothstep(-0.08, 0.32, lkFbm(vec3(sp * vec2(0.85, 0.38), 52.0), 1.0, 0.5, 2, mPx).x);
        float c2 = slLine(cv.x * 1.38 - cv.y * 0.18 + w1 * 0.38 - w2 * 0.14 + 0.71, 0.0088)
                 * smoothstep(0.0, 0.36, lkFbm(vec3(sp * vec2(1.5, 0.72), 54.0), 1.0, 0.5, 2, mPx).x);
        float g1 = slLine(xv.x * 1.95 + xv.y * 0.22 + w1 * 0.32 + w2 * 0.18 + 0.44, 0.0105)
                 * smoothstep(-0.04, 0.36, lkFbm(vec3(sp * vec2(2.2, 1.2), 56.0), 1.0, 0.5, 2, mPx).x);
        float veinWhite = clamp(0.90 * c1 + 0.70 * c2, 0.0, 1.0);
        float tooth = (lkn(vec3(sp * 95.0, 3.0)) - 0.5) * lkKeep(0.004, mPx) + 0.6 * (lkn(vec3(sp * 220.0, 7.0)) - 0.5) * lkKeep(0.0018, mPx);

        // 5. 3D surface relief: bevelled rectified joints, mineral vein micro-relief & polished stone plane
        float h = (lip + 0.00024 * (cloud - 0.5) - 0.00024 * veinDark - 0.00012 * vHalo + 0.00012 * veinWhite + 0.00006 * tooth) * (1.0 - grout)
                - 0.0014 * grout * (0.0012 / gw) - 0.00055 * arris * (0.0032 / ew);
        ${SLOPE('h')}
        lkG *= lkFlat(lkWN);

        // 6. Sun-safe warm champagne-greige, taupe-breccia & pearl-calcite stone palette (rich contrast even in direct sun)
        vec3 cLight = ${v3([0.58, 0.535, 0.470])};
        vec3 cMid   = ${v3([0.44, 0.398, 0.342])};
        vec3 cDark  = ${v3([0.29, 0.250, 0.205])};
        vec3 tileCol = mix(cMid, cLight, smoothstep(0.16, 0.84, cloud));
        tileCol = mix(tileCol, cDark, breccia * 0.54);
        tileCol = mix(tileCol, ${v3([0.32, 0.275, 0.220])}, vHalo * 0.52);
        tileCol *= 0.90 + 0.20 * r1;
        tileCol += vec3(0.024, 0.015, 0.004) * (r2 - 0.5);
        tileCol = mix(tileCol, ${v3([0.85, 0.81, 0.74])}, veinWhite * 0.82);
        tileCol = mix(tileCol, ${v3([0.54, 0.37, 0.19])}, (g1 + 0.45 * vHalo2) * 0.62);
        tileCol = mix(tileCol, ${v3([0.16, 0.13, 0.10])}, veinDark * 0.80);
        tileCol = mix(tileCol, ${v3([0.74, 0.69, 0.62])}, arris * (1.0 - grout) * 0.42);
        tileCol *= 1.0 + 0.12 * tooth;

        vec3 groutCol = ${v3([0.18, 0.16, 0.135])} * (0.92 + 0.16 * lkn(vec3(q * 45.0, 1.0)));
        diffuseColor.rgb = mix(tileCol, groutCol, grout);
        roughnessFactor = clamp(mix(0.08 + 0.06 * (1.0 - cloud) + 0.05 * breccia - 0.03 * veinWhite + 0.04 * veinDark, 0.84, grout), 0.05, 0.88);`,
    });
  }

  /* bathRug, for the Master Bathroom tub mat (rugTaupe): plush hand-loomed chunky chenille & organic Turkish cotton
     loop-pile bath rug in warm ivory, oatmeal, and stone-taupe with a tailored mitered border, champagne pinstripe,
     and grazing-angle-safe anisotropic screen derivatives so the weave never blurs */
  function bathRug(orig) {
    return code(phys({
      envMapIntensity: 0.38,
      roughness: 0.86,
      sheen: 1.0,
      sheenRoughness: 0.38,
      sheenColor: new THREE.Color(0.76, 0.72, 0.65),
    }), 'bathRug', {
      surface: `
        vec3 p = vDrawW;
        float rPx = mix(lkPxM, lkPx, 0.22);
        float pxPlan = p.x + 30.0, pyPlan = p.z + 24.0;
        float pxX = min(rPx, max(fwidth(pxPlan) * 0.52, 1e-4));
        float pxY = min(rPx, max(fwidth(pyPlan) * 0.52, 1e-4));
        // Center of bath rug aligned with the tub at x = 52.30, y = 39.18, size = 1.46 x 0.68 m
        vec2 dC = abs(vec2(pxPlan - 52.30, pyPlan - 39.18));
        vec2 halfSz = vec2(0.73, 0.34);
        float dFromEdge = min(halfSz.x - dC.x, halfSz.y - dC.y);
        float aa = max(0.0025, min(pxX, pxY) * 1.15);
        float inBorder = 1.0 - smoothstep(0.068 - aa, 0.074 + aa, dFromEdge);
        float pinStripe = smoothstep(0.046 - aa, 0.050, dFromEdge) * (1.0 - smoothstep(0.058, 0.062 + aa, dFromEdge));
        float innerGroove = (1.0 - smoothstep(0.003, 0.003 + aa, abs(dFromEdge - 0.071)))
                          + 0.75 * (1.0 - smoothstep(0.003, 0.003 + aa, abs(dFromEdge - 0.135)));
        innerGroove = clamp(innerGroove, 0.0, 1.0);
        float outerBinding = 1.0 - smoothstep(0.016, 0.022, max(dFromEdge, 0.0));

        // 1. Bold 15.5 mm transverse chenille cords (along X) & 11.5 mm longitudinal bouclé rows (along Y)
        float kWarp = lkKeep(0.0115, pxY);
        float kWeft = lkKeep(0.0155, pxX);
        float kFine = lkKeep(0.0055, min(pxX, pxY));
        float wy = pyPlan / 0.0115, wyi = floor(wy), wyf = fract(wy);
        float warpRib = mix(0.62, sin(3.14159 * wyf), kWarp);
        float warpGroove = mix(0.18, pow(1.0 - sin(3.14159 * wyf), 2.4), kWarp);
        float wx = (pxPlan + lkH2(vec2(wyi, 3.0)) * 0.006) / 0.0155, wxi = floor(wx), wxf = fract(wx);
        float weftRib = mix(0.64, sin(3.14159 * wxf), kWeft);
        float weftGroove = mix(0.18, pow(1.0 - sin(3.14159 * wxf), 2.2), kWeft);

        // 2. High-relief chenille tuft domes & 2-ply twisted cotton yarn texture
        vec2 uvLoop = vec2(pxPlan / 0.0110, pyPlan / 0.0095);
        vec2 loopId = floor(uvLoop), loopF = fract(uvLoop) - 0.5;
        float loopRnd = lkH2(loopId);
        float tuftDome = mix(0.55, clamp(1.0 - dot(loopF * vec2(1.45, 1.55), loopF * vec2(1.45, 1.55)), 0.0, 1.0), kFine);
        float borderRib = mix(0.55, 0.5 + 0.5 * cos((dC.x > dC.y * 2.1 ? pxPlan : pyPlan) * (6.2831853 / 0.013)), max(kWarp, kWeft) * inBorder);
        float waleTone = mix(0.5, lkH2(vec2(wyi, floor(pxPlan / 0.055))), kWarp);

        float h = (0.0024 * warpRib * (0.72 + 0.28 * weftRib) + 0.0019 * weftRib - 0.0015 * warpGroove - 0.0011 * weftGroove
                 + 0.0013 * (tuftDome - 0.5) + 0.0010 * (borderRib - 0.5) * inBorder - 0.0022 * innerGroove) * lkFlat(lkWN);
        ${SLOPE('h')}

        vec3 cIvory  = ${v3([0.74, 0.70, 0.63])};
        vec3 cOat    = ${v3([0.48, 0.42, 0.35])};
        vec3 cTaupe  = ${v3([0.26, 0.21, 0.16])};
        float weaveMix = clamp(0.24 + 0.44 * warpRib * (0.75 + 0.25 * weftRib) + 0.26 * tuftDome + 0.16 * (waleTone - 0.5), 0.0, 1.0);
        vec3 col = mix(cOat, cIvory, weaveMix);
        col *= (0.74 + 0.38 * warpRib * (0.80 + 0.20 * weftRib)) * (1.0 - 0.26 * warpGroove - 0.20 * weftGroove);
        col = mix(col, mix(cTaupe, cIvory, 0.20 + 0.48 * borderRib), inBorder * 0.86);
        col = mix(col, cIvory * 1.06, pinStripe * 0.86);
        col = mix(col, cTaupe * 0.55, innerGroove * 0.88);
        col = mix(col, cTaupe * 0.68, outerBinding * 0.78);
        diffuseColor.rgb = col;
        roughnessFactor = clamp(0.86 - 0.09 * warpRib - 0.07 * tuftDome + 0.07 * innerGroove, 0.68, 0.96);`,
    });
  }

  /* tubCeramic, for the Master Bathroom's freestanding stone bathtub, sculpted vessel sinks, and sculpted wall-hung WC:
     satin-vitreous Cristalplant solid surface / architectural porcelain in warm alabaster-white with crisp clearcoat sheen */
  function tubCeramic(orig) {
    return code(phys({ envMapIntensity: 1.25, roughness: 0.15, clearcoat: 0.62, clearcoatRoughness: 0.10 }), 'tubCeramic', {
      surface: `
        vec3 p = vDrawW;
        float cPx = mix(lkPxM, lkPx, 0.28);
        float micro = (lkn(p * 135.0) - 0.5) * lkKeep(0.003, cPx);
        float cloud = (lkn(p * 4.5) - 0.5) * 0.030;
        float h = 0.00005 * micro;
        ${SLOPE('h')}
        lkG *= lkFlat(lkWN);
        vec3 col = ${v3([0.785, 0.770, 0.740])} * (1.0 + cloud + 0.05 * micro);
        diffuseColor.rgb = col;
        roughnessFactor = clamp(0.15 - 0.04 * abs(lkWN.y) + 0.04 * abs(micro), 0.10, 0.26);`,
    });
  }
  const WHITE_WALL = (m) => flatWall(m, [0.58, 0.558, 0.522], 'flatWallW');
  // (and a roof light's well, the roof slab's edge round the hole, lit like the ceiling it belongs to: with the sky's light
  // only, its sides went grey beside the white ceiling. Sam, 15 Oct: "make sure that the sides of the cut hole window have the
  // same color as our walls". Upright faces are stabilized by lkWall in NEUTRAL_END.)
  const WHITE_CEILING = (m) => plaster(m, true, [1.3, 1.29, 1.26], 'ceilingW');
  const BUILD_CODE = {
    // Every plain wall and every ceiling in the house in the entrance's colours since iteration 8 (Sam, 15 Oct: "all the walls
    // in the whole house uses the same color from the front wall in the entrance... the same color for the ceiling from the
    // entrance, and apply it everywhere when we see a ceiling"). The walls a flat matte paint (WHITE_WALL), the ceilings
    // a plain white (WHITE_CEILING), each under the one key its colour has.
    oak: oak, plaster: (m) => WHITE_WALL(m), roof: (m) => WHITE_CEILING(m), concretePlain: boardConcrete,
    // the living room's fireplace breast, iteration 8
    brick: (m) => brickWall(m, 'brickFire', [0.1, 0.096, 0.09]), rattan: rattan, strelLeaf: strelLeaf, strelStem: strelStem,
    figLeaf: figLeaf, figPot: figPot, figStalk: strelStem, figStem: twigBark, vanityMirror: vanityMirror, straw: strawWeave,
    agave: (m) => patioPlantLeaf(m, 'patioAgave', false), agave2: (m) => patioPlantLeaf(m, 'patioAgave2', true),
    flax: (m) => patioPlantLeaf(m, 'patioFlax', false), flax2: (m) => patioPlantLeaf(m, 'patioFlax2', true),
    teak: outdoorTeak,
    outdoorWhite: (m) => outdoorFabric(m, 'outdoorWhite', [0.895, 0.875, 0.830], false),
    outdoorSage: (m) => outdoorFabric(m, 'outdoorSage', [0.155, 0.218, 0.142], true),
    outdoorRope: outdoorRope,
    cabinet: (m) => veneer(m, 'veneerOak', [0.3, 0.2, 0.13]), kitchenCab: kitchenVeneer, steel: stainlessSteel, ovenGlass: ovenGlass,
    counterStone: counterQuartzite, quartz: counterQuartzite, porcelain: porcelainTiles, tubStone: tubCeramic,
    flutedBowl: flutedBowl, walnutSolid: liveEdgeWalnut, brass: spunBrass,
    wineFloor: cellarBasaltFloor, wineWood: cellarWalnut, bayGlow: backlitOnyx, wineCrate: owcCrate,
    bottle: (m) => wineBottleGlass(m, 'wineBottleB', [0.014, 0.034, 0.018]),
    bottleG: (m) => wineBottleGlass(m, 'wineBottleG', [0.032, 0.044, 0.012]),
    bottleA: (m) => wineBottleGlass(m, 'wineBottleA', [0.045, 0.022, 0.008]),
    lemon: (m) => fruitSkin(m, 'fruitLemon', [0.76, 0.56, 0.05], [0.95, 0.78, 0.12], 0.28, 0.58, 1),
    orange: (m) => fruitSkin(m, 'fruitOrange', [0.74, 0.24, 0.02], [0.92, 0.42, 0.05], 0.30, 0.62, 1),
    pear: (m) => fruitSkin(m, 'fruitPear', [0.32, 0.42, 0.09], [0.58, 0.56, 0.16], 0.36, 0.42, 2),
    apple: (m) => fruitSkin(m, 'fruitApple', [0.46, 0.06, 0.04], [0.78, 0.24, 0.08], 0.22, 0.74, 2),
    figFruit: (m) => fruitSkin(m, 'fruitFig', [0.08, 0.03, 0.09], [0.20, 0.07, 0.18], 0.46, 0.28, 3),
    chairWood: smokedOak, stoneware: glaze, urnLeaf: urnLeaf, twigDark: twigBark, inkObj: darkCeramic, logSplit: logSplit, moss: groundcover,
    // the master bedroom, 18 Oct
    mocha: (m) => linen(m, 'mocha', [0.34, 0.175, 0.095], 0.45, 0.28),
    mushroom: (m) => velvet(m, 'velvetStone', [0.38, 0.345, 0.30]),
    oliveVelvet: (m) => velvet(m, 'velvetOlive', [0.11, 0.135, 0.068]),
    loungeDark: (m) => boucle(m, [0.052, 0.036, 0.026], 'boucleDark'),
    oat: (m) => linen(m, 'oat', [0.64, 0.585, 0.495], 0.45, 0.25),
    cotton: (m) => linen(m, 'cotton', [0.95, 0.935, 0.90], 0.35, 0.14),
    duvet: (m) => linen(m, 'duvet', [0.84, 0.81, 0.75], 0.40, 0.28),
    poolWater: poolWater, water: poolWater,
    // the gallery's bronzes, plinths, and black marble floor
    sculptBronze: (m) => castBronze(m, 'sculptBronze', [0.78, 0.55, 0.28], [0.22, 0.17, 0.1], 0.9), sculptDark: (m) => castBronze(m, 'sculptDark', [0.32, 0.22, 0.14], [0.09, 0.085, 0.065], 0.5),
    plinthW: plinthStone, marbleNero: neroSlabs, walnutZ: (m) => walnut(m, 'walnutZ'),
    // the dressing room, 16 Oct & 18 Oct
    wardrobe: (m) => veneer(m, 'veneerWal', [0.185, 0.105, 0.060]), runner: (m) => runnerWeave(m, 'runner', [0.115, 0.102, 0.088], 33.05, 33.95),
    knitCamel: (m) => knit(m, 'knitCamel', [0.45, 0.32, 0.20]), knitIvory: (m) => knit(m, 'knitIvory', [0.80, 0.76, 0.69]),
    knitGrey: (m) => knit(m, 'knitGrey', [0.32, 0.31, 0.30]), knitNavy: (m) => knit(m, 'knitNavy', [0.055, 0.072, 0.115]),
    coatCamel: (m) => woolWeave(m, 'coatCamel', [0.46, 0.32, 0.19]), suitNavy: (m) => woolWeave(m, 'suitNavy', [0.048, 0.062, 0.098]),
    suitCharcoal: (m) => woolWeave(m, 'suitCharcoal', [0.125, 0.122, 0.118]), shirtBlue: (m) => linen(m, 'shirtBlue', [0.55, 0.64, 0.74], 0.45, 0.38),
    leatherBlk: (m) => leather(m, 'leatherBlk', [0.028, 0.024, 0.022]),
    suede: (m) => velvet(m, 'suede', [0.28, 0.175, 0.105]), felt: (m) => velvet(m, 'felt', [0.24, 0.16, 0.10]),
    shoeWhite: (m) => leather(m, 'shoeWhite', [0.84, 0.81, 0.76]), soleTan: (m) => leather(m, 'soleTan', [0.26, 0.135, 0.062]),
    nude: (m) => leather(m, 'nude', [0.52, 0.35, 0.24]),
    silkChamp: (m) => linen(m, 'silkChamp', [0.74, 0.62, 0.46], 0.85, 0.62), silkBlk: (m) => linen(m, 'silkBlk', [0.042, 0.038, 0.036], 0.85, 0.62),
    rugPile: (m) => rugPile(m, 'rugPile', [0.46, 0.415, 0.355], true), rugPileB: (m) => rugPile(m, 'rugPileB', [0.58, 0.535, 0.465], false),
    // the front of the house, iteration 8
    pathSlab: juraPath, pathStone: stoneTable, rock: (m) => rock(m, [0.3, 0.285, 0.255]),
    concreteFair: (m) => fairFaced(m, 'concreteFair', [0.2, 0.196, 0.188], true),
    basalt: basalt, numeral: numeral, sconceFrame: sconceFrame, frame: sconceFrame, bronze: sconceFrame, glowLine: glowLine,
    // the entrance's ceiling: a plain, neutral white (Sam, 15 Oct: "keep something more traditional, like a white roof")
    roofWhite: (m) => WHITE_CEILING(m),
    sofaWool: boucle, rugDark: rug, leather: leather, walnut: walnut, travBlock: travertine, barkIn: bark, leafCard: leaf, broadLeaf: broadLeaf,
    logBark: logBark, logEnd: logEnd,
    trav: travTiles, travP: (m) => travTiles(m, 'travTilesSq', TRAVTF(0.8, 0.8, 0, -9.0, -16.0), 1), concreteIn: concreteIn, oakDoor: oakDoor, oakConsole: oakConsole, oakLeaf: oakLeaf,
    concrete: (m) => boardWall(m, 'concrete', [0.235, 0.226, 0.21], true),
    conc: (m) => plainConcrete(m, 'conc', [0.092, 0.089, 0.081]), concFloor: (m) => plainConcrete(m, 'concFloor', [0.19, 0.178, 0.159]),
    limewash: (m) => WHITE_WALL(m), drystone: (m) => drystone(m, [0.195, 0.154, 0.105]),
    // (Sam, 15 Oct, after a warm taupe and then a deep charcoal: "not the color wall, but a tint of white, maybe just slightly
    // darker than the roof". The limewash's texture stays, he liked it)
    // (its trowel relief a third: on a pale wall the strokes' arcs showed as rings where the light grazes)
    // (and its clouds and strokes at half: the strokes turn patch by patch, and on a pale wall they drew rings)
    limewashEntry: (m) => WHITE_WALL(m), marbleDark: slabs, marbleKitchen: kitchenSlabs,
    larch: (m) => descan(m, 'larch', [0.003, 0.003, 0.004]),
    lawn: (m) => descan(m, 'lawn', [0.187, 0.228, 0.1], GRASS), land: (m) => descan(m, 'land', [0.092, 0.103, 0.053], GRASS),
    gravel: (m) => gravel(m, 'gravel', [0.411, 0.38, 0.313], 0.5), gravelCourt: (m) => courtGravel(m, 'gravelCourt2', [0.139, 0.143, 0.151]),
    // (a warm grey since the night of 15 Oct: darker, with the lichen pale on it, the patio's olive read as camouflage)
    bark: (m) => bark(m, 'barkOut', [0.92, 0.88, 0.82], null), barkFar: (m) => bark(m, 'barkFar', [1, 1, 1], null, 'ext'),
    walnutFine: (m) => walnut(m),
    boucle: (m) => boucle(m, [0.676, 0.622, 0.532], 'boucleW'),
    wool: (m) => woolWeave(m, 'wool', [0.603, 0.549, 0.46]), rugTaupe: bathRug, taupe: (m) => woolWeave(m, 'taupe', [0.357, 0.302, 0.244]),
    oakFin: (m) => finWood(m, 'finWood', [0.33, 0.19, 0.12]), oakBench: (m) => oakSolid(m, 'oakBench', 'x', [0.39, 0.214, 0.142]),
    linenW: (m) => linen(m, 'linenW', [0.915, 0.884, 0.828], 0.45), rust: (m) => linen(m, 'rust', [0.517, 0.207, 0.135], 0.5),
    sage: (m) => linen(m, 'sage', [0.398, 0.43, 0.342], 0.5), ochre: (m) => linen(m, 'ochre', [0.677, 0.47, 0.223], 0.5),
    charcoal: (m) => linen(m, 'charcoal', [0.239, 0.231, 0.223], 0.6), sheerLinen: curtainLinen,
  };

  /* ======================================================================================
     BAKED AT LOAD (iteration 8, 15 Oct, brief-phase-4.md: "the same rules drawn once into high resolution textures
     while the page loads, then sampled like any texture, with mipmaps and anisotropic filtering").

     A material's own surface code is run once over the room's real faces (each wall, floor and door leaf the material
     covers, laid in the same plane its pattern is laid in), into an atlas: its colour and roughness, and the slope of
     its relief. Then the page draws it two ways at once:
       close up, where a pixel is smaller than a texel, the rule itself, as before (sharpest)
       further away and at a slant, the atlas, through its mipmaps and 16x anisotropic filtering, as a scan was drawn.
     A rule can only fade a detail by the pixel's size; at a slant the pixel is long one way and short the other, so the
     floor lost all its detail after the second row of tiles. The filtered texture keeps it across and averages it along.
     ====================================================================================== */
  const BK_NF = 8;                                              // faces per material (planes x clusters)
  // which plane a face's pattern lies in, as lkPlane decides it: 0 the floor (x, z), 1 a wall along z (z, y), 2 along x (x, y)
  const BK_AXES = [[[1, 0, 0], [0, 0, 1], [0, 1, 0]], [[0, 0, 1], [0, 1, 0], [1, 0, 0]], [[1, 0, 0], [0, 1, 0], [0, 0, 1]]];
  const BK_SAMPLE = `
    vec3 bkP = uBkLocal > 0.5 ? vLkObj : vDrawW;
    vec3 bkN = uBkLocal > 0.5 ? normalize(vLkObjN) : lkWN;
    vec3 bkDx = uBkLocal > 0.5 ? dFdx(vLkObj) : dFdx(vDrawW), bkDy = uBkLocal > 0.5 ? dFdy(vLkObj) : dFdy(vDrawW);
    vec3 bkA3 = abs(bkN); float bkAx; vec3 bkTa, bkTb;
    if (bkA3.y >= bkA3.x && bkA3.y >= bkA3.z) { bkAx = 0.0; bkTa = vec3(1.0, 0.0, 0.0); bkTb = vec3(0.0, 0.0, 1.0); }
    else if (bkA3.x >= bkA3.z) { bkAx = 1.0; bkTa = vec3(0.0, 0.0, 1.0); bkTb = vec3(0.0, 1.0, 0.0); }
    else { bkAx = 2.0; bkTa = vec3(1.0, 0.0, 0.0); bkTb = vec3(0.0, 1.0, 0.0); }
    vec2 bkQ = vec2(dot(bkP, bkTa), dot(bkP, bkTb));
    vec4 bkR = vec4(0.0, 0.0, 1.0, 1.0), bkT = vec4(0.0, 0.0, 1.0, 1.0); float bkBest = 1e9, bkRot = 0.0;
    for (int i = 0; i < ${BK_NF}; i++) {
      float rot = step(5.0, uBkAx[i]);                                   // (axis + 10: the face lies turned in the atlas)
      if (abs(uBkAx[i] - 10.0 * rot - bkAx) > 0.5) continue;
      vec2 o = max(max(uBkR[i].xy - bkQ, bkQ - uBkR[i].xy - uBkR[i].zw), 0.0);
      float d = max(o.x, o.y);
      if (d < bkBest) { bkBest = d; bkR = uBkR[i]; bkT = uBkT[i]; bkRot = rot; }
    }
    // the pixel in the face's own metres, along its two axes (from the place, not from bkQ: no jump at a corner)
    vec2 bkQx = vec2(dot(bkDx, bkTa), dot(bkDx, bkTb)), bkQy = vec2(dot(bkDy, bkTa), dot(bkDy, bkTb));
    float bkPx = max(length(bkQx), length(bkQy));
    // the atlas takes over once a pixel is wider than a texel and a half (the rule's own fade agrees there)
    float bkW = uBkOnly > 0.5 ? 1.0 : smoothstep(1.0, 1.6, bkPx / uBkTx) * step(bkBest, 0.05);
    vec4 bkA = vec4(1.0); vec3 bkG = vec3(0.0);
    {
      vec2 qq = bkQ - bkR.xy, gx = bkQx, gy = bkQy, sz = bkR.zw;
      if (bkRot > 0.5) { qq = qq.yx; gx = gx.yx; gy = gy.yx; sz = sz.yx; }
      vec2 sc = bkT.zw / sz, st = bkT.xy + qq * sc;
      bkA = textureGrad(uBkA, st, gx * sc, gy * sc);
      vec2 s = textureGrad(uBkB, st, gx * sc, gy * sc).xy;                // (the slope along the face's own two axes, turned or not)
      bkA.rgb *= uBkScale;
      bkG = lkSurfGrad(lkWN, s.x * bkQx.x + s.y * bkQx.y, s.x * bkQy.x + s.y * bkQy.y);
    }`;
  // The material drawn from its atlas, and from its rule where a pixel is small. orig: the scan it replaces (for the
  // drawing's options), codeMat: the code material, as built
  function bakedFrom(orig, codeMat) {
    const s = codeMat.userData.lkSrc;
    const U = { uBkA: { value: null }, uBkB: { value: null }, uBkR: { value: Array.from({ length: BK_NF }, () => new THREE.Vector4(0, 0, 1, 1)) },
      uBkT: { value: Array.from({ length: BK_NF }, () => new THREE.Vector4(0, 0, 1, 1)) }, uBkAx: { value: new Array(BK_NF).fill(-9) },
      uBkLocal: { value: s.local ? 1 : 0 }, uBkTx: { value: 0.002 }, uBkScale: { value: 1 }, uBkOnly: { value: BK_ONLY ? 1 : 0 } };
    CUR = orig;
    try {
      const m = code(phys(Object.assign({}, s.phys)), s.key + '-baked', {
        head: s.head + `
          uniform sampler2D uBkA; uniform sampler2D uBkB; uniform vec4 uBkR[${BK_NF}]; uniform vec4 uBkT[${BK_NF}]; uniform float uBkAx[${BK_NF}];
          uniform float uBkLocal; uniform float uBkTx; uniform float uBkScale; uniform float uBkOnly;`,
        local: true, uniforms: Object.assign({}, s.uniforms, U), drawable: s.drawable,
        // (the rule only runs where the atlas does not cover the pixel whole. Where the two blend, the rule's own screen
        // derivatives can be wrong in a 2 by 2 block that is split by the branch, but its weight there is under a thousandth)
        surface: `
          ${BK_SAMPLE}
          vec4 bkD0 = diffuseColor; float bkR0 = roughnessFactor;
          if (bkW < 0.999) { ${s.surface} }
          if (bkW > 0.001) {
            diffuseColor.rgb = mix(diffuseColor.rgb, bkD0.rgb * bkA.rgb, bkW);
            roughnessFactor = mix(roughnessFactor, bkA.a, bkW);
            lkG = mix(lkG, bkG * lkFlat(lkWN), bkW);
          }`,
      });
      m.userData.bake = { key: s.key, src: s, U };
      return m;
    } finally { CUR = null; }
  }
  const BK_Q = new URLSearchParams(location.search);
  const BK_ONLY = BK_Q.has('bakeonly');                          // (tools: the atlas everywhere, no rule close up, to judge the atlas alone)
  // The bake itself. faces: [{ axis, off, r: [u0, v0, su, sv] }] in the material's own space (world metres, or the object's
  // for the pivot door). tx: metres a texel. Returns the bytes it took on the graphics card.
  function bake(renderer, mat, faces, tx, scale) {
    const B = mat.userData.bake, s = B.src, U = B.U;
    const PAD = 16, maxSide = Math.min(8192, renderer.capabilities.maxTextureSize);
    // the faces in the atlas: a skyline, each face at the lowest place it fits, tallest first, for a few widths
    // (shelves wasted most of the atlas when long thin strips, the tops of walls, stood beside a whole wall)
    const pack = (rects, W) => {
      let sky = [[0, 0, W]];                                         // [x, y, w]
      for (const r of rects.slice().sort((a, b) => Math.max(b.w0, b.h0) - Math.max(a.w0, a.h0))) {
        let best = null;
        for (const rot of [0, 1]) {
          const w = rot ? r.h0 : r.w0, h = rot ? r.w0 : r.h0;
          for (let i = 0; i < sky.length; i++) {
            const x = sky[i][0]; if (x + w > W) break;
            let y = 0, j = i, cov = 0;
            while (cov < w) { y = Math.max(y, sky[j][1]); cov = sky[j][0] + sky[j][2] - x; j++; }
            if (!best || y + h < best.y + best.h) best = { x, y, w, h, rot };
          }
        }
        if (!best) return null;
        Object.assign(r, best);
        const top = best.y + r.h, x0 = best.x, x1 = best.x + r.w, next = [];
        for (const s of sky) {
          const a = s[0], b = s[0] + s[2];
          if (b <= x0 || a >= x1) { next.push(s); continue; }
          if (a < x0) next.push([a, s[1], x0 - a]);
          if (b > x1) next.push([x1, s[1], b - x1]);
        }
        next.push([x0, top, r.w]); next.sort((p, q) => p[0] - q[0]);
        sky = next.reduce((m, s) => { const l = m[m.length - 1]; if (l && l[1] === s[1] && l[0] + l[2] === s[0]) l[2] += s[2]; else m.push(s.slice()); return m; }, []);
      }
      return Math.max(...rects.map((r) => r.y + r.h));
    };
    let rects, W0, H0;
    for (let tries = 0; tries < 12; tries++) {
      rects = faces.map((fc, i) => ({ fc, i, w0: Math.ceil(fc.r[2] / tx) + 2 * PAD, h0: Math.ceil(fc.r[3] / tx) + 2 * PAD }));
      const area = rects.reduce((a, r) => a + r.w0 * r.h0, 0), wmin = Math.max(...rects.map((r) => Math.min(r.w0, r.h0)));
      let bestW = 0, bestA = Infinity;
      for (let k = 0.8; k <= 2.0; k += 0.1) {
        const Wk = Math.min(maxSide, Math.max(wmin, Math.ceil(Math.sqrt(area) * k)));
        const Hk = pack(rects, Wk);
        if (Hk && Hk <= maxSide && Wk * Hk < bestA) { bestA = Wk * Hk; bestW = Wk; }
      }
      if (bestW) { W0 = bestW; H0 = pack(rects, W0); break; }
      tx *= 1.25;
    }
    const aniso = renderer.capabilities.getMaxAnisotropy();
    const rt = new THREE.WebGLMultipleRenderTargets(W0, H0, 2, { depthBuffer: false, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true });
    rt.texture.forEach((t) => { t.anisotropy = aniso; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; });
    rt.texture[0].colorSpace = THREE.SRGBColorSpace;                  // colour and roughness: 8 bits, the colour stored as sRGB
    rt.texture[1].format = THREE.RGFormat; rt.texture[1].type = THREE.HalfFloatType;   // the slope, two half floats
    const BU = Object.assign({}, s.uniforms, { uO: { value: new THREE.Vector3() }, uTa: { value: new THREE.Vector3() }, uTb: { value: new THREE.Vector3() },
      uN: { value: new THREE.Vector3() }, uSz: { value: new THREE.Vector2() }, uRot: { value: 0 }, uTx: { value: tx }, uRough: { value: s.rough }, uScale: { value: scale } });
    const fs = `precision highp float; precision highp int;
      in vec2 vUv;
      layout(location = 0) out vec4 oA;
      layout(location = 1) out vec4 oB;
      uniform vec3 uO; uniform vec3 uTa; uniform vec3 uTb; uniform vec3 uN; uniform vec2 uSz; uniform float uTx; uniform float uRough; uniform float uScale; uniform float uRot;
      vec3 vDrawW; vec3 vNormal; vec3 vLkObj; vec3 vLkObjN; vec2 vLkUv; float vLkInst;
      float lineAA(float c, float period, float width) {
        float f = abs(fract(c / period + 0.5) - 0.5) * period;
        float px = max(fwidth(c), 1e-4), w = px * width;
        return (1.0 - smoothstep(w * 0.5, w * 1.5, f)) * (1.0 - smoothstep(period * 0.16, period * 0.4, px));
      }
      ${LIB}
      ${s.head}
      void main() {
        vec2 fu = uRot > 0.5 ? vUv.yx : vUv;
        vec3 P = uO + uTa * (fu.x * uSz.x) + uTb * (fu.y * uSz.y);
        vDrawW = P; vLkObj = P; vLkObjN = uN; vNormal = uN; vLkUv = vec2(0.0); vLkInst = 0.0;
        vec4 diffuseColor = vec4(1.0); float roughnessFactor = uRough;
        { vec3 lkP = vDrawW - LK_O; float lkPx = uTx; float lkPxM = uTx * 1.3; vec3 lkWN = uN;
          ${s.surface} }
        oA = vec4(clamp(diffuseColor.rgb / uScale, 0.0, 1.0), clamp(roughnessFactor, 0.0, 1.0));
        oB = vec4(dot(lkG, uTa), dot(lkG, uTb), 0.0, 1.0);
      }`;
    const bm = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: BU, depthTest: false, depthWrite: false,
      vertexShader: 'in vec3 position; out vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: fs });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bm); quad.frustumCulled = false;
    const sc = new THREE.Scene(); sc.add(quad);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const was = renderer.getRenderTarget(), auto = renderer.autoClear;
    renderer.autoClear = false;
    rects.forEach((r) => {
      const [ta, tb, n] = BK_AXES[r.fc.axis].map((a) => new THREE.Vector3(...a));
      const u0 = r.fc.r[0] - PAD * tx, v0 = r.fc.r[1] - PAD * tx, su = r.w0 * tx, sv = r.h0 * tx;
      BU.uO.value.copy(ta).multiplyScalar(u0).addScaledVector(tb, v0).addScaledVector(n, r.fc.off);
      BU.uTa.value.copy(ta); BU.uTb.value.copy(tb); BU.uN.value.copy(n); BU.uSz.value.set(su, sv); BU.uRot.value = r.rot;
      rt.viewport.set(r.x, r.y, r.w, r.h); rt.scissor.set(r.x, r.y, r.w, r.h); rt.scissorTest = true;
      renderer.setRenderTarget(rt); renderer.render(sc, cam);
      U.uBkR.value[r.i].set(u0, v0, su, sv); U.uBkT.value[r.i].set(r.x / W0, r.y / H0, r.w / W0, r.h / H0); U.uBkAx.value[r.i] = r.fc.axis + 10 * r.rot;
    });
    renderer.setRenderTarget(was); renderer.autoClear = auto;
    bm.dispose(); quad.geometry.dispose();
    U.uBkA.value = rt.texture[0]; U.uBkB.value = rt.texture[1]; U.uBkTx.value = tx; U.uBkScale.value = scale;
    B.rt = rt; B.tx = tx; B.size = [W0, H0];
    return W0 * H0 * 8 * 4 / 3;
  }

  return {
    init(a) { A = a; THREE = a.THREE; },
    LIB, PREP, TILT, overlay, W, f, v3,
    has: (k) => !!BUILD_CODE[k],
    build: (k, orig) => { CUR = orig; try { return BUILD_CODE[k](orig); } finally { CUR = null; } },
    bakedFrom, bake, BK_AXES,
    get leafDepth() { return leafDepth; },
  };
})();
