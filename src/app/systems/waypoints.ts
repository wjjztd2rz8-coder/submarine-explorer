/**
 * Scan guidance: the in-world waypoint to the next objective and the scanned
 * state on the sonar.
 */

import type { Vector3 } from 'three';
import type { GameContext } from '../context.js';
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
    let disposed = false;
    cleanup.add(() => {
      disposed = true;
      waypoints.dispose();
    });
    ctx.waypoints = waypoints;
    visualHints = ctx.effective.gameplay.visualHints;
    waypoints.setVisualHints(visualHints);
    waypoints.setReducedMotion(settings.reduceMotion);
    waypoints.setPalette(settings.sonarPalette);
    // D-SONAR: scanned ticks and POIs on the sonar.
    sonar.setScanState((poi) => discovery.scanner.isScanned(poi.landmarkId, poi.id));
    void discovery.ready.then(() => {
      if (disposed) return;
      waypoints.setPois(discovery.pois);
      sonar.setPois(discovery.pois);
    });
    cleanup.add(
      save.onChange((next, changed) => {
        if (changed.includes('sonarPalette')) waypoints.setPalette(next.sonarPalette);
      }),
    );
    ctx.expose({ waypoints });
  },
  start(ctx) {
    const mission = ctx.missionRouter?.mission;
    if (mission) cleanup.add(mission.onChange(() => updateWaypoints(ctx, ctx.sub.position)));
  },
  frame: {
    'guide.waypoints': (f, ctx) => {
      f.nextScanObjective = updateWaypoints(ctx, f.pilotPosition);
    },
  },
};

function updateWaypoints(ctx: GameContext, position: Vector3) {
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
  ctx.waypoints.update(
    ctx.rig.camera,
    position,
    nextScanObjective ? { poiId: nextScanObjective.poiId } : null,
  );
  return nextScanObjective;
}
