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
print('month chip, white text, worst over hues (all themes use the same chip):')
for L in (28,26,25,24):
    print(' L=%d worst %.2f' % (L, min(cr((1,1,1),hsl(h,62,L)) for h in H)))
print('LIGHT ink #4E1A6E on white: %.2f ; on bg #FBF8FC: %.2f' % (cr('#4E1A6E','#FFFFFF'), cr('#4E1A6E','#FBF8FC')))
print('LIGHT ink-soft #5A3E66 on white: %.2f ; on bg: %.2f' % (cr('#5A3E66','#FFFFFF'), cr('#5A3E66','#FBF8FC')))
print('LIGHT edge #735684 on white: %.2f' % cr('#735684','#FFFFFF'))
print('LIGHT paid white on #0F5F28: %.2f' % cr('#FFFFFF','#0F5F28'))
print('LIGHT wait #2A1D00 on gold #EDB438: %.2f' % cr('#2A1D00','#EDB438'))
print('LIGHT danger #9C1C15 on white: %.2f' % cr('#9C1C15','#FFFFFF'))
print('LIGHT button white on brand #4E1A6E: %.2f' % cr('#FFFFFF','#4E1A6E'))
print('DARK ink #FBF7FC on surface #2A1836: %.2f' % cr('#FBF7FC','#2A1836'))
print('DARK ink-soft #E6D6F0 on surface: %.2f' % cr('#E6D6F0','#2A1836'))
print('DARK edge #CDB6DC on surface: %.2f' % cr('#CDB6DC','#2A1836'))
print('DARK paid #07200F on #4CC474: %.2f' % cr('#07200F','#4CC474'))
print('DARK danger #FF8A80 on surface: %.2f' % cr('#FF8A80','#2A1836'))
print('DARK button white on #7A36A8: %.2f' % cr('#FFFFFF','#7A36A8'))
print('gold #EDB438 on white (logo artwork, not body text): %.2f' % cr('#EDB438','#FFFFFF'))
