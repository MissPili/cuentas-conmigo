"""Build the self-contained brochure: embeds screenshots from the prototype test run as data: URIs.

Usage (from the repo root):
  cd prototype/tests && node render5.js ../paga-con-tu-foto.html shots && node themeshots.js "$(pwd)/out/index.html" "$(pwd)/out"
  python docs/brochure/build.py
"""
import base64, os, re, struct

HERE = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(HERE, '..', '..', 'prototype', 'tests', 'out')
IMAGES = {  # placeholder name -> screenshot file
    'who': 'who.png', 'home': 'home.png', 'amount': 'tienda-amount-cargo.png',
    'qr': 'pay-qr.png', 'hc': 'hc-who.png',
}


def img_attrs(name):
    path = os.path.join(SHOTS, IMAGES[name])
    if not os.path.exists(path):
        raise SystemExit('missing screenshot %s: run the commands in this file docstring first' % path)
    with open(path, 'rb') as f:
        data = f.read()
    w, h = struct.unpack('>II', data[16:24])  # PNG IHDR width and height
    return 'src="data:image/png;base64,%s" width="%d" height="%d"' % (base64.b64encode(data).decode('ascii'), w, h)


with open(os.path.join(HERE, 'brochure.template.html'), encoding='utf-8') as f:
    html = f.read()
html = re.sub(r'\{\{IMG:([a-z]+)\}\}', lambda m: img_attrs(m.group(1)), html)
assert '{{' not in html
with open(os.path.join(HERE, 'brochure.html'), 'w', encoding='utf-8', newline='\n') as f:
    f.write(html)
print('built brochure.html', len(html), 'bytes')
