"""Assemble the simple-mode prototype from the v5 backup plus the new parts. Every replacement asserts it matched exactly once."""
import io, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))


def rd(p):
    with io.open(p, encoding='utf-8') as f:
        return f.read()


old = rd(os.path.join(HERE, 'base', 'paga-con-tu-foto.v5.bak.html')).split('\n')  # 0-based; old line N is old[N-1]


def seg(a, b):
    """old lines a..b inclusive (1-based)"""
    return '\n'.join(old[a - 1:b])


def rep(text, a, b, count=1):
    assert text.count(a) == count, ('expected %d match(es), found %d for: %s' % (count, text.count(a), a[:70]))
    return text.replace(a, b)


# sanity: anchors in the old file
assert old[4].startswith('<style>'), old[4][:30]
assert old[6].startswith(':root {'), old[6][:30]
assert old[291].startswith('</style>'), old[291][:30]
assert old[305].startswith('<!-- ============ PROTOTIPO'), old[305][:40]
assert old[315].lstrip().startswith('<div id="pane-personas"'), old[315][:40]
assert old[351].strip() == '</div>' and old[350].lstrip().startswith('<button class="btn primary" data-goto="cobrar"'), (old[350][:60], old[351][:20])
assert old[383].startswith('<!-- ============ IDENTIDAD'), old[383][:40]
assert old[456].startswith('</main>'), old[456][:20]
assert old[677].lstrip().startswith('/* ================= voice + caption'), old[677][:50]
assert old[943].strip() == '}' and old[945].lstrip().startswith('/* ================= CONFIGURATION'), (old[943], old[945][:40])
assert old[1200].lstrip().startswith('/* ================= wiring'), old[1200][:40]
assert old[1237].startswith('  start();'), old[1237]

parts = {n: rd(os.path.join(HERE, 'parts', n)) for n in ('tokens.css', 'simple.css', 'phone_a.html', 'phone_b.html', 'identity.html', 'views.js', 'wiring.js', 'v7.js', 'v7.css', 'report.html')}

# ---- head + CSS
css_mid = seg(40, 262)  # old layout/components, kept for the advanced layer and the identity page
css_mid = rep(css_mid, 'font-size: 1.25rem; line-height: 1.35;', 'font-size: 1.25rem; line-height: 1.5;')
css_mid = rep(css_mid, '.btn[disabled] { opacity: .5; cursor: not-allowed; }', '.btn[disabled] { border-style: dashed; color: var(--ink-soft); background: transparent; cursor: not-allowed; }')
css_mid = rep(css_mid, '.iconbtn[aria-pressed="false"] { opacity: .55; }\n', '')
css_mid = rep(css_mid, 'letter-spacing: 0; opacity: .95; }', 'letter-spacing: 0; }')
css_mid = rep(css_mid, '.feat.dis { opacity: .55; cursor: not-allowed; }', '.feat.dis { border-style: dashed; color: var(--ink-soft); cursor: not-allowed; }')
css_mid = rep(css_mid, '.states { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }', '.states { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; }')
head = seg(1, 5) + '\n' + parts['tokens.css'] + '\n'
simple_css = parts['simple.css'] + '\nh1.q:focus { outline: none; }\n'
simple_css = rep(simple_css, '.steps .sep { flex: 1; height: 4px; min-width: 6px; border-radius: 2px; background: var(--edge); }',
                 '.steps li.sep { flex: 1; width: auto; height: 4px; min-width: 6px; border: 0; border-radius: 2px; background: var(--edge); box-shadow: none; }')
css = head + css_mid + '\n' + simple_css + parts['v7.css'] + seg(292, 293) + '\n'

# ---- page header (old 294..304) + prototype block
page_header = seg(294, 304)
personas_ajustes = seg(316, 352)
personas_ajustes = rep(personas_ajustes, '<button class="btn primary" data-goto="cobrar" style="justify-content:center">Ver cómo queda en Cobrar</button>',
                       '<button class="btn primary" data-goto="cobrar" style="justify-content:center">Volver al modo sencillo</button>')
personas_ajustes = rep(personas_ajustes, '<p>Agrega a cada persona con su foto y su permiso. Sin permiso, la app no muestra la foto: usa un dibujo con su inicial.</p>',
                       '<p>Agrega a cada persona con su foto y su permiso. Sin permiso, la app no muestra la foto: usa un dibujo con su inicial.</p>')
body = page_header + '\n' + '<main>\n' + parts['phone_a.html'] + personas_ajustes + '\n' + parts['report.html'] + parts['phone_b.html'] + parts['identity.html'] + '</main>\n\n'

# ---- JS
js_top = seg(459, 677)  # <script> + helpers, icons, faces, model, records (kept)
js_top = rep(js_top, "    info: I('<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 11v5.5M12 7.6v.2\"/>')\n  };",
             "    info: I('<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 11v5.5M12 7.6v.2\"/>'),\n"
             "    ring: I('<circle cx=\"12\" cy=\"12\" r=\"8.5\"/>'),\n"
             "    alert: I('<path d=\"M12 3.5l9.5 16.5h-19z\"/><path d=\"M12 10v4.5M12 17.3v.2\"/>'),\n"
             "    save: I('<path d=\"M5 4.5h11l3 3v12H5z\"/><path d=\"M8 4.5v5h7v-5M8 19.5v-6h8v6\"/>'),\n"
             "    eye: I('<path d=\"M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>'),\n"
             "    plus: I('<path d=\"M12 5v14M5 12h14\"/>'),\n"
             "    x: I('<path d=\"M6 6l12 12M18 6L6 18\"/>'),\n"
             "    send: I('<path d=\"M4 12l16-8-6 16-3-7z\"/>')\n  };")
js_top = rep(js_top, 'amount: r ? r.amount : 0, title: \'Abono\'', 'amount: r ? r.amount : (S.flow === \'abono\' ? amtVal() : 0), title: \'Abono\'')
js_cfg = seg(945, 1200)
js_cfg = rep(js_cfg, "function afterChange() { S.view = 'who'; renderPreview(); render(); }",
             "function afterChange() { S.view = 'home'; S.hist = []; S.flow = null; S.saved = null; S.page = 0; S.person = null; renderPreview(); render(); }")
js_cfg = rep(js_cfg, "PRJ = preset(pr.dataset.preset); S.view = 'who'; S.person = null; EDIT.draft = null;",
             "PRJ = preset(pr.dataset.preset); S.view = 'home'; S.hist = []; S.flow = null; S.saved = null; S.person = null; EDIT.draft = null;")
js_cfg = rep(js_cfg, "renderAll(); say('Toca tu foto'); return; }", "renderAll(); return; }")
tail = seg(1238, 1241)
js_cfg = rep(js_cfg, "const dis = f.k === 'turns' && !PRJ.on.periodic", "const dis = (f.k === 'turns' || f.k === 'places') && !PRJ.on.periodic")
js_cfg = rep(js_cfg, "if (p === 'on.periodic' && !t.checked) PRJ.on.turns = false;", "if (p === 'on.periodic' && !t.checked) { PRJ.on.turns = false; PRJ.on.places = false; }")

html = css + body + js_top + '\n' + parts['views.js'] + '\n' + js_cfg + '\n' + parts['v7.js'] + '\n' + parts['wiring.js'] + tail
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'paga-con-tu-foto.html')  # optional argument: write elsewhere to compare
with io.open(out, 'w', encoding='utf-8', newline='\n') as f:
    f.write(html)
print('built', len(html), 'bytes,', html.count('\n') + 1, 'lines')
