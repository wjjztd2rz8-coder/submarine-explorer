import { describe, expect, it } from 'vitest';
import { crc32, writeZip } from '../../src/util/zip.js';
import { photoFilename } from '../../src/ui/PhotoGallery.js';

describe('photo ZIP export', () => {
  it('writes stored UTF-8 entries with valid local and central headers', () => {
    const data = new TextEncoder().encode('123456789');
    expect(crc32(data)).toBe(0xcbf43926);
    const name = 'épave.jpg';
    const nameBytes = new TextEncoder().encode(name);
    const archive = writeZip([{ name, data }]);
    const view = new DataView(archive.buffer);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint16(6, true)).toBe(0x0800);
    expect(view.getUint16(8, true)).toBe(0);
    expect(view.getUint32(14, true)).toBe(0xcbf43926);
    expect(view.getUint32(18, true)).toBe(data.length);
    expect(view.getUint16(26, true)).toBe(nameBytes.length);
    expect(new TextDecoder().decode(archive.slice(30, 30 + nameBytes.length))).toBe(name);
    expect(archive.slice(30 + nameBytes.length, 30 + nameBytes.length + data.length)).toEqual(data);
    const central = 30 + nameBytes.length + data.length;
    expect(view.getUint32(central, true)).toBe(0x02014b50);
    expect(view.getUint32(central + 16, true)).toBe(0xcbf43926);
    expect(view.getUint32(central + 42, true)).toBe(0);
    const end = central + 46 + nameBytes.length;
    expect(view.getUint32(end, true)).toBe(0x06054b50);
    expect(view.getUint16(end + 10, true)).toBe(1);
    expect(view.getUint32(end + 16, true)).toBe(central);
  });

  it('names a JPEG from site, caption and capture date', () => {
    expect(
      photoFilename({ siteName: 'Titanic', poiName: 'Bow section', at: '2026-09-24T11:00:00Z' }),
    ).toBe('titanic-bow-section-2026-09-24.jpg');
  });
});
