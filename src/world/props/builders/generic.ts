/**
 * Generic stand-ins shared by every family and by loaded GLB models.
 * Split out of `world/props/Procedural.ts` (F0-CORE).
 */

import * as THREE from 'three';

// ---------------------------------------------------------------- impostors

/**
 * Generic stand-in for loaded models: a low-opacity bounding-box silhouette.
 * Still fogged and lit, so it fades into the murk like the real mesh would.
 */
export function makeBoxSilhouette(bounds: THREE.Box3, color: number, opacity: number): THREE.Mesh {
  const size = bounds.getSize(new THREE.Vector3());
  const centre = bounds.getCenter(new THREE.Vector3());
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(Math.max(size.x, 1e-3), Math.max(size.y, 1e-3), Math.max(size.z, 1e-3)),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 1,
      metalness: 0,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity >= 1,
    }),
  );
  mesh.position.copy(centre);
  mesh.name = 'box-silhouette';
  return mesh;
}
