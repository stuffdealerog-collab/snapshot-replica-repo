"""Estimated timing (chars/sec) so scenes can be laid out before the real voiceover exists."""
import json, re, os
ROOT = os.path.dirname(os.path.abspath(__file__))
s = json.load(open(os.path.join(ROOT, 'script/script.json')))
t = 0.0; out = {}
for ln in s['lines']:
    t += ln.get('gap', .45)
    txt = re.sub(r'\[[^\]]*\]', '', ln['text']).strip()
    words = txt.split()
    dur = len(txt) / 14.5
    ws = []; c = 0
    for w in words:
        a = t + c / len(txt) * dur; c += len(w) + 1
        ws.append({'w': w, 's': round(a, 3), 'e': round(t + min(c, len(txt)) / len(txt) * dur, 3)})
    out[ln['id']] = {'s': round(t, 3), 'e': round(t + dur, 3), 'ch': ln['chapter'], 'words': ws}
    t += dur
open(os.path.join(ROOT, 'engine/data/timing.js'), 'w').write('window.TIMING=' + json.dumps({'total': round(t + 6, 3), 'lines': out}, ensure_ascii=False) + ';\n')
print('fake total', round(t + 6, 1))
