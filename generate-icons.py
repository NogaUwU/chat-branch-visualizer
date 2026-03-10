#!/usr/bin/env python3
"""Generate pixel art icons for Chat Branch Visualizer Chrome extension."""

import struct
import zlib
import os
import math

# Color palette (R, G, B, A)
PALETTE = {
    0: (22, 27, 34, 255),      # dark background #161b22
    1: (63, 185, 80, 255),     # green line #3fb950
    2: (88, 166, 255, 255),    # blue node #58a6ff
    3: (121, 192, 255, 255),   # light blue highlight #79c0ff
    255: (0, 0, 0, 0),         # transparent (corners)
}

# 16x16 pixel art: branching conversation tree
# 0=background  1=branch line (green)  2=node (blue)  3=highlight (light blue)
#
#  [L]         [R]     <- two leaf nodes top-left and top-right
#    \         /
#     \       /
#      [branch]       <- branch point node (center)
#         |
#         |
#       [root]        <- root node (bottom center)
#
ART_16 = [
    [0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0],  # row  0: leaf nodes
    [0, 0, 2, 3, 2, 0, 0, 0, 0, 0, 0, 0, 2, 3, 2, 0],  # row  1
    [0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0],  # row  2
    [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],  # row  3: diagonals
    [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],  # row  4
    [0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0],  # row  5: branch node
    [0, 0, 0, 0, 0, 0, 0, 2, 3, 2, 0, 0, 0, 0, 0, 0],  # row  6
    [0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0],  # row  7
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],  # row  8: trunk
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],  # row  9
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],  # row 10
    [0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0],  # row 11: root node
    [0, 0, 0, 0, 0, 0, 0, 2, 3, 2, 0, 0, 0, 0, 0, 0],  # row 12
    [0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0],  # row 13
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],  # row 14: padding
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],  # row 15
]


def in_rounded_rect(row, col, size, radius):
    """Return True if (row, col) is inside a rounded rectangle."""
    near_top    = row < radius
    near_bottom = row >= size - radius
    near_left   = col < radius
    near_right  = col >= size - radius

    if near_top and near_left:
        cr, cc = radius, radius
    elif near_top and near_right:
        cr, cc = radius, size - 1 - radius
    elif near_bottom and near_left:
        cr, cc = size - 1 - radius, radius
    elif near_bottom and near_right:
        cr, cc = size - 1 - radius, size - 1 - radius
    else:
        return True  # not in any corner zone

    return math.sqrt((row - cr) ** 2 + (col - cc) ** 2) <= radius


def scale_art(art, scale):
    """Scale 16x16 pixel art to target size using nearest-neighbor."""
    result = []
    for row in art:
        scaled_row = []
        for cell in row:
            scaled_row.extend([cell] * scale)
        for _ in range(scale):
            result.append(scaled_row[:])
    return result


def apply_rounded_corners(pixels, size, radius):
    """Mark pixels outside the rounded rect as transparent (255)."""
    for r in range(size):
        for c in range(size):
            if not in_rounded_rect(r, c, size, radius):
                pixels[r][c] = 255  # transparent
    return pixels


def make_chunk(chunk_type, data):
    c = chunk_type + data
    return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xFFFFFFFF)


def write_png(filepath, pixels, size):
    """Write RGBA PNG to filepath."""
    signature = b'\x89PNG\r\n\x1a\n'

    # IHDR: width, height, bit_depth=8, color_type=6 (RGBA)
    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    ihdr = make_chunk(b'IHDR', ihdr_data)

    # Build raw pixel data with filter byte per scanline
    raw = bytearray()
    for row in pixels:
        raw.append(0)  # filter type: None
        for code in row:
            raw.extend(PALETTE[code])

    idat = make_chunk(b'IDAT', zlib.compress(bytes(raw), 9))
    iend = make_chunk(b'IEND', b'')

    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'wb') as f:
        f.write(signature + ihdr + idat + iend)
    print(f'  Generated {filepath}')


def main():
    sizes = {16: 2, 32: 4, 48: 6, 128: 16}  # size -> corner radius

    for size, radius in sizes.items():
        scale = size // 16
        pixels = scale_art(ART_16, scale)
        pixels = apply_rounded_corners(pixels, size, radius)
        write_png(f'icons/icon{size}.png', pixels, size)

    print('\nAll icons generated in icons/')


if __name__ == '__main__':
    main()
