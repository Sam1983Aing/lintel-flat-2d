/* ==========================================================================
   Lintel, hero options (5 Oct 2026). Sam's picks of 6 Oct are the defaults, and
   every option stays available behind its URL switch (he may still change his mind).

     ?type=stencil (default) | azulejo | redline | olive | brass | classic
         pairs of a square sans display face and an accent colour.
         classic is the serif and oxide the page had before
     ?loader=dimension | lintel | datum
         three one-piece loaders, each followed by the drawn opening.
         No pick yet: without the switch the page keeps its first loader
     ?hero=draw
         the drawn opening on its own, behind the current loader
     (?fill= lives in scene.js: laid is the default, level, section and circle are the others)

   The drawn opening: the sheet starts blank and close on the main block. Two
   pens leave the front door and trace the outline of the house in opposite
   directions, the partitions follow, then the sheet is inked room by room,
   nearest the door first (walls, hatch and furniture, then each room's name,
   then the dimensions) while the camera steps back to the whole sheet. The headline rises while the lines are being drawn.

   scene.js calls init / preIntro / intro / camera / frame when this file is loaded.
   ========================================================================== */
(function () {
  'use strict';
  const q = new URLSearchParams(location.search);
  const root = document.documentElement;
  const TYPE = q.get('type') || 'stencil', LOADER = q.get('loader');
  const DRAW = !!LOADER || q.get('hero') === 'draw';
  const SKIP = q.get('at') != null || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = [];

  /* ---------- type and accent ------------------------------------------------ */
  const TYPES = {
    azulejo: { font: 'Michroma', gf: 'Michroma', accent: '#1f4e9c', w: 400, upper: true,
      hero: 'clamp(24px, 2.8vw, 48px)', lh: 1.2, ls: '0', tag: 'clamp(16px, 1.55vw, 25px)', tagLh: 1.2,
      fin: 'clamp(20px, 2.95vw, 50px)', finLh: 1.25, mark: '15px', markLs: '0.06em', file: '26px' },
    redline: { font: 'Saira Condensed', gf: 'Saira+Condensed:wght@400;500;600', accent: '#d2301c', w: 500, upper: true,
      hero: 'clamp(48px, 5.7vw, 98px)', lh: 0.9, ls: '0', tag: 'clamp(34px, 3.3vw, 54px)', tagLh: 0.92,
      fin: 'clamp(44px, 6.9vw, 118px)', finLh: 0.94, mark: '27px', markLs: '0.03em', file: '50px' },
    olive: { font: 'Jura', gf: 'Jura:wght@300;400;500', accent: '#66722e', w: 300, upper: false,
      hero: 'clamp(40px, 4.7vw, 80px)', lh: 1.02, ls: '-0.015em', tag: 'clamp(27px, 2.6vw, 43px)', tagLh: 1.02, tagW: 400,
      fin: 'clamp(34px, 5.1vw, 88px)', finLh: 1.08, mark: '24px', markLs: '0', file: '42px' },
    brass: { font: 'Bai Jamjuree', gf: 'Bai+Jamjuree:wght@300;400;500', accent: '#a47a1f', w: 400, upper: false,
      hero: 'clamp(42px, 4.9vw, 84px)', lh: 1.0, ls: '-0.025em', tag: 'clamp(27px, 2.6vw, 43px)', tagLh: 1.0,
      fin: 'clamp(34px, 5vw, 86px)', finLh: 1.06, mark: '24px', markLs: '-0.01em', file: '42px' },
    stencil: { font: 'Saira Stencil One', gf: 'Saira+Stencil+One', accent: '#f0500f', w: 400, upper: true,
      hero: 'clamp(32px, 3.75vw, 64px)', lh: 1.04, ls: '0.01em', tag: 'clamp(22px, 2.15vw, 35px)', tagLh: 1.04,
      fin: 'clamp(28px, 4.2vw, 72px)', finLh: 1.08, mark: '20px', markLs: '0.04em', file: '36px' },
  };
  const T = TYPES[TYPE];
  if (T) {
    root.dataset.type = TYPE;
    if (!document.querySelector(`link[href*="${T.gf.split(':')[0]}"]`)) {       // the default face is already linked in index.html
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${T.gf}&display=swap`;
      document.head.appendChild(link);
    }
    const up = T.upper ? 'text-transform: uppercase;' : '';
    css.push(`
      :root { --accent: ${T.accent}; --display: '${T.font}', 'Geist', sans-serif;
        --tag-title-font: ${T.tagW || T.w} ${T.tag}/${T.tagLh} var(--display);
        --file-title-font: ${T.w} ${T.file}/1.08 var(--display); --file-text-font: 400 17px/1.6 var(--body);
        --loader-story-font: ${T.w} ${T.tag}/1.3 var(--display); }
      .loader__story { letter-spacing: ${T.ls}; ${up} }
      .hero__title { font-size: ${T.hero}; line-height: ${T.lh}; letter-spacing: ${T.ls}; font-weight: ${T.w}; ${up} }
      .hero__title .mask { padding-bottom: 0.08em; }
      .hero__title em, .finale__title em { font-style: normal; }
      .hero__lede { top: calc(112px + 3 * ${T.lh + 0.08} * ${T.hero} + 26px); }
      .finale__title { font-size: ${T.fin}; line-height: ${T.finLh}; letter-spacing: ${T.ls}; font-weight: ${T.w}; ${up} }
      .tag__title, .file__title { letter-spacing: ${T.ls}; ${up} }
      .mark { font: ${T.w} ${T.mark}/1 var(--display); letter-spacing: ${T.markLs}; ${up} }
      .ghost { font-weight: ${T.w}; ${up} ${T.upper ? 'font-size: clamp(60px, 15vw, 270px); letter-spacing: 0;' : ''} }
      @media (max-width: 760px) { .hero__title { font-size: calc(${T.hero} * 1.25); } }
    `);
  }

  /* ---------- state ------------------------------------------------------------ */
  // k: camera, 0 close on the main block, 1 the whole sheet. pen, inner, garden: the drawn lines.
  // ink: the sheet being inked room by room, 0 to 1. edge: the fine outlines. lines: the draft's opacity.
  const END = { k: 1, pen: 1, inner: 1, garden: 1, ink: 1, edge: 1, lines: 0, north: 0, done: true };
  const S = DRAW && !SKIP ? { k: 0, pen: 0, inner: 0, garden: 0, ink: 0, edge: 0, lines: 1, north: 0, done: false } : Object.assign({}, END);
  const DOOR = [15, 26];
  let D = null, CTX = null, draft = null, dg = null, geo = null, tlIntro = null, order = [], inked = false;
  const lerp = (a, b, t) => a + (b - a) * t, clamp01 = (x) => Math.max(0, Math.min(1, x));

  if (DRAW || LOADER) {
    css.push(`
      #draft { position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 5; pointer-events: none; }
      html.is-intro, html.is-intro body { overflow: hidden !important; }
      html.is-intro .topbar, html.is-intro .corner, html.is-intro .hint { opacity: 0 !important; }
      html.intro-out .topbar, html.intro-out .corner, html.intro-out .hint { transition: opacity 1.4s cubic-bezier(0.16, 1, 0.3, 1); }
      html[data-loader] #loader { display: none !important; }
      #ld { position: fixed; inset: 0; z-index: 100; pointer-events: none; color: var(--fg); }
      #ld i { position: absolute; inset: 0; background: var(--bg); }
      #ld svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
      #ld line, #ld circle, #ld path { stroke: currentColor; fill: none; stroke-width: 1; vector-effect: non-scaling-stroke; }
      #ld text { font: 500 13px/1 var(--label); letter-spacing: 0.08em; fill: currentColor; }
      #ld .solid { fill: currentColor; stroke: none; }
    `);
  }
  if (css.length) { const st = document.createElement('style'); st.textContent = css.join('\n'); document.head.appendChild(st); }
  if (LOADER) root.dataset.loader = LOADER;

  /* ---------- the outline of the house, from the room table --------------------- */
  function geometry() {
    const cells = new Map();
    const mark = (axis, c, a, b) => { for (let i = a; i < b; i++) { const k = axis + '|' + c + '|' + i; cells.set(k, (cells.get(k) || 0) + 1); } };
    D.ROOMS.filter((r) => !r.outdoor).forEach((r) => {
      const [x0, y0, x1, y1] = r.r;
      mark('h', y0, x0, x1); mark('h', y1, x0, x1); mark('v', x0, y0, y1); mark('v', x1, y0, y1);
    });
    // an edge with a room on one side only is the outside wall, with rooms on both sides a partition
    const adj = new Map(), inner = new Map();
    const key = (p) => p[0] + ',' + p[1];
    const link = (a, b) => { if (!adj.has(key(a))) adj.set(key(a), []); adj.get(key(a)).push(b); };
    cells.forEach((n, k) => {
      const [axis, c, i] = k.split('|'), cc = +c, ii = +i;
      const a = axis === 'h' ? [ii, cc] : [cc, ii], b = axis === 'h' ? [ii + 1, cc] : [cc, ii + 1];
      if (n === 1) { link(a, b); link(b, a); } else { const lk = axis + '|' + c; if (!inner.has(lk)) inner.set(lk, []); inner.get(lk).push(ii); }
    });
    // walk the outside wall once round, starting at the front door and heading west
    const loop = [DOOR.slice()];
    let prev = DOOR, cur = [DOOR[0] - 1, DOOR[1]], dir = [-1, 0], guard = 0;
    while ((cur[0] !== DOOR[0] || cur[1] !== DOOR[1]) && guard++ < 2000) {
      const nx = (adj.get(key(cur)) || []).find((p) => p[0] !== prev[0] || p[1] !== prev[1]);
      if (!nx) break;
      const nd = [nx[0] - cur[0], nx[1] - cur[1]];
      if (nd[0] !== dir[0] || nd[1] !== dir[1]) loop.push(cur.slice());
      dir = nd; prev = cur; cur = nx;
    }
    loop.push(DOOR.slice());
    const cum = [0];
    for (let i = 1; i < loop.length; i++) cum.push(cum[i - 1] + Math.hypot(loop[i][0] - loop[i - 1][0], loop[i][1] - loop[i - 1][1]));
    // partitions: straight runs, each drawn from the end nearer the door
    const runs = [];
    inner.forEach((list, lk) => {
      const [axis, c] = lk.split('|'), cc = +c;
      list.sort((a, b) => a - b);
      let a = list[0], b = list[0] + 1;
      const push = () => {
        let p = axis === 'h' ? [a, cc] : [cc, a], e = axis === 'h' ? [b, cc] : [cc, b];
        if (Math.hypot(e[0] - DOOR[0], e[1] - DOOR[1]) < Math.hypot(p[0] - DOOR[0], p[1] - DOOR[1])) { const t = p; p = e; e = t; }
        runs.push({ p, e, d: Math.hypot(p[0] - DOOR[0], p[1] - DOOR[1]) });
      };
      for (let i = 1; i < list.length; i++) { if (list[i] === b) b++; else { push(); a = list[i]; b = a + 1; } }
      push();
    });
    const far = Math.max.apply(null, runs.map((r) => r.d));
    runs.forEach((r) => { r.t = r.d / far; });
    const garden = [[59, 41], [62, 41], [62, 50], [41, 50], [41, 41]];
    // how far each room is from the front door, 0 to 1
    const dist = D.ROOMS.map((r) => Math.hypot(Math.max(r.r[0] - DOOR[0], 0, DOOR[0] - r.r[2]), Math.max(r.r[1] - (DOOR[1] - 0.5), 0, (DOOR[1] - 0.5) - r.r[3])));
    const dmax = Math.max.apply(null, dist);
    order = dist.map((d) => d / dmax);
    return { loop, cum, len: cum[cum.length - 1], runs, garden };
  }

  /* ---------- the draft: thin lines drawn on a 2D canvas over the sheet ---------- */
  const _v = window.THREE ? new THREE.Vector3() : null, _o = [0, 0, 0];
  let AX = null;                                             // plan metres to screen pixels, refreshed every frame
  function axes() {
    const P = (x, y) => { CTX.project(_v.set(x - D.OX, 1.2, y - D.OZ), _o); return [_o[0], _o[1]]; };
    const p0 = P(0, 0), p1 = P(44, 0), p2 = P(0, 32);
    AX = { e: p0[0], f: p0[1], a: (p1[0] - p0[0]) / 44, b: (p1[1] - p0[1]) / 44, c: (p2[0] - p0[0]) / 32, d: (p2[1] - p0[1]) / 32 };
    return AX;
  }
  const SX = (x, y) => AX.e + AX.a * x + AX.c * y, SY = (x, y) => AX.f + AX.b * x + AX.d * y;

  function seg(a, b, over) {
    // a finished line runs a little past its corners, the way a drafted line does
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, o = over || 0;
    dg.moveTo(SX(a[0] - (dx / l) * o, a[1] - (dy / l) * o), SY(a[0] - (dx / l) * o, a[1] - (dy / l) * o));
    dg.lineTo(SX(b[0] + (dx / l) * o, b[1] + (dy / l) * o), SY(b[0] + (dx / l) * o, b[1] + (dy / l) * o));
  }
  function along(pts, cum, s0, s1, heads) {
    // the part of a polyline between two distances along it
    for (let i = 1; i < pts.length; i++) {
      const a0 = cum[i - 1], a1 = cum[i];
      if (s1 <= a0 || s0 >= a1) continue;
      const t0 = clamp01((s0 - a0) / (a1 - a0)), t1 = clamp01((s1 - a0) / (a1 - a0));
      const A = [lerp(pts[i - 1][0], pts[i][0], t0), lerp(pts[i - 1][1], pts[i][1], t0)];
      const B = [lerp(pts[i - 1][0], pts[i][0], t1), lerp(pts[i - 1][1], pts[i][1], t1)];
      const whole = t0 <= 0 && t1 >= 1;
      seg(A, B, whole ? 0.32 : 0);
      if (heads) { if (s1 < a1 && s1 > a0) heads.push(B); if (s0 > a0 && s0 < a1) heads.push(A); }
    }
  }
  function drawDraft() {
    if (!draft) return;
    const dpr = draft._dpr, W = innerWidth, H = innerHeight;
    if (draft.width !== Math.round(W * dpr)) { draft.width = Math.round(W * dpr); draft.height = Math.round(H * dpr); }
    dg.setTransform(dpr, 0, 0, dpr, 0, 0);
    dg.clearRect(0, 0, W, H);
    if (S.lines <= 0.002) return;
    axes();
    const ink = getComputedStyle(root).getPropertyValue('--fg').trim() || '#1d1d1f';
    dg.lineCap = 'butt';
    dg.strokeStyle = ink;
    // partitions first, lighter
    dg.globalAlpha = 0.6 * S.lines; dg.lineWidth = 1;
    dg.beginPath();
    geo.runs.forEach((r) => {
      const f = clamp01((S.inner - r.t * 0.62) / 0.38), e = 1 - Math.pow(1 - f, 3);
      if (e <= 0) return;
      seg(r.p, [lerp(r.p[0], r.e[0], e), lerp(r.p[1], r.e[1], e)], e >= 1 ? 0.25 : 0);
    });
    if (S.garden > 0) {
      const gc = [0]; for (let i = 1; i < geo.garden.length; i++) gc.push(gc[i - 1] + Math.hypot(geo.garden[i][0] - geo.garden[i - 1][0], geo.garden[i][1] - geo.garden[i - 1][1]));
      along(geo.garden, gc, 0, gc[gc.length - 1] * S.garden, null);
    }
    dg.stroke();
    // the outside wall: two pens leave the door and meet on the far side
    const heads = [], half = geo.len / 2;
    dg.globalAlpha = 0.92 * S.lines; dg.lineWidth = 1.35;
    dg.beginPath();
    if (S.north > 0) seg([0, 0], [44, 0], 0);
    if (S.pen > 0) {
      along(geo.loop, geo.cum, 0, half * S.pen, heads);
      along(geo.loop, geo.cum, geo.len - half * S.pen, geo.len, heads);
    }
    dg.stroke();
    if (S.pen > 0 && S.pen < 1) {
      dg.globalAlpha = S.lines;
      dg.fillStyle = getComputedStyle(root).getPropertyValue('--accent').trim() || '#b8452a';
      heads.forEach((h) => { dg.beginPath(); dg.arc(SX(h[0], h[1]), SY(h[0], h[1]), 2.6, 0, Math.PI * 2); dg.fill(); });
    }
    dg.globalAlpha = 1;
  }

  /* ---------- where the camera starts: close on the main block ------------------- */
  function close() {
    const asp = innerWidth / innerHeight;
    const fit = Math.pow(Math.max(1, ((CTX && CTX.C.fitAspect) || 1.5) / asp), 0.6);   // the engine widens the lens on a tall screen
    if (asp < 0.8) {
      const visW = 50, frame = visW / (fit * asp), visH = frame * fit;
      return { x: 22, y: 16 - 0.1 * visH, frame };
    }
    const visH = Math.max(44, 72 / asp), visW = visH * asp;
    return { x: 49.5 - visW / 2, y: 15.2, frame: visH / fit };
  }

  /* ---------- loaders ---------------------------------------------------------------
     One element each. Progress is read from the engine's own counter. */
  let ld = null, shown = 0, target = 0, creep = 0, loadedCb = null, ldRender = null, ldExit = null;
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
  const set = (n, attrs) => { for (const k in attrs) n.setAttribute(k, attrs[k]); };

  function buildLoader() {
    ld = document.createElement('div');
    ld.id = 'ld';
    ld.innerHTML = '<i></i>';
    const W = innerWidth, H = innerHeight, cx = W / 2, cy = H / 2;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none' }, null);
    ld.appendChild(svg);
    document.body.appendChild(ld);
    const bg = ld.firstChild;

    if (LOADER === 'dimension') {
      // a dimension line that measures the house: it runs to 44.00 m, the width of the plan,
      // then becomes the first line of the drawing (the north wall)
      const L = Math.min(620, W * 0.66);
      const m = { x0: cx, x1: cx, y: cy, tick: 1, num: 1 };
      const main = el('line', {}, svg), ta = el('line', {}, svg), tb = el('line', {}, svg), wa = el('line', {}, svg), wb = el('line', {}, svg);
      const num = el('text', { 'text-anchor': 'middle' }, svg);
      ldRender = () => {
        if (!m.moving) { m.x0 = cx - (L / 2) * shown; m.x1 = cx + (L / 2) * shown; }
        const t = m.tick;
        set(main, { x1: m.x0 - 10 * t, y1: m.y, x2: m.x1 + 10 * t, y2: m.y });
        set(ta, { x1: m.x0 - 6 * t, y1: m.y + 6 * t, x2: m.x0 + 6 * t, y2: m.y - 6 * t });
        set(tb, { x1: m.x1 - 6 * t, y1: m.y + 6 * t, x2: m.x1 + 6 * t, y2: m.y - 6 * t });
        set(wa, { x1: m.x0, y1: m.y - 9 * t, x2: m.x0, y2: m.y + 20 * t });
        set(wb, { x1: m.x1, y1: m.y - 9 * t, x2: m.x1, y2: m.y + 20 * t });
        set(num, { x: (m.x0 + m.x1) / 2, y: m.y - 16, opacity: m.num });
        num.textContent = (44 * shown).toFixed(2);
      };
      ldExit = (done) => {
        axes();
        m.moving = true;
        gsap.timeline({ onUpdate: ldRender, onComplete: () => { S.north = 1; done(); } })
          .to(m, { num: 0, duration: 0.45, ease: 'power1.out' }, 0.35)
          .to(m, { x0: SX(0, 0), x1: SX(44, 0), y: SY(0, 0), duration: 1.15, ease: 'expo.inOut' }, 0.35)
          .to(m, { tick: 0, duration: 0.6, ease: 'power2.inOut' }, 0.8)
          .to(bg, { opacity: 0, duration: 0.8, ease: 'power1.inOut' }, 0.55);
      };
    } else if (LOADER === 'lintel') {
      // two posts rise as the page loads, then the lintel is laid across them, and you go through the door
      const h = Math.min(300, H * 0.36), w = (h * 2.4) / 4.2, over = (h * 0.3) / 4.2, beam = (h * 0.34) / 4.2, gy = cy + h / 2;
      const g = el('g', {}, svg);
      const ground = el('line', { x1: cx - w * 1.15, y1: gy, x2: cx + w * 1.15, y2: gy }, g);
      const pa = el('line', {}, g), pb = el('line', {}, g);
      const bar = el('rect', { class: 'solid', x: cx - w / 2 - over, y: gy - h - beam, width: 0, height: beam }, g);
      const m = { beam: 0, z: 1, o: 1 };
      ldRender = () => {
        const top = gy - h * shown;
        set(pa, { x1: cx - w / 2, y1: gy, x2: cx - w / 2, y2: top });
        set(pb, { x1: cx + w / 2, y1: gy, x2: cx + w / 2, y2: top });
        set(bar, { width: (w + over * 2) * m.beam });
        // go through: everything grows away from the middle of the opening
        const oy = gy - h * 0.45;
        set(g, { transform: `translate(${cx} ${oy}) scale(${m.z}) translate(${-cx} ${-oy})`, opacity: m.o });
      };
      ldExit = (done) => {
        gsap.timeline({ onUpdate: ldRender, onComplete: done })
          .to(m, { beam: 1, duration: 0.55, ease: 'power3.inOut' }, 0.1)
          .to(ground, { opacity: 0, duration: 0.4 }, 0.75)
          .to(m, { z: 9, duration: 1.0, ease: 'power3.in' }, 0.8)
          .to(bg, { opacity: 0, duration: 0.55, ease: 'power1.in' }, 1.25)
          .to(m, { o: 0, duration: 0.25, ease: 'none' }, 1.55);
      };
    } else {
      // datum: the setting-out point. A circle and two axes that run out to the edges of the sheet,
      // then travel to the corner of the house where grid lines A and 1 cross
      const r = 17, C = 2 * Math.PI * r;
      const m = { x: cx, y: cy, r, o: 1 };
      const hx = el('line', {}, svg), vx = el('line', {}, svg);
      const ring = el('circle', { 'stroke-dasharray': C }, svg);
      ldRender = () => {
        set(hx, { x1: m.x - W * shown, y1: m.y, x2: m.x + W * shown, y2: m.y, opacity: m.o });
        set(vx, { x1: m.x, y1: m.y - H * shown, x2: m.x, y2: m.y + H * shown, opacity: m.o });
        set(ring, { cx: m.x, cy: m.y, r: m.r, 'stroke-dashoffset': C * (1 - shown), transform: `rotate(-90 ${m.x} ${m.y})`, opacity: m.o });
      };
      ldExit = (done) => {
        axes();
        gsap.timeline({ onUpdate: ldRender, onComplete: done })
          .to(m, { x: SX(0, 0), y: SY(0, 0), duration: 1.1, ease: 'expo.inOut' }, 0.3)
          .to(m, { r: 6, duration: 1.1, ease: 'expo.inOut' }, 0.3)
          .to(bg, { opacity: 0, duration: 0.8, ease: 'power1.inOut' }, 0.45)
          .to(m, { o: 0, duration: 0.7, ease: 'power1.inOut' }, 1.25);
      };
    }
    ldRender();
    const pct = document.getElementById('loadPct');
    let last = performance.now();
    const tick = () => {
      const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (pct) target = Math.max(target, (parseFloat(pct.textContent) || 0) / 100);
      // never faster than 1.6 s from empty to full, so the idea has time to read
      creep = Math.min(0.22, creep + dt * 0.07);
      shown = Math.min(Math.max(target, creep), shown + dt / 1.6);
      ldRender();
      if (shown >= 1 && loadedCb) { const cb = loadedCb; loadedCb = null; gsap.ticker.remove(tick); cb(); }
    };
    gsap.ticker.add(tick);
  }

  /* ---------- the score --------------------------------------------------------- */
  const hurry = (e) => { if (tlIntro) tlIntro.timeScale(3); if (e.cancelable) e.preventDefault(); e.stopPropagation(); };
  const keys = (e) => { if ([' ', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'End', 'Home'].includes(e.key)) hurry(e); };
  function lock(on) {
    const f = on ? 'addEventListener' : 'removeEventListener';
    window[f]('wheel', hurry, { capture: true, passive: false });
    window[f]('touchmove', hurry, { capture: true, passive: false });
    window[f]('keydown', keys, { capture: true });
    root.classList.toggle('is-intro', on);
  }
  function finish() {
    Object.assign(S, END);
    if (draft) { draft.remove(); draft = null; }
    root.classList.add('intro-out');
    lock(false);
    setTimeout(() => root.classList.remove('intro-out'), 1800);
  }
  function play() {
    const lines = document.querySelectorAll('.hero__title .mask > span');
    tlIntro = gsap.timeline({ onComplete: finish })
      .to(S, { pen: 1, duration: 2.7, ease: 'power1.inOut' }, 0)
      .to(S, { inner: 1, duration: 2.0, ease: 'none' }, 0.55)
      .to(lines, { yPercent: 0, duration: 1.5, ease: 'expo.out', stagger: 0.14 }, 1.15)
      .to(S, { k: 1, duration: 2.7, ease: 'power3.inOut' }, 2.05)
      .to(S, { ink: 1, duration: 2.3, ease: 'power1.inOut' }, 2.1)
      .to(S, { garden: 1, duration: 0.9, ease: 'power1.inOut' }, 2.3)
      .to(S, { edge: 1, duration: 1.2, ease: 'power1.inOut' }, 2.7)
      .to(S, { lines: 0, duration: 1.0, ease: 'power1.out' }, 3.4)
      .to('.hero__kicker, .hero__lede, .titleblock', { autoAlpha: 1, y: 0, duration: 1.3, ease: 'expo.out', stagger: 0.08 }, 3.7)
      .to({}, { duration: 0.01 }, 4.75);
  }

  window.LINTEL_HERO = {
    draw: DRAW, type: TYPE, loader: LOADER, state: S,
    init(d) { D = d; },
    preIntro(ctx) {
      CTX = ctx;
      if (LOADER) {
        document.querySelectorAll('.loader__story p').forEach((p) => p.remove());   // the old story would hold the page for seven seconds
        if (!SKIP) buildLoader();
      }
      if (!DRAW || SKIP) return;
      geo = geometry();
      draft = document.createElement('canvas');
      draft.id = 'draft';
      draft._dpr = Math.min(devicePixelRatio || 1, 2);
      dg = draft.getContext('2d');
      document.body.appendChild(draft);
      gsap.set('.hero__title .mask > span', { yPercent: 110 });
      gsap.set('.hero__kicker, .hero__lede, .titleblock', { autoAlpha: 0, y: 12 });
      lock(true);
    },
    intro() {
      if (!DRAW || SKIP) { if (ld) ld.remove(); return; }
      if (LOADER && ld) {
        target = 1;
        loadedCb = () => ldExit(() => { ld.remove(); ld = null; play(); });
      } else gsap.delayedCall(0.7, play);
    },
    camera(ctx, st, cam) {
      if (!DRAW || S.done) return;
      const c = close();
      cam.tx = lerp(c.x - D.OX, cam.tx, S.k);
      cam.tz = lerp(c.y - D.OZ, cam.tz, S.k);
      cam.lfr = lerp(Math.log(c.frame), cam.lfr, S.k);
    },
    frame(ctx, st, P) {
      if (!DRAW) return;
      if (S.done) { if (!inked) { D.ru().uRI.value.fill(1); D.ru().uXI.value = 1; inked = true; } return; }
      // rooms take their ink in turn, the ones nearest the front door first, the sheet's own notes last
      const ri = D.ru().uRI.value;
      order.forEach((o, i) => { ri[i] = clamp01((S.ink - o * 0.7) / 0.3); });
      D.ru().uXI.value = clamp01((S.ink - 0.66) / 0.34);
      P.ink *= S.edge;
      drawDraft();
    },
  };
})();
