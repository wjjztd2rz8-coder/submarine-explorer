import { DAILY_MODIFIER_LABELS } from '../../core/config/modes.js';
import { dailyDive, dailyRatingKey, utcDate } from '../../game/Daily.js';
import { dailyStreak } from '../../game/DailySave.js';
import type { MissionSummary } from '../../game/Mission.js';
import type { Progress } from '../../game/Progress.js';
import { missionUrl } from '../../ui/MissionSelect.js';
import type { TileIndexEntry } from '../../util/types.js';
import type { GameSystem } from '../System.js';
import { Disposables } from '../Disposables.js';

/** Only downloaded missions within the current hull's depth are Daily candidates. */
export function unlockedDailySites(
  sites: readonly MissionSummary[],
  tiles: readonly TileIndexEntry[],
  progress: Pick<Progress, 'canDive'>,
): string[] {
  return sites
    .filter(
      (s) => tiles.some((t) => t.id === s.tile) && s.depthM !== null && progress.canDive(s.depthM),
    )
    .map((s) => s.id);
}
export function createDailySystem(): GameSystem {
  const cleanup = new Disposables();
  return {
    name: 'daily',
    start(ctx) {
      let display = '';
      const refresh = () => {
        const date = utcDate();
        const dive = dailyDive(
          date,
          unlockedDailySites(ctx.missionSummaries, ctx.index, ctx.progress),
        );
        if (!dive) return;
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
      refresh();
      if (ctx.daily) {
        const modifier = ctx.daily.modifier;
        const enforce = () => {
          const mode = modifier === 'strong-currents' ? 'exaggerated' : 'off';
          ctx.presets.setCurrentMode(mode);
          ctx.hud.setCurrentMode(mode);
          if (modifier === 'low-light') ctx.headlights.setPreset(ctx.config.lightPresets.realistic);
        };
        enforce();
        cleanup.add(ctx.save.onChange(enforce));
      }
      ctx.expose({ daily: ctx.daily });
    },
    dispose: () => cleanup.dispose(),
  };
}
