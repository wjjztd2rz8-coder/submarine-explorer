/**
 * Vehicle preview (F1-VEHICLES), dev only: `npm run dev`, then open
 * /preview/vehicles.html. Query parameters:
 *
 *   ?v=A|B|C|ROV|all   vehicle (default B; `all` lines up the three hulls)
 *   &tier=low|medium|high|ultra
 *   &scan=1            deploy the manipulators
 *   &az=<deg>&el=<deg>&dist=<m>   fixed camera instead of the slow orbit
 *   &cockpit=1         the first-person cockpit viewport over a seabed
 *
 * Keys: 1/2/3 hull class, 4 ROV, 5 all, L tier cycle, S scan, C cockpit.
 * `window.__preview` exposes the scene for screenshots.
 */

import * as THREE from 'three';
import { buildRov, buildVehicle, type Vehicle } from '../src/vehicles/index.js';
import { CockpitView } from '../src/vehicles/cockpit.js';
import { TetherMesh, payout } from '../src/vehicles/tether.js';

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('c') as HTMLCanvasElement;
const info = document.getElementById('info') as HTMLDivElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03141c);
scene.fog = new THREE.FogExp2(0x03141c, 0.006);
const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 2000);

// Deep-water lighting: a faint blue ambient, a cool key from above (the
// "documentary" light rig on a survey ROV), and a warm rim from behind.
scene.add(new THREE.HemisphereLight(0x4a7f95, 0x0a1418, 0.9));
const key = new THREE.DirectionalLight(0xdff4ff, 2.2);
key.position.set(30, 60, 25);
scene.add(key);
const rim = new THREE.DirectionalLight(0xffc98a, 0.9);
rim.position.set(-40, 10, -50);
scene.add(rim);
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(800, 800, 1, 1).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0x3b4a44, roughness: 1 }),
);
floor.position.y = -14;
scene.add(floor);

let tier = params.get('tier') ?? 'high';
let which = (params.get('v') ?? 'B').toUpperCase();
let scanning = params.get('scan') === '1';
let cockpitOn = params.get('cockpit') === '1';
let vehicles: Vehicle[] = [];
let tether: TetherMesh | null = null;
const cockpit = new CockpitView(tier !== 'low');
scene.add(cockpit.object);

function clear(): void {
  for (const v of vehicles) v.dispose();
  vehicles = [];
  tether?.dispose();
  tether?.object.removeFromParent();
  tether = null;
}

function build(): void {
  clear();
  if (which === 'ROV') {
    const low = tier === 'low';
    const rov = buildRov(tier, 3);
    scene.add(rov.root);
    vehicles.push(rov);
    const mother = buildVehicle('B', tier);
    mother.root.position.set(-18, 6, 26);
    mother.root.rotation.y = 0.5;
    scene.add(mother.root);
    vehicles.push(mother);
    tether = low
      ? new TetherMesh({ segments: 24, line: true })
      : new TetherMesh({ segments: 48, radius: 0.12 });
    scene.add(tether.object);
  } else if (which === 'ALL') {
    (['A', 'B', 'C'] as const).forEach((id, i) => {
      const v = buildVehicle(id, tier);
      v.root.position.set((i - 1) * 28, 0, 0);
      scene.add(v.root);
      vehicles.push(v);
    });
  } else {
    const v = buildVehicle(which, tier);
    scene.add(v.root);
    vehicles.push(v);
  }
}
build();

function resize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

window.addEventListener('keydown', (e) => {
  const map: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'ROV', '5': 'ALL' };
  if (map[e.key]) {
    which = map[e.key]!;
    build();
  } else if (e.key === 'l') {
    const tiers = ['low', 'medium', 'high', 'ultra'];
    tier = tiers[(tiers.indexOf(tier) + 1) % tiers.length]!;
    build();
  } else if (e.key === 's') scanning = !scanning;
  else if (e.key === 'c') cockpitOn = !cockpitOn;
});

const fixedAz = params.get('az');
const clock = new THREE.Clock();
const a = new THREE.Vector3();
const b = new THREE.Vector3();
let t = 0;
function frame(): void {
  const dt = Math.min(0.05, clock.getDelta());
  t += dt;
  const drive = {
    throttle: 0.6 + Math.sin(t * 0.3) * 0.4,
    yaw: Math.sin(t * 0.5) * 0.6,
    vertical: Math.sin(t * 0.23) * 0.5,
    scanning,
    lightsOn: true,
  };
  for (const v of vehicles) v.update(drive, dt);

  if (tether && vehicles.length === 2) {
    const [rov, mother] = vehicles as [Vehicle, Vehicle];
    rov.root.position.set(Math.sin(t * 0.2) * 3, -4 + Math.sin(t * 0.3), -2);
    rov.root.updateMatrixWorld();
    mother.root.updateMatrixWorld();
    a.copy(mother.tetherAnchor)
      .divideScalar(mother.root.scale.x)
      .applyMatrix4(mother.root.matrixWorld);
    b.copy(rov.tetherAnchor).divideScalar(rov.root.scale.x).applyMatrix4(rov.root.matrixWorld);
    tether.update(a, b, payout(a.distanceTo(b), 80, false), Math.sin(t * 0.4) * 0.6);
  }

  const dist = Number(params.get('dist') ?? (which === 'ALL' ? 75 : which === 'ROV' ? 30 : 34));
  const az = fixedAz !== null ? THREE.MathUtils.degToRad(Number(fixedAz)) : t * 0.15 + 0.7;
  const el = THREE.MathUtils.degToRad(Number(params.get('el') ?? 18));
  const target = new THREE.Vector3(
    which === 'ROV' ? -6 : 0,
    which === 'ROV' ? 0 : 1,
    which === 'ROV' ? 8 : 0,
  );
  if (cockpitOn) {
    camera.position.set(0, 6, -40);
    camera.lookAt(0, -2, -120);
  } else {
    camera.position.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    camera.position.multiplyScalar(dist).add(target);
    camera.lookAt(target);
  }
  cockpit.object.visible = cockpitOn;
  for (const v of vehicles) v.root.visible = !cockpitOn;
  renderer.render(scene, camera);

  const stats = vehicles.reduce(
    (s, v) => {
      const x = v.stats;
      return { drawCalls: s.drawCalls + x.drawCalls, triangles: s.triangles + x.triangles };
    },
    { drawCalls: 0, triangles: 0 },
  );
  info.textContent = `${which} · tier ${tier} · ${stats.drawCalls} draws · ${stats.triangles} tris${
    scanning ? ' · arms' : ''
  }\n1/2/3 hulls · 4 ROV · 5 all · L tier · S arms · C cockpit`;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

(window as unknown as { __preview: unknown }).__preview = {
  scene,
  camera,
  renderer,
  get vehicles() {
    return vehicles;
  },
  get stats() {
    return vehicles.map((v) => ({ id: v.id, lod: v.lod, ...v.stats }));
  },
};
