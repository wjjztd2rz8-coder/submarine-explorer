import * as THREE from 'three';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import type { PropDef } from '../../src/world/PropLoader.js';
import { createLostCityCarbonateMaterial } from '../../src/world/LostCityCarbonate.js';
import { lostCityFlange } from '../../src/world/LostCityFlange.js';
import { buildCarbonateChimney, buildCarbonateTower } from '../../src/world/props/geo/towers.js';
import { flange, tieredSpire } from '../../src/world/props/geo/spire.js';
import { countGeo } from '../../src/world/props/geo/shared.js';
import * as shared from '../../src/world/props/geo/shared.js';
import * as talus from '../../src/world/props/geo/talus.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Lost City carbonate surface', () => {
  it('builds UV-free chimney and tower geometry while retaining vertex colour beds', () => {
    for (const builder of [buildCarbonateTower, buildCarbonateChimney]) {
      const built = builder({
        def: { id: 'surface-fixture' } as PropDef,
        dims: [30, 30, 12],
        seed: 820,
        cfg: DEFAULT_CONFIG.props,
        tier: 'high',
        groundHeight: () => undefined,
      });
      const rock = built.full.children[0] as THREE.Mesh<
        THREE.BufferGeometry,
        THREE.MeshStandardMaterial
      >;
      expect(rock.geometry.getAttribute('uv')).toBeUndefined();
      const colours = Array.from(rock.geometry.getAttribute('color').array);
      expect(colours.every(Number.isFinite)).toBe(true);
      expect(
        colours.reduce((max, c) => Math.max(max, c), -Infinity) -
          colours.reduce((min, c) => Math.min(min, c), Infinity),
      ).toBeGreaterThan(0.2);
      expect(rock.material.vertexColors).toBe(true);
      expect(rock.material.map).toBeNull();
      expect(rock.material.bumpMap).toBeNull();
      expect(rock.material.normalMap).toBeNull();
      rock.material.dispose();
    }
  });

  it('loads the packed RG-normal/B-roughness map only for detailed tiers, and binds after load', async () => {
    const pending: Array<{ src: string; onload: () => void }> = [];
    class ImageStub {
      onload = () => {};
      onerror = () => {};
      _src = '';
      set src(value: string) {
        this._src = value;
        pending.push(this);
      }
      get src() {
        return this._src;
      }
    }
    vi.stubGlobal('Image', ImageStub);
    for (const tier of ['low', 'medium', 'high']) {
      pending.length = 0;
      const material = createLostCityCarbonateMaterial(tier);
      const uniforms = material.userData.uniforms;
      expect(pending.map((image) => image.src)).toEqual(
        tier === 'low'
          ? ['/assets/terrain/carbonate_a.jpg']
          : ['/assets/terrain/carbonate_a.jpg', '/assets/terrain/carbonate_n.jpg'],
      );
      const fallback = uniforms.carbonateAlbedo.value;
      expect(fallback.isDataTexture).toBe(true);
      pending.forEach((image) => image.onload());
      await material.userData.texturesReady;
      expect(uniforms.carbonateAlbedo.value).not.toBe(fallback);
      expect(uniforms.carbonateAlbedo.value.colorSpace).toBe(THREE.SRGBColorSpace);
      expect(uniforms.carbonateAlbedo.value.wrapS).toBe(THREE.RepeatWrapping);
      if (tier !== 'low')
        expect(uniforms.carbonatePacked.value.colorSpace).toBe(THREE.NoColorSpace);
      material.dispose();
    }
  });

  it('preserves the neutral fallback on failure and avoids resurrecting disposed textures', async () => {
    const pending: Array<{ onload: () => void; onerror: () => void }> = [];
    class ImageStub {
      onload = () => {};
      onerror = () => {};
      set src(_value: string) {
        pending.push(this);
      }
    }
    vi.stubGlobal('Image', ImageStub);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const material = createLostCityCarbonateMaterial('high');
    const uniforms = material.userData.uniforms;
    const fallback = uniforms.carbonateAlbedo.value;
    pending[0].onerror();
    material.dispose();
    pending[1].onload();
    await material.userData.texturesReady;
    expect(uniforms.carbonateAlbedo.value).toBe(fallback);
    expect(uniforms.carbonatePacked.value.isDataTexture).toBe(true);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('shares field textures and releases them only after the last material is disposed', async () => {
    const pending: Array<{ onload: () => void }> = [];
    class ImageStub {
      onload = () => {};
      onerror = () => {};
      set src(_value: string) {
        pending.push(this);
      }
    }
    vi.stubGlobal('Image', ImageStub);
    const a = createLostCityCarbonateMaterial('high');
    const b = createLostCityCarbonateMaterial('medium');
    const low = createLostCityCarbonateMaterial('low');
    expect(pending).toHaveLength(2);
    pending.forEach((image) => image.onload());
    await Promise.all([a, b, low].map((material) => material.userData.texturesReady));
    const texture = a.userData.uniforms.carbonateAlbedo.value as THREE.Texture;
    expect(b.userData.uniforms.carbonateAlbedo.value).toBe(texture);
    expect(low.userData.uniforms.carbonateAlbedo.value).toBe(texture);
    const dispose = vi.fn();
    texture.addEventListener('dispose', dispose);
    a.dispose();
    b.dispose();
    expect(dispose).not.toHaveBeenCalled();
    low.dispose();
    low.dispose();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it('keeps glow and F-600 vertex colour in the shader, with separate Low and detail programs', () => {
    const low = createLostCityCarbonateMaterial('low');
    const high = createLostCityCarbonateMaterial('high');
    expect(low.customProgramCacheKey()).not.toBe(high.customProgramCacheKey());
    for (const material of [low, high]) {
      const shader = {
        uniforms: {},
        vertexShader: THREE.ShaderLib.standard.vertexShader,
        fragmentShader: THREE.ShaderLib.standard.fragmentShader,
      };
      material.onBeforeCompile(
        shader as Parameters<typeof material.onBeforeCompile>[0],
        {} as THREE.WebGLRenderer,
      );
      expect(shader.fragmentShader).toContain('mix(vColor.rgb, vec3(1.0), 0.250)');
      expect(shader.vertexShader).toContain('(modelMatrix * vec4(transformed, 1.0)).xyz');
      expect(shader.fragmentShader.includes('#define LOST_CITY_NORMALS')).toBe(material === high);
      // Detail runs after Three constructs/flips its geometric normal, and before lighting/glow.
      expect(shader.fragmentShader.indexOf('vec3 carbonateWorldNormal =')).toBeGreaterThan(
        shader.fragmentShader.indexOf('#include <normal_fragment_begin>'),
      );
      expect(shader.fragmentShader.indexOf('vec3 carbonateWorldNormal =')).toBeLessThan(
        shader.fragmentShader.indexOf('#include <lights_physical_fragment>'),
      );
      material.dispose();
    }
  });
});

describe('Lost City rounded flanges', () => {
  const opts = { r0: 3, w: 2.5, arc: 3.2, start: 5.8, seed: 820 };
  it('uses smooth finite unit normals, thinner shelves, and deterministic irregularity', () => {
    const smooth = lostCityFlange({ ...opts, tier: 'high' });
    const again = lostCityFlange({ ...opts, tier: 'high' });
    const previous = flange({ ...opts, segs: 32 });
    expect(smooth.getAttribute('position').array).toEqual(again.getAttribute('position').array);
    expect(smooth.getAttribute('uv')).toBeUndefined();
    for (const attribute of ['position', 'normal']) {
      expect(Array.from(smooth.getAttribute(attribute).array).every(Number.isFinite)).toBe(true);
    }
    const normals = smooth.getAttribute('normal');
    for (let i = 0; i < normals.count; i++) {
      expect(Math.hypot(normals.getX(i), normals.getY(i), normals.getZ(i))).toBeCloseTo(1, 5);
    }
    // Both angular ends must taper even across the angular seam.
    const p = smooth.getAttribute('position');
    const profiles = p.count / 73;
    const span = (offset: number) => {
      const ys = Array.from({ length: profiles }, (_, i) => p.getY(offset + i));
      return Math.max(...ys) - Math.min(...ys);
    };
    const middleSpan = span(36 * profiles);
    expect(span(0)).toBeLessThan(middleSpan * 0.4);
    expect(span(p.count - profiles)).toBeLessThan(middleSpan * 0.4);
    smooth.computeBoundingBox();
    previous.computeBoundingBox();
    expect(smooth.boundingBox!.getSize(new THREE.Vector3()).y).toBeLessThan(
      previous.boundingBox!.getSize(new THREE.Vector3()).y * 0.7,
    );
    for (const g of [smooth, again, previous]) g.dispose();
  });

  it('keeps Low cheaper and bounds the added rock geometry without extra draws', () => {
    const make = (tier: string) =>
      buildCarbonateTower({
        def: { id: 'surface-fixture' } as PropDef,
        dims: [100, 100, 60],
        seed: 820,
        cfg: DEFAULT_CONFIG.props,
        tier,
        groundHeight: () => undefined,
      });
    const low = countGeo(make('low').full);
    const high = countGeo(make('high').full);
    expect(low.triangles).toBeLessThan(high.triangles * 0.4);
    expect(high.triangles).toBeLessThan(180_000);
    expect(low.draws).toBe(high.draws);
  });
});

// Guards the solid rolled mouth without spending more triangles or opening the cap seam.
describe('carbonate trunk rims and slope rubble', () => {
  it('rolls the lip back above its shoulder and keeps the wall joined to the crater', () => {
    const opts = {
      h: 50,
      r0: 10,
      topFrac: 0.3,
      seed: 820,
      segs: 24,
      rings: 100,
      irregular: Number.EPSILON,
      wobble: 0,
      ridgeAmp: 0,
      ledge: 0,
      crater: 0.7,
    };
    // Negligible irregularity isolates the lip from the broad trunk swells.
    // Negligible crust provides an unrolled torn-rim reference.
    const plain = tieredSpire({ ...opts, crust: Number.EPSILON });
    const rolled = tieredSpire({ ...opts, trunk: true });
    try {
      expect(rolled.index!.array).toEqual(plain.index!.array);
      const a = rolled.getAttribute('position');
      const b = plain.getAttribute('position');
      for (const [row, min, max] of [
        [6, 1.19, 1.21],
        [0, 1.06, 1.08],
      ]) {
        for (let segment = 0; segment <= opts.segs; segment++) {
          const i = row * (opts.segs + 1) + segment;
          const ratio = Math.hypot(a.getX(i), a.getZ(i)) / Math.hypot(b.getX(i), b.getZ(i));
          expect(ratio).toBeGreaterThan(min);
          expect(ratio).toBeLessThan(max);
        }
      }
      const capStart = (opts.rings + 1) * (opts.segs + 1) + opts.segs;
      for (let i = 0; i <= opts.segs; i++) {
        expect(a.getX(capStart + i)).toBeCloseTo(a.getX(i), 5);
        expect(a.getY(capStart + i)).toBeCloseTo(a.getY(i), 5);
        expect(a.getZ(capStart + i)).toBeCloseTo(a.getZ(i), 5);
      }
      for (const name of ['position', 'normal'])
        expect(Array.from(rolled.getAttribute(name).array).every(Number.isFinite)).toBe(true);
    } finally {
      plain.dispose();
      rolled.dispose();
    }
  });

  const make = (tier: string, seed = 820, lone = false) =>
    buildCarbonateTower(
      {
        def: { id: 'surface-fixture' } as PropDef,
        dims: lone ? [16, 16, 10] : [100, 100, 60],
        seed,
        cfg: DEFAULT_CONFIG.props,
        tier,
        groundHeight: () => (x, z) => x * 0.07 - z * 0.1,
      },
      lone,
    );
  const dispose = (built: ReturnType<typeof make>) => {
    for (const root of [built.full, built.impostor])
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh || object instanceof THREE.Points)) return;
        object.geometry.dispose();
        for (const material of Array.isArray(object.material) ? object.material : [object.material])
          material.dispose();
      });
  };
  const digest = (built: ReturnType<typeof make>) => {
    const hash = createHash('sha256');
    for (const root of [built.full, built.impostor])
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh || object instanceof THREE.Points)) return;
        for (const attribute of Object.values(
          object.geometry.attributes as Record<string, THREE.BufferAttribute>,
        )) {
          expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
          hash.update(attribute.array);
        }
        if (object.geometry.index) hash.update(object.geometry.index.array);
        if (object instanceof THREE.InstancedMesh) hash.update(object.instanceMatrix.array);
      });
    hash.update(JSON.stringify({ bounds: built.bounds, colliders: built.colliders }));
    return hash.digest('hex');
  };

  for (const tier of ['low', 'medium', 'high']) {
    it(`${tier}: keeps all seeded buffers repeatable and bounds the merged rock budget`, () => {
      const built = [make(tier), make(tier), make(tier, 821)];
      try {
        expect(digest(built[0])).toBe(digest(built[1]));
        expect(digest(built[0])).not.toBe(digest(built[2]));
        expect(countGeo(built[0].full).draws).toBe(1);
        expect(countGeo(built[0].full).triangles).toBeLessThan(
          { low: 30_000, medium: 85_000, high: 120_000 }[tier]!,
        );
      } finally {
        built.forEach(dispose);
      }
    });

    for (const lone of [false, true]) {
      it(`${tier} lone=${lone}: seats outer rubble across the slope and excludes it from lone chimneys`, () => {
        const apron = vi.spyOn(shared, 'heightMesh');
        const scatter = talus.scatterRubble;
        const centres: [number, number][] = [];
        const rubble = vi
          .spyOn(talus, 'scatterRubble')
          .mockImplementation((surface, keep, opts) => {
            let calls = 0;
            return scatter(
              (x, z) => {
                // Each accepted block samples its centre, then two slope axes.
                if (calls++ % 5 === 0) centres.push([x, z]);
                return surface(x, z);
              },
              keep,
              opts,
            );
          });
        const built = make(tier, 820, lone);
        try {
          if (tier === 'low') {
            expect(rubble).not.toHaveBeenCalled();
            return;
          }
          expect(rubble).toHaveBeenCalledOnce();
          const skirt = apron.mock.calls[0][4];
          const [surface, keep, options] = rubble.mock.calls[0];
          const blocks = rubble.mock.results[0].value as THREE.BufferGeometry[];
          expect(blocks.length).toBeLessThanOrEqual(lone ? 34 : 260);
          expect(centres).toHaveLength(blocks.length);
          const outer = centres.flatMap(([x, z], i) => {
            const ground = x * 0.07 - z * 0.1;
            if (skirt(x, z) >= ground - 1) return [];
            expect(surface(x, z)).toBeCloseTo(ground + 0.05, 6);
            const p = blocks[i].getAttribute('position');
            const heights = Array.from(
              { length: p.count },
              (_, j) => p.getY(j) - (p.getX(j) * 0.07 - p.getZ(j) * 0.1),
            );
            expect(Math.min(...heights)).toBeLessThan(0);
            expect(Math.max(...heights)).toBeGreaterThan(0);
            return [i];
          });
          if (lone) expect(outer).toHaveLength(0);
          else expect(outer.length).toBeGreaterThan(0);
          // The scatter stays inside the existing build plane and does not run onto distant terrain.
          for (const sign of [-1, 1]) {
            expect(keep(sign * options.halfX, 0)).toBe(0);
            expect(keep(0, sign * options.halfZ)).toBe(0);
          }
        } finally {
          dispose(built);
        }
      });
    }
  }
});
