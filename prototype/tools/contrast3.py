import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import colorsys
def hexrgb(h):
    h=h.lstrip('#'); return tuple(int(h[i:i+2],16)/255 for i in (0,2,4))
def lum(rgb):
    f=lambda c: c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
    r,g,b=[f(c) for c in rgb]; return 0.2126*r+0.7152*g+0.0722*b
def cr(a,b):
    a=hexrgb(a) if isinstance(a,str) else a; b=hexrgb(b) if isinstance(b,str) else b
    la,lb=lum(a),lum(b); return (max(la,lb)+0.05)/(min(la,lb)+0.05)
def hsl(h,s,l): return colorsys.hls_to_rgb(h/360,l/100,s/100)
H=[225,355,285,195,320,255,12,210,300,340,240,270]
print('month chip, white text, worst over hues (all themes use same chip):')
for L in (28,26,25,24):
    print(' L=%d worst %.2f' % (L, min(cr((1,1,1),hsl(h,62,L)) for h in H)))
print('chip vs dark surface #192039 (non text edge):', ['%.2f'%min(cr(hsl(h,62,28),'#192039') for h in H)])
print('chip vs black:', '%.2f'%min(cr(hsl(h,62,28),'#000000') for h in H), '(needs a light border in HC)')
print('DARK paid #4CC474 vs wait #F5BE3F luminance gap: %.2f' % cr('#4CC474','#F5BE3F'))
print('DARK paid on-paid text #07200F on #4CC474: %.2f' % cr('#07200F','#4CC474'))
print('DARK ink #EEF1FA on surface #192039: %.2f' % cr('#EEF1FA','#192039'))
print('DARK edge #8C97BC on #192039: %.2f' % cr('#8C97BC','#192039'))
print('LIGHT edge #5F6B8A on white: %.2f ; on bg #EEF1F8: %.2f' % (cr('#5F6B8A','#FFFFFF'), cr('#5F6B8A','#EEF1F8')))
print('LIGHT ink-soft #3B4660 on bg #EEF1F8: %.2f' % cr('#3B4660','#EEF1F8'))
print('LIGHT focus #2B4BD8 on white: %.2f' % cr('#2B4BD8','#FFFFFF'))
print('LIGHT primary: bg #18213B text white: %.2f' % cr('#FFFFFF','#18213B'))
print('LIGHT wait stripe: #2A1D00 on #F2B01E %.2f ; on stripe dark band #D99A0A: %.2f' % (cr('#2A1D00','#F2B01E'), cr('#2A1D00','#D99A0A')))
print('DARK stripe: #2A1D00 on #E0A92B: %.2f' % cr('#2A1D00','#E0A92B'))
print('HC wait stripe #000 on #FFC400 %.2f ; on #CC9C00 %.2f' % (cr('#000000','#FFC400'), cr('#000000','#CC9C00')))
print('DARK danger #FF8A80 on surface %.2f' % cr('#FF8A80','#192039'))
