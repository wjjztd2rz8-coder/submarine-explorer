/** Local sediment and broken sulfide around Beebe's opening smoker cluster. */
import * as THREE from 'three';
import type { ProceduralBuildInput } from '../builders/shared.js';
import { geoDetail } from './detail.js';
import { fbm3, heightMesh, mergeAll, paint, smooth, type BuiltProp } from './shared.js';
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

/** Append an opaque, terrain-following apron; its buried rim avoids a visible decal edge. */
export function addBeebeSeabed(built: BuiltProp, input: ProceduralBuildInput): BuiltProp {
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
    const lobes = fbm3(x / cfg.patch_size_m, 2, z / cfg.patch_size_m, seed ^ 0xbee, 3);
    return radius * (1 + (lobes - 0.5) * 0.2);
  };
  const surface = (x: number, z: number): number => {
    const r = rim(x, z);
    const fade = 1 - smooth(0.65, 0.96, r);
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
  const edge = new THREE.Color(cfg.edge_color);
  const stain = new THREE.Color(cfg.stain_color);
  const rock = new THREE.Color(cfg.rubble_color);
  const color = (x: number, z: number, out: THREE.Color, rubble: boolean): void => {
    const r = rim(x, z);
    const n = fbm3(x / cfg.patch_size_m, 7, z / cfg.patch_size_m, seed ^ 0x71, 3);
    const grain = fbm3(
      x / (cfg.patch_size_m * 0.3),
      3,
      z / (cfg.patch_size_m * 0.3),
      seed ^ 0x92,
      2,
    );
    out.copy(rubble ? rock : sediment).lerp(edge, smooth(0.5, 1, r));
    // Patchy rusty mineral precipitates stay muted against the lighter, grey-tan sediment.
    out.lerp(stain, smooth(0.4, 0.75, n) * cfg.stain_amount * (1 - smooth(0.65, 1, r)));
    out.multiplyScalar(0.88 + grain * 0.24);
  };
  paint(apron, (x, _y, z, _ny, out) => color(x, z, out, false));
  const material = new THREE.MeshStandardMaterial({
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
      detail: tier === 'low' ? 0 : Math.min(1, detail.sphereDetail),
      seed: seed ^ 0x7a105,
    },
  );
  if (rubble.length) {
    const geometry = mergeAll(rubble);
    paint(geometry, (x, _y, z, _ny, out) => color(x, z, out, true));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    built.bounds.union(geometry.boundingBox!);
    const talus = new THREE.Mesh(geometry, material);
    talus.name = 'beebe-seabed-talus';
    built.full.add(talus);
  }
  return built;
}
