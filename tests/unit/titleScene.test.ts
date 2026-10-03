import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import {
  TITLE_SHOT,
  TitleScene,
  regionFor,
  type TitleCropInput,
  type TitleTier,
} from '../../src/render/title/TitleScene.js';

/** Synthetic canyon: flat at anchor, a ridge west of the camera, a wall to the east. */
function floorFn(ridge: number) {
  return (x: number, z: number): number => {
    let y = 0;
    if (x < -60) y = ridge;
    if (x > 90) y = 0.5 * (x - 90);
    if (z < -80) y = Math.max(y, 0.4 * (-80 - z));
    return y;
  };
}

function makeCrop(ridge = 0): TitleCropInput & { disposed: number } {
  const geo = new THREE.PlaneGeometry(2400, 2400, 24, 24);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial());
  const crop = {
    mesh,
    anchorFloorY: 0,
    halfSize: 1200,
    sampleFloor: floorFn(ridge),
    disposed: 0,
    dispose(): void {
      crop.disposed++;
      geo.dispose();
    },
  };
  return crop;
}

function fakeRenderer() {
  const calls: string[] = [];
  const vp = new THREE.Vector4(0, 0, 800, 600);
  const sc = new THREE.Vector4(0, 0, 800, 600);
  let test = false;
  const r = {
    calls,
    render: vi.fn(() => calls.push('render')),
    getViewport: (t: THREE.Vector4) => t.copy(vp),
    getScissor: (t: THREE.Vector4) => t.copy(sc),
    getScissorTest: () => test,
    setViewport: (x: number, y: number, w: number, h: number) => {
      vp.set(x, y, w, h);
      calls.push(`vp ${x},${y},${w},${h}`);
    },
    setScissor: (x: number, y: number, w: number, h: number) => sc.set(x, y, w, h),
    setScissorTest: (b: boolean) => {
      test = b;
    },
    vp,
    sc,
    get test() {
      return test;
    },
  };
  return r;
}

const asRenderer = (r: unknown): THREE.WebGLRenderer => r as THREE.WebGLRenderer;

function run(scene: TitleScene, seconds: number, step = 1 / 60, onStep?: () => void): void {
  for (let t = 0; t < seconds; t += step) {
    scene.update(step);
    onStep?.();
  }
}

describe('TitleScene budgets', () => {
  for (const tier of ['low', 'medium', 'high'] as TitleTier[]) {
    it(`stays inside the ${tier} budget with a crop`, () => {
      const s = new TitleScene({ tier, reducedMotion: false });
      s.setCrop(makeCrop());
      const b = TITLE_SHOT.budgets[tier];
      expect(s.stats.calls).toBeGreaterThan(3);
      expect(s.stats.calls).toBeLessThanOrEqual(b.calls);
      expect(s.stats.triangles).toBeLessThanOrEqual(b.triangles);
      const pts = s.scene.getObjectByName('titleSnow') as THREE.Points;
      expect(pts.geometry.getAttribute('position').count).toBeLessThanOrEqual(
        tier === 'low' ? 200 : 600,
      );
      s.dispose();
    });
  }

  it('uses fixed camera optics and a navy fallback without a crop', () => {
    const s = new TitleScene({ tier: 'low', reducedMotion: false });
    expect(s.terrainReady).toBe(false);
    expect(s.camera.fov).toBe(42);
    expect(s.camera.near).toBe(1);
    expect(s.camera.far).toBe(3000);
    expect((s.scene.background as THREE.Color).getHex()).toBe(0x06131f);
    expect(s.scene.fog).toBeTruthy();
    s.setCrop(makeCrop());
    expect(s.terrainReady).toBe(true);
    s.dispose();
  });

  it('rebuilds the vehicle on tier change and stays in budget', () => {
    const s = new TitleScene({ tier: 'high', reducedMotion: false });
    const hi = s.stats.triangles;
    s.setQuality('low');
    expect(s.stats.triangles).toBeLessThan(hi);
    expect(s.stats.calls).toBeLessThanOrEqual(35);
    s.dispose();
  });
});

describe('TitleScene motion and clearance', () => {
  it('keeps 12 m over the sampled floor for camera and vehicle for a full loop', () => {
    for (const ridge of [0, 55, 80]) {
      const crop = makeCrop(ridge);
      const s = new TitleScene({ tier: 'medium', reducedMotion: false });
      s.setCrop(crop);
      const check = (): void => {
        const c = s.camera.position;
        expect(c.y - crop.sampleFloor(c.x, c.z)).toBeGreaterThanOrEqual(TITLE_SHOT.clearanceM);
        const rig = s.scene.children.find((o) => o.type === 'Group') as THREE.Object3D;
        expect(
          rig.position.y - crop.sampleFloor(rig.position.x, rig.position.z),
        ).toBeGreaterThanOrEqual(TITLE_SHOT.clearanceM);
      };
      check();
      run(s, 82, 1 / 30, check);
      s.dispose();
    }
  });

  it('starts at the specified shot with a 35 m vehicle height', () => {
    const s = new TitleScene({ tier: 'low', reducedMotion: true });
    s.setCrop(makeCrop());
    const rig = s.scene.children.find((o) => o.type === 'Group') as THREE.Object3D;
    expect(rig.position.toArray()).toEqual([0, 35, 0]);
    expect(s.camera.position.x).toBeCloseTo(-85, 6);
    expect(s.camera.position.y).toBeCloseTo(70, 6);
    expect(s.camera.position.z).toBeCloseTo(115, 6);
    s.dispose();
  });

  it('sways within limits and loops seamlessly at 40 s', () => {
    const s = new TitleScene({ tier: 'medium', reducedMotion: false });
    s.setCrop(makeCrop());
    const rig = s.scene.children.find((o) => o.type === 'Group') as THREE.Object3D;
    const start = s.camera.position.clone();
    const q0 = s.camera.quaternion.clone();
    const y0 = rig.position.y;
    let maxTravel = 0;
    let maxYaw = 0;
    let maxHover = 0;
    // Exactly 40 s in 0.1 s steps (the dt clamp).
    for (let i = 0; i < 400; i++) {
      s.update(0.1);
      maxTravel = Math.max(maxTravel, s.camera.position.distanceTo(start));
      maxYaw = Math.max(maxYaw, (s.camera.quaternion.angleTo(q0) * 180) / Math.PI);
      maxHover = Math.max(maxHover, Math.abs(rig.position.y - y0));
    }
    expect(maxTravel).toBeLessThanOrEqual(2);
    expect(maxTravel).toBeGreaterThan(0.3);
    expect(maxYaw).toBeLessThanOrEqual(1);
    expect(maxHover).toBeLessThanOrEqual(0.3);
    expect(s.camera.position.distanceTo(start)).toBeLessThan(1e-3);
    expect(s.camera.quaternion.angleTo(q0)).toBeLessThan(1e-4);
    s.dispose();
  });

  it('clamps a huge dt after tab restore', () => {
    const a = new TitleScene({ tier: 'low', reducedMotion: false });
    const b = new TitleScene({ tier: 'low', reducedMotion: false });
    a.update(600);
    b.update(TITLE_SHOT.maxDt);
    expect(a.camera.position.distanceTo(b.camera.position)).toBeLessThan(1e-9);
    a.update(-5);
    a.update(Number.NaN);
    expect(Number.isFinite(a.camera.position.x)).toBe(true);
    a.dispose();
    b.dispose();
  });

  it('is fully static and hides snow under reduced motion', () => {
    const s = new TitleScene({ tier: 'high', reducedMotion: true });
    s.setCrop(makeCrop());
    const rig = s.scene.children.find((o) => o.type === 'Group') as THREE.Object3D;
    const pos = s.camera.position.clone();
    const quat = s.camera.quaternion.clone();
    const rp = rig.position.clone();
    const snow = s.scene.getObjectByName('titleSnow') as THREE.Points;
    const snowBefore = Array.from(
      (snow.geometry.getAttribute('position').array as Float32Array).slice(0, 30),
    );
    expect(s.animated).toBe(false);
    expect(snow.visible).toBe(false);
    run(s, 20);
    expect(s.camera.position.equals(pos)).toBe(true);
    expect(s.camera.quaternion.equals(quat)).toBe(true);
    expect(rig.position.equals(rp)).toBe(true);
    expect(
      Array.from((snow.geometry.getAttribute('position').array as Float32Array).slice(0, 30)),
    ).toEqual(snowBefore);
    // Toggling at runtime applies immediately.
    s.setReducedMotion(false);
    expect(s.animated).toBe(true);
    expect(snow.visible).toBe(true);
    run(s, 5);
    expect(s.camera.position.equals(pos)).toBe(false);
    s.setReducedMotion(true);
    expect(s.camera.position.distanceTo(pos)).toBeLessThan(1e-9);
    expect(rig.position.equals(rp)).toBe(true);
    s.dispose();
  });
});

describe('TitleScene layout framing', () => {
  const place = (s: TitleScene): THREE.Vector3 => {
    const rig = s.scene.children.find((o) => o.type === 'Group') as THREE.Object3D;
    // Measure at the base pose: reduced motion keeps the camera there.
    return rig.position.clone().project(s.camera);
  };
  it('puts the vehicle at the spec screen fractions', () => {
    const cases: [number, number, 'desktop' | 'portrait' | 'short-landscape', number, number][] = [
      [1280, 720, 'desktop', 0.72, 0.55],
      [390, 844, 'portrait', 0.64, 0.5],
      [844, 390, 'short-landscape', 0.5, 0.66],
    ];
    for (const [w, h, layout, fx, fy] of cases) {
      const s = new TitleScene({ tier: 'low', reducedMotion: true });
      s.setCrop(makeCrop());
      s.resize(w, h, layout);
      const p = place(s);
      expect((p.x + 1) / 2).toBeCloseTo(fx, 2);
      expect((1 - p.y) / 2).toBeCloseTo(fy, 2);
      s.dispose();
    }
  });

  it('computes the portrait hero band and short-landscape left region', () => {
    expect(regionFor(390, 844, 'portrait')).toEqual({ x: 0, y: 0, w: 390, h: 185.68 });
    expect(regionFor(390, 400, 'portrait').h).toBe(128);
    expect(regionFor(844, 390, 'short-landscape').w).toBe(354);
    expect(regionFor(1280, 720, 'desktop')).toEqual({ x: 0, y: 0, w: 1280, h: 720 });
  });

  it('scissors partial regions and restores renderer state', () => {
    const s = new TitleScene({ tier: 'low', reducedMotion: true });
    const r = fakeRenderer();
    s.resize(390, 844, 'portrait');
    s.draw(asRenderer(r));
    expect(r.render).toHaveBeenCalledTimes(1);
    expect(r.calls[0]).toBe(`vp 0,${844 - 185.68},390,185.68`);
    expect(r.vp.toArray()).toEqual([0, 0, 800, 600]);
    expect(r.test).toBe(false);
    s.dispose();
  });
});

describe('TitleScene draw scheduling', () => {
  it('draws static mode only when dirty', () => {
    const s = new TitleScene({ tier: 'low', reducedMotion: true });
    const r = fakeRenderer();
    s.draw(asRenderer(r));
    expect(s.stats.drawCount).toBe(1);
    for (let i = 0; i < 10; i++) {
      s.update(1 / 60);
      s.draw(asRenderer(r));
    }
    expect(s.stats.drawCount).toBe(1);
    s.invalidate();
    s.draw(asRenderer(r));
    s.draw(asRenderer(r));
    expect(s.stats.drawCount).toBe(2);
    s.resize(800, 600, 'desktop');
    s.draw(asRenderer(r));
    s.setQuality('high');
    s.draw(asRenderer(r));
    s.setReducedMotion(false);
    s.setReducedMotion(true);
    s.draw(asRenderer(r));
    s.setCrop(makeCrop());
    s.draw(asRenderer(r));
    expect(s.stats.drawCount).toBe(6);
    s.dispose();
  });

  it('caps animated drawing at 30 fps', () => {
    const s = new TitleScene({ tier: 'low', reducedMotion: false });
    const r = fakeRenderer();
    s.draw(asRenderer(r));
    const before = s.stats.drawCount;
    run(s, 2, 1 / 60, () => s.draw(asRenderer(r)));
    const drawn = s.stats.drawCount - before;
    expect(drawn).toBeGreaterThanOrEqual(58);
    expect(drawn).toBeLessThanOrEqual(62);
    s.dispose();
  });
});

describe('TitleScene lifecycle', () => {
  it('disposes the crop it owns on replace, null and dispose', () => {
    const s = new TitleScene({ tier: 'low', reducedMotion: true });
    const a = makeCrop();
    const b = makeCrop();
    s.setCrop(a);
    s.setCrop(b);
    expect(a.disposed).toBe(1);
    expect(a.mesh.parent).toBeNull();
    s.setCrop(null);
    expect(b.disposed).toBe(1);
    expect(s.terrainReady).toBe(false);
    const c = makeCrop();
    s.setCrop(c);
    s.dispose();
    expect(c.disposed).toBe(1);
    expect(s.terrainReady).toBe(false);
  });

  it('ignores stale setCrop and all calls after dispose', () => {
    const s = new TitleScene({ tier: 'medium', reducedMotion: false });
    const r = fakeRenderer();
    s.dispose();
    const late = makeCrop();
    s.setCrop(late);
    expect(late.disposed).toBe(1);
    expect(late.mesh.parent).toBeNull();
    expect(s.terrainReady).toBe(false);
    expect(s.animated).toBe(false);
    s.update(1);
    s.resize(100, 100, 'portrait');
    s.setQuality('low');
    s.setReducedMotion(true);
    s.invalidate();
    s.draw(asRenderer(r));
    expect(r.render).not.toHaveBeenCalled();
    expect(s.stats.calls).toBe(0);
    s.dispose(); // idempotent
  });

  it('releases GPU resources it owns', () => {
    const s = new TitleScene({ tier: 'high', reducedMotion: false });
    const snow = s.scene.getObjectByName('titleSnow') as THREE.Points;
    const geoSpy = vi.spyOn(snow.geometry, 'dispose');
    const matSpy = vi.spyOn(snow.material as THREE.Material, 'dispose');
    s.dispose();
    expect(geoSpy).toHaveBeenCalled();
    expect(matSpy).toHaveBeenCalled();
    expect(s.scene.children.length).toBe(0);
  });
});

describe('F-BUGHUNT-12 title regressions', () => {
  it.each([false, true])(
    'keeps navigation lights steady with reducedMotion=%s',
    (reducedMotion) => {
      const s = new TitleScene({ tier: 'high', reducedMotion });
      const check = () => {
        const strobe = s.scene.getObjectByName('vehicle-strobe') as THREE.Mesh;
        const halo = s.scene.getObjectByName('vehicle-strobe-halo') as THREE.Sprite;
        expect((strobe.material as THREE.MeshBasicMaterial).color.toArray()).toEqual([
          0.55, 0.62, 0.7,
        ]);
        expect((halo.material as THREE.SpriteMaterial).opacity).toBe(0);
      };
      try {
        check();
        run(s, 2);
        check();
        s.setReducedMotion(!reducedMotion);
        check();
        s.setQuality('medium');
        check();
      } finally {
        s.dispose();
      }
    },
  );

  it('retains clearance throughout downward hover when a ridge determines vehicle height', () => {
    const s = new TitleScene({ tier: 'low', reducedMotion: false });
    const crop = makeCrop();
    crop.sampleFloor = (x) => (Math.abs(x) < 7 ? 50 : 0);
    s.setCrop(crop);
    const rig = s.scene.children.find((o) => o.type === 'Group')!;
    try {
      for (let i = 0; i < 400; i++) {
        s.update(0.1);
        expect(rig.position.y - crop.sampleFloor(0, 0)).toBeGreaterThanOrEqual(
          TITLE_SHOT.clearanceM,
        );
      }
    } finally {
      s.dispose();
    }
  });

  it.each(['construct', 'change'])('supports resolved Ultra quality on %s', (operation) => {
    const s = new TitleScene({
      tier: operation === 'construct' ? 'ultra' : 'low',
      reducedMotion: false,
    });
    try {
      if (operation === 'change') s.setQuality('ultra');
      const snow = s.scene.getObjectByName('titleSnow') as THREE.Points;
      expect(snow.geometry.getAttribute('position').count).toBe(600);
      expect(s.stats.calls).toBeLessThanOrEqual(60);
      expect(s.stats.triangles).toBeLessThanOrEqual(200_000);
    } finally {
      s.dispose();
    }
  });

  it('does not exceed 30 fps on a 63 Hz update loop', () => {
    const s = new TitleScene({ tier: 'low', reducedMotion: false });
    const r = fakeRenderer();
    try {
      s.draw(asRenderer(r));
      const start = s.stats.drawCount;
      for (let i = 0; i < 630; i++) {
        s.update(1 / 63);
        s.draw(asRenderer(r));
      }
      expect(s.stats.drawCount - start).toBeLessThanOrEqual(300);
    } finally {
      s.dispose();
    }
  });

  it.each(['desktop', 'portrait'] as const)(
    'sets its own %s viewport and restores state after a render error',
    (layout) => {
      const s = new TitleScene({ tier: 'low', reducedMotion: true });
      const r = fakeRenderer();
      r.setViewport(10, 20, 30, 40);
      r.setScissor(11, 22, 33, 44);
      r.setScissorTest(true);
      s.resize(390, 844, layout);
      const region = regionFor(390, 844, layout);
      r.render.mockImplementation(() => {
        expect(r.vp.toArray()).toEqual([region.x, 844 - region.y - region.h, region.w, region.h]);
        expect(r.sc.toArray()).toEqual(r.vp.toArray());
        throw new Error('render failed');
      });
      try {
        expect(() => s.draw(asRenderer(r))).toThrow('render failed');
        expect(r.vp.toArray()).toEqual([10, 20, 30, 40]);
        expect(r.sc.toArray()).toEqual([11, 22, 33, 44]);
        expect(r.test).toBe(true);
        expect(s.stats.drawCount).toBe(0);
        r.render.mockImplementation(() => 0);
        s.draw(asRenderer(r));
        expect(s.stats.drawCount).toBe(1);
      } finally {
        s.dispose();
      }
    },
  );

  it('positions snow at the current crop before the first draw and after replacement', () => {
    const s = new TitleScene({ tier: 'low', reducedMotion: false });
    const positions = () =>
      Array.from(
        (s.scene.getObjectByName('titleSnow') as THREE.Points).geometry.getAttribute('position')
          .array,
      );
    try {
      const initial = positions();
      s.update(0);
      expect(positions()).toEqual(initial);
      const elevated = makeCrop();
      elevated.anchorFloorY = 400;
      elevated.sampleFloor = () => 400;
      s.setCrop(elevated);
      const after = positions();
      for (let i = 0; i < after.length; i += 3) {
        expect(after[i]).toBeCloseTo(initial[i], 4);
        expect(after[i + 1] - initial[i + 1]).toBeCloseTo(400, 3);
        expect(after[i + 2]).toBeCloseTo(initial[i + 2], 4);
      }
      s.update(0);
      expect(positions()).toEqual(after);
    } finally {
      s.dispose();
    }
  });
});
