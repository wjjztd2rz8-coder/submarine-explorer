#!/usr/bin/env python3
"""Outline the local OFL Source Serif 4 into portable Bathyline SVG wordmarks.

No font download or Python packages: uses system HarfBuzz and libwoff2dec, the
same libraries as make_share_image.mjs --native. Rebuild after editing the marks:
    python3 tools/make_brand_wordmarks.py
"""
import ctypes as c
from ctypes.util import find_library
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
woff = c.CDLL(find_library('woff2dec'))
size_of = woff._ZN5woff221ComputeWOFF2FinalSizeEPKhm
size_of.argtypes = [c.c_char_p, c.c_size_t]
size_of.restype = c.c_size_t
convert = woff._ZN5woff217ConvertWOFF2ToTTFEPhmPKhm
convert.argtypes = [c.c_void_p, c.c_size_t, c.c_char_p, c.c_size_t]
convert.restype = c.c_bool
hb = c.CDLL(find_library('harfbuzz'))


def api(name, result, *args):
    fn = getattr(hb, name)
    fn.restype, fn.argtypes = result, list(args)
    return fn


ptr, uint = c.c_void_p, c.c_uint
blob_create = api('hb_blob_create', ptr, c.c_char_p, uint, uint, ptr, ptr)
face_create = api('hb_face_create', ptr, ptr, uint)
font_create = api('hb_font_create', ptr, ptr)
font_funcs = api('hb_ot_font_set_funcs', None, ptr)
font_scale = api('hb_font_set_scale', None, ptr, c.c_int, c.c_int)
buffer_create = api('hb_buffer_create', ptr)
buffer_add = api('hb_buffer_add_utf8', None, ptr, c.c_char_p, c.c_int, uint, c.c_int)
buffer_guess = api('hb_buffer_guess_segment_properties', None, ptr)
shape = api('hb_shape', None, ptr, ptr, ptr, uint)
draw_create = api('hb_draw_funcs_create', ptr)
draw_glyph = api('hb_font_get_glyph_shape', None, ptr, uint, ptr, ptr)


class Info(c.Structure):
    _fields_ = [(name, uint) for name in ['codepoint', 'mask', 'cluster', 'var1', 'var2']]


class Position(c.Structure):
    _fields_ = [(name, c.c_int) for name in ['x_advance', 'y_advance', 'x_offset', 'y_offset', 'var']]


infos = api('hb_buffer_get_glyph_infos', c.POINTER(Info), ptr, c.POINTER(uint))
positions = api('hb_buffer_get_glyph_positions', c.POINTER(Position), ptr, c.POINTER(uint))
data = (ROOT / 'public/fonts/source-serif-4-latin-600-normal.woff2').read_bytes()
size = size_of(data, len(data))
output = c.create_string_buffer(size)
if not size or not convert(output, size, data, len(data)):
    raise RuntimeError('Source Serif 4 failed to decode')
font = font_create(face_create(blob_create(output.raw, size, 0, None, None), 0))
font_funcs(font)
font_scale(font, 64 * 64, 64 * 64)
buf = buffer_create()
text = b'Bathyline'
buffer_add(buf, text, len(text), 0, len(text))
buffer_guess(buf)
shape(font, buf, None, 0)
count = uint()
glyphs, offsets = infos(buf, c.byref(count)), positions(buf, c.byref(count))
draw = draw_create()
path, callbacks = [], []


def xy(x, y):
    return f'{x / 64:.3f} {-y / 64:.3f}'


for kind, coords, callback in [
    ('move_to', 2, lambda a, b, s, x, y, u: path.append('M' + xy(x, y))),
    ('line_to', 2, lambda a, b, s, x, y, u: path.append('L' + xy(x, y))),
    ('quadratic_to', 4, lambda a, b, s, x, y, ex, ey, u: path.append('Q' + xy(x, y) + ' ' + xy(ex, ey))),
    ('cubic_to', 6, lambda a, b, s, x, y, ex, ey, fx, fy, u: path.append('C' + xy(x, y) + ' ' + xy(ex, ey) + ' ' + xy(fx, fy))),
    ('close_path', 0, lambda a, b, s, u: path.append('Z')),
]:
    signature = c.CFUNCTYPE(None, ptr, ptr, ptr, *([c.c_float] * coords), ptr)
    cb = signature(callback)
    callbacks.append(cb)
    api('hb_draw_funcs_set_' + kind + '_func', None, ptr, signature, ptr, ptr)(draw, cb, None, None)

x, outlines = 90.0, []
for i in range(count.value):
    path.clear()
    draw_glyph(font, glyphs[i].codepoint, draw, None)
    p = offsets[i]
    outlines.append(f'<path transform="translate({x + p.x_offset / 64:.3f} {61 - p.y_offset / 64:.3f})" d="{" ".join(path)}" />')
    x += p.x_advance / 64 + 0.64

for theme, ink in [('dark', '#E8F3F1'), ('light', '#06131F')]:
    mark = (ROOT / f'public/brand/mark-{theme}.svg').read_text()
    attrs, body = re.search(r'<svg ([^>]+)>(.*?)</svg>', mark, re.S).groups()
    attrs = re.sub(r'\s*(?:xmlns|viewBox|role|aria-label)="[^"]*"', '', attrs)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {x + 6:.3f} 80" role="img" aria-label="Bathyline">
  <!-- Source Serif 4 outlines: SIL OFL 1.1, public/fonts/Source-Serif-4-OFL.txt. -->
  <g transform="translate(2 10) scale(2.5)" {attrs}>{body}</g>
  <g fill="{ink}">{''.join(outlines)}</g>
</svg>
'''
    dest = ROOT / f'public/brand/wordmark-{theme}.svg'
    dest.write_text(svg)
    print('wrote', dest.relative_to(ROOT))
