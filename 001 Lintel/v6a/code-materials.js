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
        vs = 'varying vec2 vLkUv; varying float vLkInst;\n' + vs.replace('#include <uv_vertex>', `#include <uv_vertex>
          vLkUv = uv;
          #ifdef USE_INSTANCING
            vLkInst = float(gl_InstanceID);
          #else
            vLkInst = 0.0;
          #endif`);
        fs = 'varying vec2 vLkUv; varying float vLkInst;\n' + fs.replace('void main() {', LIB + '\nvoid main() {');
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
  const D = (m, o) => A.drawable(m, 'none', Object.assign({ sat: 1, macro: 0 }, o || {}));
  const code = (m, key, o) => { const out = overlay(D(m, o && o.drawable), Object.assign({ key }, o)); out.userData.look = key; if (o && o.sprig) out.userData.sprig = true; return out; };

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
    float oakBoard(vec2 q, float px, float Wd, out vec4 a, out vec4 b) {
      float row = floor(q.y / Wd), v = fract(q.y / Wd);
      float L = 1.7 + 1.5 * lkH2(vec2(row, 1.7)), off = lkH2(vec2(row, 5.3)) * L;
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
      a = vec4(tone, pores, fleck, joint); b = vec4(r2, kn, quarter, st);
      // (cup and tilt ease back to nothing at the joint: two boards met in a step of up to a millimetre, and its slope lit
      // up as a dotted line along every joint at a grazing angle)
      float ease = smoothstep(0.0, max(0.006, px * 2.5), ej);
      return (0.00035 * pow(2.0 * y / Wd, 2.0)                              // cupped
        + (r2 - 0.5) * 0.0024 * (y / Wd) + (r3 - 0.5) * 0.0016 * (lx / L)) * ease   // tilted
        + 0.00009 * st - 0.0001 * pores - 0.0012 * bev * (0.0022 / bw) - 0.0003 * kn;
    }
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
    }`;
  function plaster(orig, ceiling) {
    const col = ceiling ? [1.24, 1.17, 1.09] : [0.647, 0.62, 0.577];
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.88 }), ceiling ? 'ceiling' : 'plaster', {
      head: PLASTER,
      surface: `
        vec2 q; vec3 ta, tb; lkPlane(lkP, lkWN, q, ta, tb);
        float lip;
        float h = trowel(q, ${ceiling ? '0.00006' : '0.00016'}, lip);
        lkG = lkSurfGrad(lkWN, dFdx(h), dFdy(h));
        vec4 sand = lkFbm(vec3(q * 1.0, 0.5), 700.0, 0.55, 3, lkPx);          // sand, a millimetre and under
        lkG += (ta * sand.y + tb * sand.z) * 0.00009;
        float cloud = lkFbm(vec3(q, 2.0), 1.3, 0.5, 3, lkPx).x;
        lkG *= lkFlat(lkWN);
        diffuseColor.rgb *= ${v3(col)} * (1.0 + 0.07 * cloud - ${ceiling ? '0.004' : '0.012'} * lip + 0.025 * sand.x);
        roughnessFactor = clamp(0.9 - ${ceiling ? '0.08' : '0.26'} * lip + 0.1 * sand.x, 0.5, 1.0);`,
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
      float fw = max(0.0009, px * 0.7);
      float run = smoothstep(0.35, 0.6, lkn(vec3(q.x * 6.0, row, 2.0)));
      float fin = (exp(-pow(ev / fw, 2.0)) * run + 0.5 * exp(-pow(eu / fw, 2.0))) * (0.0009 / fw);
      float gap = exp(-pow(ev / fw, 2.0)) * (1.0 - run) * (0.0009 / fw);
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
  function boucle(orig) {
    const base = [0.596, 0.536, 0.447];
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.93, sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color().setRGB(0.42, 0.38, 0.33) }), 'boucle', {
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
  function linen(orig, key, col, sheen) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.82, sheen: 1, sheenRoughness: 0.45,
      sheenColor: new THREE.Color().setRGB(col[0] * sheen + 0.03, col[1] * sheen + 0.03, col[2] * sheen + 0.03),
      emissive: orig.emissive ? orig.emissive.clone() : new THREE.Color(0) }), 'linen-' + key, {
      head: LINEN + SEAM,
      surface: `
        vec2 q; vec3 ta, tb; lkPlane(lkP, lkWN, q, ta, tb);
        float seed = ${f((key.length * 7.3) % 11)};
        float h0 = lnH(q, lkPxM, seed, lnA);
        ${SLOPE('h0')}
        float streak = (lnA.x - 0.5 * lkKeep(0.003, lkPx) * 2.0) * 0.07 + (lnA.y - 0.5 * lkKeep(0.009, lkPx) * 2.0) * 0.06;
        vec3 col = ${v3(col)} * (1.0 + streak) * (1.0 - 0.08 * (1.0 - lnA.z)) * (1.0 + 0.04 * lnA.w);
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
  function leather(orig) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.55, clearcoat: 0.32, clearcoatRoughness: 0.32 }), 'leather', {
      head: LEATHER,
      surface: `
        vec2 q; vec3 ta, tb; lkPlane(lkP, lkWN, q, ta, tb);
        float h0 = ltH(q, lkPxM, ltA);
        ${SLOPE('h0')}
        float curv = length(fwidth(lkWN)) / max(length(fwidth(vDrawW)), 1e-5);
        float edge = smoothstep(5.0, 12.0, curv);
        float mottle = lkFbm(vec3(q, 3.0), 3.0, 0.6, 5, lkPx).x;
        vec3 col = ${v3([0.193, 0.068, 0.018])} * (1.0 + 0.22 * mottle);
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
  const BARK = `
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
      // about the tree's own trunk, twisted a little as an olive's grain is
      p -= ${v3([10.55 - 15, 0, 15.75 - 12.5])};
      float tw = p.y * 0.5;
      vec3 r = vec3(p.x * cos(tw) - p.z * sin(tw), p.y, p.x * sin(tw) + p.z * cos(tw));
      r += 0.01 * vec3(lkn(r * 20.0), lkn(r * 20.0 + 5.2), lkn(r * 20.0 + 9.7));
      // plates 3 cm across and 12 cm long, split by cracks; a finer net of shallower cracks inside each plate
      float k1 = lkKeep(0.012, px), k2 = lkKeep(0.005, px);
      // (cells as long as they are wide read as crocodile skin, the reviewer's word: olive bark splits into long strips,
      // 3 cm across and 25 to 40 up, with cracks that open and close along their length)
      vec2 v1 = voro(r * vec3(32.0, 3.0, 32.0));
      float open = 0.08 + 0.14 * lkn(r * vec3(20.0, 2.0, 20.0) + 4.0);
      float crack = (1.0 - smoothstep(0.0, open, v1.y - v1.x)) * k1;
      float fine = 0.0;
      if (k2 > 0.0) { vec2 v2 = voro(r * vec3(85.0, 9.0, 85.0) + 3.1); fine = (1.0 - smoothstep(0.0, 0.1, v2.y - v2.x)) * k2 * (0.4 + 0.6 * lkn(r * 30.0)); }
      float plate = lkn(r * vec3(30.0, 8.0, 30.0) * 0.5 + 7.0);
      float scale = (lkn(r * vec3(160.0, 50.0, 160.0)) - 0.5) * lkKeep(0.003, px);
      float lichen = smoothstep(0.66, 0.8, lkn(p * 7.0 + 2.0)) * (1.0 - crack);
      a = vec4(crack, fine, plate, lichen);
      // each plate is domed a little (high in its middle), the cracks are deep
      return -0.006 * crack - 0.0015 * fine + 0.0025 * clamp(v1.y - v1.x, 0.0, 0.5) * k1 + 0.0004 * scale + 0.001 * plate;
    }`;
  function bark(orig) {
    return code(phys({ envMapIntensity: orig.envMapIntensity, roughness: 0.9 }), 'bark', {
      head: BARK,
      drawable: { noCap: true, noRing: true },
      surface: `
        float h0 = bkH(lkP, lkPx, bkA);
        ${SLOPE('h0')}
        vec3 col = mix(${v3([0.11, 0.1, 0.088])}, ${v3([0.2, 0.19, 0.17])}, bkA.z);                 // olive grey, not pine red
        col *= 1.0 - 0.3 * bkA.y;
        col = mix(col, ${v3([0.03, 0.025, 0.02])}, bkA.x * 0.85);
        col = mix(col, ${v3([0.26, 0.27, 0.22])}, bkA.w * 0.4);
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
      float aa = max(fwidth(best), 1e-5);
      o.x = 1.0 - smoothstep(-aa, aa, best);
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
        vec3 col = lfS.w < 0.0 ? ${v3([0.075, 0.055, 0.035])} : top ? ${v3([0.052, 0.082, 0.03])} : ${v3([0.16, 0.19, 0.14])};
        col = mix(col, col * 1.6 + vec3(0.01, 0.012, 0.0), rib * 0.5);
        col *= 0.88 + 0.24 * lkH2(vec2(lfS.w, vLkInst));
        diffuseColor.rgb *= col / ${v3([0.92, 1.22, 0.74])};                // (each card's own tint, greener indoors, multiplies this)
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
        vec3 col = mix(${v3([0.13, 0.115, 0.095])}, ${v3([0.3, 0.27, 0.23])}, plate) * (1.0 - 0.75 * fis) * (1.0 + 0.4 * flake);
        col = mix(col, ${v3([0.24, 0.25, 0.2])}, lich * 0.45);
        diffuseColor.rgb *= col;
        roughnessFactor = 0.95;`,
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

  const BUILD_CODE = {
    oak: oak, plaster: (m) => plaster(m, false), roof: (m) => plaster(m, true), concretePlain: boardConcrete,
    sofaWool: boucle, rugDark: rug, leather: leather, walnut: walnut, travBlock: travertine, barkIn: bark, leafCard: leaf,
    logBark: logBark, logEnd: logEnd,
    linenW: (m) => linen(m, 'linenW', [0.915, 0.884, 0.828], 0.45), rust: (m) => linen(m, 'rust', [0.517, 0.207, 0.135], 0.5),
    sage: (m) => linen(m, 'sage', [0.398, 0.43, 0.342], 0.5), ochre: (m) => linen(m, 'ochre', [0.677, 0.47, 0.223], 0.5),
    charcoal: (m) => linen(m, 'charcoal', [0.239, 0.231, 0.223], 0.6), sheerLinen: (m) => linen(m, 'sheer', [0.975, 0.94, 0.88], 0.4),
  };

  return {
    init(a) { A = a; THREE = a.THREE; },
    LIB, PREP, TILT, overlay, W, f, v3,
    has: (k) => !!BUILD_CODE[k],
    build: (k, orig) => BUILD_CODE[k](orig),
    get leafDepth() { return leafDepth; },
  };
})();
