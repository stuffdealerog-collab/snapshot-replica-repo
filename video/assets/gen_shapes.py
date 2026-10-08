"""Procedural grayscale 'engraving sources' for the stipple morph sequence.

Each image is a tonal drawing (dark = more dots). Run stipple.py on them.
usage: python3 gen_shapes.py <out_dir>
"""
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

S = 1000
rng = np.random.default_rng(3)


def canvas():
    return np.ones((S, S), dtype=np.float64)  # 1 = white


def save(a, name, out):
    Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).save(os.path.join(out, name + '.png'))


YY, XX = np.mgrid[0:S, 0:S].astype(np.float64)


def sphere(a, cx, cy, r, light=(-.55, -.6), dark=.85, rim=.15, floor=0.0):
    """Shaded ball: tone darker away from light, plus darker rim."""
    dx, dy = (XX - cx) / r, (YY - cy) / r
    d2 = dx * dx + dy * dy
    m = d2 < 1
    z = np.sqrt(np.clip(1 - d2, 0, 1))
    lam = np.clip(-(dx * light[0] + dy * light[1]) + z * .55, 0, 1)
    tone = 1 - (floor + dark * (1 - lam) ** 1.4 + rim * (d2 ** 6))
    a[m] = np.minimum(a[m], np.clip(tone[m], 0, 1))
    return a


def ring(a, cx, cy, r, w, val):
    d = np.abs(np.hypot(XX - cx, YY - cy) - r)
    m = d < w
    a[m] = np.minimum(a[m], val + (1 - val) * (d[m] / w) ** 2)


def blur(a, r):
    im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))
    return np.asarray(im, dtype=np.float64) / 255


def draw_img():
    im = Image.new('L', (S, S), 255)
    return im, ImageDraw.Draw(im)


def to_arr(im):
    return np.asarray(im, dtype=np.float64) / 255


def dna():
    a = canvas()
    im, d = draw_img()
    # helix along a diagonal axis
    L = 1.15 * S
    ang = math.radians(-58)
    ux, uy = math.cos(ang), math.sin(ang)
    vx, vy = -uy, ux
    cx, cy = S / 2, S / 2
    R = 120
    turns = 2.6
    N = 900
    strands = []
    for k in (0, math.pi):
        pts = []
        for i in range(N):
            s = (i / (N - 1) - .5) * L * .82
            th = s / (L * .82) * turns * 2 * math.pi + k
            off = R * math.sin(th)
            depth = math.cos(th)
            pts.append((cx + ux * s + vx * off, cy + uy * s + vy * off, depth))
        strands.append(pts)
    # rungs
    for i in range(0, N, 28):
        p, q = strands[0][i], strands[1][i]
        shade = int(150 + 60 * (p[2] + q[2]) / 2)
        d.line([p[:2], q[:2]], fill=shade, width=7)
    for pts in strands:
        for i in range(N - 1):
            dep = pts[i][2]
            w = int(18 + 10 * dep)
            shade = int(60 + 90 * (1 - (dep + 1) / 2))
            d.line([pts[i][:2], pts[i + 1][:2]], fill=shade, width=w)
    return blur(to_arr(im), 2)


def cell():
    a = canvas()
    sphere(a, 500, 500, 380, dark=.55, rim=.4)
    sphere(a, 560, 450, 120, dark=.95, floor=.15)
    for _ in range(14):
        th = rng.random() * 2 * math.pi
        rr = 150 + rng.random() * 170
        sphere(a, 500 + math.cos(th) * rr, 500 + math.sin(th) * rr, 18 + rng.random() * 18, dark=.9, floor=.2)
    ring(a, 500, 500, 380, 7, .1)
    return a


def colony():
    a = canvas()
    pts = [(500, 500)]
    for i in range(6):
        th = i / 6 * 2 * math.pi
        pts.append((500 + math.cos(th) * 190, 500 + math.sin(th) * 190))
    for i in range(10):
        th = (i + .5) / 10 * 2 * math.pi
        pts.append((500 + math.cos(th) * 350, 500 + math.sin(th) * 350))
    for (x, y) in sorted(pts, key=lambda p: -p[1]):
        sphere(a, x, y, 120 if (x, y) == (500, 500) else 110, dark=.8, rim=.3)
    return a


def neuron():
    im, d = draw_img()

    def branch(x, y, ang, length, width, depth):
        if depth == 0 or length < 8:
            return
        x2 = x + math.cos(ang) * length
        y2 = y + math.sin(ang) * length
        d.line([(x, y), (x2, y2)], fill=40, width=max(2, int(width)))
        n = 2 if depth > 1 else 1
        for _ in range(n):
            branch(x2, y2, ang + rng.normal(0, .45), length * (.62 + rng.random() * .2), width * .68, depth - 1)

    cx, cy = 430, 470
    for i in range(7):
        ang = i / 7 * 2 * math.pi + rng.normal(0, .2)
        if abs(math.cos(ang - .3)) > .97:
            continue
        branch(cx, cy, ang, 120, 16, 6)
    # axon
    x, y = cx, cy
    pts = []
    for i in range(60):
        x += 8 + rng.random() * 1
        y += 5 + math.sin(i / 6) * 3
        pts.append((x, y))
    d.line([(cx, cy)] + pts, fill=40, width=12)
    for k in range(4):
        branch(pts[-1][0], pts[-1][1], .5 + (k - 1.5) * .45, 50, 7, 3)
    a = blur(to_arr(im), 1.5)
    sphere(a, cx, cy, 70, dark=.95, floor=.2)
    return a


def tablet():
    a = canvas()
    im, d = draw_img()
    d.rounded_rectangle([210, 140, 790, 860], radius=70, fill=175)
    a = to_arr(im)
    # shading: darker toward bottom-right
    m = a < .99
    a[m] = a[m] - .22 * ((XX[m] - 210) / 580 * .5 + (YY[m] - 140) / 720 * .5)
    im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
    d = ImageDraw.Draw(im)
    for row in range(9):
        y = 210 + row * 70
        d.line([(250, y + 34), (750, y + 34)], fill=120, width=3)
        x = 260 + rng.random() * 20
        while x < 720:
            s = 18 + rng.random() * 14
            kind = rng.integers(0, 3)
            if kind == 0:   # horizontal wedge
                d.polygon([(x, y + 8), (x + s * 1.6, y + 14), (x, y + 20)], fill=25)
            elif kind == 1:  # vertical wedge
                d.polygon([(x, y), (x + 12, y), (x + 6, y + 28)], fill=25)
            else:            # corner wedge
                d.polygon([(x, y + 4), (x + s, y + 4), (x + 4, y + s)], fill=25)
            x += s * 1.3 + 8 + rng.random() * 14
    return blur(to_arr(im), 1)


def book():
    im, d = draw_img()
    # open book, two pages with slight perspective
    d.polygon([(110, 260), (500, 300), (500, 820), (110, 770)], fill=215)
    d.polygon([(500, 300), (890, 260), (890, 770), (500, 820)], fill=228)
    d.line([(500, 300), (500, 820)], fill=40, width=8)
    for side in (0, 1):
        for i in range(18):
            t = i / 17
            y0 = 330 + t * 400
            if side == 0:
                x1, x2 = 150, 470
                y1, y2 = y0 - 10 + t * 2, y0 + 10 - t * 2
            else:
                x1, x2 = 530, 850
                y1, y2 = y0 + 10 - t * 2, y0 - 10 + t * 2
            # justified text line made of word blocks
            x = x1
            while x < x2 - 20:
                w = 18 + rng.random() * 50
                xe = min(x + w, x2)
                f = (x - x1) / (x2 - x1)
                fe = (xe - x1) / (x2 - x1)
                d.line([(x, y1 + (y2 - y1) * f), (xe, y1 + (y2 - y1) * fe)], fill=60, width=7)
                x = xe + 10
    # drop cap
    d.rectangle([150, 330, 200, 395], fill=30)
    a = to_arr(im)
    a = blur(a, 1.2)
    # shadow under the spine
    sh = np.exp(-((XX - 500) / 40) ** 2) * ((YY > 300) & (YY < 820))
    return np.clip(a - .25 * sh, 0, 1)


def chip():
    im, d = draw_img()
    d.rectangle([260, 260, 740, 740], fill=70)
    for i in range(12):
        p = 290 + i * 38
        for (a1, b1, a2, b2) in ((p, 180, p + 16, 260), (p, 740, p + 16, 820), (180, p, 260, p + 16), (740, p, 820, p + 16)):
            d.rectangle([a1, b1, a2, b2], fill=40)
    d.rectangle([340, 340, 660, 660], fill=140)
    for i in range(8):
        for j in range(8):
            x, y = 352 + i * 38, 352 + j * 38
            d.rectangle([x, y, x + 26, y + 26], fill=60 + int(rng.random() * 60))
    a = to_arr(im)
    a[(XX > 260) & (XX < 740) & (YY > 260) & (YY < 740)] -= .1 * ((XX - 260) / 480)[(XX > 260) & (XX < 740) & (YY > 260) & (YY < 740)]
    return blur(a, 1)


def net():
    im, d = draw_img()
    layers = [4, 7, 7, 7, 3]
    pos = []
    for li, n in enumerate(layers):
        x = 150 + li * 175
        col = [(x, 500 + (j - (n - 1) / 2) * 105) for j in range(n)]
        pos.append(col)
    for li in range(len(layers) - 1):
        for p in pos[li]:
            for q in pos[li + 1]:
                d.line([p, q], fill=int(120 + rng.random() * 90), width=2)
    a = to_arr(im)
    for col in pos:
        for (x, y) in col:
            sphere(a, x, y, 34, dark=.9, floor=.1)
    return a


def mito():
    a = canvas()
    im, d = draw_img()
    d.ellipse([170, 330, 830, 670], fill=150)
    d.ellipse([200, 360, 800, 640], fill=200)
    # cristae
    for i in range(9):
        x = 250 + i * 62
        up = i % 2 == 0
        if up:
            d.rounded_rectangle([x, 362, x + 26, 560], radius=13, fill=110)
        else:
            d.rounded_rectangle([x, 440, x + 26, 638], radius=13, fill=110)
    a = to_arr(im)
    dx, dy = (XX - 500) / 330, (YY - 500) / 170
    m = dx * dx + dy * dy < 1
    a[m] -= .2 * np.clip(dx[m] * .5 + dy[m] * .5 + .4, 0, 1)
    ring(a, 500, 500, 0, 0, 1)
    return blur(np.clip(a, 0, 1), 1.5)


def bacterium():
    im, d = draw_img()
    d.rounded_rectangle([230, 400, 770, 600], radius=100, fill=120)
    a = to_arr(im)
    m = a < .99
    a[m] -= .25 * np.clip((YY[m] - 400) / 200, 0, 1)
    im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
    d = ImageDraw.Draw(im)
    # flagellum
    pts = [(770 + i * 4, 500 + 30 * math.sin(i / 7)) for i in range(50)]
    d.line(pts, fill=50, width=6)
    return blur(to_arr(im), 1.5)


if __name__ == '__main__':
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for name, fn in [('dna', dna), ('cell', cell), ('colony', colony), ('neuron', neuron), ('tablet', tablet),
                     ('book', book), ('chip', chip), ('net', net), ('mito', mito), ('bacterium', bacterium)]:
        save(fn(), name, out)
        print(name)
