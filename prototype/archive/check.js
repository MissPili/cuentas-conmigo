
(function () {
  'use strict';

  /* ---------- icons ---------- */
  const I = (p, extra) => '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" ' + (extra || '') + '>' + p + '</svg>';
  const ICON = {
    check: I('<path d="M4.5 12.5l5 5L19.5 7"/>'),
    clock: I('<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.5l3.5 2"/>'),
    back: I('<path d="M15 5l-7 7 7 7"/>'),
    speaker: I('<path d="M4 9.5v5h4l5 4v-13l-5 4z" fill="currentColor"/><path d="M16.5 9a4 4 0 010 6M18.8 6.5a7.5 7.5 0 010 11"/>'),
    mute: I('<path d="M4 9.5v5h4l5 4v-13l-5 4z" fill="currentColor"/><path d="M17 9.5l5 5M22 9.5l-5 5"/>'),
    star: I('<path d="M12 3.5l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 16.9 6.7 19.8l1.1-5.9L3.4 9.8l6-.8z" fill="currentColor" stroke-width="1.5"/>'),
    qr: I('<rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1"/><path d="M14 14h2.5v2.5H14zM18 18h2.5v2.5H18zM14 20.5v0M20.5 14v0"/>'),
    people: I('<circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.6 3-5.4 6-5.4s5.4 1.8 6 5.4"/><circle cx="17.5" cy="9" r="2.4"/><path d="M17.5 13.6c2.2.2 3.6 1.8 4 4.4"/>'),
    cash: I('<rect x="3" y="6.5" width="18" height="11" rx="2"/><circle cx="12" cy="12" r="2.8"/>')
  };

  /* ---------- sample people (invented) ---------- */
  const PEOPLE = [
    { n: 'Rosa',    bg: '#D9E2F7', skin: '#E8B896', hair: '#C9CCD6', cloth: '#7B5EA7', style: 'bun',   gl: 1, fam: 'Ana, su hija',     tel: '•••• 4821' },
    { n: 'Lupita',  bg: '#F5D9E4', skin: '#B97A57', hair: '#E6E8EE', cloth: '#2F6F9F', style: 'short',        fam: 'Luis, su nieto',   tel: '•••• 1307' },
    { n: 'Chela',   bg: '#DDE6F0', skin: '#F1C9A5', hair: '#9A9DAA', cloth: '#B04A5A', style: 'curly', gl: 1, fam: 'Marta, su hija',   tel: '•••• 9942' },
    { n: 'Mary',    bg: '#E4DAF3', skin: '#D9A47C', hair: '#4A3A34', cloth: '#3F6FB0', style: 'long',         fam: null },
    { n: 'Toña',    bg: '#F2DDE3', skin: '#8D5A3C', hair: '#6C6F7C', cloth: '#8A4F9E', style: 'curly',        fam: 'Raúl, su hijo',    tel: '•••• 5530' },
    { n: 'Meche',   bg: '#D8E7F2', skin: '#E8B896', hair: '#E6E8EE', cloth: '#C25B6E', style: 'bun',          fam: 'Dany, su nieta',   tel: '•••• 7716' },
    { n: 'Conchita',bg: '#E9E0F5', skin: '#D9A47C', hair: '#B9BCC6', cloth: '#35709E', style: 'short', gl: 1, fam: 'Pablo, su hijo',   tel: '•••• 2284' },
    { n: 'Paty',    bg: '#F6DCE6', skin: '#F1C9A5', hair: '#7A3E4E', cloth: '#5A5FA8', style: 'long',         fam: 'Sofi, su hija',    tel: '•••• 6049' },
    { n: 'Ofelia',  bg: '#DAE4F4', skin: '#B97A57', hair: '#C9CCD6', cloth: '#A8445B', style: 'bun',   gl: 1, fam: 'Iván, su nieto',   tel: '•••• 3391' },
    { n: 'Nena',    bg: '#E6DDF4', skin: '#E8B896', hair: '#E6E8EE', cloth: '#6A4FA0', style: 'curly',        fam: null },
    { n: 'Juanita', bg: '#F3D9E0', skin: '#8D5A3C', hair: '#9A9DAA', cloth: '#2C6C99', style: 'short',        fam: 'Karen, su hija',   tel: '•••• 8105' },
    { n: 'Tere',    bg: '#D7E3F5', skin: '#D9A47C', hair: '#B9BCC6', cloth: '#B65A66', style: 'long',  gl: 1, fam: 'Beto, su hijo',    tel: '•••• 4468' }
  ];
  const N = PEOPLE.length;

  function avatar(p) {
    const hr = p.hair;
    let back = '', front = '';
    if (p.style === 'long') back = '<path d="M28 44c-2-22 8-32 22-32s24 10 22 32l2 30H26z" fill="' + hr + '"/>';
    if (p.style === 'curly') {
      front = [[33,24,9],[42,17,9],[50,14,9],[58,17,9],[67,24,9],[29,36,7],[71,36,7]].map(c => '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '" fill="' + hr + '"/>').join('');
    } else {
      front = '<path d="M31 42c-3-19 7-28 19-28s22 9 19 28c-3-9-9-14-19-14s-16 5-19 14z" fill="' + hr + '"/>';
      if (p.style === 'bun') front += '<circle cx="50" cy="12" r="8" fill="' + hr + '"/>';
    }
    const glasses = p.gl ? '<g fill="none" stroke="#2A2A33" stroke-width="1.6"><circle cx="43" cy="43" r="5.4"/><circle cx="57" cy="43" r="5.4"/><path d="M48.4 43h3.2"/></g>' : '';
    return '<svg viewBox="0 0 100 100" role="img" aria-label="Foto de ejemplo de ' + p.n + '" preserveAspectRatio="xMidYMid slice">' +
      '<rect width="100" height="100" fill="' + p.bg + '"/>' + back +
      '<path d="M6 100c2-22 20-30 44-30s42 8 44 30z" fill="' + p.cloth + '"/>' +
      '<rect x="42" y="56" width="16" height="18" rx="6" fill="' + p.skin + '"/><rect x="42" y="56" width="16" height="18" rx="6" fill="#000" opacity=".08"/>' +
      '<ellipse cx="50" cy="42" rx="19" ry="22" fill="' + p.skin + '"/>' + front +
      '<circle cx="43" cy="43" r="1.9" fill="#2A2A33"/><circle cx="57" cy="43" r="1.9" fill="#2A2A33"/>' + glasses +
      '<circle cx="38" cy="50" r="3" fill="#D86A6A" opacity=".22"/><circle cx="62" cy="50" r="3" fill="#D86A6A" opacity=".22"/>' +
      '<path d="M43 52q7 6 14 0" fill="none" stroke="#2A2A33" stroke-width="1.8" stroke-linecap="round"/></svg>';
  }

  /* ---------- templates (the configurable part) ---------- */
  const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const MON3 = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  const HUES = [225, 355, 285, 195, 320, 255, 12, 210, 300, 340, 240, 270]; /* no greens or yellows */

  const TPL = {
    taller: {
      id: 'taller', title: 'Taller de ejemplo', unit: 'Mes', count: 12, amount: 130, current: 10,
      label: p => MON3[p], sub: () => '', speak: p => MONTHS[p],
      concept: p => 'Mensualidad taller - ' + MONTHS[p],
      conceptName: 'Mensualidad del taller',
      extra: { label: 'Pago anual DIF', amount: 40, concept: 'Pago anual DIF', speak: 'el pago anual' },
      turns: false,
      periodTitle: p => MONTHS[p].charAt(0).toUpperCase() + MONTHS[p].slice(1),
      cfg: [['Periodo', 'Mensual, 12 meses'], ['Cobro principal', '$130'], ['Cobro aparte', '$40 al año'], ['Turnos', 'No']]
    },
    tanda: {
      id: 'tanda', title: 'Tanda de ejemplo', unit: 'Ronda', count: 12, amount: 200, current: 4,
      label: p => String(p + 1), sub: () => 'ronda', speak: p => 'la ronda ' + (p + 1),
      concept: p => 'Tanda - ronda ' + (p + 1),
      conceptName: 'Aportación de la tanda',
      extra: null, turns: true,
      periodTitle: p => 'Ronda ' + (p + 1),
      cfg: [['Periodo', 'Quincenal, 12 rondas'], ['Aportación', '$200'], ['Cobro aparte', 'Ninguno'], ['Turnos', 'Sí, una persona por ronda']]
    }
  };

  /* ---------- seeded sample data ---------- */
  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function pickVia(r, i) { const x = r(); if (x < .25) return 'qr'; if (x < .7 && PEOPLE[i].fam) return 'fam'; return 'cash'; }
  function seed(id) {
    const T = TPL[id], r = rng(id === 'taller' ? 7 : 11);
    const pay = [], extra = [];
    for (let i = 0; i < N; i++) {
      const row = [];
      for (let p = 0; p < T.count; p++) {
        let v = null;
        const date = id === 'taller' ? (5 + Math.floor(r() * 10)) + ' de ' + MONTHS[p] : 'Ronda ' + (p + 1);
        if (p < T.current) { if (r() < (id === 'taller' ? .93 : .98)) v = { s: 'paid', via: pickVia(r, i), date: date }; }
        else if (p === T.current) { const x = r(); if (x < .55) v = { s: 'paid', via: pickVia(r, i), date: date }; else if (x < .7 && PEOPLE[i].fam) v = { s: 'wait', via: 'fam' }; }
        row.push(v);
      }
      pay.push(row);
      extra.push(T.extra && r() < .65 ? { s: 'paid', via: pickVia(r, i), date: '3 de febrero' } : null);
    }
    return { pay: pay, extra: extra, payout: {} };
  }

  /* ---------- state ---------- */
  const S = { tpl: 'taller', view: 'who', person: 0, period: 0, voice: true };
  const DB = { taller: seed('taller'), tanda: seed('tanda') };
  const VIA = { qr: 'QR con su celular', fam: 'Familiar a distancia', cash: 'Efectivo en el salón' };
  const $ = s => document.querySelector(s);
  const T = () => TPL[S.tpl];
  const D = () => DB[S.tpl];
  const money = n => '$' + n.toLocaleString('es-MX');
  const today = () => { try { return new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(new Date()); } catch (e) { return 'hoy'; } };
  const rec = (i, p) => (p === 'x' ? D().extra[i] : D().pay[i][p]);
  const setRec = (i, p, v) => { if (p === 'x') D().extra[i] = v; else D().pay[i][p] = v; };

  /* ---------- voice + visible caption ---------- */
  function say(text) {
    $('#caption').innerHTML = ICON.speaker + '<span>Voz: <b>«' + text + '»</b></span>';
    if (!S.voice) return;
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'es-MX'; u.rate = 0.9;
      const vs = window.speechSynthesis.getVoices() || [];
      const v = vs.find(x => x.lang.replace('_', '-').toLowerCase() === 'es-mx') || vs.find(x => x.lang.toLowerCase().indexOf('es') === 0);
      if (v) u.voice = v;
      window.speechSynthesis.speak(u);
    } catch (e) { /* voice is optional */ }
  }
  function paintVoiceBtn() {
    const b = $('#voicebtn');
    b.innerHTML = S.voice ? ICON.speaker : ICON.mute;
    b.setAttribute('aria-pressed', S.voice ? 'true' : 'false');
    b.setAttribute('aria-label', S.voice ? 'Voz activada. Tocar para silenciar' : 'Voz silenciada. Tocar para activar');
  }

  /* ---------- fake QR (clearly an example) ---------- */
  function fakeQR(seedN) {
    const n = 25, r = rng(seedN * 97 + 13); let out = '';
    const finder = (x, y) => '<rect x="' + x + '" y="' + y + '" width="7" height="7" fill="#000"/><rect x="' + (x + 1) + '" y="' + (y + 1) + '" width="5" height="5" fill="#fff"/><rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="3" height="3" fill="#000"/>';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if ((x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9)) continue;
      if (r() < .48) out += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="#000"/>';
    }
    return '<svg viewBox="0 0 25 25" role="img" aria-label="QR de ejemplo" shape-rendering="crispEdges"><rect width="25" height="25" fill="#fff"/>' + out + finder(0, 0) + finder(n - 7, 0) + finder(0, n - 7) + '</svg>';
  }

  /* ---------- screens ---------- */
  function counts() {
    const p = T().current; let paid = 0, wait = 0;
    for (let i = 0; i < N; i++) { const v = D().pay[i][p]; if (v && v.s === 'paid') paid++; else if (v && v.s === 'wait') wait++; }
    return { paid: paid, wait: wait, due: N - paid - wait };
  }

  function viewWho() {
    const t = T(), c = counts(), cur = t.current;
    let turnBlock = '';
    if (t.turns) {
      const holder = PEOPLE[cur % N], done = D().payout[cur];
      turnBlock = '<div class="turn"><div class="row"><div class="ava">' + avatar(holder) + '</div><div class="grow"><strong>Ronda ' + (cur + 1) + ' de ' + t.count + '</strong>Le toca a ' + holder.n + '. Bolsa de ' + money(t.amount * N) + '.</div></div>' +
        (done ? '<div class="waiting" style="background:var(--paid);color:var(--on-paid)">' + ICON.check + 'Entrega registrada</div>' : '<button class="btn" data-act="payout">' + ICON.cash + 'Registrar que ya recibió la bolsa</button>') + '</div>';
    }
    let faces = '';
    for (let i = 0; i < N; i++) {
      const v = D().pay[i][cur], st = v ? v.s : '';
      faces += '<button class="person ' + st + '" data-act="pick" data-i="' + i + '" aria-label="' + PEOPLE[i].n + (st === 'paid' ? ', ya pagó' : st === 'wait' ? ', esperando pago' : ', falta pagar') + '">' + avatar(PEOPLE[i]) +
        (t.turns && i === cur % N ? '<span class="turnflag">' + ICON.star + 'Le toca</span>' : '') +
        (st === 'paid' ? '<span class="badge paid">' + ICON.check + '</span>' : st === 'wait' ? '<span class="badge wait">' + ICON.clock + '</span>' : '') + '</button>';
    }
    return '<div><h1 class="q">¿Quién paga?</h1>' +
      '<div style="margin-top:12px" class="seg" role="img" aria-label="' + c.paid + ' pagaron, ' + c.wait + ' esperando, ' + c.due + ' faltan"><i class="p" style="width:' + (c.paid / N * 100) + '%"></i><i class="w" style="width:' + (c.wait / N * 100) + '%"></i></div>' +
      '<div class="sum"><span>' + t.periodTitle(cur) + ':</span><span><b>' + c.paid + '</b> pagaron</span><span><b>' + c.wait + '</b> esperando</span><span><b>' + c.due + '</b> faltan</span></div></div>' +
      turnBlock + '<div class="faces">' + faces + '</div>';
  }

  function tileHTML(i, p) {
    const t = T(), v = rec(i, p), cur = t.current;
    const st = v ? v.s : (p > cur ? 'future' : 'due');
    const icon = st === 'paid' ? ICON.check : st === 'wait' ? ICON.clock : '';
    const word = st === 'paid' ? 'pagado' : st === 'wait' ? 'esperando' : (p > cur ? 'adelantar' : 'falta');
    return '<button class="tile ' + st + '" style="--h:' + HUES[p % 12] + '" data-act="period" data-p="' + p + '" aria-label="' + t.periodTitle(p) + ', ' + word + '">' +
      '<span>' + t.label(p) + '</span>' + (icon || (t.sub(p) ? '<small>' + t.sub(p) + '</small>' : '')) + '</button>';
  }

  function viewWhat() {
    const t = T(), i = S.person, P = PEOPLE[i];
    let tiles = '';
    for (let p = 0; p < t.count; p++) tiles += tileHTML(i, p);
    let extra = '';
    if (t.extra) {
      const v = D().extra[i], st = v ? v.s : '';
      extra = '<div class="annual-wrap"><div class="label">Una vez al año, aparte</div><button class="annual ' + st + '" data-act="period" data-p="x" aria-label="' + t.extra.label + (st === 'paid' ? ', pagado' : st === 'wait' ? ', esperando' : ', falta') + '"><span>' + t.extra.label + '</span><span class="row" style="gap:10px">' + (st === 'paid' ? ICON.check : st === 'wait' ? ICON.clock : '') + money(t.extra.amount) + '</span></button></div>';
    }
    return '<button class="btn back" data-act="back">' + ICON.back + 'Otra persona</button>' +
      '<div class="who"><div class="ava">' + avatar(P) + '</div><div><strong>' + P.n + '</strong></div></div>' +
      '<div><h1 class="q">¿Qué paga?</h1><p class="label" style="margin:8px 0 0">' + t.conceptName + ' · ' + money(t.amount) + '</p></div>' +
      '<div class="tiles">' + tiles + '</div>' + extra +
      '<div class="legend"><span><i class="dot" style="background:var(--paid);color:var(--on-paid)">' + ICON.check + '</i> Pagado</span><span><i class="dot" style="background:var(--wait);color:var(--on-wait)">' + ICON.clock + '</i> Esperando</span><span><i class="dot" style="background:hsl(225 62% var(--ml))"></i> Falta</span></div>';
  }

  function chargeInfo() {
    const t = T();
    if (S.period === 'x') return { amount: t.extra.amount, title: t.extra.label, concept: t.extra.concept, h: null, speak: t.extra.speak };
    return { amount: t.amount, title: t.periodTitle(S.period), concept: t.concept(S.period), h: HUES[S.period % 12], speak: t.speak(S.period) };
  }

  function viewPay() {
    const P = PEOPLE[S.person], c = chargeInfo(), r = rec(S.person, S.period), via = r ? r.via : 'qr';
    const head = '<button class="btn back" data-act="back">' + ICON.back + 'Volver</button>' +
      '<div class="who"><div class="ava">' + avatar(P) + '</div><div><strong>' + P.n + '</strong></div></div>' +
      '<div class="amount"><span class="chip ' + (c.h === null ? 'annual-chip' : '') + '" style="--h:' + (c.h === null ? 225 : c.h) + '">' + c.title + '</span><div class="big">' + money(c.amount) + '</div></div>';
    let body = '';
    if (via === 'qr') {
      body = '<div><div class="qrbox">' + fakeQR(S.person * 20 + (S.period === 'x' ? 19 : S.period)) + '</div><div class="qrnote">QR de ejemplo. Aquí iría el código CoDi.</div></div>' +
        '<div class="waiting"><i class="pulse"></i>Esperando que pague</div>' +
        '<div class="stack"><button class="btn" data-act="via" data-v="fam"' + (P.fam ? '' : ' disabled') + '>' + ICON.people + (P.fam ? 'Que pague ' + P.fam : 'Sin familiar registrado') + '</button>' +
        '<button class="btn" data-act="via" data-v="cash">' + ICON.cash + 'Pagó en efectivo</button>' +
        '<button class="btn sim" data-act="simulate">Solo prototipo: simular que ya pagó</button></div>';
    } else if (via === 'fam') {
      body = '<div class="card" style="border-color:var(--wait)"><div class="row">' + '<div class="grow"><strong style="font-family:var(--font-display);font-size:1.3rem">Solicitud enviada</strong><div style="color:var(--ink-soft)">' + (P.fam || '') + ' · cel. ' + (P.tel || '') + '</div></div></div><div class="waiting"><i class="pulse"></i>Esperando que lo autorice</div></div>' +
        '<div class="stack"><button class="btn sim" data-act="simulate">Solo prototipo: simular que ya pagó</button>' +
        '<button class="btn" data-act="via" data-v="qr">' + ICON.qr + 'Mejor mostrar el QR</button></div>';
    } else {
      body = '<div class="card" style="border-color:var(--ink)"><strong style="font-family:var(--font-display);font-size:1.5rem">¿Recibiste ' + money(c.amount) + ' en efectivo?</strong></div>' +
        '<div class="stack"><button class="btn primary" data-act="cash">' + ICON.check + 'Sí, recibí el dinero</button>' +
        '<button class="btn" data-act="via" data-v="qr">' + ICON.qr + 'Mejor mostrar el QR</button></div>';
    }
    return head + body + '<button class="btn quiet" data-act="cancel">Cancelar cobro</button>';
  }

  function viewDone() {
    const P = PEOPLE[S.person], c = chargeInfo(), r = rec(S.person, S.period) || { via: 'qr' };
    const folio = 'EJ-' + String(S.person * 100 + (S.period === 'x' ? 99 : S.period) + 1000).slice(-4);
    return '<div class="done"><div class="bigcheck">' + ICON.check + '</div><h1>PAGADO</h1></div>' +
      '<div class="receipt"><div class="who"><div class="ava">' + avatar(P) + '</div><div><strong>' + P.n + '</strong><div class="chip ' + (c.h === null ? 'annual-chip' : '') + '" style="--h:' + (c.h === null ? 225 : c.h) + ';margin-top:6px;display:inline-block">' + c.title + '</div></div></div>' +
      '<dl><dt>Monto</dt><dd style="font-size:1.5rem">' + money(c.amount) + '</dd><dt>Concepto</dt><dd>' + c.concept + '</dd><dt>Vía</dt><dd>' + VIA[r.via] + '</dd><dt>Fecha</dt><dd>' + (r.date || today()) + '</dd><dt>Folio</dt><dd>' + folio + ' (ejemplo)</dd></dl></div>' +
      '<button class="btn primary" data-act="next">Siguiente persona</button>';
  }

  function render() {
    const m = { who: viewWho, what: viewWhat, pay: viewPay, done: viewDone };
    $('#screen').innerHTML = m[S.view]();
    $('#grouptitle').textContent = T().title;
    const ph = $('#phone').getBoundingClientRect();
    if (ph.top < 0) $('#phone').scrollIntoView({ block: 'start' });
    paintCfg();
  }

  function paintCfg() {
    $('#cfg').innerHTML = T().cfg.map(r => '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>').join('');
    document.querySelectorAll('#tplchoice button').forEach(b => b.setAttribute('aria-pressed', b.dataset.tpl === S.tpl ? 'true' : 'false'));
  }

  /* ---------- actions ---------- */
  function go(view, sayText) { S.view = view; render(); if (sayText) say(sayText); }

  function onAct(e) {
    const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
    const a = el.dataset.act, t = T();
    if (a === 'pick') { S.person = +el.dataset.i; go('what', PEOPLE[S.person].n + '. ¿Qué paga?'); }
    else if (a === 'back') { if (S.view === 'pay') go('what', '¿Qué paga?'); else go('who', 'Toca tu foto'); }
    else if (a === 'next') go('who', 'Toca tu foto');
    else if (a === 'period') {
      S.period = el.dataset.p === 'x' ? 'x' : +el.dataset.p;
      const r = rec(S.person, S.period), c = chargeInfo();
      if (r && r.s === 'paid') { go('done', 'Ya está pagado'); return; }
      if (!r) setRec(S.person, S.period, { s: 'wait', via: 'qr' });
      go('pay', money(c.amount).replace('$', '') + ' pesos, ' + c.speak);
    }
    else if (a === 'via') {
      const v = el.dataset.v, P = PEOPLE[S.person], cur = rec(S.person, S.period) || {};
      setRec(S.person, S.period, { s: 'wait', via: v });
      go('pay', v === 'fam' ? 'Enviamos la solicitud a ' + P.fam : v === 'cash' ? '¿Recibiste el efectivo?' : 'Muestra el código');
    }
    else if (a === 'simulate') {
      const r = rec(S.person, S.period) || { via: 'qr' };
      setRec(S.person, S.period, { s: 'paid', via: r.via, date: null });
      go('done', 'Listo, pagado');
    }
    else if (a === 'cash') { setRec(S.person, S.period, { s: 'paid', via: 'cash', date: null }); go('done', 'Listo, pagado'); }
    else if (a === 'cancel') { setRec(S.person, S.period, null); go('what', '¿Qué paga?'); }
    else if (a === 'payout') { D().payout[t.current] = true; render(); say('Entrega registrada'); }
  }

  /* ---------- wiring ---------- */
  function start() {
    $('#screen').addEventListener('click', onAct);
    $('#voicebtn').addEventListener('click', function () {
      S.voice = !S.voice; paintVoiceBtn();
      if (!S.voice) { try { window.speechSynthesis.cancel(); } catch (e) {} }
      else say('Voz activada');
    });
    document.querySelectorAll('#tplchoice button').forEach(b => b.addEventListener('click', function () { S.tpl = b.dataset.tpl; S.view = 'who'; render(); say('Toca tu foto'); }));
    $('#resetbtn').addEventListener('click', function () { DB.taller = seed('taller'); DB.tanda = seed('tanda'); S.view = 'who'; render(); say('Toca tu foto'); });
    document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', function () { location.hash = b.dataset.view; }));
    window.addEventListener('hashchange', route);

    /* identity sheet fills */
    $('#id-check').innerHTML = ICON.check; $('#id-clock').innerHTML = ICON.clock;
    $('#lg-paid').innerHTML = ICON.check; $('#lg-wait').innerHTML = ICON.clock;
    $('#monthswatches').innerHTML = MON3.map((m, k) => '<div class="tile" style="--h:' + HUES[k] + '">' + m + '</div>').join('');
    const icon = '<rect width="180" height="180" rx="40" fill="#18213B"/><circle cx="84" cy="82" r="56" fill="#fff"/><circle cx="84" cy="74" r="20" fill="#18213B"/><path d="M42 124c8-24 24-32 42-32s34 8 42 32c-12 12-26 16-42 16s-30-4-42-16z" fill="#18213B"/><circle cx="138" cy="134" r="30" fill="#1B7F3B" stroke="#18213B" stroke-width="9"/><path d="M124 135l10 10 17-19" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>';
    ['#appicon', '#appicon2', '#appicon3'].forEach(s => { $(s).innerHTML = icon; });

    paintVoiceBtn(); render(); route();
    $('#caption').innerHTML = ICON.speaker + '<span>Voz: <b>«Toca tu foto»</b> (toca cualquier foto para oír la voz)</span>';
    try { window.speechSynthesis.getVoices(); } catch (e) {}
  }

  function route() {
    const v = location.hash === '#identidad' ? 'identidad' : 'prototipo';
    $('#v-prototipo').hidden = v !== 'prototipo';
    $('#v-identidad').hidden = v !== 'identidad';
    document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.view === v ? 'true' : 'false'));
  }

  start();
})();
