#!/bin/bash
# build part mp4 + 4-frame strip for each given part
cd "$(dirname "$0")/rec"
for p in "$@"; do
  (cd $p && ffmpeg -v error -y -f concat -safe 0 -i list.txt -vf "fps=30,format=yuv420p" -c:v libx264 -crf 16 -preset fast ../$p.mp4)
  d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $p.mp4)
  args=""; i=0
  for f in 0.12 0.37 0.62 0.93; do t=$(python3 -c "print($d*$f)"); ffmpeg -v error -y -ss $t -i $p.mp4 -frames:v 1 -vf scale=640:-1 _f$i.png; i=$((i+1)); done
  ffmpeg -v error -y -i _f0.png -i _f1.png -i _f2.png -i _f3.png -filter_complex "hstack=inputs=4" strip_$p.png
done
