#!/usr/bin/env python3
"""Generate logo preview assets → logos/ folder.

Outputs:
  logos/plugin-logo.png   – pixel art branch tree (80×80)
  logos/btn-build.png     – pixel art wrench      (64×64)
  logos/btn-fit.png       – pixel art expand      (64×64)
  logos/btn-locate.png    – pixel art crosshair   (64×64)
  logos/btn-expand.png    – pixel art list+arrow  (64×64)
  logos/claude-logo.png   – official Claude logo  (downloaded)
  logos/chatgpt-logo.png  – official ChatGPT logo (downloaded)
"""

import struct, zlib, os, urllib.request, urllib.error, math

os.makedirs('logos', exist_ok=True)

# ── RGBA colour constants ────────────────────────────────────────────────────
# bg = #161b22
_bg = (22, 27, 34)

def _blend(fg, a):
    """Blend fg (R,G,B) over _bg at opacity a → (R,G,B,255)."""
    return tuple(int(_bg[i] + a * (fg[i] - _bg[i])) for i in range(3)) + (255,)

BG   = _bg + (255,)
W100 = _blend((255,255,255), 1.00)   # full white
W80  = _blend((255,255,255), 0.80)
W70  = _blend((255,255,255), 0.70)
W55  = _blend((255,255,255), 0.55)
W40  = _blend((255,255,255), 0.40)
W22  = _blend((255,255,255), 0.22)

B100 = (88,  166, 255, 255)          # #58a6ff  blue node
B80  = _blend((88,166,255),  0.80)
B70  = _blend((88,166,255),  0.70)
B60  = _blend((88,166,255),  0.60)
B55  = _blend((88,166,255),  0.55)
BH   = (121, 192, 255, 255)          # #79c0ff  highlight
GR   = (63,  185,  80, 255)          # #3fb950  green trunk

# ── PNG writer (pure stdlib, same technique as generate-icons.py) ────────────

def _chunk(t, d):
    c = t + d
    return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c) & 0xFFFFFFFF)

def write_png(path, rows):
    """rows: list of rows, each row a list of (R,G,B,A) tuples."""
    h = len(rows); w = len(rows[0])
    ihdr = _chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
    raw = bytearray()
    for row in rows:
        raw.append(0)
        for r,g,b,a in row:
            raw.extend([r,g,b,a])
    idat = _chunk(b'IDAT', zlib.compress(bytes(raw), 9))
    iend = _chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + ihdr + idat + iend)
    print(f'  ✓  {path}')

# ── Grid helpers ─────────────────────────────────────────────────────────────

def empty(size, fill=BG):
    return [[fill]*size for _ in range(size)]

def rect(grid, x, y, w, h, colour):
    """Fill rectangle (SVG-style x=col, y=row)."""
    for r in range(y, y+h):
        for c in range(x, x+w):
            if 0 <= r < len(grid) and 0 <= c < len(grid[0]):
                grid[r][c] = colour

def scale_grid(grid, s):
    """Nearest-neighbour scale by integer factor s."""
    rows = []
    for row in grid:
        scaled_row = []
        for cell in row:
            scaled_row.extend([cell]*s)
        for _ in range(s):
            rows.append(scaled_row[:])
    return rows

def rounded(rows, radius):
    """Make corners transparent (for standalone icons)."""
    n = len(rows)
    for r in range(n):
        for c in range(len(rows[r])):
            zone = None
            if r < radius and c < radius:       zone = (radius-1, radius-1)
            elif r < radius and c >= n-radius:   zone = (radius-1, n-radius)
            elif r >= n-radius and c < radius:   zone = (n-radius, radius-1)
            elif r >= n-radius and c >= n-radius:zone = (n-radius, n-radius)
            if zone and math.hypot(r-zone[0], c-zone[1]) > radius:
                rows[r][c] = (0,0,0,0)
    return rows

# ── Plugin logo (16×16 → 80×80) ──────────────────────────────────────────────
# Same pixel art as the extension icons (generate-icons.py ART_16), scaled 5×
# Layout: two leaf nodes at top, diagonal branches, branch node, trunk, root node at bottom
# Palette: 0=bg  1=green(trunk)  2=blue(node)  3=light-blue(highlight)

PLUGIN_PALETTE = {
    0: BG,
    1: GR,
    2: B100,
    3: BH,
}

PLUGIN_ART = [
    [0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0],
    [0, 0, 2, 3, 2, 0, 0, 0, 0, 0, 0, 0, 2, 3, 2, 0],
    [0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0],
    [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 2, 3, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 2, 3, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
]

def make_plugin_logo():
    # Convert palette-indexed art to RGBA grid
    g = [[PLUGIN_PALETTE[cell] for cell in row] for row in PLUGIN_ART]
    rows = []
    for row in g:
        scaled_row = []
        for cell in row:
            scaled_row.extend([cell] * 5)
        for _ in range(5):
            rows.append(scaled_row[:])
    rows = rounded(rows, 10)
    write_png('logos/plugin-logo.png', rows)

# ── Build button – hammer 🔨 (16×16 → 64×64) ─────────────────────────────────
# Side-view hammer: rectangular head upper-centre, handle diagonal to lower-left

HAMMER_ART = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],  # head top  (6 wide)
    [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],  # head wide (8 wide)
    [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],  # head wide
    [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],  # head bottom
    [0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0],  # handle neck (right-centre of head)
    [0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0],  # handle diagonal ↙
    [0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
]

def make_btn_build():
    g = [[W100 if cell else BG for cell in row] for row in HAMMER_ART]
    rows = scale_grid(g, 4)          # 64×64
    write_png('logos/btn-build.png', rows)

# ── Fit button – four-corner expand (16×16 → 64×64) ──────────────────────────
# From sidepanel.html:109-123

def make_btn_fit():
    g = empty(16)
    # top-left corner
    rect(g, 2, 2, 4, 2, W100)
    rect(g, 2, 2, 2, 4, W100)
    # top-right corner
    rect(g, 10, 2, 4, 2, W100)
    rect(g, 12, 2, 2, 4, W100)
    # bottom-left corner
    rect(g, 2, 12, 4, 2, W100)
    rect(g, 2, 10, 2, 4, W100)
    # bottom-right corner
    rect(g, 10, 12, 4, 2, W100)
    rect(g, 12, 10, 2, 4, W100)
    # center small box (opacity .4)
    rect(g, 6, 6, 4, 4, W40)
    rows = scale_grid(g, 4)
    write_png('logos/btn-fit.png', rows)

# ── Locate button – crosshair (16×16 → 64×64) ────────────────────────────────
# From sidepanel.html:128-136

def make_btn_locate():
    g = empty(16)
    rect(g, 7,  1, 2, 3, W100)   # top arm
    rect(g, 7, 12, 2, 3, W100)   # bottom arm
    rect(g, 1,  7, 3, 2, W100)   # left arm
    rect(g, 12, 7, 3, 2, W100)   # right arm
    rect(g, 5,  5, 6, 6, W22)    # outer ring dim (opacity .22)
    rect(g, 6,  6, 4, 4, W100)   # solid center square
    rows = scale_grid(g, 4)
    write_png('logos/btn-locate.png', rows)

# ── Expand All button – double down-chevron ▼▼ (16×16 → 64×64) ───────────────
# Two stacked V-shapes clearly communicate "expand all downward"
# Chevron arms: 2px wide, meeting at tip (col 7 ± spread)

EXPAND_ART = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,1,1,0,0,0,0,0,0,0,1,1,0,0,0],  # chevron 1 top  (arms at cols 2-3, 11-12)
    [0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0],
    [0,0,0,0,1,1,0,0,0,1,1,0,0,0,0,0],
    [0,0,0,0,0,1,1,0,1,1,0,0,0,0,0,0],
    [0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0],  # chevron 1 tip  (cols 6-8)
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],  # gap
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],  # gap
    [0,0,1,1,0,0,0,0,0,0,0,1,1,0,0,0],  # chevron 2 top
    [0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0],
    [0,0,0,0,1,1,0,0,0,1,1,0,0,0,0,0],
    [0,0,0,0,0,1,1,0,1,1,0,0,0,0,0,0],
    [0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0],  # chevron 2 tip
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
]

def make_btn_expand():
    g = [[W100 if cell else BG for cell in row] for row in EXPAND_ART]
    rows = scale_grid(g, 4)
    write_png('logos/btn-expand.png', rows)

# ── Real logo downloader ─────────────────────────────────────────────────────

def try_download(url, dest):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = r.read()
        with open(dest, 'wb') as f:
            f.write(data)
        print(f'  ✓  {dest}  (downloaded from {url})')
        return True
    except Exception as e:
        print(f'  ✗  {url} → {e}')
        return False

def download_claude_logo():
    """Try several known public URLs for the Claude/Anthropic logo."""
    dest = 'logos/claude-logo.png'
    urls = [
        # Anthropic favicon / app icon (publicly accessible)
        'https://www.anthropic.com/favicon.ico',
        'https://claude.ai/favicon.ico',
        # Anthropic press kit / brand assets
        'https://storage.googleapis.com/anthropic-website/anthropic-logo.png',
    ]
    for url in urls:
        if try_download(url, dest):
            return
    print('  ! Could not download Claude logo — creating placeholder')
    _make_text_logo(dest, 'C', (200, 120, 50), 'Claude')

def download_chatgpt_logo():
    """Draw the OpenAI / ChatGPT symbol: 3 overlapping capsule shapes at 0°/60°/120°.
    Union of all 3 capsules (minus small centre hole) = the classic 6-blade bloom logo."""
    dest = 'logos/chatgpt-logo.png'
    SIZE = 128
    cx = cy = SIZE // 2
    WH = (255, 255, 255, 255)
    TL = (16, 163, 127, 255)    # #10a37f  OpenAI brand teal

    img = [[WH]*SIZE for _ in range(SIZE)]

    # Each capsule: a stadium (rounded rectangle) centred at origin,
    # rotated by k*60°.  semi_a = half-length, semi_b = half-width.
    SEMI_A = 42
    SEMI_B = 14

    def in_capsule(px, py, angle):
        dx = px - cx;  dy = py - cy
        ca = math.cos(angle);  sa = math.sin(angle)
        lx =  dx*ca + dy*sa
        ly = -dx*sa + dy*ca
        return (lx / SEMI_A)**2 + (ly / SEMI_B)**2 <= 1.0

    for r in range(SIZE):
        for c in range(SIZE):
            # Count how many of the 3 capsules contain this pixel
            count = sum(1 for k in range(3) if in_capsule(c, r, k * math.pi / 3))
            # Colour only pixels inside exactly 1 capsule → 6 distinct blades
            # (where 2 or 3 capsules overlap becomes the white gaps / centre)
            if count == 1:
                img[r][c] = TL

    write_png(dest, img)
    print(f'  ✓  {dest}  (OpenAI bloom symbol)')

def _make_text_logo(dest, letter, colour, label):
    """Fallback: white-background 128×128 PNG with a coloured letter mark."""
    size = 128
    rows = [[(255,255,255,255)]*size for _ in range(size)]

    # Draw a filled circle
    cx = cy = size//2
    radius = 50
    r, g, b = colour
    for row in range(size):
        for col in range(size):
            d = math.hypot(row-cy, col-cx)
            if d <= radius:
                rows[row][col] = (r, g, b, 255)

    # Draw the letter using 5×7 pixel font (letter at centre)
    FONT = {
        'C': [
            (0,1,1,1,0),
            (1,0,0,0,1),
            (1,0,0,0,0),
            (1,0,0,0,0),
            (1,0,0,0,0),
            (1,0,0,0,1),
            (0,1,1,1,0),
        ],
        'G': [
            (0,1,1,1,0),
            (1,0,0,0,0),
            (1,0,0,0,0),
            (1,0,1,1,1),
            (1,0,0,0,1),
            (1,0,0,0,1),
            (0,1,1,1,0),
        ],
    }
    pattern = FONT.get(letter, FONT['C'])
    scale = 5
    font_w = 5 * scale; font_h = 7 * scale
    ox = (size - font_w) // 2; oy = (size - font_h) // 2
    for fy, row_bits in enumerate(pattern):
        for fx, bit in enumerate(row_bits):
            if bit:
                for sy in range(scale):
                    for sx in range(scale):
                        pr = oy + fy*scale + sy
                        pc = ox + fx*scale + sx
                        if 0 <= pr < size and 0 <= pc < size:
                            rows[pr][pc] = (255, 255, 255, 255)

    write_png(dest, rows)
    print(f'       (placeholder for {label})')


# ── Main ─────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    import sys
    regen_all = '--all' in sys.argv

    print('Generating pixel art icons…')
    make_plugin_logo()
    make_btn_build()
    if regen_all:
        make_btn_fit()
        make_btn_locate()
    make_btn_expand()

    print('\nGenerating / downloading logos…')
    if regen_all:
        download_claude_logo()
    download_chatgpt_logo()

    print('\nDone → logos/')
