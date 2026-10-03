// Development-only entry: never imported by the application or production build.
import * as THREE from 'three';
import { loadTitleCrop } from '../../src/render/title/TitleTerrain.js';
import { regionFor, TITLE_SHOT, TitleScene } from '../../src/render/title/TitleScene.js';

const tier = new URLSearchParams(location.search).get('tier') === 'high' ? 'high' : 'low';
const width = innerWidth;
const height = innerHeight;
const layout = width < 960 ? 'portrait' : 'desktop';
const region = regionFor(width, height, layout);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(width, height);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.setClearColor(TITLE_SHOT.fallbackColor);
renderer.clear();
document.body.append(renderer.domElement);
const crop = await loadTitleCrop();
const title = new TitleScene({ tier, reducedMotion: false });
title.setCrop(crop);
title.resize(width, height, layout);
const rig = title.scene.children.find((o) => o.type === 'Group')!;
const vehicle = rig.children.find((o) => o.type === 'Group')!;

function silhouette() {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  const p = new THREE.Vector3();
  const instance = new THREE.Matrix4();
  const world = new THREE.Matrix4();
  vehicle.traverseVisible((o) => {
    if (!(o as THREE.Mesh).isMesh) return;
    const positions = (o as THREE.Mesh).geometry.getAttribute('position');
    const instanced = o as THREE.InstancedMesh;
    for (let j = 0; j < (instanced.isInstancedMesh ? instanced.count : 1); j++) {
      world.copy(o.matrixWorld);
      if (instanced.isInstancedMesh) {
        instanced.getMatrixAt(j, instance);
        world.multiply(instance);
      }
      for (let i = 0; i < positions.count; i++) {
        p.fromBufferAttribute(positions, i).applyMatrix4(world).project(title.camera);
        minX = Math.min(minX, (p.x + 1) / 2);
        maxX = Math.max(maxX, (p.x + 1) / 2);
        minY = Math.min(minY, (1 - p.y) / 2);
        maxY = Math.max(maxY, (1 - p.y) / 2);
      }
    }
  });
  return { minX, maxX, minY, maxY, widthFraction: maxX - minX };
}

const ray = new THREE.Raycaster();
const down = new THREE.Vector3(0, -1, 0);
const origin = new THREE.Vector3();
function meshFloor(x: number, z: number) {
  ray.set(origin.set(x, 2000, z), down);
  return ray.intersectObject(crop.mesh)[0]?.point.y ?? Number.NaN;
}
let cameraClearance = Infinity,
  cameraMeshClearance = Infinity,
  vehicleClearance = Infinity;
const cameraBounds = new THREE.Box3();
for (let i = 0; i <= 400; i++) {
  const c = title.camera.position;
  cameraBounds.expandByPoint(c);
  cameraClearance = Math.min(cameraClearance, c.y - crop.sampleFloor(c.x, c.z));
  cameraMeshClearance = Math.min(cameraMeshClearance, c.y - meshFloor(c.x, c.z));
  vehicleClearance = Math.min(vehicleClearance, rig.position.y - crop.sampleFloor(0, 0));
  if (i < 400) title.update(0.1);
}
// Present only after the deterministic loop, so lamps-on/off captures have
// identical vehicle/snow poses and differ solely in terrain lamp contribution.
title.draw(renderer);
const actual = { ...renderer.info.render };
const projected = silhouette();
// Camera loop returns to the captured pose. Leave the scene available for visual
// comparisons (lamps off, later phases) without starting a wall-clock render loop.
Object.assign(window, {
  __titleReview: {
    title,
    renderer,
    crop,
    metrics: {
      tier,
      poseTimeS: 40,
      width,
      height,
      region,
      actual,
      sceneStats: { ...title.stats },
      cameraClearance,
      cameraMeshClearance,
      vehicleClearance,
      cameraBounds: { min: cameraBounds.min.toArray(), max: cameraBounds.max.toArray() },
      silhouette: projected,
      anchorFloor: crop.anchorFloorY,
      snow: (title.scene.getObjectByName('titleSnow') as THREE.Points).geometry.getAttribute(
        'position',
      ).count,
    },
  },
});
