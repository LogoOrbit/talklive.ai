# Wrap each rendered app area (412x857 dp @4x) into a full 412x915 dp phone screen:
# status bar (36 dp) and gesture bar (22 dp) continue the app's own edge colours.
import sys, os, glob
import numpy as np
from PIL import Image
SRC, DST, BARS = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(DST, exist_ok=True)
TOP, BOT = 144, 88
bars = {t: Image.open(os.path.join(BARS, f'sysbars-{t}.png')).convert('RGBA') for t in ('dark', 'light')}
for f in sorted(glob.glob(os.path.join(SRC, '*.png'))):
    name = os.path.basename(f)
    theme = 'dark' if name.endswith('-dark.png') else 'light'
    a = np.asarray(Image.open(f).convert('RGB')).astype(np.float32)
    h, w, _ = a.shape
    out = np.zeros((h + TOP + BOT, w, 3), np.float32)
    out[TOP:TOP + h] = a
    # Top: continue a vertical gradient (linear extrapolation from the first rows), flat if flat.
    def clean(row):
        # Keep smooth gradients; replace pixels that belong to text or icons
        # touching the edge with the row's typical colour (no streaks).
        med = np.median(row, axis=0)
        far = np.abs(row - med).sum(axis=1) > 36
        row = row.copy(); row[far] = med
        return row
    r0, r1 = clean(a[0]), clean(a[16])
    slope = (r0 - r1) / 16.0
    for y in range(TOP):
        out[y] = np.clip(r0 + slope * (TOP - y), 0, 255)
    out[TOP + h:] = clean(a[-1])
    img = Image.fromarray(out.round().astype(np.uint8)).convert('RGBA')
    img.alpha_composite(bars[theme])
    img.convert('RGB').save(os.path.join(DST, name))
    print(name, img.size)
