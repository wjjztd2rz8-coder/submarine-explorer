import { Points, type Object3D } from 'three';

/** Hide decorative particles for this draw without changing their owners' visibility state. */
export function drawWithReducedMotion(scene: Object3D, reduced: boolean, draw: () => void): void {
  if (!reduced) {
    draw();
    return;
  }
  const hidden: Points[] = [];
  scene.traverseVisible((object) => {
    if (object instanceof Points) {
      hidden.push(object);
      object.visible = false;
    }
  });
  try {
    draw();
  } finally {
    for (const points of hidden) points.visible = true;
  }
}
