"""What moves on each art cover. Shared by the website (public/covers.js) and the
app (ArtCovers.kt); `python3 tools/covers/fx.py` prints both lists to paste in."""
import json, os
FX = {
    # cinematic: drift is a slow camera move over the painting
    'misty': 'drift fog:0.6 motes', 'peak': 'drift snow', 'tide': 'drift twinkle:0.5 glints:0.62:0.98:0.06:0.4',
    'pines': 'drift motes fog:0.86', 'nebula': 'drift twinkle:1 shoot', 'ringed': 'drift twinkle:1 shoot',
    'aurora': 'drift twinkle:0.55 shoot', 'dunes': 'drift dust', 'silk': 'drift2', 'prism': 'drift sparkle',
    'brutalist': 'drift dust', 'skyline': 'drift twinkle:0.45 traffic', 'rain': 'drift rain', 'alley': 'drift rain fog:0.6',
    'isles': 'drift motes', 'golden': 'drift glints:0.57:1:0.5:0.95', 'eclipse': 'drift twinkle:1 shoot',
    # pixel art: stepped at 8 frames a second on the 256x144 grid
    'voyage': 'glints:0.68:1:0:1', 'village': 'twinkle:0.5 shoot', 'hills': 'motes', 'cabin': 'snow',
    'metropolis': 'twinkle:0.45 traffic', 'synth': 'twinkle:0.4 shoot', 'fireflies': 'fireflies twinkle:0.3',
    'planetrise': 'twinkle:1 shoot', 'rainstreet': 'rain', 'arcade': 'sparkle', 'peaks': 'twinkle:0.6 shoot',
    'kingdom': 'twinkle:0.55 sparkle', 'oasis': 'glints:0.78:0.85:0.66:0.88 dust', 'temple': 'petals',
    'deepsea': 'bubbles', 'volcano': 'embers:0.727:0.32',
}
if __name__ == '__main__':
    m = json.load(open(os.path.join(os.path.dirname(__file__), 'manifest.json')))
    print('// JS')
    print('  var ART = [' + ', '.join("['%s', '%s', '%s', '%s']" % (c['id'], c['kind'], c['file'], c['name'].replace("'", "\\'")) for c in m) + '];')
    print('  var ART_FX = ' + json.dumps({c['file']: FX[c['file']] for c in m}) + ';')
    print('// KT')
    for c in m:
        print('    ArtCoverDef("%s", %s, "%s", "%s", R.drawable.cover_%s_%s%s),' % (c['id'], 'true' if c['kind'] == 'pix' else 'false', c['name'], FX[c['file']], c['kind'], c['file'], '' if c['kind'] == 'pix' else ', R.drawable.cover_%s_%s_t' % (c['kind'], c['file'])))
