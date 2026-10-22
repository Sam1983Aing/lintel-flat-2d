/* ==========================================================================
   fx-paint.js
   Painterly finishing: real photo materials seen through a paint filter,
   then crisp floating dust on top.

     prepass   view normals + linear depth (for AO and for hiding dust)
     scene     HDR render, MSAA
     ao/bloom  contact shadows and soft glow, in HDR
     grade     ACES, lift/gain, warmth, saturation -> display space
     tensor    which way the edges run (Sobel + gaussian)
     kuwahara  anisotropic Kuwahara: flat areas turn into strokes that
               follow form. `radius` is the brush size in render pixels.
     shafts    light shafts: bright sky and lamp pixels (anything the
               prepass sees as open) smeared toward the light's position on
               screen, then added back in HDR. `shaftPos` is that position.
     dust      a separate particle scene drawn AFTER the paint, so specks
               stay sharp and bright instead of being painted away. Each
               particle checks the prepass depth so walls still hide it.
     finish    depth of field on the painted image, canvas tooth, pigment
               pooling at edges, vignette, grain.

   `radius` is the paint amount: around 5 reads as an oil painting, 1.5 as a
   film still with a painted softness, below 0.6 the filter is off.
   Print mode, for a woodblock look: `ink` draws key lines where depth or
   surface direction jumps (from the prepass), `posterize` flattens colour
   into `levels` steps.

   Same interface as FX.Finisher: setSize(), render(scene, camera, P), u.
   ========================================================================== */
window.FX = window.FX || {};
(function (FX) {
  'use strict';

  const VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const PRE_VS = `
    #include <common>
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
        occ += (d < sz - 0.02 ? 1.0 : 0.0) * smoothstep(0.0, 1.0, rad / abs(z - d));
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

  // light shafts: open pixels (sky, lamps) above a threshold, smeared toward the light
  const SHAFT_MASK_FS = `
    uniform sampler2D tSrc; uniform sampler2D tPre; uniform float threshold; uniform float exposure; varying vec2 vUv;
    void main() {
      float open = texture2D(tPre, vUv).w < 1e-5 ? 1.0 : 0.0;
      vec3 c = texture2D(tSrc, vUv).rgb * exposure;
      float l = max(c.r, max(c.g, c.b));
      gl_FragColor = vec4(c * open * smoothstep(threshold, threshold * 1.6 + 0.2, l), 1.0);
    }`;
  const SHAFT_FS = `
    uniform sampler2D tSrc; uniform vec2 pos; uniform float decay; uniform float len; varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 d = (pos - vUv) * len / 40.0;
      vec2 uv = vUv + d * hash(vUv * 931.0);
      vec3 acc = vec3(0.0); float w = 1.0, ws = 0.0;
      for (int i = 0; i < 40; i++) {
        acc += texture2D(tSrc, uv).rgb * w; ws += w;
        w *= decay; uv += d;
      }
      gl_FragColor = vec4(acc / ws, 1.0);
    }`;

  const GRADE_FS = `
    uniform sampler2D tScene; uniform sampler2D tAO; uniform sampler2D tBloom; uniform sampler2D tBloom2; uniform sampler2D tShaft;
    uniform float exposure; uniform float aoAmt; uniform float bloomAmt; uniform float halation; uniform float shafts; uniform vec3 shaftCol;
    uniform float contrast; uniform float saturation; uniform float warmth; uniform vec3 lift; uniform vec3 gain;
    varying vec2 vUv;
    vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
    void main() {
      vec3 hdr = texture2D(tScene, vUv).rgb;
      hdr *= mix(1.0, texture2D(tAO, vUv).r, aoAmt);
      vec3 bl = texture2D(tBloom, vUv).rgb * 0.6 + texture2D(tBloom2, vUv).rgb * 0.9;
      hdr += bl * bloomAmt + bl * vec3(1.0, 0.3, 0.12) * halation;
      hdr += texture2D(tShaft, vUv).rgb * shaftCol * shafts;
      vec3 c = pow(aces(hdr * exposure), vec3(1.0 / 2.2));
      c.r *= 1.0 + warmth * 0.08; c.b *= 1.0 - warmth * 0.1;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, saturation);
      c = (c - 0.5) * contrast + 0.5;
      c = lift + c * (gain - lift);
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`;

  const TENSOR_FS = `
    uniform sampler2D tSrc; uniform vec2 texel; varying vec2 vUv;
    vec3 s(float x, float y) { return texture2D(tSrc, vUv + vec2(x, y) * texel).rgb; }
    void main() {
      vec3 sx = (s(-1.,-1.) + 2.0 * s(-1.,0.) + s(-1.,1.) - s(1.,-1.) - 2.0 * s(1.,0.) - s(1.,1.)) * 0.25;
      vec3 sy = (s(-1.,-1.) + 2.0 * s(0.,-1.) + s(1.,-1.) - s(-1.,1.) - 2.0 * s(0.,1.) - s(1.,1.)) * 0.25;
      gl_FragColor = vec4(dot(sx, sx), dot(sy, sy), dot(sx, sy), 1.0);
    }`;

  // Anisotropic Kuwahara (Kyprianidis et al. 2009), polynomial sector weights.
  const KUWA_FS = `
    uniform sampler2D tSrc; uniform sampler2D tTensor; uniform vec2 texel; uniform float radius;
    varying vec2 vUv;
    void main() {
      if (radius < 0.6) { gl_FragColor = texture2D(tSrc, vUv); return; }
      vec3 g = texture2D(tTensor, vUv).xyz;
      float E = g.x, G = g.y, Fv = g.z;
      float disc = sqrt((E - G) * (E - G) + 4.0 * Fv * Fv);
      float l1 = 0.5 * (E + G + disc), l2 = 0.5 * (E + G - disc);
      vec2 v = vec2(l1 - E, -Fv);
      vec2 t = length(v) > 0.0 ? normalize(v) : vec2(0.0, 1.0);
      float phi = -atan(t.y, t.x);
      float A = (l1 + l2 > 0.0) ? (l1 - l2) / (l1 + l2) : 0.0;
      float a = radius * clamp(1.0 + A, 0.1, 2.0), b = radius * clamp(1.0 / (1.0 + A), 0.1, 2.0);
      float cp = cos(phi), sp = sin(phi);
      mat2 SR = mat2(0.5 / a, 0.0, 0.0, 0.5 / b) * mat2(cp, sp, -sp, cp);
      int maxX = int(sqrt(a * a * cp * cp + b * b * sp * sp)), maxY = int(sqrt(a * a * sp * sp + b * b * cp * cp));
      float zeta = 2.0 / radius, sz = sin(0.58), eta = (zeta + cos(0.58)) / (sz * sz);
      vec4 m[8]; vec3 s[8];
      for (int k = 0; k < 8; k++) { m[k] = vec4(0.0); s[k] = vec3(0.0); }
      for (int y = -maxY; y <= maxY; y++) {
        for (int x = -maxX; x <= maxX; x++) {
          vec2 q = SR * vec2(float(x), float(y));
          if (dot(q, q) > 0.25) continue;
          vec3 c = clamp(texture2D(tSrc, vUv + vec2(float(x), float(y)) * texel).rgb, 0.0, 1.0);
          float w[8]; float sum = 0.0; float z, vxx, vyy;
          vxx = zeta - eta * q.x * q.x; vyy = zeta - eta * q.y * q.y;
          z = max(0.0, q.y + vxx);  w[0] = z * z; sum += w[0];
          z = max(0.0, -q.x + vyy); w[2] = z * z; sum += w[2];
          z = max(0.0, -q.y + vxx); w[4] = z * z; sum += w[4];
          z = max(0.0, q.x + vyy);  w[6] = z * z; sum += w[6];
          vec2 r = 0.70710678 * vec2(q.x - q.y, q.x + q.y);
          vxx = zeta - eta * r.x * r.x; vyy = zeta - eta * r.y * r.y;
          z = max(0.0, r.y + vxx);  w[1] = z * z; sum += w[1];
          z = max(0.0, -r.x + vyy); w[3] = z * z; sum += w[3];
          z = max(0.0, -r.y + vxx); w[5] = z * z; sum += w[5];
          z = max(0.0, r.x + vyy);  w[7] = z * z; sum += w[7];
          float gw = exp(-3.125 * dot(q, q)) / max(sum, 1e-6);
          for (int k = 0; k < 8; k++) { float wk = w[k] * gw; m[k] += vec4(c * wk, wk); s[k] += c * c * wk; }
        }
      }
      vec4 o = vec4(0.0);
      for (int k = 0; k < 8; k++) {
        vec3 mu = m[k].rgb / max(m[k].w, 1e-6);
        vec3 sg = abs(s[k] / max(m[k].w, 1e-6) - mu * mu);
        float wk = 1.0 / (1.0 + pow(8000.0 * (sg.r + sg.g + sg.b), 4.0));
        o += vec4(mu * wk, wk);
      }
      gl_FragColor = vec4(o.rgb / max(o.w, 1e-6), 1.0);
    }`;

  const FINISH_FS = `
    uniform sampler2D tPaint; uniform sampler2D tTensor; uniform sampler2D tDust; uniform sampler2D tDustB; uniform sampler2D tPre;
    uniform float dof; uniform float focus; uniform float dofNear;
    uniform float ink; uniform vec3 inkCol; uniform vec2 preTexel; uniform float inkWidth; uniform float posterize; uniform float levels;
    uniform vec2 res; uniform float time; uniform float paper; uniform float grain; uniform float vignette;
    uniform float fadeBlack; uniform vec3 fadeCol; uniform float dustAmt; uniform float edgeInk;
    varying vec2 vUv;
    float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
    float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * vnoise(p); p *= 2.03; a *= 0.5; } return v; }
    void main() {
      vec2 px = vUv * res;
      vec3 c = texture2D(tPaint, vUv).rgb;
      // depth of field: golden-angle gather, circle of confusion from distance to the focus plane
      if (dof > 0.0) {
        float dw = texture2D(tPre, vUv).w;
        float z = dw < 1e-5 ? 1e5 : 1.0 / dw - 1.0;
        float coc = z > focus ? clamp((z - focus) / z, 0.0, 1.0) : clamp((focus - z) / max(z, 0.05), 0.0, 1.0) * dofNear;
        coc = clamp(coc * dof, 0.0, 1.0);
        if (coc > 0.03) {
          vec3 acc = c; float ws = 1.0;
          float r = coc * 14.0 * res.y / 900.0;
          for (int i = 0; i < 20; i++) {
            float fi = float(i) + 0.5;
            float a = fi * 2.39996;
            acc += texture2D(tPaint, vUv + vec2(cos(a), sin(a)) * sqrt(fi / 20.0) * r / res).rgb; ws += 1.0;
          }
          c = acc / ws;
        }
      }
      // print mode: key lines where depth or surface direction jumps, flat colour steps
      if (ink > 0.0) {
        vec4 p0 = texture2D(tPre, vUv);
        float z0 = p0.w < 1e-5 ? 1e5 : 1.0 / p0.w - 1.0;
        vec3 n0 = p0.xyz * 2.0 - 1.0;
        float ez = 0.0, en = 0.0;
        for (int i = 0; i < 4; i++) {
          vec2 d = (i == 0 ? vec2(1.0, 0.0) : i == 1 ? vec2(-1.0, 0.0) : i == 2 ? vec2(0.0, 1.0) : vec2(0.0, -1.0)) * preTexel * inkWidth;
          vec4 pn = texture2D(tPre, vUv + d);
          float zn = pn.w < 1e-5 ? 1e5 : 1.0 / pn.w - 1.0;
          ez = max(ez, (zn - z0) / max(min(z0, zn), 0.1));
          en = max(en, 1.0 - dot(n0, pn.xyz * 2.0 - 1.0));
        }
        float line = max(smoothstep(0.05, 0.16, ez), smoothstep(0.3, 0.7, en) * 0.6) * step(z0, 9e4);
        c = mix(c, inkCol, line * ink);
      }
      if (posterize > 0.0) c = mix(c, floor(c * levels + 0.5) / levels, posterize);
      // canvas tooth and a few broad blotches, like light across real linen
      float weave = sin(px.x * 1.05) * sin(px.y * 1.05);
      float fib = fbm(px * vec2(0.16, 0.55));
      c *= 1.0 + (0.5 + weave * 0.12 + (fib - 0.5) * 0.7 - 0.5) * 0.14 * paper;
      c *= 1.0 - (fbm(px * 0.0035 + 3.1) - 0.5) * 0.12 * paper;
      vec3 t = texture2D(tTensor, vUv).xyz;
      c *= 1.0 - smoothstep(0.04, 0.5, sqrt(max(t.x + t.y, 0.0))) * edgeInk;
      // dust drawn after the paint: sharp core plus a soft halo
      vec3 d = texture2D(tDust, vUv).rgb + texture2D(tDustB, vUv).rgb * 0.8;
      c = 1.0 - (1.0 - c) * (1.0 - clamp(d * dustAmt, 0.0, 1.0));
      vec2 q = vUv - 0.5; q.x *= res.x / res.y;
      c *= mix(1.0, smoothstep(1.12, 0.22, length(q)), vignette);
      c += (hash(px + fract(time * 7.0) * 431.0) - 0.5) * grain;
      c = mix(c, fadeCol, fadeBlack);
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`;

  class PaintFinisher {
    constructor(renderer, opts) {
      this.r = renderer;
      this.opts = Object.assign({ preScale: 0.5, msaa: 4 }, opts || {});
      this.qs = new THREE.Scene();
      this.qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
      this.quad.frustumCulled = false;
      this.qs.add(this.quad);
      const mk = (fs, u) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms: u, depthTest: false, depthWrite: false });
      this.preMat = new THREE.ShaderMaterial({ vertexShader: PRE_VS, fragmentShader: PRE_FS, side: THREE.DoubleSide });
      const R = FX.rng(11), kernel = [];
      for (let i = 0; i < 12; i++) {
        const v = new THREE.Vector3(R() * 2 - 1, R() * 2 - 1, R() * 0.9 + 0.1).normalize();
        const s = i / 12; kernel.push(v.multiplyScalar((0.12 + 0.88 * s * s) * (0.5 + R() * 0.5)));
      }
      this.mAO = mk(AO_FS, { tPre: { value: null }, res: { value: new THREE.Vector2() }, tanHalf: { value: new THREE.Vector2() }, radius: { value: 0.6 }, kernel: { value: kernel } });
      this.mBlur = mk(BLUR_FS, { tSrc: { value: null }, dir: { value: new THREE.Vector2() } });
      this.mBright = mk(BRIGHT_FS, { tSrc: { value: null }, threshold: { value: 1.2 }, exposure: { value: 1 } });
      this.mGrade = mk(GRADE_FS, {
        tScene: { value: null }, tAO: { value: null }, tBloom: { value: null }, tBloom2: { value: null }, tShaft: { value: null },
        shafts: { value: 0 }, shaftCol: { value: new THREE.Vector3(1, 0.9, 0.75) },
        exposure: { value: 1 }, aoAmt: { value: 0.8 }, bloomAmt: { value: 0.3 }, halation: { value: 0.1 },
        contrast: { value: 1 }, saturation: { value: 1 }, warmth: { value: 0 }, lift: { value: new THREE.Vector3(0.02, 0.02, 0.03) }, gain: { value: new THREE.Vector3(1, 1, 1) },
      });
      this.mTensor = mk(TENSOR_FS, { tSrc: { value: null }, texel: { value: new THREE.Vector2() } });
      this.mShaftMask = mk(SHAFT_MASK_FS, { tSrc: { value: null }, tPre: { value: null }, threshold: { value: 1.5 }, exposure: { value: 1 } });
      this.mShaft = mk(SHAFT_FS, { tSrc: { value: null }, pos: { value: new THREE.Vector2(0.5, 0.5) }, decay: { value: 0.96 }, len: { value: 0.9 } });
      this.mKuwa = mk(KUWA_FS, { tSrc: { value: null }, tTensor: { value: null }, texel: { value: new THREE.Vector2() }, radius: { value: 4 } });
      this.mFinish = mk(FINISH_FS, {
        tPaint: { value: null }, tTensor: { value: null }, tDust: { value: null }, tDustB: { value: null }, tPre: { value: null },
        dof: { value: 0 }, focus: { value: 10 }, dofNear: { value: 1 },
        ink: { value: 0 }, inkCol: { value: new THREE.Vector3(0.12, 0.1, 0.1) }, preTexel: { value: new THREE.Vector2(1, 1) }, inkWidth: { value: 1 },
        posterize: { value: 0 }, levels: { value: 7 },
        res: { value: new THREE.Vector2() }, time: { value: 0 }, paper: { value: 0.7 }, grain: { value: 0.03 }, vignette: { value: 0.45 },
        fadeBlack: { value: 1 }, fadeCol: { value: new THREE.Vector3(0, 0, 0) }, dustAmt: { value: 1 }, edgeInk: { value: 0.12 },
      });
      this.u = Object.assign({}, this.mGrade.uniforms, this.mFinish.uniforms, { radius: this.mKuwa.uniforms.radius, aoRadius: this.mAO.uniforms.radius,
        shaftPos: this.mShaft.uniforms.pos, shaftDecay: this.mShaft.uniforms.decay, shaftLen: this.mShaft.uniforms.len, shaftThreshold: this.mShaftMask.uniforms.threshold });
      this.dustScene = null;
      this.targets = [];
    }
    setSize(w, h, outW, outH) {
      this.targets.forEach((t) => t.dispose());
      const hf = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
      const T = (ww, hh, o) => new THREE.WebGLRenderTarget(Math.max(2, Math.round(ww)), Math.max(2, Math.round(hh)), o || hf);
      this.rtScene = T(w, h, { type: THREE.HalfFloatType, samples: this.opts.msaa, depthBuffer: true });
      this.rtPre = T(w * this.opts.preScale, h * this.opts.preScale, { type: THREE.HalfFloatType, depthBuffer: true, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
      this.rtAO = T(w / 2, h / 2); this.rtAO2 = T(w / 2, h / 2);
      this.rtB1 = T(w / 4, h / 4); this.rtB2 = T(w / 4, h / 4);
      this.rtC1 = T(w / 10, h / 10); this.rtC2 = T(w / 10, h / 10);
      this.rtGrade = T(w, h); this.rtT1 = T(w, h); this.rtT2 = T(w, h);
      this.rtPaint = T(w, h, Object.assign({}, hf, { type: THREE.UnsignedByteType }));
      this.rtS1 = T(w / 3, h / 3); this.rtS2 = T(w / 3, h / 3);
      this.rtDust = T(outW * 0.75, outH * 0.75, { type: THREE.HalfFloatType, depthBuffer: false });
      this.rtDustB = T(outW / 6, outH / 6); this.rtDustB2 = T(outW / 6, outH / 6);
      this.targets = [this.rtScene, this.rtPre, this.rtAO, this.rtAO2, this.rtB1, this.rtB2, this.rtC1, this.rtC2, this.rtGrade, this.rtT1, this.rtT2, this.rtPaint, this.rtS1, this.rtS2, this.rtDust, this.rtDustB, this.rtDustB2];
      this.w = Math.round(w); this.h = Math.round(h);
      this.mAO.uniforms.res.value.set(w / 2, h / 2);
      this.mTensor.uniforms.texel.value.set(1 / w, 1 / h);
      this.mKuwa.uniforms.texel.value.set(1 / w, 1 / h);
      this.mFinish.uniforms.res.value.set(outW, outH);
      this.mFinish.uniforms.preTexel.value.set(1 / this.rtPre.width, 1 / this.rtPre.height);
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
      // prepass: normals + depth
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
      // scene
      r.setRenderTarget(this.rtScene); r.clear(); r.render(scene, camera);
      // ao
      const th = Math.tan((camera.fov * Math.PI) / 360);
      this.mAO.uniforms.tanHalf.value.set(th * camera.aspect, th);
      this.mAO.uniforms.tPre.value = this.rtPre.texture;
      this.pass(this.mAO, this.rtAO); this.blur(this.rtAO, this.rtAO2, 1);
      // bloom
      this.mBright.uniforms.tSrc.value = this.rtScene.texture;
      this.mBright.uniforms.exposure.value = p.exposure || 1;
      this.mBright.uniforms.threshold.value = p.bloomThreshold || 1.2;
      this.pass(this.mBright, this.rtB1); this.blur(this.rtB1, this.rtB2, 1);
      this.mBlur.uniforms.tSrc.value = this.rtB1.texture; this.mBlur.uniforms.dir.value.set(0, 0); this.pass(this.mBlur, this.rtC1);
      this.blur(this.rtC1, this.rtC2, 1.6);
      // light shafts
      const g = this.mGrade.uniforms;
      if (g.shafts.value > 0) {
        this.mShaftMask.uniforms.tSrc.value = this.rtScene.texture; this.mShaftMask.uniforms.tPre.value = this.rtPre.texture;
        this.mShaftMask.uniforms.exposure.value = p.exposure || 1;
        this.pass(this.mShaftMask, this.rtS1);
        this.mShaft.uniforms.tSrc.value = this.rtS1.texture; this.pass(this.mShaft, this.rtS2);
        this.mShaft.uniforms.tSrc.value = this.rtS2.texture; this.mShaft.uniforms.len.value *= 0.35; this.pass(this.mShaft, this.rtS1);
        this.mShaft.uniforms.len.value /= 0.35;
      }
      // grade to display space
      g.tShaft.value = this.rtS1.texture;
      g.tScene.value = this.rtScene.texture; g.tAO.value = this.rtAO.texture; g.tBloom.value = this.rtB1.texture; g.tBloom2.value = this.rtC1.texture;
      this.pass(this.mGrade, this.rtGrade);
      // paint
      this.mTensor.uniforms.tSrc.value = this.rtGrade.texture; this.pass(this.mTensor, this.rtT1);
      this.blur(this.rtT1, this.rtT2, 1);
      this.mKuwa.uniforms.tSrc.value = this.rtGrade.texture; this.mKuwa.uniforms.tTensor.value = this.rtT1.texture;
      this.pass(this.mKuwa, this.rtPaint);
      // dust, after the paint
      r.setRenderTarget(this.rtDust);
      r.setClearColor(0x000000, 1); r.clear();
      if (this.dustScene) {
        // uPixel turns a size in metres into pixels at 1 m for this lens, so specks keep their real size
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
      const f = this.mFinish.uniforms;
      f.tPaint.value = this.rtPaint.texture; f.tTensor.value = this.rtT1.texture; f.tDust.value = this.rtDust.texture; f.tDustB.value = this.rtDustB.texture;
      f.tPre.value = this.rtPre.texture;
      this.pass(this.mFinish, null);
    }
  }
  FX.PaintFinisher = PaintFinisher;

  /* ---------- floating dust ------------------------------------------------------
     Points drawn in their own scene after the paint. Size grows toward the lens
     (near specks read as soft bokeh), brightness rises inside the light cones
     you pass in (a lighthouse beam, a window shaft), and each speck compares
     itself with the prepass depth so geometry still hides it. */
  FX.dust = function (opts) {
    const N = opts.count, R = FX.rng(opts.seed || 3);
    const pos = new Float32Array(N * 3), rnd = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) {
      const p = opts.spawn(R, i);
      pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2];
      rnd[i * 4] = R(); rnd[i * 4 + 1] = R(); rnd[i * 4 + 2] = R(); rnd[i * 4 + 3] = p[3] == null ? 1 : p[3];
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 4));
    const cones = [];
    for (let i = 0; i < 4; i++) cones.push({ pos: new THREE.Vector3(0, -1e4, 0), dir: new THREE.Vector3(0, 1, 0), cosA: 0.99, gain: 0 });
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uSize: { value: opts.size || 1 }, uColor: { value: new THREE.Color(opts.color || 0xfff1dc) },
        uBase: { value: opts.base == null ? 0.25 : opts.base }, uWind: { value: new THREE.Vector3().fromArray(opts.wind || [0.05, 0.01, 0]) },
        uPixel: { value: 1 }, tPre: { value: null }, res: { value: new THREE.Vector2(1, 1) }, uFade: { value: 1 }, zBase: { value: 0 },
        tSunShadow: { value: null }, sunShadowMat: { value: new THREE.Matrix4() }, uShadowGain: { value: opts.sunGain || 0 },
        uBoxMin: { value: new THREE.Vector3().fromArray(opts.box ? opts.box[0] : [0, 0, 0]) },
        uBoxSize: { value: new THREE.Vector3().fromArray(opts.box ? opts.box[1] : [1, 1, 1]) },
        uConePos: { value: cones.map((c) => c.pos) }, uConeDir: { value: cones.map((c) => c.dir) },
        uConeCos: { value: cones.map((c) => c.cosA) }, uConeGain: { value: cones.map((c) => c.gain) },
      },
      defines: Object.assign(opts.box ? { WRAP: 1 } : {}, opts.sun ? { SUNLIT: 1 } : {}),
      vertexShader: `
        #include <packing>
        attribute vec4 aRnd;
        uniform sampler2D tSunShadow; uniform mat4 sunShadowMat; uniform float uShadowGain;
        uniform float uTime; uniform float uSize; uniform float uPixel; uniform vec3 uWind; uniform float uBase;
        uniform vec3 uBoxMin; uniform vec3 uBoxSize;
        uniform vec3 uConePos[4]; uniform vec3 uConeDir[4]; uniform float uConeCos[4]; uniform float uConeGain[4];
        varying float vBright; varying float vZ; varying float vSoft;
        void main() {
          vec3 p = position + uWind * uTime * (0.4 + aRnd.x)
                 + vec3(sin(uTime * 0.21 + aRnd.y * 40.0), sin(uTime * 0.17 + aRnd.z * 40.0) * 0.6, cos(uTime * 0.19 + aRnd.x * 40.0)) * 0.12;
          #ifdef WRAP
          p = uBoxMin + mod(p - uBoxMin, uBoxSize);
          #endif
          float lit = uBase;
          for (int i = 0; i < 4; i++) {
            vec3 d = p - uConePos[i];
            float cosT = dot(normalize(d), uConeDir[i]);
            lit += uConeGain[i] * smoothstep(uConeCos[i], uConeCos[i] + (1.0 - uConeCos[i]) * 0.6, cosT) / (1.0 + dot(d, d) * 0.002);
          }
          #ifdef SUNLIT
          // lit only where the sun actually reaches: a lookup in the light's shadow map
          vec4 sc = sunShadowMat * modelMatrix * vec4(p, 1.0); vec3 s3 = sc.xyz / sc.w;
          if (s3.x > 0.0 && s3.x < 1.0 && s3.y > 0.0 && s3.y < 1.0 && s3.z < 1.0)
            lit += uShadowGain * step(s3.z - 0.002, unpackRGBAToDepth(texture2D(tSunShadow, s3.xy)));
          #endif
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float z = -mv.z;
          vZ = z;
          float s = uSize * (0.5 + aRnd.w) * uPixel / z;
          vSoft = smoothstep(4.0, 24.0, s);
          gl_PointSize = clamp(s, 1.5, 48.0);
          // a speck smaller than a pixel only covers part of it, so it dims instead of staying a full dot
          float cover = clamp(s / 1.5, 0.0, 1.0); cover *= cover;
          // very near specks are out-of-focus discs: bigger and fainter
          float disc = 1.0 / (1.0 + max(0.0, s - 10.0) * 0.08);
          vBright = lit * cover * disc * (0.55 + 0.45 * sin(uTime * (0.6 + aRnd.z) + aRnd.y * 30.0)) * smoothstep(0.15, 0.6, z);
        }`,
      fragmentShader: `
        uniform vec3 uColor; uniform sampler2D tPre; uniform vec2 res; uniform float uFade; uniform float zBase;
        varying float vBright; varying float vZ; varying float vSoft;
        void main() {
          float dw = texture2D(tPre, gl_FragCoord.xy / res).w;
          float sceneZ = dw < 1e-5 ? 1e6 : 1.0 / dw - 1.0 + zBase;
          if (vZ > sceneZ * 1.004 + 0.05) discard;          // half-float depth is only good to ~0.1% far away
          vec2 c = gl_PointCoord - 0.5;
          float r = length(c);
          float core = smoothstep(0.5, mix(0.05, 0.4, vSoft), r) * mix(1.0, 0.6 + 0.4 * smoothstep(0.5, 0.3, r), vSoft);
          gl_FragColor = vec4(uColor * vBright * core * uFade, 1.0);
        }`,
      transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(g, mat);
    pts.frustumCulled = false;
    pts.userData.cones = cones;
    return pts;
  };

  /* ---------- streaks ------------------------------------------------------------
     Thin lines for rain (or wind-blown snow, sparks). Each streak runs along
     `dir` for its length and falls with `vel` inside `box`, wrapping round, so
     `vel: [0, 0, 0]` freezes the rain in the air like a print. Drawn in the dust
     scene, after the paint, and hidden by the prepass depth like the dust. */
  FX.streaks = function (opts) {
    const N = opts.count, R = FX.rng(opts.seed || 5);
    const pos = new Float32Array(N * 6), end = new Float32Array(N * 2), rnd = new Float32Array(N * 8);
    const [bmin, bsize] = opts.box;
    for (let i = 0; i < N; i++) {
      const x = bmin[0] + R() * bsize[0], y = bmin[1] + R() * bsize[1], z = bmin[2] + R() * bsize[2];
      const r = [R(), R(), R(), R()];
      for (let k = 0; k < 2; k++) { pos.set([x, y, z], i * 6 + k * 3); end[i * 2 + k] = k; rnd.set(r, (i * 2 + k) * 4); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    g.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 4));
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uDir: { value: new THREE.Vector3().fromArray(opts.dir || [0.25, -1, 0]).normalize() },
        uLen: { value: opts.length || 1.2 }, uVel: { value: new THREE.Vector3().fromArray(opts.vel || [0, 0, 0]) },
        uBoxMin: { value: new THREE.Vector3().fromArray(bmin) }, uBoxSize: { value: new THREE.Vector3().fromArray(bsize) },
        uColor: { value: new THREE.Color(opts.color || 0xdfe6ee) }, uAlpha: { value: opts.alpha == null ? 0.5 : opts.alpha },
        tPre: { value: null }, res: { value: new THREE.Vector2(1, 1) }, uFade: { value: 1 },
      },
      vertexShader: `
        attribute float aEnd; attribute vec4 aRnd;
        uniform float uTime; uniform vec3 uDir; uniform float uLen; uniform vec3 uVel; uniform vec3 uBoxMin; uniform vec3 uBoxSize;
        varying float vZ; varying float vA;
        void main() {
          vec3 p = position + uVel * uTime * (0.8 + 0.4 * aRnd.x);
          p = uBoxMin + mod(p - uBoxMin, uBoxSize);
          p += uDir * uLen * (0.6 + 0.8 * aRnd.y) * aEnd;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          vZ = -mv.z;
          vA = (0.4 + 0.6 * aRnd.z) * smoothstep(0.4, 2.0, vZ) * (1.0 - aEnd * 0.6);
        }`,
      fragmentShader: `
        uniform vec3 uColor; uniform float uAlpha; uniform sampler2D tPre; uniform vec2 res; uniform float uFade;
        varying float vZ; varying float vA;
        void main() {
          float dw = texture2D(tPre, gl_FragCoord.xy / res).w;
          float sceneZ = dw < 1e-5 ? 1e6 : 1.0 / dw - 1.0;
          if (vZ > sceneZ * 1.004 + 0.05) discard;          // half-float depth is only good to ~0.1% far away
          gl_FragColor = vec4(uColor * vA * uAlpha * uFade, 1.0);
        }`,
      transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const lines = new THREE.LineSegments(g, mat);
    lines.frustumCulled = false;
    return lines;
  };
})(window.FX);
