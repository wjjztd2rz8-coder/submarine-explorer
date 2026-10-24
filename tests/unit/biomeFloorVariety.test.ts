import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { DEFAULT_CONFIG, makeConfig } from '../../src/core/Config.js';
import { BIOMES, biomeFor } from '../../src/world/TerrainBiome.js';
import { createTerrainMaterial } from '../../src/world/TerrainMaterial.js';
import { placeCell } from '../../src/world/scatter/ScatterPlacement.js';
import { SCATTER_TYPES } from '../../src/world/scatter/ScatterTypes.js';

afterEach(() => vi.unstubAllGlobals());

const flatGround = {
  sampleHeight: () => -700,
  normalAt: (_x: number, _z: number, out: [number, number, number]) => {
    out[0] = 0;
    out[1] = 1;
    out[2] = 0;
  },
  contains: () => true,
};
const cell = { cellSizeM: 64, density: 1, rockLo: 0.05, rockHi: 0.3, seed: 7 };

describe('open sediment floor variety', () => {
  it('the trench floor ripples reach the whole light pool but stay bounded', () => {
    const biome = biomeFor('challenger-deep');
    expect(biome.ripple).toBeGreaterThan(1);
    expect(biome.rippleReach ?? 0).toBeGreaterThan(0);
    expect(biome.rippleReach ?? 0).toBeLessThanOrEqual(0.4);
  });

  it.each(['low', 'medium', 'high'] as const)(
    '%s: a canyon floor retains cobbles, sand patches and broad current ripples',
    (tier) => {
      const biome = biomeFor('monterey-canyon');
      const density = DEFAULT_CONFIG.terrain.tiers[tier].scatterDensity;
      const placed = placeCell(0, 0, flatGround, biome, { ...cell, density }).dropstone ?? [];
      expect(placed.length).toBeGreaterThan(40 * density);
      const small = placeCell(
        0,
        0,
        flatGround,
        {
          ...biome,
          scatter: biome.scatter.map((spec) => ({ ...spec, sizeMul: 1 })),
        },
        { ...cell, density },
      ).dropstone!;
      expect(small).toHaveLength(placed.length);
      // The same seeds retain their locations while the authored cobbles stay visible.
      for (let i = 0; i < placed.length; i++) {
        expect(placed[i].x).toBe(small[i].x);
        expect(placed[i].z).toBe(small[i].z);
        expect(placed[i].sx / small[i].sx).toBeGreaterThan(2);
      }
      expect(biome.a).not.toBe(biome.b);
      expect(biome.colorA).not.toBe(biome.colorB);
      expect(biome.patch).toBeGreaterThan(0.5);
      // Crest spacing readable from the approach, not just underfoot.
      expect(biome.rippleLenM).toBeGreaterThan(1);
      expect(biome.ripple).toBeGreaterThan(0.6);
    },
  );

  it('the wreck-site abyssal plain strews debris and carries visible ripples', () => {
    const biome = biomeFor('titanic');
    expect(placeCell(0, 0, flatGround, biome, cell).dropstone?.length).toBeGreaterThan(40);
    expect(placeCell(0, 0, flatGround, biome, cell).rubble?.length).toBeGreaterThan(10);
    expect(biome.rippleLenM).toBeGreaterThan(1);
    expect(biome.ripple).toBeGreaterThan(0.6);
    expect([biome.ripple, biome.rippleLenM, biome.rippleDir].every(Number.isFinite)).toBe(true);
    expect(biome.ripple).toBeLessThanOrEqual(1);
  });

  it.each(['low', 'medium', 'high'] as const)(
    'wreck-floor %s density preserves seeded placement, size and embed contracts',
    (tier) => {
      const biome = biomeFor('titanic');
      const { scatterDensity } = makeConfig().terrain.tiers[tier];
      const options = { ...cell, density: scatterDensity };
      const placed = placeCell(-1, 2, flatGround, biome, options);
      expect(placed).toEqual(placeCell(-1, 2, flatGround, biome, options));
      expect(placed.dropstone).not.toEqual(
        placeCell(-1, 2, flatGround, biome, { ...options, seed: cell.seed + 1 }).dropstone,
      );
      // Solitary stones have no clump or patch rejection on ideal ground.
      const expected = (30 * scatterDensity * cell.cellSizeM ** 2) / 1000;
      expect(placed.dropstone!.length).toBeGreaterThanOrEqual(Math.floor(expected));
      expect(placed.dropstone!.length).toBeLessThanOrEqual(Math.ceil(expected));
      const unitSize = placeCell(
        -1,
        2,
        flatGround,
        {
          ...biome,
          scatter: biome.scatter.map((spec) => ({ ...spec, sizeMul: 1 })),
        },
        options,
      );
      for (const spec of biome.scatter) {
        const def = SCATTER_TYPES[spec.kind];
        const instances = placed[spec.kind]!;
        expect(instances.length).toBeGreaterThan(0);
        for (const [index, inst] of instances.entries()) {
          expect(Object.values(inst).every(Number.isFinite)).toBe(true);
          expect(inst.sy).toBeGreaterThan(0);
          expect(inst.y + def.embed * inst.sy).toBeCloseTo(-700, 10);
          const base = unitSize[spec.kind]![index]!;
          const factor = spec.kind === 'dropstone' ? 2.2 : 1;
          expect(inst.sx / base.sx).toBeCloseTo(factor, 10);
          expect(inst.sy / base.sy).toBeCloseTo(factor, 10);
          expect(inst.sz / base.sz).toBeCloseTo(factor, 10);
          // Enlarging stones adjusts embed depth, never the seeded horizontal placement or colour.
          const { sx: _sx, sy: _sy, sz: _sz, y: _y, ...stable } = inst;
          const { sx: _bx, sy: _by, sz: _bz, y: _baseY, ...baseStable } = base;
          expect(stable).toEqual(baseStable);
        }
      }

      const slope = (degrees: number) => ({
        ...flatGround,
        normalAt: (_x: number, _z: number, out: [number, number, number]) => {
          out[0] = Math.sin((degrees * Math.PI) / 180);
          out[1] = Math.cos((degrees * Math.PI) / 180);
          out[2] = 0;
        },
      });
      expect(placeCell(-1, 2, slope(20), biome, options)).toEqual({});
      const gentle = placeCell(-1, 2, slope(12), biome, options);
      expect(gentle.mound).toBeUndefined();
      expect(gentle.dropstone!.length).toBeGreaterThan(0);
      // A late clump member must obey the same footprint exclusion as its seed.
      const kept = placeCell(0, 0, flatGround, biome, {
        ...options,
        exclude: (x) => x >= 32,
      });
      expect(kept.rubble!.length).toBeGreaterThan(0);
      expect(
        Object.values(kept)
          .flat()
          .every((inst) => inst.x < 32),
      ).toBe(true);
    },
  );
});

describe('site floor material bindings', () => {
  // Regression guard: ripple reach must bind on Low too, and constructing the
  // trench material must never change another site's default or live uniforms.
  it.each(['low', 'medium', 'high'] as const)(
    '%s: ripple reach binds per material without leaking into sediment controls',
    (tier) => {
      vi.stubGlobal('document', undefined);
      const config = makeConfig().terrain;
      const before = JSON.stringify({ config, biomes: BIOMES });
      const built: ReturnType<typeof createTerrainMaterial>[] = [];
      try {
        for (const site of [
          'titanic',
          'monterey-canyon',
          'challenger-deep',
          'monterey-canyon',
          'titanic',
        ]) {
          const biome = biomeFor(site);
          const result = createTerrainMaterial({ config, tier, biome, exaggeration: 1 });
          built.push(result);
          const uniforms = result.material.userData.uniforms as Record<string, THREE.IUniform>;
          const shader = {
            ...THREE.ShaderLib.standard,
            uniforms: { ...THREE.ShaderLib.standard.uniforms },
          };
          result.material.onBeforeCompile(
            shader as Parameters<typeof result.material.onBeforeCompile>[0],
            {} as THREE.WebGLRenderer,
          );
          expect(uniforms.uRippleReach.value).toBe(site === 'challenger-deep' ? 0.4 : 0);
          expect(uniforms.uRipple.value).toBe(biome.ripple);
          expect(uniforms.uRippleLen.value).toBe(biome.rippleLenM);
          expect(uniforms.uRippleLen.value).toBeGreaterThan(0);
          expect(
            [
              uniforms.uRippleReach.value,
              uniforms.uRipple.value,
              uniforms.uRippleLen.value,
              ...uniforms.uRippleDir.value.toArray(),
            ].every(Number.isFinite),
          ).toBe(true);
          expect((shader.uniforms as Record<string, THREE.IUniform>).uRippleReach).toBe(
            uniforms.uRippleReach,
          );
          expect(shader.fragmentShader).toContain('0.38 - uRippleReach, 0.62 - uRippleReach');
          for (const previous of built.slice(0, -1)) {
            const retained = previous.material.userData.uniforms.uRippleReach;
            expect(retained).not.toBe(uniforms.uRippleReach);
            expect(retained.value).toBe(previous === built[2] ? 0.4 : 0);
          }
        }
        expect(JSON.stringify({ config, biomes: BIOMES })).toBe(before);
      } finally {
        for (const result of built) {
          result.material.dispose();
          for (const texture of result.textures) texture.dispose();
        }
      }
    },
  );

  it.each(['low', 'medium', 'high'] as const)(
    '%s: horizon fades bind authored endpoints without leaking across material owners',
    (tier) => {
      vi.stubGlobal('document', undefined);
      const config = makeConfig().terrain;
      const before = JSON.stringify({ config, biomes: BIOMES });
      const sites = [
        'blake-plateau-corals',
        'hunga-tonga-caldera',
        'axial-seamount-ashes',
        'hudson-canyon',
        'titanic',
      ];
      const built: ReturnType<typeof createTerrainMaterial>[] = [];
      const retained = new Map<ReturnType<typeof createTerrainMaterial>, string>();
      const state = (result: ReturnType<typeof createTerrainMaterial>) =>
        JSON.stringify(result.material.userData.uniforms);
      const keys = new Map<string, string>();
      try {
        // Keep the first order alive while reversing it, using the same registry and config.
        for (const site of [...sites, ...sites.slice().reverse()]) {
          const biome = biomeFor(site);
          expect(biome).toBe(BIOMES[site]);
          const result = createTerrainMaterial({ config, tier, biome, exaggeration: 1 });
          built.push(result);
          const uniforms = result.material.userData.uniforms as Record<string, THREE.IUniform>;
          const shader = {
            ...THREE.ShaderLib.standard,
            uniforms: { ...THREE.ShaderLib.standard.uniforms },
          };
          result.material.onBeforeCompile(
            shader as Parameters<typeof result.material.onBeforeCompile>[0],
            {} as THREE.WebGLRenderer,
          );
          for (const [name, uniform] of Object.entries(uniforms))
            expect((shader.uniforms as Record<string, THREE.IUniform>)[name]).toBe(uniform);
          for (const [name, color] of [
            ['uColA', biome.colorA],
            ['uColB', biome.colorB],
            ['uColC', biome.colorC],
          ] as const)
            expect(uniforms[name].value.toArray()).toEqual(new THREE.Color(color).toArray());
          expect(shader.fragmentShader.includes('#define TERRAIN_PBR_NORMALS')).toBe(
            tier !== 'low',
          );
          expect(shader.fragmentShader.includes('#define TERRAIN_BREAKUP')).toBe(tier !== 'low');
          if (biome.horizonFadeM) {
            expect(biome.horizonFadeM.every(Number.isFinite)).toBe(true);
            expect(biome.horizonFadeM[0]).toBeLessThan(biome.horizonFadeM[1]);
            expect(uniforms.uHorizonFadeM.value).toBeInstanceOf(THREE.Vector2);
            expect(uniforms.uHorizonFadeM.value.toArray()).toEqual(biome.horizonFadeM);
            const fade = shader.fragmentShader.indexOf(
              'smoothstep(uHorizonFadeM.x, uHorizonFadeM.y',
            );
            expect(fade).toBeGreaterThan(shader.fragmentShader.indexOf('#include <fog_fragment>'));
            expect(shader.fragmentShader).toContain('uniform vec2 uHorizonFadeM;');
          } else {
            expect(uniforms.uHorizonFadeM).toBeUndefined();
            expect(shader.fragmentShader).not.toContain('uHorizonFadeM');
          }
          keys.set(site, result.material.customProgramCacheKey());
          for (const previous of built.slice(0, -1)) {
            expect(state(previous)).toBe(retained.get(previous));
            expect(result.material).not.toBe(previous.material);
            for (const [name, uniform] of Object.entries(uniforms)) {
              const other = previous.material.userData.uniforms[name];
              expect(uniform).not.toBe(other);
              if (typeof uniform.value === 'object') expect(uniform.value).not.toBe(other?.value);
            }
          }
          retained.set(result, state(result));
          expect(JSON.stringify({ config, biomes: BIOMES })).toBe(before);
        }
        // Different endpoint values can share a program; the absent fade needs a different one.
        for (const site of sites.slice(0, -1)) expect(keys.get(site)).not.toBe(keys.get('titanic'));
      } finally {
        for (const result of built) {
          result.material.dispose();
          for (const texture of result.textures) texture.dispose();
        }
      }
    },
  );

  it.each(
    (['low', 'medium', 'high'] as const).flatMap((tier) =>
      (['loaded', 'unavailable'] as const).map((maps) => ({ tier, maps })),
    ),
  )(
    '$tier / $maps: retains silt over basalt and isolates repeated site construction',
    async ({ tier, maps }) => {
      // Control image completion without decoding assets or constructing a renderer.
      const images: Array<{ src: string; onload: () => void; onerror: () => void }> = [];
      vi.stubGlobal('document', {});
      vi.stubGlobal(
        'Image',
        class {
          src = '';
          onload = () => {};
          onerror = () => {};
          constructor() {
            images.push(this);
          }
        },
      );
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const config = makeConfig().terrain;
      const before = JSON.stringify({ config, biomes: BIOMES });
      const built: ReturnType<typeof createTerrainMaterial>[] = [];
      const signatures = new Map<string, string>();
      const bindingState = (uniforms: Record<string, THREE.IUniform>) =>
        JSON.stringify(
          Object.fromEntries(
            Object.entries(uniforms).map(([name, uniform]) => [
              name,
              uniform.value instanceof THREE.Texture
                ? (uniform.value.image?.src ?? Array.from(uniform.value.image.data))
                : uniform.value,
            ]),
          ),
        );
      const retained = new Map<ReturnType<typeof createTerrainMaterial>, string>();
      try {
        // The volcanic and sediment controls bracket Kama in both orders, with the
        // same config and registry objects throughout, including shared scatter data.
        for (const controls of [
          ['axial-seamount-ashes', 'titanic'],
          ['titanic', 'axial-seamount-ashes'],
        ]) {
          for (const site of [...controls, 'kamaehuakanaloa', ...controls]) {
            const biome = biomeFor(site);
            expect(biome).toBe(BIOMES[site]);
            const start = images.length;
            const result = createTerrainMaterial({ config, tier, biome, exaggeration: 1 });
            built.push(result);
            const uniforms = result.material.userData.uniforms as Record<string, THREE.IUniform>;
            const requested = images.slice(start);
            const normalMaps = tier !== 'low';
            const slots =
              site === 'kamaehuakanaloa'
                ? ['silt', 'basalt', 'basalt']
                : [biome.a, biome.b, biome.c];
            const files = slots.flatMap((set) => [
              `${set}_a.jpg`,
              ...(normalMaps ? [`${set}_n.jpg`] : []),
            ]);
            expect(requested.map((image) => image.src)).toEqual(
              [...new Set(files)].map(
                (file) => `${import.meta.env.BASE_URL}assets/terrain/${file}`,
              ),
            );
            expect(result.textures).toHaveLength(2 + new Set(files).size);
            for (const image of requested) {
              if (maps === 'loaded') image.onload();
              else image.onerror();
            }
            await result.texturesReady;
            for (const [index, slot] of ['A', 'B', 'C'].entries()) {
              for (const [prefix, suffix, fallback] of [
                ['tAlb', 'a', 0],
                ['tNrm', 'n', 1],
              ] as const) {
                const texture = uniforms[`${prefix}${slot}`].value as THREE.Texture;
                if (maps === 'unavailable' || (prefix === 'tNrm' && !normalMaps)) {
                  expect(texture).toBe(result.textures[fallback]);
                } else {
                  expect(result.textures.slice(2)).toContain(texture);
                  expect(texture.image).toBe(
                    requested.find((image) => image.src.endsWith(`${slots[index]}_${suffix}.jpg`)),
                  );
                  expect(texture.colorSpace).toBe(
                    prefix === 'tAlb' ? THREE.SRGBColorSpace : THREE.NoColorSpace,
                  );
                }
              }
            }
            await expect(result.rockTexture).resolves.toBe(
              maps === 'loaded' ? uniforms.tAlbC.value : null,
            );
            const shader = {
              ...THREE.ShaderLib.standard,
              uniforms: { ...THREE.ShaderLib.standard.uniforms },
            };
            result.material.onBeforeCompile(
              shader as Parameters<typeof result.material.onBeforeCompile>[0],
              {} as THREE.WebGLRenderer,
            );
            for (const [name, uniform] of Object.entries(uniforms))
              expect((shader.uniforms as Record<string, THREE.IUniform>)[name]).toBe(uniform);
            expect(shader.fragmentShader.includes('#define TERRAIN_PBR_NORMALS')).toBe(normalMaps);
            expect(shader.fragmentShader.includes('#define TERRAIN_BREAKUP')).toBe(normalMaps);
            if (site === 'kamaehuakanaloa') {
              expect(biome.vertexTint).toBeUndefined();
              for (const [name, color] of [
                ['uColA', 0x8a6b54],
                ['uColB', 0x7a6a5c],
                ['uColC', 0x2f2e30],
                ['uStain', 0x6e3a1c],
              ] as const)
                expect(uniforms[name].value.toArray()).toEqual(new THREE.Color(color).toArray());
              expect(uniforms.uPatch.value).toBe(0.3);
              expect(uniforms.uStainAmount.value).toBe(0.12);
              expect(uniforms.uContrast.value.toArray()).toEqual([1.9, 1.3, 1.3]);
              expect(uniforms.uNormalStrength.value).toBe(0.9);
              expect(uniforms.uRipple.value).toBe(0.1);
              expect(uniforms.uRippleLen.value).toBe(0.45);
              expect(uniforms.uRippleDir.value.toArray()).toEqual([Math.cos(1.1), Math.sin(1.1)]);
              expect(uniforms.uBurrow.value).toBe(0.25);
              expect(uniforms.uRockBias.value).toBe(0.25);
              // B/C share the basalt request within this material owner.
              expect(uniforms.tAlbB.value).toBe(uniforms.tAlbC.value);
              expect(uniforms.tNrmB.value).toBe(uniforms.tNrmC.value);
            }
            const signature = bindingState(uniforms);
            if (signatures.has(site)) expect(signature).toBe(signatures.get(site));
            else signatures.set(site, signature);
            // URL reuse never permits material, uniform or texture ownership to leak.
            for (const previous of built.slice(0, -1)) {
              expect(bindingState(previous.material.userData.uniforms)).toBe(
                retained.get(previous),
              );
              expect(result.material).not.toBe(previous.material);
              for (const [name, uniform] of Object.entries(uniforms)) {
                const other = previous.material.userData.uniforms[name];
                expect(uniform).not.toBe(other);
                if (typeof uniform.value === 'object') expect(uniform.value).not.toBe(other?.value);
              }
              for (const texture of result.textures)
                expect(previous.textures).not.toContain(texture);
            }
            retained.set(result, signature);
            expect(JSON.stringify({ config, biomes: BIOMES })).toBe(before);
          }
        }
      } finally {
        warn.mockRestore();
        for (const result of built) {
          result.material.dispose();
          for (const texture of result.textures) texture.dispose();
        }
      }
    },
  );
});
