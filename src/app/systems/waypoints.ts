/**
 * Scan guidance: the in-world waypoint to the next objective and the scanned
 * state on the sonar.
 */

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
    const { discovery, settings, sonar, save } = ctx;
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
    cleanup.add(
      save.onChange((next, changed) => {
        if (changed.includes('sonarPalette')) waypoints.setPalette(next.sonarPalette);
      }),
    );
    ctx.expose({ waypoints });
  },
  frame: {
    'guide.waypoints': (f, ctx) => {
      const { missionRouter } = ctx;
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
      ctx.waypoints.update(
        ctx.rig.camera,
        f.pilotPosition,
        nextScanObjective ? { poiId: nextScanObjective.poiId } : null,
        (name) => ctx.guidance.showsName(name),
      );
    },
  },
};
