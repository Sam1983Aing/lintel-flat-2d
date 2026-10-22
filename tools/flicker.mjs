#!/usr/bin/env node
// Is the picture clean while it moves? Steps the scroll in small, equal steps (so every run sees
// exactly the same camera positions), grabs a retina crop of each frame and scores the flicker.
//
//   node tools/flicker.mjs <url> "<at>:<step>:<frames>[,<at>:<step>:<frames>...]" [WxH] [dpr] [keep-dir]
//
//   at      scroll position in vh where the stretch starts
//   step    vh per frame (0.3 is a slow scroll, 0 holds still)
//   frames  how many frames to take (40 is plenty)
//
// For each stretch it prints three numbers (0 to 255 scale, mean over the crop):
//   move     how much one frame differs from the next. Motion and flicker both raise it.
//   flicker  how much a frame differs from the average of its two neighbours. Smooth motion of
//            clean lines keeps this low. Grain, crawling edges and twinkling dots raise it.
//   ratio    flicker / move. Under about 0.35 reads as smooth, over 0.6 reads as noise.
// With step 0 the picture should not change at all: move must be 0 on a drawing.
// Also prints the size the 3D is rendered at and the frame time at the start of each stretch.
// CAMSEG (see the end of the file): stretches with a camera of their own, for places the scroll does not reach built.
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const [URL, SEGS, SIZE, DPRS, KEEP] = process.argv.slice(2);
if (!URL || !SEGS) { console.log('usage: node tools/flicker.mjs <url> "<at>:<step>:<frames>,..." [WxH] [dpr] [keep-dir]'); process.exit(1); }
const [VW, VH] = (SIZE || '1440x900').split('x').map(Number), DPR = Number(DPRS || 2);
const segs = SEGS.split(',').map((s) => s.split(':').map(Number));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = process.env.CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'].find(existsSync);
const PORT = 9300 + Math.floor(Math.random() * 600);
const PROFILE = mkdtempSync(join(tmpdir(), 'flicker-'));
const OUT = KEEP ? resolve(KEEP) : mkdtempSync(join(tmpdir(), 'flicker-frames-'));
mkdirSync(OUT, { recursive: true });
const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--no-first-run', '--hide-scrollbars', '--mute-audio',
  `--window-size=${VW},${VH}`, '--headless=new', '--use-angle=metal', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank'], { stdio: 'ignore' });
const quit = async (code) => { try { chrome.kill(); } catch {} await sleep(400); try { rmSync(PROFILE, { recursive: true, force: true }); if (!KEEP) rmSync(OUT, { recursive: true, force: true }); } catch {} process.exit(code); };

let targets;
for (let i = 0; i < 100; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if (targets.find((t) => t.type === 'page')) break; } catch {} await sleep(150); }
const tab = targets && targets.find((t) => t.type === 'page');
if (!tab) { console.error('Chrome did not open a page.'); await quit(1); }
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const waiting = new Map();
const send = (method, params = {}) => new Promise((res) => { const my = ++id; waiting.set(my, res); ws.send(JSON.stringify({ id: my, method, params })); });
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } });
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: DPR, mobile: false });
await send('Emulation.setFocusEmulationEnabled', { enabled: true });
await send('Page.navigate', { url: URL });
let ok = false;
for (let i = 0; i < 900 && !ok; i++) { ok = await evaluate(`!!(window.__rig && window.__rig.world && !document.getElementById('loader'))`); if (!ok) await sleep(100); }
if (!ok) { console.log('the page never reported ready'); await quit(1); }
// hide the HUD: we are scoring the picture, not the labels
await evaluate(`(() => { const s = document.createElement('style'); s.textContent = 'body > *:not(canvas) { visibility: hidden !important; }'; document.head.appendChild(s); })()`);

// the middle of the picture, away from the edges
// CROP=x,y,w,h (fractions of the viewport, for example CROP=0.55,0,0.45,0.6 for the top right) moves the crop
const cr = (process.env.CROP || '0.2,0.18,0.6,0.64').split(',').map(Number);
const clip = { x: Math.round(VW * cr[0]), y: Math.round(VH * cr[1]), width: Math.round(VW * cr[2]), height: Math.round(VH * cr[3]), scale: 1 };
const stat = (dir, n, weights) => {
  const vf = weights
    ? `format=gray,tmix=frames=3:weights='${weights}':scale=1,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-`
    : `format=gray,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-`;
  const r = spawnSync('ffmpeg', ['-v', 'error', '-framerate', '30', '-i', join(dir, 'f%03d.png'), '-vf', vf, '-f', 'null', '-'], { encoding: 'utf8' });
  const v = [...r.stdout.matchAll(/YAVG=([0-9.]+)/g)].map((m) => +m[1]).slice(2);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
};
console.log(`${VW}x${VH} at ${DPR}x, crop ${clip.width}x${clip.height}`);
console.log('at      step  move    flicker  ratio   render     ms/frame');
let k = 0;
for (const [at, step, n] of segs) {
  const dir = join(OUT, `seg${k++}-${at}`);
  mkdirSync(dir, { recursive: true });
  await evaluate(`window.__rig.jump(${at})`);
  await sleep(2600);
  const ms = await evaluate(`new Promise((res) => { let n = 0, t0 = performance.now(); const f = () => { if (++n >= 40) res((performance.now() - t0) / 40); else requestAnimationFrame(f); }; requestAnimationFrame(f); })`);
  for (let i = 0; i < n; i++) {
    await evaluate(`window.__rig.jump(${at + i * step}); new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))))`);
    // the clip is in page coordinates, so it has to follow the scroll
    const sy = await evaluate('window.scrollY');
    const r = await send('Page.captureScreenshot', { format: 'png', clip: Object.assign({}, clip, { y: clip.y + sy }), captureBeyondViewport: false });
    writeFileSync(join(dir, `f${String(i).padStart(3, '0')}.png`), Buffer.from(r.result.data, 'base64'));
  }
  const scale = await evaluate(`(() => { const p = window.__rig.ctx.post; return p && p.w ? p.w + 'x' + p.h : String(window.__rig.scale); })()`);
  const move = stat(dir, n, null), fl = stat(dir, n, '-1 2 -1') + stat(dir, n, '1 -2 1');
  console.log(`${String(at).padEnd(7)} ${String(step).padEnd(5)} ${move.toFixed(3).padEnd(7)} ${fl.toFixed(3).padEnd(8)} ${(move > 1e-6 ? fl / move : 0).toFixed(2).padEnd(7)} ${String(scale).padEnd(10)} ${ms.toFixed(1)}`);
}
// CAMSEG="name|x,y,h|lx,ly,lh|fov|dx,dy,dh; ..." (plan metres, Lintel's __cam aid): after the scroll stretches, stretches
// with a camera of their own, the eye and the look moved by dx,dy,dh each frame (CAMN frames, default 40), the scroll held
// where the last stretch left it. For a place the walk only shows built once it has passed it: the forecourt from far up
// (load the page with ?at= past it). Printed with the stretch's name, "cam" as its step.
if (process.env.CAMSEG) for (const sg of process.env.CAMSEG.split(';')) {
  const [name, e, l, fv, dd] = sg.trim().split('|'), E = e.split(',').map(Number), L = l.split(',').map(Number), D = dd.split(',').map(Number);
  const n = Number(process.env.CAMN || 40), dir = join(OUT, `seg${k++}-${name}`);
  mkdirSync(dir, { recursive: true });
  const put = (i) => `window.__cam = ${JSON.stringify({ p: E.map((v, j) => +(v + D[j] * i).toFixed(5)), look: L.map((v, j) => +(v + D[j] * i).toFixed(5)), fov: Number(fv) })};`;
  await evaluate(put(0) + ' 1');
  await sleep(2600);
  for (let i = 0; i < n; i++) {
    await evaluate(`${put(i)} new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))))`);
    const sy = await evaluate('window.scrollY');
    const r = await send('Page.captureScreenshot', { format: 'png', clip: Object.assign({}, clip, { y: clip.y + sy }), captureBeyondViewport: false });
    writeFileSync(join(dir, `f${String(i).padStart(3, '0')}.png`), Buffer.from(r.result.data, 'base64'));
  }
  const scale = await evaluate(`(() => { const p = window.__rig.ctx.post; return p && p.w ? p.w + 'x' + p.h : String(window.__rig.scale); })()`);
  const move = stat(dir, n, null), fl = stat(dir, n, '-1 2 -1') + stat(dir, n, '1 -2 1');
  console.log(`${name.padEnd(7)} cam   ${move.toFixed(3).padEnd(7)} ${fl.toFixed(3).padEnd(8)} ${(move > 1e-6 ? fl / move : 0).toFixed(2).padEnd(7)} ${String(scale).padEnd(10)} -`);
}
if (KEEP) console.log('frames kept in ' + OUT);
await quit(0);
