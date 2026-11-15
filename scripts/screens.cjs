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
  ['send-qr', '06-mandar-el-codigo'],
  ['wait', '07-esperando-el-pago'],
  ['paid', '08-ya-pago'],
  ['receipt', '09-comprobante'],
  ['new-charge', '10-nuevo-cobro'],
  ['add-person', '11-agregar-persona'],
  ['accounts', '12-cuentas-que-reciben'],
  ['account', '13-cuenta-en-espera-de-pey'],
  ['more', '14-mas-opciones'],
  ['report', '15-reporte-del-mes'],
  ['places', '16-lugares'],
  ['places-settings', '17-ajustes-de-lugares'],
  ['reg-qr', '18-codigo-para-inscribir'],
  ['review', '19-inscripciones-por-revisar'],
  ['seat', '20-aprobar-una-inscripcion'],
  ['seat-late', '21-apartado-vencido-y-cobro-rapido'],
  ['seat-leave', '22-dar-de-baja'],
  ['danger', '23-zona-de-peligro'],
  ['signup1', '24-inscripcion-paso-1'],
  ['signup2', '25-inscripcion-paso-2-imagen'],
  ['signup2-pick', '26-inscripcion-elegir-dibujo'],
  ['signup3', '27-inscripcion-paso-3'],
  ['signup4', '28-inscripcion-paso-4'],
  ['signup-done', '29-inscripcion-enviada'],
];
// Screens that need a tap to reach (text of the button to press).
const TAP = { 'seat-leave': 'Dar de baja' };

const KEEP = new Set(SHOTS.map(([, n]) => n + '.png'));

(async () => {
  const exe = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const b = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--no-sandbox'] });
  for (const [v, name] of SHOTS) {
    const p = await b.newPage();
    await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
    await p.goto(BASE + '?v=' + v, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 400));
    if (TAP[v]) {
      const all = await p.$$('button.choice');
      for (const bt of all) {
        if ((await bt.evaluate((e) => e.textContent)).includes(TAP[v])) { await bt.click(); break; }
      }
      await new Promise((r) => setTimeout(r, 300));
    }
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
  // Drop pictures from older numbering so the folder matches the list.
  for (const f of require('fs').readdirSync(OUT)) if (f.endsWith('.png') && !KEEP.has(f)) require('fs').unlinkSync(path.join(OUT, f));
})();
