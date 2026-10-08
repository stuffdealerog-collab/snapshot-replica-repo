// Core motion engine: deterministic, time-driven canvas renderer.
// Every frame is a pure function of time t (seconds), so frames can be
// rendered in any order and in parallel.
'use strict';
(() => {

const W = 1920, H = 1080, FPS = 30;

// ---------- palette ----------
const C = {
  paper: '#ebe5d8',
  paperDeep: '#e2dac9',
  ink: '#16130f',
  inkSoft: 'rgba(22,19,15,0.55)',
  inkFaint: 'rgba(22,19,15,0.18)',
  red: '#d4381c',      // living / human accent (cinnabar)
  blue: '#2341d9',     // machine accent (ultramarine signal)
  night: '#0f0e0c',
  nightPaper: '#1a1815',
  bone: '#f3eee4',
};

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const mix = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
const TAU = Math.PI * 2;

const E = {
  lin: t => t,
  inQ: t => t * t,
  outQ: t => 1 - (1 - t) * (1 - t),
  ioQ: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  outC: t => 1 - Math.pow(1 - t, 3),
  inC: t => t * t * t,
  ioC: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  outE: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  inE: t => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
  ioE: t => t === 0 ? 0 : t === 1 ? 1 : t < .5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  outB: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outEl: t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (TAU / 3)) + 1,
  ioS: t => t * t * (3 - 2 * t),
};
// eased progress helper
const ep = (t, a, b, e = E.outC) => { const v = e(prog(t, a, b)); return Math.abs(v) < 1e-6 ? 0 : v; };
// in-hold-out envelope: 0 -> 1 over [a, a+fi], 1 until b-fo, then -> 0 at b
const env = (t, a, b, fi = .4, fo = .4) => Math.min(E.outC(prog(t, a, a + fi)), 1 - E.inQ(prog(t, b - fo, b)));

// ---------- seeded random ----------
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ---------- simplex noise (2D / 3D) ----------
const Noise = (() => {
  const p = new Uint8Array(512);
  const r = rng(1337);
  const perm = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const g3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
  const F2 = .5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  function n2(xin, yin) {
    let n0 = 0, n1 = 0, n2_ = 0;
    const s = (xin + yin) * F2; const i = Math.floor(xin + s), j = Math.floor(yin + s);
    const t = (i + j) * G2; const x0 = xin - (i - t), y0 = yin - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let t0 = .5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) { const gi = g3[p[ii + p[jj]] % 12]; t0 *= t0; n0 = t0 * t0 * (gi[0] * x0 + gi[1] * y0); }
    let t1 = .5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) { const gi = g3[p[ii + i1 + p[jj + j1]] % 12]; t1 *= t1; n1 = t1 * t1 * (gi[0] * x1 + gi[1] * y1); }
    let t2 = .5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) { const gi = g3[p[ii + 1 + p[jj + 1]] % 12]; t2 *= t2; n2_ = t2 * t2 * (gi[0] * x2 + gi[1] * y2); }
    return 70 * (n0 + n1 + n2_);
  }
  function n3(x, y, z) {
    const F3 = 1 / 3, G3 = 1 / 6;
    const s = (x + y + z) * F3; const i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s);
    const t = (i + j + k) * G3; const x0 = x - (i - t), y0 = y - (j - t), z0 = z - (k - t);
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) { if (y0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=1;k2=0; } else if (x0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=0;k2=1; } else { i1=0;j1=0;k1=1;i2=1;j2=0;k2=1; } }
    else { if (y0 < z0) { i1=0;j1=0;k1=1;i2=0;j2=1;k2=1; } else if (x0 < z0) { i1=0;j1=1;k1=0;i2=0;j2=1;k2=1; } else { i1=0;j1=1;k1=0;i2=1;j2=1;k2=0; } }
    const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + .5, y3 = y0 - 1 + .5, z3 = z0 - 1 + .5;
    const ii = i & 255, jj = j & 255, kk = k & 255;
    const c = (tx, gx, gy, gz, X, Y, Z) => { let tt = .6 - X * X - Y * Y - Z * Z; if (tt < 0) return 0; tt *= tt; return tt * tt * (gx * X + gy * Y + gz * Z); };
    const gi0 = g3[p[ii + p[jj + p[kk]]] % 12], gi1 = g3[p[ii + i1 + p[jj + j1 + p[kk + k1]]] % 12];
    const gi2 = g3[p[ii + i2 + p[jj + j2 + p[kk + k2]]] % 12], gi3 = g3[p[ii + 1 + p[jj + 1 + p[kk + 1]]] % 12];
    return 32 * (c(0, ...gi0, x0, y0, z0) + c(0, ...gi1, x1, y1, z1) + c(0, ...gi2, x2, y2, z2) + c(0, ...gi3, x3, y3, z3));
  }
  return { n2, n3 };
})();

// ---------- offscreen helpers ----------
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// Paper texture: mottled base, fibres, faint vignette. Built once.
function buildPaper(base, dark) {
  const c = makeCanvas(W, H), g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  const id = g.getImageData(0, 0, W, H), d = id.data;
  const r = rng(dark ? 77 : 7);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const m = Noise.n2(x / 420, y / 420) * .55 + Noise.n2(x / 90, y / 90) * .3 + Noise.n2(x / 18, y / 18) * .15;
    const fine = (r() - .5);
    const v = (dark ? 5 : 9) * m + (dark ? 3 : 4) * fine;
    // vignette
    const dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2);
    const vig = (dx * dx * .6 + dy * dy) * (dark ? 10 : 14);
    d[i] = clamp(d[i] + v - vig, 0, 255); d[i + 1] = clamp(d[i + 1] + v - vig * 1.05, 0, 255); d[i + 2] = clamp(d[i + 2] + v - vig * 1.2, 0, 255);
  }
  g.putImageData(id, 0, 0);
  // fibres
  g.lineCap = 'round';
  for (let k = 0; k < 2600; k++) {
    const x = r() * W, y = r() * H, a = r() * TAU, l = 4 + r() * 22;
    g.strokeStyle = dark ? `rgba(255,250,235,${.015 + r() * .03})` : `rgba(90,70,40,${.02 + r() * .05})`;
    g.lineWidth = .4 + r() * .7;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + .5) * l * .5, y + Math.sin(a + .5) * l * .5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  return c;
}

// Grain frames: small noise tiles, scaled up when drawn (softer, filmic).
function buildGrain(n = 8) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const w = 960, h = 540, c = makeCanvas(w, h), g = c.getContext('2d');
    const id = g.createImageData(w, h), d = id.data, r = rng(1000 + k);
    for (let i = 0; i < d.length; i += 4) { const v = 128 + (r() + r() + r() - 1.5) * 120; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    g.putImageData(id, 0, 0); out.push(c);
  }
  return out;
}

// Pre-rendered round dot sprites for fast stipple drawing
const DotSprites = {};
function dotSprite(color, r) {
  const key = color + '|' + r;
  if (DotSprites[key]) return DotSprites[key];
  const s = Math.ceil(r * 2 + 2), c = makeCanvas(s, s), g = c.getContext('2d');
  g.fillStyle = color; g.beginPath(); g.arc(s / 2, s / 2, r, 0, TAU); g.fill();
  DotSprites[key] = c; return c;
}

// ---------- drawing primitives ----------
// "boil": hand-drawn jitter that changes on twos (every 2 frames ~ 15 fps)
let FRAME = 0;
const boilT = () => Math.floor(FRAME / 3);
function jit(x, y, seed, amp = 1.2) {
  const b = boilT();
  return [x + Noise.n3(x * .013 + seed, y * .013, b * 1.7) * amp, y + Noise.n3(x * .013, y * .013 + seed, b * 1.7 + 50) * amp];
}

function setFont(g, family, size, weight = 400, style = 'normal') {
  g.font = `${style} ${weight} ${size}px "${family}"`;
}

// text with letter-spacing and alignment
function text(g, s, x, y, o = {}) {
  g.save();
  setFont(g, o.font || 'Spectral', o.size || 48, o.weight || 400, o.style || 'normal');
  g.letterSpacing = (o.ls || 0) + 'px';
  g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'alphabetic';
  g.globalAlpha *= (o.alpha === undefined ? 1 : o.alpha);
  g.fillStyle = o.color || C.ink;
  g.fillText(s, x, y);
  g.restore();
}
function measure(g, s, o = {}) {
  g.save(); setFont(g, o.font || 'Spectral', o.size || 48, o.weight || 400, o.style || 'normal'); g.letterSpacing = (o.ls || 0) + 'px';
  const m = g.measureText(s).width; g.restore(); return m;
}

// Word-by-word rise reveal (masked). words appear at times[i] (absolute local t)
// Returns the total width.
function riseWords(g, words, x, y, t, times, o = {}) {
  const gap = o.gap !== undefined ? o.gap : (o.size || 48) * .28;
  const dur = o.dur || .45;
  const align = o.align || 'left';
  const widths = words.map(w => measure(g, w, o));
  const total = widths.reduce((a, b) => a + b, 0) + gap * (words.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const size = o.size || 48;
  for (let i = 0; i < words.length; i++) {
    const p = E.outE(prog(t, times[i], times[i] + dur));
    if (p > 0) {
      g.save();
      g.beginPath(); g.rect(cx - 10, y - size * 1.15, widths[i] + 20, size * 1.5); g.clip();
      const col = (o.colors && o.colors[i]) || o.color;
      text(g, words[i], cx, y + (1 - p) * size * 1.2, { ...o, align: 'left', color: col, alpha: (o.alpha === undefined ? 1 : o.alpha) * (o.fade ? p : 1) });
      g.restore();
    }
    cx += widths[i] + gap;
  }
  return total;
}

// Typewriter (machine voice). p in [0,1] chars revealed; cursor blinks.
function typewriter(g, s, x, y, p, o = {}) {
  const n = Math.floor(s.length * clamp(p));
  const shown = s.slice(0, n);
  text(g, shown, x, y, { font: 'JetBrains Mono', size: 28, ...o });
  if (o.cursor !== false && p < 1.0001) {
    const w = measure(g, shown, { font: 'JetBrains Mono', size: 28, ...o });
    const sz = o.size || 28;
    const on = Math.floor(FRAME / 12) % 2 === 0 || (p > 0 && p < 1);
    if (on && (o.cursorAlways || p < 1)) { g.save(); g.globalAlpha *= (o.alpha === undefined ? 1 : o.alpha); g.fillStyle = o.color || C.blue; g.fillRect(x + w + 3, y - sz * .8, sz * .55, sz * .95); g.restore(); }
  }
}

// polyline partial draw with optional boil
function pathLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
function drawPath(g, pts, p = 1, o = {}) {
  if (p <= 0 || pts.length < 2) return;
  const L = pathLen(pts) * clamp(p);
  g.save();
  g.strokeStyle = o.color || C.ink; g.lineWidth = o.lw || 2; g.lineCap = 'round'; g.lineJoin = 'round';
  g.globalAlpha *= (o.alpha === undefined ? 1 : o.alpha);
  if (o.dash) g.setLineDash(o.dash);
  g.beginPath();
  let acc = 0;
  const J = (q) => o.boil ? jit(q[0], q[1], o.seed || 0, o.boil) : q;
  let a = J(pts[0]); g.moveTo(a[0], a[1]);
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc + seg >= L) { const f = (L - acc) / seg; const q = J([lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]); g.lineTo(q[0], q[1]); break; }
    const q = J(pts[i]); g.lineTo(q[0], q[1]); acc += seg;
  }
  g.stroke(); g.restore();
}
// sample a sketchy circle as points
function circlePts(x, y, r, seed = 0, n = 90, wob = .03, over = 1.08) {
  const pts = [], rr = rng(seed + 9), a0 = rr() * TAU;
  for (let i = 0; i <= n; i++) {
    const a = a0 + (i / n) * TAU * over;
    const k = 1 + Noise.n2(Math.cos(a) * 1.3 + seed, Math.sin(a) * 1.3) * wob + (i / n) * wob * .8;
    pts.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * k]);
  }
  return pts;
}
function linePts(x1, y1, x2, y2, n = 24, wob = 0, seed = 0) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const f = i / n; const nx = -(y2 - y1), ny = x2 - x1, l = Math.hypot(nx, ny) || 1; const o = Noise.n2(f * 3 + seed, seed) * wob; pts.push([lerp(x1, x2, f) + nx / l * o, lerp(y1, y2, f) + ny / l * o]); }
  return pts;
}
function arrow(g, x1, y1, x2, y2, p, o = {}) {
  const pts = linePts(x1, y1, x2, y2, 30, o.wob || 0, o.seed || 0);
  drawPath(g, pts, p, o);
  if (p > .95) {
    const a = Math.atan2(y2 - y1, x2 - x1), s = o.head || 14;
    const hp = E.outC(prog(p, .95, 1));
    drawPath(g, [[x2 - Math.cos(a - .45) * s * hp, y2 - Math.sin(a - .45) * s * hp], [x2, y2], [x2 - Math.cos(a + .45) * s * hp, y2 - Math.sin(a + .45) * s * hp]], 1, o);
  }
}

// highlighter mark behind text
function highlight(g, x, y, w, h, p, color = 'rgba(255,214,10,0.55)', seed = 0) {
  if (p <= 0) return;
  g.save(); g.fillStyle = color; g.globalCompositeOperation = 'multiply';
  const ww = w * E.outC(clamp(p));
  g.beginPath();
  const steps = 24;
  for (let i = 0; i <= steps; i++) { const f = i / steps; g.lineTo(x + ww * f, y + Noise.n2(f * 4 + seed, 1) * h * .08); }
  for (let i = steps; i >= 0; i--) { const f = i / steps; g.lineTo(x + ww * f, y + h + Noise.n2(f * 4 + seed, 9) * h * .08); }
  g.closePath(); g.fill(); g.restore();
}

// Rubber stamp: epistemic label (ФАКТ / ПРОГНОЗ / ГИПОТЕЗА ...)
const StampCache = {};
function stampCanvas(label, color, sub) {
  const key = label + color + (sub || '');
  if (StampCache[key]) return StampCache[key];
  const fs = 46, padX = 34;
  const tmp = makeCanvas(10, 10).getContext('2d');
  setFont(tmp, 'Unbounded', fs, 800); tmp.letterSpacing = '6px';
  const tw = tmp.measureText(label).width;
  const w = Math.ceil(tw + padX * 2), h = sub ? 128 : 100;
  const c = makeCanvas(w + 20, h + 20), g = c.getContext('2d');
  g.translate(10, 10);
  g.strokeStyle = color; g.fillStyle = color;
  g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
  g.lineWidth = 2; g.strokeRect(12, 12, w - 24, h - 24);
  setFont(g, 'Unbounded', fs, 800); g.letterSpacing = '6px'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(label, w / 2 + 3, sub ? h / 2 - 12 : h / 2 + 2);
  if (sub) { setFont(g, 'JetBrains Mono', 18, 500); g.letterSpacing = '3px'; g.fillText(sub, w / 2, h / 2 + 32); }
  // ink erosion
  const id = g.getImageData(0, 0, c.width, c.height), d = id.data, r = rng(label.length * 31 + 5);
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const i = (y * c.width + x) * 4; if (!d[i + 3]) continue;
    const n = Noise.n2(x / 7 + label.length, y / 7) * .5 + Noise.n2(x / 40, y / 40 + 3) * .5;
    const k = n > .38 ? 0 : (n > .2 ? .55 : 1) * (.75 + r() * .25);
    d[i + 3] = d[i + 3] * k;
  }
  g.putImageData(id, 0, 0);
  StampCache[key] = c; return c;
}
// slam animation; t = local time since stamp begins
function stamp(g, label, x, y, t, o = {}) {
  if (t < 0) return;
  const c = stampCanvas(label, o.color || C.red, o.sub);
  const p = prog(t, 0, .22);
  const s = (o.scale || 1) * lerp(1.9, 1, E.outQ(p));
  const a = (p < 1 ? p : 1) * (o.alpha === undefined ? .92 : o.alpha);
  const rot = (o.rot !== undefined ? o.rot : -0.07);
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  g.globalAlpha *= a; g.globalCompositeOperation = 'multiply';
  g.drawImage(c, -c.width / 2, -c.height / 2);
  g.restore();
}

// Stipple: draw point cloud. pts: Float32Array [x0,y0,x1,y1,...] in local units
function dots(g, pts, o = {}) {
  const r = o.r || 1.6, col = o.color || C.ink;
  const spr = dotSprite(col, r);
  const s = spr.width / 2;
  g.save(); g.globalAlpha *= (o.alpha === undefined ? 1 : o.alpha);
  const n = pts.length / 2, upto = Math.floor(n * clamp(o.p === undefined ? 1 : o.p));
  const ox = o.x || 0, oy = o.y || 0, sc = o.scale || 1;
  for (let i = 0; i < upto; i++) g.drawImage(spr, ox + pts[2 * i] * sc - s, oy + pts[2 * i + 1] * sc - s);
  g.restore();
}

// Fast dot rasteriser: splats antialiased discs into a pixel buffer covering
// only the bounding box of the points, then composites once.
// xy: Float32Array of screen coords [x0,y0,...]; n points; optional per-point
// alpha array `al` (0..1) and radius scale array `rs`.
const SPLAT = { cache: {} };
function discKernel(r, sub) {
  const key = r.toFixed(2) + '|' + sub;
  if (SPLAT.cache[key]) return SPLAT.cache[key];
  const R = Math.ceil(r + 1.5), size = 2 * R + 1, ks = [];
  for (let sy = 0; sy < sub; sy++) for (let sx = 0; sx < sub; sx++) {
    const k = new Float32Array(size * size), ox = sx / sub, oy = sy / sub;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      // 4x4 supersampled coverage
      let cov = 0;
      for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) {
        const px = x - R + (a + .5) / 4 - ox, py = y - R + (b + .5) / 4 - oy;
        if (px * px + py * py <= r * r) cov++;
      }
      k[y * size + x] = cov / 16;
    }
    ks.push(k);
  }
  return (SPLAT.cache[key] = { R, size, ks, sub });
}
function splat(g, xy, n, o = {}) {
  const r = o.r || 1.5, col = o.color || [22, 19, 15], alpha = o.alpha === undefined ? 1 : o.alpha;
  if (n <= 0 || alpha <= 0) return;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i < n; i++) { const x = xy[2 * i], y = xy[2 * i + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const rmax = r * (o.rsMax || 1);
  const R = Math.ceil(rmax + 2);
  x0 = Math.max(0, Math.floor(x0) - R); y0 = Math.max(0, Math.floor(y0) - R);
  x1 = Math.min(W, Math.ceil(x1) + R); y1 = Math.min(H, Math.ceil(y1) + R);
  const bw = x1 - x0, bh = y1 - y0; if (bw <= 0 || bh <= 0) return;
  if (!SPLAT.acc || SPLAT.acc.length < bw * bh) SPLAT.acc = new Float32Array(W * H);
  const acc = SPLAT.acc; acc.fill(0, 0, bw * bh);
  const sub = 4;
  const kernels = {};
  for (let i = 0; i < n; i++) {
    const a = o.al ? o.al[i] : 1; if (a <= 0.002) continue;
    const rr = o.rs ? Math.max(.5, r * o.rs[i]) : r;
    const kk = o.rs ? (kernels[(rr * 4 | 0)] || (kernels[(rr * 4 | 0)] = discKernel((rr * 4 | 0) / 4, sub))) : (kernels[0] || (kernels[0] = discKernel(r, sub)));
    const x = xy[2 * i] - x0, y = xy[2 * i + 1] - y0;
    const ix = Math.floor(x), iy = Math.floor(y);
    const k = kk.ks[(Math.floor((y - iy) * sub)) * sub + Math.floor((x - ix) * sub)];
    const size = kk.size, Rk = kk.R;
    for (let ky = 0; ky < size; ky++) {
      const py = iy - Rk + ky; if (py < 0 || py >= bh) continue;
      const row = py * bw, krow = ky * size;
      for (let kx = 0; kx < size; kx++) {
        const v = k[krow + kx]; if (!v) continue;
        const px = ix - Rk + kx; if (px < 0 || px >= bw) continue;
        acc[row + px] += v * a;
      }
    }
  }
  if (!SPLAT.layer || SPLAT.layer.width < bw || SPLAT.layer.height < bh) { SPLAT.layer = makeCanvas(W, H); SPLAT.lg = SPLAT.layer.getContext('2d'); }
  const id = SPLAT.lg.createImageData(bw, bh), d = id.data;
  for (let i = 0, j = 0; i < bw * bh; i++, j += 4) {
    const v = acc[i]; if (!v) continue;
    d[j] = col[0]; d[j + 1] = col[1]; d[j + 2] = col[2]; d[j + 3] = (v > 1 ? 1 : v) * 255 * alpha;
  }
  SPLAT.lg.putImageData(id, 0, 0);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); if (o.blend) g.globalCompositeOperation = o.blend;
  g.drawImage(SPLAT.layer, 0, 0, bw, bh, x0, y0, bw, bh); g.restore();
}
const RGB = { ink: [22, 19, 15], red: [212, 56, 28], blue: [35, 65, 217], bone: [243, 238, 228], paper: [235, 229, 216] };

// camera
function cam(g, cx, cy, zoom, rot, fn) {
  g.save(); g.translate(W / 2, H / 2); g.rotate(rot || 0); g.scale(zoom, zoom); g.translate(-cx, -cy); fn(); g.restore();
}

// small caption in archival style: "РИС. 3 — ..."
function caption(g, label, s, x, y, a = 1, o = {}) {
  text(g, label, x, y, { font: 'JetBrains Mono', size: o.size || 20, weight: 500, ls: 3, color: o.labelColor || C.red, alpha: a });
  const lw = measure(g, label, { font: 'JetBrains Mono', size: o.size || 20, weight: 500, ls: 3 });
  text(g, s, x + lw + 14, y, { font: 'JetBrains Mono', size: o.size || 20, weight: 400, ls: 1, color: o.color || C.ink, alpha: a * .8 });
}

// source line at the bottom
function source(g, s, a = 1, o = {}) {
  text(g, 'ИСТОЧНИК: ' + s, o.x || 96, o.y || H - 52, { font: 'JetBrains Mono', size: 17, ls: 1.5, color: o.color || C.inkSoft, alpha: a });
}

window.ENGINE = { W, H, FPS, C, clamp, lerp, prog, mix, E, ep, env, rng, hash, Noise, makeCanvas, buildPaper, buildGrain, dotSprite, setFont, text, measure, riseWords, typewriter, pathLen, drawPath, circlePts, linePts, arrow, highlight, stamp, stampCanvas, dots, splat, RGB, cam, caption, source, TAU, setFrame: f => { FRAME = f; }, getFrame: () => FRAME };
})();
