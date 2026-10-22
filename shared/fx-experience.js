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
      renderScale: LOW ? 0.7 : 0.9, maxOutDPR: 2, scrollWeight: 0.88, scrollScale: 0.80,
      camWeight: 9.0, parallax: 1.0, fitAspect: 1.5,
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

    /* ---------- labels & right-hand scrollable studio window ---------------- */
    const spotsEl = $('spots');
    const swEl = $('studioWindow'), swBody = $('swBody'), swScrollFill = $('swScrollFill'), swAnchor = $('swAnchor');
    const rnavEl = $('roomNav'), rnavStep = $('rnavStep'), rnavRoom = $('rnavRoom'), rnavFill = $('rnavFill');
    const rnavPrev = $('rnavPrev'), rnavNext = $('rnavNext'), rnavNextLabel = $('rnavNextLabel');
    const rnavWinBtn = $('rnavWinBtn'), rnavWinText = $('rnavWinText');
    const swToggleBtn = $('swToggleBtn'), swToggleText = $('swToggleText');
    const swCtaBtn = $('swCtaBtn'), swCtaText = $('swCtaText'), swMoreBtn = $('swMoreBtn'), swMoreText = $('swMoreText');
    const heroEnterBtn = $('heroEnterBtn');
    const svgNS = 'http://www.w3.org/2000/svg';
    let swCollapsed = false;
    let swRenderedIdx = -1;

    function updateSwScrollBar() {
      if (!swBody || !swScrollFill) return;
      const maxS = Math.max(1, swBody.scrollHeight - swBody.clientHeight);
      const p = swBody.scrollHeight <= swBody.clientHeight + 2 ? 1 : clamp01(swBody.scrollTop / maxS);
      swScrollFill.style.transform = `scaleY(${Math.max(0.15, p).toFixed(3)})`;
      if (swMoreBtn && swMoreText) {
        const atBottom = p > 0.85;
        swMoreText.textContent = atBottom ? 'Back to Top' : 'Scroll Dossier';
        const icon = swMoreBtn.querySelector('i');
        if (icon) icon.textContent = atBottom ? '↑' : '↓';
      }
    }
    if (swBody) {
      swBody.addEventListener('scroll', updateSwScrollBar, { passive: true });
      swBody.addEventListener('wheel', (ev) => {
        ev.stopPropagation();
      }, { passive: false });
      swBody.addEventListener('touchmove', (ev) => {
        ev.stopPropagation();
      }, { passive: true });
    }
    if (swMoreBtn && swBody) {
      swMoreBtn.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const maxS = Math.max(1, swBody.scrollHeight - swBody.clientHeight);
        const atBottom = swBody.scrollTop >= maxS * 0.85;
        swBody.scrollTo({
          top: atBottom ? 0 : Math.min(maxS, swBody.scrollTop + 280),
          behavior: 'smooth',
        });
      });
    }

    function setSwCollapsed(collapsed) {
      swCollapsed = !!collapsed;
      document.documentElement.classList.toggle('sw-collapsed', swCollapsed);
      if (swToggleBtn) swToggleBtn.blur();
      if (swToggleText) swToggleText.textContent = swCollapsed ? 'Open Section' : 'View 3D Room';
      if (rnavWinText) rnavWinText.textContent = swCollapsed ? 'Show Card' : 'Hide Card';
    }
    if (swToggleBtn) {
      swToggleBtn.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        setSwCollapsed(!swCollapsed);
      });
    }
    if (rnavWinBtn) {
      rnavWinBtn.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        setSwCollapsed(!swCollapsed);
      });
    }

    function renderStudioModule(d) {
      const mWrap = $('swModuleWrap'), mBody = $('swModuleBody');
      if (!mWrap || !mBody) return;
      mWrap.hidden = false;
      const form = d.form || 'showcase-slides';

      // FORM 1: Interactive 3-Slide Visual Service Carousel (Stop 01 · Services)
      if (form === 'showcase-slides' && d.slides && d.slides.length) {
        const slides = d.slides;
        let cur = 0;
        mBody.innerHTML = `
          <div class="sw-slider">
            <div class="sw-slider__bar">
              <div class="sw-slider__tabs" role="tablist">
                ${slides.map((s, i) => `
                  <button type="button" class="sw-slider__tab ${i === 0 ? 'is-active' : ''}" data-idx="${i}">
                    ${s.tag}
                  </button>
                `).join('')}
              </div>
              <div class="sw-slider__nav">
                <button type="button" class="sw-slider__arrow" data-dir="-1" aria-label="Previous slide">←</button>
                <span class="sw-slider__count"><b id="swSlideIdx">01</b> / 0${slides.length}</span>
                <button type="button" class="sw-slider__arrow" data-dir="1" aria-label="Next slide">→</button>
              </div>
            </div>
            <div class="sw-slider__viewport">
              <div class="sw-slider__media">
                <img class="sw-slider__img" id="swSlideImg" src="${slides[0].img}" alt="${slides[0].title}" loading="eager" />
                <span class="sw-slider__badge" id="swSlideBadge">${slides[0].badge}</span>
                <span class="sw-slider__stat" id="swSlideStat">${slides[0].stat}</span>
              </div>
              <div class="sw-slider__copy">
                <h3 class="sw-slider__title" id="swSlideTitle">${slides[0].title}</h3>
                <p class="sw-slider__desc" id="swSlideDesc">${slides[0].desc}</p>
              </div>
            </div>
          </div>
        `;
        const tabs = Array.from(mBody.querySelectorAll('.sw-slider__tab'));
        const arrows = Array.from(mBody.querySelectorAll('.sw-slider__arrow'));
        const imgEl = mBody.querySelector('#swSlideImg');
        const badgeEl = mBody.querySelector('#swSlideBadge');
        const statEl = mBody.querySelector('#swSlideStat');
        const titleEl = mBody.querySelector('#swSlideTitle');
        const descEl = mBody.querySelector('#swSlideDesc');
        const idxEl = mBody.querySelector('#swSlideIdx');
        const setSlide = (next) => {
          cur = (next + slides.length) % slides.length;
          const s = slides[cur];
          tabs.forEach((t, i) => t.classList.toggle('is-active', i === cur));
          if (idxEl) idxEl.textContent = `0${cur + 1}`;
          if (imgEl) {
            imgEl.style.opacity = '0.35';
            imgEl.src = s.img;
            imgEl.alt = s.title;
            requestAnimationFrame(() => { imgEl.style.opacity = '1'; });
          }
          if (badgeEl) badgeEl.textContent = s.badge;
          if (statEl) statEl.textContent = s.stat;
          if (titleEl) titleEl.textContent = s.title;
          if (descEl) descEl.textContent = s.desc;
          if (swCtaBtn && s.scope) swCtaBtn.dataset.scope = s.scope;
        };
        tabs.forEach((btn) => btn.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          setSlide(parseInt(btn.dataset.idx, 10) || 0);
        }));
        arrows.forEach((btn) => btn.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          setSlide(cur + (parseInt(btn.dataset.dir, 10) || 1));
        }));
        return;
      }

      // FORM 2: Interactive Visual Material Bento Gallery (Stop 02 · Craft & Materials)
      if (form === 'bento-gallery' && d.bento && d.bento.length) {
        const items = d.bento;
        mBody.innerHTML = `
          <div class="sw-bento">
            <div class="sw-bento__stage">
              <div class="sw-bento__hero">
                <img class="sw-bento__img" id="swBentoImg" src="${items[0].img}" alt="${items[0].title}" loading="eager" />
                <span class="sw-bento__pill" id="swBentoPill">${items[0].pill}</span>
                <span class="sw-bento__sub" id="swBentoSub">${items[0].subtitle}</span>
              </div>
              <div class="sw-bento__detail">
                <span class="sw-bento__code" id="swBentoCode">${items[0].code}</span>
                <h3 class="sw-bento__title" id="swBentoTitle">${items[0].title}</h3>
                <p class="sw-bento__desc" id="swBentoDesc">${items[0].desc}</p>
              </div>
            </div>
            <div class="sw-bento__grid">
              ${items.map((it, i) => `
                <button type="button" class="sw-bento__card ${i === 0 ? 'is-active' : ''}" data-idx="${i}">
                  <img src="${it.img}" alt="${it.title}" loading="lazy" />
                  <div class="sw-bento__card-meta">
                    <span>0${i + 1}</span>
                    <b>${it.title.split(' ').slice(0, 2).join(' ')}</b>
                  </div>
                </button>
              `).join('')}
            </div>
          </div>
        `;
        const cards = Array.from(mBody.querySelectorAll('.sw-bento__card'));
        const imgEl = mBody.querySelector('#swBentoImg');
        const pillEl = mBody.querySelector('#swBentoPill');
        const subEl = mBody.querySelector('#swBentoSub');
        const codeEl = mBody.querySelector('#swBentoCode');
        const titleEl = mBody.querySelector('#swBentoTitle');
        const descEl = mBody.querySelector('#swBentoDesc');
        cards.forEach((btn) => btn.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const idx = parseInt(btn.dataset.idx, 10) || 0;
          const it = items[idx];
          cards.forEach((c, i) => c.classList.toggle('is-active', i === idx));
          if (imgEl) {
            imgEl.style.opacity = '0.35';
            imgEl.src = it.img;
            imgEl.alt = it.title;
            requestAnimationFrame(() => { imgEl.style.opacity = '1'; });
          }
          if (pillEl) pillEl.textContent = it.pill;
          if (subEl) subEl.textContent = it.subtitle;
          if (codeEl) codeEl.textContent = it.code;
          if (titleEl) titleEl.textContent = it.title;
          if (descEl) descEl.textContent = it.desc;
        }));
        return;
      }

      // FORM 3: Magazine Editorial Banner + Horizontal Scrollable Story Strip (Stop 03 · Our Practice)
      if (form === 'editorial-story' && d.stories && d.stories.length) {
        mBody.innerHTML = `
          <div class="sw-editorial">
            <figure class="sw-editorial__banner">
              <img src="${d.heroImg || d.stories[0].img}" alt="${d.heroCaption || ''}" loading="eager" />
              <figcaption>${d.heroCaption || ''}</figcaption>
            </figure>
            <div class="sw-editorial__head">
              <span>18-Year Milestone Strip · Scroll or Click</span>
              <div class="sw-editorial__arrows">
                <button type="button" class="sw-editorial__arr" data-dir="-1" aria-label="Scroll stories left">←</button>
                <button type="button" class="sw-editorial__arr" data-dir="1" aria-label="Scroll stories right">→</button>
              </div>
            </div>
            <div class="sw-stories" id="swStoriesTrack" data-lenis-prevent>
              ${d.stories.map((st) => `
                <article class="sw-story">
                  <div class="sw-story__media">
                    <img src="${st.img}" alt="${st.title}" loading="lazy" />
                    <span class="sw-story__yr">${st.year}</span>
                  </div>
                  <div class="sw-story__body">
                    <span class="sw-story__place">${st.place}</span>
                    <h4 class="sw-story__title">${st.title}</h4>
                    <p class="sw-story__desc">${st.desc}</p>
                  </div>
                </article>
              `).join('')}
            </div>
          </div>
        `;
        const trackEl = mBody.querySelector('#swStoriesTrack');
        const arrBtns = Array.from(mBody.querySelectorAll('.sw-editorial__arr'));
        arrBtns.forEach((btn) => btn.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (!trackEl) return;
          const dir = parseInt(btn.dataset.dir, 10) || 1;
          trackEl.scrollBy({ left: dir * 250, behavior: 'smooth' });
        }));
        return;
      }

      // FORM 4: Interactive Partner & Atelier Portrait Deck (Stop 04 · The Team)
      if (form === 'team-carousel' && d.members && d.members.length) {
        const members = d.members;
        let cur = 0;
        mBody.innerHTML = `
          <div class="sw-team">
            <div class="sw-team__bar">
              <div class="sw-team__pills">
                ${members.map((m, i) => `
                  <button type="button" class="sw-team__pill ${i === 0 ? 'is-active' : ''}" data-idx="${i}">
                    ${m.name}
                  </button>
                `).join('')}
              </div>
              <div class="sw-team__arrows">
                <button type="button" class="sw-team__arr" data-dir="-1" aria-label="Previous partner">←</button>
                <button type="button" class="sw-team__arr" data-dir="1" aria-label="Next partner">→</button>
              </div>
            </div>
            <article class="sw-team__card">
              <div class="sw-team__media">
                <img id="swTeamImg" src="${members[0].img}" alt="${members[0].name}" loading="eager" />
                <span class="sw-team__cred" id="swTeamCred">${members[0].cred}</span>
              </div>
              <div class="sw-team__info">
                <span class="sw-team__role" id="swTeamRole">${members[0].role}</span>
                <h3 class="sw-team__name" id="swTeamName">${members[0].name}</h3>
                <blockquote class="sw-team__quote" id="swTeamQuote">“${members[0].quote}”</blockquote>
                <div class="sw-team__badge" id="swTeamGroup">${members[0].team}</div>
              </div>
            </article>
          </div>
        `;
        const pills = Array.from(mBody.querySelectorAll('.sw-team__pill'));
        const arrs = Array.from(mBody.querySelectorAll('.sw-team__arr'));
        const imgEl = mBody.querySelector('#swTeamImg');
        const credEl = mBody.querySelector('#swTeamCred');
        const roleEl = mBody.querySelector('#swTeamRole');
        const nameEl = mBody.querySelector('#swTeamName');
        const quoteEl = mBody.querySelector('#swTeamQuote');
        const groupEl = mBody.querySelector('#swTeamGroup');
        const setMember = (next) => {
          cur = (next + members.length) % members.length;
          const m = members[cur];
          pills.forEach((p, i) => p.classList.toggle('is-active', i === cur));
          if (imgEl) {
            imgEl.style.opacity = '0.35';
            imgEl.src = m.img;
            imgEl.alt = m.name;
            requestAnimationFrame(() => { imgEl.style.opacity = '1'; });
          }
          if (credEl) credEl.textContent = m.cred;
          if (roleEl) roleEl.textContent = m.role;
          if (nameEl) nameEl.textContent = m.name;
          if (quoteEl) quoteEl.textContent = `“${m.quote}”`;
          if (groupEl) groupEl.textContent = m.team;
        };
        pills.forEach((btn) => btn.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          setMember(parseInt(btn.dataset.idx, 10) || 0);
        }));
        arrs.forEach((btn) => btn.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          setMember(cur + (parseInt(btn.dataset.dir, 10) || 1));
        }));
        return;
      }

      // FORM 5: Interactive 2-Tab Pricing & 4-Step Delivery Section (Stop 05 · Garden Pool & Suite)
      if (form === 'pricing-switcher' && d.tiers && d.steps) {
        mBody.innerHTML = `
          <div class="sw-pricing">
            <div class="sw-pricing__tabs" role="tablist">
              <button type="button" class="sw-pricing__tab is-active" data-pane="tiers">01 · Commission Tiers</button>
              <button type="button" class="sw-pricing__tab" data-pane="steps">02 · 4-Step Delivery</button>
            </div>
            <div class="sw-pricing__pane is-active" data-pane-view="tiers">
              <div class="sw-pricing__banner">
                <img src="${d.tiersHeroImg}" alt="Lintel Turnkey Estate" loading="eager" />
                <span>${d.tiersHeroBadge}</span>
              </div>
              <div class="sw-tiers">
                ${d.tiers.map((r, idx) => `
                  <button type="button" class="sw-tier ${r.featured ? 'is-active' : ''}" data-scope="${r.scope || d.scope || ''}" data-tier="${r.tier}" data-idx="${idx}">
                    <div class="sw-tier__head">
                      <span class="sw-tier__tag">${r.tier}</span>
                      <span class="sw-tier__time">${r.timeline || ''}</span>
                      <b class="sw-tier__price">${r.price}</b>
                    </div>
                    <p class="sw-tier__name">${r.name}</p>
                    <p class="sw-tier__desc">${r.desc}</p>
                  </button>
                `).join('')}
              </div>
            </div>
            <div class="sw-pricing__pane" data-pane-view="steps" hidden>
              <div class="sw-pricing__banner">
                <img src="${d.stepsHeroImg}" alt="10-Year Structural Warranty" loading="lazy" />
                <span>${d.stepsHeroBadge}</span>
              </div>
              <div class="sw-tl">
                ${d.steps.map((s) => `
                  <div class="sw-tl__item">
                    <span class="sw-tl__yr">${s.phase}</span>
                    <div class="sw-tl__content">
                      <b class="sw-tl__title">${s.title}</b>
                      <p class="sw-tl__desc">${s.desc}</p>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        `;
        const tabBtns = Array.from(mBody.querySelectorAll('.sw-pricing__tab'));
        const panes = Array.from(mBody.querySelectorAll('.sw-pricing__pane'));
        tabBtns.forEach((btn) => btn.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const target = btn.dataset.pane;
          tabBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
          panes.forEach((p) => {
            const on = p.dataset.paneView === target;
            p.classList.toggle('is-active', on);
            p.hidden = !on;
          });
          requestAnimationFrame(updateSwScrollBar);
        }));
        const tierBtns = Array.from(mBody.querySelectorAll('.sw-tier'));
        tierBtns.forEach((btn) => {
          btn.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            tierBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
            const sc = btn.dataset.scope;
            if (swCtaBtn && sc) swCtaBtn.dataset.scope = sc;
            if (swCtaText) swCtaText.textContent = `Book · ${btn.dataset.tier.split('·')[0].trim()}`;
          });
        });
      }
    }

    function populateStudioWindow(d, idx) {
      if (!swEl || !d) return;
      swRenderedIdx = idx;
      swEl.dataset.no = d.no || '';
      swEl.dataset.key = d.key || '';
      swEl.dataset.form = d.form || 'showcase-slides';
      swEl.dataset.theme = d.theme || 'ivory';
      swEl.dataset.side = d.cardSide || 'right';
      const totalStr = dossiers.length < 10 ? '0' + dossiers.length : String(dossiers.length);
      if ($('swNo')) $('swNo').textContent = `${d.no} / ${totalStr}`;
      if ($('swCategory')) $('swCategory').textContent = d.category || d.kicker || 'LINTEL STUDIO';
      if ($('swKicker')) $('swKicker').textContent = `${d.kicker || 'Lintel Studio'} · ${d.roomShort || ''}`;
      if ($('swTitle')) {
        $('swTitle').innerHTML = d.title.map((t, ti) => ti === 1 ? `<em>${t}</em>` : `<span>${t}</span>`).join(' ');
      }
      if ($('swSummary')) $('swSummary').textContent = d.summary || '';
      const kpisEl = $('swKpis');
      if (kpisEl) {
        if (d.kpis && d.kpis.length) {
          kpisEl.hidden = false;
          kpisEl.innerHTML = d.kpis.map((k) => `
            <div class="sw__kpi">
              <b class="sw__kpi-val">${k.val}</b>
              <span class="sw__kpi-lbl">${k.lbl}</span>
            </div>
          `).join('');
        } else {
          kpisEl.hidden = true;
        }
      }
      renderStudioModule(d);
      if ($('swTargetLabel')) $('swTargetLabel').textContent = d.targetLabel || d.anchor;
      if ($('swRoomMeta')) $('swRoomMeta').textContent = d.fileMeta || '';
      if ($('swText')) $('swText').textContent = d.text || '';
      if ($('swFacts')) {
        $('swFacts').innerHTML = (d.facts || []).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
      }
      if ($('swDeliverables')) {
        $('swDeliverables').innerHTML = (d.deliverables || []).map((item, di) => `<li><em>0${di + 1}</em><span>${item}</span></li>`).join('');
      }
      if (swCtaBtn) swCtaBtn.dataset.scope = d.scope || 'Full Turnkey Residence';
      if (swCtaText) swCtaText.textContent = d.ctaText || 'Start a Project';
      if (swBody) {
        swBody.scrollTop = 0;
        requestAnimationFrame(updateSwScrollBar);
      }
      const animItems = swEl.querySelectorAll('.sw__anim');
      if (animItems.length && !reduced) {
        gsap.fromTo(animItems, { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.32, stagger: 0.03, ease: EASE, overwrite: true });
      }
    }

    dossiers.forEach((d, i) => {
      const spot = document.createElement('div');
      spot.className = 'spot';
      const ret = document.createElement('button');
      ret.className = 'reticle';
      ret.setAttribute('aria-label', `Target ${d.no} · ${d.title.join(' ')} (Click to toggle section card)`);
      ret.innerHTML =
        '<span class="reticle__ring"></span>' +
        '<span class="reticle__brackets"><i></i><i></i><i></i><i></i></span>' +
        '<b></b>' +
        `<em class="reticle__badge"><span class="reticle__dot"></span><span class="reticle__status">${d.roomShort ? d.roomShort.toUpperCase() : 'SCENE'} · ${d.no}</span></em>`;
      const leader = document.createElementNS(svgNS, 'svg');
      leader.setAttribute('class', 'spot__leader');
      leader.setAttribute('width', '1');
      leader.setAttribute('height', '1');
      leader.setAttribute('viewBox', '0 0 1 1');
      leader.setAttribute('aria-hidden', 'true');
      leader.innerHTML =
        '<path class="spot__leader-line" d="M 0 0 L 0 0" pathLength="1" />' +
        '<circle class="spot__leader-start" cx="0" cy="0" r="2.8" />' +
        '<circle class="spot__leader-end" cx="0" cy="0" r="3.4" />';
      spot.append(leader, ret);
      spotsEl.append(spot);

      d.anim = { seek: 0, lock: 0, line: 0, sheet: 0 };
      d.seekFrom = [d.cardSide === 'left' ? 48 : -48, i % 2 === 0 ? -32 : 30];
      d.el = {
        spot, ret, leader,
        brackets: ret.querySelector('.reticle__brackets'),
        status: ret.querySelector('.reticle__status'),
        leaderLine: leader.querySelector('.spot__leader-line'),
        leaderStart: leader.querySelector('.spot__leader-start'),
        leaderEnd: leader.querySelector('.spot__leader-end'),
      };
      ret.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        setSwCollapsed(!swCollapsed);
        gsap.fromTo(d.anim, { lock: 0.25 }, { lock: 1, duration: 0.45, ease: 'back.out(2.4)' });
      });
      gsap.set([spot, ret], { visibility: 'hidden' });
      d.shown = false;
    });

    function showTag(d, idx) {
      if (d.shown) return;
      d.shown = true; d.fading = false;
      populateStudioWindow(d, idx);
      const e = d.el, q = reduced ? 0.01 : 1;
      if (d.tl) d.tl.kill();
      gsap.killTweensOf(d.anim);
      d.anim.seek = 0; d.anim.lock = 0; d.anim.line = 0; d.anim.sheet = 0;
      e.ret.classList.remove('is-locked');
      if (e.status) e.status.textContent = `${(d.roomShort || 'SCENE').toUpperCase()} · ${d.no}`;
      gsap.set([e.spot, e.ret], { visibility: 'visible', opacity: 1 });
      if (swEl) {
        swEl.classList.add('is-open');
        swEl.setAttribute('aria-hidden', 'false');
      }
      d.tl = gsap.timeline()
        .to(d.anim, { seek: 1, duration: 0.42 * q, ease: 'power3.out' }, 0)
        .add(() => {
          e.ret.classList.add('is-locked');
          if (e.status) e.status.textContent = `${(d.roomShort || 'BUILT PROOF').toUpperCase()} · ${d.no}`;
        }, 0.26 * q)
        .to(d.anim, { lock: 1, duration: 0.34 * q, ease: 'back.out(2.1)' }, 0.24 * q)
        .to(d.anim, { sheet: 1, duration: 0.46 * q, ease: EASE }, 0.22 * q)
        .to(d.anim, { line: 1, duration: 0.36 * q, ease: 'power2.out' }, 0.28 * q);
    }

    function hideTag(d, immediate) {
      if (!d.shown && !d.fading) return;
      d.shown = false;
      const e = d.el;
      if (d.tl) d.tl.kill();
      gsap.killTweensOf(d.anim);
      e.ret.classList.remove('is-locked');
      if (immediate) {
        d.fading = false;
        d.anim.seek = 0; d.anim.lock = 0; d.anim.line = 0; d.anim.sheet = 0;
        gsap.set([e.spot, e.ret], { visibility: 'hidden', opacity: 0 });
        return;
      }
      d.fading = true;
      d.tl = gsap.timeline()
        .to(d.anim, { line: 0, duration: 0.22, ease: 'power2.in' }, 0)
        .to(d.anim, { sheet: 0, lock: 0, seek: 0, duration: 0.32, ease: EASE }, 0.04)
        .add(() => {
          d.fading = false;
          gsap.set([e.spot, e.ret], { visibility: 'hidden', opacity: 0 });
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
      if (swEl && activeIdx < 0) {
        swEl.classList.remove('is-open');
        swEl.setAttribute('aria-hidden', 'true');
      }
      const swRect = swEl && activeIdx >= 0 && !swCollapsed ? swEl.getBoundingClientRect() : null;
      dossiers.forEach((d, i) => {
        const e = d.el;
        if (i !== activeIdx && Math.abs(sD - d.s) > d.zone * 2.6 && (d.shown || d.fading)) {
          hideTag(d, true);
        }
        if (!d.shown && !d.fading && i !== activeIdx) {
          e.spot.style.visibility = 'hidden';
          e.ret.style.visibility = 'hidden';
          return;
        }
        project(anchorOf(d), P3);
        if (P3[2] >= 1) {
          e.spot.style.visibility = 'hidden';
          e.ret.style.visibility = 'hidden';
          return;
        }
        const sk = 1 - d.anim.seek;
        const isLeftCard = d.cardSide === 'left';
        const minRetX = swRect && swRect.width > 0 && isLeftCard ? Math.min(W - 140, swRect.right + 80) : 72;
        const maxRetX = swRect && swRect.width > 0 && !isLeftCard ? Math.max(160, swRect.left - 80) : W - 120;
        const clampedX = Math.max(minRetX, Math.min(P3[0], maxRetX));
        const clampedY = Math.max(92, Math.min(P3[1], H - 110));
        const rx = clampedX + d.seekFrom[0] * sk;
        const ry = clampedY + d.seekFrom[1] * sk;
        e.spot.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
        e.spot.style.visibility = 'visible';

        const retAlpha = Math.min(1, d.anim.seek * 1.5);
        const retScale = 1.62 - 0.62 * d.anim.seek;
        const retRot = -32 * sk;
        e.ret.style.opacity = retAlpha.toFixed(3);
        e.ret.style.visibility = retAlpha > 0.01 ? 'visible' : 'hidden';
        e.ret.style.transform = `scale(${retScale.toFixed(3)}) rotate(${retRot.toFixed(1)}deg)`;
        if (e.brackets) {
          const bScale = 1.32 - 0.32 * d.anim.lock;
          e.brackets.style.transform = `scale(${bScale.toFixed(3)})`;
        }

        if (swRect && swRect.width > 0 && !swCollapsed && i === activeIdx) {
          const pinX = isLeftCard ? swRect.right : swRect.left;
          const pinY = Math.max(swRect.top + 68, Math.min(swRect.bottom - 68, ry));
          const dx = pinX - rx, dy = pinY - ry;
          const dirX = dx >= 0 ? 1 : -1;
          const sx = dirX * 28, sy = dy >= 0 ? 6 : -6;
          const elbow = Math.min(Math.abs(dx) * 0.38, Math.max(18, Math.abs(dy - sy) * 0.72));
          const ex = sx + dirX * elbow;
          e.leaderLine.setAttribute('d', `M ${sx.toFixed(1)} ${sy.toFixed(1)} L ${ex.toFixed(1)} ${dy.toFixed(1)} L ${dx.toFixed(1)} ${dy.toFixed(1)}`);
          e.leaderStart.setAttribute('cx', sx.toFixed(1));
          e.leaderStart.setAttribute('cy', sy.toFixed(1));
          e.leaderEnd.setAttribute('cx', dx.toFixed(1));
          e.leaderEnd.setAttribute('cy', dy.toFixed(1));
          const lp = d.anim.line;
          e.leader.style.opacity = lp.toFixed(3);
          e.leaderLine.style.strokeDashoffset = (1 - lp).toFixed(3);
          if (swAnchor) swAnchor.style.top = `${(pinY - swRect.top).toFixed(1)}px`;
        } else {
          e.leader.style.opacity = '0';
        }
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
        b.addEventListener('click', () => goTo(k.h0 + (k.h1 - k.h0) * 0.42));
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
      const delivWrap = $('fileDeliverablesWrap'), delivEl = $('fileDeliverables');
      if (delivEl && delivWrap) {
        if (d.deliverables && d.deliverables.length) {
          delivWrap.hidden = false;
          delivEl.innerHTML = d.deliverables.map((item) => `<li>${item}</li>`).join('');
        } else {
          delivWrap.hidden = true;
          delivEl.innerHTML = '';
        }
      }
      $('fileFacts').innerHTML = (d.facts || []).map(([a, b]) => `<li><span>${a}</span><b>${b}</b></li>`).join('');
      const ctaEl = $('fileCta');
      if (ctaEl) {
        ctaEl.dataset.scope = d.scope || '';
        const txtEl = ctaEl.querySelector('.btn-text') || ctaEl;
        txtEl.textContent = (d.ctaText || `Inquire about ${d.title.join(' ').toLowerCase()}`).replace(/\s*›$/, '');
      }
      fileOpen = true;
      fileEl.setAttribute('aria-hidden', 'false');
      gsap.set(fileEl, { visibility: 'visible' });
      gsap.to(fileEl, { xPercent: 0, duration: reduced ? 0.01 : 1.1, ease: EASE });
      gsap.fromTo(fileEl.querySelectorAll('.file__no, .file__title, .file__time, .file__text, .file__deliverables li, .file__facts li, .file__cta'), { y: 18, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: reduced ? 0.01 : 1, ease: EASE, stagger: 0.04, delay: 0.22 });
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
    if ($('fileCta')) $('fileCta').addEventListener('click', (e) => {
      e.preventDefault();
      const sc = e.currentTarget.dataset.scope;
      closeFile();
      if (sc && window.__setScope) window.__setScope(sc);
      setTimeout(() => goTo('end'), 120);
    });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') closeFile(); });

    /* ---------- Lenis and ScrollTrigger share one clock -------------------- */
    gsap.registerPlugin(ScrollTrigger);
    let lenis = null;
    if (!reduced) {
      lenis = new Lenis({
        duration: C.scrollWeight,
        wheelMultiplier: 1.08,
        touchMultiplier: 1.0,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
      lenis.stop();
    }
    function goTo(units, customDur) {
      const y = units === 'end' ? document.documentElement.scrollHeight - innerHeight : (units * vh) / 100;
      const dur = customDur || 2.5;
      if (lenis) {
        lenis.start();
        lenis.scrollTo(y, { duration: dur, easing: (t) => 1 - Math.pow(1 - t, 3.6) });
      } else {
        scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
      }
    }
    function stopTargetUnits(idx) {
      const d = dossiers[idx];
      if (!d) return 0;
      const k = K[d.k];
      return k.h0 + (k.h1 - k.h0) * 0.50;
    }
    function currentStopPosition() {
      // Find which stop we are currently in or between
      for (let i = 0; i < dossiers.length; i++) {
        const k = K[dossiers[i].k];
        if (sD < k.h0 - 18) return { before: i, current: i - 1 };
        if (sD <= k.h1 + 24) return { before: i + 1, current: i };
      }
      return { before: dossiers.length, current: dossiers.length - 1 };
    }
    function stepRoom(dir) {
      if (fileOpen) closeFile();
      const pos = currentStopPosition();
      if (dir > 0) {
        const nextIdx = pos.current >= 0 && sD < K[dossiers[pos.current].k].h0 + 10 ? pos.current : pos.before;
        if (nextIdx < dossiers.length) {
          goTo(stopTargetUnits(nextIdx), 2.6);
        } else {
          goTo('end', 2.5);
        }
      } else {
        const prevIdx = pos.current >= 0 ? (sD > K[dossiers[pos.current].k].h1 + 10 ? pos.current : pos.current - 1) : -1;
        if (prevIdx >= 0) {
          goTo(stopTargetUnits(prevIdx), 2.3);
        } else {
          goTo(0, 2.2);
        }
      }
    }
    if (hintEl) {
      hintEl.addEventListener('click', (ev) => {
        ev.preventDefault();
        stepRoom(1);
      });
    }
    if (rnavNext) {
      rnavNext.addEventListener('click', (ev) => {
        ev.preventDefault();
        stepRoom(1);
      });
    }
    if (rnavPrev) {
      rnavPrev.addEventListener('click', (ev) => {
        ev.preventDefault();
        stepRoom(-1);
      });
    }
    if (swCtaBtn) {
      swCtaBtn.addEventListener('click', (ev) => {
        ev.preventDefault();
        const sc = swCtaBtn.dataset.scope;
        if (sc && window.__setScope) window.__setScope(sc);
        goTo('end', 3.0);
      });
    }
    document.querySelectorAll('[data-to]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      if (fileOpen) closeFile();
      const v = a.dataset.to;
      if (v === 'end') goTo('end');
      else if (v === '0') goTo(0);
      else if (KEY[v] != null) { const k = K[KEY[v]]; goTo(k.h0 + (k.h1 - k.h0) * 0.50); }
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
      project, goTo, stepRoom, sampleKeys, applyCamera, mapScroll,
    };

    /* ---------- loop ------------------------------------------------------- */
    const heroEl = $('hero'), markEl = document.querySelector('.mark'), cornerEl = document.querySelector('.corner'), rulerEl = $('ruler');
    const navLinks = Array.from(document.querySelectorAll('.topbar__nav [data-to]'));
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

    const draftToolsEl = $('draftTools'), draftRuler = $('draftRuler'), draftPen = $('draftPen'), draftEraser = $('draftEraser');
    let toolsRested = false;
    function getRestPos() {
      const mainEl = document.querySelector('.hero__main');
      const tbEl = document.querySelector('.titleblock');
      const mainRc = mainEl ? mainEl.getBoundingClientRect() : null;
      const tbRc = tbEl ? tbEl.getBoundingClientRect() : null;
      const rx = (mainRc && mainRc.width > 0 ? mainRc.left : 40) + 4;
      let ry = Math.round(H * 0.585);
      if (mainRc && mainRc.height > 0) {
        if (tbRc && tbRc.height > 0 && tbRc.top > mainRc.bottom + 70) {
          ry = Math.round(mainRc.bottom + (tbRc.top - mainRc.bottom - 72) * 0.58);
        } else {
          ry = Math.round(mainRc.bottom + 62);
        }
      }
      return { x: rx, y: ry };
    }
    function placeToolsAtRest() {
      if (!draftRuler || !draftPen || !draftEraser) return;
      const rp = getRestPos();
      gsap.set(draftRuler, { x: rp.x, y: rp.y, rotation: -10.5, scale: 1, autoAlpha: 1 });
      gsap.set(draftPen, { x: rp.x + 26, y: rp.y + 74, rotation: -16.5, scale: 1, autoAlpha: 1 });
      gsap.set(draftEraser, { x: rp.x + 286, y: rp.y + 22, rotation: 16, scale: 1, autoAlpha: 1 });
    }

    function updateHud(m) {
      const heroOut = smooth(clamp01((sD - K[0].h1 * 0.5) / (cfg.heroFade || 34)));
      if (heroEl && !cfg.ownHero) {
        heroEl.style.opacity = String(1 - heroOut);
        heroEl.style.transform = `translate3d(0, ${(-50 * heroOut).toFixed(1)}px, 0)`;
        heroEl.style.visibility = heroOut >= 1 ? 'hidden' : 'visible';
      }
      if (draftToolsEl && !cfg.ownHero) {
        draftToolsEl.style.opacity = String(1 - heroOut);
        draftToolsEl.style.transform = `translate3d(0, ${(-50 * heroOut).toFixed(1)}px, 0)`;
        draftToolsEl.style.visibility = heroOut >= 1 ? 'hidden' : 'visible';
      }
      const endIn = smooth(clamp01((sD - K[LAST].h0 - 34) / 22));
      if (markEl) markEl.style.opacity = '1';
      if (rulerEl) rulerEl.style.opacity = String(heroOut * (1 - endIn));
      if (countEl) countEl.style.opacity = String(heroOut * (1 - endIn));
      if (rulerNow) rulerNow.style.top = `${(Math.min(sD, TRACK) / TRACK) * 100}%`;
      if (navLinks.length) {
        let activeNav = -1;
        for (let i = 0; i < navLinks.length; i++) {
          const id = navLinks[i].dataset.to;
          if (KEY[id] != null && sD >= K[KEY[id]].h0 - 35 && sD < K[LAST].h0 + 36) activeNav = i;
        }
        navLinks.forEach((a, i) => a.classList.toggle('is-active', i === activeNav));
      }
      // Widen the active stop window so fast or casual scrolling never skips a room dossier
      let live = -1;
      dossiers.forEach((d, i) => {
        const k = K[d.k], spanH = k.h1 - k.h0;
        if (spanH > 0) {
          if (sD >= k.h0 - 8 && sD <= k.h1 + 24) live = i;
        }
      });
      if (live !== activeTag) {
        if (activeTag >= 0) hideTag(dossiers[activeTag]);
        if (live >= 0) showTag(dossiers[live], live);
        activeTag = live;
        dossiers.forEach((d, i) => d.mark && d.mark.classList.toggle('is-on', i === live));
      }
      placeLabels(live);
      const bk = cfg.beatKey ? K[KEY[cfg.beatKey]] : null;
      const inBeat = !!bk && sD > bk.h0 - 25 && sD < bk.h1 + 30;
      setBeat(inBeat && !fileOpen);

      // Update Guided Room Navigator Bar (#roomNav)
      if (rnavEl) {
        const showRnav = heroOut > 0.85 && endIn < 0.25 && !inBeat && !fileOpen;
        rnavEl.classList.toggle('is-visible', showRnav);
        rnavEl.setAttribute('aria-hidden', showRnav ? 'false' : 'true');
        if (showRnav) {
          const pos = currentStopPosition();
          const dispIdx = live >= 0 ? live : Math.max(0, Math.min(dossiers.length - 1, pos.current >= 0 ? pos.current : 0));
          const curD = dossiers[dispIdx];
          const totalStops = dossiers.length < 10 ? '0' + dossiers.length : String(dossiers.length);
          if (rnavStep && curD) rnavStep.innerHTML = `STOP <b>${curD.no}</b> / ${totalStops}`;
          if (rnavRoom && curD) {
            rnavRoom.textContent = live >= 0
              ? (curD.roomShort || curD.title.join(' ')).toUpperCase()
              : `TRANSITIONING → ${(dossiers[Math.min(dossiers.length - 1, pos.before)]?.roomShort || 'NEXT ROOM').toUpperCase()}`;
          }
          if (rnavFill) {
            const walkPct = clamp01((sD - K[dossiers[0].k].h0) / Math.max(1, K[dossiers[dossiers.length - 1].k].h1 - K[dossiers[0].k].h0));
            rnavFill.style.transform = `scaleX(${Math.max(0.06, walkPct).toFixed(3)})`;
          }
          if (rnavNextLabel) {
            const nextIdx = pos.current >= 0 && sD < K[dossiers[pos.current].k].h0 + 10 ? pos.current : pos.before;
            if (nextIdx < dossiers.length) {
              rnavNextLabel.textContent = `Next: ${dossiers[nextIdx].roomShort}`;
            } else {
              rnavNextLabel.textContent = 'Book Consultation';
            }
          }
        }
      }

      const hints = cfg.hints || {};
      let msg = hintMsg, show = 1;
      if (sD <= K[0].h1 * 0.5) msg = hints.hero || 'Scroll to enter the plan';
      else msg = hints.stop || 'Scroll to the next room';
      // Hide old bottom hint once inside the walk because #roomNav takes over at the bottom center
      if (heroOut > 0.75 || inBeat || m.key === LAST || sD > K[LAST].h0 - 12 || fileOpen) show = 0;
      setHint(msg);
      if (hintEl) hintEl.style.opacity = String(show);
      if (hintFill) hintFill.style.transform = `scaleX(${m.f.toFixed(3)})`;
      if (cfg.hud) cfg.hud(ctx, st);
    }

    /* ---------- loader, intro, finale ------------------------------------- */
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const loadBase = $('loadBase'), loadFill = $('loadFill'), loadTip = $('loadTip'), loadPct = $('loadPct'), loadStage = $('loadStage');
    const loadState = { p: 0 };
    function setProgress(p) {
      gsap.to(loadState, { p, duration: 0.28, ease: 'power1.out', overwrite: true, onUpdate: () => {
        const v = loadState.p;
        if (loadFill) loadFill.style.transform = `scaleX(${v})`;
        if (loadPct) loadPct.textContent = `${Math.round(v * 100)}%`;
        if (loadStage) {
          if (v < 0.25) loadStage.textContent = 'Setting out 1 : 200 section cut';
          else if (v < 0.58) loadStage.textContent = 'Constructing 16 rooms & quarry stone';
          else if (v < 0.88) loadStage.textContent = 'Staging bespoke furniture & lighting';
          else loadStage.textContent = 'Unrolling Sheet A-101 · Casa Serra';
        }
      } });
    }
    ctx.setProgress = setProgress;

    function runDraftingLoader(skipAnim) {
      if (!draftRuler || !draftPen || !draftEraser) return { drawDone: Promise.resolve(), moveDone: Promise.resolve() };
      if (skipAnim) {
        if (loadBase) gsap.set(loadBase, { scaleX: 1 });
        if (loadTip) gsap.set(loadTip, { autoAlpha: 0 });
        if (loadPct) gsap.set(loadPct, { autoAlpha: 1 });
        if (loadStage) gsap.set(loadStage, { autoAlpha: 1 });
        placeToolsAtRest();
        toolsRested = true;
        return { drawDone: Promise.resolve(), moveDone: Promise.resolve() };
      }
      const rc = loadBase ? loadBase.getBoundingClientRect() : { left: W / 2 - 140, right: W / 2 + 140, top: H / 2, width: 280 };
      const lineW = rc.width || (rc.right - rc.left) || 280;
      const rp = getRestPos();
      gsap.set(loadBase, { scaleX: 0 });
      if (loadTip) gsap.set(loadTip, { x: 0, autoAlpha: 1 });
      gsap.set([loadPct, loadStage].filter(Boolean), { autoAlpha: 0, y: 5 });
      // Center the 3D ruler horizontally right under the middle line, and poise the pencil tip at the left end
      gsap.set(draftRuler, { x: rc.left - 16, y: rc.top + 3, rotation: 0, scale: 0.84, autoAlpha: 1 });
      gsap.set(draftPen, { x: rc.left, y: rc.top, rotation: -48, scale: 0.92, autoAlpha: 1 });
      gsap.set(draftEraser, { x: rp.x + 310, y: rp.y + 42, rotation: 28, scale: 0.9, autoAlpha: 0 });

      let resolveDraw, resolveMove;
      const drawDone = new Promise((r) => { resolveDraw = r; });
      const moveDone = new Promise((r) => { resolveMove = r; });

      const tl = gsap.timeline();
      // Phase 1: Pencil moves smoothly from left to right along the ruler edge, drawing the straight line
      tl.to(draftPen, { x: rc.right, rotation: -42, duration: 1.15, ease: 'power2.inOut' }, 0.14)
        .to(loadBase, { scaleX: 1, duration: 1.15, ease: 'power2.inOut' }, 0.14);
      if (loadTip) {
        tl.to(loadTip, { x: lineW, duration: 1.15, ease: 'power2.inOut' }, 0.14)
          .to(loadTip, { autoAlpha: 0, duration: 0.22, ease: 'power1.out' }, 1.25);
      }
      tl.add(() => {
        resolveDraw();
      }, 1.32);

      // Phase 2: Smooth continuous transition of the ruler and pencil from the center to their angled 3D resting spot on the left
      tl.add(() => {
        const rpNow = getRestPos();
        gsap.timeline({
          onComplete: () => {
            toolsRested = true;
            resolveMove();
          },
        })
          .to(draftRuler, { x: rpNow.x, y: rpNow.y, rotation: -10.5, scale: 1, duration: 1.0, ease: 'power3.inOut' }, 0)
          .to(draftPen, { x: rpNow.x + 26, y: rpNow.y + 74, rotation: -16.5, scale: 1, duration: 1.05, ease: 'power3.inOut' }, 0.04)
          .to(draftEraser, { x: rpNow.x + 286, y: rpNow.y + 22, rotation: 16, scale: 1, autoAlpha: 1, duration: 0.92, ease: EASE }, 0.18)
          .to([loadPct, loadStage].filter(Boolean), { autoAlpha: 1, y: 0, duration: 0.5, ease: EASE, stagger: 0.07 }, 0.12);
      }, 1.34);

      return { drawDone, moveDone };
    }

    function reveal() {
      const loader = $('loader');
      P.fadeBlack = 0;
      const tl = gsap.timeline();
      if (loader) { window.__loaderEl = loader; tl.to(loader, { autoAlpha: 0, duration: 0.75, ease: EASE, onComplete: () => loader.remove() }, 0); }
      if (cfg.intro) cfg.intro(tl, ctx);
      const topBtn = document.querySelector('.topbar .btn-wrapper, .topbar .btn, .topbar .pill');
      if (topBtn) tl.fromTo(topBtn, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.1, ease: EASE }, 1.2);
      tl.add(() => { introDone = true; document.body.classList.remove('is-loading'); if (lenis) lenis.start(); }, 1.4);
    }
    function initFinale() {
      const fl = document.querySelectorAll('.finale [data-line]');
      if (fl.length) gsap.set(fl, { yPercent: 0 });
    }

    window.__rig = {
      K, KEY, mapScroll, sampleKeys, camera, P, ctx, openFile, closeFile,
      get sD() { return sD; }, get scale() { return scale; }, get world() { return world; },
      jump(u) {
        if (typeof u === 'string' && KEY[u] != null) {
          const k = K[KEY[u]];
          u = (k.h0 + k.h1) * 0.5;
        }
        introDone = true;
        document.body.classList.remove('is-loading');
        dossiers.forEach((d) => hideTag(d, true));
        activeTag = -1;
        const y = (u * vh) / 100;
        scrollTo(0, y);
        if (lenis) {
          lenis.start();
          lenis.scrollTo(y, { immediate: true, force: true });
        }
        sD = u;
      },
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
      resize();
      const at = new URLSearchParams(location.search).get('at');
      const skipLoaderAnim = at != null || reduced;
      const fonts = document.fonts ? Promise.race([document.fonts.ready, wait(2500)]) : Promise.resolve();
      await fonts;
      resize();
      await nextFrame();
      const { drawDone, moveDone } = runDraftingLoader(skipLoaderAnim);
      // Await both the left-to-right line draw AND the smooth glide to the left side BEFORE cfg.build blocks the main thread
      await drawDone;
      await moveDone;
      await nextFrame();
      const loader = new FX.Loader(renderer, (p) => setProgress(p * 0.94));
      ctx.loader = loader;
      world = await cfg.build(ctx);
      resize();
      if (toolsRested) placeToolsAtRest();
      prepLabels();
      applyCamera(sampleKeys(0, cam));
      const bootT = (window.__bootT = window.__bootT || {});
      bootT.world = Math.round(performance.now());
      // (for the buffer the scene is drawn into, the finisher's: on the canvas it built sRGB variants nothing ever used)
      if (!/[?&]warm=0/.test(location.search)) renderer.setRenderTarget(post.rtScene || null);
      renderer.compile(scene, camera);
      renderer.setRenderTarget(null);
      bootT.compile = Math.round(performance.now());
      // upload every texture now, so nothing stalls the first time the camera sees it
      if (renderer.initTexture) {
        const seen = new Set();
        const up = (t) => { if (t && t.isTexture && !seen.has(t)) { seen.add(t); renderer.initTexture(t); } };
        scene.traverse((o) => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
          ms.forEach((m) => { for (const k in m) up(m[k]); if (m.uniforms) for (const k in m.uniforms) up(m.uniforms[k].value); }); });
        (world.preload || []).forEach(up);
      }
      if (world.precompile) world.precompile();
      renderer.getContext().finish();
      bootT.precompile = Math.round(performance.now());
      bootT.programs = renderer.info.programs ? renderer.info.programs.length : 0;
      running = true;
      gsap.ticker.add(frame);
      setProgress(1);
      initFinale();
      addEventListener('resize', () => { resize(); if (toolsRested) placeToolsAtRest(); });
      if (at == null) { await wait(350); }
      reveal();
      if (at != null) setTimeout(() => window.__rig.jump(parseFloat(at)), 50);
    }
    boot().catch((err) => {
      console.error(err);
      const stg = $('loadStage');
      if (stg) { stg.style.opacity = '1'; stg.textContent = 'Reload to try again.'; }
    });
    return ctx;
  };
})(window.FX);
