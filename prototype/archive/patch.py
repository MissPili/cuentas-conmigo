import sys

path = sys.argv[1]
s = open(path, encoding='utf-8').read()


def splice(start, end, new):
    global s
    assert s.count(start) == 1, ('start', start, s.count(start))
    i = s.index(start)
    j = s.index(end, i + len(start))
    s = s[:i] + new + s[j:]


def rep(old, new):
    global s
    assert s.count(old) == 1, ('rep', old, s.count(old))
    s = s.replace(old, new)


# ---------------------------------------------------------------- helpers
rep("const money = n => '$' + (Number(n) || 0).toLocaleString('es-MX');",
    "const money = n => { n = Number(n) || 0; return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); };")

# ---------------------------------------------------------------- features + presets
splice("  const TYPES = {", "  function viaPick(", r'''  /* One single template: these switches decide what the app shows. */
  const FEATS = [
    { k: 'periodic', name: 'Cobros con calendario', desc: 'Mensualidades, cuotas o aportaciones que se repiten en fechas fijas.' },
    { k: 'extra',    name: 'Cobro aparte',          desc: 'Una cuota distinta que nunca se mezcla con las demás, como una cuota anual.' },
    { k: 'turns',    name: 'Turnos',                desc: 'Cada ronda le toca a una persona, como en una tanda. Necesita cobros con calendario.' },
    { k: 'ledger',   name: 'Fiado',                 desc: 'Cada persona tiene su cuenta. Tú escribes el monto de lo que se lleva y de lo que abona.' }
  ];
  const PRESETS = [
    { id: 'taller', name: 'Taller o clase' }, { id: 'tanda', name: 'Tanda' },
    { id: 'tienda', name: 'Tienda con fiado' }, { id: 'vacio', name: 'Empezar desde cero' }
  ];
  let PRJ = null;

''')

splice("  function template(type) {", "  /* ---- periods derived from the schedule ---- */", r'''  /* A preset only switches features on and loads sample people. It is the same template underneath. */
  function preset(id) {
    const y = TODAY.getFullYear(), r = rng(id === 'tanda' ? 11 : 7);
    const base = {
      preset: id, name: 'Mi proyecto de cobro', shortcuts: [], payout: {},
      on: { periodic: true, extra: false, turns: false, ledger: false },
      main: { name: 'Cobro', amount: 100, freq: 'monthly', start: iso(new Date(y, TODAY.getMonth(), 1)), count: 6 },
      extra: { name: 'Cobro aparte', amount: 40 }, people: []
    };
    if (id === 'taller') {
      base.name = 'Taller de ejemplo';
      base.main = { name: 'Mensualidad del taller', amount: 130, freq: 'monthly', start: iso(new Date(y, 0, 1)), count: 12 };
      base.extra = { name: 'Pago anual DIF', amount: 40 }; base.on.extra = true;
      const c = curOf(base); base.people = FACES.map((f, i) => sampleOf(i, r, true, c, 12, true));
    } else if (id === 'tanda') {
      base.name = 'Tanda de ejemplo'; base.on.turns = true;
      base.main = { name: 'Aportación de la tanda', amount: 200, freq: 'biweekly', start: iso(new Date(y, TODAY.getMonth(), TODAY.getDate() - 4 * 15)), count: 12 };
      const c = curOf(base); base.people = FACES.map((f, i) => sampleOf(i, r, true, c, 12, false));
    } else if (id === 'tienda') {
      base.name = 'Tiendita de ejemplo'; base.on.periodic = false; base.on.ledger = true;
      const bals = [85, 0, 240, 35, 0, 120.5], notes = ['Tortillas y leche', '', 'Despensa de la semana', 'Refresco y pan', '', 'Frijol y arroz'];
      base.people = [0, 2, 4, 6, 8, 10].map((fi, k) => {
        const P = sampleOf(fi, r, false, 0, 0, false); P.bal = bals[k];
        if (bals[k] > 0) P.ledger = [{ t: 'cargo', a: bals[k], d: shortDate(new Date(y, TODAY.getMonth(), Math.max(1, TODAY.getDate() - 2 - k))), note: notes[k] }];
        return P;
      });
    }
    return base;
  }

''')

# ---------------------------------------------------------------- periods
rep("    const m = PRJ.main, out = [], s = new Date(m.start + 'T12:00:00');",
    "    if (!PRJ.on.periodic) return [];\n    const m = PRJ.main, out = [], s = new Date(m.start + 'T12:00:00');")
rep("      if (PRJ.turns) { sub = 'ronda '", "      if (PRJ.on.turns) { sub = 'ronda '")

# ---------------------------------------------------------------- ledger rounding
rep("const c = charge(P, k); P.bal = Math.max(0, P.bal - c.amount);",
    "const c = charge(P, k); P.bal = Math.max(0, Math.round((P.bal - c.amount) * 100) / 100);")

# ---------------------------------------------------------------- state
rep("const S = { view: 'who', person: null, period: 0, voice: true };",
    "const S = { view: 'who', person: null, period: 0, voice: true, amt: { mode: 'cargo', buf: '', note: '' } };")

# ---------------------------------------------------------------- viewWho
splice("  function viewWho() {", "  function tileHTML(", r'''  function ringOf(P, c) {
    if (PRJ.on.periodic) { if (P.from > c) return ''; const v = getRec(P, c); return v ? v.s : ''; }
    if (PRJ.on.ledger) return P.bal > 0 ? 'wait' : 'paid';
    if (PRJ.on.extra) return P.extra ? P.extra.s : '';
    return '';
  }
  function viewWho() {
    const on = PRJ.on, L = PRJ.people;
    if (!on.periodic && !on.extra && !on.ledger) {
      return '<div class="empty"><h1 class="q" style="color:var(--ink)">No hay nada que cobrar</h1><p>Activa al menos una función en Configurar.</p><button class="btn primary" data-goto="configurar" style="justify-content:center">Ir a Configurar</button></div>';
    }
    if (!L.length) {
      return '<div class="empty"><h1 class="q" style="color:var(--ink)">Aún no hay personas</h1><p>Agrega a quienes les vas a cobrar, con su foto y su permiso.</p><button class="btn primary" data-goto="configurar" style="justify-content:center">Agregar personas</button></div>';
    }
    const c = cur(), ledgerOnly = on.ledger && !on.periodic; let bar = '', debt = '', turnBlock = '';
    if (on.periodic) {
      let paid = 0, wait = 0, due = 0;
      L.forEach(p => { if (p.from > c) return; const v = getRec(p, c); if (v && v.s === 'paid') paid++; else if (v && v.s === 'wait') wait++; else due++; });
      const tot = Math.max(1, paid + wait + due), per = periods()[c];
      bar = '<div style="margin-top:12px" class="seg" role="img" aria-label="' + paid + ' pagaron, ' + wait + ' pendientes, ' + due + ' faltan"><i class="p" style="width:' + (paid / tot * 100) + '%"></i><i class="w" style="width:' + (wait / tot * 100) + '%"></i></div>' +
        '<div class="sum"><span>' + esc(per.title) + ':</span><span><b>' + paid + '</b> pagaron</span><span><b>' + wait + '</b> pendientes</span><span><b>' + due + '</b> faltan</span></div>';
    }
    if (on.ledger) {
      const owing = L.filter(p => p.bal > 0), total = owing.reduce((a, p) => a + p.bal, 0);
      debt = '<div class="sum"><span>Te deben <b>' + money(total) + '</b></span><span><b>' + owing.length + '</b> de ' + L.length + ' personas</span></div>';
    }
    if (on.turns && on.periodic) {
      const holder = L[c % L.length], done = PRJ.payout[c];
      turnBlock = '<div class="turn"><div class="row"><div class="ava">' + avatar(holder) + '</div><div class="grow"><strong>Ronda ' + (c + 1) + ' de ' + periods().length + '</strong>Le toca a ' + esc(holder.n) + '. Bolsa de ' + money(PRJ.main.amount * L.length) + '.</div></div>' +
        (done ? '<div class="waiting" style="background:var(--paid);color:var(--on-paid)">' + ICON.check + 'Entrega registrada</div>' : '<button class="btn" data-act="payout">' + ICON.cash + 'Registrar que ya recibió la bolsa</button>') + '</div>';
    }
    const faces = L.map((p, i) => {
      const st = ringOf(p, c); let badge = '';
      if (!(ledgerOnly && p.bal > 0)) badge = st === 'paid' ? '<span class="badge paid">' + ICON.check + '</span>' : st === 'wait' ? '<span class="badge wait">' + ICON.clock + '</span>' : '';
      const pill = on.ledger && p.bal > 0 ? '<span class="amtbadge">' + money(p.bal) + '</span>' : '';
      const flag = on.turns && on.periodic && i === c % L.length ? '<span class="turnflag">' + ICON.star + 'Le toca</span>' : '';
      let label = esc(p.n);
      if (ledgerOnly) label += p.bal > 0 ? ', debe ' + p.bal + ' pesos' : ', no debe nada';
      else { label += st === 'paid' ? ', ya pagó' : st === 'wait' ? ', pendiente' : ', falta pagar'; if (on.ledger && p.bal > 0) label += ', debe ' + p.bal + ' pesos'; }
      return '<button class="person ' + st + '" data-act="pick" data-id="' + p.id + '" aria-label="' + label + '">' + avatar(p) + flag + pill + badge + '</button>';
    }).join('');
    return '<div><h1 class="q">' + (on.periodic || on.extra ? '¿Quién paga?' : '¿Quién es?') + '</h1>' + bar + debt + '</div>' + turnBlock + '<div class="faces">' + faces + '</div>';
  }

''')

# ---------------------------------------------------------------- viewWhat + keypad
splice("  function viewWhat() {", "  function viewPay() {", r'''  function viewWhat() {
    const P = byId(S.person); if (!P) return viewWho();
    const on = PRJ.on, pays = on.periodic || on.extra;
    let h = '<button class="btn back" data-act="back">' + ICON.back + 'Otra persona</button><div class="who"><div class="ava">' + avatar(P) + '</div><div><strong>' + esc(P.n) + '</strong></div></div>';
    if (pays) h += '<div><h1 class="q">¿Qué paga?</h1>' + (on.periodic ? '<p class="label" style="margin:8px 0 0">' + esc(PRJ.main.name) + ' · ' + money(PRJ.main.amount) + ' · ' + freqText(PRJ.main.freq) + '</p>' : '') + '</div>';
    if (on.periodic) {
      let tiles = ''; periods().forEach((pp, k) => { tiles += tileHTML(P, k, pp); });
      h += '<div class="tiles">' + tiles + '</div>';
    }
    if (on.extra) {
      const v = P.extra, st = v ? v.s : '';
      h += '<div class="annual-wrap"' + (on.periodic ? '' : ' style="border-top:0;padding-top:0"') + '><div class="label">Aparte, no se mezcla</div><button class="annual ' + st + '" data-act="period" data-p="x" aria-label="' + esc(PRJ.extra.name) + (st === 'paid' ? ', pagado' : st === 'wait' ? ', pendiente' : ', falta') + '"><span>' + esc(PRJ.extra.name) + '</span><span class="row" style="gap:10px">' + (st === 'paid' ? ICON.check : st === 'wait' ? ICON.clock : '') + money(PRJ.extra.amount) + '</span></button></div>';
    }
    if (pays) h += '<div class="legend"><span><i class="dot" style="background:var(--paid);color:var(--on-paid)">' + ICON.check + '</i> Pagado</span><span><i class="dot" style="background:var(--wait);color:var(--on-wait)">' + ICON.clock + '</i> Pendiente</span><span><i class="dot" style="background:hsl(225 62% var(--ml))"></i> Falta</span></div>';
    if (on.ledger) {
      const pend = P.pend ? '<div class="card" style="border-color:var(--wait)"><div class="waiting"><i class="pulse"></i>Cobro de ' + money(P.pend.amount) + ' pendiente</div><button class="btn" data-act="period" data-p="f">Ver cobro</button></div>' : '';
      h += '<div class="account"><div class="label">Su cuenta de fiado</div><div class="debt"><div class="label">Debe</div><div class="big">' + money(P.bal) + '</div></div>' + pend +
        '<div class="stack"><button class="btn primary" data-act="amount" data-m="abono"' + (P.bal <= 0 ? ' disabled' : '') + ' style="justify-content:center">Abonar</button><button class="btn" data-act="amount" data-m="cargo" style="justify-content:center">Se lleva fiado</button></div>' +
        (P.ledger.length ? '<ul class="ledger">' + P.ledger.slice(0, 4).map(l => '<li><span>' + (l.t === 'abono' ? 'Abono' : 'Fiado') + ' · ' + esc(l.d) + (l.note ? ' · ' + esc(l.note) : '') + '</span><b>' + (l.t === 'abono' ? '− ' : '+ ') + money(l.a) + '</b></li>').join('') + '</ul>' : '') + '</div>';
    }
    return h;
  }

  /* free-amount keypad: nothing here is a fixed quantity */
  function fmtBuf(b) {
    if (!b) return '0';
    const i = b.indexOf('.'), ip = i < 0 ? b : b.slice(0, i), f = Number(ip || 0).toLocaleString('es-MX');
    return i < 0 ? f : f + '.' + b.slice(i + 1);
  }
  const amtVal = () => { const v = parseFloat(S.amt.buf); return isFinite(v) ? Math.round(v * 100) / 100 : 0; };
  function viewAmount() {
    const P = byId(S.person); if (!P) return viewWho();
    const a = S.amt, cargo = a.mode === 'cargo', sc = PRJ.shortcuts.filter(x => x > 0);
    return '<button class="btn back" data-act="back">' + ICON.back + 'Volver</button><div class="who"><div class="ava">' + avatar(P) + '</div><div><strong>' + esc(P.n) + '</strong>' + (cargo ? '' : '<div style="color:var(--ink-soft);font-size:1rem">Debe ' + money(P.bal) + '</div>') + '</div></div>' +
      '<h1 class="q">' + (cargo ? '¿Cuánto se lleva fiado?' : '¿Cuánto abona?') + '</h1>' +
      '<div class="display" id="amt-display" aria-live="polite"></div>' +
      (!cargo && P.bal > 0 ? '<button class="btn" data-act="amt-all" style="justify-content:center">Todo lo que debe: ' + money(P.bal) + '</button>' : '') +
      (sc.length ? '<div class="chips">' + sc.map(x => '<button class="btn small" data-act="amt-chip" data-a="' + x + '">' + money(x) + '</button>').join('') + '</div>' : '') +
      '<div class="keys">' + ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'].map(k => '<button class="btn" data-act="key" data-k="' + k + '" aria-label="' + (k === 'del' ? 'Borrar' : k === '.' ? 'Punto decimal' : k) + '"' + (k === 'del' ? ' style="font-size:1.15rem"' : '') + '>' + (k === 'del' ? 'Borrar' : k) + '</button>').join('') + '</div>' +
      (cargo ? '<div class="field"><label for="amt-note">¿Qué se llevó? (opcional)</label><input id="amt-note" type="text" maxlength="40" autocomplete="off" value="' + esc(a.note) + '"></div>' : '') +
      '<div class="hint" id="amt-hint" role="status"></div><button class="btn primary" id="amt-ok" data-act="amt-ok" style="justify-content:center"></button>';
  }
  function paintAmount() {
    const d = $('#amt-display'); if (!d) return;
    const a = S.amt, P = byId(S.person), v = amtVal(); let ok = v > 0, hint = '';
    if (a.mode === 'abono' && v > P.bal + 0.001) { ok = false; hint = 'Debe solo ' + money(P.bal) + '.'; }
    d.textContent = '$' + fmtBuf(a.buf); d.classList.toggle('empty', !a.buf);
    const b = $('#amt-ok'); b.disabled = !ok; b.textContent = (a.mode === 'cargo' ? 'Anotar ' : 'Cobrar ') + (v > 0 ? money(v) : '');
    $('#amt-hint').textContent = hint;
  }

''')

# ---------------------------------------------------------------- render hook
rep("const m = { who: viewWho, what: viewWhat, pay: viewPay, done: viewDone };",
    "const m = { who: viewWho, what: viewWhat, amount: viewAmount, pay: viewPay, done: viewDone };")
rep("    $('#screen').innerHTML = m[S.view]();",
    "    $('#screen').innerHTML = m[S.view]();\n    if (S.view === 'amount') paintAmount();")

# ---------------------------------------------------------------- summary
splice("  function paintSummary() {", "  /* ================= app actions ================= */", r'''  function paintSummary() {
    const on = PRJ.on, m = PRJ.main, ok = PRJ.people.filter(p => p.consent.ok).length, rows = [];
    if (on.periodic) rows.push(['Cobros con calendario', money(m.amount) + ' ' + freqText(m.freq) + (m.freq === 'once' ? '' : ', ' + periods().length + ' veces')]);
    if (on.extra) rows.push(['Cobro aparte', PRJ.extra.name + ', ' + money(PRJ.extra.amount)]);
    if (on.turns) rows.push(['Turnos', 'Sí']);
    if (on.ledger) rows.push(['Fiado', 'Sí, con el monto que escribas']);
    if (!rows.length) rows.push(['Funciones', 'Ninguna activa']);
    rows.push(['Personas', String(PRJ.people.length)], ['Con foto autorizada', ok + ' de ' + PRJ.people.length]);
    $('#cfgsum').innerHTML = rows.map(r => '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>').join('');
  }

''')

# ---------------------------------------------------------------- app actions
splice("  function go(view, text) {", "  /* ================= CONFIGURATION ================= */", r'''  function go(view, text) { S.view = view; render(); if (text) say(text); }
  const asksWhat = () => PRJ.on.periodic || PRJ.on.extra;
  function onAct(e) {
    const g = e.target.closest('[data-goto]'); if (g) { location.hash = g.dataset.goto; return; }
    const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
    const a = el.dataset.act, P = byId(S.person);
    if (a === 'pick') { S.person = +el.dataset.id; go('what', byId(S.person).n + (asksWhat() ? '. ¿Qué paga?' : '.')); }
    else if (a === 'back') { if (S.view === 'pay' || S.view === 'amount') go('what', asksWhat() ? '¿Qué paga?' : ''); else go('who', 'Toca tu foto'); }
    else if (a === 'next') go('who', 'Toca tu foto');
    else if (a === 'period') {
      S.period = el.dataset.p === 'x' ? 'x' : el.dataset.p === 'f' ? 'f' : +el.dataset.p;
      const r = getRec(P, S.period);
      if (r && r.s === 'paid') { go('done', 'Ya está pagado'); return; }
      if (!r) putRec(P, S.period, { s: 'wait', via: 'qr', payer: 0 });
      const c = charge(P, S.period); go('pay', c.amount + ' pesos, ' + c.speak);
    }
    else if (a === 'amount') { S.amt = { mode: el.dataset.m, buf: '', note: '' }; go('amount', el.dataset.m === 'cargo' ? '¿Cuánto se lleva fiado?' : '¿Cuánto abona?'); }
    else if (a === 'key') {
      const k = el.dataset.k; let b = S.amt.buf;
      if (k === 'del') b = b.slice(0, -1);
      else if (k === '.') { if (b.indexOf('.') < 0) b = (b || '0') + '.'; }
      else { const dot = b.indexOf('.'); if (dot >= 0 ? b.length - dot - 1 < 2 : b.length < 7) b = b === '0' ? k : b + k; }
      S.amt.buf = b; paintAmount();
    }
    else if (a === 'amt-chip') { S.amt.buf = el.dataset.a; paintAmount(); }
    else if (a === 'amt-all') { S.amt.buf = String(P.bal); paintAmount(); }
    else if (a === 'amt-ok') {
      const v = amtVal(); if (!(v > 0)) return;
      if (S.amt.mode === 'cargo') {
        P.bal = Math.round((P.bal + v) * 100) / 100;
        P.ledger.unshift({ t: 'cargo', a: v, d: shortDate(TODAY), note: (S.amt.note || '').trim() });
        go('what', 'Anotado. Ahora debe ' + P.bal + ' pesos');
      } else {
        if (v > P.bal + 0.001) return;
        S.period = 'f'; P.pend = { s: 'wait', via: 'qr', payer: 0, amount: v }; go('pay', v + ' pesos de abono');
      }
    }
    else if (a === 'via') {
      const v = el.dataset.v, k = +(el.dataset.k || 0), old = getRec(P, S.period) || {};
      putRec(P, S.period, Object.assign({}, old, { s: 'wait', via: v, payer: v === 'fam' ? k : 0 }));
      go('pay', v === 'fam' ? 'Enviamos la solicitud a ' + P.payers[k].name : v === 'cash' ? '¿Recibiste el efectivo?' : 'Muestra el código');
    }
    else if (a === 'simulate') { const r = getRec(P, S.period) || {}; markPaid(P, S.period, r.via || 'qr', r.payer || 0); go('done', 'Listo, pagado'); }
    else if (a === 'cash') { markPaid(P, S.period, 'cash', 0); go('done', 'Listo, pagado'); }
    else if (a === 'cancel') { putRec(P, S.period, null); go('what', ''); }
    else if (a === 'payout') { PRJ.payout[cur()] = true; render(); say('Entrega registrada'); }
  }

''')

# ---------------------------------------------------------------- configuration render
splice("  function renderTypes() {", "  function renderPeople() {", r'''  function renderFeats() {
    $('#cfg-feats').innerHTML = FEATS.map(f => {
      const dis = f.k === 'turns' && !PRJ.on.periodic, on = PRJ.on[f.k];
      return '<label class="feat ' + (on ? 'on' : '') + (dis ? ' dis' : '') + '" for="ft-' + f.k + '"><input id="ft-' + f.k + '" type="checkbox" data-path="on.' + f.k + '" data-rerender="1"' + (on ? ' checked' : '') + (dis ? ' disabled' : '') + '><span><strong>' + f.name + '</strong><span>' + f.desc + '</span></span></label>';
    }).join('');
  }
  function renderPresets() {
    $('#cfg-presets').innerHTML = PRESETS.map(p => '<button class="btn small" data-preset="' + p.id + '">' + p.name + '</button>').join('');
  }
  function fld(id, label, inner, hint, cls) { return '<div class="field ' + (cls || '') + '"><label for="' + id + '">' + label + '</label>' + inner + (hint ? '<div class="hint">' + hint + '</div>' : '') + '</div>'; }
  function renderForm() {
    const on = PRJ.on, m = PRJ.main; let h = '';
    h += fld('f-name', 'Nombre de tu grupo', '<input id="f-name" type="text" data-path="name" value="' + esc(PRJ.name) + '" maxlength="40">', 'Aparece arriba en la app.', 'span');
    if (on.periodic) {
      h += fld('f-mname', '¿Qué cobras?', '<input id="f-mname" type="text" data-path="main.name" value="' + esc(m.name) + '" maxlength="40">', 'Por ejemplo: Mensualidad, Aportación, Cuota.');
      h += fld('f-amount', 'Monto en pesos', '<input id="f-amount" type="number" inputmode="decimal" min="1" step="any" data-path="main.amount" data-num="1" value="' + m.amount + '">');
      h += fld('f-freq', 'Cada cuánto', '<select id="f-freq" data-path="main.freq" data-rerender="1">' + [['weekly', 'Cada semana'], ['biweekly', 'Cada quincena'], ['monthly', 'Cada mes'], ['yearly', 'Cada año'], ['once', 'Una sola vez']].map(o => '<option value="' + o[0] + '"' + (m.freq === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>');
      h += fld('f-start', m.freq === 'once' ? 'Fecha de cobro' : 'Primer cobro', '<input id="f-start" type="date" data-path="main.start" value="' + esc(m.start) + '">', 'Desde esta fecha se calculan los demás.');
      if (m.freq !== 'once') h += fld('f-count', 'Cuántos cobros', '<input id="f-count" type="number" inputmode="numeric" min="1" max="24" step="1" data-path="main.count" data-num="1" value="' + m.count + '">', 'Entre 1 y 24.');
    }
    if (on.extra) {
      h += fld('f-ename', 'Nombre del cobro aparte', '<input id="f-ename" type="text" data-path="extra.name" value="' + esc(PRJ.extra.name) + '" maxlength="40">');
      h += fld('f-eamount', 'Monto del cobro aparte', '<input id="f-eamount" type="number" inputmode="decimal" min="1" step="any" data-path="extra.amount" data-num="1" value="' + PRJ.extra.amount + '">', 'Se cobra una vez por persona.');
    }
    if (on.ledger) {
      h += '<div class="field span"><span class="lbl">Montos de acceso rápido (opcional)</span><div class="chips">' +
        PRJ.shortcuts.map((x, i) => '<span class="chipx">' + money(x) + '<button class="xbtn" data-pact="sc-rm" data-i="' + i + '" aria-label="Quitar ' + money(x) + '">×</button></span>').join('') + '</div>' +
        '<div class="btnrow"><input id="f-sc" type="number" inputmode="decimal" min="0.5" step="any" placeholder="Monto" aria-label="Nuevo monto rápido" style="max-width:10rem">' + (PRJ.shortcuts.length < 6 ? '<button class="btn small" data-pact="sc-add">Agregar</button>' : '') + '</div>' +
        '<div class="hint">No son límites ni precios. Al anotar o abonar siempre escribes el monto que quieras; estos botones solo ahorran toques.</div></div>';
    }
    $('#cfg-form').innerHTML = h;
  }
  function renderPreview() {
    const on = PRJ.on; let h = '';
    if (on.periodic) {
      const per = periods(), m = PRJ.main;
      const sentence = m.freq === 'once' ? 'Cobrarás ' + money(m.amount) + ' el ' + longDate(per[0].date) + '.' : 'Cobrarás ' + money(m.amount) + ' ' + freqText(m.freq) + ', ' + per.length + ' veces, del ' + longDate(per[0].date) + ' al ' + longDate(per[per.length - 1].date) + '.';
      h += '<div class="label">Cobros con calendario</div><div class="tiles">' + per.slice(0, 12).map((p, k) => '<div class="tile" style="--h:' + HUES[k % 12] + '"><span>' + esc(p.label) + '</span>' + (p.sub ? '<small>' + esc(p.sub) + '</small>' : '') + '</div>').join('') + '</div><p>' + sentence + (on.extra ? ' Aparte: ' + esc(PRJ.extra.name) + ', ' + money(PRJ.extra.amount) + '.' : '') + '</p>';
    } else if (on.extra) {
      h += '<div class="label">Cobro aparte</div><p>' + esc(PRJ.extra.name) + ', ' + money(PRJ.extra.amount) + ' por persona.</p>';
    }
    if (on.ledger) {
      const sc = PRJ.shortcuts.filter(x => x > 0);
      h += '<div class="label">Fiado</div><p>Cada persona tiene su cuenta. Al anotar o abonar, escribes el monto con un teclado grande' + (sc.length ? ' o tocas uno de tus montos rápidos (' + sc.map(money).join(', ') + ').' : '.') + '</p>';
    }
    $('#cfg-preview').innerHTML = h || '<p>Activa al menos una función para ver cómo se verá.</p>';
  }
''')

# ---------------------------------------------------------------- configuration events
splice("  function onCfgInput(e) {", "  function onCfgFile(e) {", r'''  function onCfgInput(e) {
    const t = e.target;
    if (t.dataset.d) {
      let v = t.value; if (/\.tel$|^tel$/.test(t.dataset.d)) { v = v.replace(/[^0-9]/g, '').slice(0, 10); if (v !== t.value) t.value = v; }
      setPath(EDIT.draft, t.dataset.d, v); return;
    }
    const p = t.dataset.path; if (!p) return;
    if (p === 'main.start' && !t.value) return;
    if (t.type === 'checkbox') { setPath(PRJ, p, t.checked); if (p === 'on.periodic' && !t.checked) PRJ.on.turns = false; }
    else if (t.dataset.num) { let n = parseFloat(t.value); if (!(n >= 0)) n = 0; if (p === 'main.count') n = Math.max(1, Math.min(24, Math.round(n))); setPath(PRJ, p, n); }
    else setPath(PRJ, p, t.value);
    if (e.type === 'change' && t.dataset.rerender) {
      if (p === 'main.freq' && t.value === 'once') PRJ.main.count = 1;
      const id = t.id; renderFeats(); renderForm();
      const n = id && $('#' + id); if (n) n.focus();
    }
    afterChange();
  }
  function onCfgClick(e) {
    const pr = e.target.closest('[data-preset]');
    if (pr) { PRJ = preset(pr.dataset.preset); S.view = 'who'; S.person = null; EDIT.draft = null; EDIT.confirmRemove = null; renderAll(); say('Toca tu foto'); return; }
    if (e.target.closest('#addperson')) { openEditor(null); return; }
    const b = e.target.closest('[data-pact]'); if (!b) return;
    const a = b.dataset.pact, d = EDIT.draft;
    if (a === 'sc-add') {
      const v = Math.round(parseFloat($('#f-sc').value) * 100) / 100;
      if (v > 0 && PRJ.shortcuts.indexOf(v) < 0 && PRJ.shortcuts.length < 6) { PRJ.shortcuts.push(v); PRJ.shortcuts.sort((x, y) => x - y); renderForm(); renderPreview(); const n = $('#f-sc'); if (n) n.focus(); }
    }
    else if (a === 'sc-rm') { PRJ.shortcuts.splice(+b.dataset.i, 1); renderForm(); renderPreview(); }
    else if (a === 'edit') openEditor(byId(+b.dataset.id));
    else if (a === 'remove') { EDIT.confirmRemove = +b.dataset.id; renderPeople(); }
    else if (a === 'remove-no') { EDIT.confirmRemove = null; renderPeople(); }
    else if (a === 'remove-yes') { PRJ.people = PRJ.people.filter(p => p.id !== +b.dataset.id); EDIT.confirmRemove = null; renderPeople(); afterChange(); }
    else if (a === 'cancel') { EDIT.draft = null; EDIT.errors = []; renderEditor(); }
    else if (a === 'save') saveEditor();
    else if (a === 'photo-rm') { d.photo = null; renderEditor(); }
    else if (a === 'consent') { d.consent.ok = b.checked; if (b.checked && !d.consent.date) d.consent.date = longDate(TODAY); renderEditor(); const c = $('#e-consent'); if (c) c.focus(); }
    else if (a === 'payer-add') { d.payers.push({ name: '', rel: RELS[0], tel: '', primary: !d.payers.length }); renderEditor(); const f = $('#q-n' + (d.payers.length - 1)); if (f) f.focus(); }
    else if (a === 'payer-rm') { d.payers.splice(+b.dataset.i, 1); if (d.payers.length && !d.payers.some(q => q.primary)) d.payers[0].primary = true; renderEditor(); }
    else if (a === 'primary') { d.payers.forEach((q, i) => { q.primary = i === +b.dataset.i; }); }
  }
''')

rep("function renderAll() { renderTypes(); renderForm();", "function renderAll() { renderFeats(); renderPresets(); renderForm();")
rep("PRJ = template('taller');", "PRJ = preset('taller');")
rep("$('#screen').addEventListener('click', onAct);",
    "$('#screen').addEventListener('click', onAct);\n    $('#screen').addEventListener('input', function (e) { if (e.target.id === 'amt-note') S.amt.note = e.target.value; });")

# ---------------------------------------------------------------- CSS
splice(".types { display: grid;", ".form { display: grid;", r'''.feats { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
.feat { display: flex; gap: 14px; align-items: flex-start; border: 3px solid var(--line); border-radius: 20px; padding: 14px; cursor: pointer; background: var(--surface); }
.feat.on { border-color: var(--ink); }
.feat.dis { opacity: .55; cursor: not-allowed; }
.feat input { width: 1.9rem; height: 1.9rem; margin: 2px 0 0; flex: none; accent-color: var(--ink); }
.feat strong { display: block; font-family: var(--font-display); font-size: 1.25rem; color: var(--ink); }
.feat span span { font-size: .98rem; color: var(--ink-soft); }
.presets { display: flex; flex-wrap: wrap; gap: 10px; }
.account { display: grid; gap: 12px; padding-top: 14px; border-top: 3px dashed var(--line); }
.display { text-align: center; font-family: var(--font-display); font-weight: 800; font-size: 3.6rem; line-height: 1.1; padding: 10px; border: 3px solid var(--ink); border-radius: 22px; min-height: 5.4rem; overflow-wrap: anywhere; }
.display.empty { color: var(--ink-soft); }
.keys { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.keys .btn { justify-content: center; font-size: 1.9rem; min-height: 4.6rem; padding: 0; text-align: center; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chipx { display: inline-flex; align-items: center; gap: 2px; border: 2px solid var(--line); border-radius: 99px; padding: 0 4px 0 14px; font-weight: 700; font-size: 1.1rem; }
.xbtn { min-width: 2.5rem; min-height: 2.5rem; border: 0; background: none; font-weight: 800; font-size: 1.3rem; }
.hint { font-size: .92rem; color: var(--ink-soft); min-height: 1.2em; }
''')
rep(".amtbadge { position: absolute; right: 6px; bottom: 6px;", ".amtbadge { position: absolute; left: 6px; bottom: 6px;")

# ---------------------------------------------------------------- HTML
rep('''    <h2 id="h-tipo">1. ¿Qué vas a cobrar?</h2>
    <p>Elige el tipo que más se parezca. Cada uno carga datos de ejemplo y después puedes cambiarlo todo.</p>
    <div class="types" id="cfg-types"></div>''',
    '''    <h2 id="h-tipo">1. ¿Qué necesitas en tu cobro?</h2>
    <p>Es una sola app. Activa las funciones que uses y puedes combinarlas; las demás desaparecen de la pantalla.</p>
    <div class="feats" id="cfg-feats"></div>
    <div class="label">O empieza con un ejemplo</div>
    <div class="presets" id="cfg-presets"></div>
    <p>Un ejemplo solo enciende funciones y carga personas de prueba. Después cambias lo que quieras.</p>''')
rep('<h2 id="h-cuanto">2. ¿Cuánto cobras, cuándo y cada cuánto?</h2>', '<h2 id="h-cuanto">2. Montos, fechas y cuentas</h2>')

open(path, 'w', encoding='utf-8').write(s)
print('patched OK')
