import { afterEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { execFile } from 'node:child_process';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { Buffer } from 'node:buffer';
import { crc32, writeZip } from '../../src/util/zip.js';
import { PhotoGallery, photoFilename } from '../../src/ui/PhotoGallery.js';
import { PHOTO_LIMIT, PhotoStore, type Photo } from '../../src/game/PhotoStore.js';
import { DiscoveryStore } from '../../src/game/DiscoveryStore.js';

// Reuse the photoMode capability's EventTarget DOM fixture pattern. Images are inert.
class Element extends EventTarget {
  children: Element[] = [];
  parentElement: Element | null = null;
  textContent = '';
  className = '';
  dataset: Record<string, string> = {};
  href = '';
  download = '';
  append(...children: Element[]) {
    for (const child of children) {
      child.parentElement = this;
      this.children.push(child);
    }
  }
  replaceChildren(...children: Element[]) {
    this.children = [];
    this.append(...children);
  }
  setAttribute() {}
  remove() {
    if (this.parentElement)
      this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
    this.parentElement = null;
  }
  click() {
    this.dispatchEvent(new Event('click'));
  }
}

function downloadFixture() {
  vi.useFakeTimers();
  const body = new Element();
  const links: Element[] = [];
  const blobs: Blob[] = [];
  vi.stubGlobal('document', {
    body,
    createElement: (tag: string) => {
      const node = new Element();
      if (tag === 'a') {
        node.click = () => links.push(node);
      }
      return node;
    },
  });
  vi.stubGlobal('window', { setTimeout, clearTimeout });
  const create = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    blobs.push(blob as Blob);
    return `blob:journal-${blobs.length}`;
  });
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  return { body, links, blobs, create, revoke };
}

function exportButton(gallery: PhotoGallery, photos: readonly Photo[]): Element {
  const container = new Element();
  gallery.render(container as unknown as HTMLElement, photos);
  const button = container.children[0].children.find(
    (node) => node.className === 'd2-photo-download-all',
  );
  expect(button?.textContent).toBe('Download all');
  return button!;
}

// zipfile is the extraction oracle; struct checks the headers it doesn't compare on read.
// No production CRC or ZIP parsing code is used to establish expected bytes/metadata.
async function checkArchive(
  archive: Uint8Array,
  names: readonly string[],
  payloads: readonly Uint8Array[],
) {
  const output = await new Promise<string>((resolve, reject) => {
    const child = execFile(
      'python3',
      [
        '-c',
        `
import base64, binascii, io, json, struct, sys, zipfile
request = json.load(sys.stdin)
raw = base64.b64decode(request['archive'])
expected = [base64.b64decode(data) for data in request['payloads']]
with zipfile.ZipFile(io.BytesIO(raw)) as archive:
    infos = archive.infolist()
    assert archive.namelist() == request['names'], archive.namelist()
    assert len(set(archive.namelist())) == len(infos)
    assert archive.testzip() is None
    end = struct.unpack_from('<4s4H2IH', raw, len(raw) - 22)
    assert end[:5] == (b'PK\x05\x06', 0, 0, len(infos), len(infos)), end
    assert end[7] == 0
    central = archive.start_dir
    assert end[6] == central
    assert central + end[5] == len(raw) - 22
    offset = 0
    assert len(infos) == len(expected)
    for info, data in zip(infos, expected):
        assert archive.read(info) == data, info.filename
        assert info.flag_bits == 0x800
        assert info.compress_type == zipfile.ZIP_STORED
        assert info.file_size == info.compress_size == len(data)
        assert info.CRC == binascii.crc32(data)
        assert info.header_offset == offset
        local = struct.unpack_from('<4s5H3I2H', raw, offset)
        directory = struct.unpack_from('<4s6H3I5H2I', raw, central)
        assert local[0] == b'PK\x03\x04'
        assert directory[0] == b'PK\x01\x02'
        assert local[1:9] == directory[2:10], (local, directory)
        assert local[2] == directory[3] == info.flag_bits
        assert local[6] == directory[7] == info.CRC
        assert local[7:9] == directory[8:10] == (len(data), len(data))
        assert directory[16] == info.header_offset
        name = info.filename.encode('utf-8')
        assert local[9] == directory[10] == len(name)
        assert raw[offset + 30:offset + 30 + local[9]] == name
        assert raw[central + 46:central + 46 + directory[10]] == name
        assert local[10] == directory[11] == directory[12] == 0
        offset += 30 + local[9] + local[10] + len(data)
        central += 46 + directory[10] + directory[11] + directory[12]
    assert offset == archive.start_dir
    assert central == len(raw) - 22
    print(json.dumps(archive.namelist()))
`,
      ],
      { encoding: 'utf8' },
      (error: Error | null, stdout: string, stderr: string) => {
        if (error) reject(new Error(`${error.message}\n${stderr}`));
        else resolve(stdout);
      },
    );
    child.stdin.end(
      JSON.stringify({
        archive: Buffer.from(archive).toString('base64'),
        names,
        payloads: payloads.map((data) => Buffer.from(data).toString('base64')),
      }),
    );
  });
  expect(JSON.parse(output)).toEqual(names);
}

function retainedPhotos() {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  const discoveries = new DiscoveryStore(storage, () => new Date('2026-10-21T12:00:00Z'));
  discoveries.record('titanic', 'titanic-bow');
  const store = new PhotoStore(storage);
  const jpeg = new Uint8Array(readFileSync('public/assets/terrain/silt_a.jpg'));
  expect([...jpeg.slice(0, 2)]).toEqual([0xff, 0xd8]);
  expect([...jpeg.slice(-2)]).toEqual([0xff, 0xd9]);
  const metadata: [string, string | null, string][] = [
    ['Titanic', 'Bow section', '2026-10-21'],
    ['Titanic', 'Bow section', '2026-10-21'],
    ['Titanic', 'Bow section', '2026-10-21'],
    ['Titánic', 'Bów section', '2026-10-21'],
    ['TITANIC', 'Bow-section', '2026-10-21'],
    ['Titanic', null, '2026-10-21'],
    ['Titanic', 'Photo', '2026-10-21'],
    ['Lost City', 'The chimneys', '2026-10-21'],
    ['Lost-City', 'The chimneys', '2026-10-21'],
    ['Titanic', 'Bow section', '2026-10-20'],
  ];
  const payloads = Array.from({ length: PHOTO_LIMIT }, (_, i) => {
    // A JPEG comment gives each valid image distinct binary bytes and size, without decoding.
    const comment = Uint8Array.from({ length: i + 1 }, (_, n) => (i * 17 + n) % 256);
    return Uint8Array.from([
      0xff,
      0xd8,
      0xff,
      0xfe,
      0,
      comment.length + 2,
      ...comment,
      ...jpeg.slice(2),
    ]);
  });
  const photos = payloads.map((data, i): Photo => {
    const [siteName, poiName, day] = metadata[i] ?? ['Titanic', null, '2026-10-19'];
    return {
      id: `p${i}`,
      siteId: siteName.startsWith('Lost') ? 'lost-city' : 'titanic',
      siteName,
      poiId: poiName === null ? null : 'caption',
      poiName,
      at: `${day}T${String(23 - i).padStart(2, '0')}:00:00Z`,
      depthM: 100 + i,
      image: `data:image/jpeg;base64,${Buffer.from(data).toString('base64')}`,
    };
  });
  for (const photo of [...photos].reverse())
    expect(store.save(photo)).toEqual({ saved: true, dropped: 0 });
  expect(store.photos).toEqual(photos);
  expect(new PhotoStore(storage).photos).toEqual(photos);
  return { store, storage, values, discoveries, payloads };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('photo ZIP export', () => {
  it('writes stored UTF-8 entries with valid local and central headers', async () => {
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
    await checkArchive(archive, [name], [data]);
  });

  it('names a JPEG from site, caption and capture date', () => {
    expect(
      photoFilename({ siteName: 'Titanic', poiName: 'Bow section', at: '2026-09-24T11:00:00Z' }),
    ).toBe('titanic-bow-section-2026-09-24.jpg');
  });
});

describe('gallery download action', () => {
  it('round-trips every retained JPEG with unique names and leaves photos/discoveries unchanged', async () => {
    const fixture = downloadFixture();
    const { store, storage, values, discoveries, payloads } = retainedPhotos();
    const beforeStorage = [...values];
    const beforePhotos = JSON.stringify(store.photos);
    const beforeDiscoveries = discoveries.snapshot();
    const onChange = vi.fn();
    const write = vi.spyOn(storage, 'setItem');
    const gallery = new PhotoGallery(store, onChange);
    try {
      exportButton(gallery, store.photos).click();
      expect(fixture.links.map((link) => [link.href, link.download])).toEqual([
        ['blob:journal-1', 'journal-photos.zip'],
      ]);
      expect(fixture.body.children).toHaveLength(0);
      expect(fixture.create).toHaveBeenCalledOnce();
      expect(fixture.blobs[0].type).toBe('application/zip');
      const names = [
        'titanic-bow-section-2026-10-21.jpg',
        'titanic-bow-section-2026-10-21-2.jpg',
        'titanic-bow-section-2026-10-21-3.jpg',
        'titanic-bow-section-2026-10-21-4.jpg',
        'titanic-bow-section-2026-10-21-5.jpg',
        'titanic-photo-2026-10-21.jpg',
        'titanic-photo-2026-10-21-2.jpg',
        'lost-city-the-chimneys-2026-10-21.jpg',
        'lost-city-the-chimneys-2026-10-21-2.jpg',
        'titanic-bow-section-2026-10-20.jpg',
        'titanic-photo-2026-10-19.jpg',
        'titanic-photo-2026-10-19-2.jpg',
        'titanic-photo-2026-10-19-3.jpg',
        'titanic-photo-2026-10-19-4.jpg',
        'titanic-photo-2026-10-19-5.jpg',
        'titanic-photo-2026-10-19-6.jpg',
        'titanic-photo-2026-10-19-7.jpg',
        'titanic-photo-2026-10-19-8.jpg',
        'titanic-photo-2026-10-19-9.jpg',
        'titanic-photo-2026-10-19-10.jpg',
        'titanic-photo-2026-10-19-11.jpg',
        'titanic-photo-2026-10-19-12.jpg',
        'titanic-photo-2026-10-19-13.jpg',
        'titanic-photo-2026-10-19-14.jpg',
      ];
      expect(names).toHaveLength(PHOTO_LIMIT);
      await checkArchive(new Uint8Array(await fixture.blobs[0].arrayBuffer()), names, payloads);
      expect(JSON.stringify(store.photos)).toBe(beforePhotos);
      expect(discoveries.snapshot()).toEqual(beforeDiscoveries);
      expect([...values]).toEqual(beforeStorage);
      expect(new PhotoStore(storage).photos).toEqual(store.photos);
      expect(new DiscoveryStore(storage).snapshot()).toEqual(beforeDiscoveries);
      expect(write).not.toHaveBeenCalled();
      expect(onChange).not.toHaveBeenCalled();
    } finally {
      gallery.dispose();
    }
    expect(vi.getTimerCount()).toBe(0);
    expect(fixture.revoke.mock.calls).toEqual([['blob:journal-1']]);
  });

  it('keeps each export URL alive for its delay and disposes all remaining exports exactly once', () => {
    const fixture = downloadFixture();
    const { store } = retainedPhotos();
    const gallery = new PhotoGallery(store);
    try {
      const button = exportButton(gallery, store.photos);
      button.click();
      vi.advanceTimersByTime(10_000);
      button.click();
      expect(vi.getTimerCount()).toBe(2);
      vi.advanceTimersByTime(19_999);
      expect(fixture.revoke).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(fixture.revoke.mock.calls).toEqual([['blob:journal-1']]);
      expect(vi.getTimerCount()).toBe(1);
      vi.advanceTimersByTime(9_999);
      expect(fixture.revoke).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(1);
      expect(fixture.revoke.mock.calls).toEqual([['blob:journal-1'], ['blob:journal-2']]);
      expect(vi.getTimerCount()).toBe(0);
      button.click();
      button.click();
      expect(fixture.create).toHaveBeenCalledTimes(4);
      expect(vi.getTimerCount()).toBe(2);
      gallery.dispose();
      gallery.dispose();
      expect(fixture.revoke.mock.calls).toEqual([
        ['blob:journal-1'],
        ['blob:journal-2'],
        ['blob:journal-3'],
        ['blob:journal-4'],
      ]);
      expect(vi.getTimerCount()).toBe(0);
      vi.advanceTimersByTime(60_000);
      expect(fixture.revoke).toHaveBeenCalledTimes(4);
      expect(fixture.links).toHaveLength(4);
      expect(fixture.body.children).toHaveLength(0);
    } finally {
      gallery.dispose();
    }
  });
});
