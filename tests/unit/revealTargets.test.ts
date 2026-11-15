import { describe, expect, it } from 'vitest';

/**
 * The reveal must show what the scan marker marks. The look-at point is the
 * linked prop's centre (or the POI, 5 m up) plus `target_offset`; if that point
 * is far from the POI the camera orbits some other place (S46, Hunga offsets
 * left pointing at the rim wall after the route stops were moved).
 */
type Poi = { id: string; lat: number; lon: number; reveal?: { target_offset?: number[] } };
type Prop = { id: string; lat: number; lon: number; scale?: number; dimensions_m?: number[] };

const pois = import.meta.glob('../../data/landmarks/*/pois.json', {
  eager: true,
  import: 'default',
});
const props = import.meta.glob('../../data/landmarks/*/props.json', {
  eager: true,
  import: 'default',
});

const MAX_OFFSET_M = 25;

function metres(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const k = Math.cos((a.lat * Math.PI) / 180);
  return {
    x: (b.lon - a.lon) * 111320 * k,
    z: (a.lat - b.lat) * 110574,
  };
}

describe('reveal targets stay on the scanned subject', () => {
  for (const [path, doc] of Object.entries(pois)) {
    const site = path.split('/').at(-2)!;
    if (site === '_test') continue;
    const list = (doc as { pois: Poi[] }).pois;
    const propDoc = props[path.replace('pois.json', 'props.json')] as { props: Prop[] } | undefined;
    const propList = propDoc?.props ?? [];
    for (const poi of list) {
      it(`${site}/${poi.id}`, () => {
        const o = poi.reveal?.target_offset ?? [0, 0, 0];
        // Mirror reveal.ts: nearest prop within max(25, min(80, radius)).
        let linked: { prop: Prop; d: number; r: number } | undefined;
        for (const p of propList) {
          const m = metres(poi, p);
          const d = Math.hypot(m.x, m.z);
          const dims = p.dimensions_m ?? [20, 20, 20];
          const r = 0.5 * Math.max(...dims) * (p.scale ?? 1);
          if (d <= Math.max(25, Math.min(80, r)) && (!linked || d < linked.d))
            linked = { prop: p, d, r };
        }
        // Look-at point relative to the POI, horizontally.
        let tx = o[0]!;
        let tz = o[2]!;
        let allowed = MAX_OFFSET_M;
        if (linked) {
          const m = metres(poi, linked.prop);
          tx += m.x;
          tz += m.z;
          // Aiming along a big linked prop (a hull's far end) is fine while still on it.
          const onProp = Math.hypot(o[0]!, o[2]!) <= linked.r;
          allowed = onProp ? Math.max(MAX_OFFSET_M, linked.d + linked.r) : MAX_OFFSET_M;
        }
        expect(Math.hypot(tx, tz)).toBeLessThanOrEqual(allowed);
      });
    }
  }
});
