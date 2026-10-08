"""Bundle point clouds into engine/data/assets.js"""
import glob, json, os
ROOT = os.path.dirname(os.path.abspath(__file__))
out = {}
for f in sorted(glob.glob(os.path.join(ROOT, 'dots', '*.json'))):
    d = json.load(open(f))
    out[os.path.basename(f)[:-5]] = {'w': d['w'], 'h': d['h'], 'p': d['p'], 't': d['t']}
with open(os.path.join(ROOT, '..', 'engine', 'data', 'assets.js'), 'w') as fh:
    fh.write('window.ASSETS=' + json.dumps(out, separators=(',', ':')) + ';\n')
print('bundled', list(out))
