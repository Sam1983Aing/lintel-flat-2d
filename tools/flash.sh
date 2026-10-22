#!/bin/zsh
# flash.sh <kept-dir> ...: does anything exist for one frame only?
# Takes the frames tools/flicker.mjs keeps. For every frame it counts the dark pixels that have nothing dark within
# R pixels of them in the frame before or in the frame after. A line that flashes for one frame is a few hundred such
# pixels at once. Prints, per stretch, the worst frame, where its marks are (device pixels of the kept crop), and how
# many frames have more than 100.
#
# R=<pixels> (default 3) is how near "near" is.
#   R=3 with a small step (0.004 vh or less, so nothing travels a pixel between two frames) finds things that live for
#   less than one step: a face that slips past the cut at exactly one camera position.
#   R=20 with a real scroll step (0.8 vh a frame, lines travel up to 20 pixels between frames) finds pieces of line
#   that are on screen for one frame only at the speed people scroll. The small step cannot see those: a piece that
#   lives for a twentieth of a vh passes it.
# MASK=<dir> also writes the worst frame of each stretch with its lonely pixels marked in black, to look at.
#
# (The count is made on the raw pixels. An earlier version read it from ffmpeg's signalstats and now and then got a
# round 100,000 or 200,000 for a frame with two marked pixels.)
R=${R:-3}
ER=$(printf 'erosion,%.0s' {1..$R}); ER=${ER%,}
for d in "$@"; do
  echo "${d:t}"
  for seg in "$d"/seg*(n); do
    f1=$(ls "$seg" | head -1); w=$(ffprobe -v error -show_entries stream=width -of csv=p=0 "$seg/$f1"); h=$(ffprobe -v error -show_entries stream=height -of csv=p=0 "$seg/$f1")
    FC="format=gray,split=3[p][c][n];[p]tpad=start_mode=clone:start=1,${ER}[pe];[n]trim=start_frame=1,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop=1,${ER}[ne];[pe][ne]blend=all_mode=darken[m];[c][m]blend=all_expr='if(lt(A,110)*gt(B,170),255,0)'"
    out=$(ffmpeg -v error -framerate 30 -i "$seg/f%03d.png" -filter_complex "[0]$FC" -f rawvideo -pix_fmt gray - 2>/dev/null | python3 -c "
import sys
W, H, seg = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
n = W * H; k = 0; worst = (0, 0, None); over = 0; zero = bytes(W)
while True:
    fr = sys.stdin.buffer.read(n)
    if len(fr) < n: break
    c = n - fr.count(0)
    if c > 100: over += 1
    if c > worst[0]:
        ys = [y for y in range(H) if fr[y * W:(y + 1) * W] != zero]
        xs = [i for y in ys for i in (fr[y * W:(y + 1) * W].find(255), fr[y * W:(y + 1) * W].rfind(255))]
        worst = (c, k, (min(xs), max(xs), ys[0], ys[-1]))
    k += 1
box = '' if not worst[2] else '   in x %d to %d, y %d to %d' % worst[2]
print('  %-16s frames %4d   worst frame %4d with %6d pixels%s   frames over 100: %d' % (seg, k, worst[1], worst[0], box, over))
" $w $h "${seg:t}")
    echo "$out"
    if [ -n "$MASK" ]; then
      wf=$(echo "$out" | sed -E 's/.*worst frame +([0-9]+).*/\1/'); mkdir -p "$MASK"
      ffmpeg -v error -y -framerate 30 -i "$seg/f%03d.png" -filter_complex "[0]split[o][x];[x]$FC,dilation,dilation,dilation,dilation[k];[o]format=gray[og];[og][k]blend=all_expr='if(gt(B,128),0,128+A/2)',select='eq(n,$wf)'" -frames:v 1 -update 1 "$MASK/${d:t}-${seg:t}-f$wf.png" 2>/dev/null
    fi
  done
done
