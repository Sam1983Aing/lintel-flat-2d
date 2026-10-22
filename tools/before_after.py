#!/usr/bin/env python3
"""A before and after sheet from two folders of stills, with a caption per pair.

  python3 tools/before_after.py <out.jpg> <title> <before-dir> <after-dir> "caption|before.jpg|after.jpg" ...

Lays the pairs out in an HTML page (page colours of Lintel) and screenshots it with tools/probe.mjs.
ffmpeg on this machine has no text filter and Python has no Pillow, hence the HTML.
"""
import html, json, os, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
out, title, da, db = sys.argv[1:5]
pairs = [p.split("|") for p in sys.argv[5:]]
W, IW = 1600, 760
IH = round(IW * 900 / 1440)
rows = "".join(
    f'<section><h2>{html.escape(c)}</h2><div class="p"><figure><img src="file://{os.path.abspath(os.path.join(da, a))}"><figcaption>before</figcaption></figure>'
    f'<figure><img src="file://{os.path.abspath(os.path.join(db, b))}"><figcaption>after</figcaption></figure></div></section>'
    for c, a, b in pairs)
page = f"""<!doctype html><meta charset="utf-8"><style>
body {{ margin: 0; background: #efebe2; color: #1d1d1f; font: 400 15px/1.4 -apple-system, 'Helvetica Neue', sans-serif; width: {W}px; }}
h1 {{ font: 600 26px/1.2 -apple-system, sans-serif; margin: 0; padding: 30px 30px 6px; }}
section {{ padding: 16px 30px 6px; }} h2 {{ font: 500 15px/1.3 ui-monospace, Menlo, monospace; letter-spacing: 0.06em; text-transform: uppercase; margin: 0 0 8px; }}
.p {{ display: flex; gap: 20px; }} figure {{ margin: 0; }} img {{ display: block; width: {IW}px; height: {IH}px; object-fit: cover; }}
figcaption {{ font: 500 11px/1 ui-monospace, Menlo, monospace; letter-spacing: 0.14em; text-transform: uppercase; color: #f0500f; padding: 7px 0 0; }}
</style><h1>{html.escape(title)}</h1>{rows}"""
H = 80 + len(pairs) * (IH + 78) + 20
with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False) as f:
    f.write(page); src = f.name
with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
    json.dump([{"wait": 1500, "shot": os.path.abspath(out)}], f); steps = f.name
env = dict(os.environ, NOWAIT="1")
r = subprocess.run(["node", os.path.join(HERE, "probe.mjs"), "file://" + src, steps, f"{W}x{H}"], capture_output=True, text=True, env=env)
os.unlink(src); os.unlink(steps)
print(out if os.path.exists(out) else r.stdout[-400:] + r.stderr[-400:])
