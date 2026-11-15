// Takes the screenshots used in README.md from the demo harness (invented data, no server).
// Usage: npm run dev (in another terminal), then: node scripts/screens.cjs
// Needs Google Chrome (CHROME_PATH changes its location) and the puppeteer-core in prototype/tests.
const path = require('path');
const puppeteer = require(path.join(__dirname, '..', 'prototype', 'tests', 'node_modules', 'puppeteer-core'));

const BASE = process.env.DEMO_URL || 'http://localhost:5173/demo/index.html';
const OUT = path.join(__dirname, '..', 'docs', 'pantallas');
const SHOTS = [
  ['home', '01-inicio'],
  ['who', '02-quien-paga'],
  ['person', '03-cobros-de-una-persona'],
  ['charge', '04-como-cobrar'],
  ['qr', '05-codigo-qr'],
  ['wait', '06-esperando-el-pago'],
  ['paid', '07-ya-pago'],
  ['receipt', '08-comprobante'],
  ['accounts', '09-cuentas-que-reciben'],
  ['account', '10-cuenta-en-espera-de-pey'],
  ['add-person', '11-agregar-persona'],
  ['new-charge', '12-nuevo-cobro'],
];

(async () => {
  const exe = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const b = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--no-sandbox'] });
  for (const [v, name] of SHOTS) {
    const p = await b.newPage();
    await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
    await p.goto(BASE + '?v=' + v, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 400));
    await p.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true });
    await p.close();
    console.log('ok', name);
  }
  await b.close();
})();
