// Takes the screenshots used in README.md from the demo harness (invented data, no server).
// Usage: npm run dev (in another terminal), then: node scripts/screens.cjs
// Needs Google Chrome (CHROME_PATH changes its location) and the puppeteer-core in prototype/tests.
const path = require('path');
const puppeteer = require(path.join(__dirname, '..', 'prototype', 'tests', 'node_modules', 'puppeteer-core'));

const BASE = process.env.DEMO_URL || 'http://localhost:5173/demo/index.html';
const OUT = path.join(__dirname, '..', 'docs', 'pantallas');
const SHOTS = [
  ['projects', '01-proyectos'],
  ['home', '02-inicio-del-proyecto'],
  ['who', '03-quien-paga'],
  ['person', '04-cobros-de-una-persona'],
  ['charge', '05-como-cobrar'],
  ['qr', '06-codigo-qr'],
  ['send-qr', '07-mandar-el-codigo'],
  ['wait', '08-esperando-el-pago'],
  ['paid', '09-ya-pago'],
  ['receipt', '10-comprobante'],
  ['new-charge', '11-nuevo-cobro'],
  ['add-person', '12-agregar-persona'],
  ['more', '13-mas-opciones'],
  ['more2', '14-mas-opciones-2'],
  ['people', '15-personas'],
  ['report', '16-reporte-del-mes'],
  ['accounts', '17-cuentas-que-reciben'],
  ['account', '18-cuenta-en-espera-de-pey'],
  ['places', '19-lugares'],
  ['places-settings', '20-ajustes-de-lugares'],
  ['reg-qr', '21-codigo-para-inscribir'],
  ['review', '22-inscripciones-por-revisar'],
  ['seat', '23-aprobar-una-inscripcion'],
  ['seat-late', '24-apartado-vencido-y-cobro-rapido'],
  ['seat-leave', '25-dar-de-baja'],
  ['danger', '26-zona-de-peligro'],
  ['new-project', '27-nuevo-proyecto'],
  ['signup1', '28-inscripcion-paso-1'],
  ['signup2', '29-inscripcion-paso-2-imagen'],
  ['signup2-pick', '30-inscripcion-elegir-dibujo'],
  ['signup3-choose', '31-inscripcion-paso-3-como-pagas'],
  ['signup3', '32-inscripcion-paso-3'],
  ['signup4', '33-inscripcion-paso-4'],
  ['signup-done', '34-inscripcion-enviada'],
  ['problem', '35-no-se-pudo-pedir-el-pago'],
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
