/* ==========================================================================
   fx-ink.js
   A clean, drawn finish: no paint filter, nothing blurred away.

     prepass   view normals + depth, at full resolution so lines are crisp
     scene     HDR render, MSAA
     ao/bloom  soft contact shadows and a little glow
     composite a gentle tone curve that keeps authored colours as they are,
               then ink lines where depth or surface direction breaks, paper
               fibre, grain, vignette, and the dust scene drawn on top.

   Lines: `ink` (0..1), `inkCol`, `inkWidth` (px), `inkDepth` (how big a jump
   in depth makes a line), `inkNormal` (how sharp a crease makes a line),
   `inkFar` (distance where lines start to thin out).

   Also here: FX.toon() for flat colour with soft banded light, and
   FX.hatch() which turns any material into pen hatching on paper.
   Same interface as FX.Finisher: setSize(), render(scene, camera, P), u.
   ========================================================================== */
window.FX = window.FX || {};
(function (FX) {
  'use strict';

  const VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const PRE_VS = `
    #include <common>
    #include <skinning_pars_vertex>
    varying vec3 vN; varying float vZ;
    void main() {
      #include <beginnormal_vertex>
      #include <defaultnormal_vertex>
      #include <begin_vertex>
      #include <project_vertex>
      vN = normalize(transformedNormal); vZ = -mvPosition.z;
    }`;
  const PRE_FS = `varying vec3 vN; varying float vZ;
    void main() { vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n; gl_FragColor = vec4(n * 0.5 + 0.5, 1.0 / (1.0 + vZ)); }`;

  const AO_FS = `
    uniform sampler2D tPre; uniform vec2 res; uniform vec2 tanHalf; uniform float radius; uniform vec3 kernel[12];
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 pre = texture2D(tPre, vUv);
      if (pre.w < 1e-5) { gl_FragColor = vec4(1.0); return; }
      float z = 1.0 / pre.w - 1.0;
      vec3 n = normalize(pre.xyz * 2.0 - 1.0);
      vec3 p = vec3((vUv * 2.0 - 1.0) * tanHalf * z, -z);
      float a = hash(vUv * res) * 6.2831853;
      vec3 rv = vec3(cos(a), sin(a), 0.0);
      vec3 t = normalize(rv - n * dot(rv, n)), b = cross(n, t);
      mat3 tbn = mat3(t, b, n);
      float rad = radius * (0.5 + 0.5 * clamp(z / 10.0, 0.0, 1.0));
      float occ = 0.0;
      for (int i = 0; i < 12; i++) {
        vec3 s = p + tbn * kernel[i] * rad;
        float sz = -s.z;
        vec2 suv = (s.xy / (sz * tanHalf)) * 0.5 + 0.5;
        if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) continue;
        float dw = texture2D(tPre, suv).w;
        float d = dw < 1e-5 ? 1e5 : 1.0 / dw - 1.0;
        occ += (d < sz - 0.02 * rad ? 1.0 : 0.0) * smoothstep(0.0, 1.0, rad / abs(z - d));
      }
      gl_FragColor = vec4(vec3(1.0 - occ / 12.0), 1.0);
    }`;
  const BLUR_FS = `
    uniform sampler2D tSrc; uniform vec2 dir; varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tSrc, vUv) * 0.2270270270;
      c += (texture2D(tSrc, vUv + dir * 1.3846153846) + texture2D(tSrc, vUv - dir * 1.3846153846)) * 0.3162162162;
      c += (texture2D(tSrc, vUv + dir * 3.2307692308) + texture2D(tSrc, vUv - dir * 3.2307692308)) * 0.0702702703;
      gl_FragColor = c;
    }`;
  const BRIGHT_FS = `
    uniform sampler2D tSrc; uniform float threshold; uniform float exposure; varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tSrc, vUv).rgb * exposure;
      float l = max(c.r, max(c.g, c.b));
      gl_FragColor = vec4(c * smoothstep(threshold, threshold * 2.0 + 0.5, l), 1.0);
    }`;

  const COMP_FS = `
    uniform sampler2D tScene; uniform sampler2D tAO; uniform sampler2D tBloom; uniform sampler2D tBloom2; uniform sampler2D tPre;
    uniform sampler2D tDust; uniform sampler2D tDustB;
    uniform vec2 res; uniform vec2 preTexel; uniform float time;
    uniform float exposure; uniform float contrast; uniform float saturation; uniform float warmth; uniform vec3 lift; uniform vec3 gain;
    uniform float aoAmt; uniform float bloomAmt;
    uniform float ink; uniform vec3 inkCol; uniform float inkWidth; uniform float inkDepth; uniform float inkNormal; uniform float inkFar;
    uniform float paper; uniform vec3 paperCol; uniform float grain; uniform float vignette; uniform float fadeBlack; uniform vec3 fadeCol;
    uniform float dof; uniform float focus; uniform float dofNear; uniform float dustAmt;
    varying vec2 vUv;
    float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
    float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * vnoise(p); p *= 2.03; a *= 0.5; } return v; }
    float wAt(vec2 uv) { return texture2D(tPre, uv).w; }
    float zOf(float w) { return w < 1e-5 ? 1e5 : 1.0 / w - 1.0; }
    // how much of a line this sample sits on: depth breaks (second difference of 1/z, flat
    // for any plane, so grazing floors stay clean) and creases (normals turning)
    float edge(vec2 uv) {
      vec2 px = preTexel * inkWidth;
      vec4 c = texture2D(tPre, uv);
      float w0 = c.w; vec3 n0 = c.xyz * 2.0 - 1.0;
      float lz = 0.0, en = 0.0;
      for (int i = 0; i < 4; i++) {
        vec2 d = (i == 0 ? vec2(1.0, 0.0) : i == 1 ? vec2(0.0, 1.0) : i == 2 ? vec2(0.7071, 0.7071) : vec2(0.7071, -0.7071)) * px;
        vec4 a = texture2D(tPre, uv + d), b = texture2D(tPre, uv - d);
        // positive only on the nearer side of a depth break, so a silhouette gets one line, not two
        lz = max(lz, (w0 - 0.5 * (a.w + b.w)) / max(w0, 1e-6));
        en = max(en, max(1.0 - dot(n0, a.xyz * 2.0 - 1.0), 1.0 - dot(n0, b.xyz * 2.0 - 1.0)));
      }
      lz = smoothstep(inkDepth, inkDepth * 2.2, lz) * step(1e-5, w0);
      float ln = smoothstep(inkNormal, inkNormal * 1.8, en) * step(1e-5, w0);
      return max(lz, ln * 0.85);
    }
    vec3 shoulder(vec3 x) {
      vec3 k = vec3(0.72);
      return mix(x, k + (1.0 - k) * (1.0 - exp(-(x - k) / (1.0 - k))), step(k, x));
    }
    void main() {
      vec2 uv = vUv;
      vec3 hdr = texture2D(tScene, uv).rgb;
      float w0 = texture2D(tPre, uv).w;
      float z0 = zOf(w0);
      if (dof > 0.0) {
        float coc = z0 > focus ? clamp((z0 - focus) / z0, 0.0, 1.0) : clamp((focus - z0) / max(z0, 0.05), 0.0, 1.0) * dofNear;
        coc = clamp(coc * dof, 0.0, 1.0);
        if (coc > 0.03) {
          vec3 acc = hdr; float ws = 1.0;
          float r = coc * 12.0 * res.y / 900.0;
          for (int i = 0; i < 20; i++) {
            float fi = float(i) + 0.5, a = fi * 2.39996;
            acc += texture2D(tScene, uv + vec2(cos(a), sin(a)) * sqrt(fi / 20.0) * r / res).rgb; ws += 1.0;
          }
          hdr = acc / ws;
        }
      }
      hdr *= mix(1.0, texture2D(tAO, uv).r, aoAmt);
      hdr += (texture2D(tBloom, uv).rgb * 0.6 + texture2D(tBloom2, uv).rgb * 0.9) * bloomAmt;
      vec3 c = shoulder(max(hdr * exposure, 0.0));
      c = pow(c, vec3(1.0 / 2.2));
      c.r *= 1.0 + warmth * 0.08; c.b *= 1.0 - warmth * 0.1;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, saturation);
      c = (c - 0.5) * contrast + 0.5;
      c = lift + c * (gain - lift);
      // ink: four sub-samples for smooth edges, thinner far away
      if (ink > 0.0) {
        vec2 q = preTexel * 0.35;
        float e = (edge(uv + vec2(q.x, q.y)) + edge(uv + vec2(-q.x, q.y)) + edge(uv + vec2(q.x, -q.y)) + edge(uv - q)) * 0.25;
        e *= mix(1.0, 0.45, smoothstep(inkFar * 0.4, inkFar, z0));
        e *= 1.0 - dof * smoothstep(0.2, 0.8, abs(z0 - focus) / max(z0, 0.1)) * 0.8;
        c = mix(c, inkCol, clamp(e, 0.0, 1.0) * ink);
      }
      // paper: fibre and a little tooth, tinted
      vec2 px = uv * res;
      float fib = fbm(px * vec2(0.09, 0.35)) * 0.6 + fbm(px * 0.012 + 7.0) * 0.4;
      c *= mix(vec3(1.0), paperCol * (0.94 + 0.12 * fib), paper);
      vec3 d = texture2D(tDust, uv).rgb + texture2D(tDustB, uv).rgb * 0.8;
      c = 1.0 - (1.0 - c) * (1.0 - clamp(d * dustAmt, 0.0, 1.0));
      vec2 vq = uv - 0.5; vq.x *= res.x / res.y;
      c *= mix(1.0, smoothstep(1.15, 0.25, length(vq)), vignette);
      c += (hash(px + fract(time * 7.0) * 431.0) - 0.5) * grain;
      c = mix(c, fadeCol, fadeBlack);
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`;

  class InkFinisher {
    constructor(renderer, opts) {
      this.r = renderer;
      this.opts = Object.assign({ preScale: 1, msaa: 4 }, opts || {});
      this.qs = new THREE.Scene();
      this.qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
      this.quad.frustumCulled = false;
      this.qs.add(this.quad);
      const mk = (fs, u) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms: u, depthTest: false, depthWrite: false });
      this.preMat = new THREE.ShaderMaterial({ vertexShader: PRE_VS, fragmentShader: PRE_FS, side: THREE.DoubleSide });
      const R = FX.rng(19), kernel = [];
      for (let i = 0; i < 12; i++) {
        const v = new THREE.Vector3(R() * 2 - 1, R() * 2 - 1, R() * 0.9 + 0.1).normalize();
        const s = i / 12; kernel.push(v.multiplyScalar((0.12 + 0.88 * s * s) * (0.5 + R() * 0.5)));
      }
      this.mAO = mk(AO_FS, { tPre: { value: null }, res: { value: new THREE.Vector2() }, tanHalf: { value: new THREE.Vector2() }, radius: { value: 0.5 }, kernel: { value: kernel } });
      this.mBlur = mk(BLUR_FS, { tSrc: { value: null }, dir: { value: new THREE.Vector2() } });
      this.mBright = mk(BRIGHT_FS, { tSrc: { value: null }, threshold: { value: 1.3 }, exposure: { value: 1 } });
      this.mComp = mk(COMP_FS, {
        tScene: { value: null }, tAO: { value: null }, tBloom: { value: null }, tBloom2: { value: null }, tPre: { value: null }, tDust: { value: null }, tDustB: { value: null },
        res: { value: new THREE.Vector2() }, preTexel: { value: new THREE.Vector2() }, time: { value: 0 },
        exposure: { value: 1 }, contrast: { value: 1 }, saturation: { value: 1 }, warmth: { value: 0 },
        lift: { value: new THREE.Vector3(0, 0, 0) }, gain: { value: new THREE.Vector3(1, 1, 1) },
        aoAmt: { value: 0.6 }, bloomAmt: { value: 0.2 },
        ink: { value: 1 }, inkCol: { value: new THREE.Vector3(0.1, 0.09, 0.08) }, inkWidth: { value: 1 }, inkDepth: { value: 0.012 }, inkNormal: { value: 0.28 }, inkFar: { value: 400 },
        paper: { value: 0 }, paperCol: { value: new THREE.Vector3(1, 0.98, 0.94) }, grain: { value: 0.02 }, vignette: { value: 0.25 },
        fadeBlack: { value: 1 }, fadeCol: { value: new THREE.Vector3(0, 0, 0) },
        dof: { value: 0 }, focus: { value: 10 }, dofNear: { value: 1 }, dustAmt: { value: 1 },
      });
      this.u = Object.assign({}, this.mComp.uniforms, { aoRadius: this.mAO.uniforms.radius, bloomThreshold: this.mBright.uniforms.threshold });
      this.dustScene = null;
      this.targets = [];
    }
    setSize(w, h, outW, outH) {
      this.targets.forEach((t) => t.dispose());
      const hf = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
      const T = (ww, hh, o) => new THREE.WebGLRenderTarget(Math.max(2, Math.round(ww)), Math.max(2, Math.round(hh)), o || hf);
      this.rtScene = T(w, h, { type: THREE.HalfFloatType, samples: this.opts.msaa, depthBuffer: true });
      // depth is stored as 1/(1+z); full float keeps far lines steady on telephoto plates
      this.rtPre = T(w * this.opts.preScale, h * this.opts.preScale, { type: THREE.FloatType, depthBuffer: true, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
      this.rtAO = T(w / 2, h / 2); this.rtAO2 = T(w / 2, h / 2);
      this.rtB1 = T(w / 4, h / 4); this.rtB2 = T(w / 4, h / 4);
      this.rtC1 = T(w / 10, h / 10); this.rtC2 = T(w / 10, h / 10);
      this.rtDust = T(outW * 0.75, outH * 0.75, { type: THREE.HalfFloatType, depthBuffer: false });
      this.rtDustB = T(outW / 6, outH / 6); this.rtDustB2 = T(outW / 6, outH / 6);
      this.targets = [this.rtScene, this.rtPre, this.rtAO, this.rtAO2, this.rtB1, this.rtB2, this.rtC1, this.rtC2, this.rtDust, this.rtDustB, this.rtDustB2];
      this.mAO.uniforms.res.value.set(w / 2, h / 2);
      this.mComp.uniforms.res.value.set(outW, outH);
      this.mComp.uniforms.preTexel.value.set(1 / this.rtPre.width, 1 / this.rtPre.height);
      this.dustRes = new THREE.Vector2(this.rtDust.width, this.rtDust.height);
    }
    pass(mat, target) { this.quad.material = mat; this.r.setRenderTarget(target); this.r.render(this.qs, this.qc); }
    blur(a, b, scale) {
      this.mBlur.uniforms.tSrc.value = a.texture; this.mBlur.uniforms.dir.value.set(scale / a.width, 0); this.pass(this.mBlur, b);
      this.mBlur.uniforms.tSrc.value = b.texture; this.mBlur.uniforms.dir.value.set(0, scale / a.height); this.pass(this.mBlur, a);
    }
    render(scene, camera, p) {
      const r = this.r;
      for (const k in p) {
        const u = this.u[k];
        if (!u) continue;
        const v = p[k];
        if (typeof v === 'number') u.value = v;
        else if (Array.isArray(v) && u.value && u.value.isVector3) u.value.set(v[0], v[1], v[2]);
        else if (Array.isArray(v) && u.value && u.value.isVector2) u.value.set(v[0], v[1]);
      }
      // prepass
      const bg = scene.background, fog = scene.fog, hidden = [];
      scene.background = null; scene.fog = null;
      scene.traverseVisible((o) => { if (o.userData.noPrepass) hidden.push(o); });
      hidden.forEach((o) => (o.visible = false));
      scene.overrideMaterial = this.preMat;
      const cc = r.getClearColor(new THREE.Color()), ca = r.getClearAlpha();
      r.setClearColor(0x8080ff, 0);
      r.setRenderTarget(this.rtPre); r.clear();
      const ac = r.autoClear; r.autoClear = false;
      r.render(scene, camera);
      r.autoClear = ac;
      scene.overrideMaterial = null;
      hidden.forEach((o) => (o.visible = true));
      scene.background = bg; scene.fog = fog;
      r.setClearColor(cc, ca);
      r.setRenderTarget(this.rtScene); r.clear(); r.render(scene, camera);
      const th = Math.tan((camera.fov * Math.PI) / 360);
      this.mAO.uniforms.tanHalf.value.set(th * camera.aspect, th);
      this.mAO.uniforms.tPre.value = this.rtPre.texture;
      this.pass(this.mAO, this.rtAO); this.blur(this.rtAO, this.rtAO2, 1);
      this.mBright.uniforms.tSrc.value = this.rtScene.texture; this.mBright.uniforms.exposure.value = p.exposure || 1;
      this.pass(this.mBright, this.rtB1); this.blur(this.rtB1, this.rtB2, 1);
      this.mBlur.uniforms.tSrc.value = this.rtB1.texture; this.mBlur.uniforms.dir.value.set(0, 0); this.pass(this.mBlur, this.rtC1);
      this.blur(this.rtC1, this.rtC2, 1.6);
      r.setRenderTarget(this.rtDust);
      r.setClearColor(0x000000, 1); r.clear();
      if (this.dustScene) {
        const pix = this.dustRes.y / (2 * Math.tan((camera.fov * Math.PI) / 360));
        this.dustScene.traverse((o) => {
          const u = o.material && o.material.uniforms;
          if (!u || !u.tPre) return;
          u.tPre.value = this.rtPre.texture; u.res.value.copy(this.dustRes);
          if (u.uPixel) u.uPixel.value = pix;
        });
        r.render(this.dustScene, camera);
      }
      r.setClearColor(cc, ca);
      this.mBlur.uniforms.tSrc.value = this.rtDust.texture; this.mBlur.uniforms.dir.value.set(0, 0); this.pass(this.mBlur, this.rtDustB);
      this.blur(this.rtDustB, this.rtDustB2, 1.4);
      const c = this.mComp.uniforms;
      c.tScene.value = this.rtScene.texture; c.tAO.value = this.rtAO.texture; c.tBloom.value = this.rtB1.texture; c.tBloom2.value = this.rtC1.texture;
      c.tPre.value = this.rtPre.texture; c.tDust.value = this.rtDust.texture; c.tDustB.value = this.rtDustB.texture;
      this.pass(this.mComp, null);
    }
  }
  FX.InkFinisher = InkFinisher;

  /* ---------- flat colour with soft banded light ---------------------------------
     A toon ramp: the light falls into a few tones with narrow soft steps, the way
     a colourist lays flat tints. `steps` are [position, value] pairs. */
  FX.ramp = function (steps, soft) {
    const N = 256, data = new Uint8Array(N * 4);
    soft = soft == null ? 0.03 : soft;
    for (let i = 0; i < N; i++) {
      const x = i / (N - 1);
      let v = steps[0][1];
      for (let k = 1; k < steps.length; k++) v = FX.lerp(v, steps[k][1], FX.smooth((x - steps[k][0] + soft) / (2 * soft)));
      const b = Math.round(v * 255);
      data.set([b, b, b, 255], i * 4);
    }
    const t = new THREE.DataTexture(data, N, 1, THREE.RGBAFormat);
    t.minFilter = t.magFilter = THREE.LinearFilter; t.needsUpdate = true;
    return t;
  };
  FX.defaultRamp = null;
  FX.toon = function (color, o) {
    o = o || {};
    if (!FX.defaultRamp) FX.defaultRamp = FX.ramp([[0, 0.0], [0.47, 0.62], [0.6, 1.0]], 0.035);
    const m = new THREE.MeshToonMaterial({ color: new THREE.Color(color), gradientMap: o.ramp || FX.defaultRamp, map: o.map || null,
      emissive: new THREE.Color(o.emissive || 0x000000), emissiveIntensity: o.emissiveIntensity == null ? 1 : o.emissiveIntensity,
      side: o.side || THREE.FrontSide, transparent: !!o.transparent, opacity: o.opacity == null ? 1 : o.opacity, vertexColors: !!o.vertexColors });
    if (o.transparent) m.depthWrite = false;
    return m;
  };

  /* ---------- pen hatching ---------------------------------------------------------
     Turns a lit material into ink on paper: lit areas stay paper, mid tones get
     one set of parallel strokes, dark tones a second crossing set. Strokes live
     on the surface (triplanar in object space) and change scale by octaves with
     distance, so they keep a steady pen width on screen from a telephoto plate to
     a close-up. Call FX.hatchUpdate(camera, height) once a frame.
     The material's own colour tints the result, so a ruby stays red and printed
     lettering stays black. */
  const hatchSets = [];
  FX.hatch = function (mat, o) {
    o = o || {};
    const U = {
      uPaper: { value: new THREE.Color(o.paper || 0xf4efe3) }, uInk: { value: new THREE.Color(o.ink || 0x1d1b1a) },
      uHatch: { value: o.amount == null ? 1 : o.amount }, uPxK: { value: 0.002 }, uToneK: { value: o.toneK || 1 },
      uStroke: { value: o.stroke || 7 },
    };
    hatchSets.push(U);
    mat.userData.hatch = U;
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = 'varying vec3 vHP; varying vec3 vHN; varying float vHD;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
        vHP = position; vHN = normalize(normal); vHD = -mvPosition.z;`);
      sh.fragmentShader = `uniform vec3 uPaper; uniform vec3 uInk; uniform float uHatch; uniform float uPxK; uniform float uToneK; uniform float uStroke;
        varying vec3 vHP; varying vec3 vHN; varying float vHD;
        float strokes(float u, float s, float wdt) {
          float x = u / s; float fw = fwidth(x) * 0.9;
          float d = abs(fract(x) - 0.5);
          return 1.0 - smoothstep(wdt * 0.5 - fw, wdt * 0.5 + fw, d);
        }
        float layer(vec3 p, vec3 n, float s, float tone) {
          vec3 a = abs(n);
          vec2 q = a.x > a.y && a.x > a.z ? p.yz : a.y > a.z ? p.xz : p.xy;
          float w1 = clamp((0.8 - tone) * 1.25, 0.0, 0.8);
          float w2 = clamp((0.45 - tone) * 1.5, 0.0, 0.8);
          float h = strokes(q.x * 0.7071 + q.y * 0.7071, s, w1);
          h = max(h, strokes(q.x * 0.7071 - q.y * 0.7071, s * 1.07, w2));
          return h;
        }
      ` + sh.fragmentShader.replace('#include <opaque_fragment>', `#include <opaque_fragment>
        if (uHatch > 0.0) {
          vec3 lw = vec3(0.299, 0.587, 0.114);
          float tone = clamp(dot(gl_FragColor.rgb, lw) / max(dot(diffuseColor.rgb, lw), 0.04) * uToneK, 0.0, 1.0);
          float lv = log2(max(vHD, 1e-4) * uPxK * uStroke);
          float oct = floor(lv), f = fract(lv);
          float h = mix(layer(vHP, vHN, exp2(oct), tone), layer(vHP, vHN, exp2(oct + 1.0), tone), smoothstep(0.25, 0.75, f));
          vec3 drawn = mix(uPaper, uInk, h) * diffuseColor.rgb;
          gl_FragColor.rgb = mix(gl_FragColor.rgb, drawn, uHatch);
        }`);
    };
    mat.customProgramCacheKey = () => 'hatch-' + (o.key || '') + (mat.map ? 'm' : '');
    return mat;
  };
  FX.hatchUpdate = function (camera, height) {
    const k = (2 * Math.tan((camera.fov * Math.PI) / 360)) / Math.max(1, height);
    hatchSets.forEach((U) => { U.uPxK.value = k; });
  };
})(window.FX);
