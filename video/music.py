"""Procedural score: minimalist 'process music' rendered with additive/modal synthesis.

Each chapter gets a section; patterns grow note by note (additive process),
mirroring the film's idea of evolution as accumulation.

usage: python3 music.py <sections.json> <out.wav>
sections.json: {"total": s, "sections": [{"start": s, "end": s, "mood": "..."}]}
moods: open, veha, now, live, instead, mito, verdict, outro
"""
import json
import sys

import numpy as np
from scipy.signal import fftconvolve, lfilter, butter

SR = 48000
BPM = 92
BEAT = 60 / BPM
rng = np.random.default_rng(11)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


# ---------------- instruments ----------------
def env_exp(n, attack, decay):
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-t / decay)


def felt_piano(note, dur, vel=.6):
    f0 = midi(note)
    n = int((dur + 3.5) * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    B = 0.00035
    for k in range(1, 14):
        fk = f0 * k * np.sqrt(1 + B * k * k)
        if fk > 9000:
            break
        amp = (1 / k ** 1.25) * (0.55 + 0.45 * vel)
        dec = 2.8 / (1 + 0.35 * k) * (1.0 + (60 - min(note, 84)) / 60)
        out += amp * np.sin(2 * np.pi * fk * t + rng.random() * 6.28) * np.exp(-t / dec)
    att = np.clip(t / .006, 0, 1)
    out *= att
    # felt thump
    thump = rng.standard_normal(int(.03 * SR)) * np.exp(-np.arange(int(.03 * SR)) / (.006 * SR))
    b, a = butter(2, 900 / (SR / 2))
    out[: len(thump)] += lfilter(b, a, thump) * .15
    # release damper after dur
    rel = int(dur * SR)
    if rel < n:
        out[rel:] *= np.exp(-np.arange(n - rel) / (.35 * SR))
    b, a = butter(2, min(0.99, (2500 + 3000 * vel) / (SR / 2)))
    return lfilter(b, a, out) * vel * .5


def marimba(note, vel=.5):
    f0 = midi(note)
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    out = (np.sin(2 * np.pi * f0 * t) * np.exp(-t / .55)
           + .35 * np.sin(2 * np.pi * f0 * 3.93 * t) * np.exp(-t / .12)
           + .12 * np.sin(2 * np.pi * f0 * 9.2 * t) * np.exp(-t / .04))
    out *= np.clip(t / .002, 0, 1)
    return out * vel * .4


def pad(notes, dur, bright=.5, attack=2.5, release=3.0):
    n = int((dur + release) * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for note in notes:
        f0 = midi(note)
        for det in (-.07, 0, .06):
            f = f0 * 2 ** (det / 12)
            ph = rng.random() * 6.28
            for k in range(1, 9):
                if f * k > 7000:
                    break
                amp = 1 / k * (bright ** (k - 1) if k > 1 else 1)
                out += amp * np.sin(2 * np.pi * f * k * t + ph * k) * (1 + .15 * np.sin(2 * np.pi * (.11 + .03 * k) * t + k))
    e = np.clip(t / attack, 0, 1) ** 2
    rs = int(dur * SR)
    e[rs:] *= np.exp(-(t[rs:] - dur) / (release / 3))
    return out * e * .03 / max(1, len(notes) ** .5)


def sub(note, dur, vel=.7):
    f0 = midi(note)
    n = int((dur + .6) * SR)
    t = np.arange(n) / SR
    e = np.clip(t / .02, 0, 1) * np.exp(-t / (dur * .7 + .05))
    return np.sin(2 * np.pi * f0 * t) * e * vel * .35


def tick(vel=.3, bright=6000):
    n = int(.05 * SR)
    x = rng.standard_normal(n) * np.exp(-np.arange(n) / (.004 * SR))
    b, a = butter(2, bright / (SR / 2), 'high')
    return lfilter(b, a, x) * vel * .15


def heartbeat(vel=.8):
    n = int(.6 * SR)
    t = np.arange(n) / SR
    s = lambda t0, f, d: np.where(t >= t0, np.sin(2 * np.pi * f * (t - t0)) * np.exp(-(t - t0) / d), 0)
    return (s(0, 52, .09) + .7 * s(.22, 46, .11)) * vel * .5


# ---------------- arrangement ----------------
# harmony: D dorian-ish world. chords as midi lists
CH = {
    'Dm9': [50, 57, 60, 64, 65],
    'Bbmaj7': [46, 53, 57, 60, 62],
    'Fadd9': [41, 53, 55, 57, 60],
    'Csus': [48, 55, 60, 62, 67],
    'Gm9': [43, 53, 57, 58, 62],
    'Am7': [45, 52, 55, 60, 64],
    'Ebmaj7#11': [39, 51, 55, 58, 62, 69],
    'Dmaj9': [50, 57, 61, 64, 66],
}
PROG = {
    'open': ['Dm9', 'Dm9', 'Bbmaj7', 'Bbmaj7'],
    'veha': ['Dm9', 'Bbmaj7', 'Fadd9', 'Csus'],
    'now': ['Gm9', 'Dm9', 'Bbmaj7', 'Am7'],
    'live': ['Bbmaj7', 'Fadd9', 'Gm9', 'Dm9'],
    'instead': ['Dm9', 'Ebmaj7#11', 'Dm9', 'Ebmaj7#11'],
    'mito': ['Bbmaj7', 'Fadd9', 'Csus', 'Dm9'],
    'verdict': ['Bbmaj7', 'Csus', 'Dm9', 'Fadd9'],
    'outro': ['Bbmaj7', 'Fadd9', 'Csus', 'Dmaj9'],
}
# 12-step ostinato cells (scale degrees in D dorian, relative midi)
CELL = [74, 69, 72, 69, 76, 69, 72, 77, 69, 74, 72, 69]


def add(buf, x, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(x))
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i:j, 0] += x[: j - i] * gain * l * 1.414
    buf[i:j, 1] += x[: j - i] * gain * r * 1.414


def render_section(buf, s, e, mood, nxt=None):
    dur = e - s
    bar = BEAT * 4
    prog = PROG[mood]
    nbars = max(1, int(np.ceil(dur / bar)))
    eighth = BEAT / 2
    for b in range(nbars):
        t0 = s + b * bar
        if t0 >= e:
            break
        chord = CH[prog[b % len(prog)]]
        grow = min(1.0, (b + 1) / max(4, nbars * .7))  # additive process across the section
        left = e - t0
        # pad bed
        if mood not in ('now',) or b % 2 == 0:
            pd = min(bar * (2 if mood != 'now' else 2), left + 1.5)
            add(buf, pad(chord[1:], pd, bright=.45 if mood in ('instead', 'open') else .55), t0, {'open': .9, 'instead': 1.1}.get(mood, .8), 0)
        # bass
        if mood in ('veha', 'now', 'mito', 'verdict', 'outro', 'instead'):
            add(buf, sub(chord[0] - 12 if chord[0] > 45 else chord[0], bar * .9, .6 if mood != 'instead' else .8), t0, .9)
        # piano motif
        if mood in ('open', 'live', 'verdict', 'outro', 'mito'):
            for k, step in enumerate([0, 3, 5] if mood != 'open' else [0, 6]):
                note = chord[2 + (k + b) % (len(chord) - 2)] + 12
                if mood == 'open' and k == 1:
                    note -= 5
                add(buf, felt_piano(note, BEAT * 2, .45 + .2 * (k == 0)), t0 + step * eighth, .9, -.2 + .2 * k)
        # mallet ostinato: grows note by note
        if mood in ('veha', 'now', 'mito', 'verdict'):
            n_active = int(round(grow * 12))
            active = set(rng.permutation(12)[:n_active].tolist()) if mood != 'now' else set(range(n_active))
            shift = 0 if mood != 'mito' else (b // 2) % 12  # phasing shift
            for k in range(8 if mood != 'now' else 12):
                idx = (k + shift + b * (8 if mood != 'now' else 12)) % 12
                if idx not in active:
                    continue
                tt = t0 + k * (eighth if mood != 'now' else BEAT / 3)
                if tt >= e - .05:
                    continue
                note = CELL[idx] - (12 if mood == 'now' else 0) + (chord[0] - 50 if abs(chord[0] - 50) <= 5 else 0)
                add(buf, marimba(note, .35 + .15 * (k % 4 == 0)), tt, .55, .35 * np.sin(idx))
        # machine ticks in 'now' and 'instead'
        if mood == 'now':
            for k in range(16):
                tt = t0 + k * BEAT / 4
                if tt < e:
                    add(buf, tick((.35 if k % 4 == 0 else .15) * (.7 + .6 * rng.random()), 5000 + 3000 * rng.random()), tt, .5, .6 * np.sin(k * 1.7))
        if mood == 'instead' and b % 2 == 0:
            # low, slow pulse instead of a heartbeat cliche
            for k in (0, 3):
                tt = t0 + k * BEAT
                if tt < e:
                    add(buf, sub(chord[0] - 12 if chord[0] > 45 else chord[0], BEAT * 1.5, .5), tt, .8)


def reverb(x, seconds=3.0, decay=2.2, mix=.32):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = rng.standard_normal((n, 2)) * np.exp(-decay * t)[:, None]
    b, a = butter(1, 3500 / (SR / 2))
    ir = lfilter(b, a, ir, axis=0)
    ir[: int(.02 * SR)] = 0
    ir /= np.sqrt(np.sum(ir ** 2) / 2)
    wet = fftconvolve(x, ir, axes=0)[: len(x)]
    return x * (1 - mix) + wet * mix


def main():
    cfg = json.load(open(sys.argv[1]))
    total = cfg['total']
    buf = np.zeros((int((total + 4) * SR), 2))
    secs = cfg['sections']
    for i, sc in enumerate(secs):
        render_section(buf, sc['start'], sc['end'], sc['mood'])
    buf = reverb(buf)
    # gentle tape-ish saturation and normalise to -18 dBFS RMS-ish
    buf = np.tanh(buf * 1.2) / 1.2
    rms = np.sqrt(np.mean(buf ** 2)) + 1e-9
    buf *= (10 ** (-20 / 20)) / rms
    buf = np.clip(buf, -.98, .98)[: int(total * SR)]
    # fade out end
    fo = int(4 * SR)
    buf[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 2
    import subprocess
    pcm = (buf * 32767).astype('<i2').tobytes()
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-', sys.argv[2]], input=pcm, check=True)
    print('music ->', sys.argv[2], f'{total:.1f}s')


if __name__ == '__main__':
    main()
