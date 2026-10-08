"""Assemble the narration timeline.

Inputs
  script/script.json            ordered lines: {id, text, tts, gap, chapter}
  audio/voice/<id>.mp3          chosen take for each line
  audio/voice/<id>.words.json   Scribe word timings for that take
Outputs
  engine/data/timing.js         per-line absolute start/end + word times (for the renderer)
  audio/voice_track.wav         narration placed on the absolute timeline
  out/subtitles.srt             subtitles built from the word timings
"""
import json
import os
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
SR = 48000
LEAD_IN = 0.0  # seconds before the first line (scene 0 controls its own intro)
TAIL = 6.0     # seconds after the last line


def load_audio(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def trim_bounds(x, thresh_db=-50):
    """Leading/trailing silence trim, keeping a few ms of air."""
    thr = 10 ** (thresh_db / 20)
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0:
        return 0, len(x)
    a = max(0, idx[0] - int(.03 * SR))
    b = min(len(x), idx[-1] + int(.08 * SR))
    return a, b


def fmt_srt(t):
    h, rem = divmod(t, 3600)
    m, s = divmod(rem, 60)
    return f'{int(h):02d}:{int(m):02d}:{int(s):02d},{int(round((s - int(s)) * 1000)):03d}'


def main():
    script = json.load(open(os.path.join(ROOT, 'script/script.json')))
    lines = script['lines']
    t = LEAD_IN
    timing = {}
    clips = []
    for ln in lines:
        t += ln.get('gap', 0.45)
        vp = os.path.join(ROOT, 'audio/voice', ln['id'] + '.wav')
        x = load_audio(vp if os.path.exists(vp) else vp[:-4] + '.flac')
        a, b = trim_bounds(x)
        x = x[a:b]
        off = a / SR
        words = json.load(open(os.path.join(ROOT, 'audio/voice', ln['id'] + '.words.json')))
        ws = [{'w': w['text'], 's': round(t + w['start'] - off, 3), 'e': round(t + w['end'] - off, 3)}
              for w in words if w.get('type', 'word') == 'word']
        dur = len(x) / SR
        timing[ln['id']] = {'s': round(t, 3), 'e': round(t + dur, 3), 'ch': ln.get('chapter', ''), 'words': ws}
        clips.append((t, x))
        t += dur
    total = t + TAIL
    track = np.zeros(int(total * SR) + SR, dtype=np.float32)
    for st, x in clips:
        i = int(st * SR)
        track[i:i + len(x)] += x
    os.makedirs(os.path.join(ROOT, 'audio'), exist_ok=True)
    pcm = (np.clip(track, -1, 1) * 32767).astype('<i2').tobytes()
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-',
                    os.path.join(ROOT, 'audio/voice_track.wav')], input=pcm, check=True)
    with open(os.path.join(ROOT, 'engine/data/timing.js'), 'w') as f:
        f.write('window.TIMING=' + json.dumps({'total': round(total, 3), 'lines': timing}, ensure_ascii=False) + ';\n')

    # subtitles from the DISPLAY text (digits, quotes), timed by the spoken sentences
    import re
    def sentences(txt):
        txt = re.sub(r'\[[^\]]*\]', '', txt)
        return [x.strip() for x in re.split(r'(?<=[.!?…])\s+', txt) if x.strip()]
    def ntok(x):
        return len([w for w in x.split() if re.sub(r'[^0-9a-zа-яё]', '', w.lower())])
    os.makedirs(os.path.join(ROOT, 'out'), exist_ok=True)
    cues = []
    for ln in lines:
        tm = timing[ln['id']]
        ws = tm['words']
        ds, ts = sentences(ln['text']), sentences(ln['tts'])
        spans = []
        if len(ds) == len(ts) and ws:
            k = 0
            for sent in ts:
                n = ntok(sent)
                a, b = ws[min(k, len(ws) - 1)], ws[min(k + n - 1, len(ws) - 1)]
                spans.append((a['s'], b['e']))
                k += n
        else:
            L = sum(len(x) for x in ds); c = 0
            for x in ds:
                spans.append((tm['s'] + (tm['e'] - tm['s']) * c / L, tm['s'] + (tm['e'] - tm['s']) * (c + len(x)) / L)); c += len(x)
        for sent, (a, b) in zip(ds, spans):
            words = sent.split()
            nch = max(1, -(-len(sent) // 42))
            target = len(sent) / nch
            chunks = []; cur = []
            for w in words:
                if cur and len(chunks) < nch - 1 and len(' '.join(cur + [w])) > target + 4:
                    chunks.append(' '.join(cur)); cur = []
                cur.append(w)
            if cur:
                chunks.append(' '.join(cur))
            L = sum(len(c) for c in chunks); c0 = 0
            for ch in chunks:
                cues.append((a + (b - a) * c0 / L, a + (b - a) * (c0 + len(ch)) / L, ch)); c0 += len(ch)
    with open(os.path.join(ROOT, 'out/subtitles.srt'), 'w') as f:
        for i, (a, b, txt) in enumerate(cues, 1):
            if i < len(cues):
                b = min(b + .25, cues[i][0] - .02)
            f.write(f"{i}\n{fmt_srt(a)} --> {fmt_srt(b)}\n{txt}\n\n")
    print(f'total {total:.2f}s, {len(lines)} lines, {len(cues)} subtitle cues')


if __name__ == '__main__':
    main()
