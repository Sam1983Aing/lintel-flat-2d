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
      // the joint: a bevel 2 mm wide each side, widened to the pixel when the pixel is bigger (and shallower, so its slope stays the same)
      float bw = max(0.0022, px * 1.3);
      float bev = 1.0 - smoothstep(0.0, bw, ej);
      float joint = (1.0 - smoothstep(0.0, max(0.0007, px * 0.9), ej)) * min(1.0, 0.0016 / max(px, 0.0016));
      // The grain: many fine streaks along the board, of every strength. This is what oak is from a few metres away.
      // The streaks wander a little, as the fibres do.
      float yy = y + 0.003 * sin(lx * 1.1 + r1 * 6.0) + 0.006 * (lkn(vec3(lx * 0.35, r2 * 9.0, 1.0)) - 0.5);
      float k1 = lkKeep(0.012, px), k2 = lkKeep(0.0045, px), k3 = lkKeep(0.0018, px);
      float st = (lkn(vec3(lx * 0.45, yy * 70.0, r1 * 30.0)) - 0.5) * k1 + 0.8 * (lkn(vec3(lx * 1.1, yy * 210.0, r2 * 30.0)) - 0.5) * k2
               + 0.6 * (lkn(vec3(lx * 2.6, yy * 560.0, r3 * 30.0)) - 0.5) * k3;
      // Its rings. Where the board was cut from its log (the pith far to one side: quarter sawn, straight lines and
      // the ray flecks oak is known for; under its middle: flat sawn, arches) sets where they meet the face. A ring
      // shows as a thin line of open pores at its start, some rings more than others.
      float quarter = step(0.6, r1);
      float vc = mix((r2 - 0.5) * 0.1, (r2 < 0.5 ? -1.0 : 1.0) * (0.22 + 0.2 * r3), quarter);
      float dc = mix(0.035 + 0.15 * r3, 0.015 * r4, quarter), sl = (r4 - 0.5) * mix(0.07, 0.01, quarter);
      float rr = length(vec2(yy - vc, dc + sl * lx));
      rr += 0.012 * (lkn(vec3(lx * 0.5, yy * 2.5, r1 * 50.0)) - 0.5) + 0.003 * (lkn(vec3(lx * 2.5, yy * 12.0, r2 * 50.0)) - 0.5);
      float sp = 0.0028 + 0.0028 * r3;
      float ring = rr / sp, rf = fract(ring);
      float vis = 1.0 - smoothstep(0.2, 0.5, fwidth(ring));
      float strength = 0.35 + 0.65 * lkH2(vec2(floor(ring), r1 * 91.0));
      float pores = mix(0.09, (1.0 - smoothstep(0.0, 0.16, rf)) * strength, vis) * (1.0 - 0.6 * quarter);
      // ray flecks: short silvery ribbons on a quarter sawn face
      float fleck = quarter * mix(0.06, smoothstep(0.66, 0.86, lkn(vec3(lx * 30.0, yy * 220.0, r2 * 40.0))), lkKeep(0.004, px));
      // a small knot now and then
      float kd = length(vec2(lx - (0.2 + 0.6 * r2) * L, y - (r4 - 0.5) * Wd * 0.6));
      float kn = step(0.9, r3) * (1.0 - smoothstep(0.003, 0.006, kd)) + step(0.9, r3) * 0.35 * (1.0 - smoothstep(0.006, 0.016, kd));
      // each board its own shade: some honey, some paler, some a little grey
      float tone = 0.9 + 0.2 * r1;
      a = vec4(tone, pores, fleck, joint * bevK); b = vec4(r2, kn, quarter, st);
      // (cup and tilt ease back to nothing at the joint: two boards met in a step of up to a millimetre, and its slope lit
      // up as a dotted line along every joint at a grazing angle)
      float ease = smoothstep(0.0, max(0.006, px * 2.5), ej);
      return (0.00035 * pow(2.0 * y / Wd, 2.0)                              // cupped
        + (r2 - 0.5) * 0.0024 * (y / Wd) + (r3 - 0.5) * 0.0016 * (lx / L)) * ease   // tilted
        + 0.00009 * st - 0.0001 * pores - 0.0012 * bev * (0.0022 / bw) * bevK - 0.0003 * kn;
    }
    float oakBoard(vec2 q, float px, float Wd, out vec4 a, out vec4 b) { return oakBoardL(q, px, Wd, 0.0, 1.0, a, b); }
`;
  function oak(orig) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.45 }), 'oak', {
      head: OAK,
      surface: `
        // boards on the floor run along x; on the pit's sides one board makes the whole step
        vec2 q; vec3 ta, tb; lkPlane(lkP, lkWN, q, ta, tb);
        float Wd = abs(lkWN.y) > 0.7 ? 0.22 : 0.46;
        float h0 = oakBoard(q, lkPx, Wd, oakA, oakB);
        ${SLOPE('h0')}
        lkG *= lkFlat(lkWN);
        // worn paths: round the pit from the hall to the kitchen, along its south edge to the fire, and across the north
        vec2 pw = vDrawW.xz;
        float d = min(min(lkSeg(pw, vec2(-14.0, -7.2), vec2(-10.8, -8.6)), lkSeg(pw, vec2(-10.8, -8.6), vec2(-10.8, -14.2))),
                      min(lkSeg(pw, vec2(-10.8, -14.2), vec2(-14.0, -15.8)), min(lkSeg(pw, vec2(-12.0, -8.4), vec2(-19.5, -8.4)), lkSeg(pw, vec2(-12.5, -15.0), vec2(-19.0, -15.0)))));
        float wear = (1.0 - smoothstep(0.15, 0.75, d)) * (0.55 + 0.45 * lkn(vec3(pw * 3.0, 4.0))) * step(0.7, lkWN.y);
        vec3 col = ${v3([0.283, 0.212, 0.155])} * oakA.x * mix(vec3(1.0), vec3(0.95, 0.97, 1.02), smoothstep(0.6, 1.0, oakB.x)) * 0.94;
        col *= 1.0 + 0.32 * oakB.w;
        col *= 1.0 - 0.28 * oakA.y;
        col = mix(col, col * vec3(1.22, 1.16, 1.06), oakA.z * 0.8);
        col = mix(col, col * vec3(0.42, 0.34, 0.28), clamp(oakB.y, 0.0, 1.0));
        col = mix(col, col * vec3(1.08, 1.07, 1.05) + 0.01, wear * 0.45);
        col *= 1.0 - 0.55 * oakA.w;
        diffuseColor.rgb *= col / 1.0;
        roughnessFactor = clamp(0.4 + 0.08 * oakB.x + 0.16 * oakA.y - 0.08 * oakA.z - 0.1 * oakB.w + 0.18 * wear + 0.3 * oakA.w, 0.2, 1.0);`,
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
        float lip;
        float h = trowel(q, ${ceiling ? '0.0001' : '0.00016'}, lip);
        // The stucco's stipple: small pits and crumbs of one to four millimetres. (Without it the code walls read smooth
        // and unfinished next to the scan, the reviewer's note of 15 Oct: fine detail 0.6 against the scan's 3.4.)
        // (iteration 8: softer edged, each its own depth, and where too small to draw, their average, not nothing. Hard edged
        // and all one shade they read as "a printed decal", gone a couple of metres away)
        float dA, dB, dC;
        float pit = plPit(q, 0.005, 3.0, lkPx, dA) + plPit(q + 0.0031, 0.0038, 11.0, lkPx, dB) + 0.8 * plPit(q, 0.011, 19.0, lkPx, dC);
        float crumb = mix(0.03, smoothstep(0.74, 0.84, lkn(vec3(q * 520.0, 5.0))), lkKeep(0.002, lkPx));
        h += (${ceiling ? '0.8' : '1.0'}) * (-0.0005 * (dA + dB + dC) + 0.00012 * crumb);
        float mh = lkFbm(vec3(q, 9.0), 60.0, 0.55, 3, lkPx).x;
        h += 0.00012 * mh;
        lkG = lkSurfGrad(lkWN, dFdx(h), dFdy(h));
        vec4 sand = lkFbm(vec3(q * 1.0, 0.5), 700.0, 0.55, 3, lkPx);          // sand, a millimetre and under
        lkG += (ta * sand.y + tb * sand.z) * 0.00009;
        float cloud = lkFbm(vec3(q, 2.0), 1.3, 0.5, 3, lkPx).x;
        lkG *= lkFlat(lkWN);
        // a mottle between the sand and the clouds, 5 mm to 5 cm: what stucco still shows from across a room (the reviewer
        // measured the hall's wall flat at two metres, iteration 8)
        float mott = lkFbm(vec3(q, 7.0), 40.0, 0.6, 4, lkPx).x;
        diffuseColor.rgb *= ${v3(col)} * (1.0 + ${ceiling ? '0.1' : '0.07'} * cloud - ${ceiling ? '0.002' : '0.004'} * lip + 0.025 * sand.x + 0.1 * mott) * (1.0 - ${ceiling ? '0.1' : '0.18'} * clamp(pit, 0.0, 1.0));
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
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.82 }), 'board', {
      head: BOARD,
      surface: `
        vec2 q; vec3 ta, tb; lkPlane(lkP, lkWN, q, ta, tb);
        vec3 col = ${v3([0.234, 0.226, 0.211])};
        float cloud = lkFbm(vec3(q * 1.0, 6.0), 1.6, 0.5, 4, lkPx).x;
        if (abs(lkWN.y) > 0.7) {
          // the hearth's top: trowelled, with the sand and a little aggregate showing
          vec4 tr = lkFbm(vec3(q, 3.0), 9.0, 0.5, 4, lkPx), gr = lkFbm(vec3(q, 9.0), 500.0, 0.6, 2, lkPx);
          vec4 mid = lkFbm(vec3(q, 11.0), 30.0, 0.78, 6, lkPx);
          float grit = (lkn(vec3(q * 700.0, 5.0)) - 0.5) * lkKeep(0.0015, lkPx) + 0.6 * (lkn(vec3(q * 300.0, 6.0)) - 0.5) * lkKeep(0.0035, lkPx);
          float voids = smoothstep(0.31, 0.36, lkFbm(vec3(q, 17.0), 90.0, 0.6, 3, lkPx).x) * lkKeep(0.003, lkPx);
          float swirl = smoothstep(0.55, 0.8, lkn(vec3(q * vec2(4.0, 1.2), 7.0)));      // the trowel's arcs, burnished darker
          lkG = ((ta * tr.y + tb * tr.z) * 0.0004 + (ta * gr.y + tb * gr.z) * 0.00008 + (ta * mid.y + tb * mid.z) * 0.0004) * lkFlat(lkWN);
          float agg = smoothstep(0.78, 0.9, lkn(vec3(q * 160.0, 2.0))) * lkKeep(0.005, lkPx);
          diffuseColor.rgb *= col * (1.0 + 0.24 * cloud + 0.05 * gr.x) * (1.0 + 0.32 * mid.x) * (1.0 + 0.3 * grit) * (1.0 + 0.25 * agg) * (1.0 - 0.5 * voids) * (1.0 - 0.12 * swirl);
          roughnessFactor = 0.66 + 0.12 * tr.x - 0.1 * agg - 0.14 * swirl + 0.1 * mid.x;
        } else {
          float h0 = bdH(q, lkPx, bdA);
          ${SLOPE('h0')}
          lkG *= lkFlat(lkWN);
          // A scan of this wall is rich at every size, and a rule has to be too: a mottle from a few centimetres down to the
          // sand, pale patches of laitance (the cement skin) with ragged edges where it flaked, the board's streaks broken
          // into lengths, pale bloom and darker damp clouds, and small voids.
          vec4 mid = lkFbm(vec3(q * vec2(1.0, 1.4), 11.0), 30.0, 0.78, 6, lkPx);
          float grit = (lkn(vec3(q * 700.0, 5.0)) - 0.5) * lkKeep(0.0015, lkPx) + 0.6 * (lkn(vec3(q * 300.0, 6.0)) - 0.5) * lkKeep(0.0035, lkPx);
          float lait = smoothstep(0.05, 0.14, lkFbm(vec3(q * vec2(1.0, 5.0), 13.0), 6.0, 0.65, 6, lkPx).x);
          float broken = smoothstep(0.3, 0.7, lkn(vec3(q.x * 3.0, q.y * 9.0, 2.0)));
          float bloom = smoothstep(0.6, 0.9, lkn(vec3(q.x * 1.6, q.y * 0.5, 4.0)));
          float damp = smoothstep(0.62, 0.85, lkn(vec3(q.x * 0.9, q.y * 2.2, 8.0)));
          float voids = smoothstep(0.31, 0.36, lkFbm(vec3(q, 17.0), 90.0, 0.6, 3, lkPx).x) * lkKeep(0.003, lkPx);
          // short torn streaks where the saw's fibres pulled the skin off, pale and dark, and the odd fleck of the board's wood left in it
          float tear = (smoothstep(0.74, 0.8, lkn(vec3(q.x * 2.2, q.y * 330.0, 21.0))) - smoothstep(0.76, 0.82, lkn(vec3(q.x * 2.6, q.y * 300.0, 27.0)))) * lkKeep(0.0025, lkPx);
          float fibre = smoothstep(0.86, 0.9, lkn(vec3(q.x * 9.0, q.y * 140.0, 31.0))) * lkKeep(0.003, lkPx);
          lkG += (ta * mid.y + tb * mid.z) * 0.0005;
          col *= bdA.x * (1.0 + 0.22 * cloud) * (1.0 + 0.35 * mid.x) * (1.0 + 0.32 * bdA.w * broken) * (1.0 + 0.3 * grit);
          col = mix(col, col * vec3(1.4, 1.38, 1.35) + 0.015, lait * 0.45);
          col *= 1.0 + 0.22 * clamp(bdA.y, -1.0, 1.0);
          col = mix(col, col * 1.2 + 0.015, bloom * 0.3);
          col *= 1.0 - 0.16 * damp - 0.6 * bdA.z - 0.5 * voids;
          col *= 1.0 + 0.3 * tear;
          col = mix(col, ${v3([0.2, 0.12, 0.07])}, fibre * 0.5);
          diffuseColor.rgb *= col / 1.08;
          roughnessFactor = clamp(0.82 - 0.1 * bdA.y - 0.12 * bdA.w - 0.1 * lait + 0.12 * bdA.z + 0.1 * mid.x + 0.05 * damp, 0.4, 1.0);
        }`,
    });
  }

  /* ---------- the cloths. All laid in the plane the surface faces, in metres ---------------------
     A cushion's thickness rides in its UV (see pillowUv): x is how far from its middle seam, y says "a cushion". So
     the seam and its piping can be drawn where they are, on the welt, whatever the cushion's turn. */
  const SEAM = `
    // the seam round a cushion's middle: a piping cord (sofa cushions) or a pinched seam (scatter cushions)
    float seamH(float cord) {
      if (vLkUv.y < 500.0) return 0.0;
      float z = vLkUv.x, zw = max(fwidth(z), 1e-5);
      float rc = max(cord, zw * 1.2);
      float pipe = cord > 0.0 ? sqrt(max(0.0, rc * rc - z * z)) * (cord / rc) : 0.0;
      float gw = max(0.0012, zw * 0.8), groove = exp(-pow((abs(z) - rc - gw * 0.5) / gw, 2.0)) * (0.0012 / gw);
      return pipe - 0.0007 * groove;
    }`;
  const CLOTH_SEAM = (cord) => `
        { float hs = seamH(${f(cord)}); lkG += lkSurfGrad(lkWN, dFdx(hs), dFdy(hs));
          if (vLkUv.y > 500.0) { float zz = abs(vLkUv.x); diffuseColor.rgb *= 1.0 - 0.22 * exp(-pow((zz - ${f(cord)} * 1.1) / max(0.0015, fwidth(vLkUv.x)), 2.0)); } }`;

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
      if (k1 > 0.0) h += k1 * loops(q, 0.0035, 0.38, 0.17, 0.0007, t1); else t1 = 0.5;
      if (k2 > 0.0) h += k2 * loops(q + 0.37, 0.009, 0.22, 0.3, 0.0013, t2); else t2 = 0.5;
      a = vec4(t1, t2, k1, k2);
      return h;
    }
`;
  function boucle(orig, base, key) {
    base = base || [0.596, 0.536, 0.447];
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.93, sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color().setRGB(base[0] * 0.7, base[1] * 0.7, base[2] * 0.74) }), key || 'boucle', {
      head: BOUCLE + SEAM,
      surface: `
        vec2 q; vec3 ta, tb; lkPlane(lkP, lkWN, q, ta, tb);
        vec4 au; float hh = bcH(q, lkPxM, au);
        ${SLOPE('hh')}
        // in the hollows the yarn is in its own shadow; on top of a loop it catches the light. A loop is cream or oat
        float lift = clamp(hh / 0.0016, 0.0, 1.0);
        float shade = mix(0.93, mix(0.84, 1.05, lift), max(au.z, au.w));
        float two = mix(0.5, mix(au.x, au.y, 0.4), max(au.z, au.w));
        vec3 col = ${v3(base)} * shade * mix(vec3(0.96, 0.95, 0.94), vec3(1.04, 1.05, 1.06), two);
        col *= 1.0 + 0.05 * lkFbm(vec3(q, 1.0), 6.0, 0.5, 3, lkPx).x;       // the dye lot drifts a little
        diffuseColor.rgb *= col / 0.93;
        roughnessFactor = 0.95 - 0.08 * lift;
        ${CLOTH_SEAM(0.0035)}`,
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
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.82, sheen: 1, sheenRoughness: 0.45,
      sheenColor: new THREE.Color().setRGB(col[0] * sheen + 0.03, col[1] * sheen + 0.03, col[2] * sheen + 0.03),
      emissive: orig.emissive ? orig.emissive.clone() : new THREE.Color(0) }), 'linen-' + key, {
      head: LINEN + SEAM,
      surface: `
        vec2 q; vec3 ta, tb; lkPlane(lkP, lkWN, q, ta, tb);
        float seed = ${f((key.length * 7.3) % 11)};
        float h0 = lnH(q, lkPxM, seed, lnA) - ${ck} * 0.0005 * pow(lnA.z, 3.0);
        ${SLOPE('h0')}
        float streak = (lnA.x - 0.5 * lkKeep(0.003, lkPx) * 2.0) * 0.07 + (lnA.y - 0.5 * lkKeep(0.009, lkPx) * 2.0) * 0.06;
        vec3 col = ${v3(col)} * (1.0 + streak) * (1.0 - 0.08 * (1.0 - ${ck}) * (1.0 - lnA.z)) * (1.0 + 0.04 * lnA.w);
        col *= 1.0 + 0.05 * lkFbm(vec3(q, 7.0), 4.0, 0.5, 3, lkPx).x;
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.84 - 0.1 * lnA.x * lkKeep(0.003, lkPx) - 0.06 * pow(lnA.z, 3.0), 0.5, 1.0);
        ${CLOTH_SEAM(0.0)}`,
    });
  }

  /* the rug: a hand-loomed wool, rows of loops 9 mm apart along its length, three yarns twisted together, a
     binding round its edge, and the faint bands of dye lots (abrash) across it */
  const RUGR = [13.2, 11.7, 17.6, 13.95];
  const RUG = `
    vec4 rgA;
    float rgH(vec2 q, float px, out vec4 a) {
      float rib = q.y / 0.009, ri = floor(rib), rf = fract(rib);
      float lp = (q.x + lkH2(vec2(ri, 1.0)) * 0.006) / 0.006, li = floor(lp), lf = fract(lp);
      float k1 = lkKeep(0.009, px), k2 = lkKeep(0.006, px);
      float hr = mix(0.64, sin(3.1416 * rf), k1), hl = mix(0.64, sin(3.1416 * lf), k2 * k1);
      float yarn = lkH2(vec2(ri, li));
      a = vec4(yarn, hr, hl, k1 * k2);
      return 0.0016 * hr * (0.7 + 0.3 * hl);
    }
`;
  function rug(orig) {
    const W0 = W(RUGR[0], RUGR[1]), W1 = W(RUGR[2], RUGR[3]);
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.95, sheen: 1, sheenRoughness: 0.6, sheenColor: new THREE.Color().setRGB(0.1, 0.09, 0.08) }), 'rug', {
      head: RUG,
      surface: `
        vec2 q = vec2(lkP.x, lkP.z); vec3 ta = vec3(1.0, 0.0, 0.0), tb = vec3(0.0, 0.0, 1.0);
        float h0 = rgH(q, lkPx, rgA);
        ${SLOPE('h0')}
        float edge = min(min(vDrawW.x - ${f(W0[0])}, ${f(W1[0])} - vDrawW.x), min(vDrawW.z - ${f(W0[2])}, ${f(W1[2])} - vDrawW.z));
        float bind = 1.0 - smoothstep(0.045, 0.05, edge);
        vec3 y3 = rgA.x < 0.4 ? vec3(0.86, 0.85, 0.84) : rgA.x < 0.8 ? vec3(1.0) : vec3(1.22, 1.18, 1.12);
        vec3 col = ${v3([0.114, 0.098, 0.082])} * mix(vec3(1.02), y3, rgA.w) * mix(0.9, mix(0.72, 1.12, rgA.y * rgA.z), rgA.w);
        col *= 1.0 + 0.06 * (lkn(vec3(0.0, q.y * 2.2, 3.0)) - 0.5) + 0.04 * lkFbm(vec3(q, 2.0), 3.0, 0.5, 3, lkPx).x;
        col = mix(col, col * 0.78, bind);
        if (lkWN.y < 0.5) col *= 0.8;                                      // the rug's edge, bound in tape
        diffuseColor.rgb *= col;
        roughnessFactor = 0.96 - 0.05 * rgA.y;`,
    });
  }

  /* leather: cognac, semi-aniline. A pebble grain (cells about 1.6 mm with creases between them), the deeper creases
     of a seat that has been sat in, darker in the folds and paler where the leather is stretched over them (the oil
     moves away: "pull-up"), a waxed top coat, burnished edges. */
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
      float wr = lkFbm(vec3(q * vec2(1.0, 2.2), 2.0), 9.0, 0.55, 4, px).x;
      float sw = lkn(vec3(q * 4.0, 5.0));
      a = vec4(crease, hide, wr, k);
      return -0.00005 * crease + 0.00006 * hide + 0.0012 * wr + 0.0015 * sw;
    }
`;
  // (key and base: another hide of the same leather, the dressing room's black shoes and bags, 16 Oct)
  function leather(orig, key, base) {
    base = base || [0.193, 0.068, 0.018];
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.55, clearcoat: 0.32, clearcoatRoughness: 0.32 }), key || 'leather', {
      head: LEATHER,
      surface: `
        vec2 q; vec3 ta, tb; lkPlane(lkP, lkWN, q, ta, tb);
        float h0 = ltH(q, lkPxM, ltA);
        ${SLOPE('h0')}
        float curv = length(fwidth(lkWN)) / max(length(fwidth(vDrawW)), 1e-5);
        float edge = smoothstep(5.0, 12.0, curv);
        float mottle = lkFbm(vec3(q, 3.0), 3.0, 0.6, 5, lkPx).x;
        vec3 col = ${v3(base)} * (1.0 + 0.22 * mottle);
        col = mix(col, col * vec3(1.25, 1.18, 1.05), clamp(ltA.z * 3.0, 0.0, 1.0) * 0.5);   // paler where stretched over a wrinkle
        col *= 1.0 - 0.2 * ltA.x - 0.1 * edge + 0.12 * ltA.y;
        // worn paler on the seat and the tops of the arms, where hands and legs rest
        float wear = smoothstep(0.6, 0.95, lkWN.y) * smoothstep(0.45, 0.7, lkn(vec3(q * 6.0, 9.0)));
        col = mix(col, col * vec3(1.3, 1.22, 1.08), wear * 0.35);
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.5 + 0.16 * ltA.x - 0.12 * edge + 0.12 * mottle - 0.1 * wear, 0.25, 0.9);`,
    });
  }

  /* walnut, for the lounge chairs' frames: solid, oiled, the grain along the piece, open pores along it */
  function walnut(orig) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.45 }), 'walnut', {
      surface: `
        vec2 q = vLkUv; vec3 ta = vec3(0.0), tb = vec3(0.0);
        float y = q.y, lx = q.x;
        float rr = length(vec2(y * 1.0 - 0.07, 0.05 + 0.04 * lx)) + 0.006 * lkn(vec3(lx * 1.5, y * 8.0, 1.0));
        float ring = rr / 0.0045, vis = 1.0 - smoothstep(0.22, 0.55, fwidth(ring));
        float band = mix(0.4, smoothstep(0.0, 0.25, fract(ring)) * (1.0 - smoothstep(0.45, 0.95, fract(ring))), vis);
        float pores = smoothstep(0.62, 0.82, lkn(vec3(lx * 60.0, y * 900.0, 2.0))) * lkKeep(0.0015, lkPx);
        float h = 0.0002 * band - 0.00012 * pores;
        lkG = lkSurfGrad(lkWN, dFdx(h), dFdy(h));
        vec3 col = mix(${v3([0.12, 0.066, 0.034])}, ${v3([0.24, 0.142, 0.078])}, band) * (0.9 + 0.2 * lkn(vec3(lx * 1.2, y * 6.0, 4.0)));
        col *= 1.0 - 0.35 * pores;
        diffuseColor.rgb *= col;
        roughnessFactor = 0.42 + 0.1 * (1.0 - band) + 0.2 * pores;`,
    });
  }

  /* travertine, for the round side table: cut across the bed, strata that wander, open pores along them, honed */
  function travertine(orig) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.5 }), 'trav', {
      surface: `
        vec3 p = lkP;
        float wv = lkn(vec3(p.x * 2.0, p.y * 0.6, p.z * 2.0));
        float strata = lkn(vec3(p.x * 1.4, p.y * 22.0 + wv * 4.0, p.z * 1.4)) * 0.6 + lkn(vec3(p.x * 3.0, p.y * 70.0 + wv * 9.0, p.z * 3.0)) * 0.4 * lkKeep(0.01, lkPx);
        float fine = mix(0.5, lkn(vec3(p.x * 5.0, p.y * 120.0 + wv * 9.0, p.z * 5.0)), lkKeep(0.008, lkPx));
        float pore = smoothstep(0.76, 0.9, lkn(vec3(p.x * 34.0, p.y * 150.0, p.z * 34.0))) * smoothstep(0.3, 0.6, strata) * lkKeep(0.003, lkPx);
        float h = -0.0012 * pore + 0.0001 * fine;
        lkG = lkSurfGrad(lkWN, dFdx(h), dFdy(h));
        vec3 col = mix(${v3([0.44, 0.365, 0.26])}, ${v3([0.36, 0.29, 0.205])}, smoothstep(0.3, 0.7, strata));
        col *= (0.92 + 0.16 * fine) * (1.0 - 0.45 * pore);
        diffuseColor.rgb *= col;
        roughnessFactor = 0.42 + 0.12 * fine + 0.35 * pore;`,
    });
  }

  /* olive bark: grey and fissured, plates split by cracks that run up the trunk and the limbs and twist with them,
     lichen in pale patches. A solid texture (read by place in the world), so it has no seam round a branch. */
  const BARKH = (center) => `
    vec4 bkA;
    vec3 lkH33(vec3 p) { return vec3(lkH(p), lkH(p + 17.17), lkH(p + 41.41)); }
    // distance to the nearest and the second nearest of a jittered grid of points: their difference is small along the
    // cracks between plates
    vec2 voro(vec3 x) { vec3 i = floor(x), f = fract(x); float d1 = 9.0, d2 = 9.0;
      for (int k = -1; k <= 1; k++) for (int j = -1; j <= 1; j++) for (int m = -1; m <= 1; m++) {
        vec3 g = vec3(float(m), float(j), float(k)), r = g + lkH33(i + g) * 0.85 - f; float d = dot(r, r);
        if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
      return vec2(sqrt(d1), sqrt(d2)); }
    float bkH(vec3 p, float px, out vec4 a) {
      // about the tree's own trunk, twisted a little as an olive's grain is (only where the tree is known: twisted about any
      // other axis, a trunk twelve metres off read as tiger stripes)
      ${center ? `p -= ${v3(center)}; float tw = p.y * 0.5;` : 'float tw = 0.0;'}
      vec3 r = vec3(p.x * cos(tw) - p.z * sin(tw), p.y, p.x * sin(tw) + p.z * cos(tw));
      r += 0.01 * vec3(lkn(r * 20.0), lkn(r * 20.0 + 5.2), lkn(r * 20.0 + 9.7));
      // plates 3 cm across and 12 cm long, split by cracks; a finer net of shallower cracks inside each plate
      float k1 = lkKeep(0.012, px), k2 = lkKeep(0.005, px);
      // (cells as long as they are wide read as crocodile skin, the reviewer's word: olive bark splits into long strips,
      // 3 cm across and 25 to 40 up, with cracks that open and close along their length)
      // (2.5 times longer than wide since the night of 15 Oct: ten times, stretched straight up in the world, the strips ran
      // across every leaning limb and the bark read as camouflage)
      vec2 v1 = voro(r * vec3(26.0, 10.0, 26.0));
      float open = 0.08 + 0.14 * lkn(r * vec3(20.0, 2.0, 20.0) + 4.0);
      float crack = (1.0 - smoothstep(0.0, open, v1.y - v1.x)) * k1;
      float fine = 0.0;
      if (k2 > 0.0) { vec2 v2 = voro(r * vec3(85.0, 9.0, 85.0) + 3.1); fine = (1.0 - smoothstep(0.0, 0.1, v2.y - v2.x)) * k2 * (0.4 + 0.6 * lkn(r * 30.0)); }
      float plate = lkn(r * vec3(30.0, 8.0, 30.0) * 0.5 + 7.0);
      float scale = (lkn(r * vec3(160.0, 50.0, 160.0)) - 0.5) * lkKeep(0.003, px);
      // (lichen in small, sparse flecks: in patches a hand across, pale on dark, it was the camouflage Sam saw)
      float lichen = smoothstep(0.74, 0.86, lkn(p * 22.0 + 2.0)) * smoothstep(0.45, 0.7, lkn(p * 3.0 + 5.0)) * (1.0 - crack);
      a = vec4(crack, fine, plate, lichen);
      // each plate is domed a little (high in its middle), the cracks are deep
      return -0.006 * crack - 0.0015 * fine + 0.0025 * clamp(v1.y - v1.x, 0.0, 0.5) * k1 + 0.0004 * scale + 0.001 * plate;
    }`;
  // k: the bark's shade against the living olive's (the patio's and the garden's olives are a darker brown grey)
  function bark(orig, key, k, center, room) {
    k = k || [1, 1, 1];
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.9 }), key || 'bark', {
      head: BARKH(center === undefined ? [10.55 - 15, 0, 15.75 - 12.5] : center),
      drawable: Object.assign({ noCap: true, noRing: true }, room ? { room } : {}),
      surface: `
        float h0 = bkH(lkP, lkPx, bkA);
        ${SLOPE('h0')}
        vec3 col = mix(${v3([0.11 * k[0], 0.1 * k[1], 0.088 * k[2]])}, ${v3([0.2 * k[0], 0.19 * k[1], 0.17 * k[2]])}, bkA.z);                 // olive grey, not pine red
        col *= 1.0 - 0.3 * bkA.y;
        col = mix(col, ${v3([0.03, 0.025, 0.02])}, bkA.x * 0.85);
        col = mix(col, ${v3([0.2, 0.21, 0.17])}, bkA.w * 0.3);
        diffuseColor.rgb *= col;
        roughnessFactor = 0.82 + 0.12 * bkA.x;`,
    });
  }

  /* olive leaves: the sprig the canvas used to paint, drawn by the shader instead. A twig on the card's diagonal and
     fourteen narrow leaves off it, alternately, each a lance shape folded along its midrib: dark and waxy on top,
     silver underneath (the card's back), the midrib a paler line. Every card turns its leaves its own way. */
  const SPRIG = `
    vec4 sprig(vec2 uv, float seed) {
      // x: coverage, y: across the leaf (-1 to 1), z: along it (0 to 1), w: which leaf (or -1 for the twig)
      vec2 a = vec2(0.078, 0.078), b = vec2(0.92, 0.906), dir = normalize(b - a), nr = vec2(-dir.y, dir.x);
      float tl = length(b - a), ang0 = atan(dir.y, dir.x);
      float t = dot(uv - a, dir);
      float best = 1e3; vec4 o = vec4(0.0, 0.0, 0.0, -1.0);
      float tw = abs(dot(uv - a, nr) - sin(t / tl * 9.0) * 0.023) - 0.0055 * (1.0 - 0.6 * clamp(t / tl, 0.0, 1.0));
      if (t > 0.0 && t < tl) { best = tw; }
      for (int i = 0; i < 14; i++) {
        float fi = float(i), side = mod(fi, 2.0) < 0.5 ? -1.0 : 1.0;
        float tt = (0.08 + fi * 0.065) * tl;
        vec2 base = a + dir * tt + nr * sin(tt / tl * 9.0) * 0.023;
        float ang = ang0 - side * (0.75 + 0.4 * lkH2(vec2(fi, seed)));
        vec2 ld = vec2(cos(ang), sin(ang)), ln = vec2(-ld.y, ld.x);
        float len = 0.205 * (0.8 + 0.35 * lkH2(vec2(fi, seed + 3.0)));
        vec2 d = uv - base;
        float s = dot(d, ld) / len, x = dot(d, ln);
        if (s <= 0.0 || s >= 1.0 || abs(x) > 0.03) continue;
        float w = 0.021 * sqrt(sin(3.1416 * s)) * (1.0 - 0.4 * s) * (0.85 + 0.3 * lkH2(vec2(fi, seed + 7.0)));
        float dist = abs(x) - w;
        if (dist < best) { best = dist; o = vec4(0.0, w > 1e-5 ? clamp(x / w, -1.0, 1.0) : 0.0, s, fi); }
      }
      // (the edge is softened by the size of a pixel on the card. By fwidth(best) it was not: best jumps where the loop hands
      // over from one leaf to the next, at each leaf's box, and the edge pass drew a dark dashed box round every leaf)
      float aa = max(length(fwidth(uv)) * 0.7, 1e-5);
      // Far off a leaf is thinner than a pixel and the cut drops it, so a crown seen from above thinned to a lime veil. The
      // canvas sprig had the cure in its mip levels (its alpha grew with the level, see alphaMip in scene.js): here each leaf
      // grows by about a pixel more each time the card halves on screen
      float lodU = log2(max(length(fwidth(uv)) * 256.0, 1.0));
      o.x = 1.0 - smoothstep(-aa, aa, best - aa * (0.3 + 0.55 * lodU) * step(0.0, o.w));    // (the leaves, not the twig: grown, it browned the crown)
      return o;
    }`;
  let leafDepth = null;
  function leaf(orig) {
    const m = code(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.5, alphaTest: 0.5, envMapIntensity: orig.envMapIntensity }), 'leaf', {
      drawable: { noCap: true, noRing: true },
      head: SPRIG + 'vec4 lfS;',
      alpha: `lfS = sprig(vLkUv, vLkInst * 1.37); diffuseColor.a = lfS.x;`,
      sprig: true,
      surface: `
        // the card's own axes in the world, for the fold of each leaf
        vec3 dpx = dFdx(vDrawW), dpy = dFdy(vDrawW); vec2 dux = dFdx(vLkUv), duy = dFdy(vLkUv);
        float det = dux.x * duy.y - dux.y * duy.x;
        vec3 T = normalize((dpx * duy.y - dpy * dux.y) / det), Bv = normalize((dpy * dux.x - dpx * duy.x) / det);
        bool top = gl_FrontFacing;
        float rib = lfS.w < 0.0 ? 0.0 : 1.0 - smoothstep(0.06, 0.16, abs(lfS.y));
        // (iteration 8: an olive's dusty grey-green on top, a paler silver under. At 0.052 / 0.082 / 0.03 the reviewer measured
        // the plant a third darker than the scan's and read it as "one dark mass")
        vec3 col = lfS.w < 0.0 ? ${v3([0.075, 0.055, 0.035])} : top ? ${v3([0.08, 0.108, 0.052])} : ${v3([0.2, 0.225, 0.18])};
        col = mix(col, col * 1.6 + vec3(0.01, 0.012, 0.0), rib * 0.5);
        col *= (0.88 + 0.24 * lkH2(vec2(lfS.w, vLkInst))) * (0.92 + 0.16 * lkH2(vec2(vLkInst, 7.0)));
        // (each card's own tint, set for the scans' leaves, comes off: the sprig has its own colours. Until 15 Oct this
        // divided by the living olive's mean tint, which turned every other plant's leaves grey, the entrance's branches first)
        #ifdef USE_INSTANCING_COLOR
          diffuseColor.rgb /= max(vColor, vec3(0.05));
        #endif
        diffuseColor.rgb *= col;
        roughnessFactor = lfS.w < 0.0 ? 0.8 : top ? 0.62 : 0.78;          // (0.42 on top until 14 Oct: every leaf glinted)
        // folded along the midrib, and curling a little toward the tip
        if (lfS.w >= 0.0) {
          float sa = 0.0, ca = 0.0;
          vec2 a0 = normalize(vec2(0.842, 0.828));
          float ang = atan(a0.y, a0.x) - (mod(lfS.w, 2.0) < 0.5 ? -1.0 : 1.0) * (0.75 + 0.4 * lkH2(vec2(lfS.w, vLkInst * 1.37)));
          vec2 ld = vec2(cos(ang), sin(ang)), ln = vec2(-ld.y, ld.x);
          vec2 tilt = ln * lfS.y * 0.35 + ld * (lfS.z - 0.4) * 0.2;
          lkG = T * tilt.x + Bv * tilt.y;
        }`,
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

  /* firewood: oak logs. Bark in fissured grey plates along each log; the cut ends with their rings, a darker heart, a
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
        float seed = lkH2(vec2(floor(vDrawW.x * 997.0), 3.0));
        vec2 c = (vLkUv - 0.5) * 2.0 - (vec2(lkH2(vec2(seed, 1.0)), lkH2(vec2(seed, 2.0))) - 0.5) * 0.28;   // the pith is never in the middle
        float rr = length(c), th = atan(c.y, c.x);
        float n = 16.0 + 12.0 * seed;
        float ring = rr * n + 0.35 * lkn(vec3(c * 3.0, seed * 9.0)), vis = 1.0 - smoothstep(0.22, 0.55, fwidth(ring));
        float late = mix(0.3, smoothstep(0.55, 0.85, fract(ring)), vis);
        float rim = smoothstep(0.86, 0.93, length((vLkUv - 0.5) * 2.0));
        float sap = smoothstep(0.62, 0.72, rr) * (1.0 - rim);
        float check = 0.0;
        for (int i = 0; i < 4; i++) { float a = lkH2(vec2(seed, float(i) + 5.0)) * 6.2832; float da = abs(mod(th - a + 3.1416, 6.2832) - 3.1416);
          float wob = da + 0.03 * sin(rr * 40.0 + float(i));
          check = max(check, (1.0 - smoothstep(0.0, 0.018 / max(rr, 0.08), abs(wob))) * smoothstep(0.08, 0.3, rr) * (1.0 - smoothstep(0.35, 0.8 + 0.15 * float(i), rr)) * step(0.4, lkH2(vec2(seed, float(i)))));
        }
        float saw = lkn(vec3(vLkUv.x * 60.0 + vLkUv.y * 25.0, seed * 7.0, 1.0));
        float h = -0.0006 * check + 0.0002 * late + 0.0003 * saw;
        lkG = lkSurfGrad(lkWN, dFdx(h), dFdy(h));
        vec3 heart = ${v3([0.24, 0.15, 0.085])}, sapw = ${v3([0.42, 0.31, 0.19])};
        vec3 col = mix(heart, sapw, sap) * (1.0 - 0.22 * late) * (0.92 + 0.12 * saw);
        col = mix(col, ${v3([0.04, 0.034, 0.028])}, rim);
        col *= 1.0 - 0.55 * check;
        diffuseColor.rgb *= col;
        roughnessFactor = 0.8 + 0.12 * check;`,
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
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.5 }), key || 'travTiles', {
      head: head || TRAVT,
      surface: `
        vec2 q; vec3 ta, tb; lkPlane(vDrawW, lkWN, q, ta, tb);              // (in world metres, as the hatch is: no shift by LK_O)
        bool upright = abs(lkWN.y) < 0.7;
        float h0 = tvH(q, lkPx, upright, tvA, tvB);
        ${SLOPE('h0')}
        lkG *= lkFlat(lkWN);
        vec3 col = ${v3([0.356, 0.288, 0.2])};                               // (a little less yellow than the scan's mean: the scan reads cream)
        col *= 0.91 + 0.18 * tvB.x;                                            // each tile its own shade (was 0.8 to 1.2: "neighbouring tiles jump in tone")
        col *= mix(${v3([1.03, 1.0, 0.94])}, ${v3([0.97, 0.98, 1.02])}, tvB.w);  // a little warmer or greyer
        col *= (1.0 + 0.05 * tvA.x) * (1.0 + 0.24 * tvA.y) * (0.9 + 0.2 * clamp(tvB.z, 0.0, 1.0));
        col *= 1.0 + 0.1 * tvR;                                                   // a pale rim round each pore, where its edge breaks
        col = mix(col, col * ${v3([0.86, 0.84, 0.8])}, tvA.z);                  // the pore, a little darker (grey, not brown: "brown decals")
        col = mix(col, col * ${v3([0.4, 0.38, 0.35])}, tvA.w);                  // and its open core, darker the deeper it goes
        col = mix(col, col * ${v3([0.6, 0.53, 0.45])}, tvF * 0.5);             // the veins, filled: a shade darker and browner, not drawn on
        col *= 1.0 - 0.1 * tvD;                                                   // a little dirt along the joints                                                  // the fissures
        ${tex ? `col *= (1.0 + 0.2 * tvA.y) * (1.0 + 0.14 * lkFbm(vec3(q * 1.3, 31.0 + tvB.x * 7.0), 4.0, 0.55, 4, lkPx).x);   // clouds a hand to a forearm across
        col = mix(col, col * ${v3([0.8, 0.77, 0.72])}, tvA.z * 0.5);          // the pores, a shade more
        col = mix(col, col * ${v3([0.72, 0.66, 0.58])}, tvF * 0.35);           // and the filled veins` : ''}
        col = mix(col, ${v3([0.2, 0.17, 0.13])}, tvB.y * 0.9);                   // the grout
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.47 + 0.08 * tvA.y + 0.05 * (tvB.z - 0.5) - 0.1 * tvA.z + 0.35 * tvA.w + 0.35 * tvB.y, 0.25, 1.0);`,
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
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.82 }), key, {
      head: BOARD,
      drawable: drawableOpts,
      surface: `
        vec2 q; vec3 ta, tb; lkPlane(lkP, lkWN, q, ta, tb);
        vec2 qw; vec3 ta2, tb2; lkPlane(vDrawW, lkWN, qw, ta2, tb2);         // world metres, for the holes (the hatch's grid)
        vec3 col = ${v3(base)};
        float cloud = lkFbm(vec3(q * 1.0, 6.0), 1.6, 0.5, 4, lkPx).x;
        float h0 = bdH(q, lkPx, bdA);
        // tie holes: a cone, 25 mm across at the face, and a ring 40 mm across where the plug's cone sat
        vec2 cell = (fract(qw / 0.6) - 0.5) * 0.6;
        float d = length(cell);
        float big = 1.0 - smoothstep(0.006, 0.014, lkPx);                   // too small to draw: it would twinkle
        float hole = (1.0 - smoothstep(0.0115, 0.0125 + lkPx, d)) * big;
        float cone = clamp(1.0 - d / 0.0125, 0.0, 1.0) * hole;
        float ring = exp(-pow((d - 0.02) / max(0.0014, lkPx), 2.0)) * big;
        float stain = (1.0 - smoothstep(0.0, 0.05, abs(cell.x) - 0.006)) * smoothstep(0.0, -0.01, cell.y) * (1.0 - smoothstep(0.02, 0.16, -cell.y)) * big;
        float upright = step(abs(lkWN.y), 0.7);
        hole *= upright; cone *= upright; ring *= upright; stain *= upright;
        float lift = lineAA(qw.y, 1.2, 1.1) * upright * 0.3;               // (fainter: four of them up the wall read as plywood panels, the reviewer's note)
        float tone = (lkH2(vec2(floor(qw.y / 1.2), 5.0)) - 0.5) * 0.07;
        h0 += -0.02 * cone - 0.0003 * ring - 0.0002 * lift;
        ${SLOPE('h0')}
        lkG *= lkFlat(lkWN);
        vec4 mid = lkFbm(vec3(q * vec2(1.0, 1.4), 11.0), 30.0, 0.78, 6, lkPx);
        // (the pale skin's edge: its threshold shaken at a few millimetres, so it is sharp and ragged)
        float rag = 0.07 * (lkn(vec3(q * 90.0, 31.0)) - 0.5) * lkKeep(0.004, lkPx) + 0.04 * (lkn(vec3(q * 260.0, 37.0)) - 0.5) * lkKeep(0.0015, lkPx);
        float grit = (lkn(vec3(q * 700.0, 5.0)) - 0.5) * lkKeep(0.0015, lkPx) + 0.6 * (lkn(vec3(q * 300.0, 6.0)) - 0.5) * lkKeep(0.0035, lkPx) + 0.5 * (lkn(vec3(q * 120.0, 7.0)) - 0.5) * lkKeep(0.008, lkPx);
        // (patches about twice as long as tall: at five times they read as "stretched noise rather than laitance")
        float lait = smoothstep(0.09, 0.11 + lkPx * 4.0, lkFbm(vec3(q * vec2(1.0, 2.2), 13.0), 6.0, 0.65, 6, lkPx).x + rag);
        float broken = smoothstep(0.3, 0.7, lkn(vec3(q.x * 3.0, q.y * 9.0, 2.0)));
        float bloom = smoothstep(0.6, 0.9, lkn(vec3(q.x * 1.6, q.y * 0.5, 4.0)));
        float damp = smoothstep(0.62, 0.85, lkn(vec3(q.x * 0.9, q.y * 2.2, 8.0)));
        float tear = (smoothstep(0.74, 0.8, lkn(vec3(q.x * 2.2, q.y * 330.0, 21.0))) - smoothstep(0.76, 0.82, lkn(vec3(q.x * 2.6, q.y * 300.0, 27.0)))) * lkKeep(0.0025, lkPx);
        lkG += (ta * mid.y + tb * mid.z) * 0.0005;
        // (bolder than the fireplace's: each board drank its own amount of water, so some are a good deal paler; pale skin
        // in ragged patches the size of a hand to an arm; darker clouds where the wall stayed wet. The scan has all three,
        // and with the fireplace's gentler numbers the wall read as one even grey with fine streaks, like brushed metal)
        float board = (bdA.x - 1.0) / 0.07;                                 // the board's own number, -0.5 to 0.5
        // the pale skin flakes: a sharp, ragged edge (its threshold shaken at a few millimetres) and spotty inside
        float lait2 = smoothstep(0.1, 0.19 + lkPx * 4.0, lkFbm(vec3(q * vec2(1.0, 2.6), 19.0), 2.2, 0.62, 6, lkPx).x + rag);
        lait2 *= 0.65 + 0.35 * mix(0.5, lkn(vec3(q * 150.0, 41.0)), lkKeep(0.003, lkPx));
        float dark = smoothstep(0.12, 0.3, lkFbm(vec3(q * vec2(1.0, 3.0), 23.0), 1.6, 0.6, 5, lkPx).x);
        // each board darker and paler along its length, as a board drinks unevenly; dark pits and short scratches
        float along = lkn(vec3(q.x * 1.4, floor(q.y / 0.12) * 3.1, 3.0)) * 0.6 + lkn(vec3(q.x * 5.0, q.y * 12.0, 5.0)) * 0.4;
        float pits = smoothstep(0.86, 0.93, lkn(vec3(q * vec2(140.0, 260.0), 43.0))) * lkKeep(0.002, lkPx);
        float scratch = smoothstep(0.8, 0.86, lkn(vec3(q.x * 9.0, q.y * 420.0, 47.0))) * smoothstep(0.55, 0.75, lkn(vec3(q * 6.0, 49.0))) * lkKeep(0.002, lkPx);
        col *= (1.0 + 0.1 * board) * (0.86 + 0.28 * along) * (1.0 + tone) * (1.0 + 0.2 * cloud) * (1.0 + 0.45 * mid.x) * (1.0 + 0.2 * bdA.w * broken) * (1.0 + 0.42 * grit);
        // (softer edged and less pale since iteration 8: sharp and strong, the reviewer read "two-tone camouflage")
        col = mix(col, col * vec3(1.22, 1.2, 1.18) + 0.008, max(lait * 0.45, lait2 * 0.4));
        col *= (1.0 - 0.16 * dark) * (1.0 - 0.45 * pits) * (1.0 - 0.3 * scratch);
        col *= 1.0 + 0.08 * clamp(bdA.y, -1.0, 1.0);                      // (the fins: at 0.2, as the fireplace has them, the wall read as planks from across the room)
        col = mix(col, col * 1.16 + 0.012, bloom * 0.28);
        col *= 1.0 - 0.14 * damp - 0.55 * bdA.z;
        col *= 1.0 + 0.16 * tear;                                           // (fainter: bright and crisp at 0.26, they read as drawn)
        col *= (1.0 - 0.75 * hole * (0.55 + 0.45 * cone)) * (1.0 - 0.12 * ring) * (1.0 - 0.07 * stain) * (1.0 - 0.18 * lift);
        ${outdoor ? `// rain that ran down from the top: narrow, faint, a hint (the facade's Tie Holes option of 13 Oct)
        float run = lkn(vec3(qw.x * 7.0, qw.y * 0.12, 3.0)) * (0.6 + 0.4 * lkn(vec3(qw.x * 23.0, qw.y * 0.3, 7.0)));
        float wet = smoothstep(0.42, 0.7, run) * smoothstep(0.8, 4.0, qw.y) * 0.13 * upright;
        col *= 1.0 - wet;` : 'float wet = 0.0;'}
        diffuseColor.rgb *= col / 1.08;
        roughnessFactor = clamp(0.84 - 0.1 * bdA.y - 0.1 * bdA.w - 0.1 * lait + 0.12 * bdA.z + 0.1 * mid.x + 0.05 * damp + 0.1 * hole - 0.3 * wet, 0.4, 1.0);`,
    });
  }
  const concreteIn = (orig) => boardWall(orig, 'concreteIn', [0.345, 0.326, 0.29], false);

  /* ---------- the outside walls: fair faced concrete, cast against smooth panels (iteration 8) ----------------------
     Sam, 15 Oct, at the front of the house: "right now it's nice, but maybe make that feel of industrial concrete premium
     wall". The architect's concrete of Ando: no boards, a smooth silky skin cast against film-faced panels 2.4 by 1.2 m,
     a crisp hairline where two panels met (a little cement bled into it, so it is darker), the tie holes on the drawing's
     grid, 30 cm in from each joint. Each panel its own shade, a soft cloud in it and a finer silky mottle, the faint print
     of the panel's sheet, a few small bug holes near the top of each lift, a satin sheen. Rain runs from the top, faint.
     The panels are laid from the door: its edges are joints, so the front's panels stand symmetric about it. */
  function fairFaced(orig, key, base) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.66 }), key, {
      surface: `
        vec2 qw; vec3 ta, tb; lkPlane(vDrawW, lkWN, qw, ta, tb);
        float upright = step(abs(lkWN.y), 0.7);
        // the panels: 2.4 m along, 1.2 m up, the door's edges (plan x 13.8 and 16.2) on joints
        vec2 pq = vec2((qw.x + 16.2) / 2.4, qw.y / 1.2);
        vec2 pid = floor(pq), pf = fract(pq);
        float r1 = lkH2(pid + 3.0), r2 = lkH2(pid + 11.0);
        vec2 ed = min(pf, 1.0 - pf) * vec2(2.4, 1.2);                       // metres to the panel's nearest edges
        float fwx = max(0.0011, fwidth(qw.x) * 1.1), fwy = max(0.0011, fwidth(qw.y) * 1.1);
        float jx = exp(-pow(ed.x / fwx, 2.0)) * (0.0011 / fwx), jy = exp(-pow(ed.y / fwy, 2.0)) * (0.0011 / fwy);
        float joint = max(jx, jy) * upright;
        // each panel a hair proud or back, easing to nothing at its joints (never a step)
        float s = max(0.01, lkPx * 2.0);
        float plane = (r1 - 0.5) * 0.0008 * smoothstep(0.0, s, min(ed.x, ed.y)) * upright;
        // tie holes, as the board walls have them: a cone 25 mm across, a ring 40 mm across where the plug sat
        vec2 cell = (fract(qw / 0.6) - 0.5) * 0.6;
        float d = length(cell);
        float big = 1.0 - smoothstep(0.006, 0.014, lkPx);
        float hole = (1.0 - smoothstep(0.0115, 0.0125 + lkPx, d)) * big * upright;
        float cone = clamp(1.0 - d / 0.0125, 0.0, 1.0) * hole;
        float ring = exp(-pow((d - 0.02) / max(0.0014, lkPx), 2.0)) * big * upright;
        float stain = (1.0 - smoothstep(0.0, 0.05, abs(cell.x) - 0.006)) * smoothstep(0.0, -0.01, cell.y) * (1.0 - smoothstep(0.02, 0.16, -cell.y)) * big * upright;
        // the skin: a soft cloud the size of a panel, a finer silky mottle, the faint print of the panel's sheet along it
        vec4 cloud = lkFbm(vec3(qw * vec2(1.0, 1.3), 6.0 + r2 * 9.0), 0.8, 0.55, 4, lkPx);
        vec4 silk = lkFbm(vec3(qw, 11.0), 9.0, 0.6, 5, lkPx);
        float sheet = (lkn(vec3(qw.x * 0.9, qw.y * 38.0, r1 * 20.0)) - 0.5) * lkKeep(0.01, lkPx);
        float grit = (lkn(vec3(qw * 600.0, 5.0)) - 0.5) * lkKeep(0.0017, lkPx) + 0.6 * (lkn(vec3(qw * 240.0, 6.0)) - 0.5) * lkKeep(0.004, lkPx);
        // small bug holes, 1 to 4 mm, more of them high in each lift, where the air rose to
        vec2 hc = floor(qw / 0.05); vec2 hr = lkH22(hc + 3.0);
        float rad = 0.0006 + 0.0016 * pow(lkH2(hc + 7.0), 2.0);
        float pit = step(0.9 - 0.16 * smoothstep(0.55, 1.0, pf.y), lkH2(hc + 1.0)) * (1.0 - smoothstep(rad * 0.5, rad, length(qw - (hc + 0.15 + 0.7 * hr) * 0.05)));
        pit *= min(1.0, rad / max(lkPx * 0.6, 1e-5)) * upright;
        float h0 = plane + 0.00008 * silk.x + 0.00003 * sheet - 0.02 * cone - 0.0003 * ring - 0.0015 * pit - 0.00025 * joint;
        ${SLOPE('h0')}
        lkG *= lkFlat(lkWN);
        vec3 col = ${v3(base)} * (1.0 + 0.08 * (r1 - 0.5) * upright) * (1.0 + 0.2 * cloud.x) * (1.0 + 0.16 * silk.x) * (1.0 + 0.04 * sheet) * (1.0 + 0.18 * grit);
        col *= (1.0 - 0.3 * joint) * (1.0 - 0.5 * pit);
        col *= (1.0 - 0.75 * hole * (0.55 + 0.45 * cone)) * (1.0 - 0.12 * ring) * (1.0 - 0.07 * stain);
        // rain that ran down from the top: narrow, faint
        float run = lkn(vec3(qw.x * 7.0, qw.y * 0.12, 3.0)) * (0.6 + 0.4 * lkn(vec3(qw.x * 23.0, qw.y * 0.3, 7.0)));
        float wet = smoothstep(0.45, 0.72, run) * smoothstep(0.8, 4.0, qw.y) * 0.1 * upright;
        col *= 1.0 - wet;
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.7 + 0.1 * silk.x + 0.06 * cloud.x + 0.1 * pit + 0.15 * hole + 0.08 * joint - 0.2 * wet, 0.4, 1.0);`,
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
    // the console: plan 11.15 to 11.7 by 17.9 to 20.3, 86 cm high (since iteration 8, in the corner). Boards along its
    // length (z), three across its top, four up its front
    const c0 = W(11.15, 17.9);
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.58 }), 'oakConsole', {
      head: OAK + OAKFIG,
      surface: `
        vec3 an = abs(lkWN), p = vDrawW - ${v3(c0)};
        vec2 q; float Wd;
        if (an.y > an.x && an.y > an.z) { q = vec2(p.z + 7.0, p.x); Wd = 0.2; }
        else if (an.x >= an.z) { q = vec2(p.z + 7.0, p.y); Wd = 0.215; }
        else { q = vec2(p.x + 7.0, p.y); Wd = 0.215; }
        // (glued boards: a hairline only. A bevel's highlight a pixel wide stair-stepped along each seam, iteration 8)
        float h0 = oakBoardL(q, lkPx, Wd, 30.0, 0.03, oakA, oakB);
        vec2 fq = vec2(q.x, (fract(q.y / Wd) - 0.5) * Wd); float fseed = floor(q.y / Wd) + 11.0 + floor(an.y * 1.5) * 5.0, fRift = 0.3;
        ${OAKTEX}
        h0 -= 0.00006 * pores * pk;
        ${SLOPE('h0')}
        lkG *= lkFlat(lkWN);
        ${OAKPAINT([0.262, 0.13, 0.068])}
        col *= mix(vec3(1.0), vec3(0.94, 0.96, 1.0), 0.6);                  // smoked: a little greyer
        col *= 1.0 - 0.3 * oakA.w;
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.52 + 0.08 * oakB.x + 0.16 * pores - 0.06 * oakA.z + 0.3 * oakA.w, 0.25, 1.0);`,
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
  // Grass close up: blades, short strokes a couple of millimetres wide and a few centimetres long, each leaning its own
  // way and its own shade, crowding into a pile with dark between them; their average where they are under two pixels
  const GRASS = {
    head: `
    float gsBlade(vec2 p) {
      vec2 c0 = floor(p); float m = 0.0, t = 0.5;
      for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
        vec2 c = c0 + vec2(float(i), float(j)), r = lkH22(c);
        vec2 d = p - c - r;
        float a = lkH2(c + 4.1) * 6.2832; vec2 dir = vec2(cos(a), sin(a));
        float along = dot(d, dir), across = dot(d, vec2(-dir.y, dir.x));
        float e = length(vec2(along / (0.5 + 0.4 * r.x), across / 0.12));
        float b = 1.0 - smoothstep(0.75, 1.0, e);
        if (b > m) { m = b; t = lkH2(c + 9.3); }
      }
      return m * (0.55 + 0.9 * t);
    }`,
    surface: `
      vec2 gp = vDrawW.xz * 40.0;
      float gk = lkKeep(0.009, lkPx);
      float bl = gk > 0.001 ? gsBlade(gp) : 0.5;
      diffuseColor.rgb *= mix(1.0, 0.62 + 0.62 * bl, gk);
      roughnessFactor = clamp(roughnessFactor - 0.08 * bl * gk, 0.6, 1.0);`,
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
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.95 }), key || 'limewash', {
      head: PLASTER,
      surface: `
        vec2 q; vec3 ta, tb; lkPlane(lkP, lkWN, q, ta, tb);
        float lip; float h = trowel(q, ${f(amp || 0.00012)}, lip);
        vec4 sand = lkFbm(vec3(q, 0.5), 600.0, 0.55, 3, lkPx);
        float c1 = lkFbm(vec3(q, 3.0), 0.8, 0.55, 4, lkPx).x, c2 = lkFbm(vec3(q, 4.0), 4.0, 0.6, 4, lkPx).x;
        // the brush: strokes 6 to 12 cm wide, long, at a slant that turns patch by patch
        float a = 0.5 + 1.2 * lkn(vec3(q * 0.6, 6.0)); vec2 bq = vec2(cos(a) * q.x + sin(a) * q.y, -sin(a) * q.x + cos(a) * q.y);
        float stroke = lkn(vec3(bq.x * 1.2, bq.y * 11.0, 8.0)) - 0.5;
        lkG = lkSurfGrad(lkWN, dFdx(h), dFdy(h)) + (ta * sand.y + tb * sand.z) * 0.00008;
        lkG *= lkFlat(lkWN);
        vec3 col = ${v3(base)} * (1.0 + ${f(0.14 * (calm || 1))} * c1) * (1.0 + ${f(0.1 * (calm || 1))} * c2) * (1.0 + ${f(0.1 * (calm || 1))} * stroke) * (1.0 + 0.03 * sand.x);
        col = mix(col, col * ${v3([1.04, 1.03, 1.0])}, smoothstep(0.1, 0.3, c2));
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.93 + 0.05 * sand.x - 0.04 * lip, 0.8, 1.0);`,
    });
  }

  /* ---------- the entrance's floor: slabs of a dark grey marble ---------------------------------------
     Iteration 8, Sam, 15 Oct: "instead of one smooth surface, big tiles... side by side, so there's that small delimitation
     that is subtle, that feels clean... make it more realistic". Slabs of 1.2 by 2.4 m, the long side toward the living
     room, laid on a grid whose joints meet the edges of the opening (plan x 12 and 18) and the front wall. A dark grey
     marble, honed to a satin: a cloudy ground with a fine crystalline grain, and veins that run one way through the block,
     a few that read and many hairlines, branching and breaking. Each pair of slabs side by side is book matched (one is the
     other's mirror across their joint), and the veins run on from one slab to the next along the room, as slabs cut in
     sequence from one block do. A 1.5 mm joint, a shade darker, the arrises eased, each slab a hair proud or low.
     (Until then one field of black marble whose veins were bright wandering lines: "light trails".) */
  const SLAB = `
    // a vein: where a stretched, bent noise crosses its middle, t wide (in the noise's own units), never thinner than a
    // pixel can hold (then fainter instead), so it neither breaks into dots nor sparkles
    float slVein(float n, float t) { float fw = fwidth(n), w = max(t, fw * 1.2); return (1.0 - smoothstep(0.5 * w, 1.5 * w, abs(n - 0.5))) * (t / w); }`;
  function slabs(orig) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.3 }), 'slabDark', {
      head: SLAB,
      surface: `
        vec2 q = vDrawW.xz, o = vec2(-18.0, -7.0), sz = vec2(1.2, 2.4);              // plan x 12, y 17: the grid's corner
        // (an upright face, the living room's pit: a strip of the same stone lying along the riser, its veins running along it,
        // a joint at the floor's edge. Laid by the floor's xz, an upright face drew each column as one smear down it)
        if (abs(lkWN.y) < 0.5) q = abs(lkWN.x) > abs(lkWN.z) ? vec2(vDrawW.y - 18.0, vDrawW.z) : vec2(vDrawW.y - 18.0, vDrawW.x);
        vec2 c = (q - o) / sz, id = floor(c), lq = fract(c) * sz;
        float r1 = lkH2(id + 3.1), r2 = lkH2(id + 7.7), r3 = lkH2(id + 13.3);
        vec2 e2 = min(lq, sz - lq); float ej = min(e2.x, e2.y);
        // the joint and the arris, each by the pixel's size across it (as the travertine's)
        vec2 pq = max(fwidth(q), vec2(1e-5));
        vec2 gw2 = max(vec2(0.00075), pq * 0.8), ew2 = max(vec2(0.0012), pq * 1.3);
        vec2 g2 = 1.0 - smoothstep(gw2 * 0.6, gw2 * 1.4, e2), a2 = 1.0 - smoothstep(vec2(0.0), ew2, e2);
        float gfar = 1.0 - smoothstep(0.02, 0.05, lkPx);
        float grout = max(g2.x, g2.y) * gfar, arris = max(a2.x, a2.y) * gfar;
        float gw = mix(gw2.y, gw2.x, step(e2.x, e2.y)), ew = mix(ew2.y, ew2.x, step(e2.x, e2.y));
        // the stone's own place: each column of slabs its own part of the block, continuous along the room, as slabs cut in
        // sequence. (Book matched pairs first: the mirror made symmetric drops at every joint, which read as made, not found)
        vec2 sp = vec2(lq.x, q.y - o.y) + vec2(lkH2(vec2(id.x, 5.0)) * 40.0, lkH2(vec2(id.x, 9.0)) * 3.0 + id.y * 0.03);
        // The veins: long, near parallel, running along the room at a slight slant, bent and breaking. A noise stretched ten
        // to twenty times along the vein, so its middle line runs on and seldom closes into a loop (round, the contours of
        // noise drew loops and drops: "contour lines read as drawings", the living room's lesson, learned a third time)
        vec2 w = sp + vec2(0.12 * lkFbm(vec3(sp * vec2(1.2, 0.3), 21.0), 1.0, 0.5, 3, lkPx).x, 0.0);
        vec2 rv = mat2(0.98, -0.2, 0.2, 0.98) * w;
        float v1 = slVein(lkn(vec3(rv.x * 1.6, rv.y * 0.09, 31.0)), 0.006) * smoothstep(0.35, 0.75, lkn(vec3(sp * vec2(0.8, 0.25), 32.0)));
        float v2 = slVein(lkn(vec3(rv.x * 4.0 + 0.2 * rv.y, rv.y * 0.22 + 3.0, 33.0)), 0.007) * smoothstep(0.4, 0.7, lkn(vec3(sp * vec2(1.6, 0.5), 34.0)));
        float v3 = slVein(lkn(vec3(rv.x * 9.0 - 0.3 * rv.y, rv.y * 0.6 + 7.0, 35.0)), 0.01) * smoothstep(0.45, 0.72, lkn(vec3(sp * vec2(3.0, 1.0), 36.0)));
        float v4 = slVein(lkn(vec3(rv.x * 22.0 + 0.5 * rv.y, rv.y * 1.6 + 1.0, 37.0)), 0.014) * smoothstep(0.5, 0.75, lkn(vec3(sp * vec2(5.0, 2.0), 38.0))) * lkKeep(0.004, lkPx);
        // (few and faint: strong, the long veins read as scratches on a shiny tile. The stone is the ground now, the veins an accent)
        float vein = clamp(0.62 * v1 + 0.42 * v2 + 0.26 * v3 + 0.16 * v4, 0.0, 1.0);
        // the ground: clouds of deeper and paler grey at two sizes, a fine crystalline grain, pale fossil flecks of a
        // millimetre or three in patches, as a dark limestone shows them honed
        float cloud = lkFbm(vec3(sp, 41.0), 1.3, 0.55, 4, lkPx).x + 0.6 * lkFbm(vec3(sp, 42.0), 7.0, 0.55, 3, lkPx).x;
        vec4 grain = lkFbm(vec3(sp, 43.0), 220.0, 0.6, 3, lkPx);
        float patchF = smoothstep(0.35, 0.7, lkn(vec3(sp * 2.5, 45.0)));
        float fleck = mix(0.02, smoothstep(0.8, 0.87, lkn(vec3(sp * 600.0, 44.0))), lkKeep(0.0025, lkPx)) * (0.3 + 0.7 * patchF)
                    + mix(0.006, smoothstep(0.86, 0.92, lkn(vec3(sp * vec2(160.0, 240.0), 46.0))), lkKeep(0.006, lkPx)) * patchF * 0.8;
        // each slab a hair proud or low, easing back to its joint
        float ease = smoothstep(0.0, max(0.006, lkPx * 2.5), ej);
        float h0 = ((r1 - 0.5) * 0.0003 + (r2 - 0.5) * 0.0006 * (lq.x / sz.x - 0.5) + (r3 - 0.5) * 0.0006 * (lq.y / sz.y - 0.5)) * ease
                 - 0.0007 * grout * (0.00075 / gw) - 0.0004 * arris * (0.0012 / ew) + 0.000015 * grain.x;
        ${SLOPE('h0')}
        lkG *= lkFlat(lkWN);
        // a grey marble (Sam, 15 Oct: "I like it, but it feels too dark... a premium marble, greyish"): a soft grey ground in
        // clouds of paler and deeper grey (bardiglio's nuvolato), the veins a darker grey, the flecks paler
        // (the clouds drawn out along the veins, as bardiglio's are: round, they read as blotches of camouflage concrete)
        float drift = lkFbm(vec3(rv.x * 2.4, rv.y * 0.42, 42.0), 1.0, 0.55, 5, lkPx).x;
        float neb = smoothstep(-0.3, 0.35, 0.7 * drift + 0.3 * cloud);
        vec3 col = mix(${v3([0.27, 0.27, 0.268])}, ${v3([0.43, 0.428, 0.42])}, neb) * (1.0 + 0.07 * grain.x) * (0.97 + 0.06 * lkH2(vec2(id.x + id.y * 3.0, 2.0)));
        col = mix(col, ${v3([0.13, 0.13, 0.132])}, vein * 0.6);
        col += ${v3([0.06, 0.06, 0.058])} * fleck;
        col = mix(col, ${v3([0.17, 0.17, 0.168])}, grout * 0.6);                // (a subtle line: Sam's "small delimitation that is subtle")
        diffuseColor.rgb *= col;
        // honed: a soft sheen, no mirror
        roughnessFactor = clamp(0.34 + 0.06 * grain.x + 0.06 * vein + 0.05 * cloud + 0.08 * fleck + 0.45 * grout + 0.15 * arris, 0.2, 1.0);`,
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

  /* wool in a herringbone twill: the bedroom's throws and rugs, the headboard. Diagonal ribs 2.5 mm apart, their slant
     turning every 12 mm across, a two-tone yarn with a little fuzz, a soft sheen at a grazing angle */
  const HERRING = `
    vec4 hbA;
    float hbH(vec2 q, float px, float seed, out vec4 a) {
      float H = 0.012, col = floor(q.x / H), dir = mod(col, 2.0) < 0.5 ? 1.0 : -1.0;
      float k1 = lkKeep(0.0025, px), k2 = lkKeep(0.012, px);
      float d = (q.y + dir * (q.x - col * H)) / 0.0025;
      float rib = mix(0.5, 0.5 + 0.5 * sin(6.2832 * d), k1);
      float seam = mix(0.0, 1.0 - smoothstep(0.0, max(0.0008, px), min(fract(q.x / H), 1.0 - fract(q.x / H)) * H), k2);
      float yarn = mix(0.5, lkn(vec3(q * vec2(300.0, 300.0), seed)), lkKeep(0.0015, px));
      float fuzz = lkFbm(vec3(q, seed + 2.0), 30.0, 0.6, 4, px).x;
      a = vec4(rib, seam, yarn, fuzz);
      return 0.0003 * rib - 0.0002 * seam + 0.0002 * fuzz + 0.00008 * yarn;
    }`;
  function woolWeave(orig, key, base) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.92, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color().setRGB(base[0] * 0.6, base[1] * 0.6, base[2] * 0.62) }), key, {
      head: HERRING + SEAM,
      surface: `
        vec2 q; vec3 ta, tb; lkPlane(lkP, lkWN, q, ta, tb);
        float h0 = hbH(q, lkPxM, ${f((key.length * 3.7) % 9)}, hbA);
        ${SLOPE('h0')}
        vec3 col = ${v3(base)} * (0.9 + 0.2 * hbA.x) * (1.0 - 0.1 * hbA.y) * mix(${v3([0.94, 0.94, 0.95])}, ${v3([1.06, 1.05, 1.04])}, hbA.z) * (1.0 + 0.08 * hbA.w);
        diffuseColor.rgb *= col;
        roughnessFactor = 0.9 - 0.06 * hbA.x;
        ${CLOTH_SEAM(0.0)}`,
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
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.5 }), key, {
      surface: `
        vec3 w = vDrawW;
        float fi = floor((w.x - ${f(X0)} + 0.07) / ${f(F.pitch)});
        float lx = clamp(w.x - (${f(X0)} + fi * ${f(F.pitch)}), 0.0, ${f(F.w)});
        float ac = lx + (w.z - ${f(Z0)}), al = w.y;                          // across the grain round the fin, and up it (metres)
        float sd = fi * 7.31 + 3.0, r1 = lkH2(vec2(sd, 1.0)), r2 = lkH2(vec2(sd, 2.0));
        float px = max(fwidth(ac) * 0.7, 1e-5);
        // growth lines: straight, 1.6 to 3.2 mm apart, each its own strength, wandering a hair as they rise
        float wan = 0.0015 * (lkn(vec3(al * 0.4, sd, 1.0)) - 0.5) + 0.0006 * (lkn(vec3(al * 1.7, sd, 2.0)) - 0.5);
        float gl = (ac + wan) / (0.0016 + 0.0016 * r1);
        gl += 0.8 * (lkn(vec3(gl * 0.35, sd, 3.0)) - 0.5);
        float gk = 1.0 - smoothstep(0.25, 0.6, fwidth(gl));
        float line = mix(0.22, (1.0 - smoothstep(0.0, 0.22, fract(gl))) * (0.4 + 0.6 * lkH2(vec2(floor(gl), sd))), gk);
        // fibre, fine streaks along the grain, and long soft streaks a few centimetres wide
        float fib = (lkn(vec3(ac * 900.0, al * 6.0, sd)) - 0.5) * lkKeep(0.0011, px) + 0.6 * (lkn(vec3(ac * 260.0, al * 2.0, sd + 1.0)) - 0.5) * lkKeep(0.004, px);
        float streak = lkn(vec3(ac * 22.0, al * 0.35, sd + 2.0));
        float pore = smoothstep(0.8, 0.92, lkn(vec3(ac * 1400.0, al * 40.0, sd + 4.0))) * lkKeep(0.0008, px);
        float mineral = smoothstep(0.72, 0.86, lkn(vec3(ac * 120.0, al * 0.7, sd + 6.0))) * lkKeep(0.003, px);   // thin darker lines, as teak has
        float h0 = 0.00006 * fib - 0.00004 * pore - 0.00003 * line;
        ${SLOPE('h0')}
        lkG *= lkFlat(lkWN);
        vec3 col = ${v3(base)} * (0.9 + 0.2 * r2) * mix(vec3(1.0), ${v3([0.95, 1.0, 1.07])}, r1 * 0.5);
        col *= (1.0 - 0.2 * line) * (1.0 + 0.3 * fib) * (0.84 + 0.32 * streak) * (1.0 - 0.45 * pore) * (1.0 - 0.22 * mineral);
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.48 + 0.06 * fib + 0.1 * pore - 0.04 * streak, 0.3, 0.8);`,
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
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.55 }), 'jura', {
      head: JURA,
      surface: `
        vec3 p = vDrawW; vec2 q = p.xz;
        float xp = p.x + 30.0, yp = p.z + 24.0;
        // the path's slabs are 2 m along it, the bands across the gravel one stone each
        float slab = (xp > 13.45 && xp < 16.55 && yp < 42.0) ? floor((yp - 26.0) / 2.0) : 20.0 + floor((yp - 32.7) / 2.6) + (xp > 15.0 ? 7.0 : 0.0);
        float r1 = lkH2(vec2(slab, 1.0)), r2 = lkH2(vec2(slab, 2.0));
        vec3 lp = p + vec3(slab * 3.7, 0.0, slab * 1.3);                     // each slab from another part of the block
        vec4 cl = lkFbm(lp, 0.9, 0.55, 3, lkPx), cm = lkFbm(lp + 4.0, 5.0, 0.55, 4, lkPx);
        float blue = smoothstep(0.08, 0.28, cl.x + 0.5 * cm.x + 0.2 * (r2 - 0.5));
        vec3 stone = mix(${v3([0.44, 0.39, 0.315])}, ${v3([0.37, 0.365, 0.345])}, blue * 0.7);
        // (clouds a hand to a metre across, strong enough to read from the door: fainter, the slabs read as cast concrete)
        vec4 cb = lkFbm(lp + 7.0, 2.2, 0.5, 3, lkPx);
        stone *= (0.9 + 0.2 * r1) * (1.0 + 0.36 * cm.x) * (1.0 + 0.34 * cl.x) * (1.0 + 0.3 * cb.x);
        // fossils: shell fragments at two sizes (cells of 7 and 2.2 cm), dark and pale specks
        float f1, f2, k1 = lkKeep(0.012, lkPx), k2 = lkKeep(0.004, lkPx), k3 = lkKeep(0.0025, lkPx);
        float sh1 = juShell(q * 14.0 + slab * 3.1, 1.0 + slab, lkPx * 14.0, 0.18, f1) * k1;
        float sh2 = juShell(q * 45.0 + slab * 1.7, 9.0 + slab, lkPx * 45.0, 0.12, f2) * k2;
        // broken shell: short slivers lying every way, a shade darker or paler than the ground
        vec2 qr = mat2(0.8, -0.6, 0.6, 0.8) * q;
        float frag = smoothstep(0.8, 0.9, lkn(vec3(qr * vec2(110.0, 28.0), slab + 12.0))) * k2;
        float fragP = smoothstep(0.82, 0.92, lkn(vec3(q * vec2(30.0, 120.0), slab + 15.0))) * k2;
        float dark = smoothstep(0.8, 0.9, lkn(vec3(q * 220.0, slab))) * k3, pale = smoothstep(0.84, 0.94, lkn(vec3(q * 160.0, slab + 3.0))) * k3;
        stone = mix(stone, stone * ${v3([1.1, 1.08, 1.04])}, (f1 * k1 + f2 * k2) * 0.45);
        stone = mix(stone, stone * ${v3([0.7, 0.64, 0.56])}, max(sh1, sh2) * 0.45);
        stone *= (1.0 - 0.3 * dark) * (1.0 + 0.18 * pale) * (1.0 - 0.14 * frag) * (1.0 + 0.12 * fragP);
        // honed: a fine relief and small pits
        float pit = smoothstep(0.83, 0.93, lkn(vec3(q * 300.0, slab + 6.0))) * lkKeep(0.002, lkPx);
        vec4 rf = lkFbm(lp + 9.0, 60.0, 0.6, 4, lkPx);
        float h = 0.00012 * rf.x - 0.0003 * pit - 0.00006 * max(sh1, sh2);
        ${SLOPE('h')}
        lkG *= lkFlat(lkWN);
        stone *= 1.0 - 0.22 * pit;
        diffuseColor.rgb *= stone;
        roughnessFactor = clamp(0.5 + 0.12 * rf.x + 0.2 * pit, 0.3, 0.9);`,
      end: SHADE_FILL,
    });
  }

  /* the forecourt's gravel: crushed stone of two sizes (about 2 cm, and under 1 cm in the gaps between), each stone its own
     grey, some bluer, some warmer, one in eight pale and one in twelve near black, domed, with shadow between and fine grit.
     (One size of round stones, each a shade of one grey, until iteration 8. Sam: "try to make better texture".) */
  function courtGravel(orig, key, base) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.85 }), key, {
      head: GRAV,
      drawable: { farFlat: true, macro: 0.3, side: THREE.FrontSide },
      surface: `
        float k = lkKeep(0.022, lkPx), k2 = lkKeep(0.009, lkPx), k3 = lkKeep(0.0024, lkPx);
        vec4 c = k > 0.001 ? gvCells(vDrawW.xz * 46.0) : vec4(0.3, 0.6, 0.5, 0.5);
        vec4 s = k2 > 0.001 ? gvCells(vDrawW.xz * 110.0 + 17.0) : vec4(0.3, 0.6, 0.5, 0.5);
        float e = c.y - c.x, es = s.y - s.x;
        float gap = (1.0 - smoothstep(0.0, 0.16 + lkPx * 30.0, e)) * k;
        float dome = clamp(e * 2.2, 0.0, 1.0), domeS = clamp(es * 2.2, 0.0, 1.0) * k2;
        float grit = (lkn(vec3(vDrawW.xz * 420.0, 3.0)) - 0.5) * k3;
        float h = (0.005 * dome - 0.004 * gap) * k + 0.0015 * domeS * gap + 0.0002 * grit;
        ${SLOPE('h')}
        float t = mix(0.5, c.z, k), hu = mix(0.5, c.w, k);
        float lum = 0.7 + 0.6 * t;
        lum = mix(lum, 1.85, step(0.875, t) * k);
        lum = mix(lum, 0.38, step(t, 0.085) * k);
        vec3 stone = ${v3(base)} * lum * mix(${v3([0.93, 0.97, 1.05])}, ${v3([1.07, 1.0, 0.91])}, hu);
        vec3 small = ${v3(base)} * (0.6 + 0.6 * mix(0.5, s.z, k2)) * (0.75 + 0.25 * domeS);
        stone = mix(stone, small, gap * 0.7);
        stone *= (1.0 - 0.4 * gap * (1.0 - 0.6 * domeS)) * (1.0 + 0.25 * grit);
        stone *= 1.0 + 0.05 * (lkn(vec3(vDrawW.xz * 0.8, 9.0)) - 0.5);       // the far speckle's cloud
        diffuseColor.rgb *= stone / 0.9;
        roughnessFactor = clamp(0.78 - 0.18 * dome * k + 0.15 * gap, 0.4, 1.0);`,
      end: SHADE_FILL,
    });
  }

  /* the boulders in the gravel: a weathered limestone, rounded by the weather. Pale grey with ochre stains, darker down the
     flanks where the rain runs, small pits, a few fine fissures, pale lichen on top. (The dry-stone wall's stone until
     iteration 8: its joints drew a net of cracks over each boulder, like a tortoise's shell.) */
  function rock(orig, base) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.85 }), 'rock', {
      drawable: { macro: 0.3 },
      surface: `
        vec3 p = vDrawW;
        vec4 big = lkFbm(p, 3.0, 0.55, 4, lkPx), mid = lkFbm(p + 5.0, 18.0, 0.55, 4, lkPx), fine = lkFbm(p + 9.0, 90.0, 0.6, 3, lkPx);
        float pit = smoothstep(0.78, 0.9, lkn(p * 70.0)) * lkKeep(0.006, lkPx);
        float fz = lkn(p * vec3(6.0, 2.0, 6.0) + 3.0);
        float fis = (1.0 - smoothstep(0.0, 0.012 + lkPx * 4.0, abs(fz - 0.5))) * smoothstep(0.55, 0.75, lkn(p * 2.5 + 7.0)) * lkKeep(0.01, lkPx);
        float up = clamp(lkWN.y, 0.0, 1.0);
        float lichen = smoothstep(0.7, 0.78, lkn(p * 16.0 + 1.0)) * smoothstep(0.4, 0.9, up) * lkKeep(0.008, lkPx);
        float h = 0.006 * big.x + 0.0015 * mid.x + 0.0003 * fine.x - 0.0012 * pit - 0.002 * fis;
        ${SLOPE('h')}
        vec3 col = ${v3(base)} * (0.85 + 0.35 * big.x + 0.5 * mid.x) * (1.0 + 0.35 * fine.x);
        col = mix(col, col * ${v3([1.15, 1.0, 0.78])}, smoothstep(0.1, 0.35, lkn(p * 1.6 + 2.0)) * 0.5);
        col *= mix(0.8, 1.05, up);
        col *= (1.0 - 0.45 * pit) * (1.0 - 0.6 * fis);
        col = mix(col, ${v3([0.4, 0.41, 0.36])}, lichen * 0.4);
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.82 + 0.1 * fine.x + 0.1 * pit, 0.6, 1.0);`,
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
        // the arris: rounded over 4 mm, chipped here and there
        float e = min(ev, eu);
        float chip = smoothstep(0.7, 0.85, lkn(vec3(q * 60.0, 5.0))) * lkKeep(0.006, lkPx);
        float arris = smoothstep(0.0, 0.004 + 0.006 * chip + lkPx, e);
        vec4 face = lkFbm(vec3(q, r1 * 9.0), 40.0, 0.6, 4, lkPx);
        float pit = smoothstep(0.82, 0.92, lkn(vec3(q * 260.0, 7.0))) * lkKeep(0.003, lkPx);
        float h0 = (0.009 * arris - 0.009) * max(kv, ku)
                 + ((r2 - 0.5) * 0.0016 * (uu / BL - 0.5) + (r3 - 0.5) * 0.001) * arris + 0.0003 * face.x - 0.0006 * pit;
        ${SLOPE('h0')}
        lkG *= lkFlat(lkWN);
        // each brick its own grey, darker toward its flashed ends; a sanded face, lime specks, pits
        float tone = 0.62 + 0.76 * r1;
        vec3 brick = ${v3(base)} * tone * mix(${v3([0.94, 0.97, 1.05])}, ${v3([1.1, 1.0, 0.88])}, r4);
        float flash = smoothstep(0.25, 0.0, min(uu, BL - uu) / BL) * (0.3 + 0.5 * r3);
        brick *= (1.0 - 0.35 * flash) * (1.0 + 0.22 * face.x) * (1.0 - 0.4 * pit);
        float lime = smoothstep(0.86, 0.94, lkn(vec3(q * 180.0, 11.0 + r2))) * lkKeep(0.003, lkPx);
        brick = mix(brick, ${v3([0.32, 0.31, 0.29])}, lime * 0.5);
        vec3 mortar = ${v3([0.2, 0.193, 0.18])} * (0.92 + 0.16 * lkn(vec3(q * 90.0, 13.0))) * 0.62;   // (in the joint's own shadow)
        vec3 col = mix(brick, mortar, joint);
        // the arris catches a little more light than the face
        col *= 1.0 + 0.12 * (1.0 - arris) * (1.0 - joint) * max(kv, ku);
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.8 + 0.1 * face.x + 0.1 * joint + 0.08 * pit - 0.1 * lime, 0.5, 1.0);`,
    });
  }

  /* the bird of paradise's basket (iteration 8): rattan woven over upright stakes 2.2 cm apart, each weaver a round cane 8 mm
     high passing in front of one stake and behind the next, the next row the other way. A cane is lit as a cylinder (paler
     along its middle), each its own honey or straw tone, a dark gap where the weave opens. Laid round the basket's axis
     (window.LINTEL_BASKET), so the pattern wraps it. Under two pixels a cane is its average. */
  function rattan(orig) {
    const Bk = window.LINTEL_BASKET || { x: 10.15, y: 16.15 };
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.7 }), 'rattan', {
      surface: `
        vec3 w = vDrawW - vec3(${f(Bk.x - 30)}, 0.0, ${f(Bk.y - 24)});
        float u = atan(w.z, w.x) * 0.25, v = w.y;                           // metres round (at a 25 cm radius) and up
        float SW = 0.022, RH = 0.008;
        float row = floor(v / RH), fv = fract(v / RH), st = floor(u / SW), fu = fract(u / SW);
        bool over = mod(row + st, 2.0) < 1.0;                                // the weaver in front of this stake, or behind it
        float pu = max(fwidth(u) / SW, 1e-4), pv = max(fwidth(v) / RH, 1e-4), k = 1.0 - smoothstep(0.35, 0.7, max(pu, pv));
        float cane = over ? sin(3.1416 * fv) : sin(3.1416 * clamp((fu - 0.3) / 0.4, 0.0, 1.0));   // the weaver's round, or the stake's
        float gap = over ? 0.0 : (1.0 - step(0.3, fu) * step(fu, 0.7));
        float tone = lkH2(over ? vec2(row, floor(u / (SW * 3.0))) : vec2(st, 7.0));
        float h0 = mix(0.0, 0.0012 * cane - 0.0015 * gap, k);
        ${SLOPE('h0')}
        vec3 col = mix(${v3([0.36, 0.25, 0.13])}, ${v3([0.5, 0.38, 0.21])}, tone) * mix(1.0, 0.72 + 0.4 * cane, k);
        col = mix(col, ${v3([0.08, 0.06, 0.04])}, gap * k * 0.85);
        col *= 1.0 + 0.12 * (lkn(vec3(u * 300.0, v * 40.0, 3.0)) - 0.5) * k;
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.62 - 0.12 * cane * k + 0.3 * gap, 0.35, 1.0);`,
    });
  }

  /* the bird of paradise's leaves: a deep blue green, each leaf its own shade (older ones darker and greyer, young ones
     fresher), paler toward the midrib and the base, a yellow-green midrib, and the side veins as ribs: the blade between two
     veins is a shallow trough, so it catches the light in fine lines. Satin, not glossy, paler and matte on the back. And
     the splits a Strelitzia's leaves always have: slits along a few side veins, in from the edge. (The night of 15 Oct,
     Sam: "make the plant a little bit more convincing on the texture. It feels like plastic". It was one flat green,
     smooth, with faint veins and a sheen.) From the leaf's own uv (x across 0 to 1, y along it). */
  const STREL = `
    float stVein(vec2 lv, out float ax, out float vv) { ax = abs(lv.x * 2.0 - 1.0); vv = lv.y * 70.0 - ax * 16.0; return fract(vv); }`;
  // (the second version, the night of 15 to 16 Oct, Sam: "this part still feels weak": no tears, which read as white specks; a
  // pale green midrib, not yellow; the side veins finer and stronger; light through the leaf from behind, see house-looks.js)
  function strelLeaf(orig) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.45, side: THREE.DoubleSide, sheen: 0.35, sheenRoughness: 0.5, sheenColor: new THREE.Color(0.1, 0.14, 0.08) }), 'strelLeaf3', {
      head: STREL,
      surface: `
        vec2 lv = vLkUv; float ax, vv; float vf = stVein(lv, ax, vv);
        float mid = 1.0 - smoothstep(0.018, 0.045 + fwidth(ax) * 1.5, ax);
        float vk = 1.0 - smoothstep(0.25, 0.55, fwidth(vv));
        float rib = mix(0.5, 0.5 - 0.5 * cos(vf * 6.2832), vk);              // 0 on a vein, 1 in the trough between
        float leaf = lkn(vec3(vDrawW * 1.4)), patchy = lkn(vec3(vDrawW * 7.0)), streak = lkn(vec3(lv.x * 6.0, lv.y * 40.0, 3.0));
        vec3 dark = mix(${v3([0.018, 0.048, 0.026])}, ${v3([0.03, 0.07, 0.03])}, leaf);
        vec3 fresh = mix(${v3([0.045, 0.1, 0.035])}, ${v3([0.07, 0.13, 0.04])}, leaf);
        vec3 col = mix(dark, fresh, clamp(0.25 + 0.5 * leaf + 0.35 * (1.0 - ax), 0.0, 1.0));
        col *= (0.9 + 0.2 * patchy) * (0.95 + 0.1 * streak) * (1.0 - 0.16 * rib * vk);
        col = mix(col, ${v3([0.1, 0.16, 0.07])}, mid * 0.85);                  // the midrib, a paler green
        col = mix(col, ${v3([0.09, 0.08, 0.04])}, smoothstep(0.95, 1.0, ax) * 0.4);   // the margin, a hair dry
        if (!gl_FrontFacing) col = col * 1.25 + ${v3([0.012, 0.02, 0.008])};
        diffuseColor.rgb *= col * 1.5;
        float hv = 0.0016 * (1.0 - rib) * vk + 0.0015 * mid;
        ${SLOPE('hv')}
        roughnessFactor = gl_FrontFacing ? 0.38 + 0.16 * rib + 0.08 * patchy : 0.72;`,
    });
  }

  /* the bedroom's fiddle-leaf fig (16 Oct, Sam: "make sure the plant is well detailed. Right now it feels plastic"). From the
     blade's own uv (x across 0 to 1, y along it). A deep glossy green, a broad pale midrib that thins to the end, nine pairs of
     pale side veins that leave it on a slant and bend toward the end, fading before the margin, the blade quilted between them
     and netted with fine veins, its colour uneven. The underside paler and matte. */
  function figLeaf(orig) {
    return code(phys({ envMapIntensity: 0.7, roughness: 0.35, side: THREE.DoubleSide }), 'figLeaf', {
      surface: `
        vec2 lv = vLkUv; float ax = abs(lv.x * 2.0 - 1.0), t = lv.y;
        float mw = mix(0.05, 0.01, t);
        float mid = 1.0 - smoothstep(mw * 0.55, mw + fwidth(ax) * 1.5, ax);
        float vv = (t - 0.17 * pow(ax, 0.8) - 0.03) * 10.0, fv = fract(vv), dv = min(fv, 1.0 - fv), aw = fwidth(vv);
        float lw = 0.035 * (1.0 - 0.6 * ax);
        float lat = (1.0 - smoothstep(lw, lw + aw * 1.2, dv)) * smoothstep(0.03, 0.09, t) * (1.0 - smoothstep(0.8, 0.96, ax)) * (1.0 - smoothstep(0.3, 0.6, aw));
        float quilt = sin(3.1416 * fv) * smoothstep(0.04, 0.25, ax) * (1.0 - smoothstep(0.85, 1.0, ax));
        float net = lkn(vec3(lv.x * 34.0, lv.y * 52.0, 1.0)), fine = (1.0 - smoothstep(0.03, 0.08, abs(net - 0.5))) * (1.0 - smoothstep(0.3, 0.7, fwidth(lv.y * 52.0)));
        float tone = lkn(vec3(vDrawW * 3.0)), patchy = lkn(vec3(vDrawW * 13.0 + 2.0));
        vec3 col = mix(${v3([0.02, 0.055, 0.02])}, ${v3([0.04, 0.085, 0.03])}, tone);
        col *= (0.86 + 0.22 * patchy) * (0.9 + 0.14 * quilt);
        col = mix(col, col * 0.7, fine * 0.45);
        col = mix(col, ${v3([0.075, 0.13, 0.045])}, lat * 0.55);
        col = mix(col, ${v3([0.12, 0.17, 0.065])}, mid * 0.8);
        col = mix(col, ${v3([0.07, 0.065, 0.03])}, smoothstep(0.95, 1.0, ax) * 0.45);    // the margin, a hair darker
        if (!gl_FrontFacing) col = col * 1.55 + ${v3([0.02, 0.03, 0.012])};
        diffuseColor.rgb *= col * 1.4;
        float hv = 0.0011 * quilt - 0.0006 * lat - 0.0008 * mid - 0.00015 * fine;
        if (!gl_FrontFacing) hv = -hv;
        ${SLOPE('hv')}
        roughnessFactor = gl_FrontFacing ? 0.26 + 0.1 * (1.0 - quilt) + 0.08 * patchy + 0.1 * lat : 0.72;`,
    });
  }

  /* its pot: an unglazed terracotta in 22 round reeds under a chalky lime wash, worn thin on the reeds' crests and thick in
     the grooves between them, a fine grain, darker toward the foot. (The pot stands at plan 50.12, 40.04.) */
  function figPot(orig) {
    return code(phys({ envMapIntensity: 0.5, roughness: 0.85 }), 'figPot', {
      surface: `
        vec3 p = vDrawW; vec2 dq = p.xz - vec2(20.12, 16.04);
        float reed = pow(abs(cos(atan(dq.y, dq.x) * 11.0)), 0.6), groove = 1.0 - smoothstep(0.0, 0.45, reed);
        float grain = lkn(p * 140.0), cloud = lkn(p * 5.0), wash = lkn(vec3(p.x * 10.0, p.y * 3.0, p.z * 10.0));
        float foot = 1.0 - smoothstep(0.0, 0.12, p.y);
        vec3 col = mix(${v3([0.27, 0.15, 0.1])}, ${v3([0.36, 0.21, 0.14])}, cloud);
        col = mix(col, ${v3([0.52, 0.45, 0.39])}, clamp(smoothstep(0.3, 0.75, wash) * 0.6 + 0.35 * groove, 0.0, 0.85));
        col *= (0.9 + 0.2 * grain * lkKeep(0.002, lkPx)) * (1.0 - 0.22 * foot);
        diffuseColor.rgb *= col;
        float h = 0.00015 * grain * lkKeep(0.002, lkPx);
        ${SLOPE('h')}
        roughnessFactor = 0.8 + 0.12 * grain;`,
    });
  }

  /* joinery veneer (iteration 8): the kitchen's tall cabinets and the island's base. Sam, 15 Oct: "make a better texture for
     this cabinet, more polished and more like matte". Rift sawn oak veneer under a matte lacquer: a fine straight grain up
     each door (along the top's length on a top), each door its own leaf of the log and its own shade, long soft streaks,
     pores as hairlines, a soft even sheen. No boards: the doors' reveals are the black lines between them. */
  function veneer(orig, key, base) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.62 }), key, {
      surface: `
        vec2 q; vec3 ta, tb; lkPlane(vDrawW, lkWN, q, ta, tb);
        vec2 g = abs(lkWN.y) < 0.7 ? q : q.yx;                               // (across the grain, along it)
        float lf = floor(g.x / 0.6), r1 = lkH2(vec2(lf, 3.0)), r2 = lkH2(vec2(lf, 8.0));
        float ac = g.x + r1 * 9.0, al = g.y, px = max(fwidth(ac) * 0.7, 1e-5);
        float wan = 0.002 * (lkn(vec3(al * 0.3, lf, 1.0)) - 0.5);
        float gl = (ac + wan) / (0.0022 + 0.0014 * r2);
        gl += 0.7 * (lkn(vec3(gl * 0.3, lf, 3.0)) - 0.5);
        float line = mix(0.25, (1.0 - smoothstep(0.0, 0.25, fract(gl))) * (0.4 + 0.6 * lkH2(vec2(floor(gl), lf))), 1.0 - smoothstep(0.25, 0.6, fwidth(gl)));
        float fib = (lkn(vec3(ac * 700.0, al * 5.0, lf)) - 0.5) * lkKeep(0.0014, px) + 0.6 * (lkn(vec3(ac * 180.0, al * 1.5, lf + 1.0)) - 0.5) * lkKeep(0.005, px);
        float streak = lkn(vec3(ac * 14.0, al * 0.25, lf + 2.0));
        float pore = smoothstep(0.82, 0.93, lkn(vec3(ac * 1200.0, al * 30.0, lf + 4.0))) * lkKeep(0.0009, px);
        float h0 = 0.00004 * fib - 0.00003 * pore;
        ${SLOPE('h0')}
        lkG *= lkFlat(lkWN);
        vec3 col = ${v3(base)} * (0.94 + 0.12 * r2) * (1.0 - 0.12 * line) * (1.0 + 0.18 * fib) * (0.9 + 0.2 * streak) * (1.0 - 0.3 * pore);
        diffuseColor.rgb *= col;
        roughnessFactor = clamp(0.6 + 0.05 * fib + 0.08 * pore, 0.45, 0.85);`,
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

  /* the entrance's vessels: a glossy cream glaze over speckled stoneware (the night of 15 Oct, Sam: "more polishing texture
     to the vase... more shiny, like a real vase, premium"). A clear coat for the glaze's gloss, the cream a little warmer
     and greyer where the glaze ran thick, iron specks in the clay showing through it, and the foot left unglazed. */
  function glaze(orig) {
    return code(phys({ envMapIntensity: 0.9, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.06 }), 'glaze', {
      surface: `
        vec3 p = vDrawW;
        float pool = lkn(vec3(p.x * 6.0, p.y * 2.2, p.z * 6.0)), run = lkn(vec3(p.x * 14.0, p.y * 1.2, p.z * 14.0));
        float speck = smoothstep(0.86, 0.94, lkn(p * 210.0)) * lkKeep(0.003, lkPx);
        float foot = 1.0 - smoothstep(0.03, 0.045, p.y);
        vec3 col = mix(${v3([0.74, 0.7, 0.62])}, ${v3([0.66, 0.61, 0.53])}, smoothstep(0.45, 0.8, pool) * 0.6 + smoothstep(0.6, 0.9, run) * 0.3);
        col = mix(col, ${v3([0.25, 0.17, 0.11])}, speck * 0.55);
        col = mix(col, ${v3([0.52, 0.45, 0.37])}, foot);
        diffuseColor.rgb *= col;
        roughnessFactor = mix(0.28 + 0.06 * pool, 0.85, foot);`,
    });
  }

  /* the patio olive's bed (the night of 15 Oct, Sam: "for the thing inside, the rocks, dirt, just try to make it more
     convincing and natural. Right now it feels just some rocks on it and green stuff. And just add more texture"). A
     carpet of creeping thyme: tiny leaves in low mounds, dark in the gaps between them, drier straw-tinted patches, lilac
     flowers here and there. Round the trunk a collar of dark earth with grit, chips of bark mulch and a few fallen olive
     leaves, its edge ragged into the thyme. Relief from all of it. (One green with a sparkle until then.) */
  function groundcover(orig) {
    return code(phys({ envMapIntensity: 0.3, roughness: 0.85 }), 'groundcover', {
      surface: `
        vec3 p = vDrawW;
        vec4 mound = lkFbm(p, 3.0, 0.55, 3, lkPx) + 0.6 * lkFbm(p + 7.0, 9.0, 0.5, 3, lkPx);
        float lk1 = lkKeep(0.006, lkPx), lk2 = lkKeep(0.0026, lkPx);
        float leaf = lkn(p * 160.0), leaf2 = lkn(p * 380.0 + 3.0);
        float gap = (1.0 - smoothstep(0.3, 0.6, leaf)) * lk1;
        float flower = smoothstep(0.84, 0.9, lkn(p * 60.0)) * smoothstep(0.5, 0.7, lkn(p * 4.0 + 9.0)) * lkKeep(0.008, lkPx);
        float dry = smoothstep(0.55, 0.8, lkn(p * 1.5 + 4.0));
        vec3 green = mix(${v3([0.03, 0.055, 0.02])}, ${v3([0.09, 0.13, 0.05])}, clamp(0.5 + mound.x * 1.6, 0.0, 1.0));
        green = mix(green, ${v3([0.13, 0.12, 0.06])}, dry * 0.35);
        green *= (1.0 - 0.45 * gap) * (1.0 + 0.3 * (leaf2 - 0.5) * lk2);
        green = mix(green, ${v3([0.3, 0.2, 0.34])}, flower * 0.6);
        float dT = length(p.xz - vec2(0.0, -6.0));                           // the patio olive's trunk (plan 30, 18)
        float soilK = 1.0 - smoothstep(0.62, 1.2, dT + (lkn(p * 3.0) - 0.5) * 0.55 + (lkn(p * 14.0) - 0.5) * 0.25);
        float chip = smoothstep(0.62, 0.75, lkn(vec3(p.x * 40.0 + p.z * 15.0, p.y * 4.0, p.z * 12.0 - p.x * 9.0))) * lkKeep(0.006, lkPx);
        float grit = smoothstep(0.78, 0.92, lkn(p * 130.0)) * lkKeep(0.003, lkPx);
        float fallen = smoothstep(0.86, 0.92, lkn(vec3(p.x * 70.0 + p.z * 20.0, 1.0, p.z * 22.0 - p.x * 6.0))) * lkKeep(0.006, lkPx);
        vec3 earth = ${v3([0.05, 0.037, 0.027])} * (0.75 + 0.5 * lkn(p * 40.0));
        earth = mix(earth, ${v3([0.16, 0.1, 0.06])}, chip * 0.7);
        earth = mix(earth, ${v3([0.2, 0.19, 0.17])}, grit * 0.6);
        earth = mix(earth, ${v3([0.1, 0.12, 0.08])}, fallen * 0.6);
        vec3 col = mix(green, earth, soilK);
        float h = (0.012 * mound.x - 0.002 * gap) * (1.0 - soilK) + (0.002 * chip + 0.0008 * grit) * soilK;
        ${SLOPE('h')}
        diffuseColor.rgb *= col;
        roughnessFactor = mix(0.8 + 0.1 * gap, 0.92, soilK);`,
    });
  }

  /* the master bedroom's rug (the night of 15 to 16 Oct, Sam: "the carpet as well, lacking a little bit of texture"). A
     hand-knotted wool pile: tufts of a few millimetres, each a soft dome lighter at its tip and dark between; abrash, the
     soft bands of tone that hand-dyed wool lays across a rug; and in the field a tone-on-tone lattice carved a few
     millimetres into the pile, so it shows as shade and not as colour. lat: the lattice on (the field) or off (the border). */
  function rugPile(orig, key, base, lat) {
    return code(phys({ envMapIntensity: 0.3, roughness: 0.92, sheen: 1, sheenRoughness: 0.6, sheenColor: new THREE.Color(base[0] * 0.7, base[1] * 0.7, base[2] * 0.7) }), key, {
      surface: `
        vec2 q = vDrawW.xz;
        float k1 = lkKeep(0.0035, lkPx), k2 = lkKeep(0.012, lkPx);
        float tuft = mix(0.5, lkn(vec3(q * 260.0, 1.0)), k1), tuft2 = mix(0.5, lkn(vec3(q * 600.0, 2.0)), lkKeep(0.0015, lkPx));
        float abr = lkn(vec3(q.x * 0.5, q.y * 5.0, 3.0)) * 0.7 + lkn(vec3(q * 1.6, 4.0)) * 0.3;
        ${lat ? `vec2 dl = vec2(q.x + q.y, q.x - q.y) / 0.42;
        vec2 fl = abs(fract(dl) - 0.5);
        float line = (1.0 - smoothstep(0.02, 0.05 + fwidth(dl.x) * 1.5, min(fl.x, fl.y))) * k2;` : 'float line = 0.0;'}
        float h = (0.0016 * (tuft - 0.5) + 0.0006 * (tuft2 - 0.5)) - 0.003 * line;
        ${SLOPE('h')}
        vec3 col = ${v3(base)} * (0.9 + 0.16 * abr) * (0.82 + 0.3 * tuft) * (0.94 + 0.1 * tuft2) * (1.0 - 0.22 * line);
        diffuseColor.rgb *= col;
        roughnessFactor = 0.9 + 0.06 * tuft;`,
    });
  }

  /* the dressing room (16 Oct, Sam: "everything feels blocky... spend those extra detail to try to create real object,
     clothing, shoes"). A knit for the folded sweaters: stockinette, columns of V stitches 4 mm apart (wales), rows 3 mm,
     each stitch a yarn of its own tone (heather), a soft halo of fibre. On a folded sweater the wales run front to back
     over the top and down over the fold, as the pattern's plane turns with the face. */
  function knit(orig, key, base) {
    return code(phys({ envMapIntensity: 0.3, roughness: 0.93, sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color(base[0] * 0.75 + 0.02, base[1] * 0.75 + 0.02, base[2] * 0.75 + 0.02) }), key, {
      surface: `
        vec2 q; vec3 ta, tb; lkPlane(lkP, lkWN, q, ta, tb);
        vec2 st = vec2(q.x / 0.004, q.y / 0.003);
        float wi = floor(st.x), fx = fract(st.x) - 0.5;
        float rw = st.y - abs(fx) * 1.1, ri = floor(rw), fy = fract(rw);
        float k1 = lkKeep(0.004, lkPx);
        float loop = mix(0.5, (1.0 - pow(abs(fx) * 2.0, 2.0)) * smoothstep(0.0, 0.35, fy) * (1.0 - smoothstep(0.65, 1.0, fy)), k1);
        float yarn = mix(0.5, lkH2(vec2(wi, ri)), k1);
        float fuzz = lkFbm(vec3(q, 3.0), 60.0, 0.6, 3, lkPx).x;
        float h = 0.0005 * loop + 0.00015 * fuzz;
        ${SLOPE('h')}
        lkG *= lkFlat(lkWN) * 0.5 + 0.5;
        vec3 col = ${v3(base)} * (0.82 + 0.3 * loop) * (0.92 + 0.16 * yarn) * (1.0 + 0.05 * lkn(vec3(q * 3.0, 5.0)));
        diffuseColor.rgb *= col;
        roughnessFactor = 0.9 + 0.06 * (1.0 - loop);`,
    });
  }

  /* the dressing room's runner: a flat-woven wool, darker than the oak so it reads against it (Sam, 16 Oct: "a lot more
     texture, maybe darker, so it has a nice contrast"). Weft ribs across it 3.5 mm apart, each rib two yarns of a
     charcoal brown twisted together, heathered; the faint bands of dye lots along it; a taupe pinstripe in from each long
     edge, and the edges bound in a darker tape. Plan y from y0 to y1, along plan x. */
  function runnerWeave(orig, key, base, y0, y1) {
    const A0 = W(0, y0)[2], A1 = W(0, y1)[2];
    return code(phys({ envMapIntensity: 0.25, roughness: 0.94, sheen: 1, sheenRoughness: 0.6, sheenColor: new THREE.Color(0.06, 0.055, 0.05) }), key, {
      surface: `
        vec2 q = vDrawW.xz;
        float k1 = lkKeep(0.0035, lkPx), k2 = lkKeep(0.0012, lkPx);
        float rb = q.x / 0.0035, ri = floor(rb), rf = fract(rb);
        float rib = mix(0.64, sin(3.1416 * rf), k1);
        float tw = mix(0.5, fract(rf * 2.0 + q.y / 0.004), k2);
        float yarn = mix(0.5, lkH2(vec2(ri, floor(q.y / 0.016))), k1);
        float abr = lkn(vec3(q.x * 0.7, q.y * 0.2, 3.0));
        float e = min(q.y - ${f(A0)}, ${f(A1)} - q.y);
        float tape = 1.0 - smoothstep(0.016, 0.019, e);
        float pin = smoothstep(0.055, 0.058, e) * (1.0 - smoothstep(0.063, 0.066, e));
        float h = 0.0008 * rib + 0.00015 * tw - 0.0006 * tape * (1.0 - smoothstep(0.0, 0.004, e));
        ${SLOPE('h')}
        vec3 col = ${v3(base)} * (0.72 + 0.36 * rib) * (0.86 + 0.28 * yarn) * (0.94 + 0.08 * tw) * (0.92 + 0.16 * abr);
        col = mix(col, ${v3([0.32, 0.29, 0.25])} * (0.8 + 0.3 * rib), pin);
        col = mix(col, ${v3(base)} * 0.6 * (0.85 + 0.2 * yarn), tape);
        diffuseColor.rgb *= col;
        roughnessFactor = 0.93 - 0.05 * rib;`,
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

  /* velvet: the headboard and the bed's base, and a lumbar (16 Oct, Sam: "try to have a color that is a little bit more
     premium"). A short dense pile that lights up at a grazing angle and darkens where it is pressed, with the faint crush
     marks of a pile brushed different ways. */
  function velvet(orig, key, base) {
    return code(phys({ envMapIntensity: 0.35, roughness: 0.9, sheen: 1, sheenRoughness: 0.32, sheenColor: new THREE.Color(base[0] * 1.6 + 0.04, base[1] * 1.6 + 0.04, base[2] * 1.6 + 0.04) }), key, {
      surface: `
        vec3 p = lkP;
        float crush = lkn(p * vec3(3.0, 9.0, 3.0)) * 0.6 + lkn(p * 11.0 + 2.0) * 0.4;
        float pile = mix(0.5, lkn(p * 900.0), lkKeep(0.0012, lkPx));
        float h = 0.00004 * pile + 0.0003 * crush;
        ${SLOPE('h')}
        diffuseColor.rgb *= ${v3(base)} * (0.88 + 0.22 * crush) * (0.96 + 0.08 * pile);
        roughnessFactor = 0.86 + 0.08 * crush;`,
    });
  }

  /* the patio pool's water (16 Oct, Sam: "add some movement to the pool, the water feels flat"). Three sets of small waves
     drifting different ways tilt the surface, so the sky and the house move in it; under them, a net of light from the
     pool's floor wavers slowly. The fine waves fade out with distance, so nothing twinkles. uTimeW is the page's clock. */
  function poolWater(orig) {
    return code(phys({ roughness: 0.04, metalness: 0, envMapIntensity: 1.0, clearcoat: 1, clearcoatRoughness: 0.03 }), 'poolWater', {
      head: 'uniform float uTimeW;',
      surface: `
        float t = uTimeW; vec2 q = vDrawW.xz;
        float w1 = lkn(vec3(q * 1.2 + vec2(t * 0.11, t * 0.07), t * 0.05));
        float w2 = lkn(vec3(q * 2.9 - vec2(t * 0.16, -t * 0.12), 4.0 + t * 0.08));
        float w3 = lkn(vec3(q * 7.0 + vec2(-t * 0.24, t * 0.2), 9.0 + t * 0.1)) * lkKeep(0.14, lkPx);
        float h = 0.007 * w1 + 0.0035 * w2 + 0.0012 * w3;
        ${SLOPE('h')}
        float c = 1.0 - abs(2.0 * lkn(vec3(q * 2.3 + 0.5 * vec2(w1, w2), t * 0.13)) - 1.0);
        c = pow(c, 7.0) * lkKeep(0.25, lkPx);
        diffuseColor.rgb = ${v3([0.02, 0.07, 0.085])} * (0.85 + 0.3 * w1) + ${v3([0.035, 0.08, 0.085])} * c;
        roughnessFactor = 0.035;`,
    });
  }

  const WHITE_WALL = (m) => limewash(m, [0.6, 0.585, 0.55], 'limewashE', 0.00004, 0.5);
  // (and a roof light's well, the roof slab's edge round the hole, lit like the ceiling it belongs to: with the sky's light
  // only, its sides went grey beside the white ceiling. Sam, 15 Oct: "make sure that the sides of the cut hole window have the
  // same color as our walls". Any upright face of the slab takes twice the bounce.)
  const WHITE_CEILING = (m) => overlay(plaster(m, true, [1.3, 1.29, 1.26], 'ceilingW'), { key: 'well', end: `
      { vec3 lkWNe = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
        reflectedLight.indirectDiffuse *= 1.0 + 1.0 * (1.0 - smoothstep(0.3, 0.6, abs(lkWNe.y))); }` });
  const BUILD_CODE = {
    // Every plain wall and every ceiling in the house in the entrance's colours since iteration 8 (Sam, 15 Oct: "all the walls
    // in the whole house uses the same color from the front wall in the entrance... the same color for the ceiling from the
    // entrance, and apply it everywhere when we see a ceiling"). The walls a white limewash (limewashEntry's), the ceilings
    // a plain white (roofWhite's), each under the one key its colour has. Lime plaster walls and a warmer ceiling until then;
    // the gallery's walls a grey limewash. Feature walls keep theirs (board concrete, charred larch, the fireplace's brick).
    oak: oak, plaster: (m) => WHITE_WALL(m), roof: (m) => WHITE_CEILING(m), concretePlain: boardConcrete,
    // the living room's fireplace breast, iteration 8
    brick: (m) => brickWall(m, 'brickFire', [0.1, 0.096, 0.09]), rattan: rattan, strelLeaf: strelLeaf, figLeaf: figLeaf, figPot: figPot,
    cabinet: (m) => veneer(m, 'veneerOak', [0.3, 0.2, 0.13]), chairWood: smokedOak, stoneware: glaze, logSplit: logSplit, moss: groundcover,
    // the master bedroom, the night of 15 to 16 Oct
    mocha: (m) => linen(m, 'mocha', [0.2, 0.155, 0.12], 0.4, 0.3), mushroom: (m) => velvet(m, 'velvetStone', [0.36, 0.33, 0.29]), oliveVelvet: (m) => velvet(m, 'velvetOlive', [0.1, 0.115, 0.06]),   // (a mushroom bouclé until 16 Oct: under the lamps it read caramel) oat: (m) => linen(m, 'oat', [0.6, 0.55, 0.46], 0.45, 0.3),
    cotton: (m) => linen(m, 'cotton', [0.93, 0.92, 0.89], 0.3, 0.15), duvet: (m) => linen(m, 'duvet', [0.86, 0.84, 0.79], 0.35, 0.3),
    poolWater: poolWater,
    // the gallery's bronzes, 16 Oct
    sculptBronze: (m) => castBronze(m, 'sculptBronze', [0.78, 0.55, 0.28], [0.22, 0.17, 0.1], 0.9), sculptDark: (m) => castBronze(m, 'sculptDark', [0.32, 0.22, 0.14], [0.09, 0.085, 0.065], 0.5),
    // the dressing room, 16 Oct
    wardrobe: (m) => veneer(m, 'veneerWal', [0.2, 0.12, 0.075]), runner: (m) => runnerWeave(m, 'runner', [0.105, 0.092, 0.08], 33.05, 33.95),
    knitCamel: (m) => knit(m, 'knitCamel', [0.43, 0.31, 0.2]), knitIvory: (m) => knit(m, 'knitIvory', [0.78, 0.75, 0.68]),
    knitGrey: (m) => knit(m, 'knitGrey', [0.33, 0.32, 0.31]), knitNavy: (m) => knit(m, 'knitNavy', [0.06, 0.075, 0.11]),
    coatCamel: (m) => woolWeave(m, 'coatCamel', [0.44, 0.31, 0.19]), suitNavy: (m) => woolWeave(m, 'suitNavy', [0.05, 0.062, 0.095]),
    suitCharcoal: (m) => woolWeave(m, 'suitCharcoal', [0.12, 0.118, 0.115]), shirtBlue: (m) => linen(m, 'shirtBlue', [0.56, 0.63, 0.72], 0.4, 0.35),
    leatherBlk: (m) => leather(m, 'leatherBlk', [0.03, 0.026, 0.023]),
    rugPile: (m) => rugPile(m, 'rugPile', [0.36, 0.31, 0.255], true), rugPileB: (m) => rugPile(m, 'rugPileB', [0.62, 0.58, 0.51], false),
    // the front of the house, iteration 8
    pathSlab: juraPath, rock: (m) => rock(m, [0.3, 0.285, 0.255]),
    concreteFair: (m) => fairFaced(m, 'concreteFair', [0.2, 0.196, 0.188]),
    // the entrance's ceiling: a plain, neutral white (Sam, 15 Oct: "keep something more traditional, like a white roof")
    roofWhite: (m) => WHITE_CEILING(m),
    sofaWool: boucle, rugDark: rug, leather: leather, walnut: walnut, travBlock: travertine, barkIn: bark, leafCard: leaf,
    logBark: logBark, logEnd: logEnd,
    trav: travTiles, travP: (m) => travTiles(m, 'travTilesSq', TRAVTF(0.8, 0.8, 0, -9.0, -16.0), 1), concreteIn: concreteIn, oakDoor: oakDoor, oakConsole: oakConsole, oakLeaf: oakLeaf,
    concrete: (m) => boardWall(m, 'concrete', [0.235, 0.226, 0.21], true),
    conc: (m) => plainConcrete(m, 'conc', [0.092, 0.089, 0.081]), concFloor: (m) => plainConcrete(m, 'concFloor', [0.19, 0.178, 0.159]),
    limewash: (m) => WHITE_WALL(m), drystone: (m) => drystone(m, [0.195, 0.154, 0.105]),
    // (Sam, 15 Oct, after a warm taupe and then a deep charcoal: "not the color wall, but a tint of white, maybe just slightly
    // darker than the roof". The limewash's texture stays, he liked it)
    // (its trowel relief a third: on a pale wall the strokes' arcs showed as rings where the light grazes)
    // (and its clouds and strokes at half: the strokes turn patch by patch, and on a pale wall they drew rings)
    limewashEntry: (m) => WHITE_WALL(m), marbleDark: slabs,
    larch: (m) => descan(m, 'larch', [0.003, 0.003, 0.004]),
    lawn: (m) => descan(m, 'lawn', [0.187, 0.228, 0.1], GRASS), land: (m) => descan(m, 'land', [0.092, 0.103, 0.053], GRASS),
    gravel: (m) => gravel(m, 'gravel', [0.411, 0.38, 0.313], 0.5), gravelCourt: (m) => courtGravel(m, 'gravelCourt2', [0.139, 0.143, 0.151]),
    // (a warm grey since the night of 15 Oct: darker, with the lichen pale on it, the patio's olive read as camouflage)
    bark: (m) => bark(m, 'barkOut', [0.62, 0.58, 0.52], null), barkFar: (m) => bark(m, 'barkFar', [1, 1, 1], null, 'ext'),
    walnutFine: (m) => walnut(m),
    boucle: (m) => boucle(m, [0.676, 0.622, 0.532], 'boucleW'),
    wool: (m) => woolWeave(m, 'wool', [0.603, 0.549, 0.46]), rugTaupe: (m) => woolWeave(m, 'rugTaupe', [0.411, 0.36, 0.299]), taupe: (m) => woolWeave(m, 'taupe', [0.357, 0.302, 0.244]),
    oakFin: (m) => finWood(m, 'finWood', [0.33, 0.19, 0.12]), oakBench: (m) => oakSolid(m, 'oakBench', 'x', [0.39, 0.214, 0.142]),
    linenW: (m) => linen(m, 'linenW', [0.915, 0.884, 0.828], 0.45), rust: (m) => linen(m, 'rust', [0.517, 0.207, 0.135], 0.5),
    sage: (m) => linen(m, 'sage', [0.398, 0.43, 0.342], 0.5), ochre: (m) => linen(m, 'ochre', [0.677, 0.47, 0.223], 0.5),
    charcoal: (m) => linen(m, 'charcoal', [0.239, 0.231, 0.223], 0.6), sheerLinen: (m) => linen(m, 'sheer', [0.975, 0.94, 0.88], 0.4),
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
