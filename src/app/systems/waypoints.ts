/**
 * Scan guidance (D-SCAN): the in-world waypoint to the next objective, its
 * authored hint, and the scanned state on the sonar.
 */

import { contentUrl, fetchContentJson } from '../../game/ContentPath.js';
import { nextScanObjective as selectScanObjective } from '../../game/Mission.js';
import { Waypoints } from '../../ui/Waypoints.js';
import type { GameSystem } from '../System.js';
import { Disposables } from '../Disposables.js';

const cleanup = new Disposables();
let visualHints = false;

export const waypointsSystem: GameSystem = {
  name: 'waypoints',
  dispose: () => cleanup.dispose(),
  init(ctx) {
    const { discovery, settings, sonar, route, save } = ctx;
    const waypoints = new Waypoints(discovery.scanner);
    ctx.waypoints = waypoints;
    visualHints = ctx.effective.gameplay.visualHints;
    waypoints.setVisualHints(visualHints);
    waypoints.setReducedMotion(settings.reduceMotion);
    waypoints.setPalette(settings.sonarPalette);
    void discovery.ready.then(() => waypoints.setPois(discovery.pois));
    // D-SONAR: scanned ticks and POIs on the sonar.
    sonar.setScanState((poi) => discovery.scanner.isScanned(poi.landmarkId, poi.id));
    void discovery.ready.then(() => sonar.setPois(discovery.pois));
    // Mission's current parser drops the content hint, so read the authored
    // sentence here until that field is passed through by the mission owner.
    const scanObjectiveHints = new Map<string, string>();
    ctx.scanObjectiveHints = scanObjectiveHints;
    if (route) {
      void fetchContentJson(contentUrl(route.missionId, 'mission.json')).then((raw) => {
        if (!raw || typeof raw !== 'object') return;
        const objectives = (raw as { objectives?: unknown }).objectives;
        if (!Array.isArray(objectives)) return;
        for (const value of objectives) {
          if (!value || typeof value !== 'object') continue;
          const { id, hint } = value as { id?: unknown; hint?: unknown };
          if (typeof id === 'string' && typeof hint === 'string' && hint.trim()) {
            scanObjectiveHints.set(id, hint.trim());
          }
        }
      });
    }
    cleanup.add(
      save.onChange((next, changed) => {
        if (changed.includes('sonarPalette')) waypoints.setPalette(next.sonarPalette);
      }),
    );
    ctx.expose({ waypoints });
  },
  frame: {
    'guide.waypoints': (f, ctx) => {
      const { missionRouter, route } = ctx;
      const nextScanObjective = selectScanObjective(missionRouter?.mission.objectives);
      // Near-site approaches retain their navigation marker in Realistic too.
      // Once in scan range, resume the pilot's normal visual-waypoint preference.
      const approach = nextScanObjective?.title.startsWith('Head to ') ?? false;
      const showHints = ctx.effective.gameplay.visualHints || approach;
      if (showHints !== visualHints) {
        visualHints = showHints;
        ctx.waypoints.setVisualHints(visualHints);
      }
      f.nextScanObjective = nextScanObjective;
      ctx.discovery.scanner.setObjective(nextScanObjective?.poiId ?? null);
      const scanContent = route?.def.objectives.find((o) => o.id === nextScanObjective?.id) as
        { hint?: string } | undefined;
      ctx.waypoints.update(
        ctx.rig.camera,
        f.pilotPosition,
        nextScanObjective
          ? {
              poiId: nextScanObjective.poiId,
              title: nextScanObjective.title,
              hint:
                nextScanObjective.hint ||
                scanContent?.hint ||
                ctx.scanObjectiveHints.get(nextScanObjective.id),
            }
          : null,
      );
    },
  },
};
