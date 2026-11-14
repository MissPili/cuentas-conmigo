import sys

path = sys.argv[1]
s = open(path, encoding='utf-8').read()


def splice(start, end, new):
    global s
    assert s.count(start) == 1, ('start', start, s.count(start))
    i = s.index(start)
    j = s.index(end, i + len(start))
    s = s[:i] + new + s[j:]


def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('rep', old, s.count(old))
    s = s.replace(old, new)


# ============================================================ 1. tokens: control edges + dark month lightness
rep("  --line: #CBD2E3;", "  --line: #CBD2E3;\n  --edge: #7A85A3;")
rep("--line: #2E3858;", "--line: #2E3858; --edge: #6F7BA0;", count=2)
rep("--ml: 40%;", "--ml: 36%;", count=2)

# ============================================================ 2. Dynamic Type + clip instead of hidden so bars can stick
rep(".phone { width: 100%; max-width: 420px; min-height: 780px; background: var(--surface); border: 2px solid var(--line); border-radius: 32px; overflow: hidden; display: flex; flex-direction: column; }",
    ".phone { width: 100%; max-width: 420px; min-height: 780px; background: var(--surface); border: 2px solid var(--line); border-radius: 32px; overflow: clip; display: flex; flex-direction: column; }")

# ============================================================ 3. legend: "falta" is the month's own colour, not one blue
rep('<i class="dot" style="background:hsl(225 62% var(--ml))"></i>', '<i class="dot months"></i>', count=2)
rep(".state.s-due { background: hsl(225 62% var(--ml)); color: #fff; }",
    ".state.s-due { background: linear-gradient(90deg, hsl(225 62% var(--ml)), hsl(285 62% var(--ml)), hsl(195 62% var(--ml)), hsl(12 62% var(--ml))); color: #fff; }")

# ============================================================ 4. copy: an action keeps its name through the flow
rep('">Se lleva fiado</button>', '">Anotar fiado</button>')
rep("(a.mode === 'cargo' ? 'Anotar ' : 'Cobrar ')", "(a.mode === 'cargo' ? 'Anotar fiado ' : 'Cobrar abono de ')")

# ============================================================ 5. back button leaves the content: standard Back lives in the navigation bar
rep("""'<button class="btn back" data-act="back">' + ICON.back + 'Otra persona</button><div class="who">""", """'<div class="who">""")
rep("""const head = '<button class="btn back" data-act="back">' + ICON.back + 'Volver</button>' +\n""", """const head = '' +\n""")
rep("""return '<button class="btn back" data-act="back">' + ICON.back + 'Volver</button><div class="who">""", """return '<div class="who">""")

# ============================================================ 6. empty-state links point to the new tabs
rep("""data-goto="configurar" style="justify-content:center">Ir a Configurar</button>""", """data-goto="ajustes" style="justify-content:center">Ir a Ajustes</button>""")
rep("""data-goto="configurar" style="justify-content:center">Agregar personas</button>""", """data-goto="personas" style="justify-content:center">Agregar personas</button>""")
rep("""data-goto="configurar" style="width:100%;justify-content:center">Cambiar la configuración</button>""", """data-goto="ajustes" style="width:100%;justify-content:center">Cambiar los ajustes</button>""")
rep("""Todo lo que ves en el teléfono sale de la pestaña Configurar: tipo de cobro, montos, fechas, personas, fotos y familiares.""",
    """Todo lo que ves en el teléfono sale de las pestañas Personas y Ajustes: funciones, montos, fechas, cuentas, fotos y familiares.""")

# ============================================================ 7. undo for cash payments (never for CoDi money that already moved)
rep("  function markPaid(P, k, via, payer) {\n    if (k === 'f') {",
    "  function markPaid(P, k, via, payer) {\n    S.undo = via === 'cash' ? { pid: P.id, k: k, prev: JSON.parse(JSON.stringify(getRec(P, k) || null)), bal: P.bal, ledger: P.ledger.slice(), last: P.last, pend: P.pend ? JSON.parse(JSON.stringify(P.pend)) : null } : null;\n    if (k === 'f') {")
rep("const S = { view: 'who', person: null, period: 0, voice: true, amt: { mode: 'cargo', buf: '', note: '' } };",
    "const S = { view: 'who', tab: 'cobrar', person: null, period: 0, voice: true, undo: null, amt: { mode: 'cargo', buf: '', note: '' } };")
rep("    const folio = 'EJ-'",
    "    const undoBtn = S.undo && S.undo.pid === P.id && S.undo.k === k && r.via === 'cash' ? '<button class=\"btn quiet\" data-act=\"undo\">Me equivoqué, deshacer</button>' : '';\n    const folio = 'EJ-'")
rep("""'<button class="btn primary" data-act="next">Siguiente persona</button>';""",
    """'<button class="btn primary" data-act="next">Siguiente persona</button>' + undoBtn;""")
rep("    else if (a === 'payout') { PRJ.payout[cur()] = true; render(); say('Entrega registrada'); }",
    "    else if (a === 'payout') { PRJ.payout[cur()] = true; render(); say('Entrega registrada'); }\n"
    "    else if (a === 'undo') {\n"
    "      const u = S.undo;\n"
    "      if (u && P && u.pid === P.id) {\n"
    "        if (S.period === 'f') { P.bal = u.bal; P.ledger = u.ledger; P.last = u.last; P.pend = u.pend; } else putRec(P, S.period, u.prev);\n"
    "        S.undo = null; go('pay', 'Se deshizo el pago');\n"
    "      }\n"
    "    }")

# ============================================================ 8. move focus to the new screen's heading (VoiceOver / keyboard)
rep("function go(view, text) { S.view = view; render(); if (text) say(text); }",
    "function go(view, text) {\n    S.view = view; render();\n    const h = $('#screen h1'); if (h) { h.tabIndex = -1; try { h.focus({ preventScroll: true }); } catch (e) { /* optional */ } }\n    if (text) say(text);\n  }")

# ============================================================ 9. navigation bar title + back
rep("  function paintVoiceBtn() {", r'''  function paintNav() {
    const P = byId(S.person); let title = PRJ.name || 'Mi proyecto';
    if (S.tab === 'personas') title = 'Personas';
    else if (S.tab === 'ajustes') title = 'Ajustes';
    else if (S.view === 'what' && P) title = P.n;
    else if (S.view === 'amount') title = 'Monto';
    else if (S.view === 'pay') title = 'Cobro';
    else if (S.view === 'done') title = 'Comprobante';
    $('#navtitle').textContent = title;
    const showBack = S.tab === 'cobrar' && S.view !== 'who', b = $('#navback');
    b.style.visibility = showBack ? 'visible' : 'hidden'; b.tabIndex = showBack ? 0 : -1; b.setAttribute('aria-hidden', showBack ? 'false' : 'true');
  }
  function paintVoiceBtn() {''')
rep("    $('#grouptitle').textContent = PRJ.name || 'Mi proyecto';", "    paintNav();")

# ============================================================ 10. routing: page tabs (Prototipo / Identidad) + phone tabs (Cobrar / Personas / Ajustes)
splice("  function route() {", "  function start() {", r'''  function route() {
    const h = location.hash.replace('#', ''), tabs = { cobrar: 1, personas: 1, ajustes: 1 };
    if (h === 'configurar') S.tab = 'ajustes'; else if (tabs[h]) S.tab = h;
    const v = h === 'identidad' ? 'identidad' : 'prototipo';
    $('#v-prototipo').hidden = v !== 'prototipo'; $('#v-identidad').hidden = v !== 'identidad';
    ['cobrar', 'personas', 'ajustes'].forEach(n => { $('#pane-' + n).hidden = n !== S.tab; });
    $('#caption').hidden = S.tab !== 'cobrar';
    document.querySelectorAll('#tabbar [role="tab"]').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === S.tab ? 'true' : 'false'));
    document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.view === v ? 'true' : 'false'));
    if (v === 'prototipo') render();
  }
''')
rep("    $('#screen').addEventListener('click', onAct);",
    "    document.documentElement.lang = 'es-MX';\n    $('#screen').addEventListener('click', onAct);\n    $('#navbar').addEventListener('click', onAct);\n    $('#tabbar').addEventListener('click', function (e) { const b = e.target.closest('[data-tab]'); if (b) location.hash = b.dataset.tab; });")
rep("const cfgv = $('#v-configurar');", "const cfgv = $('#phone');")

# ============================================================ 11. markup: config moves inside the phone, behind a tab bar
rep('    <button role="tab" aria-selected="false" data-view="configurar">Configurar</button>\n', '')
ci = s.index('<!-- ============ CONFIGURAR ============ -->')
cj = s.index('<!-- ============ IDENTIDAD ============ -->')
cfg = s[ci:cj]
a = cfg.index('<div class="notice">')
b = cfg.index('<section aria-labelledby="h-personas">')
c = cfg.index('</section>', b) + len('</section>')
part_ajustes = cfg[a:b].rstrip() + '\n'
part_personas = cfg[b:c].replace('<h2 id="h-personas">4. ¿A quién le cobras?</h2>', '<h2 id="h-personas">¿A quién le cobras?</h2>')
s = s[:ci] + s[cj:]

BACK = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>'
ICO_COBRAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" fill="currentColor" d="M6.2 5.5h11.6A3.2 3.2 0 0 1 21 8.7v6.6a3.2 3.2 0 0 1-3.2 3.2H6.2A3.2 3.2 0 0 1 3 15.3V8.7a3.2 3.2 0 0 1 3.2-3.2zM16.5 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>'
ICO_PERSONAS = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.6" fill="currentColor"/><path d="M2.5 19.5c.5-4 3.2-6 6.5-6s6 2 6.5 6z" fill="currentColor"/><circle cx="17.5" cy="9" r="2.8" fill="currentColor"/><path d="M16.4 13.3c3 .2 4.8 2.1 5.1 5.2h-4.2c-.1-2-.4-3.6-.9-5.2z" fill="currentColor"/></svg>'
ICO_AJUSTES = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/><circle cx="9" cy="7" r="2.8" fill="currentColor"/><circle cx="15.5" cy="12" r="2.8" fill="currentColor"/><circle cx="8" cy="17" r="2.8" fill="currentColor"/></svg>'

phone = (
    '  <div class="phone" id="phone" aria-label="Pantalla de la app">\n'
    '    <header class="navbar" id="navbar">\n'
    '      <button class="navback" id="navback" data-act="back" aria-label="Atrás">' + BACK + '<span>Atrás</span></button>\n'
    '      <div class="navtitle" id="navtitle"></div>\n'
    '      <button class="iconbtn" id="voicebtn" aria-pressed="true" aria-label="Voz activada. Tocar para silenciar"></button>\n'
    '    </header>\n'
    '    <div class="panes">\n'
    '      <div id="pane-cobrar" class="pane cobrar"><div id="screen"></div></div>\n'
    '      <div id="pane-personas" class="pane sheet" hidden>\n' + part_personas + '\n      </div>\n'
    '      <div id="pane-ajustes" class="pane sheet" hidden>\n' + part_ajustes +
    '        <button class="btn primary" data-goto="cobrar" style="justify-content:center">Ver cómo queda en Cobrar</button>\n'
    '      </div>\n'
    '    </div>\n'
    '    <div class="caption" id="caption" aria-live="polite"></div>\n'
    '    <nav class="tabbar" id="tabbar" role="tablist" aria-label="Secciones">\n'
    '      <button role="tab" data-tab="cobrar" aria-selected="true">' + ICO_COBRAR + '<span>Cobrar</span></button>\n'
    '      <button role="tab" data-tab="personas" aria-selected="false">' + ICO_PERSONAS + '<span>Personas</span></button>\n'
    '      <button role="tab" data-tab="ajustes" aria-selected="false">' + ICO_AJUSTES + '<span>Ajustes</span></button>\n'
    '    </nav>\n'
    '  </div>\n\n'
)
splice('  <div class="phone" id="phone"', '  <aside class="panel">', phone)

# ============================================================ 12. identity sheet: record the platform decisions
rep("  <section>\n    <h2>Por decidir</h2>",
    """  <section>
    <h2>Decisiones de plataforma (iPhone)</h2>
    <ul class="plain">
      <li><b>Navegación.</b> Barra de pestañas con tres secciones de una palabra (Cobrar, Personas, Ajustes), siempre visible. Dentro de Cobrar, el botón Atrás está arriba a la izquierda, donde lo espera quien usa iPhone.</li>
      <li><b>Texto.</b> Sigue el tamaño de letra del iPhone (Dynamic Type) y ningún texto secundario baja de 16 px. Los mosaicos se reacomodan en menos columnas cuando la letra crece.</li>
      <li><b>Contraste.</b> Todo el texto cumple 4.5:1 en claro y en oscuro, y los bordes de campos y botones cumplen 3:1. Los 12 colores de mes llevan texto blanco con 6.6:1 como mínimo en claro y 5.0:1 en oscuro.</li>
      <li><b>Toques.</b> Todo lo tocable mide al menos 44 pt y tiene 12 pt de separación. Cada botón se hunde un poco al presionarlo.</li>
      <li><b>Errores.</b> Los pagos en efectivo se pueden deshacer. Los pagos por CoDi no, porque el dinero ya se movió.</li>
    </ul>
  </section>

  <section>
    <h2>Por decidir</h2>""")

# ============================================================ 13. css: bars, press states, minimum sizes, spacing, Dynamic Type
rep("</style>", r'''
/* ---- Apple HIG pass: navigation bar, tab bar, control edges, sizes, press states ---- */
@supports (font: -apple-system-body) { html { font: -apple-system-body; } }
body::before { content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 10; background: var(--surface); }
.navbar { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5; display: grid; grid-template-columns: 1fr minmax(0, auto) 1fr; align-items: center; gap: 8px; padding: 6px 12px; min-height: 3.5rem; background: var(--surface); border-bottom: 1px solid var(--line); }
.navback { justify-self: start; min-height: 2.75rem; min-width: 2.75rem; display: inline-flex; align-items: center; gap: 2px; border: 0; background: none; padding: 0 8px 0 0; font-size: 1.1rem; font-weight: 700; }
.navback .ico { width: 1.7rem; height: 1.7rem; }
.navtitle { max-width: 11rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; font-weight: 700; font-size: 1.1rem; }
.navbar .iconbtn { justify-self: end; }
.panes { flex: 1; display: flex; flex-direction: column; }
.pane.cobrar { flex: 1; display: flex; flex-direction: column; }
.pane.sheet { max-width: none; margin: 0; padding: 12px 16px 24px; align-content: start; }
.tabbar { position: sticky; bottom: 0; z-index: 5; display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 6px 8px calc(6px + env(safe-area-inset-bottom, 0px)); background: var(--surface); border-top: 1px solid var(--line); }
.tabbar button { min-height: 3.5rem; border: 0; border-radius: 14px; background: none; display: grid; justify-items: center; align-content: center; gap: 2px; padding: 4px; font-size: 1rem; font-weight: 700; color: var(--ink-soft); }
.tabbar button svg { width: 1.7rem; height: 1.7rem; }
.tabbar button[aria-selected="true"] { color: var(--ink); background: var(--bg); box-shadow: inset 0 3px 0 var(--ink); }
.q:focus { outline: none; }
.dot.months { background: conic-gradient(hsl(225 62% var(--ml)), hsl(12 62% var(--ml)), hsl(285 62% var(--ml)), hsl(195 62% var(--ml)), hsl(320 62% var(--ml)), hsl(225 62% var(--ml))); }
/* control boundaries need 3:1 (decorative dividers keep the soft line) */
input[type="text"], input[type="tel"], input[type="number"], input[type="date"], select { border-color: var(--edge); }
.btn.quiet, .iconbtn, .feat, .chipx, .choice button { border-color: var(--edge); }
/* secondary text never below 16px; 12px between neighbouring controls; 44pt minimum targets */
.field .hint, .hint, .label, .qrnote, .check small, .feat span span, .tile small, .pill, .turnflag, .sum, .ledger { font-size: 1rem; }
.tiles, .keys, .quick, .chips, .presets, .btnrow { gap: 12px; }
.tiles { grid-template-columns: repeat(auto-fit, minmax(5.75rem, 1fr)); }
.xbtn { min-width: 2.75rem; min-height: 2.75rem; }
/* every custom button shows a press state */
.btn, .tile, .person, .annual, .iconbtn, .tabbar button, .navback, .feat, .filebtn { transition: transform .08s ease, filter .08s ease; }
.btn:active, .tile:active, .person:active, .annual:active, .iconbtn:active, .tabbar button:active, .navback:active, .feat:active, .filebtn:active { transform: scale(.97); filter: brightness(.9); }
@media (prefers-reduced-motion: reduce) { .btn, .tile, .person, .annual, .iconbtn, .tabbar button, .navback, .feat, .filebtn { transition: none; } .btn:active, .tile:active, .person:active, .annual:active, .iconbtn:active, .tabbar button:active, .navback:active, .feat:active, .filebtn:active { transform: none; } }
</style>''')

open(path, 'w', encoding='utf-8').write(s)
print('patched OK')
