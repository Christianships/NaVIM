#!/usr/bin/env python3
"""Write icons/navim.svg: Vim's beveled diamond + extruded V, in black and
chrome with a dot-matrix face, flanked by two hint tags reading NA . V . IM."""
from pathlib import Path

GLYPHS = {
    'N': ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
    'A': ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    'I': ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
    'M': ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
}


def dots(text, x0, y0, pitch, r):
    """Dot-matrix text as one path, top-left at (x0, y0)."""
    d = []
    for i, ch in enumerate(text):
        for y, row in enumerate(GLYPHS[ch]):
            for x, c in enumerate(row):
                if c == '#':
                    cx = x0 + (i * 6 + x + 0.5) * pitch
                    cy = y0 + (y + 0.5) * pitch
                    d.append(f'M{cx - r:.2f} {cy:.2f}a{r} {r} 0 1 0 {2 * r} 0a{r} {r} 0 1 0 {-2 * r} 0')
    return ''.join(d)


def tag(text, x, y, w=104, h=64):
    pitch, r = 7, 2.7
    tw, th = (len(text) * 6 - 1) * pitch, 7 * pitch
    return f'''
    <g filter="url(#tagShadow)">
      <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="11" fill="#000"/>
      <rect x="{x + 1.5}" y="{y + 1.5}" width="{w - 3}" height="{h - 3}" rx="9.5" fill="url(#tagFace)" stroke="#fff" stroke-opacity=".28" stroke-width="1.5"/>
      <path d="{dots(text, x + (w - tw) / 2, y + (h - th) / 2, pitch, r)}" fill="#fff"/>
    </g>'''


def poly(points):
    return ' '.join(f'{x},{y}' for x, y in points)


# Diamond: outer rim and the inner face, bevel facets between them.
O = [(256, 22), (490, 256), (256, 490), (22, 256)]
I = [(256, 62), (450, 256), (256, 450), (62, 256)]
facets = [
    ([O[0], O[3], I[3], I[0]], '#6a6a70'),  # top-left: catches the light
    ([O[0], O[1], I[1], I[0]], '#3c3c42'),
    ([O[1], O[2], I[2], I[1]], '#101012'),  # bottom-right: in shadow
    ([O[2], O[3], I[3], I[2]], '#232327'),
]

# The V: thick left arm, thin right arm, a serif across the top of each.
V_BODY = [(128, 164), (232, 404), (284, 404), (400, 164), (356, 164), (272.7, 336.5), (198, 164)]
L_SERIF = [(98, 116), (234, 116), (226, 164), (106, 164)]
R_SERIF = [(326, 116), (430, 116), (422, 164), (334, 164)]
V = ' '.join(f'M{poly(p)}Z' for p in (V_BODY, L_SERIF, R_SERIF))

extrude = ''.join(f'<use href="#v" transform="translate({i * 1.1:.1f} {i * 1.5:.1f})"/>' for i in range(12, 0, -1))

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <path id="v" d="{V}"/>
    <clipPath id="faceClip"><polygon points="{poly(I)}"/></clipPath>
    <clipPath id="vClip"><use href="#v"/></clipPath>

    <radialGradient id="face" cx="200" cy="170" r="300" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#202024"/>
      <stop offset="1" stop-color="#030304"/>
    </radialGradient>
    <pattern id="grid" width="13" height="13" patternUnits="userSpaceOnUse">
      <circle cx="6.5" cy="6.5" r="1.9" fill="#fff"/>
    </pattern>
    <radialGradient id="gridFade" cx="256" cy="230" r="230" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff" stop-opacity=".16"/>
      <stop offset="1" stop-color="#fff" stop-opacity=".03"/>
    </radialGradient>
    <mask id="gridMask"><rect width="512" height="512" fill="url(#gridFade)"/></mask>

    <linearGradient id="chrome" x1="0" y1="116" x2="0" y2="404" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset=".40" stop-color="#e4e4e8"/>
      <stop offset=".49" stop-color="#8d8d94"/>
      <stop offset=".55" stop-color="#c4c4ca"/>
      <stop offset="1" stop-color="#f6f6f8"/>
    </linearGradient>
    <linearGradient id="gloss" x1="0" y1="116" x2="0" y2="250" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff" stop-opacity=".9"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="sheen" x1="60" y1="60" x2="300" y2="300" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff" stop-opacity=".14"/>
      <stop offset=".5" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="tagFace" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1a1a1d"/>
      <stop offset="1" stop-color="#000"/>
    </linearGradient>

    <filter id="drop" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#000" flood-opacity=".55"/>
    </filter>
    <filter id="tagShadow" x="-30%" y="-30%" width="160%" height="170%">
      <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#000" flood-opacity=".7"/>
    </filter>
  </defs>

  <!-- diamond: rounded rim, bevel facets, dot-matrix face -->
  <g filter="url(#drop)">
    <polygon points="{poly(O)}" fill="#000" stroke="#000" stroke-width="22" stroke-linejoin="round"/>
    {''.join(f'<polygon points="{poly(p)}" fill="{c}"/>' for p, c in facets)}
    <polygon points="{poly(O)}" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="2" stroke-linejoin="round"/>
    <polygon points="{poly(I)}" fill="url(#face)"/>
    <g clip-path="url(#faceClip)">
      <rect width="512" height="512" fill="url(#grid)" mask="url(#gridMask)"/>
      <rect width="512" height="512" fill="url(#sheen)"/>
    </g>
    <polyline points="{poly([I[3], I[0], I[1]])}" fill="none" stroke="#000" stroke-opacity=".8" stroke-width="3"/>
    <polyline points="{poly([I[1], I[2], I[3]])}" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="2"/>
  </g>

  <!-- the V: extruded depth, then the chrome face -->
  <g fill="#34343a" stroke="#0b0b0d" stroke-width="5" stroke-linejoin="round">{extrude}</g>
  <use href="#v" fill="url(#chrome)" stroke="#000" stroke-width="7" stroke-linejoin="round" paint-order="stroke"/>
  <g clip-path="url(#vClip)">
    <rect x="0" y="116" width="512" height="134" fill="url(#gloss)" opacity=".55"/>
    <path d="M98 119H430" stroke="#fff" stroke-width="4"/>
  </g>

  <!-- hint tags: NA . V . IM -->
  {tag('NA', 90, 334)}
  {tag('IM', 324, 334)}
</svg>
'''

out = Path(__file__).resolve().parent.parent / 'icons' / 'navim.svg'
out.write_text(svg)
print(f'{out} ({len(svg)} bytes)')
