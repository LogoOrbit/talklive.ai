#!/usr/bin/env python3
"""Writes en.json from app/src/main/res/values/strings.xml (the source of truth).

    python3 tools/i18n/export.py
"""
import json, os, xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'app', 'src', 'main', 'res', 'values', 'strings.xml')

def unescape(s):
    s = s or ''
    if s.startswith('\\@') or s.startswith('\\?'):
        s = s[1:]
    return s.replace("\\'", "'").replace('\\"', '"').replace('\\n', '\n').replace('\\\\', '\\')

out = {}
for el in ET.parse(SRC).getroot():
    if el.get('translatable') == 'false':
        continue
    if el.tag == 'string':
        out[el.get('name')] = unescape(el.text)
    elif el.tag == 'plurals':
        for item in el:
            out[f"{el.get('name')}#{item.get('quantity')}"] = unescape(item.text)
with open(os.path.join(HERE, 'en.json'), 'w', encoding='utf-8') as f:
    f.write('{\n' + ',\n'.join(f'{json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)}' for k, v in out.items()) + '\n}\n')
print(len(out), 'strings')
