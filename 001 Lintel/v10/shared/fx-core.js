/* ==========================================================================
   fx-core.js
   Shared building blocks for the three "fake 3D" concept pages.

   The method: block the world out with simple geometry, then dress every
   surface with real photographed materials (colour, normal and AO/roughness
   maps from Poly Haven, CC0) lit by a real sky (HDR image based lighting plus
   a matching sun). UVs are measured in metres so every material keeps its
   real-world scale, and edges get a small bevel so they catch the light.
   ========================================================================== */
window.FX = window.FX || {};
(function (FX) {
  'use strict';

  const V3 = THREE.Vector3;
  FX.DEG = Math.PI / 180;

  /* ---------- small helpers ------------------------------------------------ */
  FX.rng = function (seed) {
    let a = (seed * 2654435761) >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  FX.clamp01 = (x) => Math.max(0, Math.min(1, x));
  FX.smooth = (x) => { x = FX.clamp01(x); return x * x * (3 - 2 * x); };
  FX.lerp = (a, b, t) => a + (b - a) * t;
  FX.range = (x, a, b) => FX.clamp01((x - a) / (b - a));
  FX.easeInOut = (x) => { x = FX.clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  FX.easeOut = (x) => 1 - Math.pow(1 - FX.clamp01(x), 3);

  const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new V3(), _p = new V3();
  FX.M = function (x, y, z, rx, ry, rz, sx, sy, sz, order) {
    _e.set(rx || 0, ry || 0, rz || 0, order || 'XYZ');
    return new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e),
      _s.set(sx || 1, sy == null ? sx || 1 : sy, sz == null ? sx || 1 : sz));
  };
  FX.mul = (a, b) => new THREE.Matrix4().multiplyMatrices(a, b);

  /* ---------- geometry ----------------------------------------------------- */

  // Planar UVs in metres, projected along each vertex's dominant normal axis.
  FX.uvMetres = function (geo, ox, oy) {
    const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
    ox = ox || 0; oy = oy || 0;
    for (let i = 0; i < p.count; i++) {
      const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (ay >= ax && ay >= az) uv.setXY(i, x + ox, (n.getY(i) > 0 ? -z : z) + oy);
      else if (ax >= az) uv.setXY(i, (n.getX(i) > 0 ? -z : z) + ox, y + oy);
      else uv.setXY(i, (n.getZ(i) > 0 ? x : -x) + ox, y + oy);
    }
    uv.needsUpdate = true;
    return geo;
  };

  // Box with a small rounded bevel. Real edges are never razor sharp, and the
  // bevel is what lets a plain box catch a highlight like cast concrete does.
  const _bevelCache = new Map();
  FX.bevelBox = function (w, h, d, r, opts) {
    r = Math.min(r == null ? 0.02 : r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3);
    const ox = (opts && opts.ox) || 0, oy = (opts && opts.oy) || 0;
    const key = ox === 0 && oy === 0 ? `${w.toFixed(4)}|${h.toFixed(4)}|${d.toFixed(4)}|${r.toFixed(4)}` : null;
    if (key) {
      const hit = _bevelCache.get(key);
      if (hit) return hit.clone();
    }
    // one extra segment at each end becomes the thin bevel strip
    const seg = (s) => Math.max(1, Math.min(24, Math.round(s / 1.5))) + 2;
    const kx = seg(w), ky = seg(h), kz = seg(d);
    const g0 = new THREE.BoxGeometry(w, h, d, kx, ky, kz);
    const remap = (a, half, k) => {
      const i = Math.round((a + half) / ((2 * half) / k));
      const lim = half - r;
      if (i <= 0) return -half;
      if (i >= k) return half;
      if (i === 1) return -lim;
      if (i === k - 1) return lim;
      return -lim + ((i - 1) / (k - 2)) * 2 * lim;
    };
    const p = g0.attributes.position, nrm = g0.attributes.normal;
    const ix = w / 2 - r, iy = h / 2 - r, iz = d / 2 - r;
    const v = new V3(), c = new V3(), o = new V3();
    for (let i = 0; i < p.count; i++) {
      v.set(remap(p.getX(i), w / 2, kx), remap(p.getY(i), h / 2, ky), remap(p.getZ(i), d / 2, kz));
      c.set(Math.max(-ix, Math.min(ix, v.x)), Math.max(-iy, Math.min(iy, v.y)), Math.max(-iz, Math.min(iz, v.z)));
      o.copy(v).sub(c);
      if (o.lengthSq() < 1e-12) o.fromBufferAttribute(nrm, i); else o.normalize();
      nrm.setXYZ(i, o.x, o.y, o.z);
      p.setXYZ(i, c.x + o.x * r, c.y + o.y * r, c.z + o.z * r);
    }
    FX.uvMetres(g0, ox, oy);
    const g = g0.index ? g0.toNonIndexed() : g0;
    if (key) {
      if (_bevelCache.size > 600) _bevelCache.clear();
      _bevelCache.set(key, g);
      return g.clone();
    }
    return g;
  };

  FX.plane = function (w, h, sx, sy) {
    const g = new THREE.PlaneGeometry(w, h, sx || 1, sy || 1);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h);
    return g;
  };

  FX.colorize = function (geo, fn) {
    const p = geo.attributes.position, pa = p.array, n = p.count, c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const i3 = i * 3, v = fn(pa[i3], pa[i3 + 1], pa[i3 + 2]);
      c[i3] = v[0]; c[i3 + 1] = v[1]; c[i3 + 2] = v[2];
    }
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return geo;
  };

  FX.noise3 = function (x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    const b = xi * 127.1 + yi * 311.7 + zi * 74.7;
    let s;
    s = Math.sin(b) * 43758.5453; const h000 = s - Math.floor(s);
    s = Math.sin(b + 127.1) * 43758.5453; const h100 = s - Math.floor(s);
    s = Math.sin(b + 311.7) * 43758.5453; const h010 = s - Math.floor(s);
    s = Math.sin(b + 438.8) * 43758.5453; const h110 = s - Math.floor(s);
    s = Math.sin(b + 74.7) * 43758.5453; const h001 = s - Math.floor(s);
    s = Math.sin(b + 201.8) * 43758.5453; const h101 = s - Math.floor(s);
    s = Math.sin(b + 386.4) * 43758.5453; const h011 = s - Math.floor(s);
    s = Math.sin(b + 513.5) * 43758.5453; const h111 = s - Math.floor(s);
    const x00 = h000 + (h100 - h000) * u, x10 = h010 + (h110 - h010) * u;
    const x01 = h001 + (h101 - h001) * u, x11 = h011 + (h111 - h011) * u;
    const y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
    return y0 + (y1 - y0) * w;
  };

  // A boulder: displaced icosphere, flattened, with metre UVs.
  let _ico4Base = null;
  FX.boulder = function (r, seed, flat) {
    if (!_ico4Base) _ico4Base = new THREE.IcosahedronGeometry(1, 4);
    const g = _ico4Base.clone();
    const p = g.attributes.position, pa = p.array, uv = g.attributes.uv, uva = uv.array;
    const fl = flat || 0.7;
    for (let i = 0, n = p.count; i < n; i++) {
      const i3 = i * 3, vx0 = pa[i3], vy0 = pa[i3 + 1], vz0 = pa[i3 + 2];
      const ns = FX.noise3(vx0 * 0.9 + seed, vy0 * 0.9, vz0 * 0.9) * 0.6 + FX.noise3(vx0 * 2.6, vy0 * 2.6 + seed, vz0 * 2.6) * 0.3 +
        FX.noise3(vx0 * 7, vy0 * 7, vz0 * 7 + seed) * 0.1;
      const sc = r * (0.72 + ns * 0.55);
      const x = vx0 * sc, y = vy0 * sc * fl, z = vz0 * sc;
      pa[i3] = x; pa[i3 + 1] = y; pa[i3 + 2] = z;
      const i2 = i * 2;
      uva[i2] = Math.atan2(z, x) * r; uva[i2 + 1] = y + x * 0.3;
    }
    g.computeVertexNormals();
    return g;
  };

  /* merge many geometries (world transforms baked) into one per material */
  function merge(list) {
    let n = 0;
    for (const g of list) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3);
    let o = 0;
    for (const g of list) {
      const c = g.attributes.position.count;
      pos.set(g.attributes.position.array, o * 3);
      nor.set(g.attributes.normal.array, o * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
      if (g.attributes.color) col.set(g.attributes.color.array, o * 3); else col.fill(1, o * 3, (o + c) * 3);
      o += c;
    }
    const m = new THREE.BufferGeometry();
    m.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    m.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    m.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    m.setAttribute('color', new THREE.BufferAttribute(col, 3));
    m.computeBoundingSphere();
    m.computeBoundingBox();
    return m;
  }
  FX.Batch = class {
    constructor() { this.groups = new Map(); }
    add(mat, geo, m, ownGeo) {
      const g = geo.index ? geo.toNonIndexed() : (ownGeo ? geo : geo.clone());
      if (!g.attributes.normal) g.computeVertexNormals();
      if (m) g.applyMatrix4(m);
      let e = this.groups.get(mat);
      if (!e) this.groups.set(mat, (e = []));
      e.push(g);
      return this;
    }
    build(parent, opts) {
      opts = opts || {};
      const meshes = [];
      for (const [mat, list] of this.groups) {
        const mesh = new THREE.Mesh(merge(list), mat);
        mesh.castShadow = opts.cast !== false;
        mesh.receiveShadow = opts.receive !== false;
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix();
        parent.add(mesh);
        meshes.push(mesh);
      }
      this.groups.clear();
      return meshes;
    }
  };

  /* ---------- asset loading -------------------------------------------------- */

  // Minimal Radiance .hdr (RGBE) reader. Returns a half-float equirect texture.
  // `shift` rotates the sky around the vertical axis (0..1 of a full turn).
  function parseRGBE(buf, opts) {
    opts = opts || {};
    const u8 = new Uint8Array(buf);
    let pos = 0;
    const line = () => { let s = ''; while (pos < u8.length) { const c = u8[pos++]; if (c === 10) break; s += String.fromCharCode(c); } return s; };
    if (!line().startsWith('#?')) throw new Error('not an HDR file');
    while (line() !== '') { /* header */ }
    const m = line().match(/-Y (\d+) \+X (\d+)/);
    const H = +m[1], W = +m[2];
    const rgbe = new Uint8Array(W * H * 4);
    const scan = new Uint8Array(W * 4);
    for (let y = 0; y < H; y++) {
      if (W < 8 || W > 0x7fff || u8[pos] !== 2 || u8[pos + 1] !== 2 || (u8[pos + 2] & 0x80)) {
        rgbe.set(u8.subarray(pos, pos + W * 4), y * W * 4); pos += W * 4; continue;
      }
      pos += 4;
      for (let c = 0; c < 4; c++) {
        let x = 0;
        while (x < W) {
          let n = u8[pos++];
          if (n > 128) { n -= 128; const v = u8[pos++]; while (n--) scan[(x++) * 4 + c] = v; }
          else { while (n--) scan[(x++) * 4 + c] = u8[pos++]; }
        }
      }
      rgbe.set(scan, y * W * 4);
    }
    // decode and find the sun (brightest pixel)
    const f = new Float32Array(W * H * 3);
    let best = -1, bx = 0, by = 0;
    for (let i = 0; i < W * H; i++) {
      const e = rgbe[i * 4 + 3];
      const s = e ? Math.pow(2, e - 136) : 0;
      const r = rgbe[i * 4] * s, g = rgbe[i * 4 + 1] * s, b = rgbe[i * 4 + 2] * s;
      f[i * 3] = r; f[i * 3 + 1] = g; f[i * 3 + 2] = b;
      const L = r * 0.2126 + g * 0.7152 + b * 0.0722;
      if (L > best) { best = L; bx = i % W; by = (i / W) | 0; }
    }
    // rotate the panorama so the sun sits at the requested azimuth
    let shift = opts.shift || 0;
    if (opts.sunAzimuth != null) {
      const want = opts.sunAzimuth / (Math.PI * 2) + 0.5;          // u of the wanted azimuth
      shift = ((want - (bx + 0.5) / W) % 1 + 1) % 1;
    }
    const sh = Math.round(shift * W);
    const out = new Uint16Array(W * H * 4);
    const toHalf = THREE.DataUtils.toHalfFloat, one = toHalf(1);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x, o = (y * W + ((x + sh) % W)) * 4;
        out[o] = toHalf(f[i * 3]); out[o + 1] = toHalf(f[i * 3 + 1]); out[o + 2] = toHalf(f[i * 3 + 2]); out[o + 3] = one;
      }
    }
    const tex = new THREE.DataTexture(out, W, H, THREE.RGBAFormat, THREE.HalfFloatType);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.LinearSRGBColorSpace;
    tex.magFilter = tex.minFilter = THREE.LinearFilter;
    tex.flipY = true;
    tex.needsUpdate = true;
    const u = ((bx + sh) % W + 0.5) / W, v = 1 - (by + 0.5) / H;
    const phi = (u - 0.5) * Math.PI * 2, th = (v - 0.5) * Math.PI;
    tex.userData.sunDir = new V3(Math.cos(phi) * Math.cos(th), Math.sin(th), Math.sin(phi) * Math.cos(th)).normalize();
    tex.userData.shift = shift;
    return tex;
  }

  FX.Loader = class {
    constructor(renderer, onProgress) {
      this.r = renderer;
      this.total = 0; this.done = 0;
      this.onProgress = onProgress || (() => {});
      this.tl = new THREE.TextureLoader();
      this.cache = {};
      this.aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    }
    _tick() { this.done++; this.onProgress(this.done / Math.max(1, this.total)); }
    image(url, srgb) {
      if (this.cache[url]) return this.cache[url];
      this.total++;
      const p = new Promise((res, rej) => this.tl.load(url, (t) => {
        t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = this.aniso;
        this._tick(); res(t);
      }, undefined, rej));
      this.cache[url] = p;
      return p;
    }
    // a Poly Haven style set: diff (sRGB), nor (GL normal), arm (AO, rough, metal)
    async set(base) {
      const [diff, nor, arm] = await Promise.all([this.image(base + '/diff.jpg', true), this.image(base + '/nor.jpg'), this.image(base + '/arm.jpg')]);
      return { diff, nor, arm };
    }
    // sky: 1k HDR for lighting, big tonemapped JPG for what you actually see
    async sky(hdrUrl, jpgUrl, opts) {
      opts = opts || {};
      this.total += jpgUrl ? 2 : 1;
      const buf = await (await fetch(hdrUrl)).arrayBuffer();
      const hdr = parseRGBE(buf, opts);
      const shift = hdr.userData.shift;
      const pm = new THREE.PMREMGenerator(this.r);
      const env = pm.fromEquirectangular(hdr).texture;
      pm.dispose();
      this._tick();
      let bg = null;
      if (jpgUrl) {
        const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = jpgUrl; });
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const g = c.getContext('2d');
        const sh = Math.round(shift * img.width);
        g.drawImage(img, sh, 0); g.drawImage(img, sh - img.width, 0);
        bg = new THREE.CanvasTexture(c);
        bg.colorSpace = THREE.SRGBColorSpace;
        bg.mapping = THREE.EquirectangularReflectionMapping;
        this._tick();
      }
      return { env, bg, hdr, sunDir: hdr.userData.sunDir };
    }
  };

  // Standard PBR material from a texture set. `size` is the real width of the
  // texture in metres (Poly Haven lists it), so a 1.8 m concrete scan covers
  // 1.8 m of wall.
  FX.pbr = function (set, o) {
    o = o || {};
    const rep = 1 / (o.size || 2);
    const tex = (t) => {
      if (!t) return null;
      const c = t.clone();
      c.repeat.set(rep * (o.stretchX || 1), rep * (o.stretchY || 1));
      if (o.rotate) { c.rotation = o.rotate; c.center.set(0.5, 0.5); }
      c.needsUpdate = true;
      return c;
    };
    const m = new THREE.MeshStandardMaterial({
      map: tex(set.diff), normalMap: tex(set.nor), roughnessMap: tex(set.arm), aoMap: tex(set.arm),
      color: new THREE.Color(o.color == null ? 0xffffff : o.color),
      roughness: o.roughness == null ? 1 : o.roughness,
      metalness: o.metalness || 0,
      envMapIntensity: o.env == null ? 1 : o.env,
      aoMapIntensity: o.ao == null ? 1 : o.ao,
      vertexColors: !!o.vertexColors,
      side: o.side || THREE.FrontSide,
    });
    m.normalScale.set(o.normal == null ? 1 : o.normal, o.normal == null ? 1 : o.normal);
    return m;
  };

  // Desaturate and break up tiling on any standard material (world-space noise).
  FX.tweak = function (mat, o) {
    const sat = o.sat == null ? 1 : o.sat, macro = o.macro || 0, scale = o.scale || 0.35, gain = o.gain || 1;
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = 'varying vec3 vTwW;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
        vec4 twp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          twp = instanceMatrix * twp;
        #endif
        vTwW = (modelMatrix * twp).xyz;`);
      sh.fragmentShader = `varying vec3 vTwW;
        float twn(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          float n = dot(i, vec3(1.0, 57.0, 113.0));
          vec4 a = fract(sin(vec4(n, n + 1.0, n + 57.0, n + 58.0)) * 43758.5453);
          vec4 b = fract(sin(vec4(n + 113.0, n + 114.0, n + 170.0, n + 171.0)) * 43758.5453);
          vec4 c = mix(a, b, f.z); vec2 d = mix(c.xy, c.zw, f.y); return mix(d.x, d.y, f.x); }
      ` + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114))), diffuseColor.rgb, ${sat.toFixed(3)}) * ${gain.toFixed(3)};
        diffuseColor.rgb *= 1.0 + ${macro.toFixed(3)} * ((twn(vTwW * ${scale.toFixed(3)}) - 0.5) * 0.9 + (twn(vTwW * ${(scale * 4.8).toFixed(3)}) - 0.5) * 0.35);`);
    };
    mat.customProgramCacheKey = () => `tweak-${sat}-${macro}-${scale}-${gain}-${mat.map ? 1 : 0}`;
    return mat;
  };

  /* ---------- canvas helpers for small painted things ------------------------ */
  FX.canvasTex = function (w, h, draw, opts) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = opts && opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    if (opts && opts.repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    return t;
  };
})(window.FX);
