import * as THREE from 'three';
import { fbm3, place, smooth } from './shared.js';
import { tieredSpire, type SpireOpts } from './spire.js';

/** A crusted side growth, rooted in the parent's actual local triangles. */
export function carbonateFinger(
  parent: THREE.BufferGeometry,
  o: SpireOpts & { rootHeight: number; azimuth: number; lean: number },
): THREE.BufferGeometry {
  const g = tieredSpire(o);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const t = Math.min(1, Math.max(0, y / o.h));
    const angle = Math.atan2(z, x);
    // Broad mineral lobes survive Low's sparse rings. The centreline bends
    // gently, and the crown ends unevenly rather than as a cut pipe rim.
    const crust = fbm3(Math.cos(angle) * 2 + 3, t * 5, Math.sin(angle) * 2 + 3, o.seed, 2);
    const lobe = 1 + (crust - 0.5) * 0.6;
    p.setXYZ(
      i,
      x * lobe + o.r0 * t * t * 0.5,
      y + o.h * 0.045 * smooth(0.65, 1, t) * (crust - 0.5),
      z * lobe * (1 - 0.25 * smooth(0, 1, t)),
    );
  }
  g.computeVertexNormals();

  parent.computeBoundingBox();
  const size = parent.boundingBox!.getSize(new THREE.Vector3());
  const outward = new THREE.Vector3(Math.cos(o.azimuth), 0, Math.sin(o.azimuth));
  const start = outward.clone().multiplyScalar(Math.hypot(size.x, size.z));
  start.y = o.rootHeight;
  const probeMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const probe = new THREE.Mesh(parent, probeMaterial);
  const hit = new THREE.Raycaster(start, outward.clone().negate()).intersectObject(probe)[0];
  probeMaterial.dispose();
  if (!hit) {
    g.dispose();
    throw new Error('Carbonate finger has no parent surface');
  }
  // Bury the broad foot past the ridged wall, including at Low. Work in the
  // parent's frame so its later lean cannot pull the growth away from it.
  const root = hit.point.clone().addScaledVector(outward, -o.r0 * 1.25);
  return place(g, {
    x: root.x,
    y: root.y,
    z: root.z,
    rx: Math.sin(o.azimuth) * o.lean,
    rz: -Math.cos(o.azimuth) * o.lean,
  });
}
