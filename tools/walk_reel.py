#!/usr/bin/env python3
"""Record a walkthrough reel of a scroll-film page, resting on every stop.

  python3 tools/walk_reel.py <page-url> <out.mp4> [--phone] [--from KEY] [--to KEY]
                             [--speed 46] [--rest 2.6] [--through door] [--share] [--dry]

The scroll positions come from the page itself (window.__rig.K), so the plan
stays right when camera keys are added or their lengths change.

  --from KEY / --to KEY   only this stretch (key ids as in the page's KEYS, for example
                          --from galleryEnd). Without --to the reel runs to the end of the page.
  --speed                 travel speed between stops, in vh per second (46 is a calm walk)
  --rest                  seconds spent on each stop
  --through KEY[,KEY]     stops whose whole rest is played (a door that opens during the rest)
  --share                 also write a small copy next to it (<name>-share.mp4)
  --dry                   print the plan, record nothing

Needs: the page served over http (python3 tools/serve.py), node, ffmpeg, and the
demo-options recorder at ~/.claude/skills/demo-options/scripts/record.mjs.
If the recorder reports fewer than about 45 frames a second, something else is
loading the machine (often another session recording): wait and run it again.
"""
import json, os, re, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
RECORD = os.path.expanduser("~/.claude/skills/demo-options/scripts/record.mjs")
READY = "window.__rig && window.__rig.world && !document.getElementById('loader')"
END = "js:document.documentElement.scrollHeight - innerHeight"


def arg(name, default=None, flag=False):
    if name in sys.argv:
        i = sys.argv.index(name)
        if flag:
            return True
        return sys.argv[i + 1]
    return False if flag else default


def with_at(url, at):
    url = re.sub(r"[?&]at=[^&]*", "", url)
    return url + ("&" if "?" in url else "?") + "at=" + str(at)


def main():
    pos = [a for a in sys.argv[1:] if not a.startswith("--")]
    opts_with_value = ("--from", "--to", "--speed", "--rest", "--through")
    for o in opts_with_value:
        v = arg(o)
        if v in pos:
            pos.remove(v)
    if len(pos) < 2:
        print(__doc__)
        sys.exit(1)
    url, out = pos[0], pos[1]
    phone = arg("--phone", flag=True)
    size = "390x844" if phone else "1440x900"
    vh = int(size.split("x")[1]) / 100.0
    speed, rest = float(arg("--speed", 46)), float(arg("--rest", 2.6))
    through = (arg("--through", "door") or "").split(",")

    # 1. ask the page where its keys are
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump([{"jump": 0, "wait": 1200, "eval": "JSON.stringify(__rig.K.map(k => [k.id, k.h0, k.h1]))"}], f)
        steps = f.name
    res = subprocess.run(["node", os.path.join(HERE, "probe.mjs"), with_at(url, 0), steps, size], capture_output=True, text=True)
    os.unlink(steps)
    m = re.search(r"=== RESULTS ===\n(.*?)\n=== END ===", res.stdout, re.S)
    if not m:
        print("could not read the keys from the page:\n" + res.stdout[-800:] + res.stderr[-400:])
        sys.exit(1)
    keys = json.loads(json.loads(m.group(1))[0]["v"])
    holds = [(k, h0, h1) for k, h0, h1 in keys if h1 > h0 + 0.01]
    ids = [k for k, _, _ in holds]
    a = ids.index(arg("--from")) if arg("--from") else 0
    b = ids.index(arg("--to")) if arg("--to") else len(holds) - 1
    stretch = holds[a:b + 1]

    # 2. the plan: rest on each stop, travel between them at a steady pace
    k0, h0, h1 = stretch[0]
    start = 0 if a == 0 else h0 + (h1 - h0) * 0.5
    t, cur, pts = (3.0 if a == 0 else 2.0), start, [(0.0, start)]
    pts.append((t, start))
    for k, h0, h1 in stretch[1:]:
        tgt = h0 + 4
        t += max(2.5, abs(tgt - cur) / speed)
        pts.append((t, tgt))
        hold = h0 + (h1 - h0) * (0.92 if k in through else 0.7)
        t += rest + (0.8 if k in through else 0)
        pts.append((t, hold))
        cur = hold
    if not arg("--to"):
        t += 5
        pts.append((t, None))
        t += 3
        pts.append((t, None))
    plan = "; ".join(f"{tt:.1f}:" + (END if y is None else str(round(y * vh))) for tt, y in pts)
    print(f"stops: {', '.join(k for k, _, _ in stretch)}\nlength: {t:.0f} s\nplan: {plan}")
    if arg("--dry", flag=True):
        return

    # 3. record
    os.makedirs(os.path.dirname(os.path.abspath(out)) or ".", exist_ok=True)
    cmd = ["node", RECORD, "--url", with_at(url, round(start)), "--out", out, "--wait", READY,
           "--settle", "300" if a == 0 else "3500", "--scroll", plan, "--seconds", f"{t + 0.5:.1f}"]
    cmd += ["--phone"] if phone else ["--size", size]
    rec = subprocess.run(cmd, capture_output=True, text=True)
    print(rec.stdout.strip() or rec.stderr.strip())
    fps = re.search(r"\((\d+) per second\)", rec.stdout)
    if fps and int(fps.group(1)) < 45:
        print("WARNING: under 45 frames a second, the machine was busy. Record it again.")
    if "page errors" in rec.stdout:
        print("WARNING: the page reported errors during the reel (see the line above).")
    if arg("--share", flag=True) and os.path.exists(out):
        share = re.sub(r"(-desktop)?\.mp4$", "-share.mp4", out)
        vf = [] if phone else ["-vf", "scale=1280:-2"]
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", out] + vf + ["-c:v", "libx264", "-crf", "27", "-preset", "slow",
                        "-pix_fmt", "yuv420p", "-movflags", "+faststart", share], check=True)
        print("share copy: " + share)


if __name__ == "__main__":
    main()
