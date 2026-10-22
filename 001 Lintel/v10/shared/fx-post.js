/* ==========================================================================
   fx-post.js
   Photographic finishing for the fake-3D concepts. What turns textured boxes
   into something that reads as a photograph:

     prepass   view normals + linear depth (skips anything tagged noPrepass)
     ao        screen-space ambient occlusion, the contact shadows real
               corners always have and plain renders never do
     bloom     soft highlights and red halation, like film
     finish    ACES tone curve, grade (lift/gain, warmth, saturation), a
               vintage print mode, subtle depth of field, chromatic fringe,
               vignette and grain. Optional ink edges + paper for drawings.

   Paper mode: materials can write alpha = 1 to say "this pixel is still a
   drawing". The finish then shows paper there, with rgb.r read as the amount
   of hatching ink, and draws edge lines on it.
   ========================================================================== */
window.FX = window.FX || {};
(function (FX) {
  'use strict';

  const VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

  const PRE_VS = `
    #include <common>
    #include <clipping_planes_pars_vertex>
    varying vec3 vN; varying float vZ;
    void main() {
      #include <beginnormal_vertex>
      #include <defaultnormal_vertex>
      #include <begin_vertex>
      #include <project_vertex>
      #include <clipping_planes_vertex>
      vN = normalize(transformedNormal);
      vZ = -mvPosition.z;
    }`;
  const PRE_FS = `
    #include <clipping_planes_pars_fragment>
    uniform float zBase;
    varying vec3 vN; varying float vZ;
    void main() {
      #include <clipping_planes_fragment>
      vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n; gl_FragColor = vec4(n * 0.5 + 0.5, 1.0 / (1.0 + max(vZ - zBase, 0.0))); }`;

  const AO_FS = `
    uniform sampler2D tPre; uniform vec2 res; uniform vec2 tanHalf; uniform float radius; uniform float bias; uniform float zBase;
    uniform vec3 kernel[16];
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    vec3 viewPos(vec2 uv, float z) { return vec3((uv * 2.0 - 1.0) * tanHalf * z, -z); }
    void main() {
      vec4 pre = texture2D(tPre, vUv);
      if (pre.w < 1e-5) { gl_FragColor = vec4(1.0); return; }
      float z = 1.0 / pre.w - 1.0 + zBase;
      vec3 n = normalize(pre.xyz * 2.0 - 1.0);
      vec3 p = viewPos(vUv, z);
      float a = hash(vUv * res) * 6.2831853;
      vec3 rv = vec3(cos(a), sin(a), 0.0);
      vec3 t = normalize(rv - n * dot(rv, n));
      vec3 b = cross(n, t);
      mat3 tbn = mat3(t, b, n);
      float rad = radius * (0.6 + 0.4 * clamp(z / 12.0, 0.0, 1.0));
      float occ = 0.0;
      for (int i = 0; i < 16; i++) {
        vec3 s = p + tbn * kernel[i] * rad;
        float sz = -s.z;
        vec2 suv = (s.xy / (sz * tanHalf)) * 0.5 + 0.5;
        if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) continue;
        float dw = texture2D(tPre, suv).w;
        float d = dw < 1e-5 ? 1e5 : 1.0 / dw - 1.0 + zBase;
        float range = smoothstep(0.0, 1.0, rad / abs(z - d));
        occ += (d < sz - bias ? 1.0 : 0.0) * range;
      }
      gl_FragColor = vec4(vec3(1.0 - occ / 16.0), 1.0);
    }`;

  const BLUR_FS = `
    uniform sampler2D tSrc; uniform vec2 dir;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tSrc, vUv) * 0.2270270270;
      c += (texture2D(tSrc, vUv + dir * 1.3846153846) + texture2D(tSrc, vUv - dir * 1.3846153846)) * 0.3162162162;
      c += (texture2D(tSrc, vUv + dir * 3.2307692308) + texture2D(tSrc, vUv - dir * 3.2307692308)) * 0.0702702703;
      gl_FragColor = c;
    }`;

  const BRIGHT_FS = `
    uniform sampler2D tSrc; uniform float threshold; uniform float exposure;
    varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tSrc, vUv).rgb * exposure;
      float a = texture2D(tSrc, vUv).a;
      float l = max(c.r, max(c.g, c.b));
      float k = smoothstep(threshold, threshold * 2.0 + 0.5, l);
      gl_FragColor = vec4(c * k * (1.0 - a), 1.0);
    }`;

  // Sun shafts: march each view ray through the sun's shadow map and count how
  // much of it is in sunlight. Every opening casts its own shaft, mullions and all.
  const SHAFT_FS = `
    #include <packing>
    uniform sampler2D tPre; uniform sampler2D tShadow; uniform mat4 shadowMat; uniform mat4 camWorld;
    uniform vec2 tanHalf; uniform float zBase; uniform float maxDist; uniform vec3 sunDir;
    varying vec2 vUv;
    float sunAt(vec3 w) {
      vec4 sc = shadowMat * vec4(w, 1.0); vec3 s = sc.xyz / sc.w;
      if (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0 || s.z > 1.0) return 1.0;
      return step(s.z - 0.0015, unpackRGBAToDepth(texture2D(tShadow, s.xy)));
    }
    void main() {
      vec4 pre = texture2D(tPre, vUv);
      float z = pre.w < 1e-5 ? maxDist : min(1.0 / pre.w - 1.0 + zBase, maxDist);
      vec2 f = mod(gl_FragCoord.xy, 4.0);
      float j = mod(f.x * 4.0 + f.y * 9.0 + f.x * f.y, 16.0) / 16.0;      // fixed dither, blurred away later
      float acc = 0.0;
      for (int i = 0; i < 24; i++) {
        float d = z * (float(i) + j) / 24.0;
        acc += sunAt((camWorld * vec4(vec3((vUv * 2.0 - 1.0) * tanHalf * d, -d), 1.0)).xyz);
      }
      vec3 rd = normalize(mat3(camWorld) * vec3((vUv * 2.0 - 1.0) * tanHalf, -1.0));
      float phase = 0.3 + 1.7 * pow(max(dot(rd, sunDir), 0.0), 6.0);   // brighter looking toward the sun
      gl_FragColor = vec4(acc / 24.0 * z * phase, 0.0, 0.0, 1.0);
    }`;

  const FINISH_FS = `
    uniform sampler2D tScene; uniform sampler2D tAO; uniform sampler2D tBloom; uniform sampler2D tBloom2; uniform sampler2D tPre;
    uniform vec2 res; uniform vec2 preTexel; uniform float time;
    uniform float exposure; uniform float contrast; uniform float saturation; uniform float warmth; uniform float tint;
    uniform vec3 lift; uniform vec3 gain;
    uniform float aoAmt; uniform float bloomAmt; uniform float halation;
    uniform float vignette; uniform float grain; uniform float chroma; uniform float fadeBlack; uniform vec3 fadeCol; uniform float grainPaper;
    uniform float vintage; uniform float print;
    uniform float dof; uniform float focus;
    uniform float paperOn; uniform vec3 paperCol; uniform vec3 inkCol; uniform float ink; uniform float inkReal; uniform float paperTex;
    uniform float inkTele; uniform float pixAng;
    uniform sampler2D tShaft; uniform float shafts; uniform float shaftAmp; uniform vec3 shaftCol;
    uniform sampler2D tSunDust; uniform sampler2D tSunDustB; uniform float sunDust;
    uniform float usePre;
    uniform float cardOn; uniform float cardScale; uniform float cardRot; uniform vec2 cardCenter; uniform float cardBorder;
    uniform float cardFlip; uniform float cardUnroll; uniform vec2 cardPtr; uniform vec3 tableCol; uniform vec3 cardPaper;
    varying vec2 vUv;

    float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
    vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
    float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
    uniform float zBase;
    float zOf(float w) { return w < 1e-5 ? 5000.0 : min(1.0 / w - 1.0 + zBase, 5000.0); }
    uniform float inkAA;
    // Opt in (inkAA, with a multisampled prepass, opts.preMsaa). The plain edge test below is all or nothing per
    // pixel, so a line can only move in whole pixels and every edge crawls while the camera moves. Here the line
    // keeps the place the edge really has inside the pixel. A multisampled prepass stores, in an edge pixel, the
    // mix of the two surfaces by coverage a. Across the three pixels round the edge the first difference of that
    // is (1 - a, 1, a) times the step, so dividing by the step leaves a two pixel line whose weight slides with a.
    // Normals take it as it is. Depth first loses the slope of the surface it lies on (the smaller of the two
    // slopes just outside), so a floor seen at a grazing angle stays clean.
    float edgeAxis(vec2 uv, vec2 d, float z0) {
      vec4 a1 = texture2D(tPre, uv + d), b1 = texture2D(tPre, uv - d), a2 = texture2D(tPre, uv + 2.0 * d), b2 = texture2D(tPre, uv - 2.0 * d);
      float dn = length(a1.xyz - b1.xyz), rn = max(length(a2.xyz - b2.xyz), dn);
      float en = dn / max(rn, 1e-4) * smoothstep(0.35, 0.75, rn);
      float so = a2.w - a1.w, si = b1.w - b2.w, m = abs(so) < abs(si) ? so : si;
      float dw = abs((a1.w - b1.w) - 2.0 * m), rw = max(abs((a2.w - b2.w) - 4.0 * m), dw);
      // whether the step is worth a line is judged in metres, as in the plain test
      float za1 = zOf(a1.w), zb1 = zOf(b1.w), za2 = zOf(a2.w), zb2 = zOf(b2.w);
      float zo = za2 - za1, zi = zb1 - zb2, mz = abs(zo) < abs(zi) ? zo : zi;
      float rz = max(abs((za2 - zb2) - 4.0 * mz), abs((za1 - zb1) - 2.0 * mz));
      // (a narrower band than the plain test: with coverage in the samples a wide band left small things half drawn)
      float g = smoothstep(0.006, 0.012, rz / max(z0, 0.5));
      if (inkTele > 0.0) g = max(g, inkTele * smoothstep(1.6, 2.6, rz / max(z0 * pixAng, 1e-5)));
      return max(en, dw / max(rw, 1e-12) * g);
    }

    vec3 sampleScene(vec2 uv) {
      vec3 c = texture2D(tScene, uv).rgb;
      if (chroma > 0.0) {
        vec2 d = (uv - 0.5) * chroma;
        c.r = texture2D(tScene, uv + d).r;
        c.b = texture2D(tScene, uv - d).b;
      }
      return c;
    }

    // a sun-faded 1960s colour print
    vec3 kodak(vec3 c) {
      c = pow(max(c, 0.0), vec3(0.95, 1.0, 1.1));
      float l = lum(c);
      c = mix(vec3(l), c, 0.82);
      c = mix(c, c * vec3(1.07, 1.0, 0.86), smoothstep(0.35, 0.95, l));
      c = mix(c, c * vec3(0.98, 1.0, 1.08), 1.0 - smoothstep(0.0, 0.35, l));
      c = c * 0.86 + vec3(0.07, 0.055, 0.04);
      c.g *= 0.985;
      return c;
    }

    vec3 deskSurface(vec2 uv) {
      vec2 asp = vec2(res.x / res.y, 1.0);
      vec2 px2 = uv * res;
      // Matte charcoal-slate architectural studio table (Forbo Desktop linoleum / honed basalt drafting surface, zero brown)
      float m1 = vnoise(px2 * 0.42);
      float m2 = vnoise(px2 * 0.11);
      float m3 = vnoise(uv * asp * 3.8);
      float pebble = (m1 - 0.5) * 0.045 + (m2 - 0.5) * 0.032 + (m3 - 0.5) * 0.04;
      vec3 baseDark = tableCol * 0.86;
      vec3 baseLight = tableCol * 1.16 + vec3(0.008, 0.010, 0.013);
      vec3 col = mix(baseDark, baseLight, clamp(0.5 + pebble * 3.2, 0.0, 1.0));
      // Swaying overhead architectural studio task lamp pool + warm secondary fill
      vec2 lampPos = vec2(0.57, 0.54) + cardPtr * vec2(0.055, 0.045);
      vec2 lampD = (uv - lampPos) * asp * vec2(0.72, 0.92);
      float lamp = exp(-dot(lampD, lampD) * 1.45);
      col *= 0.60 + 0.62 * lamp;
      col += vec3(0.024, 0.019, 0.014) * pow(lamp, 1.85);
      // Precision architectural cutting-mat 50mm grid hairlines and 10mm intersection micro-ticks
      vec2 gCoord = (uv - cardPtr * 0.0018) * asp * 11.0;
      vec2 gridP = abs(fract(gCoord) - 0.5);
      float majorLine = smoothstep(0.0065, 0.0, min(gridP.x, gridP.y));
      float crossTick = smoothstep(0.009, 0.0, min(gridP.x, gridP.y)) * step(max(gridP.x, gridP.y), 0.045);
      vec2 subP = abs(fract(gCoord * 5.0) - 0.5);
      float minorDot = smoothstep(0.025, 0.0, length(subP));
      float gridMask = (majorLine * 0.24 + crossTick * 0.36 + minorDot * 0.13) * (0.32 + 0.68 * lamp);
      col = mix(col, col + vec3(0.036, 0.038, 0.040), gridMask);
      return col;
    }

    void main() {
      vec2 uv = vUv;
      // Blueprint sheet resting at an angle on the architect's dark slate desk, with stacked under-sheet and live unroll tube
      float region = 0.0;                                        // 0 scene, 1 border, 2 desk/under-sheet, 3 unrolling tube
      vec3 flatCol = vec3(0.0);
      float sheetCurlShade = 1.0;
      vec2 sheetLocalUV = vec2(0.5);
      float sheetEdgeK = 0.0;
      if (cardOn > 0.5) {
        vec2 asp = vec2(res.x / res.y, 1.0);
        float edgeK = clamp(cardBorder / 0.034, 0.0, 1.0);
        sheetEdgeK = edgeK;
        // Top sheet center shifts gently with pointer & idle breathing for physical levitation parallax
        vec2 topCenter = cardCenter + cardPtr * vec2(0.0042, 0.0034) * edgeK;
        vec2 p = (vUv - topCenter) * asp;
        float topRot = cardRot + cardPtr.x * 0.0035 * edgeK;
        float cr = cos(-topRot), sr = sin(-topRot);
        p = vec2(cr * p.x - sr * p.y, sr * p.x + cr * p.y);
        p.x /= max(cardFlip, 1e-3);
        vec2 hs = 0.5 * asp * cardScale;
        float bw = cardBorder * cardScale;
        vec2 fullHs = hs + bw;
        vec2 dd = abs(p) - fullHs;
        float deckle = ((vnoise(p * 180.0) - 0.5) * 0.0032 + (vnoise(p * 40.0) - 0.5) * 0.0022) * cardScale * edgeK;
        float outer = max(dd.x, dd.y) + deckle;
        vec2 di = abs(p) - hs;
        float inner = max(di.x, di.y);

        // Unroll sweep along the sheet's local X axis (0 = bare desk, 1 = fully unrolled blueprint)
        float unroll = clamp(cardUnroll, 0.0, 1.0);
        float tubeR = mix(0.042, 0.014, unroll) * cardScale;
        float rollX = mix(-fullHs.x - tubeR * 1.6, fullHs.x + tubeR * 2.4, unroll);
        bool inRollSpanY = abs(p.y) <= fullHs.y + 0.006 * cardScale;

        // Second stacked architectural under-sheet (Sheet A-100, rotated +1.4 deg in opposite direction beneath the main sheet)
        vec2 underCenter = cardCenter + vec2(-0.013, -0.009) * edgeK - cardPtr * vec2(0.0026, 0.0020) * edgeK;
        vec2 pu = (vUv - underCenter) * asp;
        float uRot = 0.022 * edgeK - cardPtr.x * 0.002 * edgeK;
        float cru = cos(-uRot), sru = sin(-uRot);
        pu = vec2(cru * pu.x - sru * pu.y, sru * pu.x + cru * pu.y);
        vec2 underHs = fullHs * vec2(0.985, 0.975);
        vec2 ddu = abs(pu) - underHs;
        float deckleU = ((vnoise(pu * 160.0 + 7.3) - 0.5) * 0.0028) * cardScale * edgeK;
        float outerU = max(ddu.x, ddu.y) + deckleU;
        float underVisible = step(0.15, edgeK) * smoothstep(0.08, 0.35, unroll);

        if (unroll <= 0.001) {
          region = 2.0;
          flatCol = deskSurface(vUv);
        } else if (inRollSpanY && unroll < 0.996 && abs(p.x - rollX) <= tubeR) {
          // 3D rolled blueprint paper cylinder moving across the desk
          region = 3.0;
          float cylX = (p.x - rollX) / max(tubeR, 1e-4);
          float nz = sqrt(max(0.0, 1.0 - cylX * cylX));
          float lit = clamp(0.42 + 0.48 * (-0.32 * cylX + 0.94 * nz) + 0.18 * pow(nz, 4.0), 0.22, 1.06);
          float wrap = fract((asin(clamp(cylX, -0.99, 0.99)) + unroll * 18.0) * 1.4);
          float seam = smoothstep(0.04, 0.0, abs(wrap - 0.52)) * 0.22;
          float faintGrid = smoothstep(0.03, 0.0, min( abs(fract(p.y * 28.0) - 0.5), abs(fract(wrap * 6.0) - 0.5) )) * 0.08;
          flatCol = cardPaper * lit * (1.0 - seam - faintGrid);
        } else if (outer > 0.0 || p.x > rollX) {
          region = 2.0;
          flatCol = deskSurface(vUv);

          // 1. If pixel falls inside the stacked architectural under-sheet (Sheet A-100), render its warm vellum stock & CAD grid
          if (underVisible > 0.01 && outerU <= 0.0 && pu.x <= rollX - 0.012) {
            float uFibre = vnoise(pu * res * 0.18) * 0.04;
            vec3 uPaper = cardPaper * vec3(0.84, 0.82, 0.78) * (0.96 + uFibre);
            // Faint blueprint grid and border rule on the under-sheet
            vec2 ug = abs(fract(pu * 26.0) - 0.5);
            float uGrid = smoothstep(0.022, 0.0, min(ug.x, ug.y)) * 0.12;
            float uRule = 1.0 - smoothstep(0.001, 0.0022, abs(outerU + bw * 0.38));
            uPaper = mix(uPaper, inkCol, uGrid + uRule * 0.38);
            // Lit 3D paper thickness bevel along the under-sheet's outer cut edge
            float uRim = 1.0 - smoothstep(0.0, 2.2 / res.y, -outerU);
            uPaper += vec3(0.14, 0.13, 0.11) * uRim;
            flatCol = mix(flatCol, uPaper, underVisible);
          } else if (underVisible > 0.01 && outerU > 0.0) {
            // Warm rim glow and contact shadow around the under-sheet on the dark slate mat
            float uRimGlow = exp(-outerU * 85.0) * 0.055 * underVisible;
            flatCol += vec3(0.95, 0.65, 0.38) * uRimGlow;
          }

          // 2. Warm bounced-light halo & deep 3D elevation shadow cast by the top blueprint sheet onto the under-sheet and dark table
          vec2 shadowOff = vec2(0.009, -0.016) + cardPtr * vec2(0.0035, 0.0030);
          vec2 ps = (vUv - topCenter - shadowOff * edgeK) * asp;
          ps = vec2(cr * ps.x - sr * ps.y, sr * ps.x + cr * ps.y); ps.x /= max(cardFlip, 1e-3);
          vec2 ds = abs(ps) - fullHs;
          float so = max(ds.x, max(ds.y, ps.x - rollX));
          float contact = 1.0 - smoothstep(0.0, 0.008, max(outer, p.x - rollX));
          float umbra = 1.0 - smoothstep(0.0, 0.048, so);
          float penumbra = 1.0 - smoothstep(0.0, 0.11, so);
          flatCol *= 1.0 - (0.52 * contact + 0.36 * umbra + 0.16 * penumbra) * clamp(cardScale * 1.25, 0.0, 1.0) * edgeK;

          // Warm studio lamp rim-reflection on the dark table right outside the sunlit top/left paper edges
          float topLeftBias = clamp((-p.x / max(fullHs.x, 1e-3)) * 0.45 + (p.y / max(fullHs.y, 1e-3)) * 0.55, 0.0, 1.0);
          float tableHalo = exp(-max(outer, 0.0) * 62.0) * edgeK * unroll;
          flatCol += (vec3(0.96, 0.88, 0.74) * (0.048 + 0.055 * topLeftBias) + vec3(0.94, 0.34, 0.08) * 0.028) * tableHalo;

          // Extra shadow cast ahead of the unrolling cylinder onto the desk
          if (inRollSpanY && unroll < 0.996 && p.x > rollX + tubeR) {
            float dTube = p.x - (rollX + tubeR);
            flatCol *= 1.0 - 0.52 * exp(-dTube / max(tubeR * 1.8, 1e-4));
          }
        } else if (inner > 0.0) {
          region = 1.0;
          float age = smoothstep(bw * 0.25, 0.0, -outer) * 0.15 + vnoise(p * 30.0) * 0.032;
          flatCol = mix(cardPaper, cardPaper * vec3(0.93, 0.88, 0.79), age);
          // Crisp 3D lit paper cut-edge bevel along the outer perimeter of the top sheet
          float cutBevel = (1.0 - smoothstep(0.0, 2.4 / res.y, -outer)) * edgeK;
          float sunEdge = clamp((-p.x / max(fullHs.x, 1e-3)) * 0.4 + (p.y / max(fullHs.y, 1e-3)) * 0.6 + 0.35, 0.0, 1.0);
          flatCol = mix(flatCol, vec3(1.0, 0.99, 0.96), cutBevel * (0.45 + 0.45 * sunEdge));
          // Subtle corner curl lift shading at bottom-right of the sheet
          float brCorner = smoothstep(0.22, 0.0, length(p - vec2(fullHs.x, -fullHs.y)));
          flatCol *= 1.0 + 0.045 * brCorner * sin(time * 1.2) * edgeK;
          // Crisp architectural sheet border rule inside the cotton margin
          float rulePos = abs(inner - bw * 0.36);
          float ruleW = max(1.5 / res.y, 0.0012) * cardScale;
          float rule = 1.0 - smoothstep(ruleW * 0.5, ruleW * 1.4, rulePos);
          flatCol = mix(flatCol, inkCol, rule * 0.58);
          if (unroll < 0.996 && rollX - tubeR - p.x < tubeR * 2.2) {
            float dBehind = max(0.0, (rollX - tubeR) - p.x);
            flatCol *= 1.0 - 0.18 * exp(-dBehind / max(tubeR * 0.9, 1e-4));
          }
        } else {
          uv = p / (2.0 * hs) + 0.5;
          sheetLocalUV = uv;
          // Subtle traveling studio lamp sheen across the blueprint paper
          vec2 sheenD = uv - (vec2(0.48, 0.52) + cardPtr * 0.18);
          float paperSheen = exp(-dot(sheenD, sheenD) * 2.8) * 0.045 * edgeK;
          sheetCurlShade = 0.975 + paperSheen;
          if (unroll < 0.996 && rollX - tubeR - p.x < tubeR * 2.2) {
            float dBehind = max(0.0, (rollX - tubeR) - p.x);
            sheetCurlShade *= 1.0 - 0.18 * exp(-dBehind / max(tubeR * 0.9, 1e-4));
          }
        }
      }
      if (region > 0.5) {
        vec3 fc = flatCol;
        vec2 qq = vUv - 0.5; qq.x *= res.x / res.y;
        fc *= mix(1.0, smoothstep(1.25, 0.22, length(qq)), vignette * 0.45);
        fc += (hash(vUv * res + fract(time * 13.0) * 431.0) - 0.5) * grain;
        fc = mix(fc, fadeCol, fadeBlack);
        gl_FragColor = vec4(clamp(fc, 0.0, 1.0), 1.0);
        return;
      }
      vec4 sc = texture2D(tScene, uv);
      vec3 hdr = sampleScene(uv);
      float paper = paperOn * sc.a;

      // depth of field: small golden-angle gather, radius from distance to focus
      if (dof > 0.0 && usePre > 0.5) {
        float z = zOf(texture2D(tPre, uv).w);
        float coc = clamp(abs(z - focus) / max(z, 0.1) * dof, 0.0, 1.0);
        if (coc > 0.02) {
          vec3 acc = hdr; float wsum = 1.0;
          float r = coc * 9.0;
          for (int i = 0; i < 16; i++) {
            float fi = float(i) + 0.5;
            float a = fi * 2.39996;
            vec2 o = vec2(cos(a), sin(a)) * sqrt(fi / 16.0) * r / res;
            acc += texture2D(tScene, uv + o).rgb; wsum += 1.0;
          }
          hdr = acc / wsum;
        }
      }

      // ambient occlusion goes on before the tone curve
      if (aoAmt > 0.0) {
        float ao = texture2D(tAO, uv).r;
        // contact shadows only near the lens: far away the depth is too coarse and AO turns into stripes
        float aoFar = 1.0 - smoothstep(90.0, 220.0, zOf(texture2D(tPre, uv).w));
        hdr *= mix(1.0, ao, aoAmt * (1.0 - paper) * aoFar);
      }
      vec3 bl = texture2D(tBloom, uv).rgb * 0.6 + texture2D(tBloom2, uv).rgb * 0.8;
      hdr += bl * bloomAmt;
      hdr += bl * vec3(1.0, 0.25, 0.1) * halation;
      // sunlit air along the ray, saturating, so a whole sunny view turns hazy rather than white
      if (shafts > 0.0) hdr += shaftCol * (1.0 - exp(-texture2D(tShaft, uv).r * shafts)) * shaftAmp * (1.0 - paper);

      vec3 c = aces(hdr * exposure);
      c = pow(c, vec3(1.0 / 2.2));

      // grade
      c.r *= 1.0 + warmth * 0.08; c.b *= 1.0 - warmth * 0.1; c.g *= 1.0 + tint * 0.04;
      float l = lum(c);
      c = mix(vec3(l), c, saturation);
      c = (c - 0.5) * contrast + 0.5;
      c = lift + c * (gain - lift);
      if (vintage > 0.0) c = mix(c, kodak(c), vintage);

      // paper: drawing regions show paper with hatching and ink edges
      if (paperOn > 0.0) {
        float hatch = sc.a > 0.995 ? clamp(sc.r, 0.0, 1.0) : 0.0;
        float fibre = vnoise(uv * res * vec2(0.15, 0.55)) * 0.5 + vnoise(uv * res * 0.012) * 0.5;
        vec3 pc = paperCol * (1.0 - paperTex * (fibre - 0.5) * 0.12);
        pc = mix(pc, inkCol, hatch * 0.85);
        c = mix(c, pc, paper);
      }
      if (ink > 0.0 && usePre > 0.5) {
        vec2 t = preTexel;
        vec4 p0 = texture2D(tPre, uv);
        vec4 p1 = texture2D(tPre, uv + vec2(t.x, 0.0)), p2 = texture2D(tPre, uv - vec2(t.x, 0.0));
        vec4 p3 = texture2D(tPre, uv + vec2(0.0, t.y)), p4 = texture2D(tPre, uv - vec2(0.0, t.y));
        float nd = length(p1.xyz - p2.xyz) + length(p3.xyz - p4.xyz);
        float z0 = zOf(p0.w);
        // second derivative of depth: flat but grazing planes stay clean
        float zl = (abs(zOf(p1.w) + zOf(p2.w) - 2.0 * z0) + abs(zOf(p3.w) + zOf(p4.w) - 2.0 * z0)) / max(z0, 0.5);
        float e = clamp(smoothstep(0.35, 0.8, nd) + smoothstep(0.01, 0.03, zl), 0.0, 1.0);
        // telephoto: judge a depth step against the size of one pixel at that depth,
        // so a table seen from 1 km away still gets its outline
        if (inkTele > 0.0) {
          float zs = (abs(zOf(p1.w) + zOf(p2.w) - 2.0 * z0) + abs(zOf(p3.w) + zOf(p4.w) - 2.0 * z0)) / max(z0 * pixAng, 1e-5);
          e = max(e, inkTele * smoothstep(2.0, 6.0, zs));
        }
        if (inkAA > 0.5) e = clamp(length(vec2(edgeAxis(uv, vec2(t.x, 0.0), z0), edgeAxis(uv, vec2(0.0, t.y), z0))), 0.0, 1.0);
        e *= 1.0 - smoothstep(focus + 25.0, focus + 60.0, z0);
        float strength = ink * mix(inkReal, 1.0, paper);
        c = mix(c, inkCol, e * strength);

        // Live architectural blueprint scan wave gliding across the 2D floor plan at rest on the Hero desk
        if (cardOn > 0.5 && sheetEdgeK > 0.15 && cardUnroll > 0.99) {
          float scanAxis = sheetLocalUV.x * 0.78 + (1.0 - sheetLocalUV.y) * 0.22;
          float scanPos = fract(time * 0.14) * 1.44 - 0.22;
          float distScan = scanPos - scanAxis;
          float scanLead = exp(-pow(distScan / 0.012, 2.0));
          float scanTrail = smoothstep(0.18, 0.0, distScan) * step(0.0, distScan);
          float inkMask = clamp(e * 1.15 + (1.0 - lum(c)) * 0.85, 0.0, 1.0);
          vec2 sg = abs(fract(sheetLocalUV * vec2(36.0, 22.0)) - 0.5);
          float cadGrid = smoothstep(0.025, 0.0, min(sg.x, sg.y));
          vec3 scanCol = vec3(0.94, 0.31, 0.06);
          c = mix(c, scanCol, (scanLead * 0.72 * inkMask + scanTrail * 0.22 * inkMask + scanLead * 0.14 + scanTrail * cadGrid * 0.10) * sheetEdgeK);
        }
      }

      // dust, drawn after the drawing: a sharp core plus a soft halo, screened on
      if (sunDust > 0.0) {
        vec3 d = texture2D(tSunDust, uv).rgb + texture2D(tSunDustB, uv).rgb * 0.8;
        c = 1.0 - (1.0 - c) * (1.0 - clamp(d * sunDust, 0.0, 1.0));
      }

      vec2 q = uv - 0.5; q.x *= res.x / res.y;
      c *= mix(1.0, smoothstep(1.15, 0.2, length(q)), vignette);
      if (print > 0.0) {
        // fine halftone screen and paper tooth, only really seen on the small card
        vec2 pp = mat2(0.7071, -0.7071, 0.7071, 0.7071) * (uv * res) / 3.2;
        float dotv = length(fract(pp) - 0.5);
        float ink2 = 1.0 - lum(c);
        float scr = smoothstep(ink2 * 0.62 + 0.04, ink2 * 0.62 - 0.06, dotv);
        c = mix(c, c * (0.92 + 0.16 * (1.0 - scr)), print);
        c *= 1.0 - print * 0.06 * (vnoise(uv * res * 0.4) - 0.5);
      }
      // grainPaper 0 keeps the moving grain off drawing regions, so a sheet of paper holds still
      c *= sheetCurlShade;
      c += (hash(uv * res + fract(time * 13.0) * 431.0) - 0.5) * grain * mix(1.0, grainPaper, paper);
      c = mix(c, fadeCol, fadeBlack);
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`;

  class Finisher {
    constructor(renderer, opts) {
      this.r = renderer;
      this.opts = Object.assign({ ao: true, pre: true, preScale: 0.5, msaa: 4 }, opts || {});
      this.quadScene = new THREE.Scene();
      this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
      this.quad.frustumCulled = false;
      this.quadScene.add(this.quad);
      const mk = (fs, u) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms: u, depthTest: false, depthWrite: false });
      this.preMat = new THREE.ShaderMaterial({ vertexShader: PRE_VS, fragmentShader: PRE_FS, side: THREE.DoubleSide, clipping: true, uniforms: { zBase: { value: 0 } } });
      const kernel = [];
      const R = FX.rng(7);
      for (let i = 0; i < 16; i++) {
        const v = new THREE.Vector3(R() * 2 - 1, R() * 2 - 1, R() * 0.9 + 0.1).normalize();
        let s = i / 16; s = 0.12 + 0.88 * s * s;
        kernel.push(v.multiplyScalar(s * (0.5 + R() * 0.5)));
      }
      this.mAO = mk(AO_FS, { tPre: { value: null }, res: { value: new THREE.Vector2() }, tanHalf: { value: new THREE.Vector2() },
        radius: { value: 0.6 }, bias: { value: 0.03 }, kernel: { value: kernel }, zBase: { value: 0 } });
      this.mBlur = mk(BLUR_FS, { tSrc: { value: null }, dir: { value: new THREE.Vector2() } });
      this.mBright = mk(BRIGHT_FS, { tSrc: { value: null }, threshold: { value: 1.2 }, exposure: { value: 1 } });
      this.mFinish = mk(FINISH_FS, {
        tScene: { value: null }, tAO: { value: null }, tBloom: { value: null }, tBloom2: { value: null }, tPre: { value: null },
        res: { value: new THREE.Vector2() }, preTexel: { value: new THREE.Vector2() }, time: { value: 0 },
        exposure: { value: 1 }, contrast: { value: 1 }, saturation: { value: 1 }, warmth: { value: 0 }, tint: { value: 0 },
        lift: { value: new THREE.Vector3(0, 0, 0) }, gain: { value: new THREE.Vector3(1, 1, 1) },
        aoAmt: { value: 0.8 }, bloomAmt: { value: 0.25 }, halation: { value: 0.1 },
        vignette: { value: 0.35 }, grain: { value: 0.025 }, grainPaper: { value: 1 }, chroma: { value: 0.0015 }, fadeBlack: { value: 0 }, fadeCol: { value: new THREE.Vector3(0, 0, 0) },
        cardOn: { value: 0 }, cardScale: { value: 1 }, cardRot: { value: 0 }, cardCenter: { value: new THREE.Vector2(0.5, 0.5) }, cardBorder: { value: 0.04 },
        cardFlip: { value: 1 }, cardUnroll: { value: 1 }, cardPtr: { value: new THREE.Vector2(0, 0) }, tableCol: { value: new THREE.Vector3(0.115, 0.122, 0.132) }, cardPaper: { value: new THREE.Vector3(0.95, 0.93, 0.89) },
        vintage: { value: 0 }, print: { value: 0 }, dof: { value: 0 }, focus: { value: 10 },
        paperOn: { value: 0 }, paperCol: { value: new THREE.Vector3(0.95, 0.93, 0.88) }, inkCol: { value: new THREE.Vector3(0.12, 0.12, 0.13) },
        ink: { value: 0 }, inkReal: { value: 0 }, paperTex: { value: 1 }, usePre: { value: 1 },
        inkTele: { value: 0 }, pixAng: { value: 0.001 }, zBase: { value: 0 }, inkAA: { value: 0 },
        tShaft: { value: null }, shafts: { value: 0 }, shaftAmp: { value: 1 }, shaftCol: { value: new THREE.Vector3(1, 0.86, 0.68) },
        tSunDust: { value: null }, tSunDustB: { value: null }, sunDust: { value: 0 },
      });
      this.mShaft = mk(SHAFT_FS, { tPre: { value: null }, tShadow: { value: null }, shadowMat: { value: new THREE.Matrix4() },
        camWorld: { value: new THREE.Matrix4() }, tanHalf: { value: new THREE.Vector2() }, zBase: { value: 0 }, maxDist: { value: 30 },
        sunDir: { value: new THREE.Vector3(0, 1, 0) } });
      this.u = this.mFinish.uniforms;
      // opt in: set shaftLight to a shadow-casting DirectionalLight, dustScene to a scene of FX.dust points
      this.shaftLight = null;
      this.dustScene = null;
      this.targets = [];
      this.hidden = [];
    }
    setSize(w, h, outW, outH) {
      this.targets.forEach((t) => t.dispose());
      const hf = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
      this.rtScene = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: this.opts.msaa, depthBuffer: true });
      const pw = Math.max(2, Math.round(w * this.opts.preScale)), ph = Math.max(2, Math.round(h * this.opts.preScale));
      // opt in (preMsaa): a multisampled prepass, read with linear filtering. It is what P.inkAA needs.
      const pf = this.opts.preMsaa ? THREE.LinearFilter : THREE.NearestFilter;
      this.rtPre = new THREE.WebGLRenderTarget(pw, ph, { type: THREE.HalfFloatType, depthBuffer: true, minFilter: pf, magFilter: pf, samples: this.opts.preMsaa || 0 });
      const aw = Math.max(2, Math.round(w / 2)), ah = Math.max(2, Math.round(h / 2));
      this.rtAO = new THREE.WebGLRenderTarget(aw, ah, hf);
      this.rtAO2 = new THREE.WebGLRenderTarget(aw, ah, hf);
      const bw = Math.max(2, Math.round(w / 4)), bh = Math.max(2, Math.round(h / 4));
      this.rtB1 = new THREE.WebGLRenderTarget(bw, bh, hf);
      this.rtB2 = new THREE.WebGLRenderTarget(bw, bh, hf);
      const cw = Math.max(2, Math.round(w / 10)), ch = Math.max(2, Math.round(h / 10));
      this.rtC1 = new THREE.WebGLRenderTarget(cw, ch, hf);
      this.rtC2 = new THREE.WebGLRenderTarget(cw, ch, hf);
      this.rtSh1 = new THREE.WebGLRenderTarget(aw, ah, hf);
      this.rtSh2 = new THREE.WebGLRenderTarget(aw, ah, hf);
      this.rtSunDust = new THREE.WebGLRenderTarget(w, h, hf);
      const dw = Math.max(2, Math.round(w / 6)), dh = Math.max(2, Math.round(h / 6));
      this.rtSunDustB = new THREE.WebGLRenderTarget(dw, dh, hf);
      this.rtSunDustB2 = new THREE.WebGLRenderTarget(dw, dh, hf);
      this.sunDustRes = new THREE.Vector2(w, h);
      this.targets = [this.rtScene, this.rtPre, this.rtAO, this.rtAO2, this.rtB1, this.rtB2, this.rtC1, this.rtC2,
        this.rtSh1, this.rtSh2, this.rtSunDust, this.rtSunDustB, this.rtSunDustB2];
      this.w = w; this.h = h;
      this.mAO.uniforms.res.value.set(aw, ah);
      this.u.res.value.set(outW, outH);
      this.u.preTexel.value.set(1 / pw, 1 / ph);
    }
    pass(mat, target) {
      this.quad.material = mat;
      this.r.setRenderTarget(target);
      this.r.render(this.quadScene, this.quadCam);
    }
    blur(src, tmp, w, h, scale) {
      this.mBlur.uniforms.tSrc.value = src.texture;
      this.mBlur.uniforms.dir.value.set(scale / w, 0);
      this.pass(this.mBlur, tmp);
      this.mBlur.uniforms.tSrc.value = tmp.texture;
      this.mBlur.uniforms.dir.value.set(0, scale / h);
      this.pass(this.mBlur, src);
    }
    render(scene, camera, p) {
      const r = this.r;
      const needPre = this.opts.pre && ((p.ao || 0) > 0 || (p.ink || 0) > 0 || (p.dof || 0) > 0);
      // depth is stored relative to zBase, so a camera 1 km away keeps centimetre precision
      this.preMat.uniforms.zBase.value = this.mAO.uniforms.zBase.value = p.zBase || 0;
      if (needPre) {
        // normals + depth, background cleared to "far"
        const bg = scene.background, fog = scene.fog;
        scene.background = null; scene.fog = null;
        this.hidden.length = 0;
        scene.traverseVisible((o) => { if (o.userData.noPrepass) { this.hidden.push(o); } });
        this.hidden.forEach((o) => (o.visible = false));
        scene.overrideMaterial = this.preMat;
        const cc = r.getClearColor(new THREE.Color()), ca = r.getClearAlpha();
        r.setClearColor(0x8080ff, 0);                     // alpha 0 decodes as "infinitely far"
        r.setRenderTarget(this.rtPre);
        r.clear();
        const ac = r.autoClear; r.autoClear = false;
        r.render(scene, camera);
        r.autoClear = ac;
        scene.overrideMaterial = null;
        this.hidden.forEach((o) => (o.visible = true));
        scene.background = bg; scene.fog = fog;
        r.setClearColor(cc, ca);
      }
      r.setRenderTarget(this.rtScene);
      r.clear();
      r.render(scene, camera);

      if (needPre && (p.ao || 0) > 0) {
        const t = Math.tan((camera.fov * Math.PI) / 360);
        this.mAO.uniforms.tanHalf.value.set(t * camera.aspect, t);
        this.mAO.uniforms.tPre.value = this.rtPre.texture;
        this.mAO.uniforms.radius.value = p.aoRadius || 0.6;
        this.pass(this.mAO, this.rtAO);
        this.blur(this.rtAO, this.rtAO2, this.rtAO.width, this.rtAO.height, 1.0);
      }
      // bloom at quarter and tenth resolution
      this.mBright.uniforms.tSrc.value = this.rtScene.texture;
      this.mBright.uniforms.threshold.value = p.bloomThreshold || 1.1;
      this.mBright.uniforms.exposure.value = p.exposure || 1;
      this.pass(this.mBright, this.rtB1);
      this.blur(this.rtB1, this.rtB2, this.rtB1.width, this.rtB1.height, 1.0);
      this.mBlur.uniforms.tSrc.value = this.rtB1.texture;
      this.mBlur.uniforms.dir.value.set(0, 0);
      this.pass(this.mBlur, this.rtC1);
      this.blur(this.rtC1, this.rtC2, this.rtC1.width, this.rtC1.height, 1.5);

      const u = this.u;
      u.tScene.value = this.rtScene.texture;
      u.tAO.value = this.rtAO.texture;
      u.tBloom.value = this.rtB1.texture;
      u.tBloom2.value = this.rtC1.texture;
      u.tPre.value = this.rtPre.texture;
      u.usePre.value = needPre ? 1 : 0;
      u.pixAng.value = (2 * Math.tan((camera.fov * Math.PI) / 360)) / this.rtPre.height;
      for (const k in p) {
        if (!u[k] || k === 'tScene') continue;
        const v = p[k];
        if (typeof v === 'number') u[k].value = v;
        else if (v && v.isVector3) u[k].value.copy(v);
        else if (v && v.isVector2) u[k].value.copy(v);
        else if (Array.isArray(v)) { if (v.length === 2) u[k].value.set(v[0], v[1]); else u[k].value.set(v[0], v[1], v[2]); }
      }
      u.aoAmt.value = needPre ? p.ao || 0 : 0;

      // sun shafts, from the shadow map
      const L = this.shaftLight;
      if ((p.shafts || 0) > 0 && needPre && L && L.shadow && L.shadow.map) {
        const su = this.mShaft.uniforms, t = Math.tan((camera.fov * Math.PI) / 360);
        su.tPre.value = this.rtPre.texture; su.tShadow.value = L.shadow.map.texture;
        su.shadowMat.value.copy(L.shadow.matrix); su.camWorld.value.copy(camera.matrixWorld);
        su.tanHalf.value.set(t * camera.aspect, t); su.zBase.value = p.zBase || 0; su.maxDist.value = p.shaftDist || 30;
        su.sunDir.value.copy(L.position).sub(L.target.position).normalize();
        this.pass(this.mShaft, this.rtSh1);
        this.blur(this.rtSh1, this.rtSh2, this.rtSh1.width, this.rtSh1.height, 1.2);
        u.tShaft.value = this.rtSh1.texture;
      } else u.shafts.value = 0;

      // dust: its own scene, drawn into its own target, a blurred copy for the halo.
      // Named sunDust so pages that patch their own dust into this finisher (003) do not collide.
      if (this.dustScene && (p.sunDust || 0) > 0) {
        const pix = this.sunDustRes.y / (2 * Math.tan((camera.fov * Math.PI) / 360));
        this.dustScene.traverse((o) => {
          const du = o.material && o.material.uniforms;
          if (!du || !du.tPre) return;
          du.tPre.value = this.rtPre.texture; du.res.value.copy(this.sunDustRes);
          if (du.uPixel) du.uPixel.value = pix;
          if (du.zBase) du.zBase.value = p.zBase || 0;
          if (du.tSunShadow && L && L.shadow && L.shadow.map) { du.tSunShadow.value = L.shadow.map.texture; du.sunShadowMat.value.copy(L.shadow.matrix); }
        });
        const cc = r.getClearColor(new THREE.Color()), ca = r.getClearAlpha();
        r.setRenderTarget(this.rtSunDust);
        r.setClearColor(0x000000, 1); r.clear();
        r.render(this.dustScene, camera);
        r.setClearColor(cc, ca);
        this.mBlur.uniforms.tSrc.value = this.rtSunDust.texture; this.mBlur.uniforms.dir.value.set(0, 0);
        this.pass(this.mBlur, this.rtSunDustB);
        this.blur(this.rtSunDustB, this.rtSunDustB2, this.rtSunDustB.width, this.rtSunDustB.height, 1.4);
        u.tSunDust.value = this.rtSunDust.texture; u.tSunDustB.value = this.rtSunDustB.texture;
      } else u.sunDust.value = 0;
      this.pass(this.mFinish, null);
    }
  }
  FX.Finisher = Finisher;
})(window.FX);
