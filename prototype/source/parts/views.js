  /* ================= app state, settings, voice, sound ================= */
  const S = {
    tab: 'cobrar', view: 'home', hist: [], page: 0, person: null, period: null, flow: null,
    amt: { mode: 'cargo', buf: '', note: '' }, rg: null, regCount: 0, repK: null, sent: {}, rnote: '', undo: null, saved: null, notice: '', err: null, fail: false, say: '', doneInfo: null,
    set: { voice: true, sound: true, hc: false, xl: false }
  };
  const r2 = n => Math.round(n * 100) / 100;
  function loadSet() {
    try {
      const j = JSON.parse(localStorage.getItem('pcf-settings') || 'null');
      if (j && typeof j === 'object') Object.assign(S.set, j);
      else if (window.matchMedia && window.matchMedia('(prefers-contrast: more)').matches) S.set.hc = true;
    } catch (e) { /* storage can be blocked; defaults are fine */ }
  }
  function saveSet() { try { localStorage.setItem('pcf-settings', JSON.stringify(S.set)); } catch (e) { /* optional */ } }
  function applySet() {
    const r = document.documentElement;
    r.setAttribute('data-contrast', S.set.hc ? 'high' : 'normal');
    if (S.set.xl) r.setAttribute('data-text', 'xl'); else r.removeAttribute('data-text');
  }
  function speak(text) {
    try {
      if (!text || !('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.lang = 'es-MX'; u.rate = 0.9;
      const vs = window.speechSynthesis.getVoices() || [];
      const v = vs.find(x => x.lang.replace('_', '-').toLowerCase() === 'es-mx') || vs.find(x => x.lang.toLowerCase().indexOf('es') === 0);
      if (v) u.voice = v;
      window.speechSynthesis.speak(u);
    } catch (e) { /* voice is optional */ }
  }
  function say(text) {
    const c = $('#voicecap'); if (c && text) c.innerHTML = '<b>«' + esc(text) + '»</b>';
    if (S.set.voice && text) speak(text);
  }
  /* Sound and vibration are extras: the visual confirmation must stand alone (the iPhone ringer switch can mute sound, and Safari on iPhone has no vibrate). */
  let actx = null;
  function feedback(kind) {
    if (!S.set.sound) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        actx = actx || new AC(); if (actx.state === 'suspended') actx.resume();
        const seq = kind === 'ok' ? [[660, 0, .12], [880, .14, .22]] : [[220, 0, .3]];
        seq.forEach(n => { const o = actx.createOscillator(), g = actx.createGain(); o.type = kind === 'ok' ? 'sine' : 'square'; o.frequency.value = n[0]; g.gain.value = .12; o.connect(g); g.connect(actx.destination); o.start(actx.currentTime + n[1]); o.stop(actx.currentTime + n[1] + n[2]); });
      }
    } catch (e) { /* optional */ }
    try { if (navigator.vibrate) navigator.vibrate(kind === 'ok' ? [80, 50, 80] : [250]); } catch (e) { /* optional */ }
  }

  function fakeQR(seedN) {
    const n = 25, r = rng(seedN * 97 + 13); let out = '';
    const finder = (x, y) => '<rect x="' + x + '" y="' + y + '" width="7" height="7" fill="#000"/><rect x="' + (x + 1) + '" y="' + (y + 1) + '" width="5" height="5" fill="#fff"/><rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="3" height="3" fill="#000"/>';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if ((x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9)) continue;
      if (r() < .48) out += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="#000"/>';
    }
    return '<svg viewBox="0 0 25 25" role="img" aria-label="QR de ejemplo" shape-rendering="crispEdges"><rect width="25" height="25" fill="#fff"/>' + out + finder(0, 0) + finder(n - 7, 0) + finder(0, n - 7) + '</svg>';
  }

  /* ================= SIMPLE MODE: small building blocks ================= */
  const attrs = d => Object.keys(d || {}).map(k => ' data-' + k + '="' + esc(d[k]) + '"').join('');
  function choice(o) {
    return '<button class="cbtn' + (o.primary ? ' primary' : '') + (o.cls ? ' ' + o.cls : '') + '" data-act="' + o.act + '"' + attrs(o.data) +
      (o.role ? ' role="' + o.role + '" aria-checked="' + o.checked + '"' : '') + '>' +
      (o.mk != null ? '<span class="mk" style="--h:' + o.mk + '" aria-hidden="true"></span>' : '') + (o.icon || '') +
      '<span class="ct"><span class="cl">' + esc(o.label) + '</span>' + (o.sub ? '<small>' + esc(o.sub) + '</small>' : '') + '</span>' + (o.right || '') + '</button>';
  }
  const stt = (st, text) => '<span class="stt stt-' + st + '" data-state="' + st + '">' + (st === 'paid' ? ICON.check : st === 'wait' ? ICON.clock : ICON.ring) + '<span>' + esc(text) + '</span></span>';
  const idstrip = (P, extra) => '<div class="idstrip"><div class="ava">' + avatar(P) + '</div><div><strong>' + esc(P.n) + '</strong>' + (extra ? '<div class="txt soft say">' + esc(extra) + '</div>' : '') + '</div></div>';
  const alertBox = msg => '<div class="alertbox">' + ICON.alert + '<span>' + esc(msg) + '</span></div>';
  /* More than 4 options: show 3 plus a "see more" button, so a screen never holds more than 4 choices. */
  function paged(items, label) {
    if (items.length <= 4) return { rows: items, pager: '' };
    const n = Math.ceil(items.length / 3), pg = S.page % n, last = pg === n - 1;
    return { rows: items.slice(pg * 3, pg * 3 + 3), pager: '<button class="cbtn pager" data-act="more"><span class="ct"><span class="cl">' + (last ? 'Volver a las primeras' : label) + '</span><small>Hoja ' + (pg + 1) + ' de ' + n + '</small></span></button>' };
  }
  const amtVal = () => parseAmt(S.amt.buf);
  /* Accepts "12.5", "12,5" and "1,250". A comma followed by exactly 3 digits is a thousands separator. */
  function parseAmt(raw) {
    let s = String(raw || '').replace(/[^0-9.,]/g, '');
    if (!s) return 0;
    if (s.indexOf('.') >= 0) s = s.replace(/,/g, '');
    else if (s.indexOf(',') >= 0) { if (/^\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, ''); else if (/^\d+,\d{1,2}$/.test(s)) s = s.replace(',', '.'); else s = s.replace(/,/g, ''); }
    const v = parseFloat(s); return isFinite(v) ? Math.min(9999999.99, r2(v)) : 0;
  }
  const trimAmt = n => { const s = (Math.round(n * 100) / 100).toFixed(2); return s.replace(/\.00$/, ''); };
  const shortNote = s => (s.length > 24 ? s.slice(0, 23) + '…' : s);

  function personState(P, c) {
    const on = PRJ.on;
    if (on.periodic) { const v = getRec(P, c); if (v && v.s === 'paid') return { st: 'paid', text: 'Ya pagó' }; if (v && v.s === 'wait') return { st: 'wait', text: 'Esperando pago' }; return { st: 'due', text: 'Falta pagar' }; }
    if (on.ledger) return P.bal > 0 ? { st: 'due', text: 'Debe ' + money(P.bal) } : { st: 'paid', text: 'No debe nada' };
    const v = P.extra; return v && v.s === 'paid' ? { st: 'paid', text: 'Ya pagó' } : v ? { st: 'wait', text: 'Esperando pago' } : { st: 'due', text: 'Falta pagar' };
  }
  function openPeriods(P) { const out = []; periods().forEach((pp, k) => { if (k < P.from) return; const v = getRec(P, k); if (!v || v.s !== 'paid') out.push(k); }); return out; }
  function nextOpen(P) { const all = openPeriods(P), c = cur(), upto = all.filter(k => k <= c); return upto.length ? upto[0] : (all.length ? all[0] : null); }
  const stWord = (P, k) => { const v = getRec(P, k); return v && v.s === 'wait' ? 'esperando pago' : k > cur() ? 'se puede adelantar' : 'falta'; };
  const toLine2 = c => (c.to ? '<p class="to2 say">El dinero llega a <b>' + esc(c.to.name) + '</b>' + (c.to.pending && !/confirmar/i.test(c.to.name) ? ' (por confirmar)' : '') + '</p>' : '');
  const idcharge = (P, c) => '<div class="idcharge"><div class="ava">' + avatar(P) + '</div><div class="ct"><strong>' + esc(P.n) + '</strong>' + chargeLine(c) + '</div></div>';
  function chargeLine(c) {
    return '<div class="chargeline"><span class="mchip' + (c.h === null ? ' annualchip' : '') + '" style="--h:' + (c.h === null ? 225 : c.h) + '">' + esc(c.title) + '</span><span class="bigamt">' + money(c.amount) + '</span></div>';
  }

  /* ================= SIMPLE MODE: views (each returns {html, say}) ================= */
  function homeStatus() {
    const on = PRJ.on, L = roster(), c = cur(); let h = '';
    if (on.periodic && placesOn()) h += placesCard();
    else if (on.periodic) {
      let paid = 0, wait = 0, due = 0; L.forEach(p => { if (p.from > c) return; const v = getRec(p, c); if (v && v.s === 'paid') paid++; else if (v && v.s === 'wait') wait++; else due++; });
      const tot = Math.max(1, paid + wait + due), per = periods()[c] || { title: '' }, head = on.turns ? 'Ronda ' + (c + 1) : per.title;
      h += '<div class="statcard"><p class="txt say"><b>' + esc(head) + ':</b> ' + paid + ' de ' + (paid + wait + due) + ' ya pagaron</p>' +
        '<div class="meter" role="img" aria-label="' + paid + ' pagaron, ' + wait + ' esperando pago, ' + due + ' faltan"><i class="p" style="width:' + (paid / tot * 100) + '%"></i><i class="w" style="width:' + (wait / tot * 100) + '%"></i></div>' +
        '<p class="txt soft say">' + (on.turns ? 'Le toca a ' + esc(L[c % L.length].n) + (PRJ.payout[c] ? '. Ya la recibió.' : '.') : due + wait ? 'Faltan ' + (due + wait) : 'Todos pagaron') + '</p>';
      h += '</div>';
    }
    h += reviewCard() + recvCard();
    if (on.ledger) { const owing = L.filter(p => p.bal > 0), total = owing.reduce((a, p) => a + p.bal, 0); h += '<div class="statcard"><p class="txt say"><b>Te deben ' + money(total) + '</b></p><p class="txt soft say">' + owing.length + ' de ' + L.length + ' personas</p></div>'; }
    return h;
  }
  function savedDesc() {
    const v = S.saved, P = v && byId(v.person); if (!P) return '';
    let d = ''; try { d = v.flow === 'cargo' ? 'fiado' : v.flow === 'abono' ? 'abono' : charge(P, v.period).title; } catch (e) { d = ''; }
    return P.n + (d ? ' · ' + d : '');
  }
  function viewHome() {
    const on = PRJ.on, L = roster(), hasWork = on.periodic || on.extra || on.ledger, items = [];
    const notice = S.notice ? '<div class="notice2" role="status">' + ICON.save + '<span>' + esc(S.notice) + '</span></div>' : '';
    const access = { act: 'access', icon: ICON.eye, label: 'Ver mejor', cls: 'compact' };
    let q, intro = '', status = '';
    if (!hasWork) {
      q = 'Falta preparar la app'; intro = '<p class="txt say">Un familiar puede elegir qué se cobra.</p>';
      items.push({ act: 'adv', data: { tab: 'ajustes' }, primary: true, icon: ICON.people, label: 'Ayuda de un familiar', sub: 'Elegir qué cobrar' }, access);
    } else if (!L.length) {
      q = 'Aún no hay personas'; intro = '<p class="txt say">Un familiar puede agregarlas con su foto.</p>' + reviewCard();
      items.push({ act: 'adv', data: { tab: 'personas' }, primary: true, icon: ICON.people, label: 'Agregar personas', sub: 'Con ayuda de un familiar' });
      if (reviewList().length) items.push({ act: 'regs', icon: ICON.qr, label: 'Inscripciones', sub: reviewList().length + ' por revisar' });
      items.push(access);
    } else {
      q = '¿Qué quieres hacer?'; status = homeStatus();
      if (S.saved && byId(S.saved.person)) items.push({ act: 'continue', primary: true, icon: ICON.save, label: 'Continuar', sub: savedDesc() });
      items.push({ act: 'start', primary: !(S.saved && byId(S.saved.person)), icon: ICON.cash, label: on.periodic || on.extra ? 'Cobrar' : 'Fiado', sub: on.periodic || on.extra ? 'Elegir a quién' : 'Anotar o abonar' });
      if (on.turns && on.periodic && !PRJ.payout[cur()]) { const h = L[cur() % L.length]; items.push({ act: 'payout-ask', icon: ICON.star, label: 'Entregar la bolsa', sub: h.n + ' · ' + money(PRJ.main.amount * L.length) }); }
      { const nrev = reviewList().length; items.push({ act: 'regs', icon: ICON.qr, label: 'Inscripciones', sub: nrev ? nrev + ' por revisar' : 'Código para inscribirse' }); }
      items.push(access, { act: 'adv', data: { tab: 'personas' }, icon: ICON.people, label: 'Ayuda de un familiar', cls: 'compact' });
    }
    const pg = paged(items, 'Más opciones');
    return { html: notice + '<h1 class="q">' + q + '</h1>' + intro + status + '<div class="stack">' + pg.rows.map(choice).join('') + pg.pager + '</div>', say: q };
  }

  function pickrow(o) {
    const P = o.p, s = o.s, sub = PRJ.on.periodic && PRJ.on.ledger && P.bal > 0 ? 'Debe ' + money(P.bal) : '';
    return '<button class="pickrow" data-act="pick" data-id="' + P.id + '" aria-label="' + esc(P.n + ', ' + s.text.toLowerCase() + (sub ? ', ' + sub.toLowerCase() : '')) + '"><span class="ava">' + avatar(P) + '</span><span class="ct"><strong>' + esc(P.n) + '</strong>' + stt(s.st, s.text) + (sub ? '<span class="sub">' + esc(sub) + '</span>' : '') + '</span></button>';
  }
  function viewWho() {
    const c = cur(), rank = { due: 0, wait: 1, paid: 2 };
    const list = roster().map((p, i) => ({ p: p, i: i, s: personState(p, c) })).sort((a, b) => rank[a.s.st] - rank[b.s.st] || a.i - b.i);
    const pg = paged(list, 'Ver más personas'), q = PRJ.on.periodic || PRJ.on.extra ? '¿Quién paga?' : '¿Quién es?';
    return { html: '<h1 class="q">' + q + '</h1><div class="stack">' + pg.rows.map(pickrow).join('') + pg.pager + '</div>', say: q + ' Toca la foto.' };
  }

  function menuItems(P) {
    const on = PRJ.on, items = [], k = on.periodic ? nextOpen(P) : null;
    if (k != null) items.push({ act: 'period', data: { p: k }, primary: true, mk: HUES[k % 12], label: periods()[k].title, sub: money(PRJ.main.amount) + ' · ' + stWord(P, k) });
    if (on.extra && !(P.extra && P.extra.s === 'paid')) items.push({ act: 'period', data: { p: 'x' }, icon: ICON.cash, label: PRJ.extra.name, sub: money(PRJ.extra.amount) + (P.extra ? ' · esperando pago' : '') });
    if (on.ledger) items.push({ act: 'ledger-open', icon: ICON.cash, label: 'Fiado', sub: P.bal > 0 ? 'Debe ' + money(P.bal) : 'No debe nada' });
    if (on.periodic) { const more = openPeriods(P).filter(x => x !== k); if (more.length) items.push({ act: 'months', icon: ICON.clock, label: PRJ.main.freq === 'monthly' ? 'Otro mes' : 'Otro cobro', sub: more.length + (more.length === 1 ? ' pendiente' : ' pendientes') }); }
    if (items.length && !items.some(i => i.primary)) items[0].primary = true;
    return items;
  }
  function viewMenu() {
    const P = byId(S.person), items = menuItems(P), pg = paged(items, 'Más opciones'), q = '¿Qué paga ' + P.n + '?';
    const body = items.length ? pg.rows.map(choice).join('') + pg.pager : '<p class="txt say">' + esc(P.n) + ' no debe nada ahora.</p>';
    return { html: idstrip(P) + '<h1 class="q">' + esc(q) + '</h1><div class="stack">' + body + '</div>', say: q };
  }
  function viewMonths() {
    const P = byId(S.person);
    const items = openPeriods(P).map(k => ({ act: 'period', data: { p: k }, mk: HUES[k % 12], label: periods()[k].title, sub: money(PRJ.main.amount) + ' · ' + stWord(P, k) }));
    const pg = paged(items, 'Ver más meses'), q = PRJ.main.freq === 'monthly' ? '¿Qué mes paga?' : '¿Cuál cobro paga?';
    return { html: idstrip(P) + '<h1 class="q">' + q + '</h1><div class="stack">' + pg.rows.map(choice).join('') + pg.pager + '</div>', say: q };
  }
  function viewLedger() {
    const P = byId(S.person), items = [];
    if (P.pend) items.push({ act: 'period', data: { p: 'f' }, primary: true, icon: ICON.clock, label: 'Seguir con el cobro', sub: money(P.pend.amount) + ' · esperando pago' });
    if (P.bal > 0) items.push({ act: 'ledger-do', data: { m: 'abono' }, primary: !P.pend, icon: ICON.cash, label: 'Abonar', sub: 'Debe ' + money(P.bal) });
    items.push({ act: 'ledger-do', data: { m: 'cargo' }, primary: P.bal <= 0 && !P.pend, icon: ICON.plus, label: 'Anotar fiado', sub: 'Se lleva algo' });
    const q = '¿Qué hace ' + P.n + '?', l = P.ledger[0];
    const last = l ? '<p class="txt soft say">Último: ' + (l.t === 'abono' ? 'abono' : 'fiado') + ' de ' + money(l.a) + (l.note ? ' · ' + esc(shortNote(l.note)) : '') + '</p>' : '';
    return { html: idstrip(P, P.bal > 0 ? 'Debe ' + money(P.bal) : 'No debe nada') + '<h1 class="q">' + esc(q) + '</h1>' + last + '<div class="stack">' + items.map(choice).join('') + '</div>', say: q + (P.bal > 0 ? ' Debe ' + P.bal + ' pesos.' : '') };
  }
  /* Amount: ONE field (the iPhone numeric keyboard) and ONE primary button. Free amount, never fixed. */
  function viewAmount() {
    const P = byId(S.person), a = S.amt, cargo = a.mode === 'cargo', sc = cargo ? PRJ.shortcuts.filter(x => x > 0).slice(0, 2) : [];
    const q = cargo ? '¿Cuánto se lleva?' : '¿Cuánto abona?';
    return { html: idstrip(P, cargo ? '' : 'Debe ' + money(P.bal)) + '<h1 class="q">' + q + '</h1>' +
      '<div class="amtfield"><span class="cur" aria-hidden="true">$</span><input id="amt" type="text" inputmode="decimal" autocomplete="off" maxlength="12" aria-label="' + q + ' Monto en pesos" value="' + esc(a.buf) + '"></div>' +
      (sc.length ? '<div class="stack">' + sc.map(x => choice({ act: 'amt-chip', data: { a: x }, label: money(x), sub: 'Tu monto rápido' })).join('') + '</div>' : '') +
      '<div id="amt-alert" role="alert"></div>' + choice({ act: 'amt-next', primary: true, icon: ICON.check, label: 'Seguir' }), say: q };
  }
  function amtCheck() {
    const v = amtVal(), P = byId(S.person);
    if (!(v > 0)) return 'Escribe cuánto es.';
    if (S.amt.mode === 'abono' && v > P.bal + 0.001) return 'Debe solo ' + money(P.bal) + '. Escribe menos.';
    return '';
  }
  function viewConfirm() {
    const P = byId(S.person), v = amtVal(), q = '¿Anotar ' + money(v) + ' a ' + P.n + '?';
    return { html: idstrip(P) + '<h1 class="q">' + esc(q) + '</h1><p class="txt say">Ahora debe ' + money(r2(P.bal + v)) + '.</p>' +
      '<div class="fld2"><label for="amt-note">¿Qué se llevó? (opcional)</label><input id="amt-note" type="text" maxlength="40" autocomplete="off" value="' + esc(S.amt.note) + '"></div>' +
      choice({ act: 'cargo-ok', primary: true, icon: ICON.check, label: 'Anotar fiado' }), say: q + ' Ahora debe ' + r2(P.bal + v) + ' pesos.' };
  }
  const curCharge = P => charge(P, S.period);
  function viewHow() {
    const P = byId(S.person), c = curCharge(P), q = '¿Cómo paga?', blocked = !!(c.to && !recvOk(c.to)), items = blocked ? [] : [{ act: 'via', data: { v: 'qr' }, icon: ICON.qr, label: 'Con su celular', sub: 'Le muestras un código QR' }];
    if (P.payers.length && !blocked) items.push({ act: 'via', data: { v: 'fam' }, icon: ICON.people, label: 'Que pague su familiar', sub: P.payers.length === 1 ? P.payers[0].name + ' · ' + P.payers[0].rel.toLowerCase() : P.payers.length + ' familiares' });
    items.push({ act: 'via', data: { v: 'cash' }, icon: ICON.cash, label: 'En efectivo', sub: 'Tú recibes el dinero' });
    return { html: idcharge(P, c) + '<h1 class="q">' + q + '</h1>' + (blocked ? alertBox('Esa cuenta aún no está lista.') + '<p class="txt say">' + esc(clip(c.to.name, 28)) + ': solo efectivo.</p>' : '') + '<div class="stack">' + items.map(choice).join('') + '</div>', say: q + (blocked ? ' Esa cuenta aún no está lista. Solo efectivo.' : '') };
  }
  function viewWhich() {
    const P = byId(S.person), q = '¿Cuál familiar?';
    const items = P.payers.map((y, k) => ({ act: 'via', data: { v: 'fam', k: k }, icon: ICON.people, label: y.name, sub: y.rel + ' · cel. ' + maskTel(y.tel) }));
    return { html: idstrip(P) + '<h1 class="q">' + q + '</h1><div class="stack">' + items.map(choice).join('') + '</div>', say: q };
  }
  const waitBox = t => '<div class="stt stt-wait waitbox" role="status">' + ICON.clock + '<span>' + esc(t) + '</span></div>';
  function viewPay() {
    const P = byId(S.person), c = curCharge(P), r = getRec(P, S.period) || { via: 'qr', payer: 0 }, via = r.via, head = idcharge(P, c);
    if (via === 'fam') {
      const y = P.payers[r.payer || 0] || { name: '', rel: '', tel: '' }, q = 'Pedimos el pago a ' + y.name;
      return { html: head + '<h1 class="q">' + esc(q) + '</h1><p class="txt say">' + esc(y.rel) + ' · cel. ' + maskTel(y.tel) + '</p>' + toLine2(c) + waitBox('Esperando que lo autorice') + choice({ act: 'sim', primary: true, icon: ICON.check, label: 'Ya pagó' }), say: q };
    }
    if (via === 'cash') {
      const q = '¿Recibiste ' + money(c.amount) + '?';
      return { html: head + '<h1 class="q">' + esc(q) + '</h1><p class="txt say">Cuéntalos antes de confirmar.</p>' + choice({ act: 'cash-ok', primary: true, icon: ICON.check, label: 'Sí, recibí el dinero' }), say: q };
    }
    const q = 'Muestra el QR';
    return { html: head + '<h1 class="q">' + q + '</h1><div class="qrbox">' + fakeQR(P.id * 20 + (typeof S.period === 'number' ? S.period : 19)) + '</div>' + toLine2(c) + waitBox('Esperando el pago') + choice({ act: 'sim', primary: true, icon: ICON.check, label: 'Ya pagó' }), say: q };
  }
  function viewDone() {
    const info = S.doneInfo || { kind: 'paid' }, P = byId(S.person);
    if (info.kind === 'payout') {
      const h = info.who || '';
      return { html: '<div class="donehead"><div class="bigcheck">' + ICON.check + '</div><h1 class="q">ENTREGA REGISTRADA</h1></div><p class="txt say" style="text-align:center">' + esc(h) + ' ya recibió la bolsa.</p>' + choice({ act: 'home', primary: true, icon: ICON.people, label: 'Ir al inicio' }), say: 'Entrega registrada' };
    }
    if (info.kind === 'cargo') {
      return { html: '<div class="donehead"><div class="bigcheck">' + ICON.check + '</div><h1 class="q">FIADO ANOTADO</h1></div><p class="txt say" style="text-align:center"><b>' + esc(P.n) + '</b> se llevó <b>' + money(info.amount) + '</b></p>' +
        '<div class="receipt"><dl>' + (info.note ? '<dt>Se llevó</dt><dd>' + esc(shortNote(info.note)) + '</dd>' : '') + '<dt>Ahora debe</dt><dd>' + money(P.bal) + '</dd></dl></div>' +
        choice({ act: 'next', primary: true, icon: ICON.people, label: 'Siguiente persona' }) + choice({ act: 'home', label: 'Ir al inicio' }), say: 'Listo. Fiado anotado.' };
    }
    const k = S.period, c = charge(P, k), r = k === 'f' ? Object.assign({}, P.last) : (getRec(P, k) || { via: 'qr' }), amount = k === 'f' ? (P.last ? P.last.amount : c.amount) : c.amount, cash = r.via === 'cash';
    const undo = S.undo && S.undo.pid === P.id && S.undo.k === k && cash ? choice({ act: 'undo', cls: 'danger small', label: 'Me equivoqué, deshacer' }) : '';
    const folio = 'EJ-' + String((P.id * 37 + (typeof k === 'number' ? k : 99)) % 10000).padStart(4, '0');
    return { html: '<div class="donehead"><div class="bigcheck">' + ICON.check + '</div><h1 class="q">PAGADO</h1></div><p class="txt say" style="text-align:center"><b>' + esc(P.n) + '</b> pagó <b>' + money(amount) + '</b></p>' +
      '<div class="receipt"><dl><dt>Concepto</dt><dd>' + esc(c.concept) + '</dd>' +
      '<dt>Recibe</dt><dd>' + esc(cash ? 'Efectivo, tú lo guardas' : (c.to ? c.to.name : '')) + '</dd>' + (k === 'f' ? '<dt>Ahora debe</dt><dd>' + money(P.bal) + '</dd>' : '') + '<dt>Folio</dt><dd>' + folio + ' (ejemplo)</dd></dl></div>' +
      choice({ act: 'receipt', primary: true, icon: ICON.send, label: 'Enviar comprobante', sub: 'Por WhatsApp' }) + choice({ act: 'next', icon: ICON.people, label: 'Siguiente persona' }) + choice({ act: 'home', label: 'Ir al inicio' }) + undo, say: 'Listo, pagado.' };
  }
  function viewExit() {
    const q = '¿Quieres salir?';
    return { html: '<h1 class="q">' + q + '</h1><p class="txt say">Puedes guardar y seguir después.</p><div class="stack">' + choice({ act: 'exit-save', primary: true, icon: ICON.save, label: 'Guardar y seguir después', sub: 'Continuarás desde aquí' }) + choice({ act: 'exit-del', cls: 'danger', icon: ICON.x, label: 'Borrar este cobro', sub: 'Se pierde lo que llevas' }) + '</div>', say: q + ' Puedes guardar y seguir después.' };
  }
  function viewAccess() {
    const sw = (k, label) => choice({ act: 'set', data: { k: k }, role: 'switch', cls: 'sw', checked: S.set[k] ? 'true' : 'false', label: label, right: stt(S.set[k] ? 'paid' : 'due', S.set[k] ? 'Activado' : 'Apagado') });
    return { html: '<h1 class="q">Ver mejor</h1><div class="stack">' + sw('hc', 'Colores fuertes') + sw('xl', 'Letra extra grande') + sw('voice', 'Voz que lee') + sw('sound', 'Sonido y vibración') + '</div>', say: 'Ver mejor. Toca para activar o apagar.' };
  }
  function viewError() {
    const e = S.err || { title: 'No se pudo completar' };
    return { html: '<div class="errbig"><div class="badge2">' + ICON.alert + '</div><h1 class="q">' + esc(e.title) + '</h1><p class="txt say">Revisa tu conexión e inténtalo de nuevo.</p></div>' + choice({ act: 'retry', primary: true, icon: ICON.check, label: 'Intentar de nuevo' }) + choice({ act: 'err-back', label: 'Volver' }), say: e.title + '. Revisa tu conexión e inténtalo de nuevo.' };
  }
  function viewPayout() {
    const L = roster(), c = cur(), h = L[c % L.length], q = '¿Ya recibió la bolsa?';
    return { html: idstrip(h, 'Ronda ' + (c + 1)) + '<h1 class="q">' + q + '</h1><p class="txt say">Bolsa de ' + money(PRJ.main.amount * L.length) + '.</p>' + choice({ act: 'payout-ok', primary: true, icon: ICON.check, label: 'Sí, ya la recibió' }), say: q };
  }

  const VIEWS = { home: viewHome, who: viewWho, menu: viewMenu, months: viewMonths, ledger: viewLedger, amount: viewAmount, confirm: viewConfirm, how: viewHow, which: viewWhich, pay: viewPay, done: viewDone, exit: viewExit, access: viewAccess, error: viewError, payout: viewPayout };
  const NEEDS_PERSON = { menu: 1, months: 1, ledger: 1, amount: 1, confirm: 1, how: 1, which: 1, pay: 1 };
  /* "Paso X de 4": the total is always 4, in every combination of features. */
  const STEPS = 4;
  function stepNo() {
    const v = S.view;
    if (v === 'who' || v === 'r1') return 1;
    if (v === 'r2') return 2;
    if (v === 'r3') return 3;
    if (v === 'r4') return 4;
    if (v === 'menu' || v === 'months' || v === 'ledger') return 2;
    if (v === 'amount') return 3;
    if (v === 'how' || v === 'which') return S.flow === 'abono' ? 4 : 3;
    if (v === 'pay' || v === 'confirm') return 4;
    return 0;
  }
  /* [Atrás visible, Cancelar visible]; Escuchar is always there */
  const BAR = { home: [0, 0], who: [1, 0], menu: [1, 1], months: [1, 1], ledger: [1, 1], amount: [1, 1], confirm: [1, 1], how: [1, 1], which: [1, 1], pay: [1, 1], payout: [1, 0], done: [0, 0], exit: [1, 0], access: [1, 0], error: [0, 0] };
  function paintHead() {
    const n = stepNo();
    if (!n) { $('#stephead').innerHTML = '<p class="grp">' + esc(PRJ.name || 'Mi proyecto') + '</p>'; return; }
    let ol = '';
    for (let i = 1; i <= STEPS; i++) {
      if (i > 1) ol += '<li class="sep" aria-hidden="true"></li>';
      ol += '<li class="' + (i < n ? 'done' : i === n ? 'now' : '') + '"' + (i === n ? ' aria-current="step"' : '') + ' aria-label="Paso ' + i + (i < n ? ', hecho' : i === n ? ', este paso' : ', falta') + '">' + (i < n ? ICON.check : i) + '</li>';
    }
    $('#stephead').innerHTML = '<p class="steptext" id="steptext">Paso ' + n + ' de ' + STEPS + '</p><ol class="steps" aria-label="Pasos">' + ol + '</ol>';
  }
  function paintBar() {
    const b = BAR[S.view] || [0, 0];
    [['#bar-back', b[0]], ['#bar-cancel', b[1]]].forEach(x => { const el = $(x[0]); el.setAttribute('aria-hidden', x[1] ? 'false' : 'true'); el.tabIndex = x[1] ? 0 : -1; });
  }
  function render() {
    if (NEEDS_PERSON[S.view] && !byId(S.person)) { S.view = 'who'; S.hist = [{ view: 'home', page: 0 }]; }
    const r = (VIEWS[S.view] || viewHome)();
    $('#screen').innerHTML = r.html; $('#screen').setAttribute('data-view', S.view); S.say = r.say;
    paintHead(); paintBar(); paintSummary();
  }
  function paintSummary() {
    const on = PRJ.on, m = PRJ.main, ok = PRJ.people.filter(p => p.consent.ok).length, rows = [];
    if (on.periodic) rows.push(['Cobros con calendario', money(m.amount) + ' ' + freqText(m.freq) + (m.freq === 'once' ? '' : ', ' + periods().length + ' veces')]);
    if (on.extra) rows.push(['Cobro aparte', PRJ.extra.name + ', ' + money(PRJ.extra.amount)]);
    if (placesOn()) rows.push(['Lugares', capacity() + ', se apartan ' + ((PRJ.reg.holdDays | 0) || 5) + ' días']);
    if (on.turns) rows.push(['Turnos', 'Sí']);
    if (on.ledger) rows.push(['Fiado', 'Sí, con el monto que escribas']);
    if (!rows.length) rows.push(['Funciones', 'Ninguna activa']);
    rows.push(['Recibe', PRJ.receivers.map(r => r.name).join(', ')]);
    rows.push(['Personas', String(PRJ.people.length)], ['Con foto autorizada', ok + ' de ' + PRJ.people.length]);
    $('#cfgsum').innerHTML = rows.map(r => '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>').join('');
  }

  /* ================= SIMPLE MODE: navigation and actions ================= */
  function paint(silent) {
    render();
    const f = S.view === 'amount' ? $('#amt') : $('#screen h1');
    if (f) { if (f.tagName === 'H1') f.tabIndex = -1; try { f.focus({ preventScroll: true }); } catch (e) { /* optional */ } }
    if (!silent) say(S.say);
    const ph = $('#phone').getBoundingClientRect();
    if (ph.top < 0 && !$('#v-prototipo').hidden) $('#phone').scrollIntoView({ block: 'start' });
  }
  function nav(view) { S.hist.push({ view: S.view, page: S.page }); S.view = view; S.page = 0; S.notice = ''; paint(); }
  function popQuiet() { const h = S.hist.pop(); if (h) { S.view = h.view; S.page = h.page; } else { S.view = 'home'; S.page = 0; } }
  function back() { popQuiet(); paint(); }
  function toHome() { S.hist = []; S.view = 'home'; S.page = 0; S.flow = null; S.doneInfo = null; S.notice = ''; paint(); }
  function listenText() {
    const s = $('#screen'), parts = [], h = s.querySelector('h1'); if (h) parts.push(h.textContent.trim());
    s.querySelectorAll('.say').forEach(n => parts.push(n.textContent.replace(/\s+/g, ' ').trim()));
    s.querySelectorAll('.cbtn, .pickrow').forEach(n => parts.push((n.getAttribute('aria-label') || n.textContent).replace(/\s+/g, ' ').trim()));
    return parts.join('. ');
  }
  /* Anything that talks to Pey or saves data can fail: show the standard error screen with a retry. */
  function attempt(title, fn) {
    if (S.fail) {
      S.fail = false; const cb = $('#simfail'); if (cb) cb.checked = false;
      S.err = { title: title, retry: fn }; feedback('error'); nav('error'); return;
    }
    fn();
  }
  function saveFlow() {
    const top = S.hist[S.hist.length - 1];
    if (!top || !S.person) { toHome(); return; }
    S.saved = { view: top.view, page: top.page, hist: S.hist.slice(0, -1), person: S.person, period: S.period, flow: S.flow, amt: Object.assign({}, S.amt) };
    S.hist = []; S.view = 'home'; S.page = 0; S.flow = null; S.notice = 'Guardado. Continuarás desde aquí.'; paint();
  }
  function resume() {
    const v = S.saved; if (!v || !byId(v.person)) { S.saved = null; toHome(); return; }
    S.person = v.person; S.period = v.period; S.flow = v.flow; S.amt = v.amt; S.hist = v.hist.slice(); S.view = v.view; S.page = v.page; S.saved = null; S.notice = ''; paint();
  }
  function dropFlow() {
    const P = byId(S.person);
    if (P && (S.flow === 'charge' || S.flow === 'abono') && S.period !== null) { const r = getRec(P, S.period); if (r && r.s !== 'paid') putRec(P, S.period, null); }
    S.saved = null; toHome();
  }
  function onAct(e) {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const a = el.dataset.act, d = el.dataset, P = byId(S.person);
    if (/^rg-/.test(a)) { onRgAct(a); return; }
    if (onCollectorAct(a, d, P) || onReceiptAct(a, d, P)) return;
    switch (a) {
      case 'pick': S.person = +d.id; S.flow = null; S.period = null; nav(PRJ.on.periodic || PRJ.on.extra ? 'menu' : 'ledger'); break;
      case 'more': S.page++; paint(); break;
      case 'back': back(); break;
      case 'cancel': if (RG_VIEWS[S.view]) { rgReset(); S.hist = []; S.view = 'r1'; paint(); } else if (S.view === 'who') toHome(); else nav('exit'); break;
      case 'listen': speak(listenText()); { const c = $('#voicecap'); if (c) c.innerHTML = '<b>«' + esc(listenText()) + '»</b>'; } break;
      case 'start': S.flow = null; nav('who'); break;
      case 'continue': resume(); break;
      case 'access': nav('access'); break;
      case 'adv': location.hash = d.tab; break;
      case 'set': {
        const k = d.k; S.set[k] = !S.set[k]; saveSet(); applySet(); render();
        const again = $('#screen [data-k="' + k + '"]'); if (again) again.focus();
        if (k === 'voice') { if (S.set.voice) say('Voz activada'); else { try { window.speechSynthesis.cancel(); } catch (x) { /* optional */ } } }
        if (k === 'sound' && S.set.sound) feedback('ok');
        break; }
      case 'period': {
        S.period = d.p === 'x' ? 'x' : d.p === 'f' ? 'f' : +d.p; S.flow = S.period === 'f' ? 'abono' : 'charge';
        const r = getRec(P, S.period);
        if (r && r.s === 'paid') { S.doneInfo = { kind: 'paid' }; nav('done'); } else if (r && r.s === 'wait') nav('pay'); else nav('how');
        break; }
      case 'months': nav('months'); break;
      case 'ledger-open': nav('ledger'); break;
      case 'ledger-do': S.flow = d.m; S.period = d.m === 'abono' ? 'f' : null; S.amt = { mode: d.m, buf: d.m === 'abono' ? trimAmt(P.bal) : '', note: '' }; nav('amount'); break;
      case 'amt-chip': { S.amt.buf = trimAmt(+d.a); const i = $('#amt'); if (i) i.value = S.amt.buf; break; }
      case 'amt-next': {
        const msg = amtCheck();
        if (msg) { $('#amt-alert').innerHTML = alertBox(msg); feedback('error'); $('#amt').focus(); break; }
        if (S.amt.mode === 'cargo') nav('confirm'); else nav('how');
        break; }
      case 'cargo-ok': attempt('No se pudo anotar el fiado', function () {
        const v = amtVal(), note = (S.amt.note || '').trim();
        P.bal = r2(P.bal + v); P.ledger.unshift({ t: 'cargo', a: v, d: shortDate(TODAY), note: note });
        S.undo = null; S.doneInfo = { kind: 'cargo', amount: v, note: note }; feedback('ok'); nav('done');
      }); break;
      case 'via': {
        const v = d.v;
        if (v === 'fam' && P.payers.length > 1 && d.k == null) { nav('which'); break; }
        const k = +(d.k || 0), run = function () {
          const old = getRec(P, S.period) || {}, base = S.period === 'f' && !P.pend ? { amount: amtVal() } : {};
          putRec(P, S.period, Object.assign({}, old, base, { s: 'wait', via: v, payer: v === 'fam' ? k : 0 })); nav('pay');
        };
        if (v === 'cash') run(); else attempt('No se pudo enviar el cobro', run);
        break; }
      case 'sim': case 'cash-ok': attempt('No se pudo guardar el pago', function () {
        const r = getRec(P, S.period) || {};
        markPaid(P, S.period, a === 'cash-ok' ? 'cash' : (r.via || 'qr'), r.payer || 0);
        S.doneInfo = { kind: 'paid' }; feedback('ok'); nav('done');
      }); break;
      case 'undo': {
        const u = S.undo;
        if (u && P && u.pid === P.id) {
          if (S.period === 'f') { P.bal = u.bal; P.ledger = u.ledger; P.last = u.last; P.pend = u.pend; } else putRec(P, S.period, u.prev);
          S.undo = null; S.doneInfo = null; back();
        }
        break; }
      case 'next': S.hist = []; S.view = 'home'; S.flow = null; S.doneInfo = null; S.person = null; S.period = null; nav('who'); break;
      case 'home': toHome(); break;
      case 'exit-save': saveFlow(); break;
      case 'exit-del': dropFlow(); break;
      case 'retry': { const er = S.err; popQuiet(); if (er && er.retry) er.retry(); else paint(); break; }
      case 'err-back': back(); break;
      case 'payout-ask': nav('payout'); break;
      case 'payout-ok': attempt('No se pudo guardar la entrega', function () {
        const L = roster(), c = cur(); PRJ.payout[c] = true;
        S.doneInfo = { kind: 'payout', who: L[c % L.length].n }; feedback('ok'); nav('done');
      }); break;
    }
  }
  function onInput(e) {
    const t = e.target;
    if (t.id === 'amt') { const v = t.value.replace(/[^0-9.,]/g, '').slice(0, 12); if (v !== t.value) t.value = v; S.amt.buf = v; const al = $('#amt-alert'); if (al) al.innerHTML = ''; }
    else if (t.id === 'amt-note') S.amt.note = t.value;
    else if (t.id === 'rg-n') S.rg.name = t.value;
    else if (t.id === 'rg-t' || t.id === 'rg-h') { const v = t.value.replace(/[^0-9+\-\s]/g, '').slice(0, 16); if (v !== t.value) t.value = v; if (t.id === 'rg-t') S.rg.tel = v; else S.rg.cur = v; const al = $('#rg-alert'); if (al) al.innerHTML = ''; }
    else if (t.id === 'rg-ok') S.rg.ok = t.checked;
  }
  function onKey(e) {
    if (e.key !== 'Enter') return;
    if (e.target.id === 'amt') { e.preventDefault(); const b = $('[data-act="amt-next"]'); if (b) b.click(); }
    else if (e.target.id === 'amt-note') { e.preventDefault(); const b = $('[data-act="cargo-ok"]'); if (b) b.click(); }
    else if (/^rg-[nth]$/.test(e.target.id)) { e.preventDefault(); const b = $('[data-act="rg-next"]'); if (b) b.click(); }
  }

