"""Draws flat product illustrations for the 7 brands that have no photos (Mancini, 20 Nov 19:08).
Writes src/assets/ads/<slot>.svg. Real photos with the same slot name (webp) take priority in Thumb.tsx."""
import os, sys
OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'assets', 'ads')

def svg(bg1, bg2, body, w=720, h=1080):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{bg1}"/><stop offset="1" stop-color="{bg2}"/></linearGradient>
<radialGradient id="sh" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#000" stop-opacity="0.22"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>
<rect width="{w}" height="{h}" fill="url(#g)"/>
<rect y="{int(h*0.78)}" width="{w}" height="{int(h*0.22)}" fill="#000" opacity="0.05"/>
{body}
</svg>'''

def shadow(cx, cy, rx, ry=None):
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry or rx*0.16}" fill="url(#sh)"/>'

def toaster(x, y, s=1.0, c='#e8a87c'):
    return f'''<g transform="translate({x} {y}) scale({s})">
{shadow(0, 150, 230)}
<rect x="-70" y="-150" width="60" height="110" rx="12" fill="#f3d39b" stroke="#c9974f" stroke-width="5"/>
<rect x="15" y="-130" width="60" height="90" rx="12" fill="#f3d39b" stroke="#c9974f" stroke-width="5"/>
<rect x="-190" y="-70" width="380" height="220" rx="70" fill="{c}"/>
<rect x="-190" y="-70" width="380" height="60" rx="30" fill="#fff" opacity="0.18"/>
<rect x="-110" y="-78" width="90" height="18" rx="9" fill="#3a2f2a"/>
<rect x="5" y="-78" width="90" height="18" rx="9" fill="#3a2f2a"/>
<rect x="160" y="0" width="45" height="22" rx="8" fill="#3a2f2a"/>
<circle cx="-120" cy="80" r="16" fill="#fff" opacity="0.7"/>
<rect x="-150" y="145" width="40" height="18" rx="6" fill="#3a2f2a"/><rect x="110" y="145" width="40" height="18" rx="6" fill="#3a2f2a"/>
</g>'''

def toast(x, y, s=1.0):
    return f'''<g transform="translate({x} {y}) scale({s})">{shadow(0,95,110)}
<path d="M-90 90 V-40 C-110 -70 -100 -110 -60 -110 C-40 -140 40 -140 60 -110 C100 -110 110 -70 90 -40 V90 Z" fill="#e9b872" stroke="#b97c34" stroke-width="10"/>
<rect x="-55" y="-30" width="110" height="34" rx="10" fill="#f7e3a3"/></g>'''

def sock(x, y, s=1.0, c='#7aa6c2', stripe='#f4f1ea', rot=0):
    return f'''<g transform="translate({x} {y}) rotate({rot}) scale({s})">{shadow(20, 230, 160)}
<path d="M-60 -230 H60 V60 C60 110 90 120 140 135 C200 152 200 230 130 232 H-10 C-60 232 -60 180 -60 140 Z" fill="{c}"/>
<rect x="-60" y="-230" width="120" height="40" fill="{stripe}"/>
<rect x="-60" y="-160" width="120" height="22" fill="{stripe}" opacity="0.9"/>
<rect x="-60" y="-115" width="120" height="22" fill="{stripe}" opacity="0.9"/>
<path d="M90 150 C130 150 175 165 170 210 L135 230 C150 200 120 175 90 172 Z" fill="{stripe}" opacity="0.85"/>
<circle cx="0" cy="0" r="10" fill="#fff" opacity="0.35"/><circle cx="-25" cy="40" r="8" fill="#fff" opacity="0.35"/><circle cx="25" cy="70" r="8" fill="#fff" opacity="0.35"/>
</g>'''

def candle(x, y, s=1.0, c='#d9c7a8', label='#6b4e2e'):
    return f'''<g transform="translate({x} {y}) scale({s})">{shadow(0, 160, 170)}
<ellipse cx="0" cy="-260" rx="40" ry="70" fill="#ffd27a" opacity="0.35"/>
<path d="M0 -300 C18 -270 22 -250 0 -225 C-22 -250 -18 -270 0 -300 Z" fill="#ffb347"/>
<path d="M0 -280 C8 -262 9 -250 0 -238 C-9 -250 -8 -262 0 -280 Z" fill="#fff3c4"/>
<rect x="-3" y="-230" width="6" height="30" fill="#3a2f2a"/>
<rect x="-140" y="-200" width="280" height="360" rx="34" fill="{c}"/>
<rect x="-140" y="-200" width="280" height="50" rx="25" fill="#fff" opacity="0.35"/>
<rect x="-95" y="-40" width="190" height="120" rx="14" fill="#fbf7ef"/>
<rect x="-60" y="-12" width="120" height="14" rx="7" fill="{label}"/><rect x="-40" y="18" width="80" height="10" rx="5" fill="{label}" opacity="0.6"/>
<rect x="-120" y="-190" width="18" height="320" rx="9" fill="#fff" opacity="0.25"/>
</g>'''

def cup(x, y, s=1.0, c='#f2efe8', tea='#c98b4a'):
    return f'''<g transform="translate({x} {y}) scale({s})">{shadow(0, 150, 240)}
<ellipse cx="0" cy="120" rx="230" ry="44" fill="#fff" stroke="#e2dccf" stroke-width="6"/>
<path d="M150 -40 C230 -40 230 70 140 70" fill="none" stroke="{c}" stroke-width="34"/>
<path d="M-170 -90 H170 C170 50 110 120 0 120 C-110 120 -170 50 -170 -90 Z" fill="{c}"/>
<ellipse cx="0" cy="-90" rx="170" ry="34" fill="{tea}"/>
<path d="M-60 -150 C-90 -190 -30 -210 -60 -260" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" opacity="0.8"/>
<path d="M30 -150 C0 -190 60 -210 30 -260" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" opacity="0.8"/>
<line x1="120" y1="-80" x2="200" y2="40" stroke="#8a7a62" stroke-width="4"/><rect x="185" y="35" width="44" height="54" rx="6" fill="#e9c46a"/>
</g>'''

def bowl(x, y, s=1.0, c='#e76f51'):
    return f'''<g transform="translate({x} {y}) scale({s})">{shadow(0, 110, 250)}
<path d="M-230 -20 H230 L185 100 H-185 Z" fill="{c}"/>
<ellipse cx="0" cy="-20" rx="230" ry="44" fill="#fff" opacity="0.25"/>
<ellipse cx="0" cy="-22" rx="190" ry="30" fill="#7a4b2a"/>
<circle cx="-60" cy="-30" r="16" fill="#a06a3d"/><circle cx="-20" cy="-36" r="16" fill="#8b5a33"/><circle cx="30" cy="-28" r="16" fill="#a06a3d"/><circle cx="70" cy="-34" r="16" fill="#8b5a33"/>
<text x="0" y="62" text-anchor="middle" font-family="Arial Black, Arial" font-weight="900" font-size="54" fill="#fff" opacity="0.85">WOOF</text>
</g>'''

def bone(x, y, s=1.0, rot=-20, c='#f4e9d8'):
    return f'''<g transform="translate({x} {y}) rotate({rot}) scale({s})">
<rect x="-110" y="-22" width="220" height="44" rx="22" fill="{c}"/>
<circle cx="-110" cy="-26" r="30" fill="{c}"/><circle cx="-110" cy="26" r="30" fill="{c}"/>
<circle cx="110" cy="-26" r="30" fill="{c}"/><circle cx="110" cy="26" r="30" fill="{c}"/></g>'''

def dog(x, y, s=1.0, c='#d9a066'):
    return f'''<g transform="translate({x} {y}) scale({s})">{shadow(0, 230, 200)}
<ellipse cx="0" cy="120" rx="170" ry="120" fill="{c}"/>
<path d="M-150 -120 C-230 -60 -200 80 -130 60 Z" fill="#8a5a2b"/><path d="M150 -120 C230 -60 200 80 130 60 Z" fill="#8a5a2b"/>
<circle cx="0" cy="-30" r="160" fill="{c}"/>
<ellipse cx="0" cy="40" rx="90" ry="70" fill="#f6e3c6"/>
<circle cx="-60" cy="-50" r="18" fill="#2b2020"/><circle cx="60" cy="-50" r="18" fill="#2b2020"/>
<ellipse cx="0" cy="15" rx="30" ry="22" fill="#2b2020"/><path d="M0 37 V60 M-30 70 C-15 85 15 85 30 70" stroke="#2b2020" stroke-width="8" fill="none" stroke-linecap="round"/>
<rect x="-110" y="150" width="220" height="30" rx="15" fill="#e76f51"/><circle cx="0" cy="200" r="22" fill="#f4c542"/>
</g>'''

def swimsuit(x, y, s=1.0, c='#2a9d8f', accent='#f4a261'):
    return f'''<g transform="translate({x} {y}) scale({s})">{shadow(0, 270, 180)}
<path d="M-90 -260 C-90 -200 -110 -150 -130 -100 C-150 -40 -140 40 -120 120 C-110 170 -150 230 -120 250 C-80 270 -30 200 0 200 C30 200 80 270 120 250 C150 230 110 170 120 120 C140 40 150 -40 130 -100 C110 -150 90 -200 90 -260 L60 -260 C50 -190 30 -150 0 -150 C-30 -150 -50 -190 -60 -260 Z" fill="{c}"/>
<path d="M-128 -10 C-60 30 60 30 128 -10 L132 30 C60 70 -60 70 -132 30 Z" fill="{accent}"/>
<path d="M-90 -230 C-70 -150 -40 -110 0 -110" stroke="#fff" stroke-width="6" fill="none" opacity="0.35"/>
</g>'''

def sun(x, y, r=90, c='#ffd166'):
    rays = ''.join(f'<rect x="-6" y="{-r-50}" width="12" height="34" rx="6" fill="{c}" transform="rotate({a})"/>' for a in range(0, 360, 30))
    return f'<g transform="translate({x} {y})">{rays}<circle r="{r}" fill="{c}"/></g>'

def plant(x, y, s=1.0, pot='#c9733d', leaf='#4f7942'):
    return f'''<g transform="translate({x} {y}) scale({s})">{shadow(0, 200, 170)}
<path d="M0 -40 C-40 -160 -170 -200 -200 -150 C-150 -140 -80 -100 0 -40 Z" fill="{leaf}"/>
<path d="M0 -40 C40 -170 170 -230 210 -170 C150 -150 80 -110 0 -40 Z" fill="{leaf}" opacity="0.9"/>
<path d="M0 -40 C-10 -200 40 -300 90 -320 C80 -250 50 -150 0 -40 Z" fill="#6a994e"/>
<path d="M0 -40 C-20 -180 -90 -280 -140 -290 C-110 -220 -60 -140 0 -40 Z" fill="#6a994e" opacity="0.9"/>
<path d="M-150 -40 H150 L115 200 H-115 Z" fill="{pot}"/>
<rect x="-165" y="-60" width="330" height="50" rx="14" fill="{pot}"/><rect x="-165" y="-60" width="330" height="18" rx="9" fill="#fff" opacity="0.2"/>
</g>'''

def pebbles(x, y):
    return f'<g transform="translate({x} {y})"><ellipse cx="-40" cy="0" rx="40" ry="26" fill="#b8b2a7"/><ellipse cx="30" cy="8" rx="30" ry="20" fill="#d6d0c4"/><ellipse cx="80" cy="-4" rx="22" ry="15" fill="#9c958a"/></g>'

def dots(c, n=8, seed=1):
    import random
    r = random.Random(seed); out = ''
    for _ in range(n):
        out += f'<circle cx="{r.randint(40,680)}" cy="{r.randint(380,800)}" r="{r.randint(6,16)}" fill="{c}" opacity="0.5"/>'
    return out

ART = {
  # Tiny Toast Co. (keeps its slots t01–t03)
  't01': svg('#fbe3c8', '#f2c9a0', toaster(360, 760, 1.15)),
  't02': svg('#d9e6f2', '#b9cfe3', toaster(330, 760, 1.0, '#f28c6b') + toast(560, 830, 0.8)),
  't03': svg('#fff1d6', '#f6d9a8', toaster(250, 780, 0.85, '#e8a87c') + toast(520, 820, 0.75) + toast(610, 860, 0.6)),
  't04': svg('#f6e0e8', '#ebc1cf', toaster(360, 760, 1.1, '#9ccbb3')),
  # Pebble & Pine (planters)
  'pp1': svg('#e7efe2', '#cfdcc6', plant(360, 760, 1.1) + pebbles(560, 960)),
  'pp2': svg('#f4ede2', '#e4d6c0', plant(250, 790, 0.85, '#d8cbb3') + plant(500, 820, 0.7, '#c9733d', '#2d6a4f')),
  'pp3': svg('#dde7ef', '#c3d3e0', plant(360, 760, 1.05, '#ececec', '#40916c') + pebbles(170, 960)),
  'pp4': svg('#2d3a2e', '#1f2a20', plant(360, 760, 1.1, '#c9733d', '#95d5b2')),
  # Hollow Oak Candles
  'ho1': svg('#efe4d6', '#dccab3', candle(360, 760, 1.1)),
  'ho2': svg('#3b2f2a', '#251c18', candle(360, 770, 1.05, '#c9a87c', '#3b2f2a')),
  'ho3': svg('#f2e7dd', '#e3cfbd', candle(220, 800, 0.8, '#e5c3a6') + candle(500, 800, 0.8, '#b7c4a3', '#3b4a2f')),
  'ho4': svg('#e7dff0', '#d2c4e3', candle(360, 760, 1.1, '#cbb7e0', '#4b3a6b')),
  # Kumo Socks
  'ks1': svg('#e3eef6', '#c6dcec', sock(360, 720, 1.05)),
  'ks2': svg('#fdebd3', '#f6d2a7', sock(250, 740, 0.85, '#e76f51', '#fff3e0', -8) + sock(480, 760, 0.85, '#264653', '#e9c46a', 8)),
  'ks3': svg('#eaf4ea', '#cfe5cf', sock(360, 720, 1.05, '#6a994e', '#f2e8cf', 6)),
  'ks4': svg('#22303c', '#162029', sock(360, 720, 1.05, '#e9c46a', '#264653', -6)),
  # Lumen Tea House
  'lt1': svg('#eef3e6', '#d7e3c8', cup(360, 780, 1.0)),
  'lt2': svg('#fbeee0', '#f1d6bb', cup(360, 780, 1.0, '#f7f3ec', '#8a9a5b')),
  'lt3': svg('#2f3b33', '#1e2721', cup(360, 780, 1.0, '#e9e4da', '#d08c60')),
  'lt4': svg('#f3e6ef', '#e5cddd', cup(360, 780, 1.0, '#ffffff', '#c76b8a')),
  # Fernwick Pet Co.
  'fp1': svg('#fdf0e1', '#f6d9b8', dog(360, 640, 1.0)),
  'fp2': svg('#e6f1f4', '#c9e1e8', bowl(360, 800, 1.0) + bone(520, 600, 0.7)),
  'fp3': svg('#fde8e0', '#f6cbb9', dog(300, 650, 0.85, '#b5835a') + bone(540, 900, 0.6, 15)),
  'fp4': svg('#e9edf7', '#cfd7ec', bowl(360, 800, 1.0, '#2a9d8f') + bone(200, 620, 0.6, 25)),
  # Saltglass Swim
  'sg1': svg('#d8f0f2', '#a9dbe0', sun(560, 330, 70) + swimsuit(330, 640, 1.0)),
  'sg2': svg('#fde2d0', '#f7c4a2', swimsuit(330, 640, 1.0, '#e76f51', '#264653')),
  'sg3': svg('#e3ecf8', '#c4d4ee', swimsuit(240, 660, 0.8, '#264653', '#e9c46a') + swimsuit(500, 680, 0.8, '#f4a261', '#2a9d8f')),
  'sg4': svg('#0f3b4a', '#0a2833', sun(560, 330, 70, '#f4a261') + swimsuit(330, 640, 1.0, '#90e0ef', '#f4a261')),
}
for slot, s in ART.items():
    with open(os.path.join(OUT, f'{slot}.svg'), 'w') as f:
        f.write(s)
print(len(ART), 'drawn')
