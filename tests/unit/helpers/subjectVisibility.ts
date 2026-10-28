import { Box2, Box3, Mesh, Raycaster, Vector2, Vector3, type Camera, type Object3D } from 'three';

/** Hidden LODs and transparent plumes neither establish nor obstruct a solid subject. */
export function solidMeshes(root: Object3D): Mesh[] {
  const meshes: Mesh[] = [];
  root.updateWorldMatrix(true, true);
  root.traverseVisible((object) => {
    if (!(object instanceof Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    if (materials.every((material) => material.visible && material.opacity >= 0.95))
      meshes.push(object);
  });
  return meshes;
}

/** Require middle and upper solid body, allowing a buried base and gaps between stacks. */
export function subjectVisibility(body: Mesh, solids: Mesh[], camera: Camera): boolean[] {
  camera.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(body, true);
  const screen = new Box2();
  for (const x of [bounds.min.x, bounds.max.x])
    for (const y of [bounds.min.y, bounds.max.y])
      for (const z of [bounds.min.z, bounds.max.z]) {
        const p = new Vector3(x, y, z).project(camera);
        // A bounding box crossing the eye cannot establish a framed subject.
        if (p.z <= -1 || p.z >= 1) return [false, false];
        screen.expandByPoint(new Vector2(p.x, p.y));
      }
  const size = screen.getSize(new Vector2());
  const ray = new Raycaster();
  return [0.5, 0.75].map((height) =>
    [0.1, 0.3, 0.5, 0.7, 0.9].some((column) => {
      const ndc = new Vector2(screen.min.x + size.x * column, screen.min.y + size.y * height);
      if (Math.abs(ndc.x) >= 1 || Math.abs(ndc.y) >= 1) return false;
      ray.setFromCamera(ndc, camera);
      return ray.intersectObjects(solids, false)[0]?.object === body;
    }),
  );
}
