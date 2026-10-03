/**
 * Render the authored 24-unit Bathyline mark to the existing PWA/Apple paths.
 * All outputs are opaque ocean navy. Maskable artwork stays inside the central
 * safe circle (radius 40% of the canvas); the background covers the full canvas.
 * Uses the Playwright Chromium installed for e2e: node tools/make_icons.mjs
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const svg = readFileSync(new URL('../public/bathyline-mark.svg', import.meta.url), 'utf8');
if (!/viewBox="0 0 24 24"/.test(svg)) {
  throw new Error('The icon source must use the Bathyline 24-unit viewBox.');
}
const BG = '#06131F';
const INK = '#E8F3F1';
const CONTOUR = '#65DCCB';
const outputDir = new URL('../public/icons/', import.meta.url);
mkdirSync(outputDir, { recursive: true });

/** `pad` is the clear fraction on each side of the mark's viewBox. */
function page(size, pad) {
  const width = (1 - 2 * pad) * size;
  const mark = svg.replace(
    '<svg',
    `<svg width="${width}" height="${width}" style="position:absolute;left:${pad * size}px;top:${pad * size}px;color:${INK};--logo-contour:${CONTOUR}"`,
  );
  return `<!doctype html><body style="margin:0;background:${BG}">${mark}</body>`;
}

// The contour's furthest painted pixel is inside 12 units from the centre.
// At 14% padding its radius is below 0.72 / 2 = 36%, within the 40% safe circle.
// Never use the rounded favicon background as maskable art: it must be full bleed.
const jobs = [
  ['icon-192.png', 192, 0.08],
  ['icon-512.png', 512, 0.08],
  ['icon-maskable-192.png', 192, 0.14],
  ['icon-maskable-512.png', 512, 0.14],
  ['apple-touch-icon.png', 180, 0.08],
];

if (process.argv.includes('--native')) {
  // The Linux sandbox can prohibit Chromium. Keep SVG rasterization available
  // with the same system librsvg/Cairo used by the social-card native renderer.
  const renderer = spawn(
    'python3',
    [
      '-c',
      String.raw`
import ctypes as c
from pathlib import Path
import sys
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
svg = sys.stdin.read()
output = Path(sys.argv[1])
for name, size, pad in [
    ('icon-192.png', 192, .08), ('icon-512.png', 512, .08),
    ('icon-maskable-192.png', 192, .14), ('icon-maskable-512.png', 512, .14),
    ('apple-touch-icon.png', 180, .08),
]:
    width = (1 - 2 * pad) * size
    mark = svg.replace('<svg', f'<svg x="{pad * size}" y="{pad * size}" width="{width}" height="{width}"')
    data = f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}"><rect width="{size}" height="{size}" fill="#06131F" />{mark}</svg>'.encode()
    handle = rsvg.rsvg_handle_new_from_data(data, len(data), None)
    if not handle:
        raise RuntimeError('SVG failed to load')
    surface = cairo.cairo_image_surface_create(0, size, size)
    context = cairo.cairo_create(surface)
    try:
        if not rsvg.rsvg_handle_render_cairo(handle, context):
            raise RuntimeError('SVG rendering failed')
        if cairo.cairo_surface_write_to_png(surface, str(output / name).encode()):
            raise RuntimeError('PNG writing failed')
    finally:
        cairo.cairo_destroy(context)
        cairo.cairo_surface_destroy(surface)
    print('wrote', name, '(native renderer)')
`,
      outputDir.pathname,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  await new Promise((resolve, reject) => {
    renderer.on('error', reject);
    renderer.stdin.on('error', reject);
    renderer.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`Native icon renderer exited with ${code}`)),
    );
    renderer.stdin.end(
      svg.replaceAll('var(--logo-contour, currentColor)', CONTOUR).replaceAll('currentColor', INK),
    );
  });
  process.exit(0);
}

const browser = await chromium.launch();
try {
  for (const [name, size, pad] of jobs) {
    const p = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    });
    await p.setContent(page(size, pad));
    await p.screenshot({ path: new URL(name, outputDir).pathname });
    await p.close();
    console.log('wrote', name);
  }
} finally {
  await browser.close();
}
