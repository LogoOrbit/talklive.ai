# Speaks one line with edge-tts and writes <out>.mp3 plus <out>.mp3.json word timings
# ([start, end, word] in seconds).  Usage: python3 tts.py VOICE RATE "text" out.mp3
import asyncio, json, os, ssl, sys
import edge_tts
import edge_tts.communicate as comm

# Behind a TLS-inspecting proxy the bundled certifi store is not enough.
if os.environ.get('SSL_CERT_FILE'):
    comm._SSL_CTX = ssl.create_default_context(cafile=os.environ['SSL_CERT_FILE'])


async def main(voice, rate, text, out):
    c = edge_tts.Communicate(text, voice, rate=rate, boundary='WordBoundary')
    words = []
    with open(out, 'wb') as f:
        async for ch in c.stream():
            if ch['type'] == 'audio':
                f.write(ch['data'])
            elif ch['type'] == 'WordBoundary':
                words.append([ch['offset'] / 1e7, (ch['offset'] + ch['duration']) / 1e7, ch['text']])
    with open(out + '.json', 'w') as f:
        json.dump(words, f)


asyncio.run(main(*sys.argv[1:5]))
