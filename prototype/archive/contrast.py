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
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def hsl(h, s, l):
    r, g, b = colorsys.hls_to_rgb(h / 360, l / 100, s / 100)
    return (r, g, b)


def show(label, fg, bg, need):
    r = cr(hexrgb(fg) if isinstance(fg, str) else fg, hexrgb(bg) if isinstance(bg, str) else bg)
    print(f"{'OK  ' if r >= need else 'FAIL'} {r:5.2f}:1 (need {need})  {label}")


print('--- LIGHT ---')
show('ink on surface', '#18213B', '#FFFFFF', 4.5)
show('ink on bg', '#18213B', '#EEF1F8', 4.5)
show('ink-soft #4B5675 on surface', '#4B5675', '#FFFFFF', 4.5)
show('ink-soft #4B5675 on bg (caption)', '#4B5675', '#EEF1F8', 4.5)
show('on-paid white on #1B7F3B', '#FFFFFF', '#1B7F3B', 4.5)
show('on-wait #2A1D00 on #F2B01E', '#2A1D00', '#F2B01E', 4.5)
show('annual white on #2E3550', '#FFFFFF', '#2E3550', 4.5)
show('paid green as text on surface (.pill.ok, done h1)', '#1B7F3B', '#FFFFFF', 4.5)
show('danger #B3261E on surface', '#B3261E', '#FFFFFF', 4.5)
show('border --line #CBD2E3 on surface (UI boundary, need 3)', '#CBD2E3', '#FFFFFF', 3)
show('candidate edge #7A85A3 on surface', '#7A85A3', '#FFFFFF', 3)
show('focus #2B4BD8 on surface (need 3)', '#2B4BD8', '#FFFFFF', 3)
print('month tiles, white text on hsl(h 62% 34%): big bold 3:1, small 13.6px text 4.5:1')
HUES = [225, 355, 285, 195, 320, 255, 12, 210, 300, 340, 240, 270]
names = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
worst = []
for n, h in zip(names, HUES):
    r = cr((1, 1, 1), hsl(h, 62, 34))
    worst.append((r, n, h))
worst.sort()
for r, n, h in worst:
    print(f"   {n} hue {h}: {r:5.2f}:1 {'(ok small)' if r >= 4.5 else ('(ok large only)' if r >= 3 else 'FAIL')}")

print('--- DARK ---')
show('ink #EEF1FA on surface #192039', '#EEF1FA', '#192039', 4.5)
show('ink-soft #A5AFCB on surface #192039', '#A5AFCB', '#192039', 4.5)
show('ink-soft #A5AFCB on bg #0E1322 (caption)', '#A5AFCB', '#0E1322', 4.5)
show('on-paid #07200F on #4CC474', '#07200F', '#4CC474', 4.5)
show('on-wait #2A1D00 on #F5BE3F', '#2A1D00', '#F5BE3F', 4.5)
show('on-annual #18213B on #C9CFE6', '#18213B', '#C9CFE6', 4.5)
show('danger #FF8A80 on surface', '#FF8A80', '#192039', 4.5)
show('border #2E3858 on surface #192039 (need 3)', '#2E3858', '#192039', 3)
show('candidate edge #6F7BA0 on surface #192039', '#6F7BA0', '#192039', 3)
show('focus #8FA6FF on surface', '#8FA6FF', '#192039', 3)
worst = []
for n, h in zip(names, HUES):
    worst.append((cr((1, 1, 1), hsl(h, 62, 40)), n, h))
worst.sort()
print('month tiles dark, white text on hsl(h 62% 40%):')
for r, n, h in worst[:4]:
    print(f"   {n} hue {h}: {r:5.2f}:1")
print('   best:', f"{worst[-1][0]:.2f}:1")

print('--- candidates for month tiles ---')
for L in (30, 28, 26):
    mn = min(cr((1, 1, 1), hsl(h, 62, L)) for h in HUES)
    print(f"light L={L}: worst {mn:.2f}:1")
for L in (36, 34):
    mn = min(cr((1, 1, 1), hsl(h, 62, L)) for h in HUES)
    print(f"dark  L={L}: worst {mn:.2f}:1")
