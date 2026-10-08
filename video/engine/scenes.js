'use strict';
// «НАСЛЕДНИКИ» — scene definitions. All times are absolute seconds, derived
// from the narration timing (TIMING) so the picture follows the voice.
const { W, H, FPS, C, clamp, lerp, prog, E, ep, env, rng, hash, Noise, makeCanvas, buildPaper, buildGrain, text, measure, riseWords,
  typewriter, drawPath, circlePts, linePts, arrow, highlight, stamp, splat, RGB, cam, caption, source, TAU, setFrame, getFrame } = ENGINE;
const cv = document.getElementById('c'), g = cv.getContext('2d');
let PAPER, GRAIN;
const SCENES = [];
const SFX = [];          // sound cues collected for the mixer: {t, name, gain}
const S = (name, a, b, draw) => SCENES.push({ name, a, b, draw });
const cue = (t, name, gain = 0, extra = {}) => SFX.push({ t: +t.toFixed(3), name, gain, ...extra });

// ---------------- timing helpers ----------------
const TL = TIMING.lines;
const Ls = id => TL[id].s, Le = id => TL[id].e;
const norm = s => s.toLowerCase().replace(/[«»"“”„.,:;!?()—–\-…]/g, '').replace(/ё/g, 'е');
// start time of the n-th word in line `id` that contains `key`
function Wt(id, key, n = 0, end = false) {
  const ws = TL[id].words, k = norm(key);
  let c = 0;
  for (const w of ws) if (norm(w.w).includes(k)) { if (c === n) return end ? w.e : w.s; c++; }
  console.warn('word not found', id, key); return end ? TL[id].e : TL[id].s;
}
const total = TIMING.total;

// ---------------- dot clouds ----------------
const P = {};
function cloud(name) { return P[name]; }
const XY = new Float32Array(30000), AL = new Float32Array(15000);
// draw a cloud with transform, reveal and breathing
function drawCloud(g, A, o = {}) {
  const n = A.p.length / 2, x0 = o.x || W / 2, y0 = o.y || H / 2, sc = o.scale || 1;
  const rev = o.reveal === undefined ? 1 : o.reveal, fade = o.alpha === undefined ? 1 : o.alpha;
  const b = Math.floor(getFrame() / 3), jit = o.jit === undefined ? .55 : o.jit, step = o.step || 1;
  let m = 0;
  for (let i = 0; i < n; i += step) {
    const px = A.p[2 * i], py = A.p[2 * i + 1];
    let a = fade;
    if (rev < 1) {
      const f = clamp((Math.hypot(px, py) / 560) * .75 + hash(i) * .25);
      a *= clamp((rev * 1.25 - f) / .25);
    }
    if (a <= 0.01) continue;
    const h1 = hash(i * 1.37 + b * 7.1), h2 = hash(i * 2.11 + b * 3.3);
    XY[2 * m] = x0 + px * sc + (h1 - .5) * jit * 2;
    XY[2 * m + 1] = y0 + py * sc + (h2 - .5) * jit * 2;
    AL[m] = a; m++;
  }
  splat(g, XY, m, { r: o.r || 1.45, color: o.color || RGB.ink, al: AL });
}
// morph A -> B with diagonal-sweep stagger and swirl
function drawMorph(g, A, B, p, oa = {}, ob = {}, o = {}) {
  if (p <= 0) return drawCloud(g, A, { ...oa, step: o.step, color: o.color, r: o.r });
  if (p >= 1) return drawCloud(g, B, { ...ob, step: o.step, color: o.color, r: o.r });
  const n = Math.min(A.p.length, B.p.length) / 2, st = o.stagger === undefined ? .45 : o.stagger;
  const ax = oa.x || W / 2, ay = oa.y || H / 2, as = oa.scale || 1, bx = ob.x || W / 2, by = ob.y || H / 2, bs = ob.scale || 1;
  const swirl = o.swirl === undefined ? 80 : o.swirl, step = o.step || 1;
  let m = 0;
  for (let i = 0; i < n; i += step) {
    const qx = B.p[2 * i], qy = B.p[2 * i + 1];
    const d = clamp((qx + qy) / 1500 + .5 + Noise.n2(qx * .004, qy * .004) * .12) * st;
    const q = E.ioC(clamp((p - d) / (1 - st)));
    const sx = ax + A.p[2 * i] * as, sy = ay + A.p[2 * i + 1] * as, ex = bx + qx * bs, ey = by + qy * bs;
    let x = lerp(sx, ex, q), y = lerp(sy, ey, q);
    const k = Math.sin(q * Math.PI);
    if (k > .001) { const h = (i * .6180339) % 1; x += Math.cos(h * TAU + q * 3) * swirl * k; y += Math.sin(h * TAU + q * 3) * swirl * k; }
    XY[2 * m] = x; XY[2 * m + 1] = y; m++;
  }
  splat(g, XY, m, { r: o.r || 1.45, color: o.color || RGB.ink, alpha: o.alpha === undefined ? 1 : o.alpha });
}
// keyframed cloud track: [{t, shape, x, y, scale, hold?}] ; morph between consecutive keys over `dur`
function cloudTrack(g, t, keys, o = {}) {
  let k = 0;
  while (k < keys.length - 1 && t >= keys[k + 1].t) k++;
  const K = keys[k], N = keys[k + 1];
  const dur = (N && N.dur) || 1.6;
  if (N && t > N.t - dur) {
    const p = prog(t, N.t - dur, N.t);
    drawMorph(g, cloud(K.shape), cloud(N.shape), p, K, N, o);
  } else {
    const hold = Math.max(0, t - K.t);
    drawCloud(g, cloud(K.shape), { ...K, ...o, scale: K.scale * (1 + Math.min(.06, hold * .009)), reveal: K.reveal ? K.reveal(t) : 1 });
  }
}
// scatter cloud outwards (exit)
function drawScatter(g, A, p, o = {}) {
  const n = A.p.length / 2, x0 = o.x || W / 2, y0 = o.y || H / 2, sc = o.scale || 1;
  const q = E.inC(clamp(p));
  for (let i = 0; i < n; i++) {
    const h = hash(i * 3.7) * TAU, s = 200 + hash(i * 1.9) * 700;
    XY[2 * i] = x0 + A.p[2 * i] * sc + Math.cos(h) * s * q;
    XY[2 * i + 1] = y0 + A.p[2 * i + 1] * sc + Math.sin(h) * s * q - 120 * q;
    AL[i] = 1 - q;
  }
  splat(g, XY, n, { r: o.r || 1.45, color: o.color || RGB.ink, al: AL });
}

// ---------------- archival UI primitives ----------------
function softShadow(g, x, y, w, h, a = .18, blur = 30, dy = 12) {
  g.save(); g.shadowColor = `rgba(40,30,15,${a})`; g.shadowBlur = blur; g.shadowOffsetY = dy;
  g.fillStyle = C.bone; g.fillRect(x, y, w, h); g.restore();
}
// index card with ruled lines; rot in radians around its centre
function card(g, x, y, w, h, o = {}) {
  g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(o.rot || 0); g.translate(-w / 2, -h / 2);
  softShadow(g, 0, 0, w, h, o.shadow === undefined ? .2 : o.shadow);
  g.fillStyle = o.fill || C.bone; g.fillRect(0, 0, w, h);
  if (o.ruled !== false) {
    g.strokeStyle = 'rgba(35,65,217,0.13)'; g.lineWidth = 1.2;
    for (let yy = o.rule0 || 120; yy < h - 20; yy += o.ruleStep || 56) { g.beginPath(); g.moveTo(24, yy); g.lineTo(w - 24, yy); g.stroke(); }
    g.strokeStyle = 'rgba(212,56,28,0.35)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(24, (o.rule0 || 120) - 30); g.lineTo(w - 24, (o.rule0 || 120) - 30); g.stroke();
  }
  if (o.draw) o.draw(g, w, h);
  g.restore();
}
// big chapter title card
function chapterCard(g, t, a, b, num, word, sub) {
  const e = env(t, a, b, .5, .6);
  if (e <= 0) return;
  g.save(); g.globalAlpha = e;
  text(g, num, W / 2, 400, { font: 'Spectral', size: 64, weight: 300, style: 'italic', align: 'center', color: C.red });
  riseWords(g, [word], W / 2, 590, t, [a + .25], { font: 'Unbounded', size: 190, weight: 800, ls: 18, align: 'center' });
  const lw = 520 * ep(t, a + .5, a + 1.4, E.ioC);
  drawPath(g, [[W / 2 - lw / 2, 650], [W / 2 + lw / 2, 650]], 1, { lw: 2, color: C.ink });
  if (sub) text(g, sub, W / 2, 712, { font: 'JetBrains Mono', size: 22, ls: 4, align: 'center', color: C.inkSoft, alpha: ep(t, a + .9, a + 1.6) });
  g.restore();
}
// typographic statement block (multi-line, rising words, auto times between t0..t1 or from word timings)
function statement(g, t, lines, x, y, o = {}) {
  const lh = o.lh || (o.size || 64) * 1.18;
  lines.forEach((ln, i) => {
    const words = ln.words, times = ln.times;
    riseWords(g, words, x, y + i * lh, t, times, { font: o.font || 'Spectral', size: o.size || 64, weight: o.weight || 300, style: o.style || 'normal', align: o.align || 'left', color: o.color || C.ink, colors: ln.colors, ls: o.ls || 0, alpha: o.alpha });
  });
}
// words of a phrase timed to narration words from line id
function wordsAt(id, phrase, startKey, n = 0, o = {}) {
  const words = phrase.split(' ');
  // map each display word onto the narration word with the same normalised start
  const ws = TL[id].words; let j = 0;
  const k0 = startKey ? norm(startKey) : null; let started = !k0, cnt = 0;
  const times = [];
  for (const w of words) {
    const nw = norm(w);
    let found = null;
    for (let q = j; q < ws.length; q++) {
      if (!started) { if (norm(ws[q].w).includes(k0)) { if (cnt === n) started = true; else { cnt++; continue; } } else continue; }
      if (nw && norm(ws[q].w).startsWith(nw.slice(0, Math.max(3, Math.min(5, nw.length))))) { found = ws[q]; j = q + 1; break; }
    }
    times.push(found ? found.s - (o.lead || .05) : (times.length ? times[times.length - 1] + .18 : Ls(id)));
  }
  return { words, times };
}
// machine margin note (blue mono typewriter) with leader line
function machineNote(g, t, t0, s, x, y, o = {}) {
  if (t < t0) return;
  const dur = o.dur || Math.max(.6, s.length * .035);
  const a = o.until ? 1 - prog(t, o.until, o.until + .4) : 1;
  if (a <= 0) return;
  g.save(); g.globalAlpha *= a;
  text(g, '//', x - 34, y, { font: 'JetBrains Mono', size: o.size || 24, color: C.blue, alpha: .6 });
  typewriter(g, s, x, y, prog(t, t0, t0 + dur), { color: C.blue, size: o.size || 24, cursorAlways: false });
  g.restore();
}
// source line (bottom-left), with fade
function src(g, t, a, b, s) { const e = env(t, a, b, .5, .4); if (e > 0) source(g, s, e * .9); }
// epistemic stamp sitting until scene end
function stampAt(g, t, t0, t1, label, x, y, o = {}) {
  if (t < t0 || t > t1 + .4) return;
  g.save(); g.globalAlpha *= 1 - prog(t, t1, t1 + .4);
  stamp(g, label, x, y, t - t0, o); g.restore();
}
const STAMP_COL = { 'ФАКТ': C.ink, 'ДАННЫЕ': C.ink, 'РАСЧЁТ': C.blue, 'ИНТЕРПРЕТАЦИЯ': C.blue, 'ГИПОТЕЗА': C.red, 'СЦЕНАРИЙ': C.red, 'ПОЗИЦИЯ': C.red, 'НЕИЗВЕСТНО': C.inkSoft, 'ПРОГНОЗ': C.red };
function estamp(g, t, t0, t1, label, x, y, o = {}) {
  stampAt(g, t, t0, t1, label, x, y, { color: STAMP_COL[label] || C.ink, ...o });
  if (o.cue !== false && !estamp.done[label + t0]) { estamp.done[label + t0] = 1; cue(t0, 'stamp', -4); }
}
estamp.done = {};
// counter
function counter(g, t, t0, t1, v0, v1, fmt, x, y, o = {}) {
  const v = lerp(v0, v1, E.outE(prog(t, t0, t1)));
  text(g, fmt(v), x, y, { font: 'Unbounded', size: 120, weight: 800, ...o });
}
const fmtInt = v => Math.round(v).toLocaleString('ru-RU').replace(/,/g, ' ');

// ---------------- persistent chrome ----------------
const CHAPTERS = [
  { key: 'veha', n: 'I', w: 'ВЕХА', a: () => Le('c06') + 2.9, b: () => Le('n06') + .45 },
  { key: 'live', n: 'II', w: 'ЖИТЬ', a: () => Le('n06') + .45, b: () => Le('l06') + .55 },
  { key: 'instead', n: 'III', w: 'ВМЕСТО', a: () => Le('l06') + .55, b: () => Ls('f01') - 1.6 },
  { key: 'verdict', n: '§', w: 'ВЕРДИКТ', a: () => Ls('f01') - 1.6, b: () => total },
];
function chrome(g, t) {
  const on = env(t, Ls('v01') - .3, total - 3, 1, 1.5);
  if (on <= 0) return;
  g.save(); g.globalAlpha = on;
  // case header
  text(g, 'ДЕЛО № 1 · НАСЛЕДНИКИ', 96, 78, { font: 'JetBrains Mono', size: 17, ls: 3, color: C.inkSoft });
  // chapter tabs
  let x = W - 96;
  for (let i = CHAPTERS.length - 1; i >= 0; i--) {
    const c = CHAPTERS[i], act = t >= c.a() && t < c.b(), done = t >= c.b();
    const label = c.n + ' ' + c.w;
    const w = measure(g, label, { font: 'JetBrains Mono', size: 17, ls: 2 }) + 28;
    x -= w;
    if (act) { g.fillStyle = C.ink; g.fillRect(x, 54, w, 34); }
    else { g.strokeStyle = 'rgba(22,19,15,0.35)'; g.lineWidth = 1; g.strokeRect(x + .5, 54.5, w - 1, 33); }
    text(g, label, x + 14, 77, { font: 'JetBrains Mono', size: 17, ls: 2, color: act ? C.paper : (done ? C.inkSoft : C.ink), alpha: act ? 1 : .8 });
    x -= 10;
  }
  // thin frame rules
  g.strokeStyle = 'rgba(22,19,15,0.22)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(96, 108); g.lineTo(W - 96, 108); g.stroke();
  g.beginPath(); g.moveTo(96, H - 86); g.lineTo(W - 96, H - 86); g.stroke();
  // folio
  const mm = Math.floor(t / 60), ss = Math.floor(t % 60);
  text(g, `Л. ${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, W - 96, H - 52, { font: 'JetBrains Mono', size: 17, ls: 2, color: C.inkSoft, align: 'right' });
  g.restore();
}

// =====================================================================
// SCENES
// =====================================================================
function buildScenes() {
  // ---------- OPEN ----------
  const c01 = Ls('c01');
  const hypStart = c01 - 1.0;
  const cardOut = Ls('c02') + .1;
  cue(hypStart, 'paper', -6);
  // hypothesis index card
  S('hyp', hypStart, cardOut + 1.2, (g, t) => {
    const pIn = E.outE(prog(t, hypStart, hypStart + .8));
    const pOut = E.inOutC ? 0 : 0;
    const out = E.ioC(prog(t, cardOut - .2, cardOut + .9));
    const x = lerp(W / 2 - 640, -1500, out), y = lerp(H + 200, 260, pIn);
    card(g, x, y, 1280, 560, {
      rot: lerp(.05, -.012, pIn) - out * .1, draw: (g) => {
        text(g, 'ГИПОТЕЗА № 1', 60, 70, { font: 'JetBrains Mono', size: 22, ls: 4, color: C.red });
        text(g, 'сформулирована человеком', 1220, 70, { font: 'JetBrains Mono', size: 18, ls: 1, color: C.inkSoft, align: 'right' });
        const l1 = wordsAt('c01', 'Нейросети и андроиды — наша новая веха развития.');
        const l2 = wordsAt('c01', 'И, возможно, в будущем они будут жить вместо нас.');
        riseWords(g, l1.words, 60, 220, t, l1.times, { font: 'Spectral', size: 54, weight: 400, style: 'italic', color: C.ink });
        riseWords(g, l2.words, 60, 330, t, l2.times, { font: 'Spectral', size: 54, weight: 400, style: 'italic', color: C.ink });
        // underline 'жить вместо нас'
        const u = ep(t, Wt('c01', 'жить') - .1, Le('c01'), E.ioC);
        if (u > 0) drawPath(g, linePts(60 + measure(g, 'И, возможно, в будущем они будут ', { font: 'Spectral', size: 54, style: 'italic' }), 350, 1220, 350, 30, 3, 2), u, { color: C.red, lw: 3, boil: .8 });
      }
    });
    if (t > Le('c01') - .1) estamp(g, t, Le('c01') - .1, cardOut + .4, 'ГИПОТЕЗА', x + 1050 + 0 * out, y + 470, { sub: 'ТРЕБУЕТ ПРОВЕРКИ', rot: -.08 });
  });
  // 1863 reveal
  const tYear = Wt('c02', 'тысяча') - .05;
  S('xxi', Ls('c02') + .3, tYear + .2, (g, t) => {
    const e = env(t, Ls('c02') + .3, tYear + .1, .3, .25);
    const l = wordsAt('c02', 'Звучит как мысль XXI века.');
    riseWords(g, l.words, W / 2, 560, t, l.times.map((v, i) => i === 3 ? Wt('c02', 'двадцать') : v), { font: 'Spectral', size: 72, style: 'italic', weight: 300, align: 'center', alpha: e });
  });
  const tPaper = Ls('c03');
  S('year', tYear, tPaper + .2, (g, t) => {
    const e = env(t, tYear, tPaper + .2, .1, .45);
    const s = lerp(1.25, 1, E.outE(prog(t, tYear, tYear + .7)));
    g.save(); g.globalAlpha = e; g.translate(W / 2, 600); g.scale(s, s);
    text(g, '1863', 0, 0, { font: 'Unbounded', size: 300, weight: 800, align: 'center', ls: 10 });
    g.restore();
    const u = ep(t, tYear + .3, tYear + 1.2, E.ioC);
    drawPath(g, linePts(W / 2 - 430, 660, W / 2 + 430, 650, 30, 6, 4), u, { color: C.red, lw: 7, boil: 1, alpha: e });
    text(g, 'ВПЕРВЫЕ НАПЕЧАТАНО', W / 2, 740, { font: 'JetBrains Mono', size: 24, ls: 8, align: 'center', color: C.red, alpha: e * ep(t, tYear + .5, tYear + 1) });
  });
  cue(tYear, 'boom', -8);
  // newspaper
  const tQuote = Wt('c03', 'день');
  const tWar = Wt('c03', 'войну');
  const tButler = Ls('c04');
  const tNoWar = Wt('c04', 'войну');
  const tTalk = Wt('c04', 'машины');
  S('paper1863', tPaper, tTalk + .2, (g, t) => {
    const e = env(t, tPaper, tTalk + .2, .5, .45);
    const pin = E.outE(prog(t, tPaper, tPaper + .8));
    g.save(); g.globalAlpha = e;
    const px = 250, py = lerp(1150, 150, pin);
    // newspaper sheet
    card(g, px, py, 760, 820, {
      ruled: false, fill: '#efe8d6', rot: -.025, draw: (g, w, h) => {
        text(g, 'THE PRESS', w / 2, 92, { font: 'Cormorant Garamond', size: 76, weight: 600, align: 'center', ls: 4 });
        g.fillStyle = C.ink; g.fillRect(40, 116, w - 80, 3); g.fillRect(40, 124, w - 80, 1);
        text(g, 'CHRISTCHURCH, SATURDAY, JUNE 13, 1863.', w / 2, 152, { font: 'Cormorant Garamond', size: 22, weight: 500, align: 'center', ls: 2 });
        g.fillRect(40, 166, w - 80, 1);
        text(g, 'DARWIN AMONG THE MACHINES.', w / 2, 222, { font: 'Cormorant Garamond', size: 34, weight: 700, align: 'center', ls: 1 });
        text(g, '[ To the Editor of the Press. ]', w / 2, 256, { font: 'Cormorant Garamond', size: 20, style: 'italic', align: 'center' });
        // body text as grey lines
        const r = rng(63);
        for (let i = 0; i < 17; i++) {
          const yy = 300 + i * 26; if (i === 6 || i === 13) continue;
          let xx = 60; while (xx < w - 60) { const ww = 20 + r() * 70; g.fillStyle = 'rgba(22,19,15,0.30)'; g.fillRect(xx, yy, Math.min(ww, w - 60 - xx), 9); xx += ww + 8; }
        }
        // the quote lines in real type
        text(g, '“Day by day, however, the machines are gaining', 60, 468, { font: 'Cormorant Garamond', size: 25, weight: 600 });
        text(g, 'ground upon us…”', 60, 494, { font: 'Cormorant Garamond', size: 25, weight: 600 });
        highlight(g, 52, 446, 640 * ep(t, tQuote, tQuote + 1.2), 58, 'rgba(212,56,28,0.20)', 2);
        text(g, '“…war to the death should be instantly', 60, 650, { font: 'Cormorant Garamond', size: 25, weight: 600 });
        text(g, 'proclaimed against them.”', 60, 676, { font: 'Cormorant Garamond', size: 25, weight: 600 });
        highlight(g, 52, 628, 560 * ep(t, tWar, tWar + 1.0), 58, 'rgba(212,56,28,0.20)', 5);
        text(g, 'CELLARIUS.', w - 70, 760, { font: 'Cormorant Garamond', size: 28, weight: 700, align: 'right', ls: 3 });
      }
    });
    // Russian translation on the right
    const rx = 1110;
    const q1 = wordsAt('c03', '«День за днём машины');
    const q2 = wordsAt('c03', 'отвоёвывают у нас позиции»');
    riseWords(g, q1.words, rx, 430, t, q1.times, { font: 'Spectral', size: 50, style: 'italic', weight: 400 });
    riseWords(g, q2.words, rx, 498, t, q2.times, { font: 'Spectral', size: 50, style: 'italic', weight: 400 });
    const q3 = wordsAt('c03', 'объявить им войну насмерть');
    riseWords(g, q3.words, rx, 640, t, q3.times, { font: 'Spectral', size: 50, style: 'italic', weight: 400, colors: [C.ink, C.ink, C.red, C.red] });
    if (t > tButler) {
      const pb = ep(t, tButler, tButler + .6);
      drawPath(g, linePts(980, 905, 1100, 905, 10), pb, { color: C.blue, lw: 2 });
      typewriter(g, 'автор: Сэмюэл Батлер, писатель', 1120, 914, prog(t, Wt('c04', 'сэмюэл') - .2, Wt('c04', 'батлер', 0, true)), { color: C.blue, size: 26 });
    }
    if (t > tNoWar) {
      const pc = ep(t, tNoWar, tNoWar + .5, E.ioC);
      drawPath(g, linePts(1100, 625, 1100 + 640, 610, 20, 4, 9), pc, { color: C.ink, lw: 5, boil: 1 });
    }
    g.restore();
    src(g, t, tPaper + .5, tTalk, 'The Press (Крайстчерч), 13.06.1863; переизд. в «Записных книжках» С. Батлера');
  });
  cue(tPaper - .2, 'paper', -4); cue(tNoWar, 'pencil', -8);
  // machines learned to talk and run
  const tTalkW = Wt('c04', 'говорить'), tRun = Wt('c04', 'бегать');
  S('talkrun', tTalk - .25, Ls('c05') + .5, (g, t) => {
    const e = env(t, tTalk - .25, Ls('c05') + .5, .35, .5);
    g.save(); g.globalAlpha = e;
    // speech wave cloud left, running figure (line art) right
    drawCloud(g, cloud('wave'), { x: 620, y: 540, scale: .62, reveal: ep(t, tTalk - .2, tTalkW + .6) });
    text(g, 'говорить', 620, 860, { font: 'Spectral', size: 48, style: 'italic', align: 'center', alpha: ep(t, tTalkW, tTalkW + .4) });
    runner(g, t, 1300, 560, ep(t, tTalk + .1, tRun + .3));
    text(g, 'бегать', 1300, 860, { font: 'Spectral', size: 48, style: 'italic', align: 'center', alpha: ep(t, tRun, tRun + .4) });
    g.restore();
  });
  // confession / evidence inventory
  const c05 = Ls('c05');
  const tSynth = Wt('c05', 'синтезирован'), tScript = Wt('c05', 'сценарий'), tHuman = Wt('c05', 'человека');
  const tEvid = Wt('c05', 'улика');
  S('confess', c05 - .2, Ls('c06') + .2, (g, t) => {
    const e = env(t, c05 - .2, Ls('c06') + .2, .3, .5);
    const shrink = E.ioC(prog(t, tEvid - .5, tEvid + .4));
    g.save(); g.globalAlpha = e;
    g.translate(W / 2, H / 2); g.scale(lerp(1, .78, shrink), lerp(1, .78, shrink)); g.rotate(-.025 * shrink); g.translate(-W / 2, -H / 2);
    if (shrink > 0) {
      g.save(); g.shadowColor = 'rgba(40,30,15,0.25)'; g.shadowBlur = 40 * shrink; g.shadowOffsetY = 18 * shrink;
      g.strokeStyle = C.ink; g.lineWidth = 3; g.strokeRect(150, 120, W - 300, H - 240); g.restore();
    }
    text(g, 'ОПИСЬ ДЕЛА', 460, 250, { font: 'JetBrains Mono', size: 24, ls: 6, color: C.red, alpha: ep(t, c05, c05 + .4) });
    const rows = [
      ['голос', 'синтезирован', tSynth],
      ['сценарий', 'нейросеть', tScript],
      ['анимация', 'нейросеть', Wt('c05', 'анимацию')],
      ['музыка', 'нейросеть', Wt('c05', 'музыку')],
      ['исходные данные', '1 фраза человека', tHuman - .3],
    ];
    rows.forEach((r, i) => {
      if (t < r[2]) return;
      const y = 340 + i * 92;
      text(g, String(i + 1).padStart(2, '0'), 460, y, { font: 'JetBrains Mono', size: 30, color: C.inkSoft });
      typewriter(g, r[0], 540, y, prog(t, r[2], r[2] + .35), { color: C.ink, size: 46, cursor: false });
      g.save(); g.setLineDash([2, 8]); g.strokeStyle = 'rgba(22,19,15,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(960, y - 10); g.lineTo(1130, y - 10); g.stroke(); g.restore();
      typewriter(g, r[1], 1170, y, prog(t, r[2] + .2, r[2] + .7), { color: i === 4 ? C.red : C.blue, size: 46, cursor: false });
      if (!confessCues[i]) { confessCues[i] = 1; cue(r[2], 'type', -12); }
    });
    g.restore();
    // evidence tag
    if (t > tEvid - .3) {
      const p = E.outB(prog(t, tEvid - .3, tEvid + .5));
      const sw = Math.sin((t - tEvid) * 3) * .06 * Math.exp(-(t - tEvid) * 1.2);
      g.save(); g.globalAlpha = e; g.translate(1560, 280); g.rotate(.18 + sw); g.scale(p, p);
      drawPath(g, [[0, -60], [-30, -180], [-120, -260]], 1, { color: C.ink, lw: 2 });
      card(g, -150, -60, 300, 170, { ruled: false, fill: '#f1e3c4', rot: 0, draw: (g, w, h) => {
        g.fillStyle = C.paper; g.beginPath(); g.arc(28, 28, 10, 0, TAU); g.fill(); g.strokeStyle = C.ink; g.lineWidth = 2; g.stroke();
        text(g, 'ВЕЩДОК № 1', 54, 40, { font: 'JetBrains Mono', size: 22, ls: 3, color: C.red });
        text(g, 'этот ролик', 26, 100, { font: 'Spectral', size: 40, style: 'italic' });
        text(g, 'и его рассказчик', 26, 142, { font: 'Spectral', size: 28, style: 'italic', color: C.inkSoft });
      } });
      g.restore();
    }
  });
  cue(tEvid - .2, 'paper', -5);
  // three words roadmap
  const c06 = Ls('c06');
  S('three', c06 - .1, Le('c06') + .45, (g, t) => {
    const e = env(t, c06 - .1, Le('c06') + .45, .3, .35);
    const keys = [['I', 'ВЕХА', Wt('c06', 'веха')], ['II', 'ЖИТЬ', Wt('c06', 'жить')], ['III', 'ВМЕСТО', Wt('c06', 'вместо')]];
    g.save(); g.globalAlpha = e;
    text(g, 'ПРОВЕРКА ГИПОТЕЗЫ — ПО ТРЁМ СЛОВАМ', W / 2, 300, { font: 'JetBrains Mono', size: 26, ls: 6, align: 'center', color: C.inkSoft, alpha: ep(t, c06, c06 + .5) });
    keys.forEach((k, i) => {
      const x = 400 + i * 560;
      const p = E.outE(prog(t, k[2] - .1, k[2] + .6));
      if (p <= 0) return;
      text(g, k[0], x, 420, { font: 'Spectral', size: 56, style: 'italic', weight: 300, align: 'center', color: C.red, alpha: p });
      g.save(); g.beginPath(); g.rect(x - 300, 440, 600, 180); g.clip();
      text(g, k[1], x, 580 + (1 - p) * 140, { font: 'Unbounded', size: 88, weight: 800, align: 'center', ls: 4 });
      g.restore();
      drawPath(g, [[x - 150, 640], [x + 150, 640]], p, { lw: 2 });
      if (!threeCues[i]) { threeCues[i] = 1; cue(k[2], 'tick', -6); }
    });
    g.restore();
  });
  // title
  const tTitle = Ls('v01') - 3.0;
  S('title', Le('c06') + .2, Le('c06') + 3.0, (g, t) => {
    const a = Le('c06') + .25, b = Le('c06') + 3.0;
    const e = env(t, a, b, .2, .5);
    if (e <= 0) return;
    g.save(); g.globalAlpha = e;
    // dots assemble from scatter into the word field
    const s = lerp(1.08, 1, E.outE(prog(t, a, b)));
    g.translate(W / 2, H / 2); g.scale(s, s); g.translate(-W / 2, -H / 2);
    text(g, 'НАСЛЕДНИКИ', W / 2, 590, { font: 'Unbounded', size: 168, weight: 800, align: 'center', ls: 14 });
    text(g, 'дело о гипотезе: будут ли машины жить вместо нас', W / 2, 680, { font: 'Spectral', size: 40, style: 'italic', weight: 300, align: 'center', alpha: ep(t, a + .4, a + 1.0) });
    g.restore();
  });
  cue(Le('c06') + .25, 'boom', -3);

  // ---------- I. ВЕХА ----------
  const v01 = Ls('v01');
  S('ch1', Le('c06') + 2.9, v01 + .2, (g, t) => chapterCard(g, t, Le('c06') + 2.9, v01 + .2, 'глава I', 'ВЕХА', 'НОСИТЕЛИ ИНФОРМАЦИИ'));
  cue(Le('c06') + 2.9, 'boom', -8);
  // the carrier sequence: one continuous dot cloud morphing through carriers
  const keys = [
    { t: v01 + .2, shape: 'dna', x: 760, y: 560, scale: .78, dur: .1, reveal: t => ep(t, v01 + .2, v01 + 1.8) },
    { t: Wt('v02', 'клетки') + .3, shape: 'cell', x: 760, y: 560, scale: .78, dur: 1.5 },
    { t: Wt('v03', 'многоклеточные') + .4, shape: 'colony', x: 760, y: 560, scale: .78, dur: 1.5 },
    { t: Wt('v03', 'нервные') + .5, shape: 'neuron', x: 760, y: 560, scale: .82, dur: 1.5 },
    { t: Wt('v04', 'язык') + .5, shape: 'wave', x: 760, y: 560, scale: .82, dur: 1.3 },
    { t: Wt('v04', 'письмо') + .5, shape: 'tablet', x: 760, y: 560, scale: .76, dur: 1.2 },
    { t: Wt('v04', 'печать') + .45, shape: 'book', x: 760, y: 560, scale: .8, dur: 1.0 },
    { t: Wt('v04', 'транзистор') + .45, shape: 'chip', x: 760, y: 560, scale: .76, dur: 1.0 },
  ];
  const labels = [
    ['РИС. 1', 'МОЛЕКУЛЫ', '≈ 4 млрд лет назад', keys[0].t + .4],
    ['РИС. 2', 'КЛЕТКА', 'ДНК как общий архив', keys[1].t - .6],
    ['РИС. 3', 'МНОГОКЛЕТОЧНОЕ ТЕЛО', 'сотни млн лет назад', keys[2].t - .6],
    ['РИС. 4', 'НЕРВНАЯ СИСТЕМА', 'информация в памяти', keys[3].t - .6],
    ['РИС. 5', 'ЯЗЫК', '≥ 135 тыс. лет назад*', keys[4].t - .5],
    ['РИС. 6', 'ПИСЬМО', '≈ 5 200 лет назад', keys[5].t - .5],
    ['РИС. 7', 'ПЕЧАТЬ', '≈ 1450 г.', keys[6].t - .4],
    ['РИС. 8', 'ТРАНЗИСТОР', '1947 г.', keys[7].t - .4],
  ];
  const tBook = Ls('v05');
  S('carriers', v01, tBook + .6, (g, t) => {
    const e = env(t, v01, tBook + .6, .3, .5);
    g.save(); g.globalAlpha = e;
    cloudTrack(g, t, keys);
    // label column on the right
    let cur = 0; for (let i = 0; i < labels.length; i++) if (t >= labels[i][3]) cur = i;
    const L_ = labels[cur], lp = ep(t, L_[3], L_[3] + .5);
    text(g, L_[0] + ' —', 1290, 430, { font: 'JetBrains Mono', size: 24, ls: 4, color: C.red, alpha: lp });
    g.save(); g.beginPath(); g.rect(1280, 450, 600, 110); g.clip();
    let fs = 62; while (fs > 30 && measure(g, L_[1], { font: 'Unbounded', size: fs, weight: 800 }) > 560) fs -= 2;
    text(g, L_[1], 1290, 520 + (1 - lp) * 80, { font: 'Unbounded', size: fs, weight: 800 });
    g.restore();
    text(g, L_[2], 1290, 590, { font: 'Spectral', size: 36, style: 'italic', alpha: lp });
    // timeline of carriers at bottom
    const x0 = 300, x1 = 1620, yb = 935;
    drawPath(g, [[x0, yb], [x1, yb]], ep(t, v01, v01 + 1.2, E.ioC), { lw: 1.5, color: C.inkSoft });
    labels.forEach((l, i) => {
      const x = lerp(x0, x1, i / (labels.length - 1));
      const on = t >= l[3];
      g.fillStyle = on ? (i === cur ? C.red : C.ink) : 'rgba(22,19,15,.25)';
      g.beginPath(); g.arc(x, yb, i === cur ? 9 : 6, 0, TAU); g.fill();
      text(g, String(i + 1), x, yb + 40, { font: 'JetBrains Mono', size: 18, align: 'center', color: on ? C.ink : C.inkFaint });
    });
    text(g, 'ДАЛЕЕ — НОВЫЙ НОСИТЕЛЬ  →', x1 + 0, yb - 24, { font: 'JetBrains Mono', size: 15, ls: 2, align: 'right', color: C.inkSoft, alpha: ep(t, keys[7].t, keys[7].t + .5) });
    g.restore();
    if (t > keys[4].t - .5 && t < keys[5].t) text(g, '* по оценке Miyagawa et al., 2025; точная дата неизвестна', 96, H - 52, { font: 'JetBrains Mono', size: 16, color: C.inkSoft, alpha: e * .9 });
  });
  keys.slice(1).forEach(k => cue(k.t - (k.dur || 1.5), 'swarm', -10));
  // Major transitions citation
  const tNew = Wt('v05', 'новый');
  S('mst', tBook - .2, Ls('v06') + .3, (g, t) => {
    const e = env(t, tBook - .2, Ls('v06') + .3, .4, .5);
    g.save(); g.globalAlpha = e;
    // book spine / citation card
    const p = E.outE(prog(t, tBook - .2, tBook + .6));
    card(g, 260, lerp(1100, 250, p), 640, 520, { ruled: false, fill: '#e9e0cc', rot: -.03, draw: (g, w, h) => {
      g.fillStyle = C.ink; g.fillRect(0, 0, w, 14);
      text(g, 'J. MAYNARD SMITH', 50, 110, { font: 'Cormorant Garamond', size: 34, weight: 600, ls: 3 });
      text(g, 'E. SZATHMÁRY', 50, 150, { font: 'Cormorant Garamond', size: 34, weight: 600, ls: 3 });
      text(g, 'The Major', 50, 280, { font: 'Cormorant Garamond', size: 78, weight: 500, style: 'italic' });
      text(g, 'Transitions', 50, 360, { font: 'Cormorant Garamond', size: 78, weight: 500, style: 'italic' });
      text(g, 'in Evolution', 50, 440, { font: 'Cormorant Garamond', size: 78, weight: 500, style: 'italic' });
      text(g, '1995', w - 50, 110, { font: 'Cormorant Garamond', size: 34, weight: 600, align: 'right' });
    } });
    const l1 = wordsAt('v05', 'большими эволюционными переходами');
    riseWords(g, l1.words.slice(0, 1), 1040, 430, t, l1.times, { font: 'Unbounded', size: 54, weight: 800 });
    riseWords(g, l1.words.slice(1), 1040, 500, t, l1.times.slice(1), { font: 'Unbounded', size: 54, weight: 800 });
    const l2 = wordsAt('v05', 'новый способ хранить и передавать информацию');
    riseWords(g, ['каждый', 'раз', '—'].concat(l2.words.slice(0, 2)), 1040, 620, t, [tNew - .5, tNew - .4, tNew - .3].concat(l2.times.slice(0, 2)), { font: 'Spectral', size: 42, style: 'italic' });
    riseWords(g, l2.words.slice(2), 1040, 676, t, l2.times.slice(2), { font: 'Spectral', size: 42, style: 'italic' });
    g.restore();
    estamp(g, t, Wt('v05', 'переходами') + .3, Ls('v06') + .1, 'ФАКТ', 1600, 820, { rot: .06 });
    src(g, t, tBook, Ls('v06'), 'Maynard Smith & Szathmáry, «The Major Transitions in Evolution», 1995');
  });
  cue(tBook - .2, 'paper', -5);
  // neural net made of our words
  const v06 = Ls('v06'), tWords = Wt('v06', 'слов'), tBuk = Wt('v06', 'буквально');
  S('net', v06 - .3, Ls('v07') + .3, (g, t) => {
    const e = env(t, v06 - .3, Ls('v07') + .3, .4, .5);
    g.save(); g.globalAlpha = e;
    const p = prog(t, v06 - .3, v06 + 1.4);
    // morph chip -> net
    if (t < tBuk - .2) drawMorph(g, cloud('chip'), cloud('net'), p, { x: 760, y: 560, scale: .76 }, { x: 760, y: 560, scale: .8 });
    else glyphCloud(g, t, cloud('net'), 760, 560, .8, ep(t, tBuk - .2, tWords + .3));
    const l = wordsAt('v06', 'первый носитель, который не только хранит записанное людьми,');
    const l2 = wordsAt('v06', 'но и сам его перекомбинирует.');
    riseWords(g, ['НЕЙРОСЕТЬ'], 1290, 400, t, [v06], { font: 'Unbounded', size: 56, weight: 800 });
    riseWords(g, l2.words, 1290, 470, t, l2.times, { font: 'Spectral', size: 38, style: 'italic', colors: [C.ink, C.ink, C.ink, C.ink, C.red] });
    const l3 = wordsAt('v06', 'сделаны из наших слов.');
    riseWords(g, l3.words, 1290, 640, t, l3.times, { font: 'Unbounded', size: 50, weight: 800, colors: [C.ink, C.ink, C.red, C.red] });
    machineNote(g, t, tWords + .5, 'в том числе и я', 1320, 720, { size: 26 });
    g.restore();
    estamp(g, t, Wt('v06', 'обучены'), Ls('v07') + .1, 'ФАКТ', 1660, 860, { rot: -.05, cue: true });
  });
  cue(v06 - .3, 'swarm', -9);
  // PNAS 2026
  const v07 = Ls('v07'), tLife = Wt('v07', 'жизнью');
  S('pnas', v07 - .2, Le('v08') + .4, (g, t) => {
    const e = env(t, v07 - .2, Le('v08') + .4, .4, .5);
    g.save(); g.globalAlpha = e;
    const p = E.outE(prog(t, v07 - .2, v07 + .6));
    const lift = E.ioC(prog(t, Ls('v08') - .3, Ls('v08') + .6));
    card(g, 220, lerp(1100, 230 - lift * 40, p), 760, 400, { ruled: false, fill: C.bone, rot: .015, draw: (g, w, h) => {
      text(g, 'PNAS · 20.04.2026', 44, 64, { font: 'JetBrains Mono', size: 22, ls: 3, color: C.red });
      text(g, 'Evolvable AI: Threats of a new', 44, 150, { font: 'Spectral', size: 40, weight: 600 });
      text(g, 'major transition in evolution', 44, 200, { font: 'Spectral', size: 40, weight: 600 });
      text(g, 'V. Müller, L. Steels, E. Szathmáry', 44, 270, { font: 'Spectral', size: 30, style: 'italic', color: C.inkSoft });
      highlight(g, 40, 236, 470 * ep(t, Wt('v07', 'сатмари'), Wt('v07', 'сатмари') + .6), 46, 'rgba(255,214,10,0.45)', 8);
    } });
    const pb = env(t, v07, Wt('v07', 'эволюционирующий') - .1, .5, .4);
    if (pb > 0) {
      g.save(); g.globalAlpha *= pb;
      card(g, 1180, 260, 420, 330, { ruled: false, fill: '#e9e0cc', rot: .03, draw: (g, w) => {
        g.fillStyle = C.ink; g.fillRect(0, 0, w, 10);
        text(g, 'E. SZATHMÁRY · 1995', 30, 70, { font: 'Cormorant Garamond', size: 26, weight: 600, ls: 2 });
        text(g, 'The Major Transitions', 30, 170, { font: 'Cormorant Garamond', size: 40, style: 'italic' });
        text(g, 'in Evolution', 30, 220, { font: 'Cormorant Garamond', size: 40, style: 'italic' });
        highlight(g, 26, 46, 260 * ep(t, Wt('v07', 'сатмари'), Wt('v07', 'сатмари') + .5), 34, 'rgba(255,214,10,0.5)', 4);
      } });
      arrow(g, 1170, 430, 1000, 400, ep(t, Wt('v07', 'авторов') - .2, Wt('v07', 'авторов') + .5, E.ioC), { color: C.blue, lw: 2.5, wob: 6 });
      text(g, '31 год спустя', 1020, 470, { font: 'JetBrains Mono', size: 22, color: C.blue, alpha: ep(t, Wt('v07', 'теории'), Wt('v07', 'теории') + .5) });
      g.restore();
    }
    // the claim, word by word
    const qa = wordsAt('v07', 'эволюционирующий ИИ'), qb = wordsAt('v07', 'может стать новым'), qc = wordsAt('v07', 'большим переходом.');
    const fadeQ = 1 - ep(t, tLife - .3, tLife + .2);
    riseWords(g, qa.words, 1100, 330, t, qa.times, { font: 'Unbounded', size: 50, weight: 800, alpha: fadeQ });
    riseWords(g, qb.words, 1100, 400, t, qb.times, { font: 'Spectral', size: 46, style: 'italic', alpha: fadeQ });
    riseWords(g, qc.words, 1100, 460, t, qc.times, { font: 'Spectral', size: 46, style: 'italic', colors: [C.red, C.red], alpha: fadeQ });
    text(g, 'соавтор теории 1995 года', 260, 700, { font: 'JetBrains Mono', size: 22, color: C.blue, alpha: ep(t, Wt('v07', 'авторов'), Wt('v07', 'авторов') + .5) * (1 - lift) });
    // Life 2.0
    const pl = E.outE(prog(t, tLife - .1, tLife + .7));
    if (pl > 0) {
      g.save(); g.globalAlpha *= pl * (1 - lift * .8);
      text(g, 'ЖИЗНЬ 2.0', 1430, 470, { font: 'Unbounded', size: 92, weight: 800, align: 'center' });
      text(g, '?', 1760, 470, { font: 'Spectral', size: 120, style: 'italic', color: C.red, align: 'center' });
      g.restore();
    }
    // thresholds
    const v08 = Ls('v08');
    const th = [['порог 1', 'самоподдержание', 'обеспечивают люди', Wt('v08', 'поддерживает')], ['порог 2', 'свободная эволюция', 'решают люди', Wt('v08', 'эволюционирует')]];
    th.forEach((r, i) => {
      if (t < r[3] - .2) return;
      const y = 760 + i * 120, pp = ep(t, r[3] - .2, r[3] + .4), X = 260;
      g.save(); g.globalAlpha *= pp;
      g.strokeStyle = C.ink; g.lineWidth = 3; g.strokeRect(X, y - 46, 52, 52);
      const px = ep(t, r[3] + .6, r[3] + 1.0);
      drawPath(g, [[X + 6, y - 40], [X + 46, y]], px, { color: C.red, lw: 5 });
      drawPath(g, [[X + 46, y - 40], [X + 6, y]], ep(t, r[3] + .8, r[3] + 1.1), { color: C.red, lw: 5 });
      text(g, r[0].toUpperCase() + ' — НЕ ПРОЙДЕН', X + 80, y - 30, { font: 'JetBrains Mono', size: 18, ls: 3, color: C.red });
      text(g, r[1], X + 80, y + 6, { font: 'Spectral', size: 44, weight: 600 });
      text(g, '— ' + r[2], X + 80 + measure(g, r[1] + ' ', { font: 'Spectral', size: 44, weight: 600 }), y + 6, { font: 'Spectral', size: 44, style: 'italic', color: C.inkSoft });
      g.restore();
    });
    g.restore();
    estamp(g, t, tLife + .6, Le('v08') + .2, 'ГИПОТЕЗА', 1480, 640, { sub: 'УЧЁНЫХ, НЕ ФАКТ', rot: -.06 });
    src(g, t, v07, Le('v08'), 'Müller, Steels, Szathmáry. PNAS 123(17), 2026; возражение: M. Boudry, PNAS, 07.2026');
  });
  cue(v07 - .2, 'paper', -5);
  ['поддерживает', 'эволюционирует'].forEach(k => cue(Wt('v08', k) + .6, 'pencil', -10));

  // ---------- "замер": how fast ----------
  const n01 = Ls('n01');
  S('measure', n01 - 2.2, n01 + .1, (g, t) => chapterCard(g, t, n01 - 2.2, n01 + .1, 'глава I · замер', 'СКОРОСТЬ', 'НАСКОЛЬКО БЫСТРО ДВИЖЕТСЯ НОСИТЕЛЬ'));
  cue(n01 - 2.2, 'boom', -9);
  const tX5 = Wt('n01', 'пять');
  S('compute', n01, Wt('n02', 'олимпиаде') - .3, (g, t) => {
    const e = env(t, n01, Wt('n02', 'олимпиаде') - .3, .4, .5);
    g.save(); g.globalAlpha = e;
    // exponential bars ×5/year (log feel)
    const x0 = 260, yb = 820;
    text(g, 'ВЫЧИСЛЕНИЯ НА ОБУЧЕНИЕ ПЕРЕДОВЫХ МОДЕЛЕЙ', x0, 240, { font: 'JetBrains Mono', size: 22, ls: 3, color: C.red, alpha: ep(t, n01, n01 + .4) });
    for (let i = 0; i < 6; i++) {
      const p = ep(t, n01 + .5 + i * .35, n01 + 1.1 + i * .35, E.outE);
      const hgt = 18 * Math.pow(1.95, i) * p;
      g.fillStyle = i === 5 ? C.ink : 'rgba(22,19,15,.75)';
      g.fillRect(x0 + i * 120, yb - hgt, 70, hgt);
      text(g, String(2020 + i), x0 + i * 120 + 35, yb + 40, { font: 'JetBrains Mono', size: 20, align: 'center', color: C.inkSoft, alpha: p });
    }
    text(g, '×5', 280, 520, { font: 'Unbounded', size: 200, weight: 800, alpha: ep(t, tX5 - .1, tX5 + .5) });
    text(g, 'в год', 290, 600, { font: 'Spectral', size: 54, style: 'italic', alpha: ep(t, tX5 + .2, tX5 + .7) });
    text(g, 'масштаб условный, рост ×5/год', x0, yb + 80, { font: 'JetBrains Mono', size: 16, color: C.inkSoft, alpha: .8 });
    // METR doubling staircase
    const n02 = Ls('n02');
    const pm = ep(t, n02 - .3, n02 + .5);
    if (pm > 0) {
      g.fillStyle = C.paper; g.globalAlpha = e * pm; g.fillRect(1240, 200, 600, 700); g.globalAlpha = e;
      text(g, 'ДЛИНА ЗАДАЧ ИИ-АГЕНТОВ', 1260, 260, { font: 'JetBrains Mono', size: 22, ls: 3, color: C.red, alpha: pm });
      const steps = 10;
      for (let i = 0; i < steps; i++) {
        const p = ep(t, n02 + .2 + i * .22, n02 + .5 + i * .22);
        const h = 20 * Math.pow(1.38, i);
        g.fillStyle = C.blue; g.globalAlpha = e * p; g.fillRect(1260 + i * 52, 820 - h, 40, h); g.globalAlpha = e;
      }
      text(g, '×2', 1300, 470, { font: 'Unbounded', size: 110, weight: 800, color: C.blue, alpha: ep(t, Wt('n02', 'удваивалась'), Wt('n02', 'удваивалась') + .5) });
      text(g, 'каждые ~7 месяцев', 1300, 530, { font: 'Spectral', size: 40, style: 'italic', alpha: ep(t, Wt('n02', 'семь'), Wt('n02', 'семь') + .5) });
      text(g, '2019 → 2025', 1260, 860, { font: 'JetBrains Mono', size: 20, color: C.inkSoft, alpha: pm });
    }
    g.restore();
    estamp(g, t, tX5 + .6, Ls('n02') - .4, 'ФАКТ', 1600, 820, { rot: .05 });
    estamp(g, t, Wt('n02', 'месяцев') + .3, Wt('n02', 'олимпиаде') - .4, 'ФАКТ', 1100, 860, { rot: -.04 });
    src(g, t, n01, Ls('n02') - .2, 'Epoch AI, тренды вычислений на обучение (2024–2026)');
    src(g, t, Ls('n02'), Wt('n02', 'олимпиаде') - .3, 'METR, «Measuring AI Ability to Complete Long Tasks», 2025; Time Horizon 1.1, 2026');
  });
  // IMO medal
  const tImo = Wt('n02', 'олимпиаде'), tGold = Wt('n02', 'золотой');
  S('imo', tImo - .4, Ls('n03') + .2, (g, t) => {
    const e = env(t, tImo - .4, Ls('n03') + .2, .4, .4);
    g.save(); g.globalAlpha = e;
    const p = ep(t, tImo - .3, tImo + .8, E.ioC);
    drawPath(g, circlePts(W / 2, 520, 190, 4, 120, .015, 1.0), p, { lw: 6, color: C.ink, boil: .8 });
    drawPath(g, circlePts(W / 2, 520, 160, 7, 120, .015, 1.0), ep(t, tImo, tImo + .9, E.ioC), { lw: 2, color: C.ink, boil: .8 });
    text(g, 'IMO', W / 2, 500, { font: 'Unbounded', size: 84, weight: 800, align: 'center', alpha: ep(t, tImo + .2, tImo + .6) });
    text(g, '2025', W / 2, 570, { font: 'JetBrains Mono', size: 34, align: 'center', ls: 6, alpha: ep(t, tImo + .3, tImo + .7) });
    text(g, '35 / 42 балла', W / 2, 800, { font: 'Spectral', size: 46, style: 'italic', align: 'center', alpha: ep(t, tGold, tGold + .5) });
    text(g, 'уровень золотой медали', W / 2, 860, { font: 'JetBrains Mono', size: 22, ls: 3, align: 'center', color: C.red, alpha: ep(t, tGold, tGold + .5) });
    g.restore();
    estamp(g, t, tGold + .3, Ls('n03'), 'ФАКТ', 1420, 380, { rot: .08 });
    src(g, t, tImo, Ls('n03'), 'IMO 2025: Gemini Deep Think — 35/42 (подтверждено оргкомитетом)');
  });
  // Moravec paradox
  const n03 = Ls('n03'), tChess = Wt('n03', 'шахматы'), tChild = Wt('n03', 'ребёнок'), tHold = Wt('n03', 'держать');
  S('moravec', n03 - .2, Ls('n04') + .2, (g, t) => {
    const e = env(t, n03 - .2, Ls('n04') + .2, .4, .5);
    g.save(); g.globalAlpha = e;
    const tt = ep(t, tChess - .9, tChess - .2, E.ioC);
    if (tt < 1) {
      g.save(); g.globalAlpha *= 1 - tt;
      const l0 = wordsAt('n03', 'Ханс Моравек заметил парадокс:');
      riseWords(g, l0.words, W / 2, 560, t, l0.times, { font: 'Unbounded', size: 64, weight: 800, align: 'center' });
      text(g, '1988', W / 2, 660, { font: 'Spectral', size: 52, style: 'italic', align: 'center', color: C.red, alpha: ep(t, Wt('n03', 'восемьдесят'), Wt('n03', 'восемьдесят') + .5) });
      text(g, 'С АНДРОИДАМИ ИНАЧЕ', W / 2, 420, { font: 'JetBrains Mono', size: 26, ls: 6, align: 'center', color: C.inkSoft, alpha: ep(t, n03, n03 + .5) });
      g.restore();
    }
    text(g, 'ПАРАДОКС МОРАВЕКА · 1988', 96, 200, { font: 'JetBrains Mono', size: 22, ls: 4, color: C.red, alpha: tt });
    // left column: easy for machines
    text(g, 'легко машине', 380, 300, { font: 'Spectral', size: 44, style: 'italic', align: 'center', alpha: ep(t, tChess - .3, tChess + .2) });
    knight(g, 380, 560, ep(t, tChess - .2, tChess + .8));
    text(g, 'шахматы · тесты', 380, 800, { font: 'JetBrains Mono', size: 24, ls: 2, align: 'center', alpha: ep(t, tChess, tChess + .5) });
    // divider
    drawPath(g, [[760, 280], [760, 860]], ep(t, tChess - .3, tChess + .7, E.ioC), { lw: 1.5, color: C.inkSoft });
    text(g, 'трудно машине', 1300, 300, { font: 'Spectral', size: 44, style: 'italic', align: 'center', color: C.red, alpha: ep(t, tChild - .4, tChild + .2) });
    drawCloud(g, cloud('hand'), { x: 1300, y: 580, scale: .62, reveal: ep(t, tChild - .3, tHold + .6) });
    text(g, 'двигаться · держать вещи', 1300, 860, { font: 'JetBrains Mono', size: 24, ls: 2, align: 'center', alpha: ep(t, tHold, tHold + .5) });
    g.restore();
    estamp(g, t, Wt('n03', 'парадокс') + .3, Ls('n04'), 'ФАКТ', 1650, 230, { rot: .04, sub: 'НАБЛЮДЕНИЕ, 1988' });
    src(g, t, n03, Ls('n04'), 'H. Moravec, «Mind Children», 1988');
  });
  // half marathon race bars
  const n04 = Ls('n04'), t25 = Wt('n04', 'пятом'), t26 = Wt('n04', 'шестом'), tRec = Wt('n04', 'рекорда');
  S('race', n04 - .2, Ls('n05') + .2, (g, t) => {
    const e = env(t, n04 - .2, Ls('n05') + .2, .4, .5);
    g.save(); g.globalAlpha = e;
    text(g, 'ПОЛУМАРАФОН · 21,1 КМ · ПЕКИН', 96, 220, { font: 'JetBrains Mono', size: 22, ls: 4, color: C.red, alpha: ep(t, n04, n04 + .5) });
    runner(g, t, 1560, 560, ep(t, n04 - .1, n04 + .6));
    text(g, 'НОГИ', 1560, 860, { font: 'Unbounded', size: 54, weight: 800, align: 'center', alpha: ep(t, n04, n04 + .5) });
    const rows = [
      ['робот, 2025', 160.7, '2:40:42', t25 - .2, C.ink],
      ['робот, 2026', 50.43, '≈ 50:26', t26 - .1, C.blue],
      ['человек, мировой рекорд', 57.33, '57:20', tRec - .3, C.red],
    ];
    const sx = 6.6;
    rows.forEach((r, i) => {
      const y = 380 + i * 170;
      const p = E.outC(prog(t, r[3], r[3] + Math.min(2.2, r[1] / 60)));
      if (t < r[3]) return;
      text(g, r[0], 96, y - 20, { font: 'Spectral', size: 38, style: 'italic' });
      g.fillStyle = r[4]; g.fillRect(96, y, r[1] * sx * p, 34);
      text(g, r[2], 96 + r[1] * sx * p + 20, y + 30, { font: 'Unbounded', size: 34, weight: 800, color: r[4], alpha: ep(t, r[3] + .5, r[3] + 1) });
    });
    text(g, 'Роботы бежали в отдельном забеге; часть участников управлялась дистанционно, данные о победителе в отчётах расходятся.', 96, 930, { font: 'JetBrains Mono', size: 17, color: C.inkSoft, alpha: ep(t, t26 + .5, t26 + 1) });
    g.restore();
    estamp(g, t, tRec + .5, Ls('n05'), 'ФАКТ', 1550, 300, { rot: -.05, sub: 'С ОГОВОРКАМИ' });
    src(g, t, n04, Ls('n05'), 'AP/PBS, 19.04.2026; TechNode, 21.04.2025');
  });
  // humanoids: numbers + marionette strings
  const n05 = Ls('n05'), tNum = Wt('n05', 'тринадцати'), tOp = Wt('n05', 'оператор');
  S('humanoids', n05 - .2, Ls('n06') + .1, (g, t) => {
    const e = env(t, n05 - .2, Ls('n06') + .1, .4, .35);
    g.save(); g.globalAlpha = e;
    drawCloud(g, cloud('android'), { x: 560, y: 600, scale: .72, reveal: ep(t, n05 - .2, n05 + 1.5) });
    text(g, '13–18 тыс.', 1080, 420, { font: 'Unbounded', size: 96, weight: 800, alpha: ep(t, tNum - .1, tNum + .5) });
    text(g, 'человекоподобных роботов выпущено в 2025 году', 1084, 480, { font: 'Spectral', size: 34, style: 'italic', alpha: ep(t, tNum + .3, tNum + .8) });
    // bar: >85% demos/education/research
    const pb = ep(t, Wt('n05', 'выступлений') - .2, Wt('n05', 'исследований') + .3, E.ioC);
    g.strokeStyle = C.ink; g.lineWidth = 2; g.globalAlpha = e * ep(t, Wt('n05', 'выступлений') - .3, Wt('n05', 'выступлений'));
    g.strokeRect(1084, 540, 700, 40); g.fillStyle = C.ink; g.fillRect(1084, 540, 700 * .85 * pb, 40); g.globalAlpha = e;
    text(g, '> 85% — выступления, обучение, сбор данных', 1084, 620, { font: 'JetBrains Mono', size: 22, alpha: ep(t, Wt('n05', 'исследований'), Wt('n05', 'исследований') + .4) });
    // marionette strings to an operator
    const ps = ep(t, tOp - 1.2, tOp + .2, E.ioC);
    if (ps > 0) {
      const ox = 560, oy = 150;
      [[-150, 230], [150, 230], [-60, 50], [60, 50], [0, 30]].forEach(([dx, dy], i) => {
        const hx = 560 + [-230, 230, -80, 80, 0][i] * .72, hy = 600 + [-60, -60, 260, 260, -330][i] * .72;
        drawPath(g, linePts(ox + dx * .3, oy, hx, hy, 12, 4, i), ps, { color: C.blue, lw: 1.5, boil: .6 });
      });
      g.strokeStyle = C.blue; g.lineWidth = 4; g.globalAlpha = e * ps;
      g.beginPath(); g.moveTo(400, 150); g.lineTo(720, 150); g.stroke(); g.globalAlpha = e;
      machineNote(g, t, tOp - .2, 'удалённый оператор', 760, 160, { size: 26 });
    }
    text(g, 'домашний андроид · $20 000', 1084, 760, { font: 'Spectral', size: 40, style: 'italic', alpha: ep(t, Wt('n05', 'домашнему') - .2, Wt('n05', 'домашнему') + .4) });
    g.restore();
    estamp(g, t, Wt('n05', 'исследований') + .5, Ls('n06'), 'ФАКТ', 1650, 860, { rot: .05 });
    src(g, t, n05, Ls('n06'), 'IDC, Omdia (2026) — отгрузки 2025; 1X, анонс NEO, 27.10.2025');
  });
  // Korea: fertility and robots
  const n06 = Ls('n06'), tTfr = Wt('n06', 'ноль'), tRob = Wt('n06', 'тысяча');
  S('korea', n06 - .2, Le('n06') + .5, (g, t) => {
    const e = env(t, n06 - .2, Le('n06') + .5, .4, .4);
    g.save(); g.globalAlpha = e;
    const vm = Wt('n06', 'вместо'), ko = ep(t, Wt('n06', 'южной') - .4, Wt('n06', 'южной') + .1, E.ioC);
    if (ko < 1) {
      g.save(); g.globalAlpha *= 1 - ko;
      riseWords(g, ['«вместо»'], W / 2, 560, t, [n06 - .1], { font: 'Spectral', size: 130, style: 'italic', align: 'center', color: C.red });
      text(g, 'уже звучит в статистике', W / 2, 650, { font: 'JetBrains Mono', size: 28, ls: 4, align: 'center', alpha: ep(t, Wt('n06', 'статистике') - .3, Wt('n06', 'статистике') + .2) });
      g.restore();
    }
    text(g, 'ЮЖНАЯ КОРЕЯ', 96, 220, { font: 'JetBrains Mono', size: 22, ls: 4, color: C.red, alpha: ko });
    text(g, '0,8', 300, 520, { font: 'Unbounded', size: 200, weight: 800, align: 'center', color: C.red, alpha: ep(t, tTfr - .1, tTfr + .5) });
    text(g, 'ребёнка на женщину (2025)', 300, 590, { font: 'Spectral', size: 34, style: 'italic', align: 'center', alpha: ep(t, tTfr + .2, tTfr + .7) });
    text(g, 'для замещения поколений нужно ≈ 2,1', 300, 640, { font: 'JetBrains Mono', size: 18, align: 'center', color: C.inkSoft, alpha: ep(t, tTfr + .6, tTfr + 1.1) });
    // grid of 10,000 workers: 100x100 dots, 1220 robots highlighted
    const gx = 760, gy = 250, cell = 6.2;
    const pg = ep(t, tRob - 1.0, tRob + .2);
    const pr = ep(t, tRob, Wt('n06', 'рабочих') + .4);
    if (pg > 0) {
      const XYg = new Float32Array(20000), ALg = new Float32Array(10000);
      const XYr = new Float32Array(2600); let mr = 0;
      for (let i = 0; i < 10000; i++) {
        const cx = i % 100, cy = Math.floor(i / 100);
        XYg[2 * i] = gx + cx * cell; XYg[2 * i + 1] = gy + cy * cell;
        ALg[i] = clamp((pg * 1.3 - hash(i * .77) * .3 - cy / 100) * 3) * .55;
        if (hash(i * 9.13) < .122 && mr < 1300) { if (hash(i * 4.1) < pr * 1.05) { XYr[2 * mr] = XYg[2 * i]; XYr[2 * mr + 1] = XYg[2 * i + 1]; mr++; } }
      }
      splat(g, XYg, 10000, { r: 1.25, color: RGB.ink, al: ALg });
      splat(g, XYr, mr, { r: 2.3, color: RGB.blue });
      text(g, '10 000 рабочих', gx, gy + 660, { font: 'JetBrains Mono', size: 20, color: C.inkSoft, alpha: pg });
      text(g, '1 220', gx + 650, 420, { font: 'Unbounded', size: 110, weight: 800, color: C.blue, alpha: ep(t, tRob, tRob + .5) });
      text(g, 'роботов на 10 000', gx + 655, 480, { font: 'Spectral', size: 34, style: 'italic', alpha: ep(t, tRob + .3, tRob + .8) });
      text(g, 'рабочих — №1 в мире', gx + 655, 524, { font: 'Spectral', size: 34, style: 'italic', alpha: ep(t, tRob + .3, tRob + .8) });
    }
    machineNote(g, t, Wt('n06', 'замену') - .2, 'замена рукам, которых не хватает', 1420, 700, { size: 22 });
    g.restore();
    estamp(g, t, tRob + .8, Wt('n06', 'машины') - .1, 'ФАКТ', 1650, 880, { rot: -.05 });
    estamp(g, t, Wt('n06', 'замену'), Le('n06') + .2, 'ИНТЕРПРЕТАЦИЯ', 1560, 880, { rot: .04 });
    src(g, t, n06, Le('n06') + .4, 'Statistics Korea, 2026; IFR World Robotics (данные за 2024 г.)');
  });

  // ---------- II. ЖИТЬ ----------
  const l01 = Ls('l01');
  S('ch2', Le('n06') + .45, l01 + .1, (g, t) => chapterCard(g, t, Le('n06') + .45, l01 + .1, 'глава II', 'ЖИТЬ', 'ЧТО ЗНАЧИТ «ЖИТЬ»'));
  cue(Le('n06') + .45, 'boom', -6);
  const l02 = Ls('l02'), tFail = Wt('l02', 'проходит');
  S('define', l01, Ls('l03') + .2, (g, t) => {
    const e = env(t, l01, Ls('l03') + .2, .4, .5);
    g.save(); g.globalAlpha = e;
    drawCloud(g, cloud('android'), { x: 330, y: 600, scale: .62, reveal: ep(t, l01, l01 + 1.2), alpha: .9 });
    text(g, 'жить?', 330, 200, { font: 'Spectral', size: 64, style: 'italic', align: 'center', color: C.red, alpha: ep(t, Wt('l01', 'жить'), Wt('l01', 'жить') + .5) });
    // dictionary entry
    text(g, 'ЖИЗНЬ', 720, 300, { font: 'Unbounded', size: 64, weight: 800, alpha: ep(t, l02 - .2, l02 + .3) });
    text(g, 'рабочее определение астробиологов NASA', 724, 345, { font: 'JetBrains Mono', size: 18, color: C.inkSoft, alpha: ep(t, l02, l02 + .5) });
    const items = [['самоподдерживающаяся', Wt('l02', 'самоподдерживающаяся')], ['химическая система,', Wt('l02', 'химическая')], ['способная к дарвиновской эволюции', Wt('l02', 'дарвиновской')]];
    items.forEach((it, i) => {
      const y = 420 + i * 120;
      const p = ep(t, it[1] - .1, it[1] + .4);
      text(g, it[0], 720, y, { font: 'Spectral', size: 50, weight: 400, alpha: p });
      // AI check: cross
      const tc = tFail + .25 + i * .35;
      if (t > tc) {
        const w = measure(g, it[0], { font: 'Spectral', size: 50 });
        drawPath(g, linePts(714, y - 16, 726 + w, y - 18, 20, 2, i), ep(t, tc, tc + .4), { color: C.red, lw: 4, boil: .7 });
        text(g, '✕ ИИ', 1580, y, { font: 'JetBrains Mono', size: 30, color: C.red, alpha: ep(t, tc, tc + .3) });
      }
    });
    g.restore();
    estamp(g, t, Wt('l02', 'эволюции') + .3, tFail + .2, 'ФАКТ', 1600, 860, { rot: .05, sub: 'ОПРЕДЕЛЕНИЕ' });
    src(g, t, l02, Ls('l03'), 'NASA Astrobiology, «Forming a definition for life» (рабочее определение 1994 г.)');
  });
  cue(tFail + .25, 'pencil', -9);
  // life support: dependencies
  const l03 = Ls('l03'), tChip = Wt('l03', 'чипы'), tNL = Wt('l03', 'нидерландов'), tDC = Wt('l03', 'дата-центры');
  S('deps', l03 - .2, Le('l04') + .2, (g, t) => {
    const e = env(t, l03 - .2, Le('l04') + .2, .4, .5);
    g.save(); g.globalAlpha = e;
    const cx = 760, cy = 560;
    const pc = ep(t, l03 - .1, l03 + .6);
    g.strokeStyle = C.ink; g.lineWidth = 3; g.globalAlpha = e * pc; g.strokeRect(cx - 90, cy - 50, 180, 100); g.globalAlpha = e;
    text(g, 'ИИ', cx, cy + 22, { font: 'Unbounded', size: 56, weight: 800, align: 'center', alpha: pc });
    machineNote(g, t, l03 + .2, 'не умеет воспроизводить себя', cx - 120, cy + 110, { size: 22 });
    const deps = [
      ['ЧИПЫ', 'одна компания · Тайвань', '>90% передовых ИИ-чипов', -520, -250, tChip],
      ['ЛИТОГРАФЫ EUV', 'один поставщик · Нидерланды', '', 520, -250, tNL - .3],
      ['ЭНЕРГИЯ', '485 ТВт·ч', 'дата-центры, 2025', -520, 250, tDC],
      ['ЛЮДИ', 'решают, что запускать', '', 520, 250, tDC + 1.0],
    ];
    deps.forEach((d, i) => {
      if (t < d[5] - .3) return;
      const p = ep(t, d[5] - .3, d[5] + .5, E.ioC);
      const x = cx + d[3], y = cy + d[4];
      drawPath(g, linePts(cx + Math.sign(d[3]) * 90, cy + Math.sign(d[4]) * 30, x - Math.sign(d[3]) * 170, y, 20, 6, i), p, { color: C.inkSoft, lw: 1.5, boil: .5, dash: [6, 6] });
      text(g, d[0], x, y - 20, { font: 'JetBrains Mono', size: 22, ls: 3, color: C.red, align: 'center', alpha: p });
      text(g, d[1], x, y + 30, { font: 'Spectral', size: 38, style: 'italic', align: 'center', alpha: p });
      if (d[2]) text(g, d[2], x, y + 72, { font: 'JetBrains Mono', size: 18, color: C.inkSoft, align: 'center', alpha: p });
    });
    // brain vs data centres (l04)
    const l04 = Ls('l04'), tBrain = Wt('l04', 'мозг'), tAll = Wt('l04', 'сложите'), tThird = Wt('l04', 'трети');
    const pz = ep(t, l04 - .4, l04 + .3, E.ioC);
    if (pz > 0) {
      g.fillStyle = C.paper; g.globalAlpha = e * pz; g.fillRect(0, 110, W, H - 200); g.globalAlpha = e;
      // one brain = 20 W
      text(g, '20 Вт', 380, 440, { font: 'Unbounded', size: 110, weight: 800, align: 'center', alpha: ep(t, tBrain, tBrain + .5) });
      text(g, 'один мозг', 380, 500, { font: 'Spectral', size: 38, style: 'italic', align: 'center', alpha: ep(t, tBrain + .2, tBrain + .7) });
      text(g, '× 8,2 млрд', 380, 600, { font: 'JetBrains Mono', size: 34, align: 'center', alpha: ep(t, tAll, tAll + .4) });
      // circles: all brains vs data centres (area proportional)
      const R = 300, r = R * Math.sqrt(485 / 1437);
      const pa = ep(t, tAll, tAll + 1.0, E.ioC);
      drawPath(g, circlePts(1250, 560, R, 21, 140, .01, 1.0), pa, { color: C.ink, lw: 3, boil: .6 });
      text(g, 'все мозги людей ≈ 1 440 ТВт·ч / год', 1250, 920, { font: 'JetBrains Mono', size: 22, align: 'center', alpha: pa });
      const pd = ep(t, tThird - .6, tThird + .4);
      if (pd > 0) {
        g.fillStyle = C.blue; g.globalAlpha = e * pd * .85; g.beginPath(); g.arc(1250 + R - r - 30, 560, r * E.outB(pd), 0, TAU); g.fill(); g.globalAlpha = e;
        text(g, 'дата-центры', 1250 + R - r - 30, 548, { font: 'JetBrains Mono', size: 22, align: 'center', color: C.paper, alpha: pd });
        text(g, '485 ТВт·ч', 1250 + R - r - 30, 586, { font: 'JetBrains Mono', size: 26, align: 'center', color: C.paper, alpha: pd });
        text(g, '≈ ⅓', 1250 - 120, 580, { font: 'Unbounded', size: 90, weight: 800, align: 'center', alpha: pd });
      }
    }
    g.restore();
    estamp(g, t, tDC + 1.4, Ls('l04') - .5, 'ФАКТ', 1680, 900, { rot: .05 });
    estamp(g, t, Wt('l04', 'расчёт'), Le('l04') + .1, 'РАСЧЁТ', 380, 820, { rot: -.06, sub: '20 ВТ × 8,2 МЛРД × 8760 Ч' });
    src(g, t, l03, Ls('l04') - .3, 'Bloomberg/Pictet, 2024 (TSMC); ASML; IEA, «Energy and AI», 04.2026');
    src(g, t, Ls('l04'), Le('l04'), 'Raichle & Gusnard, PNAS 2002 (≈20% энергии тела); IEA 2026; расчёт автора');
  });
  // domesticated
  const l05 = Ls('l05');
  S('domestic', l05 - .2, Ls('l06') + .2, (g, t) => {
    const e = env(t, l05 - .2, Ls('l06') + .2, .4, .5);
    g.save(); g.globalAlpha = e;
    const l = wordsAt('l05', 'не новый вид.');
    riseWords(g, l.words, 160, 380, t, l.times, { font: 'Unbounded', size: 72, weight: 800 });
    const l2 = wordsAt('l05', 'Скорее одомашненный:');
    riseWords(g, l2.words, 160, 480, t, l2.times, { font: 'Spectral', size: 64, style: 'italic', colors: [C.ink, C.red] });
    const rows = [['кормят', 'энергией', Wt('l05', 'кормят')], ['размножают', 'копиями моделей', Wt('l05', 'размножают')], ['отбирают', 'решают, какие запускать', Wt('l05', 'отбирают')]];
    rows.forEach((r, i) => {
      const y = 620 + i * 80, p = ep(t, r[2] - .1, r[2] + .4);
      text(g, r[0], 160, y, { font: 'Spectral', size: 46, weight: 600, alpha: p });
      text(g, '— ' + r[1], 480, y, { font: 'Spectral', size: 46, style: 'italic', color: C.inkSoft, alpha: p });
    });
    drawCloud(g, cloud('android'), { x: 1450, y: 600, scale: .6, alpha: .85 });
    // leash-like tether line to a human hand position (top right)
    drawPath(g, linePts(1450, 330, 1800, 180, 30, 12, 3), ep(t, Wt('l05', 'люди') - .3, Wt('l05', 'люди') + .4, E.ioC), { color: C.red, lw: 2, boil: .6 });
    text(g, 'люди', 1810, 170, { font: 'JetBrains Mono', size: 24, color: C.red, alpha: ep(t, Wt('l05', 'люди'), Wt('l05', 'люди') + .4) });
    g.restore();
    estamp(g, t, Wt('l05', 'люди') + .3, Ls('l06'), 'ИНТЕРПРЕТАЦИЯ', 1450, 940, { rot: -.04, sub: 'ПО M. BOUDRY, PNAS 2026' });
  });
  // consciousness
  const l06 = Ls('l06'), t19 = Wt('l06', 'девятнадцать'), tNo = Wt('l06', 'сильных'), tNoBar = Wt('l06', 'преград'), tMe = Wt('l06', 'честно');
  S('conscious', l06 - .2, Le('l06') + .7, (g, t) => {
    const e = env(t, l06 - .2, Le('l06') + .7, .4, .45);
    g.save(); g.globalAlpha = e;
    text(g, 'СОЗНАНИЕ', 160, 260, { font: 'Unbounded', size: 64, weight: 800, alpha: ep(t, l06 - .1, l06 + .4) });
    text(g, '14 индикаторов из ведущих теорий · 19 авторов · 2023', 160, 310, { font: 'JetBrains Mono', size: 20, color: C.inkSoft, alpha: ep(t, t19, t19 + .5) });
    const names = ['рекуррентная обработка', 'глобальное рабочее пространство', 'метарепрезентации', 'внимание как схема', 'агентность', 'телесность', 'предсказательная обработка'];
    for (let i = 0; i < 14; i++) {
      const cx = 160 + (i % 7) * 230, cy = 420 + Math.floor(i / 7) * 200;
      const p = ep(t, t19 + i * .08, t19 + .4 + i * .08);
      g.strokeStyle = C.ink; g.lineWidth = 2; g.globalAlpha = e * p; g.strokeRect(cx, cy, 190, 150); g.globalAlpha = e;
      const q = ep(t, tNo + i * .05, tNo + .3 + i * .05);
      text(g, '?', cx + 95, cy + 105, { font: 'Spectral', size: 90, style: 'italic', align: 'center', color: i % 3 === 0 ? C.red : C.ink, alpha: q });
    }
    machineNote(g, t, tMe - .1, 'про себя я этого тоже не знаю', 300, 900, { size: 32, dur: 1.4 });
    g.restore();
    estamp(g, t, tNoBar + .2, Le('l06') + .3, 'НЕИЗВЕСТНО', 1580, 900, { rot: .05 });
    src(g, t, l06, tMe - .3, 'Butlin, Long et al., «Consciousness in Artificial Intelligence», arXiv, 08.2023');
  });

  // ---------- III. ВМЕСТО ----------
  const i01 = Ls('i01');
  S('ch3', Le('l06') + .55, i01 + .1, (g, t) => chapterCard(g, t, Le('l06') + .55, i01 + .1, 'глава III', 'ВМЕСТО', 'КАК ОДИН ВИД ЗАНИМАЕТ МЕСТО ДРУГОГО'));
  cue(Le('l06') + .55, 'boom', -6);
  S('twofig', i01, Ls('i02') + .3, (g, t) => {
    const e = env(t, i01, Ls('i02') + .3, .4, .5);
    g.save(); g.globalAlpha = e;
    drawCloud(g, cloud('human'), { x: 640, y: 590, scale: .66, reveal: ep(t, i01, i01 + 1.4) });
    drawCloud(g, cloud('android'), { x: 1280, y: 590, scale: .66, reveal: ep(t, i01 + .5, i01 + 1.9) });
    const tw = Wt('i01', 'место');
    arrow(g, 840, 590, 1080, 590, ep(t, tw - .3, tw + .4, E.ioC), { color: C.red, lw: 3, head: 18 });
    text(g, '?', 960, 560, { font: 'Spectral', size: 80, style: 'italic', align: 'center', color: C.red, alpha: ep(t, tw, tw + .4) });
    g.restore();
  });
  // survey 2778 dots
  const i02 = Ls('i02'), t5 = Wt('i02', 'пять');
  S('survey', i02 - .1, Ls('i03') + .2, (g, t) => {
    const e = env(t, i02 - .1, Ls('i03') + .2, .4, .5);
    g.save(); g.globalAlpha = e;
    text(g, 'ПУТЬ 1 · КАТАСТРОФА', 160, 230, { font: 'JetBrains Mono', size: 24, ls: 4, color: C.red, alpha: ep(t, i02, i02 + .4) });
    // 2778 researchers as dots in a field
    const pa = ep(t, Wt('i02', 'двух') - .2, Wt('i02', 'исследователей') + .5);
    const XYs = new Float32Array(5600), ALs = new Float32Array(2778);
    for (let i = 0; i < 2778; i++) {
      const cx = i % 79, cy = Math.floor(i / 79);
      XYs[2 * i] = 160 + cx * 9.5; XYs[2 * i + 1] = 300 + cy * 9.5;
      ALs[i] = clamp((pa * 1.3 - hash(i * .31) * .3 - cx / 79 * .4) * 3);
    }
    splat(g, XYs, 2778, { r: 2.1, color: RGB.ink, al: ALs });
    text(g, '2 778 исследователей ИИ · опрос 2023', 160, 680, { font: 'JetBrains Mono', size: 20, color: C.inkSoft, alpha: pa });
    // 0..100% gauge with median at 5%
    const gx = 1050, gw = 700, gy = 470;
    const pg = ep(t, Wt('i02', 'медианная') - .2, Wt('i02', 'медианная') + .5);
    g.strokeStyle = C.ink; g.lineWidth = 2; g.globalAlpha = e * pg;
    g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + gw, gy); g.stroke();
    for (let k = 0; k <= 10; k++) { g.beginPath(); g.moveTo(gx + gw * k / 10, gy - (k % 5 ? 8 : 16)); g.lineTo(gx + gw * k / 10, gy + (k % 5 ? 8 : 16)); g.stroke(); }
    g.globalAlpha = e;
    text(g, '0%', gx, gy + 50, { font: 'JetBrains Mono', size: 18, align: 'center', alpha: pg });
    text(g, '100%', gx + gw, gy + 50, { font: 'JetBrains Mono', size: 18, align: 'center', alpha: pg });
    const pm = ep(t, t5 - .4, t5 + .3, E.outB);
    if (pm > 0) {
      const mx = gx + gw * .05;
      g.fillStyle = C.red; g.beginPath(); g.moveTo(mx, gy - 14); g.lineTo(mx - 14, gy - 40); g.lineTo(mx + 14, gy - 40); g.fill();
      text(g, '5%', mx, gy - 60, { font: 'Unbounded', size: 64, weight: 800, align: 'center', color: C.red, alpha: pm });
      text(g, 'медиана: вероятность «крайне плохого исхода,', gx, gy + 120, { font: 'Spectral', size: 32, style: 'italic', alpha: pm });
      text(g, 'вплоть до вымирания человечества»', gx, gy + 162, { font: 'Spectral', size: 32, style: 'italic', alpha: pm });
    }
    const tNot = Wt('i02', 'факт');
    text(g, 'это мнение, а не измерение будущего', gx, gy + 250, { font: 'JetBrains Mono', size: 22, color: C.blue, alpha: ep(t, tNot, tNot + .5) });
    g.restore();
    estamp(g, t, t5 + .5, Ls('i03'), 'ФАКТ', 1650, 880, { rot: .05, sub: 'О МНЕНИЯХ' });
    src(g, t, i02, Ls('i03'), 'Grace et al., «Thousands of AI Authors on the Future of AI», 2024 (JAIR, 2025)');
  });
  // gradual disempowerment: three rooms, red dots replaced by blue
  const i03 = Ls('i03'), tEco = Wt('i03', 'экономика'), tGrad = Wt('i03', 'постепенным');
  S('disempower', i03 - .2, Ls('i04') + .05, (g, t) => {
    const e = env(t, i03 - .2, Ls('i04') + .05, .4, .4);
    g.save(); g.globalAlpha = e;
    text(g, 'ПУТЬ 2 · ТИХИЙ', 160, 230, { font: 'JetBrains Mono', size: 24, ls: 4, color: C.red, alpha: ep(t, i03, i03 + .4) });
    const rooms = [['ЭКОНОМИКА', 420, Wt('i03', 'экономика')], ['КУЛЬТУРА', 960, Wt('i03', 'культура')], ['ГОСУДАРСТВО', 1500, Wt('i03', 'государство')]];
    const repl = prog(t, Wt('i03', 'постепенно'), Le('i03') + .5);
    rooms.forEach((r, k) => {
      const p = ep(t, r[2] - .2, r[2] + .5);
      if (p <= 0) return;
      drawPath(g, circlePts(r[1], 560, 200, 30 + k, 120, .02, 1.0), p, { color: C.ink, lw: 2, boil: .6 });
      text(g, r[0], r[1], 820, { font: 'JetBrains Mono', size: 24, ls: 4, align: 'center', alpha: p });
      const red = [], blue = [];
      for (let i = 0; i < 160; i++) {
        const a = hash(i * 1.3 + k) * TAU, rr = Math.sqrt(hash(i * 2.7 + k * 3)) * 175;
        const x = r[1] + Math.cos(a) * rr, y = 560 + Math.sin(a) * rr;
        const flip = hash(i * 5.1 + k * 7) < repl * 1.1;
        (flip ? blue : red).push(x, y);
      }
      splat(g, new Float32Array(red), red.length / 2, { r: 4, color: RGB.red, alpha: p });
      splat(g, new Float32Array(blue), blue.length / 2, { r: 4, color: RGB.blue, alpha: p });
    });
    text(g, '● люди', 160, 940, { font: 'JetBrains Mono', size: 22, color: C.red, alpha: ep(t, tEco, tEco + .5) });
    text(g, '● машины', 320, 940, { font: 'JetBrains Mono', size: 22, color: C.blue, alpha: ep(t, tEco, tEco + .5) });
    const q = wordsAt('i03', '«постепенным лишением власти»');
    riseWords(g, q.words, W / 2, 330, t, q.times, { font: 'Spectral', size: 52, style: 'italic', align: 'center' });
    g.restore();
    estamp(g, t, tGrad + .6, Ls('i04') - .3, 'СЦЕНАРИЙ', 1620, 900, { rot: -.05 });
    src(g, t, i03, Ls('i04'), 'Kulveit et al., «Gradual Disempowerment», arXiv 2501.16946, 2025');
  });
  // Sutton
  const i04 = Ls('i04'), tVal = Wt('i04', 'ценностная');
  S('sutton', i04 - .05, Le('i04') + .8, (g, t) => {
    const e = env(t, i04 - .05, Le('i04') + .8, .4, .5);
    g.save(); g.globalAlpha = e;
    text(g, 'ПУТЬ 3 · ПЕРЕДАТЬ ЭСТАФЕТУ', 160, 230, { font: 'JetBrains Mono', size: 24, ls: 4, color: C.red, alpha: ep(t, i04, i04 + .4) });
    const l0 = wordsAt('i04', 'А кто-то не видит в смене беды.');
    riseWords(g, l0.words, 160, 330, t, l0.times, { font: 'Spectral', size: 44, style: 'italic', color: C.inkSoft });
    const l = wordsAt('i04', 'не бояться того, что ИИ придёт нам на смену');
    riseWords(g, ['«'].concat(l.words.slice(0, 4)), 160, 450, t, [l.times[0] - .1].concat(l.times.slice(0, 4)), { font: 'Spectral', size: 70, style: 'italic' });
    riseWords(g, l.words.slice(4).concat(['»']), 160, 540, t, l.times.slice(4).concat([l.times[l.times.length - 1] + .2]), { font: 'Spectral', size: 70, style: 'italic' });
    text(g, '— Ричард Саттон, лауреат премии Тьюринга', 160, 640, { font: 'JetBrains Mono', size: 26, color: C.inkSoft, alpha: ep(t, Wt('i04', 'саттон'), Wt('i04', 'саттон') + .5) });
    const pv = ep(t, tVal - .2, tVal + .5);
    text(g, 'ценностная позиция ≠ научный вывод', 160, 800, { font: 'Unbounded', size: 44, weight: 800, color: C.blue, alpha: pv });
    g.restore();
    estamp(g, t, tVal + .2, Le('i04') + .8, 'ПОЗИЦИЯ', 1560, 520, { rot: .06 });
    src(g, t, i04, Le('i04') + .6, 'Р. Саттон, доклады 2023 г. (цит. по вторичным источникам)');
  });
  // mitochondria sequence
  const m01 = Ls('m01'), tEng = Wt('m01', 'поглотила'), tFuse = Wt('m01', 'срослись');
  const m02 = Ls('m02'), tNotAlone = Wt('m02', 'сами');
  S('mito', Le('i04') + .55, Ls('m03') + .3, (g, t) => {
    const e = env(t, Le('i04') + .55, Ls('m03') + .3, .5, .5);
    g.save(); g.globalAlpha = e;
    const cell = cloud('cell'), bac = cloud('bacterium'), mit = cloud('mito');
    drawCloud(g, cell, { x: 760, y: 560, scale: .8, reveal: ep(t, Le('i04') + .6, m01 + 1.0), alpha: 1 });
    // bacterium approaches, enters, morphs into mitochondrion
    const pApp = E.ioC(prog(t, m01 + .5, tEng + .6));
    const bx = lerp(1650, 880, pApp), by = lerp(280, 640, pApp), bs = lerp(.42, .3, pApp);
    const pm = prog(t, tFuse - .8, tFuse + .6);
    drawMorph(g, bac, mit, pm, { x: bx, y: by, scale: bs }, { x: 880, y: 640, scale: .3 }, { color: RGB.red, swirl: 20, r: 1.3, step: 4 });
    // labels
    text(g, 'КЛЕТКА-ХОЗЯИН', 300, 230, { font: 'JetBrains Mono', size: 22, ls: 3, alpha: ep(t, m01, m01 + .5) });
    text(g, 'бактерия', 1540, 200, { font: 'Spectral', size: 40, style: 'italic', color: C.red, alpha: (1 - pApp) * ep(t, m01 + .3, m01 + .8) });
    text(g, '≈ 2 млрд лет назад', 300, 270, { font: 'Spectral', size: 34, style: 'italic', color: C.inkSoft, alpha: ep(t, m01 + .2, m01 + .7) });
    const pf = ep(t, tFuse, tFuse + .5);
    text(g, 'МИТОХОНДРИЯ', 1300, 520, { font: 'Unbounded', size: 56, weight: 800, color: C.red, alpha: ep(t, Wt('m02', 'митохондрии'), Wt('m02', 'митохондрии') + .5) });
    if (pf > 0) arrow(g, 1290, 540, 1000, 630, ep(t, Wt('m02', 'митохондрии'), Wt('m02', 'митохондрии') + .6, E.ioC), { color: C.red, lw: 2.5, wob: 10 });
    const rows = [['не исчезла', Wt('m02', 'исчезли'), '✓'], ['не автономна', tNotAlone, '✕']];
    rows.forEach((r, i) => {
      const p = ep(t, r[1] - .1, r[1] + .4);
      text(g, r[2] + ' ' + r[0], 1300, 640 + i * 70, { font: 'Spectral', size: 46, style: 'italic', color: i ? C.red : C.ink, alpha: p });
    });
    g.restore();
    estamp(g, t, Wt('m02', 'вашего') + .2, Ls('m03'), 'ФАКТ', 1650, 900, { rot: -.05, sub: 'ЭНДОСИМБИОЗ' });
  });
  cue(tEng, 'swarm', -9);
  // Rainey & Hochberg
  const m03 = Ls('m03'), tAuto = Wt('m03', 'автономии');
  S('rainey', m03 - .2, Ls('m04') + .2, (g, t) => {
    const e = env(t, m03 - .2, Ls('m04') + .2, .4, .5);
    g.save(); g.globalAlpha = e;
    const p = E.outE(prog(t, m03 - .2, m03 + .6));
    card(g, 220, lerp(1100, 250, p), 740, 360, { ruled: false, rot: -.02, draw: (g) => {
      text(g, 'PNAS · 2025', 44, 64, { font: 'JetBrains Mono', size: 22, ls: 3, color: C.red });
      text(g, 'Could humans and AI become', 44, 150, { font: 'Spectral', size: 42, weight: 600 });
      text(g, 'a new evolutionary individual?', 44, 200, { font: 'Spectral', size: 42, weight: 600 });
      text(g, 'P. B. Rainey, M. E. Hochberg', 44, 270, { font: 'Spectral', size: 30, style: 'italic', color: C.inkSoft });
    } });
    const q = wordsAt('m03', 'многие великие переходы шли через потерю автономии.');
    riseWords(g, ['«'].concat(q.words.slice(0, 4)), 1060, 420, t, [q.times[0] - .1].concat(q.times.slice(0, 4)), { font: 'Spectral', size: 52, style: 'italic' });
    riseWords(g, q.words.slice(4).concat(['»']), 1060, 490, t, q.times.slice(4).concat([q.times[q.times.length - 1] + .3]), { font: 'Spectral', size: 52, style: 'italic', colors: [C.ink, C.red, C.red, C.ink] });
    // human+AI as one individual: two clouds merging into one outline
    const pm = ep(t, Wt('m03', 'слиться') - .2, Wt('m03', 'единицу') + .6, E.ioC);
    drawPath(g, circlePts(1300, 760, lerp(80, 150, pm), 12, 90, .02, 1), ep(t, Wt('m03', 'слиться') - .2, Wt('m03', 'единицу') + .3), { color: C.ink, lw: 2, boil: .6 });
    g.fillStyle = C.red; g.beginPath(); g.arc(lerp(1180, 1260, pm), 760, 26, 0, TAU); g.fill();
    g.fillStyle = C.blue; g.beginPath(); g.arc(lerp(1420, 1340, pm), 760, 26, 0, TAU); g.fill();
    text(g, 'человек', lerp(1180, 1260, pm), 830, { font: 'JetBrains Mono', size: 18, align: 'center', color: C.red, alpha: pm });
    text(g, 'ИИ', lerp(1420, 1340, pm), 830, { font: 'JetBrains Mono', size: 18, align: 'center', color: C.blue, alpha: pm });
    g.restore();
    estamp(g, t, Wt('m03', 'предположили') + .3, Wt('m03', 'напомнили') - .2, 'ГИПОТЕЗА', 1650, 260, { rot: .06, sub: 'УЧЁНЫХ' });
    src(g, t, m03, Ls('m04'), 'Rainey & Hochberg, PNAS 122(37), 2025');
  });
  // who becomes whose mitochondrion
  const m04 = Ls('m04'), tWho = Wt('m04', 'кто'), tMit = Wt('m04', 'митохондрией');
  S('who', m04 - .2, Ls('f01') - 1.4, (g, t) => {
    const e = env(t, m04 - .2, Ls('f01') - 1.4, .4, .6);
    g.save(); g.globalAlpha = e;
    const l0 = wordsAt('m04', 'Значит, вопрос не в том,');
    riseWords(g, l0.words, W / 2, 250, t, l0.times, { font: 'JetBrains Mono', size: 30, align: 'center', color: C.inkSoft });
    // first: phrase 'будут ли машины жить вместо нас' crossed out
    const l = wordsAt('m04', 'будут ли машины жить вместо нас.');
    riseWords(g, l.words, W / 2, 330, t, l.times, { font: 'Spectral', size: 58, style: 'italic', align: 'center', color: C.inkSoft });
    const wl = measure(g, l.words.join(' '), { font: 'Spectral', size: 58, style: 'italic' });
    drawPath(g, linePts(W / 2 - wl / 2 - 10, 312, W / 2 + wl / 2 + 10, 318, 30, 3, 5), ep(t, Le('m04') - 2.6, Le('m04') - 2.0), { color: C.red, lw: 5, boil: .8 });
    // main question
    const q = wordsAt('m04', 'кто станет чьей митохондрией?');
    riseWords(g, q.words, W / 2, 520, t, q.times, { font: 'Unbounded', size: 84, weight: 800, align: 'center', colors: [C.ink, C.ink, C.ink, C.red] });
    // nested figures: human inside android, then android inside human
    const pShow = ep(t, tMit + .3, tMit + 1.2);
    const sw = E.ioC(prog(t, tMit + 1.6, tMit + 2.8));
    if (pShow > 0) {
      g.globalAlpha = e * pShow;
      const outerA = cloud('android'), outerH = cloud('human');
      // left pair: android large, human tiny inside (red)
      drawCloud(g, outerA, { x: 620, y: 780, scale: .36, alpha: 1 - sw * .0 });
      drawCloud(g, outerH, { x: 620, y: 770, scale: .09, color: RGB.red, r: 1.2 });
      drawCloud(g, outerH, { x: 1300, y: 780, scale: .36 });
      drawCloud(g, outerA, { x: 1300, y: 770, scale: .09, color: RGB.blue, r: 1.2 });
      text(g, 'мы — внутри машинной цивилизации', 620, 1000, { font: 'JetBrains Mono', size: 20, align: 'center', color: C.red });
      text(g, 'машины — внутри человеческой', 1300, 1000, { font: 'JetBrains Mono', size: 20, align: 'center', color: C.blue });
    }
    g.restore();
  });
  cue(tMit, 'boom', -7);

  // ---------- VERDICT ----------
  const f01 = Ls('f01');
  S('chV', f01 - 1.6, f01 + .2, (g, t) => chapterCard(g, t, f01 - 1.6, f01 + .2, '§', 'ВЕРДИКТ', ''));
  cue(f01 - 1.6, 'boom', -8);
  const f02 = Ls('f02'), tPlaus = Wt('f01', 'правдоподобно'), tOpen = Wt('f01', 'открытый'), tNotC = Wt('f02', 'подтверждается'), tDep = Wt('f02', 'зависит');
  S('verdict', f01, Ls('f03') + .4, (g, t) => {
    const e = env(t, f01, Ls('f03') + .4, .4, .5);
    g.save(); g.globalAlpha = e;
    const p = E.outE(prog(t, f01, f01 + .8));
    card(g, 220, lerp(1100, 200, p), 1480, 640, { rot: -.01, draw: (g, w, h) => {
      text(g, 'ГИПОТЕЗА № 1 · ЗАКЛЮЧЕНИЕ', 60, 70, { font: 'JetBrains Mono', size: 22, ls: 4, color: C.red });
      text(g, 'Нейросети и андроиды — наша новая веха развития.', 60, 200, { font: 'Spectral', size: 44, style: 'italic' });
      text(g, 'И, возможно, в будущем они будут жить вместо нас.', 60, 420, { font: 'Spectral', size: 44, style: 'italic' });
      highlight(g, 55, 164, measure(g, 'Нейросети и андроиды — наша новая веха развития.', { font: 'Spectral', size: 44, style: 'italic' }) * ep(t, Wt('f01', 'веха') - .2, Wt('f01', 'веха') + .6), 60, 'rgba(255,214,10,0.45)', 1);
      text(g, '→ как новый носитель информации — да; как форма жизни — открыто', 60, 280, { font: 'JetBrains Mono', size: 24, color: C.blue, alpha: ep(t, tOpen - .8, tOpen) });
      const wlen = measure(g, 'И, возможно, в будущем они будут жить вместо нас.', { font: 'Spectral', size: 44, style: 'italic' });
      drawPath(g, linePts(55, 406, 60 + wlen, 402, 30, 3, 2), ep(t, tNotC - .2, tNotC + .5), { color: C.red, lw: 5, boil: .8 });
      text(g, '→ не подтверждается: зависит от решений людей', 60, 500, { font: 'JetBrains Mono', size: 24, color: C.blue, alpha: ep(t, tDep - .3, tDep + .3) });
    } });
    g.restore();
    estamp(g, t, tPlaus, Ls('f03') + .2, 'ПРАВДОПОДОБНО', 1480, 300, { color: C.ink, rot: -.06, cue: false, scale: .8 });
    estamp(g, t, tNotC + .3, Ls('f03') + .2, 'НЕ ПОДТВЕРЖДЕНО', 1480, 720, { color: C.red, rot: .05, cue: false, scale: .8 });
  });
  cue(tPlaus, 'stamp', -3); cue(tNotC + .3, 'stamp', -3);
  // made of us
  const f03 = Ls('f03'), tMachine = Wt('f03', 'машина'), tHumanQ = Wt('f03', 'человек'), tMove = Wt('f03', 'движениях'), tFrom = Wt('f03', 'сделано');
  S('madeofus', f03 - .2, total - 6.2, (g, t) => {
    const e = env(t, f03 - .2, total - 6.2, .4, 1.0);
    g.save(); g.globalAlpha = e;
    const l1 = wordsAt('f03', 'Этот ролик сделала машина.');
    riseWords(g, l1.words, W / 2, 300, t, l1.times, { font: 'Spectral', size: 56, style: 'italic', align: 'center', alpha: 1 - ep(t, Wt('f03', 'нейросети') - .3, Wt('f03', 'нейросети') + .2) });
    const l2 = wordsAt('f03', 'Но вопрос задал человек.');
    riseWords(g, l2.words, W / 2, 380, t, l2.times, { font: 'Spectral', size: 56, style: 'italic', align: 'center', colors: [C.ink, C.ink, C.ink, C.red], alpha: 1 - ep(t, Wt('f03', 'нейросети') - .3, Wt('f03', 'нейросети') + .2) });
    // clouds: net (words) and android then everything flows into "ИЗ НАС"
    const tN = Wt('f03', 'нейросети');
    const keysF = [
      { t: tN, shape: 'net', x: 600, y: 600, scale: .7, dur: .1, reveal: t => ep(t, tN - .3, tN + .9) },
      { t: tMove + .4, shape: 'android', x: 1320, y: 600, scale: .7, dur: 1.4 },
      { t: tFrom + .6, shape: 'iznas', x: W / 2, y: 560, scale: 1.08, dur: 1.6 },
    ];
    if (t > tN - .3) cloudTrack(g, t, keysF);
    text(g, 'из наших слов', 600, 960, { font: 'JetBrains Mono', size: 24, ls: 2, align: 'center', alpha: ep(t, Wt('f03', 'слов'), Wt('f03', 'слов') + .4) * (1 - ep(t, tMove - .5, tMove)) });
    text(g, 'из наших движений', 1320, 960, { font: 'JetBrains Mono', size: 24, ls: 2, align: 'center', alpha: ep(t, tMove, tMove + .4) * (1 - ep(t, tFrom - .2, tFrom + .2)) });
    // final question
    const f04 = Ls('f04');
    const q = wordsAt('f04', 'останется ли оно нашим?');
    riseWords(g, q.words, W / 2, 860, t, q.times, { font: 'Spectral', size: 60, style: 'italic', align: 'center', colors: [C.ink, C.ink, C.ink, C.red] });
    // CTA card
    const tCta = Wt('f04', 'переписали');
    const pc = ep(t, tCta - .3, tCta + .5);
    if (pc > 0) {
      g.globalAlpha = e * pc;
      g.fillStyle = C.paper; g.fillRect(0, 120, W, 600 * pc);
      text(g, 'ВАША ВЕРСИЯ ГИПОТЕЗЫ:', 300, 400, { font: 'JetBrains Mono', size: 30, ls: 5, color: C.red });
      g.strokeStyle = C.ink; g.lineWidth = 2; g.beginPath(); g.moveTo(300, 520); g.lineTo(1620, 520); g.stroke();
      typewriter(g, 'нейросети и андроиды — это …', 300, 500, prog(t, tCta + .2, tCta + 2.0), { color: C.blue, size: 44, cursorAlways: true });
      text(g, '→ в комментарии', 300, 600, { font: 'Spectral', size: 40, style: 'italic', alpha: ep(t, Wt('f04', 'комментарии') - .3, Wt('f04', 'комментарии') + .3) });
    }
    g.restore();
  });
  cue(tFrom + .6 - 1.6, 'swarm', -6);
  // end card
  S('end', total - 6.2, total, (g, t) => {
    const a = total - 6.2, e = env(t, a, total, .8, 1.2);
    g.save(); g.globalAlpha = e;
    text(g, 'НАСЛЕДНИКИ', W / 2, 520, { font: 'Unbounded', size: 120, weight: 800, align: 'center', ls: 12 });
    text(g, 'источники и проверка фактов — в описании', W / 2, 600, { font: 'JetBrains Mono', size: 24, ls: 3, align: 'center', color: C.inkSoft });
    text(g, 'голос: ElevenLabs v3 · сценарий, анимация, музыка: Claude (Anthropic) · исходная фраза: человек', W / 2, 680, { font: 'JetBrains Mono', size: 18, ls: 1, align: 'center', color: C.inkSoft });
    g.restore();
  });
}
const confessCues = {}, threeCues = {};

// running figure, line art, procedural gait
function runner(g, t, x, y, p) {
  if (p <= 0) return;
  const ph = t * 7.5, s = 1.15;
  const hip = [x, y + 40 + Math.abs(Math.sin(ph)) * -8];
  const sh = [hip[0] + 18, hip[1] - 150];
  const head = [sh[0] + 14, sh[1] - 52];
  const leg = (o) => { const a = Math.sin(ph + o) * .8, k = Math.max(0, Math.sin(ph + o + 1.4)) * 1.2; const knee = [hip[0] + Math.sin(a) * 90 * s, hip[1] + Math.cos(a) * 90 * s]; return [hip, knee, [knee[0] + Math.sin(a - k) * 95 * s, knee[1] + Math.cos(a - k) * 95 * s]]; };
  const arm = (o) => { const a = -Math.sin(ph + o) * .9; const el = [sh[0] + Math.sin(a) * 65, sh[1] + Math.cos(a) * 65]; return [sh, el, [el[0] + Math.sin(a - 1.3) * 60, el[1] + Math.cos(a - 1.3) * 60]]; };
  g.save(); g.globalAlpha *= p;
  const o = { lw: 7, color: C.ink, boil: 1 };
  drawPath(g, leg(Math.PI), 1, { ...o, color: C.inkSoft }); drawPath(g, arm(0), 1, { ...o, color: C.inkSoft });
  drawPath(g, [hip, sh], 1, o); drawPath(g, leg(0), 1, o); drawPath(g, arm(Math.PI), 1, o);
  drawPath(g, circlePts(head[0], head[1], 30, 5, 40, .03, 1.02), 1, o);
  // speed lines
  for (let i = 0; i < 4; i++) drawPath(g, [[x - 260 - i * 20, y - 120 + i * 60], [x - 140 - i * 30, y - 120 + i * 60]], 1, { lw: 3, color: C.inkSoft, boil: 1 });
  g.restore();
}
// chess knight silhouette (line + fill)
function knight(g, x, y, p) {
  if (p <= 0) return;
  const pts = [[-70, 120], [70, 120], [60, 80], [40, 70], [45, 20], [70, -40], [60, -100], [20, -140], [-10, -150], [-20, -170], [-30, -140], [-80, -100], [-90, -60], [-60, -55], [-20, -70], [-40, -10], [-55, 40], [-50, 70], [-60, 80], [-70, 120]];
  g.save(); g.globalAlpha *= p; g.translate(x, y); g.scale(1.25, 1.25);
  g.fillStyle = C.ink; g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.fill();
  g.fillStyle = C.paper; g.beginPath(); g.arc(10, -100, 7, 0, TAU); g.fill();
  g.fillRect(-80, 120, 160, 10); g.fillStyle = C.ink; g.fillRect(-85, 126, 170, 14);
  g.restore();
}
// cloud rendered as tiny letters (the network made of our words)
const GLYPHS = 'абвгдеёжзийклмнопрстуфхцчшщыьэюяАБВГДЕЖЗИКЛМНОПРСТУФХЭЮЯ';
let GLYPH_ATLAS = null;
function glyphCloud(g, t, A, x0, y0, sc, p) {
  if (!GLYPH_ATLAS) {
    GLYPH_ATLAS = makeCanvas(GLYPHS.length * 16, 20); const gg = GLYPH_ATLAS.getContext('2d');
    gg.fillStyle = C.ink; gg.font = '500 14px "JetBrains Mono"'; gg.textBaseline = 'middle';
    for (let i = 0; i < GLYPHS.length; i++) gg.fillText(GLYPHS[i], i * 16 + 3, 10);
  }
  const n = A.p.length / 2;
  // dots for the not-yet-converted part
  let m = 0;
  for (let i = 0; i < n; i++) if (hash(i * 3.3) >= p) { XY[2 * m] = x0 + A.p[2 * i] * sc; XY[2 * m + 1] = y0 + A.p[2 * i + 1] * sc; m++; }
  splat(g, XY, m, { r: 1.45, color: RGB.ink });
  const b = Math.floor(getFrame() / 4);
  for (let i = 0; i < n; i += 2) {
    if (hash(i * 3.3) >= p) continue;
    const k = Math.floor(hash(i * 7.7 + b * .13) * GLYPHS.length);
    g.drawImage(GLYPH_ATLAS, k * 16, 0, 16, 20, x0 + A.p[2 * i] * sc - 5, y0 + A.p[2 * i + 1] * sc - 7, 11, 14);
  }
}

// ---------------- setup & frame ----------------
window.SETUP = async () => {
  PAPER = buildPaper(C.paper, false); GRAIN = buildGrain(8);
  for (const k in ASSETS) P[k] = { p: new Float32Array(ASSETS[k].p), t: new Float32Array(ASSETS[k].t) };
  buildScenes();
  window.SFX_CUES = SFX; window.TOTAL = total;
};
window.renderFrame = (f) => {
  setFrame(f); const t = f / FPS;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  g.drawImage(PAPER, 0, 0);
  for (const s of SCENES) if (t >= s.a && t < s.b) { g.save(); s.draw(g, t, s); g.restore(); }
  chrome(g, t);
  g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = .075; g.drawImage(GRAIN[Math.floor(f / 3) % GRAIN.length], 0, 0, W, H); g.restore();
};
