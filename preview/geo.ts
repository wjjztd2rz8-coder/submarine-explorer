/**
 * Geo preview (dev server only: `npx vite`, then /preview/geo.html).
 * Shows one `procedural:geo` set piece (or a chimney) on a flat seabed under
 * the same dark underwater rig as the wreck preview. Query:
 * `?feature=smoker-cluster&tier=high`. `window.__preview` drives it from
 * Playwright for screenshots.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DEFAULT_PROPS } from '../src/core/Config.js';
import { buildPlacedChimney } from '../src/world/props/builders/vents.js';
import {
  countGeo,
  GEO_FEATURES,
  buildGeo,
  type GeoFeatureId,
} from '../src/world/props/geo/index.js';
import { hashString } from '../src/world/props/geo/shared.js';
import type { PropDef } from '../src/world/PropLoader.js';

interface Spec {
  dims: [number, number, number];
  variant?: string;
}
const SPECS: Record<string, Spec> = {
  'smoker-cluster': { dims: [22, 18, 9] },
  'smoker-cluster-shrimp': { dims: [26, 20, 12], variant: 'shrimp' },
  'carbonate-tower': { dims: [70, 60, 60] },
  'coral-mound': { dims: [60, 44, 12] },
  'stalactite-cluster': { dims: [42, 16, 28] },
  'pillow-field': { dims: [30, 24, 4] },
  'tuff-cliff': { dims: [90, 30, 45] },
  'canyon-ledge': { dims: [70, 26, 36] },
  'hadal-scarp': { dims: [100, 40, 50] },
  'chimney-sulfide': { dims: [3, 3, 6] },
  'chimney-carbonate': { dims: [0, 0, 8] },
};

const params = new URLSearchParams(location.search);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.info.autoReset = false;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const water = new THREE.Color(0x0a1c26);
scene.background = water;
scene.fog = new THREE.FogExp2(water, 0.012);
scene.add(new THREE.HemisphereLight(0x4a7a90, 0x0b0806, 0.55));

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.2, 3000);
camera.position.set(-40, 15, -50);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
for (const x of [-1.2, 1.2]) {
  const h = new THREE.SpotLight(0xdfeaff, 900, 300, THREE.MathUtils.degToRad(36), 0.5, 1.6);
  h.position.set(x, -0.5, 0);
  h.target.position.set(x * 0.3, -0.5, -30);
  camera.add(h, h.target);
}
scene.add(camera);
const spot = new THREE.SpotLight(0xfff1dc, 40000, 500, THREE.MathUtils.degToRad(30), 0.6, 1.5);
scene.add(spot, spot.target);

const bed = new THREE.PlaneGeometry(1500, 1500, 60, 60).rotateX(-Math.PI / 2);
{
  const pos = bed.getAttribute('position');
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const n = 0.5 + 0.25 * Math.sin(x * 0.05 + Math.cos(z * 0.031) * 2) * Math.cos(z * 0.043);
    pos.setY(i, -0.1);
    c.set(0x6a5f52).multiplyScalar(0.8 + 0.35 * n);
    col.set([c.r, c.g, c.b], i * 3);
  }
  bed.setAttribute('color', new THREE.BufferAttribute(col, 3));
  bed.computeVertexNormals();
}
scene.add(
  new THREE.Mesh(bed, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })),
);

const root = new THREE.Group();
scene.add(root);
let current: ReturnType<typeof buildGeo> | null = null;
let id = params.get('feature') ?? 'smoker-cluster';
let tier = params.get('tier') ?? 'high';
let lodMode = 'near';
let buildMs = 0;

function build(key: string, t: string): ReturnType<typeof buildGeo> {
  const spec = SPECS[key] ?? { dims: [30, 30, 10] };
  const seed = hashString(`preview-${key}`);
  if (key.startsWith('chimney-')) {
    const mat = key === 'chimney-carbonate' ? 'carbonate' : 'sulfide';
    return buildPlacedChimney(spec.dims, seed, DEFAULT_PROPS, mat, t);
  }
  const feature = key.replace('-shrimp', '') as GeoFeatureId;
  const def = { feature, raw: { variant: spec.variant } } as unknown as PropDef;
  return buildGeo({
    def,
    dims: spec.dims,
    seed,
    cfg: DEFAULT_PROPS,
    tier: t,
    groundHeight: () => undefined,
  });
}

function show(key: string, t = tier): void {
  id = key;
  tier = t;
  root.clear();
  const t0 = performance.now();
  current = build(key, t);
  buildMs = performance.now() - t0;
  root.add(current.full, current.impostor);
  applyLod();
  controls.target.copy(current.bounds.getCenter(new THREE.Vector3()));
  aimSpot();
}
function applyLod(): void {
  if (!current) return;
  current.full.visible = lodMode !== 'far';
  current.impostor.visible = lodMode === 'far';
}
function aimSpot(): void {
  const az = THREE.MathUtils.degToRad(
    Number((document.getElementById('spotAz') as HTMLInputElement).value),
  );
  const el = THREE.MathUtils.degToRad(
    Number((document.getElementById('spotEl') as HTMLInputElement).value),
  );
  const size = current ? current.bounds.getSize(new THREE.Vector3()).length() : 60;
  const r = Math.max(30, size * 0.9);
  spot.target.position.copy(controls.target);
  spot.position.set(
    controls.target.x + r * Math.cos(el) * Math.sin(az),
    controls.target.y + r * Math.sin(el),
    controls.target.z + r * Math.cos(el) * Math.cos(az),
  );
  spot.distance = r * 2.5;
  spot.intensity = 14 * Math.pow(r, 1.5);
}
function stats(): Record<string, number | string> {
  const info = renderer.info.render;
  const near = current ? countGeo(current.full) : { draws: 0, triangles: 0 };
  return {
    feature: id,
    tier,
    lod: lodMode,
    drawCalls: info.calls,
    triangles: info.triangles,
    geoDraws: near.draws,
    geoTriangles: Math.round(near.triangles),
    buildMs: Math.round(buildMs),
  };
}

const sel = document.getElementById('feature') as HTMLSelectElement;
for (const k of Object.keys(SPECS)) sel.add(new Option(k, k));
sel.value = id;
sel.onchange = () => show(sel.value);
const tierSel = document.getElementById('tier') as HTMLSelectElement;
for (const t of ['low', 'medium', 'high', 'ultra']) tierSel.add(new Option(t, t));
tierSel.value = tier;
tierSel.onchange = () => show(id, tierSel.value);
const lodSel = document.getElementById('lod') as HTMLSelectElement;
lodSel.value = lodMode;
lodSel.onchange = () => {
  lodMode = lodSel.value === 'far' ? 'far' : 'near';
  applyLod();
};
const fog = document.getElementById('fog') as HTMLInputElement;
fog.value = '0.012';
fog.oninput = () => ((scene.fog as THREE.FogExp2).density = Number(fog.value));
for (const k of ['spotAz', 'spotEl'])
  document.getElementById(k)!.addEventListener('input', aimSpot);
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
void GEO_FEATURES;
show(id, tier);

declare global {
  interface Window {
    __preview?: unknown;
  }
}
window.__preview = {
  show,
  stats,
  setFog(d: number) {
    (scene.fog as THREE.FogExp2).density = d;
  },
  setLod(m: string) {
    lodMode = m;
    applyLod();
  },
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
