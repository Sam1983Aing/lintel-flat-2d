/* ==========================================================================
   fx-experience.js
   The scroll film shared by the three concepts. It owns:

   - the camera rig: keys orbit a target (yaw, pitch, fov, dist or frame).
     fov and frame are interpolated separately, which gives the dolly zoom
     that turns a flat, telephoto "plate" into depth.
   - scroll choreography: weighted Lenis scroll, rests (hold) on some keys,
     eased travel between rests, a slow push-in while resting.
   - labels painted into the scene: a CSS matrix built from how a 1 m square
     in the label's plane projects, so labels skew and roll with the shot.
   - the HUD (ruler, counter, hint), the loader, the interstitial line, the
     finale reveals and the dossier file panel.

   A concept supplies keys, dossiers, a build() that returns its world, and a
   frame() hook for anything specific (material reveals, DOM choreography).
   ========================================================================== */
window.FX = window.FX || {};
(function (FX) {
  'use strict';

  const DEG = Math.PI / 180;
  const EASE = 'expo.out';

  FX.experience = function (cfg) {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const LOW = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
    const C = Object.assign({
      renderScale: LOW ? 0.7 : 0.9, maxOutDPR: 2, scrollWeight: 1.6, scrollScale: 0.85,
      camWeight: 3.6, parallax: 1.0, fitAspect: 1.5,
    }, cfg.options || {});
    const $ = (id) => document.getElementById(id);

    /* ---------- renderer ---------------------------------------------------- */
    const canvas = $('gl');
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
      if (!renderer.capabilities.isWebGL2) throw new Error('WebGL2 required');
    } catch (err) {
      const n = $('nogl'); if (n) n.hidden = false;
      const l = $('loader'); if (l) l.remove();
      return;
    }
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 5000);
    const post = cfg.finisher ? cfg.finisher(renderer) : new FX.Finisher(renderer, cfg.postOptions);
    const P = Object.assign({ exposure: 1, contrast: 1, saturation: 1, warmth: 0, tint: 0, ao: 0.8, aoRadius: 0.6, bloomAmt: 0.25,
      bloomThreshold: 1.1, halation: 0.08, vignette: 0.32, grain: 0.022, chroma: 0.0012, fadeBlack: 1, vintage: 0, print: 0,
      dof: 0, focus: 10, paperOn: 0, ink: 0, inkReal: 0, paperTex: 1, time: 0 }, cfg.post || {});

    /* ---------- keys and scroll table -------------------------------------- */
    const K = cfg.keys.map((k) => {
      const frame = k.frame != null ? k.frame : k.dist * 2 * Math.tan((k.fov * DEG) / 2);
      return Object.assign({}, k, { lf: Math.log(k.fov), lfr: Math.log(frame), roll: k.roll || 0 });
    });
    let acc = 0;
    K.forEach((k) => {
      k.h0 = acc; acc += (k.hold || 0) * C.scrollScale; k.h1 = acc;
      acc += (k.go || 0) * C.scrollScale; k.g1 = acc;
    });
    const KEY = {};
    K.forEach((k, i) => { KEY[k.id] = i; });
    const LAST = K.length - 1;
    const TRACK = K[LAST].h0 + (cfg.finaleRise || 100);
    const dossiers = cfg.dossiers || [];
    dossiers.forEach((d) => { d.k = KEY[d.key]; });

    const clamp01 = FX.clamp01, smooth = FX.smooth, lerp = FX.lerp;
    function catmull(p0, p1, p2, p3, t) {
      const t2 = t * t, t3 = t2 * t;
      return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
    }
    function mapScroll(s) {
      if (s <= 0) return { idx: 0, push: 0, key: 0, phase: 'hold', f: 0 };
      for (let i = 0; i <= LAST; i++) {
        const k = K[i];
        if (s < k.h0) break;
        if (k.h1 > k.h0 && s <= k.h1) return { idx: i, push: (s - k.h0) / (k.h1 - k.h0), key: i, phase: 'hold', f: (s - k.h0) / (k.h1 - k.h0) };
      }
      let a = 0;
      for (let i = 0; i <= LAST; i++) if (K[i].hold && K[i].h1 <= s) a = i;
      if (a >= LAST) return { idx: LAST, push: 1, key: LAST, phase: 'hold', f: 1 };
      let b = a + 1;
      while (b < LAST && !K[b].hold) b++;
      const s0 = K[a].h1, s1 = K[b].h0;
      const f = clamp01((s - s0) / (s1 - s0));
      const e = 0.5 - 0.5 * Math.cos(Math.PI * f);
      const se = s0 + e * (s1 - s0);
      let i = a;
      while (i < b - 1 && se > K[i].g1) i++;
      const span = K[i].g1 - K[i].h1;
      const lf = span > 0 ? clamp01((se - K[i].h1) / span) : 1;
      return { idx: i + lf, push: 1 - smooth(clamp01(f / 0.35)), key: a, phase: 'go', f, to: b };
    }
    const cam = {};
    function sampleKeys(idx, out) {
      idx = Math.max(0, Math.min(LAST, idx || 0));
      const i = Math.min(LAST - 1, Math.floor(idx)), f = idx - i;
      const k0 = K[Math.max(0, i - 1)], k1 = K[i], k2 = K[i + 1], k3 = K[Math.min(LAST, i + 2)];
      const c = (sel) => catmull(sel(k0), sel(k1), sel(k2), sel(k3), f);
      out.tx = c((k) => k.t[0]); out.ty = c((k) => k.t[1]); out.tz = c((k) => k.t[2]);
      out.yaw = c((k) => k.yaw); out.pitch = c((k) => k.pitch); out.roll = c((k) => k.roll);
      out.lf = c((k) => k.lf); out.lfr = c((k) => k.lfr);
      return out;
    }
    const _t = new THREE.Vector3();
    function applyCamera(c) {
      const fov = Math.exp(c.lf), frame = Math.exp(c.lfr);
      const dist = frame / (2 * Math.tan((fov * DEG) / 2));
      const fit = Math.pow(Math.max(1, C.fitAspect / camera.aspect), 0.6);
      const lens = (2 * Math.atan(Math.tan((fov * DEG) / 2) * fit)) / DEG;
      const cp = Math.cos(c.pitch * DEG);
      camera.position.set(c.tx + Math.sin(c.yaw * DEG) * cp * dist, c.ty + Math.sin(c.pitch * DEG) * dist, c.tz + Math.cos(c.yaw * DEG) * cp * dist);
      camera.up.set(0, 1, 0);
      camera.lookAt(_t.set(c.tx, c.ty, c.tz));
      camera.rotateZ(c.roll * DEG);
      camera.fov = lens;
      camera.near = Math.max(0.05, Math.min(30, dist * 0.02));
      camera.far = Math.max(2000, dist * 6);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      return dist;
    }

    /* ---------- sizing ----------------------------------------------------- */
    let W = innerWidth, H = innerHeight, vh = innerHeight, scale = C.renderScale;
    const track = $('track');
    track.style.height = `${(TRACK * vh) / 100}px`;
    function resize() {
      W = innerWidth; H = innerHeight; vh = innerHeight;
      const dpr = Math.min(devicePixelRatio || 1, C.maxOutDPR);
      renderer.setPixelRatio(dpr);
      renderer.setSize(W, H, false);
      const rdpr = Math.min(dpr, C.maxRenderDPR || 1.25);           // how much of a retina screen the 3D actually fills
      const rw = Math.round(W * scale * rdpr), rh = Math.round(H * scale * rdpr);
      post.setSize(Math.max(2, rw), Math.max(2, rh), Math.round(W * dpr), Math.round(H * dpr));
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      track.style.height = `${(TRACK * vh) / 100}px`;
      buildRuler();
      dossiers.forEach((d) => { d.size = null; });
      if (world) prepLabels();
      if (window.ScrollTrigger) ScrollTrigger.refresh();
      if (cfg.resize) cfg.resize(ctx);
    }

    /* ---------- labels ------------------------------------------------------ */
    const spotsEl = $('spots');
    dossiers.forEach((d, i) => {
      const spot = document.createElement('div');
      spot.className = 'spot';
      const ret = document.createElement('button');
      ret.className = 'reticle';
      ret.setAttribute('aria-label', `Open ${d.kicker || 'item'} ${d.no}, ${d.title.join(' ')}`);
      ret.innerHTML = '<i></i><i></i><i></i><i></i><b></b>';
      spot.appendChild(ret);
      const tag = document.createElement('div');
      tag.className = 'tag';
      tag.innerHTML = `<span class="tag__v"></span><span class="tag__h"></span><span class="tag__no">${d.kicker || ''} ${d.no}</span>` +
        `<span class="tag__title">${d.title.map((t) => `<span><span>${t}</span></span>`).join('')}</span>` +
        `<span class="tag__meta">${d.meta || ''}</span>`;
      spotsEl.append(spot, tag);
      d.el = { spot, ret, tag, v: tag.querySelector('.tag__v'), h: tag.querySelector('.tag__h'), no: tag.querySelector('.tag__no'),
        lines: tag.querySelectorAll('.tag__title > span > span'), meta: tag.querySelector('.tag__meta') };
      ret.addEventListener('click', () => openFile(i));
      tag.addEventListener('click', () => openFile(i));
      gsap.set(d.el.v, { scaleY: 0 }); gsap.set(d.el.h, { scaleX: 0 });
      gsap.set(d.el.lines, { yPercent: 115 }); gsap.set([d.el.no, d.el.meta], { autoAlpha: 0 });
      gsap.set(ret, { autoAlpha: 0, scale: 1.8 });
      d.shown = false;
    });
    function showTag(d) {
      if (d.shown) return;
      d.shown = true;
      const e = d.el, q = reduced ? 0.01 : 1;
      gsap.killTweensOf([e.v, e.h, e.lines, e.no, e.meta, e.ret, e.tag]);
      gsap.set(e.tag, { visibility: 'visible', opacity: 1 });
      gsap.timeline()
        .to(e.ret, { autoAlpha: 1, scale: 1, duration: 1.1 * q, ease: EASE }, 0)
        .to(e.v, { scaleY: 1, duration: 1.2 * q, ease: EASE }, 0.1 * q)
        .to(e.h, { scaleX: 1, duration: 1.4 * q, ease: EASE }, 0.2 * q)
        .to(e.no, { autoAlpha: 1, duration: 0.8 * q, ease: EASE }, 0.35 * q)
        .to(e.lines, { yPercent: 0, duration: 1.2 * q, ease: EASE, stagger: 0.09 * q }, 0.3 * q)
        .to(e.meta, { autoAlpha: 1, duration: 0.8 * q, ease: EASE }, 0.7 * q);
    }
    function hideTag(d) {
      if (!d.shown) return;
      d.shown = false;
      const e = d.el;
      gsap.killTweensOf([e.v, e.h, e.lines, e.no, e.meta, e.ret, e.tag]);
      gsap.timeline()
        .to(e.ret, { autoAlpha: 0, scale: 1.4, duration: 0.5, ease: EASE }, 0)
        .to(e.tag, { opacity: 0, duration: 0.45, ease: EASE }, 0)
        .add(() => {
          gsap.set(e.tag, { visibility: 'hidden' });
          gsap.set(e.v, { scaleY: 0 }); gsap.set(e.h, { scaleX: 0 });
          gsap.set(e.lines, { yPercent: 115 }); gsap.set([e.no, e.meta], { autoAlpha: 0 });
        });
    }
    const _o = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3(), _pv = new THREE.Vector3();
    function project(v, out) {
      _pv.copy(v).project(camera);
      out[0] = (_pv.x * 0.5 + 0.5) * W; out[1] = (-_pv.y * 0.5 + 0.5) * H; out[2] = _pv.z;
      return out;
    }
    const P0 = [0, 0, 0], P1 = [0, 0, 0], P2 = [0, 0, 0], P3 = [0, 0, 0];
    const anchorOf = (d) => (typeof d.anchor === 'string' ? world.anchors[d.anchor] : d.anchor);
    function labelMatrix(d) {
      _o.copy(anchorOf(d)).addScaledVector(d.R, d.label.off[0]).addScaledVector(d.U, d.label.off[1]);
      project(_o, P0); project(_r.copy(_o).add(d.R), P1); project(_u.copy(_o).sub(d.U), P2);
      if (P0[2] > 1 || P1[2] > 1 || P2[2] > 1) return null;
      const ax = P1[0] - P0[0], ay = P1[1] - P0[1], bx = P2[0] - P0[0], by = P2[1] - P0[1];
      const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
      if (la < 1e-3 || lb < 1e-3 || ax * by - ay * bx <= 0) return null;
      return { ax, ay, bx, by, la, lb, x: P0[0], y: P0[1] };
    }
    function prepLabels() {
      dossiers.forEach((d) => {
        applyCamera(sampleKeys(d.k, cam));
        if (d.label.type === 'camera') {
          const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).setY(0).normalize();
          right.applyAxisAngle(new THREE.Vector3(0, 1, 0), (d.label.tilt || 0) * DEG);
          d.R = right; d.U = new THREE.Vector3(0, 1, 0);
        } else {
          d.R = new THREE.Vector3().fromArray(d.label.R).normalize(); d.U = new THREE.Vector3().fromArray(d.label.U).normalize();
        }
        const m = labelMatrix(d);
        d.ref = m ? m.la : 90;
      });
    }
    function placeLabels(activeIdx) {
      dossiers.forEach((d, i) => {
        if (!d.shown && i !== activeIdx) return;
        project(anchorOf(d), P3);
        d.el.spot.style.transform = `translate3d(${P3[0].toFixed(1)}px, ${P3[1].toFixed(1)}px, 0) rotate(${(-cam.roll).toFixed(2)}deg)`;
        d.el.spot.style.visibility = P3[2] < 1 ? 'visible' : 'hidden';
        const m = labelMatrix(d);
        if (!m) { d.el.tag.style.visibility = 'hidden'; return; }
        if (d.shown) d.el.tag.style.visibility = 'visible';
        const k = Math.max(0.8, Math.min(1.2, m.la / d.ref)) * (LOW ? 0.72 : 1);
        const ratio = Math.max(0.7, Math.min(1.35, m.lb / m.la));
        const a = k / m.la, b = (k * ratio) / m.lb;
        if (!d.size) d.size = [d.el.tag.offsetWidth, d.el.tag.offsetHeight];
        const tx = Math.max(12, Math.min(m.x, W - (cfg.labelPadRight == null ? 16 : cfg.labelPadRight) - d.size[0] * k));   // labelPadRight: opt in, keeps titles clear of a ruler
        const ty = Math.max(70, Math.min(m.y, H - 110 - d.size[1] * k));
        d.el.tag.style.transform = `matrix(${(m.ax * a).toFixed(4)}, ${(m.ay * a).toFixed(4)}, ${(m.bx * b).toFixed(4)}, ${(m.by * b).toFixed(4)}, ${tx.toFixed(1)}, ${ty.toFixed(1)})`;
      });
    }

    /* ---------- ruler, count, hint, beat ----------------------------------- */
    const rulerTicks = $('rulerTicks'), rulerNow = $('rulerNow');
    function buildRuler() {
      if (!rulerTicks) return;
      rulerTicks.querySelectorAll('.ruler__tick, .ruler__mark').forEach((n) => n.remove());
      const n = 56;
      for (let i = 0; i <= n; i++) {
        const t = document.createElement('i');
        t.className = 'ruler__tick' + (i % 7 === 0 ? ' ruler__tick--big' : '');
        t.style.top = `${(i / n) * 100}%`;
        rulerTicks.appendChild(t);
      }
      dossiers.forEach((d) => {
        const k = K[d.k];
        const b = document.createElement('button');
        b.className = 'ruler__mark';
        b.style.top = `${(((k.h0 + k.h1) / 2) / TRACK) * 100}%`;
        b.innerHTML = `<span>${d.no}</span>`;
        b.setAttribute('aria-label', `Go to ${d.no}`);
        b.addEventListener('click', () => goTo(k.h0 + (k.h1 - k.h0) * 0.4));
        rulerTicks.appendChild(b);
        d.mark = b;
      });
    }
    const hintEl = $('hint'), hintText = $('hintText'), hintFill = $('hintFill');
    const countEl = $('count'), beatEl = $('beat'), veilEl = $('veil');
    const beatLines = beatEl ? beatEl.querySelectorAll('.beat__line > span') : [];
    if (beatLines.length) gsap.set(beatLines, { yPercent: 110 });
    let beatOn = false;
    function setBeat(on) {
      if (!beatEl || on === beatOn) return;
      beatOn = on;
      gsap.killTweensOf([beatEl, beatLines]);
      if (veilEl) gsap.to(veilEl, { opacity: on ? 1 : 0, duration: on ? 1.6 : 0.8, ease: EASE });
      if (on) {
        gsap.set(beatEl, { visibility: 'visible', opacity: 1 });
        gsap.to(beatLines, { yPercent: 0, duration: reduced ? 0.01 : 1.6, ease: EASE, stagger: 0.25 });
      } else {
        gsap.to(beatEl, { opacity: 0, duration: 0.6, ease: EASE, onComplete: () => { gsap.set(beatEl, { visibility: 'hidden' }); gsap.set(beatLines, { yPercent: 110 }); } });
      }
    }
    let hintMsg = '';
    function setHint(msg) {
      if (!hintText || msg === hintMsg) return;
      hintMsg = msg;
      gsap.to(hintText, { opacity: 0, duration: 0.25, onComplete: () => { hintText.textContent = msg; gsap.to(hintText, { opacity: 1, duration: 0.6, ease: EASE }); } });
    }

    /* ---------- file panel ------------------------------------------------- */
    const fileEl = $('file');
    let fileOpen = false;
    if (fileEl) gsap.set(fileEl, { xPercent: 104, visibility: 'hidden' });
    function openFile(i) {
      const d = dossiers[i];
      if (!fileEl || !d.text) return;
      $('fileNo').textContent = `${d.kicker || ''} ${d.no}`;
      $('fileTitle').textContent = d.title.join(' ');
      $('fileTime').textContent = d.fileMeta || d.meta || '';
      $('fileText').textContent = d.text;
      $('fileFacts').innerHTML = (d.facts || []).map(([a, b]) => `<li><span>${a}</span><b>${b}</b></li>`).join('');
      fileOpen = true;
      fileEl.setAttribute('aria-hidden', 'false');
      gsap.set(fileEl, { visibility: 'visible' });
      gsap.to(fileEl, { xPercent: 0, duration: reduced ? 0.01 : 1.1, ease: EASE });
      gsap.fromTo(fileEl.querySelectorAll('.file__no, .file__title, .file__time, .file__text, .file__facts li'), { y: 18, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: reduced ? 0.01 : 1, ease: EASE, stagger: 0.05, delay: 0.25 });
      if (lenis) lenis.stop();
      $('fileClose').focus({ preventScroll: true });
    }
    function closeFile() {
      if (!fileOpen) return;
      fileOpen = false;
      fileEl.setAttribute('aria-hidden', 'true');
      gsap.to(fileEl, { xPercent: 104, duration: reduced ? 0.01 : 0.9, ease: EASE, onComplete: () => gsap.set(fileEl, { visibility: 'hidden' }) });
      if (lenis) lenis.start();
    }
    if ($('fileClose')) $('fileClose').addEventListener('click', closeFile);
    addEventListener('keydown', (e) => { if (e.key === 'Escape') closeFile(); });

    /* ---------- Lenis and ScrollTrigger share one clock -------------------- */
    gsap.registerPlugin(ScrollTrigger);
    let lenis = null;
    if (!reduced) {
      lenis = new Lenis({ duration: C.scrollWeight, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
      lenis.stop();
    }
    function goTo(units) {
      const y = units === 'end' ? document.documentElement.scrollHeight - innerHeight : (units * vh) / 100;
      if (lenis) lenis.scrollTo(y, { duration: 3.2, easing: (t) => 1 - Math.pow(1 - t, 4) });
      else scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
    }
    document.querySelectorAll('[data-to]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      const v = a.dataset.to;
      if (v === 'end') goTo('end');
      else if (v === '0') goTo(0);
      else if (KEY[v] != null) { const k = K[KEY[v]]; goTo(k.h0 + (k.h1 - k.h0) * 0.4); }
    }));

    /* ---------- pointer ---------------------------------------------------- */
    const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
    addEventListener('pointermove', (e) => { ptr.x = (e.clientX / W) * 2 - 1; ptr.y = (e.clientY / H) * 2 - 1; });

    /* ---------- context handed to the concept ------------------------------ */
    let world = null;
    const ctx = {
      scene, renderer, camera, post, P, K, KEY, C, LOW, reduced, cam,
      get world() { return world; }, get W() { return W; }, get H() { return H; }, get vh() { return vh; },
      at: (id, part) => K[KEY[id]][part || 'h0'],
      span: (x, a, b) => clamp01((x - a) / (b - a)),
      project, goTo, sampleKeys, applyCamera, mapScroll,
    };

    /* ---------- loop ------------------------------------------------------- */
    const heroEl = $('hero'), markEl = document.querySelector('.mark'), cornerEl = document.querySelector('.corner'), rulerEl = $('ruler');
    let sD = 0, running = false, clock = 0, introDone = false;
    let frameAvg = 16, slowFrames = 0, activeTag = -1;
    const st = { sD: 0, m: null, t: 0, dt: 0, dist: 0, flat: 1 };

    function frame(time, deltaMs) {
      if (!running) return;
      const dt = Math.min(0.1, (deltaMs || 16) / 1000);
      clock += dt;
      const s = window.scrollY / (vh / 100);
      sD += (s - sD) * (1 - Math.exp(-dt * C.camWeight));
      if (Math.abs(s - sD) < 1e-4) sD = s;
      const m = mapScroll(sD);
      sampleKeys(m.idx, cam);
      cam.lfr += Math.log(1 - 0.05 * m.push);
      cam.yaw += 1.2 * m.push * (m.key % 2 ? -1 : 1);
      ptr.sx += (ptr.x - ptr.sx) * (1 - Math.exp(-dt * 2.5));
      ptr.sy += (ptr.y - ptr.sy) * (1 - Math.exp(-dt * 2.5));
      const lensK = Math.min(1, Math.exp(cam.lf) / 40);
      if (!reduced) { cam.yaw += ptr.sx * C.parallax * (0.3 + 0.7 * lensK); cam.pitch -= ptr.sy * C.parallax * 0.5 * (0.3 + 0.7 * lensK); }
      st.sD = sD; st.m = m; st.t = reduced ? 0 : clock; st.dt = dt; st.ptr = ptr;
      if (cfg.camera) cfg.camera(ctx, st, cam);
      st.dist = applyCamera(cam);
      st.flat = Math.max(1 - smooth(clamp01(m.idx)), smooth(clamp01(m.idx - (LAST - 1))) * (cfg.endFlat == null ? 0.85 : cfg.endFlat));
      P.time = clock;
      if (cfg.frame) cfg.frame(ctx, st);
      if (world && world.update) world.update(st.t, camera, st);
      post.render(scene, camera, P);
      if (introDone) updateHud(m);
      frameAvg += (dt * 1000 - frameAvg) * 0.05;
      if (frameAvg > 27) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
      if (slowFrames > 90 && scale > 0.5) { scale = Math.max(0.5, scale * 0.86); slowFrames = 0; frameAvg = 16; resize(); }
    }

    function updateHud(m) {
      const heroOut = smooth(clamp01((sD - K[0].h1 * 0.5) / (cfg.heroFade || 34)));
      if (heroEl && !cfg.ownHero) {
        heroEl.style.opacity = String(1 - heroOut);
        heroEl.style.transform = `translate3d(0, ${(-50 * heroOut).toFixed(1)}px, 0)`;
        heroEl.style.visibility = heroOut >= 1 ? 'hidden' : 'visible';
      }
      const endIn = smooth(clamp01((sD - K[LAST].h0 + 40) / 40));
      const finaleIn = smooth(clamp01((sD - K[LAST].h0 - 10) / 30));
      if (markEl) markEl.style.opacity = String(heroOut * (1 - finaleIn));
      if (cornerEl) { cornerEl.style.opacity = String(1 - finaleIn); cornerEl.style.visibility = finaleIn >= 1 ? 'hidden' : 'visible'; }
      if (rulerEl) rulerEl.style.opacity = String(heroOut * (1 - endIn));
      if (countEl) countEl.style.opacity = String(heroOut * (1 - endIn));
      if (rulerNow) rulerNow.style.top = `${(Math.min(sD, TRACK) / TRACK) * 100}%`;
      let live = -1;
      dossiers.forEach((d, i) => { const k = K[d.k]; if (sD > k.h0 - 20 && sD < k.h1 + 16) live = i; });
      if (live !== activeTag) {
        if (activeTag >= 0) hideTag(dossiers[activeTag]);
        if (live >= 0) showTag(dossiers[live]);
        activeTag = live;
        dossiers.forEach((d, i) => d.mark && d.mark.classList.toggle('is-on', i === live));
      }
      placeLabels(live);
      let passed = 0;
      dossiers.forEach((d) => { if (sD > K[d.k].h0 - 20) passed++; });
      if (countEl && countEl.firstElementChild) countEl.firstElementChild.textContent = String(passed).padStart(2, '0');
      const bk = cfg.beatKey ? K[KEY[cfg.beatKey]] : null;
      const inBeat = !!bk && sD > bk.h0 - 25 && sD < bk.h1 + 30;
      setBeat(inBeat && !fileOpen);
      const hints = cfg.hints || {};
      let msg = hintMsg, show = 1;
      if (m.phase === 'hold' && m.key === 0) msg = hints.hero || 'Scroll';
      else if (m.phase === 'hold' && dossiers.length && m.key === dossiers[0].k) msg = hints.first || 'Click the marker to open the file';
      else if (m.phase === 'hold' && dossiers.some((d) => d.k === m.key)) msg = hints.stop || 'Scroll to move on';
      if (inBeat || sD > K[LAST].h0 - 60 || fileOpen) show = 0;
      setHint(msg);
      if (hintEl) hintEl.style.opacity = String(show);
      if (hintFill) hintFill.style.transform = `scaleX(${m.f.toFixed(3)})`;
      if (cfg.hud) cfg.hud(ctx, st);
    }

    /* ---------- loader, intro, finale ------------------------------------- */
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const loadFill = $('loadFill'), loadPct = $('loadPct');
    const loadState = { p: 0 };
    function setProgress(p) {
      gsap.to(loadState, { p, duration: 0.4, ease: 'power1.out', overwrite: true, onUpdate: () => {
        if (loadFill) loadFill.style.transform = `scaleX(${loadState.p})`;
        if (loadPct) loadPct.textContent = `${Math.round(loadState.p * 100)}%`;
      } });
    }
    function playStory() {
      const lines = gsap.utils.toArray('.loader__story p');
      return new Promise((res) => {
        const tl = gsap.timeline({ onComplete: res });
        lines.forEach((p, i) => {
          tl.fromTo(p, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 1.2, ease: EASE }, i * 2.2);
          if (i < lines.length - 1) tl.to(p, { autoAlpha: 0, y: -10, duration: 0.7, ease: 'expo.in' }, i * 2.2 + 1.6);
        });
        tl.to({}, { duration: 0.8 });
      });
    }
    function reveal() {
      const loader = $('loader');
      const tl = gsap.timeline();
      if (loader) tl.to(loader, { autoAlpha: 0, duration: 1.4, ease: EASE, onComplete: () => loader.remove() }, 0);
      tl.to({ v: 1 }, { v: 0, duration: 2.4, ease: 'power2.out', onUpdate() { P.fadeBlack = this.targets()[0].v; } }, 0.1);
      if (cfg.intro) cfg.intro(tl, ctx);
      tl.fromTo(['.corner', '.topbar .btn'], { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2, ease: EASE }, 2.1)
        .add(() => { introDone = true; document.body.classList.remove('is-loading'); if (lenis) lenis.start(); }, 2.0);
    }
    function initFinale() {
      gsap.set('.finale [data-line]', { yPercent: 110 });
      if (document.querySelector('.finale__title')) ScrollTrigger.create({
        trigger: '.finale__title', start: 'top 82%', once: true,
        onEnter: () => gsap.to('.finale [data-line]', { yPercent: 0, duration: reduced ? 0.01 : 1.6, ease: EASE, stagger: 0.14 }),
      });
      gsap.utils.toArray('.finale [data-rise]').forEach((el) => {
        gsap.from(el, { y: 26, autoAlpha: 0, duration: reduced ? 0.01 : 1.4, ease: EASE, scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
      });
      if (document.querySelector('.ghost')) gsap.from('.ghost', { yPercent: 30, autoAlpha: 0, duration: reduced ? 0.01 : 2.2, ease: EASE, scrollTrigger: { trigger: '.ghost', start: 'top 98%', once: true } });
    }

    window.__rig = {
      K, KEY, mapScroll, sampleKeys, camera, P, ctx,
      get sD() { return sD; }, get scale() { return scale; }, get world() { return world; },
      jump(u) { const y = (u * vh) / 100; if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y); sD = u; },
    };
    window.__checkPath = function () {
      const hits = [];
      for (let i = 0; i <= LAST * 100; i++) {
        const idx = i / 100;
        applyCamera(sampleKeys(idx, cam));
        const p = camera.position;
        (world.colliders || []).forEach((c) => { if (c.box.containsPoint(p)) hits.push({ idx, id: c.id, p: p.toArray().map((v) => +v.toFixed(1)) }); });
      }
      return hits;
    };

    async function boot() {
      history.scrollRestoration = 'manual';
      scrollTo(0, 0);
      document.body.classList.add('is-loading');
      if (cfg.preIntro) cfg.preIntro(ctx);
      const story = playStory();
      const fonts = document.fonts ? Promise.race([document.fonts.ready, wait(2500)]) : Promise.resolve();
      await fonts;
      resize();
      const loader = new FX.Loader(renderer, (p) => setProgress(p * 0.94));
      ctx.loader = loader;
      world = await cfg.build(ctx);
      resize();
      prepLabels();
      applyCamera(sampleKeys(0, cam));
      renderer.compile(scene, camera);
      // upload every texture now, so nothing stalls the first time the camera sees it
      if (renderer.initTexture) {
        const seen = new Set();
        const up = (t) => { if (t && t.isTexture && !seen.has(t)) { seen.add(t); renderer.initTexture(t); } };
        scene.traverse((o) => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
          ms.forEach((m) => { for (const k in m) up(m[k]); if (m.uniforms) for (const k in m.uniforms) up(m.uniforms[k].value); }); });
        (world.preload || []).forEach(up);
      }
      if (world.precompile) world.precompile();
      running = true;
      gsap.ticker.add(frame);
      setProgress(1);
      initFinale();
      addEventListener('resize', resize);
      const at = new URLSearchParams(location.search).get('at');
      if (at == null) { await story; await wait(300); }
      reveal();
      if (at != null) setTimeout(() => window.__rig.jump(parseFloat(at)), 50);
    }
    boot().catch((err) => {
      console.error(err);
      const l = $('loader');
      if (l && l.querySelector('.loader__story')) l.querySelector('.loader__story').innerHTML = '<p style="opacity:1;visibility:visible">Something went wrong while building the scene.<br>Reload to try again.</p>';
    });
    return ctx;
  };
})(window.FX);
