import * as THREE from 'three';

/** Test-only broad phase for axis-aligned rays through dense authored meshes.
 * Bucket the actual triangles by their projected bounds; Three still performs
 * every intersection, including material sidedness and the world transform.
 * No analytic builder surface or reduced geometry is substituted.
 */
export function projectedRaycast(mesh: THREE.Mesh, axis: 'y' | 'z') {
  const geometry = mesh.geometry;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const bounds = geometry.boundingBox!;
  const position = geometry.getAttribute('position');
  const index = geometry.index;
  const second = axis === 'y' ? 'z' : 'y';
  const cells = 32;
  const dx = (bounds.max.x - bounds.min.x) / cells || 1;
  const dv = (bounds.max[second] - bounds.min[second]) / cells || 1;
  const col = (x: number) => Math.max(0, Math.min(cells - 1, Math.floor((x - bounds.min.x) / dx)));
  const row = (v: number) =>
    Math.max(0, Math.min(cells - 1, Math.floor((v - bounds.min[second]) / dv)));
  const buckets = new Map<number, number[]>();
  const vertices = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  for (let i = 0; i < (index?.count ?? position.count); i += 3) {
    const ids = [0, 1, 2].map((j) => (index ? index.getX(i + j) : i + j));
    vertices.forEach((p, j) => p.fromBufferAttribute(position, ids[j]));
    const x0 = col(Math.min(...vertices.map((p) => p.x)));
    const x1 = col(Math.max(...vertices.map((p) => p.x)));
    const v0 = row(Math.min(...vertices.map((p) => p[second])));
    const v1 = row(Math.max(...vertices.map((p) => p[second])));
    for (let x = x0; x <= x1; x++) {
      for (let v = v0; v <= v1; v++) {
        const key = x + cells * v;
        const triangles = buckets.get(key) ?? [];
        triangles.push(...ids);
        buckets.set(key, triangles);
      }
    }
  }
  const meshes = new Map<number, THREE.Mesh>();
  const inverse = new THREE.Matrix4();
  const local = new THREE.Ray();
  return (ray: THREE.Raycaster): THREE.Intersection[] => {
    inverse.copy(mesh.matrixWorld).invert();
    local.copy(ray.ray).applyMatrix4(inverse);
    // This index is valid only for rays parallel to the chosen local axis.
    if (Math.abs(local.direction.x) > 1e-8 || Math.abs(local.direction[second]) > 1e-8)
      throw new Error('Projected raycast requires an axis-aligned local ray');
    const key = col(local.origin.x) + cells * row(local.origin[second]);
    const triangles = buckets.get(key);
    if (!triangles) return [];
    let candidate = meshes.get(key);
    if (!candidate) {
      const subset = new THREE.BufferGeometry();
      // Share all original vertex data; only the triangle index is narrowed.
      for (const [name, attribute] of Object.entries(geometry.attributes))
        subset.setAttribute(name, attribute);
      subset.setIndex(triangles);
      subset.boundingBox = bounds;
      subset.boundingSphere = geometry.boundingSphere;
      candidate = new THREE.Mesh(subset, mesh.material);
      meshes.set(key, candidate);
    }
    candidate.matrixWorld.copy(mesh.matrixWorld);
    return ray.intersectObject(candidate, false);
  };
}
