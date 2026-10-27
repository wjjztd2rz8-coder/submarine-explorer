// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { ModelCache } from '../../src/world/PropLoader.js';
import { Props } from '../../src/world/Props.js';
import { validateMeta } from '../../src/world/TileLoader.js';
import { EventBus } from '../../src/core/EventBus.js';
import { sampleAtmosphere } from '../../src/render/Atmosphere.js';
import { latLonToWorld } from '../../src/util/geo.js';
import { Terrain } from '../../src/world/Terrain.js';
import { Currents } from '../../src/world/Currents.js';
import { PresetSystem } from '../../src/world/presets/Presets.js';
import * as geo from '../../src/world/props/geo/detail.js';
import { composedFreeDiveSpawn, chooseFreeDiveHull, spawnSettings } from '../../src/game/Spawn.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import blueHolePoses from '../../tools/blue-hole-poses.json';

/**
 * Conservative static prop cost: every prop at once, with BOTH internal LOD
 * branches included. Count material groups, transparent double-sided passes
 * and instances. This is a guard on content growth, not a rendered-frame
 * measurement (terrain, vehicles, life, frustum/LOD selection are excluded).
 */
function staticCost(root: THREE.Object3D): { calls: number; triangles: number } {
  let calls = 0;
  let triangles = 0;
  root.traverse((object) => {
    if ((object as THREE.Sprite).isSprite) {
      if ((object as THREE.Sprite).material.visible) {
        calls++;
        triangles += 2;
      }
      return;
    }
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh && !(object as THREE.Points).isPoints && !(object as THREE.Line).isLine)
      return;
    const instances = (mesh as THREE.InstancedMesh).isInstancedMesh
      ? (mesh as THREE.InstancedMesh).count
      : 1;
    if (!instances) return;
    const geometry = mesh.geometry;
    const vertices = geometry.index?.count ?? geometry.getAttribute('position').count;
    const drawStart = geometry.drawRange.start;
    const drawEnd = Math.min(vertices, drawStart + geometry.drawRange.count);
    const add = (material: THREE.Material | undefined, start: number, count: number): void => {
      if (!material?.visible) return;
      const actual = Math.max(0, Math.min(drawEnd, start + count) - Math.max(drawStart, start));
      if (!actual) return;
      const passes =
        mesh.isMesh &&
        material.transparent &&
        material.side === THREE.DoubleSide &&
        !material.forceSinglePass
          ? 2
          : 1;
      calls += passes;
      if (mesh.isMesh) triangles += (actual / 3) * instances * passes;
    };
    if (Array.isArray(mesh.material)) {
      for (const group of geometry.groups)
        add(mesh.material[group.materialIndex ?? 0], group.start, group.count);
    } else add(mesh.material, 0, vertices);
  });
  return { calls, triangles };
}

const sites = (
  JSON.parse(readFileSync('data/landmarks/index.json', 'utf8')) as { landmarks: string[] }
).landmarks;

/** Read actual GLB geometry/materials; image decoding is irrelevant to this census. */
async function localModel(url: string): Promise<THREE.Object3D> {
  const loader = new GLTFLoader();
  loader.register(() => ({
    name: 'static-census-textures',
    loadTexture: async () => new THREE.Texture(),
  }));
  const bytes = readFileSync(`public${url}`);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return (await loader.parseAsync(buffer, '')).scene;
}
const diagnostics =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
    ?.PERF_BUDGET_STATIC === '1';
const rows: Array<{ site: string; tier: string; calls: number; triangles: number }> = [];

afterAll(() => {
  if (!diagnostics) return;
  mkdirSync('.cache/perf-budget', { recursive: true });
  writeFileSync('.cache/perf-budget/static.json', JSON.stringify(rows, null, 2));
});

describe('catalog site static prop budgets', () => {
  for (const site of sites) {
    const tiers =
      site === 'lost-city' || site === 'beebe-vent-field' || site === 'great-blue-hole'
        ? (['low', 'medium', 'high'] as const)
        : diagnostics
          ? (['low', 'high'] as const)
          : (['low'] as const);
    for (const tier of tiers) {
      it(`${site} ${tier}: bounds prop draw calls and triangles before culling`, async () => {
        const meta = validateMeta(
          JSON.parse(readFileSync(`data/tiles/${site}/meta.json`, 'utf8')),
          site,
        );
        const doc: unknown = JSON.parse(readFileSync(`data/landmarks/${site}/props.json`, 'utf8'));
        const props = new Props(
          meta,
          {
            sampleHeight: () => -100,
            getNormal: (_x, _z, out = new THREE.Vector3()) => out.set(0, 1, 0),
          },
          DEFAULT_CONFIG.props,
          tier,
        );
        // Blake includes two real GLB rocks. Avoid network/DOM image loaders,
        // while preserving the shipped mesh, material sides and placement path.
        const models = vi.spyOn(ModelCache.prototype, 'get').mockImplementation(localModel);
        try {
          const stats = await props.placeAll(doc, site);
          expect(stats.failed).toBe(0);
          expect(stats.skipped).toBe(0);
          expect(stats.count).toBeGreaterThan(0);
          if (site === 'blake-plateau-corals') expect(stats.models).toBe(2);
          else expect(stats.models).toBe(0); // The other documents use procedural content.
          const totals = { calls: 0, triangles: 0 };
          for (const placed of props.placed) {
            const cost = staticCost(placed.full);
            totals.calls += cost.calls;
            totals.triangles += cost.triangles;
          }
          if (diagnostics) rows.push({ site, tier, ...totals });
          expect(totals.calls).toBeGreaterThan(0);
          expect(totals.triangles).toBeGreaterThan(0);
          if (tier === 'low' || site === 'great-blue-hole') {
            // Reserve 300 calls / 300k triangles of the frame budget for the rest
            // of the scene; the e2e guard checks the actual full-frame budget.
            expect(totals.calls).toBeLessThanOrEqual(1200);
            expect(totals.triangles).toBeLessThanOrEqual(1_200_000);
          }
        } finally {
          models.mockRestore();
        }
      });
    }
  }
});

/**
 * CPU workload estimate, not GPU time: project actual point buffers as square
 * footprints, before texture/alpha/fog/depth rejection. All full props remain
 * present (no LOD/frustum/occlusion discount). Plumes use their compiled uniforms
 * and seeded clear-fluid vertex motion at fixed times; no browser is required.
 */
function effectFootprints(root: THREE.Object3D, camera: THREE.PerspectiveCamera, time: number) {
  const width = 1280;
  const height = 720;
  const rectangles: number[][] = [];
  const layers: Record<
    string,
    { draws: number; points: number; squareM2: number; pixels: number }
  > = {};
  root.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  root.traverse((object) => {
    // A new transparent mesh/sprite must enter the census, not silently bypass
    // the point-sprite budget. Shipped Lost City props have neither.
    expect(object instanceof THREE.Sprite).toBe(false);
    if (object instanceof THREE.Mesh) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      expect(materials.some((material) => material.transparent)).toBe(false);
    }
    if (!(object instanceof THREE.Points)) return;
    const material = object.material;
    expect(Array.isArray(material)).toBe(false);
    if (Array.isArray(material)) return;
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
    const positions = object.geometry.getAttribute('position');
    const seeds = object.geometry.getAttribute('aSeed');
    const layer = (layers[object.name] ??= { draws: 0, points: 0, squareM2: 0, pixels: 0 });
    layer.draws++;
    layer.points += positions.count;
    let uniforms: Record<string, THREE.IUniform> = {};
    if (object.name === 'plume') {
      expect(material).toBeInstanceOf(THREE.PointsMaterial);
      const shader = {
        uniforms,
        vertexShader: THREE.ShaderLib.points.vertexShader,
        fragmentShader: THREE.ShaderLib.points.fragmentShader,
      };
      material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
      // Fail if this fixture stops representing the shipped clear-fluid shader.
      expect(shader.vertexShader).toContain('uBase * aSeed.z + uSpread * t');
      expect(shader.vertexShader).toContain('size * (0.35 + 1.5 * vRise)');
    } else if (material instanceof THREE.ShaderMaterial) {
      expect(object.name).toBe('ventShimmer');
      expect(material.vertexShader).toContain('placePoint(position, uSize)');
      uniforms = material.uniforms;
    } else expect(object.name).toBe('vent-fringe');
    for (let i = 0; i < positions.count; i++) {
      const point = new THREE.Vector3().fromBufferAttribute(positions, i);
      let size = material instanceof THREE.PointsMaterial ? material.size : uniforms.uSize.value;
      if (object.name === 'plume') {
        const phase = seeds.getX(i) + time * uniforms.uSpeed.value * (0.85 + 0.3 * seeds.getW(i));
        const t = phase - Math.floor(phase);
        const angle = seeds.getY(i) * 6.2831853 + t * (1.5 + seeds.getZ(i));
        const radius =
          uniforms.uBase.value * seeds.getZ(i) +
          uniforms.uSpread.value * t * (0.35 + 0.65 * seeds.getW(i));
        const drift = t * t * uniforms.uDrift.value;
        point.set(
          Math.cos(angle) * radius + drift,
          t * uniforms.uHeight.value,
          Math.sin(angle) * radius + drift * 0.3,
        );
        size *= 0.35 + 1.5 * t;
      }
      layer.squareM2 += size * size;
      point.applyMatrix4(object.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
      const depth = -point.z;
      if (depth < camera.near || depth > camera.far) continue;
      // PointsMaterial uses H/2; the preset uses H/(2*tan(FOV/2)).
      const scale =
        material instanceof THREE.ShaderMaterial
          ? height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))
          : height / 2;
      let pixels = (size * scale) / depth;
      if (material instanceof THREE.ShaderMaterial) pixels = THREE.MathUtils.clamp(pixels, 1, 256);
      pixels = Math.max(1, pixels); // Conservative minimum raster footprint.
      point.applyMatrix4(camera.projectionMatrix);
      const x = ((point.x + 1) * width) / 2;
      const y = ((point.y + 1) * height) / 2;
      const x0 = Math.max(0, x - pixels / 2),
        x1 = Math.min(width, x + pixels / 2);
      const y0 = Math.max(0, y - pixels / 2),
        y1 = Math.min(height, y + pixels / 2);
      if (x1 <= x0 || y1 <= y0) continue;
      layer.pixels += (x1 - x0) * (y1 - y0);
      rectangles.push([Math.floor(x0), Math.floor(y0), Math.ceil(x1), Math.ceil(y1)]);
    }
  });
  // Difference grid: outward-rounded squares yield a conservative pixel overlap
  // census without rasterizing a game frame. Alpha/soft edges are not discounted.
  const stride = width + 1;
  const grid = new Int32Array(stride * (height + 1));
  for (const [x0, y0, x1, y1] of rectangles) {
    grid[y0 * stride + x0]++;
    grid[y0 * stride + x1]--;
    grid[y1 * stride + x0]--;
    grid[y1 * stride + x1]++;
  }
  let covered = 0,
    peakOverlap = 0;
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      const at = y * stride + x;
      row += grid[at];
      grid[at] = row + (y ? grid[at - stride] : 0);
      if (grid[at]) covered++;
      peakOverlap = Math.max(peakOverlap, grid[at]);
    }
  }
  const pixels = Object.values(layers).reduce((sum, layer) => sum + layer.pixels, 0);
  return { layers, pixels, screenLayers: pixels / (width * height), covered, peakOverlap };
}

describe('Lost City transparent effect fill budget', () => {
  for (const tier of ['low', 'high'] as const) {
    it(`${tier}: bounds stacked close-approach sprites; preserves Low's existing effects`, async () => {
      const meta = validateMeta(
        JSON.parse(readFileSync('data/tiles/lost-city/meta.json', 'utf8')),
        'lost-city',
      );
      const bytes = readFileSync('data/tiles/lost-city/heightmap.bin');
      const terrain = new Terrain(
        { meta, heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows) },
        DEFAULT_CONFIG.terrain,
        tier,
      );
      let props: Props | undefined;
      const mission = JSON.parse(readFileSync('data/landmarks/lost-city/mission.json', 'utf8'));
      const scene = new THREE.Scene();
      const currents = new Currents('lost-city', 'lost-city', async () => null);
      await currents.ready;
      let presets: PresetSystem | undefined;
      try {
        const camera = new THREE.PerspectiveCamera(
          DEFAULT_CONFIG.camera.fovDeg,
          1280 / 720,
          0.1,
          5000,
        );
        const measurements = [];
        for (const baseline of [true, false]) {
          props = new Props(meta, terrain, DEFAULT_CONFIG.props, tier);
          // Reconstruct the old uncapped High workload as well as its redundant
          // preset layer, so the original fill regression keeps its full baseline.
          const original =
            baseline && tier === 'high'
              ? vi
                  .spyOn(geo, 'geoDetail')
                  .mockReturnValue({ ...geo.geoDetail(tier), carbonatePlumeParticles: 70 })
              : undefined;
          try {
            await props.load('props.json', 'lost-city', async () =>
              JSON.parse(readFileSync('data/landmarks/lost-city/props.json', 'utf8')),
            );
          } finally {
            original?.mockRestore();
          }
          expect(props.stats.failed).toBe(0);
          expect(props.stats.skipped).toBe(0);
          expect(props.placed).toHaveLength(12);
          scene.add(props.group);
          const hero = props.placed.find((p) => p.def.id === 'poseidon-tower')!;
          // The existing golden close/approach direction, aimed at the orifice.
          const target = hero.root.localToWorld(new THREE.Vector3(0, 60, 0));
          presets = new PresetSystem({
            scene,
            bus: new EventBus(),
            config: DEFAULT_CONFIG,
            tier,
            params: new URLSearchParams(),
            tileId: 'lost-city',
            landmarkId: 'lost-city',
            missionId: null,
            terrain,
            props,
            discovery: { loaded: true, pois: [] },
            sub: {
              position: target,
              velocity: new THREE.Vector3(),
              floorFor: (ground) => ground + 12,
            },
            currents,
            currentMode: 'off',
            atmosphere: { ambient: new THREE.AmbientLight(), caustics: null },
            headlights: { on: false },
            toWorld: (lat, lon) => latLonToWorld(meta, lat, lon),
            fetchJson: async (url) =>
              url.endsWith('/mission.json')
                ? {
                    ...mission,
                    environment: {
                      ...mission.environment,
                      overrides: {
                        ...mission.environment.overrides,
                        ...(baseline ? { shimmerStrength: 0.03 } : {}),
                      },
                    },
                  }
                : [],
          });
          await presets.ready;
          const samples = [];
          for (const range of [70, 32, 10]) {
            camera.position
              .copy(target)
              .add(new THREE.Vector3(range / Math.SQRT2, 6, range / Math.SQRT2));
            camera.lookAt(target);
            for (const time of [0, 5, 10]) {
              presets.update(
                1 / 60,
                0,
                sampleAtmosphere(DEFAULT_CONFIG.water, target.y),
                camera,
                720,
                time,
              );
              expect(presets.entered).toBe(true);
              samples.push({ range, time, ...effectFootprints(scene, camera, time) });
            }
          }
          measurements.push(samples);
          presets.dispose();
          presets = undefined;
          props.dispose();
          props = undefined;
        }
        if (diagnostics) {
          mkdirSync('.cache/perf-budget', { recursive: true });
          writeFileSync(
            `.cache/perf-budget/lost-city-fill-${tier}.json`,
            JSON.stringify(measurements, null, 2),
          );
        }
        if (tier === 'low') {
          expect(measurements[1]).toEqual(measurements[0]);
          // Pin triangle-grounded placements as well as paired equality, retaining
          // the previous continuous-field workload as an upper resource bound. The pins follow
          // the trunk surface the sprites are grounded on; draws and points are unchanged.
          for (const [range, expectedPixels, ceiling] of [
            [70, 10_661.430496, 10_670],
            [32, 44_211.162883, 44_320],
            [10, 67_265.486637, 67_300],
          ]) {
            const pixels = Math.max(
              ...measurements[1].filter((s) => s.range === range).map((s) => s.pixels),
            );
            expect(pixels).toBeCloseTo(expectedPixels, 4);
            expect(pixels).toBeLessThanOrEqual(ceiling);
          }
        }
        // Guard the High stutter workload: a redundant field-wide shimmer
        // must not return over the tower's existing clear-fluid plumes.
        for (const sample of measurements[1]) {
          expect(Object.keys(sample.layers).sort()).toEqual(['plume', 'vent-fringe']);
          expect(sample.layers.plume.draws).toBe(14);
          expect(sample.layers.plume.points).toBe(tier === 'low' ? 350 : 686);
          expect(sample.layers['vent-fringe'].draws).toBe(12);
          expect(sample.layers['vent-fringe'].points).toBe(392);
          expect(sample.layers['vent-fringe'].squareM2).toBeCloseTo(250.88, 6);
          expect(sample.pixels).toBeGreaterThan(8_000); // No blank scene can pass.
          if (tier === 'high') {
            expect(sample.pixels).toBeLessThanOrEqual(120_000);
          }
        }
        if (tier === 'high') {
          expect(Math.max(...measurements[0].map((s) => s.pixels))).toBeGreaterThan(200_000);
          for (let i = 0; i < measurements[0].length; i++) {
            expect(measurements[0][i].layers.ventShimmer.points).toBe(36);
            expect(measurements[0][i].layers.ventShimmer.squareM2).toBe(2916);
            expect(measurements[1][i].pixels).toBeLessThan(measurements[0][i].pixels * 0.65);
            expect(measurements[1][i].peakOverlap).toBeLessThan(measurements[0][i].peakOverlap);
            // Isolate the density cap's benefit from the earlier shimmer removal.
            const before = measurements[0][i].layers;
            const uncappedPixels = before.plume.pixels + before['vent-fringe'].pixels;
            expect(measurements[1][i].pixels).toBeLessThan(uncappedPixels * 0.9);
          }
        }
        // Permanent marine snow is separate from site effects; preserve its
        // existing Low count and size ceiling as well as High's bounded pool.
        expect(DEFAULT_CONFIG.water.tiers[tier].snowCount).toBe(tier === 'low' ? 300 : 3000);
        expect(DEFAULT_CONFIG.water.snowMaxSizePx).toBe(3);
      } finally {
        presets?.dispose();
        props?.dispose();
        terrain.dispose();
      }
    });
  }
});

/** Project and clip actual triangles; count all faces before opaque depth rejection. */
function transparentMeshPixels(mesh: THREE.Mesh, camera: THREE.PerspectiveCamera): number {
  const geometry = mesh.geometry;
  const position = geometry.getAttribute('position');
  const index = geometry.index;
  const matrix = new THREE.Matrix4()
    .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    .multiply(mesh.matrixWorld);
  let area = 0;
  for (let i = 0; i < (index?.count ?? position.count); i += 3) {
    let polygon = [0, 1, 2].map((j) => {
      const vertex = new THREE.Vector3().fromBufferAttribute(
        position,
        index ? index.getX(i + j) : i + j,
      );
      return new THREE.Vector4(vertex.x, vertex.y, vertex.z, 1).applyMatrix4(matrix);
    });
    for (const plane of [
      (p: THREE.Vector4) => p.w + p.x,
      (p: THREE.Vector4) => p.w - p.x,
      (p: THREE.Vector4) => p.w + p.y,
      (p: THREE.Vector4) => p.w - p.y,
      (p: THREE.Vector4) => p.w + p.z,
      (p: THREE.Vector4) => p.w - p.z,
    ]) {
      const clipped: THREE.Vector4[] = [];
      for (let j = 0; j < polygon.length; j++) {
        const a = polygon[j],
          b = polygon[(j + 1) % polygon.length];
        const da = plane(a),
          db = plane(b);
        if (da >= 0) clipped.push(a);
        if (da >= 0 !== db >= 0) clipped.push(a.clone().lerp(b, da / (da - db)));
      }
      polygon = clipped;
    }
    if (polygon.length < 3) continue;
    let twiceArea = 0;
    for (let j = 0; j < polygon.length; j++) {
      const a = polygon[j],
        b = polygon[(j + 1) % polygon.length];
      twiceArea += (a.x * b.y - b.x * a.y) / (a.w * b.w);
    }
    area += (Math.abs(twiceArea) * 1280 * 720) / 8;
  }
  return area;
}

// Guard the merged shaft's actual transparent passes, not just its mesh count.
describe('Blue Hole transparent shaft budget', () => {
  for (const tier of ['low', 'medium', 'high'] as const) {
    it(`${tier}: keeps one additive pass with bounded projected fill and normal depth sorting`, async () => {
      const meta = validateMeta(
        JSON.parse(readFileSync('data/tiles/great-blue-hole/meta.json', 'utf8')),
        'great-blue-hole',
      );
      const bytes = readFileSync('data/tiles/great-blue-hole/heightmap.bin');
      const terrain = new Terrain(
        { meta, heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows) },
        DEFAULT_CONFIG.terrain,
        tier,
      );
      const props = new Props(meta, terrain, DEFAULT_CONFIG.props, tier);
      try {
        await props.placeAll(
          JSON.parse(readFileSync('data/landmarks/great-blue-hole/props.json', 'utf8')),
          'great-blue-hole',
        );
        const hero = props.placed.find((p) => p.def.id === 'karst-grotto-east')!;
        const shaft = hero.full.getObjectByName('grotto-light-shaft') as THREE.Mesh;
        const material = shaft.material as THREE.MeshBasicMaterial;
        expect(material.transparent).toBe(true);
        expect(material.blending).toBe(THREE.AdditiveBlending);
        expect(material.side).toBe(THREE.DoubleSide);
        expect(material.forceSinglePass).toBe(true);
        expect(material.depthTest).toBe(true);
        expect(material.depthWrite).toBe(false);
        expect(material.opacity).toBe(1);
        expect(shaft.renderOrder).toBe(0);
        expect(shaft.frustumCulled).toBe(false);
        expect(shaft.geometry.groups).toEqual([]);
        expect(staticCost(shaft)).toEqual({ calls: 1, triangles: 384 });
        const transparent: THREE.Object3D[] = [];
        for (const p of props.placed)
          p.full.traverse((o) => {
            if (o instanceof THREE.Mesh && !Array.isArray(o.material) && o.material.transparent)
              transparent.push(o);
          });
        expect(transparent).toEqual([shaft]);
        expect(
          props.placed
            .find((p) => p.def.id === 'karst-grotto')!
            .full.getObjectByName('grotto-light-shaft'),
        ).toBeUndefined();
        const colors = shaft.geometry.getAttribute('color');
        expect(Math.max(...Array.from(colors.array))).toBeCloseTo(0.03, 7);
        expect(Math.min(...Array.from(colors.array))).toBeGreaterThanOrEqual(0);
        // Three sorts this one object by its bounding-sphere centre; nested faces
        // can overlap freely because additive blending is order-independent.
        shaft.geometry.computeBoundingSphere();
        const center = shaft.geometry.boundingSphere!.center;
        expect(center.length()).toBeGreaterThan(1);
        const camera = new THREE.PerspectiveCamera(
          DEFAULT_CONFIG.camera.fovDeg,
          1280 / 720,
          0.1,
          5000,
        );
        const hull = chooseFreeDiveHull(
          DEFAULT_CONFIG.submarine.hullClasses,
          meta.min_m,
          DEFAULT_CONFIG.submarine.freeDiveHullMarginM,
        )!;
        const pose = composedFreeDiveSpawn(
          'great-blue-hole',
          meta,
          terrain,
          props,
          spawnSettings(DEFAULT_CONFIG),
          hull.hull.ratedDepth,
          DEFAULT_CONFIG.camera,
          'arcade',
        )!;
        const rig = new CameraRig(DEFAULT_CONFIG.camera, 1280 / 720, terrain);
        rig.setChaseRadiusDefault(pose.chaseRadius, pose.chaseOffsetX, pose.chaseOffsetY);
        rig.snap(new THREE.Vector3(pose.x, pose.y, pose.z), pose.yaw, 0);
        const samples = [{ view: 'opening', pixels: transparentMeshPixels(shaft, rig.camera) }];
        const target = hero.root.localToWorld(
          new THREE.Vector3().fromArray(blueHolePoses.east.target),
        );
        const direction = new THREE.Vector3().fromArray(blueHolePoses.east.direction);
        for (const range of [55, 42, 10]) {
          camera.position.copy(target).addScaledVector(direction, range);
          camera.position.y = hero.root.position.y + blueHolePoses.east.above;
          camera.lookAt(target);
          camera.updateMatrixWorld(true);
          samples.push({ view: `${range}m`, pixels: transparentMeshPixels(shaft, camera) });
        }
        for (const sample of samples) {
          expect(sample.pixels).toBeGreaterThanOrEqual(0);
          const ceiling =
            sample.view === '55m' ? 42_000 : sample.view === '42m' ? 70_000 : 1_050_000;
          expect(sample.pixels).toBeLessThan(ceiling);
        }
        expect(samples[0].pixels).toBe(0); // The free-dive opening faces the west gallery.
        expect(samples.filter((s) => s.view !== 'opening').every((s) => s.pixels > 100)).toBe(true);
        if (diagnostics) {
          mkdirSync('.cache/perf-budget', { recursive: true });
          writeFileSync(
            `.cache/perf-budget/blue-hole-shaft-${tier}.json`,
            JSON.stringify(
              { cost: staticCost(shaft), sphereCenter: center.toArray(), samples },
              null,
              2,
            ),
          );
        }
      } finally {
        props.dispose();
        terrain.dispose();
      }
    });
  }
});
