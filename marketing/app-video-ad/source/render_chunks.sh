#!/bin/bash
cd "$(dirname "$0")"
for start in $(seq 0 150 1019); do
  end=$((start + 150))
  node render_ad.js frames $start $end >> render.log 2>&1 || { echo "chunk $start failed" >> render.log; exit 1; }
  echo "chunk $start-$end done $(ls frames | wc -l)" >> render.log
done
echo ALLDONE >> render.log
