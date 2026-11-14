// Crawler + model tests for the simple-mode prototype.  usage: node smoke5.js <html path>
const fs = require('fs');
const { JSDOM } = require('jsdom');
const file = process.argv[2];
const html = fs.readFileSync(file, 'utf8');
let failed = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) { failed++; process.exitCode = 1; } };

/* ---------- boot a fresh page ---------- */
function boot() {
  const errs = [];
  const dom = new JSDOM('<!doctype html><html><head></head><body>' + html.replace(/<link[^>]*>/g, '') + '</body></html>', {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://x.test/',
    beforeParse(w) {
      w.addEventListener('error', e => errs.push('ERR ' + e.message));
      w.HTMLElement.prototype.scrollIntoView = function () {};
      w.__spoken = []; w.__opened = []; w.open = u => { w.__opened.push(u); return null; };
      w.SpeechSynthesisUtterance = function (t) { this.text = t; };
      w.speechSynthesis = { cancel() {}, speak(u) { w.__spoken.push(u.text); }, getVoices() { return []; } };
    }
  });
  const w = dom.window, d = w.document;
  const E = { w, d, errs, $: s => d.querySelector(s), $$: s => [...d.querySelectorAll(s)] };
  E.click = el => { if (!el) throw new Error('missing element'); E.navigated = true; el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); };
  E.ev = (el, t) => el.dispatchEvent(new w.Event(t, { bubbles: true }));
  E.type = (sel, v) => { const el = E.$(sel); el.value = v; E.ev(el, 'input'); };
  E.txt = s => E.$(s).textContent;
  E.act = a => E.click(E.$('#screen [data-act="' + a + '"]'));
  E.preset = id => E.click(E.$('[data-preset="' + id + '"]'));
  E.hash = h => { w.location.hash = h; E.ev(w, 'hashchange'); };
  E.view = () => E.$('#screen').dataset.view;
  E.goPerson = (i) => { E.act('start'); E.click(E.$$('#screen [data-act="pick"]')[i || 0]); };
  return E;
}

/* ---------- the rules checked on every screen ---------- */
const STEP_VIEWS = ['who', 'menu', 'months', 'ledger', 'amount', 'confirm', 'how', 'which', 'pay', 'r1', 'r2', 'r3', 'r4'];
const BAR = { home: [0, 0], who: [1, 0], menu: [1, 1], months: [1, 1], ledger: [1, 1], amount: [1, 1], confirm: [1, 1], how: [1, 1], which: [1, 1], pay: [1, 1], payout: [1, 0], done: [0, 0], exit: [1, 0], access: [1, 0], error: [0, 0] , r1: [0, 1], r2: [1, 1], r3: [1, 1], r4: [1, 1], rdone: [0, 0], rclosed: [0, 0], rlimit: [0, 0], regs: [1, 0], regdetail: [1, 0], regqr: [1, 0], receipt: [1, 0] };
function audit(E) {
  const { $, $$ } = E, f = [], view = E.view();
  const inter = $$('#screen button, #screen input, #screen select, #screen textarea, #screen a[href]');
  if ($$('#screen h1').length !== 1) f.push('h1 count ' + $$('#screen h1').length);
  if (inter.length > 4) f.push(inter.length + ' interactive elements (max 4)');
  if ($$('#screen .cbtn.primary').length > 1) f.push('more than one primary button');
  if (inter.some(x => x.disabled)) f.push('disabled control present');
  inter.filter(b => b.tagName === 'BUTTON').forEach(b => { if (!b.textContent.trim()) f.push('button without visible text'); });
  if ($$('#bar button').length > 3 || $$('#bar [role="tab"]').length) f.push('bottom bar has more than 3 items or tabs');
  const st = $('#steptext');
  if (STEP_VIEWS.includes(view)) { if (!st || !/^Paso [1-4] de 4$/.test(st.textContent)) f.push('missing or unstable step label: ' + (st && st.textContent)); }
  else if (st) f.push('step label on a non-step screen');
  const bk = $('#bar-back').getAttribute('aria-hidden') === 'false' ? 1 : 0, cn = $('#bar-cancel').getAttribute('aria-hidden') === 'false' ? 1 : 0;
  const want = BAR[view]; if (!want) f.push('unknown view ' + view); else if (bk !== want[0] || cn !== want[1]) f.push('Back/Cancel visibility ' + bk + cn + ' expected ' + want.join(''));
  if ($('#bar-listen').getAttribute('aria-hidden') === 'true') f.push('Escuchar hidden');
  const h = $('#screen h1'); if (h && h.textContent.trim().length > 40) f.push('h1 over 40 chars: ' + h.textContent);
  $$('#screen .say, #screen .txt, #screen small, #screen .to2, #screen dd, #screen .qrnote').forEach(n => { if (n.textContent.trim().length > 60) f.push('text block over 60 chars: ' + n.textContent.trim()); });
  $$('#screen .stt').forEach(s => { if (!s.querySelector('svg') || !s.textContent.trim() || !s.dataset.state && !s.classList.contains('waitbox')) f.push('status without icon/text/state'); });
  $$('#screen .pickrow').forEach(p => { if (!p.getAttribute('aria-label')) f.push('person row without label'); if (!p.querySelector('.stt')) f.push('person row without status'); });
  const ae = E.d.activeElement; if (E.navigated && !(ae && E.$('#screen').contains(ae))) f.push('focus left the screen after navigating');
  return f;
}
const signature = E => E.view() + '|' + E.$$('#screen [data-act]').map(b => b.dataset.act + (b.classList.contains('primary') ? '*' : '')).join(',');

/* ---------- crawler: replay every path from a fresh page and audit the screen it reaches ---------- */
function crawl(label, setup, opts) {
  const seen = new Set(), queue = [[]], problems = []; let screens = 0, views = new Set(), maxChoices = 0;
  while (queue.length) {
    const path = queue.shift(), E = boot(); setup(E); E.navigated = false;
    let alive = true;
    for (const step of path) {
      if (E.view() === 'amount' && E.$('#amt') && !E.$('#amt').value) E.type('#amt', '10');
      let el;
      if (step.bar) { el = E.$(step.bar); if (!el || el.getAttribute('aria-hidden') === 'true') { alive = false; break; } }
      else { el = E.$$('#screen [data-act]')[step.i]; if (!el || el.dataset.act !== step.act) { alive = false; break; } }
      E.click(el); E.navigated = true;
    }
    if (!alive) continue;
    screens++; views.add(E.view());
    const f = audit(E); f.forEach(x => problems.push(E.view() + ' [' + path.map(p => p.act).join('>') + ']: ' + x));
    if (E.errs.length) problems.push('window errors: ' + E.errs.join('; '));
    maxChoices = Math.max(maxChoices, E.$$('#screen button, #screen input').length);
    const sig = signature(E); if (seen.has(sig)) continue; seen.add(sig);
    const els = E.$$('#screen [data-act]'), picks = els.map((e, i) => e.dataset.act === 'pick' ? i : -1).filter(i => i >= 0);
    els.forEach((el, i) => {
      const a = el.dataset.act;
      if (a === 'adv' || a === 'set') return;
      if (a === 'pick' && i !== picks[0] && i !== picks[picks.length - 1]) return;
      queue.push(path.concat([{ i, act: a }]));
    });
    if (E.$('#bar-cancel').getAttribute('aria-hidden') === 'false') queue.push(path.concat([{ bar: '#bar-cancel', act: 'bar-cancel' }]));
  }
  ok(problems.length === 0, 'crawl ' + label + ': ' + screens + ' screens, views [' + [...views].sort().join(' ') + '], max controls ' + maxChoices + (problems.length ? '\n   ' + problems.slice(0, 12).join('\n   ') : ''));
  return views;
}

/* ================= A. static checks on the file ================= */
{
  const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
  const simple = css.slice(css.indexOf('==SIMPLE-START=='), css.indexOf('==SIMPLE-END=='));
  const sizes = [...simple.matchAll(/font-size:\s*(?:calc\()?([\d.]+)rem/g)].map(m => +m[1]);
  ok(sizes.length > 20 && Math.min(...sizes) >= 1.25, 'simple-mode CSS: ' + sizes.length + ' font sizes, smallest ' + Math.min(...sizes) + 'rem (>= 1.25rem = 20px)');
  const mins = [...simple.matchAll(/min-height:\s*(?:calc\()?([\d.]+)rem/g)].map(m => +m[1]);
  ok(mins.length > 5 && Math.min(...mins) >= 3, 'simple-mode CSS: smallest min-height ' + Math.min(...mins) + 'rem (>= 3rem = 48px)');
  ok(!/opacity\s*:/.test(simple), 'simple-mode CSS has no opacity (no dimmed or faded controls)');
  const js = html.slice(html.indexOf('<script>'));
  ok(!/touchstart|touchmove|touchend|swipe|pointermove|draggable|ondrag/i.test(js), 'no gesture handlers (swipe, drag, touch move) anywhere');
  const body = html.slice(html.indexOf('<main>'), html.indexOf('</main>'));
  ok(!/hamburger|data-drawer|role="menu"/i.test(body), 'no hamburger or side drawer');
  const iDark = css.indexOf(':root[data-theme="dark"]'), iHigh = css.indexOf(':root[data-contrast="high"]'), iMq = css.indexOf('@media (prefers-contrast: more)');
  ok(iDark > 0 && iHigh > iDark && iMq > iHigh, 'high-contrast tokens come after both dark blocks (order decides at equal specificity)');
  ok(/prefers-contrast: more/.test(css) && /html\[data-text="xl"\]/.test(css), 'honours the system high-contrast setting and has an extra-large text switch');
  const lhs = [...simple.matchAll(/line-height:\s*([\d.]+)/g)].map(m => +m[1]);
  ok(lhs.length >= 5 && Math.min(...lhs) >= 1.25 && /body \{ line-height: 1\.5; \}/.test(simple), 'simple-mode line heights: smallest ' + Math.min(...lhs) + ' (h1 titles 1.25; body text 1.5)');

  // contrast from the real token values in the file
  const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const hslHex = (h, s, l) => { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return '#' + [f(0), f(8), f(4)].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join(''); };
  const block = sel => { const i = css.indexOf(sel); const j = css.indexOf('}', i); const t = {}; [...css.slice(i, j).matchAll(/--([a-z-]+):\s*([^;]+);/g)].forEach(m => { t[m[1]] = m[2].trim(); }); return t; };
  const HUES = [225, 355, 285, 195, 320, 255, 12, 210, 300, 340, 240, 270];
  const themes = { claro: block(':root {'), oscuro: block(':root[data-theme="dark"]'), 'alto contraste': block(':root[data-contrast="high"]') };
  const base = themes.claro;
  Object.keys(themes).forEach(n => {
    const t = Object.assign({}, base, themes[n]), ml = parseFloat(t.ml);
    const pairs = [['ink/surface', t.ink, t.surface], ['ink/bg', t.ink, t.bg], ['ink-soft/surface', t['ink-soft'], t.surface], ['ink-soft/bg', t['ink-soft'], t.bg],
      ['on-paid/paid', t['on-paid'], t.paid], ['on-wait/wait', t['on-wait'], t.wait], ['danger/surface', t.danger, t.surface], ['bg/ink (primary button)', t.bg, t.ink], ['on-annual/annual', t['on-annual'], t.annual]];
    const worst = pairs.map(p => [p[0], cr(p[1], p[2])]).sort((a, b) => a[1] - b[1])[0];
    const tile = Math.min(...HUES.map(h => cr('#ffffff', hslHex(h, 62, ml))));
    ok(worst[1] >= 7 && tile >= 7, 'contrast ' + n + ': text pairs worst ' + worst[1].toFixed(2) + ' (' + worst[0] + '), month chips ' + tile.toFixed(2) + ' (both >= 7)');
    ok(cr(t.edge, t.surface) >= 3, 'control borders ' + n + ': ' + cr(t.edge, t.surface).toFixed(2) + ' (>= 3)');
  });
}

/* ================= B. crawler in five configurations (+ a pass where the connection fails once) ================= */
const configs = {
  taller: E => {},
  tanda: E => E.preset('tanda'),
  tienda: E => E.preset('tienda'),
  'calendario + aparte + fiado': E => { E.preset('taller'); E.click(E.$('#ft-ledger')); },
  vacio: E => E.preset('vacio')
};
const allViews = new Set();
Object.keys(configs).forEach(k => crawl(k, configs[k]).forEach(v => allViews.add(v)));
['taller', 'tienda'].forEach(k => crawl(k + ' (falla la conexión una vez)', E => { configs[k](E); const cb = E.$('#simfail'); cb.checked = true; E.ev(cb, 'change'); }).forEach(v => allViews.add(v)));
const mustSee = ['home', 'who', 'menu', 'months', 'ledger', 'amount', 'confirm', 'how', 'pay', 'done', 'exit', 'error', 'payout'];
ok(mustSee.every(v => allViews.has(v)), 'crawler reached every simple-mode screen: missing [' + mustSee.filter(v => !allViews.has(v)).join(' ') + ']');

/* ================= C. model + flow scenarios (ported from smoke2 and smoke4) ================= */
{
  // taller
  let E = boot();
  ok(E.d.documentElement.lang === 'es-MX', 'lang es-MX');
  ok(E.view() === 'home' && /lugares confirmados/.test(E.txt('#screen')) && /10 de 12|de 12 lugares/.test(E.txt('#screen')) && !E.$('#bar-back').getAttribute('aria-hidden').includes('false'), 'home: status card, Atrás hidden');
  ok(!E.$('.apphead') && !E.$('#tabbar'), 'old tab bar and header are gone');
  E.act('start'); ok(E.view() === 'who' && E.$$('#screen .pickrow').length === 3 && E.$('#screen .cbtn.pager'), 'who: 3 faces per page + "Ver más" (10 people)');
  const pages = new Set(); for (let i = 0; i < 4; i++) { E.$$('#screen .pickrow').forEach(p => pages.add(p.dataset.id)); E.act('more'); }
  ok(pages.size === 10, 'paging reaches all 10 enrolled people (' + pages.size + ')');
  ok(/Hoja 1 de 4/.test(E.txt('#screen')), 'pager says which page it is on and wraps around');
  const order = []; for (let i = 0; i < 4; i++) { E.$$('#screen .pickrow .stt').forEach(s => order.push(s.dataset.state)); E.act('more'); }
  const rank = { due: 0, wait: 1, paid: 2 };
  ok(order.length === 10 && order.every((s, i) => i === 0 || rank[s] >= rank[order[i - 1]]), 'people who still owe come first, then waiting, then paid (' + order.join(',') + ')');
  E.click(E.$$('#screen .pickrow')[0]);
  ok(E.view() === 'menu' && /Paso 2 de 4/.test(E.txt('#steptext')), 'person -> "¿Qué paga?" is step 2 of 4');
  ok(E.$$('#screen .cbtn.primary').length === 1 && /\$130/.test(E.txt('#screen')), 'menu: one primary, $130 shown');
  E.act('period'); ok(E.view() === 'how' && /Paso 3 de 4/.test(E.txt('#steptext')), 'how is step 3 of 4');
  E.click(E.$('[data-act="via"][data-v="cash"]'));
  ok(E.view() === 'pay' && /Paso 4 de 4/.test(E.txt('#steptext')) && /¿Recibiste \$130\?/.test(E.txt('#screen')), 'cash: confirm is step 4 of 4');
  E.act('cash-ok');
  ok(E.view() === 'done' && /PAGADO/.test(E.txt('#screen')) && !!E.$('[data-act="undo"]'), 'cash payment: PAGADO + undo offered');
  ok(E.$('#bar-back').getAttribute('aria-hidden') === 'true' && E.$('#steptext') === null, 'done: no Back, no step label');
  E.act('undo'); ok(E.view() === 'pay', 'undo returns to the cash confirmation');
  E.click(E.$('#bar-cancel')); ok(E.view() === 'exit', 'Cancelar opens the leave screen');
  E.act('exit-del'); ok(E.view() === 'home', 'borrar returns home');
  E.act('start'); const firstState = E.$$('#screen .pickrow .stt')[0].dataset.state; ok(firstState === 'due', 'after undo + delete the person is still pending first (' + firstState + ')');

  // CoDi family request: cannot be undone; shows who receives
  E = boot(); E.goPerson(0); E.act('period'); E.click(E.$('[data-act="via"][data-v="fam"]'));
  ok(/Pedimos el pago a/.test(E.txt('#screen')) && /El dinero llega a Cuenta de prueba del taller/.test(E.txt('#screen')), 'family request shows who receives the money');
  E.act('sim'); ok(/PAGADO/.test(E.txt('#screen')) && !E.$('[data-act="undo"]') && /Recibe/.test(E.txt('#screen')) && /Cuenta de prueba del taller/.test(E.txt('#screen')), 'CoDi payment: no undo, receipt names the account');

  // annual charge goes to the DIF account and flags it
  E = boot(); let found = false;
  E.act('start'); const n = E.$$('#screen .pickrow').length;
  for (let p = 0; p < 4 && !found; p++) {
    for (let i = 0; i < 3 && !found; i++) { E.click(E.$$('#screen .pickrow')[i]); if (E.$('#screen [data-act="period"][data-p="x"]')) found = true; else E.click(E.$('#bar-back')); }
    if (!found) E.act('more');
  }
  ok(found, 'found a person with an open annual charge');
  E.click(E.$('#screen [data-act="period"][data-p="x"]'));
  ok(E.view() === 'how' && !E.$('[data-act="via"][data-v="qr"]') && !E.$('[data-act="via"][data-v="fam"]') && !!E.$('[data-act="via"][data-v="cash"]') && /aún no está lista/.test(E.txt('#screen')) && /solo efectivo/.test(E.txt('#screen')) && audit(E).length === 0, 'annual charge: the DIF account is still "por confirmar", so only cash is offered, with a notice');

  // tanda
  E = boot(); E.preset('tanda');
  ok(/Ronda 5/.test(E.txt('#screen')) && /\$2,400/.test(E.txt('#screen')), 'tanda: round 5 and $2,400 pot on home');
  E.act('payout-ask'); ok(E.view() === 'payout' && /¿Ya recibió la bolsa\?/.test(E.txt('#screen')), 'payout confirmation screen');
  E.act('payout-ok'); ok(/ENTREGA REGISTRADA/.test(E.txt('#screen')), 'payout registered'); E.act('home');
  ok(!E.$('[data-act="payout-ask"]') && /Ya la recibió/.test(E.txt('#screen')), 'home no longer offers the payout and says it was received');

  // tienda: fiado with free amounts
  E = boot(); E.preset('tienda');
  ok(/Te deben \$480\.50/.test(E.txt('#screen')) && /4 de 6/.test(E.txt('#screen')), 'tienda: total owed $480.50, 4 of 6 people');
  E.act('start'); ok(/¿Quién es\?/.test(E.txt('#screen')), 'ledger-only asks "¿Quién es?"');
  const rosa = E.$$('#screen .pickrow').find(r => /Rosa/.test(r.textContent)); ok(/Debe \$85/.test(rosa.textContent), 'Rosa owes $85');
  E.click(rosa); ok(E.view() === 'ledger' && /Paso 2 de 4/.test(E.txt('#steptext')) && /Último: fiado de \$85/.test(E.txt('#screen')), 'ledger-only skips the menu: actions are step 2');
  E.click(E.$('[data-act="ledger-do"][data-m="cargo"]')); ok(E.view() === 'amount' && /Paso 3 de 4/.test(E.txt('#steptext')) && E.$('#amt').value === '', 'cargo: amount field starts empty (nothing fixed)');
  E.act('amt-next'); ok(/Escribe cuánto es/.test(E.txt('#amt-alert')) && !!E.$('#amt-alert .alertbox svg'), 'empty amount: alert with icon and short text');
  E.type('#amt', '12.5'); ok(E.$('#amt').value === '12.5', 'any amount can be typed (12.5)');
  E.act('amt-next'); ok(E.view() === 'confirm' && /¿Anotar \$12\.50 a Rosa\?/.test(E.txt('#screen')) && /Ahora debe \$97\.50/.test(E.txt('#screen')), 'confirm shows what was understood and the new balance');
  E.type('#amt-note', 'Huevo'); E.act('cargo-ok');
  ok(/FIADO ANOTADO/.test(E.txt('#screen')) && /\$97\.50/.test(E.txt('#screen')) && /Huevo/.test(E.txt('#screen')), 'cargo saved with note');
  E.act('next'); E.click(E.$$('#screen .pickrow').find(r => /Rosa/.test(r.textContent)));
  ok(/Último: fiado de \$12\.50 · Huevo/.test(E.txt('#screen')), 'last movement shown');
  E.click(E.$('[data-act="ledger-do"][data-m="abono"]')); ok(E.$('#amt').value === '97.50', 'abono starts with the full balance, editable');
  E.type('#amt', '999'); E.act('amt-next'); ok(/Debe solo \$97\.50/.test(E.txt('#amt-alert')) && E.view() === 'amount', 'abono above balance is blocked');
  E.type('#amt', '1,5'); E.act('amt-next'); ok(E.view() === 'how' && /\$1\.50/.test(E.txt('#screen')) && /Paso 4 de 4/.test(E.txt('#steptext')), 'comma decimal "1,5" understood as 1.50; abono "how" is step 4 of 4');
  E.click(E.$('#bar-back')); ok(E.view() === 'amount' && E.$('#amt').value === '1,5', 'Atrás from step 4 returns to the amount with what was typed');
  E.click(E.$('#bar-back')); ok(E.view() === 'ledger', 'Atrás again returns to the actions');
  E.click(E.$('[data-act="ledger-do"][data-m="abono"]')); E.act('amt-next');
  E.click(E.$('[data-act="via"][data-v="cash"]')); E.act('cash-ok');
  ok(/PAGADO/.test(E.txt('#screen')) && /Ahora debe\s*\$0/.test(E.txt('#screen')), 'abono paid in cash: balance back to $0');
  E.act('undo'); E.click(E.$('#bar-cancel')); E.act('exit-del'); E.act('start');
  ok(/Debe \$97\.50/.test(E.$$('#screen .pickrow').find(r => /Rosa/.test(r.textContent)).textContent), 'undo restored the $97.50 balance');
  // CoDi abono has no undo
  E.click(E.$$('#screen .pickrow').find(r => /Rosa/.test(r.textContent))); E.click(E.$('[data-act="ledger-do"][data-m="abono"]')); E.act('amt-next'); E.click(E.$('[data-act="via"][data-v="qr"]')); E.act('sim');
  ok(/PAGADO/.test(E.txt('#screen')) && !E.$('[data-act="undo"]'), 'CoDi abono cannot be undone');
  // amount parsing
  E = boot(); E.preset('tienda'); E.goPerson(1);
  E.click(E.$('[data-act="ledger-do"][data-m="cargo"]')); E.type('#amt', '1,250'); E.act('amt-next'); ok(/¿Anotar \$1,250 a/.test(E.txt('#screen')), '"1,250" is read as one thousand two hundred fifty');
  E.click(E.$('#bar-back')); E.type('#amt', '1,250.5'); E.act('amt-next'); ok(/\$1,250\.50/.test(E.txt('#screen')), '"1,250.5" is read as 1,250.50');
  // user shortcuts stay optional and never replace the free field
  E = boot(); E.preset('tienda'); E.hash('ajustes'); E.type('#f-sc', '30'); E.click(E.$('[data-pact="sc-add"]')); E.hash('cobrar');
  E.goPerson(0); E.click(E.$('[data-act="ledger-do"][data-m="cargo"]'));
  ok(E.$$('#screen [data-act="amt-chip"]').length === 1 && !!E.$('#amt'), 'optional shortcut shows next to the free field');
  E.act('amt-chip'); ok(E.$('#amt').value === '30', 'shortcut fills 30'); E.type('#amt', '305'); E.act('amt-next'); ok(/¿Anotar \$305/.test(E.txt('#screen')), 'amount can still be typed over a shortcut');
  ok(audit(E).length === 0, 'amount screen with shortcut still passes the screen rules');

  // combined project: calendar + extra + fiado on the same person
  E = boot(); E.click(E.$('#ft-ledger')); E.goPerson(0);
  const acts = E.$$('#screen [data-act]').map(b => b.dataset.act);
  ok(acts.includes('period') && acts.includes('ledger-open') && E.$$('#screen button').length <= 4, 'combined: month, annual and fiado are offered together, max 4 options (' + acts.join(',') + ')');
  E.act('ledger-open'); ok(E.view() === 'ledger' && /Paso 2 de 4/.test(E.txt('#steptext')), 'fiado from the menu keeps step 2 of 4');

  // leave and continue later
  E = boot(); E.goPerson(0); E.act('period'); E.click(E.$('#bar-cancel'));
  ok(E.view() === 'exit' && /Guardar y seguir después/.test(E.txt('#screen')) && /Continuarás desde aquí/.test(E.txt('#screen')), 'leave screen offers save-and-continue');
  E.click(E.$('#bar-back')); ok(E.view() === 'how', 'Atrás from the leave screen returns to the same step');
  E.click(E.$('#bar-cancel')); E.act('exit-save');
  ok(E.view() === 'home' && /Guardado\. Continuarás desde aquí\./.test(E.txt('#screen')) && /Continuar/.test(E.$('[data-act="continue"]').textContent), 'saved: home confirms and offers Continuar');
  ok(E.$$('#screen .cbtn.primary').length === 1 && E.$('[data-act="continue"]').classList.contains('primary'), 'Continuar is the single primary');
  E.act('continue'); ok(E.view() === 'how' && /Paso 3 de 4/.test(E.txt('#steptext')), 'continue returns to the same step');
  E.click(E.$('#bar-back')); E.click(E.$('#bar-back')); ok(E.view() === 'who', 'Back after continuing still walks the history');

  // errors
  E = boot(); E.goPerson(0); E.act('period'); const cb = E.$('#simfail'); cb.checked = true; E.ev(cb, 'change');
  E.click(E.$('[data-act="via"][data-v="qr"]'));
  ok(E.view() === 'error' && !!E.$('#screen .badge2 svg') && /No se pudo enviar el cobro/.test(E.txt('#screen')) && /Revisa tu conexión/.test(E.txt('#screen')) && /Intentar de nuevo/.test(E.txt('#screen')) && /Volver/.test(E.txt('#screen')), 'error screen: big icon, short text, "Intentar de nuevo" and "Volver"');
  E.act('retry'); ok(E.view() === 'pay' && /Muestra el QR/.test(E.txt('#screen')), 'retry repeats the action and succeeds');
  E.click(E.$('#bar-back')); ok(E.view() === 'how', 'history has no stale error screen');
  cb.checked = true; E.ev(cb, 'change'); E.click(E.$('[data-act="via"][data-v="qr"]')); E.act('err-back'); ok(E.view() === 'how', '"Volver" from the error returns to the step');

  // two family payers => extra step 3 sub-screen
  E = boot(); E.hash('personas'); E.click(E.$('#addperson')); E.type('#e-n', 'Doña Lola');
  E.click(E.$('[data-pact="payer-add"]')); E.type('#q-n0', 'Ana'); E.type('#q-t0', '5512345678');
  E.click(E.$('[data-pact="payer-add"]')); E.type('#q-n1', 'Beto'); E.type('#q-t1', '5587654321');
  E.click(E.$('[data-pact="save"]')); E.hash('cobrar');
  const lola = () => { for (let p = 0; p < 4; p++) { const r = E.$$('#screen .pickrow').find(x => /Lola/.test(x.textContent)); if (r) return r; E.act('more'); } };
  E.act('start'); const lr = lola();
  ok(!!lr && /Sin foto de Doña Lola/.test(lr.innerHTML), 'no photo consent => silhouette with initial, not a photo');
  E.click(lr); E.act('period'); E.click(E.$('[data-act="via"][data-v="fam"]'));
  ok(E.view() === 'which' && /Paso 3 de 4/.test(E.txt('#steptext')) && E.$$('#screen [data-act="via"]').length === 2, 'two relatives: "¿Cuál familiar?" stays inside step 3');
  E.click(E.$$('#screen [data-act="via"]')[1]); ok(/Pedimos el pago a Beto/.test(E.txt('#screen')), 'second relative chosen');

  // empty states route to the advanced layer
  E = boot(); E.preset('vacio');
  ok(/Aún no hay personas/.test(E.txt('#screen')) && E.$('[data-act="adv"][data-tab="personas"]'), 'no people => home invites to add them (advanced layer)');
  E.click(E.$('[data-act="adv"]')); E.ev(E.w, 'hashchange'); ok(!E.$('#advwrap').hidden && E.$('#pane-cobrar').hidden && !E.$('#pane-personas').hidden, 'advanced layer opens on demand');
  E.click(E.$('#adv-exit')); E.ev(E.w, 'hashchange'); ok(E.$('#advwrap').hidden && !E.$('#pane-cobrar').hidden, 'big button returns to simple mode');
  E.hash('ajustes'); E.click(E.$('#ft-periodic')); E.click(E.$('#ft-extra')); E.hash('cobrar');
  E.click(E.$('#ft-periodic')); // toggle back on then off to be sure
  E.click(E.$('#ft-periodic'));
  ok(/Falta preparar la app/.test(E.txt('#screen')) || /Aún no hay personas/.test(E.txt('#screen')), 'no features or no people: guided empty state');
  E.hash('ajustes'); ok(E.$('#advtabs [aria-selected="true"]').dataset.tab === 'ajustes', 'advanced tabs show the current section');

  // "Ver mejor" settings
  E = boot(); E.act('access'); E.hash('cobrar');
  ok(E.view() === 'access' && E.$$('#screen [role="switch"]').length === 4, 'Ver mejor: four switches');
  ok(E.$$('#screen [role="switch"]').every(s => /Activado|Apagado/.test(s.textContent)), 'each switch says Activado/Apagado in words');
  E.click(E.$('[data-act="set"][data-k="hc"]')); ok(E.d.documentElement.getAttribute('data-contrast') === 'high' && /Activado/.test(E.$('[data-k="hc"]').textContent), 'high contrast switches on');
  E.click(E.$('[data-act="set"][data-k="xl"]')); ok(E.d.documentElement.getAttribute('data-text') === 'xl', 'extra-large text switches on');
  E.click(E.$('[data-act="set"][data-k="hc"]')); ok(E.d.documentElement.getAttribute('data-contrast') === 'normal', 'high contrast switches off');
  ok(audit(E).length === 0, 'Ver mejor screen passes the screen rules');

  // voice
  E = boot(); E.w.__spoken.length = 0; E.act('start');
  ok(E.w.__spoken.length >= 1 && /¿Quién paga\?/.test(E.w.__spoken[E.w.__spoken.length - 1]), 'moving to a screen reads its question aloud');
  E.click(E.$('#bar-listen')); const full = E.w.__spoken[E.w.__spoken.length - 1];
  ok(/¿Quién paga\?/.test(full) && /falta pagar/i.test(full) && /Ver más personas/.test(full), 'Escuchar reads the question and the options: "' + full.slice(0, 80) + '…"');
  E.click(E.$('#bar-back')); E.act('access'); E.click(E.$('[data-act="set"][data-k="voice"]')); E.w.__spoken.length = 0; E.click(E.$('#bar-back')); E.act('start');
  ok(E.w.__spoken.length === 0, 'with Voz apagada, screens are not read automatically');
  E.click(E.$('#bar-listen')); ok(E.w.__spoken.length === 1, 'but Escuchar still works when the voice is off');
  ok(E.errs.length === 0, 'no window errors (vibrate and audio are guarded: not available in this environment)');

  // advanced layer still configures the single template (presets and switches)
  E = boot(); E.hash('ajustes'); E.preset('tienda'); ok(E.$('#ft-ledger').checked && !E.$('#ft-periodic').checked, 'advanced: presets switch features');
  E.click(E.$('#ft-periodic')); ok(E.$('#ft-turns').disabled === false && E.$('#ft-periodic').checked, 'advanced: features combine');
  E.click(E.$('#ft-periodic')); ok(!E.$('#ft-periodic').checked && !E.$('#ft-turns').checked, 'advanced: turning calendar off turns turns off');
}

/* ================= D. v7: QR registration, places, receipt, report ================= */
{
  const typeIn = (E, sel, v) => { E.type(sel, v); };
  const register = (E, name, tel, helpers, opts) => {
    opts = opts || {};
    E.hash('inscripcion'); if (E.view() === 'rdone') E.act('rg-again');
    typeIn(E, '#rg-n', name); E.act('rg-next');
    if (tel) { typeIn(E, '#rg-t', tel); E.act('rg-next'); } else E.act('rg-notel');
    helpers.forEach((h, i) => { typeIn(E, '#rg-h', h); if (i < helpers.length - 1) E.act('rg-add'); });
    E.act('rg-next');
    if (!opts.noConsent) { const cb = E.$('#rg-ok'); cb.checked = true; E.ev(cb, 'change'); }
    E.act('rg-send');
  };
  let E = boot();
  const P = () => E.w.PCF.project(), roster = () => P().people;

  // the registration page: 4 steps, one field each, nothing of the collector's screens
  E.hash('inscripcion');
  ok(E.view() === 'r1' && /Paso 1 de 4/.test(E.txt('#steptext')) && /Quedan 2 lugares de 12/.test(E.txt('#screen')), 'QR page: step 1 of 4, says how many places are left');
  ok(audit(E).length === 0, 'registration step 1 passes the screen rules');
  E.act('rg-next'); ok(/Escribe el nombre/.test(E.txt('#rg-alert')) && !!E.$('#rg-alert .alertbox svg') && E.view() === 'r1', 'empty name: alert with icon, stays on step 1');
  typeIn(E, '#rg-n', 'María Pérez'); E.act('rg-next');
  ok(E.view() === 'r2' && /Paso 2 de 4/.test(E.txt('#steptext')) && audit(E).length === 0, 'step 2: WhatsApp of the person');
  typeIn(E, '#rg-t', '123'); E.act('rg-next'); ok(/10 números/.test(E.txt('#rg-alert')) && E.view() === 'r2', 'a short phone number is refused');
  typeIn(E, '#rg-t', '+52 55 1234 5678'); E.act('rg-next'); ok(E.view() === 'r3' && S_tel(E) === '5512345678', '+52 and spaces are accepted and stored as 10 digits');
  ok(/Paso 3 de 4/.test(E.txt('#steptext')) && audit(E).length === 0, 'step 3: helpers to pay');
  typeIn(E, '#rg-h', '5598765432'); E.act('rg-add'); typeIn(E, '#rg-h', '5598765432'); E.act('rg-add');
  ok(/Ese número ya está/.test(E.txt('#rg-alert')), 'the same helper number twice is refused');
  typeIn(E, '#rg-h', '5511112222'); E.act('rg-add');
  ok(!E.$('[data-act="rg-add"]') && /Ya agregaste/.test(E.txt('#screen')), 'two added: "Agregar otro" disappears (the last one goes with Seguir)');
  typeIn(E, '#rg-h', '5533334444'); E.act('rg-next');
  ok(E.view() === 'r4' && /Paso 4 de 4/.test(E.txt('#steptext')) && /55 9876 5432/.test(E.txt('#screen')) && /55 3333 4444/.test(E.txt('#screen')) && audit(E).length === 0, 'step 4: review shows the 3 helpers; max 3');
  E.act('rg-send'); ok(/Marca la casilla/.test(E.txt('#rg-alert')) && E.view() === 'r4', 'sending needs the permission checkbox');
  const cb = E.$('#rg-ok'); cb.checked = true; E.ev(cb, 'change'); E.act('rg-send');
  ok(E.view() === 'rdone' && /ENVIADA/.test(E.txt('#screen')) && /Lugar apartado/.test(E.txt('#screen')) && audit(E).length === 0, 'registered: confirmation, place held');
  const maria = roster().find(p => p.n === 'María Pérez');
  ok(maria && maria.status === 'pending' && maria.via === 'qr' && maria.tel === '5512345678' && maria.payers.length === 3 && maria.payers[0].primary && !maria.consent.ok, 'person saved: pending, via QR, 3 payers, no photo consent');
  // a repeated WhatsApp is not registered twice
  register(E, 'Otra María', '5512345678', []); ok(/YA ESTÁ INSCRITO/.test(E.txt('#screen')) && roster().filter(p => p.tel === '5512345678').length === 1, 'same WhatsApp twice: no duplicate');

  // the last place: sold out, then waitlist
  register(E, 'Juana Ruiz', '5500001111', ['5500002222']);
  ok(/ENVIADA/.test(E.txt('#screen')) && !/lista de espera/i.test(E.txt('#screen')), 'second registration takes the last place');
  register(E, 'Pedro Soto', '5500003333', []);
  ok(/lista de espera/i.test(E.txt('#screen')) && roster().find(p => p.n === 'Pedro Soto').status === 'waitlist' && !!E.$('#screen .stt'), 'third one goes to the waitlist (icon + words)');
  E.hash('inscripcion'); E.act('rg-again'); ok(/Ya no hay lugares/.test(E.txt('#screen')), 'form says there are no places left');

  // brake against spam: the 6th send in one session is refused
  { let n = 0; E = boot(); for (let i = 0; i < 6; i++) { register(E, 'Prueba ' + i, '55' + String(10000000 + i), []); n++; } ok(E.view() === 'rlimit' && /Intenta más tarde/.test(E.txt('#screen')), 'too many registrations from one phone: asked to try later'); }
  // closed registrations
  E = boot(); E.hash('cobrar'); E.hash('ajustes'); E.click(E.$('#f-regopen')); E.hash('inscripcion');
  ok(/Inscripciones cerradas/.test(E.txt('#screen')) && audit(E).length === 0, 'registration switched off in Ajustes: page says it is closed ' + E.view() + ' ' + audit(E).join('; '));

  // collector side
  E = boot(); register(E, 'Lola Gómez', '5544445555', ['5566667777']); register(E, 'Nico Díaz', '5544446666', []); register(E, 'Rita León', '5544447777', []);
  E.hash('cobrar');
  ok(E.view() === 'home' && /2 por revisar|Inscripciones nuevas/.test(E.txt('#screen')) && /Taller lleno/.test(E.txt('#screen')), 'collector home: new registrations + "Taller lleno" notice');
  ok(/12 lugares|de 12/.test(E.txt('#screen')) && audit(E).length === 0, 'home with places card passes the rules ' + audit(E).join('; '));
  E.act('regs'); ok(E.view() === 'regs' && audit(E).length === 0 && /Lola Gómez/.test(E.txt('#screen')), 'Inscripciones lists who is waiting');
  E.click(E.$('[data-act="reg-open"]')); ok(E.view() === 'regdetail' && /¿Aprobar a Lola Gómez\?/.test(E.txt('#screen')) && /55 4444 5555/.test(E.txt('#screen')) && audit(E).length === 0, 'detail: asks to approve, shows the numbers');
  E.act('reg-approve'); ok(E.view() === 'menu' && /¿Qué paga Lola Gómez\?/.test(E.txt('#screen')) && /Paso 2 de 4/.test(E.txt('#steptext')), 'approving continues to "¿Qué paga?" (step 2)');
  E.click(E.$('#bar-back')); ok(E.view() === 'who', 'Atrás from there goes to the people list, not to a stale approval');
  E.click(E.$('#bar-back')); E.act('regs'); E.click(E.$$('[data-act="reg-open"]').find(b => /Rita/.test(b.textContent)));
  ok(!E.$('[data-act="reg-give"]') && /No hay lugar libre/.test(E.txt('#screen')), 'waitlist person cannot get a place while it is full');
  E.click(E.$('#bar-back')); E.click(E.$$('[data-act="reg-open"]').find(b => /Nico/.test(b.textContent))); E.act('reg-no');
  ok(E.view() === 'home' && /Inscripción quitada/.test(E.txt('#screen')) && roster().find(p => p.n === 'Nico Díaz').status === 'released', 'rejecting frees the place');
  E.act('regs'); E.click(E.$$('[data-act="reg-open"]')[0]); ok(/¿Darle lugar a Rita León\?/.test(E.txt('#screen')) || /Aprobar/.test(E.txt('#screen')), 'a free place lets the waitlist person in');
  E.act('reg-give'); ok(/Ya tiene lugar/.test(E.txt('#screen')) && roster().find(p => p.n === 'Rita León').status === 'enrolled', 'waitlist -> enrolled');

  // QR screen for the collector
  E = boot(); E.act('regs'); ok(E.view() === 'regs' && /No hay nada por revisar/.test(E.txt('#screen')), 'no registrations: nothing to review'); E.act('regqr');
  ok(E.view() === 'regqr' && !!E.$('#screen .qrbox svg') && /cuentasconmigo\.example\/i\/ej-tal4k2/.test(E.txt('#screen')) && audit(E).length === 0, 'QR screen: code + link + places left');
  E.act('reg-toggle'); ok(P().reg.open === false && /Apagado/.test(E.txt('#screen')), 'collector can close registrations (words, not just colour)');
  // expiry rule: only a NEW person who was approved and has never paid expires after the holding days
  E = boot(); const P2 = E.w.PCF.project();
  register(E, 'Nueva Uno', '5500009991', ['5500009992']); register(E, 'Nueva Dos', '5500009993', []); E.hash('cobrar');
  P2.people.filter(p => p.via === 'qr').forEach(p => { p.status = 'enrolled'; p.heldOn = '2000-01-01'; });
  const dos = P2.people.find(p => p.n === 'Nueva Dos'); dos.pay[new Date().getMonth()] = { s: 'paid', via: 'cash', payer: 0, date: null };
  const manual = P2.people.find(p => p.via === 'manual' && !(p.pay[new Date().getMonth()] && p.pay[new Date().getMonth()].s === 'paid')); manual.heldOn = '2000-01-01';
  E.hash('personas'); E.hash('cobrar'); E.act('regs');
  ok(/Nueva Uno/.test(E.txt('#screen')) && /Apartado vencido/.test(E.txt('#screen')), 'approved new person without a first payment: "Apartado vencido" after the holding days');
  ok(!/Nueva Dos/.test(E.txt('#screen')), 'a new person who already paid never expires');
  ok(!new RegExp(manual.n).test(E.txt('#screen')), 'a person added by hand with an old date and past payments never expires (' + manual.n + ')');
  E.click(E.$('[data-act="reg-open"]')); ok(/¿Qué hacemos con el lugar\?/.test(E.txt('#screen')) && !!E.$('[data-act="reg-extend"]') && !!E.$('[data-act="reg-free"]'), 'expired place: keep longer or free it');
  E.act('reg-extend'); E.act('regs'); ok(!/Apartado vencido/.test(E.txt('#screen')), 'keeping it longer clears the expiry');

  // an empty roster with registrations waiting must not break the home screen (turns on)
  E = boot(); E.preset('vacio'); E.hash('ajustes'); if (!E.$('#ft-turns').checked) E.click(E.$('#ft-turns')); E.hash('cobrar');
  register(E, 'Primera Persona', '5500008881', []); E.hash('cobrar'); E.hash('personas'); E.hash('cobrar');
  ok(E.view() === 'home' && /Aún no hay personas/.test(E.txt('#screen')) && /Inscripciones nuevas|por revisar/.test(E.txt('#screen')) && E.errs.length === 0, 'empty roster + turns + a pending registration: home still works and shows the review notice');
  E.act('regs'); E.click(E.$('[data-act="reg-open"]')); E.act('reg-approve'); E.click(E.$('#bar-back')); E.click(E.$('#bar-back')); ok(E.view() === 'home' && /Ronda/.test(E.txt('#screen')) && E.errs.length === 0, 'after approving the first person the tanda home shows the round');

  // payment confirms the place and the counter moves; receipt + WhatsApp (option A)
  E = boot(); const P3 = () => E.w.PCF.project();
  { const t = new Date().getMonth(); const q = P3().people.find(p => !(p.pay[t] && p.pay[t].s === 'paid') && p.payers.length); for (let k = 0; k < t; k++) q.pay[k] = { s: 'paid', via: 'cash', payer: 0, date: null }; q.pay[t] = null; E.hash('personas'); E.hash('cobrar'); var name = q.n; var before = (E.txt('#screen').match(/(\d+) de 12 lugares/) || [])[1]; }
  E.act('start'); for (let i = 0; i < 4 && !E.$$('#screen .pickrow').find(r => r.textContent.indexOf(name) >= 0); i++) E.act('more');
  E.click(E.$$('#screen .pickrow').find(r => r.textContent.indexOf(name) >= 0)); E.act('period'); E.click(E.$('[data-act="via"][data-v="fam"]')); E.act('sim');
  ok(E.view() === 'done' && !!E.$('[data-act="receipt"]') && E.$('[data-act="receipt"]').classList.contains('primary') && audit(E).length === 0, 'paid: "Enviar comprobante" is the single primary button');
  E.act('receipt');
  ok(E.view() === 'receipt' && !!E.$('#screen .rcpt svg') && audit(E).length === 0, 'receipt screen: the image + one button per number');
  const svg = E.txt('#screen .rcpt');
  ok(/PAGADO/.test(svg) && /\$130/.test(svg) && /Mensualidad/.test(svg) && /LUGAR CONFIRMADO/.test(svg) && /Folio/.test(svg) && /Recibe/.test(svg) && /no es factura/.test(svg), 'receipt shows status, amount, concept, place, who receives, folio and "no es factura"');
  ok(/(\d+) de 12/.exec(svg) && +/(\d+) de 12/.exec(svg)[1] === +before + 1, 'place counter on the receipt went up by one (' + before + ' -> ' + (/(\d+) de 12/.exec(svg) || [])[1] + ')');
  const dests = E.$$('#screen [data-act="wa"]'); ok(dests.length >= 1 && dests[0].classList.contains('primary'), 'principal helper first and primary');
  E.click(dests[0]); const url = E.w.__opened[E.w.__opened.length - 1];
  ok(/^https:\/\/wa\.me\/52\d{10}\?text=/.test(url) && /Comprobante%20de%20pago/.test(url) && /EJ-/.test(decodeURIComponent(url)), 'WhatsApp link: wa.me/52 + 10 digits + prefilled message with the receipt link');
  ok(/WhatsApp abierto/.test(E.txt('#screen')) && !/enviado|entregado/i.test(E.txt('#screen')), 'after the tap it says "WhatsApp abierto", never claims it was delivered');
  E.click(E.$('#bar-back')); ok(E.view() === 'done', 'Atrás returns to the payment screen');
  E.act('home'); ok(/lugares confirmados/.test(E.txt('#screen')) && +/(\d+) de 12 lugares/.exec(E.txt('#screen'))[1] === +before + 1, 'home counter matches ' + before + ' ' + E.txt('#screen').slice(0, 90));

  // cash receipt, person without any phone: only the share button
  E = boot(); E.preset('taller'); E.goPerson(0); E.act('period'); E.click(E.$('[data-act="via"][data-v="cash"]')); E.act('cash-ok'); E.act('receipt');
  ok(/PAGADO/.test(E.txt('#screen .rcpt')) && /Efectivo/.test(E.txt('#screen .rcpt')) && E.$$('#screen [data-act="wa"]').length >= 0 && audit(E).length === 0, 'cash receipt says PAGADO and Efectivo');
  E = boot(); E.preset('tienda'); E.goPerson(0); E.click(E.$('[data-act="ledger-do"][data-m="abono"]')); E.act('amt-next'); E.click(E.$('[data-act="via"][data-v="cash"]')); E.act('cash-ok'); E.act('receipt');
  ok(/Ahora debe/.test(E.txt('#screen .rcpt')) && !/LUGAR/.test(E.txt('#screen .rcpt')), 'fiado abono receipt: balance, no place line');
  { const nobody = E.w.PCF.project().people.find(p => !p.payers.length && !p.tel); if (nobody) { E.act('home'); } }

  // the annual DIF payment never confirms a place
  E = boot(); { const t = new Date().getMonth(); const q = E.w.PCF.project().people.find(p => !p.extra); if (q) { const nm = q.n; E.act('start'); for (let i = 0; i < 4 && !E.$$('#screen .pickrow').find(r => r.textContent.indexOf(nm) >= 0); i++) E.act('more'); E.click(E.$$('#screen .pickrow').find(r => r.textContent.indexOf(nm) >= 0)); E.click(E.$('#screen [data-act="period"][data-p="x"]')); E.click(E.$('[data-act="via"][data-v="cash"]')); E.act('cash-ok'); E.act('receipt'); ok(!/LUGAR CONFIRMADO/.test(E.txt('#screen .rcpt')) && /Pago anual DIF/.test(E.txt('#screen .rcpt')), 'annual payment receipt: no "lugar confirmado"'); } }

  // monthly report in the advanced layer
  E = boot(); E.hash('reporte');
  ok(!E.$('#advwrap').hidden && !E.$('#pane-reporte').hidden && E.$('#advtabs [aria-selected="true"]').dataset.tab === 'reporte', 'report tab opens in "Ayuda de un familiar"');
  ok(/Esperado/.test(E.txt('#rep-body')) && /Recibido/.test(E.txt('#rep-body')) && /por CoDi/.test(E.txt('#rep-body')) && /en efectivo/.test(E.txt('#rep-body')) && /Lugares confirmados/.test(E.txt('#rep-body')) && /Pendiente/.test(E.txt('#rep-body')), 'report: expected, received (CoDi vs cash), pending, places');
  ok(E.$$('#rep-body tbody tr').length === 10 && E.$$('#rep-body tbody .stt').length === 10 && E.$$('#rep-body tbody .stt svg').length === 10, 'report: one row per enrolled person, each status with icon + words');
  { const m = /Esperado\s*\$([\d,]+)/.exec(E.txt('#rep-body')); ok(m && m[1] === '1,300', 'expected = 10 people x $130 = $1,300 (' + (m && m[1]) + ')'); }
  const t0 = E.txt('#rep-title'); E.click(E.$('#rep-prev')); ok(E.txt('#rep-title') !== t0, 'report: previous month');
  E.click(E.$('#rep-next')); ok(E.txt('#rep-title') === t0 && !E.$('#rep-next').disabled === (E.$('#rep-next').disabled === false), 'report: next month returns');
  E.click(E.$('#rep-copy')); ok(true, 'copy summary does not crash without clipboard');
  E.hash('ajustes'); E.preset('tienda'); E.hash('reporte'); ok(/Te deben/.test(E.txt('#rep-body')) && E.$('#rep-nav').hidden, 'report for fiado: balances, no month picker');
  ok(E.errs.length === 0, 'no window errors in the new screens');

  // Ajustes: capacity
  E = boot(); E.hash('ajustes'); ok(!!E.$('#f-cap') && E.$('#f-cap').value === '12' && !!E.$('#f-hold'), 'Ajustes: places feature shows capacity and holding days');
  E.type('#f-cap', '10'); E.hash('cobrar'); ok(/Taller lleno/.test(E.txt('#screen')), 'capacity 10 with 10 people: full');
  E.hash('ajustes'); E.click(E.$('#ft-periodic')); ok(E.$('#ft-places').disabled === true && !E.$('#ft-places').checked, 'places needs the calendar (disabled and off without it)');
  E = boot(); E.preset('tienda'); E.hash('inscripcion'); ok(!/Quedan/.test(E.txt('#screen')) && /Paso 1 de 4/.test(E.txt('#steptext')), 'registration also works for a tienda (no places line)');
}

/* ================= E. receiving accounts: Pey needs time to activate a new one ================= */
{
  const PEYTEST = '012180015826225713', OTHER = '012180015913466252';
  let E = boot(); E.hash('ajustes');
  const edit = id => E.click(E.$$('[data-ract="edit"]').find(b => b.dataset.id === id));
  const dif = () => E.w.PCF.project().receivers.find(r => /DIF/.test(r.name));
  ok(/Cuenta por confirmar/.test(E.txt('#cfg-recv')) && /Lista · /.test(E.txt('#cfg-recv')), 'accounts list: "por confirmar" and "Lista" are shown in words');
  edit(dif().id); ok(!!E.$('#rc-h') && !!E.$('[data-ract="test-clabe"]') && /hasta 5 días hábiles/.test(E.txt('#cfg-recv-editor')), 'editor asks for the legal holder and warns about the 5 business days');
  E.click(E.$('#rc-p')); E.type('#rc-c', '1234'); E.click(E.$('[data-ract="save"]'));
  ok(/titular/.test(E.txt('#cfg-recv-editor')) && /18 dígitos/.test(E.txt('#cfg-recv-editor')), 'holder and a valid CLABE are required');
  E.type('#rc-h', 'Sistema DIF Municipal'); E.type('#rc-c', OTHER.slice(0, 17) + '0'); E.click(E.$('[data-ract="save"]'));
  ok(/no coincide/.test(E.txt('#cfg-recv-editor')), 'a CLABE with a wrong check digit is refused');
  E.type('#rc-c', OTHER); E.click(E.$('[data-ract="save"]'));
  ok(dif().status === 'processing' && dif().holder === 'Sistema DIF Municipal' && /En espera de Pey/.test(E.txt('#cfg-recv')) && /Simular que Pey la activó/.test(E.txt('#cfg-recv')), 'saved: account waits ("En espera de Pey · hasta 5 días hábiles")');
  E.hash('cobrar'); ok(/Cuenta en espera/.test(E.txt('#screen')) && /solo efectivo/i.test(E.txt('#screen')) && audit(E).length === 0, 'simple home warns that the account is waiting ' + audit(E).join('; ') + E.txt('#screen').slice(0,160));
  E.hash('ajustes'); E.click(E.$('[data-ract="sim-active"]'));
  ok(dif().status === 'active' && /Lista · /.test(E.txt('#cfg-recv')) && !E.$('[data-ract="sim-active"]'), 'when Pey activates it, the account is ready');
  E.hash('cobrar'); ok(!/Cuenta en espera/.test(E.txt('#screen')), 'the waiting notice goes away');
  // Pey test CLABE activates at once
  E.hash('ajustes'); edit(dif().id); E.type('#rc-c', PEYTEST); E.click(E.$('[data-ract="save"]')); ok(dif().status === 'active', 'Pey test CLABE is active at once');
  E.click(E.$('#addrecv')); E.type('#rc-n', 'Cuenta nueva'); E.type('#rc-h', 'Ana Prueba'); E.click(E.$('[data-ract="test-clabe"]'));
  ok(E.$('#rc-c').value === PEYTEST, '"Usar la CLABE de prueba" fills it'); E.click(E.$('[data-ract="save"]'));
  ok(E.w.PCF.project().receivers.some(r => r.name === 'Cuenta nueva' && r.status === 'active'), 'new account with the test CLABE saved as active');
  // with the DIF account ready, the annual charge can use CoDi again and says where it goes
  E = boot(); E.hash('ajustes'); edit(dif().id); E.click(E.$('#rc-p')); E.type('#rc-h', 'Sistema DIF Municipal'); E.type('#rc-c', PEYTEST); E.click(E.$('[data-ract="save"]')); E.hash('cobrar');
  E.act('start'); let found2 = false; for (let p = 0; p < 4 && !found2; p++) { for (let i = 0; i < 3 && !found2; i++) { const rows = E.$$('#screen .pickrow'); if (!rows[i]) continue; E.click(rows[i]); if (E.$('#screen [data-act="period"][data-p="x"]')) found2 = true; else E.click(E.$('#bar-back')); } if (!found2) E.act('more'); }
  E.click(E.$('#screen [data-act="period"][data-p="x"]')); E.click(E.$('[data-act="via"][data-v="qr"]'));
  ok(/El dinero llega a DIF/.test(E.txt('#screen')) && /Pago anual DIF/.test(E.txt('#screen')), 'annual charge via CoDi works once the DIF account is ready, and names where the money goes');
  ok(E.errs.length === 0, 'no window errors with account states');
}
function S_tel(E) { return E.w.PCF.state().rg.tel; }

console.log(failed ? '\n' + failed + ' check(s) FAILED' : '\nall checks passed');
