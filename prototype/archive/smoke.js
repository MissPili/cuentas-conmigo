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

setTimeout(() => {
  try {
    ok($$('.person').length === 12, 'taller: 12 people in grid');
    click($$('.person')[0]); ok(/¿Qué paga\?/.test(txt('#screen')), 'what screen');
    ok($$('#screen .tile').length === 12 && !!$('#screen .annual'), '12 tiles + annual');
    click($$('.tile.due,.tile.future')[0]); ok(/Esperando que pague/.test(txt('#screen')), 'pay screen after tapping a period');
    click($('[data-act="via"][data-v="fam"]')); ok(/Solicitud enviada a Ana/.test(txt('#screen')), 'family request to Ana');
    click($('[data-act="simulate"]')); ok(/PAGADO/.test(txt('#screen')) && /Familiar: Ana \(Hija\)/.test(txt('#screen')), 'paid receipt shows family via');
    click($('[data-act="next"]'));

    w.location.hash = 'configurar'; ev(w, 'hashchange');
    ok(!$('#v-configurar').hidden, 'config tab visible');
    click($('[data-type="tanda"]'));
    ok(/Ronda 5 de 12/.test(txt('#screen')) && /Le toca a/.test(txt('#screen')), 'tanda: round 5 + turn holder');
    ok(/\$2,400/.test(txt('#screen')), 'tanda: pot $2,400');
    click($('[data-type="fiado"]'));
    ok($$('.person').length === 6 && /Te deben/.test(txt('#screen')), 'fiado: 6 customers + total owed');
    click($$('.person')[0]); ok(/Debe/.test(txt('#screen')), 'fiado: person screen');
    click($('[data-act="cargo"]')); ok(/\+ \$20/.test(txt('#screen')), 'fiado: cargo noted in ledger');
    click($('[data-act="abono"]')); ok(/Esperando que pague/.test(txt('#screen')), 'fiado: abono opens pay screen');
    click($('[data-act="via"][data-v="cash"]')); click($('[data-act="cash"]'));
    ok(/PAGADO/.test(txt('#screen')) && /Ahora debe/.test(txt('#screen')), 'fiado: abono paid, shows new balance');

    click($('[data-type="otro"]')); ok(/Aún no hay personas/.test(txt('#screen')), 'otro: empty state');
    click($('#addperson')); ok(!!$('#e-n'), 'editor opens');
    click($('[data-pact="save"]')); ok(/Escribe el nombre/.test(txt('#cfg-editor')), 'validation: name required');
    const n = $('#e-n'); n.value = 'Doña Lola'; ev(n, 'input');
    click($('[data-pact="payer-add"]'));
    const qn = $('#q-n0'); qn.value = 'Ana'; ev(qn, 'input'); const qt = $('#q-t0'); qt.value = '55 1234'; ev(qt, 'input');
    ok($('#q-t0').value === '551234', 'phone input keeps digits only');
    click($('[data-pact="save"]')); ok(/10 dígitos/.test(txt('#cfg-editor')), 'validation: payer phone needs 10 digits');
    const qt2 = $('#q-t0'); qt2.value = '5512345678'; ev(qt2, 'input');
    const c = $('#e-consent'); click(c); ok(!!$('.consent.on'), 'consent toggled on');
    click($('[data-pact="save"]'));
    ok($$('.prow').length === 1 && /Foto autorizada/.test(txt('#cfg-people')), 'person saved with consent pill');

    const f = $('#f-freq'); f.value = 'weekly'; ev(f, 'input'); ev(f, 'change');
    const cnt = $('#f-count'); cnt.value = '8'; ev(cnt, 'input');
    ok($$('#cfg-preview .tile').length === 8 && /cada semana, 8 veces/.test(txt('#cfg-preview')), 'preview: weekly x8');
    const am = $('#f-amount'); am.value = '250'; ev(am, 'input'); ok(/\$250/.test(txt('#cfg-preview')), 'preview: amount 250');
    const st = $('#f-start'); st.value = ''; ev(st, 'input'); ok(!/NaN|Invalid/.test(txt('#cfg-preview')), 'empty start date does not break the preview');

    click($('[data-pact="edit"]')); const c2 = $('#e-consent'); click(c2); click($('[data-pact="save"]'));
    ok(/Sin permiso de foto/.test(txt('#cfg-people')), 'no consent => pill says no permission');
    w.location.hash = 'prototipo'; ev(w, 'hashchange');
    ok($$('.person').length === 1 && /Sin foto de/.test($('#screen').innerHTML), 'app shows silhouette without consent');
    click($$('.person')[0]);
    ok($$('#screen .tile').length === 8, 'new person: 8 weekly tiles in the app');
  } catch (e) { console.log('FAIL exception ' + e.stack); process.exitCode = 1; }
  console.log(errs.length ? errs.join('\n') : 'no window errors');
}, 100);
