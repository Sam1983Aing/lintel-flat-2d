#!/usr/bin/env node
// A walkthrough reel that is smooth whatever else the machine is doing.
//
//   node tools/walk_offline.mjs <page-url> <out.mp4> [--phone] [--share] [--fps 30] [--from KEY] [--to KEY] [--rest 2.8] [--speed 52] [--through door,asbuilt]
//   node tools/walk_offline.mjs <page-url> <out.mp4> --plan "0:380; 1.5:380; 9:428"     a plan of your own: seconds:vh, eased between the points
//   --size 1728x992 records at Sam's window instead of 1440x900
//   --dpr 2 records at retina, as his screen shows it (the video is twice the size each way: 3456x1984 at his window)
//   --cams "0|15.5,25.2,1.6|15,17.5,1.8|58; 4|14.2,22.8,1.55|11.3,21.2,1.4|50"   a camera path of its own (Lintel's __cam aid, plan
//          metres: seconds | eye x,y,height | look x,y,height | lens), eased between the points, with the scroll held at --at
//          (vh, or a key's id for the middle of its rest). The small print is hidden and depth of field is off, as in the close-ups
//
// The other recorders film the page in real time, so when something else has the GPU (a Blender
// render in another session, say) the reel stutters. This one does not film. It asks the page for
// the same scroll plan (tools/walk_reel.py --dry), then for every frame of the reel it places the
// scroll with __rig.jump (the camera lands at once, no catching up), lets the page draw, and takes
// a still. The stills become the video. Slow, about six minutes for a two minute reel, and every
// frame is there.
// What differs from a live visit: the camera has none of its small lag behind the scroll, and things
// that run on the clock (dust drifting, a title sliding in) look a few times quicker, because real
// time passes between two stills. Use the live recorders to judge how the page feels under the hand.
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const withValue = ['--fps', '--from', '--to', '--rest', '--speed', '--through', '--plan', '--size', '--cams', '--at', '--dpr'];
const pos = argv.filter((a, i) => !a.startsWith('--') && !withValue.includes(argv[i - 1]));
const [URL, OUTFILE] = pos;
if (!URL || !OUTFILE) { console.log('usage: node tools/walk_offline.mjs <page-url> <out.mp4> [--phone] [--share] [--fps 30] [--from KEY] [--to KEY]'); process.exit(1); }
const PHONE = flag('--phone'), FPS = Number(opt('--fps', 30)), DPR = Number(opt('--dpr', 1));
const [VW, VH] = PHONE ? [390, 844] : opt('--size', '1440x900').split('x').map(Number);     // --size 1728x992: Sam's window
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 1. the scroll plan: given with --plan (seconds:vh), or else from the page's own keys
const CAMS = opt('--cams', null) ? opt('--cams').split(';').map((k) => { const [t, p, l, f] = k.split('|'); return { t: parseFloat(t), p: p.split(',').map(Number), l: l.split(',').map(Number), f: parseFloat(f) }; }) : null;
const OWN = CAMS ? `0:0; ${CAMS[CAMS.length - 1].t}:0` : opt('--plan', null);
const pass = [];
['--from', '--to', '--rest', '--speed', '--through'].forEach((n) => { if (argv.includes(n)) pass.push(n, opt(n)); });
if (!argv.includes('--through')) pass.push('--through', 'door,asbuilt');
if (!argv.includes('--rest')) pass.push('--rest', '2.8');
if (!argv.includes('--speed')) pass.push('--speed', '52');
const dry = OWN ? { stdout: 'plan: ' + OWN.split(';').map((k) => { const [t, v] = k.split(':'); return `${parseFloat(t)}:${parseFloat(v) * (VH / 100)}`; }).join(';') } : spawnSync('python3', [join(HERE, 'walk_reel.py'), URL, '/dev/null', '--dry', ...pass, ...(PHONE ? ['--phone'] : [])], { encoding: 'utf8' });
const pm = /plan: (.*)/.exec(dry.stdout || '');
if (!pm) { console.error('no plan from walk_reel.py:\n' + (dry.stdout || '') + (dry.stderr || '')); process.exit(1); }
const keys = pm[1].split(';').map((k) => { const i = k.indexOf(':'); return [parseFloat(k.slice(0, i)), k.slice(i + 1).trim()]; });
const first = keys[0][1].startsWith('js:') ? 0 : Math.round(parseFloat(keys[0][1]) / (VH / 100));

// 2. Chrome
const CHROME = process.env.CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'].find(existsSync);
const PORT = 9300 + Math.floor(Math.random() * 600);
const PROFILE = mkdtempSync(join(tmpdir(), 'walk-offline-')), FRAMES = mkdtempSync(join(tmpdir(), 'walk-offline-frames-'));
const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--no-first-run', '--hide-scrollbars', '--mute-audio',
  `--window-size=${VW},${VH}`, '--headless=new', '--use-angle=metal', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank'], { stdio: 'ignore' });
const quit = async (code) => { try { chrome.kill(); } catch {} await sleep(400); try { rmSync(PROFILE, { recursive: true, force: true }); rmSync(FRAMES, { recursive: true, force: true }); } catch {} process.exit(code); };
let targets;
for (let i = 0; i < 100; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if (targets.find((t) => t.type === 'page')) break; } catch {} await sleep(150); }
const tab = targets && targets.find((t) => t.type === 'page');
if (!tab) { console.error('Chrome did not open a page.'); await quit(1); }
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const waiting = new Map(), problems = [];
const send = (method, params = {}) => new Promise((res) => { const my = ++id; waiting.set(my, res); ws.send(JSON.stringify({ id: my, method, params })); });
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') problems.push(m.params.exceptionDetails.text + ' ' + ((m.params.exceptionDetails.exception || {}).description || '').slice(0, 160));
});
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: DPR, mobile: false });
await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const start = URL.replace(/[?&]at=[^&]*/, '');
await send('Page.navigate', { url: start + (start.includes('?') ? '&' : '?') + 'at=' + first });
let ok = false;
for (let i = 0; i < 900 && !ok; i++) { ok = await evaluate(`!!(window.__rig && window.__rig.world && !document.getElementById('loader'))`); if (!ok) await sleep(100); }
if (!ok) { console.error('the page never reported ready'); await quit(1); }
await sleep(first ? 3500 : 800);

// 3. every frame: where the scroll is at that moment of the plan (eased between the plan's points), one still
const vh = VH / 100, end = (await evaluate('document.documentElement.scrollHeight - innerHeight')) / vh;
let hold = null;
if (CAMS) {
  const AT = opt('--at', '0');
  hold = isNaN(Number(AT)) ? await evaluate(`(() => { const k = __rig.K.find((k) => k.id === '${AT}'); return k.h0 + (k.h1 - k.h0) * 0.5; })()`) : Number(AT);
  await evaluate(`window.__rig.jump(${hold}); 1`); await sleep(4200);
  await evaluate("(() => { const s = document.createElement('style'); s.textContent = '.spots, .topbar, .corner, .ruler, .count, .hint, .file { display: none !important; }'; document.head.appendChild(s); window.__P = { dof: 0 }; return 1; })()");
}
const camAt = (t) => {
  let i = 0;
  while (i < CAMS.length - 2 && t > CAMS[i + 1].t) i++;
  const a = CAMS[i], b = CAMS[i + 1], u = Math.min(1, Math.max(0, (t - a.t) / Math.max(1e-6, b.t - a.t))), e = u * u * (3 - 2 * u);
  const L = (x, y) => x.map((v, k) => +(v + (y[k] - v) * e).toFixed(4));
  return { p: L(a.p, b.p), look: L(a.l, b.l), fov: +(a.f + (b.f - a.f) * e).toFixed(3) };
};
const pts = keys.map(([t, v]) => [t, v.startsWith('js:') ? end : parseFloat(v) / vh]);
const at = (t) => {
  let i = 0;
  while (i < pts.length - 2 && t > pts[i + 1][0]) i++;
  const [t0, a] = pts[i], [t1, b] = pts[i + 1];
  const u = Math.min(1, Math.max(0, (t - t0) / Math.max(1e-6, t1 - t0))), e = u * u * (3 - 2 * u);
  return a + (b - a) * e;
};
const total = Math.round((pts[pts.length - 1][0] + 0.5) * FPS), t00 = Date.now();
for (let i = 0; i < total; i++) {
  const place = CAMS ? `window.__cam = ${JSON.stringify(camAt(i / FPS))};` : `window.__rig.jump(${at(i / FPS).toFixed(3)});`;
  await evaluate(`${place} new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))))`);
  const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 93 });
  writeFileSync(join(FRAMES, `f${String(i).padStart(5, '0')}.jpg`), Buffer.from(r.result.data, 'base64'));
  if (i % 300 === 299) console.log(`  ${i + 1} of ${total} frames, ${Math.round((Date.now() - t00) / 1000)} s`);
}

// 4. the video
mkdirSync(dirname(resolve(OUTFILE)), { recursive: true });
const enc = spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', join(FRAMES, 'f%05d.jpg'), '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', resolve(OUTFILE)], { encoding: 'utf8' });
if (enc.status !== 0) { console.error(enc.stderr); await quit(1); }
console.log(`${resolve(OUTFILE)}\n  ${(total / FPS).toFixed(1)} s at ${FPS} fps, ${VW}x${VH}, ${total} stills in ${Math.round((Date.now() - t00) / 1000)} s`);
if (flag('--share')) {
  const share = resolve(OUTFILE).replace(/(-desktop)?\.mp4$/, '-share.mp4');
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', resolve(OUTFILE), ...(PHONE ? [] : ['-vf', 'scale=1280:-2']), '-c:v', 'libx264', '-crf', '27', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', share]);
  console.log('share copy: ' + share);
}
console.log(problems.length ? 'PAGE PROBLEMS:\n' + problems.join('\n') : 'PAGE PROBLEMS: none');
await quit(0);
