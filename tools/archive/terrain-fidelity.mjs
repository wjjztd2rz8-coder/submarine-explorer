/** Headless geometry census; no WebGL/effects. Run before and after with a distinct output path. */
import { createServer } from 'vite';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import * as THREE from 'three';

const output = resolve(process.argv[2] ?? '.cache/fidelity-810/geometry.json');
const tiers = (process.env.FIDELITY_TIERS ?? 'low,medium,high,ultra').split(',');
const server = await createServer({
  configFile: false,
  cacheDir: '.cache/fidelity-810/vite',
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, watch: null, ws: false },
  appType: 'custom',
});
try {
  const { makeConfig } = await server.ssrLoadModule('/src/core/Config.ts');
  const { Terrain } = await server.ssrLoadModule('/src/world/Terrain.ts');
  const { Props } = await server.ssrLoadModule('/src/world/Props.ts');
  const { CameraRig } = await server.ssrLoadModule('/src/sub/CameraRig.ts');
  const { composedFreeDiveSpawn, spawnSettings } = await server.ssrLoadModule('/src/game/Spawn.ts');
  const meta = JSON.parse(await readFile('data/tiles/monterey-canyon/meta.json', 'utf8'));
  const bytes = await readFile('data/tiles/monterey-canyon/heightmap.bin');
  const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
  const doc = JSON.parse(await readFile('data/landmarks/monterey-canyon/props.json', 'utf8'));
  const fixed = JSON.parse(await readFile('tools/monterey-poses.json', 'utf8')).wall;
  const results = [];
  for (const tier of tiers) {
    const config = makeConfig();
    const terrain = new Terrain({ meta, heights }, config.terrain, tier);
    const props = new Props(meta, terrain, config.props, tier);
    await props.load('props.json', meta.id, async () => doc);
    const pose = composedFreeDiveSpawn(
      meta.id,
      meta,
      terrain,
      props,
      spawnSettings(config),
      -6000,
      config.camera,
    );
    if (!pose || props.stats.failed) throw new Error('Incomplete scene');
    const views = [];
    const plannedShots = [];
    const scarpViews = [];
    for (const [width, height] of [
      [1600, 900],
      [390, 844],
    ]) {
      const rig = new CameraRig(config.camera, width / height, terrain);
      rig.setChaseRadiusDefault(pose.chaseRadius, pose.chaseOffsetX, pose.chaseOffsetY);
      rig.snap(new THREE.Vector3(pose.x, pose.y, pose.z), pose.yaw, 0);
      terrain.update(rig.camera);
      props.update(rig.camera);
      const frustum = new THREE.Frustum().setFromProjectionMatrix(
        new THREE.Matrix4().multiplyMatrices(
          rig.camera.projectionMatrix,
          rig.camera.matrixWorldInverse,
        ),
      );
      let propDraws = 0;
      let propTriangles = 0;
      props.group.updateMatrixWorld(true);
      props.group.traverseVisible((mesh) => {
        if (!mesh.isMesh || (mesh.frustumCulled && !frustum.intersectsObject(mesh))) return;
        const g = mesh.geometry;
        const triangles = (g.index?.count ?? g.attributes.position.count) / 3;
        propDraws++;
        propTriangles += triangles * (mesh.isInstancedMesh ? mesh.count : 1);
      });
      views.push({
        viewport: [width, height],
        terrainDraws: terrain.stats.visibleChunks,
        terrainTriangles: terrain.stats.drawnTriangles,
        lodCounts: [...terrain.stats.lodCounts],
        propDraws,
        propTriangles,
      });
      if (tier === 'high') {
        const hero = props.placed.find((p) => p.def.id === 'canyon-wall-ledge');
        const target = hero.root.localToWorld(new THREE.Vector3(...fixed.target));
        for (const [shot, range, side] of [
          [2, fixed.approachRange, 0],
          [3, fixed.close.range, fixed.close.lateral],
        ]) {
          const direction = fixed.direction;
          const position = new THREE.Vector3(
            target.x + direction[0] * range - direction[2] * side,
            hero.root.position.y + fixed.above,
            target.z + direction[2] * range + direction[0] * side,
          );
          const yaw = Math.atan2(target.x - position.x, -(target.z - position.z));
          const pitch = THREE.MathUtils.clamp(
            Math.atan2(target.y - position.y, range),
            -config.submarine.maxPitch,
            config.submarine.maxPitch,
          );
          rig.resetView();
          rig.setMode('first-person');
          rig.snap(position, yaw, pitch);
          const eye = rig.camera.position;
          rig.lookElevation =
            (Math.atan2(target.y - eye.y, Math.hypot(target.x - eye.x, target.z - eye.z)) - pitch) /
            0.55;
          rig.snap(position, yaw, pitch);
          const collides = props.collide(
            position.clone(),
            config.submarine.hullRadius,
            new THREE.Vector3(),
          );
          if (
            collides ||
            position.y <= terrain.sampleHeight(position.x, position.z) + config.submarine.hullRadius
          )
            throw new Error(`Unsafe planned golden shot ${shot}`);
          plannedShots.push({
            viewport: [width, height],
            shot,
            position: position.toArray(),
            yaw,
            pitch,
            camera: rig.camera.position.toArray(),
            lookElevation: rig.lookElevation,
          });
        }
      }
    }
    if (tier === 'medium') {
      const hero = props.placed.find((p) => p.def.id === 'canyon-wall-ledge');
      const b = hero.localBounds;
      const cx = (b.min.x + b.max.x) / 2;
      const w = b.max.x - b.min.x;
      for (const v of [
        { name: 'wide', range: 10, radius: 70, elevation: 0.25, azimuth: 0.2, side: 0.1 },
        { name: 'toe', range: 4, radius: 22, elevation: 0.12, azimuth: 0.55, side: 0.12 },
        { name: 'oblique', range: 8, radius: 48, elevation: 0.2, azimuth: 1.05, side: 0.2 },
        { name: 'high', range: 6, radius: 75, elevation: 0.6, azimuth: -0.4, side: -0.15 },
        { name: 'cockpit', range: 16, side: 0 },
      ]) {
        const rig = new CameraRig(config.camera, 1280 / 720, terrain);
        const position = hero.root.localToWorld(
          new THREE.Vector3(cx + v.side * w, 0, b.min.z - v.range),
        );
        const aim = hero.root.localToWorld(new THREE.Vector3(cx, 0, 0));
        position.y = Math.min(
          -2,
          terrain.sampleHeight(position.x, position.z) + (v.name === 'cockpit' ? 10 : 8),
        );
        const yaw = Math.atan2(aim.x - position.x, -(aim.z - position.z));
        rig.setMode(v.name === 'cockpit' ? 'first-person' : 'orbit');
        if (v.name !== 'cockpit') {
          rig.orbitRadius = v.radius;
          rig.orbitElevation = v.elevation;
          rig.orbitAzimuth = Math.atan2(-Math.sin(yaw), Math.cos(yaw)) + v.azimuth;
        }
        rig.snap(position, yaw, v.name === 'cockpit' ? -0.1 : 0);
        terrain.update(rig.camera);
        props.update(rig.camera);
        const frustum = new THREE.Frustum().setFromProjectionMatrix(
          new THREE.Matrix4().multiplyMatrices(
            rig.camera.projectionMatrix,
            rig.camera.matrixWorldInverse,
          ),
        );
        const parts = [];
        for (const prop of props.placed) {
          let triangles = 0;
          let draws = 0;
          prop.root.traverseVisible((mesh) => {
            if (!mesh.isMesh || (mesh.frustumCulled && !frustum.intersectsObject(mesh))) return;
            triangles +=
              ((mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3) *
              (mesh.isInstancedMesh ? mesh.count : 1);
            draws++;
          });
          parts.push({ id: prop.def.id, triangles, draws });
        }
        scarpViews.push({
          name: v.name,
          camera: rig.camera.position.toArray(),
          terrainTriangles: terrain.stats.drawnTriangles,
          terrainDraws: terrain.stats.visibleChunks,
          lodCounts: [...terrain.stats.lodCounts],
          parts,
          triangles: terrain.stats.drawnTriangles + parts.reduce((sum, p) => sum + p.triangles, 0),
        });
      }
    }
    results.push({
      tier,
      resident: { ...terrain.stats },
      pose,
      views,
      ...(plannedShots.length ? { plannedShots } : {}),
      ...(scarpViews.length ? { scarpViews } : {}),
    });
    console.log(tier, JSON.stringify(results.at(-1)));
    terrain.dispose();
  }
  await mkdir(dirname(output), { recursive: true });
  await writeFile(
    output,
    JSON.stringify(
      {
        note: 'CPU frustum census of terrain and props only. Not renderer.info; excludes sub, life, particles, post and GPU timings.',
        results,
      },
      null,
      2,
    ),
  );
} finally {
  await server.close();
}
