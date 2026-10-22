#!/usr/bin/env node
// Headless probe for the scroll-film pages: load a page, jump to scroll
// positions, evaluate JS, save stills. Prints the results as JSON between
// "=== RESULTS ===" and "=== END ===", then any page errors or warnings.
// Chrome over the DevTools protocol, no npm dependencies (Node 22+).
//
//   node tools/probe.mjs <url> <steps.json> [WxH]
//
// steps.json: [{ "jump": 120, "wait": 2500, "eval": "expr", "shot": "/abs/or/relative/out.jpg" }, ...]
//   jump   scroll position in vh (uses window.__rig.jump, so the camera lands at once)
//   wait   milliseconds to let the frame settle (2500 to 3500 is enough)
//   eval   an expression, awaited, its value lands in the results (JSON.stringify objects yourself)
//   shot   a JPEG of the viewport, relative paths resolve from where you run the command
//
// Useful evals on these pages:
//   JSON.stringify(__rig.K.map(k => [k.id, +k.h0.toFixed(1), +k.h1.toFixed(1)]))   key positions in vh
//   JSON.stringify(__checkPath().filter(h => h.id !== 'roof'))                       camera collisions
//
// NOWAIT=1 skips waiting for window.__rig (use it for a plain HTML file, for
// example a before and after sheet: NOWAIT=1 node tools/probe.mjs file:///abs/sheet.html steps.json 1440x2860).
// Default size 1440x900. For a phone use 390x844 (pages switch to their phone layout by aspect ratio).
// DPR=2 takes the stills at retina resolution (what Sam sees on his screen), twice the pixels each way.
// CHROME_FLAGS="--disable-gpu-vsync --disable-frame-rate-limit" lets frames run as fast as they can (for frame times).
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';

const [URL, STEPS, SIZE] = process.argv.slice(2);
if (!URL || !STEPS) { console.log('usage: node tools/probe.mjs <url> <steps.json> [WxH]'); process.exit(1); }
const steps = JSON.parse(readFileSync(STEPS, 'utf8'));
const [VW, VH] = (SIZE || '1440x900').split('x').map(Number);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = process.env.CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'].find(existsSync);
if (!CHROME) { console.error('Chrome not found. Set CHROME=/path/to/chrome.'); process.exit(1); }
const PORT = 9300 + Math.floor(Math.random() * 600);
const PROFILE = mkdtempSync(join(tmpdir(), 'probe-'));
const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--no-first-run', '--hide-scrollbars', '--mute-audio',
  `--window-size=${VW},${VH}`, '--headless=new', '--use-angle=metal', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  ...(process.env.CHROME_FLAGS ? process.env.CHROME_FLAGS.split(' ') : []), 'about:blank'], { stdio: 'ignore' });
const quit = async (code) => { try { chrome.kill(); } catch {} await sleep(500); try { rmSync(PROFILE, { recursive: true, force: true }); } catch {} process.exit(code); };

let targets;
for (let i = 0; i < 100; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if (targets.find((t) => t.type === 'page')) break; } catch {} await sleep(150); }
const tab = targets && targets.find((t) => t.type === 'page');
if (!tab) { console.error('Chrome did not open a debuggable page.'); await quit(1); }
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const waiting = new Map(), problems = [];
const send = (method, params = {}) => new Promise((res) => { const my = ++id; waiting.set(my, res); ws.send(JSON.stringify({ id: my, method, params })); });
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); return; }
  const text = (a) => a.map((x) => x.value ?? x.description ?? '').join(' ').slice(0, 3000);
  if (m.method === 'Runtime.exceptionThrown') problems.push(m.params.exceptionDetails.exception?.description?.split('\n')[0] || m.params.exceptionDetails.text);
  else if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) problems.push(m.params.type + ': ' + text(m.params.args));
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'log') console.log('log:', text(m.params.args).slice(0, 300));
});
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) return 'EXC: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
  return r.result?.result?.value;
};

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: Number(process.env.DPR || 1), mobile: false });
await send('Emulation.setFocusEmulationEnabled', { enabled: true });
await send('Page.navigate', { url: URL });
let ok = !!process.env.NOWAIT;
for (let i = 0; i < 900 && !ok; i++) { ok = await evaluate(`!!(window.__rig && window.__rig.world && !document.getElementById('loader'))`); if (!ok) await sleep(100); }
if (!ok) console.log('the page never reported ready (window.__rig.world) after 90 s');

const out = [];
for (const s of steps) {
  if (s.jump != null) await evaluate(`window.__rig.jump(${s.jump})`);
  if (s.wait) await sleep(s.wait);
  if (s.eval) out.push({ at: s.jump, v: await evaluate(s.eval) });
  if (s.shot) {
    const file = resolve(s.shot);
    mkdirSync(dirname(file), { recursive: true });
    const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
    writeFileSync(file, Buffer.from(r.result.data, 'base64'));
  }
}
console.log('=== RESULTS ===');
console.log(JSON.stringify(out, null, 1));
console.log('=== END ===');
// three.js r160 prints these two on every page, they are not ours
const noise = /deprecated with r150|toHalfFloat\(\): Value out of range/;
const real = [...new Set(problems)].filter((p) => !noise.test(p));
console.log(real.length ? 'PAGE PROBLEMS (' + real.length + ')\n' + real.slice(0, 12).join('\n') : 'PAGE PROBLEMS: none');
await quit(0);
