#!/usr/bin/env python3
"""Numbers for Lintel's living room looks (?look=now|code|light): downloads, boot time, frame times.

  python3 tools/look_numbers.py <look or query> [--phone]     e.g. now, codelit, "code=entrance,hall,wc", "lit=none&salt=7"

Desktop is Sam's window, 1728x992 at DPR 2. --phone is 390x844 at DPR 3 (the page's phone layout).
Frames run uncapped (no vsync, no 60 fps limit) and ?steady keeps the full pixel budget, so a frame's time is
what it costs. The walk: from the hall's rest down into the living room's rest in 240 frames (__rig.jump each
frame), then 180 frames standing at the rest. Prints one JSON line. Run from 014 Flat 3D/ with the server up.
"""
import json, os, subprocess, sys, tempfile
look = sys.argv[1]
phone = '--phone' in sys.argv
size, dpr = ('390x844', '3') if phone else ('1728x992', '2')
here = os.path.dirname(os.path.abspath(__file__))
# a look name (now, code, light, codelit) or any query of the page's own switches, e.g. "code=entrance,hall,wc" or "lit=none&salt=7"
# LN_PAGE: another folder of the page, e.g. "001%20Lintel/v6a/" (a frozen version), for before and after
url = f"http://127.0.0.1:8014/{os.environ.get('LN_PAGE', '001%20Lintel/')}?{look if '=' in look else 'look=' + look}&steady"
MEASURE = r"""(async () => {
  const st = (a) => { const s = a.slice().sort((x, y) => x - y); return { avg: +(a.reduce((p, c) => p + c, 0) / a.length).toFixed(2), p95: +s[Math.floor(s.length * 0.95)].toFixed(2), worst: +s[s.length - 1].toFixed(2) }; };
  const K = (id) => __rig.K.find((k) => k.id === id);
  const a = K('hall').h1, b = K('living').h0 + 55, raf = () => new Promise((r) => requestAnimationFrame(r));
  __rig.jump(a); for (let i = 0; i < 30; i++) await raf();
  const walk = [], at = []; let last = performance.now();
  for (let i = 0; i < 240; i++) { const s = a + (b - a) * i / 239; __rig.jump(s); await raf(); const now = performance.now(); walk.push(now - last); at.push(s); last = now; }
  const hold = []; for (let i = 0; i < 180; i++) { await raf(); const now = performance.now(); hold.push(now - last); last = now; }
  // the living room's first frames: where its reveal starts (at('living') - 50) and the next 20 frames
  const r0 = K('living').h0 - 50; const first = walk.filter((t, i) => at[i] >= r0 && at[i] < r0 + 25);
  const res = performance.getEntriesByType('resource');
  const tex = res.filter((e) => /\/assets\/(tex|sky)\//.test(e.name));
  const nav = performance.getEntriesByType('navigation')[0];
  return JSON.stringify({ walk: st(walk), hold: st(hold), firstLiving: first.length ? st(first) : null,
    textures: tex.length, textureMB: +(tex.reduce((p, e) => p + (e.encodedBodySize || e.transferSize || 0), 0) / 1048576).toFixed(2),
    allMB: +(res.reduce((p, e) => p + (e.encodedBodySize || e.transferSize || 0), 0) / 1048576).toFixed(2),
    bootMs: Math.round(window.__bootMs || 0), captureMs: window.__look ? Math.round(window.__look.ms || 0) : 0, bootT: window.__bootT || null,
    parallel: !!__rig.ctx.renderer.extensions.get('KHR_parallel_shader_compile'),
    px: [__rig.ctx.post.w, __rig.ctx.post.h] });
})()"""
# ready: the house is built and every shader compiled (scene.js precompile runs in the same task that sets the world),
# measured from navigation. The loader's story keeps running after that and is not counted.
READY = "new Promise((r) => { const t = () => (window.__rig && window.__rig.world) ? r(window.__bootMs = Math.round(performance.now())) : /went wrong/i.test((document.querySelector('.loader__story') || {}).innerText || '') ? r('BUILD FAILED') : setTimeout(t, 20); t(); })"
LOADED = "new Promise((r) => { const t = () => !document.getElementById('loader') ? r(1) : setTimeout(t, 100); t(); })"
steps = [{"wait": 800, "eval": READY}, {"eval": LOADED}, {"jump": 0, "wait": 2500}, {"wait": 500, "eval": MEASURE}]
fd, path = tempfile.mkstemp(suffix='.json'); os.write(fd, json.dumps(steps).encode()); os.close(fd)
env = dict(os.environ, DPR=dpr, NOWAIT='1', CHROME_FLAGS="--disable-gpu-vsync --disable-frame-rate-limit")
try:
    r = subprocess.run(['node', os.path.join(here, 'probe.mjs'), url, path, size], capture_output=True, text=True, timeout=1500, env=env)
finally:
    os.unlink(path)
txt = r.stdout + r.stderr
try:
    res = json.loads(txt[txt.index('=== RESULTS ===') + 15: txt.index('=== END ===')])
    out = json.loads(res[-1]['v']); out['look'] = look; out['device'] = 'phone' if phone else 'desktop'
    print(json.dumps(out))
except Exception:
    print('failed:\n' + txt[-2000:])
print(txt[txt.index('PAGE PROBLEMS') if 'PAGE PROBLEMS' in txt else -300:].strip()[:600])
