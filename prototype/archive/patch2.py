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


# ---------------------------------------------------------------- helpers (CLABE + kinds)
rep("  const maskTel = t => '•••• ' + String(t || '').slice(-4);",
    r'''  const maskTel = t => '•••• ' + String(t || '').slice(-4);
  const maskClabe = c => (c ? 'CLABE •••• ' + String(c).slice(-4) : '');
  const KINDS = { yo: 'Yo', persona: 'Otra persona', institucion: 'Institución o negocio' };
  /* CLABE: 18 digits, the last one is a check digit (weights 3, 7, 1) */
  function clabeDigit(b17) { const w = [3, 7, 1]; let sum = 0; for (let i = 0; i < 17; i++) sum += (parseInt(b17[i], 10) * w[i % 3]) % 10; return (10 - sum % 10) % 10; }
  function withCheck(b17) { return b17 + clabeDigit(b17); }
  function clabeOk(c) { return /^[0-9]{18}$/.test(c) && clabeDigit(c.slice(0, 17)) === parseInt(c[17], 10); }''')

# ---------------------------------------------------------------- model: receivers + destination per charge
rep("extra: { name: 'Cobro aparte', amount: 40 }, people: []\n    };",
    "extra: { name: 'Cobro aparte', amount: 40 }, people: [],\n      receivers: [{ id: 'r1', name: 'Mi cuenta', kind: 'yo', clabe: '', pending: true }],\n      dest: { main: 'r1', extra: 'r1', ledger: 'r1' }\n    };")
rep("base.extra = { name: 'Pago anual DIF', amount: 40 }; base.on.extra = true;",
    "base.extra = { name: 'Pago anual DIF', amount: 40 }; base.on.extra = true;\n      base.receivers = [{ id: 'r1', name: 'Cuenta de prueba del taller', kind: 'yo', clabe: withCheck('01218000123456789'), pending: false }, { id: 'r2', name: 'DIF (cuenta por confirmar)', kind: 'institucion', clabe: '', pending: true }];\n      base.dest = { main: 'r1', extra: 'r2', ledger: 'r1' };")
rep("base.name = 'Tanda de ejemplo'; base.on.turns = true;",
    "base.name = 'Tanda de ejemplo'; base.on.turns = true;\n      base.receivers = [{ id: 'r1', name: 'Cuenta de la organizadora', kind: 'persona', clabe: withCheck('01218000987654321'), pending: false }];")
rep("base.name = 'Tiendita de ejemplo'; base.on.periodic = false; base.on.ledger = true;",
    "base.name = 'Tiendita de ejemplo'; base.on.periodic = false; base.on.ledger = true;\n      base.receivers = [{ id: 'r1', name: 'Cuenta de la tienda', kind: 'yo', clabe: withCheck('01218000555666777'), pending: false }];")

# ---------------------------------------------------------------- charge() knows who receives
splice("  function charge(P, k) {", "  function viaText(", r'''  const recvOf = key => PRJ.receivers.find(r => r.id === PRJ.dest[key]) || PRJ.receivers[0] || null;
  function charge(P, k) {
    if (k === 'x') return { amount: PRJ.extra.amount, title: PRJ.extra.name, concept: PRJ.extra.name, h: null, speak: PRJ.extra.name, to: recvOf('extra') };
    if (k === 'f') { const r = P.pend; return { amount: r ? r.amount : 0, title: 'Abono', concept: 'Abono de ' + PRJ.name, h: null, speak: 'el abono', to: recvOf('ledger') }; }
    const pp = periods()[k] || { title: '', speak: '' };
    return { amount: PRJ.main.amount, title: pp.title, concept: PRJ.main.name + (PRJ.main.freq === 'once' ? '' : ' - ' + pp.title.toLowerCase()), h: HUES[k % 12], speak: pp.speak, to: recvOf('main') };
  }
  const toLine = c => (c.to ? '<div class="to">El dinero llega a <b>' + esc(c.to.name) + '</b>' + (c.to.pending ? ' <span class="pill">Cuenta por confirmar</span>' : '') + '</div>' : '');
  ''')

rep("<div class=\"big\">' + money(c.amount) + '</div></div>';\n    let body = '';",
    "<div class=\"big\">' + money(c.amount) + '</div>' + toLine(c) + '</div>';\n    let body = '';")
rep("'</dd><dt>Fecha</dt><dd>'",
    "'</dd>' + (c.to ? '<dt>Recibe</dt><dd>' + esc(c.to.name) + '</dd>' : '') + '<dt>Fecha</dt><dd>'")
rep("rows.push(['Personas', String(PRJ.people.length)],",
    "rows.push(['Recibe', PRJ.receivers.map(r => r.name).join(', ')]);\n    rows.push(['Personas', String(PRJ.people.length)],")

# ---------------------------------------------------------------- configuration: receivers UI
rep("  const EDIT = { draft: null, isNew: false, errors: [], confirmRemove: null };",
    "  const EDIT = { draft: null, isNew: false, errors: [], confirmRemove: null };\n  const REDIT = { draft: null, isNew: false, errors: [], confirmRemove: null };\n  let ridn = 10;")

rep("  function renderPeople() {", r'''  function renderReceivers() {
    const L = PRJ.receivers;
    $('#cfg-recv').innerHTML = L.map(r => {
      const rm = REDIT.confirmRemove === r.id;
      return '<div class="prow"><div class="ava bankico">' + ICON.cash + '</div><div class="info"><strong>' + esc(r.name || 'Sin nombre') + '</strong>' +
        '<span class="pill">' + KINDS[r.kind] + '</span>' +
        (r.pending ? '<span class="pill" style="border-color:var(--wait);color:var(--ink)">' + ICON.clock + 'Cuenta por confirmar</span>' : '<span class="pill ok">' + ICON.check + maskClabe(r.clabe) + '</span>') + '</div>' +
        '<div class="acts">' + (rm ? '<button class="btn small danger" data-ract="remove-yes" data-id="' + r.id + '">Sí, quitar</button><button class="btn small" data-ract="remove-no">No</button>' : '<button class="btn small" data-ract="edit" data-id="' + r.id + '">Editar</button>' + (L.length > 1 ? '<button class="btn small danger" data-ract="remove" data-id="' + r.id + '">Quitar</button>' : '')) + '</div></div>';
    }).join('') + (L.length === 1 ? '<p>Siempre debe quedar al menos una cuenta.</p>' : '');
  }
  function renderDest() {
    const on = PRJ.on, items = [];
    if (on.periodic) items.push(['main', 'Cobros con calendario (' + PRJ.main.name + ')']);
    if (on.extra) items.push(['extra', 'Cobro aparte (' + PRJ.extra.name + ')']);
    if (on.ledger) items.push(['ledger', 'Abonos del fiado']);
    $('#cfg-dest').innerHTML = items.length ? '<div class="field span"><span class="lbl">¿A qué cuenta llega cada cobro?</span></div>' + items.map(it =>
      fld('d-' + it[0], esc(it[1]), '<select id="d-' + it[0] + '" data-path="dest.' + it[0] + '">' + PRJ.receivers.map(r => '<option value="' + r.id + '"' + (PRJ.dest[it[0]] === r.id ? ' selected' : '') + '>' + esc(r.name) + '</option>').join('') + '</select>')).join('') : '';
  }
  function renderRecEditor() {
    const d = REDIT.draft, box = $('#cfg-recv-editor');
    $('#addrecv').hidden = !!d;
    if (!d) { box.innerHTML = ''; return; }
    let h = '<div class="editor" role="group" aria-label="Datos de la cuenta"><h3>' + (REDIT.isNew ? 'Nueva cuenta de cobro' : 'Editar cuenta de cobro') + '</h3><div class="form">';
    h += fld('rc-n', 'Nombre de quien recibe', '<input id="rc-n" type="text" data-rd="name" value="' + esc(d.name) + '" maxlength="50" autocomplete="off">', 'Como se lo dirías a quien paga. Por ejemplo: Taller de Rosa, DIF Centro, Tienda La Esquina.');
    h += fld('rc-k', 'Es', '<select id="rc-k" data-rd="kind">' + Object.keys(KINDS).map(k => '<option value="' + k + '"' + (d.kind === k ? ' selected' : '') + '>' + KINDS[k] + '</option>').join('') + '</select>');
    h += fld('rc-c', 'CLABE de la cuenta', '<input id="rc-c" type="tel" inputmode="numeric" data-rd="clabe" value="' + esc(d.clabe) + '" maxlength="18" autocomplete="off"' + (d.pending ? ' disabled' : '') + '>', '18 dígitos, sin espacios. Cópiala de la app o del estado de cuenta del banco.', 'span');
    h += '<div class="field span"><label class="check" for="rc-p"><input id="rc-p" type="checkbox" data-ract="pending"' + (d.pending ? ' checked' : '') + '><span>Todavía no tengo los datos de esta cuenta<small>Puedes dejarla anotada y completarla después. La app te avisará que está por confirmar.</small></span></label></div>';
    h += '</div>';
    if (REDIT.errors.length) h += '<div class="err" role="alert">Revisa esto antes de guardar:<ul>' + REDIT.errors.map(e => '<li>' + esc(e) + '</li>').join('') + '</ul></div>';
    h += '<div class="btnrow"><button class="btn primary" style="width:auto;min-height:3.75rem" data-ract="save">Guardar cuenta</button><button class="btn" style="width:auto;min-height:3.75rem" data-ract="cancel">Cancelar</button></div></div>';
    box.innerHTML = h;
  }
  function openRecEditor(r) {
    REDIT.draft = r ? JSON.parse(JSON.stringify(r)) : { id: '', name: '', kind: 'yo', clabe: '', pending: false };
    REDIT.isNew = !r; REDIT.errors = []; renderRecEditor();
    const f = $('#rc-n'); if (f) { f.focus(); f.scrollIntoView({ block: 'center' }); }
  }
  function validateRec(d) {
    const e = [];
    if (!d.name.trim()) e.push('Escribe el nombre de quien recibe.');
    if (!d.pending) {
      if (!/^[0-9]{18}$/.test(d.clabe)) e.push('La CLABE debe tener 18 dígitos, sin espacios.');
      else if (!clabeOk(d.clabe)) e.push('El último dígito de la CLABE no coincide. Revisa que esté bien copiada.');
    }
    return e;
  }
  function saveRec() {
    const d = REDIT.draft; REDIT.errors = validateRec(d);
    if (REDIT.errors.length) { renderRecEditor(); return; }
    d.name = d.name.trim(); if (d.pending) d.clabe = '';
    if (REDIT.isNew) { d.id = 'r' + (++ridn); PRJ.receivers.push(d); }
    else { const r = PRJ.receivers.find(x => x.id === d.id); if (r) Object.assign(r, { name: d.name, kind: d.kind, clabe: d.clabe, pending: d.pending }); }
    REDIT.draft = null; REDIT.errors = []; renderRecEditor(); renderReceivers(); renderDest(); afterChange();
  }
  function onRecClick(b) {
    const a = b.dataset.ract, d = REDIT.draft;
    if (a === 'edit') openRecEditor(PRJ.receivers.find(r => r.id === b.dataset.id));
    else if (a === 'remove') { REDIT.confirmRemove = b.dataset.id; renderReceivers(); }
    else if (a === 'remove-no') { REDIT.confirmRemove = null; renderReceivers(); }
    else if (a === 'remove-yes') {
      if (PRJ.receivers.length > 1) {
        PRJ.receivers = PRJ.receivers.filter(r => r.id !== b.dataset.id);
        ['main', 'extra', 'ledger'].forEach(k => { if (PRJ.dest[k] === b.dataset.id) PRJ.dest[k] = PRJ.receivers[0].id; });
      }
      REDIT.confirmRemove = null; renderReceivers(); renderDest(); afterChange();
    }
    else if (a === 'cancel') { REDIT.draft = null; REDIT.errors = []; renderRecEditor(); }
    else if (a === 'save') saveRec();
    else if (a === 'pending') { d.pending = b.checked; renderRecEditor(); const c = $('#rc-p'); if (c) c.focus(); }
  }
  function renderPeople() {''')

# ---------------------------------------------------------------- events
rep("  function onCfgInput(e) {\n    const t = e.target;\n    if (t.dataset.d) {",
    "  function onCfgInput(e) {\n    const t = e.target;\n    if (t.dataset.rd) {\n      let v = t.value; if (t.dataset.rd === 'clabe') { v = v.replace(/[^0-9]/g, '').slice(0, 18); if (v !== t.value) t.value = v; }\n      setPath(REDIT.draft, t.dataset.rd, v); return;\n    }\n    if (t.dataset.d) {")
rep("const id = t.id; renderFeats(); renderForm();", "const id = t.id; renderFeats(); renderForm(); renderDest();")
rep("    afterChange();\n  }\n  function onCfgClick(e) {",
    "    if (e.type === 'change' && /name$/.test(p)) renderDest();\n    afterChange();\n  }\n  function onCfgClick(e) {")
rep("    if (e.target.closest('#addperson')) { openEditor(null); return; }",
    "    if (e.target.closest('#addperson')) { openEditor(null); return; }\n    if (e.target.closest('#addrecv')) { openRecEditor(null); return; }\n    const rb = e.target.closest('[data-ract]'); if (rb) { onRecClick(rb); return; }")
rep("S.view = 'who'; S.person = null; EDIT.draft = null; EDIT.confirmRemove = null; renderAll();",
    "S.view = 'who'; S.person = null; EDIT.draft = null; EDIT.confirmRemove = null; REDIT.draft = null; REDIT.confirmRemove = null; renderAll();")
rep("function renderAll() { renderFeats(); renderPresets(); renderForm(); renderPreview(); renderPeople(); renderEditor(); render(); }",
    "function renderAll() { renderFeats(); renderPresets(); renderForm(); renderPreview(); renderReceivers(); renderRecEditor(); renderDest(); renderPeople(); renderEditor(); render(); }")

# ---------------------------------------------------------------- HTML + CSS
rep('''  <section aria-labelledby="h-personas">
    <h2 id="h-personas">3. ¿A quién le cobras?</h2>''',
    '''  <section aria-labelledby="h-recibe">
    <h2 id="h-recibe">3. ¿Quién recibe el dinero?</h2>
    <p>Es la cuenta bancaria a la que llega cada pago hecho por CoDi. Puedes tener varias, por ejemplo una para el taller y otra para el DIF, y elegir a cuál va cada cobro. Los pagos en efectivo quedan registrados, pero el dinero lo guardas tú.</p>
    <div class="plist" id="cfg-recv"></div>
    <div id="cfg-recv-editor"></div>
    <div><button class="btn small" id="addrecv">Agregar cuenta</button></div>
    <div class="form" id="cfg-dest"></div>
  </section>

  <section aria-labelledby="h-personas">
    <h2 id="h-personas">4. ¿A quién le cobras?</h2>''')
rep(".hint { font-size: .92rem; color: var(--ink-soft); min-height: 1.2em; }",
    ".hint { font-size: .92rem; color: var(--ink-soft); min-height: 1.2em; }\n.to { font-size: 1rem; color: var(--ink-soft); margin-top: 6px; }\n.to b { color: var(--ink); }\n.bankico { display: grid; place-items: center; background: var(--bg); }\n.prow .ava.bankico svg { width: 1.9rem; height: 1.9rem; }")

open(path, 'w', encoding='utf-8').write(s)
print('patched OK')
