import { InstancedMesh, Matrix4, Mesh, Vector3, type Object3D } from 'three';

/** Visit actual visible hull vertices, independently of the physics sphere. */
export function visitHullVertices(root: Object3D, visit: (point: Vector3) => void): void {
  root.updateMatrixWorld(true);
  const instance = new Matrix4();
  const world = new Matrix4();
  const point = new Vector3();
  root.traverseVisible((object) => {
    if (!(object instanceof Mesh)) return;
    const positions = object.geometry.getAttribute('position');
    for (let i = 0; i < (object instanceof InstancedMesh ? object.count : 1); i++) {
      if (object instanceof InstancedMesh) object.getMatrixAt(i, instance);
      else instance.identity();
      world.multiplyMatrices(object.matrixWorld, instance);
      for (let j = 0; j < positions.count; j++) {
        point.fromBufferAttribute(positions, j).applyMatrix4(world);
        visit(point);
      }
    }
  });
}

/** Check actual visible hull vertices, independently of the physics sphere. */
export function hullClearance(
  root: Object3D,
  terrain: { sampleHeight(x: number, z: number): number },
): number {
  let minimum = Infinity;
  visitHullVertices(root, (point) => {
    minimum = Math.min(minimum, point.y - terrain.sampleHeight(point.x, point.z));
  });
  return minimum;
}
