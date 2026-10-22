/* ==========================================================================
   Lintel, the sky written in code (15 Oct 2026). Sam: "I don't want any Poly Haven textures, everything should be in
   code now". The sky was the last Poly Haven picture: a late afternoon panorama (qwantani_late_afternoon_puresky), an HDR
   for the light and a 4k JPG for what you see.

   This makes the same two pictures while the page loads, from a rule, so everything downstream (the dome, the sun's
   bearing, the light looks' capped environment and their hours) goes on as it was:
     hdr  the light: an equirectangular half float picture, 1024 by 512, sun included
     bg   what you see: the same sky through the photograph's own tone curve, 2048 by 1024, as an sRGB canvas
     env  hdr prefiltered for the materials' reflections and ambient light

   The rule was fitted to the panorama it replaces (tools: scratchpad sky/fit.py, 15 Oct): the sky's colour at four
   heights above the horizon and four below, each with its own part that grows toward the sun ((1 + cos)/2 to the 4th),
   a halo round the sun (Henyey-Greenstein, g 0.8) and a warm glow low down under it (falling off over 18 degrees of height,
   (1 + cos)/2 to the 6th). Mean error against the panorama 5 to 10 percent per band of height. The visible sky is that
   light through x / (1 + 0.6 x^1.4), the JPG's own curve against the HDR (2 percent rms).
   ========================================================================== */
window.LINTEL_CODESKY = (function () {
  'use strict';
  // heights of the stops, degrees: above the horizon, then below it
  const UP = [0, 12, 30, 90], DN = [0, -8, -30, -90];
  // per stop: the base colour (linear), then the part that grows toward the sun
  const BASE = [[0.5075, 0.5166, 0.5105], [0.2907, 0.4007, 0.5574], [0.1518, 0.2246, 0.361], [0.0298, 0.0666, 0.1507],
    [0.5019, 0.5008, 0.4902], [0.2167, 0.2869, 0.3821], [0.06, 0.0895, 0.1442], [0.0339, 0.0512, 0.0831]];
  const SUNWARD = [[-1.0708, -1.0084, -0.633], [-0.2576, 0.037, 0.4346], [0.042, 0.2181, 0.4722], [0.4327, 0.4986, 0.5433],
    [-1.1932, -1.1162, -0.6853], [-0.1699, 0.0888, 0.4334], [0.3695, 0.557, 0.7917], [0.8942, 0.9329, 0.8706]];
  const HALO = [0.0408, 0.0464, 0.0493], GLOW = [3.3451, 2.8572, 1.6726], G = 0.8;
  // the sun's disc: the panorama's sun holds (9.27, 7.48, 5.30) of light within 1.5 degrees; here a disc 0.6 degrees across
  const SUN_R = 0.6 * Math.PI / 180, SUN_E = [9.27, 7.48, 5.3], SUN_L = SUN_E.map((e) => e / (Math.PI * SUN_R * SUN_R));
  const DEG = 180 / Math.PI;
  const ss = (t) => t * t * (3 - 2 * t);

  // the sky's light (linear, not tone mapped) toward d, the sun toward s (both unit vectors). out: [r, g, b]
  function light(dx, dy, dz, s, out, withSun) {
    const e = Math.asin(Math.max(-1, Math.min(1, dy))) * DEG;
    const cg = dx * s[0] + dy * s[1] + dz * s[2];
    let i0 = 0, i1 = 1, t = 0;
    if (e >= 0) {
      const a = e < UP[1] ? 0 : e < UP[2] ? 1 : 2;
      i0 = a; i1 = a + 1; t = ss((e - UP[a]) / (UP[a + 1] - UP[a]));
    } else {
      const a = e > DN[1] ? 0 : e > DN[2] ? 1 : 2;
      i0 = 4 + a; i1 = 5 + a; t = ss((DN[a] - e) / (DN[a] - DN[a + 1]));
    }
    const h = (1 + cg) / 2, faz = h * h * h * h, h6 = faz * h * h;
    const hg = (1 - G * G) / Math.pow(Math.max(1e-4, 1 + G * G - 2 * G * cg), 1.5);
    const glow = Math.exp(-Math.abs(e) / 18) * h6;
    const ang = Math.acos(Math.max(-1, Math.min(1, cg)));
    const disc = withSun ? Math.max(0, Math.min(1, (SUN_R - ang) / (0.15 * Math.PI / 180) + 0.5)) : 0;
    for (let c = 0; c < 3; c++) {
      const base = BASE[i0][c] + (BASE[i1][c] - BASE[i0][c]) * t, sw = SUNWARD[i0][c] + (SUNWARD[i1][c] - SUNWARD[i0][c]) * t;
      out[c] = Math.max(0, base + sw * faz + HALO[c] * hg + GLOW[c] * glow) + disc * SUN_L[c];
    }
    return ang;
  }
  const tone = (x) => { x = Math.min(x, 2.7); return x / (1 + 0.6 * Math.pow(x, 1.4)); };
  const srgb = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
  const LUT_N = 4096, TONE_LUT = new Float32Array(LUT_N + 1), SRGB_LUT = new Float32Array(LUT_N + 1);
  for (let i = 0; i <= LUT_N; i++) {
    TONE_LUT[i] = tone((i / LUT_N) * 2.7);
    SRGB_LUT[i] = srgb(i / LUT_N) * 255;
  }
  const OMA_G2 = 1 - G * G, ONE_PLUS_G2 = 1 + G * G, TWO_G = 2 * G, INV_DISC_W = 1 / (0.15 * Math.PI / 180);

  function make(THREE, renderer, o) {
    const az = o.sunAzimuth, el = o.sunElevation == null ? 19.16 / DEG : o.sunElevation;
    const s = [Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)];
    const s0 = s[0], s1 = s[1], s2 = s[2];
    // the light: rows from the top (the zenith) down, as an HDR file is read (see parseRGBE in fx-core.js)
    const W = 1024, H = 512, nPx = W * H, half = new Uint16Array(nPx * 4), f32 = new Float32Array(nPx * 3), lum = new Float32Array(nPx);
    const toHalf = THREE.DataUtils.toHalfFloat, one = toHalf(1);
    const cosPh = new Float32Array(W), sinPh = new Float32Array(W);
    for (let x = 0; x < W; x++) {
      const ph = ((x + 0.5) / W - 0.5) * Math.PI * 2;
      cosPh[x] = Math.cos(ph); sinPh[x] = Math.sin(ph);
    }
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d'), im = g.createImageData(W, H), px = im.data;
    let seed = 7;
    const toneScale = LUT_N / 2.7;
    for (let y = 0; y < H; y++) {
      const th = (0.5 - (y + 0.5) / H) * Math.PI, ct = Math.cos(th), st = Math.sin(th), e = th * DEG;
      let i0 = 0, i1 = 1, t = 0;
      if (e >= 0) {
        const a = e < UP[1] ? 0 : e < UP[2] ? 1 : 2;
        i0 = a; i1 = a + 1; t = ss((e - UP[a]) / (UP[a + 1] - UP[a]));
      } else {
        const a = e > DN[1] ? 0 : e > DN[2] ? 1 : 2;
        i0 = 4 + a; i1 = 5 + a; t = ss((DN[a] - e) / (DN[a] - DN[a + 1]));
      }
      const b0 = BASE[i0][0] + (BASE[i1][0] - BASE[i0][0]) * t, sw0 = SUNWARD[i0][0] + (SUNWARD[i1][0] - SUNWARD[i0][0]) * t;
      const b1 = BASE[i0][1] + (BASE[i1][1] - BASE[i0][1]) * t, sw1 = SUNWARD[i0][1] + (SUNWARD[i1][1] - SUNWARD[i0][1]) * t;
      const b2 = BASE[i0][2] + (BASE[i1][2] - BASE[i0][2]) * t, sw2 = SUNWARD[i0][2] + (SUNWARD[i1][2] - SUNWARD[i0][2]) * t;
      const glowY = Math.exp(-Math.abs(e) / 18), stS1 = st * s1, rowOff = y * W;
      for (let x = 0; x < W; x++) {
        const dx = cosPh[x] * ct, dz = sinPh[x] * ct;
        const cg = dx * s0 + stS1 + dz * s2;
        const h = (1 + cg) * 0.5, h2 = h * h, faz = h2 * h2, glow = glowY * faz * h2;
        const u = Math.max(1e-4, ONE_PLUS_G2 - TWO_G * cg);
        const hg = OMA_G2 / (u * Math.sqrt(u));
        let c0 = Math.max(0, b0 + sw0 * faz + HALO[0] * hg + GLOW[0] * glow);
        let c1 = Math.max(0, b1 + sw1 * faz + HALO[1] * hg + GLOW[1] * glow);
        let c2 = Math.max(0, b2 + sw2 * faz + HALO[2] * hg + GLOW[2] * glow);
        let sunVis = 0, disc = 0;
        if (cg > 0.985) {
          const ang = Math.acos(Math.min(1, cg));
          disc = Math.max(0, Math.min(1, (SUN_R - ang) * INV_DISC_W + 0.5));
          sunVis = Math.max(0, Math.min(1, (1.2 / DEG - ang) / (0.5 / DEG))) + 0.35 * Math.exp(-ang * DEG / 1.6);
        }
        const idx = rowOff + x, i4 = idx * 4, i3 = idx * 3;
        const rL = c0 + disc * SUN_L[0], gL = c1 + disc * SUN_L[1], bL = c2 + disc * SUN_L[2];
        f32[i3] = rL; f32[i3 + 1] = gL; f32[i3 + 2] = bL;
        lum[idx] = rL * 0.2126 + gL * 0.7152 + bL * 0.0722;
        half[i4] = toHalf(Math.min(rL, 65000)); half[i4 + 1] = toHalf(Math.min(gL, 65000)); half[i4 + 2] = toHalf(Math.min(bL, 65000)); half[i4 + 3] = one;
        seed = (seed * 16807) % 2147483647;
        const d = seed / 2147483647;
        const v0 = Math.min(1, TONE_LUT[Math.min(LUT_N, (c0 * toneScale) | 0)] + sunVis);
        const v1 = Math.min(1, TONE_LUT[Math.min(LUT_N, (c1 * toneScale) | 0)] + sunVis * 0.97);
        const v2 = Math.min(1, TONE_LUT[Math.min(LUT_N, (c2 * toneScale) | 0)] + sunVis * 0.92);
        px[i4] = Math.max(0, Math.min(255, (SRGB_LUT[(v0 * LUT_N) | 0] + d) | 0));
        px[i4 + 1] = Math.max(0, Math.min(255, (SRGB_LUT[(v1 * LUT_N) | 0] + d) | 0));
        px[i4 + 2] = Math.max(0, Math.min(255, (SRGB_LUT[(v2 * LUT_N) | 0] + d) | 0));
        px[i4 + 3] = 255;
      }
    }
    const hdr = new THREE.DataTexture(half, W, H, THREE.RGBAFormat, THREE.HalfFloatType);
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    hdr.colorSpace = THREE.LinearSRGBColorSpace;
    hdr.magFilter = hdr.minFilter = THREE.LinearFilter;
    hdr.flipY = true;
    hdr.needsUpdate = true;
    hdr.userData.shift = 0;
    hdr.userData.sunDir = new THREE.Vector3(s0, s1, s2);
    hdr.userData.code = true;
    hdr.userData.f32 = f32;
    hdr.userData.lum = lum;
    g.putImageData(im, 0, 0);
    const bg = new THREE.CanvasTexture(cv);
    bg.colorSpace = THREE.SRGBColorSpace;
    bg.mapping = THREE.EquirectangularReflectionMapping;
    let env = null;
    if (!o.noEnv) {
      const pm = new THREE.PMREMGenerator(renderer);
      env = pm.fromEquirectangular(hdr).texture;
      pm.dispose();
    }
    return { env, bg, hdr, sunDir: hdr.userData.sunDir.clone(), code: true };
  }
  return { make, light };
})();
