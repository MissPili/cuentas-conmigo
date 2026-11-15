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
  ['report', '13-reporte-del-mes'],
  ['places', '14-lugares'],
  ['review', '15-inscripciones-por-revisar'],
  ['seat', '16-aprobar-una-inscripcion'],
  ['seat-late', '17-apartado-vencido'],
  ['reg-qr', '18-codigo-para-inscribir'],
  ['places-settings', '19-ajustes-de-lugares'],
  ['signup1', '20-inscripcion-paso-1'],
  ['signup2', '21-inscripcion-paso-2'],
  ['signup3', '22-inscripcion-paso-3'],
  ['signup4', '23-inscripcion-paso-4'],
  ['signup-done', '24-inscripcion-lista'],
  ['send-qr', '25-mandar-el-codigo'],
];

(async () => {
  const exe = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const b = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--no-sandbox'] });
  for (const [v, name] of SHOTS) {
    const p = await b.newPage();
    await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
    await p.goto(BASE + '?v=' + v, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 400));
    if (v === 'signup-done') {
      await p.click('.check input');
      const buttons = await p.$$('button.choice');
      await buttons[0].click();
      await new Promise((r) => setTimeout(r, 500));
    }
    await p.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true });
    await p.close();
    console.log('ok', name);
  }
  await b.close();
})();
