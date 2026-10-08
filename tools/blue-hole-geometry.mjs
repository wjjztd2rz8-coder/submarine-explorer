/** CPU audit of every Blue Hole golden camera, not a WebGL capture.
 * Prepare main sources with git show as documented in F-BLUEHOLE-910.md.
 */
import { createServer } from 'vite';
import { format } from 'prettier';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, basename } from 'node:path';

const json = (p) => JSON.parse(readFileSync(p, 'utf8'));
async function audit(
  tier,
  {
    makeConfig,
    Terrain,
    Props,
    CameraRig,
    composedFreeDiveSpawn,
    chooseFreeDiveHull,
    spawnSettings,
    parsePois,
    placePois,
  },
) {
  const config = makeConfig(),
    site = 'great-blue-hole';
  const meta = json('data/tiles/' + site + '/meta.json');
  const bytes = readFileSync('data/tiles/' + site + '/heightmap.bin');
  const terrain = new Terrain(
    { meta, heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows) },
    config.terrain,
    tier,
  );
  const props = new Props(meta, terrain, config.props, tier);
  await props.load('props.json', site, async () => json('data/landmarks/' + site + '/props.json'));
  const hull = chooseFreeDiveHull(
    config.submarine.hullClasses,
    meta.min_m,
    config.submarine.freeDiveHullMarginM,
  );
  const spawn = composedFreeDiveSpawn(
    site,
    meta,
    terrain,
    props,
    spawnSettings(config),
    hull.hull.ratedDepth,
    config.camera,
    'arcade',
  );
  const pois = placePois(
    parsePois(json('data/landmarks/' + site + '/pois.json')),
    meta,
    terrain,
    config.scan,
    site,
  );
  const scan = pois.find((p) => p.id === 'great-blue-hole-stalactites');
  const meshes = [];
  terrain.group.traverse((o) => {
    if (o.isMesh) meshes.push(o);
  });
  terrain.group.updateMatrixWorld(true);
  const results = [];
  for (const aspect of [16 / 9, 390 / 844])
    for (const [id, shot] of [
      ['karst-grotto', 1],
      ['karst-grotto', 2],
      ['karst-grotto', 3],
      ['karst-grotto-east', 2],
      ['karst-grotto-east', 3],
    ]) {
      const hero = props.placed.find((p) => p.def.id === id);
      hero.root.updateMatrixWorld(true);
      const rig = new CameraRig(config.camera, aspect, terrain);
      let sub,
        yaw,
        pitch = 0;
      if (shot === 1) {
        sub = new THREE.Vector3(spawn.x, spawn.y, spawn.z);
        yaw = spawn.yaw;
        rig.setChaseRadiusDefault(spawn.chaseRadius, spawn.chaseOffsetX, spawn.chaseOffsetY);
        rig.snap(sub, yaw, 0);
      } else {
        const east = id.endsWith('east'),
          pose = east
            ? json('tools/blue-hole-poses.json').east
            : { direction: [1, 0, 0], above: 5, close: { range: 36, above: 9, lateral: 10 } };
        const mid = hero.root.localToWorld(
          pose.target
            ? new THREE.Vector3().fromArray(pose.target)
            : hero.localBounds.getCenter(new THREE.Vector3()),
        );
        const c = shot === 3 ? pose.close : null,
          range = c?.range ?? pose.approachRange ?? 40,
          side = c?.lateral ?? 0,
          [dx, , dz] = pose.direction;
        sub = new THREE.Vector3(
          mid.x + dx * range - dz * side,
          hero.root.position.y + (c?.above ?? pose.above),
          mid.z + dz * range + dx * side,
        );
        yaw = Math.atan2(mid.x - sub.x, -(mid.z - sub.z));
        pitch = THREE.MathUtils.clamp(
          Math.atan2(mid.y - sub.y, range),
          -config.submarine.maxPitch,
          config.submarine.maxPitch,
        );
        rig.setMode('first-person');
        rig.snap(sub, yaw, pitch);
        const eye = rig.camera.position;
        rig.lookElevation =
          (Math.atan2(mid.y - eye.y, Math.hypot(mid.x - eye.x, mid.z - eye.z)) - pitch) / 0.55;
        rig.snap(sub, yaw, pitch);
      }
      rig.camera.updateMatrixWorld(true);
      terrain.update(rig.camera);
      const gallery = hero.root.getObjectByName('stalactite-gallery'),
        attr = gallery.geometry.getAttribute('position');
      const screen = new THREE.Box2(),
        ray = new THREE.Raycaster(),
        p = new THREE.Vector3(),
        ndc = new THREE.Vector3();
      let onScreen = 0,
        checked = 0,
        unblocked = 0;
      for (let i = 0; i < attr.count; i++) {
        p.fromBufferAttribute(attr, i).applyMatrix4(gallery.matrixWorld);
        ndc.copy(p).project(rig.camera);
        if (Math.abs(ndc.x) < 1 && Math.abs(ndc.y) < 1 && ndc.z > -1 && ndc.z < 1) {
          onScreen++;
          screen.expandByPoint(new THREE.Vector2(ndc.x, ndc.y));
          if (i % Math.max(1, Math.floor(attr.count / 64)) === 0) {
            checked++;
            const delta = p.clone().sub(rig.camera.position);
            ray.set(rig.camera.position, delta.clone().normalize());
            ray.far = delta.length() - 0.1;
            if (!ray.intersectObjects(meshes, false).length) unblocked++;
          }
        }
      }
      results.push({
        id,
        shot,
        layout: aspect > 1 ? 'desktop' : 'portrait',
        camera: rig.camera.position.toArray(),
        sub: sub.toArray(),
        galleryVertices: attr.count,
        projectedSize: screen.getSize(new THREE.Vector2()).toArray(),
        onScreenFraction: onScreen / attr.count,
        terrainVisibleSamples: unblocked,
        terrainCheckedSamples: checked,
        terrainDraws: terrain.stats.visibleChunks,
        terrainTriangles: terrain.stats.drawnTriangles,
      });
    }
  const stats = { ...terrain.stats };
  terrain.dispose();
  return {
    tier,
    openingDistance: new THREE.Vector3(spawn.x, spawn.y, spawn.z).distanceTo(scan.position),
    stats,
    poses: results,
  };
}

await mkdir('.cache/blue-hole-910', { recursive: true });
const overrides = [
  'src/core/config/terrain.ts',
  'src/world/terrainFeatures.ts',
  'src/world/props/geo/stalactites.ts',
];
const baseline = new Map(
  await Promise.all(
    overrides.map(async (p) => [
      resolve(p),
      await readFile('.cache/blue-hole-910/main-' + basename(p), 'utf8'),
    ]),
  ),
);
const output = {
  note: 'CPU geometry/projection/terrain-ray audit, not renderer.info or pixel QA',
  before: [],
  after: [],
};
for (const version of ['before', 'after']) {
  const server = await createServer({
    configFile: false,
    cacheDir: '.cache/blue-hole-910/vite-' + version,
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, ws: false },
    appType: 'custom',
    plugins:
      version === 'before'
        ? [
            {
              name: 'main-blue-hole',
              enforce: 'pre',
              load(id) {
                return baseline.get(id) ?? null;
              },
            },
          ]
        : [],
  });
  try {
    const modules = Object.assign(
      {},
      ...(await Promise.all(
        [
          '/src/core/Config.ts',
          '/src/world/Terrain.ts',
          '/src/world/Props.ts',
          '/src/sub/CameraRig.ts',
          '/src/game/Spawn.ts',
          '/src/game/Pois.ts',
        ].map((p) => server.ssrLoadModule(p)),
      )),
    );
    for (const tier of (process.env.BLUEHOLE_TIERS ?? 'low,medium,high,ultra').split(',')) {
      const result = await audit(tier, modules);
      output[version].push(result);
      console.log(version, tier, result.openingDistance.toFixed(2), result.stats.vertices);
    }
  } finally {
    await server.close();
  }
}
await writeFile(
  process.argv[2] ?? 'plan/progress/F-BLUEHOLE-910/geometry.json',
  await format(JSON.stringify(output), {
    ...JSON.parse(readFileSync('.prettierrc.json', 'utf8')),
    parser: 'json',
  }),
);
