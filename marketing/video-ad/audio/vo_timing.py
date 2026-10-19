"""Places each voiceover line on the timeline and estimates word start times for the captions.

    python vo_timing.py <vo_dir>     -> vo_timing.json (read by earphones.html and mix_earphones.py)
"""
import json, os, sys
import numpy as np
import soundfile as sf
from make_vo_lines import LINES

AT = [0.4, 4.75, 7.95, 10.95, 14.15, 17.55, 21.35, 23.9, 26.5, 31.3, 38.7]  # line start times (s)

def segments(a, sr):
    w = int(sr * 0.02); e = np.array([np.sqrt(np.mean(a[i:i + w] ** 2)) for i in range(0, len(a) - w, w)])
    on = np.where(e > 0.01)[0]; segs = []; s = on[0]; p = on[0]
    for i in on[1:]:
        if (i - p) * 0.02 >= 0.12: segs.append((s * 0.02, (p + 1) * 0.02)); s = i
        p = i
    segs.append((s * 0.02, (p + 1) * 0.02)); return segs

out = []
for i, (line, at) in enumerate(zip(LINES, AT)):
    a, sr = sf.read(os.path.join(sys.argv[1], f'{i:02d}.wav'))
    segs = segments(a, sr); words = line.split()
    # split words into phrases at punctuation; use them when they match the pauses found
    groups, cur = [], []
    for w in words:
        cur.append(w)
        if w[-1] in ',.' and len(groups) < len(segs) - 1: groups.append(cur); cur = []
    if cur: groups.append(cur)
    if len(groups) != len(segs): groups, segs = [words], [(segs[0][0], segs[-1][1])]
    times = []
    for g, (s0, s1) in zip(groups, segs):
        wt = np.array([len(w.strip(',.')) + 2 for w in g], float); st = np.concatenate([[0], np.cumsum(wt)[:-1]]) / wt.sum()
        times += [round(at + s0 + x * (s1 - s0), 3) for x in st]
    out.append({'at': at, 'end': round(at + segs[-1][1], 3), 'words': [[w, t] for w, t in zip(words, times)]})
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vo_timing.json'), 'w'), indent=1)
for o in out: print(o['at'], o['end'], ' '.join(f"{w}@{t}" for w, t in o['words']))
