"""Renders every cover and writes the production assets for the website and the Android app.

    python3 tools/covers/export.py

Writes public/covers/{cin,pix}/..., android drawables, and tools/covers/manifest.json.
"""
import os, sys, json
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
import cinematic, pixel
from lib import to_u8

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
WEB = os.path.join(ROOT, 'public', 'covers')
DRAW = os.path.join(ROOT, 'android-native', 'app', 'src', 'main', 'res', 'drawable-nodpi')
# The first few of each collection are free; the rest come with Plus.
FREE = {'cin': ['misty', 'peak', 'tide', 'pines'], 'pix': ['hills', 'voyage', 'cabin', 'village']}

def wire_id(kind, sid):
    return f'{kind}:{sid}' if sid in FREE[kind] else f'plus:{kind}-{sid}'

manifest = []
os.makedirs(os.path.join(WEB, 'cin', 't'), exist_ok=True)
os.makedirs(os.path.join(WEB, 'pix'), exist_ok=True)
os.makedirs(DRAW, exist_ok=True)
order = lambda scenes, kind: sorted(scenes, key=lambda s: (s[0] not in FREE[kind]))
for sid, name, fn, seed in order(cinematic.SCENES, 'cin'):
    im = Image.fromarray(to_u8(fn(np.random.default_rng(seed))))
    im.save(os.path.join(WEB, 'cin', sid + '.webp'), quality=80, method=6)
    im.resize((320, 180), Image.LANCZOS).save(os.path.join(WEB, 'cin', 't', sid + '.webp'), quality=78, method=6)
    im.resize((960, 540), Image.LANCZOS).save(os.path.join(DRAW, f'cover_cin_{sid}.webp'), quality=80, method=6)
    im.resize((320, 180), Image.LANCZOS).save(os.path.join(DRAW, f'cover_cin_{sid}_t.webp'), quality=78, method=6)
    manifest.append({'id': wire_id('cin', sid), 'kind': 'cin', 'file': sid, 'name': name})
    print('cin', sid)
for sid, name, fn, seed in order(pixel.SCENES, 'pix'):
    im = Image.fromarray(fn(np.random.default_rng(seed)))
    im.save(os.path.join(WEB, 'pix', sid + '.png'), optimize=True)
    im.save(os.path.join(DRAW, f'cover_pix_{sid}.png'), optimize=True)
    manifest.append({'id': wire_id('pix', sid), 'kind': 'pix', 'file': sid, 'name': name})
    print('pix', sid)
json.dump(manifest, open(os.path.join(os.path.dirname(__file__), 'manifest.json'), 'w'), indent=1)
