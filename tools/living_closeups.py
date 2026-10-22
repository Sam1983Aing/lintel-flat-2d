#!/usr/bin/env python3
"""Close-ups of Lintel's living room, always from the same places, for comparing looks (?look=now|code|light).

  python3 tools/living_closeups.py <url> <outdir> [--only sofa,fire] [--dpr 2] [--size 1728x992]

The page stands at the living room's rest (so the room is real), then the camera is placed by hand with the page's
own design aid (__cam, plan coordinates: p = [x, y, eye height], look = [x, y, height]). Depth of field is off
(__P) and the small print is hidden, so the stills show only the room. Run from 014 Flat 3D/ with the server up.
"""
import json, os, subprocess, sys, tempfile

args = sys.argv[1:]
if len(args) < 2:
    print(__doc__); sys.exit(1)
url, out = args[0], os.path.abspath(args[1])
opt = lambda k, d=None: (args[args.index(k) + 1] if k in args else d)
only = set((opt('--only') or '').split(',')) - {''}
dpr, size = opt('--dpr', '2'), opt('--size', '1728x992')
here = os.path.dirname(os.path.abspath(__file__))
os.makedirs(out, exist_ok=True)

# name: (camera position, where it looks, lens)
SHOTS = {
    'sofa':   ([17.75, 13.55, 0.62], [14.3, 11.15, -0.18], 40),     # the north run, its cushions and the throw, the rug
    'fire':   ([12.55, 15.05, 1.0], [10.15, 13.3, 0.5], 42),        # the hearth, the logs, the firebox, the breast
    'olive':  ([13.6, 13.4, 1.5], [10.55, 15.75, 1.2], 48),         # the olive in its planter, bark and leaves
    'floor':  ([17.4, 14.6, 1.25], [14.2, 12.6, -0.45], 46),        # the pit floor and rug where the sun lands
    'chairs': ([17.4, 12.9, 1.15], [19.75, 10.55, 0.3], 44),        # the two leather lounge chairs and the side table
    'wall':   ([17.5, 15.2, 1.6], [9.6, 8.6, 3.4], 50),             # plaster, ceiling, the high windows' corner
}
HIDE = ("(() => { const s = document.createElement('style'); s.textContent = '.spots, .topbar, .corner, .ruler, .count, .hint, .file { display: none !important; }';"
        " document.head.appendChild(s); window.__P = { dof: 0 }; return 1; })()")
steps = [{"jump": 0, "wait": 2600}, {"jump": 1150, "wait": 4200, "eval": HIDE}]
for name, (p, look, fov) in SHOTS.items():
    if only and name not in only:
        continue
    steps.append({"eval": f"(window.__cam = {{ p: {json.dumps(p)}, look: {json.dumps(look)}, fov: {fov} }}, 1)", "wait": 2600, "shot": os.path.join(out, name + '.jpg')})
fd, path = tempfile.mkstemp(suffix='.json'); os.write(fd, json.dumps(steps).encode()); os.close(fd)
try:
    r = subprocess.run(['node', os.path.join(here, 'probe.mjs'), url, path, size], capture_output=True, text=True, timeout=600, env=dict(os.environ, DPR=dpr))
finally:
    os.unlink(path)
txt = r.stdout + r.stderr
print(txt[txt.index('PAGE PROBLEMS') if 'PAGE PROBLEMS' in txt else -600:].strip())
