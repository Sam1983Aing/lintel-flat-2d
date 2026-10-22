// Records the page by driving headless Chrome over its debugging port.
// No dependencies: Node 22+ and a local Chrome are enough. ffmpeg is needed
// only for --reel.
//
//   node tools/record.mjs --shots 0,0.2,0.5,1 --out recordings/stills
//   node tools/record.mjs --reel recordings/desktop.mp4 --w 1600 --h 900 --dpr 2
//   node tools/record.mjs --reel recordings/phone.mp4 --w 390 --h 844 --dpr 3 --mobile
//
// The page is opened with ?capture, where it draws exactly the scroll position
// it is asked for. So a reel shows the scroll at an even pace, not the frame
// rate of this machine.

import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const arg = (name, dflt) => {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return dflt;
  const v = process.argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
const W = +arg('w', 1600), H = +arg('h', 900), DPR = +arg('dpr', 1);
const MOBILE = !!arg('mobile', false);
const PORT = +arg('port', 9333);
const URL_ = arg('url', 'http://127.0.0.1:8231/index.html?capture=1');
const SHOTS = arg('shots', null);
const REEL = arg('reel', null);
const OUT = resolve(arg('out', 'recordings/stills'));
const FPS = +arg('fps', 30);
const CHROME = arg('chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
const PROFILE = resolve('tmp/chrome-profile-' + PORT);

// seconds : scroll progress. The reel eases between these.
const KEYS = (arg('keys', '0:0,1.5:0,10.2:0.34,10.9:0.345,18:0.58,19.2:0.585,31.5:1,34:1'))
  .split(',').map((k) => k.split(':').map(Number));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ease = (t) => t * t * (3 - 2 * t);
const progressAt = (t) => {
  if (t <= KEYS[0][0]) return KEYS[0][1];
  for (let i = 1; i < KEYS.length; i++) {
    if (t <= KEYS[i][0]) {
      const u = (t - KEYS[i - 1][0]) / (KEYS[i][0] - KEYS[i - 1][0]);
      return KEYS[i - 1][1] + (KEYS[i][1] - KEYS[i - 1][1]) * ease(u);
    }
  }
  return KEYS[KEYS.length - 1][1];
};

rmSync(PROFILE, { recursive: true, force: true });
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
  '--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal', '--enable-unsafe-swiftshader',
  `--window-size=${W},${H}`, 'about:blank',
], { stdio: 'ignore' });

let ws, nextId = 1;
const waiting = new Map();
const logs = [];
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const id = nextId++;
    waiting.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression, awaitPromise = false) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true });
  if (r.exceptionDetails) throw new Error('page threw: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
};

async function main() {
  let target;
  for (let i = 0; i < 80 && !target; i++) {
    await sleep(150);
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      target = list.find((t) => t.type === 'page');
    } catch {}
  }
  if (!target) throw new Error('Chrome did not open its debugging port');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && waiting.has(m.id)) {
      const { res, rej } = waiting.get(m.id);
      waiting.delete(m.id);
      m.error ? rej(new Error(m.error.message)) : res(m.result);
    } else if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) {
      logs.push(m.params.type + ': ' + m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 400));
    } else if (m.method === 'Runtime.exceptionThrown') {
      logs.push('exception: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 600));
    } else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
      logs.push('log: ' + m.params.entry.text.slice(0, 300) + ' ' + (m.params.entry.url || ''));
    }
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: MOBILE });
  await send('Page.navigate', { url: URL_ });

  let ready = false;
  for (let i = 0; i < 240 && !ready; i++) {
    await sleep(250);
    try { ready = await evaluate('window.__ready === true'); } catch {}
    if (logs.some((l) => l.startsWith('exception'))) break;
  }
  if (!ready) {
    console.log('PAGE NOT READY');
    console.log(logs.join('\n'));
    try { console.log('page errors:', await evaluate('JSON.stringify(window.__errors || [])')); } catch {}
    return 1;
  }
  const gpu = await evaluate(`(() => { const g = document.createElement('canvas').getContext('webgl2'); const e = g && g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; })()`);
  console.log('gpu:', gpu);

  const shot = async (file, format = 'png') => {
    const r = await send('Page.captureScreenshot', { format, quality: 93, optimizeForSpeed: true });
    writeFileSync(file, Buffer.from(r.data, 'base64'));
  };

  if (SHOTS) {
    mkdirSync(OUT, { recursive: true });
    for (const s of String(SHOTS).split(',').map(Number)) {
      await evaluate(`window.__frame(${s})`, true);
      const file = `${OUT}/s${s.toFixed(3).replace('.', '_')}.png`;
      await shot(file);
      const st = JSON.parse(await evaluate('JSON.stringify(window.__state())'));
      console.log(`s=${s.toFixed(3)} y=${st.y.toFixed(2)} z=${st.z.toFixed(2)} fov=${st.fov.toFixed(1)} cut=${st.cut.toFixed(2)} door=${st.door.toFixed(2)} hall=${st.hall.toFixed(2)} calls=${st.calls} tris=${st.tris} errors=${st.errors} -> ${file}`);
    }
  }

  if (arg('live', false)) {
    // the page as a visitor gets it: Lenis and ScrollTrigger running, real time
    mkdirSync(OUT, { recursive: true });
    await sleep(2500);
    for (const t of [0.25, 0.5, 0.8, 1]) {
      await evaluate(`window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * ${t})`);
      await sleep(3200);
      const st = JSON.parse(await evaluate('JSON.stringify(window.__state())'));
      console.log(`live: asked ${t}, page is at s=${st.s.toFixed(3)} (scrollY ${await evaluate('Math.round(scrollY)')})`);
    }
    await shot(`${OUT}/live_end.png`);
    // frame rate while Lenis glides all the way back up and down again
    const fps = await evaluate(`new Promise((res) => {
      let n = 0, slow = 0, last = performance.now(); const t0 = last;
      const f = (t) => { n++; if (t - last > 34) slow++; last = t; t - t0 < 9000 ? requestAnimationFrame(f) : res({ fps: (n / ((t - t0) / 1000)).toFixed(1), slow, frames: n }); };
      window.__lenis.scrollTo(0, { duration: 4.2 });
      setTimeout(() => window.__lenis.scrollTo(document.documentElement.scrollHeight, { duration: 4.2 }), 4500);
      requestAnimationFrame(f);
    })`, true);
    console.log('live: frame rate over a full scroll up and down:', JSON.stringify(fps));
  }

  if (REEL) {
    const out = resolve(String(REEL));
    const frames = resolve('tmp/frames-' + PORT);
    rmSync(frames, { recursive: true, force: true });
    mkdirSync(frames, { recursive: true });
    mkdirSync(dirname(out), { recursive: true });
    const total = Math.round(KEYS[KEYS.length - 1][0] * FPS);
    const t0 = Date.now();
    for (let f = 0; f <= total; f++) {
      await evaluate(`window.__frame(${progressAt(f / FPS).toFixed(6)})`, true);
      await shot(`${frames}/f_${String(f).padStart(5, '0')}.jpg`, 'jpeg');
      if (f % 150 === 0) console.log(`frame ${f}/${total}`);
    }
    console.log(`captured ${total + 1} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    const vw = Math.round((W * DPR) / 2) * 2, vh = Math.round((H * DPR) / 2) * 2;
    const scale = vw > 1920 || vh > 1920 ? (vw >= vh ? 'scale=1920:-2:flags=lanczos' : 'scale=-2:1920:flags=lanczos') : `scale=${vw}:${vh}`;
    const ff = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${frames}/f_%05d.jpg`, '-vf', scale, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'slow', '-movflags', '+faststart', out], { stdio: 'inherit' });
    console.log(ff.status === 0 ? 'wrote ' + out : 'ffmpeg failed');
    if (existsSync(out) && !arg('keep-frames', false)) rmSync(frames, { recursive: true, force: true });
  }

  const pageErrors = await evaluate('JSON.stringify(window.__errors || [])');
  console.log('page errors:', pageErrors);
  console.log('console:', logs.length ? '\n' + [...new Set(logs)].join('\n') : 'clean');
  return 0;
}

main()
  .catch((e) => { console.error('RECORDER FAILED:', e.message); console.log(logs.join('\n')); return 1; })
  .then((code) => {
    try { ws && ws.close(); } catch {}
    chrome.kill('SIGKILL');
    rmSync(PROFILE, { recursive: true, force: true });
    process.exit(code);
  });
