/** Small ZIP archive writer for stored (uncompressed) files. */
export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

const encoder = new TextEncoder();

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function writeZip(entries: readonly ZipEntry[]): Uint8Array {
  if (entries.length > 0xffff) throw new RangeError('Too many ZIP entries');
  const parts: Uint8Array[] = [];
  const directory: Uint8Array[] = [];
  let offset = 0;
  let directorySize = 0;
  const u16 = (view: DataView, at: number, value: number) => view.setUint16(at, value, true);
  const u32 = (view: DataView, at: number, value: number) => view.setUint32(at, value, true);
  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    if (name.length > 0xffff || entry.data.length > 0xffffffff)
      throw new RangeError('ZIP entry too large');
    const checksum = crc32(entry.data);
    const local = new Uint8Array(30 + name.length);
    const l = new DataView(local.buffer);
    u32(l, 0, 0x04034b50);
    u16(l, 4, 20); // version needed
    u16(l, 6, 0x0800); // UTF-8 names
    u16(l, 8, 0); // STORE
    u16(l, 12, 0x21); // 1980-01-01, earliest DOS date
    u32(l, 14, checksum);
    u32(l, 18, entry.data.length);
    u32(l, 22, entry.data.length);
    u16(l, 26, name.length);
    local.set(name, 30);
    parts.push(local, entry.data);

    const central = new Uint8Array(46 + name.length);
    const c = new DataView(central.buffer);
    u32(c, 0, 0x02014b50);
    u16(c, 4, 20); // made by
    u16(c, 6, 20);
    u16(c, 8, 0x0800);
    u16(c, 10, 0);
    u16(c, 14, 0x21);
    u32(c, 16, checksum);
    u32(c, 20, entry.data.length);
    u32(c, 24, entry.data.length);
    u16(c, 28, name.length);
    u32(c, 42, offset);
    central.set(name, 46);
    directory.push(central);
    offset += local.length + entry.data.length;
    directorySize += central.length;
    if (offset > 0xffffffff) throw new RangeError('ZIP archive too large');
  }
  const end = new Uint8Array(22);
  const e = new DataView(end.buffer);
  u32(e, 0, 0x06054b50);
  u16(e, 8, entries.length);
  u16(e, 10, entries.length);
  u32(e, 12, directorySize);
  u32(e, 16, offset);
  const archive = new Uint8Array(offset + directorySize + end.length);
  let cursor = 0;
  for (const part of [...parts, ...directory, end]) {
    archive.set(part, cursor);
    cursor += part.length;
  }
  return archive;
}
