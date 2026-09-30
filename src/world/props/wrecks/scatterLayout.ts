/**
 * Deterministic layout for wreck scatter kits (debris fields, boiler clusters,
 * slide blocks, fallen rigging). Pure maths, no three.js objects, so tests
 * can check counts, ranges and determinism cheaply.
 *
 * A kit is a list of piece kinds, each with a count, a size range, a
 * placement area (a disc or an ellipse, optionally pulled toward the centre
 * or strung along a line) and how it sits (lying flat, upright, tumbled, how
 * deep it is sunk). Counts scale with the tier's debris density; `small`
 * kinds are dropped entirely on tiers without small debris.
 */

export interface ScatterKind {
  /** Stable name; also names the InstancedMesh (`<kit>-<name>`). */
  name: string;
  /** Pieces at density 1. */
  count: number;
  /** Uniform scale range, or per-axis [min, max] triples for (x, y, z). */
  size:
    | readonly [number, number]
    | readonly [readonly [number, number], readonly [number, number], readonly [number, number]];
  /** Share the same random factor across axes for triple sizes (keeps proportions). */
  proportional?: boolean;
  /** `lie`: random yaw, small tilt; `upright`: yaw only; `tumble`: any orientation. */
  pose: 'lie' | 'upright' | 'tumble';
  /** Fraction of the piece's (unit) height pushed below the ground. */
  sink?: number;
  /** 0 = uniform over the area, 1 = strongly clustered at the centre. */
  cluster?: number;
  /** Only placed on tiers with small debris. */
  small?: boolean;
  /** Restrict to a sub-area: fraction of the kit radius (inner, outer). */
  ring?: readonly [number, number];
  /** Yaw along the kit's Z axis (either way) plus up to this much jitter (radians), not random. */
  align?: number;
  /** Fixed placements (local x, z, yaw) instead of random ones; count is ignored. */
  fixed?: ReadonlyArray<readonly [number, number, number]>;
}

export interface ScatterSpec {
  /** Half-extent across X (m). */
  rx: number;
  /** Half-extent along Z (m); equal to rx for a disc. */
  rz: number;
  kinds: readonly ScatterKind[];
}

export interface ScatterPlacement {
  kind: string;
  x: number;
  /** Ground height at (x, z), before sinking. */
  ground: number;
  z: number;
  /** Scale (x, y, z). */
  sx: number;
  sy: number;
  sz: number;
  /** Euler angles (YXZ order), radians. */
  rx: number;
  ry: number;
  rz: number;
  /** y of the piece origin: ground - sink * sy. */
  y: number;
}

export interface ScatterOptions {
  density: number;
  smallDebris: boolean;
  heightAt?: (x: number, z: number) => number;
}

/** Number of pieces of a kind at a density (fixed placements never scale). */
export function scatterCount(kind: ScatterKind, o: ScatterOptions): number {
  if (kind.small && !o.smallDebris) return 0;
  if (kind.fixed) return kind.fixed.length;
  return Math.max(0, Math.round(kind.count * o.density));
}

/** Lay out every kind of a kit. Deterministic from `rnd` (a seeded PRNG). */
export function layoutScatter(
  spec: ScatterSpec,
  rnd: () => number,
  o: ScatterOptions,
): ScatterPlacement[] {
  const out: ScatterPlacement[] = [];
  for (const kind of spec.kinds) {
    const n = scatterCount(kind, o);
    for (let i = 0; i < n; i++) {
      let x: number;
      let z: number;
      let yaw: number;
      const f = kind.fixed?.[i];
      if (f) {
        [x, z, yaw] = f;
      } else {
        const [r0, r1] = kind.ring ?? [0, 1];
        // Area-uniform radius, bent toward the centre by `cluster`.
        const u = rnd();
        const t = Math.sqrt(r0 * r0 + (r1 * r1 - r0 * r0) * u);
        const r = t * (1 - (kind.cluster ?? 0) * (1 - Math.pow(t, 1.5)));
        const a = rnd() * Math.PI * 2;
        x = Math.cos(a) * r * spec.rx;
        z = Math.sin(a) * r * spec.rz;
        yaw = rnd() * Math.PI * 2;
        if (kind.align !== undefined)
          yaw = (yaw < Math.PI ? 0 : Math.PI) + (rnd() - 0.5) * kind.align;
      }
      let sx: number;
      let sy: number;
      let sz: number;
      if (typeof kind.size[0] === 'number') {
        const [a, b] = kind.size as readonly [number, number];
        sx = sy = sz = a + (b - a) * rnd();
      } else {
        const trip = kind.size as readonly (readonly [number, number])[];
        const shared = rnd();
        const pick = (k: number): number => {
          const [a, b] = trip[k]!;
          return a + (b - a) * (kind.proportional ? shared : rnd());
        };
        sx = pick(0);
        sy = pick(1);
        sz = pick(2);
      }
      let rx = 0;
      let rz = 0;
      if (kind.pose === 'lie') {
        rx = (rnd() - 0.5) * 0.3;
        rz = (rnd() - 0.5) * 0.3;
      } else if (kind.pose === 'tumble') {
        rx = rnd() * Math.PI * 2;
        rz = rnd() * Math.PI * 2;
      }
      const ground = o.heightAt ? o.heightAt(x, z) : 0;
      const y = ground - (kind.sink ?? 0) * sy;
      out.push({ kind: kind.name, x, ground, z, sx, sy, sz, rx, ry: yaw, rz, y });
    }
  }
  return out;
}
