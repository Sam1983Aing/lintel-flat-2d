// Everything an architect adds to a plan that is not the building: room names,
// dimension strings, door swings, floor joints, the centre line, the border and
// the title block. All of it lies flat on the floor and the ground of the 3D
// model, so it is still there when the camera comes down.

import * as THREE from 'three';
import { INK, PAPER, ROOMS, SIDE_ROOMS, TREES, DOORS, GROUND_Y, PROJECT } from './plan.js';

const MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
const SERIF = '"Instrument Serif", "Cormorant Garamond", Georgia, serif';
const CAP = 0.7; // cap height of the mono face, as a share of the font size
const PXM = 110; // canvas pixels per metre for labels

const fmt = (v) => v.toFixed(2);

export function buildSheet({ frame, portrait, labelScale = 1, anisotropy = 8, planesFor }) {
  const group = new THREE.Group();
  const lines = {}; // key -> flat array of segment positions
  const seg = (key, x0, n0, x1, n1, y) => (lines[key] ??= []).push(x0, y, -n0, x1, y, -n1);
  const FLOOR = 0.004, OUT = GROUND_Y + 0.004;
  const disposables = [];

  // ---- text ------------------------------------------------------------
  function textBlock(rows, { room = 'rest', x, n, y = FLOOR, rot = 0, align = 'center' }) {
    const c = document.createElement('canvas');
    const g = c.getContext('2d');
    const specs = rows.map((r) => {
      const cap = r.cap * labelScale;
      const px = (cap / CAP) * PXM;
      return { ...r, px, font: `${r.weight ?? 400} ${px}px ${r.font ?? MONO}`, track: (r.track ?? 0.08) * px, lead: cap * PXM * (r.lead ?? 1.65) };
    });
    let w = 0, h = 0;
    for (const s of specs) {
      g.font = s.font;
      if ('letterSpacing' in g) g.letterSpacing = s.track + 'px';
      s.w = g.measureText(s.t).width;
      w = Math.max(w, s.w);
      h += s.lead;
    }
    const pad = 8;
    c.width = Math.ceil(w + pad * 2);
    c.height = Math.ceil(h + pad * 2);
    let yy = pad;
    g.fillStyle = INK;
    g.textBaseline = 'alphabetic';
    for (const s of specs) {
      g.font = s.font;
      if ('letterSpacing' in g) g.letterSpacing = s.track + 'px';
      g.globalAlpha = s.alpha ?? 1;
      const tx = align === 'center' ? (c.width - s.w) / 2 : pad;
      g.fillText(s.t, tx, yy + s.lead * 0.5 + s.px * CAP * 0.5);
      yy += s.lead;
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = anisotropy;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, fog: true, clippingPlanes: planesFor(room) });
    const geo = new THREE.PlaneGeometry(c.width / PXM, c.height / PXM);
    const m = new THREE.Mesh(geo, mat);
    m.rotation.set(-Math.PI / 2, 0, rot);
    m.position.set(x, y, -n);
    m.renderOrder = 2;
    group.add(m);
    disposables.push(tex, mat, geo);
    return m;
  }

  // ---- room names --------------------------------------------------------
  const walkLabel = { hall: [0, 2.9], living: [1.0, 16.98], kitchen: [1.4, 26.7], court: [-2.5, 30.7] };
  for (const r of ROOMS) {
    const [x, n] = walkLabel[r.key];
    textBlock(
      [
        { t: r.name, cap: 0.4, weight: 500, track: 0.12 },
        { t: `${fmt(r.clear[0])} × ${fmt(r.clear[1])}`, cap: 0.29 },
        { t: `${(r.clear[0] * r.clear[1]).toFixed(1)} m²`, cap: 0.29, alpha: 0.75 },
      ],
      { room: r.key, x, n }
    );
  }
  for (const r of SIDE_ROOMS) {
    const rows = [{ t: r.name, cap: r.small ? 0.25 : 0.31, weight: 500, track: 0.1 }];
    if (!r.small && !r.vertical) rows.push({ t: `${fmt(r.clear[0])} × ${fmt(r.clear[1])}`, cap: 0.24, alpha: 0.85 });
    textBlock(rows, { x: r.x, n: r.n, rot: r.vertical ? Math.PI / 2 : 0 });
  }

  // ---- dimension strings ---------------------------------------------------
  // along: 'n' draws a north-south string at x = at, 'x' an east-west one at n = at
  function dimString(along, at, ticks, { from, minLabel = 1.2, side = -1 } = {}) {
    const T = 0.26;
    const a0 = ticks[0], a1 = ticks[ticks.length - 1];
    if (along === 'n') {
      seg('anno|rest', at, a0 - 0.5, at, a1 + 0.5, OUT);
      for (const t of ticks) {
        seg('anno|rest', at - T, t - T, at + T, t + T, OUT);
        if (from !== undefined) seg('thin|rest', from, t, at + side * 0.3, t, OUT);
      }
      for (let i = 0; i < ticks.length - 1; i++) {
        const d = ticks[i + 1] - ticks[i];
        if (d < minLabel) continue;
        textBlock([{ t: fmt(d), cap: 0.3, lead: 1.5 }], { x: at + side * 0.5, n: (ticks[i] + ticks[i + 1]) / 2, y: OUT, rot: Math.PI / 2 });
      }
    } else {
      seg('anno|rest', a0 - 0.5, at, a1 + 0.5, at, OUT);
      for (const t of ticks) {
        seg('anno|rest', t - T, at - T, t + T, at + T, OUT);
        if (from !== undefined) seg('thin|rest', t, from, t, at - side * 0.3, OUT);
      }
      for (let i = 0; i < ticks.length - 1; i++) {
        const d = ticks[i + 1] - ticks[i];
        if (d < minLabel) continue;
        textBlock([{ t: fmt(d), cap: 0.3, lead: 1.5 }], { x: (ticks[i] + ticks[i + 1]) / 2, n: at - side * 0.5, y: OUT });
      }
    }
  }
  // west: the four rooms of the walk, then the whole house
  dimString('n', -8.4, [0, 7.0, 7.2, 18.2, 18.4, 28.4, 28.6, 40.6], { from: -6.9 });
  dimString('n', -10.0, [-0.4, 41.0], { from: -8.9 });
  // east: the bedroom wing
  dimString('n', 14.2, [0, 6.3, 6.5, 12.8, 13.0, 17.0, 17.2, 24.2, 24.4, 28.4], { from: 12.9, side: 1 });
  // north: the width of the bar
  dimString('x', 42.8, [-6.0, 6.0], { from: 41.5, side: -1 });
  // south: across the front
  dimString('x', -5.0, [-6.0, -2.2, -2.0, 2.0, 2.2, 6.0, 6.2, 12.0], { from: -3.5, side: 1 });
  dimString('x', -6.6, [-6.4, 12.4], { from: -5.5, side: 1 });

  // ---- door swings -----------------------------------------------------------
  const arc = (key, cx, cn, r, a0, a1, y) => {
    const N = 18;
    for (let i = 0; i < N; i++) {
      const t0 = ((a0 + ((a1 - a0) * i) / N) * Math.PI) / 180, t1 = ((a0 + ((a1 - a0) * (i + 1)) / N) * Math.PI) / 180;
      seg(key, cx + Math.cos(t0) * r, cn + Math.sin(t0) * r, cx + Math.cos(t1) * r, cn + Math.sin(t1) * r, y);
    }
  };
  for (const d of DOORS) arc('thin|rest', d.x, d.n, 0.9, d.open, d.closed, FLOOR);
  // the front door turns on a pivot set in from its edge
  arc('thin|hall', -0.4, -0.2, 1.14, 0, 90, FLOOR);
  arc('thin|rest', -0.4, -0.2, 0.35, 180, 270, FLOOR);

  // ---- floor joints: a 1.2 m grid in the rooms of the walk ----------------------
  const grid = (key, x0, n0, x1, n1, ox, on, y) => {
    for (let x = ox; x < x1 - 0.01; x += 1.2) if (x > x0 + 0.01) seg(key, x, n0, x, n1, y);
    for (let n = on; n < n1 - 0.01; n += 1.2) if (n > n0 + 0.01) seg(key, x0, n, x1, n, y);
  };
  grid('hatch|hall', -2.0, 0, 2.0, 7.0, -2.0 + 0.8, 0, FLOOR);
  grid('hatch|living', -6.0, 7.2, 6.0, 18.2, -6.0, 7.2 + 0.4, FLOOR);
  grid('hatch|kitchen', -6.0, 18.4, 6.0, 28.4, -6.0, 18.4 + 0.4, FLOOR);
  grid('hatch|court', -6.0, 28.6, 1.6, 40.6, -6.0, 28.6, FLOOR);
  grid('hatch|court', 3.6, 28.6, 6.0, 40.6, -6.0, 28.6, FLOOR);
  grid('hatch|court', 1.6, 28.6, 3.6, 30.6, -6.0, 28.6, FLOOR);
  grid('hatch|court', 1.6, 38.6, 3.6, 40.6, -6.0, 28.6, FLOOR);
  grid('hatch|rest', -3.4, -3.0, 3.4, -0.4, -3.4 + 0.5, -3.0 + 0.2, FLOOR);
  // stepping slabs across the forecourt
  for (let n = -4.3; n > -12.5; n -= 1.5) {
    seg('hatch|rest', -1.3, n, 1.3, n, OUT); seg('hatch|rest', -1.3, n - 1.1, 1.3, n - 1.1, OUT);
    seg('hatch|rest', -1.3, n, -1.3, n - 1.1, OUT); seg('hatch|rest', 1.3, n, 1.3, n - 1.1, OUT);
  }
  // water in the pool: a few ripples drawn the way a plan hints at water
  for (let n = 31.0; n < 38.5; n += 0.5) {
    const k = Math.round((n - 31) / 0.5);
    seg('hatch|court', 1.75 + (k % 3) * 0.25, n, 2.5 + (k % 3) * 0.25, n, -0.046);
    if (k % 2) seg('hatch|court', 2.9, n + 0.12, 3.45, n + 0.12, -0.046);
  }

  // ---- the line the whole house hangs on ----------------------------------------
  seg('dash|rest', 0, -13, 0, -0.4, OUT);
  seg('dash|hall', 0, -0.4, 0, 7.1, FLOOR);
  seg('dash|living', 0, 7.1, 0, 18.3, FLOOR);
  seg('dash|kitchen', 0, 18.3, 0, 28.5, FLOOR);
  seg('dash|court', 0, 28.5, 0, 40.6, FLOOR);
  seg('dash|rest', 0, 41.0, 0, 43.6, OUT);

  // tree crowns are above the cut, so a plan shows them dashed
  for (const t of TREES) arc(t.room === 'court' ? 'dash|court' : 'dash|rest', t.x, t.n, t.r, 0, 360, t.room === 'court' ? FLOOR : OUT);

  // ---- border and title block ------------------------------------------------------
  const inset = 1.3;
  // on a phone the sheet is wider than the screen, so only its top and bottom edges show
  const side = portrait ? -8 : inset;
  const bx0 = frame.cx - frame.w / 2 + side, bx1 = frame.cx + frame.w / 2 - side;
  const bn0 = frame.cn - frame.h / 2 + inset, bn1 = frame.cn + frame.h / 2 - inset;
  for (const k of [0, 0.22]) {
    seg('anno|rest', bx0 + k, bn0 + k, bx1 - k, bn0 + k, OUT); seg('anno|rest', bx1 - k, bn0 + k, bx1 - k, bn1 - k, OUT);
    seg('anno|rest', bx1 - k, bn1 - k, bx0 + k, bn1 - k, OUT); seg('anno|rest', bx0 + k, bn1 - k, bx0 + k, bn0 + k, OUT);
  }

  const TW = portrait ? frame.w - 2.4 : 19.5, TH = portrait ? 7.6 : 9.2;
  const tb = titleBlock(TW, TH, portrait ? 1.2 : 1);
  tb.texture.anisotropy = anisotropy;
  const tbm = new THREE.Mesh(new THREE.PlaneGeometry(TW, TH), new THREE.MeshBasicMaterial({ map: tb.texture, transparent: true, depthWrite: false, toneMapped: false, fog: true }));
  tbm.rotation.x = -Math.PI / 2;
  tbm.position.set(portrait ? frame.cx : bx1 - 0.22 - TW / 2, OUT, -(bn0 + 0.22 + TH / 2));
  tbm.renderOrder = 2;
  group.add(tbm);
  disposables.push(tb.texture, tbm.material, tbm.geometry);

  return { group, lines, dispose: () => disposables.forEach((d) => d.dispose()) };
}

function titleBlock(TW, TH, k = 1) {
  const P = 72; // canvas pixels per metre
  const c = document.createElement('canvas');
  c.width = Math.round(TW * P);
  c.height = Math.round(TH * P);
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  // opaque, so the block covers whatever part of the drawing runs under it
  g.fillStyle = PAPER;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = INK;
  g.fillStyle = INK;
  g.lineWidth = 4;
  g.strokeRect(2, 2, W - 4, H - 4);
  const yA = Math.round(H * 0.47), yB = Math.round(H * 0.735);
  const line = (x0, y0, x1, y1) => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  g.lineWidth = 2;
  line(0, yA, W, yA);
  line(0, yB, W, yB);
  const xSheet = Math.round(W * 0.66);
  line(xSheet, yA, xSheet, yB);
  const cells = [0.2, 0.47, 0.66, 0.83].map((f) => Math.round(f * W));
  for (const x of cells) line(x, yB, x, H);

  const m = P * 0.34;
  const label = (t, x, y) => {
    g.font = `500 ${P * 0.33 * k}px ${MONO}`;
    if ('letterSpacing' in g) g.letterSpacing = P * 0.05 + 'px';
    g.globalAlpha = 0.6;
    g.fillText(t, x + m, y + m + P * 0.26 * k);
    g.globalAlpha = 1;
  };
  const value = (t, x, yBottom, size = 0.56) => {
    g.font = `400 ${P * size * k}px ${MONO}`;
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    g.fillText(t, x + m, yBottom - m);
  };

  // project
  label('PROJECT', 0, 0);
  g.font = `400 ${Math.min(yA * 0.62, W * 0.16)}px ${SERIF}`;
  if ('letterSpacing' in g) g.letterSpacing = '0px';
  g.fillText(PROJECT.name, m - P * 0.05, yA - m * 1.15);
  g.textAlign = 'right';
  value(PROJECT.place, W - 2 * m, yA, 0.5);
  g.textAlign = 'left';

  // drawing, sheet
  label('DRAWING', 0, yA);
  value(PROJECT.drawing, 0, yB, 0.62);
  label('SHEET', xSheet, yA);
  value(PROJECT.sheet, xSheet, yB, 0.8);

  // north arrow
  const ch = H - yB;
  const ax = cells[0] * 0.5, ay = yB + ch * 0.54, r = Math.min(ch * 0.3, cells[0] * 0.3);
  g.lineWidth = 2.5;
  g.beginPath(); g.arc(ax, ay, r, 0, Math.PI * 2); g.stroke();
  line(ax, ay + r * 1.2, ax, ay - r * 1.2);
  g.beginPath(); g.moveTo(ax, ay - r * 1.2); g.lineTo(ax - r * 0.42, ay); g.lineTo(ax, ay); g.closePath(); g.fill();
  g.font = `500 ${P * 0.46 * k}px ${MONO}`;
  g.fillText('N', ax + r * 0.5, ay - r * 0.72);

  // scale bar, true to the drawing
  const u = P;
  const barM = Math.max(2, Math.min(4, Math.floor((cells[1] - cells[0] - 2.4 * m) / u)));
  const sx = cells[0] + m + P * 0.1, sy = H - m - P * 0.2;
  label('METRES', cells[0], yB);
  g.lineWidth = 2;
  g.strokeRect(sx, sy, barM * u, P * 0.2);
  for (let i = 0; i < barM; i += 2) g.fillRect(sx, sy, 0, 0), g.fillRect(sx + i * u, sy, u, P * 0.2);
  g.font = `400 ${P * 0.36 * k}px ${MONO}`;
  g.fillText('0', sx - P * 0.1, sy - P * 0.14);
  g.fillText(String(barM), sx + barM * u - P * 0.12, sy - P * 0.14);

  label('CUT AT', cells[1], yB);
  value('+1.20 m', cells[1], H);
  label('SCALE', cells[2], yB);
  value(PROJECT.scale, cells[2], H);
  label('DATE', cells[3], yB);
  value(PROJECT.date, cells[3], H, 0.46);

  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture };
}
