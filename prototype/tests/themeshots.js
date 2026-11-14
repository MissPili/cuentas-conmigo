const fs = require('fs'), path = require('path'); const puppeteer = require('puppeteer-core');
const wrapper = process.argv[2], out = process.argv[3];
const click = a => `document.querySelector('#screen [data-act="${a}"]').click()`;
const first = `document.querySelectorAll('#screen .pickrow')[0].click()`;
const SHOTS = [
  ['hc-who', 'hc', '', click('start')],
  ['hc-payqr', 'hc', '', click('start') + ';' + first + ';' + click('period') + ';document.querySelector(\'[data-v="qr"]\').click()'],
  ['dark-how', 'dark', '', click('start') + ';' + first + ';' + click('period')],
  ['dark-access', 'dark', '', click('access')],
  ['xl-who', 'light', 'xl', click('start')],
  ['xl-access', 'light', 'xl', click('access')]
];
(async () => {
  const b = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, args: ['--no-sandbox'] });
  for (const [name, theme, xl, js] of SHOTS) {
    const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme === 'dark' ? 'dark' : 'light' }]);
    await p.goto('file:///' + wrapper.replace(/\\/g, '/'), { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
    await p.addStyleTag({ content: '.top,.panel{display:none!important} body{padding:0!important} .phone{min-height:100vh!important;border:0!important;border-radius:0!important;max-width:none!important}' });
    await p.evaluate(() => document.fonts.ready);
    if (theme === 'hc') await p.evaluate(() => document.documentElement.setAttribute('data-contrast', 'high'));
    if (xl) await p.evaluate(() => document.documentElement.setAttribute('data-text', 'xl'));
    await p.evaluate(js); await new Promise(r => setTimeout(r, 150));
    await p.screenshot({ path: path.join(out, name + '.png') }); await p.close();
  }
  await b.close(); console.log('shots done');
})();
