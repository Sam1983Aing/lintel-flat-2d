#!/bin/zsh
# pops.sh <kept-dir> ...: per stretch, from the frames flicker.mjs keeps:
#   mean  the tool's own flicker score (mean |2f[i] - f[i-1] - f[i+1]|, 0 to 255)
#   rms   root mean square of the same thing: weighs a big jump more than several small ones, as the eye does
#   pops  pixels per million a frame that jump more than 48 levels against the mean of their neighbours in time
avg() { awk '{s+=$1;n++} END {if (n) printf "%.6f", s/n; else print 0}'; }
stat() { ffmpeg -v error -framerate 30 -i "$1/f%03d.png" -vf "format=gray,tmix=frames=3:weights='$2':scale=1$3,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-" -f null - | grep -o "YAVG=[0-9.]*" | cut -d= -f2 | tail -n +3 | avg; }
for d in "$@"; do
  echo "${d:t}"
  for seg in "$d"/seg*(n); do
    m=$(echo "$(stat $seg '-1 2 -1' '') + $(stat $seg '1 -2 1' '')" | bc -l)
    q=$(echo "sqrt(($(stat $seg '-1 2 -1' ",format=gray16le,lutyuv=y='val*val/65535'") + $(stat $seg '1 -2 1' ",format=gray16le,lutyuv=y='val*val/65535'")) / 1.0078)" | bc -l)
    p=$(echo "($(stat $seg '-1 2 -1' ",lutyuv=y='gt(val,96)*255'") + $(stat $seg '1 -2 1' ",lutyuv=y='gt(val,96)*255'")) / 255 * 1000000" | bc -l)
    printf "  %-10s mean %6.3f   rms %6.2f   pops %7.0f\n" "${seg:t}" $m $q $p
  done
done
