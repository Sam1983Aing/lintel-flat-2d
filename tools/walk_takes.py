#!/usr/bin/env python3
"""A clean walkthrough reel on a busy machine: record the walk in stretches, keep the best take of each, join them.

  python3 tools/walk_takes.py <page-url> <out.mp4> [--phone] [--tries 4] [--share]

When something else is using the GPU (a Blender render in another session, say) a two minute reel never comes out
clean in one go. Each stretch here is 20 to 30 seconds and is repeated until it runs at 55 frames a second or more
with no gap over 120 ms (or the tries run out, then the best take is kept and the report says so). A take that
hangs is stopped after three minutes together with the Chrome it started.
Stretches run from stop to stop, so the joins fall on rests.
"""
import os, re, subprocess, sys, tempfile, signal

HERE = os.path.dirname(os.path.abspath(__file__))
url, out = [a for a in sys.argv[1:] if not a.startswith("--") and not a.isdigit()][:2]
phone = "--phone" in sys.argv
tries = int(sys.argv[sys.argv.index("--tries") + 1]) if "--tries" in sys.argv else 4
CUTS = [None, "hall", "dining", "gallery", "bedroom", "garden", None]
tmp = tempfile.mkdtemp(prefix="walk-takes-")
parts, report = [], []
for i in range(len(CUTS) - 1):
    a, b = CUTS[i], CUTS[i + 1]
    best = None
    for t in range(1, tries + 1):
        f = os.path.join(tmp, f"s{i}-t{t}.mp4")
        cmd = ["python3", os.path.join(HERE, "walk_reel.py"), url, f, "--through", "door,asbuilt", "--rest", "2.8", "--speed", "52"]
        if a: cmd += ["--from", a]
        if b: cmd += ["--to", b]
        if phone: cmd += ["--phone"]
        p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, start_new_session=True)
        try:
            txt = p.communicate(timeout=190)[0]
        except subprocess.TimeoutExpired:
            os.killpg(p.pid, signal.SIGTERM)          # the planner, the recorder and its Chrome are one process group
            print(f"stretch {i + 1} take {t}: hung, stopped", flush=True)
            continue
        m = re.search(r"\((\d+) per second\), longest gaps ms: (\d+)", txt)
        if not m or not os.path.exists(f):
            print(f"stretch {i + 1} take {t}: no result", flush=True)
            continue
        fps, gap = int(m.group(1)), int(m.group(2))
        print(f"stretch {i + 1} ({a or 'start'} to {b or 'end'}) take {t}: {fps} fps, longest gap {gap} ms", flush=True)
        if best is None or (gap, -fps) < (best[1], -best[0]):
            best = (fps, gap, f)
        if fps >= 55 and gap <= 120:
            break
    if best is None:
        sys.exit(f"stretch {i + 1} never recorded")
    parts.append(best[2]); report.append(best[:2])
lst = os.path.join(tmp, "list.txt")
open(lst, "w").write("".join(f"file '{p}'\n" for p in parts))
os.makedirs(os.path.dirname(os.path.abspath(out)) or ".", exist_ok=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out], check=True)
print("kept:", ", ".join(f"{f} fps / {g} ms" for f, g in report))
print(out)
if "--share" in sys.argv:
    share = re.sub(r"(-desktop)?\.mp4$", "-share.mp4", out)
    vf = [] if phone else ["-vf", "scale=1280:-2"]
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", out] + vf + ["-c:v", "libx264", "-crf", "27", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", share], check=True)
    print("share copy:", share)
