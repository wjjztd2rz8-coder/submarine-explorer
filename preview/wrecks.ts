/**
 * Wreck preview (dev server only: `npx vite`, then /preview/wrecks.html).
 * Not part of the production build (vite builds index.html only).
 *
 * Shows one wreck or scatter kit on a flat seabed under a dark underwater light
 * rig: fog, a faint blue ambient, a pair of camera-mounted "headlights" and a
 * movable spotlight (az/el sliders). Query: `?wreck=titanic-bow&tier=high&lod=auto`.
 * `window.__preview` drives it from Playwright for screenshots.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildWreck, WRECK_HULLS, WRECK_SCATTERS, type WreckId } from '../src/world/props/wrecks/index.js';
import { countTriangles } from '../src/world/props/wrecks/kit.js';
import { hashString } from '../src/world/props/wrecks/shared.js';

const params = new URLSearchParams(location.search);
const DIMS: Record<string, [number, number, number]> = {
  'titanic-bow': [143, 28.2, 17],
  'titanic-stern': [107, 32, 12],
  bismarck: [251, 36, 15],
  endurance: [44, 7.6, 8],
  'titanic-boilers': [25, 25, 5],
  'titanic-field': [150, 150, 2],
  'titanic-stern-field': [80, 80, 3],
  'bismarck-turrets': [50, 50, 6],
  'bismarck-field': [150, 150, 3],
  'bismarck-landslide': [400, 90, 4],
  'endurance-rigging': [35, 35, 3],
  'endurance-stern': [8, 8, 2],
};

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.info.autoReset = false;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const water = new THREE.Color(0x06121a);
scene.background = water;
scene.fog = new THREE.FogExp2(water, 0.008);
scene.add(new THREE.HemisphereLight(0x3d6a80, 0x0b0806, 0.35));

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.3, 4000);
camera.position.set(-120, 45, -140);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Camera-mounted headlights, like the sub's.
for (const x of [-2, 2]) {
  const h = new THREE.SpotLight(0xdfeaff, 9000, 600, THREE.MathUtils.degToRad(34), 0.5, 1.6);
  h.position.set(x, -1, 0);
  h.target.position.set(x * 0.3, -1, -30);
  camera.add(h, h.target);
}
scene.add(camera);

// The movable spotlight (an ROV light): az/el around the target.
const spot = new THREE.SpotLight(0xfff1dc, 60000, 900, THREE.MathUtils.degToRad(28), 0.6, 1.5);
scene.add(spot, spot.target);

// Seabed: a big mud plane with gentle colour noise.
const bed = new THREE.PlaneGeometry(3000, 3000, 120, 120).rotateX(-Math.PI / 2);
{
  const pos = bed.getAttribute('position');
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const n = 0.5 + 0.25 * Math.sin(x * 0.05 + Math.cos(z * 0.031) * 2) * Math.cos(z * 0.043);
    pos.setY(i, -0.15 + Math.sin(x * 0.02) * Math.cos(z * 0.017) * 0.25);
    c.set(0x5a5046).multiplyScalar(0.8 + 0.35 * n);
    col.set([c.r, c.g, c.b], i * 3);
  }
  bed.setAttribute('color', new THREE.BufferAttribute(col, 3));
  bed.computeVertexNormals();
}
scene.add(new THREE.Mesh(bed, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })));

const root = new THREE.Group();
scene.add(root);
let current: ReturnType<typeof buildWreck> | null = null;
let lodMode = params.get('lod') ?? 'auto';
let wreckId = (params.get('wreck') ?? 'titanic-bow') as WreckId;
let tier = params.get('tier') ?? 'high';
let buildMs = 0;

function show(id: WreckId, t = tier): void {
  wreckId = id;
  tier = t;
  root.clear();
  const t0 = performance.now();
  current = buildWreck(id, DIMS[id] ?? [60, 60, 4], hashString(`preview-${id}`), t, () => 0);
  buildMs = performance.now() - t0;
  root.add(current.full, current.impostor);
  applyLod();
  const size = current.bounds.getSize(new THREE.Vector3());
  const c = current.bounds.getCenter(new THREE.Vector3());
  controls.target.copy(c);
  aimSpot();
}

function applyLod(): void {
  if (!current) return;
  const lod = current.full.getObjectByProperty('isLOD', true) as THREE.LOD | undefined;
  current.full.visible = lodMode !== 'far';
  current.impostor.visible = lodMode === 'far';
  if (lod) {
    lod.autoUpdate = lodMode === 'auto';
    if (lodMode === 'near' || lodMode === 'mid') {
      lod.levels.forEach((l, i) => (l.object.visible = i === (lodMode === 'near' ? 0 : 1)));
    }
  }
}

function aimSpot(): void {
  const az = THREE.MathUtils.degToRad(Number((document.getElementById('spotAz') as HTMLInputElement).value));
  const el = THREE.MathUtils.degToRad(Number((document.getElementById('spotEl') as HTMLInputElement).value));
  const size = current ? current.bounds.getSize(new THREE.Vector3()).length() : 100;
  const r = Math.max(40, size * 0.9);
  spot.target.position.copy(controls.target);
  spot.position.set(
    controls.target.x + r * Math.cos(el) * Math.sin(az),
    controls.target.y + r * Math.sin(el),
    controls.target.z + r * Math.cos(el) * Math.cos(az),
  );
  spot.distance = r * 2.5;
}

function stats(): Record<string, number | string> {
  const info = renderer.info.render;
  const nearTri = current ? countTriangles(current.full) : { draws: 0, triangles: 0 };
  return {
    wreck: wreckId,
    tier,
    lod: lodMode,
    drawCalls: info.calls,
    triangles: info.triangles,
    wreckDraws: nearTri.draws,
    wreckTriangles: Math.round(nearTri.triangles),
    buildMs: Math.round(buildMs),
  };
}

// ---- UI
const sel = document.getElementById('wreck') as HTMLSelectElement;
for (const id of [...WRECK_HULLS, ...WRECK_SCATTERS]) sel.add(new Option(id, id));
sel.value = wreckId;
sel.onchange = () => show(sel.value as WreckId);
const tierSel = document.getElementById('tier') as HTMLSelectElement;
for (const t of ['low', 'medium', 'high', 'ultra']) tierSel.add(new Option(t, t));
tierSel.value = tier;
tierSel.onchange = () => show(wreckId, tierSel.value);
const lodSel = document.getElementById('lod') as HTMLSelectElement;
lodSel.value = lodMode;
lodSel.onchange = () => {
  lodMode = lodSel.value;
  applyLod();
};
const fog = document.getElementById('fog') as HTMLInputElement;
fog.oninput = () => ((scene.fog as THREE.FogExp2).density = Number(fog.value));
for (const id of ['spotAz', 'spotEl']) document.getElementById(id)!.addEventListener('input', aimSpot);
addEventListener('keydown', (e) => {
  if (e.key === 'h' || e.key === 'H') document.getElementById('panel')!.classList.toggle('hidden');
});
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const statsEl = document.getElementById('stats')!;
let frame = 0;
renderer.setAnimationLoop(() => {
  controls.update();
  renderer.info.reset();
  renderer.render(scene, camera);
  if (++frame % 20 === 0) {
    statsEl.textContent = Object.entries(stats())
      .map(([k, v]) => `${k} ${v}`)
      .join('\n');
  }
});

show(wreckId, tier);

declare global {
  interface Window {
    __preview?: unknown;
  }
}
window.__preview = {
  show,
  stats,
  setLod(m: string) {
    lodMode = m;
    applyLod();
  },
  setFog(d: number) {
    (scene.fog as THREE.FogExp2).density = d;
  },
  /** Orbit view: azimuth/elevation in degrees, distance in m, optional target offset. */
  view(azDeg: number, elDeg: number, dist: number, target?: [number, number, number]) {
    if (!current) return;
    const c = current.bounds.getCenter(new THREE.Vector3());
    if (target) c.set(...target);
    controls.target.copy(c);
    const az = THREE.MathUtils.degToRad(azDeg);
    const el = THREE.MathUtils.degToRad(elDeg);
    camera.position.set(
      c.x + dist * Math.cos(el) * Math.sin(az),
      c.y + dist * Math.sin(el),
      c.z + dist * Math.cos(el) * Math.cos(az),
    );
    camera.lookAt(c);
    controls.update();
    aimSpot();
  },
  spot(azDeg: number, elDeg: number) {
    (document.getElementById('spotAz') as HTMLInputElement).value = String(azDeg);
    (document.getElementById('spotEl') as HTMLInputElement).value = String(elDeg);
    aimSpot();
  },
  hidePanel() {
    document.getElementById('panel')!.classList.add('hidden');
  },
};
