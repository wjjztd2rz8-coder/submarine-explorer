import { DAILY_MODIFIER_LABELS } from '../../core/config/modes.js';
import { dailyDive, dailyRatingKey, utcDate } from '../../game/Daily.js';
import { dailyStreak } from '../../game/DailySave.js';
import type { MissionSummary } from '../../game/Mission.js';
import { missionUrl } from '../../ui/MissionSelect.js';
import type { TileIndexEntry } from '../../util/types.js';
import type { ShellContext } from '../context.js';
import type { GameSystem } from '../System.js';
import { Disposables } from '../Disposables.js';

/** Every downloaded mission with a known depth is available for Daily selection. */
export function unlockedDailySites(
  sites: readonly MissionSummary[],
  tiles: readonly TileIndexEntry[],
): string[] {
  return sites
    .filter((s) => tiles.some((t) => t.id === s.tile) && s.depthM !== null)
    .map((s) => s.id);
}
export function createDailySystem(): GameSystem<ShellContext, unknown> {
  const cleanup = new Disposables();
  return {
    name: 'daily',
    start(ctx) {
      ctx.progress.recordDailyStreak(ctx.dailySave.get().streak);
      let display = '';
      const refresh = () => {
        const date = utcDate();
        const dive = dailyDive(date, unlockedDailySites(ctx.missionSummaries, ctx.index));
        if (!dive) {
          display = '';
          ctx.home.clearDaily();
          return;
        }
        const site = ctx.missionSummaries.find((s) => s.id === dive.site)!;
        const best = ctx.progress.rating(dailyRatingKey(dive));
        const streak = dailyStreak(ctx.dailySave.get(), date);
        const key = `${date}/${site.id}/${best}/${streak}`;
        if (key === display) return;
        display = key;
        ctx.home.setDaily(site.title, DAILY_MODIFIER_LABELS[dive.modifier], best, streak, () => {
          const url = new URL(missionUrl(ctx.shellBaseHref(), dive.site));
          url.searchParams.set('daily', date);
          window.location.href = url.toString();
        });
      };
      // Catalogues finish loading after shell init; the timer also rolls over at UTC midnight.
      const timer = window.setInterval(refresh, 1000);
      cleanup.add(() => window.clearInterval(timer));
      cleanup.add(ctx.progress.onChange(refresh));
      cleanup.add(
        ctx.save.onChange((_next, changed) => {
          if (changed.includes('gameplayMode')) refresh();
        }),
      );
      refresh();
      ctx.expose({ daily: ctx.daily });
    },
    dispose: () => cleanup.dispose(),
  };
}
