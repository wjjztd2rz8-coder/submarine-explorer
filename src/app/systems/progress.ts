import { DiscoveryStore } from '../../game/DiscoveryStore.js';
import { PhotoStore } from '../../game/PhotoStore.js';
import { dailyRatingKey } from '../../game/Daily.js';
import { creditPreviousDives } from '../../game/ProgressMigration.js';
import { Progress } from '../../game/Progress.js';
import type { ShellContext } from '../context.js';
import type { GameSystem } from '../System.js';
import { Disposables } from '../Disposables.js';

/** Boot waits for retroactive discovery credit before displaying cosmetics. */
export async function loadSavedProgress(): Promise<Progress> {
  const discoveries = new DiscoveryStore();
  const progress = new Progress();
  await creditPreviousDives(progress, discoveries, new PhotoStore().photos);
  return progress;
}

export function createProgressSystem(): GameSystem {
  const cleanup = new Disposables();
  let lastPhotos: unknown = null;
  return {
    name: 'progress',
    init(ctx) {
      const progress = ctx.progress;
      if (ctx.route) {
        const fitted = progress.hullFor(
          ctx.route.def.briefing.depth_m ?? 0,
          ctx.settings.gameplayMode,
        );
        ctx.route.def.hull_class = fitted;
      }
      cleanup.add(
        ctx.bus.on('scan:complete', ({ landmarkId, poiId }) => {
          // Curiosity has its own rewards; avoid also awarding a generic POI.
          if (poiId.startsWith('secret:') || poiId.startsWith('sample:')) return;
          // The New Journal entry card announces the discovery; no second toast.
          if (poiId.startsWith('life:')) progress.award('species', poiId.slice('life:'.length));
          else progress.award('poi', `${landmarkId}/${poiId}`);
        }),
      );
      cleanup.add(
        ctx.bus.on('mission:objective', ({ missionId, objectiveId, complete }) => {
          if (complete) progress.award('objective', `${missionId}/${objectiveId}`);
        }),
      );
      cleanup.add(
        ctx.bus.on('mission:primaryComplete', ({ missionId }) =>
          progress.award('primary', ctx.daily ? dailyRatingKey(ctx.daily) : missionId),
        ),
      );
      cleanup.add(ctx.bus.on('mission:started', () => progress.beginDive()));
      cleanup.add(ctx.bus.on('mission:restart', () => progress.beginDive()));
      ctx.expose({ progress });
    },
    start(ctx) {
      initializeProgressMenus(ctx, cleanup);
      lastPhotos = ctx.photos.photos;
      ctx.expose({ progressMigrationReady: () => true });
    },
    frame: {
      'play.mission': (_f, ctx) => {
        if (lastPhotos === ctx.photos.photos) return;
        const previous = lastPhotos as readonly { id: string }[];
        const ids = new Set(previous.map((p) => p.id));
        for (const photo of ctx.photos.photos)
          if (!ids.has(photo.id) && photo.poiId)
            ctx.progress.award('photo', `${photo.siteId}/${photo.poiId}`);
        lastPhotos = ctx.photos.photos;
      },
    },
    dispose() {
      cleanup.dispose();
    },
  };
}

/** The Your sub screen owns the cosmetic picker; site selectors only display best ratings. */
export function initializeProgressMenus(ctx: ShellContext, cleanup: Disposables): void {
  const update = (): void => {
    for (const selector of [ctx.missionSelect, ctx.homeSites]) selector.setProgress(ctx.progress);
  };
  update();
  let ratings = JSON.stringify(ctx.progress.snapshot().ratings);
  let discoveries = ctx.progress.snapshot().awarded.length;
  cleanup.add(
    ctx.progress.onChange(() => {
      const next = JSON.stringify(ctx.progress.snapshot().ratings);
      if (next !== ratings) {
        ratings = next;
        update();
      }
      const count = ctx.progress.snapshot().awarded.length;
      if (count !== discoveries) {
        discoveries = count;
        ctx.journal.refresh();
      }
    }),
  );
}
