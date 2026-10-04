"""Offline checks for the shipped identity, portable SVGs and PWA dimensions."""
from html.parser import HTMLParser
from pathlib import Path
import json
import re
import struct
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
SVG = '{http://www.w3.org/2000/svg}'


class Identity(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta = {}
        self.title = ''
        self.in_title = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta':
            self.meta[attrs.get('property') or attrs.get('name')] = attrs.get('content')
        elif tag == 'title':
            self.in_title = True

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data


class TestBathylineBrand(unittest.TestCase):
    def test_public_names_agree_with_runtime_constant(self):
        name = re.search(r"APP_NAME = '([^']+)'", (ROOT / 'src/core/Brand.ts').read_text())[1]
        self.assertEqual(name, 'Bathyline')
        html = Identity()
        html.feed((ROOT / 'index.html').read_text())
        self.assertEqual(html.title, name)
        for key in ['application-name', 'apple-mobile-web-app-title', 'og:site_name']:
            self.assertEqual(html.meta[key], name)
        for key in ['og:title', 'twitter:title']:
            self.assertEqual(html.meta[key], f'{name}: Explore the real deep.')
        manifest = json.loads((ROOT / 'public/manifest.webmanifest').read_text())
        self.assertEqual(manifest['name'], name)
        self.assertEqual(manifest['short_name'], name)
        self.assertEqual((ROOT / 'README.md').read_text().splitlines()[0], '# ' + name)
        public_files = [ROOT / filename for filename in [
            'index.html', 'public/manifest.webmanifest', 'README.md',
            'LICENSE', 'LICENSE-CONTENT.md', 'preview/vehicles.html',
            'docs/data-sources.md', 'docs/art-direction.md', 'docs/assets.md',
            'docs/deploy.md', 'docs/landmarks.md', 'docs/architecture.md',
        ]]
        public_files.extend((ROOT / 'src').rglob('*.ts'))
        for path in public_files:
            with self.subTest(path=str(path.relative_to(ROOT))):
                self.assertNotIn('submarine explorer', path.read_text().lower())

    def test_svg_themes_and_legacy_urls_share_contours(self):
        def paths(filename):
            doc = ET.parse(ROOT / filename).getroot()
            self.assertEqual(doc.attrib['viewBox'], '0 0 24 24')
            return [path.attrib['d'] for path in doc.iter(SVG + 'path')]

        for suffix, theme_prefix in [('', ''), ('-small', 'small-')]:
            source = paths(f'public/bathyline-mark{suffix}.svg')
            for theme in ['dark', 'light']:
                self.assertEqual(source, paths(f'public/brand/mark-{theme_prefix}{theme}.svg'))
            self.assertEqual(len(source), 2 if suffix else 3)
        self.assertEqual(paths('public/favicon.svg'), paths('public/bathyline-mark-small.svg'))

    def test_wordmarks_are_portable_outlined_svg(self):
        for theme in ['dark', 'light']:
            doc = ET.parse(ROOT / f'public/brand/wordmark-{theme}.svg').getroot()
            self.assertEqual(doc.attrib['aria-label'], 'Bathyline')
            self.assertGreater(len(list(doc.iter(SVG + 'path'))), 8)
            for forbidden in ['text', 'image', 'script', 'foreignObject']:
                self.assertEqual(list(doc.iter(SVG + forbidden)), [])
            # The mark remains 24 units at scale 2.5 in both outlined wordmarks.
            group = doc.find(SVG + 'g')
            source = ET.parse(ROOT / f'public/brand/mark-{theme}.svg').getroot()
            self.assertEqual([x.attrib['d'] for x in group.iter(SVG + 'path')],
                             [x.attrib['d'] for x in source.iter(SVG + 'path')])

    def test_pwa_png_dimensions_and_full_bleed_maskable_background(self):
        manifest = json.loads((ROOT / 'public/manifest.webmanifest').read_text())
        for icon in manifest['icons'] + [{'src': 'icons/apple-touch-icon.png', 'sizes': '180x180'}]:
            data = (ROOT / 'public' / icon['src']).read_bytes()
            self.assertEqual(data[:8], b'\x89PNG\r\n\x1a\n')
            self.assertEqual(data[12:16], b'IHDR')
            width, height = struct.unpack('>II', data[16:24])
            self.assertEqual(f'{width}x{height}', icon['sizes'])
            self.assertEqual(data[24], 8)
            # PNG RGB/RGBA only; no palette or keyed transparent backgrounds.
            self.assertIn(data[25], [2, 6])
            self.assertNotIn(b'tRNS', data)
        maskable = [x for x in manifest['icons'] if x['purpose'] == 'maskable']
        self.assertEqual({x['sizes'] for x in maskable}, {'192x192', '512x512'})


if __name__ == '__main__':
    unittest.main()
