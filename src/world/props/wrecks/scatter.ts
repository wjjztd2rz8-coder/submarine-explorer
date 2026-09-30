/**
 * Wreck scatter kits: the debris fields and detached pieces around the hulls,
 * each one InstancedMesh per piece kind, terrain-following like
 * `procedural:debris` (docs/props.md). Big pieces (boilers, turrets, hull
 * plates, spars) are in both LOD levels; small ones (coal, crockery, bottles,
 * blocks) only near, and only on tiers with small debris.
 *
 * dims (props.json `dimensions_m`): [radius, _, height] for disc kits;
 * `bismarck-landslide` is an ellipse [half-length along Z, half-width, height].
 *
 * What each kit shows, and what it rests on:
 *   titanic-boilers      five single-ended boilers (4.8 m across) from Boiler
 *                        Room No. 1, with coal (Ballard 1987; WHOI 2010).
 *   titanic-field        the field between the sections: hull plates, frames,
 *                        pipes, cowl vents, bench ends, crockery, bottles, coal.
 *   titanic-stern-field  heavier plating and frames around the stern.
 *   bismarck-turrets     the four 38 cm turrets that fell out as she capsized,
 *                        two upside down with their trunks up, one on its side,
 *                        one sunk upright (the arrangement is illustrative).
 *   bismarck-field       plating, frames and pipes around the torn aft end.
 *   bismarck-landslide   the slide the sinking hull set off: sediment blocks
 *                        and berms, aligned down the slope (a reconstruction).
 *   endurance-rigging    fallen spars and yards, blocks and coiled line.
 *   endurance-stern      timbers and planks off the damaged poop, with life.
 */

import * as THREE from 'three';
import { assembleWreck, type WreckBuilt } from './assemble.js';
import type { WreckDetail } from './detail.js';
import {
  InstanceList,
  LIFE_TINTS,
  anemoneGeometry,
  makeInstanced,
  squirtGeometry,
} from './instances.js';
import { PartBin, beam, curl, jitter, projectUVs, v3 } from './kit.js';
import {
  WRECK_COLORS as C,
  fittingMaterial,
  growthMaterial,
  paintWreck,
  sedimentMaterial,
  steelMaterial,
  woodMaterial,
} from './materials.js';
import { cowlVent } from './ship.js';
import { layoutScatter, type ScatterKind, type ScatterSpec } from './scatterLayout.js';
import { mulberry32, type LocalHeightFn } from './shared.js';
import type { WreckScatterId } from './variants.js';

type MatKind = 'steel' | 'wood' | 'fitting' | 'growth' | 'sediment';

interface KitKind extends ScatterKind {
  geom: PieceId;
  mat: MatKind;
  /** Drawn in the mid LOD too (big pieces that read from a distance). */
  big?: boolean;
  /** Per-instance tint palette (hex); default: brightness jitter on white. */
  tints?: readonly number[];
}

interface KitSpec extends Omit<ScatterSpec, 'kinds'> {
  kinds: readonly KitKind[];
}

interface Kit {
  spec: (dims: readonly [number, number, number]) => KitSpec;
}

// ------------------------------------------------------------ pieces

type PieceId =
  | 'boiler'
  | 'plate'
  | 'frame'
  | 'pipe'
  | 'coal'
  | 'crockery'
  | 'bottle'
  | 'bench'
  | 'cowl'
  | 'turretInverted'
  | 'turretSide'
  | 'turretUpright'
  | 'barrel'
  | 'mudBlock'
  | 'berm'
  | 'spar'
  | 'block'
  | 'coil'
  | 'plank'
  | 'anemone'
  | 'squirt';

const pieceCache = new Map<PieceId, THREE.BufferGeometry>();

function piece(id: PieceId): THREE.BufferGeometry {
  let g = pieceCache.get(id);
  if (!g) {
    g = makePiece(id);
    pieceCache.set(id, g);
  }
  return g;
}

/** Merge a bin, weather it (steel/wood) and give it box-projected UVs. */
function finish(
  bin: PartBin,
  paint: 'steel' | 'wood' | 'none',
  seed: number,
  uvRepeat = 4,
): THREE.BufferGeometry {
  const g = bin.merge()!;
  if (paint === 'steel')
    paintWreck(g, { seed, rustiness: 0.8, growth: 0.2, silt: 0.5, mudBand: 0.6 });
  if (paint === 'wood')
    paintWreck(g, { seed, rustiness: 0, growth: 0.15, silt: 0.7, mudBand: 0.3, wood: true });
  projectUVs(g, uvRepeat);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

function makePiece(id: PieceId): THREE.BufferGeometry {
  const b = new PartBin();
  switch (id) {
    case 'boiler': {
      // Single-ended Scotch boiler, real size: 4.8 m across, 3.6 m long, axis
      // along Z, resting on its side (origin at the bottom). Three furnace
      // mouths on the front end plate, an uptake stub above them.
      const r = 2.4;
      const shell = new THREE.CylinderGeometry(r, r, 3.6, 28, 3);
      shell.rotateX(Math.PI / 2).translate(0, r, 0);
      b.add(jitter(shell, 0.06, 0.8, 0xb01), C.rust);
      for (const z of [-1.8, 1.8]) {
        const ring = new THREE.TorusGeometry(r - 0.05, 0.1, 5, 28).translate(0, r, z);
        b.add(ring, C.rustDark);
      }
      for (const x of [-1.25, 0, 1.25]) {
        const mouth = new THREE.CylinderGeometry(0.55, 0.55, 0.25, 14)
          .rotateX(Math.PI / 2)
          .translate(x, r - 0.55, 1.86);
        b.add(mouth, C.rustDark);
        const hole = new THREE.CircleGeometry(0.44, 14).translate(x, r - 0.55, 2.0);
        b.add(hole, 0x050303);
      }
      b.add(new THREE.BoxGeometry(3.6, 1.2, 0.5).translate(0, r + 1.2, 1.95), C.rust);
      return finish(b, 'steel', 0xb01);
    }
    case 'plate': {
      // A hull plate, 1 x 1 m before scaling, bent.
      const g = new THREE.BoxGeometry(1, 0.05, 1, 4, 1, 4);
      g.translate(0, 0, 0.5);
      curl(g, 1, 0.7);
      g.translate(0, 0, -0.35);
      b.add(jitter(g, 0.04, 2.3, 0x91), C.blackPaint);
      return finish(b, 'steel', 0x91, 1);
    }
    case 'frame': {
      // A bent frame (angle bar), 1 m long along Z before scaling.
      const g = new THREE.BoxGeometry(0.06, 0.18, 1, 1, 1, 8);
      g.translate(0, 0.09, 0.5);
      curl(g, 1, 0.9);
      g.translate(0, 0, -0.5);
      b.add(g, C.rustDark);
      return finish(b, 'steel', 0x3f, 1);
    }
    case 'pipe': {
      const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 10, 3, true)
        .rotateX(Math.PI / 2)
        .translate(0, 0.5, 0);
      b.add(jitter(g, 0.04, 3, 0x21), C.rust);
      return finish(b, 'steel', 0x21, 1);
    }
    case 'coal': {
      const g = new THREE.IcosahedronGeometry(0.5, 0);
      b.add(jitter(g, 0.12, 2.5, 0xc0a1), 0x121110);
      return finish(b, 'none', 0);
    }
    case 'crockery': {
      // A stack of plates and a cup, silted over (1 = a 25 cm plate).
      for (let i = 0; i < 4; i++) {
        const p = new THREE.CylinderGeometry(0.5, 0.4, 0.05, 14).translate(
          0.03 * i,
          0.03 + i * 0.05,
          0.02 * i,
        );
        b.add(p, 0xb9b1a2);
      }
      b.add(new THREE.CylinderGeometry(0.2, 0.15, 0.3, 10).translate(0.7, 0.15, 0.1), 0xa9a092);
      return finish(b, 'none', 0);
    }
    case 'bottle': {
      const g = new THREE.CylinderGeometry(0.12, 0.12, 0.6, 8)
        .rotateZ(Math.PI / 2)
        .translate(0, 0.12, 0);
      const neck = new THREE.CylinderGeometry(0.04, 0.1, 0.25, 8)
        .rotateZ(Math.PI / 2)
        .translate(0.42, 0.12, 0);
      b.add(g, 0x2e3a24);
      b.add(neck, 0x2e3a24);
      return finish(b, 'none', 0);
    }
    case 'bench': {
      // Cast-iron bench ends (the wooden slats are gone), lying on their side.
      for (const z of [-0.8, 0.8]) {
        b.add(beam(v3(-0.3, 0, z), v3(0.1, 0.8, z), 0.04, 0.04, 5), 0x2a1a12);
        b.add(beam(v3(0.3, 0, z), v3(-0.2, 0.45, z), 0.04, 0.04, 5), 0x2a1a12);
        b.add(beam(v3(-0.35, 0.45, z), v3(0.35, 0.45, z), 0.035, 0.035, 5), 0x2a1a12);
      }
      const g = new THREE.BufferGeometry();
      const merged = b.merge()!;
      g.copy(merged);
      g.rotateZ(Math.PI / 2 - 0.2);
      g.translate(0.8, 0.05, 0);
      return (g.computeBoundingBox(), g.computeBoundingSphere(), projectUVs(g, 1), g);
    }
    case 'cowl': {
      cowlVent(b, 0, 0, 0, 0.45, 1.5, 0, C.blackPaint);
      const g = b.merge()!;
      g.rotateZ(Math.PI / 2 - 0.15).translate(1.3, 0.5, 0);
      paintWreck(g, { seed: 0xc0, rustiness: 0.85, growth: 0.2, silt: 0.6, mudBand: 0.4 });
      projectUVs(g, 2);
      return g;
    }
    case 'turretInverted':
    case 'turretSide':
    case 'turretUpright':
      return turretPiece(id);
    case 'barrel': {
      // A 15 cm secondary gun barrel, 8 m, lying half in the mud.
      const g = new THREE.CylinderGeometry(0.2, 0.3, 8, 10)
        .rotateX(Math.PI / 2)
        .translate(0, 0.25, 0);
      b.add(g, C.greyPaint);
      return finish(b, 'steel', 0x8a, 2);
    }
    case 'mudBlock': {
      const g = new THREE.SphereGeometry(0.5, 9, 6);
      g.translate(0, 0.25, 0);
      jitter(g, v3(0.14, 0.1, 0.14), 1.7, 0x5ed);
      // Flat underneath, crisp slumped top edge.
      const pos = g.getAttribute('position');
      for (let i = 0; i < pos.count; i++) pos.setY(i, Math.max(0, pos.getY(i)));
      g.computeVertexNormals();
      b.add(g, C.silt);
      const out = b.merge()!;
      paintWreck(out, {
        seed: 0x5ed,
        rustiness: 0,
        growth: 0,
        silt: 0.6,
        mudBand: 0.5,
        wood: true,
      });
      return out;
    }
    case 'berm': {
      const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 10, 6, false, 0, Math.PI);
      g.rotateX(Math.PI / 2).rotateZ(Math.PI / 2);
      g.translate(0, 0, 0);
      jitter(g, v3(0.1, 0.12, 0.05), 2.4, 0xbe);
      b.add(g, C.mud);
      const out = b.merge()!;
      paintWreck(out, { seed: 0xbe, rustiness: 0, growth: 0, silt: 0.8, mudBand: 0, wood: true });
      return out;
    }
    case 'spar': {
      // A spar, 1 m long along Z before scaling (length set per instance), tapered.
      const g = new THREE.CylinderGeometry(0.35, 0.5, 1, 9, 4)
        .rotateX(Math.PI / 2)
        .translate(0, 0.45, 0);
      b.add(jitter(g, 0.02, 4, 0x5a), C.oak);
      return finish(b, 'wood', 0x5a, 0.5);
    }
    case 'block': {
      // A rigging block (pulley) with its sheave, 1 = 40 cm.
      b.add(new THREE.BoxGeometry(0.5, 0.8, 0.35).translate(0, 0.4, 0), C.oak);
      b.add(new THREE.TorusGeometry(0.18, 0.06, 5, 10).translate(0, 0.95, 0), C.rustDark);
      return finish(b, 'wood', 0xb1, 0.5);
    }
    case 'coil': {
      for (let i = 0; i < 3; i++) {
        b.add(
          new THREE.TorusGeometry(0.5 - i * 0.1, 0.07, 5, 16)
            .rotateX(Math.PI / 2)
            .translate(0, 0.07 + i * 0.1, 0),
          0x3a3024,
        );
      }
      return finish(b, 'wood', 0xc1, 0.5);
    }
    case 'plank': {
      const g = new THREE.BoxGeometry(0.25, 0.08, 1, 1, 1, 4).translate(0, 0.04, 0);
      b.add(jitter(g, v3(0.01, 0.02, 0.01), 3, 0x9a), C.teak);
      return finish(b, 'wood', 0x9a, 0.5);
    }
    case 'anemone':
      return anemoneGeometry();
    case 'squirt':
      return squirtGeometry();
  }
}

/**
 * A 38 cm twin turret: gunhouse (sloped face plate, flat roof, rangefinder
 * hood at the back), the rotating trunk beneath it, and the two barrels.
 * Real proportions; origin on the ground.
 */
function turretPiece(id: 'turretInverted' | 'turretSide' | 'turretUpright'): THREE.BufferGeometry {
  const b = new PartBin();
  const W = 11.5;
  const H = 4.6;
  const Lh = 14;
  const house = new THREE.BoxGeometry(W, H, Lh, 4, 2, 5);
  const pos = house.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (y > 0 && z < 0) pos.setZ(i, z + 2.2); // sloped face plate
    if (y > 0) pos.setX(i, pos.getX(i) * 0.9);
  }
  house.computeVertexNormals();
  b.add(house, C.greyPaint);
  b.add(
    new THREE.BoxGeometry(W * 1.08, 1, 1.5).translate(0, H / 2 - 0.9, Lh / 2 - 0.3),
    C.greyPaint,
  );
  const trunk = new THREE.CylinderGeometry(5.3, 5.3, 5.5, 24, 2, true).translate(
    0,
    -H / 2 - 2.75,
    0,
  );
  b.add(jitter(trunk, 0.1, 0.8, 0x7e), C.rustDark);
  b.add(
    new THREE.CircleGeometry(5.2, 24).rotateX(Math.PI / 2).translate(0, -H / 2 - 5.4, 0),
    C.interior,
  );
  for (const x of [-2.1, 2.1]) {
    const barrel = new THREE.CylinderGeometry(0.33, 0.55, 19.6, 12);
    barrel.rotateX(Math.PI / 2).translate(x, -0.3, -Lh / 2 - 8.5);
    b.add(barrel, C.greyPaint);
  }
  const g = b.merge()!;
  // Pose baked in, then dropped so the lowest point sits a little into the mud.
  if (id === 'turretInverted') g.rotateZ(Math.PI).rotateX(0.08);
  else if (id === 'turretSide') g.rotateZ(Math.PI / 2 + 0.15);
  else g.rotateX(-0.06);
  g.computeBoundingBox();
  g.translate(0, -g.boundingBox!.min.y - (id === 'turretUpright' ? 4.5 : 1.8), 0);
  paintWreck(g, { seed: 0x38, rustiness: 0.5, growth: 0.2, silt: 0.65, mudBand: 1.6 });
  projectUVs(g, 6);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

// ------------------------------------------------------------ kits

const disc = (dims: readonly [number, number, number]): { rx: number; rz: number } => ({
  rx: dims[0],
  rz: dims[0],
});
const CREAM = [0xd7d0c4, 0xcfc6b5, 0xbdb3a2] as const;

const KITS: Record<WreckScatterId, Kit> = {
  'titanic-boilers': {
    spec: (dims) => ({
      ...disc(dims),
      kinds: [
        {
          name: 'boilers',
          geom: 'boiler',
          mat: 'steel',
          big: true,
          count: 5,
          size: [0.98, 1.02],
          pose: 'upright',
          sink: 0.12,
          // A tight cluster, as found (positions illustrative).
          fixed: [
            [-6.5, -3, 0.35],
            [-1, -6, 1.25],
            [4.8, -2.2, 2.8],
            [-3.2, 3.8, 0.9],
            [3.4, 4.6, 1.95],
          ],
        },
        {
          name: 'coal',
          geom: 'coal',
          mat: 'fitting',
          count: 160,
          size: [0.25, 0.7],
          pose: 'tumble',
          sink: 0.35,
          cluster: 0.7,
          small: true,
        },
        {
          name: 'plates',
          geom: 'plate',
          mat: 'steel',
          big: true,
          count: 8,
          size: [
            [1.5, 4],
            [1, 1],
            [1.5, 5],
          ],
          pose: 'lie',
          sink: 0.02,
          ring: [0.35, 1],
        },
        {
          name: 'pipes',
          geom: 'pipe',
          mat: 'steel',
          count: 7,
          size: [
            [0.2, 0.35],
            [0.2, 0.35],
            [2, 6],
          ],
          proportional: true,
          pose: 'lie',
          sink: 0.3,
        },
      ],
    }),
  },
  'titanic-field': {
    spec: (dims) => ({
      ...disc(dims),
      kinds: [
        {
          name: 'plates',
          geom: 'plate',
          mat: 'steel',
          big: true,
          count: 55,
          size: [
            [1.5, 6],
            [1, 1.5],
            [1.5, 7],
          ],
          pose: 'lie',
          sink: 0.02,
        },
        {
          name: 'frames',
          geom: 'frame',
          mat: 'steel',
          big: true,
          count: 30,
          size: [
            [1, 1.4],
            [1, 1.4],
            [3, 9],
          ],
          pose: 'lie',
          sink: 0.05,
        },
        {
          name: 'pipes',
          geom: 'pipe',
          mat: 'steel',
          count: 26,
          size: [
            [0.15, 0.35],
            [0.15, 0.35],
            [1.5, 6],
          ],
          proportional: true,
          pose: 'lie',
          sink: 0.3,
        },
        {
          name: 'cowls',
          geom: 'cowl',
          mat: 'steel',
          count: 5,
          size: [0.8, 1.2],
          pose: 'upright',
          sink: 0.15,
        },
        {
          name: 'benches',
          geom: 'bench',
          mat: 'fitting',
          count: 10,
          size: [0.9, 1.1],
          pose: 'upright',
          sink: 0.05,
          small: true,
        },
        {
          name: 'crockery',
          geom: 'crockery',
          mat: 'fitting',
          count: 70,
          size: [0.22, 0.3],
          pose: 'lie',
          sink: 0.2,
          cluster: 0.4,
          small: true,
          tints: CREAM,
        },
        {
          name: 'bottles',
          geom: 'bottle',
          mat: 'fitting',
          count: 50,
          size: [0.8, 1.1],
          pose: 'lie',
          sink: 0.25,
          small: true,
        },
        {
          name: 'coal',
          geom: 'coal',
          mat: 'fitting',
          count: 160,
          size: [0.15, 0.5],
          pose: 'tumble',
          sink: 0.35,
          small: true,
        },
      ],
    }),
  },
  'titanic-stern-field': {
    spec: (dims) => ({
      ...disc(dims),
      kinds: [
        {
          name: 'plates',
          geom: 'plate',
          mat: 'steel',
          big: true,
          count: 45,
          size: [
            [2, 8],
            [1, 2],
            [2, 9],
          ],
          pose: 'lie',
          sink: 0.03,
          cluster: 0.3,
        },
        {
          name: 'frames',
          geom: 'frame',
          mat: 'steel',
          big: true,
          count: 26,
          size: [
            [1.2, 2],
            [1.2, 2],
            [4, 12],
          ],
          pose: 'lie',
          sink: 0.05,
        },
        {
          name: 'pipes',
          geom: 'pipe',
          mat: 'steel',
          count: 18,
          size: [
            [0.2, 0.5],
            [0.2, 0.5],
            [2, 8],
          ],
          proportional: true,
          pose: 'lie',
          sink: 0.3,
        },
        {
          name: 'cowls',
          geom: 'cowl',
          mat: 'steel',
          count: 3,
          size: [0.9, 1.3],
          pose: 'upright',
          sink: 0.15,
        },
        {
          name: 'crockery',
          geom: 'crockery',
          mat: 'fitting',
          count: 30,
          size: [0.22, 0.3],
          pose: 'lie',
          sink: 0.2,
          small: true,
          tints: CREAM,
        },
        {
          name: 'coal',
          geom: 'coal',
          mat: 'fitting',
          count: 120,
          size: [0.15, 0.6],
          pose: 'tumble',
          sink: 0.35,
          small: true,
        },
      ],
    }),
  },
  'bismarck-turrets': {
    spec: (dims) => {
      const r = dims[0];
      return {
        ...disc(dims),
        kinds: [
          {
            name: 'inverted',
            geom: 'turretInverted',
            mat: 'steel',
            big: true,
            count: 2,
            size: [1, 1],
            pose: 'upright',
            fixed: [
              [-0.55 * r, -0.35 * r, 0.6],
              [0.1 * r, 0.05 * r, 2.3],
            ],
          },
          {
            name: 'side',
            geom: 'turretSide',
            mat: 'steel',
            big: true,
            count: 1,
            size: [1, 1],
            pose: 'upright',
            fixed: [[0.6 * r, 0.3 * r, 4.1]],
          },
          {
            name: 'upright',
            geom: 'turretUpright',
            mat: 'steel',
            big: true,
            count: 1,
            size: [1, 1],
            pose: 'upright',
            fixed: [[-0.2 * r, 0.62 * r, 5.4]],
          },
          {
            name: 'plates',
            geom: 'plate',
            mat: 'steel',
            big: true,
            count: 20,
            size: [
              [1.5, 5],
              [1, 1.5],
              [1.5, 6],
            ],
            pose: 'lie',
            sink: 0.03,
          },
          {
            name: 'mud',
            geom: 'mudBlock',
            mat: 'sediment',
            count: 24,
            size: [
              [2, 5],
              [0.8, 1.6],
              [2, 6],
            ],
            pose: 'upright',
            sink: 0.15,
            ring: [0.1, 1],
          },
        ],
      };
    },
  },
  'bismarck-field': {
    spec: (dims) => ({
      ...disc(dims),
      kinds: [
        {
          name: 'plates',
          geom: 'plate',
          mat: 'steel',
          big: true,
          count: 45,
          size: [
            [2, 7],
            [1, 2],
            [2, 8],
          ],
          pose: 'lie',
          sink: 0.03,
          cluster: 0.3,
        },
        {
          name: 'frames',
          geom: 'frame',
          mat: 'steel',
          big: true,
          count: 24,
          size: [
            [1.2, 2],
            [1.2, 2],
            [4, 11],
          ],
          pose: 'lie',
          sink: 0.05,
        },
        {
          name: 'pipes',
          geom: 'pipe',
          mat: 'steel',
          count: 16,
          size: [
            [0.2, 0.5],
            [0.2, 0.5],
            [2, 8],
          ],
          proportional: true,
          pose: 'lie',
          sink: 0.3,
        },
        {
          name: 'barrels',
          geom: 'barrel',
          mat: 'steel',
          count: 2,
          size: [1, 1],
          pose: 'lie',
          sink: 0.3,
        },
        {
          name: 'mud',
          geom: 'mudBlock',
          mat: 'sediment',
          count: 30,
          size: [
            [1.5, 4],
            [0.5, 1.2],
            [1.5, 5],
          ],
          pose: 'upright',
          sink: 0.1,
        },
        {
          name: 'coal',
          geom: 'coal',
          mat: 'fitting',
          count: 60,
          size: [0.2, 0.6],
          pose: 'tumble',
          sink: 0.3,
          small: true,
        },
      ],
    }),
  },
  'bismarck-landslide': {
    spec: (dims) => ({
      rx: dims[1],
      rz: dims[0],
      kinds: [
        {
          name: 'blocks',
          geom: 'mudBlock',
          mat: 'sediment',
          big: true,
          count: 140,
          size: [
            [3, 12],
            [1, 3.5],
            [3, 14],
          ],
          pose: 'upright',
          sink: 0.2,
          align: 1.2,
          cluster: 0.2,
        },
        {
          name: 'berms',
          geom: 'berm',
          mat: 'sediment',
          big: true,
          count: 26,
          size: [
            [4, 7],
            [1.5, 2.5],
            [25, 45],
          ],
          pose: 'upright',
          sink: 0.25,
          align: 0.12,
          ring: [0.8, 1],
        },
        {
          name: 'clods',
          geom: 'mudBlock',
          mat: 'sediment',
          count: 160,
          size: [
            [0.6, 2],
            [0.3, 0.8],
            [0.6, 2.4],
          ],
          pose: 'upright',
          sink: 0.15,
          small: true,
        },
      ],
    }),
  },
  'endurance-rigging': {
    spec: (dims) => ({
      ...disc(dims),
      kinds: [
        {
          name: 'spars',
          geom: 'spar',
          mat: 'wood',
          big: true,
          count: 9,
          size: [
            [0.5, 0.75],
            [0.5, 0.75],
            [9, 18],
          ],
          proportional: true,
          pose: 'lie',
          sink: 0.25,
          cluster: 0.4,
        },
        {
          name: 'yards',
          geom: 'spar',
          mat: 'wood',
          big: true,
          count: 5,
          size: [
            [0.35, 0.5],
            [0.35, 0.5],
            [11, 16],
          ],
          proportional: true,
          pose: 'lie',
          sink: 0.3,
        },
        {
          name: 'blocks',
          geom: 'block',
          mat: 'wood',
          count: 16,
          size: [0.8, 1.3],
          pose: 'tumble',
          sink: 0.3,
          small: true,
        },
        {
          name: 'coils',
          geom: 'coil',
          mat: 'wood',
          count: 8,
          size: [0.8, 1.4],
          pose: 'lie',
          sink: 0.1,
          small: true,
        },
        {
          name: 'planks',
          geom: 'plank',
          mat: 'wood',
          count: 30,
          size: [
            [0.8, 1.2],
            [1, 1.5],
            [2, 5],
          ],
          pose: 'lie',
          sink: 0.2,
        },
        {
          name: 'anemones',
          geom: 'anemone',
          mat: 'growth',
          count: 60,
          size: [0.1, 0.22],
          pose: 'upright',
          sink: 0,
          small: true,
          tints: LIFE_TINTS,
          cluster: 0.4,
        },
      ],
    }),
  },
  'endurance-stern': {
    spec: (dims) => ({
      ...disc(dims),
      kinds: [
        {
          name: 'planks',
          geom: 'plank',
          mat: 'wood',
          big: true,
          count: 18,
          size: [
            [0.8, 1.3],
            [1, 1.5],
            [1.5, 4],
          ],
          pose: 'lie',
          sink: 0.2,
        },
        {
          name: 'timbers',
          geom: 'spar',
          mat: 'wood',
          big: true,
          count: 3,
          size: [
            [0.3, 0.45],
            [0.3, 0.45],
            [2.5, 4],
          ],
          proportional: true,
          pose: 'lie',
          sink: 0.3,
        },
        {
          name: 'coils',
          geom: 'coil',
          mat: 'wood',
          count: 2,
          size: [0.8, 1.1],
          pose: 'lie',
          sink: 0.1,
          small: true,
        },
        {
          name: 'anemones',
          geom: 'anemone',
          mat: 'growth',
          count: 40,
          size: [0.08, 0.18],
          pose: 'upright',
          sink: 0,
          small: true,
          tints: LIFE_TINTS,
        },
        {
          name: 'squirts',
          geom: 'squirt',
          mat: 'growth',
          count: 25,
          size: [0.06, 0.12],
          pose: 'upright',
          sink: 0,
          small: true,
          tints: LIFE_TINTS,
        },
      ],
    }),
  },
};

/** The layout spec of a kit at given dims (exported for tests). */
export function wreckScatterSpec(
  id: WreckScatterId,
  dims: readonly [number, number, number],
): ScatterSpec {
  return KITS[id].spec(dims);
}

function material(kind: MatKind, detail: WreckDetail): THREE.Material {
  switch (kind) {
    case 'steel':
      return steelMaterial(detail);
    case 'wood':
      return woodMaterial(detail);
    case 'growth':
      return growthMaterial();
    case 'sediment':
      return sedimentMaterial();
    default:
      return fittingMaterial();
  }
}

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

/** Build a scatter kit. */
export function buildWreckScatter(
  id: WreckScatterId,
  dims: readonly [number, number, number],
  seed: number,
  detail: WreckDetail,
  heightAt?: LocalHeightFn,
): WreckBuilt {
  const spec = KITS[id].spec(dims);
  const rnd = mulberry32(seed);
  const placements = layoutScatter(spec, rnd, {
    density: detail.debrisDensity,
    smallDebris: detail.smallDebris,
    heightAt,
  });
  const byKind = new Map<string, InstanceList>();
  const tintRnd = mulberry32(seed ^ 0x7197);
  for (const p of placements) {
    const kind = spec.kinds.find((k) => k.name === p.kind)!;
    let list = byKind.get(p.kind);
    if (!list) byKind.set(p.kind, (list = new InstanceList()));
    _e.set(p.rx, p.ry, p.rz, 'YXZ');
    const m = new THREE.Matrix4().compose(
      _p.set(p.x, p.y, p.z),
      _q.setFromEuler(_e),
      _s.set(p.sx, p.sy, p.sz),
    );
    const tint = kind.tints
      ? new THREE.Color(kind.tints[Math.floor(tintRnd() * kind.tints.length)]!)
      : new THREE.Color().setScalar(0.8 + tintRnd() * 0.35);
    list.push(m, tint);
  }
  const core: THREE.Mesh[] = [];
  const near: THREE.Object3D[] = [];
  for (const kind of spec.kinds) {
    const list = byKind.get(kind.name);
    if (!list) continue;
    const mesh = makeInstanced(
      piece(kind.geom),
      material(kind.mat, detail),
      list,
      `${id}-${kind.name}`,
    );
    if (!mesh) continue;
    if (kind.big) core.push(mesh);
    else near.push(mesh);
  }
  // Scatter kits sit well inside the fog at their impostor distance: nothing to draw.
  const far = new THREE.Group();
  return assembleWreck(id, { core, near, far, colliders: [], anchors: [] }, detail);
}
