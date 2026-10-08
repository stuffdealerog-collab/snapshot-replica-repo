"""Contact sheets from a finished video: python3 review_sheets.py <video.mp4> <out_dir> [step_s]"""
import os, subprocess, sys
from PIL import Image, ImageDraw
src, out = sys.argv[1], sys.argv[2]
step = float(sys.argv[3]) if len(sys.argv) > 3 else 3
os.makedirs(out, exist_ok=True)
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src], capture_output=True, text=True).stdout)
frames = os.path.join(out, 'f')
os.makedirs(frames, exist_ok=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-vf', f'fps=1/{step},scale=480:270', os.path.join(frames, '%04d.png')], check=True)
fs = sorted(os.listdir(frames))
per, cols = 20, 5
for k in range(0, len(fs), per):
    part = fs[k:k + per]
    sheet = Image.new('RGB', (cols * 480, ((len(part) + cols - 1) // cols) * 290), 'white')
    dr = ImageDraw.Draw(sheet)
    for i, f in enumerate(part):
        t = (k + i) * step + step / 2
        x, y = (i % cols) * 480, (i // cols) * 290
        sheet.paste(Image.open(os.path.join(frames, f)), (x, y + 20))
        dr.text((x + 4, y + 3), f'{int(t // 60)}:{t % 60:04.1f}', fill=(200, 0, 0))
    sheet.save(os.path.join(out, f'sheet_{k // per:02d}.png'))
print('frames', len(fs), 'sheets', (len(fs) + per - 1) // per, 'duration', dur)
