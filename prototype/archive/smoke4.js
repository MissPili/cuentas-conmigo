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
const hash = h => { w.location.hash = h; ev(w, 'hashchange'); };
const preset = id => click($('[data-preset="' + id + '"]'));

setTimeout(() => {
  try {
    // ---- structure
    ok(d.documentElement.lang === 'es-MX', 'html lang is es-MX for VoiceOver pronunciation');
    ok(!!$('#navbar') && !!$('#tabbar') && !$('.apphead') && !$('#grouptitle'), 'navigation bar + tab bar exist; the in-app logo header is gone');
    ok($$('#tabbar [role="tab"]').length === 3 && $$('#tabbar [role="tab"]').map(b => b.textContent.trim()).join() === 'Cobrar,Personas,Ajustes', 'tab bar: three one-word tabs');
    ok($$('.tabs button').length === 2, 'page header keeps only Prototipo and Identidad');
    ok($('#tabbar').closest('#phone') && $('#pane-ajustes').closest('#phone') && $('#pane-personas').closest('#phone'), 'settings and people live inside the phone');

    // ---- navigation bar
    ok($('#navback').style.visibility === 'hidden' && txt('#navtitle') === 'Taller de ejemplo', 'root: Back hidden, title is the group name');
    click($$('.person')[0]);
    ok($('#navback').style.visibility === 'visible' && txt('#navtitle') === 'Rosa', 'person screen: Back visible, title is the person');
    ok(d.activeElement && d.activeElement.tagName === 'H1' && $('#screen').contains(d.activeElement), 'focus moves to the new screen heading');
    ok(!$('#screen .back'), 'no Back button inside the content any more');
    click($$('#screen .tile.due,#screen .tile.future')[0]);
    ok(txt('#navtitle') === 'Cobro', 'pay screen title is "Cobro"');
    click($('#navback')); ok(txt('#navtitle') === 'Rosa', 'standard Back returns one level');
    click($('#navback')); ok(/¿Quién paga\?/.test(txt('#screen')) && $('#navback').style.visibility === 'hidden', 'Back again returns to the root');

    // ---- tab bar routes
    click($('#tabbar [data-tab="personas"]')); hash('personas');
    ok(!$('#pane-personas').hidden && $('#pane-cobrar').hidden && $('#pane-ajustes').hidden && txt('#navtitle') === 'Personas', 'Personas tab shows its pane and title');
    ok($('#caption').hidden, 'voice caption is only shown in Cobrar');
    ok($('#tabbar [data-tab="personas"]').getAttribute('aria-selected') === 'true', 'selected tab is exposed with aria-selected');
    hash('ajustes'); ok(!$('#pane-ajustes').hidden && txt('#navtitle') === 'Ajustes', 'Ajustes tab shows its pane');
    hash('configurar'); ok(!$('#pane-ajustes').hidden, 'old #configurar links still land in Ajustes');
    hash('identidad'); ok(!$('#v-identidad').hidden && $('#v-prototipo').hidden, 'Identidad page still reachable');
    hash('cobrar'); ok(!$('#v-prototipo').hidden && !$('#pane-cobrar').hidden && !$('#caption').hidden, 'back to Cobrar');

    // ---- settings still work from inside the phone
    hash('ajustes');
    preset('tienda'); ok($('#ft-ledger').checked && !$('#ft-periodic').checked, 'presets work inside Ajustes');
    hash('cobrar');

    // ---- copy consistency
    click($$('.person')[0]);
    ok(/Anotar fiado/.test(txt('#screen')) && !/Se lleva fiado/.test(txt('#screen')), 'button reads "Anotar fiado"');
    click($('[data-act="amount"][data-m="cargo"]')); d.querySelector('[data-act="key"][data-k="5"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    ok(/Anotar fiado \$5/.test($('#amt-ok').textContent), 'confirm keeps the name: ' + $('#amt-ok').textContent);
    click($('#navback'));
    click($('[data-act="amount"][data-m="abono"]')); click($('[data-act="key"][data-k="2"]'));
    ok(/Cobrar abono de \$2/.test($('#amt-ok').textContent), 'abono confirm keeps its name: ' + $('#amt-ok').textContent);
    click($('#navback'));

    // ---- undo: cash yes, CoDi no
    const before = $('#screen .debt .big').textContent;
    click($('[data-act="amount"][data-m="abono"]')); click($('[data-act="amt-all"]')); click($('#amt-ok'));
    click($('[data-act="via"][data-v="cash"]')); click($('[data-act="cash"]'));
    ok(/PAGADO/.test(txt('#screen')) && !!$('[data-act="undo"]'), 'cash payment offers "Me equivoqué, deshacer"');
    click($('[data-act="undo"]'));
    ok(/¿Recibiste/.test(txt('#screen')), 'undo returns to the cash confirmation');
    click($('[data-act="cancel"]'));
    ok($('#screen .debt .big').textContent === before, 'undo restored the balance (' + before + ')');
    click($('[data-act="amount"][data-m="abono"]')); click($('[data-act="amt-all"]')); click($('#amt-ok'));
    click($('[data-act="simulate"]'));
    ok(/PAGADO/.test(txt('#screen')) && !$('[data-act="undo"]'), 'CoDi payment cannot be undone (money already moved)');
    click($('[data-act="next"]'));

    // taller periodic undo
    preset('taller'); hash('cobrar');
    const idx = (() => { for (let i = 0; i < 12; i++) { click($$('.person')[i]); if ($$('#screen .tile.due').length) return i; click($('#navback')); } return -1; })();
    const tile = $$('#screen .tile.due')[0]; const p = tile.dataset.p;
    click(tile); click($('[data-act="via"][data-v="cash"]')); click($('[data-act="cash"]'));
    ok(!!$('[data-act="undo"]'), 'periodic cash payment offers undo (person ' + idx + ', period ' + p + ')');
    click($('[data-act="undo"]')); click($('[data-act="cancel"]'));
    ok($('#screen .tile[data-p="' + p + '"]').classList.contains('due'), 'undo + cancel leaves the period unpaid again');

    // ---- legend: "falta" is not a single blue anymore
    ok($$('.dot.months').length >= 2 && !/hsl\(225 62% var\(--ml\)\)"><\/i> Falta/.test(d.body.innerHTML), 'legend shows the multicolour dot for "Falta"');
  } catch (e) { console.log('FAIL exception ' + e.stack); process.exitCode = 1; }
  console.log(errs.length ? errs.join('\n') : 'no window errors');
}, 100);
