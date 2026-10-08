// dump SFX cues + chapter boundaries collected by scenes.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ args: ['--disable-gpu'] }); const p = await b.newPage();
  const warns = []; p.on('console', m => { if (m.type() === 'warning') warns.push(m.text()); });
  p.on('pageerror', e => console.error('ERR', e.message));
  await p.goto('file://' + __dirname + '/index.html'); await p.waitForFunction(() => window.READY === true);
  const r = await p.evaluate(() => ({ sfx: window.SFX_CUES, total: window.TOTAL }));
  require('fs').writeFileSync(process.argv[2], JSON.stringify(r, null, 1));
  console.log('cues', r.sfx.length, 'total', r.total); if (warns.length) console.log('WARN', [...new Set(warns)].join(' | '));
  await b.close();
})();
