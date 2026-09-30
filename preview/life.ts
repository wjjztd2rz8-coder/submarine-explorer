/**
 * Life preview (dev server only: `npx vite`, then /preview/life.html).
 * Every species lined up on a seabed with name labels, lit like a dive
 * (dark water, warm-white spotlight). Query: `?ids=a,b,c` to pick species,
 * `?real=1` for true size (default: each scaled to fit a 2.4 m cell),
 * `?tier=low|medium|high|ultra`, `?bg=day|deep`, `?cols=6`.
 * `window.__preview.focus(id)` frames one species for screenshots.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SPECIES } from '../src/world/life/catalogue.js';
import { createSpeciesMesh } from '../src/world/life/speciesMesh.js';
import { LIFE_TIERS } from '../src/world/life/types.js';

const params = new URLSearchParams(location.search);
const tierName = (params.get('tier') ?? 'high') as keyof typeof LIFE_TIERS;
const tier = LIFE_TIERS[tierName] ?? LIFE_TIERS.high;
const real = params.get('real') === '1';
const deep = params.get('bg') !== 'day';
const ids = params.get('ids')?.split(',').filter(Boolean);
const cols = Number(params.get('cols') ?? 6);
const list = ids ? SPECIES.filter((s) => ids.includes(s.id)) : SPECIES;

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.info.autoReset = false;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const water = new THREE.Color(deep ? 0x05121a : 0x1b5d78);
scene.background = water;
scene.fog = new THREE.FogExp2(water, deep ? 0.018 : 0.02);
scene.add(new THREE.HemisphereLight(deep ? 0x3f6f88 : 0x8ec6dc, 0x0b0806, deep ? 0.75 : 1.1));
const key = new THREE.DirectionalLight(0xdff2ff, deep ? 1.4 : 2.2);
key.position.set(-6, 10, 8);
scene.add(key);
const fill = new THREE.PointLight(0xfff1dc, 90, 60, 2);
scene.add(fill);

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.05, 400);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const bed = new THREE.Mesh(
  new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0x5b5044, roughness: 1 }),
);
bed.position.y = -1.4;
scene.add(bed);

interface Item {
  id: string;
  name: string;
  mesh: ReturnType<typeof createSpeciesMesh>;
  pos: THREE.Vector3;
  scale: number;
  label: HTMLDivElement;
  height: number;
}
const items: Item[] = [];
const labels = document.getElementById('labels')!;
const cell = real ? Math.max(...list.map((s) => s.size * s.visScale)) * 1.3 : 3.4;
list.forEach((def, i) => {
  const m = createSpeciesMesh(def, tier.detail, 1);
  const c = i % cols;
  const r = Math.floor(i / cols);
  const pos = new THREE.Vector3((c - (cols - 1) / 2) * cell, 0, r * cell * 0.9);
  const len = def.size * def.visScale;
  const scale = real ? def.visScale : Math.min(2.4 / def.size, 400);
  m.mesh.count = 1;
  const life = m.life;
  life.setXYZ(0, i * 1.7, 0, 0);
  scene.add(m.mesh);
  const label = document.createElement('div');
  label.textContent = def.common;
  labels.appendChild(label);
  items.push({ id: def.id, name: def.common, mesh: m, pos, scale, label, height: len });
});
const centre = new THREE.Vector3(0, 0, ((Math.ceil(list.length / cols) - 1) * cell * 0.9) / 2);
const span = Math.max(cols * cell, 8);
camera.position.set(0, 1.4, centre.z + Math.max(span * 1.1, 11));
controls.target.copy(centre);

const m4 = new THREE.Matrix4();
const q = new THREE.Quaternion();
let clock = 0;
let frozen = false;
function place(it: Item, t: number): void {
  const def = it.mesh.def;
  const bob =
    def.archetype === 'sessile' || def.archetype === 'crawler'
      ? -1.4
      : Math.sin(t * 0.4 + it.pos.x) * 0.12;
  const yaw =
    def.archetype === 'sessile' ? 0.6 : Math.PI * 0.5 + Math.sin(t * 0.12 + it.pos.x) * 0.15;
  q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  m4.compose(
    new THREE.Vector3(it.pos.x, it.pos.y + bob, it.pos.z),
    q,
    new THREE.Vector3(it.scale, it.scale, it.scale),
  );
  it.mesh.mesh.setMatrixAt(0, m4);
  it.mesh.mesh.instanceMatrix.needsUpdate = true;
  const speed = def.freq * (def.archetype === 'school' ? 0.8 : 1);
  it.mesh.life.setXYZ(0, t * speed + it.pos.x, 0, 0.5 + 0.5 * Math.sin(t * 1.3 + it.pos.x));
  it.mesh.life.needsUpdate = true;
}

const statsEl = document.getElementById('stats')!;
const v = new THREE.Vector3();
function frame(): void {
  if (!frozen) clock += 1 / 60;
  controls.update();
  fill.position.copy(camera.position).add(new THREE.Vector3(0, 2, 0));
  for (const it of items) {
    place(it, clock);
    v.copy(it.pos)
      .add(new THREE.Vector3(0, it.height * it.scale * 0.5 + 0.35, 0))
      .project(camera);
    const vis = v.z < 1 && v.z > -1;
    it.label.style.display = vis ? 'block' : 'none';
    it.label.style.left = `${((v.x + 1) / 2) * innerWidth}px`;
    it.label.style.top = `${((1 - v.y) / 2) * innerHeight - 6}px`;
  }
  renderer.info.reset();
  renderer.render(scene, camera);
  statsEl.textContent = `tier ${tierName}  species ${list.length}  draws ${renderer.info.render.calls}  tris ${renderer.info.render.triangles}`;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

addEventListener('keydown', (e) => {
  if (e.key === 'h' || e.key === 'H') document.getElementById('panel')!.classList.toggle('hidden');
  if (e.key === ' ') frozen = !frozen;
});
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

(window as unknown as { __preview: unknown }).__preview = {
  focus(id: string, dist = 1): void {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    const h = Math.max(it.mesh.def.size * it.scale, 0.3) * dist;
    controls.target.set(it.pos.x, it.pos.y - 0.2, it.pos.z);
    camera.position.set(it.pos.x - h * 1.1, it.pos.y + h * 0.35, it.pos.z + h * 1.7);
    controls.update();
  },
  freeze(f = true): void {
    frozen = f;
  },
  get species(): string[] {
    return items.map((i) => i.id);
  },
};
