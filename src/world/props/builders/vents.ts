/**
 * Vent builders: `procedural:chimney`, a knobbly tapered rock column with
 * height dimensions_m[2] and a palette from material_hint (basalt | carbonate
 * | sulfide). Split out of `world/props/Procedural.ts` (F0-CORE); owned by the
 * vents / reefs / geology package.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ChimneyMaterial, PropsConfig } from '../../../core/Config.js';
import { geoDetail } from '../geo/detail.js';
import { geoMaterial } from '../geo/materials.js';
import { buildGeo } from '../geo/index.js';
import {
  mulberry32,
  normalise,
  projectUVs,
  valueNoise3,
  type BuiltProp,
  type ProceduralBuilder,
} from './shared.js';

// ------------------------------------------------------------------ chimney

/** Body and top-stain colours for a chimney `material_hint`. */
export function chimneyPalette(
  material: ChimneyMaterial,
  cfg: PropsConfig,
): { rock: number; stain: number } {
  return material === 'basalt'
    ? { rock: cfg.colors.basalt, stain: cfg.colors.mineral }
    : cfg.chimneyMaterials[material];
}

/**
 * A hydrothermal chimney: tapered, knobbly rock column with pale mineral
 * staining toward the top and one or two side spires. dims[2] is the height;
 * dims[0], if > 0, the base diameter. `material` picks the palette (basalt
 * grey by default; carbonate white/cream; sulfide near-black); geometry is the
 * same for all three.
 */
export function buildChimney(
  dims: readonly [number, number, number],
  seed: number,
  cfg: PropsConfig,
  material: ChimneyMaterial = 'basalt',
): BuiltProp {
  const palette = chimneyPalette(material, cfg);
  const H = dims[2];
  const baseR = dims[0] > 0 ? dims[0] / 2 : H * cfg.chimneyRadiusFraction;
  const rnd = mulberry32(seed);
  const pieces: THREE.BufferGeometry[] = [];

  const column = (h: number, r0: number, x: number, y: number, z: number, s: number): void => {
    const g = new THREE.CylinderGeometry(
      r0 * cfg.chimneyTopFraction,
      r0,
      h,
      14,
      Math.max(4, Math.round(h / 2.5)),
    );
    g.translate(0, h / 2, 0);
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const px = p.getX(i);
      const py = p.getY(i);
      const pz = p.getZ(i);
      const ang = Math.atan2(pz, px);
      // Knobbly: radius wobble from noise around the circumference and up the height.
      const n = valueNoise3(Math.cos(ang) * 1.5 + 3, py * 0.35, Math.sin(ang) * 1.5 + 3, s);
      const f = 0.8 + 0.4 * n;
      p.setXYZ(i, px * f + x, py + y, pz * f + z);
    }
    g.computeVertexNormals();
    pieces.push(normalise(g));
  };

  column(H, baseR, 0, 0, 0, seed);
  const spires = 1 + Math.floor(rnd() * 2);
  for (let i = 0; i < spires; i++) {
    const a = rnd() * Math.PI * 2;
    const h = H * (0.25 + rnd() * 0.3);
    const y = H * (0.1 + rnd() * 0.35);
    const off = baseR * (0.55 + rnd() * 0.2);
    column(h, baseR * (0.25 + rnd() * 0.15), Math.cos(a) * off, y, Math.sin(a) * off, seed + i + 1);
  }

  const merged = mergeGeometries(pieces, false);
  if (!merged) throw new Error('chimney: geometry merge failed');
  for (const p of pieces) p.dispose();

  // Absolute vertex colours: rock, mineral staining near the top, a little growth at the foot.
  const pos = merged.getAttribute('position');
  const basalt = new THREE.Color(palette.rock);
  const mineral = new THREE.Color(palette.stain);
  const growth = new THREE.Color(cfg.colors.growth);
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const h01 = y / H;
    const n = valueNoise3(x * 0.5, y * 0.4, z * 0.5, seed ^ 0xc41);
    const stain = THREE.MathUtils.smoothstep(h01 + (n - 0.5) * 0.35, 0.65, 0.95) * 0.7;
    const foot = (1 - THREE.MathUtils.smoothstep(h01, 0, 0.15)) * 0.35;
    c.copy(basalt)
      .multiplyScalar(0.8 + 0.4 * n)
      .lerp(mineral, stain)
      .lerp(growth, foot);
    col.set([c.r, c.g, c.b], i * 3);
  }
  merged.setAttribute('color', new THREE.BufferAttribute(col, 3));
  merged.computeBoundingSphere();
  merged.computeBoundingBox();

  const full = new THREE.Mesh(
    merged,
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.95,
      metalness: 0,
      flatShading: false,
    }),
  );
  full.name = 'chimney';

  const imp = new THREE.Mesh(
    new THREE.CylinderGeometry(baseR * cfg.chimneyTopFraction, baseR, H, 6).translate(0, H / 2, 0),
    new THREE.MeshStandardMaterial({ color: palette.rock, roughness: 1, metalness: 0 }),
  );
  imp.name = 'chimney-impostor';
  return { full, impostor: imp, bounds: merged.boundingBox!.clone() };
}

/**
 * A chimney as placed in a landmark: the base column plus a detail texture
 * (flowstone on carbonate, cracked rock otherwise). Smoke, shimmer and glow come
 * from the vent environment preset (`world/presets/VentPreset.ts`), which finds
 * `procedural:chimney` props. `buildChimney` stays the plain geometry.
 */
export function buildPlacedChimney(
  dims: readonly [number, number, number],
  seed: number,
  cfg: PropsConfig,
  material: ChimneyMaterial,
  tier: string,
): BuiltProp {
  const built = buildChimney(dims, seed, cfg, material);
  const d = geoDetail(tier);
  const body = built.full as THREE.Mesh;
  projectUVs(body.geometry, material === 'carbonate' ? 5 : 3);
  const old = body.material as THREE.Material;
  body.material = geoMaterial(material === 'carbonate' ? 'flow' : 'rock', d, {
    roughness: 0.93,
    bumpScale: 1.2,
  });
  old.dispose();
  // The flow texture restores the mean brightness; pale carbonate would still clip in the headlights.
  if (material === 'carbonate')
    (body.material as THREE.MeshStandardMaterial).color.multiplyScalar(0.7);
  return built;
}

/** Registry entries for this family (`builders/index.ts`). */
export const VENT_BUILDERS = {
  // A chimney with a `feature` is a vent set piece (Poseidon, a smoker mound): it stays
  // `procedural:chimney` so the vent preset still puts smoke and glow on its tallest stack.
  chimney: (input) =>
    input.def.feature
      ? buildGeo(input)
      : buildPlacedChimney(
          input.dims,
          input.seed,
          input.cfg,
          input.def.materialHint ?? 'basalt',
          input.tier,
        ),
} satisfies Record<'chimney', ProceduralBuilder>;
