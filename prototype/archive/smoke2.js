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
const keys = str => { for (const ch of str) click($('[data-act="key"][data-k="' + ch + '"]')); };
const preset = id => click($('[data-preset="' + id + '"]'));

setTimeout(() => {
  try {
    // ---- default: taller
    ok($$('.person').length === 12, 'taller: 12 people');
    ok($('#ft-periodic').checked && $('#ft-extra').checked && !$('#ft-turns').checked && !$('#ft-ledger').checked, 'taller: features periodic+extra on, turns+ledger off');
    click($$('.person')[0]);
    ok($$('#screen .tile').length === 12 && !!$('#screen .annual') && !$('#screen .account'), 'taller person: tiles + annual, no fiado account');
    click($$('#screen .tile.due,#screen .tile.future')[0]);
    click($('[data-act="via"][data-v="fam"]')); click($('[data-act="simulate"]'));
    ok(/PAGADO/.test(txt('#screen')) && /Familiar: Ana \(Hija\)/.test(txt('#screen')), 'taller: family payment receipt');
    click($('[data-act="next"]'));

    // ---- tanda preset toggles the turns feature on, same template
    preset('tanda');
    ok($('#ft-turns').checked && /Ronda 5 de 12/.test(txt('#screen')) && /\$2,400/.test(txt('#screen')), 'tanda: turns feature on, round 5, pot $2,400');
    const per = $('#ft-periodic'); click(per);
    ok(!$('#ft-periodic').checked && !$('#ft-turns').checked && $('#ft-turns').disabled, 'turning calendar off also turns "turns" off and disables it');
    ok(/Activa al menos una función|No hay nada que cobrar/.test(txt('#screen')), 'no functions => helpful empty state');

    // ---- tienda preset: ledger only
    preset('tienda');
    ok($('#ft-ledger').checked && !$('#ft-periodic').checked, 'tienda: ledger on, calendar off');
    ok($$('.person').length === 6 && /\$480\.50/.test(txt('#screen')) && /¿Quién es\?/.test(txt('#screen')), 'tienda: 6 customers, total owed $480.50 (decimals)');
    ok(!$('#cfg-form').textContent.includes('Monto en pesos'), 'tienda: calendar fields hidden in the form');
    ok(/Montos de acceso rápido/.test(txt('#cfg-form')) && $$('#cfg-form .chipx').length === 0, 'tienda: no preset amounts, shortcuts empty by default');

    click($$('.person')[0]); // Rosa debe 85
    ok(/Debe\s*\$85/.test(txt('#screen')) && !!$('#screen .account') && $$('#screen .tile').length === 0, 'fiado person: account only, no tiles');
    click($('[data-act="amount"][data-m="cargo"]'));
    ok(/\$0/.test(txt('#amt-display')) && $('#amt-ok').disabled, 'keypad opens at $0 with confirm disabled');
    keys('12.5'); ok(txt('#amt-display') === '$12.5', 'keypad: free amount with decimals => ' + txt('#amt-display'));
    keys('99'); ok(txt('#amt-display') === '$12.59' || txt('#amt-display') === '$12.5'.concat(''), 'keypad: max two decimals');
    click($('[data-act="key"][data-k="del"]'));
    const note = $('#amt-note'); note.value = 'Huevo'; ev(note, 'input');
    ok(/Anotar fiado \$12\./.test($('#amt-ok').textContent), 'confirm label shows the typed amount: ' + $('#amt-ok').textContent);
    click($('#amt-ok'));
    ok(/Debe\s*\$97\.5/.test(txt('#screen')) && /Huevo/.test(txt('#screen')), 'cargo saved: new balance $97.50 and note in ledger');

    click($('[data-act="amount"][data-m="abono"]')); keys('999');
    ok($('#amt-ok').disabled && /Debe solo/.test(txt('#amt-hint')), 'abono above balance is blocked with a hint');
    click($('[data-act="amt-all"]')); ok(/97\.5/.test(txt('#amt-display')), 'abono "todo" fills the balance');
    click($('#amt-ok')); ok(/Esperando que pague/.test(txt('#screen')), 'abono goes to payment screen');
    click($('[data-act="via"][data-v="cash"]')); click($('[data-act="cash"]'));
    ok(/PAGADO/.test(txt('#screen')) && /Ahora debe\s*\$0/.test(txt('#screen')), 'abono paid: balance back to $0');
    click($('[data-act="next"]'));

    // ---- optional shortcuts are user-defined
    const sc = $('#f-sc'); sc.value = '30'; click($('[data-pact="sc-add"]'));
    ok($$('#cfg-form .chipx').length === 1 && /\$30/.test(txt('#cfg-form')), 'shortcut $30 added by the user');
    click($$('.person')[0]); click($('[data-act="amount"][data-m="cargo"]'));
    ok($$('#screen [data-act="amt-chip"]').length === 1, 'keypad shows the user-defined shortcut');
    click($('[data-act="amt-chip"]')); ok(txt('#amt-display') === '$30', 'shortcut fills $30 but amount stays editable');
    keys('5'); ok(txt('#amt-display') === '$305', 'can still type over a shortcut => ' + txt('#amt-display'));
    click($('[data-act="back"]'));

    // ---- combine features: calendar + fiado on the same project
    click($('#ft-periodic'));
    ok($('#ft-periodic').checked && $('#ft-ledger').checked && /¿Quién paga\?/.test(txt('#screen')), 'combined: calendar + fiado active together');
    click($$('.person')[0]);
    ok($$('#screen .tile').length === 6 && !!$('#screen .account'), 'combined person screen: calendar tiles AND fiado account');
    click($('#ft-extra')); ok(!!$('#cfg-form #f-ename'), 'extra charge fields appear when the feature is on');

    // ---- people editor (consent is a checkbox)
    preset('vacio'); ok(/Aún no hay personas/.test(txt('#screen')), 'empty project shows invitation to add people');
    click($('#addperson'));
    $('#e-n').value = 'Doña Lola'; ev($('#e-n'), 'input');
    click($('[data-pact="payer-add"]'));
    $('#q-n0').value = 'Ana'; ev($('#q-n0'), 'input'); $('#q-t0').value = '5512345678'; ev($('#q-t0'), 'input');
    click($('#e-consent')); ok(!!$('.consent.on'), 'consent checkbox on');
    click($('[data-pact="save"]'));
    ok($$('#cfg-people .prow').length === 1 && /Foto autorizada/.test(txt('#cfg-people')), 'person saved with consent');
  } catch (e) { console.log('FAIL exception ' + e.stack); process.exitCode = 1; }
  console.log(errs.length ? errs.join('\n') : 'no window errors');
}, 100);
