/**
 * Low ice-scoured swells and iceberg-plough ridges around Endurance, so the
 * soft mud plain has scale and the horizon is not a ruler-straight line.
 * Eight to ten long soft ridges (one merged mesh, about 3k triangles) lie
 * 45-170 m out from the hull; scene fog and the abyss horizon take them to the
 * water colour with distance. Heights come from the live terrain.
 */
import * as THREE from 'three';
import type { PresetTerrain } from './types.js';
import { mulberry } from './maths.js';

const COUNT = 10;
const LONG = 28;
const ACROSS = 6;

/** Build the ridge mesh around `centre`; deterministic. */
export function buildEnduranceRelief(terrain: PresetTerrain, centre: THREE.Vector3): THREE.Mesh {
  const rnd = mulberry(0xe4d0);
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const tint = new THREE.Color();
  for (let r = 0; r < COUNT; r++) {
    const bearing = ((r + rnd() * 0.7) / COUNT) * Math.PI * 2;
    const dist = 55 + rnd() * 115;
    const cx = centre.x + Math.cos(bearing) * dist;
    const cz = centre.z + Math.sin(bearing) * dist;
    // Ridges run roughly across the line of sight (ploughed along the ice drift).
    const dir = bearing + Math.PI / 2 + (rnd() - 0.5) * 0.7;
    const len = 55 + rnd() * 90;
    const width = 9 + rnd() * 12;
    const height = 3.5 + rnd() * 5;
    const dx = Math.cos(dir);
    const dz = Math.sin(dir);
    const bend = (rnd() - 0.5) * 30;
    const base = pos.length / 3;
    for (let i = 0; i <= LONG; i++) {
      const t = i / LONG;
      const along = (t - 0.5) * len;
      const env = Math.sin(Math.PI * t) ** 0.8 * (0.75 + 0.25 * Math.sin(t * 17 + r));
      const sway = Math.sin(t * Math.PI) * bend;
      for (let j = 0; j <= ACROSS; j++) {
        const u = (j / ACROSS - 0.5) * 2;
        const across = u * width + sway;
        const x = cx + dx * along - dz * across;
        const z = cz + dz * along + dx * across;
        const prof = Math.cos(u * Math.PI * 0.5) ** 2;
        const y = terrain.sampleHeight(x, z) + height * env * prof - 0.25;
        pos.push(x, y, z);
        const lift = 0.85 + 0.3 * prof * env;
        tint.setRGB(0.135 * lift, 0.122 * lift, 0.09 * lift);
        col.push(tint.r, tint.g, tint.b);
      }
    }
    for (let i = 0; i < LONG; i++) {
      for (let j = 0; j < ACROSS; j++) {
        const a = base + i * (ACROSS + 1) + j;
        const b = a + ACROSS + 1;
        idx.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // Unlit (the site's ambient is very strong): bake a soft key light so the
  // swells model, then let scene fog carry them into the water colour.
  const n = g.getAttribute('normal');
  const c = g.getAttribute('color');
  for (let i = 0; i < n.count; i++) {
    const shade = 0.8 + 0.35 * Math.max(0, n.getX(i) * 0.5 + n.getY(i) * 0.8 - n.getZ(i) * 0.3);
    c.setXYZ(i, c.getX(i) * shade, c.getY(i) * shade, c.getZ(i) * shade);
  }
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true });
  mat.name = 'enduranceRelief';
  const mesh = new THREE.Mesh(g, mat);
  mesh.name = 'enduranceRelief';
  mesh.frustumCulled = false;
  return mesh;
}
