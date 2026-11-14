import colorsys


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def lum(rgb):
    def f(c):
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = [f(c) for c in rgb]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def cr(a, b):
    a = hexrgb(a) if isinstance(a, str) else a
    b = hexrgb(b) if isinstance(b, str) else b
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def hsl(h, s, l):
    return colorsys.hls_to_rgb(h / 360, l / 100, s / 100)


def show(label, fg, bg, need=7.0):
    r = cr(fg, bg)
    print(f"{'OK  ' if r >= need else 'FAIL'} {r:5.2f}:1  {label}")


print('=== LIGHT, target 7:1 for important text ===')
for soft in ('#4B5675', '#3B4660', '#334058'):
    show(f'ink-soft {soft} on white', soft, '#FFFFFF')
    show(f'ink-soft {soft} on bg #F4F6FB', soft, '#F4F6FB')
for g in ('#1B7F3B', '#146B2E', '#0F5F28', '#0B5A24'):
    show(f'white on paid {g}', '#FFFFFF', g)
show('on-wait #2A1D00 on #F2B01E', '#2A1D00', '#F2B01E')
show('white on annual #2E3550', '#FFFFFF', '#2E3550')
show('danger #B3261E on white', '#B3261E', '#FFFFFF')
show('danger #9C1C15 on white', '#9C1C15', '#FFFFFF')
print('luminance gap paid vs wait (distinguishable without hue):')
for g in ('#0F5F28', '#146B2E'):
    print('  ', g, 'vs #F2B01E:', f'{cr(g, "#F2B01E"):.2f}:1')
HUES = [225, 355, 285, 195, 320, 255, 12, 210, 300, 340, 240, 270]
for L in (30, 28, 26):
    mn = min(cr((1, 1, 1), hsl(h, 62, L)) for h in HUES)
    print(f'month tile white text L={L}: worst {mn:.2f}:1')
print('=== DARK ===')
show('ink-soft #A5AFCB on #192039', '#A5AFCB', '#192039')
show('ink-soft #A5AFCB on #0E1322', '#A5AFCB', '#0E1322')
show('on-paid #07200F on #4CC474', '#07200F', '#4CC474')
show('on-wait #2A1D00 on #F5BE3F', '#2A1D00', '#F5BE3F')
show('danger #FF8A80 on #192039', '#FF8A80', '#192039')
show('on-annual #18213B on #C9CFE6', '#18213B', '#C9CFE6')
print('=== HIGH CONTRAST (black bg) ===')
show('white on black', '#FFFFFF', '#000000')
show('on-paid #000 on #3DDC84', '#000000', '#3DDC84')
show('on-wait #000 on #FFC400', '#000000', '#FFC400')
show('on-annual #000 on #FFFFFF', '#000000', '#FFFFFF')
show('danger #FF8A80 on black', '#FF8A80', '#000000')
show('focus #FFEB3B on black', '#FFEB3B', '#000000', 3)
for L in (28,):
    mn = min(cr((1, 1, 1), hsl(h, 62, L)) for h in HUES)
    print(f'HC month tile white text L={L}: worst {mn:.2f}:1')
print('paid #3DDC84 vs wait #FFC400 luminance gap:', f'{cr("#3DDC84", "#FFC400"):.2f}:1', '(low: needs icon + text + pattern)')
