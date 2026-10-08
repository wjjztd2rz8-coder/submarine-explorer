import { BufferGeometry, Mesh, PerspectiveCamera, Scene, type WebGLRenderer } from 'three';
import { WebGLGeometries } from 'three/src/renderers/webgl/WebGLGeometries.js';
import { describe, expect, it } from 'vitest';
import { CockpitView } from '../../src/vehicles/cockpit.js';

/** Use Three's actual geometry allocation/disposal accounting, without a GL
 * context. No buffer uploads occur: the render-list collection and callbacks
 * alone reproduce the three-allocation difference from the browser soak.
 */
function drawProbe(view: CockpitView, camera: PerspectiveCamera) {
  const info = { memory: { geometries: 0 } };
  // Runtime Three takes bindingStates as a fourth argument; its published
  // internal-module types still describe the older three-argument constructor.
  const registry = Reflect.construct(WebGLGeometries, [
    null,
    { remove: () => {} },
    info,
    { releaseStatesOfGeometry: () => {} },
  ]) as Pick<WebGLGeometries, 'get'>;
  const scene = new Scene();
  return () => {
    // WebGLRenderer captures all geometry references before onBeforeRender.
    const queue = view.object.children.map((object) => {
      const mesh = object as Mesh<BufferGeometry>;
      return { mesh, geometry: registry.get(mesh, mesh.geometry) };
    });
    for (const { mesh, geometry } of queue) {
      const material = Array.isArray(mesh.material) ? mesh.material[0]! : mesh.material;
      mesh.onBeforeRender({} as WebGLRenderer, scene, camera, geometry, material, view.object);
    }
    return info.memory.geometries;
  };
}

describe('save-soak cockpit allocation warm-up', () => {
  it('reproduces the Low-tier first-draw refit losing three registered placeholders', () => {
    const view = new CockpitView(false);
    const draw = drawProbe(view, new PerspectiveCamera(62, 960 / 640));
    try {
      expect(draw()).toBe(1);
      expect(draw()).toBe(4);
      expect(draw()).toBe(4);
    } finally {
      view.dispose();
    }
  });

  it('registers identical resources on first and repeated draws when fitted before collection', () => {
    const camera = new PerspectiveCamera(62, 960 / 640);
    const view = new CockpitView(false);
    const draw = drawProbe(view, camera);
    try {
      for (let pass = 0; pass < 3; pass++) {
        view.fit(camera.fov, camera.aspect);
        expect(draw()).toBe(4);
      }
    } finally {
      view.dispose();
    }
  });
});
