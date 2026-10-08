"""Contact sheet: python3 sheet.py <dir> <out.png> [cols]  — tiles all PNGs with time labels."""
import glob, os, sys
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 3
fs = sorted(glob.glob(os.path.join(d, '*.png')))
tw, th = 640, 360
rows = (len(fs) + cols - 1) // cols
sheet = Image.new('RGB', (cols * tw, rows * (th + 24)), 'white')
dr = ImageDraw.Draw(sheet)
for i, f in enumerate(fs):
    im = Image.open(f).convert('RGB').resize((tw, th), Image.LANCZOS)
    x, y = (i % cols) * tw, (i // cols) * (th + 24)
    sheet.paste(im, (x, y + 24))
    dr.text((x + 6, y + 4), os.path.basename(f)[1:-4] + 's', fill=(200, 0, 0))
sheet.save(out)
