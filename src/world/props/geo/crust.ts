/**
 * Beebe crusted-sulfide look shared by the hero smoker cluster and the plain
 * chimneys 2-3: coal-black recesses, ochre/orange Fe-oxide on flange crests, rust
 * patches, sulfur bloom and pale anhydrite near the rim. Colour follows the same
 * `crustBand()` as the relief, so oxide sits exactly on the overhanging crests.
 */

import * as THREE from 'three';
import { crustBand } from './spire.js';
import { fbm3, smooth } from './shared.js';

const RUST = new THREE.Color(0x7a4a2c);
const ANHYDRITE = new THREE.Color(0xcfc4b2);
const SULFIDE = new THREE.Color(0x2c231e);
const OCHRE = new THREE.Color(0xc0903f);
const ORANGE = new THREE.Color(0xb4572c);
const SULFUR = new THREE.Color(0xd8bb62);
const COAL = new THREE.Color(0x15110f);

const hash01 = (k: number): number => {
  const v = Math.sin(k * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
};

/**
 * Paint one vertex of a crusted chimney.
 * @param ang angle around the chimney axis; @param ly height above its foot (m);
 * @param hh height fraction up the chimney; @param nz low-frequency noise in [0,1];
 * @param seed prop seed (bands are seeded per chimney, so no two match).
 */
export function paintCrust(
  out: THREE.Color,
  x: number,
  y: number,
  z: number,
  ang: number,
  ly: number,
  hh: number,
  nz: number,
  seed: number,
  bandSeed: number,
  ny = 0,
  trunk = false,
): void {
  const b = crustBand(ang, ly, bandSeed);
  const bandTint = hash01(b.idx * 1.7 + bandSeed);
  const patch = fbm3(x * 0.8, y * 0.45, z * 0.8, seed ^ 0x77, 3);
  const fine = fbm3(x * 4.2, y * 5, z * 4.2, seed ^ 0x19, 2);
  out.copy(COAL).lerp(SULFIDE, 0.3 + 0.7 * nz);
  const oxide = smooth(0.2, 0.75, b.lip * 2.2 + (patch - 0.5) * 1.2) * (0.55 + 0.45 * fine);
  out.lerp(bandTint > 0.5 ? OCHRE : ORANGE, oxide * 0.9);
  out.lerp(RUST, smooth(0.5, 0.8, patch) * 0.6 * (1 - oxide));
  out.lerp(SULFUR, smooth(0.78, 0.95, fine) * smooth(0.3, 0.8, b.lip) * 0.6);
  out.lerp(
    ANHYDRITE,
    (smooth(0.85, 1, hh + (nz - 0.5) * 0.25) * 0.32 + smooth(0.84, 0.97, patch) * 0.22) *
      (trunk ? 0.4 : 1),
  );
  out.multiplyScalar(0.8 + 0.5 * fine);
  if (trunk) {
    // Hero trunk: more colour separation. Upward faces of flanges and band crests catch warm
    // ochre/sulfur precipitate; undercuts stay near-black; the orifice is soot-stained.
    const up = smooth(0.25, 0.85, ny);
    const crest = Math.max(up * 0.55, b.lip) * (0.6 + 0.4 * fine);
    out.lerp(bandTint > 0.5 ? OCHRE : ORANGE, crest * 0.8);
    out.lerp(SULFUR, smooth(0.7, 0.95, patch) * up * 0.3);
    out.lerp(COAL, smooth(0.35, 0, b.saw) * (1 - b.lip) * 0.65 * (1 - up));
    out.lerp(COAL, smooth(0.9, 0.995, hh) * 0.7);
  }
}
