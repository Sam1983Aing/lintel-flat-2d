#!/usr/bin/env python3
"""What a frame costs at a room's fixed close-up places (the same places as tools/room_closeups.py), uncapped.

  python3 tools/view_cost.py "<query>" --room entrance [--only room,hall] [--frames 120]

  e.g. "bake=entrance,hall,wc" or "x=1" (no switch). LN_PAGE points it at another folder (001%20Lintel/v7a/).
Sam's window, 1728x992 at DPR 2, no vsync and no 60 fps cap, ?steady (the full pixel budget), so a frame's time is
what it costs. For each place: 40 frames to settle, then the frames measured. Prints one JSON line: avg and p95 in
ms per place. The load on this Mac changes within minutes: run versions interleaved (A, B, A, B) and compare within a
round. Run from 014 Flat 3D/ with the server up.
"""
import json, os, subprocess, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
args = sys.argv[1:]
opt = lambda k, d=None: (args[args.index(k) + 1] if k in args else d)
query, room = args[0], opt('--room', 'entrance')
only = set((opt('--only') or '').split(',')) - {''}
frames = int(opt('--frames', '120'))
here = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(here, 'room_closeups.py')).read()
ROOMS = eval(src[src.index('ROOMS = {') + 8: src.index('key, frac, SHOTS')].strip())     # (the places, kept in one file)
key, frac, SHOTS = ROOMS[room]
url = f"http://127.0.0.1:8014/{os.environ.get('LN_PAGE', '001%20Lintel/')}?{query}&steady"
shots = {k: v for k, v in SHOTS.items() if not only or k in only}
MEASURE = r"""(async () => {
  const raf = () => new Promise((r) => requestAnimationFrame(r)), out = {};
  const k = __rig.K.find((k) => k.id === '%s'); __rig.jump(k.h0 + (k.h1 - k.h0) * %s);
  const S = %s;
  for (const name of Object.keys(S)) {
    const [p, look, fov] = S[name]; window.__cam = { p, look, fov };
    for (let i = 0; i < 40; i++) await raf();
    const t = []; let last = performance.now();
    for (let i = 0; i < %d; i++) { await raf(); const now = performance.now(); t.push(now - last); last = now; }
    t.sort((a, b) => a - b);
    out[name] = { avg: +(t.reduce((a, b) => a + b, 0) / t.length).toFixed(2), p95: +t[Math.floor(t.length * 0.95)].toFixed(2) };
  }
  return JSON.stringify(out);
})()""" % (key, frac, json.dumps(shots), frames)
READY = "new Promise((r) => { const t = () => (window.__rig && window.__rig.world) ? r(1) : setTimeout(t, 50); t(); })"
LOADED = "new Promise((r) => { const t = () => !document.getElementById('loader') ? r(1) : setTimeout(t, 100); t(); })"
HIDE = "(() => { window.__P = { dof: 0 }; return 1; })()"
steps = [{"wait": 800, "eval": READY}, {"eval": LOADED}, {"jump": 0, "wait": 2500}, {"eval": HIDE}, {"wait": 500, "eval": MEASURE}]
fd, path = tempfile.mkstemp(suffix='.json'); os.write(fd, json.dumps(steps).encode()); os.close(fd)
env = dict(os.environ, DPR='2', NOWAIT='1', CHROME_FLAGS="--disable-gpu-vsync --disable-frame-rate-limit")
try:
    r = subprocess.run(['node', os.path.join(here, 'probe.mjs'), url, path, '1728x992'], capture_output=True, text=True, timeout=900, env=env)
finally:
    os.unlink(path)
txt = r.stdout + r.stderr
try:
    res = json.loads(txt[txt.index('=== RESULTS ===') + 15: txt.index('=== END ===')])
    print(json.dumps({'query': query, 'views': json.loads(res[-1]['v'])}))
except Exception:
    print(txt[-1500:])
