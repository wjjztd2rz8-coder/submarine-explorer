/**
 * Site-scoped terrain features the survey grid cannot resolve. Pure TS, no DOM.
 *
 * The Great Blue Hole is ~320 m across, about five GMRT cells, and the grid shows
 * only a flat 4 m reef platform there. `blueHoleHeight` is an analytic carve of
 * the sinkhole (near-circular, steep walls, a ledge at ~40 m where the real
 * stalactites hang, a floor near 125 m) applied on top of the measured surface.
 * It is a reconstruction (tagged in the Journal and the prop note), not survey data.
 * Monterey also gets a local reconstructed opening bend between its mudstone
 * banks; the surveyed tile and science contacts remain unchanged.
 */

import { latLonToWorld } from '../util/geo.js';
import type { TileMeta } from '../util/types.js';
import { siteManifest } from '../core/SiteManifest.js';

/** Reported position of the Great Blue Hole (Wikipedia: 17 18 56 N, 87 32 08 W). */
export const BLUE_HOLE_LAT = 17.3156;
export const BLUE_HOLE_LON = -87.5356;
/** Lip radius of the hole in metres (diameter ~320 m). */
export const BLUE_HOLE_RADIUS_M = 160;

/** (radius from the hole centre, absolute height) knots of the wall profile; linear between. */
const PROFILE: readonly (readonly [number, number])[] = [
  [215, 0],
  [184, -9],
  [170, -18],
  [160, -30],
  [153, -38],
  [134, -41],
  [126, -52],
  [119, -72],
  [112, -78],
  [108, -98],
  [92, -118],
  [60, -123],
  [0, -125],
];

const smoothstep = (t: number): number => t * t * (3 - 2 * t);

function profileAt(r: number, profile = PROFILE): number {
  if (r >= profile[0]![0]) return 0;
  for (let i = 1; i < profile.length; i++) {
    const [r1, h1] = profile[i]!;
    if (r >= r1) {
      const [r0, h0] = profile[i - 1]!;
      return h1 + (h0 - h1) * smoothstep((r - r1) / (r0 - r1));
    }
  }
  return profile[profile.length - 1]![1];
}

// Broad limestone beds separated by short, steep risers. Radial treads are
// 4–7 m wide, so even the locally refined Low mesh resolves their silhouettes.
// The original 40 m gallery seat is retained; angular masks also protect its roof.
const TERRACE_PROFILE: readonly (readonly [number, number])[] = [
  [215, 0],
  [184, -9],
  [177, -10],
  [173, -18],
  [166, -19],
  [160, -30],
  [153, -38],
  [148, -38.6],
  [145.5, -41.4],
  [140, -42],
  [137.5, -44.8],
  [132, -45.4],
  [129.5, -48.4],
  [127, -50],
  [125, -55],
  [124, -62],
  [120, -63],
  [117, -74],
  [112, -78],
  [108, -98],
  [102, -100],
  [97, -113],
  [92, -118],
  [60, -123],
  [0, -125],
];

/** Wall alcoves: bearing (rad), angular half-width, absolute height (m), height half-range, depth (m). */
const NOTCHES: readonly { a: number; w: number; h: number; hw: number; d: number }[] = [
  { a: 0.4, w: 0.16, h: -60, hw: 9, d: 13 },
  { a: 2.3, w: 0.13, h: -88, hw: 8, d: 12 },
  { a: 3.9, w: 0.18, h: -52, hw: 8, d: 14 },
  { a: 5.4, w: 0.12, h: -75, hw: 7, d: 10 },
  { a: 1.5, w: 0.1, h: -66, hw: 6, d: 12 },
  { a: 4.6, w: 0.11, h: -92, hw: 6, d: 11 },
  { a: 0.1, w: 0.09, h: -45, hw: 5, d: 9 },
];

/** Fixed floor blocks: (dx, dz, radius, height) in metres from the hole centre. */
const BLOCKS: readonly (readonly [number, number, number, number])[] = [
  [-34, 22, 5, 3.5],
  [18, -41, 6, 4],
  [41, 30, 4, 3],
  [-12, -30, 3.5, 2.5],
  [-52, -18, 5.5, 4],
  [8, 47, 4.5, 3],
  [26, 6, 3, 2],
  [-20, 55, 4, 3],
];

function boulderField(dx: number, dz: number): number {
  let h = 0;
  for (const [bx, bz, br, bh] of BLOCKS) {
    const d2 = ((dx - bx) * (dx - bx) + (dz - bz) * (dz - bz)) / (br * br);
    if (d2 < 1) h += bh * (1 - d2) * (1 - d2) * 1.4;
  }
  return h;
}

const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));

/**
 * Both gallery seats: bearing, angular half-width of the window the other carves leave alone, and
 * the radius (in the carve's own, outline-warped frame) of the hood's foot.
 */
const GALLERY_SEATS: readonly (readonly [number, number, number])[] = [
  [Math.PI, 0.3, 162],
  [1.0, 0.25, 155],
];

/** 0 inside a seat's angular window, rising to 1 over 0.15 rad beyond its half-width. */
function seatMouth(a: number, bearing: number, width: number): number {
  const da = Math.abs(Math.atan2(Math.sin(a - bearing), Math.cos(a - bearing)));
  return smoothstep(clamp01((da - width) / 0.15));
}

/** 0 inside either gallery window, 1 clear of both. */
function galleryMouth(a: number): number {
  let mouth = 1;
  for (const [bearing, width] of GALLERY_SEATS) mouth *= seatMouth(a, bearing, width);
  return mouth;
}

/**
 * Replace the smooth bowl with broad beds, from the upper reef to the lower
 * wall. The beds wander slowly with bearing, without quantisation seams or
 * isolated rock skins. Returns a height delta; both gallery mouths and the
 * floor retain their original surface.
 */
export function blueHoleTerraces(a: number, r: number): number {
  let mouth = galleryMouth(a);
  // Below the gallery seat (r < ~135, deeper than ~45 m) the mouth windows terrace too: the sub
  // looks straight down this sector, and an untouched smooth ramp there read as a blank slope.
  mouth += (1 - mouth) * (1 - smoothstep(clamp01((r - 126) / 10)));
  if (mouth <= 0) return 0;
  const zone = smoothstep(clamp01((r - 100) / 10)) * (1 - smoothstep(clamp01((r - 184) / 11)));
  if (zone <= 0) return 0;
  // Ragged edges: each step wanders a few metres with bearing, and a little with its own depth.
  const drift =
    0.8 * Math.sin(3 * a + 0.7) +
    0.4 * Math.sin(7 * a + 2) +
    0.25 * Math.sin(17 * a + 1 + r * 0.05);
  const rr = r + drift;
  return mouth * zone * (profileAt(rr, TERRACE_PROFILE) - profileAt(r));
}

/**
 * Gallery-mouth shelves: the terraces above leave both gallery bearings untouched, so the
 * shelf the sub sits on would be one smooth ramp. This cuts four ragged 1.7 m steps into
 * it (lowering only, inside the same angular window the terraces skip, fading in over its
 * edges), well below the pendants and clear of the original seat radius.
 */
export function blueHoleApron(a: number, r: number): number {
  if (r < 112 || r > 168) return 0;
  const mouth = galleryMouth(a);
  const window = 1 - mouth;
  if (window <= 0) return 0;
  const rr = r + 1.6 * Math.sin(9 * a + 0.3 + r * 0.04) + 1.0 * Math.sin(23 * a + 1.1);
  let drop = 0;
  // Each step has its own height and wanders in depth with bearing, so the treads fan and
  // pinch instead of running as even parallel shelves; low mounds of slumped sediment break them.
  [146, 139.5, 133, 126.5].forEach((edge, i) => {
    const wander = 3.2 * Math.sin(5 * a + i * 1.9) + 1.6 * Math.sin(13 * a + i * 0.7);
    const height = 1.7 * (0.55 + 0.9 * (0.5 + 0.5 * Math.sin(4 * a + i * 2.3)));
    drop += height * smoothstep(clamp01((edge + wander - rr) / 2.2));
  });
  drop -=
    1.3 * Math.max(0, Math.sin(0.5 * r + 6 * a)) * Math.max(0, Math.sin(19 * a + r * 0.16 + 1));
  const ends = smoothstep(clamp01((r - 112) / 8)) * (1 - smoothstep(clamp01((r - 160) / 8)));
  return -drop * window * ends;
}

/**
 * The ground behind each gallery seat climbs to meet the hood's roof, so the roof reads as a
 * lip of the wall rather than a plank laid on a smooth slope. Starts just behind the seat
 * radius (the hood snaps to the ground at its foot, which stays put) and fades into the reef
 * above; the angular shoulders also bank up around the hood's ends.
 */
export function blueHoleSeatBank(a: number, r: number): number {
  let bank = 0;
  for (const [bearing, width, foot] of GALLERY_SEATS) {
    const window = 1 - seatMouth(a, bearing, width);
    if (window <= 0) continue;
    const rise =
      smoothstep(clamp01((r - foot) / 11)) * (1 - smoothstep(clamp01((r - foot - 24) / 20)));
    bank += window * rise;
  }
  const ragged = 1 + 0.25 * Math.sin(13 * a + r * 0.2) + 0.15 * Math.sin(29 * a + 1.3);
  return 17 * bank * ragged;
}

/** Riser feet (radius) that shed talus; each gets a ring of fallen blocks. */
const TALUS_FEET: readonly number[] = [145, 137, 129, 123, 116, 106];
const TALUS_CELLS = 22;

/**
 * Fallen blocks at the foot of the bigger risers: rounded mounds 1.2-2.6 m high
 * and 5-8 m across at hashed bearings. Part of the heightfield (no draw calls), so
 * they also read as boulders in the baked colour and shadow the riser foot.
 */
export function blueHoleTalus(a: number, r: number): number {
  if (r < 100 || r > 152) return 0;
  const cell = (Math.PI * 2) / TALUS_CELLS;
  const base = Math.floor((a + Math.PI) / cell);
  let sum = 0;
  for (let f = 0; f < TALUS_FEET.length; f++) {
    const dr = r - (TALUS_FEET[f]! - 2.5);
    if (Math.abs(dr) > 6) continue;
    for (let k = -1; k <= 1; k++) {
      const ci = base + k;
      const h1 = Math.abs(Math.sin(ci * 12.9898 + f * 78.233) * 43758.5453) % 1;
      const h2 = Math.abs(Math.sin(ci * 39.346 + f * 11.135) * 24634.6345) % 1;
      if (h1 < 0.45) continue;
      const ca = -Math.PI + (ci + 0.2 + 0.6 * h2) * cell;
      let da = Math.abs(a - ca);
      if (da > Math.PI) da = Math.PI * 2 - da;
      const rad = 5 + 3 * h2;
      const dx = da * r;
      const d2 = (dx * dx + dr * dr) / (rad * rad);
      if (d2 < 1) sum += (1.0 + 1.0 * h1) * (1 - d2) * (1 - d2) * 1.5;
    }
  }
  const mouth = galleryMouth(a);
  return sum * mouth;
}

/** Relief is part of the single heightfield, so sand and exposed rock share
 * vertices, derivative normals, material and collision. Suppress displacement
 * around both gallery seats to retain their original mouth and pendant space.
 */
export function blueHoleWallRelief(a: number, r: number): number {
  const ends =
    smoothstep(Math.max(0, Math.min(1, (r - 96) / 12))) *
    (1 - smoothstep(Math.max(0, Math.min(1, (r - 177) / 13))));
  const mouth = galleryMouth(a);
  const flute = (0.5 + 0.5 * Math.sin(43 * a + 0.2 * Math.sin(r * 0.12))) ** 3;
  const bench = Math.exp(-(((r - 139 - 2 * Math.sin(9 * a)) / 3.5) ** 2));
  const lower = Math.exp(-(((r - 115 - 1.5 * Math.sin(7 * a)) / 2.8) ** 2));
  const broken = 0.6 + 0.4 * Math.sin(17 * a + r * 0.08) ** 2;
  // Fine rubble hummocks at the foot of each broken bench, without a second
  // surface or rock AABBs closing the navigable shaft.
  const rubble = Math.max(0, Math.sin(61 * a + r * 0.9)) ** 4 * (bench + lower);
  return ends * mouth * (1.4 * flute + 1.1 * (bench + lower) * broken + 0.7 * rubble);
}

/** Centre of the carve, recorded when the carve is built; the vertex tint reads it. */
let blueHoleCentre: { x: number; z: number } | null = null;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Baked linear albedo multipliers for the bowl: warm tan reef-top limestone
 * giving way to ochre and then grey-brown lower beds, per-bed tone changes with
 * a dark joint, and ambient occlusion at the foot of every riser and under each
 * lip. Replaces the fragment strata (one vertex attribute, no extra draw calls).
 */
export function blueHoleTint(
  x: number,
  y: number,
  z: number,
  normalY: number,
): readonly [number, number, number] {
  if (!blueHoleCentre) return [1, 1, 1];
  const dx = x - blueHoleCentre.x;
  const dz = z - blueHoleCentre.z;
  const r = Math.hypot(dx, dz);
  const depth = -y;
  const a = Math.atan2(dz, dx);
  // Colour by depth: warm tan, ochre, grey-brown, never below a readable floor.
  // Warm sunlit reef top, thin ochre, then a cool teal-blue ramp: the bottom reads cold, the rim warm.
  const ochre = smoothstep(clamp01((depth - 4) / 22));
  const cool = smoothstep(clamp01((depth - 14) / 85));
  const abyss = smoothstep(clamp01((depth - 45) / 55));
  let tr = lerp(lerp(lerp(1.16, 1.0, ochre), 0.46, cool), 0.3, abyss);
  let tg = lerp(lerp(lerp(1.06, 0.86, ochre), 0.76, cool), 0.6, abyss);
  let tb = lerp(lerp(lerp(0.82, 0.62, ochre), 0.88, cool), 1.0, abyss);
  // Per-tread character: each level bed gets its own tone, warmth and silt cover, graded
  // across its width (pale outer lip, damp darker inner foot) so no tread is one flat value.
  let tread = 0;
  let treadU = 0.5;
  if (r > 90 && r < 215) {
    for (let i = 1; i < TERRACE_PROFILE.length; i++) {
      const [r1, h1] = TERRACE_PROFILE[i]!;
      const [r0, h0] = TERRACE_PROFILE[i - 1]!;
      if (r >= r1 && r < r0 && r0 - r1 > 3 && (h0 - h1) / (r0 - r1) < 0.8) {
        const th = 0.5 + 0.5 * Math.sin(i * 12.9898 + 1.7) * Math.cos(i * 4.131);
        tread = 1;
        treadU = (r - r1) / (r0 - r1);
        const warmth = th - 0.5;
        const tone = 0.74 + 0.58 * th + 0.14 * (treadU - 0.5);
        tr *= tone * (1 + 0.3 * warmth);
        tg *= tone;
        tb *= tone * (1 - 0.36 * warmth);
        break;
      }
    }
  }
  // Wall mask: the silt floor and the open reef stay soft, the rock gets the beds.
  const slope = smoothstep(clamp01((1 - normalY - 0.01) / 0.18));
  const wallR = smoothstep(clamp01((r - 92) / 8)) * (1 - smoothstep(clamp01((r - 205) / 10)));
  const rock = Math.max(slope, 0.55 * wallR);
  // Beds: a few broad bands of differing tone with wavy, tilted, soft boundaries (weathered
  // limestone, not stacked terraces), plus vertical staining that deepens toward the base.
  const tilt =
    1.1 * Math.sin(3 * a + depth * 0.025) +
    0.6 * Math.sin(7 * a + 1.3) +
    0.3 * Math.sin(x * 0.045 + z * 0.037);
  const bandT = depth / 17 + tilt;
  const bi = Math.floor(bandT);
  const bedTone = (i: number) => 0.5 + 0.5 * Math.sin(i * 12.9898 + 4.1) * Math.cos(i * 7.233);
  const bh = lerp(bedTone(bi), bedTone(bi + 1), smoothstep(clamp01((bandT - bi - 0.55) / 0.45)));
  const streak =
    0.5 + 0.5 * Math.sin(a * 53 + 2 * Math.sin(a * 17 + depth * 0.03)) * Math.sin(a * 29 + 1.7);
  const stain = 1 - 0.3 * streak * smoothstep(clamp01((depth - 30) / 60));
  const bed = (0.8 + 0.4 * bh) * stain * (1.08 - 0.16 * smoothstep(clamp01(depth / 90)));
  const k = rock * 0.85;
  tr *= lerp(1, bed * lerp(1.05, 0.94, bh), k);
  tg *= lerp(1, bed, k);
  tb *= lerp(1, bed * lerp(0.92, 1.05, bh), k);
  // Ambient occlusion: the tread just inside each riser foot, and the riser's lower face.
  let ao = 1;
  if (r < 186 && r > 90) {
    for (let i = 1; i < TERRACE_PROFILE.length; i++) {
      const [r1, h1] = TERRACE_PROFILE[i]!;
      const [r0, h0] = TERRACE_PROFILE[i - 1]!;
      if (r0 - r1 < 1 || (h0 - h1) / (r0 - r1) < 1.2) continue;
      if (r < r1) ao *= 1 - 0.3 * Math.exp(-(r1 - r) / 7);
      else if (r < r0) ao *= 1 - 0.12 * (1 - (r - r1) / (r0 - r1));
    }
  }
  // Broad mottling of the treads: warm sand patches against grey silt and darker rubble
  // beds, so a level shelf is never one flat cream tone.
  const mott =
    0.5 +
    0.25 * Math.sin(x * 0.11 + 1.3 * Math.sin(z * 0.07)) +
    0.25 * Math.sin(z * 0.085 + 0.9 * Math.sin(x * 0.13 + 2));
  const fine = 0.5 + 0.5 * Math.sin(x * 0.53 + z * 0.37 + 2 * Math.sin(x * 0.21 - z * 0.29));
  // Level silt and sand keep only part of the wall's chroma: pale sand, not saturated ochre.
  const mean = (tr + tg + tb) / 3;
  const keep = (0.3 + 0.7 * rock) * (1 - 0.15 * tread);
  tr = mean + (tr - mean) * keep;
  tg = mean + (tg - mean) * keep;
  tb = mean + (tb - mean) * keep;
  // Sediment patches on the shelf: three overlapping low-frequency fields pick between tan sand,
  // grey-brown silt and an olive algae film; a fourth marks darker rubble beds; scour streaks
  // (long ripples elongated across the current) modulate brightness. All baked, no new draw calls.
  // Patches also reach the bowl's treads (less on the steep risers, which keep their beds).
  const pf = 1 - 0.8 * Math.max(rock, 0.8 * wallR);
  const f1 = 0.5 + 0.5 * Math.sin(x * 0.09 + 2 * Math.sin(z * 0.061 + 1) + z * 0.04);
  const f2 = 0.5 + 0.5 * Math.sin(z * 0.1 - 1.7 * Math.sin(x * 0.07 + 0.4) + 2.1);
  const f3 = 0.5 + 0.5 * Math.sin((x + z) * 0.12 + 2.4 * Math.sin((x - z) * 0.08));
  const olive = smoothstep(clamp01((f1 - 0.45) / 0.25)) * pf;
  const grey2 = smoothstep(clamp01((f2 - 0.45) / 0.25)) * pf;
  const rubble = smoothstep(clamp01((f3 - 0.5) / 0.25)) * pf * (0.6 + 0.4 * fine);
  const scour = 0.5 + 0.5 * Math.sin(x * 0.22 + 0.9 * Math.sin(z * 0.045) + z * 0.05);
  const ripple = pf * (0.5 + 0.5 * Math.sin(x * 1.3 + 5 * Math.sin(z * 0.09 + x * 0.04))) ** 2;
  let sr = 1 + pf * 0.3 * (mott - 0.5);
  let sg = 1 + pf * 0.1 * (mott - 0.5);
  let sb = 1 - pf * 0.4 * (mott - 0.5);
  // Olive film: pull red and blue down, keep green.
  sr = lerp(sr, sr * 0.68, olive);
  sg = lerp(sg, sg * 0.97, olive);
  sb = lerp(sb, sb * 0.52, olive);
  // Grey-brown silt: neutral and slightly cool.
  sr = lerp(sr, sr * 0.8, grey2 * 0.8);
  sg = lerp(sg, sg * 0.82, grey2 * 0.8);
  sb = lerp(sb, sb * 0.92, grey2 * 0.8);
  // Dark rubble beds, never below a readable floor.
  const dark = 1 - 0.55 * rubble;
  const bright = 1 + pf * (0.14 * (fine - 0.5) + 0.2 * (scour - 0.5) + 0.12 * (ripple - 0.3));
  // Risers fall into shadow, treads keep their light; a pale lip crowns each tread edge and wide
  // hollows (low-frequency, darker and cooler) pool between the patches of pale sand.
  const riserShade = 0.46 + 0.54 * smoothstep(clamp01((normalY - 0.35) / 0.5));
  const lip =
    tread *
    Math.exp(-(((1 - treadU) * 8) ** 2)) *
    (0.42 + 0.4 * smoothstep(clamp01((depth - 20) / 60)));
  const hollow = 1 - 0.28 * smoothstep(clamp01((0.42 - f1 * f2) / 0.25)) * (1 - 0.5 * rock);
  const sand = 1 + 0.2 * smoothstep(clamp01((f3 - 0.62) / 0.2)) * (1 - rock);
  const m = ao * dark * bright * riserShade * hollow * sand * (1 + lip);
  // Crisp rim: a thin pale lip at the first riser, with a dark cut at its foot.
  // Kept soft and wide: the riser is a gradient, not a drawn line.
  // Feather: the shelf's warm tone hands over to the cool lower wall across ~30 m, not at one ring.
  const feather = smoothstep(clamp01((139 - r) / 30));
  const fm = 1 - 0.1 * feather;
  tr *= 1 - 0.1 * feather;
  tb *= 1 + 0.06 * feather;
  const rim =
    1 +
    0.1 * Math.exp(-(((r - 179) / 4.5) ** 2)) * (1 - rock) -
    0.2 * Math.exp(-(((r - 171) / 5.5) ** 2));
  // Under the gallery hoods the shelf is warmer and darker (silt shaded by the roof), with a
  // scatter of dark fallen blocks, so it is not the same pale plane as the open reef.
  let hoodWindow = 0;
  for (const [bearing, width] of GALLERY_SEATS) {
    const da = Math.abs(Math.atan2(Math.sin(a - bearing), Math.cos(a - bearing)));
    hoodWindow = Math.max(hoodWindow, 1 - smoothstep(clamp01((da - width) / 0.45)));
  }
  const hoodShade =
    hoodWindow * smoothstep(clamp01((r - 112) / 10)) * (1 - smoothstep(clamp01((r - 200) / 16)));
  const clast = smoothstep(
    clamp01(
      (Math.sin(x * 0.83 + 2 * Math.sin(z * 0.61)) * Math.sin(z * 0.77 - x * 0.41) - 0.35) / 0.3,
    ),
  );
  const under = 1 - hoodShade * (0.4 + 0.3 * clast);
  return [
    tr * m * fm * sr * rim * under * (1 + 0.18 * hoodShade),
    tg * m * fm * sg * rim * under * (1 - 0.1 * hoodShade),
    tb * m * fm * sb * rim * under * (1 - 0.3 * hoodShade),
  ];
}

/**
 * Minimap treatment of the reef platform around the hole. The measured relief out
 * there is a few metres of reef-top noise that reads as camouflage on the map, so the
 * sonar replaces it with one calm gradient: `blend` is 0 over the hole (measured depth
 * palette and hillshade untouched) and 1 on the reef flat; `shallowT` is the palette
 * position to show (0 deep, 1 shallow), pale turquoise at the rim easing to soft blue
 * toward the survey edge. Pure and deterministic; Blue Hole sonar path only.
 */
export function blueHoleSonarReef(
  x: number,
  z: number,
  centreX: number,
  centreZ: number,
): { blend: number; shallowT: number } {
  const d = Math.hypot(x - centreX, z - centreZ);
  const blend = smoothstep(clamp01((d - 215) / 70));
  const far = smoothstep(clamp01((d - 260) / 420));
  return { blend, shallowT: 0.97 - 0.45 * far };
}

export interface TerrainCarve {
  /** Height after the carve, given the measured height at (x, z). Never raises the seabed. */
  apply(x: number, z: number, height: number): number;
  /** Centre of the carve in world metres. */
  readonly centre: { x: number; z: number };
}

/** The carve for a tile, or null when it has none. */
export function terrainCarveFor(meta: TileMeta): TerrainCarve | null {
  const carve = siteManifest(meta.id)?.terrain?.carve;
  if (carve === 'canyon-bend') {
    // A reconstructed S-bend beside the opening ledge. Its 180 m-wide floor
    // has shoulders smoothed out by the survey grid; retain the original wall seats.
    const wall = latLonToWorld(meta, 36.7872, -122.0133);
    const centre = { x: wall.x + 170, z: wall.z };
    return {
      centre,
      apply(x, z, height) {
        const along = z - centre.z;
        const axis = centre.x + 20 * Math.sin(along / 220);
        const across = Math.abs(x - axis);
        if (Math.abs(along) >= 620 || across >= 90) return height;
        const end = 1 - smoothstep(Math.max(0, (Math.abs(along) - 450) / 170));
        const bank = 1 - smoothstep(Math.max(0, (across - 30) / 60));
        // This local bend turns north before continuing west: its sandy floor
        // drops 20 m per 100 m forward, with steep shoulders into the banks.
        const floor = -860 + along * 0.2 + across * across * 0.002;
        return height + (Math.min(height, floor) - height) * end * bank;
      },
    };
  }
  if (carve !== 'sinkhole') return null;
  const centre = latLonToWorld(meta, BLUE_HOLE_LAT, BLUE_HOLE_LON);
  blueHoleCentre = centre;
  return {
    centre,
    apply(x, z, height) {
      const dx = x - centre.x;
      const dz = z - centre.z;
      if (dx * dx + dz * dz > 230 * 230) return height;
      const a = Math.atan2(dz, dx);
      // A slightly irregular outline, not a drawn circle.
      const wob = 1 + 0.035 * Math.sin(3 * a + 0.8) + 0.025 * Math.sin(5 * a + 2.1);
      const r0 = Math.hypot(dx, dz) / wob;
      // Alcoves: a few scooped notches in the wall (the cave mouths and undercuts the hole is
      // known for), a height field cannot overhang so they are steep, deep re-entrants.
      // Ragged lip: the shelf edge wanders a few metres, so the shelf line is never one ring.
      const lipBand = Math.exp(-(((r0 - 131) / 14) ** 2));
      let r =
        r0 + lipBand * (3.2 * Math.sin(11 * a + 0.6) + 2.2 * Math.sin(19 * a + 2.4 + r0 * 0.05));
      for (const n of NOTCHES) {
        let da = Math.abs(a - n.a);
        if (da > Math.PI) da = 2 * Math.PI - da;
        const ang = Math.exp(-((da / n.w) ** 2));
        const hgt = Math.exp(-(((profileAt(r0) - n.h) / n.hw) ** 2));
        r -= n.d * ang * hgt;
      }
      // Ledge undulation, rubble hummocks and sediment ripples (a metre or two) break up the carve.
      const rim = smoothstep(Math.min(1, Math.max(0, (r - 100) / 30)));
      const ledge =
        rim *
        (1 - smoothstep(Math.min(1, Math.max(0, (r - 150) / 20)))) *
        (2.2 * Math.sin(7 * a + 1.3 + r * 0.05) + 1.3 * Math.sin(13 * a + r * 0.11));
      const floor = 1 - smoothstep(Math.min(1, Math.max(0, (r - 80) / 30)));
      const ripple =
        floor *
        (0.5 * Math.sin(dx * 0.35 + 0.8 * Math.sin(dz * 0.09)) +
          0.9 * Math.sin(dz * 0.13 + dx * 0.05) +
          1.4 * Math.sin(dx * 0.045) * Math.sin(dz * 0.06));
      // Fallen blocks and sediment mounds on the floor.
      const blocks = floor * boulderField(dx, dz);
      return Math.min(
        height,
        profileAt(r) +
          ledge +
          ripple +
          blocks +
          lipBand * 1.1 * Math.max(0, Math.sin(37 * a + r * 0.7)) ** 3 +
          blueHoleWallRelief(a, r) +
          blueHoleTerraces(a, r) +
          blueHoleApron(a, r) +
          blueHoleTalus(a, r) +
          blueHoleSeatBank(a, r),
      );
    },
  };
}
