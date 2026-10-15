import { resolveEffective } from '../../src/game/EffectiveSettings.js';
import { defaultSettings } from '../../src/core/Save.js';
import {
  Color,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  ShaderLib,
  WebGLRenderer,
} from 'three';
import { describe, expect, it, vi } from 'vitest';
import * as decals from '../../src/vehicles/decals.js';
import {
  HULL_PAINTS,
  LIGHT_TRIMS,
  PHOTO_FRAMES,
  SUB_DECALS,
  discoveryCount,
  cosmeticUnlocked,
  defaultCosmetics,
  type CosmeticProgress,
} from '../../src/game/Cosmetics.js';
import {
  migrateProgress,
  ProgressSave,
  PROGRESS_STORAGE_KEY,
  type SettingsStorage,
} from '../../src/core/Save.js';
import { makeConfig } from '../../src/core/Config.js';
import { Progress } from '../../src/game/Progress.js';
import { SubMesh } from '../../src/sub/SubMesh.js';

function storage(): SettingsStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}
const empty: CosmeticProgress = { ratings: {}, awarded: [], dailyBestStreak: 0 };
function discoveries(total: number): CosmeticProgress {
  return { ...empty, awarded: Array.from({ length: total }, (_, i) => `poi:site/${i}`) };
}
const primary = [{ primary: true, complete: true }];

describe('cosmetic rewards', () => {
  it('offers eight paints, two earned trims and current-look defaults', () => {
    expect(HULL_PAINTS).toHaveLength(8);
    expect(LIGHT_TRIMS.filter((def) => def.reward.kind !== 'default')).toHaveLength(2);
    expect(defaultCosmetics()).toEqual({
      paint: 'stock',
      trim: 'stock',
      decal: 'stock',
      frame: 'stock',
    });
    expect(HULL_PAINTS.filter((def) => cosmeticUnlocked(def, empty)).map((def) => def.id)).toEqual([
      'stock',
    ]);
    expect(LIGHT_TRIMS.filter((def) => cosmeticUnlocked(def, empty)).map((def) => def.id)).toEqual([
      'stock',
    ]);
  });
  it.each([
    ['red', 3],
    ['blue', 6],
    ['green', 10],
    ['gold', 15],
  ] as const)('unlocks %s at exactly %i unique discoveries', (id, threshold) => {
    const def = HULL_PAINTS.find((paint) => paint.id === id)!;
    expect(cosmeticUnlocked(def, discoveries(threshold - 1))).toBe(false);
    expect(cosmeticUnlocked(def, discoveries(threshold))).toBe(true);
    expect(cosmeticUnlocked(def, discoveries(threshold + 1))).toBe(true);
  });
  it('does not unlock paints from modern stars, photos, objectives or event sightings', () => {
    const def = HULL_PAINTS.find((paint) => paint.id === 'red')!;
    const progress = {
      ...empty,
      ratings: { titanic: 3 },
      awarded: ['photo:site/bow', 'objective:site/bow', 'event:site/whale'],
    };
    expect(discoveryCount(progress)).toBe(0);
    expect(cosmeticUnlocked(def, progress)).toBe(false);
    expect(cosmeticUnlocked(SUB_DECALS[1], discoveries(5))).toBe(true);
    expect(cosmeticUnlocked(PHOTO_FRAMES[1], discoveries(3))).toBe(true);
  });
  it('requires an actual secret reward, including migrated discoveries', () => {
    const progress = new Progress(new ProgressSave(null), [
      'titanic/sample:find-1',
      'site/life:ray',
    ]);
    const violet = HULL_PAINTS.find((paint) => paint.id === 'violet')!;
    const amber = LIGHT_TRIMS.find((trim) => trim.id === 'amber')!;
    expect(progress.ownsCosmetic(violet)).toBe(false);
    expect(
      cosmeticUnlocked(violet, { ...empty, awarded: ['secret:', 'poi:secret:site/find'] }),
    ).toBe(false);
    progress.creditDiscovery('titanic/secret:find-1');
    expect(progress.ownsCosmetic(violet)).toBe(true);
    expect(progress.ownsCosmetic(amber)).toBe(true);
    expect(progress.divePoints).toBe(0);
  });
  it('preserves previously earned Daily paint/trim as migration grants, but new streaks grant no cosmetics', () => {
    const store = storage();
    store.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        dailyBestStreak: 3,
        cosmetics: { paint: 'silver', trim: 'blue' },
      }),
    );
    const restored = new Progress(new ProgressSave(store));
    expect(restored.cosmetics).toEqual({ ...defaultCosmetics(), paint: 'silver', trim: 'blue' });
    restored.recordDailyStreak(1);
    expect(new Progress(new ProgressSave(store)).cosmetics).toEqual(restored.cosmetics);
    const fresh = new Progress(new ProgressSave(null));
    fresh.recordDailyStreak(3);
    expect(fresh.selectCosmetic('paint', 'silver')).toBe(false);
  });
  it('uses best ratings once, skips aborted/incomplete dives and grants no RP for selection', () => {
    const progress = new Progress(new ProgressSave(null));
    progress.finish('titanic', primary, true);
    progress.finish('titanic', [{ primary: true, complete: false }]);
    expect(progress.stars).toBe(0);
    expect(progress.selectCosmetic('paint', 'red')).toBe(false);
    for (const id of ['bow', 'stern', 'bridge']) progress.award('poi', `titanic/${id}`);
    progress.award('photo', 'titanic/bow');
    progress.finish('titanic', primary);
    const points = progress.points;
    progress.finish('titanic', primary);
    expect(progress.stars).toBe(3);
    expect(progress.selectCosmetic('paint', 'red')).toBe(true);
    expect(progress.points).toBe(points);
    expect(progress.selectCosmetic('paint', 'gold')).toBe(false);
    expect(progress.selectCosmetic('trim', 'missing')).toBe(false);
  });
});

describe('cosmetic save migration and gameplay isolation', () => {
  it.each([0, 1, 2])(
    'does not turn truncated v%s discovery records or reward tokens into cosmetic unlocks',
    (version) => {
      const red = HULL_PAINTS.find((paint) => paint.id === 'red')!;
      const progress = new Progress(new ProgressSave(null), [
        'titanic/secret:',
        'titanic/sample:',
        'lost-city/secret:',
        'lost-city/life:',
      ]);
      expect(progress.snapshot().awarded).toEqual([]);
      expect(progress.ownsCosmetic(red)).toBe(false);
      const migrated = migrateProgress({
        version,
        awarded: ['poi:/', 'secret:titanic/', 'sample:lost-city/', 'species:', 'sample:'],
        cosmetics: { paint: 'red', frame: 'white' },
      });
      expect(discoveryCount(migrated)).toBe(0);
      expect(migrated.lifetime).toBe(0);
      expect(migrated.cosmetics).toEqual(defaultCosmetics());
    },
  );
  it.each([null, {}, { version: 0, rp: 70 }, { version: 1, points: 50 }, 'bad', []])(
    'defaults old or malformed save %j to the current look',
    (raw) => {
      expect(migrateProgress(raw).cosmetics).toEqual(defaultCosmetics());
    },
  );
  it('recovers unlocks from star/secret tokens before validating saved choices', () => {
    const migrated = migrateProgress({
      version: 1,
      ratings: { titanic: null },
      awarded: ['rating:titanic/3', 'secret:titanic/find-1'],
      cosmetics: { paint: 'orange', trim: 'amber' },
    });
    expect(migrated.cosmetics).toEqual({ ...defaultCosmetics(), paint: 'orange', trim: 'amber' });
    expect(migrated.ratings.titanic).toBe(3);
    expect(
      migrateProgress({ ...migrated, cosmetics: { paint: 'gold', trim: 'amber' } }).cosmetics,
    ).toEqual({ ...defaultCosmetics(), paint: 'stock', trim: 'amber' });
    for (const raw of [
      [],
      'red',
      null,
      { paint: '__proto__', trim: 99 },
      { paint: 'silver', trim: 'blue' },
    ]) {
      expect(migrateProgress({ cosmetics: raw, dailyBestStreak: Infinity }).cosmetics).toEqual(
        defaultCosmetics(),
      );
    }
  });
  it('persists independently selected paint/trim and keeps snapshots isolated', () => {
    const store = storage();
    const progress = new Progress(new ProgressSave(store), ['titanic/secret:find-1']);
    progress.award('species', 'ray');
    progress.award('poi', 'titanic/bow');
    progress.finish('titanic', primary);
    expect(progress.selectCosmetic('paint', 'red')).toBe(true);
    expect(progress.selectCosmetic('trim', 'amber')).toBe(true);
    const restored = new Progress(new ProgressSave(store));
    expect(restored.cosmetics).toEqual({ ...defaultCosmetics(), paint: 'red', trim: 'amber' });
    const selection = restored.cosmetics;
    selection.paint = 'gold';
    const snapshot = restored.snapshot();
    snapshot.cosmetics.trim = 'blue';
    expect(restored.cosmetics).toEqual({ ...defaultCosmetics(), paint: 'red', trim: 'amber' });
    expect(restored.selectCosmetic('paint', 'stock')).toBe(true);
    expect(new Progress(new ProgressSave(store)).cosmetics).toEqual({
      ...defaultCosmetics(),
      paint: 'stock',
      trim: 'amber',
    });
  });
  it('protects future saves and accepts no cosmetic writes or streak credit', () => {
    const store = storage();
    const future = JSON.stringify({
      version: 9,
      cosmetics: { paint: 'gold' },
      dailyBestStreak: 100,
    });
    store.setItem(PROGRESS_STORAGE_KEY, future);
    const progress = new Progress(new ProgressSave(store));
    expect(progress.cosmetics).toEqual(defaultCosmetics());
    expect(progress.selectCosmetic('paint', 'stock')).toBe(false);
    progress.recordDailyStreak(3);
    expect(progress.snapshot().dailyBestStreak).toBe(0);
    expect(store.getItem(PROGRESS_STORAGE_KEY)).toBe(future);
  });
  it('changes neither gameplay profiles nor Arcade access at any depth', () => {
    const progress = new Progress(new ProgressSave(null));
    const base = structuredClone(makeConfig());
    let config;
    config = resolveEffective(defaultSettings(base), 'arcade', null, base);
    const before = structuredClone(config);
    progress.recordDailyStreak(3);
    progress.selectCosmetic('paint', 'silver');
    progress.selectCosmetic('trim', 'blue');
    config = resolveEffective(defaultSettings(base), 'arcade', null, base);
    expect(config).toEqual(before);
    for (const depth of [1000, 6500, 11000]) expect(progress.canDive(depth, 'arcade')).toBe(true);
    expect(progress.canDive(11000, 'realistic')).toBe(true);
  });
});

describe('sub cosmetic materials', () => {
  it.each(['low', 'medium', 'high'])(
    'applies at %s quality without changing geometry or budgets, survives hull swaps and resets',
    (tier) => {
      const mesh = new SubMesh({ tier, hullClass: 'A' });
      for (const hull of ['A', 'B', 'C']) {
        mesh.setHullClass(hull);
        mesh.setCosmetics(defaultCosmetics());
        const vehicle = mesh.vehicle;
        const stats = vehicle.stats;
        const foam = vehicle.root.getObjectByName('vehicle-foam') as Mesh;
        const positions = foam.geometry.getAttribute('position');
        const colors = foam.geometry.getAttribute('color');
        const colorCopy = Array.from(colors.array);
        const lens = vehicle.materials.bySlot.lens as MeshBasicMaterial;
        const uniforms = vehicle.materials.paintUniforms;
        expect(uniforms.uHullPaint.value).toBe(0);
        expect(lens.color.getHex()).toBe(0xffffff);
        vehicle.materials.setLensesOn(false);
        mesh.setCosmetics({ ...defaultCosmetics(), paint: 'blue', trim: 'amber' });
        expect(mesh.vehicle).toBe(vehicle);
        expect(uniforms.uHullPaint.value).toBe(1);
        expect(uniforms.uHullBase.value.getHex()).toBe(0x619dce);
        const dimmed = new Color(0xffd49a).multiplyScalar(0.08);
        expect(lens.color.equals(dimmed)).toBe(true);
        vehicle.materials.setLensesOn(true);
        expect(lens.color.getHex()).toBe(0xffd49a);
        expect(foam.geometry.getAttribute('position')).toBe(positions);
        expect(Array.from(colors.array)).toEqual(colorCopy);
        expect(vehicle.stats).toEqual(stats);
        // Exercise Three's compile hook using its real shader source, without WebGL.
        const shader = {
          ...ShaderLib.standard,
          uniforms: { ...ShaderLib.standard.uniforms },
        } as Parameters<MeshStandardMaterial['onBeforeCompile']>[0];
        (foam.material as MeshStandardMaterial).onBeforeCompile(shader, {} as WebGLRenderer);
        expect(shader.uniforms.uHullBase).toBe(uniforms.uHullBase);
        expect(shader.fragmentShader).toContain(
          'diffuseColor *= vec4(mix(sourcePaint, rewardPaint, uHullPaint), vColor.a);',
        );
        expect(shader.fragmentShader).toContain('vec3 sourcePaint = vColor.rgb;');
        expect(shader.fragmentShader).toContain('uRimColor');
        expect(shader.fragmentShader).not.toContain('#include <color_fragment>');
      }
      mesh.setHullClass('A');
      expect(mesh.vehicle.materials.paintUniforms.uHullBase.value.getHex()).toBe(0x619dce);
      expect((mesh.vehicle.materials.bySlot.lens as MeshBasicMaterial).color.getHex()).toBe(
        0xffd49a,
      );
      mesh.setCosmetics(defaultCosmetics());
      expect(mesh.vehicle.materials.paintUniforms.uHullPaint.value).toBe(0);
      expect((mesh.vehicle.materials.bySlot.lens as MeshBasicMaterial).color.getHex()).toBe(
        0xffffff,
      );
      mesh.dispose();
    },
  );
});

it('grants cosmetics for spent RP, retains the previous look and round-trips entitlements without duplicate grants', () => {
  const migrated = migrateProgress({
    version: 1,
    points: 0,
    lifetime: 0,
    upgrades: { 'light-range': 3, 'light-beam': 2 },
    awarded: ['rating:titanic/3'],
    cosmetics: { paint: 'orange' },
  });
  expect(migrated.lifetime).toBe(315);
  expect(migrated.cosmetics.paint).toBe('orange');
  expect(migrated.cosmeticGrants).toContain('decal:explorer');
  expect(migrated.cosmeticGrants).toContain('frame:gold');
  expect(migrateProgress(migrated)).toEqual(migrated);
  expect(new Set(migrated.cosmeticGrants).size).toBe(migrated.cosmeticGrants.length);
});

it('passes selected decal data to the existing atlas at build time and after hull swaps', () => {
  const atlas = vi.spyOn(decals, 'decalAtlas');
  const selection = { ...defaultCosmetics(), paint: 'blue' as const, decal: 'explorer' as const };
  const mesh = new SubMesh({ hullClass: 'A', tier: 'high', cosmetics: selection });
  try {
    expect(atlas).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'EXPLORER', number: 'SEA' }),
    );
    expect(mesh.vehicle.materials.paintUniforms.uHullBase.value.getHex()).toBe(0x619dce);
    mesh.setHullClass('C');
    expect(atlas).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'EXPLORER', number: 'SEA' }),
    );
    expect(mesh.vehicle.materials.paintUniforms.uHullBase.value.getHex()).toBe(0x619dce);
  } finally {
    mesh.dispose();
    atlas.mockRestore();
  }
});

it.each(HULL_PAINTS)(
  'applies selected $id paint to newly constructed and replacement hulls',
  (paint) => {
    const mesh = new SubMesh({
      tier: 'low',
      hullClass: 'A',
      cosmetics: { ...defaultCosmetics(), paint: paint.id },
    });
    try {
      for (const hull of ['A', 'B', 'C']) {
        mesh.setHullClass(hull);
        const uniforms = mesh.vehicle.materials.paintUniforms;
        expect(uniforms.uHullPaint.value).toBe(paint.colors ? 1 : 0);
        if (paint.colors) {
          expect(uniforms.uHullBase.value.getHex()).toBe(paint.colors.base);
          expect(uniforms.uHullAccent.value.getHex()).toBe(paint.colors.accent);
        }
      }
    } finally {
      mesh.dispose();
    }
  },
);

it.each(LIGHT_TRIMS)(
  'applies selected $id lamp trim to newly constructed and replacement hulls',
  (trim) => {
    const mesh = new SubMesh({
      tier: 'low',
      hullClass: 'A',
      cosmetics: { ...defaultCosmetics(), trim: trim.id },
    });
    try {
      for (const hull of ['A', 'B', 'C']) {
        mesh.setHullClass(hull);
        mesh.vehicle.materials.setLensesOn(true);
        expect((mesh.vehicle.materials.bySlot.lens as MeshBasicMaterial).color.getHex()).toBe(
          trim.color ?? 0xffffff,
        );
      }
    } finally {
      mesh.dispose();
    }
  },
);

it.each(SUB_DECALS.filter((def) => def.text))(
  'applies selected $id decal on new and replacement hulls',
  (decal) => {
    const atlas = vi.spyOn(decals, 'decalAtlas');
    const mesh = new SubMesh({
      tier: 'high',
      hullClass: 'A',
      cosmetics: { ...defaultCosmetics(), decal: decal.id },
    });
    try {
      for (const hull of ['A', 'B', 'C']) {
        mesh.setHullClass(hull);
        expect(atlas).toHaveBeenLastCalledWith(expect.objectContaining(decal.text!));
      }
    } finally {
      mesh.dispose();
      atlas.mockRestore();
    }
  },
);
