import {
  Color,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  ShaderLib,
  WebGLRenderer,
} from 'three';
import { describe, expect, it } from 'vitest';
import {
  HULL_PAINTS,
  LIGHT_TRIMS,
  HERO_SITES,
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
import { Progress, applyProgress } from '../../src/game/Progress.js';
import { DailySave } from '../../src/game/DailySave.js';
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
function stars(total: number): CosmeticProgress {
  const ratings: Record<string, number> = {};
  for (let i = 0; total > 0; i++, total -= 3) ratings[`site-${i}`] = Math.min(3, total);
  return { ...empty, ratings };
}
const primary = [{ primary: true, complete: true }];

describe('cosmetic rewards', () => {
  it('offers eight paints, two earned trims and current-look defaults', () => {
    expect(HULL_PAINTS).toHaveLength(8);
    expect(LIGHT_TRIMS.filter((def) => def.reward.kind !== 'default')).toHaveLength(2);
    expect(defaultCosmetics()).toEqual({ paint: 'stock', trim: 'stock' });
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
  ] as const)('unlocks %s at exactly %i best total stars, independently of RP', (id, threshold) => {
    const def = HULL_PAINTS.find((paint) => paint.id === id)!;
    expect(cosmeticUnlocked(def, stars(threshold - 1))).toBe(false);
    expect(cosmeticUnlocked(def, stars(threshold))).toBe(true);
    expect(cosmeticUnlocked(def, stars(threshold + 1))).toBe(true);
  });
  it.each(HERO_SITES)('requires three stars at hero site %s', (site) => {
    const def = HULL_PAINTS.find((paint) => paint.id === 'orange')!;
    expect(cosmeticUnlocked(def, { ...empty, ratings: { [site]: 2 } })).toBe(false);
    expect(cosmeticUnlocked(def, { ...empty, ratings: { [site]: 3 } })).toBe(true);
    expect(cosmeticUnlocked(def, { ...empty, ratings: { other: 3, 'daily-2026-10-03': 3 } })).toBe(
      false,
    );
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
  it('keeps streak paint and trim earned after a missed day and reload', () => {
    const store = storage();
    const progress = new Progress(new ProgressSave(store));
    const daily = new DailySave(store);
    const silver = HULL_PAINTS.find((paint) => paint.id === 'silver')!;
    for (const date of ['2026-10-01', '2026-10-02']) {
      daily.complete(date);
      progress.recordDailyStreak(daily.get().streak);
      expect(progress.ownsCosmetic(silver)).toBe(false);
    }
    daily.complete('2026-10-03');
    progress.recordDailyStreak(daily.get().streak);
    expect(progress.selectCosmetic('paint', 'silver')).toBe(true);
    expect(progress.selectCosmetic('trim', 'blue')).toBe(true);
    daily.complete('2026-10-05');
    expect(daily.get().streak).toBe(1);
    for (const streak of [1, -1, NaN, Infinity, 3.5]) progress.recordDailyStreak(streak);
    const restored = new Progress(new ProgressSave(store));
    expect(restored.snapshot().dailyBestStreak).toBe(3);
    expect(restored.ownsCosmetic(silver)).toBe(true);
    expect(restored.cosmetics).toEqual({ paint: 'silver', trim: 'blue' });
    expect(restored.points).toBe(0);
  });
  it('uses best ratings once, skips aborted/incomplete dives and grants no RP for selection', () => {
    const progress = new Progress(new ProgressSave(null));
    progress.finish('titanic', primary, true);
    progress.finish('titanic', [{ primary: true, complete: false }]);
    expect(progress.stars).toBe(0);
    expect(progress.selectCosmetic('paint', 'red')).toBe(false);
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
    expect(migrated.cosmetics).toEqual({ paint: 'orange', trim: 'amber' });
    expect(migrated.ratings.titanic).toBe(3);
    expect(
      migrateProgress({ ...migrated, cosmetics: { paint: 'gold', trim: 'amber' } }).cosmetics,
    ).toEqual({ paint: 'stock', trim: 'amber' });
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
    progress.finish('titanic', primary);
    expect(progress.selectCosmetic('paint', 'red')).toBe(true);
    expect(progress.selectCosmetic('trim', 'amber')).toBe(true);
    const restored = new Progress(new ProgressSave(store));
    expect(restored.cosmetics).toEqual({ paint: 'red', trim: 'amber' });
    const selection = restored.cosmetics;
    selection.paint = 'gold';
    const snapshot = restored.snapshot();
    snapshot.cosmetics.trim = 'blue';
    expect(restored.cosmetics).toEqual({ paint: 'red', trim: 'amber' });
    expect(restored.selectCosmetic('paint', 'stock')).toBe(true);
    expect(new Progress(new ProgressSave(store)).cosmetics).toEqual({
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
    const config = structuredClone(base);
    applyProgress(config, base, progress, base.settings.gameplayPresets.arcade);
    const before = structuredClone(config);
    progress.recordDailyStreak(3);
    progress.selectCosmetic('paint', 'silver');
    progress.selectCosmetic('trim', 'blue');
    applyProgress(config, base, progress, base.settings.gameplayPresets.arcade);
    expect(config).toEqual(before);
    for (const depth of [1000, 6500, 11000]) expect(progress.canDive(depth, 'arcade')).toBe(true);
    expect(progress.canDive(11000, 'realistic')).toBe(false);
  });
});

describe('sub cosmetic materials', () => {
  it.each(['low', 'medium', 'high', 'ultra'])(
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
        mesh.setCosmetics({ paint: 'blue', trim: 'amber' });
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
