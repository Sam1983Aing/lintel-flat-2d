#!/bin/bash
# Usage: tools/check.sh <page-url> <out-dir> [seconds]
# One headless pass from the top to the bottom of a page with an on-screen
# counter for page errors and frame rate. Saves pass.mp4, a contact sheet of
# the whole pass (sheet.jpg) and the final frame (last.jpg), and prints the
# counter read back from the page.
URL="$1"; OUT="$2"; SECS="${3:-40}"
SIZE="${SIZE:-1440x900}"
mkdir -p "$OUT"
EVAL='(() => {
  window.__errs = 0; window.__errList = [];
  const note = (m) => { window.__errs++; window.__errList.push(String(m).slice(0, 160)); };
  addEventListener("error", (e) => note(e.message));
  addEventListener("unhandledrejection", (e) => note(e.reason));
  const ce = console.error; console.error = (...a) => { note(a.join(" ")); ce.apply(console, a); };
  const d = document.createElement("div");
  d.style.cssText = "position:fixed;left:8px;bottom:8px;max-width:96vw;z-index:99999;font:600 13px/1.3 monospace;background:rgba(0,0,0,.7);color:#7f7;padding:4px 7px;pointer-events:none";
  document.body.appendChild(d);
  let n = 0, t0 = performance.now(), fps = 0, lo = 999;
  (function tick(t) { n++; if (t - t0 > 1000) { fps = n * 1000 / (t - t0); lo = Math.min(lo, fps); n = 0; t0 = t; }
    d.textContent = "errors " + window.__errs + "  fps " + fps.toFixed(0) + "  low " + (lo === 999 ? "-" : lo.toFixed(0)) + "  sD " + (window.__rig ? window.__rig.sD.toFixed(0) : "-") + (window.__errList.length ? "  | " + window.__errList[0] : "") + (function () { try { const bad = window.__rig.ctx.renderer.info.programs.filter((p) => p.diagnostics && !p.diagnostics.runnable).length; return bad ? "  BAD SHADERS " + bad : ""; } catch (e) { return ""; } })();
    d.style.color = window.__errs || d.textContent.includes("BAD") ? "#f66" : "#7f7"; requestAnimationFrame(tick); })(performance.now());
})()'
node ~/.claude/skills/demo-options/scripts/record.mjs --url "$URL" --out "$OUT/pass.mp4" --size "$SIZE" \
  --wait "window.__rig && window.__rig.world && !document.getElementById('loader')" --settle 2000 --eval "$EVAL" \
  --scroll "0:0; 1:0; $((SECS-3)):100%; $SECS:100%" --seconds "$SECS" ${PHONE:+--phone} >/dev/null 2>&1
ffmpeg -v error -i "$OUT/pass.mp4" -vf "fps=16/$SECS,scale=480:-1,tile=4x4" -frames:v 1 -y "$OUT/sheet.jpg"
ffmpeg -v error -sseof -0.2 -i "$OUT/pass.mp4" -frames:v 1 -y "$OUT/last.jpg"
ls "$OUT"
