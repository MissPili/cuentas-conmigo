// Real-browser measurements of the simple mode (Chrome headless). usage: node render5.js <html path> [shots]
const fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer-core');
const src = path.resolve(process.argv[2]), shots = process.argv[3] === 'shots';
const outDir = path.join(__dirname, 'out'); /* wrapper page and screenshots; ignored by git */
const wrapper = path.join(outDir, 'index.html');
fs.mkdirSync(outDir, { recursive: true });
const page0 = fs.readFileSync(src, 'utf8');
// a minimal document around the fragment (the real host adds its own skeleton)
fs.writeFileSync(wrapper, '<!doctype html><html lang="es-MX"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>' + page0 + '</body></html>');

const measure = () => {
  const issues = [], stats = {}, q = s => [...document.querySelectorAll(s)];
  const ctrls = q('#screen button, #screen input, #bar button:not([aria-hidden="true"])');
  ctrls.forEach(el => { const r = el.getBoundingClientRect(); if (r.width < 48 || r.height < 48) issues.push('target ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' (' + (el.textContent.trim().slice(0, 20) || el.id) + ')'); });
  stats.minTarget = Math.min(...ctrls.map(el => { const r = el.getBoundingClientRect(); return Math.min(r.width, r.height); }).concat([999]));
  const rects = ctrls.filter(el => !el.closest('#bar')).map(el => ({ el, r: el.getBoundingClientRect() })); /* the sticky bar overlays content that scrolls under it, so bar-vs-content spacing is not measured */
  let minGap = 999;
  rects.forEach((a, i) => rects.forEach((b, j) => { if (j <= i) return;
    const ox = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), oy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    let gap = null; if (ox > 0) gap = Math.max(b.r.top - a.r.bottom, a.r.top - b.r.bottom); else if (oy > 0) gap = Math.max(b.r.left - a.r.right, a.r.left - b.r.right);
    if (gap !== null && gap >= 0) { minGap = Math.min(minGap, gap); if (gap < 8) issues.push('gap ' + Math.round(gap) + 'px between controls'); } }));
  stats.minGap = minGap === 999 ? null : Math.round(minGap);
  let maxLines = 0, longest = '';
  q('#screen h1, #screen .txt, #screen .to2, #screen small, #screen dd, #screen .qrnote, #screen .cl, #screen .notice2 span, #screen .alertbox span').forEach(el => {
    const cs = getComputedStyle(el), lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3, lines = Math.round(el.getBoundingClientRect().height / lh);
    if (lines > maxLines) { maxLines = lines; longest = el.textContent.trim().slice(0, 40); }
    if (lines > 2) issues.push(lines + ' lines: "' + el.textContent.trim().slice(0, 50) + '"');
  });
  stats.maxLines = maxLines;
  let minFont = 999, minWhere = '';
  const w = document.createTreeWalker(document.querySelector('#pane-cobrar'), NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const n = w.currentNode; if (!n.textContent.trim()) continue; const p = n.parentElement; if (p.closest('svg')) continue; const fs = parseFloat(getComputedStyle(p).fontSize); if (fs < minFont) { minFont = fs; minWhere = n.textContent.trim().slice(0, 20); } }
  stats.minFont = Math.round(minFont * 10) / 10; if (minFont < 20) issues.push('font ' + minFont + 'px: "' + minWhere + '"');
  const phone = document.querySelector('#phone'), pr = phone.getBoundingClientRect();
  q('#pane-cobrar *').forEach(el => { const r = el.getBoundingClientRect(); if (r.width && r.right > pr.right + 1 && !el.closest('svg')) issues.push('overflows right: ' + el.tagName + '.' + el.className); });
  const scr = document.querySelector('#screen'); if (scr.scrollWidth > scr.clientWidth + 1) issues.push('horizontal scroll in screen');
  const head = document.querySelector('#stephead').offsetHeight, bar = document.querySelector('#bar').offsetHeight;
  const lastEl = scr.lastElementChild; stats.contentH = Math.round(head + (lastEl ? lastEl.getBoundingClientRect().bottom - scr.getBoundingClientRect().top : 0) + 20 + bar);
  stats.phoneW = Math.round(pr.width);
  return { issues, stats };
};

async function sc(page, js) { return page.evaluate(js); }
const clickAct = (a, extra) => `(() => { const b = document.querySelector('#screen [data-act="${a}"]${extra || ''}'); if(!b) throw new Error('no ${a}'); b.click(); })()`;
const typeAmt = v => `(() => { const i = document.querySelector('#amt'); i.value = '${v}'; i.dispatchEvent(new Event('input', {bubbles:true})); })()`;
const barClick = id => `document.querySelector('${id}').click()`;
const preset = id => `document.querySelector('[data-preset="${id}"]').click()`;

const typeIn = (sel, v) => `(() => { const i = document.querySelector('${sel}'); i.value = '${v}'; i.dispatchEvent(new Event('input', {bubbles:true})); })()`;
const GOREG = `location.hash = 'inscripcion'; window.dispatchEvent(new Event('hashchange'))`;
const GOCOB = `location.hash = 'cobrar'; window.dispatchEvent(new Event('hashchange'))`;
/* a full registration: name, phone, helpers (the last one goes with "Seguir"), consent; sends it when send is true */
const REGFULL = (helpers, send, name, tel) => GOREG + ';' + `(document.querySelector('#screen [data-act="rg-again"]') || {click(){}}).click()` + ';' + typeIn('#rg-n', name || 'Maria Guadalupe') + ';' + clickAct('rg-next') + ';' + typeIn('#rg-t', tel || '5512345678') + ';' + clickAct('rg-next') + ';' +
  helpers.map((h, i) => typeIn('#rg-h', h) + ';' + (i < helpers.length - 1 ? clickAct('rg-add') + ';' : '')).join('') + clickAct('rg-next') + (send ? ';' + `document.querySelector('#rg-ok').checked = true;` + clickAct('rg-send') : '');

const SCREENS = [
  ['home', ''],
  ['who', clickAct('start')],
  ['menu', clickAct('start') + ';' + `document.querySelectorAll('#screen .pickrow')[0].click()`],
  ['how', clickAct('start') + ';' + `document.querySelectorAll('#screen .pickrow')[0].click();` + clickAct('period')],
  ['pay-qr', clickAct('start') + ';' + `document.querySelectorAll('#screen .pickrow')[0].click();` + clickAct('period') + ';' + clickAct('via', '[data-v="qr"]')],
  ['pay-cash', clickAct('start') + ';' + `document.querySelectorAll('#screen .pickrow')[0].click();` + clickAct('period') + ';' + clickAct('via', '[data-v="cash"]')],
  ['pay-fam', clickAct('start') + ';' + `document.querySelectorAll('#screen .pickrow')[0].click();` + clickAct('period') + ';' + clickAct('via', '[data-v="fam"]')],
  ['done', clickAct('start') + ';' + `document.querySelectorAll('#screen .pickrow')[0].click();` + clickAct('period') + ';' + clickAct('via', '[data-v="cash"]') + ';' + clickAct('cash-ok')],
  ['months', clickAct('start') + ';' + `document.querySelectorAll('#screen .pickrow')[0].click();` + clickAct('months')],
  ['exit', clickAct('start') + ';' + `document.querySelectorAll('#screen .pickrow')[0].click();` + barClick('#bar-cancel')],
  ['access', clickAct('access')],
  ['error', `document.querySelector('#simfail').click();` + clickAct('start') + ';' + `document.querySelectorAll('#screen .pickrow')[0].click();` + clickAct('period') + ';' + clickAct('via', '[data-v="qr"]')],
  ['tanda-home', preset('tanda')],
  ['tienda-who', preset('tienda') + ';' + clickAct('start')],
  ['tienda-ledger', preset('tienda') + ';' + clickAct('start') + ';' + `document.querySelectorAll('#screen .pickrow')[0].click()`],
  ['tienda-amount-cargo', preset('tienda') + ';' + clickAct('start') + ';' + `document.querySelectorAll('#screen .pickrow')[0].click();` + clickAct('ledger-do', '[data-m="cargo"]')],
  ['tienda-amount-err', preset('tienda') + ';' + clickAct('start') + ';' + `document.querySelectorAll('#screen .pickrow')[0].click();` + clickAct('ledger-do', '[data-m="cargo"]') + ';' + clickAct('amt-next')],
  ['tienda-confirm', preset('tienda') + ';' + clickAct('start') + ';' + `document.querySelectorAll('#screen .pickrow')[0].click();` + clickAct('ledger-do', '[data-m="cargo"]') + ';' + typeAmt('1,250') + ';' + clickAct('amt-next')],
  ['tienda-abono', preset('tienda') + ';' + clickAct('start') + ';' + `document.querySelectorAll('#screen .pickrow')[0].click();` + clickAct('ledger-do', '[data-m="abono"]')],
  ['combo-menu', preset('taller') + ';' + `document.querySelector('#ft-ledger').click();` + clickAct('start') + ';' + `document.querySelectorAll('#screen .pickrow')[0].click()`],
  /* v7: registration, places, receipt */
  ['reg-1', GOREG],
  ['reg-2', GOREG + ';' + typeIn('#rg-n', 'Maria Guadalupe Hernandez') + ';' + clickAct('rg-next')],
  ['reg-3', GOREG + ';' + typeIn('#rg-n', 'Maria') + ';' + clickAct('rg-next') + ';' + typeIn('#rg-t', '5512345678') + ';' + clickAct('rg-next') + ';' + typeIn('#rg-h', '5598765432') + ';' + clickAct('rg-add')],
  ['reg-4', REGFULL(['5598765432', '5511112222', '5533334444'], false)],
  ['reg-done', REGFULL(['5598765432'], true)],
  ['home-review', REGFULL(['5598765432'], true) + ';' + REGFULL([], true, 'Ana Luz', '5500001111') + ';' + REGFULL([], true, 'Eva Sol', '5500002222') + ';' + GOCOB],
  ['regs', REGFULL(['5598765432'], true) + ';' + GOCOB + ';' + clickAct('regs')],
  ['regdetail', REGFULL(['5598765432', '5511112222', '5533334444'], true) + ';' + GOCOB + ';' + clickAct('regs') + ';' + clickAct('reg-open')],
  ['regqr', clickAct('regs') + ';' + clickAct('regqr')],
  ['done-cash-undo', clickAct('start') + ';' + `document.querySelectorAll('#screen .pickrow')[0].click();` + clickAct('period') + ';' + clickAct('via', '[data-v="cash"]') + ';' + clickAct('cash-ok')],
  ['how-blocked', `PCF.project().people[0].extra = null;` + clickAct('start') + ';' + `document.querySelectorAll('#screen .pickrow')[0].click();` + `document.querySelector('#screen [data-act="period"][data-p="x"]').click()`],
  ['receipt', clickAct('start') + ';' + `document.querySelectorAll('#screen .pickrow')[0].click();` + clickAct('period') + ';' + clickAct('via', '[data-v="fam"]') + ';' + clickAct('sim') + ';' + clickAct('receipt')]
];

(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, args: ['--no-sandbox'] });
  let bad = 0;
  const runs = [
    { name: 'iPhone 390x844', w: 390, h: 844, safe: 81, xl: false, theme: 'light' },
    { name: 'iPhone SE 375x667', w: 375, h: 667, safe: 20, xl: false, theme: 'light' },
    { name: 'Letra extra grande 390x844', w: 390, h: 844, safe: 81, xl: true, theme: 'light' }
  ];
  for (const run of runs) {
    console.log('\n=== ' + run.name + ' ===');
    for (const [name, js] of SCREENS) {
      const page = await browser.newPage();
      await page.setViewport({ width: run.w, height: run.h, deviceScaleFactor: 2 });
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: run.theme }]);
      await page.goto('file:///' + wrapper.replace(/\\/g, '/'), { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
      await page.addStyleTag({ content: '.top,.panel{display:none!important} body{padding:0!important} .phone{min-height:100vh!important;border:0!important;border-radius:0!important;max-width:none!important}' });
      await page.evaluate(() => document.fonts && document.fonts.ready);
      if (run.xl) await page.evaluate(() => { document.documentElement.setAttribute('data-text', 'xl'); });
      try { if (js) await sc(page, js); } catch (e) { console.log('SKIP ' + name + ': ' + e.message); await page.close(); continue; }
      await new Promise(r => setTimeout(r, 120));
      const m = await page.evaluate(measure);
      const fit = m.stats.contentH <= run.h - run.safe;
      const tag = m.issues.length ? 'FAIL' : 'ok  ';
      if (m.issues.length) bad++;
      console.log(tag + ' ' + name.padEnd(20) + ' target>=' + Math.round(m.stats.minTarget) + 'px gap>=' + m.stats.minGap + ' font>=' + m.stats.minFont + 'px lines<=' + m.stats.maxLines + ' height ' + m.stats.contentH + (fit ? ' fits' : ' scrolls') + (m.issues.length ? '\n     ' + [...new Set(m.issues)].slice(0, 6).join('\n     ') : ''));
      if (shots && run.name.startsWith('iPhone 390')) await page.screenshot({ path: path.join(outDir, name + '.png'), clip: await page.evaluate(() => { const r = document.querySelector('#phone').getBoundingClientRect(); return { x: Math.max(0, r.x - 8), y: Math.max(0, r.y + window.scrollY - 8), width: r.width + 16, height: Math.min(r.height, 1100) + 16 }; }) });
      await page.close();
    }
  }
  await browser.close();
  console.log('\n' + (bad ? bad + ' screen(s) with issues' : 'no layout issues found'));
  process.exitCode = bad ? 1 : 0;
})();
