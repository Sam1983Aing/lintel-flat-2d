#!/bin/bash
# Usage: tools/shots.sh <page-url> <out-dir> <vh-units...>
# Records one headless pass that rests on each scroll position (in vh units)
# and saves a still from the end of every rest. 1440x900 unless SIZE is set.
URL="$1"; OUT="$2"; shift 2
SIZE="${SIZE:-1440x900}"; H="${SIZE#*x}"
mkdir -p "$OUT"
PLAN="0:0"; T=0; TIMES=()
for u in "$@"; do
  px=$(python3 -c "print(round($u*$H/100))")
  T=$(python3 -c "print($T+1.2)"); PLAN="$PLAN; $T:$px"
  T=$(python3 -c "print($T+2.6)"); PLAN="$PLAN; $T:$px"; TIMES+=("$T")
done
node ~/.claude/skills/demo-options/scripts/record.mjs --url "$URL" --out "$OUT/pass.mp4" --size "$SIZE" \
  --wait "window.__rig && window.__rig.world && !document.getElementById('loader')" --settle 2500 --scroll "$PLAN" --seconds "$(python3 -c "print($T+0.3)")" ${PHONE:+--phone} >/dev/null 2>&1
i=0
for t in "${TIMES[@]}"; do
  ffmpeg -v error -ss "$(python3 -c "print($t-0.15)")" -i "$OUT/pass.mp4" -frames:v 1 -y "$OUT/$(printf '%02d' $i)_$(echo "$@" | cut -d' ' -f$((i+1))).jpg"
  i=$((i+1))
done
ls "$OUT"
