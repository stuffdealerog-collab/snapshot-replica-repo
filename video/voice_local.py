"""Local narration: Piper TTS (ru_RU-denis, CC0 voice donor dataset) + Vosk ASR word alignment.

Fallback for when ElevenLabs credits are exhausted. For every script line:
  audio/voice/<id>.wav         processed narration clip (48 kHz mono)
  audio/voice/<id>.words.json  word timings aligned to the spoken (tts) text
  audio/voice/qc.json          per-line ASR word accuracy (intelligibility check)

usage: python3 voice_local.py <piper_model.onnx> <vosk_model_dir> [line_id ...]
"""
import difflib
import io
import json
import os
import re
import subprocess
import sys
import wave

import numpy as np
from piper import PiperVoice, SynthesisConfig
from vosk import KaldiRecognizer, Model, SetLogLevel

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'audio/voice')
SR = 48000
PAUSES = {'short pause': .45, 'pause': .8, 'long pause': 1.3}
# tts-text substitutions for the local engine (espeak phonemiser)
SUBS = [(r'Эёрш', 'Ёрш'), (r'ИИ-агенты', 'и-и агенты'), (r'\bИИ\b', 'и-и'), (r'НАСА', 'наса')]
VOICE_FILTER = ('highpass=f=70,equalizer=f=160:t=q:w=1:g=2.5,equalizer=f=3200:t=q:w=1.2:g=1.5,'
                'equalizer=f=7000:t=q:w=1:g=-2,acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120,'
                'aresample=48000')


def norm(w):
    return re.sub(r'[^0-9a-zа-яё-]', '', w.lower().replace('ё', 'е')).strip('-')


def synth(voice, text, cfg):
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wf:
        voice.synthesize_wav(text, wf, syn_config=cfg)
    buf.seek(0)
    with wave.open(buf, 'rb') as wf:
        sr = wf.getframerate()
        x = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    return x, sr


def process(x, sr):
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2').tobytes()
    out = subprocess.run(['ffmpeg', '-v', 'error', '-f', 's16le', '-ar', str(sr), '-ac', '1', '-i', '-', '-af', VOICE_FILTER,
                          '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], input=pcm, capture_output=True, check=True).stdout
    return np.frombuffer(out, dtype=np.float32)


def asr_words(model, x):
    """Vosk word timings on 16 kHz audio."""
    pcm16 = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-f', 's16le', '-ac', '1', '-ar', '16000', '-'],
                           input=x.astype(np.float32).tobytes(), capture_output=True, check=True).stdout
    rec = KaldiRecognizer(model, 16000)
    rec.SetWords(True)
    res = []
    for i in range(0, len(pcm16), 8000):
        if rec.AcceptWaveform(pcm16[i:i + 8000]):
            res += json.loads(rec.Result()).get('result', [])
    res += json.loads(rec.FinalResult()).get('result', [])
    return [(r['word'], r['start'], r['end']) for r in res]


def align(tokens, asr):
    """Map spoken tokens to ASR word times; interpolate the unmatched ones."""
    a = [norm(t) for t in tokens]
    b = [norm(w) for w, _, _ in asr]
    sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
    times = [None] * len(tokens)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            times[blk.a + k] = (asr[blk.b + k][1], asr[blk.b + k][2])
    # fuzzy pass for near-matches (e.g. inflection differences)
    for i, t in enumerate(times):
        if t is None:
            best, bj = 0, None
            for j, (w, s, e) in enumerate(asr):
                r = difflib.SequenceMatcher(a=a[i], b=norm(w)).ratio()
                if r > best:
                    best, bj = r, j
            if best > .72:
                # keep monotonic order
                prev = max([times[k][0] for k in range(i) if times[k]] or [-1])
                if asr[bj][1] >= prev:
                    times[i] = (asr[bj][1], asr[bj][2])
    # enforce monotonic order: keep the longest increasing run of anchors (LIS)
    idx = [i for i, t in enumerate(times) if t is not None]
    if idx:
        best = [1] * len(idx)
        prev = [-1] * len(idx)
        for q in range(len(idx)):
            for r in range(q):
                if times[idx[r]][0] <= times[idx[q]][0] + 1e-3 and best[r] + 1 > best[q]:
                    best[q], prev[q] = best[r] + 1, r
        q = max(range(len(idx)), key=lambda k: best[k])
        keep = set()
        while q != -1:
            keep.add(idx[q])
            q = prev[q]
        for i in idx:
            if i not in keep:
                times[i] = None
    matched = sum(t is not None for t in times)
    # interpolate gaps by character length
    n = len(tokens)
    i = 0
    while i < n:
        if times[i] is None:
            j = i
            while j < n and times[j] is None:
                j += 1
            t0 = times[i - 1][1] if i > 0 else 0.0
            t1 = times[j][0] if j < n else (asr[-1][2] if asr else t0 + .4 * (j - i))
            L = sum(len(tokens[k]) + 1 for k in range(i, j))
            c = 0
            for k in range(i, j):
                s = t0 + (t1 - t0) * c / L
                c += len(tokens[k]) + 1
                times[k] = (s, t0 + (t1 - t0) * c / L)
            i = j
        else:
            i += 1
    return times, matched / max(1, n)


def main():
    model_path, vosk_dir = sys.argv[1], sys.argv[2]
    realign = '--realign' in sys.argv
    only = set(a for a in sys.argv[3:] if not a.startswith('--'))
    SetLogLevel(-1)
    voice = PiperVoice.load(model_path)
    asr = Model(vosk_dir)
    cfg = SynthesisConfig(length_scale=1.07, noise_scale=0.6, noise_w_scale=0.75)
    os.makedirs(OUT, exist_ok=True)
    script = json.load(open(os.path.join(ROOT, 'script/script.json')))
    qc_path = os.path.join(OUT, 'qc.json')
    qc = json.load(open(qc_path)) if os.path.exists(qc_path) else {}
    takes = int(os.environ.get('TAKES', '1'))
    for ln in script['lines']:
        if only and ln['id'] not in only:
            continue
        best = None
        for take in range(takes if not realign else 1):
            res = do_line(ln, voice, asr, cfg, realign)
            if best is None or res[1] > best[1]:
                best = res
        x, acc, words, rec = best
        if not realign:
            pcm = (np.clip(x, -1, 1) * 32767).astype('<i2').tobytes()
            subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', os.path.join(OUT, ln['id'] + '.wav')], input=pcm, check=True)
        json.dump(words, open(os.path.join(OUT, ln['id'] + '.words.json'), 'w'), ensure_ascii=False)
        qc[ln['id']] = {'dur': round(len(x) / SR, 2), 'asr_match': round(acc, 3), 'asr': ' '.join(w for w, _, _ in rec)}
        print(f"{ln['id']}: {len(x) / SR:5.1f}s  asr-match {acc:.0%}")
    json.dump(qc, open(qc_path, 'w'), ensure_ascii=False, indent=1)


def do_line(ln, voice, asr, cfg, realign):
    if True:
        text = ln['tts']
        for a, b in SUBS:
            text = re.sub(a, b, text)
        # split on pause tags, drop other tags
        parts = re.split(r'\[(short pause|pause|long pause)\]', text)
        chunks, spoken = [], []
        for k, p in enumerate(parts):
            if k % 2 == 1:
                chunks.append(np.zeros(int(PAUSES[p] * SR), np.float32))
                continue
            p = re.sub(r'\[[^\]]*\]', '', p).strip()
            if not p:
                continue
            spoken.append(p)
            if not realign:
                x, sr = synth(voice, p, cfg)
                chunks.append(process(x, sr))
        if realign:
            vp = os.path.join(OUT, ln['id'] + '.wav')
            vp = vp if os.path.exists(vp) else vp[:-4] + '.flac'
            raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', vp, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
                                 capture_output=True, check=True).stdout
            x = np.frombuffer(raw, dtype=np.float32).copy()
        else:
            x = np.concatenate(chunks)
            # trim edges
            idx = np.where(np.abs(x) > 10 ** (-45 / 20))[0]
            x = x[max(0, idx[0] - int(.02 * SR)): idx[-1] + int(.12 * SR)]
            x = x / (np.max(np.abs(x)) + 1e-9) * 10 ** (-1.5 / 20)
        tokens = [t for t in ' '.join(spoken).split() if norm(t)]
        rec = asr_words(asr, x)
        times, acc = align(tokens, rec)
        words = [{'text': t, 'start': round(s, 3), 'end': round(e, 3), 'type': 'word'} for t, (s, e) in zip(tokens, times)]
        return x, acc, words, rec


if __name__ == '__main__':
    main()
