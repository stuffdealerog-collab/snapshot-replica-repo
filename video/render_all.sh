#!/usr/bin/env bash
# Render the whole film in parallel segments and mux with the final mix.
#   ./render_all.sh [workers] [out.mp4]
set -euo pipefail
cd "$(dirname "$0")"
WORKERS=${1:-4}
OUT=${2:-out/naslednik.mp4}
SEG=out/segments
mkdir -p "$SEG" out
TOTAL=$(node -e "const s=require('fs').readFileSync('engine/data/timing.js','utf8');const t=JSON.parse(s.slice(s.indexOf('=')+1).trim().replace(/;$/,''));console.log(Math.ceil(t.total*30))")
CH=$(( (TOTAL + WORKERS - 1) / WORKERS ))
echo "frames: $TOTAL, workers: $WORKERS, chunk: $CH"
rm -f "$SEG"/*.mp4 "$SEG"/list.txt
for ((i=0; i<WORKERS; i++)); do
  A=$(( i * CH )); B=$(( (i + 1) * CH )); (( B > TOTAL )) && B=$TOTAL
  node engine/render.js video $A $B "$SEG/seg_$i.mp4" &
  echo "file 'seg_$i.mp4'" >> "$SEG/list.txt"
done
wait
ffmpeg -y -v error -f concat -safe 0 -i "$SEG/list.txt" -i audio/final_mix.wav \
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -ar 48000 -movflags +faststart -shortest "$OUT"
ffprobe -v error -show_entries format=duration,size,bit_rate -of default=nw=1 "$OUT"
