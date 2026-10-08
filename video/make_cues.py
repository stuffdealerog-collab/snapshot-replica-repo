"""Build music sections + mix cues from the narration timing and the scene SFX cues.

usage: python3 make_cues.py <scene_cues.json>
writes audio/sections.json (for music.py) and audio/mix_cues.json (for mix.py)
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
T = json.loads(open(os.path.join(ROOT, 'engine/data/timing.js')).read()[len('window.TIMING='):].rstrip().rstrip(';'))
L = T['lines']
total = T['total']
s = lambda k: L[k]['s']
e = lambda k: L[k]['e']

sections = [
    {'start': 0.0, 'end': e('c06') + .2, 'mood': 'open'},
    {'start': e('c06') + .2, 'end': s('n01') - 2.2, 'mood': 'veha'},
    {'start': s('n01') - 2.2, 'end': e('n06') + .45, 'mood': 'now'},
    {'start': e('n06') + .45, 'end': e('l06') + .55, 'mood': 'live'},
    {'start': e('l06') + .55, 'end': e('i04') + .55, 'mood': 'instead'},
    {'start': e('i04') + .55, 'end': s('f01') - 1.6, 'mood': 'mito'},
    {'start': s('f01') - 1.6, 'end': s('f03') - .4, 'mood': 'verdict'},
    {'start': s('f03') - .4, 'end': total, 'mood': 'outro'},
]
os.makedirs(os.path.join(ROOT, 'audio'), exist_ok=True)
json.dump({'total': total, 'sections': sections}, open(os.path.join(ROOT, 'audio/sections.json'), 'w'), indent=1)

FILES = {
    'stamp': ('audio/sfx_raw/stamp_a.mp3', 0, 1.2),
    'paper': ('audio/sfx_raw/paper_a.mp3', -4, None),
    'pencil': ('audio/sfx_raw/pencil_a.mp3', -2, None),
    'swarm': ('audio/sfx_raw/swarm_a.mp3', -2, None),
    'boom': ('audio/sfx_raw/boom_a.mp3', 0, None),
    'type': ('audio/sfx_raw/teletype_a.mp3', -6, .6),
    'tick': ('audio/sfx_raw/teletype_b.mp3', -8, .25),
}
REV = {'boom': .5, 'stamp': .15, 'swarm': .3, 'paper': .1}
scene = json.load(open(sys.argv[1]))
sfx = []
for c in scene['sfx']:
    f, base, ln = FILES[c['name']]
    d = {'file': f, 't': c['t'], 'gain': base + c.get('gain', 0) + 6, 'rev': REV.get(c['name'], 0)}
    if ln:
        d['len'] = ln
    sfx.append(d)
cues = {'total': total, 'music': [{'file': 'audio/music.wav', 'start': 0, 'gain': -4, 'fade_in': .5, 'fade_out': 3}], 'sfx': sfx}
json.dump(cues, open(os.path.join(ROOT, 'audio/mix_cues.json'), 'w'), indent=1)
print('sections', len(sections), 'sfx', len(sfx), 'total', total)
