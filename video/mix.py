"""Final audio mix: narration + music (ducked under voice) + SFX -> -14 LUFS stereo.

usage: python3 mix.py <cues.json> <out.wav>
cues.json: {"total": seconds,
            "music": [{"file", "start", "gain", "fade_in", "fade_out", "end"?, "offset"?}],
            "sfx":   [{"file", "t", "gain", "pan"?, "rev"?}]}
"""
import json
import os
import subprocess
import sys

import numpy as np
from scipy.signal import fftconvolve, lfilter

ROOT = os.path.dirname(os.path.abspath(__file__))
SR = 48000


def load(path, ch=2):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', str(ch), '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, ch).copy()


def db(x):
    return 10 ** (x / 20)


def env_follow(x, attack, release):
    """Peak-ish envelope follower on a mono signal (per-sample one-pole)."""
    a_a = np.exp(-1 / (attack * SR))
    a_r = np.exp(-1 / (release * SR))
    # compute on 10 ms blocks for speed, then upsample
    blk = int(.01 * SR)
    n = len(x) // blk
    rms = np.sqrt(np.mean(x[:n * blk].reshape(n, blk) ** 2, axis=1) + 1e-12)
    out = np.zeros(n)
    e = 0.0
    aa, ar = a_a ** blk, a_r ** blk
    for i in range(n):
        v = rms[i]
        e = aa * e + (1 - aa) * v if v > e else ar * e + (1 - ar) * v
        out[i] = e
    return np.repeat(out, blk), blk


def reverb_ir(seconds=2.2, decay=3.0, seed=1):
    r = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = r.standard_normal((n, 2)) * np.exp(-decay * t)[:, None]
    # darken the tail
    b, a = [0.25], [1, -0.75]
    ir = lfilter(b, a, ir, axis=0)
    ir[: int(.012 * SR)] = 0
    return (ir / np.sqrt(np.sum(ir ** 2))).astype(np.float32)


def place(buf, x, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if i < 0:
        x = x[-i:]
        i = 0
    j = min(len(buf), i + len(x))
    if j <= i:
        return
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    g = np.array([l, r]) * np.sqrt(2) * gain
    buf[i:j] += x[: j - i] * g


def main():
    cues = json.load(open(sys.argv[1]))
    out = sys.argv[2]
    total = cues['total']
    N = int(total * SR) + SR
    voice = load(os.path.join(ROOT, 'audio/voice_track.wav'), 1)[:, 0]
    voice = np.pad(voice, (0, max(0, N - len(voice))))[:N]

    # gentle voice chain: high-pass 80 Hz, slight presence via mild compression
    b, a = [1, -1], [1, -0.9895]  # ~80 Hz one-pole high-pass
    voice = lfilter(b, a, voice).astype(np.float32)
    ve, blk = env_follow(voice, .005, .12)
    ve = np.pad(ve, (0, N - len(ve)), mode='edge')[:N]
    thr = db(-24)
    gr = np.where(ve > thr, (thr / np.maximum(ve, 1e-9)) ** (1 - 1 / 2.2), 1.0)
    voice = voice * gr.astype(np.float32) * db(4)

    music = np.zeros((N, 2), np.float32)
    for m in cues.get('music', []):
        x = load(os.path.join(ROOT, m['file']), 2)
        off = int(m.get('offset', 0) * SR)
        x = x[off:]
        if 'end' in m:
            x = x[: int((m['end'] - m['start']) * SR)]
        n = len(x)
        fi, fo = int(m.get('fade_in', 1) * SR), int(m.get('fade_out', 2) * SR)
        w = np.ones(n, np.float32)
        if fi:
            w[:fi] = np.linspace(0, 1, min(fi, n)) ** 2
        if fo:
            w[-fo:] *= np.linspace(1, 0, min(fo, n)) ** 2
        place(music, x * w[:, None], m['start'], db(m.get('gain', 0)) / np.sqrt(2))

    # sidechain ducking from the narration
    de, _ = env_follow(voice, .03, .45)
    de = np.pad(de, (0, N - len(de)), mode='edge')[:N]
    duck_amt = np.clip((20 * np.log10(de + 1e-9) + 50) / 22, 0, 1)  # 0 when silent, 1 when speaking
    duck = db(-10 * duck_amt).astype(np.float32)
    music *= duck[:, None]

    sfx = np.zeros((N, 2), np.float32)
    send = np.zeros((N, 2), np.float32)
    cache = {}
    for s in cues.get('sfx', []):
        f = s['file']
        if f not in cache:
            cache[f] = load(os.path.join(ROOT, f), 2)
        x = cache[f]
        if 'len' in s:
            x = x[: int(s['len'] * SR)].copy()
            fo = min(len(x), int(.08 * SR))
            x[-fo:] *= np.linspace(1, 0, fo)[:, None]
        place(sfx, x, s['t'], db(s.get('gain', 0)) / np.sqrt(2), s.get('pan', 0))
        if s.get('rev', 0):
            place(send, x, s['t'], db(s.get('gain', 0)) * s['rev'] / np.sqrt(2), s.get('pan', 0))
    if np.any(send):
        sfx += fftconvolve(send, reverb_ir(), axes=0)[:N].astype(np.float32)

    mix = voice[:, None] * np.array([1, 1], np.float32) + music + sfx
    # soft clip safety before loudness normalisation
    mix = np.tanh(mix * 0.9) / 0.9
    tmp = out + '.tmp.wav'
    pcm = (np.clip(mix, -1, 1) * 32767).astype('<i2').tobytes()
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-', tmp], input=pcm, check=True)
    # two-pass loudnorm to -14 LUFS / -1.5 dBTP
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', tmp, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True)
    js = r.stderr[r.stderr.rindex('{'):r.stderr.rindex('}') + 1]
    st = json.loads(js)
    af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={st['input_i']}:measured_TP={st['input_tp']}:"
          f"measured_LRA={st['input_lra']}:measured_thresh={st['input_thresh']}:offset={st['target_offset']}:linear=true")
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', tmp, '-af', af, '-ar', str(SR), out], check=True)
    os.remove(tmp)
    print('mixed ->', out, 'input LUFS', st['input_i'])


if __name__ == '__main__':
    main()
