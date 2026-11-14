const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync(process.argv[2], 'utf8');
const errs = [];
const dom = new JSDOM('<!doctype html><html><head></head><body>' + html.replace(/<link[^>]*>/g, '') + '</body></html>', {
  runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://x.test/',
  beforeParse(w) { w.addEventListener('error', e => errs.push('ERR ' + e.message)); w.HTMLElement.prototype.scrollIntoView = function () {}; }
});
const w = dom.window, d = w.document;
const $ = s => d.querySelector(s), $$ = s => [...d.querySelectorAll(s)];
const click = el => { if (!el) throw new Error('missing element'); el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); };
const ev = (el, t) => el.dispatchEvent(new w.Event(t, { bubbles: true }));
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const txt = s => $(s).textContent;
const preset = id => click($('[data-preset="' + id + '"]'));
const setv = (el, v) => { el.value = v; ev(el, 'input'); };
// independent CLABE check digit so the test does not reuse the page's code
function mk(b17) { const w3 = [3, 7, 1]; let s = 0; for (let i = 0; i < 17; i++) s += (+b17[i] * w3[i % 3]) % 10; return b17 + ((10 - s % 10) % 10); }

setTimeout(() => {
  try {
    // taller preset: two accounts, monthly to the workshop, annual to the DIF
    ok($$('#cfg-recv .prow').length === 2, 'taller: two receiving accounts listed');
    ok(/CLABE •••• \d{4}/.test(txt('#cfg-recv')) && /Cuenta por confirmar/.test(txt('#cfg-recv')), 'list shows masked CLABE and the pending account');
    ok(!/\d{14}/.test(txt('#cfg-recv')), 'full CLABE is never shown in the list');
    ok($('#d-main').value === 'r1' && $('#d-extra').value === 'r2', 'monthly -> workshop account, annual -> DIF account');
    ok(!$('#d-ledger'), 'no destination selector for features that are off');

    // the app shows who receives
    click($$('.person')[0]);
    click($$('#screen .tile.due,#screen .tile.future')[0]);
    ok(/El dinero llega a\s*Cuenta de prueba del taller/.test(txt('#screen')) && !/Cuenta por confirmar/.test(txt('#screen')), 'monthly charge: money goes to the workshop account');
    click($('[data-act="cancel"]'));
    // find a person whose annual payment is still open
    click($('[data-act="back"]'));
    const openAnnual = () => { const ps = $$('.person'); for (let i = 0; i < ps.length; i++) { click($$('.person')[i]); if (!$('#screen .annual.paid')) return i; click($('[data-act="back"]')); } return -1; };
    const who = openAnnual(); ok(who >= 0, 'found a person with an open annual charge (index ' + who + ')');
    click($('[data-act="period"][data-p="x"]'));
    ok(/El dinero llega a\s*DIF/.test(txt('#screen')) && /Cuenta por confirmar/.test(txt('#screen')), 'annual charge: goes to DIF and flags the account as pending');
    click($('[data-act="simulate"]'));
    ok(/Recibe/.test(txt('#screen')) && /DIF \(cuenta por confirmar\)/.test(txt('#screen')), 'receipt has a "Recibe" row');
    click($('[data-act="next"]'));

    // change destination of the annual charge, then check another open annual
    preset('taller');
    setv($('#d-extra'), 'r1'); ev($('#d-extra'), 'change');
    const who2 = openAnnual(); ok(who2 >= 0, 'found another person with an open annual charge');
    click($('[data-act="period"][data-p="x"]'));
    ok(/El dinero llega a\s*Cuenta de prueba del taller/.test(txt('#screen')), 'destination can be changed per charge');
    click($('[data-act="cancel"]')); click($('[data-act="back"]'));

    // add an account: validations
    click($('#addrecv')); ok(!!$('#rc-n'), 'account editor opens');
    click($('[data-ract="save"]')); ok(/Escribe el nombre de quien recibe/.test(txt('#cfg-recv-editor')) && /18 dígitos/.test(txt('#cfg-recv-editor')), 'name and CLABE are required');
    setv($('#rc-n'), 'Tienda de Lola'); setv($('#rc-c'), '1234 5678');
    ok($('#rc-c').value === '12345678', 'CLABE input keeps digits only');
    click($('[data-ract="save"]')); ok(/18 dígitos/.test(txt('#cfg-recv-editor')), 'short CLABE rejected');
    const bad = mk('01218000111222333').slice(0, 17) + ((+mk('01218000111222333')[17] + 1) % 10);
    setv($('#rc-c'), bad); click($('[data-ract="save"]')); ok(/no coincide/.test(txt('#cfg-recv-editor')), 'wrong check digit rejected');
    setv($('#rc-c'), mk('01218000111222333')); click($('[data-ract="save"]'));
    ok($$('#cfg-recv .prow').length === 3 && /Tienda de Lola/.test(txt('#cfg-recv')), 'valid account saved');
    ok($$('#d-main option').length === 3, 'new account appears in the destination selectors');

    // pending account does not need a CLABE
    click($('#addrecv')); setv($('#rc-n'), 'Escuela'); click($('#rc-p')); ok($('#rc-c').disabled, 'CLABE disabled while "todavía no tengo los datos"');
    click($('[data-ract="save"]')); ok($$('#cfg-recv .prow').length === 4, 'pending account saved without CLABE');

    // removing an account in use reassigns the destination
    setv($('#d-main'), 'r11'); ev($('#d-main'), 'change');
    const row = $$('#cfg-recv .prow').find(r => /Tienda de Lola/.test(r.textContent));
    click(row.querySelector('[data-ract="remove"]')); click($('[data-ract="remove-yes"]'));
    ok($$('#cfg-recv .prow').length === 3 && $('#d-main').value === 'r1', 'removing an account in use moves its charges to the first account');

    // cannot remove the last one
    preset('tienda');
    ok($$('#cfg-recv .prow').length === 1 && !$('#cfg-recv [data-ract="remove"]') && /al menos una cuenta/.test(txt('#cfg-recv')), 'the last account cannot be removed');
    ok($('#d-ledger').value === 'r1' && !$('#d-main'), 'tienda: only the fiado destination is offered');
    click($$('.person')[0]); click($('[data-act="amount"][data-m="abono"]')); click($('[data-act="amt-all"]')); click($('#amt-ok'));
    ok(/El dinero llega a\s*Cuenta de la tienda/.test(txt('#screen')), 'fiado abono goes to the shop account');
  } catch (e) { console.log('FAIL exception ' + e.stack); process.exitCode = 1; }
  console.log(errs.length ? errs.join('\n') : 'no window errors');
}, 100);
