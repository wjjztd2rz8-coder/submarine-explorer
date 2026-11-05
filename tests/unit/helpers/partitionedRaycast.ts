import {
  Box3,
  BufferGeometry,
  Mesh,
  Sphere,
  Vector3,
  type Intersection,
  type Raycaster,
} from 'three';

/** Test-only broad phase for static meshes; Three still intersects every candidate triangle.
 * Contiguous triangle batches retain the original vertex data, materials and world transform.
 * Build again after changing geometry (including terrain LOD) or mesh transforms.
 */
export function partitionedRaycast(mesh: Mesh): (ray: Raycaster) => Intersection[] {
  const geometry = mesh.geometry;
  // Preserve specialized raycasts, instancing, deformation and material groups unchanged.
  if (
    mesh.constructor !== Mesh ||
    mesh.raycast !== Mesh.prototype.raycast ||
    Array.isArray(mesh.material) ||
    Object.keys(geometry.morphAttributes).length
  )
    return (ray) => ray.intersectObject(mesh, false);

  const position = geometry.getAttribute('position');
  const index = geometry.index;
  const start = Math.max(0, geometry.drawRange.start);
  const end = Math.min(index?.count ?? position.count, start + geometry.drawRange.count);
  const batchSize = 256 * 3;
  if (start % 3 || end % 3 || end - start <= batchSize)
    return (ray) => ray.intersectObject(mesh, false);

  const point = new Vector3();
  const batches: { candidate: Mesh; firstFace: number }[] = [];
  for (let first = start; first < end; first += batchSize) {
    const indices: number[] = [];
    const bounds = new Box3();
    for (let i = first; i < Math.min(first + batchSize, end); i++) {
      const vertex = index ? index.getX(i) : i;
      indices.push(vertex);
      bounds.expandByPoint(point.fromBufferAttribute(position, vertex));
    }
    const subset = new BufferGeometry();
    for (const [name, attribute] of Object.entries(geometry.attributes))
      subset.setAttribute(name, attribute);
    subset.setIndex(indices);
    subset.boundingBox = bounds;
    subset.boundingSphere = bounds.getBoundingSphere(new Sphere());
    const candidate = new Mesh(subset, mesh.material);
    candidate.matrixWorld.copy(mesh.matrixWorld);
    candidate.layers.mask = mesh.layers.mask;
    batches.push({ candidate, firstFace: Math.floor(first / 3) });
  }
  return (ray) => {
    const hits: Intersection[] = [];
    for (const { candidate, firstFace } of batches) {
      for (const hit of ray.intersectObject(candidate, false)) {
        hit.object = mesh;
        if (hit.faceIndex != null) hit.faceIndex += firstFace;
        hits.push(hit);
      }
    }
    return hits.sort((a, b) => a.distance - b.distance);
  };
}
