import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import type { PropDef } from '../../src/world/PropLoader.js';
import { createLostCityCarbonateMaterial } from '../../src/world/LostCityCarbonate.js';
import { lostCityFlange } from '../../src/world/LostCityFlange.js';
import { buildCarbonateChimney, buildCarbonateTower } from '../../src/world/props/geo/towers.js';
import { flange } from '../../src/world/props/geo/spire.js';
import { countGeo } from '../../src/world/props/geo/shared.js';

afterEach(() => vi.unstubAllGlobals());

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
    for (const tier of ['low', 'medium', 'high', 'ultra']) {
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
