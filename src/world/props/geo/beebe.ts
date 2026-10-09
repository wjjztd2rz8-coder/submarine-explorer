/** Local sediment and broken sulfide around Beebe's opening smoker cluster. */
import * as THREE from 'three';
import { DEFAULT_CONFIG, isGraphicsTier } from '../../../core/Config.js';
import { biomeFor } from '../../TerrainBiome.js';
import { createTerrainMaterial } from '../../TerrainMaterial.js';
import type { ProceduralBuildInput } from '../builders/shared.js';
import { geoDetail } from './detail.js';
import {
  fbm3,
  heightMesh,
  mergeAll,
  mulberry32,
  paint,
  place,
  smooth,
  type BuiltProp,
} from './shared.js';
import { scatterRubble } from './talus.js';

interface BeebeSeabed {
  width_m: number;
  depth_m: number;
  grid_segments: number;
  lift_m: number;
  relief_m: number;
  rim_sink_m: number;
  patch_size_m: number;
  sediment_color: number;
  edge_color: number;
  stain_color: number;
  stain_amount: number;
  rubble_color: number;
  rubble_count: number;
  rubble_size_m: number;
}

function settings(input: ProceduralBuildInput): BeebeSeabed | undefined {
  // The raw authoring extension keeps this treatment confined to the Beebe content pack.
  if (input.def.id !== 'beebe-chimney-1' || input.def.feature !== 'smoker-cluster') return;
  const raw = input.def.raw.beebe_seabed;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
  const value = raw as Record<string, unknown>;
  const positive = [
    'width_m',
    'depth_m',
    'grid_segments',
    'lift_m',
    'relief_m',
    'rim_sink_m',
    'patch_size_m',
    'rubble_count',
    'rubble_size_m',
  ];
  const colors = ['sediment_color', 'edge_color', 'stain_color', 'rubble_color'];
  if (
    !positive.every(
      (key) => typeof value[key] === 'number' && Number.isFinite(value[key]) && value[key] > 0,
    ) ||
    !colors.every(
      (key) =>
        Number.isInteger(value[key]) && Number(value[key]) >= 0 && Number(value[key]) <= 0xffffff,
    ) ||
    typeof value.stain_amount !== 'number' ||
    !Number.isFinite(value.stain_amount) ||
    value.stain_amount < 0 ||
    value.stain_amount > 1
  )
    return;
  return value as unknown as BeebeSeabed;
}

/** Angular, noise-displaced rock: a coarse polyhedron clipped by random planes, flat-shaded. */
function angularRock(detail: number, seed: number): THREE.BufferGeometry {
  const rnd = mulberry32(seed);
  const g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, Math.max(1, detail));
  const p = g.getAttribute('position');
  const planes: Array<[THREE.Vector3, number]> = [];
  for (let i = 0; i < 6; i++) {
    const n = new THREE.Vector3(rnd() * 2 - 1, (rnd() * 2 - 1) * 0.8, rnd() * 2 - 1).normalize();
    planes.push([n, 0.55 + rnd() * 0.3]);
  }
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = fbm3(v.x * 1.5 + 7, v.y * 1.5 + 7, v.z * 1.5 + 7, seed, 3);
    v.multiplyScalar(1 + (n - 0.5) * 0.9);
    for (const [pn, d] of planes) {
      const over = v.dot(pn) - d;
      if (over > 0) v.addScaledVector(pn, -over);
    }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  // IcosahedronGeometry already duplicates corners, retaining hard faceting.
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  return g;
}

/** Supporting terrain material, without loading another set of seabed textures. */
export function beebeSeabedMaterial(ground: {
  sampleHeight(x: number, z: number): number;
  group?: THREE.Group;
}): THREE.MeshStandardMaterial | undefined {
  for (const child of ground.group?.children ?? []) {
    if (
      child instanceof THREE.Mesh &&
      child.material instanceof THREE.MeshStandardMaterial &&
      child.material.name === 'seabed'
    )
      return child.material;
  }
  return;
}

/** Append a terrain-following apron; world-space seabed shading hides its buried, noisy outline. */
function addBeebeApron(built: BuiltProp, input: ProceduralBuildInput): BuiltProp {
  const cfg = settings(input);
  if (!cfg) return built;
  const ground = input.groundHeight();
  if (!ground) return built;
  const { seed, tier, dims } = input;
  const detail = geoDetail(tier);
  const halfX = cfg.width_m / 2;
  const halfZ = cfg.depth_m / 2;
  const rim = (x: number, z: number): number => {
    const radius = Math.hypot(x / halfX, z / halfZ);
    // Multi-scale noise plus angular lobes break the ellipse into bays and tongues; the
    // distortion tapers to nothing at the mesh edge, so that edge always stays buried.
    const lobes = fbm3(x / cfg.patch_size_m, 2, z / cfg.patch_size_m, seed ^ 0xbee, 3);
    const broad = fbm3(
      x / (cfg.patch_size_m * 2.6),
      5,
      z / (cfg.patch_size_m * 2.6),
      seed ^ 0x5e1,
      2,
    );
    const a = Math.atan2(z, x);
    const bays = Math.sin(a * 3 + (seed % 17)) * 0.05 + Math.sin(a * 5 + (seed % 7)) * 0.035;
    const wobble =
      ((lobes - 0.5) * 1.4 + (broad - 0.5) * 1.1 + bays) *
      smooth(0.58, 0.8, radius) *
      (1 - smooth(0.82, 1, radius));
    return radius * (1 + wobble);
  };
  const surface = (x: number, z: number): number => {
    const r = rim(x, z);
    const fade = 1 - smooth(0.6, 0.96, r);
    const grain = fbm3(x / cfg.patch_size_m, 4, z / cfg.patch_size_m, seed ^ 0x680, 3);
    // sampleHeight already contains measured bathymetry and procedural terrain detail.
    // A small positive lift hides triangulation gaps; the outer ring sinks into the floor.
    return (
      ground(x, z) +
      (cfg.lift_m + grain * cfg.relief_m) * fade -
      cfg.rim_sink_m * smooth(0.85, 1, r)
    );
  };
  const segments = Math.max(8, Math.round(cfg.grid_segments * detail.meshDensity));
  const apron = heightMesh(cfg.width_m, cfg.depth_m, segments, segments, surface);
  const sediment = new THREE.Color(cfg.sediment_color);
  const stain = new THREE.Color(cfg.stain_color);
  const basalt = new THREE.Color(0x2e2d2b);
  // Keep every supporting height (and therefore the 850 clumps) unchanged. The plate
  // came from a plain pale material with radial edge tint, not the height mesh.
  // A neutral cavity lets this mesh use exactly the surrounding floor's shader.
  apron.setAttribute(
    'aCavity',
    new THREE.BufferAttribute(new Float32Array(apron.getAttribute('position').count).fill(0.5), 1),
  );
  const supporting =
    input.seabedMaterial ??
    createTerrainMaterial({
      config: DEFAULT_CONFIG.terrain,
      tier: isGraphicsTier(input.tier) ? input.tier : 'high',
      biome: biomeFor('beebe-vent-field'),
      exaggeration: 1,
    }).material;
  const material = new THREE.MeshStandardMaterial({
    color: supporting.color,
    roughness: supporting.roughness,
    metalness: supporting.metalness,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  // A separate material owns its lifetime, while maps/uniforms remain terrain-owned.
  // The world-space projection continues across the join despite the prop's heading.
  material.name = 'beebe-seabed-blend';
  material.onBeforeCompile = supporting.onBeforeCompile;
  material.customProgramCacheKey = supporting.customProgramCacheKey;
  material.userData.uniforms = supporting.userData.uniforms;
  const rubbleMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 1,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const mesh = new THREE.Mesh(apron, material);
  mesh.name = 'beebe-mineral-seabed';
  apron.computeBoundingBox();
  apron.computeBoundingSphere();

  // The skirt is decoration: retain the original collision volume even when culling grows.
  built.colliders ??= [built.bounds.clone()];
  built.bounds.union(apron.boundingBox!);
  built.full.add(mesh);
  const rubble = scatterRubble(
    surface,
    (x, z) => {
      if (Math.hypot(x / (dims[0] / 2), z / (dims[1] / 2)) < 1) return 0;
      return (1 - smooth(0.55, 0.85, rim(x, z))) * 0.65;
    },
    {
      halfX,
      halfZ,
      count: Math.max(3, Math.round(cfg.rubble_count * detail.growth)),
      size: cfg.rubble_size_m,
      detail: tier === 'low' ? 1 : 2,
      seed: seed ^ 0x7a105,
      make: angularRock,
      lift: 0.1,
    },
  );
  if (rubble.length) {
    const geometry = mergeAll(rubble);
    paint(geometry, (x, y, z, ny, out) => {
      // Basalt-dark blocks, patchy sulfide staining and a dusting of sediment on upper faces.
      const m = fbm3(x * 0.9, y * 1.4, z * 0.9, seed ^ 0x3a1, 2);
      const s = fbm3(x * 0.35, y * 0.6, z * 0.35, seed ^ 0x9d, 2);
      const f = fbm3(x * 3.1, y * 3.1, z * 3.1, seed ^ 0x2c, 2);
      out.copy(basalt).multiplyScalar(0.7 + m * 0.9 + (f - 0.5) * 0.5);
      out.lerp(stain, smooth(0.45, 0.7, s) * 0.45);
      out.lerp(sediment, smooth(0.5, 0.95, ny) * 0.1);
    });
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    built.bounds.union(geometry.boundingBox!);
    const talus = new THREE.Mesh(geometry, rubbleMaterial);
    talus.name = 'beebe-seabed-talus';
    built.full.add(talus);
  }
  return built;
}

/** Beebe's authored cool-flow margins; kept separate from the existing shrimp-covered stacks. */
function addBeebeHabitat(built: BuiltProp, input: ProceduralBuildInput): void {
  if (!['beebe-chimney-1', 'beebe-chimney-2', 'beebe-chimney-3'].includes(input.def.id)) return;
  const raw = input.def.raw.beebe_habitat;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
  const cfg = raw as Record<string, number>;
  const keys = [
    'clumps',
    'worms_per_clump',
    'mussels_per_clump',
    'rubble_count',
    'flow_length_m',
    'clump_radius_m',
    'worm_height_m',
    'rubble_size_m',
  ];
  if (
    !keys.every((key) => Number.isFinite(cfg[key]) && cfg[key]! > 0) ||
    !Number.isFinite(cfg.flow_deg)
  )
    return;
  // Bound untrusted authoring extensions before allocating geometry.
  if (keys.some((key) => cfg[key]! > 64)) return;
  const ground = input.groundHeight();
  if (!ground) return;
  const d = geoDetail(input.tier);
  const rnd = mulberry32(input.seed ^ 0x850);
  const pieces: THREE.BufferGeometry[] = [];
  const apron = built.full.getObjectByName('beebe-mineral-seabed') as THREE.Mesh | undefined;
  const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
  const surface = (x: number, z: number): number => {
    const y = ground(x, z);
    if (!apron) return y;
    // Seat against the rendered apron triangles, including its uneven/buried rim.
    ray.ray.origin.set(x, y + 10, z);
    const hit = ray.intersectObject(apron)[0];
    return Math.max(y, hit?.point.y ?? y);
  };
  const clumps = Math.max(3, Math.round(cfg.clumps! * d.growth));
  const perWorm = Math.max(3, Math.round(cfg.worms_per_clump! * d.growth));
  const perMussel = Math.max(5, Math.round(cfg.mussels_per_clump! * d.growth));
  const flow = THREE.MathUtils.degToRad(cfg.flow_deg!);
  const radius = Math.hypot(input.dims[0], input.dims[1]) / 2 + 2;
  const anchors: number[][] = [];
  for (let k = 0; k < clumps; k++) {
    // First clumps circle the base; the rest follow two broken downstream margins.
    const downstream = k >= Math.ceil(clumps / 3);
    const a = downstream
      ? flow + (k % 2 ? 0.35 : -0.35)
      : flow + (k / Math.ceil(clumps / 3)) * Math.PI * 2;
    const r = radius + (downstream ? ((k + 1) / clumps) * cfg.flow_length_m! : rnd() * 2);
    const cx = Math.cos(a) * r;
    const cz = Math.sin(a) * r;
    anchors.push([cx, surface(cx, cz), cz]);
    for (let i = 0; i < perWorm + perMussel; i++) {
      const angle = rnd() * Math.PI * 2;
      const spread = Math.sqrt(rnd()) * cfg.clump_radius_m!;
      const x = cx + Math.cos(angle) * spread;
      const z = cz + Math.sin(angle) * spread;
      let geometry: THREE.BufferGeometry;
      if (i < perWorm) {
        const h = cfg.worm_height_m! * (0.55 + rnd() * 0.6);
        const stem = new THREE.CylinderGeometry(0.035, 0.055, h * 0.8, 5, 1).translate(
          0,
          h * 0.4,
          0,
        );
        paint(stem, (_x, _y, _z, _ny, color) => color.set(0xb0aa96));
        const crown = new THREE.ConeGeometry(0.095, h * 0.2, 5).translate(0, h * 0.9, 0);
        paint(crown, (_x, _y, _z, _ny, color) => color.set(0x873c38));
        geometry = mergeAll([stem, crown]);
        place(geometry, {
          x,
          y: surface(x, z) - 0.025,
          z,
          rx: Math.sin(angle) * 0.12,
          rz: Math.cos(angle) * 0.12,
        });
      } else {
        geometry = new THREE.IcosahedronGeometry(1, 0);
        paint(geometry, (_x, _y, _z, ny, color) => color.set(ny > 0.5 ? 0x77796e : 0x414940));
        place(geometry, {
          x,
          y: surface(x, z) + 0.045,
          z,
          ry: rnd() * Math.PI * 2,
          sx: 0.18 + rnd() * 0.12,
          sy: 0.08,
          sz: 0.12,
        });
      }
      pieces.push(geometry);
    }
  }
  const rubble = Math.max(6, Math.round(cfg.rubble_count! * d.growth));
  for (let k = 0; k < rubble; k++) {
    const a = flow + (rnd() - 0.5) * Math.PI * 1.7;
    const r = radius + rnd() * cfg.flow_length_m!;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const size = cfg.rubble_size_m! * (0.5 + rnd());
    // Short fractured columns supplement the existing rounded talus.
    const chunk = new THREE.CylinderGeometry(size * 0.45, size * 0.6, size * 1.5, 5, 1);
    paint(chunk, (_x, _y, _z, ny, color) => color.set(ny > 0.5 ? 0x756b58 : 0x494840));
    place(chunk, {
      x,
      y: surface(x, z) + size * 0.25,
      z,
      rx: 0.9 + rnd() * 0.7,
      ry: rnd() * Math.PI * 2,
    });
    pieces.push(chunk);
  }
  const geometry = mergeAll(pieces);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const habitat = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: 0x999999, vertexColors: true, roughness: 0.92 }),
  );
  habitat.name = 'beebe-flow-habitat';
  habitat.userData = {
    clumps,
    worms: clumps * perWorm,
    mussels: clumps * perMussel,
    rubble,
    anchors,
  };
  // Decorative clumps must not enlarge collision volumes or alter the vent source.
  built.colliders ??= [built.bounds.clone()];
  built.bounds.union(geometry.boundingBox!);
  built.full.add(habitat);
}

/** The existing vent-builder hook keeps all additions confined to authored Beebe props. */
export function addBeebeSeabed(built: BuiltProp, input: ProceduralBuildInput): BuiltProp {
  addBeebeApron(built, input);
  addBeebeHabitat(built, input);
  return built;
}

/** Near-grid triangle sampling for Beebe's tiny plain-chimney colonies, without raycasting entire chunks per shell. */
export function beebeRenderedGround(
  ground: { sampleHeight(x: number, z: number): number },
  centreX: number,
  centreZ: number,
): (x: number, z: number) => number {
  // Terrain's existing render group is optional: narrow headless height fields keep their sampler.
  const group = (ground as typeof ground & { group?: THREE.Group }).group;
  const grids: Array<{ p: THREE.BufferAttribute; nx: number; nz: number }> = [];
  for (const object of group?.children ?? []) {
    if (!(object instanceof THREE.Mesh) || !object.name.startsWith('chunk_')) continue;
    const box = object.geometry.boundingBox as THREE.Box3;
    if (
      box.max.x < centreX - 64 ||
      box.min.x > centreX + 64 ||
      box.max.z < centreZ - 64 ||
      box.min.z > centreZ + 64
    )
      continue;
    const p = object.geometry.getAttribute('position') as THREE.BufferAttribute;
    let nx = 1;
    while (nx < p.count && p.getZ(nx) === p.getZ(0)) nx++;
    // TerrainChunk's regular near grid is followed by two rows and two columns of skirt vertices.
    const nz = (p.count - 2 * nx) / (nx + 2);
    if (nx >= 2 && Number.isInteger(nz) && nz >= 2) grids.push({ p, nx, nz });
  }
  return (x, z) => {
    for (const { p, nx, nz } of grids) {
      const x0 = p.getX(0),
        z0 = p.getZ(0);
      const x1 = p.getX(nx - 1),
        z1 = p.getZ((nz - 1) * nx);
      if (x < x0 || x > x1 || z < z0 || z > z1) continue;
      const i = Math.min(nx - 2, Math.floor((x - x0) / ((x1 - x0) / (nx - 1))));
      const j = Math.min(nz - 2, Math.floor((z - z0) / ((z1 - z0) / (nz - 1))));
      const a = j * nx + i,
        b = a + 1,
        d = a + nx,
        e = d + 1;
      const tx = (x - p.getX(a)) / (p.getX(b) - p.getX(a));
      const tz = (z - p.getZ(a)) / (p.getZ(d) - p.getZ(a));
      return tx + tz <= 1
        ? p.getY(a) + (p.getY(b) - p.getY(a)) * tx + (p.getY(d) - p.getY(a)) * tz
        : p.getY(e) + (p.getY(d) - p.getY(e)) * (1 - tx) + (p.getY(b) - p.getY(e)) * (1 - tz);
    }
    return ground.sampleHeight(x, z);
  };
}
