/* ==========================================================================
   Lintel, light options & Time-of-Day environments (18 Oct 2026). Behind ?light=

     ?light=warm     Warm Afternoon. Ten past five all the way, photographed better. The default since 9 Oct
     ?light=morning  Crisp Morning. Quarter to eight: fresh rose-champagne low sun, dewy cerulean sky, cool morning air
     ?light=noon     High Noon. Quarter past one: high Mediterranean sun, tight architectural shadows, gallery-bright rooms
     ?light=golden   Golden Hour. Ten to seven: low molten-amber sun, warm copper horizon, violet-blue shade, lamps glowing
     ?light=night    Architectural Night. Half past nine: deep indigo starlit sky, silver-blue moonlight, warm glowing house & fire
     ?light=passes   The Afternoon Passes. Four o'clock at the front door, half past seven in the garden
     ?light=off      the light as it was before 9 Oct (one nearly white sun, and the glare)

   100% procedural (zero external HDR downloads). When a preset is selected via ?light=, its sun bearing and height,
   sky dome gradient, capped environment map, and indoor room cubemap probes are baked once at load time (0.0 ms extra per frame).
   window.__light.setTod(name) switches presets live in the browser and re-captures the indoor room probes on demand.
   ========================================================================== */
(function () {
  'use strict';
  const Q = new URLSearchParams(location.search);
  let SLUG = Q.get('light') || 'golden';
  const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };

  /* ---------- the sun, by how high it stands (for warm & passes) ------------------- */
  const HOURS = [
    { el: 44, azOff: 0, sun: lin(0xfff0dc), power: 6.0, fill: [1.0, 1.0, 1.0], hemiSky: lin(0xeef0f0), hemiGnd: lin(0xd8c8b0), hemi: 0.5, sky: 0,
      dome: [0.84, 0.6], domeTint: [1, 1, 1], skyLow: [1.14, 1.02, 0.88], skyHigh: [0.82, 0.93, 1.10], night: 0, amb: [1.02, 1.0, 0.97, 1.04],
      exp: [0.98, 1.04], haze: 0.5, amp: 0.45, shaft: lin(0xffe6c8), bloom: 0.1, dust: 1.0,
      warmth: 0.06, sat: 1.04, fog: lin(0xcfd6da), fogFar: 9000, lamps: 0.7 },
    { el: 32, azOff: 0, sun: lin(0xffd9a8), power: 6.2, fill: [0.9, 0.92, 1.0], hemiSky: lin(0xe6e6ea), hemiGnd: lin(0xd8be98), hemi: 0.46, sky: 0,
      dome: [0.9, 0.56], domeTint: [1, 0.97, 0.92], skyLow: [1.18, 1.02, 0.84], skyHigh: [0.84, 0.93, 1.08], night: 0, amb: [1.03, 1.0, 0.95, 1.0],
      exp: [0.98, 1.04], haze: 0.6, amp: 0.5, shaft: lin(0xffd9a6), bloom: 0.1, dust: 0.8,
      warmth: 0.14, sat: 1.06, fog: lin(0xd0d5d4), fogFar: 8500, lamps: 1.0 },
    { el: 20, azOff: 0, sun: lin(0xffc282), power: 6.4, fill: [0.78, 0.82, 0.98], hemiSky: lin(0xcfd6ea), hemiGnd: lin(0xd4ac7c), hemi: 0.4, sky: 0,
      dome: [0.78, 0.56], domeTint: [1, 0.93, 0.84], skyLow: [1.20, 1.02, 0.80], skyHigh: [0.84, 0.93, 1.08], night: 0, amb: [1.03, 1.0, 0.95, 1.0],
      exp: [1.12, 1.02], haze: 0.9, amp: 0.7, shaft: lin(0xffc68a), bloom: 0.14, dust: 0.45,
      warmth: 0.22, sat: 1.08, fog: lin(0xdcc9ac), fogFar: 6000, lamps: 1.6 },
    { el: 12, azOff: 0, sun: lin(0xffa758), power: 6.2, fill: [0.64, 0.77, 0.95], hemiSky: lin(0xb9c6e6), hemiGnd: lin(0xcc9a66), hemi: 0.3, sky: 1,
      dome: [0.82, 0.6], domeTint: [1, 1, 1], skyLow: [1.36, 0.96, 0.68], skyHigh: [0.76, 0.85, 1.10], night: 0, amb: [1.06, 0.98, 0.90, 0.94],
      exp: [1.36, 0.98], haze: 1.1, amp: 0.85, shaft: lin(0xffb066), bloom: 0.18, dust: 0.25,
      warmth: 0.3, sat: 1.1, fog: lin(0xdcb38a), fogFar: 3800, lamps: 2.4 },
    { el: 5, azOff: 0, sun: lin(0xff8a3c), power: 5.6, fill: [0.6, 0.72, 0.95], hemiSky: lin(0xa9b6dc), hemiGnd: lin(0xc48a58), hemi: 0.3, sky: 1,
      dome: [0.85, 0.62], domeTint: [1, 0.95, 0.9], skyLow: [1.42, 0.90, 0.62], skyHigh: [0.70, 0.80, 1.08], night: 0, amb: [1.07, 0.96, 0.88, 0.90],
      exp: [1.5, 1.02], haze: 1.2, amp: 0.9, shaft: lin(0xff9a4c), bloom: 0.2, dust: 0.2,
      warmth: 0.34, sat: 1.1, fog: lin(0xd8a57c), fogFar: 3200, lamps: 3.0 },
  ];

  /* ---------- dedicated Time-of-Day presets (Morning, Noon, Golden Hour, Night) ---- */
  const TOD_PRESETS = {
    morning: {
      el: 24, azOff: -0.30,
      sun: lin(0xffe6cc), power: 5.8,
      fill: [0.88, 0.95, 1.06],
      hemiSky: lin(0xdce8f8), hemiGnd: lin(0xd4ccb8), hemi: 0.50,
      sky: 0.15,
      dome: [0.90, 0.64], domeTint: [0.98, 0.99, 1.05],
      skyLow: [1.24, 0.98, 0.88], skyHigh: [0.74, 0.90, 1.15], night: 0,
      amb: [0.99, 1.00, 1.03, 0.98],
      exp: [1.04, 1.05], haze: 0.82, amp: 0.62, shaft: lin(0xffe0be), bloom: 0.13, dust: 0.65,
      warmth: 0.04, sat: 1.05, fog: lin(0xd6e2ee), fogFar: 5400, lamps: 0.65,
    },
    noon: {
      el: 52, azOff: -0.16,
      sun: lin(0xfff7eb), power: 6.5,
      fill: [0.96, 0.99, 1.03],
      hemiSky: lin(0xeef4fa), hemiGnd: lin(0xddcdb6), hemi: 0.56,
      sky: 0,
      dome: [0.95, 0.68], domeTint: [0.98, 1.00, 1.04],
      skyLow: [1.04, 1.04, 1.04], skyHigh: [0.76, 0.91, 1.16], night: 0,
      amb: [1.01, 1.01, 0.99, 1.08],
      exp: [0.94, 1.05], haze: 0.35, amp: 0.35, shaft: lin(0xfff0d8), bloom: 0.09, dust: 0.85,
      warmth: 0.02, sat: 1.05, fog: lin(0xdbe4ec), fogFar: 9500, lamps: 0.35,
    },
    golden: {
      el: 11.5, azOff: 0.05,
      sun: lin(0xffa24e), power: 6.2,
      fill: [0.68, 0.78, 0.96],
      hemiSky: lin(0xc0cae8), hemiGnd: lin(0xd09862), hemi: 0.34,
      sky: 1,
      dome: [0.84, 0.60], domeTint: [1.06, 0.94, 0.84],
      skyLow: [1.40, 0.94, 0.64], skyHigh: [0.74, 0.84, 1.10], night: 0,
      amb: [1.06, 0.98, 0.90, 0.94],
      exp: [1.34, 1.02], haze: 1.12, amp: 0.86, shaft: lin(0xffae62), bloom: 0.18, dust: 0.28,
      warmth: 0.28, sat: 1.10, fog: lin(0xdcb38a), fogFar: 3800, lamps: 2.4,
    },
    night: {
      el: 25, azOff: -0.14,
      sun: lin(0x82aef2), power: 2.15,
      fill: [0.28, 0.38, 0.64],
      hemiSky: lin(0x466298), hemiGnd: lin(0x383028), hemi: 0.34,
      sky: 1,
      dome: [0.26, 0.18], domeTint: [0.46, 0.60, 0.96],
      skyLow: [0.46, 0.56, 0.86], skyHigh: [0.16, 0.24, 0.50], night: 1,
      amb: [1.05, 0.94, 0.82, 0.72],
      exp: [1.24, 1.12], haze: 0.48, amp: 0.42, shaft: lin(0x8eb6f4), bloom: 0.24, dust: 0.15,
      warmth: -0.04, sat: 1.06, fog: lin(0x1e2c4a), fogFar: 4200, lamps: 3.4,
    },
  };

  const mixV = (a, b, f) => (Array.isArray(a) ? a.map((v, i) => v + (b[i] - v) * f) : a + (b - a) * f);
  const H = {};
  function hourAt(el) {
    let i = 0;
    while (i < HOURS.length - 2 && el < HOURS[i + 1].el) i++;
    const a = HOURS[i], b = HOURS[i + 1];
    const f = Math.min(1, Math.max(0, (a.el - el) / (a.el - b.el)));
    for (const k in a) H[k] = mixV(a[k], b[k], f);
    H.el = el;
    return H;
  }
  function presetToH(p) {
    for (const k in p) H[k] = Array.isArray(p[k]) ? p[k].slice() : p[k];
    return H;
  }

  /* ---------- the clock -------------------------------------------------------------- */
  const elAt = (t) => Math.asin(0.0655 + 0.775 * Math.cos((t - 13.63) * 15 * Math.PI / 180)) * 180 / Math.PI;
  const WALK = [['door', 16.0], ['hall', 16.25], ['living', 16.7], ['dining', 17.1], ['patio', 17.65], ['olive', 18.1],
    ['gallery', 18.5], ['galleryEnd', 18.85], ['bedroom', 19.1], ['bath', 19.25], ['garden', 19.5]];
  let walkAt = null;
  function walkHour(ctx, s) {
    if (!walkAt) walkAt = WALK.map(([id, t]) => [ctx.at(id), t]);
    if (s <= walkAt[0][0]) return walkAt[0][1];
    for (let i = 1; i < walkAt.length; i++) {
      if (s < walkAt[i][0]) { const a = walkAt[i - 1], b = walkAt[i]; return a[1] + (b[1] - a[1]) * (s - a[0]) / (b[0] - a[0]); }
    }
    return walkAt[walkAt.length - 1][1];
  }

  const LOOKS = {
    warm: { hour: () => 17.17 },
    morning: { preset: 'morning', hour: () => 7.75 },
    noon: { preset: 'noon', hour: () => 13.25 },
    golden: { preset: 'golden', hour: () => 18.85 },
    night: { preset: 'night', hour: () => 21.5 },
    passes: { hour: walkHour, clock: true },
  };
  let LOOK = LOOKS[SLUG];
  if (!LOOK) return;

  function resolveH(ctx, s) {
    if (LOOK.preset && TOD_PRESETS[LOOK.preset]) return presetToH(TOD_PRESETS[LOOK.preset]);
    return hourAt(elAt(LOOK.hour(ctx, s)));
  }

  /* ---------- shared pieces ------------------------------------------------------------ */
  const SUN_CAP = 6;
  const AZ = Math.atan2(0.37, -0.93);
  const CENTRE = new THREE.Vector3(1, 0, 1), dir = new THREE.Vector3();
  let sun, hemi, dome, envMix, envRT, envScene, envCam, glow = [], clockEl = null, clockB = null, ctxRef = null;
  let elWas = -1, azWas = -99, envKey = '', clockWas = '';

  function placeSun(renderer, el, azOff) {
    const e = el * Math.PI / 180, az = AZ + (azOff || 0);
    dir.set(Math.cos(az) * Math.cos(e), Math.sin(e), Math.sin(az) * Math.cos(e));
    sun.position.copy(dir).multiplyScalar(140).add(CENTRE);
    const sc = sun.shadow.camera;
    sc.bottom = -(46 * Math.sin(e) + 1.5);
    sc.top = 46 * Math.sin(e) + 11 * Math.cos(e) + 1.5;
    sc.updateProjectionMatrix();
    renderer.shadowMap.needsUpdate = true;
  }

  function blendEnv(renderer, k, tint) {
    const key = k.toFixed(3) + tint.map((v) => v.toFixed(3)).join();
    if (key === envKey) return;
    envKey = key;
    envMix.uniforms.k.value = k;
    envMix.uniforms.tint.value.set(tint[0], tint[1], tint[2]);
    const was = renderer.getRenderTarget();
    renderer.setRenderTarget(envRT);
    renderer.render(envScene, envCam);
    renderer.setRenderTarget(was);
  }

  function capSky(renderer, hdr, k) {
    const d = hdr.image.data, n = d.length / 4, to = THREE.DataUtils.toHalfFloat;
    let f = hdr.userData.f32, lum = hdr.userData.lum;
    const some = [];
    if (f && lum) {
      for (let i = 0; i < n; i += 37) some.push(lum[i]);
    } else {
      const from = THREE.DataUtils.fromHalfFloat;
      f = new Float32Array(n * 3); lum = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const r = from(d[i * 4]), g = from(d[i * 4 + 1]), b = from(d[i * 4 + 2]);
        f[i * 3] = r; f[i * 3 + 1] = g; f[i * 3 + 2] = b;
        lum[i] = r * 0.2126 + g * 0.7152 + b * 0.0722;
        if (i % 37 === 0) some.push(lum[i]);
      }
    }
    some.sort((x, y) => x - y);
    const cap = some[Math.floor(some.length * 0.5)] * k;
    const out = d.slice();
    for (let i = 0; i < n; i++) {
      if (lum[i] > cap) {
        const q = cap / lum[i], i4 = i * 4, i3 = i * 3;
        out[i4] = to(f[i3] * q); out[i4 + 1] = to(f[i3 + 1] * q); out[i4 + 2] = to(f[i3 + 2] * q);
      }
    }
    const tex = new THREE.DataTexture(out, hdr.image.width, hdr.image.height, THREE.RGBAFormat, THREE.HalfFloatType);
    tex.mapping = hdr.mapping; tex.colorSpace = hdr.colorSpace; tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.flipY = hdr.flipY;
    tex.needsUpdate = true;
    const pm = new THREE.PMREMGenerator(renderer);
    const env = pm.fromEquirectangular(tex).texture;
    pm.dispose(); tex.dispose();
    env.userData.stats = { median: some[Math.floor(some.length * 0.5)], p90: some[Math.floor(some.length * 0.9)], p99: some[Math.floor(some.length * 0.99)], max: some[some.length - 1], cap };
    return env;
  }

  function applyImmediate(renderer, h) {
    placeSun(renderer, h.el, h.azOff || 0);
    elWas = h.el; azWas = h.azOff || 0;
    sun.color.setRGB(h.sun[0], h.sun[1], h.sun[2]);
    sun.intensity = h.power;
    if (hemi) {
      hemi.color.setRGB(h.hemiSky[0], h.hemiSky[1], h.hemiSky[2]);
      hemi.groundColor.setRGB(h.hemiGnd[0], h.hemiGnd[1], h.hemiGnd[2]);
      hemi.intensity = h.hemi;
    }
    blendEnv(renderer, h.sky, h.fill);
    if (dome) {
      const du = dome.uniforms;
      du.mixK.value = h.sky;
      du.intensity.value = h.dome[0];
      du.tint.value.set(h.domeTint[0], h.domeTint[1], h.domeTint[2]);
      du.skyLow.value.set(h.skyLow[0], h.skyLow[1], h.skyLow[2]);
      du.skyHigh.value.set(h.skyHigh[0], h.skyHigh[1], h.skyHigh[2]);
      du.uNight.value = h.night || 0;
    }
    if (window.__look && window.__look.amb && h.amb) {
      window.__look.amb.set(h.amb[0], h.amb[1], h.amb[2], h.amb[3]);
    }
  }

  window.LINTEL_LIGHT = {
    slug: SLUG,
    async build(ctx, R) {
      ctxRef = ctx;
      const { scene, renderer } = ctx;
      sun = R.sun;
      scene.traverse((o) => { if (o.isHemisphereLight) hemi = o; });

      // Generate the low-sun sunset panorama in code if needed (0 network requests)
      const late = window.LINTEL_CODESKY
        ? window.LINTEL_CODESKY.make(THREE, renderer, { sunAzimuth: AZ, sunElevation: 8.5 * Math.PI / 180, noEnv: true })
        : null;

      const old = R.skyMat;
      dome = new THREE.ShaderMaterial({
        uniforms: {
          map: { value: R.sky.bg },
          map2: { value: late ? late.bg : R.sky.bg },
          mixK: { value: 0 },
          paper: old.uniforms.paper,
          intensity: { value: 0.86 },
          tint: { value: new THREE.Vector3(1, 1, 1) },
          skyLow: { value: new THREE.Vector3(1.2, 1.02, 0.8) },
          skyHigh: { value: new THREE.Vector3(0.84, 0.93, 1.08) },
          uNight: { value: 0 },
        },
        vertexShader: old.vertexShader,
        fragmentShader: `uniform sampler2D map; uniform sampler2D map2; uniform float mixK; uniform float paper; uniform float intensity;
          uniform vec3 tint; uniform vec3 skyLow; uniform vec3 skyHigh; uniform float uNight; varying vec3 vDir;
          float hStar(vec3 p) { p = fract(p * vec3(443.897, 441.423, 437.195)); p += dot(p, p.yzx + 19.19); return fract((p.x + p.y) * p.z); }
          void main() {
            vec3 d = normalize(vDir);
            vec2 uv = vec2(atan(d.z, d.x) * 0.15915494 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5);
            vec2 gx = dFdx(uv), gy = dFdy(uv); gx.x -= floor(gx.x + 0.5); gy.x -= floor(gy.x + 0.5);
            vec3 c = mix(textureGrad(map, uv, gx, gy).rgb, textureGrad(map2, uv, gx, gy).rgb, mixK) * intensity * tint;
            c *= mix(skyLow, skyHigh, smoothstep(-0.02, 0.36, d.y));
            if (uNight > 0.01 && d.y > 0.01) {
              vec3 sg = floor(d * 380.0);
              float st = smoothstep(0.9945, 0.9992, hStar(sg)) * smoothstep(0.02, 0.22, d.y);
              c += vec3(0.78, 0.86, 1.0) * st * 0.55 * uNight;
            }
            gl_FragColor = vec4(c * (1.0 - step(0.999, paper)), paper);
          }`,
        side: THREE.BackSide, depthWrite: false, fog: false,
      });
      scene.traverse((o) => { if (o.material === old) o.material = dome; });

      const a = capSky(renderer, R.sky.hdr, SUN_CAP), b = late ? capSky(renderer, late.hdr, SUN_CAP) : a;
      envRT = new THREE.WebGLRenderTarget(a.image.width, a.image.height, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, colorSpace: THREE.LinearSRGBColorSpace,
        magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter, generateMipmaps: false, depthBuffer: false });
      envRT.texture.mapping = THREE.CubeUVReflectionMapping;
      envMix = new THREE.ShaderMaterial({
        uniforms: { a: { value: a }, b: { value: b }, k: { value: 0 }, tint: { value: new THREE.Vector3(1, 1, 1) } },
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: 'uniform sampler2D a; uniform sampler2D b; uniform float k; uniform vec3 tint; varying vec2 vUv; void main() { gl_FragColor = vec4(mix(texture2D(a, vUv).rgb, texture2D(b, vUv).rgb, k) * tint, 1.0); }',
        depthTest: false, depthWrite: false, toneMapped: false,
      });
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), envMix);
      quad.frustumCulled = false;
      envScene = new THREE.Scene(); envScene.add(quad);
      envCam = new THREE.Camera();

      const h0 = resolveH(ctx, 0);
      scene.environment = envRT.texture;
      applyImmediate(renderer, h0);

      const seen = new Set();
      scene.traverse((o) => {
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
          if (m && m.emissive && m.emissiveIntensity > 0 && m.emissive.r + m.emissive.g + m.emissive.b > 0 && !seen.has(m)) { seen.add(m); glow.push([m, m.emissiveIntensity]); }
        });
      });

      if (LOOK.clock) {
        const st = document.createElement('style');
        st.textContent = `.hour { position: fixed; z-index: 25; right: var(--gutter); bottom: 44px; margin: 0; display: flex; align-items: center; gap: 8px;
            font: 500 11px/1 var(--label); letter-spacing: 0.14em; color: var(--ruler-fg, var(--fg)); opacity: 0; transition: opacity 0.6s; pointer-events: none; }
          .hour i { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); }
          .hour.on { opacity: 1; }`;
        document.head.appendChild(st);
        clockEl = document.createElement('p');
        clockEl.className = 'hour';
        clockEl.setAttribute('aria-label', 'Time of day in the house');
        clockEl.innerHTML = '<i></i><b></b>';
        clockB = clockEl.querySelector('b');
        document.body.appendChild(clockEl);
      }

      const syncBtns = () => {
        document.querySelectorAll('[data-tod]').forEach((b) => {
          const on = b.dataset.tod === SLUG;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      };
      document.querySelectorAll('[data-tod]').forEach((b) => {
        b.addEventListener('click', (e) => {
          e.preventDefault();
          if (window.__light) window.__light.setTod(b.dataset.tod);
        });
      });
      syncBtns();

      window.__light = {
        get slug() { return SLUG; },
        HOURS, TOD_PRESETS, hourAt, elAt, state: H, over: null, sky: [a.userData.stats, b.userData.stats],
        setTod(name) {
          if (!LOOKS[name]) return;
          SLUG = name;
          LOOK = LOOKS[name];
          window.LINTEL_LIGHT.slug = name;
          syncBtns();
          const hn = resolveH(ctxRef, 0);
          applyImmediate(ctxRef.renderer, hn);
          if (window.__look && window.__look.recapture) window.__look.recapture();
        },
      };
    },

    frame(ctx, st, P, I) {
      const t = LOOK.hour(ctx, I.s);
      const o = window.__light.over;
      const h = resolveH(ctx, I.s);
      if (o) {
        if (o.aboveK != null) h.el = h.el + (60 - h.el) * o.aboveK;
        else if (o.el != null) h.el = o.el;
      }

      const azOff = h.azOff || 0;
      if (Math.abs(h.el - elWas) > 0.003 || Math.abs(azOff - azWas) > 0.003) {
        elWas = h.el; azWas = azOff;
        placeSun(ctx.renderer, h.el, azOff);
      }
      sun.color.setRGB(h.sun[0], h.sun[1], h.sun[2]);
      sun.intensity = h.power;
      if (hemi) { hemi.color.setRGB(h.hemiSky[0], h.hemiSky[1], h.hemiSky[2]); hemi.groundColor.setRGB(h.hemiGnd[0], h.hemiGnd[1], h.hemiGnd[2]); hemi.intensity = h.hemi; }

      blendEnv(ctx.renderer, h.sky, h.fill);
      const du = dome.uniforms;
      du.mixK.value = h.sky;
      du.intensity.value = h.dome[1] + (h.dome[0] - h.dome[1]) * I.outdoorK;
      du.tint.value.set(h.domeTint[0], h.domeTint[1], h.domeTint[2]);
      if (h.skyLow) du.skyLow.value.set(h.skyLow[0], h.skyLow[1], h.skyLow[2]);
      if (h.skyHigh) du.skyHigh.value.set(h.skyHigh[0], h.skyHigh[1], h.skyHigh[2]);
      du.uNight.value = h.night || 0;
      if (window.__look && window.__look.amb && h.amb) {
        window.__look.amb.set(h.amb[0], h.amb[1], h.amb[2], h.amb[3]);
      }
      if (ctx.scene.fog) { ctx.scene.fog.color.setRGB(h.fog[0], h.fog[1], h.fog[2]); ctx.scene.fog.far = ctx.scene.fog.near + h.fogFar; }

      if (I.stage) I.stage.lights.forEach((l) => { l.l.intensity *= h.lamps; });
      const gk = 1 + (h.lamps - 1) * 0.55;
      glow.forEach((g) => { g[0].emissiveIntensity = g[1] * gk; });

      P.exposure *= h.exp[1] + (h.exp[0] - h.exp[1]) * I.outdoorK;
      P.shafts *= h.haze;
      P.shaftAmp *= h.amp;
      P.shaftCol = h.shaft;
      P.bloomAmt = h.bloom;
      P.sunDust *= h.dust;
      if (ctx.post.dustScene) ctx.post.dustScene.children.forEach((d) => { d.material.uniforms.uColor.value.setRGB(1, 0.62 + 0.38 * h.sun[1], 0.4 + 0.6 * h.sun[2]); });
      P.warmth = h.warmth;
      P.saturation = h.sat;
      P.contrast = 1.14;
      const cool = Math.max(0, h.warmth / 0.3);
      P.lift = [0.0, 0.003 * cool, 0.012 * cool];
      P.gain = [1.0, 1 - 0.006 * cool, 1 - 0.03 * cool];

      if (clockEl) {
        const m = Math.round(t * 60), txt = String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
        if (txt !== clockWas) { clockWas = txt; clockB.textContent = txt; }
        clockEl.classList.toggle('on', (I.inside > 0.5 || I.outside > 0.5) && I.backRaw < 0.3);
      }
    },
  };
})();
