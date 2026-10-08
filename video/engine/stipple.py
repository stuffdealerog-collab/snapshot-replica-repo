"""Weighted Voronoi stippling (Secord 2002) -> point clouds for the renderer.

usage: python3 stipple.py <image> <n_points> <out.json> [--size 900] [--iters 40] [--gamma 1.3]

Points are written in pixel units of a box `size` wide (aspect preserved),
centred on (0,0), ordered along a Hilbert curve so that two clouds with the
same number of points morph coherently when matched by index.
"""
import argparse
import json

import numpy as np
from PIL import Image, ImageOps
from scipy.spatial import cKDTree


def hilbert_index(x, y, order=16):
    """Hilbert curve distance for integer coords in [0, 2^order)."""
    n = 1 << order
    d = np.zeros_like(x, dtype=np.int64)
    x = x.astype(np.int64).copy()
    y = y.astype(np.int64).copy()
    s = n >> 1
    while s > 0:
        rx = ((x & s) > 0).astype(np.int64)
        ry = ((y & s) > 0).astype(np.int64)
        d += s * s * ((3 * rx) ^ ry)
        # rotate
        mask = ry == 0
        flip = mask & (rx == 1)
        x[flip] = s - 1 - x[flip]
        y[flip] = s - 1 - y[flip]
        x[mask], y[mask] = y[mask].copy(), x[mask].copy()
        s >>= 1
    return d


def stipple(path, n, size=900, iters=40, gamma=1.3, seed=0, invert=False, thresh=0.04):
    im = Image.open(path).convert('L')
    if invert:
        im = ImageOps.invert(im)
    w0, h0 = im.size
    scale = size / max(w0, h0)
    W, H = max(1, int(w0 * scale)), max(1, int(h0 * scale))
    im = im.resize((W, H), Image.LANCZOS)
    dens = (1.0 - np.asarray(im, dtype=np.float64) / 255.0) ** gamma
    ys, xs = np.mgrid[0:H, 0:W]
    pix = np.stack([xs.ravel() + .5, ys.ravel() + .5], 1)
    w = dens.ravel()
    keep = w > thresh
    pix, w = pix[keep], w[keep]
    rng = np.random.default_rng(seed)
    idx = rng.choice(len(pix), n, replace=len(pix) < n, p=w / w.sum())
    pts = pix[idx] + rng.random((n, 2)) - .5
    for _ in range(iters):
        _, lab = cKDTree(pts).query(pix, workers=-1)
        sw = np.bincount(lab, weights=w, minlength=n)
        sx = np.bincount(lab, weights=w * pix[:, 0], minlength=n)
        sy = np.bincount(lab, weights=w * pix[:, 1], minlength=n)
        ok = sw > 0
        pts[ok, 0] = sx[ok] / sw[ok]
        pts[ok, 1] = sy[ok] / sw[ok]
    # local darkness per point -> can drive dot radius
    xi = np.clip(pts[:, 0].astype(int), 0, W - 1)
    yi = np.clip(pts[:, 1].astype(int), 0, H - 1)
    tone = dens[yi, xi]
    hi = hilbert_index((pts[:, 0] / W * 65535).astype(np.int64), (pts[:, 1] / H * 65535).astype(np.int64))
    order = np.argsort(hi)
    pts, tone = pts[order], tone[order]
    pts[:, 0] -= W / 2
    pts[:, 1] -= H / 2
    return pts, tone, (W, H)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('image')
    ap.add_argument('n', type=int)
    ap.add_argument('out')
    ap.add_argument('--size', type=int, default=900)
    ap.add_argument('--iters', type=int, default=40)
    ap.add_argument('--gamma', type=float, default=1.3)
    ap.add_argument('--invert', action='store_true')
    ap.add_argument('--thresh', type=float, default=0.04)
    a = ap.parse_args()
    pts, tone, (W, H) = stipple(a.image, a.n, a.size, a.iters, a.gamma, invert=a.invert, thresh=a.thresh)
    with open(a.out, 'w') as f:
        json.dump({'w': W, 'h': H, 'n': a.n,
                   'p': [round(float(v), 1) for v in pts.ravel()],
                   't': [round(float(v), 2) for v in tone]}, f, separators=(',', ':'))
    print(f'{a.out}: {a.n} pts, box {W}x{H}')
