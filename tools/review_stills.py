#!/usr/bin/env python3
"""The 35 stills of Lintel's walk that the outside reviewer scores, always from the same places.

  python3 tools/review_stills.py <url> <outdir> [--only 03,04,29] [--dpr 2] [--size 1440x900]

The places are tied to the page's own camera keys (read from the page first), so they stay put when a
key is added or a rest gets longer. File names match teach/shots/2026-10-09-after-final/.
Run from 014 Flat 3D/. Needs the server (python3 tools/serve.py).
"""
import json, os, subprocess, sys, tempfile

args = sys.argv[1:]
if len(args) < 2:
    print(__doc__); sys.exit(1)
url, out = args[0], os.path.abspath(args[1])
opt = lambda k, d=None: (args[args.index(k) + 1] if k in args else d)
only = set((opt('--only') or '').split(',')) - {''}
dpr, size = opt('--dpr', '1'), opt('--size', '1440x900')
here = os.path.dirname(os.path.abspath(__file__))
probe = os.path.join(here, 'probe.mjs')
os.makedirs(out, exist_ok=True)


def run(steps, timeout=900):
    fd, path = tempfile.mkstemp(suffix='.json'); os.write(fd, json.dumps(steps).encode()); os.close(fd)
    env = dict(os.environ, DPR=dpr)
    try:
        r = subprocess.run(['node', probe, url, path, size], capture_output=True, text=True, timeout=timeout, env=env)
    finally:
        os.unlink(path)
    return r.stdout + r.stderr


# 1. where the keys are
txt = run([{"jump": 0, "wait": 1500, "eval": "JSON.stringify({ k: __rig.K.map(k => [k.id, k.h0, k.h1]), end: (document.documentElement.scrollHeight - innerHeight) / (innerHeight / 100) })"}], 240)
try:
    res = json.loads(txt[txt.index('=== RESULTS ===') + 15: txt.index('=== END ===')])
    info = json.loads(res[0]['v'])
except Exception:
    print('could not read the keys from the page:\n' + txt[-1500:]); sys.exit(1)
K = {k[0]: (k[1], k[2]) for k in info['k']}
h0 = lambda i: K[i][0]
h1 = lambda i: K[i][1]
mid = lambda i, f=0.5: K[i][0] + (K[i][1] - K[i][0]) * f
between = lambda a, b, f: h1(a) + (h0(b) - h1(a)) * f
roll = lambda k: h0('asbuilt') + 4 + k * ((h1('asbuilt') - 24) - (h0('asbuilt') + 4))     # as rollK in scene.js

SHOTS = [
    ('00-hero', 0), ('01-scroll1', h1('hero') + 4), ('02-lens1', between('hero', 'lens', 0.55)), ('03-lens2', h0('lens') + 8),
    ('04-lens3', h0('approach') - 12), ('05-approach', between('approach', 'door', 0.6)), ('06-door', mid('door', 0.75)), ('07-hall', mid('hall')),
    ('08-rise', h0('rise')), ('09-livingTop', mid('livingTop')), ('10-drop', h0('drop')), ('11-living', mid('living')), ('12-dining', mid('dining')),
    ('13-turn-to-patio', between('dining', 'slide', 0.45)), ('14-slide', h0('slide')), ('15-patio', mid('patio')), ('16-olive', mid('olive')),
    ('17-to-gallery', between('olive', 'turn', 0.86)), ('18-gallery', mid('gallery')), ('19-galleryMid', between('gallery', 'galleryEnd', 0.5)), ('20-galleryEnd', mid('galleryEnd')),
    ('21-bedIn', h0('bedIn') + 26), ('22-bedroom', mid('bedroom')), ('23-dress', h0('dressMid') if 'dressMid' in K else between('dressDoor', 'dress', 0.4)), ('24-bath-start', h0('bath') + 2), ('25-bath-mid', mid('bath')),
    ('26-bath-end', h1('bath') - 2), ('27-garden', mid('garden')), ('28-lift', h0('lift')), ('29-top-built', h0('asbuilt') + 2), ('30-roll-rest', roll(0.22)),
    ('31-roll-1', roll(0.42)), ('32-roll-2', roll(0.7)), ('33-sheet', h1('asbuilt') - 8), ('34-finale', info['end']),
]
# the first jump of a session lands while the page's intro is still running, so it gets a throwaway stop at the top
steps = [{"jump": 0, "wait": 2600}]
for name, at in SHOTS:
    if only and name[:2] not in only and name not in only:
        continue
    # a jump lands the camera at once, the eased things (focus, haze, the small print's colour) need a moment
    steps.append({"jump": round(at, 2), "wait": 3400, "shot": os.path.join(out, name + '.jpg')})
print('\n'.join(f"{n:18s} {a:8.1f} vh" for n, a in SHOTS if not only or n[:2] in only or n in only))
txt = run(steps)
print(txt[txt.index('PAGE PROBLEMS') if 'PAGE PROBLEMS' in txt else -600:].strip())
