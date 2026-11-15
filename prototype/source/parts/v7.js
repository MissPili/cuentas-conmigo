  /* ================= v7: places (cupos), QR registration, receipt (WhatsApp), monthly report ================= */
  /* Everything here is simulated in the prototype: the real QR page, the notifications, the WhatsApp link and the report data come from the backend. */
  FEATS.push({ k: 'places', name: 'Lugares (cupo)', desc: 'El grupo tiene un número de lugares. Pagar la cuota principal confirma el lugar. Necesita cobros con calendario.' });

  /* New fields on every person; a preset adds the registration settings. Rebinding a function declaration keeps every old caller working. */
  const mkPerson0 = mkPerson;
  mkPerson = function (base) {
    const P = mkPerson0(base);
    if (!P.status) P.status = 'enrolled';           /* pending (por aprobar) | enrolled | waitlist | released */
    if (P.heldOn === undefined) P.heldOn = null;    /* ISO date the place was approved or kept; used to expire unpaid places */
    if (!P.via) P.via = 'manual';                   /* 'qr' when the person registered through the QR page */
    return P;
  };
  const preset0 = preset;
  preset = function (id) {
    const p = preset0(id);
    p.on.places = id === 'taller';
    p.reg = { open: true, token: 'ej-' + id.slice(0, 3) + '4k2', capacity: 12, holdDays: 5 };
    if (id === 'taller') p.people = p.people.slice(0, 10);   /* 10 of 12 places taken, so the demo can fill up */
    return p;
  };

  const roster = () => PRJ.people.filter(p => p.status === 'enrolled');
  const placesOn = () => !!(PRJ.on.places && PRJ.on.periodic);
  const occupied = () => PRJ.people.filter(p => p.status === 'enrolled' || p.status === 'pending').length;
  const capacity = () => Math.max(1, ((PRJ.reg && PRJ.reg.capacity) | 0) || 1);
  const isFull = () => placesOn() && occupied() >= capacity();
  const freeSpots = () => Math.max(0, capacity() - occupied());
  const confirmedCount = k => roster().filter(p => { const v = getRec(p, k); return !!(v && v.s === 'paid'); }).length;
  const daysSince = s => (s ? Math.floor((TODAY - new Date(s + 'T12:00:00')) / 864e5) : 0);
  /* Rule: only a place held by a NEW person expires: approved (heldOn set) and still without a first payment after holdDays. Anyone who has paid once, and anyone added by hand, never expires here. */
  const everPaid = P => P.pay.some(v => v && v.s === 'paid') || !!(P.extra && P.extra.s === 'paid');
  function isOverdue(P) {
    if (!placesOn() || P.status !== 'enrolled' || !P.heldOn || everPaid(P)) return false;
    return daysSince(P.heldOn) > ((PRJ.reg.holdDays | 0) || 5);
  }
  /* Place state: icon + words + border (never colour alone), through the same stt() as payments. */
  function placeState(P) {
    if (P.status === 'waitlist') return { st: 'due', text: 'En lista de espera', kind: 'waitlist' };
    if (P.status === 'pending') return { st: 'wait', text: 'Por aprobar', kind: 'pending' };
    const v = placesOn() ? getRec(P, cur()) : null;
    if (v && v.s === 'paid') return { st: 'paid', text: 'Lugar confirmado', kind: 'confirmed' };
    if (isOverdue(P)) return { st: 'due', text: 'Apartado vencido', kind: 'overdue' };
    return { st: 'wait', text: 'Lugar apartado', kind: 'held' };
  }
  const reviewList = () => {
    const rank = { pending: 0, overdue: 1, waitlist: 2 };
    return PRJ.people.filter(p => p.status === 'pending' || p.status === 'waitlist' || isOverdue(p))
      .sort((a, b) => rank[placeState(a).kind] - rank[placeState(b).kind] || a.id - b.id);
  };
  const regPlaces = () => (!placesOn() ? '' : isFull() ? 'Ya no hay lugares. Quedarás en lista de espera.' : 'Quedan ' + freeSpots() + (freeSpots() === 1 ? ' lugar' : ' lugares') + ' de ' + capacity() + '.');
  const fmtTel = t => (t && t.length === 10 ? t.slice(0, 2) + ' ' + t.slice(2, 6) + ' ' + t.slice(6) : (t || ''));
  /* 10 digits as Pey asks; accepts spaces, dashes, +52 and 521 */
  function tel10(raw) {
    let d = String(raw || '').replace(/\D/g, '');
    if (d.length === 13 && d.indexOf('521') === 0) d = d.slice(3); else if (d.length === 12 && d.indexOf('52') === 0) d = d.slice(2);
    return /^\d{10}$/.test(d) ? d : '';
  }
  const viaName = v => (v === 'cash' ? 'Efectivo' : v === 'fam' ? 'Solicitud CoDi' : 'CoDi con QR');
  const homeWith = msg => { S.hist = []; S.view = 'home'; S.page = 0; S.flow = null; S.doneInfo = null; S.person = null; S.notice = msg; paint(); };

  /* ---------- places card on the home screen ---------- */
  function placesCard() {
    const k = cur(), conf = confirmedCount(k), cap = capacity(), held = Math.max(0, occupied() - conf), per = periods()[k] || { title: '' };
    return '<div class="statcard"><p class="txt say"><b>' + esc(per.title) + ':</b> ' + conf + ' de ' + cap + ' lugares confirmados</p>' +
      '<div class="meter" role="img" aria-label="' + conf + ' confirmados, ' + held + ' apartados, ' + freeSpots() + ' libres de ' + cap + '"><i class="p" style="width:' + (conf / cap * 100) + '%"></i><i class="w" style="width:' + (held / cap * 100) + '%"></i></div>' +
      '<p class="txt soft say">' + held + (held === 1 ? ' apartado' : ' apartados') + ' · ' + freeSpots() + (freeSpots() === 1 ? ' libre' : ' libres') + '</p></div>' +
      (isFull() ? alertBox('Taller lleno. Hay lista de espera.') : '');
  }
  function reviewCard() {
    const n = reviewList().length; if (!n) return '';
    return '<div class="statcard"><p class="txt say"><b>Inscripciones nuevas</b></p>' + stt('wait', n + (n === 1 ? ' por revisar' : ' por revisar')) + '</div>';
  }

  /* ================= REGISTRATION (the page a person opens from the QR) ================= */
  function rgReset() { S.rg = { name: '', tel: '', ayuda: [], cur: '', ok: false, result: '' }; }
  const RG_VIEWS = { r1: 1, r2: 1, r3: 1, r4: 1, rdone: 1, rclosed: 1, rlimit: 1 };
  const rgAlert = '<div id="rg-alert" role="alert"></div>';
  function rgField(id, label, val, mode) {
    return '<div class="fld2"><label for="' + id + '">' + esc(label) + '</label><input id="' + id + '" type="text" inputmode="' + (mode || 'text') + '" maxlength="' + (mode === 'tel' ? 16 : 40) + '" autocomplete="off" value="' + esc(val) + '"></div>';
  }
  function viewR1() {
    if (!PRJ.reg.open) return viewRClosed();
    const q = '¿Cómo se llama?', pl = regPlaces();
    return { html: '<h1 class="q">' + q + '</h1><p class="txt soft say">' + esc(PRJ.name || 'Mi proyecto') + '</p>' + (pl ? '<p class="txt say">' + esc(pl) + '</p>' : '') +
      rgField('rg-n', 'Nombre de quien se inscribe', S.rg.name) + rgAlert + choice({ act: 'rg-next', primary: true, icon: ICON.check, label: 'Seguir' }), say: q + ' ' + pl };
  }
  function viewR2() {
    const q = '¿Cuál es su WhatsApp?';
    return { html: '<h1 class="q">' + q + '</h1><p class="txt say">Son 10 números. Ejemplo: 55 1234 5678.</p>' + rgField('rg-t', 'WhatsApp', S.rg.tel, 'tel') + rgAlert +
      choice({ act: 'rg-next', primary: true, icon: ICON.check, label: 'Seguir' }) + choice({ act: 'rg-notel', label: 'No tiene WhatsApp' }), say: q };
  }
  function viewR3() {
    const g = S.rg, q = '¿Quién le ayuda a pagar?';
    const added = g.ayuda.length ? '<p class="txt say">Ya agregaste: ' + g.ayuda.map(maskTel).join(', ') + '</p>' : '';
    return { html: '<h1 class="q">' + q + '</h1><p class="txt say">Su WhatsApp. Puedes poner hasta 3.</p>' + added + rgField('rg-h', 'WhatsApp de quien ayuda', g.cur, 'tel') + rgAlert +
      choice({ act: 'rg-next', primary: true, icon: ICON.check, label: 'Seguir' }) + (g.ayuda.length < 2 ? choice({ act: 'rg-add', icon: ICON.plus, label: 'Agregar otro número' }) : ''), say: q };
  }
  function viewR4() {
    const g = S.rg, q = 'Revisa y confirma';
    return { html: '<h1 class="q">' + q + '</h1><div class="receipt"><dl><dt>Nombre</dt><dd>' + esc(g.name) + '</dd><dt>WhatsApp</dt><dd>' + esc(g.tel ? fmtTel(g.tel) : 'No tiene') + '</dd>' +
      '' + (g.ayuda.length ? g.ayuda.map((t, i) => '<dt>Ayuda ' + (i + 1) + '</dt><dd>' + esc(fmtTel(t)) + '</dd>').join('') : '<dt>Ayuda</dt><dd>Nadie por ahora</dd>') + '</dl></div>' +
      '<label class="check" for="rg-ok"><input id="rg-ok" type="checkbox"' + (g.ok ? ' checked' : '') + '><span>Tengo permiso de esas personas para dar su número</span></label>' + rgAlert +
      choice({ act: 'rg-send', primary: true, icon: ICON.check, label: 'Enviar inscripción' }), say: q };
  }
  function viewRDone() {
    const g = S.rg, res = g.result;
    if (res === 'dup') return { html: '<div class="donehead"><div class="bigcheck">' + ICON.info + '</div><h1 class="q">YA ESTÁ INSCRITO</h1></div><p class="txt say" style="text-align:center">Ese WhatsApp ya tiene una inscripción.</p>' + choice({ act: 'rg-again', primary: true, icon: ICON.people, label: 'Inscribir a otra persona' }), say: 'Ya estaba inscrito.' };
    const wl = res === 'waitlist', line = wl ? 'Quien cobra lo verá en la lista de espera.' : placesOn() ? 'Lugar apartado. Falta que quien cobra lo apruebe.' : 'Ya quedó registrado. Falta que quien cobra lo apruebe.';
    return { html: '<div class="donehead"><div class="bigcheck">' + ICON.check + '</div><h1 class="q">ENVIADA</h1></div>' + (wl ? waitBox('Taller lleno: lista de espera') : '') +
      '<p class="txt say" style="text-align:center"><b>' + esc(g.lastName || '') + '</b></p><p class="txt say" style="text-align:center">' + line + '</p>' +
      choice({ act: 'rg-again', primary: true, icon: ICON.people, label: 'Inscribir a otra persona' }), say: 'Inscripción enviada. ' + line };
  }
  function viewRClosed() {
    return { html: '<h1 class="q">Inscripciones cerradas</h1><p class="txt say">Pregunta a quien organiza el grupo.</p>', say: 'Inscripciones cerradas. Pregunta a quien organiza el grupo.' };
  }
  function viewRLimit() {
    return { html: '<div class="errbig"><div class="badge2">' + ICON.alert + '</div><h1 class="q">Intenta más tarde</h1><p class="txt say">Hubo muchos intentos desde este teléfono.</p></div>', say: 'Intenta más tarde. Hubo muchos intentos.' };
  }
  const rgSet = (id, msg) => { const a = $('#rg-alert'); if (a) a.innerHTML = alertBox(msg); feedback('error'); const el = $('#' + id); if (el) el.focus(); };
  function rgAddHelper(strict) {
    const g = S.rg, raw = ($('#rg-h') || {}).value || '', t = tel10(raw);
    if (!raw.trim()) return strict ? (rgSet('rg-h', 'Escribe el número.'), false) : true;
    if (!t) { rgSet('rg-h', 'Deben ser 10 números.'); return false; }
    if (g.ayuda.indexOf(t) >= 0) { rgSet('rg-h', 'Ese número ya está.'); return false; }
    if (g.ayuda.length >= 3) { rgSet('rg-h', 'Son hasta 3 números.'); return false; }
    g.ayuda.push(t); g.cur = ''; return true;
  }
  function rgSubmit() {
    const g = S.rg; S.regCount = (S.regCount || 0) + 1;
    if (S.regCount > 5) { S.view = 'rlimit'; S.hist = []; paint(); return; }   /* a public page needs a brake against spam */
    const dup = g.tel && PRJ.people.some(p => p.tel === g.tel && p.status !== 'released');
    g.lastName = g.name.trim();
    if (dup) { g.result = 'dup'; nav('rdone'); return; }
    const full = isFull();
    PRJ.people.push(mkPerson({ n: g.lastName, tel: g.tel, via: 'qr', status: full ? 'waitlist' : 'pending', from: cur(), note: 'Se inscribió por QR',
      payers: g.ayuda.map((t, i) => ({ name: 'Ayuda ' + (i + 1), rel: 'Otra persona', tel: t, primary: i === 0 })) }));
    g.result = full ? 'waitlist' : 'pending'; feedback('ok'); S.hist = []; S.view = 'rdone'; paint(); renderPeople();
  }
  function onRgAct(a) {
    const g = S.rg;
    switch (a) {
      case 'rg-next':
        if (S.view === 'r1') { const v = (($('#rg-n') || {}).value || '').trim(); g.name = v; if (v.length < 2) { rgSet('rg-n', 'Escribe el nombre.'); break; } nav('r2'); }
        else if (S.view === 'r2') { const raw = ($('#rg-t') || {}).value || '', t = tel10(raw); g.tel = t || g.tel; if (!raw.trim()) { rgSet('rg-t', 'Escribe el número o toca "No tiene WhatsApp".'); break; } if (!t) { rgSet('rg-t', 'Deben ser 10 números.'); break; } g.tel = t; nav('r3'); }
        else if (S.view === 'r3') { if (rgAddHelper(false)) nav('r4'); }
        break;
      case 'rg-notel': g.tel = ''; nav('r3'); break;
      case 'rg-add': if (rgAddHelper(true)) { paint(true); const i = $('#rg-h'); if (i) i.focus(); } break;
      case 'rg-send': { const cb = $('#rg-ok'); g.ok = !!(cb && cb.checked); if (!g.ok) { rgSet('rg-ok', 'Marca la casilla para continuar.'); break; } attempt('No se pudo enviar la inscripción', rgSubmit); break; }
      case 'rg-again': rgReset(); S.hist = []; S.view = 'r1'; paint(); break;
    }
  }

  /* ================= COLLECTOR: reviewing registrations, QR code, places ================= */
  function viewRegs() {
    const L = reviewList(), q = 'Inscripciones';
    const qr = { act: 'regqr', icon: ICON.qr, label: 'Código para inscribirse', sub: PRJ.reg.open ? 'Muéstralo para que se inscriban' : 'Está cerrado' };
    if (!L.length) return { html: '<h1 class="q">' + q + '</h1><p class="txt say">No hay nada por revisar.</p><div class="stack">' + choice(Object.assign({ primary: true }, qr)) + '</div>', say: q + '. No hay nada por revisar.' };
    const items = L.map(p => ({ act: 'reg-open', data: { id: p.id }, icon: ICON.people, label: p.n, sub: placeState(p).text })).concat([qr]);
    const pg = paged(items, 'Ver más'); pg.rows.forEach((r, i) => { r.primary = i === 0; });
    return { html: '<h1 class="q">' + q + '</h1><div class="stack">' + pg.rows.map(choice).join('') + pg.pager + '</div>', say: q + '. ' + L.length + ' por revisar.' };
  }
  function viewRegDetail() {
    const P = byId(S.person), ps = placeState(P), nm = P.n.length > 20 ? P.n.slice(0, 19) + '…' : P.n, hd = (PRJ.reg.holdDays | 0) || 5;
    let q, body = '';
    if (ps.kind === 'pending') { q = '¿Aprobar a ' + nm + '?'; body = choice({ act: 'reg-approve', primary: true, icon: ICON.check, label: 'Aprobar', sub: placesOn() ? 'Su lugar queda apartado' : 'Podrás cobrarle' }) + choice({ act: 'reg-no', cls: 'danger', icon: ICON.x, label: 'No aprobar' }); }
    else if (ps.kind === 'waitlist') { q = '¿Darle lugar a ' + nm + '?'; body = freeSpots() > 0 || !placesOn() ? choice({ act: 'reg-give', primary: true, icon: ICON.check, label: 'Darle lugar' }) : alertBox('No hay lugar libre. Libera uno primero.'); }
    else if (ps.kind === 'overdue') { q = '¿Qué hacemos con el lugar?'; body = choice({ act: 'reg-extend', primary: true, icon: ICON.clock, label: 'Dejarlo ' + hd + ' días más' }) + choice({ act: 'reg-free', cls: 'danger', icon: ICON.x, label: 'Liberar el lugar' }); }
    else { q = nm + ' ya está al día'; body = choice({ act: 'home', primary: true, icon: ICON.people, label: 'Ir al inicio' }); }
    const dl = '<div class="receipt"><dl><dt>WhatsApp</dt><dd>' + esc(P.tel ? fmtTel(P.tel) : 'No dejó') + '</dd>' + (P.payers.length ? P.payers.map((y, i) => '<dt>Ayuda ' + (i + 1) + '</dt><dd>' + esc(fmtTel(y.tel)) + '</dd>').join('') : '<dt>Ayuda</dt><dd>Nadie por ahora</dd>') + '</dl></div>';
    return { html: idstrip(P, ps.text) + '<h1 class="q">' + esc(q) + '</h1>' + dl + '<div class="stack">' + body + '</div>', say: q };
  }
  function viewRegQR() {
    const open = PRJ.reg.open, url = 'cuentasconmigo.example/i/' + PRJ.reg.token, pl = regPlaces();
    return { html: '<h1 class="q">Código para inscribirse</h1><div class="qrbox">' + fakeQR(77) + '</div><p class="txt say">' + esc(url) + '</p>' + (pl ? '<p class="txt say">' + esc(pl) + '</p>' : '') +
      '<div class="stack">' + choice({ act: 'reg-toggle', role: 'switch', cls: 'sw', checked: open ? 'true' : 'false', label: 'Recibir inscripciones', right: stt(open ? 'paid' : 'due', open ? 'Activado' : 'Apagado') }) +
      choice({ act: 'home', primary: true, icon: ICON.check, label: 'Listo' }) + '</div>', say: 'Código para inscribirse. ' + pl };
  }
  function onCollectorAct(a, d, P) {
    const finish = (title, fn) => attempt(title, fn);
    switch (a) {
      case 'regs': nav('regs'); break;
      case 'regqr': nav('regqr'); break;
      case 'reg-open': S.person = +d.id; nav('regdetail'); break;
      case 'reg-toggle': PRJ.reg.open = !PRJ.reg.open; render(); { const b = $('#screen [data-act="reg-toggle"]'); if (b) b.focus(); } break;
      case 'reg-approve': finish('No se pudo aprobar', function () {
        P.status = 'enrolled'; P.heldOn = iso(TODAY); S.view = 'who'; S.hist = [{ view: 'home', page: 0 }]; S.flow = null; S.period = null; feedback('ok'); renderPeople();
        nav(PRJ.on.periodic || PRJ.on.extra ? 'menu' : 'ledger');
      }); break;
      case 'reg-no': finish('No se pudo guardar', function () { P.status = 'released'; renderPeople(); homeWith('Inscripción quitada.'); }); break;
      case 'reg-give': finish('No se pudo guardar', function () { P.status = 'enrolled'; P.heldOn = iso(TODAY); renderPeople(); homeWith('Ya tiene lugar. Puedes cobrarle.'); }); break;
      case 'reg-extend': finish('No se pudo guardar', function () { P.heldOn = iso(TODAY); homeWith('Lugar apartado ' + (PRJ.reg.holdDays | 0 || 5) + ' días más.'); }); break;
      case 'reg-free': finish('No se pudo guardar', function () { P.status = 'released'; renderPeople(); homeWith('Lugar liberado.'); }); break;
      default: return false;
    }
    return true;
  }

  /* ================= RECEIPT: one big picture, sent with a WhatsApp link (option A) ================= */
  function receiptModel(P, k) {
    const c = charge(P, k), r = k === 'f' ? Object.assign({}, P.last) : (getRec(P, k) || { via: 'qr', payer: 0 }), cash = r.via === 'cash';
    const folio = 'EJ-' + String((P.id * 37 + (typeof k === 'number' ? k : 99)) % 10000).padStart(4, '0');
    return { P: P, k: k, c: c, amount: k === 'f' ? (P.last ? P.last.amount : c.amount) : c.amount, cash: cash, via: r.via || 'qr', payer: r.via === 'fam' ? (P.payers[r.payer || 0] || null) : null, folio: folio,
      place: placesOn() && typeof k === 'number' ? { n: confirmedCount(k), cap: capacity(), title: (periods()[k] || { title: '' }).title } : null, bal: k === 'f' ? P.bal : null, date: shortDate(TODAY) + ' ' + TODAY.getFullYear() };
  }
  const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  function receiptSVG(m) {
    const INK = '#4E1A6E', SOFT = '#5A3E66', PAID = '#0F5F28', t = (x, y, size, txt, o) => '<text x="' + x + '" y="' + y + '" font-size="' + size + '"' + (o && o.w ? ' font-weight="' + o.w + '"' : '') + (o && o.fill ? ' fill="' + o.fill + '"' : '') + (o && o.anchor ? ' text-anchor="' + o.anchor + '"' : '') + '>' + esc(txt) + '</text>';
    let s = '<svg viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Comprobante de pago de ' + esc(m.P.n) + ' por ' + esc(money(m.amount)) + '" font-family="Nunito, Segoe UI, Arial, Helvetica, sans-serif" fill="' + INK + '">';
    s += '<rect width="1080" height="1350" fill="#fff"/><rect width="1080" height="230" fill="' + PAID + '"/><rect y="230" width="1080" height="14" fill="#EDB438"/>';
    s += '<circle cx="150" cy="115" r="64" fill="#fff"/><path d="M118 116l24 24 46-52" fill="none" stroke="' + PAID + '" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>';
    s += t(260, 128, 100, 'PAGADO', { w: 800, fill: '#fff' }) + t(262, 196, 50, viaName(m.via), { w: 700, fill: '#fff' });
    const av = avatar(m.P).replace('<svg ', '<svg x="60" y="270" width="230" height="230" ');
    s += '<clipPath id="rc"><circle cx="175" cy="385" r="115"/></clipPath><g clip-path="url(#rc)">' + av + '</g><circle cx="175" cy="385" r="115" fill="none" stroke="' + INK + '" stroke-width="8"/>';
    s += t(330, 372, 72, clip(m.P.n, 16), { w: 800 }) + t(330, 448, 56, m.c.title ? clip(m.c.title, 22) : '', { w: 700, fill: SOFT });
    s += t(60, 640, 190, money(m.amount), { w: 800 });
    s += '<rect x="60" y="680" width="960" height="6" fill="' + INK + '"/>';
    const concept = typeof m.k === 'number' ? PRJ.main.name : m.c.concept, rows = [['Concepto', clip(concept, 30)], ['Recibe', m.cash ? clip('En mano · ' + (PRJ.name || ''), 30) : clip(m.c.to ? m.c.to.name : (PRJ.name || ''), 30)], ['Cómo pagó', viaName(m.via)]];
    if (m.payer) rows.push(['Pagó', clip(m.payer.name + ' (' + m.payer.rel.toLowerCase() + ')', 30)]);
    if (m.bal !== null) rows.push(['Ahora debe', money(m.bal)]);
    rows.push(['Fecha', m.date], ['Folio', m.folio]);
    rows.forEach((r, i) => { const y = 750 + i * 90; s += t(60, y, 44, r[0], { fill: SOFT }) + t(1020, y, 52, r[1], { w: 800, anchor: 'end' }); });
    if (m.place) {
      s += '<rect x="60" y="1190" width="960" height="96" rx="20" fill="#fff" stroke="' + PAID + '" stroke-width="8"/><path d="M96 1236l22 22 40-44" fill="none" stroke="' + PAID + '" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>';
      s += t(190, 1250, 46, 'LUGAR CONFIRMADO · ' + m.place.n + ' de ' + m.place.cap, { w: 800, fill: PAID });
    }
    s += t(540, 1330, 38, 'Comprobante de pago · no es factura', { fill: SOFT, anchor: 'middle' });
    return s + '</svg>';
  }
  function receiptDests(P) {
    const out = [], seen = {};
    const add = (tel, label, sub) => { if (tel && !seen[tel]) { seen[tel] = 1; out.push({ tel: tel, label: label, sub: sub }); } };
    const pri = P.payers.slice().sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0));
    pri.forEach(y => add(y.tel, y.name, y.rel + ' · ' + maskTel(y.tel)));
    add(P.tel, 'Su celular', maskTel(P.tel));
    return out.slice(0, 4);
  }
  const waText = m => 'Hola. Comprobante de pago de ' + m.P.n + ': ' + money(m.amount) + ' · ' + m.c.concept + '. Folio ' + m.folio + '. Míralo aquí: https://cuentasconmigo.example/c/' + m.folio.toLowerCase();
  const waUrl = (tel, m) => 'https://wa.me/52' + tel + '?text=' + encodeURIComponent(waText(m));
  function viewReceipt() {
    const P = byId(S.person), m = receiptModel(P, S.period), dests = receiptDests(P), key = P.id + '-' + S.period;
    const items = dests.map((d, i) => ({ act: 'wa', data: { tel: d.tel }, primary: i === 0, icon: ICON.send, label: 'Enviar a ' + d.label, sub: S.sent && S.sent[key + d.tel] ? 'WhatsApp abierto. Ahí toca Enviar.' : d.sub }));
    if (items.length < 4) items.push({ act: 'rcpt-share', primary: !items.length, icon: ICON.send, label: 'Compartir comprobante', sub: 'Tú eliges el contacto' });
    const note = S.rnote ? '<div class="notice2" role="status">' + ICON.info + '<span>' + esc(S.rnote) + '</span></div>' : '';
    return { html: note + '<h1 class="q">Comprobante</h1><div class="rcpt">' + receiptSVG(m) + '</div><div class="stack">' + items.map(choice).join('') + '</div>', say: 'Comprobante de ' + P.n + ', ' + money(m.amount) + '. ¿A quién se lo mandas?' };
  }
  function onReceiptAct(a, d, P) {
    if (a === 'receipt') { S.rnote = ''; nav('receipt'); return true; }
    if (a === 'wa') {
      const m = receiptModel(P, S.period), url = waUrl(d.tel, m); S.lastWA = url; S.sent = S.sent || {}; S.sent[P.id + '-' + S.period + d.tel] = 1;
      try { window.open(url, '_blank', 'noopener'); } catch (e) { /* optional */ }
      render(); const b = $('#screen [data-act="wa"][data-tel="' + d.tel + '"]'); if (b) b.focus(); return true;
    }
    if (a === 'rcpt-share') { shareReceipt(receiptModel(P, S.period)); return true; }
    return false;
  }
  /* Fallback: the iPhone share sheet with the picture. Needs a tap, https and a recent iOS; if it is not there, copy the link instead. */
  function shareReceipt(m) {
    const done = msg => { S.rnote = msg; render(); };
    try {
      const svg = receiptSVG(m).replace('<svg ', '<svg width="1080" height="1350" '), img = new Image();
      img.onload = function () {
        try {
          const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; c.getContext('2d').drawImage(img, 0, 0);
          c.toBlob(function (b) {
            const f = new File([b], 'comprobante-' + m.folio + '.png', { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f], text: waText(m) }).catch(function () { /* cancelled */ });
            else copyLink(m, done);
          }, 'image/png');
        } catch (e) { copyLink(m, done); }
      };
      img.onerror = function () { copyLink(m, done); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    } catch (e) { copyLink(m, done); }
  }
  function copyLink(m, done) {
    try { navigator.clipboard.writeText(waText(m)).then(function () { done('Copiamos el mensaje. Pégalo en WhatsApp.'); }, function () { done('No se pudo compartir. Intenta de nuevo.'); }); }
    catch (e) { done('No se pudo compartir. Intenta de nuevo.'); }
  }

  /* ================= MONTHLY REPORT (advanced layer: "Ayuda de un familiar") ================= */
  function repK() { const n = periods().length; if (S.repK == null || S.repK >= n) S.repK = cur(); return Math.max(0, Math.min(S.repK, Math.max(0, n - 1))); }
  function repRows(k) {
    return roster().filter(p => p.from <= k).map(p => {
      const v = getRec(p, k), c = charge(p, k), s = v && v.s === 'paid' ? 'paid' : v && v.s === 'wait' ? 'wait' : 'due';
      return { P: p, s: s, via: s === 'paid' ? v.via : null, amount: c.amount, to: s !== 'paid' ? '' : v.via === 'cash' ? 'Efectivo (lo guardas tú)' : (c.to ? c.to.name : '') };
    });
  }
  function repData() {
    const on = PRJ.on, out = { title: '', lines: [], rows: [], head: [] };
    if (on.periodic) {
      const k = repK(), rows = repRows(k), per = periods()[k], sum = f => rows.filter(f).reduce((a, r) => a + r.amount, 0);
      const exp = rows.reduce((a, r) => a + r.amount, 0), got = sum(r => r.s === 'paid'), cash = sum(r => r.s === 'paid' && r.via === 'cash'), codi = got - cash;
      out.title = per.title; out.k = k;
      out.lines = [['Esperado', money(exp)], ['Recibido', money(got)], ['  por CoDi', money(codi)], ['  en efectivo', money(cash)], ['Pendiente', money(r2(exp - got))], ['Personas', rows.filter(r => r.s === 'paid').length + ' de ' + rows.length + ' pagaron']];
      if (placesOn()) out.lines.push(['Lugares confirmados', confirmedCount(k) + ' de ' + capacity()]);
      if (on.extra) { const ex = roster().filter(p => p.extra && p.extra.s === 'paid'), cr = ex.length * PRJ.extra.amount; out.lines.push([PRJ.extra.name + ' (aparte)', ex.length + ' de ' + roster().length + ' · ' + money(cr)]); }
      out.head = ['Persona', 'Estado', 'Monto', 'Cómo', 'Recibe'];
      out.rows = rows.map(r => ({ P: r.P, s: r.s, cells: [r.P.n, r.s === 'paid' ? 'Pagó' : r.s === 'wait' ? 'Esperando pago' : 'Falta pagar', money(r.amount), r.via ? viaName(r.via) : '', r.to] }));
    } else if (on.ledger) {
      const L = roster(), tot = L.reduce((a, p) => a + p.bal, 0);
      out.title = 'Saldos de hoy'; out.lines = [['Te deben', money(r2(tot))], ['Personas con saldo', L.filter(p => p.bal > 0).length + ' de ' + L.length]];
      out.head = ['Persona', 'Estado', 'Debe', 'Último movimiento', ''];
      out.rows = L.map(p => { const l = p.ledger[0]; return { P: p, s: p.bal > 0 ? 'due' : 'paid', cells: [p.n, p.bal > 0 ? 'Debe' : 'No debe', money(p.bal), l ? (l.t === 'abono' ? 'Abono ' : 'Fiado ') + money(l.a) + ' · ' + l.d : '', ''] }; });
    }
    return out;
  }
  function renderReport() {
    const R = repData(), box = $('#rep-body'); if (!box) return;
    const nav2 = PRJ.on.periodic; $('#rep-nav').hidden = !nav2; $('#rep-title').textContent = R.title || '';
    if (nav2) { $('#rep-prev').disabled = R.k <= 0; $('#rep-next').disabled = R.k >= periods().length - 1; }
    if (!R.rows.length && !R.lines.length) { box.innerHTML = '<p>Activa cobros con calendario o fiado para ver el reporte.</p>'; return; }
    const sum = '<dl class="repsum">' + R.lines.map(l => '<dt>' + esc(l[0].trim()) + '</dt><dd>' + esc(l[1]) + '</dd>').join('') + '</dl>';
    const tbl = '<div class="repwrap"><table class="rep"><thead><tr>' + R.head.map(h => '<th scope="col">' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' +
      R.rows.map(r => '<tr><th scope="row">' + esc(r.cells[0]) + '</th><td>' + stt(r.s, r.cells[1]) + '</td>' + r.cells.slice(2).map(c => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
    box.innerHTML = sum + tbl;
  }
  const repText = () => { const R = repData(); return (PRJ.name || 'Reporte') + ' · ' + R.title + '\n' + R.lines.map(l => l[0] + ': ' + l[1]).join('\n') + '\n\n' + R.rows.map(r => r.cells.filter(Boolean).join(' · ')).join('\n'); };
  const csvCell = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  function repCSV() { const R = repData(); return '﻿' + [R.head.map(csvCell).join(',')].concat(R.rows.map(r => r.cells.map(csvCell).join(','))).join('\r\n'); }
  function onRepClick(e) {
    const b = e.target.closest('#rep-prev, #rep-next, #rep-copy, #rep-csv'); if (!b || b.disabled) return;
    const st = $('#rep-status'); let msg = '';
    if (b.id === 'rep-prev' || b.id === 'rep-next') { S.repK = repK() + (b.id === 'rep-next' ? 1 : -1); renderReport(); return; }
    if (b.id === 'rep-copy') { try { navigator.clipboard.writeText(repText()); msg = 'Resumen copiado.'; } catch (x) { msg = 'No se pudo copiar.'; } }
    if (b.id === 'rep-csv') {
      try { const u = URL.createObjectURL(new Blob([repCSV()], { type: 'text/csv;charset=utf-8' })), a = document.createElement('a'); a.href = u; a.download = 'reporte-' + (repData().title || 'pagos').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.csv'; document.body.appendChild(a); a.click(); a.remove(); msg = 'Archivo listo.'; }
      catch (x) { msg = 'No se pudo preparar el archivo.'; }
    }
    if (st) st.textContent = msg;
  }

  /* ---------- Ajustes: capacity and registration switches ---------- */
  const renderForm0 = renderForm;
  renderForm = function () {
    renderForm0();
    let h = '<div class="field span"><label class="check" for="f-regopen"><input id="f-regopen" type="checkbox" data-path="reg.open"' + (PRJ.reg.open ? ' checked' : '') + '><span>Recibir inscripciones por QR<small>Quien llega al código deja su nombre y WhatsApp. Tú apruebas antes de cobrar.</small></span></label></div>';
    if (PRJ.on.places) {
      h += fld('f-cap', 'Cuántos lugares hay', '<input id="f-cap" type="number" inputmode="numeric" min="1" max="99" step="1" data-path="reg.capacity" data-num="1" value="' + capacity() + '">', 'Al llenarse, las inscripciones pasan a la lista de espera.');
      h += fld('f-hold', 'Días que se aparta un lugar', '<input id="f-hold" type="number" inputmode="numeric" min="1" max="30" step="1" data-path="reg.holdDays" data-num="1" value="' + ((PRJ.reg.holdDays | 0) || 5) + '">', 'Pasado ese tiempo sin pago, tú decides si lo dejas o lo liberas.');
    }
    $('#cfg-form').insertAdjacentHTML('beforeend', h);
  };

  /* ================= RECEIVING ACCOUNTS: Pey registers each one with the bank, so a new account waits ================= */
  /* Pey: POST /bank-account {alias, name (legal holder), clabe, entity}; codiStatus PENDING -> PROCESSING -> ACTIVE (up to 5 business days) | ERROR.
     Only an ACTIVE account can be sent as bankAccountId. The CLABE below is Pey's published test account: it activates at once. */
  const PEY_TEST_CLABE = '012180015826225713';
  const recvState = r => (!r || r.pending ? 'nodata' : (r.status || 'active'));
  const recvOk = r => recvState(r) === 'active';
  const recvPill = r => {
    const st = recvState(r);
    if (st === 'nodata') return '<span class="pill" style="border-color:var(--wait);color:var(--ink)">' + ICON.clock + 'Cuenta por confirmar</span>';
    if (st === 'processing') return '<span class="pill" style="border-color:var(--wait);color:var(--ink)">' + ICON.clock + 'En espera de Pey · hasta 5 días hábiles</span>';
    if (st === 'error') return '<span class="pill" style="border-color:var(--danger);color:var(--danger)">' + ICON.alert + 'Pey no pudo registrarla</span>';
    return '<span class="pill ok">' + ICON.check + 'Lista · ' + maskClabe(r.clabe) + '</span>';
  };
  renderReceivers = function () {
    const L = PRJ.receivers;
    $('#cfg-recv').innerHTML = L.map(r => {
      const rm = REDIT.confirmRemove === r.id, wait = recvState(r) === 'processing';
      return '<div class="prow"><div class="ava bankico">' + ICON.cash + '</div><div class="info"><strong>' + esc(r.name || 'Sin nombre') + '</strong>' +
        '<span class="pill">' + KINDS[r.kind] + '</span>' + recvPill(r) + (r.holder ? '<span class="pill">Titular: ' + esc(r.holder) + '</span>' : '') + '</div>' +
        '<div class="acts">' + (rm ? '<button class="btn small danger" data-ract="remove-yes" data-id="' + r.id + '">Sí, quitar</button><button class="btn small" data-ract="remove-no">No</button>' :
          '<button class="btn small" data-ract="edit" data-id="' + r.id + '">Editar</button>' + (wait ? '<button class="btn small" data-ract="sim-active" data-id="' + r.id + '">Simular que Pey la activó</button>' : '') + (L.length > 1 ? '<button class="btn small danger" data-ract="remove" data-id="' + r.id + '">Quitar</button>' : '')) + '</div></div>';
    }).join('') + (L.length === 1 ? '<p>Siempre debe quedar al menos una cuenta.</p>' : '') +
      (L.some(r => recvState(r) === 'processing') ? '<p>Una cuenta nueva tarda hasta 5 días hábiles en quedar lista. Mientras tanto no recibe pagos CoDi: solo anotas efectivo. "Simular que Pey la activó" es solo del prototipo; en la app real Pey avisa solo.</p>' : '');
  };
  openRecEditor = function (r) {
    REDIT.draft = r ? JSON.parse(JSON.stringify(r)) : { id: '', name: '', kind: 'yo', clabe: '', pending: false, holder: '' };
    if (REDIT.draft.holder === undefined) REDIT.draft.holder = '';
    REDIT.isNew = !r; REDIT.errors = []; renderRecEditor();
    const f = $('#rc-n'); if (f) { f.focus(); f.scrollIntoView({ block: 'center' }); }
  };
  renderRecEditor = function () {
    const d = REDIT.draft, box = $('#cfg-recv-editor');
    $('#addrecv').hidden = !!d;
    if (!d) { box.innerHTML = ''; return; }
    let h = '<div class="editor" role="group" aria-label="Datos de la cuenta"><h3>' + (REDIT.isNew ? 'Nueva cuenta de cobro' : 'Editar cuenta de cobro') + '</h3><div class="form">';
    h += fld('rc-n', 'Nombre de quien recibe', '<input id="rc-n" type="text" data-rd="name" value="' + esc(d.name) + '" maxlength="50" autocomplete="off">', 'Como se lo dirías a quien paga. Por ejemplo: Taller de Rosa, DIF Centro, Tienda La Esquina.');
    h += fld('rc-k', 'Es', '<select id="rc-k" data-rd="kind">' + Object.keys(KINDS).map(k => '<option value="' + k + '"' + (d.kind === k ? ' selected' : '') + '>' + KINDS[k] + '</option>').join('') + '</select>');
    h += fld('rc-h', 'Nombre completo del titular', '<input id="rc-h" type="text" data-rd="holder" value="' + esc(d.holder) + '" maxlength="80" autocomplete="off"' + (d.pending ? ' disabled' : '') + '>', 'Tal como aparece en el banco: persona o razón social. Pey lo pide para registrar la cuenta.', 'span');
    h += fld('rc-c', 'CLABE de la cuenta', '<input id="rc-c" type="tel" inputmode="numeric" data-rd="clabe" value="' + esc(d.clabe) + '" maxlength="18" autocomplete="off"' + (d.pending ? ' disabled' : '') + '>', '18 dígitos, sin espacios. El banco debe tener CoDi. Cópiala de la app o del estado de cuenta.', 'span');
    h += '<div class="field span"><button class="btn small" type="button" data-ract="test-clabe"' + (d.pending ? ' disabled' : '') + '>Usar la CLABE de prueba de Pey</button><div class="hint">Se activa al instante y sus pagos no se devuelven: prueba con $0.01.</div></div>';
    h += '<div class="field span"><label class="check" for="rc-p"><input id="rc-p" type="checkbox" data-ract="pending"' + (d.pending ? ' checked' : '') + '><span>Todavía no tengo los datos de esta cuenta<small>Puedes dejarla anotada y completarla después. La app te avisará que está por confirmar.</small></span></label></div>';
    h += '</div><div class="notice"><span>' + ICON.clock + '</span><span>Al guardar, Pey registra la cuenta con el banco. Tarda hasta 5 días hábiles. Mientras tanto esa cuenta solo puede recibir efectivo anotado, no pagos CoDi.</span></div>';
    if (REDIT.errors.length) h += '<div class="err" role="alert">Revisa esto antes de guardar:<ul>' + REDIT.errors.map(e => '<li>' + esc(e) + '</li>').join('') + '</ul></div>';
    h += '<div class="btnrow"><button class="btn primary" style="width:auto;min-height:3.75rem" data-ract="save">Guardar cuenta</button><button class="btn" style="width:auto;min-height:3.75rem" data-ract="cancel">Cancelar</button></div></div>';
    box.innerHTML = h;
  };
  validateRec = function (d) {
    const e = [];
    if (!d.name.trim()) e.push('Escribe el nombre de quien recibe.');
    if (!d.pending) {
      if ((d.holder || '').trim().length < 3) e.push('Escribe el nombre completo del titular, como aparece en el banco.');
      if (!/^[0-9]{18}$/.test(d.clabe)) e.push('La CLABE debe tener 18 dígitos, sin espacios.');
      else if (!clabeOk(d.clabe)) e.push('El último dígito de la CLABE no coincide. Revisa que esté bien copiada.');
    }
    return e;
  };
  saveRec = function () {
    const d = REDIT.draft; REDIT.errors = validateRec(d);
    if (REDIT.errors.length) { renderRecEditor(); return; }
    d.name = d.name.trim(); d.holder = (d.holder || '').trim(); if (d.pending) { d.clabe = ''; d.holder = ''; }
    const old = REDIT.isNew ? null : PRJ.receivers.find(x => x.id === d.id), changed = !old || old.clabe !== d.clabe || old.holder !== d.holder || old.pending;
    /* a new or changed CLABE is sent to Pey again and waits; Pey's test CLABE is active at once */
    if (d.pending) d.status = undefined; else if (changed) { d.status = d.clabe === PEY_TEST_CLABE ? 'active' : 'processing'; d.sentOn = iso(TODAY); } else d.status = old.status || 'active';
    if (REDIT.isNew) { d.id = 'r' + (++ridn); PRJ.receivers.push(d); }
    else if (old) Object.assign(old, { name: d.name, kind: d.kind, clabe: d.clabe, pending: d.pending, holder: d.holder, status: d.status, sentOn: d.sentOn });
    REDIT.draft = null; REDIT.errors = []; renderRecEditor(); renderReceivers(); renderDest(); afterChange();
  };
  const onRecClick0 = onRecClick;
  onRecClick = function (b) {
    const a = b.dataset.ract;
    if (a === 'sim-active') { const r = PRJ.receivers.find(x => x.id === b.dataset.id); if (r) r.status = 'active'; renderReceivers(); afterChange(); return; }
    if (a === 'test-clabe' && REDIT.draft && !REDIT.draft.pending) { REDIT.draft.clabe = PEY_TEST_CLABE; renderRecEditor(); const c = $('#rc-c'); if (c) c.focus(); return; }
    onRecClick0(b);
  };
  /* simple mode: a receiving account that is not ready cannot take CoDi payments */
  function recvCard() {
    const seen = {}, bad = [];
    [['main', PRJ.on.periodic], ['extra', PRJ.on.extra], ['ledger', PRJ.on.ledger]].forEach(k => { if (!k[1]) return; const r = recvOf(k[0]); if (r && !recvOk(r) && !seen[r.id]) { seen[r.id] = 1; bad.push(r); } });
    return bad.map(r => '<div class="statcard"><p class="txt say"><b>' + (recvState(r) === 'processing' ? 'Cuenta en espera' : 'Cuenta por confirmar') + '</b></p>' + stt('wait', clip(r.name, 30)) + '<p class="txt soft say">Por ahora solo efectivo.</p></div>').join('');
  }

  Object.assign(VIEWS, { r1: viewR1, r2: viewR2, r3: viewR3, r4: viewR4, rdone: viewRDone, rclosed: viewRClosed, rlimit: viewRLimit, regs: viewRegs, regdetail: viewRegDetail, regqr: viewRegQR, receipt: viewReceipt });
  Object.assign(NEEDS_PERSON, { regdetail: 1, receipt: 1 });
  Object.assign(BAR, { r1: [0, 1], r2: [1, 1], r3: [1, 1], r4: [1, 1], rdone: [0, 0], rclosed: [0, 0], rlimit: [0, 0], regs: [1, 0], regdetail: [1, 0], regqr: [1, 0], receipt: [1, 0] });
  /* a hook so tests (and curious people) can look at the model; it exposes nothing that is not already on screen */
  window.PCF = { project: () => PRJ, state: () => S };
