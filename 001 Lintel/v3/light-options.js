/* ==========================================================================
   Lintel, light options (6 Oct 2026). Three looks for the walk, behind ?light=

     ?light=warm     Warm Afternoon. Ten past five all the way, photographed better. The default since 9 Oct
     ?light=golden   Golden Hour. Seven in the evening all the way: a low amber sun, blue shade, lamps on
     ?light=passes   The Afternoon Passes. Four o'clock at the front door, half past seven in the garden
     ?light=off      the light as it was before 9 Oct (one nearly white sun, and the glare)

   Warm Afternoon became the default on 9 Oct: it keeps the hour the page always had and removes the glare
   (the sun that was in the scene twice), which Sam's review of that day needed for the bedroom, the bath
   and the garden. Which hour the page ends up with is still his pick.

   One idea carries all three: the light is a function of one number, how high the
   sun stands. HOURS says what the sun, the sky, the shade and the camera do at five
   heights between 44 and 5 degrees. A look is then only a clock: fixed for the first
   two, tied to the scroll for the third.

   The sky and its light change together. Two skies are loaded (late afternoon and
   sunset). The dome crossfades between the two photographs, and the light the sky
   gives (reflections and fill) is the same crossfade done on the two prefiltered
   environment maps into a third one, which is the one the scene uses.

   scene.js calls build once the house stands, and frame at the end of its own frame.
   ========================================================================== */
(function () {
  'use strict';
  const SLUG = new URLSearchParams(location.search).get('light') || 'warm';
  const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };

  /* ---------- the sun, by how high it stands ---------------------------------------
     sun, power   colour and strength of the direct light
     fill         tint of everything the sky gives (shade, reflections)
     hemi         the bounce light: sky colour, ground colour, strength
     sky          0 the afternoon sky, 1 the sunset sky
     dome         how bright the sky reads [outdoors, from inside a room], and its tint
     exp          exposure, on top of what each room asks for [outdoors, indoors]
     haze, amp    sunlit air: how dense and how bright. shaft is its colour
     bloom, dust  the glow round highlights, and how much dust shows in the sunlit air
     fog, fogFar  the colour of the distance and how far you can see
     lamps        how much the lamps and pendants give */
  const HOURS = [
    { el: 44, sun: lin(0xfff0dc), power: 6.0, fill: [1.0, 1.0, 1.0], hemiSky: lin(0xeef0f0), hemiGnd: lin(0xd8c8b0), hemi: 0.5, sky: 0,
      dome: [0.84, 0.6], domeTint: [1, 1, 1], exp: [0.98, 1.04], haze: 0.5, amp: 0.45, shaft: lin(0xffe6c8), bloom: 0.1, dust: 1.0,
      warmth: 0.06, sat: 1.04, fog: lin(0xcfd6da), fogFar: 9000, lamps: 0.7 },
    { el: 32, sun: lin(0xffd9a8), power: 6.2, fill: [0.9, 0.92, 1.0], hemiSky: lin(0xe6e6ea), hemiGnd: lin(0xd8be98), hemi: 0.46, sky: 0,
      dome: [0.9, 0.56], domeTint: [1, 0.97, 0.92], exp: [0.98, 1.04], haze: 0.6, amp: 0.5, shaft: lin(0xffd9a6), bloom: 0.1, dust: 0.8,
      warmth: 0.14, sat: 1.06, fog: lin(0xd0d5d4), fogFar: 8500, lamps: 1.0 },
    { el: 20, sun: lin(0xffc282), power: 6.4, fill: [0.78, 0.82, 0.98], hemiSky: lin(0xcfd6ea), hemiGnd: lin(0xd4ac7c), hemi: 0.4, sky: 0,
      dome: [0.78, 0.56], domeTint: [1, 0.93, 0.84], exp: [1.12, 1.02], haze: 0.9, amp: 0.7, shaft: lin(0xffc68a), bloom: 0.14, dust: 0.45,
      warmth: 0.22, sat: 1.08, fog: lin(0xdcc9ac), fogFar: 6000, lamps: 1.6 },
    { el: 12, sun: lin(0xffa758), power: 6.2, fill: [0.64, 0.77, 0.95], hemiSky: lin(0xb9c6e6), hemiGnd: lin(0xcc9a66), hemi: 0.3, sky: 1,
      dome: [0.82, 0.6], domeTint: [1, 1, 1], exp: [1.36, 0.98], haze: 1.1, amp: 0.85, shaft: lin(0xffb066), bloom: 0.18, dust: 0.25,
      warmth: 0.3, sat: 1.1, fog: lin(0xdcb38a), fogFar: 3800, lamps: 2.4 },
    { el: 5, sun: lin(0xff8a3c), power: 5.6, fill: [0.6, 0.72, 0.95], hemiSky: lin(0xa9b6dc), hemiGnd: lin(0xc48a58), hemi: 0.3, sky: 1,
      dome: [0.85, 0.62], domeTint: [1, 0.95, 0.9], exp: [1.5, 1.02], haze: 1.2, amp: 0.9, shaft: lin(0xff9a4c), bloom: 0.2, dust: 0.2,
      warmth: 0.34, sat: 1.1, fog: lin(0xd8a57c), fogFar: 3200, lamps: 3.0 },
  ];
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

  /* ---------- the clock --------------------------------------------------------------
     Sintra, early September: the sun is highest at 13:38 and sets a little before eight. */
  const elAt = (t) => Math.asin(0.0655 + 0.775 * Math.cos((t - 13.63) * 15 * Math.PI / 180)) * 180 / Math.PI;
  // the hour at each stop of the walk, for the look that lets the afternoon pass
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
    golden: { hour: () => 19.0 },
    passes: { hour: walkHour, clock: true },
  };
  const LOOK = LOOKS[SLUG];
  if (!LOOK) return;

  /* ---------- shared pieces ------------------------------------------------------------ */
  const SUN_CAP = 6;                                        // the sky map's sun, in times the middle brightness of the sky
  const AZ = Math.atan2(0.37, -0.93);                       // the sun keeps its bearing, west south west
  const CENTRE = new THREE.Vector3(1, 0, 1), dir = new THREE.Vector3();
  let sun, hemi, dome, envMix, envRT, envScene, envCam, glow = [], clockEl = null, clockB = null;
  let elWas = -1, envKey = '', clockWas = '';

  // the sun moves: its shadow box is fitted to the house as seen from the new height, so a low
  // sun keeps the same crisp shadow edge as a high one, and the shadow map is drawn again
  function placeSun(renderer, el) {
    const e = el * Math.PI / 180;
    dir.set(Math.cos(AZ) * Math.cos(e), Math.sin(e), Math.sin(AZ) * Math.cos(e));
    sun.position.copy(dir).multiplyScalar(140).add(CENTRE);
    const sc = sun.shadow.camera;
    sc.bottom = -(46 * Math.sin(e) + 1.5);
    sc.top = 46 * Math.sin(e) + 11 * Math.cos(e) + 1.5;
    sc.updateProjectionMatrix();
    renderer.shadowMap.needsUpdate = true;
  }

  // the light of the sky: the two prefiltered maps, crossfaded and tinted into the one the scene reads
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

  // The sun is in the scene twice: as the light that casts the shadows, and as the brightest spot of the
  // sky map, where no wall can shade it. Indoors that second sun mirrors off the floors as a white glare.
  // So the sky map is rebuilt with its sun capped at a few times the brightness of the sky around it.
  function capSky(renderer, hdr, k) {
    const d = hdr.image.data, n = d.length / 4, from = THREE.DataUtils.fromHalfFloat, to = THREE.DataUtils.toHalfFloat;
    const f = new Float32Array(n * 3), lum = new Float32Array(n), some = [];
    for (let i = 0; i < n; i++) {
      const r = from(d[i * 4]), g = from(d[i * 4 + 1]), b = from(d[i * 4 + 2]);
      f[i * 3] = r; f[i * 3 + 1] = g; f[i * 3 + 2] = b;
      lum[i] = r * 0.2126 + g * 0.7152 + b * 0.0722;
      if (i % 37 === 0) some.push(lum[i]);
    }
    some.sort((x, y) => x - y);
    const cap = some[Math.floor(some.length * 0.5)] * k;
    const out = new Uint16Array(d.length);
    for (let i = 0; i < n; i++) {
      const q = lum[i] > cap ? cap / lum[i] : 1;
      out[i * 4] = to(f[i * 3] * q); out[i * 4 + 1] = to(f[i * 3 + 1] * q); out[i * 4 + 2] = to(f[i * 3 + 2] * q); out[i * 4 + 3] = d[i * 4 + 3];
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

  window.LINTEL_LIGHT = {
    slug: SLUG,
    async build(ctx, R) {
      const { scene, renderer, loader } = ctx;
      sun = R.sun;
      scene.traverse((o) => { if (o.isHemisphereLight) hemi = o; });

      // the second sky, turned so its sun stands on the same bearing
      const late = LOOK === LOOKS.warm ? null : await loader.sky(R.SKY + 'qwantani_sunset_puresky_1k.hdr', R.SKY + 'qwantani_sunset_puresky.jpg', { sunAzimuth: AZ });

      // the dome: the first sky's shader with a second photograph to fade to. It shares the paper
      // switch with the old material, so scene.js goes on turning the sky into paper and back.
      const old = R.skyMat;
      dome = new THREE.ShaderMaterial({
        uniforms: { map: { value: R.sky.bg }, map2: { value: late ? late.bg : R.sky.bg }, mixK: { value: 0 }, paper: old.uniforms.paper,
          intensity: { value: 0.86 }, tint: { value: new THREE.Vector3(1, 1, 1) } },
        vertexShader: old.vertexShader,
        fragmentShader: `uniform sampler2D map; uniform sampler2D map2; uniform float mixK; uniform float paper; uniform float intensity; uniform vec3 tint; varying vec3 vDir;
          void main() { vec3 d = normalize(vDir); vec2 uv = vec2(atan(d.z, d.x) * 0.15915494 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5);
            vec3 c = mix(texture2D(map, uv).rgb, texture2D(map2, uv).rgb, mixK) * intensity * tint; gl_FragColor = vec4(c * (1.0 - step(0.999, paper)), paper); }`,
        side: THREE.BackSide, depthWrite: false, fog: false,
      });
      scene.traverse((o) => { if (o.material === old) o.material = dome; });

      // the environment the scene reads: a render target laid out like a prefiltered map
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
      const h0 = hourAt(elAt(LOOK.hour(ctx, 0)));
      blendEnv(renderer, h0.sky, h0.fill);
      scene.environment = envRT.texture;
      placeSun(renderer, h0.el); elWas = h0.el;

      // everything that glows by itself (bulbs, shades, the lit niche), to turn up with the lamps
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
      window.__light = { HOURS, hourAt, elAt, state: H, over: null, sky: [a.userData.stats, b.userData.stats] };
    },

    frame(ctx, st, P, I) {
      const t = LOOK.hour(ctx, I.s);
      const o = window.__light.over;
      const h = hourAt(o && o.el != null ? o.el : elAt(t));
      if (o) Object.assign(h, o);

      // the sun and what it throws
      if (Math.abs(h.el - elWas) > 0.003) { elWas = h.el; placeSun(ctx.renderer, h.el); }
      sun.color.setRGB(h.sun[0], h.sun[1], h.sun[2]);
      sun.intensity = h.power;
      if (hemi) { hemi.color.setRGB(h.hemiSky[0], h.hemiSky[1], h.hemiSky[2]); hemi.groundColor.setRGB(h.hemiGnd[0], h.hemiGnd[1], h.hemiGnd[2]); hemi.intensity = h.hemi; }

      // the sky you see and the light it gives
      blendEnv(ctx.renderer, h.sky, h.fill);
      const du = dome.uniforms;
      du.mixK.value = h.sky;
      du.intensity.value = h.dome[1] + (h.dome[0] - h.dome[1]) * I.outdoorK;
      du.tint.value.set(h.domeTint[0], h.domeTint[1], h.domeTint[2]);
      if (ctx.scene.fog) { ctx.scene.fog.color.setRGB(h.fog[0], h.fog[1], h.fog[2]); ctx.scene.fog.far = ctx.scene.fog.near + h.fogFar; }

      // the lamps come up as the sun goes down
      if (I.stage) I.stage.lights.forEach((l) => { l.l.intensity *= h.lamps; });
      const gk = 1 + (h.lamps - 1) * 0.5;
      glow.forEach((g) => { g[0].emissiveIntensity = g[1] * gk; });

      // the camera: exposure, sunlit air, and a grade with cool shadows under warm highlights
      P.exposure *= h.exp[1] + (h.exp[0] - h.exp[1]) * I.outdoorK;
      P.shafts *= h.haze;
      P.shaftAmp *= h.amp;
      P.shaftCol = h.shaft;
      P.bloomAmt = h.bloom;
      // a low sun lights all the air in a room at once, and that much dust reads as snow
      P.sunDust *= h.dust;
      if (ctx.post.dustScene) ctx.post.dustScene.children.forEach((d) => { d.material.uniforms.uColor.value.setRGB(1, 0.62 + 0.38 * h.sun[1], 0.4 + 0.6 * h.sun[2]); });
      P.warmth = h.warmth;
      P.saturation = h.sat;
      P.contrast = 1.14;
      const cool = h.warmth / 0.3;
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
