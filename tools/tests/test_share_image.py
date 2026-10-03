"""Check the shipped social image and its crawler-visible metadata offline."""
from html.parser import HTMLParser
from pathlib import Path
import struct
import unittest


ROOT = Path(__file__).resolve().parents[2]
IMAGE = ROOT / 'public/share/bathyline-og-1200x630.png'
URL = ('https://wjjztd2rz8-coder.github.io/submarine-explorer/'
       'share/bathyline-og-1200x630.png')


class Metadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = {}

    def handle_starttag(self, tag, attrs):
        if tag == 'meta':
            attrs = dict(attrs)
            key = attrs.get('property') or attrs.get('name')
            self.tags[key] = attrs.get('content')


class TestShareImage(unittest.TestCase):
    def test_png_exists_with_social_dimensions(self):
        self.assertTrue(IMAGE.is_file())
        header = IMAGE.read_bytes()[:33]
        self.assertEqual(header[:8], b'\x89PNG\r\n\x1a\n')
        self.assertEqual(header[12:16], b'IHDR')
        self.assertEqual(struct.unpack('>II', header[16:24]), (1200, 630))

    def test_social_metadata_points_to_pages_asset(self):
        parser = Metadata()
        parser.feed((ROOT / 'index.html').read_text())
        tags = parser.tags
        self.assertEqual(tags['og:image'], URL)
        self.assertEqual(tags['twitter:image'], URL)
        self.assertEqual(tags['og:image:width'], '1200')
        self.assertEqual(tags['og:image:height'], '630')
        self.assertEqual(tags['og:image:type'], 'image/png')
        self.assertEqual(tags['twitter:card'], 'summary_large_image')
        self.assertEqual(tags['og:image:alt'], tags['twitter:image:alt'])
        self.assertIn('Bathyline', tags['og:image:alt'])


if __name__ == '__main__':
    unittest.main()
