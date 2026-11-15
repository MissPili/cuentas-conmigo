  /* ================= wiring ================= */
  function route() {
    const h = location.hash.replace('#', '');
    if (h === 'configurar') S.tab = 'ajustes'; else if (h === 'cobrar' || h === 'personas' || h === 'ajustes' || h === 'reporte') S.tab = h; else if (h === 'inscripcion') S.tab = 'cobrar';
    const v = h === 'identidad' ? 'identidad' : 'prototipo', adv = S.tab !== 'cobrar';
    /* the registration page is another screen of the same phone: the person who registers never sees the collector's screens */
    if (h === 'inscripcion') { if (!RG_VIEWS[S.view]) { rgReset(); S.hist = []; S.view = 'r1'; S.page = 0; } }
    else if (RG_VIEWS[S.view]) { S.hist = []; S.view = 'home'; S.page = 0; }
    const regmode = h === 'inscripcion', sw = $('#regswitch');
    if (sw) { sw.dataset.goto = regmode ? 'cobrar' : 'inscripcion'; sw.textContent = regmode ? 'Volver a quien cobra' : 'Ver como quien se inscribe'; }
    const rt = $('#regcardtxt'); if (rt) rt.textContent = regmode ? 'Esta es la pantalla de quien se inscribe: no ve cobros ni personas.' : 'Quien se inscribe ve otra pantalla, sin cobros. Mírala aquí.';
    $('#v-prototipo').hidden = v !== 'prototipo'; $('#v-identidad').hidden = v !== 'identidad';
    $('#pane-cobrar').hidden = adv; $('#advwrap').hidden = !adv;
    $('#pane-personas').hidden = S.tab !== 'personas'; $('#pane-ajustes').hidden = S.tab !== 'ajustes'; $('#pane-reporte').hidden = S.tab !== 'reporte';
    if (S.tab === 'reporte') renderReport();
    document.querySelectorAll('#advtabs [role="tab"]').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === S.tab ? 'true' : 'false'));
    document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.view === v ? 'true' : 'false'));
    if (v === 'prototipo') { const wasAdv = !!S.wasAdv; S.wasAdv = adv; if (regmode !== !!S.regmode || (wasAdv && !adv)) { S.regmode = regmode; paint(true); } else render(); }  /* moving between the two phone screens moves focus to the new title */
  }
  function start() {
    PRJ = preset('taller'); rgReset();
    document.documentElement.lang = 'es-MX';
    loadSet(); applySet();
    $('#screen').addEventListener('click', onAct);
    $('#bar').addEventListener('click', onAct);
    $('#screen').addEventListener('input', onInput);
    $('#screen').addEventListener('keydown', onKey);
    $('#advtabs').addEventListener('click', function (e) { const b = e.target.closest('[data-tab]'); if (b) location.hash = b.dataset.tab; });
    $('#v-prototipo').addEventListener('click', function (e) { const g = e.target.closest('[data-goto]'); if (g) location.hash = g.dataset.goto; });
    $('#simfail').addEventListener('change', function (e) { S.fail = e.target.checked; });
    /* configuration (advanced layer) handlers live on the advanced wrapper only */
    const adv = $('#advwrap');
    adv.addEventListener('input', onCfgInput);
    adv.addEventListener('change', function (e) { if (e.target.id === 'e-photo') onCfgFile(e); else onCfgInput(e); });
    adv.addEventListener('click', function (e) { onCfgClick(e); onRepClick(e); });
    document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', function () { location.hash = b.dataset.view; }));
    window.addEventListener('hashchange', route);

    $('#id-check').innerHTML = ICON.check; $('#id-clock').innerHTML = ICON.clock; $('#id-ring').innerHTML = ICON.ring; $('#nt-ico').innerHTML = ICON.info;
    $('#legend').innerHTML = stt('paid', 'Ya pagó') + stt('wait', 'Esperando pago') + stt('due', 'Falta pagar');
    $('#monthswatches').innerHTML = MON3.map((m, k) => '<div class="tile" style="--h:' + HUES[k] + '">' + m + '</div>').join('');
    const icon = '<rect width="180" height="180" rx="40" fill="#4E1A6E"/><circle cx="84" cy="82" r="56" fill="#fff"/><circle cx="84" cy="74" r="20" fill="#4E1A6E"/><path d="M42 124c8-24 24-32 42-32s34 8 42 32c-12 12-26 16-42 16s-30-4-42-16z" fill="#4E1A6E"/><circle cx="138" cy="134" r="30" fill="#EDB438" stroke="#4E1A6E" stroke-width="9"/><path d="M124 135l10 10 17-19" fill="none" stroke="#2A1D00" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>';
    ['#appicon', '#appicon2', '#appicon3'].forEach(s => { $(s).innerHTML = icon; });

    renderAll(); route();
    try { window.speechSynthesis.getVoices(); } catch (e) { /* optional */ }
  }
