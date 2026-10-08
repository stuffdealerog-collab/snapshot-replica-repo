// Frame renderer: drives index.html in headless Chromium.
//   node render.js video <fromFrame> <toFrame> <out.mp4>
//   node render.js stills <outDir> <t1,t2,...>          (times in seconds)
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const FPS = 30;
const page_url = 'file://' + path.join(__dirname, 'index.html');

async function open() {
  const browser = await chromium.launch({ args: ['--disable-gpu', '--font-render-hinting=none', '--disable-web-security', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text()); });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  await page.goto(page_url);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 45000 });
  return { browser, page };
}

async function grab(page, frame, fmt = 'image/jpeg') {
  const d = await page.evaluate(([f, fmt]) => { window.renderFrame(f); return document.getElementById('c').toDataURL(fmt, 0.96); }, [frame, fmt]);
  return Buffer.from(d.slice(d.indexOf(',') + 1), 'base64');
}

(async () => {
  const mode = process.argv[2];
  const { browser, page } = await open();
  if (mode === 'stills') {
    const outDir = process.argv[3];
    fs.mkdirSync(outDir, { recursive: true });
    const times = process.argv[4].split(',').map(Number);
    for (const t of times) {
      const f = Math.round(t * FPS);
      fs.writeFileSync(path.join(outDir, `t${t.toFixed(2).padStart(7, '0')}.png`), await grab(page, f, 'image/png'));
    }
  } else if (mode === 'video') {
    const from = +process.argv[3], to = +process.argv[4], out = process.argv[5];
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', process.env.PRESET || 'medium', '-crf', process.env.CRF || '16', '-pix_fmt', 'yuv420p', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let f = from; f < to; f++) {
      const buf = await grab(page, f);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if ((f - from) % 300 === 0) console.log(`[${out}] frame ${f} / ${to}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    console.log(`[${out}] done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
