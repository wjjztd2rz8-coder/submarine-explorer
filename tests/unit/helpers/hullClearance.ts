import { InstancedMesh, Matrix4, Mesh, Vector3, type Object3D } from 'three';

/** Check actual visible hull vertices, independently of the physics sphere. */
export function hullClearance(
  root: Object3D,
  terrain: { sampleHeight(x: number, z: number): number },
): number {
  root.updateMatrixWorld(true);
  let minimum = Infinity;
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
        minimum = Math.min(minimum, point.y - terrain.sampleHeight(point.x, point.z));
      }
    }
  });
  return minimum;
}
