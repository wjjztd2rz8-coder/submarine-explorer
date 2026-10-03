/**
 * Original Bathyline social card. Rebuild with: node tools/make_share_image.mjs
 * Uses the same installed Playwright Chromium as make_icons.mjs. Embedded local
 * WOFF2 fonts and fixed SVG geometry keep rendering independent of network/fonts.
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const WIDTH = 1200;
const HEIGHT = 630;
const outputDir = new URL('../public/share/', import.meta.url);
const font = (name) =>
  readFileSync(new URL(`../public/fonts/${name}`, import.meta.url)).toString('base64');
const mark = readFileSync(new URL('../public/bathyline-mark.svg', import.meta.url), 'utf8');
if (!/viewBox="0 0 24 24"/.test(mark)) {
  throw new Error('The source must use the Bathyline 24-unit viewBox.');
}

// Authored contour shapes suggest a quiet canyon; they are not measured terrain.
const contours = Array.from({ length: 12 }, (_, ring) => {
  const points = Array.from({ length: 144 }, (_, step) => {
    const angle = (step / 144) * Math.PI * 2;
    const relief = 1 + 0.085 * Math.sin(3 * angle + 0.6) + 0.045 * Math.cos(5 * angle);
    const x = 1090 + (125 + ring * 43) * relief * Math.cos(angle);
    const y = 345 + (78 + ring * 31) * relief * Math.sin(angle);
    return `${step === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
  });
  return `<path d="${points.join(' ')} Z" stroke-opacity="${ring % 3 === 0 ? 0.28 : 0.14}" />`;
}).join('\n');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <title>Bathyline: Explore the real deep.</title>
  <defs>
    <style>
      @font-face {
        font-family: 'Source Serif 4'; font-weight: 600; font-style: normal;
        src: url(data:font/woff2;base64,${font('source-serif-4-latin-600-normal.woff2')}) format('woff2');
      }
      @font-face {
        font-family: 'DM Sans'; font-weight: 400; font-style: normal;
        src: url(data:font/woff2;base64,${font('dm-sans-latin-400-normal.woff2')}) format('woff2');
      }
    </style>
    <linearGradient id="navy" x2="1" y2="1">
      <stop stop-color="#102C3C" />
      <stop offset="0.6" stop-color="#091E2E" />
      <stop offset="1" stop-color="#06131F" />
    </linearGradient>
    <radialGradient id="contour-fade" cx="100%" cy="55%" r="85%">
      <stop stop-color="white" />
      <stop offset="0.65" stop-color="white" stop-opacity="0.65" />
      <stop offset="1" stop-color="white" stop-opacity="0" />
    </radialGradient>
    <mask id="contour-mask"><rect width="1200" height="630" fill="url(#contour-fade)" /></mask>
  </defs>
  <rect width="1200" height="630" fill="url(#navy)" />
  <g fill="none" stroke="#65DCCB" stroke-width="1.5" mask="url(#contour-mask)">
    ${contours}
  </g>
  ${mark.replace('<svg', '<svg x="116" y="232" width="120" height="120" style="color:#E8F3F1;--logo-contour:#65DCCB"')}
  <text x="270" y="329" fill="#E8F3F1" font-family="Source Serif 4" font-weight="600" font-size="104" letter-spacing="-3">Bathyline</text>
  <text x="276" y="394" fill="#B6D2D5" font-family="DM Sans" font-weight="400" font-size="32">Explore the real deep.</text>
</svg>`;

mkdirSync(outputDir, { recursive: true });
const pngPath = fileURLToPath(new URL('bathyline-og-1200x630.png', outputDir));
if (process.argv.includes('--native')) {
  // Explicit Linux-only fallback for sandboxes that cannot launch Chromium.
  // Uses existing system libraries, not npm/pip dependencies. The canonical
  // renderer below remains the same Playwright toolchain as make_icons.mjs.
  const renderer = spawn(
    'python3',
    [
      '-c',
      String.raw`
import ctypes as c
from ctypes.util import find_library
from pathlib import Path
import re
import sys

# Decode the bundled WOFF2 without installing packages. HarfBuzz shapes and
# outlines the resulting fonts directly, preventing Pango/system-font fallback.
woff = c.CDLL(find_library('woff2dec'))
final_size = woff._ZN5woff221ComputeWOFF2FinalSizeEPKhm
final_size.argtypes = [c.c_char_p, c.c_size_t]
final_size.restype = c.c_size_t
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
fonts = {}
for family, name in [('Source Serif 4', 'source-serif-4-latin-600-normal.woff2'),
                     ('DM Sans', 'dm-sans-latin-400-normal.woff2')]:
    data = (Path(sys.argv[1]) / name).read_bytes()
    size = final_size(data, len(data))
    output = c.create_string_buffer(size)
    if not size or not convert(output, size, data, len(data)):
        raise RuntimeError('Brand font failed to decode: ' + name)
    blob = blob_create(output.raw, size, 0, None, None)
    fonts[family] = font_create(face_create(blob, 0))
    font_funcs(fonts[family])

def outline_text(match):
    attrs = dict(re.findall(r'([\w-]+)="([^"]+)"', match[1]))
    font = fonts[attrs['font-family']]
    size = round(float(attrs['font-size']) * 64)
    font_scale(font, size, size)
    buf = buffer_create()
    text = match[2].encode()
    buffer_add(buf, text, len(text), 0, len(text))
    buffer_guess(buf)
    shape(font, buf, None, 0)
    count = uint()
    glyphs, offsets = infos(buf, c.byref(count)), positions(buf, c.byref(count))
    draw = draw_create()
    path = []
    xy = lambda x, y: f'{x / 64:.3f} {-y / 64:.3f}'
    callbacks = []
    for kind, coords, callback in [
        ('move_to', 2, lambda a, b, s, x, y, u: path.append('M' + xy(x, y))),
        ('line_to', 2, lambda a, b, s, x, y, u: path.append('L' + xy(x, y))),
        ('quadratic_to', 4, lambda a, b, s, x, y, ex, ey, u: path.append('Q' + xy(x, y) + ' ' + xy(ex, ey))),
        ('cubic_to', 6, lambda a, b, s, x, y, x2, y2, ex, ey, u: path.append('C' + xy(x, y) + ' ' + xy(x2, y2) + ' ' + xy(ex, ey))),
        ('close_path', 0, lambda a, b, s, u: path.append('Z')),
    ]:
        callback_type = c.CFUNCTYPE(None, ptr, ptr, ptr, *([c.c_float] * coords), ptr)
        cb = callback_type(callback)
        callbacks.append(cb)
        api('hb_draw_funcs_set_' + kind + '_func', None, ptr, callback_type, ptr, ptr)(draw, cb, None, None)
    x, y = float(attrs['x']), float(attrs['y'])
    spacing = float(attrs.get('letter-spacing', '0'))
    result = []
    for i in range(count.value):
        path.clear()
        draw_glyph(font, glyphs[i].codepoint, draw, None)
        p = offsets[i]
        result.append(f'<path transform="translate({x + p.x_offset / 64:.3f} {y - p.y_offset / 64:.3f})" d="{" ".join(path)}" />')
        x += p.x_advance / 64 + spacing
    return f'<g fill="{attrs["fill"]}">{"".join(result)}</g>'

svg = sys.stdin.read()
svg = re.sub(r'<text ([^>]+)>([^<]+)</text>', outline_text, svg)
svg = re.sub(r'<style>.*?</style>', '', svg, flags=re.S)
svg = svg.replace('var(--logo-contour, currentColor)', '#65DCCB').encode()
rsvg = c.CDLL('librsvg-2.so.2')
cairo = c.CDLL('libcairo.so.2')
rsvg.rsvg_handle_new_from_data.argtypes = [c.c_char_p, c.c_size_t, c.c_void_p]
rsvg.rsvg_handle_new_from_data.restype = c.c_void_p
rsvg.rsvg_handle_render_cairo.argtypes = [c.c_void_p, c.c_void_p]
rsvg.rsvg_handle_render_cairo.restype = c.c_int
cairo.cairo_image_surface_create.argtypes = [c.c_int, c.c_int, c.c_int]
cairo.cairo_image_surface_create.restype = c.c_void_p
cairo.cairo_create.argtypes = [c.c_void_p]
cairo.cairo_create.restype = c.c_void_p
cairo.cairo_surface_write_to_png.argtypes = [c.c_void_p, c.c_char_p]
cairo.cairo_surface_write_to_png.restype = c.c_int
cairo.cairo_destroy.argtypes = [c.c_void_p]
cairo.cairo_surface_destroy.argtypes = [c.c_void_p]
handle = rsvg.rsvg_handle_new_from_data(svg, len(svg), None)
if not handle:
    raise RuntimeError('SVG failed to load')
surface = cairo.cairo_image_surface_create(0, 1200, 630)
context = cairo.cairo_create(surface)
try:
    if not rsvg.rsvg_handle_render_cairo(handle, context):
        raise RuntimeError('SVG rendering failed')
    if cairo.cairo_surface_write_to_png(surface, sys.argv[2].encode()) != 0:
        raise RuntimeError('PNG writing failed')
finally:
    cairo.cairo_destroy(context)
    cairo.cairo_surface_destroy(surface)
`,
      fileURLToPath(new URL('../public/fonts/', import.meta.url)),
      pngPath,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  await new Promise((resolve, reject) => {
    renderer.on('error', reject);
    renderer.stdin.on('error', reject);
    renderer.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`Native SVG renderer exited with ${code}`)),
    );
    renderer.stdin.end(svg);
  });
  console.log('wrote public/share/bathyline-og-1200x630.png (native renderer)');
  process.exit(0);
}
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });
  await page.setContent(`<!doctype html><body style="margin:0">${svg}</body>`);
  await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('600 104px "Source Serif 4"', 'Bathyline'),
      document.fonts.load('400 32px "DM Sans"', 'Explore the real deep.'),
    ]);
    await document.fonts.ready;
    if (document.fonts.size !== 2 || [...document.fonts].some((face) => face.status !== 'loaded')) {
      throw new Error('Brand fonts failed to load; refusing a fallback-font card.');
    }
  });
  await page.screenshot({ path: pngPath });
  console.log('wrote public/share/bathyline-og-1200x630.png');
} finally {
  await browser.close();
}
