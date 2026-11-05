/** CPU companion to golden-shots: search poses, never edit site data or render materials.
 * node tools/blue-hole-pose-search.mjs [--verify | --scale-table] [output.json]
 * BLUEHOLE_OFFSETS=-40,-20,0,20,40 controls the scale-table mount offsets in metres.
 * BLUEHOLE_TIERS=low,medium,high (default all); two deterministic search rounds on the first tier (Low by default).
 */
import { createServer } from 'vite';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import * as T from 'three';
import { projectCoverage, coverageFractions } from './lib/pose-projection.mjs';
import { diagnosticTiers } from './diagnostic-tiers.mjs';

const json = (p) => JSON.parse(readFileSync(p, 'utf8'));
const authored = json('tools/blue-hole-poses.json');
const fixed = authored.east;
const args = process.argv.slice(2);
const verify = args.includes('--verify');
const scaleTable = args.includes('--scale-table');
if (args.some((arg) => arg.startsWith('--') && !['--verify', '--scale-table'].includes(arg)))
  throw new Error('Unknown option');
if (verify && scaleTable) throw new Error('Choose --verify or --scale-table');
const site = 'great-blue-hole';
const layouts = [
  [1600, 900],
  [390, 844],
];
const server = await createServer({
  configFile: false,
  cacheDir: '.cache/hood-poses/vite',
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, watch: null, ws: false },
  appType: 'custom',
});
try {
  const m = Object.assign(
    {},
    ...(await Promise.all(
      [
        '/src/core/Config.ts',
        '/src/world/Terrain.ts',
        '/src/world/Props.ts',
        '/src/world/props/Collision.ts',
        '/src/sub/CameraRig.ts',
        '/src/game/Spawn.ts',
        '/src/game/DeepOpeningSpawn.ts',
        '/src/game/Pois.ts',
        '/src/sub/SubMesh.ts',
        '/tests/unit/helpers/hullClearance.ts',
        '/tests/unit/helpers/subjectVisibility.ts',
      ].map((p) => server.ssrLoadModule(p)),
    )),
  );
  const c = m.makeConfig(),
    settings = m.spawnSettings(c);
  const meta = json(`data/tiles/${site}/meta.json`);
  const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
  const data = {
    meta,
    heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows),
  };
  const output = {
    method:
      'CPU geometry only; fractions use pixel centres and solid depth occlusion, not lighting/HUD. Clearance is the minimum sampled hull-to-terrain gap and enclosing-hull-sphere-to-prop gap. No runtime tuning changed.',
    search: {},
    tiers: [],
  };
  let candidates = verify || scaleTable ? authored.hoodCandidates : undefined;
  for (const tier of diagnosticTiers(process.env.BLUEHOLE_TIERS)) {
    const terrain = new m.Terrain(data, c.terrain, tier);
    const props = new m.Props(meta, terrain, c.props, tier);
    const hull = new m.SubMesh({ length: 26, hullClass: 'B', tier });
    hull.setView('chase');
    const visibleHullBox = () => {
      const box = new T.Box3();
      m.visitHullVertices(hull.vehicle.root, (p) => box.expandByPoint(p));
      return box;
    };
    const hullBox = visibleHullBox();
    const hullCorners = [];
    for (const x of [hullBox.min.x, hullBox.max.x])
      for (const y of [hullBox.min.y, hullBox.max.y])
        for (const z of [hullBox.min.z, hullBox.max.z]) hullCorners.push(new T.Vector3(x, y, z));
    try {
      await props.placeAll(json(`data/landmarks/${site}/props.json`), site);
      const hero = props.placed.find((p) => p.def.id === 'karst-grotto-east');
      hero.root.updateMatrixWorld(true);
      const target = hero.root.localToWorld(new T.Vector3().fromArray(fixed.target));
      const pois = m.placePois(
        m.parsePois(json(`data/landmarks/${site}/pois.json`)),
        meta,
        terrain,
        c.scan,
        site,
      );
      const primary = pois.find((p) => p.id === 'great-blue-hole-stalactites');
      const east = pois.find((p) => p.id === 'great-blue-hole-stalactites-east');
      let hood = ['grotto-overhang', 'stalactite-gallery'].map((name) =>
        hero.root.getObjectByName(name),
      );
      const sampled = hood.flatMap((mesh) => {
        const a = mesh.geometry.getAttribute('position');
        return Array.from({ length: Math.ceil(a.count / 64) }, (_, i) =>
          new T.Vector3().fromBufferAttribute(a, i * 64).applyMatrix4(mesh.matrixWorld),
        );
      });
      const out = new T.Vector3(),
        point = new T.Vector3();
      const rigs = layouts.map(([w, h]) => new m.CameraRig(c.camera, w / h, terrain));
      function pose(tuning) {
        const { bearing, range, altitude } = tuning;
        const a = (bearing * Math.PI) / 180;
        const p = target.clone().add(new T.Vector3(Math.sin(a) * range, 0, -Math.cos(a) * range));
        p.y = hero.root.position.y + altitude;
        return { p, yaw: Math.atan2(target.x - p.x, -(target.z - p.z)) };
      }
      function rigFor(tuning, index) {
        const { p, yaw } = pose(tuning),
          rig = rigs[index];
        rig.setChaseRadiusDefault(tuning.radius, tuning.offsetX, tuning.offsetY);
        rig.snap(p, yaw, 0);
        rig.camera.updateMatrixWorld(true);
        return rig;
      }
      function sphereGap(centre, radius) {
        // Props.collide includes compound hood boxes AND the rendered apron surfaces.
        if (props.collide(centre.clone(), radius, out)) return -1;
        let lo = 0,
          hi = 128;
        for (let i = 0; i < 14; i++) {
          const mid = (lo + hi) / 2;
          if (props.collide(centre.clone(), radius + mid, out)) hi = mid;
          else lo = mid;
        }
        return lo;
      }
      function clearance(tuning) {
        const { p, yaw } = pose(tuning);
        if (
          p.y > -settings.hullRadius ||
          p.y - terrain.sampleHeight(p.x, p.z) < settings.hullRadius + settings.seabedClearance ||
          props.collide(p.clone(), settings.hullRadius + 4, out)
        )
          return null;
        hull.setPose(p, yaw, 0, 0);
        hull.group.updateMatrixWorld(true);
        const sphere = visibleHullBox().getBoundingSphere(new T.Sphere());
        const propGap = sphereGap(sphere.center, sphere.radius);
        if (propGap <= 0) return null;
        const terrainGap = m.hullClearance(hull.vehicle.root, terrain);
        if (terrainGap <= 0) return null;
        return { terrainM: terrainGap, propsM: propGap, minimumM: Math.min(terrainGap, propGap) };
      }
      function coarse(tuning) {
        const { p, yaw } = pose(tuning);
        const rotation = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), -yaw);
        const screens = [];
        for (let index = 0; index < layouts.length; index++) {
          const rig = rigFor(tuning, index);
          for (const corner of hullCorners) {
            point.copy(corner).applyQuaternion(rotation).add(p).project(rig.camera);
            if (Math.abs(point.x) > 0.98 || Math.abs(point.y) > 0.98 || Math.abs(point.z) > 1)
              return null;
          }
          for (let j = 0; j <= 24; j++) {
            point.copy(p).lerp(rig.camera.position, j / 24);
            if (props.collide(point.clone(), 6, out)) return null;
          }
          let count = 0,
            top = 0,
            minX = 1,
            maxX = -1,
            minY = 1,
            maxY = -1;
          for (const v of sampled) {
            point.copy(v).project(rig.camera);
            if (Math.abs(point.x) > 1 || Math.abs(point.y) > 1 || Math.abs(point.z) > 1) continue;
            count++;
            if (point.y >= 1 / 3) top++;
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
          }
          if (!top) return null;
          screens.push(((top / count) * (maxX - minX) * (maxY - minY)) / 4);
        }
        return { ...tuning, score: Math.min(...screens) };
      }
      if (!candidates) {
        const seed = (Math.atan2(fixed.direction[0], -fixed.direction[2]) * 180) / Math.PI;
        const rows = [];
        let tested = 0,
          hullSafe = 0;
        for (let turn = 0; turn < 360; turn += 15)
          for (const range of [25, 35, 45, fixed.approachRange, 70, 90, 110])
            for (const altitude of [-60, -50, -40, -30, -20, -10, 0, 10]) {
              const p = { bearing: (seed + turn + 360) % 360, range, altitude };
              tested++;
              if (!clearance(p)) continue;
              hullSafe++;
              for (const radius of [35, 46, 60, 80])
                for (const offsetY of [-140, -110, -90, -70, -50])
                  for (const offsetX of [-35, 0, 35]) {
                    const row = coarse({ ...p, radius, offsetY, offsetX });
                    if (row) rows.push(row);
                  }
            }
        rows.sort((a, b) => b.score - a.score);
        // Refine around the best distinct sub positions, rather than camera variants of one pose.
        const seeds = [];
        for (const row of rows)
          if (
            !seeds.some(
              (p) =>
                p.bearing === row.bearing && p.range === row.range && p.altitude === row.altitude,
            )
          ) {
            seeds.push(row);
            if (seeds.length === 3) break;
          }
        for (const seed of seeds)
          for (const db of [-7.5, 0, 7.5])
            for (const dr of [-5, 0, 5])
              for (const da of [-5, 0, 5]) {
                const p = {
                  bearing: seed.bearing + db,
                  range: seed.range + dr,
                  altitude: seed.altitude + da,
                };
                tested++;
                if (!clearance(p)) continue;
                hullSafe++;
                for (const radius of [35, 46, 60, 80])
                  for (const offsetY of [-140, -110, -90, -70, -50])
                    for (const offsetX of [-35, 0, 35]) {
                      const row = coarse({ ...p, radius, offsetY, offsetX });
                      if (row) rows.push(row);
                    }
              }
        rows.sort((a, b) => b.score - a.score);
        candidates = [];
        for (const row of rows)
          if (
            !candidates.some(
              (p) =>
                p.bearing === row.bearing && p.range === row.range && p.altitude === row.altitude,
            )
          ) {
            candidates.push(row);
            if (candidates.length === 12) break;
          }
        output.search = {
          rounds: 2,
          subPosesTested: tested,
          hullSafePoses: hullSafe,
          refinementSeeds: seeds,
          candidates,
        };
        console.log(
          'Search:',
          tested,
          'sub poses;',
          hullSafe,
          'with full hull clearance;',
          candidates.length,
          'finalists',
        );
      }
      function routeClear(p, contact) {
        const range = p.distanceTo(contact.position);
        for (let d = 8; d < range - m.missionApproachScanRadius(site, Infinity); d += 8) {
          const q = p.clone().lerp(contact.position.clone().setY(p.y), d / range);
          if (
            q.y - terrain.sampleHeight(q.x, q.z) < settings.hullRadius + settings.seabedClearance ||
            props.collide(q, settings.hullRadius + 4, out)
          )
            return false;
        }
        return true;
      }
      function measure(tuning, name, explicitPose) {
        const { p, yaw } = explicitPose ?? pose(tuning);
        hull.setPose(p, yaw, 0, 0);
        hull.group.updateMatrixWorld(true);
        const hullVertices = [];
        m.visitHullVertices(hull.vehicle.root, (v) => hullVertices.push(v.clone()));
        const sphere = visibleHullBox().getBoundingSphere(new T.Sphere());
        const terrainM = m.hullClearance(hull.vehicle.root, terrain),
          propsM = sphereGap(sphere.center, sphere.radius);
        const entry = {
          name,
          tuning,
          sub: p.toArray(),
          yaw,
          clearance: { terrainM, propsM, minimumM: Math.min(terrainM, propsM) },
          distanceToWestM: p.distanceTo(primary.position),
          distanceToEastM: p.distanceTo(east.position),
          routeToWestClear: routeClear(p, primary),
          routeToEastClear: routeClear(p, east),
          layouts: [],
        };
        for (let index = 0; index < layouts.length; index++) {
          const [width, height] = layouts[index],
            rig = rigs[index];
          rig.setChaseRadiusDefault(tuning.radius, tuning.offsetX, tuning.offsetY);
          rig.snap(p, yaw, 0);
          rig.camera.updateMatrixWorld(true);
          terrain.update(rig.camera);
          const occluders = [
            ...m.solidMeshes(terrain.group),
            ...props.placed.flatMap((p) => m.solidMeshes(p.full)),
            ...m.solidMeshes(hull.vehicle.root),
          ].filter((mesh) => !hood.includes(mesh));
          const hoodEntries = hood.map((mesh) => ({ mesh, label: 1 }));
          // Audit at the requested resolution, not a projected vertex count or a rectangle.
          const projected = projectCoverage(rig.camera, width, height, hoodEntries);
          const visible = projectCoverage(rig.camera, width, height, [
            ...occluders.map((mesh) => ({ mesh, label: 2 })),
            ...hoodEntries,
          ]);
          let hullOnscreen = true,
            armClear = true,
            armTerrainM = Infinity;
          const hullBounds = [1, 1, -1, -1];
          for (const v of hullVertices) {
            point.copy(v).project(rig.camera);
            if (Math.abs(point.x) > 1 || Math.abs(point.y) > 1 || Math.abs(point.z) > 1)
              hullOnscreen = false;
            hullBounds[0] = Math.min(hullBounds[0], point.x);
            hullBounds[1] = Math.min(hullBounds[1], point.y);
            hullBounds[2] = Math.max(hullBounds[2], point.x);
            hullBounds[3] = Math.max(hullBounds[3], point.y);
          }
          for (let j = 0; j <= 128; j++) {
            point.copy(p).lerp(rig.camera.position, j / 128);
            armTerrainM = Math.min(armTerrainM, point.y - terrain.sampleHeight(point.x, point.z));
            if (props.collide(point.clone(), 6, out)) armClear = false;
          }
          entry.layouts.push({
            width,
            height,
            camera: rig.camera.position.toArray(),
            fov: rig.camera.fov,
            hullOnscreen,
            hullBounds,
            armClear,
            armTerrainM,
            projected: coverageFractions(projected.labels, width, height),
            visible: coverageFractions(visible.labels, width, height),
          });
        }
        return entry;
      }
      if (scaleTable) {
        // Keep the original sub, heading and camera fixed when the prop moves/scales.
        const poses = candidates.map((tuning) => ({ tuning, original: pose(tuning) }));
        const baseScale = [...hero.def.scale],
          baseOffset = hero.def.yOffsetM;
        const offsets = (process.env.BLUEHOLE_OFFSETS ?? '-40,-20,0,20,40').split(',').map(Number);
        if (offsets.some((v) => !Number.isFinite(v))) throw new Error('Invalid offsets');
        const rows = [];
        const hitEast = (p, r) => m.collideAll(hero.colliders, p.clone(), r, 0, out);
        const pathAudit = (p, contact) => {
          const range = p.distanceTo(contact.position);
          let firstTerrainM = null,
            firstPropsM = null,
            firstEastM = null;
          // Same fixed-depth route, 8 m steps, 12 m keepout and scan-cap endpoint
          // as the previous pose audit; preserve that comparison exactly.
          for (let d = 8; d < range - m.missionApproachScanRadius(site, Infinity); d += 8) {
            const q = p.clone().lerp(contact.position.clone().setY(p.y), d / range);
            if (
              firstTerrainM === null &&
              q.y - terrain.sampleHeight(q.x, q.z) < settings.hullRadius + settings.seabedClearance
            )
              firstTerrainM = d;
            if (firstPropsM === null && props.collide(q.clone(), settings.hullRadius + 4, out))
              firstPropsM = d;
            if (firstEastM === null && hitEast(q, settings.hullRadius + 4)) firstEastM = d;
          }
          return { firstTerrainM, firstPropsM, firstEastM };
        };
        output.scaleAudit = {
          scales: [1, 1.5, 2, 3],
          offsetsM: offsets,
          transform:
            'Whole existing east prop via def.scale and def.yOffsetM, Props.replace; poses/cameras and both POIs remain fixed at baseline world positions.',
          route:
            'Prior fixed-depth 8 m sampled route, radius hullRadius+4, ending at mission scan cap; not a piloted 3D path.',
          scan: 'East-prop collider overlap with fixed authored 36 m and Arcade-resolved 100 m scan spheres at both gallery contacts; overlap does not imply entire scan region blocked.',
        };
        for (const scale of [1, 1.5, 2, 3]) {
          for (const offsetM of scale === 1 ? [0] : offsets) {
            hero.def.scale = baseScale.map((s) => s * scale);
            hero.def.yOffsetM = baseOffset + offsetM;
            // Rebuild terrain-following geometry, just as a real existing-field edit would.
            await props.replace(hero);
            hood = ['grotto-overhang', 'stalactite-gallery'].map((name) =>
              hero.root.getObjectByName(name),
            );
            const scan = [primary, east].map((contact) => ({
              id: contact.id,
              position: contact.position.toArray(),
              authoredRadiusM: contact.radius,
              authoredSphereOverlap: hitEast(contact.position, contact.radius),
              arcadeSphereOverlap: hitEast(contact.position, Math.max(contact.radius, 100)),
              centreBlocked: hitEast(contact.position, 0.001),
            }));
            for (const { tuning, original } of poses) {
              const entry = measure(tuning, tuning.id, original);
              entry.scale = scale;
              entry.offsetM = offsetM;
              entry.heroPosition = hero.root.position.toArray();
              const bounds = new T.Box3().setFromObject(hero.full);
              entry.heroBounds = { min: bounds.min.toArray(), max: bounds.max.toArray() };
              entry.paths = [primary, east].map((contact) => ({
                id: contact.id,
                ...pathAudit(original.p, contact),
              }));
              entry.scan = scan;
              rows.push(entry);
              console.log(
                tier,
                tuning.id,
                scale,
                offsetM,
                entry.layouts
                  .map((l) => (100 * l.visible.topThirdScreenFraction).toFixed(3))
                  .join('/'),
                entry.clearance.minimumM.toFixed(3),
              );
            }
          }
        }
        output.tiers.push({ tier, candidates: rows });
        continue;
      }
      const entries = candidates.map((p, i) => measure(p, p.id ?? `candidate-${i + 1}`));
      if (
        verify &&
        entries.some(
          (p) =>
            p.clearance.minimumM <= 0 ||
            p.layouts.some(
              (l) => !l.hullOnscreen || !l.armClear || l.visible.topThirdScreenFraction <= 0,
            ),
        )
      )
        throw new Error(`${tier}: saved candidate lost hull clearance or top-third hood coverage`);
      entries.sort(
        (a, b) =>
          Math.min(...b.layouts.map((l) => l.visible.topThirdScreenFraction)) -
          Math.min(...a.layouts.map((l) => l.visible.topThirdScreenFraction)),
      );
      const primaries = [primary, east];
      const free = m.composedFreeDiveSpawn(
        site,
        meta,
        terrain,
        props,
        settings,
        -6500,
        c.camera,
        'arcade',
      );
      const mission = m.composedMissionSpawn(
        site,
        primaries,
        meta,
        terrain,
        props,
        settings,
        -6500,
        c.camera,
      );
      const baselines = [
        ['free-dive', free],
        ['mission', mission],
      ].map(([name, p]) =>
        measure({ radius: p.chaseRadius, offsetX: p.chaseOffsetX, offsetY: p.chaseOffsetY }, name, {
          p: new T.Vector3(p.x, p.y, p.z),
          yaw: p.yaw,
        }),
      );
      output.tiers.push({
        tier,
        heroPosition: hero.root.position.toArray(),
        baselines,
        candidates: entries,
      });
      console.log(
        tier,
        JSON.stringify(
          entries.slice(0, 3).map((p) => ({
            name: p.name,
            clearance: p.clearance.minimumM,
            area: p.layouts.map((l) => l.visible.screenFraction),
            top: p.layouts.map((l) => l.visible.topThirdScreenFraction),
            hull: p.layouts.map((l) => l.hullOnscreen),
          })),
        ),
      );
    } finally {
      hull.dispose();
      props.dispose();
      terrain.dispose();
    }
  }
  const path =
    args.find((arg) => !['--verify', '--scale-table'].includes(arg)) ??
    '.cache/hood-poses/results.json';
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(output, null, 2) + '\n');
} finally {
  await server.close();
}
