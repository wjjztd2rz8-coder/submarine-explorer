import { unknownContactsForSite } from '../../game/Contacts.js';
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
    const state = (poi: (typeof discovery.pois)[number]) => {
      const objectives = ctx.route?.def.objectives;
      const primaryIds = objectives
        ? objectives.filter((o) => o.primary).map((o) => o.poi)
        : discovery.pois.filter((p) => p.primary).map((p) => p.id);
      const contacts = unknownContactsForSite(
        discovery.pois,
        primaryIds,
        objectives?.filter((o) => !o.primary).map((o) => o.poi),
      );
      return {
        primary: !contacts.some((p) => p.id === poi.id),
        found:
          discovery.store.isDiscovered(poi.landmarkId, poi.id) ||
          discovery.scanner.isScanned(poi.landmarkId, poi.id),
      };
    };
    waypoints.setContactState?.(state);
    sonar.setContactState?.(state);
    discovery.overlay?.setContactState((id) => {
      const poi = discovery.pois.find((p) => p.id === id);
      return poi ? state(poi) : null;
    });
    visualHints = ctx.effective.gameplay.visualHints;
    waypoints.setVisualHints(visualHints);
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
    let active = true;
    cleanup.add(() => {
      active = false;
    });
    if (mission)
      cleanup.add(
        mission.onChange(() => {
          // The scanner publishes completion before the reward replaces its scan card.
          // Measure after those synchronous subscribers finish, before the next paint.
          queueMicrotask(() => {
            if (active) updateWaypoints(ctx, ctx.sub.position);
          });
        }),
      );
  },
  frame: {
    'guide.waypoints': (f, ctx) => {
      f.nextScanObjective = selectScanObjective(ctx.missionRouter?.mission.objectives, (id) =>
        ctx.sub.position.distanceTo(
          ctx.discovery.pois.find((p) => p.id === id)?.position ?? ctx.sub.position,
        ),
      );
    },
    'render.prepare': (f, ctx) => {
      // Tutorial, warning and mission panels now have their final geometry.
      updateWaypoints(ctx, f.pilotPosition);
    },
  },
};

function updateWaypoints(ctx: GameContext, position: Vector3) {
  const { missionRouter } = ctx;
  const nextScanObjective = selectScanObjective(missionRouter?.mission.objectives, (id) =>
    position.distanceTo(ctx.discovery.pois.find((p) => p.id === id)?.position ?? position),
  );
  // Near-site approaches retain their navigation marker in Realistic too.
  // Once in scan range, resume the pilot's normal visual-waypoint preference.
  const approach = nextScanObjective?.approachTo !== undefined;
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
}
